# i17: why no checker catches hand-built panel copies, and a detector for controls with nothing to affect

Read-only: nothing in the repo, the DB or a site changed. Prototypes, fixtures, hit lists and logs are in `E:\sgs-tmp\general-cloning\investigate\i17-detectors\`. `@babel/parser` was borrowed read-only from `C:\Users\Bean\Projects\booking-system\node_modules` through `NODE_PATH` (the checkout's `node_modules` is still empty). Both prototypes pass a self-test (a must-flag and a must-stay-silent fixture: `selftest-d1.sh`, `selftest-d2.sh`, both print `SELFTEST PASS`). No hit has been checked by a human, so precision is stated per class.

## Short answers

1. No checker catches it because every lookalike rule is keyed on one narrow control shape, and Spec 35 never asked for a panel-level rule. The `sgs/media` copy sits in shared source no per-block rule reads, built from a component no rule names. PROVEN.
2. The Detector 1 prototype finds the `sgs/media` copy, 40 hand-assembled spacing panels in 39 blocks, and about 20 hand-built layout, border, colour and width panels. Shadow is otherwise clean. PROVEN by the run; precision UNPROVEN beyond the false positives listed.
3. Detector 2 runs on all 104 blocks in 6.5 seconds, but maps only 15% of the settings the record places, so it is a floor. It cannot see colour rows or composite controls (two of Bean's four examples). PROVEN.
4. The record does not store "this setting needs that partner". The check computes it every run (`instances.py::preconditions`) and discards it. Storing it is what makes a library-wide "show when" possible. PROVEN.

## Detector 1: hand-built copies of shared panels

### Why existing enforcement misses it (PROVEN)

I ran `node scripts/inspector-scan/run.js --json` with the borrowed Babel: 0 parse errors; rules 07, 24 and 30 are gate-mode and at 0 findings while `sgs/media` still carries its hand-built shadow row. The scanner runs and passes; it is blind to this class.

- **Rule 07 (`07-preset-only-shadow`) is the closest by intent.** It flags a `SelectControl` whose label mentions "shadow" and reads only `src/blocks/<block>/edit.js`. The `sgs/media` shadow row is `ShadowField` in `src/components/media/panels/adopted-fields.js`, shared source no per-block rule opens, built from the `Chips` component with a label from a row object. Rule 07's header says its label heuristic stands "until a real ShadowControl-resolution detector replaces" it. That detector was never written.
- **Spec 35 section 11 asks for five buckets; two were built.** Field 7 classifies each shadow control as compliant, preset-select, raw-text, duplicate-builder or no-control. Rule 07 covers preset-select, rule 21 (advisory) covers no-control. Duplicate-builder, which is exactly `ShadowField`, has no rule.
- **Rule 24 is the closest by mechanism.** It is the only global rule (every file under `src/`, by import, so an alias cannot hide it) but bans only core colour and link components. Rule 30 does the same for core `BoxControl`, per block only. Nobody extended the import-based approach to the other shared panels.
- **No rule works at panel level, and the spec sanctions building panels from shared controls.** Spec 35's spacing entry says `SgsBoxControl` goes inside `ResponsiveOverride` "as `ResponsiveBoxControls` and every header, footer, container and card band do". `ResponsiveBoxControls` is mounted by one block (`gallery`). `check-shared-panel-schema.js` checks the opposite direction (blocks that do mount a container panel must declare the right attributes).

### What the prototype does

`d1-shared-panel-copies.js` with the signature table `shared-panels.json` (11 families). It finds each `PanelBody` and `ToolsPanel` in every block folder and `src/components`, follows helper components up to three hops (re-exports included), and records the title, shared components mounted and which attributes are written through which control. A write through a shared control (`SgsBoxControl`, `ShadowControl`) is the shared panel working and is not counted; a write through a core primitive, or through `ResponsiveOverride` wrapping a core control, is hand-built.

Signal (a) is the title match. Signal (b) is any of: a hand-built write of an attribute the shared panel owns; a core primitive the shared panel wraps plus an owned attribute; a preset-chooser control labelled with the family word; or, at file level, an SGS-internal primitive (`useShadowPresets`) imported outside the family's own files. PANEL-REASSEMBLED fires when a panel writes every attribute the shared panel owns (spacing: padding and margin) without mounting that panel. A name that matches the container's attribute but has a different stored shape is marked a likely false positive.

### Results (`d1-hit-list.md`, `d1-hits.json`)

| Class | Count | Reading |
|---|---|---|
| COPY (title and hand-built) | 9 | 8 plausible, 1 name collision |
| COPY-BY-CONTENT (other title) | 13 | about 5 plausible, rest false positives |
| PANEL-REASSEMBLED | 40 panels, 39 blocks, all Spacing | real |
| MOUNTS+PARALLEL | 8 | mixed |
| TITLE-ONLY | 51 | weak, not counted |
| File-level primitive import | 2 | 1 real (`sgs/media`), 1 false positive |

**`sgs/media` shadow.** The hit is `adopted-fields.js::ShadowField`: it imports `useShadowPresets` (the preset source `ShadowControl` already wraps), builds its own None / presets / Custom chip row, then mounts `ShadowControl` only for Custom. `ShadowControl` already has "Theme styles" cards in its Simple tab (`shadow-control/SimpleTab.js`), so the two overlap. The "Shadow" title comes from the generated panel model (`panel-model.js`, `emit/adopted-settings.js`), so no JSX `PanelBody` carries it. I found no second shadow copy.

**Spacing.** 40 panels write `padding` and `margin` through `SgsBoxControl` in `ResponsiveOverride` under titles such as "Spacing", "Padding & margin", "Wrapper", "Layout" (accordion, audio, button, form, heading, hero, icon, quote and others). Their attribute shapes match the container's. They copy `ResponsiveBoxControls`. `container/edit.js` is the origin of the pattern. `ResponsiveBoxControls` also owns `maxWidth` and `contentWidth`, so the fix may be a smaller shared spacing panel.

**Hand-built controls.** Plausible: `site-header-row` and `site-footer-row` (own flex direction, grid templates, content width; the `ResponsiveBoxControls` docblock admits "local copies"), `hero` (repeats the container's flex wrap and grid templates), a columns `RangeControl` beside the container's tier-object `columns` in `gallery`, `post-grid`, `feature-grid`, `trustpilot-reviews`, `google-reviews`, `trust-bar`; `brand-strip` (`tileBorderWidth` outside `SgsBorderControl`); `card-grid` (`overlayOpacity`); `button` (`fontWeightHover` beside `TypographyControls`). MOUNTS+PARALLEL: `button` Typography, `container` `GridItemDefaultsPanel` (`gridItemBorder` select), `site-header-row` x3, `site-footer-row`, `multi-button`, `wishlist-panel`.

### False positives I can see

- `colourMode`, `colourPreset`, `textBadgeSeparator`: a mode select and a text field matching a family by name (`icon`, `social-icons`, `option-picker`, `trust-bar`). I tightened `separator` to `separators`, which removed four delimiter-character hits.
- Name collisions on `layout`, `columns`, `maxWidth` where a block's own enum reuses the container's name (`choice-flow-question`, `wishlist-panel`, `modal`).
- `SgsLengthControl.js` importing `FontSizePicker` from `./primitives`: a shared component using its own primitive.
- TITLE-ONLY is mostly generic "Layout" panels with block-specific content.

Blind spots (UNPROVEN until checked by hand): a copy behind a render function that is neither a JSX component nor an imported helper; a panel with a variable title (judged by content only); generated media panels (seen only through the file-level import); Colour and Effects families, whose shared controls run from data tables.

### Making it a gate

Add `rules/47-shared-panel-copy.js` beside rule 24, registered in `rules.json` with a `selfTest` using the two fixtures in `fixture/`. Start `advisory` with a measured baseline, then promote per family: Shadow first (one real hit), then Spacing, then Layout. The signature table must stop being hand-written: each shared component should declare what it owns (attributes and wrapped primitives) in a registry the scanner reads, as `golden-controls.json` does for colour (FP-1). The rule: a panel that writes every attribute a shared panel owns must mount it.

## Detector 2: controls with nothing to affect

### How it works

**Record side** (`d2-record-facts.py` writes `d2-facts/<block>.json`): imports the record's planner `instances.plan(short)` read-only and takes, per setting, the partner attributes the check sets before the setting can paint (`instances.py::preconditions`: fixtures plus derived rules: opacity needs its colour, border colour needs a style and width, shadow colour needs the shadow, a variant slot needs its variant). It also reads `setting_placements` (proved or not, and the cause), `tested_no_paint` and the fixture's variants.

**Editor side** (`d2-controls.js`): walks each block's inspector (everything under `InspectorControls`, following mounted components through re-exports and the `ContainerWrapperControls` kind registry) and records every control that binds an attribute, with its chain of conditions (`a && <Control/>`, ternaries, `hidden=`, conditions inherited from a parent). A tri-state evaluator runs each condition against defaults plus the fixture, and against the partner, mode and variant states the record used.

Four findings: SHOWN-NOTHING-TO-AFFECT (partner not set); SHOWN-NOTHING-TO-AFFECT (wrong layout mode: a grid-only or flex-only property shown in the other mode, for blocks whose `layout` enum holds both); HIDDEN-ALTHOUGH-RECORD-PROVES-IT-PAINTS; SHOWN-AT-DEFAULT-BUT-RECORD-SAYS-ITS-PART-IS-ABSENT (partner unknown).

### The four named blocks

| Block | Controls mapped | With a condition | Settings | With a partner | Hits |
|---|---|---|---|---|---|
| `sgs/container` | 60 | 39 | 175 | 18 | 3 |
| `sgs/trust-bar` | 55 | 42 | 182 | 36 | 2 |
| `sgs/product-card` | 84 | 57 | 490 | 28 | 3 |
| `sgs/nav-drawer-menu` | 77 | 31 | 237 | 19 | 7 |

`container` gates its layout controls correctly: `gridTemplateColumns`, `gridTemplateRows` and `columns` only in grid, `flexDirection` and `flexWrap` only in flex, scroll arrows, dots and drag only when sideways scrolling is on. Bean's "grid control in flex mode" and "scroll arrows when sideways is off" are handled correctly here and the detector is silent on them. Its hits (also in `trust-bar`): `shapeDividerTop` and `shapeDividerBottom` (record cause `part-not-rendered`) and `gridItemBorder`. `product-card`: `brandPadding` (no condition, brand overlay absent at default), `savingBadgePadding` and `savingBadgeBorderRadius`. `nav-drawer-menu`: `megaBodyPadding`, `featuredRadiusHover`, `featuredFontWeight`, `featuredFontWeightHover`, `submenuCaretGap` (part absent, no condition) and `itemOpacity`, `submenuOpacity` (partner not set; false positive, below).

Shadow colour hits (`iconCircleShadowColour` and others) are composite sub-rows: `ShadowControl` binds base and colour in one mount and hides the colour row inside, so 37 such hits across the library are counted as coverage, not hits.

### Whole library (`d2-hit-list.md`, `d2-all.json`)

78 hits: 47 part-absent, 20 partner-not-set, 6 wrong-mode, 5 hidden-although-proven. By class:

- **Partner not set (20).** Real by reading: `form` (`actionsStickyPadding`, `actionsStickyBleed` shown with `actionsSticky` off), `social-icons` (`childIconLabelPosition` with `childIconShowLabel` off), `choice-flow` (`stageNoteIconCircleSize` with no icon), `nav-bar-menu` (`scrimFadeDuration`, `scrimFadeEasing` with no scrim), `nav-drawer` (scrim blur, strength and fade with no background source). Confirmed false positive: `itemOpacity`/`submenuOpacity`; the "partner" comes from a harness test aid (`instances.py` adds `itemColour` for any name ending `Opacity`), but `itemOpacity` is plain element opacity per its `block.json` description. The partner list mixes needed partners with test aids. The rest are UNPROVEN until read.
- **Wrong mode (6).** `multi-button` `flexDirection` and `flexWrap` have no condition and show in grid; `form` `fieldColumnsFrom` (grid-only) shows in flex and stack, `nextButtonFill` and `actionsFlexWrap` (flex-only) show in grid; `feature-grid` `columns` has a second unconditioned control. The mode need comes from a small CSS table in the prototype (`grid-*` needs grid), since the record does not store which mode painted.
- **Hidden although proven (5)** (`cart`, `form` x2, `hero` `gridTemplateColumns` behind `isSplit`, `timeline` `milestoneMinHeight`): all look like correct gating where the record does not keep the attributes of the render that proved the setting. Record gaps, not editor faults.
- **Part absent at default (47).** Weakest class: `part-not-rendered` is often a fixture artefact (a product with no sale price). Needs a human look; do not act on it unattended.

### Coverage

- Planned settings across the library: 11,351; placed in the DB: 6,969. Recorded partner preconditions: 1,064 settings (9% of planned); 987 of the placed settings carry one, of which 86 have a control the scan mapped.
- `fixtures.json` holds explicit preconditions for only 71 settings in 12 blocks (plus family preconditions in five). The rest come from the planner's built-in rules.
- Controls mapped to an attribute: 2,625; 1,243 (47%) sit behind a condition. Conditions evaluated at default: 1,565 true, 606 false, 454 unknown (17%: a parent prop, a helper call, a postType test).
- **Placed settings with a mapped control: 1,073 of 6,969 (15%).** The unmapped 5,896 are mostly data-table settings: typography 2,158, colour 1,443, gradient 563 (rows rendered from config objects such as `fillRow({...})`), then layout 576, visual 500, boolean-visibility 325.
- **Cannot see:** colour and typography rows; composite sub-rows (`ShadowControl`, `SgsBorderControl`, `SgsSeparatorControl`); `ToolsPanelItem` default-hidden state; which mode or state actually painted. So two of Bean's four examples (a colour row whose part is not drawn; a separator colour when separators are hidden) are out of reach today.

### Library-wide fix (design, UNPROVEN until built)

Per-block conditions (1,243 hand-written across 2,625 controls) are what produced the drift: each block restates the rule, the cloning route never sees it, and the editor and the record disagree silently. The alternative is one declaration the shared panels read:

1. **Store the record's preconditions.** Add `setting_preconditions(block_slug, setting, partner_attr, partner_value, kind, source)`, written by `sgs-update`, with `kind` set to `needed` or `test-aid`. Add `proof_attrs` and `mode` columns to `setting_placements` so the state that proved a placement is data. This also settles the 5 hidden-although-proven candidates.
2. **Generate `generated-show-when.json`** (keyed `block/setting`), as `generated-fx-effect-meta.json` already works, and read it through one hook, `useShowWhen(blockName, attr)`, in the shared wrappers: `ToolsPanelItem`'s wrapper, `ResponsiveOverride`, the `fillRow`/`textRow` rows in `SgsColourPanel`, the sub-rows inside `ShadowControl`, `SgsBorderControl` and `SgsSeparatorControl`, and the `ContainerWrapperControls` panels. A block's `edit.js` then carries no condition for a standard partner.
3. **Keep per-block conditions only for what the record cannot express** (content gates such as `FORM_CPT === postType`), tagged so the detector knows they are intentional.

Trade-off: one place, and the editor and cloning route share one truth, at the cost of curating `test-aid` rows and migrating up to 1,243 conditions. Per-block conditions need no migration but cannot fix colour rows or composite controls, about 70% of what the record places.

### Making it a gate

1. Rule 48 in inspector-scan (`control-visibility-vs-record`), reading the new tables, not Python's `plan()` (about 10 seconds a block, too slow for a hook). The evaluator in `d2-controls.js` ports unchanged.
2. Self-test: `fixture2/` holds four cases (ungated control with an unmet partner, a gated one, a control hidden by an attribute the record does not need, a grid-only property shown in flex). It must flag the first, third and fourth and stay silent on the second.
3. Advisory first, baselined at today's 78. Promote only partner-not-set (once `test-aid` rows are filtered) and wrong-mode (once `mode` is stored). Never promote part-absent.
4. A control the scan maps to a setting with no stored precondition reports as "unknown", never clean, so blind spots show on every run.

## Calls I made

- Treated `ResponsiveOverride` wrapping a core control as hand-built and wrapping a shared control as shared. Rule 30 sanctions the core pairing for object attributes; I flagged it because the question was panels copying shared panels.
- Excluded `ToggleControl` from "control labelled with the family word" and `composeShadow` from the Shadow primitives (preview use, not panels); each removed false hits and no real copy.
- Counted shadow-colour sub-rows as coverage, not hits.
- Applied the layout-mode check only when the block's `layout` enum holds both `flex` and `grid`.
- Used a small property-to-mode table, because the record does not store the mode.
- Wrote `shared-panels.json` by hand for the prototype; a gate must read a registry (FP-1).
- Kept every hit a candidate; none is checked in a live editor.

## Open for Bean

1. Spacing: one shared spacing panel (padding and margin, perhaps smaller than `ResponsiveBoxControls`) mounted by the 39 blocks? Recommended, since the controls already match, but it changes 39 inspectors.
2. `sgs/media` shadow: drop the hand-built preset chips and let `ShadowControl`'s "Theme styles" cards carry the presets? Recommended; check that its Simple tab suits the media panels.
3. Store the record's preconditions in the DB? Recommended before any "show when" library, since the editor cannot match a record that discards its own partners.

## Files

- `E:\sgs-tmp\general-cloning\investigate\i17-detectors.out` (this report)
- `E:\sgs-tmp\general-cloning\investigate\i17-detectors\`: `d1-hit-list.md`, `d1-hits.json`, `d1-shared-panel-copies.js`, `shared-panels.json`, `lib.js`, `selftest-d1.sh`, `fixture\`; `d2-hit-list.md`, `d2-all.json`, `d2-controls.js`, `d2-record-facts.py`, `d2-facts\` (104 blocks), `selftest-d2.sh`, `fixture2\`; `inspector-scan-run.json` (the existing scanner's output).
