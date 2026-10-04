---
title: Eye Care whole-site sweep, gap audit and framework fix sessions
project: small-giants-wp
created: 2026-10-04
status: active
governs: Spec 47 §5 stage 3 (.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md); the fix register .claude/plans/2026-10-02-eye-care-fix-register.md
---

# Eye Care: whole-site sweep, gap audit, framework fixes

**Goal:** know exactly what is left on every Eye Care surface, which of it is Bean's decided difference, a real
framework gap or a walker gap (each proven), then fix every real framework gap in one orchestrated pass before
per-surface walker work resumes.

**Why now (Bean, 2026-10-04):** per-surface work hides the site-wide picture. Contact took a whole session to go from
134 to 19 issues, and 13 of 17 surfaces have never been measured with today's walker, so nobody knows what is already
fixed, what the register still needs, or whether "missing setting" labels are true.

**Order:** Session A (sweep) → Session B (audit + divergence protection + writes Session C's detailed plan) →
Session C (framework fixes) → Session D (back to walker work, ranked by the sweep). Each session ends with `/handoff`.

## Terms (for a cold reader)

- **Walker:** `scripts/parity/draft-live-walk.mjs`, measures draft and live pages at 375/768/1440 and lists every
  painted difference as a row.
- **Pairing:** `scripts/computed-route/pairs.mjs`, matches each live block (class `cr-ref-<surface>-<n>`) to its
  draft element and writes the full walker config `qa/parity/<surface>.full.mjs` (`walkerFull` in `surfaces.json`).
  A surface without it walks only a short hand-written list of pairs.
- **Solve:** `scripts/computed-route/solve.mjs`, walks, writes block settings, rebuilds, repeats, then labels each
  surviving row (`lib/solve-rows.mjs::classify`): Hardcode (the setting holds the draft value but paint still
  differs), Missing setting (the framework DB routes no setting to that property and element), Unresolved (with a
  reason), Derived box rows (positions and sizes, consequences, never written).
- **Ledger:** `sites/eye-care-ward-end/build/qa/divergences.json`, Bean's decided differences. A matching row is
  compared against the decided value instead of the draft and is never written.
- **Register:** `.claude/plans/2026-10-02-eye-care-fix-register.md`, Bean's reviewed fix list (merged from
  `Eye Care Fix Register- Bean Points.md`), the standard every surface is judged against.

## Where things stand (2026-10-04, fc36ea861)

| Surface | Paired with today's walker | Open distinct issues | Labelled gaps (Hardcode/Missing) | Ledger entries |
|---|---|---|---|---|
| About | yes (24 blocks) | 0 | 0 | 12 |
| Contact | yes (33 refs) | 19 (all box rows) | 0 | 19 |
| Contact form | yes (6) | 46 (last Solve restored) | 9 of 23 after that Solve | 0 |
| Lenses | yes (28 of 29) | 57 (last Solve restored; reached 33) | 9 of 33 | 0 |
| Help, Home, footer | refs stamped, hand config only | unknown | Help's 2026-10-03 report predates today's classifier | 0 |
| Header, mobile menu, 4 megas, size guide, lens, shop, product | no refs, hand config only | unknown | unknown | 0 |
| Bag, checkout, confirmation | hand config only, not in `surfaces.json` | unknown | unknown | 0 |

Known limits of the labels: Solve's "Missing setting" means only "no DB row routes this property to this element". It
is a lookup result, not a proven gap. Of Lenses' and the form's labels, several read like walker artefacts
(container `transform` and `opacity` rows, likely mid-entrance-animation; `display` on form inputs) or settings that
exist elsewhere (textarea `max-width`). Session B proves each one.

Register: 187 surface items plus 21 route findings (CR1 to CR21); about 30 marked closed. Its Type column (tree,
framework repair, framework new, content, client) was set by investigation on 2026-10-03 and has not been reconciled
with walker rows since.

---

## Session A: whole-site sweep (measure, never write)

