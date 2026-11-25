# i20-moves2: target panels, Settings panels, DB-blind look controls, native panels, the native-supports rule

Read-only. Nothing in the repo, the framework database or a site was changed. Live site databases were not queried (saved-content checks use the repo only). Per-instance tables, 16 blocks of styles, 7 of Dimensions, 15 of repeated titles, are in `E:\sgs-tmp\general-cloning\investigate\i20-moves2\instances.md`; raw dumps and the scan script sit beside it. Census data is the canary build in its default state.

## 1. Target panels (Question 1)

| Finding | Status |
|---|---|
| All 31 moves that name an existing panel (rule steps 1 and 2) point at a panel that is in that block's census today. 19 of the 31 are "stays" (the target is the control's own panel); 12 are real moves. | PROVEN (`i14-moves/moves.json` joined to `i8-editor/census-all.json`; 0 missing) |
| Three named targets are still wrong. quote "Padding" goes to Typography (the core font panel). google-reviews "Add review" goes to "Slider Settings", which renders only when `variant === 'slider'` (`google-reviews/edit.js`). modal "Backdrop strength" goes to Modal Settings, but it is a style control in the Styles tab. | PROVEN (census panel contents; source) |
| "A Behaviour panel exists in no block today" is not quite true. The exact title "Behaviour" exists in one block, `sgs/table-of-contents` (`edit.js`, 5 controls: Collapsible, Collapsed by default, Smooth scroll, Scroll offset, Scroll spy). Five more carry the word in a longer title: free-delivery-bar "Behaviour and motion", responsive-logo "Sizing + behaviour", site-header "Header behaviour", site-header-row and site-footer-row "Row behaviour (Advanced)". | PROVEN (census list and `grep` of `src/`) |
| So the 76 Behaviour moves (40 blocks, 22 of them groups) all need a panel created: none of the 40 blocks is table-of-contents, so its existing panel receives none of them. | PROVEN (`dest-lists.json`) |
| Spec 35 says the opposite of a Behaviour panel: "There is no behaviour-vs-appearance question anywhere in [the placement rule]"; a control that styles nothing takes "one `Settings` panel, pinned first" (`35-BLOCK-INSPECTOR-UX-STANDARD.md`, THE PLACEMENT RULE). A Behaviour panel is therefore a change to the spec, not an application of it. | PROVEN (quoted) |

Recommendation: keep to Spec 35 and send the 41 plain toggle/select/key controls to the pinned Settings panel, as i14 also advised; use "Behaviour" only if Bean wants to rule it into the spec. Fix the three wrong targets in the plan.

## 2. The 8 blocks with no Settings panel (Question 2)

Correction first: `moves.py` only recognises a Settings panel that has more than one control, so it missed choice-flow's "Choice Flow Settings" (lone: Flow title). Choice-flow therefore has a Settings panel; the real count is 7. Separately, 16 blocks (not 8) get a "Settings (new)" destination (also brand-strip, buybox, gallery, icon-list, image-sequence, mega-group, nav-drawer-menu, wishlist-link). PROVEN (`moves.py::is_main_settings`, `main` search; `dest-lists.json`).

Four of the eight "Settings" moves are rule misfires: they are style controls the rule sent to Settings because their family did not match a panel title (label "Link underline" and "Position", nav-bar-menu submenu "Border"). A Settings panel for them would be wrong.

