# Design gate — root-level CSS `filter` capability for SGS blocks

**Status:** PRE-BUILD. Nothing written. Rule 7 design gate, council-reviewed before any code.
**Date:** 2026-08-28

## The end-goal (success definition)

Per CLAUDE.md: the cloning pipeline must CONVERT any SGS-BEM draft into native SGS blocks,
**faithful to the draft**, with no silent drops (Rule 4: every draft class's CSS transfers,
OR is reported as skipped-with-reason).

Bean's explicit steer, 2026-08-28: *"I don't want drafts to be solely tied down to our current
functionality, I want to be able to expand our functionality by matching the draft's code and
this will do the opposite if we limit to conventions only."*

So: when a draft does something our blocks cannot express, the correct response is to EXPAND
the block's capability, not to narrow what drafts may do.

## The triggering case

A committed test (`converter/tests/test_state_value_lift.py::test_card_grid_hover_grayscale_lifts_as_boolean`,
added by `f8a4388e8`) drafts:

    .sgs-card-grid:hover { filter: grayscale(1) }     <- filter on the block ROOT

and asserts it lifts to `grayscaleHover: true` on `sgs/card-grid`.

That test currently FAILS. It failed because uncommitted work declared `grayscaleHover` on
card-grid's `image` element (`states.hover.attrMap { "css:filter": "grayscaleHover" }`).

**That declaration is TRUE.** `card-grid/style.css:274` applies
`.sgs-card-grid.sgs-has-grayscale .sgs-card-grid__image { filter: grayscale(100%) }` — the
attribute toggles a class on the root, but the filter paints on the IMAGE.

**So the old passing behaviour was a MIS-ROUTE, not fidelity.** A draft asking for the whole
card to grey (text, borders, background) was lifted into an attribute that greys only images.
Different rendering, reported as success. Restoring that fallback re-creates a silent wrong
value ("a wrong value is worse than a NULL" — a wrong value reads as authoritative).

Bean's decision: do NOT restore the fallback and do NOT narrow the test. **Close the gap** —
give blocks a real root-level filter capability so the draft transfers faithfully.

## Ground truth (measured 2026-08-28, not assumed)

**No root-level filter capability exists anywhere.** All four `filter` attrs in the DB are
`grayscaleHover`, all hover-state, all image-bound:

    sgs/card-grid    grayscaleHover  css_element=image   state=hover
    sgs/gallery      grayscaleHover  css_element=image   state=hover
    sgs/team-member  grayscaleHover  css_element=image   state=hover
    sgs/info-box     grayscaleHover  css_element=NULL    state=hover   (targets a bare `img`,
                                                                        hence unclassified)

**Vocabulary precedent:** `property_suffixes` models filter FUNCTIONS as distinct properties —
one row exists: `css_property = "filter: blur()"`, `suffix = "Blur"`. There is no
`filter: grayscale()` row. Bare `filter` is what the four rows above use.

**⛔ The obvious owner is disqualified.** `src/blocks/extensions/hover-effects.js` is the
universal hover-control extension (hover colour, scale, shadow, image zoom, grayscale) and
looks like the natural home. It is NOT available:
  - `decisions.md:10074` — "`hover-effects` ... disconnected from blocks and become opt-in ...
    ⛔ STOP REPAIRING THEM — effort there entrenches a mechanism being removed."
  - `decisions.md:10078` — "⛔ Do NOT re-fix remaining hover-effects gaps — superseded."
  - `decisions.md:10076` — ZERO stored hover attributes across 194 canary pages
    (positive control: 1,706 `wp:sgs/*` openings parsed). Nobody uses it.
  - BUT it is not deleted: `hoverExcludeControls` is present in the shipped
    `build/extensions/index.js`, and `includes/hover-effects.php:37` still registers
    `add_filter('render_block', 'inject_hover_effects')`. It is deprecating IN PLACE while
    still executing on every render.
  - Existing design fact worth weighing: D808 already treats grayscale as image-bound —
    `pricing-table`, `google-reviews`, `whatsapp-cta` declare
    `supports.sgs.hoverExcludeControls: ["imageZoom","grayscale"]` because they are
    "root-hover blocks with no image element for those two toggles to bind to."

**The live successor mechanism:** manifest-declared states —
`block.json supports.sgs.elements.<el>.states.hover.attrMap` — used by **30 blocks**. This is
what the held work used, and what the converter's routing reads via `css_element`/`css_state`.

## The design question for the council

When a draft puts `filter: <fn>()` on a block ROOT (resting or hover), how should the framework
carry it faithfully — without (a) building on the deprecating hover-effects mechanism,
(b) creating a per-block carve-out that violates R-31-9 "universal, no carve-outs", or
(c) silently mis-routing a root declaration onto a child element?

Candidate shapes (the council should attack these AND propose better):

**Shape A — new root-scoped attribute per block, declared in the manifest.**
Add e.g. `filterHover` / `filter` to the block's wrapper element attrMap
(`css:filter` on the `grid`/wrapper element), rendered block-private. Small blast radius,
uses the live mechanism. Cost: every block needing it must declare it; 83 blocks could
eventually each need a near-identical declaration.

**Shape B — extend the vocabulary to per-function filter properties.**
Add `filter: grayscale()` (suffix `Grayscale`) etc. to `property_suffixes`, mirroring the
existing `filter: blur()` row, so a draft's specific filter function routes to a specific
attribute. Cost: multiplies the property vocabulary per filter function; unclear how
`filter: grayscale(1) blur(2px)` (multiple functions) is represented.

**Shape C — a universal wrapper-level filter capability.**
Give `SGS_Container_Wrapper` (or the element-manifest defaults) a root `filter` capability all
composite blocks inherit, mirroring the composite-mirror rule (D152). Widest reach, but this is
a SHARED WRAPPER change — highest blast radius, Rule 7 + migration-method STOP-9 territory.

**Shape D — report-only.**
Emit a skipped-with-reason gap candidate and build nothing. Rejected by Bean as it does not
expand capability, but included so the council can argue its merits against the others.

## Constraints the design must satisfy

1. R-31-9 universal, no per-block carve-outs.
2. Rule 4 no silent drops — anything not transferred is reported with a reason.
3. "A wrong value is worse than a NULL" — never route a root declaration onto a child.
4. Spec 32 no-inline styling — no inline `style` property declarations; scoped `<style>` only.
5. Must not build on hover-effects (standing STOP above).
6. Client experience: any new capability needs a real block-editor control (a setting that
   requires touching code is not done).
7. The four existing image-bound `grayscaleHover` attrs must keep working unchanged.

## What "done" looks like

The `.sgs-card-grid:hover{filter:grayscale(1)}` draft either clones faithfully (root greys) or
is reported as an explicit gap — never silently greys only the images.
