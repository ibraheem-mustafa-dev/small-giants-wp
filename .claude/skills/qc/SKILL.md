---
name: qc
type: pipeline
user-invocable: true
argument-hint: "<target> [--type website|skill|feature|block|pipeline] [--goal '<text>'] [--base <commit>] [--skip-code-review]"
description: >-
  This skill should be used when quality-checking any artifact end-to-end —
  website, skill, feature, Gutenberg block, or pipeline output. PRIMARY
  MANDATE: real end-to-end testing as a user or developer would do it. When
  the target carries fresh code, one cheap code review of the diff runs first,
  so obvious faults are caught before any browser time is spent. Runs 7
  stages: detect target type → pre-gates and fresh-code review → extract stated goal →
  generate realistic test scenarios (golden path + edge cases + failure modes
  + accessibility) → execute each scenario against the real system with
  captured evidence → compare actual vs expected output → optional code review
  if tests pass but something still smells off → unified QC report. Triggers
  on "QC this", "test this", "does this work", "verify this", "run QC",
  "quality check", "smoke test", "end-to-end test", "/qc".
  Do NOT invoke for: visual design comparison only (use /visual-qa), SEO audit
  only (use /seo), PR diff review (use /pr-reviewer), a11y audit only (use
  /a11y-audit), performance only (use performance-auditor).
---

# QC Pipeline

Real end-to-end testing of any artifact before it ships.

## Mandatory References

Before starting a QC run, load:
1. `references/scenario-templates.md` — reusable scenario starters per target type (website / skill / feature / block)
2. `references/smell-signals.md` — catalogue of output patterns that trigger Stage 5 code review
3. `shared-references/communication-standards.md` — plain English rules for all output Bean reads
4. `shared-references/verification-rationalisations.md` — iron law + red-flag list + rationalisation tables (used at every completion-claim boundary; never accept "done / fixed / passes" without command + exit code in the same message)

## Goal

Evidence-backed pass/fail verdict per test scenario, with captured output (screenshots, stdout, JSON diffs), a confidence score, and a prioritised next-actions list. A cheap review of fresh code runs before testing (Stage 0.5b); a deeper review panel fires only if tests pass but something still feels wrong (Stage 5).

**Type:** Pipeline

**Stages:** DETECT → PRE-GATES + FRESH-CODE REVIEW → GOAL-EXTRACT → SCENARIO-GEN → EXECUTE → COMPARE → CODE-REVIEW (backup) → REPORT

**Primary mandate:** Test like a user. Reading a diff takes minutes and needs no live site, so a fresh-code review runs first to catch typos, broken logic and rule breaks cheaply; but only the real test proves the change works, so the review never replaces it.

---

## When to Use

- Before shipping any feature, block, skill, or pipeline output
- When "it works on my machine" needs independent evidence
- When a handoff says "tested" but no test artefacts exist
- When acceptance criteria exist and need systematic verification
- When a site or skill has been changed and regression risk is real

**When NOT to use:**
- Visual design comparison only — use `/visual-qa`
- SEO audit only — use `/seo`
- PR diff code review — use `/pr-reviewer`
- Accessibility audit only — use `/a11y-audit`
- Performance profiling only — use `performance-auditor` agent
- Validating two or more fix-shape proposals before subagent dispatch — use `/qc-council` (empirical-validation gate; council-style debate; experiment-shaped handoff to `/spec-writer` + `/phase-planner`). If Stage 5 of `/qc` produces a gap register containing two or more fix-shape proposals, hand off to `/qc-council` before any implementer dispatch.

---

## Stages

### Stage 0 — Detect

**Input:** Raw target argument (URL, file path, skill name, feature description) plus any `--type` override flag.

**Process:** Identify target type from the argument and any `--type` flag. Probe the target: if URL, check HTTP status and content-type; if skill, find SKILL.md in both registries; if feature, locate the implementing files and relevant tests. Produce a target-profile that names the type, location, tech stack, and reachability status (live / local / file-only). If target is unreachable, abort with a clear message — do not run scenarios against a phantom target.

**Output:** `stage-0-detect.json` — `{type, location, reachable, tech_stack, run_id}`

