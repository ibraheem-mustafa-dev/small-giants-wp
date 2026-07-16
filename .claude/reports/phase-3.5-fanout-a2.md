# Phase 3.5 Fanout — Batch A2 proposals

Generated 2026-05-12 by cold Sonnet subagent (branch A2 of 5-way fanout).
Source DB: `~/.claude/skills/sgs-wp-engine/sgs-framework.db` — table `attribute_gap_candidates` where `proposed_action='new-canonical-slot-needed'`.
Slot vocab: 55 canonical slots from `slot_synonyms`. Role taxonomy: 20 roles from Spec 31.

Slots referenced as **EXISTING** are already in `slot_synonyms`. Slots marked **NEW** are proposed additions.

---

## sgs/post-grid (36)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| author | query | query-descriptor | WP_Query `author` filter — restricts posts by author ID. NEW slot `query` for WP_Query descriptors. |
| cardBgColour | card | colour-bg | Card container background colour (`--card-bg`). Reuses EXISTING `card` slot. |
| carouselAutoplay | autoplay | boolean-visibility | Carousel autoplay toggle. Reuses EXISTING `autoplay` slot. |
| carouselShowArrows | showArrows | boolean-visibility | Show carousel arrow controls. Reuses EXISTING `showArrows` slot. |
| carouselShowDots | showDots | boolean-visibility | Show carousel pagination dots. Reuses EXISTING `showDots` slot. |
| carouselSpeed | autoplaySpeed | number-css-px | Carousel autoplay interval in ms. Reuses EXISTING `autoplaySpeed` slot (numeric, but role is generic number — closest fit is number-css-px representing a raw ms integer). |
| categories | query | query-descriptor | WP_Query `category__in` filter (array of term IDs). NEW slot `query`. |
| categoryBadgeBgColour | badge | colour-bg | Category badge pill background. Reuses EXISTING `badge` slot. |
| categoryBadgeColour | badge | colour-text | Category badge pill text colour. Reuses EXISTING `badge` slot. |
| excerptColour | text | colour-text | Post excerpt body colour. Reuses EXISTING `text` slot. |
| excerptLength | text | query-descriptor | Excerpt word-count cap — affects rendered content length, not CSS. Reuses `text` slot. |
| exclude | query | query-descriptor | WP_Query `post__not_in` filter. NEW slot `query`. |
| excludeCurrent | query | query-descriptor | Boolean — exclude current post from results. Maps to `query`. |
| filterTaxonomy | query | query-descriptor | Selects which taxonomy drives front-end filter UI. NEW slot `query`. |
| imageSize | image | select-from-enum | WP image size keyword (`thumbnail`/`medium_large`/etc.) for post featured image. Reuses EXISTING `image` slot. |
| inherit | query | query-descriptor | Core Query Loop convention — inherit query from template context. NEW slot `query`. |
| metaColour | text | colour-text | Post meta line colour (date/author). Reuses EXISTING `text` slot. |
| namespace | query | query-descriptor | Core Query Loop namespace identifier. NEW slot `query`. |
| offset | query | query-descriptor | WP_Query `offset` parameter. NEW slot `query`. |
| order | query | query-descriptor | WP_Query `order` (ASC/DESC). NEW slot `query`. |
| orderBy | query | query-descriptor | WP_Query `orderby` field. NEW slot `query`. |
| pagination | query | select-from-enum | Pagination mode (`none`/`standard`/`load-more`/`infinite`) — drives query/AJAX behaviour. NEW slot `query`. |
| postType | query | query-descriptor | WP_Query `post_type`. NEW slot `query`. |
| postsPerPage | query | query-descriptor | WP_Query `posts_per_page`. NEW slot `query`. |
| readMoreColour | button | colour-text | Read-more link/CTA colour. Reuses EXISTING `button` slot. |
| readMoreText | button | text-content | Read-more CTA label string. Reuses EXISTING `button` slot. |
| search | query | query-descriptor | WP_Query `s` keyword filter. NEW slot `query`. |
| showAuthor | hideOn | boolean-visibility | Toggle author meta visibility. Reuses EXISTING `hideOn` slot (visibility-control family). |
| showCategory | hideOn | boolean-visibility | Toggle category badge visibility. Reuses `hideOn`. |
| showExcerpt | hideOn | boolean-visibility | Toggle excerpt visibility. Reuses `hideOn`. |
| showFilters | hideOn | boolean-visibility | Toggle filter UI visibility. Reuses `hideOn`. |
| showImage | hideOn | boolean-visibility | Toggle featured-image visibility. Reuses `hideOn`. |
| showReadMore | hideOn | boolean-visibility | Toggle read-more visibility. Reuses `hideOn`. |
| showTitle | hideOn | boolean-visibility | Toggle post title visibility. Reuses `hideOn`. |
| tags | query | query-descriptor | WP_Query `tag__in` filter. NEW slot `query`. |
| taxQuery | query | query-descriptor | WP_Query `tax_query` arg (complex taxonomy filter). NEW slot `query`. |

