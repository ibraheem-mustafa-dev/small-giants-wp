---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-08
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-08 left things, in a sentence each:**
- **Enforcement has started.** The five safety checks that were plugged into nothing are now **wired
  and running on every build** — advisory, so they report without blocking, and each one has been
  proven able to fail.
- **The "53 settings no client can reach" was never the real number.** It counted four hand-audited
  groups only. Measured properly it is **280 across 35 of your 83 blocks** — the 53 sits inside it.
  One block alone (`physics-canvas`) paints 79 settings while offering three controls.
- **Nobody can act on 280 yet** — it has not been separated into genuinely-unreachable vs
  false-alarm. That triage is the next job, and a smaller number is explicitly not the goal.
- **You asked whether the sidepanel tabs should be standardised. Yes — and before ordering.**
  65 of 83 blocks never split into Settings/Styles at all, so there is no order to fix yet.
- **Two blocks still ask a non-technical client to type raw CSS by hand.** One's help text literally
  says "a raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)".
- **The four reviewers were right to tear the contract apart, and something they raised got lost** —
  the ordering point, which you remembered and I had not captured. Their raw output was never saved,
  which is exactly how it went missing. That is now a standing rule.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

**Full narrative + the superseded version of this summary:**
`memory/session-2026-08-08-track1b-enforcement.md`.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (in State Snapshot) — never cache it here.** Recent: **D514 RETRACTS
> D511** (a self-repairing mechanism reverted the test conditions at import — D511/D513 void) ·
> **D515-D517** art-direction tiers, dead-control tier blind spot closed · **D518-D520** preset arrays
> are theme-layer only, shadows renamed by effect, visual-diff gate change-keyed not date-keyed ·
> **D521** art-direction reaches every media block; video needed a RUNTIME SWAP, not sibling markup ·
> **D530** rule 21 advisory; "53" is a FLOOR not a census (live 280) · **D531** CO-28 control ORDER
> is an obligation, UNENFORCED — and PLACEMENT gates it.

### Track 3 — CLOSED (D479). Tier W admitted, physics-canvas shipped.

