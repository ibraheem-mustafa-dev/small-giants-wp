---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: spec-22-ratified-cross-doc-sync-complete-2026-05-26
current_subphase: "Spec 22 (Universal Block-Equivalent Extraction) v0.4 ratified 2026-05-26 via 4-rater /gap-analysis council (Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor — 48 findings: 33 valid+addressed, 10 partial-recalibrated, 5 dropped). Spec 16 retired in full and archived. Commit 0.0 cross-doc sync complete: 18+ docs updated (architecture.md decisions #14/#15/#17/#19 rewritten + new #20; cloning-pipeline-flow.md two-route topology retired; cloning-pipeline-stages.md Stage 4 universal-extraction note; Spec 00 §3.1 link target updated; decisions.md D78-D83 prepended; parking.md 6 entries closed + P-LEGACY-GAP-CANDIDATES-MIGRATION added; docs-registry.yaml updated; CLAUDE.md trio updated). Spec 22 Phase 1 plan at .claude/plans/2026-05-26-phase-1-spec-22-implementation.md (5-commit walker rewrite cadence per R-22-5). Acceptance gate: per-section ≤5% × 3 viewports (Phase 1) + ≤1% (Phase 1.5 stretch via measurement-script hardening). Hero-clone-poc page 29 (/hero-clone-poc/) is the visual proof-of-concept. F1 spike commit a757ff1c (2026-05-25) is the empirical evidence that drove the double-render diagnosis + Spec 22 architecture."
current_subphase_step: "PHASE 0 CLOSED 2026-05-27 (6 commits total: 884d13e9 + 49bd2f24 + 82821922 + c417b7a4 + 6f565b13 + this commit). Phase 0.4 hybrid-block audit shipped: 61 hybrid blocks across 77 SGS blocks audited at `.claude/reports/2026-05-27-hybrid-block-roster.md`. Top 5: sgs/hero (11 hybrid attrs), sgs/media (8), sgs/icon-list (7), sgs/cta-section (6), sgs/form-field-number (6). Classifications validated against block.json source (e.g. form-field-text declares role='content' explicitly on label/placeholder/helpText; cta-section.stats is a counter array). The 8-15 estimate in Spec 22 §FR-22-6 was a guess at high-content composites only; the canonical criterion (≥1 content-bearing attr) captures the wider truth at 61. Phase 2 prioritises by hybrid_attr_count descending. NEXT SESSION: Phase 1.1 (pre-rewrite snapshot of convert.py) — opens the walker rewrite. Per Phase 0.3 results historical: (a) assign-canonical.py — Tier B backfill (4 of 5 rows applied; sgs/icon×3 + sgs/timeline; sgs/responsive-logo.width rejected) + role detection from block.json metadata (94 proposals applied; reclassified 52 mis-tagged-as-behavioural rows as content-bearing; corrected triple-NULL baseline 1142 → 1090) + snapshot baseline file; (b) db_lookup.py — equivalent_block_for() positive-allowlist role-exclusion (D85 closes FR-22-2.2 NULL-role hole) + DB-derive role classification (slot_synonyms.role_classification column added; 89 rows classified) + Tier C deleted (D86; Spec 22 amended to 2-tier system); (c) scripts/pixel-diff.py — chrome-hide via visibility:hidden + --wait-fonts + --keep-chrome debug override (D87 ratifies architectural divergence from spec wording); hero-clone-poc 1440 54.5% → 10.3% (-44.2pp); Mama's hero 1440 improved 69.6% → 60.8% (D88 — honest baseline correction not flake); (d) sgs-clone-orchestrator.py — Stage 11 auto-passes --wait-fonts on Spec-22-gated runs + per-cell wait_fonts audit; (e) NEW _tests/external-derivation-regression.py (4/4 assertions PASS); (f) NEW _tests/wp-blocks-adversarial.py + wp-blocks-bench.py (Task 4 — 25/25 adversarial PASS; wp-blocks.py extended with 5 of 6 subcommands; equivalent-block subcommand scaffolded pending Phase 0.2 wire-up). All db_lookup.py 5/5 unit tests PASS. External regression test 4/4 PASS. Pending: 2 commits (Phase 0.1 bundle + Phase 0.3.b orchestrator); Wave B Mama's baseline re-capture; Phase 0.2 wp-blocks.py equivalent-block body wire-up + commit; Phase 0.4 hybrid-block audit (Haiku). Phase 1 walker rewrite starts at Commit 1.1 only after Phase 0 closes."
last_updated: 2026-05-26
latest_commit: "(pending Commit 0.0 — Spec 22 ratification + cross-doc sync this session)"
working_tree: "Spec 22 v0.4 + new phase plan + 18+ docs updated; staged for Commit 0.0"
github_branches: "main ONLY"
spec_22_implementation:
  status: SPEC_RATIFIED_PHASE_0_PENDING
  spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  spec_version: 0.4
  phase_plan: .claude/plans/2026-05-26-phase-1-spec-22-implementation.md
  council_findings_total: 48 (33 valid+addressed, 10 partial-recalibrated, 5 dropped)
  docscore: "100% Grade A"
  acceptance_gate_phase_1: per-section ≤5% × 3 viewports for all 7 body sections + Bean visual sign-off (R-22-13 co-authoritative)
  acceptance_gate_phase_1_5: per-section ≤1% × 3 viewports (stretch — bridges via pixel-diff.py vertical-anchor fix + chrome cropping + font-load timing)
  empirical_baseline: pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json (Wave B re-capture 2026-05-27 with new pixel-diff.py — overall mean 58.91%; Spec 22 body cells aggregate 57.14%; hero 1440 honest correction -8.8pp per D88; brand-375 +2.4pp is D88-accepted methodology shift; 23/23 chrome-detected + wait_fonts=true cells)
  empirical_baseline_prior: pipeline-state/mamas-munches-homepage-2026-05-26-012625/stage-11-pixel-diff.json (PARTIALLY STALE per D88 — superseded for chrome-affected cells; retained for historical reference)
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
  - "Desktop 1440 brand pixel-diff STAYED FLAT at 50.8% post-F1 (target ≤30%) — F1 fixed mobile+tablet but exposed a separate desktop-only CSS/layout issue. Investigation pending — open Playwright at 1440, diff brand against mockup."
  - "Pixel-diff target (≤1% per body section × 3 viewports) NOT YET ACHIEVED — current state post-F1: brand 50.0 / 46.4 / 50.8. Phase 1 gate is per-section ≤30%; Phase 1.5 closes to ≤1%; Phase 2 (header/footer cloner) opens after."
  - "blub.db dashboard API was unreachable during 2026-05-25 session (port 5050) — fell back to direct SQLite INSERT for lesson row 288. Dashboard sync queued; resync when API back up."
  - "Several STILL-OPEN parking items (~16) folded into Phase 1 plan sub-tasks (G1-G5 closure, F5 D1 media-field, FR1-variation-buf sibling sites). Will close as Phase 1 commits ship."
