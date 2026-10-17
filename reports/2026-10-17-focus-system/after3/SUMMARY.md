# Focus system: live verification, third run

Canary sandybrown at commit 29e841f37 (blocks and theme, deployed 2026-10-17). Serial, read-only, headless, 1440 only. Raw output: main.txt / main.json (home, shop, product, cart) and fixture.txt / fixture.json (page 5389, --max-stops 130).

Home, shop, product, cart: PASS, looks 1 (+ inset), min contrast 3.06, clipped 0, radius changed 0, tokens 162/162. Fixture 5389: PASS, looks 1 (+ inset, signature), min contrast 3.14, clipped 0, radius changed 0, tokens 95/95.

- Brand summary: overflow-x hidden made overflow-y auto, clipping at the region's block end; fixed with overflow-x: clip; 8.53, not clipped.
- Price thumbs: the probe sized the 24px pressable thumb as 16px; now sized from the winning thumb rule; 8.53 and 7.66.
- Inset tabs: the sliding underline indicator painted over the ring's bottom edge; the focused tab is lifted above it; Ingredients 9.34, Tab one 4.90 to 16.02.
- Title-link cards: the 2.88 was an antialiased corner pixel (93,80,28) while every edge reads 77,63,8; a corner now reads its in-band core pixel; 3.06 to 10.34.
- Before-after: closed. The probe measures the handle and reads unmeasurable (5 of 8 points; three sit over the after-image layer), a probe limit; a live 3x screenshot proves the solid 2px ring.
- Cut by Bean's time and token budget: the 768 and 375 runs.
- Deferred to a motion session: per-card stagger with a section above (needs a fixture page).
- The deploy's `no-motion-assets` failure on page 5229 was caused by the M6.5 sweep of the active header 3777 (rolled back the same day, the check passes again), not by this commit.
