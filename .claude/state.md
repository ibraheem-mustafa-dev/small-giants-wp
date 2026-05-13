---
doc_type: state
project: small-giants-wp
project_id: 14
current_phase: spec-15-phase-7-pattern-fidelity
current_subphase: phase-6-step-0-SHIPPED (commit d0d30579); Phase 7 planned at .claude/plans/phase-7-pattern-fidelity.md (12 steps; ~3-4 hr; hard pass <=1% pixel diff at 3 viewports). Phase 5 stays OPEN until Phase 7 closes the parity gate. Phase 6 (cross-platform output) sequenced after Phase 7.
current_subphase_step: "Sub-phases 5a-5f shipped previously. 5g.1 + 5g.2 + 5g.3 shipped this session (2026-05-13-074854). 5g.1 hard-gates unregistered candidates in confidence-matrix.py:94-107 — unregistered slugs now drop entirely rather than diluting to confidence 0.75. 5g.2 wires bucket-c-classifier + atomic-block-scaffold into stage 9b autonomy chain — promotes new SGS blocks via FR21 staged-merge channel. 5g.3 adds compose_atomic_pattern() helper + replaces deferred-fallback skip at stage 4 with wp:sgs/container wrapping core/heading + core/paragraph + sgs/button + sgs/decorative-image atomic composition. Live E2E (run mamas-munches-homepage-2026-05-13-074854): 9 sections all render with content (vs prior 3 of 9), 5/5 acceptance harness GREEN, 6 blocks scaffolded + promoted to canonical (header/featured-product/ingredients-section/gift-section/social-proof/footer; 0.1.0-scaffold). Bean verified all 9 sections with own eyes via sandybrown deploy. Phase 5 literal acceptance gates (≥90% coverage + ≤1% pixel diff): NOT MET — coverage 38.2% (denom-inflated), styling diverges from mockup's bespoke layouts. Class of defect SHIFTED from 'sections vapour' (85% diff) to 'styling-doesn't-reproduce-mockup' (still significant diff). Bean accepted PARTIAL closure (option A from 2026-05-13 decision): commit 5g.1-5g.3, Phase 5 closed-with-acknowledged-styling-gap. Styling fidelity is now a NAMED follow-up sub-phase: **Spec 15 Phase 5h — Styling parity fidelity. PASS CRITERION: ≤ 1% pixel diff at 375 / 768 / 1440 viewports vs mockup. Bean confirmed 2026-05-13.** Phase 5 stays open at 5h until that gate is met. 3 follow-ups parked into 5h scope: composer CSS-mapping extension (the load-bearing fix for 5h), coverage-metric redesign, scaffold polish."
phase_4_summary: "Phase 4 + 4.5 (convention enforcement gates + additive token discovery + Font Library) shipped 2026-05-12 across 4 commits on origin/main (8599faf3 / 55a6d73e / 3c2c07b7 / a9b9b1c3). Stage 0.1 BEM lint + Stage 0.5 token lint integrated into /sgs-clone with 3 modes (strict/draft/legacy). Token lint pivoted from snap-to-nearest verdict mode to additive discovery mode mid-phase per operator framing 'cloning preserves intentional bespoke detail — small differences ARE the design'. Non-token values now become NewTokenCandidate rows written to the client's style variation JSON, not violations. max-width / min-width route to a dedicated _snap_max_width matcher against settings.layout.contentSize + wideSize + settings.custom.maxWidth.* (exact-match, no fuzzy tolerance). border / outline shorthand routes per-word (lengths→spacing, colours→colour, style keywords skipped). Variation overlay via variation_paths kwarg + --variation CLI flag merges client tokens on top of base theme.json so existing client tokens don't resurface as candidates. Orchestrator auto-resolves variation from --client flag with explicit fallback log when missing. Parser-aware value_col_offset replaces the len(prop)+2 heuristic so per-part shorthand columns land pixel-exact regardless of whitespace variation. Pre-commit hook fires on sites/*/mockups/*.{html,htm,css} with SGS_LINT_STRICT=1 env var for hard-gate mode; auto-derives client variation from staged file path. Long-tail gap closure: 37 candidates → 0 (7 new canonical slots: header, feature, bar, star, tab, quote, role; 11 mobile-nav show* → boolean-visibility; 11 instance-data flagged). FR38 + FR39 closed. Font Library scaffold registers all 1,923 uimax google_fonts as wp_register_font_collection() with ZERO frontend cost (theme.json fontFamilies untouched — Issue #39332 avoided). Mama's mockup proof-of-concept: 3 candidates → 0 with variation overlay → 2 new tokens (spacing-28 + narrow-420) written to mamas-munches.json, post-apply re-discovery 0 candidates, idempotent re-apply 0 added. /ui-ux-pro-max + /innovative-design SKILL.md updated with HARD RULE for SGS-BEM + theme.json tokens. 3-rater QC panel (Sonnet strict + Haiku sanity + inline synthesis) returned ship after fixing 2 ship-blockers (v.class_token AttributeError + missing --variation CLI flag) + 3 deferred concerns + 2 polish items. Drift validator 0/1343 PASS preserved end-to-end. Hero --verify-against tests/golden/hero-extraction-baseline.json PASS preserved. 81 canonical slots in vocabulary. 1,236/1,343 attrs canonicalised. Two follow-ups parked post-Phase-6: P-S15-STYLEVAR-GEN (auto-generate style variations from uimax font_pairings + colour palettes; framed as Step 1 of every future draft-design cycle) and P-S15-PAIRINGS-PICKER (Site Editor SlotFill panel for browsing uimax pairings)."
current_step: "Phase 5 modules 5a-5f ALL shipped on origin/main 2026-05-12/13 across 9 commits (73a33b1c preflight, a0e1d145 5a, f8398efd 5b, 4061114a 5c, 14ba9782 5d, 8f2e9ff1 5e, c4f0c3e5 5f, 93b6226f harness whitelist, 70f56c39 stage-9 coverage fix). First live E2E run 2026-05-13 on Mama's homepage (run_id mamas-munches-homepage-2026-05-13-055523): pipeline runs all 9 stages, emits 22606 chars of block markup, 5/5 acceptance harness GREEN. Deployed to sandybrown post 58, screenshotted at 3 viewports, pixel-diffed vs mockup — 85% diff at all viewports vs 1% target. Root cause: (1) confidence-matrix.py:95-107 detects registered=False but only dampens confidence to 0.75; orchestrator emits unregistered block names that WP drops silently. 6 of 9 sections routed to non-existent blocks (header/featured-product/ingredients-section/gift-section/social-proof/footer). (2) Hard Rule 3 violated — orchestrator emits bare self-closing block comments + wp:html style dumps; no wp:sgs/container wrapper, no InnerBlocks composition, no atomic-block content. (3) 5a.2 bucket-c-classifier + 5b.8 atomic-block-scaffold autonomy chain exists as modules but NEVER fires in legacy production orchestrator. Phase 5 acceptance 3 of 5 gates: modules shipped ✅, panel 3/3 ship ✅, harness 5/5 GREEN ✅, coverage ≥90% ❌ (38% literal), visual parity ≤1% ❌ (85% diff). Phase 5 NOT CLOSED. Phase 5 closure path = sub-phase 5g (orchestrator emission-stage rewrite, ~2 hr) defined in phase-5-clone-pipeline-e2e.md. Test page deleted post-test. Artefacts at pipeline-state/mamas-munches-homepage-2026-05-13-055523/{stage-*.json,full-page-markup.html,operator-review.html,deliverable.md,screenshots/}."
last_updated: 2026-05-13 (Phase 6 Step 0 SHIPPED commit d0d30579; Phase 7 plan written at .claude/plans/phase-7-pattern-fidelity.md; next session executes 12 steps to close <=1% pixel-parity gate)
blockers:
  - "Skillscore rubric mismatch: command files (~/.claude/commands/*.md), agent files (~/.claude/agents/*.md), and reference-style mini-skills (polish, bolder, colourise, distill, etc.) are graded against full-skill criteria. 24 of 45 Phase 4 files sit below 90% for this reason - all pre-existing baseline noise, not caused by Phase 4 edits. Future fix: add skill-type classifier to sgs-skillscore."
