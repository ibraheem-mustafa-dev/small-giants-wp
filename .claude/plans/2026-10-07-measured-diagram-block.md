# D1 measured-diagram blocks + bound product values that follow the picked size (v3)

## Context

Eye Care's product page Sizing tab should show the draft's front and side frame drawings, with labelled measurements (lens width, bridge, lens height, temple, in mm) that change when the shopper picks a size. This is register row N36S, decision D1.

Bean's goal is a reusable block for diagrams with measurements on any client site. It has to:
- use the shared helpers;
- comply with Spec 32 (no inline style, the token contract) and Spec 35 (the inspector standard);
- be fillable by the Spec 47 computed route, so the next client's draft can be cloned into it.

Today, every value bound through `sgs-product/field` (the measurements table, the Details tab) shows only the parent product's meta, so it never follows the size picker. Bean widened the scope: bound product values follow the size picker too, so the table and the diagram always agree.

History of this plan:
- v2 applied a five-member adversarial council's must-fixes (§F).
- v3 adds:
  - Wave 0, which unifies the shapes this block shares with existing blocks;
  - Spec 47 route compatibility, which replaces v2's Spec 31-style "extractor" idea;
  - Bean's contrast rule: use `text`, `text-muted` or `accent`.

## Wave 0. Unify the shapes this block shares (before building it)

Each item is re-proven before any edit, against the DB and the attributes added at registration time (`includes/*-attrs-register.php`), not from `block.json` alone. A block.json-only inventory inflated typography, colour and media drift and was withdrawn after Bean's challenge. Wherever more than 3 files get the same change, the detector is built first (`.claude/THE-MIGRATION-METHOD.md`). The framework is pre-production, so saved content is fixed by regenerating trees, never by `deprecated.js`.

- **W0.1 Positions reach CSS at every tier.** `sgs/decorative-image` writes its tablet and mobile `positionX`/`positionY` (plus `width` and `rotation`) only to `data-*` attributes that nothing reads; `render.php` and `style.css` admit it.
  - Emit those tiers as scoped `@media` rules through `sgs_resolve_tier` + `sgs_emit_tier_rules`, and remove the dead `data-*` attributes.
  - This sets the convention the new block uses: `<name>X`/`<name>Y` tier objects in %, routed to `left`/`top`.
- **W0.2 Line styles go through one helper.**
  - Five settings hand-roll their own allow-list instead of calling `helpers-border-style.php::sgs_border_style_keyword`: `cart.pillBorderStyle`, `whatsapp-cta.cardBorderStyle`, `separator.lineStyle`, `trust-bar.iconCircleBorderStyle` and `notice-banner.iconCircleBorderStyle`. Route them through it.
  - Keep each block's enum where a subset is physically right. Record the rule: border-style settings declare the helper's keyword list or a documented subset.
- **W0.3 Enum spelling. DONE (code-only).** `centre` → `center` in `tabs.tabAlignment`, `nav-drawer.chromeSlotPlacement` and `hero.alignment`. This covers the enum, the editor option, the PHP allow-list (`nav-drawer-chrome.php`), the CSS modifier class, and the one stored value (`theme/sgs-theme/patterns/hero-centred.php`).
  - `nav-bar-menu.submenuAlign`'s `page-centred` is a mode name, not a CSS keyword, so it stays.
  - The `hover-guard/test-fixtures` copies are frozen snapshots and also stay.
  - **Split out, not built here: box alignment left/right → start/end.** The settings are `icon.iconAlign`, `media.alignment`, `separator.alignment`, `nav-drawer.drawerAlign` and `tabs.tabAlignment`. It is a client-visible enum migration with stored values in Indus pages, theme patterns and Eye Care trees, so THE-MIGRATION-METHOD needs a detector, a census of stored content on 3 sites, and Bean settling the shape first (Step 3). The new blocks gain nothing from it, since they declare `start|center|end` themselves. It is recorded in §G.
- **W0.4 One size-change listener.** Fold `buybox/picker-label-view.js` into the new `@sgs/bound-sync` (§A). The buybox's `data-sgs-bb-axis` label becomes a bound span, leaving one listener and one label map. `choice-flow/pricing.js` stays separate, because it reprices a flow rather than displaying a bound value.

Verify each item before Wave A:
- a planted-fault check showing red, then green;
- `npm run build` with fast gates green;
- decorative-image's mobile position measured live at 375.

## A. Bound product values follow the picked variation (framework)

The binding wraps its own value in a span, and the browser swaps only that span's text. Icons, links and inputs in the block are never touched.

