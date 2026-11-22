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

- **Heavy jobs share the general session's lock.** Heavy: `build-foundation.mjs`, a chain or part-look run, an offline Fill, the full route suite, `npm run build`, a render check. A helper takes one of the lock folders `E:/sgs-tmp/general-cloning/heavy/slot-1` or `slot-2` before one and removes it after; this stream may also use `slot-3` for its own builds and runs (never two of its builds at once; stop it if the general session reports strain). At most five helpers (rules: `E:\sgs-tmp\shop-pages\HELPER-RULES.md`, progress log `E:\sgs-tmp\shop-pages\progress.md`). The full route suite and `check-mutation-lists.mjs` run once per landing batch, not per task.
- Waves 0 and 1 (Tasks 1 to 16) are built on `main` and proved offline; reseed A is published. Task 2's setup is finishing on the two copies. Wave 2 (Tasks 17 and 18) is next; Wave 3 (Task 19) holds what the slices deferred.
- Shared files land one change at a time, rebasing first: `lib/template-piece-woo-layout.mjs`, `lib/fill-part-look.mjs`, `lib/skeleton-filter-rail.mjs`, `data/part-locators.json`, `data/part-look-modes.json`.
- Only the integration worktree (`E:\sgs-tmp\wt-sp-int`, kept on main) syncs to the two copies (`sync-build.sh` copies from the repo that holds it); `chmod 777` the plugin folder after each sync. Machine notes: append `C:\Windows\System32\WindowsPowerShell\v1.0` to PATH (the plugin-build step spawns `powershell`), warm each copy with a request before the preflight, and set `SGS_SECRETS_ROOT` to the main checkout.

## Risks

- The setting-record plan's Task 3 adds a build check: a block whose settings change fails `npm run build` until its record is updated. Every plugin commit after it takes the printed "entries to add" in the same commit.
- Shared defaults (F-18, F-27, F-28, F-36, F-38, F-45, F-55, F-60, F-68) change what other sites render: Task 18 lists them through one render-scope run.
- **Cut line if days slip** (recommended, Bean can change it): MIC-critical are product, shop listing with the phone filter, basket and drawer, checkout; the fidelity tail is account and confirmation polish, F-61's low rows, F-62's upsell row, F-35, F-22.
- Nothing is deployed. Mama's live shop runs `bcc47e0a6`; `main` now carries many render-changing fixes (Task 18 lists them).

## Session breaks

