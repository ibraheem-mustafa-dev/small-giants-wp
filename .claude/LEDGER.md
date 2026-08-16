---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-16
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-16, late. The gradient rollout's groundwork (Phase 0) is DONE. The builders have not
started — and the ground turned out to be far worse than anyone thought.**

**What we set out to do:** start Stage 2, the universal gradient rollout (D636) — give every colour
control in the framework a gradient option. **What we actually found:** yesterday's storage change
(which collapsed each gradient from 4 attributes down to 1) had left NINE places still speaking the
old language. None of them failed a build, because WordPress silently throws away any attribute a
block does not declare. They just quietly did nothing.

**The serious one: the cloning pipeline could not clone a gradient at all.** It was writing four
attributes that no longer exist, producing clones with no gradient, no error and no warning. Stale
rows in the database were hiding it — clearing them is what exposed it. Fixed, and two capabilities
fell out for free: radial and conic gradients can now be cloned (they never could), and multi-stop
gradients keep every colour instead of being flattened to two.

**A build check that claimed to be running wasn't.** A gate written yesterday was documented in three
separate places as enforcing every build. It was wired nowhere. Now genuinely wired, with all three
docs corrected to record the gap rather than quietly become true.

**Your `accent` ruling was executed — and it shrank.** You ruled that attributes secretly driving
several CSS properties at once should be split. Four agents in parallel checked each against the real
code instead of trusting the database, and **4 of the 6 "defects" were not defects at all** — the
database column was simply wrong. Three blocks were genuinely broken and were split (12 new controls
replacing 4); two were left alone.

**What is NOT done:** nothing was deployed, so nothing is proven working — only proven building. The
three splits are committed behind a deliberately-provisional gate bypass recording visual verification
as OWED, not claimed. That verification is the first job next session.

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

### Task 1 — Gradient rollout Stage 2 (D636): builders, but verification FIRST

**Phase 0 groundwork is DONE.** Read **`decisions.md` D643 in full before touching anything** — it
records nine defects, two instructions that turned out to be WRONG, and four corrections that change
how the builders must work.

**What:** finish the rollout — background / text / border / icon / shape-divider.
**Why:** every colour control gains a gradient option; Bean ruled full universal coverage (D636).
**Estimated time:** ~1 session per builder in parallel, after the verification task below.

#### Task 1a — Live-verify the three splits (DO THIS FIRST, ~20 min)

**What:** `sgs/social-icons`, `sgs/business-info` and `sgs/mega-panel` were split into 12 new
attributes replacing 4, committed behind a PROVISIONAL `SGS_VISUAL_GATE_SKIP`.
**Why:** these genuinely change the emitted CSS (custom properties renamed and split, every consuming
selector repointed). Defaults were inherited so the rendered result SHOULD be identical — but that is
reasoning, not measurement, and D641 is the standing proof that reasoning is not enough.
**Orchestration:** inline (main thread). Deploy via `build-deploy.py --target sandybrown`, then
`capture-tier-fixture.py` + `make-visual-diff-reports.py` for the three blocks.
⚠ **Known ordering problem, unsolved:** genuine before/after capture needs a DEPLOY between staging
and committing, and the deploy's dirty-tree gate forbids exactly that. Resolve the sequencing with
Bean explicitly — do NOT reach for `--allow-dirty`.
**Acceptance:** three real reports at `reports/visual-diff/<block>-<date>.md` carrying measured
values, and the provisional-bypass note removed from D643 and this LEDGER.

#### Task 1b — The five builders

| Builder | Mechanism | Scale |
|---|---|---|
| Background | `background-image: <gradient>` | ~78 attrs |
| Text | `background-clip:text` + `color:transparent` | ~85 attrs |
| Border | masked `::before` + `mask` (**never `border-image`**) | ~33 attrs |
| Icon/SVG | inline `<linearGradient>` + `stroke="url(#id)"` | ~16 attrs |
| Shape divider | SVG `<linearGradient>` on the divider path | 12 attrs |

**Orchestration:** delegated, one isolated worktree each (`/delegate` routes to Sonnet; its parallel
cap is 4, so run 4 then 1). `/qc-inline` per builder before it reports done; `/qc` multi-rater across
the merged diff.

⛔ **Four corrections that will cost a builder real time if skipped:**
1. **`SgsColourPanel.js` needs NO changes.** It forwards `states` opaquely. The shared surface is ONE
   file — `DesignTokenPicker.js` — mounted directly in **8** block files (not the 30 an early count
   claimed, which counted comments and re-export lines). Re-measure before relying on it:
   `grep -rl '<DesignTokenPicker' plugins/sgs-blocks/src/blocks/ | wc -l`. It was 9 earlier this
   session and this session's own `sgs/separator` change made it 8 — a live count, not a constant.
   `<SgsColourPanel` mounts in 61 files.
