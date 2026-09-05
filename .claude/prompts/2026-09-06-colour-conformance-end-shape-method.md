---
doc_type: prompt
title: Colour conformance — continue with the end-shape method
created: 2026-09-06
governs: plugins/sgs-blocks/scripts/colour-codemod/
retention: delete once consumed
---

# Session start: colour conformance, end-shape method

Read `c:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` in full. Then read this
prompt in full before touching any code.

## The method, in one sentence

Classify every row against the real shared-helper catalogue first. Never guess a
fix from a fuzzy "autofixable" verdict.

## What's proven, and why the old approach failed

Two prior tools tried to spot colour rows a script could safely fix:
`survey.js`'s `AUTOFIXABLE` verdict and `fix.js`'s AST parse. Both are unreliable
for that job. `survey.js` matched `:hover` inside a *comment* on `sgs/modal` and
called four rows safe. `fix.js` claims 90 rows autofixable; run for real, it
fixes zero. An adversarial-council pre-mortem graded the plan to tighten this
into a universal auto-fix classifier 6/6 D — unanimous NO-GO.

What works instead: `classify-end-shape.js`
(`plugins/sgs-blocks/scripts/colour-codemod/classify-end-shape.js`, run via
`npm run colour:classify-end-shape`). It never decides auto-fix-or-not. It
answers one question per row: which of the ~11 named shapes in
`plugins/sgs-blocks/CLAUDE.md`'s "Colour EMISSION helpers" and "Known
precedent-function registry" sections should this row end up calling? It
reuses `survey.js`'s row-detection and per-attribute tracing (now exported,
guarded behind `require.main`) rather than re-parsing render.php a third way.

Run it fresh — the numbers below are a snapshot, not a fixture:

```
npm run colour:classify-end-shape
node scripts/colour-codemod/classify-end-shape.js --list <shape-key>
node scripts/colour-codemod/classify-end-shape.js --json   # full dump
```

## Session close tonight: one narrow codemod, an honest zero

`migrate-fill-custom-property-gradient.js`
(`plugins/sgs-blocks/scripts/colour-codemod/migrate-fill-custom-property-gradient.js`)
targets the single shape hand-verified 5+ times this session (option-picker,
tabs, modal, trust-bar, mega-panel, timeline.connectorColour,
audio.accentColour): a bare `--sgs-x` custom property fed by
`sgs_colour_value()`, no gradient sibling, fixed via
`sgs_custom_property_gradient_decls()` plus one `background-image:var(...)`
stylesheet line.

Run against the 7 cleanest-looking remaining candidates, it refused all 7 —
each for a real, distinct, evidence-backed reason (see the script's own
`--survey` output and its commit message, `c6ccdb254`). Read that list before
assuming this shape has more free wins; it likely doesn't, without the
model-comparison work below.

## The model-comparison method (Bean-directed, do this before hand-fixing)

For every row a script refuses, find a sibling attribute that's *already*
conformant — on the same block if one exists, otherwise the nearest analogous
block — and read its actual wiring before writing anything. Three real
findings from tonight prove this finds fixes a blind refusal would miss:

- **`before-after.handleIconColour`** looked like a copy of
  `before-after.dividerColour` (same block, dividerColour already correctly
  wired). It isn't. `dividerColour` paints `background-color`;
  `handleIconColour` paints an SVG `stroke:` — a completely different
  mechanism. Its real model is `star-rating`'s `starColourGradient` wiring
  (`sgs_svg_stroke_gradient()` + `sgs_svg_inject_defs()`, `render.php:130`),
  not `sgs_custom_property_gradient_decls()`. Never assume same-block
  proximity means same shape — check the DB `mechanism`/`cssProperty`
  first.
- **`business-info.linkHoverBackgroundImage`** looked like a flat colour
  missing a gradient sibling. It isn't — its attrMap already routes it as
  `"css:background-image": "linkHoverBackgroundImage"`. The attribute *is*
  conceived as the gradient-carrying value, feeding a colour stop inside an
  already-composed gradient (`style.css:102`). "Add a gradient sibling" was
  the wrong frame entirely for this row.
