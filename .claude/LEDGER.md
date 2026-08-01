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

## CURRENT FRONTS

### Track 3 — Spec 38 motion: WAVE D **WAVE 2** EXECUTED 2026-08-01 (D442–D445)

**Wave 2 shipped + deployed to the canary. Verification state is stated PER ITEM below — read it, do
not assume a uniform "done".** Full register + all 11 residual steps (K–V): `plans/2026-07-31-motion-wave-D-client-readiness.md`.

| Verified LIVE with numbers | Built + deployed, NOT verified |
|---|---|
| **Colour-token contract** — cards now render distinct from the page background | **Morph on 28/28 blocks** (was 3) — artefact-verified; no live morph render measured |
| **Slider chrome** — 44×44 button, 22×22 icon constant at 375/768/1440; idle dot 5.79:1 (was ~1.2:1) | |
| **Image-sequence scrub** — gradual frame progression, documented mirror defect did NOT reproduce | |
| **Motion-path SKEW** — `preserveAspectRatio="none"` removed, proven via transform matrix | |
| **Scramble presets** — Bean-APPROVED. 3-column page **2105**, triggers 480/600/800 vs 4,331px page | |
| **Drag roster** — now tracks the pointer 1:1 (was 3,3,6,9,9,12,12,**14px** for the same gesture) | |
| **Resting position** — 5 presets × 3 viewports, all `sticky`/`transform:none`/on-screen/below header; **default applies to attribute-less blocks** (page **2109**) | |
| **post-grid dots** — forced scroll dot 0→2; real drag `scrollLeft` 820→1745, dot 2→4 (page **2110**) | |
| **Buybox on the PDP** — renders (gallery 659px + configurator 573px), strip overflows 712>659, pickers present | |

**Two root causes worth carrying forward:**
- **`scroll-behavior: smooth` was racing the drag's `scrollLeft` writes.** Proven by A/B on the same
  shared module: `sgs/gallery` (no smooth) tracked 1:1; `sgs/post-grid` (smooth) reached 14px. This
  project already had a captured lesson that this property breaks scripted MEASUREMENT — nobody noticed
  it also broke the FEATURE. Silently affected `sgs/trustpilot-reviews` too. Fixed in the one shared module.
- **`surface` was doing two contradictory jobs** — page background AND card fill, across 33 blocks,
  never defined anywhere. The load-bearing fix was the EXTRACTOR (it detected `surface-alt` and never
  wrote the slug), without which the 76-site sweep would have been undone by the next snapshot regen.

⚠ **STILL OPEN — do not read the green column as "motion is done":**
- **Motion-path ~2,705px jump** (Step E-residual). Causally proven to be the SAME defect as
  "ends under the header". **THREE approaches already ruled out by measurement** — read
  `assets/css/fx-motion-path.css`'s docblock before proposing anything.
- **Drag text-selection symptom Bean SAW is UNREPRODUCED** across 3 browsers (Step O). A cause-agnostic
  mitigation shipped. **Per measurement-vs-eye, Bean's report STANDS over the null measurement.**
- **Buybox strip has no drag handler** (Step V) — pre-existing, documented in its own block.json; its
  named prerequisite (a product-page fixture) is now satisfied.
- `sgs-healthcare` dot contrast 2.97:1 (Step M) · image-sequence pin-ON path unobserved (Step N) ·
  cursor-glow FR-38-25 **spec'd, NOT built** (Step R) · looping carousels (Step Q).

⚠ **`sgs/buybox` is a PDP-ONLY block** (its block.json + Spec 30). Renders empty on any non-product page
BY DESIGN. **Do NOT give it a product-picker attribute** — that widens it beyond spec. The two dead
instances on page 2086 can never render; remove them (Step S).

⚠ **D163 does NOT pre-answer the content-collection fold** — it ruled on different pairs, and its cited
`has_inner_blocks` mechanism was DROPPED from the DB 2026-07-05 for mis-routing. Council verdict 3–1 to
retire it into card-grid; Bean approved **including porting the non-Woo CPT path** (Step P).

### Track 3 — prior context (Wave D wave 1, D434/D435/D436)

**Narrative swept 2026-08-01 to `memory/session-2026-08-01-waveD-review-narrative.md`** (the LEDGER hit
its byte cap). Full register + plain-English explainers: `plans/2026-07-31-motion-wave-D-client-readiness.md`.

