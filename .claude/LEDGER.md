---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-30
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks worked on it historically,
sharing one `main`; **only ONE is active now (Bean, 2026-08-30)** — the path-scoped commit hook
still applies, but 'another track holds this file' is no longer a live constraint.

Right now: the cloning pipeline and the motion system are both stable. The live front is
**client controls** — making sure every setting a client can change actually does something
visible, in the editor as well as on the published page. The canary test site is
sandybrown-nightingale-600381.hostingersite.com; there are no live client sites on this
framework yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, ONE active track. Commit with explicit paths (a hook enforces it).
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green. Deploy payload is ~29MB (was 114MB).
- **Live fronts:** client controls (below) and motion. Cloning + consolidation are closed.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **Multiple tracks have touched `main` historically; ONE is active now. Sections below are per-track.**
The **motion** track owns `## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.

⭐ **Client-controls SPLIT IN TWO (2026-08-30):** `prompts/2026-08-31-uniformity-sweep.md`
(the original goal) + `prompts/2026-08-31-media-element.md`. Earlier names are stale.

⛔ **Before building ANY script, read the GENERATED tooling catalogue in `.claude/dev-setup.md`
(§"Tooling catalogue").** **611 runnable** files in `plugins/sgs-blocks/scripts` alone (the old
"524" here was low); rebuilding an existing tool is this repo's recorded failure mode. Search the
SUBJECT (colour, token, element, parity), never the verb — the same idea is spelled `census-*`,
`survey-*`, `audit-*`, `check-*`, `scan-*`, `probe-*`, `migrate-*` and `report-*`.

## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⭐ **Client-controls SPLIT IN TWO (2026-08-30):** `prompts/2026-08-31-uniformity-sweep.md`
(the original goal) + `prompts/2026-08-31-media-element.md`. Earlier names are stale.


## ▶ BORDER / SHAPE-B TRACK — 2026-08-30 (evening): CLOSED

**Detail: D881 + `.claude/prompts/2026-08-31-shape-b-close-out.md` (5 tasks ALL DONE) +
`.claude/memory/sdd-progress.md` (the form-field-tiles fix). Do not restate history here.**

Both red gates fixed (`check-editor-render-parity` 177→162, a real false positive fixed with a
regression test, not baselined; `check-undeclared-attrs` 4→0), deployed, all 46
boxFamilies.borderRadius blocks live-probed (not 44, stale even at close-out), remaining stored
content migrated (558: info-box 351, testimonial 186, site-footer-row 18, form-step 3 — the
close-out's 522/345/174 were already stale), worktrees tidied. `sgs/form-field-tiles`'s
distinct FAIL (its outer `field_open()` wrapper, shared by ~10 field-block types, never called
`get_block_wrapper_attributes()`, so WP's identity class landed on an inner child div instead of
the one carrying the uid + border CSS) fixed via `field_open()` itself — the universal fix,
confirmed safe against all 10 sibling field types. Live probe re-confirmed PASS for both
form-field-tiles and form-step in the same run, post every commit below.

Commits `76a3ef734`..`81ed169ec` (`git log` for the range — border-track + SDD-ledger commits
only; other tracks landed work in between on the same shared `main`).
Reports: `reports/visual-diff/shape-b-batch-2026-08-30.md` (canonical) + `-full-sweep.md`
(other 14 blocks).

**The 10 NOT RUN blocks are CLOSED (2026-08-29, commit `3069869f5`).** Every one turned out to be
a gap in the PROBE's own fixture-generation, not a parent-nesting requirement — most (quote,
product-faq-item, site-footer-row, site-header-row) failed on one shared bug (the probe's
`sgs/text` filler child used the wrong attribute name); the rest needed richer per-block fixtures
(image attrs, an `optionItems` array, a real `sgs/tab` child, a real heading on the page, and for
`buybox` a live WooCommerce product bound via `woocommerce/product-collection`'s hand-picked mode
— NOT `core/query`+`include`, which this plugin's own CLAUDE.md documents as unreliable). Live
re-run: 9 PASS, 1 real FAIL. `sgs/table-of-contents`'s negative control still paints a border — a
genuine bug in that block (already flagged elsewhere as broken), not a probe gap; still open.
`nav-drawer`'s variant-discriminator finding needs its own `detect_variant` converter session —
not a border-track item, unchanged.

**Bean's corrections:** radius is not native (shared-helper wrap, not `__experimentalBorder`);
`borderStyle` default `solid`, `none` stays in enum. Per-device border WIDTH CANCELLED.

⛔ `sgs-framework.db` is ONE shared file — DB work sequentially, not parallel.
⛔ `inspector-scan` "01-tab-group" ratchet red (58 vs 57), pre-existing + unrelated — reconfirm
on a clean stash first. `--no-verify` was Bean-authorised only for that ratchet.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

### ▶ A. `fx-wave-gradient` — SIX-STYLE ENGINE: ✅ CLOSED 2026-08-27 (D852 built, D871 closed)

**DEPLOYED, LIVE-VERIFIED, nothing open. Full detail → D871; do not restate.** Only the three things
a future session could get wrong:
- ⛔ **"Gradient controls for the four CSS styles" is CANCELLED, not deferred** — the premise was
  false. Do not revive without evidence a picker is dead.
- ⚠ **Two deploy hazards earned here, both fixed in-tree — read D871 BEFORE deploying:** a
  dev-included Composer autoloader 500'd the canary through 68 green gates (gate-green and
  deploy-safe are INVERTED states of `vendor/`), and its guard had **never been committed**
  (`4494e6e1d`; phar gap closed at `62809c801`).
- **Fixtures: 2740** (single pastel) and **3037** (all six variants), both `[GATE — DO NOT DELETE]`.
  Probe 3037 asserts `webgl capable: true` FIRST, or 0-canvases is indistinguishable from a browser
  declining WebGL.

### ▶ A-legacy — the built engine's design facts (STABLE, still true). Detail: D852.

One `fxWaveVariant`, six styles: `pastel | horizon | ribbon | veil` (pure CSS, no canvas) and
`aurora | ink` (WebGL). ⛔ **No new `fx_effects` rows** — the variant rides the existing effect, so
no shared-DB write, no registry regeneration. ⭐ **Ink and Aurora are the SAME shader**: it measures
the base colour and crossfades compositing (dark ground = curtains ADD, light = DARKEN) — one
shader, two products, separated only by curated colours. ⛔ **CSS cannot do an aurora** — three
attempts failed three different ways; filaments need per-pixel noise + domain warping, and CSS has
neither. **Curated defaults sit in `:where()` at ZERO specificity** so the look is good on
switch-on and the client's pick always wins (a render-layer `(0,1,0)` rule would LOSE to the
`(0,2,0)` variant selectors). Aurora's violet is curated per style, never added to the palette.

### ▶ B. GENERATIVE BACKGROUND ENGINE (Phase 3 — engine BUILT + LIVE; fidelity gap OPEN)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`. Read D886, D887, D888
before touching this track — they supersede the technique spec's Animation section and record
two withdrawn claims.**

