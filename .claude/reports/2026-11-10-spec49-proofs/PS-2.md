# PS-2: sizing, Fill, caption and WebKit video in three browsers (2026-11-10)

**Verdict: PASS WITH CHANGES.** Chrome, Firefox and WebKit, in standards mode, over local HTTP. The scripts and raw JSON are in this folder.

The main thread re-counted the raw files:
- `cases-results.json` has 138 rows; the only 3 failures are the open case, as expected.
- `nothing-results.json`: `width:fit-content` passes 108 of 108 browser cells, while the no-rule control fails 18 of 108.
- `fill2-results.json` with the fix: 9 of 10 layouts pass. The tenth is the negative control, a link without the new class.

| Test | Result |
|---|---|
| Every `sizing-cases.json` case, bare and in `figure > a` (18 cases), within 1px | Pass, except the open case |
| Open case: a helper with nothing sizing-related set | `width:fit-content` on the helper keeps 300x169 and centres at x=150. It passes in a 200px parent, a captioned figure, a flex row and column, a grid, and with a 1600px file |
| Fill, 13 layouts | Never 0; 12rem with no height. A stretched row beside 120px of text is raised to 192px (the floor is inherent); a fixed 80px row stays 80px |
| Fill inside a `<figure>` with a caption, or an `<a>` wrapper | Fails as written: the caption overflows by 20px, or the helper collapses. The `.sgs-fill-wrap` rules below make every variant pass |
| Caption rule | Pass, including a 60-character word in a 200px parent. Without `overflow-wrap:anywhere` the figure grows to 405px |
| WebKit video crop | `object-fit` and `object-position` at 20% 80% crop like `<img>`. Mean pixel difference 17.75 against 133.5 for a wrong position. WebM in WebKit is unverified |

## Spec changes

1. **§7.2, the open case.** A helper printed when nothing sizing-related resolves at a device also prints `width:fit-content`, so a small file keeps its own size and a large one stays within the space.
2. **§7.2 Fill, the floor.** The floor is real: a stretched row whose other items are shorter than 12rem is raised to 12rem. A fixed-height row smaller than 12rem is not; stretch wins.
3. **§7.2 Fill, wrappers.** A `<figure>` or `<a>` around a Fill helper gets `.sgs-fill-wrap`:
   - the wrapper: `display:flex; flex-direction:column; flex:1 1 auto; align-self:stretch; min-height:100%; min-width:0`
   - an `<a>` inside a figure: `flex:1 1 auto; display:flex; flex-direction:column; min-height:0`
   - the helper inside a wrapper: `min-height:0`.

   The band rule becomes `:where(.sgs-container__inner:has(> .sgs-media-box--fill, > .sgs-fill-wrap)){display:grid;grid-template-columns:minmax(0,1fr)}`.
4. **§7.2, the WebKit note.** "WebKit video `object-fit` was not tested" becomes "WebKit video `object-fit` and `object-position` crop the same as img (PS-2)".
5. **The fixture.** The open case gets `"root": { "width": "fit-content" }` and source `measured`. Add `helper-nothing-large-file` (600x337.5). Mark `helper-height-only` and the two responsive cases `measured`.