Read this plan, MERGED.md sections 1 and 9, and `git log --oneline -20`; finish Task 2's open steps, then continue with Task 17; rerun the previous task's check first. Investigation scripts and pictures: `E:\sgs-tmp\template-rework\investigation\`.

## First action

Task 20 (Eye Care's site build skipping the basket row its draft does not draw), then Task 2's open steps on the two copies (Mama's manifest by hand, the foundation reruns, S-9, S-10, S-12, the `sgs/breadcrumbs` calibration), then Task 17 on the first slice (the full route suite once, then the slice's chain and its pairs for Bean).

## Wave 0: Decisions, setup and lanes (parallel)

### Task 1: Decisions recorded and the general session's list sent
- Why: Bean's answers shape the lanes; the general session owns fixes this stream's proof needs. Read first: MERGED.md sections 4 and 6
- Changes: D-1 to D-8 recorded in MERGED.md section 6 (done 2026-11-22); one message to the general session: section 4 minus F-67 and the built halves of F-5 and F-31; D-1's `SignIn.dc.html` page row; D-4's Claude Design note; F-2, F-3, F-7, F-11, F-42 and F-27 asked for as hard dependencies with a wave each (offering to build F-2 and F-3 here); owners of F-9 and F-20; whether `local-mediatest-trlab` can be its stripped Mama's plumbing copy; the reseed slot; whether setting-record Task 5 covers F-37
- Touches: MERGED.md; a cross-session message
- Done when: the general session has replied with a wave or owner for each item
- Depends on: none
- Status: done 2026-11-22 (`dc2cdac8c`). Decisions recorded in MERGED.md section 6 (Bean's F-49 answer added: a whole-card link follows the draft; the line "card is not a link; the button is the link" in `scripts/computed-route/data/skeleton-decisions.json` `rules.cardAction` and Indus's `approved-decisions.json` is not Bean's ruling; the general session owns `rules.cardAction`; it landed the card-link rule, the glyph-disc remnants and the Root/405 pairing on 2026-11-22, `94f49c4b6` to `17e8b30cf`). The general session replied: F-2 and F-3 ours (built here), F-9 and F-20 ours, reseed order round 6, then reseed A, then setting-record Task 3; F-37's block.json side is not in setting-record Task 5 (Task 19).

### Task 2: Both copies truly from blank and complete
- Why: a pass on a hand-finished leftover proves nothing (S-2, S-6). Read first: MERGED.md section 3, `scripts/computed-route/lib/foundation-plan.mjs`
- Changes: `scripts/local-wp/scratch-mirror.sh strip` then `build-foundation.mjs` on each copy (it runs intake, tokens, plugin build, sync, media, site-build, manifest, paint calibration and the header, footer and drawer clones: S-3, S-4, S-5, S-11); a small script resetting the basket, checkout and account pages to WooCommerce's default blocks (S-6, the only setup step with no script); `site-build.mjs --account-registration --apply` (S-9); test keys for the card field only, 15 minutes at most (wallets need https and stay on Task 18's hand check); the fixture product's image (S-12); a worktree kit script copying the gitignored `sites/<client>/build/intake/{facts.json,inventories,replay}` into a helper worktree and setting `SGS_SECRETS_ROOT`; `chain.sh` and `chain-pl.sh` pointed at the integration worktree
- Touches: the two scratch copies (two heavy jobs, about 2.5 to 3.5 hours each, in the background)
- Done when: a read-only diff against `local-mamas` finds no hand-finished block settings on Mama's copy, `manifest.mjs` lists no `noIntake`, both checkouts show a card field or the gap is recorded
- Depends on: none (coordinate the strip of Mama's copy with the general session's plumbing run)
- Status: partly done 2026-11-22. Done: both copies stripped (`scratch-mirror.sh strip`); the basket, checkout and account pages reset to WooCommerce's defaults with the new `scratch-mirror.sh reset-shop-pages` (S-6, `36b2eed67`; trec pages 7, 8, 9, trlab 101, 102, 103); Mama's intake re-run and committed (`f2989d3f8`: the order confirmation builds from `Confirmation.dc.html`, not WooCommerce's stock page). `build-foundation.mjs` ran on both copies and stopped at 09:42 (runner `E:\sgs-tmp\shop-pages\run-foundations.ps1`, logs `E:\sgs-tmp\shop-pages\foundation-local-mediatest-{trec,trlab}.log`; it skips finished steps, so rerun it after each fix). Eye Care (trec): preflight, plugin build, sync, site info and media passed; the site build FAILED with "STOP page:cart: the cart template (`sites/eye-care-ward-end/build/trees/template/cart.json`) is a cart surface and its tree holds no core/post-content": Eye Care's draft draws no basket page (Bean's ruling leaves WooCommerce's default, gap G-1), so the site build should skip that row (Task 20, ours). Mama's (trlab): everything through the site build (including the new checkout content step) and the manifest passed; the paint step FAILED with "no surface for the layout rows footer, header, drawer-menu"; the cause is the foundation's manifest step not applying the layout rows after a strip, which is the general session's (first in its next lane); until it lands, run `node scripts/computed-route/manifest.mjs mamas-munches-redesign --site local-mediatest-trlab --apply` by hand, then rerun the foundation. Open: Task 20 and Mama's by-hand manifest apply, then the foundation finishing on both copies; `site-build.mjs --account-registration --apply` (S-9); the gateway test keys (S-10); the fixture product's image (S-12); `sgs/breadcrumbs` calibrated on trec (never on local-eye-care); the done-when checks

### Task 20: The site build skips a basket or checkout row the draft does not draw
- Why: Eye Care's draft draws no basket page (Bean's ruling leaves WooCommerce's default, gap G-1), and the foundation's site build stops on its `page:cart` row ("the cart template is a cart surface and its tree holds no core/post-content"), so Eye Care's copy cannot be built from blank. Read first: `scripts/computed-route/lib/site-build-plan.mjs` (`planBuild`, `wooContentRole`), the manifest's `unplayed` list (`lib/manifest-build.mjs::buildManifest`)
- Changes: a cart or checkout template row whose surface the draft does not draw is skipped by the site build, leaving WooCommerce's own template and page, and noted in the run report; a row whose surface the draft draws still refuses a tree with no `core/post-content`
- Touches: route (site build)
- Done when: Eye Care's site build on `local-mediatest-trec` passes the cart row with a note; a test fails first on the old code (a cart template row with no drawn surface) with a negative control (a drawn cart surface with no `core/post-content` still stops); then Eye Care's foundation is rerun to its end
- Depends on: none
- Status: not started

### Task 3: Theme lane (F-28, F-68, later F-35)
- Why: the general session's RW-27 route half shows a 1,790px blank band at 375 until F-28 lands; MIC's phone filter needs F-68. Read first: MERGED.md F-28, F-68, F-35
- Changes: `theme/sgs-theme/assets/css/woocommerce.css` (a closed `dialog#sgs-shop-filters` takes no space whatever layout class; the 13 rules fixed at 781.98px/782px print from `sgs_shop_filter_drawer_breakpoint`, `inc/shop-filters-settings.php`); F-35 later, only the properties the two drafts differ on
- Touches: the theme; every site's shop (render-scope in Task 18)
- Done when: on trec at 375 the closed drawer takes 0px and opens and closes with its animation; with the option at 1060 the drawer shows from 1059 down and the sidebar from 1060 up (Playwright); the general session is told after F-28 and after F-68
- Depends on: none (its live check waits for Task 2)
- Status: done: F-28 `5d4ac5ae0`, F-68 `159f44022`, gate fix `aa1d69ef5`; the general session knows (its RW-27 route half may land). Deferred: F-35 (shrunk: only the properties the two drafts differ on, Task 19). The live checks in Done when run in Task 17; render-scope in Task 18

