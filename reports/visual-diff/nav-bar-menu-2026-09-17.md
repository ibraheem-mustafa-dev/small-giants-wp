# Visual diff — sgs/nav-bar-menu — 2026-09-17 (item separator: centred geometry + resting-state visibility)

verdict: PASS
first_paint_capture_passed: true
source_sha: da4afb499fc65487
commit_sha: (this commit — D1086)

## Assertions (stated before measuring, from Bean's report)

1. Separator should be centred between the two menu items it sits between, not flush against
   one item's edge.
2. Separator should be visible in the normal (resting) state and only change colour in a
   special state (hover/focus) — not read as though it only exists for hover.
3. Separator should appear between every pair of neighbouring items (visually "on both sides"
   of a middle item) but not on the outer edge of the first or last item.

## Live result — real canary (`sites/mamas-munches`), computed values read from the DOM

Verified via `chrome-devtools` MCP at 1440px against the live homepage's site-header nav bar
(5 items: Shop / Our Story / Send to Ward / Gift Ideas / FAQs), `gap: 28px`.

### BEFORE (root-cause measurement, pre-fix)

| Item | `itemRect` (left/right) | Separator mechanism | Position |
|---|---|---|---|
| 0 (Shop) | 392.1 / 456.2 | `border-right` on `.link`, flush at 456.2 | Touches item 0's own edge, 28px of empty gap to its right before item 1 starts — NOT centred |
| 4 (FAQs, last) | 933.6 / 996.8 | none (`:not(:last-child)` correctly excluded it) | n/a |

Resting colour: `border-light` (`rgb(229,231,235)`) against the real header background
`rgb(251,243,220)` — computed contrast ratio ≈ **1.12:1** (WCAG requires 3:1 for UI-component
borders). Technically always painted (confirmed no `:hover`-only gating in the compiled CSS —
the rule that changes colour on hover is a genuine `:hover`/`:focus-visible` state change, not
a visibility toggle) — but at this contrast it reads as invisible until the bold accent hover
colour lands, which is exactly the "looks hover-only" symptom Bean reported.

### AFTER (this fix)

| Item | `itemRect` (left/right) | `::before` present | `left` offset | Border |
|---|---|---|---|---|
| 0 (Shop, first) | 393.4 / 456.6 | **none** | — | — |
| 1 (Our Story) | 484.6 / 625.0 | yes | `-14px` | `1px solid rgb(107,92,80)` |
| 2 (Send to Ward) | 653.0 / 779.0 | yes | `-14px` | `1px solid rgb(107,92,80)` |
| 3 (Gift Ideas) | 807.0 / 902.9 | yes | `-14px` | `1px solid rgb(107,92,80)` |
| 4 (FAQs, last) | 930.9 / 994.1 | yes | `-14px` | `1px solid rgb(107,92,80)` |

`-14px` = exactly half of the confirmed `28px` bar `gap` — the pseudo sits at the mathematical
midpoint between each pair of adjacent items (item 0's right edge 456.6 + 14 = 470.6 = item 1's
left edge 484.6 − 14). First item correctly has no separator to its outer-left; nothing paints
to the outer-right of the last item either (no `::after` was added). Resting colour
`rgb(107,92,80)` (this client's resolved `text-muted` token) against the same header background
computes to ≈ **5.8:1 contrast** — a genuine WCAG pass, visibly present at rest in the
screenshot capture (`nav-bar-menu-2026-09-17-screenshot.png`, viewport capture of the live
header, not persisted to the repo).

| Assertion | Result |
|---|---|
| Centred in the gap | **Confirmed** — `left:-14px` against a measured `28px` gap |
| Visible at rest, changes on special state | **Confirmed** — resting contrast raised from ~1.12:1 to ~5.8:1; hover/focus colour swap to `accent` unchanged and still present (`:hover`/`:focus-within`, media-guarded for touch) |
| Both-sides topology, none on outer edges | **Confirmed** — exactly one separator per gap (4 for 5 items, same count as before), none on item 0's outer-left or item 4's outer-right |

## What was wrong before, and how it was found

The separator was built by porting the drawer's row-separator pattern (a border a row "owns")
directly onto the horizontal bar without re-deriving the geometry for a two-sided gap — this
produced a flush, one-sided line instead of a centred, shared one. The resting-colour
invisibility was a genuine contrast defect in the shipped default (`border-light`), not a
misconfiguration on this client's site — confirmed by checking the schema default in
`block.json`, which every un-overridden instance inherits.
