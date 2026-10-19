---
doc_type: plan
title: Fill reads declared values with a confirm record (Spec 48 FR-48-8, FR-48-36)
status: active
created: 2026-10-19
spec: .claude/specs/48-CLONING-SYSTEM.md (FR-48-8, FR-48-36, FR-48-85)
---

# Fill reads declared values with a confirm record (FR-48-8)

## Why now
- **Problem:** Fill reads only the browser's computed values, and only for its fixed property list (`scripts/computed-route/lib/fill-read.mjs::PROPS`). The Indus and Mama's drafts use 86 CSS properties Fill never reads (draft reading wave, FR-48-85, group (b)). Reading their computed values is wrong for many (height and grid rows compute to layout pixels), and would flag every property on every element.
- **Effect:** draft styling outside the list is dropped silently, and the clone coverage map cannot close the CSS property groups.
- **Solution:** FR-48-8: Fill reads what the draft's code declares on each element, for every property, at 375, 768 and 1440, and keeps a confirm record (FR-48-36) for every value it writes. Code first, the render confirms (R-47-4).
- Bean, 2026-10-19: build FR-48-8 now as group (b) of the draft reading wave. The exact-name "no block setting" test is wrong: a property is matched by what it does on the page against the blocks' own default stylesheets, settings under other names, the motion model and the theme (the equivalence audit, step 5).

## What exists
- `scripts/computed-route/lib/fill-read.mjs::readDraft` already calls `scripts/parity/lib/devtools.mjs::declaredValues` (Chrome's matched rules for the element, `CSS.getMatchedStylesForNode`) per target at each read width, keeping only `DECLARED` (width and the side margins). `scripts/parity/lib/devtools.mjs::cascadeWinner` picks a property's winning author declaration (presentation attributes, author rules in cascade order, inline style, `!important`).
- `scripts/computed-route/lib/fill-resolve.mjs::fillElement` runs every property of `PROPS` through `lib/fill-prop.mjs::resolveProperty` against the block's calibrated default; `width` is written only from a declared plain length (`usedValueTarget`).
- Calibration reads `lib/calibrate-props.mjs::READ_PROPS`, which holds properties Fill does not read (`height`, `min-width`, `fill`, `stroke`, `stroke-width`, `stroke-dasharray`, `filter`, `mix-blend-mode`, `grid-template-rows`, `background-size`, `background-attachment`).
- The draft defects intake lists (FR-48-34) are in `intake.json` → `draftDefects`.

## Steps
1. **Declared read for every property** (`lib/fill-declared.mjs`, new): from the matched styles Fill already fetches, every property an author rule, inline style or presentation attribute declares on the element (custom properties left to the properties that use them), at each read width. No extra browser calls.
2. **Computed read for the declared-only properties**: a target's properties outside `PROPS` that its code declares are read computed too, in the same collect pass, so each has its rendered value.
3. **Confirm record** (`lib/fill-confirm.mjs`, new): declared against rendered draft by property type with FR-48-36's tolerances (colour ΔE 2 and alpha 0.02, length ±0.5px declared, font family by first loaded family, weight exact, line height ±0.5px, transform matrix ±0.01, time ±10ms); verdicts `confirmed`, `render-wins` (the rendered value is written and the row reported), `draft-defect` (from intake's list: built from the code and listed for Bean) and `open` (no declared value: the render alone decides). Rendered-live fields stay empty until the check reads the built page (FR-48-76).
4. **Wire Fill**: each target's property set is `PROPS` plus its declared properties. A used-value property (height, the grid tracks, insets) is written only from a declared plain value, as width is. A declared property the block's calibration does not read, or no setting holds, becomes a named row with the equivalence verdict (step 5), never a silent drop. The surface report carries a confirm record per written value.
5. **Equivalence** (three read-only audits, 2026-10-19, one per property family: `.claude/reports/2026-10-19-css-equivalence-audit.md` and `.json`): per property, where each draft uses it, what it does, and what in SGS produces the same result (a block's default stylesheet, a setting under another name, the motion model, the theme). Outcomes: a property blocks already apply by default is added to calibration's read list (then a recalibration), so the baseline knows it and no row is raised; a setting under another name becomes a resolver mapping held in the framework DB (FP-1), not a code list; a genuine gap is a named control to build, recorded in the owning block spec.
6. **Tests and proof**: MUST FAIL tests for each rule (declared enumeration, each tolerance, each verdict, the used-value guard); FR-48-8's done-when on an Indus surface: a confirm record for every written value; a planted code value that differs from its render is reported and the rendered value written; a planted draft defect is built from the code and listed; each case fails with its check removed. Then the draft reading wave's CSS-group coverage entries resolve (recognise `lib/fill-declared.mjs`, write `lib/fill-prop.mjs#resolveProperty`, check `lib/fill-confirm.mjs`).

## Progress (2026-10-19)
- [x] Steps 1 to 4 and the step 6 tests (`scripts/computed-route/lib/fill-declared.mjs`, `lib/fill-confirm.mjs`, `tests/fill-declared.test.mjs`; 14 of 14 mutations red; 1,491 route tests pass).
- [x] A session council's findings fixed (`115c15dbc`): used-value properties already on Fill's list (`top`, `left`) take the declared value; a property declared at one width is read at every read width; layered `!important`; `var()` shorthands; agreeing values no longer called disagreements; a record for every write.
- [x] Step 5's audit: `.claude/reports/2026-10-19-css-equivalence-audit.md` (and `.json`): of 86 properties, 18 a block default, 20 a setting under another name, 4 the motion model, 3 the theme, 20 unused or prototype plumbing, 15 partial, 6 missing.
- [ ] Step 5's outcomes: calibration reads the properties blocks apply by default (`scripts/computed-route/lib/calibrate-props.mjs::CAL_EXTRA_PROPS`, then a recalibration per client test site); the settings under other names become resolver mappings in the framework DB; the real control gaps are settled (2026-10-19): Bean's five tests (draft truth, right block, already built, composition, universal fix) cut the candidates to 12, each an FR marked not built in its owning spec (Spec 01 FR-1-1, Spec 02 FR-2-1 to FR-2-5, Spec 04 FR-4-1 and FR-4-2, Spec 32 FR-32-23 to FR-32-26) and designed in `.claude/plans/2026-10-19-control-gaps-build.md`, built in one fresh session before any draft goes live (Bean).
- [ ] Step 6's Indus surface proof (with Indus step 20), and the CSS-group coverage entries.

## Estimates (smallest plausible)
Steps 1 to 3: 1 hour. Step 4: 45 minutes. Step 5: the audits plus Bean's review of the table, then 1 hour of mapping. Step 6: 45 minutes.

## Open
- The equivalence table goes to Bean before any mapping is written (his ruling on "no setting", 2026-10-19).
