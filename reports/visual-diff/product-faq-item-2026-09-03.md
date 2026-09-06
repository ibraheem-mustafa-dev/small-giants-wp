# Visual diff — sgs/product-faq-item — 2026-09-03

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/product-faq-item`'s `textColour`.

## What changed

`textColour` gained a gradient sibling and a gradient-capable paint path, following the
CURRENT `sgs/counter` `labelColour`/`labelColourGradient` pattern (commit `305f9170c`).

Four changes:

| File | Change |
|---|---|
| `block.json` | new `textColourGradient` string attr; the `item` element's `attrMap` gains `"css:background-image": "textColourGradient"`. This block's `item` element carries no `text` cluster (documented reason: no typography support declared at all), but that does not block adding the gradient attrMap entry — it sits alongside the existing `css:color` entry under the `fill`/`layout` clusters already declared. |
| `render.php` | text colour moved OFF `wp_style_engine_get_styles()`'s `color.text` input (which cannot express a gradient string) and onto its own scoped rule: `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `edit.js` | the `text` row gains `gradientCapable: true` + `gradientValue`/`onGradientChange`; the canvas preview (`buildWrapperStyle()`, which previously set `wrapperStyle.color` directly from a hand-rolled `/^#|^rgb|^hsl/` test) was swapped to `resolveTextColourPreviewStyle( textColour, textColourGradient, resolver )` |

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/product-faq-item.text` moves off `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. `sgs/product-faq-item` still reports exactly 2 rows.
3. The "no text cluster" documented gap (block.json's own `_note`) is left untouched — this fix only adds a gradient sibling to an already-mapped `css:color` member, it does not add a text cluster or claim to close that gap.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | verdict moves | **PASS** — now `AUTOFIXABLE:wire-state-emitter` |
| 2 | row count holds at 2 | **PASS** |
| 3 | no cluster claim overreach | **PASS** — `_note` extended, not replaced; clusters array (`fill`, `layout`) unchanged |

`php -l src/blocks/product-faq-item/render.php` — clean, no syntax errors.

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

Pay this debt with a computed-style probe on the FAQ item question/answer text once the tree is
clean and a canary deploy is available.

## Live probe — RUN 2026-09-03, canary page 3212

The blocker named above is GONE: the parallel track's deploy (`a47cc502a`) carried this work
(`c2853d258` is an ancestor of it, verified with `git merge-base --is-ancestor`), and the code was
confirmed on the server by three independent greps of the deployed tree.

**Measured on the lifted stylesheet, not on page HTML** (`uploads/sgs-css/sgs-2991-*.css`):

| Assertion | Result |
|---|---|
| Gradient reaches the browser as `background-clip:text` + `color:transparent` | **PASS** |
| The MANDATORY `@supports not ((background-clip:text))` companion is emitted | **PASS** |
| NEGATIVE CONTROL — a second instance with no gradient set gets none | **PASS** (2 counters rendered, exactly 1 `linear-gradient`) |
| Hover emitted inside `@media (hover: hover) and (pointer: fine)` behind `:where(:root:not(.sgs-touch-input))` | **PASS** |
| NEGATIVE CONTROL — an instance with no hover colour gets no guarded block | **PASS** (1 guarded block, not 2) |
| Focus rules stay OUTSIDE the hover guard (keyboard must survive on touch) | **PASS** — 7 focus rules, 0 inside |
| Layer-2 `touch-input.js` enqueued on the page | **PASS** |

⚠ **What this probe does and does not prove.** It exercises the SHARED mechanism end to end on a
real page, using `sgs/counter` for the gradient and `sgs/notice-banner` for the hover guard. Every
block in this rollout routes through those same helpers, so the mechanism is proven for all of them
— but this block's own selector wiring was not individually probed unless it is one of the two
named above. A per-block computed-style check remains the stronger evidence.

⚠ **Residual found BY this probe, and it is larger than what was fixed.** The hover guard covers
PHP-EMITTED hover rules — the client-set colours. It does NOT cover `:hover` written by hand in a
block's own `style.css`: **233 such lines across 40 blocks, none guarded.** Sticky-hover on touch
persists for all of them. Named here rather than left implicit; it needs its own pass.
