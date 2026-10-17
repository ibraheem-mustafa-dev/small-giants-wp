# Council Mode

A small panel of personas, each with its own angle, researches a design question independently, presents a position with evidence, then answers the others' positions once. The main session synthesises what they agree on and what is still open, and Bean decides.

Use it at design mode Stage 3 when a decision is worth more than one view: several viable approaches, a choice that is costly to undo, or a question where Bean wants the strongest case on each side. Skip it when one approach is plainly right or the choice is cheap to reverse; 2-3 approaches with a recommendation is enough there.

It is not `research-council`. That skill runs a formal survey of 10 or more sources with scoring and a Council Head; use it when the question is "what is true" across a wide field. Council mode answers "which way should we build this" for one decision.

## Cost

Three subagents per council, one debate round. That is three dispatches against the session's fan-out budget (`/delegate`: 3 at once, about 12 a session). Never seed more than three personas.

## Step 1 — Frame the decision

Write the decision in one sentence, the 2-3 candidate approaches (or "open: propose your own"), the constraints that bind (budget, deadline, the framework rules in `CLAUDE.md`), and what success looks like. Show Bean the frame in three lines and continue unless he changes it.

## Step 2 — Pick three personas

Each persona has a different angle and must be able to bring its own evidence. Default trio:

| Persona | Angle | Researches |
|---|---|---|
| **Builder** | What is quickest to build well and easiest to maintain in this codebase | The repo: existing patterns, similar features, the files a change would touch |
| **Sceptic** | What will go wrong: failure modes, hidden costs, the case against each option | Counter-evidence: issue trackers, "X problems", post-mortems, the repo's own past failures (`git log --grep`) |
| **User advocate** | What the end user and the client (a restaurant, a wedding planner, a law firm) actually experience | Accessibility, performance budget, editor experience, what competitors ship |

Swap a persona for a domain one when the decision calls for it (for example **Security** for an auth change, **Performance** for a rendering change). Keep the Sceptic.

## Step 3 — Dispatch the three in parallel

Route with `/delegate` (`--task-shape persona_panel`, which returns Sonnet; use `--high-complexity` for the Sceptic on an architecture or security decision, which returns Opus). Dispatch all three in one message so they run at the same time. Each brief carries:

- The `/delegate` brief lines, word for word: "Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better." / "Match your checking to the risk: a low-risk change needs one real check that exercises it, not layers of review." / "Return only what the caller needs: findings or results with file paths, no narrative of what you did."
- The decision frame from Step 1 and the persona's angle.
- Research instructions for its angle (the column above), with a cap: at most 8 searches or file reads that matter.
- The return shape, under 300 words: **Position** (which approach, or a new one, in one sentence) / **Evidence** (3-5 points, each with a source: `path:line`, a URL, or a commit) / **Biggest risk of my own position** / **What would change my mind**.

Give each persona a name when you dispatch it (the Agent tool's `name`), so Step 4 can message it.

## Step 4 — One debate round

Send each persona the other two positions with SendMessage to its name, which keeps its context, rather than dispatching new agents. Ask, under 150 words:

1. Final stance: **Reinforced**, **Pivoted** (to what), or **Conceded** (to whom)?
2. One challenge to another persona's position, with evidence.
3. One point from the others you now agree with.

Run a second round only when two personas still hold incompatible positions and each has evidence the other has not answered. Never more than two rounds.

## Step 5 — Synthesise for Bean

The main session writes it, in this order:

1. **Agreed** — what all three now accept, in plain English.
2. **Still open** — each remaining disagreement as one line per side with that side's best evidence.
3. **Recommendation** — one approach, why in one sentence, and what it gives up.
4. **Decision for Bean** — the one question he needs to answer, if any.

Then continue at design mode Stage 4 with the chosen approach. Nothing is built or written into a spec until Bean has chosen.
