---
doc_type: design
spec_id: 35
spec_version: 1.0
title: Spec 35 — cluster + element vocabulary rework
date: 2026-07-20
status: APPROVED (Bean, 2026-07-20) — not yet built
supersedes: none
extends: .claude/plans/spec-35-compound-control-sets-design.md
---

# Spec 35 — cluster + element vocabulary rework

## Plain-English summary

Every SGS block has a settings sidebar. Spec 35 makes that sidebar the same shape on
every block, so a client learns it once. A block declares its styled **elements** (tile,
caption, box…), and each element declares which **clusters** of style properties it
offers (text, fill, layout). A linter then checks the block actually wires up everything
it claims.

Two problems were found on 2026-07-20 while rolling the manifest out to the first 8
blocks:

1. **The cluster vocabulary was only half-built.** It covers 25 of the 60 style
   properties in the golden master. The other 35 — including the entire grid and flex
   family — had no home, so composite blocks like `container` scored badly for exposing
   capability the vocabulary could not name.
2. **Element names were ad-hoc.** Each block invented its own, even though 23 composites
   all wrap the same `sgs/container` and therefore share one structure.

This document fixes both.

## Problem → Effect → Solution

**Problem.** The cluster axis was reverse-engineered from what had *already* been
clustered — mostly single-element typography and colour controls. `layout` ended up doing
two unrelated jobs: *"size this box"* (padding, border-radius — a `BoxControl` mental
model) and *"arrange these children"* (flex/grid — a `SelectControl` mental model).

**Effect.** Nobody could confidently file `flex-direction` next to `border-radius`, so 35
of 60 rows were never filed at all. `container` and `cta-section` scored 30/79 each — not
because they are under-built, but because the schema cannot describe what they expose. A
score that penalises a block for capability the vocabulary lacks is a score nobody can
depend on.

**Solution.** Split the overloaded axis into six honest clusters, and make element names
canonical by borrowing the vocabulary the cloning pipeline already uses.

---

## FR-35-1 — Element axis: canonical layer names

Manifest elements on **composite** blocks declare an optional `layer` field naming the
structural layer they represent, using the cloning pipeline's existing vocabulary from
`plugins/sgs-blocks/scripts/converter/services/layer_detect.py`:

| `layer` | Pipeline layer | Meaning |
|---|---|---|
| `OUTER` | L1 | The block's outermost box |
| `CONTENT` | L2 | Content-width constraining band |
| `GRID` | L3 | The grid/flex definition itself |
| `GRID_AREA` | L4 | A named per-area cell |

```jsonc
"grid": {
  "label": "Grid",        // client-facing, per block
  "layer": "GRID",        // canonical, shared with the converter
  "order": 3,
  "clusters": [ "layout" ]
}
```

### Rules

- **`layer` is OPTIONAL — but it is what unlocks the arrangement members.** Per FR-35-2a, an
  element with no `layer` is never asked about `display` / `flex-*` / `grid-*` / `justify-*` /
  `align-*` / `order` / `overflow`. So a composite's grid element MUST declare
  `"layer": "GRID"` (or `"OUTER"` where the root IS the grid) or those members are silently
  never checked. Single-element and content-KIND blocks correctly omit it.
- **A block declares only the layers it actually has.** Of the 23 composites, most have
  two or three. `accordion`, `tabs` and `multi-button` are flex/stack blocks with no GRID
  layer — that absence is CORRECT, not a gap. The contract is *naming discipline where a
  layer exists*, never a required four-element shape.
- **The linter check is ADVISORY (WARN-only)**, consistent with the rest of Spec 35 until
  spec close. It warns when a structural element on a `container_kind` block uses a
  non-canonical name (`inner`, `band`, `row`) instead of a `layer` value.
- **No converter change.** This is a declarative naming contract only. The converter does
  NOT read the manifest.

### Why this is safe

`supports.sgs.elements` already carries custom keys (`elements`, `imageControls`,
`_note`) and registered + rendered live on the sandybrown canary on 2026-07-20. A new key
inside the same namespace carries no registration risk.

### Evidence

All 23 composites (17 `layout` + 6 `section` per `block_composition.container_kind`) have
`wraps_block = sgs/container`. They are not 23 independent vocabularies — they are 23
blocks inheriting one wrapper's structure. Two independently-authored manifests
(`container`, `cta-section`) produced the same four elements without being told the layers
existed.

