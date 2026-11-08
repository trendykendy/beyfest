// Every in-world name the screens show for Beyfest: Tetrafatalis, in one place.
// The glossary was settled in the planning doc (Lore → In-world names); a rename
// is one edit here. Only display words live here: stored keys (scene names,
// finish keys, bracket tiers) never change, because the database and the audio
// file names use them.

/** The event itself. Some screens show the two parts separately. */
export const EVENT_BRAND = "Beyfest";
export const EVENT_SUBTITLE = "Tetrafatalis";
export const EVENT_NAME = `${EVENT_BRAND}: ${EVENT_SUBTITLE}`;
export const REALM = "Gyrondor";
export const ARENA_NAME = "the Endless Ring";

/** A competitor ("Blader" in 2026). */
export const BLADER = { one: "Bladesworn", many: "Bladesworn" } as const;

/** Stages of the competition. */
export const STAGES = {
  groups: "The Proving", // the group stage
  groupPrefix: "Circle", // Group A/B/C → Circle I/II/III
  paths: "The Paths", // the knockout brackets, taken together
  pathRoundRobins: "Path round-robins", // the Winners/Losers mini round-robins
  winners: "Gilded Path", // Winners Bracket
  mid: "Iron Path", // Mid Bracket
  losers: "Ashen Path", // Losers Bracket
  grandFinal: "The Reckoning",
  grandFinalBuildUp: "Eve of the Reckoning",
} as const;

/** Roman numerals for circles and arenas (Circle I, Circle II …). */
const NUMERALS = ["I", "II", "III", "IV", "V", "VI"] as const;
export const circleName = (index: number): string => `${STAGES.groupPrefix} ${NUMERALS.at(index) ?? index + 1}`;

/** Titles and honours. */
export const TITLES = {
  champion: "Hero of Gyrondor", // Grand Final winner
  royale: "The Grand Mêlée", // battle royale
  royaleChampion: "Last One Standing",
  royaleHeat: "Skirmish",
  royaleSuddenDeath: "Last Stand",
  royaleFinal: "Final Mêlée",
  royaleQualified: "Still Standing",
  topBettor: "Lord of Gold", // High Roller
} as const;

/** TV scenes and moments. */
export const SCREENS = {
  waiting: "The Gathering",
  break: "The Respite",
  matchCentre: "The Arena",
  arenaDraw: "Casting the Runes",
  matchPoint: "Death's Door",
  winner: "VICTORIOUS",
  upNext: "Summoned",
  live: "In Battle",
  profile: "Chronicle",
  intro: "Prologue",
  awards: "Awards", // renamed in-world with the Awards restyle
} as const;

/** How a round is won. Keys match `FINISHES` in finishes.ts. */
export const FINISH_NAMES = {
  spin: "Endurance",
  knockout: "Banishment",
  dominant: "Annihilation",
} as const;

/** The phone page. */
export const PHONE = {
  now: "The Herald",
  groups: "The Circles",
  bracket: "The Paths",
  bets: "Wagers",
  follow: "Banner",
} as const;

/** Wagering. */
export const WAGERS = {
  bet: "wager",
  bets: "wagers",
  currency: "gold",
  leaderboard: "Hall of Fortune",
  demonLoan: "Pact", // a loan from Beyelzebub
  playerLoan: "Pledge", // a loan from another player
  demonLender: "Beyelzebub",
} as const;
