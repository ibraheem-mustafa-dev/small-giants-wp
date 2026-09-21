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

---

# Live verification: dark-background shadows (U-1 4f, follow-on) - 2026-09-22

verdict: PASS with two defects found and fixed during the run, and one known gap (below)
intent_capture_passed: true
commit_sha: ca5621aa6 (feature), 662b7235f (enqueue fix), ba01058ee (light-reset colour fix)
source files (not under `src/blocks/container/`, so no container `source_sha`): `includes/class-sgs-container-wrapper.php` (adds `sgs-on-dark` / `sgs-on-light`), `includes/helpers-shadow-dark.php`, `includes/shadow-dark-assets.php`, `includes/helpers-colour-wcag.php`, theme `functions.php` + `assets/css/dark-mode.css`.

## Environment and method
- Site: eye-care-test (`darkcyan-grouse-898606.hostingersite.com`), theme 1.5.93, plugin deployed with `--payload plugins/sgs-blocks/src/blocks/google-reviews/ --skip-gate-full`. That ships another session's UNFINISHED reviews block to this test site only (not to the canary). `gate:full` failed on that block's files only: 3 pytest failures all name `sgs/google-reviews`; the inspector ratchet was 27 against 25 with 3 findings in google-reviews files (24 without them); the third gate passed.
- Fixture: page 53 `/qa-dark-shadow/`: a `#121212` container (own shadow `floating`) holding a `#1E1E1E` card (`lifted`), a `#FFFFFF` card (`lifted`) with a `#FFFFFF` child (`lifted`), and a separate `#F3F0E8` container holding a `#FFFFFF` card (`lifted`). Built with `wp_update_post( wp_slash( ... ) )`.
- One headed Chrome window (chrome-devtools, page fully loaded, `readyState complete`), 1440x900. Values are `getComputedStyle().boxShadow`.

## Defects found by this run (both fixed, redeployed, re-read)
1. The dark stylesheet never reached the page. The wrapper added `sgs-on-dark` but the handle was registered on `enqueue_block_assets`, which runs after a block theme has rendered the page content, so the enqueue silently did nothing. Fixed by registering on demand (`662b7235f`). Before the fix the dark card showed the ordinary shadow; after, the dark one.
2. A light container on a page that also has a dark container had its site shadow colour forced to black by the reset (the light card went from `#1A202C` layers to `#000000` layers). Fixed: the reset now restores `settings.custom.shadowColour` (palette variable or hex only, else black) (`ba01058ee`).

## Results (after both fixes)
| # | Check | Result | Measured |
|---|---|---|---|
| 1 | Wrapper classes | PASS | `sgs-on-dark` on the `#121212` and `#1E1E1E` containers; `sgs-on-light` on the `#FFFFFF` and `#F3F0E8` containers |
| 2 | Dark card (`lifted` in a dark container) | PASS | ring first: `color(srgb 0.9098 0.9098 0.9098 / 0.12) 0 0 0 1px`, then black at 0.11, 0.176, 0.264 (the light-mode values 0.05, 0.08, 0.12 times 2.2) |
| 3 | Same preset in a light container | PASS | the original layers on the site colour: `color(srgb 0.1019 0.1255 0.1725 / 0.05) 0 1px 2px`, `/ 0.08 ... 4px 8px -2px`, `/ 0.12 ... 12px 24px -6px` |
| 4 | The dark container's OWN shadow | PASS | the normal `floating` layers on the site colour; a container's own shadow is not changed by its own class |
| 5 | A light card directly in a dark container | PASS (by design) | its own shadow follows its dark parent (ring plus black); the reset applies to its children |
| 6 | The child of that light card | PASS | reset to the original site-colour layers (same values as row 3) |
| 7 | Site-wide dark mode | PASS | option `sgs_dark_mode_enabled` set to 1, `data-theme="dark"` set, a probe using `--wp--preset--shadow--lifted` on `body` changed from the light-mode layers to ring plus black 0.11 / 0.176 / 0.264; removing the attribute restored the original. The two root rules (`[data-theme="dark"]` and the system-preference one) are in the page's stylesheets. The option did not exist before, so it was deleted afterwards (verified absent). |
| 8 | Screenshot | PASS | saved locally at `reports/visual-diff/assets/container-dark-shadow-2026-09-22.png` (git-ignored, not committed; taken before the nested child was added to the fixture): the dark card shows a visible hairline edge against `#121212` |

## Known gap and not measured
- In site dark mode, a container with a hard-coded LIGHT background still resets its children to the site colour, which dark mode flips to a light text colour, so a white card in it gets a near-invisible light glow (measured: `#E8E8E8` at 0.05 / 0.08 / 0.12 on a `#F3F0E8` container). Not fixed: it is a deliberate light panel inside a dark theme; the fix is one more rule (`:root[data-theme="dark"] .sgs-on-light>*` resetting to black), and needs Bean's call.
- The editor canvas does not get `sgs-on-dark` / `sgs-on-light`, so a dark container's children show the ordinary shadows in the editor; the page shows the dark variants.
- A background set by anything other than `backgroundColour` (an overlay, a photo, a gradient) is not detected.
- The 2.2x strength and the 12% ring were tuned by eye on one scaffold; here they were measured, not judged. Bean's eye on the screenshot is still owed (R-31-13).
- Forced-colours emulation on the live page was not run.
