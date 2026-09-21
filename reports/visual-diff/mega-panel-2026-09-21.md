# Live verification — sgs/mega-panel — 2026-09-21 (Wave 3C U-1 commit 4b, and the 4f-1 shadow set as it reaches the panel)

verdict: PASS
intent_capture_passed: true
source_sha: e86507d553f5d38f
commit_sha: 5abaa8981 (4b), deployed with 4f-1 steps 1 to 6 (c279c4aab, 1d5b3ac39)

> `source_sha` is the `visual-report-sha.py` recipe applied to the committed bytes of the three
> mega-panel files changed by 5abaa8981 (`block.json`, `edit.js`, `render.php`). The script reads the
> git index, which is empty after the commit, so it was recomputed from the commit with the same recipe.

## Environment and method

| Item | Value |
|---|---|
| Site | sandybrown canary. Plugin and theme deployed together with `build-deploy.py --target sandybrown --skip-build` (exit 0, 472 s, live motion probes green). Theme 1.5.91 |
| Fixture | page `qa-hdr-mega-dropdown-drawer` (menu item Brands) using mega post 1745 |
| Browser | real headed Chrome (chrome-devtools MCP), one window, page fully loaded, real pointer hover on the Brands button, viewport 1440x900 |
| Recipe (4b) | post 1745's `<!-- wp:sgs/mega-panel {` comment temporarily given `"surfaceBlur":"12px","surfaceSaturate":150,"surfaceOpacity":0.8` (and, for check 5, `"shadow":""`). The original 1,402 bytes were backed up first and restored afterwards (`matches: YES`) |

## Checks

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | Default panel keeps a shadow: the `floating` theme preset, 4 layers, on the site shadow colour | PASS | computed `box-shadow`: four layers of `color(srgb 0.2275 0.1804 0.1490 / a)` with alpha 0.04, 0.06, 0.12, 0.10 and offsets 2, 8, 24, 48px (the theme's `--wp--custom--shadow-colour` is `#3a2e26` on this site); `backdrop-filter none` |
| 2 | Surface recipe: blur and saturate | PASS | computed `backdrop-filter: saturate(1.5) blur(12px)` |
| 3 | Surface recipe: opacity multiplies the fill | PASS | `background-color` alpha 0.736 = 0.92 (the panel's own fill) x 0.8; `--sgs-mm-panel-bg: color-mix(in srgb, color-mix(in srgb, #fbf3dc 92%, transparent) 80%, transparent)` |
| 4 | Panel is usable while blurred | PASS | `inViewport true`, `elementFromPoint` at the panel centre is inside the panel |
| 5 | `shadow` empty means none | PASS | computed `box-shadow: none`, `backdrop-filter` unchanged |
| 6 | Council F5, mega and dropdown on a blurred header (`qa-hdr-surface`, header `backdrop-filter saturate(1.4) blur(18px)`) | PASS | Brands mega: inside the viewport, centre inside the panel; Shop dropdown: `position absolute`, inside the viewport, centre inside |
| 7 | Live lifted stylesheet carries the forced-colours fallback | PASS | `uploads/sgs-css/sgs-4014-*.css` holds `.sgs-mega-panel-7615cd52.wp-block-sgs-mega-panel{border-radius:20px;box-shadow:var(--wp--preset--shadow--floating);@media (forced-colors:active){&:not(:focus-visible){outline:1px solid CanvasText;outline-offset:-1px}};container-type:inline-size;}` and the declaration after the nested rule (`container-type`) is intact; the browser's CSSOM parsed it |
| 8 | Original content restored | PASS | `wp eval-file` restore reported `restored 1402 bytes, matches: YES`; the next page load shows the default panel |

## Not measured

- Forced-colours emulation on the live page: not run in this pass (the tool in use cannot set the mode, and a second browser was not opened). The nested rule was proved in a real browser with the mode emulated on a local page earlier the same day, and check 7 shows the same shape survives the live pipeline.
- The blurred-header F5 check of a non-modal drawer waits for 4c.
- Halcyon and Indus mega shadows are two-layer; they become exact after the converter change (4f-2).
