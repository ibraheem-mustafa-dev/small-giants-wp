---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, evening. Everything shipped today is now closed — nothing open, nothing mid-flight.**

**Earlier today** — Track 1 (D640/D641) colour-gap closure (4 streams, deployed, live-verified, 2 real
bugs found + fixed) and Track 2 (D638/D639) wrapper-decomposition steps 6-7 (built + merged) both
landed on `main`. Full detail lives permanently in `decisions.md`, not duplicated here.

**Then** a separate converter session (D642) deleted dead code (`resolvers/grid_area.py`) it found
while fixing a lying docstring — verified dead 4 independent ways.

**This session closed the two loose ends those left behind.** (1) Step 7 was built and merged but
never deployed or looked at in a real editor — this session's own brief wrongly claimed it had been;
the LEDGER and `decisions.md` both said otherwise and were right. Deployed it, live-verified both
things that mattered (shape-divider Size control on both axes, Background panel's move into the
Styles tab on all 7 wrapper blocks) with real computed CSS. **The 7-step wrapper-decomposition
initiative is now fully closed.** (2) D642's deletion left 10 stale references — 2 in the governing
Spec 31, 11 mis-cited tombstones, one still-lying test docstring, an orphaned helper, stale figures in
3 planning docs. All repaired, `/qc`-checked, committed (`98bb5ce0`). (3) `hero`/`GridAreaPanel`, the
one open question D639 left over, was already resolved by a same-day follow-up commit — confirmed,
nothing left to decide.

## Shipped today

| What | Detail lives at |
|---|---|
| Track 1 — colour-gap closure, 4 streams, 3 live bugs found+fixed | `decisions.md` D640, D641 |
| Track 2 — wrapper-decomposition steps 6-7 built + merged | `decisions.md` D638, D639 |
| **Step 7 deployed + live-verified this session** — both checks pass on real computed CSS (see below) | this doc |
| grid_area stale-reference repair, 10 reference categories across 13 files, `/qc`-checked | commit `98bb5ce0` |
| GridAreaPanel confirmed already resolved — no action needed | `decisions.md` D639 + commit `fb9625dd` |
| `go-track-1b-playful-hamster.md` §1.4 table corrected (was 2 stale steps) | that file |

**Step 7 deploy — the one thing this session actually did that wasn't already shipped elsewhere:**
Deployed `main` (`ea4514fc`) to sandybrown, clean run, payload checksums verified (83/83). Live-verified
in the real block editor: `shapeDividerTopScale` at `{x:160,y:60}` — X confirmed via the SVG pattern's
`transform="scale(1.6 1)"`, Y confirmed via the wrapper's computed `height:71.99px` against the expected
`120 × 0.6 = 72px` (two different, both-correct CSS mechanisms); Background panel confirmed in the
Styles tab on all 7 wrapper blocks. Scratch probe page (id 2466) force-deleted after.

## Blockers

**None.**

## Open — ready to pick up (orchestration plan for next session)

**Agent identity:** you are picking up a clean framework with no open blockers. Two independent
next items exist — they don't collide, so either can go first.

### ⚠ Task 1 UPDATE — Phase 0 (groundwork) is DONE. Read D643 before starting the builders.

**A later session on 2026-08-16 executed the groundwork this task needs, and it was much bigger than
"start the builders".** Two commits on `main`: `c99be9c1` + `8c3bfbae`. Build green, both pushed.

**Done:** 9 pre-D636 leftovers found and 8 fixed — including **the cloning converter, which could not
clone a gradient overlay at all** (it wrote the deleted 4-attribute shape; stale DB rows were masking
it). Radial/conic gradients are now cloneable and multi-stop gradients survive intact, both as
side-effects of the fix. `sgs_css_gradient_value()` widened for CSS Color 4 slash syntax. DB reseeded
(102 new attrs, 43 orphans pruned). `check-wrapper-capability-preconditions.js` **actually wired** —
it was documented as wired in three places and ran nowhere.

**⛔ Three things that change how the builders must work — do NOT start without reading these:**
1. **`SgsColourPanel.js` needs NO changes.** It forwards `states` opaquely. The shared surface is ONE
   file, `DesignTokenPicker.js`, and `<DesignTokenPicker` is mounted in **9** block files, not 30.
2. **Classifying `css_property` alone is actively harmful.** Doing it produced 51 F6
   `undeclared-subelement` violations — an attr with no `css_element` misroutes on a clone. The
   element must be declared in each block's `supports.sgs.elements.<el>.attrMap`. Research for all 54
   attrs (with per-attr evidence) is ready at
   `.claude/reports/2026-08-16-D643-colour-attr-classification.md`; applying it is a per-block design
   change, still OPEN.
