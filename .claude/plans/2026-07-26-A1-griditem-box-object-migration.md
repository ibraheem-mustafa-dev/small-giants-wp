# A1 — grid-item box-object migration (BUILD SPEC, council-validated)

**Date:** 2026-07-26 · **Track 1** (Spec 32 no-inline / box-object contract) · **Status:** ready to build
**Governing:** Spec 31 §2.9 / §3.A step-3b / §4 (box_family) / §13.4 FR-31-22 · Spec 32 §6.1
**Validated by:** qc-council 2026-07-26 (3 code-grounded raters, converged OK-band). This spec
already folds in every council correction + the 2 bugs they caught in the original fix-shape.

## Plain-English goal

`gridItemPadding` + `gridItemBorderRadius` are the grid CONTAINER's default padding/corner-rounding
for its child items, shared by 4 blocks (container, cta-section, hero, trust-bar) via ONE editor
panel (`GridItemDefaultsPanel`) and ONE shared PHP wrapper. They are currently flat scalar strings.
Migrate them onto the framework's EXISTING box-object architecture so the client gets a proper
4-side / 4-corner control and the value is a named object attr (Spec 32 contract), WITHOUT breaking
the cloning converter that writes these attrs.

## The 4 blocks (NO 5th — verified)

container · cta-section · hero · trust-bar. All render the shared `GridItemDefaultsPanel`
(`src/blocks/container/components/ContainerWrapperControls.js:1106`) via `<GridItemDefaultsPanel …/>`
(container/edit.js, hero/edit.js:1199, cta-section/edit.js:251, trust-bar/edit.js:408) and the shared
`SGS_Container_Wrapper` PHP (`includes/class-sgs-container-wrapper.php:402,404,638-645`).

## Attr shapes (EXACT)

- `gridItemPadding`: `object`, default `{}` → `{top,right,bottom,left}`, each a CSS length string ("16px").
- `gridItemBorderRadius`: `object`, default `{}` → `{topLeft,topRight,bottomLeft,bottomRight}`, CSS length strings.
- Empty `{}` MUST render identically to today's empty `""` (no `--sgs-gi-*` emitted → neutral). PROVE this.

## Workstreams (ALL required — council-counted)

### WS1 — block.json ×4 (container, cta-section, hero, trust-bar)
1. Change `gridItemPadding` + `gridItemBorderRadius` from `"type":"string","default":""` to
   `"type":"object","default":{}`. Lines: container 401-412; hero 724-734; cta-section 515-526;
   trust-bar 611-622 (verify each).
2. Add to each block's `supports.sgs.boxFamilies` (mirror hero/block.json:79-99 shape — family→[attr]):
   `"gridItemPadding": ["gridItemPadding"]`, `"gridItemBorderRadius": ["gridItemBorderRadius"]`.
   (No Tablet/Mobile tier variants exist for these attrs — single-tier only.)
3. Leave the `attrMap` (`css:padding`→`gridItemPadding`, `css:border-radius`→`gridItemBorderRadius`)
   as-is — routing key unchanged; only the emitted VALUE shape changes (WS4).

### WS2 — shared JS control (`ContainerWrapperControls.js` GridItemDefaultsPanel ~1129-1146)
- Replace the padding `SpacingControl` (line 1129-1134) with WP-native **non-tiered `BoxControl`**
  (single-arg `onChange(next)` returning `{top,right,bottom,left}`), `splitOnAxis={false}`,
  `units` = the px/rem/em/%/vw set (mirror ResponsiveBoxControl.js BOX_UNITS).
- Replace the border-radius `TextControl` (line 1140-1146) with WP-native
  `__experimentalBorderRadiusControl as BorderRadiusControl` from `@wordpress/block-editor`
  (single-arg `onChange(next)` returning the corner object).
