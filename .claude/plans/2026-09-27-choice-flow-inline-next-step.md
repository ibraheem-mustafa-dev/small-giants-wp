# Choice flow: a question whose chosen option opens its next step underneath

**Status:** PLANNED 2026-09-27. Governing spec: `.claude/specs/43-*.md` (sgs/choice-flow). Closes the lens pop-up's
Q4 gaps in `plans/2026-09-24-eye-care-hand-build-design.md` (Status, parity re-review).
**Verify with:** `node ../../scripts/parity/draft-live-walk.mjs ../../sites/eye-care-ward-end/build/qa/parity/lens.mjs`
from `plugins/sgs-blocks` (exit 0), and `node ../../sites/eye-care-ward-end/build/qa/lens-purchase-268.mjs` still
landing one bag line at £268 with "Options: Distance · Thin · 1.6 · Polarised".

## Why

The draft's last lens question ("Your prescription") is one screen: choosing Send it later, Upload a photo or Type it
in opens that choice's panel under the options (the WhatsApp note, a dashed upload box, the SPH/CYL/AXIS grid), and
the footer reads "Add to bag £418". Live routes each option to its own terminal step, reached with Continue. The
panels already exist as those terminal steps (`sites/eye-care-ward-end/build/gen_lens_configurator.py::result`), so
the gap is where they show, not what they hold.

## The feature (framework, any client)

A `sgs/choice-flow-question` setting **"Open the chosen option's next step underneath"** (attribute
`showNextStepInline`, boolean, default false; control in the question's option-routing panel). When on, in the
flow's `continue` advance mode:

1. Choosing an option (and the default option when the step is reached) shows the option's `nextStepId` step
   directly under the question, and hides any other step it opened before. The question stays shown.
2. The footer follows the opened step: an `add-to-bag` result there shows "Add to bag" with the running total and
   hides Continue (`flow-steps.js::updateFooterActions` reads the opened step instead of the question).
3. Back returns to the previous question as today; progress and the step count stay on the question.
4. Add to bag validates and submits the opened step's fields (the typed prescription's required SPH boxes, the
   upload), exactly as when that step was shown on its own.
5. A saved flow (`flow-persistence.js`) restores the question with its opened step.

The opened step keeps its own look: the result's heading and body read as the draft's bordered note panel
(`.sgs-choice-flow__step--inline`, a class the script adds, styled in `choice-flow/style.css`).

## Files

- `choice-flow-question/block.json` (attribute), its editor panel (control), `render.php` (a data attribute).
- `choice-flow/flow-routing.js` / `flow-options.js` (open the step on selection), `flow-steps.js` (show two steps,
  footer from the opened step, position from the question), `flow-persistence.js` (restore), `style.css`.
- Reseed ceremony for the new attribute (commit; stage-1 reseed from a detached-HEAD worktree; extract-signatures;
  role map and roster regenerated; commit) before the deploy.
- Eye Care: `gen_lens_configurator.py` sets `showNextStepInline=True` on `rx`; the flow is rebuilt with
  `scripts/wp-build-page.js`.
- `lens.mjs`: Q4 pairs (the note panel, the footer button, the Send it later description) anchored to the options,
  a Q4 state per option, review notes for every shot.

## Done when

`lens.mjs` exits 0 with notes for every shot, the purchase check passes, and a typed-prescription add to bag and an
upload add to bag each land one bag line carrying their answers (checked by hand on eye-care-test, then the test
lines removed).
