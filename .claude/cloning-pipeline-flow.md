---
doc_type: visual-reference
project: small-giants-wp
purpose: Annotated one-page visual flow of the SGS Cloning Pipeline. Every stage shows scripts that run, files read/written, DB tables touched, skills dispatched, and wiring status. Use this as the cold-start map. Also serves as the single canonical implementation reference — per-script inventory, per-skill/command inventory, and per-table R/W matrix are ALL absorbed here (2026-05-21).
session_date: 2026-05-13
last_annotated: 2026-05-21 (post wave-cleanup absorption: tooling-map + skills-commands-map + db-tables-map folded in; wave 1-3 post-cleanup status lines added)
last_consolidated: 2026-05-21
line_number_policy: Line numbers cited in this doc are accurate as of 2026-05-13 against `sgs-clone-orchestrator.py` HEAD (1277 lines). If they drift after edits, grep for the function or constant name instead.
qc_consensus: 4 reviewers agree on all wiring-status claims. Material errors patched 2026-05-13.
last_verified: 2026-05-21
debug_trace_addendum: |
  2026-05-18: `--debug-trace` CLI flag added to sgs-clone-orchestrator.py.
  When ON, every cv2-eligible section dispatches with a per-section Trace
  bound (Trace.for_boundary(run_dir, boundary_id)) AND an expected-rules
  baseline written (expected_rules.write_baseline) alongside the existing
  cv2 dispatch. Output files: pipeline-state/<run>/convert-trace-<safe-
  boundary>.jsonl (walker_branch_taken / attr_skipped / db_lookup_miss
  events) + pipeline-state/<run>/expected-rules-<safe-boundary>.jsonl
  (every CSS rule selecting into the section subtree, @media-aware). OFF
  in production register-tail runs; ON during Phase 9 walkdown debugging.
  Pixel-diff at the end now consumes both via --expected-rules + --extracted-
  attrs paired flags → diff.json gets an `attribute_coverage` block alongside
  `mismatch_percent`. Suffix-anchored match via property_suffixes DB (117
  rows): key.endswith(suffix) OR key.endswith(suffix + breakpoint_tail).
update_triggers:
  - Pipeline stage change (new stage, retired stage, renumbered)
  - Script wired or unwired (status flip in any stage block)
  - DB schema change affecting any pipeline stage
  - Skill dispatch change at any stage
  - Inline-function extraction (e.g. stage_0_7_css_lift retired - remove its stage block)
spec_16_status: |
  LIVE as of 2026-05-15. Spec 16 converter v2 promoted from .claude/scratch/
  converter-prototype/ to plugins/sgs-blocks/scripts/orchestrator/converter_v2/
  on feat/spec-16-converter-v2-rollout (commits 06eca194 + 19c89f0f, pushed
  not merged). `sgs-clone-orchestrator.py --converter-v2` flag DEFAULT FLIPPED
  TO TRUE on 2026-05-21 (Wave 1 cleanup, commit ee8db653). Legacy extract.py
  subprocess block (~120 lines) retired from orchestrator — non-SGS-BEM
  sections now mark status=unmatched-non-bem-compliant and emit operator-
  actionable warning. tools/recogniser-v2/extract.py + extract_strategies.py +
  overrides/hero.py REMAIN ON DISK (unreachable from orchestrator); physical
  deletion deferred to next session after universal-extraction verification.
phase_8_status: |
  Phase 8 (section-by-section pixel-diff closure) begins next session.
  Closure unit is the SECTION (cropped diff via --selector), not the page.
  Read pipeline-state/<run>/leftover-buckets.json BEFORE any converter-
  quality conjecture — orchestrator already classifies every gap. See
  feedback_read_leftover_buckets_before_conjecturing.md + blub.db row 254.
registry_entry: docs-registry.yaml canonical_docs (cloning-pipeline-flow.md)
absorbed_docs:
  - .claude/tooling-map.md - ABSORBED 2026-05-21 → see "Script inventory" section below
  - .claude/skills-commands-map.md - ABSORBED 2026-05-21 → see "Skill dispatch chain" section below
  - .claude/db-tables-map.md - ABSORBED 2026-05-21 → see "DB heat-map (full)" section below
  - Each original file replaced with a redirect stub for git-blame continuity.
companion_docs:
  - .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md - SINGLE end-goal spec (Spec 15 absorbed into §12 on 2026-05-21)
  - .claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md - ABSORBED 2026-05-21 → see Spec 16 §12 Appendix A; file retained for historical reference only
  - .claude/docs-registry.yaml - authoritative project-tracked docs list (trimmed 2026-05-21 to 17 essential entries; .md sibling retired same date)
---

# SGS Cloning Pipeline - Annotated Flow

## Table of Contents

