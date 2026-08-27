---
doc_type: state
project: small-giants-wp
last_updated: 2026-08-28
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks work on it in parallel,
sharing one `main` branch — which is why almost every rule below is about not treading on
another track's work.

Right now: the cloning pipeline and the motion system are both stable. The live front is
**client controls** — making sure every setting a client can change actually does something
visible, in the editor as well as on the published page. The canary test site is
sandybrown-nightingale-600381.hostingersite.com; there are no live client sites on this
framework yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, shared by five tracks. Commit with explicit paths, never `git add -A`.
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green. Deploy payload is ~29MB (was 114MB).
- **Live fronts:** client controls (below) and motion. Cloning + consolidation are closed.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **FIVE TRACKS HAVE TOUCHED `main`. Establish which you are before reading anything else.**
The shop-archive / R-3 track owns the sections immediately below. The **colour-golden**
track owns `## ▶ CLIENT-CONTROLS TRACK`. The **motion** track owns
`## ▶ MOTION TRACK` below.
The **consolidation** track is summarised in the next block and is CLOSED bar one phase.
The fifth is the **editor-errors / nav-drawer** track (D742) — CLOSED, section at the bottom.

⭐ **If you are the client-controls track:** read
`.claude/prompts/2026-08-28-rollout-detectors-and-the-null-element-tail.md` — it carries EVERY
remaining task on this track. Every predecessor was executed and DELETED; a reference to
`check-a-backlog-and-the-settled-designs` or its four forerunners is stale.

⛔ **Before building ANY script or hand-doing investigative work, grep the two GENERATED
catalogues in `.claude/dev-setup.md`.** 524 scripts across FIVE directories, and this repo's
recorded failure mode is rebuilding one that already exists. Search the SUBJECT (colour,
token, element, parity), never the verb — the same idea is spelled `census-*`, `survey-*`,
`audit-*`, `check-*`, `scan-*`, `probe-*` and `report-*`.

## ▶ MAMA'S CLONE TRACK — ✅ CLOSED 2026-08-28 (D854) — nothing left open, four small items queued

**Task 1 DONE after five deferrals.** All twelve templates opened live; all five defects +
`main` tag-dropdown gap fixed + live-verified. Full detail → **D854**, do not restate. Two of
five "defects" were WordPress/WooCommerce CONFIG not code (attribute archives off by WC default;
footer pointed at a test-fixture CPT via `sgs_active_footer_cpt_id`) — fixed live, not a commit.
The two real code fixes ship in `b50ce3d8c` on `main`, deployed + payload-verified.

**Also fixed same day (`9fcf4f4e5`):** the footer's "Quick Links" list — was genuinely empty
(no `<li>`s), now carries 5 generic placeholder links. The real bug was one layer deeper than
expected: the fix required editing AND DEPLOYING the theme pattern file
(`framework-footer-default.php`) — editing the database template part alone changed nothing live,
because the render path resolves through the pattern file, not the DB copy. Caught only by
re-verifying live after the first (DB-only) attempt looked done.

`sgs/hero`/`sgs/trust-bar`/`sgs/cta-section` having no tag-picker UI is **NOT this track's
concern** — it's planned POC scope for C16/C19 on the client-controls track.

⭐ **NEXT: `.claude/prompts/2026-08-28-four-carried-clone-track-items.md`** — page 2884's
product-card `titleLineHeight`/`descLineHeight` stored as strings not numbers (D851, live bug,
not root-caused) · flexWrap migration tool sign-off (127 candidates, dry-run only, needs Bean's
screenshot review) · the 375px readable-card floor (design question for Bean) ·
`sgs/button`'s font-family control — confirmed 2026-08-28 as a one-line fix
(`showFontFamily={ true }` on its existing `<TypographyControls>` call; the render side was
already complete and waiting).

### ▶ G3 answered this session (2026-08-27)
All 12 templates under `theme/sgs-theme/templates/` are framework-authored (real `sgs/*` block
usage + real commit history) — no stock WooCommerce/core default hiding among them. Order
Confirmation and Coming soon templates named in Task 1's "never opened" list **do not exist** as
files in that directory — confirm with Bean whether they live elsewhere or are still unbuilt before
Task 1 tries to open them next session.

