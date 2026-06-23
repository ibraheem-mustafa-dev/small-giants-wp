---
doc_type: reference
project: small-giants-wp
purpose: Per-stage annotated blocks for the SGS Cloning Pipeline. Every stage shows scripts that run, files read/written, DB tables touched, skills dispatched, and wiring status. Also contains the absorbed script inventory, skill dispatch chain (full), and DB heat-map (full). Overview and stage-index table are in cloning-pipeline-flow.md.
session_date: 2026-05-13
last_annotated: 2026-06-13
line_number_policy: Line numbers cited are accurate as of 2026-05-13 against sgs-clone-orchestrator.py HEAD (1277 lines). If they drift, grep for the function or constant name instead.
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Skill dispatch change at any stage
---

**DB table note:** `slot_synonyms` and `legacy_role_lookup` were unified into the `slots` table (D99, 2026-05-29). The `slots` table has composite PK `(slot_name, scope)`: scope='element' rows are the element-resolution data; scope='section' (4 rows post-D111) are the section-boundary data. `roles` table (21 rows) replaced `slot_synonyms.role_classification`. Wherever annotations below reference a DB table, use the current table names — `slots`, `roles`.

# SGS Cloning Pipeline — Per-Stage Annotated Blocks

Overview and stage-index table: `.claude/cloning-pipeline-flow.md`

> **STATUS (2026-06-23, D241):** the cloning CSS-transfer **foundation (Phase F) is COMPLETE**; `convert.py` is FROZEN (D-MODULAR, D229). Active target = the **clean modular stage-by-stage rebuild (Spec 31 §12)**. The de-literalisation programme referenced below is SUPERSEDED (archived 2026-06-23). The D222 detail below is retained as shipped-history.
>
> **ACTIVE BUILD TARGET (updated 2026-06-13, D222 — historical):** Wave-2 core largely SHIPPED. Cross-node child→parent CSS routing (D201), FR-22-5.1 inherited/absent-value resolution (D202 Commit 3), FR-22-19 retirement / unified composite interior (D202 Commit 4), Gate A + Gate B conformance gates wired (D195). **D222 SHIPPED:** name-free align LAYER-ROUTER (`verticalAlign`/`alignItems` fork removed from `convert.py`; resolves via `db.attr_for_layer_property` + D222 `property_suffixes` migration); notice-banner content-lift (IN-F, DB-gated); team-member scalar-content-lift (`HAS_INNER_BLOCKS_OVERRIDES` + `ATTR_CLASSIFICATION_OVERRIDES` in `sgs-update-v2.py`). **OPEN:** ~13 per-block `if slug=="sgs/X"` literal carve-outs — see `.claude/plans/archive/2026-06-13-converter-de-literalisation-audit.md`. FR-22-5.2 draft-driven breakpoints not yet built. **NOTE (D222 lesson): TWO separate conformance suites exist — `converter_v2/tests/` ≠ `scripts/tests/test_converter_conformance.py` (Gate A golden harness wired to pre-commit hook). Both must pass on every converter commit.**

## Per-stage annotated flow

