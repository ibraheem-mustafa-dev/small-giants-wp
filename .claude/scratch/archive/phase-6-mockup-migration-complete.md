# Phase 6 - Mama's Mockup Migration to SGS-BEM

**USP:** First conforming draft. Establishes the canonical example of "what SGS-BEM looks like for a real client mockup" - every future drafted page references this shape.
**Plan label:** [PLAN: sonnet]
**Docscore:** pending
**Aggregate cost estimate:** ~$0.50 (Sonnet inline; ~9 sections × class rename pass; visual diff verification)

**Phase success criteria (done when):**
- [ ] All `sites/mamas-munches/mockups/homepage/*.html` files use `.sgs-<block>__<element>--<modifier>` class naming
- [ ] All CSS rules in `sites/mamas-munches/mockups/homepage/*.css` use the new class names
- [ ] Visual rendering of the mockup is identical to pre-migration (browser screenshot diff <2%)
- [ ] `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` updated with new class-name selectors
- [ ] Hero parity test (Phase 8) becomes runnable against the migrated mockup

**Entry context:**
- `sites/mamas-munches/mockups/homepage/index.html` (and any per-section subfiles)
- `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` - section-by-section catalogue
- `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` - convention rule
- `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` - 50-attr baseline (DO NOT MODIFY)
- `tools/recogniser-v2/extract.py` - extractor (post-strip)
- `plugins/sgs-blocks/scripts/recogniser/slot-filler.py` - slot-filler v1