- **DO NOT use `ResponsiveBoxControl`/`ResponsiveBorderRadiusControl`** — there are no responsive
  tiers on these attrs (council bug-catch #1). Use the plain WP components directly.
- `onChange` writes the object straight to the attr: `setAttributes({ gridItemPadding: next })`.
- Keep the other 4 controls (background/border/shadow/text-colour) untouched.

### WS3 — shared PHP serialiser (`class-sgs-container-wrapper.php:402,404,638-645`)
- `$grid_item_padding` / `$grid_item_border_radius` are now arrays. Serialise to CSS shorthand:
  - padding `{top,right,bottom,left}` → `"{top} {right} {bottom} {left}"`.
  - radius `{topLeft,topRight,bottomLeft,bottomRight}` → `"{topLeft} {topRight} {bottomRight} {bottomLeft}"`
    (**CSS border-radius order is TL TR BR BL — council bug-catch #2, NOT TL TR BL BR**).
- **Neutrality:** if ALL 4 members are empty/absent, produce `''` so the existing `'' !== …` guards
  (lines 638,644) stay false and NOTHING is emitted — identical to today's empty default. Join only
  non-empty members; if the result is empty/whitespace, emit nothing. `sgs_sanitize_grid_template`
  (helpers-container.php:27) already accepts a shorthand string — keep it wrapping the serialised value.
- Add a defensive `is_array()` check (a legacy string value read from an old post still renders — but
  see the coercion note: WP coerces mismatched stored scalars to `{}` before render, so the PHP will
  normally receive an array or empty).

### WS4 — converter emit (cloning pipeline)
`resolvers/grid.py` (`_GRID_ITEM_PROPS` at line 45; the single scalar branch at 141-156):
- **Fork the branch by property.** `box-shadow`/`background-color`/`color` KEEP the current scalar
  `Write(attr=…, value=<string>)` path unchanged.
- `padding`: when `box_family_for(block, 'gridItemPadding')` is non-None, EXPAND the shorthand into
  sides using `services/fold_helpers._expand_box_shorthand` (already imported/available), then emit
  per-side `Write(attr='gridItemPadding', value={side: value}, …)` for each side. The orchestrator
  (`orchestrator.py:80-96, 253-315`, generic on `box_family_for`) folds them into one object — NO
  orchestrator change.
- `border-radius`: NEW 4-corner splitter (the existing `_area_box_write` handles padding-sides ONLY).
  Parse the border-radius value (handle 1-4-value shorthand → TL TR BR BL per CSS rules; longhands
  `border-top-left-radius` etc. if present) and emit per-corner `Write(attr='gridItemBorderRadius',
  value={corner: value}, …)`. Gate on `box_family_for(block,'gridItemBorderRadius')`.
- Keep the gate `box_family_for` — NEVER a name regex (§3.A step-3b AST gate).

`services/arrangement.py::lift_uniform_grid_item_css` (105-150) — the SECOND emitter (council's
sharpest catch): its flat `ScalarLift` into `gridItemPadding`/`gridItemBorderRadius` will collide with
the object shape at the `extraction.py` merge. Fix: when the destination attr has a `box_family`
(`box_family_for` non-None), EITHER skip the uniform-fold for that attr (simplest, correct — the
per-declaration grid.py path already handles it) OR decompose its comparison per-side. Recommend SKIP
for box-family attrs; document why. Verify the `setdefault`/merge in `extraction.py` build path never
receives a scalar into a dict attr.

### WS5 — converter tests
- `tests/test_arrangement.py:206-233` (`test_uniform_grid_item_fold_does_not_overwrite_css_pass_value`)
  asserts the SCALAR shape (`'"gridItemPadding":"99px"'`). REDESIGN it for the new semantics: with
  box-family skip (WS4), the uniform-fold no longer writes gridItemPadding at all → assert the object
  path from grid.py wins, or split into a box-family case + a non-box-family case (use one of the
  still-scalar props like box-shadow for the setdefault-precedence assertion).
- `grep` `tests/test_converter_conformance.py` (Gate A golden fixtures) + all converter tests for
  `gridItemPadding`/`gridItemBorderRadius` literal-scalar assertions; update every one to the object shape.
- Run `pytest plugins/sgs-blocks/scripts/converter/tests/ -q` — must be GREEN.

### WS6 — DB seed (box_family) — leave to MAIN THREAD
- Do NOT run `/sgs-update` in the worktree (shared-DB Track-2 contamination risk, STOP-RESEED).
- BUT the converter tests need `box_family` in the DB to pass. So: in the worktree, run the box_family
  seed LOCALLY against the worktree's DB copy if `/sgs-update` uses a repo-local sgs-framework.db, OR
  report that tests need the seed and leave the seed to main thread + note which tests are seed-gated.
  State clearly in your report what you ran and what remains for main thread.
- After migration, the 8 `scripts/consistency/box-flat-baseline.json` entries (lines 5-13,25-26 for
  the gridItem keys) become stale — flag for removal (main thread will `--update-baseline` or edit).

## Policy gates (DO NOT violate)
- NO version bumps, NO deprecated.js (D270 — card-grid's own migration bumped nothing; confirmed).
- NO inline `style=""` output — the gridItem values render as the `--sgs-gi-*` custom-property cascade
  (already non-inline; keep it that way).
- box_family gate everywhere — never a name regex (§3.A step-3b, enforced by check-box-family-guard.py).

## Build/verify the agent DOES (in the isolated worktree)
1. All code changes WS1-WS5.
2. `cd plugins/sgs-blocks && npm run build` — GREEN (webpack copies render.php).
3. `pytest …/converter/tests/ -q` — GREEN (note any seed-gated tests per WS6).
4. Report: files changed (full paths), build result, test result, seed status, anything uncertain.

## The agent does NOT: deploy, commit, run /sgs-update against the shared DB, touch any Track-2 file
(`LEDGER.md`, `parking.md`, `decisions.md`, `STOP-CATALOGUE.md`, `next-session-prompt*.md`,
`src/blocks/site-*`, `mega-*`, `adaptive-nav`).

---

# A2 — product-card CTA border box-object (mirror sgs/button, ADDED 2026-07-26)

**Premise verified:** `sgs/button` is ALREADY fully box-object (`borderWidth` = 4-side object via
`ResponsiveBoxControl`, render `border-width:{top} {right} {bottom} {left}`; radius via native + tier
objects; correct TL TR BR BL order). So NOTHING changes on button — it is the proven in-family
TEMPLATE. A2 makes product-card's CTA mirror it. (Earlier "drop A2" call was based on a MISREAD of
button as native-scalar — corrected. Bean-directed: mirror button, level them up.)

**Not converter-routed** (grep: `ctaBorderWidth`/`ctaBorderRadius` absent from `scripts/converter/`) —
product-card CTA border is a LEAF. No cloning-pipeline work. Frontend emit is via the SHARED helper
`sgs_button_element_style_css($attributes,'cta',$selector)` (product-card/render.php:328,395).

### A2-WS1 — product-card/block.json
- `ctaBorderWidth`: `number` default `2` → `object` default `{"top":"2px","right":"2px","bottom":"2px","left":"2px"}`.
- `ctaBorderRadius`: `number` default `10` → `object` default `{"topLeft":"10px","topRight":"10px","bottomLeft":"10px","bottomRight":"10px"}`.
  **The non-empty uniform default MUST be preserved** (STOP-BOX-OBJECT-MIGRATION-COERCION): an unset
  CTA renders a 2px/10px border TODAY; the object default must reproduce that exactly. PROVE an unset
  CTA renders byte-identical (2px all sides, 10px all corners) after migration.
- Add `supports.sgs.boxFamilies`: `"ctaBorderWidth":["ctaBorderWidth"]`, `"ctaBorderRadius":["ctaBorderRadius"]`.

### A2-WS2 — product-card/edit.js
- CTA border control → mirror button/edit.js:596 (`ResponsiveBoxControl` values `{base: ctaBorderWidth}`
  + `BorderRadiusControl`), single-tier (button uses base-only for borderWidth). Match button exactly.
- Editor-preview inline style (edit.js ~789): serialise the object → shorthand (mirror button
  edit.js:223-227 `boxShorthand(...)` helper — reuse it).
- Preset-seed path (edit.js:1236-1237, 1360-1361): `preset.borderWidthTop`/`preset.borderRadiusTL` are
  per-side/corner scalars in `BUTTON_PRESETS`; seed the OBJECT now — `ctaBorderWidth: {top,right,bottom,left}`
  all = `preset.borderWidthTop` (uniform), `ctaBorderRadius: {topLeft,...}` all = `preset.borderRadiusTL`.
  (Presets are uniform, so uniform-object seed preserves current behaviour.)

### A2-WS3 — shared helper `includes/helpers-button-style.php:81-112`
- `$border_width_raw`/`$border_radius_raw` are now arrays. Widen BACKWARD-COMPATIBLY:
  `is_array($raw)` → serialise to shorthand (`border-width:{T} {R} {B} {L}`; `border-radius` order
  **TL TR BR BL**); ELSE keep the existing scalar `.'px'` path (other callers may still pass scalars).
- Empty object → emit nothing (match the current `if ($border_width_raw !== '' …)` guard semantics).
- REPORT every caller of `sgs_button_element_style_css` (grep) so main-thread live-verifies each.

### A2-WS4 — DB seed / baseline (MAIN THREAD)
- `product-card::ctaBorderWidth`/`ctaBorderRadius` are box-flat-baseline.json entries (lines 19-20) —
  remove after migration. box_family seed via the same controlled `/sgs-update` step as A1.

### A2 verify (MAIN THREAD): product-card CTA + every other `sgs_button_element_style_css` caller;
unset CTA renders 2px/10px identical; a per-side value renders per-side. Visual-diff report
`reports/visual-diff/product-card-2026-07-26.md`.

---

## MAIN-THREAD close-out (NOT the agent)
- Live-content coercion pre-check (any published non-empty gridItem value) — done in parallel.
- Deploy from isolated worktree: `build-deploy.py --target sandybrown --blocks-only --skip-build --allow-dirty`.
- md5 local↔server on the 4 changed render/PHP files BEFORE measuring.
- Live-verify ALL 4 blocks in editor + frontend (STOP-LIVE-VERIFY-SHARED-COMPONENTS): object controls
  work, empty `{}` neutral, a set per-side padding renders per-side via `--sgs-gi-padding`.
- 4 visual-diff reports at repo-root `reports/visual-diff/<block>-2026-07-26.md` (template =
  card-grid-2026-07-25.md), verdict:PASS + first_paint_capture_passed:true.
- `/qc-inline` or `/qc-council` the diff before commit.
- Controlled `/sgs-update` box_family seed + baseline cleanup (Track-2-committed check first).
- Commit path-scoped (never `git add -A`); verify landed via `git log -1 origin/main`; rebase-on-reject.
