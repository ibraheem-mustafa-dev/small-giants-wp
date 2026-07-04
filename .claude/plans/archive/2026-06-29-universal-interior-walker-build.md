---
doc_type: phase-plan
project: small-giants-wp
thread: cloning-pipeline / content-UNIFY (D246) / Spec 31 §12 Step 3
stage: interior walker — Stage 2 (recognition) → Stage 3c (fold) → Stage 4f (child-shape fork)
generated: 2026-06-29
status: ACTIVE — full design + build THIS session (Bean-locked, no fresh-session punt)
authority: Spec 31 §3 + §12 (the blueprint) + the WORKING port source _process_container_children/walk()
supersedes: 2026-06-28-w3-walker-port-design.md + 2026-06-28-w3-g1-g5-closure-map.md (both retained as history)
---

# Universal interior walker — spec-driven build manifest

**This is a transcription of Spec 31 §3 + §12, not a fresh design.** Every build step cites
a spec line + a `convert.py` source line + a DB table. The evidence gate blocks any converter
edit without `spec=31`. Nothing is built that can't cite the spec; a spec gap is reconciled
INTO the spec first.

## Architecture (Spec 31 §12.4 — Bean-locked, not negotiable)
Per-resolver files behind ONE dispatch table `(block, layer, property/role, tier) → resolver`.
The interior walker = a recursive driver that, for each draft node, runs **recognise() WITH
parent context** then dispatches each routing unit (content + CSS) to its resolver. NOT a
mega-function; NOT the parallel `run_mechanism_b` glue (that glue is the partial Stage 3/4
content work to be seated into the dispatch table here).

## Stage order (Spec 31 §12.6 — pipeline order, each LANDED-gated before the next)
- **Stage 2 — recognition** (recognise() + parent-scoped resolution + slug-None-section→container). Build FIRST.
- **Stage 3c — fold tree** (slug-None wrapper fold + cross-node CSS + scalar-media lift + non-sgs content-width fold).
- **Stage 4f — child-shape fork** (scalar-vs-child-block; recursion to depth; leaf-demote; atomic-inside; text-leaf ladder; button grouping; allow-list validate).

## The ~16-branch parity checklist (port source → target)
Faithful port of `_process_container_children` (convert.py:5895) + `walk()` (4337) + helpers.
Each row: branch · Spec 31 ref · convert.py source · DB table · owning stage · council finding.

| # | Branch | Spec 31 | convert.py | DB | Stage | Council |
|---|--------|---------|-----------|----|-------|---------|
| 1 | recognise() 4 kinds (named/atomic/scalar/unrecognised) | §3.B.0, §2 | recognition (ported) | blocks, slots, atomic_tag_map | 2 | foundation ✓ |
| 2 | **parent-SCOPED slot resolution** (containing-composite slug, not sparse parent_block) | §3.B3(1), Axis-3 | walk():4460 child_block_for_parent_token + scope | blocks.parent_block + slots.aliases | 2 | CF-3 (G1 no-op fix) |
| 3 | **slug-None SECTION → sgs/container** (not UNRECOGNISED) | §1 Stage2, lesson slug-none-sections | _emit_section_container:6205 | block_composition | 2 | CF-5 (5/8 real sections) |
| 4 | atomic-tag swap inside a composite (`<p>`→core/sgs) + typo lift | §3.B.0, §3.A | walk():4397 | atomic_tag_map, property_suffixes | 4f | CF-6 |
| 5 | scalar content lift (B1) | §3.B1 | _lift_scalar_attrs_by_selector (ported: scalar_content.py) | block_attributes.derived_selector | 4f | ✓ (W1/W2) |
| 6 | scalar styling lift (B2) | §3.B2 | _lift_styling_attrs_by_selector (ported+wired: styling_content.py) | property_suffixes | 4f | ✓ (this session) |
| 7 | scalar-media column lift (hero splitImage) rule 0 | §3.B3, FR-22-19 | _process_container_children:6011 | block_composition scalar-media attrs, scalar_media_attr_for | 3c | CF (parity MF-3) |
| 8 | slug-None wrapper FOLD + cross-node CSS (hero __content) rule 2 | §3.A L1-L4, FR-22-5.3 | :6132 + _fold_layout_into_attrs:5863 + _route_interior_css_to_parent_slot:2597 | block_attributes layer attrs | 3c | CF-2/CF (parity MF-4) |
| 9 | grid-per-area dissolve + per-area CSS (D207) | §3.A L4 | :6093 + _route_area_css_to_block_attrs + _grid_item_areas:5972 | block_selectors, area attrs | 3c | parity MF-5 |
| 10 | content-band max-width lift | §3.A L2 | :6117 attr_for_layer_property CONTENT | block_attributes | 3c | parity MF-5 |
| 11 | non-sgs content-width wrapper fold | §3.A L2 | :6158 _detect_content_layer | — | 3c | parity MISSING-7 |
| 12 | leaf-misresolution → DEMOTE-and-keep (not drop) | §3.B3 | :6071 + walk():4492 | block_composition role=leaf | 4f | CF-7 (regression) |
| 13 | sgs-classed slug-None text-leaf ladder | §3.B3 | _route_text_leaf:5620 + _node_is_text_leaf:5583 + _is_text_capable_block | atomic_tag_map, slots | 4f | parity MF-8 |
| 14 | child-block emit + **recursion to depth** (G2) | §3.B3 "recurse" | :6127/6153 walk(parent_block=) | block_composition.accepts_allowed_blocks | 4f | CF-4 (live silent drop) |
| 15 | allow-list validation (G3, NULL=skip) | §3.B3(3) | (spec-strengthen; add accessor) | block_composition.accepts_allowed_blocks | 4f | (G3) |
| 16 | loose-button → sgs/multi-button grouping | Spec 11 | :6200 _group_loose_buttons:5716 | block_for_slot_token | 4f | parity MF-7 |
| 17 | array/repeater (B4) + per-item CSS | §3.B4, §3.B.0(3) | (D248 array path) | array_item_fields | 4f | residual (per-item CSS) |
| — | LOUD-GAP everywhere (no silent continue), G5 not emission gate | §3 line 101, Rule 4 | (new) | — | all | CF-4/CF-8/G5 |