**Failure:** abort — unreachable target cannot be tested.

**Duration:** 1–3 min

---

### Stage 0.5 — Structural pre-gates

**Input:** `stage-0-detect.json` — target type and location.

**Process:** Run cheap, same-input-same-output checks against the target before any test scenario is generated. These checks cost nothing compared to scenario dispatch and catch the class of failure where tests run against a structurally broken target. Structural checks run first, rater tokens second.

Per target type:

- **Skill:** SKILL.md exists, YAML frontmatter parses without error, every file named in a `hooks:` frontmatter key resolves to a real file path, every file listed under `references:` in the body resolves
- **Website:** target URL returns 2xx, `robots.txt` path is readable, sitemap URL is reachable (if declared in robots.txt or meta)
- **Feature:** every file path cited in the spec or plan exists on disk, every function name cited in the plan can be found by grep in the named file
- **Block:** `block.json` parses as valid JSON, `render.php` (if named in block.json `render`) exists at the declared path
- **Pipeline:** stage definitions parse without error, every named hook file in the stage definitions exists on disk

Any target that fails a structural check is tagged `structural_fail` and excluded from Stage 1 onwards. Surface the specific check that failed so the operator can fix it.

**HARD GATE:** if every structural check fails, abort the QC run with a clear message naming the failing checks. Do not generate scenarios against a structurally broken target.

**Stage 0.5b — Fresh-code review (when the target carries new code).** Runs after the structural checks, before any scenario is generated or browser opened. It fires when the target has a diff: `--base <commit>` given, or the target's paths changed since the last commit Bean named as reviewed. `--skip-code-review` turns it off.

1. Write the diff to one file: `git log --oneline BASE..HEAD`, `git diff --stat BASE..HEAD` and `git diff -U10 BASE..HEAD -- <target paths>`.
2. Route ONE reviewer with `/delegate`: `--task-shape code_review --input-size-kb <diff size>` (Sonnet at medium effort; add `--high-complexity` when the diff touches security, payments or data migration, which routes to Opus). One reviewer, not a panel.
3. Brief it with the three `/delegate` brief lines, the diff file path, the goal, and the project rules the diff must honour (for SGS: no inline `style=`, `sgs-` BEM, nonce and capability checks on REST, UK English). Ask for findings only, as `path:line — severity — one-line issue`, at most 15, severity Critical / Important / Minor.
4. **Critical findings stop the run before Stage 3:** report them and recommend "fix then re-run QC". Browser testing code with a known critical fault wastes the most expensive stage. Important and Minor findings continue: Stage 2 adds a scenario aimed at each Important finding, and the report lists them.

**Output:** `stage-0.5-pre-gates.json` — `{target_type, checks_run: [{check, result: pass|fail, detail}], structural_fail: bool, code_review: {ran: bool, reviewer_model, findings: [{location, severity, issue}], critical_count}}`

**Failure:** abort (hard gate) — all checks fail → surface failures and stop. `code_review.critical_count > 0` → stop before Stage 3 with the findings as the report's next actions.

**Duration:** 1–2 min; 4–8 min with the fresh-code review

---

### Stage 1 — Goal-Extract

**Input:** `stage-0-detect.json` — target type and location.

**Process:** Pull the stated goal and acceptance criteria from target documentation. Sources by type: website → CLAUDE.md, README, or meta description; skill → SKILL.md `description` and `## Goal` section; feature → plan file, GitHub issue, or inline spec comment; block → `block.json` `description` + handoff notes; pipeline → pipeline JSON `description` + stage definitions. If no explicit goal is found in any source, stop and ask the user for it. Do NOT invent a goal or infer from implementation — testing against a fabricated goal produces worthless results.

**HARD GATE:** If no documented goal is found after searching all sources → ask user before proceeding.

**Output:** `stage-1-goal.json` — `{goal_statement, acceptance_criteria[], sources_consulted[], goal_confidence: high|medium|low}`

**Failure:** abort (hard gate) — missing goal → ask user.

**Duration:** 2–5 min

---

### Stage 1A — Ground-truth artefact pre-load

**Input:** `stage-1-goal.json` + target type.

