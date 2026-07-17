# Phase 3.5 Coverage — Method C (render.php / save.js mining)

**Branch:** B2 (render-code CSS-property authority)
**Date:** 2026-05-12
**Scope:** Authoritative mapping of `attr_name` → CSS property / HTML attribute / no-css as expressed by the actual render code for the top blocks in `attribute_gap_candidates` (proposed_action = `new-canonical-slot-needed`).
**Method:** Grep + targeted reads of `plugins/sgs-blocks/src/blocks/<slug>/render.php` and `save.js`. For each gap attr I traced `$attributes['<name>']` to the inline-style / scoped-CSS / CSS-variable / HTML-attribute / class-probe context it lands in.

**Role taxonomy (Spec 31):** `colour-text`, `colour-bg`, `colour-border`, `colour-gradient`, `number-css-px`, `number-css-percent`, `spacing-token`, `shadow-preset`, `font-family-preset`, `font-size-preset`, `border-radius-token`, `transition-preset`, `image-object`, `link-href`, `text-content`, `richtext-content`, `enum-class-probe`, `boolean-visibility`, `select-from-enum`, `query-descriptor`.

> A `no-css` value means the attr controls JS behaviour, schema output, query selection, or HTML semantics rather than a CSS property. These attrs do not need a canonical CSS slot; they need a behaviour-flag / data-attr / query-descriptor mapping.

---

## Per-block attribute → CSS-property mapping

### sgs/button (97 gaps) — render.php

| attr_name | Lands in | Recommended role | Source line |
|---|---|---|---|
| ariaLabel | `aria-label` HTML attribute | no-css (a11y) | 29 |
| borderRadiusTL / TR / BR / BL | `border-radius: TL TR BR BL{unit}` (scoped CSS) | border-radius-token | 130-133, 343 |
| borderRadiusTabletTL/TR/BR/BL | same, in `@media(max-width:1024px)` | border-radius-token | 135-138, 343 |
| borderRadiusMobileTL/TR/BR/BL | same, in `@media(max-width:767px)` | border-radius-token | 140-143, 367 |
| borderRadiusUnit | unit suffix on all border-radius values | select-from-enum (px/%/em/rem) | 144 |
| borderStyle | `border-style:<value>` | select-from-enum | 123 |
| borderWidthTop / Right / Bottom / Left | `border-width: T R B L{unit}` | number-css-px | 124-127 |
| borderWidthUnit | unit suffix on border-width | select-from-enum (px/em/rem) | 128 |
| boxShadow (object: h, v, blur, spread, colour, inset) | `box-shadow: …` composite | shadow-preset | 155, 243 |
| boxShadowHover | `box-shadow:` on `:hover` selector | shadow-preset | 156, 310 |
| className | wrapper class list | enum-class-probe | n/a (WP core) |
| colourBackground | `background-color:` (inline) | colour-bg | 117, 185 |
| colourBackgroundHover | `background-color:` on `:hover` | colour-bg | 118, 296 |
| colourBorder | `border-color:` (inline) | colour-border | 119, 188 |
| colourBorderHover | `border-color:` on `:hover` | colour-border | 120, 299 |
| colourText | `color:` (inline) | colour-text | 115, 182 |
| colourTextHover | `color:` on `:hover` | colour-text | 116, 293 |
| customWidth | wrapper `width:<n><unit>` | number-css-px | 44 |
| customWidthUnit | unit on customWidth | select-from-enum (px/%) | 45 |
| download | `download` HTML attribute on `<a>` | no-css (HTML attr) | 26 |
| fontFamily | `font-family:var(--wp--preset--font-family--<slug>)` | font-family-preset | n/a (cf. hero:646) |
| fontSize | `font-size:<n><unit>` | font-size-preset | 101 |
| fontSizeTablet / Mobile | same, in `@media` | font-size-preset | 102-103 |
| fontSizeUnit | unit on font-size | select-from-enum (px/em/rem) | 104 |
| fontStyle | `font-style:` | select-from-enum (normal/italic) | 98 |
| fontWeight | `font-weight:` | select-from-enum | 97 |
| hoverScale | `transform:scale(<v>)` on `:hover` | transition-preset (or `number-css-px` modifier) | 159, 284 |
| iconPosition | `flex-direction` / `order` class probe (`--icon-before|after`) | enum-class-probe | 33 |
| iconSize / Tablet / Mobile | `--sgs-btn-icon-size:<n>px` CSS var | number-css-px | 35-37, 409, 414 |
| iconTitle | `<title>` element inside SVG | no-css (a11y) | 40 |
| iconValue | SVG path / icon-name lookup | no-css (HTML content) | n/a |
| inheritStyle | wrapper class (`sgs-button--primary` etc.) | enum-class-probe | 21 |
| isSubmit | `type="submit"` on `<button>` | no-css (HTML attr) | 28 |
| letterSpacing | `letter-spacing:<n><unit>` | number-css-px | 109 |
| letterSpacingTablet / Mobile | same, in `@media` | number-css-px | 110-111 |
| letterSpacingUnit | unit on letter-spacing | select-from-enum | 112 |
| lineHeight | `line-height:<n><unit>` | number-css-px (or number-css-percent if em) | 105 |
| lineHeightTablet / Mobile | same, in `@media` | number-css-px | 106-107 |
| lineHeightUnit | unit on line-height | select-from-enum | 108 |
| linkTarget | `target="…"` HTML attribute | no-css (HTML attr) | 24 |
| marginTop / Right / Bottom / Left | wrapper `margin: T R B L{unit}` | spacing-token | 81-84, 453 |
| marginTopTablet/RightTablet/BottomTablet/LeftTablet | same, `@media(max-width:1024px)` | spacing-token | 86-89, 395 |
| marginTopMobile/RightMobile/BottomMobile/LeftMobile | same, `@media(max-width:767px)` | spacing-token | 91-94, 404 |
| marginUnit | unit on margin (px/%/em/rem) | select-from-enum | 52 |
| minHeight | `min-height:<n><unit>` | number-css-px | 46, 263 |
| minHeightTablet / Mobile | same, in `@media` | number-css-px | 47-48, 419, 424 |
| minHeightUnit / TabletUnit / MobileUnit | unit on min-height (px/vh) | select-from-enum | 59, 61, 63 |
| paddingTop / Right / Bottom / Left | `padding: T R B L{unit}` | spacing-token | 66-69, 253 |
| paddingTopTablet / etc | same, `@media(max-width:1024px)` | spacing-token | 71-74, 377 |
| paddingTopMobile / etc | same, `@media(max-width:767px)` | spacing-token | 76-79, 386 |
| paddingUnit | unit on padding | select-from-enum | 51 |
| rel | `rel="…"` HTML attribute | no-css (HTML attr) | 25 |
| tagName | element tag (`a` vs `button`) | no-css (HTML semantics) | 27 |
| textDecoration | `text-decoration:` | select-from-enum | 100 |
| textTransform | `text-transform:` (inline) | select-from-enum | 99, 220 |
| transitionDuration | `transition:all <n>ms` (scoped) | transition-preset | 160, 279 |
| transitionEasing | timing-function in transition shorthand | transition-preset | 161, 279 |
| url | `href="…"` HTML attribute | link-href | 23 |
| widthType | wrapper class (`sgs-button--fit|full|custom`) | enum-class-probe | 43 |

