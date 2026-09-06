---
doc_type: report
project: small-giants-wp
spec_ref: 32
status: RESEARCH — gold-standard survey for the proposed column-shape picker. No code changed.
last_updated: 2026-08-26
---

# Column shape picker — what the gold standard actually does

Every claim is labelled **VERIFIED** (read line-by-line from the source named) or **INFERRED**
(reasoned from docs/behaviour, not from source). Source reads are against `WordPress/gutenberg`
and `stellarwp/kadence-blocks` `HEAD` on 2026-08-26 via `gh api`.

## 1. What core does

**VERIFIED — `packages/block-library/src/columns/variations.js`.** Six variations, all
`scope: [ 'block' ]`, each with an inline `<SVG><Path/></SVG>` icon (48x48, hand-authored path
data — *not* a `@wordpress/icons` import, *not* `blockDefault`). Titles are bare ratios; the
semantics live in `description`:

```js
{ name: 'two-columns-one-third-two-thirds', title: __( '33 / 66' ),
  description: __( 'Two columns; one-third, two-thirds split' ), icon: ( <SVG …/> ),
  innerBlocks: [ [ 'core/column', { width: '33.33%' } ],
                 [ 'core/column', { width: '66.66%' } ] ], scope: [ 'block' ] }
```

Full roster (VERIFIED, enumerated — 6 entries): `one-column-full` "100" · `two-columns-equal`
"50 / 50" (`isDefault`) · `two-columns-one-third-two-thirds` "33 / 66" ·
`two-columns-two-thirds-one-third` "66 / 33" · `three-columns-equal` "33 / 33 / 33" ·
`three-columns-wider-center` "25 / 50 / 25". **There is no wide-first / wide-last three-column
variation in core** — only wide-centre.

**VERIFIED — `columns/edit.js`.** The picker is `__experimentalBlockVariationPicker`
(imported from `@wordpress/block-editor`; the component file is
`packages/block-editor/src/components/block-variation-picker/index.js`). It is rendered by a
`Placeholder` component chosen like this:

```js
const hasInnerBlocks = useSelect( ( s ) => s( blockEditorStore ).getBlocks( clientId ).length > 0 );
const Component = hasInnerBlocks ? ColumnsEditContainer : Placeholder;
```

**VERIFIED — the picker's own markup** is a `<Placeholder>` wrapping
`<ul role="list" aria-label={ __( 'Block variations' ) }>`, one `<li>` per variation containing a
`<Button variant="tertiary" iconSize={48} label={ variation.description || variation.title } />`
plus a **separate sibling `<span>`** holding `variation.title`.

## 2. Insert-time vs after-insert — the load-bearing finding

**VERIFIED: core offers the diagram picker ONLY while the block is empty.** The moment
`getBlocks( clientId ).length > 0` the placeholder is gone for good, and there is no route back to
it. What core offers afterwards, enumerated from source:

1. `core/columns` inspector `ToolsPanel` → `RangeControl` label `__( 'Columns' )`, `min 1`,
   `max Math.max( 6, count )`, plus a warning `Notice` above 6 (VERIFIED, `columns/edit.js`).
2. `core/columns` inspector → `ToggleControl` `__( 'Stack on mobile' )` (VERIFIED).
3. `core/column` inspector `ToolsPanel` → `UnitControl` `__( 'Width' )`, units `% px em rem vw`,
   written to the column's `width` attribute and applied as `flex-basis` (VERIFIED, `column/edit.js`).
4. Both blocks get a `BlockVerticalAlignmentToolbar` in `BlockControls` (VERIFIED).

**There is no drag-resize handle**: `ResizableBox` does not appear anywhere in `column/edit.js`
or `columns/edit.js` (VERIFIED — `gh search code` for `ResizableBox` in `edit.js` returns spacer,
avatar, file, comment-author-avatar, site-logo, search only).

