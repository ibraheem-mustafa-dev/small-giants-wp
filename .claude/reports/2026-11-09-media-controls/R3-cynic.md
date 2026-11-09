# R3 Cynic review of Spec 49 (SGS Media System)

STRENGTHS

Media-first with the helper printed only on the §7.3 triggers is the right call, and §7.4 states what paints where. Rejecting slot-level object attributes (§6.1) shows the author knows the DB and resolver contract. Position-based loading (§7.7) replaces today's static counter. Proof steps PS-1 to PS-5 come before the build. The migration tool refuses unmapped attributes. The AC items carry negative controls.

MUST-FIX

1. The truth table cannot be the single source (§6.1). The spec says PHP, the editor, the generator, the gates and the DB all read `media-settings.json`, but today they read `block.json` attributes and PHP atoms. 140 `check-*`/`audit-*` scripts exist and 46 of the check scripts reference block.json by name. Fix: `media-settings.json` generates only committed `block.json` fragments and generated editor and PHP tables. Add a drift gate that fails when the table and the generated output differ. Gates and the seeder keep reading `block.json`, never the table. Location: WP-1, FR-49-1.

2. A generic emitter cannot be byte-identical with its JS twin on hover, gradients, borders and shadow (§6.2). `BorderColourHover`, `ShadowColourHover`, `ShadowLiftOnHover` and the overlay hover forms need pseudo-class rules, `@media (hover:hover)` and ordering against tier media queries. Gradient-capable colours resolve through `GradientCapableColourControl` and token maps, `SgsBorderControl` takes sides plus colour, and `ShadowControl` is a model not one property. One table row with one CSS property cannot express these. Fix: add `emitter: <kind>` to each row (plain, sides, corners, shadow, colour-with-hover), write about five emitter kinds once in PHP and once in JS, and add hover, gradient and shadow rows to the AC-16 fixture matrix. Drop the "no code per setting" promise. Location: §6.2, §8.

3. The spec contradicts FR-32-4. FR-32-4 says a per-instance override is a custom-property VALUE consumed by a class rule; FR-49-13 says real properties scoped by a hash. Nothing amends Spec 32 (only Spec 35 D5 is amended), and `check-id-scoped-emits.js` and `audit-inline-styling.js` will judge the output. Fix: add a Spec 32 amendment to WP-15 stating that media slots emit real properties in the collector, and run both gates in PS-1. Location: §3 table, FR-49-13.

4. Object-valued responsive attributes against 21 block.json files that use flat `*Tablet`/`*Mobile` attributes and a Container wrapper that reads `backgroundImageTablet`, `gapTablet` and `gridTemplateColumnsTablet`. FR-49-2 forbids flat attributes for media only, so two shapes will live in one inspector and `ResponsiveField` has to serve both. Fix: say plainly that the rule is media-only, and exempt it in the dead-controls and detector gates so they do not flag the objects. Location: FR-49-2, Spec 35 D5.

5. Coexistence and the stalled package (§14 last paragraph, §13). "Ship beside old, remove in one commit" means two attribute families per block for weeks. Gates, DB rows, inspector scans and `wp-build-page` see both. A page saved from the editor in that window writes new attributes that the old render ignores. If WP-14 stalls, both render paths stay live indefinitely. Fix: cut over per block, in ONE commit per block: new block.json, render, editor, migrated content, and the old atoms for that block deleted together. No big-bang removal commit. Add a stall rule: no adopter merges until its migration check is clean. Location: §14 last line, §13.

6. Saved content the migration does not name. There are 58 theme patterns and 22 files under `sites/*/build` (`eye-care-ward-end/build/home.tree.json`, `mega-sunglasses.tree.json`, triage JSON and backup HTML hold `mediaSizing`, `objectPosition`, `backgroundImage`). §13 says "five mirrors" only. Patterns are code, so a DB sweep misses them, and a tree re-pushed by `wp-build-page` re-introduces old attributes after migration. Fix: add patterns and `sites/*/build/*.tree.json` as targets of the same detector, plus a gate that fails when any pattern or tree uses a removed attribute. Location: §13, FR-49-36, AC-25.

7. `css_element` to `paint_node` rename (§8.1). PS-1 proves attributes, not the rename; the resolver, `check_value_identity` and the seeder all read `css_element`. Fix: add `paint_node` as a new column, keep `css_element` until WP-15, and prove both in PS-1. Location: §8.1, PS-1.

