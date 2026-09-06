# Visual diff — sgs/multi-button — 2026-08-30

verdict: PASS
intent_capture_passed: true
source_sha: e25e793ff5cc6cb0

## What changed

Added `childBtnBorderWidth`/`childBtnBorderStyle` group-default attrs and mounted
`SgsBorderControl` on the "Button group defaults" panel, alongside the pre-existing
`childBtnBorderColour`. Both new attrs default to `{}`/`''` (no override), matching this
block's own `childBtn*` group-default convention.

## Live result — canary, computed styles + screenshot

Committed at `51be3c847`, deployed to sandybrown same session. Two live checks on the
real canary (`sandybrown-nightingale-600381.hostingersite.com`), via Chrome DevTools MCP:

1. **No-regression check** — the homepage's live multi-button ("Shop Zookies" / "Try 3
   for £5", page 2742) and the `tc-multibutton-margin-probe` fixture (page 1473), neither
   of which sets the new attrs, both still compute `border-width: 2px`, `border-style:
   solid` on their primary/secondary preset buttons after deploy — byte-identical to
   pre-change behaviour. Screenshot: `multi-button-homepage-no-regression.png`.
2. **New capability check** — a disposable probe page (created, verified, deleted same
   session) with `childBtnBorderWidth:{top,right,bottom,left:"3px"}`,
   `childBtnBorderStyle:"dashed"`, `childBtnBorderColour:"primary"` and one
   `inheritStyle:"custom"` (preset-less) child button computed `border-width: 3px`,
   `border-style: dashed`, `border-color: rgb(230, 138, 149)` (the theme's resolved
   primary token) — the group default painting exactly as configured. Screenshot:
   `multi-button-border-after.png`.

## Why before/after doesn't apply

The new attrs default to empty, so there is no existing page whose "before" state
differs from its "after" state — check 1 above IS the before/after comparison, run
against real pre-existing content rather than a synthetic pair.

## Risk

The consuming CSS rule lives in `sgs/button`'s own stylesheet, not this block's — see
`reports/visual-diff/button-2026-08-30.md` for the specificity analysis (a same-file
scoped rule was tried first and was found to silently override every button preset's
border; the shipped version uses `:where(.sgs-multi-button)` so it cannot).

## Gates

`npm run gate:list` fast tier: 73/73 PASS (incl. `check-border-style-without-width`,
`check-dead-controls`, `survey-border-control-migration`) · `npm run gate:full`: 4/4 PASS
· `phpcs --standard=WordPress`: clean · `build-deploy.py --target sandybrown`: deployed,
payload-verify PASS (83/83 block.json match), 3/3 live motion probes PASS.