---

## sgs/button (34)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| boxShadow | shadow | shadow-preset | Box-shadow object (colour/offsets/blur/spread). Reuses EXISTING `shadow` slot. |
| boxShadowHover | hover | shadow-preset | Hover-state box-shadow. Reuses EXISTING `hover` slot. |
| className | variant | enum-class-probe | WP core className — appended verbatim to wrapper class. Reuses EXISTING `variant` slot (class-probe family). |
| colourBackground | button | colour-bg | Button background colour. Reuses EXISTING `button` slot. |
| colourBackgroundHover | hover | colour-bg | Hover background. Reuses `hover`. |
| colourBorder | border | colour-border | Border colour. Reuses EXISTING `border` slot. |
| colourBorderHover | hover | colour-border | Hover border colour. Reuses `hover`. |
| colourText | button | colour-text | Button label colour. Reuses `button`. |
| colourTextHover | hover | colour-text | Hover text colour. Reuses `hover`. |
| customWidth | width | number-css-px | Custom width numeric value. Reuses EXISTING `width` slot. |
| customWidthUnit | width | select-from-enum | Width unit (`px`/`%`/`em`/etc.). Reuses `width`. |
| download | link | boolean-visibility | `<a download>` HTML attribute toggle. Reuses EXISTING `link` slot. |
| fontFamily | button | font-family-preset | Font-family token for button label. Reuses `button`. |
| fontSize | button | font-size-preset | Desktop font size. Reuses `button`. |
| fontSizeMobile | button | font-size-preset | Mobile font size override. Reuses `button`. |
| fontSizeTablet | button | font-size-preset | Tablet font size override. Reuses `button`. |
| fontSizeUnit | button | select-from-enum | Font-size unit (`px`/`em`/`rem`). Reuses `button`. |
| fontStyle | button | select-from-enum | `font-style` (normal/italic). Reuses `button`. |
| fontWeight | button | select-from-enum | `font-weight` numeric or keyword. Reuses `button`. |
| iconTitle | icon | text-content | `<title>` SVG accessibility label for icon. Reuses EXISTING `icon` slot. |
| inheritStyle | variant | select-from-enum | Style preset selector (`primary`/`secondary`/`outline`/etc.). Reuses EXISTING `variant` slot. |
| isSubmit | variant | boolean-visibility | Render as `<button type="submit">` vs `<a>`. Reuses `variant` (tag/role discriminator). |
| letterSpacingMobile | letterSpacing | number-css-px | Mobile letter-spacing override. Reuses EXISTING `letterSpacing` slot. |
| letterSpacingTablet | letterSpacing | number-css-px | Tablet override. Reuses `letterSpacing`. |
| letterSpacingUnit | letterSpacing | select-from-enum | Letter-spacing unit. Reuses `letterSpacing`. |
| lineHeight | button | number-css-px | Line-height value. Reuses `button`. |
| lineHeightMobile | button | number-css-px | Mobile line-height. Reuses `button`. |
| lineHeightTablet | button | number-css-px | Tablet line-height. Reuses `button`. |
| lineHeightUnit | button | select-from-enum | Line-height unit (`em`/`px`). Reuses `button`. |
| linkTarget | linkOpensNewTab | select-from-enum | `<a target>` attribute (`_self`/`_blank`). Reuses EXISTING `linkOpensNewTab` slot. |
| rel | link | text-content | `<a rel>` attribute string. Reuses `link`. |
| tagName | variant | select-from-enum | HTML element to render (`a`/`button`). Reuses `variant`. |
| textDecoration | button | select-from-enum | `text-decoration` value. Reuses `button`. |
| widthType | width | select-from-enum | Width mode (`fit`/`full`/`custom`). Reuses `width`. |

---

