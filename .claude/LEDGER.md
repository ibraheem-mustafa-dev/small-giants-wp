---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-10
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-10 left things** *(prior narrative: `memory/session-2026-08-09*.md`.)*:

- **The one-toggle switcher is built, live, and you signed off on it.** Every responsive setting used
  to carry its own little Desktop/Tablet/Mobile switcher — about 192 of them scattered across the
  editor. There is now ONE, docked to the bottom of the sidebar, and it drives all of them. You caught
  five real problems on first look (wrong edge, wrong label weight, a broken height, an invisible
  selection pill, a badly-placed warning) — all five are fixed and verified live.
  - **192 old switchers are deleted**, not just hidden. One edit removed the bulk of them; two
    smaller components needed their own pass.
  - **The two other places quietly running their own separate device switch are now wired to the
    same one** — before this, three different parts of the editor could each think you were editing a
    different device at once. That's closed.
  - **One thing is genuinely lost and not yet replaced:** the old switchers could show at a glance
    which OTHER device sizes had a custom value set. The new one can't show that (it doesn't know
    per-setting). Needs its own small design later — not urgent, not forgotten.
- **Four separate "looks fixed, isn't" traps were caught before anything shipped broken**, each one
  worth remembering: a build that passes green while a component silently fails to render; a
  measurement tool that says "on-screen" when the browser has actually clipped it off; a control that
  landed at the bottom of a list when it should be visible; a fix drawn from watching only ONE
  scenario when a second scenario broke it. All four are recorded so the pattern is caught faster next
  time.
- **What's carried over from 2026-08-09, unchanged:** the earlier baseline count (129 settings with no
  editor control, down from 243) and the finding that most controls a client sees come from add-on
  features rather than the block itself — both still stand; see below.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D547**.

### ⭐ Track 1b (Spec 35) — inspector control standardisation

**Five commits on `main` today (2026-08-10):** `66ce8502` (Phase 1.1, toggle, additive) ·
`63e8a481` (Bean's Gate 1 review, 5 points) · `0b1e452e` (pinned to sidebar bottom + per-tier cue
dismissal) · `d406c73c` (Phase 1.2 — delete the ~192 per-control strips) · `b202157e` (Phase 1.3 —
split-brain components + pill alignment + hover contrast). Full record: D546 + D547. Design doc
(now marked BUILT): `plans/2026-08-10-global-device-toggle-design.md`.

#### ⭐ Shipped today — Phase 1.1 + 1.2 + 1.3 (the toggle programme)

- **One global `ToggleGroupControl` device switcher**, own file
  `src/blocks/extensions/responsive-device-toggle.js`, docked absolutely to the BOTTOM edge of
  `.interface-interface-skeleton__sidebar`. Dismissible per-tier cue in the breadcrumb strip +
  `aria-live` announcement. Verified live, both editors: mounts once, drives the canvas
  (1247/781/479px), 0 console errors, survives Page-tab/distraction-free/closed-sidebar.
- **`<DeviceTabs>` deleted from `ResponsiveControl.js`** — removes the switcher from all 68 JSX call
  sites across 31 files (~192 strips). ⚑ 73/32 was a raw grep line count (5 are JSDoc). 1.2 touched
  only `ResponsiveControl.js`; 1.3 removed strips from `ResponsiveOverride` + `ResponsiveTriState`
  too — three files, two commits. Verified: with the toggle on Tablet,
  editing a container's Gap wrote `gapTablet:"123px"` and ONLY that key.
- **`ResponsiveOverride.js` (4 files) + `ResponsiveTriStateControl.js` (site-header)** now read the
  global tier instead of private state — closes a real split-brain bug (three disagreeing device
  models running at once pre-fix).
- **Item 1.5 (gate rewrites) confirmed NOT needed** — measured against the post-1.2 tree, both gates
  still pass and still scan the full block roster. Neither gate was touched.
- **Known open item, not closed:** the deleted per-control strips could show at-a-glance which OTHER
  tiers had a custom value ("(inherited)"/"(customised)"); the global toggle cannot. Needs its own
  design; do not solve by re-adding a per-control switcher.
- **Not started:** Phase 1.4a/1.4b/1.4c (sibling-merge codemods), Phase 2.1 (opt-in inversion).
  **In progress by other agents this session, outcome not yet known:** item 1.6 (advisory
  `inspector-scan` rule, `925fa3da`) and 1.6b (Playwright detector, `99859d38`) — BOTH LANDED, plus
  two QC-council fixes to rule 25. Check
  their own commits before assuming either landed.

#### Shipped 2026-08-09

