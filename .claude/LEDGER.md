---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-06
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-06 left things, in a sentence each:**
- **The 14 half-finished blocks are finished and live.** They were described as waiting on a
  screenshot check; they actually did not build at all. Two settings were wired to nothing — a client
  could pick an option and nothing would happen. Both fixed.
- **Your footer spot was a real bug.** Screen readers had no way to jump to the footer on any page,
  because nothing marked it as one. Now there is exactly one, checked on the live site.
- **A piece of the framework had been switched off without anyone noticing** — a spelling mismatch
  meant 56 settings across 7 blocks were being skipped. Working again.
- **A warning that cried wolf on every run now only fires when something is genuinely wrong.**
- **69 settings still need a human decision — and they need YOUR decisions, not more code.** No
  amount of clever detection closes them; that is the honest shape of the remaining work.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

## CURRENT FRONTS

> **D-ceiling 504** — re-measure before writing any D reference, never trust this line:
> `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
> **D504 (2026-08-06) = Spec 35 pool 23 → 0**: four detector defects and two built-but-inert
> mechanisms. D499-D503 = the Step 0.1 close.

### Track 3 — CLOSED (D479). Tier W admitted, physics-canvas shipped.

Narrative + licences: `memory/session-2026-08-03-track3.md`. Binding facts: ⛔ **GSAP is NOT MIT**
(Prohibited Uses bans visual-motion-authoring tools competing with Webflow — exposes the Configurator
Pro, not client sites) · ⛔ **LYGIA is Prosperity-licensed** · ⚠ **Snooza = 72 SKUs**.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **Track 1 — routing audit COMPLETE + tier axis SHIPPED (D480); Phases 0-3 COMPLETE (D464, D470-D478),
  Phase 4 PARTIAL, Phase 5 OPEN.** Tier axis does not yet reach `splitImage` (`scalar-media` blocks it
  — Spec 35 prerequisite). Live parity: content 99%, CSS 83/84/89% (worst mobile). Registers:
  `reports/2026-08-02-pipeline-routing-review.md` + `reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
  Narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — POOL 23 → 0, CLOSED 2026-08-06 (D504).** Every `sgs/%` string attribute
  carries a role, all by MECHANISM, zero hand overrides. Four REAL bugs fixed en route
  (image-sequence content drop · inert `link-content` chain · `sgs/separator` icon routing ·
  `form.formName` dead control → the form's accessible name). Next = **A7, A8, A9** under NEXT
  SESSION. **Task B is running in a PARALLEL session — do not touch it.** Then Task F.
- **Track 1b enforcement baseline (2026-08-04, D481-D484):** 0 of 24 end conditions had a validated
  script (1 enforced/8 partial/4 vacuous/2 unwired/9 absent). Tasks C+D closed 2 of those 2026-08-06;
  CHECK 5 (dead assignment) added 2026-08-06. **Task F closes the rest — bar = `STOP-CATALOGUE.md`
  §E6, and "has a script" is not the bar.** Narrative: `memory/session-2026-08-04-spec35-enforcement.md`.
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
  (**heading-anchored on purpose** — the old unanchored form reported D5557 on 2026-08-01 by matching
  the hex colour `#0D5557`; true ceiling was D453)
  (currently D498 as of 2026-08-06 — re-check live BEFORE writing any D reference; this line has
  drifted before and will again) · framework
  counts via `/sgs-db` or `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** staging/dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654.
- **Latent + open (not blockers):** Mama's `#e68a95` text-contrast (`P-MAMAS-PRIMARY-CONTRAST`) ·
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

## NEXT SESSION (Track 1b / Spec 35)

### THE GOAL — state it before picking up any task

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: a control for everything the block can do, none for
what it cannot, nothing that crashes, one consistent shape across every block. **A setting that
needs code to mean anything is not done.** The 24 end conditions are only worth having if ENFORCED —
measured 2026-08-04 at 0 of 24, which is what Task F exists to fix.

### ✅ STEP 0 + 0.1 + 0.2 CLOSED. **POOL 23 → 0 on 2026-08-06.**

Every `sgs/%` string attribute now carries a role, assigned BY MECHANISM — **zero hand overrides**
(D497). Every bucket reads 0: assignable, report-only, vetoed, content-gaps, D4-review.

⛔ **Do NOT trust that number from this file. Re-measure:**
`cd plugins/sgs-blocks/scripts/content-role-detect && python fingerprint_content_roles.py`

Nine commits: `0ecdbbd2` `32b4fbd7` `e1402858` `8f533bd6` `03cb6a68` `cc74de57` `ca5a336c`
`628936d0` `50c93837`. **Full narrative + every measurement:
`memory/session-2026-08-06-spec35-task-a.md`.** Decisions log has the compressed record.

**Four REAL bugs were fixed along the way — this was never only classification:**
1. `sgs/image-sequence` dropped its poster image AND alt text on clone (root cause was DATA — a
   missing `media`-slot alias — not converter code).
2. The `link-content` chain (role + extractor + reader) was fully built and **completely inert**.
3. `sgs/separator` icon cloning was BROKEN — 3 of its 4 icon kinds were mis-roled on what is a
   converter ROUTING KEY.
4. `sgs/form.formName` had a live editor control and rendered NOTHING; now the form's `aria-label`,
   which also closes a real WCAG gap (an SGS form had no accessible name at all).

Plus: 3 genuinely dead controls wired, 2 abandoned attrs deleted, 13 dead locals removed, and a new
CHECK 5 gate. All deployed to the canary and visual-diff evidenced.

### ⭐ NEXT SESSION — A7, then A8, then A9

| # | Task | State |
|---|---|---|
| **A7** | **attrMap occurrence-count method.** ⛔ **My original fix-shape was REJECTED by /qc-council — do not rebuild it.** Its premise was FALSE: `sgs_button_element_style_css` is ALREADY in D7's `CSS_HELPERS` (`detector7_css_paint_flow.php:82`); D7 fails on product-card because the block passes the whole `$attributes` bag, so `carriers_for()` builds no carrier at all. The file's own comment (`:96-100`) models and DECLINES a prefixed-helper recogniser, pointing at `property_suffixes` (R-31-1). **BUILD INSTEAD:** count `css:*` keys in `block.json`'s `attrMap` — 1 + a colour-terminal property → `color`; >1 → shorthand → `styling`. Verified by hand on all 4 candidates: `ctaColourBorder` 1, `gridItemBorder` **3** (`border-width`+`border-style`+`border-color`). This makes the `gridItemBorder` guard hold **BY CONSTRUCTION** — today it survives only because D7 cannot reach the file, so its documented "it is a shorthand" reasoning has never actually been exercised. Cheaper than D7: a JSON key-count, no PHP tokeniser. ⚠ **Separate real bug it surfaced:** `block_attributes.css_property` is LOSSY for shorthands (it flattened `gridItemBorder`'s 3 keys to 1, erasing the very signal that distinguishes a shorthand from a colour) |
| **A8** | **Header/footer grid design gate.** Evidence gathered + verified twice (agent, then me directly). `sgs/site-header` and `sgs/site-footer` each carry a **14-attribute grid surface that can never fire**: every emit is gated `'grid' === $layout` (`class-sgs-container-wrapper.php:669,702`) and `layout` is `{"type":"string","default":""}` with NO enum and NO writer — no editor control, no theme pattern, no template part, no template, and the converter chrome-skips header/footer entirely. Both row blocks got an enum in D456 to close exactly this landmine; the parents did not. No gate can see it: `supports.sgs.elements` is declared on 79 blocks and absent from all four header/footer blocks, so the orphan pass SKIPS them. **Bean's architecture read (correct, and Spec 37 §3.1-3.3 backs it): the ROWS own layout, not the parents.** ⚠ **Read before proposing anything:** Spec 37 §7 constraint 2 records that block-private rendering for header/footer was **REJECTED 6/6 by an adversarial council on 2026-07-25** — but deleting a dead surface while KEEPING the wrapper does not re-open that decision (it is the D499 precedent applied again). Feed the answer forward to **FR-37-22** ("emittable by construction", NOT-BUILT) so Spec 33 Part 2 inherits it |
| **A9** | **Rework the seeding setup** per the critique + context from the Spec 31 cloning-pipeline agent. ⏳ **Bean supplies that input once A7 and A8 are fully closed** — do not start A9 before it arrives |