**Why the switcher is absent, mechanically (VERIFIED):**
`packages/block-editor/src/components/block-variation-transforms/index.js` is the after-insert
variation switcher, but it selects `getBlockVariations( name, 'transform' )` and returns `null`
when `! variations?.length`. Core's columns variations are `scope: [ 'block' ]` only — never
`'transform'` — so the switcher never renders for Columns. It also requires a working `isActive`
matcher to compute `selectedValue`; core's columns variations declare none.

**Consequence for us:** core is *not* the model to copy for our requirement. Our whole point is
after-insert change; core's diagram grid is an insert-time onboarding device and the client's only
later recourse is typing a percentage per column. Our control is closer to
`BlockVariationTransforms` than to `BlockVariationPicker`.

## 3. What the commercial builders do

- **Kadence Blocks — the closest match to what we want, and it is after-insert.** VERIFIED from
  `src/blocks/rowlayout/layout-controls.js`: a `KadenceRadioButtons` icon grid (`wrap={true}`,
  `hideLabel={true}`, class `kadence-row-layout-radio-btns`) sitting **in the sidebar Layout
  panel**, wrapped in `SmallResponsiveControl label={__('Layout')}` so desktop / tablet / mobile
  each get their own shape. Options are built per column count. For `columns === 3` the enumerated
  set is 9: `equal` "Equal", `left-half` "Left Heavy 50/25/25", `right-half` "Right Heavy
  25/25/50", `center-half` "Center Heavy 25/50/25", `center-wide` "Wide Center 20/60/20",
  `center-exwide` "Wider Center 15/70/15", `first-row`, `last-row`, `row` "Collapse to Rows".
  For `columns === 2`: `equal`, `left-golden` "Left Heavy 66/33", `right-golden` "Right Heavy
  33/66", `row`. Note the label convention: **name + the literal ratio**. Picking a preset resets
  `firstColumnWidth…sixthColumnWidth` to `undefined` — i.e. presets and free per-column widths are
  one setting with two entry points, preset wins on selection (VERIFIED, `onChange` body).
- **GenerateBlocks** — layout chosen at insert from an array of column/size options; afterwards you
  change each inner container's own width, and add columns with a `+`. No after-insert preset grid.
  (INFERRED from docs, source not read: adamwrightdesign.com, learn.generatepress.com/blocks/block/grid/.)
- **Spectra (UAG) Advanced Columns** — column count (max 6) on the outer wrapper, then a width
  setting per individual column. Docs describe no diagram preset row. (INFERRED —
  wpspectra.com/docs/advanced-columns/; the wordpress.org mirror ships compiled JS only, so no
  source read was possible.)
- **Cwicly** (discontinued product) — no named presets at all: a Grid Editor with "Fractions",
  "Minmax", and a drag "Visualiser". (INFERRED — docs.cwicly.com/blocks/columns/columns-1.)

**Pattern across all four:** *nobody* offers free-text `grid-template-columns` to the client.
Presets-plus-per-item-numeric-override is the universal shape. Kadence is the only one with a
persistent, after-insert, responsive-per-tier diagram row — and it is the one closest to our brief.

## 4. Accessibility verdict

