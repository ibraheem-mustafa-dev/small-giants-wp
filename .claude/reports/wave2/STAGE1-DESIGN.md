---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Stage 1 DESIGN — universal converter core (DESIGN-GATE, awaiting Bean approval)"
created: 2026-06-09
status: DESIGN-GATE (Rule 7). NO converter code until Bean approves this design. Grounded in the live dispatch structure (convert.py walk() :2786-2876).
---

# Stage 1 design — universal per-slot CSS dispatch

## The architectural primitive (plain English)
Today the converter decides where a CSS value goes by looking **only at each element's own CSS**, through **four parallel lift functions**, and it routes composite interiors through **per-composite carve-out routers** — `_route_composite_interior` (gated by `db.has_scalar_media_attrs(slug)` `:2940`) + `_is_container_mirror_block` (`:2950`) → `_process_container_children`; plus the hard-coded trust-bar handler. (`is_class_section_block` is the VOTER's helper, FR-22-16 — not these gates.)

The universal primitive: **for every DOM node, each CSS declaration (its own + any it inherits from an ancestor) is routed to ONE destination — a child block's attr, the parent composite's per-slot attr, or the block's own scalar attr — by a single DB-driven dispatch that asks the database "which attribute owns this property for this slot?" The same dispatch runs at every nesting level, with no per-composite branches.** The node's slot identity (from the `slots` table) + the owning block's attribute schema (`block_attributes.canonical_slot` + `property_suffixes` + `role`/`attr_type`) decide the destination. Nothing is hard-coded per block.

## Current state (verified at code level)
- 4 lift paths, all node-own-CSS only: `_lift_typography_to_block_attrs` (`:1400`, called `:2847`), `_lift_wrapper_css_to_container_attrs` (`:981`, called `:2786`/`:2872`), `_lift_root_supports_to_style` (`:697`, called `:2812`/`:2856`), the scalar-media lift inside `_route_composite_interior` (`:2404`).
- Dead code: `_lift_styling_attrs` (`:1687`) + `_slot_attr_prefix` (`:1665`) — zero production callers (test-only).
- Carve-outs: `_route_composite_interior` (def `:2404`, gated `db.has_scalar_media_attrs(slug)` `:2940`); the sibling `_is_container_mirror_block` (`:2950`, def `:908`) → `_process_container_children` (`:3834`, guard `:3857`); the trust-bar atomic handler (`:2236`).
- The DB dispatch already exists for CONTENT: `equivalent_block_for` (`db_lookup.py:1995`) reads `role`/`canonical_slot` per (block,attr). The gap is the CSS side + the cross-node destination.

## The build — 4 commits (R-22-5), Gate A FIRST

### Commit 0 (pre-req) — Gate A golden-fixture conformance harness
Build `tests/test_converter_conformance.py` + `tests/fixtures/conformance/*.json` (one fixture/section: capture the CURRENT emitted attrs for each Mama's section as the golden baseline). This is the **regression lock** that makes Commit 1 safe — it proves the refactor changes nothing.

### Commit 1 — consolidate the dispatch (PURE REFACTOR, zero behaviour change)
One entry point `route_node_css(node, owning_block, css_rules, attrs, *, slot_context=None)` that orchestrates the existing helpers in a defined precedence order (typography → root-supports → wrapper-css, all `setdefault`) — the helpers' internals are NOT rewritten, only called through one door. **Delete `_lift_styling_attrs` + `_slot_attr_prefix`; fix the one test that imports them.**
- **Measure:** Gate A golden fixtures emit BYTE-IDENTICAL. A refactor that changes any emit is wrong — revert.

### Commit 2 — cross-node routing (the NET-NEW capability)
New step `_route_interior_css_to_parent_slot(child_node, parent_block, parent_attrs, css_rules)`: for a composite's interior wrapper/element child, resolve its BEM element → `canonical_slot` (slots table), find the parent block's attr group for that slot (DB: parent's `block_attributes` rows whose `canonical_slot` matches + box-property `property_suffixes`), and lift the child's box/layout CSS (padding/margin/max-width/gap) to those parent attrs — instead of dropping it. **DB-driven, no `hero__content→contentPadding` hardcode.**
- **Measure:** hero `contentPadding*` now set from `.sgs-hero__content` padding (today null); trust-bar `contentWidth` set from `.sgs-trust-bar__inner` max-width (today absent). H-B, TB-A-cap close.
- **Dependency (verify first):** the parent's per-slot box attrs (`contentPadding*`, `mediaPadding*`, `contentWidth`) must carry their `canonical_slot` in `block_attributes` so the dispatch can find them. If untagged → a small `/sgs-update`-driven backfill (Stage-0 "correct the DB as we go"). **Confirm this before building Commit 2.**

### Commit 3 — F6a inheritance / absence resolution (FR-22-5.1)
Extend `_collect_css_decls_for_element` with an ancestor-chain walk for inheritable properties (`text-align`, `color`, `font-family`, `line-height`): when a leaf has no own value but an ancestor sets one → resolve it explicit; when absent AND the block's own CSS default would override (heading `:where(){text-align:center}`) → emit explicit (`textAlign:left`). Feeds the same dispatch.
- **Measure:** H-C1, FP-A, IN-A/E, GF-A/E resolve to the draft's effective alignment.

### Commit 4 — retire the carve-outs (FR-22-19 retirement, HIGHEST blast radius)
Absorb BOTH per-composite branches into the universal handler: `_route_composite_interior`'s scalar-media lift (gated `has_scalar_media_attrs` `:2940`) = a cross-node route to the media slot; the `_is_container_mirror_block` branch (`:2950`) content-column fold stays but now ALSO runs cross-node CSS routing on the folded wrapper. **Remove BOTH per-composite gates** (`has_scalar_media_attrs` / `_is_container_mirror_block`) — the universal interior handler runs for every composite, deciding per-slot via DB. (Do NOT target `is_class_section_block` — it's the voter helper, FR-22-16.) Trust-bar: keep the badge CONTENT extraction (items array = the block's legit data model), but route `__inner` CSS via cross-node (per-badge CSS = Stage 1b). **PRESERVE the sole-element-child guard `fold_eligible = len(element_children) == 1` (`_process_container_children:3857`)** — it prevents the +13pp XS-3 regression.
- **Measure:** neither the `has_scalar_media_attrs`-gated `_route_composite_interior` branch (`:2940`) nor the `_is_container_mirror_block` branch (`:2950`) remains as a separate per-composite path in `walk()` — all composites route through the one universal dispatch; **live-DOM verify EVERY composite** (hero, cta-section, feature-grid, card-grid, gallery, testimonial-slider, trust-bar) routes correctly — universality, not score. Roll back only if genuinely non-universal.

## Gates per the handoff
- `/qc-council` per commit's fix-shape (predicted vs measured) before dispatch.
- Live-DOM universality verify (Playwright, real homepage) on Commits 2 + 4.
- Each commit cites pre/post measurement; ledger rows → VERIFIED with live evidence.

## What I need from you (the design-gate)
1. **Approve the primitive + the 4-commit shape?** (one dispatch + cross-node + F6a + carve-out retirement, Gate A first, pure-refactor Commit 1).
2. **The cross-node DB dependency** (Commit 2) — OK to backfill `canonical_slot` on the per-slot box attrs if they're untagged, as part of this?
3. Anything you want re-scoped before I write the first line of converter code.
