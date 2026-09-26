# Live verification: header and footer furniture (Wave 3C U-12, M-18), 2026-09-26

verdict: PASS
intent_capture_passed: true
source_commits: 58585c959 (button link sources), 97a976fb7 (local-time), 710317436 (audio toggle), 9318daba0 (wishlist), 74f7c6862 (language-switch), fcb58efe2 (store-selector), 4a84375a6 (dark palette + theme-toggle), 0c56cf54b and 0c4be584c (per-tier toggles, icon names), f39e66310, 75d2ac8e6, da1f72118, 733e698f1 (live-check fixes), b52dd0474 (dark pairs)
source_sha: not computed. `plugins/sgs-blocks/scripts/visual-report-sha.py` hashes files staged for a commit in progress (it served the commit-time visual gate, no longer in `.githooks/`), so it cannot bind a report to committed code; the source commits above identify the verified code instead.
design: `.claude/reports/2026-09-26-u12-furniture-design.md`
blocks: local-time, language-switch, store-selector, theme-toggle, wishlist-link, wishlist-panel, button, audio, product-search, product-card

## Environment and method
- Site: sandybrown (Mama's Munches palette), deployed with `build-deploy.py --target sandybrown` (last lane C deploy after 733e698f1; payload verified, 94 of 94 block.json checksums).
- Fixture pages built through the real editor with `scripts/wp-build-page.js` (every block valid and unchanged on reload, which is the editor round-trip for every setting in the trees): 4070 `/qa-furniture/`, 4074 `/qa-wishlist/`. Trees: `plugins/sgs-blocks/scripts/nav-qa/lane-c/`.
- One headed Chrome window (chrome-devtools), pages fully loaded, `getBoundingClientRect` and `getComputedStyle`; axe-core 4.10.2 run in the page (the headless `axe-run.mjs` was served Hostinger's bot-check page, so its results were discarded as vacuous).

## Results
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Clocks (buck, studionamma cells) | PASS | LA -07:00, NY -04:00, SYD +10:00, AMS +02:00, LDN +01:00, PARIS `05:01:52` (h23, seconds, two-digit hours after f39e66310); no `aria-live`, no `role` |
| 2 | Language switch (dogstudio, lamalama, studionamma) | PASS | inline codes with autonym names, disclosure, single link "Site en Français"; `lang`/`hreflang` en, nl, fr; `aria-current` on English; links in the text colour `rgb(58,46,38)` |
| 3 | Store selector (away) | PASS | opens, list shown; Escape closes and returns focus to the button |
| 4 | Up button (lusion) | PASS | 54x54 at 1440, 45x45 at 375, radius 50%; back-to-top lands focus on `main` |
| 5 | Theme toggle (studionamma) | PASS | `data-theme` light to dark, surface `#fbf3dc` to `#171103`, `aria-pressed` true, choice stored, radio group synced; icon-only at 375 with the accessible name "Dark mode"; every target at least 44x44 |
| 6 | Account link (away, butcherbox) | PASS | `/my-account/` |
| 7 | Wishlist (away) | PASS | hearts update the header badge ("Wishlist, 2 items") across bundles; the panel adds and removes rows live; variable products show the product page link; out of stock shows Notify me |
| 8 | Save for later on the WooCommerce basket | PASS | a button on each of 2 rows; clicking moved the item to the wishlist and out of the basket (2 rows to 1) |
| 9 | Sound toggle (lusion, resn) | PASS | 44x44 "Sound", no autoplay; plays, `aria-pressed`, stores on/off, fires `sgs-sound-change`, mutes other media when off |
| 10 | No horizontal overflow at 375 | PASS | page width 375 |
| 11 | axe (WCAG 2.1 AA) | PASS | 0 violations on `/qa-furniture/` and `/qa-wishlist/` (after f39e66310, da1f72118, 733e698f1) |

## Defects found and fixed during this check
- A typed hook parameter fatalled every media upload site-wide (039bd248d).
- 24-hour clock without two-digit hours; icon-only toggle 21.4px wide; wishlist rows not refreshing; Move to basket failing for products with options; an unnamed duplicate thumbnail link; brand-pink links and a fixed button pair below 4.5:1; the audio block's controls inside an `aria-hidden` slot (every player style, not only the toggle); product-card swatch labels on plain spans.

## Recorded divergences and residue
- The dark palette works (verified with a temporary snapshot, since rolled back), but Mama's Munches cannot enable it until Bean hand-sets four colours: the derivation fails closed on text, text-inverse, primary-text and accent-text.
- Follow-ups: Polylang/WPML as a language-list source; wishlist share-by-link and price-drop alerts; dynamic nav menu items; product search across pages and posts.