recommended_model_next: opus
---

# small-giants-wp — State Snapshot

> Frontmatter above is the contract. Body below is regenerated by `/handoff` each session.

## Where we are

**Cloning-pipeline foundation phase CLOSED (2026-05-07/08).** Foundation locked via 4-model peer review.

**M7 + M8 + M10 closed (2026-05-09).** 6 sibling skills + minimal orchestrator + hero smoke at 100% PoC parity. M9 deferred.

**Convention rollout in progress (2026-05-10 — this session).** Phase 1 of the convention rollout plan (`.claude/plan.md` + `.claude/plans/phase-1..8.md`) is executing. Canonical reference for the SGS-prefixed BEM convention: **`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md (§8.1; former Spec 13 absorbed 2026-05-12)`** (locked 2026-05-10, blub.db row 236). All Bean-controlled drafts MUST conform; live scrapes use lingua-franca-conversion. Phase 1 = capture lesson + Spec 13 + lifecycle bulk-mode + 6 living docs + uimax `is_canonical_for_sgs_drafts` flag.

**M9 redo in progress (2026-05-09 evening + 2026-05-10 — this session).** Major architectural progress + correction:

| Item | Status |
|---|---|
| Pre-flights (4 of 4) | ✅ All clean |
| Slot-filler I/O schema design | ✅ `.claude/specs/slot-filler-io-schema-2026-05-09.md` |
| Strip extract.py (1569 → 647 LOC) | ✅ /qc-inline PASS, smoke run produces correct manifest shape |
| Test scaffolding (14 tests) | ✅ All collected |
| slot-filler.py v1 (1116 LOC) | 🟡 8/14 tests pass; content extraction generic; token extraction blocked |
| First subagent build attempt | ❌ Rejected — was hero-hardcoded copy-paste, violated spec |
| Architectural correction | ✅ Per-block attr_mappings = wrong; convention coverage = right |
| Master script inventory across 3 folders | ✅ `.claude/reports/script-inventory-master-2026-05-09.md` |
| Spec 12 fully rewritten | ✅ 507 lines, captures corrected architecture + current state |
| pattern-register.py:43 stale DB path fix | ✅ Pointed to `~/.agents/skills/...` (Hard Rule 8) |
| screenshot-diff-helper.js:43 threshold (1 → 5) | ✅ Matches Hard Rule 10 spec |

