---
doc_type: state
project: small-giants-wp
last_updated: 2026-09-02
note: "THE single living-status doc. REPLACED each session, never appended. History → memory/session-YYYY-MM-DD*.md (ledger-rotate.py Stop hook snapshots automatically past the cap but NEVER edits this file). Structural defences live UNCAPPED in STOP-CATALOGUE.md. Keep < 24576 bytes."
---

# small-giants-wp — LEDGER (the one living status)

## Human Summary

Plain English, for Bean. The framework is a WordPress block system that clones any design draft
into native blocks a non-technical client can then edit. Five tracks worked on it historically,
sharing one `main`; **only ONE is active now (Bean, 2026-08-30)** — the path-scoped commit hook
still applies, but 'another track holds this file' is no longer a live constraint.

Right now: the cloning pipeline and the motion system are both stable. Client controls closed out
2026-09-02 (Waves 6-7 committed, deployed, live-verified). The live front is the **uniformity
sweep** — running the framework's own detector/audit scripts, clearing real findings, and fixing
the detectors themselves where they're wrong, so the client's editor/canvas/live-page experience
has no clear blockers. The canary test site is sandybrown-nightingale-600381.hostingersite.com;
there are no live client sites on this framework yet, so breakage there costs time, not money.

## State Snapshot

- **Branch:** `main`, ONE active track. Commit with explicit paths (a hook enforces it).
- **Canary:** WP 7.1. Deploy via `build-deploy.py --target sandybrown` — the only sanctioned path.
- **Build:** green, **84/84** gates (a 84th was wired this session: `check-enum-control-shape`),
  verified 2026-09-02 at `2b55c4f29`. Nothing uncommitted at session close.
- **Live fronts:** the uniformity sweep (below). Client controls, cloning, consolidation are closed;
  motion is stable with named next steps in its own section.
- **Per-track detail:** each `## ▶ … TRACK` section below owns its own status. Read only yours.

# ▶ NEXT SESSION STARTS HERE

**Invoke `/autopilot` first.**