### Deliberately NOT in scope

Making the manifest the converter's routing map (so the converter reads `attrMap` instead
of its own internal mapping) was considered and REJECTED for now. It would make a bad
manifest break cloning rather than merely mis-score a linter. Revisit only after the
manifest has full roster coverage.

---

## FR-35-2 — Property axis: five clusters

> **REVISED 2026-07-20 (Bean).** This section originally specified SIX clusters, splitting
> `layout` into `layout` ("size this box") and `flow` ("arrange these children"). That split
> was built, measured, and then REVERSED the same day. The revised model is below; the
> superseded rationale is preserved at the end of this section because the reasoning that
> led to it is still the reason the vocabulary needed fixing at all.

`cluster-member-sets.json` grows from three clusters to five. Every `css:*` row in
`setting-registry.json` MUST belong to exactly one cluster, or be reclassified off the
`css:` axis entirely.

| Cluster | Job | Owning control model |
|---|---|---|
| `text` | Type styling | TypographyControls + DesignTokenPicker |
| `fill` | Paint — colour, gradient, image | ColorGradientControl + GradientPicker |
| `layout` | Size this box **AND** arrange its children — the ELEMENT disambiguates | BoxControl + UnitControl + SelectControl |
| `position` | Offset + stacking | UnitControl + RangeControl |
| `motion` | Transition timing | RangeControl + easing presets |

### Why `flow` was merged back into `layout`

**ELEMENT is the PRIMARY mapping axis; cluster is SECONDARY.** Arrangement properties do
control the layout of a block's items — the thing that separates *"size this box"* from
*"arrange these children"* is not a second cluster, it is **which element the property is
attached to**. `role=layout` on a `GRID` element means arrangement; the same role on a leaf
tile means box-sizing. One mechanism, not two.

This is corroborated by the DB: `block_attributes.role` has a single `layout` value covering
both, and `canonical_slot` carries the element signal that disambiguates them. Deriving a
second cluster was encoding in the property vocabulary something the element structure
already expressed.

### `layout` cluster: 26 members, two scopes

| Scope | n | Members | `appliesToLayers` |
|---|---|---|---|
| BOX | 14 | padding, margin, **gap**, width, height, max-width, max-height, min-height, border-width/style/color/radius, box-shadow, aspect-ratio | absent — applies to EVERY element |
| ARRANGEMENT | 12 | display, flex-direction, flex-wrap, align-items, align-content, justify-content, justify-items, order, grid-template-columns, grid-template-rows, grid-auto-rows, overflow | `["OUTER","GRID"]` |

**`css:gap` is deliberately a BOX member, not arrangement.** A leaf element legitimately has
an internal gap — brand-strip's tile spaces its logo from its caption via `logoGap`. Tagging
it as arrangement cost a real resolved member; caught by measurement and reverted.

### FR-35-2a — The element-axis gate (what makes the merge correct)

A member carrying `appliesToLayers` is checked ONLY when the element's `layer` is in that
list. **An element with no `layer` is NEVER asked about arrangement** — the correct default,
since it has not declared itself a structural layout layer.

Implemented as `memberAppliesToElement()` in `check-element-manifest-conformance.js`.

**Do NOT reintroduce an `isWrapper` fallback here.** An earlier version let any
`isWrapper: true` element through as a compatibility shim; it asked `sgs/button` whether it
had `grid-template-columns` and produced 60 false gaps across button/quote/media/testimonial/
brand-strip. Every wrapper is not a layout layer.

### Measured effect of the merge

| Configuration | OK | GAP |
|---|---|---|
| Six clusters (pre-merge) | 184 | 311 |
| Merged, no element gate | 184 | 455 |
| + gate, with `isWrapper` shim | 184 | 395 |
| **+ gate, layer-only (shipped)** | **184** | **335** |

OK held at 184 throughout — no resolved member was lost. The residual +24 vs the pre-merge
baseline is `container` / `cta-section`'s `wrapper` (12 each, layer `OUTER`) being asked about
arrangement. Judged HONEST, not false: those section wrappers genuinely have no flex controls.
Scoping arrangement to `GRID` only would suppress them but breaks `card-grid`, whose root IS
the grid under the MF-3 guard.

