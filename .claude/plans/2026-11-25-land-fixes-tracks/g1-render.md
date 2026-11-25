# Track G1 (label g1-render; plan Task 5): render fixes on every site

Evidence: `i9-logos.out` and `i13-eyecare.out` (both short; screenshots in their folders). Each item is a fix (applies to every site): run render-scope and name the pages.

1. `sgs/card-grid`: the shared media renderer prints the frame's padding, height and ratio on the `<img>` too (`plugins/sgs-blocks/includes/media/atoms/media-padding.php`, `sizing.php`, and their JS editor twins), cropping logos on the front end and shrinking them in the editor. The card grid tells the renderer the frame owns padding, height and ratio, in PHP and JS. Check `form-field-tiles` (`tilePadding`) and `buybox` (`previewPadding`) for the same fault and fix them the same way if hit.
2. `sgs/product-card`: the "photo to come" placeholder keeps a fixed 220px height; it takes the photo's per-device ratio or height from the same attributes (`render.php` prints it). Cards with neither keep 220px.
3. `sgs/brand-strip`: `src/blocks/brand-strip/logo-media.php` passes `'item_cap' => $max_height` into `includes/media/render-slot.php`, which prints `sizes="min(22px, …)"`; logos with resized copies then draw 22px wide. Pass the slot width (`logoMaxWidth`) instead. `item_cap` is shared code: check its other callers.

Done when, on a private scratch mirror of `local-eye-care` running this branch's build (or the page-injection method in `i13`): Eye Care's Brands panel logos show whole at the current size; every product card's image area is equal at 375, 768 and 1440; GUCCI and PRADA render about 120px wide and COACH about 74px (held by the 22px height cap, `i13` section 2), every other logo unchanged.