### Task 4: Plugin lane P1, cart drawer (F-18, F-62, F-60's drawer rows)
- Changes: `src/blocks/cart/render-scoped-css.php` (`$has_panel` falls back to the surface colour); F-62's missing settings only (remove text type and padding, stepper number width, free-delivery line height, empty body type and width, empty link look, vertical centring, gift box look and placement, upsell row, close tap area if `panelCloseSize` does not cover it); F-60's `item-row-template.js` add-options row
- Done when: Eye Care's drawer reads at 375 and 1440; build gates pass; `audit-inline-styling --check` exits 0. Depends on: none. Status: done: F-18 `cc6ee04f7`, F-60 drawer rows `2924778a4`, F-62's 75 `sgs/cart` settings `b661c7fb4`, gate fix `91c15d31b`. Deferred: `itemQtyFontWeight` pairs the stepper wrapper, not the number (changing it alters saved sites: Task 19, needs Bean's call)

### Task 5: Plugin lane P2, WooCommerce look (F-60's page rows, F-61, F-66, F-6's database rows)
- Changes: F-60's page bugs; F-61's missing settings only (`sgsTermsTextAlign`, error text, summary-title visibility, stack width, the "via" line, quantity badge, `object-fit`; test first whether a tree edit or the coupon block's own attribute already gives shipping-in-step and coupon-open); F-66 (`sgsSort*` extras, `sgs/gift-order` tile type and column count, `sgs/icon-list` icon box border); the chip and sort settings (`extension-roster.json`, `includes/product-filter-look.php`) seeded as `block_attributes` rows so part-look can pair them
- Done when: build gates pass; the seeder dry run lists the new rows. Depends on: none. Status: done: F-6's database rows `3e824ccaf`, F-60 page rows `8a37c480e`, focus gate `d05c40eba`, F-61 `acec202b6`, F-66 `3ab260b0a`. Deferred (Task 19; reasons in the lane's report): the summary card's clipped shadow (cause unproved), the chosen gift tile's outline, shipping options inside the delivery step (WooCommerce locks the block), F-61's low rows (phone summary placement, step motion, postcode finder, mobile contact field, single country as text)

### Task 6: Plugin lane P3, account and order (F-36, F-38, F-41, F-45, F-49, F-12, F-63, F-64)
- Changes: `account/style.css` rules that beat WooCommerce's floats (F-36); the order page's WooCommerce-table fallback (F-38 plugin half); `email` in `Customer_Binding::KEYS` (F-41); `heading/render.php` renders nothing for empty text (F-45); an `order-view` source in `helpers-link-source.php::sgs_resolve_link_source` (F-49); the order Show-to rules F-12 needs (check `order-owner`/`order-guest` against the draft's branches first); F-63's missing settings only (`menuItem` border and shadow, `ordersRow` radius, shadow and gap, `hideRequiredMarks`, `loginRowInline`, string keys); F-64's order-items settings; F-37 only after its cause is proved and setting-record Task 5 is ruled out
- Done when: build gates pass; tests fail first. Depends on: none. Status: done: F-36 `e147c3736`, F-38 `bfbb72ff4`, F-41's email key `8b79b8eff`, F-45 `73c2cef7c` and `a07825ef9` (a heading or text holding only a picture or icon still renders), F-49's order-view link source `09e37c4ca`, F-12's Show-to rules `a9ea16750`, pickup id match `bda53697c`, F-64 `7442df5ea`, F-63 `0aee505a1`, row frame `9c036e0da`, gate fixes `08b3574b5` and `5ab649e80`. F-37 (about 144 `sgs/account` settings get no part) has a traced cause: `extract-signatures.py` drops attributes it marks ambiguous typography, and the block.json side is not in the setting-record plan's Task 5: parked for a reseed B (Task 19)

### Task 7: Plugin lane P4, product (F-55, F-65, D-8, F-51's sources)
- Changes: `option-picker` chosen text through `sgs_wcag_text_colour_for_bg` (F-55); F-65's missing settings only (`tagBorderWidth`, `tagBorderColour`, `addToCartPriceSeparator`, `pickBadgeFontSize`; the buy box badge reuses `product-card-per-product.php`'s reader); the buy box instalments note, the twin of the drawer's `panelInstalmentsNote`/`panelInstalmentsCount`, off by default, %s = current price ÷ count, updated on a variation pick (D-8); `rating` and long `description` sources in `class-product-bindings.php` (F-51)
- Done when: build gates pass; the note shows £46.33 for a £139 product at count 3. Depends on: none. Status: done: F-55 `9d7cf24f3`, F-51's sources `7178eadf6`, docblocks `76f09533c`, gate fix `a3067a441`, F-65 `26ced177f` and D-8's instalments note `d263cb57d`, the note hides at 0 or sold out `86ba09306`, editor preview `037174192`, motion fixture `79af883b6`

### Task 8: Route lane R1 (F-1 own half, F-4, F-8, F-10, F-13)
- Changes: `template-piece-product-field.mjs::placeTitle` sets `level: h1`; the commerce region reports its run (prove offline first); the woo-layout piece claims the empty-basket branch; `template-piece-frame.mjs` records the wrapper it drops; the order reader binds a literal equal to the id the draft's order action creates (D-3)
- Done when: offline propose passes for Eye Care's shop, Mama's basket and Mama's checkout on the saved inventories; tests fail first; mutation lists killed. Depends on: Task 2's worktree kit. Status: done: F-2 `b60fd7fe9`, F-3 `85dc43839`, F-1's h1 `212d0de85`, F-13a `ded3cfd51`, F-10 `5b6b7624b`, F-8 `baaaf4063`, F-4 `7b7d82577`, and `0fca2c341` (the gate chain reads the build's own tree via `--tree`; a walk-only run gates nothing and fails closed)

