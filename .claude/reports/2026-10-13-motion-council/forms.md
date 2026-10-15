# Council rater: form-state family on Spec 38A's `state` trigger (M5.17)

Rater scope: read-only. Evidence gathered 2026-10-13 from the three drafts' `animations.json` and `.dc.html`, the form, form-field-*, form-step, accordion, tabs and choice-flow blocks, `plugins/sgs-blocks/scripts/migrate-motion-support.py`, Spec 38A and the build plan.

## VERDICT: VALIDATED WITH CHANGES

The proposal bundles three different things as one "state family". Two are wrong as written (focus/checked/filled as `state` triggers; extending 23 blocks as a roster change) and one is right and genuinely missing (invalid shake and direction-aware step slide as block-state motion). The smallest correct shape is in section 7.

## 1. Case table (form, accordion, tab and choice-flow motion in the drafts)

Trigger kind: P = pseudo-class a stylesheet can target; B = block state the block's JS must publish.

| Draft | Element | Motion | Kind | Properties and timing | SGS today |
|---|---|---|---|---|---|
| Eye Care | all inputs, selects, buttons (PS-15) | focus outline | P | outline 2px accent, offset 2px, instant | Reproduced: `form/style.css::.sgs-form-field__input:focus-visible`, `.sgs-form__progress-step:focus-visible`, ring tokens |
| Eye Care | lens configurator question card (CA-60 to CA-69, state lens.step) | rise on question change | B (step changed) | opacity 0 to 1, translateY 18px to none, 400ms ease | Partial: `choice-flow/style.css::.sgs-choice-flow .sgs-form-step.is-entering` is opacity plus translateY 8px, 220ms literal, toggled by `choice-flow/view.js::showStepByIndex`. Wrong travel and timing, no control |
| Eye Care | lens progress bar (TR-57) | width per step | B | width, 500ms cubic-bezier(.2,.7,.2,1) | Partial: `choice-flow/style.css` `width 250ms ease-out`, `form/style.css` `width 0.3s ease` literals |
| Eye Care | product tabs content (CA-16 to CA-18) | fade on tab switch | B | opacity 0 to 1, 300ms ease | Partial: `tabs/style.css` panel cross-fade; `tabs/view.js` sets `aria-selected`; `sgs/tabs` already has `supports.sgs.motion`, `tab` states `current` and `hover` |
| Eye Care | product tab buttons (TR-37) | colour, border colour | B (current tab) | per property | Reproduced via tabs `tab` part `current` state; `--sgs-transition-duration: 200ms` literal in `tabs/style.css` |
| Eye Care | product FAQ body and plus icon (CA-19, TR-38) | body fade, plus rotates | B (open) | fade 300ms ease; transform .3s ease | Partial: `accordion/style.css::.sgs-accordion-item[open] .sgs-accordion-item__icon-open--rotates` (timing already `var(--wp--custom--duration--medium, 300ms)`), native `::details-content`, `accordion/view.js` sets `aria-expanded`. FR-38A-53 moves it |
| Eye Care | Help-page FAQ plus (TR-42) | rotate | B (open) | .3s ease | As above |
| Eye Care | checkout contact input, account edit form, "Saved." (CA-70, CA-87, CA-89, CA-90) | fade on conditional mount | B | opacity 0 to 1, ease | Not SGS form blocks: React conditional renders of commerce surfaces |
| Indus | input, select, textarea (TR-084 to 086, TR-110, TR-121, PS-010, PS-011, PS-014) | focus border, 4px glow, background lift | P (:focus) | border-color #0A7EA8, box-shadow 0 0 0 4px rgba(10,126,168,.14) (.18 in the enquiry form), background #FBFCFD to #FFF; 200ms ease | Partial: `form/style.css` `transition: border-color 0.2s, box-shadow 0.2s` (literal) plus a focus ring; no timing control, no background lift |
| Indus | floating label (TR-122, TR-123) | label rises, shrinks | Draft: B (JS state). Native: P (:focus, :placeholder-shown) | top, font-size, colour; 200ms ease | Reproduced: `form/style.css` "Floating Labels (Feature #148)", CSS only; timing literal |
| Indus | selected tile or chip (TR-124) | background, colour, border | B in the draft; P in SGS (`:has(input:checked)`) | 200ms ease | Reproduced: `form/style.css` tiles `:has(input:checked)` with `transition ... 0.2s` literal |
| Indus | trade application step body (A-31) | direction-aware slide | B (step changed, dir +1 / -1) | opacity 0 to 1, translateX(36px x dir) to none, 480ms cubic-bezier(.16,.84,.32,1) | Partial: `form/view.js::updateStepVisibility` re-triggers `sgs-step-enter` (opacity, translateY 8px, 0.2s ease). No direction anywhere (grep for direction, forward, backward in form and choice-flow JS: nothing) |
| Indus | validation shake (A-33 step body, A-35 enquiry card) | shake | B (validation-fail event, repeats per failed submit) | translateX 0, -8, 8, 0 (px), 320ms linear | Missing. No `shake` in `form`, `choice-flow` or `assets/css`. `form/view.js` sets `aria-invalid="true"` (near lines 114 and 227) and it persists, so a CSS animation keyed to it would not replay on a second failed submit |
| Indus | success card (A-32), message-sent card (A-34) | scale-in result | B (done / sent) | A-32 scale .94 + translateY 20px, 700ms cubic-bezier(.34,1.56,.64,1); A-34 scale .96, same curve | Missing for the form success message (`form/style.css::.sgs-form__message--success` has no entrance). `choice-flow-result` has `sgs-choice-flow-panel-in` 0.3s ease literal |
| Indus | scroll to form top on step change (J-17) | scrollY | B | script scroll | Not a style motion; out of scope |
| Indus | form fields in the grid (A-09) | scroll reveal | scroll | translateY 40px scale .96, 480ms-class curve | Entrance panel on the form root; not a state-family concern |
| Mama's | FAQ row (TR-024, TR-072) | background, shadow on open | B (open) | .25s ease | Colours are attributes; timing literal |
| Mama's | FAQ plus (TR-025, TR-073) | rotate with overshoot | B (open) | transform .3s cubic-bezier(.3,1.6,.5,1) | Default easing token today; the overshoot curve needs the shared easing atom (FR-38A-53) |
| Mama's | sign-in / account fields (`aria-invalid="{{ bad.* }}"`) | none attached | B (aria-invalid) | no motion in the draft | `form/style.css` `[aria-invalid="true"]` border and ring already reproduce the look |
| Mama's | global :focus-visible | outline 3px | P | instant | Reproduced by ring tokens |
| All three | `:checked` | none found | P | no `:checked`-keyed transition record in any `animations.json` | SGS already exceeds the drafts (tiles with `:has(input:checked)`) |

