---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-spec-16-phase-7
session_date: 2026-05-14
recommended_model: opus
last_verified: 2026-05-14
update_triggers:
  - "/handoff run"
companion_docs:
  - .claude/state.md
  - .claude/next-session-prompt.md
  - .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md
  - .claude/plans/phase-7-spec-16-converter-rollout.md
---

# Session Handoff — 2026-05-14 (Spec 16 Phase 1 close)

## Completed This Session

1. **Shipped Spec 16 Phase 1: deterministic slot-aware converter prototype.** `.claude/scratch/converter-prototype/{db_lookup,convert,convert_page}.py` totalling 1,136 lines. Emits 286 lines of WP block markup on the full Mama's homepage — 10 SGS block types + 3 core block types, 12 sgs/containers (down from 114 pre-fix), 27 variation CSS rules.
2. **8 PRs merged to origin/main: #15-#22 + commit b16c1ae5.** #15 matcher pattern+scaffold tiers + trace, #16 composer_fallback retirement, #17 trace wiring + validator surface, #18 residue pattern deletion, #19 scaffold-stub block deletion, #20 +REGISTER real-capture gate, #21 sgs/label atomic block, #22 Spec 16 + Phase 7 plan + doc updates. Plus follow-up commit b16c1ae5 with R5 Destination 0 + Phase 7/Spec 16 closure split.
3. **New SGS atomic block `sgs/label`.** Three style variants (plain / pill-fill / pill-wrap), 22 attrs across content + typography + surface, native supports.color + supports.spacing. Promoted from inline core/paragraph usage.
4. **Spec 16 v0.2 written** at `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`. 5 architectural rules R1-R5 (R5 = "CSS drives emission, never drop, gap-flag via attribute_gap_candidates" with 4 destinations including Destination 0 for global/reset CSS), 9 FRs, 6 phases.
5. **Phase 7 rollout plan written** at `.claude/plans/phase-7-spec-16-converter-rollout.md`. 8 steps with per-step subagent dispatch tables routing Sonnet / Haiku / Gemini Flash / Gemini Pro / Cerebras per task shape.
6. **Two-tier QC ran on Spec 16: initial 4-reviewer panel (Sonnet/Haiku/Gemini Flash/Gemini Pro) + final 3-reviewer panel.** 9 fixes applied across two rounds.
7. **Doc updates per docs-registry.yaml:** state.md frontmatter advanced to spec-16-phase-7; decisions.md +8 entries; parking.md +6 items (P-S16-1 through P-S16-6); tooling-map.md updated with converter prototype + sgs/label + scheduled retirements; Spec 15 cross-referenced to Spec 16 absorption.
8. **Fixed container over-emission bug** uncovered by Bean's correction: nested wrappers now pass-through (only top-level section gets auto-emitted sgs/container). 114 → 12 container drop.

## Current State

