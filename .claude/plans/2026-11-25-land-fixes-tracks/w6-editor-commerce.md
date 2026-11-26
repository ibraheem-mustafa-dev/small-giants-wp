# Track W6 (label w6-commerce; plan Task 13): shop and choice-flow blocks, product card named

Stage E3. Read `_common.md`, then `w-e3-shared.md` (base branch, two passes, what every owner applies, done when), then this. Port 8109. Evidence: `i19-panels.md` section 1; `i24-register` (`register.md`) for your blocks; `i20-moves2.md` sections 2, 3 and 4c; `i23-details.md` sections 3a, 4 and 5.

**Your blocks:** product-card, buybox, cart, account, choice-flow, choice-flow-question, choice-flow-result, option-picker, wishlist-link, wishlist-panel, store-selector, product-search, gift-order, order-items, commerce-note, pay-later-message, free-delivery-bar, filter-search, product-faq, product-faq-item.

**Over 12 base colours (account, buybox, cart, product-card, choice-flow):** deferred to Task 30 with the same rule for every block over 12 (Bean, 2026-11-26); leave their Colour panels as they are.

**Efficiency (Bean, 2026-11-26):** build one shared codemod `plugins/sgs-blocks/scripts/move-control.js`, driven by the register (`E:\sgs-tmp\general-cloning\investigate\i24-register\decisions.py`), for the single-control moves; W7 reuses it. Reuse Stage E2's census (`E:\sgs-tmp\general-cloninguild\w5-codemods\census-final.json`) instead of new census runs.

**Shared files you own:** `src/components/button-kit/` (the `bare` mode and the switcher host below). Nothing else shared.

1. **Product card** (Bean, 2026-11-25 and 2026-11-26): the buttons as one job (the "Buttons" count setting `ctaButtons`, its sweep and route writer, and one "Button style" panel with a Button 1 / Button 2 switcher) is deferred to Task 30; "Show button", "Show basket icon" and "Show button shadow" stay where they are.
   - Remove the "Frame card" block style (`frame-card`). Saved use is 0 on every client site and copy; 3 posts on the sandybrown canary hold `is-style-frame-card`, so LISTS.md names them and the sweep gives each the equivalent settings.
   - Margin moves into the shared Spacing panel (Stage E2 moved the Dimensions margin; place it, do not move storage again). One shared shadow: the card keeps one shadow control (the shared `ShadowControl`), and any second card-shadow control goes.
2. **Choice flow picture size** is deferred to Task 30 (a stored-value sweep on Eye Care); leave `optionMediaSize` and the question's "Picture size" as they are.
3. **Register and repeated titles** for every block above (`w-e3-shared.md` items 1 to 3). Named cases: buybox's two extras panels merge into "Extras placement", "Buy box type" becomes "Buy box" and takes the product ID, "Add to cart button" and the kit's "Add to Cart button" become one; cart's "Display mode" joins "Trigger style", renamed "Cart trigger"; choice-flow's lone panels fold into "Choice Flow Settings", "Progress and steps" and "Navigation", and its two "Layout" panels become one; option-picker's pre-selected option and sub-label key join "Options" and its two "Label" panels resolve per `i20-moves2.md` section 4c.
4. **Layout preview:** product-card imports no shared canvas mirror for its Layout and Width (`i11-editor-ui.md` section 6); adopt `containerWrapperPreview` so the canvas follows the panel.

Done when: `w-e3-shared.md`'s list for your blocks, plus screenshots of the product card's Settings and Styles tabs before and after.
