# AT: media atoms by block, run and read

Scope: the 15 atoms (`plugins/sgs-blocks/src/components/media/atoms/registry.js::MEDIA_ATOMS`) against every `src/blocks/*/block.json::supports.sgs.mediaElements`. Read-only; the worktree is E:/sgs-tmp/wt-media. Scratch scripts and raw output: E:/sgs-tmp/media-atoms/ (`scan.mjs`, `scan.json`, `probe*.cjs`).

## 1. Matrix (20 blocks, 29 declared elements, 51 element-by-atom rows)

Built by reading each `block.json::supports.sgs.mediaElements`. `mediaElements` appears in exactly 20 blocks, matching `test-media-enum-vocabulary` ("20 mediaElements blocks"). Cell = prefix.

| Block | object-fit | focal-point | source | media-type | box-shape | media-padding | overlay | shadow | meaning | intrinsic | svg-pres. | opacity | video-beh. | caption | link |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| media | yes | yes | yes | yes | yes | yes | yes | yes | yes | | yes | yes | yes | yes | yes |
| hero | splitMedia | splitMedia | splitMedia | split | splitMedia | splitMedia | splitMedia | splitMedia | | | | | | | |
| decorative-image | yes | yes | | | | | yes | | | | | | | | |
| before-after | before, after | before, after | | | | | | | | | | | | | |
| product-card | main, thumb | main | | | | | | | | | | | | | |
| testimonial | avatar, work | work | | | | | | | | | | | | | |
| buybox | main, thumb | | | | | | | | | | | | | | |
| measured-diagram | | | | | | | | | drawing | drawing | | | | | |
| brand-strip, card-grid (sgs), cart, gallery (sgs), google-reviews, image-sequence, mega-panel, option-picker (swatch), post-grid, product-search, team-member (sgs), trust-bar (badgeImage) | yes (12 blocks) | | | | | | | | | | | | | | |

Rows per atom: object-fit 24, focal-point 6 (media, hero, decorative-image, before-after x2, product-card main, testimonial work = 7 element rows), source 2, media-type 2, box-shape 2, media-padding 2, overlay 3, shadow 2, meaning 2, intrinsic 1, svg-presentation 1, opacity 1, video-behaviour 1, caption 1, link 1. sgs/media adopts all 14 listed there plus none missing (it declares 14 atoms; `intrinsic` is the only atom it lacks, which is by design).

## 2. Gates and tests (run in plugins/sgs-blocks)

| Command | Result line |
|---|---|
| `node scripts/tests/test-media-atom-parity.mjs` | PASS - JS and PHP agree across 15 implemented atom(s) |
| `node scripts/tests/test-media-attr-parity.mjs` | JS and PHP agree on every case |
| `node scripts/tests/test-media-enum-vocabulary.mjs` | PASS - 20 mediaElements blocks, every hand-declared enum carries its atom's vocabulary |
| `node scripts/tests/test-media-injection-parity.mjs` | PASS - JS and PHP agree |
| `node scripts/check-media-atom-purity.js` | 15/15 atom logic modules are import-clean |
| `node scripts/check-media-breakpoints.js` | OK (source 767/1023, stylesheet 767, 1023) |
| `node scripts/check-media-disclosure-coverage.js` | PASS - 0 problem(s), 23 expected and 23 actual |
| `node scripts/generate-media-stylesheet.mjs --check` | OK - 16 partial(s) in sync |
| `php tests/php/run-media-atom-shadow-hover-standalone.php` | 9 passed, 0 failed |
| `php tests/php/run-shadow-shared-cases-standalone.php` | 51 checked, 0 failures (negative control caught 21) |

Every gate is green. What they prove is JS-to-PHP agreement, vocabulary, injection and disclosure counts; none opens a rendered page, so none says an atom paints on a given block. No PHP test exercises `object-fit`, `focal-point`, `source`, `box-shape`, `overlay`, `meaning`, `intrinsic`, `link`, `caption`, `opacity`, `media-padding`, `media-type` or `svg-presentation` output (`grep -rl sgs_media_atom plugins/sgs-blocks/tests` returns only the two shadow standalones and lottie).

## 3. Code: does the block apply the atom and mount the control

