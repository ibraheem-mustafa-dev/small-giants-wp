---
doc_type: reference
title: Spec 35 Phase 2 — optimal-control registry DESIGN SPINE (schema + governing dimensions)
status: DRAFT — the contract the per-category drafters fill against; Bean reviews the finished registry
created: 2026-07-19
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Parts B / H / I = the optimal-control authority)
plan: .claude/plans/2026-07-18-spec-35-block-inspector-ux-strategic-plan.md (UNIT A+ — Phase 2)
produces: plugins/sgs-blocks/scripts/consistency/setting-registry.json (the golden master)
---

# Spec 35 setting-registry — design spine

## What this is (plain English)

We reduced 944 block-attribute names to **~82 genuine settings** (60 CSS-property + 11 input-types +
11 behaviour-families). This doc is the shared contract that says, for EVERY setting, **the single
best editor control a non-coder client should get** — the "font-size box + preset dropdown" vision,
applied to all 82. The filled result (`setting-registry.json`) is the golden master the Phase-3 lint
diffs every block against forever. It is authored against Spec 35 Parts B (control-completeness table),
H (component-per-job), and I (SGS component status) — the research is already banked there.

## The 7 governing dimensions (apply to EVERY row)

These are Bean's stated dimensions + Spec 35, made into rules the drafters apply uniformly. A row's
`optimal_control` is only complete when it has answered all 7 (or marked one `n/a` with a reason).

