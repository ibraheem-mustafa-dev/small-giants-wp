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
`.claude/plans/phase-colour-conformance.md` — it is the executable front and carries 10
pre-answered decisions. It is marked **NOT-READY on purpose**: Wave 1's resolver premise was
measured and found blind to most of the tree. The ledger section is status; the plan is the work.

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

⛔ **D756 — DO NOT convert any filtered product listing to `sgs/card-grid` yet.** Measured
with a control: a live card-grid `wc-product` page returns 6 cards both with and without
`?min_price=0&max_price=1`; the shop archive returns 5 → **0**. card-grid builds its own
`WP_Query` and has no `supports.interactivity`, so converting the shop archive would leave
the filter UI rendering, clickable, and inert. **Bean's call: design the
inherit-the-page-query capability FIRST. Design gate open, nothing built.** The PDP related
rail (`single-product.html:34-40`) has no filter dependency and stays risk-free whenever
wanted.

⚠ **Editor ≠ front end, and only opening the editor finds it.** 5 of 5 cards rendered on the
live site the entire time 0 of 6 rendered in the editor. Every gate was green throughout.

**Errors reported on EIGHT templates:** Order Confirmation · Page: 404 · Page: Coming
soon · Product Archive · Products by Attribute · Search Results · Single Posts · Single
Product. Strings seen: "Template part has been deleted or is unavailable" · "Error
loading block: [object Object]" · "Block contains unexpected or invalid content."

**Also open:** product listings render generic photo/name/price/button stacks instead of
`sgs/card-grid` → `sgs/product-card` (`single-product.html:37-39` is the worst case);
`catalog-sorting` and `query-pagination` completely unstyled against the site's global
styles; archives inconsistent with each other (search bar bottom on Search Results, top
on Product Archive; yellow/black button one side, pink+magnifier the other); infinite
scroll gone from the archives; `index.html` a near-duplicate of `archive.html` down to
the description; suspected template bloat.

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

**Settled the OPPOSITE way to how this task was written, so read D725 before acting on any
older note about it.** The task assumed we would adopt core's cap-the-children model. Bean
ruled the other way: our `contentWidth` already caps content in the right place, so core's
duplicate `layout:{"type":"constrained"}` was DELETED from the last three templates
(`c984a676`). One cap per page, and it is ours.

⛔ **Three instructions that used to live here are now WRONG — do not act on them if you meet
them in an older doc, a branch or a stale summary:**
1. ~~"Prerequisite, non-negotiable: widen inspector-scan rule 23"~~ — that was only needed for
   the migration we did not do. The regex is correct for the model we kept.
2. ~~"Acceptance: a container with `contentWidth:normal` has a child with `align:full` spanning
   edge-to-edge"~~ — wrong test. A full-bleed section is a SIBLING, not a child; nothing needs
   to break out. `alignfull` is unnecessary here rather than broken.
3. ~~"`<main>` is `contentWidth:full` — a workaround; restore a constrained `<main>`"~~ — that
   is now CANONICAL. `<main>` is structure and passes width through. The
   `sgs/collapsible-text` wrapper is likewise a legitimate opt-IN to a band, not debt.

**Measured live 1440/768/390:** stacked caps 3 → 0; `<main>` 1425px unbanded; 26 sections
full-bleed outer + 1280px inner; `single.html` 0 uncapped. **Accepted consequence (D725):** a
block placed straight into a page is intentionally full-width — it keeps its own
padding/margin/alignment. Do not "fix" it.

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

## ▶ COLOUR-GOLDEN TRACK — 2026-08-23 (native-colour-ui CLOSED 6→0 · ratchet 292)

**All pushed (`5c9c1db2`, `a5bb6220`, `6e5a563e`). Build GREEN. Canary deployed +
live-verified.** Evidence: `reports/visual-diff/native-colour-ui-close-2026-08-23.md`.

**MEASURED (twice, agreeing, `status === "FLAGGED"` only):** rule 31 = **292**
(below-min-states 162 / missing-gradient 130 / **native-colour-ui 0**). Ratchet **292**,
zero slack, proven to bite by reading node's exit code (291 → exit 1, 292 → exit 0).

