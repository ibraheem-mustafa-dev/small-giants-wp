# Model Routing — Canonical Section

**Shared by:** subagent-prompt, phase-planner, strategic-plan, dispatching-parallel-agents, subagent-driven-development.

Each consumer skill references this file from its own Model Routing section with a one-line pointer. Any change to routing behaviour lands here first; the consumer skills inherit it automatically.

**All-Claude fleet (since 2026-07-15).** Bean uses no models outside the Claude family. The fleet is three tiers: **Haiku** (cheap/mechanical, 200K context, parallel cap 8), **Sonnet** (mid/architectural + 1M context, parallel cap 4), **inline** (the main-thread frontier model — Fable 5/Opus — never dispatched). Capability losses vs the old mixed fleet, accepted by Bean: no offline/local tier (nothing runs without network to Anthropic) and no free tier (cheap = Haiku). Cross-PROVIDER validation became cross-TIER validation — independence comes from a different Claude tier + a COLD context + divergent persona priming, not from a different vendor.

---

**HARD GATE:** Before any Agent dispatch, invoke `/delegate` (Skill tool — preferred) or call `route.py` via Bash (fallback for subagent contexts). Announce the result in chat: *"Using [model] for [task] (via /delegate)."*

Model selection is owned by `/delegate` — the single source of truth at `~/.agents/skills/delegate/data/routing-table.json`. Do NOT re-implement the hierarchy here; call the router and use what it returns. The returned `primary_command` is what to invoke; the `requires` block is what governs post-dispatch behaviour (see Named Observable Behaviours below).

## Strategic-work refusal

If `/delegate` returns `primary_model: inline` for a strategic task shape — `gap_analysis`, `synthesis`, `spec_rewrite`, `research_decision`, `strategic_planning` — **do not dispatch**. Keep the work inline with Bean. The routing table enforces this at priority 110 (higher than any delegation rule), so the answer is a structural refusal, not a text rule.

## Persona-panel and QC shapes

These are the only two delegation shapes allowed for work adjacent to strategic thinking (per 2026-04-18 correction):

- **`task_shape: persona_panel`** — multi-persona breadth work (brainstorming, gap-analysis reviewers, research councils, critique pairs, research-check, research-couple, research-buddies, pr-reviewer, design-review). `/delegate` returns **Sonnet** with `max_parallel: 4`; **Haiku** fallback (cap 8) for large mechanical panels. Each persona is a COLD subagent with a distinct persona prompt — that cold context + divergent priming is what supplies independence. Each persona reports back; main agent synthesises; findings surface inline **before** any auto-apply.
- **`task_shape: qc_review`** — cross-TIER check on finished work. `/delegate` **requires** `original_model` in the request (refuses without it) and routes the reviewer to a **different Claude tier than the author, dispatched cold**: inline-authored work → cold Sonnet reviewer; Sonnet-authored work → inline (main-thread frontier model); Haiku-authored work → Sonnet. Same-tier QC is rejected. QC output surfaces inline; never auto-applied.

## How to route — preferred path (Skill-tool composition)

Invoke `/delegate` via the Skill tool with the task descriptor. The skill calls `route.py`, returns the `primary_model` + `fallback_chain` + `requires` block, and logs the dispatch decision via `log-dispatch.py`. Use the returned answer exactly — never silently upgrade.

## Bash fallback (for subagent contexts without Skill access)

Task shape enum, grouped by category:

- **Strategic (refused by router, stay inline):** `gap_analysis`, `synthesis`, `spec_rewrite`, `research_decision`, `strategic_planning`
- **Allowed delegation (require report-back-inline):** `persona_panel`, `qc_review`
- **Normal (dispatchable per the rules table):** `code_gen`, `classification`, `batch_synthesis`, `code_review`, `research`, `extraction`

```bash
python ~/.agents/skills/delegate/scripts/route.py route \
  --task-shape <strategic|allowed-delegation|normal value from above> \
  --input-size-kb <number> --expected-output-tokens <number> \
  --time-sensitivity <low|normal|high> \
  [--original-model <inline|sonnet|haiku>] \
  [--parallel-count <n>] \
  [--needs-mcp] [--needs-web-search] [--destructive] \
  [--pii-detected] [--contains-secrets] [--jailbreak-signal] [--high-complexity] \
  || echo "route.py failed — fall back to sonnet default for non-strategic work"
```

If dispatch fails at runtime (rate limit, overload, timeout), retry the first entry in `fallback_chain` and log both via `log-dispatch.py`.

## Named Observable Behaviours (replaces "must honour" text rules)

When the `/delegate` answer contains `requires.report_back_inline: true` (persona_panel, qc_review, or any strategic-adjacent shape):

