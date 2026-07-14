---
verdict: PASS
first_paint_capture_passed: true
block: sgs/mobile-nav-toggle
change: add aria-controls to the toggle button (WCAG 4.1.2) — non-visual
date: 2026-07-14
decision: D335
site: palestine-lives (Indus) + sandybrown
---

# Visual-diff report — sgs/mobile-nav-toggle (D335)

## What changed
Added `aria-controls="sgs-mobile-nav"` to the toggle button's `get_block_wrapper_attributes()`,
using the same `$popover_target` value that already drives `popovertarget` (default
`sgs-mobile-nav`, the drawer's stable hardcoded id — `multiple:false`). This associates the
toggle with the disclosure it opens (WCAG 4.1.2). **Attribute-only, non-visual** — no markup,
class, layout, or style change; the button renders pixel-identical.

## Live verification (palestine-lives / Indus, 375px)
`getAttribute('aria-controls')` on the live toggle returns `"sgs-mobile-nav"` (matches the
drawer element's id). The toggle still opens the drawer (clicked live, drawer opened), and
`aria-expanded` still toggles. The D323 P0 re-parent-to-body behaviour is untouched.

## Verdict: PASS
Pure additive ARIA association; zero visual change; verified live. No regression.