### Stage 0 — Pre-flight + Theme Cache

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/preflight_chain.py       run_preflight() + run_precommit_gate │
│  ✓ orchestrator/mutex.py                  Cross-platform file lock (1hr stale) │
│  ✓ orchestrator/staged_output.py          Creates pipeline-state/<run_id>/   │
│                                                                             │
│ THEME CACHE (Step 6a, 2026-05-14):                                          │
│  theme.json + variation overlay loaded ONCE in main() into run_ctx dict.   │
│  All downstream stages read run_ctx["theme_json"] — single source of truth. │
│  _reflect_new_token_in_theme_json() mutates the same dict so token         │
│  discovery in section N is visible to section N+1.                         │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/.mutex.lock                              │
│  plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json (per stage)   │
│  theme/sgs-theme/theme.json (base tokens)                                   │
│  theme/sgs-theme/styles/<client>.json (variation overlay)                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0-preflight.json                   │
│                                                                             │
│ DB tables:    none (reads theme.json + styles/<client>.json files, not DB) │
│ Skills:       none                                                          │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.1 — BEM compliance lint

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/lints/bem-lint.py                             │
│       called directly by sgs-clone-orchestrator.py:1125 via the             │
│       `stage_0_1_bem_lint()` wrapper function (CORRECTED 2026-05-13 via QC) │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html (the draft)                       │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0.1-bem-lint.json                  │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│ Modes:        strict (halt) / draft (warn) / legacy (bypass)                │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.5 — Token-usage lint (additive token discovery)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/lints/token-lint.py                           │
│       called by preflight_chain.run_precommit_gate()                        │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/match.py                        │
│       imported by token-lint.py at line 91 (the LIVE binding for match.py) │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│  theme/sgs-theme/theme.json (base tokens)                                   │
│  theme/sgs-theme/styles/<client>.json (variation overlay)                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-0.5-token-lint.json                │
│  (in --apply mode) theme/sgs-theme/styles/<client>.json (new tokens)        │
│                                                                             │
│ DB tables:    none (reads theme.json directly, NOT design_tokens DB row)    │
│ Skills:       none                                                          │
│ Modes:        discover (default) / strict / legacy                          │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.7 — CSS lift (four-destination router, Spec 22 §FR-22-5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/css_router.py (~661 LOC)         │
│       D0 = global/reset (unscoped variation CSS)                            │
│       D1 = typed-attr-lift with token-snap (sidecar JSON)                   │
│       D2 = wrapper-CSS scoped `.page-id-N`                                  │
│       D3 = gap-candidate DB + D2 fallback                                   │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html (extracts <style> blocks)         │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/<run>/css-d1-assignments.json (D1 sidecar consumed by cv2)  │
│  theme/sgs-theme/styles/<client>.css (variation CSS, scoped to .page-id-N) │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│                                                                             │
│ STATUS:       LIVE — Spec 22 §FR-22-5 (four-destination router; D0/D1/D2/D3). │
│               Previous monolithic CSS dump architecture replaced.            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.8 — Theme-widths detection + style-variation layout lift (2026-05-18)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py            │
│       _detect_client_layout_widths(css_rules)                               │
│       _write_client_layout_widths(client_slug, widths, repo_root)           │
│       _load_theme_widths(client_slug, repo_root)                            │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json (settings.layout — framework defaults)          │
│  theme/sgs-theme/styles/<client>.json (variation overrides if present)      │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/styles/<client>.json (idempotent — appends                 │
│      settings.layout.contentSize/wideSize when keys not yet present)        │
│                                                                             │
│ DB tables:    none (CSS-pattern based, not slug-based)                      │
│ Skills:       none                                                          │
│ STATUS:       LIVE (Branch B 2026-05-18)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1 — Section boundary detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py    │
│       subprocess-called from sgs-clone-orchestrator.py at line 536          │
│       2026-05-30 D107: per-section-convention-voter.py:295-305 now queries  │
│       blocks.tier via db_lookup.is_class_section_block() helper (was:       │
│       literal-slug-match for all sgs- classes). Section-roots → confidence  │
│       1.0; non-section-roots → gap-candidate.                                │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/db_lookup.py                     │
│       is_class_section_block() helper — reads blocks.tier column            │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py          │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4e). Adds source_convention +       │
│       primary_sgs_bem + equivalent_implementations + gap_candidate_classes  │
│       + lingua_franca_skipped to every boundary.                            │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py                 │
│       WIRED 2026-05-14 (transitively via stage1_boundary_hook).             │
│                                                                             │
│ FILES (R):  sites/<client>/mockups/<page>/index.html                        │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/voter.json (rewritten)        │
│             pipeline-state/sgs-clone/<run_id>/stage-1.json                  │
│                                                                             │
│ DB tables (R) — post-D107/D108/D111/D128/D152:                               │
│   blocks.tier (D107 — new column, 2 rows class-section)                     │
│   block_composition (D108/D152 — 197 rows post-D152; container_kind column  │
│     added D152, values section|layout|content, 29-block roster fully        │
│     populated (D167 2026-06-04; was 28 pre-D167);                           │
│     AVAILABLE for queries, walker consumption DEFERRED — P-XS-3-TRIGGER)    │
│   slots WHERE scope='element' (99 rows)                                      │
│   slots WHERE scope='section' (4 rows post-D111; was 16 pre-D111)            │
│   roles (D99/D128 — 21 rows; replaces slot_synonyms.role_classification;    │
│     scalar-media role added D128 2026-06-01)                                │
│ Skills (X):     ✗ /uimax-classify-naming (deferred — current dispatch uses  │
│                   heuristic classifier in stage1_boundary_hook)             │
│ STATUS:       LIVE - tier-driven routing (D107) + slots/roles (D99/D111)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 2 — Block-type match

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py               │
│       imported directly (not subprocess) by sgs-clone-orchestrator.py:514  │
│                                                                             │
│ FILES (R):  plugins/sgs-blocks/src/blocks/<slug>/block.json                 │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/stage-2.json                  │
│                                                                             │
│ DB tables (R):  blocks (sgs-framework.db, via filesystem scan)              │
│                                                                             │
│ UNIVERSAL-PATH TOPOLOGY (Spec 22 FR-22-3):                                  │
│   Single recursive walker; per-block behaviour from DB rows, not branches.  │
│   Exactly 3 permitted exceptions: atomic-tag swap / chrome-skip /           │
│   top-level container wrap. No 4th exception without spec amendment.        │
│                                                                             │
│ Stage 2 produces match.json for every section boundary (FR-22-12) even      │
│ when walker bypasses top_pick via unambiguous BEM signal.                   │
│                                                                             │
│ Q1A FIX (commit d8ae4a2a, 2026-05-23): Stage 2 fallback emits sgs/container │
│   instead of core/group per Decision 3. No-confident-match → sgs/container  │
│   by design. Section boundary data: slots WHERE scope='section', 4 rows.    │
│                                                                             │
│ STATUS:       LIVE - core/group fallback fixed (2026-05-23)                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 3 — Slot list (per matched block)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE stage_3_slot_list() function in sgs-clone-orchestrator.py         │
│       (reads block.json directly in Python, no subprocess)                  │
│                                                                             │
│ FILES (R):  plugins/sgs-blocks/src/blocks/<slug>/block.json                 │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/stage-3-slot_list.json        │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, derived_selector)   │
│   D194: canonical_slot here = the CONTENT fork (child-InnerBlock vs scalar, │
│   read with role+attr_type); structural box-CSS routes via property_suffixes│
│   + CSS-signature, name-free — NOT canonical_slot.                          │
│                                                                             │
│ Wave 3 (2026-05-21, e60fe58e): annotates each slot with canonical_source:   │
│   'db' | 'auto-derived'. slot_canonicalisation_gap: true on auto-derived.   │
│   Mama's run: 81.4% DB-canonical, 18.6% gap.                               │
│                                                                             │
│ STATUS:       LIVE - DB canonical_slot lookup active; gap annotation active │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4 — Universal block-equivalent extraction (Spec 22)

> **Architecture:** single universal walker path with exactly 3 permitted exceptions per Spec 22 FR-22-3. Per-block behaviour comes from DB rows (`slots` (scope='element') `standalone_block` + `block_attributes.canonical_slot` + role-exclusion via `roles` table), not code branches. Acceptance gate: per-section ≤5% × 3 viewports (≤1% target).
>
> **Wrapper/container resolution (D118, 2026-05-31):** §FR-22-4.1 (Universal wrapper/container resolution) is the canonical Stage 4 rule for every sgs-classed wrapper below a section root. It supersedes `walk_passthrough` drop-and-bubble for sgs-classed wrappers, the depth-2 `_is_layout_bearing_wrapper` gate, and `_absorb_transparent_wrappers` (D52). Precedence: (1) block-match → emit block; (2) direct descendant with no block match → fold CSS into parent container (1-child: inner-CSS layer; grid/flex: container absorbs layout + grid-item CSS); (3) direct descendant matching a block → emit as block (the grid item); (4) non-direct-descendant → own sgs/container, recurse. FR-22-11 (non-sgs-classed transparent wrappers) is unchanged.
>
> **Universal wrapper-conversion procedure (FR-22-21, 2026-06-02):** This procedure applies at every nesting depth — to every `sgs/container` and every composite wrapper in the draft tree, not only to top-level section-root wrappers. Canonical 6-step TARGET for the fold + CSS-lift at this stage (OUTER box → container supports/attrs; INNER `__inner` max-width → `contentWidth`; GRID → native grid attrs + `gridItem*`; carry-all-CSS / flag-never-drop). **Empirical current behaviour vs that target (updated 2026-06-03, A1+A2 commit 2f86d9e6, D159):** ~~fold DELETES `__inner` and DISCARDS its `max-width`~~ — **SHIPPED (A2):** `_fold_layout_into_attrs` now lifts the folded `__inner`'s max-width into `contentWidth`; ~~`contentWidth` has no destination~~ — **SHIPPED (A1):** `sgs/container` gained `contentWidth` attr + render.php guarded inner div + block.json 0.2.0; ~~outer max-width transfer broken on slug-None path~~ — **SHIPPED (A2):** slug-None section path now sets width from the section's own max-width. ~~`widthMode`/`customWidth`~~ — **RETIRED D230 `484d04d9` / D231 `d5416ae8` 2026-06-18 → 3-layer model `align`/`maxWidth`/`contentWidth`; `align:"full"` for full-bleed; `maxWidth` = exact literal (decimals+unit preserved); `contentWidth` tokens `normal`/`wide`/`full`, default `full`. LANDED-verified on canary.** **Remaining gaps:** D1 typed-attr sidecar written-but-not-consumed (`seed_d1_sidecar` stub, B1 WS-2) so layout CSS still strands in variation CSS. **WS-4 BLOCK-SIDE COMPLETE (D167, 2026-06-04):** whole 29-block container roster mirrors `sgs/container` (hero + product-card done; modal + mobile-nav excluded; content-collection registered as 29th); `/sgs-update` reconciled (`block_attributes` 2,739; roster 29; 0 orphans); `/sgs-update` Stage 11 auto-propagation §FR-22-21.2 still REPORT-ONLY (pending). **Converter-side gaps remain (next-session "Method 2"):** D1 sidecar still not consumed; converter still routes to `sgs/container` (conf 0.10) — composite routing fix (`.sgs-hero`→`sgs/hero`), converter-lift (post-WS-4), triage #6 + #4a, image sideload. Full TARGET + gap list: Spec 22 §FR-22-21 + `.claude/plans/archive/2026-06-02-container-wrapper-standardisation.md`. **NOTE — WS-4 block-side mirror does NOT fix page-clone fidelity:** re-clone of page 144 shows stage-2 confidence-matrix top = sgs/container (conf 0.10) across all 9 sections; the converter still emits containers, not composite blocks. Routing fix + converter-lift are the separate Method-2 work. Validate composite BLOCKS in the EDITOR (fresh block), not via a page re-clone (memory `composite-mirror-is-separate-from-cloning-fidelity`).


