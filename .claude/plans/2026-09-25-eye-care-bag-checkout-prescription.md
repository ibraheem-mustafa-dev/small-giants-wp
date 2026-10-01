---
doc_type: plan
plan_id: eye-care-bag-checkout-prescription
project: small-giants-wp
parent: plans/2026-09-24-eye-care-hand-build-design.md (Wave C task 6, section 6)
date: 2026-09-25
status: built and proven on eye-care-test (2026-09-25); checkout styling and the parked items below remain
---

# Eye Care: bag drawer, checkout and the prescription step

Wave C task 6 of the hand build. The draft's bag drawer (`sgs-bag-drawer`), checkout sections
(`sgs-checkout-express`, `-contact`, `-delivery`, `-prescription`, `-payment`) and the configurator's
last question ("Your prescription": Send it later / Upload a photo / Type it in, with SPH/CYL/AXIS per eye).

## What already exists (read from the code, 2026-09-25)

| Piece | State |
|---|---|
| Bag drawer | `sgs/cart` drawer mode (`includes/helpers-cart-panel.php`, `src/blocks/cart/panel-render.js`) refreshes from the Store API on `wc-blocks_added_to_cart`, which the configurator's add-to-bag fires. **Gap:** `item-row-template.js::itemRowHtml` shows name, image, quantity and total only, so the lens line ("Distance · Thin · 1.6 · Polarised") never shows in the drawer. |
| Lens line on the order | Done: `Addon_Price_List_Cart` puts the summary in `item_data` (cart and checkout pages) and order line meta. |
| Private upload storage | Done: `class-form-upload.php::handle` writes outside the web root (`sgs-private-uploads/`), or to a deny-all folder in uploads, with random file names and private attachments. Plan section 6 part 1 describes this as unbuilt; it is built. |
| Staff download link | Registered from `sgs-blocks.php` (`includes/forms/class-form-download.php`: capability + nonce + provenance check, `readfile`). |
| Retention | Only on a personal-data erasure request (`class-form-privacy.php::erase_data`). No time-based deletion. |
| Checkout | The theme's stock WooCommerce block checkout (`parts/sgs-checkout-content.html`). No custom checkout blocks exist yet. |
| Prices | Full amounts with pennies everywhere, cart and checkout included; only a whole-pound saving drops ".00" ("Save £32"). Bean 2026-09-25; `sgs_saving_trim_zeros`. Nothing to build at checkout. |

## Decisions (Bean, 2026-09-25)

**D1. The prescription is given in the configurator, per pair.** Bean asked which is better for UX; the UK leader
Glasses Direct asks for it straight after the vision type, per pair, with "enter now", "send it later" or "use a
saved one" (glassesdirect.co.uk/help/how-to-order), and Specsavers collects it per pair while ordering. Per pair also
covers two pairs for two people. So: the configurator's 4th question, "Your prescription" (Send it later, the
default / Upload a photo / Type it in), recorded on that bag line; checkout step 3 shows each pair's choice and offers
an upload only for a pair set to "Send it later", never a second form.

**D2. Pennies everywhere.** Prices, cart and checkout show full amounts; only savings drop ".00". The block checkout
needs no price work.

## Outcome (2026-09-25, all proven in a real browser on eye-care-test product 71)

1. **Configurator question 4 DONE**: "Your prescription" routes to one purchase step per path (Send it later /
   Upload a photo with a required file field / Type it in with six SPH-CYL-AXIS boxes, both SPH required), plus a
   "Frame only" step for No prescription. Framework: Spec 43 v1.6.0 FR-43-21 (`includes/flow-fields/`,
   `choice-flow/flow-fields.js`, `POST /sgs/v1/cart/upload`, proxy `fields` arg); the step counter counts questions
   only. Each path lands ONE bag line at £268 with its rows ("Your prescription: Type it in", "Right SPH: -2.25" ...,
   or "Photo of your prescription: Photo uploaded"). Someone else's file ID is refused (409); an empty required
   field blocks the add in the browser.
2. **Bag drawer lines DONE**: `sgs/cart` rows list the variation and every item-data row.
3. **Staff download link DONE**: `Form_Download` was already registered; the order screen shows "Download uploaded
   file" (admin fetch 200 image/png), the same link without a staff login is refused, and the staff new-order email
   says a file is waiting and links the order.
4. **Checkout prescription step: NOT BUILT, by design.** With the prescription captured per pair in the
   configurator (D1), checkout shows each pair's rows in the order summary; the draft's "Send it later" copy
   promises a WhatsApp link after ordering, so a second upload form at checkout would repeat the question.
5. **Store fixed on the way**: store country was US:CA and the UK zone's three methods had no settings (a free "Flat
   rate"); now GB-only with Tracked UK delivery £3.95, Free UK delivery over £75, Collect in Birmingham
   (`woo-seed/seed.php` fixed to write each method's own settings). UK checkout hides County: WooCommerce 11.1's
   block checkout silently refused Place order with the optional County empty
   (`includes/woocommerce-checkout-address.php`). Every front-end file upload fataled (admin include missing,
   fixed in `Form_Upload::handle`), and a deleted upload left its private file behind (fixed with a
   `delete_attachment` hook).
6. **Verified**: order placed end to end with Cash on Delivery switched on for the test only (test orders deleted,
   Cash on Delivery off again).

Still open: the checkout page's look against the draft's sections (express, contact, delivery, prescription,
payment), for the Wave C design review; a real payment gateway (none is enabled on eye-care-test, so no shopper can
pay yet: a launch item for Bean).

Parked (Bean decides): (1) time-based retention of uploaded prescriptions, including files uploaded in a bag that
was never ordered (an upload happens before add-to-bag, so abandoned bags leave private files behind); needs a
retention period, e.g. 2 years for orders and 7 days for never-ordered uploads. (2) "Add prescription lenses" link on
a frame-only bag line (the draft's `canAddLens`): the drawer is framework-wide and has no way to know a product has a
configurator yet.
