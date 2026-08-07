---
block: sgs/product-faq
date: 2026-08-07
verdict: PASS
first_paint_capture_passed: true
first_paint_capture_run: true
capture_method: chrome-devtools-mcp against the live sandybrown canary (Playwright reserved for a co-active session)
deployed_build: deploy 2026-08-07, deployed files md5-verified against local build
change: Rest-state guard on the <summary> question deleted; the question inherits the identical value.
---

## Live measurement
Page /sgs-f2-faq-acceptance/. AT REST (details closed): .sgs-product-faq-item__question computes rgb(58,46,38) on rgb(251,243,220) = **11.86:1**. Its parent DETAILS computes rgb(58,46,38) — the exact value the deleted rule was forcing, so the deletion is provably equivalent.

## Negative control
Measured BOTH states. With details force-opened the question reads 2.38:1 — but that is the deliberate '[open]' brand-highlight rule (.sgs-product-faq-item[open] > .sgs-product-faq-item__question -> primary), which FW3 never touched. Recording it so a future sweep that force-opens details does not misread it as a regression. Separately .sgs-product-faq__heading reads 2.25:1 — the theme's own heading colour (primary) on cream, on a selector FW3 did not touch.
