# Beyfest: Tetrafatalis: clip list

Every sound the TV plays. Generated from `tournament-app/web/src/lib/clips.ts` by `bun run scripts/clips.ts` (run in `tournament-app`); change the list there, not here.

**To commission:** 27 announcer clips, 12 fighter name calls, and the 11 music, effect and narration files.

**How to deliver the announcer clips**

- MP3, one call per file, under exactly the file name below.
- Trim the silence off both ends: calls are chained with a 0.15 s breath, so any padding shows as a pause.
- A line starting "…" is said straight after a name ("The Buzzsaw … is VICTORIOUS!"), so it should sound like the end of a sentence.
- Until a file is in place the TV skips that call without a gap, so clips can arrive a few at a time.

## VS intro

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/versus-1.mp3` | Versus! | VS intro, between the two names (one take at random, never twice running) |
| `tournament-app/web/static/sounds/announcer/versus-2.mp3` | Versus! | The second take of the same |

## Stage titles

Said last in the VS intro: name, versus, name, title.

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/titles/circle-1.mp3` | Circle One! | VS intro of a Circle I match |
| `tournament-app/web/static/sounds/announcer/titles/circle-2.mp3` | Circle Two! | VS intro of a Circle II match |
| `tournament-app/web/static/sounds/announcer/titles/circle-3.mp3` | Circle Three! | VS intro of a Circle III match |
| `tournament-app/web/static/sounds/announcer/titles/circle-4.mp3` | Circle Four! | VS intro of a Circle IV match |
| `tournament-app/web/static/sounds/announcer/titles/circle-5.mp3` | Circle Five! | VS intro of a Circle V match |
| `tournament-app/web/static/sounds/announcer/titles/gilded-path.mp3` | The Gilded Path! | VS intro of a Gilded Path match (also its round-robin and the 8-player Upper bracket) |
| `tournament-app/web/static/sounds/announcer/titles/iron-path.mp3` | The Iron Path! | VS intro of an Iron Path match |
| `tournament-app/web/static/sounds/announcer/titles/ashen-path.mp3` | The Ashen Path! | VS intro of an Ashen Path match (also its round-robin and the 8-player Lower bracket) |
| `tournament-app/web/static/sounds/announcer/titles/the-reckoning.mp3` | The Reckoning! | VS intro of the grand final |

## Finishing blows

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/finishes/spin.mp3` | Endurance! | A round won by spin finish |
| `tournament-app/web/static/sounds/announcer/finishes/knockout.mp3` | Banishment! | A round won by knockout |
| `tournament-app/web/static/sounds/announcer/finishes/dominant.mp3` | Annihilation! | A round won by a dominant finish |

## Results and match point

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/victorious.mp3` | …is VICTORIOUS! | Straight after the winner's name when a result goes in |
| `tournament-app/web/static/sounds/announcer/deaths-door.mp3` | Death's Door! | Match point lands, over the impact |

## The Grand Mêlée

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/melee/grand-melee.mp3` | The Grand Mêlée! | Each battle's intro, first |
| `tournament-app/web/static/sounds/announcer/melee/skirmish-1.mp3` | Skirmish One! | After "The Grand Mêlée!" for skirmish 1 |
| `tournament-app/web/static/sounds/announcer/melee/skirmish-2.mp3` | Skirmish Two! | After "The Grand Mêlée!" for skirmish 2 |
| `tournament-app/web/static/sounds/announcer/melee/skirmish-3.mp3` | Skirmish Three! | After "The Grand Mêlée!" for skirmish 3 |
| `tournament-app/web/static/sounds/announcer/melee/skirmish-4.mp3` | Skirmish Four! | After "The Grand Mêlée!" for skirmish 4 |
| `tournament-app/web/static/sounds/announcer/melee/last-stand.mp3` | Last Stand! | The Mêlée's sudden-death battle, and a match's sudden death |
| `tournament-app/web/static/sounds/announcer/melee/final-melee.mp3` | The Final Mêlée! | After "The Grand Mêlée!" for the final battle |
| `tournament-app/web/static/sounds/announcer/melee/last-one-standing.mp3` | …Last One Standing! | After the Mêlée winner's name |
| `tournament-app/web/static/sounds/announcer/melee/and.mp3` | …and… | Between the last two names on the Still Standing screen |
| `tournament-app/web/static/sounds/announcer/melee/still-standing.mp3` | …Still Standing! | After the names of those who go through a skirmish |

## The champion

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/announcer/hero-of-gyrondor.mp3` | …Hero of Gyrondor! | After the champion's name, as the Champion scene's reveal lands |

## Fighter name calls

The 12 starter fighters' names, said as a call ("The Beanblader!"). The new files replace the 2026 ones under the same names in `tournament-app/web/static/starter-fighters/`. A fighter already in the library keeps its old clip until the new one is uploaded with Replace voice on the admin Fighters page.

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/starter-fighters/the-beanblader.mp3` | The Beanblader! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-baby.mp3` | The Beyby! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-breycist.mp3` | The Breycist! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-buzzsaw.mp3` | The Buzzsaw! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-cheatseeker.mp3` | The Cheatseeker! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-fairy-dancer.mp3` | The Fairy Dancer! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-joyzerker.mp3` | The Joyzerker! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-modsmith.mp3` | The Modsmith! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-pugilist.mp3` | The Pugilist! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-stancemancer.mp3` | The Stancemancer! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-torque-warden.mp3` | The Torque Warden! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |
| `tournament-app/web/static/starter-fighters/the-underdogger.mp3` | The Underdogger! | VS intro, VICTORIOUS, Still Standing, Last One Standing and the Champion scene |

## Music, effects and narration

The 2026 files play until these are replaced. A new file goes in under the same name.

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/sounds/music/championship-theme-1.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/music/championship-theme-2.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/music/championship-mode.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/music/championship-theme-3.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/music/championship-theme-4.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/music/championship-theme-5.mp3` | Match music (instrumental) | Under every match from its VS intro, one track at random, never twice running; the next starts when one ends |
| `tournament-app/web/static/sounds/stinger.mp3` | Stinger, about 5 s, ending on a final hit | Ends a match, crossfading out of the match music |
| `tournament-app/web/static/sounds/champion-theme.mp3` | Champion theme (instrumental, loops) | Under the Champion scene |
| `tournament-app/web/static/sounds/match-point-impact.mp3` | A heavy impact | Match point lands (Death's Door) |
| `tournament-app/web/static/sounds/heartbeat.mp3` | One heartbeat (lub-dub), padded with silence to exactly 1.2 s | Loops under the ducked music during match point |
| `tournament-app/web/static/intro/narration.m4a` | The Prologue narration (script still to be written) | The organiser's Prologue on the TV; the captions are timed to its words, so they're redone with it |