Narrative + licences: `memory/session-2026-08-03-track3.md`. Binding: ⛔ **GSAP is NOT MIT** (bans
motion-authoring tools competing with Webflow — exposes the Configurator Pro, not client sites) ·
⛔ **LYGIA is Prosperity-licensed** · ⚠ **Snooza = 72 SKUs**.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **Track 1 — routing audit COMPLETE + tier axis SHIPPED (D480); Phases 0-3 COMPLETE (D464, D470-D478),
  Phase 4 PARTIAL, Phase 5 OPEN.** ⚠ **The "`_family_modifier` is a second blocker" line here was
  based on D511/D513 and is SUPERSEDED by D514** — D506 fixed `_family_modifier`, and the tier
  primitive turned out to already exist; what was missing was the DATA SHAPE. `scalar-media` is still
  NOT retirable, but for a different, narrower reason (a residual child block). Spec 35
  prerequisite. Live parity: content 99%, CSS 83/84/89% (worst mobile). Registers:
  `reports/2026-08-02-pipeline-routing-review.md` + `reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
  Narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — POOL 23 → 0, CLOSED (D504);** A7/A8/A9 CLOSED (D508/D509/D510), reseed
  landed; art-direction rollout COMPLETE (D521), verified at first paint.
- **Track 1b enforcement — the control-type contract is AUTHORITATIVE (2026-08-08).**
  `.claude/plans/spec-35-control-type-contract.md` now governs; the 27-condition checklist is a
  TOMBSTONE. Superseding was gated on its **ABSORPTION MAP** proving all 30 items absorbed or
  carried — the 2026-08-07 council caught the first draft losing ten, incl. a live WCAG gate.
  Council findings A/B/C/D/F/G **discharged**; H OPEN by design. ⚠ **A second 4-rater council
  (D527) falsified SIX of this session's own seven claims** — all corrected, but read D527 before
  trusting any figure or scope statement written this session.
  **Read the contract's DISCHARGE RECORD before trusting any body figure.**
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **Independent review beats self-review — three times now.** 2026-08-03 a rater caught two stale
> figures; 2026-08-05 a doc subagent's flag led to inert DB work; 2026-08-06 re-running an agent's
> own claim myself caught three of MY probe bugs. Don't skip the second pair of eyes.

## Standing constraints (carry forward — these are rules, not history)

**MOVED to `STOP-CATALOGUE.md` §E1 (2026-08-05 sweep) — 23 rules, verbatim.** Read before touching
Track 1/DB, sticky/axe/template-lock, or block versioning. Headline: **"IT FUNCTIONS" IS NOT "IT IS
SAFE"** (100% routing accuracy target) · no block version bumps/deprecations pre-production (D293).

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. Commit by EXACT PATH, never `git add -A`; never touch another track's
  uncommitted files.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` + `git status` +
  `git branch --show-current` · D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (heading-anchored — the unanchored form once matched the hex colour `#0D5557` and reported D5557).
  Framework counts via `/sgs-db` or `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** staging/dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654; **art-direction 2161** (hero+media, superseded);
  **2178** `/art-direction-tier-probe/` (4 image blocks, 3 crops each), **2179** `/video-tier-probe/`
  (embed tiers), **2182** `/real-video-tier-probe/` (REAL video, attachments 2180/2181) — the D521
  evidence base; Spec 32 guard-purge canary 2164 (Track 2's).
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast — ⚠ cited a
  `P-MAMAS-PRIMARY-CONTRAST` parking entry that **has never existed** in `parking.md` or
  `STOP-CATALOGUE.md` (the handoff citation gate caught the dangling token 2026-08-06). The issue is
  real and stays recorded here; the pointer is removed rather than a parking entry invented, because
  parking is a commitment and Bean opens those. Park it properly if it needs tracking ·
  two unnamed `<main>` landmarks · both sites GENERIC proof headers · FR-37-36.

---

## Product queue (the website-builder work)

**LIVE backlog:** `plans/strategy/product-queue.md`. Holds the Indus core→SGS migration (A/B/C),
sequenced header/footer goals, Track B reconciliation. Reconcile before acting.

**Standing programmes:** no-inline SUPPORTS migration complete, but 11 inline FR-32 sites across
9 blocks found 2026-07-30 (`reports/2026-07-30-track1-verification-audit.md`, 1 still live:
`cta-section:333`) · Spec 30 (WooCommerce) COMPLETE (D220) · L1–L4 DONE (D290). Parked, not ours:
`P-CONFORMANCE-GOLDEN-DRIFT`, `P-ARCHIVE-PRODUCT-WC-VALIDATION`.

---

## Pointers

| For | Read |
|---|---|
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**NONE.** `--target palestine-lives` still aborts on the `oldshape-audit` (29 NEW HIGH / 28 posts,
evidence: `reports/2026-08-01-palestine-lives-oldshape-blocker.md`), but **palestine-lives is
disposable Indus staging that gets remade — not production**, so this blocks nothing that matters
and the rebuild clears it for free. Fixer if ever needed: `scripts/wp-migrate-oldshape-blocks.js`.
The canary is unblocked and current.

---

## NEXT SESSION (Track 1b / Spec 35) — START ENFORCEMENT, but fix the denominator first

### THE GOAL — state it before picking up any task

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: a control for everything the block can do, none for
what it cannot, one consistent shape across every block. **A setting that needs code to mean
anything is not done.**

### ✅ CLOSED — do not re-open

Pool 23→0 (D504) · A7/A8/A9 (D508-D510) · art-direction tiers (D521) · **Tier 0 data layer, all four
columns (D523 + D525 + D527)** · **the 27-condition checklist → control-type contract (D524)** ·
**`sgsCustomCss` stays (D526)** · **2026-08-08 enforcement session: Task 1 roster re-measure (EMPTY
DIFF — the DB writes did NOT restage `surfaces.*`), Task 2 rule 21 (D530, `76f44a1d`), Task 3 five
dead gates wired advisory (`071b7915`), CO-28 recorded (D531).**

### ⛔ READ FIRST — D527 corrected SIX of the previous session's own seven claims

A 4-rater `/qc-council` falsified most of what the 2026-08-08 session asserted about its own work.
Everything is corrected and committed (`5a48acfd`), but **do not trust a figure or a scope statement
written that session without checking D527.** The corrections that change what you do:

- **`box_family` was 7; the real population was 13.** Now zero object-typed box attrs read NULL.
- **`sgs/content-collection` is DELETED (D529)** — block count 84 → **83**. Its deletion broke the
  build until `card-grid`'s imports were relocated; see D529 before quoting any 84-based figure.
- **The Tier 0 fix MOVED A SCOPING AXIS.** `build-roster.py:91` derives `surfaces.*` from a haystack
  that includes `inspector_control_type` — so writing that column restages `roster.json`.
- **"Fossils had no reader" was FALSE** — `mcp/server.py` `search_blocks()`/`match()` read the full
  capability table. Pruning was a trade-off, not free. **OPEN for Bean.**
- **`inspector_control_type` is 64.6% NULL** (1,753/2,712 `sgs/%` rows; unscoped reads 70.2%). Trust a non-NULL value; NEVER read NULL as "no control".
- **The D523 repeater guard is fragile** — `pricing-table::plans` fires only by coincidence with a
  shadowing local. A rule scoping arrays needs its own AST cross-check.
- **"Tiers 1–4 unblocked" was an overclaim** — honest per-tier scope below.

### The contract GOVERNS; enforcement has STARTED

`.claude/plans/spec-35-control-type-contract.md` is AUTHORITATIVE. 14 control contracts + §CARRIED
OBLIGATIONS (13 carried, CO-2…CO-21, incl. **CO-15/CO-18 restored by D527**, plus **CO-28 NEW,
Bean-raised 2026-08-08 — numbered above the 27-condition space so it cannot squat on a carried
item's number; NOT in the ABSORPTION MAP**) + §13. The 27-condition checklist is a tombstone.

⚠ **ABSORPTION MAP "30/30" NOT fully verifiable (2026-08-08).** Rows **22, 24, 25, 26** say `CARRIED`
and name **no destination**; every other row cites a CO or §field — the defect the council caught
twice in that table (15→X-cutting B, 18→§7+CO-19). **UNVERIFIED, not discharged**; note at the map.
Cite each one's live artefact (26 → `zeroIsAClaim`) or give it a CO; never guess.

⚠ **The council's raw output was never preserved** — no 2026-08-07/08 report in `reports/`/`memory/`,
only summaries (A–I, D527, the map). Hence the ordering point was lost until Bean recalled it.
**Future councils: commit verbatim per-rater output before acting.**

---

## ⭐ NEXT SESSION — orchestration plan

**Identity.** SGS framework engineer. Tier 0 done, **enforcement started** — one Tier 3 rule shipped,
five dead gates wired, all advisory. Job: make the 280 MEAN something, then fix PLACEMENT (which
gates CO-28).

⛔ **READ D530 BEFORE QUOTING ANY FOURTH-QUADRANT NUMBER.** "53" is not the population — it sums four
audited families and counts only `physics-canvas`'s BOX subset, not that block's 79 unreachable
container attrs. Live is **280 across 35 of 83 blocks**, containing the 53. **280 is not yet a
backlog figure** — untriaged.

### Task 1 — Triage rule 21's 280 into REAL vs FALSE POSITIVE

**What/Why:** per-block triage + baseline false positives WITH reasons. Until then 280 is unusable
and the rule can never be promoted; the audited 53 is verified family-by-family, the residual ~227 is
a MIX, not a backlog.
**Known real:** `physics-canvas`'s 79 — `edit.js` read IN FULL, exposes exactly 3 controls
(`physicsGravity`/`Bounce`/`EdgeResistance`). **Known FP:** `team-member.overlayHover` (§6 field 5:
behavioural flag, not a state pair) — expect siblings.
**Method:** `node run.js --json`, largest block first; open each `edit.js` and decide. Baseline in
`inspector-scan/baselines/21-render-without-control.json` with a REAL reason — never to shrink a
number. ~40 min for the top 6 blocks (~200 of the 280). Inline, Opus; judgement per block.
**Acceptance:** every baselined entry carries a checkable reason; surviving count stated with its
denominator. **A smaller number is not the goal.**

### Task 2 — PLACEMENT: fix the 6 extension files (+ wire extensions visibility)

⛔ **PLACEMENT BEFORE ORDER (Bean-approved 2026-08-08, D531).** **65 of 83 blocks have 2+ panels and
no `group` prop** (`01-tab-group`, the scanner's largest backlog) → everything lands in Settings.
**Order cannot be standardised across Settings/Styles while most blocks never split into two tabs.**
Placement needs NO design gate — 12 of 14 contracts carry a `Tab` field; §6 field 4 is the
discriminator: **behaviour → Settings, appearance → Styles.**
**What:** the 6 universal extensions inject into ALL 84 blocks via a bare `<InspectorControls>`.
WRONG: `animation.js:138` (motion=Styles), `hover-effects.js:279`, `image-controls.js:157`
(sizing=Styles). Correct already: `fx.js`, `custom-css.js`, `block-defaults.js`. Also `parallax.js`
splits ONE feature across two tabs by accident (:144 `group="color"` vs :182 bare).
**Why here:** 3 files fix placement on every block at once — above the 65-block grind.
⚠ **UNGUARDED:** nothing scans `src/blocks/extensions/` (no `extensionsDir`; rule 01 reads per-block
`edit.js`), so this can silently regress. **Wire that visibility WITH this task.**
**Acceptance:** live editor check on the canary (R-31-11), not the emit.

### Task 3 — Work the 65 down + default-open, then gate

Per-block `group` props; fold in **default-open discipline (23 blocks violate**, `decorative-image`
opens 5 of 7) — same files, same pass, or you touch them twice. Then promote `01-tab-group` to gate
ONLY at zero backlog. **CO-28 (order) starts after that**, still needing its own two prerequisites:
Bean picks the canonical order (Rule 7 gate), then a census (`zeroIsAClaim`).

### ⛔ Do NOT start these — blocked, with the reason

- **Any rule crossing the EXTENSION SURFACE.** `inspector-scan` cannot see `src/blocks/extensions/`:
  no `extensionsDir` in `run.js` `buildCtx`, and `core/roster.js:58-70` admits only directories
  containing a `block.json`. Unbuilt plumbing, not a rule to remember.
- **§14 BORDER.** Its own conformance field says "not yet measured"; `zeroIsAClaim` requires an
  independent census first.
- **Tier 1 (shared-file fixes).** Nine Rule 7 design gates — needs Bean, not a database.

### Dependency graph

```
Task 1 (inline, Opus — regenerate + diff the roster)
  ↓
