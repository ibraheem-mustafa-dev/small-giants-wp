# Live verification — sgs/container — 2026-09-21 (U-1 commit 4f-1: the layered shadow control in the editor)

verdict: PASS
intent_capture_passed: true
source_sha: 821388432ae8658e
commit_sha: c279c4aab (control), with bf0d60af78ada556 = the `ContainerWrapperControls.js` bytes changed by 1d5b3ac39

> `source_sha` is the recipe applied to the committed bytes of `container/edit.js` at c279c4aab.
> Change: the canvas preview composes through the shared composer with the block's own colour list, and
> the block's Shadow panel is the new Simple / Layers / Raw CSS control.

## Environment and method

| Item | Value |
|---|---|
| Site | sandybrown canary, deployed with plugin and theme together (see the mega-panel report of the same date) |
| Fixture | the scratch page 2526 ("Session A control-type reference"), first `sgs/container`, opened in the real block editor. It was never saved: the editor was left with the browser's leave-page prompt accepted, so the stored page is untouched |
| Browser | real headed Chrome (chrome-devtools MCP), one window, editor fully loaded, attributes read with `wp.data.select('core/block-editor')` |

## Checks

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | The panel mounts with three levels and the theme's shadow set | PASS | tabs `Simple`, `Layers`, `Raw CSS`; the Simple tab lists None plus the 11 new styles and the site's own extra presets, each swatch drawn |
| 2 | A stored value naming a removed preset (`subtle`) does not crash | PASS | the panel opened on it; choosing an elevation replaced it |
| 3 | Elevation 3 writes shape and colour together | PASS | one write: `shadow "0px 0.7px 1.4px -0.2px, 0px 1.9px 3.9px -0.6px, 0px 4px 8px -1.2px"`, `shadowColour "site 10.8%, site 14.2%, site 17.5%"` |
| 4 | The canvas draws the same stack as the page would | PASS | canvas `box-shadow` = three layers of the site shadow colour at alpha 0.108, 0.142, 0.175 |
| 5 | Add layer, reorder (Alt+Down) and delete keep the two lists aligned | PASS | after Add: 4 shapes, 4 colour entries; after Alt+Down: the first two layers swapped in BOTH lists; after Delete: 3 and 3 |
| 6 | Undo | PASS | one editor undo returned the block to its stored `subtle` value (the editor groups consecutive edits of one block, so it undoes them together) |
| 7 | Raw CSS: a real two-layer reference value | PASS | pasting `box-shadow: 0 30px 80px -30px rgba(0,0,0,.28), 0 2px 8px -2px rgba(0,0,0,.08);` saved `"0px 30px 80px -30px, 0px 2px 8px -2px"` with `"#000000 28%, #000000 8%"` |
| 8 | Raw CSS: bad text is refused and announced | PASS | `0 0 nonsense red;}body{` left the saved shadow unchanged, showed "That is not a valid box-shadow. Nothing was changed." and set `aria-invalid="true"` |
| 9 | A hand-edited stack is never replaced without asking | PASS | choosing Elevation 2 showed the confirm, changed nothing, moved focus to Replace; Keep mine left the value unchanged |
| 10 | Hover tab of a block with a hover colour and no hover shape | PASS | one colour and opacity row per Normal layer; choosing Site colour wrote only `shadowColourHover` (`"site 28%, #000000 8%"`), the shape was unchanged |
| 11 | The new set renders on real blocks | PASS | homepage: testimonials use Soft (alpha 0.06 then 0.10), trust-bar circles use Whisper (0.10 then 0.05), both on the site colour |

## Not measured

- Keyboard-only walk of the panel with a screen reader (the announcements are in the code and the ARIA state was read; no assistive technology was run).
- Blocks other than `sgs/container` were not opened in the editor; they mount the same component through the same `attrNames` call.
- A live menu with a submenu shadow (the drop-shadow chain): no stored content sets one, so it was checked by the PHP tests only (`tests/php/run-shadow-filter-standalone.php`, including a `color-mix` preset).
