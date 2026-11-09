/// <reference path="../pb_data/types.d.ts" />
// Wager markets (Tetrafatalis betting):
//   bets.market    — what kind of wager: "match" (who wins a match) for now;
//                    finishing blow, margin and outrights come later. Text,
//                    not a select, so a new market needs no migration; the
//                    web server checks the value.
//   bets.selection — what was backed when it isn't a player (e.g. a finish
//                    or a margin band); "" for match wagers.
//   bets.pick and bets.match become optional: an outright has no match, and
//                    a margin wager may have no player.
// Wagers already placed are all match wagers.
migrate(
  (app) => {
    const bets = app.findCollectionByNameOrId("bets");
    bets.fields.add(new Field({ name: "market", type: "text", max: 20 }));
    bets.fields.add(new Field({ name: "selection", type: "text", max: 40 }));
    bets.fields.getByName("pick").required = false;
    bets.fields.getByName("match").required = false;
    app.save(bets);
    for (const b of app.findAllRecords("bets")) {
      b.set("market", "match");
      app.save(b);
    }
  },
  (app) => {
    const bets = app.findCollectionByNameOrId("bets");
    bets.fields.removeByName("market");
    bets.fields.removeByName("selection");
    app.save(bets);
  },
);
