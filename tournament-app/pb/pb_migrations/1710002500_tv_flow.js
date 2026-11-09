/// <reference path="../pb_data/types.d.ts" />
// Tetrafatalis TV flow: three organiser buttons, each remembered as when it
// was pressed (ms since 1970, 0 if not yet). They live on the tournament, so a
// new or reset tournament starts again at the Gathering.
//   tournaments.groupsShownAt — "Show the Circles": the TV leaves the
//                               Gathering for the group overview
//   tournaments.pathsBegunAt  — "Begin the Paths": the knockout is generated,
//                               the Respite ends (and outright wagers close)
//   tournaments.crownedAt     — "Crown the Lord of Gold": the top wagerer's
//                               scene, for a short while after the champion
migrate(
  (app) => {
    const t = app.findCollectionByNameOrId("tournaments");
    for (const name of ["groupsShownAt", "pathsBegunAt", "crownedAt"]) {
      t.fields.add(new Field({ name, type: "number", onlyInt: true, min: 0 }));
    }
    app.save(t);
  },
  (app) => {
    const t = app.findCollectionByNameOrId("tournaments");
    for (const name of ["groupsShownAt", "pathsBegunAt", "crownedAt"]) t.fields.removeByName(name);
    app.save(t);
  },
);
