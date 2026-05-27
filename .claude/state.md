---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: spec-22-phase-1-architectural-CLOSED-2026-05-27
current_subphase: "Spec 22 Phase 1 ARCHITECTURAL work CLOSED 2026-05-27. 8 substantive commits shipped this session (1.1 pre-rewrite snapshot 507d4f57 / 1.2 atomic-tag map DB migration 0ba53c72 / 1.2a DB-first hardening + slot_synonyms cleanup d4bfa41d / sgs/heading γ-rebuild 35fdab62 / 1.3a array-attr backfill + helper + Spec drift fix 909c971a / sgs/team-member InnerBlocks cd3bef5e / 1.4a walker helpers b58e5ca3 / 1.4b universal walker + /qc-council 4-rater post-fixes da3de993) + handoff commit 6215115b. NEW convert.py 1873 LoC replaces retired 4803-LoC Spec 16 walker (61% reduction). Walker has EXACTLY 3 routing branches per R-22-3 with AST self-test self-running in __main__. /qc-council 4-rater (Sonnet + Haiku + Gemini Flash + main-thread) surfaced 5 real diagnostics + 1 by-design; all 5 fixed in-flight before Phase 1.4b commit. 145+/145+ test suite PASS. 19 commits pushed to origin/main."
current_subphase_step: "Phase 1.5 — Stage 11 pixel-diff measurement (empirical gate). NEXT SESSION: deploy walker to sandybrown → /sgs-clone --auto-section --debug-trace --converter-v2 --spec-22-acceptance against Mama's canary page 144 → measure 7 body sections × 3 viewports (21 cells) → halt/proceed decision per R-22-13 (Bean visual sign-off co-authoritative). Acceptance: every cell ≤5% AND visual sign-off. Per-cell prior baseline at pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json (mean_mismatch_percent 63.61%). If pass → Phase 1 CLOSED, Phase 2 opens (61-block hybrid render.php migration roster). If fail → root-cause diagnosis (class-of-failure per FR-22-5/2/3 categories), /qc-council multi-rater gates every walker fix-shape commit per blub.db 255."
last_updated: 2026-05-27
latest_commit: "6215115b (docs handoff)"
working_tree: "1 uncommitted (plugins/sgs-blocks/includes/lucide-icons.php auto-regen timestamp; never committed — leave alone)"
github_branches: "main ONLY"
spec_22_implementation:
  status: PHASE_1_ARCHITECTURAL_CLOSED_PHASE_1_5_PENDING_EMPIRICAL
  spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  spec_version: 0.4
  phase_plan: .claude/plans/2026-05-26-phase-1-spec-22-implementation.md
  council_findings_total: 48 (33 valid+addressed, 10 partial-recalibrated, 5 dropped) [v0.4 council] + 5 (Phase 1.4 /qc-council all addressed in 1.4b — D1 CSS-loss, D2 ImportError, D3 wrong attr names, D4 dead D1 sidecar, D5 chrome-skip ordering)
  docscore: "100% Grade A"
  acceptance_gate_phase_1: per-section ≤5% × 3 viewports for all 7 body sections + Bean visual sign-off (R-22-13 co-authoritative)
  acceptance_gate_phase_1_5: per-section ≤1% × 3 viewports (stretch — bridges via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing)
  empirical_baseline: pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json (Wave B re-capture 2026-05-27 with new pixel-diff.py — **mean_mismatch_percent: 63.61089259259259** per file; prior cited "58.91%" baseline figure was unverifiable drift — corrected 2026-05-27 post-handoff audit; 27 captures total, 0 errors, 0 wait_fonts_false_count; hero 1440 honest correction -8.8pp per D88; brand-375 +2.4pp is D88-accepted methodology shift)
  empirical_baseline_prior: pipeline-state/mamas-munches-homepage-2026-05-26-012625/stage-11-pixel-diff.json (PARTIALLY STALE per D88 — superseded for chrome-affected cells; retained for historical reference)
  walker_loc: "convert.py NEW = 1873 LoC; retired _retired/convert_pre_spec22.py = 4803 LoC; 61% reduction"
  hero_clone_poc: "/hero-clone-poc/ (page 29) — visual parity proof; 54.5% pixel-diff is 60px chrome-bleed alignment artefact, not visual divergence"
  retired_in_this_session: ["Spec 16 (archived 2026-05-26)", "Phase 1 plan 2026-05-25-phase-1-universal-extraction.md (archived 2026-05-26)"]
doc_op_programme:
  status: PARTIAL — phases 1-5 + Tasks I + H + cc sweep shipped; 6/7/9/10/12/13 pending
  handoff: .claude/handoff-doc-op.md
  next_session_prompt: .claude/next-session-prompt-doc-op.md
