---
target_type: skill
target_path: ~/.agents/skills/subagent-prompt/SKILL.md
last_reviewed: 2026-04-27
bean_signoff: confirmed
domain: subagent-dispatch
---

# End-Goal Rubric — subagent-prompt

## End-Goal Criteria

| # | Criterion | Weight | 5/5 (end-result) | 1/5 (end-result) |
|---|-----------|--------|-------------------|-------------------|
| 1 | dispatch_justification_gate | 1.5 | The skill has refused a non-qualifying dispatch (or confirmed a valid one), the dispatch criterion is named explicitly in the session, and no prompt is produced for unjustified work — the gate is structurally enforced, not advisory | A cold prompt is produced without any criterion check; the caller has no record of why dispatch was chosen; the gate is documented but phantom |
| 2 | cold_subagent_first_attempt_success | 1.5 | The produced prompt is self-contained enough that a cold subagent — with zero access to the originating conversation — completes the task on first try without follow-up questions; all required paths, prior decisions, and pitfalls are baked in | The subagent asks clarifying questions, misses files, or produces output that needs re-prompting; context gaps in the prompt force at least one correction round-trip |
| 3 | four_layer_acceptance_test | 1.5 | Every produced prompt's Criteria section contains a populated Happy / Edge / Fail / Integration block — no blank layer, no "TBD" — and the Stage 5 self-review gate has rejected the prompt if any layer was missing | The Criteria section is present but one or more layers is missing, blank, or marked TBD; the self-review gate did not catch or enforce it |
| 4 | downstream_consumable_prompt | 1.2 | The prompt is plain-English, jargon-free, and structured so the subagent (or a future session reading the transcript) can act on it without translation; format is explicit, output shape is unambiguous, and verification step is stated | The prompt contains shorthand only the originating session understands, references "what we discussed" without staging the context, or leaves output format implicit |
| 5 | inverse_anti_pattern_refusal | 1.2 | When the work needs mid-flight back-and-forth, refers to live conversation history, or is exploratory with no clear deliverable, the skill has surfaced the inverse anti-pattern and kept the work inline — the thin-brief probe ran first when the brief was under ~30 words | Work that requires main-thread context is dispatched cold; the thin-brief probe was skipped; a prompt is produced for an exploratory task with no named deliverable |
| 6 | parallelism_routing | 1.0 | When 2+ independent tasks are present, the skill has routed to `/dispatching-parallel-agents` rather than writing N serial cold prompts — the routing decision is stated, not silent | N separate cold prompts are written inline for tasks that could run wall-clock parallel; the parallelism routing step was skipped or the caller is told to open a fresh session |
| 7 | high_stakes_followthrough | 1.0 | High-stakes prompts (design specs, multi-file refactors, irreversible ops, overnight work) have a KJC section with 2–4 named decisions, and the completed prompt appears verbatim in the session output — so it is readable and reusable rather than paraphrased away | High-stakes work ships without a KJC section, or the prompt is only summarised rather than shown in full, leaving no readable record of what was dispatched |
| 8 | model_routing_via_delegate | 0.8 | The model was chosen by invoking `/delegate` (or `route.py` fallback), the result is announced in chat with task + criterion + fallback chain, and no silent upgrade to a more expensive model occurred | The model is chosen inline by the skill without calling `/delegate`; the reasoning is not announced; a more expensive model is silently selected without the routing table's blessing |
| 9 | headless_runnable | 0.8 | The prompt can run unattended in a headless `claude -p` run: it needs no live conversation, interactive tool or session context, and every path in it is absolute | The prompt only works inside the authoring session; it references earlier turns, interactive-only tools, or relative paths a cold run cannot resolve |

## Never Do (runtime / output anti-patterns)

- Never produce a cold prompt when the dispatch-justification check returns no applicable criterion — STOP and tell the caller to run inline.
- Never skip the thin-brief probe when the brief is under ~30 words or the deliverable is not precisely named.
- Never write a prompt whose Criteria section has a blank, "TBD", or missing layer in the Happy / Edge / Fail / Integration block.
- Never silently choose a model — always announce the `/delegate` result before dispatching.
- Never route 2+ independent tasks as N serial cold prompts — route to `/dispatching-parallel-agents`.
- Never produce a KJC-required prompt and then only summarise it — show the full prompt verbatim so it stays reusable.
- Never recommend "open a fresh /sonnet session" when parallel dispatch from the current session is the correct move (lesson id=160: surface-global model switch is an anti-pattern).

## Lens 6 Anchors

The end-goal of this skill is structural: Bean should never have to remember the dispatch decision rule, the 4-layer test requirement, or the model routing hierarchy — the skill enforces all three as hard gates. A session where the gate was bypassed (even if the prompt is otherwise good) is a lens-6 failure because it puts recall load back on Bean. Showing high-stakes prompts verbatim is the compounding mechanism: it converts one well-specified prompt into a template Bean can lift into the next dispatch, so future dispatches start from a known-good baseline rather than deriving from scratch. (The former cross-session prompt store was the discontinued dashboard — removed 2026-08-17.)