- Core's `BlockVariationPicker` is **the wrong pattern to copy**. Gutenberg issue
  [#66062](https://github.com/WordPress/gutenberg/issues/66062) (OPEN) names its exact defect:
  "the visible text below each variation mismatches the actual accessible name of the variation
  button" — because the code sets `label={ variation.description || variation.title }` while
  rendering `variation.title` in a sibling `<span>`. That is a WCAG 2.5.3 Label in Name failure,
  in core, unfixed.
- Core's **after-insert** switcher does it properly (VERIFIED, `block-variation-transforms/index.js`):
  `ToggleGroupControl` + `ToggleGroupControlOptionIcon` when every variation has a unique icon and
  there are ≤ 6 of them; `VariationsButtons` (a `<fieldset>` with a `VisuallyHidden <legend>` and
  `Button … isPressed aria-label={variation.title}`) when there are **more than 6**, because
  "the ToggleGroupControl does not wrap"; a `Menu` with `Menu.RadioItem` when icons are not unique.
- `ToggleGroupControlOptionBase` renders **`Ariakit.Radio`** (real radiogroup, roving arrow-key
  focus) when not deselectable, and a `<button aria-pressed>` only when `isDeselectable`
  (VERIFIED, `toggle-group-control-option-base/component.tsx`).

**Recommendation for our markup:** a `ToggleGroupControl` with one
`ToggleGroupControlOptionIcon` per shape, value = the shape slug, `label` = the *same string the
user sees or hears* — no split between a visible span and a different `aria-label`. Radiogroup is
the correct role: the shapes are mutually exclusive and one is always active.

## 5. Diffs to the proposed design

Proposed: *"a row of `<Button variant=primary/secondary isPressed>` each containing an aria-hidden
flex diagram, inside a `BaseControl`, writing a `1fr 2fr 1fr` string."* Five changes:

1. **`ToggleGroupControl` + `ToggleGroupControlOptionIcon`, not a row of `Button isPressed`.**
   Core reaches for `isPressed` buttons only past 6 options, purely because TGC will not wrap. Our
   set is 6 or fewer per column count, so we get the radiogroup and arrow-key traversal for free —
   and we drop the `BaseControl`, because TGC takes its own `label`.
2. **One visible/accessible name per option, and put the ratio in it.** Do not follow core's
   `label=description` / `visible=title` split (issue #66062). Follow Kadence: `Wide centre
   (25/50/25)` as one string. Non-technical clients read the numbers even when the diagram is
   ambiguous, and it removes the guesswork about what the diagram means.
3. **The diagram stays `aria-hidden` — keep that, it is correct.** TGC's option renders the icon
   as children with the name supplied by `label`; an `aria-hidden` decorative diagram inside is
   exactly right. Set `showTooltip` so the name is reachable on hover as well as to AT.
4. **Do not store `"1fr 2fr 1fr"` as the attribute.** Store the shape *slug* (`equal`,
   `wide-centre`, `wide-first`, …) and derive the CSS string at render. Three reasons, all
   evidenced: (a) TGC needs a stable `value` to mark the pressed option, and string-matching a CSS
   declaration is brittle; (b) Kadence's picker resets the per-column width attrs on selection,
   which needs the preset to be a distinct thing from the widths; (c) a raw CSS string cannot
   round-trip through our responsive tiers cleanly. Keep the explicit `gridTemplateColumns*` free
   value as the escape hatch (it already exists) and let the slug read `custom` when it is set.
5. **Name the shapes by ratio, not by side — or accept RTL breakage.** Kadence's "Left Heavy
   66/33" is a real i18n trap: the diagram and the word "left" both invert under RTL while the
   underlying `1fr 2fr` does not. Core sidesteps it by titling variations "33 / 66" with no
   directional word. Prefer ratio-first titles (`66 / 33`) with the directional phrasing as
   supporting text, and mirror the diagram in RTL via CSS logical properties, not by swapping the
   value.

**One thing not to change:** the plan to offer a small fixed preset set rather than free ratio
entry is correct and matches all four builders. No competitor exposes `grid-template-columns` to
the client.

## Sources

- https://github.com/WordPress/gutenberg — `packages/block-library/src/columns/{variations.js,edit.js}`,
  `packages/block-library/src/column/edit.js`,
  `packages/block-editor/src/components/block-variation-picker/index.js`,
  `packages/block-editor/src/components/block-variation-transforms/index.js`,
  `packages/components/src/toggle-group-control/toggle-group-control-option-base/component.tsx`
- https://github.com/WordPress/gutenberg/issues/66062
- https://github.com/stellarwp/kadence-blocks — `src/blocks/rowlayout/layout-controls.js`
- https://docs.nexcess.com/software/kadence/row-layout-block/
- https://wpspectra.com/docs/advanced-columns/
- https://docs.cwicly.com/blocks/columns/columns-1
- https://learn.generatepress.com/blocks/block/grid/ (403 on fetch; summarised via search index)
