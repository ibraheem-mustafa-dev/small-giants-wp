---
doc_type: plan
plan_id: eye-care-bag-checkout-prescription
project: small-giants-wp
parent: plans/2026-09-24-eye-care-hand-build-design.md (Wave C task 6, section 6)
date: 2026-09-25
status: draft, waiting on Bean's two decisions below
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
| ".00" at checkout | The block Cart, Checkout and Mini Cart format prices in JavaScript and ignore `woocommerce_price_trim_zeros`, so they show £139.00 while the rest of the site shows £139. The configurator panel now follows the setting (c4250eb02). |

## Decisions for Bean

**D1. Where the shopper gives their prescription.**
- (a) **Both places, as the draft shows.** The configurator's 4th question records the choice (and the photo or
  numbers); checkout step 3 shows it and offers an upload to anyone who picked "Send it later". Most faithful;
  the photo has to be uploaded before the item goes in the bag, then carried on the bag line to the order.
- (b) **Checkout only.** The configurator ends at "Add to bag"; checkout step 3 asks once per order (Send it later /
  Upload / Type it in). One upload path, one set of numbers per order, about half the work. Differs from the draft's
  4-question configurator.
- Recommendation: **(b)**. One prescription per order covers almost every real order (one person's glasses), the
  upload happens once in one place, and the draft's "it can wait" message fits checkout better. (a) can be added
  later without undoing (b).

**D2. Prices at checkout (£139.00 versus £139).**
- (a) **Keep the block checkout and accept ".00" there.** No extra work; the one place prices differ.
- (b) **Keep the block checkout and make it drop ".00" too.** Unproven how: WooCommerce's checkout price filters
  wrap an already-formatted price (a `<price/>` placeholder) rather than choose its decimals, which come from the
  currency data the Store API sends. Needs a short research step (WooCommerce source) before it is promised.
- (c) **Switch to the classic checkout.** `wc_price` everywhere, but the draft's sectioned layout and the
  prescription step become template overrides instead of blocks.
- Recommendation: **(a) now, (b) as a follow-up** once the research says it can be done cleanly for every client.

## Steps (after D1 and D2; with D1 = b)

1. **Bag drawer lines** (~10 min): `item-row-template.js` shows each line's `item_data` (the lens summary) and, for a
   frame with no lenses, the draft's "Add prescription lenses" link back to the product's `#lens-configurator`.
2. **Staff download link on** (~10 min): load `class-form-download.php`; the order screen and WooCommerce's new-order
   email show a staff-only link per uploaded file.
3. **Checkout prescription block** (~30 min): a checkout inner block (`registerCheckoutBlock`, Store API extension
   data for mode + attachment ID + typed values, saved to order meta). It renders nothing when the bag has no lens
   line, so checkout drops to three steps on its own. Upload goes through the private uploader (images only: jpeg,
   png, webp); "Send it later" shows the draft's WhatsApp note.
4. **Price format** (D2 = b only, after its research step): the block cart and checkout follow
   `woocommerce_price_trim_zeros`.
5. **Checkout layout** (~15 min): the draft's section order and headings in the Eye Care checkout template copy.
6. **Verify**: a lens order end to end in a real browser (bag drawer line, checkout step, upload stored outside the web
   root, staff link on the order), a frame-only order (three steps), and a direct request for the file's URL refused.

Parked: time-based retention of prescription files (recorded here; needs Bean's retention period, e.g. 2 years).
