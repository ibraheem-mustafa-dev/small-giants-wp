# small-giants-wp — Architectural Decisions Log

<!-- ACTIVE — last 50 decisions (compressed format). Older or non-load-bearing → memory/decisions-archive.md. Deleted entries listed in git log only. -->

Append-only. Most-recent first.

---

## 2026-05-25 — qc-council session → consolidated recovery plan + binding rules

**D75 — `/qc-council` 4-rater council validated the consolidated cloning-pipeline recovery plan (Section R of `.claude/reports/2026-05-25-qc-council-issue-register.md`).** Verdict: CONDITIONAL APPROVE pending F1 spike on brand alone before full Phase 1 dispatch. Raters surfaced: (a) F1 needs smallest-slice baseline measurement before Phase 1 dispatch (R4 — ghost-of-2026-05-21-Wave-1 risk); (b) acceptance gate corrected per Bean to per-section ≤30% × 3 viewports for Phase 1, then ≤1% in Phase 1.5; (c) F2 cascade-fold must ship same-wave as F1 (R4 — ghost-of-2026-05-24 regression); (d) ~17 commits per Phase 1 with /qc-council gate between high-leverage commits (per blub.db row 288 captured this session); (e) 1G G5 per-block fixes made CONDITIONAL not pre-committed (R1 — Spec 16 §15 line 982 says G5 dissolves if walker is universal); (f) 0B allowed-nesting AUTO-DERIVED from block_attributes + slot_synonyms + block_capabilities not hand-curated; (g) 1D `count_stars` replaced via universal COUNT-children-by-slug not "special extractor kind". Gaps R3 raised (state-based CSS, modifier CSS, multi-class selectors, G4) all confirmed COVERED by existing DB schema (modifier_suffixes state-kind rows + property_suffixes hover suffixes + naming_conventions SGS-BEM regex) OR resolved (G4 per Spec 16 §14.4). Plan = `.claude/plans/2026-05-25-phase-1-universal-extraction.md` (Section R promoted to canonical phase plan).

**D74 — Phase 1 scope = consolidated qc-council recovery plan (universal-extraction backbone).** Phase 1 ≠ a single step; it's the full architectural solution to every gap the qc-council surfaced (F1 universal-nesting + extended DB-driven ATOMIC_TAG_MAP + universal child-block extraction + universal array-attr extraction + G3 visual slot extraction + G1 OPEN-block for FR1 composites + conditional G5 per-block + sgs/quote render.php β-migration + patterns.block_composition population + pattern fast-path + cheat removal). Phase 2 (header/footer cloner) is parked because it depends on a working body pipeline. Acceptance: per-section ≤30% × 3 viewports for all 7 body sections. Subsequent Phase 1.5 closes per-section to ≤1%, after which Phase 2 opens. Old phase-1 plan archived at `.claude/plans/archive/2026-05-24-phase-1-structural-recovery-superseded-by-phase-1-universal-extraction.md`.

**D73 — Phases never ship as single commits (binding rule).** Captured as blub.db row 288 / `feedback_phases_never_ship_as_single_commits.md`. Every major task in any Phase commits separately with: (a) `/qc-council` or `/qc-inline` pre-commit gate; (b) living-docs updates per trigger table; (c) `/sgs-clone --debug-trace` + Stage 11 measurement comparing pre/post; (d) commit message citing predicted vs actual delta. Per-task skill bindings: `/subagent-driven-development` + `/delegate` + `/verify-loop` + `/capture-lesson`. Sibling rules: blub.db row 255 (multi-model /qc per converter commit) + row 276 (council fix-shapes are hypotheses) + P20 (one fix at a time). Anti-pattern of record: 2026-05-24 second-pass session (5 changes shipped as one wave, regressed pixel-diff 70.5% → 73.9%, regression unattributable).

---

## 2026-05-25 — sgs/trust-bar block retired; universal-nesting takes over

**D72 — sgs/trust-bar block retired in favour of universal-nesting via canonical primitives.** Block source files deleted (`src/blocks/trust-bar/`, `build/blocks/trust-bar/`). DB rows deleted across 9 tables (69 rows in sgs-framework.db, 1 in uimax.component_libraries). Hardcoded special-case removed from `confidence-matrix.py` COMPOSITE_PRIORITY, `seed-legacy-role-lookup.py` ENTRIES (2 rows), `lingua_franca.py` slot_map, `generate-markup-examples.py` composites set, `BlockDeprecationsTest.php` AFFECTED_BLOCKS, `blocks.spec.ts` block list + markup test fixture, `test_ensure_root_section_class.py` self-closing test (switched to sgs/notice-banner). Block was a duplicate concept: counter use-cases now use sgs/counter (canonical single-counter block); badge use-cases now emit via universal-nesting (sgs/container > sgs/label children, with the converter resolving `__badge` BEM elements to sgs/label via `slot_synonyms.standalone_block`). Mama's homepage Stage 11 results post-retirement (run `mamas-munches-homepage-2026-05-25-101222`): trust-bar pixel-diff 375 87.4% → 37.0% (-50.4pp); 768 51.6% → 24.6% (-27.0pp); 1440 100.0% → 33.1% (-66.9pp). Mean page diff 68.4% → 63.2%. Remaining trust-bar gap is styling-shape (sgs/label badge render vs mockup span+svg shape) — block-level extensions territory, not block-level special-cases. critical-fix-verification flagged `no_canonical_block_mutation` as false-positive from uncommitted source deletions; cleared at commit.

