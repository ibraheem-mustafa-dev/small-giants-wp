# i14-moves: where each single-control panel would go under Bean's placement rule

Read-only. Nothing in the repo, the framework database or a site was changed. Everything is under `E:\sgs-tmp\general-cloning\investigate\i14-moves\`. The full list Bean reads is `moves.md` (grouped by block, one line per move). The script is `moves.py` (the rule), `report.py` (writes `moves.md`), `lone_map.py` (the hand-resolved label-to-attribute map), `srcmap.py` (source reader) and `stats.py` (the counts below). Rerun with `python report.py` (about a minute).

## 1. Findings

1. **The census count of 162 is really about 90 controls that move.** The earlier report counts 162 ordinary panels (my count from the same census is 165; the 3 difference is not traceable). Of the 180 non-universal single-control panels (the 196 minus 16 core "Styles" switchers that hold no setting):
   - 76 are real single controls the rule moves: 55 to Behaviour, 11 to Settings, 10 into an existing panel (Layout 6, Typography, Appearance, List layout, Entry date typography; one of the Layout moves is the trust bar's duplicate Columns).
   - 36 are not truly single: the lead control opens several more when switched on (a "Show X" toggle, a "Source" select), so moving the lead alone would strand its companions. Rule outcome is still shown in `moves.md`, marked GROUP.
   - 30 are shared feature panels (16 shadow control, 14 Background pieces) that stay whole by Bean's ruling.
   - 27 already sit in their best home (7 are the block's own Settings panel, 6 are the shared Colour panel, the rest have no other panel to join).
   - 11 are not settings at all: 4 size-and-crop menus whose items sit behind the panel menu, 4 presets or editor-only switches, 3 core support panels (Duotone x2, Dimensions).
2. **Behaviour would become a catch-all.** Rule 3 sends 55 controls to Behaviour, plus Keyboard focus in 85 blocks. Only 14 of the 55 have database role `behaviour`; 41 are toggles, selects and keys (role `boolean-visibility`, `enum-mode`, `technical`, `select-from-enum`) that merely have no element or property. Spec 35 already sends styles-nothing controls to a pinned Settings panel. Recommendation below.
3. **Most blocks have no Settings panel to receive rule 4.** 8 blocks (account, cart, choice-flow, icon, label, nav-bar-menu, option-picker, tabs) get a step 4 control with no panel titled "Settings"; rule 4 would create one.
4. **The database cannot see 11 style controls.** `ground`, `imageEffect`, `optionMediaSize`, `theme`, `scrollEffect`, `shadowLiftOnHover` (x2), `accentStroke`, `itemMagnetEnabled` (x2), `progressStyle`, `sublinkMarkerIcon` plainly style something but carry no element or property, so rule 3 would put them in Behaviour. They are marked in `moves.md`.
5. **Library-wide moves** (reported once, excluded from the per-block list):
   - Keyboard focus (`sgsFocusRests`, role behaviour) goes to Behaviour in all 85 blocks. One change in `src/blocks/extensions/focus-rests.js`.
   - Size in row (`sgsChildSizing`, wrapper, layout) goes to the block's wrapper layout panel under rule 2: Layout in 10 blocks, 19 other differently named panels in 23 blocks, and 40 blocks have no such panel (Settings). One change in `src/blocks/extensions/child-sizing.js`, with the target resolved per block. This split is the roughest figure here: panel contents of component-built panels are read from source, so treat the exact target names as indicative and the 40 as an upper bound.
   - Block Link (`sgsBlockLink`) is lone in 6 blocks (container, info-box, mega-aside, notice-banner, product-card, team-member) and joins Behaviour; one extension change. It stays in the per-block list because the brief excluded only the two above.

## 2. Trends in the 180 real panels, with counts

Single-control panels sit in 64 of 104 blocks. Largest: buybox 13, choice-flow 8, container 7, icon 6, nav-drawer-menu 6, testimonial 6, trust-bar 6, account 5, brand-strip 5, card-grid 5, hero 5, nav-bar-menu 5.

**Recurring panel titles** (all 180): Shadow 10, Background surface 7, Extra SVG layer 7, Block Link 6, Colour 6, Icon 4, Accessibility 4, Effects 4, Position 3, Content band 3. Everything else appears once or twice.

**Kind of control** (all 180): select 38, toggle 30, toggle-group 25, range 25, colour swatch or bare button 22, button or picker 18, text 9, textarea 7, other 4. The 36 groups are led by a toggle (10), a select (10), a toggle-group (5) or a picker button (5).

**Shared components that produce them, and what one fix would clear:**

| Source | Panels | Blocks | One shared fix | Clears |
|---|---|---|---|---|
| `container/components/BackgroundMediaPanel.js`: "Background surface" and "Extra SVG layer" are separate panels | 14 | 7 (container, hero, multi-button, physics-canvas, site-footer, site-header, trust-bar) | Render both as sections inside the Background panel | 14 |
| Shared shadow control (`components/shadow-control/`), mounted in its own panel | 16 to 17 | 16 or so | Bean ruled these stay whole, so no fix; the count is for reference | 0 |
| `sgsBlockLink` extension | 6 | 6 | Move the extension's panel into Behaviour | 6 |
| `MediaElementPanel` size-and-crop ToolsPanel (items behind the menu) | 4 | 4 (before-after x2, brand-strip, testimonial) | Show its items by default, or fold into the Media panel | 4 |
| Aria-label text field | 4 | 4 (cart, icon, tabs, social-icons) | One shared accessible-label row in Behaviour or Settings | 4 |
| `SgsColourPanel` with one row, plus element-named colour panels (Text, Fill, Subtitle, Star icon, Background) | 14 | 11 | Add those rows to the block's existing Colour panel (Spec 35 field 4b); border colour stays | 7 (the 6 titled "Colour" already are the panel; "Border gradient" stays) |
| Heading-level select | 4 | 4 (account, card-grid, timeline, trustpilot-reviews) | One shared "Heading level" row in Settings | 4 |
| Icon picker | 6 | 5 | Icon pickers fold into their element's panel | partly: only the 3 without companions |
| Core ToolsPanel with no collapse arrow (outside the 16 switchers) | 15 | 13 | Not ours; a ToolsPanel replaced by PanelBody | 15 |
| Block-style switcher ("Styles") | 16 | 16 | Core; hide it where a block has no registered styles | 16 (not counted above) |

Totals: the six shared fixes that clear panels outright (Background 14, Block Link 6, size-and-crop 4, accessible label 4, colour rows 7, heading level 4) clear 39 of the 180. Add the two universal extension fixes and 158 more single panels disappear (85 Keyboard focus, 73 Size in row).

**Why 36 panels look single but are not:** progressive disclosure. buybox 5 (Buy box type, Note box, RRP pill, Note under the button, Gallery saving badge), choice-flow 3, icon 3, account 2, icon-list 2, label 2, and one each in 19 other blocks. A fix to the census reader (count a panel's controls with its toggle on) would put the true single count near 76 instead of 180.

## 3. Ambiguous cases and recommendations

- **Behaviour versus Settings for styles-nothing controls** (55 controls): follow Bean's wording for role `behaviour` (14 controls plus Keyboard focus and Block Link) and send the other 41 to Settings, where Spec 35 already puts them. Why: otherwise Behaviour becomes a second Settings panel.
- **Blocks with no Settings panel** (8): create one pinned Settings panel per block; rule 4 assumes one exists.
- **Groups** (36): do not split a lead from its companions. Recommended: move the whole panel to Behaviour or Settings together, which is a panel move, not a control move.
- **Tie, nav-drawer-menu "Submenu link padding"**: List layout versus Menu item; recommended List layout (holds more spacing controls for the same element).
- **DB-blind controls** (11): send to the matching style panel (effects for hover lift, scroll effect, magnetic pull, image effect, accent stroke; colour for ground and theme; layout for option picture size), not Behaviour.
- **Colour panels** ("Colour", 6): the rule's step 2 would move a lone swatch into a neighbouring panel (Border, Shape, Caption and link); Spec 35 field 4b says fill, text and link colours live in the one shared Colour panel, so they stay. This conflicts with a literal reading of step 2.
- **Judged moves** (3, marked in `moves.md`): trust-bar "Badges" Columns to Layout (the same attribute is already there; delete the duplicate), container "Content band" to Layout (same property, other element), brand-strip "Logo size" to Layout (beside Logo max width).
- **Presets and editor-only switches** (card-grid "Card style", site-header "Layout preset", info-box "Media type", nav-drawer "Preview drawer open"): write several attributes or none, so they have no single attribute to place. Leave them as the lead of their panel.

## 4. Calls I made

- Read "single-control panel" as the census's own count (one control wrapper), and excluded the 16 core block-style switchers from the list but counted them in the trends. Included the 15 other core ToolsPanels with single items because they are single-control panels too.
- Resolved label to attribute by reading each block's source, with a hand map (`lone_map.py`) checked against the framework database: every mapped attribute exists in its block (the script fails otherwise).
- Took element and property from `block_attributes` only (not `setting_placements`): the placements fill gave behaviour attributes a fake root element and pulled them into step 2.
- Applied "styles nothing" before step 2 (otherwise Block Link, role behaviour with element wrapper, would land in Layout, against Bean's own examples).
- Sent content controls (heading text, link, tab label, picture URL, list items) to Settings, not Behaviour: rule 3 says "no element and no property", but these are not behaviours.
- Treated a panel already named "Settings" ("Hero Settings", "Tab Settings") as the Settings panel, so its lead stays.
- Treated panels titled "Colour" as the shared colour panel (stays); treated shadow and Background pieces as feature panels (stay), per Bean's ruling.
- Panel contents for step 2 come from source regions (setAttributes keys and attributes mentioned twice or more) plus panel titles and the element labels in `block.json`; panels built by shared components are partly guessed. I fixed one false group (container "Section ground") found by spot check; the other groups were not each checked in the editor. A verifier pass on the 36 groups and the 10 existing-panel moves is the cheap next check.
- Nothing was run in the browser; the census data is the canary build described in `i8-editor.out` section 0.
