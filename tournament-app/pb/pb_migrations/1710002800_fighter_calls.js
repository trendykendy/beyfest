/// <reference path="../pb_data/types.d.ts" />
// Each fighter gets three whole announcer calls of their own, one file each
// rather than their name clip followed by a shared line (Tetrafatalis):
// - callVictorious: "The Buzzsaw is VICTORIOUS!" (the winner screen)
// - callRoyaleChampion: "The Buzzsaw … Last One Standing!" (Grand Mêlée champion)
// - callChampion: "The Buzzsaw … Hero of Gyrondor!" (the Champion scene)
// A fighter without one gets no call at that moment.
const FIELDS = ["callVictorious", "callRoyaleChampion", "callChampion"];

migrate(
  (app) => {
    const fighters = app.findCollectionByNameOrId("fighters");
    for (const name of FIELDS) {
      fighters.fields.add(
        new Field({
          name,
          type: "file",
          maxSelect: 1,
          maxSize: 2 * 1024 * 1024,
          mimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/mp4"],
        }),
      );
    }
    app.save(fighters);
  },
  (app) => {
    const fighters = app.findCollectionByNameOrId("fighters");
    for (const name of FIELDS) fighters.fields.removeByName(name);
    app.save(fighters);
  },
);