Limits: I filtered each `animations.json` by keyword (focus, checked, invalid, step, accordion, tab, form, input) and grepped the `.dc.html` files for aria-invalid, onFocus/onBlur and checkbox inputs. A checkbox or radio animation with no transition record would not appear here.

Reading across the table: the form-state motions in the drafts that SGS lacks are (a) the validation shake, (b) the direction-aware step slide with the draft's travel, duration and curve, (c) the success-card scale-in, and (d) focus glow timing and background lift as controls. No draft has `:checked` or `filled` motion. `filled` is already covered by the CSS floating label.

## 2. What the blocks do today

- `sgs/form` already has `supports.sgs.motion: true` and parts `submit-button`, `prev-button`, `progress-bar` (hover states), `step-label`, `step-number`, `submit-actions`, plus 20 parts marked `"motion": false` (`field-input`, `field-label`, `focus-ring`, `error-text`, `help-text`, `review-heading`, `nav-button` and others). Spec 38A section 6 says a `"motion": false` part names an InnerBlocks child or a run-time element, so the form root cannot target field internals.
- Hard-coded timings in `form/style.css`: `sgs-step-enter 0.2s ease`, progress track 0.3s, inputs 0.2s, tiles 0.2s, file label 0.2s. In `choice-flow/style.css`: 220ms step transition, 250ms progress, `sgs-choice-flow-panel-in 0.3s`, 0.15s fast-token transitions. FR-38A-53's `check-motion-literals.py --check` scans every block CSS and will fail on all of these once built. The proposal must schedule their removal or the gate cannot exit 0.
- `sgs/accordion` and `sgs/tabs` already have `motion: true`. Accordion's parts `header`, `icon`, `answer`, `item` are all `"motion": false` (header already lists `hover` and `open` states); tabs' parts `tab` (`current`, `hover`) and `panel` are targetable.

## 3. Pseudo-class states versus block states