PHP apply = the block calls `SGS_Media_Element::style()` (`includes/class-sgs-media-element.php::style`) with the atom, or its own code calls the atom's PHP twin. Editor = a `MediaElementPanel` (`src/components/MediaElementPanel.js`) mounted with the atom.

| Block | Atoms applied in PHP | Editor mount | Gap |
|---|---|---|---|
| media | `src/blocks/media/render.php` calls `SGS_Media_Element::style( ..., 'sgs/media', $scope_class, $sgs_media_atoms )` for all 14 | `src/components/media/MediaPanelLayout.js` mounts all 14 via `MediaElementPanel` | none found. Video controls are replaced by custom chrome in `src/blocks/media/view.js::enhance` (`video.removeAttribute( 'controls' )`) |
| hero | `src/blocks/hero/render.php` calls `style()` for `object-fit`, `focal-point`, `shadow` only; box-shape, overlay, source, media-padding and media-type are bespoke code in the same file that call the atom twins (`sgs_media_atom_box_shape_*`, `sgs_media_atom_overlay_css`) | `src/blocks/hero/edit.js` mounts `MediaElementPanel` with `[ 'box-shape', 'media-padding', 'shadow' ]` only (around the `splitMedia` ToolsPanelItem) | `grep -rn splitMediaOverlay src --include=*.js` returns only comments in `atoms/overlay.js`, `registry.js`, `GradientOverlayControl.js`: no hero control writes `splitMediaOverlayColour`/`Gradient`, though the attribute is declared and rendered. Source, object-fit, focal-point and media-type are hero's own bespoke controls, not the atom controls (not read control by control: not verified) |
| decorative-image | `render.php` `$sgs_di_atoms = array( 'object-fit', 'focal-point', 'overlay' )` into `SGS_Media_Element::style` | `src/components/media/DecorativeImagePanelLayout.js` mounts the same three | none found |
| before-after | `render.php` + `media-render.php::` marker classes, object-fit and focal-point (image and video only, svg skipped by design) | `edit.js` mounts both elements with `[ 'object-fit', 'focal-point' ]` | none found |
| product-card | `render.php` `style()` with `array( 'object-fit', 'focal-point' )` for main, `object-fit` for thumb | `edit.js` mounts main (`object-fit`, `focal-point`) and thumb (`object-fit`) | none found |
| testimonial | `render.php` `SGS_Media_Element::scope_class` and `element_classes` | `edit.js` mounts avatar (`object-fit`) and work (`object-fit`, `focal-point`) | none found |
| buybox | `gallery-col.php` adds `SGS_Media_Element::element_classes` to main and thumb images | `edit.js` mounts both with `object-fit` | `grep -n "SGS_Media_Element::style" src/blocks/buybox/*.php` returns nothing, so the scoped custom-property rule comes from elsewhere (not traced: not verified that a set value paints) |
| measured-diagram | `render.php` `$sgs_md_atoms = array( 'intrinsic', 'meaning' )` into `style()` | `edit.js` mounts both | none found |
| cart, google-reviews, mega-panel, option-picker, post-grid, product-search | each calls `SGS_Media_Element::style` with `array( 'object-fit' )` (cart: `render-scoped-css.php`; google-reviews: `render-wrapper.php`; post-grid: `render-scoped-css.php`; product-search: `render.php`, marker added by `view.js`) | `MediaElementPanel` with `[ 'object-fit' ]` in each `edit.js` (post-grid in `components/ContentPanel.js`) | none found |
| brand-strip | `render.php` `style( ..., array( 'object-fit' ) )` | no `MediaElementPanel`; `edit.js` has its own per-item `objectFit` select and block `logoFit` | two vocabularies for one setting (block `logoFit` plus item `objectFit`); untiered UI while the atom emits three tiers |
| card-grid, gallery, team-member | `style()` with `object-fit` (`render-card-css.php` / `render.php`) | no atom panel by design; the legacy `src/blocks/extensions/image-controls.js` writes `sgsObjectFit` with one SelectControl | the atom's tablet and mobile keys are injected but the only UI writes desktop |
| trust-bar | `render.php` `SGS_Media_Element::style` reads `badgeImageObjectFit` | `edit.js` own SelectControl with two options (contain, cover) | the control offers 2 of the atom's 5 values and no per-device value |
| image-sequence | `render.php` `SGS_Media_Element::style( ..., array( 'object-fit' ) )` | none, by design (`block.json::_comment_mediaElements`) | declared atom with no control: a client cannot change it, and the canvas (`fx-image-sequence.js::drawCover`) would not honour it |

