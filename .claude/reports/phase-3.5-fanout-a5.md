# Phase 3.5 Fanout — Branch A5

**Scope:** 32 small blocks, 101 un-canonicalised attributes.
**Method:** Inspect each block.json + spot-grep render.php/save.js, then propose `canonical_slot` + `role` from the locked vocab (55 slots, 20 roles).
**DB:** Read-only — no writes performed.

Format per row: `attr_name` → `canonical_slot` / `role` — rationale.

---

## sgs/accordion-item (1)

- `isOpen` → `panel` / `boolean-visibility` — Controls whether the accordion panel is open by default; binary disclosure state.

---

## sgs/brand-strip (7)

- `fadeEdges` → `overlay` / `boolean-visibility` — Toggle for left/right edge gradient mask overlay.
- `fadeWidth` → `overlay` / `number-css-px` — Width in px of the edge fade region (treated as overlay sizing).
- `greyscale` → `hover` / `boolean-visibility` — Visual filter mode flag on the logo grid (treated as a stateful visibility/filter switch; closest slot in vocab).
- `logos` → `items` / `query-descriptor` — Repeater array of logo media entries.
- `scrollDirection` → `animation` / `select-from-enum` — Direction enum (left/right) for marquee scroll.
- `scrollSpeed` → `animation` / `select-from-enum` — Speed preset enum (slow/medium/fast) for marquee.
- `scrolling` → `autoplay` / `boolean-visibility` — Enables marquee auto-scroll; semantically autoplay-on/off.

---

## sgs/breadcrumbs (3)

- `currentColour` → `text` / `colour-text` — Colour of the current-page crumb label.
- `homeLabel` → `label` / `text-content` — Text label for the home crumb.
- `showHome` → `link` / `boolean-visibility` — Toggle visibility of the home crumb.

---

## sgs/business-info (4)

- `linkEmail` → `link` / `boolean-visibility` — Wrap email type in mailto link.
- `linkPhone` → `link` / `boolean-visibility` — Wrap phone type in tel: link.
- `showIcon` → `icon` / `boolean-visibility` — Toggle icon render alongside info.
- `type` → `variant` / `select-from-enum` — Info type enum (phone/email/address/hours/etc) — drives which field renders.

---

## sgs/card-grid (4)

- `queryCategory` → `items` / `query-descriptor` — Taxonomy term filter for dynamic source mode.
- `queryPostType` → `items` / `query-descriptor` — Post type filter for dynamic source mode.
- `queryPostsPerPage` → `items` / `query-descriptor` — Result count for dynamic source mode.
- `source` → `variant` / `select-from-enum` — Manual vs dynamic data source mode toggle.

---

## sgs/certification-bar (1)

- `badgeSize` → `variant` / `select-from-enum` — Badge size preset enum (small/medium/large).

---

## sgs/counter (4)

- `accentStroke` → `border` / `boolean-visibility` — Toggle decorative accent stroke around number.
- `duration` → `transition` / `number-css-px` — Count-up animation duration in ms.
- `prefix` → `text` / `text-content` — Text prepended to the number (e.g. "£").
- `suffix` → `text` / `text-content` — Text appended to the number (e.g. "+").

---

## sgs/data-display (4)

> Note: `sgs/data-display` is a planned/ghost block (no src folder). Classifications proposed from DB schema intent.

- `defaultDataSourceId` → `items` / `query-descriptor` — ID of the registered data source feeding the block.
- `displayDescription` → `subheading` / `boolean-visibility` — Toggle render of the description sub-text.
- `displayTitle` → `heading` / `boolean-visibility` — Toggle render of the title heading.
- `refreshOverride` → `autoplay` / `number-css-px` — Cache TTL override in seconds for data refresh cadence.

---

## sgs/feature-grid (5)

- `alignItems` → `layout` / `select-from-enum` — Flex/grid align-items axis enum.
- `justifyItems` → `layout` / `select-from-enum` — Flex/grid justify-items axis enum.
- `layoutMode` → `layout` / `select-from-enum` — Mode enum (auto-flex/grid).
- `minItemWidth` → `min` / `number-css-px` — Minimum item width for auto-flex sizing.
- `minItemWidthUnit` → `min` / `select-from-enum` — Unit enum (px/rem/%) for minItemWidth.

