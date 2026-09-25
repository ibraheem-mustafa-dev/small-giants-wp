---
doc_type: plan
plan_id: eye-care-bag-checkout-prescription
project: small-giants-wp
parent: plans/2026-09-24-eye-care-hand-build-design.md (Wave C task 6, section 6)
date: 2026-09-25
status: ready to build (Bean decided D1 and D2, 2026-09-25)
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
| Staff download link | Written but **not switched on**: `includes/forms/class-form-download.php` (capability + nonce + provenance check, `readfile`). |
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

## Steps

1. **Configurator question 4** (~20 min): a new `sgs/choice-flow` step for the prescription: three options, an upload
   through the private uploader (images only: jpeg, png, webp) and the six typed boxes (SPH, CYL, AXIS per eye).
   The answer rides on the add-to-bag request and is stored with the cart line (mode, attachment ID, typed values),
   then copied to the order line. Framework work: a question option that reveals an upload or a small field group,
   and the add-to-bag payload carrying it; validated server-side like the add-on pairs.
2. **Bag drawer lines** (~10 min): `item-row-template.js` shows each line's `item_data` (lens summary and
   prescription status) and, for a frame with no lenses, the draft's "Add prescription lenses" link to the product's
   `#lens-configurator`.
3. **Staff download link on** (~10 min): load `class-form-download.php`; the order screen and WooCommerce's new-order
   email show a staff-only link per uploaded file.
4. **Checkout prescription step** (~20 min): a checkout inner block that lists each lens pair's prescription status
   and offers an upload for "Send it later" pairs; renders nothing without a lens line (checkout drops to three
   steps).
5. **Checkout layout** (~15 min): the draft's section order and headings in the Eye Care checkout template copy.
6. **Verify**: a lens order end to end in a real browser (bag drawer line, checkout step, upload stored outside the web
   root, staff link on the order), a frame-only order (three steps), and a direct request for the file's URL refused.

Parked: time-based retention of prescription files (recorded here; needs Bean's retention period, e.g. 2 years).
