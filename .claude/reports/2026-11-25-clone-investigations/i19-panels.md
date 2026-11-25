# i19-panels: product-card buttons, nav-drawer-menu panels, "Section motion", responsive-logo media

Read-only. Nothing in the repo, the framework database or a site was changed, and I opened no browser (the canary census `i8-editor\census-all.json` plus `main`'s source answered everything). Scratch scripts are in `E:\sgs-tmp\general-cloning\investigate\i19-panels\` (`scan*.py` count saved blocks; `census3.txt` is the census extract). Source paths below are under `plugins/sgs-blocks/src/`.

## 1. `sgs/product-card` buttons

**What exists (PROVEN, `blocks/product-card/edit.js`, `listing-panels.js`, `render.php`, `includes/product-card-builtin-render.php`)**

- The "Button" panel is already in the Styles tab, not Settings. It sits inside `<InspectorControls group="styles">`, and the code comment says it was moved there on purpose (element order, rule 41 axis C). The canary census agrees (Styles: ... Typography, Button, Card layout, Picker style, Call to action button, Secondary call to action button).
- Its controls, in order: Primary button text and Primary button URL (typed cards only); Primary button behaviour (connected cards only: learn more, add to basket, buy now); an info notice (typed cards); a paragraph pointing at the look panel; a "Reset colours to preset" button; Text alignment (`ctaTextAlign`); a divider; Secondary button text ("Leave empty to hide the secondary button"); and, only once that text is non-empty, Secondary button URL and Secondary text alignment.
- Two further Styles panels, "Call to action button" (`cta*`) and "Secondary call to action button" (`cta2*`), come from `<BuiltinButtonPanel prefix="cta" />` and `prefix="cta2"` at the foot of `edit.js`. Neither mount has a condition, so both always show, with their colour rows.
- A "Show button" switch (`showCta`, default true) lives in the "Show or hide" panel (`listing-panels.js`), Settings tab, connected cards only, beside "Show basket icon on the button" and "Show button shadow". Bound text and link are also editable in "Content overrides" ("Override button" toggle), which duplicates the typed Button-panel fields.
- There is no button-count attribute. The card decides as follows. Typed card (`product-card-builtin-render.php`): primary prints when `ctaText` is non-empty; secondary prints when `cta2Text` is non-empty. Connected card (`render.php`, three branches): primary prints when `showCta` is not false (an empty label falls back to "View product", "Add to Cart" or "Buy now" by behaviour); secondary prints when `cta2Text` is non-empty, inside the same `showCta` gate. So "none" today means `showCta: false`, and "two" means a non-empty `cta2Text`.

**What saved cards use (PROVEN by scans over `sites/*/build` trees, theme templates, tests, `.claude/backups`, Eye Care backups)**

- 123 saved connected cards carry `showCta: false` (the Eye Care shop listing, `sites/eye-care-ward-end/build/archive-product.tree.json`): "no button" is the common real case.
- About 18 more connected cards use the default (one button, no texts): Eye Care skeletons and 5 theme templates.
- No saved tree or template stores `cta2Text`. The only cards with button text are old July 2026 sandybrown backups (60 typed cards with `ctaText` only, 4 with both texts). So two-button cards are essentially absent today.
- UNPROVEN: live databases (read-only `post_content LIKE '%"showCta":false%'` on each target settles it).

**Proposal**

1. Settings tab gets one panel, "Buttons", placed after "Card". Top control: "Number of buttons" as a three-way choice (None, One, Two), stored in one new attribute `ctaButtons` (`none`, `one`, `two`; default `one`).
   - One or Two: "Button 1" text, link and (connected cards) behaviour, then Text alignment moved out to the look panel.
   - Two: "Button 2" text and link.
   - Each text field keeps today's rule that a button with no text is not printed in typed cards.
2. The Styles tab keeps only the two look panels. Mount "Call to action button" when the count is One or Two, and "Secondary call to action button" only when Two; with None, neither shows. Gating the `<BuiltinButtonPanel>` mount also gates that button's colour rows, because the kit panel mounts its own colour rows. The old Styles "Button" panel is dissolved (its text, link and behaviour go to Settings; "Reset colours to preset" and Text alignment go to the first look panel). Move "Show basket icon" and "Show button shadow" into the primary look panel too (the kit already has a shadow control, so the shadow toggle may be redundant: UNPROVEN).
3. Why a stored count rather than a view over the old attributes: a view cannot hold the second button's text when Bean switches Two to One and back, and it leaves typed cards with no way to say "none". The old rule (`cta2Text` non-empty = two) would keep working beside it only if the new attribute defaults to the old behaviour, which one default cannot do for both typed and connected cards.
4. Saved content: `showCta: false` becomes `ctaButtons: none`; non-empty `cta2Text` becomes `two`; everything else stays `one`. This is a batch sweep with no `deprecated.js` (FP-14). Touchpoints: `render.php` (three branches plus the read-only branch), `product-card-builtin-render.php`, `listing-panels.js` (remove the "Show button" switch), the cloning converter data that writes `showCta` (`scripts/computed-route/data/part-look-modes.json` names `showCta`, `ctaText`), `scripts/data/setting-records/product-card.json`, the 123 Eye Care cards in builds, and the placement baselines (`scripts/inspector-scan/rules/41-co2-element-grouping-order.js` reads `ctaText`; moving the panel back to Settings contradicts the comment that put it in Styles, so re-run the inspector scan; UNPROVEN whether it fails).
5. Size: editor panel and render change, about 2 to 3 hours; converter, sweep and tests another 1 to 2 hours. Render-scope should list zero changed pages if the sweep maps exactly as above (UNPROVEN until run).
6. Second step, optional: fold the connected card's "Override button" toggle into "Buttons" (fields always editable, empty means the product's own label). It changes `sgs_product_card_resolve_element` semantics for `cta`, so treat it as separate work.

