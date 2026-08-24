---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-22
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FIVE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **motion** track owns
`## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⭐ **If you are the colour-golden track, do NOT start from that section.** Read
`.claude/prompts/2026-08-24-db-and-script-code-only-investigation.md` — it is the executable
front and carries Bean's two rulings (D1 = A, D2 = A+B) plus the method gate. The ledger
section is status; the prompt is the work.

⛔ **Before building ANY script or hand-doing investigative work, grep the two GENERATED
catalogues in `.claude/dev-setup.md`.** 524 scripts across FIVE directories, and this repo's
recorded failure mode is rebuilding one that already exists. Search the SUBJECT (colour,
token, element, parity), never the verb — the same idea is spelled `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

## ▶ ⛔ CONTAINER-LAYOUT + TEMPLATE REMEDIATION — OPEN, THE LIVE FRONT (2026-08-24)

⭐ **START HERE: `.claude/prompts/2026-08-25-container-layout-and-archive-design.md`** —
renamed from `2026-08-24-template-remediation.md` (the track moved from template fixes to
the container/layout system). Leads with the highest-value open item and carries every
ruled-out list so nothing gets re-walked.

### ✅ Stack layout rebuild — COMPLETE 2026-08-24
`.claude/plans/2026-08-24-stack-layout-rebuild.md`. `sgs/container`'s "Stack" layout option
was a silent fall-through to block flow — `gap` did nothing, four inspector controls
vanished, no container-query/`min-width:0` treatment. Three tasks shipped
(`0d3f2353b`/`c76d0f120`/`be17c513b`): Stack now emits `flex`/`column` on `__inner`
(row-gap measured 43-52px against authored values); the Layout panel shows Gap/Vertical
alignment/Justify content for Stack, hides Flex direction/Flex wrap (dead under Stack); the
editor canvas mirrors it. **QC-inline 7/7 pass** — flex/grid unaffected, nested stacks keep
independent gaps, invalid `flexWrap` on a stack correctly coerced.

⚠ **`layout` has no enum in `block.json`** — an invalid value (e.g. a typo) silently falls
through to `display:block`, the ORIGINAL Stack bug by another route. Not fixed. Recommend
adding the enum.

⛔ **flexWrap default flip is BLOCKED on a content migration.** 94 stored `sgs/container`
instances carry no `flexWrap`, 4 carry no attrs at all. Theme FILES are all authored now;
the DB content is not. Several affected instances are `[GATE - DO NOT DELETE]` fixtures —
do not touch them outside a migration script.

⚠ **~59 "accidental columns" (containers authored as flex ROW that are really stacks) — THE
COUNT IS UNRELIABLE, RE-RUN BEFORE USING.** `survey-flex-row-shape.py` exists
(`--survey/--verbose/--json/--self-test`, 9/9 self-test) — its regex is now FIXED, but the
split below was produced BEFORE that fix, so
that figure was wrong. `layout:"stack"` now EXISTS as the correct destination, but
converting changes children from content-sized to full-width — a VISIBLE change needing
Bean's eye, not a mechanical sweep.

### ✅ 91px shop last-row contradiction — RESOLVED 2026-08-24 (D760)
**Supersedes D758's "do not re-attempt" warning below — that instruction no longer applies.**
Not a contradiction: an inline `width:100%` (specificity 1,0,0,0) always won; under GRID a
WooCommerce inline `<style>` rule inside a `@media` block — invisible to a cascade audit
that does not descend into conditional rules or read inline `<style>` elements — took over
and resolved its percentage against the grid TRACK, giving 91px. Fixed by winning on
specificity (0,5,1 — a tie is not enough, source order decides ties and WooCommerce's sheet
loads after ours). Shipped `1e7e2755`, theme 1.5.67. Measured live: 5×313.3px at 1440px,
5×340.5px at 768px, no stretch, no overflow at 375px.

⛔ **D758's ORIGINAL ruled-out list stands for the record, but its conclusion was wrong on
two of four counts** — "NOT a competing rule" and "NOT a selector miss" both rested on a
cascade scan that could not see an inline `<style>` nested in `@media`. The other two (stale
CSS, grid default stretch) still stand. Full detail: D758 + D760 in `decisions.md`.

**Governing rule, set by Bean, unchanged:** agents may NOT assess a template by reading
code, querying the DB, calling REST or inspecting hooks. **Log in with `/playwright`, open
the template, LOOK at it, interact with it.** Code reads may explain what was seen; they
may never be the evidence something is fine. Every gate on this track has passed while
templates were visibly broken at least three separate times.

