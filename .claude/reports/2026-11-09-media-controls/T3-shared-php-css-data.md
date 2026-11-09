# T3. Shared PHP, CSS, generators and DB used by media blocks (worktree E:/sgs-tmp/wt-media, HEAD b64c361cf, 2026-11-09)

Method: Spec 49 §6.9, §7, §8, §8.2, §14.4 read in full. Every file below opened or its function list read. Caller counts are "files" from `rg -l -F` over `plugins/sgs-blocks/{includes,src,scripts,assets}`, `theme/sgs-theme`, `plugins/sgs-configurator-pro` and `scripts/`, tests excluded unless stated ("prod" = non-test). Not run: PHPUnit, node gates, live pages. Earlier reports H, I, M were written against the other worktree (wt-indus); I re-checked each claim used here against this tree.

Package key (§14.4): WP-0b wrapper split, WP-1 core (table, generator, `paint_node`, schemas), WP-2 renderer, WP-3 loading, WP-6 masks, WP-8 backgrounds, WP-10a effects, WP-13 cloner, WP-14 detector, WP-15a gates, WP-15b docs and removal, Wave 1/3/4 block adoption, WP-9 hero. "UNOWNED" means no package in §14.4 covers it.

## 1. Verdict counts

| Verdict | Files | Notes |
|---|---|---|
| keep (no change) | 14 | section 3 |
| rework | 13 | section 2 (helpers-media.php, render-helpers.php, class-sgs-blocks.php, sgs-blocks.php, wrapper, dividers, cover-crop sizes, theme, package.json, gates.json, rules.json and others) |
| replace | 3 | CSS: `media-element.css`, `media-atoms/*` (16 files counted once), generators |
| delete | 31 | 15 atom PHP twins, 9 other PHP, 2 generators, 4 tests, plus gates (section 2.5) |

Counts are approximate where a row groups files; the table rows are authoritative.

## 2. Files Spec 49 removes or reworks

### 2.1 PHP helpers and classes (§8.2 removals)