8. `<picture>` and core's image filters (§7.1, FR-49-8). `sgs_media_drop_auto_sizes` (hooked on `wp_content_img_tag`) and the theme's `add_missing_image_dimensions` filter work on `<img>` strings; core's lazy logic and srcset generation do not touch `<source>` elements. Fix: the renderer sets loading, decoding, sizes, width and height on every `<source>` and `<img>` itself, and marks the output so the filters skip it. Add a fixture that runs `wp_filter_content_tags` over the renderer's output to AC-4. Keep `display:contents` on `<picture>` only, never on the helper or `<figure>`. Location: §7.1.

9. The loading resolver needs facts a block does not have at `render_block`. "First top-level section", "site header", and "item index in the first two sections" are not in `$block->context`. Fragment renders (post-grid REST in `class-post-grid-rest.php`, cached theme patterns, LiteSpeed fragments) render a block alone, so position is unknowable and the cached answer is wrong for the next page. Today's counter (`helpers-media.php::sgs_next_background_image_index`) is a `static` that resets per request. Fix: compute lead-image identity in one pre-pass over parsed blocks on `the_content` and have the renderer read it. State the fallback when position is unknown (lazy, never high). Run PS-5 on the REST path and a cached fragment before WP-3 starts. Location: §7.7, PS-5.

SHOULD-FIX

1. Editor performance: 60+ rules times three devices evaluated on each keystroke. Memoise per (slot, device) and let the table list each rule's dependency attributes so only dependants re-run. Add an editor timing gate (a Container with three slots).

2. PS-3 border-follows-mask is risky. Decide the fallback now (omit Border while a mask is on) and drop the SVG stroke unless PS-3 passes first time.

3. Hover zoom, `filter:drop-shadow`, overlay `::after`, `overflow:hidden` and parallax all create stacking or transform contexts on nearby elements. Name one transform owner each (media element for zoom, `.sgs-bg-media` for parallax) and add a combination fixture. §7.8 says "existing stacking order preserved" without a test.

4. Hover and tier CSS ordering. The emitter must sort by property, then device, then state, with hover last. Add this to AC-9.

5. FR-49-22 versus Size chips: a chip "clears the other attribute", which must clear only the active device's key, never an inherited one. State it.

6. Derived `sizes` (§7.6) removes the escape hatch. Keep an advanced per-slot `Sizes` override.

7. The Fill fallback (`aspect-ratio:3/2`) will surprise cloned drafts. Have the cloner also set Ratio whenever it sets Fill and the parent height is not definite.

8. Embeds under a helper with `overflow:hidden` or a mask clip focus rings and keyboard focus. Add a keyboard-focus acceptance test.

9. OQ-1 (the CSS budget) blocks WP-2's 10 KB limit. Resolve it before WP-2 starts.

10. Package ownership overlaps: WP-4 and WP-5 both own `src/components/media/`, and WP-8 and WP-10 both touch Container render. Split by file in the table, or agents on one shared worktree will collide.

MISSING

1. A pre-removal gate: zero old attributes in every site's live database, from the detector's `--check`, run before the old code is deleted. Backup restore loses edits made after the backup, so rollback alone is not enough.

2. A list of the 222 gates, grouped as reused, changed or deleted. WP-15 says "new gates" only. Each removed attribute's gate entries and baselines must go in the same commit, or the deploy blocks on a stale baseline.

3. `wp-build-page` needs the new slot shape. Its unknown-setting refusal reads the DB, so trees authored for media must come from the generated schema. Add it to WP-13.

4. Block validation: dynamic blocks (render.php) are safe, but any block with a `save.js` that prints media markup will invalidate. List which blocks are static and give each a plan, since FP-14 forbids `deprecated.js`.

5. Core blocks (`core/image`, `core/cover`) and WooCommerce product images still pass through core's `wp_content_img_tag`. State that they stay on core's logic and count as lead-image candidates.

6. A staged rollout for a bad renderer release: canary first, then the other test sites, one per commit. A runtime kill-switch conflicts with FP-14, so rollback is redeploy-previous-tag only.

7. A closing definition for the spec beyond AC-1 to AC-26: FP-13 says Bean's eye on the five sites co-closes it, and the spec does not name that step.