3. **Icon/SVG has no manifest slot.** Spec 35's vocabulary has ONE gradient-capable member,
   `css:background-image`. Background/text/border can all honestly claim it (all three really do paint
   with `background-image`). Icons are stroke-based and there is `css:fill` but **no `css:stroke`** —
   Builder 4 needs a new member or an explicit opt-out. Decide before dispatching it.

**Two corrections to this task's own brief, measured:** shape-divider colours emit **`color`** (the
SVG resolves it via `fill="currentColor"`), not `fill` — so a divider gradient needs a real
`<linearGradient>` replacing that hop. And `sgs/star-rating`'s colours plus `sgs/audio.spectrumColour`
are **not CSS at all** (SVG presentation attribute; JS canvas paint) — audio is excluded outright.

**Still OPEN before/with the builders:** the `accent` split (Bean ruled SPLIT — each CSS property gets
its own control defaulting to the global `accent` preset; scope is 6 attrs, or 8 including
`social-icons`, still unruled); applying the classification research per-block; **and a NEW
client-facing defect — `sgs/cta-section` shows overlay colour + gradient controls that save fine and
paint nothing** (it passes `no_overlay => true`; `check-dead-controls.js` structurally cannot see
this). Full detail: `decisions.md` **D643**.

**Nothing from this groundwork is deployed or live-verified.** Per D641, green ≠ working.

### Task 1 — Gradient rollout Stage 2 (D636)

**What:** extend gradient support (already live for solid-colour backgrounds) to text, border, and
icon/SVG colour-capable attrs across the framework.
**Why:** colour attrs are already live from earlier tracks, so any NEW colour attribute already
lands in the background-family bucket and gets gradient support automatically — this closes the
remaining 3 surfaces (text/border/icon) that don't yet.
**Estimated time:** ~1 session per builder, run in parallel (smallest plausible figure).

**Orchestration:**
- Execution: delegated, 4 parallel builder agents in isolated worktrees (builders 1-3 touch the
  same two shared files — `DesignTokenPicker.js`/`SgsColourPanel.js` — so worktree isolation is
  load-bearing, not optional)
- Model: sonnet via `/delegate` for each builder (mechanical/well-scoped, not architectural)
- Dispatch pattern: `/dispatching-parallel-agents`, 4 independent branches
- Pre-step (sequential, before any builder starts): `/sgs-update` — new colour attrs from recent
  tracks (Track 1 D640/641, wrapper decomposition) are NOT in the DB yet
- Brief per builder:
  - Background: `background-image: <gradient>`; fold Solid/Gradient into
    `DesignTokenPicker.js`/`SgsColourPanel.js` behind `gradientCapable` (~78 attrs)
  - Text (real text only): `background-clip: text` + `color: transparent`; `text-shadow` breaks
    under it — flag per block (~80 attrs)
  - Border: masked `::before` + `mask`; **NOT `border-image`** (breaks `border-radius`) (~32 attrs)
  - Icon/SVG: inline `<linearGradient>` + `stroke="url(#id)"`; simplest of the four (~10+, re-derive
    the count — the ~10 figure is stale)
- Context the builders need that won't be in cold context: full D636 decision + addendum
  (`decisions.md`), the icon-mechanism correction recorded there (background-clip:text does NOT
  work for icon SVGs — a 4th, SVG-native mechanism is required, already reflected in the brief above)