1. **Right value on first paint.** In `class-product-bindings.php::get_value`, for a variable product:
   - Resolve the selected combination as the buybox does: run `Product_Manifest::build()`, then `helpers-preselect-url.php::sgs_preselect_apply_to_manifest()`, then `combos[defaultKey].variationId`. That way `?attribute_pa_size=l` opens with L's numbers.
   - Product resolution moves into a public static `resolve_product( $args, $block )`, used by both callers.
2. **The wrap rule.**
   - Pairs in the `Product_Field_Variations::FOLLOW_TARGETS` allow-map get the wrapper: `sgs/text.text`, `sgs/heading.content`, `sgs/label`, `sgs/button.label` (extend `button/render.php`'s kses list) and `sgs/diagram-dimension.value`.
   - For those, the binding returns `before` + `<span class="sgs-bound" data-sgs-bound-source="sgs-product/field" data-sgs-bound-scope="<productId>" data-sgs-bound-key="<key>">value</span>` + `after`.
   - Plain-string attributes (alt, placeholder, URL) are never wrapped (documented).
   - The source-neutral names let a later source plug in.
3. **What follows the picker.**
   - `meta.*` and `sku`: per variation.
   - `attribute.*`: from `detail.attributes` through the manifest's term labels.
   - New `dimensions.length|width|height` and `weight` keys, read through WooCommerce's getters. Variations inherit those.
   - `sgs_product_field_list` also scans `product_variation`.
   - Product-level fields never vary (documented).
4. **Fallback.** Once any variation carries a key (`metadata_exists`), the variations decide. Only when none does is the parent's value used.
   - An empty value still renders nothing, exactly as today. Backlog Q10 (a `fallback` argument or hide-when-empty on the binding) is Bean's open choice, so the binding's empty behaviour is not changed here (table session, 2026-10-07).
   - Only a non-empty value is wrapped. When a wrapped value's selected variation is empty, the module sets the span's `data-sgs-bound-empty`, which one shared rule hides.
   - `sgs/diagram-dimension` renders its own value container carrying the `data-sgs-bound-*` marker even when the first-paint value is empty, so a size that has the value can fill it later. `hideWhenEmpty` hides that child meanwhile.
5. **Data and module.**
   - Variation IDs come from the cached manifest combos, then one `update_meta_cache` call per product.
   - The data is delivered through the core `script_module_data_@sgs/bound-sync` filter, and `wp_enqueue_script_module` runs at render time, front end only (`sgs_is_frontend_render()`).
   - `src/shared/bound-sync.js` is registered like `src/shared/info-toggle.js`.
   - It listens for `sgs-variation-change` and ignores `variationId` 0, so an unavailable combination keeps the last valid size.
   - On each change it restarts a short fade, inside `prefers-reduced-motion: no-preference` only, using the easing token from `helpers-motion-easing.php`.

## B. Blocks: `sgs/measured-diagram` (parent) + `sgs/diagram-dimension` (child)

Each measurement is a child block with a real bindable `value`. So every binding source works with no new code: `sgs-product/field`, `core/post-meta`, `sgs/site-info`, ACF, or a typed number. `wp-build-page.js` validates the children's settings, each child scopes its own CSS, and the tiers are top-level objects that the gates and the Spec 47 resolver can see.

**Coordinate convention (one unit everywhere).** All positions are **% of the drawing box (0–100)**.
- **Line geometry:** `startX`, `startY`, `endX`, `endY`, flat numbers. They are geometry inside one drawing, not per device, so they use role `position`, `css_property` NULL and no tier.
- **Label placement:** `labelX`, `labelY`, tier objects routed to `left`/`top`, the same shape and routing as `sgs/decorative-image` after W0.1. The Spec 47 resolver can then write them, because it maps one CSS property to one setting.

**Parent `sgs/measured-diagram`** (`sgs-content`, `save` returns `<InnerBlocks.Content />`, `allowedBlocks: ["sgs/diagram-dimension"]`)
- **Drawing:** the media-element atoms with prefix `drawing` (attributes added at registration).
  - Editor: `MediaElementPanel insertion="element"` + `MediaPicker` in `MediaUploadCheck`.
  - `intrinsic` gives the width and height. They become `--sgs-measured-diagram-ratio` (`aspect-ratio`) and reach the children via `providesContext`.
  - `meaning` gives the alt text and a decorative toggle.
  - The drawing URL, ID and alt join `class-sgs-block-bindings-support.php::SUPPORTED_ATTRIBUTES`, so a shared template can bind a per-product drawing.
- **Attributes:**
  - `maxWidth` (tier);
  - `labelMode` (tier, `onDrawing|numbered`): numbered puts a small marker at each line's midpoint and lists the labels under the drawing, CSS only;
  - `lineColour` + `Gradient` (`helpers-svg-gradient.php::sgs_svg_stroke_gradient`), `lineWidth`, `extensionColour`, `extensionWidth`, `extensionStyle` (a `solid|dashed|dotted` subset of the W0.2 keyword list), `tickLength`;
  - `TypographyControls` with two targets, `value` and `caption`, each showing the members a label needs (size, weight, line height, letter spacing, transform; family opt-in);
  - `valueColour` / `captionColour` + `Gradient` (the text-colour trio in `helpers-tokens.php`);
  - `labelGap` (tier).
- Children inherit every style through the parent's custom properties.
- **Markup:**
  - `<figure>` contains the drawing and `<ul class="sgs-measured-diagram__labels" role="list" aria-live="polite">` with one `<li>` per child.
  - The labels are real, readable text, so they are the accessible text alternative: no duplicate hidden list and no screen-reader-only class.
  - The line SVGs are `aria-hidden`.

**Child `sgs/diagram-dimension`** (`parent: ["sgs/measured-diagram"]`, `usesContext` for the drawing size)
- **Attributes:**
  - `caption` (`role: text-content`) and `value` (`role: content`, bindable);
  - `kind` (`dimension|leader`), `endStyle` (`tick|arrow|none`) and `orientation` (`horizontal|vertical|free`, which snaps the end point);
  - the geometry above;
  - `extReach` / `extOvershoot` (% of drawing width, so one scale holds on both axes);
  - `labelX` / `labelY` (tiers), `labelAlign` (`start|center|end`), `labelOrder` (`valueFirst|captionFirst`);
  - `hideWhenEmpty` (default true; hides its own label and line through `:has([data-sgs-bound-empty])`).
- **Render:**
  - a per-child uid scoped rule. `labelX`/`labelY` are emitted as `left`/`top` % declarations; the tiers go through `sgs_resolve_tier` + `sgs_emit_tier_rules` at 768/1024, desktop base, inherit-down (Spec 35 D2/D3).
  - an `<svg>` with the context viewBox, carrying only coordinate attributes (`x1 y1 x2 y2`, `d`, `viewBox`; documented in the docblock);
  - stroke, colour, width, dash and `vector-effect: non-scaling-stroke` in `style.css`, with dash = `extensionStyle` × stroke width.
- **Geometry:** one function, twinned in `src/utils/diagram-geometry.js` and `includes/helpers-diagram-geometry.php`. It maps % to viewBox units, computes the perpendicular extension and tick, and draws arrows. Both versions are tested against one shared fixture JSON that includes the Eye Care lens-width line.
- **Sanitising:** floats are cast and clamped to 0–100, and enums are checked with `in_array( …, true )`.

**Editor (Spec 35)**
- The canvas draws the lines and labels client-side with `geometry.js`.
- The selected child gets drag handles plus arrow-key nudging; the `RangeControl`s are the keyboard path. The orientation lock keeps lines straight.
- With no resolved value, the canvas shows the sample text "00 mm".
- **Panels:**
  - by element: Drawing, Line, Extension, Value, Caption;
  - **one** `SgsColourPanel` with four literal rows;
  - the child gets Measurement and Position panels;
  - `labelMode` sits in the pinned Settings panel.
- **Controls:**
  - two- and three-option enums use `ToggleGroupControl`;
  - lengths use `SgsLengthControl` / `ResponsiveLengthControl`, emitted through `helpers-css-safety.php::sgs_css_length_value`;
  - `ToolsPanel` once a panel has 6 or more controls.
- **`supports`:**
  - no native color, typography, spacing or shadow;
  - `sgs.imageControls: false` (cropping would move the drawing under fixed labels);
  - `hideExtensions` for parallax and click effects;
  - `colourExemptions {rule:"states"}` (nothing is interactive).
- **`supports.sgs.elements`** (explicit attribute maps):
  - `wrapper`: `css:max-width` → `maxWidth`
  - `line`: `css:stroke` → `lineColour`, `css:stroke-width` → `lineWidth`
  - `extension`: `css:stroke` → `extensionColour`, `css:stroke-width` → `extensionWidth`
  - `label`: `css:gap` → `labelGap`, `css:left` → `labelX`, `css:top` → `labelY`
  - `value`, `caption`: text targets
- **Defaults are tokens** (Spec 32 FR-32-5). Colour and width attributes default to `""`, and `style.css` paints through `var(--sgs-measured-diagram-<role>, var(--wp--custom--measured-diagram-presets--default--<role>, <token>))`.
  - Framework tokens: line `accent`, extension `border`, value `text`, caption `text-muted`.
  - The unit text comes from the binding's `before`/`after`, so block.json holds no " mm".

## C. Spec 47 route compatibility (the cloning path for the next client)

Under Spec 47 the route measures the rendered draft and writes settings through the framework DB. It does not use a block extractor (that is Spec 31 thinking, now withdrawn).
- **Calibration fixtures:** add entries in `scripts/computed-route/calibration-fixtures.json`. The parent fixture holds an image (the `calibration-targets.json` overlay image) and two children; the child's parent chain is the diagram. Run `calibrate.mjs` for both blocks on the local mirror after deploy. Every styling setting must map to a slot. A dead setting is a framework defect, fixed before release.
- **Walker reads stroke paint:** `scripts/parity/lib/collect.mjs` reads `icon-stroke` but not `stroke-width` or `stroke-dasharray`. Add them as properties of an SVG shape element, with a GAP-CHECKLIST section and a planted fault that turns red. The walker stays standalone (R-47-1).
- **Declared label positions:** add `left`/`top` to the walker's `devtools.mjs::DECLARED_PROPS`. A declared `%` can then be written as a % (§3.3's used-value rule); otherwise a computed px would freeze the layout. This also benefits `sgs/decorative-image`.
- **Geometry is skeleton content:** line endpoints have `css_property` NULL, so a Fill skeleton may carry them (R-47-10). They come from the rendered draft, measured in the browser (R-47-4): each dimension path's `getBBox()` mapped through `getScreenCTM()` against the drawing's box gives the %. A small reader `scripts/computed-route/lib/fill-diagram.mjs` (indexed in the README per R-47-1) is built here and used for Eye Care in §D.
- **Bound values are handover:** a label's number is product data, so a text row on it is handover owner `product-data`, never a write.