- **`inspector-scan` rule 23** `content-width-needs-inner-band` (ADVISORY) gates D540. Live: **0
  flagged**. Proven able to fail twice by its own fixtures during construction, then by a real-tree
  positive control on `sgs/quote`. Full record: **D541**.
- **Three blocks corrected by differing remedies** — `product-card` `contentWidth` DELETED (inert),
  `info-box` + `option-picker` RENAMED → `width` (behaviour identical). **6 canary rows migrated**
  before deploy, scoped so `sgs/container`'s 140 legitimate instances stayed untouched.
- **`sgs/physics-canvas` `tagName` control wired** (9 options matching its enum exactly) — its last
  `render-without-control` finding, now 0. Delegated, verified independently.
- **Deploy hygiene** — `palestine-lives` removed from `TARGETS` (site gone) and the hand-rolled
  `rm -rf`-before-extract recipe deleted from `plugins/sgs-blocks/CLAUDE.md`. `build-deploy.py
  --self-test` green incl. the D336 negative control.
- **Plan rewritten** after the council: `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md`.

#### Measured this session (facts, not summaries)

- **`core/editor.getDeviceType()` answers in BOTH the post editor AND the site editor** (WP 7.0.2,
  canary). `ResponsiveControl.js:107-113`'s comment claiming otherwise is **STALE** → its `localKey`
  fallback is dead code and Phase 1.2 is unblocked.
- **Length-control divergence — REAL, two independent methods, read both numbers together.**
  (a) `survey-length-controls.py` (file-scanning heuristic): 694 instances, 16 of the 17 present properties
  diverge. (b) Independent SQL on `block_attributes` (non-NULL `inspector_control_type` only): **8**
  properties diverge (`max-width` 5, `padding`/`letter-spacing`/`gap`/`border-radius` 4 each, `width`
  3, `height`/`font-size` 2). ⚠ **8 is the DB-defensible floor; 17 is the survey's wider net** — the
  gap is the ~65%-NULL `inspector_control_type` column, itself the Phase 3.2b blocker. Quote 8 under
  challenge, 17 only with the method named. Re-run `npm run survey:length` for current breakdowns —
  do not read a cached list here. ⚑ The 17th (`bottom`) has ONE instance so cannot diverge. The
  cached "49 places" of `UnitControl` reproduces by no method (survey JSON: 64 across 43 file:line)
  and is WITHDRAWN — re-run the survey. ⚠ Attribution
  is a nearest-preceding-JSX heuristic, not an AST parse — spot-check before any `--fix`.
- **29** blocks use `ContainerWrapperControls` (not 18). **4** gates, none ever promoted.
  `setting-registry.json` live severity 28/40/20/4 (its `_meta` cache says 25/35/17 — drifted).
  ⚠ Advisory backlog is measured live via `--json` counting `status:"FLAGGED"` only (**242** at
  `a09226e8`) — a cached `openBacklog` sum is not the same measurement; same trap twice in two
  sessions.

#### ⭐ BEFORE baseline — measured 2026-08-09 at `a09226e8`, tree clean

**The number the programme reports against: `inspector-scan` rule `21-render-without-control` =
129 FLAGGED.** Command: `node scripts/inspector-scan/run.js --json` from `plugins/sgs-blocks`.

⚠ **Count `status:"FLAGGED"`, never the raw findings array.** `core/report.js:96-101` serialises
BASELINED entries too, while `printHuman` and `computeExit` both filter to FLAGGED. Reading the raw
array gives 141 for rule 21 and 254 overall — both wrong by exactly the baselined entries.

| Rule | Mode | FLAGGED | Baselined | `openBacklog` **before** this session |
|---|---|---|---|---|
| `21-render-without-control` | advisory | **129** | 12 | 243 |
| `01-tab-group` | advisory | 58 | 0 | 66 |
| `20-pattern-template-lock` | advisory | 23 | 0 | 23 |
| `03-dense-panel-candidate` | advisory | 16 | 0 | 15 |
| `18-decorative-image-aria` | advisory | 15 | 0 | 15 |
| `07-preset-only-shadow` | advisory | 1 | 0 | 1 |
| `22` / `23` | advisory | 0 | 0 | — / 0 |
| `04` / `08` / `14` / `17` | **gate** | **0** | 2 (rule 08) | 0 |