## 2. `sgs/nav-drawer-menu`: every panel today

Census (canary) and `blocks/nav-drawer-menu/edit.js` on `main` agree.

**Settings tab (8):** Menu (menu choice, "Tapping a parent row", scroll opened section into view); Accessibility (navigation label, "Keep text readable automatically"); Layout (it is `SplitPanel.js`: Justify row content per device, "Hover colour applies to", "Split this menu" with whole, before or after item, split point); Disabled items (checkbox per item); Ornament (checkbox per item: which items skip the ornament); Keyboard focus; Visibility conditions; Advanced.

**Styles tab (22 panels, PROVEN census):**

1. Colour: about 19 rows (nav background and text, item text, item background and hover/current, row border, panel background and border, link text and background, marker, ornament, dimmed rows, featured text and background, open colour, badge text and background, two more text/icon rows).
2. List layout (core tools panel, open by default): Item gap (`gap`), Columns (`listColumns`), Padding (`padding`), Margin (`margin`), Link padding (`itemPadding`), Link minimum height (`itemMinHeight`), Badge padding, Badge corner radius, Space before badge, Row gap (`itemGap`). Ten controls, shared with `sgs/nav-bar-menu`.
3. Submenu link padding (one control, open by default).
4. Mega panel padding (one control, open by default).
5. Typography: targets Menu, Submenu, Item badge, Row number or glyph, Back button, plus "Current-page weight".
6. Menu item: Border (width, style, radius, underline spans), Opacity, Opacity on hover, Padding shift on hover, Submenu opacity, Submenu opacity on hover.
7. Row separators (shared separators control).
8. Submenu: Items (one control, Marker icon).
9. Submenu: Container (open by default): Inner spacing (`submenuPadding`), Border, Corner radius, Box shadow.
10. Submenu row separators.
11. Section motion (see section 3).
12. Effects (own panel, `EffectsPanel.js`): Magnetic hover pull and Pull strength.
13. Featured: item checkboxes, Corner radius (+hover), Font weight (+hover).
14. Trailing icon: per-item icon, position, size.
15. Badge: per-item tone, badge border, badge opacity.
16. Mega menu (drawer): "Mega items in the drawer" plus per-item Panel or Link.
17. Item effects: Dim other items, Text slide, Label roll, Effect speed, Effect easing.
18. Row extras: leading ornament (number, icon, size, gap, reveal, frame sequence), expander icon, expander size, gap, opacity at rest and hover, turn time and curve, expander circle (size, fill, border), item image (width, height, radius, reveal). 19-22. Size in row, Hover, Entrance and reveal, Effects (universal, from extensions).

What reads as a mess (PROVEN from the list): five panels open by default push the rest down (Colour, List layout, Submenu link padding, Mega panel padding, Submenu: Container); two panels are titled "Effects"; two single-control panels (3, 4) plus one (8); the badge's look is spread over Colour, Typography, List layout and Badge; "Row gap" actually spaces the parts inside one link (ornament, label, badge, arrow), not rows, while "Item gap" spaces the items; Mega menu (drawer) and Row extras are Styles panels although their own source comments call them Settings.