```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✗ tools/recogniser-v2/extract.py — UNREACHABLE (Wave 1, 2026-05-21)        │
│  ✓ converter_v2/convert.py — PRIMARY SLOT EXTRACTION ENGINE                 │
│       --converter-v2 default TRUE (Wave 1 2026-05-21)                       │
│  ✓ orchestrator/modifier_extractors.py — WIRED 2026-05-14 (Step 4d)         │
│                                                                             │
│ FILES (R):  sites/<client>/mockups/<page>/index.html                        │
│             sites/<client>/research/<client>-media-map.json                 │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json    │
│             pipeline-state/sgs-clone/<run_id>/stage-4-extract.json          │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, output_signature)   │
│   D194: canonical_slot = the CONTENT fork only (child-InnerBlock vs scalar, │
│   gated by role + attr_type); structural box-CSS (contentWidth/*Padding*/   │
│   gridItem*) routes name-free via layer-prefix + property_suffixes.         │
│   D110 backfill (2026-05-30): canonical_slot 52 → 659 (2.5% → 31.8%); role  │
│   110 → 676 (5.3% → 32.6%). 1316 rows remain NULL (vocab/regex gaps logged).│
│   assign-canonical.py ported from retired slot_synonyms → slots+roles       │
│   schema (9 references migrated). Stage 1 tail of /sgs-update wires it.     │
│   [DESIGN/build-pending] blocks.variant_attr + variant_slots: when a        │
│   block's variant_attr IS NOT NULL the converter counts which variant's      │
│   discriminating slots (variant_slots table) appear in the draft's extract  │
│   THIS run, picks the highest-count variant, and sets the variant attr →    │
│   render.php's original gate fires correctly. Reverts the hero $is_split    │
│   band-aid. Universal across 33 variant blocks (R-22-1/R-22-9). Build =     │
│   next session opening task. Full spec: Spec 22 §FR-22-20 + D133.           │
│ External tools: Playwright (computed-style extraction at 3 viewports)       │
│                                                                             │
│ STATUS (post-2026-05-24 second pass — SHIPPED): 5 data-layer + walker      │
│   changes shipped — slot_synonyms cleanup, section_inner_absorb pre-pass,  │
│   quote canonical migration, /sgs-update Stage 1 tail assign-canonical     │
│   wire, Mama's brand mockup BEM rename. Empirical: Stage 11 mean pixel-diff│
│   70.5% → 73.9%. ARRAY_LIFT_PATTERNS hardcoded dict NOT yet deleted        │
│   (count_stars + multi-selector are special features). Parked as            │
│   P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION.                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4.5 — Token snapping (per value) [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/token_resolver.py - resolve() + resolve_batch()             │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4a)                                 │
│  ✓ orchestrator/variation_router.py - add_token() writes new tokens to      │
│       client variation JSON; hard-blocked from root theme.json mutation     │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4b)                                 │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/match.py - snap engine          │
│  ✓ plugins/sgs-blocks/scripts/lints/token-lint.py - canonical slug gen      │
│                                                                             │
│ FILES (R):  theme/sgs-theme/theme.json                                      │
│             theme/sgs-theme/styles/<client>.json                            │
│ FILES (W):  theme/sgs-theme/styles/<client>.json (new token candidates)     │
│                                                                             │
│ 2026-05-20: Token-snap now actually fires via _snap_style_dict_leaves().    │
│   Strict exact-match guard (_strict_snap_passes): ΔE ≤ 1.0 or hex equality │
│   for colour; ≤ 1px for spacing/font-size. Below threshold → keep literal  │
│   + surface gap candidate.                                                  │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4a+4b complete                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 5 — Default-inheritance check [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/inheritance.py                  │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4c) transitively via supports_writer│
│  ✓ orchestrator/supports_writer.py - filter_writes() omit-vs-emit           │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4c)                                 │
│                                                                             │
│ FILES (R):  theme/sgs-theme/theme.json                                      │
│             plugins/sgs-blocks/src/blocks/<slug>/block.json                 │
│ DB tables (R):  block_supports                                              │
│ STATUS:       LIVE - Phase 6 v2 Step 4c complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 6 — Block.json emission

**Spec 17 framework pattern targets:** the `/sgs-clone` Stage 6 (cv2 emission) can now target the 9 framework header/footer patterns shipped in Spec 17 (`sgs/framework-header-{default,sticky,transparent,shrink,minimal,centred}` + `sgs/framework-footer-{default,compact,informational}`) instead of always generating bespoke header/footer markup. (Header/footer cloner is a Phase 2 sibling spec, parked — see `.claude/plans/archive/2026-05-24-phase-2-header-footer-cloner.md`.) Spec 22 §3 FR-22-6 (hybrid block render.php migration) governs the equivalent work for body sections.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE in sgs-clone-orchestrator.py / extract.py serialize_block()       │
│                                                                             │
│ FILES (R):  plugins/sgs-blocks/src/blocks/<slug>/block.json                 │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json    │
│                                                                             │
│ DB tables:    none                                                          │
│ STATUS:       LIVE - working for matched sections                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 7 — Render to WP markup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE serialise inside extract.py.serialize_block()                     │
│  ✓ orchestrator/composer_fallback.py compose_atomic_pattern() (Step 6c)     │
│       FALLBACK ONLY - fires when matched block is core/group or             │
│       confidence == 0                                                       │
│                                                                             │
│ FILES (R):  pipeline-state/sgs-clone/<run_id>/extract-*.json                │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/full-page-markup.html         │
│             pipeline-state/sgs-clone/<run_id>/stage-7-compose.json          │
│                                                                             │
│ STATUS:       LIVE for matched; FALLBACK for unmatched sections             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 7b — Staged merge (FR21 keystone)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/staged_merge.py                                             │
│  ✓ orchestrator/validate-stage-artifact.py imported by staged_merge.py:38   │
│                                                                             │
│ FILES (R):  pipeline-state/sgs-clone/<run_id>/stage-*.json                  │
│             plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json    │
│                                                                             │
│ FR21 contract: NO mutation outside pipeline-state until autonomy_gate       │
│                approves promotion                                           │
│                                                                             │
│ Wave 2 (7d713ba0): schema validation default-on. Operator must explicitly   │
│   pass --no-schema-validation to skip.                                      │
│                                                                             │
│ STATUS:       LIVE - working; schema validation now default-on              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pre-deploy gate — Apply-module surface + markup validation [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ORDERING NOTE: dispatched in main() AFTER stage_9_report and BEFORE the    │
│ Stage 8 autonomy gate. Placed here (not under Stage 7) to match actual     │
│ execution order — Sonnet + Gemini Flash QC panel finding 2026-05-14.       │
│                                                                             │
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/attribute-staged-apply.py (operator-gated)                  │
│  ✓ orchestrator/functionality-bulk-apply.py (operator-gated)                │
│  ✓ orchestrator/media-sideload.py — dry-run default; auto-fire on clone     │
│  ✓ orchestrator/wp_integration.py — validate_block_markup auto; rest gated  │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4j)                                 │
│                                                                             │
│ FILES (W):  pipeline-state/<run_id>/media-sideload-manifest.json            │
│             pipeline-state/<run_id>/stage-4i.json                           │
│             pipeline-state/<run_id>/stage-4j.json                           │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Steps 4i + 4j complete                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 8 — Deploy + Visual Parity QA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/autonomy_gate.py - decision logic (PASS / FAIL / SURFACE)   │
│  ✓ orchestrator/visual_qa_capture.py - Playwright + PIL pixel-diff factory  │
│  ✓ tools/multi-frame-qa/capture.js                                          │
│  ✓ scripts/screenshot-diff-helper.js                                        │
│  ✓ scripts/mockup-parity-validator.js                                       │
│                                                                             │
│ FILES (R):  pipeline-state/sgs-clone/<run_id>/full-page-markup.html         │
│             sites/<client>/mockups/<page>/index.html                        │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/screenshots/ (PNGs)           │
│             pipeline-state/sgs-clone/<run_id>/stage-8-visual_qa.json        │
│                                                                             │
│ External tools (X): Playwright, WP REST API (sandybrown), SSH/SCP           │
│                                                                             │
│ Hard gate: pixel-diff ≤ 1% at 375/768/1440 viewports — per SECTION via      │
│   --selector. Full-page fallback when no selector.                          │
│ Additional gate (Wave 2): unresolved_slots halts when > 0 open slots.       │
│                                                                             │
│ STATUS (post-Wave1/2 2026-05-21): LIVE - per-section cropped diff + stub    │
│               sentinel + unresolved_slots gate all enforced.                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9 — Coverage + Gap reporting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/leftover-bucket-router.py - 5-bucket router                   │
│  ✓ recogniser/simple_html_review_report.py - operator-review HTML           │
│  ✓ recogniser/attribute-gap-writer.py — WIRED 2026-05-14 (Step 4f)          │
│  ✓ recogniser/functionality-gap-detector.py — WIRED 2026-05-14 (Step 4g)    │
│  ✓ recogniser/gap-review-report.py — WIRED 2026-05-14 (Step 4h)             │
│                                                                             │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/stage-9-coverage.json         │
│             pipeline-state/sgs-clone/<run_id>/operator-review.html          │
│             pipeline-state/sgs-clone/<run_id>/gap-review.md                 │
│                                                                             │
│ DB tables (W):  attribute_gap_candidates (sgs-framework.db)                 │
│                 recognition_log (uimax)                                     │
│                 functionality_gap_candidates (uimax)                        │
│                                                                             │
│ STAGE_2_CONFIDENCE_THRESHOLD = 0.7 named constant.                          │
│ Voter reads slots WHERE scope='section' (4 rows) via DB call.               │
│                                                                             │
│ STATUS (post-Wave2/3 2026-05-21): LIVE - confidence gate enforced           │
│ BUG FIXED 2026-06-07 (`f93db924`): stage-9-coverage.json now emits the     │
│ validator-contract keys (totals/gap_level_totals/total_count) alongside the │
│ leftover_* aliases — autonomy gate was rolling back every deploy on missing  │
│ required fields. Re-clone of page 8: outcome went rolled-back → surface.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bucket vocabulary (Stage 9 reporting)

The 5-bucket `leftover-bucket-router.py` classifier. Vocabulary update 2026-05-23:

| Bucket | Meaning |
|---|---|
| `extraction_failed` | Slot expected by Stage 3 slot_list, no value extracted, AND extraction was architecturally expected |
| `preset_managed` (NEW 2026-05-23) | Slot intentionally NOT extracted — parent block uses a preset/variation mechanism (e.g. hero CTA styling slots when `inheritStyle != 'custom'`). Was previously mis-bucketed as `extraction_failed`. |
| `unmatched_class` | DOM class found in mockup that doesn't resolve to any block/slot via DB lookup |
| `chrome_skip` | Event intentionally skipped (WP admin bar, page-id wrappers) — captured in chrome-skipped.log sidecar |
| `auto_derived` | Slot inferred from BEM convention but not in DB; surfaces as `attribute_gap_candidate` |

### Stage 9b — Autonomy chain (recovery path)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/bucket-c-classifier.py - role inference from property_suffixes│
│  ✓ orchestrator/atomic-block-scaffold.py - 4-file Gutenberg scaffold        │
│                                                                             │
│ FILES (W, staging — FR21):                                                  │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/block.json               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/render.php               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/edit.js                  │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/save.js                  │
│                                                                             │
│ 2026-05-20: _is_chrome_section() detects header/footer/nav at 4 signal     │
│   levels before scaffolding. score_scaffold() quality scoring (0-5).        │
│                                                                             │
│ STATUS:       PARTIALLY LIVE - classifier + scaffold fire; 2 of N rails     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### +REGISTER tail — Pattern registration [LIVE — Rosetta Stone gated]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/register_patterns.py - register_run()                       │
│  ✓ uimax-tools/uimax_write.py — REFACTORED 2026-05-14 (Phase 6 v2 Step 5)  │
│  ✓ uimax-tools/uimax-write-validator.py — Rosetta Stone gate (row 213)      │
│                                                                             │
│ FILES (W):  theme/sgs-theme/patterns/<slug>.php                             │
│ DB tables (W):  patterns (sgs-framework.db), patterns (uimax)               │
│ Skills (X):  /uimax-sgs-scrape-pattern, /uimax-scrape-animation             │
│                                                                             │
│ Q1B (commit c1aa4cc5, 2026-05-23): brand.php + ingredients-section.php      │
│   hand-authored patterns DELETED. Deterministic pipeline must produce these.│
│   Pattern count now 53 (was 55).                                            │
│                                                                             │
│ STATUS:       LIVE - Rosetta Stone gate active; NO licensing gate           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9c — Structured pipeline log surfacing [LIVE — shipped 2026-05-19]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/surface_pipeline_logs.py                                    │
│       summary.log always written; chrome-skipped.log / errors.log /         │
│       warnings.log only when bucket has >=1 entry. Soft-fail wrapped.       │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/<run>/summary.log        (always)                           │
│  pipeline-state/<run>/chrome-skipped.log (conditional)                      │
│  pipeline-state/<run>/errors.log         (conditional)                      │
│  pipeline-state/<run>/warnings.log       (conditional)                      │
│                                                                             │
│ See spec: .claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 10 — Per-page deploy [LIVE — shipped 2026-05-19; inline-CSS injection added 2026-05-25 D70]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/upload_and_patch.py                                         │
│       Fires ONLY when --deploy-target page:<id> or --deploy-target post:<id>│
│       Silent-failure fix (commit 700ff211, 2026-05-23):                     │
│         exit 4 — phantom page; exit 5 — id-mismatch; exit 6 — no-id-in-body│
│                                                                             │
│  SUB-STEPS (in order):                                                      │
│    1. Upload mockup-relative images to WP media library, capture id+url    │
│    2. Patch block_markup: rewrite mockup img paths → WP attachment URLs    │
│    3. Inline-CSS injection (D70, 2026-05-25):                              │
│       Read pipeline-state/<run>/variation-d0-d2.css if present             │
│       Wrap in wp:html block carrying <style id="sgs-cv2-page-css"         │
│         data-page-id="<id>" data-run-id="<run>">…</style>                   │
│       Prepend to block_markup so the page carries its own scoped CSS       │
│       (rules already scoped via .page-id-N → no cross-page leak)           │
│    4. Save pipeline-state/<run>/extract.patched.json                       │
│    5. WP REST PATCH /wp/v2/pages/<id> with the patched content             │
│                                                                             │
│ FILES (W):  pipeline-state/<run>/extract.patched.json                       │
│             WP page/post N (sandybrown) via REST PATCH                       │
│ FILES (R):  pipeline-state/<run>/extract.json                               │
│             pipeline-state/<run>/variation-d0-d2.css (D70)                  │
│                                                                             │
│ DB tables:    none (writes via WP REST API to the live WP DB, not          │
│               sgs-framework.db)                                              │
│                                                                             │
│ CANARY PAGE (updated 2026-05-23): page 144 (/rc-fix-verification-mamas-    │
│   munches/). Page 131 was deleted — DO NOT use page 131.                   │
│                                                                             │
│ STATUS:       LIVE - shipped 2026-05-19; D70 inline-CSS injection 2026-05-25│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 11 — Per-section pixel-diff against deployed page [LIVE — shipped 2026-05-23]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/upload_and_patch.py (post-Stage-10)                         │
│       Parses link= from Stage 10 stdout; runs per-section pixel-diff.       │
│       Fires only when Stage 10 succeeded.                                   │
│                                                                             │
│ FILES (W):  pipeline-state/<run>/stage-11-pixel-diff.json                   │
│             (per-section: selector, viewport, diff_ratio, screenshot_path)  │
│                                                                             │
│ EMPIRICAL PIXEL-DIFF (post-fixes, page 144, 2026-05-23):                   │
│   ingredients 31.9%, featured-product 43.7%, header 44.9%, hero 73.3%,     │
│   gift-section 83.0%, brand 84.0%, trust-bar 84.1%, social-proof 93.4%,    │
│   footer 96.3% — mean 70.5%.                                                │
│                                                                             │
│ RELATIONSHIP TO STAGE 8: Stage 8 diffs locally-rendered HTML (autonomy     │
│   gate). Stage 11 diffs the LIVE DEPLOYED PAGE — catches WP rendering       │
│   differences that Stage 8 can't see.                                       │
│                                                                             │
│ STATUS:       LIVE — shipped 2026-05-23                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 11.5 — Draft-centric fidelity gate (parity2) [LIVE — wired 2026-06-07; D183]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ parity2/ (via sgs-clone-orchestrator.py inline, post-Stage-10)           │
│       clone-parity.js --dump-captures (captures draft + clone at 3vp)      │
│       parity2/*.py: measures content%/layout%/css%/full% per section        │
│       (DRAFT is the 100% denominator — class-agnostic, source-not-target)  │
│                                                                             │
│ FILES (W):  pipeline-state/<run>/parity2-report.json                        │
│             (per-section: content%, layout%, css%, full%;                   │
│              per-class carried/not-carried ledger; sorted worst-layout)     │
│                                                                             │
│ DESIGN PRINCIPLE (memory fidelity-denominator-is-the-source-not-the-target):│
│   Replaces pixel-diff + old clone-parity as the canonical fidelity signal.  │
│   Pairs with Bean R-22-13 visual sign-off — numbers alone don't close.     │
│                                                                             │
│ VIEWPORTS: 375 / 768 / 1440 (all 3 scored per run).                        │
│ GATE MODE: soft-fail — never blocks the autonomy chain.                     │
│ OPT-OUT:   --no-parity2 flag, or when 'node' is unavailable.               │
│                                                                             │
│ STATUS:       LIVE — wired 2026-06-07 commit 553334f3 (D183)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Final acceptance harness [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/critical-fix-verification.py - 4-check FR21 boundary harness│
│       WIRED 2026-05-14 (Phase 6 v2 Step 4k)                                 │
│                                                                             │
│ Checks: no_root_theme_mutation, no_canonical_block_mutation_outside_fr21,   │
│         sgs_update_idempotency, pipeline_state_clean_post_success           │
│                                                                             │
│ FILES (W): pipeline-state/<run_id>/critical-fix-verification.json           │
│ STATUS:       LIVE - Phase 6 v2 Step 4k complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sister pipeline — /sgs-update (11 stages)

Refreshes the data layer; runs OUT-OF-BAND from /sgs-clone.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ENTRY:    /sgs-update command at ~/.claude/commands/sgs-update.md           │
│ DRIVER:   ~/.claude/skills/sgs-wp-engine/scripts/update-db.py               │
│           ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py (query helper)   │
│                                                                             │
│ Stage 1  Inventory      - walks plugins/sgs-blocks/src/blocks/ + theme/     │
│           D107 (2026-05-30): _index_sgs_block_files reads                    │
│           supports.sgs.is_section_root from each block.json and writes      │
│           blocks.tier ('class-section' if true else 'block'). Idempotent.  │
│ Stage 2  Block.json     - parses every block.json; populates                │
│                           block_attributes, block_selectors, block_supports │
│           Script: plugins/sgs-blocks/scripts/generate-block-reference.py    │
│ Stage 3  Signatures     - parses render.php + save.js for output_signature  │
│           Script: behavioural-analyser/extract-signatures.py                │
│ Stage 4  Canonical      - assigns canonical_slot + role + derived_selector  │
│           Script: behavioural-analyser/assign-canonical.py (now wired via   │
│           Stage 1 tail — 2026-05-24 second pass)                            │
│ Stage 5  Compositions   - parses theme/sgs-theme/patterns/*.php             │
│ Stage 6  Token sync     - syncs theme.json categories to design_tokens table│
│ Stage 7  Animation sync - scans sgsAnimation enum values → uimax.animations │
│ Stage 8  uimax mirror   - syncs blocks → uimax.component_libraries          │
│           Script: uimax-tools/sgs-update-uimax-sync.py                      │
│ Stage 9  Drift validator - every attr decomposes into known vocab           │
│ Stage 10 Gap detection  - writes attribute_gap_candidates                   │
│ Stage 11 Doc regen      - regenerates .claude/specs/02-SGS-BLOCKS-REFERENCE │
│                                                                             │
│ MUTEX: /sgs-update + /sgs-clone share the build mutex                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Sibling tools — out-of-band data-layer maintenance (2026-05-30)

These run alongside `/sgs-update` but are NOT part of the canary `/sgs-clone` pipeline. They prepare/maintain the data layer the pipeline consumes.

| Script | Purpose | Status |
|---|---|---|
| `plugins/sgs-blocks/scripts/sync-container-wrapping-blocks.py` | D6 inheritance script. Populates `block_composition.wraps_block`. Emits per-block diff Markdown to `pipeline-state/container-inheritance-sync/<date>/<block>.diff.md`. Operator-review gate (never auto-edits `block.json`). | LIVE — threshold tuning queued at `P-D6-THRESHOLD-RETUNE` |
| `plugins/sgs-blocks/scripts/build-deploy.py` | D3 automated build + deploy helper. | LIVE |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | D110 — D99 port of canonical_slot/role assigner from retired `slot_synonyms` to post-D99 `slots`+`roles` schema. Now wired as `/sgs-update` Stage 1 tail. | LIVE |

---

## Data Sources & Block-Equivalent Layers

### The 2 SQLite databases

| DB | Path | Tables | Touched by |
|----|------|--------|------------|
| **sgs-framework.db** | `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (DUAL — always write both) | 25 | Every clone-pipeline stage (R) + `/sgs-update` (R+W) |
| **uimax.db** | `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | 48 | Stage 9 (W), +REGISTER (W), `/sgs-update` Stage 8 (mirror) |
| **native_wp rows in sgs-framework.db** | same `sgs-framework.db`, filter by `source='native_wp'` (D56, 2026-05-24) | n/a (rows mixed in) | `/wp-blocks` CLI only |

**Canonical schema dump (run this before any "missing column" claim):**

```bash
python ~/.claude/hooks/wp-blocks.py dump
```

### Block-equivalent layers

| Layer | Table / Column | Status |
|-------|---------------|--------|
| Block name | `sgs-framework.blocks.slug` | ✅ 74 SGS blocks (196 total incl. core/wp; verified 2026-06-13 DB — counts drift, `/sgs-db` authoritative) |
| Attribute names | `sgs-framework.block_attributes.attr_name` | ✅ counts drift — query `/sgs-db` (was 2,935 at 2026-06-13) |
| Canonical slot | `sgs-framework.block_attributes.canonical_slot` | ✅ + `slots` (scope='element', 99 rows) |
| Attribute role | `sgs-framework.block_attributes.role` | ✅ |
| Output signature | `sgs-framework.block_attributes.output_signature` | ✅ |
| Equivalent implementations (Rosetta Stone) | `sgs-framework.block_attributes.equivalent_implementations` | ✅ 1630 rows |
| Block supports | `sgs-framework.block_supports` | ✅ 1,160 rows (post-D100 prune) |
| Pattern composition | `sgs-framework.patterns.block_composition` (JSON) | ✅ 35 of 53 patterns |
| Cross-stack components | `uimax.component_libraries` | ✅ 217 rows |
| Recognition log | `uimax.recognition_log` | ✅ Stage 9 W |

---

## Direct file accesses inventory (across the whole pipeline)

| File | Purpose | Stages that touch it |
|------|---------|----------------------|
| `theme/sgs-theme/theme.json` | Base design tokens + global defaults | 0 (R→run_ctx), 0.5 (R) |
| `theme/sgs-theme/styles/<client>.json` | Per-client token overrides | 0 (R→run_ctx), 0.5 (R+W) |
| `theme/sgs-theme/styles/<client>.css` | Stage 0.7 scoped variation CSS (D2 dest.) | 0.7 (W) |
| `theme/sgs-theme/patterns/<slug>.php` | Registered pattern markup | +REGISTER (W) |
| `plugins/sgs-blocks/src/blocks/<slug>/block.json` | Block schema | 2 (R), 3 (R), 5 (R), 6 (R) |
| `sites/<client>/mockups/<page>/index.html` | Input mockup | 0.1 (R), 0.5 (R), 0.7 (R), 1 (R), 4 (R), 8 (R) |
| `sites/<client>/research/<client>-media-map.json` | mockup → WP attachment ID | 4 (R) |
| `pipeline-state/sgs-clone/<run_id>/stage-*.json` | Per-stage artefacts | 0-9 (W), 7b (R) |
| `pipeline-state/sgs-clone/<run_id>/css-d1-assignments.json` | D1 attr-lift sidecar | 0.7 (W), 4 (R) |
| `C:/Users/Bean/.openclaw/.env` | WP credentials | 8 (R), media-sideload (R) |
| `C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db` | Authoritative SGS DB | many (R+W) |
| `C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | uimax DB | 9 (W), +REGISTER (W) |

