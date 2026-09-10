# Visual diff — sgs/product-card — 2026-09-10 (correction)

verdict: PASS
intent_capture_passed: true
source_sha: fdf1c668c4c2ae0e

## What changed

Reverts the opt-in `$inherit_font_family_when_blank=true` wired for the `title`
typography call in `src/blocks/product-card/render.php` (shipped earlier today,
`e1d6f1eb2`) back to the helper's plain default (no opt-in). Also corrects
`block.json`'s `titleFontFamily` description, which pre-dates this session
(2026-08-27) and was never checked against the actual draft CSS.

## Root cause of the correction

The earlier fix flagged its own assumption for review ("Design note... flagged
for Bean") but shipped on the block.json description's authority rather than
checking the draft. Read directly: `sites/mamas-munches/mockups/homepage/index.html:37`
declares a global `h1, h2, h3 { font-family: 'Fraunces', serif }` rule, and the
product card's own `.sgs-product-card h3` rule (`:398-403`, size/weight/colour/
margin only) never overrides `font-family`. A blank title font-family therefore
correctly falls through to Fraunces — same as every other heading-tagged block
on the site already gets from theme.json's heading preset. The prior fix's
"body font" target value was itself wrong, not just its mechanism.

## Live verification — computed styles + genuine glyph rendering

Page: `https://sandybrown-nightingale-600381.hostingersite.com/?p=3448`

| Element | Before (this morning's fix) | After (this correction) | Draft target |
|---|---|---|---|
| `.sgs-product-card__title` "Mama's Munches Zookies" (`<h3>`) | `Inter, sans-serif` | **`Fraunces, serif`** ✅ | Fraunces (global h1-h3 rule) |
| `.sgs-product-card__title` "The Trial Pack" (`<h3>`) | `Inter, sans-serif` | **`Fraunces, serif`** ✅ | Fraunces |
| `font-weight` (both) | 500 | 500 (unaffected) | 500 |

Confirmed the browser is genuinely painting Fraunces glyphs, not just declaring
the CSS: `document.fonts.check('500 20px Fraunces')` → `true`; canvas
glyph-width sampling of the same string returns a distinct width for the
`Fraunces, serif` stack (382.65px) versus both the Inter fallback (391.27px)
and the generic-serif fallback (333.37px) — a font-loading masquerade would
have shown the Inter or generic-serif width instead.

Console: 0 errors after deploy.

## Regression check

Only the `title` call's opt-in flag was touched; `price`/`desc` calls on the
same block were already unaffected. No other block's typography call site was
changed.
