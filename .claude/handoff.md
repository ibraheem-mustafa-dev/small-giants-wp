# Session Handoff — 2026-05-23 (Phase 1 reframe + revert + docs corrected)

## TL;DR (read this first)

The previous handoff (`f28842a1`) sent next session into Phase 1 of `2026-05-24-strategic-plan.md` with the wrong architectural framing. This session caught it mid-execution, reverted one bad commit (`f3885f14` reverting `124e1d06`), corrected the framing across Spec 16 + cloning-pipeline-flow + all 4 phase plans + docs-registry, and re-wrote Phase 1 to explicitly close G1+G3+G5 entirely.

**The architectural correction:** sections falling through to `sgs/container` is the **correct architectural default** per Spec 16 §FR4 + §R1 + §R4 + Decision 3 (2026-05-20), NOT a defect. The real gap is that the **normal route** (which every non-FR1-matched section takes — starts with `sgs/container` per FR4, then universal walker builds inner blocks element-by-element) doesn't have the universal walker (Spec 16 §15 steps 1-3) wired yet. Phase 1 now ships that walker + closes G1+G3+G5 as one coherent delivery.

**FR1 fast-path matches BOTH registered composite blocks AND registered pattern slugs** (Spec 16 §FR1 branch b). Section with class `sgs-featured-product` matches the `sgs/featured-product` pattern → emits `<!-- wp:pattern {"slug":"sgs/featured-product"} /-->` via FR1. Pattern fast-path is shipped alongside the universal walker in Phase 1 Step 1.5.

## Completed this session

