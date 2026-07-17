---
doc_type: reference
project: small-giants-wp
title: P5 §4b session — skills refresh pivot + lean-ruler rebalance
date: 2026-07-17
---

# P5 §4b — generic-skills refresh: the lean-ruler pivot

## What happened (plain English)
The session set out to compare Bean's process/generic skill forks against the current
`obra/superpowers` community versions (adopt / graft / keep, Bean picks per skill). Mid-session
Bean challenged the whole premise: *"the bespoke bits only exist because I was told they'd
help — are we sure we should keep them when the authoritative community version omits them?
Maybe my scorer is biased toward complexity/box-ticking."* Research confirmed his instinct.
Direction changed to **fix the ruler + aggressively lean out (community as base)**.

## Research verdict (evidence, not opinion)
Lean + failure-matched beats structure-for-its-own-sake; a rubric that scores STRUCTURE gets
gamed (Goodhart). Convergent evidence:
- **Anthropic context-engineering + Claude prompting docs:** "minimal set that fully outlines
  expected behaviour", finite attention budget / context rot, add rules only after OBSERVED
  failures, "formatting matters less as models improve". Numbered steps/gates are situational
  (order/audit), not a default scaffold.
- **obra/superpowers = 256,409 stars / 22,830 forks** (Jesse Vincent), pushed daily — the
  de-facto community standard, deliberately LEAN. Its own `writing-skills` guide found
  prohibition-style guidance **trended worse than no guidance**.
- **Goodhart / reward-hacking-in-rubrics** literature + an INDEPENDENT third-party `skillscore`
  tool reaching the same conclusion ("padding a skill to 2000 tokens doesn't improve output,
  just costs more").
- **Bean's own lesson** `validate-grading-tool-against-gold-standard` — same failure, one level up.
- Honest caveat (Lesson B): two arXiv IDs the Goodhart agent cited (2605.x, 2607.x) were
  NOT verified; the Anthropic docs + Lost-in-the-Middle (2307.03172) + Self-Refine (2303.17651)
  + CoT-can-hurt (2410.21333) are the solid citations.

## skillscore SKILL-path validation (carry-over #2 — ANSWERED)
Gold-standard test BEFORE the fix: community brainstorming **48% (F)** vs Bean's own skills
**92–94%**. Unlike the agent path (which had a real cross-type BUG in §4), the SKILL path had
**no bug** — it scored Bean's skills correctly; the 48% was the ruler being Bean-convention-
calibrated. So: never use skillscore to judge community skills for adoption (Lesson A holds for
the skill path); it's trustworthy for grading Bean's own skills.

## The ruler fix (DONE + validated, live)
File: `~/.agents/skills/shared-references/sgs-skillscore.py` (⚠ UNVERSIONED — `~/.agents` is not
a git repo; recovery = `sgs-skillscore.py.bak-2026-07-17-preLeanRuler`).
- New **FLOOR tier weighted 0%**: checks run + report a real *absence* but no longer SCORE.
- REGISTRY tier made authoritative (`run_checks_for_type` sets `result.tier = check.tier`).
- **14 theatre checks → FLOOR:** goal_section, common_mistakes, correction_ledger, references_dir,
  hard_gate, numbered_stages, self_orchestration, system_effect (6-Lens), hooks_dir, scripts_dir,
  shared_references, skill_type, process_summary, **imperative_voice**.
- **Kept scored (real signal):** all FATAL (name/desc/third-person/negative-routing/when-not-to-use/
  no-hardcoded-paths/no-platforms/body-line-limit); QUALITY → specific_alternatives + intra_skill_refs;
  ARCH → body_concise + reference_db_provenance; all HYGIENE.
- **skill threshold 90 → 75** (leaner ruler → honest scores sit lower; score is a SIGNAL not a gate).
  agent stays 85 (untouched). pipeline/command ALSO leaned — flagged to drop their thresholds when next graded.
- Validation: community brainstorming 48→69% (still fails REAL portable gaps); Bean brainstorming 100,
  systematic-debugging 90, autopilot 88, gap-analysis 85 (all pass 75); agent path wp-sgs-dev 100 /
  seo-auditor 100 / design-reviewer 93→92 (imperative_voice is `*`, 1pt, still A-/pass).

## Fork roster diff (evidence-based, per skill) — decisions for next session
KEEP (ours is a genuine superset / identical):
- **brainstorming** — ours superset (exploration mode + insight graph + premise-verification); their
  isolation/existing-codebase guidance ALREADY in our `references/design-process.md`.
- **systematic-debugging** — ours verbatim-superset + prove-cause iron-law extension.
- **requesting-code-review** — ours superset (test-evidence gate + qc-council off-ramp).
- **executing-plans** — ours richer (batch-checkpoint loop); optional 1-line "prefer subagent-driven" steer.
- **test-driven-development** — byte-identical to community; nothing to graft. (Aside: our `~/.agents`
  symlink target is broken — plumbing, repoint to openclaw shared-skills.)
- **receiving-code-review** — identical bar one line (our "Circle K" passphrase vs their clearer
  "name the tension" wording — optional micro-graft).
GRAFT (community has REAL bug-fixes/mechanism ours lacks — do these FIRST next session):
- **finishing-a-development-branch** — adopt their env-detection + detached-HEAD menu + provenance/
  ordering/prune fixes (4 real bugs: worktree destroyed on PR path, branch-deleted-before-worktree-
  removed, remove-from-inside-worktree, harness-owned-worktree removal); graft OUR `gh pr create` body back.
- **using-git-worktrees** — graft their Step-0 nested-worktree/submodule guard + native-tool
  (`EnterWorktree`) preference + sandbox fallback (ours can create a phantom nested worktree).
- **subagent-driven-development** — graft Pre-Flight review, Implementer-Status protocol, Reviewer-⚠️
  items, Constructing-Reviewer-Prompts (BASE-not-HEAD~1, no pasted history), File-Handoffs
  (+task-brief/review-package scripts), Durable-Progress ledger; keep OUR /delegate+log-dispatch + SGS-BEM injection.
  (Also: our referenced ./implementer-prompt.md etc. are BROKEN refs — fix or create.)
- **dispatching-parallel-agents** — graft their "multiple dispatch calls in one response = parallel"
  rule + "subagents never inherit session context" isolation line; rest of ours is superset.
- **writing-skills → skill-writer** — graft (1) "Match the Form to the Failure" table + no-nuance/
  no-exemption rules, (2) "Micro-Test Wording" with mandatory no-guidance control + variance-as-metric,
  (3) letter-vs-spirit + close-every-loophole bulletproofing. Keep OUR discovery-gate + dual quality gates.

## Next session (P5 §4b continuation)
1. Validated bug-fix grafts FIRST: finishing-a-development-branch, using-git-worktrees,
   subagent-driven-development (each = global mini-sign-off, additive/gated, ~/.claude is a git repo so
   commit-first path-scoped; ~/.agents is NOT — back up before any edit there).
2. Then community-as-base adoptions + fork deletions where community ≥ ours (there are none pure-adopt
   so far — ours is superset or graft everywhere; TDD is identical so no action).
3. Then coverage-gap (step B): survey full community roster + 1-2 other collections vs Bean's actual
   work (WP, Next.js, SEO, research, doc-ops); recommend the FEW highest-value missing skills (agent
   session added exactly 2 — respect the consolidation philosophy).
4. Re-grade grafted skills on the FIXED ruler (bar 75); never edit a skill just to raise its score.
