---
name: qc-council
type: skill
user-invocable: true
argument-hint: "<target> [--proposals <path>] [--inline | --pipeline]"
description: >-
  This skill should be used when a multi-rater diagnostic council has produced
  one or more fix-shape proposals that would otherwise dispatch subagents
  before being validated. Forces every fix-shape proposal through an empirical
  pre/post measurement gate — predicted numeric outcome, baseline measurement,
  validation command, commit gate — before treatment as an accepted spec,
  and reviews each wave's new code before any fix counts as shipped.
  Sits between research / diagnosis and implementation. Triggers on "qc
  council", "council this", "validate the council", "before-dispatch
  validation", "hypothesis-test these fixes", "is this the real path",
  "honest path", "/qc-council".
  Do NOT invoke for: single-file clear-diagnosis fixes (just do them), pure
  diagnosis without fix shapes (use /research, /qc-inline, or
  /systematic-debugging), small artefacts adequately covered by /qc-inline
  (use /qc-inline directly), end-to-end test pipelines with durable
  per-scenario artifacts (use /qc), pure web research before any options
  exist (use /research-council).
---

# QC Council

A council protocol that validates fix-shape proposals **empirically** before any subagent gets dispatched to implement them. Sits between research / diagnosis (where the proposal originates) and implementation (where wrong proposals waste a wave of subagent + commit-merge cycles).

## Mandatory References

Before running, load:
1. `~/.agents/skills/shared-references/communication-standards.md` — plain English rules for all operator-facing output
2. `~/.agents/skills/shared-references/model-routing.md` — Stage three dispatch table
3. `~/.agents/skills/shared-references/verification-rationalisations.md` — iron law + red-flag list + rationalisation tables; cite at Stage Five (empirical validation) and Stage Seven (implementer commit-gate) — both are completion-claim boundaries
4. `references/canonical-personas.md` — the five canonical rater personas (visible-eyeball / structural-diff / pipeline-forensics / code-path-tracer / historical-context)
5. `references/example-council-walkthrough.md` — worked example using the canonical 2026-05-21 Wave-1 (G2 + G4) case study

## Goal

For every fix-shape proposal that enters the council, produce a verdict (`validated-shipped` / `validated-rejected` / `falsified` / `unverifiable`) backed by an empirical baseline measurement, plus an experiment-shaped step ready for `/spec-writer` + `/phase-planner` handoff if shipped.

**Type:** Skill (technique — staged inline operations across nine stages numbered Stage 0 through Stage 8; pipeline variant available when artifact durability is needed via `--pipeline`)

**Flow:** DETECT → LOAD GROUND TRUTH → SEED PERSONAS → DISPATCH → DEBATE → EMPIRICAL VALIDATION (HARD GATE) → EXPERIMENT DESIGN → IMPLEMENTATION → REPORT

**Core rule (`council-fix-shapes-are-hypotheses-not-specs`, captured 2026-05-21):** Multi-rater council fix-shape proposals are **hypotheses**, not specs. Diagnostic claims may be trusted when triangulated across raters. Fix-shape proposals must be measured before they can be treated as accepted.

## System Effect (6-lens check)

1. **End-result.** Validated fix-shape proposals shipped to `/spec-writer` + `/phase-planner` as experiment-shaped steps; eliminates the failure mode where subagent dispatch + commit-merge cycles burn on unvalidated council predictions. The 2026-05-21 Wave-1 incident (G2 + G4 both no-ops despite implementing council prescription exactly) is the canonical failure this skill exists to prevent.
2. **Cross-context reach.** Inline mode runs identically in the main conversation, a cold subagent and a headless `claude -p` run — no platform-specific state. Pipeline mode writes artifacts to `~/.claude/pipeline-state/qc-council/{run_id}/`, readable by any later session. Stage Six handoff format is plain JSON consumable by a `/spec-writer` invocation.
3. **Correction persistence.** Stage Eight invokes an auto-memory lesson write on falsified proposals so every "council was wrong about the fix shape" event becomes a durable correction with a pattern_key, written to the CC auto-memory (`feedback_*.md` + `MEMORY.md` index). Recurring failure patterns auto-surface to future councils because Stage One's ground-truth load reads those same records.
4. **Automation vs human-remember.** Every gate is enforced inline — Stage One ground-truth load is a hard gate; Stage Four diagnostic-vs-fix-shape split is mandatory bucketing; Stage Five baseline measurement is a hard gate; Stage Seven implementer cold prompts MUST embed the commit-gate clause verbatim. None of these depend on the operator remembering to do the right thing.
5. **ADHD / overwhelm.** Net cognitive load DOWN. Without `/qc-council`, the operator faces N proposals plus the implicit unknown of which ones are no-ops — pure ambiguity. With `/qc-council`, every proposal arrives at Stage Six with a verdict label and (if shipped) a fully specified experiment step. The cognitive shift from "did I miss a no-op?" to "the gate caught the no-ops" is what reduces load.
6. **Values alignment (motivation lens).** Top USP impact: every report ends with a "saved X waves of subagent + commit-merge cycles by catching N no-op proposals pre-dispatch" line. This makes the skill's value visible per run rather than abstract. The 2026-05-21 example: catching G2 + G4 pre-dispatch would have saved one wave of subagent work plus two commit-merge cycles plus one re-baselining session — concrete time recoverable.

