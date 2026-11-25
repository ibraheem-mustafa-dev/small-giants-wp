# i24: register of lone controls, placed in each block's existing panels

Read-only. Nothing in the repo, the framework database or a site was changed. The full register (one table per block, with each block's Settings and Styles panels, 99 rows) is `E:\sgs-tmp\general-cloning\investigate\i24-register\register.md`. The generator (`build.py`, `md.py`, `decisions.py`) sits beside it, and every target panel named was checked against that block's census panel list (0 missing).

## Summary

Bean is right: none of the controls needs a new panel and none needs a pinned Settings or Behaviour panel.

- 99 controls across 45 blocks. The earlier list sent 76 to "Behaviour" and 23 to "Settings (new)". Your brief says about 76; I registered both sets so nothing is left open.
- 47 move into another existing panel of the same block. 38 fit a panel that configures the same feature. 9 are style controls the earlier rule mis-sent (link underline, hover shadow lift, section ground, theme, sepia, picture size, tile shadow); they go to their family panel (Colour, Shadow, Overlay and filters, Screen fit, Item tile).
- 46 stay where they are, because the panel they sit in is already right. 25 are the lead control of a group (the census saw one control, but more appear when it is switched on, so they were never lone). 18 sit in their own element or feature panel (icon pickers, heading levels, Accessibility labels). 3 are repeater lists (Options, Stores, Languages).
- 6 are Block Link (Link URL on container, info-box, mega-aside, notice-banner, product-card, team-member). They stay in their own panel as Bean wants. The extension puts that panel on 7 blocks (responsive-logo is the seventh).
- 36 of the moving controls are true lone controls, so the moves remove up to 36 one-control panels.

Patterns, same kind of control landing in the same kind of panel:

1. 17 of the 99 style something and should never have been swept in. Spec 35's own rule already sends them to a family panel. Link underline goes to Colour (label and icon-list; business-info, quote, testimonial and timeline already do it). Hover shadow lift goes to Shadow (process-steps, timeline).
2. A heading-level control goes in its title element's own panel (card-grid Title, timeline Entry title, account Page header). A screen-reader label goes in the block's Accessibility panel (cart, icon, social-icons and tabs all have one).
3. A toggle that adds a feature joins that feature's settings: buybox stock status joins Stock wording, express pay joins Button action, the schema toggle joins Rating (testimonial) or Accordion Settings, icon-only joins the theme toggle's label settings.
4. Pairs of lone panels about one thing merge into one existing panel: cart trigger, the two buybox extras counts, the nav-bar-menu burger, image-sequence frame folders, option-picker options, choice-flow header, progress and footer.
5. Where a block has a main-choice panel, the choice that decides how a part behaves joins it: nav-drawer-menu mega mode joins Menu, account signed-out view joins Logged out, google-reviews layout joins Display Options.
6. Hover-related block-wide toggles need one slot in the shared Hover panel (Keyboard focus and container "Hover as one card"). That is the only shared component that has to change.

## Cases needing a new home or a judgement

No case needs a new panel. These are the ones where the home is a judgement or needs a small change:

| Case | Recommendation | Reason | Confidence |
|---|---|---|---|
| Keyboard focus (85 blocks) | A block-wide row in the shared motion Hover panel, shown only where the block has hover settings | It only changes how hover colours, shadows and movement behave on keyboard focus; Hover is on 78 of the 85 blocks | Medium: needs one slot in the motion panel |
| Container "Hover as one card" | The same Hover-panel row | It decides how hover plays across the children | Medium: same slot |
| Seven blocks with no Hover panel (accordion-item, tab, commerce-note, order-items, gift-order, notice-message, diagram-dimension) | Keyboard focus in the block's Colour panel for the first four (they hold hover colours or a hover border); hidden on the last three | A toggle with nothing to act on is noise | Medium: confirm in source that the three hold no hover value |
| trust-bar "When items don't fit" | Styles tab Layout (cross-tab) | A layout rule beside layout type, columns and gap | Medium |
| buybox "Term-meta key" (second caption line) | Buybox labels | A caption is label text; the alternative is its own panel on a block with 27 Settings panels | Medium |
| choice-flow "Picture size on desktop" | Screen fit for now | The earlier finding says the question block's media Width already does this; settle the removal before moving it | High on overlap, unproven on pixel equivalence |

Renames that fall out of the moves: "Buy box type" to "Buy box", "Responsive frame sources" to "Frame sources", "Trigger style" to "Cart trigger", testimonial "Layout variant" to "Testimonial", timeline "Scroll reveal" to "Scroll motion". The mega-panel panel titled "Motion" holds only the View all link and disappears when that moves to "Style".

## Keyboard focus: one placement rule

The toggle ("Keyboard focus keeps the resting look", `sgsFocusRests`, `src/blocks/extensions/focus-rests.js`) is its own collapsed panel in the Settings tab of 85 blocks. With it on, hover colours, shadows and movement play on pointer hover only and keyboard focus shows the ring over the resting look.

Recommended rule: a block-wide row at the foot of the shared Hover panel (Styles tab), labelled "Keyboard focus", shown only where the block has at least one hover setting. Where a block has no Hover panel, it goes in that block's Colour panel if the block holds hover colours, and is hidden if the block has no hover value.

Why: Hover is the one existing panel whose subject is what the toggle changes, it sits on 78 of 85 blocks, it is one change in one component, and it removes 85 one-control panels.

Rejected: "first Settings panel" (those are unrelated to focus: Container / Wrapper on 11 blocks, Menu on 3, Style on 3, and many more titles); an "Accessibility" section (only 6 blocks have one, so it would create 79 new panels). Fallback if Bean prefers it: keep the existing "Keyboard focus" panel as one universal panel like Visibility conditions and Advanced; it costs nothing but leaves 85 one-control panels.

Check before building: the Hover panel has a Target picker, so the row must sit above it and read as block-wide. Unproven in the editor.

## Calls I made

- Registered all 99 controls (76 Behaviour plus 23 Settings (new)), not only the 76 in the brief, because the 23 are the same kind of lone control and i20 had flagged several as mis-sends.
- Kept the 25 group leads as "stays" rather than moving them: their panel grows when switched on, so they are not lone.
- Treated repeaters (Options, Stores, Languages) and icon pickers as correct in their own panels.
- Where i20 recommended a merged "Settings" panel (cart, nav-bar-menu, option-picker, choice-flow), I gave a merge into an existing panel instead (Trigger style, Menu Button, Options, Progress and steps, Navigation, Layout), because Bean rejected a new Settings panel.
- Changed three i20 positions: nav-drawer-menu Marker icon stays in "Submenu — Items" (i23 had already corrected Row extras); icon, cart, social-icons and tabs aria-labels stay in their existing Accessibility panels rather than folding into Icon or Layout; label and icon-list link underline go to Colour.
- Read "Colour (Styles)" and "Layout (Styles)" moves as cross-tab moves; the Settings and Styles tabs are the interim split, per Spec 35.
- The census is the canary build in its default state; no editor was opened and nothing was built. Where a recommendation needs a slot in a shared component it is marked Medium.
- Plain-line descriptions of what each control does come from the framework database descriptions and block source reads of the earlier reports; I did not re-read every `edit.js`. The weakest calls are account signed-out view, buybox second caption line, trust-bar overflow and gallery hover shadow (marked in the register's Why column).