⚠ **`solid` option-picker contrast fix — deployed, NOT verified.** No live surface renders
a solid-preset picker (`showPickers:false` on shop + rail; the buybox uses `outlined`). The
12.55:1 measured after deploy is the pre-existing outlined behaviour, not evidence the fix
works. Needs a product-card instance with pickers enabled.

⚠ **Open for Bean (design, not correctness):** at 375px the shop is 1-up @327px, the PDP
rail 2-up @155px — under the 167-195px readable-card floor. Screenshots sent 2026-08-24.

✅ **ALL FOUR PRODUCT LISTINGS NOW USE THE BESPOKE CARD (D757).** Two of the four generic
ones were WooCommerce's OWN plugin templates (`taxonomy-product_attribute`,
`product-search-results`) — a repo grep missed them. Fixed by putting `sgs/product-card`
inside the existing `woocommerce/product-template`; WooCommerce keeps query, filters,
sorting, pagination, relatedness.

⛔ **D756 — the card-grid query-inherit rebuild is DROPPED, not parked (Bean's call).**
Nobody in the ecosystem replaces the WooCommerce loop; the WooCommerce-free path already
exists (`cpt-collection`); inherit mode would not have fixed the editor preview either. Do
not re-propose without meeting D756's measurement first.

⚠ **The single-child-shrunk container shape (D757) was NEVER swept repo-wide.** A single
flex item in a ROW sizes to content — fixed on `single-product.html` only via
`flexDirection:"column"`. The row default is deliberate; only `<main>` suppresses it.
⚠ `taxonomy-product_attribute` is NOT live-verified — both product attributes have
archives disabled (`attribute_public = 0`), no reachable URL. Answers register item G2.

**Errors reported on EIGHT templates:** Order Confirmation · Page: 404 · Page: Coming
soon · Product Archive · Products by Attribute · Search Results · Single Posts · Single
Product. **Only 404, Single Posts and Product Archive are confirmed clean.** Search
Results, Single Product, Order Confirmation, Coming soon, Products by Attribute have never
been opened in the editor this track.

**Also open — full register is Part 2 of `.claude/plans/2026-08-24-template-by-template-
remediation.md`, do not restate it here:** generic product stacks swept (B1-B3 closed),
unstyled `catalog-sorting`/`query-pagination` (C1/C2), archives inconsistent with each
other (D1-D4 — a design decision for Bean, not an implementation task), pagination vs the
old infinite scroll (F, needs a `git log` answer first), template bloat/duplication
(G1/G3; G2 answered above).

**X-2 shipped and measured (2026-08-23).** WooCommerce/jQuery dequeue gate is live. Six of
eight surfaces are inside the 50KB JS budget; all eight were over it. Shop and product
correctly KEEP the stack and still dropped ~42KB each. Figures in `decisions.md`.

⚠ **`sgs/card-grid`'s Content Source panel literally offers "Product collection (no
WooCommerce needed)"** (`cpt-collection`) alongside "WooCommerce products" (`wc-product`).
Both render `sgs/product-card`. Read the INSPECTOR LABELS before saying a feature does not
exist — reading enum slugs alone produced a wrong statement to Bean once already.

## ▶ MOTION TRACK — 2026-08-24 (FR-38-28 complete; the editor is the open gap)

⭐ **START HERE: `.claude/prompts/2026-08-25-motion-next.md`** — the executable front. It opens
with the research decision, then the editor verification.

**Status:** `.claude/plans/2026-08-24-spec38-motion-register.md` (session-close audit at the top).
Decisions **D766** + **D767**. Canary **page 2721** — five looks, three controls, one page.
2716 and 2717 are deleted; do not go looking for them.

✅ **FR-38-28 IS COMPLETE.** All four looks Bean signed on 2026-08-07 ship, plus three follow-ons
he asked for on sight: `brick-reveal`, TRAIL (lerp) and SHAPE. Spec 38's field-type table and
FR-38-28 section carry the detail — do not restate it here.