- **`breadcrumbs`**'s three state elements (`item`/`separator`/`current`)
  all have empty attrMaps — no working model exists on that block at all.
  Find a model elsewhere (another block with a similarly-shaped
  current/active-state colour attribute) before writing an attrMap fix, or
  don't guess the element.

## Known-different-shape rows, don't re-investigate these

Named in `migrate-fill-custom-property-gradient.js`'s own
`KNOWN_DIFFERENT_SHAPE` constant — each already root-caused tonight:

- `mega-panel.accentBackgroundImage`, `nav-menu.featuredBg` — slug-derivation
  via `sanitize_html_class()`/`sgs_resolve_palette_hex()`, never reaches
  `sgs_colour_value()`.
- `product-search`'s 5 rows — a real 4th shape: one `foreach` loop building
  several custom properties from one associative array. Needs its own
  codemod, not a variant of the custom-property-gradient one.
- `audio.spectrumColour` — canvas `fillStyle`, not CSS. No CSS fix applies.
- `timeline.connectorFillColour`, `business-info.linkHoverBackgroundImage` —
  the custom property is reused inside composed gradients/box-shadows/
  `color-mix()` ingredients at other consumer sites. A blanket
  `background-image` sibling would silently break those. `audio.accentColour`
  already solved this exact problem — wire only the safe consumer sites (it
  found 3 of 6), leave the composed ones alone.

## Next actions, ranked

1. **`before-after.handleIconColour`** — apply the `sgs_svg_stroke_gradient()`
   recipe from `star-rating/render.php:128-131`. Small, single-row, model
   already found.
2. **`breadcrumbs`** — find a working current/active-state colour model
   elsewhere in the framework, then wire `item`/`separator`/`current`
   together (same block, same PR).
3. **`timeline.connectorFillColour`** — reapply `audio.accentColour`'s
   selective-site method: wire only the plain `background-color:`/`color:`
   consumers, leave the `box-shadow`/composed-gradient/`color-mix()` sites
   alone, named per site.
4. **`product-search`'s 5 rows** — a new narrow script,
   `migrate-fill-custom-property-gradient-loop-map.js` or similar, for the
   `foreach`-over-map shape. Don't force these into the existing script.
5. **`before-after.dividerColour`** — PHP/JSON/CSS are already proven safe by
   tonight's script; only the edit.js JSX rewrite needs doing, by hand, not
   regex (the script's own attempt found real regex fragility here, not a
   real block-side blocker).
6. Re-run `npm run colour:classify-end-shape` after each fix lands, and
   re-check the fixed rows against `survey.js --json` the way this session
   did — never trust a script's own before/after diff as its own proof.

## Standing rules (carried forward)

- Path-scoped commits only (`git commit ... -- <paths>`); re-check
  `git branch --show-current` immediately before every commit.
- After any block.json change: `python scripts/sgs-update-v2.py --stage 1`
  (DB reseed, narrow — not the full 13-stage run) then
  `python scripts/generate-attr-role-map.py`, before running
  `check-element-manifest-conformance.js`.
- Gates that may block on genuinely unrelated concurrent-session debt need
  BOTH bypasses together, not one: `[gates-ok:<reason>]` in the commit
  message (Claude's own `f5-commit-gate.py` hook) AND
  `SGS_F5_SKIP=<script> SGS_F5_SKIP_REASON="..."` as env vars (the git-level
  `.githooks/pre-commit` F5/F6 checks) — found the hard way tonight when one
  alone silently didn't satisfy the other.
- Never force a row into a shape it doesn't cleanly match. Refuse with a
  named reason and move to the model-comparison step instead.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — every session |
| `/dispatching-parallel-agents` | Once 2+ rows have confirmed, distinct, disjoint-file fixes ready |
| `/adversarial-council` | Before any plan to re-widen scope back toward a universal auto-fix classifier |
| `/handoff` | Session close |
