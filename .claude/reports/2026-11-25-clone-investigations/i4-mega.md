# i4-mega: Eye Care's mega menus, hand-built versus cloned

Read-only throughout. Nothing was changed in the repo, any database or any site.

## Answer in brief

- MP2 is the **Brands** menu (hand-built post 176, `mega-brands`): the "Most asked for" tiles. MP3 is the column titles and link lists of the **Help** (186) and **Sunglasses** (165) menus, plus Brands' "All 40 brands" list. Lenses (183) is a fourth menu and is fine except for one small difference.
- The hand-built tiles are no longer text-only. They began as text-only tiles in one `sgs/card-grid` (commit `9489a0365`, 2026-09-29) and were swapped to brand-logo images a day later (`2d3ea8b2e`) from an earlier draft. The current draft (28 October export) has no logos: its tiles are a serif name over "48 frames". So the hand-built panel is the right block for the draft's tiles, but shows a look the current draft does not.
- Column titles: the clone's choice (label) is a code inconsistency, not a taste. The framework's own mega column template is a heading plus an icon list, and the code already knows these are columns for one purpose but not the other. I recommend headings.
- Links: I recommend keeping the icon list. The hand-built buttons were a September workaround for two gaps that have since closed.
- Side find: on Help, Lenses and Sunglasses the proof's Fill set the panel's `style` to `cards`. That makes each column a bordered, rounded box, which the draft does not draw.

## 1. What the draft draws (`sites/eye-care-ward-end/handoff/Eye Care Birmingham.dc.html`, the `sgs-mega-menu` element)

One full-width panel (white, hairline bottom border, soft shadow, 1440px band, padding 36/52/40) with four states.

| Menu | What the draft draws |
|---|---|
| Sunglasses | Three columns. "By style": a small caps title over a two-column grid of 12 plain links. "Shop by": a title over six stacked links. A picture promo card (photo, dark fade, "Prescription sunglasses / Any frame here, from £59") linking to Lenses. |
| Brands | "Most asked for": caps title over a five-column hairline grid of 12 tiles. Each tile is one link, no picture: brand name in uppercase serif, "48 frames" beneath. Then "All 40 brands": caps title over an auto-fill grid of 40 plain links. |
| Lenses | A hairline grid of four whole-card links, each a caps kicker ("Single vision"), a large serif price, and a short description. |
| Help | Three columns, each a caps title over three stacked links (WhatsApp in green). |

The column titles are `<div>` elements with caps and wide tracking, not `h` tags. The links are bare `<a>`.

## 2. How the hand-built site builds each (live check: `wp post get` on posts 176, 165, 183, 186 matches the saved copy in `E:\sgs-tmp\general-cloning\reference\eye-care-test\saved-blocks.txt` block for block)

All four: `sgs/mega-panel` (default style `columns`, `maxWidth` 1440px, `panelPadding` 36/52/40, white, 1px bottom border, 12% shadow) holding `sgs/mega-group` columns.

**Brands** (176), trimmed:
```
mega-panel
  mega-group
    container(stack)
      heading h3 "Most asked for"   (Outfit 11.5px, caps, .2em)
      container(hairline holder: border + background)
        card-grid  12 items {title:"", subtitle:"48 frames", link:/shop/?brands=ray-ban, logo image}
                   columns 5/3/2, gap 1px, titleFontFamily heading, titleTextTransform uppercase, hover #F7F4EF
      heading h3 "All 40 brands"
      container(grid auto-fill 150px)
        button x40  inheritStyle link, url /shop/?brands=<slug>
```
**Help** (186): `mega-group` x3, each `container(stack) > heading h3 + container(stack) > button x3` (`inheritStyle: link`, `colourText: success` on WhatsApp). **Sunglasses** (165): `mega-group` x3 (child sizing fixed 31.1%, fill, fixed 34%). Columns are heading h3 plus buttons (the style list in a 2-column grid container). The promo is a flex container with a background photo, a gradient overlay, a heading and a text. **Lenses** (183): `mega-group` x4 with `url`, each `container > label (kicker) + heading h3 (price, serif 26px) + text`.

Totals on the hand-built site: Brands 40 buttons, 1 card-grid, 2 headings; Help 9 buttons, 3 headings; Sunglasses 18 buttons, 3 headings; Lenses 4 labels, 4 headings, 4 texts. No `sgs/icon-list` in any of them. Indus's hand-built panels also use none.

## 3. What the clone built

Source: the proof's Filled trees in `E:\sgs-tmp\wt-clone-ec\sites\eye-care-ward-end\build\trees\sgs_mega_menu\` and the skeletons in `E:\sgs-tmp\general-cloning\records\baseline-c8b4a3f78\eye-care-ward-end\`.

**Brands:** `mega-panel > mega-group > label "Most asked for"`, then `container(grid, 5 columns) > 12 x container(stack) > label (name) + text (count)`, then `label "All 40 brands"` and one `icon-list` of 40 items.

