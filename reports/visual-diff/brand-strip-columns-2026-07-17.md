---
block: brand-strip
date: 2026-07-17
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — `sgs/brand-strip` columns-per-device control + maxHeight cap — 2026-07-17

Replaces the fixed tile-size model (tile = `maxHeight × logo-scale`, which kept
tile SIZE constant and let the COUNT change with viewport width) with a
**columns-per-device** model that matches the reference Spectra Image Gallery:
a hard-set column COUNT per device, with tile SIZE = `strip-width ÷ columns`,
so widening the screen makes tiles *grow* (not multiply). A `maxHeight` cap
stops logos scaling to pixelated "stupid sizes" on ultra-wide screens.

Bean's ask: "the number of columns is not hard-set to 8 on desktop … expanding
the screen width on desktop, the tiles just get bigger, they don't increase in
number. We fix that by adding a max height as well to be sensible."

## What changed (all inside `src/blocks/brand-strip/`)

1. **`columnsDesktop` / `columnsTablet` / `columnsMobile`** (block.json numbers,
   defaults 8 / 4 / 2) → emitted as `--sgs-columns-desktop/tablet/mobile`.
   Three `RangeControl`s in the inspector (`Columns — desktop/tablet/mobile`).
2. **`maxHeight` default 80 → 180** and re-purposed as a genuine CAP (its real
   name). Relabelled control "Logo max height cap (px)", range 24–260.
3. **style.css tile sizing rewrite** — `.sgs-brand-strip` is now a query
   container (`container-type: inline-size`), so `100cqw` = the strip's own
   width (not the far-wider marquee track). Tile size:
   `min( (100cqw − (cols−1)×gap) / cols , cap )` where
   `cap = maxHeight + tilePadding×2 + tileBorder×2`. Logo height derives from
   the same `--sgs-tile-size`, so logo + tile grow in lock-step and cap together.
4. **`--sgs-logo-scale` removed** — the tablet/mobile media queries now switch
   `--sgs-columns` to the tablet/mobile value instead of a scale multiplier.

All emitted the no-inline way: `--var` values only (contract §A); zero new
inline property declarations; no dead controls (build gate green); no version
bump / no `deprecated.js` (D270). Container-query units + `min()` = pure CSS,
no JS measurement, so nothing is written as an inline CSS property.

## Reference behaviour vs clone (measured live, palestine-lives.org page 13)

Column count is now hard-set per device; tile SIZE follows strip-width ÷ columns:

| Viewport | `--sgs-columns` | strip width | tile width | logo height | overflow |
|---|---|---|---|---|---|
| 1440 | 8 | 1385px | 173px (=1385/8) | 153px | none |
| 1920 | 8 | 1400px (contentSize cap) | 174px (cap) | 154px | none |
| 768  | 4 | 713px  | 174px (cap) | 154px | none¹ |
| 375  | 2 | 320px  | 160px (=320/2) | 140px | none |

¹ Page has a pre-existing Services-section 768px overflow (diagnosed + deferred
per the session brief); the brand strip itself is 713px < 768px and does not
overflow.

**Behaviour proof:** widening 1440 → 1920 grows the tile (173 → capped 174) and
keeps 8 columns — it does NOT add tiles. This is the reference's behaviour; the
old model would have shown MORE tiles at 1920. The cap (174 at page-13's
maxHeight 154) engages so logos never pixelate.

## Match to the original "Our Brands" (1440, by eye + measurement)

- 8 columns across, tiles inset ~20px from the full-bleed teal band edges
  (side padding restored after the earlier align:full overshoot was reverted).
- Tile 173px / logo 153px ≈ original tile 174px / logo 155px.
- Heading gold underline flush under "Our Brands"; ~20px above heading.

Screenshots: `clone-ourbrands-1440-columns.png` (repo root, this session).

## Gates

- Build: `build-deploy.py --blocks-only --target palestine-lives` — OK (42s),
  fail-closed verify passed (HTTP 200, markers present).
- Dead-control guard + F3/F3b hardcoded-default gates: green (build succeeded).
- First-paint: fresh `?nc=` loads measured clean (correct columns, no CLS from
  the `--sgs-tile-cap` min-height reservation, no horizontal overflow).
