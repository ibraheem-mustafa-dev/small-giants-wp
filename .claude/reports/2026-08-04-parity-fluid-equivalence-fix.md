# Parity Fluid-Equivalence Fix — 2026-08-04

**doc_type:** report
**scope:** `plugins/sgs-blocks/scripts/parity/computed-parity.js` only (per task constraints — no other files modified, DB read-only, nothing committed)
**process:** `/subagent-driven-development` (implement → 2 independent reviewers → address findings → `/qc-inline`)

## What changed

`computed-parity.js` (the clone-vs-draft CSS parity measurement tool) was reporting large false mismatches for `font-size`/`line-height` below the 1200px viewport ceiling. Root cause (proven earlier this session, `.claude/reports/2026-08-04-fluid-typography-mobile-parity-hypothesis.md`): the DRAFT is hand-authored flat px; the CLONE renders through WordPress's own fluid-typography engine (`theme/sgs-theme/theme.json` → `settings.typography.fluid`), which auto-generates `clamp()` CSS. That is a faithful, correct transfer the tool was mis-scoring as a failure.

Added a **fluid-equivalence** rule: when a font-size/line-height mismatch below the ceiling is proven to be WordPress's own fluid transform of the draft's value, it now scores as a PASS, recorded in its own `fluid_equivalent` bucket (never silently merged into an undifferentiated match count). theme.json was **not touched**; fluid typography stays on.

### The maths (source-verified, not inferred)

The first implementation inferred which theme.json font-size preset a measured pixel value "belonged to" from numeric coincidence, then trusted that preset's declared fluid bounds. **Both dispatched reviewers independently found this unsafe** — a wrong preset guess means wrong bounds, which means validating a genuinely broken clone against the wrong curve and passing it (the exact failure mode the rule exists to prevent). The coordinator directed a rewrite; the final version does not guess at all:

1. `declaredValue(el, prop)` (added to the browser-side capture) reads the ACTUAL declared CSS text for `font-size`/`line-height` off the live element — walking up the ancestor chain (both properties inherit; WP's fluid clamp is typically declared once on `body` and inherited) — by indexing every accessible stylesheet's matching rules, plus one level of `var()` indirection resolution (including `var(--name, fallback)` syntax).
2. `parseClampExpr()` parses that declared text if it is a `clamp(min, <linear-expression>, max)` shape. **Live discovery, 2026-08-04:** Chromium algebraically simplifies the authored WP form (`0.875rem + ((1vw - 3.75px) * 0.242)`) into a distributed form (`-0.9075px + 0.875rem + 0.242vw`) before exposing it via the CSSOM — the parser sums every px/rem term into a constant and every vw term's coefficient into a factor, order-independent, rather than pattern-matching WP's authored shape literally.
3. `fluidEquivalentFontSize(drec, crec, viewportPx)` grants equivalence only when **all three** hold: (a) the clone's declared text parses as a clamp(); (b) the clamp's own ceiling equals the DRAFT's flat value within tolerance — this is the proof the clamp is a transform of *this* element's own value, not an unrelated clamp() that coincidentally lands near the right pixel; (c) evaluating the clamp at the current viewport reproduces the clone's own computed value. Any element where the evidence can't establish this **DECLINES** (falls through to a normal, real, scored miss) — it is never guessed.
4. `lineHeightIsMechanicalConsequence()` was rewritten to eliminate compounded rounding rather than widen tolerance to tolerate it (see Reviewer Findings #2). It reads the clone's declared line-height; only a bare unitless number (this framework's proven mechanism) is accepted. It then multiplies that exact multiplier by the **unrounded** `predictedPx` already derived in step 3 — removing three of the four rounding steps the original ratio-based version had compounded, leaving exactly one (the single `clh` measurement) for `FLUID_TOLERANCE_PX` to cover.

### Tolerance: ±0.5px

The capture pipeline's `normVal()` rounds every fractional px to the nearest integer *before* any comparison runs, so the clone-side measured value is always an integer. ±0.5px absorbs exactly one round-half tie against the exact (unrounded) `evalClampAt()` prediction. It cannot swallow a genuine 1px+ regression — proven by the self-test's negative control and misattribution-regression tests, both of which plant multi-pixel-off values and confirm they still miss.

## Before / after (live-measured, same draft + same clone URL, `--viewports 375,768,1440`)

Draft: `sites/mamas-munches/mockups/homepage/index.html`. Clone: the sandybrown canary (`routing-audit-clone-2026-08-02`).

| Viewport | Before (baseline artefact, `pipeline-state/mamas-munches-homepage-2026-08-04-154529/computed-parity.json`) | After (this fix, `.claude/reports/2026-08-04-computed-parity-after-fix-final.json`) | fluid-equivalent | fluid-declined |
|---|---|---|---|---|
| 375px | 83% (769/929) | **89% (839/939)** | 70 | 0 |
| 768px | 84% (780/931) | **90% (850/941)** | 70 | 0 |
| 1440px | 89% (783/876) | 89% (783/883) — unchanged, correctly | 0 | 0 |
| Overall | 85% | **89%** (2472/2763) | 140 | 0 |

1440px is correctly unaffected — the clamp is flat at/above the theme's 1200px ceiling, so there is nothing for the rule to forgive there; its own draft/clone denominators drifted by a handful of props between the two runs only because the canary is a live, shared site with other tracks active this session, not from anything in this fix. `fluid_declined` is 0 at every viewport on this page — every genuine fluid mismatch on this specific draft had a cleanly parseable, correctly-attributed source clamp(); the decline path exists and is proven to fire correctly on the self-test's synthetic negative fixtures.

**Known separate issue, confirmed still present and untouched** (correctly, per the task): at 1440px, button labels (`8pack`/`12pack`/`20pack`/`40pack`) and reviewer names still show `draft:13px, clone:14px` — the `small` preset's declared `fluid.max` (14) doesn't match the draft's actual 13px usage. This does not follow the clamp signature and was left alone.

## Reviewer findings and how each was resolved

Two independent reviewers were dispatched (`FluidReviewCorrectness`, `feature-dev:code-reviewer` persona; `FluidReviewAdversarial`, same agent type, adversarial brief). Both returned real, substantive findings — nothing was fabricated or assumed while waiting.

| # | Finding | Reviewer | Resolution |
|---|---|---|---|
| 1 | Preset-identity shortcut in the original `wpFluidBounds`: a numerically-coincident base px was treated as proof of preset routing. Grounded in `sgs_font_size_value()` (`plugins/sgs-blocks/includes/helpers-tokens.php:729-749`): a numeric attribute emits flat, no clamp; only a slug routes through the preset var. | Correctness + Adversarial (both, independently) | **Full rewrite** (see "The maths" above) — the live decision path no longer attributes anything to a preset at all; it parses the clamp() literally off the source and requires the ceiling to match the draft's own value. The old preset-guessing functions (`wpFluidBounds`/`wpFluidValueAt`) are kept only to construct the self-test's synthetic fixture. |
| 2 | `FLUID_TOLERANCE_PX` reused for line-height without accounting for compounded rounding (four already-rounded measurements feeding a ratio, vs the tolerance being calibrated for one rounding step). | Correctness | **Fixed by elimination, not widening**: `lineHeightIsMechanicalConsequence` now uses the clone's exact declared multiplier × the exact unrounded `predictedPx`, removing 3 of 4 rounding steps rather than inflating the tolerance to paper over them (which would also have let real regressions through). |
| 3 | Two-point viewport sampling (375/768) could theoretically be coincidentally matched by a discrete device-tier override that isn't genuinely fluid, producing a discontinuity between the sampled points that the rule can't see. | Adversarial | **Resolved as a structural side-effect of fixing #1**, not by adding a third viewport: since the rule now requires a literal source-verified `clamp()` declaration (not pixel-pattern inference), a discrete/stepped device-tier override — which renders a flat px, never a clamp() string — fails at the parse step and DECLINES. The self-test's misattribution-regression fixture is exactly this scenario (a flat 17px "device-tier-style" clone value against a 20px draft) and is asserted to decline. |
| 4 | `THEME_FLUID` is a hand-copied snapshot of theme.json with no drift guard. | Adversarial | Built `verifyThemeFluidFreshness()` — reads `theme/sgs-theme/theme.json` live at process start and compares every fluid setting + preset against `THEME_FLUID`; on any drift it prints the exact mismatch and (see next row) disables granting for the run. |

**A fifth defect was found by this session's own `/qc-inline` pass, not by either dispatched reviewer:** the drift guard (row 4) *detected* drift and printed a banner, but the boolean it set (`THEME_FLUID_VERIFIED`) was never read anywhere — a gate that warns but doesn't act. Caught by deliberately corrupting a copy of the file's `THEME_FLUID.minViewportWidth` and re-running `--self-test`: the drift banner printed correctly, but the positive fixture still wrongly reported a fluid-equivalent PASS. Fixed by gating `fluidEquivalentFontSize()` on `THEME_FLUID_VERIFIED` (decline outright when unverified — the viewport-ceiling comparison itself depends on `THEME_FLUID.maxViewportWidth`, so a stale config can't be partially trusted). Re-ran the same corruption test after the fix: the positive fixture now correctly reports **FAIL** (5 assertions fail, exit code 1) — proving the gate can now actually gate. Reverted the corrupted copy before commit (it was a throwaway file, never the real one).

**A sixth defect was found live against the real canary, also not by either reviewer** (both reviews were static/code-only for the correctness pass, and the adversarial pass ran before the source-verified rewrite existed to review): the first live run of the rewritten rule against the sandybrown canary showed **0** fluid-equivalent grants and **35** declines at 375px — the exact opposite of what the fix was built to produce. Traced live via Playwright: modern Chromium's CSS Nesting support means every `CSSStyleRule` now exposes a `.cssRules` property (an empty `CSSRuleList` when there are no nested rules) that is **truthy even when empty** — the walk's `if (rule.cssRules) { recurse; continue; }` was therefore always true and it recursed into an empty list and skipped, never reading the rule's own `.style`, on every rule on the page. Confirmed directly: `body{font-size:clamp(...)}`'s rule object had `cssRules: {}` (truthy, 0 length). Fixed by processing a rule's own `.style` unconditionally and *also* recursing when `.cssRules.length > 0` (the two aren't mutually exclusive). Re-ran live: fluid-equivalent grants went from 0 to 70/70/0, matching the expected shape exactly.

