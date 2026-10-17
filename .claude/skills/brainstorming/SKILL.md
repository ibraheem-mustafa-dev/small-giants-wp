---
name: brainstorming
description: >-
  This skill should be used when turning ideas into designs (design mode) or
  thinking through a problem without convergence pressure (exploration mode).
  Triggers on: feature planning, design before implementation, spec writing,
  "help me think through", "explore this idea", "brainstorm". Design mode
  triggers: "design", "spec", "plan this", "build". Exploration mode triggers:
  "explore", "think through", "help me think about". Design mode: structured
  dialogue to produce a spec and invoke strategic-plan. Exploration mode: open
  questioning, insight tracking, no spec output, no solutions until user exits. When options already exist and need a decision, use brainstorming in design mode with the options as the starting spec. Do NOT invoke for:
  `strategic-plan` (implementation planning after design), `research-buddies`
  (evidence gathering before options exist).
---

# Brainstorming — Design Mode and Exploration Mode

**Type:** Discipline

## Goal

A fully formed, user-approved design spec ready for strategic-plan (design mode) — or a structured insight log capturing discoveries, connections, and open questions from open-ended exploration (exploration mode).

## Load-bearing principle — verify the premise before designing (read first)

Brainstorming converges on a solution; if the PROBLEM, its CAUSE, or a load-bearing fact is **assumed rather than proven**, the result is an excellent solution to the wrong problem — the single most expensive failure in planning. Before converging on any approach:

- **Verify the premise/cause is real and proven** — not the first plausible story. `"not cause A"` is never "therefore cause B"; ruling out one cause does not promote the next suspect to "the cause".
- **Surface every load-bearing assumption** the design rests on and mark each PROVEN vs ASSUMED. An assumed premise is a design *risk* to flag and test, not a foundation — state assumptions to the user explicitly.
- **Fact-check claims** — the author's, the user's, and any source's — against ground truth before building on them. Own outputs, counts, and recollections are hypotheses, not facts (re-read the exact value; match value↔key).
- A design built on an unproven cause is a guess wearing a spec's clothes. When the premise cannot be cheaply proven, design a **premise-agnostic** option, or make "prove the premise" the first step of the plan.

Global rule: `~/.claude/rules/prove-the-cause-before-fix.md`. In design mode this gates Stage 3 (Propose Approaches); in exploration mode it means never accepting a premise uncritically.

## How to start

| What you say | What happens |
|-------------|-------------|
| `/brainstorming` | Asks which mode you want |
| `/brainstorming design [topic]` | Goes straight into design mode |
| `/brainstorming explore [topic]` | Goes straight into exploration mode |
| Called by another skill or a headless run | Defaults to design mode, no question asked |

## When NOT to use

- When a design is already approved and implementation planning is next — use `strategic-plan`
- When evidence needs gathering before options exist — use `research-buddies` or `research-council`
- When auditing existing code for quality — use `/code-review`
- When code is already being written for this topic — brainstorming mid-implementation derails in-progress work
- When design-mode produces two or more proposed fix shapes that need empirical validation before implementation — exit design mode and route to `/qc-council` (validates each proposed fix against a measured baseline before subagent dispatch). Brainstorming converges on options; qc-council proves which options actually move the metric.

Two modes. Select at invocation or when prompted.

<HARD-GATE id="mode-selection">
When invoked without an explicit mode flag, ask before proceeding:
> "Design mode (turn this idea into a spec) or exploration mode (think it through without being pushed toward solutions)?"
Wait for the response. Do not assume a mode.

**Autonomous invocation:** When invoked with `/brainstorming design [topic]` or `/brainstorming explore [topic]`, skip this gate and enter the specified mode directly. When invoked by another skill (e.g., `innovative-design`) or by an autonomous agent, default to design mode — do not prompt for mode selection.
</HARD-GATE>

### Autonomous Invocation

