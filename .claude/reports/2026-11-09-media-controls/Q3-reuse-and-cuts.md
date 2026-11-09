# Q3: reuse and cuts (rater C, code-path trace)

Spec 49 v0.5 against the worktree `E:/sgs-tmp/wt-media`. Saved content: 8,356 `sgs/*` block comments parsed from `E:/sgs-tmp/media-t2/<site>/rows.tsv` (five sites). Paths are under `plugins/sgs-blocks/` unless stated.

## Verdicts

| # | Claim | Verdict |
|---|---|---|
| 1 | §6.2 emitters call real helpers; editor reuse | FAIL on the editor half; the PHP half passes with one condition |
| 2 | §7.5 `icon-shapes.json` extends without breaking readers | FAIL as written; passes if limited to additive keys and a filter |
| 3 | §7.6 `sgs_media_cover_crop_plan` can be kept | PASS with named changes |
| 4 | §8.1 `css_element` carries five node names | PASS with conditions (a reader does treat the word as a selector source) |
| 5 | §8.2 paths and dispositions | FAIL: three wrong paths, one wrong count, undispositioned callers |
| 6 | Cuts against real use | PASS |
| 7 | §13 covers every old media attribute | FAIL: listed attributes have no row |
| 8 | §10.1 effects exist and target a bare element | FAIL: two effects have no preset, two names differ, two targets are gated |

## 1. Emitters and editor reuse

PHP half passes.
- `includes/helpers-responsive.php::sgs_emit_responsive_css( $selector, array $prop_map, array $opts )` takes `{desktop,tablet,mobile}` values per property. `sgs_responsive_atoms_from_spec` also takes `box`, `corners` and a `transform` callable, so an `{x,y}` Focal or a `{shape,fit}` Shape fits through a transform. It coalesces a missing tablet or mobile value up the cascade and prints only differences, in `SGS_Breakpoints` max-width queries.
- `sgs_emit_tier_decls( string $selector, array $tiers )` takes ready declaration lists per tier, one selector per call. A §8 paint node therefore maps to one selector string.
- `includes/helpers-border-style.php::sgs_border_element_decls( $attributes, $prefix, $selector, $options )` reads `{prefix}BorderWidth` and `{prefix}BorderStyle`, and accepts a tier object of width boxes. Its colour map takes four attribute names, so flat, gradient, hover and hover-gradient forms are all covered, including the gradient ring. `radius` takes a literal attribute name, so `{prefix}Radius` works.
- `includes/helpers-hover-state.php::sgs_hover_state_rules( $selector, $decls )` gives the hover and focus pair. Hover is not per device, which matches §8.
- `includes/helpers-shadow-layers.php::sgs_shadow_box_decls` and `helpers-shadow-hover.php::sgs_shadow_hover_rules` cover shadow.

Condition on shadow lift: `helpers-shadow-hover.php::sgs_shadow_lift_enabled` returns true unless the attribute is exactly `false`, so lift is ON when the attribute is absent. §8 wants lift off by default. The generator must write `"default": false` into `block.json` for `{prefix}ShadowLiftOnHover`, or the hover rule prints on every slot.

Condition on overlay colour-states: no named helper builds the overlay gradient or colour. It has to use `sgs_css_gradient_value` and `sgs_background_paint_decl`, which §6.2 does not list.

Editor half fails.
- `src/utils/border-preview.js`, `radius-preview.js` and `spacing-preview.js` cover border, corners and padding only. Nothing existing previews Fit, Focal, Ratio, Height, Shape (mask), filters, opacity or overlay. The existing preview for those is `src/components/media/canvasStyle.js`, which §8.2 deletes. §6.2 should say these previews are new work.
- `src/utils/border-preview.js` imports `borderPaintPreview` from `./background-preview`, and §8.2 deletes `src/utils/background-preview.js`. Other live importers of it (rg `from '…background-preview'`):
  - `src/blocks/button/focus-style.js`
  - `src/blocks/icon/icon-state.js`
  - `src/blocks/social-icons/group-shadow.js`
  - `src/blocks/decorative-image/layer-preview.js`
  - `src/utils/section-preview.js`
  - `src/utils/index.js` (`export *`)
  - `src/utils/svg-gradient-preview.js`
- Change needed: split `background-preview.js`. The paint functions (`isCssGradient`, `backgroundPaintPreview`, `borderPaintPreview`, `overlayPaintPreview`, `textPaintPreview`) are shared and stay. Only the media-background parts (`backgroundPreview`, `svgBackgroundPreview`, `tierBackgroundImageUrl`) go, and `section-preview.js` needs a decision.

