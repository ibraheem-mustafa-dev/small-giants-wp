---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-03
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where today left things, in a sentence each:**
- **WebGL is now officially part of the framework** (Tier W), with a budget and a closed list, so it
  cannot quietly spread and blow the page-weight limit.
- **The physics canvas block is built and live on the test site** — a decorative layer where things
  can be thrown around. It is not a physics engine and should never be sold as one.
- **Every gap found across nine research reports is now in ONE ranked document** instead of nine.
- **The Snooza chair job is bigger than the proposal says** — 72 product combinations, not 24, and
  two accessories that are not simple on/off choices.
- ⛔ **GSAP's licence has a clause worth knowing about** before you sell a plugin built on it.

## CURRENT FRONTS

> **QC-BYPASSED CLEARED (2026-08-04).** Independent re-check confirmed 4/6 figures exact and
> corrected 2 (scoped to `sgs/%`: 21->19, 1099->955); nothing fabricated. Full re-check:
> `.claude/reports/2026-08-04-step0-qc-bypassed-reverification.md`. D-ceiling now **490**
> (D485-D488 2026-08-04: Task A shipped, Track B/C root-causes, fluid-typography cause; D489-D490
> 2026-08-05: svg role + D1 forward-tracking + aggregator fixes shipped, `authored-alt-text` split).

### Track 3 — Tier W ADMITTED · physics-canvas SHIPPED · nine reports consolidated (D479)

**Pushed: `50c9122b` (physics-canvas) · `19d4d33f` (Tier W/D479 + Snooza) · `09960945` (gap register)
· `3a581721` (council fixes) · `faa1652f` (spec staleness).** Full narrative (proof-for-every-claim
table, licence detail, hand-authored-fixture correction): `memory/session-2026-08-03-track3.md`.

- **Tier W (WebGL) ADMITTED — doctrine now V/G/H/W** (D479, Bean-approved 4/4). 120KB
  Tier-W-pages-only budget; OGL wrapped for swappability; no-WebGL falls back to Tier V.
- **`sgs/physics-canvas` shipped + seeded**; **`sgs/google-reviews` WCAG 2.5.7 + reduced-motion
  sweep** (google-reviews/trustpilot/post-grid all 17/17 live).
- **Master gap register** — nine reports consolidated: `plans/2026-08-03-motion-gap-register.md`.
- ⛔ **GSAP is NOT MIT** (SPDX `NONE`; Prohibited Uses bans visual-motion-authoring tools competing
  with Webflow — exposes the 299/yr Configurator Pro, not client sites; MIT escape hatch: Motion,
  anime.js v4). ⛔ **LYGIA is Prosperity-licensed** (commercial = 30-day trial).
- ⛔ **A stale spec (Spec 38) made a fresh audit recommend re-fixing already-working code** —
  fixed `faa1652f`. Treat every "known defect" in any register as a claim with a date on it.
- ⚠ **Snooza product data CORRECTED by Bean:** 4 sizes x 6 colours x **3 headrests = 72 SKUs**
  (not 24); two accessories are NOT booleans. Assets: `sites/snooza-chair/assets/`.


### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Per-sub-track status (one line each) + the pointer that owns the full narrative — read the pointer
before acting, do not assume it is current from memory alone:

- **⭐ Track 1 — ROUTING AUDIT COMPLETE + tier axis SHIPPED 2026-08-03 (D480).** Content tier axis
  is live (597 pass/1 skip) but does not yet reach `splitImage` (`scalar-media` blocks it from the
  content walk — Spec 35 prerequisite). Live parity: content 99%, CSS 83/84/89% (worst mobile).
  Registers: `.claude/reports/2026-08-02-pipeline-routing-review.md` +
  `.claude/reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
- **Track 1 — Phases 0/1/1b/2/3 COMPLETE 2026-08-02 (D464, D470–D478). Phase 4 PARTIAL; Phase 5 OPEN.**
  Full narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md`.
- **⭐ Track 1b (Spec 35) — ENFORCEMENT SESSION 2026-08-04 (D481–D484).** Measured: 0 of 24 end
  conditions have a script validated to cover all instantiations (1 enforced/8 partial/4 vacuous/2
  unwired/9 absent). Full narrative + 5 corrections: `memory/session-2026-08-04-spec35-enforcement.md`.
