/// <reference path="../pb_data/types.d.ts" />
// Tetrafatalis side draw: with each round's arena, the draw also picks which
// player stands on the north side (the other is south).
//   matches.north — 1 or 2 (p1 or p2) for the round about to be played, 0 if none
// Each liveLog entry also gains a "north" key: who stood north that round.
migrate(
  (app) => {
    const m = app.findCollectionByNameOrId("matches");
    m.fields.add(new Field({ name: "north", type: "number", onlyInt: true, min: 0, max: 2 }));
    app.save(m);
  },
  (app) => {
    const m = app.findCollectionByNameOrId("matches");
    m.fields.removeByName("north");
    app.save(m);
  },
);