## 2. `icon-shapes.json`

Readers:
- `includes/helpers-icon.php::sgs_icon_outline_shapes` and `sgs_icon_shape_slugs`
- `src/utils/icon-shapes.js::OUTLINE_SHAPES`
- `src/blocks/icon/shape-options.js`, `icon-state.js`, `inspector.js`, `inspector-shape.js`, `edit.js`
- `src/blocks/social-icons/edit.js`
- `src/blocks/icon/block.json::attributes.shape.enum`
- `tests/js/icon-shapes-parity.test.js`
- `tests/php/IconOutlineShapesTest.php`
- `tests/php/fixtures/icon-shapes-dump.php`

Findings:
- Extra keys `fit`, `paint`, `ratio` are ignored by both readers (they pick `slug`, `label`, `d` only), so they are safe.
- The spec's entry shape `{slug,label,viewBox,path,…}` is wrong. The file uses `d`, not `path`, and one top-level `viewBox`. Renaming breaks both readers and the SVG validation (`PATH` regex on `d`).
- Adding media shapes grows the `sgs/icon` shape enum and the social-icons `childIconShape` enum. `IconOutlineShapesTest::test_both_enums_list_exactly_the_shapes_the_registry_reader_gives` and `tests/js/icon-shapes-parity.test.js` hard-code the slug list `['hexagon','diamond','octagon','star','blob']`. Both fail on the first added slug.
- The reader drops any entry whose slug is in `sgs_icon_box_shapes()` (square, circle, pill), so a registry entry for circle or pill is silently discarded.
- The registry has one `blob`; the spec wants three.
- The icon renderer draws with `preserveAspectRatio="none"`, so `keep-proportions` is new behaviour for media only.
- Change needed: keep `d`. Add `fit`, `paint`, `ratio` as optional. Make both icon readers skip entries with `paint: "mask"` unless the icon wants them (decide), and update the two hard-coded lists. Drop `viewBox` per entry from the spec text.

## 3. `sgs_media_cover_crop_plan`

Can be kept. In `includes/helpers-media.php` it depends on:
- `sgs_media_element_stored_attr` (all `sgs_media_element_*` are removed)
- `sgs_media_atom_box_shape_resolve_sizing_mode`, `sgs_media_atom_box_shape_resolve_tier_object` and `sgs_media_atom_box_shape_normalise_ratio` (atoms, removed)
- `ObjectFit`, `DisplayWidth`, `MediaSizing`, `MaxWidth`, `Height` and `AspectRatio` keys (`DisplayWidth` and `MediaSizing` are deleted in §13)

Its first lines return `keep_auto` if `function_exists` fails for the two atom functions. When the atoms go first, the plan silently stops widening (fail-open, no error).

Changes:
1. Read Spec 49 attributes: `{prefix}Fit`, `Width`, `Height`, `Ratio` and the Source file's own dimensions.
2. Replace the `DisplayWidth` hint (`sgs_media_cover_crop_hint_sizes`) with §7.6's Width-derived value.
3. Replace the sizing-mode branch: mode `auto` becomes "no Ratio and no Height".
4. Remove both `function_exists` guards.
5. Update `tests/php/MediaCoverCropSizesTest.php` fixtures (they use `objectFit` and `mediaSizing`).
6. Callers `src/blocks/media/render.php` (two sites) move to the new renderer.

The file also hosts `sgs_hidden_render_*`, `sgs_image_loading_attrs` and `sgs_responsive_image`, so it must be split, not deleted.

## 4. `css_element`

No new column is needed. Readers: `scripts/computed-route/lib/calibrate-instances.mjs::stateTarget`, `lib/fill-part-pairing.mjs::partHome`, `lib/fill-row-lift.mjs`, `apply.mjs::slotLive`, `scripts/computed-route/data/shared-state-elements.json`, `plugins/sgs-blocks/scripts/sgs-update-v2.py` (reset and reseed), `scripts/wiring-fingerprint/wf_inputs.py`, `scripts/check-colour-attr-css-property.py`.

Conditions:
- `stateTarget` treats the word as a selector source: the manifest's declared selector, else the guess `.sgs-<block>__<kebab(word)>`. So `surface`, `layout` and `mask` need declared parts in `supports.sgs.elements` on every slot block, or calibration targets a class that does not exist.
- `overlay` is already a shared element: `shared-state-elements.json` maps it to `.sgs-container__overlay`, and 19 rows use it (container, hero, trust-bar and others). The media overlay must not reuse the word without a declared part, or hover calibration merges the two selectors.
- `media` is already used on hero, media and nav-drawer-menu, and `blockWrapperElements` returns the root for a part marked `isWrapper`. §10.1 removes `isWrapper` from `media` on `sgs/media`, which changes where those rows calibrate.
- `layout` is used by `woocommerce/cart` and `woocommerce/checkout`.
- DB check: `SELECT css_element … WHERE css_element IN ('media','surface','layout','overlay','mask')` returns overlay 19, media 9, layout 2; `surface` and `mask` 0.

