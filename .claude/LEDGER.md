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

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4 shipped)

Shipped, deployed, canary-verified (D731/D732/D733/Phase 4): one shared corner-shorthand
helper + **109 vacuous `function_exists` guards** removed + **204 length call sites** migrated
from the crude to the hardened sanitiser. Standards + rationale are single-sourced — do not
restate them here: **Spec 32 §6.1 (a1)/(a2)** (shared shorthand builders; the sanitiser
contract) and **Spec 35 Part K** (the gate + two method rules). Enforcement:
`npm run check:vacuous-guards`, wired into `prebuild`.

**Phase 4 (the programme's only behaviour change) shipped 2026-08-22, commits `a2f6d5df` +
`bbf13cc2`.** `sgs_css_length_sanitise()` → `sgs_css_length_value()` across 56 files (204 call
sites), via new codemod `scripts/migrate-length-sanitiser.py` (survey/fix/check/self-test,
mutation-tested negative control). Two sites deliberately excluded (named in the script):
testimonial `quoteLineHeight` (unitless-legal) and google-reviews `gr_pct` (bare number +
caller-appended `%`). 5 stranded `function_exists('sgs_css_length_sanitise')` guards
retargeted to the new function name. Live-proven on a dedicated probe page
(`gate-length-sanitiser-probe`, since deleted): before-deploy CSS showed
`border-top-left-radius:calc20px1vw` (corrupted); after-deploy showed
`border-top-left-radius:calc(20px + 1vw)` (correct). Zero PHP fatals, zero new debug.log
entries, payload-verify + motion-QA both green on deploy. Visual-diff gate scoped-bypassed for
44 markup-touching-but-behaviour-identical blocks (logged, `bbf13cc2`) — real risk was
edge-case-only (negative/calc/multi-value/bare-integer inputs absent from live content), the
one edge case that IS live (`gr_pct`) was excluded from the migration, not shipped untested.
Prompt B is deleted — done. Nothing remains on this track.

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
⚠ One commit (`a85a87d2`, cosmetic marker class) is pushed but NOT yet deployed — the
deploy gate correctly refused while the colour-golden track had `icon-list` dirty. It
ships on the next clean deploy; nothing depends on it.

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

1. **The design benchmark** — prompt ready at
   `.claude/prompts/2026-08-23-phase3-design-benchmark.md`. This is the axis Bean actually
   asked for and it has NOT run.
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

**NEXT SESSION — Bean's remaining order (items 2-4 of 4):**
2. **Structural block on `git stash` for subagents.** Three ran it on this shared worktree
   on 2026-08-22 despite explicit prohibition. Prose does not hold this — it needs a
   PreToolUse hook with a `--self-test` and a negative control. ⚠ This session's four
   agents were told not to and did not, but that is four for four on prose, not proof.
3. **The line-keyed baseline.** `08-raw-url-link`'s key embeds a LINE NUMBER, re-anchored
   SIX times for code that never changed. This session hit the same tax again: untouched
   `icon-list` rows read as net-new purely because edits above them shifted position.
   Re-key on block + control identity, not position.
4. **The two behemoths — Bean RULED 2026-08-23 (D752): APPLY HOVER + GRADIENT
   EVERYWHERE.** No propose-and-defer, no per-block approval gate. His reasoning: hover
   on ordinary elements gives them life when done well, and the control existing does not
   force its use. ⛔ The "hover is a design decision" caveat was raised and OVERRULED —
   do not re-open it. Consequence to hold, not act on: the ratchet drops far in one pass,
   so a later hover REMOVAL will read as a regression; it is design refinement, cite D752.
   **Measured shape:** 292 findings / 58 blocks / 181 distinct (block,row) pairs — 108
   need BOTH, 52 hover only, 21 gradient only. 132 distinct row keys, long tail (top 22
   cover only 108 of 292), so the tool must be driven by the scanner's findings, never a
   curated name list. Build it as the survey→fix→check triad (D542) owning ALL THREE
   layers — `block.json` attr + `edit.js` row + `render.php` emit. ⛔ `adopt.js` CANNOT do
   it (rewrites `edit.js` only). Bars: exact TOTAL-count assertion (only a total catches
   OVER-matching), corpus-size assertion, fails CLOSED, **PARSE the attribute JSON never
   splice it** (D750), conservation check, `prove-selftest-can-fail.py` RED with the break
   confirmed landed. Sweep in `breadcrumbs` + `table-of-contents`, whose `linkColour` has
   no hover sibling.

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

## ▶ DOC-DEBT / MOTION-REGISTER TRACK — 2026-08-21 (a THIRD track; all pushed)

**All on `origin/main`. Build GREEN. Canary deployed + live-verified.**

**⛔ Two live defects — read first:**
1. **`sgs/hero`'s overlay gradient was silently replaced by the flat colour** (`fc261fd3`).
   `$overlay_gradient` never existed — one reference, zero assignments, ever — so the null fell
   through to `background-color` and the overlay still painted, which is why it survived.
   Live-proven fixed with a negative control:
   `reports/visual-diff/hero-overlay-gradient-2026-08-21.md`. ⚠ Cause: an asymmetric pair,
   `backgroundOverlayColour` vs `overlayGradient`.
2. **I broke `main` for ~5 min** (`87d904a6`): a `'src/blocks/*/render.php'` GLOB satisfied the
   path-scoped-commit hook and swept the co-active track's half-done edit. **A glob over a
   shared directory is `git add -A` wearing a pathspec.** Enumerate exact filenames.

**⛔ THREE comments asserted the OPPOSITE of their own code** (nav-menu ×2, responsive-logo) —
this codebase's doc debt is confident wrongness, not verbosity.

**Shipped:** motion registers + Spec 38 swept · 121 sanitiser closures across 57 files onto 3
shared helpers already existing at 3% adoption · ~370 lines of narrative cut from 78 files ·
no-inline prose → one pointer per block · `R-22-14`→`R-31-14` ×14 · scroll-smoother → `tier='H'`.

**⛔ Detail, owed follow-ups, and the 11-gate-backed-vs-37-UNENFORCED split:
`.claude/reports/2026-08-21-unenforced-prohibition-register.md`. Read before continuing.**

## ▶ CLEANUP TRACK — comment-narrative trim: CLOSED 2026-08-22

Swept to `.claude/memory/session-2026-08-22-cleanup-track.md` (verbatim). Track is
closed; its plan and prompt were deleted at `fc8c9fb1`. Nothing pending.

## ▶ TIER W (MOTION) TRACK — CLOSED 2026-08-21

**Nothing pending. Do not re-open this to "continue" it.** Shipped, merged, deployed,
live-verified: Spec 38's fourth tier (WebGL, D479) now exists, with FR-38-29 surface treatments
on 15 image-bearing blocks at 5,674 bytes gzip. D714-D716.

Full section — what shipped and the four things deliberately NOT done — moved VERBATIM to
`memory/session-2026-08-21-tier-w-closed.md` on 2026-08-21 to bring this file back under its
byte cap. That archive's own FR-38-12 Flip finding is now STALE — see below, D741 supersedes
it. For motion work the open register is `.claude/plans/2026-07-31-motion-wave-D-client-readiness.md`.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Drawer covered the fold in every template editor; several blocks errored. Three
unrelated causes, all closed. Detail in D743.

- **Drawer shell was exactly `100dvh`** (771px in a 771px canvas): `style.css`'s
  real-`<dialog>` sizing lands on the editor preview shell and `editor.css` never opposed
  it. Now a 46px strip, expanded by a **"Preview drawer open"** toggle (component state,
  never serialised). Capture: `reports/visual-diff/nav-drawer-2026-08-22.md`.
- **Six validation errors** — comments inside `sgs/container` / `sgs/tab` inner content;
  both have `render.php` AND a non-null `save()`: *dynamic ≠ unvalidated*. Also dropped the
  `woocommerce/single-product` wrapper (no `providesContext`). **0 bad / 20 surfaces**.
- **`check-undeclared-attrs.py`** — 17 findings, all false, all nav-drawer: it read JSX
  tags before stripping comments. Fixed on `main` (`1693918f`); it broke every build.

⚠ **Not ours:** the canary intermittently 500s (`Error establishing a database connection`)
under the ~12 concurrent block-renderer calls a template load fires, producing phantom
"Error loading block" banners that vanish on reload. Infrastructure — don't chase it.

## ▶ FR-38-12 FLIP — CLOSED 2026-08-22 (D741)

**Nothing pending.** Five prior sessions (D698, D699, D702, the 2026-08-21 report, the
2026-08-21 Tier W close above) left it genuinely inconclusive or dormant. Two real bugs, both
found and fixed same session: (1) `sgs/container` — the shop archive's own Product Collection
toolbar wrapper — tripped WooCommerce's client-nav kill-switch, same shape D702 already fixed
for `sgs/text` (`c01ed84a`); (2) `fx-flip.js`'s `settle()` called `MatchMedia#add(fn)` with a
bare function where the API requires `(conditions, func)`, so `Flip.from()` was registered but
never invoked — every upstream check looked healthy while GSAP never ticked (`da580d8e`). Live
on sandybrown, `animate_product_filtering` ON, Bean watched it animate. Full writeup:
`decisions.md` D741. Spec 38 §3.3 FR-38-12 updated to SHIPPED. Design-gate plan archived.
