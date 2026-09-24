---
paths:
  - "plugins/sgs-blocks/src/blocks/**/render.php"
  - "plugins/sgs-blocks/includes/helpers-*.php"
---

# Colour emission (render.php side)

Check the precedent registry and decision table below BEFORE hand-fixing render.php CSS assembly
or designing a new colour-emission mechanism — most shapes already have a working helper.

## Known precedent-function registry

Add a row whenever a session finds a working precedent for a problem shape not yet listed.

| Problem shape | Known precedent | Where |
|---|---|---|
| SVG paint (fill/stroke) gradient | `sgs_svg_stroke_gradient()` + `sgs_svg_inject_defs()` | `includes/helpers-svg-gradient.php::sgs_svg_stroke_gradient`, `::sgs_svg_inject_defs` |
| Icon gradient where the icon's source varies (lucide/wp-icon render `<svg>`; dashicon/emoji render `<span>` and paint via `color:`) | `sgs_icon_gradient_css( $iconSource, $gradientCss, $uniqueId, $selector )` — used by `sgs/icon`, `notice-banner` (source genuinely varies), `cart`/`accordion-item`/`before-after`/`social-icons` (lucide-only). `icon-list` is a known different shape (per-item source) — open gap. | `includes/helpers-svg-gradient.php::sgs_icon_gradient_css` |
| Text colour/gradient, base OR ancestor-hover, one owned scoped rule | `sgs_resolve_text_colour_or_gradient()` + `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()` (+ `sgs_hover_state_rules()`'s 4-arg form for ancestor-hover) | `includes/helpers-tokens.php::sgs_resolve_text_colour_or_gradient`; worked examples in `post-grid/render.php`, `brand-strip/render.php` |
| Per-item dynamic-loop colour (repeater/query loop) | `:nth-child(N)`-scoped rule per iteration | `src/blocks/pricing-table/render.php` (`ribbonColour`) |
| Fill or text colour, base+hover, flat-or-gradient, one owned rule | `sgs_fill_states_css()` / `sgs_text_states_css()` | `includes/helpers-colour-variants.php` |
| Background/border custom-property gradient (static compiled stylesheet consumer) | `sgs_custom_property_gradient_decls()` — emits `--var` + `--var-gradient` siblings; stylesheet needs one added `background-image:var(--x-gradient,none)` (or `border-image`) line next to the existing `background-color:var(--x)` line | `includes/helpers-tokens.php::sgs_custom_property_gradient_decls` — proven on `brand-strip`, `post-grid`, `social-icons`, `form`, `gallery`, `before-after` |
| A block's own instance `<style>` rule needs to override a static compiled stylesheet default | Emit into the block's own `$scoped_css[]` array, keyed to its own selector — enqueued after the compiled stylesheet, so equal-or-greater specificity wins by source order. No new mechanism needed. | `src/blocks/option-picker/render.php` |

The custom-property-gradient row is background/border only — a `color:`-consuming custom property
is the text row above, even across a block's WP style variants (they differ only in fallback
default, not selector/property shape).

## Colour EMISSION helpers — which one to call

All live in `includes/helpers-tokens.php` (primitives) and `includes/helpers-colour-variants.php`
(per-mechanism composers) unless noted; all autoloaded via `render-helpers.php`.

**Primitives:**

| Function | Signature | Does |
|---|---|---|
| `sgs_colour_value()` | `( ?string $value ): string` | Resolves a token slug to `var(--wp--preset--color--X)` or passes a raw CSS colour through. The floor every other helper reads through. |
| `sgs_background_paint_decl()` | `( ?string $colour, ?string $gradient ): string` | ONE declaration — `background-color:X` or `background-image:linear-gradient(...)` (gradient wins when valid). |

**State emitter (what every mechanism ultimately calls):**

| Function | Signature | Does |
|---|---|---|
| `sgs_emit_state_colour_css()` | `( string $selector, array $decls_normal, array $decls_hover ): string` | Emits `{sel}{…}` plus a touch-guarded `:hover`/`:focus-visible` pair via `sgs_hover_state_rules()`. |

**Per-mechanism composers — pick ONE based on what the element paints:**

| Mechanism | Function | Returns | When to use |
|---|---|---|---|
| Fill | `sgs_fill_decls( $attributes, $map )` | `{normal:string[], hover:string[]}` | Element shares its selector with other declarations you're already assembling — compose, then call `sgs_emit_state_colour_css()` once. |
| Fill | `sgs_fill_states_css( $selector, $attributes, $map )` | Finished CSS | Element owns a standalone rule for just this fill. |
| Text | `sgs_text_decls( $attributes, $map )` | `{normal:string[], hover:string[]}` | Returns ONLY `color:`. If the resolved value is a gradient you must separately call `sgs_text_colour_gradient_fallback_rule()` — a bare `color:linear-gradient(...)` is invalid CSS the browser silently drops. |
| Border | `sgs_border_states_css( $selector, $attributes, $map )` | Finished CSS (always) | A border gradient needs a masked `::before` ring requiring both states at once. |

