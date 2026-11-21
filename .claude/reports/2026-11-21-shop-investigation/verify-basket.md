# Basket findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against `wt-tr-push` at `28a8c2cde` and the lab. Saved here by the main session because the checker had no Write tool; its words, lightly shortened.

Counts: 10 confirmed, 5 corrected, 0 wrong, 0 unverifiable. The two predictions (basket-3, basket-10) were not checkable at 21:47: no `-pl-header.log` for either client, and `mamas-munches-redesign-pl-cart.log` had no `exit=` line.

New fact the findings file missed (unchecked): the Eye Care copy's header (post 137 on `local-mediatest-trec`, which holds the drawer's `sgs/cart`) was last saved 2026-10-28 07:09, so the drawer settings in basket-1, 4, 11 and 15 come from an older build. The header is built by the general session's header work, not by the shop surfaces rebuilt tonight.

## Per finding

- basket-1: corrected. Cause right (`cart/block.json` `panelBg` defaults to `base`; no client snapshot or the theme defines `base`; the colour falls back to `currentColor`). The fix points at the wrong file: the `::after` layer is printed in `plugins/sgs-blocks/src/blocks/cart/render-scoped-css.php` (the `$has_panel` branch), and the `currentColor` fallback is `includes/helpers-tokens.php::sgs_colour_value`, which every block uses. Not size S: it changes what every site without a saved `panelBg` renders, so render-scope is needed.
- basket-2: confirmed (the Taster Trio button is `Root/20#0`, not `Root/19#0`).
- basket-3: corrected, minor: the draft's `pages` map holds `{account: ...}` but no checkout entry, so `linksTo: checkout` still never matches. Values as stated.
- basket-4: confirmed. The copy's 15 drawer settings are from the old header; the cause is today's code.
- basket-5: confirmed.
- basket-6: confirmed (two small reasons without a cause bullet: `sgsSummaryHeadingLineHeight`, `sgsItemCellPadding`).
- basket-7: confirmed; the item-card column fix changes every site's basket page and needs a render-scope check.
- basket-8: confirmed; settled by Bean's ruling (a page the draft does not draw keeps WooCommerce's default; name the gap in the report).
- basket-9: confirmed.
- basket-10: confirmed.
- basket-11: corrected, minor: the code cause in `carryCustomCssScope` is confirmed, but the Eye Care symptom comes from the old header; `d3a112314` (today) writes the root row's padding to the trigger, so reproduce on a fresh header first. Latent shared-code bug.
- basket-12: corrected: the route already has the rule (`lib/apply-chrome-heading.mjs::headingLevel`, since `5d7bceaf7`); `site-run.mjs` skips the apply stage for templates. Fix: run that rule for templates, not a new rule.
- basket-13: confirmed (16 rules, 1645 bytes).
- basket-14: confirmed (33 rules).
- basket-15: corrected, minor: bullet 4 (Eye Care's white BAG text at 375) is already fixed on main by `3f7e7ed2d`; bullet 3: `item-row-template.js` also hides "Add my prescription" when the line is already configured.

## Shared causes

basket-3, 4 and 10 (the drawer's locators first); basket-10's `statedSize` and basket-6's `sgsButtonMinHeight` (one change); basket-10's close size and basket-13's close bullet; basket-7 and 14 (stepper type, summary title, item columns); basket-2 and 5 (`Root/12#0`); basket-1 and 3 (the missing `panelBg` read).

## New, unchecked

The Eye Care header's build date above; `part-look-compare` reports a non-px size as "the draft shows no element", which hides the real reason.