### Task 9: Route lane R2, part-look foundations (F-14, then F-15 to F-17)
- Changes: F-14 (`shop` entry in Eye Care's `part-look.json`, plus the signed-in and link parts it names); F-15 (`statedSize` reads `height`, viewport-capped widths and grid tracks); F-16 after F-14; F-17 before F-23 (verify and compare report what they did not compare)
- Done when: Eye Care's part-look on shop, checkout and the signed-in account pairs parts it paired 0 of before (counts in the commit); a verify with unpaired parts can no longer report all-match. Depends on: Task 2's worktree kit. Status: done: F-14 `2a20f1810`, F-15 `3938b961e` and its scope fix `283b5503a`, F-16 `19b3ddb95`, F-17 `5d1101755`, verify `--strict` `d00f209bf`, README and Spec 48 `585243430`. Eye Care pairing: shop 10 of 37 (now the right page), checkout 43 of 112, signed-in account 0 to 21 of 99 (the target 26 is short by a square status chip and a date with no inner element), drawer 23 to 32 of 53, then 42 of 73 after Task 13

### Task 10: Reseed A
- Changes: Tasks 4 to 7's settings published through `.claude/dev-setup.md` "Publishing a private reseed", announced to the general session first; then the lab rebuilt and synced. The four checks (database, motion system, theme Customizer, the hand-built site's setting names) only on section 5's "not checked" rows and the D-8 note. A reseed B only if slices find more settings
- Touches: plugin; framework database. Done when: publish succeeds; inspector scan has no new finding. Depends on: 4 to 7 and the agreed slot. Status: done. Published 2026-11-22 09:20 UTC, shared database sha256 `d9b507576777c60e70278c543fe66292128ca917ea1f54b696fba7b6bc081fc0`, regenerated files `199c35a50`; `gate:full` passed on the copy (third run, after five lane fixes). The general session's round 6 published before it (`8bdb7c8e`, `d5df8b68b`). Next in the order: setting-record Task 3 (a session Bean starts); it sends this stream a list if its build check names these blocks. A reseed B only if slices find more settings (Task 19)

