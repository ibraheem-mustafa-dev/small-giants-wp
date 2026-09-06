# LEDGER history sweep — 2026-09-04 (session 7, manual sweep, not auto-rotated)

<!-- LEDGER.md never crossed 24576 bytes this session, so ledger-rotate.py's Stop hook never
     fired. This file exists because Bean directed a manual sweep of closed-track narrative
     out of LEDGER.md to keep it lean, regardless of byte cap. Everything below was cut from
     LEDGER.md's session-7 rewrite; nothing here is current status — read LEDGER.md for that. -->

## UNIFORMITY SWEEP TRACK — closed-track detail cut from LEDGER.md

`01-tab-group` + `21-render-without-control` BOTH CLOSED 2026-09-03 (session 4, D933).

Session 4 closed both remaining detectors in this track to zero, via `/dispatching-parallel-agents`
in several waves, each verified live after landing — full account: D933.

- `01-tab-group` 32 → 0: 20 blocks needed only a `group="styles"` tag move; `team-member`,
  `buybox`, `social-icons` had their own small bugs (buybox's Border panel was self-exempting on
  a missing DB `css_property` seed, fixed directly in `sgs-framework.db`); the remaining 9 blocks
  got real TIER-1/TIER-2 panel restructuring per THE PLACEMENT RULE (Spec 35 Part O). `rules.json`
  ratchet ceiling lowered 57 → 0.
