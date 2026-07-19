---
doc_type: design
title: Spec 35 Task 2 — element-first inspector organisation (the control-clusters within each element)
status: HARDENED 2026-07-19 — all design-level grading gaps closed (element manifest defined, behaviour/Content-tab scoped, Layout state-scope + tab + link + preset wording fixed). Remaining items are named rollout BUILDS (manifest impl, brand-strip control upgrade, per-device border/shadow), not doc gaps. Direction LOCKED. See Grading result + Rollout steps.
created: 2026-07-19
supersedes: the v1 draft that grouped by CSS-property category (the "librarian" mistake — Bean rejected 2026-07-19)
spec: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md (Part A organisation)
exemplar: .claude/plans/spec-35-brand-strip-exemplar-note.md (the ONLY block already rebuilt to this model — the proven bar)
inputs: setting-registry.json (golden master, v2-folded) + the brand-strip live inspector
---

# Element-first inspector organisation

## What this is (plain English)

A client editing a block thinks in **elements** — "the tile", "the caption", "the button" — not in
CSS categories. So the inspector's top level is the block's **customisable elements**, one panel each.
*Inside* an element, the controls that belong together sit together in a natural, compact flow, so the
client never hunts around. This is the model brand-strip already ships (Tile / Logo image / Caption /
Spacing) and Bean's stated vision; this doc formalises it as the universal standard and defines the
within-element clusters every block reuses.

> **The v1 mistake, recorded so it doesn't recur:** the first draft grouped controls by CSS-property
> genre (a "Typography set", a "Border set", an "Effects set") at the TOP level. That is
> property-type-first — the exact thing the brand-strip note warns against. This v2 makes **element**
> the primary axis; the clusters below are the *within-element* building blocks, never top-level panels.

## Evidence base (researched 2026-07-19 before locking)

Three parallel researchers (WP + design tools; WP builder competitors; NN/g UX) converged:
- **Group by the user's task, not the data type** (NN/g) — the client's task is "make *the button* look
  right", so element-grouping is correct. **Stackable** is the one competitor that ships per-element
  sections; the rest scope by selection. Sources: NN/g *Group Form Elements* / *Common Region* /
  *Progressive Disclosure*; Webflow Style panel; Figma variants.
- **Two tabs, WP-native** (Content/Settings · Style/Appearance); Advanced (CSS class/anchor) is native +
  free via `supports.anchor` but renders as a PANEL inside Settings, not a third tab. Element sections
  live *inside* the Style tab.
- **Normal/Hover = one state toggle re-scoping the same controls** — unanimous (Webflow/Figma/WP/every
  competitor). Never a duplicate "Hover" panel.
- **One fixed control order on every element, every block** — the highest-leverage rule for "QC-only,
  less intervention over time": the client learns the inspector once (NN/g consistency).
- **Progressive disclosure, exactly ONE level** — default-show frequent controls, hide the rest behind
  one expander; strongest evidence for non-coders (NN/g: "helps novice users avoid mistakes").
- **Preset-first entry** — reviewers single this out as why non-coders succeed with Kadence and fail
  with "property-soup" builders (GenerateBlocks). Lead each block with visual presets; the clusters are
  optional fine-tuning.

## Grading result (2026-07-19 — inline gap-analysis + independent adversarial reviewer)

**Verdict: GO-WITH-FIXES. Grade B- (~3.3/5).** The element-first DIRECTION is sound, WP-buildable, and
matches the exemplar's panel arrangement — but it is NOT yet lockable as an enforced lint standard.
Fix these before enforcing the lint; none block Task 3 (the hover/StateToggleControl decision is
unaffected). Ground-truth-verified findings:

- **[BLOCKER] The CLUSTER-COHERENCE rule is not computable (F3/F4).** The registry is keyed by
  property/input/behaviour — there is NO element axis, and block attributes are flat (`tileBg`,
  `captionFontSize`) with no declared element grouping. A linter cannot derive a block's "elements" or
  which cluster an attr belongs to. PREREQUISITE: define a per-block element manifest (e.g.
  `supports.sgs.elements` in block.json, or an attr→element naming convention) and make "applicable" a
  capability FLAG, not prose "semantics". Verified: grep for an element axis in the registry = 0 hits.
- **[HIGH] The exemplar is over-claimed (F2).** `ShadowControl` / `SgsLinkControl` / `DesignTokenPicker`
  enableAlpha now EXIST, but brand-strip still uses `tileShadow` as a None/Small/Medium SELECT
  (edit.js:477) and a raw `TextControl` link (edit.js:583) — it proves the element-first ARRANGEMENT, not
  the ShadowControl/SgsLinkControl cluster composition. Fix: upgrade brand-strip to the real controls, OR
  downgrade its claim to "proves arrangement only" + name a second block that proves Layout+Link. Refresh
  the exemplar note's stale Findings (3 of 5 dead).
