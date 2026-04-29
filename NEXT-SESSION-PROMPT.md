recommended_model: sonnet
session_tag: small-giants-wp-2026-04-29-phase1c-verify-loop

You are a senior systems architect. Execute Phase 1c — the final 3 steps of Phase 1 Foundations: build `/verify-loop` (Step 14a), run the end-to-end demo (Step 14b), POST G1 milestone + handoff (Step 15).

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-29-phase1c-verify-loop"`

## Where You Are

Plan: `.claude/plans/phase-1-foundations.md`
Current phase: Phase 1c (Step 14 + Step 15 of 15)
Progress: 13/15 steps complete (Phase 1a + 1b done)
Last commit (Phase 1b): `f9ce068` in `~/.agents` — wires optimisation toolkit into 8 lifecycle skills
Next task: Step 14a — `/lifecycle` merge mode → build `/verify-loop` from `/test-driven-development` + `/verification-before-completion`

## What's Already Done

**Phase 1a (commit c01b64f in ~/.agents):** 4 utilities at `~/.agents/skills/shared-references/optimisation_toolkit/` — canary_split, dspy_signature, certainty_calc, few_shot_injector. All 4 smoke tests pass (~3.8s total).

**Phase 1b (commit f9ce068 in ~/.agents):** 8 lifecycle skills updated:
- skill-writer / pipeline-writer / command-writer: rubric-gen sub-stage + Bean sign-off HARD GATE + skip-if-confirmed + literal approval-keyword detection
- skill-optimiser / pipeline-optimiser: rubric-aware Stage 1 (read-or-generate) + Lens 6 input
- gap-analysis: Lens 6 ALWAYS runs + 4-step fallback chain (confirmed → pending → draft-unconfirmed → 5-lens-only/grade-cap-C) + edge cases (silent-Bean timeout, malformed rubric)
- qc / qc-inline: certainty_calc wired into Stage 3, ImportError → UNAVAILABLE, <50 → HOLD, schema parity (5-key dicts), `certainty_verdict` key for hand-off contract

