---
block: container
date: 2026-05-30
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/container (Spec 23 B2 + B3 neutral defaults)

## Change
B2: gap + maxWidth default to '' (emit only when set). B3: layout default '' (no
`--stack`/`--{layout}` class unless set). Neutral-default container per Spec 23
(WP core flow-layout + GenerateBlocks gold standard: unset = no CSS).

## Measurement (Mama's page 144, per-section pixel-diff, 3 viewports)
- B2 alone vs baseline 59.83%: mean 59.73% (-0.10pp) — flat, no regression. Only
  affects section-level containers; verified live (zero `sgs-container--stack`,
  zero `sgs-container--width-wide` on the deployed page).
- first-paint: FR-22-7 wait_fonts gate PASS (27/27 cells wait_fonts=true).

## Verdict
PASS — the container neutral-default change introduces no pixel-diff regression.
(The social-proof +18.6pp is an independent A1-walker + pre-existing
testimonial-slider hybrid issue, NOT the container block — see decisions.md D114.)