**Process:** Load the domain-specific artefacts that already classify the problem before scenarios are generated. Contradictions between these artefacts and the stated goal become forcing questions embedded in every test scenario.

**Per target type:**

- **SGS pipeline targets:** load `pipeline-state/<latest>/leftover-buckets.json` (gap classification by section, slot, and reason), `pipeline-state/<latest>/extract.json` (per-section emitted block markup and extracted attributes), `pipeline-state/<latest>/trace.jsonl` (per-stage event log)
- **Skill or agent targets:** load the most recent skillscore output and any prior gap-analysis reports for this skill
- **Website targets:** capture HTTP response headers, fetch `robots.txt`, fetch declared sitemap URL
- **Plan or spec targets:** check `LEDGER.md` and the plan/spec itself for the currently-stated decision, and grep the project's auto-memory `MEMORY.md` index + `feedback_*.md` files for entries matching the plan's domain keywords

**All targets — behaviour corrections:** fetch domain-matching behaviour corrections from the local stores:

```bash
grep -i "<target domain keywords>" ~/.claude/gap-analysis/corrections.json
grep -rl "<target domain keywords>" ~/.claude/projects/*/memory/feedback_*.md
```

Read the matches and surface any correction that directly contradicts the stated goal or acceptance criteria.

**Contradiction surfacing:** if any loaded artefact contradicts the stated goal (e.g. leftover-buckets classifies a gap as `extraction_failed` but the goal assumes the extractor is working; a past correction warns that X approach silently no-ops), embed that contradiction as an explicit forcing question in the scenario set generated at Stage 2.

**HARD GATE:** if the target type expects artefacts (e.g. an SGS pipeline target with no `pipeline-state/<latest>/` directory, or a skill target where no prior skillscore exists) and none can be found, surface the gap to the operator before proceeding. Do not silently continue.

**Output:** `stage-1a-ground-truth.json` — `{artefacts_loaded: [{type, path, summary}], corrections_matched: [{pattern_key, summary}], contradictions: [{artefact, goal_claim, conflict_description}]}`

**Duration:** 2–4 min

---

### Stage 2 — Scenario-Generate

**Input:** `stage-1-goal.json` — goal statement and acceptance criteria.

**Process:** Generate a written test plan as a list of scenarios. Add one scenario aimed at each Important finding from the Stage 0.5b fresh-code review, so the test confirms or clears it. Every plan MUST include: one golden path (the primary use case working end-to-end), at least two edge cases (boundary inputs, empty states, optional fields absent), at least two failure modes (invalid input, unavailable dependency, timeout), and — when the target is UI-surfaced — at least one accessibility check (keyboard navigation, screen-reader labels, colour contrast, touch target size). Each scenario must state: a descriptive name, the input to provide, the expected output or behaviour, and how to verify (command to run, screenshot to take, value to compare). Scenarios that cannot be verified without manual human judgement are flagged as `verify: manual` and excluded from automated execution.

**Output:** `stage-2-scenarios.json` — `{scenarios: [{name, input, expected_output, verify_method, verify_type: auto|manual, category: golden|edge|failure|a11y}]}`

**Failure:** skip — if fewer than 4 scenarios generated, warn and continue with what exists.

**Duration:** 3–8 min

---

### Stage 3 — Execute

**Input:** `stage-2-scenarios.json` — full scenario list.

**Process:** Run each auto-verifiable scenario against the real system. Capture evidence for every scenario regardless of pass or fail. Evidence types by target: websites → Playwright screenshots at 375 px, 768 px, and 1440 px breakpoints plus console error log; skills → run the skill with the scenario input and capture stdout; features → run the existing test suite or invoke the feature endpoint directly and capture the response; blocks → render in a live WordPress instance and screenshot; pipelines → invoke with scenario input and capture the artifact JSON output. No mocking unless the scenario explicitly tests mock behaviour. For accessibility scenarios on UI targets, invoke axe-core via `python ~/.claude/hooks/a11y-audit.py test URL` or Playwright's accessibility snapshot and capture the violation list. Manual scenarios are skipped and noted in the evidence record.

**Certainty pass (run after all responses are gathered):**

After the batch of responses is collected (typically 5 model outputs for the current scenario set), run the certainty pass:

```python
import sys
from pathlib import Path

try:
    sys.path.insert(0, str(Path("~/.agents/skills/shared-references/").expanduser()))
    from optimisation_toolkit.certainty_calc import score as certainty_score
    result = certainty_score(responses)
    certainty_result = {
        "certainty": result["certainty"],
        "certainty_verdict": result["verdict"],  # rename for hand-off contract parity
        "dominant_answer": result["dominant_answer"],
        "dissenting_count": result["dissenting_count"],
    }
    if len(responses) < 5:
        certainty_result = {
            **(certainty_result or {}),
            "annotation": f"LOW_SAMPLE (N={len(responses)}); certainty result has reduced confidence"
        }
except ImportError:
    # Module unavailable — skip certainty pass gracefully, do not crash
    certainty_result = {
        "certainty": None,
        "dominant_answer": None,
        "dissenting_count": None,
        "certainty_verdict": "UNAVAILABLE",
        "annotation": "certainty_calc module unavailable — skipping certainty pass"
    }
except ValueError as e:
    # Fewer than 2 responses — emit low-sample annotation and continue
    certainty_result = {
        "certainty": None,
        "dominant_answer": None,
        "dissenting_count": None,
        "certainty_verdict": "LOW_SAMPLE",
        "annotation": f"single-response run — certainty calculation skipped"
    }
```

**Emit into report:**

Include the following block in the `stage-3-evidence.json` output and in the Stage 6 QC report under a **Certainty** heading:

```json
{
  "certainty": <0-100 or null>,
  "dominant_answer": "<string or null>",
  "dissenting_count": <int or null>,
  "certainty_verdict": "OK|REVIEW|HOLD|LOW_SAMPLE|UNAVAILABLE",
  "annotation": "<low sample note if applicable>"
}
```

**Certainty control-flow:**

| Verdict | Certainty | Action |
|---------|-----------|--------|
| `OK` | ≥ 70 | Continue normally to Stage 4 |
| `REVIEW` | 50–69 | Flag report with **LOW CERTAINTY** tag; annotate which responses dissented; continue to Stage 4 with annotation |
| `HOLD` | < 50 | **HARD STOP** — do not proceed past Stage 3. Surface to Bean with all responses inline so dissent is visible. Report must state: "Certainty too low to proceed (<certainty>%). Dissenting responses below:" followed by each response verbatim |
| `LOW_SAMPLE` | N/A | Emit `low sample (N=X)` annotation in evidence; continue to Stage 4 — do not crash |
| `UNAVAILABLE` | N/A | Emit annotation; continue to Stage 4 normally — certainty pass was skipped due to module import failure |

A `HOLD` verdict is a hard gate: the pipeline terminates at Stage 3. Bean must review the dissenting responses and re-run or override manually.

**Output:** `stage-3-evidence.json` — `{results: [{scenario_name, actual_output_excerpt, evidence_path, status: ran|skipped|error}], certainty: {certainty, dominant_answer, dissenting_count, verdict, annotation}}`

**Failure:** Retry behaviour depends on the error type:
- **Transient (network error / timeout):** retry up to 2 times before marking as `error`. These may self-resolve.
- **Assertion mismatch / validation failure:** no retry — the scenario has run and produced a result. Mark as `failed` and continue. Retrying will not change the outcome.
- **Infrastructure (target unreachable during Stage 3):** abort the entire pipeline immediately per the "all scenarios error" kill gate. There is no point running further scenarios if the system under test cannot be reached.

Never abort the full pipeline for a single scenario failure unless the infrastructure kill gate is triggered.

**Duration:** 5–20 min (scales with scenario count and target type)

---

### Stage 4 — Compare

**Input:** `stage-1-goal.json` + `stage-2-scenarios.json` + `stage-3-evidence.json`.