session_b_records:
  qc_council_report: .claude/reports/2026-05-22-session-B-qc-council.md
  session_summary: .claude/memory/session-summary-2026-05-22-session-B.md
  property_coverage_audit: .claude/reports/phase-5b-button-property-coverage.md
architecture_programme:
  staging_doc: .claude/plans/2026-05-21-architecture-staging.md
  phase_0_status: SHIPPED (commit aec54882, 2026-05-21)
  phase_0_5_status: SHIPPED (commit 6eaadbc2, 2026-05-21 — qc-on-converter-edit.py hook + edit tracker)
  phase_1_status: SHIPPED (commit 8c56ab6 in ~/.agents/skills repo, 2026-05-22 — DB merge with source column, 13/13 assertions passing, hot-path query 1.5ms)
  phase_1.5_status: SHIPPED (commit cc541e94, 2026-05-22 — 12 composite blocks × 2-4 variations × 2-3 styles, default-style via className, Path B via get_block_type_variations filter; canary-first validated)
  phase_2_status: SHIPPED (commit aca7c98 in skills repo, 2026-05-22 — variations + block_styles tables populated via runtime REST enumeration per D33; 25/25 assertions pass)
  phase_3_status: SHIPPED (commit 79158da5, 2026-05-22 — INNER_BLOCK_PATTERNS dict deleted; DB-backed lookup via blocks.parent_block + slot_synonyms.standalone_block; 5/5 regression tests)
  phase_4_status: SHIPPED (commits 39d32799→99081252, 2026-05-22 — 9-stage sgs-update-v2.py, 10/10 upstream sources verified, Source 2 counter fix, shadow token type, schema_metadata table). POST-SHIPMENT UPDATE 2026-05-24 (doc-op session): Mode A/Mode B distinction collapsed — Stage 2 now always live-scrapes; --refresh-upstream flag removed. Stage 3 retired (its content covered by Stage 2 Source 3). See D56 in decisions.md.
  phase_5a_status: SHIPPED-IN-SESSION-B (commit 43a93df9, 2026-05-21 — variation system kill, per-site theme.json, push CLI per Decisions 14', 16', 17', 18, 19)
  phase_5b_status: SHIPPED-IN-SESSION-B (commit 60220b13, 2026-05-21 — Customiser migration + button presets to theme.json + view transitions per Decisions 21, 22, 27)
  phase_5b_paint_fix_status: SHIPPED-IN-SESSION-B (commit 0ef032fe, 2026-05-22 — Customiser paint targets header.wp-block-template-part / footer.wp-block-template-part)
  phase_6_status: "SHIPPED-IN-SESSION-B (commit d307c8b0, 2026-05-22) with two non-blocking partials parked: 6.A markup examples 69-of-73 (4 DB rows reference blocks whose block.json source doesn't exist — parked P-6-MISSING-BLOCK-JSON); 6.B supports backfill target was wrong-assumption (predicted >500, found zero gaps because 2:1 ratio assumption false — fix is trivial architecture.md edit). Both close in Step 3 parking sweep."
  phase_7_status: SHIPPED (commits da19374c + b26abf56, 2026-05-22 — Sgs_Ai_Connector live-verified; 10 wp-family skills + 5 SGS skills + 9 slash commands audited + revised for WP 7.0; 3 live-verification corrections: core/icon singular, no heading variations, no settings.dimensions.presets)
wp_7_0_upgrade_status: "SHIPPED 2026-05-22 (Session B Hostinger op). sandybrown core 6.9.4 → 7.0. DB schema 60717 → 61833. Pre-upgrade mysqldump at ~/sandybrown-pre-wp7.sql (7.5 MB) on Hostinger host for rollback. Two API surprises documented: (1) wp_register_icon_collection() doesn't exist — Phase 6 Lucide REST defensively no-op via class_exists + function_exists guards; (2) register_block_variation() still doesn't exist as PHP — Phase 1.5 Path B at cc541e94 remains load-bearing. Both validate blub.db row 283."
session_2026_05_20_summary: "11 commits. Council + systematic-debugging + Phase 1 architectural rewrite (Spec 16 §FR6 compliant) + Phase 2 future capabilities (header/footer/nav hook, autonomy tightening, attribute promotion, block variations). Empirical: 5 of 6 desktop regressions from initial P1.B closed via P1.B.x. D1 typed-attr lift rate 4% → 37%. mamas-munches.css 23k → 19k chars. 60+8+40+51+14 = 173 tests passing across orchestrator + token_resolver + css_router + scaffold + promotion + essence-match. Header/footer-as-blocks anti-pattern (5th occurrence today) now blocked at both tool layer (P2.0 PostToolUse hook) AND source layer (P2.i chrome-skip in stage_9b autonomy). The 1009-row attribute_gap_candidates backlog now has a promotion CLI."
blockers:
  - "Phase 1.5 pixel-diff measurement is the empirical gate — UNMEASURED. Walker architecturally ships clean but rendered-output outcome unverified until Phase 1.5 runs against sandybrown canary."
  - "blub.db dashboard API at port 5050 unreachable throughout 2026-05-27 session — Gate 4b/4c.5 POSTs flagged pending_upload: true. Restart dashboard before next dashboard-dependent work."
  - "5 PRE-EXISTING duplicate parking slugs (P-FR1-VARIATION-BUF-CONSISTENCY, P-G1-EXTEND-TO-OTHER-CONTAINER-SHAPED-COMPOSITES, P-G1-HERO-INNERBLOCKS, P-G3-STAGE-3-VISUAL-SLOT-MAPPING, P-G5-PER-BLOCK-DOM-SHAPE-FIXES) appear in 2026-05-26 closure notice + older entries below. NOT introduced this session. Future parking cleanup pass."
  - "P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION (OPEN, SEO bucket) — team-member's pre-1.3b Schema.org JSON-LD sameAs array lost in InnerBlocks refactor. Trigger: Phase 2 OR client SEO-audit signal."
---

# small-giants-wp — State Snapshot

## State Snapshot

- **current_phase:** spec-22-phase-1-architectural-CLOSED-2026-05-27 (Phase 1.5 empirical gate is next)
- **current_subphase:** **Phase 1 ARCHITECTURAL work COMPLETE.** 8 substantive commits shipped this session (Phase 1.1 + 1.2 + 1.2a + sgs/heading γ-rebuild + 1.3a + sgs/team-member InnerBlocks + 1.4a walker helpers + 1.4b universal walker), plus 1 handoff commit + drift-fix commits. New `convert.py` (**1873 LoC, 61% reduction from retired 4803**) replaces the entire Spec 16 walker. R-22-3 PASS test self-runs (exactly 3 routing branches, zero illegal block-slug literals). /qc-council 4-rater multi-model gate (Sonnet + Haiku + Gemini Flash + main-thread) surfaced 5 real diagnostics + 1 by-design; all 5 fixed in-flight before Phase 1.4b commit. 145+/145+ targeted-test suite PASS (10 named test files independently verified — full pytest collection picks up additional pre-existing tests unrelated to this session's work). Only Phase 1.5 (Stage 11 pixel-diff measurement against Mama's canary page 144) remains for Phase 1 acceptance.
- **current_step:** Phase 1.5 — Stage 11 pixel-diff measurement + halt/proceed decision (deploy walker to sandybrown, capture pre/post pixel-diff for 7 body sections × 3 viewports, Bean visual sign-off per R-22-13)
- **latest_commit:** 83dd21e4 (round-2 drift fix per /qc Rater B)
- **working_tree:** 1 uncommitted (plugins/sgs-blocks/includes/lucide-icons.php auto-regen timestamp; never committed all session)
- **github_branches:** main ONLY
- **spec_22_status:** **PHASE_1_ARCHITECTURAL_CLOSED_PHASE_1_5_PENDING_EMPIRICAL** — Phase 1.1-1.4b all SHIPPED 2026-05-27; only Phase 1.5 empirical measurement pending
- **acceptance_gate_phase_1:** per-section ≤5% × 3 viewports for all 7 body sections (21 cells, each independently)
- **acceptance_gate_phase_1_5:** per-section ≤1% × 3 viewports (stretch — Phase 1.5 noise-floor work post Phase 1)
- **empirical_baseline:** **mean_mismatch_percent: 63.61%** (Wave B re-capture 2026-05-27 — `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` — chrome-hide + wait-fonts methodology; 27 captures, 0 errors). Earlier "58.91%" claim was unverifiable drift, corrected 2026-05-27 post-handoff audit. Prior baseline at `pipeline-state/mamas-munches-homepage-2026-05-26-012625/` (mean 63.0%) retained as historical reference per D88.
- **blockers:** Phase 1.5 measurement pending — walker architecturally ships clean but rendered-output outcome unverified until measured. Dashboard at port 5050 down (Gate 4b/4c.5 POSTs flagged pending_upload: true). 5 pre-existing duplicate parking slugs (not introduced this session — future cleanup pass). P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION OPEN (SEO).

## Human Summary

The SGS cloning-pipeline has crossed its biggest architectural milestone. Spec 22 (Universal Block-Equivalent Extraction) was ratified 2026-05-26 retiring Spec 16; the Phase 1 architectural rewrite shipped 2026-05-27 across 8 substantive commits. The new universal walker (`plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`, 1873 LoC) replaces the retired 4803-LoC Spec 16 walker — 61% reduction — with EXACTLY 3 routing branches per R-22-3 (AST self-test self-runs to enforce the structural rule). /qc-council 4-rater multi-model pre-commit gate (Sonnet + Haiku + Gemini Flash + main-thread inline) surfaced 5 real diagnostics; all 5 fixed in-flight before Phase 1.4b commit.

Phase 1 ARCHITECTURAL work is CLOSED. The remaining gate is **Phase 1.5 — Stage 11 pixel-diff measurement** against the Mama's Munches canary page 144 at sandybrown. The pre-walker-rewrite baseline at `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` reports `mean_mismatch_percent: 63.61%` (per file — earlier "58.91%" claim was unverifiable drift, corrected 2026-05-27). Acceptance requires every body section (7 sections × 3 viewports = 21 cells) at ≤5% AND R-22-13 Bean visual sign-off on cropped-pair artefacts.

The hero-clone-poc at page 29 (`/hero-clone-poc/`) is the visual proof-of-concept that visual parity IS achievable; the post-walker-rewrite measurement (Phase 1.5 next session) will report whether the universal walker hits Phase 1's ≤5% acceptance gate on the canary page.

---

**2026-05-21 architecture session** produced a 31-decision holistic redesign of the SGS framework covering DB consolidation, style-variation kill, INNER_BLOCK_PATTERNS retirement, WP 7.0 alignment, and admin UX migration to the Customiser. Phase 0 shipped (commit `aec54882`). 7 phases pending.

Canonical reference for the programme: `.claude/plans/2026-05-21-architecture-staging.md`
Strategic-plan session artefacts: `.claude/reports/strategic-plan-2026-05-21/` (risk-assessment.md, effort-pert.md, hidden-decisions.md)
Research artefact: `.claude/reports/2026-05-21-pattern-overrides-research.md`

---

## Architecture programme — phase status

| Phase | Decisions | Status | Notes |
|---|---|---|---|
| 0 | 3, 4, 5, 6 | SHIPPED `aec54882` (2026-05-21) | Data seeding — slot_synonyms + parent_block + replaces column + --client auto-derive |
| 0.5 | 31 | SHIPPED `6eaadbc2` (2026-05-21) | Structural QC hook + edit tracker — warning-only posture, future-proof for sgs-update.py |
| 1 | 1, 2, 11 | SHIPPED `8c56ab6` (2026-05-22) | DB merge — sgs-framework.db absorbs blocks.db + hooks.db with source column. 13/13 assertions pass, hot-path 1.5ms |
| **1.5** | **D32, D33** | **SHIPPED `cc541e94` (2026-05-22)** | **12 composite blocks × 2-4 variations × 2-3 styles + default-style via className. Path B (get_block_type_variations filter). Empirically validated: 40 variations + 30 styles live on sandybrown.** |
| 2 | 7, 8 | PENDING | Variations indexing — runtime-aware parser per D33 (wp eval against WP_Block_Type_Registry); re-seeds variations table from Path B registrations |
| 3 | 24, 12 | PENDING | INNER_BLOCK_PATTERNS retirement (Decision 24 research confirmed: keep DB-backed) |
| 4 | 13, 30 | PENDING | /sgs-update rebuild (9-stage) + completeness assurance (10 canonical sources) |
| 5a | 14', 16', 17', 18, 19 | SHIPPED `43a93df9` (2026-05-21, Session B) | Variation system kill + per-site theme.json + push CLI |
| 5b | 21, 22, 27 | SHIPPED `60220b13` (2026-05-21, Session B) — LATENT BUG | Customiser migration + button presets → theme.json + view transitions. Inert-Customiser-output bug: renderers target `.wp-site-header`/`.wp-site-footer` but SGS template parts use generic wrapper classes. Fix via Path A (CSS custom properties on :root). |
| 6 | 9, 10, 23, 25, 28 | PENDING (now unblocked) | Markup examples + supports backfill + WP 7.0 audits + Lucide REST. Phase 1.5 gate satisfied. |
| 7 | 26, 29 | PENDING | AI Connectors registration + WP-skills WP 7.0 alignment audit |

**Critical path remaining:** Phase 2 → 3 → 4. Sequential. Bean directive 2026-05-22: continue through 2/3/4 with QC gates between, no /handoff until block of work complete.

**Phase 5b inert-Customiser bug:** Pick Option A from Session B council = emit `:root { --sgs-header-bg: ...; }` in renderer, consume via theme.json. ~30 min, tightly scoped follow-up. Tracked separately from main critical path.

---

**Previous session context (Spec 16 era — now retired):** Architecture programme phases 0/0.5/1/1.5/5a/5b/5b-paint-fix/6/7 all SHIPPED 2026-05-21–22. Spec 16 walker (cv2) achieved mean 63.0% pixel-diff with D1 lift rate 37%; double-render bug confirmed 2026-05-25 via F1 spike commit a757ff1c. Full session details in `.claude/memory/` + `.claude/handoff.md`. Spec 16 archived at `.claude/specs/archive/`. Captured lessons indexed in `MEMORY.md` + blub.db rows 283–288.
