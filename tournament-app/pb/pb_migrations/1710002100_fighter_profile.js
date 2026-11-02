/// <reference path="../pb_data/types.d.ts" />
// Fighters get a profile sheet: a full "Blader profile" card (picture, stats
// and quote) the TV shows now and then in its auto rotation. Optional.
migrate(
  (app) => {
    const fighters = app.findCollectionByNameOrId("fighters");
    fighters.fields.add(
      new Field({
        name: "profile",
        type: "file",
        maxSelect: 1,
        maxSize: 8 * 1024 * 1024,
        mimeTypes: ["image/png", "image/webp", "image/jpeg"],
        // The admin page's preview; the TV shows the full picture.
        thumbs: ["300x200"],
      }),
    );
    app.save(fighters);
  },
  (app) => {
    const fighters = app.findCollectionByNameOrId("fighters");
    fighters.fields.removeByName("profile");
    app.save(fighters);
  },
);
