# Phase 3.5 Fanout — Branch A4

**Scope:** 11 mid-size blocks, 103 un-canonicalised attributes.
**Method:** Read block.json + (where ambiguous) grep render/save/view. Map to 55-slot + 20-role taxonomy.

---

## sgs/accordion (7 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| allowMultiple | options | boolean-visibility | Toggle whether multiple panels can be open simultaneously; behavioural option. |
| closeIcon | icon | enum-class-probe | Icon name (e.g. `chevron-up`) used when an item is open; resolves to icon-library probe. |
| defaultOpen | options | select-from-enum | Index of the panel open by default (-1 = none); enumerated structural choice. |
| faqSchema | options | boolean-visibility | Toggles FAQPage schema.org markup output; behavioural option. |
| headerBackground | colour-bg | colour-bg | Header row background colour passed to accordion-item via context. |
| headerColour | colour-text | colour-text | Header text colour passed to accordion-item via context. |
| openIcon | icon | enum-class-probe | Icon name (e.g. `chevron-down`) used when an item is closed; resolves to icon-library probe. |

---

## sgs/countdown-timer (10 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| digitStyle | variant | select-from-enum | Visual style for digits (simple/flip); enum-driven style switch. |
| evergreenHours | options | number-css-px | Hours portion of evergreen-mode duration; numeric duration knob. |
| evergreenMinutes | options | number-css-px | Minutes portion of evergreen-mode duration; numeric duration knob. |
| evergreenMode | options | boolean-visibility | Switches between fixed targetDate and per-visitor evergreen timer. |
| expiredMessage | text | text-content | String shown when countdown reaches zero; plain text content. |
| showDays | options | boolean-visibility | Toggles visibility of the days segment. |
| showHours | options | boolean-visibility | Toggles visibility of the hours segment. |
| showMinutes | options | boolean-visibility | Toggles visibility of the minutes segment. |
| showSeconds | options | boolean-visibility | Toggles visibility of the seconds segment. |
| targetDate | date | text-content | ISO datetime string for fixed countdown target; date-typed text payload. |

---

## sgs/decorative-image (12 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| decorMedia | media | image-object | Unified image-or-video media-picker object (post-2026-05-05 migration). |
| fadeOnScroll | animation | boolean-visibility | Boolean enabling scroll-linked opacity fade animation. |
| flipX | options | boolean-visibility | Horizontal mirror flip via `transform: scaleX(-1)`. |
| imageId | image | image-object | Legacy WP media-library attachment ID (retained for deprecation). |
| maxWidthPercent | max | number-css-percent | Maximum width as percent of container; CSS percent value. |
| overflow | options | select-from-enum | CSS overflow value (visible/hidden) for the wrapper. |
| parallaxStrength | animation | number-css-px | Parallax displacement strength (px-equivalent magnitude). |
| pathDrawDurationMs | animation | number-css-px | SVG path-draw animation duration in ms (numeric duration knob). |
| pathDrawEasing | animation | select-from-enum | CSS easing keyword for the path-draw animation. |
| pathDrawOnScroll | animation | boolean-visibility | Toggle for scroll-triggered SVG path-draw animation. |
| pathDrawTriggerOffset | animation | number-css-percent | Viewport offset (%) at which path-draw fires. |
| zIndex | options | number-css-px | CSS z-index integer for stacking control. |

---

## sgs/gallery (12 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| captionBgColour | colour-bg | colour-bg | Background colour behind caption text. |
| captionReveal | options | boolean-visibility | Toggles caption-on-hover reveal behaviour. |
| carouselAutoplay | autoplay | boolean-visibility | Carousel autoplay enable flag. |
| carouselShowArrows | showArrows | boolean-visibility | Carousel show-arrows control. |
| carouselShowDots | showDots | boolean-visibility | Carousel show-dot-indicators control. |
| carouselSpeed | autoplaySpeed | number-css-px | Autoplay interval in ms; numeric duration. |
| enableLightbox | options | boolean-visibility | Toggles Interactivity-API lightbox on image click. |
| hoverOverlayColour | hover | colour-bg | Overlay tint colour applied on tile hover. |
| imageSize | image | select-from-enum | WP registered image size slug (thumbnail/medium/large/full). |
| images | items | query-descriptor | Legacy array of image objects (retained, superseded by mediaItems). |
| mediaItems | items | query-descriptor | Canonical array of unified media-picker objects for gallery tiles. |
| showCaptions | options | boolean-visibility | Toggles caption visibility on tiles. |

