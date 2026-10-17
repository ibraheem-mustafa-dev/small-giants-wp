---
name: reasoning-skill-judge
description: Reasoning-based rubric a subagent applies by READING a Claude skill or agent and thinking — not by scanning for section headings. Primary quality signal; replaces gap-analysis-for-a-score and skillscore-as-quality. Built 2026-07-17 from Anthropic + obra + evals-authority evidence.
metadata:
  type: reference
---

# Reasoning Skill / Agent Judge

## Why this exists (the failure it prevents)
Structural scanners (`sgs-skillscore.py`) reward box-presence; hole-finders (`gap-analysis`) only ever say "add more" — both bias toward **bloat + box-ticking**, and neither measures whether the skill actually works. Expert practice is the opposite and is evidence-backed:
- **Anthropic** — *"Create evaluations BEFORE writing extensive documentation"*; their skill-creator judges by executor → grader → **blind A/B comparator** (skill vs no-skill), scored on the TEST set. Structural checklist items are token-economy/discoverability hygiene, explicitly NOT quality proxies.
- **obra / Jesse Vincent (superpowers)** — *"NO SKILL WITHOUT A FAILING TEST FIRST."*
- **Hamel Husain (evals)** — error-analysis on real traces → failure taxonomy → iterate. This judge is the reasoning tier: an LLM reads the whole artefact as a cold agent would and reasons about whether it works — length and structure are banned from helping.

## Where this sits (three tiers — use in order)
1. **FLOOR — `sgs-skillscore.py --json`** (cheap, first): catches a genuinely MISSING load-bearing thing (no name/description, hardcoded paths, CRLF, >500 lines). A floor gate, never a quality score. Its FLOOR-tier (0%) checks are informational only.
2. **JUDGE — this rubric** (primary quality signal): a reasoning subagent. Use for every grade that used to go to gap-analysis-for-a-score or skillscore's quality %.
3. **GOLD — evals** (for skills that matter): write 3 real-task scenarios, run the agent WITH vs WITHOUT the skill, measure the outcome delta. "Turns a skill that *seems* to work into one you *know* works." Heavier; reserve for load-bearing skills.

## How to invoke
Dispatch a subagent — **a different model from the one that AUTHORED the artefact** where possible (self-preference bias) — with: this whole rubric + the FULL target file(s) (SKILL.md
+ its `references/` for a skill; the `.md` for an agent). Optionally run the FLOOR gate first and paste its absence-findings as context. The judge returns the structured output below.

## Judge preamble (give the subagent verbatim)
> You are judging a Claude {skill|agent} for whether it actually WORKS, as a COLD agent with zero memory of any prior conversation would experience it. Do NOT grep for section headings, word counts, or template compliance — read the whole thing and reason. For each criterion: write your REASONING FIRST, quote the specific passage that supports your judgement, THEN give a score 1 (fails badly) – 5 (excellent). You may NOT award 4 or 5 without quoting supporting text; if support is absent, cite the absence and score low. **Length and structure never count in the artefact's favour** — a shorter file that fully specifies the behaviour scores HIGHER than a longer one that pads around it. Verbosity is not quality.

## Criteria — SKILLS (score 1–5, reasoning + quoted evidence first)
1. **Cold-agent executability** — could a zero-context agent execute the task first try without guessing, inventing a convention, or stalling? Name every step where it would have to guess.
2. **Minimal-sufficiency** *(the thinning lever)* — does every paragraph earn its tokens, or restate what Claude already knows? Flag anything deletable with zero loss of correctness.
3. **Failure-mode coverage** — what specific failure was this written to prevent? Does it block *that* failure with a real verification/gate step, not "be careful" / "try harder"?
4. **Degrees-of-freedom match** — is specificity matched to task fragility (not a rigid script on a judgement task; not loose prose on a fragile one)? Classify a key step, then judge the fit.
5. **Trigger/routing correctness** — reading the description ALONE (as the router sees it among 100+): give 2 scenarios it SHOULD fire on and 2 near-misses it should NOT. Does the text discriminate all 4?
6. **Unambiguous terminology** — one name per concept; every tool/file/term reference resolvable by a cold agent?
7. **Testability grounding** — evidence it was built against real failures (a before/after gap, a stated eval scenario, an example of wrong output)? Could you derive 3 test scenarios from the file itself?

## Criteria — AGENTS (a loadout, not a process — score 1–5)
A1. **Routing/description correctness** — same as skill #5: fires on its remit, not neighbours'. A2. **Tool-set justification** — every tool in frontmatter earns its place; no unused bloat, no missing tool the body needs. A3. **Methodology-delegated** — the agent is a thin loadout that points to skills for process, NOT a dumped multi-stage methodology (that belongs in a skill). A4. **No invented capabilities** — every referenced skill/agent/command/path actually exists. A5. **Role clarity + boundaries** — would a cold agent know exactly its remit AND what to refuse / hand off (the "Do NOT invoke for" set)? A6. **Minimal-sufficiency** — as skill #2.

## Meta-criterion (answer separately, NOT scored — bias self-check)
Before finalising: did file length / heading presence / structure influence any score independent of necessity (**verbosity + authority bias**)? In a comparative run, did reading order bias it (**position bias**)? Did prose resembling your own style inflate it (**self-preference bias**)? State yes/no for each; re-score any criterion where the answer is yes.

## Output format (return this)
```
FLOOR (from skillscore, if run): {any genuinely-missing load-bearing item}
PER-CRITERION: [ {criterion, reasoning, evidence_quote, score} ... ]
CUT LIST: passages that add tokens without adding correctness  ← the anti-bloat output;
          gap-analysis never produces this, which is why it ratchets skills fatter
OVERALL: mean score + one-line rationale
VERDICT: ship (≥4 avg, no criterion <3) | revise (name the ≤3 fixes) | rebuild (core fails)
TOP-3 CHANGES: highest-leverage edits, CUTS allowed and encouraged
BIAS SELF-CHECK: {verbosity, position, self-preference} yes/no + any re-scores
```

## Composition rules
- Run FLOOR (`sgs-skillscore --json`) first; treat only its non-FLOOR-tier fails as real gates.
- Use THIS judge for the quality call — not skillscore's %, not a gap-analysis hole-count.
- `gap-analysis` may still surface genuine gaps, but ONLY paired with this judge's CUT LIST so it can also remove — never as a bloat-only grade.
- Bias guards are load-bearing: reason-before-number, distinct judge model, verbosity penalised, structure banned from scoring. Drop them and the judge drifts back into rewarding bloat.
