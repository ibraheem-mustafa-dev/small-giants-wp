# Detector backlog — what's left

**Written 2026-09-03.** Invoke `/autopilot` first.

## First action

Run `git status` and `git log --oneline -5`. Confirm this session's earlier work is
committed (reports 03, 18, and 21's appendix — all closed, `18-decorative-image-aria`
detector fix shipped). Read `.claude/decisions.md`'s head for the D-ceiling.

## What's left

Five items. None started this session.

| Item | Size | Shape |
|---|---|---|
| Border-migration: `card-grid`, `multi-button`, `trust-bar` | 3 blocks | Full Shape-B storage migration (native `__experimentalBorder` → block-private attrs) before the control swap. `scripts/migrate-border-shape-b.js --survey` currently refuses all 3 as `ambiguous-anchor` — investigate why before running it. |
| `37-media-no-handroll` | 71 findings | Atom-migration backlog. Genuine, false positives already gated out. |
| `01-tab-group` | 57 findings | Real, but the check is a coarse proxy (tests for a `group=` prop, not real TIER 1/2 restructuring). Verify any fix by eye. |
| `21-render-without-control` | 54 findings | The pre-existing backlog, separate from the appendix a prior session closed. Not yet triaged block-by-block. |

`31-golden-colour-control` (277 findings) is deliberately NOT in this table — see below, it has its own session prompt.

## `31-golden-colour-control` — separate session

This item is NOT scoped into this prompt. It's a build task (D754's `grant.js` capability
tool still doesn't exist — confirmed by search 2026-09-02), not a triage task, and it
carries its own feasibility spike and ~5.4-hour critical-path estimate. Its own dedicated
prompt: `.claude/prompts/2026-09-03-golden-colour-grant-build.md`. Do not fold it into a
mixed backlog sweep session.

## How this session runs

Same rhythm as the prior one: bring Bean one report at a time, get a decision, dispatch
immediately, verify every result yourself before moving on.

1. Read the relevant report/plan for the item under discussion.
2. Present it with a recommendation — problem, effect, solution, ranked menu.
3. On approval: `/delegate` picks the model, `/subagent-prompt` writes the cold prompt,
   `/dispatching-parallel-agents` if the item splits across disjoint files.
4. Verify every agent's result yourself: `git diff --stat`, re-run the detector, read a
   sample of the actual diff. Do not trust a subagent's self-report — this session's
   predecessor caught real bugs this way (an import pointed at the wrong module, a control
   rendered outside `InspectorControls`, an unescaped apostrophe that would have broken the
   build, curly quotes silently flattened to ASCII, a live accessibility regression from an
   earlier same-day rename).
5. Suggested order: border-migration first (small, concrete), then `37` and `01` (large but
   mechanical/coarse), `21`'s pre-existing backlog last. `31` is out of scope here entirely
   — see its own prompt.

## Anti-collision rules for every dispatched agent

- One file (or one named set) per agent. State it explicitly.
- No state-changing git: no `commit`, `add`, `stash`, `checkout`, `restore`, `reset` — even
  read-only-sounding ones. A same-day predecessor agent attempted `git stash` on this shared
  worktree despite this exact instruction; it failed harmlessly, but do not assume the next
  one will.
- No `--fix` / `--apply` / `--write` unless that is the task.
- If the fix needs a second file, stop and report back rather than widening scope.
- Report exact before/after counts, and confirm no other detector moved.

## Found but not fixed (pre-existing, out of scope for this session)

`sgs/site-footer-row`'s `alignItems` attribute declares `"default": "top"` in block.json,
but its own `VERTICAL_ALIGN_OPTIONS` control list only has values `start`/`center`/`end`/
`stretch` — `top` isn't valid CSS for `align-items` and isn't one of the control's own
options. Not introduced by this session (found during a QC-council pass, confirmed
pre-existing), and `alignItems` isn't read by literal name in that block's own render.php
(goes through the shared `SGS_Container_Wrapper`, same pattern as hero's grid/flex attrs) —
worth a quick fix (align the block.json default to `'start'`, or add a `top` option) next
time this block is touched.

## Rules worth carrying forward

- **A repeater's per-item field is invisible to a top-level-attribute-name detector.** Rule
  18 already learned this lesson (fixed 2026-09-02, recurses into `items[].properties`
  now) — check whether the same blind spot applies before trusting any other rule's count
  on a repeater-shaped block.
- **A control that "doesn't work" already works somewhere — diff against it, don't design
  from scratch.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT ... FROM
  block_attributes WHERE css_property='<prop>'"` finds the working block first.
- **Read the full commit output** — a pre-commit hook prints passing diagnostics after the
  line that blocks a commit.
- **A block.json change is usually a visual change** — needs a
  `reports/visual-diff/<block>-<date>.md` report before it can commit.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/delegate` | Before every dispatch |
| `/dispatching-parallel-agents` | Approved item splits across disjoint files |
| `/subagent-prompt` | Writing each cold prompt |
| `/qc-council` | Before trusting a new detector claim, or any fix touching a shared core file |
| `/systematic-debugging` | Any "this detector is wrong" investigation |
| `/sgs-wp-engine` | SGS block/theme work generally |
| `/verify-loop` | Two independent attestations per load-bearing claim |
| `/handoff` | Session close |

## Tools

| Tool | For |
|---|---|
| `node scripts/inspector-scan/run.js` (from `plugins/sgs-blocks/`) | Rule counts. `--json` for per-finding data, `--self-test` for fixtures |
| `python scripts/placement-reach.py` | THE PLACEMENT RULE resolver |
| `npm run gate:fast` | 85 gates — run after every change, read the full output |
| `/sgs-db` · `/wp-blocks` | DB and block-schema ground truth |
| Playwright MCP | Live editor/DOM verification |