### ⛔ The visual-diff bypasses CANNOT be retired — not a queue
`source_sha` comes from STAGED bytes, so a report only certifies the commit it accompanies;
`manual-skips.log` is a permanent audit record. The NEXT commit touching each block owes a real
report. D831 shipped its own (`reports/visual-diff/button-2026-08-27.md`); everything else in
D830-D834 still owes one. Reasoning: D804.

### ⚠ Hazards (full list in the next-session prompt)
- **`main` is shared:** `git add <paths>` then a BARE commit flushes the whole index — four of
  another track's staged files were in it. Use `git commit -- <paths>`.
- **A subagent ran `git stash` beside a concurrent agent**, against instruction. Nothing lost;
  `git diff --stat` catches all four ways a subagent destroys work.

## ▶ MOTION TRACK — 2026-08-27 (section A CLOSED + live-verified; B = the POC rebuild, next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

### ▶ A. `fx-wave-gradient` — SIX-STYLE ENGINE: ✅ CLOSED 2026-08-27 (D852 built, D871 closed)

**DEPLOYED and LIVE-VERIFIED — nothing open on this section.** Full detail → **D871**, do not
restate. Headlines only:
- All six styles live on the canary. Canvas split measured on probe page **3037**
  (`[GATE — DO NOT DELETE] wave-gradient six-variant canvas split probe`, all six on one page):
  `pastel`/`horizon`/`ribbon`/`veil` = **0** canvases, `aurora`/`ink` = **1** each with
  `data-sgs-wave-active="1"`, 0 console errors. ⭐ The probe asserts `webgl capable: true` FIRST —
  without that, 0-canvases-everywhere is indistinguishable from a browser declining WebGL.
- ⛔ **"Gradient controls for the four CSS styles" is CANCELLED, not deferred** — the premise was
  false. Every `color-mix()` already references `var(--sgs-wave-*)`, so the pickers were never dead;
  D852 had already fixed that. Three of the 13 are structurally impossible anyway (a blend AT a
  gradient's 0% stop, and a `background-color`). Do not revive without evidence a picker is dead.
- The 3-state ramp control was **reshaped**: tabs imply mutually-exclusive states, but low/mid/high
  render simultaneously. Shipped as variant-aware labels (`Ramp colour — low/mid/high` for
  aurora/ink only). Same four attrs, no schema change.
- Same pass fixed two real defects rule 31 CANNOT see (`extensions/` has no `block.json`, so it is
  unscanned, not baselined): the legacy no-`states` picker shape, and colour rows wrapped in
  `ToolsPanelItem` (golden-controls rule 9c — `isShownByDefault` is not sufficient).

⚠ **Two deploy hazards earned here, both now fixed in-tree — read D871 before deploying:** a
dev-included Composer autoloader 500'd the canary through 68 green gates (gate-green and deploy-safe
are INVERTED states of `vendor/`), and the guard against it had **never been committed** — it lived
in one working copy while every clone, worktree and CI deployed without it (`4494e6e1d`). The
follow-on gitignored-phar gap is closed at `62809c801`.

**Fixture pages for this surface: 2740** (single pastel, FR-38-31) and **3037** (all six variants).
Both `[GATE — DO NOT DELETE]`.

### ▶ A-legacy — the built engine's design facts (STABLE, still true)

One `fxWaveVariant` attribute, six styles: `pastel | horizon | ribbon | veil` (pure CSS, no canvas
booted) and `aurora | ink` (WebGL). ⛔ **No new `fx_effects` rows** — the variant rides the existing
effect, so no shared-DB write and no registry regeneration.
⭐ **Ink and Aurora are the SAME shader.** It measures the base colour and crossfades compositing:
dark ground = curtains ADD, light ground = curtains DARKEN. One shader, two products, separated only
by curated colours.
⛔ **CSS cannot do an aurora** — proven by three attempts failing three different ways (bars, ovals,
haze). Filaments need per-pixel noise + domain warping; CSS has neither. Detail: D852.
**Curated defaults sit in `:where()` at ZERO specificity** so the look is good on switch-on and the
client's pick always wins — the render layer's `(0,1,0)` rule would otherwise LOSE to the `(0,2,0)`
variant selectors. Aurora's violet is curated per style, never added to the site palette.

