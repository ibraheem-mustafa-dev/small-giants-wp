---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-07
note: "THE single living-status doc. Status is REPLACED here each session, never appended. History → dated snapshots in memory/session-YYYY-MM-DD*.md (the ledger-rotate Stop hook snapshots automatically past the cap but NEVER edits this file — the sweep is manual). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep this file lean (< 24,576 bytes)."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

### FOR BEAN — plain English (read this first)

**What this is.** One file that answers "where are we and what's next", so a fresh session (or you)
gets ONE true answer instead of three drifting ones.

**Where 2026-08-07 left things, in a sentence each:**
- **Clients can now set a different image for phone, tablet and desktop** on the hero and media
  blocks. The tablet option was written into the code months ago but connected to nothing, and
  neither option had a control — so only the cloning robot could use them, never a person.
- **Checked on the real site at three screen sizes, and the right photo appears at each.** Two bugs
  turned up only because it was checked live; both are fixed.
- **The alarm that was meant to catch exactly this kind of dead setting was asleep.** It cleared any
  phone/tablet setting as long as the block had *any* responsive styling anywhere. Now fixed, and
  proved by deliberately breaking it and watching it fire.
- **A colour rule was wrong at the source.** One row said a shadow counts as a colour; 18 settings
  inherited it. One correction fixed all 18 automatically.
- **A conclusion I reached yesterday was wrong and has been retracted** — a self-repairing piece of
  the system had quietly undone my test conditions, so I measured the same thing twice and thought
  it proved something.

**Older, still true:** WebGL is in the framework (Tier W, budgeted) · ⛔ GSAP's licence has a clause
worth knowing before selling a plugin built on it · the Snooza job is 72 combinations, not 24.

## CURRENT FRONTS