**Button block total mapped: 60+ attrs.** All gap attrs in DB list are covered above.

---

### sgs/mobile-nav (65 gaps) — render.php (CSS-variable architecture)

The mobile-nav block emits CSS custom properties on a scoped `#sgs-mobile-nav` selector, then a separate stylesheet consumes them. Mapping each attr to the CSS var it populates, and through that to the CSS property:

| attr_name | CSS var | CSS property | Recommended role | Source line |
|---|---|---|---|---|
| accentColour | `--sgs-mn-accent` | colour (multi-use accent) | colour-text | 102 |
| animationDuration | `--sgs-mn-duration` | transition / animation duration | transition-preset | 125 |
| animationEasing | (selector class) | timing-function via class | enum-class-probe | 80 |
| animationPreset | wrapper class (`sgs-mn--spring|slide|fade`) | enum-class-probe | 40 |
| ariaLabel | `aria-label` HTML attribute | no-css (a11y) | n/a |
| backdropBlur | toggle class `has-backdrop-blur` | enum-class-probe (boolean) | 42 |
| backdropBlurAmount | `--sgs-mn-backdrop-blur:<n>px` | `backdrop-filter: blur()` | number-css-px | 210 |
| backdropColour | (resolved into rgba on backdrop selector) | colour-bg | n/a (variant resolver) |
| backdropOpacity | `--sgs-mn-backdrop-opacity:<n.n>` | opacity / rgba alpha | number-css-percent | 133 |
| breakpoint | inline `@media` breakpoint value | number-css-px | 33 |
| closeButtonBg | colour var on close-button selector | colour-bg | n/a (style_parts) |
| closeButtonColour | colour var on close-button | colour-text | n/a |
| closeButtonSize / Tablet / Mobile | `--sgs-mn-close-size:<n>px` | width + height on close btn | number-css-px | 164 |
| closeButtonStyle | wrapper class | enum-class-probe | n/a |
| contactDisplayMode | class probe | enum-class-probe | n/a |
| ctaBg | colour var | colour-bg | n/a |
| ctaIcon | icon-name lookup | no-css (HTML content) | n/a |
| ctaText | text content (button label) | text-content | n/a |
| desktopHamburger | toggle class | boolean-visibility | 32 |
| drawerBg | colour var | colour-bg | n/a |
| drawerGradient | `--sgs-mn-gradient:<gradient>` | `background-image` (gradient) | colour-gradient | 204 |
| drawerMaxWidth | `--sgs-mn-max-width:<n>px` | `max-width` | number-css-px | 120 |
| drawerPosition | wrapper class (`--top|right|left|bottom`) | enum-class-probe | 226 |
| drawerText | colour var | colour-text | n/a |
| drawerWidth / Tablet / Mobile | `--sgs-mn-width:<n>%` | `width` | number-css-percent | 117 |
| enableSwipe | data-attribute for JS | no-css (JS behaviour) | 31 |
| exitDuration | `--sgs-mn-exit-duration:<n>ms` | transition-duration on close | transition-preset | 128 |
| focusColour | colour var on `:focus-visible` | colour-border (or outline-color) | n/a |
| linkActiveColour | colour var | colour-text | n/a |
| linkHoverColour | colour var | colour-text | n/a |
| logoMaxWidth / Tablet / Mobile | `--sgs-mn-logo-width:<n>px` | `max-width` on logo `<img>` | number-css-px | 158 |
| secondaryCtaBg | colour var | colour-bg | n/a |
| secondaryCtaIcon | icon lookup | no-css (HTML content) | n/a |
| secondaryCtaText | text content | text-content | n/a |
| showAccountTray / showContactIcons / showContactShortcuts / showCta / showDividers / showLogo / showSearch / showSecondaryCta / showSocials / showTagline / showWhatsApp | toggle classes / conditional render | boolean-visibility | 221, etc |
| socialIconSize / Tablet / Mobile | `--sgs-mn-social-size:<n>px` | `width` + `height` on social icons | number-css-px | 152 |
| socialStyle | wrapper class | enum-class-probe | n/a |
| staggerDelay | `--sgs-mn-stagger:<n>ms` | `transition-delay` on each list item | transition-preset | 112 |
| sublinkColour | colour var | colour-text | n/a |
| sublinkFontSize / Mobile | `--sgs-mn-sublink-size:<token>` | `font-size` | font-size-preset | 144, 277 |
| sublinkHoverColour | colour var | colour-text | n/a |
| submenuIndent / Tablet / Mobile | `--sgs-mn-indent:<n>px` | `padding-left` on sub-menu items | spacing-token | 147 |
| taglineText | text content | text-content | n/a |
| variant | wrapper class (`sgs-mn--overlay|push|slide`) | enum-class-probe | 27 |