## When to Use

- A council, debate, or systematic-debugging exercise has produced two or more proposed fixes and the next step would be subagent dispatch
- Honest-path-council style framing: "is this the real path, or are we band-aiding?"
- Wave-based implementation where each wave has a measurable closure metric (pixel-diff percentage, leftover-bucket count, test pass rate)
- After `/research` or `/deep-research` produced a list of recommendations and the operator needs to filter no-ops out before coding
- High-stakes implementation where a wrong fix-shape costs a wave of subagent plus commit-merge cycles

## When NOT to Use

- Small artefact (two or fewer fix-shape proposals OR under one KB of source under analysis OR single-file fix with no cross-file dependency) → just do it (Snorkel paradox: reflection hurts easy tasks, so council overhead is net negative below the threshold)
- Pure diagnosis with no fix shape yet → use `/research`, `/qc-inline`, or `/systematic-debugging`
- Small artefact adequately covered by `/qc-inline` end-to-end testing → use `/qc-inline` directly
- Multi-stage durable end-to-end test pipeline needed → use `/qc`
- Pre-existing /qc / /qc-inline coverage is sufficient — don't stack another layer
- No measurable metric exists yet → `/research` first to establish one
- Time-bound emergency where the cost of validation exceeds the cost of a wrong fix (rare — name the timeline in the bypass note)

## Invoked Skills

This skill invokes the following skills mid-execution via the `Skill` tool or `Agent` tool dispatch:

| Skill | When | Why |
|---|---|---|
| `/delegate` | Stage Three (dispatch) | Picks model per persona — never hardcoded |
| `/dispatching-parallel-agents` | Stage Three + Stage Seven | Raters dispatched in parallel; implementers dispatched in parallel post-validation |
| `/subagent-prompt` | Stage Three + Stage Seven | Writes cold prompts containing Stage One ground-truth pack + Stage Six experiment frame |
| `/qc-inline` | Stage Five (empirical validation) | The smallest-pipeline-slice baseline measurement often IS a `/qc-inline` run |
| `/spec-writer` | Stage Six handoff | Writes up the validated experiment-shaped plan |
| `/phase-planner` | Stage Six handoff | Sequences the validated experiments into waves with between-wave gates |
| `/brainstorming` | Stage Four framing reference | Design-mode framing applies to the debate: converge on a shared mental model, surface disagreements explicitly |
| an auto-memory lesson write | Stage Eight post-mortem | Falsified proposals + recurring failure modes become captured lessons |
| `/systematic-debugging` | Methodology underlying Stages Four through Six | The hypothesis → evidence → minimal repro → fix loop IS what Stages Four through Six implement at council scale |

## Stages

### Stage 0 — Detect

Identify the council's actual question shape.

- **Diagnostic council** (what is broken?) — runs Stages One through Four and stops at Stage Four with TRUSTED diagnostic claims. No validation gate fires.
- **Fix-shape council** (how should we fix it?) — runs all stages. Stage Five validation gate is mandatory.
- **Both** — runs all stages; the Stage Four output bucket is split (TRUSTED diagnostics vs HYPOTHESIS fixes), each gated independently.

Output: `{council_type, proposals[], context_summary}`.

**HARD GATE:** if the input doesn't contain at least one fix-shape proposal AND the operator asked for a fix-shape council, ask the operator to convert the input or route to `/research` first.

### Stage 1 — Load Ground Truth (binding rules two-five-four + two-seven-two)

