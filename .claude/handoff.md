# Session Handoff — 2026-05-21

## Completed This Session

1. **Created `/qc-council` skill** — multi-rater empirical-validation council protocol at `~/.agents/skills/qc-council/` (SKILL.md + 3 references + fixture + hook). Skillscore 92% A-, gap-analysis B (4.2/5), S-grade confirmed (5 of 6 criteria). 8-stage protocol with cross-model enforcement, structural pre-gates, hard iteration cap, certainty_calc, empirical baseline gate, experiment-shape handoff. Bulk-fixed 8 gaps from gap-analysis incl. goal-shaped success criteria.
2. **Shipped Wave 1 G2 Step 1+2** (small-giants-wp main `affca3f1`) — `sgs-clone-orchestrator.py` now merges `theme/sgs-theme/styles/<client>.css` into `_section_css`; `convert.py` strips `.page-id-\d+` scope prefix in selector matcher; 7 regression-guard unit tests in `test_g2_scope_strip.py`. 5 sections doubled `variation_css_rules` (featured-product / brand / gift / social-proof / ingredients). Hero + trust-bar stayed at 0 (FR1 fast-path bypass — parked).
3. **G4 chrome-strip discarded** — empirically falsified (`el.screenshot()` already clips to bounding box). No-op for canonical `--selector` workflow.
4. **Wave 2 reshape: G1+G3+G5 → ONE wiring gap** — `/wp-blocks dump` confirmed SGS-framework.db has property_suffixes (117) + slot_synonyms (89) + block_compositions (37) + block_attributes (1755) + modifier_suffixes (19). `block_compositions` is **write-only** in current code; cv2 walker doesn't query it. Reshape captured in Spec 16 §15 + plan.md + parking.
5. **Created `shared-references/verification-rationalisations.md`** — iron law + red flags + rationalisation tables extracted from deleted `/test-driven-development` + `/verification-before-completion` source skills. Consumed by `/qc`, `/qc-inline`, `/qc-council`, `/verify-loop`, `/systematic-debugging` as Mandatory References.
6. **Cross-referenced qc-trio across 11 sibling skills** — `/qc`, `/qc-inline`, `/strategic-plan`, `/phase-planner`, `/brainstorming`, `/dispatching-parallel-agents`, `/systematic-debugging`, `/research-council`, `/sgs-clone`, `/visual-qa`, `/sgs-wp-engine`. Plus backport subagent landed 5 patterns from qc-council into qc + qc-inline (cross-model, structural pre-gates, experiment-shape, diagnostic-bucketing, ground-truth pre-load).
7. **Skill cleanup** — `/requesting-code-review` rewrote to 96% (was 46%) + marked `user-invocable: false`; `/systematic-debugging` rewrote to 97% (was 47%); `/subagent-prompt` + `/deploy-check` marked `user-invocable: false`; `/review` command stub + `/deploy-check` command stub deleted; `/dev` command routing updated to point at `/verify-loop` instead of deleted skills.
8. **`/gap-analysis` Step 7.75 tight-refactored** to delegate to `/qc-council` (removes ~80 lines of duplicate 3-rater panel; fallback path kept for backwards-compat).
9. **2 lessons captured** — blub.db row 276 (council-predictions-need-empirical-validation) + row 277 (skills-only-called-by-others-non-user-invocable). All three persistence layers + classifier-router fired.
10. **Doc walk: decisions.md (D21-D26) + mistakes.md (2 lessons) + parking.md (8 items) + Spec 16 §15 + cloning-pipeline-flow.md 2026-05-21 section + plan.md** all updated. Spec/registry walk complete.

## Current State

- **Branch:** `main` at `ad8ca75b`
- **Tests:** 173 prior + 7 new G2 unit tests in `test_g2_scope_strip.py` (all passing per backport subagent)
- **Build:** passes; npm run build green
- **Uncommitted changes:** 3 pre-existing (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db) — present since session start, none touched
- **Skill repo (`~/.agents/skills/`)**: feat/qc-skills-backport-from-qc-council branch with commits `e340cde` + `64739d3` (local only — no remote configured)

## Known Issues / Blockers

- **FR1 fast-path bypass** — registered SGS blocks (hero, trust-bar) take FR1 short-circuit at `convert.py:3675` and never append to `variation_buf`. One-line fix parked as `P-FR1-VARIATION-BUF-CONSISTENCY`.
- **`block_compositions` write-only** — pipeline doc claims it's read; actually only `pattern-register.py` + `seed-block-compositions.py` write to it. Parked as `P-BLOCK-COMPOSITIONS-READ-PATH`.
- **Cloning-pipeline-flow.md drift** — line 354 inaccuracy + line 116 stale "verified 2026-05-13" entry-point chain. Parked as `P-CLONING-PIPELINE-FLOW-DOC-DRIFT`.

