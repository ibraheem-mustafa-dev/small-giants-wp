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
track owns `## ▶ COLOUR-GOLDEN TRACK`. The **Tier W / motion** track owns
`## ▶ TIER W (MOTION) TRACK` at the bottom and is CLOSED — nothing is pending there.
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

## ▶ ⛔ TEMPLATE REMEDIATION — OPEN, THE LIVE FRONT (2026-08-23)

**Read `.claude/plans/2026-08-24-template-by-template-remediation.md` before touching any
template.** Bean reviewed the Site Editor after the Phase 3 design implementation and
found widespread breakage. **He found ALL of it by eye. No gate, no build and none of my
own live measurements caught any of it.**

**✅ THE "ASK BEAN WHERE HE FIXED THE PRODUCT CARD" BLOCKER IS DISPROVEN (2026-08-23).**
This used to say his fix was missing from the tree and a deploy would overwrite it. Bean
challenged the premise — *"If it's clean, why are you assuming the block has been fixed
anyway?"* — and he was right. **Measured:** live canary vs repo, the two files `422daba1`
touched are byte-identical (`assets/css/woocommerce.css` `f21c35ad…`, `style.css`
`fd73e91c…`), both at theme 1.5.63. And a theme deploy replaces FILES, never the database,
so a Site Editor change could not be wiped by one either. There is no un-captured fix and
no deploy risk. ⭐ The original claim was **inferred from one sentence of Bean's** and
written up as "a real risk, not a formality" — a prove-the-cause miss in the record
itself, the same shape as D753.

**✅ DONE — the 5 raw HTML comments inside `sgs/container` delimiters** (`404.html`,
`single.html`) were the proven cause of "Block contains unexpected or invalid content" on
those two templates. Mine. Moved above the outermost delimiter (`d35ee932`), deployed, and
**verified by opening both templates in the Site Editor: 0 error banners, 0 console
errors.** Block-sequence md5 identical to before, so only comments moved.

**✅ 404 + Single Posts are FIXED and verified in the Site Editor** (d35ee932, theme
1.5.63) — 0 errors, 0 console errors on both.

**✅ PRODUCT ARCHIVE'S EDITOR ERRORS ARE FIXED AND VERIFIED (2026-08-24, D755).**
0 of 6 `sgs/product-card` rendered in the editor; now 6 of 6, with 0 error banners and 0
console errors. Cause was NOT `productId=0` (that returns 200 with a proper placeholder —
the old hypothesis was wrong): `ctaFontSize` was `{"type":"number","default":null}`, which
`ServerSideRender` serialises as `attributes[ctaFontSize]=` and REST rejects for a number.
Whole class fixed — 18 attrs across product-card/audio/hero/media/quote + 3 editor writes
that cleared back to `null`. Detector 0 repo-wide. Front end byte-identical throughout.
Reports: `reports/visual-diff/product-card-2026-08-23.md` + `…/audio-hero-media-quote-…md`.

⭐ **The cards now show "No product selected" — that is CORRECT, not a leftover bug.**
`woocommerce/product-template` supplies no post to the card in the editor and
`ServerSideRender` cannot forward block context. Whether the template should use that
arrangement is D756, below.

✅ **FIVE EYE-FOUND DEFECTS: 4 SHIPPED + VERIFIED, 1 REVERTED (2026-08-24, D758).**
PDP cards uniform (305 ×4, was 305/249/302/302) · cards fill their cell (gaps 0, was 100px)
· dead rating filter removed · filter headings on the body font (was Fraunces serif).

⛔ **DO NOT re-attempt the shop grid swap without reading D758's ruled-out list.** auto-fill
produced 3 correct 313px tracks and killed the last-row stretch — **both headline numbers
green** — while every card rendered at **91px inside its track**. Stale CSS, competing rules,
selector miss and grid-stretch are all RULED OUT and measured. The live contradiction to
start from: an INLINE `width:100%` gave 313px, the IDENTICAL stylesheet declaration gave
91px. Flex version restored and verified as the known-good state.

