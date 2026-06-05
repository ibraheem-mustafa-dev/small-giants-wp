---
block: heading
date: 2026-06-05
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/heading typography-lift value nits — 2026-06-05

**Change:** two value-serialisation fixes to the converter typography lift + heading render:
1. Colour token: the lift wrapped the colour as `var:preset|color|text` which render.php's
   `sgs_colour_value()` mangled (stripped `:`/`|`) into `var(--wp--preset--color--varpresetcolortext)`.
   Fix: lift now passes the bare slug (`text`) → render produces `var(--wp--preset--color--text)`.
2. line-height: a unitless draft value got `px` appended (`line-height:1.15px`). Fix: lift writes
   a `unitless` sentinel unit; render.php emits a bare `line-height:1.15`.

CSS/markup output change on sgs/heading; no save() change (dynamic block).

## Live verification (canary page 144, after build+deploy + re-clone, cache-bust)

Hero H1 inline style:
`color:var(--wp--preset--color--text);font-size:58px;font-weight:700;line-height:1.15;letter-spacing:-1px`

| Check | Before | After | Verdict |
|---|---|---|---|
| Colour token | `var(--wp--preset--color--varpresetcolortext)` (broken) | `var(--wp--preset--color--text)` → computed rgb(58,46,38) | PASS |
| line-height | `1.15px` (invalid) | `1.15` unitless → computed 66.7px (58×1.15) | PASS |
| font-size (regression check) | 58px | 58px | PASS |
| Console errors | — | 0 | PASS |

**Result: PASS.** Both typography-lift value nits fixed; the hero headline colour resolves to
the brand text colour and line-height is a correct unitless ratio.