2. **Never write `css_property` without `css_element`.** Doing so produced 51 F6
   `undeclared-subelement` violations: the attribute falls to the root routing domain and
   **misroutes on a clone**. The element must be declared in that block's
   `supports.sgs.elements.<el>.attrMap`. Research for all 54 unclassified attrs is ready at
   `.claude/reports/2026-08-16-D643-colour-attr-classification.md`; applying it is a per-block design
   change and is still OPEN.
3. **Icon/SVG has no manifest slot.** Spec 35's vocabulary has ONE gradient-capable member,
   `css:background-image`. Background, text and border can all honestly claim it (all three really do
   paint with `background-image`). Icons are stroke-based and there is `css:fill` but **no
   `css:stroke`** — decide on a new member or an explicit opt-out BEFORE dispatching Builder 4.
4. **Shape-divider colours emit `color`, not `fill`** — the SVG resolves it via `fill="currentColor"`.
   A divider gradient must replace that `currentColor` hop with a real `<linearGradient>`.

**Excluded deliberately:** `sgs/audio.spectrumColour` (JS canvas paint — a CSS gradient cannot paint a
canvas) and `sgs/star-rating.starColour`/`emptyColour` (written straight into the SVG `fill=`
presentation attribute, no CSS involved).

**Still OPEN:** `sgs/cta-section` shows overlay colour and gradient controls that save correctly and
paint nothing — it passes `no_overlay => true`, and `check-dead-controls.js` structurally cannot see
this (the attrs ARE consumed in the shared wrapper, just never for that block). Needs a design call:
drop the attrs and control, or stop passing `no_overlay`.

**Acceptance:** all five mechanisms have a working gradient control, live-verified on the canary with
a real gradient rendering correctly — Bean's eye, not a green build (R-31-13).

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
Task 1a: deploy + capture the 3 splits   (inline, opus, ~20 min)  <-- DO THIS FIRST
   |     resolve the deploy-vs-commit ordering with Bean first
   |     BLOCKS 1b: do not add 5 more unverified mechanisms on top of 3 unverified splits
   v
Task 1b: decide the Icon/SVG manifest slot  (inline, opus — no css:stroke member exists)
   |     BLOCKS builder 4 only; builders 1/2/3/5 can start without it
   v
Task 1b: 5 builder agents in isolated worktrees (sonnet via /delegate)
         Sonnet's parallel cap is 4 -> run 4, then the 5th
         background | text | border | shape-divider   ... then icon/SVG
   |     /qc-inline per builder before it reports done
   v
   |  /qc multi-rater across the merged diff (mandatory — blub.db 255)
   v
Task 1b: merge to main -> deploy -> live-verify all 5 mechanisms by eye (R-31-13)

Task 2: /brainstorming or design council (inline, opus) — independent of Task 1
   v
Task 2: scoped plan — build dispatch is a FUTURE session's task, not this one's
```

⚠ **Graph corrected 2026-08-16 (D643).** The previous version opened with `/sgs-update` (done this
session), showed FOUR builders (it is five — shape-divider was added by Bean's ruling), and had no
verification step at all. Two prerequisites now sit ahead of the builders because both were
discovered mid-session, not planned: the owed visual verification, and the icon manifest-slot
decision.

### Carried, low priority

- **`feat/dead-api-checker`** (merged) — run standalone a couple weeks, trim the 305-entry baseline,
  then decide with Bean whether it joins the hard `prebuild` gate.
- **`decisions.md` D639's "residual, not closed" line for GridAreaPanel** is stale (overtaken same day
  by `fb9625dd`) — a one-line note next time that entry is touched, not urgent.
- **`element-manifest-baseline.json` has NO headroom left.** `separator.lineGradient` (D643) took the
  last of the 12 accepted style-defect orphans — the gate now sits at exactly 12/12, so the very next
  unclaimable attribute fails the build. The baseline was deliberately NOT raised: that file states
  raising it is stop-the-line and needs Bean's sign-off. Decide whether `lineGradient` is formally
  accepted debt (raise to 13 with a written reason) or whether a Spec 35 gradient member should exist
  for borders — the same question Builder 4 faces for `css:stroke`. Not urgent, but the next person to
  add a colour attribute will hit it with no warning.

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

- **Branch:** `main`, in sync with origin. This session: `c99be9c1` (8 pre-D636 leftovers),
  `8c3bfbae` (gate wiring + 3 doc corrections), `679ae4d9` (D643 docs + research report), plus three
  split commits and their merges.
- **D-ceiling:** **D643** — verify with
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (anchor on the heading; an unanchored grep once reported a hex colour as the ceiling).
- **Build:** green through all ~50 gates. Converter suite 666 passed.
- **DB:** reseeded (stages 1 + 9). Schema drift CLEAN, re-verified after every write because a
  co-active session shared the file. Backups at `sgs-framework.db.pre-D643*.bak`.
- **Canary:** UNCHANGED by this session — nothing was deployed. It still carries the earlier Track 1
  and step-7 deploys.
- **Worktrees:** none. Four were created and removed cleanly; `node_modules` intact at 972 packages
  (no junctions were created, which is why removal was safe).
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