| Block | Settings tab holds now (panels, lone ones marked) | Lone controls the rule sends to a new Settings panel | Recommendation |
|---|---|---|---|
| account | 35 panels (Menu, Dashboard, Wording, Orders list, spacing panels and more) | Label position (group with label gap), login-button Icon, register-button Icon | Keep as is. 35 panels already; the icons belong with their buttons and label position with field labels. A new panel would hold three unrelated things |
| cart | Display mode (1), Trigger style (1), Icon (2), Badge (3), Accessibility (1) | Trigger aria-label | Create "Settings" by merging the three lone panels (Cart trigger opens, Trigger shows with its pill options, aria-label). Three lone panels become one; no Behaviour panel needed |
| choice-flow | Linked flow (1), Choice Flow Settings (1, the real Settings), Progress indicator (1), Pricing (1), Header (1), Footer (1), plus Layout, Stage and others | Layout (the flow layout choice) | No new panel. Fold Layout, Linked flow, Progress style, Show price panel, Show header and Sticky footer into the existing "Choice Flow Settings". This also removes the second panel called "Layout" |
| icon | Icon (5), Link (1), Shape (4), Border (5), Label (1), Signed-in dot (1), Accessibility (1) | Show a signed-in dot (group of 5), Accessible label | Keep. Fold "Accessible label" into the "Icon" panel (the de facto main panel); the dot is a feature group and stays |
| label | Box (4), Text by time of day (2) | Link underline (group), Position | Keep as is. Both are style controls: Link underline belongs in the Links panel, Position is the universal `sgsPosition` extension. "Box" is the de facto settings panel |
| nav-bar-menu | Menu (1), Burger Menu (1), Disabled items, Menu Button (21), Menu button reach (2), Accessibility (2), Menu panel (1), Dropdown menus (15), Layout (3) | Border (submenu container, group of 7), Show the burger on | Create "Settings" by merging Menu, Burger Menu ("Show the burger on") and Menu panel ("Panel this burger opens"): three lone panels that all say which menu and which drawer. Leave the submenu Border where it is |
| option-picker | Label (2), Options (repeater), Default selection (1), Converter metadata (2), Sub-label (1) | + Add option (the Options list) | Create "Settings" holding Label text, Show label, Pre-selected option and Sub-label key; keep Options (repeater) and Converter metadata as their own panels. Also clears the repeated title "Label" |
| tabs | Container / Wrapper (5), Layout (3), Accessibility (1) | Accessible label | Keep. Fold the label into "Layout" (orientation, alignment, tab style). One control does not justify a panel |

Net: create Settings in 3 blocks (cart, nav-bar-menu, option-picker), reuse the existing one in choice-flow, leave 4 alone. Rule 4 as written would instead create 8 one-to-three-control panels.

## 3. The 11 look controls the DB cannot see (Question 3)

13 instances, 11 attribute names. No control is a clean duplicate of a motion panel option. Four overlap in intent only. The rule's "effects family" target in i14 is wrong: the only Effects panel is the motion panel (Target, Effect), which does not hold static decorations. PROVEN (source, `generated-fx-qualifying-blocks.json`, Spec 38A line on hover filter values, `SectionMotionPanel.js`).

| Block | Control | Does | Motion overlap | Recommendation |
|---|---|---|---|---|
| brand-strip | Image effect | logos sepia at 60% opacity, full colour on hover | Partial: Hover has "Grayscale to colour" (grayscale, not sepia); Hover filter values are blur, grayscale, brightness; media "Overlay and filters" has a static Sepia | Keep; move into "Overlay and filters". Removal changes any saved sepia strip |
| choice-flow | Progress style (bar, circles, badge) | three different indicator markups | none | Keep; merge into "Progress and steps" |
| choice-flow | Picture size on desktop | per-device % size of each option picture | none | Keep; merge with "Screen fit" |
| container | Section ground | uses the site's section colours | none | Keep; move into Colour beside Background colour |
| counter | Accent underline stroke | always-on line under the number | none (Hover "Border accent" is hover-only) | Keep; move into "Counter Settings" |
| google-reviews | Theme (light, dark, transparent) | swaps Google's palette variables for the widget | none | Keep; move to the top of Colour |
| nav-bar-menu, nav-drawer-menu | Magnetic hover pull | item labels lean toward the cursor | Same core as the Magnet hover effect (Spec 38 FR-38-30), but neither nav block is offered Magnet (no entry in the qualifying list), and the source says the two are deliberately not merged | Keep; rename the panel "Item hover pull" |
| nav-drawer-menu | Marker icon | icon beside submenu links | none | Keep; move into "Row extras" |
| nav-drawer-menu | Open and close animation | accordion section open and close, with easing and duration | none: runs on `::details-content`, which "the motion model cannot target" | Keep (a 5-control group, not lone) |
| process-steps, timeline | Lift on hover | swaps the shadow for its matching hover shadow | no: Hover "Lift" moves the element, this changes box-shadow | Keep in "Shadow on hover" |
| timeline | Scroll effect | curated scrub, pin or sideways pin | by mechanism yes, but the Effects panel is not offered scrub, pin-scrub or horizontal-panel on timeline, so this is the only way | Keep; rename "Scroll reveal" to "Scroll motion" |

