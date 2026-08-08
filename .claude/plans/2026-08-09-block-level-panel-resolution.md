---
doc_type: strategic-plan
title: "The block-level panel — tier 1 element, tier 2 property-family"
spec_ref: .claude/plans/spec-35-control-type-contract.md §THE PLACEMENT RULE · §CO-28
date: 2026-08-09
status: DESIGN — awaiting Bean sign-off; resolver upgraded, no block touched
supersedes: "the Task 1 framing in LEDGER.md (2026-08-08) — 'design the block-level panel'"
---

# The block-level panel

## FOR BEAN — plain English first

**What Task 1 was supposed to be.** The placement rule said "one panel per element", and a
measurement showed it only decided where 46% of controls go. The other 54% fell into a
"block-level panel" the rule mentioned in one line and never described. On `sgs/hero` that was
76 controls in one unnamed panel — the crammed tab you rejected, moved one level down. The job
was to design that panel.

**What it turned out to be.** There is almost nothing to design. Of hero's 76, **four** are
genuinely block-scope: `variant`, `templateMode`, `tagName`, `layout`. The rest were falling
through because of gaps in the data and one missing step in the measuring script — not because
the model had no answer for them.

**Your decision made the model uniform.** Tier 1 is the element; tier 2 is the property family.
That applies at every level, including the block's own wrapper, so the wrapper stops being a
special case. And it needed no invention: the six property families are already defined, with
names and control components, in `scripts/consistency/cluster-member-sets.json`, and all 283
elements already declare which ones they have.

**What changed today.** The measuring script never read that file. Teaching it to read it moved
the figure from 46.1% to 58.6% with no change to any block. The remaining gap is a list of
specific, named data gaps — not an open design question.

---

## 1. The model

**Tier 1 — element.** One panel per declared element, titled by its `label`, ordered by its
`order`. Unchanged from the placement rule.

**Tier 2 — property family.** Inside each element panel, controls group into the clusters that
element declares, in the order fixed by `cluster-member-sets.json` (`text` → `fill` → `layout` →
`position` → `motion` → `animation`), each rendered by that cluster's `owningComponent`.

**Pinned first — one "Settings" panel** holding the controls that style nothing: the block's
shape selectors and its functional toggles. On hero that is 4 controls; on a carousel block it
also holds `autoplay` / `showDots` / `showArrows`; on a form field, `required` and the
conditional-logic rules.

**Membership is derived, never authored per block**, in this order:

1. explicit `attrMap` entry
2. `states.*.attrMap`
3. `contentAttrs` *(declared by zero blocks — Task 3)*
4. **cluster member suffixes** — `{prefix}{Suffix}` for each member of each declared cluster
5. default `{prefix}{Suffix}` convention, longest prefix first
6. responsive / unit / state siblings follow their base

Step 4 is new. It is tier 2, and it is what the conformance checker has always used —
`placement-reach.py` simply never consulted the same file.

## 2. Evidence (measured 2026-08-09, re-derivable)

`python plugins/sgs-blocks/scripts/placement-reach.py`

| | Before | After |
|---|---|---|
| element-scoped | 1,236 (46.1%) | **1,572 (58.6%)** |
| block-level | 1,445 (53.9%) | **1,109 (41.4%)** |
| `sgs/hero` block-level | 76 | **61** |

⚠ **An earlier figure in this session said hero would drop 76 → 34.** That was wrong. It came
from name-family triage (`background*`, `bg*`, `overlay*`, `shapeDivider*` = 38 attrs), not from
the cluster member sets that actually govern. The governing predicate is step 4 above, and it
yields 61. Stated here because a count without its derivation is not reproducible.

The resolver ships with a `--self-test` carrying a **negative control** (the same fixture with
the cluster undeclared must fall through) and a **positive control** for the `appliesToLayers`
gate. A first draft of that gate test was vacuous — the `{prefix}{Suffix}` convention claimed the
attribute before the gate could matter, so it passed for the wrong reason.

