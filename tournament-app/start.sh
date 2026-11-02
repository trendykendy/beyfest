#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Beyfest 2026 tournament app — one-command launcher for macOS and Linux
# (including a Raspberry Pi). The Windows twin is start.ps1.
#
# Starts PocketBase (data + realtime API) and the built SvelteKit server,
# both bound to 0.0.0.0 so the TV and phones on the venue wifi can reach
# them. Detects this machine's LAN IP so it can print the addresses to open.
#
#   ./start.sh                     (on a Mac you can double-click start.command)
#   ./start.sh --no-tv             on a Mac: don't open the TV screen
#   BEYFEST_IP=192.168.1.20 ./start.sh   to force the address it prints
#
# From a git checkout, the first run needs the internet: it installs
# packages, builds the web app and downloads the PocketBase build for this
# machine. Do it at home, not at the venue. After that it runs offline, and
# rebuilds by itself whenever the code has changed (after a git pull).
# The Mac package (scripts/mac-package.sh) comes ready-built with PocketBase
# for both kinds of Mac, so there it only needs Node and never goes online.
#
# On a Mac it also keeps the Mac and its screens awake while it runs, and
# opens the TV screen full screen in Chrome (or Edge), on the TV if one is
# plugged in as a second screen.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

open_tv=1
for arg in "$@"; do
  case "$arg" in
    --no-tv) open_tv=0 ;;
    *) echo "  Unknown option: $arg (the only one is --no-tv)" >&2; exit 1 ;;
  esac
done

root="$(cd "$(dirname "$0")" && pwd)"
pb_version="0.40.4" # start.ps1 and the Pi package read this too
pb_bin="$root/pb/pocketbase"
pb_data="$root/pb/pb_data"
pb_mig="$root/pb/pb_migrations"
web_dir="$root/web"
web_build="$web_dir/build/index.js"
web_port=3000

fail() {
  echo "" >&2
  echo "  $1" >&2
  echo "" >&2
  exit 1
}

# ── Tools ────────────────────────────────────────────────────────────
# Bun is only needed to install and build (from a git checkout). The Pi
# package comes ready-built, so there Node alone is enough.
need_bun() {
  command -v bun >/dev/null 2>&1 ||
    fail "bun is not installed. Install it with:  curl -fsSL https://bun.sh/install | bash"
}

# Prefer Node to run the server (what start.ps1 uses); Bun can run it too.
if command -v node >/dev/null 2>&1; then
  runner="node"
elif command -v bun >/dev/null 2>&1; then
  runner="bun"
elif [[ -d "$root/web/src" ]]; then
  fail "Neither Node nor Bun is installed. Install Bun:  curl -fsSL https://bun.sh/install | bash"
else
  fail "Node is not installed. Install the LTS version from https://nodejs.org and run this again."
fi

is_mac=0
[[ "$(uname -s)" == "Darwin" ]] && is_mac=1

# Files copied or downloaded onto a Mac can be marked "from the internet",
# and macOS then refuses to run PocketBase (it isn't signed). Clear the mark
# from this folder. It does nothing if there's no mark.
if ((is_mac)); then
  xattr -dr com.apple.quarantine "$root" 2>/dev/null || true
fi

# ── Detect the LAN IP (the interface that owns the default route) ────
detect_ip() {
  local ip=""
  if [[ "$(uname -s)" == "Darwin" ]]; then
    local iface
    iface="$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')"
    [[ -n "$iface" ]] && ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  else
    # "ip route get" only asks the routing table; nothing is sent to 1.1.1.1.
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null |
      awk '{for (i = 1; i < NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
    [[ -z "$ip" ]] && ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  fi
  echo "${ip:-127.0.0.1}"
}
ip="${BEYFEST_IP:-$(detect_ip)}"