<details>
<summary>SUPERSEDED — the original six-cluster rationale (kept for the reasoning, not the conclusion)</summary>

The original argument for splitting `flow` out of `layout`: `layout` was doing two unrelated
jobs — *"size this box"* (padding, border-radius — a `BoxControl` mental model) and *"arrange
these children"* (flex/grid — a `SelectControl` mental model). Nobody could confidently file
`flex-direction` next to `border-radius`, so 35 of 60 rows were never filed at all.

**That diagnosis was correct and is still the reason this rework exists.** Only the remedy
changed: the disambiguation belongs on the element axis, not in a second cluster.

Also settled at the time and still true: `flow` was NOT split into separate flex and grid
clusters, because flex and grid share their alignment vocabulary (`align-items`,
`justify-content` apply to both) and splitting would duplicate members or force an arbitrary
home. `display` and `overflow` were grouped with arrangement for the same reason they carry
`appliesToLayers` today.
</details>

### New cluster: `position` (3 members)

`top`, `bottom`, `z-index`.

Thin but conceptually distinct from box-model sizing (Bean-approved 2026-07-20). The
registry's own `observed_roles` field independently tags `z-index` as `position`. If
`left`/`right` rows appear later they join here rather than becoming standalone scalars.

### New cluster: `motion` (2 members)

`transition-duration`, `transition-timing-function`.

58 combined instances across 22 and 19 blocks respectively. The registry's `observed_roles`
independently tags both as `motion`.

### Additions to existing clusters

- **`text`** — `font-family` (`nativeSupportsPath: typography.fontFamily`). A plain
  omission. Verified safe: emitted as a scoped declaration with no `!important` and no
  descendant wildcard, so it cascades as a default and any child setting its own
  font-family wins normally.
- **`fill`** — `background-attachment`, `background-position`, `background-repeat`,
  `background-size`, `object-fit`, `object-position`.
- **`layout`** — `aspect-ratio` (`nativeSupportsPath: dimensions.aspectRatio`).

### Merges — no new members

The per-side rows `margin-top/right/bottom/left` and `padding-top/right/bottom/left` fold
into the EXISTING merged `layout.css:margin` and `layout.css:padding` members. The
registry states the optimal control for each is the shared `BoxControl` already in place.

### Reclassifications — removed from the `css:` axis

| Row | Real identity | Action |
|---|---|---|
| `css:stroke` | `sgs/counter` `accentStroke` — an "accent underline" ToggleControl. Bean-verified 2026-07-19: *"there is no genuine stroke-paint setting"* | Re-key to a behaviour/decoration family |
| `css:percentage` | `sgs/decorative-image` `maxWidthPercent` (number, default 20, RangeControl 0–100) — a max-width expressed as a percentage | Fold into `layout.css:max-width`; delete the generic row |

### FR-35-3 — "Unclustered" becomes an error

Bean-ruled 2026-07-20: **a setting must apply to or impact something, so unclustered is
always wrong.** Both rows sampled as candidate "genuinely not a member" turned out to be
mis-keyed, not exempt.

A validator asserts every `css:*` row in `setting-registry.json` maps to exactly one
cluster member. A new unclustered row is a hard failure, not a silent omission — this is
the structural defence against the gap this document exists to close recurring.

---

## FR-35-5 — The `states` axis

**Status:** designed 2026-07-21, not yet built.

### Problem

113 state-variant attributes exist across 27 blocks (`backgroundColourHover`,
`tabActiveTextColour`, `formFocusRingColour`…). The manifest has no way to express them, so
they can only ever surface as ORPHANS — never as resolved, never as an honest gap. `sgs/tabs`
carries 6 such orphans today and every rollout wave adds more.

Separately this hides a real product defect already found: `card-grid` cards have hover
styling but **no resting-state background/border/radius**. A client can restyle the hover and
not the resting state. The manifest cannot currently say that.

### Why states are DECLARED, never parsed from names

The naming *nearly* encodes the answer, and "nearly" is the trap. Measured across all 113:

| State-token position | n | Example |
|---|---|---|
| Suffix | **92 (81%)** | `backgroundColourHover` |
| Infix | 11 | `linkHoverColour`, `tabActiveTextColour` |
| Prefix | 3 | `activeLinkColour` |

