---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-14-spec-16-phase-7
session_date: 2026-05-14
recommended_model: opus
last_verified: 2026-05-15
update_triggers:
  - "/handoff run"
companion_docs:
  - .claude/state.md
  - .claude/next-session-prompt.md
  - .claude/specs/16-DETERMINISTIC-CONVERTER-V2.md
  - .claude/plans/phase-7-spec-16-converter-rollout.md
---

# Session Handoff — 2026-05-14 (Spec 16 Phase 1 close + tooling cross-refs)

## Completed This Session

1. **Shipped Spec 16 Phase 1: deterministic slot-aware converter prototype.** `.claude/scratch/converter-prototype/{db_lookup,convert,convert_page}.py` totalling 1,136 lines. Emits 286 lines of WP block markup on the full Mama's homepage — 10 SGS block types + 3 core types, 12 sgs/containers (down from 114 pre-fix), 27 variation CSS rules.
2. **8 PRs + 6 follow-up commits merged to origin/main.** PRs #15–#22 cover matcher fix, composer retirement, trace wiring, residue cleanup, scaffold deletion, +REGISTER gate, sgs/label block, Spec 16 + Phase 7 plan. Follow-ups b16c1ae5 / 14ce0a5c / c4b29ae6 / efec1698 / 79d325b2 / adb16564 cover R5 Destination 0, handoff, model override, archive moves, registry purge, tooling cross-refs.
3. **New SGS atomic block `sgs/label`.** 3 style variants (plain / pill-fill / pill-wrap), 22 attrs, native supports.color + supports.spacing. PR #21.
4. **Spec 16 v0.2** at `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`. 5 architectural rules R1–R5, 9 FRs, 6 phases, plus new §9 Tooling integration (5 sub-tables cross-referencing skills/scripts/DB tables) and §10 Validation criteria.
5. **Phase 7 rollout plan** at `.claude/plans/phase-7-spec-16-converter-rollout.md`. 8 steps + top-level Tooling reference table covering skills, scripts, and DB R/W matrix across the whole phase. Per-step concrete script paths + DB queries baked in.
6. **Living-docs cleanup.** Removed `deprecated_docs:` from both registries (commit history is the audit trail). Moved closed/absorbed plans to `plans/archive/` (phase-5-clone-pipeline-e2e + phase-6-pattern-fidelity-v2). Refreshed CLAUDE.md / architecture.md / goals.md / plan.md / spec-15-master-execution-plan.md / cloning-pipeline-flow.md / state.md body / tooling-map.md / Spec 15 cross-ref.
7. **Two-tier QC ran on Spec 16: initial 4-reviewer panel + final 3-reviewer panel.** 9 fixes applied across both rounds. Sonnet final QC drove the R5 Destination 0 + Phase 7/Spec 16 closure split + state.md body refresh.

## Current State

