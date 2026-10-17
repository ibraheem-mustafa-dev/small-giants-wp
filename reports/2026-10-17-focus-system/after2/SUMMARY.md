# Focus system: live verification, second run

Canary sandybrown at commit 6d2ff6893 (blocks and theme, deployed 2026-10-17 12:24 UK, motion QA 8 of 8). Serial, read-only, headless. The first run is in `../after/SUMMARY.md`; fixture page 5389 was rebuilt from the corrected tree (`invalid: []`).

## Result against the first run (1440)

| Measure | First run | Second run |
|---|---|---|
| Looks on home, shop, product, cart | 2 (+ inset) | 1 (+ inset) |
| Radius changes on focus | 11 | 0 (three skip-link stops exempt by name) |
| Clipped stops | 6 | 1 |
| Fixture minimum contrast | 1.00 | 2.49 |
| Forced colours on the fixture | 93 of 94 | 94 of 95 |
| Token match | 478/478 | 162/162 main, 95/95 fixture |

## Spot checks

Editor probe passes. Page 5310 shows only the system outline and shadow. The buybox photo is `fetchpriority="high"` with `loading="eager"`. The pre-JS flash is 0 ms on draft 5291. A first-section grid's first photo is the only high-priority image. Draft 5291 has no section above its grid, so its cards keep opacity 1 by the LCP rule and the per-card fade could not be shown there; draft 5283 fades its grid container 0 to 1 over 30 distinct frame values.

## Open, each with its owner

- Shop price-slider thumbs (`input.min` 1.01, `input.max` 1.00) and the Brand filter summary (clipped by `.sgs-shop-filters__scroll`): the clip fix of `7795f592b` is deployed, so either it is incomplete for horizontal edge-flush controls or the probe measures the hidden thumb input. Owner: Spec 32 FR-32-22 done-when (the focus probe must report clipped 0 and no stop under 3:1 on the shop page); next step is one headed look at `/shop/` at 1440 with the thumb focused.
- Inset tab stops on a tinted tab fill ("Ingredients" 2.25, fixture "Tab one" 2.49): the inset ring sits inside the tab on its own fill; same FR-32-22 done-when.
- Title-link cards at 2.88 to 2.89 (three product cards): within 0.12 of the 3:1 line on the card edge; same done-when.
- Before-after range input in the probe: the handle paints a solid 2px ring (proved on the live page), the probe still reports the hidden input; probe artefact, same done-when.
- Per-card stagger on a products-mode grid with a section above: unproven live because no such page exists; build one TMP page when the next motion session needs it.

The probe commands are in `plugins/sgs-blocks/scripts/qa/probe-focus-system.mjs --help`; run the shop and fixture runs after any change to `focus.css`, the shop filters or the tabs.