Two hard blockers to name-derivation:

1. **False friends.** `pauseOnHover`, `effectHover`, `imageZoomHover`, `grayscaleHover` all
   contain `Hover` and none is a state-variant style property — they are booleans and preset
   selectors. A `*Hover` rule files them as CSS states and is wrong. (Sibling precedent: a
   blind `*Hover` regex broke live `textAlign` previously — STOP-BLIND-REGEX-CODEMOD.)
2. **"Active" does not mean `:active`.** VERIFIED on `sgs/tabs`: `tabActiveTextColour` renders
   as `[aria-selected="true"]` (`render.php:232`, `style.css:110`). CSS `:active` means
   *being clicked*. A name-derived mapping would emit click-flash styling instead of
   selected-tab styling. **This is the single strongest argument for declaration.**

### State vocabulary — component state, mapped to its CSS realisation

A state name is a COMPONENT concept. Its CSS realisation is declared once here, centrally, so
no block re-derives it:

| State | CSS realisation | Notes |
|---|---|---|
| `hover` | `:hover` | Also emit `:focus-visible` where the control is focusable (a11y parity) |
| `focus` | `:focus-visible` | NOT bare `:focus` — avoids the mouse-click focus ring |
| `selected` | `[aria-selected="true"]`, `[aria-current]`, `.is-active` | The tabs/nav case. **NOT `:active`.** |
| `pressed` | `:active` | Genuine mouse-down. Rare; distinct from `selected` |
| `disabled` | `:disabled, [aria-disabled="true"]` | |

`selected` and `pressed` are deliberately separate names precisely because the attribute
naming conflates them.

### Schema

`states` sits on the ELEMENT, alongside `attrMap` — same authority model, same file.

```jsonc
"tab": {
  "label": "Tab",
  "order": 2,
  "clusters": [ "text", "fill" ],
  "prefix": "tab",
  "states": {
    "selected": {
      "attrMap": {
        "css:color":            "tabActiveTextColour",
        "css:background-color": "tabActiveBgColour"
      }
    },
    "hover": {
      "suffix": "Hover",
      "members": [ "css:background-color" ]
    }
  }
}
```

Two resolution forms, mirroring the base axis:

- **`attrMap`** — explicit, always authoritative. Required wherever naming is irregular
  (infix, prefix, or semantically misleading like `tabActive*`).
- **`suffix` + `members`** — the mechanical shortcut for the 81% suffix-shaped majority.
  `members` names WHICH members have this state; `suffix` says HOW to derive the attribute
  from the already-resolved base attribute (`backgroundColour` + `Hover`). **The author still
  declares which members participate — the suffix only does the mechanical part.** This is
  declare-which / derive-how, and it is what keeps the false friends out: `pauseOnHover` is
  never reachable because nobody lists it as a member.

### Rules

1. **States are OPT-IN per element.** An element declaring no `states` is never asked about
   them. A missing state is NOT a gap — most elements legitimately have no hover styling.
2. **Only DECLARED members within a declared state are checked.** Declaring `hover` does not
   ask about all 26 layout members at hover; it asks about the ones listed. This is the one
   place the all-or-nothing cluster rule deliberately does NOT apply, because the
   combinatorial product (5 states × 26 members × N elements) would be meaningless noise.
3. **A member may be declared at a state without being resolved at base.** That is the
   `card-grid` finding and it must stay VISIBLE, not be smoothed away — see the new finding
   status below.
4. **Attributes claimed by a state mapping are CLAIMED** for orphan-scan purposes. This is
   what removes tabs' 6 orphans.
5. **State findings are reported SEPARATELY from base findings.** `total_ok` / `total_gap`
   keep their current meaning; new `total_state_ok` / `total_state_gap` sit alongside. A
   finding carries `state: "<name>"`; its absence means base. Without this the headline
   number silently changes meaning again.

### New finding status: `STATE_WITHOUT_BASE`

Emitted when a member resolves at a state but NOT at base — the client can style the hover
but not the resting state.

This is not a linter curiosity; it is a **client-facing defect class**, and `card-grid` is a
live instance. It gets its own status so it cannot hide inside the gap count.