## 4. Front end (real Chrome, 1440 px, one page at a time, 3 s apart)

Saved instances found by `scan.mjs` over the five `rows.tsv` dumps (attribute names from `mediaStoredAttrName` per atom base). A block-and-atom pair with no saved instance is "not run". Pages that answer 404 on `?p=ID` (draft or non-public) are "not run".

| Block and atom | Page | Expected | Computed | Result |
|---|---|---|---|---|
| media object-fit | sandybrown 3145 | `objectFit` unset, contain, scale-down | cover, contain, scale-down on the three `img.sgs-media__img` | works |
| media object-fit (video) | sandybrown 3145 | unset | `video.sgs-media__video` object-fit cover | works |
| media caption | sandybrown 3145 | figcaption text | "A unset objectFit", "B objectFit contain" etc. present | works |
| media meaning (alt) | sandybrown 3145 | alt text | alt "unset fit", "contain fit", "scale-down fit" | works |
| media source | sandybrown 3145 | image with width and height | `width="1920" height="1080"` | works |
| media media-type | sandybrown 3143, 3145 | `mediaType` svg and video | `figure.sgs-media--svg` and `video` rendered | works |
| media video-behaviour | sandybrown 3147 | autoplay true with muted false forced muted; autoplay false stays plain | first video `autoplay muted playsinline`, second `playsinline` only | works (the disclosure lock holds on the front end) |
| media video-behaviour | sandybrown 3143 | `videoMuted:false`, `videoControls:true`, captions url | no `muted`, `<track kind=captions>` present; native `controls` absent because `view.js::enhance` strips it for custom chrome | works, with custom chrome replacing native controls |
| hero object-fit | indus-test 115 | `splitMediaObjectFit` contain | contain | works |
| hero box-shape (ratio, radius) | indus-test 90 | ratio 3 / 2 | `aspect-ratio: 3 / 2`, `border-radius: 22px`, frame 549 by 366 | works |
| hero shadow | indus-test 90, 115 | `0 34px 60px -30px` plus colour | `rgba(44, 62, 80, 0.7) 0 34px 60px -30px` | works |
| hero overlay | sandybrown 2337 | `splitMediaOverlayColour` primary | second hero frame `::after` background `rgb(230, 138, 149)`; first hero (no value) has transparent `::after` | works (but no editor control, section 3) |
| hero focal-point | indus-test 105 | `center center` | `object-position: 50% 50%` | consistent but not discriminating (default); the non-default page (sandybrown 2511) answers 404: not run |
| hero source | sandybrown 2337 | image 576 by 1024 | `img.sgs-hero__split-image` `width="576" height="1024"` | works |
| brand-strip object-fit | indus-test 90 | `logoFit` contain | `img.sgs-brand-strip__logo` object-fit contain | works |
| gallery object-fit | indus-test 90 | not set on a saved gallery (no hit in the scan) | contain on `img.sgs-gallery__img` (hard-coded `render-tile.php` `object-fit:contain`) | not run as an atom test: a hard-coded rule, not the atom |
| card-grid object-fit | eye-care-test 11 | no saved `sgsObjectFit` hit in the scan | scale-down on `img.sgs-card-grid__media` | not run (value origin unproven) |
| media focal-point | eye-care-test 11, 208 | `objectPosition` "center 20%" / "50% 20%" | no `img.sgs-media__img` on the page | not run (media node absent from the front end on that page: not verified why) |
| measured-diagram intrinsic and meaning | sandybrown 4971 | width 680, height 300, alt | page answers 404 | not run |
| media box-shape, opacity, shadow, media-padding, link, svg-presentation, overlay | no usable saved instance (opacity, shadow, padding, link, svg-presentation: 0 saved; box-shape saved on 120 blocks but none on a probed page; overlay only `overlayOpacity=100` with no colour) | | | not run |
| before-after, buybox, cart, decorative-image, google-reviews, image-sequence, mega-panel, option-picker, post-grid, product-card, product-search, team-member, testimonial, trust-bar | no saved instance sets an atom attribute (`scan.json`, 0 hits for each) | | | not run |

## 5. Verdict per atom, and smallest change toward Spec 49 section 7 and 8

