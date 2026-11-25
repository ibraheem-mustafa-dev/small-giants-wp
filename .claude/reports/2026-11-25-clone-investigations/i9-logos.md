# i9-logos: why the Brands mega menu logos are cut off on Eye Care's front end

Read-only throughout. Nothing was saved, published or written on eye-care-test (one login, page loads and wp-cli reads only). Screenshots and scripts are in `E:\sgs-tmp\general-cloning\investigate\i9-logos\`.

## Answer in brief

- PROVEN: this is a block fault, not this post's settings. The card grid prints the same padding and height twice, once on the card's picture frame and once on the `<img>` inside it. Any card grid that sets `imageHeight` together with a top or bottom `imagePadding` crops its pictures on every site.
- PROVEN: `main` has the same fault. The plugin on the site is commit `cf6ca94e5` (22 Nov, from `~/.sgs-deploy-marker-eye-care-test.json`), which already contains the 11 Nov change that caused it (`509800f7c`). Between that commit and `main`, nothing under `plugins/sgs-blocks/includes/media/` or the card grid's PHP changed (`git diff --name-only cf6ca94e5 main -- ...` lists only JS and lint churn).
- PROVEN (simulated in the live page, nothing saved): removing the duplicated padding, height and ratio from the `<img>` shows every logo whole, at exactly the size it has now, with 0px cropped on all 12 tiles at 1440 and 768. The logos move up 14px into the empty space above them.
- The editor shows the logos smaller for the same reason, through a different path (section 2).

## 1. Front end, 1440 and 768

How the menu opens: at 1440 the header's "Brands" button (`button.sgs-nav-bar-menu__mega-trigger`) opens the panel on hover. At 768 the header collapses to a "Menu" button that opens the nav drawer, where "Brands" is a plain link to the shop page: the mega panel is never shown at 768 on this site (its grid sits at `display: none`, 0x0). The computed CSS is identical there (img padding 14px 14px 0, height 46px, frame 46px). To check the geometry anyway I forced the hidden panel visible in the page (page-local only): the same 13 to 14px crop (Ray-Ban 13px, Ferrari 14px).

Ray-Ban tile at 1440 (`front-1440-grid.png`, `front-1440-menu.png`):

| Element | Box (w x h) | Crop-relevant computed styles |
|---|---|---|
| `a.sgs-card-grid__item` (the card) | 266 x 84.25 | `display: flex; flex-direction: column; overflow: hidden` |
| `div.sgs-card-grid__image-wrap` (the frame) | 266 x 46 | `box-sizing: border-box; height: 46px; aspect-ratio: auto; padding: 14px 14px 0; overflow: hidden` |
| `span.sgs-media-group` | 238 x 32 | `height: 100%` of the frame's content box |
| `img.sgs-media-el` | 238 x 46 | `box-sizing: border-box; height: 46px; aspect-ratio: 16/9; padding: 14px 14px 0; object-fit: scale-down; overflow: clip` |

Natural sizes: Ray-Ban 65x29, Oakley 80x29, Versace 80x19, Balenciaga 65x29, Ferrari 210x280, Gucci and Prada 1440x237 and 1440x258 (wide files with white margins).

What happens: the frame is 46px tall and its own 14px top padding leaves a 32px content box. The `<img>` starts at that content box (y = 14) but is also given `height: 46px` (so it overflows the frame by 14px) and its own `padding-top: 14px` (the logo is pushed down another 14px). The logo's top lands 28 to 30px below the frame's top edge, and the frame clips at 46px. A 29px Ray-Ban shows 16px of itself (about 55%); Gucci, Prada and Ferrari lose 14px. Measured crop before the fix: 13 to 14px on every tile.

The rules doing it (read from the live stylesheets):
- Frame: `.sgs-cg-654a5d12 .sgs-card-grid__image-wrap { padding: 14px 14px 0 }` and `{ height: 46px; aspect-ratio: auto }`, from `card-grid/render.php` (the `imagePadding` block) and `card-grid/render-item-media.php::sgs_card_grid_frame_css`.
- Picture: `.sgs-cg-654a5d12-media .sgs-media-el { padding: 14px 14px 0 }` and `{ aspect-ratio: 16 / 9; height: 46px }`, printed by the shared media renderer (the `media-padding` and `sizing` emitters). They have the same specificity as `card-grid/style.css`'s `.sgs-card-grid__image-wrap .sgs-media-el { height: 100% }` and print later, so they win.

## 2. Block editor canvas

Logged in with the site's admin login through `secretsOf`, opened post 176 (`sgs_mega_menu`), measured, changed nothing (`editor-grid.png`, `editor-full.png`, `editor-measure.json`). The canvas was 1074px wide, so tiles were 211px wide.

- Frame: 210.8 x 46, padding 14/14/0 (same as the front end).
- `<img>` (a direct child of the frame in the editor, classes `sgs-media-el sgs-card-grid__image`): 182.8 x 32, padding 14px 14px 0, `object-fit: scale-down`.
- Why it differs: the editor prints the picture's rules scoped to the image itself (`.sgs-cg-6a409485-i0 { height: 46px; padding: 14px 14px 0 }`, one class), because there is no `.sgs-media-group` span around it. `style.css`'s `.sgs-card-grid__image-wrap .sgs-media-el { height: 100% }` (two classes) outranks that 46px, so the img is 100% of the 32px content box. With its own 14px padding inside, the logo area is only 18px tall and `scale-down` shrinks Ray-Ban to about 40x18. That is the "half size". Nothing is cropped there because the img fits inside the frame.
- So both views come from the same duplicated padding and height. On the front end the equal specificity and later print order let the 46px height through (overflow and crop); in the editor it loses (shrink).

UNPROVEN: that the same fix also corrects the editor. I simulated the fix on the front end only, and avoided a second editor load because the host's bot challenge already fired once after my page loads. One editor load with the same override injected would settle it; by the numbers (img content box 32px, no padding) it will match the front end.

## 3. Root cause in code

PROVEN. History: `2d3ea8b2e` (30 Sep) gave the card grid `imageHeight` and `imagePadding` on the frame (`.sgs-card-grid__image-wrap`) for these Eye Care logos, with a plain `<img>` filling the frame. `509800f7c` (11 Nov, "card-grid prints each card's photo through SGS_Media_Element::render") moved the photo onto the shared media renderer, which then also emitted the same settings on the `<img>`:

- `includes/media/render-slot.php::sgs_media_atom_emitter_ids` collects every `sgs_media_atom_*_emit` function that exists, and the slot renderer runs all of them for every slot. It never reads the slot's declared `atoms` list. So `includes/media/atoms/media-padding.php::sgs_media_atom_media_padding_emit` pads the `<img>` from `imagePadding` even though `card-grid/block.json` (`supports.sgs.mediaElements[0].atoms`) does not list `media-padding`.
- `includes/media/atoms/sizing.php` (declared for card-grid) turns `imageHeight` into `height` and `imageRatio` into `aspect-ratio` on the `<img>`. The frame already applies both (`sgs_card_grid_frame_css`, whose docblock says the frame owns "ratio, height, padding").
- The JS twins do the same in the editor: `src/components/media/emit/emitters.js::MEDIA_EMITTERS` and `emitSlot` run every emitter, including `media-padding` and `sizing`.

Post 176's settings are valid and are what the designer set: `imageHeight: 46px`, `imagePadding` 14/14/0/14, `imageRatio` default, item `fit: scale-down` on all 12 tiles, `cardPadding` 6/14/15/14. The saved content has no height cap, overflow or `object-fit` of its own that causes the crop.

Reach on this site: the only other card grid (Home, page 208) sets neither `imageHeight` nor `imagePadding`, so only post 176 is hit (one read-only `wp eval` listing; a search of other custom post types may miss some). The theme's mega patterns (`mega-brands-1.php`, `mega-media-cards-1.php`) set only `imageRatio`, so they are not hit. I did not check other sites' content (`wp db query` is disabled on the host).

## 4. The fix, and what else shares it

Fix that keeps the logos at today's front-end size and uses the empty space above them: stop the picture inheriting the frame's own settings. Simulated live with one override (`.sgs-card-grid__image-wrap .sgs-media-el { padding: 0 !important; height: 100% !important; aspect-ratio: auto !important }`; `sim-1440-after.png`, before `sim-1440-before.png`, 768 pair `sim-768-*.png`):

| | Before | After |
|---|---|---|
| Drawn logo size (all 12 tiles) | e.g. Ray-Ban 65x29, Ferrari 24x32 | identical |
| Logo top / bottom inside the 46px frame | 28-30 / 59-60 (clipped at 46) | 14-16 / 45-46 |
| Most px cropped on any tile | 14 at 1440, 14 at 768 | 0 at both |

Drawn sizes are computed from the measured box, padding and natural size under `object-fit: scale-down`; the after screenshot confirms the logos look the same size and whole.

Recommended shape (root cause, fixes editor and every site in one place):
1. The card grid's slot tells the media renderer the frame owns Padding, Height and Ratio. The `media-padding` emitter and the Height and Ratio parts of `sizing` skip them for that slot, in the PHP emitters and the JS twins (`emitSlot`). The picture then fills the frame (`height: 100%`, no padding) in the editor and on the front end alike.
2. The wider alternative: make every emitter honour the slot's declared `atoms` list, so a block that does not list `media-padding` gets none. Cleaner, but it changes every block in the next list and needs a render check on them.
3. Not recommended: a CSS-only specificity override in `card-grid/style.css`. It hides the symptom but leaves the duplicated rules. No change to post 176 is needed. Shrinking the logos or lowering the post's padding would also hide it, but is not wanted.

Which other blocks share it (from the `block.json` files and `sgs-framework.db` opened read-only):
- Same crop (a frame that takes height and padding from `imageHeight` and `imagePadding`, plus the renderer printing them on the img): PROVEN for `sgs/card-grid` only. DB rows: `card-grid.imageHeight` maps to `height` on `image-wrap` and `card-grid.imagePadding` to `padding` on `image-wrap`. `post-grid.imageHeight` and `product-card.imageHeight` map to the `image` element itself (the picture, not a frame). `product-card` declares `media-padding` and `sizing` on purpose, so it is not a duplicate.
- Same mechanism (the `media-padding` emitter fires because a `<prefix>Padding` attribute exists whether or not the atom is declared): declared and intended in `buybox` (`main`), `decorative-image` (`layer`) and `product-card` (`image`); present but not declared in `card-grid` (`imagePadding`), `form-field-tiles` (`tilePadding`, also mapped as `css:padding` on its own element), `buybox` (`previewPadding`, mapped to `.sgs-buybox__pick-preview`) and `hero` (`splitPadding`, generated by the media atoms, probably intended). Whether form-field-tiles and buybox's preview also double the padding on screen is UNPROVEN: settle it by rendering a tile with `tilePadding` set and reading `getComputedStyle(img).padding`.
- Editor-versus-front difference (picture rules scoped to the `<img>` in the editor, to a wrapper span on the front end): any block that prints media in grouped mode and has its own `... .sgs-media-el { height: 100% }` rule in `style.css`. Found by grep: `card-grid`, `post-grid`, `gallery`, `before-after`. Whether the others visibly differ in the editor is UNPROVEN.

## Files (all under `E:\sgs-tmp\general-cloning\investigate\i9-logos\`)

Screenshots: `front-1440-menu.png`, `front-1440-grid.png` (cropped logos), `front-768-drawer.png` (no mega panel at 768), `editor-grid.png`, `editor-full.png` (smaller logos in the editor), `sim-1440-before.png`, `sim-1440-after.png`, `sim-768-before.png`, `sim-768-after.png` (panel forced visible). Data: `m1440.json`, `rules.json`, `editor-measure.json`, `post176.txt`. Scripts: `measure.mjs`, `rules.mjs`, `editor.mjs`, `fix.mjs`.

## Calls I made

- Read the post with `ssh hd` and wp-cli `post get` and one read-only `wp eval` that only lists posts; no writes.
- Logged in to the editor once with the site's admin login and left without saving.
- At 768 the mega panel does not open (the drawer's "Brands" is a link), so I forced the hidden panel visible in the page to measure it, and said so.
- Simulated the fix as a page-local style tag on the front end only; the editor check of the fix is left unproven on purpose (the host's bot challenge fired after repeated loads).
- Ran no render check and looked at no other site; no repo file was changed.