### Deliberately NOT in scope

- **Responsive × state combinations** (`hoverColourTablet`). No evidence of demand; adding a
  third dimension now would be speculative.
- **Auto-suggesting state mappings.** A helper could *offer* `{baseAttr}+Hover` for the 92
  suffix-shaped attrs, but a human or agent confirms. Never a regex deciding.

### Sequencing

Build BEFORE rollout wave 2. `sgs/tabs` already carries 6 state orphans and every wave adds
more; retro-fitting `states` across a finished roster costs more than carrying it forward.

---

## FR-35-6 — The `animation` cluster (JS-driven motion)

**Status:** designed 2026-07-21, not yet built.

### Problem

Scroll- and reveal-driven motion controls have no cluster home and are invisible to BOTH the
forward check and orphan detection (their names share no prefix with a declared element):

| Attribute family | Blocks |
|---|---|
| `sgsAnimation` / `sgsAnimationDuration` / `sgsAnimationEasing` | **10 each** |
| `bgParallax` | 4 |
| `staggerDelay` | 3 |
| `parallaxStrength`, `hasParallax`, `fadeOnScroll`, `revealOnScroll`, `revealStagger` | 1 each |
| `pathDrawDurationMs` / `pathDrawEasing` / `pathDrawOnScroll` / `pathDrawTriggerOffset` | 1 each |

### Why a SEPARATE cluster, not folded into `motion`

1. **Different mechanism.** `motion` is CSS transitions (`transition-duration`,
   `transition-timing-function`). These are JS scroll-observers. Merging them would mean a
   cluster where half the members can never resolve on a CSS-transition-only block, and the
   other half can never resolve on a scroll-animation block — manufacturing gaps on both
   sides. That is the `flow`-merge failure mode inverted: `flow` was wrongly split because
   the ELEMENT already disambiguated it; here nothing disambiguates, because the two
   families genuinely do not co-occur on the same control surface.
2. **Different control model.** `sgsAnimation` is a preset picker; `transition-duration` is a
   range slider. Every other cluster maps to one owning control model; this would map to two.
3. **Already a universal family.** `sgsAnimation*` appears on 10 blocks with identical naming
   — it is an existing extension, not a per-block one-off.

### Members

| Key | Label | Suffixes |
|---|---|---|
| `anim:preset` | Animation preset | `Animation` |
| `anim:duration` | Animation duration | `AnimationDuration`, `DurationMs` |
| `anim:easing` | Animation easing | `AnimationEasing`, `Easing` |
| `anim:stagger` | Stagger delay | `StaggerDelay`, `Stagger` |
| `anim:parallax` | Parallax | `Parallax`, `ParallaxStrength` |
| `anim:trigger` | Scroll trigger | `OnScroll`, `TriggerOffset` |

**Note the `anim:` key prefix, not `css:`.** These do not correspond to CSS properties, and
filing them under `css:` would be the same mis-keying that put `css:stroke` and
`css:percentage` in the registry. New `anim:*` rows are added to `setting-registry.json`
alongside the existing `css:*` / `input:*` / `behaviour:*` categories; FR-35-3's coverage
validator is extended to require every `anim:*` row be clustered too.

### Six clusters again — but on a mechanism boundary

`text · fill · layout · position · motion · animation`.

This is NOT a reinstatement of the `flow` split. `flow` was wrong because the ELEMENT axis
already carried that distinction. Nothing carries the CSS-vs-JS distinction — it is a genuine
mechanism boundary, and the two families never share a control surface.

---

## ROLLOUT REQUIREMENTS (read before manifesting any further block)

Both were learned by measurement on 2026-07-20 and both cause SILENT wrong scores, not
errors. Any prompt that rolls the manifest out to the remaining blocks must carry them.

1. **A cluster with neither a `prefix` nor an `attrMap` resolves ZERO members — and makes the
   score WORSE.** Declaring `clusters: ["layout"]` on an element whose attributes are bare
   camelCase (`gridTemplateColumns`) resolves nothing, because the default convention is
   `{prefix}{PascalCaseSuffix}` and there is no prefix to prepend. Measured: adding the
   cluster to three composites raised GAP by 36 and resolved nothing until explicit `attrMap`
   entries were added. Either declare a `prefix` or map every member explicitly.