> **D-ceiling: RUN THE COMMAND — this line no longer caches the number.** The cache is what went
> stale as "D498" on 2026-08-06 while the same file said 504 four sections later; a QC subagent
> caught the self-contradiction. A caveat is not a mechanism, so the number is gone:
> `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
> **D515-D517 (2026-08-07)** = art-direction tiers live on hero+media, and the dead-control gate's
> tier blind spot closed in both CHECK 4 and CHECK 1. **D514 RETRACTS D511** — a self-repairing
> mechanism had reverted the test conditions at import, so D511's and D513's conclusions are void.

### Track 3 — CLOSED (D479). Tier W admitted, physics-canvas shipped.

Narrative + licences: `memory/session-2026-08-03-track3.md`. Binding facts: ⛔ **GSAP is NOT MIT**
(Prohibited Uses bans visual-motion-authoring tools competing with Webflow — exposes the Configurator
Pro, not client sites) · ⛔ **LYGIA is Prosperity-licensed** · ⚠ **Snooza = 72 SKUs**.

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
- **⭐ Track 1b (Spec 35) — POOL 23 → 0, CLOSED 2026-08-06 (D504).** Every `sgs/%` string attribute
  carries a role, all by MECHANISM, zero hand overrides. Four REAL bugs fixed en route
  (image-sequence content drop · inert `link-content` chain · `sgs/separator` icon routing ·
  `form.formName` dead control → the form's accessible name). **A7, A8 and A9 are now all CLOSED
  (D508/D509/D510), and the A7 reseed IS landed.** Next = the art-direction rollout across 5 more
  blocks (4 untouched + the VIDEO half of `sgs/media`), then **Task F**. The parallel Task-B
  session has finished and committed.
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
  (**do NOT cache the number here — run the command.** This cell held a stale "D498" for the whole
  of 2026-08-06 while the top of this same file already said 504, and an independent QC subagent
  caught the self-contradiction that the file's own "never trust this line" caveat was written to
  prevent. A caveat is not a mechanism; the command is.) · framework counts via `/sgs-db` or
  `/wp-blocks`, never cached in prose.
- **Canonical specs:** cloning = `specs/31-UNIVERSAL-CLONING-PIPELINE.md` (read IN FULL each
  cloning session). Motion = `specs/38-SGS-MOTION-SYSTEM.md`. Nav = `specs/36-...`; header/footer
  = `specs/37-...`. Full roster: `specs/README.md`.
- **Sites:** staging/dev = palestine-lives.org. staging/canary = sandybrown-nightingale-600381.hostingersite.com.
  Both WP 7.0.2 (verified 2026-07-20 over SSH on both).
- **Fixtures on the canary (not assumed clean):** motion 2083/2086; mega page 1762, panel 1745,
  menu 100, item 1746; header CPT 1570, footer CPT 1654; **art-direction 2161**
  (`/art-direction-tiers-canary-hero-media/`, hero + media with 3 distinct crops each — reuse it for
  the Task-1 rollout); Spec 32 guard-purge canary 2164 (Track 2's).
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

## NEXT SESSION (Track 1b / Spec 35) — art-direction rollout, then Task F

### THE GOAL — state it before picking up any task

**Bean's clients are tech-illiterate and live in the block editor.** Spec 35 exists so every SGS
block's inspector is genuinely usable by them: a control for everything the block can do, none for
what it cannot, one consistent shape across every block. **A setting that needs code to mean anything
is not done.** The 24 end conditions are only worth having if ENFORCED — measured 2026-08-04 at
0 of 24, which is what Task F exists to fix.

### ✅ CLOSED — Step 0/0.1/0.2, A7, A8, A9, and the gate blind spot

- **Pool 23 → 0** (D504) — every `sgs/%` string attr carries a role BY MECHANISM, zero hand
  overrides. ⛔ Re-measure, don't trust this line:
  `cd plugins/sgs-blocks/scripts/content-role-detect && python fingerprint_content_roles.py`
- **A7 (D508) + A8 (D509)** — attrMap ARITY decides colour-vs-shorthand; the dead header/footer grid
  surface deleted. **The A7 reseed IS NOW LANDED** — earlier ledger text saying "NOT YET IN THE DB"
  was superseded 2026-08-07.
- **A9 = the Track 1 critique, and it is worked through** (D510). Its two measured defects are now at
  their irreducible cores: `role='color'` on a non-colour property **19 → 1**; a colour property with
  a non-`color` role **10 → 1**. Both survivors are CORRECT disagreements —
  `nav-drawer.surfaceOpacity` (a number) and `trust-bar.backgroundOverlayColour` (a colour delivered
  through a gradient). **Do not "fix" them.** Root cause of the 19 was ONE row:
  `property_suffixes.Shadow` said a box-shadow is a colour while its sibling `BoxShadow` said `visual`.
- **Variant matching (D512)** — 9 variants across 4 blocks were unmatchable even when a draft NAMED
  them, because the value set came from `variant_slots` (which stores DISCRIMINATING slots) instead of
  the block's own declared enum. `trust-bar--text-only` no longer clones as `icon-circle`.
- **Art-direction tiers (D515)** — `sgs/hero` + `sgs/media` verified live at 375/768/1440.
- **Dead-control gate (D516/D517)** — CHECK 4 **and** CHECK 1 now require dynamic tier-key
  construction, not a bare `@media`. A/B proven on an identical tree; `--tier-audit` reports 0.

⛔ **The Spec 39 reply is DRAFTED, NOT SENT.** Three corrections the pipeline side needs before they
freeze it: **`stroke` IS a colour** (excluding it breaks SVG routing); **`css_property` alone is
insufficient** — their own `surfaceOpacity` example would route a number as a colour, so it needs a
value-shape guard; and **the DB-derived set already exists** (`_load_colour_terminal_props`) — import
it rather than restate a list. Their defect-A count of 21 is also wrong; the honest figure is 19.

---

## ⭐ NEXT SESSION — orchestration plan

**Identity.** You are the SGS framework engineer closing Spec 35. Two fronts: finish rolling the
art-direction tier pattern across the remaining media-bearing blocks, then start Task F — the
enforcement scripts that are the track's actual deliverable.

**State recap.** `sgs/hero` and `sgs/media` now render device-specific image tiers with a
device-switched editor control, verified on the canary at three widths. The same shape is missing on
five more blocks. Separately, Spec 35's 24 end conditions were measured at 0-of-24 enforced on
2026-08-04; Tasks C+D closed two, CHECK 5 added one, and the gate hardening above put real teeth in
two more. Task F closes the rest.

### Task 1 — roll art-direction tiers across the remaining media blocks

**What:** give each remaining media SOURCE attr the `{base}` / `{base}Tablet` / `{base}Mobile` shape
that hero and media now use, with ONE `<ResponsiveControl>`-wrapped picker.
**Scope note:** 4 blocks are untouched; `sgs/media` needs only its VIDEO half (the image half
shipped this session).
**Why:** a client cannot art-direct their own images on these blocks today — only the cloning pipeline
can write those values, which is precisely what Spec 35 exists to stop.
**Estimated time:** 25 min for the five blocks.

**Scope — measured 2026-08-07, already filtered:**

| block | attrs needing tiers |
|---|---|
| `sgs/before-after` | `beforeImageId/Url`, `afterImageId/Url` (+ the video pair) |
| `sgs/decorative-image` | `imageId`, `imageUrl` |
| `sgs/image-sequence` | `thumbnail` (the poster) |
| `sgs/media` | `videoUrl`/`videoId` + `thumbnail` — the VIDEO half; the image half shipped |
| `sgs/testimonial` | `avatarMedia` |

⛔ **NOT tier candidates — do not touch:** `showAvatar`, `photoShape`, `backgroundImageOpacity`,
`splitImageBleed`, `splitImageMobileObjectPosition`, `splitImageMobileHeight`. They are settings, not
media sources; a naive name-grep sweeps them in.

⛔ **`sgs/before-after` IS THE ONE UNSAFE ROW — and the risk is DUPLICATION, not just a dirty file.**
At handoff time `before-after/{block.json,edit.js,render.php,view.js}` were MODIFIED AND UNCOMMITTED
by the co-active track, plus an untracked `before-after/BooleanResponsiveControl.js` — and their diff
shows them **adding `videoAutoplayTablet`/`videoAutoplayMobile` per-device tiers to that very block
right now.** So Task 1 would land adjacent responsive-tier work on a block someone else is already
tiering. **Do `before-after` LAST, only once its tree is clean, and read their diff first** — you may
find the work already done.
**Safe to start immediately (all clean):** `decorative-image`, `image-sequence`, `testimonial`, and
`sgs/media` (its files were committed in `ec71fd76`). `team-member` is also dirty but is NOT in this
task's scope.

**Orchestration:** inline (main thread). It is one repeated pattern across five blocks, and BOTH bugs
it produced on hero/media were caught only by a LIVE capture — a subagent working from a pattern
description would repeat them.
**Depends on:** none. **Parallel with:** none. **/qc gate after:** yes — live capture per block, then
`/qc-inline`.
**Acceptance:** for each block, all tiers in the DOM and exactly ONE visible at 375/768/1440, asserted
on COMPUTED VISIBILITY. Markup presence scores a false pass.

⚠ **The two traps hero/media hit — both will recur:**
1. **Naked mode.** A block that renders its media element AS the block root REBUILDS the markup
   further down `render.php` and discards the tier siblings. Look for a second builder before
   assuming one code path.
2. **Selector lists.** Appending a descendant to a multi-member selector variable binds it to the LAST
   member only, leaving the rest unqualified — this hid every image at every width on `sgs/media`.
   Build tier selectors from the BARE scope selector.

### Task 2 — Task F: the enforcement scripts

**What:** build validated scripts for the Spec 35 end conditions that still have none.
**Why:** it is the track's actual deliverable; 24 end conditions with no enforcement are prose.
**Estimated time:** 40 min for a first tranche.
**Bar:** `STOP-CATALOGUE.md` §E6 — **"has a script" is NOT the bar.** Every script ships with a
`--self-test` proving it can FAIL, or it reads green forever.
**Re-measure the baseline FIRST (do not trust it):** 2026-08-04 recorded 1 enforced / 8 partial /
4 vacuous / 2 unwired / 9 absent. Narrative: `memory/session-2026-08-04-spec35-enforcement.md`.
**Orchestration:** delegated — pick per-script models with `/delegate`, dispatch in parallel via
`/dispatching-parallel-agents` once the roster is re-measured (the scripts are disjoint files).
**Depends on:** the re-measure. **/qc gate after:** yes — `/qc-council` (multi-rater, blub.db 255).
**Acceptance:** each end condition either has a script whose `--self-test` demonstrably fails on a
seeded break, or is explicitly recorded as unenforceable with a stated reason.

### Task 3 — send the Spec 39 reply (5 min, inline)

The three corrections above. Time-sensitive: they are about to freeze `COLOUR_PROPERTIES`, and
shipping it with `stroke` excluded breaks SVG colour routing.

### Dependency graph

```
Task 3 (inline, 5 min — send first; it unblocks another track)
Task 1 (inline; live capture + /qc-inline per block)
  ↓
