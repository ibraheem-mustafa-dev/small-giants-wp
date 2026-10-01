# nav-menu "Item text" Hover colour picker — `onGradientChange is not a function`

**Date:** 2026-09-13
**Status:** Root cause found (Iron Law — proven, not inferred). Fix not yet built (investigation-only dispatch).

## Root cause

`plugins/sgs-blocks/src/components/GradientCapableColourControl.js::StateContent` renders
the Solid/Gradient `ToggleGroupControl` **identically for every state tab in a row**,
gated only by the row-level `gradientCapable` flag — never by whether the ACTIVE state
object itself carries a `gradientValue`/`onGradientChange` pair. When the operator picks
"Gradient" on any tab (or switches back to "Solid", which unconditionally clears the
gradient), it calls:

- `state.onGradientChange( newGradient ?? '' )` (line 254, gradient-picker path)
- `state.onGradientChange( '' )` (line 268, solid-picker "clear gradient sibling" path)

For nav-menu's "Item text" row, `plugins/sgs-blocks/src/blocks/nav-menu/edit.js` (around
line 296) calls `textRow()` with:

```js
attrs: {
  base: 'itemColour',
  hover: 'itemColourHover',
  current: 'itemColourCurrent',
  gradient: 'itemColourGradient',   // no hoverGradient, no currentGradient
},
```

`plugins/sgs-blocks/src/components/colour-variants/textRow.js::textRow` only attaches
`gradientValue`/`onGradientChange` to a state when the matching `*Gradient` attr name is
supplied (`gradient` → normal, `hoverGradient` → hover, `currentGradient` → current —
lines 143-148, 157-163, 173-179). Since `hoverGradient` was never passed, `hoverState`
has no `onGradientChange` key at all. But `gradientCapable` is computed **once, for the
whole row** (line 190: `...( gradient || hoverGradient || currentGradient ? {
gradientCapable: true } : {} )`), so `gradient: 'itemColourGradient'` alone flips
`gradientCapable: true` and `GradientCapableColourControl` shows the Gradient toggle on
the Hover tab too — a control with nowhere to write. Clicking it calls
`hoverState.onGradientChange(...)`, which is `undefined` → `TypeError`.

## Not a today regression — deliberate, documented omission that later became reachable

`git log --oneline -- plugins/sgs-blocks/src/blocks/nav-menu/edit.js` shows this dates to
**2026-09-04, commit `10e08548a` ("feat(colour): text-gradient siblings for nav-menu +
pricing-table")** — 9 days before this session, not part of today's nav-menu work. That
commit's own message states the omission was intentional:

> "itemColourHover was deliberately left ungraded: its 'pill' hoverStyle auto-computes
> the text colour for WCAG contrast against itemBgHover, which a client-chosen gradient
> can't meaningfully replace."

At that point the row was still hand-written literal JS with `gradientCapable: true` set
explicitly alongside a Hover state object with no `onGradientChange` — the exact same
latent shape, just not yet crash-reachable if the UI at the time didn't let the operator
reach the Gradient toggle on a tab lacking the handler (unverified whether it crashed
then too — plausible it did and was simply never operator-tested on that tab).
Commit `76e0cfa11` ("rebuild the Colour panel — three states...") later migrated this row
to the shared `textRow()` helper, which mechanically reproduces the identical row-level
`gradientCapable` OR-of-three-attrs shape (line 190) — carrying the same bug forward
faithfully rather than introducing it. **Conclusion: pre-existing, not caused by any of
today's nav-menu commits** (`cce38999d`, `ced102333`, `689eaa817`, `8f9b25c1d`,
`de6db5893` per `git log` — none touch `itemColourGradient`/`itemColourHover` wiring).

## Comparison — same block, working states

- `nav-text` row (`navColour`/`navColourHover`... wait, nav-text has no hover at all —
  single-state row via `textRow()` with only `gradient: 'navColourGradient'`, no `hover`
  key at all, so `states: hover ? [...] : [ normal ]` never emits a hover tab — no bug
  surface exists there.
- `item-text` Normal and Current tabs work: both have their own `gradientValue`/
  `onGradientChange` pair supplied via `gradient`/`currentGradient` — **but note
  `current` was also never paired with a `currentGradient` attr here**, so Current is
  equally exposed to the identical crash the moment the operator opens the Gradient
  toggle on that tab. This is the same bug, same row, second occurrence — not a
  separate issue.

## Comparison — cross-block, working hover+gradient pattern

- `edit.js:558` — `sublinkMarkerColourHoverGradient` and `edit.js:619` —
  `featuredBgHoverGradient` are both rows that DO pass `hoverGradient` explicitly to
  `textRow()`/`fillRow()`, giving the Hover tab its own `onGradientChange`. These are the
  correct, working shape — proof the helper's per-state gating works fine when the
  caller supplies the matching attr name for every state that needs it. Nav-menu's
  `item-text` row is the outlier that requests `gradientCapable` (via `gradient`) without
  giving every state a landing spot.

## Recommended fix shape (small, structural — not scope-expanding)

The real defect is in `GradientCapableColourControl::StateContent` (or its caller), which
must gate the Gradient toggle **per active state**, not per row: render the Solid/Gradient
`ToggleGroupControl` (and thus ever call `state.onGradientChange`) only when the ACTIVE
state object actually has an `onGradientChange` function — falling back to a
solid-only `ColorPalette` for any state without one. This is a one-component fix
(`GradientCapableColourControl.js`, roughly the `hasStates`/`StateContent` render path,
~10–15 line change: compute `const stateIsGradientCapable = typeof
state.onGradientChange === 'function'` and use it in place of the row-level
`gradientCapable` inside `StateContent`, or gate the `ToggleGroupControl` render).

Do NOT fix this by adding a `hoverGradient`/`currentGradient` attribute pair to
nav-menu's item-text row — commit `10e08548a` explicitly reasoned the Hover pill
auto-computes contrast and a client gradient can't meaningfully replace it; adding those
attrs would relitigate that design decision, which is out of scope for a bug fix. The
correct fix is making the shared control honour "this row is gradient-capable overall,
but THIS state isn't" — which also silently protects every other `textRow()`/`fillRow()`
row in the codebase that has the same partial-gradient shape (Current tab of this exact
row included), consistent with the project's "universal, no carve-outs" rule.

**Size flag:** small and single-file if scoped to `GradientCapableColourControl.js` only.
No DB/schema/attribute changes needed.