---

# small-giants-wp — State Snapshot

## State Snapshot

- **current_phase:** spec-22-phase-1-walker-rewrite-opened-2026-05-28 (Phase 0 closed 2026-05-27)
- **current_subphase:** Phase 1.2 — atomic-tag map DB migration SHIPPED (`atomic_tag_map()` added to `db_lookup.py`; html-canonical resolution via `_HTML_TAG_TO_CORE_SLUG` + `blocks.replaces` reverse-walk; 14-entry output; slot_synonyms.html_semantic_tag NOT consulted by design per 2026-05-28 algorithmic correction)
- **current_step:** Phase 1.3 — ARRAY_LIFT_PATTERNS retirement + FR-22-2.5 array-of-objects resolution
- **latest_commit:** 59accb69 (handoff + next-session-prompt for Phase 1)
- **working_tree:** clean on main (1 file uncommitted: `plugins/sgs-blocks/includes/lucide-icons.php` — build timestamp drift, non-substantive)
- **github_branches:** main ONLY
- **spec_22_status:** ACTIVE — Phase 0 closed; Phase 1 (walker rewrite, 5 commits per R-22-5) opens next session
- **acceptance_gate_phase_1:** per-section ≤5% × 3 viewports for all 7 body sections (21 cells, each independently)
- **acceptance_gate_phase_1_5:** per-section ≤1% × 3 viewports (stretch — Phase 1.5 noise-floor work post Phase 1)
- **empirical_baseline:** overall mean 58.91% (Wave B re-capture 2026-05-27 — `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` — chrome-hide + wait-fonts methodology). Prior baseline at `pipeline-state/mamas-munches-homepage-2026-05-26-012625/` (mean 63.0%) retained as historical reference per D88.
- **blockers:** NONE for Phase 1.1. Two soft items: P-SGS-UPDATE-ROLE-DETECTION-IMPROVE OPEN MED (more rows may need role over time); P-D85-ROLE-EXCLUSION-DB-DERIVE OPEN (one-time-seed Python dict is R-22-1 compliant but ideally future `role_classification` table)

## Human Summary

The SGS cloning-pipeline has reached a major architectural turning point. Spec 22 (Universal Block-Equivalent Extraction) was ratified on 2026-05-26 after a 4-rater council review (Architectural Purist, Spec Checker, Pragmatic Engineer, Risk Auditor) produced 48 findings. The council accepted 33 findings as valid and addressed, recalibrated 10, and dropped 5. This ratification formally retires Spec 16, which is now archived at `.claude/specs/archive/`. The entire layered FR1/FR4/lift_subtree/F1/9-branch walk() architecture of Spec 16 has been superseded by a single universal walker path.

The cross-document sync (Commit 0.0) has updated 18+ docs to reflect the new architecture, including architecture.md (decisions #14–#20), cloning-pipeline-flow.md, cloning-pipeline-stages.md, decisions.md (D78–D83), and the parking lot (6 entries closed). The next session begins at Phase 0.1 — DB enrichment before the walker rewrite — specifically: extending `assign-canonical.py` for `canonical_slot` backfill, capturing a pre-rewrite DB snapshot, and filling `slot_synonyms` gaps for content-bearing roles.

The empirical baseline stands at mean 63.0% pixel-diff across 9 sections × 3 viewports on the Mama's Munches canary (page 144, sandybrown). The F1 spike commit (a757ff1c, 2026-05-25) confirmed the "double-render" structural bug that drove Spec 22's architecture. Phase 1 (walker rewrite, 5 commits per R-22-5) opens only after Phase 0 closes. The hero-clone-poc at page 29 provides visual proof-of-concept that the new architecture achieves visual parity.

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