⚠ **Multiple tracks have touched `main` historically; ONE is active now — the uniformity sweep
(section below). Sections below are per-track, read only the one you're continuing.**
The **motion** track owns `⛔ `sgs-framework.db` is ONE shared file — DB work sequentially, not parallel.

## ▶ UNIFORMITY SWEEP TRACK — 2026-09-02 (part 2): every detector VALIDATED, 6 defects fixed. D917 + D918.

⭐ **Read `.claude/reports/2026-09-02-findings-INDEX.md` FIRST — it is the map.** Twelve reports,
one per detector reporting findings, each with a plain-English problem/effect, a ranked menu and a
"Your call" checklist. Plan: `.claude/plans/2026-08-30-uniformity-sweep-execution.md`.
**Continuation prompt: `.claude/prompts/2026-09-03-detector-findings-review-and-resolve.md`.**

⛔ **THE SESSION'S CENTRAL LESSON (D918).** Bean challenged the C14 scattered-controls report.
`/qc-council` found `scattered-element-controls.js` was a **self-declared PROTOTYPE** whose model
contradicted Spec 35's own schema comment — `isWrapper: true` explicitly selects **TIER 2**
(property-family panels are the CORRECT shape for a block's root, not "scatter"). It produced ~600
false positives, was published as a 613-row report, and nearly became a fix-dispatch target.
**Deleted outright**; `placement-reach.py` (already built, already gated, self-tested) was the
correct tool all along and D537 already named it. Its real answer was **9 CONTESTED attrMap gaps —
all 9 now resolved** (`css:box-shadow-color` siblings on container/cta-section/hero/before-after;
border family explicitly owned by nav-drawer's `dialog`).

**Detector validation.** Every detector reporting findings was checked — logic vs decisions/specs/
`dev-setup.md` — before its count was trusted (10 parallel agents). Result: 3 detectors were WRONG
(rules 23, 26, and rule 21's 74-finding media/hero cluster), 1 was miscategorised (dead-api's 253
were never bugs), the rest were sound.

**Six defects fixed** (`06497afac`): rule 21 128→105 (ATOM_CONTROLS dispatcher; ~51 residual left
deliberately — a generic 1-arg-literal pattern would over-suppress tree-wide); rule 23 1→0 (the PHP
comment-stripper stripped block comments BEFORE line comments, so `*Tablet/*Mobile` inside a `//`
comment blanked ~50KB of `hero/render.php` — **order is now load-bearing**, verified with a full
28-rule diff showing only rule 23 moved); rule 26 2→0 (Spec 35 Part D5 art-direction exemption, with
a paired fixture proven non-vacuous by disabling the exemption and watching the self-test FAIL);
rule 37 77→71; dead-api 253→0 (96 real WP/WC names promoted, allowlist 321→417, self-test still
catches the original `wc_get_price_html()` incident); CLAUDE.md border-controls corrected.

⭐ **OPEN QUESTION, needs an early ruling — Bean raised it, it is real.** "Baselined" conflates
**"not a problem, by design"** with **"a real problem we deferred"**, and nothing distinguishes them.
Verified across all 35 baseline files: only 8 carry even a free-text `reason`; the one `category`
field describes effect type, not disposition. Two entries, two files, identical shape under the same
`accepted` key — one is a genuinely dead attribute, the other is a Bean-ruled by-design duplicate.
**This blocks "resolve all violations including baselined ones" as a runnable instruction.**
Proposal: a required `disposition` field (`by-design` / `detector-limitation` / `accepted-debt` /
`blocked`) back-filled across the ~165 entries in the 8 non-empty baseline files. Note the project's
own rule already says a false positive is a DETECTOR BUG, never baseline fodder — so any
`detector-limitation` found in that pass is already a violation.

**Validated remaining backlog:** 01 (57) · 03 (13) · 18 (15) · 21 (14 new, untriaged — the
originally-listed 54 real + residual-FP findings are CLOSED, see below) · 31 (277, blocked on
D754's capability-grant design) · 37 (71) · border-migration (3 blocks: card-grid, multi-button,
trust-bar — `sgs/media` closed, see below). **Closed: dead-api, rules 23 and 26, 07, 22, 34,
border-migration's `sgs/media` item.**

## ▶ 2026-09-02 (part 3) — decide-first batch closed (D919); a real hero render bug caught before it ever shipped

Closed all four "decide first" items from part 2's menu, plus a bonus: extending the cloning
pipeline's hero split-media routing to Tablet tier + video/SVG media types surfaced and fixed a
real bug (video/SVG content was being stored but never rendered — see D919 for the full account,
this is a pointer not a duplicate). Five commits: `79c910d2f` (07, site-header ShadowControl),
`dcd9940d2` (hero dead-attr deletion), `2cc9cbc56` (22 + border-migration + 34 + hero
Tablet/video/SVG routing + splitMediaType bug fix + 2 unrelated classification gaps), `b7b420df9`
(a second dead-attribute source, affecting `sgs/media` too), `47e5a9cbb` (6-post live migration +
full deploy). Independently re-verified via a 3-rater `/qc-council` pass — SAFE / one test-gap
(closed same session) / PRODUCTION-VERIFIED. Also fixed: a canary `wp-login.php` LiteSpeed
cache-cookie bug that silently blocked every automated Playwright login (WP-CLI option flip, no
code change). Full account: D919.

⛔ **Next session's working shape changed, at Bean's instruction: dispatch each fix the MOMENT he
decides it and keep discussing while the agent works — do NOT batch every fix to the end** (this
session's mistake). The prompt leads with that rule.

## ▶ MOTION TRACK (A closed+live; B Phase 2 closed, Phase 3 next)

⛔ **TWO SEPARATE TRACKS. Never re-merge them.** They shared one plan file once and it cost a full
session (D838). No phase number is shared.

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

## ▶ CONSOLIDATION TRACK — CLOSED 2026-08-22. Detail: D725/D726, D731-D733.

One item survives it, PARKED and owned by nobody: the **sticky sidebar + band-replacement model**
(`parking.md` P-CLIENT-CONTROLS-STICKY-SIDEBAR-AND-BAND-MODEL). RE-MEASURE before building — its own
evidence says the accordion already solved the sidebar.

## ▶ CLIENT-CONTROLS TRACK — 2026-09-02: Waves 6+7 committed, deployed to sandybrown, live-verified

**Detail: D904-D913, D915, D916 (this session's close-out), PR #36 (Wave 5). Design
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 carries full build status +
per-piece comparison against the plan, §18 the panel design. Approved build plan + per-piece
review notes: `.claude/plans/media-element-tingly-stallman.md`. Method rules: STOP-CATALOGUE
**E19** + both CLAUDE.mds. Do not restate history here.**

✅ **All 16 atoms are now adopted by all six in-scope blocks, committed, deployed, and
live-verified.** Wave 5 (`sgs/media`, `sgs/before-after`) merged to `main` at `13286fc69` (PR
#36). Wave 6 (five quality gates) and Wave 7 (`hero`, `container`'s `BackgroundPanel`,
`decorative-image`, `product-card` + `product-card`'s data migration) — committed at `e6acd82d8`
(2026-09-01), pushed. This session (2026-09-02): deployed to sandybrown (`59f86b451`, after
baselining two real deploy-gate findings — see below) and live-verified in the real block editor
+ published pages:
- **`decorative-image`** (probe page 2900) — object-fit/focal-point/overlay all read/write
  correctly; disclosure logic (focal-point/overlay fields disabled until object-fit crops /
  overlay colour is set) reacts live to a real attribute write.
- **`hero`** (probe page 2334 "T3 hero split probe") — the two published instances holding only
  the OLD `splitImage`/`splitSvgMobile` legacy shape confirmed rendering an EMPTY split-media slot
  on both the published page AND the editor canvas (the accepted R-31-14 consequence, confirmed in
  practice not just theory); media-type tabs (Image/Video/SVG, all 3 device tiers) confirmed
  reachable with no image uploaded (closes the `splitImage?.url`-gating bug by construction);
  overlay colour/opacity/blend-mode controls present and interactive. ⚠ **Superseded 2026-09-02
  (D919):** post 2334 (along with 5 other live posts, including the homepage 2742) has since been
  migrated onto the decomposed `splitImageId`/`Url`/`Alt` shape and no longer carries the old
  composite attrs at all — this bullet describes the PRE-migration state, kept for narrative
  history, not the current live state.
- **`container`'s `BackgroundPanel`** (page 2242 "Tier fixture — maxWidth", `cta-section` sampled
  as representative of the 7 non-hero consumers sharing `class-sgs-container-wrapper.php`) —
  Image tab confirmed pixel-identical: pre-existing overlay opacity (30) and colour value
  preserved unchanged; new Video/SVG tabs present and wired.
- **`product-card`** (page 3046, typed mode) — "Image Controls" panel (object position
  focal-point picker + object-fit dropdown + max-width + height-unit) confirmed present and
  functional with correct default values; legacy `imageHeight` plain-string shape confirmed
  round-tripping (shows "220px" placeholder). Bound mode not independently re-clicked this
  session — same shared atom mechanism as typed mode, lower marginal risk, not exhaustively
  re-verified.
- **Migration survey** — `migrate-product-card-image-id.py --survey` run against a full dump of
  every sandybrown page+post (161 files via REST `context=edit`): 9 candidates, 8 matched real
  attachments, 1 NO-MATCH (post 1601 "F3 Oracle sgs-product-card" — a converter golden-test
  fixture with a fabricated `/products/lactation-cookies.jpg` path, never a real upload; correctly
  left unresolved). Reviewed by hand; no `--fix --apply` run (no client sites exist yet on this
  framework — the discipline is precautionary).

⛔ **Two real deploy-gate findings surfaced and were baselined, not worked around** — both are the
DIRECT, predicted consequence of the R-31-14 strict-no-fallback decision, not new bugs:
`oldshape-audit` flagged post 2334's stranded `splitSvgMobile` (WP will strip it on next editor
save — non-lossy, the atom system never read it); `audit-block-file-consistency` flagged 5
`sgs/hero` orphan-attr findings — `splitImage`/`splitImageMobile` (deliberately kept declared for
the cloning pipeline per D915 — ⚠ **superseded 2026-09-02, D919: the pipeline's routing was
re-anchored off these two onto the real `splitMediaType` attrs, and they are now DELETED from
block.json, not baselined-debt any more**) and `splitMediaObjectPosition`(+Tablet/Mobile) (a
dynamic-key false positive — genuinely live via `SGS_Media_Element::style()` server-side and
`HeroSplitMediaPanelLayout`'s `prefix="splitMedia"` control client-side, matching this project's
existing dynamic-key baseline convention). Both baselined with full evidence in
`oldshape-audit-baseline.json` / `block-file-consistency-baseline.json`, committed at `59f86b451`.
A THIRD gate (deploy-ownership) also fired — the live canary carried `3c213dd4`
(`feat/media-panel-wave5` branch tip, deployed 2026-09-01 for pre-merge live QA), not an ancestor
of `main` because Wave 5 SQUASH-merged at `13286fc69`. Verified (not assumed) the squash-merge is
a strict superset — `git diff 3c213dd4 HEAD -- .../BooleanResponsiveControl.js` shows only a
docblock type-annotation difference, the real fix is present — before using `--takeover`.

⛔ **A real cross-subsystem conflict surfaced and was resolved, not worked around.** The plan's
read-time legacy-fallback pattern (already shipped for `sgs/media`'s `thumbnail` and
`sgs/before-after`'s `sgsObjectFit`) collided with a rule `hero` was ALREADY hardened against
(R-31-14, 2026-08-13: no legacy fallbacks, nothing to migrate pre-production). Bean chose the
strict reading. That in turn broke the CLONING PIPELINE's scalar-media role assignment for a
future hero clone (a genuinely different, active subsystem) — Bean chose to fix it properly:
`scripts/converter/services/assembly.py` + `scripts/converter/db/db_lookup.py` now translate the
lift's composite `{id,url,alt}` value into the atom system's own attribute triple at write time,
verified against the full 727-test converter suite. Full account:
`.claude/plans/2026-08-30-media-element-architecture-v2.md` §17 Wave 7, `hero` entry.

**NEXT — nothing queued.** Commit, deploy, and live-verification (`.claude/prompts/2026-09-02-media-element-commit-deploy-verify.md`)
are DONE. Three items are deliberately DEFERRED, not forgotten, and were NOT re-opened this
session (live-verification found no real problem triggering any of them) — `hero`'s motion
CSS-emission (stays hero-private, a live clip/specificity risk unverified), `container`'s Image
tab (untouched by design, kept minimal on a shared component), `product-card`'s `box-shape`
adoption (a real CSS-specificity conflict against this block's own hardcoded height fallback,
still needs the load-order test named in the prompt — not run this session, remains open if
anyone wants `box-shape` on this block later). Bound-mode `product-card` (buybox configurator)
was not independently re-clicked this session — flagged above, not a blocker.

⛔ **SCOPE now closed — all SIX blocks done:** media, before-after, hero, container,
decorative-image, product-card. **A BACKGROUND IS NOT A MEDIA ELEMENT** — a block with a
background gets it from the shared `BackgroundPanel`; `site-header`/`site-footer` have nothing to
do with this work (their OWN `BackgroundPanel` mount got the video-tab fix as a side effect of
`container` owning the shared mechanism, not because they're separately in scope). `trust-bar` +
`brand-strip` have real nested media but remain LIMITED follow-on, not started.

## ▶ EDITOR-ERRORS TRACK — CLOSED 2026-08-22 (D743)

Narrative swept VERBATIM to `memory/session-2026-08-22-editor-errors-track.md` on 2026-08-26 (cap). Nothing pending. Detail: **D743**.
