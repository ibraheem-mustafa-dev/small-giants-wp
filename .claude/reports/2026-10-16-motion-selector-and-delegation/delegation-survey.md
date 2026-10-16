# Delegation survey: blocks that render another block with a hand-built attribute list

Static read of the working tree on 2026-10-16 (no browser, no canary). Machine-readable twin: `delegation-survey.json` beside this file. Scripts: `survey.py` + `sites_in.json` (render sites), `items_scan.py` (item blocks), `build_report.py` (counts), all run from `plugins/sgs-blocks`.

## 1. Every render site (FACT)

Search: `render_block(`, `'blockName' =>`, `new WP_Block(`, `do_blocks(`, `parse_blocks(` across `src/blocks/**/*.php` and `includes/**/*.php`. Sites that render a parsed post (`do_blocks( $post->post_content )` in modal, form, choice-flow, mega-panel, active layout, drawer) or a block's own inner blocks (`new WP_Block( $answer_block->parsed_block )` in accordion, product-faq) are not hand-built and are excluded.

| # | Parent -> child | file::symbol | Mode condition | Keys forwarded (child name <- parent attr) | Parent control |
|---|---|---|---|---|---|
| 1 | card-grid -> product-card | `card-grid/render-delegated.php` cpt foreach `$card_attrs` | `source=cpt-collection` | sourceMode (computed), productId (computed), showPickers<-showPickers, ctaBehaviour<-ctaBehaviour, showLadder<-showLadder, sgsMotion (if non-null, `Sgs_Motion_Delegate::child_motion`) | all three in `components/collection-panel.js` |
| 2 | card-grid -> product-card | same file, wc foreach | `source=wc-product` | sourceMode='wc-product', productId, showLadder<-productShowLadder, sgsMotion | `components/ProductsToolsPanel.js` |
| 3 | buybox -> option-picker | `buybox/render.php` section 8b axis loop `$buybox_picker_attrs` | layout not guided; axis has 2+ terms or is in pickerAlwaysShowAxes | label, showLabel, optionItems, defaultSelected, typeKey (computed); showSelectedTick<-pickerShowSelectedTick; pillStyle<-pickerSwatchStyle or pickerStyle (if set); subLabelMetaKey<-pickerSubLabelMetaKey (if set); labelFontSize/Unit, labelLetterSpacing/Unit, labelTextTransform, labelColour <- pickerLabel* (only when no label link and no selected value) | `inspector-extra-3.js` (tick, styles, typography prefix `pickerLabel`), `inspector-extra-2.js` (sub-label), `inspector-extra.js` (label colour) |
| 4 | buybox -> option-picker | `includes/buybox-guided.php::sgs_buybox_guided_picker` | `layout=guided` | label, showLabel=false, optionItems, defaultSelected, requireChoice, typeKey; showSelectedTick, pillStyle, subLabelMetaKey as #3 | as #3 |
| 5 | buybox -> modal (+ choice-flow inner) | `includes/buybox-linked-flow.php::sgs_buybox_render_linked_flow_modal` | buybox has a linked flow | modal: anchor, size='fullscreen', triggerStyle='none'; choice-flow: flowId, flowIsLinked=true | none (all fixed) |
| 6 | product-card -> option-picker | `product-card/render.php` section 2b axis loop + `$picker_style_attrs` | bound WC variable product, showPickers, visibleAxes | 5 computed + labelFontSize, labelColour, labelColourGradient + 12 `$picker_style_attrs` (colourPreset, showSelectedTick, pillBg/Text/Border colours and gradients, pillBorderRadius, pillSelected Bg/Text/Border/Radius) | all in `product-card/edit.js` |
| 7 | product-card -> option-picker | `product-card/render.php` non-variable pill branch | bound non-variable / sgs-cpt with a pill type | as #6 + contentImpact | as #6 |
| 8 | product-card -> option-picker | `includes/product-card-builtin-render.php` pack-size chooser + `$sgs_pcard_picker_style_attrs` | `sourceMode=typed` with packSizes | 5 computed + the same 12 style keys (no label typography) | as #6 |
| 9 | nav-drawer -> google-rating-badge | `includes/nav-drawer-chrome.php::sgs_nav_drawer_chrome_rating_attrs` (via `::sgs_nav_drawer_chrome_rating_html`) | `chromeRating` on | badgeStyle, compactBelow, borderStyle, borderWidth, backgroundColour, padding (fixed); showCount<-chromeRatingShowCount; scoreColour + captionColour <- chromeRatingColour (if set) | `ChromeRatingControls.js`, `chrome-colour-rows.js` |

Counter-example (not the pattern): `includes/account/class-account-endpoints.php::render_saved_items_endpoint` renders sgs/wishlist-panel with the WHOLE attribute set of the first authored instance (`::find_wishlist_panel_attrs`), overriding only `heading`.

Every forwarded parent attribute has a control in the parent. The defect is what is NOT forwarded.

## 2. Child reachability (FACT, counts from block.json)