1. **Summarise findings inline in chat** — priority-ordered, one-line remediations per finding — **before any file is written**.
2. **Do not write `*-v2.md`, `*-revised.md`, `*-updated.md`, or synthesis files** without Bean's explicit accept / reject / counter-propose response.
3. **Recovery protocol** (per 2026-04-18 lesson): if a session writes a synthesis file without the inline pause, rename it to `*-draft-by-claude.md` on detection, walk findings through with Bean, write the real synthesis from his decisions.

These behaviours are not hook-audited. There is no automatic flag on filenames matching `*-v\d+\.md`, `*-revised.md`, `*-updated.md`, `*-synthesis.md`, `synthesis-*.md`; watch for these yourself before writing. (The recovery filename `*-draft-by-claude.md` — that rename IS the remediation — applies as a manual convention.)

**`delegate-compliance-scan`** (planned automation-engine flow) — scheduled flow that greps sessions for the flags and reports violators in the morning brief. Not yet shipped; blocks on APScheduler migration.

## Worked example — `persona_panel` dispatch end-to-end

A brainstorming session asks for three perspectives on a design question:

1. **Call /delegate**: `python route.py route --task-shape persona_panel --input-size-kb 4 --expected-output-tokens 1500 --parallel-count 3`
2. **Receive answer**: `{primary_model: "sonnet", fallback_chain: ["haiku"], requires: {report_back_inline: true, max_parallel: 4, synthesise_inline_before_apply: true}, ...}`
3. **Dispatch 3 parallel cold Sonnet agents**, each carrying a distinct persona prompt. Parallel count 3 is under max_parallel 4, so one batch is fine.
4. **Agents return** — each produces a 2-3 paragraph critique.
5. **Inline findings summary** (the Named Observable Behaviour step):
   ```
   Findings from 3 personas (priority order):
   1. Skeptic — "X is underspecified" — remediation: add Y (5 min, +0.2 clarity)
   2. Optimist — "X could lean further into Z" — remediation: explore Z in spec (15 min, S-grade candidate)
   3. User — "X is confusing for first-timers" — remediation: add onboarding step (10 min, +0.3 UX)
   ```
6. **Bean accepts / rejects / counter-proposes.** Only after his response do we write a synthesis file (or skip if he rejects).
7. **Log dispatch outcome** via `log-dispatch.py` for calibration.

## Rules

1. Never silently upgrade to a more expensive model — announce the `/delegate` recommendation before dispatching.
2. The main-thread frontier model (Fable 5/Opus) stays in the main conversation — never dispatched as a subagent (enforced by `routing-table.json`: `inline` is the `primary_model` when `dispatch_justified=false`).
3. Strategic task shapes (`gap_analysis`, `synthesis`, `spec_rewrite`, `research_decision`, `strategic_planning`) are refused by the router — stay inline.
4. Persona-panel and QC dispatches MUST honour the Named Observable Behaviours above — inline findings summary precedes any file write; no `*-v2.md` / `*-revised.md` without accept/reject/counter-propose.
5. Respect `max_parallel_dispatches` per model — Sonnet capped at 4, Haiku at 8.
6. Respect the `fallback_chain` order when the primary fails.
7. Log every dispatch outcome via `scripts/log-dispatch.py` so the calibration feedback loop has data to tune the table.
8. Sensitive content (secrets, PII) stays inline — all providers are Anthropic now, but the main thread minimises copies across subagent transcripts and logs.

## When `/delegate` is unreachable

If both the Skill invocation and `route.py` fail (script missing, table corrupt, Python env broken):

1. Log the failure via `log-dispatch.py` (the log POST is independent of the router).
2. Fall back to **Sonnet** as the default model for non-strategic dispatch work (reliable, 1M context, the quality floor Bean expects) and **Haiku** for obviously mechanical shapes.
3. Notify the user: *"⚠️ /delegate unreachable, using sonnet default. Check routing-table.json parses."*
4. **Never** fall back to dispatching strategic work — stay inline until the router is restored.

---

## Skill-specific notes

Each consumer skill may append skill-specific guidance below the main section in its own SKILL.md. The canonical rules above are inherited verbatim.

- **subagent-prompt:** calls `/delegate route` with the task descriptor, uses the returned `primary_model` + `fallback_chain` to populate the prompt's Model declaration.
- **phase-planner:** calls `/delegate route` per step; aggregates cost estimate using `cost_per_1m_*_tokens` from the routing table.
- **strategic-plan:** calls `/delegate route` for Phase 3 Effort Estimation; Risk Assessment stays inline (always needs the main-thread frontier model).
- **dispatching-parallel-agents:** per-branch routing — each parallel branch calls `/delegate route` independently.
- **subagent-driven-development:** per-subagent template (implementer → code_gen, spec-reviewer → code_review, code-quality-reviewer → code_review).
