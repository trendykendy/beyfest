# Beyfest: Tetrafatalis: clip list

Every sound the TV plays. Generated from `tournament-app/web/src/lib/clips.ts` by `bun run scripts/clips.ts` (run in `tournament-app`); change the list there, not here.

**To commission:** 24 shared announcer clips, 12 fighter name calls, 36 fighters' own calls, and the 11 music, effect and narration files.

**How to deliver the announcer clips**

- MP3, one call per file, under exactly the file name below.
- Trim the silence off both ends: calls are chained with a 0.15 s breath, so any padding shows as a pause.
- A line starting "…" is said straight after a name ("The Buzzsaw and The Breycist … Still Standing!"), so it should sound like the end of a sentence.
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

## Match point

| File | Says | When it plays |
|---|---|---|
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
| `tournament-app/web/static/sounds/announcer/melee/and.mp3` | …and… | Between the last two names on the Still Standing screen |
| `tournament-app/web/static/sounds/announcer/melee/still-standing.mp3` | …Still Standing! | After the names of those who go through a skirmish |

## Fighter name calls

The 12 starter fighters' names, said as a call ("The Beanblader!"), under these names in `tournament-app/web/static/starter-fighters/`. The library picks up a re-recorded one the next time starters are loaded (Add starting fighters on the admin Fighters page, or creating a tournament); a clip uploaded by hand is kept.

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/starter-fighters/the-beanblader.mp3` | The Beanblader! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-baby.mp3` | The Beyby! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-breycist.mp3` | The Breycist! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-buzzsaw.mp3` | The Buzzsaw! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-cheatseeker.mp3` | The Cheatseeker! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-fairy-dancer.mp3` | The Fairy Dancer! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-joyzerker.mp3` | The Joyzerker! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-modsmith.mp3` | The Modsmith! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-pugilist.mp3` | The Pugilist! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-stancemancer.mp3` | The Stancemancer! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-torque-warden.mp3` | The Torque Warden! | VS intro, and the Still Standing screen |
| `tournament-app/web/static/starter-fighters/the-underdogger.mp3` | The Underdogger! | VS intro, and the Still Standing screen |

## Fighters' own calls

One whole line per fighter per moment, said in one go (not a name clip joined to a shared line). They go in `tournament-app/web/static/starter-fighters/`; the library picks up a new or re-recorded one the next time starters are loaded (Add starting fighters on the admin Fighters page, or creating a tournament). A fighter without one gets no call at that moment.

| File | Says | When it plays |
|---|---|---|
| `tournament-app/web/static/starter-fighters/victorious-beanblader.mp3` | The Beanblader is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-beanblader.mp3` | The Beanblader … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-beanblader.mp3` | The Beanblader … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-beyby.mp3` | The Beyby is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-beyby.mp3` | The Beyby … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-beyby.mp3` | The Beyby … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-breycist.mp3` | The Breycist is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-breycist.mp3` | The Breycist … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-breycist.mp3` | The Breycist … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-buzzsaw.mp3` | The Buzzsaw is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-buzzsaw.mp3` | The Buzzsaw … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-buzzsaw.mp3` | The Buzzsaw … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-cheatseeker.mp3` | The Cheatseeker is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-cheatseeker.mp3` | The Cheatseeker … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-cheatseeker.mp3` | The Cheatseeker … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-fairydancer.mp3` | The Fairy Dancer is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-fairydancer.mp3` | The Fairy Dancer … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-fairydancer.mp3` | The Fairy Dancer … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-joyzerker.mp3` | The Joyzerker is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-joyzerker.mp3` | The Joyzerker … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-joyzerker.mp3` | The Joyzerker … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-modsmith.mp3` | The Modsmith is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-modsmith.mp3` | The Modsmith … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-modsmith.mp3` | The Modsmith … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-pugilist.mp3` | The Pugilist is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-pugilist.mp3` | The Pugilist … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-pugilist.mp3` | The Pugilist … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-stancemancer.mp3` | The Stancemancer is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-stancemancer.mp3` | The Stancemancer … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-stancemancer.mp3` | The Stancemancer … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-torquewarden.mp3` | The Torque Warden is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-torquewarden.mp3` | The Torque Warden … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-torquewarden.mp3` | The Torque Warden … Hero of Gyrondor! | The Champion scene, as the reveal lands |
| `tournament-app/web/static/starter-fighters/victorious-underdogger.mp3` | The Underdogger is VICTORIOUS! | The winner screen, as the banner lands |
| `tournament-app/web/static/starter-fighters/last-one-standing-underdogger.mp3` | The Underdogger … Last One Standing! | The Grand Mêlée champion scene |
| `tournament-app/web/static/starter-fighters/hero-underdogger.mp3` | The Underdogger … Hero of Gyrondor! | The Champion scene, as the reveal lands |

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
