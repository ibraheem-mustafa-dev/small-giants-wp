# Gradient storage — how the market stores a "flat colour OR gradient" setting

```
doc_type: report
date: 2026-08-14
stream: P1 of the colour-panel standards session (~/.claude/plans/go-track-1b-swift-wolf.md)
question: Bean, 2026-08-14 — "research what the best way of storing a gradient is, our shape or a
          single attribute. Also, we need to make it available to all."
method: WP core source (raw trunk), GitHub code search against the real repos of Stackable and
        Kadence, plus each project's own block.json. Not documentation summaries.
```

## Verdict in one paragraph

**Store the gradient as ONE attribute holding the complete CSS value, alongside the flat-colour
attribute — two attributes per row, not five.** WordPress core and Kadence independently converge on
exactly this shape, and neither uses a boolean discriminator: a non-empty gradient value *is* the
discriminator, and the renderer gives it precedence over the flat colour. This is strictly better
than SGS's current five-attribute decomposition on every axis that matters here — it costs one new
attribute per row instead of four, it removes the cloning-converter's ambiguous-property problem
(one attribute carries one CSS property), and it stops the lossy flattening SGS's own component
docblock already admits to (radial and 3+ stop gradients currently collapse to first-colour /
last-colour). Stackable is the one measured dissenter and decomposes further than SGS does.

## What each library actually does

### WordPress core — one CSS string, plus a separate preset slug

Read from `packages/block-editor/src/hooks/color.js` on trunk.

- **Preset gradient** → the slug goes in a top-level `gradient` attribute, rendered as a class via
  `__experimentalGetGradientClass( gradient )`.
- **Custom gradient** → the **complete CSS value** goes in `style.color.gradient`.
- **Precedence, not a discriminator.** Core computes
  `const hasBackgroundValue = backgroundColor || style?.color?.background || gradient || style?.color?.gradient;`
  and then suppresses the background class when a custom gradient exists:
  `[ backgroundClass ]: ( ! hasGradient || ! style?.color?.gradient ) && !! backgroundClass`.
  There is no boolean anywhere.

### Kadence — same shape, confirmed from its own `block.json`

`src/blocks/rowlayout/block.json` (stellarwp/kadence-blocks):

```json
"bgColor":         { "type": "string", "default": "" },
"gradient":        { "type": "string", "default": "" },
"overlay":         { "type": "string", "default": "" },
"overlayGradient": { "type": "string", "default": "" }
```

Flat and gradient are separate attributes; the gradient is a **single string**, not decomposed. No
`gradientAngle`, no `gradientFrom`/`To`, no enable boolean.

⭐ **And Kadence emits it through the `background` SHORTHAND** — `$css->add_property( 'background', 'linear-gradient(...)' )`
in `class-kadence-blocks-advancedbtn-block.php`, `-form-block.php` and `-advancedgallery-block.php`.
This is the technical point that dissolves SGS's stated blocker: `background` legally accepts *both*
a colour and a gradient, so the renderer does **not** need a discriminator to pick between
`background-color` and `background-image`. One property, either value.

⚠ **Honest complication, not hidden:** Kadence is not uniform. Its *button* and *form* blocks store
the gradient as one attribute holding an **array** of parts — `$style['gradient'][0..6]` =
colour1, colour2, location1, location2, `linear|radial`, angle, radial position. Still **one
attribute**, but a structured value rather than a CSS string. So Kadence's real convergence with
core is "one attribute per gradient", not specifically "a CSS string".

### Stackable — the dissenter; decomposes further than SGS

`src/block-components/helpers/backgrounds/attributes.js` and `.../icon/attributes.js` (gambitph/Stackable):
a `backgroundColorType` discriminator plus sibling attributes including
`backgroundGradientBlendMode`, `iconColorGradientDirection` (number),
`progressColorGradientLocation1` (number). This is SGS's current model with more knobs, and it is
the minority position among the three measured.

### SGS today — five attributes, and lossy by its own admission

`overlayGradient` (bool) · `overlayGradientAngle` (number) · `overlayGradientFrom` (string) ·
`overlayGradientTo` (string) · plus the separate flat attr `backgroundOverlayColour`. Eight controls
across `container`, `cta-section`, `hero`, `site-header`, `site-footer`, `trust-bar`, and a
differently-named variant in `separator`. `GradientOverlayControl.js:38-53` records the loss
directly: the native picker's free-form CSS is *parsed down* onto angle/from/to and *rebuilt* on
read, so radial and 3+ stop gradients are flattened to first-colour/last-colour.

## Why the one-attribute shape is the right answer for SGS specifically

1. **Cost of "available to all".** At one new attribute per colour row instead of four, universal
   gradient becomes affordable. The five-attribute shape does not scale to every row.
2. **It removes a known clone-time crash class.** `decisions.md:1370-1382`: `sgs/hero` raised
   `AmbiguousLayerAttrError` because three attributes composing one `linear-gradient()` all claimed
   `css_property='background-image'` on the same element — a shape the converter's one-property-per-slot
   model structurally cannot express, worked around with a `css_property=NULL` override layer. One
   attribute carrying the whole value has no tie to break, so the override layer stops growing.
3. **It fixes the lossiness** rather than preserving it: store what the picker produced.
4. **The stated blocker was not real.** "PHP renders the two branches to different CSS properties"
   is true only because SGS chose `background-color` / `background-image`. Kadence proves the
   `background` shorthand takes either. ⚠ The one genuine exception is `sgs/separator`, which paints
   through `border-image` vs `border-bottom-color` — that block keeps a real branch and must be
   designed for explicitly, not assumed away.
5. **No inline-styling conflict.** Core applies custom gradients inline; SGS must not (Spec 32). But
   that is an *emission* difference, not a *storage* one — SGS already writes this value into its
   own scoped `<style>` and would continue to.

## What this does NOT settle

- **Whether the stored value should be a CSS string (core, Kadence rowlayout) or a structured object
  (Kadence button/form).** A CSS string is simplest and lossless; an object is easier to validate and
  to sanitise. `helpers-tokens.php:682` explicitly warns that prefix-checking a string for
  `linear-gradient(` "is NOT sufficient sanitisation" — so the string form needs a real validator,
  and that cost belongs in the decision.
- **Theme gradient presets.** `theme.json` declares `"gradients": []` with `defaultGradients: false`,
  so zero presets exist and core's preset-slug half has nothing to point at today. Adopting the slug
  half is a separate, later choice.
- **Migration of the 8 existing five-attribute families.** Real work, not costed here. Pre-production
  rules (D293/D270) mean no deprecations or version bumps are needed, which makes it cheaper than it
  would otherwise be — but it is not free.

## Sources

- [Gutenberg `hooks/color.js` (trunk)](https://raw.githubusercontent.com/WordPress/gutenberg/trunk/packages/block-editor/src/hooks/color.js)
- [Gutenberg discussion #37495 — improving saving/rendering of block styles](https://github.com/WordPress/gutenberg/discussions/37495)
- [stellarwp/kadence-blocks](https://github.com/stellarwp/kadence-blocks) — `src/blocks/rowlayout/block.json`, `includes/blocks/class-kadence-blocks-advancedbtn-block.php`, `-form-block.php`, `-advancedgallery-block.php`
- [gambitph/Stackable](https://github.com/gambitph/Stackable) — `src/block-components/helpers/backgrounds/attributes.js`, `src/block-components/icon/attributes.js`
- [10up block-supports reference](https://gutenberg.10up.com/reference/Blocks/block-supports/)
