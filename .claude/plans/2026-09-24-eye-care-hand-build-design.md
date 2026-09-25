# Eye Care Birmingham: build the real site first, then use it to test the pipeline

**Status:** APPROVED by Bean 2026-09-24 (D1149). **Wave A DONE 2026-09-24.** **Wave B framework part DONE
2026-09-24.** **Wave B DONE 2026-09-25** (pages built 2026-09-24; close-out items 1-9 and part 2 done and live
2026-09-25). **Wave C DONE 2026-09-25** (tasks 1-6 live on eye-care-test and proven; the design review's owed items
are in "Wave C design review" below). **Next: Wave D** (section 8: Phase 6 launch readiness, then the Phase 7 answer
key), with the owed Wave C polish alongside.
- Wave B pages on eye-care-test, each built through the editor with `scripts/wp-build-page.js` from a tree in
  `sites/eye-care-ward-end/build/` (the reproducible record): header `sgs_header` 199 (active), mobile menu `sgs_drawer`
  203 (the burger's own drawerRef; the global drawer pointer is untouched), mega panels 165/176/183/186, WP menu 96,
  footer `sgs_footer` 182 (active, carries the floating WhatsApp button), Home 208 (front page), Lenses 168, Help 171,
  About 187, Contact 190 (the four content pages use the new "Page (no title)" template).
- Framework fixes found by building the pages (all deployed): form submit posted natively and lost its success
  message; required selects red on load; accordion default-open item reported collapsed; footer links forced to the
  surface colour (a dark-footer assumption, two rules); no page template without the title; WhatsApp CTA now falls back
  to Site Info. Round 2 settings: card-grid image glyph + image overlay, process-steps list layout, brand-strip exact
  seconds, social-icons brand marks (Google, WhatsApp, TikTok, X).
- Comparison pass (read-only agent, 1440/768/375) then fixes, all deployed: hero parallax layer leaked behind every
  transparent section (clip-path on the parallax root); hero overlay collapsed to 0x0 under Ken Burns, and covered only
  the content cap (the cap is now static inside the hero); hero sub-headline pushed right by sgs/text auto-centring;
  sgs/heading gained maxWidth (ch allowed); 4 / 5 added to the shared aspect-ratio list; card-grid frontend image never
  filled its ratio box or zoomed (rules named only the editor class), overlay-variant glyph now sits in the caption,
  image glyphs sit bare, a set image overlay replaces the caption gradient; brand-strip tile links not underlined; custom
  buttons with a border width paint it; mega triggers honour submenuCaret. Page content: dark ticker, logo centred
  (1fr auto 1fr), icon-only burgers, no carets, About/Contact/Help spacing, borders, one-line hours, placeholder form.
  `scripts/wp-build-page.js` now also refuses wrong-typed, off-enum and per-device-on-flat values (six borders were
  invisible because of the last one).
- **Wave B close-out items 1-9: DONE 2026-09-25, live on eye-care-test** (Bean's decisions 2026-09-24).
  1. Header phone hidden below 1160px: the one Eye Care Additional CSS rule (snapshot `styles.css`). Per-size hiding that
     lines up with the 768/1024 tiers uses `sgsHideOnMobile/Tablet/Desktop` instead; hiding a header block exactly where its menu becomes a burger
     uses `sgsCollapseVisibility` (nav track U-10, done). The 1160px phone rule stays in Additional CSS (Bean).
  2. `sgs/button` `linkSource` (url | phone | email | whatsapp from Site Info, typed URL as fallback); Help's Call is an
     outline button to tel:01217298233.
  3. Button presets: the outline preset follows its section's text colour (`currentColor`), and the button stylesheet
     now reads every preset role, including geometry (border-width, radius, font-size, weight, padding, min-height), which
     it ignored before; `fontWeight` defaults to unset so the preset's weight applies. Palette gains `primary-hover`
     #2A2A2A and `whatsapp-hover` #1EBE5A (the draft's hovers).
  4. Shop setting "Hide .00 on whole-pound savings" (Customizer > Shop Filters, theme mod `sgs_shop_hide_zero_decimals`),
     on for Eye Care: "Save £32", not "Save £32.00". Prices, the RRP, cart and checkout always show pennies (Bean,
     2026-09-25: orders are not always whole pounds, so the site standardises on full amounts); the setting feeds the
     plugin's `sgs_saving_trim_zeros` filter (`includes/product-rrp.php::sgs_product_rrp_saving`).
  5. `sgs/accordion` `headerFontWeight` / `headerFontWeightOpen` (defaults 600/700) and open-state colours
     (`headerColourOpen`, `headerBackgroundOpen`); Help uses 400.
  6. Contact form on the form CPT: `sgs_form` post 285 (slug `contact`), linked from page 190's `sgs/form`
     (`formIsLinked`). New `sgs/form` submit typography, padding and min-height; live submit reads "SEND MESSAGE",
     52px, and a real submission returned 200 with the success message.
  7. `sgs/business-info` `hoursLayout: condensed` ("Mon–Sat 9.30–17.30"); footer and Contact use it.
  8. `sgs/nav-bar-menu` `triggerMode` is a tier object and `triggerIconPosition` places the icon; the header shows the
     icon then "Menu" at desktop and tablet, the icon only at 375. The Wave 3C plan's DEC-14 row names where U-14's
     fourth value goes.
  9. Brands, Lenses and Help mega panels rebuilt to the draft's content; both menus `megaAlign: full-width`.
  Also fixed after the final comparison: the header's middle row keeps `1fr auto 1fr` at every tier (one row at 375);
  menu items 13.5px/400/0.06em and a 0 gap on the left menu (one row from 1060 to 1440); Lenses h1 capped at 18ch;
  Home steps show numerals (`sgs/process-steps` list).
- **Wave B close-out part 2: DONE 2026-09-25, live on eye-care-test (framework at 35f25de0b, trees 2004930f6).**
  Framework (all deployed):
  - `sgs/business-info` `copyrightPrefix` (empty omits the word) and `textBefore`/`textAfter` (text around a value
    inside its line; the line switches to inline flow). Footer: "© 2026 Eye Care Birmingham…"; Help: "Call the
    clinic on {phone}, or send me a message…" is one block.
  - `sgs/mega-group` `url`/`opensInNewTab`/`rel`: the whole card is one link (Lenses panel, 4 cards to
    /prescription-lenses/).
  - `sgs/process-steps` `numberFontFamily` (raw CSS font-family string, e.g. `"Playfair Display", serif`).
  - `sgs/social-icons` `iconStyle: boxed` (square bordered box) and, in brand mode, the four-colour Google mark.
  - `sgs/container`: a template set for desktop only now governs tablet and mobile (a count fills a tier only when that
    tier's count was authored); the grid/flex-child shrink backstop is `:where()`, so a child's own min-height
    applies (the Home image cell's 430px read 0 before). Header middle row now desktop-only, proven one row at 768/375.
  - `sgs/site-header-row`: the logo floor never exceeds the logo's authored width (the 120px floor had beaten the
    40px mark once the backstop stopped masking it; the sweep found no other masked rule that was wrong).
  - `sgs/icon-list`: linked items follow `itemTextDecoration` (the underline sat on the
    `<a>`, which a `none` on the `<li>` could not remove).
  Proven causes that differed from the list: item 4 was not `min-height:0` (already present) but the backstop's
  specificity plus a percentage height on an image whose parent has no height; the image cell is now a container
  background (alt kept), Home section 826px at 1440 (draft 856).
  Content (all built): mobile menu (icon-list links, phone box, boxed brand social icons, left-aligned), mega panels
  (`panelBg: surface-alt`, plain links, Brands 5-column tile grid, Lenses linked cards, Sunglasses plain promo image),
  Contact labelled 2x2 grid, Help sentence, footer copyright and boxed icons.
  Routed to the Wave 3C plan's lane A (nav track owns those blocks): `sgs/nav-bar-menu` link padding is now a
  setting, `itemPadding` ("Link padding" in the List layout panel; 4cf0b9069, live on sandybrown), so the Eye Care
  header can set its own; `sgs/mega-panel` is now opaque by default (an empty `panelBg` paints the surface token,
  f70687138), so an untouched panel no longer shows the page through it.
  Decided not to build: `scripts/wp-build-page.js` reading PHP allow-lists. Of about 285 `in_array` checks in block
  render files only 110 are inline literals; the rest go through variables and helpers (icon-list's `markerType`
  uses `sgs_list_marker_sanitise_type()`), so they cannot be read without running PHP. JSON `enum`s are left off on
  purpose (WordPress coerces an off-enum value to the default). A PHP registry of allow-lists exposed over REST is
  the viable design if off-list values keep slipping through.
  Decided not to build: the shape tiles' "Photo to come" note (a draft artefact; real photos replace it).
- **Wave B residuals (small, Eye Care surfaces):**
  1. `sgs/media` inside a grid/flex row: an agent reported that the aspect ratio applies to the `<img>` only, so the
     `<figure class="sgs-media-box">` stretched to the row height (669px) and a caption overlay painted over the whole
     stretched box (Sunglasses mega promo). Unproven: verify on the live Sunglasses panel first; if true, fix in the
     media atoms (`includes/media/atoms/`) and restore the promo's on-image caption overlay.
  2. `sgs/social-icons`: item order is fixed when `source: site-info` (draft: Instagram, Google, WhatsApp; live:
     Instagram, WhatsApp, Google) and there is no per-item tint (the draft's green WhatsApp box in the mobile menu).
     A small setting on the block; footer/drawer surfaces, so after the nav track's rebuild.
  3. Glasses "SOON" in the mobile menu is item text (icon-list has no per-item badge).
  4. Mobile menu Sunglasses and Brands link to /shop/ until category pages exist (Wave C).
- Known follow-up, not blocking: the social-icons glyph gradient paints strokes only, so it has no effect on the four
  filled brand marks (Google, WhatsApp, TikTok, X).
- **Wave C progress (2026-09-25):** (1) shared product card DONE (`plans/2026-09-25-eye-care-product-card.md`); (2)
  product page, zero-reviews state, DONE (`plans/2026-09-25-eye-care-product-page.md`; real frame sizes from
  jpopticians.com, Bean 2026-09-25); (3) shop archive DONE: the site's own `archive-product` template from
  `build/archive-product.tree.json` (generator `build/gen_archive_product.py`), shop page titled Sunglasses (`/shop/`
  unchanged), theme Shop Filters settings (card minimum 250px, gap 18px, narrow grid, plain panel), phone drawer built
  by `sgs-shop-filters.js` (WordPress 7.1 saves editor-made Custom HTML empty). Brand filter PROVEN: WooCommerce 11's
  parameter is `?brands=ray-ban` (not `filter_product_brand`), 3 Ray-Bans, survives reload. Verified at 1440/768/375.
  Owed shop polish: one-row toolbar ("16 frames · Filter · Featured"), colour swatches in the Colour filter (WooCommerce
  has no swatch display), a Gender filter (no gender data seeded), brand search box. Framework debt found: the theme's
  default `archive-product.html` hard-codes another client's filters (Flavour/Size by attribute ID), and its
  `@container sgs-shop-grid (min-width:1280px)` columns rule queries its own container so it has never applied.
- **Wave C task 4 (lens configurator) DONE and live (2026-09-25):** Spec 43 v1.5.0. The add-on price list
  (`includes/addon-price-list/`, WooCommerce > Add-on prices, seeded on eye-care-test with `wp sgs addon-prices
  seed`: lens-use, lens-thickness, lens-finish) is the only price authority. The flow is the Choice Flow
  `lens-configurator` (eye-care-test post 463, `build/gen_lens_configurator.py`), shown on the product template
  by a linked `sgs/choice-flow` (`flowId`, FR-43-6, Bean 2026-09-25: built through the flow CPT) inside a
  triggerless fullscreen `sgs/modal` that "Add my prescription" opens (`#lens-configurator`). PROVEN in a real
  browser on product 71: Distance, Thin 1.6, Polarised adds ONE line at £268 (139+59+30+40) reading "Options:
  Distance · Thin · 1.6 · Polarised"; an unknown key, unknown group or two keys in one group are refused (409)
  and a client-sent price is ignored (priced from the list). Fixed on the way: priced options carried no prices
  (namespace mismatch, a93deb6ca), the flow bought whichever product card loaded last (a93deb6ca), add-ons
  stacked on every cart recalculation (257/316/375 for one line, 0a2f465cf, test
  `tests/php/run-addon-price-list-cart-standalone.php`), a `src/` require that 500'd the site (293692aea, new
  gate `check-no-src-requires.py`), nameless modal dialogs (36d0ff818). Lens option pictures: media 447-458.
  Gap: the draft's left aside (frame photo + running lines) is the price panel on the right. The 4th question ("Your prescription")
  was added in task 6 (Spec 43 FR-43-21).
- **Wave C task 5 (size guide) DONE (2026-09-25):** `sgs_modal` 461 (`build/gen_size_guide.py`), a triggerless
  `sgs/modal` (anchor `size-guide`, large) on the product template, opened by "Which size am I?" in the Sizing tab.
  Gap: the buybox's size picker has no slot for the draft's "Which size am I?" link beside the Size label.
- **Wave C design review (2026-09-25, Sonnet design-reviewer, draft vs live at 1440/768/375, screenshots in that
  session's scratchpad):** fixed: checkout pre-selected paid delivery on a free-delivery order
  (`includes/woocommerce-shipping-rates.php`). The framework half of the flow chrome is built (Spec 43 v1.7.0,
  2026-09-25): progress colour, optional header (logo, step eyebrow, Close), sticky footer, per-option badge,
  description and default. Applied to the lens configurator (post 463, `build/gen_lens_configurator.py`, 2026-09-26):
  accent progress fill, header with step eyebrow and Close, sticky footer, the draft's option descriptions, "Standard
  · 1.5" and "Send it later" pre-selected with their badges; the £268 path proven at 1440 and 375. Owed, shop polish (already listed above): colour swatches, filter panels open by
  default, the results count and sort row. For Bean: the size buttons read the real lens width (55 / 58 / 62, from
  the jpopticians sizes chosen 2026-09-25) where the draft says S / M / L. For the nav track: the floating WhatsApp
  "Ask me anything" bubble sits over the product page's "Need advice?" text at 1440.
- **Wave C task 6 (bag, checkout, prescription): BUILT and proven (see the task 6 plan's Outcome)**, `plans/2026-09-25-eye-care-bag-checkout-prescription.md`
  (Bean 2026-09-25: the prescription is the configurator's 4th question, per pair, as Glasses Direct does; pennies
  on every price, only savings drop ".00").
- Wave B framework part: all 22 items from section 2 of `.claude/reports/2026-09-24-eye-care-gap-map-recheck.md`
  are built, audited against Spec 32 and Spec 35, and committed one feature per commit. Two needed no code:
  `sgs/google-reviews` already draws the exact fraction (4.7 fills 70% of the fifth star); product fields got a
  design note (`.claude/reports/2026-09-24-product-field-bindings-design.md`: extend the existing `sgs-product/field`
  bindings source, a small build still to do).
- **Verification (Bean, 2026-09-24): no separate test page.** Each new setting is verified live at 1440/768/375
  against the draft when the real page that uses it is built, so the page builds also surface unplanned gaps.
  Checking during Wave B pages and Wave C: the draft-vs-live values each Wave B report named (in the session
  record), `filter_product_brand` filtering on the shop (unproven: reasoned, not tested) and the trust-bar drop mode's first-paint second row.
- Open decisions for Bean: (1) product-page tabs (`.claude/reports/2026-09-24-pdp-tabs-design.md`, recommended: a
  seeded starting layout each client edits in the Site Editor); (2) DECIDED (Bean, 2026-09-24: "they aren't really
  icons"): the six shape glyphs are images, not icon-registry entries. Uploaded to eye-care-test as transparent
  PNGs (3x, stroke #FAF8F5, 1.6, from the draft's SHAPES paths; sources in `sites/eye-care-ward-end/assets/shape-glyphs/`):
  media IDs pilot 148, wayfarer 149, round 150, cat-eye 151, square 152, oversized 153, alt empty (the tile label
  names the shape). Placement is a home-page build question: in the draft the glyph is an OVERLAY on a photo for 4
  tiles (a/v/c/b) and on a dark "Photo to come" tile (#2B2721) for Pilot and Oversized, and `sgs/card-grid` has one
  image slot per card; (3) whether to admit
  `disabled` as a state in `golden-controls.json` (not needed now: disabled nav items are their own manifest element).
- Known follow-ups, not blocking: RRP pill and stock label follow the default variation only (update on variation
  change belongs with the product page, Wave C); option-picker sub-labels read term meta, check against the
  seeded size data before relying on them; disabling a whole dropdown parent and the same badge/disabled treatment
  in `sgs/nav-drawer-menu`; the shared `IconPicker` has no `id` prop (Spec 35 §10); `extract-signatures.py` reads
  only `render.php`, so colours emitted from a block's helper files need an override entry (7 added).
- Phase 0: report above; 91 rows re-checked, the five grade-4 builds unchanged.
- Phase 1: buttons, reduced motion and 44px targets were already in place. The side padding now matches `secPad`
  (20px below 768, 52px from 768), verified live at 375/768/1440. Section top and bottom padding (56px mobile,
  104px otherwise) is set per section on each `sgs/container` in Phase 4, because theme.json root padding is
  sides only. Button uppercase and 0.1em spacing are per-button settings, also set in Phase 4. Sage and navy:
  Bean chose option 1 (2026-09-24). No new control is needed: the accent is part of the snapshot's global palette
  (`settings.color.palette` accent / accent-text / accent-light), which the client edits in the Site Editor
  Styles panel, as on the other client sites. Alternatives, for reference: sage `#8A9A86` / `#55654F` /
  `#E8ECE6`, navy `#3A4A6B` / `#2B3A55` / `#E4E7EE` (accent / accent-text / soft). The draft's default and its
  live render are taupe (`data-props` `accent` default `taupe`); Bean confirmed taupe (2026-09-24), which is what the snapshot already uses.
- Re-extraction risk: `theme-extractor/extract.py --merge-onto` carries `styles.css` forward but not
  `styles.spacing`, so re-extracting the Eye Care snapshot would reset the 52px side padding. Re-apply it after
  any re-extraction.
- Phase 2: `sites/eye-care-ward-end/woo-seed/` (repeatable; re-run with `wp eval-file`). 16 products, 49 colour
  variations, 40 brands, 6 attributes, UK shipping (£3.95, free over £75, local pickup). Colour is a `select`
  attribute (the installed WooCommerce 11.1.1 offers no swatch type) with hex values in `_sgs_swatch_color`.
  Product meta: `_sgs_rrp`, `_sgs_frame_eye`, `_sgs_frame_bridge`, `_sgs_frame_temple`. The draft has images for
  only 4 products. WooCommerce "coming soon" mode is off (Bean, 2026-09-24: test site), so the shop is public.
**Written for:** Bean, and any cold session or agent picking up a wave. Plain English first.

**Source of truth for the build:** the draft bundle in
`sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/`:
- `Eye Care Birmingham.dc.html`: the whole storefront. Its `<script type="application/json" data-sgs-manifest>`
  block lists pages, routes, sections in order, repeated groups, breakpoints and behavioural rules. Its
  `<script data-dc-script>` class holds the data: `PRODUCTS` (16), `BRANDS`, `REVIEWS` (13), `FAQS` (8),
  `REASONS`, `SHAPES`, `TICKER`, filter lists (`COLS`, `STYLE_LIST`, `MATERIALS`, `FTYPES`, `HINGES`, `NOSES`),
  the accent palettes `ACC`, and the lens options with their prices.
- `Frame Card.dc.html`: the shared product card.
- `WP Build Gap Map.dc.html`: 114 items, each graded 0 to 5 with the block it maps to and a best fix. The
  items are the `ROWS` array in its script; each row is `R(area, item, whatWeHave, grade, bestFix, effort)`.
- `README.md`: intent only. Where it and the files disagree, the files win.

The same draft runs live at https://mintcream-lyrebird-224487.hostingersite.com/ (use it for draft-vs-live
comparisons).

Do not confuse this bundle with the older `design_handoff_ward_end_eye_care_v2/` folder, which the clone
command in the LEDGER uses. The two drafts differ. Build from the Gap Handoff bundle.

## 1. The decision

**Problem.** Every client site has waited on the cloning pipeline. Each pipeline gap has been judged
against a draft, never against a known-right WordPress page, so each one needs a long investigation.
**Effect.** No income, and slow pipeline progress.
**Solution (Bean, 2026-09-24).**
1. Claude Design maps every visible or interactive part of the draft to a block or theme feature, with a
   gap grade and a best fix. Done: the gap map.
2. We build the Eye Care site by hand on WordPress, closing each gap as a general framework feature,
   until it is ready for the paying client.
3. The client pays.
4. The finished site becomes the pipeline's answer key (section 7).

**Scope:** the full site as drafted, including the lens configurator and prescription upload.

**Definition of done:** every page is fully functional and matches the draft at 1440, 768 and 375.
Content the client supplies is out of scope: real photography, the ninth FAQ, the real text of the
"Placeholder review" entry. The draft's WhatsApp number (`wa.me/4479605978`) is correct as drafted;
ignore the gap map row and the manifest `openItems` entry that call it "one digit short".

**Why this also helps the pipeline.** Many pipeline gaps are settings no block has. Example: the Eye
Care hero sets `height`, and `sgs/hero` has only `minHeight`. Building the real site adds those
settings, so the pipeline then has somewhere to put each value.

## 2. What happens to the in-flight pipeline work

- `plans/2026-09-24-eye-care-findings-1-8-9-design.md`: C2 shipped (commit 0deb3b10b). C1, C3, C4 and C5
  are PAUSED, with nothing half-done. They return in Phase 7 as the first test cases.
- The clone on test page 11 stays as it is. It becomes the clone side of the Phase 7 comparison.

## 3. What the gap map got wrong (checked against the code on 2026-09-24)

| Gap map claim | Actual | Evidence |
|---|---|---|
| The theme is the first job: the snapshot uses DM Serif and navy/gold | **Out of date.** `sites/eye-care-ward-end/theme-snapshot.json` already has Playfair Display and Outfit and the ink/taupe palette (primary `#141414`, accent `#9C8B78`, accent-text `#6F6152`). The gap map read axis files that have since been deleted. | the snapshot's `settings.color.palette` |
| Lens configurator: nothing exists | **Wrong.** `sgs/choice-flow`, `sgs/choice-flow-question`, `sgs/choice-flow-result` and `sgs/modal` exist (Spec 43 plan Phases 1 and 2 shipped). Not built: priced steps and add-to-bag (Phase 3), opening in a modal (Phase 4). | `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md`; `grep -rE "price\|cart\|variation" plugins/sgs-blocks/src/blocks/choice-flow` returns one hit, in `block.json` |
| Prescription upload is a large build | **Wrong.** `sgs/form-field-file` (`allowedTypes`, `maxSize`) and `plugins/sgs-blocks/includes/forms/class-form-upload.php::handle` (type check, 10MB cap, attachment post) exist. What is missing is in section 6. | read the two files |

These gap map claims were checked and are true: 87 blocks; `sgs/buybox` has no inner-block slot
(`buybox/save.js`: "No InnerBlocks"); the shop filter drawer breakpoint is hardcoded
(`theme/sgs-theme/assets/js/sgs-shop-filters.js::BREAKPOINT` = 782); the product page content part still
has food tabs and Trustpilot (`theme/sgs-theme/parts/sgs-pdp-content.html`); `sgs/hero` has `bgKenBurns`,
`bgParallax` and `overlayGradient`; `sgs/trust-bar` has `autoScrollBelow`.

**Consequence:** one row in three checked was wrong. Phase 0 re-checks every row graded 1 to 4 before
anything is built on it.

**Grade counts in the map:** 0 works today: 14. 1 configure: 31. 2 theme fix: 13. 3 block extension: 39
(27 small, 9 medium, 3 unsized). 4 new block or module: 8. 5 outside the code: 9.

The 8 grade-4 rows collapse into five builds:
1. the lens module: live price panel, price list, cart item data (3 rows);
2. `sgs/product-specs`, the specs grid on the product page's Details tab;
3. `sgs/frame-measurements`, the Sizing tab's diagrams;
4. the checkout prescription step (2 rows);
5. the wishlist.

## 4. Phases (what depends on what)

Every phase closes on the draft-vs-live check at 1440, 768 and 375. Check positions, presence, fonts,
colours and interactions, then look at the screenshots side by side. The check runs on the test site
`eye-care-test` (https://darkcyan-grouse-898606.hostingersite.com, credentials in
`.claude/secrets/eye-care-test.env`). Deploy only with
`python plugins/sgs-blocks/scripts/build-deploy.py --target eye-care-test`.

| Phase | Work | Needs Bean |
|---|---|---|
| 0 | Re-check every gap map row graded 1, 2, 3 or 4 against the code on `main`. For each row, record: the row's claim is true or false, the evidence (file and symbol, or the command run), and the corrected grade and fix. Write the result to `.claude/reports/2026-09-24-eye-care-gap-map-recheck.md`: one table per area, then a final list of every block extension and new build still needed, each with the block it touches. Read-only: no code changes. | no |
| 1 | Theme: the gap map's "Global & chrome" rows graded 2 and the "Cross-cutting" rows graded 2. That means: button presets square, 52px tall, uppercase, 13px with 0.1em letter spacing, and a 2 to 3px lift on hover; section padding per device from the draft's `secPad` values; one `prefers-reduced-motion` rule set stopping marquees, Ken Burns, parallax and reveals; touch targets at least 44px; the 1280 and 620 breakpoints as container queries. The taupe accent is the live palette. Add sage and navy (from the draft's `ACC`) as two extra style variations the client can switch to. Everything goes into the Eye Care snapshot (`sites/eye-care-ward-end/theme-snapshot.json`), never the framework `theme.json`. Other grade-2 rows belong to their page in Phase 4. | no |
| 2 | WooCommerce data on the test site, entered over WP-CLI: the Brands taxonomy from `BRANDS`; Colour as a Colour/Image attribute (test it on the installed WooCommerce version first, because a critical error is reported on 11.0.1); shape, material, frame type, hinge and nose-pad attributes from the draft's lists; the 16 `PRODUCTS` as products with their variations, measurements (`eye`, `bridge`, `temple`) as variation meta, and `rrp` as its own product meta; Local Pickup; a £3.95 flat rate; free shipping over £75. The draft's products are test data; the client's real catalogue replaces them later. | no |
| 3 | Framework features used across pages: open a modal from any link; an inner-block slot in `sgs/buybox`; a `card` variant on `sgs/whatsapp-cta`; a "current product has reviews" visibility condition; private file storage (section 6). | no |
| 4 | Pages and templates: header, footer, mega panels, mobile menu; home; lenses, about, help (with FAQ), contact; shop archive; product page; bag drawer; checkout; order confirmation; size-guide modal. Detail per item is in the gap map rows for that area. | no |
| 5 | Lens configurator and prescription upload (sections 5 and 6). | no |
| 6 | Launch readiness: install and configure the payment plugins (a Stripe plugin with Klarna and wallets, plus PayPal Payments), an accessibility audit, a performance audit, the full-site 3-width check, then Bean's eye. | yes, for the final look |
| 7 | The pipeline answer key (section 7). | no |

**Page order inside the product page:** build the zero-reviews state first. A new shop has no product
reviews, so it is what visitors see on launch day.

**The home page is a fresh build.** The home page audit
(`reports/visual-diff/eye-care-home-audit-2026-09-24.md`) found only one of eight sections correct on the
clone (the Google reviews panel). Build the home page on a NEW page, set as the site's front page. Copy the
reviews section's block markup across from page 11, then build every other section by hand. Page 11 stays
untouched as the clone.

**Framework rule for every extension.** Close each gap as a general setting that makes sense for any
client (a restaurant, a law firm). Never put Eye Care code in the framework. Eye Care copy, content and
tokens live in `sites/eye-care-ward-end/` and on the test site. These rules still apply:
- the no-inline-styling contract (Spec 32);
- the block customisation standard: every setting has an editor control;
- the prebuild gates;
- the project's seven rules in `CLAUDE.md`.

## 5. The lens configurator

Built as Phases 3 and 4 of `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` (Spec 43), plus the
live price panel beside the questions. The questions, options, help text and prices come from the draft's
lens options (search the draft for `title:'Varifocal'`).

**Lens prices: one site-wide lens price list (Bean, 2026-09-24).**
- Each option (lens use, thickness, finish) has a price.
- The chosen options' prices are added to whichever frame is in the bag.
- The list is kept on one settings page, seeded with the draft's prices. The client edits it there.
- The bag price is applied in `woocommerce_before_calculate_totals`.
- The choices travel as cart item data through `woocommerce_store_api_add_to_cart_data` and are copied
  to the order item.

**Spec change first.** Spec 43 currently prices a step only from WooCommerce product variations, and
the phase plan's Phase 3 precondition says the same. Before building, amend Spec 43 with a second
priced-step source, "add-on price list", beside "product variation", and update that precondition. Any
client can use it: a print shop's finishes, a bakery's add-ons.

Variations were rejected. Each frame would need one variation per colour × size × use × thickness ×
finish combination. Separate lens products were rejected because the bag would show two lines per pair.

Bag and order lines read, for example, "Single vision · Thin 1.67 · Polarised grey".

## 6. Prescription upload

Built on the existing file field and uploader. Three pieces:

1. **Private storage. This ships before any prescription field goes live.**
   - **Problem:** `class-form-upload.php::handle` saves files with `wp_handle_upload`, into the public
     uploads folder. The attachment post is private; the file itself is not.
   - **Effect:** anyone with the file's link can open it. A prescription is health data, a special
     category under UK GDPR.
   - **Solution:** every file uploaded through an SGS form goes to a protected folder that the web server
     refuses to serve directly. Staff open files only through a download link that checks their
     capability and a nonce. This covers all form uploads, not only prescriptions: a form upload is never
     meant to be public. Retention follows the existing `includes/forms/class-form-privacy.php` hooks.
2. **Carry the file to the sale.** A file uploaded in the configurator is stored with the bag item, then
   copied to the order. It shows as a staff-only link on the order screen and in WooCommerce's
   new-order email to the client. The contact form keeps its existing submission path.
3. **Checkout step.** WooCommerce's additional-checkout-fields API has no file type, so this step is a
   small custom checkout inner block. It renders nothing when the bag has no lens items, so the step
   count drops from four to three on its own. When it does render:
   - it shows what was chosen in the configurator: "Uploaded", "WhatsApp later" (the draft's default)
     or "Typed in";
   - it offers an upload only when the customer chose "WhatsApp later".

Prescription fields accept images only: jpeg, png and webp, set through the field's existing
`allowedTypes` setting.

## 7. Phase 7: the finished site as the pipeline's answer key

1. Record each finished page's rendered state at 1440, 768 and 375 as the answer.
2. Clone the same draft onto a separate test page on the same site (page 11 already holds one clone).
3. Compare the clone with the answer using `plugins/sgs-blocks/scripts/parity/computed-parity.js`, matching
   elements by their text. Compare rendered output, never block markup: two different block layouts can
   both be correct.
4. Each difference becomes a pipeline item, naming the block and setting the answer page used. Start with
   the paused C1, C3, C4 and C5.
5. Repeat for each later client site built this way, so the set of answer keys grows with paid work.

### Clone run notes (Phase 7)

These use the older `design_handoff_ward_end_eye_care_v2` draft and test page 11. They matter only when the clone is
re-run against the finished site.

**Test site:** https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/ (page 11; WP 7.1.1 +
WooCommerce; creds `.claude/secrets/eye-care-test.env`). Run a clone: `SGS_DEPLOY_SITE=eye-care-test`, `SSL_CERT_FILE`
and `NODE_EXTRA_CA_CERTS` = the certifi `cacert.pem` (Python's Windows TLS store rejects every hostingersite.com host),
`--mockup "sites/eye-care-ward-end/design_handoff_ward_end_eye_care_v2/Eye Care Birmingham.dc.html"` (v2 is the
current SGS-BEM draft; v1 is old and classless), `--deploy-target page:11`, `--skip-freshness-gate` (the snapshot is
extracted from v1, and a v2 extraction wrongly picks Google blue as primary; fix that before re-extracting), plus `--client eye-care-ward-end --page eye-care-birmingham
--auto-section --mode draft --skip-register --no-scaffold-new-blocks --sc-var-cache
sites/eye-care-ward-end/sc-var-hints.json --sc-var-min-confidence 0.0 --dom-shape-min-confidence 0.0 --classless-match
--classless-auto-complete` (add `--resolve-js-content` for the flag-ON comparison). Verify "what a visitor sees" with
Playwright `innerText`, never a tag-stripping regex; compare runs by (selector, block) identity, never `boundary_id`;
verify a stage claim by finding one string it should have produced. Files shared between bash and python: relative
names (Git Bash `/tmp` and Python `/tmp` are different folders).

**Spec 33 upgrade (done).** Plan `plans/archive/2026-09-19-front-f-spec33-upgrade.md`. Snapshot `sites/eye-care-ward-end/
theme-snapshot.json` (regenerate: `theme-extractor/extract.py --client eye-care-ward-end --draft "<draft>" --merge-onto
theme/sgs-theme/theme.json`; the extractor reads the README beside the draft, which is now tracked). Deploy order on a
test site: `build-deploy.py --target eye-care-test --theme-only` first (it puts the framework `theme.json` back), THEN
`push-theme-snapshot.py --client eye-care-ward-end --target u945238940@141.136.39.73 --target-domain <host> --yes`. Saved
values: `sync-business-info.py --draft "<draft>" --target-domain <host> --push --map-out
sites/eye-care-ward-end/site-info-placeholder-map.json`. A Claude Design snapshot from before the second freshness key
will halt a clone until re-extracted (intended). Scope (D1121): Spec 33 runs on a client's source draft only (the snapshot
records `_sgsExtractor.source_draft`); any other draft inherits the saved snapshot, and re-extracting from a different draft
needs `--replace-source`. Mama's snapshot has no `source_draft` until it is next regenerated.

**Screen route (D1124, built).** A multi-screen Claude Design draft now clones ONE screen: `--screen <label>`, else the
README's route `/` checked against the draft's default marker; other screens are skipped and reported (`other-route-view`),
and a classless top-level section on the cloned screen is admitted as the container. Live Eye Care test page: 5 of 8
homepage sections (was 1), no other-screen text, raw `{ }` text 53 (was 93). Still missing: b3, b4, b6 (the FR-44-1 review
queue) and the raw layout bindings in attributes (`padding` `{ secPad }`; the README's Spacing section can resolve them).
Mama's is untouched (identical markup route on/off). Draft manifest (D1123, read-only): `scripts/draft-manifest/manifest.py`
lists screens, kinds, entities, references and a build order; report `reports/2026-09-20-eye-care-draft-manifest.md`. Next:
the per-client entity registry, then clone About, Help and Contact with `--screen`. Mama's clones currently halt at the
freshness gate because another session's uncommitted Mama's snapshot carries a different draft's hash.

**Layout bindings (D1128).** Guard BUILT: a style value that is an unresolved `{{ }}` binding is dropped and reported, so the
homepage sections no longer carry junk attributes (18 to 0). Evaluator BUILT and WIRED (A1, D1132, `faaf79f0d`): `orchestrator/script_bindings.py` turns the draft's own width rules into mobile, tablet and desktop values
(75 of 140 names, 0 mismatches against the measured render), found by what the script reads so renamed flags work; Bean's 10px / 768 breakpoint rule is
`orchestrator/breakpoint_snap.py`; Stage -1.4 hands the map to the converter. Live test page: padding and grid columns match the draft and Bean's online copy of the
original. Not done: 7 names whose breakpoint stays inside a device tier (logged as gaps), and the content bindings (A2). Design: `plans/archive/2026-09-20-A1-wire-evaluator-design.md`.

**Open, in order:**
0. *NEXT: work through the audit's findings in its fix order* (`reports/visual-diff/eye-care-home-audit-2026-09-24.md`;
   findings 4, 5, 6 done). Next is findings 1, 8, 9 (hero classless interior dropped; `<ol>` items lost; media image
   lost; `<button onClick>` links not recognised as buttons): a converter change, so write a design for Bean first
   (rule 7). Then 2 and 7 (JS-array content), then 3 (header/footer). Re-audit with the draft-vs-live method
   (`plugins/sgs-blocks/scripts/parity/draft-vs-live/README.md`) after each fix, at 1440/768/375.
1. *Problem 1, missing sections.* The "14 non-BEM" boundaries are classless sections gated on a hint (the draft has ONE
   `class=`): 4 homepage sections (b5, b7, b8, b9), 8 other routed views, 2 chrome. Spec 44 §11: proposed (A) admit any
   classless boundary as the container default, (B) only the default routed view goes on the page, (C) fix the halt
   message and report lost text. NOT designed; needs a design gate; must not change Mama's. Not proven: that the large
   sections convert cleanly. Reports: `reports/2026-09-19-inv-non-bem-sections.md`.
2. *Runtime `{{ }}` bindings (Stage 2) and the last part of the Spec 33 plan.* Kinds: site settings (`{{ phone }}`), page
   copy, cart/checkout state, styling values. Keeping the `<sc-for>` lands only item 0 of N. The saved-settings half is the
   placeholder map above; the pipeline must read it and insert the values. Success: visible placeholders 93 -> 0 for content
   bindings.
3. *Cloned buttons paint transparent* (26 measured on the live page, including one with `colourBackground` `#141414`):
   block or converter side, not the theme; investigate before Task 3 closes.
4. Needs Bean directly: the 15 `classless-review` boundaries (`operator-review.html`), design-gate approvals.

**Small gaps (not assigned):** other consumers of `args.mockup` after the Stage -2 reassign not audited for the
JS-resolver wrong-directory class; the primary button's hover text keeps the framework value (Spec 33 Known limits);
`test_site_info_binding.php` has 11 failures that exist at HEAD; `measure.js` (332 lines) and `extract.py` (over 700) exceed
the file-length guide; untracked under `sites/eye-care-ward-end/`: the 3 MB offline draft copy, `sc-var-hints.json`,
`uploads/`, `CLAUDE.md` (Bean decides). Front C residual: the AI-fallback tier (Spec 44 §11) stays parked (Bean).

## 8. Running it: waves, parallel work, models

The phases are a dependency order, not a queue. Independent work runs at the same time.

| Wave | Runs in parallel | Starts when |
|---|---|---|
| A | Phase 0 re-check, one agent per gap-map area: 9 areas, 9 agents · Phase 1 theme · Phase 2 WooCommerce data | now |
| B | Phase 3 features, one agent each · the small block extensions from Phase 0's list, one agent per block · header, footer and content pages (home, lenses, about, help, contact) | Phase 0's report exists |
| C | Shop archive · product page · bag and checkout · lens configurator and prescription | the Wave B features each one uses are merged |
| D | Phase 6 launch readiness · Phase 7 answer key | Wave C is done |

**Rules that keep parallel work safe on this shared tree:**
- One agent per block directory or per page. Two agents never edit the same file.
- Agents return their work uncommitted. The main session reads every diff, runs the build and the gates,
  commits with explicit paths, and deploys.
- One build and one deploy at a time: they share `plugins/sgs-blocks/build/` and the test site.
- Pages on the test site are separate posts, so page builds can run side by side.
- Every agent's brief contains:
  - the draft section to match;
  - its gap map rows;
  - the rules above (no inline styling, an editor control for every setting, the "any client" test);
  - the 3-width check it must pass.

**Models:**
- **Main session (Opus):** co-ordination, design gates, reading every diff, live verification.
- **Sonnet agents:** block extensions, framework features, page and template builds, the lens configurator.
- **Haiku agents:** the Phase 0 re-check, and WooCommerce data entry over WP-CLI.
- Run one session per wave, to keep the main session's context small.

## 9. Risks

| Risk | Handling |
|---|---|
| More gap map rows are wrong | Phase 0 re-checks every row graded 1 to 4 before building |
| Hand-built pages drift from the draft | The 3-width check per phase, then Bean's eye |
| Eye Care shortcuts leak into the framework | The "any client" test and the prebuild gates on every extension |
| The answer key is only one valid layout | Phase 7 compares rendered output, not markup |
| The WooCommerce Colour/Image attribute errors on the installed version | Tested first in Phase 2 |
| Health data is exposed | Private storage ships before any prescription field goes live |
