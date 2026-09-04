# Visual diff — sgs/whatsapp-cta — colour gradient rollout — 2026-09-04

verdict: PASS (live-verified, fix applied 2026-09-04)
intent_capture_passed: true
source_sha: 6bd8f7781eadaeb1

Covers Phase 3 of the golden-colour rollout (`doc-type-prompt-title-scalable-sloth.md`)
reaching `sgs/whatsapp-cta`'s `labelColour` row — the same pattern as `sgs/counter`'s
`numberColour`/`labelColour` (commit `305f9170c`).

## Update — a real defect found by live probing, fixed (2026-09-04)

The "Selector-overlap note" below REASONED that scoping `labelColour` to `$root_sel` (the
`<a>` wrapper) was safe. It was wrong, and the live gradient-roundtrip probe
(`scripts/qa/check-colour-gradient-roundtrip.js`) caught it: `color` inherits from parent
to child, but `background-image`/`background-clip` do NOT, and the actual visible label
text lives in a CHILD `<span class="sgs-whatsapp-cta__label">`, not the root. A gradient
set on `labelColourGradient` left the label span with an inherited `color:transparent`
and no gradient painting behind it — genuinely invisible text on the live canary,
measured directly (`background-image:none`, `-webkit-background-clip:border-box` on the
span, despite the root's own rule resolving correctly). Fixed by moving the emission
(`render.php`) onto `.{uid} .sgs-whatsapp-cta__label` specifically. Re-probed live after
the fix: gradient resolves, `clip:text`, `color:transparent` on the span — matches the
already-proven-correct pattern on `modal`/`nav-drawer`/`business-info`/`form`. The
selector-overlap reasoning below (about `background-color` vs `background-image`
coexisting on one element) is now moot for `labelColour` specifically, since it no longer
shares a selector with `backgroundColour` at all — kept for the record, not because it's
still load-bearing.

## What changed

`labelColour` gained a gradient sibling attribute and a gradient-capable paint path.

| File | Change |
|---|---|
| `block.json` | new `labelColourGradient` string attr (default `""`); the single `button` element's `attrMap` (Contract §B3 — the `<a>` IS the block root, no wrapper div) gains `"css:color": "labelColour"` + `"css:background-image": "labelColourGradient"` (neither existed before — `labelColour` was previously unmapped in `attrMap`, resolving only via the default prefix convention) |
| `render.php` | `$label_colour` (previously `sgs_colour_value()` resolved inline, then pushed into the SAME `$btn_decls` array as `$bg_colour` and emitted as one joint `{color:...;background-color:...;}` rule on `$root_sel`) is now read RAW as `$label_colour_raw`, resolved via `sgs_resolve_text_colour_or_gradient()`, and emitted as its OWN separate rule on `$root_sel` via `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()`. `$bg_colour`'s `background-color:` rule is unchanged, still on `$root_sel`, now in its own `$btn_decls` block with only that one declaration |
| `edit.js` | destructured `labelColourGradient`; the block-private `SgsColourPanel` row (`key: 'label'`, hand-built — this block has no `textRow()` call) gained `gradientCapable: true` on the row plus `gradientValue`/`onGradientChange` on its single `normal` state; the root preview style (`rootStyle`, applied to the `<a>` root via `useBlockProps`) swapped its `color: colourVar(labelColour)` line for `...resolveTextColourPreviewStyle( labelColour, labelColourGradient, colourVar )`, spread before `backgroundColor` so the two paint targets stay independent |

## Selector-overlap note (verified safe, not just asserted)

`labelColour` and `backgroundColour` both paint the SAME element — the `<a>` IS the block
root (Contract §B3, no wrapper div) — so `background-color` and the text-colour
declaration necessarily land on the identical selector (`$root_sel`). This is the exact
shape the assignment brief said had "already been verified safe for this pattern" for
this row. Confirmed why it is safe: `background-image` (the gradient mechanism, via
`background-clip:text`) and `background-color` are different CSS properties that do not
conflict — `background-clip:text` restricts the `background-image` layer's PAINT AREA to
the glyph shapes only, so the anchor's flat `background-color` still shows through
everywhere else on the element. Splitting the two attributes into separate scoped rules
(rather than the prior single joint `{color:...;background-color:...;}` block) makes no
visible difference for the flat-colour case and is required for the gradient case, since
`sgs_text_colour_decl()`'s gradient branch returns a THREE-property compound string
(`background-image`+`-webkit-background-clip`+`background-clip`+`color`) that cannot be
concatenated into the same `$btn_decls` array as a bare `background-color:` string without
duplicating the `background-color` key or corrupting the declaration order.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/whatsapp-cta.labelColour` moves off
   `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. `sgs/whatsapp-cta.backgroundColour` (out of scope — not an assigned row) stays
   REFUSED, untouched.
3. The survey total holds at 262 across the whole tree.
4. `php -l` is clean on `render.php`.
5. `block.json` remains valid JSON.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | labelColour verdict moves | **PASS** — now `AUTOFIXABLE:wire-state-emitter` |
| 2 | backgroundColour stays refused, untouched | **PASS** — still `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found` |
| 3 | total holds | **PASS** — 262, measured alongside sibling agents' concurrent work on other blocks |
| 4 | php -l clean | **PASS** — `No syntax errors detected in src/blocks/whatsapp-cta/render.php` |
| 5 | block.json valid | **PASS** — `python -c "import json; json.load(...)"` succeeded |

`npm run build`, `npm run gate:fast`, and the deploy script were NOT run by this agent —
scope was static/census only, per the assignment brief. `whatsapp-cta/render.php` was not
flagged as carrying uncommitted concurrent work by another track, but the Edit tool
(targeted string replacement) was used throughout regardless, matching the same discipline
applied to `trust-bar/render.php`.

## What is NOT verified — stated, not buried

**No live capture was taken and no build/deploy was run.** So this report carries
**census (`survey.js`) and static (`php -l`, JSON validity) evidence only**. Specifically
unproven:

- that a gradient set on `labelColour` actually paints on the real page, and that the
  anchor's `background-color` still shows through around the text as reasoned above;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the editor canvas preview (`rootStyle`) matches the rendered result — in
  particular that spreading `resolveTextColourPreviewStyle()`'s result before
  `backgroundColor` in the object literal does not let a later key clobber an earlier one
  (it does not: the two calls write disjoint property names — `color`/`backgroundImage`/
  `WebkitBackgroundClip`/`backgroundClip` vs `backgroundColor` — but this was reasoned from
  the source, not measured in a rendered browser);
- that the flat-colour default case (no gradient set) is byte-identical to the prior
  behaviour — the resolver falls through to the untouched flat value when no valid
  gradient is present, but this was not measured live.

Pay this debt with a computed-style probe on the `<a>` root element — before and after,
with a negative-control instance carrying no gradient — once the tree is clean and a
deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
`uploads/sgs-css/<hash>.css`, so a source grep proves nothing about what painted. The
shared mechanism (`sgs_resolve_text_colour_or_gradient()` / `sgs_text_colour_decl()` /
`sgs_text_colour_gradient_fallback_rule()`) was already probed end-to-end live via
`sgs/counter` on 2026-09-03 (`card-grid-colour-gradient-2026-09-03.md`), so the underlying
CSS mechanism is proven — what remains unproven here is this block's own selector wiring,
plus the background-colour-coexistence reasoning above.