## 5. §8.2 removed list

Paths that do not exist as written:
- The four `test-media-*.mjs` files are in `scripts/tests/`, not `scripts/`.
- `*PanelLayout.js` is four files, not three: `Media`, `HeroSplitMedia`, `DecorativeImage` and `ProductCardImage` under `src/components/media/`.
- `scripts/qa/lib/wp-stubs.php` exists only under `plugins/sgs-blocks/`, not at the repo root.

All other paths exist (checked with `[ -e ]`).

Safe homes: `sgs_hidden_render_*` live in `includes/helpers-media.php`; `sgs_allowed_svg_tags` lives in `includes/helpers-tier-media.php`. Both files also hold removed functions and are not on the deletion list as files, so "move first" is possible. Neither file is named, which should be fixed in the text.

Callers of removed names that §8.2 does not name (rg over `plugins` and `theme`, list limited to 80 files, so more may exist):
- Scripts and fixtures: `scripts/check-length-unit-partners.py`, `check-control-helper-parity.py`, `audit-post-content-blocks.py`, `audit-block-file-consistency.py`, `migrate-motion-part-kinds.py`, `migrate-border-shape-b.js`, `wiring-fingerprint/wf_tokens.py` and `wf_resolve.py`, `surveys/census-media-presentation.py`, `tests/fixtures/motion/render-paths.json`.
- PHP outside the §13 block list: `includes/class-post-grid-rest.php`, `class-sgs-container-wrapper.php`, `helpers-brand-logo.php`, `product-card-builtin-render.php`, `render-helpers.php`, `src/blocks/cart/render-scoped-css.php`, `google-reviews/render-wrapper.php`. Some are block adoption; the cart, REST, container-wrapper and render-helpers ones need an explicit line.
- `includes/helpers-media-element.php` and `includes/class-sgs-media-element.php` are removed by symbol only; name the files.

Not verified: that WP-15a's list will catch the scripts above.

## 6. Cuts against real use

| Cut | Evidence | Result |
|---|---|---|
| `space` and `round` repeat | One saved `backgroundRepeat` (`"repeat"`, container, sandybrown); none in `sites/` or `theme/sgs-theme/patterns` | No use |
| Per-device greyscale | No `grayscale`, `greyscale` or tiered filter key in saved content. Drafts use `grayscale(1)` to `grayscale(0)` as a hover swap (`sites/Mega-menu design/mega-menu/photo-grid.html`, `split-aside-cta.html`), which is the Hover panel | No use |
| Per-device blur | `scrimBlur` and `surfaceBlur` appear (nav-drawer, nav-bar-menu, site-header, container, five sites). They are backdrop blur in the Surface panel, which §T1 keeps | No media blur |
| Mask uploads | No `mask*` key saved. One draft CSS `-webkit-mask-image:linear-gradient(...)` fade on a marquee (`sites/indus-foods/handoff/Indus Foods Website v2.dc.html`) is a gradient, not an upload | No use |
| Mixed kind per device | Three saved `sgs/media` blocks (page 2332, sandybrown) carry `svgContentTablet` or `svgContentMobile`; `mediaType` is `svg` throughout. No `imageUrlTablet` beside `videoUrl` | Same-kind only |
| Decorative video | `decorMedia` appears in no saved content and no pattern | No use |
| `logoSwitchCustomPx` | Not in saved content, patterns or `sites/` | No use |

Draft `grayscale(.55)` in an Eye Care draft's filter presets is a single value, not per device.

## 7. §13 against `block.json` and saved content

Method: every `block.json` attribute matching a media pattern, minus colour and typography noise, tested for its name (tier suffix removed) in §13. Shorthands such as `imageId/Url` and `drawingImageId, Url, Alt, Decorative` count as covered. 113 candidates, most noise; the ones below are real media attributes with no row.

