---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-28-spec-22-phase-1-walker-rewrite
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-0-foundation
primary_goal: "Open Spec 22 Phase 1 — universal walker rewrite. Phase 0 closed 2026-05-27 (6 commits). Phase 1 ships as 5 commits per R-22-5: 1.1 pre-rewrite snapshot, 1.2 atomic-tag map migration, 1.3 ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution, 1.4 universal walker (THE core rewrite), 1.5 measurement + halt/proceed."
first_action_eta: "10 minutes for Commit 1.1 (pre-rewrite snapshot — git mv convert.py to _retired/convert_pre_spec22.py + living-docs note). Then ~5-6 hours for Commits 1.2-1.4."
---

# Next session — Spec 22 Phase 1 (universal walker rewrite)

Phase 0 is closed. The cloning pipeline foundation is in place:
- Tier B canonical_slot backfill applied (4 rows)
- Role detection from block.json populated 94 rows (94 role writes; 52 reclassifications)
- `equivalent_block_for()` shared 3-tier-now-2-tier derivation function shipped with positive-allowlist role-exclusion (D85), Tier C deleted (D86)
- DB-derived role classification via `slot_synonyms.role_classification` column
- pixel-diff.py chrome-hide + --wait-fonts + --keep-chrome (D87)
- sgs-clone-orchestrator.py auto-passes --wait-fonts on Spec-22-gated runs
- wp-blocks.py FR-22-8 CLI shipped (6 subcommands) + 30/30 adversarial tests pass
- External regression test (4/4 PASS) guards against future drift
- Mama's baseline re-captured: overall mean 62.99% → 58.91%, hero 1440 honest -8.8pp correction
- Hybrid-block roster: 61 blocks (canonical Phase 2 scope; prioritise by hybrid_attr_count descending)

## Mandatory reading (in order)

1. This file
2. `.claude/state.md` — current_subphase_step shows Phase 0 closed
3. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` — §3 FRs (especially FR-22-1, FR-22-2, FR-22-3, FR-22-5), §6 R-22-1 through R-22-13, §7 Phase 1 commits (1.1-1.5), §13 Appendix A (walker pseudocode)
4. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` — full Phase 1 plan with model routing + risk + estimates per commit
5. `.claude/decisions.md` D78-D88 (top entries) — full Spec 22 architecture context
6. `.claude/reports/2026-05-27-hybrid-block-roster.md` — Phase 2 scope (consumed by Phase 2, NOT Phase 1; reference only)

## Phase 1 commit cadence (per R-22-5)

| Commit | Scope | Model | Risk | Estimated time |
|--------|-------|-------|------|---------------|
| **1.1** | Pre-rewrite snapshot — `git mv plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py plugins/sgs-blocks/scripts/orchestrator/_retired/convert_pre_spec22.py`; no behavioural change | Inline | LOW | ~10 min |
| **1.2** | Atomic-tag map migration — replace hardcoded `ATOMIC_TAG_MAP` (convert.py:698-704) with DB-driven `db.atomic_tag_map()` per Spec 22 §14 Appendix B | Sonnet via `/delegate` | LOW (structural cleanup) | ~1-2 hours |
| **1.3** | ARRAY_LIFT_PATTERNS retirement + array-of-objects resolution per FR-22-2.5 — delete `ARRAY_LIFT_PATTERNS` dict; walker treats array attrs as sibling-class container; per-item resolution via FR-22-1 BEM signature | Sonnet via `/subagent-driven-development` | MEDIUM | ~2 hours |
| **1.4** ⚡ | **Universal walker (THE core rewrite).** Delete `lift_subtree_into_block_attrs` (convert.py:3387), `_lift_inner_blocks` (convert.py:1350), F1 fallback (convert.py:3916), 9-branch walk(), per-block hardcoded branches. Implement single-path walker per FR-22-3 + Appendix A. New helper functions in `converter_v2/db_lookup.py`. LRU cache. | Sonnet via `/subagent-driven-development` (one implementer + 2 reviewers) | ⚡ HIGH | ~5-6 hours |
| **1.5** ⚡ | Phase 1 measurement + halt/proceed decision. Full-page `/sgs-clone --auto-section --debug-trace`. Every body section measured. If all 7 sections × 3 viewports ≤5%, Phase 1 closes; if any > 5%, halt + diagnose | Inline | ⚡ HIGH (gate evaluation) | ~1 hour |

