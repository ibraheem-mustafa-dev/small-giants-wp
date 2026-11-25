# i10-underline: the enum readings gap, the three underline looks, and which earlier findings are stale

Read-only. Nothing in the repo, DB or any site was changed. Scratch and scripts: `E:\sgs-tmp\general-cloning\investigate\i10-underline\` (`scan.py`, `reach.py`, `rec.mjs`, `ambrows.json`). Every count below comes from the 70 fill reports dated 2026-11-24 in the three proof worktrees (`E:\sgs-tmp\wt-clone-mm`, `wt-clone-ec`, `wt-clone-in`; the repo's own `sites/*/build/qa/fill` folders hold none from that day) and from today's framework DB.

## Findings first

1. PROVEN: the earlier cause (a stale calibration cache) is wrong, and the main session's chain is right. Fill never reads `E:\sgs-route-cache` or `scripts/computed-route/cache`. `fill.mjs::calibrationLoader` calls `solve.mjs::calibrationFor`, which calls `lib/cache.mjs::loadCalibration`. That reads a file only if `<dir>/<block>.record.json[.gz]` exists, and neither cache folder holds one (checked: 0 and 0). Otherwise it calls `lib/setting-record.mjs::loadRecord`. The proof ran code that already had the retirement: `0eaf001ec`, `bd6f3f1a1` and `e988b3390` are all ancestors of the proof commit `fd06bc065` (2026-11-24 04:13; Indus ran on `c8b4a3f78`, 05:58). Main's resolver, record and site-look code has not changed since the proof (git log since then shows only retire-chore, trust-bar and scrim commits).
2. PROVEN: with the setting record, nothing ever supplies `enumReads`. The only writer is `lib/calibrate.mjs::foldReading` (the retired measurement). The readers are `lib/resolve-enum.mjs` (`holdsValue`, `mapTiers`) and `lib/resolve.mjs::resolveDiscovered` (`heldBySetting`). `lib/setting-record.mjs` has none. I called `loadRecord('sgs/button', null)`: no setting carries `enumReads`. All 18 checked-in test records under `tests/fixtures/records/` also carry none. `tests/resolve-enum.test.mjs` and `tests/layout-held-sibling.test.mjs` pass because they hand-write `enumReads` into their calibration objects, so a green suite cannot show that the real record lacks them.
3. PROVEN (by reading the code and by running the 11-24 data through it): what the missing readings do.
   - `holdsValue`: a setting with an enum list holds the draft keyword only by name or by a reading. Button `textDecoration` lists overline and line-through; `linkUnderline` lists none, always, hover, sweep. With no readings both return false for `underline`, `resolve.mjs` keeps the whole tie (`tied = holding.length ? holding : tied`) and raises `ambiguous`.
   - `mapTiers`: returns `{ tiers }` unchanged when `reads` is undefined, so a keyword the list does not hold is written raw instead of mapped to the value that paints it.
   - `heldBySetting`: sees no setting with readings, so a sibling property that another setting already paints counts as evidence for or against a value.

## Q1: reach, from the 11-24 Fill reports

`ambiguous` rows: 104 in 70 reports. Only 9 involve an enum list or `enumReads`:

| Rows | Block and settings | Where | Caused by missing readings? |
|---|---|---|---|
| 7 | `sgs/button`: `textDecoration` against `linkUnderline`, draft `underline` | Mama's footer (3: nodes 23, 30, 31), home (2), contact (1), template-checkout (1) | Yes, mechanism PROVEN (item 3). A run with readings settles it. |
| 2 | `sgs/trust-bar`: `layout=flex` against `layout=stack`, draft `display: flex` | Mama's template-checkout, Eye Care header | Probably: the tie-break `heldBySetting` is starved (`flexWrap`'s `nowrap` reading is what separates them). UNPROVEN until a run with readings. |

The other 95 ambiguous rows are ties between free-valued settings (nav-bar-menu `itemColour` against `featuredColour` 15, container text gradient against background gradient 27, cart radius 6, and so on). They have no value list, so `holdsValue` returns true for them and readings change nothing; that is the variant and same-part family from the hunt (H1-A, F4). Two more button rows (`labelCollapse=tablet` against `=all`, Indus drawer) come from `discovered` (css_property null) and are unrelated.

A consequence beyond ties, UNPROVEN as to cause but matching the mechanism: the draft's link underline also fails to reach the native setting where there is no tie. Mama's home puts `& a { text-decoration-line: underline; ... }` into Custom CSS on `sgs/text` (its `linkUnderline` is the only candidate on slot `a`, its list lacks `underline`, and `mapTiers` has no reading to translate it). Mama's footer puts `&:hover { text-decoration-line: underline; }` into Custom CSS on `sgs/business-info` (a `linkUnderline: hover` job). To settle it: rerun the footer and home Fill with readings supplied and see whether those rules disappear.

Enum writes with no mapping (the `mapTiers` fallback): of 3,143 tier values that the 11-24 Fill wrote into enum-listed settings with a CSS property, 948 are values the list does not hold, written raw. Biggest groups: button `contentAlign` `normal` 248, button `textTransform` `none` 171, button `borderStyle` `none` 94, hero `gridTemplateColumns` `none` 66, hero `alignItems` `normal` 66, container `minHeight` free lengths about 100, container `alignItems` `baseline` 42, hero `justifyContent` `normal` 36, testimonial `transitionEasing` cubic-bezier 12. Most are CSS initial values that Fill should not write at all (the hunt's H3-D, initial values written over a block's own layout), so 948 is an upper bound on what `mapTiers` could touch. Caution for whoever restores readings: the old calibration recorded only non-default values (`calibrate-markers.mjs` filters `v !== default`), so `mapTiers` with readings would turn "keyword equals the default" into a `shape` gap instead of a raw write. Restoring readings changes those rows: run render-scope first.

Where the list is not the CSS keywords (the case `mapTiers` exists for) the set is small. My crude test against `mdn-data` gives 431 of 1,244 enum-plus-property settings, but that over-counts (line-style and the `text-decoration` shorthand are defined in other grammars). The real ones I confirmed in the DB: `linkUnderline` (13 settings in 12 blocks), `contentWidth` (full, normal, wide on `max-width`, 24 blocks), button `textDecoration`, `pinEdge` (handled separately by `pinEdges`), `scrollbarStyle`, `labelRoll`.

### What can supply the readings: recommendation

Recommend the site look (render it and record per value), not the DB.

- The DB cannot answer. `setting_placements` holds `selector`, `props`, `state`, `kind` and `setting_values` (which values moved that declaration), but not what each value computes to. For `linkUnderline` on `sgs/button` the rows say "ROOT, text-decoration, rest, switched-on, values always, hover, none, sweep" and nothing separates `always` (underline) from `none` (none). `data/setting-records/button.json` holds the same fields. A DB-only rule such as "a switched-on setting never holds a CSS keyword" would be a hand rule over the facts, and it would also wrongly clear `textDecoration`, whose placement `setting_values` is `["underline"]` (the block does print `underline` there: the comment in `src/blocks/button/edit.js` says "a saved `underline` value is still printed when the Button underline is unset").
- The site look already renders every setting-value instance for settings with no CSS property (`discovered`). `lib/calibrate-instances.mjs::planInstances` also plans an instance per value for enum settings that have a CSS property (`calibrate-markers.mjs`, marker `enumValue`), but `tools/site-look-bridge.mjs::planFor` drops them (it keeps only `discover`, `forms`, `states`, `content`). So the change is small: the bridge passes those instances on as an `enums` list; `site_look.py::record_facts` renders them through the same runner (renders are cached by code version in `~/.cache/sgs-setting-record/`, 432 folders) and reads the setting's own placement paths (`record_paths`) at 375, 768 and 1440; it writes `settingFacts[setting].enumReads = { value: { longhand: { width: computed } } }`; `settingEntry` copies `facts.enumReads` onto the entry. That is exactly the shape `holdsValue`, `mapTiers` and `heldBySetting` already read. Record the default value's reading too (calibration left it out).
- Limit the instances to enum settings whose list holds a word the property does not accept, plus any setting a tie involves, so the build does not render all 5,006 value instances over 85 blocks (1,244 settings). The look is per client and per block used, so a footer run pays only for the blocks the footer contains.
- Add state. `enumReads` as built was rest only. The look can already hold hover and focus (`Reader.style(job, held)`, `HELD`), so record readings per state; without that a draft hover underline cannot map to `linkUnderline: hover`.
- Add a test that reads the real record, not a hand-written one: `loadRecord('sgs/button', <client>).settings.linkUnderline.enumReads.always['text-decoration-line']` equals `underline` at the three widths. That check can fail.

## Q2: how the clone tells the three underline looks apart

Bean's picture is close, with one correction. The plain underline lives in two places. `textDecoration` is the keyword on the block's wrapper or text element (underline, line-through, overline) and applies to all text in it. `linkUnderline` has four values, and `always` and `hover` are also plain native underlines (`text-decoration-line: underline`, with optional thickness, colour, offset and a hover colour). Only `sweep` is the custom animated line: a `linear-gradient` background on the link (on `.sgs-button__label` for a button) whose `background-size` grows from 0 to 100% on hover and keyboard focus, with a `transition` on `background-size`. Source: `plugins/sgs-blocks/includes/helpers-link-underline.php::sgs_link_underline_css` and `::sgs_link_underline_self_css`. So there are three looks: wrapper decoration, link plain underline, link sweep.

What each `linkUnderline` value renders:
- empty: nothing printed, the theme's own link underline stays.
- `none`: `text-decoration-line: none` on the link, plus a forced-colours rule that underlines again.
- `always`: `underline` at rest, hover and focus.
- `hover`: `none` at rest, `underline` on `:hover` and `:focus-visible`.
- `sweep`: `none` at rest, background line at size `0 <thickness>`, growing to `100%` on hover and focus-visible, transition on `background-size`, `transition: none` under reduced motion. The block skips it when a button has a hover fill, gradient or image, or a link has a gradient text colour.

`sgs/button` is the only block where `textDecoration` and `linkUnderline` share an element. Its `textDecoration` list is overline and line-through only (the editor hides `underline`; when `linkUnderline` is set, `render.php` drops `textDecoration` and `textDecorationHover`). On the other 12 blocks (heading, text, business-info, icon-list, label, collapsible-text, commerce-note, product-card `descLinkUnderline`, quote `attributionLinkUnderline`, testimonial `linkUnderline` and `quoteLinkUnderline`, timeline `descriptionLinkUnderline`) `linkUnderline` paints the nested `a` and `textDecoration` (180 settings list `underline`) paints the wrapper, so their slots differ and they do not tie.

What Fill's draft read already collects (`lib/fill-read-collect.mjs`, `scripts/parity/lib/collect.mjs`):
- Rest: `text-decoration-line`, colour, thickness and `text-underline-offset`, read on the text-bearing element after climbing to the nearest ancestor that draws a line (a link's own line is not credited to a wrapper). Also rest `background-image` and `transition-duration`, `-delay`, `-timing-function`.
- Hover (`HOVER_PROPS`): `text-decoration-line`, `text-decoration-color`, plus thickness (`HOVER_READ_PROPS`). Focus (`FOCUS_PROPS`) and active: `text-decoration-line`. A hover read happens only for nodes whose draft record gives a hover look (`lib/apply-hover.mjs::extrasOf`).
- Pseudo-elements (`PSEUDO_PROPS`): `content`, background colour and image, border-image, opacity, colour, border, `box-shadow`, `transform`, `width`, `height`, at rest only.
- Each slot is read separately (root and `a` give separate answers), so "wrapper text underlined" against "only the link underlined" is available.

Missing for the sweep: `background-size`, `background-position` and `background-repeat` (rest and hover; `background-size` was read only by the retired calibration, `CAL_EXTRA_PROPS`); `background-image` and `transition-property` in the hover read; any hover read of `::before` and `::after`; and the transition entry for a named property. `scripts/parity/lib/transitions.mjs::parseTransitions` already parses entries per property (and maps `background` to `background-size`) but only for the parity compare, not for Fill's resolver. UNPROVEN: whether draft hover rules written in a stylesheet (as against `style-hover` attributes) reach `extrasOf`. Mama's draft has 24 plain `text-decoration:underline`, one `style-hover="text-decoration:underline"` and no sweep.

Decision rule (what a developer implements; "link" is the `a` slot, or the root slot for a button):

| # | Draft signals | Write | Blocks |
|---|---|---|---|
| 1 | Link at rest `underline`, hover `underline` (or not read), no growing background line | `linkUnderline: always`; colour, thickness, offset from the rest read into `linkUnderlineColour`, `...Thickness`, `...Offset`; a different hover colour into `...ColourHover` | all 13 settings above |
| 2 | Link at rest `none`, hover and focus `underline` | `linkUnderline: hover` (hover colour as row 1) | all 13 |
| 3 | Link at rest `none`, a line from a gradient `background-image` with `background-size` 0 at rest and full at hover, or a `::before` or `::after` line whose width or `scaleX` grows on hover, and a `transition` on that property | `linkUnderline: sweep` (the block draws the background version; the offset setting does not apply) | all 13; needs the missing reads |
| 4 | Link at rest `none` where the block's default look underlines links (the theme's) | `linkUnderline: none` | all 13 (compare with the site look's default for `a`) |
| 5 | Link at rest `underline`, hover `none` | no setting holds it (`always` re-underlines on hover): Custom CSS gap, listed | all |
| 6 | Wrapper's own text (root slot, non-link words) at rest `underline`, line-through or overline | `textDecoration` (or `itemTextDecoration` and the like on icon-list, product-card, nav menus) | every block that lists the keyword (180 settings); on `sgs/button` only overline and line-through |
| 7 | Button root at rest `underline` | `linkUnderline: always` (button `textDecoration` never lists `underline`, by design) | `sgs/button` |
| 8 | Button `textDecoration` overline or line-through | `textDecoration` | `sgs/button` |
| 9 | Draft hover underline only, no rest line, on a button | `linkUnderline: hover` (not the legacy `textDecorationHover`, which the block ignores once `linkUnderline` is set) | `sgs/button` |

Rows 1, 2 and 4 to 9 need only the reads Fill already has plus the `enumReads` fix (rows 1 and 7 need `underline` to map to `always`; rows 2 and 9 need the hover-state readings). Row 3 needs the missing reads. Row 6 against row 1 on non-button blocks relies on the root and `a` slots both being read, which happens when a finder names them; UNPROVEN on `sgs/text`, whose Mama's home row went to Custom CSS.

## Q3: stale-data audit of the other reports

Checked against main at `9113bc0e4`, the proof commits `fd06bc065` and `c8b4a3f78`, and the framework DB, which was reseeded 2026-11-24 14:47 (after most proof runs at 05:38 to 08:40, before the footer and drawer runs at 17:40 to 18:01). The old cache files (`E:\sgs-route-cache`, `scripts/computed-route/cache`, both 2026-11-15) are unread, so no report below rests on them; the table lists what rests on calibration data, a reseeded DB or a frozen record.

| Report | Claim | Status | Reason |
|---|---|---|---|
| i7 | The footer underline tie is "calibration freshness", caused by `E:\sgs-route-cache\button.json` (4,434 settings, no `enumReads`) | INVALID as stated | Fill does not read that cache (finding 1). The tie and its mechanism are real; the cause is that the setting record never carries `enumReads`. |
| i7 | "The tie rule works when readings exist; fix layer is calibration freshness" | Half valid | Works with readings (unit test, hand-made). The fix is a reading supplier in the site look, not a recalibration. |
| i7 | "UNPROVEN: that the 11-24 run read that cache" | Settled | Refuted by the loader. |
| i7 | 952 hits and 14 class (a) or (b) combinations from `setting_placements` | Needs a re-check of the numbers | Read from the DB as it stood on 11-24 before the 14:47 reseed; the method reads the DB and record as they stand. The reseed was for the trust-bar ticker default, so few rows should move. |
| i7 | Button underline pair: `always` plain, `sweep` background line, "no Fill reader looks for the sweep" | Valid | Confirmed against `helpers-link-underline.php` and the read lists above. |
| i7 | The `textDecoration` against `linkUnderline` hover pair labelled "rest value in state" | Valid as the report's own correction | Noted in the report. |
| i2 | Nine surfaces stopped by the closing gate; counts from `gateRows` over each surface's saved plan file | Valid | Counts matched the logs; the gate is code on main. |
| i2 item 3 | `tileCheckSize` collapses to one `property` (`height`) in `loadRecord('sgs/form-field-tiles','indus-foods')` | Valid | The report reproduced it from the proof commit; `settingEntry` is unchanged since. |
| i2 item 8 | Mama's my-account: six hover shadow settings have no record entry, three in `untestedStates` | Needs a re-check | The report says it "reads today's DB, not the proof's". The proof ran at 06:12; the DB was reseeded at 14:47. Re-run against the proof-date DB or accept the reseed. |
| i2 | 13 unresolved rows; 104 no-setting emit sites | Valid | Source count plus saved plans. |
| i5 | Today's record returns `elements` but no `parts`; `calPartsFor` passes `parts: {}`; `partModel` gives 27 groups, 0 with words | Valid for main | Record code unchanged since the proof. |
| i5 | "The 8 to 3 to 1 to 0 in commit messages were measured against the retired calibration" | Valid | Those commits predate `0eaf001ec`. |
| i5 | 677 of 1,092 placed parts (62%) absent from Mama's look; 2,391 of 6,054 settings | Needs a re-check | Counted from a `site-look` folder of that date and the DB. Looks are keyed by code hash and client; the renderer changed at 14:39 (trust bar) and the DB at 14:47; the repo's own `site-look/mamas-munches-redesign` now holds only `nav-bar-menu.json`. The ratio follows from the fixtures and should hold; recount the exact numbers on a rebuilt look. |
| i5 | Framework DB tables give almost no nesting (`block_part_order` 512 rows, 12% of parts with an ancestor selector) | Valid | DB facts, unaffected by the trust-bar reseed. |
| i5 | Proof reproductions (Mama's drawer 8 problems, lens flow 10, Eye Care drawer 3 against the file's 2) | Valid | Run on the proof worktree's own code. |
| i6 | "`visibleCount` and `countSettings` port straight (the DB still ties `slidesVisible` to `css_property flex`, and calibration still has the slot)" | Invalid wording, re-check | There is no calibration. `loadRecord('sgs/testimonial-slider', null).settings.slidesVisible` has property `flex-grow` (I ran it), not `flex`. Check the restore reads the record's entry, not the old `css_property = 'flex'` query. |
| i6 | Every ABSENT or PRESENT verdict | Valid | Code on main, run against the proof's saved fact records of 11-24, not against calibration. |
| i6 | Old route library extracted from `0ea1a6cb2~1` for comparison | Valid | A deliberate historical comparison. |
| i1 | Each branch's tests red or green; 17 stale mutation `find` strings | Valid | Run on branch code. Tests read the 18 checked-in records under `tests/fixtures/records` (written 2026-11-23, no `enumReads`), frozen by design (`tools/record-fixtures.mjs`: "holds still while the database and the looks move on"), so a pass says nothing about the live DB. |
| i1 | Seven browser tests not run | Open | Not stale, not done. |

## Calls I made

- Counted the 70 reports in the three proof worktrees; the footer reports (17:40 and later) are on the same route code as the earlier ones.
- Treated `layout=flex` against `layout=stack` as enum-reading related by reading `heldBySetting`, not by a run; labelled UNPROVEN.
- Measured "enum writes not in the list" against the DB's `enum_values`, which are the editor controls' lists. A setting whose server accepts more than its list (button `textDecoration` accepts `underline`) counts as "not in list", so 948 is an upper bound.
- Did not run Fill or the site-look builder (heavy: Python and Playwright); only `loadRecord('...', null)`, which reads the DB and builds no look.
- I created and deleted one scratch file in the route folder (`scripts/computed-route/.i10-rec.mjs`, untracked) while fixing an import path; `git status` shows nothing left.
- Kept Bean's wording as the starting point and changed one point: `always` and `hover` are plain underlines; only `sweep` is the custom animated line.