- **[HIGH] Per-device border/shadow is a BUILD, not free (F6).** ResponsiveBoxControl/BorderRadius exist,
  but there is NO responsive wrapper for `ShadowControl` or the full border (width/style/colour). Mark
  per-device border+shadow as build items; the lint can't require what blocks can't yet express.
- **[MED] Behaviour-heavy blocks + the Content tab are unscoped (F8/F9).** The 11 behaviour-families + 8
  composite_panels (form validation, slider autoplay, product-card) have no home in Text/Fill/Layout —
  they belong in the **Content/Settings tab** as behaviour panels. State that clusters govern the STYLE
  tab only; define or explicitly defer Content-tab organisation.
- **[MED] Layout is a mixed-state cluster (F7).** border+shadow are hover-able but padding/size are not,
  so the Normal/Hover toggle governs only a sub-slice of Layout — specify exactly which attrs it
  re-binds, on a distinct "Border & shadow" sub-header inside Layout.
- **[LOW] Wording fixes:** Advanced is native+free via `supports.anchor` but renders as a PANEL inside
  Settings, NOT a 3rd tab (reconciles the 2-tab call with the brand-strip note's loose "Advanced tab"
  wording); link href/rel = Content, only link hover-styling = Style (F10); add a sibling element-order
  tiebreak (reading order) since "outer→in" can't order siblings (F11); specify or downgrade the
  preset-first mechanism (F12); note element-first forfeits WP's native sub-group ToolsPanels so
  per-element ToolsPanel disclosure is a hand-build to budget (F5).

## Relationship to the archetype deck (the control library)

This design is the ORGANISING layer; the **archetype deck v2** (artifact `a35048a9`, folded into
`setting-registry.json` in Task 1) is the CONTROL LIBRARY — what each individual control looks like
(border builder, 6-preset shadow + Normal/Hover, colour split, number+unit+preset box, media+alt
picker, repeater). Every control that appears inside a cluster below IS its archetype-deck design; this
doc does not redraw or replace them. Deck = the parts; element-first = how the parts are arranged per
element for the client. The deck's structural patterns (Settings/Styles/Advanced tabs, progressive
disclosure, Normal/Hover state, control-states) are the same ones this model uses.

## The two-level model

**Level 1 — ELEMENT (the panels), TWO tabs.** WP's block inspector gives **Content (Settings)** and
**Style (Appearance)** tabs. **Advanced (CSS class/anchor) is native and free via `supports.anchor` — but
it renders as a PANEL within Settings, NOT a separate third tab** (this reconciles Bean's "2 tabs" call
with the brand-strip note's looser "Advanced tab" wording — both are right: Advanced is free, and there
is no third tab column). The **content/look split is load-bearing:** an element's TEXT, its LINK
target/href/rel, and its behaviour toggles (what it says/does) live in the **Content** tab; its LOOK (the
element sections + clusters below) lives in the **Style** tab. So a button's *label string* AND its
*link target* are Content fields; only its typography/colour/hover-styling are Style. The **Style tab**
has one section per customisable element, ordered by manifest `order` (outer → in, sibling tiebreak =
reading order), each in its own Common-Region container. Brand-strip's proof:
`Tile → Logo image → Caption → Strip spacing`. Block-level structure (columns, grid, marquee, repeater)
lives in the **Content** tab.

