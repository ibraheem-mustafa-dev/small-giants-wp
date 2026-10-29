# Cloned homepages: root causes (2026-10-29)

Bean's report on the three live clones (Indus, Mama's, Eye Care test sites): content missing, links dead (Eye Care), the draft's look not carried, non-CSS settings not carried (slider count, list icons and which icon), the Instagram icon's hover a white circle, the mega menus unlike the hand-built ones, the hero image filling its half with no frame. Investigated on the live pages, the 2026-10-28 run's Fill reports and trees, today's code (re-proposals on the saved inventories), Spec 48, Spec 48A and the handoff method.

**The live clones were built on 2026-10-28 06:00 to 07:10**, before most of this week's fix pass and before the Eye Care draft changed (2026-10-28 15:24). A fault the code has since fixed is listed under "Fixed since the clone"; it is proven on the next build, not before.

## Root causes still in today's code

| # | Cause | Proof | Spec |
|---|---|---|---|
| RC1 | **A part a block draws itself is paired with its draft element only when a hand rule names that part.** The hero's picture area, an icon list's items, text and icons, a slider's slides and an icon's shape are never paired, so Fill reads neither their look nor the settings measured on them (the slider's `slidesVisible` is measured on its first slide). | Indus home Fill report: "no draftSlots finder names `.sgs-hero__media > .sgs-hero__split-media`" for the frame settings (fit, width, height, radius, border, shadow); the same row for `sgs/icon-list` items, `sgs/testimonial-slider` slides and `sgs/icon` shapes. `lib/skeleton-part-slots.mjs` pairs only a part `rules.<rule>.part` names; the hero node carries no `draftSlots` at all. Unread settings: home 1,967, footer 832, mega-about 758, drawer 367, header 199 (some are parts the draft lacks). | Spec 48's skeleton input says nodes carry "optional `draftSlots` … for inner elements" and builds pairing rule by rule (`drawsChildren`, navigation, choice flow, form fields). No requirement pairs every block-drawn part, though the DB (`css_element` per setting) and the calibration (each part's slot) hold what a universal pairing needs. Spec and tooling both. |
| RC2 | **139 SGS "choose from a list" settings have no allowed values in the framework DB.** Their values live in `edit.js` option lists or PHP allow-lists, which the seeder does not read, so the route can never choose them. `sgs/icon-list.markerType` declares no enum on purpose (FR-36-26c); the skeleton writes `markerType: none` only when the DB lists `none`, so every cloned list shows the default check icons. | DB query: `enum_values` NULL for 139 string settings with a select or toggle control (card-grid `variant`, notice-banner `variant`, hero `alignment`, process-steps `connectorStyle`, team-member `photoShape`, info-box `cardStyle` …). `lib/skeleton-write-units.mjs` gates `markerType` on `enumOf`. The real list is `includes/helpers-list-markers.php::sgs_list_marker_types`. | FP-1 (DB first): a seeder source gap (`sgs-update-v2.py`). |
| RC3 | **An icon list's per-item icon is never written.** The list writer fills an item's loop fields (text, url); the icon reader (`lib/fill-icon.mjs::iconDecisions`) runs only on an `sgs/icon` node's own SVG, so a draft marker (Indus's gold dot, a per-item glyph) reaches no item. | Indus footer filled tree: items carry only `text` and `url`; the DB item schema has `iconName`, `iconSource`. | Tooling (the item schema is in the DB). |
| RC4 | **A surface with a hand-built reference post skips the review.** `lib/skeleton-propose.mjs::proposeSkeleton` marks every proposed row of such a surface settled (`low: false`, `builtPost`), so the pipeline's own guess is built without the finaliser or the review seeing it. | grep for `builtPost` and `built-surfaces`: read only by the review text and intake. | The posts are a reference to compare against (Bean); the rule is removed. |
| RC5 | **One block, two draft surfaces.** The mega panel's drawer look (about 25 `drawer*` settings in the hand-built post: card colours, sizes, dividers) is drawn in the drawer surface; Fill reads the panel only from the bar surface. | Hand-built post 4426 against the clone's post 155: every `drawer*` setting absent. | Not covered by Spec 48 (a block whose settings are read from another surface). |
| RC6 | **No accordion recognition.** Mama's FAQ is a loop of `aria-expanded` toggles over `sc-if` answers, recorded in `surfaces.json` as kind `accordion` (S-11); intake files `accordion` records as page parts and no skeleton rule makes `sgs/accordion`, so it becomes static containers. | Mama's home proposal: S-11's subtree is containers and texts; `lib/skeleton-rules.mjs::disclosure` is used only to keep a toggle out of the pill-button rule. | Tooling; Spec 48's skeleton hints list loops and the logic's lists but no disclosure pattern. |
| RC7 | **The Instagram icon's hover (mechanism read, test to follow).** Fill held the glyph's hover colour at white (`iconColourHover`, "fill-state-hold") but not the ground, because the hold pair is `color` + `background-color` and this ground is a gradient (`background-image`); the brand's own hover ground (white) then shows under a white glyph. | Live: `--sgs-icon-colour-hover: #FFFFFF`, `--sgs-icon-brand-ground-hover: #FFFFFF`; `lib/fill-state.mjs::holdDefaults` `PAIR`. The icon's shape is also unpaired (RC1). | Tooling. |
| RC8 | **Calibration went stale silently.** Before today's check, a block whose plugin build changed kept its old slot map: the timeline, icon, multi-button and testimonial slider were all stale. `sgs/icon.iconRotate` was declared `css:rotate` while the CSS painted `transform`, so calibration read it dead. | `site-run.mjs` propose step now refuses; `iconRotate` fixed in `ef8aab494`. | Tooling (guard now built). |

## Bean's rulings (2026-10-29)

- RC1: pair every part a block draws with its draft element universally, from the block attributes table (`css_element`) and the calibrated part slots; the per-rule pairing goes.
- RC2: the seeder reads a setting's allowed values from the block's own source files and the helpers they call (edit.js option lists, PHP allow-lists such as `sgs_list_marker_types`); nothing is added to `block.json`.
- RC4: the hand-built posts were named only as a reference to compare the clone against, never to be used. The `clientBuiltSurface` rule, which marks every row of such a surface settled and so keeps it out of the review, is removed.
- The finaliser stops being a separate agent: the agent running the clone makes those picks and brings the open points to Bean (Spec 48 §3.4 changes accordingly).

## Fixed since the clone (proven on the next build)

- Eye Care's dead links: a `#` link whose click handler routes is resolved through the routing record (A3). Today's proposal gives the hero buttons `/shop/` and `/prescription-lenses/`; the brand names and products are drawn by `sgs/brand-strip` and the product collection from the draft's loops (B4).
- Section padding 0 on every Indus section: box settings written as tiers (C1).
- "Click Here" on wordless controls (B3), Eye Care's step texts and "Message me on WhatsApp" (A4 own words), the floating WhatsApp button, the drawer's close, logo and CTA link, the closing button pair (Track A).
- The mega panel's frame (white ground, border, radius, shadow, max width) sits on the panel shell above the surface root `surfaces.json` names (draft line 90, root tpl 67): `lib/fill-paint-holder.mjs` (PI-6) reads a painting single-child wrapper. Whether it reaches this shell is checked on the next Fill run.

## Not faults

- The mega panels' text sizes differ from the hand-built posts because those were built from an older export; today's draft (13, 17, 15px) matches the clone.
- Indus's homepage holds every draft text. Three Eye Care texts first reported missing differ only by WordPress's curly quotes and dashes.

## Still to trace

- Mama's configurator: the Flavours question has no options, and the pack sizes lack their prices, per-cookie costs and badges.
- Mama's hero greeting ("Good morning, mama"), which the draft's code chooses by the time of day.

## Incidents in this investigation

- The calibration cache and the route `node_modules` were emptied when I removed three merged worktrees whose agents had linked them (memory `worktree-gotchas`). `npm ci` restored the modules; every block is being recalibrated on the Indus mirror (the homepage's blocks first, on the canary mirror). A fresh Fill run of the homepage waits for it.
- Fixed on the way: the built-equals-reviewed check compared different key spaces (`b75f3a9ae`); three effect settings lacked `sgs.meaning`, failing the plugin build (`a5deb2aa8`).