Repo use: Indus header tree sets `itemMagnetEnabled: true` (3 places), Eye Care's flow sets `optionMediaSize` (76 and 100), `progressStyle` is the default. No repo content sets `imageEffect`, `accentStroke`, `scrollEffect`, `submenuAnimation` or `sublinkMarkerIcon`. UNPROVEN for live databases.

## 4. Native WordPress panels and repeated titles (Question 4)

### 4a. Styles panel, 16 blocks (3 from `block.json`, 13 from PHP `register_block_style`)

Two facts change the question. First, Spec 32 rejects them: "WordPress Block Style Variations (`register_block_style` + theme.json variations). Rejected" and "BEM class, not `.is-style-*`" (`32-COMPONENT-STYLING-TOKEN-CONTRACT.md`; repeated in Spec 35A Part G). Second, the cost of keeping them is already proven: card-grid retired its three on 2026-08-11 because `.is-style-*` out-ranked the block's own settings, so an operator's choice rendered as if never set (`includes/variations/sgs-card-grid-variations.php`). PROVEN.

Saved use in the repo is almost nil: one pattern (business-info `button`, in `theme/sgs-theme/patterns/framework-header-default.php`) and one test fixture (star-rating `trustpilot-official`). But 9 blocks' inserter variations write the style class into new content (accordion 3, form 3, gallery 4, info-box 3, post-grid 4, pricing-table 3, tabs 3, team-member 3, testimonial 3), so live sites may hold them. UNPROVEN until a read-only `post_content LIKE '%is-style-%'` check runs on each site, including Mama's.

| Group | Blocks | Recommendation |
|---|---|---|
| Keep: structural or depended on | label (pill shapes, emitted by product-card, buybox and `helpers-value-ladder.php`), star-rating (render branches), business-info (header pattern and ink helper), product-card (frame-card, no setting) | Keep |
| Retire: an SGS setting already does it | info-box and team-member (`cardStyle`), post-grid (`cardStyle`), tabs (`tabStyle`), gallery (Item tile, Border and shape), testimonial (Shadow, Border, `variant`) | Retire; first point each block's inserter variations at the setting (the card-grid method) |
| Retire after adding what is missing | accordion (no numbering setting; `accordionStyle` has bordered, flush, card), pricing-table (no preset setting), form (Form block has no Border, Colour or Spacing panel at all) | Add the setting, then retire. Form: keep until it has panels |
| Retire: low value, no variations | heading (section, card), text (quote, caption, lead), quote (pullquote, testimonial, plain) | Retire |

Each retirement is a render change for any saved class, so it needs the live check, then `render-scope`, per `CLAUDE.md`.

### 4b. Dimensions panel, 7 blocks

