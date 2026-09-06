# Visual diff — sgs/product-card — 2026-09-04

verdict: PASS (static gates); live-capture DEFERRED to this session's centralised deploy step
intent_capture_passed: true
source_sha: fc6beb05a0ff1551

## What changed

Phase 3 golden-colour rollout, rule `31-golden-colour-control` "missing-gradient". One
attribute gains a gradient sibling: `tagTextColour` → `tagTextColourGradient` (element `tag`,
selector `.{uid}.sgs-product-card__tag--trial`, the in-body trial tag).

`block.json`: `tagTextColourGradient` string attr added (default `""`, with description);
`attrMap` on the `tag` element gained `"css:background-image": "tagTextColourGradient"` — no
key collision, since this element has no separate fill-gradient attribute for
`tagBackgroundColour` to collide with.

`render.php`: `tagTextColour`/`tagTextColourGradient` now resolve via
`sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → the mandatory
`sgs_text_colour_gradient_fallback_rule()` companion, mirroring `sgs/counter`'s exemplar.
Flat-colour behaviour is unchanged when the gradient sibling is empty.

`edit.js`: the `tagText` row (pushed into the shared `colourRows` array consumed by one
`SgsColourPanel` mount) gained `gradientCapable: true` plus `gradientValue`/`onGradientChange`
on its single state. The canvas preview span for the trial tag now spreads
`resolveTextColourPreviewStyle()` alongside its existing `backgroundColor` style.

## Flag — pre-existing same-selector background paint

`tagTextColour` and `tagBackgroundColour` both paint the SAME selector
(`.{uid}.sgs-product-card__tag--trial`) — background via `sgs_label_box_css_rule()`, text
colour on the line directly below it. This was named in the assignment as pre-verified safe
against `textSharesElementWithBackground()` (`31-golden-colour-control.js:163`), and it is —
that detector only inspects each element's TOP-LEVEL `attrMap` for a `css:color*` member, and
`tagTextColour` resolves via the default `{prefix}Colour` naming convention rather than an
explicit `attrMap` entry, so the detector genuinely can't see the collision.

Functionally, though, the two properties really do share one selector: when an operator sets a
non-empty `tagTextColourGradient`, the emitted `background-image` + `background-clip:text` will
clip the tag's own `background-color` (from `tagBackgroundColour`) to the glyph shapes of the
tag text — the coloured chip background will visually disappear wherever gradient text is used.
Default behaviour (empty gradient) is completely unaffected. `sgs/quote` hit the identical shape
and was pre-fixed for it (D936, background moved onto a `::after` layer) — `sgs/product-card`'s
trial tag has not had that treatment. Flagging this rather than silently shipping a control that
looks fine until an operator actually reaches for the gradient toggle.

## Verification so far

- `node scripts/colour-codemod/survey.js --json`: `tagTextColour` moved from
  `REFUSED:no-gradient-capable-paint-path-found` to `AUTOFIXABLE:helper-at-existing-selector`.
  Total row count held at 262.
- `php -l src/blocks/product-card/render.php` — clean.
- `git diff --stat` scoped to exactly `block.json` / `edit.js` / `render.php` for this block.

## Why intent capture, not before/after

`tagTextColourGradient` is brand new (`default: ""`) — no existing content can have set it, so
a before/after diff shows no difference by construction.

## Risk

Additive for the default (empty-gradient) path. Narrow, real visual risk ONLY when an operator
explicitly sets a gradient on the trial-tag text — see the flag above.

## Gates

`php -l` clean · `survey.js` census verdict moved as expected, total unchanged at 262 ·
build/deploy/live-probe deferred to the session's centralised Step 3.
