# Eye Care Birmingham: build the real site first, then use it to test the pipeline (2026-09-24)

Status: DESIGN FOR BEAN'S REVIEW. Nothing built. Written for Bean; plain English first.
Inputs: `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/` (the new draft
`Eye Care Birmingham.dc.html` with its `data-sgs-manifest` block, `Frame Card.dc.html`,
`WP Build Gap Map.dc.html` with 114 graded items, `README.md`).

## 1. The decision

**Problem.** Every client site has waited on the cloning pipeline. Each pipeline gap is judged
against a draft, never against a known-right WordPress page, so each one needs a long investigation.
**Effect.** No income, and slow pipeline progress.
**Solution (Bean, 2026-09-24).**
1. Claude Design maps every visible or interactive part of the draft to a block or theme feature,
   with a gap grade and a best fix (done: the gap map).
2. We build the Eye Care site by hand on WordPress, closing each gap as a proper framework
   feature, until it is ready for the paying client.
3. We get paid.
4. The finished site becomes the pipeline's answer key. We clone its draft onto a separate test page,
   compare the two rendered pages, and every difference is a pipeline gap with a known destination,
   because the working page already shows which block and setting it should land in.

**Scope: the full site as drafted** (Bean, option b), lens configurator and prescription included.

**Why this also helps the pipeline.** Many pipeline gaps are settings no block has (this morning's
example: the hero has `minHeight` but no `height`). Building the real site adds those settings
first, so the pipeline then has somewhere to put each value.

## 2. What the pipeline work does now

- The converter design for findings 1, 8 and 9 (`plans/2026-09-24-eye-care-findings-1-8-9-design.md`):
  C2 shipped (0deb3b10b). C1, C3, C4 and C5 **pause**, with nothing half-done. They come back in
  Phase 7 as test cases, with the finished site as the answer.
- Front F in the LEDGER changes from "clone Eye Care" to "build Eye Care, then test the clone
  against it".

## 3. What is already true (checked against the code today)

| Claim | Status | Evidence |
|---|---|---|
| 87 blocks | true | `ls plugins/sgs-blocks/src/blocks/*/block.json \| wc -l` |
| Theme is "the first job" (DM Serif, navy/gold) | **out of date** | `sites/eye-care-ward-end/theme-snapshot.json` already has Playfair Display + Outfit and the ink/taupe palette (primary `#141414`, accent `#9C8B78`, accent-text `#6F6152`). The gap map read the deleted axis files. |
| Playfair, Outfit, Roboto self-hosted | true | `ls theme/sgs-theme/assets/fonts` |
| `sgs/buybox` has no inner-block slot | true | `buybox/save.js` header: "Dynamic block … No InnerBlocks." |
| Shop filter drawer breakpoint hardcoded at 782 | true | `theme/sgs-theme/assets/js/sgs-shop-filters.js::BREAKPOINT` |
| Product page still has food tabs and Trustpilot | true | `theme/sgs-theme/parts/sgs-pdp-content.html` |
| Hero has Ken Burns, parallax, overlay gradient | true | `hero/block.json` attributes |
| Trust bar marquee below a width | true | `trust-bar/block.json::attributes.autoScrollBelow` |
| Lens configurator: "nothing exists" | **wrong** | `sgs/choice-flow`, `choice-flow-question`, `choice-flow-result` and `sgs/modal` exist (Spec 42/43 plan Phases 1 and 2 shipped). Priced steps and add-to-bag (Phase 3) and modal delivery (Phase 4) are not built: `grep price\|cart\|variation src/blocks/choice-flow` finds 1 hit, in block.json. |
| Prescription upload is a large build | **wrong** | `sgs/form-field-file` (`allowedTypes`, `maxSize`) and `includes/forms/class-form-upload.php::handle` (type check, 10MB cap, private attachment) exist. |

**Consequence:** the gap map's grades are a strong start but not trusted row by row. Phase 0
re-checks every row graded 1 to 4 before we build on it.

Grade counts from the map: 14 work today, 31 configure, 13 theme fix, 39 block extension (27 small,
9 medium, 3 unsized), 8 new build, 9 outside the code. After the corrections above, the real new builds
are about 5.

## 4. Build order

Each phase ends with the draft-vs-live check at 1440, 768 and 375 (positions, presence, fonts, then
looking at the screenshots), on `eye-care-test`
(darkcyan-grouse-898606.hostingersite.com), deployed only through `build-deploy.py --target eye-care-test`.

| Phase | What | Size | Needs Bean |
|---|---|---|---|
| 0 | Re-check the gap map rows graded 1 to 4 against main (parallel read-only agents, one per area); correct the grades; list the true block extensions | small | no |
| 1 | Theme remainder: square 52px buttons, section rhythm, the three accent palettes as token sets, reduced-motion coverage | small | no |
| 2 | WooCommerce data on the test site: Brands taxonomy (40), Colour as a Colour/Image attribute (test on the installed version first), shape, material, frame type, hinge, nose pads, per-variation measurements, RRP meta, Local Pickup, £3.95 flat rate, free over £75; the 16 draft products entered | small to medium | the real product list, when it exists |
| 3 | Cross-cutting framework features: open a modal from any link; buybox inner-block slot; WhatsApp `card` variant; "current product has reviews" visibility condition; private file storage (section 6) | medium | no |
| 4 | Pages and templates: header, footer, mega panels and mobile menu; home; lenses, about, help, FAQ, contact; shop archive (ten collapsible filter groups, drawer at 1060); product page (new eyewear content part, specs grid, measurement diagram); bag drawer; checkout; order confirmation; size guide modal | large (many small pieces) | no |
| 5 | Lens configurator and prescription (sections 5 and 6) | medium | the lens price list |
| 6 | Launch readiness: the "outside the code" items, accessibility and performance audits, full-site check at 3 widths, Bean's eye | small | yes |
| 7 | Pipeline answer key (section 7) | ongoing | no |

