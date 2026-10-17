# Focus system: live verification, fourth run (768 and 375)

Canary sandybrown at commit a6abdc916 (blocks and theme, deployed 2026-10-17), Mama's ring #800d2f unchanged; probe fix a116dbb3f (no deploy needed). Serial, headless, --pause 3000, no 403s.

Fixture 5389 at 1440, 768 and 375: PASS, looks 1, min contrast 3.16 at each width, clipped 0, radius changed 0; unmeasurable only the skip link and the before-after range (probe limits). Home, shop, product and cart at 1440 and 375: home 6.66 / 6.66, shop 3.08 / 3.15, product 3.11 / 3.17, cart 9.40 / 9.40, clipped 0, 320 of 320 token matches; 768 on these four pages was not run.

- Text link at 375 (1.00): probe artefact. The link wraps onto two lines and the browser draws one ring per line, but the probe sampled the combined box. It now measures a wrapped inline link on its widest line: 10.41, 11.85, 8.74.
- Tab one at 375 (1.43, 1.06): below 768px the selected tab is a light surface-alt box but kept the dark-ground tokens. The mobile selected-tab rule now sets the light-ground tokens (new --sgs-focus-ring-on-light): 9.95 and 12.55.
- Testimonial track at 768 (2.20): on a dark photo, G2 painted the core and the hairline in the same cream. The new --sgs-focus-hairline token makes the hairline the opposite tone on G2 and signature stops (ink on dark, cream on light): 4.59 at 768, 5.75 at 375. Backed by a contract-test rule with its negative control and a probe check that fails a one-tone G2 stop; Spec 32 section 14.5 states it.
- Product card at 375 (1.00): probe artefact. The card is cut off by the related-products scroller, and the probe read the page beyond the cut. Points outside a clipping container now count as blocked: 10.41.
- Also: check-retired-blocks skips sites/<topic> design/ mockup folders (they were blocking the deploy build); the local fixture's section stop follows the primary-dark fallback; a page-load timeout is retried instead of aborting the run.