**Then → Task F** (build the remaining enforcement scripts; the track's actual deliverable).
**Task B is being worked in a PARALLEL SESSION — do not touch it.**

### Methodology guardrails (do not skip — every one was earned this session)

- **Declare the expected population BEFORE the run.** A number below expectation is a claim needing
  evidence; a number ABOVE it needs per-row justification, never a silent accept.
- **A zero from a search you wrote requires a POSITIVE CONTROL.** A dead-assignment probe returned
  "0 findings" and was wholly vacuous — a broken regex, not a clean codebase.
- **The ONLY valid proof a role is mechanism-derivable: clear the row, reseed, read it back**
  (STOP-71). A probe calling the function directly proves nothing.
- **A built mechanism is not a REACHED one.** Two mechanisms were fully built, self-tested and inert
  because nothing fed them their candidates. Gate on the observed end state, never on code existing.
- **A detector's negative result describes the DETECTOR.** One gap — a detector that will not cross
  a boundary — surfaced in four separate tasks this session.
- **Verify a subagent's ABSENCE claim before acting on it** (STOP-73). Twice today an unverified
  "these rows are broken" would have sent me into needless surgery; measuring first avoided both.
- **`/sgs-update` is a CROSS-TRACK action on a shared DB** — announce, back up, hash-verify, then
  diff PER ROW against the backup. A population count cannot see a reclassification (§E1).
- **Shared worktree:** commit BY EXACT PATH, never `git add -A`. ⚠ I deleted a concurrent track's
  visual-diff reports today with a careless `rm` and had to `git checkout` them back — check what a
  glob actually matches before deleting.
- **Re-check the D-ceiling immediately before writing any D reference**, heading-anchored:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

### Known non-blocker

`npm run build` and the converter suite both pass. ONE pre-existing failure —
`test_content_gap_collector.py::test_sgs_tabs_fixture` — is PROVEN not ours: it fails identically
when re-run against the restored pre-session DB. Converter suite 634 pass.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT to `memory/session-2026-08-05-swept-narrative.md` (verbatim, neither closed).** Snooza
pitch-demo tasks 1-4 + Track 1 routing R1-R4 (R4/R1 shipped 2026-08-04; R2/R3 open). ⚠ **R3 is
blocked on `scalar-media` — the same role Task B tier 5 retires, so B unblocks R3.** Read the
pointer file; do not re-derive from memory.