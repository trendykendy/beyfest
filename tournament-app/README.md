# Beyfest — Tournament App

A self-contained app to **run** a Beyfest tournament on the day: enter the
players who show up, auto-draw the groups and build the right bracket, record
scores, and show a live TV screen and phone page. Runs entirely on one Windows PC
over the venue wifi — **no internet required** on the day.

It implements the locked-in structures in
[`../bracket-and-tourney/tournament-spec.txt`](../bracket-and-tourney/tournament-spec.txt)
for every count from 8 to 15 players.

## Stack

- **PocketBase** (`pb/pocketbase.exe`) — database + auth + REST + realtime, one binary.
- **SvelteKit** (`web/`, Svelte 5, `adapter-node`) — TV screen, phone page + organiser admin.
- **Engine** (`engine/`) — zero-dependency TypeScript: the draw, round-robin,
  standings/tiebreakers, bracket generation and resolution. Fully unit-tested.

## On the Windows PC (the main setup)

The PC runs everything: the app, the database and the TV screen (plugged in as a
second screen, or as its only one). The organiser uses the admin page on the PC or
from a phone or laptop on the same wifi. Phones scan the QR code on the TV for the
live phone page.

### Before the day (at home, with internet)

1. Install **[Bun](https://bun.sh)** (builds the app) and **[Node.js](https://nodejs.org)**,
   the current LTS (runs it; tested on Node 22).
2. Get this repo onto the PC: `git clone https://github.com/trendykendy/beyfest.git`,
   or copy the folder across.
3. Run **`start.ps1`** in `tournament-app` once, with internet: right-click it →
   *Run with PowerShell*, or `pwsh -File .\start.ps1`. The first run downloads
   PocketBase (it isn't kept in git), installs the packages, builds the app and
   creates the database, and asks you to **choose the organiser and PocketBase admin
   passwords**. Write them down.
4. Plug in the TV and check the TV screen opens on it (see below).

**To update** later: `git pull` (or copy the new files over), then run `start.ps1`.
It notices the code has changed and rebuilds before starting. If a rebuild fails it
says so in red and runs the previous build, so the event isn't stuck. The tournament
data (`pb/pb_data/`) is never touched by an update.

### On the day

1. Run **`start.ps1`**. It:
   - rebuilds the app if the code has changed since the last build;
   - checks **Windows Firewall** will let phones in: the network mustn't be marked
     *Public*, and nothing may block `node.exe` or `pocketbase.exe`. If something's
     wrong, it says what and offers to fix it, with one Windows permission prompt;
   - starts PocketBase and the web server, and prints the addresses;
   - opens the **TV screen** full screen in Edge, on a second landscape screen if
     there is one, else the main screen. Alt+F4 closes it. `start.ps1 -NoTv` skips it
     and prints the TV address instead;
   - keeps the PC from sleeping or turning its screens off while it runs.
2. Open the **Organiser admin** address it prints and log in as
   `organiser@beyfest.local` with the password you chose.
3. Players scan the QR code on the TV (big on the waiting screen, small in the corner
   of most others) for the phone page. It updates live as you enter scores.
4. Close the window (or Ctrl+C) to stop everything, TV screen included.

Keep the PC plugged in. Don't have anything full screen (a game, a video) open when
you start it: the TV window opens behind it.

## Organiser workflow

0. **Fighters (before the day)**: *Fighters* (top of the admin page) is the library the TV's VS
   intro uses. It plays on **Start match**, before the stadium draw.
   - **Add starting fighters** loads the fighters that come with the app (combat names, player
     names, katakana, images and voice clips, from `web/static/starter-fighters/`). It only adds
     who's missing and fills in gaps, so it never overwrites changes made here, and it's safe to
     press again after an update. Creating a tournament does the same for any starters playing in
     it, so a new install has its fighters without pressing this.
   - Each fighter has a **combat name** (shown and announced, e.g. *The Breycist*) and a
     **player name** (as typed in for the tournament, e.g. *Conor*), plus katakana, a cut-out
     image and a voice clip of the combat name. The best images are transparent PNGs, at least
     1000px tall, facing left. Tick *Mirror* for one that faces right.
   - Bladers are matched by player name (or, failing that, combat name), ignoring capitals and
     spaces. The library isn't tied to a tournament, so it's set up once and kept through resets.
   - **Sound:** on Start match the announcer calls *name, versus, name, match title* over the
     match music. The intro holds until the calls finish; the music dips under the voice. When
     the result is recorded it calls the winner, then a stinger ends the match. The admin page's
     TV panel has **Sound** on/off and a **Music** level. The TV window `start.ps1` opens plays
     sound by itself; any other browser may block sound until someone clicks the TV page, and
     says so in the corner.
   - Anyone without a fighter, or without an image, gets a "?" silhouette. The page lists the
     current bladers who don't have a fighter yet.
1. **Enter bladers**: type the names (one per line, 8–15), then *Draw groups and build bracket*.
   The app randomly draws the groups and generates every group match.
2. **Now playing** shows one match at a time.
   - Tap the finish for each round (Spin +1, Knockout +2, Dominant +3). The TV follows live.
   - When someone reaches the target, press **Record result**. Now playing moves on to the next match.
   - **Up next** lists what's ready. *Score this* switches to a different match.
3. When every group is in, Now playing offers **Generate knockout bracket**.
4. **Knockout**: same as the groups, through to the Grand Final.
5. **Made a mistake?** Under Now playing, **Last result → Fix** corrects any recorded score.
   - If the winner changes, the next round is updated.
   - The fix is refused, with the reason, if a later match has already been played with the old winner or loser.
6. **Keep the results** (near the bottom of the page):
   - *Download results* saves every result as one web page that opens offline. To take it
     home on your phone, log in to the admin page on the phone (same wifi) and tap it there.
   - *Archive tournament* puts the tournament away, results and battle royale included, so
     a new one can start. Archived tournaments are listed at the bottom of the admin page,
     each with its own *Download*.
7. **Danger zone** (bottom of the page): *Reset tournament* deletes everything and starts again.

## If something goes wrong

- **Phones can't open the QR code's address.** They must be on the same wifi as the PC.
  If they are, close `start.ps1`, run it again and answer **Y** when it offers to fix the
  firewall. (It only offers when it finds a problem.)
- **The TV shows "Reconnecting" in the corner.** It has lost the PC. Nothing to do: it catches up by itself as soon as the connection is back (it checks every 5 seconds).
- **The TV window didn't open, or opened on the wrong screen.** Open `http://<PC address>:3000/tv` in a browser on the TV screen and press F11 for full screen.
- **Backups.** PocketBase saves a backup of everything every 10 minutes into `pb/pb_data/backups/`, keeping the newest 20 (about 3 hours).
- **To restore one:**
  1. Log in to the PocketBase console (`http://<PC address>:8090/_/`) with the superuser.
  2. Go to *Settings → Backups*.
  3. Pick a backup and choose *Restore*. PocketBase restarts with that data.
- **Admin says it can't reach the database.** PocketBase has stopped. Run `start.ps1` (or `start.sh` on a Mac) again. Your data is safe. On a Mac, PocketBase's own messages are in `pb/pocketbase.log`.

## Other setups

### On a Mac

`start.sh` is the Mac/Linux twin of `start.ps1`, and on a Mac it does the same jobs:

- It rebuilds when the code has changed.
- It keeps the Mac and its screens awake while it runs.
- It opens the TV screen full screen in **Chrome** (or Edge), with sound allowed. If a
  landscape second screen is plugged in, that's treated as the TV. Use
  `./start.sh --no-tv` if the TV is driven by something else.
- It closes the TV window again when you stop it.

It works on Apple Silicon and Intel Macs. There are two ways to get it onto the Mac.

**A. The ready-made package (simplest: no git, no Bun, no internet on the Mac).**
On the Windows PC, in Git Bash, run `scripts/mac-package.sh`. It runs the tests, builds
the app, and makes **`dist/beyfest-mac.zip`**. The zip holds PocketBase for both kinds
of Mac. Copy the zip to the Mac (USB stick, AirDrop…) and unzip it. Then:

1. Install **Node** (the LTS version) from https://nodejs.org.
2. Double-click **`beyfest/start.command`**. On a new database it asks you to choose
   the passwords.

The package starts with an empty database. To bring your data across, make a backup
on the PC (PocketBase admin → *Settings → Backups*), copy it over, and restore it on
the Mac. Re-make the package after any code change; the package can't rebuild itself.

**B. A git checkout.** Install **Bun** (`curl -fsSL https://bun.sh/install | bash`;
Node is optional), clone the repo, then double-click **`start.command`**. **Do the
first run at home, with internet**: it installs packages, builds the app and downloads
PocketBase. After that it runs offline, and a `git pull` is picked up (rebuilt) on the
next start.

Either way:

- If macOS says it can't check `start.command`, right-click it → *Open* (only the
  first time).
- When macOS asks whether `pocketbase` and `node`/`bun` may **accept incoming
  connections**, choose *Allow*. Otherwise the TV and phones can't reach the Mac. (It
  reminds you if the Mac's firewall is on.)
- It prints the URLs, including the **TV screen** one. Close the window (or Ctrl+C) to
  stop everything.
- Keep the Mac plugged in.

If it prints the wrong address (e.g. the Mac is on both wifi and a cable), force it:
`BEYFEST_IP=192.168.1.20 ./start.sh`.

## Development

```sh
bun install                 # from this folder (installs all workspaces)

# Terminal 1 — PocketBase (data + realtime)
bun run pb                  # Windows. On a Mac, after one run of start.sh:
                            # pb/pocketbase serve --dir=pb/pb_data --migrationsDir=pb/pb_migrations

# Terminal 2 — web app (dev, hot reload)
bun run web                 # http://localhost:5173
```

Other commands:

```sh
bun run test                # engine unit tests (match counts + full simulations)
bun run e2e [count]         # full flow against a running PocketBase (default 12)
bun run build               # production build of the web app
```

## First-time / fresh database setup

`pb/pb_data/` (gitignored) holds everything. To start again from nothing, stop the
app, delete `pb/pb_data/`, and run `start.ps1` / `start.sh`: it recreates the database
and asks for new passwords.

The logins are `organiser@beyfest.local` (the admin page) and `admin@beyfest.local`
(the PocketBase console, `http://127.0.0.1:8090/_/`). The migrations seed them with the
development defaults in `.env.example`. The launchers replace
those with the passwords you choose; only a launcher run with nobody at the keyboard
keeps them, and it says so. To change a password later, use the PocketBase console.

## Layout

```
tournament-app/
  start.ps1              the event launcher (Windows): rebuild, firewall check, servers, TV screen
  start.sh               the same for macOS / Linux (on a Mac it also opens the TV)
  start.command          double-click wrapper for start.sh on a Mac
  scripts/mac-package.sh builds the ready-to-run Mac package (dist/beyfest-mac.zip)
  engine/                pure-TS tournament logic + tests
  pb/                    PocketBase migrations; the binary and pb_data appear at runtime
  web/                   SvelteKit app (TV screen, phone page + admin)
  scripts/e2e.ts         end-to-end check against a running PocketBase
```

## Notes

- **One tournament at a time.** Starting a new event = *Reset*, then enter new players.
- The group draw and Mid-Bracket pairings are **random** and persisted once done, so
  they stay stable for the rest of the event.
- After the first run it needs no internet: fonts are self-hosted, and the launchers
  download PocketBase once (the version is set by `pb_version` in `start.sh`).
