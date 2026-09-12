## Prior work (closed) — clone-fidelity closeout + R8 motion recognition

**What's shipped (full list, in order):**
1. Testimonial star colour, font-loading bug + security hole, 4 footer bugs, heading-font leak,
   hero text centring, trust-bar background + pack-size pill typography, product-card border
   regression, brand image sizing, quote block's italic default flip, hero hover-zoom
   (rebuilt as reusable shared capability) — the 11-defect main closeout, `decisions.md` D1015.
2. One of those (product-card title font) was found wrong and corrected the same session — a
   self-catch, not assumed correct. Also in D1015.
3. Independent 3-viewport visual verification (3 design-reviewer agents, real screenshots +
   interaction checks) confirmed page-body fidelity is genuinely excellent and confirmed the
   header/footer gap.
4. Parity-tool scope correction: excludes header/footer/nav chrome from scoring (a separate
   system) and gates CSS properties on whether they can actually apply. Regression-lock fixtures
   added same day. Commit `0aa4b25f1`.
5. **Second pass, found after the main closeout:**
   - Hover-zoom (`hoverSpillScale`) investigated further — the CSS was actually already working
     live (an earlier session's "broken" report was never explained, flagged not resolved) — and
     the hardcoded `scale(1.05)` was deduplicated to reuse the existing hover-scale token
     mechanism. Commits `ae604c09a`, `56e51a7dd`.
   - Trust-bar badge circle border was an unconditional hardcoded CSS fallback with no editor
     control — added `iconCircleBorderWidth`/`iconCircleBorderStyle`/`iconCircleBorderColour`
     following the existing box-family pattern, live-verified via `getComputedStyle`. Commit
     `d216ca7cd`.
   - Cloning pipeline's section-boundary detector fixed — it only recursed one level into
     `<main>`/`<article>` for `<section>` children, missing sections nested deeper past inert
     wrapper divs. Verified on the Mama's Munches product draft (found 8 sections, was 6) with a
     homepage negative control (byte-identical, no regression). Commit `4b6072757`.
     File: `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py`.
   - Hero split-media image not filling its column at tablet width — proven CSS-specificity bug
     (a shared media-atom rule tied with and beat the hero's own height rule on load order),
     fixed with a higher-specificity scoped rule in `render.php`, live-verified at 7 breakpoints
     (375-1440px). Commit `ec3fcabfd`.
6. Two plan docs re-verified against real live evidence (not their own claimed status) and
   archived: `2026-09-08-parity-tool-bem-layer-aware-matching-design.md` (D1017, commit
   `1ab1abea6`) and `phase-measurement-integrity.md` (D1016, commit `80c6442c0`).
7. **New design doc produced, NOT yet actioned** — awaiting your pick from its menu:
   `plans/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`. Researches widening
   HTML-draft recognition beyond the current BEM-only rule (found an existing conversion step
   whose output is computed but never wired into the accept/reject gate — a near-free small fix)
   and detecting template/archive-shaped pages to take structural shortcuts. Ranked menus only.
8. Informational research note (no build): Anthropic's "Claude Design" tool needs no special
   pipeline support — its static-HTML export is treated like any other non-BEM source. Filed at
   `C:\Users\Bean\.claude\memory\research\2026-09-10-claude-design-sgs-pipeline-compatibility.md`.
9. **Third pass, same day — tier-migration doc's 3 open design questions settled + R1/R9/R10
   shipped (D1018):**
   - New DB column `block_attributes.tier_shape` — promotes an existing but buried discriminator
     (flat-sibling / tier-object / box-only) into a proper DB-derived column, matching the
     `box_family` pattern. Independently gap-checked by a separate agent (5/6 held up; one
     disclosed process gap — an unfindable `/qc-council` transcript, not a defect). Commit
     `58642349d`.
   - **R1 rescoped and found 96% already done** — the old 105-families/41-blocks estimate was
     stale. Real remaining work: 17 attributes across 9 blocks (not yet built). Report:
     `reports/2026-09-10-r1-rescoped-worklist.md`, commit `feefcb7a3`.
   - **R9 capability-coverage inventory run** — confirmed motion as the biggest gap, found and
     fixed a new one (`align-content`/`justify-items`, commit `23cd8322f`). Report:
     `reports/2026-09-10-capability-coverage-inventory.md`, commit `09e223a81`.
   - **R10 colour root cause found and fixed** — not a broken colour system, a diagnostic
     classifier blind to shared-file CSS. Unresolved count 253→233. Commit `f6085e72b` (root
     cause), `b9ea6047f` (fix).
   - Both fixes independently re-verified via inline `/qc-inline` (direct code read + live
     self-test run + live DB query, not agent self-report) — held up, 92/100, shipped. Full
     detail + the disclosed `/qc-council`-unavailable process note: `decisions.md` D1018.

**What's still genuinely open:**
- **R8 (motion/animation cloning from raw CSS) — SHIPPED, council-fixed, WIRED, AND the hover-trigger
  gap CLOSED, all 2026-09-11.** All 14 steps + 4 QA gates of
  `plans/archive/phase-r8-motion-recognition.md` executed and closed (D1021) — a 4-rater
  `/qc-council` sweep found and fixed a BLOCKER that would
  have made the whole phase a silent no-op plus 5 more real bugs (D1022) — then a design
  `/qc-council` validated exactly where to wire all 8 modules into the real pipeline, built both
  streams (each checked by its own `/qc-inline` subagent reviewer before acceptance), now LIVE in
  `assembly.py` (Tier 1/2/3, step 3a1b) and `stage_neg1_motion_probe()` in
  `sgs-clone-orchestrator.py` (Tier 4a/4c/4d) (D1023). **The one disclosed gap from D1023 is now
  fixed (`b47705354`):** `scoped_motion_css_text()` only ever read an element's UNCONDITIONAL CSS,
  so a `.x:hover{animation:...}` shape was entirely invisible to Tier 1/2, not merely mis-tagged as
  load-triggered — a narrower/worse problem than D1023 originally scoped. Fix adds a narrow,
  same-element-only `:hover`/`:focus` selector fallback (`_own_hover_scoped_decls`), tried only
  when the unconditional lookup finds nothing, wrapped in a real selector block so
  `classify_trigger`'s brace-walk correctly resolves `fxTrigger='hover'`. Deliberately still out of
  scope: ancestor-hover-triggers-descendant (`.card:hover .card__img`), responsive tiering of hover
  rules, multi-rule cascade specificity — none of those were part of the disclosed gap. Verified:
  all 13 motion_shape + 5 motion_trigger fixtures pass unchanged, full converter pytest suite 828
  passed/1 skipped/1 xfailed/0 failures, plus dedicated scratch fixtures proving the hover case now
  resolves `sgsAnimation` + `fxTrigger='hover'` and the ancestor-hover shape correctly stays
  undetected. **fade-up/slide-up structural tie ALSO closed same day (D1025, `966efb518`):** the two
  presets were true duplicates (identical CSS + a magnitude-band-widening fix from an earlier round
  makes them permanently indistinguishable by magnitude alone — a magnitude-only fix was
  investigated and found to be a structural no-op before building it). Real fix: a new
  `co_animates_opacity` DB axis (AOS's real fade-vs-slide convention, fetched from source) makes
  them genuinely distinguishable — `slide-*` now opts out of the shared opacity fade + moves a
  genuinely larger 100px. Design-reviewed by 2 parallel agents against the live code before
  building. Real-world Tier 1+2 (static-CSS) coverage: **6/13 (~46%)**, up from 5/13, after 2 genuine new
  real-world matches (TAG Heuer's `slideUp`, `dy_appear_from_bottom`) traded against one coincidental
  cross-shape match that never wrote a real attribute anyway (`preloaderAppear`↔`border-accent`).
  **The transition-extractor dead-code gap (found during D1025's build) is ALSO now fixed same day
  (D1026, `bc534f763`):** `scoped_motion_css_text`'s transition branch now builds a real snippet
  `extract_shape_from_transition()` can use, restoring a `:hover`-triggered transition shape (e.g.
  `border-accent`'s real pattern on a real element) as genuinely reachable end to end — verified,
  not just fixture-level. **Confirmed this does NOT move the 6/13 sample** (grepped the coverage
  report: zero mentions of "hover" — the sample's 3 transition-based matches are all JS-state-toggled,
  not `:hover`-driven, a real scope boundary this fix can't and shouldn't cross).
  **Honest ceiling answer, asked directly:** 6/13 is not a hard ceiling — every one of the 7 open
  items has a named, disclosed cause (3 correct non-matches, 1 structural JS-runtime boundary
  [Swiper], 3 needing live DOM/JS-state observation), and the single largest REMAINING code-fixable
  item is `%`-unit transform matching not being scale-normalised against `px`-based bands — a real
  design question (same shape as D1025's fade/slide split), not yet decided or built.
  Full detail: `decisions.md` D1021–D1026, `reports/2026-09-11-r8-tier1-2-coverage-measurement.md`,
  `reports/2026-09-11-r8-tag-heuer-full-verification.md`. Header/footer is next (see below).
  One minor doc-accuracy item for next touch: the plan's own QA-gate pytest command collects zero
  of this phase's files (keyword collision), not a code defect.
  **Tier 4b "page-load-settle" live probe SHIPPED same day (D1032):** closes 1 of the 3
  transition-based gaps D1026 disclosed as needing live DOM/JS-state observation — Locomotive's
  `.c-preloader` (timing-triggered, not `:hover`/scroll). New `converter/resolvers/
  load_settle_probe.py`, wired into `stage_neg1_motion_probe()` via a candidate-finder that
  re-derives Tier 1/2's own "transition, no reachable hover" decline shape from the mockup
  directly (no new CSS-reading logic). Combined real-world coverage: **7/13**. Detail: D1032.
- **R1 is NOT done** — corrected 2026-09-10 later same day (was miswritten as "done" here and in
  `decisions.md` D1018 in the same breath as listing its own open work; Bean caught it). Only
  R1's MEASUREMENT is done (96% already correct); the real remaining 17-attribute conversion has
  not been built — verified via `git log` showing zero converter commits touching it since
  `reports/2026-09-10-r1-rescoped-worklist.md` landed.
- A latent bug flagged, not fixed: an older predicate (`tier_object_base()`) over-matches 67
  unrelated attributes the new `tier_shape` column correctly excludes — hasn't caused a live
  problem yet (confirmed via `sgs/gallery.padding`). Needs a decision: fix now or park.
- The Mama's Munches PRODUCT draft (not the homepage) still cannot fully clone — its sections
  are now correctly found, but every section hard-halts at the next stage because its classes
  aren't SGS-BEM. Needs either a draft rewrite or the Tier 0 gate-wiring fix from the
  brainstorming doc — your call, not made yet.
