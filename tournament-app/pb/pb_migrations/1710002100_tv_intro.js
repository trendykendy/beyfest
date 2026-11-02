/// <reference path="../pb_data/types.d.ts" />
// The Beyfest intro, started from the admin page's TV panel:
// - introAt: when the organiser last pressed "Play the intro" (ms since 1970,
//   0 if never). The TV plays the intro whenever it sees this change.
migrate(
  (app) => {
    const tv = app.findCollectionByNameOrId("tv_state");
    tv.fields.add(new Field({ name: "introAt", type: "number", min: 0 }));
    app.save(tv);
  },
  (app) => {
    const tv = app.findCollectionByNameOrId("tv_state");
    tv.fields.removeByName("introAt");
    app.save(tv);
  },
);
