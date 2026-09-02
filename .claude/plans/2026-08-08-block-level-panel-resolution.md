---
doc_type: strategic-plan
title: "The block-level panel — tier 1 element, tier 2 property-family"
spec_ref: .claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART O §THE PLACEMENT RULE · §CO-28
date: 2026-08-08
status: "MODEL APPROVED (D537, Bean, 2026-08-09) — tier 1 element / tier 2 property-family is
        locked and propagated (f5a31435, d4d6d687). §4 VOCABULARY GATE BUILT (055a24ce,
        e2be7f73, ab9cb5c7) — background-media + shape-divider members landed in
        cluster-member-sets.json, gated by check-cluster-coverage.py's widened self-tested
        typo guard. Hero's tier-2 count closed 61 -> 30 (python
        plugins/sgs-blocks/scripts/placement-reach.py --block hero, re-derived 2026-08-09);
        library-wide 1,236 (46.1%) -> 1,702 (65.6%) element-scoped. The remaining 30 on hero
        are the per-block manifest families §3 already named as NOT vocabulary work (split-
        media, alignment, prefix-mismatch, content, hover+motion, block-scope) — see §3 update
        below."
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

## 2. Evidence (measured 2026-08-08, re-derivable)

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

**✅ Closed 2026-08-09 (055a24ce, e2be7f73, ab9cb5c7)** — the two vocabulary families below (31 of
the 61) are now homed by the §4 gate; hero's tier-2 count is **30**, re-derivable via
`python plugins/sgs-blocks/scripts/placement-reach.py --block hero`. The other six families were
always per-block manifest work, not vocabulary, and remain open (§6).

| Family | n | Why it falls through | Home | Status |
|---|---|---|---|---|
| **Background media** — `backgroundImage*`, `bgVideo*`, `bgSvg*`, `bgKenBurns`, `svgContent`, `backgroundOverlay*`, `overlayGradient*`, `overlayOpacity` | 21 | The `fill` cluster has members for background *position / repeat / size / attachment* but **none for the media system itself** | `fill` cluster — §4 members | ✅ CLOSED (055a24ce, ab9cb5c7 — `input:media-source`/`input:code-svg` members) |
| **Shape dividers** — `shapeDivider{Top,Bottom}{,Colour,Height,Flip,Invert}` | 10 | No cluster covers them at all | `layout` cluster, appended last (Bean: "bottom of the layout section") | ✅ CLOSED (e2be7f73, ab9cb5c7 — routed via `layout`, not a new `decoration` set) |
| **Split-variant media** — `splitImage*`, `splitMedia`, `splitContentOrderMobile` | 8 | The `media` element declared prefix `image`, so `split*` never matched | `media` element `attrMap` | ✅ CLOSED (2026-09-02) — moot by construction, not by a manifest edit. `splitMedia` was deleted outright (2026-08-13, unified media-type migration); `splitImage`/`splitImageMobile` were deleted 2026-09-02 (D919) once the cloning pipeline's routing was re-anchored off them. `hero/block.json` now declares dedicated `split-image`/`split-media` elements in their own right (not routed through the shared `media` element's `image` prefix at all), so the original mismatch no longer applies to any live attribute. `splitContentOrderMobile` still exists (edit.js) — worth a quick standalone check that it has a manifest home, but that's a new, narrow question, not a continuation of this row. |
| **Alignment** — `alignment`, `textAlign{Desktop,Tablet,Mobile}`, `verticalAlign`, `verticalAlignment` | 6 | Members exist (`css:text-align`, `css:align-items`) under different attribute names | element `attrMap` | ⏳ OPEN — element-manifest edit |
| **Prefix mismatch** — `mediaPadding*`, `subHeadline{MarginBottom,MarginBottomMobile,MaxWidth}` | 6 | `media`'s prefix is `image`; `sub-headline` declares empty `clusters` | element manifest | ⏳ OPEN — element-manifest edit |
| **Content** — `headline`, `subHeadline`, `label` | 3 | `contentAttrs` declared by zero blocks | Task 3 generator | ⏳ OPEN — waits on `contentAttrs` |
| **Hover + motion** — `textColourHover`, `transitionDuration`, `transitionEasing` | 3 | Universal-extension duplicates already slated for deletion | design §4 (hover migration) | ⏳ OPEN |
| **Block-scope** — `variant`, `templateMode`, `tagName`, `layout` | 4 | Nothing to fall through *to* — these style nothing | **the pinned Settings panel** | ✅ Correctly placed per D537 — not a gap |