---

## DB table heat-map

### Stage-to-tables matrix

| Stage | sgs-framework.db | uimax |
|---|---|---|
| 0 | -- | -- |
| 0.1 | -- | naming_conventions (reference) |
| 0.5 | -- (reads theme.json directly) | -- |
| 1 | blocks.tier (R, D107), block_composition (R, D108 — data layer LIVE, walker consumption DEFERRED), slots scope='element'/'section' (R, D111), roles (R, D99) | naming_conventions (reference) |
| 2 | blocks (R via filesystem) | -- |
| 3 | block_attributes (R: canonical_slot, role, derived_selector) | -- |
| 4 | block_attributes (R: canonical_slot, output_signature) | -- |
| 4 (Wave 3 D3) | attribute_gap_candidates (W: unlifted CSS props) | -- |
| 4.5 | design_tokens (R via theme.json) | -- |
| 5 | block_supports (R) | -- |
| 9 | attribute_gap_candidates (W) | recognition_log (W), functionality_gap_candidates (W) |
| +REGISTER | patterns (W) — includes `block_composition` JSON column | patterns (W), component_libraries (R+W) |
| /sgs-update S1 | blocks, block_attributes, block_supports, block_selectors, design_tokens, style_variations, patterns, theme_parts, hooks, and others (all W) | -- |