**Shipped and live on the canary:** all three layers of the fold. Layer 1 (CPU fold) + layer 2
(object transform) live in `webgl/generative-background-transform.js`, verified against matrices
extracted from the running rig; layer 3 was already correct. A missing depth buffer (`depth:
false`, no `DEPTH_TEST`) was the stair-step artefact — the fold overlaps itself, so draw order
decided the visible surface. Fixed `ba01581df`, live-verified. Frame cost 0.240ms / 0.300ms.

**The measured gap, and it is REAL** (`fidelity-baseline.json`, tracked): at effective phases
0.70/1.10/1.90 the divergence from the reference is **5.29% / 4.71% / 5.63% crop-wide, 10.71% /
9.90% / 10.64% over the painted region** — 2 of 3 over the 5% ceiling. It did not collapse when a
25,000x phase-mismatch bug was fixed, so it is not a measurement artefact.

⛔ **TWO CLAIMS WERE ASSERTED THIS SESSION AND ARE WITHDRAWN — do not resurrect either.**
An 89.3% silhouette IoU (no script, no committed inputs, a `background:#fff` hack in its capture
path), and "a systematic colour cast" (over-read `bias_over_abs`, which measures directionality
not spatial uniformity). **Painted coverage differs 7.7 points at t=17500 and hue count 2.3x — a tone shift
cannot change coverage. Shape divergence is the leading UNTESTED hypothesis.** See D888.

⛔ **D880: Bean authorised porting the reference's VERTEX SHADER mechanism** (that file only).
Palette PNG stays off-limits as a shipped asset — it is a measurement fixture, read in place from
`.claude/scratch/`, never in `plugins/`. Three.js can never ship (page weight, not law).

⭐ **Gate E stays held** — `.claude/scratch/stripe-hero-poc/` is in ZERO git files (`git ls-files`
returns 0). A `git clean -xdf` destroys every reference number permanently. The tracked
`fidelity-baseline.json` + `reference-matrices.json` are what survive it.

### ▶ NEXT — investigate the ~10.6% painted-region gap against the SHAPE hypothesis

Prompt: `.claude/prompts/2026-08-30-generative-background-fidelity-gap.md`. Two named follow-ups
first (both live alternative explanations): drive the replica through the PRODUCTION option path
(it currently measures the module's `DEFAULT_*` constants, not the block's shipped attributes),
and a shared `harness-lib.mjs` — four Chromium harnesses have already drifted, one roots where the
palette 403s. `npm run fidelity:compare` reproduces every figure; `check:transform-parity` is
wired and survives the rig's deletion.


