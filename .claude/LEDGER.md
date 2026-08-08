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
- **You were right that the 27-item checklist was the wrong shape. It has now been replaced** by a
  **contract per control type** — for colour, links, sizes, hover, media and so on, one fixed way of
  doing it, with a written list of the wrong-but-similar ways to catch. The old checklist is retired.
- **Why the old shape kept failing:** each rule was written against the one component its author had
  in mind, so anything doing the same job under a different name walked past. A gate went "40 → 0",
  someone wrote "DONE — all raw URL fields migrated", and the two biggest offenders had never been in
  that gate's field of view at all.
- **Five safety checks exist and are plugged into nothing** — including the linter you already pay
  for, which reports 11,932 problems the moment it's run. That's most of Task F's work: wiring, not
  writing.
- **53 settings your framework renders that no client can reach.** Declared, painted on the page, no
  control anywhere. Proven by running the check that's supposed to catch them — it sees none of them.
- **Two blocks ask a non-technical client to type raw CSS by hand.** One's help text literally says
  "a raw CSS box-shadow value, e.g. 0 6px 24px rgba(0,0,0,0.15)".
- **I had the whole thing torn apart by four independent reviewers first, and they were right to.**
  It would have deleted an accessibility requirement, wiped the only written record of your
  phone/tablet sizes, and reverted a fix you diagnosed yourself. Eleven of my numbers were wrong.
  **All of that is now fixed and the replacement is signed off** — every one of the 30 old items is
  either folded into a control contract or carried over word-for-word, with a table proving it.
- **Your instinct about the database was correct.** The categorisation every new rule gets aimed with
  was wrong in four places, and the cause was the *same* bug as the gates: a hardcoded list of
  component names. **All four are now fixed.** 41 settings were filed under the wrong kind of control
  (a border width filed as a colour picker); and 36 categories turned out to be **dead labels — no
  code wrote them, no code read them, for months**. The plan wanted to revive them; instead each
  block now states the one fact that was actually needed about itself.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND (in State Snapshot) — never cache it here.** Recent: **D514 RETRACTS
> D511** (a self-repairing mechanism reverted the test conditions at import — D511/D513 void) ·
> **D515-D517** art-direction tiers, dead-control tier blind spot closed · **D518-D520** preset arrays
> are theme-layer only, shadows renamed by effect, visual-diff gate change-keyed not date-keyed ·
> **D521** art-direction reaches every media block; video needed a RUNTIME SWAP, not sibling markup.

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
  Council findings A/B/C/D/F/G **discharged** (G = D526: keep `sgsCustomCss`); H stays OPEN by design.
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

## NEXT SESSION (Track 1b / Spec 35) — TIER 0 DATA LAYER, then restore the dropped conditions

### THE GOAL — state it before picking up any task

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: a control for everything the block can do, none for
what it cannot, one consistent shape across every block. **A setting that needs code to mean
anything is not done.**

### ✅ CLOSED this track — do not re-open

Pool 23→0 (D504) · A7/A8/A9 (D508/D509/D510) · variant matching (D512) · art-direction tiers across
every media-bearing block (D521, `e5f85753`) · Task 0 real-video proof (`6777f8d0`) · the Spec 39
reply IS SENT (`22436d19`). ⏳ No reply back from that track yet.

### TASK F — the contract now GOVERNS; enforcement is still unbuilt

`.claude/plans/spec-35-control-type-contract.md` is AUTHORITATIVE (2026-08-08). **One fixed shape per
CONTROL TYPE** — canonical component, required props, **banned lookalikes**, tab, scoping axis.
14 contracts + §CARRIED OBLIGATIONS + the ABSORPTION MAP + §13 (every shape with no contract yet,
enumerated so none is homeless).

**Why the old shape failed, in one example:** rule 08 matches `<TextControl type="url">`. It went
40→0, and Spec 35 Part M recorded *"Wave 1 DONE — migrated across all raw-URL fields"* — while
`sgs/button`'s `<URLInput>` and a raw URL field injected into **67** blocks from
`extensions/hover-effects.js` had never been in the gate's scope. The zero was true of what the gate
could see; the doc turned it into a claim about the world. **The generalised fix is the EXTENSION
SURFACE axis** — no DB column can see a filter-registered attr, so every rule must also read
`src/blocks/extensions/*.js`.

✅ **ALL FOUR Tier 0 columns are now correct (D523 + D525). Tiers 1–4 are UNBLOCKED.**
`isCollectionKind()` = a `collection` capability row, declared via `supports.sgs.collection`
(15 blocks). ⛔ **Do not run `populate-db.py`** — it reintroduces pruned fossils and clobbers
`block_selectors`. ⚠ Still open: `arrayContentLift` for `testimonial-slider`/`content-collection`
is converter-read → a Rule 7 change, not done.

---

## ⭐ NEXT SESSION — orchestration plan

**Identity.** You are the SGS framework engineer. Two fronts, strictly ordered: **fix the
categorisation data**, then **restore what the contract dropped**. Build no enforcement until both
are done.

**State recap.** A control-type contract now exists in draft but is **NOT authoritative** — a
4-rater `/qc-council` found it would have dropped 10 conditions (including a WCAG gate), contradicted
3 recorded decisions, and carried 11 wrong figures. The 27-condition checklist REMAINS in charge.
Separately, the DB columns every future rule would scope against are wrong in four places — and the
root cause of the worst one is the same hardcoded-name bug the contract exists to end.