**DEAD tables (zero rows — retirement candidates):**
`sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` (all in sgs-framework.db).

**Retired tables (no longer in schema):** `legacy_role_lookup` and `slot_synonyms` — both unified into the `slots` table (D99). Use `slots WHERE scope='element'` (99 rows) and `slots WHERE scope='section'` (4 rows). The old `role_classification` column is now the `roles` table (21 rows).

### sgs-framework.db key tables

| Table | Rows | Pipeline use |
|---|---|---|
| block_attributes | counts drift — `/sgs-db` authoritative (was 2,935 at 2026-06-13; was 2,739 post-WS-4 2026-06-04) | Stages 3+4 R; cv2 D3 W. D110 backfill (historical): canonical_slot 659 (31.8%), role 676 (32.6%) |
| blocks | 74 SGS (+ 122 core/wp = 196; verified 2026-06-13 DB — counts drift, `/sgs-db` authoritative) | Stage 2 cross-check; /sgs-update S3 uimax sync. `tier` column (D107) — 2 rows class-section |
| block_composition (D108/D152/D167) | 197 (post-D152; +content-collection D167 = 29-block container roster) | Data layer LIVE for Stage 1 queries; `container_kind` column added D152 (values `section|layout|content`; 29-block container roster post-D167: 4 section / 14 layout / 11 content; modal + mobile-nav excluded); walker consumption code REVERTED — P-XS-3-TRIGGER-REFINEMENT. Schema: block_slug PK, wraps_block, composition_role enum, has_inner_blocks, accepts_allowed_blocks, container_kind |
| slots | 99 element + 4 section = 103 | Stage 1 R via db_lookup |
| roles | 21 (20 base + scalar-media) | Stage 1 R; walker resolution |
| block_supports | 1,160 (post-D100 prune) | Stage 5 supports_writer R |
| block_capabilities (D99 wired as FR-22-15) | 88 | Walker capability-aware BEM tiebreaker |
| property_suffixes | 124 rows post-D222 (+ `kind_override` column, 17 populated per D99; `align-items` has TWO rows — `VerticalAlign` + `AlignItems` added D222 migration) | assign-canonical; cv2 db_lookup.attr_for_layer_property() |
| patterns | 47 | Stage 2 confidence boost; +REGISTER W |
| attribute_gap_candidates | 107+ | Stage 9 W; D3 emission W (Wave 3) |

