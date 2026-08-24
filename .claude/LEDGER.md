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

## ▶ ⛔ CONTAINER-LAYOUT + TEMPLATE REMEDIATION — 2026-08-25 (archives SHIPPED; item 8 open)

⭐ **START HERE: `.claude/prompts/2026-08-25-container-layout-and-archive-design.md`.**
⛔ **Read D772/D773/D774 before touching an archive template or `sgs/container`'s layout.**

**Governing rule, Bean's, unchanged:** do NOT assess a template by reading code, querying
the DB or calling REST. Open it in a browser and LOOK. This session it earned itself twice
— a client-visible breadcrumb bug that several code-reading passes missed, and a layout
regression I shipped that every gate passed.

### ✅ SHIPPED + LIVE-VERIFIED 2026-08-25
- **All four archives share one header** (D772) — `parts/sgs-archive-toolbar.html` is now the
  shared breadcrumb; each template composes its own correctly-typed title/count after it.
  Verified live 1440: shop 73/200 → 238 → 306, search 73/216 → 238 → 298 → 420, all `sameLeft`.
- **Breadcrumb tag leak fixed** (`419734b84`) — archives printed literal `<span>` text.
  `literalTagInText` true → **false**. Report: `reports/visual-diff/breadcrumbs-2026-08-24.md`.
- **Duplicate search box deleted** — a no-results search rendered two (y=216 + y=570). Now 1.
- **h1→h3 heading skip fixed** on search.html + archive.html. Live: H1→H2.
- **Item 1 (solid picker contrast) VERIFIED** — 13.14:1 resting border. Fixture = canary page
  **2736 `[GATE - DO NOT DELETE]`**, the ONLY surface rendering this preset. Do not delete it.
- **Item 5 CLOSED** — the PDP rail genuinely peek-scrolls (327→596, `didScroll` true, 4×140px).
  It is NOT the 2-up 155px grid the old note described. Bean owed no decision.
- **Item F answered** — infinite scroll lives in `sgs/post-grid` (still works) but was NEVER
  wired into any archive template. Nothing was removed; restoring it is a choice, not a repair.

### ▶ OPEN, in order
1. **Item 8 — five templates never opened in the editor:** Search Results, Single Product,
   Order Confirmation, Coming soon, Products by Attribute. ⛔ "No console errors" is NOT
   "renders correctly" — assert `innerText.length` + a selector count and look at the canvas.
2. **`sgs/site-footer-row` duplicate Layout panel** (D774) — mounts `ContainerWrapperControls`
   without `showLayout={false}`, so picking "Stack" is silently coerced back to `grid`. Same
   bug fixed for post-grid/testimonial-slider on 2026-08-12; this one was missed. Small fix.
3. **Bean's call: the shop breadcrumb reads "Home / Archives: Shop"** (was "Home / Shop").
   WP's own `Archives:` prefix, surfaced by the block swap. Strip it for consistency?
4. **`layout` validation — design gate, do NOT build** (D774). The obvious allowlist is
   REFUTED: it would break every testimonial-slider in its default state.
5. **C1/C2** — `catalog-sorting` + `query-pagination` still unstyled.

### ⚠ Two traps this track proved live
- **A one-child flex row is indistinguishable from a stack until a sibling appears** (D773).
  `sgs/container` defaults to `layout:"flex"` = a CSS ROW. Adding a second child makes the
  latent default visible. This is the shape behind "accidental columns" AND D757.
- **Item 4's count is 83, not 59 and not 0** (D774). `survey-flex-row-shape.py` skips
  containers with an explicit `flexWrap` (line 109), so it answers "is the default flip
  safe?" — not "how many accidental columns?". Re-run without that filter: 125 rows, 83
  non-NO-OP. The 52/5/59 split cannot be reproduced from any artefact on disk.

⚠ **Cross-track:** canary page 2737 (`[GATE — DO NOT DELETE] Magnetic pull`, motion track)
carries undeclared attrs (`content` on sgs/text, `text` on sgs/button). WP discards them and
the next editor save DELETES them. It also blocks `oldshape-audit` on deploys. Not ours.
⚠ **`--theme-only` deploys ship ZERO block schemas, yet `oldshape-audit` still evaluates
them and aborts.** Its sibling guard `deploy_roots_for_scope()` was narrowed for exactly this
reason; the audit should be too. Until then a theme-only deploy needs `--skip-oldshape-audit`.

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

⭐ **START HERE: `.claude/prompts/2026-08-26-let-the-method-apply.md`** — the executable
front for this track. It supersedes the 2026-08-25 six-task version, whose TASK 1 and
TASK 3 have SHIPPED; a cold agent reading that one would redo closed work.

⭐ **Narrative: `memory/session-2026-08-24-detector-first-and-the-serial-loop.md`** ·
evidence: `reports/2026-08-24-migration-method-evidence.md` · grading:
`rubrics/migration-method-grading.md`.

⛔ **`.claude/THE-MIGRATION-METHOD.md`: the RULE is binding and now ENFORCED (see below);
the 11 STEPS are `PROVISIONAL-BUT-EXERCISED` per its own frontmatter — never APPLIED.** >3
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

