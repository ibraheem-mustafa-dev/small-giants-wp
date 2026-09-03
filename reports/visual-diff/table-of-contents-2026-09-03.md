# Visual diff — sgs/table-of-contents — 2026-09-03

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/table-of-contents`'s `linkColour`
and `titleColour` rows.

## What changed

`linkColour` and `titleColour` each gained a gradient sibling attribute and a
gradient-capable paint path.

| File | Change |
|---|---|
| `block.json` | new `titleColourGradient`/`linkColourGradient`/`activeLinkColourGradient` string attrs; `title`/`link` elements gain `attrMap` `"css:background-image"` entries (`link`'s `states.current.attrMap` also gains one, for `activeLinkColourGradient`) |
| `render.php` | the flat `if ($title_colour/$link_colour/$active_colour){...color:...}` lines replaced with `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()` |
| `edit.js` | the `linkColour` row (which pairs `linkColour` normal with `activeLinkColour` current, one shared SgsColourPanel row) gains `gradientCapable: true` on both states; `titleColour` row likewise; canvas previews swapped to `resolveTextColourPreviewStyle()` |

## A scope note worth reading before touching this block again

The task named only `linkColour` as a target row. But `linkColour` and `activeLinkColour`
(scroll-spy's CURRENT-item colour, FR-35-5) share ONE `SgsColourPanel` row with two
states — `GradientCapableColourControl` renders ONE control per row, applying
`gradientCapable` uniformly to every state in it. Giving only the `normal` state a
`gradientValue`/`onGradientChange` pair would leave the `current` state's popover with no
`onGradientChange` handler — one click of its Gradient toggle away from a `TypeError`
crash (`state.onGradientChange` undefined).

A first attempt split the row into two separate `SgsColourPanel` row objects to sidestep
this. That was reverted: `survey.js` counts one row per row object, so the split
silently changed the tree-wide total from 252 to 253. The correct fix — and the one
shipped — mirrors `sgs/hero`'s text row (normal+hover, both already gradient-capable):
give BOTH states their own gradient sibling attribute (`activeLinkColourGradient` is new,
alongside the targeted `linkColourGradient`) and keep the row as ONE object with two
states. This is a small addition beyond the literal task list, but it is the only way to
make the targeted `linkColour` row safe without either crashing or changing the survey's
row count.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/table-of-contents.linkColour` and `.titleColour` moves
   off `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. The survey total holds at 252 (no row split, no row lost).
3. `php -l` is clean on `render.php`.
4. `block.json` remains valid JSON; `edit.js` parses (verified via `@babel/core`
   `parseSync` with the React preset).

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | linkColour/titleColour verdicts move | **PASS** — `linkColour` now `CONFORMANT` (the merged normal+current row satisfies the detector fully), `titleColour` now `AUTOFIXABLE:wire-state-emitter` |
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

- that a gradient set on the link/title/active-link colour actually paints on the real
  page;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the editor canvas preview (including the active-link preview, which now resolves
  `activeLinkColour || linkColour` colour/gradient) matches the rendered result.

Pay this debt with a computed-style probe on the link/title elements — before and after,
with a negative control instance carrying no gradient — once the tree is clean and a
deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
`uploads/sgs-css/<hash>.css`, so a source grep proves nothing about what painted.
