# Detector backlog — after the media-atom migration

**Written 2026-09-03, supersedes `2026-09-03-detector-backlog-post-border.md` (deleted in the
same commit as this file).** Invoke `/autopilot` first.

## Where you left off

The previous session closed most of `37-media-no-handroll` (71 → 44 findings): 17 blocks
migrated onto the shared media-atom system for `object-fit`/`object-position`, the overlay
atom gained tablet/mobile tiering, and 7 blocks got their `backgroundOverlay*` non-adoption
documented rather than silently gapped. Commits `c1a395ec5`, `7de8f0ff8`, `a47cc502a`. Deployed
and live-verified on the sandybrown canary. A 4-persona `/qc-council` review caught and fixed
two real bugs (a hardcoded override silently defeating a working control on a child block; a
dead duplicate "Object fit" dropdown on two blocks, one of which also carried a live
double-emission risk for existing content). Full detail: `git show c1a395ec5` and
`git show a47cc502a`.

Two things did NOT get done — both were investigated, not skipped:

- **`container`/`cta-section`/`nav-drawer`'s remaining `37` findings** (background-image
  sizing) — first-ever adoption of the atom's "backdrop" scope. Held pending a design
  conversation with Bean; `sgs/container` is the shared wrapper, changing it needs sign-off
  first per this project's rule 7.
- **The full `class-sgs-container-wrapper.php` overlay swap** — would need a new
  "caller-supplied-selector" atom capability that doesn't exist. Not a same-session task.

## First action

Run `git log --oneline -5` to confirm the three commits above landed clean on `main`. Read
`.claude/decisions.md`'s head for the current D-ceiling.

## What's left

| Item | Size | Shape |
|---|---|---|
| `37-media-no-handroll` remainder | 44 findings, 8 blocks | `container`/`cta-section`/`nav-drawer` (backdrop-scope, held) + `multi-button`/`physics-canvas`/`site-footer`/`site-header` (overlay, documented debt, not fixed) |
| `01-tab-group` | 56 findings | Real findings, coarse check — it tests for a `group=` prop, not the real TIER 1/2 restructuring. Verify every fix by eye. |
| `21-render-without-control` | 54 findings | Pre-existing backlog, not yet triaged block-by-block. |

`31-golden-colour-control` stays out of this table on purpose — see below.

## `31-golden-colour-control` — run as its own session, and read this first

