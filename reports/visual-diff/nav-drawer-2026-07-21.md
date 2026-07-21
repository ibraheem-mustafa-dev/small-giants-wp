---
block: nav-drawer
date: 2026-07-21
verdict: PASS
first_paint_capture_passed: true
target: sandybrown-nightingale-600381.hostingersite.com
change: "Spec 35 manifest only (no state attrs exist)"
---

# nav-drawer manifest — visual verification

## What changed
MANIFEST ONLY. nav-drawer has 11 attributes and ZERO state-ish attrs, so no states were
declared and no base attrs were added — no speculative attributes invented.
3 elements: `dialog` (OUTER, isWrapper), `body` (GRID), `close`.
No style.css / render.php / edit.js change: block.json only.

## Deploy provenance
- Isolated worktree `C:/tmp/sgs-nv` at scratch SHA `b03b2c31`.
- `build-deploy.py --target sandybrown --blocks-only --skip-build`, exit 0.
- CHECKSUM proof local == server for build/blocks/nav-drawer/style-index.css.

## Results
- `drawerBg` REGISTERED live (61 attrs total).
- nav-drawer linter: 10 OK / 61 GAP / 0 ORPHAN of 71 checked. ORPHAN staying at 0 confirms
  no attribute went undeclared.
- Live homepage renders unchanged; console errors 0.

## Verdict
PASS. Metadata-only change; nothing renders differently.

## LOGGED, NOT FIXED — uncontrollable styling found
Two rules have no attribute behind them, so a client cannot restyle either:
- `.sgs-nav-drawer__close:hover { opacity: 0.75 }` (style.css:90-92)
- `.sgs-nav-drawer__close:focus-visible { outline: 2px solid currentColor }` (style.css:94-97)
No `states` block was declared for `close` as a result. The focus-visible outline is a
standard a11y default and arguably correct as-is; the hover opacity is a real gap.

## Linter behaviour worth knowing
`nativeSupportsPath` is only evaluated when `element.isWrapper` is true
(check-element-manifest-conformance.js:158). The `dialog` element needed `isWrapper: true`
to resolve its border members off the skip-serialised `__experimentalBorder` support.
