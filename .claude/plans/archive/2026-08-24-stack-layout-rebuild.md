---
doc_type: phase-plan
project: small-giants-wp
created: 2026-08-24
status: COMPLETE
---

# Rebuild the Stack layout type on sgs/container

## Outcome — COMPLETE 2026-08-24

All three tasks shipped, base `55f797e85` → `be17c513b`.

- **Task 1** (`0d3f2353b`) — the shared wrapper now emits `display:flex;
  flex-direction:column` for `layout:"stack"`, joins the `min-width:0`/`min-height:0`
  guard, and ignores `flexDirection`. Live-measured: `display:flex`, `flex-direction:column`,
  row-gap 44px against an authored 44px gap, child gaps measured at 43/44px.
- **Task 2** (`c76d0f120`) — `LayoutPanel.js` re-gated: Stack shows Gap, Vertical alignment,
  Justify content; hides Flex direction and Flex wrap (the wrapper ignores both under Stack,
  so showing them would be dead controls). Verified live in the editor across all three
  layout modes.
- **Task 3** (`be17c513b`) — `edit.js` mirrors Stack onto the editor canvas the same way it
  already mirrors flex/grid. Verified live IN THE CANVAS: flex/column, row-gap 52px against
  an authored 52px gap, child gaps measured 52/53px, `flexDirection:"row"` ignored.

**QC-inline: 7 of 7 scenarios pass** (confidence 100). Flex still row+wrap+justify, grid
still 3 tracks — no regression. Nested stacks keep independent gaps (outer 30/measured
30, inner 10/measured 10/10). `flexWrap:"wrap"` on a stack is coerced to `nowrap`. A stack
with no gap set still renders `flex-column`.

**Found, not fixed, and worth a follow-up task:** `layout` has no enum in `block.json` — an
invalid value (e.g. a typo like `"stak"`) silently falls through to `display:block`, which is
the ORIGINAL Stack bug by another route. Recommend adding the enum so an invalid value fails
loudly instead of reproducing the bug this plan just fixed.

## Why this exists

`sgs/container`'s "Layout type" dropdown offers three options — Flex, Stack, Grid. Two are
implemented. **Stack is not.**

The shared wrapper (`plugins/sgs-blocks/includes/class-sgs-container-wrapper.php`) branches
on `'grid' === $layout` and `'flex' === $layout`. `stack` matches neither, emits no
`display`, and falls through to normal block flow — which happens to stack, so it looked
like it worked. It does not:

- **`gap` is inert.** Measured 2026-08-24: `display:block` with `gap:24px` declared renders
  identically to no gap at all — children at 0/20/40px in both cases. `gap` has no effect in
  block layout in any shipping browser. A client picking Stack and setting a gap gets nothing.
- **Four controls vanish** when Stack is selected — Vertical alignment, Flex direction, Flex
  wrap, Justify content — because the panel gates them on `layout === 'flex'`. Vertical
  alignment and Justify content are perfectly meaningful for a column and should return.
- Stack is also excluded from the wrapper's container-query setup, its grid-on-inner move,
  and its `> * { min-width: 0 }` overflow guard — every one of those is gated
  `('grid' === $layout || 'flex' === $layout)`.

Bean found this by opening the editor and clicking, which no gate covers.

## The CSS decision, stated once

**Stack renders as `display: flex; flex-direction: column`.**

Considered and rejected:
- **Block flow + margins** — the current accidental behaviour. No `gap` support, needs an
  owl selector or per-child margins, and cannot express alignment. This is the bug.
- **`display: grid` with implicit rows** — also supports `gap` and arguably resists child
  overflow better. Rejected for divergence: the block's alignment attrs
  (`alignItems`/`justifyContent`) and its whole existing code path are flex-shaped, and the
  grid branch already owns track/column machinery Stack has no use for. Flex column reuses
  the code that exists rather than adding a third shape.

Consequence to accept: flex children can shrink below their content. The wrapper already
emits `> * { min-width: 0; min-height: 0 }` for flex and grid — Stack must join that gate.

## Global constraints (bind every task)

1. **No inline `style="…"` property declarations** (Spec 32). Everything routes through the
   block's scoped `<style>` at class-level `.{uid}.{block-class}` specificity — never `#uid`.
