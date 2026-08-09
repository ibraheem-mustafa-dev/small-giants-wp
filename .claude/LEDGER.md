---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-10
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary — FOR BEAN, plain English (read this first)

**Where 2026-08-10 left things:**

- **The rule you locked on Saturday now has a gate — and it immediately caught three blocks the
  original count had missed.** Two of them had quietly dropped the shared wrapper and mentioned it
  only in comments *explaining that they'd dropped it*, so a name-search counted them as fine. A
  third had a control doing literally nothing. Fixed three different ways, by evidence, not one
  blanket remedy.
- **You opened the hero's inspector and found sixteen things wrong.** Instead of reacting to each, a
  six-member adversarial council pressure-tested the plan. It found **four errors in my own plan** —
  the worst being that I'd commissioned research to design a "canonical control set" that **already
  exists**, written down and locked, two days earlier. That document is now the first thing the next
  session is told to read.
- **Your opt-in idea was the best structural fix of the day.** Extensions attach to every block
  unless a block opts out, so a panel that shouldn't be there is invisible. Inverting it makes the
  mistake loud instead of silent.
- **We now have hard numbers on the control mess.** A survey script measured it: **every one of the
  17 length-type properties is edited by more than one kind of control.** Border-radius alone has
  seven different controls across the library.
- **A dangerous deploy recipe was still in an always-loaded instruction file.** It deleted the live
  plugin directory *before* copying the new one in — the exact shape of July's incident that took two
  sites down for 2.5 hours — pointed at a domain that no longer exists. Gone.
- **I got the hero image fix wrong and measured my way out of it.** Built it, tested it on a real
  probe page, the numbers disproved my own reasoning, reverted. You'd already said object-fit covers
  it, and you were right.

