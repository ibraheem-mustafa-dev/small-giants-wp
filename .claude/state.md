---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: architecture-programme-CLOSED-2026-05-22
current_subphase: "Architecture programme officially CLOSED 2026-05-22. All 11 phases shipped. Step 0 (unexpected-content audit, 0 invalid blocks) + Step 1 (Phase 4 /sgs-update rebuild, 9 stages, Mode B verified 10/10 sources) + Step 2 (Phase 7 Sgs_Ai_Connector live + 24 WP/SGS skills audited+revised) + Step 3 (parking sweep 47→16 open) all DONE. 18 commits shipped d18b7354 → 68388b5a. Working tree CLEAN; main in sync with origin GitHub. PAT rotated + working — Mode B refresh-upstream genuinely production-ready end-to-end."
current_subphase_step: "Next session: close every STILL-OPEN parking entry EXCEPT P-BATCH-GA-14-SKILLS. Skills are FINAL polish — they describe tools/scripts the other entries fix. Sequencing: Task 1 (3 quick wins parallel) → Task 2 (4 verification gates) → Task 3 (G1+G2+G3 live verification) → Task 4 (big-ticket P-WAVE-2-RESHAPE / P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER / P-11-M9, sequential) → Task 5 (doc drift) → handoff. Task 6 (P-BATCH-GA-14-SKILLS) runs in a dedicated future session AFTER every fix lands."
last_updated: 2026-05-22
latest_commit: "68388b5a on main — docs: phase4 schema snapshots [qc:close-out-artefacts]"
working_tree: CLEAN
github_branches: "main ONLY"
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
  phase_4_status: SHIPPED (commits 39d32799→99081252, 2026-05-22 — 9-stage sgs-update-v2.py, Mode B 10/10 sources, Source 2 counter fix, shadow token type, schema_metadata table)
  phase_5a_status: SHIPPED-IN-SESSION-B (commit 43a93df9, 2026-05-21 — variation system kill, per-site theme.json, push CLI per Decisions 14', 16', 17', 18, 19)
  phase_5b_status: SHIPPED-IN-SESSION-B (commit 60220b13, 2026-05-21 — Customiser migration + button presets to theme.json + view transitions per Decisions 21, 22, 27)
  phase_5b_paint_fix_status: SHIPPED-IN-SESSION-B (commit 0ef032fe, 2026-05-22 — Customiser paint targets header.wp-block-template-part / footer.wp-block-template-part)
  phase_6_status: "SHIPPED-IN-SESSION-B (commit d307c8b0, 2026-05-22) with two non-blocking partials parked: 6.A markup examples 69-of-73 (4 DB rows reference blocks whose block.json source doesn't exist — parked P-6-MISSING-BLOCK-JSON); 6.B supports backfill target was wrong-assumption (predicted >500, found zero gaps because 2:1 ratio assumption false — fix is trivial architecture.md edit). Both close in Step 3 parking sweep."
  phase_7_status: SHIPPED (commits da19374c + b26abf56, 2026-05-22 — Sgs_Ai_Connector live-verified; 10 wp-family skills + 5 SGS skills + 9 slash commands audited + revised for WP 7.0; 3 live-verification corrections: core/icon singular, no heading variations, no settings.dimensions.presets)
wp_7_0_upgrade_status: "SHIPPED 2026-05-22 (Session B Hostinger op). sandybrown core 6.9.4 → 7.0. DB schema 60717 → 61833. Pre-upgrade mysqldump at ~/sandybrown-pre-wp7.sql (7.5 MB) on Hostinger host for rollback. Two API surprises documented: (1) wp_register_icon_collection() doesn't exist — Phase 6 Lucide REST defensively no-op via class_exists + function_exists guards; (2) register_block_variation() still doesn't exist as PHP — Phase 1.5 Path B at cc541e94 remains load-bearing. Both validate blub.db row 283."
session_2026_05_20_summary: "11 commits. Council + systematic-debugging + Phase 1 architectural rewrite (Spec 16 §FR6 compliant) + Phase 2 future capabilities (header/footer/nav hook, autonomy tightening, attribute promotion, block variations). Empirical: 5 of 6 desktop regressions from initial P1.B closed via P1.B.x. D1 typed-attr lift rate 4% → 37%. mamas-munches.css 23k → 19k chars. 60+8+40+51+14 = 173 tests passing across orchestrator + token_resolver + css_router + scaffold + promotion + essence-match. Header/footer-as-blocks anti-pattern (5th occurrence today) now blocked at both tool layer (P2.0 PostToolUse hook) AND source layer (P2.i chrome-skip in stage_9b autonomy). The 1009-row attribute_gap_candidates backlog now has a promotion CLI."
blockers:
  - "P-5A-CLIENT-VARIATION-CSS-PATH — orchestrator helper still returns a deleted path; needs redirect to sites/<client>/theme-overrides.css. Quick fix."
  - "16 STILL-OPEN parking items — mostly cloning-pipeline G1-G5 gaps + Wave 2 wiring reshape. Not blocking current work."
  - "Pixel-diff target (≤ 5% per section at 1440) NOT YET ACHIEVED — architecture programme foundation complete; pixel-diff target needs G1-G5 structural fixes + ongoing attribute promotion."
---

# small-giants-wp — State Snapshot

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

## Previous state (pre-architecture session, preserved for context)

11 commits shipped on main (8ceb8787 → 36ef9552). Phase 1 Spec 16 architectural rewrite complete + Phase 2 four future capabilities shipped. Pipeline is now structurally sound at every layer (cv2 walker + token_resolver + css_router + scaffold + promotion + variations + tool-layer hook), but pixel-diff target not yet hit pending operator-driven attribute promotion + a mobile-regression follow-up.

## Live wirings as of `36ef9552`

- **Stage 10 deploy:** new REST endpoint `sgs/v1/active-variation` activates style variation site-wide via theme_mod after page-PATCH. Read-back confirmation + exit-code-3 distinct failure surface.
- **Stage 4.5 token-snap:** `token_resolver.resolve_batch` wired into cv2 value-lift. Strict exact-match guard rejects "close" snaps that diverge from literal (Bean's step 3 binding).
- **Stage 0.7 four-destination router:** every CSS rule routes to exactly one of D0/D1/D2/D3 per Spec 16 §FR6. @media inner selectors scoped with `.page-id-N`. D1 suffix-scan over all block attrs. D2 emission filters D1-lifted props. D1 sidecar keyed by `block_slug:section_id` with media field preserved. Chrome-skip routes to D0.
- **Stage 9b autonomy:** chrome-skip header/footer/nav at source. 5-file scaffold quality scoring + report.
- **`.claude/hooks/no-header-footer-block.py`:** PostToolUse hook hard-rejects Write|Edit on `plugins/sgs-blocks/src/blocks/(header|footer|nav)/`. Defence in depth with autonomy chrome-skip.
- **`stage_attribute_promotion.py`:** operator-driven CLI promotes `attribute_gap_candidates` rows (1128 today) into block.json schema additions + render.php inline-style support. Three commands (list / promote / status), manual confirmation gate, idempotent.
- **`essence_match_detector.py`:** cv2 walker tier between FR1 and scaffold — when confidence 0.70-0.90 against existing block, emits `register_block_variation()` named variant instead of scaffolding new block.

## Phase 1 deliverables (Spec 16 §FR6 compliance)

- ✓ Cascade-on-edit property activated (token_resolver wired)
- ✓ Strict exact-match guard prevents lossy snaps
- ✓ Four-destination router replaces verbatim Stage 0.7 dump
- ✓ Dedup + @media scope + suffix-scan + 5 supplementary fixes (P1.B.x)
- ✓ D1 lift rate 4% → 37% (close to ≥40% acceptance criterion)
- ✓ mamas-munches.css 23,038 → 19,983 chars

## Phase 2 deliverables (future capabilities)

- ✓ P2.0 PostToolUse blocker hook (tool-layer 5th-occurrence prevention)
- ✓ P2.i Stage 9b autonomy chain tightening (5-file scaffolds + chrome-skip + quality report)
- ✓ P2.ii Attribute-gap promotion CLI (1128-row backlog → operator-promotable into block.json)
- ✓ P2.iii Block-variation system (essence-match-with-differences via register_block_variation)

## Pixel-diff trajectory (1440 viewport, worst-case section per stage)

- Pre-C baseline: 99.9% (social-proof 1440)
- Post-C: 99.9% → 56.8% (variation activation gave -43pt)
- Post-P1.A-patched: 57.2% (token-snap cascade-on-edit, pixel-flat as expected)
- Post-P1.B raw: 70.7% regression (specificity inversion)
- **Post-P1.B.x: 57.2% (regression recovered via @media scope fix)**
- Final post-Phase-2: pending background measurement

## Known blockers / next session

1. **Hero 375 mobile +13.3pt regression** — likely F5 responsive-variant-attr flow gap. ~30-45 min investigation + targeted fix.
2. **Social-proof 768 partial regression +5.1pt** — same probable cause as above.
3. **Dead-CSS-selector problem (council R2)** — requires ongoing operator-driven promotion via P2.ii CLI. Each promoted candidate converts a dead rule into a D1 lift on next pipeline run.
4. **2 P1.B.x follow-up tickets:** comma-grouped @media inner selectors only first-part scoped; nested @supports inside @media → invalid CSS.
5. **2 Phase 2 medium-severity follow-ups:** P2.ii _CSS_VALUE_RE could be tighter; P2.iii essence-match tier currently only fires when target=sgs/container.

## Captured lessons this session

| Pattern key | Source | Why it matters |
|---|---|---|
| token-snap-strict-exact-match-not-nearest | P1.A regression on #FFFFFF → text-inverse | Bean's step 3 binding — token references only when LITERAL VALUE MATCHES |
| css-router-media-scope-prefix-required | P1.B regression council finding | Without scoping inner @media selectors, base specificity wins → no responsive overrides |
| pipeline-extension-routes-to-output-d2-not-csv | P1.B file size 39k vs target 12k | Dedup at write-time prevents per-property routing from inflating output |
| header-footer-recurrence-now-5th | P1.B subagent recreated dirs | Tool-layer + source-layer defence-in-depth shipped (P2.0 + P2.i) |
| qc-panel-finds-real-bugs-multi-rater-wins | P1.B QC found dedup bug, P1.B.x panel found 2 follow-ups | Council format with rater diversity caught issues a single-Sonnet review missed |

## Captured lesson 2026-05-22 (blub.db row 283)

| Pattern key | Source | Why it matters |
|---|---|---|
| verify-wp-api-surface-before-dismissing-static-analyser | Phase 1.5 first-attempt deploy: 12 PHP files calling non-existent `register_block_variation()`, site 500'd | Two true general facts ("intelephense lacks WP stubs" + "PHP falls back namespace→global") chained into false conclusion ("therefore noise"). Cheap check: `curl developer.wordpress.org/reference/functions/<name>/` returns 404 if the function doesn't exist. Canary-first deploy discipline prevents site outages when introducing new WP API calls at scale. Sibling rule: feedback_verify_rendered_output_not_internal_metrics (row 194). Embedding offer surfaced to `/wp-plugin-development`, `/wp-block-development`, `/strategic-plan`, `/phase-planner`, `/research` per classifier-router. |
