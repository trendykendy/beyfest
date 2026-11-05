/// <reference path="../pb_data/types.d.ts" />
// The fake ads, started from the admin page:
// - adAt: when the organiser last pressed "Play an ad" (ms since 1970, 0 if
//   never). The TV plays an ad whenever it sees this change.
migrate(
  (app) => {
    const tv = app.findCollectionByNameOrId("tv_state");
    tv.fields.add(new Field({ name: "adAt", type: "number", min: 0 }));
    app.save(tv);
  },
  (app) => {
    const tv = app.findCollectionByNameOrId("tv_state");
    tv.fields.removeByName("adAt");
    app.save(tv);
  },
);