Before any rater is dispatched, load the canonical artifacts. The list depends on domain:

**For SGS pipeline work (canonical):**
- `pipeline-state/<latest>/leftover-buckets.json` — gap classification by section + slot + reason
- `pipeline-state/<latest>/extract.json` — per-section emitted block_markup + extracted_attributes
- `pipeline-state/<latest>/trace.jsonl` — per-stage event log
- `python ~/.claude/hooks/wp-blocks.py dump` — schema enumeration across all three databases
- The project's auto-memory index (`C:/Users/Bean/.claude/projects/<project-slug>/memory/MEMORY.md`) plus the relevant `feedback_*.md` lesson files it points to, grepped for the domain keywords

**For non-SGS work:** load the equivalent ground-truth artifacts for that domain (test reports, profiler output, git blame, error logs, the spec). The rule is: load the artefacts that already classify the problem before letting raters re-classify it.

**Surface contradictions FIRST.** If the proposal set says "X is broken" but the ground-truth artefact already classifies X differently, that contradiction goes to the raters in their cold prompt as a forcing question.

**HARD GATE:** if the ground-truth artefacts can't be loaded (missing pipeline state, no recent run, schema dump fails), abort with a clear surface. Do not council on conjecture.

### Stage 1.5 — Structural pre-gates (HARD GATE — runs before rater dispatch)

Before any rater is dispatched, run repeatable cheap checks (same input always gives same output) against the proposal set. These are cheap, free, and catch sixty to eighty percent of issues per the CRITIC paper finding — paying LLM rater tokens for what a linter could catch is waste. Structural-first ordering is the literature-canonical pattern (deep-qc-skill research 2026-04-18, fifteen sources).

For each fix-shape proposal, verify:
- **Symbol exists** — the `fix_shape.file` opens and `fix_shape.function` (a `path::symbol` anchor) is found in it
- **Function name resolves** — if `fix_shape.function` is named, grep finds the definition in the named file
- **Predicted metric is measurable** — the `predicted_post_fix` metric has a measurement command (file path or CLI) that exists and runs
- **No conflicting concurrent proposal** — if two proposals touch the same `path::symbol`, surface the collision before dispatch

Proposals that fail any check are tagged `structural_fail` and dropped from rater dispatch — the operator sees them in the Stage 8 report with the specific check that failed.

**HARD GATE:** if every proposal fails structural checks, abort the council. The diagnostic is operating on phantom file paths or non-existent functions — investigate at source before councilling.

### Stage 2 — Seed Personas