## D. Eye Care (only after the table session's commit is on `origin/main`)

- **Assets:** `sites/eye-care-ward-end/assets/sizing/frame-front.svg` (680×300) and `frame-side.svg` (680×230), with frame strokes only. `build/upload_sizing_diagrams.py` uploads them idempotently (the `apply_site_icon.py` pattern), then checks that the viewBox survived and the size is non-zero.
- **Colours** (Bean: text, text-muted or accent, whichever fits best), measured on the white card `surface-alt`:
  - value `text` #141414 (≈18:1);
  - caption `text-muted` #5E584F (≈7:1; the draft's warm grey deepened, same hue family);
  - line `accent` #9C8B78 (≈3.3:1, the draft's own line colour, passing the 3:1 a graphic needs);
  - extension guides `border-strong`.
  - These go in `theme-snapshot.json` `custom.measuredDiagramPresets.default`, pushed with `push-theme-snapshot.py`.
- **Tree** (in `build/gen_single_product.py`, then regenerated):
  - a card container between the "This pair, measured" header row and the table;
  - inside it, "Front" plus a diagram with three children bound to `meta._sgs_frame_eye|bridge|height` (`after:" mm"`), then a bordered "Side" plus a diagram with one child, the temple;
  - positions measured from the rendered draft by `fill-diagram.mjs`;
  - `labelMode.mobile = numbered` unless the 375 check shows no collision.