- **Branch:** main at `adb16564`
- **Tests:** no test suite for prototype (CLI-run); orchestrator existing tests not run this session
- **Build:** n/a (no JS build needed; prototype is Python only)
- **Uncommitted changes:** `.claude/test/` (Bean's session fixtures, intentionally untracked) + 2 mamas-munches style variation files (carried from prior session)
- **Deployed:** No converter output deployed yet — Phase 7 Step 3 work
- **Pixel diff baseline:** still unverified end-to-end (Phase 7 Step 3 closes this)

## Known Issues / Blockers

- **R5 implementation is spec'd, not built.** Phase 1 prototype emits to variation CSS without the 4-destination routing logic yet. Phase 7 Step 2 (orchestrator wiring) is where the routing actually ships.
- **Phase 4 visual QA baseline is THE closure gate.** Until staging deploy + `/visual-qa` runs at 3 viewports against the WP-rendered mockup-as-post baseline, we can't claim "visually correct".
- **Hard-coded special cases** (variantStyle enum, packSizes array extractor, CTA primary/secondary split). Move to live DB read via block_attributes.enum_values in Phase 3 per parking P-S16-3.

## Next Priorities (in order)

1. **Execute Phase 7 plan end-to-end** — `.claude/plans/phase-7-spec-16-converter-rollout.md`. 8 steps, ~2.5–3 hours wall time. Per-step delegation tables route Sonnet/Haiku/Gemini Flash/Gemini Pro/Cerebras.
2. **Phase 4 (Step 3) is the load-bearing gate** — deploy + /visual-qa with hard 2-iteration cap. If first pass fails diff > 1%, ONE Sonnet diagnostician then surface to Bean.
3. **After Phase 7 closes** (Mama's at ≤1% diff), run on Indus Foods or helping-doctors as Spec 16 §9 item 7 second-client validation. Phase 7 closed ≠ Spec 16 closed.

## Files Modified

| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/src/blocks/label/*` | NEW — sgs/label atomic block (PR #21) |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Composer retirement + trace wiring + matcher fix (PRs #15–#20) |
| `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` | Pattern + scaffold tier matching (PR #15) |
| `plugins/sgs-blocks/scripts/orchestrator/trace.py` | NEW — Q3 trace logging infra (PR #15) |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | NEW — Spec 16 v0.2 + §9 Tooling integration (PR #22 + follow-ups) |
| `.claude/plans/phase-7-spec-16-converter-rollout.md` | NEW — next-session plan + tooling cross-refs |
| `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | Status header → Spec 16 absorption |
| `.claude/state.md` | Phase + body refreshed for Spec 16 Phase 1 close |
| `.claude/decisions.md` | +8 Spec 16 decisions |
| `.claude/parking.md` | +6 parked items (P-S16-1 through P-S16-6) |
| `.claude/tooling-map.md` | Converter prototype + sgs/label + scheduled retirements |
| `.claude/docs-registry.yaml` + `.claude/docs-registry.md` | Deprecated_docs purged; Spec 16 + Phase 7 added as canonical |
| `.claude/plans/archive/phase-5-clone-pipeline-e2e.md` + `archive/phase-6-pattern-fidelity-v2.md` | MOVED from plans/ (closed/absorbed) |
| `.claude/CLAUDE.md` + `architecture.md` + `goals.md` + `plan.md` + `plans/spec-15-master-execution-plan.md` + `cloning-pipeline-flow.md` | Refreshed for Spec 16 absorption |
| `.claude/scratch/converter-prototype/` | Prototype Python modules (gitignored) |

## Notes for Next Session

- The Phase 7 plan's Tooling Reference section + per-step skills/scripts/DB-tables annotations are the load-bearing operational artefacts. Read them before dispatching anything.
- Bean updated model recommendation to **opus** for inline (overriding the auto-Gate 3.5 sonnet rec). Phase 7 inline orchestration involves multi-model dispatch + adversarial QC + architectural decisions — opus is the right inline driver. Subagents per step still route per /delegate (Sonnet/Haiku/Gemini Flash/Cerebras).
- The 2-iteration cap on Phase 4 is non-negotiable. After 2 tries with a Sonnet diagnostician, surface to Bean with diff thumbnails.
- `attribute_gap_candidates` table already exists in Spec 15 §4.2 — Phase 3 just writes to it; no schema change needed.
- Phase 6 retirement targets ~1,942 lines of legacy code. Cerebras grep audit (Step 5.1) catches external imports before deletion.
- All living docs in scope of docs-registry.yaml `canonical_docs` were refreshed this session except `mistakes.md`, `skills-commands-map.md`, `db-tables-map.md` (no Spec 16 impact). The 3 hook entries in the registry are future-built and remain unchanged.

## Next Session Prompt

~~~
You are a senior cloning-pipeline architect specialising in deterministic HTML/CSS-to-WordPress-blocks conversion and the SGS Framework. Today's task is executing Phase 7 rollout — Spec 16 Phases 2-6 + final QC + handoff.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-14-spec-16-phase-7"

Read `.claude/handoff.md`, `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` (esp. §9 tooling), and `.claude/plans/phase-7-spec-16-converter-rollout.md` (esp. the top Tooling reference table) for full context, then work through these priorities.

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
| `/delegate` | per-step model selection (per plan tables) |
| `/visual-qa` | Step 3.3 — the closure gate |
| `/sgs-update` | Steps 1.3 and 4 — DB canonical pass |
| `/sgs-db` | pre-flight + spot-checks |
| `/wp-blocks` | Step 1.x block-schema cross-check |
| `/cerebras` | Step 5.1 grep audit |
| `/gemini-flash` | Step 5.4 mechanical doc updates |
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

## Task 1: Execute Phase 7 plan steps 1–8 in order
Read `.claude/plans/phase-7-spec-16-converter-rollout.md` end-to-end first. Every step has per-step delegation + scripts + DB tables baked in. Follow the plan exactly — it passed Sonnet + Haiku + Gemini Flash QC.

## Task 2: Phase 4 is the closure gate — respect the iteration cap
Phase 4 (Step 3) = deploy to sandybrown staging + /visual-qa at 3 viewports vs WP-rendered mockup baseline. If first pass diff > 1% → ONE Sonnet diagnostician → re-run. **DO NOT exceed 2 iterations.**

## Task 3: Run final QC panel + /handoff to close session
Step 8: 4-reviewer multi-model panel (Sonnet architecture + Haiku mechanical + Gemini Pro deep + Gemini Flash fresh-eyes). Apply fixes. Then /handoff.

## Guardrails
- Never delete `tools/recogniser-v2/extract.py` until Phase 4 visual QA passes (FR8 gate). Step 5.1 grep audit is the pre-deletion check.
- Don't conflate Phase 7 closure with Spec 16 closure. Phase 7 = Mama's works. Spec 16 = architecture generalises across clients.
- 2-iteration cap on Phase 4 is hard.
- Use existing `attribute_gap_candidates` table in Spec 15 §4.2; no schema change needed.
~~~
