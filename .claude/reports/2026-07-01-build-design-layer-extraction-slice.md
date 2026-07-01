# Build design — §2 layer-extraction system, first vertical slice (supersedes the K1/K2 doc)

**Blueprint:** Spec 31 §2 (`specs/31-UNIVERSAL-CLONING-PIPELINE.md`) — the canonical, clarity-verified core mechanism. This doc is the BUILD plan for wiring §2 into the new engine's single content+CSS stream. The earlier `2026-07-01-phase1-K1-K2-recursion-design.md` is SUPERSEDED (its "two shapes" model was wrong; §2's recursive fold replaces it).

## The gap (what's not built in the new engine)
`converter/services/extraction.py :: _descend_container_children` (L302-345) blindly **unwraps every** slug-None wrapper — no layer detection, no fold stop-condition, no grid-item test, and the arrangement-CSS lift ("conductor") is **unwired** (`fold_helpers`/`route_interior_css_to_parent_slot` are TODO-only, called from nowhere). So container-default sections lose their grid/flex layout and drop nested content (brand quote, gift grid, social-proof bar, ingredients). §2 is the target; this slice builds it.

## What §2 requires (build to these sections)
Per §2.2–§2.5, per container node in the single stream:
1. **Recognise** (already exists) → block slug; slug-None → `sgs/container` (any depth).
2. **Variant lookup at recognition** (FR-31-20; §2.2 step 2) — DEFER to slice 2 (hero split / product-card featured-trial). This slice targets the container-default sections that have no variant.
3. **Layer decomposition** (§2.3, name-free by CSS signature): OUTER (root box) / CONTENT band (`max-width`+`margin:auto`, no grid) / ARRANGEMENT (`display:grid`|`display:flex` on the direct parent of items) / PER-ITEM (`gridItem*`).
4. **Recursive fold** (§2.4): a **sole pass-through** child (single real child, no block identity) folds in (content-band CSS → `contentWidth`; arrangement CSS → layout attrs; its children become the container's children, re-apply the grid-item test). A **sibling'd** child or one with **block identity** recurses as its own container. **Grid-item test first:** direct children of a `display:grid`/`flex` element are grid items → InnerBlocks + per-property uniform box-CSS → `gridItem*`; NOT subject to the fold/recurse test.
5. **Content** in the same pass (§2.6): bare tags → atomic block via `blocks.replaces`/`atomic_tag_map`; scalar-vs-child fork per §13.3.

## Port-references (frozen engine — READ-TO-PORT the LOGIC, adapt to the single stream, STRIP the cheats; do NOT copy wholesale — the frozen engine ran separate CSS/content routes, ours is unified)
`orchestrator/converter_v2/convert.py`: `_process_container_children` (L5895, the fold-eligibility gate) · `_detect_content_layer` (L2244, L2 signature) · `_grid_item_areas`/`_grid_item_css` (L2308) · `_merge_grid_attrs_into_container` (L5784, grid CSS → attrs) · `_lift_uniform_grid_item_css` (L5807, per-item → gridItem*) · `_route_interior_css_to_parent_slot`/`_lift_decl` (L2660, layer routing).
**Cheats to STRIP on the way in** (flagged by the reverse-engineer pass): `'sgs/container'`/`'sgs/multi-button'` string literals → `db_lookup.container_default_slug()` / DB; module-level hardcoded sets (`_CORE_TEXT_CAPABLE`, `_BLOCK_LEVEL_CHILD_TAGS`, `_CROSS_NODE_EXCLUDED_PROPS`) → DB-sourced; verify the `breakpoint_suffix_rules()` tuple shape `(marker,[suffixes])` before iterating (bit the new engine once).

## Target files (new engine)
`converter/services/extraction.py` — rewrite `_descend_container_children` to the §2.4 recursive fold + grid-item test; add layer-detection + arrangement-CSS-lift + gridItem*-fold helpers (new `converter/resolvers/arrangement.py` or in `services/`), DB-driven. `converter/services/field_extractors.py` — per-item CSS. `db_lookup.py` — any new accessor (DB-first). Reuse the existing `_emit_content_leaf` (atomic-tag) + `resolve_media_url` (media-map already works).

## First vertical slice = LAND the BRAND section end-to-end (D242 vertical-slice, not a horizontal scaffold)
Brand exercises the whole mechanism: `.sgs-brand` root carries `display:grid; grid-template-columns:1fr 1fr` → root ARRANGEMENT → 2 grid items (`__content`, `__image`) → each an InnerBlock recursed for its own content: `__content` = heading + quote (bare `<p>`s → `sgs/text`) + cta; `__image` = img (media-mapped). Build the GENERAL §2 mechanism, prove it by LANDING brand on page 8, then confirm the same mechanism LANDS gift / social-proof / ingredients / featured-product (their §2.7 rows) in the same build.

## Acceptance (LANDED, not emit-green — R-31-11/R-31-13)
Deploy `SGS_NEW_ENGINE=1` → overwrite page 8 → anonymous computed-style/innerText at 375/768/1440:
- brand: 2-col grid (grid-template-columns present on the container), quote paragraphs + attribution present, image resolves to a WP URL.
- gift: heading + 2-col card grid; social-proof: heading + flex bar + slider grid; ingredients: feature-grid of info-boxes.
- draft-vs-clone per section; `innerText.length>0`; + Bean's eye.

## Gates
- cheat-gate coverage on `converter/` MUST be armed first (in-flight, separate subagent) — then cheat-gate green.
- `/qc-council` on the BUILT code (STOP-23: input-class≠output-class; render reads the attr written).
- tests ≥299 + cheat-gate exit 0; convert.py byte-identical (D-MODULAR); branch main; path-scoped commit.

## Orchestration
Implementer subagent (opus, its own context) builds from §2 + the port-refs + cheat-strip list; I QC via /qc-council + I deploy + LANDED-verify (deploy/live-verify is the main session's job — `main-agent-orchestrates-subagents-implement`). Design-gate: §2 IS the vetted (clarity-council'd) blueprint; proceed to build + /qc-council-on-built-code rather than another pre-build council.