| State | Kind | What publishes it today |
|---|---|---|
| focus | P | `:focus`, `:focus-visible`, `:focus-within`. Spec 5.2 already puts `:focus-visible` and root `:focus-within` in the Hover engine |
| checked | P | `:checked`, used through `:has(input:checked)` in `form/style.css` |
| filled | P | `:placeholder-shown`, used by the floating label |
| invalid (look) | P and B | `:user-invalid` (native) and `aria-invalid="true"` set by `form/view.js`; both CSS-targetable now |
| invalid (shake event) | B, needs a new publish | nothing: it must replay per failed submit, so the block must emit a transient attribute or event that `motion-state.js` restarts on |
| step changed | B | `form/view.js::updateStepVisibility` toggles `sgs-form-step--entering` and `--hidden`; choice-flow toggles `.is-entering`. No direction, no state attribute |
| accordion open | B (native) | `<details open>` plus `aria-expanded` |
| tab switch | B | `aria-selected`; no state attribute named in M4.4 |

## 4. Why the 23 blocks lack the support

Not an oversight. `migrate-motion-support.py` builds the set from `SELECT DISTINCT block_slug FROM block_attributes WHERE attr_name='sgsAnimation'` plus six SPEC_NAMED blocks (nav-bar-menu, nav-drawer, nav-drawer-menu, mega-panel, cart, accordion), minus any block whose `supports.sgs.hideExtensions` includes `animation`. I checked all 23: every one has `hideExtensions` containing `animation` (the 14 form-field-*, form-review and the three choice-flow blocks also hide `clickEffects` and `parallax`; accordion-item, diagram-dimension and notice-message also hide `fx`), and none is in the DB `sgsAnimation` set of 74 blocks (`sgs/form`, `sgs/accordion`, `sgs/tabs` are in it; `sgs/form-step`, `sgs/tab`, `sgs/accordion-item`, `sgs/form-field-text`, `sgs/choice-flow` are not). The exclusion is deliberate: these are inert child markers or field internals whose parent owns the motion.

Extending them is therefore not a roster change only. Three prerequisites:

1. Remove `animation` from each `hideExtensions` and add `"motion": true`. The migrate script reads `hideExtensions`, so it would then include them.
2. Part declarations that resolve. Parts today: form-field-text, email, phone, number, date, file, select, textarea, address: `label, input, help, error`; checkbox and radio: `label, option, help, error`; consent: `consent, help, error`; tiles: `wrapper, inner`; hidden: none (nothing to animate); form-step: `wrapper`; form-review: `heading, intro, list`; choice-flow: `wrapper, info-toggle, back`; choice-flow-question: `question, intro, options`; choice-flow-result: `heading, body`; accordion-item: `wrapper, header, innerBlocks`; tab: `wrapper, innerBlocks`; notice-message: `message, innerBlocks`; diagram-dimension: `label`. None declares a `selector`. Spec 38A section 6 resolves an undeclared part to `.sgs-<slug>__<part>`, i.e. `.sgs-form-field-text__input`, but `form-field-text/render.php` prints `sgs-form-field__input` (one shared class across all field blocks). Every field part would resolve to a class that does not exist, and `check-motion-part-selectors.py` fails on a part that resolves to nothing. All field blocks need explicit `selector` values first. The `innerBlocks` parts lack the `"motion": false` flag the spec requires for InnerBlocks children; resolve at build.
3. Reseed: `seed_motion_fields.py` writes `motion_targets` per block and part, multiplying Motion panel rows across 22 blocks.

Redundancy: the drafts' form motions hit the form root, the step body, the success card and the input focus. Only input focus lives on field blocks. Giving 14 field blocks full Hover, Entrance and Effects panels is panel clutter, and their `hideExtensions` of `clickEffects` and `parallax` were chosen deliberately.

## 5. What Spec 38A and the plan already promise

- Section 5.2 triggers: Entrance panel `load`, `scroll`, `open` (FR-38A-51) and `state` ("a named state the block declares in `supports.sgs.motion.states`", FR-38A-53). Hover panel: `hover` only (pointer hover plus `:focus-visible`; `source: root` reads `:hover` and `:focus-within`).
- FR-38A-53: state-change motion on block-private elements as an `entrance.base` with trigger `state`, from/to values including colour, duration, delay, the shared easing atom, reduced motion honoured. Named examples: cart count pop, burger morph, accordion icon turn. Done-when: those three stored as `sgsMotion`, literals removed, `check-motion-literals.py --check` exits 0. Status: not built.
- M4.4 builds the `state` trigger runtime (`class-sgs-motion-trigger-open-state.php`, `assets/css/motion-triggers.css`, `src/shared/effects/motion-state.js` as a shared `@sgs/` module). M5.17 (wave 16, after M4.4 and M4.6) touches cart, nav-bar-menu and accordion only.
- The `state` trigger is already a general mechanism with a block-declared state list. The proposal needs no new trigger; it needs `states` entries on `sgs/form`, `sgs/form-step`/`sgs/choice-flow` and a publish from their `view.js`.

