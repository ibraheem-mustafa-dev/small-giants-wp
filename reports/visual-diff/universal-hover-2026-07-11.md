---
verdict: PASS
first_paint_capture_passed: true
block: sgs/button (+ 17 blocks hover-attr rename)
change: D309 universal hover — converter routes draft :hover → {attr}Hover
date: 2026-07-11
page: sandybrown page 8 (reclone …194242)
---

# Visual-diff — D309 universal hover

## What changed
- 17 blocks: hover attrs renamed prefix→suffix (`hoverX` → `Xhover`). Pure rename,
  byte-identical render output (logic-only) — verified by the build's dead-control
  gate (0 net-new) + no visual change by construction.
- Converter: a draft `:hover` declaration now transfers to the block's `{attr}Hover`
  companion (previously silently dropped by the CSS collector).

## Live verification (sandybrown page 8, CDN + OPcache cleared)
**Target:** the announcement "Find out more" link (`a[href*=send-to-ward]` → `sgs/button`).

| State | Computed `text-decoration` | Source rule |
|-------|----------------------------|-------------|
| Rest | `none` ✓ | base link reset transfers (`textDecoration:none`) |
| Hover | `underline` ✓ | `.sgs-btn-981f0b7a.sgs-button:hover, …:focus-visible { text-decoration: underline }` |
| Focus-visible | `underline` ✓ | same combined rule (WCAG parity preserved — Part G deferred) |

Emitted clone attrs: `"textDecoration":"none","textDecorationHover":"underline"` — faithful
to the draft (`.sgs-announcement-bar--send-to-ward a{…}` no underline; `a:hover{text-decoration:underline}`).

## Responsive
Hover text-decoration is NOT responsive (single rule, no `@media`) → identical at
375/768/1440. No per-breakpoint variance to capture.

## Gates
- Converter suite: 448 pass (445 + 3 new `test_hover_state_lift.py`), 1 skip.
- Build: dead-control 0 net-new, control-ux clean, webpack OK.
- F5/F6 + cheat-gate: 0 NEW violations.

## Regression guard
`converter/tests/test_hover_state_lift.py` — the headline on the real path +
the collector fall-through-trap isolation + the selector-stripper shapes.
