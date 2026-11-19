# Lab run checklist for the special surfaces (2026-11-19)

What the live lab run must check for template-rework Tasks 4, 7 and 10 (`.claude/plans/2026-11-18-template-rework.md`), written by the helpers that built each piece offline. Nothing here has been run live yet.

## The lab copy

`local-mediatest-trlab` (http://localhost:8121) is a scratch copy of `local-mamas` made on 2026-11-19. It was made before `scratch-mirror.sh create` gave a copy its own application password: run `scratch-mirror.sh secrets local-mediatest-trlab` from a current checkout first.

The strip step makes it blank for the shop surfaces: `SGS_LOOK_ATTRS=/mnt/e/sgs-tmp/template-rework/lab/look-attrs.json wp eval-file /mnt/e/sgs-tmp/template-rework/lab/strip-shop.php [dry]` in `/var/www/local-mediatest-trlab`. It refuses any folder that is not a scratch copy. Its dry run on 2026-11-19 lists what the route has to replace: 10 hand-built template copies (404, search, product-search-results, taxonomy-product_attribute, order-confirmation, cart, checkout, single-product, archive-product and the checkout-header part), 397 hand-set look settings (104 on the Cart block, 154 on the Checkout block, 139 on the account block) and 33,982 characters of Custom CSS on those three pages. The gift card's own product template (post 346) is left in place.

Run one site run at a time with `--jobs 1`. The run needs a worktree at `main` with the wiring applied, `npm ci` in `scripts/computed-route`, the calibration cache and the gitignored intake files copied in (never linked).

## Shop look settings (Task 4)

1. `node scripts/computed-route/part-look.mjs --client mamas-munches-redesign --site local-mediatest-trlab --write` after the strip, then the same with `--compare` against `local-mediatest-partlook` (the untouched copy, port 8120).
2. Open the basket (filled and empty), the checkout and the account page at 375, 768 and 1440 beside the draft. Expect the 10 values that land on a setting known not to paint to show no effect, and every look in the report's "no setting" list to be missing.

## Order confirmation (Task 7)

1. Rerun intake for the client so the confirmation's record gets its skeleton, then `node scripts/computed-route/manifest.mjs mamas-munches-redesign --site local-mediatest-trlab --only template-order-confirmation --apply`. The entry must show `copy.from: "fill"` and an `intakeSurface`.
2. `node scripts/computed-route/site-run.mjs mamas-munches-redesign --site local-mediatest-trlab --only template-order-confirmation --jobs 1`. The proposal's `templatePieces` must list the placed pieces.
3. On a test order's received page with a valid `key`: the hero reads "Order <number>. We've emailed…"; `sgs/order-items` shows the items with thumbnail, options line and a "Paid" total equal to the order total; a non-gift order shows the Taster Trio upsell and no note card; a gift order shows "Dear <name>," and the message and no upsell; a guest sees "Create an account"; the signed-in owner sees "View order" linking to the account's view-order address.
4. The same page with a wrong `key`: the hero's order paragraph is hidden, `sgs/order-items` prints nothing, and no bound block shows the draft's sample words.
5. Known to be static until a source exists: the bake date, the arrival date, the step line that repeats the bake date, and the eyebrow that changes when an account was created at checkout. Neither Mama's nor Eye Care's draft draws an address, so none is expected.

## Product page and shop listing (Task 7)

1. `node scripts/computed-route/skeleton.mjs propose --client mamas-munches-redesign --surface product`, then `--surface shop`. Confirm `proposal.templatePieces` and that the paint gate accepts `sgs/buybox` on the copy.
2. Run Fill, build and the template copy for both surfaces.
3. Product: an add to basket from the cloned product page reaches the basket and the chosen options show in the basket line; the title and description change per product (open two); the buy box's gallery shows each product's own pictures.
4. Shop: each sort option reorders the listing (default, price up, price down) with `?orderby=` in the address; the results count matches the number of products, also after a filter; the count and the sorting sit above the grid at 375, 768 and 1440.
5. Eye Care: its committed product and shop skeletons were read from an older draft than its `shop-parts.json` (the element numbers differ by two), so both pieces refuse it. Read both inventories again from the current draft, propose, then check the same items.

## Forms, modals and flows (Task 10)

1. On a fresh scratch copy of `local-mamas` and of `local-eye-care`, with the 13 commits of `feature/tr-forms-flows` applied: rerun intake so `intake.json` and `page-map.json` carry `opens`, then `node scripts/computed-route/site-run.mjs <client> --site <copy> --jobs 1`, then `node scripts/computed-route/site-build.mjs <client> --site <copy> --apply`.
2. Eye Care: each of the 7 openers opens its target. The nav drawer's and the mega menu's size-guide items are expected to fail (not built). "Add my prescription" opens a full-screen `sgs/modal` holding the lens flow; check whether the buy box still shows its own add to basket or the product's flow link swaps it (this settles the open decision on Spec 43 FR-43-25). The size-guide post holds only the dialog's body. The footer frame's `modalRef` needs its post id set until the site build resolves a slug.
3. Mama's contact page: the order-number field shows only for "My order"; "Baby shower or event" shows the cookie count and the date; after a submission the page shows "message received" and "Thank you! Zainab will be in touch soon."; the rendered `data-flow-product-id` of Build your Zookie is the Zookies product's id, not 0; no product carries `_sgs_choice_flow`.
4. Indus: `node scripts/computed-route/form-submit-check.mjs indus-foods --site <copy> --form enquiry`. A blank submission is refused with the draft's copy.
5. `node scripts/computed-route/site-check.mjs <client> --site <copy> --only modals` passes on both; then a planted link to `#modal-missing` and a removed size-guide post must each fail.
6. A walk of a surface whose root is missing live fails the site run's walk step.