## 6. Assessment of each element

| Proposed | Verdict | Why |
|---|---|---|
| States focus, checked, filled | Wrong home | Pseudo-classes need no block publish. They belong to the Hover engine as state variants with transition timing, not the Entrance `state` trigger (a one-shot entrance). `filled` needs nothing (`:placeholder-shown`). Build `focus` only, from the Indus evidence; no draft needs `checked` |
| State invalid with a shake preset | Right, with a precondition | Indus A-33 and A-35 are real. The state must be a repeatable event, not persistent `aria-invalid`. The drafts shake the step body or card, not the field, so the form root and step wrapper are the targets |
| State step changed with direction-aware slide | Right, with a precondition | Indus A-31 is real. Both step functions must publish a direction (`data-sgs-dir="forward"` or `"back"`), a new attribute. Eye Care's lens rise is the same state without direction |
| Extend motion to 23 blocks | Mostly unneeded | See section 4. Accordion open and tab switch sit on blocks that already have the support; accordion-item and tab are children of `accordion` and `tabs` |

## 7. Smallest correct shape

1. Block states through the existing M4.4 `state` trigger. Add `supports.sgs.motion.states` to `sgs/form` (`invalid`, `step-changed`, `success`) and `step-changed` to `sgs/choice-flow`; targets are the form root and the step wrapper. Seed presets: `shake` (x 0, -8, 8, 0 px, 320ms, linear), `step-slide` (reads the direction attribute, 36px, 480ms, cubic-bezier(.16,.84,.32,1)) and `result-scale-in`. `form/view.js` and `choice-flow/view.js` publish the state through `@sgs/motion-state` (a per-submit event for `invalid`, `data-sgs-dir` for steps), not by adding classes that block CSS animates.
2. Pseudo-class states through the Hover engine, not M5.17: add `focus` as a state variant (`:focus-visible` plus root `:focus-within`) carrying transition timing. No `filled`; `checked` only when a draft needs it.
3. Field blocks: do not enable all 14. Owner decision between (a) leave `motion: false` and give the form root descendant-selector parts (needs a Spec 38A amendment lifting the InnerBlocks-child restriction for shared-class field internals), and (b) enable only the field blocks that get a focus control, after adding explicit `selector` values.
4. Remove the form and choice-flow hard-coded timings in the same unit, so `check-motion-literals.py --check` passes with them included.
5. Add a plan row after M4.4 and M5.17; M5.17's file list is cart, nav-bar-menu and accordion only.

## 8. Measurable done-when

- On the Indus enquiry form at 1440 and 375, two failed submits in a row each play the shake: Playwright `getAnimations()` on the card shows one 320ms animation per submit, keyframe x values -8px then 8px, two in total; with `prefers-reduced-motion: reduce` it shows 0 and the error text still appears.
- On the trade application, Continue then Back computes `translateX(36px)` then `translateX(-36px)` at animation start, 480ms, `cubic-bezier(.16,.84,.32,1)`, read from the live page (A-31).
- Focus on an input computes `border-color` #0A7EA8, a 4px `rgba(10,126,168,.14)` shadow and #FFFFFF background within 200ms, with values stored in `sgsMotion` and not in `form/style.css`.
- `git grep -nE "(transition|animation)[^;]*[0-9]+(ms|s)" -- plugins/sgs-blocks/src/blocks/form/style.css plugins/sgs-blocks/src/blocks/choice-flow/style.css` finds nothing outside `var()` fallbacks; `check-motion-literals.py --check` exits 0, and a planted `animation: x 0.5s ease` in `form/style.css` exits 1 (negative control).
- If any of the 23 blocks are enabled: `check-motion-part-selectors.py` exits 0, every declared field part resolves to a class present in that block's rendered markup, `motion_field_rows` has rows for it after a reseed, and its `hideExtensions` no longer lists `animation`.
- The Eye Care lens question change computes translateY(18px) to none over 400ms ease (CA-60), not today's 8px over 220ms.

## Residual uncertainty

Not read: the `form-field-*` edit.js files (whether field blocks render a root `Sgs_Motion_Markup::apply` can stamp), `Sgs_Motion_Targets::parts` behaviour for `innerBlocks` parts without `motion: false`, and whether the unbuilt `motion-state.js` can restart an animation on a repeated identical state. Those decide section 7 point 3.
