---
status: active
doc_type: plan
created: 2026-11-21
---

# Shop pages: fix and check every page type from the investigation

## Goal and why

Mama's and Eye Care's from-blank shop pages (product, shop listing, basket and drawer, checkout, account, order confirmation), built by the cloning route with no hand edits on the scratch copies `local-mediatest-trlab` (Mama's, :8121) and `local-mediatest-trec` (Eye Care, :8125), pass Bean's eye beside their drafts at 375 and 1440, and the route is ready for MIC (a new shop) cloned on 2026-11-28. Done, as Bean sees it: one pair per page type per client beside its draft, every listed fault fixed or recorded as a gap, and every check that used to look green while comparing nothing now able to fail.

## Approach

Six investigators wrote 99 findings; checkers fact-checked them; one merge grouped them by cause into 68 fixes, F-1 to F-68 (`.claude/reports/2026-11-21-shop-investigation/MERGED.md`: read a fix's block there before building it). On 2026-11-22 a second opinion (three reviewers, every finding verified against main) found about a third of the work already built or only route work on settings that exist, and an order that serialised what need not wait. This plan is the corrected version: MERGED.md section 9 lists what was dropped or shrunk and why. Work runs as lanes on separate worktrees (theme, four plugin lanes, two route foundations), then one vertical slice per page type with Bean looking at each slice as it passes, not all at the end. Rejected: one horizontal round of all lanes, one plugin round last and one rebuild at the end (the lanes need the plugin settings early, and Bean's eye would come only on day 5).

## Out of scope

The general cloning session's fixes (MERGED.md section 4, sent in Task 1), the header, footer and nav drawer builds, subscriptions (D-4), and WooCommerce pages a draft does not draw (MERGED.md section 7).

## Order

- **Two heavy jobs at most, across both sessions.** Heavy: `build-foundation.mjs`, a chain or part-look run, an offline Fill, the full route suite, `npm run build`, a render check. A helper takes a lock folder `E:\sgs-tmp\heavy-lock\<job>` before one and removes it after; no more than two may exist. At most five helpers. The full route suite and `check-mutation-lists.mjs` run once per landing batch, not per task.
- Wave 0 starts at once, all in parallel: Tasks 1 to 9. Task 10 (reseed A) follows Tasks 4 to 7 in the slot agreed with the general and setting-record sessions (their plugin round 6 reseed, then reseed A, then setting-record Task 3).
- Wave 1 (Tasks 11 to 16): each fix starts when its own "Depends on" in MERGED.md has landed, not when a wave ends. Shared files land one change at a time, rebasing first: `lib/template-piece-woo-layout.mjs`, `lib/fill-part-look.mjs`, `lib/skeleton-filter-rail.mjs`, `data/part-locators.json`, `data/part-look-modes.json`.
- Wave 2 (Task 17) proves each slice as it passes offline; Task 18 is deploy readiness.
- Only the integration worktree (`E:\sgs-tmp\wt-tr-lab`, kept on main) syncs to the two copies (`sync-build.sh` copies from the repo that holds it); `chmod 777` the plugin folder after each sync.

## Risks

- The setting-record plan's Task 3 adds a build check: a block whose settings change fails `npm run build` until its record is updated. Every plugin commit after it takes the printed "entries to add" in the same commit.
- Shared defaults (F-18, F-27, F-28, F-36, F-38, F-45, F-55, F-60, F-68) change what other sites render: Task 18 lists them through one render-scope run.
- **Cut line if days slip** (recommended, Bean can change it): MIC-critical are product, shop listing with the phone filter, basket and drawer, checkout; the fidelity tail is account and confirmation polish, F-61's low rows, F-62's upsell row, F-35, F-22.

## Session breaks

Read this plan, MERGED.md sections 1 and 9, and `git log --oneline -20`; find the first task whose Status is not done; rerun the previous task's check; continue. Investigation scripts and pictures: `E:\sgs-tmp\template-rework\investigation\`.

## First action

Task 1's message to the general session (5 minutes; everything it needs is in this plan and MERGED.md section 4).

## Wave 0: Decisions, setup and lanes (parallel)

### Task 1: Decisions recorded and the general session's list sent
- Why: Bean's answers shape the lanes; the general session owns fixes this stream's proof needs. Read first: MERGED.md sections 4 and 6
- Changes: D-1 to D-8 recorded in MERGED.md section 6 (done 2026-11-22); one message to the general session: section 4 minus F-67 and the built halves of F-5 and F-31; D-1's `SignIn.dc.html` page row; D-4's Claude Design note; F-2, F-3, F-7, F-11, F-42 and F-27 asked for as hard dependencies with a wave each (offering to build F-2 and F-3 here); owners of F-9 and F-20; whether `local-mediatest-trlab` can be its stripped Mama's plumbing copy; the reseed slot; whether setting-record Task 5 covers F-37
- Touches: MERGED.md; a cross-session message
- Done when: the general session has replied with a wave or owner for each item
- Depends on: none
- Status: decisions recorded; message not sent

### Task 2: Both copies truly from blank and complete
- Why: a pass on a hand-finished leftover proves nothing (S-2, S-6). Read first: MERGED.md section 3, `scripts/computed-route/lib/foundation-plan.mjs`
- Changes: `scripts/local-wp/scratch-mirror.sh strip` then `build-foundation.mjs` on each copy (it runs intake, tokens, plugin build, sync, media, site-build, manifest, paint calibration and the header, footer and drawer clones: S-3, S-4, S-5, S-11); a small script resetting the basket, checkout and account pages to WooCommerce's default blocks (S-6, the only setup step with no script); `site-build.mjs --account-registration --apply` (S-9); test keys for the card field only, 15 minutes at most (wallets need https and stay on Task 18's hand check); the fixture product's image (S-12); a worktree kit script copying the gitignored `sites/<client>/build/intake/{facts.json,inventories,replay}` into a helper worktree and setting `SGS_SECRETS_ROOT`; `chain.sh` and `chain-pl.sh` pointed at the integration worktree
- Touches: the two scratch copies (two heavy jobs, about 2.5 to 3.5 hours each, in the background)
- Done when: a read-only diff against `local-mamas` finds no hand-finished block settings on Mama's copy, `manifest.mjs` lists no `noIntake`, both checkouts show a card field or the gap is recorded
- Depends on: none (coordinate the strip of Mama's copy with the general session's plumbing run)
- Status: not started