## Negative control — proven, not asserted

Per the coordinator's explicit requirement, the rule's ability to still FAIL was proven multiple independent ways, each confirming the planted break landed on disk before trusting the result:

1. **`--self-test`, Test 2** (`bad-clone.html`): draft 16px/26px-lh vs a clone flat 10px/14px (not a clamp() at all). `fs.readFileSync` re-reads the fixture off disk and asserts the literal string `"10px"` is present before the comparison runs. Result: real scored miss, `declined:1`, NOT granted equivalence.
2. **`--self-test`, Test 3** (`guard-clone.html`): 12px→11px flat, no clamp — same disk-read confirmation for `"11px"`. Result: real miss, declined, not granted.
3. **`--self-test`, Test 4 — the misattribution regression** (`mis-clone.html`): draft 20px (exactly the "large" preset's own declared size) vs a clone flat 17px (exactly what the *old*, since-replaced preset-guessing code would have predicted as "large"'s min bound at 375px — the precise false-pass both reviewers warned about). Disk-read confirms `"17px"` landed. Result: real scored miss, declined, NOT granted — proving the specific bug class both reviews found is now closed.
4. **Drift-guard negative test** (ad hoc, not part of `--self-test`): a throwaway copy of the file with `THEME_FLUID.minViewportWidth` corrupted to `999` was run through `--self-test`. The drift banner fired and 5 assertions correctly flipped to FAIL (positive fixture no longer grants equivalence while the config is unverified) — proving the drift guard is load-bearing, not decorative.

All four ran against the actual shipped `comparePair()`/`fluidEquivalentFontSize()` code path via `capture()` + real Playwright/Chromium rendering, not a reimplementation.

`node computed-parity.js --self-test` final result: **18/18 checks pass** (`ALL SELF-TEST CHECKS PASSED`).

## `/qc-inline` verdict

Ran inline per the skill's process (structural pre-gate → goal → scenarios → execute → compare). Findings folded directly into the two bugs described above (drift-guard-doesn't-gate, CSS-Nesting `.cssRules` truthiness) — both were caught and fixed as part of this same QC pass, then re-verified:

- Golden path (`--self-test`, all 4 scenarios / 18 assertions): **pass**.
- Live end-to-end run against the real draft + sandybrown canary: **pass** — produces a valid JSON report with `fluid_equivalent`/`fluid_declined` fields present and populated sensibly (70/70/0 grants, 0/0/0 declines, 1440px correctly untouched).
- Drift-guard negative test: **pass** (proven capable of failing, then fixed, then re-proven capable of failing on a corrupted copy, then confirmed clean on the real file).
- Confidence: high — every scenario ran against the real system (real browser, real live site, real fixtures on disk), not mocked, with two independently-caught real defects fixed mid-pass rather than assumed away.
- **Recommendation: ship.**

## What I could not determine / documented blind spots

- **Cascade specificity/`!important`** — `declaredValue()`'s rule-matching approximates the cascade as "last matching rule in stylesheet source order wins." It does not model selector specificity or `!important`. Not exercised as a failure in this session's live run (0 declines), but a page where two competing rules of different specificity both target the same element's font-size could, in principle, pick the wrong one. Documented in-code as a blind spot rather than silently assumed away.
- **Multi-level `var()` indirection** — only one level of `var(--name)`/`var(--name, fallback)` is resolved. A custom property whose value is itself another `var()` reference will not resolve and DECLINES.
- **Cross-origin stylesheets** — inaccessible (CORS) and skipped; any font-size sourced from one is undetectable and DECLINES. Not encountered on the canary (0 sheets blocked in the live diagnostic run).
- **Non-linear or non-px/rem/vw clamp() middle terms** — the parser only recognises linear px/rem/vw combinations (WP's own generation shape, algebraically simplified by the browser). A clamp() using `%`, `em`, `ch`, or container-query units, or a genuinely non-linear expression, is not this pattern and DECLINES.
- I did not build a synthetic fixture that specifically exercises the cascade-specificity blind spot (would require two competing stylesheet rules) — the self-test's 4 scenarios cover the proven live defect classes but not every theoretical gap named above. Flagging this as the honest limit of this session's testing rather than claiming exhaustive coverage.

## Files touched

- `plugins/sgs-blocks/scripts/parity/computed-parity.js` — the only source file modified, per task constraints.
- `plugins/sgs-blocks/scripts/parity/__fluid_selftest_fixtures__/` — new self-test fixture HTML files (7 files: draft/good-clone/bad-clone/guard-draft/guard-clone/mis-draft/mis-clone), written by `--self-test` itself, kept on disk so the negative control is re-runnable.
- `.claude/reports/2026-08-04-computed-parity-after-fix-final.json` — the live "after" measurement artefact this report's numbers are drawn from.
- This report.

Nothing committed, per constraints.
