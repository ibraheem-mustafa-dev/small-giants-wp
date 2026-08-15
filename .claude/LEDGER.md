---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-15
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**2026-08-15. The colour-placement question is SETTLED and now enforced; PR #27 merged to `main`
(`5d43844c`, 4 commits).**

**What we decided, and why it is not what we set out to decide.** We were choosing between "all
colours in one panel" and "each colour with its element". Two councils (4 seats on placement, 4
branches on determinism/cost/UX/prior-art) converged on a third answer: **don't invent a
colour-placement rule at all.** The framework already has one — the D533/D537 resolver places all
2,262 declared attributes with zero human judgement. **Colour was the only property family still
being placed by hand.** So colour now follows it: an element-scoped colour sits in its element's
panel, a colour no element claims falls to its property-family panel. The tab question is settled
too — **Styles**, because Styles holds root CSS and visuals (D621 supersedes D618's reasoning, which
rested on a premise Bean corrected: we never use native colour supports, we only borrow their look).

⭐ **Leaf blocks group by construction, no exception needed** — `sgs/button`'s text/background/border
colours all sit on one element, so they render side by side as Bean wanted.

**The other big change: the placement rule is now a real gate.** It ran WARN-ONLY since it was built,
which is exactly how D537 and D609 came to state *opposite rules inside the same decision entry* with
nothing catching it. `check-element-manifest-conformance.js --check` is now in `prebuild`.