All four `$map` shapes: `['base'=>attr, 'hover'=>attr, 'gradient'=>attr, 'hover_gradient'=>attr]` —
only `base` required. Attribute names are the caller's own (Bean-locked); the map adapts, nothing
gets renamed to fit the helper.

**Button-element aggregate — for a genuinely button-shaped element only:**

`sgs_button_element_style_css( array $attrs, string $prefix, string $selector ): string`
(`includes/helpers-button-style.php`) — one call reads `{prefix}ColourBackground`/`ColourText`/
`ColourBorder` + `Hover` siblings + gradient siblings, plus border-style/width/radius,
font-weight/size, padding, width-type. Supports fill gradient and border gradient, deliberately
NOT text gradient (a button paints text and background on the same selector; a text gradient
needs `background-clip:text`, which would clip the background paint too — needs the `::after`
layer treatment below applied first). `sgs/button` has its own richer emitter and does not use
this helper; it is for other blocks' built-in CTA-shaped elements (product-card's CTA,
container's CTA, modal's close button, form's prev button, google-reviews' write-review/arrow
buttons).

**Real text gradient — the only path that supports it, and its precondition:**

| Function | Signature | Does |
|---|---|---|
| `sgs_resolve_text_colour_or_gradient()` | `( ?string $flat, ?string $gradient ): string` | Picks the gradient when valid, else the flat colour. |
| `sgs_text_colour_decl()` | `( ?string $value ): string` | Flat: `color:X`. Gradient: `background-image:X;-webkit-background-clip:text;background-clip:text;color:transparent`. |
| `sgs_text_colour_gradient_fallback_rule()` | `( string $selector, ?string $value ): string` | No-op for flat. For gradient: emits the mandatory `@supports not ((background-clip:text))` fallback. Always call alongside `sgs_text_colour_decl()` — omit it and a gradient degrades to invisible text on any browser lacking `background-clip:text`. |

Precondition: the element must NOT also paint a background on the same selector
(`background-clip:text` clips the whole background painting area to the glyph shapes). If both are
needed, move the background to `sgs_block_background_layer_css( string $selector, string
$paint_decl, string $hover_paint_decl = '' )` (`helpers-tokens.php`) — moves the background onto a
`::after` pseudo-element (not `::before`, which `sgs_border_gradient_css()` already owns on every
block this applies to). Blocks needing this precondition solved: any element declaring both a
`css:color*` and a genuinely separate `css:background*` member on the same
`supports.sgs.elements` entry — detected via
`scripts/inspector-scan/rules/31-golden-colour-control.js::textSharesElementWithBackground`
(reads the element manifest; never hand-derive a block list). Sizeable backlog (button, container,
hero, product-card, trust-bar, cta-section, info-box, more) — its own project, not a quick follow-up.

**Icon/SVG gradient where the icon's source can vary:**

`sgs_icon_gradient_css( string $iconSource, string $gradientCss, string $uniqueId, string
$selector ): array{defs,css,fallback_rule}` (`includes/helpers-svg-gradient.php`) — picks SVG
stroke-gradient for `lucide`/`wp-icon`, the text-gradient trio for `dashicon`/`emoji` (they render
a `<span>`, not `<svg>`). Never call `sgs_svg_stroke_gradient()` directly on a block whose icon
source can be `dashicon`/`emoji` — silent no-op. Open gap: a block whose repeated items each
declare their own icon source (`sgs/icon-list`) needs a per-item design, not a call-site swap.

**The bespoke custom-property pattern — block-private, not a shared helper:**

`sgs/option-picker`'s entire colour system (base/hover/selected/border, across outlined/filled/ghost
variants) emits `--sgs-op-*` custom-property VALUES in render.php, consumed by style.css's
per-variant rules via a `var(--sgs-op-bg-hover, var(--sgs-op-bg, <preset-default>))` fallback
chain. Use only when a block has multiple style variants sharing one colour concept with different
property combinations per variant — the helpers above assume one selector, one flat state set.
Every adopter hand-rolls its own `--sgs-x-*` chain; it does not support gradient without extra work
(a `var(--x, …)` chain feeding a fixed `background-color:` can't switch CSS property on whether
the value is a gradient).

**Decision table:**