## Wave 1: One slice per page type (parallel, gated per fix)

Each slice: read its MERGED.md blocks; tests fail first; mutation lists killed; every new skeleton rule passes the double-claim check (`lib/skeleton-double-claims.mjs`) on both clients' saved inventories; plugin settings found here go to reseed B.

### Task 11: Product slice (F-50, F-52, F-53, F-54, F-51's route half, product-15's content align)
- Also: the code review's sold-out simple product (`includes/class-cart-proxy.php::handle_availability` falls back to `Product_Manifest::build_simple()`) and the express-pay note in `buybox/extras.php::sgs_buybox_after_cart_form_action`; the product lane writes D-8's note from the draft's line. Status: done offline: F-50 `97b5ad042` and `0e9880045`, D-8's route `27d0e6e07`, F-54 `5570e042f`, F-51 brand `2a06822fe` and `bbfcf8b8b`, F-51 rest `9952e0333` (breadcrumbs, rating, `_sgs_code`), product-15 `16871ec83`, the sold-out simple product and express-pay note `6b9598952`, F-53 `fef024185`, F-52 `8639998f0`, review fixes `542ffdbce`, `037eb2053` and `28b2db835`, Spec 48 `a10a13df7` and `d042c0e1a`. Offline propose: Mama's product 0 problems; Eye Care 2, both the general session's (Root/405 WhatsApp icon pairing, Root/372 stock dot). Deferred: Mama's numbered option groups and sticky bar; Eye Care's "Pick a set" modes; the saving badge's corner; the long description (`cur.blurb` is draft logic); `stockLinePosition`. The product code reaches a site only after a catalogue re-read; `sgs/breadcrumbs` needs calibrating on trec (Task 2)

