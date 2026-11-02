#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Build the ready-to-run Mac package: the built app plus PocketBase for both
# kinds of Mac (Apple Silicon and Intel), so the Mac needs only Node, with no
# git, no Bun, no build and no internet.
#
#   scripts/mac-package.sh [out-dir]          → out-dir/beyfest-mac.zip
#
# Runs anywhere bash, Bun and Python are (this Windows PC's Git Bash too).
# On the Mac: unzip it, double-click beyfest/start.command.
#
# The package unpacks to beyfest/ with the same layout as this folder:
#   start.sh, start.command, scripts/set-organiser-password.mjs,
#   pb/pb_migrations, pb/pocketbase-darwin-arm64, pb/pocketbase-darwin-amd64,
#   web/build, web/package.json, web/node_modules/pocketbase, VERSION
# start.sh copies the right PocketBase to pb/pocketbase on the first run.
# The database (pb/pb_data) is NOT included: the Mac starts a fresh one. Move
# real data across with a PocketBase backup (admin console → Settings → Backups).
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

app="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$app/dist}"
pb_version="$(sed -n 's/^pb_version="\([^"]*\)".*/\1/p' "$app/start.sh")"
[[ -n "$pb_version" ]] || { echo "Couldn't read pb_version from start.sh" >&2; exit 1; }

# Python makes the zip: it can store the Unix "executable" flag, which the
# Mac needs to run start.command and PocketBase. (Windows has no zip tool
# that does.) "python3" can be a do-nothing Store shortcut on Windows, so try
# each until one actually runs.
py=""
for cand in python3 python; do
  if command -v "$cand" >/dev/null 2>&1 && "$cand" --version >/dev/null 2>&1; then py="$cand"; break; fi
done
[[ -n "$py" ]] || { echo "Python is needed to make the zip." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
stage="$work/beyfest"

# ── Install, test, build ────────────────────────────────────────────
cd "$app"
bun install --frozen-lockfile
bun run test
bun run build

# ── Assemble ────────────────────────────────────────────────────────
mkdir -p "$stage/pb" "$stage/web/node_modules" "$stage/scripts" "$out"
cp start.sh start.command "$stage/"
cp scripts/set-organiser-password.mjs "$stage/scripts/" # used by start.sh on a new database
cp -r pb/pb_migrations "$stage/pb/"
cp -r web/build web/package.json "$stage/web/"
# The source fingerprints belong to this machine's build, not the package.
rm -f "$stage/web/build/.sources" "$stage/web/build/.packages"

# The server's only runtime package; everything else is bundled into build/.
# -L copies the real files in case the package manager used a symlink.
if [[ -d web/node_modules/pocketbase ]]; then sdk="web/node_modules/pocketbase"; else sdk="node_modules/pocketbase"; fi
cp -rL "$sdk" "$stage/web/node_modules/pocketbase"

# PocketBase for both kinds of Mac.
for arch in arm64 amd64; do
  curl -fsSL -o "$work/pb-$arch.zip" \
    "https://github.com/pocketbase/pocketbase/releases/download/v${pb_version}/pocketbase_${pb_version}_darwin_${arch}.zip"
  unzip -q -o "$work/pb-$arch.zip" pocketbase -d "$work/pb-$arch"
  mv "$work/pb-$arch/pocketbase" "$stage/pb/pocketbase-darwin-$arch"
done

# What's in this package, for "which version is this?".
{
  echo "commit=$(git rev-parse --short HEAD)"
  echo "branch=$(git rev-parse --abbrev-ref HEAD)"
  echo "built=$(date -u +%Y-%m-%dT%H:%MZ)"
  echo "pocketbase=${pb_version}"
} >"$stage/VERSION"

# ── Zip, with Unix permissions ──────────────────────────────────────
# Scripts and PocketBase executable (755), everything else 644. Shell scripts
# also get Unix line endings, whatever this checkout used.
zip_path="$out/beyfest-mac.zip"
rm -f "$zip_path"
"$py" - "$work" "$zip_path" <<'PY'
import os, sys, time, zipfile

work, zip_path = sys.argv[1], sys.argv[2]
built = time.localtime()[:6]  # every file stamped with the build time (else 1980)
executable = {"beyfest/start.sh", "beyfest/start.command",
              "beyfest/pb/pocketbase-darwin-arm64", "beyfest/pb/pocketbase-darwin-amd64"}

def add(zf, arcname, mode, data=None, path=None):
    info = zipfile.ZipInfo(arcname, date_time=built)
    info.create_system = 3  # Unix, so the Mac reads the permissions below
    info.external_attr = mode << 16
    info.compress_type = zipfile.ZIP_DEFLATED
    if data is None:
        with open(path, "rb") as f:
            data = f.read()
    zf.writestr(info, data)

with zipfile.ZipFile(zip_path, "w") as zf:
    for dirpath, dirnames, filenames in os.walk(os.path.join(work, "beyfest")):
        dirnames.sort()
        rel_dir = os.path.relpath(dirpath, work).replace(os.sep, "/")
        add(zf, rel_dir + "/", 0o40755, data=b"")
        for name in sorted(filenames):
            path = os.path.join(dirpath, name)
            arc = f"{rel_dir}/{name}"
            if arc.endswith((".sh", ".command")):
                with open(path, "rb") as f:
                    data = f.read().replace(b"\r\n", b"\n")
                add(zf, arc, 0o100755 if arc in executable else 0o100644, data=data)
            else:
                add(zf, arc, 0o100755 if arc in executable else 0o100644, path=path)
PY

echo "Package: $zip_path ($(du -h "$zip_path" | cut -f1))"