**Cross-tier QC reports archived:** `.claude/reports/phase-1-cross-tier-qc/20260429-084939/` — 9 reports (8 skills + 1 re-QC). Drift findings triaged + patched.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/autopilot` | FIRST — always before any response |
| `/lifecycle` | Step 14a — invoke in **merge mode** to combine /test-driven-development + /verification-before-completion → /verify-loop |
| `/skill-optimiser` | Step 14b — run on `/verify-loop` (the new skill is the optimiser's target — exercises all 4 utilities + Lens 6 + certainty_calc) |
| `/qc` + `/qc-inline` | Step 14b — fired during `/skill-optimiser`'s evidence pass, exercises certainty_calc Stage 3 |
| `/verify-loop` | Step 14b self-demo — invoke on `phase-1-foundations.md` to verify it works as a tool |
| `/handoff` | Step 15 — generate next-session-prompt for Phase 2 |
| `/strategic-plan` | Read `.claude/plans/master-plan.md` §13 for Phase 2 handoff hint |

## Tools

| Tool | What for |
|------|----------|
| `python ~/.agents/skills/shared-references/optimisation_toolkit/tests/smoke_*.py` | Re-run any utility smoke test |
| `sqlite3 ~/.openclaw/workspace/data/blub.db` | few_shot_injector reads embeddings (Step 14b live exercise) |
| `curl` | Step 15 G1 POST to `/api/knowledge` |
| Sonnet via `/delegate` | If any sub-step diverges from inline-Opus reasoning |
| Gemini Flash | Cross-tier QC peer review of /verify-loop after build (Decision 2 fallback if Cerebras stuck) — **note: today's session hit Gemini 503s repeatedly; if same, fall back to Cerebras at `python C:/Users/Bean/.claude/agents/cerebras-agent/agent.py --prompt "..." --cwd "..."`** |

## Step 14a — Build `/verify-loop` (merge mode)

Per plan §Step 14a, use `/lifecycle` in merge mode. Source skills:
- `~/.claude/skills/test-driven-development/SKILL.md`
- `~/.claude/skills/verification-before-completion/SKILL.md`

Output skill: `~/.claude/skills/verify-loop/SKILL.md` + `~/.claude/commands/verify-loop.md`

Spec for the merged skill (verbatim from plan):
- STAGE 0 — Read context (active plan + current TodoWrite)
- STAGE 1 — Classify verification per step (shell | visual Playwright | unit | API | file assertion)
- STAGE 2 — Inject tests dual-surface (Verification Plan table appended to plan + `[TEST: <name>]` todos queued)
- STAGE 3 — Per-step gate (auto-fix once on fail; HARD STOP + `[BLOCKED]` todo if still fail)

The skill-writer's new rubric-gen Stage fires first — Bean sign-off needed on the rubric before /verify-loop SKILL.md body is drafted. Old skills marked for archival, NOT deleted (per plan §12.5).

## Step 14b — End-to-end demo

Run `/skill-optimiser` on `/verify-loop`. This exercises:
- Stage 1 reads the rubric written in 14a
- canary_split.py holds out 20% of /verify-loop's fixture set
- few_shot_injector queries blub.db corrections for testing-pattern examples
- ≥1 optimisation candidate is scored
- gate fires (delta >= 0.05 OR "no change" with rationale — both PASS)
- /qc fires at evidence pass; certainty_calc runs at Stage 3
- Report archived to `.claude/reports/phase-1-end-to-end/<run_id>/`

Then immediately invoke `/verify-loop` on `phase-1-foundations.md` (this plan). Should produce a Verification Plan table for each phase step + `[TEST]` todos.

**verdict.md** must read PASS (utility-aware loop functioning) OR FAIL (where the loop broke). delta < 0.05 with the gate correctly refusing the candidate is also a PASS per Decision F.

## Step 15 — G1 milestone POST + handoff

POST to `/api/knowledge` per master plan §11.5:

```bash
curl -sf -X POST http://localhost:5050/api/knowledge \
  -H "Cookie: blub_auth=$BLUB_AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "pipeline-run",
    "tags": ["phase-1-foundations", "P1.1b", "G1-PASS"],
    "title": "Phase 1 exit: foundations",
    "content": "4 utilities + 8 lifecycle skills + cross-tier QC clean + /verify-loop shipped + end-to-end demo PASS",
    "metadata": {"run_id": "<run_id>", "phase": "1", "project_id": 14}
  }'
```

`BLUB_AUTH` env var must be set; never commit the literal cookie (gitleaks blocks).

Update `.claude/state.md` frontmatter: `current_phase: phase-2-rubrics-universe`. Run `/handoff` to write `next-session-prompt.md` pointing at master plan §13 Phase 2 handoff block.

## Guardrails

- WordPress non-negotiables: WCAG 2.2 AA, UK English, no jQuery, <100KB CSS / <50KB JS (no WP work expected in 1c, but rule stays)
- `git branch --show-current` before every commit (framework → main; client → feature branch)
- Master plan §12.5 deletion-before-reference rule: archive old testing skills, do NOT delete yet
- Smoke tests cannot make network calls (spec §4.4)
- Cross-tier QC = different model family than the editor (today: Gemini Flash unstable, Cerebras Qwen 3 235B is the working alternate)
- Decision F: gate firing at delta < 0.05 = utility working correctly = PASS

## Known issues from today's session

1. **Gemini Flash 503s** were heavy. Use Cerebras as fallback (Decision 2 of plan).
2. **gemini-analyser agent** was unavailable; direct CLI worked once retried.
3. **`~/.claude/skills/` is a symlink to `~/.agents/skills/`** — commits land in `~/.agents` (master branch, no remote).
4. **The `.claude/reports/phase-1-cross-tier-qc/20260429-084939/` directory** has 9 reports including 1 re-QC. Step 13 gate passed by Bean despite drift-minor verdicts on 5 reports — all were either false positives (prompt-mismatch / pre-existing content in diff) or real issues that were patched.
5. **command-writer / qc / qc-inline** were untracked files in `~/.agents` before today; committed via `f9ce068`.