✅ **A 23-DAY-OLD BUG IS FIXED (D767).** `spotlight-mask` lit a spot offset by the element's
distance from the viewport top — a mask resolves against the element box, the layer against the
viewport. Offset +256 → 0. **Masked types are now EMITTER-ONLY** (Bean's option A). New gate
invariant **I8** fails the build if a masked type reads the wrong pair or forgets the opt-out.
⛔ `mask-attachment` is in CSS Masking L1 and **no engine implements it** — there is no CSS-only
fix. Do not re-propose one.

### ▶ NEXT, in order

1. **Decide what to act on from the cursor-effects research** — three agents surveyed award-tier
   work. The prompt carries the shortlist and the questions.
2. **⚠ OPEN THE EDITOR.** Every verification on this feature is FRONTEND. §9's row is honestly
   flagged *"reasoned, not observed"*. The client picks these looks in the editor and nobody has
   looked. This project has shipped 0-of-6 blocks rendering in the editor while 5-of-5 rendered
   live — that is the failure shape this gap invites.
3. **Bean's eye on the five looks** (R-31-13). Mechanism is verified; aesthetics are not.
4. **`floating-objects`** — the fifth field type, needs new JS and its own design gate.

⛔ **Method, carried from this session's own failures:** a commit body is not a living doc (D767's
bug sat in one while D766 congratulated itself for fixing nine stale claims elsewhere); an absence
verdict is only as wide as its search (wrong twice); and three "seamless by construction" tiling
claims were each refuted by rendering them. **Render it before claiming it.**


## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4 shipped)

Shipped, deployed, canary-verified. **Nothing remains on this track; Prompt B is deleted.**
Detail is single-sourced — do not restate it here: **D731/D732/D733 + Phase 4** in
`decisions.md` (commits `a2f6d5df`, `bbf13cc2`), **Spec 32 §6.1 (a1)/(a2)** (shared
shorthand builders; sanitiser contract) and **Spec 35 Part K** (the gate + two method
rules). Enforcement: `npm run check:vacuous-guards`, wired into `prebuild`.

**If you are the shop-archive track**, read, in this order:

1. `.claude/plans/phase-shop-container-remediation.md` — **Phase 1 AND Phase 2 are BOTH
   COMPLETE (2026-08-22, D742).** P2-2/P2-4/P2-5/P2-7 (the four steps still open at the end
   of the fourth session) shipped, deployed to sandybrown, live-verified, and reseeded.
   Phase 3 (the per-template pass, P3-1 through P3-9) is the only work left in this plan
   and has not been started.
2. `.claude/decisions.md` D725 + D726 (width model) and **D742** (P2-2/P2-4/P2-5/P2-7
   close-out) — read before any further container work.