**Running the reseed was the most valuable thing this session did.** Bean asked for it to see if it
moved the drift numbers. It didn't — and that negative result was the bug: the reseed resets
`css_layer` but never `css_element`, so a stale value survives every reseed **by construction**. It
then caught **three regressions our own fixes had introduced**, all before they reached `main`:
a latent build break, a clone-time crash (`AmbiguousLayerAttrError` on breadcrumbs), and a silent
clone-fidelity loss (post-grid's image hover-zoom would have stopped cloning). Had we merged first
and reseeded later, all three would have shipped.

**Numbers:** `css_element` drift **35 → 9**; element-manifest style defects **15 → 7**; contested
attributes **7 → 0**; converter tests 669 → **674** passing (5 new regression tests added).

⚠ **SonarCloud reports Security Rating C on new code and was NOT resolved** — merged on Bean's
explicit instruction with the gate still red. Worth reading the dashboard before the next merge.

**Full narrative:** `memory/session-2026-08-15.md` (auto-snapshotted at close).

## Shipped this session (wrapper-capability census + typography-selector fix, parallel track)

**4 commits on `main`: `1882c28e`, `cd49757f`, `18372409`, `bdc56bd8`. Ran concurrently with the
colour-placement close below — different files, no overlap.**

- **Wrapper-capability census** (`survey-wrapper-capability.js` + `scripts/surveys/lib/*`) measures
  DECLARED/RENDERED/CONSUMED separately, 39 self-tests, harness proven able to fail. Closed 11
  orphaned capabilities (declared + painted + no control): `bgSvgMinHeight` (6 blocks, one shared
  `BackgroundPanel` fix), `minHeight`+`contentBandPadding` (site-header/site-footer). D624.
- **Dead-selector defect class closed:** `cta-section`/`notice-banner`/`info-box` all had
  `selectors.typography` pointing at BEM classes FR-22-6 stopped rendering — every native typography
  control was a silent no-op. Fixed by pointing at the block ROOT (matches core's own pattern;
  inheritance carries an unset child, a declaration never beats the child's own value). Settled rule
  + measured font-size limit (theme.json h2 declaration wins) in `specs/35...md` Part F.1, D625.
  `notice-banner` had a second defect (wrong attribute key read); `info-box` needed one hand-emitted
  `text-align` alongside its existing passthrough (an interim "no emitter" claim was wrong — see
  `mistakes.md` 2026-08-15).
- ⛔ **Not this track's to close:** `image-sequence`/`testimonial` `imageControls` gaps and the
  shared-wrapper decomposition initiative below are unaffected by this work.

## Shipped this session (colour-placement close)

**PR #27 merged to `main` (`5d43844c`) — 4 commits.**

| Commit | What |
|---|---|
| `f78662cd` | **D621 + D622** — colour placement follows the D533/D537 resolver (no bespoke rule); Colour panel → **Styles** tab; contested attributes **7 → 0** (all 7 were one clash: `alignItems`, grid-vs-wrapper); `check-element-manifest-conformance.js` promoted **WARN-ONLY → prebuild gate** with a down-only baseline; 2 new detectors (`audit-css-element-drift.py` 8 assertions, `survey-colour-coverage.py` 19) |
| `bc24e647` | Closed a **latent build break** the new element attrMaps introduced — gates passed only because the DB predated the change. Rogue seeds cleared by regenerating the classifier; hero's gradient layer conflict fixed by extending the override (**both obvious fixes tested and rejected** — retiring the override reproduces the `AmbiguousLayerAttrError` it exists to prevent, proven via 3-way key collisions in the classifier's raw output) |
| `c1911506` | **Root-caused the drift in the SCRIPTS, not 12 block manifests** (Bean's push, and correct). Class 1 reseed reset extended to `css_element`+`css_tier` after verifying column ownership; Class 2 fixed in the derivation (helper-call selectors never fed BEM evidence); Class 4 modifier-stripping; Class 3 the only one needing block edits |
| `69c42c20` | The reseed **proved the fixes AND exposed two regressions they caused** — a clone-time crash and a silent clone-fidelity loss. Both fixed here. See Blockers-avoided below |

### ⭐ What the reseed caught (the case for running it BEFORE merging)

1. **Clone-time crash.** The Class 4 modifier-strip collapsed `breadcrumbs.linkColour` and
   `.currentColour` into one identical routing key → `AmbiguousLayerAttrError`. Fixed by mapping a
   modifier that names a **state** into `css_state` — but **not** as a blanket `--current` rule:
   `price--current` in buybox/product-card is a display variant beside `price--regular`, so a blanket
   rule would have fabricated a false state. The derivation now scans sibling modifiers and only maps
   `--current` → `selected` when it is the sole modifier.
2. **Silent clone-fidelity loss.** The Class 1 reset cleared `post-grid.imageZoomHover`'s
   `css_element`, so `lift_per_element_state` stopped routing it — post-grid's image hover-zoom would
   have silently stopped cloning. Caught by `test_per_element_state_lift.py` (669 → 668 passed).
   ⚠ **Sharper lesson: a column reset is only safe if the derivation can RE-DERIVE every legitimate
   value.** The danger was not another writer (checked) but the derivation's own incompleteness.
   Root cause is a naming split inside one block — post-grid's hover rule targets
   `.sgs-post-grid__img` while 13 other rules use `.sgs-post-grid__image`.
3. **Stray `cta-section.textAlign` css_property** — the block's own docblock says textAlign is handled
   by the native support; the bare attribute is vestigial. Pinned to null.

### Numbers

| Metric | Start | End |
|---|---|---|
| `css_element` drift orphans | 35 | **3** |
| Blocks clean of drift | 24 | **59** |
| Element-manifest style defects | 15 | **7** |
| Contested attributes | 7 | **0** |
| Converter tests | 669 pass | **674 pass** (+5 new) |

⚠ **The 3 residual orphans are `card-grid/card-tile` (a pre-reseed stale value — the manifest already
says `item`), plus `hero/split-media` and `trust-bar/badge-label`, the two known 1:N schema-limit
cases.** The real remaining count is **2**, and no manifest edit can fix them (see Task 3).

## Blockers

- **None repo-wide.** Playwright MCP's browser profile got locked by contention (unclear if a
  stale leftover or a genuinely live concurrent session) — worked around by switching to Chrome
  DevTools MCP for the rest of this session's live-editor verification. Not investigated further;
  not currently blocking anything, just noting the workaround exists if it recurs.

## Open — ready to pick up

### ⭐ NEW INITIATIVE (Bean, 2026-08-14) — shared-wrapper decomposition into opt-in extensions

**Not started. Needs its own session + a design gate (Rule 7 — shared mechanism, 30 blocks).**
Full signature already measured and recorded at `~/.claude/plans/go-track-1b-playful-hamster.md`
**§1.4** — read that section before anything else; do not re-derive it.

Headline facts so nobody re-measures: the wrapper is 1,728 lines JS + 2,599 lines PHP; **the split
seams already exist** as 6 exported panels (`WidthPanel`/`LayoutPanel`/`BackgroundPanel`/
`ShapeDividersPanel`/`GridItemDefaultsPanel`/`GridAreaPanel`); a crude opt-in map already exists as
`KIND_PANELS` keyed on the `kind` prop; `enabledExtensions` (D579) is the shipped opt-in precedent to
reuse rather than reinvent. **This ABSORBS D5** — D5's per-block audit is this initiative's census
stage, and D5's blocked precondition (a `common`/`always` schema column) turned out to have no
recorded justification anywhere in the repo.

⛔ **Do not trust any consumer COUNT until the census script settles it.** A grep for the component
name matches comments — `sgs/button` was wrongly called a consumer this very session (its only hit
is prose at `render.php:930`); the in-file comment says 16 live mounts while a naive grep says 30.

### ⭐ NEXT SESSION — orchestration plan

**You are the SGS framework engineer.** The colour-placement architecture is settled and
gate-enforced; your job is to roll it across the remaining blocks without re-opening settled ground.

**State recap, plain English.** A "colour control" is the swatch a client clicks in the WordPress
editor sidebar to recolour part of a block. We spent this session deciding WHERE that control lives,
and the answer turned out to be "the framework already had a rule — colour just wasn't following
it". That rule is now enforced by a build gate, so it cannot drift again. 9 of 49 blocks are
migrated. Wave 2 is the next 34. Nothing blocks it.

---

## Task 1 — Wave 2 of the colour-panel rollout (~34 Track-A blocks)

**What:** Migrate each remaining block's colour controls to `SgsColourPanel`, following D618's recipe
plus `linked: true` (D619).
**Why:** One predictable place for colour in every block — the client-facing outcome the whole track
exists for.
**Estimated time:** ~4 batches, mostly agent time.

**Orchestration:**
- Execution: **delegated**
- Model: re-run `/delegate` per branch (task shape changed since wave 1 — do not assume Sonnet)
- Dispatch pattern: **parallel** via `/dispatching-parallel-agents`, 2-4 blocks per agent, disjoint
  block lists (one writer per file)
- Brief: read D618 + D619 first. Mount `SgsColourPanel` in the **Styles** tab, rendered first, own
  `PanelBody`, no `+` disclosure. Set `linked: true` on every row. Placement of individual rows now
  follows the resolver automatically — **do not make a per-block placement decision**.
- Context they won't have: `sgs/nav-menu` has 19 colour attrs and Track-B-adjacent ones
  (`navBg`/`submenuBg`) — read it before batching, don't include blindly. The 9 already-migrated
  blocks need a `linked: true` follow-up pass.
- Depends on: none · Parallel with: none (shared checkout — confirm no other session is mid-edit)
- **/qc gate after: yes** — programmatic `wp.data` state-dispatch + DOM assertion, PLUS at least one
  real click-a-swatch-see-canvas-update cycle per genuinely new mechanism.

**Acceptance:** panel first in Styles, no `+` menu, label renders exactly once, hover/state pairing
correct per block, and a **real swatch pick verified live** — DOM structure alone is not acceptance.

## Task 2 — Reseed and confirm the pending corrections land

**What:** Run `/sgs-update`, then re-measure drift + style defects.
**Why:** Three fixes are proven at unit level but unproven end-to-end; the reseed is what lands them.
**Estimated time:** minutes.

**Orchestration:** inline (main thread). ⛔ **Snapshot the DB first and name the rollback** — two
reseeds ran on 2026-08-15 and both exposed regressions. Depends on: none. Parallel with: none —
a reseed is cross-track.

**Acceptance:** drift orphans 3 → **2**, style defects 7 → **6**, **zero NEW db-consistency
violations**. A NEW violation means a fix regressed something — investigate before proceeding, do
not baseline it away.

## Task 3 — The 1:N schema decision (design gate, Bean picks)

**What:** Decide whether `css_element` becomes list-valued or gets a join table.
**Why:** It is the ONLY thing standing between us and zero drift. 2-3 findings are one attribute
painting elements with different class names (`hero.split-media`, `trust-bar.badge-label`,
`breadcrumbs.current`) — no manifest edit can fix them.
**Estimated time:** Bean's ruling, then a scoped build.

**Orchestration:** design gate first (Rule 7 — shared mechanism). Menu + ranking to Bean before any
build. Depends on: none. **/qc gate after: yes** — every `css_element` consumer must handle a set.

**Acceptance:** goal-shaped, not numeric — every consumer handles a set without regression AND the
converter suite still passes 674.

---

## Dependency graph

```
Task 2 (inline, reseed)          Task 1 (parallel agents, 4 batches)
        |                                  |
        +----------- /qc gate -------------+
                          |
                    Task 3 (design gate — Bean rules first)
```
Tasks 1 and 2 are independent. Task 3 needs a ruling, not effort.

## Methodology guardrails (do not skip)

- **Verify on the real editor, not the DOM alone** — Bean caught two "structurally correct, actually
  broken" builds this way. A swatch that opens is not a swatch that applies.
- **A subagent's INFRASTRUCTURE claims need the same verification as its findings** — one reported
  the shared DB was "missing a core table" this session. It was intact; acting on it would have
  clobbered a parallel session's work.
- **Do not chase a number you cannot reseed to.** Prove correctness at unit level and say plainly
  what is unproven. Running a reseed to make your own figures look better is how three regressions
  nearly shipped.
- **A column reset is only safe if the derivation can RE-DERIVE every legitimate value** — the danger
  is not another writer, it is the derivation's own incompleteness.
- **Path-scope every commit by exact file list.** This checkout is shared; an unscoped one is
  blocked by a repo gate for that reason.
- **Detect by what a thing DOES, not what it is called.** Two bugs this session were name heuristics
  (the `Max`/`Min` role suffix; the `wrapper` element-name comparison).
- **/qc multi-rater before every commit** touching converter / pipeline / SGS block logic.

## State Snapshot

- **Branch:** `main`. ⛔ **This will drift immediately** — run `git log -1` AND `git status` AND
  `git branch --show-current`; do not trust this line.
- **D-ceiling:** **D622** as of this write — verify with `grep -oE '^## D[0-9]+' .claude/decisions.md
  | grep -oE '[0-9]+' | sort -n | tail -1`. ⚠ D620 was claimed by the decisions.md auto-sweep hook
  mid-write this session; re-check the ceiling immediately before writing an entry, not from memory.
- **HEAD:** `main` at `5d43844c` (merge of PR #27). ⛔ Verify — this line drifts.
- **DB snapshots** (pre-reseed, this session): `sgs-framework.db.bak-2026-08-15-pre-reseed` and
  `...-pre-reseed2`. Rollback is a single `cp`. Two full reseeds ran today.
- ⚠ **A reseed re-seeds the SHARED DB to match YOUR working tree.** Running one on a branch makes
  every other session on `main` see mismatches for commits they do not have — that happened this
  session and cost the parallel session 7 spurious `alignItems` errors until PR #27 merged. If you
  reseed on a branch, merge promptly or expect to explain it.
- **This checkout is SHARED with concurrent sessions.** At this write, 7 files are modified by the
  shared-wrapper session (`ContainerWrapperControls.js`, `cta-section/edit.js`+`render.php`,
  `site-header/edit.js`, `site-footer/edit.js`, `package-lock.json`, `check-shared-panel-schema.js`).
  **Not touched, not committed here.** Every commit this session was path-scoped by exact file list;
  an unscoped one is blocked by a repo gate for exactly this reason.
- **Worktrees: all cleared** (2026-08-15). 4 registered worktrees removed after verifying each was
  fully merged — the last one's "406-line diff vs main" was **main being ahead**, not stranded work,
  confirmed commit-by-commit. Plus 4 orphaned directories from earlier failed removals (~689MB).
  ⚠ `git worktree remove` fails on Windows with "Filename too long" on deep `node_modules`; it
  deregisters anyway and leaves files. Use `cmd /c rmdir /s /q` with the `\?\` long-path prefix.
  **Check for junctions first** — a previous incident emptied the main `node_modules` (962→0).
  Verified 973 before and after every removal here.
- ⚠ **8 orphaned `worktree-*` branch refs remain** — harmless, left alone in case they belong to
  live sessions.
- **Canary:** sandybrown. Every throwaway test page created this session was deleted after use
  (2414, 2418, 2420, 2421, 2422, 2423, 2429, 2431 — none left live).
- **Playwright MCP browser lock:** hit a "Browser is already in use" error late in the session,
  unresolved cause (stale profile lock vs genuine contention). Chrome DevTools MCP
  (`mcp__plugin_chrome-devtools-mcp_chrome-devtools__*`) worked as a substitute — same live-editor
  verification capability, different tool surface (`take_snapshot`/`click`/`fill`/`evaluate_script`
  instead of Playwright's equivalents). Worth trying Playwright first next session; fall back to
  Chrome DevTools MCP if the lock recurs rather than force-killing chrome.exe processes on a shared
  machine.

## Gates that EARNED their keep this session (do not weaken them)

- **The live-editor verification bar itself** — Bean directly caught two places where a
  DOM-structure check was being treated as sufficient when it wasn't: (1) the first `sgs/icon`
  colour panel passed structural checks while being mounted inside WordPress's own native panel,
  not a real defect the DOM alone would have caught without knowing WHICH slot was used; (2) wave
  1's first Playwright pass confirmed panel structure but not that a real colour pick actually
  applies — Bean explicitly named "the full native control... popover and colour picker" as the
  bar, and it took a second pass (swatch click → attribute → canvas, custom hex picker, hover-state
  independence) to actually clear it.
- **The shared-checkout discipline (commit-by-exact-path, never `git add -A`, verify branch in the
  same command)** — caught zero incidents FOR this session's own commits, but the reason two other
  sessions' concurrent work stayed recoverable/undamaged is that this session never used a broad
  git operation that could have swept up their staged files.

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Colour-panel rollout — full scope, Track A/B split, wave 1 detail, next-session standards work | `~/.claude/plans/go-track-1b-playful-hamster.md` §1.2c-§1.2d |
| D609/D617/D618 — the colour-control architecture decisions | `decisions.md` |
| Uniformity-thread T1-T5 orchestration (this session's opening work) | `~/.claude/memory/session-2026-08-14.md` (rotated snapshot — the plan was recovered from here) |
| Governing spec for inspector UX | `specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` |
| Control-type contract (colour §1, link §2) | `.claude/plans/spec-35-control-type-contract.md` |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Open — carried, not this session's to close

- **`testimonial`/`image-sequence`'s `imageControls`** — real crop scenario, per-item design
  decision each. `image-sequence` is the standing (non-blocking) `check-image-controls-support`
  finding.
- **physics-canvas `ALLOWED_BLOCKS`** — approved in principle; needs its own design gate.
- **Track 2's canary (post 2164)** lost a text node 2026-08-07 (`templateLock:'all'`).
- **`templateMode` inert** on both row blocks and physics-canvas.
- **A mega-menu item inside the drawer still degrades to a plain link** (FR-36-5) — not tracked in
  parking.md (Bean: not approved for parking, will be built properly when that track is reached).
- **Colour-panel Track B** (shared `ContainerWrapperControls.js` wrapper — container, cta-section,
  hero, trust-bar, site-header, site-footer) — Bean-ruled: separate session, after Track A settles.
