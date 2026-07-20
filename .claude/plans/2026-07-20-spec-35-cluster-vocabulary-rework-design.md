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
  "clusters": [ "layout", "flow" ]
}
```

### Rules

- **`layer` is OPTIONAL.** Single-element and content-KIND blocks omit it entirely.
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

## FR-35-2 — Property axis: six clusters

`cluster-member-sets.json` grows from three clusters to six. Every `css:*` row in
`setting-registry.json` MUST belong to exactly one cluster, or be reclassified off the
`css:` axis entirely.

| Cluster | Job | Owning control model |
|---|---|---|
| `text` | Type styling | TypographyControls + DesignTokenPicker |
| `fill` | Paint — colour, gradient, image | ColorGradientControl + GradientPicker |
| `layout` | **Size this box** | BoxControl + UnitControl |
| `flow` | **Arrange these children** | SelectControl + ToggleGroupControl |
| `position` | Offset + stacking | UnitControl + RangeControl |
| `motion` | Transition timing | RangeControl + easing presets |

The `layout` / `flow` split is the load-bearing change. Everything else follows from it.

### New cluster: `flow` (12 members)

`display`, `flex-direction`, `flex-wrap`, `align-items`, `align-content`,
`justify-content`, `justify-items`, `order`, `grid-template-columns`,
`grid-template-rows`, `grid-auto-rows`, `overflow`.

**One cluster, not split into flex and grid** (Bean-approved 2026-07-20): flex and grid
share their alignment vocabulary — `align-items` and `justify-content` apply to both.
Splitting would duplicate those members across two clusters or force an arbitrary home.

`display` and `overflow` both land here (Bean-approved): `display` gates which other flow
properties apply at all, and `overflow` governs how children scroll and clip. Both
describe content behaviour inside the box rather than the box's own dimensions.

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

## Out of scope

- Hover/state coverage. Surfaced during the pilot: `card-grid` cards have ONLY hover
  styling and no static background, border or radius — **a real client-facing product gap**
  the manifest cannot currently express. Logged separately; not solved here.
- The `clusters: []` + `_note` oversight hole: an element declaring no clusters is
  invisible to the linter, so `button`'s real `iconColour` control is unverifiable.
  Needs its own decision.
- Building the missing controls that the gaps identify. This document fixes the
  *vocabulary*; closing gaps is per-block work that follows.
