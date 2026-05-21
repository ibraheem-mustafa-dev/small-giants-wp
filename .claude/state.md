---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: architecture-programme-phase-0-shipped-phases-0.5-through-7-pending
current_subphase: "Session 2026-05-21 (architecture session) closed. Phase 0 shipped (commit aec54882 — slot_synonyms.standalone_block seeding + blocks.parent_block + blocks.replaces column + --client auto-derive). 31 architectural decisions captured in .claude/plans/2026-05-21-architecture-staging.md. 4 strategic-plan session artefacts at .claude/reports/strategic-plan-2026-05-21/. Wave 2 wiring-fix work (G1+G3+G5) is now subsumed into the architectural programme — INNER_BLOCK_PATTERNS retirement (Phase 3) plus DB merge (Phase 1) collectively address the same root gap. Separate pixel-diff G-series blockers remain open until those phases land."
current_subphase_step: "Next session: Phase 0.5 (structural QC hook, Decision 31, ~20 min, independent). Then Phase 1 (DB merge, Decisions 1+2+11, ~1.5 hr). See .claude/plans/2026-05-21-architecture-staging.md §13 for full 4-parallel-session dispatch plan. Read staging doc §3 + §11 before dispatching any subagent."
last_updated: 2026-05-21
latest_commit: "75c9a6e2 on main — session(2026-05-21): handoff + next-session-prompt + state — Wave 2 reshape ready for dispatch"
architecture_programme:
  staging_doc: .claude/plans/2026-05-21-architecture-staging.md
  phase_0_status: SHIPPED (commit aec54882)
  phase_0_5_status: PENDING (Decision 31 — structural QC hook)
  phase_1_status: PENDING (DB merge — Decisions 1, 2, 11)
  phase_2_status: PENDING (variations indexing — Decisions 7, 8)
  phase_3_status: PENDING (INNER_BLOCK_PATTERNS retirement — Decisions 24, 12)
  phase_4_status: PENDING (/sgs-update rebuild + Option B + completeness — Decisions 13, 30)
  phase_5a_status: PENDING (variation system kill + per-site theme.json — Decisions 14', 16', 17', 18, 19)
  phase_5b_status: PENDING (Customiser migration + button presets + view transitions — Decisions 21, 22, 27)
  phase_6_status: PENDING (markup examples + supports backfill + WP 7.0 audits + Lucide REST — Decisions 9, 10, 23, 25, 28)
  phase_7_status: PENDING (AI Connectors + WP-skills WP 7.0 audit — Decisions 26, 29)
session_2026_05_20_summary: "11 commits. Council + systematic-debugging + Phase 1 architectural rewrite (Spec 16 §FR6 compliant) + Phase 2 future capabilities (header/footer/nav hook, autonomy tightening, attribute promotion, block variations). Empirical: 5 of 6 desktop regressions from initial P1.B closed via P1.B.x. D1 typed-attr lift rate 4% → 37%. mamas-munches.css 23k → 19k chars. 60+8+40+51+14 = 173 tests passing across orchestrator + token_resolver + css_router + scaffold + promotion + essence-match. Header/footer-as-blocks anti-pattern (5th occurrence today) now blocked at both tool layer (P2.0 PostToolUse hook) AND source layer (P2.i chrome-skip in stage_9b autonomy). The 1009-row attribute_gap_candidates backlog now has a promotion CLI."
blockers:
  - "Hero 375 mobile regression (+13.3pt vs post-C baseline) — appeared in P1.B.x. Likely F5 responsive-variant-attr resolution gap. Next session investigation."
  - "Social-proof 768 partial regression (+5.1pt) — same probable cause. Next session investigation."
  - "Dead-CSS-selector problem (council R2) remains — mockup class names like .sgs-hero__sub don't match render.php output .sgs-hero__subheadline. Phase 2 (ii) promotion stage shipped but operator hasn't yet promoted any candidates. Closing R2 is incremental work: each promoted attr converts a dead-CSS rule into a D1 typed-attr lift."
  - "Pixel-diff target (≤ 5% per section at 1440) NOT YET ACHIEVED. Phase 1 + Phase 2 delivered the architectural foundation; the pixel-diff target needs ongoing operator promotion of attribute candidates + the F5 mobile responsive-attr fix."
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
| 0 | 3, 4, 5, 6 | SHIPPED `aec54882` | Data seeding — slot_synonyms + parent_block + replaces column + --client auto-derive |
| 0.5 | 31 | PENDING | Structural QC hook — ~20 min, independent |
| 1 | 1, 2, 11 | PENDING | DB merge — sgs-framework.db absorbs blocks.db + hooks.db |
| 2 | 7, 8 | PENDING | Variations indexing — sgs/button 4 variations + all others |
| 3 | 24, 12 | PENDING | INNER_BLOCK_PATTERNS retirement (Decision 24 research confirmed: keep DB-backed) |
| 4 | 13, 30 | PENDING | /sgs-update rebuild (9-stage) + completeness assurance (10 canonical sources) |
| 5a | 14', 16', 17', 18, 19 | PENDING | Variation system kill + per-site theme.json + push CLI |
| 5b | 21, 22, 27 | PENDING | Customiser migration + button presets → theme.json + view transitions |
| 6 | 9, 10, 23, 25, 28 | PENDING | Markup examples + supports backfill + WP 7.0 audits + Lucide REST |
| 7 | 26, 29 | PENDING | AI Connectors registration + WP-skills WP 7.0 alignment audit |

**Parallel dispatch plan (after Phase 1 lands):**
- Session A: Phase 4 (`/sgs-update` rebuild)
- Session B: Phases 2 + 3 (variations + INNER_BLOCK_PATTERNS)
- Session C: Phases 5a + 5b (variation kill + Customiser)
- Session D: Phases 6 + 7 (audits + WP 7.0 alignment)

**Critical path:** 0.5 → 1 → (longest of Session A = Phase 4 at ~5.5 hr). ~8 hr wall-clock total.

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