⚠ **The wave-1 table below is SUPERSEDED by the wave-2 section above and by the plan's own step
headings.** It is kept only so older references (D426–D436, prior reports) still resolve. Every "Open
for Bean" item it lists was RULED ON 2026-08-01: Step 7 cursor-glow → emitter+participant, spec'd as
FR-38-25 (D444); FR-38-12 Flip → superseded by the consolidation council (D445); palette audit → done
(D442); scramble timing → fixed and Bean-approved. **If this table and the plan disagree, the plan wins.**

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

- **⭐ Track 1 (cloning/Spec 31) — ACTIVE. Root cause found; Phase 0 plan ready, NOT executed.**
  Registers: **`plans/2026-08-01-db-derivation-and-converter-cleanup.md`** (parent, 4 settled
  decisions + 8 findings) and **`plans/phase-0-db-rebuildable.md`** (fly-through, 9 steps + 2 QA
  gates, ~105 min). Prior L2 register: `plans/2026-08-01-wrapper-recognition-cascade-rework.md`.
  **THE ROOT CAUSE (2026-08-01):** the knowledge-base DB **cannot be rebuilt from scratch** — it is a
  gitignored artefact whose foundational tables exist only because ~15 one-off `migrations/` were
  each hand-run once, no runner, no replay. `blocks`/`block_attributes`/`block_composition` have
  **no `CREATE TABLE` anywhere**; `property_suffixes` (154 rows) has DDL only in test fixtures. Every
  "worked last month" bug traces here: `role='scalar-media'` 2→0 (hero art direction lost — worked in
  the real 2026-07-02 run, artefact in `scripts/pipeline-state/sgs-clone/`); `container_kind` never
  written on reseed.
  **SHIPPED:** D446 band-arrangement fold (`d2d0579f`) + the L2 decision/transfer seam doc (`7a21d07d`).
  Suite **587/1 skip**; conformance 23/27 fail (pre-existing); feature-grid 6/6.
  **DECISIONS SETTLED (Bean):** (1) fix `role` UNIVERSALLY, not scalar-media as a spot fix — 72
  routing call sites across 8 files, 1594 sgs attrs NULL; (2) `container_kind` auto-applies on
  reseed, drift → `parking.md`; (3) `delegates_content` DEMOTED not dropped (parent+`allowedBlocks`
  cover 12 of 17; the other 5 are open containers); (4) the section-annihilation bug stays in Phase 5
  — zero live blast radius today.
  **NEXT SESSION: execute Phase 0.** It starts with a backup; the DB is gitignored and has no other
  copy. Council found 3 BLOCKERs, two of which would have damaged the live DB — read the plan's
  COUNCIL FINDINGS before step 1.
  ⛔ **Do NOT delete `scalar-media` or Loop 2** — both are live/recoverable, evidence in the parent
  plan. ⛔ **Do NOT delete any migration before its replacement seeder is PROVEN** — two `CREATE
  TABLE`s live only inside migrations queued for deletion. ⛔ **Scope every DB stat to `sgs/%`** —
  core blocks inflated a percentage three times this session. ⛔ **`sgs-card-grid` "cardRadius
  12→18px" is WITHDRAWN as a probe artefact.** ⛔ **Do NOT alias `trigger`→`tab`** — Bean's call.
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
  `git branch --show-current` · D-ceiling `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`
  (**heading-anchored on purpose** — the old unanchored form reported D5557 on 2026-08-01 by matching
  the hex colour `#0D5557`; true ceiling was D453)
  (currently D434 — a co-active track took D432/D433 the same day; re-check live) · framework
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

### TRACK 1 (cloning) — separate track from the motion review below; pick one

**Task 1 — Execute Phase 0: make the DB rebuildable** [inline Opus, ~105 min]
**Read `plans/phase-0-db-rebuildable.md` IN FULL first — especially COUNCIL FINDINGS (3 BLOCKERs).**
Every step carries a pre-written prompt and its own model. **Acceptance:** `--rebuild` on an empty
file reproduces the table set; both negative controls (`property_suffixes` AND `block_attributes`)
return; `schema-baseline.json` committed.
⛔ Step 0.0 backs up FIRST — the DB is gitignored, no other copy exists.
⛔ Migrations hardcode `Path.home()`; a rebuild MUST use the sandbox harness or it writes to the
LIVE DB — QA Gate B would otherwise drop a real table.

**Task 2 — Phase 1 regenerative seeders, ONLY after Phase 0 passes** [inline Opus]
Convert the ~24 remaining migrations to git-tracked JSON + idempotent seeders, following the working
pattern (`db_lookup._migrate_html_tag_to_core_block` + `scripts/data/*.json`). ⛔ Build the JSON from
LIVE state, never by replaying migration history; ⛔ never delete a migration before its seeder is proven.

---

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