## Tool bindings

- **Skills:** `/autopilot` (SessionStart), `/sgs-wp-engine` (any framework code), `/qc-council` (pre-commit gate per blub.db 255 for Commits 1.3 + 1.4 — converter-adjacent), `/qc-inline` (Commit 1.2 + 1.5), `/delegate` (model picking), `/subagent-driven-development` (Commits 1.3 + 1.4), `/verify-loop` (2-attestation), `/capture-lesson` (any new corrective rule surfaced), `/handoff` (session close)
- **DB query tools:** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block <slug>` (block schema); `python ~/.claude/hooks/wp-blocks.py equivalent-block <slug> <attr>` (FR-22-8 CLI); `/sgs-db` (slash command)
- **Pipeline tools:** `/sgs-clone --debug-trace` (Stage 11 pixel-diff measurement after each commit per R-22-4)
- **Live verification:** Playwright MCP (live-page DOM check is canonical per R-22-11)
- **Tests:** `python plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` (5/5 expected); `python plugins/sgs-blocks/scripts/orchestrator/_tests/external-derivation-regression.py` (4/4 expected); `python plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-adversarial.py` (30/30 expected)

## Binding rules every commit obeys

Per Spec 22 §6. Highlights:

- **R-22-1** — DB-first, no hardcoded dicts; only permitted const is `SKIP_TOP_LEVEL_TAGS` (3 entries)
- **R-22-3** — Three permitted walker exceptions, no others (atomic-tag swap / chrome-skip / top-level container wrap)
- **R-22-4** — Pixel-diff measurement gates every commit; commit message cites predicted vs actual delta
- **R-22-5** — Phases never ship as single commits; Phase 1 IS the 5-commit cadence above
- **R-22-9** — Universal mechanisms, no per-block hyperfocus
- **R-22-11** — Verify rendered output, not internal metrics (live Playwright DOM is canonical)
- **R-22-12** — /qc-council pre-commit gate enforced via `pipeline-stage-gate.py` hook for Commits 1.3 + 1.4
- **R-22-13** — Bean visual sign-off co-authoritative with pixel-diff for Commit 1.5 close

## Phase 1 pre-conditions — ALL VERIFIED 2026-05-27 (closing session)

- ✅ Branch on main
- ✅ Spec 22 status: active (§16 ratification gate ticked)
- ✅ `python sgs-db.py stats` clean (194 blocks / 2,246 attrs / 89 slot_synonyms)
- ✅ `npm run build` exits 0 (webpack compiled successfully, 98 styles up to date)
- ✅ Sandybrown canary HTTP 200 (1.89s response — `/rc-fix-verification-mamas-munches/`)
- ✅ Pre-rewrite DB snapshot exists (`pipeline-state/_snapshots/sgs-framework-pre-spec22.db` SHA256 `d088...0017bc`)
- ✅ `slot_synonyms` content-bearing rows audited: 10 of 11 NULL `standalone_block` are correctly NULL by design (alt/ariaLabel/bar/feature/header/nav/slot/options/progress/ribbon — accessibility / color / 0-usage / role-excluded). 1 gap filled (`role.standalone_block = sgs/label` activates team-member + testimonial role routing).
- ✅ FR-22-8 performance threshold verified (cold mean 3.2ms ≤20ms; warm mean 0.0002ms ≤2ms)
- ✅ All tests PASS: db_lookup 5/5, external-derivation 4/4, wp-blocks adversarial 30/30

## First action

`git mv plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py plugins/sgs-blocks/scripts/orchestrator/_retired/convert_pre_spec22.py` (after `mkdir -p plugins/sgs-blocks/scripts/orchestrator/_retired`). Confirm git status shows the rename. Add a one-line note to state.md noting the rename. Commit 1.1.

Then proceed sequentially to 1.2 → 1.3 → 1.4 → 1.5. Each commit gets:
1. Implement (model per table above)
2. Pre-commit gate (`/qc-council` ⚡ or `/qc-inline` per table)
3. Living-docs updates per Spec 22 §8 cross-doc impact list
4. Measurement — `/sgs-clone --debug-trace` + Stage 11 pixel-diff capture
5. Commit message citing predicted vs actual delta
6. `/verify-loop` 2-attestation per load-bearing claim

## Phase 1 acceptance gate

**Per-section ≤5% × 3 viewports for all 7 body sections (21 cells each ≤5%).** Plus Bean visual sign-off on cropped-pair artefacts (R-22-13 co-authoritative).

Baseline at `pipeline-state/mamas-munches-144-2026-05-26-122349/stage-11-pixel-diff.json` (overall mean 58.91% post-Wave-B re-capture):

| Section | 375 baseline | 768 baseline | 1440 baseline | Phase 1 target |
|---------|------|------|------|----|
| hero | 87.8% | 64.1% | 60.8% | ≤5% × 3 |
| trust-bar | 37.0% | 24.6% | 33.1% | ≤5% × 3 |
| featured-product | (re-baselined) | 68.6% | (re-baselined) | ≤5% × 3 |
| brand | 55.6% | 50.9% | 46.0% | ≤5% × 3 |
| ingredients-section | (re-baselined) | (re-baselined) | (re-baselined) | ≤5% × 3 |
| gift-section | (re-baselined) | (re-baselined) | (re-baselined) | ≤5% × 3 |
| social-proof | (re-baselined) | (re-baselined) | (re-baselined) | ≤5% × 3 |

Plus: NO section regresses >2pp from baseline at Commit 1.4 measurement; ≥5 of 7 sections drop ≥40pp toward target.

## Phase 1.5 stretch (parked here for visibility)

After Phase 1 closes at ≤5%, Phase 1.5 diagnoses the residual ~4pp via:
- Theme.json-token vs inline-value cascade rendering precision
- Image-dimension rounding noise
- Other font / cascade artefacts

Phase 1.5 work is empirically scoped after Phase 1 measurements arrive.

## Dispatch bindings (verbatim in every Agent cold prompt — per blub.db row 240)

- **Binding A** — NO commit authority. Return uncommitted artefacts.
- **Binding B** — Per-sub-change `/sgs-clone --debug-trace` measurement (Stage 11 auto-captures).
- **Binding C** — Living-docs + `/capture-lesson` inline per change.
- **Binding D** — TodoWrite breakdown + per-sub-task status.
- **Binding E (Spec 22 FR-22-6.1)** — No shared-file edits in parallel agents (Phase 2 only; doesn't apply to Phase 1 since 1.2-1.4 all touch convert.py sequentially).
- **Binding F** — No `git stash` / `git reset` / `git restore` / `git checkout` (per blub.db row 230 + Wave A Sonnet 2's flagged violation).

## What success looks like (one line)

Phase 1 closes when every body cell on Stage 11 measures ≤5%, the universal walker is shipped per Spec 22 with exactly 3 permitted exceptions, `convert.py` is reduced ~50-60% in LoC, all 20 catalogued Spec 16 cheats are removed, and `/sgs-clone` produces deterministic ≤5% per-section output on any client mockup with a clear path to ≤1% via Phase 1.5.

## Out-of-scope this session

- Phase 2 (hybrid block render.php migrations) — opens after Phase 1.5 closes per Spec 22 §7
- Phase 1.5 noise-floor work — empirically scoped post-Phase-1
- Header/footer cloner — Phase 2 sibling, parked
- Cross-client validation (Indus Foods) — Phase 4.2

## Out-of-scope-but-recently-flagged

- `sgs/responsive-logo.width` Tier B row rejected by Bean — flagged for review post role-detection-enrichment (see P-SGS-UPDATE-ROLE-DETECTION-IMPROVE)
- Form-field family classifications validated 2026-05-27 (block.json declares role="content" on label/placeholder/helpText explicitly; conditionalField/Operator/Value also correctly classified per Bean review)