- **Branch:** main at 14ce0a5c
- **Tests:** no test suite for prototype (run from CLI); orchestrator existing tests not run this session
- **Build:** n/a (no JS build needed; prototype is Python only)
- **Uncommitted changes:** `.claude/test/` (Bean's session fixtures) + 2 mamas-munches style variation files (carried from prior session)
- **Deployed:** No converter output deployed yet — Phase 7 Step 3 work
- **Pixel diff baseline:** still unverified end-to-end (Phase 7 Step 3 closes this)

## Known Issues / Blockers

- **R5 implementation is spec'd, not built.** Phase 1 prototype emits to variation CSS without the 4-destination routing logic yet. Phase 7 Step 2 (orchestrator wiring) is where the routing actually ships.
- **Phase 4 visual QA baseline is THE closure gate.** Bean has flagged repeatedly that we don't yet know if output is visually correct. Phase 7 Step 3 closes this — requires staging deploy + /visual-qa skill at 3 viewports.
- **Hard-coded `variantStyle` enum + special-case extractors** (packSizes, CTA primary/secondary). Move to live DB read via block_attributes.enum_values in Phase 3 per parking P-S16-3.

## Next Priorities (in order)

1. **Execute Phase 7 plan end-to-end** — `.claude/plans/phase-7-spec-16-converter-rollout.md`. 8 steps, ~2.5-3 hours wall time with parallel subagent dispatch per the plan's delegation tables.
2. **Phase 4 (Step 3 in the plan) is the load-bearing gate** — deploy + visual-qa with 2-iteration cap. If first pass fails diff > 1%, ONE Sonnet diagnostician then surface to Bean. Don't loop unbounded.
3. **After Phase 7 closes (Mama's at ≤1% diff), run on Indus Foods or helping-doctors** as Spec 16 §9 item 7 second-client validation. THIS is Spec 16 closure, not Phase 7 closure — distinguished in plan §8.

## Files Modified

| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/src/blocks/label/*` | NEW — sgs/label atomic block (PR #21) |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Composer retirement + trace wiring + matcher fix (PRs #15-#20) |
| `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` | Pattern + scaffold tier matching (PR #15) |
| `plugins/sgs-blocks/scripts/orchestrator/trace.py` | NEW — Q3 trace logging infra (PR #15) |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | NEW — Spec 16 v0.2 (PR #22 + b16c1ae5) |
| `.claude/plans/phase-7-spec-16-converter-rollout.md` | NEW — next-session plan |
| `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | Status header note → Spec 16 absorption |
| `.claude/state.md` | Phase advanced to spec-16-phase-7-converter-rollout |
| `.claude/decisions.md` | +8 Spec 16 decisions appended |
| `.claude/parking.md` | +6 parked items (P-S16-1 through P-S16-6) |
| `.claude/tooling-map.md` | Converter prototype + sgs/label + scheduled retirements |
| `.claude/scratch/converter-prototype/` | Prototype Python modules (gitignored) |

## Notes for Next Session

- The Phase 7 plan's delegation table per step is the load-bearing artefact. Read it before dispatching anything — it specifies which model handles which step (Sonnet for architecture, Haiku for mechanical, Gemini Flash for cheap edits with context, Cerebras for grep audit).
- The 2-iteration cap on Phase 4 is non-negotiable. Bean has been burned by unbounded loops. After 2 tries with a Sonnet diagnostician, surface to Bean with diff thumbnails.
- `attribute_gap_candidates` table already exists in Spec 15 §4.2 — Phase 3 just writes to it; no schema change needed.
- Phase 6 retirement targets ~1,942 lines of legacy code. Cerebras grep audit (Step 5.1) catches external imports before deletion.
- **Bean updated model recommendation to opus for inline** (overriding the auto-Gate 3.5 sonnet recommendation). The orchestration work involves multi-model coordination + adversarial QC + architectural decisions across the full Phase 7 — opus is the right call for the inline thread; subagents still use Sonnet/Haiku/Gemini per the plan's per-step delegation tables.

## Next Session Prompt

~~~
You are a senior cloning-pipeline architect specialising in deterministic HTML/CSS-to-WordPress-blocks conversion and the SGS Framework. Today's task is executing Phase 7 rollout — Spec 16 Phases 2-6 + final QC + handoff.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-spec-16-phase-7"

Read `.claude/handoff.md` and `CLAUDE.md` for full context, then work through these priorities.

## Skills to Invoke

| Skill | When |
|-------|------|
| `/brainstorming` | architectural decisions during Phase 3 orchestrator wiring |
| `/gap-analysis` | grade Phase 4 visual QA output |
| `/lifecycle` | sgs/heading + sgs/divider block creation |
| `/research` | only if blocked on Phase 3 wiring shape |
| `/strategic-plan` | already done — Phase 7 plan is source of truth |
| `/subagent-driven-development` | Steps 1.1, 1.2, 2.1, 2.3 |
| `/dispatching-parallel-agents` | Steps 1.1+1.2 parallel, Step 8 final QC |
| `/delegate` | model selection per step |
| `/visual-qa` | Step 3.3 — the closure gate |
| `/sgs-update` | Steps 1.3 and 4 — DB canonical pass |
| `/handoff` | last step |

## MCP & Tools

| Tool | Purpose |
|------|---------|
| `mcp__plugin_playwright_playwright__*` | Phase 4 visual QA browser capture |
| `mcp__plugin_github_github__*` | PR opening + merge for Phase 7 final |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | sgs/heading + sgs/divider creation via SDD |
| `design-reviewer` | Phase 4 visual QA backup |

---

## Task 1: Execute Phase 7 plan steps 1-8 in order
Read `.claude/plans/phase-7-spec-16-converter-rollout.md` end-to-end first. Every step has a delegation table specifying model + dispatch tool. Follow the plan exactly.

## Task 2: Phase 4 is the closure gate — respect the iteration cap
Phase 4 = deploy to sandybrown staging + /visual-qa at 3 viewports vs WP-rendered mockup baseline. If first pass diff > 1% → ONE Sonnet diagnostician → re-run. **DO NOT exceed 2 iterations.**

## Task 3: Run final QC panel + /handoff to close session
Step 8 — 4-reviewer multi-model panel. Apply fixes. Then /handoff.

## Guardrails
- Never delete `tools/recogniser-v2/extract.py` until Phase 4 visual QA passes (FR8 gate).
- Don't conflate Phase 7 closure with Spec 16 closure. Phase 7 = Mama's works. Spec 16 = architecture generalises.
- 2-iteration cap on Phase 4 is hard.
- Use existing `attribute_gap_candidates` table in Spec 15 §4.2; no schema change needed.
~~~
