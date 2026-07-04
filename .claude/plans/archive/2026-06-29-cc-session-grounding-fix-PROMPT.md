---
doc_type: next-session-prompt
project: claude-code-harness (global ~/.claude/) — NOT small-giants-wp pipeline
thread: session-grounding / anti-doom-loop
generated: 2026-06-29
primary_goal: "Kill the recurring Claude Code doom-loop (cold start → guess-not-fact-find → freestyle past the spec → hollow 'structural fix' promise → punt to a fresh session that repeats it). ROOT-CAUSE it with /systematic-debugging FIRST, VALIDATE the proposed fix-shapes with /qc-council BEFORE building, then build the highest-leverage durable enforcement (a SessionStart spec-injection hook + a runnable pre-flight check + an independent close/commit oracle gate). Fixes target the GLOBAL ~/.claude/ harness, not the small-giants-wp converter."
---

# Session-grounding fix — kill the doom-loop (root-cause → validate → build)

Invoke `/autopilot` before anything else.

## ⛔ THE METHOD IS THE POINT (Bean directive)
Do NOT jump to building hooks. This prompt itself was produced because "I'll do better / structural fix not I'll-try-harder" promises never persist. So:
1. **`/systematic-debugging` FIRST** — root-cause the doom-loop against real evidence (this session's transcript + prior handoffs), don't patch symptoms. Iron-law gate: no fix before the root cause is named + verified.
2. **`/qc-council` SECOND** — validate every proposed fix-shape against an empirical baseline BEFORE building it: does the hook actually FIRE on the target? does it BLOCK the specific failure? what is its false-positive/friction cost? (A council finding is a hypothesis — fact-check it.)
3. **Build only the GO fix-shapes**, highest-leverage first, each with its own verification (prove the failure path, STOP-16).

## The problem (symptoms, observed repeatedly incl. the 2026-06-28/29 session)
1. **Cold start** — the agent skims a handoff *summary* and starts acting WITHOUT reading the governing spec (Spec 31 here was read hours in, after building the wrong thing).
2. **Guess-not-fact-find** — on hitting a gap, it hallucinates to fill it instead of querying the code/DB/spec.
3. **Freestyle past the spec** — the spec is written to be the implementation plan + DB reference, yet gets ignored in part/whole, then read late, then the day's self-inflicted damage is fixed, tiny progress, punt to a fresh session → loop.
4. **Hollow promises** — "structural fix, not I'll-try-harder" is itself session-local and never persists.

## The diagnosis (from a 2026-06-29 deep-research pass — VERIFY it with /systematic-debugging, don't trust it)
The setup is strong but its defences are **advisory-at-session-start and prose-shaped**, while the failures happen **mid-turn at the moment of acting**. Prose rules degrade ("instruction compliance decreases as instruction count increases"; compaction summarises rules into oblivion). The SOTA fix is moving enforcement from *session-start hope* → *point-of-action gates*, and from *facts stored* → *behaviour compiled into runnable checks*.

## Full gap-analysis (ranked by impact; each: gap · SOTA fix · CC step · source)
| # | Gap (what's missing vs SOTA) | SOTA fix | Concrete CC step | Source |
|---|---|---|---|---|
| **1** | No SessionStart hook force-injecting the governing spec pointer + "you haven't read the spec — read Spec NN §X before acting". Spec/STOP-catalogue live in files Claude *chooses* to read. | Deterministic SessionStart injection (a discrete message weighted like user input, compaction-immune). | `SessionStart` hook in settings.json emitting ~300 tokens read from `state.md`/`next-session-prompt.md`: current spec id + section, the single next action, and an explicit "read the spec section before any engine edit". | anthropic.com/engineering/effective-context-engineering-for-ai-agents · mindstudio.ai session-start-hooks |
| **2** | Evidence gate blocks *editing* but nothing blocks *closing/committing* without an INDEPENDENT oracle pass → wrong work reaches "punt to fresh session". | Spec-derived execution oracle + executable acceptance criteria; validator-assistance, NEVER self-judging. | A Stop/commit hook running an INDEPENDENT oracle (live DOM/DB vs the spec's stated values) that blocks close until it passes; assert the *specific* spec-critical values, not an averaged score (aggregation-hazard). | agentpatterns.ai/verification/spec-derived-execution-correctness-judging · arxiv 2509.18970 |
| **3** | Lessons stored as FACTS (`feedback_*.md`), not compiled into RUNNABLE pre-flight checks → promises don't persist. | Procedural memory: distil recurring failures into executable subroutines/checklists. | The SessionStart hook RUNS a pre-flight script printing PASS/FAIL for the top STOP patterns ("spec section cited? next action identified? oracle command known?"); a fail prints the remediation. | arxiv 2508.06433 (Mem^p) · arxiv 2509.02547 (Reflexion ephemerality) |
| **4** | No tool-forced grounding at the point of a gap → guessing. | Cite-or-abstain / tool receipts. | Extend the evidence gate: any turn asserting a fact about the DB/schema/spec must carry a tool-call receipt that turn, else block; + CLAUDE.md "if a fact isn't in a tool receipt this turn, abstain and fetch it". | arxiv 2603.10060 (tool receipts) |
| **5** | Handoff is a SUMMARY the agent skims, not spec POINTERS. | Per-task spec feed (spec-kit/Kiro); the "spec trap". | First executable line of `next-session-prompt.md` is a command that OPENS the exact spec section; handoffs carry pointers (file+section), not summaries trusted in lieu of reading. | github/spec-kit · martinfowler.com/articles/exploring-gen-ai/sdd-3-tools · the-main-thread.com/p/spec-trap-agent-work |
| **6** | Cold-start "understand the spec/DB" pollutes the main thread. | Sub-agent context isolation returning a 1–2k-token distilled brief. | Route cold-start understanding through an `Explore` sub-agent that returns a distilled spec-state brief; keep the main thread spec-anchored + clean. | anthropic.com/engineering/effective-context-engineering-for-ai-agents |

## Proposed solution (my recommendation — TAKE IT TO /qc-council BEFORE building)
**Highest leverage, build first: GAP 1 + GAP 3 combined — a SessionStart hook that BOTH injects the spec pointer AND runs a pre-flight check.** Rationale: every other failure is downstream of the cold start; this is the cheapest (one hook reading existing `state.md`), zero blast radius (injects context, blocks nothing), and converts the most-critical 300 tokens from an optional file into a user-weighted in-window message + a runnable check. Then:
- **GAP 2** (second build) — an independent close/commit oracle gate (reuse the project's existing draft-vs-clone LANDED oracle); asserts specific spec-critical values, not a score.
- **GAP 4** — extend the *already-hardened* `sgs-evidence-gate.py` (this session: it now covers `.py`, demands a `spec=` citation on the converter surface, and ignores tool-result boundary entries) toward cite-or-abstain (tool receipt required for factual claims).
- **GAP 5/6** — restructure `next-session-prompt.md` to lead with a spec-opening command; route cold-start understanding through an `Explore` sub-agent.

**Seed already in place (this session):** `~/.claude/hooks/sgs-evidence-gate.py` was hardened + de-bugged (cover `.py`; converter surface requires `spec=22|31`; the genuine-user boundary ignores tool-result entries). That is the GAP-4 foundation to extend, and the proof that point-of-action enforcement is the right axis.

## /qc-council questions to ask on each proposed fix-shape (before building)
- Does the SessionStart hook actually FIRE every session, and is its injected content treated as user-weighted (not skippable)? What's the token cost vs the 200–500 budget?
- Does the pre-flight check have a FALSE-PASS path (says grounded when not)? Prove the fail path.
- Does the close/commit oracle assert SPECIFIC spec values (not an averaged score that passes 90/100 while failing the one load-bearing case — the aggregation hazard)?
- Is the oracle INDEPENDENT (live DOM/DB), or does it let the agent grade its own work?
- Friction cost: does the cite-or-abstain extension block legitimate turns? (The evidence gate already taxes every converter edit — measure before adding more.)

## Skills to invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/systematic-debugging` | FIRST substantive step — root-cause the doom-loop against real transcript evidence before ANY fix |
| `/qc-council` | validate every proposed fix-shape vs an empirical baseline before building (GO/NO-GO + must-fix) |
| `/research` (+ `/library-docs`) | any unfamiliar hook/SDK mechanism; the sources above are starting points, not gospel |
| `/capture-lesson` | when the root cause is named, capture it as a RUNNABLE check (GAP 3), not just a feedback file |
| `/handoff` | session close |

## Tooling
| Tool | For |
|------|-----|
| `~/.claude/hooks/sgs-evidence-gate.py` | the seed enforcement (read it — it's the GAP-4 base + the boundary-detection pattern) |
| `~/.claude/settings.json` | where SessionStart / Stop / PreToolUse hooks wire |
| Claude Code hooks docs (`/library-docs` or code.claude.com/docs) | SessionStart + Stop + PreToolUse contracts (decision/block, transcript_path, the user-weighting of injected SessionStart content) |
| `.claude/state.md` (per project) | the source the SessionStart hook reads for the spec pointer + next action |

## Success criteria
- Root cause of the doom-loop NAMED + verified against real evidence (not assumed).
- Each built fix-shape passed `/qc-council` GO + has its failure path proven (STOP-16).
- A fresh session, with the SessionStart hook live, demonstrably starts spec-anchored (the spec section is in-window before the first action) — verified by inspection of a new session's opening turn.
- No new gate adds false-positive friction that blocks legitimate work (measured, not assumed).

## Guardrails
These fixes touch the GLOBAL `~/.claude/` harness (hooks/settings) — outward/hard-to-reverse; design-gate via `/qc-council` + Bean approval BEFORE wiring anything that blocks. Hooks that only INJECT (GAP 1) are zero-blast and can ship first. Hooks that BLOCK (GAP 2/4) need the council + a measured false-positive check. Prove every gate's failure path before claiming it's enforced (STOP-6: a gate that exists but isn't wired-to-something-that-runs protects nothing).