Saved on a site (so migration refuses them today):
- `sgs/brand-strip`: `logos`, `logoFit`, `logoMaxWidth`, `logoOpacity`, `logoLayout`, `logoGap` (10 blocks; the B2 report says they stay, but §13 has no row)
- `sgs/product-card`: `brandUseLogo`, `brandLogoMaxWidth` (also `brandLogoHeight`, `brandLogoWidth`, `brandLogoMaxHeight`)
- `sgs/choice-flow`: `headerLogoHeight` (the row names `headerLogo` only)
- `sgs/before-after`: `beforeMediaType` and `afterMediaType` are in the row; the video and SVG per-side keys are not named (`beforeVideoId/Url/Alt`, `afterVideoId/Url/Alt`, `beforeSvgContent`, `afterSvgContent`)
- `sgs/icon`, `sgs/button`, `sgs/cart`: `iconSvg` (inline SVG glyph; 149 saved uses). Say it stays.

Declared but not saved:
- `sgs/media`: `videoId`, `videoMimeType`, `videoIdTablet`, `videoIdMobile`, `videoPlaysInline*`, `videoLazyLoad*` (the Playback row lists only autoplay, loop, muted, controls; the Playback object has `inline` and `lazy`)
- `sgs/media` and `sgs/image-sequence`: `thumbnail` (object) and `thumbnailAlt`, `thumbnailDecorative`
- `sgs/image-sequence`: `desktopFramesUrl`, `tabletFramesUrl`, `mobileFramesUrl`
- `sgs/trust-bar`: `badgeImageSize`, `badgeImageObjectFit`, `badgeImageBorderRadius`, `badgeImageShadow`
- `sgs/mega-panel`: `accentBackgroundImage`
- `sgs/store-selector`: `flagSize`
- `sgs/option-picker`: `swatchSize`, `swatchRingWidth`, `swatchTickInside`
- `sgs/nav-drawer-menu`: `itemOrnamentFrames`
- `sgs/google-reviews`: `cardLogoSize`, `logoPosition`
- Per-slot Decorative flags: `photoDecorative`, `avatarDecorative`, `orgLogoDecorative`, `workMediaDecorative`, `milestoneMediaDecorative`, `logoDecorative` (the table has only `imageDecorative`)
- `sgs/decorative-image`: `decorMedia`
- `sgs/hero`, `media`, `card-grid`: `_comment_*` keys (comment-only, harmless)

## 8. §10.1 effects

| Spec name | Match in `fx_effects` or `motion_presets` | Note |
|---|---|---|
| Zoom | `hover-image-zoom` | Name differs |
| Lift | `hover-lift` | Present |
| Black and white to colour | `hover-grayscale-to-colour` | Present |
| Brighten | none | No slug or label contains it |
| Fade | `entrance-fade-in` | Present |
| Rise | `entrance-fade-up` | Name differs |
| Scale | `entrance-scale-in` | Present |
| Clip reveal | none | Only `entrance-reveal-up`, `split-reveal-*` (text) and `curtain` (entrance effect, not verified as clip-path) |
| Parallax | `parallax` | `requires: none`, so it can target a bare element |
| Ken Burns | `ken-burns` | `requires: surface`: only a part marked `"surface": true` in `supports.sgs.elements` offers it (`src/blocks/extensions/motion/layers/refusal-match.js`) |
| Float | `ambient-float` | Present, `in_picker 0` |
| Draw | `draw` | `requires: svg-subtree`, fine for the SVG kind |
| SVG loop | `svg-loop` | `requires: svg-subtree`, fine |
| SVG parts | not an `fx_effect` | Existing named-part animation, not a motion preset |
| Pinned | `pin-scrub` | `requires: section`: only section-kind hosts offer it, so a media-block Background part cannot unless the host is a section |

Change needed: add Brighten (a hover preset) and Clip reveal (an entrance preset) before §10.1 promises them. State the preset names, mark the media image part and each Background part `"surface": true`, and say Pinned is offered only on section-kind hosts. Not verified: that `hover-image-zoom` and the `entrance-*` presets run on a bare `<img>` (all presets are `target_level: part`).

## Findings beyond the pass or fail list

1. `background-preview.js` has non-media callers (item 1). Deleting it as §8.2 says breaks the editor for `border-preview.js` and six other files.
2. `sgs_shadow_lift_enabled` defaults lift on (item 1); the generator default must be `false`.
3. `icon-shapes.json` readers drop circle and pill and the tests hard-code the slug list (item 2).
4. `sgs_media_cover_crop_plan` fails open when its atoms go (item 3).
5. `overlay` as a `css_element` word collides with the shared mapping to `.sgs-container__overlay` (item 4).
6. The four `test-media-*.mjs` paths and the three-versus-four `PanelLayout` count in §8.2 are wrong (item 5).
7. Brighten and Clip reveal do not exist as presets (item 8).
8. `iconSvg` on icon, button and cart (149 saved uses) has no disposition (item 7).