| Site | Child attrs | Forwarded | Unreachable styling/behaviour | Notes |
|---|---|---|---|---|
| card-grid cpt -> product-card | 370 | 5 in schema (+ sgsMotion) | 343 | 24 per-product content attrs excluded as not grid-level |
| card-grid wc -> product-card | 370 | 3 (+ sgsMotion) | 345 | wc mode also drops showPickers and ctaBehaviour: the card gets its defaults (true, learn-more); the grid's controls for them live only in the cpt panel |
| buybox -> option-picker | 74 | 14 (std), 9 (guided) | pill colours, hover and selected states, borders, size, padding, gap, pill typography all unreachable | buybox declares no pill colour attributes at all |
| product-card -> option-picker | 74 | 20/21/17 | pillBgColourHover(+Gradient), pillTextColourHover, pillBorderColourGradient, pillSelectedBorderColourGradient, pillSize, pillPadding, tileGap, label hover colours | pill typography reaches the picker by a descendant CSS rule instead (`render.php`: `sgs_typography_css_rule( $attributes, 'pill', '.' . $sgs_card_uid . ' .sgs-option-picker__pill' )`) |
| nav-drawer -> rating badge | 64 | 9 | borderColour, borderRadius, shadow, typography of score/caption, etc. | frame is deliberately fixed (docblock) |

product-card attributes unreachable from the grid, by concern (cpt mode; full lists in the JSON `productCardReachability`):

- CTA (23): ctaColourBackground, ctaColourText, ctaColourBorder (+Gradient each), the six Hover twins (+Gradient), ctaBorderStyle, ctaBorderWidth, ctaBorderRadius, ctaFontWeight, ctaFontSize, ctaPadding, ctaWidthType, ctaStyle, ctaLineHeight, ctaTextAlign, ctaText.
- Secondary CTA (3): cta2Text, cta2Style, cta2TextAlign.
- Visibility (9): showCta, showRating, showBrandOverlay, showSavingBadge, showAttributeTag, showDescription, showWishlist, showGalleryThumbs, showShadow.
- Card ground and border (25 colour + 12 border + cardPadding): backgroundColour(+Gradient, Hover, HoverGradient), textColour(+Hover), mediaBackgroundColour, borderColour, borderColourGradient, borderWidth, borderRadius, borderStyle, borderColourHover, cardPadding.
- Title (17), price/RRP/price note/value ladder/saving badge (97), rating and stars (32), description/tag/brand/attribute tag/swatch typography (46), picker pills (19), other layout (40: variantStyle, headingLevel, cardMaxWidth, framingMode, swatchSize, ...).

Structurally unreachable vs reachable-without-control: all 343/345 are structurally unreachable (card-grid has no attribute that carries them into `$card_attrs`). 34 (cpt) / 36 (wc) of them share a NAME with a card-grid attribute that has a control (titleColour, titleFont*, borderColour..., cardPadding, headingLevel, noImageLabel*, textColourHover, backgroundColourHover...), but that grid attribute paints the grid's own `.sgs-card-grid__*` classes and is never forwarded.

## 3. motionDelegate coverage (FACT)

Only `card-grid/block.json::supports.sgs.motionDelegate` exists (attribute `source`, values wc-product/cpt-collection, block sgs/product-card). Related keys: `motionItems` (card-grid item, gallery item, nav-drawer-menu item, post-grid card, timeline entry) and `animationItems` (card-grid only, lists `.sgs-product-card`).

product-card non-excluded parts (26; `pill` is motion:false): box (wrapper), body, image, title, price, wishlist, rrp, desc, description, priceNote, price-note, priceFromLabel, tag, rating, brand, savingBadge, swatch, attributeTag, ratingStars, swatchMore, cta2, noImageLabel, valueLadder, valueLadderSaving, priceRow, cta.

Mapped: item->root, title, image, body, noImageLabel. Unmapped (21, cannot be targeted from the grid in products mode): price, wishlist, rrp, desc, description, priceNote, price-note, priceFromLabel, tag, rating, brand, savingBadge, swatch, attributeTag, ratingStars, swatchMore, cta2, valueLadder, valueLadderSaving, priceRow, cta.

## 4. Item-array blocks (FACT for parts; markup scan is a regex heuristic)

