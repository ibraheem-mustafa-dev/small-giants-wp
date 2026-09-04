# Visual diff — sgs/brand-strip — itemTextColourHover/itemBackgroundColourHover shared-selector fix — 2026-09-05

verdict: PASS
intent_capture_passed: true
source_sha: c7a07642d68860e9

Fixes a real shared-selector conflict on `.sgs-brand-strip__item:hover`, found during the
colour-conformance track's border-contrast wiring session (2026-09-04). An earlier dispatch
wired `itemTextColourHover`'s gradient sibling onto this selector assuming "the item tile
has no background of its own" — wrong: `style.css:407-409` paints `background-color` on the
exact same selector via `--sgs-tile-hover-bg` (itself falling back through `--sgs-tile-bg`
to the theme's `surface-alt` token). When the text colour resolves to a gradient,
`background-clip:text` on the shared selector was silently clipping that background too.

## What changed

`render.php` only — no `block.json` or `edit.js` change for this specific fix (the same
commit also carries this block's WCAG border-contrast wiring, an unrelated shape shared with
26 sibling blocks). When `sgs_resolve_text_colour_or_gradient( $hover_text_colour,
$hover_text_colour_gradient )` resolves to a value containing `gradient(`, the item hover
rule now: (1) sets `background-color:transparent` + `position:relative` + `isolation:isolate`
on `.sgs-brand-strip__item:hover`, (2) repaints the SAME resolved background value (the
existing `itemBackgroundColourHover` → `tileBackgroundColour` → `surface-alt` fallback chain,
unchanged) on a new `::after{inset:0;z-index:-1}` layer via `sgs_background_paint_decl()`.
When the resolved text value is flat (the common case — no gradient set), none of this fires;
the emitted CSS is byte-identical to before this fix.

## Assertions — stated before measuring

1. Gradient case: `.sgs-brand-strip__item:hover` gets `background-color:transparent`.
2. Gradient case: `.sgs-brand-strip__item:hover::after` gets a `background-color` painting
   the resolved fallback-chain value (`surface-alt` when no explicit hover/tile background is
   set).
3. Gradient case: `.sgs-brand-strip__item:hover` gets `background-image:<the gradient>` +
   `background-clip:text` + `color:transparent` (the existing, unmodified text-gradient
   mechanism).
4. Flat-colour case (no gradient set): `.sgs-brand-strip__item:hover` gets a plain
   `color:<hex>` declaration, unchanged from before this fix.
5. Flat-colour case: NO `::after` rule is emitted at all — confirms the new branch is
   gated correctly and doesn't fire for the common case.

## Results

Measured via `scripts/qa/assert-css-effect.js` — runs the block's real `render.php`
standalone (WordPress core stubbed, all SGS colour/gradient/border helpers loaded and
executed for real) against a given attribute set and asserts on the emitted `<style>` CSS.

| # | Assertion | Result |
|---|---|---|
| 1 | gradient case: `background-color:transparent` on `:hover` | **PASS** |
| 2 | gradient case: `::after` gets `background-color` (resolved `surface-alt` var) | **PASS** — matched `background-color: var(--wp--preset--color--surface-alt)` |
| 3 | gradient case: `background-image`/`background-clip:text`/`color:transparent` on `:hover` | **PASS** |
| 4 | flat case: `color:#123456` on `:hover`, unchanged shape | **PASS** |
| 5 | flat case: no `::after` background rule exists | **PASS** — `mustNotExist:true`, confirmed absent |

`npm run gate:fast` (89/89) was also run against the full uncommitted diff this fix shipped
alongside (the border-contrast wiring) and passed clean. `node scripts/hover-guard/check.js`
was run too — it reports the known, pre-existing 11 unresolved cross-file cases (documented
in `LEDGER.md`, none of them this selector) and 0 new findings; the new `::hover` rules this
fix adds are colour-only, which the checker's own documented scope excludes (Bean's standing
hover-guard tier-4 close-out already covers colour/gradient-fallback hover as closed).

## What is NOT verified — stated, not buried

**No live capture was taken and no deploy was run.** This report carries harness-level
evidence only — the real PHP execution path, run standalone, not a real browser painting a
real DOM element under a real pointer. Specifically unproven:

- that the `::after` layer actually paints visibly behind the text on a real page (the
  `z-index:-1` / `isolation:isolate` stacking reasoning is sound per the shared helper's own
  doc-comment precedent for the same technique on `sgs_block_background_layer_css()`, but not
  measured in a rendered browser);
- that the `@supports` fallback companion for browsers lacking `background-clip:text`
  behaves correctly here (the existing, unmodified fallback-rule call is reused verbatim, so
  this is inherited proof, not fresh);
- that the editor canvas preview matches the rendered result (this fix is `render.php`-only —
  `edit.js`'s preview path for this block was not touched and was not re-checked here).

Pay this debt with a live Playwright hover-state capture on the sandybrown canary — one
instance with `itemTextColourHoverGradient` set (confirm background repaints AND gradient
text shows), one negative-control instance with only a flat `itemTextColourHover` (confirm
byte-identical to pre-fix) — once this fix and its sibling border-contrast commit are both
committed and a deploy is safe.