## Module layout (new files under converter/)
- `converter/services/interior_walk.py` — the recursive driver (the `_process_container_children` spine + the per-child branch dispatch + recursion)
- `converter/services/fold_helpers.py` — `_fold_layout_into_attrs` + `_route_interior_css_to_parent_slot` + `_route_area_css_to_block_attrs` + `_grid_item_areas` + `_detect_content_layer`
- `converter/services/text_leaf.py` — `_route_text_leaf` + `_node_is_text_leaf` + `_is_text_capable_block`
- `converter/services/button_group.py` — `_group_loose_buttons`
- `converter/resolvers/atomic.py` — atomic-tag swap (+ typography lift reuse)
- `orchestrator/converter_v2/db_lookup.py` — ADD `accepts_allowed_blocks` accessor (G3) + parent-scoped slot resolver (if not derivable from existing accessors)
- `converter/services/recognise_helpers.py` / `recognition.py` — extend for parent-scoped resolution + slug-None-section→container
- `converter/services/extraction.py` — `run_mechanism_b` becomes a thin caller of `interior_walk`; B4 ambiguous fallback → loud ContentGap

## Build order (Spec 31 §12.6 stage-by-stage; each ledger+LANDED-gated)
1. **Stage 2** — parent-scoped resolution (#2) + slug-None-section→container (#3) + the `accepts_allowed_blocks` accessor (#15). Gate: recognise() returns the RIGHT block for accordion-item/product-card-leaf on the real draft; no section UNRECOGNISED.
2. **Stage 3c** — fold_helpers.py (#8,9,10,11) + scalar-media (#7) in interior_walk. Gate: hero __content CSS transfers + split image lands (LANDED).
3. **Stage 4f** — interior_walk child-shape fork: recursion (#14) + scalar-vs-child + leaf-demote (#12) + atomic (#4) + text-leaf (#13) + button-group (#16) + allow-list (#15) + loud gaps + G5 removal. Gate: grid-of-cards emits all cards; no silent drops.
4. Wire `run_mechanism_b` → interior_walk; B4 loud gap; delete dead `content_attrs_with_selector` LAST.
5. LANDED across ALL draft composites (hero, cta-section, info-box, card-grid/feature-grid, testimonial-slider) + the slug-None sections (featured-product, social-proof, gift-section, brand, ingredients) → sgs/container.

## Gates (every increment — Spec 31 §12.2/§12.6)
- Each converter edit emits `GROUND-TRUTH: spec=31 §… convert.py:… db=…` (evidence gate enforces).
- Full converter suite from canonical cwd `plugins/sgs-blocks/scripts`, `--import-mode=importlib`; prove failure path (STOP-16).
- Ledger zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set (§12.6).
- Pre-commit `/qc-council` on each BUILT stage (STOP-23); fact-check (STOP-15).
- Per-resolver golden + metamorphic test (§12.4). convert.py byte-identical (D-MODULAR). New guards `raise` not `assert` (STOP-27). Do NOT production-wire (STOP-28).
- Path-scoped commits per increment; verify HEAD after rename (STOP-19); D-ceiling check (→ D248; walker stages = D249+).