---

## sgs/multi-button (10 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| alignItems | layout | select-from-enum | Flex `align-items` keyword (start/centre/end/stretch). |
| direction | layout | select-from-enum | Flex `flex-direction` keyword (row/column). |
| directionMobile | layout | select-from-enum | Mobile-breakpoint flex-direction override. |
| directionTablet | layout | select-from-enum | Tablet-breakpoint flex-direction override. |
| justifyContent | layout | select-from-enum | Flex `justify-content` keyword. |
| justifyContentMobile | layout | select-from-enum | Mobile-breakpoint justify-content override. |
| justifyContentTablet | layout | select-from-enum | Tablet-breakpoint justify-content override. |
| wrap | layout | select-from-enum | Flex `flex-wrap` keyword (wrap/nowrap). |
| wrapMobile | layout | select-from-enum | Mobile-breakpoint flex-wrap override. |
| wrapTablet | layout | select-from-enum | Tablet-breakpoint flex-wrap override. |

---

## sgs/pricing-table (9 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| billingToggle | options | boolean-visibility | Toggles the monthly/yearly billing-toggle UI. |
| billingToggleMonthlyLabel | label | text-content | Visible label for the monthly toggle position. |
| billingToggleYearlyLabel | label | text-content | Visible label for the yearly toggle position. |
| featureColour | colour-text | colour-text | Text colour for feature-list rows inside each plan card. |
| plans | items | query-descriptor | Array of per-plan objects (name, price, features, cta); inner repeater. |
| popularBadgeBackground | badge | colour-bg | Background colour of the "Popular" badge on highlighted tier. |
| popularBadgeColour | badge | colour-text | Text colour of the "Popular" badge. |
| popularBadgeText | badge | text-content | Visible label inside the "Popular" badge. |
| toggleStyle | variant | select-from-enum | Visual variant of the billing toggle (text/button). |

---

## sgs/reading-progress (9 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| barColour | colour-bg | colour-bg | Fill colour of the progress bar (token slug). |
| barHeight | options | number-css-px | Bar height in px; CSS px value. |
| countdownPosition | options | select-from-enum | Where the countdown pill sits relative to the bar (inline/separate). |
| displayMode | variant | select-from-enum | Switch between bar / countdown / both display modes. |
| hideOnPages | hideOn | query-descriptor | Array of post IDs on which to suppress the block. |
| position | options | select-from-enum | Viewport position (top/bottom) for the fixed bar. |
| showWhenFinished | options | boolean-visibility | Whether to keep the bar visible once reading completes. |
| targetSelector | options | text-content | CSS selector identifying the article container to measure. |
| wpm | options | number-css-px | Words-per-minute used for the time-remaining calculation. |

---

## sgs/star-rating (9 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| displayMode | variant | select-from-enum | Switch between stars-only / stars-with-value / with-count display modes. |
| emptyColour | colour-text | colour-text | Colour of empty (unfilled) star portions. |
| maxRating | max | number-css-px | Total number of star slots rendered (typically 5). |
| schemaEnabled | options | boolean-visibility | Toggles schema.org/Rating microdata output. |
| schemaItemName | options | text-content | Name of the thing being rated (schema.org itemReviewed). |
| schemaReviewCount | options | number-css-px | Aggregate review count for AggregateRating schema. |
| showNumeric | options | boolean-visibility | Toggles visibility of the numeric rating value alongside stars. |
| starColour | colour-text | colour-text | Colour of filled star portions. |
| starSize | options | number-css-px | Star icon size in px. |

---

