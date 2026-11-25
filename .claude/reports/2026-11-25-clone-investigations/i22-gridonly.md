# i22: can Grid do every job Flex does on sgs/trust-bar?

Read-only. Nothing saved to any site, repo or database. Scratch, scripts, raw numbers and screenshots: `E:\sgs-tmp\general-cloning\investigate\i22-gridonly\` (`run.mjs`, `run-drop.mjs`, `wrap.mjs`, results `r2.json`, `r3.json`, `r4fade.json`, `r5rm.json`, `r6class.json`, contact sheets in `shots\sheet-*.png`).

## Answer first

Grid can do the single-row jobs. It cannot do every job today. PROVEN: three jobs break or need new code if Flex goes. Recommendation: keep Flex in the picker and leave the three saved Flex bars alone.

| Job | Grid result |
|---|---|
| Static single row (Mama's header, Eye Care at wide widths) | Identical to Flex |
| Marquee (ticker) on its own track | Works, identical movement. The root layout only sets how wide the lane box is |
| "Hide extras" (drop what does not fit) | Does not work unchanged. Needs a script change to be identical |
| Wrapped rows, content-sized, orphan row centred | Cannot be written in Grid at all |
| Reduced-motion "swap" at phone width | Differs without a new rule |

## 1. The three saved Flex bars, Flex against Grid (PROVEN)

How measured: Mama's header and footer from the real `local-mamas` front end (GET only). Eye Care's bar from its saved attributes (backup `2026-11-05-r8/199.txt`) through the block renderer on `local-eye-care`, hosted in an unsaved, browser-rewritten Eye Care page with the block's own CSS and scripts, so the real fonts and the real drop and marquee code ran. The Grid version is injected CSS on the bar's inner band (`.sgs-trust-bar__content-band`, where the layout actually lives): `display:grid; grid-auto-flow:column; grid-auto-columns:auto` (or `max-content`), the same justify, align and gap. A second run also swapped the root class to `sgs-container--grid` so the Grid-only rules in `style.css` applied.

- Static rows: Mama's header at 1440, 1280, 1100 and 768 (three badges, centred, 5px gap), and Eye Care at 1440: every badge's left, top, width and height differ by 0.0px between Flex and Grid.
- Marquee running (Mama's footer at all five widths, Mama's header at 375, Eye Care at 768 and 375): marquee on and moving in both, track widths identical, every badge's offset within the track identical (0 to 0.1px). Same with the root class swapped to grid.
- Mama's home bar is already a Grid bar with a marquee at tablet and phone, and it runs (moving, 2 tracks).
- Eye Care's marquee layer is `belowBreakpoint: tablet`, which the runtime reads as 1023px and under, so 768 runs the marquee, not just phone. Drop only matters from 1024px up.

Caveat: Eye Care's saved `justifyContent` is the old string `"space-between"`. The current block wants an object, and the renderer rejected the string, so I rendered `{"desktop":"space-between"}`. UNPROVEN: whether current `main` drops the old saved string on the live front end (WordPress discards an invalid-type attribute), which would already change that bar. Worth a check before the next Eye Care deploy.

## 2. Hide extras and the marquee with Grid underneath

Marquee (PROVEN, code and test). `style.css` and `fx-marquee.css` give the track its own `display:flex; nowrap` row, and `fx-marquee.js::measure` compares the set width with the root's width, so the marquee never depended on the root being Flex. Two things do:
- Lane width. With `grid-auto-columns: max-content` the lane becomes content-wide: Mama's footer 3731px against a 1440px bar, Eye Care 2708px against 375px. The root's clip hides it, but the edge fade is a mask on the lane, so the right-hand fade disappears (screenshot `shots\sheet-fade-375.png`). With `auto` columns the lane is identical to Flex (327px at 375, 720px at 768). Use `auto`.
- The lane's `flex:1 1 0%; min-width:0` rule is inert in Grid; the `auto` column does that job.

Hide extras (PROVEN). `overflow-drop.js` hides whichever badge lands on a later row, so it needs rows. Eye Care at 1366, 1280, 1200, 1100 and 1024: Flex hides badge 4 (badges 3 and 4 at 1024).
- Grid, column flow, script unchanged: hides nothing; the badges run past the bar by 82px (1280), 162px (1200), 262px (1100) and 338px (1024).
- Grid with the same script changed to hide any badge whose right edge passes the bar's content edge (simulated in the page): the same badges hide, and every remaining badge is pixel-identical to Flex at all six widths.
- Explicit `repeat(4, max-content)` fails even with that change: hidden badges leave empty tracks, and space-between spreads them (left offsets off by up to 219px). It must be implicit column flow.
- `repeat(auto-fit, minmax(max-content, 1fr))` is not valid (`CSS.supports` is false); Chrome computes one column, and the unchanged script then hides 3 of 4 badges at every width.
- `auto` columns never drop: labels shrink and wrap to two lines (bar 37px to 52px). Equal `minmax(290px, 1fr)` columns drop by fit but make every badge the same width and wrap labels.

Reduced-motion "swap" (PROVEN differs): at 1440 Grid matches. At 375 it does not: Mama's header (left up to 170px off), footer (left 187px, height 66px off), Eye Care (Flex shows 1 badge; Grid shows 4 wrapped, bar 37px to 202px). The swap rule (`fx-marquee.css`) relies on a shrinking flex item (`min-width:0; max-width:100%`); in Grid it needs a `minmax(0,1fr)` column. The fix is a rule I did not write or test (UNPROVEN).

Wrapped rows (PROVEN, synthetic test `wrap.mjs`, 7 badges 90 to 260px wide in 700px): Flex wrap gives 3, 3 and 1 rows with the orphan centred (235 to 465px). In Grid, `repeat(auto-fill, max-content)` is invalid; `auto-fit` with `minmax(max-content, 1fr)` is invalid and gives 7 rows; column flow gives one row that overflows by 322px on the left and 1022px on the right. Only equal-width columns wrap, with a left-aligned orphan. This is the default behaviour of `overflowMode: wrap` and of a ticker outside its width range, and `i18-grid.out` found the same from the other side.

## 3. If Bean still wants Flex retired

One Grid control set would be:
1. Column sizing: Equal (columns per device, `repeat(N, minmax(0,1fr))`) or Fit content (one row, `auto` columns).
2. Gap, Justify content (Fit content), Justify items (Equal), Align items.
3. No "centre the last row" and no content-sized wrapping: Grid has no way to express them.

It also needs three code changes: `overflow-drop.js` measuring the right edge, a reduced-motion rule for Grid, and a lane rule for `auto` columns. Net gain: none visible, and Flex wrap-and-centre is lost. I would not do it.

Saved bars: keep the Flex render path for bars already saved as Flex (show Flex in the picker only on those, as already proposed for Default and Stack). Converting needs no attribute change except `layout`, but the header and footer are template parts, so they render on every Mama's page. Order of checks before any conversion: `render-scope.py` (says which Mama's pages change; expect all), then one `render-check.py --from local-mamas --only` run on the header and footer states at 375, 768 and 1440, plus reduced motion. Take `backup-remote-db.sh mamas-test <label>` before any script edits the live shop's content. Eye Care's bar lives only on `eye-care-test` (read-only reference), so it is never converted.

## Calls I made

- Used the real mirror front end for Mama's and a browser-rewritten Eye Care mirror page for Eye Care's bar, because `local-eye-care` holds no trust bar (post 199 exists only on `eye-care-test`); I took its latest repo backup (2026-11-05, `sites/eye-care-ward-end/build/backups/2026-11-05-r8/199.txt`), restored the lost pound and en-dash characters in two labels, and did not read the live site.
- Logged in to `local-eye-care` only to call the block renderer (no save; 0 writes attempted).
- The mirrors' trust-bar build is one commit behind `main` (the ticker default, `00eac2c01`); the three bars carry their own marquee layer or overflow mode, so it does not affect them.
- Simulated Grid with injected CSS on the band and, in a second run, a class swap; did not build a real saved Grid attribute set.
- The right-edge drop was a page-level simulation, not the shipped script.
- Mama's home bar (post 154, Grid) was only observed, not changed.