### Task 3: Theme lane (F-28, F-68, later F-35)
- Why: the general session's RW-27 route half shows a 1,790px blank band at 375 until F-28 lands; MIC's phone filter needs F-68. Read first: MERGED.md F-28, F-68, F-35
- Changes: `theme/sgs-theme/assets/css/woocommerce.css` (a closed `dialog#sgs-shop-filters` takes no space whatever layout class; the 13 rules fixed at 781.98px/782px print from `sgs_shop_filter_drawer_breakpoint`, `inc/shop-filters-settings.php`); F-35 later, only the properties the two drafts differ on
- Touches: the theme; every site's shop (render-scope in Task 18)
- Done when: on trec at 375 the closed drawer takes 0px and opens and closes with its animation; with the option at 1060 the drawer shows from 1059 down and the sidebar from 1060 up (Playwright); the general session is told after F-28 and after F-68
- Depends on: none (its live check waits for Task 2)
- Status: not started

### Task 4: Plugin lane P1, cart drawer (F-18, F-62, F-60's drawer rows)
- Changes: `src/blocks/cart/render-scoped-css.php` (`$has_panel` falls back to the surface colour); F-62's missing settings only (remove text type and padding, stepper number width, free-delivery line height, empty body type and width, empty link look, vertical centring, gift box look and placement, upsell row, close tap area if `panelCloseSize` does not cover it); F-60's `item-row-template.js` add-options row
- Done when: Eye Care's drawer reads at 375 and 1440; build gates pass; `audit-inline-styling --check` exits 0. Depends on: none. Status: not started