**References:**
- Phase 1 Spec 13
- Phase 4 batch B5 - /sgs-clone now has Stage 0 pre-flight gate that rejects non-conforming drafts
- Lesson 221 (don't delegate test of unproven work) - visual diff verification stays inline

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| inline | Edit / Read | Steps 1-4 |
| mcp | Playwright (browser_navigate + take_screenshot) | Step 5 |
| inline | Image diff via PIL | Step 5 |
| cli | pytest | Step 6 |

---

## Steps

### Step 1 - Inventory existing class names + map to SGS-BEM
- **Model:** inline
- **Action:** Read all html + css files in `sites/mamas-munches/mockups/homepage/`. Build a mapping table: existing class → SGS-BEM equivalent. Save to `.claude/scratch/mama-class-rename-map-2026-05-10.json`.
- **Files:** scratch JSON (transient)
- **Inputs:** mockup files
- **Outcome:** mapping table covers every class found in the mockup; columns: old, new, role, notes
- **Exec:** SEQUENTIAL
- **Deps:** Phases 1-4 complete
- **Marker:** SESSION-START
- **Time:** 15 min
- **Tooling:** Read + Write
- **On-Fail:** If mockup has classes that don't map to any SGS block (orphan elements), flag for Bean review before forcing a name
- **Cold-Entry:** This file + Spec 13 + TRUTH-SPEC.md + mockup files
- **Test:**
  - Happy: mapping covers ≥95% of classes; <5% flagged for review
  - Edge: a section uses both BEM-ish and ad-hoc patterns → mapping disambiguates per element
  - Fail: a class can't be mapped (e.g. a decorative class with no SGS block equivalent) → keep as-is + comment in scratch
  - Integration: Steps 2-3 consume this mapping

### Step 2 - Apply rename to HTML files
- **Model:** inline
- **Action:** For each html file, Edit using the mapping. Each old class is replaced with new SGS-BEM class. Preserve attribute order, formatting, comments.
- **Files:** all html in `sites/mamas-munches/mockups/homepage/`
- **Inputs:** Step 1 mapping
- **Outcome:** every old class replaced; html file passes basic well-formedness check
- **Exec:** SEQUENTIAL (per file; serial to avoid edit conflicts)
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 15 min
- **Tooling:** Edit (with replace_all where safe)
- **On-Fail:** If a class appears in JS event-handler code, do NOT rename without visual sanity-check
- **Test:**
  - Happy: post-grep for old class names returns 0 (or only documented exceptions)
  - Edge: classes used as data attributes for JS (e.g. `data-target=".hero-copy"`) need updating too
  - Fail: html parse error after edit → revert that file and re-edit smaller chunks
  - Integration: Step 3 updates CSS to match

### Step 3 - Apply rename to CSS files
- **Model:** inline
- **Action:** For each .css file, Edit replacing old selectors with new SGS-BEM selectors. Preserve specificity (no over-broadening); preserve @media query nesting.
- **Files:** all .css in `sites/mamas-munches/mockups/homepage/`
- **Inputs:** Step 1 mapping
- **Outcome:** CSS selectors match HTML class names
- **Exec:** SEQUENTIAL
- **Deps:** Step 2 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Edit
- **On-Fail:** If specificity changes break a cascade rule, fix manually
- **Test:**
  - Happy: post-grep for old class names returns 0 in CSS too
  - Edge: a media query had a different format → preserve exactly
  - Fail: visual regression (caught in Step 5)
  - Integration: Step 4 updates TRUTH-SPEC

### Step 4 - Update TRUTH-SPEC.md
- **Model:** inline
- **Action:** Edit `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` to reflect new class-name selectors. Each section's data-sgs binding row gets updated selector path.
- **Files:** TRUTH-SPEC.md
- **Inputs:** mapping + post-rename HTML
- **Outcome:** TRUTH-SPEC selectors match the now-canonical mockup classes
- **Exec:** SEQUENTIAL
- **Deps:** Steps 2-3 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Edit
- **On-Fail:** Spot-check 2-3 sections to verify
- **Test:**
  - Happy: TRUTH-SPEC selectors validated against actual mockup
  - Edge: TRUTH-SPEC had typos pre-migration → fix in same pass
  - Fail: selector path nonsense (e.g. ".sgs-hero hero copy") → fix manually
  - Integration: Step 6 hero-parity test reads TRUTH-SPEC

---

## QA Gate - Class names migrated; HTML+CSS+SPEC consistent
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-4 complete
- **Check:** `grep -E "\\.hero-copy|\\.hero-photo|\\.section-label" sites/mamas-munches/mockups/homepage/*.html sites/mamas-munches/mockups/homepage/*.css TRUTH-SPEC.md` returns 0 matches AND `grep -c "\\.sgs-hero" sites/mamas-munches/mockups/homepage/*.html` returns ≥3
- **Pass:** Old names absent; new names present
- **Fail:** Find missed instances; re-edit
- **Marker:** QA

---

### Step 5 - Visual diff verification (browser screenshot before/after)
- **Model:** inline
- **Action:** Pre-migration: take screenshot of mockup at 1440 width via Playwright. Post-migration: take screenshot at same width. Run pixelmatch / SSIM diff. Should be <2% difference (tolerance for AA / font-loading variance).
- **Files:** `.claude/scratch/mockup-pre-migration-1440.png`, `.claude/scratch/mockup-post-migration-1440.png`, `.claude/scratch/mockup-diff-2026-05-10.png`
- **Inputs:** browser + before/after mockup
- **Outcome:** Diff image and percentage; if >2%, identify which class change broke the visual
- **Exec:** SEQUENTIAL
- **Deps:** Step 4 + QA gate complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Playwright MCP + PIL pixel diff
- **On-Fail:** If diff >2%, find the class rename that broke; revert + re-edit
- **Test:**
  - Happy: <2% diff at 1440
  - Edge: 2-5% diff caused by font loading timing → re-take post-migration screenshot
  - Fail: >5% diff → class rename has structural issue; back-trace via element-by-element grep
  - Integration: visual continuity preserved

### Step 6 - Run hero parity test (sanity check before Phase 8)
- **Model:** inline
- **Action:** `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py::test_hero_filled_slots_match_baseline_count -v` - DOES NOT need to pass at 50/50 yet (Phase 8 is where parity test confirms); just confirm test runs without error
- **Files:** none written
- **Inputs:** post-migration mockup + slot-filler v1
- **Outcome:** Test runs (passes or fails - but doesn't error). Output captured.
- **Exec:** SEQUENTIAL
- **Deps:** Step 5 complete
- **Marker:** HANDOFF
- **Time:** 5 min
- **Tooling:** pytest
- **On-Fail:** If test errors (not failure - error), the migration broke the test fixture path. Trace + fix.
- **Test:**
  - Happy: test runs; result is either pass or fail (both acceptable here)
  - Edge: test runs and passes 50/50 immediately → Phase 8 is essentially done; record + advance
  - Fail: pytest error (not test fail) → migration broke fixture path
  - Integration: feeds Phase 8

---

## Key Judgement Calls

### Primary decisions

- **Decision:** What naming for the hero's two h1 case (desktop + mobile layouts both have h1)?
  - **Options:** A) `.sgs-hero__headline` for desktop, `.sgs-hero__headline--mobile` for mobile / B) Single `.sgs-hero__headline` and let viewport CSS hide-show / C) `.sgs-hero__headline-desktop` and `.sgs-hero__headline-mobile` (variant suffix)
  - **Recommendation:** A
  - **Why:** Modifier `--mobile` is BEM-canonical for variant; cleanly maps to slot-filler's responsive-spacing role
  - **Cost of wrong choice:** B forces CSS-only viewport switching (acceptable but less explicit); C deviates from BEM modifier convention
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** What about utility-style classes Mama's mockup uses (e.g. `.btn`, `.btn-primary`)?
  - **Recommendation:** Map to SGS-BEM as block-element with optional modifier: `.sgs-button`, `.sgs-button--primary`. Generic enough that the SGS button block matches via wp_core / sgs platform entries.

- **Decision:** What if Bean wants to keep the original mockup files for historical comparison?
  - **Recommendation:** Copy pre-migration mockup to `sites/mamas-munches/mockups/homepage-archive-2026-05-10/` first. ~30 sec extra. Worth it for forensic comparison if Phase 8 reveals issues.