**Mobile-nav total mapped: 60+ attrs.**

---

### sgs/post-grid (56 gaps) — render.php + edit.js

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| aspectRatio | `aspect-ratio:<v>` on card image wrapper | select-from-enum (`16/10`, `1/1`, …) | render.php:115 |
| author | query arg | query-descriptor | n/a |
| cardBgColour | `background-color:` on card | colour-bg | render.php:60 |
| cardStyle | wrapper class (`sgs-card--bordered|elevated`) | enum-class-probe | render.php:37 |
| carouselAutoplay / Speed / ShowArrows / ShowDots | JS data-attrs for Swiper | no-css (JS behaviour) | render.php:53-56 |
| categories | query tax arg | query-descriptor | render.php:33 |
| categoryBadgeBgColour | `background-color:` on badge | colour-bg | render.php:120 |
| categoryBadgeColour | `color:` on badge | colour-text | render.php:119 |
| columns / Tablet / Mobile | CSS class `--cols-<n>` + grid-template-columns | enum-class-probe (or number-css-px depending on resolver) | render.php:38-40 |
| excerptColour | `color:` on excerpt `<p>` | colour-text | render.php:117, edit.js:158 |
| excerptLength | text content length cap | text-content (length cap) | render.php:113 |
| exclude | query arg (exclude IDs) | query-descriptor | n/a |
| excludeCurrent | query arg (boolean) | query-descriptor | render.php:31 |
| filterTaxonomy | filter UI taxonomy slug | query-descriptor | render.php:45 |
| gap | `--sgs-gap:<n>px` → `gap` on grid | spacing-token | render.php:41, 132 |
| hoverBackgroundColour | `background-color:` on `.sgs-card:hover` | colour-bg | render.php (hover css), edit.js |
| hoverBorderColour | `border-color:` on `:hover` | colour-border | render.php (hover css) |
| hoverImageZoom | toggle class `--image-zoom` | boolean-visibility (class probe) | render.php:49 |
| hoverScale | `transform:scale(<v>)` on `:hover` | transition-preset modifier | render.php:47 |
| hoverShadow | `box-shadow:` on `:hover` (preset) | shadow-preset | render.php:48 |
| hoverTextColour | `color:` on `:hover` | colour-text | render.php (hover css) |
| imageSize | WP image-size slug | select-from-enum | render.php:114 |
| inherit | query arg | query-descriptor | n/a |
| layout | wrapper class (`grid|list|masonry|carousel`) | enum-class-probe | render.php:36 |
| metaColour | `color:` on meta line | colour-text | render.php:118 |
| namespace | block namespace identifier | no-css (block metadata) | n/a |
| offset | query arg | query-descriptor | render.php:30 |
| order | query arg (ASC/DESC) | query-descriptor | render.php:29 |
| orderBy | query arg (date/title/etc) | query-descriptor | render.php:28 |
| pagination | wrapper class / data-attr | enum-class-probe | render.php:43 |
| postType | query arg | query-descriptor | render.php:26 |
| postsPerPage | query arg | query-descriptor | render.php:27 |
| readMoreColour | `color:` on read-more link | colour-text | render.php:121, edit.js:160 |
| readMoreText | link text content | text-content | render.php:112 |
| search | query arg | query-descriptor | n/a |
| sgsAnimation | data-attr `data-sgs-animation` + class probe | enum-class-probe | n/a |
| sgsAnimationDuration | `--sgs-animation-duration:<n>ms` | transition-preset | n/a |
| sgsAnimationEasing | `--sgs-animation-easing:<f>` | transition-preset | n/a |
| showAuthor / Category / Date / Excerpt / Filters / Image / ReadMore / Title | conditional template render | boolean-visibility | render.php:105-111 |
| staggerDelay | `--sgs-stagger:<n>ms` on each item | transition-preset | n/a |
| tags | query tax arg | query-descriptor | render.php:34 |
| taxQuery | composite query arg | query-descriptor | n/a |
| transitionDuration / Easing | `transition:` shorthand for card hover | transition-preset | render.php:50-51 |

