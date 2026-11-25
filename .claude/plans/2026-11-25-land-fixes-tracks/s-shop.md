# Track S (label s-shop; plan Task 15): the shop pieces MIC needs

Start from `main` once rf7 and rf8 have merged (the main session tells you). MIC's draft has a shop, and these shop items from the 2026-11-24 plan were never started (`i1-branches.out` rows rf7-shop-forms and rf8-plumbing, "Not started"). Evidence: `.claude/plans/2026-11-24-clone-root-fixes.md` RF7 and the Restore map's shop rows only. Each with a test that fails on main.

1. `part-look.mjs` becomes a run stage in `site-run.mjs` (the Restore map: "no shop is done without it"), so part-look mode rules reach Fill's output (wishlist hearts, brand overlays, saving badges: `data/part-look-modes.json`).
2. A template product card's `variantStyle`, and related-product cards.
3. The buy-box layout write (FR-48-60, `takeColumn`).

Done when: an offline Fill of `mamas-munches-redesign/shop,product` against `baseline-main` writes the part-look settings, the card's `variantStyle`, the related cards and the buy-box layout, with no surface worse.
