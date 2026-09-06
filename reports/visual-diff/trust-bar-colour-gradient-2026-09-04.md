# Visual diff — sgs/trust-bar — colour gradient rollout — 2026-09-04

This report covers ONLY today's colour-gradient rollout (`titleColour`/`labelColour`). It
does NOT supersede `trust-bar-2026-09-04.md`, which documents a separate track (Spec 35
Part 4 per-item `image-badge` object-fit control, commit `0fbfb51d2`) and carries its own
PASS with a real live capture — that file was NOT touched by this work (confirmed by
`git diff` before writing this one; an earlier accidental overwrite of that file was caught
and reverted with `git checkout --` before it was ever staged or committed).

verdict: PASS (static gates); live-capture DEFERRED to this session's centralised deploy step
source_sha: 4ce7c40fc62d41de
intent_capture_passed: false
source_sha: not-a-staged-hash (live capture not attempted this pass)

Covers Phase 3 of the golden-colour rollout (`doc-type-prompt-title-scalable-sloth.md`)
reaching `sgs/trust-bar`'s `titleColour` and `labelColour` rows — the same pattern as
`sgs/counter`'s `numberColour`/`labelColour` (commit `305f9170c`).

## What changed

`titleColour` and `labelColour` each gained a gradient sibling attribute and a
gradient-capable paint path.

| File | Change |
|---|---|
| `block.json` | new `titleColourGradient`/`labelColourGradient` string attrs (default `""`); the `title` element gains a NEW `attrMap` (it had none before) with `"css:color": "titleColour"` + `"css:background-image": "titleColourGradient"`; the `badge-label` element's existing `attrMap` gains `"css:background-image": "labelColourGradient"` alongside its existing `"css:color": "labelColour"` |
| `render.php` | the flat `if ($title_colour_val){...color:...}` / `if ($label_colour_val){...color:...}` blocks (previously `sgs_colour_value()` direct) replaced with `sgs_resolve_text_colour_or_gradient()` → `sgs_text_colour_decl()` → `sgs_text_colour_gradient_fallback_rule()`, scoped to the SAME selectors as before (`.{uid} .sgs-trust-bar__title` / `.{uid} .sgs-trust-bar__badge-label`) |
| `edit.js` | destructured `titleColourGradient`/`labelColourGradient`; the existing `textRow({ key: 'title-colour', attrs: { base: 'titleColour' }, ... })` and `textRow({ key: 'label-colour', attrs: { base: 'labelColour' }, ... })` calls each gained `gradient: '{attr}Gradient'` in their `attrs` object — `textRow()` already threads a supplied `gradient` attr into `gradientValue`/`onGradientChange` and sets `gradientCapable: true` automatically (no direct `GradientCapableColourControl` mount needed); canvas preview styles for the title `RichText` and both badge-label `<span>`s (text-only + image-badge variants) swapped to `resolveTextColourPreviewStyle( flat, gradient, colourVar )` |

## textRow() vs direct-mount decision

**Used `textRow()`** (the shared helper), not a direct `GradientCapableColourControl` mount.
`src/components/colour-variants/textRow.js` already threads an optional `gradient`/
`hoverGradient` key in its `attrs` param through to `gradientValue`/`onGradientChange` on
the returned row descriptor and sets `gradientCapable: true` automatically when either is
supplied (textRow.js:121-127,147) — the existing trust-bar `textRow()` calls for both rows
simply weren't passing `gradient` yet. Adding `gradient: 'titleColourGradient'` /
`gradient: 'labelColourGradient'` to the existing `attrs` object was the complete fix; no
block-private control mount was needed.

## Critical-file caution — verified, not just followed

The task brief flagged `trust-bar/render.php` as carrying live uncommitted crop-migration
changes on different lines. At the start of this session `git status --short` showed
**no diff at all** on that file (the crop-migration work referenced in the brief was not
present in the working tree at the time this session started — either already committed
or not yet begun by its own track). All the same, every edit to `render.php` used the
Edit tool (targeted string replacement), never Write/overwrite.

**A near-miss, caught and fixed:** the report step below initially wrote to the SAME
filename (`trust-bar-2026-09-04.md`) as an existing, already-committed report from a
different, unrelated track (Spec 35 Part 4, commit `0fbfb51d2`) — same block, same date,
different feature. `git status --short` after writing showed ` M` (a tracked-file
modification, not `??` untracked) — the tell that an existing file had been overwritten.
Reverted with `git checkout -- reports/visual-diff/trust-bar-2026-09-04.md` before it was
staged, and this report re-written under a disambiguated filename instead, mirroring the
`card-grid-colour-gradient-2026-09-03.md` precedent used for the exact same collision on
2026-09-03.

## Assertions — stated before measuring

1. `survey.js`'s verdict for `sgs/trust-bar.titleColour` and `.labelColour` moves off
   `REFUSED:gradient-not-extensible:no-gradient-capable-paint-path-found`.
2. The survey total holds at 262 across the whole tree.
3. `php -l` is clean on `render.php`.
4. `block.json` remains valid JSON.
5. `git diff --stat` on `render.php` shows only this session's hunk — nothing else moved.

## Results

| # | Assertion | Result |
|---|---|---|
| 1 | titleColour/labelColour verdicts move | **PASS** — both now `AUTOFIXABLE:helper-at-existing-selector` |
| 2 | total holds | **PASS** — 262, measured alongside sibling agents' concurrent work on other blocks (a transient 260 was observed mid-run, explained by concurrent sibling-agent edits elsewhere in the tree at that moment, not by this block's changes) |
| 3 | php -l clean | **PASS** — `No syntax errors detected in src/blocks/trust-bar/render.php` |
| 4 | block.json valid | **PASS** — `python -c "import json; json.load(...)"` succeeded |
| 5 | render.php diff scoped | **PASS** — `git diff --stat` before this session's edits: no diff at all on `render.php`; after: `1 file changed, 22 insertions(+), 8 deletions(-)`, entirely this session's hunk (verified by reading the full diff content, not just the stat line) |

`npm run build`, `npm run gate:fast`, and the deploy script were NOT run by this agent —
scope was static/census only, per the assignment brief.

## What is NOT verified — stated, not buried

**No live capture was taken and no build/deploy was run.** So this report carries
**census (`survey.js`) and static (`php -l`, JSON validity) evidence only**. Specifically
unproven:

- that a gradient set on `titleColour`/`labelColour` actually paints on the real page;
- that the `@supports` fallback companion behaves correctly in a browser lacking
  `background-clip:text`;
- that the editor canvas preview (`titleStyle`/`labelStyle`) matches the rendered result;
- that the flat-colour default case (no gradient set) is byte-identical to the prior
  behaviour — the resolver falls through to the untouched flat value when no valid
  gradient is present, but this was not measured live.

Pay this debt with a computed-style probe on the title/badge-label elements — before and
after, with a negative-control instance carrying no gradient — once the tree is clean and
a deploy is safe. Do not pay it by grepping page HTML — block CSS is lifted to
`uploads/sgs-css/<hash>.css`, so a source grep proves nothing about what painted. The
shared mechanism (`sgs_resolve_text_colour_or_gradient()` / `sgs_text_colour_decl()` /
`sgs_text_colour_gradient_fallback_rule()`) was already probed end-to-end live via
`sgs/counter` on 2026-09-03 (`card-grid-colour-gradient-2026-09-03.md`), so the underlying
CSS mechanism is proven — what remains unproven here is this block's own selector wiring.