## Next Priorities (in order)

1. **Wave 2 wiring fix** — wire `block_compositions` read path + `property_suffixes` query for visual slots + parent-child class graph into cv2 walker emit shape. Dissolves G1 + G3 + G5 in one architectural change.
2. **FR1 one-line consistency add** — `variation_buf.append(_collect_css_for_classes(classes, css_rules))` after `lift_subtree_into_block_attrs()` at `convert.py:3675`. Lands alongside Wave 2 wiring.
3. **F5 D1 media-field flow** — responsive variants (`@media` → `*Mobile` / `*Tablet` / `*Desktop` attrs). Distinct from Wave 2 wiring; runs after.
4. **Smoke-test `/qc-council` against the fixture** — `scripts/fixtures/example-council.json` has the 2026-05-21 Wave-1 G2+G4 case study. Confirm the skill catches the planted no-ops as designed.
5. **Doc-accuracy rewrite of cloning-pipeline-flow.md** — entry-point chain + DB heat-map sections need full rewrite per the 2026-05-20 architectural changes.

## Files Modified

| File path | What changed |
|-----------|--------------|
| `~/.agents/skills/qc-council/` (new dir) | New skill — SKILL.md + 3 references + fixture + hook |
| `~/.agents/skills/shared-references/verification-rationalisations.md` (new) | Canonical iron-law home extracted from deleted source skills |
| `~/.agents/skills/{qc,qc-inline,strategic-plan,phase-planner,brainstorming,dispatching-parallel-agents,systematic-debugging,research-council,visual-qa,sgs-wp-engine,requesting-code-review,subagent-prompt,gap-analysis,autopilot}/SKILL.md` | Cross-refs to qc-council + 5 backports + frontmatter updates |
| `~/.claude/skills/verify-loop/SKILL.md` | QC trio cross-ref + iron-law canonical source pointer + marker update |
| `~/.claude/skills/deploy-check/SKILL.md` | `user-invocable: false` |
| `~/.claude/skills/automation-recommender/SKILL.md` | `/test-driven-development` → `/verify-loop` |
| `~/.claude/commands/dev.md` | Routing table: start + verify → `/verify-loop` |
| `~/.claude/commands/{review.md,deploy-check.md}` | DELETED (retired stubs) |
| `~/.agents/skills/{test-driven-development,verification-before-completion}/` | DELETED (absorbed into shared-references/verification-rationalisations.md) |
| `.claude/decisions.md` | D21-D26 (6 decisions this session) |
| `.claude/mistakes.md` | 2 lessons (rows 276 + 277) |
| `.claude/parking.md` | 8 deferred items |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | §15 Wave 2 reshape |
| `.claude/cloning-pipeline-flow.md` | 2026-05-21 corrections section |
| `.claude/plan.md` | Wave 2 reshape entry |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | G2 Step 1: orchestrator merges variation CSS |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | G2 Step 2: strip `.page-id-N` in matcher |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_g2_scope_strip.py` (new) | 7 regression-guard unit tests |
| `.claude/gap-analysis/reports/2026-05-21-qc-council-skill.md` (new) | qc-council skill gap-analysis report |

## Notes for Next Session

- **OUTCOME vs COMPLETION (Gate 3.5):** Wave 1 G2 Step 1+2 is **CODE SHIPPED, OUTCOME NOT YET HIT**. 5 sections doubled `variation_css_rules` (architectural unlock) but pixel-diff hasn't moved because G3 (slot resolver visual-slot query) hasn't landed. Step 1+2 is enabling infrastructure. The pixel-diff outcome arrives when Wave 2 wiring + FR1 fix land together. Do NOT redefine this as done.
- **The mapping data Bean asked about exists in the DB** — confirmed via `/wp-blocks dump`. The wiring gap is cv2 not querying `block_compositions` (37 rows, write-only) and slot_list not querying `property_suffixes` for visual slots. Wave 2 = one wiring change, not three per-block fixes.
- **Always use `/qc-council` for multi-fix proposals** — binding methodology rule. 2026-05-21 Wave 1 had 2/2 council fixes produce no-ops despite being implemented exactly. Empirical pre/post gate now mandatory before subagent dispatch.
- **`~/.agents/skills/` has no git remote** — feat/qc-skills-backport-from-qc-council branch is local-only. Commits `e340cde` + `64739d3`. Either configure a remote or merge locally + accept the loss-on-disk-failure risk.

## Next Session Prompt

See `.claude/next-session-prompt.md` (canonical lowercase) — orchestration plan with per-task model routing, dispatch pattern, and acceptance criteria.
