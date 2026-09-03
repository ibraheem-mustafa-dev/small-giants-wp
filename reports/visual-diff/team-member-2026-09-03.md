# Visual diff — sgs/team-member — 2026-09-03

verdict: PARTIAL — static and census evidence PASS; live capture NOT RUN
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture blocked, see "What is NOT verified")

Covers the text-colour gradient rollout reaching `sgs/team-member`'s `nameColour` and
`roleColour` rows.

## What changed

`nameColour` and `roleColour` each gained a gradient sibling attribute and a
gradient-capable paint path.

| File | Change |
|---|---|
| `block.json` | new `nameColourGradient`/`roleColourGradient` string attrs; `name`/`role` elements gain `attrMap` `"css:background-image": "{attr}Gradient"` |
| `render.php` | the flat `if ($name_colour/$role_colour){...color:...}` lines replaced with `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`, scoped to `$root_sel . ' .sgs-team-member__name'` / `__role` |
| `edit.js` | both rows gain `gradientCapable: true` + `gradientValue`/`onGradientChange`; the `<RichText>` inline preview styles for name/role swapped to `resolveTextColourPreviewStyle( flat, gradient, colourVar )` (the import was already present in this file, used elsewhere) |

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/team-member.nameColour` and `.roleColour` moves off
   `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. The survey total holds at 252.
3. `php -l` is clean on `render.php`.
4. `block.json` remains valid JSON; `edit.js` parses.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | nameColour/roleColour verdicts move | **PASS** — both now `AUTOFIXABLE:helper-at-existing-selector` |
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

- that a gradient set on the name/role colour actually paints on the real page;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the editor canvas preview matches the rendered result.

Pay this debt with a computed-style probe on the name/role elements — before and after,
with a negative control instance carrying no gradient — once the tree is clean and a
deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
`uploads/sgs-css/<hash>.css`, so a source grep proves nothing about what painted.

## Also today: 37-media-no-handroll object-fit migration (separate track, second report section)

A different, unrelated change also landed on this block today: the photo's `object-fit` was
migrated onto the shared media-atom system. The first version bridged onto a NEW unprefixed
attribute, which caused a real bug — a duplicate, dead "Object fit" dropdown sitting next to
the legacy image-controls extension's own "Object fit" control, PLUS a live double-emission
risk (the legacy `sgs_media_position_css()` call could still paint a literal `object-fit`
declaration from any pre-existing `sgsObjectFit` value on the same selector the atom also
paints, for any team-member instance saved before this fix). Caught by `/qc-council`'s
regression-hunt rater and corrected same session: the atom now bridges onto the SAME
`sgsObjectFit` attribute (prefix `"sgs"`, no new control), and `render.php` clears
`sgsObjectFit` before calling `sgs_media_position_css()` so only `object-position` emits from
that legacy path — mirroring `sgs/gallery`'s identical fix for the identical dual-mechanism
shape. Covers commit `c1a395ec5`, deployed at `7de8f0ff8`.

**Assertion:** the live canary serves the correct fallback CSS for the photo, only ONE "Object
fit" control exists in the inspector, and the legacy position-css call no longer emits a
competing literal `object-fit` declaration.

**Live result:** the compiled frontend stylesheet (`build/blocks/team-member/style-index.css`)
contains zero literal `object-fit` declarations. The shared atom stylesheet
(`assets/css/media-atoms/object-fit.css`, compiled into the live `media-element.css` bundle,
`?ver=1788429270`) is confirmed live and serving the `cover` fallback. Editor-side duplicate-
control removal (`MediaElementPanel` import + mount deleted from `edit.js`) confirmed via
`git diff` — no live editor-canvas capture was taken (no populated team-member instance found
on the canary to open in the block editor), so the "only one control visible" claim rests on
the code diff, not a screenshot; flagged honestly rather than asserted as fully proven.

verdict: PASS (code-level fix confirmed; editor-canvas screenshot not captured — see above)
intent_capture_passed: true
source_sha: ecf70c835f487f45