*(Deployed + verified 2026-08-27 — see section A above. The old "NOT YET DEPLOYED" note here was
stale and is removed.)*

### ▶ B. GENERATIVE BACKGROUND ENGINE — the POC rebuild (NOT started)

⭐ **Plan: `.claude/plans/2026-08-27-generative-background-engine.md`.** Its technique spec IS a
build spec; D794's NO-GO was COMPLETENESS, not purpose.
⭐ **The "recolours itself from per-client theme tokens" differentiator belongs HERE**, not to the
variant work above (Bean, 2026-08-27 — the second track-conflation in one session).
⛔ Phase 1 = pick a reference BEFORE any code. Licence: nimitz = NON-COMMERCIAL; paper-design
(Apache-2.0) ships no aurora — an aurora must be WRITTEN.

### ▶ NEXT — section A is closed; the only motion work left is B

**Everything previously listed here (deploy, gradient controls, 3-state ramp) is DONE or
CANCELLED — see section A. Do not re-open those.**

The next work on this track is **B, the POC rebuild**, and its Phase 1 is a decision, not code:
⛔ **pick a reference BEFORE writing any code.** Licence constraint already established: nimitz's
Shadertoy "Auroras" is CC BY-NC-SA (**NON-COMMERCIAL** — must not be used or derived from), and
paper-design (Apache-2.0) ships no aurora. **An aurora must be WRITTEN.**

⭐ **NEXT PROMPT: `.claude/prompts/2026-08-28-poc-pick-the-reference.md`** — carries Phase 1 in
full. Its predecessor `2026-08-27-background-styles-controls.md` was executed and DELETED
2026-08-27; a reference to it anywhere is stale.
⚠ **Phase 1 has NEVER been done, and the six shipped styles do NOT satisfy it** — that shortlist
chose the shipped styles, not this rebuild's reference. Phase 2 (finish the technique spec, 13
must-fix items, still **NO-GO** per D794) is blocked until Bean names one.

### ▶ PARTICLE + GATES SUB-TRACK — 2026-08-27, all shipped (D839-D842, D846, D853)

✅ **Sparks SEEN + approved by Bean.** Was invisible at **1.44:1** (inherited body TEXT colour on a
near-black panel); `fxParticleColour` shipped, deployed, set to `accent` on 2744. ✅ **3 gates
CLOSED** — `floating-objects` was the WRONG effect for 7 weeks → FR-38-33/34; decorative-image =
wrap-only-when-treated (BUILT+live D865); covers → **Spec 40**. ✅ **FR-38-6 CLOSED by observation** (page
2893, markup committed). Detail = the D-numbers; do not restate.