# ── PocketBase: download the build for this OS + CPU if it's missing ─
if [[ ! -x "$pb_bin" ]]; then
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) fail "Unsupported system $(uname -s). On Windows use start.ps1." ;;
  esac
  case "$(uname -m)" in
    arm64 | aarch64) arch="arm64" ;;
    x86_64 | amd64) arch="amd64" ;;
    armv7l) arch="armv7" ;; # 32-bit Raspberry Pi OS
    *) fail "Unsupported CPU $(uname -m)." ;;
  esac
  # The Mac package brings PocketBase for both kinds of Mac: use the right one.
  bundled="$root/pb/pocketbase-${os}-${arch}"
  if [[ -f "$bundled" ]]; then
    cp "$bundled" "$pb_bin"
    chmod +x "$pb_bin"
  fi
fi
if [[ ! -x "$pb_bin" ]]; then
  command -v unzip >/dev/null 2>&1 || fail "unzip is not installed (sudo apt install unzip)."

  zip_url="https://github.com/pocketbase/pocketbase/releases/download/v${pb_version}/pocketbase_${pb_version}_${os}_${arch}.zip"
  echo "  First run: downloading PocketBase ${pb_version} (${os}/${arch})…"
  tmp="$(mktemp -d)"
  curl -fL --progress-bar -o "$tmp/pb.zip" "$zip_url" ||
    fail "Download failed. Are you online? ($zip_url)"
  unzip -o -q "$tmp/pb.zip" pocketbase -d "$root/pb"
  rm -rf "$tmp"
  chmod +x "$pb_bin"
fi

# ── Build the web app if needed ─────────────────────────────────────
# Same as start.ps1: rebuilt whenever any of its code has changed since the
# last build, so new code (from git pull or a copied folder) never runs as an
# old build. Each build leaves a fingerprint of the files it was built from
# (name, size and time of every file); timestamps alone would miss a copied
# folder that kept older times. The Mac and Pi packages have no source code
# (web/src), only the finished build, so they skip all this.

# One line per file ("path|size|mtime"), sorted, then hashed. BSD (Mac) and
# GNU (Linux) stat and sha256 tools take different options.
fingerprint() {
  local p
  for p in "$@"; do
    [[ -e "$p" ]] || continue
    if ((is_mac)); then
      find "$p" -type f -exec stat -f '%N|%z|%m' {} +
    else
      find "$p" -type f -exec stat -c '%n|%s|%Y' {} +
    fi
  done | sed "s|^$root||" | LC_ALL=C sort |
    if command -v shasum >/dev/null 2>&1; then shasum -a 256; else sha256sum; fi |
    cut -d' ' -f1
}

if [[ -d "$web_dir/src" ]]; then
  sources=("$web_dir/src" "$web_dir/static" "$root/engine/src" "$web_dir/svelte.config.js" "$web_dir/vite.config.ts")
  packages=("$root/bun.lock" "$root/package.json" "$web_dir/package.json" "$root/engine/package.json")
  # Kept inside build/ (gitignored): a fresh checkout has no build and no
  # fingerprint, so it always builds.
  source_stamp="$web_dir/build/.sources"
  package_stamp="$web_dir/build/.packages"
  source_print="$(fingerprint "${sources[@]}" "${packages[@]}")"
  package_print="$(fingerprint "${packages[@]}")"
  last_sources="$(cat "$source_stamp" 2>/dev/null || true)"
  last_packages="$(cat "$package_stamp" 2>/dev/null || true)"

  if [[ ! -f "$web_build" || "$last_sources" != "$source_print" ]]; then
    need_bun
    if [[ -f "$web_build" ]]; then
      echo "  The code has changed since the last build: rebuilding…"
    else
      echo "  First run: building the web app…"
    fi

    # A new or changed package comes in with the lock file: install it first.
    if [[ ! -d "$root/node_modules" || "$last_packages" != "$package_print" ]]; then
      (cd "$root" && bun install --frozen-lockfile) ||
        echo "  bun install failed (offline?). Trying the build anyway."
    fi

    if (cd "$web_dir" && bun run build); then
      printf '%s' "$source_print" >"$source_stamp"
      printf '%s' "$package_print" >"$package_stamp"
    elif [[ -f "$web_build" ]]; then
      # Don't strand the event: keep going on the last good build. No new
      # fingerprint, so the next start tries the build again.
      echo ""
      echo "  THE BUILD FAILED (see above). Running the PREVIOUS build instead:"
      echo "  it won't have the newest changes."
      echo ""
    else
      fail "The build failed (see above), and there's no earlier build to fall back on."
    fi
  fi