---

## 2026-05-25 — Step 1.7 G3 reframing (architectural correction after D70)

**D71 — Step 1.7 G3 reframed: pixel-diff side closed by D70; failure-count side empirically misframed; universal-nesting (§15) is the canonical closure path.** Multiple earlier prescriptions in Spec 16 §14.3, §15 row 977, Phase 1 plan Step 1.7, and `.claude/next-session-prompt.md` (all from same-day patches earlier on 2026-05-25) pointed Step 1.7 at file paths that didn't exist (`slot_list.py`) then at `convert.py:_slot_attr_prefix` extension. A Sonnet implementer ran the prefix fix end-to-end and demonstrated empirically it addresses only 7 of the 473 `extraction_failed` events — 440 of which are legitimate `value_empty` for features genuinely absent from mockups (hover states, bgVideo, transitionDuration). The original `<30` failure-count gate is unachievable without semantically falsifying absent features. The operational symptom G3 was meant to close (pixel-diff regression on body sections) was closed independently by D70 (Stage 10 inline-CSS deploy). All four docs re-framed in this commit. Lesson captured at `feedback_read_full_spec_before_proposing_architectural_fix_shape.md` (blub.db row `capture-f9063d258798`). Sub-rule: when patching specs to correct file-path drift, fix paths ONLY — do not bundle unverified fix-shape prescriptions into the same patch (that converts drift correction into drift introduction). Step 1.8 (universal-nesting / G1 extension to non-hero composites) absorbs the residual failure-count work.

---

## 2026-05-25 — Stage 10 inline-CSS deploy (closes 4-section pixel-diff regression)

**D70 — Stage 10 (`upload_and_patch.py`) now deploys `variation-d0-d2.css` as an inline `<style>` block prepended to the page's `post_content` (wrapped in `wp:html` so Gutenberg preserves it across edits).** Closes the architectural gap where the 4-destination CSS router (Spec 16 §FR6) wrote correctly-scoped D0/D2 rules to `pipeline-state/<run>/variation-d0-d2.css` but Phase 5a's snapshot-only deploy never moved them off-disk. Result on Mama's homepage: Stage 11 mean 74.1% → 68.4% (-5.7pp), with localised body-section drops of -15 to -41pp (gift-section -39pp at desktop, social-proof -40pp at desktop, ingredients -22pp at mobile). Header at 375px regressed +59pp due to pre-existing duplicate-header issue (mockup header now visible alongside framework header part) — separately tracked at parking entry `P-DUPLICATE-HEADER-EXPOSED-BY-INLINE-CSS-FIX`, resolves at Phase 2 (header+footer cloner). Rules already scoped via `.page-id-N` prefix in router output → no cross-page leak. Spec 16 §FR6 D2 description updated. Pipeline-stages doc updated. ~20-line addition at `upload_and_patch.py` after block_markup image-URL patching, before extract.patched.json write.

---

## 2026-05-25 — Doc-op programme: adoption surface + hook + council remediation

**D66 — PostToolUse hook `docscore-on-doc-edit.py` shipped.** Auto-runs `docscore.py` on every Write/Edit to in-scope `.claude/`/`specs/`/`plans/` markdown. Silent on pass; advisory to stderr when score < 90% Grade A-. Registered in `~/.claude/settings.json` under the existing `Write|Edit` PostToolUse matcher. Out-of-scope dirs (memory/, scratch/, reports/, .git/) skipped at the hook level for parity with docscore's own scope rule. Means future doc edits get scored automatically without operator-remembered docscore invocation.

**D67 — Adoption-surface updates across global + project + working-area.** Phase 13 standards now propagated to every surface that drives behaviour:
- `~/.claude/CLAUDE.md` (global) — added `## Doc-op standards (2026-05-24)` 12-line section listing all 17 canonical doc-types + 6 rules
- `~/.claude/commands/handoff.md` — added `Gate 4.6 — Docscore on changed in-scope docs` between Gate 4.5 and Gate 4.8 + parking.md shape check in Gate 4.5
- `~/.claude/skills/autopilot/SKILL.md` — added `docs/doc-op/docscore/template/frontmatter` row to Domain Classification + strategic/phase-plan preload rule in Stage 0
- `<project-root>/CLAUDE.md` — added `## Doc-op standards (Phase 13 close, 2026-05-25)` 11-line section pointing at D57-D65 + 4 per-session rules
- `~/.agents/skills/subagent-prompt/SKILL.md` — fixed stale "11 doc types" → "17 doc types"
- `.claude/CLAUDE.md` (working area) — updated D57-D60 reference to D57-D65

**D68 — /qc-council triangulated 3 high-confidence template fixes (applied):**
- T1 (over-engineering): 4-layer Verification was mandatory on every step. Now conditional — `Happy:` + `Outcome:` always; `Edge:` + `Fail:` + `Integration:` only on `Marker: QA` steps OR steps where `Files:` touches live infra (SSH/DB/REST/deploy). "N/A" acceptable elsewhere. Drops phase-plan writing overhead ~40% on simple plans.
- T2 (functional bug): templates declared `required_sections: []` empty while prose said certain sections were mandatory. Mandatory sections now in YAML: strategic-plan `[Out of scope, Phase overview]`, phase-plan `[Pre-conditions, Parking lot]`. Docscore checks now machine-enforce.
- H1 (ADHD Rule 3 alignment): strategic-plan frontmatter gains `motivation:` field — re-entry after 7+ days surfaces "why this matters".