⚠ **The `solid` option-picker contrast fix is DEPLOYED BUT UNVERIFIED** — no live surface
renders a solid-preset picker (`showPickers:false` on shop + rail; the buybox uses
`outlined`). The 12.55:1 measured after deploy is the pre-existing outlined behaviour, NOT
evidence the fix works.

⚠ **Open for Bean (design, not correctness):** at 375px the shop is 1-up @327px, the PDP rail
2-up @155px — under the 167–195px readable-card floor. Screenshots were sent.
⚠ **Still unfixed by choice:** the shop's last-row stretch (3×313 then 2×482).

✅ **ALL FOUR PRODUCT LISTINGS NOW USE THE BESPOKE CARD (2026-08-24, D757).** The census
was wider than first found — 3 of 4 were generic, and two of them are WooCommerce's OWN
plugin templates (`taxonomy-product_attribute`, `product-search-results`), which is why
grepping our repo missed them. Fixed by putting `sgs/product-card` inside the existing
`woocommerce/product-template`; WooCommerce keeps query, filters, sorting, pagination and
relatedness. Theme-overrides-plugin proven, not assumed.

⛔ **D756 — the card-grid query-inherit rebuild is DROPPED, not parked (Bean's call).**
Nobody in the ecosystem replaces the WooCommerce loop; the WooCommerce-free path already
exists (`cpt-collection`); and inherit mode would not fix the editor preview either. Do not
re-propose without meeting D756's measurement first.

⭐ **Two PRE-EXISTING defects found by LOOKING, that no gate caught** — the related rail laid
its heading BESIDE the grid, and two of three PDP sections shrank a single child inside a
1280px column (**the main buybox band at 463px**). A single flex item in a ROW sizes to
content. Fixed by authoring `flexDirection:"column"`; the row default is deliberate and only
`<main>` suppresses it. ⚠ **NOT swept repo-wide — other templates may share the shape.**

⚠ **OPEN for Bean (design, not correctness):** at 375px the shop archive is 1-up @327px but
the related rail is 2-up @155px — under the 167–195px readable-card floor.
⚠ **`taxonomy-product_attribute` is NOT live-verified** — both product attributes have
archives disabled (`attribute_public = 0`), so it has no reachable URL. Defensive only. That
also answers register item G2.

⚠ **Editor ≠ front end, and only opening the editor finds it.** 5 of 5 cards rendered on the
live site the entire time 0 of 6 rendered in the editor. Every gate was green throughout.

**Errors reported on EIGHT templates:** Order Confirmation · Page: 404 · Page: Coming
soon · Product Archive · Products by Attribute · Search Results · Single Posts · Single
Product. Strings seen: "Template part has been deleted or is unavailable" · "Error
loading block: [object Object]" · "Block contains unexpected or invalid content."

**Also open — the full register is Part 2 of the remediation plan; do not restate it here:**
generic product stacks (B1-B3), unstyled `catalog-sorting`/`query-pagination` (C1/C2),
archives inconsistent with each other (D1-D4), pagination vs the old infinite scroll (F),
and template bloat/duplication (G1-G3).

**✅ X-2 SHIPPED AND MEASURED (2026-08-23).** WooCommerce/jQuery dequeue gate is live.
**Six of eight surfaces are now inside the 50 KB JS budget; all eight were over it.** Shop
and product correctly KEEP the stack and still dropped ~42 KB each. Per-surface figures in
`decisions.md`. ⚠ It shipped BROKEN first — an over-broad `! $post` early return meant it
only fired on singular views, so the 404 (the headline example) was excluded by my own
fail-safe. Fixed at `c0b73a7d`. **The lesson: I checked the CODE was live, not that the
SCRIPTS were gone.**

⛔ **GOVERNING RULE, set by Bean:** agents may NOT assess a template by reading code,
querying the DB, calling REST or inspecting hooks. **They log in with `/playwright`, open
the template, LOOK at it and interact with it.** Code reads may explain what was seen;
they may never be the evidence something is fine.

⚠ **`sgs/card-grid`'s Content Source panel literally offers "Product collection (no
WooCommerce needed)"** (`cpt-collection`) alongside "WooCommerce products"
(`wc-product`). Both render `sgs/product-card`. I told Bean "product collection doesn't
exist" after reading enum slugs and never opening `edit.js`. **Read the inspector labels
before saying a feature does not exist.**

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