**Process:** For each executed scenario, compare actual output against the expected output defined in Stage 2. Assign pass / fail / partial per scenario. A scenario passes only when the actual output matches the expected output — not when it is "close enough" or "probably fine". Capture a verbatim evidence excerpt (first 200 characters of stdout — truncated to keep reports scannable — screenshot file path, or JSON diff snippet) for every verdict. Compute an overall confidence score on a 0–100 scale (100 = all scenarios pass, 0 = all fail): base score is `scenarios_passed / scenarios_total × 100`, then subtract 10 points per manual-skip (manual skips are unverified scenarios that reduce certainty). Flag any scenario where tests pass but the output contains a smell signal (see `references/smell-signals.md`) — unexpected warnings, deprecated API calls, response time anomaly, or layout jank visible in screenshot — with a `smell: true` tag. If any `smell: true` scenario exists, Stage 5 is triggered.

**Output:** `stage-4-compare.json` — `{pass_count, fail_count, partial_count, skip_count, confidence_score, smell_detected: bool, scenarios: [{name, verdict, evidence_excerpt, smell}]}`

**Failure:** skip — if evidence is missing for a scenario, mark verdict as `evidence_missing` and continue.

**Duration:** 3–8 min

---

### Stage 5 — Code Review (Backup)

**Input:** `stage-4-compare.json` — ONLY runs if `smell_detected: true` or if `fail_count > 0` AND `confidence_score >= 60` (tests pass but something is off).

**Trigger condition:** Stage 5 is SKIPPED BY DEFAULT. It only runs when Stage 4 sets `smell_detected: true`, or when tests are mostly green but the overall result still does not match the goal feel. Never run Stage 5 as a substitute for failing Stage 3 execution.

**Process:** Dispatch a reviewer panel using `/delegate` for model routing. **Cross-tier enforcement:** route each reviewer with `--task-shape qc_review --original-model <tier that produced the artefact>`, so no reviewer shares the author's tier. Same-model self-critique is the most-cited failure mode in reflection-loop literature — fifteen sources in the deep-qc-skill 2026-04-18 research call this "the single biggest quality lever".

Default panel: 2 cold reviewers with distinct personas, each returning a full gap register; the fresh-code review in Stage 0.5b has already covered the diff line by line, so this panel looks at behaviour against the goal. Add a third reviewer primed with an ecosystem-specific lens for ecosystem-specific gaps (JSON-LD, robots.txt, accessibility schema, API contracts) only when the smell points there. Every reviewer brief carries the three `/delegate` brief lines. **For UI-surfaced targets** (websites, blocks, design output), add `/vision-audit` as an additional cross-tier reviewer — captures screenshots across routes + viewports and dispatches a structured visual audit, giving the panel a cross-tier visual perspective the text-model reviewers cannot provide. Each reviewer receives: the smell-tagged scenarios, the target source files, and the goal statement. Each reviewer outputs a structured gap register (issue, severity, location, suggested fix). Merge the registers, deduplicating by location. A finding confirmed by two or more reviewers is flagged `confirmed: true`.

**Synthesise findings into two buckets:**

| Bucket | Definition | Trust level |
|---|---|---|
| **Diagnostic claims** | "X is broken / Y is contaminated / Z silently fails" | TRUSTED when triangulated across two or more reviewers |
| **Fix-shape proposals** | "Change `W::Z`" | HYPOTHESIS — must clear Stage 6 empirical gate before treatment as accepted |

Triangulation lifts diagnostic confidence, not fix-shape confidence. A fix-shape proposal confirmed by three reviewers is still a hypothesis until Stage 6 measures it. See `/qc-council`. Record which bucket each finding lands in before proceeding.

**Output:** `stage-5-review.json` — `{triggered: bool, gap_register: [{issue, severity, location, fix, confirmed, bucket: diagnostic|fix_shape}]}`

**Failure:** skip — if Stage 5 is not triggered, write `{triggered: false}` and proceed to Stage 6.

**Duration:** 5–15 min (when triggered)

---

### Stage 6 — Report

**Input:** All previous stage artifacts.

**Process:** Produce a unified QC report in two formats: markdown (human-readable) and JSON (machine-readable). The markdown report must include: target name and type, goal statement (from Stage 1), test plan summary (scenario counts by category), per-scenario pass/fail table with evidence links, confidence score with plain-English interpretation (90–100 = ship it; 70–89 = minor issues to fix; 50–69 = significant issues, do not ship; below 50 = fundamental problems), certainty block (see format below), fresh-code review findings (if Stage 0.5b ran), code review findings (if Stage 5 ran), and a prioritised next-actions list. Motivation layer: every report must state the top outcome unlocked by passing QC + estimated confidence uplift from fixing the top-priority finding. Never end the report without a clear "ship / fix then ship / do not ship" recommendation.