5 active plan docs updated with the new mandatory sections (Out of scope + Phase overview on strategic; Pre-conditions + Parking lot on each phase) — all 5 still 100% Grade A.

## 2026-05-25 — Doc-op programme: strategic-plan + phase-plan templates (merged from skill spec + research)

**D65 — `strategic-plan` and `phase-plan` doc-type templates created** in `~/.agents/skills/shared-references/doc-templates/`. Built by merging OUR skills' learned output specs (`strategic-plan` plan-template + `phase-planner` 14-field step block) with research-distilled rules (PMI / SAFe / Shape Up / OKR / Stage-gate / DevOps runbook / Ansible / Claude Code best practices).

**Strategic-plan template** keeps OUR sophistication (Work Units with Files/Depends/Blocks/Estimate/Risk/checkbox Steps/VERIFY, GATE blocks with Pass/Fail/Decision, Effort Summary + Session Plan tables, Hidden Decisions pass, per-phase handoffs) AND adds RESEARCH anti-pattern fixes (mandatory `timebox` frontmatter field per Shape Up, mandatory `## Out of scope` section per Shape Up + Stage-gate, ROAM risk-status enum per SAFe, dependency owner column per SAFe, phase overview table ≤13 rows per PMI, problem statement ≤200 words).

**Phase-plan template** keeps OUR sophistication (Plan-Level Label `[PLAN: opus|sonnet|blub]`, USP / Aggregate cost in phase header, 4-layer Verification block — Happy/Edge/Fail/Integration, Marker enum — SESSION-START/HANDOFF/QA, Cold-Entry + Prompt fields for subagent dispatch, Tooling Index table) AND adds RESEARCH additions (mandatory `## Pre-conditions` checklist BEFORE start, per-step `Pre-condition:` + `Rollback:` fields completing the PAVR shape, mandatory `## Parking lot` section even if empty, no-shared-file-parallel HARD GATE via Files-field cross-check, cold-prompt-readiness rule for parallel-dispatched steps).

**Verification:** 5/5 project plan docs score 100% Grade A against the new templates. Total 15/15 in-scope docs now passing at 100% A (CLAUDE / parking / mistakes / decisions / dev-setup / cloning-pipeline-stages / spec 17 / spec 21 / 2 archived plans / 5 active plans).

Full research: `~/.openclaw/workspace/memory/research/2026-05-24-strategic-plan-and-phase-plan-best-practice.md` (11 cited sources). Skill output specs (`strategic-plan/references/plan-template.md`, `phase-planner/SKILL.md` Step Format) remain as-is for now — next session can update them to emit the new mandatory sections automatically.

## 2026-05-24 — Doc-op programme: docscore.py technical-debt close-out

**D64 — 10 SonarLint warnings on docscore.py closed (cognitive complexity + dead-code).** Per Bean's "nothing parked" rule: refactor extracted 11 helper functions (`_coerce_fm_scalar`, `_find_fm_end`, `_detect_doc_type_from_path`, `_warn_doc_type_constraint`, `_score_folder_json`, `_score_folder_human_subprojects`, `_score_folder_human_flat`, `_resolve_walk_root`, `_build_doc_context`, `_registry_missing_paths`, `_group_by_subproject`, `_score_paths_human`). `parse_frontmatter` cc 25→≤15; `detect_doc_type` cc 16→≤15; `score_folder` cc 49→≤15. Removed 5 Unicode-box-drawing section dividers SonarLint flagged as commented-out code. Removed unused `current_key` variable. Behaviour preservation gate verified: 10/10 in-scope docs still 100% Grade A; adversarial back-door test still rejects. Lives in `~/.agents/skills/shared-references/docscore.py` (1168 → 1185 lines = +17 net for the helpers).

## 2026-05-24 — Doc-op programme: doc-type back-door close + skill alignment

**D62 — doc_type self-declaration back-door closed in `docscore.py`.** Per qc-council Rater B finding (2026-05-24): any file could declare `doc_type: spec` in frontmatter and bypass spec-only checks. Fix: spec/archived-plan/dev-setup templates gain `filename_glob` + `required_dir` + `required_grandparent_dir` fields. `detect_doc_type` validates these constraints before honouring a declared doc_type; mismatches emit stderr warning + fall through. `reference` catch-all has no constraints (any doc can claim it). Adversarial tests pass: `doc_type: spec` on non-numbered or wrong-dir files rejected. Off-tree commit in `~/.agents/skills/shared-references/docscore.py` + 3 template files.

**D63 — Doc-touching skills aligned to Phase 13 standards.** Audit (Sonnet subagent 2026-05-24) of every doc-producing skill/command found 4 minor + 3 major drifts from the new templates. All 7 fixed in `~/.claude/skills/` + `~/.agents/skills/`:
- `docscore` command: doc-type list updated 11 → 15 (added archived-plan, dev-setup, reference, spec)
- `spec-writer` output-templates: status enum 6 → 8 values (added superseded, retired)
- `spec-writer` CLAUDE.md template: rewritten to reference Karpathy R1-R7 rules (≤80 lines, ≤5 IMPORTANT markers, verb-first, no inferable knowledge, hooks over repeated rules)
- `phase-planner`: `doc_type: plan` → `doc_type: archived-plan` for completed phases
- `project-init`: Phase 0 scaffold expanded 13 → 14 items (added `dev-setup.md`)
- `strategic-plan` plan-template: added YAML frontmatter stub with status enum
- `project-consolidate`: scaffold count 13 → 14; added Phase 13 doc-type addendum (archived-plan / dev-setup / reference + scope rule excluding memory/scratch/reports)