- **Rebuild:** `wp-build-page.js` (`--dry-run` first). Purge LiteSpeed after any meta reseed.

## E. Execution order and split

The main thread owns Wave 0's detectors, A, the geometry twin, C and all QC. A `wp-sgs-developer` (Sonnet) builds the two blocks from §B, and the main thread reads its diff. D is done inline.

1. Copy this plan to `.claude/plans/2026-10-07-measured-diagram-block.md`. Message the table session (A changes how their bound rows render, and I edit `class-product-bindings.php`).
2. Wave 0: re-prove, detect, fix, gates, then commit and push each item.
3. A, then B, plus the `seed-composition-roles.py` entries. Commit locally, reseed the DB from a detached-HEAD worktree, then build and run the fast gates (`check-wiring-fingerprint`, `check-element-manifest-conformance`, `audit-inline-styling.js --check`, `check-id-scoped-emits`, `check-enum-control-shape`, `audit-bindable-attrs`, the geometry fixtures). Commit `css-property-classifications.json`, check `git log origin/main..main`, push.
4. C: the walker additions with planted faults, the fixtures, `fill-diagram.mjs`.
5. Canary: message peers, then `build-deploy.py --target sandybrown --blocks-only`, then calibrate both blocks. Reuse acceptance pages:
   - (a) a blog post with typed values, vertical and diagonal lines;
   - (b) a page bound to `core/post-meta`;
   - (c) a fixture variable product with three sizes, one with no height, and WooCommerce dimensions in cm.
