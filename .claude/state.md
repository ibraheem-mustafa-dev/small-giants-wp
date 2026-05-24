---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: doc-optimisation-programme-PARTIAL-2026-05-24
current_subphase: "Doc-Optimisation programme partial close — 14 commits shipped to main this session (a252fb75 → f00aa90f). Tasks I (block_compositions → patterns.block_composition JSON column) + H (source-DB retirement + 3 script ports + cache dirs) shipped. Mode A/B/Stage-3 collapsed (--refresh-upstream flag removed; live-scrape is now the default). Full SonarLint cc sweep landed on sgs-update-v2.py — 10 functions refactored across Proposals A/B/C + Batches 1-5 (cc 142→13, 85→9, 73→8, etc.). Phases 1 (F2 MEMORY.md compression), 2 (F1 worktree removal — 4.39 GB recovered), 3 (A' gitignore auto-gen reference), 4 (F5+F6+F3 small fixes), 5 (J 5 lessons captured) done. ~5 GB total disk recovered. BEM-canonical Step 1.7 G3 (slot_list visual extension) DEFERRED behind doc-op completion."
current_subphase_step: "Phases 6 (B' active prune), 7 (F4 retention policy), 9 (C' spec relocation), 10 (D' heavy-doc restructure), 12 (E' registry sync), 13 (G /docscore rules) PENDING — see .claude/next-session-prompt-doc-op.md. After doc-op closes: resume Step 1.7 G3 per .claude/next-session-prompt.md (BEM-canonical version, preserved untouched this session per Bean directive)."
last_updated: 2026-05-24
latest_commit: "f00aa90f on main — docs: replace 'build new tools' efficiency notes with existing-skill recommendations"
working_tree: CLEAN
github_branches: "main ONLY"
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
  - "Doc-Optimisation programme Phases 6/7/9/10/12/13 PENDING — see .claude/next-session-prompt-doc-op.md. ~3-4 hours of work. Step 1.7 G3 (BEM-canonical slot_list visual extension) deferred behind doc-op completion."
  - "16 STILL-OPEN parking items — mostly cloning-pipeline G1-G5 gaps + Wave 2 wiring reshape. Not blocking current work."
  - "Pixel-diff target (≤ 5% per section at 1440) NOT YET ACHIEVED — architecture programme foundation complete; pixel-diff target needs G1-G5 structural fixes + ongoing attribute promotion. P-SGS-UPDATE-V2-COGNITIVE-COMPLEXITY-REFACTOR resolved 2026-05-24 (all 10 originally-flagged functions refactored; file under SonarLint threshold)."
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
