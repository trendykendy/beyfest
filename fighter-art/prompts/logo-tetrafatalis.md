# Beyfest: Tetrafatalis logo (ChatGPT prompt)

Written 2026-11-08 for the next event. The 2026 logo (`L1` in `intro.md`) is the
foundation: same silhouette and layout, every material swapped for the fantasy look
(epic high fantasy; gold, slate stone, torch orange, demon crimson for accents).
The user is sourcing the logo, so this prompt is a starting point for them.

**Attach:** the current logo, `tournament-app/web/static/logo.webp`, converted to PNG
(ChatGPT handles PNG more reliably than WebP).

Lessons carried over from L1:
- ChatGPT stacks logo tiers tightly even when asked for gaps, so the prompt insists.
- The intro cuts the logo into tiers along the gaps, so the tiers must not touch.
- Long made-up words get misspelled; spell TETRAFATALIS out letter by letter.

## The prompt

> Please generate a new image: a logo for **Beyfest: Tetrafatalis**, an anime-style
> Beyblade tournament with an epic high-fantasy theme, on a **transparent background**.
>
> **Use the attached logo as the foundation.** Keep its overall shape and layout: the
> stacked, centred tiers, the crown sitting on top of BEYFEST, the bold angular BEYFEST
> letterforms with their sharp sword-like serifs and forward lean, and the red katakana
> ベイフェスト beneath. It should read clearly as the same brand, transported from a
> cyberpunk world into a fantasy one. Replace every material and effect; keep the silhouette.
>
> **The story behind it:** last year's champion made a bargain with two demons. Every
> competitor was dragged into Gyrondor, a Lord of the Rings–style realm, where they're
> trapped in an eternal tournament in an ancient arena called the Endless Ring. This
> year's event is fought across four arenas, hence "Tetra".
>
> **Two tiers, stacked and centred, with a wide band of empty transparent space between
> them (at least the height of the katakana). The tiers must not touch or overlap anywhere:**
>
> 1. **BEYFEST**, with the crown above and ベイフェスト beneath, the same arrangement as
>    the attached logo.
>    - Letters: forged ancient gold, like a relic from a dwarven hall. Warm, rich
>      metallic gold with darker bronze bevels, fine hammered texture and a few worn,
>      battle-scarred edges. Bright specular glints, as in the original. Not chrome, not silver.
>    - Crown: a fantasy crown in the same gold, with a small deep-crimson gem set in the
>      middle point. Keep the original crown's shape and position.
>    - Katakana ベイフェスト: deep demonic crimson, with a faint ember glow, as if heated
>      from within.
>
> 2. **TETRAFATALIS** (T-E-T-R-A-F-A-T-A-L-I-S, 12 letters).
>    - Letters: classical flared Roman capitals, like letters carved into an ancient stone
>      monument (in the spirit of Marcellus or Trajan), rather than the original's spiky
>      fighting-game letters.
>    - Material: dark slate-grey carved stone with gold-leaf inlay in the letter strokes.
>      Hairline cracks across the stone glow molten crimson-orange, as if the demons'
>      curse is leaking through.
>    - Emblem: behind or beneath the word, a subtle sigil of **four interlocking rings**
>      in thin gold lines (the four arenas of the Endless Ring). Keep it small and quiet;
>      the word must stay the focus.
>
> **Palette:** gold for the hero elements, dark slate stone, torch-orange glows, deep
> demon crimson for accents only. No neon, no electric blue, no chrome.
>
> **Exactly that text and nothing else**, spelled exactly as written: BEYFEST, ベイフェスト,
> TETRAFATALIS. No year, no tagline, no extra words or symbols.
>
> Crisp, clean edges suitable for cutting out. No background, no scenery, no smoke, no
> glow spilling across the canvas; any glow stays tight to the letters. Landscape 3:2,
> with the logo filling most of the width and a little padding at the edges so nothing
> touches the border.

## Follow-ups (same chat)

- **Spelling slips:** "The second tier is misspelled. It must read exactly
  T-E-T-R-A-F-A-T-A-L-I-S. Change only that word; keep everything else identical."
- **Tiers touching:** "Keep everything identical, but move the two tiers further apart so
  there's a wide band of fully transparent space between them. Nothing may touch."
- **Too far from the original:** "Closer to the attached logo's letter shapes and crown for
  BEYFEST. Only the materials should change."
- **Too busy:** "Simplify: fewer cracks, a quieter ring sigil, cleaner edges. Keep the gold,
  stone and crimson."

## Notes

- No year tier, since the date isn't set. To add one, ask for a middle tier in gold numbers.
- In the app, the 2026 logo was cut into tiers for the intro (`static/intro/logo-*.webp`),
  plus a BEYFEST-only piece (`static/logo-beyfest.webp`) for the TV top bar and phone
  header. Do the same with the new one.