**Realised this session:** the gap is naming-convention CATALOGUE coverage, not per-block extraction logic. Once role-templates.json carries all 16 uimax conventions, slot-filler dispatches generically across every SGS block.

## Open tracks (priority order)

1. **M9 finish — convention-coverage rebuild** (next session, Opus, ~7-8 hr)
   - Audit + design role-templates additions (~30 min inline)
   - Add Kebab-semantic to uimax `naming_conventions` (~20 min)
   - Add 7 missing platforms to role-templates.json (~45 min wall-clock via 7 parallel Sonnet subagents)
   - Patch slot-filler.py with `attr_name_to_element_id` derivation (~60-90 min inline)
   - Validate hero parity 50/50 (~60-120 min )
   - Validate other 8 Mama's sections produce non-empty filled_slots
   - Run critical-fix-verification.py gate (built per spec 14 P10 as lightweight acceptance harness — 5 canonical-mutation-boundary checks: no root theme.json mutation, no canonical-block files mutated outside FR21 commit, no licensing strings in uimax writes, idempotency re-run produces no new gap rows, staging dir empty post-success)
   - Rewire orchestrator: replace stages 1-2-9 hardcoded shortcuts with subprocess calls into recogniser scripts (~90-150 min)
   - Live deploy on sandybrown homepage with eyes-on review at all 3 breakpoints
2. **Bucket 2 + timeline rework (P-9)** — after M9 ships
3. **Phase 2.5 / G2.5 deferred work (P-2)**
4. **Dashboard route.ts rebuild + row 69 re-POST + test row 219 cleanup**
iteration
## Subprojects

- Mama's Munches — `sites/mamas-munches/.claude/` — homepage clone is the active workstream
- Indus Foods Phase 4 — `sites/indus-foods/.claude/`

## Decisions 2026-05-10 (this session)

- **Per-block attribute_mappings rejected as wrong target.** The right target is full naming-convention coverage in role-templates.json. Bean's instinct was right: "block fingerprints + naming conventions = sorted forever." This decision unlocks all 66 SGS blocks + any future block + any of 16 mockup conventions or a mix.
- **The mapping data canonical home is uimax not layer-3.** Per Hard Rule 7 (Rosetta Stone discipline). Confirmed sgs-db `block_selectors` is for WordPress block.json `selectors` API config (NOT mockup-selector mapping); `extraction_cache` is empty + URL-keyed cache.
- **First slot-filler subagent build rejected.** It went 1329 LOC hero-hardcoded with 0 references to `selector_strategies` / `value_extractor` / `fallback_strategy` (the role-templates fields). Replaced with my own inline build (1116 LOC, generic dispatch). Lesson: when a subagent's "design judgement" contradicts the spec, reject the build.
- **Slot-filler v1 stops at 9/50 hero parity, NOT 50/50.** The 41 missing attrs are CSS-token-shaped and need the 7 missing platforms in role-templates. Honest stop, not a false claim.
- **Spec 12 rewritten end-to-end.** Captures corrected architecture (4 components: extract.py + foundation catalogue + slot-filler + orchestrator), full file inventory across 3 folders, all 9 stages + 3 tail stages with current wiring status, naming-convention coverage gap, and next-session unblocking path.