**Post-grid total mapped: 55+ attrs.**

---

### sgs/hero (44 gaps) — render.php

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| alignment | wrapper class `sgs-hero--align-<v>` | enum-class-probe | 19, 506 |
| backgroundColor | `background-color:` (native WP supports) | colour-bg | (WP supports) |
| badges | iterated → HTML output | richtext-content (array of {text,url,bg}) | 55, 617 |
| bgKenBurns | toggle class `has-ken-burns` on bg | boolean-visibility | 94 |
| bgParallax | toggle class `has-parallax` on bg | boolean-visibility | 93 |
| ctaPrimaryHoverBackground | `--sgs-cta-pri-hover-bg` → `background-color:` on `:hover` | colour-bg | 270 |
| ctaPrimaryHoverColour | `--sgs-cta-pri-hover-colour` → `color:` on `:hover` | colour-text | 273 |
| ctaPrimaryText | button label content | text-content | n/a |
| ctaSecondaryHoverBackground | `--sgs-cta-sec-hover-bg` → `:hover` bg | colour-bg | 276 |
| ctaSecondaryHoverColour | `--sgs-cta-sec-hover-colour` → `:hover` color | colour-text | 279 |
| ctaSecondaryText | button label content | text-content | n/a |
| hoverBackgroundColour | `--sgs-hover-bg` → wrapper `:hover` bg | colour-bg | 258 |
| hoverBorderColour | `--sgs-hover-border` → wrapper `:hover` border | colour-border | 264 |
| hoverTextColour | `--sgs-hover-text` → wrapper `:hover` color | colour-text | 261 |
| letterSpacing | `letter-spacing:` on headline | number-css-px | 658 (label) |
| minHeight / Tablet / Mobile | `min-height:` on hero wrapper | number-css-px | 251, 303, 306 |
| overlayColour | overlay `background-color:` | colour-bg | 21 |
| overlayOpacity | `opacity:` on overlay | number-css-percent | 22 |
| splitColumnRatio / Tablet / Mobile | `grid-template-columns:` | select-from-enum (1fr 1fr, 2fr 1fr, …) | 287, 358, 373 |
| splitContentOrderMobile | `order:` on content/media | select-from-enum | 385, 388 |
| splitGap / Mobile / Tablet | `gap:` on grid | spacing-token | 289, 377, 381 |
| splitGapUnit | unit on splitGap | select-from-enum | 377 |
| splitImage | media object | image-object | n/a |
| splitImageBleed | toggle class | boolean-visibility | n/a |
| splitImageMobile | media object (mobile-specific) | image-object | n/a |
| splitImageMobileHeight | `height:` on mobile split image | number-css-px | 349 |
| splitImageMobileObjectPosition | `object-position:` on mobile split image | select-from-enum | 896 |
| splitMedia | media object (unified) | image-object | n/a |
| svgContent | inline SVG markup | richtext-content (sanitised SVG) | 51 |
| textAlignDesktop / Tablet / Mobile | `text-align:` on content | select-from-enum | 714 |
| textColor | `color:` on hero (native WP supports) | colour-text | (WP supports) |
| textTransform | `text-transform:` on headline | select-from-enum | 663 |
| transitionDuration | `transition-duration` on wrapper hover | transition-preset | n/a |
| transitionEasing | timing-function on wrapper hover | transition-preset | n/a |
| variant | wrapper class `sgs-hero--<variant>` | enum-class-probe | 16, 505 |
| verticalAlignment | `justify-content:` on flex content | select-from-enum (top/center/bottom) | 238, 687 |

**Hero total mapped: 36 attrs (all in DB list).**

---

### sgs/media + sgs/decorative-image (41 + 28 gaps) — render.php (decorative-image)

`sgs/media` doesn't exist as a folder — these attrs are the decorative-image block (or a future merge). Mapping from decorative-image/render.php:

| attr_name | CSS property | Recommended role | Source line |
|---|---|---|---|
| decorMedia | media object {id, url, alt} | image-object | 28 |
| fadeOnScroll | data-attr for IntersectionObserver JS | no-css (JS behaviour) | 54 |
| flipX | `transform: scaleX(-1)` (composed) | enum-class-probe (boolean) | 52, 103 |
| hideOnMobile | `display:none` in `@media(max-width:767px)` | boolean-visibility | 75 |
| hideOnTablet | `display:none` in `@media(max-width:1023px)` | boolean-visibility | 69 |
| imageAlt | `alt="…"` HTML attr | no-css (a11y) | 22 |
| imageId | WP media attachment ID | image-object | 20 |
| maxWidthPercent | `max-width:<n>%` | number-css-percent | 88 |
| mediaType | enum (image/svg/video) controls render branch | select-from-enum | n/a |
| opacity | `opacity:<n/100>` | number-css-percent | 89 |
| overflow | `overflow:` on wrapper | select-from-enum (visible/hidden/clip) | 55 |
| parallaxStrength | data-attr for JS parallax | no-css (JS behaviour) | 53 |
| pathDrawDurationMs | `--sgs-path-draw-duration:<n>ms` → animation/transition | transition-preset | 57 |
| pathDrawEasing | timing-function for path-draw | transition-preset | 60 |
| pathDrawOnScroll | toggle data-attr for IntersectionObserver | no-css (JS behaviour) | 56 |
| pathDrawTriggerOffset | data-attr `data-trigger-offset` | no-css (JS behaviour) | 58 |
| playbackMode | video element attr (autoplay/manual) | no-css (HTML attr) | n/a |
| positionX / Tablet / Mobile | `left:<n>%` | number-css-percent | 85 |
| positionY / Tablet / Mobile | `top:<n>%` | number-css-percent | 86 |
| rotation / Tablet / Mobile | `rotate(<deg>deg)` inside `transform:` | number-css-px (deg) | 103 |
| videoAlt | aria-label / alt for video poster | no-css (a11y) | n/a |
| videoAttachmentId | WP attachment ID | image-object | n/a |
| videoAutoplay | `autoplay` HTML attr | no-css (HTML attr) | n/a |
| videoControls | `controls` HTML attr | no-css (HTML attr) | n/a |
| videoLazyLoad | `loading="lazy"` HTML attr | no-css (HTML attr) | n/a |
| videoLoop | `loop` HTML attr | no-css (HTML attr) | n/a |
| videoMuted | `muted` HTML attr | no-css (HTML attr) | n/a |
| videoPosterAttachmentId | `poster="…"` on `<video>` | image-object | n/a |
| videoPosterUrl | `poster="…"` on `<video>` | image-object | n/a |
| videoSchema | `<script type="application/ld+json">` output | no-css (SEO/schema) | n/a |
| videoSource | `<source src=…>` URL | link-href | n/a |
| width / Tablet / Mobile | `width:<n>px` | number-css-px | 87 |
| zIndex | `z-index:<n>` | number-css-px (integer) | 90 |

**decorative-image / media total mapped: 30+ attrs (covers both 41+28 gap lists, which overlap).**

---

### sgs/info-box (38 gaps) — render.php

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| blockLink | wrapper `<a href>` | link-href | 255 |
| blockLinkTarget | `target="…"` | no-css (HTML attr) | 256 |
| boxMedia | media object {type, image, video, emoji, icon} | image-object | n/a |
| cardStyle | wrapper class (`elevated|bordered|flat`) | enum-class-probe | 248 |
| elementOrder | CSS `order:` per child via class probe | enum-class-probe (or select-from-enum) | 225 |
| hoverBackgroundColour | `background-color:` on `:hover` | colour-bg | 250 |
| hoverBorderColour | `border-color:` on `:hover` | colour-border | 252 |
| hoverEffect | wrapper class (`lift|zoom|reveal|slide`) | enum-class-probe | 249 |
| hoverGrayscale | `filter:grayscale(0)` on `:hover` (transition from 1) | boolean-visibility | 257 |
| hoverImageZoom | toggle class `--image-zoom` | boolean-visibility | n/a |
| hoverScale | `transform:scale(<v>)` on `:hover` | transition-preset modifier | 253 |
| hoverShadow | `box-shadow:` preset on `:hover` | shadow-preset | 254 |
| hoverTextColour | `color:` on `:hover` | colour-text | 251 |
| iconPosition | wrapper class (`top|left|right|inline`) | enum-class-probe | 239 |
| iconSize / Tablet / Mobile | `font-size:` or `width/height` on icon | number-css-px | 242-243 |
| iconValue | icon-name lookup → SVG | no-css (HTML content) | n/a |
| letterSpacing | `letter-spacing:` on headline | number-css-px | n/a |
| link | wrapper `<a href>` | link-href | 240 |
| linkOpensNewTab | `target="_blank"` | no-css (HTML attr) | 241 |
| mediaEmoji | text content (emoji) | text-content | n/a |
| mediaType | enum branch select (icon/image/video/emoji) | select-from-enum | n/a |
| sgsAnimation | data-attr / class probe for entry animation | enum-class-probe | n/a |
| sgsAnimationDuration | `--sgs-animation-duration:<n>ms` | transition-preset | n/a |
| sgsAnimationEasing | `--sgs-animation-easing` | transition-preset | n/a |
| showButton / showMedia / showSubtitle / showText / showTitle | conditional render | boolean-visibility | 215-219 |
| staggerDelay | `--sgs-stagger:<n>ms` | transition-preset | n/a |
| textAlignDesktop / Tablet / Mobile | `text-align:` | select-from-enum | n/a |
| textTransform | `text-transform:` | select-from-enum | n/a |
| transitionDuration | `transition:` duration | transition-preset | n/a |
| transitionEasing | timing-function | transition-preset | n/a |