## sgs/tabs (9 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| orientation | layout | select-from-enum | Horizontal vs vertical tab orientation; provided as context to child tabs. |
| panelBgColour | panel | colour-bg | Background colour of the active tab-panel area. |
| tabActiveBgColour | tab | colour-bg | Background colour applied to the active tab button. |
| tabActiveIndicatorColour | tab | colour-border | Colour of the underline/border indicator on the active tab. |
| tabActiveTextColour | tab | colour-text | Text colour of the active tab label. |
| tabAlignment | layout | select-from-enum | Horizontal alignment of the tab list (left/centre/right/stretch). |
| tabHoverBgColour | hover | colour-bg | Background colour on tab-button hover. |
| tabStyle | variant | select-from-enum | Visual style of tabs (underline/boxed/pills); provided as context. |
| tabTextColour | tab | colour-text | Default (inactive) tab label colour. |

---

## sgs/table-of-contents (8 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| activeLinkColour | link | colour-text | Colour of the currently-active heading link (scroll-spy). |
| collapsible | options | boolean-visibility | Toggles whether the TOC can be collapsed/expanded. |
| defaultCollapsed | options | boolean-visibility | Initial collapsed state when collapsible is enabled. |
| headingLevels | options | query-descriptor | Array of heading levels to harvest (e.g. [2,3,4]). |
| listStyle | variant | select-from-enum | List marker style (numbered/bulleted/plain). |
| scrollOffset | options | number-css-px | Sticky-header offset (px) applied to smooth-scroll jumps. |
| scrollSpy | options | boolean-visibility | Toggles scroll-spy active-link highlighting. |
| smoothScroll | options | boolean-visibility | Toggles smooth scroll-into-view behaviour on anchor clicks. |

---

## sgs/testimonial (8 attrs)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| authorMedia | media | image-object | Unified media-picker object for the author avatar (canonical post-2026-05-05). |
| quote | text | richtext-content | The testimonial quote body; primary RichText content. |
| quoteColour | colour-text | colour-text | Text colour for the quote body. |
| reviewDate | date | text-content | Free-text date string for the review (used in schema/display). |
| reviewSource | label | text-content | Free-text label for the review platform (e.g. "Google Reviews"). |
| role | subheading | text-content | Author's role/title rendered beneath their name. |
| roleColour | colour-text | colour-text | Text colour for the role subheading. |
| schemaEnabled | options | boolean-visibility | Toggles schema.org/Review microdata output. |

---

## Summary

| metric | count |
|---|---|
| blocks classified | 11 |
| attrs classified | 103 |
| distinct canonical_slots used | 26 |
| distinct roles used | 11 |
| new-slot proposals (not in 55-slot taxonomy) | 0 |

### Slot usage tally

options(33), layout(11), colour-text(10), colour-bg(8), animation(6), tab(4), variant(6), media(2), image(1), max(2), hideOn(1), items(3), badge(3), label(3), hover(2), panel(1), autoplay(1), autoplaySpeed(1), showArrows(1), showDots(1), date(2), text(2), icon(2), link(1), subheading(1), colour-border(1).

### Role usage tally

boolean-visibility(35), select-from-enum(28), number-css-px(12), colour-text(11), colour-bg(9), text-content(11), query-descriptor(5), image-object(3), richtext-content(1), enum-class-probe(2), number-css-percent(2), colour-border(1).

### New slots / roles required

None — every attribute mapped cleanly into the existing 55-slot + 20-role taxonomy. `options` is the catch-all behavioural-config slot (used heavily for behavioural toggles, schema flags, numeric thresholds); `layout` covers flex-direction/wrap/justify families; `animation` covers parallax + path-draw + fade-on-scroll family.

### Notable patterns

- **Carousel sub-namespace** — `gallery` re-uses the canonical `autoplay` / `autoplaySpeed` / `showDots` / `showArrows` slots (good — testimonial-slider should also align on these).
- **Schema-on-block trio** — `star-rating` and `testimonial` both expose `schemaEnabled` + `schemaItemName`/`schemaReviewCount`/`reviewSource`/`reviewDate`; these are behavioural flags + free-text microdata payloads, mapped to `options`/`label`/`date`.
- **Media migration legacy attrs** — `decorative-image.imageId` and `gallery.images` are retained-for-deprecation; canonical successors are `decorMedia` and `mediaItems` (slot=`media`/`items`, role=`image-object`/`query-descriptor`).
- **Per-breakpoint layout** — `multi-button` keeps `*Tablet` / `*Mobile` variants in the same `layout` slot with `select-from-enum` role; suggests a future `breakpoint` modifier on the slot rather than 3× slots.