1. **Caught + reverted wrong-scope commit `124e1d06`.** Agent built a tactical guard for composite_element branch instead of the universal walker. Reverted via `f3885f14`; pushed to main.
2. **Corrected framing across all docs:**
   - `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §FR1 rewritten as "fast path; not the default" with two-route topology table + pattern-match branch. FR3 + FR4 clarified to make normal-route start point unambiguous. §14 G-gap framing note added. §15 reframing note added.
   - `.claude/cloning-pipeline-flow.md` Stage 2 + Stage 4 STATUS notes rewritten with two-route topology + reverted-commit history.
   - `.claude/plans/2026-05-24-strategic-plan.md` Phase 1 USP + summary table + dependency graph corrected.
   - `.claude/plans/2026-05-24-phase-1-structural-recovery.md` rewritten end-to-end. New scope: ship universal walker (Step 1.5) + G1 OPEN-block emit (Step 1.6) + G3 slot_list visual extension (Step 1.7) + G5 per-block DOM fixes (Step 1.8) + hooks completion + role='content' DB sync (Step 1.9) + /qc-council verification (Step 1.10) + handoff (Step 1.11). Includes FR1 pattern fast-path branch wiring.
   - `.claude/plans/2026-05-24-phase-3-parking-sweep.md` updated — G gaps now genuinely closed by Phase 1, so verification-only IS correct; P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER moved to Phase 2 (header+footer cloner).
   - `.claude/plans/2026-05-21-architecture-staging.md` Decision 12 footnote corrected with FR1-vs-normal-route framing.
   - `.claude/docs-registry.yaml` updated — phase plan paths renumbered, new phase-2-header-footer-cloner added, scope descriptions corrected.
3. **Phase 2 plan created** earlier this session: `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` (header+footer specialised cloner per Spec 17, /qc graded PASS 88/100).
4. **Doc-drift fixes shipped earlier this session:** Spec 17 §6.4 + "73 blocks" → "69 blocks" across goals.md + cloning-pipeline-flow.md.

## Current state

- **Branch:** main at `f3885f14` (revert commit) + this session's doc updates (uncommitted until end-of-session commit)
- **Working tree:** all reverts + doc updates landed; pre-Phase-1-attempt state restored on code-side
- **Pixel-diff baseline:** `pipeline-state/mamas-munches-homepage-2026-05-23-145045/stage-11-pixel-diff.json` (mean 70.5%, the canonical pre-Phase-1 measurement to compare against)
- **Active phase:** phase-1-structural-recovery (re-scoped this session)

## Captured lessons (durable corrections in CC auto-memory)

- `feedback_dispatched_agents_no_commit_authority.md` — agents return uncommitted artefacts; main thread + Bean decide commits. Per-sub-change /sgs-clone runs mandatory (not bundled). Living-docs + /capture-lesson + TodoWrite inline per change. Extends `feedback_dont_delegate_the_test_of_unproven_work.md` to the commit-decision boundary.

## Known framing pitfalls (do NOT repeat)

These framings led the previous handoff astray. They are now corrected in the docs but worth flagging here so the next session doesn't regress:

1. **"5 of 9 sections fall through to fallback at Stage 2"** — wrong framing. Sections SHOULD fall through to `sgs/container` per FR4 + Decision 3. The actual gap is the missing normal-route universal walker.
2. **"Walker pre-pass closes the fall-through"** — wrong target. Walker steps 1-3 BUILD the normal route (sgs/container + universal walker → element-by-element inner-block emission). They don't make sections recognised at Stage 2.
3. **"Spec 16 §15 line 944 'every composite block inherits the same behaviour'"** — refers to registered composite blocks (hero, card-grid, multi-button), not arbitrary sections. Confirms the walker handles InnerBlocks uniformly across composite blocks INSIDE both FR1 and normal-route emit paths.
4. **"Stage 2 match.json confidence < 0.5 is a defect"** — wrong. confidence < 0.5 means "no FR1 fast-path match → take the normal route." That's correct routing, not failure.
5. **"_lift_inner_blocks closed G1+G3+G5"** — wrong. _lift_inner_blocks (step 4, shipped commit `79158da5`) is the DB-driven InnerBlocks emit primitive that BOTH routes consume. It doesn't close any G gap on its own — it needs steps 1-3 (universal walker) + G1 OPEN-block emit + G3 slot_list visual + G5 per-block DOM fixes.

## Files modified this session

| File | What changed |
|------|--------------|
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | FR1 reframed (fast-path + pattern-match branch), FR3 + FR4 clarified, §14 + §15 framing notes added |
| `.claude/cloning-pipeline-flow.md` | Stage 2 + Stage 4 STATUS rewritten with two-route topology |
| `.claude/plans/2026-05-24-strategic-plan.md` | Phase 1 USP + summary table + dependency graph corrected |
| `.claude/plans/2026-05-24-phase-1-structural-recovery.md` | End-to-end rewrite: G1+G3+G5 closure + universal walker + FR1 pattern fast-path |
| `.claude/plans/2026-05-24-phase-3-parking-sweep.md` | G gaps reframed as verification-only (genuinely closed by Phase 1) + P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER moved to Phase 2 |
| `.claude/plans/2026-05-21-architecture-staging.md` | Decision 12 footnote corrected |
| `.claude/docs-registry.yaml` | Phase paths renumbered, phase-2-header-footer-cloner added, scope descriptions corrected |
| `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md` | (created earlier this session) Phase 2 plan via /phase-planner + /qc fixes |
| `goals.md` + `cloning-pipeline-flow.md:1110` | "73 blocks" → "69 blocks" |
| `.claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md` | Option A SHIPPED verified |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_dispatched_agents_no_commit_authority.md` | New durable correction |

## Next priorities (in order)

1. **Execute Phase 1 of `2026-05-24-strategic-plan.md`.** Plan is at `.claude/plans/2026-05-24-phase-1-structural-recovery.md`. Closes G1+G3+G5 entirely + ships universal walker + FR1 pattern fast-path + hooks/role='content' data tasks.
2. **Phase 2 (header+footer cloner)** after Phase 1 closes — plan at `.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`.
3. **Phase 3 (parking sweep)** after Phase 2.
4. **Phase 4 (skill optimisation)** LAST per Bean's directive.

## Next Session Prompt

See `.claude/next-session-prompt.md`. **The prompt enforces strict reading discipline** — next session MUST cite specific section/line numbers + summarise each doc back before proceeding, NOT skim. This handoff's whole point is to prevent the framing-misread that broke this session.