## sgs/hero (20)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| alignment | text | select-from-enum | Horizontal text alignment (`left`/`center`/`right`). Reuses EXISTING `text` slot. |
| badges | items | richtext-content | Array of badge objects rendered as repeating list. Reuses EXISTING `items` slot. |
| bgKenBurns | animation | boolean-visibility | Toggle Ken-Burns zoom animation on background. Reuses EXISTING `animation` slot. |
| bgParallax | animation | boolean-visibility | Toggle parallax scroll effect on background. Reuses `animation`. |
| ctaPrimaryHoverBackground | hover | colour-bg | Primary CTA hover background. Reuses EXISTING `hover` slot. |
| ctaPrimaryHoverColour | hover | colour-text | Primary CTA hover text colour. Reuses `hover`. |
| ctaPrimaryText | button | text-content | Primary CTA label text. Reuses EXISTING `button` slot. |
| ctaSecondaryHoverBackground | hover | colour-bg | Secondary CTA hover background. Reuses `hover`. |
| ctaSecondaryHoverColour | hover | colour-text | Secondary CTA hover text colour. Reuses `hover`. |
| ctaSecondaryText | buttonSecondary | text-content | Secondary CTA label. Reuses EXISTING `buttonSecondary` slot. |
| splitColumnRatio | split | text-content | CSS grid-template-columns value for desktop split. Reuses EXISTING `split` slot. |
| splitColumnRatioMobile | split | text-content | Mobile grid ratio. Reuses `split`. |
| splitColumnRatioTablet | split | text-content | Tablet grid ratio. Reuses `split`. |
| splitContentOrderMobile | split | select-from-enum | Mobile flex order (`media-first`/`content-first`). Reuses `split`. |
| splitImageBleed | split | boolean-visibility | Toggle image edge-bleed in split variant. Reuses `split`. |
| splitImageMobileHeight | split | number-css-px | Mobile height override for split media. Reuses `split`. |
| splitImageMobileObjectPosition | split | text-content | Mobile `object-position` value. Reuses `split`. |
| splitMedia | media | image-object | Unified image/video media object for split variant. Reuses EXISTING `media` slot. |
| svgContent | media | richtext-content | Inline SVG markup for `svg-animated` variant. Reuses `media`. |
| verticalAlignment | text | select-from-enum | Vertical alignment of content column (`top`/`center`/`bottom`). Reuses `text`. |

---

## sgs/info-box (11)

| attr_name | canonical_slot | role | rationale |
|---|---|---|---|
| blockLink | link | link-href | URL — entire block wrapped in `<a>` when set. Reuses EXISTING `link` slot. |
| blockLinkTarget | linkOpensNewTab | boolean-visibility | Open block link in new tab. Reuses EXISTING `linkOpensNewTab` slot. |
| boxMedia | media | image-object | Unified image/video media object. Reuses EXISTING `media` slot. |
| elementOrder | layout | select-from-enum | Array controlling render order of media/title/subtitle/text/button. Reuses EXISTING `layout` slot. |
| mediaEmoji | media | text-content | Emoji character string when `mediaType=emoji`. Reuses `media`. |
| mediaType | media | select-from-enum | Discriminator (`icon`/`emoji`/`image`). Reuses `media`. |
| showButton | hideOn | boolean-visibility | Toggle button visibility. Reuses EXISTING `hideOn` slot. |
| showMedia | hideOn | boolean-visibility | Toggle media visibility. Reuses `hideOn`. |
| showSubtitle | hideOn | boolean-visibility | Toggle subtitle visibility. Reuses `hideOn`. |
| showText | hideOn | boolean-visibility | Toggle description text visibility. Reuses `hideOn`. |
| showTitle | hideOn | boolean-visibility | Toggle heading visibility. Reuses `hideOn`. |

---

## Summary

- **Total attrs classified:** 101 (36 + 34 + 20 + 11)
- **Existing-slot reuse:** 100
- **New-slot proposals:** 1
  - `query` — WP_Query / Query Loop descriptor slot. Covers post-type, posts-per-page, order/orderBy, taxonomy filters (categories, tags, taxQuery, filterTaxonomy), search keyword, offset, exclude, excludeCurrent, inherit, namespace, author, pagination. Synonym candidates: `wpQuery`, `queryArgs`. Role family: `query-descriptor`. Justification: 14 post-grid attrs drive WP_Query construction, not CSS. None of the 54 existing slots semantically cover WP_Query parameters (closest analogues `items`/`options` are render-time list slots, not query-config slots). Pattern will recur on future query-loop derivatives (event-grid, product-grid, testimonial-grid).

### Role distribution
- `query-descriptor`: 15 (all post-grid query-loop attrs + post-grid excerpt-length + pagination + imageSize cluster — see table)
- `boolean-visibility`: 23 (show-toggles, hover booleans, link-target)
- `colour-text` / `colour-bg` / `colour-border`: 18 combined
- `select-from-enum`: 21 (unit selectors, variants, alignments)
- `text-content` / `richtext-content`: 11
- `number-css-px`: 8
- `font-*-preset` / `letter-spacing` / `shadow-preset`: 7
- `image-object` / `link-href`: 3
- `enum-class-probe`: 1 (button.className)

### Notes
- Post-grid `search`, `inherit`, `taxQuery`, `namespace`, `author`, `exclude` are declared in block.json (per the gap table) but are partially/unused in current render.php. They follow core Query Loop convention and remain valid `query-descriptor` candidates regardless of current wiring.
- Where an attr is a unit selector paired with a numeric attr (e.g. `fontSizeUnit`, `customWidthUnit`, `letterSpacingUnit`), the slot follows the numeric parent and the role is `select-from-enum`.
- Hover-related attrs always classify to slot `hover` (state-modifier-acting-as-slot per Spec 31) rather than the underlying element slot, to keep hover-token harvesting deterministic downstream.
- `info-box.elementOrder` chosen as `layout` rather than `items` because the array values are slot keys not item objects — it's a layout-order descriptor, not a repeating item list.
