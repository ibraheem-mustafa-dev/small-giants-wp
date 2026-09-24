# Eye Care Birmingham: build the real site first, then use it to test the pipeline

**Status:** APPROVED by Bean 2026-09-24 (D1149). **Wave A DONE 2026-09-24.** Next: Wave B (section 8), working
from section 2 of `.claude/reports/2026-09-24-eye-care-gap-map-recheck.md` (the Phase 0 build list).
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