**Experiment-shaped recommendations:** Every recommendation in the next-actions list must be structured as an experiment, not a bare instruction. Each recommendation carries:

1. **Hypothesis** — a plain statement of what is believed to be wrong and what the fix will change: "Adding X to Y will cause Z to go from [baseline] to [target]."
2. **Baseline check** — a numeric metric OR a goal-shaped success criterion (see guidance below). For numeric: the command that measures it now, plus the actual current value. For goal-shaped: the binary check that currently fails.
3. **Fix shape** — the specific change, cited as `path/file::symbol` (a line number may ride along as a hint only).
4. **Predicted post-fix value** — what the measurement or check will return after the fix lands.
5. **Validation command** — the exact command to run after the fix to confirm the prediction.
6. **Commit gate** — "Do not commit if [metric] [comparator] [threshold]" (numeric form) OR "Do not commit if [check] still fails" (goal-shaped form).

**Scalar metrics are not always the right measure of success.** Add this guidance to every report that includes fix-shape recommendations:

> Not every QC task has a scalar metric. Plans, specs, prose, design docs, and architecture decisions need goal-shaped success criteria. Examples: "the three reviewer raters all agree (1) every recommendation has been addressed and (2) no new gaps surface on re-read"; "the implementer-claimed function `_X` exists at the claimed `path::_X` AND its callers list is what the proposal said it would be"; "every requirement in the original request is checkable in the diff via a one-line grep the implementer specifies upfront". Never substitute "no errors" or "code compiles" for a real success criterion — those are necessary but not sufficient. The success criterion must connect to the requirement that motivated the fix. When unsure, write the goal-shape first ("the rendered output will show X when condition Y holds"), then derive a measurement or check command from it.

**Fix-shape proposals from Stage 5 are hypotheses, not accepted specs.** Each experiment block surfaces the bucket label (`diagnostic` or `fix_shape`) from Stage 5 so the operator knows which findings have been empirically validated and which are still predictions. If the recommendations list contains two or more fix-shape proposals, surface a prompt: "Two or more fix-shape proposals detected — consider routing through `/qc-council` for empirical pre/post validation before dispatching implementers."

**Certainty block (required immediately after the verdict/confidence line):**

```
**Certainty:** <X>/100 — verdict: <OK|REVIEW|HOLD|LOW_SAMPLE|UNAVAILABLE>, dominant: <dominant_answer>, dissenting: <N>
<low-sample or unavailable annotation if applicable>
```

Omit the annotation line when no annotation is present. If the certainty pass was skipped or unavailable, render as: `**Certainty:** unavailable — certainty_calc module not loaded`.

**Grade and confidence mapping (authoritative — used by both the markdown report and the JSON output):**

| Grade | Confidence score | Recommendation |
|-------|-----------------|----------------|
| `pass` | ≥ 90 | ship |
| `partial` | 70–89 | fix |
| `fail` | < 70 | hold |

The `recommendation` field is derived from `grade` — pass→ship, partial→fix, fail→hold. These fields never disagree. If the confidence score and the grade appear to conflict, the confidence score range takes precedence and the grade is recalculated to match.

**Output:** `stage-6-report.md` + `stage-6-report.json` — `{grade: pass|partial|fail, confidence_score, recommendation, next_actions[], scenario_results[]}`

