---
name: subagent-prompt
user-invocable: false
description: >-
  This skill should be used when writing a prompt to dispatch to a cold
  subagent via the Agent tool (Sonnet, Opus or Haiku) or a cloud session. Produces a self-contained prompt that lets the subagent
  succeed without prior context, using a 6-section base template (Role /
  Task / Context / Instructions / Output / Criteria) plus a 7th "Key
  Judgement Calls" section for high-stakes work. Triggers on phrases like
  "write a subagent prompt", "cold agent prompt", "prompt for Sonnet",
  "prompt for Haiku", "prompt for Opus", "dispatch prompt", "cold prompt",
  "agent prompt", "cloud prompt".
  Invokes no other skills mid-execution (this is a generator). First step
  is always a dispatch-justification check — if no criterion from the
  dispatch decision rule applies, or the session's fan-out budget is
  spent, the skill STOPS and tells the caller to run the work inline in
  the main thread instead.
  Do NOT invoke for: prompts intended for the main-thread session (write
  them directly), questions Bean answers himself, dispatches that do not
  meet any dispatch-decision-rule criterion, or prompts to a chatty
  interactive assistant (subagent prompts are one-shot).
---

# Subagent Prompt

Generate a self-contained prompt for a cold subagent — one that will succeed without access to the originating conversation's context.

**Type:** Technique

**Stages:** CHECK JUSTIFICATION AND FAN-OUT BUDGET → CHOOSE MODEL AND EFFORT → WRITE 6 SECTIONS → ADD KJC IF HIGH-STAKES → SELF-REVIEW

**HARD GATE:** Before writing any prompt, confirm which dispatch-decision-rule criterion is met. If NONE applies, STOP and instruct the caller to run the work inline in the main thread — do not produce a cold prompt just because it feels tidier.

## Goal

A cold subagent receives the produced prompt and can complete the task on first attempt without asking follow-up questions.

## System Effect (6-lens)

1. **End-result.** A self-contained 6- or 7-section prompt the subagent can execute without loading the originating conversation's context — first-attempt success, no clarification round-trips.
2. **Cross-context reach.** The 7-section template is plain text, so a prompt written in the main session runs unchanged in a cold subagent or a headless `claude -p` run.
3. **Durable record.** The produced prompt is pasted into the session transcript verbatim, so the transcript is the record of what was dispatched.
4. **Automation vs human-remember.** The dispatch-justification HARD GATE externalises the "should I dispatch?" decision — the skill refuses rather than relying on Bean to remember the five criteria. The 6-section template means no prompt shape has to be recalled from memory.
5. **ADHD / overwhelm.** Stage 5 self-review is a checklist, not a judgement call. KJC section is capped at 2–4 decisions — more than 4 means the prompt is too broad and must be split, preventing unbounded scope in dispatched work.
6. **Values alignment.** Every dispatched task lands with acceptance criteria sized to its risk, so dispatched work cannot silently drift from the brief, and low-risk work is not buried under checks. Dispatch is refused when inline is cheaper or the fan-out budget is spent, protecting Bean's time and token spend.

## When to Use

- Dispatching 3+ similar artifacts to a batch agent (templates, migrations, scaffolded pages)
- Spawning independent research branches that run wall-clock parallel
- Token-heavy generation where a cheaper model can succeed with a tight spec
- Destructive isolation (operations safer in a worktree or fresh session)
- Wall-clock parallelism where two paths must progress simultaneously

**When NOT to use:**
- Single artifacts the main thread can produce inline — write them directly
- Questions Bean can answer faster than the prompt can be written — ask Bean
- Connected multi-step reasoning where a subagent loses thread — keep inline or use `/strategic-plan` for the macro shape and `/phase-planner` for executable steps
- Prompts for the main-thread session — write them directly, don't wrap
- Dispatches with no justification from the dispatch-decision-rule — STOP, run inline
- 2+ independent tasks needing parallel dispatch — route to `/dispatching-parallel-agents` so workers run wall-clock parallel

## Invoked Skills

This skill invokes no other skills mid-execution. It is a generator. If the caller needs research before writing the prompt, they should invoke `/research` first and feed findings into the Context section.

## Stage 1 — Dispatch Justification Check

Before any prompt writing, confirm which criterion applies:

| Criterion | Definition |
|-----------|-----------|
| (a) 3+ similar artifacts | Template-style generation of repeated items |
| (b) Independent research branches | Parallel queries with no shared state |
| (c) Token-heavy batch | Large-output work a cheaper model can handle |
| (d) Destructive isolation | Operations safer in a fresh process or worktree |
| (e) Wall-clock parallelism | Two independent paths advancing at the same time |

If none of (a)-(e) applies, STOP. Tell the caller: "Dispatch unjustified — run inline instead."

### Fan-out budget check
Count the subagents this session has already dispatched. The budget (`/delegate`'s `fanout`) is at most 3 running at once and about 12 in a session. Past the soft cap, STOP unless this dispatch is a genuinely independent, sizeable track, and tell the caller: "Fan-out budget spent — run inline." A session that spawns dozens of subagents spends hours on re-briefing and report-reading overhead. One subagent beats several on a modest task.

### Fork instead of a cold brief
When the work is self-contained but would need so much of this conversation's background that the brief becomes a re-telling of the session, use a fork instead: the Agent tool with `subagent_type: "fork"` (or `/subtask <task>`). A fork inherits the whole conversation, so it needs no brief beyond the task itself plus the brief lines, and only its final result comes back. A fork always runs on the session's model, so prefer a cold brief to a cheaper tier whenever the background fits in a few paragraphs.

### Inverse anti-pattern check
Even if a justification criterion applies, refuse cold-prompt generation when the work needs main-thread context:

- The task requires mid-flight back-and-forth with Bean (design iteration, scoping questions)
- The task depends on conversation history the cold subagent cannot see (referring to "what we just discussed", referencing decisions made earlier in this turn)
- The task is exploratory (no clear deliverable; the value is in the dialogue)

If any of those apply, STOP. Tell the caller: "This work needs main-thread context — keep inline. Subagents lose the thread on this shape."

**Thin-brief probe (mandatory pre-step).** Before checking the three criteria above, evaluate whether the brief is rich enough to even apply them. If the brief is shorter than ~30 words OR the deliverable is not precisely named OR the success condition is implicit, ask the caller ONE clarifying question first (e.g. "Does this need any back-and-forth with Bean to define, or is the deliverable settled enough to dispatch cold?"). Don't run the inverse criteria as a passive pattern-match — when in doubt, probe, then check.

### Parallelism auto-detect
Before drafting a single cold prompt, scan the caller's brief for 2+ task descriptors (numbered list, "and also", multiple deliverables, "in parallel"). If detected, route to `/dispatching-parallel-agents` instead of writing N cold prompts inline. The wrapper skill knows how to dispatch multiple `Agent` calls in a single message so workers run wall-clock parallel — that's the operational payoff.

<!-- dispatch-graph-validator: ignore sonnet -->
<!-- dispatch-graph-validator: ignore Agent -->
<!-- dispatch-graph-validator: ignore parallel-subagents-over-surface-switch -->

### Stage 1.5 — Parallel-Dispatch Routing (when 2+ independent tasks)

If the dispatch is justified AND there are 2+ independent tasks, do NOT write N separate cold prompts inline — instead route the caller to `/dispatching-parallel-agents`, which dispatches multiple `Agent` calls in a single message so the workers run wall-clock parallel.

Operational payoff:

- **Throughput-of-N.** Up to three parallel Sonnet workers from one parent give roughly the throughput of three sequential sessions. They run wall-clock in parallel; the parent pays the dispatch cost and reads each report, so keep reports short and stay within the fan-out budget.
- **Parent stays available.** While workers run, the Opus parent stays free to coordinate the flow, plan, park items, and interleave with the user. A "fresh session at a different model tier" loses this concurrency entirely AND would convert every concurrent Opus session via surface-global model switching.

**Anti-pattern caught here:** writing the cold prompt and telling the caller "go run this in a fresh /sonnet session." That recommendation flips every other Opus session Bean has open. Default to `Agent({model: "sonnet"})` parallel dispatch from the current session unless the work genuinely needs Sonnet's full conversation context (mid-flight back-and-forth design iteration).

When a dispatched worker hits a permission block on new-file creation, the calling session absorbs the work directly rather than waiting on a permission round-trip — other workers keep running.

## Stage 2 — Choose the Model and Effort (via `/delegate`)

Build the task descriptor from the justification in Stage 1 and the expected input and output sizes, then route: `python .claude/skills/delegate/scripts/route.py route --task-shape <shape> ...`. Mark `--code-only --expected-minutes N` when the work needs nothing outside GitHub, so long jobs can go to a cloud session.

Announce the result in the dispatching session: *"Using `<primary_model>` at `<effort>` effort for `<task>`. Criterion: `<a/b/c/d/e>`. Fallback chain: `<fallback_chain>`."* Dispatch with the returned `primary_command`, which carries the effort.

**Do NOT re-implement model selection inline.** If a task shape isn't in the routing table, extend `routing-table.json` rather than hardcoding here. Sonnet is the default for coding, debugging and review, including multi-file work; Haiku only for bounded lookups and exact-spec edits; Opus for hard self-contained reasoning.

When the `/delegate` answer contains `requires.report_back_inline: true`, honour the Named Observable Behaviours (summarise findings inline before any file write; no `*-v2.md`/`*-revised.md` without Bean's accept/reject/counter-propose).

## Stage 3 — Write the 6 Base Sections

Every cold prompt has these 6 sections in this order. Each is one paragraph or a short list.

### 1. Role
One sentence naming who the subagent is for this task. Example: "You are a Python CLI builder mirroring an existing skillscore pattern."

### 2. Task
One sentence naming the deliverable. Example: "Build docscore.py at the listed path, producing a scorer that mirrors skillscore with 4 tiers."

### 3. Context
All the background the subagent needs — because it has no memory of the originating conversation:
- File paths the subagent should read first
- The originating problem in 2-3 sentences
- Prior decisions that shape the work
- Known pitfalls from the domain
- **The project rules that matter for this task, restated.** A subagent gets its own system prompt, not Claude Code's, and may not load CLAUDE.md (the built-in Explore and Plan agents skip it). If a rule matters (UK English, no inline styles, commit by explicit pathspec, never deploy), say it here.
- For a cloud session: the branch to start from, and the full text of any skill or rule from `~/.claude` the work relies on, because a cloud session sees only GitHub.

### 4. Instructions
Open with the `brief_must_include` lines from `/delegate`, word for word:

1. "Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."
2. "Match your checking to the risk: a low-risk change needs one real check that exercises it, not layers of review."
3. "Return only what the caller needs: findings or results with file paths, no narrative of what you did."

Then the step-by-step. Numbered. Each step is one action the subagent performs. Include:
- Exact paths to read
- Exact paths to write
- Commands to run
- One verification command at the end that exercises the result (a test, the changed command, a grep). Do not ask for a second verification layer on top: current models check their own work, and stacked checks are what turn a ten-minute job into an hour.

### 5. Output
Explicit format of what the subagent returns, with a size cap (for example "under 200 words" or "at most 15 findings"). The main session reads every report, so long reports cost more than the subagent did. One of:
- File(s) created at listed paths, plus a one-line summary
- A single summary line in a specified format
- A JSON payload with named fields
- Findings as `path:line — one-line note`

### 6. Criteria
Acceptance criteria the subagent uses to self-check before finishing, **sized to the risk**:
- **Code that ships, or high-stakes work:** the four-layer test block **Happy / Edge / Fail / Integration**, the same shape as `/spec-writer`, `/phase-planner` and `/strategic-plan` use. No layer may be blank or "TBD"; "standalone" or "n/a — [reason]" is permitted when a layer genuinely does not apply.
- **Lookups, research, reviews and low-risk edits:** one or two lines saying what a correct result looks like. A four-layer block here only makes the subagent invent checks.
- Required score thresholds, sections or headings, where they apply
- UK English, no emojis

HARD GATE: the Stage 5 self-review rejects a prompt for shipped code or high-stakes work whose Criteria omits one of the four layers.

## Stage 4 — Add Key Judgement Calls (high-stakes only)

Append a 7th section "## Key Judgement Calls" at the END (after Criteria) for these cases:
- Design specs that shape multi-week work
- Architecture plans touching more than one system
- Irreversible decisions (data migrations, schema changes, production writes)
- Multi-file refactors
- Overnight autonomous work where Bean is asleep

KJC format per decision:
```
Decision: [one sentence]
Options: A / B / C
Recommendation: B
Why: [one sentence reasoning]
Cost of wrong choice: [one sentence blast radius]
```

2-4 decisions per KJC section. Less than 2 means the section is not needed; more than 4 means the prompt is too broad — split the work.

### Record of a high-stakes prompt
High-stakes prompts (KJC-required ones) are expensive to derive, so a written one must not be paraphrased away: paste the full prompt verbatim into the session output when it is accepted, so the transcript is a reusable, diff-able record of what was dispatched against irreversible work. If Bean wants it kept beyond the session, write it to a file he names.

## Stage 5 — Self-Review Before Dispatch

Before sending, check the prompt against these 8 rules:

1. **Specific paths not vague references** — "read `C:/…/skillscore.py`" not "read the skillscore"
2. **Pitfalls up front** — include known corrections so the subagent avoids them from the first token
3. **Output format explicit** — the subagent never has to guess the shape of a return
4. **Retries/iterations capped** — "max 2 revision passes" prevents runaway loops
5. **One verification step included** — the prompt ends in one command that exercises the result, with no second verification layer stacked on top
6. **Criteria sized to the risk** — shipped code and high-stakes work carry all four layers (Happy, Edge, Fail, Integration; no blank, no "TBD"); lookups, research, reviews and low-risk edits carry a one- or two-line success condition. This rule enforces the §6 HARD GATE.
7. **Brief lines present** — the three `brief_must_include` lines open the Instructions word for word
8. **Output capped** — the Output section names a size limit

If any rule fails, revise before dispatch.

## Worked Example

For a Sonnet dispatch (medium effort) building a scorer script that will ship:

```
Role: You are a Python CLI builder mirroring the sgs-skillscore pattern.
Task: Build docscore.py at C:/Users/Bean/.agents/skills/shared-references/docscore.py.
Context: Doc-templates live at ./doc-templates/. Each template's frontmatter defines required_sections, max_lines, freshness_days. The scorer reads a project doc, detects its doc_type, loads the matching template, and scores it on 4 tiers: Structural 40% / Completeness 30% / Quality 20% / Freshness 10%. Pattern mirror: sgs-skillscore.py (same directory). Rules: UK English in all messages; standard library only.
Instructions: Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better. Match your checking to the risk: a low-risk change needs one real check that exercises it, not layers of review. Return only what the caller needs: findings or results with file paths, no narrative of what you did. (1) Read sgs-skillscore.py lines 1-200 for structure. (2) Read 3 doc-templates to understand the shape. (3) Write docscore.py with the 4-tier rule registry. (4) Test on CLAUDE.md with --type claude-md.
Output: File written at the named path. One summary line "docscore.py written — N lines — test passes: Y/N".
Criteria:
  Happy:       ast.parse succeeds; --list-types lists all 17 doc types; running on a real file produces a grade and exit code 0
  Edge:        unknown doc_type input → exit code 2 with a named-error stderr line, not a stack trace
  Fail:        missing template file → graceful "template not found: <path>" message + exit code 3, not a Python KeyError
  Integration: skillscore PostToolUse hook still passes after this scorer is added to the same shared-references directory (no regex collision with skillscore's grade output)
```

## SGS-BEM Convention

Every cold prompt this skill produces or dispatches MUST require the SGS-prefixed BEM convention (`sgs-<block>__<element>--<modifier>` (class-attribute form; the dot appears only in CSS selectors)) when the dispatched task emits class names. Without explicit injection, subagents fall back to training-default ad-hoc-semantic (e.g. `.hero-section`, `.cta-button`) and the recogniser pipeline silently drifts off-canonical.

Validation regex: `^sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`. The `/sgs-clone` Stage 0 pre-flight gate hard-rejects non-conforming drafts on production runs.

Canonical reference: `.claude/specs/00-naming-conventions.md` §3.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Dispatching when inline is faster | Stage 1 check catches this — STOP if no criterion applies |
| Fanning out wide | Stage 1 fan-out check: at most 3 at once, about 12 a session |
| Leaving out the brief lines | Stage 5 rule 7 — the pacing line is what stops a subagent spending an hour on a ten-minute job |
| A four-layer test block on a lookup | Size Criteria to the risk; lookups get a one-line success condition |
| Asking for a verification layer on top of the subagent's own check | One real check is enough; stacked checks multiply time |
| Uncapped report length | Name a size limit in Output |
| Vague context section | Include exact paths and prior decisions, not "as discussed" |
| No verification step | Every prompt ends in a check command — no exceptions |
| Missing KJC on high-stakes work | Stage 4 is mandatory for irreversible or multi-file work |
| Too many decisions in KJC | More than 4 means the prompt is too broad — split it |
| Prompt wraps main-thread work | Main-thread tasks should be written directly, not cold-prompted |