**Proposal: dissolve "List layout", control by control (element from the framework DB `css_element`)**

| Control | Element | Goes to | Reason |
|---|---|---|---|
| Padding, Margin | block root (`wrapper`) | shared "Spacing" panel (`ResponsiveBoxControls`) | same two attributes (`padding`, `margin`), same tier-object shape |
| Item gap | list (`bar`) | same Spacing panel, as "Space between items" | it is spacing, and a sibling of padding |
| Columns | list (`bar`) | Settings "Layout" panel (beside Justify row content, Split) | a structure choice, not a spacing value |
| Link padding | menu item | "Menu item" panel, beside "Padding shift on hover" | that control already adjusts this padding |
| Link minimum height | menu item | "Menu item" panel | same element, same property family |
| Row gap | menu item (parts of a link) | "Menu item" panel, renamed "Space between a link's parts" | the name stops reading as a vertical gap |
| Badge padding, Badge corner radius, Space before badge | badge | "Badge" panel | all badge looks in one panel |
| Submenu link padding | submenu link | "Submenu: Items" panel, beside Marker icon | removes two single-control panels |
| Mega panel padding | mega body | "Mega menu (drawer)" panel, shown only when an item is in Panel mode | it only does something there |
| Inner spacing | submenu container | stays in "Submenu: Container" | already with its element |

Result: three panels go, one (Spacing) arrives; Styles drops from 22 to 20 panels, and none of the new homes needs to open by default. Every attribute name stays, so saved content is untouched (PROVEN by the table: only mounts move).