**Persistence:** The report files on disk (`stage-6-report.md` + `stage-6-report.json`, under the run's `pipeline-state/<run_id>/`) are the durable record — cross-run pattern detection works by reading previous runs' `stage-6-report.json` files, so keep the run directories.

**Failure:** retry: 1 — if report generation fails, write a minimal report with raw stage outputs.

**Duration:** 2–5 min

---

## Hand-Off Contracts

Required output fields are sourced directly from `PIPELINE_SCHEMAS["qc"]` in `validate-pipeline-artifact.py`. The validator checks for these fields in the `output` object of each stage artifact.

| From | To | Format | Required `output` fields (from validator schema) | Validation |
|------|----|--------|--------------------------------------------------|------------|
| 0 → 0.5 | detect → structural pre-gates | JSON | `type`, `location`, `reachable`, `run_id` | kill gate: reachable must be true |
| 0.5 → 1 | structural pre-gates → goal-extract | JSON | `target_type`, `checks_run`, `structural_fail` | kill gate: structural_fail=true AND all checks failed → abort |
| 1 → 1A | goal-extract → ground-truth pre-load | JSON | `goal_statement`, `acceptance_criteria` | kill gate: goal_statement must not be empty |
| 1A → 2 | ground-truth pre-load → scenario-gen | JSON | `artefacts_loaded`, `corrections_matched`, `contradictions` | hard gate: expected artefacts missing → surface to operator |
| 2 → 3 | scenario-gen → execute | JSON | `scenarios` (array with ≥1 entry) | kill gate: zero scenarios → abort |
| 3 → 4 | execute → compare | JSON | `results` (array matching scenario names; each ran result has evidence_path), `certainty.certainty` (float 0–100 or null), `certainty.certainty_verdict` ("OK" \| "REVIEW" \| "HOLD" \| "LOW_SAMPLE" \| "UNAVAILABLE"), `certainty.dominant_answer` (str or null), `certainty.dissenting_count` (int or null) | kill gate: all results with status=error → abort |
| 4 → 5 | compare → code-review | JSON | `pass_count`, `fail_count`, `confidence_score`, `smell_detected` | Stage 5 reads smell_detected flag |
| 5 → 6 | code-review → report | JSON | `triggered` (bool); gap_register may be empty if triggered=false | allowed_status: complete or skipped |
| 6 → done | report → operator | JSON + MD | `grade`, `recommendation`, `confidence_score` | grade/confidence must agree per mapping (see Stage 6) |

---

## Kill Gates

- **Unreachable target:** Stage 0 — if target cannot be reached or found, abort immediately. Report: "Target unreachable: [target]. Check path, URL, or skill name."
- **All structural checks fail:** Stage 0.5 — if every structural check fails (broken file paths, unparseable JSON, missing named functions), abort. Report each failing check explicitly. Do not generate scenarios against a structurally broken target.
- **Expected artefacts missing:** Stage 1A — if the target type expects domain artefacts (e.g. SGS pipeline state, prior skillscore) and none are found, surface to operator before proceeding.
- **No documented goal:** Stage 1 — if no goal found in any source, halt and ask user. Do not invent a goal.
- **Zero scenarios:** Stage 2 — if zero scenarios generated (not merely below 4), abort. Report: "Cannot test without scenarios."
- **Total timeout:** If pipeline exceeds 45 min wall-clock time, abort with partial report from stages completed so far.
- **All scenarios error:** Stage 3 — if every scenario returns `error` status (not just fail), abort. The system under test is likely broken at infrastructure level.
- **Stage 3 certainty HOLD:** Stage 3 — if `certainty_calc` verdict is `HOLD` (certainty < 50), do not proceed past Stage 3. Surface all responses inline to Bean so the dissent is visible. Report must state: "Certainty too low to proceed (X%). Dissenting responses below:" followed by each response verbatim. Continuation requires Bean explicit override.

---

## Validator Failure Behaviour

When `validate-pipeline-artifact.py` exits with code 1 between any two stages:

1. **Pipeline halts immediately.** Do not proceed to the next stage.
2. **Write `partial-report.md`** to the run directory (`~/.claude/pipeline-state/qc/{run_id}/partial-report.md`) containing: the stage that failed, the full validator violation list, and the artifacts completed up to that point.
3. **No automatic retry.** A validator failure is a schema bug or malformed stage output — it is not a transient flake. Retrying without a fix will produce the same result.
4. **Operator action required.** Inspect `partial-report.md`, identify whether the stage output is malformed or the schema expectation is wrong, fix the root cause, and re-run `/qc` from the start.

Note: this is distinct from a *scenario* failure in Stage 3 (which uses the retry taxonomy below). Validator failures always have the same cause — the artifact written by the previous stage does not match its contract. The same input will always fail until the root cause is fixed.

---

## State

- **Pipeline state:** `~/.claude/pipeline-state/qc/{run_id}/`
- **Artifacts per stage:** `stage-0-detect.json` through `stage-6-report.json` + `stage-6-report.md`
- **Partial results:** all completed stage artifacts saved on abort
- **Stale state cleanup:** runs older than 7 days are flagged as stale on next invocation

---

## Tool Bindings

| Operation | Claude Code | Notes |
|-----------|-------------|-------|
| Browser testing | Playwright MCP tools + axe-core | `browser_navigate`, `browser_take_screenshot`, `browser_snapshot` |
| Accessibility audit | `python ~/.claude/hooks/a11y-audit.py test URL` | For UI targets in Stage 3 |
| Screenshot (multi-breakpoint) | `browser_resize` + `browser_take_screenshot` | 375 / 768 / 1440 px |
| Skill execution | `Skill` tool | Pass scenario input as skill argument |
| Code review dispatch | `/delegate` → subagent | Per reviewer branch — never hardcode model |
| Evidence capture | File writes to pipeline-state dir | Stage 3 output |
| Validator | `validate-pipeline-artifact.py --pipeline qc` | Between every stage |

---

## Reviewer Model Routing (Stage 5)

Reviewer models come from `/delegate` (`.claude/skills/delegate/scripts/route.py`):

| Reviewer | Descriptor | Typical answer | Role |
|----------|-----------|----------------|------|
| Fresh-code (Stage 0.5b) | `code_review` | Sonnet, medium | Line-by-line diff review before testing |
| Panel (Stage 5) | `qc_review --original-model <author tier>` | Opus when Sonnet wrote it; Sonnet when the main session or Opus wrote it | Behaviour against the goal, full gap register |
| Ecosystem (Stage 5, when the smell points there) | `qc_review` with an ecosystem persona | as above | JSON-LD, robots.txt, API contracts, /uimax gaps |

Consult `/delegate` per reviewer — never hardcode. If `/delegate` is unavailable, use a single Sonnet reviewer at medium effort.

---

## Scenario Templates

Reusable scenario starters by target type — see `references/scenario-templates.md`.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Running code review as primary mode | The fresh-code review (Stage 0.5b) is one cheap reviewer that catches obvious faults before testing; the real test still decides the verdict. Stage 5's panel is backup only. |
| Browser testing code with a known critical fault | A Critical finding in Stage 0.5b stops the run before Stage 3: fix first, then re-run. |
| A review panel for the fresh-code review | One reviewer reads the diff; the panel is Stage 5's job, and only when tests smell off. |
| Inventing a goal when none is documented | Hard gate at Stage 1 — ask the user. |
| Mocking in Stage 3 by default | No mocking unless the scenario explicitly tests mock behaviour. Real system only. |
| Skipping a11y scenarios on UI targets | Accessibility is mandatory for any UI-surfaced target. |
| Claiming pass without evidence excerpt | Every verdict needs a verbatim evidence excerpt. |
| Running Stage 5 when tests all fail | Stage 5 is for "tests pass but smells off" — not for debugging broken tests. |
| Not capturing console errors | Browser scenarios must capture `console.error` calls alongside screenshots. |
| Treating a triangulated fix-shape proposal as an accepted spec | Triangulation lifts diagnostic confidence, not fix-shape confidence. Every fix-shape is a hypothesis until the Stage 6 experiment gate validates it; see `/qc-council`. |
| Writing bare "do X" recommendations without an experiment frame | Every recommendation needs: hypothesis, baseline check, fix shape, predicted post-fix value, validation command, and commit gate. A bare instruction gives the implementer no way to know if the fix worked. |
| Skipping Stage 0.5 structural pre-gates | Running scenarios against a target with broken file paths or unparseable JSON wastes scenario tokens on phantom failures. Stage 0.5 is cheap — always run it. |

---

## References

- `references/scenario-templates.md` — reusable test scenario starters per target type
- `references/smell-signals.md` — catalogue of smell patterns that trigger Stage 5
- `scripts/run-qc.py` — standalone runner script for non-interactive invocation

QC discipline (Stage 0.5 pre-gates, per-scenario evidence) is followed manually per this SKILL.md.