**Removed from schema:** `slot_synonyms` and `legacy_role_lookup` — use `slots` table instead. `role_classification` → `roles` table.

---

## Skill dispatch chain (when fully wired)

| Pipeline stage | Commands / skills |
|---|---|
| Pre-clone (mockup prep) | `/uimax-scrape`, `/uimax-mood-board`, `/uimax-classify-naming` |
| Stage 0 pre-flight | `/sgs-clone`, `/sgs-wp-engine` |
| Stage 1-2 boundary+match | `/sgs-clone`, `/uimax-classify-naming` (heuristic in-module; full dispatch deferred), `/wp-blocks match` |
| Stage 3-5 slot/extract | `/sgs-clone`, `/chrome-devtools-cli`, `/playwright` (fallbacks) |
| Stage 6-7 classify+compose | `/sgs-clone`, `/ui-ux-pro-max` (judgement) |
| Stage 7 emit | `/sgs-clone`, `/wp-blocks validate` |
| Stage 9c structured logs | `/sgs-clone` (wires surface_pipeline_logs.py) |
| Stage 10 per-page deploy | `/sgs-clone --deploy-target page:<id>` |
| +REGISTER | `/uimax-sgs-scrape-pattern`, `/uimax-scrape-animation` |
| Sister pipeline | `/sgs-update`, `/sgs-db` |
| Framework deploy | `/wp-sgs-deploy <plugin\|theme\|both>` |
| Cross-cutting | `/sgs-db`, `/wp-blocks`, `/wp-hooks`, `/wp-hook-graph`, `/wp-pre-merge-gate` |