6. After the table commit: D, a deploy to eye-care-test (peers messaged), the snapshot push, the rebuild. Live check at 375, 768 and 1440 across S, M and L, plus a `?attribute_pa_size=<non-default>` load.
7. Update the D1 section of the backlog, `02-SGS-BLOCKS.md` (+ the Spec 32 §9 roles: line, extension, value, caption) and Spec 47 §3.6 (the new walker reads). Regenerate the block reference with `/sgs-update`. Report N36S to the table session. Save the inventory lesson to auto memory: block.json-only counts miss attributes added at registration, opt-in typography members and state-named colour settings. Commit, push, `/handoff`.

## F. Council changes applied (v1 → v2)

| Finding (voices) | Change |
|---|---|
| Root `textContent` swap wipes composite blocks (4) | The binding wraps its own span; an allow-map |
| Flat mobile overrides, no tablet (4) | Tier objects through `sgs_emit_tier_rules` |
| Hand-rolled image attributes (3) | Media-element atoms; intrinsic size → aspect-ratio |
| `:nth-child` traps (3) | Child blocks, each scoped by its own uid |
| Two colour panels / panels by property (2) | One `SgsColourPanel`, element panels |
| Per-instance client colours (2) | FR-32-5 preset layer in the snapshot |
| Gates before the reseed (2) | Commit → reseed from HEAD → gates → push |
| Product-only values (1, structural) | Child blocks with real bindings |
| First load shows the parent's value (1) | Preselect-aware server value |
| Parent fallback revives deleted heights (1) | Variations decide |
| Footer island races the module printer (1) | `script_module_data_` + enqueue at render |
| Stroke attributes misrouted (1) | Explicit `css:stroke`/`css:stroke-width` attrMap |
| Ellipsis truncates values; mobile collisions (2) | Never truncate; `numbered` mode; no-overlap check |
| Perpendicular % skews (2) | % of drawing width; geometry twin |

## G. Deferred (recorded in the repo plan)

- Box alignment `left|center|right` → logical `start|center|end` on five settings (W0.3's split-out item). Run it through THE-MIGRATION-METHOD with its own detector, once Bean confirms the logical shape.
- An angle `kind` (an arc plus degrees). Trigger: the first client needing angles.
- A conditional-visibility rule for product category or field, so one template can hold one diagram per product shape.
- `decimals` and unit formatting, plus a shopper mm/inch toggle.
- Stock text in the `sgs-variation-change` detail.
- Mixed per-size values on a plain bound text. When only some sizes carry a value, switching to an empty size hides the `.sgs-bound` span, but the binding's after-text (" mm") outside it stays. The diagram child is unaffected, because it hides the whole measurement. Fix by wrapping before/after inside the span when the value can vary. Trigger: the first product whose sizes disagree on having a value. Today Q10's six frames lack a lens height on every size, and they paint the binding's fallback instead (77c9746c1).
- Shared screen-reader-only class consolidation (4 duplicate definitions; not a settings shape), recorded in LEDGER Parked.

## Verification

- Build and every fast gate green after the reseed. The full tier runs in `build-deploy.py`. The geometry fixtures pass in PHP and JS. The walker additions turn red on their planted faults.
- Live DOM on canary pages (a), (b) and (c), and on eye-care-test, at 375, 768 and 1440:
  - zero `[style]` in either block, and no `stroke=`, `fill=` or `stroke-dasharray=` attributes;
  - labels sit at their lines' midpoints, with no two label boxes overlapping;
  - after each size click, every `[data-sgs-bound-key]` equals that variation's meta (`wp post meta get <vid> <key>`);
  - the size with no height hides the lens-height label and its line;
  - a bound `sgs/button` keeps its icon after a size change;
  - `?attribute_pa_size=l` matches before any click;
  - axe is clean;
  - no animation when reduced motion is emulated.
- `calibrate.mjs` maps every styling setting of both blocks to a slot, with no dead settings.
- Negative controls:
  - changing one fixture variation's meta changes its label;
  - a simple product emits no module data;
  - decorative-image's mobile position moves at 375.