### ▶ PARTICLE + GATES SUB-TRACK — CLOSED 2026-08-27/28. Detail = D839-D842, D846, D853, D863-D870.

Sparks approved by Bean (`fxParticleColour`, live on 2744). FR-38-33 grid-dots closed (live on
3038, contrast 1.30 → **4.23:1**). FR-38-6 closed by observation (page 2893). Row-collapse
reduced-motion closed (D863). ⛔ Editing template part 2671 does NOTHING — `parts/header.html` is a
`wp:pattern` ref, so `patterns/framework-header-default.php` renders.
⛔ **Parked:** `P-PARTICLE-TRAIL-VARIATIONS` (post-launch, Bean's timing).

### ▶ C. TIMELINE (FR-38-35) — CLOSED 2026-08-30. D879, D894-D897, D899-D903.

All four remaining tasks SHIPPED + LIVE. `eb3ed2a04` → `9a3159b4d`. Evidence:
`reports/visual-diff/timeline-2026-08-30.md` **Addenda 18-22**. Design (now BUILT, not proposed):
`.claude/plans/2026-08-30-timeline-tall-milestones-design.md`.

**Shipped this session:** `chromeOffsetPx()` moved to the Tier V shared home so a vanilla consumer
can read the sticky-header height; the progress marker re-mapped to a **reading line** and the two
fill drivers collapsed to one; **`milestoneSize: full-height`** with hero-split media
(+ `milestoneMinHeight`, `entryGap`); the root changed to a `<div>` with the `<ol>` inside it; and
**`scrollEffect`** — Standard / Move with the scroll / Pin and reveal / Pin and slide sideways,
gated on orientation, wired to the existing GSAP modules with `providesNatively` collapsing the
generic picker into one surface.

⛔ **FIVE defects, NONE caught by a gate.** (1) Deleting the CSS branch alone would have killed the
fill on Chrome+Safari — `view.js` gated on BROWSER CAPABILITY, not on whether the stylesheet branch
existed; Firefox would have looked perfect. Found by a cold reviewer. (2) A screenshot caught tall
milestones visibly broken while five assertions passed. (3) The `<ol>` losing its UA padding reset
put the node 20px off its own rail — found ONLY by comparing against geometry baselined before the
change. (4) Horizontal orientation stopped laying out entirely after the root change — same
coupling as the carousel, which WAS fixed in the same commit; missed because only the carousel was
looked for. (5) The intermediate track `<div>` made `pinned-horizontal` attach and slide nothing.

⛔ **A SPECIFICITY CONTEST LOST SILENTLY, AGAIN — third time in this feature.** Two candidate fixes
for the tall-milestone layout both changed NOTHING: one had no free space to distribute, the other
was correct CSS out-ranked by a `--media-under` rule at (0,4,0). Enumerating every rule matching the
element is the only reliable move. **A losing rule is indistinguishable from an absent one.**

⚠ **Corrections to earlier records, measured:** the marker sat at **109.8% and 116.7%** of viewport
on a TALL block — below the screen, invisible — not the 87-91% logged from a short one; and the fill
was **84.6%** complete when a reader starts, not 73%. Every prior figure came from a block SHORTER
than the viewport, which is exactly what hid the defect. `same-side` also shipped on PREDICTIONS
with no browser dispatched; Addendum 18 closed that debt — all six predictions held, rail/node
exactly 712.5.

⚠ **The design doc's "no GSAP loads at 375px" is FALSE and is withdrawn.** The modules ARE enqueued
on mobile and do nothing: the registry sniffs `data-sgs-fx` server-side where the viewport is
unknowable. Suppression is BEHAVIOURAL (no transforms, no pin-spacers, no GSAP objects — verified),
never byte-level. Framework-wide, not timeline-specific.

⛔ Safari has `animation-timeline` since **26.0**; **Firefox has it in NO stable build** (157). The
CSS branch is now DELETED — one rAF driver runs everywhere.

**Canary fixtures — `[GATE — DO NOT DELETE]`:** **3135** (tall + full-height marker probe, 1618px)
and **3141** (scrollEffect matrix, all four values). Both are load-bearing for re-measuring; 3079
and 3072 remain the layout probes.

### ▶ NEXT for the timeline

Nothing outstanding. Three items were NAMED as out of scope rather than dropped, all in the design
doc §3.4: `mediaParallax`/`mediaKenBurns` (deferred on the real D597 `@keyframes` collision — add
them against a stable layout, not during one), per-image crop control under `object-fit: cover`, and
`milestoneMediaDecorative` being block-wide rather than per-entry (negligible at thumbnail size,
material now that images are full-height). Plus a **pre-existing 1px** node/rail offset on
`single-column`, recorded in Addendum 21 and provably untouched by this session.

⚠ **Bean has NOT yet eyeballed the reading-line position.** It is research-backed (~38% of the
usable viewport, below the sticky header — measured live at 144px, not the 93px the code's own
docblock claims) and verified to land at 431px within 0px at every sample, but R-31-13 says the
number closes on his eye, not on the measurement. Probe 3135 is built for exactly that look.

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22 (Phase 4). Detail: D731/D732/D733,
Spec 32 §6.1(a1)/(a2), Spec 35 Part K. shop-archive: Phase 3 ownership moved 2026-08-27 to
`.claude/prompts/2026-08-28-finish-the-template-review.md` — do not restart it here.

## Task 1 — container width model: ✅ CLOSED (D725/D726). `contentWidth` caps content, core's
duplicate constrained-layout DELETED. One cap per page, ours. A block placed straight into a
page is intentionally full-width — do not "fix" it.

## Task 2 — sticky sidebar + band-replacement model: PARKED, not this track's.
`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL. RE-MEASURE before building —
their own evidence says the accordion already solved the sidebar.

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
2. ⛔ **Wave C + the three correctness items — MOVED 2026-08-27 to
   `.claude/prompts/2026-08-28-finish-the-template-review.md`. Do not start here.** Of the
   three: `main` missing from `edit.js` `TAG_NAME_OPTIONS` IS carried forward in that prompt.
   The h1→h3 skip was re-checked live 2026-08-27 and came back CLEAN on both `archive.html:21`
   and `search.html:16` — resolved, nothing to do. **The third item — redundant nested
   `contentWidth` in 5 files — is NOT in the new prompt** (found missing during the 2026-08-27
   handoff QC pass; it never made it into an earlier prompt rewrite). File names for the 5
   instances were not recorded anywhere still readable — next session needs to re-derive them
   (likely via `grep -rn 'contentWidth' plugins/sgs-blocks/src/blocks/*/render.php` cross-checked
   against nesting depth) before fixing.

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

## ▶ CLIENT-CONTROLS TRACK — 2026-08-31: MEDIA ELEMENT, waves 1-4 SHIPPED

**Detail: D904-D910. Plan `~/.claude/plans/media-element-zippy-boole.md`. Design
`.claude/plans/2026-08-30-media-element-architecture-v2.md` — rewritten in place; do not re-add
"this was wrong" notes, they mislead a grepping agent. Method rules: STOP-CATALOGUE **E19** + both
CLAUDE.mds. Do not restate history here.**

**Waves 1-2 deployed + live-verified** (probe **3143**). **Waves 3-4 built, 82/82 gates, NOT
deployed** — registry, presentation census + `gaps`, selective injection (109 → 49 keys), generated
L4 stylesheet, ten atoms, eight gates.

⛔ **Each atom is TWO modules** (`check-media-atom-purity.js`): `<id>.js` plain-Node importable,
`<id>.control.js` holds the JSX. Three of my own instruments read green while proving nothing —
read D910 before trusting a ratchet or fixture here.

⛔ **METHOD, Bean-locked 2026-08-31.** A control that "does not work" already works somewhere: query
`block_attributes`, read the WORKING block, diff. **Never reason from what the canary renders** —
pre-production, nothing to protect. Two gated rules from it: a shared fallback is the MEASURED
default, never `initial`; scope per ELEMENT (`{uid}--{prefix}`), never per block, or a two-element
block renders both slots with the second's value.

⛔ **ABSENCE IS A GAP, NOT A DECISION** — `gaps` is the operative census output (**SIX real gaps**);
only a genuinely DIFFERENT concept is excludable. ⛔ **A control becomes standard by BEING a shared
helper.** ⛔ **`object-fit`'s `custom` is a SIZING MODE** → `box-shape`.

**NEXT:** Wave 5 = wire `sgs/media` THEN `before-after`, **never parallel** (falsification test =
`git diff --stat` shows no file outside `src/components/Media*` +
`includes/helpers-media-element.php`). Then 6 (inspector-scan rules, advisory) → 7 (remaining
surfaces, INSERT→VERIFY→GUT per commit).

⚠ **OWED:** `button/render.php`'s two SVG allowlists; the SMIL bypass is REASONED NOT EXECUTED.
⛔ **Nothing in Waves 3-4 is deployed — WAVE 5 CLOSES ON PAINT.** The no-JS autoplay defect is FIXED
and PHP-verified; `reports/visual-diff/media-2026-08-30.md` names the three live cases owed.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.

