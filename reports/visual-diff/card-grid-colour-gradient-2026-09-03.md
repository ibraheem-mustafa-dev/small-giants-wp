# Visual diff — sgs/card-grid — colour gradient rollout — 2026-09-03

This report covers ONLY today's colour-gradient rollout (`titleColour`/`subtitleColour`).
It does NOT supersede `card-grid-2026-09-03.md`, which documents a separate track (today's
Shape-B border migration, commit `3f05435ad`) and carries its own PASS with a real
post-deploy capture — that file was NOT touched by this work.

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/card-grid`'s `titleColour` and
`subtitleColour` rows (Task: give a gradient-capable text-colour paint path to the 8
heaviest-group rows, per `survey.js`).

## What changed

`titleColour` and `subtitleColour` each gained a gradient sibling attribute and a
gradient-capable paint path — the same pattern as `sgs/counter`'s `numberColour`/
`labelColour` (commit `305f9170c`).

| File | Change |
|---|---|
| `block.json` | new `titleColourGradient`/`subtitleColourGradient` string attrs; `title`/`subtitle` elements each gain `attrMap` `"css:background-image": "{attr}Gradient"` |
| `render.php` | the flat `if ($title_colour){...color:...}` blocks replaced with `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`, scoped to `.{uid} .sgs-card-grid__title` / `__subtitle` |
| `edit.js` | both rows gain `gradientCapable: true` + `gradientValue`/`onGradientChange`; canvas preview styles (`titleStyle`/`subtitleStyle`) swapped to `resolveTextColourPreviewStyle( flat, gradient, colourVar )` |

## Refused — out of scope, not attempted

The third target row, `card-text` (attr `textColourHover`), was **left REFUSED on
purpose**. It is a hover-only colour (no resting `textColour` attribute exists on this
block) applied at the whole-card level — `sgs_emit_state_colour_css()` sets `color:` on
`.sgs-card-grid__item:hover`, which is the CARD container, not a single owned text
element. The card holds multiple text children (title, subtitle, badge). Painting a text
gradient there means `background-clip:text` + `color:transparent` on the item itself,
which cascades `color:transparent` to every descendant — since none of the direct text of
`.item` is itself a text node (all text lives in child elements), the visible effect is
unpredictable and diverges from the clean single-element pattern used everywhere else.
Per the task's own stop condition ("if no element clearly owns a row, STOP and report"),
this row was refused rather than guessed at.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/card-grid.title` and `.subtitle` moves off
   `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. `sgs/card-grid.card-text` stays REFUSED (deliberately untouched).
3. The survey total holds at 252 across the whole tree.
4. `php -l` is clean on `render.php`.
5. `block.json` remains valid JSON.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | title/subtitle verdicts move | **PASS** — both now `AUTOFIXABLE:helper-at-existing-selector` |
| 2 | card-text stays refused | **PASS** — still `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found` |
| 3 | total holds | **PASS** — 252 before and after (measured tree-wide, alongside sibling agents' concurrent work on other blocks) |
| 4 | php -l clean | **PASS** — `No syntax errors detected` |
| 5 | block.json valid | **PASS** |

`npm run gate:fast` / `npm run build` were NOT run by this agent, per the coordinator's
instruction that the coordinator runs gates centrally.

## What is NOT verified — stated, not buried

**No live capture was taken and no build/deploy was run.** This agent was explicitly told
not to run `npm run build`, `npm run gate:fast`, or any git command, and not to deploy —
the coordinator runs gates once, centrally, across all sibling agents' concurrent work in
this shared worktree.

So this report carries **census (survey.js) and static (`php -l`, JSON validity) evidence
only**. Specifically unproven:

- that a gradient set on the title/subtitle actually paints on the real page;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the editor canvas preview matches the rendered result.

Pay this debt with a computed-style probe on the title/subtitle elements — before and
after, with a negative control instance carrying no gradient — once the tree is clean and
a deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
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