✅ **FR-38-33 grid-dots BUILT+live (D864-D870)**; 3 commits await deploy.
⭐ **NEXT: `prompts/2026-08-29-motion-deploy-verify-and-timeline.md`**.
✅ **Row-collapse reduced-motion CLOSED too (D863)** — "untestable" was wrong; Bean pushed back and
it measured clean in both arms. `probe-row-collapse-reduced-motion.mjs`. ⛔ Editing template part
2671 does NOTHING: `parts/header.html` is a `wp:pattern` ref, so
`patterns/framework-header-default.php` is what renders.
⛔ **Parked:** `P-PARTICLE-TRAIL-VARIATIONS` (post-launch, Bean's timing).

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
   Phase 3 (the per-template pass, P3-1 through P3-9) is the only work left in this plan.
   ⛔ **OWNERSHIP MOVED 2026-08-27 (Bean's call) to
   `.claude/prompts/2026-08-28-finish-the-template-review.md` — do NOT start it here.**
   Split ownership (queued here, a loose scrap in the Mama's track) is why it deferred 4×.
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

## ▶ CLIENT-CONTROLS TRACK — 2026-08-27 (nine commits, deployed + live-verified)

⭐ **NEXT: `.claude/prompts/2026-08-28-rollout-detectors-and-the-null-element-tail.md`** — it
carries every open task. Its predecessor was executed and DELETED 2026-08-27.

⛔ Detail is single-sourced to **D855-D862**. Do not restate mechanisms here.

### ✅ SHIPPED — all pushed, canary deployed, gates green
Hero video/SVG media obey their controls · block bindings reach core's picker (19 fields) ·
CHECK A 238 → 206 (32 artefacts exempted) · C14 order convention in Spec 35 + inspector-scan
rule 35 · C16 spacing presets (opt-in, `sgs/container` pilot) · C19 media size & crop panel
(`sgs/media` pilot) · two NULL `css_element` rows fixed · five client spacing ladders renamed.

**Live-verified in the editor, not asserted:** C16 shows `XXS (0.25rem)`…`XXXL (8rem)` +
Custom/none; C19's grey-out chain disables Height in auto/ratio and Fill style in auto, each
with a plain-English reason. Frontend byte-identical before/after with a positive control
(`media_sizing` ×8 in the DEPLOYED render.php) — so "unchanged" is not a failed deploy.

### ⛔ TWO THINGS THAT BLOCK ANY ROLLOUT
1. **No migration script exists** for C16 (48 blocks) or C19 (5). The house pattern is
   `scripts/migrate-*.py`; neither has one.
2. **`detector-first-commit-gate.py` DENIES** 4+ files with substantially the same change and
   no detector. Both rollouts cross that line on their first wave. Detector first, then sweep.
   The controls themselves ARE shared helpers already — `MediaSizingPanel` is barrel-exported,
   `presets` flows through `ResponsiveBoxControl` — so the sweep is a one-line flip per block.

### ⚠ THE 85 NULL `css_element` TAIL — do NOT bulk-script it
Root-caused: **three causes, not one bug** (`.claude/reports/2026-08-27-null-css-element-root-cause.md`).
(A) `sgs_emit_state_colour_css()` — 21 files — is unregistered in the classifier's helper
allowlist. (B) a selector held in a PHP variable and used later is untraced. (C) genuinely
root-scoped declarations find no element and nothing turns that into a positive `wrapper`.
~18 more are `fx:*` markers, by design.
⛔ Only **6 of ~67** non-fx rows were individually confirmed; the rest is an unverified
extrapolation. A WRONG element is worse than NULL — NULL reads as unknown, a wrong value reads
as authoritative and misroutes cloned CSS silently.

### ⚠ DEPLOY SAFETY — two real near-misses this session
`plugins/sgs-blocks/stackable/` (278MB of a competitor's GPL source) was one deploy away from
landing web-accessible on the canary. Untracked files are invisible to the dirty gate and
visible to tar, and `--exclude=…/src` is path-anchored so it never matched `stackable/src`.
Now gitignored + excluded, with a tarball size ceiling that fails closed and names the biggest
members. Separately the deploy went **114MB → 29MB** (dev tooling + dev-only vendor packages
carved out, each with evidence). Ceiling 150 → 45MB.

### ⚠ STANDING BACKLOG — carried, do not compress away
Spec 39 still does not exist and PACES everything: 37 conformance goldens sit `xfail(strict=True)`
naming it, and finishing more of the tier migration INCREASES the blocked surface until it ships.
Full open list + the 37-family scope + the `check-box-flat` exit-code caveat live in Task 6 of the
prompt and in `.claude/plans/2026-08-25-road-to-uniform-then-spec-39.md`. ⛔ This block was dropped
in the 2026-08-27 LEDGER rewrite and restored after QC caught it — a D101 subtraction. Move it to
`parking.md` with Bean's say-so if it must shrink; do not delete it. Note: Task 6's own "Step 0 —
fix the instruments first" is CLOSED — `807ef4611` (D777) added `_base_attr_spec()` to
`migrate-tier-object.py`, fixing the `<prop>Desktop`-base blind spot; Steps 2-5 remain open.

### ⚠ Carried
Hero still owes a visual-diff report (bypassed when a deploy was impossible) · `sgs/media`'s
element manifest disagrees with its classifier for the whole block (`wrapper` vs `media`),
predates this work · C16/C19 rollouts past their pilots.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.

