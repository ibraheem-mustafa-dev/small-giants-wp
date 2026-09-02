# Detector findings — review, decide, dispatch

**Written 2026-09-02.** Invoke `/autopilot` first.

## How this session runs — read this before anything else

**Dispatch work the moment Bean decides it. Do not batch.**

The previous session made this mistake: it gathered everything, wrote it all up, and left every
fix to the end. Bean's instruction for this session is explicit — the moment he rules on an item,
send a subagent at it and move to the next discussion while that agent works. Discussion and
execution run in parallel.

The loop is:

1. Put one report's findings to Bean with a recommendation.
2. He decides.
3. Dispatch immediately (`/delegate` for the model, `/dispatching-parallel-agents` if the item
   splits into disjoint files).
4. Move to the next report while that agent runs.
5. Verify each agent's work yourself when it returns — `git diff --stat`, re-run the detector,
   read the numbers. **Never trust a subagent's own success report.** Three separate agents
   yesterday reported facts that contradicted their own evidence.

Bean is QC. Bring him decisions, not homework.

---

## First action

`git status`, then `git log --oneline -8`. Confirm `06497afac` ("resolve 6 validated detector
defects") is present. Then read `.claude/reports/2026-09-02-findings-INDEX.md` — that is the map
for this whole session.

Then read `.claude/decisions.md` D918 (the retired-detector incident) and, per this project's
standing rule, `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` in full.

---

## Where things stand

Yesterday validated every detector reporting findings, checking each one's LOGIC against the
specs and decisions before trusting its count. That pass deleted one detector outright
(`scattered-element-controls.js` — ~600 false positives, D918) and fixed six defects.

**Already closed, do not reopen:** `dead-api-calls` (253→0), rule 23 (1→0), rule 26 (2→0).

**Open, with a report each** (all in `.claude/reports/`, all carrying a "Your call" checklist):

| Report | Real count | Shape of the work |
|---|---|---|
| `07-preset-only-shadow` | 1 | One-line swap to shared `ShadowControl` |
| `22-placement-rule-surfaces` | 1 | Manifest path typo |
| `34-declared-attr-unrendered` | 7 | Informational — recommend no action |
| `border-control-migration` | 4 blocks | 1 easy + 3 bigger migrations |
| `03-dense-panel-candidate` | 13 | Template exists (`team-member` pilot) |
| `18-decorative-image-aria` | 15 | Naming settled, ready to script |
| `21-render-without-control` | 54 | 51 further false positives excluded, documented |
| `37-media-no-handroll` | 71 | Atom-migration backlog |
| `01-tab-group` | 57 | Real, but the check is a coarse proxy |
| `31-golden-colour-control` | 277 | Blocked on a capability-grant design pass (D754) |

Suggested order: cheapest and clearest first (07, 22, 34, border-migration), then the
template-ready ones (03, 18), then the large ones (21, 37, 01, 31). Bean may reorder — offer the
ranking, do not impose it.

---

## The one question that needs settling early

**"Baselined" means at least two opposite things and nothing distinguishes them.** Raised by Bean
2026-09-02, verified across all 35 baseline files. Some entries mean "not a problem, correct by
design"; others mean "a real problem we deferred". Same JSON shape, same `accepted` key, no
category field. Only 8 of 35 files carry even a free-text `reason`.

This blocks the stated goal. "Resolve all violations including baselined ones" cannot be executed
while the two are indistinguishable.

**Proposal to put to Bean:** add a required `disposition` field with a closed vocabulary —
`by-design` / `detector-limitation` / `accepted-debt` / `blocked` — and back-fill it across the
~165 entries in the 8 non-empty baseline files. Then the work list becomes a filter.

Worth raising early, because it determines whether baselined entries enter this session's scope
at all. Full detail in the INDEX report's final section.

---

## Two known-unfixed items, both deliberate

Neither is an oversight. Do not "fix" either without Bean ruling on it first.

1. **Rule 21's 51 residual false positives** (`sgs/media`, `sgs/hero`). They come from a 1-argument
   literal wrapper call (`key('VideoLoop')`). A generic pattern for that shape would match
   `__('text')` and over-suppress tree-wide. Fixing it needs a narrower signal than anyone has
   yet proposed.
2. **`check-dead-api-calls` is still advisory, not a hard gate.** Its baseline is now genuinely
   zero, so promoting it is possible — that is a policy call for Bean.

---

## Skills

| Skill | When |
|---|---|
| `/autopilot` | **FIRST**, before any response — live skill routing + ADHD support for the session |
| `/delegate` | Before every dispatch — picks the model. Do not hardcode |
| `/dispatching-parallel-agents` | When an approved item splits across disjoint files |
| `/subagent-prompt` | Writing each cold prompt (embed the anti-collision rules below) |
| `/qc-council` | Before trusting any NEW detector claim, or any fix touching a shared core file |
| `/systematic-debugging` | Any "this detector is wrong" investigation — root cause before fix |
| `/sgs-wp-engine` | SGS block/theme work generally |
| `/wp-block-development` | Reached only when editing a block's `edit.js` / `block.json` |
| `/verify-loop` | Two independent attestations per load-bearing claim |
| `/capture-lesson` | A new architectural rule surfaces |
| `/handoff` | Session close |

## Tools

| Tool | For |
|---|---|
| `node scripts/inspector-scan/run.js` (from `plugins/sgs-blocks/`) | Rule counts. Add `--json` for per-finding data, `--self-test` for fixtures |
| `python scripts/placement-reach.py` | THE PLACEMENT RULE resolver — the authority on element/tier placement |
| `npm run gate:fast` | 84 gates. Run after every change, read the FULL output |
| `npm run gate:list` | Which gates exist, their tier and cost |
| `/sgs-db` · `/wp-blocks` | DB and block-schema ground truth — query, never guess a count |
| Playwright MCP | Live editor/DOM verification when a finding claims a control is missing |

---

## Rules that cost real time yesterday

- **Read the FULL commit output.** The pre-commit hook prints passing diagnostics AFTER the line
  that blocks. Grep for `\[main ` or `COMMIT BLOCKED`, then confirm with `git log --oneline -1`.
  Three commits silently failed this way in one session.
- **A grep can over-match.** `grep -v "0 flagged"` also swallows "7**0** flagged". Check your own
  filters before trusting the absence of a line.
- **A passing negative control can be vacuous.** Prove a `mustNotFlag` fixture is really scanned
  by temporarily breaking the exemption and confirming the self-test then FAILS.
- **Verify subagent facts, not just structure.** Yesterday one agent's added doc sentence
  contradicted its own verification output in the same report.
- **Shared-core changes need an all-rule diff.** A `core/sources.js` edit affects all 28 rules;
  capture before/after for every rule, not just the target.
- **Path-scoped commits, one shape each.** Five tracks share `main`; re-check the branch in the
  same command as the commit.

## Anti-collision rules for every dispatched agent

Put these in each cold prompt verbatim:

- ONE file (or one named set) per agent. State it explicitly.
- No state-changing git: no `commit`, `add`, `stash`, `checkout`, `restore`, `reset`.
- No `--fix` / `--apply` / `--write` unless that IS the task.
- If the fix needs a second file, STOP and report back rather than widening scope.
- Report exact before/after counts, and confirm no OTHER detector moved.

Yesterday two agents correctly stopped and reported instead of guessing. That is the behaviour to
reinforce.