Order within Phase 4 follows the draft's own priority: the zero-reviews product state first (it is the
launch-day state), then the product page, shop, home, content pages.

**How the home page starts.** Hybrid: sections the audit
(`reports/visual-diff/eye-care-home-audit-2026-09-24.md`) found correct are kept from the clone; the
rest are built by hand. Every other page is a fresh build (the pipeline cannot build templates or
linked pages yet).

**Framework rule for every extension.** Each gap closes as a general setting that makes sense for any
client (a restaurant, a law firm), never Eye Care code in the framework. Eye Care content, copy and
tokens live in `sites/eye-care-ward-end/` and on the test site. The no-inline-styling contract, the
block customisation standard (every setting has an editor control) and the prebuild gates still apply.

## 5. The lens configurator

Built as Phases 3 and 4 of `plans/2026-09-14-spec42-43-form-choiceflow-phase-plan.md` (Spec 43), plus
the live price panel beside the questions.

**Decision for Bean: how lens prices are stored.**
- **Problem.** Spec 43 Phase 3 prices a step from WooCommerce product variations.
- **Effect.** For glasses, each frame would need a variation for every colour × size × lens use ×
  thickness × finish combination: hundreds per frame, re-entered on every product.
- **Options.**
  - **(a) Recommended: one site-wide lens price list** (use, thickness, finish, each with a price),
    added to whichever frame is chosen. It matches the draft ("from +£59" on any frame). Stored as a
    settings page; the bag price is applied in `woocommerce_before_calculate_totals`; the choices
    travel as cart item data via `woocommerce_store_api_add_to_cart_data`. Spec 43 gains a second
    priced-step source ("add-on price list") beside "product variation", so other clients (a print
    shop's finishes, a bakery's add-ons) get it too.
  - **(b)** Keep Spec 43 as written and model lenses as variations. Rejected: the combinations multiply.
  - **(c)** Lenses as separate WooCommerce products added alongside the frame. Workable, but the bag
    shows two lines per pair and the frame/lens link has to be kept by hand.

Cart and order lines read "Single vision · Thin 1.67 · Polarised grey", from the stored item data.

## 6. Prescription upload

Uses the existing file field and uploader. Three pieces of work:

1. **Private storage (the one piece that matters).**
   - **Problem:** `class-form-upload.php::handle` stores files through `wp_handle_upload`, into the
     public uploads folder. The attachment record is private; the file is not.
   - **Effect:** anyone with the link can open it. A prescription is health data (UK GDPR special category).
   - **Solution:** a file field can be marked private. Its uploads go to a protected folder that the
     web server refuses to serve directly, and they are opened only through a staff-only download link
     (capability check plus nonce). It applies to every form that takes files, not only this one.
     Retention follows the existing `class-form-privacy.php` hooks.
2. **Carry it to the sale.** The configurator's upload is stored with the bag item, copied to the
   order, and shown as a staff-only link on the order screen and in WooCommerce's own new-order email
   to the client. The contact form keeps its existing submission path.
3. **Checkout step.** WooCommerce's additional-checkout-fields API has no file type, so the step is a
   small custom checkout inner block. It shows what was chosen in the configurator ("Uploaded",
   "WhatsApp later", "Typed in") and offers an upload only when the customer chose "later". It renders
   nothing when the bag has no lens items, so the step count drops from four to three by itself.

Images only for prescriptions (jpeg, png, webp, heic if the server supports it). The field's existing
`allowedTypes` setting does this; no new mechanism.

## 7. Phase 7: the finished site as the pipeline's answer key

1. Freeze each finished page's rendered state (what a visitor sees at 1440, 768 and 375) as the answer.
2. Clone the same draft onto a separate test page on the same site.
3. Compare the clone with the answer using the existing computed-parity tool
   (`plugins/sgs-blocks/scripts/parity/computed-parity.js`), matched by text content. Compare
   **rendered output, never block markup**: two different block layouts can both be correct.
4. Every difference becomes a pipeline item with its destination named (the block and setting the
   answer page used). The paused C1, C3, C4 and C5 go here first.
5. Repeat for each later client site built this way, so the answer-key set grows with paid work.

## 8. Decisions for Bean

1. **Lens prices** (section 5): (a) site-wide price list (recommended), (b) variations, (c) separate products.
2. **Where the real site lives:** build on `eye-care-test`, then move to the client's own domain at
   launch? Where is the client's hosting? (Needed by Phase 6, not before.)
3. Anything in the gap map's "outside the code" list you already have answers for (payment gateway,
   WhatsApp number, photos, the ninth FAQ).

## 9. Risks

| Risk | Handling |
|---|---|
| Gap map rows are stale like the theme row | Phase 0 re-checks every row graded 1 to 4 before building |
| Hand-built pages drift from the draft | 3-width draft-vs-live check per phase, then Bean's eye |
| Eye Care shortcuts leak into the framework | Every extension passes the "any client" test and the existing prebuild gates |
| The answer key is only one valid layout | Phase 7 compares rendered output, not markup |
| Colour/Image attribute bug reported on WooCommerce 11.0.1 | Test on the installed version in Phase 2 before relying on it |
| Health data exposure | Private storage (section 6) ships before any prescription field goes live |

## 10. Housekeeping on approval

Record a D-number (re-check the ceiling in the same command), update the LEDGER Front F and Human
Summary, and mark findings design C1/C3/C4/C5 as paused. No parking entries.