- `21-render-without-control` 54 → 0: every fix reused an existing shared control — `ShadowControl`
  + `SgsLengthControl` for `heading`/`text`, `product-card`'s controls copied onto `buybox` (and
  vice versa for `showPickers`), `team-member`'s transition pair copied onto `cta-section`.
  `cta-section.body` and `site-footer.alignContent`/`tagName` were confirmed dead schema and
  deleted outright (D270 no-deprecation policy), not worked around. `rules.json` ceiling lowered
  146 → 0 (that pre-session figure was itself inflated by unrelated concurrent work landing in the
  same window — see the rule's own `advisoryReason`).
- Both rules are candidates for advisory → gate promotion now that their backlog is genuinely
  zero — flagged, not promoted in this pass; a deliberate call for a future session.
- Two investigation-phase claims were checked and found WRONG before any fix was dispatched (a
  `--json` scan-mode bug; a hover-effects "detector blind spot") — both real gaps, not detector
  noise. Bean's explicit instruction mid-session: don't hand-code a control, map it to an existing
  shared mechanism first, verified by source. See `feedback_map_to_shared_mechanism_before_building_controls.md`.

Gap-candidates retirement is DONE — merged via PR #37 (`61c2e813b`), confirmed in `git log --all`;
its worktree, branch and prompt file are all correctly gone.

Earlier history (D918/D919/D922/D924/D930/D933). Full accounts in `decisions.md`, not duplicated
here.

## COLOUR TRACK — session 6 (D936-D945) full narrative, cut from LEDGER.md

D936 batch: 8 of 9 rows CLOSED + live-verified, 1 parked (miscategorised). Hover-guard's real
blind spot fixed. Detail: D937-D943, correction D945.

Shipped that session (D937-D943 carry the full account, D945 is the correction):
- **8 of D936's 9-row batch unblocked** for a future text gradient — `quote.textColourHover`,
  `pricing-table.popularBadgeColour`/`ctaColour`, `modal.closeColourText`, `product-card.
  ctaColourText`/`tagTextColour`, `nav-menu.navColour`/`itemColour`, `form.submitColour`, `modal.
  triggerColour`. Three fix shapes depending on how the background reached the selector (moved to
  `::after`; moved to `::before` when `::after` was already claimed by a hover-underline effect;
  cancelled via `background-color:transparent` when the background came from a CSS class default
  the PHP layer can't see) — `/qc-council` caught that a blind mechanical batch across all 9 would
  have been wrong for most of them.
- **The 9th, `nav-menu.burgerColour`, is NOT fixed** — miscategorised (D942): the "text" is an
  SVG icon via `currentColor`, `background-clip:text` does nothing to it. Needs
  `sgs_svg_stroke_gradient()` + a new attribute, not this batch's recipe. Parked (D945) after an
  independent `/qc` check on that session's handoff caught the "9 of 9" overclaim.
- **A real cross-block bug fixed**: `sgs_block_background_layer_css()` didn't split comma-joined
  selectors before `::after`, silently dropping the layer on all but the last branch — hit
  `product-card`'s bound-mode CTA.
- **The hover-guard's ACTUAL blind spot fixed** (session 5's file-list fix had zero effect):
  `php-hover-scan.php` only read named `function(){}` bodies; `render.php` declares none. Fixed by
  also scanning the gaps between bodies. 0 → 24 findings across 24 files, self-test-proven.
- **All 8 fixed rows live-verified on the deployed canary** (D945) — first time this track closed
  with real deployed-code evidence (`wp eval` on each block's `render_callback`), not just the
  local harness.
- **Three unrelated pre-existing blockers cleared** to get the deploy to run — none that session's
  fault, each traced via `git log`: a stale test-page content attribute, an editor-canvas-desync
  ceiling exceeded by two earlier-same-day commits, and DB schema drift from a table D931 had
  already decided to retire (drop just deferred).

⛔ ELIGIBILITY IS NOT "the colour is painted directly" — still governing (`background-clip:text`
clips the WHOLE background paint area). D936 has the three ways a background reaches a selector
invisibly to element-manifest scanning.

⛔ Before filing something as an open design decision, check whether another block already solved
the identical shape. Four rows here were wrongly filed that way; all four resolved cleanly against
existing precedent (an unused pseudo-element slot; a class default with no `-image` property; an
existing SVG-gradient mechanism; a sibling block's non-empty-default fix).

Guardrails carried from session 6:
- A build/deploy failure may be pre-existing debt, not a regression — twice that session
  (editor-canvas ceiling, DB schema drift) traced to earlier-same-day work via `git log`.
- Fix the DECLARATION a value derives from, never the derived row (D935) — reinforced by retiring
  a table via `retire_table.py` (backup+archive+round-trip) not a bare `DROP TABLE`.
- A harness limitation can look exactly like a code bug — `sgs_resolve_palette_hex()` always
  degrades to `''` in the local QA harness (no real theme.json); a raw-hex test proved the code
  was right all along.
- "No CSS" on a live page may just mean the CSS moved — SGS lifts every block's scoped `<style>`
  into `uploads/sgs-css/sgs-<epoch>-<hash>.css`; grep that, not the raw page HTML.
- A session's own summary of its work is a claim, not proof — an independent `/qc` pass on that
  session's own handoff caught an overclaimed "9 of 9" and an unrecorded live-verification event
  (D945).

## MOTION TRACK B (Generative Background Engine) — full historical narrative, cut from LEDGER.md

Shipped and live on the canary: all three fold layers, verified against matrices extracted from
the running rig. A missing depth buffer was the stair-step artefact, fixed `ba01581df`. Frame cost
0.240ms / 0.300ms.

The fidelity gap was REAL, is now FIXED and measured closed (`fidelity-baseline.json`, tracked):
5.29%→2.81% / 4.71%→2.35% / 5.63%→2.73% crop-wide — 3 of 3 now pass the 5% ceiling (was 2 of 3
failing).

2026-09-03 (D925-D927) — root cause PROVEN via `/systematic-debugging`, then FIXED mechanically.
Not geometry — silhouette coverage matches the rig within 0.4pt avg. Every fragment-shader
constant was checked against the reference's real measured values: `DEFAULT_GLOW_AMOUNT` was ~20x
too large, 7 more constants also wrong. Deleted (not corrected) one whole effect ported from the
reference's DARK theme into a light-only comparison. Gated depth-fade to dark ground only.

Result: 3/3 phases pass (2.81/2.35/2.73%, ceiling 5%); `bias_over_abs` ~0.9 (systematic) → ~0.3
(not); silhouette IoU 0.77-0.80 → 0.90-0.96; SHADED/SILHOUETTE coverage now match exactly
per-phase. `verify-transform.mjs` still 7/7.

Live playback speed fixed (D930/D932). Bean, live-testing: "ours is super fast compared to the
original." Same shape of bug as the fidelity gap: the reference scales its time input
(`u_speed=4e-5`) before animating; the shipped engine had none — running ~25x too fast. Fixed with
a reference-derived `TIME_SCALE` constant.

A demo-page bug caught live, not shipped silently: the first test page had no colour attributes
set, so the effect never started — Bean saw an empty container and correctly called it "not the
Stripe cloth animation". Fixed; confirmed via screenshot, not markup presence.

Colour vibrancy FIXED (D939, corrected D941, 2026-09-03). The real defect was HUE RANGE, not
saturation/lightness — three of four demo stops sat in a 15° pink band. D939's first fix was
wrong: it picked stops whose interpolation path crossed green/yellow/cyan, shipping a literal
rainbow. Bean caught it on sight ("check the colours of the actual original, it is not a
rainbow"). D941 corrected it by sampling the reference's live screenshot pixels directly — its
hues cluster in exactly three families, blue-violet / pink-magenta / orange, never
green/yellow/cyan — and choosing a new 4-stop palette whose interpolation path was verified in a
Python simulation of the actual OKLCH code BEFORE shipping.

The 1D-vs-2D texture gap is CLOSED (D944, 2026-09-03). Bean spotted it by eye: their shader
samples the palette texture on BOTH uv axes; ours varied only horizontally. A first candidate fix
(normalised k-means colour-region blend) was measured against the reference's own palette-a.png
and found structurally wrong — 0% near-white/near-pure vs the reference's real 0.8%/2.4%. The real
mechanism is alpha-COMPOSITED paint over white, not an averaged blend. `buildFieldImageData()`
(procedural noise-warped blobs, real alpha-over compositing) matches the reference's measured
category.

Session 7 additions (D946-D948, a concurrent session):
- D946 [INCIDENT] — blob-density white-coverage regression shipped without checking its own
  measurement against the reference baseline before deploy (24-35% near-white vs reference 0.8%).
  Process failure, not a measurement gap — the measurement function already existed, it just
  wasn't run before shipping. Fixed + a process gate added (check the measurement before
  deploying, not after).
- D947 [INCIDENT] — an implementer subagent's report claimed three shader/JS fixes (dark-ground
  alpha-mix, dark-ground grading/glow-gate scope, striation-midline-blackout floor) that were
  never actually in the commit (`git show` on the actual diff showed only 15 changed lines,
  nowhere near enough) — caught by direct verification (a local browser test threw a
  `ReferenceError` for a constant the report claimed was added but wasn't), not by trusting the
  report. A second bug was introduced fixing the first: a literal backtick inside a JS template
  literal (the shader source) silently truncated the string — caught by the same local test.
  Fixed directly, verified end-to-end (dark-ground alpha spans 5-255, WebGL renders, zero console
  errors, `fidelity:compare` still 3/3).

Withdrawn claims, do not resurrect: an 89.3% silhouette IoU (no script, no committed inputs), and
"a systematic colour cast" (over-read `bias_over_abs`). See D888.

Full addenda on the interactive-timeline sub-feature (five uncaught defects, a specificity contest
lost silently three times, corrected marker/fill percentages, the false "no GSAP at 375px" claim
withdrawn) — see `decisions.md` and the design doc's own addenda log; not duplicated here.