When invoked by another skill or autonomous agent, callers should pass a JSON context block. See `references/autonomous-invocation.md` for the schema and behaviour rules.

---

## Mandatory References

Before starting, read: `references/shared-references/communication-standards.md` — plain English output rules for all user-facing content.

## Design Mode

Turn ideas into fully formed designs and specs through natural collaborative dialogue.

**Stages:** Explore → Questions → Approaches → Design → Spec → Review → Approve → Invoke strategic-plan

<HARD-GATE id="design-gate">
Do NOT invoke any implementation skill, write any code, set up any project structure, or take any implementation action until a design has been presented and the user has approved it. This applies to every project regardless of perceived simplicity.
</HARD-GATE>

### Design Mode Checklist

Complete each stage in order:

### Stage 0 — Explore Context
Check files, docs, and recent commits before asking anything.

### Stage 1 — Offer Visual Companion
If the topic will involve visual questions, offer the companion in its own message. See Visual Companion section.

### Stage 2 — Clarifying Questions
Ask one question at a time. Focus on purpose, constraints, and success criteria.

### Stage 3 — Propose Approaches
Offer 2-3 approaches with trade-offs and a clear recommendation.

### Stage 4 — Present Design
Present in sections scaled to their complexity. Get user approval after each section.

### Stage 5 — Write Design Doc
Save to `./specs/YYYY-MM-DD-<topic>-design.md` and commit.

### Stage 6 — Spec Review Loop
Dispatch spec-document-reviewer subagent with precisely crafted review context (never the session history). Fix issues and re-dispatch until approved. Max 3 iterations, then surface to human.

### Stage 7 — User Review Gate
Ask the user to review the written spec before proceeding.

### Stage 8 — Transition to Implementation
Invoke the strategic-plan skill to create the implementation plan.

### Process Flow

1. Explore context → 2. Offer visual companion (if visual) → 3. Ask clarifying questions → 4. Propose 2-3 approaches → 5. Present design sections → 6. User approves? (if no, revise) → 7. Write spec → 8. Spec review loop (max 3 passes) → 9. User reviews spec? → 10. Invoke strategic-plan

**The terminal state is invoking strategic-plan.** Do NOT invoke frontend-design, mcp-builder, or any other implementation skill. The ONLY skill invoked after brainstorming is strategic-plan.

### The Process

See `references/design-process.md` for detailed guidance on understanding ideas (scope assessment, breaking large projects into smaller pieces), exploring approaches, presenting designs, and working in existing codebases.

### After the Design

**Documentation:**

- Write the validated design (spec) to `./specs/YYYY-MM-DD-<topic>-design.md` relative to the current working directory. If the `specs/` directory doesn't exist, create it. If the write fails for any reason, skip the save and go directly to User Review Gate
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit the design document to git (skip commit if no git repo is active)

**Spec Review Loop:**

