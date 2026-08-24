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

⭐ **If you are the colour-golden track:** read `.claude/prompts/2026-08-26-let-the-method-apply.md`
— TASK A and TASK C in it are SHIPPED (D775); only TASK B, the 27 orphans, remains. (The older
`2026-08-24-db-and-script-code-only-investigation.md` this line used to name has been DELETED.)

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

### ✅ ALSO CLOSED 2026-08-25 (second wave)
- **Item 8 DONE — all five never-opened templates are CLEAN.** Opened in the Site Editor,
  0 validation warnings and 0 error notices each: Search Results (60 blocks/733 chars),
  Single Product (79/4362), Products by Attribute (62/1040), Order Confirmation (56/906),
  Coming soon (44/581). **All eight templates Bean reported are now confirmed clean.**
- **G3 answered:** 11 templates are ours (`src:"theme"`), 4 are WooCommerce's
  (`src:"plugin"` — cart, checkout, order-confirmation, coming-soon).
- **G2 answered by ATTEMPTING it, not by reading `attribute_public`:** four candidate URLs
  tried; the only 200 was the homepage ignoring the query var (`body class="home blog"`).
  Products by Attribute has no reachable front end — editor-only by construction.
- **`sgs/site-footer-row` duplicate Layout control fixed** (`fdd7352e1`) and **verified in
  the EDITOR**: with the block selected the sidebar shows only "ROW LAYOUT" (its own) —
  the duplicate that silently coerced Stack->grid is gone. Class audit: all 30 blocks
  mounting ContainerWrapperControls checked, **no other block carries this bug**.
- **Breadcrumb prefix dropped** (`7939844f3`) — `Home / Archives: Shop` -> **`Home / Shop`**,
  matching what woocommerce/breadcrumbs rendered before the swap. Canonical
  `get_the_archive_title_prefix` filter, applied locally. Both visual-gate bypasses are
  RETIRED with captures in `reports/visual-diff/breadcrumbs-2026-08-24.md`.

### ▶ OPEN, in order
1. **Bean's call: the `<h1>` on the blog archive still reads "Category: Uncategorized"**
   while the shop's reads just "Shop". That is `core/query-title` — `archive-product.html`
   sets `showPrefix:false`, `archive.html` does not. Arguably correct on a heading and
   noise in a breadcrumb, so it was NOT changed unilaterally.
2. **`layout` validation — DESIGN-GATED, do NOT build** (D774). The obvious allowlist is
   REFUTED: `masonry`/`carousel`/`list`/`full`/`split` are legitimate values on gallery,
   post-grid and testimonial-slider, and `full` is testimonial-slider's DEFAULT.
   Recommendation put to Bean: a PHP allowlist scoped to the wrapper's own display
   dispatch + suppress the meaningless `sgs-container--<invalid>` class. Awaiting his call.
3. **C1/C2** — `woocommerce/catalog-sorting` + `core/query-pagination` still unstyled.
4. **Item 4's 83 candidates** — needs Bean's eye per candidate, not a mechanical sweep.
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

## ▶ COLOUR-GOLDEN / TOOLING TRACK — 2026-08-25 (T0/T1/T3 CLOSED; orphans are the front)

⭐ **START HERE: `.claude/prompts/2026-08-26-let-the-method-apply.md`** — but note TASK A and
TASK C in it are now SHIPPED. Only **TASK B (the 27 orphans)** remains.

⭐ Narrative: `memory/session-2026-08-24-detector-first-and-the-serial-loop.md` · method
application log: `reports/2026-08-26-migration-method-application-log.md` · grading rubric:
`rubrics/migration-method-grading.md`.

### ✅ CLOSED

**T0 — THE METHOD HAS BEEN APPLIED (D775).** `.claude/THE-MIGRATION-METHOD.md` is now
`status: APPLIED`, graded **B−** (was C) by a 3-persona panel on the APPLICATION EVIDENCE rather
than another read-through: **9 CONFIRMED / 1 PEDANTIC / 0 WRONG**. Its 11 steps had been reviewed
15 times and never once allowed to write a file. **FIVE steps were WRONG or SILENT as written
(1, 2, 4, 8, 11)** — all corrected in place, each tagged (D775).