Don't fold it into a mixed backlog sweep — it's a build task, not a triage task, and the
previous attempt at this cost roughly 75% of an Opus session's context window just on
verification. Before starting another attempt: **read the retrospective at
`.claude/reports/2026-09-03-media-atom-migration-lessons.md`** — it names exactly why
verification got so expensive on this session's media-atom work, and what to do differently.
The short version: split "add a real client control" work into single-block dispatches with a
tight, block-specific brief (not one shared template reused blindly across many blocks) — the
per-block surprises (an already-existing control, dead CSS, a child-block override, a
double-emission risk) are the norm on this codebase, not the exception, and a generic brief
makes every agent re-discover the same class of surprise independently instead of the
dispatcher front-loading known risk patterns. Dedicated prompt (needs a re-read before use —
it predates this session's lessons): `.claude/prompts/2026-09-03-golden-colour-grant-build.md`.

## How this session runs

Same rhythm as the last three: bring Bean one report at a time, get a decision, dispatch
immediately, verify every result yourself before moving on.

1. Read the relevant report or plan for the item under discussion.
2. Present it with a recommendation — problem, effect, solution, ranked menu.
3. On approval: `/delegate` picks the model, `/subagent-prompt` writes the cold prompt,
   `/dispatching-parallel-agents` if the item splits across disjoint files.
4. Verify every agent's result yourself: `git diff --stat`, re-run the detector, read a sample
   of the actual diff. Never trust a subagent's self-report.
5. Before any commit touching a shared/core file (a wrapper class, a shared atom, anything
   more than one block depends on), run `/qc-council` — it earned its place this session,
   catching two real bugs across 17 independently-dispatched agents' work.
6. Suggested order: finish `37`'s 8 remaining blocks after the `container` design chat, then
   `01`, then `21`. `31` stays fully out of scope — see its own prompt.

## Anti-collision rules for every dispatched agent

- One file (or one named set) per agent. State it explicitly.
- No state-changing git: no `commit`, `add`, `stash`, `checkout`, `restore`, `reset` — even
  read-only-sounding ones (`git status`/`git diff` are fine; a same-week agent still ran one
  despite being told not to — harmless, but don't assume the next one will be).
- No `--fix` / `--apply` / `--write` unless that is the task.
- If a fix needs a second file, stop and report back rather than widening scope.
- Report exact before/after counts, and confirm no other detector moved.
- **Before writing to any dated report path** (`reports/visual-diff/<block>-<date>.md` and
  similar), check `git status`/`git diff --cached --stat` first — a same-day filename is not
  proof the file is new. This session overwrote two real reports from a concurrent track before
  catching it via this exact check; both were restored and the new content appended instead.

## Found but not fixed (pre-existing, still out of scope)

`sgs/site-footer-row`'s `alignItems` attribute declares `"default": "top"` in block.json, but
its own `VERTICAL_ALIGN_OPTIONS` control list only has `start`/`center`/`end`/`stretch` — `top`
isn't valid CSS for `align-items` and isn't one of the control's own options. Pre-existing, not
introduced by recent work. Worth a quick fix (align the default to `'start'`, or add a `top`
option) next time this block is touched.

## Rules worth carrying forward

- **A shared-mechanism finding is one fix, not N.** `37`'s 7-block `backgroundOverlay*` findings
  turned out to be one function (`class-sgs-container-wrapper.php`) shared by all 7 — check
  whether a detector's per-block findings actually share a single implementation before
  planning per-block dispatches.
- **"Migrate onto the shared atom" can mean two different things: a mechanism-only swap
  (same fixed value, different CSS plumbing) or a real feature add (a genuine new client
  control).** Ask which one is wanted before dispatching — most of `37`'s object-fit findings
  turned out to be genuinely missing controls, not just wrong plumbing, which is real feature
  work across many blocks, not a single cleanup pass.
- **Before assuming no control exists, check for one under a different name.** Several blocks
  in `37` already had a working (differently-named) crop control — `sgs/gallery`'s
  `sgsObjectFit`, `sgs/brand-strip`'s `logoFit`. Building a new one would have duplicated it.
  Bridge via `STORED_AS` (both the JS file `MediaElementControls.js` AND its PHP twin
  `helpers-media-element.php` — a bridge in only one half silently breaks the control).
- **"No control exists" can also mean the CSS is already dead.** `sgs/info-box`'s flagged
  `object-fit` rule targeted a class an earlier migration had already stopped rendering —
  building a control for it would have been a control with zero visible effect. Check whether
  the target element still renders before assuming a finding needs a new control.
- **A dispatched agent finding "the brief's premise doesn't hold" and stopping is a feature,
  not friction.** The Category-B overlay-wrapper swap was investigated and correctly refused
  before any code was written, once two real capability gaps surfaced (missing tier support,
  a marker-class mismatch) — this is the outcome to want, not a failed dispatch.
- **A detector that checks "declared ANY capability" rather than "declared THIS attribute's
  capability" can go silent on an unrelated finding.** `37`'s `mediaElements` check is
  block-wide, not per-attribute — adopting the atom for one attribute silently cleared the
  detector for every other media-family attribute on that block, wired or not. Checked across
  all 15 migrated blocks this session; only the one known case (`trust-bar`) was affected, and
  it's documented. Re-check this on any future adoption.
- **A repeater's per-item field is invisible to a top-level-attribute-name detector.** Rule 18
  learned this the hard way (fixed 2026-09-02) — check whether the same blind spot applies
  before trusting any other rule's count on a repeater-shaped block.
- **A control that "doesn't work" already works somewhere — diff against it, don't design from
  scratch.** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT ... FROM
  block_attributes WHERE css_property='<prop>'"` finds the working block first.
- **A `block.json`/`render.php`/`style.css` change is usually a visual change** — it needs a
  `reports/visual-diff/<block>-<date>.md` report before it can commit. When the capture needs
  the code live on the canary (which needs the commit to exist first), use the scoped bypass —
  `SGS_VISUAL_GATE_SKIP=<block>[,<block>...] SGS_VISUAL_GATE_REASON="..." git commit ...` — then
  do the real live capture immediately after deploying and commit the reports as a fast
  follow-up, not indefinite debt. Worked examples: `reports/visual-diff/accordion-2026-08-29.md`
  and this session's 16 `*-2026-09-03.md` reports under Category A.
- **When fixing a codemod's own bug, revert its output and re-run it — don't hand-patch the
  generated files.** Patching already-migrated files by hand, then discovering a second bug,
  means re-deriving every fix twice.
- **A dead-code guard is only provably prunable when the variable it guards has zero writes
  left anywhere in the file.** That's proof, not a heuristic, and it can cascade — run the
  check to a fixed point, not just once.

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
| `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` | The one deploy path |
| `/sgs-db` · `/wp-blocks` | DB and block-schema ground truth |
| Playwright MCP | Live editor/DOM verification |
