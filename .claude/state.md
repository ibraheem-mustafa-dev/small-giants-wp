---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: wave-2-wiring-fix-pending-g1-g3-g5-as-one-architectural-change
current_subphase: "Session 2026-05-21 closed. 2 commits on main (affca3f1 Wave 1 G2 Step 1+2 + session docs; ad8ca75b Spec 16 §15 Wave 2 reshape + cloning-pipeline-flow corrections + plan.md update). Wave 1 G2 Step 1+2 shipped — orchestrator merges variation CSS into _section_css, cv2 strips .page-id-N scope prefix in selector matcher, 7 unit tests pass. 5 sections doubled variation_css_rules (featured-product 15→30, brand 8→16, gift 17→34, social-proof 11→22, ingredients 7→14). Hero + trust-bar stayed at 0 (FR1 fast-path bypass). G4 chrome-strip discarded as no-op. Wave 2 reframed as ONE wiring gap (G1+G3+G5 dissolve together): cv2 doesn't query block_compositions (write-only) + doesn't query property_suffixes for visual slots. Skill side: /qc-council created (92% A-, gap-analysis B 4.2/5, S-grade confirmed) + qc-trio cross-referenced across 11 sibling skills + shared verification-rationalisations.md created + /tdd + /vbc source skills deleted + /requesting-code-review (96%) + /systematic-debugging (97%) rewritten + /gap-analysis Step 7.75 delegates to /qc-council + 2 lessons captured (blub.db 276 + 277)."
current_subphase_step: "Next session: Wave 2 wiring fix as ONE architectural change. Task 1 design (inline Opus + /brainstorming). Task 2 validate via /qc-council Stage 5 empirical-validation gate (binding rule 276). Task 3 implement (delegated Sonnet via /delegate, single-agent dispatch). Task 4 F5 D1 media-field flow if time permits. Acceptance: hero stage_3_slot_list failures 142 → <30, hero variation_css_rules 0 → ≥8, brand pixel-diff at 1440 43.7% → <20%, coverage check (every mockup CSS declaration matches token OR lands as attr/inline). Detail in .claude/next-session-prompt.md."
last_updated: 2026-05-21
latest_commit: "ad8ca75b on main — docs: Wave 2 reshape + pipeline-flow doc-accuracy corrections"
session_2026_05_20_summary: "11 commits. Council + systematic-debugging + Phase 1 architectural rewrite (Spec 16 §FR6 compliant) + Phase 2 future capabilities (header/footer/nav hook, autonomy tightening, attribute promotion, block variations). Empirical: 5 of 6 desktop regressions from initial P1.B closed via P1.B.x. D1 typed-attr lift rate 4% → 37%. mamas-munches.css 23k → 19k chars. 60+8+40+51+14 = 173 tests passing across orchestrator + token_resolver + css_router + scaffold + promotion + essence-match. Header/footer-as-blocks anti-pattern (5th occurrence today) now blocked at both tool layer (P2.0 PostToolUse hook) AND source layer (P2.i chrome-skip in stage_9b autonomy). The 1009-row attribute_gap_candidates backlog now has a promotion CLI."
blockers:
  - "Hero 375 mobile regression (+13.3pt vs post-C baseline) — appeared in P1.B.x. Likely F5 responsive-variant-attr resolution gap. Next session investigation."
  - "Social-proof 768 partial regression (+5.1pt) — same probable cause. Next session investigation."
  - "Dead-CSS-selector problem (council R2) remains — mockup class names like .sgs-hero__sub don't match render.php output .sgs-hero__subheadline. Phase 2 (ii) promotion stage shipped but operator hasn't yet promoted any candidates. Closing R2 is incremental work: each promoted attr converts a dead-CSS rule into a D1 typed-attr lift."
  - "Pixel-diff target (≤ 5% per section at 1440) NOT YET ACHIEVED. Phase 1 + Phase 2 delivered the architectural foundation; the pixel-diff target needs ongoing operator promotion of attribute candidates + the F5 mobile responsive-attr fix."
---

# small-giants-wp — State Snapshot

11 commits shipped on main this session (8ceb8787 → 36ef9552). Phase 1 Spec 16 architectural rewrite complete + Phase 2 four future capabilities shipped. Pipeline is now structurally sound at every layer (cv2 walker + token_resolver + css_router + scaffold + promotion + variations + tool-layer hook), but pixel-diff target not yet hit pending operator-driven attribute promotion + a mobile-regression follow-up.

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