| Block (items attr) | Item parts | Interactive/badge item elements with no motion part |
|---|---|---|
| card-grid manual (`items`) | item (an `<a>` when linked), image, image-wrap, title, subtitle, badge, body, glyph, glyphInitial, imageOverlay, noImageLabel | none; the `.sgs-card-grid__overlay` caption layer has no part |
| gallery (`mediaItems`) | item, img-wrap, image, caption | `.sgs-gallery__item-link` (`render-tile.php`), no settings; covered visually by item |
| icon-list (`items`) | item, item-icon, item-text, item-link, item-description | none |
| pricing-table (`plans`) | plan-card, title, price, feature, cta, badge, ribbon | `.sgs-pricing-table__savings-badge` (`render.php`, from `plans[].savingsBadgeText`): no styling attributes and no part |
| process-steps (`steps`) | step, icon, number, title, description | none (no links in the item schema) |
| post-grid (query) | card, image, title, excerpt, meta, category-badge, read-more | block-level `__filter` buttons and `__carousel-prev/next` (`render-interior.php`): only show toggles, no colours, no part |
| google-reviews (`reviews`) | review, avatar, author, meta, date, text, star, card-logo, review-link, ... | `__card-logo-link` (`render-interior.php`): size only, no part |
| trustpilot-reviews (`reviews`) | wrapper, inner, title only | `__arrow`, `__count-link`, `__header-logo-link` (`render.php`): toggles only, no part |
| team-member (`socialLinks`) | card, image, name, role, bio, social | `__social-link` has typography but no part of its own |
| brand-strip, trust-bar | item and inner parts present | none flagged |

## 5. Parent inspector per mode (FACT, static)

`card-grid/edit.js` gates only ItemEditor (manual), CollectionPanel (cpt), ProductsToolsPanel (wc) and the pageButton typography row (cpt). Shown in products modes but painting only `.sgs-card-grid__*` markup that delegated output never prints (`render-card-css.php` comment says the card tile rule is "a harmless no-op there"; `style.css` hover rules target `.sgs-card-grid__item`):

- ElementColourPanels: titleColour*, subtitleColour*, glyphColour, imageFallbackColour, noImageLabelColour, overlayColour/Gradient.
- CardStylesPanel: cardBackground*, cardBorderColour*, cardBorderWidth, cardRadius, backgroundColourHover*, textColourHover*, borderColourHover*.
- GlyphOverlayPanels (all), GridSettingsPanel: aspectRatio, variant, imageHeight, imagePadding, effectHover.
- CardGridHoverEffectsPanel: scaleHover, imageZoomHover, grayscaleHover, transitionDuration/Easing (staggerDelay does apply through `animationItems`).
- TextStylingPanel title/subtitle/badge/glyphInitial/noImageLabel typography; CardSpacingStylingPanel titleMarginBottom.

Missing for the delegated card: everything in section 2, plus showPickers/ctaBehaviour in wc mode.

Generic reflection mechanism: none. `getBlockType(` hits in `src/` read only supports (motion, spacing) or the block's own attributes (`container/components/BackgroundPanel.js`); `StarterLookPresetControl.js` reads pattern-owned keys. The only parent-to-child channels are hand-written: `providesContext` (accordion 28 keys, social-icons 9, nav-drawer 3, ...) and descendant CSS (product-card -> option-picker pill typography).

## 6. Design options (OPINION, built on the facts above)

Surface (fact): one delegating parent (card-grid, 2 modes) over one child (product-card, 370 attrs, 26 parts). product-card's inspector lives inline in a 3,677-line `edit.js`; its uid is `wp_unique_id()` per card, so per-card styling prints once per card.

- A. `cardAttributes` object on the grid, controls generated from the child schema, merged under `$card_attrs`. Needs: 1 object attr, a PHP merge, a generic control generator. Gets the child's own validation free (`WP_Block_Type::prepare_attributes_for_render` drops off-schema values). Breaks: generated controls fall short of product-card's hand-built panels (SgsColourPanel rows, border pair, typography); nested keys are invisible to `sgs-framework.db`, gates and Solve.
- B. Same storage as A, but mount product-card's own inspector against a proxy (`attributes=cardAttributes`, `setAttributes=patch => setAttributes({ cardAttributes: {...cardAttributes, ...patch} })`). Needs: extract product-card's inspector into an exported component taking `name`/`attributes`/`setAttributes` (the Edit-is-3,677-lines refactor), hide typed-content panels, a `supports.sgs` key that names the nested attribute so the DB seeder and gates expand it. One inspector, no drift; it is literally Bean's direction.
- C. Template inner block (core Query Loop pattern): the grid holds one locked sgs/product-card in delegated modes, and render-delegated merges its attributes into every result. Real block, so DB/Solve/gates/motion work unchanged. Breaks: two selection points (not "beside its own settings"), editor work to make the template selectable over the server preview.
- D. Hand-forward more keys (today's pattern) or context: 343 attributes by hand, drifts. Reject.
- Motion, all options: change the `motionDelegate` map to identity over the child's parts (or add the 21), a data-only change.

Recommendation: B, with motionDelegate made identity. It is the only option that gives the exact card controls inside the grid's inspector with one code path, and the extraction also cuts the over-limit product-card `edit.js`. Choose C instead if keeping card attributes first-class in the framework DB matters more than one-inspector UX.

## Not determined

Live rendering (all no-op claims are static reads); view.js-injected markup; inner-block item blocks (timeline, testimonial-slider) item markup; whether `effectHover`/`transitionDuration` reach product-card via any stylesheet outside card-grid; per-panel control mapping is a grep, not a mounted-control census.
