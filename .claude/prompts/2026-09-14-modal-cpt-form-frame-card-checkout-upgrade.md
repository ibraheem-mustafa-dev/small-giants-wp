Invoke `/autopilot` before anything else.

Read `.claude/reports/2026-09-14-eye-care-draft-exceptions-agreed.md` in full before starting —
it holds the grounding this whole brief rests on: the Ward End Eye Care draft audit, the CPT
inventory, the `sgs/form` wizard findings, and the decisions already agreed with Bean. Don't
re-derive any of it.

**This prompt is for a session running in parallel with the universal-pipeline upgrade** (the
`sc-for`/`sc-if` recognition + draft-only render-and-measure work is a separate, currently
active session — don't touch that surface, it doesn't overlap with anything below).

Five independent tasks. They don't depend on each other or on the pipeline work above.

## Task 1 — give `sgs/modal` a CPT, so one modal serves every page that opens it

Today `sgs/modal` holds its content inline, once per instance. Build it the same shape as
`sgs_header`/`sgs_footer`/`sgs_drawer`/`sgs_mega_menu` (all real CPTs — see
`plugins/sgs-blocks/includes/class-sgs-block-cpts.php` and
`plugins/sgs-blocks/includes/class-sgs-mega-menu-cpt.php` for the pattern to mirror): a
`sgs_modal` post type, its own admin edit screen, and a trigger block that PICKS which modal
post to open.

Use the nav-drawer's per-trigger picker as your precedent, not the header/footer singleton
"Active" pointer. A site holds several distinct modals at once (size guide, lens flow, terms,
FAQ popup) — each trigger needs its own post-ID attribute naming which modal it opens, the
same shape as the drawer's `drawerRef` picker.

Done means: an operator builds one modal once, then any block on any page can open it by
reference — no content duplication, no rebuilding per page.

## Task 2 — confirm the form-step hidden-field submission gap, then close it if real

`form/view.js::updateStepVisibility()` hides inactive steps with the CSS class
`sgs-form-step--hidden`, not the `disabled` attribute. Read `form/style.css` (or wherever
`sgs-form`'s stylesheet actually lives) and confirm whether that class sets `display:none`.

If it does: the browser already excludes those fields from `FormData` — no bug, note it and
move on.

If it doesn't (e.g. only `visibility:hidden` or `opacity:0`): fields in unseen steps still
submit. Fix it so `sgs-form-step--hidden` sets `display:none`, then verify live — submit a
multi-step form partway through and confirm the payload only carries the active step's fields.

## Task 3 — brainstorm the real gap between `sgs/form` and the lens flow, and whether `sgs/form` should become CPT-backed

Invoke `/brainstorming` (design mode) for this task specifically — don't skip straight to
building.

`sgs/form` + `sgs/form-step` is a genuine multi-step wizard already: per-step validation, a
progress bar, `nextStep`/`prevStep`/`goToStep` navigation, session-persisted step state.
`sgs/form-field-tiles` gives icon/image option-picking. The one confirmed missing piece: no
running-total/price computation exists anywhere in the form ecosystem.

Don't assume price computation is the ONLY gap — that's the one gap already found, not a
ceiling. Read the lens configurator's real requirements from
`sites/eye-care-ward-end/design_handoff_ward_end_eye_care/README.md` section 6 and the actual
JS in `Eye Care Birmingham.dc.html` (the `lens` state object, `renderVals()`), then compare
field-by-field, screen-by-screen against what `sgs/form`'s block family actually offers today.
Surface every gap — visual and functional — not just the total.

**Second question for this same brainstorm, raised by Bean:** should `sgs/form` become
CPT-backed — form definition, presets and settings stored in a CPT post, referenced by ID
from wherever it's embedded, the same shape as `sgs_modal` (Task 1) and the existing header/
footer/drawer/mega-menu family? This matches how established form plugins work (Gravity
Forms, WPForms, Ninja Forms all store the form definition separately from its embed point).
Research other form plugins' and themes' preset structures, and real UX-best-practice sources
for form structure per use case (contact, booking, multi-step configurator), before proposing
a preset set — don't invent one from scratch.

## Task 4 — close the gap between `sgs/product-card` and the Frame Card component

An earlier same-day audit found `sgs/product-card` is missing fields the Frame Card component
needs: swatch row, rating/review count, brand wordmark overlay, saving badge, colour-swatch
picker. Read `plugins/sgs-blocks/src/blocks/product-card/block.json` for the current attribute
set, and `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/README.md`'s "Frame Card
component" section plus `Frame Card.dc.html` for the target shape.

Add the missing fields to `sgs/product-card` directly — don't build a second block. Ship the
Frame Card look and Mama's Munches' current look as two named style variations of the SAME
block, both driven by the same underlying data.

## Task 5 — replace WooCommerce's default cart, checkout and order-confirmation pages with SGS templates

`theme/sgs-theme/templates/` has `single-product.html` and `archive-product.html` (Spec 30),
each decomposed into named parts. There is no `cart.html`, `checkout.html`, or an order-
confirmation template — those three pages still render through WooCommerce's own default
markup, unstyled by this framework.

Build all three the same way Spec 30 built the product templates: real Site-Editor-editable
`.html` templates, decomposed into template parts, so a future WooCommerce update reconciles
one part at a time instead of a whole-file diff.

---

## Skills to invoke

| Skill | When |
|---|---|
| `/brainstorming` | Task 3 explicitly, and before any other design choice a task above leaves open |
| `/gap-analysis` | Grade Task 4's finished block against the Frame Card + Mama's Munches targets before calling it done |
| `/strategic-plan` | Once each task's design is settled, before writing code |
| `/wp-block-development` | Tasks 1 and 4 (new CPT + block.json/render.php work) |
| `/sgs-wp-engine` | All five tasks — the framework skill |

## Guardrails

- Commit straight to `main`, exact pathspec, never `git add -A`. Integrate with `origin/main`
  after each completed task, not at session end — this is a shared worktree.
- `/qc-council` before committing any change to the converter/pipeline surface; a plain
  `/qc-inline` pass is enough for block-only work.
- Read `.claude/STOP-CATALOGUE.md` and `.claude/LEDGER.md` at session start regardless of this
  brief — they carry structural defences this prompt doesn't repeat.
- **Do not touch `stage1_boundary_hook.py`, `lingua_franca.py`, `per-section-convention-voter.py`,
  or `computed-parity.js`** — those are the active pipeline-upgrade session's files.
