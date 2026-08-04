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

### Track 3 — Tier W ADMITTED · physics-canvas SHIPPED · nine reports consolidated (D479)

**Pushed: `50c9122b` (physics-canvas) · `19d4d33f` (Tier W/D479 + Snooza) · `09960945` (gap register)
· `3a581721` (council fixes) · `faa1652f` (spec staleness). Every claim below is a measurement.**

| Shipped | Proven how |
|---|---|
| **Tier W (WebGL) ADMITTED — doctrine is now V/G/H/W** (D479, Bean-approved 4/4) | Justified from the doctrine's own text: **OGL FAILS Tier H's admission test at part (iii), "single-purpose"**. 120KB Tier-W-pages-only budget · OGL (npm declares **Unlicense**; ⚠ NO LICENSE file in the repo, so `gh api` returns null — directionally fine, NOT verified; wrapped for swappability) · no-WebGL falls back to the Tier V equivalent · CLOSED list. |
| **`sgs/physics-canvas` shipped + seeded** (renamed from sandbox per Bean) | 70 identifier replacements, 0 residual; `dbschema/sandbox.py` verified untouched. Seeded `section-root`/`sgs/container`. **First-paint capture GENUINELY RAN**: 3/3 children visible JS-off, 0 clones, 0 inline styles, fixture 2139. |
| **`sgs/google-reviews` WCAG 2.5.7 + reduced-motion sweep** | google-reviews **17/17**, trustpilot **17/17**, post-grid **17/17** live. `prevSlide()` carried the SAME defect mirrored and was NOT in the finding — found by reading the pair. |
| **Master gap register** — nine reports into one ranked doc | `plans/2026-08-03-motion-gap-register.md`: licences · 8 built-weaknesses · **13 missing categories** · client-usability patterns · Tier W. |

⛔ **GSAP IS NOT MIT.** SPDX `NONE`, "Standard 'no charge' license", free since **30 April 2025**.
Its Prohibited Uses clause bans use in tools letting users build visual animations without code in
competition with Webflow. **Client sites are fine; a DISTRIBUTED plugin sold on visual motion
authoring (the 299/yr Configurator Pro) is the exposed case.** MIT escape hatches: Motion, anime.js v4.
⛔ **LYGIA is Prosperity-licensed** (commercial = 30-day trial). I recommended it earlier in-session;
that correction is at the top of the register. **Reworking a restrictive library does NOT make it
yours** — a derivative work stays bound. Implementing the published technique yourself is the legit route.

⛔ **A STALE SPEC MADE A FRESH AUDIT RECOMMEND RE-FIXING WORKING CODE.** Spec 38 still described two
bugs fixed hours earlier; a client-readiness audit called one "the single highest-value fix in this
whole audit". The agent was not careless — **it cited the spec, and the spec was wrong.** Fixed
(`faa1652f`). Treat every "known defect" in any register as a claim with a date on it.

⚠ **A doc council then found I cited D479 in Spec 38 without writing the decision.** Written
(`3a581721`). Also fixed: the Snooza plan contradicted its own corrected product data; the register
had dropped a WCAG 2.2.2/2.3.1 finding from its own sources.

⚠ **Snooza product data CORRECTED by Bean:** **THREE** variant axes — 4 sizes x 6 colours x **3
headrests = 72 SKUs**, not 24. Two accessories are NOT booleans (Medial Thigh Support has 2 nested
variants; **Leg Rest has 4 sizes constrained to match the chair**). The existing engine models
add-ons nowhere. Reference images are at `sites/snooza-chair/assets/` (the documented path did not exist).

⚠ **I hand-authored a fixture with a guessed attribute** (`iconSlug` — not declared on `sgs/icon`),
which WP silently discards. The oldshape audit caught it. This project documents that exact trap (D338).


### Tracks 1b / 1c / 2 / 2+2b — stable · **Track 1 MOVED 2026-08-01 (D437–D439)**

Full detail lives where it already did — read before acting, do not assume it is current from
memory alone:

- **⭐ Track 1 — ROUTING AUDIT COMPLETE + tier axis SHIPPED 2026-08-03 (D480).**
  **Registers: `.claude/reports/2026-08-02-pipeline-routing-review.md` (the findings) +
  `.claude/reports/2026-08-03-handover-to-spec35-block-attribute-defects.md` (block/DB defects → Spec 35).**
  ⚠ Both paths were written WITHOUT the `.claude/` prefix until 2026-08-04 — they resolved to
  nothing from the repo root, so a fresh session looking for the register found no such file.
  8 surface critiques + a LIVE `/sgs-clone` run (canary **2130**) + a 3-rater QC council.
  ✅ **SHIPPED: the per-device content tier axis.** `content_attr_for_element(slug, element, tier)`;
  base resolution excludes tier-suffixed attrs; **tier requested but sibling absent → LOUD GAP, no
  fallback** (Bean-ruled). Negative control proven. **597 pass / 1 skip.**
  ⛔ **Axis does NOT reach `splitImage`** — `role='scalar-media'` is `styling-behaviour`, so it never
  enters the content walk. Reclassifying it is the prerequisite for retiring loop 2 → **Spec 35**.
  ⛔ **Stage 2 has 8 read sites across 3 processes** (its `matches` list is Stage 4's ITERATION SOURCE) and **loop 2's
  GATE belongs in `recognise_section` and is ABSENT there** — measured: `sgs-quote` becomes
  `sgs/quote`, never a container. Both are re-plumbings, not deletes. See TRACK 1 (routing) below.
  ⚠ **`trace.jsonl` STOPS AT STAGE 4**; `errors.log` never created. **Live parity: content 99%,
  CSS 83/84/89% — worst at MOBILE**, matching the 145 unseeded tier rows in the Spec 35 handover.
- **Track 1 — Phases 0/1/1b/2/3 COMPLETE 2026-08-02 (D464, D470–D478). Phase 4 PARTIAL; Phase 5 OPEN.**
  **Full narrative: `memory/session-2026-08-02-track1-phase1.md` + `-phase0.md` — read before acting.**
  ⛔ Phase 4 residuals + **`walk.py:20-26`'s FALSE claim** (says Step 6 is future; it shipped).
  ⛔ **MIGRATION REPLAY IS A DEAD END** · never delete a migration before its seeder is PROVEN ·
  **scope every DB stat to `sgs/%`** · `populate-db.py` is at `~/.agents/…`, not in git — never run whole.
- **⭐ Track 1b (Spec 35) — ENFORCEMENT SESSION 2026-08-04 (D481–D484). Full narrative +
  the 5 corrections: `memory/session-2026-08-04-spec35-enforcement.md` — READ IT before acting.**
  **ENFORCEMENT COVERAGE (the measured answer): 0 of 24 end conditions have a script VALIDATED to
  cover all instantiations.** 11 UNENFORCED · 10 named-enforcer (measured 1 enforced / 8 partial /
  **4 vacuous** / 2 unwired) · 3 new advisory rules. **All 3 new rules were BLIND on first build**
  (0-vs-65, 12-vs-15, 43-vs-23), each caught only by challenging a low number. **"Has a script" and
  "is enforced" are different claims.**
  OPEN: Part I (2), Part-L 4–32%, T1 parity 157 gaps/23 blocks, the 31 content misses.
- **Track 1c (Spec 31 converter completion):** build shipped; open item is PROOF not build —
  `batch-report.json` reads 33 UNVERIFIED. `plans/2026-07-22-spec31-completion-to-100.md`.
- **Tracks 2+2b (nav/header/footer merge):** 5-wave strategic plan landed (D413), Wave 1 CLOSED,
  Wave 2 in progress. `plans/2026-07-29-merged-spec36-37-track-strategic-plan.md`. Task 5 (drawer
  variants) was REJECTED by Bean 2026-07-29 — do not re-present those pairs without real work
  first (`memory/session-2026-07-29-task5-drawer-rejection.md`).

---

> **HANDOFF QC: the independent rater returned INCONSISTENT, and it was right.** I had already
> run the same checks myself and called them clean — the rater then found **two stale figures in a
> plan row I never opened**: Phase 3 claimed "clean at 37 tables" (live is **36** since
> `array_item_fields` was retired at D475) and "both gates are still invoked MANUALLY" (false from
> the moment D473 wired them into `prebuild`, and it survived two doc sweeps). Both fixed.
> ⚠ **This is the day's lesson one final time: my self-review passed and the independent review
> found real defects.** Everything else the rater checked verified clean — D478's claims against
> code, D-ceiling 478, 36 tables, 591/1 skip, the plan and LEDGER now agreeing.

## Standing constraints (carry forward — these are rules, not history)

### Track 1 / DB — restored 2026-08-02 after a handoff edit truncated them (D101: never SUBTRACT)

- ⛔ **"IT FUNCTIONS" IS NOT "IT IS SAFE" (Bean, 2026-08-03 — supersedes the D474/D476 wording).**
  The target is **100% routing accuracy, totally deterministic**. *"It works here"*, *"good for
  now"* and *"it was only just fixed"* are **not** reasons to keep a mechanism. A mechanism that
  cannot generalise to any block, page and content shape is a **cheat to replace**, not an asset to
  protect — being recently repaired makes it no safer.
  ⚠ **A previous session wrote "do NOT delete `scalar-media` or Loop 2" into this section as a
  standing rule. Bean did not set that rule and it contradicts the universal principle above.**
  It is REMOVED. `role='scalar-media'` is a **per-block cheat**: 2 rows in the whole DB, both
  `sgs/hero`, serving one bespoke branch that is the codebase's only `--mobile` BEM → `*Mobile`
  route. It is being **replaced** by a universal per-device content-routing axis, not preserved.
  **Retain only the transferable lesson:** the D474/D476 incident proved a *measurement* error —
  a mechanism was called dead because a **broken caller gate** hid it. Prove a path is dead by
  reaching it, never by observing it not fire.
- ⛔ **Do NOT write a tactical "never delete X" rule into this section.** Standing constraints are
  for *universal* principles and *measurement* lessons. A per-artefact preservation order dressed
  as a rule blocks exactly the ruthless replacement the design philosophy requires.
- ⛔ **ORDER IS LOAD-BEARING** for `property_suffixes` + `modifier_suffixes` (`ORDER BY rowid`,
  `LIMIT 1` for the former — first row WINS). Compare-first + DELETE + ordered re-INSERT, NEVER
  `INSERT OR REPLACE`.
- ⛔ **Do NOT add `block_composition.has_inner_blocks` to any population gate** — it is DERIVED, not
  cached. **A population floor is the right gate for a CACHED fact and the wrong one for a DERIVED
  one.**
- ⛔ **`block_composition.composition_role` LOOKS dead from the converter but is LIVE** —
  `db-consistency/check_tier_composition.py` (in `prebuild`) reads it. Do not drop the column.
- ⛔ **A SELF-HEALING SEEDER BLINDS AN IN-PROCESS TEST.** Anything importing `db_lookup` repairs
  drift before an assertion can see it. The detector must be a separate process that never imports
  it → value-identity assertions in `check_row_floor.py` (sqlite3 only — keep it that way).
- ⛔ **A population count cannot see a RECLASSIFICATION** (right row, wrong-but-plausible value;
  1012 → 1012).
- ⛔ **A table with `CREATE TABLE IF NOT EXISTS` on a hot path cannot be retired by dropping it** —
  every creator must go, or the schema gate stays red forever.
- ⛔ **A shrinking seed file PRUNES the live DB on next import** (cost the `attribution` slot once).
  The seeder now warns before it does.
- ⚠ **A negative control has its OWN vacuity modes** — confirm the break actually landed. Three in
  one day: one healed by the seeder, one patching a symbol computed at import, one catching the
  wrong exception class.
- ⚠ **Two migrations are HELD BACK deliberately** (`testimonial-*`): they UPDATE
  `block_attributes.derived_selector` and that regenerability is UNPROVEN. Never delete a migration
  before its replacement seeder is proven.

- ⛔ **`fx-horizontal-panel` has NO defect — a CSS bug provides the rescue.** `overflow-x: clip` with
  a non-clip `overflow-y` computes to `hidden`, which IS a scroll container, so native
  scroll-into-view rescues focus. Do NOT "fix" it to clip on both axes — that deletes the only
  WCAG 2.4.11 cover this effect has. (Wave E; full narrative `memory/session-2026-08-01-wave-e.md`.)
- **The WooCommerce gallery bug did not exist.** `core/query include:[540]` silently rendered product
  1125, whose gallery is genuinely empty. Check WHICH product rendered before diagnosing.

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
  (currently D467 — D464 went to a co-active track mid-session; re-check live BEFORE writing any D reference) · framework
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

**NONE.** `--target palestine-lives` still aborts on the `oldshape-audit` (29 NEW HIGH / 28 posts,
evidence: `reports/2026-08-01-palestine-lives-oldshape-blocker.md`), but **palestine-lives is
disposable Indus staging that gets remade — not production**, so this blocks nothing that matters
and the rebuild clears it for free. Fixer if ever needed: `scripts/wp-migrate-oldshape-blocks.js`.
The canary is unblocked and current.

---

## NEXT SESSION — Snooza pitch demo (revenue), or the motion gap register

**Read FIRST, in order:** this file → `STOP-CATALOGUE.md` → `decisions.md` **D479** →
**`plans/2026-08-03-motion-gap-register.md`** (THE consolidated register — 13 missing categories,
8 built-weaknesses, all licence reality) → `plans/2026-08-03-snooza-configurator-build-plan.md`
(⛔ read its SUPERSEDED banner first) → Spec 38 §1 (Tier W) + §3.3.

### Task 1 — Snooza PITCH DEMO [inline, Opus] — HIGHEST VALUE, revenue-bearing
**What:** one `.glb` + one `.usdz` in a standalone `model-viewer` page. No WordPress, no configurator.
**Why:** Bean's proposal ends *"I'll bring the Snooza Chair in 3D on my phone."* That demo needs a 3D
file and an HTML page — nothing else. It is a separate deliverable from the 6-week build, and it is
the one with a real deadline.
⚠ **Android AR uses the `.glb`; iOS AR Quick Look needs a `.usdz`.** model-viewer can auto-generate
one, but Google's own docs warn it "might not produce desired results" — for a live pitch on an
iPhone, ship an explicit `.usdz`. Assets: `sites/snooza-chair/assets/` (19 files + `3d-model/`).
⚠ Bean's ruling: **the model need NOT be dimensionally exact** — it must read convincingly on a phone.
**Time:** 2-3 days. **/qc gate:** Bean's eye on a real phone.
**Acceptance:** AR launches on iOS AND Android from one page.

### Task 2 — Tier W first effect: fluid cursor field [delegated, sonnet]
**What:** `sgs/cursor-field` gains a `webgl` mode using OGL, wrapped behind `init/setUniform/destroy`.
**Brief:** start from `PavelDoGreat/WebGL-Fluid-Simulation` (**MIT**, ★16.5k, clean config object for
radius/dissipation/force). Must honour all three Tier-W-only contracts (context-loss recovery,
explicit GPU disposal, pause off-screen) and fall back to the existing CSS glow.
**Depends on:** none. **Parallel with:** Tasks 3, 4. **/qc gate:** yes — `/qc-inline` + a live probe.
**Acceptance:** fluid visible on canary; a no-WebGL context still paints the Tier V glow; zero bytes
shipped on a page without it.

### Task 3 — Client-usability sweep [delegated, sonnet] — PRESETS BEFORE PARAMETERS
**What:** the register §3 item every audit independently landed on. Named presets a client picks
("Ripple", "Brick reveal"); raw numbers move behind an "Advanced" toggle. Plus: an audio
sensitivity/gain control (~15 min), and LABEL the three agency-only tools (image-sequence, fx-morph,
fx-scramble) in the editor so the capability roster stays honest.
**Parallel with:** Tasks 2, 4. **/qc gate:** yes. **Acceptance:** a preset dropdown ships on ≥1 effect.

### Task 4 — Verify the two unproven fixes [delegated, haiku] — 20 min total
`fx-morph` live on canary (D452's fix is committed but was never verified) and D451's motion-path
repeat-trigger status. Register §1 items 4 and 5.

### Dependency graph
```
Task 1 (inline, Opus — revenue deadline, do first)
Task 2 + Task 3 + Task 4 (parallel, delegated)
        ↓ /qc-inline per branch
Commit by EXACT PATH → push main
```

### Methodology guardrails (do not skip)
- **A stale doc is a trap that fires on the next reader.** Proven twice today: a spec described fixed
  bugs as live and an audit recommended re-fixing them; a client doc named a directory that never existed.
- **Never hand-author block markup with a guessed attribute** — WP silently DISCARDS undeclared attrs
  (D338). Serialise from a known-clean page, or use no attributes at all.
- **A probe that never reaches the effect measures the probe.** Two "failures" today were my own
  measurement bugs (an SVG object stringified; headless rAF throttling).
- **Fix the instrument, never the gate field.** `probe-first-paint.mjs` gained an EXPLICIT
  `--not-a-loop` opt-out; auto-detect was REJECTED because a loop block that FORGOT its marker is
  precisely the bug that assertion exists to catch.
- **Verify licences with `gh api`, never a README badge.** Two "MIT" claims were wrong today.
- **Shared worktree, other tracks active.** Commit BY EXACT PATH, never `git add -A`. Re-check the
  D-ceiling immediately before writing any D reference.
- **Deploy before measure**; `--dry-run` does NOT run the dirty gate; a page-HTML grep cannot see
  block CSS (it is lifted to `uploads/sgs-css/`).

---

### TRACK 1 (routing) — ordered follow-on from D480. Register: `.claude/reports/2026-08-02-pipeline-routing-review.md`

**Read FIRST:** that report (§THE FOUR DECISIONS, §7 the categorical target, §APPENDIX 18 corrections)
+ `.claude/reports/2026-08-03-handover-to-spec35-block-attribute-defects.md`.
**The design bar (Bean):** 100% routing accuracy, totally deterministic. Every branch must separate
its options by an INNATE CATEGORICAL DB FACT — never rowid, document order, catalogue order or a name
guess. "No match" is an intended outcome (class-section → `sgs/container`), never a fallback; a tie
is a LOUD failure. **Nine sites currently violate this — the report lists them.**

**R4 — Fix the trace — SHIPPED 2026-08-04.** It was **THREE defects, not one**, and "fix the trace"
mis-framed all three: the trace was never TRUNCATED, it was never INSTRUMENTED past stage 4 (9 emit
sites, all ≤ stage 4 → now 26). (a) instrumented 9 / 9b / anti-mirror gate / 4i / 4j / 4k / 10 /
11.6 / run-completion; (b) `errors.log`+`warnings.log` were written ONLY when non-empty, so absence
could not distinguish "clean" from "never ran" — now always written, count on line 1; (c) **the one
no register caught** — the log surfacer ran at `orchestrator:2774`, BEFORE stages 10/11.6/4k, so
`summary.log` could never describe them however well instrumented. Now re-surfaced in a `__main__`
finally-block covering every exit path (early return, stage-gate `sys.exit`, exception).
Negative control proven: a stage-4-only trace fails the assertion.

**R1 — Section-root capability gate — BUILT 2026-08-04, Bean-ruled DISSOLVE.**
NOT a design change: **FR-31-16 already mandates this exact gate** ("Recognition consults
`blocks.tier='class-section'` via `is_class_section_block()`; class-section blocks emit their
composite, ALL OTHERS fall to the FR-31-4 default"). The flag was only ever read by the Stage-1
voter and loop 2's content entry — neither decides the emitted block. Gate inserted in
`recognise_section`, gating the NAMED branch only (atomic/scalar resolve from no root class, so
FR-31-4's subject does not reach them). Demotion emits a `recognise_section_capability_gate` trace
event — **trace only, no gap row** (Bean: marking a new class-section block is a declaration
responsibility; container-as-default is the designed outcome, not a defect). `entry.py` binds
`recognition.set_trace_fn` or the event is a guaranteed no-op.
⛔ **MEASURED, and it corrected my own docstring:** the demoted node's identity **DISSOLVES, it does
not nest** — FR-31-4 recurses the section's BEM *element* children, so `sgs-quote` →
`sgs/container > sgs/text + sgs/text`, NOT `> sgs/quote`. Text survives; typed attrs + `<cite>`
semantics do not. On a childless-stub emitter the same dissolution **RECOVERS** dropped content:
`sgs/tabs` went from a self-closing stub with ZERO children (all tab content silently lost) to a
container carrying its buttons + info-box.
**BEAN'S RULING (2026-08-04) — dissolve is CORRECT, and this is the justification to keep:** a
class-section in a draft is *literally a container/wrapper around a group of blocks*, so the
container default is a **1:1 structural match** with what the draft actually is. The few
class-section blocks have a container layer built into them. A standalone non-class-section block
as a whole section is improbable — it would at minimum be paired with a heading, which is a group,
which is a container.
**Blast radius: exactly 7 tests, one root cause** (6 golden byte-compares + 1 tab dissolve test).
**Every real-draft golden (`mamas-munches-homepage__*`) passes** — inert on the real corpus.

**R2 — Stage 2 removal** [sonnet, ~90 min] — after R1. Re-source Stage 4's loop from `voter.json`;
re-key 4 bucket routers on `per_section_results`; **amend FR-31-12 in the same commit**. /qc-council.

**R3 — Loop 2 body → loop 3** [sonnet] — **BLOCKED on Spec 35 reclassifying `scalar-media`.**
⛔ Before cutting, measure `sgs/cta-section`'s real interior — loop 3 enforces `accepts_allowed_blocks`
and loop 2 never did, so a non-allowed child becomes a ContentGap (content loss).

```
R4 (haiku, first) · R1 (inline, Opus) → R2 (sonnet) · R3 blocked on Spec 35
```

### Routing guardrails (earned 2026-08-03)
- **A static audit of this pipeline is a THIRD of the truth** — 8 agents read the scripts; ONE live
  `/sgs-clone` run overturned two headline findings. Run the pipeline before concluding.
- **Establish the DENOMINATOR before quoting a percentage; derive nothing you can count.**
- **A fix is a hypothesis too** — two proposed fixes would have shipped silent WRONG VALUES.
- **Prove a path is dead by REACHING it, not by observing it not fire** (D474).