### Task 12: Shop listing slice (F-6, F-30, F-32, F-33, F-34)
- F-30 writes the theme shop options as theme mods the way `lib/site-build-catalogue-toggle.mjs` does (names only from eye-care-test, values from the draft). F-33 adds a mode rule writing `cardContentSource: product` and a modes `from` kind for `imageRatio` and `priceFromLowest`; F-34 also writes `_sgs_card_cta_label` and `_sgs_card_cta_action`; the route writes `showRating` and never `noReviewsText` (D-5). Also from the code review: `skeleton-filter-rail.mjs::handlerOf`'s regex, the brand strip's uncached product query, catalogue terms holding `&`. Status: done offline: `bf2a503ea`, `8a9276450`, `b9bad3f26`, `eff39ae6a`, F-30's theme mods incl. the drawer breakpoint from the rail's `ownAlternativeBelow.value` `d429cbd80`, F-34 `d1cc18387`, F-33 `e955d586f`, F-32 `4a19837a7`, F-6 `5829bd51b`, `a5ab43915`, `56bec0d88`, `ca4b619ca`, `0d42dc6a5`, the duplicate FILTER button gone `21671085a`, `ccdc57657` (part-look never invents a form control's font family), and `159a9895a` (the rail node carries `ownAlternativeBelow`, which the general session's width gate keys on). Offline both shops 0 problems; Eye Care plans 21 theme mods (matching shop.md), Mama's 5. Deferred: F-34's product code as SKU, size measurements and Eye Care's description; F-33's swatch, wishlist, brand-overlay, saving-badge and attribute-tag switches and `showDescriptionTier`; F-6's chip "All" label, single-choice chips and `customChip*`; 30 of the 51 shop options are reported, not written (reasons in `scripts/computed-route/data/shop-options.json`)

### Task 13: Basket and drawer slice (F-19, F-20, F-21, F-9 if ours)
- Status: done offline (with Task 14): F-9 `beab1574b`, F-19 and F-20 `c8a16bdfa`, F-21 `44ae79582`, review fixes `5e9a48be5` (switch-offs need positive evidence, the `smallest` fallback is gone and an unfound drawer refuses, stack gap opt-in). Drawer pairs: Eye Care 42 of 73, Mama's 56 of 73. Offline: Mama's basket 0 problems. Deferred: drawer view-link style, actions stack, Remove position

