---
doc_type: reference
title: "Visual-diff / LANDED report — sgs/option-picker tick reservation (page-8 Fix 7)"
block: sgs/option-picker
date: 2026-07-11
wave: "page-8 discrepancy programme — Fix 7"
verdict: PASS
first_paint_capture_passed: true
---

# sgs/option-picker — selection tick no longer reserves width (LANDED)

**Verdict: PASS.** The WCAG selection tick (`.sgs-option-picker__pill::before`) was an
in-flow `display:inline-block` element reserving ~7px on every pill (selected or not), so
unselected pills were wider than the draft's tight pills and there was reserved blank space
on the left. Bean-directed: keep the tick (WCAG), but stop unselected pills reserving it.
Fix: `::before` → `position:absolute` (out of flow, `left:0.7em`, vertically centred), and
`.sgs-option-picker__pill` → `position:relative` anchor. No layout shift on select (pill
width identical selected/unselected).

## Evidence (live sandybrown page 8, all breakpoints)
- **1440:** `::before` computed `position = absolute`; pill widths dropped from
  `[96.3, 100.8, 104.0, 104.5]` (reserved tick space) → `[85.1, 89.6, 92.8, 93.4]` (no reservation).
- **375:** `::before` computed `position = absolute` (holds at mobile).
- Verified with browser-cache bypassed (the ?ver=0.1.9 block CSS was cached from earlier
  tracing visits; served CSS via `fetch(no-store)` confirmed `position:absolute` at origin).
- Draft target: `.sgs-product-card__pill { padding:7px 13px }` with no tick — pills now tight,
  tick present on selected via the existing `:checked ~ .pill::before` reveal rules (unchanged).

## Files
- `plugins/sgs-blocks/src/blocks/option-picker/style.css` — `.sgs-option-picker__pill` position:relative;
  `.sgs-option-picker__pill::before` position:absolute + comment update.
