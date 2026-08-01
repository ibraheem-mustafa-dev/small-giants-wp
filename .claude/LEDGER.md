---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-01
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

---

> **QC note (2026-08-01) — the subagent RETURNED and its verdict was INCONSISTENT, now resolved.** I ran the same verification
> myself as a backstop and it caught two real inconsistencies, both since fixed: the step table said
> "NOT STARTED (14)" while listing **15** items, and it used original numbering only while the
> rewritten plan uses **mixed** numbering (letters A–J for steps added today, original numbers kept so
> older references still resolve). Everything else verified against source: 12 pipeline stages, the
> seeder no longer writing `css_property`, 207 override entries with zero `fx:` rows, the build gate
> `--check`-only, `FORCED_PANEL_HOSTS` gone, roster 28 with `decorative-image = [motion-path, scrub]`,
> 19 single-provision blocks (13+6), 144 STOPs, 24 plan steps, D-ceiling D436.
> It found the step-table defect I had also found, but diagnosed it BETTER: the stray `3` was a
> duplicate of the HELD buybox step, so the "(14)" label had been correct and the LIST held one item
> too many. My own fix then re-introduced the same duplication in a new form (buybox listed under both
> HELD and OPEN) and mislabelled 24 items as "(16)". Both are now fixed and the table is rewritten
> plainly. **Everything else the subagent checked came back clean**, including a catch I would have
> missed: `82a08b8a`'s subject line is about float-clearing, but its diff also carries the
> `webpackIgnore` pragma, so its listing under Step 17 is correct rather than a misattribution.

## ⭐ NEXT SESSION IS A REVIEW SESSION — start here

You have been away from your PC across several motion sessions and asked for a plain-English
timeline before we build anything else. This is it.

### The last three motion sessions, in order

**1. Wave C — BUILD (D426).** The motion engine itself. Scroll-scrubbed effects, draggable
carousels, text-scramble, a new before/after comparison slider, a new scroll-scrubbed image
sequence. Shipped and deployed. Nobody had looked at it yet.

**2. Wave C — VERIFY (D427, D430, D431).** Everything got watched moving in a real browser, twice
over — once normally, once with "reduce motion" switched on. That found three faults no build gate
could have seen: the gallery carousel never actually slid sideways, the drag feature could never
have worked, and the before/after slider's editor preview was broken. Then a six-persona review
graded the whole surface and scored **supportability D+** — meaning a client could not operate it.

**3. Wave D — CLIENT-READINESS (D434, D435, D436 — today).** Turning an engine into something a
client can use and a five-site schedule can carry. **20 commits. Eight of the 24 steps closed.**

### What actually got fixed today

- **A clean copy of the code can build again.** Six scripts crashed on a machine without the local
  database — the real cause was one file running database work at import time, before any of the
  "database missing, skip" checks could run.
- **Effects are only offered where they can work.** `morph` was being offered on four blocks that
  are `<div>`s, where it warns and does nothing.
- **The editor console is clean.** Two module errors and two CSS warnings, all traced to real
  causes and fixed.
- **A before/after slider was collapsing to a third of its width** — caused by two floated logos
  earlier on the page, not by a breakpoint as first thought.
- **Motion now exists in five real stock patterns**, so inserting one gives a client tasteful
  motion with zero configuration. Previously motion existed only on test pages.
- **The image-sequence block is honestly scoped agency-only**, with a frame cap and a "verify
  frames" button, because setting one up needs a terminal.
- **The database is now genuinely the single source (D436).** Motion data seeding AND the
  regeneration of the files the live websites load are both stages of `/sgs-update`. Previously a
  separate script wrote some of it at build time, and an unrelated track running the pipeline could
  — and did — wipe motion data out.

### What YOU need to decide (nothing is blocked on me)

1. **Step 7 — a background that follows your mouse.** Three routes, explained in plain English in
   the Wave D plan §6a. Recommend Route A.
2. **FR-38-12 "Flip"** — explained in plain English in the Wave D plan §6b. Its premise turned out
   false; the question is whether a redesign is worth it.
3. **The palette audit** — `border-subtle` is set to a *saturated brand accent* in 7 of 8 client
   snapshots. You ruled this needs a proper audit of every preset slot.
4. **The presets** at `/fx-preset-comparison/` — you said they look great but scramble fires at the
   wrong times. That is now its own step.

### Honest limits