⚠ The right-hand column is **history, not the current file** — `rules.json` was rewritten to
129/58/16 in this same change, each with its cause recorded in the rule's `advisoryReason`. Total
baselined tree-wide is **14** (12 advisory + rule 08's 2); raw `--json` array totals are 254 advisory
/ 256 tree-wide.

**Rule 21's 243 → 129 is a REAL win and the arithmetic closes exactly.** The rule file is untouched
since the commit that wrote 243, so it cannot be a logic change: against its own cached per-block
census, physics-canvas 79→0, nav-menu 17→0, site-header-row 12→2, site-footer-row 12→4 = **−114**,
and 243−129 = **114**. Earned by `4d501a16` (D539) + `282a06ee` (D540).

**A library-wide panel/control census was ALSO measured and then REJECTED as a baseline — see D543.**
Do not rebuild it: `check-simple-surface-cap.js` run across all 83 blocks gives median 12 / max 49 /
total 1121, and every one of those figures is untrustworthy in *both* directions. Replacement
instrument (Bean-decided): a new calibrated detector, plan Step 2 — **not yet built.**

#### Shipped AFTER the baseline (same session)

- **`inspector-scan` rule 24 `raw-canonical-component`** (ADVISORY, `a29e37b5`) — closes the gap D543
  found: the contract BANS raw `ColorPalette`/`GradientPicker`/`URLInput`/`LinkControl`, and nothing
  enforced it. Proven by injection test, not argued (rule 04 returns early on `enableAlpha`, rule 08
  matches `type="url"` only). NEW rule at advisory. Live: **1 FLAGGED** —
  `sgs/button/edit.js:312`, a raw `<URLInput>`. ⛔ **Blind spot:** `src/blocks/extensions/` is out of
  scope (`core/roster.js:76` admits only `block.json` dirs) — the contract records a raw URL field
  reaching 67 blocks through there. Unbuilt plumbing, separate job.
- **Three survey detectors** (`b6ca16a8`) — `survey-{colour,typography,box}-controls.py`, joining
  `survey-length-controls.py`. `--survey` only, each proven able to FAIL by sabotage-and-restore.
  COLOUR 263 diverging. TYPOGRAPHY 181 diverging — a literal-name grep would have missed most of it
  (the survey ports the component's own runtime naming logic); gap found: line-height/letter-spacing
  tiers have no editor control at all. BOX — §5's "0 remaining per-side scalars" now PROVEN; §14
  BORDER measured for the first time: 31 corner attrs → 24 canonical / 5 wrong component / 7 none.
  ⛔ **Blind spot:** colour + typography scan `edit.js` + `src/components/` only, missing per-block
  local dirs (`GradientOverlayControl`) — zero `GradientPicker` findings is not a clean bill.

**Advisory backlog now 243** (242 + rule 24's 1). Gates still 4, still none promoted.

#### ⭐ LIVE-EDITOR CALIBRATION — read D544 before sequencing anything

Run BEFORE building the replacement detector, on the canary, both tabs, all panels expanded.
**The static census MIS-RANKS, it does not merely undercount:** `label` 8 static → **~50 live**;
`button` 28 static → **84 live**, more than `hero` (45 static → 80). Also: `product-card` 19 panels /
86 controls, `quote` 11 / 60. **83 block types registered live** — third confirmation of the
denominator.

**The dominant term is the EXTENSION LOAD, not the block.** `sgs/label` panel-by-panel: its own
surface is **11 controls / 4 panels**; universal extensions add **34 controls / 6 panels** (Visibility
conditions 15, Hover Effects 15, + 4 singles) = **76% of its SGS controls**. All 15 hover controls
verified genuinely visible, including *"Zoom image on hover"* and *"Grayscale to colour"* — on a text
block with no image.

⚠ **This puts Phase 2.1 (opt-in inversion, D542 ruling 1) ahead of Phase 1 (responsive model) on
measured impact — but ordering is BEAN'S CALL and has NOT been changed.** Both are real.

#### ⛔ Do NOT start these

- **Re-deriving the canonical control set.** `.claude/plans/spec-35-control-type-contract.md` is
  AUTHORITATIVE and already specifies it (§14 BORDER = `BorderBoxControl`; §4 LENGTH/UNIT; §12
  RESPONSIVE WRAPPER FAMILY). Read it before designing anything.
- **Stripping the native WP `color`/`spacing`/`__experimentalBorder` supports.** They *render* the
  panel we called ideal, and stripping severs theme.json/Global Styles. Keep them declared, use
  `skipSerialization` (Spec 32's locked rule). See D542.
- **Overloading `variant_slots` for capability scoping.** It stores *discriminating* slots by
  set-difference, so anything shared by all variants appears nowhere — it structurally cannot answer
  "which groups apply to this variant". Needs its own declaration with a `common` bucket, in a column
  the cloning converter provably does not read.
- **Citing D539's four block counts** as a population for anything — D539 already re-adjudicated them
  and found the mechanisms differ.

## ⭐ NEXT SESSION — orchestration plan

**Identity.** SGS framework engineer on Track 1b. The programme is planned, council-reviewed and
fact-checked. You are executing it — starting with measurement, not building.

**⛔ READ FIRST, IN THIS ORDER, BEFORE ANY EDIT** (the council's sharpest finding was a plan written
without these): 1. `.claude/plans/spec-35-control-type-contract.md` (governing) · 2.
`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` Part H · 3. D537 · 4.
`scripts/inspector-scan/rules.json` `_meta`. Then the plan:
`C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md`.

> **⭐ STANDING INSTRUCTION (Bean, 2026-08-09).** Multi-rater review at EVERY design gate and at the
> CLOSE of every implementation — `/qc-council`, `/adversarial-council` or the fitting variant — via
> `/delegate` + parallel subagents, never inline and alone. Give reviewers DIFFERENT angles.
> **Fact-check every finding before applying it.** This session the council was wrong about live
> client sites (there are none) and right about four of my own claims; both mattered.

> **⭐ THE METHOD (Bean, 2026-08-10) — the script triad.** The thing that finds every instance, the
> thing that fixes them and the thing that keeps them fixed are the SAME detector: `--survey`
> (exhaustive census, run BEFORE the design) → `--fix` (parameterised codemod) → `--check` (the gate).
> **No phase does by hand what its own detector could do.** If an item touches >3 blocks, the first
> deliverable is the detector, not the edit.

✅ **Tasks 1 + 2 of the previous plan are DONE** — baseline measured (rule 21 = **129**), five survey
detectors built AND wired. **✅ Phase 1.1 + 1.2 + 1.3 are DONE (2026-08-10, D546/D547)** — the global
toggle, the ~192-strip deletion, and the split-brain fix. Do not redo any of these.

### ⭐ START HERE — Phase 1.4a + 1.4b (SCRIPT), 1.4c (SENIOR design call)

**What's left in Phase 1.** 1.4a `image-controls.js:225-281` · 1.4b
`ContainerWrapperControls.js:1483-1511` — genuine 3-sibling merges, file-disjoint from each other and
safe to parallelise. ⚠ **Both are value-DOMAIN changes** (`RangeControl`→`UnitControl`; closed
enum→open value) — D521-class silent-coercion risk, so the codemod PROPOSES and a human signs off,
with a stored-content migration. **1.4c (`hero/edit.js:906`, `:1006-1017`) is NOT a merge** —
mobile-only orphans with no tier counterpart; needs Bean's design call first (D545).

**1.6 and 1.6b BOTH SHIPPED** — rule 25 (`925fa3da`, advisory, later hardened by a QC council) and
the Playwright detector (`99859d38`, `npm run check:device-toggle`). Nothing to chase. This line
written; read their own commits rather than assuming either outcome.

**After Phase 1 closes:** Phase 3.2a's `--fix` (survey already finished, highest leverage left, no
open design decision) · Phase 2.1 opt-in inversion (bigger payoff — 59% of live inspector controls
come from universal extensions — but gated on deriving the new opt-in list from actual
`post_content` usage, not from `hideExtensions`, per D545).

### ⚠ Two ACTIVE residuals on the survey-inspector-surface detector (not parked — they bite the next measurement)

1. **`survey-inspector-surface.js` counts DECLARED rows; D544's live figures count DEFAULT-VISIBLE
   ones.** It therefore does NOT reproduce the live ordering (live: product-card > button > hero >
   quote > label; detector: product-card > hero > quote > button > label). **Its OWN-vs-EXTENSION
   split IS exact** (`sgs/label` 4/6/1 panels, matching the live measurement) — use that, and do not
   quote its row totals as "what the client sees". Closing it = one bounded pass making
   default-visible the primary number, declared the secondary.
2. **Unresolved 7-vs-6 discrepancy on `sgs/label`'s extension panels.** The detector counts a `fx.js`
   "Scroll & effects" panel (source says label qualifies via `SHIPPED_EFFECTS`); the live
   click-through recorded only 6 and did not show it. **One of the two is wrong and which has not
   been determined.** Resolve before the next calibration, or the calibration inherits the error.

### Dependency graph

```
✅ 1.1 toggle ──> ✅ 1.2 delete strips ──> ✅ 1.3 split-brain fix   [ALL DONE 2026-08-10]
                                            ├─ 1.5 gate rewrites: MEASURED NOT NEEDED, skipped
                                            └─ 1.6 rule / 1.6b detector: SHIPPED (925fa3da / 99859d38)
1.4a ─┐ file-disjoint — safe to PARALLELISE
1.4b ─┘        1.4c ── blocked on Bean's design call, not on 1.4a/b
                    ↓ multi-rater /qc · canary verify BOTH editors
Then: Phase 3.2a's `--fix` (highest leverage left) · Phase 2.1 opt-in inversion
```

### Methodology guardrails (earned this session; do not skip)

- **A grep for a class NAME answers "is this identifier present", never "is this mechanism used."**
  Two blocks counted as wrapper-routed because the name appeared in comments saying they'd dropped it.
- **Never relay a number you did not measure.** I quoted `setting-registry.json`'s own `_meta` cache
  (25/35/17); live is 28/40/20/4.
- **A collapsed `ToolsPanel` keeps its children out of the DOM, and inspector tab buttons carry NO
  text** (`aria-label` only). Both produced false "the control is missing" readings this session.
- **A probe that never reaches the effect measures the probe** — a bogus image URL, then a page whose
  own markup was invalid, both produced meaningless hero measurements.
- **Validate a census query with a positive control before trusting a zero.** A canary query returned
  0 for *everything*, including the control.
- **A static heuristic is not an AST parse** — the length survey's own docstring names a real false
  positive. Spot-check before acting on a row.
- **Deploy needs `--payload <prefix>`, never `--allow-dirty`.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter completion) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main` at `b202157e` (Phase 1.3) + this handoff's doc commit on top. ⛔ **Do not trust
  this line for tree state — run `git status`.** Commit by EXACT PATH (a pre-commit gate requires a
  pathspec; the visual-diff gate requires a `source_sha`-bound report per changed block).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's saved reference markup — the
  core `BorderBoxControl` example the plan is built on).
- **Build:** `npm run build` exit 0, all prebuild gates passing. `inspector-scan --self-test` green
  incl. the harness meta-check. `build-deploy.py --self-test` green.
- **2026-08-09 handoff QC — RESOLVED.** The independent QC subagent stalled (600s, no verdict); 18
  mechanical checks were re-run by the author and all reproduced. A follow-up judgement-layer re-run
  returned NARRATIVE HONEST — one soft flag refuted, one correct and fixed (the "17 diverge" figure
  was single-sourced; the DB-defensible floor of 8 is now recorded above). Commit `f8b73833`.
- **Canary:** deployed and live-verified this session (frontend + editor, both surfaces).
- **Pre-existing, NOT ours:** `audit-declared-vs-seeded-roles.py` 3 STALE overrides;
  `check-dead-controls` CHECK 4 advisory lists 3 fully-dead attrs.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` · `git status` ·
  `git branch --show-current` · D-ceiling
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
- **Site:** canary = sandybrown-nightingale-600381.hostingersite.com — **the only one**
  (palestine-lives.org is gone; removed from deploy TARGETS 2026-08-10).
- **Canary credentials:** `.claude/secrets/sandybrown.env` (gitignored, always available).

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| **The canonical control set (GOVERNING)** | `plans/spec-35-control-type-contract.md` (AUTHORITATIVE 2026-08-08) |
| The standardisation programme | `C:\Users\Bean\.claude\plans\go-track-1b-playful-hamster.md` |
| Inspector placement (two tiers) | `decisions.md` D537 |
| Element-driven inspector (owns hover + native-support retirement) | `plans/2026-08-08-element-driven-inspector-design.md` |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Build / deploy / SSH / credentials | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown` |

## Blockers

**NONE.** Phase 1.2 was gated on the site-editor probe; that is now measured and clear.

## Open — carried, not ours to close

- ⚠ **Track 2's canary (post 2164) lost a text node** 2026-08-07 — `sgs/mega-group`'s
  `templateLock:'all'` dropped a stored `sgs/text` child.
- **Residual empty `sgs/media` ChildBlock** in the art-direction walk (D514), emitter untraced.
- **`templateMode` is inert** on both row blocks and physics-canvas.
- **`gridTemplateColumns` type mismatch** between the two row blocks. Flagged, deliberately not normalised.
- **`sgs/hero` split-image bleed** — latent only, **0 live instances**. `splitImageBleed` cancels a
  fixed `2rem` against a band inset that grows with viewport, and the media column is separately
  clamped by `max-width: calc(50% + …)`. Bean ruled object-fit covers the need; parked.
- **physics-canvas `ALLOWED_BLOCKS`** — Bean approved opening the canvas to any block with a
  physics-participation toggle (default off; operability detected by what a child DOES, never a slug
  list). Reverses D447's rationale; needs its own design gate. Not started.