Task 2 (inline, Opus)      Task 3 (delegated, Sonnet — parallel)
  ↓ /qc-inline + --self-test      ↓ /qc-inline
              commit + push (exact paths, main)
```

### Tooling for next session (WordPress project — Gate 5)

| Skill | When |
|---|---|
| `/brainstorming` | Before any design choice (the two open questions below) |
| `/strategic-plan` | If Task 2 grows past one rule |
| `/research` | Auto-routes tier; use before recommending anything unfamiliar |
| `/gap-analysis` | Grade the new rule before calling it done |
| `/lifecycle` | ANY skill/agent/pipeline edit — start the pipeline first |
| `/sgs-wp-engine` + `/wp-blocks` + `/sgs-db` | SGS ground truth — query, never guess |
| `/qc-inline` · `/qc-council` | Per-task gate · before any converter/pipeline commit |
| `/systematic-debugging` | Root-cause gate if a rule misfires |

| MCP / tool | For |
|---|---|
| Playwright or chrome-devtools | Live editor/DOM verification (R-31-11). ⚠ `selectBlock` flips the sidebar to the Page tab — poll for the inspector, and one block per call; long loops do not yield to React |
| `sgs-db.py` / `wp-blocks.py dump` | Schema + counts before any "missing X" claim |

| Agent | When |
|---|---|
| `wp-sgs-developer` | Heavy SGS build work |
| `code-reviewer` | Before committing the new rule |
| `general-purpose` (Sonnet) | Task 3's gate-wiring |

### Open questions for Bean

1. **Reinstate capability discovery keywords?** D525 pruned 36 tags; two MCP discovery tools read
   them. Restore declaratively, or accept the degradation?
2. **Multi-attribute façades** (`ContainerWrapperControls`) cannot be recorded in a single-value
   `inspector_control_type`. Contract question, still unanswered.

### Also queued (NOT next session unless Bean redirects)

- **Pointer-reactive container backgrounds — GATE SIGNED 2026-08-07, build NOT started.** Route B, all
  four looks, client-selectable. Contrast is a CONTROL not a gate (Bean). Reduced-motion SUPPRESS +
  coarse-pointer degradation mandatory. `FR-38-28`.
  Plan: `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md`. ~2h + ~30 min/look.
- **Parking: 61 entries**, the 10 machine-checkable ones verified 2026-08-07, all genuinely OPEN.
- **MEMORY.md is 235 bytes from its cap** — a compaction is owed.

### Methodology guardrails (do not skip — every one was earned)

- **A grep count is not a measurement — and provenance is not derivation.** 2026-08-08: block-link
  reach was measured correctly at 67 early in the session, then overwritten with an agent's "~82"
  without checking it against my own output. Separately, "17 stylesheets carry the guard" counted
  REMOVAL COMMENTS as breaches while a wired gate passed clean. Re-derive; never relay.
- **A gate reading green is not the claim you are making.** Read a gate's PREDICATE before citing it.
  `check-no-core-blocks` passes while 4 pattern files use core blocks — its ban-list omits them.
- **Detect by what a control DOES, not what it is called.** Every gate keyed to a component name has
  a blind spot by construction — rules 04/08/07/20 each missed a lookalike, and the DB's
  `_KNOWN_CONTROLS` has the identical bug. Enumerate the lookalikes before shipping a rule.
- **A gate can exist and be wired to nothing.** Five found 2026-08-08 with 0 refs in `package.json`.
  Grep the WIRING, not the file, before writing "unenforced".
- **A documented prior decision refutes the fix you are writing.** Four component headers this
  session modelled and REJECTED the option a contract proposed. Read the header before proposing.
- **Measure the LIVE tree, not a worktree copy** — `.claude/worktrees/` holds 10 stale duplicates
  with identical paths and plausible contents.
- **Test the RETURN path** (A→B→A, never A→B) · **verify at FIRST PAINT**, viewport then fresh
  navigation · **assert on measured `window.innerWidth`** · **include a positive control** before
  trusting any zero.
- **`git status` the artefact dir BEFORE writing**, not before committing. `M` where you expect `A`
  means you are about to destroy another session's file.
- **A shared-DB reseed is a cross-track action.** Back up, diff, check every pruned row.
- **Shared worktree:** stage AND commit by EXACT PATH (`git commit -- <paths>`); never `git add -A`,
  never `git stash`. A bare `git commit` flushes the whole index — the path-scope hook catches it.
- **Re-check the D-ceiling before writing any D reference**, heading-anchored:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

### Known non-blocker

`npm run build` is green as of this session — **927 pass, 2 skipped**, every prebuild gate passing,
measured after the `/sgs-update` reseed. (The older "672 pass" figure in this slot was stale.)

### Open — carried, not ours to close

- ⚠ **Track 2's canary (post 2164) lost a text node** on 2026-08-07. 5 undeclared attrs were migrated
  via the editor data layer (D516 §2), but `sgs/mega-group`'s `templateLock:'all'` dropped its stored
  `sgs/text` child on load and it could not be re-inserted. Already doomed — any editor save would
  have done it — but **Track 2 should re-count their text-owning nodes**. No gate covers
  "children vs templateLock"; the oldshape audit checks attrs only. Track 2's call.
- **Residual empty `sgs/media` ChildBlock** in the art-direction walk (D514), emitter untraced. Blocks
  the `scalar-media` retirement alongside a durable data shape and a non-hero fixture.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT to `memory/session-2026-08-05-swept-narrative.md` (verbatim, neither closed).** Snooza
pitch-demo tasks 1-4 + Track 1 routing R1-R4 (R4/R1 shipped 2026-08-04; R2/R3 open). ⚠ **R3 is
blocked on `scalar-media`** — see "Open, not ours" above; it is NOT retirable yet (D511 → D514).