| Path::symbol | Does today | Callers (files) | Works? | Verdict and exact change | Owner |
|---|---|---|---|---|---|
| `includes/helpers-media.php::sgs_responsive_image` | Wraps `wp_get_attachment_image`; plain `<img>` fallback | 11 prod: wrapper, tier-media, render-helpers, timeline, decorative-image, image-sequence, hero, 2 survey scripts | Works for one image; no `sizes` derivation, no art direction | Delete; behaviour absorbed by renderer | WP-2, then WP-15b |
| `helpers-media.php::sgs_render_media` | Oldest renderer: lazy `<img>`/`<picture>` with one mobile source, `<video>` autoplay loop muted | 20 prod: testimonial, team-member, brand-strip, gallery (render, render-tile, 2 JS twins), card-grid (3), before-after, decorative-image, render-helpers, migrate script | Works but weak: always lazy so a logo bar above the fold cannot be eager; no srcset, no sizes, one breakpoint; video autoplay default | Delete; every caller moves to `SGS_Media_Renderer::render` | Wave 3 and 4, WP-15b |
| `helpers-media.php::sgs_image_loading_attrs`, `sgs_next_background_image_index`, `sgs_content_image_claims_priority` | Three entry points on one static counter, three different rules; 16-image eager limit via `sgs_eager_image_limit` filter | 8, 4 and 3 prod files: brand-logo, glyph-fallback, decorative-image, hero, buybox gallery-col, media, product-card, wrapper, gallery render-tile, `class-post-grid-rest.php` | Works; contradicts §7.7 (rule 1 hidden surface only partly; no tree pre-pass, 16 not 8 eager) | Delete; replaced by `SGS_Media_Priority::resolve`. `sgs_eager_image_limit` has no other user (grep: only this function) | WP-3 |
| `helpers-media.php::sgs_hidden_render_depth`, `_enter`, `_leave`, `sgs_in_hidden_render_context`, `sgs_hidden_render_blocks` | Tracks "inside mega-panel, nav-drawer, modal, wishlist-panel, cart" through `pre_render_block` and `render_block` filters | 1 file: only `sgs_image_loading_attrs` in the same file | Works; exactly §7.7 rule 1 | NOT in §8.2 but the file survives only for these. KEEP: move to `includes/media/class-sgs-media-priority.php` (or its own file) before `helpers-media.php` is deleted | WP-3 (add to its scope) |
| `helpers-media.php::sgs_render_stars` | Star SVGs for reviews | 7 files (google-reviews, rating badge, render-helpers) | Works; not media | KEEP, move to a reviews helper so `helpers-media.php` can be deleted | UNOWNED (WP-15b) |
| `includes/helpers-tier-media.php::sgs_tier_media_render` | Per-device sibling `<img>`/`<video>`/svg/lottie, toggled by CSS | 8 prod: hero (render, style, canvas-preview), timeline (render, scss), motion migrate script, scan rule 40 | Works but defects: three image tiers print three eager `fetchpriority="high"` `<img>` (defaults `img_loading=eager`, `img_fetchpriority=high` applied to every tier, read in-file); video siblings hard-code `loop muted playsinline` | Delete | WP-2, WP-9 hero |
| `helpers-tier-media.php::sgs_tier_media_toggle_css`, `sgs_tier_media_has_source` | Toggle CSS and a presence test | 1 file each (same file; grep `sgs_tier_media_toggle_css`, `sgs_tier_media_has_source` over includes, src, scripts, theme) | Works | Delete with the file | WP-15b |
| `helpers-tier-media.php::sgs_allowed_svg_tags` | Thin delegate to `sgs_svg_kses_allowed_tags()` | 6 prod: media render, hero edit.js name, timeline, container wrapper, svg-kses, scan rule 40 | Works | NOT in §8.2. KEEP: move into `helpers-svg-kses.php` (it is the SVG kind's sanitiser, §7.9) before deleting the file | WP-2 |
| `includes/lottie-render.php::sgs_render_lottie` | Lottie wrapper markup | 1 prod caller: `sgs_tier_media_render` (grep `sgs_render_lottie(` excluding the definition and tests) | Works, tested by `run-lottie-standalone.php` | Becomes dead once the tier helper goes (Spec 49 drops Lottie as a media kind, §13 "reported and resolved by hand"). Delete `sgs_render_lottie`; keep `lottie-upload.php` and the Lottie effect files (not verified whether `sgs_lottie_layer_add_source` in the same file serves the effect: yes by name, so the file is a rework, not a delete) | WP-15b (UNOWNED today) |
| `includes/helpers-media-element.php` (281 lines) | Attr naming `sgs_media_element_attr`, stored-name map, tolerant value reader (5 storage shapes), scope class, `sgs_media_hover_zoom_clips`, `sgs_media_element_style` | 40 files (names), prod: 3 JS-adjacent, 8 PHP atoms, 5 block render.php, 8 gate scripts | Works; exists to tolerate legacy shapes (`STORED_AS` map for before-after, decorative-image, brand-strip) | Delete | WP-2 (replaces), WP-15b |
| `includes/class-sgs-media-element.php::SGS_Media_Element` (287 lines) | Scope class, `requires_box`, `box_classes`, `style`; carries two `trigger_error` shims for old call shapes | 36 files: 20 block render.php, `class-post-grid-rest.php`, `product-card-builtin-render.php`, atoms, 2 scripts | Works; the shims are legacy adaptation | Delete. NOT accounted: `class-post-grid-rest.php` and `product-card-builtin-render.php` call it directly (not block render.php) | Wave 3 (post grid, product card) |
| `includes/media/atoms/*.php` (15 files: box-shape 481, focal-point 201, shadow 141, overlay 174, svg-presentation 175, video-behaviour 125, media-padding 133, object-fit 108, source 94, opacity 81, caption 64, meaning 62, media-type 48, link 48, intrinsic 47) | PHP twin of each JS atom: `_requires()` and `_css()` | each loaded from `render-helpers.php` lines 223-245; called only through `SGS_Media_Element` and by media, hero, decorative-image render.php | Works (per M: node parity gates pass; not re-run here) | Delete all 15 | WP-2 (emitter), WP-15b |
| `includes/media-element-attrs-register.php` | `register_block_type_args` filter turning `supports.sgs.mediaElements` into attributes | 8 files; loaded at `sgs-blocks.php` (require of this file) | Works | Delete | WP-1 (generator writes real attributes) |
| `includes/media-element-attributes.generated.php` (331 lines) | Type map generated from JS | 5 files, all gates or generators | Works | Delete | WP-1 |
| `includes/helpers-media-position.php` | `sgs_media_position_css`, `_focal_to_css` | 17 files incl. trust-bar, testimonial, team-member, brand-strip, card-grid (3), gallery, product-card, render-helpers | Works for `{x,y}` only; keyword and string forms unparsed | Delete; §13 migration parses legacy forms | WP-1 (Focal), Wave 3 and 4 |
| `includes/image-controls.php::inject_image_controls` | `render_block` filter adding `sgs-has-image-controls` and custom properties for `sgsObjectFit/Position/Height/MaxWidth/ColourTreatment` | 12 files; declared by 14 blocks (`imageControls`: card-grid, cart, form-field-tiles, google-rating-badge, gallery, google-reviews, icon, measured-diagram, nav-drawer-menu, pricing-table, social-icons, team-member, trustpilot-reviews, wishlist-link) | Works; 13 of 15 were dead at D585 (per `surveys/check-image-controls-support.py` docstring) | Delete; but see section 4 for `sgsColourTreatment`, `sgsHeight`, `sgsMaxWidth` with no §13 mapping | WP-15b |

### 2.2 PHP files §8.2 does not name that must change

| Path::symbol | Change | Owner |
|---|---|---|
| `includes/helpers-media.php::sgs_media_cover_crop_plan`, `_widens`, `_sizes`, `_hint_sizes` | §6.9 says rework to §7.6. The plan calls `sgs_media_atom_box_shape_resolve_sizing_mode` and `sgs_media_element_stored_attr` (both deleted) and returns "keep auto" if absent, so it silently stops working at cutover. ~170 lines understanding only `px`. Replace with the derived-`sizes` code in the renderer. 2 prod callers: media render.php, `class-sgs-blocks.php` hook | WP-2 |
| `helpers-media.php::sgs_media_drop_auto_sizes` | Hooked on `wp_content_img_tag` at `class-sgs-blocks.php:72`. Keep the idea (drop core `sizes="auto"` on a cropped image); move into renderer file. §7.6 only promises a `wp_filter_content_tags` fixture | WP-2 |
| `includes/render-helpers.php` | Remove requires for helpers-media-position, helpers-tier-media, helpers-media-element, class-sgs-media-element and 15 atoms (lines 179-245) and its docblock index | WP-15b |
| `includes/class-sgs-blocks.php` | Remove `image-controls.php` require (line 61), `sgs_media_drop_auto_sizes` hook if moved, and the two enqueues of `assets/css/media-element.css` (editor ~434, front end ~552; the front-end one is unconditional, so 50 KB loads on every page, against §6.7 "loaded on pages with media") | WP-2 |
| `sgs-blocks.php` | Remove `media-element-attrs-register.php` require (line 335). `media-top-tone.php`, `lottie-*` requires stay | WP-15b |
| `includes/class-sgs-container-wrapper.php` (3,842 lines, one `render` method plus 5 small statics) | Background image path calls `sgs_next_background_image_index()` and `sgs_responsive_image()` (about 40 background-related matches). WP-0b moves it unchanged; WP-8 then swaps to the renderer. Do the wrapper edit once, not twice | WP-0b, WP-8 |
| `includes/class-post-grid-rest.php`, `includes/product-card-builtin-render.php`, `includes/helpers-brand-logo.php` | Direct callers of `SGS_Media_Element` / `sgs_content_image_claims_priority` / `sgs_image_loading_attrs` outside block folders. Listed under no package | Wave 3 |
| `includes/extension-attributes.generated.php` | Generated by `scripts/generate-extension-attributes.js` from `src/blocks/extensions/*.js` (runs in `prebuild`). Removing `extensions/image-controls.js` regenerates it without five attributes (`sgsObjectFit`, `sgsObjectPosition`, `sgsHeight`, `sgsMaxWidth`, `sgsColourTreatment`); a tracked-file regeneration, Integrator only | WP-15b |
| `theme/sgs-theme/functions.php::preload_hero_image` (reads `backgroundImage` and `splitImage` attrs, which §13 renames) | Remove (FR-49-15). Also `functions.php::enqueue_global_layout_fixes` prints `.wp-block-image:not(.brand-logo-tile):hover img{transform:scale(1.05)}` inline, duplicated in `assets/css/core-blocks.css` (.wp-block-image hover rules): a second hover-zoom path outside Spec 49, and `functions.php::add_missing_image_dimensions` (`wp_content_img_tag` priority 10) can add `width`/`height` to a renderer-authored `<img>` unless the renderer prints them (§7.6 says it does) | WP-2 (add to scope) |
| `theme/sgs-theme/inc/font-preloading.php` | FR-49-15 says remove. Orphan: no `require` in `functions.php` (grep `font-preloading` over theme, scripts, rules: only its own header). Deleting it changes nothing; the live emitter is the copy in `functions.php` | WP-15b |

### 2.3 CSS

| Path | Does today | Callers | Works? | Verdict and change | Owner |
|---|---|---|---|---|---|
| `assets/css/media-element.css` (1,041 lines, 50 KB) | GENERATED from `media-atoms/*.css` by `generate-media-stylesheet.mjs` | enqueued by `class-sgs-blocks.php` (2 handles), `deploy_cache.py`, `check-media-breakpoints.js`, 22 files name it | Works, unconditional on the front end | Replace with `media-base.css` plus optional `-overlay`, `-video`, `-mask`, `-bg` per §6.7 and §14.4; delete | WP-2, WP-6, WP-8 |
| `assets/css/media-atoms/*.css` (16 files, 1,000 lines with `_base.css` 305, box-shape 187, svg-presentation 95, overlay 75) | Per-atom rules fed by custom properties | generator only | Works | Delete | WP-15b |
| `assets/css/extensions.css` (17 KB; image-controls section near line 230: `.sgs-has-image-controls`) | Shared extension CSS, part of it for image controls | enqueued with extensions | Works | Rework: delete only the image-controls section | WP-15b |
| `assets/css/motion.css` | Comments cite media-element.css; real media rules not found by grep (3 matches, comments) | n/a | n/a | Keep; comment fix | WP-10a |
| Block stylesheets with media rules (about 36 `style.css`/`.scss`; heaviest hero 21 matches of object-fit, aspect-ratio or `sgs-media-el`, product-card 14, card-grid 12, gallery 11, option-picker 10, before-after 9) | Each block restates cover/crop and tile rules | per block | Works; duplicated | Rework: each block deletes its own copy during its wave; nothing a package names as a gate for "no media rule left in a block stylesheet" | Waves 1, 3, 4, WP-9 |
| `theme/sgs-theme/assets/css/{utilities,core-blocks,core-blocks-critical,woocommerce}.css` | Aspect-ratio utilities and `.wp-block-image` styles for core blocks | theme | Works; core-block scope | Keep (core blocks, not SGS slots) | none |

### 2.4 Generators, data files, DB

| Path | Does today | Verdict and change | Owner |
|---|---|---|---|
| `scripts/generate-media-attributes.mjs` (250 lines) | Imports `MediaElementControls.js`, writes the PHP type map. Wired in `package.json` `prebuild` and `prestart` and `gates.json` (ids `generate-media-attributes`, `check-media-attributes-parity`) | Delete; `package.json` edits are NOT in §8.2 | WP-1, WP-15b |
| `scripts/generate-media-stylesheet.mjs` (170) | Concatenates atom CSS; `package.json` `prebuild`, `check:media-stylesheet`, gates ids `generate-media-stylesheet`, `check-media-stylesheet` | Delete with the CSS | WP-15b |
| `scripts/generate-extension-attributes.js` | Mirrors every extension attribute to PHP | Keep (generic); output shrinks | none |
| `scripts/generate-svg-allowlist.js` and `src/utils/svg-allowlist.generated.js` | Executes the PHP SVG allowlist into JS | Keep (the SVG kind's sanitiser, §7.9) | none |
| `includes/data/icon-shapes.json` + `helpers-icon.php::sgs_icon_outline_shapes` + `src/utils/icon-shapes.js` | Five paths (hexagon, diamond, octagon, star, blob) in a `0 0 100 100` box, read by PHP, JS and a parity test | Rework to be the shape registry (`media-shapes.json` is a second file for the same job, see section 5) | WP-6 |
| `includes/shape-dividers.php` (625 lines) + `src/utils/shape-dividers.js` | 15 divider paths written twice (PHP array, JS const) and kept equal by a test; callers: wrapper, container render, physics-canvas | Rework only if dividers move; they are section edges, not media (section 5) | WP-6 |
| `includes/helpers-end-shape.php` (273) | `sgs_end_shape_url` and mask-image end cuts; callers: label render, render-helpers, `EndShapePanel.js` | Keep; reuse `sgs_end_shape_url` for mask data URIs | WP-6 |
| `includes/helpers-shadow-filter.php` (77) | `sgs_shadow_value_to_drop_shadow`; 1 external caller (`nav-menu-submenu-css.php`) | Keep, reuse for masked shadows | WP-6 |
| DB table `block_attributes` (columns: `css_property`, `css_element`, `css_state`, `css_tier`, `tier_shape`, `role`, `emit_shape`, `canonical_slot`, others; no `paint_node`) | Media facts today: `object-fit` 7 rows, `object-position` 5, `aspect-ratio` 10, `mask-image` 1, `clip-path` 2, `mix-blend-mode` 8, `filter` 7; `sgs/media.overlayColour/Gradient/Opacity/BlendMode` have NULL `css_property`; `objectFit`, `objectPosition`, `aspectRatio` on `sgs/media` have `css_element='wrapper'` with `tier_shape` NULL | Rework per §8.1 | WP-1 |
| `scripts/dbschema/{schema.sql,migrate.py,migration-manifest.json,seed-history.json,check_schema_drift.py,check_value_identity.py}` | Schema, migrations, drift and value gates | Rework: add the nullable `paint_node` column and its layer (PS-1 proves) | WP-1 |
| `scripts/attr-classification-overrides.json` (430 KB, hand overrides), `behavioural-analyser/css-property-classifications.json` (1.1 MB, derived from PHP render code by `extract-signatures.py`), `data/property-suffixes.json`, `data/roles.json`, `css-keyword-enums.json` | Classification layers. The 1.1 MB file is regenerated from render source, so when render.php changes the derived rows move | Rework: generator supplies overrides (§8.1). The derived file is a tracked-file regeneration, Integrator only | WP-1 |
| `scripts/data/scalar-media-roles.json` + `seed_reference_data.py::_seed_scalar_media_roles` | Roster of hero `splitMedia*` content attributes given `role='scalar-media'`; refuses non-class-section blocks | Rework: names change (`splitMedia*` to `split*`, §13) | WP-1, WP-9 |
| `scripts/data/property-equivalents.json` (4 rows: align-self, justify-self, height to min-height or max-height) | Cloner draft-to-setting equivalents. No row for `object-fit`, `object-position`, `aspect-ratio`, `mask-image` | Rework: add rows only if a draft property does not map one to one. §6.4 claims one to one, so likely none; verify per property in WP-13 | WP-13 |
| `scripts/consistency/{setting-registry*.json,golden-controls.json,goldens/behaviour.json,attr-role-map.json}` | Registries naming media attributes | Rework by regeneration | WP-15a |

### 2.5 Gates and scripts that read removed code (§8.2 names only 8)

| Path | Reads | Verdict | Owner |
|---|---|---|---|
| `scripts/inspector-scan/rules/37-media-no-handroll.js` (667), `38-media-attr-parity.js` (506), `39-media-control-coverage.js` (640) | `media-element-attrs-register.php`, `sgs_media_element_style`, atom registry, `MediaElementPanel` | Delete or replace; registered in `inspector-scan/rules.json` | WP-15a |
| `inspector-scan/rules/40-media-svg-sanitised.js` | `sgs_allowed_svg_tags`, `sgs_tier_media_render` | Rework (keep the SVG sanitise rule, new subject) | WP-15a |
| `scripts/wiring-fingerprint/wf_media.py`, `wf_resolve.py`, `wf_tokens.py` | `sgs_media_element_stored_attr`, `SGS_Media_Element::style` read sites | Rework; PS-1 names `check-wiring-fingerprint` | WP-1, WP-15a |
| `scripts/check-media-breakpoints.js` (217) | Breakpoint literals in `media-element.css` | Rework to the new static CSS | WP-15a |
| `scripts/check-dead-controls.js` (3,300 lines) | `sgs_media_element_*`, `SGS_Media_Element`, atoms | Rework | WP-15a |
| `scripts/check-universal-fit.js` | `imageControls` capability entry | Rework | WP-15a |
| `scripts/surveys/check-image-controls-support.py` (gate `surveys-check-image-controls-support`), `census-media-presentation.py`, `survey-dead-css.py`, `survey-control-mounts.py` | `imageControls`, `sgs_media_position_css` | Delete the first (gates.json); rework or delete the rest | WP-15a |
| `scripts/check-control-helper-parity.py`, `check-length-unit-partners.py`, `audit-block-file-consistency.py`, `audit-post-content-blocks.py`, `audit-feature-parity.py`, `migrate-border-shape-b.js`, `generate-helper-catalogue.py`, `check-motion-literals.py`, `deploy_cache.py` | Names of removed symbols or `media-element.css` | Rework one by one (not verified each) | WP-15a |
| `scripts/qa/lib/wp-stubs.php`, `first-section-stub.php` | Stub `sgs_render_media`, `sgs_content_image_claims_priority` | Rework | WP-3 |
| `scripts/gates.json` (11 media entries: ids `test-media-attr-parity`, `generate-media-attributes`, `check-media-attributes-parity`, `test-media-injection-parity`, `check-media-breakpoints`, `test-media-atom-parity`, `generate-media-stylesheet`, `check-media-stylesheet`, `check-media-atom-purity`, `check-media-disclosure-coverage`, `test-media-enum-vocabulary`, plus `surveys-check-image-controls-support`) | | Rework: remove or replace | WP-15a |
| `scripts/inspector-scan/fixtures/37-*`, `40-*`; PHP tests: `run-image-loading-attrs-standalone.php`, `run-media-atom-shadow-hover-standalone.php`, `run-media-hover-zoom-clip-standalone.php`, `BuyboxImagePriorityTest`, `PostGridImagePriorityTest`, `ProductCardImagePriorityTest`, `run-lottie-standalone.php`, `run-container-wrapper-standalone.php`, `run-scrim-gallery-standalone.php`, `ImageIntrinsicSizeTest` (22 test files name removed symbols) | | Delete or port to the new classes | WP-3, WP-15a |

## 3. Shared files to keep (reuse, not rebuild)

| Path::symbol | What it does | Callers | Works? | Use in Spec 49 |
|---|---|---|---|---|
| `includes/class-sgs-css-registry.php::sgs_collect_css` | The §6.7 "collector": lifts `<style>` tags into one head file | 9 prod | Works, editor-safe | Renderer returns `css`; caller passes it here |
| `includes/helpers-responsive.php::sgs_emit_tier_decls`, `sgs_emit_responsive_css`, `sgs_resolve_tier` (1,042 lines) | Per-device (desktop, tablet, mobile) declaration emitter and resolver | 77, 105, 29 | Works, widest-used emitter | The `plain` emitter kind (§6.2) should call it, not rewrite it |
| `includes/helpers-box.php::sgs_box_object_longhands`, `sgs_corner_object_longhands`, `sgs_border_radius_tiers` | Sides and corners emission | 55, 16, 12 | Works | The `sides` and `corners` kinds |
| `includes/helpers-border-style.php::sgs_border_element_decls` | Border width, style, colour | 91 | Works | Border settings |
| `includes/helpers-shadow-layers.php::sgs_shadow_box_decls`, `helpers-shadow-hover.php::sgs_shadow_hover_rules` | Shadow and lift on hover | 26, 14 | Works | The `shadow` kind |
| `includes/helpers-hover-state.php::sgs_hover_guarded_rule`, `sgs_hover_media_wrap` | `@media (hover:hover)` wrapper plus touch setting | 20, 29 | Works | §8's hover rules; the spec's 200 ms and reduced-motion text should call these |
| `includes/helpers-css-safety.php::sgs_resolved_css_value` | Accepts one `var()`, `calc()`, `min()`, `max()`, `clamp()` | many | Works (H) | Validator for every length value |
| `includes/helpers-image-dimensions.php::sgs_image_size_attrs`, `sgs_image_intrinsic_size` | Width and height for URL-only images | 12, 2 | Works | Renderer, for sources with no attachment id |
| `includes/helpers-svg-kses.php`, `helpers-svg-document.php`, `helpers-svg-inline-attachment.php::sgs_svg_inline_attachment`, `svg-upload.php` | SVG sanitise on upload and on print | kses 23 files; inline-attachment 3 | Works | The SVG kind (§7.9): printing and sanitising already exist; not named in §6.9 |
| `includes/helpers-scoped-instance-vars.php::sgs_scope_class_for_root`, `helpers-instance-scope-hash.php::sgs_instance_scope_hash` | Content-hash scope classes | 7 files (one is the deleted image-controls); 2 blocks | Works | §6.9 says "scope-class hashing" without a symbol; which one is meant is not verified |
| `includes/media-top-tone.php` + `class-sgs-media-cli-commands.php` | Top-luminance attachment meta for header ink | 3 files | Works | Not a slot concern; leave |
| `includes/lottie-upload.php` | JSON mime and validation for the Lottie effect | loaded `sgs-blocks.php` | Works | Leave |
| `helpers-end-shape.php`, `helpers-shadow-filter.php` | See 2.4 | | | |
| `theme/sgs-theme` core-block CSS | Core block image styling | | | Leave |

## 4. §8.2 mismatches

Removed items that still have callers Spec 49 does not account for: `includes/class-post-grid-rest.php` and `includes/product-card-builtin-render.php` (call `SGS_Media_Element` directly); `includes/helpers-brand-logo.php` (`sgs_image_loading_attrs`); `includes/class-sgs-container-wrapper.php` (`sgs_responsive_image`, `sgs_next_background_image_index`); `scripts/qa/lib/wp-stubs.php`; `package.json` `prebuild`, `prestart` and four `check:media-*` script entries; `scripts/gates.json` (12 ids); `inspector-scan/rules.json` plus rules 37 to 40; `wiring-fingerprint/wf_media.py`; `check-dead-controls.js`; `check-universal-fit.js`; `check-media-breakpoints.js`; `check-image-controls-support.py`; `src/blocks/extensions/media-elements.js`, `extension-roster.json`, `hide-extensions.js`, `index.js` (JS, T1/T2 scope, listed for completeness); `src/components/media/canvasStyle.js`, `ProductCardImagePanelLayout.js`, `HeroSplitMediaPanelLayout.js`.

§8.2 names that do not exist at that path: `src/components/MediaPanelLayout.js` (real: `src/components/media/MediaPanelLayout.js`), `src/components/MediaStylingPanel.js` (real: `src/blocks/media/components/MediaStylingPanel.js`), `src/components/MediaBoxShapeControls.js` (real: `src/components/media/controls/MediaBoxShapeControls.js`), `src/components/ObjectFitField.js` (real: `src/components/media/controls/ObjectFitField.js`), `extensions/image-controls.js` (real: `src/blocks/extensions/image-controls.js`). `sgs_media_element_*` and every other PHP, CSS and script name resolves. Names that are new, as expected: `class-sgs-background-layer.php`, `media-settings.json`, `media-shapes.json`, `generate-media-slots.mjs`.

Removed attributes with no §13 row: `sgsHeight` (per-device height object), `sgsMaxWidth`, `sgsColourTreatment` ("white" CSS filter to turn a colour logo white on a dark footer; no Spec 49 equivalent: Greyscale and Blur are the only filters in §8). `imageHeight`, `imageWidth` (intrinsic atom values) and `displayWidth` (deleted) are covered.

## 5. Over-built against the goal

1. Five new emitter kinds written twice (PHP and JS) with a byte-identity matrix (§6.2, C3, PS-7), when `helpers-responsive.php`, `helpers-box.php`, `helpers-border-style.php`, `helpers-shadow-*` and `helpers-hover-state.php` already do plain, sides, corners, shadow and hover with 77 to 105 callers each, and JS twins `src/utils/border-preview.js`, `radius-preview.js` and `spacing-preview.js` exist. Simplest design: the table row names an existing helper; the new `SGS_Media_Emitter` is a thin dispatcher. Spec 32 and 35 point the same way (shared emitters).
2. `media-shapes.json` as a second shape registry when `icon-shapes.json` is already the one registry read by PHP, JS and a parity test. Extend that file (add `fit`, `paint`, `ratio` fields and the new paths) instead of creating a parallel one.
3. Moving the 15 shape-divider paths and the buybox sticker geometry into the registry (§7.5). Dividers are section edges, not media; this couples an unrelated feature to the cutover for no gain against the goal. Defer.
4. New `paint_node` column when `css_element` is free text with 499 distinct values and already names the target element. Defensible (the resolver reads `css_element` for selectors), but PS-1 should first test whether adding the six node names as `css_element` values is enough.
5. A new `SGS_Media_Priority` pre-pass is justified; the hidden-surface tracker and `Sgs_Motion_Renderer::in_first_section` already exist and should be reused (section 2.1).

## 6. Three findings that matter most

1. `sgs_media_cover_crop_plan` returns "keep auto" the moment `sgs_media_atom_box_shape_resolve_sizing_mode` disappears, so every image silently loses its derived `sizes` at cutover; §8.2 does not list it and §7.6 is the only replacement.
2. The hidden-surface tracker (`sgs_hidden_render_*`) and `sgs_allowed_svg_tags` live inside files §8.2 deletes; neither is named anywhere. Move them first or WP-3 and the SVG kind lose a working base.
3. The gate and build wiring is far larger than §8.2's script list: 12 `gates.json` ids, `package.json` prebuild and prestart, inspector rules 37 to 40, wiring-fingerprint, `check-dead-controls.js` and 22 test files all name removed code. Only WP-15a's `gate-disposition.json` can absorb that, and it is not in WP-15b's removal checklist.

## 7. Not verified

PHPUnit, node gates and live pages were not run, so "works" rests on reading code and on reports H, I, M for behaviour. The `sgs_lottie_layer_add_source` filter's actual consumer, the namespace of the duplicated `preload_hero_image` in `inc/font-preloading.php`, and which "scope-class hashing" §6.9 means were not checked. The seeder `sgs-update-v2.py` (7,920 lines) was grepped for media references only; its stages that read `css-property-classifications.json` were not traced. Per-script reworks in 2.5's long row were not each opened.