**Info-box total mapped: 30+ attrs.**

---

### sgs/google-reviews (30 gaps) — render.php

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| autoplay | data-attr for JS carousel | no-css (JS behaviour) | 36 |
| autoplaySpeed | data-attr ms for JS | no-css (JS behaviour) | 37 |
| backgroundColour | (migrated to native `backgroundColor` 2026-04-30) | colour-bg | (WP supports) |
| cardStyle | wrapper class | enum-class-probe | 34 |
| cardVariant | wrapper class | enum-class-probe | 17 |
| columns / Tablet / Mobile | class probe `sgs-google-reviews--cols-<n>` | enum-class-probe (or grid-template-columns) | 158-160 |
| excludeKeywords | filter list (string) | query-descriptor | 25 |
| maxReviews | API query limit | query-descriptor | 22 |
| minRating | filter threshold | query-descriptor | 23 |
| placeId | Google Place API ID | query-descriptor | 18 |
| reviewRequestUrl | CTA `href` | link-href | 32 |
| sgsAnimation / Duration / Easing | as above (animation system) | enum-class-probe / transition-preset | n/a |
| showAggregate / Arrows / Avatar / Breakdown / Date / Dots / GoogleLogo | conditional render | boolean-visibility | 27-31, 38-39 |
| sortBy | client-side sort order | select-from-enum | 26 |
| staggerDelay | as above | transition-preset | n/a |
| starColour | `color:` on SVG star fill | colour-text | 35 |
| textColour | (migrated to native) | colour-text | (WP supports) |
| textOnly | conditional render mode | boolean-visibility | 24 |
| theme | wrapper class (`light|dark`) | enum-class-probe | 33 |
| variant | wrapper class (`grid|carousel|list`) | enum-class-probe | 16 |

**Google-reviews total mapped: 25+ attrs.**

---

### sgs/team-member (30 gaps) — render.php

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| bio | richtext content | richtext-content | 39 |
| blockLink | wrapper `<a href>` | link-href | 51 |
| blockLinkTarget | `target="…"` | no-css (HTML attr) | 52 |
| cardStyle | wrapper class | enum-class-probe | 43 |
| hoverGrayscale | `filter:grayscale()` on `:hover` | boolean-visibility | 48 |
| hoverImageZoom | toggle class `--image-zoom` | boolean-visibility | 47 |
| hoverOverlay | overlay div conditional render | boolean-visibility | 53 |
| hoverScale | `transform:scale()` on `:hover` | transition-preset modifier | 45 |
| hoverShadow | `box-shadow:` on `:hover` | shadow-preset | 46 |
| memberMedia | media object | image-object | 16 |
| photoShape | wrapper class (`circle|square|rounded|hex`) | enum-class-probe | 44 |
| role | text content (member role) | text-content | 38 |
| roleColour | `color:` on role line | colour-text | 42, 131 |
| sgsAnimation / Duration / Easing | as above | enum-class-probe / transition-preset | n/a |
| sgsBlockLink / Target | duplicate of blockLink (legacy) | link-href / no-css | n/a |
| sgsHoverBgColour / BorderColour / TextColour | duplicate of hover* (legacy sgs prefix) | colour-bg / colour-border / colour-text | n/a |
| sgsHoverDuration | `--sgs-hover-duration:<n>ms` | transition-preset | n/a |
| sgsHoverGrayscale / ImageZoom / Scale / Shadow | duplicate of hover* | boolean-visibility / shadow-preset | n/a |
| socialLinks | array of {platform, url} | link-href (composite) | 40 |
| staggerDelay | as above | transition-preset | n/a |
| transitionDuration / Easing | transition shorthand | transition-preset | 49-50 |

**Team-member total mapped: 25+ attrs.** Note many duplicates (sgs-prefixed legacy attrs) — these should be consolidated into single canonical slots in DB.

---

### sgs/gallery (29 gaps) — render.php

| attr_name | CSS property / HTML / context | Recommended role | Source line |
|---|---|---|---|
| aspectRatio | `aspect-ratio:<v>` on item | select-from-enum | 36, 198 |
| captionBgColour | `background-color:` on caption | colour-bg | 59 |
| captionReveal | toggle class `--caption-reveal` | boolean-visibility | 39 |
| carouselAutoplay / Speed / ShowArrows / ShowDots | JS data-attrs | no-css (JS behaviour) | 51-54 |
| columns / Tablet / Mobile | class probe + `grid-template-columns` | enum-class-probe | 32-34 |
| enableLightbox | data-attr for JS lightbox | no-css (JS behaviour) | 37 |
| gap | `--sgs-gap:<n>px` → `gap:` on grid | spacing-token | 35, 70 |
| hoverEffect | wrapper class | enum-class-probe | 44 |
| hoverGrayscale | `filter:grayscale()` on `:hover` | boolean-visibility | 45 |
| hoverImageZoom | toggle class `--image-zoom` | boolean-visibility | 43 |
| hoverOverlayColour | `background-color:` on overlay div | colour-bg | 60 |
| hoverScale | `transform:scale()` on `:hover` | transition-preset modifier | 42 |
| hoverShadow | `box-shadow:` on `:hover` | shadow-preset | 46 |
| imageSize | WP image-size slug | select-from-enum | 40 |
| images | media array (legacy) | image-object | 29 |
| layout | wrapper class (`grid|masonry|carousel|justified`) | enum-class-probe | 31 |
| mediaItems | media array (new) | image-object | 28 |
| sgsAnimation / Duration / Easing | as above | enum-class-probe / transition-preset | n/a |
| showCaptions | conditional render | boolean-visibility | 38 |
| staggerDelay | as above | transition-preset | 47 |
| transitionDuration / Easing | transition shorthand | transition-preset | 48-49 |

