# i12-blocks: trust bar layouts and overflow, label colours, product card and responsive logo panels

Read-only. Nothing saved to any site, repo or DB. Editor runs aborted every non-GET REST write (only the user-preference and autosave writes were attempted). The two empty auto-drafts the editor runs created are gone (6053 deleted by me, checked first; 6048 was already absent on re-check).

Scratch: `E:\sgs-tmp\general-cloning\investigate\i12-blocks\` (scripts `a-editor.mjs`, `b-front.mjs`, `c-panels.mjs`, `d-colour.mjs`; results `a-editor.json`, `a-mut.json`, `b-front.json`, `b-html.json`; 96 + 100 screenshots in `shots\`, named `ed-<width>-<style>-<layout>-<ticker|wrap>.png` for the canvas, `fe-<width>-<style>-<layout>.png` for the front end, `pc-*` product card, `rl-*` responsive logo).

Canary versus main: the canary still runs `ca6abcbeb` (LEDGER: nothing deployed since 2026-11-23), which lacks `00eac2c01` (the default ticker). I read `main`'s source as the truth and reproduced `main`'s default on the canary by storing the same overflow layer (`belowBreakpoint: overflow`, the content of `includes/motion/data/trust-bar-default-ticker.json`) on the bar. That is what `main`'s canvas does too (`edit.js::DEFAULT_TICKER_LAYER`), so the "ticker" canvas rows below are `main`'s behaviour. The front-end rows are the authored layout the bar shows while its badges fit, with JavaScript off or under reduced motion, because the motion runtime does not start on injected markup. While the ticker runs, CSS forces one row whatever the layout (also seen in the canvas rows).

## 1. Trust bar layout types and styles

Method: 5 badges (labels of 12 to 26 characters), 4 styles x 4 layout types x 3 widths, in the editor canvas (ticker and wrap) and on the front end (block-renderer markup injected into the canary homepage, wrap). Plus five control tests per style x layout at 1440 (columns, justify, gap, item gap, align).

### What each layout type does on the front end (PROVEN, `b-front.json`)

| Layout | Icon styles (circle, bare) | Text-only and image-badge | Verdict |
|---|---|---|---|
| Default (empty) | `display:block`, badges run inline. Gap, Columns, Justify and Align all do nothing (40px gap measured as 0 between badges). | The stylesheet's own centred wrapping flex (`style.css` `.sgs-trust-bar--text-only`, `--image-badge`). Gap works. | Works, but "Default" means two different things by style. Conflicts with the Gap control for icon styles. |
| Stack | Flex column: one badge per row (252px tall for 5 circles at 1440). Gap works; Columns, Justify do nothing. | Same column. | Works, but a five-row list is not a trust strip. Conflicts with the ticker (forced to one row) and with Hide extras (see below). |
| Flex | One row at 1440; wraps to 2 rows at 768 and 3 rows at 375. Gap and Justify honoured (right-align measured). Icon styles left-aligned; text/image styles centred by the stylesheet. | same | Works for every style. No conflicts. |
| Grid | Equal columns. Default template `repeat(4, 1fr)` desktop and tablet, `1fr 1fr` mobile. Five badges leave one orphan on row 2 at 1440 (96px high, 2 rows). Justify and Align content do nothing (columns fill the width). The text-only separator is hidden (`style.css`). | same | Works, and is the only equal-column option. Conflicts with the separator and with a 5-badge set. |

Columns (Layout panel), tested at 1440: with the template cleared it gives 2 columns under Grid in every style, and does nothing under Default, Stack and Flex. With the template at its default it is dead (known, i3). The "Badges" panel Columns (icon styles only) writes the same attribute.

Item gap (the "Gap / padding on each badge" panel): works on both icon styles and image-badge. On text-only it is accepted but changes nothing visible, because a text-only badge holds one child (computed `gap: 30px` with nothing to separate).

Hide extras (`overflowMode: drop`, code in `overflow-drop.js`): hides every badge whose top is below the first badge's top. Under Stack that hides all but the first badge; under a 4-column Grid it hides the fifth even when there is room. CODE-PROVEN, not run in a browser (the script is front-end only).

### Editor canvas against the front end (PROVEN, `a-editor.json`)

- Default and Stack on icon styles: the canvas paints a 4-column grid (2 rows, 96px at 1440) where the front end draws inline or a column (`edit.js`: `showBadgeGrid = isIconStyle && 'flex' !== layout`). Text-only and image-badge match.
- Tablet and Phone preview use the desktop column template: at 375 the Grid canvas shows 4 columns and clips 43px off the right, while the front end shows 2 columns (`gridTemplateColumnsPreview` resolves the 'desktop' tier only).
- With `main`'s default ticker the canvas shows one non-wrapping row at every width and layout, even when the badges fit: icon-circle Grid at 1440 is 44px high and one row in the canvas, 96px and two rows on the front end. This confirms i3's (a) on screen.
- Canvas ignores Item gap and Item padding for text-only and image-badge (`itemPreviewStyle` is applied only to the icon badges; image-badge computed gap stays 6px at a set 30px).

### Does Bean's belief hold?

Partly. Nothing is broken on the front end, so "conflicts with how the trust bar works" is too strong. What holds: only Flex behaves the same in all four styles and with Gap, Justify, the ticker, Hide extras and the separator. Default is inconsistent by style, Stack fights the ticker and Hide extras, Grid fights the separator and a five-badge set. Real content agrees: the only trust bars in the repo's build trees (Mama's footer, Eye Care header) are `icon-bare` with `flex`.

### Recommended lean control set (UNPROVEN as a build; each line rests on the measurements above)

- Layout type: Flex and Grid only. Show Default or Stack only when the bar already stores one, so saved bars render unchanged (a framework rule: no other site's render changes). Keep the block default `grid`: changing a default re-renders every unsaved bar.
- Columns: one control, Grid only, and it must win over the template (drop the populated `gridTemplateColumns` default or let `columns` take priority), so it cannot be dead. Remove the second Columns in "Badges".
- Keep Gap, Align items, and Justify content (Flex only).
- Remove: Custom column template, Row template, Auto rows, Justify items, Align content (a one-row strip never uses them), Flex direction (that is Stack), Flex wrap (the Overflow control owns wrap or drop or ticker).
- Needs a trim mechanism that does not exist: `LayoutPanel` has no per-control hide prop and `supports.sgs.enabledExtensions` is read by no layout panel (i3 and i8). Smallest build: one `controls` allow-list prop on `LayoutPanel`.
- Also fix, independent of the layout set: canvas tablet and phone columns, canvas Default and Stack for icon styles, canvas ticker preview when the badges fit, canvas Item gap for text and image styles.

## 2. Marquee: Overflow control against the Effects panel

PROVEN (code; `class-sgs-motion-ticker-default.php`, `edit.js`, `render.php`; plus real data):

- Two separate stored settings. The Effects panel stores a layer at `sgsMotion.elements.root.effects[effect=marquee].values` (`belowBreakpoint` always, tablet, mobile or overflow; speed, direction and so on). The Overflow control stores `overflowMode` (ticker, wrap, drop). They are linked only by a render-time filter (`render_block_data` priority 5): when `overflowMode` is ticker and no stored marquee layer exists, the server adds a default overflow layer for that request. Nothing is stored.
- Both set differently: the stored layer always wins. Stored layer plus `overflowMode: ticker` or `wrap` means the mode is ignored. A layer whose range is `always`, `overflow` or absent hides the Overflow control entirely (i8: empty panel), and `drop` is then not emitted. A layer limited to tablet or mobile leaves the control with Wrap and Hide extras, applied outside the range.
- Real example of the second case being deliberate: Eye Care's header trust bar stores a marquee for `mobile` only and `overflowMode: drop`, so it scrolls on a phone and hides extras on desktop. Mama's footer stores a marquee with `belowBreakpoint: always` and id `mmtag` (not `marquee`), so any writer must find the layer by `effect`, not by id.
- A trap: remove the layer in the Effects panel while `overflowMode` is still the default ticker, and the ticker silently returns at the next render (the filter re-adds it). The only way to switch it off is the Overflow control, which is hidden while the layer exists, so the user has to delete the layer first and then pick Wrap. UNPROVEN on screen (the canary lacks the filter); `tests/php/TrustBarDefaultTickerTest.php` covers the filter.
- For the clone: the clone writes the layer and never `overflowMode`, so it already chooses one way; the second setting is only a decoy for the setting record (i3 section 8).

Could the Overflow control write the motion layer directly (one stored value, two editors)? Yes. Precedent: `blocks/extensions/motion/layers/use-motion-layers.js` exports pure `addLayer`, `removeLayer` and `updateLayer`, and the Background panel already links to the Effects panel through the `sgs/inspector-focus` store (it creates no motion; Spec 49 9.6). What it takes:
1. Ticker writes a layer with `belowBreakpoint: overflow`, keeping any values already tuned in the Effects panel (update only that field). Wrap removes the marquee layer. Hide extras removes the layer and keeps drop. A layer with another range shows "Ticker (custom, see Effects)" with a button that opens the Effects panel on the root.
2. `overflowMode` shrinks to a drop switch (rename to an on/off `overflowDrop`) because drop is not a motion; Eye Care's mobile-marquee plus desktop-drop needs both facts, so it cannot collapse into one three-way choice.
3. The default must be stored, not injected: seed the layer when a trust bar is inserted (block variation or a mount effect), then a one-off batch sweep for saved bars that rely on the injected default (FP-14 allows no server fallback), then delete `Sgs_Motion_Ticker_Default`, `DEFAULT_TICKER_LAYER`, the `ticker` enum value, `TrustBarDefaultTickerTest`, and update Spec 02 and Spec 38A FR-38A-44 and the setting record.
4. Cost note: the stored-default change alters no rendered output if the sweep writes exactly the layer the filter adds today. Render-scope can list the pages.

## 3. "Label colour" against "Root text colour"

PROVEN (render markup and computed colours, `d-colour.mjs`):
- They paint different elements only because the markup names the same text node two ways: icon styles print the label as `.sgs-trust-bar__label`, text-only and image-badge print `.sgs-trust-bar__badge-label` (`render.php` lines near the badge builders; the block.json `label` and `badge-label` element notes say so).
- `textColour` (Root text colour) sets the root `color` and `--sgs-trust-badge-text-colour`, which only `.sgs-trust-bar--icon-* .sgs-trust-bar__label` reads. `labelColour` emits `.badge-label{color:…}` on every style, with the default `text` always emitted.
- Computed results (label colour): icon-circle and icon-bare: Root text red gives red, Label colour green changes nothing (the rule matches no element). Text-only and image-badge: Root text red changes nothing (the always-emitted `labelColour` default overrides the inherited value), Label colour green gives green. Both set on text-only: green.
- So one row could serve every style. Smallest change: name it "Label colour" everywhere, and let the single attribute paint both class names (one selector list) while Root text colour stays for the root and separator. Cleaner: have `render.php` print one class (`__label`) in all styles, which touches clone selectors and any client CSS, so it needs the render-scope check. Existing bars: Mama's footer stores both attributes (the `labelColour` one is dead today); a sweep merging them is trivial, and no output changes for icon styles if the merged value is the old `textColour`.

## 4. `sgs/product-card` editor

(a) Native panels (PROVEN, `shots\pc-styles-tab-collapsed.png`, `pc-native-styles-panel.png`):
- Styles panel (Classic or Frame Card): comes from `block.json` `styles` (two entries). No `registerBlockStyle` exists anywhere in `src`; remove by deleting the `styles` key, then delete the `.is-style-frame-card` rules in `style.css`, the `frame-card` entries in `scripts/data/setting-records/product-card.json`, and the references in `tests/fixtures/media/pre-adoption/product-card.block.json` and `scripts/tests/test-wishlist-cards.mjs`. What the style does (CSS): a 1:1 aspect ratio and a cream fill on the photo box, square badge corners, round swatches. The "gap under the image" fits a forced square box around a photo with another ratio; I could not show it because an empty card has no photo (UNPROVEN on screen; settle by a card with a connected product).
- Saved content using it: none found. Scanned 563 `sgs/product-card` blocks in 86 files (`sites/*/build` trees and backups, `.claude/backups`, `.claude/reports`, `reference`, test fixtures): zero `is-style-*` class names. UNPROVEN for live sites' databases; what settles it: a read-only `post_content LIKE '%is-style-frame-card%'` on each target.
- Spec 32 (Component styling) already rejects WordPress block styles; yet 16 blocks still show the panel (section 6).
- Dimensions panel: `supports.spacing` is `margin: true, padding: false`, with `__experimentalSkipSerialization`. So the panel holds Margin only, and it is not a duplicate: product card declares no SGS `margin` attribute and no SGS margin panel, so it is the only margin control. Removing it means first adding a `margin` tier attribute and a panel (the shared `ResponsiveBoxControls`), and Spec 32 section (b) says "keep the support, never drop it" for the scoped base tier, so Spec 32 needs an amendment first. Saved margins: zero of 563 saved cards carry `style.spacing`, so a migration would move nothing in the repo (live sites UNPROVEN).

(b) "Button" against the two call-to-action panels (PROVEN in code):
- "Button" (Styles tab, `edit.js`): primary and secondary text, URL, primary behaviour (bound mode), "Text alignment" (`ctaTextAlign`) and secondary text alignment (`cta2TextAlign`), a "Reset colours to preset" button, and a paragraph pointing at the next panel.
- "Call to action button" and "Secondary call to action button" (shared button kit, `block.json` `builtinButtons`, groups preset, colour, gradient, border, padding, width, minHeight, contentAlign, shadow, hoverLift, typography): the look of each button, in the kit's own "Colour" sub-panel plus the main panel.
- Overlap: `ctaTextAlign` (text-align) and the kit's `ctaContentAlign` ("Centre (default) / Start / Centre / End / Spread", justify-content) both align the button's content, and `render.php` emits both. Same for `cta2`. "Reset colours to preset" repeats what choosing a style in the kit's Style row does (the kit calls `ctaPresetSeed`). The text and URL belong with the content, not the look, so the clean split is: "Button" keeps text, URL, behaviour; the alignment moves to the kit's Content alignment (one attribute) and the reset button goes.

(c) Every padding control on the card (PROVEN; `shots\pc-panel-Card-padding.png`, `pc-panel-Card-padding-shadow.png`):

| Control | Attribute | Panel |
|---|---|---|
| Card padding (desktop) | `cardPadding` | "Card padding" |
| Card padding on tablet, on mobile | `cardPaddingTier.tablet`, `.mobile` | "Card padding & shadow" |
| Brand overlay padding | `brandPadding` | "Photo overlays" |
| Saving badge padding | `savingBadgePadding` | "Rating, brand, saving badge & attribute tag" |
| Attribute tag padding | `attributeTagPadding` | same |
| Tag padding (trial or featured) | `tagPadding` | "Typography" |
| Image padding | `imagePadding` (media atom `media-padding`) | the image media panel |
| Button padding (two) | `ctaPadding`, `cta2Padding` | the two button kit panels |
| Margin (native) | `style.spacing.margin` | Dimensions |
Card padding is split into two panels and two attributes for one setting (a base plus a separate tier object, the older shape). It should be one `cardPadding` tier object in one "Card" spacing row. The rest are different elements. "Card padding & shadow" also holds the No-photo label and "Space above the price", which are not padding or shadow.

(d) Shadow (PROVEN in code, a correction to the brief):
- The hover shadow is not in the motion panel. It is the block's own "Card hover shadow" panel (Settings tab), built with the shared `ShadowControl` in `hoverOnly` mode on `cardShadowHover` and `cardShadowColourHover`. The "Hover" motion panel holds lift, scale and so on, no shadow; a stale help text in `listing-panels.js` ("set in Hover Effects") says otherwise.
- The resting shadow is not a control at all: a stylesheet default (`--sgs-product-card-shadow` in `style.css`) behind a toggle, "Resting shadow" (`showShadow`, default true; `render.php` adds `product-card--flat`, which sets the variable to none). The card's image shadow already uses the shared control (`imageBoxShadow` family), and the two buttons too.
- Moving to the shared control takes: add `cardShadow` and `cardShadowColour` (the naming rule `shadowAttrKeys('cardShadow', {hover, hoverColour})` already matches the two hover attributes, so no rename); mount one `ShadowControl` with all four keys in one "Card shadow" panel, with its Normal and Hover switch; have `render.php` print `--sgs-product-card-shadow` from `cardShadow` (empty keeps today's default); migrate `showShadow: false` to `cardShadow: none` and drop `showShadow` and `product-card--flat`. Saved values: 148 saved cards store `showShadow` (mostly false), 13 store the hover pair, all in Eye Care builds and backups; the migration is the FP-14 batch sweep with no deprecation. Render-scope lists any page that changes (none if `false` maps to `none` exactly).
- Catalogue: DB `block_attributes` lists the 10 blocks with a `shadow` attribute; `cardShadowHover` is already stored by element `wrapper`, `css:box-shadow`, state hover.

## 5. `sgs/responsive-logo` two Media panels

PROVEN (`shots\rl-settings-tab-collapsed.png`, `rl-media-panel-1.png`, `rl-media-panel-2.png`; census `sgs/responsive-logo` Settings): two `MediaElementPanel` mounts in `edit.js`, one with `prefix="logo"` (kinds image and svg; Photo and SVG tabs, alt text) and one with `prefix="logoDark"` ("Logo for dark backgrounds", image only). The component names a panel from its `label` prop when a block mounts several ("Names the slot in each panel title when a block mounts more than one"), and responsive-logo passes none, so both read "Media". Both should stay: they hold different pictures. Fix: pass `label="Logo"` and `label="Logo for dark backgrounds"`. Both also appear after Visibility conditions on first select because the panel body is lazy-loaded (i3 section 7).

## 6. Library-wide counts of the same shapes

Native Styles panel still shown (the shape in 4a): 16 blocks (census, canary): 3 from `block.json` `styles` (business-info, product-card, star-rating), 13 from PHP `register_block_style` in `includes/variations/` (accordion, form, gallery, heading, info-box, label, post-grid, pricing-table, quote, tabs, team-member, testimonial, text). The two sources reconcile to the census exactly. Spec 32 rejects block styles, Spec 35A says `variant_slots` covers them, so all 16 are against the standard; whether any saved content uses their `is-style-*` classes is checked for product-card only.

Native Dimensions panel: 7 blocks show it (card-grid, feature-grid, post-grid, pricing-table, tabs, testimonial-slider; product-card Margin only), and `sgs/form-step` also declares `supports.spacing.padding` (8 in source; form-step's flat inspector was not readable by the census, UNPROVEN). For the six full ones it is the only padding and margin control found (no second spacing panel); Spec 32 section (b) says to keep the support.

Other native panels declared in source and still shown: Typography (counter, quote, wishlist-panel: 3 blocks) and Filters or duotone (gallery, media: 2 blocks), although Spec 35A Part G says no block declares `supports.filter`. Spec drift to settle.

Same panel title twice in one tab (census, canary): 16 groups in 15 blocks, 46 panels. By title: Colour 8 blocks (account 6, buybox 3, choice-flow 7, container 3, gallery 3, product-card 3, product-search 2, testimonial-slider 3), Effects 5 blocks (button, heading, nav-bar-menu, nav-drawer-menu, text), and one each of Layout (choice-flow, Settings), Hover (hero), Media (responsive-logo). Causes read from each panel's controls:
- Media: a second `MediaElementPanel` mount without `label` (1 block, section 5).
- Colour (8): the block's own Colour panel plus the shared button kit's "Colour" sub-panel (Background, Text) and the shared carousel dots panel's "Colour" (Dot, Dot border): shared components that title their panel with the same word as the block's.
- Effects (5) and Hover (hero): a block's own panel (Box shadow; Transition duration and easing) and the motion extension's Effects or Hover panel.
- Layout (choice-flow): two hand-written panels, one with Outer max-width and Padding, one with a single Layout control. Only the Media case is the exact "two mounts of one component" shape; the others are two components that share a title.

## Calls I made

- Treated "layout types" as the four the picker offers (Default, Flex, Stack, Grid); the enum has no others.
- Emulated `main`'s default ticker on the canary by storing the overflow layer, since the canary build predates it; front-end rows are the fitting or no-JavaScript state, not a running ticker.
- Used 5 badges, no pictures for image-badge (the canvas and the block-renderer show it as plain labels), and block-renderer markup on the canary homepage rather than saving a page.
- Did not search live site databases for `is-style-frame-card` or `style.spacing`; the repo scan stands in and is labelled.
- Read the census (`i8-editor\census-all.json`, canary build) for the library counts rather than re-running 104 blocks; its numbers are the canary's, and source scans (`block.json`, `register_block_style`) confirm the 16 and the 8.
- Did not open the product card with a connected product, so the Frame Card gap is unshown.
