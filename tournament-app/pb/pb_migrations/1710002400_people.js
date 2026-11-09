/// <reference path="../pb_data/types.d.ts" />
// Tetrafatalis sign-in: everyone at the event signs in on their phone, as a
// player or a spectator. The players become the tournament's player list
// when the organiser draws the groups, and everyone who signed in can wager.
//
//   people.name    — unique, ignoring case
//   people.token   — proves the phone that signed in; never sent to phones.
//                    Empty for someone the organiser added by hand.
//   people.role    — "player" or "spectator"
//   people.starter — combat name of the starting fighter they picked, if any
//   people.phone   — signed in on a phone (false: the organiser added them)
//
// People don't belong to a tournament: redrawing or resetting it keeps
// everyone signed in (the admin page has "Clear sign-ins" for a new day).
// Public read (phones and the TV list who's here); organisers can add, fix
// and remove people; phones sign in through the web server's bookie login.
//
// Wagers now point at a person (bets.person, plus their name in bets.who).
// The 2026 event's wagers aren't kept: every existing bet is deleted, then
// bets.bettor and the per-tournament bettors collection are dropped. (The
// 2026 event itself lives on in the beyfest-2026-final tag and its zip.)
migrate(
  (app) => {
    const authed = '@request.auth.collectionName = "organisers"';
    const people = new Collection({
      type: "base",
      name: "people",
      listRule: "",
      viewRule: "",
      createRule: authed,
      updateRule: authed,
      deleteRule: authed,
      fields: [
        { name: "name", type: "text", required: true, max: 16 },
        { name: "token", type: "text", hidden: true },
        { name: "role", type: "select", required: true, maxSelect: 1, values: ["player", "spectator"] },
        { name: "starter", type: "text", max: 40 },
        { name: "phone", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_people_name ON people (name COLLATE NOCASE)"],
    });
    app.save(people);

    // Wagers don't go with their person: clearing sign-ins for a new day must
    // keep the archived tournaments' wagers. `who` keeps the name they were
    // placed under, for once the person is gone. (A reset still clears a
    // tournament's wagers, through bets.tournament.)
    // All existing bets are 2026 wagers, placed as bettors.
    for (const old of app.findAllRecords("bets")) app.delete(old);
    const bets = app.findCollectionByNameOrId("bets");
    bets.fields.removeByName("bettor");
    bets.fields.add(new Field({ name: "person", type: "relation", collectionId: people.id, maxSelect: 1, cascadeDelete: false }));
    bets.fields.add(new Field({ name: "who", type: "text", max: 16 }));
    app.save(bets);
    app.delete(app.findCollectionByNameOrId("bettors"));
  },
  // Undo puts the old shape back (empty: the 2026 wagers are gone for good).
  (app) => {
    const tournaments = app.findCollectionByNameOrId("tournaments");
    const bettors = new Collection({
      type: "base",
      name: "bettors",
      listRule: "",
      viewRule: "",
      fields: [
        { name: "tournament", type: "relation", required: true, collectionId: tournaments.id, maxSelect: 1, cascadeDelete: true },
        { name: "name", type: "text", required: true, max: 16 },
        { name: "token", type: "text", required: true, hidden: true },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_bettors_name ON bettors (tournament, name COLLATE NOCASE)"],
    });
    app.save(bettors);

    for (const b of app.findAllRecords("bets")) app.delete(b);
    const bets = app.findCollectionByNameOrId("bets");
    bets.fields.removeByName("person");
    bets.fields.removeByName("who");
    bets.fields.add(new Field({ name: "bettor", type: "relation", required: true, collectionId: bettors.id, maxSelect: 1, cascadeDelete: true }));
    app.save(bets);
    app.delete(app.findCollectionByNameOrId("people"));
  },
);