⛔ **Measure rule 31 twice and require agreement** — the scanner reads a tree other
sessions are writing. Still true; cost time three times on 2026-08-22.

**SHIPPED — Bean's item 1 is DONE.** The last six blocks left the competing native
colour panel (icon-list, buybox, info-box, notice-banner, team-member, testimonial),
each flip PAIRED with a block-private replacement via the shared helpers
(`fillRow`/`textRow`, `sgs_fill_states_css`/`sgs_fill_decls`/`sgs_text_decls`). All six
live-verified on the canary with a negative control each. 309 → 292 (−17), verified by a
key-set diff NORMALISED on block+kind+rowKey: 17 genuinely closed, **zero genuinely new**.

**⛔ A DETECTOR BUG FIXED EN ROUTE (`5c9c1db2`).** `describeRow()` collapsed both gradient
SHAPES into one boolean and rule 31 hardcoded `gradientCapable: false` for EVERY helper
row — so every gradient-bearing `textRow` on a resolved text attribute was falsely
flagged `mechanism-mismatch`. Invisible until now because its only adopter
(`sgs/nav-drawer`) has no `css_property` in the DB. Two fixtures pin it BOTH ways,
mutation-proven. `core/selftest.js` gained a `_css-property-map.json` seam because the
mechanism branch was previously **unreachable in self-test** — a gate that cannot fail
reads green forever.

**✅ OWED ITEM CLOSED 2026-08-23 (`4e73f28f`).** `/sgs-update` ran (exit 0) and seeded the
50 new attributes — but `css_property` came back NULL for almost all of them, found by
diffing the exported map before/after rather than by reading the run summary. **Seeding
the row is not seeding the mapping:** `css_property` derives from
`supports.sgs.elements.<el>.attrMap`, not from the attribute name. Five of six blocks
still pointed at `native:color.background` — the mechanism D751 retired — which the
CLONING PIPELINE reads, so the manifest was naming a dead target as the colour owner.
Repointed via two shapes copied from info-box's working manifest (`attrMap` +
`states.hover.attrMap`). Measured **0 → 48 of 56 resolved**; rule 31 held at 292 across
two agreeing runs, so no mechanism mismatches were introduced.
⚠ **RESIDUAL: the 8 `linkColour*` attrs stay null.** Resolving them needs a new `link`
ELEMENT in the manifest (descendant anchors, `a:where(:not(.wp-element-button))`), not
another mapping — and adding an element changes the member census
`check-element-manifest-conformance` reads. Design change, deliberately not slipped in.

**⛔ ITEM 2 IS CANCELLED — AND ITS PREMISE WAS FALSE (Bean, 2026-08-23).** The record
said *"three agents ran `git stash` despite explicit prohibition, once mid-write by
another agent"*, and item 2 proposed a PreToolUse hook to block it. **Bean had INSTRUCTED
them to empty the stash**, because it held old entries and was causing confusion. So the
action was authorised, and a hook enforcing against it would have blocked Bean's own
instruction. Do not rebuild this.
⚠ **The distinction the original note blurred, worth keeping:** emptying the stash
(`git stash drop`/`clear`) discards entries ALREADY stashed and never touches the working
tree. `git stash [push]` is the dangerous one — it removes uncommitted work from the tree,
and on a shared worktree that is everyone's work, not just the caller's. The danger the
record described belongs to the second command; the instruction Bean gave was the first.
The prohibition in agent briefs should therefore name `git stash push` (and
`checkout --`/`restore`), not the word "stash". The stash is currently empty, consistent
with Bean's account.
⭐ This is a *prove-the-cause* miss in the record itself: rogue-agent behaviour was
INFERRED from seeing the command, and a structural fix was specced for an unproven cause.

**NEXT SESSION — Bean's remaining order:**
1. **The line-keyed baseline.** `08-raw-url-link`'s key embeds a LINE NUMBER, re-anchored
   SIX times for code that never changed. This session hit the same tax again: untouched
   `icon-list` rows read as net-new purely because edits above them shifted position.
   Re-key on block + control identity, not position.