**Help:** `mega-group` x3, each `label` title plus one `icon-list` (3 items).

**Sunglasses:** two `mega-group` columns (`label` + `icon-list`) and a `mega-aside` with two `decorative-image` layers, a heading and a text.

**Lenses:** four `mega-group`, each `label + text + text`.

Side by side, for Bean:

| | Hand-built | Clone | Closer to the draft? |
|---|---|---|---|
| Brands tiles | 1 card grid, 12 items (logo plus count) | 12 separate boxes, each a name and a count (36 blocks) | Clone matches the draft's text tiles; hand-built matches an older draft with logos |
| Column titles | `heading` (an h3, so a screen reader can jump between columns) | `label` (a span, no heading role) | Same look; hand-built better for structure |
| Link lists | one `button` per link (40 on Brands) | one `icon-list` per column | Same look; clone has far fewer blocks |
| Panel band | 1440px band, padding 36/52/40 | `maxWidth` none, padding 0 | Hand-built (known: Fill does not yet read the wrapper) |
| Panel style | `columns` | `cards` on Help, Lenses, Sunglasses | Hand-built (clone draws bordered rounded boxes) |
| Lenses price | `heading` h3 | `text` | Equal look |

Further differences in the clone, found while reading its trees (each listed once, not chased):

- PROVEN, Help/Lenses/Sunglasses: `fill-report.md` for Help has the row `.sgs-mega-panel__content | display | style | cards`, and all three trees carry `"style": "cards"`. The live parity report then shows each Help column with 1px border, 15px radius and 17px padding where the draft has none, and two 664px tracks where the draft has three equal columns. This is the known family "a display read switches a render-branch setting" (plan, "Route faults to check on the proof clones"). Brands does not get it.
- PROVEN, Sunglasses "By style": the two-column list was written as a pixel residual (`grid-template-columns: 198px 198px`, and `20.5px 20.5px` below 384px) in `sgsCustomCss`, not as `sgs/icon-list`'s `listColumns` setting. `listColumns` is in `block.json` and the framework DB (`css_property` `grid-template-columns`, element `wrapper`). The 20.5px phone value is plainly wrong. Why Fill did not use the setting is UNPROVEN.
- Brands: the 40 list items and the 12 tiles carry no address in the Filled tree (the draft's links are click handlers, so Fill raised 40 handover rows). The hand-built links go to `/shop/?brands=<slug>`. That is the same under either block choice.

## 4. Which skeleton rule chose each, and what the draft gives it

**Brands tiles as containers** (rule `wholeCardLink` in `data/skeleton-decisions.json`, shown as the verdict on `Root/76#0` in `mega-menu-brands.proposal.json`): "a link holding two or more pieces of text is a container whose whole box is the link". The tile grid itself (`Root/74#0`) has no rule at all (a generic wrapper). The picture-tile rule that does produce `sgs/card-grid` (`rules.pictureTileGrid`, `lib/skeleton-picture-tiles.mjs`) needs at least half the tiles to paint a picture and so does not fire for text tiles. What the draft gives any rule: a `sc-for` loop of 12 whole-link tiles, parent holding only the tiles, each tile two text spans, no picture, five hairline-gap tracks.

**Column titles as labels** (`rules.label`, applied in `lib/skeleton-rules.mjs`; caps or wide tracking, at most four words): the label rule is skipped only when `lib/skeleton-classify.mjs::isColumnLabel` says the element is a column title, and that needs the links to be the title's direct siblings. In Help and Sunglasses the links sit in one wrapper `div` beside the title, so `isColumnLabel` is false and the caps title becomes a label. Meanwhile `lib/skeleton-panel-rules.mjs::headedRun` (the rule that makes the column a `sgs/mega-group`) accepts exactly one such wrapper. The two checks disagree on the same shape. This is PROVEN by reading both functions against the draft markup and the proposal rows (`Root/93#0` etc. verdict "rule label"); the counterfactual (it would become a heading) is UNPROVEN until the function is changed and the panel proposed again. `rules.columnHeading` (a column title in a header or footer row is a heading "whatever its type style") only covers site-header and site-footer rows, so a mega panel never reaches it.

**Link lists as icon lists** (`structural.linkList`, `lib/skeleton-write-units.mjs::unitsOf` and `buildList`): "a run of two or more bare text links, one above the next, is one list block", the block being the DB's `html_tag_to_core_block` entry for `ul` (`sgs/icon-list`).

## Evidence both ways

**Card grid for text tiles (MP2)**
- For: the hand-built panel was a text-tile card grid first (`9489a0365` rebuilt the Brands panel as one card grid and fixed `sgs/card-grid` so text-only cards draw no empty image band, naming "brand tiles, info boxes"). The framework's own `brands` panel variant hosts a `sgs/card-grid` for brand tiles (`mega-panel/edit.js::BRANDS_TEMPLATE`). One block with an `items` list replaces 36 blocks, 12 low-confidence rows (the count spans score 0.25) and per-tile paint written 12 times.
- Against: the draft draws plain links in a grid; nothing in it says "card grid". Bean's 2026-10-21 approval is for a growing panel child as `sgs/container` (`rules.megaContainer`), which concerns the panel column, not the tile block. The hand-built tiles now show logos, which the current draft does not, so the hand-built panel is not a pure reference. A rule must also hold to two text lines (card-grid has title and subtitle only), which excludes Lenses' three-line cards.
- Reach (my scan of all 66 saved skeletons, three clients): the shape "three or more whole-link tiles in one parent, each only two text leaves" matches one place, Eye Care Brands. Eye Care Lenses (four tiles, three text leaves) matches the looser "text-only whole-link tiles" shape. Indus's 17 other tile runs hold pictures or nested boxes, and Mama's drawer tiles have an icon. A narrow rule changes one surface today.

**Headings for column titles (MP3, part 1)**
- For: the framework's own `sgs/mega-group` template is `sgs/heading` h3 plus `sgs/icon-list` (`mega-group/edit.js::TEMPLATE`), and the panel's preset eyebrow style targets headings directly under a group. The hand-built site uses an h3 for all seven column titles on Help, Sunglasses and Brands, and Bean's `columnHeading` precedent says a column title is a heading whatever its type style. `isColumnLabel` versus `headedRun` is the same shape judged two ways.
- Against: the draft's titles are `div`s; a heading is a structural reading the draft does not state. Eye Care's Lenses kickers are real kickers, and the hand-built site correctly uses `sgs/label` there. A rule must tell them apart: a title followed by a link run or a grid of tiles is a column title; a label followed by other text is a kicker. The draft does carry that signal.
- Reach: the same-shape "label directly above `icon-list`" appears in 3 saved surfaces, all Eye Care megas (Brands 1, Help 3, Sunglasses 2). Elsewhere footers merge the title into the list's own heading (5 icon lists carry a heading). `isColumnLabel` fires once in all 66 skeletons (Mama's cart).

