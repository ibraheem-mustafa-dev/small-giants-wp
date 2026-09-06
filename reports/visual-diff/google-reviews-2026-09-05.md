# Visual diff — sgs/google-reviews — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: e5e17fcf2581bc25

## What changed

New `starColourGradient` sibling attribute to the existing flat `starColour`. `render.php`
resolves it via `sgs_svg_stroke_gradient( $gr_star_colour_gradient, $gr_uid . '-star-grad', 'fill' )`
(the SVG-native gradient primitive, since stars are fill-based, not stroke-based like icon
glyphs). When set and valid this emits an SVG `<defs><linearGradient>…</linearGradient></defs>`,
injected once into the first rendered star (aggregate rating + every per-review rating share the
same `<defs>` via a static dedup map in `sgs_render_stars_svg()`, since `url(#id)` resolves
document-wide), plus a scoped CSS rule `.{uid}.wp-block-sgs-google-reviews
.sgs-google-reviews__star--full{fill:url(#{uid}-star-grad);}`.

## 1. Assertions (stated before measuring)

- **A (gradient UNSET):** `.sgs-google-reviews__star--full` renders its existing solid flat fill
  unchanged, no `<defs>` gradient anywhere in the DOM, no matching CSS rule in the block's scoped
  stylesheet.
- **B (gradient SET):** the star SVG's `fill` resolves to `url(#…)` pointing at a real
  `<linearGradient>` in a `<defs>` block that exists in the rendered markup, and a scoped CSS rule
  paints `.sgs-google-reviews__star--full{fill:url(#…)}`.

## 2. Live result

Live canary (sandybrown), scratch page 3296, two side-by-side block instances
(`className: test-gr-unset` / `test-gr-set`, `starColourGradient:
"linear-gradient(90deg,#ff0000 0%,#0000ff 100%)"` on the SET instance only).

| Instance | uid | `<defs>` in DOM | Scoped CSS rule |
|---|---|---|---|
| UNSET (`test-gr-unset`) | `sgs-gr-1b44b544` | absent | absent |
| SET (`test-gr-set`) | `sgs-gr-43915cba` | `<defs><linearGradient id="sgs-gr-43915cba-star-grad" …><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient></defs>` present on the first full star | `.sgs-gr-43915cba.wp-block-sgs-google-reviews .sgs-google-reviews__star--full{fill:url(#sgs-gr-43915cba-star-grad);}` present |

Both results measured against the block's own lifted stylesheet (`/wp-content/uploads/sgs-css/
sgs-3116-c0c2df3552965b0ad9ffca2843b5855f.css` — SGS block CSS is lifted out of the page HTML into
a shared per-request file, not inlined; confirmed present/absent by grepping that file, not the
page source). Both assertions hold exactly as stated: **PASS**.

## 3. Why before/after doesn't apply

`starColourGradient` is a brand-new attribute with no prior code path — there is no "before" state
that rendered anything gradient-related to diff against. The UNSET instance IS the before-state
control (byte-identical star fill behaviour to the pre-change block), captured live in the same
pass as the SET instance, which is the more informative comparison for a new isolated capability.

## Verification method note

Playwright MCP's browser was locked by a concurrent session for the duration of this verification
(`Error: Browser is already in use`), so this capture used direct HTTP fetch of the live rendered
HTML + the lifted CSS file rather than `getComputedStyle()`. This is adequate for the specific
claim being verified — presence/absence of a literal, non-inherited, block-scoped `fill:url(#…)`
declaration and its matching `<defs>` — which is a source-level fact, not a cascade-resolution
question `measurement-vs-eye.md`'s inherited-value trap would apply to.