**Gallery total mapped: 25+ attrs.**

---

### sgs/trustpilot-reviews (29 gaps) — render.php

Same shape as google-reviews. Mapping pattern:

| attr_name | role |
|---|---|
| autoplay / autoplaySpeed | no-css (JS behaviour) |
| businessUnitUrl | query-descriptor (API source) |
| cardStyle | enum-class-probe |
| columns / Tablet / Mobile | enum-class-probe |
| dataSource | query-descriptor (inline vs API) |
| reviews | richtext-content (inline review array) |
| reviewsAverage / totalReviews / trustScore | text-content (numeric display) |
| trustScoreLabel | text-content |
| sgsAnimation / Duration / Easing | enum-class-probe / transition-preset |
| showArrows / Author / Date / Dots / Schema / SourceHeader / Subtitle / TrustpilotLogo / VerifiedBadge | boolean-visibility |
| staggerDelay | transition-preset |
| subtitleText | text-content |
| theme | enum-class-probe |
| variant | enum-class-probe |

**Trustpilot total mapped: 25+ attrs.**

---

### sgs/card-grid (25 gaps) — render.php

Same shape as post-grid (sister block).

| attr_name | role |
|---|---|
| aspectRatio | select-from-enum |
| columns / Tablet / Mobile | enum-class-probe |
| gap | spacing-token |
| hoverBackgroundColour | colour-bg |
| hoverBorderColour | colour-border |
| hoverEffect | enum-class-probe |
| hoverGrayscale | boolean-visibility |
| hoverImageZoom | boolean-visibility |
| hoverScale | transition-preset modifier |
| hoverShadow | shadow-preset |
| hoverTextColour | colour-text |
| overlayStyle | enum-class-probe (gradient/solid/none) |
| queryCategory / queryPostType / queryPostsPerPage | query-descriptor |
| sgsAnimation / Duration / Easing | enum-class-probe / transition-preset |
| source | enum-class-probe (manual/query) |
| staggerDelay | transition-preset |
| transitionDuration / Easing | transition-preset |
| variant | enum-class-probe |

**Card-grid total mapped: 25 attrs.**

---

## Summary

- **Blocks analysed: 12** (button, mobile-nav, post-grid, hero, decorative-image / media, info-box, google-reviews, team-member, gallery, trustpilot-reviews, card-grid). Covers ~493 of the 942 gap attrs (52%) — the top-density blocks.
- **Attrs explicitly mapped in detail: ~340+** (rows in the tables above), with the remaining attrs in the analysed blocks fitting the same patterns by direct attribute-name homology (e.g. `sgsAnimation*` family appears identically across 8 blocks).
- **Aggregate role distribution across the mapped attrs:**

| Role | Approx count | Notes |
|---|---|---|
| enum-class-probe | ~80 | layout / variant / cardStyle / hoverEffect / theme / columns class-probes |
| boolean-visibility | ~70 | `show*` family + hover-effect toggles |
| number-css-px | ~55 | sizes / widths / heights / spacing / border-width |
| colour-text | ~30 | text + role + caption + hover text |
| colour-bg | ~25 | background colour + hover bg |
| colour-border | ~15 | border + hover border |
| transition-preset | ~30 | duration / easing / stagger / animation |
| select-from-enum | ~30 | textTransform / fontStyle / aspectRatio / iconPosition / drawerPosition / units |
| query-descriptor | ~20 | post-grid / card-grid / google-reviews / trustpilot query args |
| no-css (HTML attr / JS behaviour) | ~25 | rel / target / download / autoplay / controls / loop / muted / enableSwipe / data-attrs |
| spacing-token | ~15 | padding / margin / gap |
| shadow-preset | ~10 | boxShadow / boxShadowHover / hoverShadow |
| image-object | ~12 | memberMedia / boxMedia / decorMedia / mediaItems / images / videoPosterAttachmentId |
| link-href | ~10 | url / link / blockLink / reviewRequestUrl / socialLinks |
| text-content | ~10 | ctaText / readMoreText / taglineText / mediaEmoji / subtitleText |
| richtext-content | ~5 | bio / svgContent / badges / reviews |
| number-css-percent | ~10 | opacity / positionX / positionY / maxWidthPercent / drawerWidth / backdropOpacity |
| colour-gradient | ~3 | drawerGradient (mobile-nav) + hero overlay gradients |
| font-family-preset | ~3 | fontFamily (button) + label/sub-headline font-family (hero) |
| font-size-preset | ~5 | sublinkFontSize (CSS-var preset slug) + native fontSize |
| border-radius-token | ~12 | borderRadiusTL/TR/BR/BL × {desktop, tablet, mobile} |
| shadow-preset (hoverShadow as preset) | overlaps above | |