**Full narrative:** `memory/session-2026-08-10*.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (State Snapshot) — never cache it.** Latest: **D542**.

### ⭐ Track 1b (Spec 35) — inspector control standardisation

**Two commits on `main`:** `0fb1507d` (rule 23 + 3 block fixes + tagName) · `dae79292` (deploy hygiene).

#### Shipped

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
- **Length-control divergence — REAL, confirmed by two independent methods, but read the two numbers
  together.** (a) `scripts/surveys/survey-length-controls.py` (file-scanning heuristic): 694
  length-family instances (345 DB-direct + 349 suffix-resolved), **all 17 present properties
  diverge**. (b) Independent SQL straight at `block_attributes` (`css_property` ×
  `inspector_control_type`, non-NULL only): **8 properties diverge** — `max-width` 5 components,
  `padding`/`letter-spacing`/`gap`/`border-radius` 4 each, `width` 3, `height`/`font-size` 2.
  ⚠ **8 is the floor you can defend from the DB alone; 17 is the survey's wider suffix-resolved net.**
  The difference is the ~65%-NULL `inspector_control_type` column — which is itself the Phase 3.2b
  blocker, not a discrepancy to reconcile away. Quote 8 when you need a number that survives
  challenge; quote 17 only with the method named. (The "all 17" figure was single-sourced and stated
  as settled fact until the handoff QC flagged it — the cross-check is what produced this line.)
  `border-radius` → 7 components (BorderRadiusControl 24 / UnitControl 11 / BoxControl 5 /
  RangeControl 3 / TextControl 3 / SelectControl 2 + unresolved) · `width` → SelectControl 15 /
  RangeControl 10 / UnitControl 8 · `padding` → BoxControl 115 (correct, dominant) but SelectControl
  11 / RangeControl 5 / TextControl 5 / ToggleControl 4 · `max-width` → UnitControl 13 dominant, still
  RangeControl 3 / TextControl 2. Canonical `UnitControl` **already in use** in 49 places — so the
  target shape exists in-tree and is being adopted, not invented.
  ⚠ **Attribution is a static nearest-preceding-JSX heuristic, not an AST parse** — one real false
  positive is documented in the script's own docstring. Spot-check file:line before building a `--fix`
  on any divergent row. 26 NULL (all `*Unit` companions, kept as their own bucket) · 295 no-control-found.
- **29** blocks use `ContainerWrapperControls` (not 18). **4** gates, **none ever promoted**.
  `setting-registry.json` live severity 28/40/20/4 (its own `_meta` cache says 25/35/17 — drifted).
  ⚠ **The "363 advisory backlog" this line used to carry was never a measurement** — it was the sum
  of the *cached* `openBacklog` column in `rules.json`. Live, measured 2026-08-09 at `a09226e8` via
  `node scripts/inspector-scan/run.js --json`, counting `status:"FLAGGED"` only: **242**. See the
  BEFORE-baseline block below. Same trap as `setting-registry.json`'s `_meta` cache; second
  occurrence in two sessions.

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
  found: the contract BANS raw `ColorPalette`/`GradientPicker`/`URLInput`/`LinkControl`, and
  **nothing enforced it**. Proven, not argued: injecting `<ColorPalette enableAlpha>` into a real
  block gives rule 04 **0 FLAGGED** and rule 24 a hit — rule 04 returns early when `enableAlpha` is
  present (`:92`), rule 08 matches `<TextControl type="url">` only (`:99-101`). NEW rule at advisory,
  deliberately NOT a widening of either gate (both sit at 0 backlog; widening in place fails the
  build on the first finding). Live: **1 FLAGGED** — `sgs/button/edit.js:312`, a raw `<URLInput>`,
  agreeing with a pre-registered grep AND the contract's own §2.6. 9 fixtures incl. a substring
  negative control. ⛔ **Stated blind spot:** `src/blocks/extensions/` is out of scope —
  `core/roster.js:58-70` admits only directories with a `block.json`. The contract records a raw URL
  field reaching 67 blocks through there. Unbuilt plumbing, separate job.
- **Three survey detectors** (`b6ca16a8`) — `survey-{colour,typography,box}-controls.py`, joining
  `survey-length-controls.py`. All `--survey` only. Each proven able to FAIL by sabotage-and-restore
  (colour 7/7→6/1, typography 9/9→7/2, box 5/5→5/1); each expected population derived independently
  BEFORE the live run per `zeroIsAClaim`.
  - **COLOUR** 263 instances — `color` diverges: `DesignTokenPicker` 99 vs `TextControl type="color"`
    2 (`sgs/star-rating`, verified at `edit.js:155,162`).
  - **TYPOGRAPHY** 181 — `font-size` diverges: `TypographyControls` 78 vs TextControl 3 /
    RangeControl 2 / NumberControl 1 (`product-card.ctaFontSize`, `edit.js:1687`) / UnitControl 1.
    ⚠ **A literal-name scan would have MISSED most of this**: `grep -c nameFontSizeTablet
    brand-strip/edit.js` = **0** while the DB carries it — `TypographyControls` builds attr names at
    runtime from `prefix`. The survey parses call sites and ports the component's own naming logic.
    **Genuine gap found:** `nameLineHeight*`/`nameLetterSpacing*` tiers have NO editor control at all
    (`showResponsive` covers font-size only) though PHP renders them.
  - **BOX** — §5's *"per-side scalar migration COMPLETE, 0 remaining"* now **PROVEN** (0 four-sibling
    groups; independently re-derived — no block has more than 2 per-side scalars). **§14 BORDER
    conformance measured for the FIRST time** (field 6 read "not yet measured"): 31 four-corner
    object attrs → 24 canonical, 5 on the wrong component, 7 no control; 222 four-side → 210
    canonical, 4 raw `BoxControl` bypasses.
  - ⛔ **Disclosed blind spot:** colour + typography scan `edit.js` + `src/components/` only, so
    per-block local component dirs are missed — that is where `GradientOverlayControl` lives for
    container/hero/trust-bar/cta-section. **The absence of `GradientPicker` findings is NOT a clean
    bill.**

**Advisory backlog now 243** (242 + rule 24's 1). Gates still 4, still none promoted.

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

### Task 1 — Measure the BEFORE numbers (INLINE, ~15 min) ⭐ START HERE

**What:** hero's inspector panel count (live editor, panels expanded, tabs selected by `aria-label`)
and rule 21's current finding count. The divergence count is already measured (above).
**Why:** the deliverable is a *change* in these numbers. Unmeasured now = baseline lost forever.
`P-HEADER-SIMPLICITY-FINDINGS` is parked OPEN precisely because its baseline was never taken.
**Acceptance:** numbers written into the plan as measured facts, with the commands that produced them.
**Depends on:** none.

### Task 2 — Extend the survey detectors to the other families (DELEGATED fan-out, Sonnet)

**What:** the length family is done (`scripts/surveys/survey-length-controls.py`, 5/5 self-test with
positive + negative controls). Build the same shape for colour, typography and box families.
**Why:** makes every later "find all the instances" step free, and stops us designing a shape worse
than one already in the tree.
**Acceptance:** each detector carries a `--self-test` proving it can FAIL, and its live output is
reconciled against an independently-derived expected population before being trusted.
**Parallel with:** Task 1. **/qc gate after:** yes.

### Task 3 — Phase 1.1/1.2, the responsive model (INLINE, Opus)

**What:** build the sticky device toggle in **its own** `extensions/responsive-device-toggle.js` — NOT
inside `conditional-visibility.js`, which is wrapped end-to-end in a `window.__sgs…Registered` guard,
and double-registration from duplicate bundles is a *recorded* occurrence. Then delete `<DeviceTabs>`
from `ResponsiveControl.js:152-169` plus the now-proven-dead `localKey` fallback.
**Why:** ~192 of ~215 on-screen switchers are redundant copies of one global state. One edit.
**Guardrails:** behind a `sgsGlobalDeviceToggle` compile-time flag for one canary cycle; needs a NEW
editor stylesheet (no `sgs-responsive-*` class has any CSS today) proven to load by a
deliberately-red positive control.
**Depends on:** Task 1. **/qc gate after:** yes — multi-rater.

### Task 4 — Rewrite the two gates Phase 1 breaks (INLINE, Opus, SAME change as Task 3)

`check-control-ux.js` will false-fire tree-wide, and its `:586` bug (`seedMode === false`) makes it a
hard gate even in report mode — there is currently **no way to inspect its output without failing**.
`lint-responsive-controls.py` goes **vacuous** (a green proving nothing) and its self-test breaks.

### Dependency graph

```
Task 1 (measure, inline)  ║ parallel ║  Task 2 (survey detectors, Sonnet fan-out)
                    ↓ baseline recorded
