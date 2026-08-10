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
- **`ResponsiveOverride.js` (3 call sites) + `ResponsiveTriStateControl.js` (site-header)** now read the
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

#### Prior session (2026-08-09) — condensed; full record in D539-D545

- **BEFORE baseline, still the number the programme reports against:** `inspector-scan` rule
  `21-render-without-control` = **129 FLAGGED**, tree-wide advisory total **243**. Re-measured
  2026-08-10 after Phases 1.2/1.3: **unchanged** — no regression. Command: `node
  scripts/inspector-scan/run.js --json` from `plugins/sgs-blocks`, counting `status:"FLAGGED"`
  ONLY (raw arrays read 141/254 — they include the 12 baselined entries).
- **Rule 23 + rule 24 shipped; three blocks corrected; five survey detectors built AND wired.**
- **A library-wide panel/control census was measured then REJECTED (D543) — do not rebuild it.**
  `check-simple-surface-cap.js` MIS-RANKS (it scores a composite as one row, cannot see native
  supports, misses `extensions/`). It is correct for its own 2-block job; leave it exactly as is.
- **LIVE-EDITOR CALIBRATION (D544): the dominant term is the EXTENSION LOAD, not the block.**
  `sgs/label` shows ~50 controls live against a static score of 8; 59% of the library's inspector
  surface comes from universal extensions. This is why Phase 2.1 (opt-in inversion) has the
  biggest payoff left. **83 block types registered live** — the denominator is 83, not 84.

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

**1.6 and 1.6b BOTH SHIPPED.** Rule 25 (`925fa3da`, advisory) — a QC council then found it missed
the ARRAY-MAPPED switcher idiom (the one `responsive-device-toggle.js` itself uses) and could
false-positive on a 4-value picker using an unanticipated word. Both fixed + fixture-guarded in
`2ae3c8be`. Playwright detector (`99859d38`, `npm run check:device-toggle` / `:gate` / `:selftest`)
— ⚠ NOT in `prebuild` (needs network + credentials) and ⚠ **playwright is NOT declared in
`package.json`**, so on a fresh clone it degrades to "unavailable". Declaring it is a real decision:
it is a heavy install every contributor would pay for.

**After Phase 1 closes:** Phase 3.2a's `--fix` (survey already finished, highest leverage left, no
open design decision) · Phase 2.1 opt-in inversion (bigger payoff — 59% of live inspector controls
come from universal extensions — but gated on deriving the new opt-in list from actual
`post_content` usage, not from `hideExtensions`, per D545).

### ⚠ Two ACTIVE residuals on `survey-inspector-surface` (not parked — they bite the next measurement)

1. **It counts DECLARED rows; D544's live figures count DEFAULT-VISIBLE ones**, so it does not
   reproduce the live ordering. **Its OWN-vs-EXTENSION split IS exact** — use that, never its row
   totals as "what the client sees". Fix = one bounded pass making default-visible primary.
2. **Unresolved 7-vs-6 on `sgs/label`'s extension panels** — the detector counts an `fx.js`
   "Scroll & effects" panel the live click-through did not show. One is wrong; which is undetermined.
   Resolve before the next calibration or it inherits the error.

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
- ⭐ **`inspector-scan --json` has NO top-level `findings` key — it is `rules[].findings`.** Reading
  the wrong key returns `[]` and looks like a clean pass. This produced FIVE vacuous zero-readings
  in one session, two of which were briefly read as evidence AGAINST a working rule. Always filter
  to `status:"FLAGGED"` (raw arrays over-count by the baselined entries: rule 21 reads 141 vs 129).
- ⭐ **`getBoundingClientRect()` is not a visibility test.** It reports the LAYOUT box and knows
  nothing about ancestor `overflow:hidden` or the viewport edge — a clipped, off-screen element
  still reports a healthy size. It caused three false "regression" alarms in one session. Use
  `document.elementFromPoint()` and confirm the hit element IS the target.
- ⭐ **A green build proves almost nothing about editor JS.** `lint:js` is NOT in `prebuild`, so an
  undefined identifier or an unused import ships clean; and an unprefixed `__experimental` import is
  `undefined` at runtime (React error #130) through every gate. Verify live, in both editors.
- **Deploy needs `--payload <prefix>`, never `--allow-dirty`.**
- **Full STOP catalogue + pre-flight ritual: `.claude/STOP-CATALOGUE.md`** (uncapped, D101).

### Other tracks — stable

- **Track 1** — routing audit + tier axis COMPLETE (D480); Phase 4 PARTIAL, 5 OPEN.
- **Track 1c** (Spec 31 converter completion) — build shipped; open item is PROOF not build.
- **Tracks 2+2b** (nav/header/footer) — Wave 1 CLOSED, Wave 2 in progress.
- **Track 3** — CLOSED (D479). ⛔ GSAP is NOT MIT · LYGIA is Prosperity-licensed.

---

## State Snapshot

- **Branch:** `main` at `2ae3c8be`, PUSHED. Nine commits this session (`e1e418aa..2ae3c8be`). ⛔ **Do
  not trust this line for tree state — run `git status`.** Commit by EXACT PATH (a pre-commit gate requires a
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