Per-command/skill notes (key ones):
- **`/sgs-clone`** — `--converter-v2` default TRUE (Wave 1). Non-SGS-BEM halt.
- **`/wp-blocks`** — `dump` subcommand covers all 3 DBs in ~1500 tokens (binding rule #4).
- **`/wp-sgs-deploy`** — FRAMEWORK deploy; absorbed `/deploy-check`. Scored 96%.
- **`/wp-pre-merge-gate`** — wraps `/wp-blocks health` + `/wp-hooks validate` + `/wp-hook-graph validate`.
- **`/visual-qa`** — SIBLING (NOT in /sgs-clone path). Operator-invoked 9-layer audit.

---

## Phase 2A Recogniser Targets (2026-05-20)

Three new SGS-BEM selectors land in main and become valid recogniser match targets for the Stage 3+ slot-aware DOM walker:

| Recogniser target selector | Source block | Notes |
|----------------------------|--------------|-------|
| `.sgs-responsive-logo` (+ `__picture`, `__image--desktop/tablet/mobile`, `__svg`, `__link`, `--animate-*`, `.is-animating`/`.is-animated`) | `sgs/responsive-logo` | 3-slot logo with picture-element breakpoint swap. Falls back to core site-logo when no slots set. |
| `.sgs-icon` (+ `__link`, `__svg`, `__emoji`, `__dashicon`, `--source-{lucide,wp-icon,dashicon,emoji}`, `--size-*`) | `sgs/icon` | Multi-source icon (Lucide / WP / Dashicon / emoji). |
| `.sgs-timeline` (+ `--vertical/horizontal`, `--align-*`, `__entry`, `__date`, `__node`, `__content`, `__title`, `__description`, `__image`, `__connector`, `.is-revealed`) | `sgs/timeline` | Date-based timeline; semantic ol/li/time markup. |

Plus header behaviour wrapper hook:

| Selector | Note |
|----------|------|
| `body.sgs-has-header` | Always present when ANY header rule matches (stable recogniser hook). |
| `body.sgs-has-header-behaviour` | Present when active rule has a behaviour. |
| `body.sgs-header-behaviour-{transparent,sticky,hide-on-scroll-down}` | Specific behaviour modifier. |

The Phase 2A pricing-table additions (Branch E) also extend the recogniser surface: `__icon`, `__ribbon`, `__savings-badge`, `__feature--included`, `__feature--excluded`.

**Next session recogniser work:** run `/sgs-update` to sync `sgs-framework.db` with the new blocks (responsive-logo, icon multi-source, timeline) + the new attributes on pricing-table. Then ensure `tools/recogniser/` matches a draft mockup carrying any of these SGS-BEM selectors directly to the corresponding SGS block.

---

## Script inventory (key scripts)

### Converter v2 (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/`)

| Script | Status |
|---|---|
| `__init__.py` | LIVE — Public API: `convert_section()` + `convert_page()` |
| `convert.py` | LIVE — Slot-aware DOM-to-WP-blocks converter |
| `convert_page.py` | LIVE — Page-level wrapper, `--mode pipeline` CLI |
| `db_lookup.py` | LIVE — `attr_for_layer_property(slug, layer, css_prop)` (D201/D222 name-free router) + `css_property_suffixes()` (124 rows) + `breakpoint_suffix_rules()` + `block_supports_for()` + `legacy_role_lookup_for()` |

### Conformance gates (D195, wired 2026-06-09)

**CRITICAL (D222 lesson): TWO separate conformance suites — both must be green on every converter commit.**

| Gate | Script | What it tests | Wired to |
|------|--------|---------------|----------|
| **Gate A** | `scripts/tests/test_converter_conformance.py` | 43 golden fixtures (29 DB-derived container-mirror composites + precedence-collision + real Mama's trust-bar) + 2 DB invariants | `.git/hooks/pre-commit` (local hook — honest enforcement floor; NO CI in repo) |
| **Gate B** | `scripts/check-hardcoded-render-defaults.js` | Net-new F3 hardcodes (baseline 11 honest debt entries) | `prebuild` + `prestart` npm scripts |

`converter_v2/tests/` — 26 unit tests; separate scope. A passing run here does NOT guarantee Gate A passes.

### Live pipeline core (`plugins/sgs-blocks/scripts/orchestrator/`)

| Script | Status | Wired |
|---|---|---|
| sgs-clone-orchestrator.py | CURRENT | YES (entry point) |
| preflight_chain.py | CURRENT | YES |
| staged_merge.py | CURRENT | YES |
| autonomy_gate.py | CURRENT | YES |
| visual_qa_capture.py | CURRENT | YES |
| token_resolver.py | CURRENT | YES |
| variation_router.py | CURRENT | YES |
| supports_writer.py | CURRENT | YES |
| stage1_boundary_hook.py | CURRENT | YES |
| lingua_franca.py | CURRENT | YES (transitive) |
| surface_pipeline_logs.py | CURRENT | YES |
| upload_and_patch.py | CURRENT | YES (opt-in via --deploy-target) |
| css_router.py | CURRENT | YES |
| essence_match_detector.py | CURRENT | YES (infrastructure) |

### Legacy (unreachable after Wave 1, 2026-05-21)

| Script | Status |
|---|---|
| tools/recogniser-v2/extract.py | UNREACHABLE — subprocess block removed Wave 1 |
| tools/recogniser-v2/extract_strategies.py | UNREACHABLE |
| tools/recogniser-v2/overrides/hero.py | TO-RETIRE |

---

## Status summary

| Aspect | Count |
|--------|-------|
| Pipeline stages defined | 11 + 4 tails (0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 4.5, 5, 6, 7, 7b, 8, 9, 9b, 9c, 10, 11 + PRE-DEPLOY/REGISTER/UPDATE + final acceptance) |
| Pipeline stages LIVE | 19 |
| Pipeline stages PARTIAL | 2 (Stage 9b autonomy chain; +REGISTER validator bypass) |
| Scripts catalogued | 107+ |

---

## 2026-05-20 architectural changes

### Four-destination router (Stage 0.7)
- NEW module: `css_router.py` (~661 LOC)
- D0=global/reset, D1=typed-attr-lift+token-snap, D2=wrapper-CSS scoped `.page-id-N`, D3=gap-candidate DB + D2 fallback
- NEW artefact: `pipeline-state/<run>/css-d1-assignments.json`

### Known gaps blocking ≤ 1% pixel-diff target (per honest-path council 2026-05-20)

- **G1** — cv2 self-closing `wp:sgs/hero` emit → InnerBlocks (CTAs) never serialise. ~50pp of hero's gap.
- **G2** — `.page-id-N` scope breaks cv2's CSS lookup (FIXED 2026-05-21 via `affca3f1`).
- **G3** — Stage 3 slot resolver only reads text content → 142 of hero's 171 slots return empty.
- **G4** — Pixel-diff chrome inflation (DISCARDED 2026-05-21 — `el.screenshot()` already clips to element bbox).
- **G5** — Per-block DOM-shape mismatches (`<blockquote>` vs `<section>`; mockup-grid vs render-carousel).
- **F5** — D1 media-field flow: responsive variants stored but not routed to `<attr>Mobile/Tablet/Desktop` attrs.

G1+G3+G5 are manifestations of one gap: cv2 doesn't walk all classes + assign CSS ownership via the DB tables that exist. **Spec 22 is the canonical fix-shape** — single universal walker, exactly 3 permitted exceptions, DB-driven recognition. See `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §2-§3 for the structural architecture.

---

## Gaps + optimisation opportunities

### Architectural debt (not blocking)

1. **Stage 0.7 CSS lift** — four-destination router active (Spec 22 §FR-22-5). D3/D2 split still evolving.
2. **Stage 2 has no pattern-level matcher** — sections matching pattern slugs fall to normal route. Tracked: Phase 1 of strategic-plan.
3. **5 dead DB tables** — `sections_detected`, `extraction_cache`, `block_opportunities`, `weaknesses`, `animations` — retire or remove from schema.
4. **ARRAY_LIFT_PATTERNS hardcoded dict** — `count_stars` + multi-selector fallback not yet migrated to universal 1e-B path. Tracked: `P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION`.

### Optimisation opportunities

5. **Per-section subprocess overhead** at Stage 4 — could batch via single extract.py invocation.