- Depends on: `/sgs-update` pre-step only
- Parallel with: Task 2 (typography) — genuinely independent, don't sequence them
- `/qc` gate after: yes, mandatory before merge (D636's own requirement)

**Acceptance:** all 4 gradient surfaces (background/text/border/icon) have a working
`gradientCapable` control, live-verified on the canary with a real gradient rendering correctly for
at least one block per surface. Full scope = D636 + addendum's named surface list — do not close
this as "done" with only background+text shipped; border and icon are equally in scope.

### Task 2 — Typography framework-wide initiative

**What:** not yet scoped — the next framework-wide control-migration initiative after colour's
Track A+B, per D626's sequencing.
**Why:** colour was sequenced first because it was the more urgent client-facing gap; typography is
next in that same queue.
**Estimated time:** unknown until scoped — do not estimate before the council pass below.

**Orchestration:**
- Execution: inline (main thread) for the scoping/council pass; delegate the actual build once
  scoped, same pattern as colour's Track A/B split
- Model: opus (main thread) for scoping — this is a design decision, not mechanical work
- Dispatch pattern: none yet — first step is `/brainstorming` or a design council (same shape as
  D626's colour council), not a build dispatch
- Brief: read D626 in full for the colour precedent (grouping rule, tab placement, the shared-wrapper
  merge-not-separate-session rule) before scoping typography — the same structural questions apply
- Depends on: nothing (colour Track A+B already closed)
- Parallel with: Task 1 (gradient rollout) — independent
- `/qc` gate after: n/a until scoped

**Acceptance:** a scoped plan exists (blocks affected, mechanism, council-reviewed) — this task is
NOT "done" until that scoping produces a build-ready spec, matching how D626 closed for colour.

### Dependency graph

```
Task 1: /sgs-update (sequential, ~5 min)
  ↓
Task 1: 4 parallel builder agents (isolated worktrees, sonnet)
  ↓ /qc gate (mandatory)
Task 1: merge to main

Task 2: /brainstorming or design council (inline, opus) — runs independently of Task 1
  ↓
Task 2: scoped plan — build dispatch is a FUTURE session's task, not this one's
```

### Carried, low priority

- **`feat/dead-api-checker`** (merged) — run standalone a couple weeks, trim the 305-entry baseline,
  then decide with Bean whether it joins the hard `prebuild` gate.
- **`decisions.md` D639's "residual, not closed" line for GridAreaPanel** is stale (overtaken same day
  by `fb9625dd`) — a one-line note next time that entry is touched, not urgent.

## Methodology guardrails (do not skip)

- **A green ~50-gate build is not proof the code works.** Live canary verification with real computed
  CSS is what actually closed both Track 1's bugs and step 7's deploy this session.
- **A session brief's claimed state is a claim, not a fact.** This session's brief said step 7 was
  "deployed and live-verified"; it was neither. Verify branch/HEAD/D-ceiling against the repo, and
  trust independent sources that agree with each other over a brief that disagrees with all of them.
- **A "residual, not closed" note can be overtaken the SAME day by a later commit** — check git log
  before treating it as still open. GridAreaPanel was already deleted by the time this session looked.
- **Deleting genuinely-dead code can still orphan something else** (`unit_companion_attr()` after
  `grid_area.py`) — tombstone honestly, don't reflexively delete the next orphaned-looking thing.
- **A grep count is not a measurement** — `grep -c 'xfail(strict=True'` summed to 12 on a tree with
  11 real markers (one hit was prose). Use `grep -rn "@pytest.mark.xfail"` and read the match.
- **This LEDGER is REPLACED each session — "replace" means fold in, not delete the standing record.**
  An earlier pass this session overwrote Track 1/Track 2's shipped-record with only this session's
  narrower work; Bean caught it. Corrected, then re-corrected again to the leaner form below once all
  three phases were confirmed closed — full Track 1/Track 2 detail belongs in `decisions.md`
  (D640/D641/D638/D639), which already carries it permanently; the LEDGER only needs to point there.
- **A subagent's claimed API/function name is a claim to verify** — `wc_get_price_html()` (invented)
  shipped clean through every gate. Full incident: `decisions.md` D641.
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main`. Today's commits include Track 1/Track 2 merges + this session's `98bb5ce0`
  (grid_area doc repair) + this LEDGER update. Step 7's deploy was a fast-forward of already-merged
  code (`ea4514fc`), no new commit for the deploy itself.
- **D-ceiling:** **D642** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep has reported a hex colour as the ceiling before).
- **Build:** green. `npm run build` exit 0. Full converter suite 665 passed / 1 skipped / 11 xfailed,
  unchanged before/after this session's doc-only edits (re-verified via stash/pop in this environment).
- **Canary:** sandybrown carries both Track 1's deploy (`c4136e9f` + fixes) and this session's step-7
  deploy (`ea4514fc`), both live-verified. All scratch/test content reverted or force-deleted.
- **Pre-existing dirty files, not this session's:** `reports/phase4-*.txt`,
  `.claude/hooks/doc-size-baseline.json`, `.claude/memory/decisions-archive.md`,
  untracked `.claude/reports/*`, `.claude/Border Example HTML.html`.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **Track 1 incident record — bugs found + fixed, live evidence** | **`decisions.md` D641** |
| Track 1 colour-gap council — rulings, evidence | `decisions.md` D640 |
| Gradient scope + architecture | `decisions.md` D636 + addendum |
| Wrapper decomposition — full 7-step history, now all closed | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.4 |
| Step 7 — built + design corrections + gridAreas retirement | `decisions.md` **D639** + commit `fb9625dd` |
| grid_area dead-code deletion + docstring fix | `decisions.md` **D642** |
| This session's grid_area doc repair (13 files) | `git show 98bb5ce0` |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Cloning pipeline governing spec (2 lines corrected this session) | `specs/31-UNIVERSAL-CLONING-PIPELINE.md` |
| Spec 39 seed requirements (call-site counts re-derived this session) | `.claude/plans/spec-39-seed-requirements.md` |
| Open deferred work | `parking.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design call each.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5).