### Task 14: Checkout slice (F-23 shrunk to step-number, line-item-brand, summary-fill and a section-with-h2 step; F-24, F-25, F-26 after F-10 and F-11)
- Status: done offline: F-26 `1cc304851`, F-23 and F-25 `eebaf3b64`, F-24 and S-6 (a separate helper) `36b2eed67` (reset-shop-pages), `fed78635b` (`site-build.mjs --checkout-content`), `624e1fd07` (escaping, a scheme allowlist, first-run-only marker `_sgs_checkout_content`). Offline: Eye Care's checkout 0 problems; Mama's checkout 1 (Root/13#0, F-11, the general session's). Deferred: Mama's summary heading line height; floating-label padding (cause unproved)

### Task 15: Account slice (F-39, F-40, F-41's route half, D-1's sign-in page addresses, D-7's order words)
- Status: done offline: order-card opener `55373e6a6`, D-1 (sign-in addresses, and an account block in form view on the sign-in row) `05bd17fc5` and `022603eac`, F-39, F-40 and D-7's prefix `752a91b4b`, F-41 `0f7e5e920`, `hiddenEndpoints` guard `7c3af8906`, order-card signal `d6bfd6b23`, D-7's status words `d9966fa42` (Mama's {processing: "Baking soon", completed: "Posted"} from the status table in its draft's logic; Eye Care gets a gap row). After reseed A both clients read their real orders and order page and the menu order is written for both; pairing signed in: Eye Care 21 of 100, Mama's 27 of 99. Deferred: Eye Care's signed-in band; neither draft hides endpoints now (each has an unclassified Subscriptions tab; Mama's hand-finished hidden list is a per-site decision for Bean); D-1 waits on the general session adding the `SignIn.dc.html` page row (Mama's page map records `folds: [SignIn.dc.html]` today)

### Task 16: Confirmation slice (F-12, F-13's binding, F-43, F-44, F-48 shrunk, F-49's route half, D-2's fixed words)
- Mama's must build from its own draft, not WooCommerce's stock page. Status: done offline: F-12 and F-13b `5ea030d1c`, F-43 `d4de9c1af`, D-2 `dc20624a6`, F-44 `411e87641`, review fixes `b2da29e2e` and `20689a228`. Eye Care's confirmation proposes with 0 problems. The general session landed F-48's remnants and F-49's route half (cards follow the draft) on 2026-11-22 (`94f49c4b6` to `17e8b30cf`)

## Wave 2: Proof and deploy readiness

### Task 17: Prove each slice as it passes
- Changes: none in code. As a slice passes offline, the integration worktree runs `chain.sh` and `chain-pl.sh` for its surfaces on both copies in parallel (measured: full chains about 45 and 49 minutes, part-look 22 and 30), takes pairs at 375 and 1440 and sends them to Bean at once. Each MERGED.md section 8 row's fix has its failing-first test. MIC's draft gets an offline propose on the day it arrives (2026-11-27 is buffer)
- Done when: Bean passes each slice, or names what fails (it returns to its slice). Depends on: the slice. Status: not started. Also: run the full route suite once (`node tools/run-tests.mjs` from `scripts/computed-route`, without `SGS_SECRETS_ROOT`; no lane ran it as one batch) and `verify --strict` on each pair

### Task 18: Deploy readiness
- Changes: one render-scope run (before `bcc47e0a6`, Mama's live build; after the final main) listing every page; render-check only on Mama's basket, checkout and account (F-18, F-36, F-38, F-60); the express-pay hand check on a product with options before Mama's next deploy; report gaps G-1 to G-7 and the missing features (D-4, D-8's static line)
- Touches: none until Bean approves a deploy. Depends on: 17. Status: not started. The render-scope list (fixes that change other sites): F-18, F-28, F-68, F-36, F-38, F-45 with `a07825ef9`, F-55, F-60's page and drawer rows, `d1cc18387` (product order from `menu_order`), the express-pay screen-reader note, and `5ab649e80` (the order-items row gap is now the site's spacing-30: Eye Care 8px, Mama's redesign 8px, Indus 14px, the demo sites 0.75rem)

## Wave 3: Round 2

### Task 19: What the slices deferred
- Why: the slices stopped at what the drafts and settings that exist could carry; these items need a decision, a setting or the general session. Each slice's own Deferred list (Tasks 11 to 16) stays with its task.
- Changes: F-37 (a reseed B: the traced cause is in Task 6; `extract-signatures.py` must keep attributes it marks ambiguous typography, or the block.json side gets its part some other way); F-35 (only the properties the two drafts differ on); the plugin-side leftovers of Tasks 4 and 5 (the stepper number's weight, the summary card's shadow, the gift tile's outline, F-61's low rows); any setting the Task 17 proof finds missing (published in the same reseed B); a decision from Bean on Mama's hidden account endpoints. The general session's, tracked there: F-49's route half and `rules.cardAction`, F-48's remnants, the Root/405 pairing, the glyph-disc remnants, F-27, F-11, F-42, F-7, D-1's `SignIn.dc.html` page row
- Done when: each item is built with a failing-first test or recorded as a gap with its reason; the framework database holds any new setting
- Depends on: 17
- Status: not started