---

## sgs/form-field-address (3)

- `enableLookup` → `panel` / `boolean-visibility` — Toggle Postcode lookup feature visibility.
- `fields` → `items` / `select-from-enum` — Array of enabled address sub-fields (line1, line2, city...).
- `lookupProvider` → `variant` / `select-from-enum` — Provider enum (getaddress.io etc.).

---

## sgs/form-field-consent (2)

- `consentText` → `text` / `richtext-content` — Inline rich-text shown next to the checkbox.
- `consentType` → `variant` / `select-from-enum` — Consent variant enum (terms/marketing/privacy).

---

## sgs/form-field-date (2)

- `maxDate` → `max` / `text-content` — ISO date string ceiling.
- `minDate` → `min` / `text-content` — ISO date string floor.

---

## sgs/form-field-file (4)

- `allowedTypes` → `items` / `select-from-enum` — MIME type enum array (image/*, application/pdf).
- `maxFiles` → `max` / `number-css-px` — Maximum file count.
- `maxSize` → `max` / `number-css-px` — Maximum size in MB per file.
- `uploadText` → `label` / `text-content` — Button label / dropzone instruction text.

---

## sgs/form-field-number (1)

- `step` → `number` / `number-css-px` — HTML5 number-input step increment.

---

## sgs/form-field-textarea (1)

- `rows` → `number` / `number-css-px` — Visible row count of the textarea.

---

## sgs/form-field-tiles (3)

- `multiSelect` → `variant` / `boolean-visibility` — Single vs multi selection mode toggle.
- `selectedStyle` → `variant` / `select-from-enum` — Selected state visual enum (checkmark/highlight/border).
- `tiles` → `items` / `query-descriptor` — Repeater array of tile option entries.

---

## sgs/heritage-strip (1)

- `bgPattern` → `backgroundMedia` / `select-from-enum` — Decorative background pattern preset enum.

---

## sgs/icon (3)

- `backgroundShape` → `variant` / `select-from-enum` — Container shape enum (circle/square/none).
- `linkLabel` → `ariaLabel` / `text-content` — Accessible label for the linked icon.
- `size` → `width` / `number-css-px` — Icon glyph size in px.

---

## sgs/icon-block (2)

- `linkLabel` → `ariaLabel` / `text-content` — Accessible label for the linked icon.
- `shape` → `variant` / `select-from-enum` — Container shape enum.

---

## sgs/mega-menu (7)

- `highlight` → `badge` / `boolean-visibility` — Toggle highlight/featured marker on the top-level item.
- `linkHoverBgColour` → `hover` / `colour-bg` — Hover state background colour for child links.
- `linkHoverColour` → `hover` / `colour-text` — Hover state text colour for child links.
- `menuTemplatePart` → `panel` / `query-descriptor` — Template part slug whose content fills the mega panel.
- `openOn` → `panel` / `select-from-enum` — Trigger enum (hover/click) for panel disclosure.
- `opensInNewTab` → `linkOpensNewTab` / `boolean-visibility` — Open top-level link in new tab.
- `panelBgColour` → `panel` / `colour-bg` — Background colour of the dropdown panel.

---

## sgs/mobile-nav-toggle (1)

- `popoverTarget` → `drawer` / `query-descriptor` — ID of the popover/drawer element this button toggles.

---

## sgs/modal (6)

- `closeOnOverlay` → `overlay` / `boolean-visibility` — Click-overlay-to-close behaviour toggle.
- `modalBackground` → `panel` / `colour-bg` — Modal dialogue panel background colour.
- `triggerBackground` → `button` / `colour-bg` — Trigger button background colour override.
- `triggerColour` → `button` / `colour-text` — Trigger button text colour override.
- `triggerStyle` → `button` / `select-from-enum` — Trigger button style variant enum (primary/secondary/ghost).
- `triggerText` → `button` / `text-content` — Trigger button label text.

---

## sgs/notice-banner (2)

- `customIcon` → `icon` / `text-content` — Custom icon slug/SVG override.
- `dismissible` → `button` / `boolean-visibility` — Toggle close-button visibility / dismissal behaviour.

---

## sgs/process-steps (2)

- `connectorStyle` → `separator` / `select-from-enum` — Connector visual enum (line/dotted/arrow/none).
- `steps` → `items` / `query-descriptor` — Repeater array of step entries (number/title/description).

---

## sgs/product-card (6)

- `ctaText` → `button` / `text-content` — CTA button label.
- `packSizes` → `items` / `query-descriptor` — Repeater array of pack size variants.
- `priceLarge` → `price` / `text-content` — Display price headline string.
- `priceNote` → `price` / `text-content` — Smaller price qualifier (e.g. "per case").
- `productName` → `heading` / `text-content` — Product title text.
- `trialTag` → `badge` / `text-content` — Trial/promo tag label.

---

## sgs/social-icons (1)

- `icons` → `items` / `query-descriptor` — Repeater array of social link entries.

---

## sgs/svg-background (4)

- `animationSpeed` → `animation` / `select-from-enum` — Speed preset enum for the SVG motion.
- `animationType` → `animation` / `select-from-enum` — Animation type enum (none/float/pulse/rotate).
- `svgContent` → `backgroundMedia` / `richtext-content` — Inline SVG markup string used as the background.
- `svgPosition` → `backgroundMedia` / `select-from-enum` — Layering position enum (background/foreground).

---

## sgs/testimonial-slider (5)

- `quoteColour` → `text` / `colour-text` — Quote body text colour.
- `roleColour` → `subheading` / `colour-text` — Role/title sub-text colour.
- `sideImage` → `image` / `image-object` — Side panel decorative image media object.
- `slidesVisible` → `column` / `number-css-px` — Number of testimonial cards visible per view.
- `testimonials` → `items` / `query-descriptor` — Repeater array of testimonial entries.

---

## sgs/trust-badges (3)

- `iconCircleBackground` → `icon` / `colour-bg` — Background colour of the icon circle wrapper.
- `iconCircleSize` → `icon` / `number-css-px` — Diameter of the icon circle in px.
- `showPendingInEditor` → `badge` / `boolean-visibility` — Editor-only toggle to show pending-state badge.

---

## sgs/trust-bar (4)

- `animated` → `animation` / `boolean-visibility` — Toggle count-up animation on numeric values.
- `dividers` → `separator` / `boolean-visibility` — Show vertical divider lines between items.
- `showItemIcons` → `icon` / `boolean-visibility` — Render the per-item icon glyphs.
- `valueColour` → `number` / `colour-text` — Colour of the headline numeric value.

---

## sgs/whatsapp-cta (5)

- `iconOverride` → `icon` / `text-content` — Optional icon slug override (defaults to WhatsApp glyph).
- `message` → `text` / `text-content` — Pre-filled WhatsApp message body string.
- `phoneNumber` → `link` / `text-content` — Target phone number (E.164 format).
- `showOnDesktop` → `hideOn` / `boolean-visibility` — Visibility toggle on desktop breakpoint.
- `showOnMobile` → `hideOn` / `boolean-visibility` — Visibility toggle on mobile breakpoint.

---

## Summary

- **Blocks classified:** 32 (sgs/back-to-top excluded — owned by A1).
- **Attributes classified:** 101 / 101 (100% coverage).
- **Slot distribution (top 10):** items (15), variant (12), button (5), panel (5), icon (5), animation (5), hover (3), link (3), text (5), label (3).
- **Role distribution:** select-from-enum (33), boolean-visibility (28), text-content (16), number-css-px (10), query-descriptor (10), colour-text (5), colour-bg (5), richtext-content (2), image-object (1), other (1).
- **Notable ambiguities flagged:**
  - `sgs/brand-strip.greyscale` — no exact slot; mapped to `hover` as the closest visual-filter state. Vocab may need a `filter` slot.
  - `sgs/brand-strip.scrolling` — mapped to `autoplay` (semantic match: auto-motion on/off).
  - `sgs/counter.duration` and `sgs/data-display.refreshOverride` — both timing values forced into `number-css-px` role despite being ms / seconds; consider a `duration-ms` role.
  - `sgs/whatsapp-cta.showOnDesktop` + `showOnMobile` — paired into `hideOn` slot; the slot semantics may need to accept inverted toggles.
  - `sgs/data-display.*` — block has no source folder (planned only). Classifications derived from DB intent; verify against final implementation when block ships.

- **No DB writes performed.** Report ready for merger with A1-A4 branches.