- **New `property_suffixes` proposed for canonical slot creation:**
  1. **`__top_left`, `__top_right`, `__bottom_left`, `__bottom_right`** corner suffixes for border-radius and border-width (8 attrs per block per breakpoint × button/hero/info-box etc.)
  2. **`__tablet`, `__mobile`** responsive breakpoint suffixes (universal — currently inflates gap count by ~3×)
  3. **`__unit`** suffix for any numeric attr that pairs with a unit selector (paddingUnit, marginUnit, fontSizeUnit, borderRadiusUnit, splitGapUnit, etc.)
  4. **`__hover`** state suffix (hoverBgColour, hoverTextColour, hoverBorderColour are universal across cards)
  5. **`__active`, `__focus`** state suffixes (mobile-nav linkActiveColour, focusColour)
  6. **CSS-variable bridge slot** for blocks like mobile-nav that route everything through `--sgs-mn-*` custom properties — the canonical attr maps to a CSS var, the CSS var maps to the actual property. This is one indirection layer that the current `attribute_gap_candidates` table doesn't model.

- **Attrs deemed `no-css` (JS-behaviour, HTML attribute, query-descriptor, schema-only):** ~70 (rel, target, linkTarget, download, isSubmit, ariaLabel, iconTitle, autoplay, controls, loop, muted, lazyLoad, fadeOnScroll, parallaxStrength, pathDrawOnScroll, pathDrawTriggerOffset, enableSwipe, breakpoint as media query, videoSchema, all `query*` and `categories/tags/exclude/offset/order/orderBy/postType/postsPerPage/search/taxQuery/author/inherit/namespace/placeId/maxReviews/minRating/dataSource/businessUnitUrl/excludeKeywords/sortBy/filterTaxonomy`, `carouselAutoplay/Speed/ShowArrows/ShowDots/enableLightbox/showSchema`, `playbackMode`).

  These attrs do not need a `property_suffix` / canonical CSS slot. They need either:
  - **`html-attribute` slot** (rel, target, download, autoplay, controls, loop, muted, alt, lazyLoad)
  - **`query-descriptor` slot** (the 20+ query-args family)
  - **`js-behaviour-flag` slot** (carousel*, enableLightbox, parallax*, pathDraw*, fadeOnScroll, swipe, schema)

- **Key cross-block discovery:** the `sgsAnimation` / `sgsAnimationDuration` / `sgsAnimationEasing` / `staggerDelay` / `transitionDuration` / `transitionEasing` family is **identical across 8+ blocks** (post-grid, info-box, google-reviews, team-member, gallery, trustpilot-reviews, card-grid, mobile-nav). Strong case for a **single shared canonical slot family** (motion-* / animation-*) rather than 8 separate per-block entries.

- **The `hover*` family is also identical across at least 7 blocks** (post-grid, card-grid, info-box, team-member, gallery, hero, button). `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour`, `hoverScale`, `hoverShadow`, `hoverImageZoom`, `hoverGrayscale`, `hoverEffect`. Strong case for a **shared `hover-state-*` slot family**.

- **The responsive breakpoint suffix family (`*Mobile`, `*Tablet`)** appears on ~25% of every block's attrs. Suggests a **structural responsive-modifier slot type** rather than tripling the attr count per breakpoint.

- **Mobile-nav uses a CSS-variable-bridge architecture** (every attr → `--sgs-mn-<x>` → some final CSS property). This is a different shape from the inline-style blocks (button, hero, decorative-image) and needs explicit modelling in role-templates — proposed new role: **`css-var-bridge`** with a sub-property pointing at the final CSS property the variable feeds.

## Next-step recommendations (for the merge stage, no DB writes here)

1. Adopt the **responsive-modifier slot type** before adding 942 individual rows; ~30% of gaps collapse into existing slots + modifier.
2. Adopt the **state-modifier slot type** (`hover`, `active`, `focus`, `disabled`); another ~10% collapse.
3. Adopt **corner-modifier** for border-radius / border-width; another ~8% collapse.
4. Create the shared **motion-* / animation-* slot family** once and reference it from every block that has the `sgsAnimation` family; another ~10% collapse.
5. Route mobile-nav and similar CSS-var-bridge blocks through a `css-var-bridge` role rather than the standard inline-style role.
6. The ~70 `no-css` attrs need a separate registry (html-attribute, query-descriptor, js-behaviour-flag) — they should not be in `attribute_gap_candidates` flagged as `new-canonical-slot-needed` because they are not CSS slots.

Estimated remaining true CSS-slot gaps after these collapses: ~250 (down from 942), aligned with role templates rather than per-block.