- [Truth-doc structure](#truth-doc-structure-post-2026-05-21-consolidation)
- [Legend](#legend)
- [Live entry-point chain](#live-entry-point-chain-verified-2026-05-13)
- [Per-stage annotated flow](#per-stage-annotated-flow) — Stages 0 / 0.1 / 0.5 / 0.7 / 0.8 / 1 / 2 / 3 / 4 / 4.5 / 5 / 6 / 7 / 7b / pre-deploy gate / 8 / 9 / 9b / 9c / +REGISTER / final acceptance
- [Sister pipeline — /sgs-update (11 stages)](#sister-pipeline--sgs-update-11-stages)
- [**Data Sources & Block-Equivalent Layers**](#data-sources--block-equivalent-layers) — the 2 DBs + 6 translation layers
- [Direct file accesses inventory](#direct-file-accesses-inventory-across-the-whole-pipeline)
- [DB table heat-map](#db-table-heat-map)
- [Skill dispatch chain](#skill-dispatch-chain-when-fully-wired)
- [Status summary](#status-summary)
- [Gaps + optimisation opportunities](#gaps--optimisation-opportunities-surfaced-by-this-annotation)
- [Pattern-key tracking](#pattern-key-tracking)
- [See also](#see-also)
- [Phase 2A Recogniser Targets](#phase-2a-recogniser-targets-2026-05-20)
- [Script inventory (absorbed from tooling-map.md)](#script-inventory-absorbed-from-tooling-mapmd-2026-05-21)
- [Skill dispatch chain (full) (absorbed from skills-commands-map.md)](#skill-dispatch-chain-full-absorbed-from-skills-commands-mapmd-2026-05-21)
- [DB heat-map (full) (absorbed from db-tables-map.md)](#db-heat-map-full-absorbed-from-db-tables-mapmd-2026-05-21)

## Truth-doc structure (post-2026-05-21 consolidation)

Two documents own the entire pipeline knowledge surface:

| Doc | Role | Location |
|-----|------|----------|
| **This file** (`cloning-pipeline-flow.md`) | **Single implementation reference** — per-stage scripts/files/DB/skills/status + per-script inventory + per-skill/command catalogue + DB R/W heat-map | `.claude/cloning-pipeline-flow.md` |
| **Spec 16** | **Single end-goal spec** — full pipeline architecture (Stages 0-9 + L0-L3 layers + canonical vocabularies + /sgs-update + QA gates). Spec 15 absorbed into §12 Appendix A. | `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` |

**What was absorbed on 2026-05-21:**
- `tooling-map.md` (520 lines) → "Script inventory" section at the bottom of this doc
- `skills-commands-map.md` (459 lines) → "Skill dispatch chain (full)" section
- `db-tables-map.md` (926 lines) → "DB heat-map (full)" section
- `specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (918 lines) → Spec 16 §12 Appendix A

All four original files now contain absorption markers in their frontmatter / are replaced with redirect stubs. The pipeline knowledge surface is now **two documents total**: this implementation-state doc + Spec 16.

---

The big picture in one page, with EVERY script, file, DB table and skill plotted on the chart. Use this to spot gaps, weaknesses and optimisation opportunities at a glance.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | Wired into the live `/sgs-clone` path |
| ✗ | Built + tested but NOT wired into `/sgs-clone` |
| ⚠ | Wired but with caveat (e.g. bypasses validator, partial coverage) |
| ◯ | Fallback only (fires on unmatched section / error path) |
| [B] | Known bug |
| (R) | Reads file or DB table |
| (W) | Writes file or DB table |
| (X) | Dispatches skill or external tool |

## Live entry-point chain (verified 2026-05-13)

```
1.  /sgs-clone command
       ↓ invokes
2.  plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py        ✓ ENTRY POINT
       ↓ runs stages 0.1 → 9 inline + via subprocess
       ↓ then imports
3.  plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py  ✓
       ↓ loads
       ├─ staged_output.py         ✓
       ├─ preflight_chain.py       ✓
       ├─ staged_merge.py          ✓
       └─ autonomy_gate.py         ✓
       ↓ on success
4.  plugins/sgs-blocks/scripts/orchestrator/register_patterns.py ✓ +REGISTER tail
```

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
│ DB tables:    none                                                          │
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
│       NOT via preflight_chain.run_precommit_gate as previously claimed -    │
│       run_precommit_gate exists in preflight_chain.py:155 but is only one   │
│       of two call paths; the live /sgs-clone path uses the direct wrapper.  │
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
│                                                                             │
│ NOTE: This is the role that /sgs-clone SKILL.md previously called           │
│       `validate-naming.py` (a planned filename that never shipped).         │
│       SKILL.md updated 2026-05-13 to point at bem-lint.py.                  │
│                                                                             │
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
│       imported by token-lint.py at line 91 (this is the LIVE binding       │
│       for match.py - NOT via token_resolver as previously claimed)          │
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
│                                                                             │
│ STATUS:       LIVE - working                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 0.7 — CSS lift (writes client variation CSS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ⚠ INLINE in sgs-clone-orchestrator.py (no dedicated module)                │
│       function: stage_0_7_css_lift() around line 253                        │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html (extracts <style> blocks)         │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/styles/<client>.css (monolithic CSS dump)                  │
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│                                                                             │
│ WEAKNESS: Stage 0.7 isn't in Spec 15 §7 stage list (was added during        │
│           Phase 5h.1 commit 3dce6084 without spec entry). Dumps ALL CSS     │
│           into one variation file instead of splitting universal /          │
│           per-instance / bespoke per the captured                            │
│           feedback_cloning_preserves_intentional_bespoke_detail rule.       │
│           Tracked as architecture debt; not a Phase 6 blocker.              │
│                                                                             │
│ STATUS:       LIVE - working but wrong-architecture                         │
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
│                                                                             │
│ HOW: Scans CSS rule set for selectors matching SGS-BEM block-root regex     │
│      `^\.sgs-[a-z][a-z0-9]*(-[a-z0-9]+)*$` (segmented kebab; rejects        │
│      `__element` and `--modifier` shapes). Clusters max-width declarations  │
│      → smallest cluster centre = contentSize candidate; largest = wideSize. │
│      Falls back silently when fewer than 1 distinct usable width found.     │
│      Seeds `_LIFT_CONTEXT["theme_widths"]` so Stage 4 widthMode lift can    │
│      compare lifted max-widths against ±5% tolerance.                       │
│                                                                             │
│ CLI:          convert.py … --client-slug=<slug>                             │
│ INVARIANT:    Universal-benefit — works for any client whose mockup CSS     │
│               follows SGS-BEM naming. Zero client-specific literals.        │
│                                                                             │
│ STATUS:       LIVE (Branch B 2026-05-18)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1 — Section boundary detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py    │
│       subprocess-called from sgs-clone-orchestrator.py at line 536          │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py          │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4e) - lazy-loaded via                │
│       stage1_boundary_hook() helper. After voter.json is parsed, the        │
│       hook calls enrich_stage1_payload(output) which adds                   │
│       source_convention + primary_sgs_bem + equivalent_implementations +    │
│       gap_candidate_classes + lingua_franca_skipped to every boundary.      │
│       voter.json is then rewritten with the enriched payload so Stage 2    │
│       and Stage 4 see the enriched data via the existing file read.        │
│       Bean-controlled SGS-BEM drafts hit the fast path (skipped=True).      │
│       Soft-fails to original output.                                        │
│  ✓ plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py                 │
│       WIRED 2026-05-14 (transitively via stage1_boundary_hook module       │
│       import). Handles BEM, Tailwind, kebab-semantic, Bootstrap, SGS WP    │
│       conventions; preserves source-convention names in                    │
│       equivalent_implementations per Rosetta Stone discipline.              │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/voter.json (rewritten post-enrichment)   │
│  pipeline-state/sgs-clone/<run_id>/stage-1.json                             │
│                                                                             │
│ DB tables (R):  slot_synonyms (sgs-framework.db)                            │
│ DB tables (W):  none at this stage                                          │
│                                                                             │
│ Skills (X):                                                                 │
│  ✗ /uimax-classify-naming - higher-quality classifier; current dispatch    │
│       uses the heuristic classifier shipped inside stage1_boundary_hook.    │
│       Production swap requires injecting a /uimax-classify-naming-backed    │
│       callable as the `classifier` kwarg (deferred).                        │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4e complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 2 — Block-type match

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py               │
│       imported directly (not subprocess) by sgs-clone-orchestrator.py:514  │
│       function score_candidates() ranks each section's candidate blocks     │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (filesystem scan for       │
│       registered block existence verification)                              │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-2.json                             │
│                                                                             │
│ DB tables (R):  blocks (sgs-framework.db, indirectly via filesystem scan)   │
│ DB tables (W):  none                                                        │
│                                                                             │
│ Skills (X):     none                                                        │
│                                                                             │
│ GAP: Matches at BLOCK level only - no PATTERN-level matcher consulting      │
│      patterns table or block_compositions before falling through. For       │
│      Mama's: 6 of 9 sections return core/group (no match) and fall to      │
│      Stage 9b autonomy fallback.                                            │
│                                                                             │
│ STATUS:       LIVE - working but missing pattern-level lookup                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 3 — Slot list (per matched block)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE stage_3_slot_list() function in sgs-clone-orchestrator.py         │
│       (CORRECTED 2026-05-13 via Sonnet QC: previously claimed extract.py    │
│       subprocess at line 715 - that's actually Stage 4's extract call.      │
│       Stage 3 reads block.json directly in Python, no subprocess.)          │
│       This is one of the inline functions that should be extracted to its   │
│       own module per Bean's "deterministic not inline" architectural rule.  │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (attribute definitions)    │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, derived_selector)   │
│                  - populated by /sgs-update Stage 4 (assign-canonical.py)   │
│                                                                             │
│ FILES (W):  pipeline-state/sgs-clone/<run_id>/stage-3-slot_list.json        │
│                                                                             │
│ Wave 3 (2026-05-21, e60fe58e): stage_3_slot_list() now annotates each slot  │
│   with canonical_source: 'db' | 'auto-derived'. slot_canonicalisation_gap:  │
│   true on auto-derived slots. Mama's run: 81.4% DB-canonical, 18.6% gap.   │
│                                                                             │
│ STATUS (pre-Wave3): LIVE - working but inline (extract-to-module candidate) │
│ STATUS (post-Wave3 2026-05-21): LIVE - DB canonical_slot lookup active;     │
│               gap annotation signals operator what needs assign-canonical.  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4 — Slot extraction (the work happens here)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✗ tools/recogniser-v2/extract.py - UNREACHABLE from orchestrator           │
│       Wave 1 (2026-05-21, ee8db653): legacy subprocess block removed.       │
│       File remains on disk; physical deletion deferred to next session.     │
│  ✗ tools/recogniser-v2/extract_strategies.py - UNREACHABLE (same)           │
│  ✗ tools/recogniser-v2/overrides/__init__.py - UNREACHABLE (same)           │
│  ✗ tools/recogniser-v2/overrides/hero.py - UNREACHABLE (same)               │
│  ✗ tools/recogniser-v2/data/role-templates.json - no longer consulted       │
│       cv2 path reads property_suffixes via db_lookup.css_property_suffixes()│
│  ✓ converter_v2/convert.py - NOW THE PRIMARY SLOT EXTRACTION ENGINE         │
│       --converter-v2 default flipped True (Wave 1 2026-05-21).              │
│  ✓ orchestrator/modifier_extractors.py - button_role/dynamic_link/variation │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4d) - lazy-loaded via               │
│       modifier_extractors() helper. In the per-section loop after the      │
│       supports_writer dispatch: button_role fires when target_block name   │
│       contains 'button'; dynamic_link parses every section_attr value      │
│       starting with ':' (only successful parses retained); match_block_    │
│       variation fires when block.json declares `variations`. Outputs land  │
│       on per_section_results.modifier_signals (keys: button_role,          │
│       dynamic_links, block_variation). Each dispatch soft-fails            │
│       independently.                                                       │
│                                                                             │
│ FILES (R):                                                                  │
│  sites/<client>/mockups/<page>/index.html                                   │
│  sites/<client>/research/<client>-media-map.json (mockup → WP attachment)   │
│  tools/recogniser-v2/data/role-templates.json                               │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json (per section) │
│  pipeline-state/sgs-clone/<run_id>/stage-4-extract.json                     │
│                                                                             │
│ DB tables (R):  block_attributes (canonical_slot, role, output_signature)   │
│                                                                             │
│ External tools: Playwright (computed-style extraction at 3 viewports)       │
│                                                                             │
│ STATUS (pre-Wave1): LIVE for hero (42% coverage); partial for atomic blocks  │
│ STATUS (post-Wave1 2026-05-21): cv2 is the ONLY path. Legacy extract.py     │
│               unreachable. Non-SGS-BEM boundaries halt with operator note.  │
│               D3 gap-candidate emission wired (Wave 3, e60fe58e): every     │
│               unlifted CSS property now surfaces as attribute_gap_candidate. │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 4.5 — Token snapping (per value) [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/token_resolver.py - resolve() + resolve_batch()             │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4a) - lazy-loaded via              │
│       sgs-clone-orchestrator.py:token_resolver() helper, called per         │
│       matched section in stage_4_5_6_7_8_extract loop. Snaps raw values    │
│       to token_slug when confidence >= 0.6; gap candidates surface in       │
│       per_section_results.token_resolutions. 8 pytest tests still green.    │
│  ✓ orchestrator/variation_router.py - add_token() writes new tokens to      │
│       client variation JSON; hard-blocked from root theme.json mutation     │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4b) - lazy-loaded via              │
│       variation_router() helper. Inside the existing token_resolver soft-  │
│       fail block in stage_4_5_6_7_8_extract: every is_gap_candidate=true   │
│       resolution with a recognised role + non-empty string raw_value is    │
│       routed through add_token(client, role, slug, raw_value, write=True). │
│       Slug derived via token-lint._generate_slug (single canonical helper).│
│       (role, slug) tuples appended to per_section_results.new_tokens_       │
│       written. Soft-fail emits aggregate_warnings; never blocks extract.    │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/match.py - the snap engine      │
│       (wired here via token_resolver + ALSO at Stage 0.5 via token-lint)   │
│  ✓ plugins/sgs-blocks/scripts/lints/token-lint.py - canonical slug gen     │
│       loaded lazily for _generate_slug() only (Phase 6 v2 Step 4b).         │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json                                                 │
│  theme/sgs-theme/styles/<client>.json (overlay merged into theme_json)     │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/styles/<client>.json (new token candidates, idempotent)    │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4a+4b complete                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 5 — Default-inheritance check [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ plugins/sgs-blocks/scripts/value-matcher/inheritance.py - lookup func   │
│       WIRED transitively 2026-05-14 (Phase 6 v2 Step 4c) via                │
│       supports_writer.py's optional import. inheritance.py loads if the     │
│       file exists; supports_writer falls back to its self-contained         │
│       default lookup otherwise.                                             │
│  ✓ orchestrator/supports_writer.py - filter_writes() omit-vs-emit           │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4c) - lazy-loaded via               │
│       sgs-clone-orchestrator.py:supports_writer() helper. Inside the        │
│       per-section loop after the variation_router dispatch: loads the       │
│       target block's block.json by slug, calls filter_writes(block_slug,   │
│       section_attrs, block_json, theme_json) and lands three fields on     │
│       per_section_results -- supports_decisions (debug trail),             │
│       supports_emitted_attributes (writes downstream must include),         │
│       supports_omitted_attributes (let WP cascade handle). Step 4i           │
│       staged-apply + Step 4j wp_integration consume these signals to        │
│       strip cascade-matching overrides at deploy time. Soft-fail on          │
│       missing block.json -- absence == emit everything.                     │
│                                                                             │
│ FILES (R):                                                                  │
│  theme/sgs-theme/theme.json (styles.elements.X + styles.blocks.X defaults)  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (supports declarations)    │
│                                                                             │
│ DB tables (R):  block_supports                                              │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4c complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 6 — Block.json emission

**Spec 17 framework pattern targets (added 2026-05-19):** the `/sgs-clone` Stage 6
(cv2 emission) can now target the 9 framework header/footer patterns shipped in Spec 17
(`sgs/framework-header-{default,sticky,transparent,shrink,minimal,centred}` +
`sgs/framework-footer-{default,compact,informational}`) instead of always generating
bespoke header/footer markup. When a captured header/footer mockup substantially matches
one of these patterns, the converter emits
`<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->` and routes the differences
(logo file, social links, copyright text) through `sgs/site-info` block bindings to the
central Site Info store. Spec 16 §7 Stage 6 needs an extension to recognise the match;
tracked as a follow-up.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ INLINE in sgs-clone-orchestrator.py / extract.py serialize_block()       │
│                                                                             │
│ FILES (R):                                                                  │
│  plugins/sgs-blocks/src/blocks/<slug>/block.json (schema validation)        │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-<boundary_id>.json (markup field)│
│                                                                             │
│ DB tables:    none                                                          │
│ Skills:       none                                                          │
│                                                                             │
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
│       confidence == 0 (which it does for 6 of 9 Mama's sections). Emits a   │
│       flat wp:sgs/container with bare atomic blocks, NO BEM child wrappers. │
│  (Stage 4i + 4j apply-module surface + wp_integration validate moved      │
│   2026-05-14 QC panel — see "Pre-deploy gate" block below; the orchestrator│
│   dispatches them in main() AFTER stage_9_report, not inside Stage 7.)     │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/extract-*.json (per-section results)     │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/full-page-markup.html                    │
│  pipeline-state/sgs-clone/<run_id>/stage-7-compose.json                     │
│                                                                             │
│ GAP: The composer fallback emits text-only blocks for unmatched sections.   │
│      Real fix is to wire the autonomy chain (Stage 9b) so unmatched         │
│      sections trigger new-block scaffolding instead of flat composition.    │
│                                                                             │
│ STATUS:       LIVE for matched; FALLBACK for 6/9 Mama's sections            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 7b — Staged merge (FR21 keystone)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/staged_merge.py - walks every stage-N artefact,             │
│       validates schema, invokes per-stage apply callable, rolls back on    │
│       failure                                                               │
│  ✓ orchestrator/validate-stage-artifact.py - schema validator               │
│       imported by staged_merge.py:38                                        │
│                                                                             │
│ FILES (R):  pipeline-state/sgs-clone/<run_id>/stage-*.json                  │
│             plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json    │
│                                                                             │
│ FR21 contract: NO mutation outside pipeline-state until autonomy_gate       │
│                approves promotion                                           │
│                                                                             │
│ Wave 2 (7d713ba0): schema validation default-on. Production bypass          │
│   (require_schema=False at line ~1976) replaced with                        │
│   require_schema=not args.no_schema_validation. Operator must now           │
│   explicitly pass --no-schema-validation to skip; default is enforced.     │
│                                                                             │
│ STATUS:       LIVE - working; schema validation now default-on              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pre-deploy gate — Apply-module surface + markup validation [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ORDERING NOTE: dispatched in main() AFTER stage_9_report and BEFORE the    │
│ Stage 8 autonomy gate. Placed in the flow doc here (not under Stage 7) to  │
│ match actual execution order — Sonnet + Gemini Flash QC panel finding      │
│ 2026-05-14.                                                                │
│                                                                             │
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/attribute-staged-apply.py + functionality-bulk-apply.py +   │
│       media-sideload.py - WIRED 2026-05-14 (Phase 6 v2 Step 4i).           │
│       media-sideload.sideload_batch fires automatically in dry-run mode    │
│       per clone; harvests image-object slots from extract_out and writes   │
│       manifest at run_dir/media-sideload-manifest.json. Operator promotes  │
│       to upload via the module's --upload CLI flag. attribute-staged-apply │
│       + functionality-bulk-apply lazy-loaded into sys.modules — operator   │
│       dispatch only; no auto-mutation. Summary on run_dir/stage-4i.json.   │
│  ✓ orchestrator/wp_integration.py - validate_block_markup, route_native_   │
│       feature, build_deploy_command - WIRED 2026-05-14 (Phase 6 v2 Step    │
│       4j). main() runs validate_block_markup on extract_out.block_markup   │
│       before the autonomy gate; status / errors / warnings land on         │
│       run_dir/stage-4j.json. route_native_feature + build_deploy_command   │
│       remain operator-gated (lazy-loaded only). Soft-fails when /wp-blocks │
│       CLI is missing.                                                       │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/<run_id>/media-sideload-manifest.json                       │
│  pipeline-state/<run_id>/stage-4i.json                                      │
│  pipeline-state/<run_id>/stage-4j.json                                      │
│                                                                             │
│ FR21 invariants enforced:                                                   │
│  - media-sideload is upload=False (dry-run) on the auto-fire path           │
│  - attribute-staged-apply + functionality-bulk-apply are loaded but never   │
│    called — they're FR21 staging modules requiring operator-supplied        │
│    changes / jobs                                                           │
│  - wp_integration.build_deploy_command is loaded but never called           │
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
│       imported by sgs-clone-orchestrator.py:1189                            │
│  ✓ tools/multi-frame-qa/capture.js - multi-frame capture (0/200/500/1000/   │
│       3000ms) - invoked via Playwright runtime                              │
│  ✓ scripts/screenshot-diff-helper.js - pixel-level diff via pixelmatch      │
│  ✓ scripts/mockup-parity-validator.js - computed-style diff                 │
│  ✓ scripts/global-styles-reset.js - 7-step variation reset post-deploy      │
│  ✓ scripts/wp-update-block-attrs.js - createBlock+replaceBlock helper       │
│                                                                             │
│ FILES (R):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/full-page-markup.html                    │
│  sites/<client>/mockups/<page>/index.html (reference for diff)              │
│  tools/recogniser-v2/visual_qa_config.json (thresholds)                     │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/screenshots/ (per-viewport PNGs)         │
│  pipeline-state/sgs-clone/<run_id>/stage-8-visual_qa.json                   │
│                                                                             │
│ External tools (X):                                                         │
│  Playwright (browser automation)                                            │
│  WP REST API at sandybrown staging (page creation)                          │
│  SSH/SCP to Hostinger (deploy via tar method per ../CLAUDE.md)              │
│                                                                             │
│ Skills (X):                                                                 │
│  - /visual-qa skill is SIBLING (not invoked here). Operator runs it        │
│    separately for the full 9-layer audit. Stage 8 uses visual_qa_capture   │
│    only (Quick-mode equivalent in Python).                                  │
│                                                                             │
│ Hard gate: pixel-diff ≤ 1% at 375/768/1440 viewports — per SECTION via      │
│   --selector (Wave 2, 7d713ba0). CaptureContext.selector threaded through   │
│   to page.locator(selector).screenshot(). Full-page fallback when no sel.  │
│                                                                             │
│ ADDITIONAL GATE (Wave 2): unresolved_slots deploy gate — autonomy_decision  │
│   halts when stage-9-coverage.json open_slots > 0. Operator-actionable     │
│   note points at stage-9-coverage.json.                                     │
│                                                                             │
│ STUB FIX (Wave 1, ee8db653): stub_capture() no longer silently returns 0.0.│
│   Returns {diff_ratio: None, stage_8_skipped: True} sentinel. autonomy_gate│
│   returns surface-to-operator (never auto-proceed) on skip.                │
│                                                                             │
│ STATUS (pre-Wave1): LIVE - working; pass gate failing for Mama's            │
│ STATUS (post-Wave1/2 2026-05-21): LIVE - per-section cropped diff + stub    │
│               sentinel + unresolved_slots gate all enforced.                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9 — Coverage + Gap reporting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/leftover-bucket-router.py - 5-bucket router                   │
│       subprocess-called from sgs-clone-orchestrator.py:989                  │
│  ✓ recogniser/simple_html_review_report.py - operator-review HTML           │
│       subprocess-called at line 1024                                        │
│  ✓ recogniser/attribute-gap-writer.py - INSERT to attribute_gap_candidates  │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4f) - sgs-clone-orchestrator.py    │
│       stage_9_report calls attribute_gap_writer().stage(gaps, run_id, write│
│       =True) after autonomy chain. Gaps harvested from extract.per_section_│
│       results via _harvest_attribute_gap_candidates(); maps token_resolu-  │
│       tions[is_gap_candidate=true] -> {block_slug, selector, css_property, │
│       value_seen, role_proposed, confidence}. Provenance is sgs-clone:     │
│       <run_id>. Dedupes against (block_slug, selector, css_property).      │
│       Result lands on stage_9 output.attribute_gap_writer.                  │
│  ✓ recogniser/functionality-gap-detector.py - behaviour-expectation gaps    │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4g) - stage_9_report uses BS4 to   │
│       walk the mockup under every matched section selector via             │
│       _harvest_functionality_gap_elements(), emitting elements that carry │
│       any of 17 behaviour-fingerprint HTML attrs (data-action/toggle/     │
│       target/modal/tab/accordion/scroll-* + aria-expanded/controls/        │
│       haspopup) or an inline on*-handler. Detector batches detect_batch() │
│       across the elements, writes to uimax.functionality_gap_candidates    │
│       with provenance sgs-clone:<run_id>. Result on stage_9 output.        │
│       functionality_gap_detector. Soft-fails on BS4 import or selector    │
│       miss.                                                                 │
│  ✓ recogniser/gap-review-report.py - markdown gap-review.md                 │
│       WIRED 2026-05-14 (Phase 6 v2 Step 4h) - stage_9_report calls         │
│       write_report(buckets_output, run_id, out_dir=run_dir.parent.parent)  │
│       after the two gap writers fire. out_dir is the pipeline-state root;  │
│       the module appends `sgs-clone/<run_id>/gap-review.md`. Written path  │
│       on stage_9 output.gap_review_report_path. Soft-fails on rendering    │
│       errors.                                                               │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/sgs-clone/<run_id>/stage-9-coverage.json                    │
│  pipeline-state/sgs-clone/<run_id>/operator-review.html                     │
│  pipeline-state/sgs-clone/<run_id>/gap-review.md (when gap-review-report    │
│       gets wired)                                                           │
│                                                                             │
│ DB tables (W):                                                              │
│  attribute_gap_candidates (sgs-framework.db) - when attribute-gap-writer    │
│       wired                                                                 │
│  recognition_log (uimax)                                                    │
│  functionality_gap_candidates (uimax) - when functionality-gap-detector     │
│       wired                                                                 │
│                                                                             │
│ Wave 2 (7d713ba0): STAGE_2_CONFIDENCE_THRESHOLD = 0.7 named constant added  │
│   to confidence-matrix.py + leftover-bucket-router.py. Magic 0.5 at lines  │
│   48/222/510 replaced. Stage 9 applies ≥0.7 gate to route low-confidence   │
│   sections to autonomy chain.                                               │
│                                                                             │
│ Wave 3 (e60fe58e): LEGACY_ROLE_LOOKUP migrated to DB table                  │
│   (legacy_role_lookup, 17 entries, seed-legacy-role-lookup.py).             │
│   Voter refactored to call db_lookup.legacy_role_lookup_for(kebab_role).   │
│   Hardcoded dict emptied to {}.                                             │
│   RETIRED_BLOCK_REMAP soft-emptied to {} (consultation branch no-op;        │
│   physical removal in follow-up).                                           │
│                                                                             │
│ STATUS (pre-Wave2): LIVE for routing + report; GAP WRITES UNWIRED           │
│ STATUS (post-Wave2/3 2026-05-21): LIVE - confidence gate enforced; legacy   │
│               role lookup DB-backed; gap writes wired (Phase 6 v2 Step 4f+g)│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9b — Autonomy chain (the recovery path)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ recogniser/bucket-c-classifier.py - role inference from property_suffixes│
│       declared at sgs-clone-orchestrator.py:53 (CLASSIFIER_SCRIPT)          │
│       invoked at line 846 via importlib (stage_9b_autonomy_chain)           │
│  ✓ orchestrator/atomic-block-scaffold.py - 4-file Gutenberg scaffold        │
│       imported by sgs-clone-orchestrator.py:855 (autonomy chain, NOT the    │
│       composer fallback as previously misdocumented)                        │
│                                                                             │
│ FILES (W) staging (FR21 - mutates NOTHING outside pipeline-state):          │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/block.json               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/render.php               │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/edit.js                  │
│  pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/save.js                  │
│                                                                             │
│ DB tables (staged):  block_attributes rows queued for INSERT on --promote   │
│                                                                             │
│ GAP: The autonomy chain has 2 of N rails laid (classifier + scaffold).     │
│      Missing rails: attribute-gap-writer + functionality-gap-detector +    │
│      gap-review-report (Stage 9) for surfacing the proposals to operator.   │
│                                                                             │
│ STATUS:       PARTIALLY LIVE - classifier + scaffold fire, gap-writers don't│
└─────────────────────────────────────────────────────────────────────────────┘
```

### +REGISTER tail — Pattern registration [LIVE — Rosetta Stone gated]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/register_patterns.py - register_run()                       │
│       imported by sgs-clone-orchestrator.py main(); called on successful    │
│       autonomy_gate decision                                                │
│  ✓ uimax-tools/uimax_write.py - REFACTORED 2026-05-14 (Phase 6 v2 Step 5). │
│       register_patterns._insert_uimax_pattern now routes through            │
│       uimax_write.validate_and_write instead of direct sqlite3 INSERT.     │
│       Lazy-loaded via register_patterns._uimax_write() helper.              │
│  ✓ uimax-tools/uimax-write-validator.py - WIRED 2026-05-14 transitively    │
│       via uimax_write.validate_and_write. Every uimax patterns INSERT is    │
│       now gated by row 213 (Rosetta Stone — every artefact carries an SGS- │
│       block mapping in equivalent_implementations). Validator subprocess    │
│       runs before each write; rejection raises ValidationError which       │
│       register_patterns catches and soft-fails as a skipped pattern.        │
│                                                                             │
│ FILES (W):                                                                  │
│  theme/sgs-theme/patterns/<slug>.php (PHP pattern file with markup)         │
│                                                                             │
│ DB tables (W):                                                              │
│  patterns (sgs-framework.db) - INSERT new auto-registered pattern row       │
│  block_compositions (sgs-framework.db) - INSERT inner-block list row        │
│  patterns (uimax) - INSERT via validate_and_write with Rosetta Stone        │
│       equivalent_implementations enforcement (sgs_block + html_css)         │
│                                                                             │
│ Skills (X):                                                                 │
│  /uimax-sgs-scrape-pattern - pattern Rosetta Stone payload generation       │
│  /uimax-scrape-animation - per-animation Rosetta Stone payload              │
│                                                                             │
│ Wave 2b regression + revert (2026-05-21): a 16-keyword licensing-reject     │
│   gate was added in commit 7d713ba0 from stale SKILL.md text, then          │
│   REVERTED same session. Rule clarification: "no licensing" means do NOT    │
│   add licensing-validation infrastructure; not "ban the words". A previous  │
│   incarnation of this gate was stripped on 2026-05-14 (decisions.md Phase   │
│   6 v2 Step 5 sub-decision (b)). The validator has a tombstone comment +    │
│   regression-guard tests so the next agent doesn't re-add it. Rosetta       │
│   Stone validation (row 213) remains.                                       │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 5 complete; Rosetta Stone gate active; │
│               NO licensing gate (deliberately). Chokepoint propagation      │
│               tracked at P-S15-UIMAX-CHOKEPOINT-PROPAGATE in parking.md     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 9c — Structured pipeline log surfacing [LIVE — shipped 2026-05-19]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/surface_pipeline_logs.py - reads trace.jsonl, classifies   │
│       events into 4 buckets (chrome_skip / error / warning / info), emits   │
│       per-severity sidecar logs into run_dir. summary.log always written;   │
│       chrome-skipped.log / errors.log / warnings.log only when bucket has   │
│       >=1 entry. Soft-fail wrapped so observability never blocks pipeline.  │
│                                                                             │
│ MOTIVATION (Bug B incident 2026-05-19):                                     │
│  Before: cv2 walk() chrome_skip branch returned an HTML comment             │
│  '<!-- sgs-converter: CHROME SKIPPED (<header>) -->' which got              │
│  auto-paragraph-wrapped by WP into core/freeform blocks on every clone.     │
│  After: walk() returns None for chrome-skip; event lives in trace.jsonl     │
│  + sidecar chrome-skipped.log. Zero block_markup leakage.                   │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/<run>/summary.log         - one line per stage, always      │
│  pipeline-state/<run>/chrome-skipped.log  - chrome_skip events, conditional │
│  pipeline-state/<run>/errors.log          - passed:false / error* events    │
│  pipeline-state/<run>/warnings.log        - soft-fails + lint violations    │
│                                                                             │
│ ORCHESTRATOR OUTPUT:                                                        │
│  [stage-9c] surfaced logs: chrome_skip=2 errors=0 warnings=3 ->            │
│             chrome-skipped.log, warnings.log, summary.log                   │
│                                                                             │
│ See spec: .claude/specs/20-STRUCTURED-PIPELINE-LOG-SURFACING.md             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 10 — Per-page deploy (cv2 output → live WP page) [LIVE — shipped 2026-05-19]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/upload_and_patch.py - uploads referenced mockup images to  │
│       WP media library + patches the target page/post via REST API.         │
│       Reads sandybrown credentials from .claude/secrets/sandybrown.env.     │
│       Moved 2026-05-19 from reports/brand-walkdown-2026-05-19/ to canonical │
│       location at plugins/sgs-blocks/scripts/orchestrator/.                 │
│                                                                             │
│ TRIGGER:                                                                    │
│  Fires only when sgs-clone-orchestrator.py is invoked with                  │
│  --deploy-target page:<id> or --deploy-target post:<id>. Omit the flag to   │
│  produce a draft-only run that doesn't touch any live URL.                  │
│                                                                             │
│ ORCHESTRATOR PLACEMENT:                                                     │
│  Fires AFTER Stage 9c surfacing (so sidecar logs are written first) and    │
│  BEFORE the --skip-autonomy-gate early return (so the deploy lands even on  │
│  dev runs when the operator opts in). Soft-fail: any deploy error logs to   │
│  stderr but does NOT halt the pipeline.                                     │
│                                                                             │
│ FILES (W):                                                                  │
│  pipeline-state/<run>/extract.patched.json - block_markup with image URLs   │
│                                              swapped to sandybrown URLs     │
│  WP page/post N (sandybrown) - PATCHed via REST API                         │
│                                                                             │
│ ORCHESTRATOR OUTPUT:                                                        │
│  [stage-10] deploy: patched page 144 — page 144 modified 2026-05-19T16:14:01│
│                     link=https://sandybrown-nightingale-600381.hostingersite│
│                     .com/rc-fix-verification-mamas-munches/                 │
│                                                                             │
│ RELATIONSHIP TO /wp-sgs-deploy:                                             │
│  /wp-sgs-deploy is FRAMEWORK deploy (sgs-blocks + sgs-theme to              │
│  palestine-lives.org — framework-wide, infrequent). Stage 10 is PER-PAGE    │
│  cv2-output deploy to a client's staging site — per-clone-run cadence.      │
│  Different scopes, different skills.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Final acceptance harness [LIVE]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SCRIPTS:                                                                    │
│  ✓ orchestrator/critical-fix-verification.py - 4-check FR21 boundary harness│
│       WIRED 2026-05-14 (Phase 6 v2 Step 4k) - sgs-clone-orchestrator.py    │
│       main() calls run_harness(run_id=so_run_id) after the +REGISTER tail. │
│       Aggregated check matrix lands at run_dir/critical-fix-verification.   │
│       json. Runs all 4 checks even on individual failure -- surfaces full   │
│       state to operator. Soft-fails on missing optional inputs (theme hash,│
│       sgs_update runner). The harness shipped with five checks; the fifth  │
│       was an IP-defence scan that was removed 2026-05-14 alongside the    │
│       validator's row-211 strip (UI patterns aren't copyrightable so the  │
│       scan was theatre).                                                    │
│                                                                             │
│ Checks: no_root_theme_mutation, no_canonical_block_mutation_outside_fr21,   │
│         sgs_update_idempotency, pipeline_state_clean_post_success           │
│                                                                             │
│ STATUS:       LIVE - Phase 6 v2 Step 4k complete                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sister pipeline — /sgs-update (11 stages)

Refreshes the data layer; runs OUT-OF-BAND from /sgs-clone.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ENTRY:    /sgs-update command at ~/.claude/commands/sgs-update.md           │
│ DRIVER:   ~/.claude/skills/sgs-wp-engine/scripts/update-db.py               │
│           ~/.claude/skills/sgs-wp-engine/scripts/populate-db.py             │
│           ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py (query helper)   │
│                                                                             │
│ Stage 1  Inventory      - walks plugins/sgs-blocks/src/blocks/ + theme/     │
│                           Writes to 17 DB tables                            │
│ Stage 2  Block.json     - parses every block.json; populates                │
│                           block_attributes, block_selectors, block_supports │
│           Script: plugins/sgs-blocks/scripts/generate-block-reference.py    │
│ Stage 3  Signatures     - parses render.php + save.js for output_signature  │
│           Script: behavioural-analyser/extract-signatures.py                │
│ Stage 4  Canonical      - assigns canonical_slot + role + derived_selector  │
│           Script: behavioural-analyser/assign-canonical.py                  │
│ Stage 5  Compositions   - parses theme/sgs-theme/patterns/*.php             │
│           Scripts: pattern-register.py, pattern-fingerprint.py,             │
│                    pattern-classify.py, uimax-tools/seed-block-compositions │
│ Stage 6  Token sync     - syncs theme.json categories to design_tokens table│
│ Stage 7  Animation sync - scans sgsAnimation enum values → uimax.animations │
│ Stage 8  uimax mirror   - syncs blocks → uimax.component_libraries          │
│           Script: uimax-tools/sgs-update-uimax-sync.py                      │
│           USES: uimax-tools/uimax_write.py + uimax-write-validator.py       │
│ Stage 9  Drift validator - every attr decomposes into known vocab           │
│           Script: drift-validator/validate.py                               │
│ Stage 10 Gap detection  - writes attribute_gap_candidates                   │
│           Script: gap-detection/detect.py                                   │
│ Stage 11 Doc regen      - regenerates .claude/specs/02-SGS-BLOCKS-REFERENCE │
│           Script: generate-block-reference.py                               │
│                                                                             │
│ MUTEX: /sgs-update + /sgs-clone share the build mutex (preflight_chain      │
│        ensures one runs at a time)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Sources & Block-Equivalent Layers

This section consolidates **what data lives where** so the pipeline + agents can answer:
- *Which DB holds X?*
- *What naming convention do drafts use?*
- *How is a block's "equivalent" stored across the translation layers?*

Added 2026-05-19 in response to scattered-info findability gap; supersedes ad-hoc lookups across §"Direct file accesses inventory", §"DB table heat-map", and Spec 15 §8.1.

### The 2 SQLite databases

| DB | Path | Tables | Purpose | Touched by |
|----|------|--------|---------|------------|
| **sgs-framework.db** (canonical SGS knowledge) | `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND mirrored at `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (DUAL — always write both) | 25 | Block schemas, attribute catalogue, slot vocab, supports, patterns, hooks, gotchas, deploy steps | Every clone-pipeline stage (R) + `/sgs-update` (R+W) |
| **uimax.db** (cross-platform design intelligence) | `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | 48 | Naming conventions, Rosetta Stone equivalents, design tokens, animation library, component libraries (Radix/shadcn/etc.), recognition log, mood boards | Stage 9 (W — gap-writers), +REGISTER (W), `/sgs-update` Stage 8 (mirror) |
| (3rd party reference) **core/blocks.db** | `~/.wp-blockmarkup-mcp/blocks.db` | 7 | Verified WP-core block schemas + markup examples | `/wp-blocks` CLI only |

**Canonical schema dump (run this before any "missing column" claim):**

```bash
python ~/.claude/hooks/wp-blocks.py dump
```

Emits compact markdown for all 3 DBs (table names + column lists + row counts). ~1500 tokens. See binding rule #4 in project CLAUDE.md.

### Draft naming convention (SGS-BEM)

Bean-controlled drafts (mockup, sketch, hand-coded HTML) MUST use `.sgs-<block>__<element>--<modifier>`:
- `<block>` matches a registered SGS block slug (e.g. `hero`, `trust-bar`, `container`)
- `<element>` matches a slot id from that block's slot list (e.g. `headline`, `cta`, `media`)
- `<modifier>` matches a `block.json` attribute value (e.g. `--split`, `--align-left`)
- Validation regex: `^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`

The convention is stored in `uimax.naming_conventions` row `"SGS WordPress"` with `is_canonical_for_sgs_drafts=1`. Stage 0.1 BEM lint hard-rejects non-conforming drafts on production runs. Spec 15 §8.1 (now part of Spec 16 §12) is canonical reference.

Live scrapes (sites Bean does NOT control) use **lingua-franca conversion** at write time: SGS-BEM primary, source convention preserved as a sibling row in `equivalent_implementations`.

### Block-equivalent layers (what's stored per block, per attribute)

For any SGS block, the data stack across the 2 DBs:

| Layer | Where it lives | Column / Table | Status (2026-05-19) |
|-------|---------------|----------------|---------------------|
| Block **name** | `sgs-framework.blocks.slug` | `slug` (e.g. `sgs/container`) | ✅ Fully populated — 73 blocks |
| Block **title / description / category** | `sgs-framework.blocks` | `title`, `description`, `category`, `type`, `status`, `grade` | ✅ Auto-synced by `/sgs-update` |
| **Has-render-php / has-view-script flags** | `sgs-framework.blocks` | `has_render_php`, `has_view_script` | ✅ Auto-synced |
| Attribute **names** | `sgs-framework.block_attributes` | `attr_name` keyed by `block_slug` | ✅ 1755 rows (post 2026-05-19) |
| Attribute **type + default** | `sgs-framework.block_attributes` | `attr_type`, `default_value` | ✅ Auto-synced from block.json |
| Attribute **enum_values (possible values)** | `sgs-framework.block_attributes.enum_values` | JSON array, e.g. `'["standard","split","video","svg-animated"]'` | ✅ Populated for every block.json enum |
| Attribute **canonical slot** | `sgs-framework.block_attributes.canonical_slot` | Stage-3 lookup target | ✅ +`slot_synonyms` table provides BEM-element aliases (89 rows) |
| Attribute **role** (semantic category) | `sgs-framework.block_attributes.role` | e.g. `image-object`, `select-from-enum`, `motion`, `text-content` | ✅ |
| **Inspector control type** (which React widget edits this attr) | `sgs-framework.block_attributes.inspector_control_type` | e.g. `RangeControl`, `SelectControl`, `ToggleControl`, `MediaPlaceholder` | ✅ 809 rows populated 2026-05-19 |
| **Output signature** (how the attr renders to HTML) | `sgs-framework.block_attributes.output_signature` | JSON: `{type, output_function, output_element, output_class, output_role, is_content_or_design, conditional_gates}` | ✅ |
| **Equivalent implementations** (Rosetta Stone) | `sgs-framework.block_attributes.equivalent_implementations` | JSON: `{sgs_wp: "<wp:block …/>", html_css: "<element class='.sgs-x__slot--mod'>"}` | ✅ 1630 rows populated 2026-05-19 — every attr has a draft↔WP mapping |
| **Derived selector** | `sgs-framework.block_attributes.derived_selector` | e.g. `.sgs-hero__label` — used by Stage 2 matching | ✅ |
| Block **supports** (WP-native colour / typography / spacing / border + custom sgs.*) | `sgs-framework.block_supports` | Per-block flag rows | ✅ 404 rows |
| Block **compositions** (parent → child blocks) | `sgs-framework.block_compositions` | Pattern-level inner-block lists | ✅ 37 rows |
| Block **selectors** (CSS root + element selectors) | `sgs-framework.block_selectors` | Per-block CSS scope | ✅ 74 rows |
| Block **change history** | `sgs-framework.block_changes` | Auto-logged by `/sgs-update` | ✅ 2329 rows |
| Block **hooks** (sgs_* WP filters/actions per block) | `sgs-framework.hooks` | Populated by `/wp-hooks` integration | ✅ wired 2026-05-19 |
| **Design tokens** (colour / spacing / font / shadow per theme.json) | `sgs-framework.design_tokens` | theme.json palette + variation overrides | ✅ 39 rows post-refresh 2026-05-19 |
| **Style variations** (per-client `styles/<client>.json`) | `sgs-framework.style_variations` | Active variation catalogue | ✅ 8 variations 2026-05-19 |
| **Cross-stack components** (Radix / shadcn / Material UI / etc. with equiv_implementations) | `uimax.component_libraries` | 217 rows | ✅ |
| **Naming conventions** (16 frameworks' BEM patterns) | `uimax.naming_conventions` | SGS WordPress = canonical | ✅ |
| **Recognition log** (every clone pipeline boundary classification) | `uimax.recognition_log` | Append-only audit trail | ✅ Stage 9 W |

### Value-conversion exceptions (most CSS/JS values transfer raw — these don't)

| Exception type | Example | Where canonical mapping lives |
|----------------|---------|-------------------------------|
| Enum-bounded attrs | `variant ∈ {standard, split, video, svg-animated}` | `block_attributes.enum_values` |
| BEM `--flag` booleans | `.sgs-container--ken-burns` → `bgKenBurns: true` | Universal rule — derivable from BEM convention, no per-block catalogue |
| Palette token refs | `var(--wp--preset--color--surface-pink)` → `"surface-pink"` | `design_tokens` table |
| Number+unit splits | `font-size: 16px` → `fontSize: 16` + `fontSizeUnit: "px"` | `property_suffixes` (117) + `modifier_suffixes` (19) |
| Object attrs (media) | `{id, url, alt}` | Direct passthrough |
| Nested `style.*` | `style.color.background` | WP-native structured format |

All other CSS/JS values are direct-passthrough — no conversion catalogue needed.

### Where to look when the pipeline can't extract something

1. **Slot-resolution failure** (attr not landing in any canonical slot) → check `slot_synonyms` table; extend via `seed-slot-synonyms.py` if needed.
2. **Attribute schema gap** (attr not in `block_attributes`) → run `/sgs-update` to re-scan block.json; if gap persists, the attr isn't declared in block.json.
3. **CSS rule lifted but doesn't appear in output** → check `attribute_gap_candidates` (sgs-framework — 1009 rows) — every dropped CSS rule registers here.
4. **Draft class name not recognised** → check `uimax.naming_conventions.SGS WordPress` pattern matches; check `slot_synonyms` for BEM element aliases.
5. **Cross-stack equivalent missing** (e.g. need Tailwind / shadcn variant of an SGS block) → check `uimax.patterns.equivalent_implementations` JSON; populate via `/uimax-sgs-scrape-pattern`.

## Direct file accesses inventory (across the whole pipeline)

| File | Purpose | Stages that touch it |
|------|---------|----------------------|
| `theme/sgs-theme/theme.json` | Base design tokens + global default styles | 0 (R→run_ctx), 0.5 (R) |
| `theme/sgs-theme/styles/<client>.json` | Per-client token overrides + per-client style variation | 0 (R→run_ctx), 0.5 (R+W) |
| `theme/sgs-theme/styles/<client>.css` | Stage 0.7 monolithic CSS dump (architectural debt) | 0.7 (W) |
| `theme/sgs-theme/patterns/<slug>.php` | Registered pattern markup | +REGISTER (W), /sgs-update Stage 5 (R) |
| `theme/sgs-theme/templates/*.html` | Page templates (block-based) | (consumed by WP at render time, not by pipeline) |
| `plugins/sgs-blocks/src/blocks/<slug>/block.json` | Block schema | 2 (R), 3 (R), 5 (R), 6 (R), /sgs-update Stage 2 (R) |
| `plugins/sgs-blocks/src/blocks/<slug>/render.php` | Dynamic block renderer | /sgs-update Stage 3 (R via extract-signatures.py) |
| `sites/<client>/mockups/<page>/index.html` | Input mockup | 0.1 (R), 0.5 (R), 0.7 (R), 1 (R), 4 (R), 8 (R for diff) |
| `sites/<client>/research/<client>-media-map.json` | mockup filename → WP attachment ID | 4 (R) |
| `pipeline-state/sgs-clone/<run_id>/stage-*.json` | Per-stage artefacts | 0-9 (W), 7b staged-merge (R) |
| `pipeline-state/sgs-clone/<run_id>/scaffold-<slug>/` | Staged new-block files | 9b (W), --promote (R+W to canonical) |
| `pipeline-state/sgs-clone/<run_id>/screenshots/` | Per-viewport PNGs | 8 (W) |
| `pipeline-state/sgs-clone/<run_id>/.mutex.lock` | Build mutex | 0 (W) |
| `tools/recogniser-v2/visual_qa_config.json` | Pixel-diff thresholds + viewport sizes | 8 (R), shared with /visual-qa skill |
| `tools/recogniser-v2/data/role-templates.json` | Role-keyed extraction recipes (legacy seed) | 4 (R) |
| `plugins/sgs-blocks/scripts/orchestrator/schemas/stage-N.json` | Per-stage artefact JSON schemas | 7b staged-merge (R via validate-stage-artifact) |
| `C:/Users/Bean/.openclaw/.env` | WP credentials for media-sideload + REST writes | 8 (R), media-sideload (R) |
| `C:/Users/Bean/.claude/skills/sgs-wp-engine/sgs-framework.db` | Authoritative SGS DB (29 tables) | many (R+W per stage matrix above) |
| `C:/Users/Bean/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` | uimax DB (48 tables) | 9 (W via gap-writers), +REGISTER (W) |

## DB table heat-map

### Heavily-touched (5+ touches per pipeline run when fully wired)

| Table | DB | Reads | Writes |
|-------|-----|-------|--------|
| `block_attributes` | sgs-framework | Stages 3, 4 | /sgs-update Stage 2+4 |
| `theme.json` (file) | n/a (file) | Stages 0.5, 4.5, 5 | 0.5 apply mode |
| `block.json` (file) | n/a (file) | Stages 2, 3, 5, 6 | (read-only in clone path) |

### Lightly-touched

| Table | DB | Used at |
|-------|-----|---------|
| `slot_synonyms` | sgs-framework | Stage 1 (R) |
| `block_supports` | sgs-framework | Stage 5 (R, when supports_writer wired) |
| `blocks` | sgs-framework | Stage 2 (R via filesystem) |
| `patterns` | sgs-framework | +REGISTER (W) |
| `block_compositions` | sgs-framework | +REGISTER (W) |
| `attribute_gap_candidates` | sgs-framework | Stage 9 (W, when wired) |
| `recognition_log` | uimax | Stage 9 (W) |
| `functionality_gap_candidates` | uimax | Stage 9 (W, when wired) |
| `component_libraries` | uimax | /sgs-update Stage 8 (R+W) |
| `patterns` | uimax | +REGISTER (W) |
| `animations` | uimax | /sgs-update Stage 7 (W), Stage 4 gap report (R) |

### DEAD tables (zero rows, no active writers — retirement candidates)

| Table | DB | Notes |
|-------|-----|-------|
| `sections_detected` | sgs-framework | Empty; no live writers |
| `extraction_cache` | sgs-framework | Empty; no live writers |
| `block_opportunities` | sgs-framework | Empty; no live writers |
| `weaknesses` | sgs-framework | Empty; no live writers |
| `animations` | sgs-framework | Empty; superseded by uimax.animations |

## Skill dispatch chain (when fully wired)

```
/sgs-clone
  ├─ Stage 1: /uimax-classify-naming ✓ via stage1_boundary_hook (wired Phase 6 v2 Step 4e 2026-05-14; current dispatch uses the in-module heuristic classifier, /uimax-classify-naming-backed callable injection deferred)
  ├─ Stage 7: /sgs-wp-engine (block-level questions, on-demand)
  ├─ Stage 8: (no skill dispatch - uses inline visual_qa_capture.py)
  ├─ +REGISTER: /uimax-sgs-scrape-pattern (pattern Rosetta Stone payload)
  ├─ +REGISTER: /uimax-scrape-animation (animation Rosetta Stone payload)
  └─ Anywhere ambiguity: /ui-ux-pro-max (judgement calls only)

/visual-qa (SIBLING - operator-invoked separately, NOT in /sgs-clone path)
  └─ scripts at C:/Users/Bean/.agents/skills/visual-qa/scripts/:
        responsive-screenshots.js, capture-states.js, global-css-diff.js,
        element-extractor.js, token-validator.js, a11y-audit.js,
        perf-check.js, run-audit.js (coordinator)
     [B] run-audit.js:137 had broken responsive-audit.js reference - FIXED 2026-05-13
```

## Status summary

| Aspect | Count | Notes |
|--------|-------|-------|
| Scripts catalogued | 107 | Across plugins/sgs-blocks/scripts/, scripts/, tools/ |
| Wired into /sgs-clone live path | 19 | Direct or transitive imports verified |
| Fallback-only | 1 | atomic-block-scaffold (also wired via autonomy chain) |
| Tests-only (built, NOT wired) | 14 | The Phase 6 wiring target |
| With known caveat (PARTIAL) | 2 | uimax_write, uimax-write-validator (bypassed in /sgs-clone path) |
| Standalone / build / retired | 73 | Out of scope for /sgs-clone wiring |
| Skill/command files referenced | 17 | Catalogued in skills-commands-map.md |
| /visual-qa internal scripts | 8 | Skill-bundle scripts at ~/.agents/skills/visual-qa/scripts/ |
| Pipeline stages defined | 10 + 4 tails | 0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 5, 6, 7, 7b, 8, 9, 9b + DEPLOY/PARITY/REGISTER/UPDATE |
| Pipeline stages LIVE | 17 | Stages 0, 0.1, 0.5, 0.7, 1, 2, 3, 4, 4.5, 5, 6, 7, 7b, 8, 9, 9b, +REGISTER (updated 2026-05-14 after Phase 6 v2 Step 4 closed — 4.5 + 5 flipped LIVE) |
| Pipeline stages UNWIRED | 0 critical | All Phase 6 v2 Step 4 wire-ins complete 2026-05-14 |
| Pipeline stages PARTIAL | 2 | Stage 9b autonomy chain (2 of N rails); +REGISTER (validator bypass; Step 5 fix outstanding) |

## Gaps + optimisation opportunities surfaced by this annotation

### Critical (block parity gate)

1. ~~**Stage 4.5 token snap unwired**~~ — RESOLVED 2026-05-14 (Phase 6 v2 Step 4a token_resolver + 4b variation_router commits `90fdb8e5` + `111d0815`).
2. ~~**Stage 5 default inheritance unwired**~~ — RESOLVED 2026-05-14 (Phase 6 v2 Step 4c supports_writer + inheritance transitive, commit `dc83d172`).
3. ~~**Stage 1 convention enrichment unwired**~~ — RESOLVED 2026-05-14 (Phase 6 v2 Step 4e stage1_boundary_hook + lingua_franca transitive, commit `a200e3d6`). Note: in-module heuristic classifier is the current dispatch; /uimax-classify-naming-backed callable injection deferred.
4. ~~**Stage 9 gap-writers unwired**~~ — RESOLVED 2026-05-14 (Phase 6 v2 Steps 4f + 4g + 4h — attribute-gap-writer + functionality-gap-detector + gap-review-report, commits `19b45333` + `d0c4370f` + `efc2b418`).

### Architectural debt (not Phase 6 blockers)

5. **Stage 0.7 CSS lift wrong-architecture** - dumps all CSS to one variation file instead of splitting universal / per-instance / bespoke. Captured rule violated. Tracked separately.
6. **+REGISTER bypasses uimax_write validator** - Rosetta Stone discipline silently skipped on every clone. Phase 6 step 9 fixes this (~20 min).
7. **Stage 2 has no pattern-level matcher** - sections fall through to block-level match then to composer fallback because patterns table never consulted at boundary. Future enhancement (post Phase 6).
8. **Stage 0.7 isn't in Spec 15 §7 stage list** - implementation drift from spec. Doc fix.

### Optimisation opportunities

9. ~~**theme.json read 3+ times**~~ FIXED (Step 6a, 2026-05-14) — cached in run_ctx at Stage 0; all downstream stages read from ctx.
10. **5 dead DB tables** in sgs-framework.db (sections_detected, extraction_cache, block_opportunities, weaknesses, animations) - retire or remove from schema.
11. **Per-section subprocess overhead** at Stage 4 (one Python startup per matched section) - could batch via single extract.py invocation taking a list of sections.

## Pattern-key tracking

This visual flow captures every entry from (all absorbed 2026-05-21):
- ~~`.claude/tooling-map.md`~~ — 107 scripts, now in "Script inventory" section below
- ~~`.claude/skills-commands-map.md`~~ — 17 commands+skills + 8 visual-qa internal, now in "Skill dispatch chain (full)" section
- ~~`.claude/db-tables-map.md`~~ — 29 sgs-framework tables + 48 uimax tables, now in "DB heat-map (full)" section
- `.claude/reports/2026-05-13-tooling-map-qc-gemini-flash.md` (Round 1 QC)
- `.claude/scratch/qc-tooling-map-haiku-round2.md` (Round 2 QC by Haiku)
- `.claude/scratch/qc-tooling-map-gemini-flash-round2.md` (Round 2 QC by Gemini)
- `.claude/scratch/visual-qa-audit.md` + `.claude/scratch/visual-qa-audit-qc.md`

Synced 2026-05-13. Post-wave-cleanup updates applied 2026-05-21 (Waves 1-3 status lines). Next sync trigger: after any stage change, script wired/unwired, DB schema change, or skill dispatch change.

## See also

- **Single end-goal spec:** [.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md](specs/16-DETERMINISTIC-CONVERTER-V2.md) — Spec 15 absorbed into §12 Appendix A on 2026-05-21
- Historical Spec 15 (absorbed, retained for git-blame): [.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md](specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md)
- Master execution plan: [.claude/plans/spec-15-master-execution-plan.md](plans/spec-15-master-execution-plan.md)
- Phase 6 plan (archived): [.claude/plans/archive/phase-6-pattern-fidelity.md](plans/archive/phase-6-pattern-fidelity.md)
- State: [.claude/state.md](state.md)
- Decisions log: [.claude/decisions.md](decisions.md)

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

## Script inventory (absorbed from tooling-map.md, 2026-05-21)

Source: `.claude/tooling-map.md` (520 lines, generated 2026-05-13, last-verified 2026-05-18). Original doc replaced with redirect stub.

> **Update trigger:** Any script add/remove/rename under `plugins/sgs-blocks/scripts/`, `scripts/`, or `tools/`; any wiring status change; any status reclassification. Enforcement: `.claude/hooks/tooling-map-drift-check.py`.

### Spec 16 converter v2 (in `plugins/sgs-blocks/scripts/orchestrator/converter_v2/`)

| Script | Status | Notes |
|---|---|---|
| `__init__.py` | LIVE | Public API: `convert_section()` + `convert_page()`. Brace-depth JSON extractor. |
| `convert.py` | LIVE | Slot-aware DOM-to-WP-blocks converter. Wave 3 D3 gap-candidate emission for every unlifted CSS property. CSS-driven container detection; DB-first suffix lookups. |
| `convert_page.py` | LIVE | Page-level wrapper. `--mode pipeline` CLI for orchestrator subprocess. |
| `db_lookup.py` | LIVE | `css_property_suffixes()` (117 rows), `breakpoint_suffix_rules()`, `block_supports_for()`, `legacy_role_lookup_for()` (Wave 3). `@lru_cache`. |
| `test_root_supports_lift.py` | LIVE | 3 smoke tests for `_lift_root_supports_to_style()`. |

Evidence infrastructure (Phase 9 pre-work, 2026-05-18):
- `orchestrator/expected_rules.py` LIVE -- per-section CSS-rule baseline extractor; writes `expected-rules-<boundary>.jsonl`
- `orchestrator/trace.py` (`Trace.for_boundary`) LIVE -- per-section trace bound to `convert-trace-<boundary>.jsonl`
- `scripts/pixel-diff.py` STANDALONE -- `--selector` per-section cropped diff; `--expected-rules` and `--extracted-attrs` paired flags compute `attribute_coverage` block
- `migrations/2026-05-17-property-suffixes-per-side.py` LIVE -- idempotent seed of 18 per-side longhand rows into property_suffixes

### Live pipeline core

| Script | Path | Status | Wired | Notes |
|---|---|---|---|---|
| sgs-clone-orchestrator.py | plugins/sgs-blocks/scripts/ | CURRENT | YES | Entry point. `--converter-v2` default TRUE (Wave 1, 2026-05-21). Non-SGS-BEM halt replaces legacy subprocess. |
| orchestrator_main.py | orchestrator/ | CURRENT | YES | preflight + staged_merge + visual_qa + autonomy gate |
| register_patterns.py | orchestrator/ | CURRENT | YES | +REGISTER tail; uimax writes via validate_and_write |
| preflight_chain.py | orchestrator/ | CURRENT | YES | run_preflight() + run_precommit_gate() |
| staged_merge.py | orchestrator/ | CURRENT | YES | FR21 keystone; schema validation default-on (Wave 2) |
| staged_output.py | orchestrator/ | CURRENT | YES | pipeline-state dir convention |
| autonomy_gate.py | orchestrator/ | CURRENT | YES | Per-section cropped diff + skip sentinel + unresolved_slots gate (Waves 1+2) |
| visual_qa_capture.py | orchestrator/ | CURRENT | YES | Playwright + PIL pixel-diff factory |
| mutex.py | orchestrator/ | CURRENT | YES | File-based build mutex, 1hr stale lock |
| validate-stage-artifact.py | orchestrator/ | CURRENT | YES | Schema validator for stage-N artefacts |
| atomic-block-scaffold.py | orchestrator/ | CURRENT | FALLBACK | Emits 4 Gutenberg files; --promote copies to src |
| variation_router.py | orchestrator/ | CURRENT | YES | Writes to client variation JSON; hard-blocked from root theme.json |
| token_resolver.py | orchestrator/ | CURRENT | YES | Snaps to token at confidence >= 0.6 |
| attribute-staged-apply.py | orchestrator/ | CURRENT | YES (operator-gated) | FR21 staging + emit only |
| functionality-bulk-apply.py | orchestrator/ | CURRENT | YES (operator-gated) | Transactional bulk apply |
| media-sideload.py | orchestrator/ | CURRENT | YES | Dry-run default |
| supports_writer.py | orchestrator/ | CURRENT | YES | Omit-vs-emit using block_supports |
| stage1_boundary_hook.py | orchestrator/ | CURRENT | YES | Convention classifier + lingua_franca enrichment |
| modifier_extractors.py | orchestrator/ | CURRENT | YES | button_role / dynamic_link / match_block_variation |
| wp_integration.py | orchestrator/ | CURRENT | YES | validate_block_markup auto; rest operator-gated |
| lingua_franca.py | orchestrator/ | CURRENT | YES (transitive) | BEM/Tailwind/Bootstrap/SGS convention conversion |
| critical-fix-verification.py | orchestrator/ | CURRENT | YES | 4-check FR21 acceptance harness |
| composer_fallback.py | orchestrator/ | CURRENT | YES | Fallback for core/group or confidence==0 |
| **surface_pipeline_logs.py** | orchestrator/ | CURRENT (shipped 2026-05-19) | YES | Stage 9c — classifies trace.jsonl events into 4 buckets, writes summary.log always + per-severity sidecar logs when bucket has ≥1 entry. Soft-fail wrapped. Spec 20. |
| **upload_and_patch.py** | orchestrator/ | CURRENT (shipped 2026-05-19) | YES (opt-in via --deploy-target) | Stage 10 — uploads referenced mockup images to WP media library + patches target page/post via REST. Reads sandybrown env. Moved from reports/brand-walkdown-2026-05-19/. |
| **wp-pre-merge-gate.py** | plugins/sgs-blocks/scripts/ | CURRENT (shipped 2026-05-19) | YES (advisory) | Wraps `/wp-blocks health` + `/wp-hooks validate` + `/wp-hook-graph validate` into one pre-commit gate. Non-zero exit on any sub-tool failure. |

### Recogniser modules

| Script | Path | Status | Wired | Notes |
|---|---|---|---|---|
| per-section-convention-voter.py | recogniser/ | CURRENT | YES | Stage 1; LEGACY_ROLE_LOOKUP migrated to DB (Wave 3) |
| confidence-matrix.py | recogniser/ | CURRENT | YES | Stage 2; STAGE_2_CONFIDENCE_THRESHOLD = 0.7 (Wave 2) |
| leftover-bucket-router.py | recogniser/ | CURRENT | YES | Stage 9; 0.7 threshold (Wave 2) |
| simple_html_review_report.py | recogniser/ | CURRENT | YES | Stage 9 operator review HTML |
| bucket-c-classifier.py | recogniser/ | CURRENT | YES | Autonomy chain; CLASSIFIER_SCRIPT at line 53 |
| attribute-gap-writer.py | recogniser/ | CURRENT | YES | Stage 9; D3 gap-candidate writes (Wave 3) |
| functionality-gap-detector.py | recogniser/ | CURRENT | YES | Stage 9; 17 behaviour-fingerprint attrs |
| gap-review-report.py | recogniser/ | CURRENT | YES | Stage 9; markdown gap-review.md |
| recursion-guard.py | recogniser/ | CURRENT | NO | Max_depth=12 guard; not yet wired |

### Legacy extraction modules (unreachable after Wave 1, 2026-05-21)

| Script | Path | Status | Notes |
|---|---|---|---|
| extract.py | tools/recogniser-v2/ | UNREACHABLE | Subprocess block removed Wave 1. On disk; deletion deferred. |
| extract_strategies.py | tools/recogniser-v2/ | UNREACHABLE | Same |
| utils.py | tools/recogniser-v2/ | UNREACHABLE | Same |
| overrides/__init__.py | tools/recogniser-v2/ | UNREACHABLE | Same |
| overrides/hero.py | tools/recogniser-v2/ | TO-RETIRE | Same |

v1 recogniser (tools/recogniser/ -- 7 files): all TO-RETIRE Spec 15 Phase 5; none wired.

### Supporting scripts (NOT wired into /sgs-clone live path)

**Token/value matching:** `match.py` (LIVE via token-lint.py:91; also token_resolver), `inheritance.py` (LIVE transitively via supports_writer).

**Lints:** `bem-lint.py` (Stage 0.1 LIVE), `token-lint.py` (Stage 0.5 LIVE).

**DB vocab/gap-detection:** `detect.py` (/sgs-update S10), all `apply-*.py` / `canonicalise-*.py` / `coverage-*.py` (ONE-OFF, not wired).

**Behavioural analyser:** `assign-canonical.py` (/sgs-update S4), others ONE-OFF.

**Drift validator:** `validate.py` (LIVE via preflight_chain.run_precommit_gate()).

**Pattern tools:** `pattern-register.py`, `pattern-fingerprint.py`, `pattern-classify.py` (all superseded in production by register_patterns.py).

**uimax tools:** `uimax_write.py` (LIVE chokepoint), `uimax-write-validator.py` (LIVE transitive; Rosetta Stone gate only — Wave 2b licensing reject was added then REVERTED same session, see decisions.md 2026-05-21 + tombstone comment in the file), `sgs-update-uimax-sync.py` (/sgs-update S3+4), `seed-block-compositions.py` (ONE-OFF), `seed-legacy-role-lookup.py` (Wave 3c, idempotent, /sgs-update Stage 0).

**Build tools:** `generate-icons.js`, `copy-built-styles.js` (build-time); `build-font-collection.py`, `generate-block-reference.py` (/sgs-update S2), `audit-block-uniformity.py` (standalone).

**QA/diff tools (scripts/):** `colour-parity-audit.js`, `mockup-parity-validator.js`, `screenshot-diff-helper.js`, `css-pattern-audit.js`, `font-source-audit.js`, `global-styles-reset.js`, `render-mobile-override-audit.js`, `brand-palette-sampler.py`, `sgs-block-grep.py`, `wp-update-block-attrs.js`, `pixel-diff.py` (all standalone/operator tools, NOT wired into /sgs-clone).

**Multi-frame QA:** `tools/multi-frame-qa/capture.js` (invoked by visual_qa_capture.py OR standalone).

### Wave 1-3 test files

| Test file | Tests | Wave |
|---|---|---|
| test_orchestrator_non_bem_halt.py | 8 | Wave 1 |
| test_uimax_write_validator.py | 19 | Wave 2 |
| test_confidence_threshold.py | 7 | Wave 2 |
| test_attribute_gap_candidate.py | 5 | Wave 3 |
| test_stage_3_db_canonical.py | 7 pass + 2 skip | Wave 3 |
| test_voter_db_legacy.py | 11 | Wave 3 |

### Deprecated / to-retire summary

| File | Retirement phase | Disk state |
|---|---|---|
| tools/recogniser/*.py (7 files) | Spec 15 Phase 5 | EXISTS |
| tools/recogniser-v2/extract.py | Wave 1 unreachable; physical delete deferred | EXISTS |
| tools/recogniser-v2/extract_strategies.py | Same | EXISTS |
| tools/recogniser-v2/overrides/hero.py | Same | EXISTS |
| fingerprint-builder/build-catalogue.py | Spec 15 Phase 3 | MISSING |
| fingerprint-builder/step*.py (2 files) | Spec 15 Phase 3 | MISSING (.pyc only) |
| fingerprint-builder/qa-gate.py | Spec 15 Phase 3 | MISSING |

---

## Skill dispatch chain (full) (absorbed from skills-commands-map.md, 2026-05-21)

Source: `.claude/skills-commands-map.md` (459 lines, generated 2026-05-13, last-verified 2026-05-14). Original doc replaced with redirect stub.

> **Update trigger:** New skill or command added; pipeline position change; skill/command retired or renamed.

### Quick index by pipeline stage

| Pipeline stage | Commands / skills |
|---|---|
| Pre-clone (mockup prep) | `/uimax-scrape`, `/uimax-mood-board`, `/uimax-classify-naming` |
| Stage 0 pre-flight | `/sgs-clone`, `/sgs-wp-engine` |
| Stage 1-2 boundary+match | `/sgs-clone`, `/uimax-classify-naming` (heuristic in-module; full dispatch deferred), **`/wp-blocks match`** (cross-check, wired 2026-05-19) |
| Stage 3-5 slot/extract | `/sgs-clone`, `/chrome-devtools-cli`, `/playwright` (fallbacks) |
| Stage 6-7 classify+compose | `/sgs-clone`, `/ui-ux-pro-max` (judgement), `/uimax` (query) |
| Stage 7 emit | `/sgs-clone`, **`/wp-blocks validate`** (post-emit soft-fail validation, wired 2026-05-19) |
| Stage 8-9 serialise+report | `/sgs-clone`, `/sgs-db` |
| **Stage 9c** structured-log surfacing | `/sgs-clone` (wires `surface_pipeline_logs.py`, Spec 20) |
| **Stage 10** per-page deploy | `/sgs-clone --deploy-target page:<id>` (wires `upload_and_patch.py`, shipped 2026-05-19) |
| +DEPLOY +PARITY +REGISTER | `/sgs-clone`, `/uimax-sgs-scrape-pattern`, `/uimax-scrape-animation`, `/sgs-update`, `/playwright`, `/chrome-devtools-cli` |
| Sister pipeline | `/sgs-update`, `/sgs-db` |
| **Framework deploy** (separate from clone pipeline) | **`/wp-sgs-deploy <plugin\|theme\|both>`** — project-scoped skill at `.claude/skills/wp-sgs-deploy/SKILL.md`; absorbed `/deploy-check` as Phase 1 (2026-05-19); renamed from `/deploy` |
| Cross-cutting | `/sgs-db`, `/wp-blocks`, `/wp-hooks`, `/wp-hook-graph`, `/sgs-wp-engine`, **`/wp-pre-merge-gate`** (wraps wp-blocks + wp-hooks + wp-hook-graph; wired 2026-05-19) |

### Per-command/skill summary

- **`/sgs-clone`** -- pipeline entry. `--converter-v2` default TRUE (Wave 1). Non-SGS-BEM halt. Reads/writes sgs-framework.db + ui-ux-pro-max.db.
- **`/sgs-db`** -- cross-cutting reference. CLI at `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py`. Read-only normal usage.
- **`/sgs-update`** -- sister pipeline. Scripts: update-db.py (S1), generate-block-reference.py (S2), sgs-update-uimax-sync.py (S3+4). Now also re-syncs legacy_role_lookup (Wave 3). Writes both DBs.
- **`/uimax-sgs-scrape-pattern`** -- +REGISTER tail. Atomic write to sgs-framework.db.patterns + uimax.patterns. Scripts: pattern-fingerprint.py, pattern-classify.py, pattern-register.py, uimax_write.py + validator.
- **`/wp-blocks`** -- cross-cutting; Stage 2 match cross-check + Stage 7 post-emit validate + Stage 2/3 block attribute lookup. Now exposes `dump` subcommand covering all 3 DBs in ~1500 tokens (added 2026-05-19 for the schema-enumeration discipline safeguard, blub.db row 272 + CLAUDE.md binding rule #4).
- **`/wp-hook-graph`**, **`/wp-hooks`**, **`/wp-perf-gate`** -- auxiliary; wired into `/sgs-update` post-flight hook-audit (2026-05-19) + `wp-pre-merge-gate.py` wrapper.
- **`/sgs-wp-engine`** -- cross-cutting coordinator; Stage 7 block-level questions. **TODO next session:** add `/wp-sgs-deploy` cross-reference (currently the skill lives at `.claude/skills/wp-sgs-deploy/SKILL.md` but `/sgs-wp-engine` SKILL.md doesn't yet route framework-deploy questions to it).
- **`/wordpress-router`** -- WP-domain routing. **TODO next session:** add `/wp-sgs-deploy` to the framework-deploy branch of the routing table.
- **`/wp-sgs-deploy`** -- FRAMEWORK deploy (sgs-blocks + sgs-theme to palestine-lives.org). Project-scoped skill at `.claude/skills/wp-sgs-deploy/SKILL.md` (renamed from `/deploy` 2026-05-19; absorbed `/deploy-check` as Phase 1). Scored 96% on skillscore. Stages: CHECK → BUILD → EXECUTE → CACHE → VERIFY. `--skip-check` flag is staging-only.
- **`/wp-pre-merge-gate`** -- wraps `/wp-blocks health` + `/wp-hooks validate` + `/wp-hook-graph validate` into one advisory gate. Script at `plugins/sgs-blocks/scripts/wp-pre-merge-gate.py` (shipped 2026-05-19).
- **`/ui-ux-pro-max`** / **`/uimax`** -- Stages 6-7 judgement + +REGISTER equivalent_implementations. Backed by ui-ux-pro-max.db.
- **`/uimax-classify-naming`** -- Stage 1 convention classification. Writes uimax.naming_conventions.
- **`/uimax-mood-board`** -- pre-clone multi-URL aggregation; not on standard runs.
- **`/uimax-scrape`** -- pre-clone client design language seeding.
- **`/uimax-scrape-animation`** -- +REGISTER tail animation harvest. Writes uimax.animations.
- **`/chrome-devtools-cli`** -- Stage 4/5 fallback; runtime CSS extraction.
- **`/playwright`** -- Stage 4/5 fallback; production capture via visual_qa_capture.py.
- **`/visual-qa`** -- SIBLING (NOT in /sgs-clone path). Operator-invoked 9-layer audit. 8 JS scripts at `~/.agents/skills/visual-qa/scripts/`. **Known bug:** `run-audit.js:137` calls `responsive-audit.js` but file is `responsive-screenshots.js`.

### Scripts outside the repo (skill/hook scripts)

| Script | Referenced by |
|---|---|
| `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` | `/sgs-db`, `/uimax-sgs-scrape-pattern` |
| `~/.agents/skills/sgs-wp-engine/scripts/update-db.py` | `/sgs-update` Stage 1 |
| `~/.claude/hooks/wp-blocks.py` | `/wp-blocks` |
| `~/.claude/hooks/wp-docs.py` | `/wp-hooks` |
| `~/.claude/hooks/wp-hook-graph.py` | `/wp-hook-graph` |
| `~/.claude/hooks/wp-perf-gate.py` | `/wp-perf-gate` |
| `~/.agents/skills/ui-ux-pro-max/scripts/search.py` | `/uimax`, `/ui-ux-pro-max`, `/sgs-wp-engine` |
| `~/.agents/skills/ui-ux-pro-max/scripts/ingest-extraction.py` | `/uimax` (ingest mode) |

---

## DB heat-map (full) (absorbed from db-tables-map.md, 2026-05-21)

Source: `.claude/db-tables-map.md` (926 lines, generated 2026-05-13, last-verified 2026-05-14). Original doc replaced with redirect stub.

> **Update trigger:** Any table add/remove; any column add/remove/rename; any script that newly reads or writes a table.

### Quick stats

| DB | Tables | Rows | Path |
|---|---|---|---|
| sgs-framework.db | 29 | ~4,050 | `~/.claude/skills/sgs-wp-engine/sgs-framework.db` |
| ui-ux-pro-max.db | 48 | ~10,353 | `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` |

### Stage-to-tables matrix

| Stage | sgs-framework.db | uimax |
|---|---|---|
| 0 | -- | -- |
| 0.1 | -- | naming_conventions (embedded rules; no live query) |
| 0.5 | -- (reads theme.json directly) | -- |
| 1 | slot_synonyms (R) | naming_conventions (reference) |
| 2 | blocks (R via filesystem) | -- |
| 3 | block_attributes (R: canonical_slot, role, derived_selector) | -- |
| 3 (Wave 3) | block_attributes (R: canonical_source annotation) | -- |
| 4 | block_attributes (R: canonical_slot, output_signature) | -- |
| 4 (Wave 3 D3) | attribute_gap_candidates (W: unlifted CSS props) | -- |
| 4.5 | design_tokens (R via theme.json) | -- |
| 5 | block_supports (R) | -- |
| 6 | block_attributes (R), design_tokens (R via theme.json) | -- |
| 9 | attribute_gap_candidates (W) | recognition_log (W), functionality_gap_candidates (W) |
| +REGISTER | patterns (W), block_compositions (W) | patterns (W), component_libraries (R+W) |
| /sgs-update S1 | blocks, block_attributes, block_supports, block_selectors, block_capabilities, design_tokens, style_variations, patterns, theme_parts, hooks, components, plugins, deploy_steps, gotchas, pattern_coverage, block_changes (all W) | -- |
| /sgs-update S2-4 | block_attributes (W: canonical_slot, role), slot_synonyms (W), attribute_gap_candidates (W) | -- |
| /sgs-update S3 | blocks (R), legacy_role_lookup (R, Wave 3) | component_libraries (W) |
| /sgs-update S4 | -- | animations (R for gap report) |

**RETIRED (Step 6b 2026-05-14 -- tables dropped from sgs-framework.db):** sections_detected, extraction_cache, block_opportunities, weaknesses, animations.

**NEW (Wave 3, 2026-05-21):** legacy_role_lookup (17 rows) -- voter LEGACY_ROLE_LOOKUP dict migrated here.

### sgs-framework.db key tables

| Table | Rows | Pipeline use | Writer |
|---|---|---|---|
| block_attributes | 1,349 | Stages 3+4 R; cv2 D3 W attribute_gap_candidates | /sgs-update S1+S4 |
| slot_synonyms | 82 | Stage 1 R; cv2 walker standalone_block routing | seed scripts + gap-detection |
| block_supports | 347 | Stage 5 supports_writer R | /sgs-update S1 |
| property_suffixes | 117 | assign-canonical; cv2 db_lookup.css_property_suffixes() | seed + 2026-05-17 migration |
| blocks | 67 | Stage 2 cross-check; /sgs-update S3 uimax sync | /sgs-update S1 |
| patterns | 41 | Stage 2 confidence boost; +REGISTER W | /sgs-update S1; register_patterns.py |
| block_compositions | 37 | Stage 2 confidence boost; +REGISTER W | register_patterns.py |
| attribute_gap_candidates | 107+ | Stage 9 W; D3 emission W (Wave 3); detect.py R | assign-canonical; detect.py; cv2 D3 |
| legacy_role_lookup | 17 | Voter R via db_lookup (Wave 3) | seed-legacy-role-lookup.py; /sgs-update sync |
| modifier_suffixes | 19 | assign-canonical; drift-validator | seed scripts |
| design_tokens | 28 | Reference; NOT read at clone runtime (reads theme.json) | /sgs-update S1 |
| style_variations | 8 | Reference; NOT read at clone runtime | /sgs-update S1 |

All remaining tables (block_capabilities, block_changes, block_selectors, components, deploy_steps, gotchas, hooks, pattern_coverage, pipeline_corrections, plugins, theme_parts, animation_tokens) are populated by /sgs-update S1 and are NOT read at /sgs-clone runtime.

### uimax pipeline-relevant tables

| Table | Rows | Pipeline use | Writer |
|---|---|---|---|
| recognition_log | 2,779 | Stage 9 W (soft-fail); detect.py R | sgs-clone-orchestrator.py |
| component_libraries | 211 | /sgs-update S3 R+W | sgs-update-uimax-sync.py |
| animations | 63 | /sgs-update S4 gap report R | /uimax-scrape-animation (external) |
| patterns | 5 | +REGISTER W | register_patterns.py |
| naming_conventions | 16 | Reference; static data embedded in lingua_franca.py | /uimax-classify-naming |
| functionality_gap_candidates | 0 | Stage 9 W | functionality-gap-detector.py |
| attribute_gap_candidates (uimax) | 0 | Planned output of attribute-gap-writer.py | (not yet written) |

### Cross-DB sync flows

| Source | Target | Script | Trigger |
|---|---|---|---|
| sgs-framework.db.blocks | uimax.component_libraries | sgs-update-uimax-sync.py S3 | /sgs-update S3 |
| /sgs-clone Stage 9 | uimax.recognition_log | sgs-clone-orchestrator.py | End of every Stage 9 |
| /sgs-clone +REGISTER | sgs-framework.db.patterns | register_patterns.py | +REGISTER tail |
| /sgs-clone +REGISTER | uimax.patterns | register_patterns.py | +REGISTER tail |
| uimax DB | CSV files at ~/.agents/skills/ui-ux-pro-max/data/ | update-db.py regenerate-csvs | After Stage 3 writes |
| uimax.recognition_log (extraction_failed) | sgs-framework.db.attribute_gap_candidates | gap-detection/detect.py | Manual or /sgs-update S4 gap pass |

### Reference-only uimax tables (not read/written by pipeline)

chart_templates (626), design_tokens (5164), google_fonts (1923), app_interface (30), charts (25), colors (269), icon_libraries (225), icons (105), interaction_patterns (30), landing (34), mood_boards/mood_board_items (0), products (161), react_performance (44), stack_* tables (0-60 each), styles (84), typography (74), ui_reasoning (161), ux_guidelines (161), gov_patterns (68), ft_chart_vocabulary (39).
