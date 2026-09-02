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
| `21-render-without-control` | 68 | Residual false positives now closed (was 54 real + 51 excluded); 14 new findings appeared since, not yet triaged |
| `37-media-no-handroll` | 71 | Atom-migration backlog |
| `01-tab-group` | 57 | Real, but the check is a coarse proxy |
| `31-golden-colour-control` | 277 | Blocked on a capability-grant design pass (D754) |

Suggested order: cheapest and clearest first (07, 22, 34, border-migration), then the
template-ready ones (03, 18), then the large ones (21, 37, 01, 31). Bean may reorder — offer the
ranking, do not impose it.

---

## Two items that were open when this prompt was written are now closed

Both resolved 2026-09-02, same day as writing — read this before trusting anything below that
still cites them as open.

1. **The `disposition` vocabulary question is DONE.** `by-design` / `accepted-debt` /
   `detector-limitation` / `blocked` back-filled across all 360 entries (not ~165 — that figure
   had drifted) in the 8 non-empty baseline files. "Resolve all violations including baselined
   ones" is now a runnable filter. **New decision surfaced by the pass, still open:** 31 entries
   classified `detector-limitation` — per the project's own rule ("a false positive is a detector
   bug, never baseline fodder") these are rule violations sitting in a baseline, not a normal
   outcome. Full list + which detector each belongs to: INDEX report's disposition section.
2. **Rule 21's residual false positives are closed.** The detector now traces the local-wrapper
   indirection (`key('VideoLoop')`, `name(idBase + suffix)`) structurally — narrow enough it can
   never match `__('text')`, so the over-suppression risk that blocked a fix doesn't apply. 46
   false positives eliminated (turned out to span `sgs/before-after` too, not just `sgs/media`/
   `sgs/hero`), zero new findings introduced. **New, unrelated to this fix:** a live re-scan
   surfaced 14 findings on `sgs/hero`/`sgs/media`/`sgs/testimonial-slider` that didn't exist when
   the original report was written — not yet triaged, see that report's appendix.
3. **`check-dead-api-calls` is now a hard gate**, not advisory — promoted to the `fast` tier
   (every `prebuild`), not just `full` (pre-deploy). Verified: all 85 fast-tier gates pass.

Full detail on all three: the INDEX report and the `dead-api-calls`/`21-render-without-control`
reports, all re-read and updated 2026-09-02.

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