- **Buybox drag is written but NOT shipped.** A gate correctly refused it because it has never been
  seen working on a real render. Its runtime is proven; the emit is not.
- **The scramble preset timing defect you found is real and undiagnosed.** The parameters genuinely
  differ — measured — so it is a trigger/timing bug, not a preset-values bug.
- **Two effects still cannot be measured by our newer browser tooling** — see Measurement limits
  below. The committed Playwright harnesses are the only instrument.

---

## CURRENT FRONTS

### Track 3 — Spec 38 motion: A+B+C CLOSED · Wave D wave 1 executed (D434/D435/D436)

**The narrative is in the ⭐ REVIEW block at the top of this file — not repeated here.**
Full register + plain-English explainers: `plans/2026-07-31-motion-wave-D-client-readiness.md`.

| | Wave D steps (24) |
|---|---|
| **CLOSED (9)** | 1, 4, 9, 11, 13, 14, 16, 17 (stripped into the plan's completed table, with commits) **+ Step J** — motion seeding AND artefact regeneration into `/sgs-update`, D436, kept at its own heading because the reasoning is load-bearing |
| **STILL OPEN (23 of the plan's 24 headings)** | **14 original-numbered:** 5, 6, 6b, 7, 8, 10, 12, 15, 18, 19, 20, 21, 22, 23 · **9 lettered:** A–I (J is DONE, see above) |
| **HELD (inside the 24)** | **Step A** = buybox drag, formerly "Steps 2/3". Written, runtime proven, NOT shipped — the visual-diff gate correctly refused it because the attribute has never come from a real render. |

⚠ **MIXED numbering is deliberate.** Steps added 2026-08-01 are LETTERED (A–J) so the original numbers
keep resolving in older references (D426–D434, prior reports). **The plan's own `### Step X` headings
are authoritative; this table is a summary.**

⚠ **A summary of a renumbered list drifted THREE times in two days — do not trust this row over the
plan.** (1) It listed Steps 1 and 14 as unstarted four minutes after the commit closing them. (2) It
carried a stray `3` — a duplicate of the HELD buybox step — inflating the list to 15 under a "(14)"
label. (3) My own fix for (2) then double-counted buybox again by listing it under both HELD and OPEN,
and mislabelled 24 items as "(16)". Findings 2 and 3 were caught by an independent `/qc` subagent, not
by me. **If this table and the plan disagree, the plan is right.**

⚠ **Read this table's silence carefully.** It once omitted Steps 1 and 14 entirely, and that
silence made two FINISHED steps look unstarted. Check a step against `git log` before trusting
its absence.

**Open for Bean:** Step 7 route (plan §6a) · FR-38-12 Flip (plan §6b) · palette-slot audit scope ·
the scramble preset timing defect he found on page 2103.

**Closed by Bean 2026-08-01:** the "static scramble headings" report — he rechecked, both animate.
ScrambleText's ~2.25:1 contrast ACCEPTED as-is (legible, on-brand) unless a better brand-colour
combination exists.

**Do not re-litigate:** before/after VIDEO is KEPT · the physics sandbox is a DESIGN GATE not a cut ·
FR-38-12's pairing premise is verified FALSE (D426) · **D4's pin-composition answer is REJECTED**
(Bean 2026-08-01: janky, useless without pinning, patchwork).

⚠ **Before touching the fx roster:** 19 blocks rest on a single provision category (13 `text`,
6 `track`) and would zero the same way `sgs/decorative-image` did. Not a blocker; do not silently
widen or narrow a provision without checking what rides on it.

### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Full detail lives where it already did — read before acting, do not assume it is current from
memory alone:

- **⭐ Track 1 (cloning/Spec 31) — ACTIVE. L2 relational qualifier built + measured this session,
  still UNWIRED:** **`plans/2026-08-01-wrapper-recognition-cascade-rework.md`** is the register —
  read it whole.
  **2026-08-01 (this session):** built `converter/services/l2_qualify.py`, the L2 (CONTENT-layer)
  relational qualifier Bean specified at D439 (D441) — pure, UNWIRED, `--self-test` (1 positive +
  6 planted violations). Trigger = the direct PARENT is a recognised container-kind block; the
  child's identity is an OUTPUT, never an input. Reproduces §2.7's acceptance table 5/5 on the real
  homepage draft, zero false positives (`reports/2026-08-01-l2-qualifier-measurement.json`, 377
  pairs). **Also deleted `_absorb_transparent_wrappers`** (D440; + `_is_absorbable_wrapper` etc.) —
  fired 0 times across 46 real invocations, rejected the 4 real content bands solely for `margin`
  (the very pattern it existed to fold). Wrapper-deciding mechanisms: 9 → 8. New fixture
  `sgs-tabs-realistic.draft.html`/`.expected.md` replaces the 29-line stub that rendered broken.
  **Councils:** `/qc-council` falsified 4 recognition proposals; a 6-persona `/adversarial-council`
  rejected tabs-synthesis (tombstone at `plans/2026-08-01-tabs-synthesis-design.md`) — its signal
  fires correctly on 1 block, falsely on 4 incl. `sgs/feature-grid`, which converts fine today.
  **Measured, not assumed:** G3-dissolve recovers ZERO content — dropped. `sgs/tab.label` is ONE
  bad row (mis-seeded `emit_shape='child'` + phantom `derived_selector`) — 9 siblings correctly
  `nested`. 8 structural BEM tokens mis-resolve (NOT `item`, load-bearing for feature-grid).
  Baselines unchanged: suite 586/1 skip; conformance 23/27 fail (pre-existing); feature-grid 6/6.
  **Next session (PLANNED, not parked):** (1) `__trigger` vs `__tab` vocabulary — Bean's call;
  (2) the recognition/`equivalent_block_for` fix for the 4 hijacked slots; (3) wire L2 into the
  three fate-deciding loops.
  ⛔ **The `sgs-card-grid` "cardRadius 12→18px defect" is WITHDRAWN as a probe artefact — do not fix
  it.** ⛔ **OWED (`4f83e8d5`): `sgs/option-picker`'s `arrayContentLift` needs a `/sgs-update` reseed
  before its options can transfer.** ⛔ **Do NOT alias `trigger`→`tab` unilaterally** — Bean's call
  (item 1); `sgs/tabs` renders `__tab`, both fixtures author `__trigger`, neither is canonical yet.
  Prior sessions: `memory/session-2026-07-31-track1.md` + `-track1-session2.md` (nav dropdowns
  shipped after 5 live-only defects, D432/D433).
- **Track 1b (Spec 35 components):** editor gap CLOSED (D425); open residue = Part I (2 items),
  Part-L rollout 4–32%, T1 parity 157 gaps/23 blocks. `reports/2026-07-30-track1-verification-audit.md`.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave strategic plan landed (D413), Wave 1 CLOSED,
  Wave 2 in progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer
  variants) was REJECTED by Bean 2026-07-29 — do not re-present those pairs without real work
  first (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

## Standing constraints (carry forward — these are rules, not history)

- Per-row `position:sticky` REJECTED (short-parent trap, D389). Sticky stays HEADER-level.
- No absolute size value in a shared state-only stylesheet (D386), gated by
  `check-shared-css-state-rules.js`.
- After any `edit.js` / shared `src/components` change: deploy and OPEN the real editor (D388).
- A scoped axe run on a CLOSED surface passes vacuously — guard openness or the run proves
  nothing; any earlier drawer-axe claim from before D418 proves nothing.
- `templateLock:'all'`/`'contentOnly'` re-applies the template on EVERY mount, matched by ARRAY
  POSITION (D393) — pass the template only into a genuinely empty container.
- The D343 phantom border was WP core's `html :where([style*="border-width"])` substring-matching
  a custom property *named* `--sgs-tile-border-width` — not shadows-as-borders. Width vars are
  named `--*-thickness`. Do not re-propagate the wrong diagnosis.
- No-login shareable preview link is DROPPED, not deferred (Bean, 2026-07-27).
- `<footer>` is generic — key any assertion on the CLASS `wp-block-template-part`, never a naive
  regex; the canary page has 5 `<footer>` elements, four are quote attributions.
- `~/.agents` is NOT a git repo — the skillscore script + 5 grafted skills + `nextjs-testing` are
  LIVE but UNVERSIONED (recovery = per-file `.bak-2026-07-17-*`).
- **No block version bumps / deprecations pre-production** (Bean D293, overrides STOP-57).

---

## State Snapshot

### Live status (machine-checkable — verify, don't trust the cache)

- **Branch:** `main`. **Shared worktree** — a co-active track commits between handoffs and holds
  uncommitted WIP. Commit by EXACT PATH, never `git add -A`; never touch another track's
  uncommitted files.
- **Verify every session, no cached line is authoritative:** `git log -1 --stat` + `git status` +
  `git branch --show-current` · D-ceiling `grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1`
  (currently D434 — a co-active track took D432/D433 the same day; re-check live) · framework
  counts via `/sgs-db` or `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
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
| Structural defences (STOP catalogue + pre-flight ritual) | `STOP-CATALOGUE.md` (uncapped, D101; 144 STOPs as of 2026-07-31) |
| Spec roster + DEAD-never-cite list | `specs/README.md` |
| Decisions (D-numbered, INCIDENT/ROUTINE tagged) | `decisions.md` (+ `memory/decisions-archive.md`) |
| Parked work (OPEN/PARTIAL/BLOCKED/DEFERRED only) | `parking.md` (+ `memory/parking-archive.md`) |
| Prior sessions' full narrative | `memory/session-YYYY-MM-DD*.md` + `memory/state-archive.md` |
| Build / deploy / SSH / credentials / gotchas | `dev-setup.md` · deploy = `build-deploy.py --target sandybrown\|palestine-lives` |
| Goals + exit criteria | `goals.md` |
| Hook off-switches | `.claude/secrets/hook-off-switches.md` (gitignored) |

## Blockers

**None hard.** Two design gates await Bean's decision (Step 7 routes, FR-38-12 restore) before
Wave D can continue past them — see Track 3 above. Everything else in the register is buildable
without him.

---

## NEXT SESSION — REVIEW FIRST, then Motion Wave D

**This is a REVIEW session by Bean's instruction.** Do NOT open with a build task. Open with the
timeline at the top of this file, then walk him through the four decisions he owns.

**Read FIRST, in order:** the ⭐ REVIEW block at the top of this file → the Wave D plan
`plans/2026-07-31-motion-wave-D-client-readiness.md` (rewritten as a review quickstart — §6a and
§6b are plain-English explainers he specifically asked for) → **D436 → D435 → D434** → Spec 38 §10.

### Task 1 — Walk Bean through the four open decisions [inline, Opus]
**What:** present Step 7's three routes (§6a), FR-38-12 Flip (§6b), the palette audit scope, and
the preset judgement. **Why:** four decisions have been waiting several sessions and every one of
them gates real work. **Time:** 20 min. **Acceptance:** each is ruled on or explicitly re-deferred
with a reason. **/qc gate:** no — it is a conversation.

### Task 2 — The scramble preset timing defect [delegated, sonnet, /systematic-debugging]
**What:** on `/fx-preset-comparison/` (page 2103) Subtle and Dramatic fire at very similar times and
Balanced fires late. **Context the subagent will not have:** the preset PARAMETERS genuinely differ —
measured from live rendered attributes — so this is a **trigger/timing** bug, NOT a preset-values
bug. Do not start by editing `fx-presets.json`. **Depends on:** none. **Time:** 45 min.
**Acceptance:** the three levels fire at visibly different scroll points, measured. **/qc gate:** yes.

### Task 3 — Motion-path geometry, both stacked fixes [delegated, sonnet]
**What:** D3 from the defect register — `preserveAspectRatio="none"` at `fx-path-routes.php:324`
causes the skew; the missing local positioned ancestor causes the 2,705px translate. **Both are
required; neither alone fixes it.** Class-wide: any block using motion-path outside a positioned
container. **Depends on:** none. **Parallel with:** Task 2. **Time:** 1 h. **Acceptance:** the
travelling text lands on its arc at every width. **/qc gate:** yes.

### Task 4 — Image-sequence: fully-visible scrub + in-block pin option [delegated, sonnet]
**What:** Bean's ruling, two parts. (a) The scrub must run only while the canvas is FULLY on screen;
today a sliver counts as visible. (b) Pin becomes a first-class customisable option INSIDE the block.
**Context:** the block's docblock proposes composing it inside `sgs/container` with pin+scrub — Bean
REJECTED that as janky patchwork. Note `fx-image-sequence.js:396-412` documents a rejected shorter
window, so this is not "shorten the range"; `data-sgs-fx-end` (line 418) already allows per-instance
override. **Depends on:** none. **Time:** 2 h. **Acceptance:** sequence completes while the canvas is
still substantially on screen, and pin is switchable from the inspector. **/qc gate:** yes.

### Task 5 — Slider arrows (separate from the dots) [delegated, haiku]
**What:** the arrow is a bare `‹` glyph measured 8×27px inside a 44px circle. Swap for the existing
SVG chevrons (`lucide-icons.php:421,424`, already used by accordion-item and nav-menu). **This is NOT
the dot-contrast issue** — Bean corrected that conflation. **Time:** 20 min. **/qc gate:** yes.

### Task 6 — Palette-slot audit [delegated, sonnet] — framework-wide, not motion
**What:** Bean's ruling. Find where `border-subtle` is actually set; audit EVERY preset slot in EVERY
client palette for colours that do not match the slot they occupy; check for missing and duplicated
entries. **Evidence:** 7 of 8 client snapshots set `border-subtle` to a saturated brand accent
(orange, green, gold, plum, blue); only `helping-doctors` is a true neutral. `star-rating` and
`process-steps` also read it as an indicator colour. **Time:** 1.5 h. **/qc gate:** yes.

### Dependency graph
```
Task 1 (inline, Opus — Bean's decisions)
  ↓ unblocks Step 7 + FR-38-12 only
Task 2 + Task 3 + Task 5 + Task 6 (all parallel, file-disjoint)
  ↓ /qc each
Task 4 (sonnet — largest, can start in parallel but wants its own deploy)
  ↓
Deploy + verify + commit
```

**Held, not forgotten:** buybox drag is written and uncommitted — the visual-diff gate correctly
refuses it until the attribute is proven to come from a real render. Patch at
**`reports/visual-diff/buybox-drag-toggle-2026-08-01.patch`** (in-repo, committed — an earlier pointer
named a session temp directory that dies with the session). Re-apply with
`git apply reports/visual-diff/buybox-drag-toggle-2026-08-01.patch`.

⚠ **Do NOT leave buybox dirty in the working tree.** It is a SHARED worktree, and on 2026-08-01 these
four uncommitted files blocked the co-active track's deploy outright (`[ABORTED] reason:
deployed-files-dirty`). Holding unverified work is right; holding it *in the shared tree* pushes your
problem onto someone else. Keep it as a patch until it can be committed honestly.

#### Methodology guardrails (earned 2026-07-31/08-01 — do not inherit as solved)

- A probe that never reaches the effect is measuring the probe. **Four probe results were false
  before any product code was.**
- A test can pass the very defect it was written to catch — run the KNOWN FAILURE through any new
  gate, not just the known good.
- **A negative control must be confirmed to have LANDED** before its result is trusted — check
  `git diff --stat`, not the command's exit code.
- Fact-check every register/council claim before acting. D434 found four false claims in the
  register; a council falsified one of my own fix-shapes before any rater ran.
- **A documented prior decision is evidence.** If a proposed fix contradicts a code comment that
  models and rejects it, that fix is probably wrong — `fx-image-sequence.js:396-412` is the case.
- **`scroll-behavior: smooth` breaks scripted scroll sampling.** It produced TWO false measurements
  in one day. Poll until `scrollY` settles; never sample at a fixed delay.
- Cache-bust every canary measurement.
- A prose claim in a report is not a committed artefact.
- `python .claude/hooks/handoff-preflight.py --check` must pass before a handoff completes.

#### Measurement limits (these change what a session CAN verify)

- **Chrome DevTools MCP `emulate` has NO `prefers-reduced-motion` parameter** (schema-checked).
- **It has no trusted mouse down/move/up primitive** — synthetic `PointerEvent` throws
  `InvalidPointerId` at `setPointerCapture`.
- Therefore the committed **Playwright** harnesses are the ONLY instrument for the reduced-motion
  contract and for gesture-level drag. Keep them on Playwright.
- Its browser session is **shared across concurrent agents** — a tab was hijacked mid-measurement.
  Claim a page and re-assert `window.location.href` alongside every measurement.

**Canaries:** `/motion-canary-wave-c/` (2083, effects) · `/motion-roster-canary/` (2086, roster) ·
**`/fx-preset-comparison/` (2103, NEW — the preset comparison)** · dedicated single-effect pages
`/motion-canary-{scrub,pin-scrub,split-reveal,horizontal-panel}/`.

Full structural defences (144 STOP entries + pre-flight ritual): **`.claude/STOP-CATALOGUE.md`**.
