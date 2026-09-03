# Visual diff — sgs/product-faq — 2026-09-03

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/product-faq`'s `textColour`.

## What changed

`textColour` gained a gradient sibling and a gradient-capable paint path, following the
CURRENT `sgs/counter` `labelColour`/`labelColourGradient` pattern (commit `305f9170c`).

Four changes:

| File | Change |
|---|---|
| `block.json` | new `textColourGradient` string attr; the `box` element's `attrMap` gains `"css:background-image": "textColourGradient"` |
| `render.php` | text colour moved OFF `wp_style_engine_get_styles()`'s `color.text` input (which cannot express a gradient string) and onto its own scoped rule: `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `edit.js` | the `text` row gains `gradientCapable: true` + `gradientValue`/`onGradientChange`; the canvas preview (`buildWrapperStyle()`, which previously set `wrapperStyle.color` directly from a hand-rolled `/^#|^rgb|^hsl/` test) was swapped to `resolveTextColourPreviewStyle( textColour, textColourGradient, resolver )` so the editor canvas can show the gradient case, not just the flat one |

This block DID have an existing canvas colour preview (`sgs/form-step` and `sgs/media` did
not), so this is the one report in this batch of four where the preview-swap step actually
applied.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/product-faq.text` moves off `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. `sgs/product-faq` still reports exactly 2 rows.
3. `resolveTextColourPreviewStyle` is imported from `../../utils` (already re-exported there via `export * from './tokens'`) rather than duplicated.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | verdict moves | **PASS** — now `AUTOFIXABLE:wire-state-emitter` |
| 2 | row count holds at 2 | **PASS** |
| 3 | shared import, no duplication | **PASS** |

`php -l src/blocks/product-faq/render.php` — clean, no syntax errors.

⭐ Assertion 1 is the meaningful one: `survey.js` itself was not touched, so a refusal turning
into `AUTOFIXABLE` is an honest signal that the paint path now exists.

⚠ **Tree-wide numbers are not comparable across this dispatch.** The full survey moved from
252→253 rows and REFUSED-count 103→89 over the course of this session — far more than the 4
rows this dispatch fixed, because concurrent sibling tracks were active in the same worktree
(anti-collision note in the dispatch brief named `buybox`, `gallery`, `info-box`, `post-grid`,
`testimonial`, plus three other parallel text-colour-gradient tracks running alongside this
one). This report's per-block before/after (row 1) is the only comparison attributable to this
specific edit.

## What is NOT verified — stated, not buried

**No live capture was taken.** No deploy was attempted from this dispatched session (out of
scope — no build, no gate run, no git commands). So this report carries **census and static
evidence only**. Specifically unproven:

- that a gradient set on the text actually paints on the real page;
- that the `@supports` companion behaves correctly in a browser lacking `background-clip:text`;
- that the editor canvas preview genuinely shows the gradient (the code path mirrors
  `sgs/counter`'s proven wiring, but was not opened in an editor for this report).

Pay this debt with a computed-style probe on the FAQ section text once the tree is clean and a
canary deploy is available.