**Done when:** every surface has a walker report taken from one commit with live = HEAD; every register item carries
one sweep status; every claimed fix is confirmed live or reopened; register, Spec 47 plan Progress, Spec 47 §5 and
LEDGER Front F state the result. **Estimate:** realistic ~3 h, about 2 h of it unattended host time; ~1 h 40 only with no host 403s and no panel config overrunning.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| A-1 Read what DevTools reads | Before the sweep, so it measures truthfully (Bean, 2026-10-04: these gaps are data DevTools already shows). Each a general walker fix with a MUST FAIL test and a tool-log line: (1) settle on `document.getAnimations()` finishing instead of the fixed `state.settle ?? 900` wait in `draft-live-walk.mjs` (no row read mid-entrance); (2) every pair's hover read by forcing `:hover` through the Chrome DevTools Protocol (`CSS.forcePseudoState`), not only pairs flagged `hover` in a hand config; (3) declared values from the matched CSS rules (`CSS.getMatchedStylesForNode`) beside computed ones, so a width or max-width the draft declares (Contact's 168px address) is written instead of left as a used value; (4) a text-run pair also compares the spacing between its rows (their boxes' tops), giving the hours list its gap; (5) transition and animation timings compared (duration, delay, easing), which computed style already holds. Panels are handled in A2 by opening them before pairing | `scripts/parity/draft-live-walk.mjs`, `scripts/parity/lib/collect.mjs`, `scripts/parity/lib/chrome.mjs`, `scripts/parity/lib/compare.mjs`, `scripts/computed-route/tests/walker-refs.test.mjs` | none | each fix's MUST FAIL test; About still at 0 open on a measure-only run (no new rows from the fixes on a solved page) |
| A0 Live = HEAD | (after A-1 lands, so HEAD carries it) Queue runner in the scratchpad (serial, `SGS_HEADED=1`, STOP file). Deploy HEAD (includes 508217f03) to eye-care-test; check the theme snapshot matches `sites/eye-care-ward-end/theme-snapshot.json` (`push-theme-snapshot.py` if not); rebuild all 17 trees with `wp-build-page.js`. Before rebuilding, `git diff --ignore-cr-at-eol sites/eye-care-ward-end/build/*.tree.json` must be empty (`about.tree.json` differs in line endings only on 2026-10-04). Record the HEAD hash; tell peer sessions not to deploy to eye-care-test while the queue runs | queue runner (scratchpad) | none | deploy verifies by checksum; every rebuild reports 0 invalid blocks |
| A1 Measure-only mode | Proven by code reading (risk review, 2026-10-04): `solve.mjs --rounds 0` stamps refs (`addRefs`, `writeTree`), rebuilds the live page, walks once and classifies, and breaks before `writeRound`. It walks 4 widths (375/768/1440/1920), and shop and product rebuild a site-wide template. Add one test that rounds 0 never calls `writeRound`, then use it | `tests/` | none (first action, 5 min) | the new test, red when the break is removed |
| A2 Pair every surface | For each surface without `walkerFull`: measure-only run (stamps refs), then `pairs.mjs --surface <s>`, set `walkerFull`. Order: help, home, footer, header, then the rest. Hand configs are shared (`header.mjs` serves header, mobile-menu and the 4 megas; `help.mjs` serves help and size-guide), and `pairs.mjs` reads the live page at rest, so mobile-menu, the megas, size-guide and lens pair almost nothing. Decided default: give each panel surface its own hand config whose navigation opens the panel before pairing (same pattern as the existing states); if that takes more than 15 min for a surface, record it as unmeasured with its reason and move on | `surfaces.json`, hand configs in `qa/parity/`, generated `qa/parity/*.full.mjs`, `qa/pairs/*.json` | A0, A1 | each pairing report lists kept and left-out blocks with reasons; `lint.mjs --surfaces` passes |
| A3 Measure all | Measure-only run on all 17 surfaces, plus walker runs of bag, checkout, confirmation hand configs. A small summary command aggregates every report: per surface, distinct issues by class and Unresolved reason, ledger-accepted rows, and blocks left unmeasured. Rows from a shared config count once (deduplicated by ref and property). Output: `qa/sweep/<date>/sweep.json`, one row per open issue `{ surface, ref, block, property, widths, state, kind, class, reason, report }` | new `scripts/computed-route/sweep.mjs` (aggregator, reused in B), `tests/sweep.test.mjs` | A2 | test: totals equal the per-surface reports; two surfaces sharing a config count a shared row once |
| A4 Register ↔ sweep | Every register item gets one sweep status (rules below). Parallel read-only Sonnet agents, one per register section group (Header + megas + drawers; Footer + floating WhatsApp; Home; Shop + product + lens pop-up; Lenses + About + Help + Contact; Checkout + confirmation + content; site-wide S1 to S12; route findings CR1 to CR21), each given `sweep.json` and its sections, returning `[{ id, status, evidence }]`. Main thread re-checks every **clean** claim against `sweep.json`, merges, and is the one writer of the register | register (new Sweep column; the existing Status column stays) | A3 | 100% of items carry a status; every clean item cites its report path and the paired ref covering it |
| A5 Live proof of fixes | First fix `qa/independent-check.mjs::accepted`: it matches `e.ref`, but every ledger entry stores `node`, so it accepts nothing (proven 2026-10-04 by reading the code; MUST FAIL test with one ledgered row). Then claimed fixes (items marked built/closed, the S-items) and A4's "clean" items are re-checked live: `qa/framework-fix-check.mjs`, `qa/independent-check.mjs --surface about` and `--surface contact`, and one combined headed Playwright job for the not-walker-measurable items (hover animations, sticky header, drawers) | `qa/framework-fix-check.mjs` (add checks only where a claimed fix has none) | A3 (runs alongside A4) | each claimed fix: PASS with its command, or reopened in the register |
| A6 Write it down | Register statuses; Spec 47 plan Progress gets the sweep table in place of the per-surface list; Spec 47 §5 Residual (bump `spec_version`); LEDGER Front F; `/handoff` | docs | A4, A5 | handoff preflight 4/4 |

**A4 status rules (decided):**
- **still open:** a `sweep.json` row on the item's surface touches the element and property the item names.
- **clean on the walker:** a paired ref covers the item's element and no row touches it. A site-wide item (S1 to S12) is clean only when every surface in its Covers column is clean; one unmeasured surface makes it **partly measured**.
- **not walker-measurable:** the item is behaviour, motion timing, keyboard, a11y, content or Site Info. The agent decides; the main thread checks 10% of them (at least 5), plus every item marked clean or closed earlier without a cited report path.
- **closed earlier:** the register already records it closed with evidence, and the sweep agrees. If the sweep disagrees, it is **still open** (a regression), flagged in the handoff.
- A5 takes every clean, closed earlier and partly measured item for a live check.

**Gate A (review-gate):** pass when every surface has a report from A0's recorded HEAD (a report from another HEAD fails) and every register item has a
status. Fail when a surface cannot be measured (host 403, pairing below half its blocks): record it with its reason
and continue; never block the session on one surface.

---

## Session B: audit the three-way split, protect decisions, plan the fixes

**Done when:** every open distinct issue from Session A sits in exactly one class below with its proof; every real
framework gap is grouped by mechanism and matched to a shared helper; Bean's decided differences can no longer be
overwritten by Solve; Session C's plan is written. **Estimate:** ~1 h 10 (realistic ~2 h).

### The classes (written into Spec 47 §5 as the rule)

| Class | Means | Proof required |
|---|---|---|
| **D: decided divergence** | Bean chose a different result from the draft | a register decision ID; then a ledger entry citing it |
| **F: framework gap** | no setting on the block, its enclosing blocks or its extensions can produce the draft value; or a hardcode beats a setting | DB query of every attribute (including rows with `css_property` NULL) + the block's `render.php`/`style.css` by symbol + the extension roster; for a hardcode, the winning CSS rule |
| **W: walker or route gap** | the row is a measuring artefact, a consequence of another row, or a setting exists but the route cannot find, calibrate, pair or write it | the setting that exists (file::symbol) or the parent row it follows from |
| **T: tree or content** | fixable now in the page tree or Site Info | the value to write |

Rule: Solve's "Missing setting" starts as **W until proven F**. A walker gap is never closed by calling it missing
functionality.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| B1 Triage script | For every Hardcode, Missing and Unresolved row of the sweep, checks mechanically: attributes on the block whose name or `css_property` fits (DB, NULL rows included); extension roster settings; enclosing blocks' calibrated `reaches`; whether the row's node has an open parent row with the same delta (consequence); transient properties (transform, opacity, transition mid-animation); used values. With `--rounds 0` Solve writes no gaps, so every row reads "not written": the script runs the resolver read-only (`lib/resolve.mjs`, no `setAttr`) to get each row's `no-setting`, `uncalibrated` or `breaks-layout` reason first. Writes a candidate class and its evidence per row | new `scripts/computed-route/triage.mjs` + `lib/triage.mjs`, `tests/triage.test.mjs` | Session A | MUST FAIL tests: a known existing setting (textarea width via its extension) is never labelled F; a known consequence row is labelled W |
| B2 Prove each candidate | Parallel read-only Sonnet agents grouped by mechanism (not by surface), each proving or disproving its batch with file::symbol and DB queries. Main thread re-checks every F verdict and a sample of W | evidence table in this plan's appendix | B1 | every F has the proof the class table requires |
| B3 Group and match helpers | Proven F gaps grouped by mechanism (for example layout alignment on blocks without it, inner-element typography, text max-width, hover effects) and matched to the shared helpers and declarations that already solve it elsewhere (`SgsLengthControl`, box control, typography helpers, `supports.sgs.boxFamilies`, extensions, the form's Field style group as the parent-styles-children precedent) | fix catalogue section in Session C's plan | B2 | each group names its precedent block and helper |
| B4 Divergence protection | Proven 2026-10-04 by reading the code: Solve skips a row the ledger accepts, but when live drifts from a decided value `parity/lib/divergences.mjs::judgeDivergence` leaves the row open with `diff.draft` set to the text `"<value> (D-n)"`, while `solve.mjs::writeRound` takes its target from `solve-rows.mjs::draftValues` (the raw draft style). So the next Solve writes the draft over Bean's decision, and `guard.mjs` cannot measure that row (`"0px (D-1)"` fails its px parse). Build: (1) Solve's target for a ledgered row is the entry's decided value, parsed from the entry, not from the text; (2) every register decision that changes a measured value becomes a ledger entry citing its register ID; (3) `lint.mjs` fails an entry whose ID is not in the register; (4) the independent check (fixed in A5) fails when live differs from the decided value | `lib/solve-rows.mjs::draftValues`, `solve.mjs::writeRound`, `parity/lib/divergences.mjs`, `lint.mjs`, `divergences.json` | Session A's statuses | MUST FAIL tests: with a value entry whose live has drifted, `writeRound`'s target equals the decided value; a planted drift turns the independent check red |
| B5 Plan Session C | Write the orchestration (below) in detail from B3's catalogue | this plan | B3 | `/strategic-plan` gates |

**Why built in rather than an agent editing settings afterwards:** an after-the-fact edit is overwritten the next
time Solve runs on that surface, and nothing would notice. A ledger entry is read by the walker, Solve and the
independent check, so a decision holds on every run and a drift turns a check red.

**Gate B (go/no-go, Bean):** Bean gets a one-page plain-English summary: for each class, the count, 3 worked
examples (what it looks like on the site and why it is that class), and for the F gaps the fix groups with a per-group
effort and files touched, plus one recommendation. One question: approve fixing these groups? B4 touches only route
and ledger code under `scripts/` and the ledger file, never blocks or theme, and lands as its own revertable commit.
No-go: the F gaps stay in the register (Sweep column) and work goes straight to Session D.

---

## Session C: framework fixes (outline; B5 writes the detail)

**Done when:** every catalogued F gap has a working control (editor and front end), a reseed, a deploy, and a
recalibration of the blocks it touched; a fresh measure-only sweep shows those rows closed and 0 new rows anywhere.

Shape:
1. **One group per agent, in parallel.** Each `wp-sgs-developer` agent takes one mechanism group, phase 1 read-only
   diagnosis, main-thread check, phase 2 implementation in an isolated worktree (`isolation: "worktree"`), no build,
   commit or deploy.
2. **Scripts for repeated edits.** A group touching more than 3 files with the same change gets a detector first
   (`.claude/THE-MIGRATION-METHOD.md`), then a codemod.
3. **Shared helpers first.** A group whose fix belongs in a shared control or helper lands that helper once, then the
   per-block wiring.
4. **One serial tail in the main thread:** merge each worktree, read every diff, one `npm run build`, `run-gates.py
   --tier full`, one reseed from clean HEAD, one deploy to eye-care-test then sandybrown, recalibrate the touched
   blocks through the queue, one measure-only sweep.

## Session D: back to walker work

Ranked by the sweep, not by a fixed surface order: walker gaps that hold the most open rows across surfaces first,
then each surface to 100% with Solve under the existing done line (Spec 47 plan Progress).

## Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Host 403s under a long serial run | Sweep stalls | `SGS_HEADED=1`, one job at a time, `waitOutHostCheck`; a surface that fails twice is recorded and skipped |
| Stale live pages (deploy or tree drift) | Sweep measures old code | A0 deploys HEAD and rebuilds every tree before any walk |
| Measure-only mode writes a setting | Trees drift | A1's test; `git diff --ignore-cr-at-eol sites/eye-care-ward-end/build/*.tree.json` after A3 shows only added `cr-ref-` classes |
| Shared hand configs | The same header row counted 6 times; panels pair nothing | A2's per-panel configs; A3 dedupes by ref and property |
| Register edited by other sessions | Lost edits | the main thread is the only writer; re-read the file and `git diff` it right before writing |
| Bean's points file staged by accident | Bean's private notes committed | check `git diff --cached --name-only` before each commit has no `Bean Points` path |
| Session C merges clash in shared helpers | One reseed hides which group regressed | helpers merge and build first, sweep, then the per-block wiring, sweep again |
| Pairing a panel surface at rest misses blocks | Under-counted issues | Listed as left out with reason; counted in the summary as unmeasured |
| Triage over-labels W to keep F small | Real gaps ignored | B2 agents prove both directions; main thread re-checks every reclassification to W from Solve's Missing label |

## Gates

| Gate | After | Pass | Type |
|---|---|---|---|
| A | A0 to A6 | every surface measured from one HEAD; every register item has a status | review-gate |
| B | B1 to B5 | every open issue classed with proof; divergence MUST FAIL test red then green | go/no-go (Bean) |
| C | Session C | catalogue rows closed on a fresh sweep; 0 new rows. Fail: revert that group's merge, re-sweep; never start Session D with new rows | auto-gate |