Generate three rater personas by default; add a fourth or fifth only when the fix shape spans several files or has a history of failed attempts, and never run more than three at once (`/delegate`'s fan-out budget). Each has a DIFFERENT angle. Each has explicit fact-checking duty against Stage One ground-truth.

Canonical trio (always seed these for pipeline/code work):
- **A — Visible eyeball / Playwright-DOM verifier** — opens the rendered output in a browser, takes screenshots, compares to mockup or expected state
- **B — Structural-diff between source and target** — class-by-class, element-by-element DOM or AST diff between expected and actual
- **C — Pipeline-output forensics** — reads the artefacts loaded in Stage One, traces which stage emitted each gap or wrong value

Optional personas added per task shape:
- **D — Code-path tracer** — when fix-shape involves multiple files; reads source + traces actual control flow, distinguishing "the code says X" from "X actually executes"
- **E — Historical-context** — greps `MEMORY.md`, `feedback_*.md` and `git log --grep` for past sessions with the same symptom; surfaces prior fix attempts + their outcomes

Full persona templates: `references/canonical-personas.md`.

### Stage 3 — Dispatch (model routing via /delegate)

For each persona, call `/delegate` to pick the model and effort. Don't hardcode. **Cross-tier enforcement:** depth raters route with `--task-shape qc_review --original-model <tier that produced the proposal set>`, so no rater shares the author's tier. Same-model self-critique is the most-cited failure mode in reflection-loop literature — fifteen sources in the deep-qc-skill 2026-04-18 research call this "the single biggest quality lever".

Default routing (subject to `/delegate`'s decision):
- A (visible-eyeball) → Sonnet (visual analysis + Playwright tool use)
- B (structural-diff) → Sonnet (DOM/AST diff requires depth)
- C (pipeline-forensics) → Sonnet (JSON walk-through + cross-artefact reasoning)
- D (code-path tracer) → Haiku at medium effort (`find_list`: mechanical trace)
- E (historical-context) → Haiku at medium effort (`find_list`: search + summary only)

Dispatch via `/dispatching-parallel-agents` when raters are independent (most cases). Each rater receives the Stage One ground-truth pack in its cold prompt via `/subagent-prompt`. Cold prompts include:
- The three `/delegate` brief lines, word for word, starting with "Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."
- A capped return: at most 10 claims, each with its evidence reference
- The proposal set under review
- The Stage One ground-truth artefacts (relevant excerpts, not the full file dumps — keep cold prompts tight)
- Explicit fact-check duty: any claim made must cite a `path::symbol` reference or artefact-key from the ground-truth pack
- The persona's specific angle as the framing constraint

### Stage 4 — Debate (adversarial fact-check)

Collect rater returns. Synthesise into **two distinct buckets**:

| Bucket | Definition | Trust level |
|---|---|---|
| **Diagnostic claims** | "X is broken / Y is contaminated / Z silently fails" | TRUSTED when triangulated across two or more raters |
| **Fix-shape proposals** | "Change `W::Z` to fix it" | HYPOTHESIS — even when triangulated. Must pass Stage Five. |

**The adversarial round.** Each rater is given the other raters' findings and asked to call out any fix-shape proposal that conflicts with its own evidence, or that proposes work on a code path the evidence shows isn't the right consumer or producer. This is `/brainstorming` design-mode discipline: converge on a shared mental model, surface disagreements explicitly. Don't smooth over.

**Drop unjustified proposals.** A fix-shape proposal that no rater can defend with `path::symbol` evidence from Stage One ground-truth is dropped, not debated. The drop is logged so future runs can spot the pattern.

**Rater agreement quantification (certainty_calc wiring, backported from /qc + /qc-inline).** After all raters return, run `certainty_calc.score(responses)` from `~/.agents/skills/shared-references/optimisation_toolkit/certainty_calc.py` on the rater outputs. Returns `{certainty: 0-100, dominant_answer, dissenting_count, verdict}`.

| Verdict | Certainty band | Action |
|---|---|---|
| `OK` | 70 or higher | Proceed to Stage Five normally |
| `REVIEW` | 50 to 69 | Flag in Stage Four output as "LOW CERTAINTY"; surface dissenting rater to operator by name; continue to Stage Five with annotation |
| `HOLD` | below 50 | HARD STOP — do NOT proceed past Stage Four. Surface all rater outputs verbatim to the operator. Continuation requires explicit operator override. |
| `LOW_SAMPLE` | not applicable (under two responses) | Emit annotation and continue to Stage Five — single-rater council is acceptable for very small proposal sets |

**Persona-disagreement escalation.** When two raters disagree on a TRUSTED diagnostic claim (not a fix-shape proposal), the synthesis cannot pick a winner — both diagnostics are documented and carried forward to Stage One of the next council as competing hypotheses. Do not collapse genuine disagreement into a single chosen claim; the resolution belongs to a fresh ground-truth load, not to vote-counting.

Output: `{trusted_diagnostics: [...], hypothesis_proposals: [...], dropped: [...], certainty: {...}, disagreeing_diagnostics: [...]}`.

### Stage 5 — Empirical Validation (HARD GATE per row two-seven-six)

For each `hypothesis_proposal` that survived Stage Four, produce:

1. **Predicted falsifiable outcome** — written as either a numeric metric OR a goal-shaped success criterion. The shape of the prediction MUST match the shape of the artefact being councilled.

   **Numeric metric form** (use when there is a real, scalar metric — pixel-diff %, test pass count, error count, leftover-bucket size, perf budget): "Hero `stage_3_slot_list` failures will drop from one-hundred-forty-two to under sixty", "trust-bar/1440 pixel-diff will drop from thirty-one-point-seven percent to under fifteen percent".

   **Goal-shaped form** (use when scalar metrics misrepresent success — plans, specs, prose, design docs, architecture decisions): "After fix lands, the three reviewer raters all agree (1) every recommendation in the report has been addressed and (2) no new gaps surface on re-read." OR "After fix lands, the implementer-claimed function `_X` exists at the claimed `path::_X` AND its callers list is what the proposal said it would be." OR "After fix lands, every requirement listed in the original request is checkable in the diff via a one-line grep that the implementer specifies upfront."

   The prediction is FALSIFIABLE either way. Numeric form: a measurement command returns a number that can be compared to the threshold. Goal-shaped form: a check command (re-running raters / running the named grep / loading the page and observing) returns a binary pass/fail. **Never substitute "no errors" or "code compiles" for a goal-shaped success criterion — those are necessary but not sufficient. The success criterion must connect to the requirement that motivated the fix.**

   Anti-pattern to avoid: bare "no errors" predictions for code changes. The 2026-05-21 G4 misdiagnosis is the canonical case — "chrome strip will reduce diff" sounded like a metric prediction but the underlying success condition (chrome no longer contaminates measurement) was actually goal-shaped + wasn't checked against the real consumer path. When in doubt, write the goal-shape first ("the rendered output will show X when condition Y holds") then derive a measurement command from it.

2. **Baseline check command** — numeric form: the smallest pipeline slice (often a `/qc-inline` run) that produces the metric without the fix applied. Goal-shaped form: the binary check that returns pass/fail without the fix applied (e.g. re-run raters on the pre-fix artefact; grep for the named function in the pre-fix code; load the pre-fix page and observe whether condition Y holds). Run it. Record actual baseline.

3. **Validation routing:**

| Baseline vs prediction | Verdict | Action |
|---|---|---|
| Numeric: baseline already matches predicted post-fix value. Goal-shaped: baseline check ALREADY passes without the fix | **Diagnosis wrong** — the artefact isn't broken in the way the council claimed | Return proposal to Stage Zero with the disproof |
| Numeric: baseline differs from predicted post-fix value by the expected delta. Goal-shaped: baseline check fails AND the post-fix check would plausibly pass | **Validated hypothesis** | Proceed to Stage Six |
| Baseline cannot be measured or checked (artefact missing, infra down, check command undefined) | **Unverifiable** | Drop or escalate — no Stage Six |

**The hard gate, restated for clarity:** no fix-shape proceeds to Stage Six without a measured baseline. "I'm confident this will work" does not pass Stage Five. The gate exists because confident-but-unmeasured was the failure mode that produced 2026-05-21 Wave-1's two no-ops.

### Stage 6 — Experiment Design (handoff to /spec-writer + /phase-planner)

For each `validated_hypothesis`, produce an experiment-shaped step containing:

```yaml
hypothesis: "Cv2's _collect_css_decls_for_element returns zero hits for sgs-registered blocks because css_router's .page-id-N scope prefix isn't stripped by the matcher; stripping it will raise variation_css_rules from zero to at least eight for hero + trust-bar."
baseline_metric: "variation_css_rules for hero + trust-bar in latest pipeline-state/trace.jsonl"
baseline_command: "python -c \"...\" (the exact command that produced the baseline number)"
baseline_value: { hero: zero, trust-bar: zero }
fix_shape:
  file: "plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py"
  function: "_collect_css_decls_for_element"
  change: "Add re.sub for leading scope prefix before existing matcher loop"
predicted_post_fix: { hero: "at least eight", trust-bar: "at least five" }
validation_command: "same as baseline_command, run post-fix"
commit_gate: "Do not commit if hero variation_css_rules is below eight OR trust-bar below five"
between_wave_gate: true     # this fix must validate before any dependent Wave-2 fix is dispatched
```

Multi-wave plans get a between-wave validation gate (`between_wave_gate: true`), not just end-of-plan. Hand the resulting experiment-shaped plan to:
- `/spec-writer` — write-up of the validated experiment set
- `/phase-planner` — sequencing with the between-wave gates embedded as explicit phase boundaries

### Stage 7 — Implementation (delegated via /dispatching-parallel-agents + /subagent-prompt)

Dispatch implementer subagents with the experiment frame embedded in the cold prompt. The cold prompt template MUST include:

- The hypothesis + baseline value (so the implementer knows what is being measured)
- The exact fix shape (`path::symbol`, change description)
- The validation command (the exact thing the implementer will run post-fix)
- The commit gate (verbatim — "do not commit if [metric] [comparator] [threshold]")
- Safety clauses from `~/.claude/rules/git-hygiene.md` (no stash, explicit pathspecs, straight to main) + `~/.claude/rules/no-coauthored-by.md`
- Pre-existing-uncommitted-changes guidance (scope commits by exact path; do not `git add .` or `-A`)

- The three `/delegate` brief lines, word for word

Route implementers with `/delegate` (`code_gen`: Sonnet at medium effort). Group proposals that touch the same files into one implementer; never run more than three implementers at once.

Each implementer:
- Runs the baseline measurement BEFORE writing any code
- Applies the fix
- Runs the post-fix measurement
- Commits ONLY if the commit gate passes
- Reports actual pre/post numbers + commit SHA (or "did not commit; predicted X, got Y")

### Stage 7.5 — Fresh-code review (one reviewer per wave)

A passing commit gate proves the metric moved; it does not prove the code is sound. Before Stage 8 records any `validated-shipped` verdict, review the wave's new code once:

1. Write every implementer commit in the wave to one diff file: `git log --oneline BASE..HEAD`, `git diff --stat BASE..HEAD`, `git diff -U10 BASE..HEAD`.
2. Dispatch ONE reviewer for the whole wave, routed with `/delegate` (`code_review`: Sonnet at medium effort; `--high-complexity` for security, payments or data migration). Brief it with the brief lines, the diff file, each proposal's fix shape, and the project rules the code must honour. Return: findings as `path:line — severity — issue`, at most 15.
3. A Critical or Important finding goes back to that proposal's implementer (SendMessage keeps its context) to fix, re-measure and re-commit under the same commit gate. Minor findings are listed in the Stage 8 report.
4. A proposal whose Critical finding is not fixed is reported `validated-rejected` with the finding as the reason.

### Stage 8 — Report

Per-proposal verdict and per-wave summary.

**Per-proposal verdict format:**
- `validated-shipped` — passed Stage Five; implementer commit gate passed; Stage 7.5 review clear of Critical and Important findings; SHA recorded
- `validated-rejected` — passed Stage Five; implementer commit gate failed (predicted delta didn't materialise — the fix shape was right about the consumer but wrong about the mechanism, or another code path inverted the change)
- `falsified` — failed Stage Five (baseline already matched predicted post-fix value → diagnosis wrong) — returned to Stage Zero
- `unverifiable` — baseline measurement was impossible — escalated

**Per-wave summary:**
- Proposals in: N
- TRUSTED diagnostics: N
- HYPOTHESIS proposals: N
- Validated + shipped: N
- Falsified: N (with disproofs feeding next council Stage Zero)
- Unverifiable: N
- Wave gate: PASSED (avg metric moved at or above threshold) / FAILED (re-council before next wave)

**Top USP impact line:** every report ends with "Saved X waves of subagent + commit-merge cycles by catching N no-op proposals pre-dispatch."

**Falsification → lesson capture:** for each `falsified` verdict, invoke an auto-memory lesson write with the failure mode. Especially capture recurring patterns (e.g. "council assumes producer always feeds consumer X — actual code routes via Y").

**Iteration cap (HARD GATE — prevents agent-loop-of-doom).** A council that produces `falsified` verdicts on the same proposal set across multiple reconvenings is chasing tail-end disagreements. Hard cap: two reconvenings per proposal set. On the third reconvening, halt the auto-loop and escalate to the operator with the message: "Two waves of council have failed to ship a validated fix on this proposal set. Either the diagnostic itself is wrong, or there is a deeper structural issue. Want me to escalate to `/research-council` before another wave?" The operator decides whether to re-council, re-research, or close the proposal set as unverifiable.

## Hard Gates

- **Stage Zero:** input must contain at least one fix-shape proposal for a fix-shape council; otherwise route elsewhere
- **Stage One:** ground-truth artefacts must load; otherwise abort
- **Stage Four:** fix-shape proposal that no rater can defend with `path::symbol` evidence is dropped
- **Stage Five:** no fix-shape proceeds to Stage Six without a measured baseline
- **Stage Seven:** implementer cold prompt MUST include the commit-gate clause verbatim
- **Stage Seven-point-five:** no `validated-shipped` verdict while the wave's fresh-code review shows an unfixed Critical or Important finding

## Tool Bindings

| Operation | Claude Code | Notes |
|-----------|-------------|-------|
| Persona dispatch | `Agent` tool via `/delegate` + `/dispatching-parallel-agents` | Never hardcode model |
| Cold prompts | `Skill` tool with `/subagent-prompt` | Each cold prompt embeds Stage One ground-truth pack + Stage Six experiment frame |
| Baseline measurement | `Skill` tool with `/qc-inline` OR a domain-specific pipeline slice | Whichever produces the smallest reproducer of the metric |
| Plan handoff | `Skill` tool with `/spec-writer` + `/phase-planner` | Stage Six |
| Falsification lessons | `Skill` tool with an auto-memory lesson write | Stage Eight |
| Ground-truth artefacts | `Read` + `Grep` + `python ~/.claude/hooks/wp-blocks.py dump` | Stage One |

## State

- **Inline mode (default):** all stages run in main conversation; output is structured markdown + JSON in the operator's response stream
- **Pipeline mode (`--pipeline`):** stages emit durable artifacts to `~/.claude/pipeline-state/qc-council/{run_id}/stage-N-*.json`
- **Worked-example fixture:** `scripts/fixtures/example-council.json` — the 2026-05-21 Wave-1 (G2 + G4) case study showing Stage Five catching both no-ops

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Treating a triangulated fix-shape proposal as a spec | Triangulation lifts diagnostic confidence, not fix-shape confidence. Fix-shape always needs Stage Five. |
| Skipping Stage Five because "the council was rigorous" | The 2026-05-21 council was rigorous AND wrong twice. Rigour does not equal correctness for fix shapes. |
| Letting the implementer do the baseline measurement | Baseline measurement happens at Stage Five — pre-dispatch. By implementer time it is too late to falsify the proposal. |
| Counting baseline-already-matches as "fix not needed" | It means the diagnosis is wrong. Return to Stage Zero and re-diagnose; the symptom the operator sees has a different cause. |
| Forgetting the commit gate in the cold prompt | Without the verbatim commit-gate clause, implementers may commit a no-op fix that "looks right". The gate is the structural enforcement. |
| Dispatching all proposals in Stage Seven in parallel | Some validated proposals have inter-dependencies (Wave-2 G3 depends on Wave-1 G2). Use `/phase-planner` between-wave gates rather than fanning everything out. |
| Treating `unverifiable` as `validated` | Unverifiable means "the predicted delta cannot be measured". It is closer to falsified than to validated. Escalate or drop. |
| Hardcoding Sonnet for every persona | Persona D (code-path trace) and E (historical context) are Haiku-shaped. Use `/delegate` — don't override its judgement without reason. |

## Cross-References

This skill should be referenced by:
- `/qc` — when a /qc Stage Five code-review finding lists two or more fix-shape proposals
- `/qc-inline` — when an inline QC produces two or more fix-shape proposals
- `/research-council` — when council output includes two or more actionable fix shapes
- `/strategic-plan` — Phase Three risk assessment when proposed fixes haven't been empirically validated
- `/phase-planner` — between-wave validation gate references
- `/systematic-debugging` — when hypothesis-fix-test loop produces two or more candidate fixes
- `/brainstorming` — design-mode exit to /qc-council when options need validation before pick
- `/dispatching-parallel-agents` — when the parallel branches are fix-shape implementations rather than independent research

This skill references:
- `/delegate`, `/dispatching-parallel-agents`, `/subagent-prompt` (dispatch + cold prompts)
- `/qc-inline` (baseline measurement)
- `/spec-writer`, `/phase-planner` (Stage Six handoff)
- `/brainstorming`, `/systematic-debugging` (methodology underlying Stages Four through Six)
- an auto-memory lesson write (Stage Eight falsification capture)

## References

- `references/canonical-personas.md` — the five rater persona templates with cold-prompt frames
- `references/example-council-walkthrough.md` — full worked example using 2026-05-21 Wave-1 (G2 + G4) as the canonical case study
- `references/end-goal-rubric.md` — acceptance criteria for the skill itself
- `scripts/fixtures/example-council.json` — machine-readable fixture for smoke testing the skill end-to-end
- A PostToolUse advisory hook for this skill is not currently present in `~/.claude/hooks/`; do not rely on it.
- `~/.agents/skills/shared-references/communication-standards.md` — plain English rules (shared)
- `~/.agents/skills/shared-references/model-routing.md` — Stage Three dispatch table (shared)
- `council-fix-shapes-are-hypotheses-not-specs` (2026-05-21) — the core rule
- `multi-model-qc-panel-before-every-commit` — sibling rule
- `read-leftover-buckets-before-conjecturing` — Stage One grounding
- `schema-enumeration-before-missing-x` — Stage One grounding
- `mistakes.md` 2026-05-20 lessons three + four + five — the failure-mode evidence