| Element shape | Use |
|---|---|
| One selector, background AND/OR border AND/OR text colour, all flat-or-gradient except text | `sgs_button_element_style_css()` if genuinely button-shaped; otherwise compose `sgs_fill_decls()`/`sgs_text_decls()`/`sgs_border_states_css()` yourself |
| One selector, background/border only, no text | `sgs_fill_states_css()` and/or `sgs_border_states_css()` directly |
| One selector, text gradient needed, no background on that selector | `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` (mandatory companion) |
| One selector, text gradient needed AND a background too | Same as above, but move the background to `sgs_block_background_layer_css()` first |
| Multiple style variants, one colour concept, different properties per variant | The bespoke `--sgs-x-*` custom-property pattern (option-picker is the reference) |

## Touch-safe hover helpers — `includes/helpers-hover-state.php`

The ONE place a `:hover` rule is built — see the file's own docblock for the two-layer guard
model and why it exists (touchscreen sticky-hover).

| Function | Signature | Use when |
|---|---|---|
| `sgs_hover_state_rules()` | `( string $selector, string $decls, string $focus = ':focus-visible', string $suffix = '' ): string` | The default — you have a base selector and want the hover + focus pair built correctly. |
| `sgs_hover_guarded_rule()` | `( string $hover_selector, string $decls ): string` | You already hold `:hover` selectors and want just the guarded rule (emit focus separately, unguarded). |
| `sgs_hover_media_wrap()` | `( string $rule ): string` | You have a complete rule and need only layer 1 wrapped around it. |

Static `style.css` is a second surface these PHP helpers cannot reach — covered at build time by
`scripts/hover-guard/run-transform.js` (wraps motion-only `:hover` rules in both guards on compiled
CSS) + `check.js` (fails on any `:hover` rule it cannot classify confidently; scans both PHP
emitters and block CSS). Trust `check.js`'s output, not `src/**/style.css` (the transform runs on
build output, so source still reads unguarded — expected).

## Shadows — automatic, do not hand-roll

1. **Surface tone.** `helpers-surface-tone.php::sgs_surface_tone` judges a surface's painted
   layers; `SGS_Container_Wrapper`, `sgs/nav-drawer` and `sgs/mega-panel` add `sgs-on-dark`/
   `sgs-on-light`, and `helpers-shadow-dark.php` + `helpers-shadow-dark-css.php` swap every preset
   (and hover partner) for its dark variant inside a dark surface. Editor twin:
   `src/utils/surface-tone.js`, `surface-preview.js::wrapperToneClass`.
2. **Lift on hover (default ON).** Each preset's hover partner lives in
   `theme.json::settings.custom.shadowHover`; `helpers-shadow-hover.php::sgs_shadow_hover_value`
   resolves it and `::sgs_shadow_hover_rules` emits the touch-guarded rule. Switch off with block
   attribute `shadowLiftOnHover:false`, or `supports.sgs.shadowLift: false` (overlays: mega-panel,
   nav-drawer, modal, cart). Stylesheet shadows get their lift from `scripts/shadow-lift/` at
   postbuild, before the hover guard.

A new shadow colour must be the site colour (`color-mix(in srgb, var(--wp--custom--shadow-colour)
N%, transparent)`) or a palette colour, never a black literal. Gates:
`scripts/check-shadow-sources.py --check`, `scripts/shadow-lift/run.js --check`,
`scripts/shadow-fallback/run.js --check`, `scripts/check-shadow-fallback-php.py --check`.

`supports.sgs.hoverDefaults` (`{scalePreset, shadow, imageZoom, focusRing}`) only applies when the
block also opts into the universal hover panel. `focusRing` is near-inert on a non-focusable root
(`<div>`/`<section>` without `tabindex`) — don't treat it as a11y cover.

One hover-shadow control only: `src/components/ShadowLiftControls.js` (D1148) — never mount a
second.

## Scrims

A block that dims the viewport (drawer, dialog, lightbox, panel) declares `supports.sgs.scrim`
and calls `includes/helpers-scrim.php::sgs_scrim_render` — see that file's own docblock for the
full contract. Gate: `scripts/scrim/check-scrim.py --check`.

## Media atom scoping

Shared CSS atoms must scope per ELEMENT, not per block — atoms emit fixed custom-property names
(`--sgs-media-object-fit`) because the shared stylesheet is static CSS and cannot know a prefix.
Safe only when each media element carries its own scope class:
`sgs_media_element_scope_class( $uid, $prefix )` → `{uid}--{prefix}`, consumed by
`sgs_media_element_style()`. Without it a two-element block (`sgs/before-after`) sets the same
property twice on one scope and the second wins. A shared rule at (0,1,0) beats a block's own
`:where()` default at (0,0,0) — a shared fallback must be the value the surfaces actually measure
(`cover`), never `initial`/`unset`/`revert` (banned by `check-media-atom-purity.js`). Gated:
`scripts/tests/test-media-atom-parity.mjs`.
