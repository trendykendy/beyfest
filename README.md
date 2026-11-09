# Beyfest

Everything for Beyfest, a Beyblade tournament:

- **[`tournament-app/`](tournament-app/)** — the app that runs the tournament on the day:
  the player list, group draw, brackets, scores, battle royale, a live TV screen and a
  phone page. It runs on one computer over the venue wifi, with **no internet needed on
  the day**. Full guide: [`tournament-app/README.md`](tournament-app/README.md).
- **[`public-site/`](public-site/)** — the event website (static, hosted on Netlify).

## Events

- **Beyfest 2026: Triple Threat** — done. The exact code that ran on the day is the git
  tag `beyfest-2026-final` (`git checkout beyfest-2026-final`).
- **Beyfest: Tetrafatalis** — next, being built on `main`: a fantasy redesign with four
  arenas and expanded betting. Until that work lands, `main` still looks and works like
  Triple Threat.

## Install on a Windows PC

**Before the day (at home, with internet):**

1. Install **[Bun](https://bun.sh)** and **[Node.js](https://nodejs.org)** (the LTS version).
2. Get the code: `git clone https://github.com/trendykendy/beyfest.git`
3. In `tournament-app`, right-click **`start.ps1`** → *Run with PowerShell*. The first
   run downloads PocketBase, builds the app, creates the database and asks you to
   **choose the organiser and admin passwords**. Write them down.
4. Plug in the TV and check the TV screen opens on it.

**On the day:** run **`start.ps1`** again. It:

- starts everything and prints the addresses;
- opens the TV screen full screen in Edge;
- offers to fix Windows Firewall if phones won't be able to connect;
- keeps the PC awake.

Log in to the admin page as `organiser@beyfest.local`. Close the window to stop.

**To update:** `git pull`, then run `start.ps1`. It rebuilds by itself, and your
tournament data is never touched.

## Install on a Mac

Works on Apple Silicon and Intel Macs. There are two ways.

### A. Ready-made package (no git, no Bun, no internet on the Mac)

1. On the Windows PC, in Git Bash, run `tournament-app/scripts/mac-package.sh`. It
   tests and builds the app and makes **`tournament-app/dist/beyfest-mac.zip`**.
2. Copy the zip to the Mac (USB stick, AirDrop…) and unzip it.
3. Install **[Node.js](https://nodejs.org)** (the LTS version) on the Mac.
4. Double-click **`beyfest/start.command`**. On the first run it asks you to choose
   the passwords.

The package starts with an empty database. To bring data across, make a backup on the
PC (PocketBase admin → *Settings → Backups*), copy it over and restore it on the Mac.
Re-make the package after any code change.

### B. Git checkout

1. Install **Bun**: `curl -fsSL https://bun.sh/install | bash`
2. `git clone https://github.com/trendykendy/beyfest.git`
3. Double-click **`tournament-app/start.command`**. Do this first run **at home, with
   internet**: it installs packages, builds the app and downloads PocketBase. After
   that it runs offline.

### Either way

- The first time, if macOS says it can't check `start.command`, right-click it →
  *Open*.
- When macOS asks whether `pocketbase` and `node` may **accept incoming connections**,
  choose *Allow*. Otherwise the TV and phones can't reach the Mac.
- It opens the TV screen full screen in Chrome (or Edge), on a second screen if one is
  plugged in. Use `./start.sh --no-tv` to skip that.
- It keeps the Mac awake and prints the addresses. Close the window to stop.
- Keep the Mac plugged in.

## More

Troubleshooting, backups, the organiser workflow and
development notes are all in [`tournament-app/README.md`](tournament-app/README.md).
