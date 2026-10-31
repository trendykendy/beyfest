# The Fairy Dancer: prompts

Redesign, 2026-10-31. Player: Steve. The user isn't happy with the likeness and wants
the Beyblade to look more like a fairy. User's choices: a pirouette launch, a
fairy-wing Beyblade, the cap removed, and the rest of the outfit kept as it is (no
cyberpunk lean). Likeness from two photos: see `likeness/fairydancer.md`.

**Approved: `approved/fairydancer.png`** (a copy of `candidates/fairydancer-C.png`,
2026-10-31). 1536×1024, transparent, face found at 0.92. In the app with a new face
point; no mirror flag.

Driven from the built-in browser. It can't attach files (pasting and a localhost
fetch were both blocked), so the user drags the attachments into the chat box; the
results are saved with an `<a download>` on the image's blob URL, which lands in
`~/Downloads`.

## Attachments (new chat)

From `reference-photos/fairydancer/upload/`: `1-style-pugilist.png`,
`1b-style-pugilist-face.png`, `2-photo-master-front.jpg` (beach selfie, no cap: the
master), `3-photo-laughing.jpg` (laughing, in a cap), `4-outfit-current-action.png`
(the current art, for the outfit only).

## Prompt A

> Attached: the first two images are the STYLE REFERENCE ONLY (a fighter called the
> Pugilist, full figure and a head close-up): copy their hand-drawn, inked rendering
> exactly, but none of his face, outfit, colours or pose. The next two photos are of
> the real man this character is based on, for LIKENESS ONLY. The beach selfie is
> the MASTER reference, because it shows his hair; the laughing photo shows his
> laugh, eyes and cheeks (ignore the cap). The last image is the character's current
> art, for the OUTFIT ONLY: copy the jacket, T-shirt, trousers, gloves and trainers,
> but NOT the face, the cap, the pose or the Beyblade.
>
> [Reusable style block from STYLE-GUIDE.md, with PALETTE = hot pink, violet purple
> and iridescent pearl-white]
>
> Character: "The Fairy Dancer". Draw him in this hand-drawn inked style with his
> likeness, no hat: light brown hair cropped very short at the sides, with a high,
> receding hairline and thin hair on top (a big, high forehead); a long oval face
> with a long chin and full, rounded cheeks that bunch up high when he laughs (not
> square or chiselled); light sandy-ginger stubble only, no beard or goatee; small,
> deep-set blue eyes; light, fairly straight brows; a fairly large straight nose
> with a rounded tip; ears that stick out a little; fair skin flushed pink at the
> cheeks and nose; a slim build (not muscular).
>
> Pose: mid-pirouette, up on the toes of one foot, the other leg tucked up with the
> knee bent like a ballet dancer, his body twisting with the spin. The launch arm
> is extended out to the side holding the launcher, the Beyblade just leaving it;
> the other hand has ripped the ripcord free, and the plain cord trails from his
> fingers in a loose spiral that follows the spin. The open jacket flares out with
> the turn. The Beyblade's glow follows the spin around him like a ribbon. Graceful
> but deadly. It must NOT be a fist punched toward the camera. Camera: front,
> slightly low.
>
> Expression: a big, delighted laugh, as exaggerated as image 2's laugh, not a
> realistic smile: mouth wide open with the top teeth showing, round cheeks pushed
> up high, eyes crinkled almost shut, brows lifted.
>
> Outfit, as in the last image, without the cap: an open, oversized holographic
> camo jacket in pink, purple and pearl-white with an iridescent sheen; a black
> T-shirt with a glowing pink butterfly (symmetric); black trousers with pink
> straps and buckles; black fingerless gloves; white and pink trainers. No lettering
> or logos anywhere.
>
> Beyblade: it looks like a fairy. Its blades are translucent, iridescent
> dragonfly-style fairy wings in pink, violet and pearl-white, with fine glowing
> veins, set around a petal-shaped rim; the centre is plain. Instead of shards, it
> throws off a glittering trail of pixie dust: tiny sparkles and twinkling stars in
> pink and violet, swirling with the spin. No butterflies, no crystal shards, no saw
> teeth.

## Versions

| Version | How | Result |
|---|---|---|
| A | New chat (driven from the built-in browser; the user dragged in the 5 attachments, which landed face close-up, full Pugilist, laughing photo, beach selfie, current art); prompt A with the style block, "Create an image." in front and the expression pointing at "the Pugilist's laugh" | Good likeness: receding hairline, long face, fair skin, a big crinkle-eyed laugh. The outfit carries over without the cap. The Beyblade has clear iridescent wing blades and sparkles: much more fairy. Transparent (1536×1024). But it's a leaping kick with both feet off the ground, not a pirouette on one toe; the face is smoother and less inked than the Pugilist's; there's a soft partly transparent glow haze around the swirl; the pixie-dust trail is light |
| B | Edit of A (same chat): smaller head and longer torso (~7.5 heads tall, user's note), a real pirouette on one toe, more ink in the face, denser pixie dust, no haze | Proportions fixed: a tall, slim figure with a visible neck and a longer waist. Now a pirouette (passé): one leg straight, the other tucked at the knee, arms flung wide; the standing foot floats near the bottom rather than resting on a floor. Pixie dust much denser, crisp sparkles. Likeness, laugh, outfit and wing Beyblade kept; transparent. Composited on blue (`candidates/fairydancer-B-on-blue.png`) it is clean: its 25% partly transparent pixels (approved fighters: 4–8%) are the glitter trails themselves, not fog. The face is smaller now and still a touch smooth next to the Pugilist |
| C | Edit of B: camera only (user's note: no full body needed, look down from above, much closer); full Pugilist inking now the face is bigger | High angle looking down, close: his laughing face turned up to the camera, large in the upper half, with clearly more ink detail (laugh lines, crinkled eyes, cheekbones, mouth folds). The body foreshortens down to one trainer at the bottom; arms flung wide, the launcher close to the camera on the right with the wing Beyblade big in the lower right, the ripcord looping at top left. Outfit, likeness, Beyblade and pixie dust kept; transparent, clean on blue (`candidates/fairydancer-C-on-blue.png`) |

## Victory images (2026-10-31)

Recipe as for the Underdogger: a new chat each, with the old victory image as the
scene template, the approved cut-out for the outfit, a close-up of the approved head
(`candidates/fairydancer-C-face.png`, on white) as the face and rendering
reference, and the beach selfie for likeness only. Attachments in
`reference-photos/fairydancer/victory-upload/` and `royale-upload/`. The prompt
describes each image by content (the drag order isn't reliable), keeps the belt or
trophy and banner lettering unchanged, removes the cap, and asks for the new face on
the big screen too.

- **Belt A** (`candidates/victory-fairydancer-A.png`): the new face, inked, a huge
  crinkle-eyed laugh, no cap; the outfit matches; the big screen shows the new face.
  The belt's "THE FAIRYDANCER" plate and all banners carried over unchanged.
- **Royale A** (`candidates/royale-victory-fairydancer-A.png`): the new face roaring
  with laughter, no cap, trophy raised in a gloved hand and a clenched gloved fist;
  the big screen shows the new face. The trophy lettering ("BEYFEST BATTLE ROYALE
  CHAMPION") and banners carried over unchanged.