## ▶ COLOUR-GOLDEN TRACK — 2026-08-24 (U2 CLOSED · two generated catalogues built)

**Front:** `.claude/prompts/2026-08-24-db-and-script-code-only-investigation.md` — read that,
not this section. Plan: `.claude/plans/2026-08-23-colour-capability-grant-PLAN.md`.

**U2 CLOSED.** `no-css_property` **27 → 4**; survey total held at 264 throughout. The 4 left
are `sgs/option-picker`'s, forwarded from product-card via `render_block()` — mapping them
here would make a second writer for one painted node. Breakdown in the plan.

**U1 triaged without hand-reading.** `census-colour-paint-route.py` already existed and the
plan never cited it. Joined to `survey.js --json` it splits the 101 refused rows
**46 direct / 27 wrapper / 28 neither** — 73 have a NAMED structural reason the detector
missed them; at most 28 need genuine-absence work, against a plan that budgeted 79 by hand.
Candidate list, not verdict list (per-BLOCK signal joined to per-ROW refusals).

**⛔ GATE A IS DISCONNECTED, NOT VESTIGIAL — do not delete it.** Trigger watches
`orchestrator/converter_v2/`, deleted 2026-07-05; the harness is alive and fails 37/39.
ROOT-CAUSED: **stale goldens, not a regression.** Goldens seeded 2026-07-25; the
section-root capability gate (FR-31-16) changed the emit contract 2026-08-04 while the gate
was blind. `recognise()` returns `sgs/quote` correctly; `recognise_section()` demotes it
deliberately. **Bean ruled D1 = A: repoint AND re-seed, gated on a LANDED proof.**

**`container_kind` — Bean ruled D2 = A+B:** fix the one real anomaly (`sgs/modal` is
`section` but calls no wrapper) AND wire it into the automatic refresh (it writes only under
`--apply`, which `/sgs-update` never passes). ⚠ **An earlier "14 of 58 disagree" figure was
WRONG** — it tested *content-kind must not call the wrapper*; D294 says content-kind **MAY**
render block-private. A permission read as an obligation. Genuine anomalies: 1.

### Two GENERATED catalogues now exist — read before building anything

`.claude/dev-setup.md` carries both, each with a `--check` proven able to fail:
`generate-tooling-catalogue.py` (524 scripts, 5 directories, BOTH gate chains) and
`generate-db-catalogue.py` (35 tables, vocabularies, NULL rates). Built because "I could not
find a tool" repeatedly meant "I searched one of the five script directories". This is the
FIFTH catalogue attempt — the four hand-maintained predecessors rotted, and the 797-line
stale `TOOLING-REFERENCE.md` at the repo root was deleted this session.

**The most useful check** cross-checks each script header against both gate chains:
**6 scripts claim they are not wired while they are.**

**The DB finding that rescopes the colour work:** a NULL `css_property` means two different
things by role — `text-content`/`content`/`boolean-visibility` are 100% NULL BY DESIGN (they
do not paint), `color` is 25% and `colour-gradient` 46%. The colour-family gap is exactly
**209 attributes**, not a slice of 2,030 NULLs.

**Traps recorded so nobody re-walks them:** `derived_selector` is a FORMULA
(`.sgs-{slug}__{slot}`), never an observed selector — a survey measured 58% autofixable off
it and was wrong. `blocks.status` is a string literal inside the SQL. `css_tier` was silently
nondeterministic until 2026-08-22 (set iteration + hash salting) and flipped three blocks
across three sessions, each reverted by hand without the cause being found.

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