**Cost note (F5):** element-first means each element section is a hand-rolled `PanelBody` — you do NOT
get WP's native color/typography/dimensions/border sub-group `ToolsPanel`s (with their free `resetAll` +
disclosure) for that element. So per-element `ToolsPanel` disclosure is a HAND-BUILD to budget across the
roster (brand-strip's Tile panel is the un-paid example — ~9 controls, no `ToolsPanel` yet). This is
named in the DONE checklist as a real cost, not a free default.

**Level 2 — CLUSTER (within an element).** Inside an element section, controls group into a small fixed
set of intuitive clusters, in ONE fixed order on every block, showing only the clusters that element
has (Bean-refined 2026-07-19):

| Cluster | Holds | Owning component | Normal/Hover? | Device-tier? |
|---|---|---|---|---|
| **Text** | font size/weight/line-height/spacing/style/transform/decoration (+ text colour) + text-align | `TypographyControls` + `DesignTokenPicker` | text colour: yes | **yes** (sizes) |
| **Fill** | background (solid+gradient), **opacity**, overlay (gradient+angle) | `ColorGradientControl` + `RangeControl` + `GradientPicker` | yes (whole cluster) | opacity/overlay only |
| **Layout** (the block's shape & size) | padding, margin, gap, width/height/max/min **+ border (width/style/colour/radius) + box-shadow** — everything that defines the block's outline and how it grows | `BoxControl` + `UnitControl` + `BorderBoxControl` + `ShadowControl` | border+shadow sub-part: yes | spacing/size: yes; **border+shadow: yes but needs a BUILD (F6)** |

*(The link target/href/rel is a **Content-tab** field, not a Style cluster — F10. Only link hover-styling,
if any, is Style. "Link" is therefore not in the Style-cluster set above.)*

Bean's rulings baked in (2026-07-19, final): **opacity lives in Fill**; **border AND shadow merge into
Layout** — the border and its shadow define the block's OUTLINE, which is the shape Layout governs, so
they are not a separate cluster; **"Spacing" is renamed "Layout"** and absorbs size (width/height) +
border + shadow; **"Effects" is gone**. **Device-tier (768/1024) extends to typography sizes, border AND
shadow** as well as spacing/size — a 2px border or a 20px shadow reads very differently on a wide
desktop vs a slim phone. **BUILD CAVEAT (F6):** `ResponsiveBoxControl` + `ResponsiveBorderRadiusControl`
exist, but there is NO responsive wrapper for `ShadowControl` or the full border (width/style/colour) yet
— per-device border+shadow is a build item (base/tablet/mobile attr triples + a Responsive wrapper + a
PHP `@media` emitter, Spec 32 no-inline), not existing capability. The lint may not require per-device
border/shadow until that ships. **Real blocks carry many controls — progressive disclosure (one "More"
expander) is load-bearing:** default-show the few common controls per cluster, hide the rest behind one
level.

## Normal/Hover is a STATE TOGGLE, not a cluster (Bean's rule)

Normal/Hover is not a group — it is a **state switch that sits at the top of any cluster (or clearly
labelled sub-part) whose properties can differ on hover**. It is the shared `StateToggleControl`: one
`Normal | Hover` segmented switch gates the SAME controls, re-bound to the Hover value when Hover is
selected, with a persistent legend so a hover colour is never invisible while editing Normal. **Focus
mirrors Hover.** There is never a second "Hover" panel. (Brand-strip proves this exact pattern — one
ToggleGroupControl gates a whole colour block.)

**Scope precision inside Layout (F7).** Layout is a MIXED-state cluster: its spacing/size members do NOT
hover, but its **border + shadow** do. So the Normal/Hover toggle inside Layout sits on a **distinct
"Border & shadow" sub-header**, NOT at Layout's top — and it re-binds ONLY the border
(colour/width/style/radius) + shadow attributes, never padding/margin/size. Fill's toggle re-binds the
whole Fill cluster (background/opacity/overlay). Each block's manifest names exactly which attrs each
toggle governs so the re-bind scope is never ambiguous to the builder or the client.

## Worked example — how brand-strip already does it (the bar to copy)

```
Settings tab:   Logos (repeater)  ·  Layout (columns + max-height)  ·  Marquee (behaviour)
Styles tab:
  ▸ Tile          Fill (bg + opacity) · Border & shadow · [Normal|Hover toggle]
  ▸ Logo image    (image controls: size, focal, alt/decorative)
  ▸ Caption       Text (TypographyControls + colour) · Spacing
  ▸ Strip spacing Spacing & size (responsive padding/gap)
  Advanced panel (inside Settings): CSS class / anchor  (native, free via supports.anchor — a panel, not a tab)
```

Each element shows only the clusters it has; the clusters always appear in the same order, so a client
who learns one block's inspector knows every block's.

## The element manifest — what makes the rule computable (F3/F4 fix)

The lint cannot see a block's "elements" today: the registry is keyed by property/input/behaviour, and
block attributes are flat (`tileBg`, `captionFontSize`) with no element grouping. So the standard
DEFINES the missing artefact — a declarative per-block **element manifest** that a linter reads. This is
the Task-2 prerequisite, not a follow-on.

**Manifest shape (`supports.sgs.elements` in each block's `block.json`):**

```jsonc
"supports": { "sgs": { "elements": {
  "tile":    { "label": "Tile",    "order": 1, "clusters": ["fill", "layout"] },
  "caption": { "label": "Caption", "order": 2, "clusters": ["text", "layout"] },
  "button":  { "label": "Button",  "order": 3, "clusters": ["text", "fill", "layout", "link"] }
} } }
```

- Each element declares **which clusters it HAS** (a capability list) + its display `label` and `order`.
- Each of the block's style attributes maps to `(element, cluster, member)` via a naming convention the
  build already half-uses (`caption*` → element `caption`; the cluster is the member's registry
  category). Where the prefix is ambiguous, the manifest may carry an explicit `attrMap`.
- **"Applicable" is now a FLAG, not prose semantics (F4 fix):** a member is applicable iff its cluster is
  in that element's `clusters` list. The ONLY gap condition is *"a declared cluster on a declared element
  is missing one of that cluster's members"*. No semantic inference, no "a caption COULD have a Fill"
  false-positive flood, no hand-maintained exclusion lists.

The manifest is small (a handful of lines per block) and is the single source of truth the conformance
script + the client inspector both read. Defining its schema + the attr→element convention precisely is
the first build step of the rollout.

## Behaviour + the Content tab (F8/F9 fix — the clusters govern the STYLE tab ONLY)

The three clusters (Text/Fill/Layout) organise the **Style tab** — the LOOK. They are NOT the whole
inspector. The registry's 11 `behaviour-family` + 8 `composite_panels` rows (form validation, slider
autoplay/arrows/dots, dismissible, disclosure, media playback, product-card add-to-cart) are **behaviour,
not look** — they live in the **Content/Settings tab** as per-element behaviour panels, never forced into
a Style cluster. Rule of thumb: *what it DOES* → Content tab; *how it LOOKS* → Style tab clusters.

Content-tab internal organisation (ordering, per-element grouping) is **explicitly scoped OUT of Task 2**
— it is a named follow-on (Content-tab organisation spec). Task 2 governs the Style tab. This keeps the
standard from hand-waving half the inspector: it states clearly which half it owns.

## The one rule the future lint enforces (computable, element-first)

> **CLUSTER-COHERENCE RULE.** For each element in a block's `supports.sgs.elements` manifest: for each
> cluster in that element's declared `clusters` list, the element must expose EVERY member of that
> cluster (per the cluster's member set), through the cluster's owning component, in the fixed cluster
> order, with the shared disclosure/reset/Normal-Hover behaviour. A declared-cluster member that is
> absent is a conformance gap. Elements are ordered by manifest `order` (outer → in); where two elements
> share an `order` band, the tiebreak is source/reading order top-to-bottom (F11), then the fixed cluster
> order within each. This is fully computable from the manifest + the registry member sets — no prose
> "semantics", no manual exclusion lists.

## What Bean signs off (the decisions)

1. **Element is the top-level axis** — element sections inside the STYLE tab (2 tabs: Content · Style;
   Advanced is a free panel in Settings); formalising the brand-strip model as universal, backed by
   NN/g + Stackable.
2. **Three within-element STYLE clusters:** Text / Fill / **Layout** — opacity in Fill; border + shadow
   merged into Layout (they define the outline/shape); Spacing renamed Layout, absorbing size + border +
   shadow; no "Effects". Link target/behaviour = Content tab, not a Style cluster.
3. **Normal/Hover is a state toggle** (StateToggleControl, Focus=Hover), on Fill (whole cluster) and on
   Layout's clearly-labelled border+shadow sub-part (re-binding only those attrs, not spacing/size).
4. **Device-tier (768/1024)** extends to typography sizes, spacing, size, border AND shadow — the last
   two are a named BUILD (no responsive ShadowControl/border wrapper yet, F6).
5. **Fixed cluster order + one-level progressive disclosure** — load-bearing because real blocks carry
   20–40 controls per element; default-show few, hide the rest behind one "More". Per-element `ToolsPanel`
   is a hand-build (F5).
6. **Preset-first entry** per block — the non-coder success factor. **Mechanism (F12):** block-level
   presets ship as WP **block style variations** (`registerBlockStyle` / `block.json` `styles`) surfaced
   as a visual row at the top of the Style tab; each variation seeds the clusters' values and stays fully
   editable. This IS lint-checked (a block with a styled look should declare ≥1 named style). Distinct
   from the per-control preset+custom seeding (registry `universal_control_behaviours`).
7. **The element manifest** (`supports.sgs.elements`) is the machine contract that makes the
   CLUSTER-COHERENCE rule computable — its schema + attr→element convention is the first rollout build.

## Rollout / hardening steps (post-lock, before the lint is switched ON)

1. **Build the element-manifest schema** (`supports.sgs.elements` + attr→element convention) + the
   conformance script that reads it. (The F3/F4 blocker — the rule can't run without it.)
2. **Upgrade brand-strip to the real controls** — swap `tileShadow` SELECT → `ShadowControl`, raw
   `TextControl` link → `SgsLinkControl` — so the exemplar genuinely embodies every cluster, then refresh
   the exemplar note. (F2 — currently proves ARRANGEMENT only.) Needs build + live-verify.
3. **Build per-device border + shadow** (responsive wrappers + `@media` emitters) before the lint
   requires them. (F6.)
4. **Content-tab organisation spec** — where the behaviour-families + composite panels live, ordered.
   (F8/F9 — explicitly a separate task; Task 2 owns the Style tab only.)
5. Then per-block: the conformance script lists each element's applicable-but-absent members → the
   gap list ("which blocks need a control added"), generated from the manifest, not hand-judged.
