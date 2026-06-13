---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline
title: "A — the name-free align/grid LAYER-ROUTER (design for adversarial-council gate)"
created: 2026-06-13
status: DESIGN — pre-build. Rule 7 gate: /adversarial-council on the router MECHANISM BEFORE any code.
supersedes: the interim WS-A dual-key render fallback (shipped 1f107711) is the SAFE INTERIM this router makes permanent/redundant on the converter side.
parent_programme: .claude/plans/2026-06-12-universal-align-router-programme.md
---

# A — the name-free align/grid layer-router

## Plain-English problem (what & why)

When the cloning converter meets a draft section that is a CSS grid (e.g. a feature grid, a card grid, a trust bar), it must transfer the grid's *alignment* (`align-items`), *gap*, and any *per-item background* onto the target SGS block's attributes. Today it does this with a **hardcoded name fork**: it literally checks "does this block have an attr called `verticalAlign`? else `alignItems`?" and writes to whichever it finds.

That fork is a carve-out (Rule 3 breach) AND it contradicts the canonical spec: **Spec 22 line 134 says structural box CSS must route NAME-FREE** — `canonical_slot` is for content routing only, not structural CSS. Box CSS (padding/background/border/width) already routes name-free through `_lift_wrapper_css_to_container_attrs` + `property_suffixes`. **Grid-align/gap/per-item-bg are the last hardcoded-name holdouts.** A brings them into compliance.

## The carve-out to remove (exact code)

`convert.py:4092-4101` — inside the `_is_container_mirror_block(slug)` grid branch:

```python
_grid_va = _detect_grid_container_from_css(classes, css_rules)
if _grid_va and _grid_va.get("verticalAlign"):
    _align_names = _block_attr_names(slug)
    _align_attr = (
        "verticalAlign" if "verticalAlign" in _align_names      # ← HARDCODED NAME FORK
        else "alignItems" if "alignItems" in _align_names       # ← HARDCODED NAME FORK
        else None
    )
    if _align_attr is not None:
        attrs.setdefault(_align_attr, _grid_va["verticalAlign"])
```

Sibling hardcoded-name sites in scope:
- `convert.py:3318-3350` — the trust-bar grid + `iconCircleBackground` hand-read (per-item background). NOTE: WS-C kept `iconCircleBackground` *typed* as genuinely trust-bar-specific. **Open question for council:** is per-item-bg a universal GRID-per-item-layer property, or genuinely trust-bar-only? (See OQ-3.)
- Any other `if "<attrName>" in ...` literal in the structural-CSS lift path (council to enumerate; grep `in _align_names` / `in _block_attr_names`).

## The 4-layer model this routes against (Spec 22 §FR-22-21 + §FR-22-21.3, Bean-locked 2026-06-11)

OUTER box · CONTENT-WIDTH (band) · GRID-uniform (`gridItem*`) · GRID-per-area (`<areaName>*`). Align-items, gap, per-item-bg live at the **GRID** layer.

## Proposed primitive

`db_lookup.attr_for_layer_property(slug, layer, css_property) -> str | None`

Given a block slug, a layer (`outer` | `content-width` | `grid` | `grid-per-area`), and a CSS property (`align-items`, `gap`, `background-color`, …), return the attr_name that block declares for that property at that layer — **purely from DB, zero name literals in convert.py**. Returns `None` (→ flag `attribute_gap_candidate`, never silent-drop, FR-22-21 step 6) when the block declares no such attr.

Call-site replacement:
```python
_align_attr = db.attr_for_layer_property(slug, "grid", "align-items")
if _align_attr is not None and _grid_va.get("verticalAlign"):
    attrs.setdefault(_align_attr, _grid_va["verticalAlign"])
```

## The hard problem the council MUST stress: the property→attr mapping

The fork exists because **two blocks use different attr names for the same CSS property** (`verticalAlign` on container/hero/cta/trust-bar; `alignItems` on the grid-mirror blocks feature-grid/card-grid/gallery). `property_suffixes` maps a CSS property to ONE suffix, so it cannot resolve both today. Three candidate backings:

- **OPTION A — new `layer_property_attr` mapping table (or a `css_property`+`layer` column pair on `block_attributes`).** Each block's structural attr carries its (layer, css-property). Clean separation from `canonical_slot` (which Spec 22 line 134 reserves for content). Populated by `/sgs-update` from `block.json` (e.g. a `supports.sgs.layerProperty` annotation, or derived from `property_suffixes` + a per-block alias list). **Recommended** — honours the content-vs-structural split; DB-first (R-22-1); no rename needed.
- **OPTION B — overload `canonical_slot`** (e.g. `canonical_slot='grid-align'` on both attrs). Reuses existing infra but **violates Spec 22 line 134** (canonical_slot is content-only). Rejected unless council overturns the line-134 distinction.
- **OPTION C — standardise the 8 blocks to ONE attr name** (the rename Bean rejected as the *mechanism*). Then `property_suffixes` alone resolves it; the router is trivial; no new table. Still useful as **post-router hygiene** but not the primary mechanism. NOTE: with the router (Option A), the rename becomes OPTIONAL — the converter no longer cares about the name. This is the key payoff of the router: **it decouples the converter from block attr names, so the 8-block rename is no longer required for universality.**

## 8-block reconciliation — now OPTIONAL (the router's payoff)

The programme plan's original "unify 8 blocks to one align attr + deprecated.js + render dual-key + WP-CLI batch re-save" was required when the fix was a rename. **With the layer-router (Option A), the converter is name-agnostic, so the rename is downgraded to optional naming hygiene.** The already-shipped render-side dual-key fallback (`verticalAlign ?? alignItems ?? start`, WS-A 1f107711) keeps live pages correct regardless. Council to confirm the router fully removes the rename from the critical path.

## Verification plan (every step)
- Converter golden conformance (Gate A) green; re-baseline only with a cited reason (REGEN=1). The align/gap emit for feature-grid/card-grid/trust-bar must be byte-identical to today's correct output (the router is a refactor, not a behaviour change, for blocks that already work).
- Negative test: a block that declares NEITHER align attr → `attr_for_layer_property` returns None → no attr emitted + a logged gap-candidate (no crash, no garbage attr).
- Live page-8 / canary DOM probe per affected row (R-22-11): feature-grid `align-items:stretch` (IN-C, already live) stays correct; trust-bar gap + white circle (TB-A/B) stay correct.
- No other block's emit changes (run full conformance suite; any drift = router over-broad).

## ADVERSARIAL-COUNCIL VERDICT (2026-06-13, 6 personas) — CONDITIONAL GO on a CORRECTED, SMALLER build

**The design as originally written above is SUPERSEDED by this section.** The council (Cynic C · Spec-Lawyer C+ · Ship-PM D+ · Regression B− · Universality-Purist D+ · DB-Schema-Architect B) converged that the original design was over-scoped AND mis-aimed, and would have shipped a no-op-or-regression. The CORRECTED build below is the acceptance surface.