⛔ **The Cutter's verdict overturns the old "capped by STRUCTURE" reading:** the problem is
**CONTENT, not LENGTH**. Hunting for cuts across 581 lines found only **26** worth removing (4.5%);
the STOP repeats and the codemod skeleton all survived scrutiny. Nine reviewers made it longer;
the first real run proved parts of it wrong. Two different diseases — only the second is serious.

⚠ **Recoverability still grades D, and it is the ONE thing holding the overall grade.** The sole
defence against a silent whole-file diff is a MANUAL `git diff --stat`. It fired this session (a
JSON round-trip on tab-indented `package.json` turned a 1-line alias into a **241-line diff**), but
a habit is not a gate. **Making `changed-lines ≈ file-length` fail automatically is the single
change that would most raise the grade.** Not built — Bean's call.

✅ **THE RULE IS ENFORCED** (`hooks/detector-first-commit-gate.py`, PreToolUse/Bash). 4+ code
files with substantially the same change and no detector → DENIED; bypass `[repeat-ok:<reason>]`.

**T1 — `prebuild` 153.4s → 31.0s**, both ends measured. Roster: `scripts/gates.json` +
`run-gates.py`. The 4 heavyweights run pre-deploy via `build-deploy.py`'s `step_gate_full()`;
`npm run gate:wired` fails closed if that call disappears.

**T3 — the burn-down.** `scripts/programme-progress.py`. ⛔ No percentage, deliberately.

**T4 — `--all-properties` SHIPPED (`a0d15a98f`), and it REFUTED the batching carve-out.**
Census: `reports/migrations/tier-object-all-properties-census.json`. **40 declared, 24 MIGRATABLE,
16 already done.** 23 of the 24 touch 1-2 blocks; exactly ONE touches more
(`backgroundOverlayOpacity`, 8). **Total remaining: 34 block-touches, not 91.**
⛔ **`margin`/`padding`/`borderRadius` — the three the carve-out exempted — are DONE, zero
migratable.** Their "41/39/11" figures were DB attr-row counts, not migration scope: 41 blocks
carry `marginTablet` but only 5 declare a base `margin`, because the other 39 get it from
WP-native `supports.spacing`, which `block_attributes` cannot see. **The carve-out stays
withdrawn — there is no slow path to exempt anything from.**

### ▶ OPEN — priority order

1. **Wire or delete the 27 orphans** — THE FRONT. Register:
   `reports/2026-08-24-script-revival-register.md`. ⛔ Decide by RUNNING, never by docstring (a
   triage got **13 of 52** wrong from headers). ⚠ **The register says `status: OPEN — nothing has
   been wired` and "⛔ NOTHING HERE HAS BEEN WIRED" — which CONTRADICTS the "2 of 27 done" this
   ledger and the prompt both carried. Verified by reading the file. Settle which is true before
   wiring anything.** ⚠ RA-1 (`scripts/wc-pages-responsive-audit.js`) is at repo ROOT and needs
   `--base <live domain>`, so it CANNOT be a prebuild gate — post-deploy vs the canary is its home.
2. **The whole-file-diff gate** (above) — closes the method's last D-grade dimension. Small.
3. **Spec 39's converter rework** — the pacing item for cloning.
4. ⚠ **Bean's call: the revenue lane.** Council graded runway **F** — 11 of 1,740 commits touched
   `sites/` in 30 days and none were client build work. Real and urgent; not started unprompted.
5. ⏸ **Option A, deferred by design:** interrupt at the 4th file EDIT rather than the commit.
   Decide once the commit gate has caught something real.

### ▶ Anchored grades — round 3 (as EXERCISED, not as written)

working-change **B** (was D) · recoverability **D** (held) · governance **B** (floor, untested) ·
durability **B** (was B−) · first-attempt reach **B** (was C). **Overall B−, was C.**
Recoverability anchors the ceiling; governance moved only because no CONFIRMED finding exercised
it, which is a coverage gap in this exercise, not a fix.
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