2. **A composite's grid element MUST declare `"layer"` or its arrangement members are never
   checked.** Per FR-35-2a the 12 arrangement members only apply at layer `OUTER`/`GRID`. An
   un-layered element silently skips all 12 — it will look clean while being unverified.
   Use `GRID` for a dedicated grid element, `OUTER` where the block root IS the grid
   (`card-grid` — MF-3 makes the root OUTER regardless of its own `display:grid`).

## Consequences

- **The 8 existing manifests re-score.** `brand-strip`'s caption drops from 9/9 to 9/10
  when `font-family` joins `text`. Expected and correct — the denominator was wrong
  before. Re-scoring is a linter re-run, not rework.
- **Composite scores become meaningful.** `container` and `cta-section` currently score
  30/79 for exposing grid capability the vocabulary cannot name. After FR-35-2 those
  members resolve.
- **The section/layout-KIND rollout unblocks.** `hero`, `feature-grid`, `post-grid` and
  `gallery` were held back because they would all hit the same wall.

## Assumptions and risks

| Item | Status |
|---|---|
| 35 unclustered rows enumerated from the registry | **PROVEN** — counted directly |
| L1–L4 = OUTER/CONTENT/GRID/GRID_AREA | **PROVEN** — read from `layer_detect.py` |
| All 23 composites wrap `sgs/container` | **PROVEN** — `block_composition` query |
| `css:stroke` / `css:percentage` are mis-keyed | **PROVEN** — registry notes + codebase grep |
| `font-family` cascades without overriding children | **PROVEN** — read all 5 emitters |
| Instance counts (112 grid-template-columns, etc.) | **PROVEN** — re-derived from the registry, not taken from the classifying agent |
| The converter would benefit from a shared vocabulary | **ASSUMED — and deliberately not depended on.** FR-35-1 is naming-only, so if this proves false the cost is one declarative field. |
| Every one of the 35 rows can be cleanly clustered | **PARTIALLY PROVEN** — all 35 received a verdict, 26 CONFIDENT; the 5 judgement calls were adjudicated by Bean and 2 were reclassifications, not clusterings |

## FR-35-4 — Orphan-attribute detection (closes the `clusters: []` hole)

Bean-proposed 2026-07-20, replacing an earlier "needs its own decision" fudge.

The linter currently only checks DECLARED cluster members, so an element declaring
`clusters: []` is invisible to it — `sgs/button`'s real `iconColour` control can never be
verified. Rather than adding an escape-hatch marker, the linter works backwards as well:

> Scan the block's attributes for any attribute matching a declared element's `prefix`
> that NO declared cluster member claims, and report it as an ORPHAN.

This catches `iconColour` automatically (attribute exists, matches prefix `icon`, nothing
accounts for it) with no `_note` required, and generalises — any control added later
without being declared gets flagged. The blind spot becomes a positive check.

WARN-only, consistent with the rest of Spec 35.

---

## Out of scope

- **Card-grid resting-state styling gap** (surfaced during the pilot; wording CORRECTED
  2026-07-20 after Bean challenged the original claim). Cards are NOT child blocks —
  `card-grid` is fully dynamic, rendering an `items` attribute array or a `WP_Query`
  result (`render.php:11` — *"Inner block content (unused — block is fully dynamic)"*).
  The hover attributes DO apply (`render.php:275–294` emits `--sgs-hover-bg` /
  `--sgs-hover-border` / `--sgs-hover-shadow`). The real gap is narrower and stranger than
  first reported: **a client can change a card's hover background but not its resting
  background.** The resting state is hardcoded at `style.css:29-31` to
  `var(--wp--preset--color--surface)` + `var(--wp--preset--shadow--md)` with no attribute
  behind it. Per the project's hardcoded-wrapper-defaults rule this is a cheat to remove,
  not a constraint to preserve. Logged; not solved here.
- ~~Hover/state coverage~~ — RESOLVED by FR-35-5 (`states` axis), designed 2026-07-21.
- ~~JS-driven motion having no cluster home~~ — RESOLVED by FR-35-6 (`animation` cluster),
  designed 2026-07-21.
- Building the missing controls that the gaps identify. This document fixes the
  *vocabulary*; closing gaps is per-block work that follows.
