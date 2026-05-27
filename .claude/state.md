---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: spec-22-phase-2-hybrid-block-migration-STREAM-A-ACTIVE
current_subphase: "Spec 22 Phase 1.5 CLOSED 2026-05-27 with just Fix 1 shipped (walker FR-22-3 #3 ordering, commit 5731dc36; mean pixel-diff 81.55% → 58.6%, −22.9pp aggregate). Phase 1.5 diagnostic value was complete after Fix 1 + 7-agent /systematic-debugging Round 2 surfaced (a) walker collapses __content/__media BEM wrappers because section-internal BEM rows missing from slot_synonyms, (b) hybrid render.php (61 SGS blocks per Phase 0.4 roster) ignores $content. Bean reframed Fix 4 BLOCKED verdict: FR-22-6 hybrid problem is exclusively SGS framework debt — never add server-side legacy fallback hacks; instead batch-migrate full 61-block roster via Phase 2 + WP-CLI existing-post migration. Captured as R-22-14 binding rule. Phase 2 plan written: .claude/plans/2026-05-28-phase-2-hybrid-block-migration.md (4 streams; Stream A ACTIVE; B/C/D deferred placeholders). Phase 2.5 = bridge to ≤1% pixel-diff (was original Phase 1.5 stretch). 3 commits this session: 5731dc36 Fix 1 + 9a1bb252 TEMP header-hide CSS override on Mama's canary + (handoff commit). 4 captured lessons: db-rows-canonical-flow (CORRECTED per Bean's /sgs-update question), row-by-row-measurement-gate-per-db-change, section-root-aliases-target-sgs-container-only, fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks."
current_subphase_step: "Stream A ACTIVE. NEXT SESSION: Step A1 DB-quality pre-pass — generate CSV of all 180-200 (block × content-bearing-attr × proposed-target-block) triples via SQL query against sgs-framework.db; Bean reviews + flags suspicious rows. Then A2 fix suspicious slot_synonyms rows via seed-slot-synonyms.py (corrected Fix 2 with row-by-row gating per captured lessons). Then A3 run seed + INDEPENDENTLY verify BOTH .claude AND .agents DBs (the implementer-verification step Fix 2 attempted-on-direct-execution failed at). Then A4 /sgs-update Stages 5/6/7/9 for downstream refresh. Then A5 re-baseline /sgs-clone --debug-trace measurement; expected hero/featured-product/gift-section/ingredients-section cells improve substantially with __content/__media wrappers now preserved. QA gate after A5; if PASS, Stream B activation decision deferred to next-next session. Total Stream A: 3-5 hr focused work. Hard rules: NO new bespoke blocks (R-22-9); NO legacy fallback hacks in render.php (R-22-14); per-row /sgs-clone measurement gating (captured lesson)."
last_updated: 2026-05-27
latest_commit: "9a1bb252 (TEMP header-hide on Mama's canary)"
working_tree: "Pre-handoff: Spec 22 R-22-14 amendment + Phase 2 plan + lucide-icons.php auto-regen (the lucide is never committed — auto-regen timestamp)"
github_branches: "main ONLY"
spec_22_implementation:
  status: PHASE_1_5_CLOSED_PHASE_2_STREAM_A_ACTIVE
  spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
  spec_version: "0.4+R-22-14 (R-22-14 binding rule added 2026-05-27 — FR-22-6 migrations never carry server-side legacy fallback hacks)"
  phase_plan_active: .claude/plans/2026-05-28-phase-2-hybrid-block-migration.md
  phase_1_5_close_note: "Phase 1.5 CLOSED with just Fix 1 shipped (5731dc36 walker FR-22-3 #3 ordering). Diagnostic value complete; structural prerequisites for ≤5% gate identified (Fix 2b DB rows + Phase 2 hybrid migration); per Bean directive, Phase 2 reordered ahead of pixel-diff target; Phase 2.5 = bridge to ≤1%."
  phase_plan_archived: .claude/plans/archive/2026-05-26-phase-1-spec-22-implementation-closed-2026-05-27.md (Phase 1.5 closed 2026-05-27 per D90)
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

- **current_phase:** spec-22-phase-2-hybrid-block-migration-STREAM-A-ACTIVE (Phase 1.5 CLOSED 2026-05-27 per D90 with just Fix 1 shipped; Phase 2 = hybrid block migration per D91; R-22-14 binding rule added per D92)
- **current_subphase:** Stream A scoped active per Bean directive (Stream B/C/D in plan are documentation, not active scope). Stream A = DB-quality pre-pass + corrected Fix 2b via canonical seed-slot-synonyms.py + verify both DBs + /sgs-update downstream + re-baseline measurement. Total Stream A: 3-5 hr next-session scope.
- **current_step:** Step A1 DB-quality pre-pass — generate CSV of all 180-200 (block × content-bearing-attr × proposed-target-block) triples from sgs-framework.db; Bean reviews + flags suspicious rows. Then A2 corrects suspicious slot_synonyms rows via seed-slot-synonyms.py + adds section-internal BEM wrappers (`__content`, `__media`, `__inner`, `__products`, etc.). A3 runs seed + INDEPENDENTLY verifies BOTH .claude and .agents DBs (the implementer-verification step Fix 2 failed at). A4 /sgs-update downstream refresh. A5 /sgs-clone re-baseline measurement — expected hero/featured-product/gift-section cells drop substantially with wrappers preserved.
- **latest_commit:** f300624c (handoff polish + Phase 2 plan pre-conditions/parking-lot)
- **working_tree:** 1 uncommitted (plugins/sgs-blocks/includes/lucide-icons.php auto-regen timestamp; never committed per project CLAUDE.md)
- **github_branches:** main ONLY
- **spec_22_status:** **PHASE_1_5_CLOSED_PHASE_2_STREAM_A_ACTIVE** — Phase 1.5 closed with just Fix 1 (5731dc36); Phase 2 plan written + Stream A scoped active
- **acceptance_gate_phase_2_stream_a:** per-cell measurement improvement from post-Fix-1 baseline 58.6% with no cell regressing > 5pp (Stream A QA gate; Bean reviews + decides on Stream B activation next-next session)
- **acceptance_gate_phase_2.5:** per-section ≤1% × 3 viewports (was original Phase 1.5 stretch; reordered to post-Phase-2 per D91)
- **empirical_baseline_post_fix_1:** **mean_mismatch_percent: 58.6%** (`pipeline-state/mamas-munches-homepage-2026-05-27-193804/stage-11-pixel-diff.json`; post-Fix-1 measurement; canonical baseline for Stream A's Step A5 comparison)
- **session_commits_on_main:** 5731dc36 (Fix 1 walker FR-22-3 #3 ordering) → 9a1bb252 (TEMP header-hide CSS override) → 37dd2c79 (Phase 1.5 close + Phase 2 plan + R-22-14) → f300624c (handoff polish)
- **blockers:** None active for Stream A entry. Pre-existing parking items: 5 duplicate parking slugs (future cleanup); P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION OPEN; dashboard port 5050 down (4 lessons pending_upload to knowledge API; lessons live in project memory + workspace cc-sync mirror).

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