**61 = 21 + 10 + 8 + 6 + 6 + 3 + 3 + 4.** Four are the panel; fifty-seven were data — 31 of those
are now closed by the §4 gate, leaving **30 = 8 + 6 + 6 + 3 + 3 + 4**.

## 4. ⛔ DESIGN GATE — BUILT (055a24ce, e2be7f73, ab9cb5c7 — 2026-08-09, Bean-approved)

Closing the two largest families meant adding members to `cluster-member-sets.json`. What actually
shipped, after two revisions once real data was checked:

- **`fill` gained the background media members** via two `input:*` registry rows that already
  existed and described them (`input:media-source`, `input:code-svg`) — not a new `css:*` row, which
  the coverage gate would have rejected as unbacked. `check-cluster-coverage.py`'s TYPO GUARD was
  widened to validate member keys against **all** registry rows (not just `css:*`/`anim:*`), while
  COVERAGE stayed scoped to `css:*`/`anim:*` only — a deliberate scope split, not a general
  loosening. The gate gained a 7-case `--self-test` in the same commit.
- **Shape dividers did NOT get a new `decoration` member set** (the option this doc originally
  proposed). Bean ruled divider height + shape belong "at the bottom of the layout section", so
  they were appended last to the existing `layout` cluster instead. An earlier attempt routed the
  divider *heights* through the unscoped `css:height` member and measurably regressed contested
  placements 9 → 19 (both OUTER-scoped members collided) — reverted at e2be7f73, then fixed at
  ab9cb5c7 by keeping both divider families `appliesToLayers: ["OUTER"]` only.

**Blast radius, as predicted:** conformance gap count rose (GAP 3250 → 3346, `check-element-
manifest-conformance.js` — advisory, non-blocking, exactly as this doc forecast) while OK/ORPHAN/
defects held steady. Coverage gate stayed green (69 css/anim rows, scope unchanged). `npm run
build` exit 0. Contested placements held at 9 throughout this gate's work (all pre-existing
nav-menu — see D538/D539) and are now 0 library-wide following the separate D539 nav-menu fix.

**Not in this gate** (ordinary per-block data work, no shared mechanism touched, still open): the
split-media, alignment and prefix-mismatch families — 20 of the original 61 — remain element-
manifest edits on hero.

## 5. What is explicitly NOT covered here

- **Rendering the inspector from the model.** This defines placement; the hero POC (Task 4)
  builds it.
- **`contentAttrs`.** Task 3. Three of hero's remaining 30 wait on it.
- **The hover extension's deletion.** Design §4, unchanged; 48 blocks still depend on it.
- **The other 82 blocks' data gaps.** The resolver reports them per block; closing them is the
  Phase 6 roll-out, not this document.
- **`cluster-member-sets.json`'s existing members.** Only additions are proposed; nothing
  currently declared is re-scoped.

## 6. Acceptance

The LEDGER's gate for this task: *re-run the placement resolver and show the block-level count
DROPS, per block.* It does — 1,445 → 1,109 library-wide, 76 → 61 on hero, from the resolver step
alone with no block edited. **Closing §4 took hero to 30 (measured, not projected —
`python plugins/sgs-blocks/scripts/placement-reach.py --block hero`, re-derived 2026-08-09).**
The §3 per-block data work (split-media 8, alignment 6, prefix-mismatch 6, content 3, hover+motion
3 = 26 of the 30) remains open; the block-scope 4 are already correctly placed, not a gap.

Bean signs off on the model before it is applied to any block (Rule 9 — this scopes all 83).