### Task 5: Plugin lane P2, WooCommerce look (F-60's page rows, F-61, F-66, F-6's database rows)
- Changes: F-60's page bugs; F-61's missing settings only (`sgsTermsTextAlign`, error text, summary-title visibility, stack width, the "via" line, quantity badge, `object-fit`; test first whether a tree edit or the coupon block's own attribute already gives shipping-in-step and coupon-open); F-66 (`sgsSort*` extras, `sgs/gift-order` tile type and column count, `sgs/icon-list` icon box border); the chip and sort settings (`extension-roster.json`, `includes/product-filter-look.php`) seeded as `block_attributes` rows so part-look can pair them
- Done when: build gates pass; the seeder dry run lists the new rows. Depends on: none. Status: not started

### Task 6: Plugin lane P3, account and order (F-36, F-38, F-41, F-45, F-49, F-12, F-63, F-64)
- Changes: `account/style.css` rules that beat WooCommerce's floats (F-36); the order page's WooCommerce-table fallback (F-38 plugin half); `email` in `Customer_Binding::KEYS` (F-41); `heading/render.php` renders nothing for empty text (F-45); an `order-view` source in `helpers-link-source.php::sgs_resolve_link_source` (F-49); the order Show-to rules F-12 needs (check `order-owner`/`order-guest` against the draft's branches first); F-63's missing settings only (`menuItem` border and shadow, `ordersRow` radius, shadow and gap, `hideRequiredMarks`, `loginRowInline`, string keys); F-64's order-items settings; F-37 only after its cause is proved and setting-record Task 5 is ruled out
- Done when: build gates pass; tests fail first. Depends on: none. Status: not started

### Task 7: Plugin lane P4, product (F-55, F-65, D-8, F-51's sources)
- Changes: `option-picker` chosen text through `sgs_wcag_text_colour_for_bg` (F-55); F-65's missing settings only (`tagBorderWidth`, `tagBorderColour`, `addToCartPriceSeparator`, `pickBadgeFontSize`; the buy box badge reuses `product-card-per-product.php`'s reader); the buy box instalments note, the twin of the drawer's `panelInstalmentsNote`/`panelInstalmentsCount`, off by default, %s = current price ÷ count, updated on a variation pick (D-8); `rating` and long `description` sources in `class-product-bindings.php` (F-51)
- Done when: build gates pass; the note shows £46.33 for a £139 product at count 3. Depends on: none. Status: not started

### Task 8: Route lane R1 (F-1 own half, F-4, F-8, F-10, F-13)
- Changes: `template-piece-product-field.mjs::placeTitle` sets `level: h1`; the commerce region reports its run (prove offline first); the woo-layout piece claims the empty-basket branch; `template-piece-frame.mjs` records the wrapper it drops; the order reader binds a literal equal to the id the draft's order action creates (D-3)
- Done when: offline propose passes for Eye Care's shop, Mama's basket and Mama's checkout on the saved inventories; tests fail first; mutation lists killed. Depends on: Task 2's worktree kit. Status: not started

### Task 9: Route lane R2, part-look foundations (F-14, then F-15 to F-17)
- Changes: F-14 (`shop` entry in Eye Care's `part-look.json`, plus the signed-in and link parts it names); F-15 (`statedSize` reads `height`, viewport-capped widths and grid tracks); F-16 after F-14; F-17 before F-23 (verify and compare report what they did not compare)
- Done when: Eye Care's part-look on shop, checkout and the signed-in account pairs parts it paired 0 of before (counts in the commit); a verify with unpaired parts can no longer report all-match. Depends on: Task 2's worktree kit. Status: not started

### Task 10: Reseed A
- Changes: Tasks 4 to 7's settings published through `.claude/dev-setup.md` "Publishing a private reseed", announced to the general session first; then the lab rebuilt and synced. The four checks (database, motion system, theme Customizer, the hand-built site's setting names) only on section 5's "not checked" rows and the D-8 note. A reseed B only if slices find more settings
- Touches: plugin; framework database. Done when: publish succeeds; inspector scan has no new finding. Depends on: 4 to 7 and the agreed slot. Status: not started. Also picks up the `sgs/cart`, `sgs/account` and `sgs/product-card` element selectors (`aae74374b`, `92a404f90`: about 16 `motion_targets` rows, no render)

## Wave 1: One slice per page type (parallel, gated per fix)

Each slice: read its MERGED.md blocks; tests fail first; mutation lists killed; every new skeleton rule passes the double-claim check (`lib/skeleton-double-claims.mjs`) on both clients' saved inventories; plugin settings found here go to reseed B.

### Task 11: Product slice (F-50, F-52, F-53, F-54, F-51's route half, product-15's content align)
- Also: the code review's sold-out simple product (`includes/class-cart-proxy.php::handle_availability` falls back to `Product_Manifest::build_simple()`) and the express-pay note in `buybox/extras.php::sgs_buybox_after_cart_form_action`; the product lane writes D-8's note from the draft's line. Status: not started

### Task 12: Shop listing slice (F-6, F-30, F-32, F-33, F-34)
- F-30 writes the theme shop options as theme mods the way `lib/site-build-catalogue-toggle.mjs` does (names only from eye-care-test, values from the draft). F-33 adds a mode rule writing `cardContentSource: product` and a modes `from` kind for `imageRatio` and `priceFromLowest`; F-34 also writes `_sgs_card_cta_label` and `_sgs_card_cta_action`; the route writes `showRating` and never `noReviewsText` (D-5). Also from the code review: `skeleton-filter-rail.mjs::handlerOf`'s regex, the brand strip's uncached product query, catalogue terms holding `&`. Status: not started

### Task 13: Basket and drawer slice (F-19, F-20, F-21, F-9 if ours)
- Status: not started

### Task 14: Checkout slice (F-23 shrunk to step-number, line-item-brand, summary-fill and a section-with-h2 step; F-24, F-25, F-26 after F-10 and F-11)
- Status: not started

### Task 15: Account slice (F-39, F-40, F-41's route half, D-1's sign-in page addresses, D-7's order words)
- Status: not started

### Task 16: Confirmation slice (F-12, F-13's binding, F-43, F-44, F-48 shrunk, F-49's route half, D-2's fixed words)
- Mama's must build from its own draft, not WooCommerce's stock page. Status: not started

## Wave 2: Proof and deploy readiness

### Task 17: Prove each slice as it passes
- Changes: none in code. As a slice passes offline, the integration worktree runs `chain.sh` and `chain-pl.sh` for its surfaces on both copies in parallel (measured: full chains about 45 and 49 minutes, part-look 22 and 30), takes pairs at 375 and 1440 and sends them to Bean at once. Each MERGED.md section 8 row's fix has its failing-first test. MIC's draft gets an offline propose on the day it arrives (2026-11-27 is buffer)
- Done when: Bean passes each slice, or names what fails (it returns to its slice). Depends on: the slice. Status: not started

### Task 18: Deploy readiness
- Changes: one render-scope run (before `bcc47e0a6`, Mama's live build; after the final main) listing every page; render-check only on Mama's basket, checkout and account (F-18, F-36, F-38, F-60); the express-pay hand check on a product with options before Mama's next deploy; report gaps G-1 to G-7 and the missing features (D-4, D-8's static line)
- Touches: none until Bean approves a deploy. Depends on: 17. Status: not started