It is the core panel of `supports.spacing`: padding and margin for card-grid, feature-grid, post-grid, pricing-table, tabs, testimonial-slider, and margin only for product-card. One base value, no tablet or mobile value: the database holds no `padding*` or `margin*` attribute for any of the seven. The shared spacing panel does not cover it: there is no automatic shared panel, each block mounts `SgsBoxControl` itself (container did so in 2026-08-10 "D555", `class-sgs-container-wrapper.php`). No repo content (0 of 147 instances of the four of these blocks that appear: product-card 120, card-grid 14, tabs 12, pricing-table 1) saves a native spacing value; feature-grid, post-grid and testimonial-slider have no instance at all. PROVEN for the repo, UNPROVEN for live. Recommendation: replace with the per-device Padding and margin control on the six blocks (card-grid keeps its "Card spacing"), reading the old value as the desktop value (container's dual-read precedent); form-step also declares native padding and should join.

### 4c. Repeated panel titles

15 blocks repeat a title in one tab: account, button, buybox, choice-flow, container, gallery, heading, hero, nav-bar-menu, nav-drawer-menu, product-card, product-search, responsive-logo, testimonial-slider, text. Three more repeat across tabs (message-preview "Boxes", option-picker "Label", trust-bar "Badges"). Two causes: the extra "Colour" panels are button or arrow colour pairs (Background and Text) under the same title as the block's main Colour panel; and "Effects" or "Hover" is used both by the block's own control and the motion panel. Proposed distinct titles for every instance are in `instances.md` section F ("Sign in button colour", "Carousel arrow colour", "Item hover pull", "Box shadow", "Hover timing" and so on). PROVEN for the repeats (census); the proposed titles are suggestions, and account's button-to-pair order should be confirmed in source before renaming.

## 5. The "native supports are never dropped" rule (Question 5)

The rule is in Spec 32's geometry section (spacing and border shape), twice:

- "the fix is to **keep the support** and change WHERE it serialises, never to drop it" (`32-COMPONENT-STYLING-TOKEN-CONTRACT.md`, intro to the geometry section).
- "**Keep the support + `__experimentalSkipSerialization` + serialise scoped — never drop the support.**" (same file, the paragraph on `wp_style_engine_get_styles`).

It is scoped to one defect (WordPress auto-inlining `supports.spacing` and `__experimentalBorder`), not a general rule. As a general statement it is contradicted by the repo. Where SGS already replaced native supports (PROVEN by a scan of all 104 `block.json` files):

| Native support | State today |
|---|---|
| border | 0 of 104 blocks declare it; card-grid, multi-button and trust-bar were migrated off (commit `3f05435ad`); `SgsBorderControl` replaces it |
| colour | 75 blocks declare `supports.color` with text, background and gradients all false, "without exposing WP's native colour UI, which SGS never uses" (responsive-logo's `_comment`); Spec 35 field 4: "never uses native colour supports" |
| typography | 3 blocks keep it (counter, quote, wishlist-panel); the rest use `TypographyControls` ("never use native `supports.typography` on an inner element", `plugins/sgs-blocks/CLAUDE.md`) |
| spacing | container moved to block-owned attributes in 2026-08-10; 8 blocks remain native |
| aspect ratio | REPLACED by the media Ratio setting (Spec 35A Part G) |
| duotone | Part G says "NOT OFFERED... no block declares `supports.filter`", but gallery and media declare `filter.duotone`; the text is wrong by two blocks |
| shadow, minHeight, sticky, lightbox | "KEEP SGS" (own control); 5 blocks still declare native shadow |
| block styles | rejected (Spec 32, Spec 35A Part G); 16 blocks still register some |
| layout, background, dimensions, position | declared by 0 blocks; SGS panels do the work |

Also stale: `plugins/sgs-blocks/CLAUDE.md` rule 1 says "Native `supports` for wrapper-level controls (colour, typography, spacing, border)", which contradicts the table.

Suggested correction for Spec 32: "Where a block keeps a WordPress spacing or border support, it keeps it with `__experimentalSkipSerialization` and scoped output rather than dropping it to avoid inline styles. SGS may replace a native support with its own control through a migration (border, container padding, colour and aspect ratio are done); after it, the block no longer declares the support."

## Calls I made

- Read "15 blocks with a repeated title" as repeats inside one tab (that gives 15); counted the cross-tab repeats separately (3, plus gallery's Layout).
- Treated "Behaviour" as existing in table-of-contents because its panel is titled exactly that, and said so rather than agreeing with the brief.
- Treated choice-flow's "Choice Flow Settings" as its Settings panel (the brief's 8 became 7 plus a script gap).
- Judged "duplicate of a motion panel option" by what the Effects, Hover and Entrance panels offer on that block today (`generated-fx-qualifying-blocks.json`), not by whether the engine could offer it.
- Did not query live sites; where live use matters the finding says UNPROVEN and names the read-only check.
- Proposed panel titles and per-block recommendations are my judgement; none is applied.