**Catch on the shared Spacing panel (PROVEN, `components/ResponsiveBoxControls.js`):** it always renders four controls, Padding, Margin, Max width and Content width. This block deliberately has no max width or content width (D540 comment in `ListLayoutPanel.js`, and `contentWidth` is not an attribute), so mounting it as-is would add two controls that write nothing. Fix: two additive props (`showMaxWidth`, `showContentWidth`, default true so gallery and the header rows are unchanged) and a `title` prop so it reads "Spacing" here. About 1 hour. `ListLayoutPanel` is also mounted by `sgs/nav-bar-menu` (its `edit.js`), so dissolving it for the drawer only leaves the bar with the old panel. Recommend doing both in one change (the bar's `padding` and `margin` use the same names), or the drawer first and the bar flagged as parked.

Other tidy-ups to approve with it (smaller): merge "Effects" (Magnetic hover pull) into "Item effects", which removes the duplicate title; split "Row extras" into Ornament, Expander and Item image panels (one per element); move "Layout"'s Justify row content (a style) into "Menu item". Gate impact: `check-duplicate-controls.js` and the inspector-scan baselines (`scripts/inspector-scan/baselines/`) will need re-running (UNPROVEN how many findings move).

## 3. "Section motion"

- **Which blocks (PROVEN):** only `sgs/nav-drawer-menu`. `SectionMotionPanel` is imported nowhere else (grep of `src`). The nav bar's dropdown and mega panels had the same attributes (`submenuAnimation`...) but moved onto the Entrance panel (Spec 38A FR-38A-51). The accordion and modal have their own, different panels ("Open and close motion", "Open and close time").
- **What it does (PROVEN, `SectionMotionPanel.js`, `includes/nav-drawer-menu-section-css.php::sgs_nav_drawer_menu_section_motion`):** how an accordion section inside the drawer menu opens and closes. The dropdown holds None (default), Fade, Fade and lift, Height; None keeps the browser's instant toggle. Once one is chosen, three more controls appear: Opening time (ms), Closing time (ms) and Speed curve. Drill-down mode ignores it (it slides as an overlay). Bean saw only the dropdown because the default is None.
- **Can the full motion panels express it? No (PROVEN, Spec 38A FR-38A-51 and `SectionMotionPanel.js` header):** the motion is on the `<details>` element's `::details-content` pseudo-element, which the motion model cannot target; the spec records "the drawer menu's `::details-content` section motion stays on CSS, Bean decision C". The Entrance panel can move the rows inside a section as it opens (a section's items already count as a motion state), but it cannot grow the section's height, and fade-the-section is not the same as fade-each-row.
- **Recommendation: keep the controls, change the panel.** Rename it "Accordion open and close" (it is about the accordion section, not "motion" in the Entrance sense, which is the confusion), and place it directly under "Submenu: Container" (the open section's box). Merging into the motion panels would break Bean decision C and the height option. Removing it would delete a built, spec-listed (Spec 36 "Section motion") feature. Size: rename and move, about 20 minutes; also add one line of help text saying row-by-row entrance lives in Entrance and reveal.

## 4. `sgs/responsive-logo` two Media panels

**What exists (PROVEN, `blocks/responsive-logo/edit.js`, `block.json`, `components/MediaElementPanel.js`, `components/media/panels/MediaPanels.js`):** Settings tab order is Logo switch, Media, Media, Sizing + behaviour. First Media panel is slot `logo` (image or SVG, atoms Source and Meaning: Photo and SVG tabs, alt text; per device, so tablet and mobile can have their own file). Second is slot `logoDark` (image only, atom Source: a picture and loading). The dark file is a single file for every device (`render.php` reads `logoDarkSource` at `desktop`). The titles collide because `edit.js` passes no `label`. Saved content: no responsive-logo in any build tree sets `logoDarkSource` (68 logos scanned, 0 dark). The dark file swaps in on a dark header, a dark section or the site's dark mode (`style.scss`: header-on-dark, section-on-dark, `:root[data-theme]`), so "dark backgrounds" is the accurate name; "dark-mode logo" undersells it. With no dark file nothing swaps, so "has a dark logo" is already stored by the file's presence.

**What one mount can do (PROVEN from source):**
- One `MediaElementPanel` mount renders one panel per panel id; with `label` the title becomes "Label: Media". It cannot host two slots by itself.
- It accepts `panelContent`, caller content appended at the foot of its Media panel (`{ content[ panel.id ] }`). So a toggle can live inside the logo's panel today with no shared-code change, but only at the bottom.
- `buildPanelModel` and `PanelRow` are exported and are exactly what `MediaPanels` uses, so the dark slot's rows can be drawn inside another panel without nesting a second panel.
- A tab switch inside one panel is possible only by swapping the mount's `prefix`, `atoms` and `kinds` from local state (the Media panel keeps the same id, so it stays open).

**Version A (recommended): dark controls open beneath.** One panel "Logo". Regular controls first; under them a switch "Use a different logo on dark backgrounds"; on, the dark picker (and its loading choice) appear beneath, under a small heading. No new attribute: the switch shows on when `logoDarkSource` has a file or Bean has just turned it on; turning it off clears the dark file (one undo restores it) and says so in help text. Change: a small `DarkLogoRows` component (about 40 lines: `buildPanelModel` plus `PanelRow` for the `logoDark` prefix, filtered to the Media panel) and passed through `panelContent`; `edit.js` loses the second mount; set `label` so the title is not "Media" (this adds "Logo: Media"; an exact title "Logo" needs a one-line `titleOverride` prop on the shared mount, additive). About 1.5 to 2 hours with a test. Shared code is touched only by that optional prop.

**Version B: a switch between Regular and Dark controls.** A two-way choice at the top of one panel swaps which slot the same mount edits. About the same effort, but the switch is a view, not a setting (nothing tells Bean at a glance that a dark logo exists), the switch would sit at the foot of the panel unless the shared mount gains a "before rows" slot, and it needs that shared change. Not recommended.

**Either way, do first and separately (5 minutes):** pass `label` on both mounts so today's two "Media" panels read "Logo" and "Logo for dark backgrounds".

## Calls I made (reversible)

- Read "dark-mode logo" as the existing `logoDark` slot and recommended calling it "dark backgrounds" because the swap is by background tone.
- Chose a stored `ctaButtons` count for the card over a derived view, and proposed `one` as default; proposed the Settings "Buttons" panel even though the code comment placed the panel in Styles on purpose (the comment's reason is the element-order gate, not a user need).
- Placed "Item gap" in the shared Spacing panel and "Columns" in the Settings "Layout" panel; both are judgement calls with a reason given, easy to swap.
- Recommended keeping "Section motion" as a distinct panel (renamed), because Spec 38A records the decision to keep it on CSS.
- Did not open the editor: the canary runs an older build, and `main`'s source already answered each question.
- Scans cover repo trees, theme templates, tests, `.claude/backups` and Eye Care backups only; live databases are unproven.

Files: this report `E:\sgs-tmp\general-cloning\investigate\i19-panels.out`; scripts and census extract in `E:\sgs-tmp\general-cloning\investigate\i19-panels\`.
