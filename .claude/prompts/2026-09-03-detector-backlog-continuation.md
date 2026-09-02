# Detector backlog — continuation

**Written 2026-09-02.** Invoke `/autopilot` first.

## How this session runs

Dispatch each fix the moment Bean decides it. Do not batch decisions to the end.

1. Put one report to Bean with a recommendation.
2. He decides.
3. Dispatch immediately — `/delegate` picks the model; `/dispatching-parallel-agents` if the item
   splits across disjoint files.
4. Move to the next report while that agent works.
5. Verify every agent's result yourself: `git diff --stat`, re-run the detector, read the numbers.
   Do not trust a subagent's own success report — check it.

Bean is QC. Bring him decisions, not homework.

## First action

Run `git status`, then `git log --oneline -10`. Confirm `f364a1bd8` is present — it closes the
prior prompt's full scope (07, 22, 34, border-migration's `sgs/media` item, plus a hero
cloning-pipeline bug fix). Read `.claude/decisions.md` D919 for that account.

## What's left

Seven items remain from the original detector-findings sweep. None are started.

| Report | Count | Shape of the work |
|---|---|---|
| `03-dense-panel-candidate` | 13 | A template exists — `team-member`'s ToolsPanel pilot. Apply it 13 more times. |
| `18-decorative-image-aria` | 15 | Naming is settled (`{element}Decorative`). Ready to script. |
| `21-render-without-control` (appendix) | 14 | New findings on `sgs/hero`/`sgs/media`/`sgs/testimonial-slider`, surfaced by yesterday's fix. Not yet triaged — read them before ranking. |
| `border-control-migration` | 3 blocks | `card-grid`, `multi-button`, `trust-bar` — each needs the full Shape-B storage migration (native → block-private attrs) before the control swap. `sgs/media` is done; do not reopen it. |
| `37-media-no-handroll` | 71 | Atom-migration backlog. |
| `01-tab-group` | 57 | Real, but the check is a coarse proxy — verify any fix by eye, not just by count. |
| `31-golden-colour-control` | 277 | Blocked on a capability-grant design pass (D754). Do not hand-fix row by row. |

Suggested order: `03` and `18` first (both template-ready), then `21`'s appendix (small, but needs
triage before ranking), then the three border-migration blocks, then the large items (`37`, `01`)
last, with `31` parked until D754's design pass happens. Offer this as a ranking — let Bean reorder.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/delegate` | Before every dispatch — picks the model |
| `/dispatching-parallel-agents` | When an approved item splits across disjoint files |
| `/subagent-prompt` | Writing each cold prompt — embed the anti-collision rules below |
| `/qc-council` | Before trusting a new detector claim, or any fix touching a shared core file |
| `/systematic-debugging` | Any "this detector is wrong" investigation — root cause before fix |
| `/sgs-wp-engine` | SGS block/theme work generally |
| `/wp-block-development` | Editing a block's `edit.js` / `block.json` |
| `/verify-loop` | Two independent attestations per load-bearing claim |
| `/capture-lesson` | A new architectural rule surfaces |
| `/handoff` | Session close |

## Tools

| Tool | For |
|---|---|
| `node scripts/inspector-scan/run.js` (from `plugins/sgs-blocks/`) | Rule counts. `--json` for per-finding data, `--self-test` for fixtures |
| `python scripts/placement-reach.py` | THE PLACEMENT RULE resolver — the authority on element/tier placement |
| `npm run gate:fast` | 85 gates. Run after every change; read the full output |
| `/sgs-db` · `/wp-blocks` | DB and block-schema ground truth — query, never guess a count |
| Playwright MCP | Live editor/DOM verification when a finding claims a control is missing |

## Rules worth carrying forward

- **Read the full commit output.** A pre-commit hook prints passing diagnostics after the line
  that blocks a commit. Grep for `[main ` or `COMMIT BLOCKED`, then confirm with
  `git log --oneline -1`.
- **A block.json change is usually a visual change.** It needs a `reports/visual-diff/<block>-<date>.md`
  report before it can commit — `intent_capture_passed` fits most cases here (state the
  assertion, measure it once against a live capture, no before/after diff needed). See
  `.githooks/README.md`.
- **A shared/core-mechanism change needs multi-rater review, not a single pass.** Yesterday's
  `/qc-council` on the hero cloning-pipeline work found real gaps a single review missed (test
  coverage, not correctness — but still worth catching before calling something done).
- **Path-scoped commits, one shape each.** Re-check the branch in the same command as the commit.
- **A reseed (`sgs-update-v2.py`) can surface unrelated, pre-existing gate failures.** Fix them on
  their own merits via their documented mechanism (never a bare DB `UPDATE`) — don't fold them
  silently into an unrelated commit, and don't skip them either.

## Anti-collision rules for every dispatched agent

Put these in each cold prompt verbatim:

- One file (or one named set) per agent. State it explicitly.
- No state-changing git: no `commit`, `add`, `stash`, `checkout`, `restore`, `reset`.
- No `--fix` / `--apply` / `--write` unless that is the task.
- If the fix needs a second file, stop and report back rather than widening scope.
- Report exact before/after counts, and confirm no other detector moved.