Spec 49 section 8.2 deletes `includes/media/atoms/*`, `SGS_Media_Element`, all `sgs_media_element_*` and `media-element-attrs-register.php`. So "extend" below means keep the JS logic module, the JSX control and the gate coverage, and change the stored shape and emitter; it does not keep the PHP twin as is.

| Atom | Verdict | Fails on | Smallest change (Spec 49 section 7 and 8) |
|---|---|---|---|
| object-fit | works on most of its 24 rows; broken control side on 6 blocks | image-sequence (no control, by design); trust-bar (2-value untiered select); brand-strip (block `logoFit` plus item `objectFit`); card-grid, gallery, team-member (legacy untiered `sgsObjectFit` UI) | Extend. It is already the per-device string Spec 49 `Fit` is (`R string`, `object-fit`, paint node media). Rename keys to `Fit`, add `tile` for image backgrounds, mount the same control on the 6 blocks above |
| focal-point | works where mounted (hero default value verified; media not run) | no non-default live check passed; stored as "x% y%" strings, Spec 49 `Focal` is `{x,y}` | Extend. Change the stored shape to `{x,y}` (the picker already produces x and y) and keep the disclosure rule (greyed when the fit does not crop) |
| source | works on media and hero (live) | alt is tier-suffixed `ImageAltTablet` with 0 declarations (L-scrutiny-editor, not re-run); URL is unescaped in `includes/media/atoms/source.php::sgs_media_atom_source_css` (M-scrutiny-render, not re-run) | Replace the stored shape only: sibling Tablet and Mobile id and url keys become the `Source` R object with `{kind,id,url,width,height,mime,poster,markup}`. Keep the typed picker restriction. Fix the escaping in the new emitter |
| media-type | works on media (live); hero not run | none found | Fold into `Source.kind`; the tier enum disappears, since the kind is read from the chosen file |
| box-shape | works on hero (ratio and radius live); media not run | `box-shape.control.js` min-height writes desktop only (L-scrutiny-editor); `clip-path` presets clip border and shadow (M-scrutiny-render item 4) | Extend. Split it into `Ratio`, `Height`, `Width`, `Radius` (corners) and `Shape`; `Shape` is the one part to replace with the mask and frame two-layer render (Spec 49 section 7.5) |
| media-padding | not run | none found | Keep as is; rename to `Padding` (`R sides`) |
| overlay | works on hero (live); media not run | hero has no editor control for it | Extend. Keep colour, gradient, opacity per device and blend; mount the control on hero; add hover form inside `@media (hover:hover)` |
| shadow | works on hero (live); media not run | clipped box loses its shadow (L, M) | Keep as is. It hosts `ShadowControl` already; the frame element fixes the clipping (section 7.4) |
| meaning | works on media (live); measured-diagram not run | alt copied once then diverges (L) | Extend: `Alt` plus `Decorative`, no tier suffix |
| intrinsic | not run | none found | Keep as is; Spec 49 `Source` carries width and height, so this atom is absorbed rather than needed |
| svg-presentation | not run | duplicates the opacity atom (L) | Extend: keep `SvgAnimation`, `SvgAnimationSpeed`, `SvgTextShadow`, add `SvgLayer`; delete `SvgOpacity` in favour of `Opacity` |
| opacity | not run | no `allowReset`, not per device (L) | Extend to R number 0 to 100 |
| video-behaviour | works on media (live, including the autoplay and muted lock) | only media adopts it; other video surfaces hard-code values | Extend to the `Playback` object in Spec 49 section 8; keep the disclosure map |
| caption | works on media (live) | none found | Keep as is |
| link | not run | none found | Keep as is |

## 6. Counts

Works on all its blocks (live and code): video-behaviour, caption, media-type (live on media; hero unrun), meaning (media live; measured-diagram unrun). Works on some: object-fit, overlay, source, box-shape, shadow, focal-point (as above). Not run live (no saved instance or page not public): media-padding, link, opacity, svg-presentation, intrinsic. Broken: none found. Pairs that fail: object-fit on image-sequence, trust-bar, brand-strip, card-grid, gallery, team-member (control side); overlay on hero (no editor control).

Not verified: the `source.php` URL escaping hole and the `ImageAltTablet` drop (taken from M and L, not re-run); buybox object-fit paint; hero source, focal and media-type editor mounts control by control.