1. **CUSTOM-BOX-PLUS-PRESET** (Bean's core vision). Presets SEED a real, editable control — they never
   replace it. font-size = `UnitControl` box + `FontSizePicker` presets on top; shadow = X/Y/blur/
   spread/colour+alpha builder + presets; gradient = builder + preset stops; spacing = `UnitControl`/
   `SpacingSizesControl` + token presets. FAIL smell = a `SelectControl` of None/Small/Medium with no
   custom path (Spec 35 Part B "Shadow", Part F "incomplete option sets").
2. **UNITS** (Bean). Every CSS-length control is a `UnitControl` (or `RangeControl` **with** an input
   field + unit) whose `units` cover every meaningful unit for THAT property (length → px/em/rem/%/…;
   line-height → unitless + px/em; angle → deg). `isResetValueOnUnitChange`. Unit companion attr
   pattern `{prop}Unit` (+ `Tablet`/`Mobile`). Never px-only.
3. **DEVICE-TIER RESPONSIVE TOGGLE** (Bean). Layout / spacing / typography / sizing settings expose the
   locked **768 / 1024** device switcher via `ResponsiveControl` (never a bespoke third breakpoint —
   Spec 35 D2). Identity / content / behaviour settings do NOT get it. The switcher must drive WP's
   native `core/editor` deviceType so the canvas + all controls move in lockstep (memory
   `responsive-switcher-sync-wp-native-devicetype`).
4. **MULTI-VALUE** (Bean). 4-side prop → `BoxControl` (link/unlink, `splitOnAxis`) via `box_family`;
   4-corner radius → `__experimentalBorderRadiusControl`; repeated media → array attr + `gallery` /
   `multiple="add"` (`MediaGalleryPicker`); multi-value tags → `FormTokenField`. Never a scalar attr
   added one-at-a-time (Spec 35 Part B "Media/gallery", checklist item 10).
5. **DROPDOWN COMPLETENESS** (Bean). enum → `ToggleGroupControl` (2–5 short options) or
   `ComboboxControl` (>~10, searchable); EVERY valid option present + a `Custom` path where the CSS
   property is open-ended; never a truncated set (Spec 35 Part B "Selection", Part F).
6. **ALPHA + CLEARABLE** (Spec 35 B/I). Every colour/gradient control has `enableAlpha` + `clearable`
   (alpha-0 ≠ unset); component pickers only (native `supports.color` alpha is a theme.json concern).
   Emit hex8 so WP `safecss` doesn't strip functional rgba (D302).
7. **RESET + DISCLOSURE** (Spec 35 A5/B). Every control has a reset path; panels with ~6+ controls use
   `ToolsPanel`/`ToolsPanelItem` (`resetAll`, 1–3 `isShownByDefault`); ranges use `allowReset` +
   `resetFallbackValue`.

## Output-routing rule (Spec 32 — added post-council 2026-07-19)

The 7 dimensions govern control **shape**; this rule governs control **output**. Any WP-native
`supports.*` flag adopted per this registry (e.g. `supports.dimensions.aspectRatio`,
`supports.position.sticky`, `supports.typography.fontFamily`) MUST pair with
`__experimentalSkipSerialization` + `wp_style_engine_get_styles()` scoped-`<style>` emission (the
D292 pattern already shipped on button/container/heading/text/quote/media/hero) — **never a bare
`supports` declaration**, which auto-inlines via `get_block_wrapper_attributes()` and violates the
no-inline-styling contract (Spec 32). Colour values additionally normalise to hex8 (D302) before any
inline path.

## Blessed shared components (Part I — use these, don't hand-roll)

| Job | Component | Status |
|---|---|---|
| Colour token + alpha | `DesignTokenPicker` (enableAlpha+clearable) | built this phase |
| Per-element typography | `TypographyControls` (R-22-13) | exists |
| Link / CTA | `SgsLinkControl` (LinkControl wrapper) | built this phase |
| Shadow builder | `ShadowControl` | built this phase |
| Bulk media | `MediaGalleryPicker` | Wave-2 build |
| Responsive tiers | `ResponsiveControl` / `ResponsiveBoxControl` | exists |
| Normal/Hover state | `StateToggleControl` | exists |
| 4-side box | `BoxControl` via `box_family` | native |

## Registry row schema (each of the ~82 settings is one object)

```json
{
  "setting_key": "css:font-size" | "input:media-source" | "behaviour:slider-carousel",
  "category": "css-property" | "input-type" | "behaviour-family",
  "label": "Human-readable name a client would recognise (e.g. 'Font size')",
  "optimal_control": {
    "component": "the canonical WP/SGS component (Part H/I) — e.g. 'UnitControl inside ResponsiveControl'",
    "props": { "units": ["px","em","rem","%"], "withInputField": true, "allowReset": true },
    "preset_layer": "how presets seed it (custom+preset), or null if n/a — dimension 1",
    "units": "the unit set + unitless rule, or 'n/a' — dimension 2",
    "responsive_device_tier": true,          // dimension 3 (768/1024 switcher?)
    "multi_value": "box|corner|gallery|tokens|none",   // dimension 4
    "dropdown_completeness": "ToggleGroup|Combobox|n/a + 'Custom path present'",  // dimension 5
    "alpha_clearable": true,                 // dimension 6 (colour only, else n/a)
    "reset_disclosure": "allowReset + ToolsPanel where dense"   // dimension 7
  },
  "shared_component": "DesignTokenPicker | TypographyControls | ShadowControl | ... | null",
  "spec_ref": "Spec 35 Part B row / Part H entry / Part I row",
  "current_state": "what blocks do TODAY — from observed_control_types / observed_roles / conformance",
  "divergence": "the gap between current and optimal, in one line (or 'none — already optimal')",
  "divergence_severity": "high|medium|low|none",
  "notes": "edge cases, converter caveats, a11y, per-element vs wrapper, etc."
}
```

## Per-category source of the CURRENT state (to compute `divergence`)

- **CSS-property (60):** each setting in `setting-types.json` carries `observed_control_types`,
  `observed_roles`, `observed_box_families`, `observed_emit_shapes`, `conformance`,
  `distinct_attr_names`, `blocks`. That IS the current side — compare it to the optimal.
- **Input-types (11) + behaviour-families (11):** `setting-reclassification.json` — `input_type_groups`
  / `behaviour_families` give member attrs + blocks; `full_classification[attr]` gives per-attr
  `control` / `role`. `system-internal` (1 attr, `className`) is NOT a client setting → EXCLUDE it
  from the registry (note it as excluded, don't draft a control).

## Two worked example rows (the template the drafters copy)

```json
{
  "setting_key": "css:font-size", "category": "css-property", "label": "Font size",
  "optimal_control": {
    "component": "UnitControl inside ResponsiveControl (via TypographyControls)",
    "props": {"units": ["px","em","rem","%"], "isResetValueOnUnitChange": true, "withInputField": true},
    "preset_layer": "FontSizePicker presets seed the box (custom value always editable)",
    "units": "px/em/rem/%; not unitless", "responsive_device_tier": true,
    "multi_value": "none", "dropdown_completeness": "n/a", "alpha_clearable": "n/a",
    "reset_disclosure": "allowReset; lives in the Typography ToolsPanel"
  },
  "shared_component": "TypographyControls",
  "spec_ref": "Part B Typography + Part H (font size → FontSizePicker/UnitControl)",
  "current_state": "observed_control_types mix RangeControl + UnitControl across blocks; some px-only",
  "divergence": "blocks on a bare RangeControl or px-only lack the unit set + preset seeding",
  "divergence_severity": "medium",
  "notes": "per-element (title/label/price), not wrapper — TypographyControls owns the shape"
},
{
  "setting_key": "input:url-link", "category": "input-type", "label": "Link / URL",
  "optimal_control": {
    "component": "SgsLinkControl (LinkControl wrapper)",
    "props": {"settings": ["opensInNewTab","rel"], "showInitialSuggestions": true},
    "preset_layer": null, "units": "n/a", "responsive_device_tier": false,
    "multi_value": "none", "dropdown_completeness": "n/a", "alpha_clearable": "n/a",
    "reset_disclosure": "clears cleanly to no href"
  },
  "shared_component": "SgsLinkControl",
  "spec_ref": "Part B Link/CTA + Part C Links + Part H (link → LinkControl)",
  "current_state": "15 attrs across 12 blocks; many raw URL TextControl (full_classification control)",
  "divergence": "raw URL fields lack internal search + new-tab + rel; flat url string not {url,opensInNewTab,rel}",
  "divergence_severity": "high",
  "notes": "attr shape must become object {url,opensInNewTab,rel}; converter-population note if cloned"
}
```

## Deliverable

Three disjoint files (one per category, no write-collision), then merged by the parent into
`setting-registry.json`:
- `setting-registry-css.json` — 60 CSS-property rows
- `setting-registry-inputs.json` — 11 input-type rows (system-internal excluded, noted)
- `setting-registry-behaviours.json` — 11 behaviour-family rows (these define a canonical control SET
  + which shared component owns the recurring behaviour, not always a single control)


## Bean review rulings (2026-07-19)

Bean reviewed the drafted catalog (82 rows) via the artifact + opened the live blocks. Rulings on the 6 flagged judgement-call rows:

1. **`css:stroke`** — RESOLVED (reclassify). Verified on sgs/counter: `accentStroke` is a decoration ToggleControl ("Accent underline stroke — adds a short coloured line beneath the number"), not a stroke-paint colour. Move to behaviour/decoration; the underline colour is a separate colour setting.
2. **`css:background-image`** — RESOLVED. It is `overlayGradient` (a background OVERLAY, role colour-gradient) → GradientPicker + solid colour + alpha; relabelled "Background overlay". The real background image is a separate per-device Image/Video/Animation picker (media-source).
3. **`css:background-position`** — RESOLVED as missing/verify. Not exposed on container or hero today (no control). ACTION: verify `backgroundPosition` is consumed in render.php (dead-control check); if yes → FocalPointPicker, if no → delete. Do with the overlay work.
4. **`css:font-family`** — RULED: expose a curated searchable font picker (theme.json families + Font Library) on **display blocks only** (heading/quote/button), OFF body/structural — protects the design system. Stays out of the per-element TypographyControls.
5. **`input:json-config` (repeaters)** — RULED (Bean-directed research done). TWO patterns by one test — *does the item need rich content or its own toolbar?* Rich → InnerBlocks + `templateLock="insert"` (what Kadence/GenerateBlocks/Stackable/GreenShift all use); scalar → BUILD one shared `RepeaterControl` (array attr, collapsible per-item panel, "+ Add", remove + up/down reorder w/ roving tabindex + aria, empty state). NOT DataViews/DataForm (admin-only). Bean saw the gap live on pricing-table (on-canvas add, no inspector item settings).
6. **`behaviour:sticky-header-nav-behaviour`** — NOT separately ruled; keeps the recommended split (native `position.sticky` StickyToggle + a NavCollapseTier device-tier control) pending Bean's confirmation.

## Archetype deck v2 folded into the registry (2026-07-19)

The three-agent-gap-reviewed, Bean-redlined archetype deck v2 (artifact `a35048a9-…`, catalog
`f9646fa6-…`) was folded into `setting-registry.json` (18 rows + 6 new `_meta` sections). The registry
is now ahead of this spine on control detail; the deltas:

- **Colour split** — text/border (`css:color`, `css:border-color`, `input:colour-value`) are **solid
  only** (new `optimal_control.colour_channel`); **background** (`css:background-color`) is the one
  control that does both, via **WP `ColorGradientControl`** (Solid | Gradient), replacing the plain
  solid picker. Gradient overlay (`css:background-image`) gains per-stop colour + alpha, an
  **`AnglePickerControl`**, and a Linear/Radial switch.
- **Compound Border builder** — `css:border-{width,style,colour,radius}` flagged
  `optimal_control.border_builder_member: true` and recorded as `_meta.compound_sets.border_builder`
  (native `BorderBoxControl`, width+style+colour+radius in one panel, All-sides/Per-side; border-style
  **moved out** of the padding/margin 4-side box). This is the seed for the Task-2 per-category sets.
- **Shadow** (`css:box-shadow`) — 6 named presets (None/Subtle/Soft/Lifted/Top-left/Hard) + Normal/Hover
  via `StateToggleControl` + Inset toggle.
- **Media** (`input:media-source`) — bulk `MediaGalleryPicker` + Alt-text + Decorative toggle per slot.
- **Date** (`input:date`) — min/max as one connected range. **Multi-tag** (`input:enum-select`) — a
  noted `FormTokenField` multi-value path (no new row — 82-row count is Bean-locked).
- **Focus = Hover** (`behaviour:hover-effect`) — keyboard focus mirrors the Hover style; no Focus tab.
- **New `_meta` sections:** `universal_control_behaviours` (the 10 behaviours every control carries),
  `structural_patterns` (6 inspector-level layers: on-canvas Block Toolbar, Settings/Styles/Advanced
  tabs, progressive disclosure, conditional show-when, Normal/Hover, control-states),
  `composite_panels` (8 families — the 8th = per-field conditional — with the carousel/scroll-reveal
  frontend-engine caveat), `compound_sets`, `deferred` (5 items), and `v2_folded` provenance.
- **Row-schema growth:** `optimal_control` now carries optional keys `colour_channel`,
  `border_builder_member`, `a11y`, `presets`, `states`, `builder_fields`, `angle`, `gradient_type`,
  `range`, `alt_text`, `bulk`, `focus_state`, `multi_value_path` where a row needs them.