2. **The two behemoths — DESIGNED, PLANNED, REVIEWED 2026-08-23. Next session BUILDS.**
   ⭐ **Front: `.claude/plans/2026-08-23-colour-capability-grant-PLAN.md`** (design:
   `…-design.md`; rulings D752 + D754). The plan owns the detail — read it, don't work
   from this summary.

   **Mandate (D752): APPLY HOVER + GRADIENT EVERYWHERE.** Counter-argument overruled; do
   not re-open. ⚠ The ratchet drops far in one pass, so a later hover REMOVAL reads as a
   regression — that is refinement, cite D752.

   ⛔ **THE PREMISE CHANGED.** Running the EXISTING survey showed only **32 of 187
   non-conformant rows (17%) are autofixable** — the rest are CAPABILITY refusals (79 no
   gradient-capable paint path, 34 custom-property, 27 no-`css_property`, 15
   unresolvable). Shape recognition is the EASY half (90% one shape). **A disciplined
   triad already exists at `scripts/colour-codemod/` — this is an EXTENSION. Do not
   rebuild it.**

   **Approach B:** new `grant.js` capability pass AHEAD of the triad, owning `render.php`,
   per BLOCK not per row. `grant → survey → fix → adopt → check`. Step 1 is TRIAGE — the
   79 verdict is a regex fallthrough, not proof.

   **Three review findings you must not meet cold:**
   - ⛔ **States-floor landmine** — `requiredStatesFor()` matches by ELEMENT, so adding
     `states.hover` to an element already declaring another state raises the floor for
     every attr on it (`site-header.wrapper` = 18). Zero ratchet slack → build fails in
     untouched blocks. `4e73f28f` was safe by luck.
   - ⛔ **Rule 31 cannot see `render.php`** — wrong instrument for the grant; a botched
     render would read as success.
   - ⛔ **U3 is a FEASIBILITY risk, not just estimation** — six blocks done BY HAND is not
     evidence it automates. Gate 2 spike: reproduce a known-good block or re-scope.

   **First action, ≤5 min:** U2 on ONE block whose element declares no prior state.

3. **The line-keyed baseline** — `08-raw-url-link`'s key embeds a LINE NUMBER, re-anchored
   SIX times for unchanged code. ⚠ Measured: **0 line-derived rowKeys today** (latent, not
   live) — but the delta key `block+kind+rowKey` **collides on 3 pairs**, which matters
   more and is the one to fix.

**LINK COLOUR — asked and answered 2026-08-23, NOT part of the backlog.** Site-wide link
colour already lives in `theme.json` `styles.elements.link`: `primary` normal,
`primary-dark` `:hover`, `primary-dark` + underline `:focus`. Every link in every block,
client-editable at Site Editor → Styles → Elements → Links, per-client via
`sites/<client>/theme-snapshot.json`. Block-private `linkColour` overrides exist on 4
blocks; after D751 ZERO blocks expose core's competing per-block link panel.

**⚠ METHOD (carried forward, earned again today).** Three probe artefacts read as code
defects this session and all three were the INSTRUMENT: measuring the root when the block
paints text on a descendant; a block that renders nothing without content; and `0 bytes
of CSS for BOTH sentinel and control`, which is the tell of a broken probe, not a finding
(SGS block CSS is LIFTED to `uploads/sgs-css/<hash>.css`, so grepping rendered HTML for
`<style>` proves nothing). **Separate "my probe is wrong" from "the code is wrong" before
reporting either.** And the coordinator re-runs the FULL gate set: two of four agents
reported each other's mid-write state as "pre-existing", and two phpcs drifts were the
coordinator's own, not an agent's.

**⚠ CANARY HEADER — settled (D749).** `sgs_active_header_cpt_id` pointed at post **1570,
which does not exist**; the header silently fell back to the framework-default pattern.
Bean ruled: use the default. Option is now **0**. **A pointer to a deleted post fails
SILENTLY** — worth a gate asserting those pointers resolve.

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