### Convergent must-fix register (ranked by convergence)
1. **[4+ personas] The primitive ALREADY EXISTS and cannot resolve align-items today.** `db_lookup.attr_for_layer_property(slug, layer, css_property)` is already built (db_lookup.py:2399). `property_suffixes` has ONE row for align-items: `(118, 'VerticalAlign', 'layout', 'align-items')` (confirmed live). → router returns None for the 8 `alignItems` blocks = silent regression. **FIX: add ONE row** `('AlignItems','layout','align-items',...)`; the resolver iterates suffix rows + gates by `candidate in block_attr_map`, so each block gets whichever name it declares. NO new table (Option A's table is REJECTED as over-engineering; Option B already rejected; Option C rename stays optional hygiene).
2. **[2 personas] Wrong layer token + wrong layer.** Design said `"grid"`/lowercase; built resolver accepts UPPERCASE `OUTER`/`CONTENT`/`GRID`, and `GRID` prefix = `gridItem` (per-item — wrong for align). align-items is an OUTER-layer container property. **FIX: call `attr_for_layer_property(slug, "OUTER", "align-items")`.**
3. **[2 personas] The real fix site is the SHARED helper, not the named fork.** Three name-literal sites: (a) the fork `convert.py:4096-4097`; (b) `_merge_grid_attrs_into_container:~4796` hardcodes `verticalAlign` for ALL THREE call paths AND fires FIRST via `setdefault` (so fixing only the fork closes ZERO breaches); (c) `_detect_grid_container_from_css:~4719` returns the name-coupled key `"verticalAlign"`. **FIX: put the resolution INSIDE `_merge_grid_attrs_into_container` (pass `slug`), remove the fork at 4092-4101, neutralise the detector's internal key to a CSS-neutral name.**
4. **[5 personas] Scope cut.** Answer OQ-3 NO (iconCircleBackground stays typed — trust-bar-specific leaf attr), OQ-4 NO (gap already name-free via property_suffixes, out of scope), drop the 8-block rename, drop the new table. Router v1 = `align-items` ONLY.
5. **[3 personas] Verification teeth.** Goldens can be REGEN'd to hide a regression. **FIX: add a NON-regennable assertion that the align attr=value is PRESENT for feature-grid/card-grid/trust-bar; add `TestDispatchDeterminism` pins** (feature-grid→alignItems, trust-bar/container→verticalAlign, + a None case); full conformance suite must show NO other block drift; live page-8 probe IN-C (feature-grid stretch) + TB-A/B.
6. **[2 personas] Keep the render-side dual-key (`verticalAlign ?? alignItems ?? start`) PERMANENTLY** — it's the regression floor; a future cleanup pass must NOT remove it. Add a guard comment at the render site.

### SHOULD-FIX (cheap insurance, non-blocking)
- DB-architect MF-4: a `check-layer-property-sync` prebuild gate (sibling of check-composition-sync) asserting the DB align mapping matches each block's declared attr. Optional given the call-site double-gate (`_is_container_mirror_block` + `_detect_grid_container_from_css`) already scopes firing to real grids.
- R-22-5: ship as ≥2 commits (DB row migration; then call-site relocation + golden re-baseline).

### CORRECTED build (the acceptance surface — ~1 hour)
1. Add `property_suffixes` row `align-items → AlignItems` (role=layout) via idempotent migration (db_lookup.py pattern at ~862). [Commit 1]
2. Add `slug` param to `_merge_grid_attrs_into_container`; replace its hardcoded `verticalAlign` with `db.attr_for_layer_property(slug or 'sgs/container', 'OUTER', 'align-items')`; emit a `_trace` on the resolve.
3. Remove the fork at convert.py:4092-4101 (now redundant — the shared helper covers it).
4. Neutralise `_detect_grid_container_from_css` internal key → CSS-neutral name; update its readers.
5. Determinism pins + non-regennable align-present assertion + full conformance run. [Commit 2]
6. /qc-council before commit (blub.db 255); commit by explicit path; merge to main via temp-worktree cherry-pick.

## Open questions for the adversarial council (ORIGINAL — now answered above; retained for audit)
- **OQ-1.** Option A vs C as the primary mechanism — does Option A (new mapping) fully remove the rename from the critical path, or does a residual need for canonical naming remain?
- **OQ-2.** Does adding a `layer_property_attr` table / columns risk the same over-broad firing qc-council caught on the testimonial scalar-lift (an over-broad ~50-block fire)? How is the mapping scoped so it only fires for blocks that genuinely declare the structural attr?
- **OQ-3.** Is `iconCircleBackground` (trust-bar per-item bg) genuinely a universal GRID-per-area property to route through the router, or is it correctly trust-bar-specific and should STAY typed (WS-C decision)? Routing it universally risks emitting per-item-bg onto blocks that don't want it.
- **OQ-4.** `gap` already lifts via `_lift_wrapper_css_to_container_attrs` (property_suffixes). Does it need to move into the router at all, or only align-items + (maybe) per-item-bg? Over-scoping A to "re-route everything" is itself a Rule-3 over-broad break.
- **OQ-5.** Migration/deploy window: with the render-side dual-key already shipped, is there ANY remaining server-side regression risk when the converter switches name → router resolution? (Expected: none, since the router writes the SAME attr name the block already declares.)
- **OQ-6.** Enumerate every hardcoded-name structural-CSS site (not just the align fork) so A closes the whole class, not one instance (Rule 3).
