# Detector backlog — what's left after border-migration

**Written 2026-09-03.** Invoke `/autopilot` first.

## Where you left off

The previous session closed border-migration: `card-grid`, `multi-button`, and `trust-bar`
now use SGS's own private border attributes instead of WordPress's native border support.
Fixed and deployed in two commits (`3f05435ad`, `75319f9df`), live-verified on the sandybrown
canary with `check-border-roundtrip.js`, visual-diff reports written. It also fixed two real
bugs the migration tool itself had (a double-border-emission risk in `multi-button`, dead
guard code in `card-grid`/`trust-bar`). Nothing from that item is open.

## First action

Run `git status` and `git log --oneline -5` to confirm the border-migration commits landed
clean. Read `.claude/decisions.md`'s head for the current D-ceiling.

## What's left

Three items. None started yet.

| Item | Size | Shape |
|---|---|---|
| `37-media-no-handroll` | 71 findings | Atom-migration backlog. Genuine findings; false positives already gated out. |
| `01-tab-group` | 57 findings | Real findings, but the check is a coarse proxy — it tests for a `group=` prop, not the real TIER 1/2 restructuring. Verify every fix by eye. |
| `21-render-without-control` | 54 findings | Pre-existing backlog, separate from the appendix a prior session already closed. Not yet triaged block-by-block. |

`31-golden-colour-control` (277 findings) stays out of this table on purpose — see below.

## `31-golden-colour-control` — run as its own session

Don't fold this into a mixed backlog sweep. It's a build task, not a triage task: D754's
`grant.js` capability tool still doesn't exist (confirmed by search 2026-09-02), and it
carries its own feasibility spike plus a ~5.4-hour critical-path estimate. Dedicated prompt:
`.claude/prompts/2026-09-03-golden-colour-grant-build.md`.

## How this session runs

Same rhythm as the last two: bring Bean one report at a time, get a decision, dispatch
immediately, verify every result yourself before moving on.

1. Read the relevant report or plan for the item under discussion.
2. Present it with a recommendation — problem, effect, solution, ranked menu.
3. On approval: `/delegate` picks the model, `/subagent-prompt` writes the cold prompt,
   `/dispatching-parallel-agents` if the item splits across disjoint files.
4. Verify every agent's result yourself: `git diff --stat`, re-run the detector, read a
   sample of the actual diff. Never trust a subagent's self-report — this project's history
   includes an import pointing at the wrong module, a control rendered outside
   `InspectorControls`, an unescaped apostrophe that would have broken the build, curly
   quotes silently flattened to ASCII, and a live accessibility regression from a same-day
   rename — all caught only by checking the actual diff.
5. Suggested order: `37` and `01` first (large but mechanical/coarse), `21`'s pre-existing
   backlog last. `31` stays out of scope entirely — see its own prompt.

## Anti-collision rules for every dispatched agent

- One file (or one named set) per agent. State it explicitly.
- No state-changing git: no `commit`, `add`, `stash`, `checkout`, `restore`, `reset` — even
  read-only-sounding ones. A same-week agent attempted `git stash` on this shared worktree
  despite this exact instruction; it failed harmlessly, but don't assume the next one will.
- No `--fix` / `--apply` / `--write` unless that is the task.
- If a fix needs a second file, stop and report back rather than widening scope.
- Report exact before/after counts, and confirm no other detector moved.

## Found but not fixed (pre-existing, still out of scope)

`sgs/site-footer-row`'s `alignItems` attribute declares `"default": "top"` in block.json, but
its own `VERTICAL_ALIGN_OPTIONS` control list only has `start`/`center`/`end`/`stretch` —
`top` isn't valid CSS for `align-items` and isn't one of the control's own options. Confirmed
pre-existing, not introduced by recent work. `alignItems` isn't read by literal name in that
block's own render.php — it goes through the shared `SGS_Container_Wrapper`, same pattern as
hero's grid/flex attrs. Worth a quick fix (align the default to `'start'`, or add a `top`
option) next time this block is touched.

## Rules worth carrying forward

- **A repeater's per-item field is invisible to a top-level-attribute-name detector.** Rule 18
  learned this the hard way (fixed 2026-09-02, now recurses into `items[].properties`) —
  check whether the same blind spot applies before trusting any other rule's count on a
  repeater-shaped block.
- **A control that "doesn't work" already works somewhere — diff against it, don't design
  from scratch.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT ... FROM
  block_attributes WHERE css_property='<prop>'"` finds the working block first.
- **Read the full commit output.** A pre-commit hook prints passing diagnostics after the
  line that blocks a commit.
- **A `block.json` change is usually a visual change** — it needs a
  `reports/visual-diff/<block>-<date>.md` report before it can commit. When the capture needs
  the code live on the canary (which needs the commit to exist first), use the scoped bypass —
  `SGS_VISUAL_GATE_SKIP=<block>[,<block>...] SGS_VISUAL_GATE_REASON="..." git commit ...` —
  then write the report as debt paid, once deployed. Worked example:
  `reports/visual-diff/accordion-2026-08-29.md` and this session's own
  `card-grid-2026-09-03.md`/`multi-button-2026-09-03.md`/`trust-bar-2026-09-03.md`.
- **A generic live probe tool can render nothing for a block with real content requirements.**
  `scripts/qa/check-border-roundtrip.js` authors a bare attribute-only instance by default; a
  block whose render path returns early on empty content (e.g. `card-grid`'s manual mode with
  no `items`) needs a `FIXTURES` entry supplying minimal real content — the same extension
  point already used for `before-after`/`option-picker`. A `NOT RUN` result is the tool
  correctly refusing to fabricate a pass, not a failure to work around blindly.
- **When fixing a codemod's own bug, revert its output and re-run it — don't hand-patch the
  generated files.** Patching three already-migrated files by hand, then discovering a second
  bug, means re-deriving every fix twice. `git checkout --` the affected files, fix the
  script, re-run `--survey`/`--fix --apply`, repeat until clean.
- **A dead-code guard is only provably prunable when the variable it guards has zero writes
  left anywhere in the file** — `if ( ! empty( $X ) )` is unconditionally false forever once
  nothing ever writes to `$X`, regardless of what the guard's body does. That's proof, not a
  heuristic, and it can cascade (removing one dead guard can make the accumulator it fed into
  vacuous too) — run the check to a fixed point, not just once.

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