1. Check for `spec-document-reviewer-prompt.md` (in this skill's root directory). If not found, skip this loop and go directly to User Review Gate
2. Dispatch spec-document-reviewer subagent with precisely crafted review context (never the full session history)
3. If issues found: fix, re-dispatch, repeat until approved
4. If loop exceeds 3 iterations, surface to human for guidance

**User Review Gate:**

> "Spec written and committed to `<path>`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

Wait for the user's response. Only proceed once the user approves.

**Implementation:**

Invoke the strategic-plan skill to create a detailed implementation plan. Do NOT invoke any other skill.

### Visual Companion

When upcoming questions will involve visual content (mockups, layouts, diagrams), offer the browser companion once for consent. **This offer MUST be its own message** — don't combine with questions. Full detail: `skills/brainstorming/visual-companion.md`

---

## Exploration Mode

Think through complex problems without convergence pressure. Ask before answering. Discover rather than conclude.

<HARD-GATE id="exploration-gate">
Do NOT propose solutions, present approaches, suggest implementation paths, or apply any convergence pressure. Stay in question-and-discover mode until the user says one of the exact exit phrases listed below. Periodic summary prompts are allowed — but they must not imply a direction or suggest moving forward unless the user has used an exit phrase.
</HARD-GATE>

### Core Behaviours

1. **Ask before answering** — lead with questions that clarify and deepen understanding, not with answers
2. **Track insights as you go** — keep a running list of what surfaces: discoveries, open questions, and contradictions. For each, note how it connects to or contradicts what's already been said, so the threads and tensions stay visible rather than a flat undifferentiated log
3. **Resist solutioning** — if a solution impulse arises, convert it to a question instead ("What if it worked like X?" rather than proposing a solution)
4. **Connect ideas** — identify patterns and relationships across different threads. For each new insight, check: does it connect to anything already surfaced? Does it contradict anything?
5. **Surface assumptions** — gently challenge implicit beliefs: "That assumes X is fixed — is it?"

### Exploration Workflow

1. Acknowledge the topic without framing it as a problem to solve
2. Ask 3–5 opening questions — one at a time
3. As the conversation develops, track discoveries, questions, and contradictions as they surface, noting how they relate to each other
4. Every 4–5 exchanges, offer a periodic summary:
   > "Here's what's emerging: [the 3-5 most promising threads]. The richest one so far is [X]. Open tensions: [any contradictions]. What else should we dig into?"
5. Stay in exploration until an exit phrase is detected
6. On exit, carry the surfaced insights forward into design mode (or write a short markdown summary if the user wants a standalone record)

### Worked Examples

- **Exploration mode:** See `references/exploration-example.md` — opening questions, insight tracking after 5 exchanges, periodic summary format
- **Design mode:** See `references/design-example.md` — all 8 stages from opening through spec approval and strategic-plan invocation

### Key Prompts

Use these to deepen thinking, not to direct it:

- "What's behind that thought?"
- "How does this connect to [something else mentioned]?"
- "What would the opposite look like?"
- "What's the real challenge here?"
- "What are we not considering?"

### Exiting Exploration Mode

<HARD-GATE id="exploration-exit">
Only exit exploration mode when the user's message contains one of these exact phrases as a substring (case-insensitive):
- "ready to design"
- "let's design this"
- "move to design mode"
- "start the design"
- "let's build this"
- "ready to move forward"

On detecting an exit phrase, confirm: "Switching to design mode." Then begin the Design Mode Checklist from Stage 0. The insights from exploration carry forward — skip Stage 0 (context exploration) since it was already covered during the exploration session.

**Decision table:**

| User says | Action |
|-----------|--------|
| "I'm ready to design this feature" | EXIT — contains "ready to design" |
| "Let's build this thing" | EXIT — contains "let's build this" |
| "I'm ready to move forward now" | EXIT — contains "ready to move forward" |
| "I think we should build something" | STAY — no exact phrase match |
| "Maybe we could design it differently" | STAY — no exact phrase match |
| "Let's think about building" | STAY — "let's build" is not "let's build this" |

Do NOT exit on: forward-looking statements, "I think we should", "maybe we could", or any model-interpreted signal. Only the exact phrases above trigger the transition.
</HARD-GATE>

---

If a run exposes a new, non-obvious failure in how this skill works, add it as one line to Common Mistakes below; a project-specific lesson goes to that project's auto memory.

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Skipping mode selection | Always ask or confirm mode at invocation — never assume |
| Applying convergence pressure in exploration mode | Convert every solution impulse into a question |
| Combining visual companion offer with a question | The offer is its own message. Nothing else in it |
| Invoking any skill other than strategic-plan after design | strategic-plan is the only valid next step |
| Treating "simple" projects as exempt from the design gate | No exceptions. Short design is fine; no design is not |
| Exiting exploration mode on any forward-looking statement | Only exact exit phrases trigger the transition |
| User says "explore" then immediately asks "so what should I build?" | Stay in exploration. Say: "We're in exploration mode — let me turn that into a question instead. What's drawing you toward building something already?" |