`capture-lesson` + `handoff` command + `gap-analysis` + `qc-council` already aligned (shipped earlier this session). 8 doc-touching skills/commands verified in-sync.

## 2026-05-24 — Doc-op programme: Phase 13 full /docscore rule integration

**D60 — Phase 13 expanded: U5 + X1 + X5 checks added to docscore.py + 5 doc-type templates rewritten to Phase 6c canonical shape.** Built on D59 by recovering U1-U8 / X1-X5 rule spec from `2774a269` (dropped by `3488b537`'s prompt update). Lives in `~/.agents/skills/shared-references/`. Template gains `meta: dict` field; `check_heading_hierarchy` honours per-template `require_h1: false`; 3 new checks: `check_no_dead_links` (U5), `check_registry_resolves` (X1), `check_memory_md_size` (X5). Verified: parking=100% A, next-session-prompt=100% A, decisions=79% B-, handoff=68% C, mistakes=69% C. Commit `3488b537` + this session.
Status: active

---

## 2026-05-24 — Doc-op programme: parking restructure + spec relocation + retention policy

**D57 — Parking.md formatting v2 (Phase 6c).** 6 stable taxonomy buckets replace date-ordered sections; every entry carries `**Status:**` field (OPEN/PARTIAL/BLOCKED/DEFERRED); slug-uniqueness gate added to `/handoff`. 103 active entries (was 135). Commits `52e34171` + `ed05757f` + session close.
Status: active

**D58 — Spec relocation (Phase 9C').** `.claude/specs/` = project-scoped framework specs only; cross-cutting specs → `~/.claude/specs/`. Comparator reports → `reports/`. Strategy/staging docs → `plans/strategy/` or `plans/archive/`. 33 → 19 specs. Commits `ed05757f` + `e8958433`.
Status: active

**D59 — Per-doc-type retention TTL on `.claude/memory/` (Phase 7 F4).** `next-session-prompt-*.md` → 30-day TTL; `handoff-*.md` → 60-day TTL; everything else permanent. Encoded in `docs-registry.yaml`. Commit `c23d8948`.
Status: active

---

## 2026-05-24 — Source-DB retirement: blocks.db + hooks.db deleted (architecture-staging Phase 1 close-out)

**D56 — Standalone source DBs deleted; data migrated into sgs-framework.db with `source` column.** `blocks.db` (459 KB) + `hooks.db` (24 MB) + 623 MB caches deleted. Back-filled 122 variations + 331 markup_examples + 187 hooks. Read paths ported: `wp-blocks.py`, `wp-docs.py`, `sgs-update-v2.py` Mode A/Stage 3. Mode A now graceful no-op when cache absent. ~647 MB disk recovered. New lessons: `feedback_data_migration_needs_read_path_port.md` + `feedback_shipped_claims_need_grep_verify.md`. Commit this session.
Status: active

---

## 2026-05-24 — `block_compositions` table merged into `patterns.block_composition`

**D55 — Pattern composition data moved from standalone `block_compositions` table → `patterns.block_composition` JSON column; standalone table dropped.** 35 of 37 rows ported (2 orphans dropped). Writers ported: `pattern-register.py` + `seed-block-compositions.py`. Composition data remains write-only at /sgs-clone runtime; parent-child relations still read from `blocks.parent_block` + `slot_synonyms.standalone_block`. Commit this session.
Status: active

---

## 2026-05-24 — BEM-is-canonical walker + Stage 4 wiring

**D48 — BEM element name IS canonical signal for block recognition; HTML tag is rendering shape only.** Tag-based routing (`canonical_for_html_tag`) reverted — created second canonical path conflicting with BEM-as-canonical. Correct fix: data-layer (move "quote" alias in slot_synonyms); zero walker code changes. Commit `124e1d06` area.
Status: active

**D49 — Walker code stays universal; data-layer drives recognition.** Zero per-tag/per-block/per-section hardcoding in walker composite_element + section_inner_absorb branches. All recognition from slot_synonyms.aliases + standalone_block + block_attributes. Adding new block recognition = DB rows, not walker edits. Commit this session.
Status: active

**D50 — `/sgs-update` Stage 1 tail invokes `assign-canonical.py`.** Script was never wired into `sgs-update-v2.py` despite Spec 16 §12.6 Stage 4 declaring it. Fix: `stage_1_sgs_codebase_scan()` calls `assign-canonical.py` as subprocess after scan. Future runs auto-populate `canonical_slot` for new array attrs. Commit this session.
Status: active

**D51 — `assign-canonical.py` array-attr fallback: singularise + Tier B registered-block reverse-lookup.** Plural collection attrs (`testimonials`, `logos`, etc.) missed slot_synonyms. Fix: singularise (ies→y, ses→s, trailing s) → Tier A alias lookup → Tier B `sgs/<singular>` registered-block reverse-lookup. No hardcoded attr-name list. Commit this session.
Status: active

**D52 — Transparent-wrapper absorb at section root (one-section-one-container).** Walker pre-pass `_absorb_transparent_wrappers()` runs before `walk()` for top-level sections. Absorbs single direct-child wrapper when it has no block-spacing or positioning CSS AND isn't a registered SGS composite block. 4 single-wrapper Mama's sections → ONE outer sgs/container. FR1-matched sections correctly skipped. Commit this session.
Status: active

**D53 — Brand mockup BEM renamed for Spec 00 consistency.** `<blockquote class="sgs-brand__body">` → `<div class="sgs-brand__quote">`; `<footer>` → `<p class="sgs-brand__attribution">`. Tag choice doesn't affect block emit; BEM element makes draft a clean Spec 00 reference. Commit this session.
Status: active

**D54 — ARRAY_LIFT_PATTERNS hardcoded dict deletion DEFERRED.** Universal BEM-child array lifter (1e-B) now resolves via canonical_slot but doesn't yet replicate: (a) `count_stars` extractor for ratings, (b) multi-selector fallback chains. Full removal parked as P-ARRAY-LIFT-PATTERNS-FULL-MIGRATION. (no commit — planning-only)
Status: active

---

## 2026-05-24 — Step 1.6 wp-sgs-developer audit

**D46 — Walker pre-pass addresses Stage 4 emit shape, not Stage 2 match.json confidence.** `_walker_pre_pass` (commit `124e1d06`) changes WHAT Stage 4 emits but NOT Stage 2 confidence — confidence_matrix.py runs before Stage 4 independently. Phase 1 plan gate (condition c: match.json confidence < 0.5 → 0 sections) cannot be met by a Stage 4 fix alone. Resolution parked as P-MATCH-JSON-GATE-REDEFINITION.
Status: active

**D47 — Structural improvement + visual regression coexist when CSS lift is pending.** A structurally correct emit can INCREASE pixel-diff relative to a structurally wrong emit if per-block CSS hasn't been lifted yet. This is NOT a reason to revert structural fixes — it is a reason to sequence CSS lift as step+1 in the same session. Never commit structural fix without CSS lift following immediately. Commit `124e1d06`.
Status: active

---

## 2026-05-23 — Diagnostic + fix session (Q1A / Q1B / Q3 / Stage 10 / Stage 11)

**D41 — `core/group` → `sgs/container` as Stage 2 confidence-matrix fallback.** `core/group` has no SGS-BEM attributes; commit `d8ae4a2a` changes fallback to `sgs/container` (universal SGS layout primitive). `legacy_role_lookup` gains one row (18 total). Aligns with D3 (2026-05-20).
Status: active

**D42 — Hand-authored patterns deleted; deterministic-only rule enforced.** `brand.php` + `ingredients-section.php` deleted (commit `c1aa4cc5`). Pattern count: 53 (was 55). Hand-authored patterns bypass the converter and allow a second source of truth — forbidden.
Status: active

**D43 — Stage 0.7 CSS dump relocated from `theme/sgs-theme/styles/<client>.css` to `pipeline-state/<run>/variation-d0-d2.css`.** Conflating pipeline intermediates with deploy artefacts was architectural debt. Post Phase 5a, `styles/` directory contains only framework-level CSS. Status: in progress / commit pending from 2026-05-23.
Status: active

**D44 — Stage 10 silent-failure fix: named exit codes 4/5/6.** commit `700ff211` adds exit 4 (phantom page), exit 5 (id-mismatch), exit 6 (no-id-in-body). Silent Stage 10 failures would cause Stage 11 to diff against stale content.
Status: active

**D45 — Stage 11 added: per-section pixel-diff against actual deployed page.** Commit `1331f23a`. Stage 8 = pre-deploy autonomy gate (locally-rendered HTML); Stage 11 = post-deploy verification (live WP render). Together they close the full loop. Output: `pipeline-state/<run>/stage-11-pixel-diff.json`.
Status: active

---

## 2026-05-22 — Architecture programme close-out (Phase 4 + Phase 7 + parking sweep)

**D37 — Source 2 counter gates on extraction-count, not insert-count.** `s2_extracted > 0` is canonical Mode B Source 2 health signal (insert-count stays zero on dry-run). Commits `9f1e2194` + `99081252`.
Status: active

**D38 — Source 4 calibration threshold tightened (100 → 30).** Live test: page returns 91 rows with simple HTTP fetch — below old threshold. `playwright-fetch.js` created for JS-render step.
Status: active

**D39 — GitHub PAT format: classic `ghp_*` required for Mode B.** Fine-grained tokens returned 401 on Source 5 (GitHub API). Classic PAT with `public_repo` scope succeeds. PAT stored in `~/.openclaw/.env` as `GITHUB_PERSONAL_ACCESS_TOKEN`.
Status: active

**D40 — Council predictions are hypotheses; empirical gate mandatory before treating as specs.** Wave 1 G2+G4 fixes produced zero pixel-diff movement despite correct implementation — fix-shape proposals targeted wrong code paths. Rule: any council output proposing a fix shape requires empirical-validation step before subagent dispatch. blub.db row 276.
Status: active

---

## 2026-05-22 — Phase 1.5 inserted + Phase 2 parser strategy change

**D32(arch-staging) — Phase 1.5 inserted: block variations + styles.** 67 of 69 SGS blocks had zero inserter-discoverable variations. Phase 1.5 authors 12 composite blocks × 2-4 variations × 2-3 styles each via PHP sibling files in `includes/variations/`. Plan: `.claude/plans/phase-1.5-variations-styles-default-styles.md`. (no commit — planning-only)
Status: active

**D33(arch-staging) — Phase 2 parser strategy: runtime enumeration, not source parsing.** Static PHP source parsing crashed twice. Replacement: `wp eval` against live WP block type + styles registry (`WP_Block_Type_Registry` + `WP_Block_Styles_Registry`). Canonical going forward — any future variation/style indexing reads runtime state.
Status: active

---

## 2026-05-21 — Architecture session (31-decision holistic redesign)

**D27 — DB consolidation: three databases merged into sgs-framework.db with `source` column.** wp-blockmarkup-mcp blocks.db + wp-devdocs-mcp hooks.db + sgs-framework.db → one DB. `docs` table extended with `doc_type='cli-command'`; `indexed_files` added for incremental `/sgs-update`. Shipped 2026-05-24 (was Phase 1 target). See `.claude/plans/2026-05-21-architecture-staging.md` §3 D1,2,11.
Status: active (shipped)

**D28 — Style-variation system killed; per-site theme.json adopted.** 9 client variation JSONs replaced with per-client `sites/<client>/theme-snapshot.json`. Three PHP files deleted; new `push-theme-snapshot.py` CLI deploys snapshots. Commit `43a93df9`. See staging doc §3 D14′,16′,17′,18,19.
Status: active (shipped)

**D29 — INNER_BLOCK_PATTERNS dict retired; DB-backed lookup.** Hardcoded two-entry dict replaced by `blocks.parent_block` + `slot_synonyms.standalone_block` DB lookups. Adjacent-slot grouping added. Phase 0 data seeding: commit `aec54882`. See staging doc §3 D3,4,5,6,12,24.
Status: active

**D30 — Button presets migrated to native WP 7.0 theme.json.** WP 7.0 natively generates 100% of `--wp--custom--button-presets--*` props from `theme.json`. `class-button-presets-admin.php` deleted; `wp_options[sgs_button_presets]` absent on sandybrown. Commit `60220b13`.
Status: active (shipped)

**D31 — Structural QC enforcement hook wired.** PostToolUse hook at `.claude/hooks/qc-on-converter-edit.py`. Fires when Write/Edit targets `converter_v2/convert.py` or `sgs-clone-orchestrator.py`. Commit in staging doc §11 D31.
Status: active

**D34 — Lucide icons refactored to WP 7.0 Icons REST controller (Phase 6).** Consumers get unified REST endpoint instead of bespoke resolution code. CAUTION: `wp_register_icon_collection` does NOT exist on WP 7.0 despite `WP_REST_Icons_Controller` existing — research correct entry point before implementing. See staging doc §11 D28.
Status: active (pending)

**D35 — Customiser migration of header/footer/site-info admin with View Transitions (Phase 5b).** New PHP classes `Sgs_Header_Customiser` + `Sgs_Footer_Customiser` + `Sgs_Site_Info_Customiser`. Pattern follows `Sgs_Floating_UI_Customiser`. Commit `60220b13`. See staging doc §3 D21,27.
Status: active (partially shipped — see D22/D23 Session B)

**D36 — WP 7.0 alignment audit for 10 wp-* skills (Phase 7).** Checks: deprecated API refs, missing WP 7.0 APIs, stale code examples across `wp-block-development`, `wp-block-themes`, `wp-interactivity-api`, `wp-plugin-development`, `wp-rest-api`, `wp-wpcli-and-ops`, `wp-performance`, `wp-abilities-api`, `wp-site-extraction`, `wp-project-triage`. See staging doc §11 D29.
Status: active (pending)

---

## 2026-05-21 — QC trio + skill cleanup + Wave 2 reshape

**D21(skill) — `/qc-council` created as empirical-validation gate before subagent dispatch.** 8-stage protocol: DETECT → LOAD GROUND TRUTH → SEED PERSONAS → DISPATCH → DEBATE → EMPIRICAL VALIDATION (HARD GATE, blub.db row 276) → EXPERIMENT DESIGN → IMPLEMENTATION → REPORT. Skillscore 92% A-. (no commit — skill file)
Status: active

**D25 — `/gap-analysis` Step 7.75 delegates to `/qc-council`.** Primary path replaces ~80 lines of duplicate 3-rater panel logic. `qc_review` JSON schema preserved for backwards compatibility. (no commit — skill file)
Status: active

**D26 — Wave 2 reshape: G1+G3+G5 are ONE wiring gap, not three problems.** `/wp-blocks dump` confirmed all mapping data exists in sgs-framework.db. G1+G3+G5 symptoms all from same gap: cv2 doesn't walk all classes + assign CSS ownership + record parent-child relations using existing DB tables. FR1 fast-path "fix" = one-line consistency add; not hero-special. (no commit — diagnosis)
Status: active

---

## 2026-05-20 — Phase 1 Spec 16 §FR6 rewrite + Phase 2 future capabilities

**D1(2026-05-20) — Path A: site-wide variation activation (NOT per-page meta override).** Stage 10 activates variation via `set_theme_mod('active_theme_style', $slug)` site-wide. Per-page override (Path B) rejected — each client gets own WP install in production; multi-client-on-one-install is not a real scenario. Commits `8ceb8787` + read-back confirmation + exit-3 failure surface.
Status: superseded-by-D28 (style-variation system killed 2026-05-21)

**D2(2026-05-20) — Token-snap requires strict exact-match.** Nearest-match snap caused visible regressions. Per Bean's binding: "if value matches global default, use token; if not, insert literal." ΔE2000 ≤ 1.0 for colour; ≤ 1px for spacing/font-size. Commit `8a996194`.
Status: active

**D3(2026-05-20) — Spec 16 §FR6 four-destination CSS router replaces verbatim Stage 0.7 dump.** `css_router.py` routes every CSS rule to D0 (global) / D1 (typed-attr-lift) / D2 (wrapper-CSS scoped) / D3 (gap-candidate). Every rule routes to exactly one destination — no silent drops. Commits `05fb38a4` + `44ba373b` + `dce5a496`.
Status: active

**D4(2026-05-20) — Header/footer/nav structural defence-in-depth (two layers).** Tool layer: PostToolUse hook `no-header-footer-block.py` blocks Write/Edit on `src/blocks/(header|footer|nav)/` (commit `8838b6fb`). Source layer: `_is_chrome_section()` in Stage 9b detects chrome at 4 boundary signals (commit `3a70587c`).
Status: active

**D5(2026-05-20) — Attribute-gap promotion is end-of-line cleanup, NOT primary pixel-diff path.** 3-rater council confirmed promotion closes last 5-10%; dominant 50-85% gap is structural (G1-G5). Ship G1-G5 + F5 FIRST. See `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md`.
Status: active

**D6(2026-05-20) — Block-variation system uses native WP `register_block_variation()`.** Confidence 0.70-0.90 against existing block + attribute differences → emit `wp:sgs/<block> {variantStyle:'featured'}`. PHP loader at `includes/variations/class-sgs-block-variations.php` auto-discovers `sgs-*.php` files. Commit `36ef9552`.
Status: active

---

## 2026-05-19 — cv2 RCs + deploy consolidation + Stage 10 + skill rename

**D1(2026-05-19) — `/deploy` → `/wp-sgs-deploy` rename + `/deploy-check` absorbed as Phase 1.** Three deploy concepts conflated. New canonical homes: `/wp-sgs-deploy` (framework + checklist), `/sgs-clone --deploy-target page:<id>` (per-page). `--skip-check` flag for trusted micro-patches.
Status: active

**D2(2026-05-19) — Stage 10 wired: per-page deploy in cloning pipeline.** `upload_and_patch.py` wired as Stage 10 with `--deploy-target page:<id>` / `post:<id>`. Fires after Stage 9c; soft-fails. Commit referenced in skill.
Status: active

**D3(2026-05-19) — All 10 static SGS blocks converted to dynamic.** Mixing static + dynamic caused "invalid block" errors in cv2 (self-closes only valid for dynamic). `_STILL_STATIC_SGS_BLOCKS = frozenset()`. Deprecated.js shims for backward compat. Commit batch 1 + 2 this session.
Status: active

**D4(2026-05-19) — Container block is canonical advanced-background wrapper.** Hero block.json dual-cascade anti-pattern removed. Container extended with 4 background modes (Image, Video, Animation incl. parallax + ken-burns, Overlay incl. gradient). 15 new attrs. Hero defaults removed.
Status: active

---

## 2026-05-19 — Spec 17 Header/Footer Architecture (Waves 1+2+2.5+3) — summary

**D(spec17) — CPT REST gating: `sgs_header` + `sgs_footer` CPTs require `edit_theme_options` for REST access.** Anonymous REST calls return 401. File: `includes/class-sgs-block-cpts.php`. Variation picker uses resolver-only `_resolve_global_styles_post_id()` path (single direct DB lookup, cached). Two-layer ReDoS guard on rules engines: 256-char input cap + static blocklist of catastrophic-backtracking constructs.
Status: active

---

## 2026-05-18 — P-WP-ALIGNMENT-WIDTH-SYSTEM shipped

**D(width-system) — cv2 pipeline targets WP PAGES not POSTS; `widthMode` infrastructure built.** Posts use `single.html` (max-width 800px); pages use `page.html` (no constraint). 14.3-point pixel-diff drop from this single change. New `widthMode` enum (default/wide/full/custom × per-viewport) on sgs/container; converter maps mockup max-width → semantic widthMode or literal. Commits `c7f42003` + `86172812`.
Status: active

---

## 2026-05-17 — Universal recognition + conversion session close

**D(a-2026-05-17) — `parse_css` regex was the single biggest recognition hole.** Old regex matched 0 of 13 `@media` blocks (whitespace between rules). Replaced with brace-balanced scanner. 13/13 media blocks captured; hero `headlineFontSizeDesktop` now 58 (was 34). Commit `20ef1d66`.
Status: active

**D(b-2026-05-17) — DB-first lookups, no hardcoded dicts.** `_CSS_PROP_TO_SUFFIX` (21 rows) replaced by `db.css_property_suffixes()` reading `property_suffixes` table (117 rows). `_BREAKPOINT_SUFFIXES` replaced by `db.breakpoint_suffix_rules()`. blub.db row 260 + Rule 11 HARD-GATE in `/sgs-clone`. Commit `168fd2ca`.
Status: active

**D(c-2026-05-17) — Walker preserves SGS-BEM grouping wrappers.** Non-top-level `sgs/container` with `bem.element` set AND inner blocks → preserve as nested `sgs/container` with className. Pass-through still fires for unnamed wrappers. Commit `df3a6cbf`.
Status: active

**D(function-exists) — `function_exists()` guards universal on all render.php top-level helpers.** "Cannot redeclare" fatals recurred. Every top-level function in any render.php MUST be wrapped in `if ( ! function_exists() ) { ... }`. Applied to all helpers.
Status: active

---

## 2026-05-16 — Spec 16 Phase 8 session: accuracy + universality

**D(phase8-b) — Slot→standalone-block routing is DB-driven, not code-driven.** `slot_synonyms.standalone_block` column added; hardcoded `SLOT_TO_STANDALONE_BLOCK` dict removed. Migration: `migrations/2026-05-16-slot-synonyms-standalone-block.py`.
Status: active

**D(phase8-h) — WP `file:` render wrapper discards return values (CRITICAL).** `_wp_block_render_callback_from_file()` wraps file in its OWN `ob_start()` + `ob_get_clean()`. File's return value is thrown away. render.php MUST echo directly via `printf()` / interleaved `<?php ?>` HTML — never `return ob_get_clean()`.
Status: active

---

## 2026-05-14 — Spec 16 decisions (core architecture)

**D(spec16-2) — "CSS drives emission, never drop" (R5 re-architected).** 3-destination routing: (1) typed-attribute lift, (2) markup wrapper with className, (3) attribute_gap_candidates row. Every CSS rule MUST hit one destination. Converter self-extending via Spec 15 §4.2 table.
Status: active

**D(spec16-3) — sgs/container is MANDATORY at section-level, AVAILABLE elsewhere.** Auto-emission only at top-level section boundary. Nested wrappers pass through UNLESS CSS rules target them (then emit per Destination 2).
Status: active

**D(spec16-9) — Parallax scroll NOT applicable to logo / icon / header blocks.** Parallax-on-logo breaks visual anchor; parallax-on-header breaks sticky/transparent behaviour + causes jank. `supports.sgs.parallax` is opt-in but MUST NOT be wired for `sgs/responsive-logo`, `sgs/icon`, or the header behaviour wrapper. Permanent.
Status: active

---

## 2026-05-14 — Phase 6 v2 Step 5: Rosetta Stone chokepoint + IP-defence framing removed

**D(step5) — Rosetta Stone chokepoint propagated; IP-defence framing removed at root.** `_insert_uimax_pattern` + `sgs-update-uimax-sync.py` route through `uimax_write.validate_and_write`. `LICENSING_BANNED_SUBSTRINGS` + `find_licensing_violations()` removed entirely — UI patterns aren't copyrightable; the gate was theatre. 3 regression-guard tests added to prevent re-introduction. 109/109 tests pass. Commits this session.
Status: active

---

## 2026-05-13 — Spec 15 Phase 5 + Phase 6 Step 0: +REGISTER wired

**D(phase5g) — Phase 5 partial closure accepted; canvas pipeline structural defect closed.** 6 of 9 blocks routed to unregistered blocks (WordPress silently drops them). Fix path chosen: hard gate in confidence-matrix (reject `registered=False`); bucket-c-classifier + atomic-block-scaffold for new-block scaffolding. +REGISTER wired via `register_patterns.py` — idempotent, writes PHP pattern file + sgs-framework.db row + uimax row per composed section. Live E2E proved pipeline functional end-to-end. Commit `d0d30579`.
Status: active

---

## 2026-05-12 — Spec 15 Phase 4.5: cloning preserves intentional bespoke detail

**D(phase45) — `/sgs-clone` token lint defaults to ADDITIVE mode.** Non-token CSS values → `NewTokenCandidate` rows written to client style variation JSON (NOT snapped to nearest token). Base `theme.json` stays lean; client variation absorbs bespoke differences. Bean's framing: "small differences are all intentional." Commits `8599faf3`, `55a6d73e`, `3c2c07b7`, `a9b9b1c3`.
Status: active

---

## 2026-05-11 — Deterministic SGS-BEM voter; Trustpilot; third-party widget split

**D(voter) — Deterministic SGS-BEM voter over probabilistic AI matcher.** Stage 1 voter does literal slug match on `.sgs-<block>` → `sgs/<block>` at confidence 1.0. AI in matching step removed. Cheaper, faster, deterministic. Probabilistic matching only for live scrapes. Commit `7ac627cf`.
Status: active

**D(trustpilot) — `sgs/trustpilot-reviews` as first-party block; Browserless auth via `?token=` query string.** Official WP plugin paywalls display widgets on free plan. Browserless `/content` rejects Bearer — auth is `?token=<key>` query string. Failure surface: settings page activity log only. Commits `c6bd4980` + `06df2807`.
Status: active

**D(widget-split) — Locked brand identity + theme-inherited typography split for embedded third-party widgets.** Platform logo / brand colour for stars / verified badge = locked. Font-family + colour + base font-size = inherit from host theme. Border + hover = `var(--wp--preset--color--primary, <brand-fallback>)`.
Status: active

---

## 2026-05-10 — SGS-BEM canonical naming + cross-platform deferral

**D(spec13) — SGS-prefixed BEM is canonical for all Bean-controlled drafts (Spec 13 locked).** `.sgs-<block>__<element>--<modifier>`. Hard pre-flight gate on production runs; `--draft-mode` = soft warning; `--legacy` bypasses for pre-rule mockups. Live scrapes use lingua-franca-conversion. blub.db row 236. Canonical: `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (absorbed Specs 12+13+14).
Status: active

**D(cross-platform-defer) — Cross-platform emit pathways (P-CP-1/2/3) deferred until M9 production-stable + ≥3 successful clones banked.** Rosetta Stone infrastructure structurally ready. Cost = engineering pass per platform target — non-trivial. M9 ships first; cross-platform emit downstream of unreliable clone is wasted work.
Status: active