3. `.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — IN FULL if touching converter/walker.

## Task 1 — container width model: ✅ CLOSED 2026-08-21 (D725 / D726)

**Settled the OPPOSITE way to how the task was written — read D725 before acting on any older
note about it.** Our `contentWidth` already caps content, so core's duplicate
`layout:{"type":"constrained"}` was DELETED (`c984a676`). One cap per page, and it is ours.
Measured 1440/768/390: stacked caps 3 → 0; `<main>` 1425px unbanded; 26 sections full-bleed
outer + 1280px inner.

⛔ **Three instructions that used to live here are now WRONG** — full text in D725. In short:
the inspector-scan rule-23 widening is NOT needed; a full-bleed section is a SIBLING not a
child, so nothing needs `alignfull`; and `<main>` at `contentWidth:full` is CANONICAL, not a
workaround. **Accepted consequence:** a block placed straight into a page is intentionally
full-width. Do not "fix" it.

## Task 2 — Two decisions the colour-golden track is waiting on

Sticky sidebar (their evidence says the accordion already solved it — RE-MEASURE before
building anything) and the band-replacement model, which is Task 1 by another name. See their
section below.

## ▶ LIVE STATUS — 2026-08-23 (shop-archive track — PHASE 3 WAVE A CLOSED)

**All pushed. Build GREEN (677 converter tests). Canary deployed + live-verified.**
✅ `a85a87d2` (the cosmetic `--flex` marker-class fix, a plugin file) SHIPPED on the
2026-08-23 blocks deploy. Nothing outstanding.

**Phase 3 has TWO axes.** Correctness (the 7-point checklist) and design. Wave A closed
the STATIC half of correctness across all 10 surfaces; the design axis has never run.

**Wave A: 10 parallel agents, one per surface, ZERO FAILs.** Register:
`reports/2026-08-22-phase3-template-audit-register.md`. Global gates run ONCE and
attributed rather than per-agent — both scripts are whole-repo and take no file argument,
so a per-surface run returns the same answer ten times and attributes nothing.

**⭐ The headline: the whole `align` mechanism was inert and is now GONE from
`sgs/container`.** Measured, not reasoned — stripping `.alignfull` from a real element in
a real `.wp-block-post-content` context changed nothing (left, width, all four margins
identical; A/B against an unaligned sibling byte-identical). Core's breakout resolves
`calc(var(--wp--style--root--padding-left) * -1)` against a variable that is EMPTY at
`:root`. `align:"wide"` never had a matching rule at all. No SGS-BEM draft can express
either — there is no such CSS property — so emitting it failed the R-1 honest-mapping
test. **Full-bleed comes from `maxWidth` defaulting to `{}`.** Canary DB held 0 align
authorings. Spec 31's L1 rule amended; converter self-disabled via the DB reseed.

**⭐ Second: a `<main>` is not a flex container.** D742's `layout:flex` default was
retroactive and no `<main>` had ever set the attr, so every page laid its top-level
sections out in a ROW — measured at 634/1328/1328px on the product page. Bean's call, and
he was right about the shape: normal block flow already stacks, so the outer flex is now
suppressed for a `<main>` rather than re-pointed to `column`. Explicit `layout:"stack"`
removed from the eight templates so ONE owner remains; `404.html` states nothing at all
and is the **living canary** for the behaviour. Verified: 3 sections → 1732px each,
stacked, backgrounds spanning.

**Also fixed, both root-caused rather than worked around:** `extract-signatures.py`'s
`css_tier` was RANDOM (set iteration + per-process string-hash salting) — three sessions
had hand-reverted the same diff without finding it; now deterministic, proven across three
`PYTHONHASHSEED` values. And Stage 2's live scrape was failing on an expired root in the
**Windows** trust store, not WordPress's cert (their leaf is valid to October); both
`urlopen` sites now use a certifi context — 3/7 sources → **10/0**, and `wp_version_indexed`
corrected 7.0 → 7.1.

### ▶ NEXT for this track, in order

1. **The design benchmark — ✅ IT DID RUN (2026-08-23). This line said otherwise and was
   wrong.** Output: `.claude/reports/2026-08-23-template-design-benchmark.md`, ten surfaces
   graded; most of the ranked list was implemented, deployed and live-verified. Its prompt
   carried its own `⛔ EXECUTED` banner the whole time. Bean deleted the prompt on that
   basis and was right to; the deletion is committed. **Read the register's four
   corrections before trusting any of its findings** — Bean caught all four by eye.
2. **Wave C** — checks 5 and 7 live per surface (375/768/1440 + canvas-moves).
3. **Three small correctness items:** `main` missing from `edit.js` `TAG_NAME_OPTIONS`
   (declared in the enum, so a client cannot select or recover it); h1→h3 heading skip on
   `archive.html:21` + `search.html:16`; redundant nested `contentWidth` in 5 files.

⚠ **Canary content constrains Wave C:** 9 posts, 135 pages, 5 products, 1 category,
**0 approved comments** (so `single.html`'s 14 comment blocks cannot be demonstrated
without seeding one). `index.html` is genuinely unreachable — `show_on_front=posts`,
`page_for_posts=0` — which is the healthy state for a fallback template, not a defect.
`front-page.html` renders ~104 chars and ZERO `<h1>`: the template is CORRECT as a shell,
the mismatch is that the site shows latest posts while the template holds `post-content`.
That is a Settings → Reading finding.

## ▶ shop-archive track — Phases 1 & 2: CLOSED 2026-08-22 (D742)

Narrative swept VERBATIM to `memory/session-2026-08-22-shop-archive-phase2.md` on
2026-08-23 (this file was 2,074 bytes over its cap). Nothing pending there.

⛔ **One item in that archive is still OPEN and is NOT part of Phase 2** — the
`sgs/container` capability gap: the container injects `.sgs-container__inner` carrying
`max-width` on ITSELF, where core caps CHILDREN via
`.is-layout-constrained > :where(:not(.alignfull))`. Ours therefore cannot express
"full-bleed child of a constrained parent". Read it there before reopening it.

## ▶ COLOUR-GOLDEN / TOOLING TRACK — 2026-08-24 (T1 + T3 CLOSED; T0 exercised)

⭐ **Narrative: `memory/session-2026-08-24-detector-first-and-the-serial-loop.md`** ·
evidence: `reports/2026-08-24-migration-method-evidence.md` · grading:
`rubrics/migration-method-grading.md`.

⛔ **`.claude/THE-MIGRATION-METHOD.md` IS BINDING** and now ENFORCED (see below). >3
files → detector first. **NEW: if CLIENT-VISIBLE, settle the SHAPE first (Step 3)** — the
colour rollout WAS census-driven on day 2 (`f6f3c0331`) and still cost a fortnight.

### ✅ CLOSED

**T1 — `prebuild` 153.4s → 31.0s**, both ends measured. 61 `&&`-joined commands → 5
generators + `run-gates.py` (runs every gate, reports ALL failures). Roster:
`scripts/gates.json`. 57 of 61 still per-build; the 4 heavyweights (76.1%) run pre-deploy
via `build-deploy.py`'s new `step_gate_full()`. ⛔ There was NO gate step to repoint — npm
fires `prebuild` as a lifecycle hook, so splitting it alone would have silently dropped all
four from the deploy. `npm run gate:wired` fails closed if that call disappears.

**T3 — the burn-down. `scripts/programme-progress.py`: 109 attrs / 37 families / 27
properties** remain flat. ⛔ **No percentage, deliberately** — a finished migration deletes
its sibling rows, so the schema no longer holds the original total.

### ⚠ T0 — exercised, NOT closed

4 rounds, 15 personas, **0 WRONG in round 4**. Rewritten around the shape-gate, cut
**670 → 582**. Gates built, all with negative controls, all proven to fail:
`crosscheck()`/`BARE_OK`/`WIDTH_OK` in `migrate-length-sanitiser.py` ·
`check-withdrawn-figures.py` · `check-doc-citations.py` · `run-gates.py` tier-integrity.

⛔ **THE COUNCIL WAS STRUCTURALLY ADDITIVE** — 9 personas, 9 MUST-FIX lists, zero asked to
subtract; the doc grew every round (222→670). Round 4's **Cutter** and **Saboteur** found
what nine reviewers missed. **Any future doc council needs a subtraction lens.**

✅ **THE RULE IS NOW ENFORCED** (`hooks/detector-first-commit-gate.py`, PreToolUse/Bash).
A commit making substantially the same change to 4+ code files with no detector is DENIED,
bypass `[repeat-ok:<reason>]`. It reads the one thing an agent does not author — the diff.
Proven end-to-end: 3/4/5 files → ALLOW/DENY/DENY, detector staged → ALLOW.

### ▶ OPEN — priority order

1. **Wire or delete the orphans** (TASK 2) — **Bean: next session.** 2 of 27 done.
   Register: `reports/2026-08-24-script-revival-register.md`. ⛔ Decide by RUNNING (a
   triage got 13 of 52 wrong from docstrings). **RA-1 is at repo ROOT
   `scripts/wc-pages-responsive-audit.js`, needs `--base <live client domain>`, so it
   CANNOT be a prebuild gate — post-deploy vs the canary is its honest home.**
2. **USE the method for real.** Read and criticised 15 times; never once allowed to write
   a file — four agents followed it READ-ONLY. The two worst defects all session (a green
   gate over a fatal; a census silently collapsing to 4 files) were found by DOING. Run
   TASK 5 through Steps 1-11 and let it apply. The doc's `closes_when` names this.
3. **`--all-properties` + batching** (TASK 4) — 35 of 41 properties touch 1-2 blocks.
4. **Spec 39's converter rework** — the pacing item for cloning.
5. ⚠ **Bean's call:** the revenue lane. Council graded runway **F**.
6. ⏸ **Option A, deferred by design:** interrupt at the 4th file EDIT, before the work is
   done. Better trigger, harder judgement. Decide once the commit gate has caught
   something real.

### ▶ Anchored grades

Round 4: client-visible **B** (was C) · mechanical **C** (was D) · Saboteur **C** · Cutter
**C**. **Overall C — capped by STRUCTURE, not correctness** (now A-territory). A− needs the
doc to become a card, not a document. Enforcement is now half-closed (the commit gate).

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Drawer covered the fold in every template editor; several blocks errored. Three unrelated
causes, all closed — **full detail in D743, do not restate here**: the drawer shell was
exactly `100dvh` (now a 46px strip + a preview toggle); six validation errors from comments
inside `sgs/container`/`sgs/tab` inner content (**dynamic ≠ unvalidated**), 0 bad / 20
surfaces; and `check-undeclared-attrs.py` read JSX tags before stripping comments — 17 false
findings, fixed on `main` (`1693918f`), it had broken every build.

⚠ **Not ours:** the canary intermittently 500s (`Error establishing a database connection`)
under the ~12 concurrent block-renderer calls a template load fires, producing phantom
"Error loading block" banners that vanish on reload. Infrastructure — don't chase it.

