# Cluster A text-gradient batch — 9 rows, 4 blocks

**Written 2026-09-03.** Scope derived from `scripts/colour-codemod/classify-gradient-path-deferred.js`
(Cluster A = colour painted by direct concat into a CSS declaration), then narrowed by the
background-precondition check below.

## Global Constraints (bind every task)

1. **The recipe is already shipped and in production across 32 blocks** — use the existing helpers,
   do not invent a mechanism:
   `sgs_resolve_text_colour_or_gradient( $flat, $gradient )` picks the gradient when valid;
   `sgs_text_colour_decl( $value )` emits `color:X` for a flat colour, or
   `background-image:X;-webkit-background-clip:text;background-clip:text;color:transparent` for a gradient;
   `sgs_text_colour_gradient_fallback_rule( $selector, $value )` emits the MANDATORY
   `@supports not ((background-clip:text))` fallback.
2. **`sgs_text_colour_gradient_fallback_rule()` is not optional.** Omit it and a gradient degrades to
   invisible text on any browser lacking `background-clip:text`. Always emitted alongside the decl.
3. **Precondition, already verified per row below:** the element must NOT also paint a background on
   the same selector. `background-clip:text` clips the element's whole background painting area to the
   glyph shapes. Rows failing this are OUT OF SCOPE and listed as excluded — do not "fix" one.
4. **Attribute naming:** the gradient sibling is `{attr}Gradient` (e.g. `titleColour` ->
   `titleColourGradient`), a plain `string` attribute defaulting to `''`, declared next to its flat
   sibling. Two sibling attributes, never a shared slot.
5. **Editor control:** the existing `SgsColourPanel` / `DesignTokenPicker` row for the flat attribute
   gains `gradientCapable: true` plus `gradientValue` / `onGradientChange` wired to the new attribute.
6. **No version bumps and no deprecations** — this framework is pre-production (Bean, D293).
7. **UK English** in all code, comments and strings. Comments describe current behaviour only; no
   "used to be" / "RETIRED" narration.
8. **Verify with the CSS-effect harness, not by eye:**
   `node scripts/qa/assert-css-effect.js --slug sgs/<block> --attrs '{"<attr>Gradient":"linear-gradient(90deg,#f00,#00f)"}' --expect '[{"selectorContains":"<sel>","property":"background-clip","value":"text"}]'`
   A true claim must PASS and a deliberately false claim must FAIL. Both are required evidence.
9. **`php -l` clean** on every touched file.

## Excluded, with reason (do NOT touch in this batch)

Blocked by constraint 3 — element paints a background on the same selector, so it needs the
`sgs_block_background_layer_css()` `::after` treatment FIRST:
  modal.closeColourText, nav-menu.itemColour, nav-menu.navColour, pricing-table.ctaColour,
  pricing-table.popularBadgeColour, product-card.ctaColourText, quote.textColourHover

Not declared in `supports.sgs.elements`, so the precondition could not be established mechanically;
each needs an individual read before it can be scoped:
  form.submitColour, modal.triggerColour, nav-menu.burgerColour, option-picker.labelColour,
  post-grid.textColourHover, product-card.tagTextColour

## Task 1 — sgs/testimonial (5 rows)

Attributes: `summaryColour` (render.php:127, painted :291), `nameColour` (:128, painted :355),
`roleColour` (:132, painted :367), `orgColour` (:133, painted :373), `ratingColour` (:134, painted :282).
Elements (all verified clear of a same-selector background): summary, reviewer-name, reviewer-role,
org-name, rating. This block paints through a local `$sgs_el_rule( '.sgs-testimonial__x', array( 'color' => $v ) )`
closure — read it first; the gradient path must not be forced through a closure that only accepts a
flat declaration map.

## Task 2 — sgs/pricing-table (2 rows)

Attributes: `titleColour` (render.php:53, painted :515 onto a COMMA-JOINED pair
`.sgs-pricing-table__name,.sgs-pricing-table__title`), `featureColour` (:58, painted :502).
Elements: title, feature — both clear. Note the comma-joined selector on titleColour: the
`@supports` fallback rule must cover the same selector list, not just the first member.

## Task 3 — sgs/quote (1 row)

Attribute: `attributionColour` (render.php:84, painted :225 via `$attrib_decls[] = 'color:' . sgs_colour_value(...)`).
Element: attribution — clear. `quote.textColourHover` on the `box` element is EXCLUDED (background).

## Task 4 — sgs/brand-strip (1 row)

Attribute: `nameColour` (render.php:62, painted :436 onto `{$root_sel} .sgs-brand-strip__name`).
Element: caption — clear.