### Task 1 — Tier 0: the `sgs-update` data layer (Bean-ruled priority)

**What:** make the block categorisation accurate, so scoped rules can be trusted.
**Why:** a rule scoped to a wrong axis reads green while passing the blocks it exists to catch.
Bean's own gallery example proves it: the fix depends on `isCollectionKind()` reading
`block_capabilities`, and `sgs/gallery` carries **zero** capability rows.
**Estimated time:** ~15 min for steps a+b; c is a design job.

> ✅ **(a) + (b) LANDED 2026-08-08 — D523, commit `e73bacde`, pushed.** 7 `box_family` values
> declared in block.json; 41 `inspector_control_type` rows corrected (10 NULL, 31 wrong), measured on
> a sandbox DB copy first, idempotent on re-run. A repeater guard was added in the same pass to stop
> the widened roster crediting an array attr to its per-item control. The 37 conformance failures are
> PRE-EXISTING (baselined by restoring the pre-change DB: 37 before, 37 after). **Residual:**
> `site-{header,footer}-row` `padding`/`margin` still read NULL — edited via `ContainerWrapperControls`,
> a multi-attr façade that names no single attr; needs a design call, not a name in a list.
> **(c) and (d) below remain OPEN.** Original analysis kept for the (c)/(d) work:

All four columns DONE — (a)+(b) D523, (c)+(d) D525. Detail: `decisions.md` + the contract's
§Tier 0. Nothing further is owed here.

**Orchestration:** (a) and (b) inline — small, mechanical, and (b) is the one measurement that must
not be delegated. (c) and (d) are design work → `/brainstorming` before any build.
**Rehearsal, safe:** `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 1 --dry-run`.
⚠ `--dry-run` genuinely does not write, **but UNDER-REPORTS** — the Stage-1 tail subprocesses are
skipped, so it previews nothing of the control-type regen.
⚠ **A shared-DB reseed is a cross-track action.** Back up, diff, check every pruned row.
**Depends on:** none. **Parallel with:** none — everything else is scoped against this.
**/qc gate after:** `/qc-inline` for (a)+(b); `/qc-council` before any (c) build.
**Acceptance:** each of the four columns either reads correctly against a live spot-check, or is
recorded as needing a design decision with the decision named. Not "the script ran".

### ✅ Task 2 — CLOSED 2026-08-08 (D524). Do not re-open.

All 10 dropped conditions + T1/T2/T3 restored into §CARRIED OBLIGATIONS; §14 BORDER created for
condition 7's dropped half; 11 figures corrected at their body sites (not just in the verdict table);
3 contradicted proposals withdrawn in-body; scope errors S1–S6 fixed, S1 generalised into a new
EXTENSION SURFACE axis; §10 split into §10/§11/§12 at 8/8 fields each, plus §13 enumerating every
control shape that still has no contract. ABSORPTION MAP proves 30/30 accounted, 0 dropped.
Checklist tombstoned; Spec 35 N.3's dead "0 of 24" figure removed; brand-strip note re-pointed.

### ✅ Task 3 — CLOSED 2026-08-08 (D526). Do not re-open.

**Answer: NO — keep `sgsCustomCss`.** WP 7.0's native per-block CSS wraps every rule as
`:root :where(...)` = **0,1,0**, and SGS blocks paint at **0,2,0**, so a native rule can never
override the block it is meant to correct. It also has **no `@media` branch at all**, while the
residual band is by definition `@media`-bounded — it would be dropped silently. Both read from
`wp-includes/` on the canary (source read, not an execution — the `wp eval` guard blocks read-only
evals by name). Satisfies CO-16 for this control.

**Premise check:** the reported symptoms did NOT reproduce. Live canary editor, all **348** block
types: native disabled on 348/348, `sgsCustomCss` present on 348/348. `ece1487b` only ADDED the
disable. Only native content anywhere is `color: red;` on untitled draft 2145 — the 2026-08-03
proof value. Nothing lost, nothing to fix. Bean: leave placement as-is.

### Dependency graph

```
Task 1a + 1b (inline, Opus — data layer, cheap + mechanical)
  ↓                                    Task 2 (doc-only, parallel)
Task 1c + 1d (/brainstorming — design)   ↓
  ↓                                    /qc subagent → tombstone
/qc-council  →  commit + push
                     ↓
              Task 3 (design gate with Bean)
```

⛔ **Build NO enforcement scripts until Task 1 lands.** Every contract scopes to an axis; four of
those axes are currently wrong.

### Also queued (NOT next session unless Bean redirects)

- **Pointer-reactive container backgrounds — GATE SIGNED 2026-08-07, build NOT started.** Route B (a
  background mode in `SGS_Container_Wrapper`, inherited by every wrapper-bearing composite — a Rule 7
  shared-mechanism change), all four looks, client-selectable, colours + intensity operator-editable.
  Bean overruled the contrast risk: **contrast is a CONTROL, not a gate.** Reduced-motion SUPPRESS +
  coarse-pointer degradation stay mandatory. **FR = `FR-38-28`** (re-check — Spec 38 moves).
  Plan: `.claude/plans/2026-07-31-step7-cursor-follow-background-design-gate.md`. ~2h + ~30 min/look.
- **Parking: 61 entries; the 10 machine-checkable ones verified 2026-08-07, all genuinely OPEN.** The
  other 51 not individually re-tested. Accurate backlog, not stale bookkeeping.

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