2. **These properties belong on the INNER band**, not the outer. The DB is authoritative:
   `gap`, `alignItems`, `justifyContent`, `flexDirection`, `flexWrap` all carry
   `css_element = inner` in `block_attributes`. Verify with
   `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name, css_element FROM block_attributes WHERE block_slug='sgs/container'"`.
3. **`layout`'s default stays `"flex"`.** Bean ruled explicitly that the defaults mirror the
   CSS initial values — row (his "Flex") and nowrap. Stack is a mode you pick, NOT the
   default. Do not change the default value or the option order.
4. **Do NOT remove `column` / `column-reverse` from the Flex direction control.** They are
   removed in a LATER task once Stack is proven; until then they are the only route to a
   column and deleting them is a regression.
5. **No version bumps, no `deprecated.js`** (D270/D293).
6. **UK English** in all comments, labels and identifiers.
7. `npm run build` must pass. If it fails on `inspector-scan RATCHET rule 21` at 211, that is
   pre-existing — report it, never edit a baseline to get green.

## Task 1 — Implement `stack` in the shared wrapper

Make `layout: "stack"` emit `display:flex; flex-direction:column` on the same element the
flex branch targets, and make every layout-gated behaviour include it.

**Find every gate first.** `grep -n "=== \$layout" class-sgs-container-wrapper.php` returns
at least: 1009 (`$grid_on_inner`), 1015 (container queries), 1231 (grid branch), 1273 (flex
branch), 2336 (`> *{min-width:0}`), plus grid-only gates at 1350/1387/1935/2495/2521 which
Stack must NOT join. Decide per gate whether Stack belongs, and say why in the code comment.

**Required end state:**
- `layout:"stack"` emits `display:flex` and `flex-direction:column`.
- `gap` reaches the element and works.
- `> * { min-width:0; min-height:0 }` applies (Stack is flex; children can shrink).
- The `<main>` suppression (`$suppress_outer_flex_for_main`) is respected — a `<main>` still
  must not become a flex container.
- The column invariant already in the flex branch (column axis coerces `wrap` to `nowrap`)
  applies to Stack too, since Stack IS a column.
- `flexDirection` is IGNORED under Stack — Stack defines the axis. An operator who set
  `flexDirection:"row"` and then picked Stack gets a column, not a row.

**Verify:** author a container with `layout:"stack"` and a gap on the canary, deploy, and
measure the live computed styles. `display` must be `flex`, `flex-direction` `column`, and
`row-gap` the authored value — not `normal`.

## Task 2 — Re-gate the Layout panel controls for Stack

`plugins/sgs-blocks/src/blocks/container/components/LayoutPanel.js` currently wraps Flex
direction, Flex wrap, Justify content and Vertical alignment in `{ layout === 'flex' && ... }`,
so Stack shows only Gap.

**Required end state:**
- **Vertical alignment** — shown for Stack (it is `align-items`; on a column that controls
  cross-axis, i.e. horizontal, alignment). Meaningful.
- **Justify content** — shown for Stack (main-axis distribution down the column). Meaningful.
- **Flex direction** — HIDDEN for Stack. Stack defines the axis; offering a direction control
  that the wrapper ignores would be a dead control.
- **Flex wrap** — HIDDEN for Stack. A column stack does not wrap, and the wrapper coerces it.
- **Gap** — stays shown.

Any control shown must actually do something under Stack — a control the wrapper ignores is
a dead control and `check-dead-controls.js` exists for that class.

## Task 3 — Mirror Stack onto the editor canvas

`plugins/sgs-blocks/src/blocks/container/edit.js` mirrors flex and grid onto the canvas.
Stack must mirror too, or an operator picking Stack sees no change while editing.

Extend the EXISTING mechanism — do not add a second one. Note `gridOnInner` is currently
`(layout === "grid" || layout === "flex")`; Stack needs the same treatment so its properties
land on the band when a band exists.

⚠ `gap` is an OBJECT attr `{desktop,tablet,mobile}`. `resolveResponsiveTier()` returns
`{ value, inherited }`, NOT a string — extract `?.value`. A missing `?.value` there is
exactly the bug fixed in `ffe86c6f6`; do not reintroduce it.

**Verify in the block editor**, not by reading code: set `layout:"stack"` and a gap, and
confirm the canvas shows a column with that gap. The flex CSS lives on
`.sgs-container__inner` — measure THAT element, not the block root.
