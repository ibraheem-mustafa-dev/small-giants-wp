# Visual diff — sgs/product-card — 2026-09-10

verdict: PASS
first_paint_capture_passed: true
source_sha: 705d147f120e28e7

## What changed

`includes/helpers-typography.php::sgs_typography_css_rule()` — added an opt-in
`$inherit_font_family_when_blank` param (default `false`, every other caller
unchanged). When true and the relevant `*FontFamily` attribute is blank, the
helper now emits an explicit `font-family:inherit;` on the block's own scoped
selector instead of staying silent.

`src/blocks/product-card/render.php` — wired `true` for the `title` call only.

## Root cause

The scoped rule staying silent on a blank `titleFontFamily` meant it never
contested `font-family` at all — so WordPress's own un-scoped `theme.json`
global-styles rule (`h1,h2,h3,h4,h5,h6{font-family:var(--wp--preset--font-family--heading)}`)
was the only rule setting the property and won, even though the block's own
class selector carries higher specificity. A rule that never declares a
property cannot out-specificity one that does.

## First-paint capture — live canary, computed styles

Page: `https://sandybrown-nightingale-600381.hostingersite.com/?p=3448`
("[FRESH CLONE VERIFICATION] Mamas Munches Homepage Re-clone")

| Element | Before (pre-deploy) | After (post-deploy) | Expected |
|---|---|---|---|
| `.sgs-product-card__title` "Mama's Munches Zookies" (`<h3>`) | `Fraunces, serif` | **`Inter, sans-serif`** ✅ | body font (matches draft's plain, font-family-less title) |
| `.sgs-product-card__title` "The Trial Pack" (`<h3>`) | `Fraunces, serif` | **`Inter, sans-serif`** ✅ | body font |
| `document.body` | `Inter, sans-serif` | `Inter, sans-serif` | reference (unchanged) |

## Regression check — every other h1-h6 on the same page

The param is opt-in per caller (default `false`), so every OTHER
`sgs_typography_css_rule()` call site is byte-identical in output for a blank
`FontFamily`. Confirmed live rather than assumed: every other `<h1>`-`<h6>` on
the same page (16 instances, most with a blank `fontFamily` attribute —
`sgs/heading` "Oats", "Quick Links", "Contact", "A gift she'll actually use",
etc.) still resolves to `Fraunces, serif`, the intended heading-preset default.
Only the two opted-in `.sgs-product-card__title` elements changed.

Console: 0 errors, 0 warnings after deploy.

## Design note (not a defect, flagged for Bean)

WordPress's own `showFontFamily` picker labels the blank state "Default" and
documents it as "whatever the theme decides" (`TypographyControls.js`
`SGS_TYPOGRAPHY_DEFAULT_LABEL` comment, 2026-09-06 spec) — for a real heading
tag that correctly means "use the heading preset" for most callers
(`sgs/heading` itself relies on this). Product-card's `titleFontFamily` is
the documented exception (`block.json`: "Empty = inherit the theme's default
(body) font — the draft's title has no explicit font-family..."). Because
this is a genuine per-attribute design decision rather than a bug in the
general convention, the fix is scoped (opt-in param, one call site) rather
than a global default flip that would have silently changed every heading
block's default appearance framework-wide.