elif [[ ! -f "$web_build" ]]; then
  fail "There's no built web app (web/build) and no source code to build it from."
fi

# ── Fresh database: create it, and choose the passwords ───────────────
organiser_email="organiser@beyfest.local"
superuser_email="admin@beyfest.local"
organiser_pw=""
login_note="Login: $organiser_email"

ask_password() { # $1 = what it's for; the answer is left in $REPLY
  local first second
  while true; do
    read -rsp "  $1 (at least 10 characters): " first
    echo
    if ((${#first} < 10)); then
      echo "  Too short, try again."
      continue
    fi
    read -rsp "  Type it again: " second
    echo
    [[ "$first" == "$second" ]] && break
    echo "  They didn't match, try again."
  done
  REPLY="$first"
}

if [[ ! -d "$pb_data" ]]; then
  echo "  First run: creating the database…"
  "$pb_bin" migrate up --dir="$pb_data" --migrationsDir="$pb_mig" >/dev/null
  if [[ -t 0 ]]; then
    echo ""
    echo "  Choose the passwords. Write them down somewhere safe."
    ask_password "Organiser password (for the admin page)"
    organiser_pw="$REPLY"
    ask_password "PocketBase admin password (for backups/restores)"
    superuser_pw="$REPLY"
  else
    # Nobody at the keyboard to ask: the published defaults, loudly.
    superuser_pw="beyfestadmin2026"
    login_note="Login: $organiser_email / beyfest2026  (DEFAULT PASSWORDS: change them before the event)"
  fi
  "$pb_bin" superuser upsert "$superuser_email" "$superuser_pw" --dir="$pb_data" >/dev/null
fi

# ── The web server's own login, for phone betting ───────────────────
# Phones can't write to PocketBase, so the web server checks each bet and
# writes it as this superuser. A fresh random password every start, handed
# to the web server only (below), so it's never written down anywhere.
bookie_email="bookie@beyfest.local"
bookie_pw="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"
"$pb_bin" superuser upsert "$bookie_email" "$bookie_pw" --dir="$pb_data" >/dev/null

echo ""
echo "  BEYFEST 2026 — Tournament"
echo "  ------------------------------------------------------------"
echo "  Public display :  http://${ip}:${web_port}"
echo "  TV screen      :  http://${ip}:${web_port}/tv"
echo "  Organiser admin:  http://${ip}:${web_port}/admin"
echo "  PocketBase admin: http://127.0.0.1:8090/_/  (on this machine)"
echo "  ------------------------------------------------------------"
echo "  $login_note"
echo "  Close this window (or Ctrl+C) to stop both servers."
echo ""

# ── Start PocketBase in the background (migrations run automatically) ─
"$pb_bin" serve --http=0.0.0.0:8090 --dir="$pb_data" --migrationsDir="$pb_mig" \
  >"$root/pb/pocketbase.log" 2>&1 &
pb_pid=$!

# The organiser login lives in the database, so its new password is set
# through PocketBase's API once it's up (scripts/set-organiser-password.mjs).
if [[ -n "$organiser_pw" ]]; then
  SU_EMAIL="$superuser_email" SU_PW="$superuser_pw" ORG_EMAIL="$organiser_email" ORG_PW="$organiser_pw"     "$runner" "$root/scripts/set-organiser-password.mjs" || {
    kill "$pb_pid" 2>/dev/null
    fail "Couldn't set the organiser password (see above). Delete pb/pb_data and run this again."
  }
  unset organiser_pw superuser_pw
fi

web_pid=""
tv_pid=""
tv_profile="$HOME/Library/Application Support/Beyfest2026/tv-browser"

# Stop both servers when the web server exits, on Ctrl+C, or when the window closes.
cleanup() {
  echo ""
  echo "  Shutting down…"
  kill "$pb_pid" $web_pid $tv_pid 2>/dev/null || true
  # Close the TV screen too, rather than leave it showing an error. Found by
  # its own profile folder, so any other Chrome windows are left alone.
  if ((is_mac)); then pkill -f -- "--user-data-dir=$tv_profile" 2>/dev/null || true; fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM HUP

if ((is_mac)); then
  # ── Keep the Mac and its screens awake while this runs ─────────────
  # No sleep and no screen going dark mid-match. caffeinate stops by itself
  # when this script ends (-w).
  caffeinate -dims -w $$ &

  # ── Can phones get through the Mac's firewall? ─────────────────────
  # If it's on, macOS asks the first time whether node and pocketbase may
  # accept incoming connections. The answer must be Allow.
  if /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null | grep -q "enabled"; then
    echo "  The Mac's firewall is on. If macOS asks whether pocketbase or node may"
    echo "  accept incoming connections, choose Allow, or phones and the TV can't connect."
    echo ""
  fi

  # ── Open the TV screen once the web server answers ─────────────────
  # Chrome (or Edge) in kiosk mode, with its own profile so it doesn't join a
  # browser that's already open, and sound allowed to start by itself
  # (otherwise the announcer and music wait for a click on the TV).
  if ((open_tv)); then
    browser=""
    for app in "Google Chrome" "Microsoft Edge"; do
      for dir in "/Applications" "$HOME/Applications"; do
        exe="$dir/$app.app/Contents/MacOS/$app"
        if [[ -z "$browser" && -x "$exe" ]]; then browser="$exe"; fi
      done
    done
    if [[ -n "$browser" ]]; then
      # The TV is a second screen, if there's one that's landscape;
      # otherwise the main screen. macOS counts screen positions up from the
      # main screen's bottom edge, Chrome down from its top: hence the flip.
      tv_pos="$(osascript -l JavaScript -e '
        ObjC.import("AppKit");
        const screens = $.NSScreen.screens;
        const main = screens.objectAtIndex(0).frame;
        let best = null, area = 0;
        for (let i = 1; i < screens.count; i++) {
          const f = screens.objectAtIndex(i).frame;
          const w = f.size.width, h = f.size.height;
          if (w >= h && w * h > area) { area = w * h; best = f; }
        }
        const f = best || main;
        `${Math.round(f.origin.x)},${Math.round(main.size.height - f.origin.y - f.size.height)}`;
      ' 2>/dev/null || echo "0,0")"
      mkdir -p "$tv_profile"
      (
        # Wait (up to 2 minutes) for the web server, then open the TV.
        for _ in $(seq 60); do
          curl -fs -m 3 "http://127.0.0.1:$web_port/ping" >/dev/null 2>&1 && break
          sleep 2
        done
        exec "$browser" --kiosk "http://${ip}:${web_port}/tv" \
          --user-data-dir="$tv_profile" --no-first-run --no-default-browser-check \
          --noerrdialogs --disable-session-crashed-bubble \
          --autoplay-policy=no-user-gesture-required \
          --window-position="$tv_pos" >/dev/null 2>&1
      ) &
      tv_pid=$!
    else
      echo "  Chrome isn't installed: open http://${ip}:${web_port}/tv full screen on the TV yourself."
      echo ""
    fi
  fi
fi

# ── Start the web server ─────────────────────────────────────────────
# It runs in the background and we wait on it, so a signal to this script is
# handled straight away rather than after the server has exited.
export HOST="0.0.0.0"
export PORT="$web_port"
BOOKIE_EMAIL="$bookie_email" BOOKIE_PW="$bookie_pw" "$runner" "$web_build" &
web_pid=$!
wait "$web_pid"