- **⭐ Track 1b (Spec 35) Task A — structural content-role detection SHIPPED 2026-08-04 (D485).**
  `sgs/%` `role IS NULL` 703 -> 669 -> **661 after 2026-08-05 follow-ons (D489/D490)**. Residuals
  narrowed: a11y-metadata roles now RESOLVED (D489 a11y-text seeded + D490 `authored-alt-text` split
  fixes the alt/placeholder-excluded-from-content-walk defect); 127 unreached rows + name-regex
  fallback-still-present remain open. Same-session (2026-08-04): Track B fixed 3 `slots.aliases`
  collisions (D486); Track C refuted the tier-NULL mobile-parity theory and identified fluid
  typography as the real cause (D487/D488). **2026-08-05 follow-on (D489/D490):** svg role SHIPPED
  (was actively destructive — `rich_text_content()` stripped `<svg>`/`<path>` to empty text) + D1
  forward variable tracking SHIPPED (9/9 previously-unresolved rows now classify) + two aggregator
  position-vs-rule fixes SHIPPED (`content_cats[0]` document-order tie-break; D1-only-veto vanishing
  bucket) + `authored-alt-text` category split completed (PHP half pre-existed, Python `final_
  category` half was missing — now matches). `sgs/responsive-logo.alt` uses `authored-alt-text` as
  an INTERIM measure: its real defect is naming the device tier as a PREFIX
  (`desktopLogoId`/`tabletLogoId`/`mobileLogoId`) where the whole framework uses a SUFFIX
  (`backgroundImage`/`backgroundImageTablet`), making it invisible to the D480 device-tier axis —
  see D490 for the retirement condition. Full detail + the 6 new Task-F conditions:
  `memory/session-2026-08-04-spec35-enforcement.md` + `plans/spec-35-inspector-DONE-checklist.md`
  (items 22-27, condition 22 extended 2026-08-05 with the position-vs-rule aggregator pattern).
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave plan landed (D413), Wave 1 CLOSED, Wave 2 in
  progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer variants)
  REJECTED by Bean 2026-07-29 (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **HANDOFF QC (resolved):** an independent rater caught two stale figures my own self-review
> missed (a plan row claiming "37 tables" when live is 36; "gates invoked manually" when D473 had
> already wired them into `prebuild`). Both fixed. Lesson: self-review passed, independent review
> found real defects — don't skip the second pair of eyes. Full detail: `memory/session-2026-08-03-track3.md`.

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
  (currently D490 as of 2026-08-05 — re-check live BEFORE writing any D reference; this line has
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

## NEXT SESSION (Track 1b / Spec 35) — run alongside or instead of the motion track

### THE GOAL — why this track exists (state it before picking up any task)

**Bean's clients are tech-illiterate and use the block editor exclusively.** Spec 35 exists so every
SGS block's inspector is genuinely usable by them: controls that exist for things the block can do,
no controls for things it cannot, nothing that crashes, and one consistent shape across all 84
blocks. A setting that needs code is not done.

**The enforcement half — what this session was about:** 24 end conditions define that standard, and
they are only worth having if they are ENFORCED. Today's measurement: **0 of 24 have a script
validated to cover all instantiations.** The lesson underneath it is the actual deliverable — all
three rules built today were blind on first build (0-vs-65, 12-vs-15, 43-vs-23), each caught only
by challenging a low number. **"Has a script" and "is enforced" have been read as the same claim.**
The goal is to close that gap rule by rule, not to accumulate more scripts.

### Tasks, in order

**Task A — the 31 content misses. SHIPPED 2026-08-04 (D485), 4 residuals open — see the Track 1b
Task A bullet above for the full breakdown (28 report-only rows, 127 unreached, a11y-metadata roles,
name-regex fallback still present).** Do not re-run this task from scratch; pick up the 4 residuals.

**Task B — hero background design gate + `/qc-council` [inline, Opus].** The collision gate proved
it is a FOUR-block class (hero/container/cta-section/trust-bar), not a hero quirk. Bean's
identity-rename approach (D484) leads: give each colliding attr a distinct DRAFT-side selector
(`__background-image` / `__background-video` / `__background-svg`; `__image` vs `__poster`).
Data-only, no schema change. **Design-gate + council BEFORE building** (rule 7). **Acceptance:**
`check_content_attr_collisions.py` reports 0 genuine groups.

**Task C — migrate the 6 existing gating rules into inspector-scan [delegated, sonnet].** The one
step that can LOSE enforcement while reading green: run old and new together, diff finding sets,
explain every delta in writing, delete the old scripts in a separate later commit.

**Task D — flip advisory rules to fail-closed, one at a time.** Each rule flips only when its own
backlog reaches zero AND its fixtures cover the dominant real shape. Never flip a rule that has
never been challenged on a suspicious number.

**Task E — `supports.sgs.attrRoles` (FR-31-2.1a / D258).** Spec'd, zero of 84 blocks use it. The
declarative channel that ends name-guessing entirely. ⛔ Do NOT read WP 7.0's inline
`"role":"content"` key into the SGS role column — different API, collides on the key name, would
corrupt 8 attrs.

**Task F — BUILD THE 24 ENFORCEMENT SCRIPTS. This is the track's actual deliverable; A-E exist
to settle the architecture first so these are written once, not twice.**

⚠ **Why F comes last, not first (Bean's ruling):** A/B/E decide BLOCK STRUCTURE. Rules written
before them would be rewritten after them. More importantly, every new universal architectural rule
ENLARGES the drift surface these scripts exist to contain — so the architecture settles, then the
enforcement is written against it. Some of the 24 may change shape as a result, and new end
conditions may need ADDING to cover the architecture A/B/E introduce. Re-read the checklist against
the settled architecture before writing anything.

**Scope:** 21 remaining (items 2-17, 19, 21 + T1/T2/T3). Items 1, 18, 20 exist and run on the
harness at `scripts/inspector-scan/`. Do NOT start a new tool — the registry, one-parse-per-block
cache, roster/disk reconciliation, `rules.json` mode table and self-test harness are built.

**DEFINITION OF ENFORCED — a rule counts only when ALL of these hold. This bar exists because 3 of
3 rules built 2026-08-04 were blind on first build and each was caught by a human challenging a low
number, never by a gate.**

1. **Expected population declared BEFORE the rule runs.** Write down what you predict it will find
   and why. A result at or near zero is a CLAIM REQUIRING EVIDENCE, not a pass.
2. **Population cross-checked by an independent method** — a second script, a different language, a
   different parse strategy. Item 1 read 0 against a true 65 and passed its own self-test doing it.
3. **Fixtures cover the DOMINANT real-world shape**, not the convenient one. Item 1's fixtures only
   ever exercised multi-`InspectorControls` blocks, so it never saw the single-wrapper shape that is
   most of the roster. Include at least one `mustFlag` fixture drawn from a REAL block.
4. **`mustNotFlag` fixtures for every legitimate exemption**, each proving the exemption is
   load-bearing rather than decorative.
5. **`--self-test` proves the rule can FAIL** — plant a violation, confirm the plant landed on disk
   before trusting the result, assert it flags.
6. **Baseline suppression proven to suppress**, and **mode data proven to change the exit code** in
   both directions.
7. **Blind spots ENUMERATED in the rule's own header** — what shapes it cannot see, and roughly how
   many instances that leaves unmeasured. A rule with no stated blind spots has not been examined.
8. **The right document.** State which artefact the value under test is supposed to describe and
   prove it by reading the CONSUMER. `check-derived-selector-drift.py` was deleted at D484 for
   measuring `derived_selector` against block render output when it is a DRAFT-side matcher - 666
   confident, plausible, wholly false findings.
9. **Advisory first.** Ship reporting, exit 0. Flip to fail-closed ONLY when that rule's backlog is
   zero AND points 1-8 hold. Never flip a rule that has not been challenged on a suspicious number.
10. **The checklist row updated** with the real enforcer name — no phantom tools. 9 of 21 rows once
    named a `consistency-scanner` that has never existed.

**Acceptance for the TRACK (not per rule):** every one of the 24 rows carries a rule meeting points
1-10, or a recorded exception naming a decisions.md D-number. "Has a script" is not the bar; the
2026-08-04 measurement of 0-of-24-validated is the baseline this must move.

### Guardrail carried from this session

**MOVED to `STOP-CATALOGUE.md` §E3.** Headline: a rule returning zero is a claim requiring
evidence, not a pass.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT 2026-08-05 to `memory/session-2026-08-05-swept-narrative.md` (verbatim, byte-cap pressure,
neither closed).** Snooza pitch-demo tasks 1-4 (AR `.glb`/`.usdz`, Tier W cursor-field, client-
usability presets, 2 unproven-fix verifications) + TRACK 1 routing R1-R4 (R4/R1 SHIPPED 2026-08-04,
R2/R3 still open, R3 blocked on Spec 35 `scalar-media`). Read the pointer file before picking either
up — do not re-derive from memory.
