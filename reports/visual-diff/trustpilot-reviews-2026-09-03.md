# Visual diff — sgs/trustpilot-reviews — 2026-09-03

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/trustpilot-reviews`'s `text`
row (attr `textColour`).

## What changed

`textColour` gained a gradient sibling attribute and a gradient-capable paint path. This
block is a `<ServerSideRender>` block (no hand-built JS canvas preview), so there is no
editor-side preview style to swap — the editor re-renders through PHP on every attribute
change.

| File | Change |
|---|---|
| `block.json` | new `textColourGradient` string attr; the `wrapper` element (root, `isWrapper: true`) gains `attrMap` `"css:background-image": "textColourGradient"` |
| `render.php` | `textColour` previously fed `wp_style_engine_get_styles()`'s `color.text` arg, which cannot emit a `background-clip:text` declaration. Pulled that key out and replaced it with the shared `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` chain, scoped to `$tp_root_sel` and appended directly to `$tp_responsive_css` (same destination the style-engine output already fed) |
| `edit.js` | the `text` row gains `gradientCapable: true` + `gradientValue`/`onGradientChange`; no preview-style change needed (ServerSideRender) |

## A collision that was checked and ruled out

The block's fill mechanism (`backgroundColour`/`backgroundColourGradient`,
`backgroundColourHover`/`backgroundColourHoverGradient`) also emits `background-image` on
the card, via `sgs_fill_states_css()` — a DIFFERENT function from the text-colour path.
Checked: `backgroundColourGradient` is NOT declared in the `wrapper` element's `attrMap`
in `block.json` (it resolves through the fill emitter, not attrMap classification), so
adding `"css:background-image": "textColourGradient"` to that same attrMap does not
collide with an existing key. The two mechanisms write to different CSS declaration sets
(the fill emitter scopes to the card container's own background; the text mechanism scopes
to the text-colour declaration with `background-clip: text` + `color: transparent`) and
cannot both apply their `background-image` to the same rule at once.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/trustpilot-reviews.text` moves off
   `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. The survey total holds at 252.
3. `php -l` is clean on `render.php`.
4. `block.json` remains valid JSON; `edit.js` parses.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | text verdict moves | **PASS** — now `AUTOFIXABLE:wire-state-emitter` |
| 2 | total holds | **PASS** — 252 before and after (measured tree-wide, alongside sibling agents' concurrent work on other blocks) |
| 3 | php -l clean | **PASS** — `No syntax errors detected` |
| 4 | block.json/edit.js parse | **PASS** |

`npm run gate:fast` / `npm run build` were NOT run by this agent, per the coordinator's
instruction that the coordinator runs gates centrally.

## What is NOT verified — stated, not buried

**No live capture was taken and no build/deploy was run.** This agent was explicitly told
not to run `npm run build`, `npm run gate:fast`, or any git command, and not to deploy —
the coordinator runs gates once, centrally, across all sibling agents' concurrent work in
this shared worktree.

So this report carries **census (survey.js) and static (`php -l`, JSON/JS parse) evidence
only**. Specifically unproven:

- that a gradient set on the review text actually paints on the real page;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the ServerSideRender preview genuinely reflects the change (plausible by
  construction — it calls the same render.php — but not independently observed live).

Pay this debt with a computed-style probe on the review-text element — before and after,
with a negative control instance carrying no gradient — once the tree is clean and a
deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
`uploads/sgs-css/<hash>.css`, so a source grep proves nothing about what painted.

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