**Buttons versus icon list for links (MP3, part 2)**
- For buttons: the hand-built site uses them; one button can carry its own colour (WhatsApp is green).
- Against: the hand-built `build/qa/parity/mapping-mega-brands-lenses.md` gives its reasons: `sgs/icon-list` then had no columns control, and the mega panel paints `.sgs-icon-list__item` chips in the default style. `listColumns` now exists (added by `4d5a62316`, 2026-11-07, after the hand-built panels), so the first reason is gone. The second still holds in the `columns` style (padding 11px 12px, radius 13px, `mega-panel/render.php`) but not in `cards` (padding 0). The draft's links are bare text links, which `structural.linkList` was written for; a button is an action block and gives 40 blocks on Brands where the list gives one. The same hand-built site uses `icon-list` for its footer link runs. Buttons are not more faithful; they are the hand-builder's workaround.

## Recommendation (ranked)

1. **Fix the column-title mismatch** (align `isColumnLabel` with `headedRun`, or make the first leaf of a `mega-group` a heading when a link run or tile grid follows). It is a code inconsistency with a framework template and a Bean precedent behind it, it changes 6 titles on one client, and the kicker case is protected by the "followed by other text" test. Needs Bean's one-line yes because it overrides the label rule for this case.
2. **Build a narrow text-tile rule to `sgs/card-grid`** (loop of whole-link tiles, at most two text leaves, no picture, minimum tile count). Reasonable but it is a block-choice ruling: the draft draws a hairline grid either way, so this is a decision on editability, and it reaches one surface. Bean's decision.
3. **Keep icon list for link runs.** Do not build a buttons rule. Instead fix the two things around it: write `listColumns` for the two-column list (no pixel residual), and stop the `style: cards` write.
4. **Stop the `cards` style write and read the panel band** (the plan's existing "Fill reads the wrapper" item). These change what a clone looks like more than 1 to 3 do.

## Calls I made

- Treated "MP2" and "MP3" as the plan's two bullets under "Left for the findings pack" (the labels are not written anywhere in the repo).
- Used the 2026-11-24 baseline skeletons and the 2026-11-24 reclone's Filled trees as "the clone", since the scratch site itself is not reachable for a read.
- Read the hand-built posts over SSH with `wp post get` (reads only); the site's REST certificate has expired, so REST was refused. I wrote four scratch files under the server's `/tmp` for the read and deleted them afterwards (checked).
- Did not run any propose or Fill with a changed rule, so the counterfactuals above are marked UNPROVEN.
- Scan results come from `E:\sgs-tmp\general-cloning\investigate\i4-mega\scan.py` and `sk.py`, `tr.py` (counts over the 66 saved skeletons in `records\baseline-c8b4a3f78`).