Task 3 (toggle + tab deletion)  +  Task 4 (gate rewrites)   ← same change
                    ↓ multi-rater /qc · canary verify BOTH editors
                    ↓ commit by exact path, main
Then: Phase 2.1 opt-in inversion (script-derived; Bean reviews the diff)
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

- **Branch:** `main` at `dae79292` + this handoff's doc commit on top. ⛔ **Do not trust this line for
  tree state — run `git status`.** Commit by EXACT PATH (a pre-commit gate requires a pathspec; the
  visual-diff gate requires a `source_sha`-bound report per changed block).
- **Untracked, deliberate:** `.claude/Border Example HTML.html` (Bean's saved reference markup — the
  core `BorderBoxControl` example the plan is built on).
- **Build:** `npm run build` exit 0, all prebuild gates passing. `inspector-scan --self-test` green
  incl. the harness meta-check. `build-deploy.py --self-test` green.
- ⚠ **Handoff QC was PARTLY self-run — read `f8b73833`'s message with that in mind.** The independent
  QC subagent **stalled and failed** (no progress 600s, no verdict). Its 18 mechanical checks were
  re-run by the author instead and all 18 reproduced — those are deterministic facts (file contents,
  counts, `git diff --stat`), so they stand. What was NOT independently reviewed is the **judgement
  layer**: whether the D541/D542 narrative overclaims. The commit message says "QC verified" without
  disclosing that. **Resolved:** a narrow re-run returned **NARRATIVE HONEST — no overclaims**, with
  two soft flags. One was refuted (it said the LEDGER doesn't restate the first action inline; it
  does — the reviewer's read window was capped at 60 lines by my own instruction). The other was
  **correct and is now fixed**: the "all 17 properties diverge" figure was single-sourced to one new
  script, and an independent SQL cross-check put the DB-defensible floor at 8 — see the divergence
  bullet above.
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