Task 2 re-measure (inline) → Task 2 scripts (parallel subagents) → /qc-council
```

### Methodology guardrails (do not skip — every one was earned)

- **A component probe passing is NOT the pipeline working.** `content_attr_for_element` resolving said
  nothing about what the walk emitted; the gate still failed 3 of 4.
- **A change that produces IDENTICAL output did not land.** D511's "compensating step" failed the same
  3 tests before and after, because a self-repairing mechanism reverted it at import (D514).
- **Grepping page HTML for block CSS proves nothing** — SGS lifts it into `uploads/sgs-css/*.css`.
  Read the lifted stylesheet.
- **A regex returning 0 is a claim about the regex.** Mine could not match nested `@media{…{…}}`.
- **Declare the expected population BEFORE the run;** a number above it needs per-row justification.
- **Shared worktree:** commit by EXACT PATH, then **diff your own commit's file list** — the index can
  already hold another track's staged files. Never `git stash`.
- **The visual-diff gate is DATE-keyed, not change-keyed** — one path per block per day. A second
  same-day change to the same block must APPEND, not overwrite. Check before you `Write`.
- **Re-check the D-ceiling immediately before writing any D reference**, heading-anchored:
  `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`

### Known non-blocker

`npm run build` and the db-consistency gates are green as of this session. The converter suite
last measured **672 pass** when this session touched it — the gate work after that did not run it,
so re-run before relying on the number.

### Open — one caused BY this session, one genuinely not ours

- ⚠ **OURS, AND DESTRUCTIVE: THIS SESSION WROTE TO TRACK 2's CANARY (post 2164) AND IT LOST A TEXT
  NODE.** Their Spec 32
  guard-purge canary carried 5 undeclared attrs that WP discards at parse and deletes on the next
  save (`counter.endValue`→`number`, `form-step.stepTitle`→`label`, two `name`→`fieldName`,
  `mega-group.heading`→ a child `sgs/heading`). All 5 migrated via the editor data layer (D516 §2),
  and the page now renders `250` + `Mega group heading` where it rendered neither — so their sweep
  had been measuring blocks with missing text. **BUT** `sgs/mega-group` sets `templateLock: 'all'`,
  so its stored `sgs/text` child ("…renders a measurable node") was dropped by the editor on load
  and could NOT be re-inserted. That text is gone from the page. It was already doomed — ANY editor
  save would have dropped it — but Track 2 should re-count their text-owning nodes. No gate covers
  "children vs templateLock"; the oldshape audit checks attrs only. Track 2's call.
- **NOT ours — residual empty `sgs/media` ChildBlock** in the art-direction walk (D514) — not yet traced to its
  emitter. It blocks the `scalar-media` retirement alongside a durable data shape and a non-hero
  fixture.

## NEXT SESSION (other backlog) — Snooza pitch demo + Track 1 (routing)

**SWEPT to `memory/session-2026-08-05-swept-narrative.md` (verbatim, neither closed).** Snooza
pitch-demo tasks 1-4 + Track 1 routing R1-R4 (R4/R1 shipped 2026-08-04; R2/R3 open). ⚠ **R3 is
blocked on `scalar-media`** — see "Open, not ours" above; it is NOT retirable yet (D511 → D514).