## 3. Every one of hero's 61 has a named home

| Family | n | Why it falls through | Home |
|---|---|---|---|
| **Background media** — `backgroundImage*`, `bgVideo*`, `bgSvg*`, `bgKenBurns`, `svgContent`, `backgroundOverlay*`, `overlayGradient*`, `overlayOpacity` | 21 | The `fill` cluster has members for background *position / repeat / size / attachment* but **none for the media system itself** | `fill` cluster — §4 members |
| **Shape dividers** — `shapeDivider{Top,Bottom}{,Colour,Height,Flip,Invert}` | 10 | No cluster covers them at all | new `decoration` member set — §4 |
| **Split-variant media** — `splitImage*`, `splitMedia`, `splitContentOrderMobile` | 8 | The `media` element declares prefix `image`, so `split*` never matches | `media` element `attrMap` |
| **Alignment** — `alignment`, `textAlign{Desktop,Tablet,Mobile}`, `verticalAlign`, `verticalAlignment` | 6 | Members exist (`css:text-align`, `css:align-items`) under different attribute names | element `attrMap` |
| **Prefix mismatch** — `mediaPadding*`, `subHeadline{MarginBottom,MarginBottomMobile,MaxWidth}` | 6 | `media`'s prefix is `image`; `sub-headline` declares empty `clusters` | element manifest |
| **Content** — `headline`, `subHeadline`, `label` | 3 | `contentAttrs` declared by zero blocks | Task 3 generator |
| **Hover + motion** — `textColourHover`, `transitionDuration`, `transitionEasing` | 3 | Universal-extension duplicates already slated for deletion | design §4 (hover migration) |
| **Block-scope** — `variant`, `templateMode`, `tagName`, `layout` | 4 | Nothing to fall through *to* — these style nothing | **the pinned Settings panel** |

**61 = 21 + 10 + 8 + 6 + 6 + 3 + 3 + 4.** Four are the panel; fifty-seven are data.

## 4. ⛔ DESIGN GATE — the one change that needs approval before building

Closing the two largest families means adding members to `cluster-member-sets.json`:

- **`fill` gains the background media members** — `css:background-image` (media source, per tier),
  video source, SVG source and its presentation options, Ken Burns, and the gradient-overlay
  members currently absent.
- **a `decoration` member set** for shape dividers, or the divider attrs move onto the wrapper's
  `attrMap` explicitly.

**Blast radius, stated plainly:** that file is read by `check-element-manifest-conformance.js`,
a wired gate. Every member added becomes something all 283 elements are measured against, so
elements that report clean today will report new GAPs tomorrow. The gate is advisory, so nothing
breaks — but the reported gap count will rise before it falls, and that number should not move
without you knowing why. Per project rule 7 this is a shared-mechanism change and does not
proceed on my judgement alone.

**Not in this gate** (ordinary per-block data work, no shared mechanism touched): the split-media,
alignment and prefix-mismatch families — 20 of the 61 — are element-manifest edits on hero.

## 5. What is explicitly NOT covered here

- **Rendering the inspector from the model.** This defines placement; the hero POC (Task 4)
  builds it.
- **`contentAttrs`.** Task 3. Three of hero's 61 wait on it.
- **The hover extension's deletion.** Design §4, unchanged; 48 blocks still depend on it.
- **The other 82 blocks' data gaps.** The resolver reports them per block; closing them is the
  Phase 6 roll-out, not this document.
- **`cluster-member-sets.json`'s existing members.** Only additions are proposed; nothing
  currently declared is re-scoped.

## 6. Acceptance

The LEDGER's gate for this task: *re-run the placement resolver and show the block-level count
DROPS, per block.* It does — 1,445 → 1,109 library-wide, 76 → 61 on hero, from the resolver step
alone with no block edited. Closing §4 takes hero to 30, and the §3 per-block data work to 10.

Bean signs off on the model before it is applied to any block (Rule 9 — this scopes all 83).
