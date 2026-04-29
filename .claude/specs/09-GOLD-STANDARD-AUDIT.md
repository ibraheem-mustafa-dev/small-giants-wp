# Gold Standard Audit — SGS Blocks vs Competitors

> **STATUS: VERIFIED** — Research conducted 2026-02-14 using live scrapes of competitor
> product pages (kadencewp.com, wpspectra.com, generatepress.com/blocks, elementor.com/widgets).
> All pricing, block lists, and feature claims verified against current public pages.

## Overview

Per-block comparison of the 25 SGS blocks against their closest equivalents in Kadence Blocks Pro ($119-299/yr), Spectra Pro ($49-199/yr), GenerateBlocks Pro ($99/yr or $149/yr bundled), and Elementor Pro ($59-399/yr). Followed by cross-cutting concerns audit, missing block types analysis, competitor critique patterns, and prioritised gap list.

**Rating key:**
- **Full** — Feature present with comparable or superior implementation
- **Partial** — Feature exists but limited (fewer options, no responsive controls, etc.)
- **None** — Feature not available
- **Pro** — Requires paid Pro version
- **N/A** — Block type doesn't exist in this competitor

**SGS advantage indicators:**
- Performance advantage noted where SGS has significantly less JS/CSS overhead
- Accessibility advantage noted where SGS has proper ARIA implementation that competitors lack
- Customisation advantage noted where SGS offers per-element design token controls

---

## Per-Block Comparison Tables

### 1. Container (`sgs/container`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Flexbox layout | Full | Full | Full | Full | Full |
| CSS Grid layout | Full | Full | Full | Full (Grid block variation) | Partial (basic) |
| Stack (vertical) layout | Full | Full | Full | Full | Full |
| Background image/gradient | Full (via supports) | Full | Full | Full (Pro: Backgrounds) | Full |
| Background video | None | Full (Row Layout) | Full | None | Full |
| Shape dividers | None | Full (Row Layout, Pro adds more) | Full (20+ shapes) | Full (Shape block, free) | Full (15+ shapes) |
| Per-breakpoint padding/margin | Full | Full | Full | Full | Full |
| Inner content width control | Full | Full | Full | Full | Full |
| Min/max height | Full | Full | Full | Full | Full |
| Overflow control | Full | Full | Full | Full | Full |
| Sticky positioning | None | Pro (Hooked Elements) | None | None | Pro |
| **Performance** | Dynamic render.php, zero JS | Zero JS | Zero JS | Zero JS | 40KB+ base CSS |
| **Gap** | Shape dividers, background video, sticky positioning |

**Recommendation:** Shape dividers are standard across all competitors — this is a real gap. Add as an optional extension (SVG clip-path, < 1KB CSS). Background video is offered by Kadence and Spectra too — consider for Phase 2. Sticky positioning can be a CSS utility class.

---

### 2. Hero (`sgs/hero`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Full-width with background image | Full | Full (via Container) | Full (via Container) | Full (via Container) | Full |
| Video background | None | Full (via Row Layout) | Full (via Container) | None | Full |
| Headline customisation (colour, size) | Full | Full | Full | Full | Full |
| Sub-headline customisation | Full | Full | Full | Full | Full |
| CTA button (text + bg colour) | Full | Full | Full | Partial | Full |
| Multiple CTA buttons | None (1 CTA) | Full (Buttons block) | Full (Buttons block) | Full | Full |
| Overlay gradient | Full | Full | Full | Full | Full |
| Parallax background | None | None | None | None | Pro |
| Ken Burns effect | None | None | None | None | Pro |
| Min-height control | Full | Full | Full | Full | Full |
| Content alignment (vertical) | Full | Full | Full | Full | Full |
| **Performance** | Dynamic render.php, zero JS | Zero JS | Zero JS | Zero JS | 40KB+ base |
| **Gap** | Second CTA button, parallax background |

**Recommendation:** Add support for 2 CTA buttons (primary + secondary). Parallax is already in the animation extension spec — apply to hero background.

---

### 3. Info Box (`sgs/info-box`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Icon + heading + description | Full | Full | Full | N/A (compose manually) | Full (Icon Box widget) |
| Icon colour + background | Full | Full | Full | N/A | Full |
| Heading colour + size | Full | Full | Full | N/A | Full |
| Description colour | Full | Full | Full | N/A | Full |
| Image instead of icon | None | Full | Full | N/A | Full (Image Box widget) |
| Link wrapper (entire box clickable) | None | Full | Full | N/A | Full |
| Icon position (top/left/right) | None | Full | Full | N/A | Full |
| Hover effects | None | Full (colour change) | Full | N/A | Full (extensive) |
| Number badge (step indicator) | None | None | None | N/A | None |
| **Gap** | Image support, entire-box link, icon position options, hover colour change |

**Recommendation:** Add `mediaType` attribute (icon | image), `linkUrl` for entire-box clickability, and `iconPosition` (top | left | right). These are expected features that Kadence and Spectra both offer.

---

### 4. Counter (`sgs/counter`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Animated number counting | Full | Full (Count Up block) | Full | None | Full |
| Prefix/suffix text | Full | Full | Full | N/A | Full |
| Decimal support | Full | Full | Full | N/A | Full |
| Duration control | Full | Full | Full | N/A | Full |
| Number colour | Full | Full | Full | N/A | Full |
| Label colour + size | Full | Full | Full | N/A | Full |
| Thousands separator | Full | Full | Full | N/A | Full |
| Icon/image above number | None | Full | None | N/A | Full |
| **Performance** | 839B viewScriptModule | ~3KB | ~5KB | N/A | 40KB+ base |
| **Gap** | Optional icon/image above number |

**Recommendation:** Minor — add optional icon slot above number. Low priority since Trust Bar covers the icon + number pattern.

---

### 5. Trust Bar (`sgs/trust-bar`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Horizontal stats strip | Full | N/A | N/A | N/A | N/A (compose manually) |
| Animated counting | Full | N/A | N/A | N/A | N/A |
| Value + label per stat | Full | N/A | N/A | N/A | N/A |
| Value colour | Full | N/A | N/A | N/A | N/A |
| Label colour + size | Full | N/A | N/A | N/A | N/A |
| **Performance** | 733B viewScriptModule | N/A | N/A | N/A | N/A |

**Recommendation:** No direct competitor equivalent. This is a USP — a purpose-built block for the common "stats strip" pattern that competitors require manual composition to achieve. No gaps.

---

### 6. Heritage Strip (`sgs/heritage-strip`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Full-width story/heritage section | Full | N/A (compose manually) | N/A | N/A | N/A |
| Headline colour + size | Full | N/A | N/A | N/A | N/A |
| Body text colour + size | Full | N/A | N/A | N/A | N/A |
| Background image support | Full (via supports) | N/A | N/A | N/A | N/A |

**Recommendation:** No direct competitor equivalent. Purpose-built for Indus Foods-style heritage/story sections. No gaps.

---

### 7. Card Grid (`sgs/card-grid`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Grid of image+content cards | Full | Partial (Post Grid — Pro) | Partial (Post Grid) | Query Loop | Full (Posts widget) |
| Manual content (not post-based) | Full | None (post query only) | None (post query only) | None | None |
| Title + subtitle per card | Full | Post title only | Post title only | Post title only | Post title only |
| Overlay variant | Full | Pro (Image Overlay) | None | None | Full (CTA widget) |
| Card variant (image above text) | Full | Post Grid layout | Post Grid layout | Query Loop | Posts widget |
| Columns control | Full | Full | Full | Full | Full |
| Title colour | Full | Limited | Limited | Limited | Full |
| Subtitle colour | Full | N/A | N/A | N/A | Full |
| **Gap** | Hover animation on cards, dynamic post query mode |

**Recommendation:** Add a `source` toggle: "manual" (current) vs "query" (pulls from posts/CPT). The manual mode is the USP — competitors only offer query-based grids. Adding query mode makes it a superset.

---

### 8-9. Testimonial + Testimonial Slider

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Single testimonial card | Full | Full | Full | N/A | Full |
| Slider/carousel | Full | Full (grid + carousel layouts) | Full (built-in carousel mode) | N/A | Full (Testimonial Carousel widget) |
| Star rating display | Full | Full | Full | N/A | Full |
| Quote text customisation | Full (colour) | Full | Full | N/A | Full |
| Name + role customisation | Full (colour + size) | Full | Full | N/A | Full |
| Avatar/photo | Full | Full | Full | N/A | Full |
| Slider autoplay | Full | Full | Full | N/A | Full |
| Slider dots/arrows | Full | Full | Full | N/A | Full |
| Schema markup (Review) | None | None | Full (Review block — separate) | N/A | Full (Reviews widget — separate) |
| **Performance** | 1.63KB viewScriptModule | Zero JS (grid only) | Zero JS (grid only) | N/A | 40KB+ |
| **Gap** | Schema markup for reviews/testimonials |

**Recommendation:** Add optional `schema.org/Review` JSON-LD output when testimonials include star ratings. This is an SEO win that Spectra and Elementor offer via separate Review blocks.

---

### 10. CTA Section (`sgs/cta-section`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Headline + body + button | Full | N/A (compose manually) | Full (Call To Action block) | N/A (compose manually) | Full (CTA widget) |
| Headline colour | Full | N/A | Full | N/A | Full |
| Body colour + size | Full | N/A | Full | N/A | Full |
| Button text + bg colour | Full | N/A | Full | N/A | Full |
| Background image/gradient | Full (via supports) | N/A | Full | N/A | Full |
| Dual buttons | None | N/A | None | N/A | Full |
| Ribbon/badge | None | N/A | None | N/A | Full |

**Recommendation:** Add optional second button (secondary CTA). This is a common pattern: "Get Started" + "Learn More".

---

### 11. Process Steps (`sgs/process-steps`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Numbered step timeline | Full | None | None | N/A | None (Icon List workaround) |
| Step number colour + bg | Full | N/A | N/A | N/A | N/A |
| Title colour | Full | N/A | N/A | N/A | N/A |
| Description colour | Full | N/A | N/A | N/A | N/A |
| Horizontal layout | Full | N/A | N/A | N/A | N/A |
| Vertical layout option | None | N/A | N/A | N/A | N/A |
| Connector line style | None | N/A | N/A | N/A | N/A |

**Recommendation:** Add vertical layout option and configurable connector line (solid, dashed, dotted, colour). Vertical layout is important for mobile and for longer process flows.

---

### 12. Accordion (`sgs/accordion`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Expandable sections | Full | Full | Full | Pro (Accordion block) | Full |
| FAQ Schema markup | None | Full | Full | None | Full |
| Allow multiple open | Full | Full | Full | Full | Full |
| Custom icon (open/close) | None | Full (basic free, custom SVG Pro) | Full | None | Full |
| Nested accordions | None | None | None (1-star complaint) | None | Full |
| Title typography control | Full | Full | Full | Full | Full |
| Content area (inner blocks) | Full | Full | Full | Full | Full |
| Initial open item | Full | Full | Full | Full | Full |
| **Gap** | FAQ Schema markup, custom open/close icons |

**Recommendation:** Add FAQ Schema (`schema.org/FAQPage`) JSON-LD output — critical for SEO. Add `openIcon` and `closeIcon` attributes (chevron, plus/minus, arrow). Both Kadence and Spectra offer these.

---

### 13. Tabs (`sgs/tabs`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Tabbed content panels | Full | Full | Full | Pro (Tabs block) | Full |
| Horizontal tabs | Full | Full | Full | Full | Full |
| Vertical tabs | None | Full | Full | Full | Full |
| Tab icon | None | Full | Full | None | Full |
| Tab alignment | Full | Full | Full | Full | Full |
| Initial active tab | Full | Full | Full | Full | Full |
| Tab content (inner blocks) | Full | Full | Full | Full | Full |
| Anchor links to tabs | None | Full | Full | Full | Full |
| **Gap** | Vertical tab layout, tab icons, anchor/deep links |

**Recommendation:** Add vertical tab layout (tabs on left, content on right). Add optional icon per tab. Add URL hash anchoring so direct links can open specific tabs.

---

### 14. Brand Strip (`sgs/brand-strip`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Logo carousel/strip | Full | None | None | N/A | Full (Image Carousel) |
| Greyscale toggle | Full | N/A | N/A | N/A | None (CSS filter manual) |
| Scroll animation | Full | N/A | N/A | N/A | Full |
| Logo sizing control | Full | N/A | N/A | N/A | Full |
| Hover colour restore | Full | N/A | N/A | N/A | None |

**Recommendation:** No gaps. Greyscale + hover restore is a USP that even Elementor doesn't offer natively.

---

### 15. WhatsApp CTA (`sgs/whatsapp-cta`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Floating WhatsApp button | Full | N/A | N/A | N/A | N/A (addon required) |
| Pre-filled message | Full | N/A | N/A | N/A | N/A |
| Label customisation | Full | N/A | N/A | N/A | N/A |
| Page-specific message | Full | N/A | N/A | N/A | N/A |

**Recommendation:** No direct competitor equivalent. Purpose-built for SME client sites. No gaps.

---

### 16. Certification Bar (`sgs/certification-bar`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Badge/certification strip | Full | N/A | N/A | N/A | N/A |
| Title + label per badge | Full | N/A | N/A | N/A | N/A |
| Title colour + size | Full | N/A | N/A | N/A | N/A |
| Label colour + size | Full | N/A | N/A | N/A | N/A |

**Recommendation:** No direct equivalent. Purpose-built. No gaps.

---

### 17. Notice Banner (`sgs/notice-banner`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Inline informational banner | Full | N/A | Full (Inline Notice) | N/A | Full (Alert widget) |
| 4 variants (info, success, warning, error) | Full | N/A | Full | N/A | Full |
| Text colour + size | Full | N/A | Full | N/A | Full |
| Icon per variant | Full | N/A | Full | N/A | Full |
| Dismissible | None | N/A | None | N/A | Full |

**Recommendation:** Add optional dismiss button. Spectra doesn't have this either, but Elementor does, and it's a reasonable expectation for banners.

---

### 18. Announcement Bar (`sgs/announcement-bar`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Top-of-page banner | Full | Pro (Kadence Conversions) | None | Pro (Overlay Panels) | Popup workaround |
| Countdown timer | Full | Pro | N/A | None | Pro (Countdown widget) |
| Message rotation | Full | None | N/A | None | None |
| Scheduling (date range) | Full | Pro (date schedule display conditions) | N/A | Pro (Conditional Display) | Pro (Popup conditions) |
| Dismissible (session/persistent) | Full | Pro | N/A | None | None |
| CTA button | Full | Pro | N/A | Pro | Pro |
| Interactivity API | Full | N/A | N/A | N/A | jQuery-based |
| **Performance** | viewScriptModule, zero CLS | Unknown | N/A | N/A | Heavy |

**Recommendation:** No gaps. SGS already matches or exceeds Kadence Conversions (which requires the $169+ plan). GenerateBlocks Pro now has Overlay Panels but they don't include countdown or message rotation.

---

### 19. SVG Background (`sgs/svg-background`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| SVG animation container | Stub only | None | None | Partial (Shape block for static SVGs) | None |
| Custom SVG content | Planned | N/A | N/A | Static shapes only | N/A |
| Animation types | Planned | N/A | N/A | N/A | N/A |

**Recommendation:** Low priority. GenerateBlocks has a Shape block for static SVGs, but no competitor offers animated SVG backgrounds natively. Build when a client project needs it.

---

### 20. Pricing Table (`sgs/pricing-table`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Plan comparison table | Stub only | None | Full (Price List) | N/A | Full (Price Table widget) |
| Price display | Planned | N/A | Full | N/A | Full |
| Feature list per plan | Planned | N/A | Full | N/A | Full |
| Highlighted/recommended plan | Planned | N/A | None | N/A | Full |
| CTA per plan | Planned | N/A | Full | N/A | Full |
| Toggle (monthly/yearly) | Planned | N/A | None | N/A | None |
| Ribbon/badge ("Popular") | Planned | N/A | None | N/A | Full |

**Recommendation:** When built, ensure: monthly/yearly toggle, recommended plan highlight, per-plan CTA, and ribbon/badge. These differentiate from Spectra's basic Price List.

---

### 21. Modal (`sgs/modal`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Lightbox/modal overlay | Stub only | Pro (Modal block) | Full (Modal block, V3) | Pro (Overlay Panels) | Full (Popup) |
| Inner blocks content | Planned | Pro | Full | Pro | Full |
| Trigger (button click) | Planned | Pro | Full | Pro | Full |
| Trigger (image click) | Planned | Pro | Full | Pro | Full |
| Trigger (text/link click) | Planned | Pro | Full | Pro | Full |
| Close on overlay click | Planned | Pro | Full | Pro | Full |
| Close on Escape | Planned | Pro | Full | Pro | Full |
| Animation | Planned | Pro | Full | Pro | Full |
| Focus trapping | Planned | Unknown | Unknown | Unknown | Unknown |

**Recommendation:** When built, ensure WCAG-compliant focus trapping and Escape key handling — areas where competitors are often weak. GenerateBlocks Pro now has Overlay Panels which serve as popups/modals/off-canvas. Use SGS Pop-ups plugin for advanced popup needs; this block is for simple inline modals.

---

### 22. Icon List (`sgs/icon-list`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Icon + text list | Full | Full | Full | N/A | Full |
| Custom icon per item | Full | Full | Full | N/A | Full |
| Icon colour | Full | Full | Full | N/A | Full |
| Text colour | Full | Full | Full | N/A | Full |
| Icon size control | None | Full | Full | N/A | Full |
| Dividers between items | None | Full | None | N/A | Full |
| Link per item | None | Full | Full | N/A | Full |
| **Gap** | Icon size control, dividers, per-item links |

**Recommendation:** Add `iconSize` attribute, optional divider between items, and optional `url` per item. All three are standard in Kadence.

---

### 23. Google Reviews (`sgs/google-reviews`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Google Places API integration | Full | N/A | N/A | N/A | N/A (addon required) |
| Grid/slider/list layouts | Full | N/A | N/A | N/A | N/A |
| Star rating filter | Full | N/A | N/A | N/A | N/A |
| Schema.org markup | Full | N/A | N/A | N/A | N/A |
| Cache management | Full | N/A | N/A | N/A | N/A |
| Badge/floating badge | Full | N/A | N/A | N/A | N/A |

**Recommendation:** No direct competitor equivalent in block plugins. Competitors use third-party widgets (Elfsight $5-18/month). This is a strong USP.

---

### 24. Mega Menu (`sgs/mega-menu`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Multi-column dropdowns | Full | Pro (Advanced Navigation, part of Theme Kit Pro) | None | Pro (Navigation block + Mega Menu) | Pro |
| Template part content areas | Full | Pro (inner block content areas) | N/A | Pro (inner block content) | Custom content areas |
| Full keyboard navigation | Full | Unknown (not documented) | N/A | Unknown | Partial |
| ARIA menubar pattern | Full | Unknown | N/A | Unknown | Partial |
| Mobile accordion fallback | Full | Full | N/A | Full | Full |
| Interactivity API | Full | N/A | N/A | N/A | jQuery |

**Recommendation:** GenerateBlocks Pro now has a Navigation block with Mega Menu support — this was not in the original audit. SGS's template-part-based approach and Interactivity API remain differentiators. Kadence has it via Advanced Navigation in Theme Kit Pro (part of $169+ plan).

---

### 25. Decorative Image (`sgs/decorative-image`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Absolute-positioned decorative images | Full | None | None | None | None (requires custom CSS) |
| Percentage-based positioning | Full | N/A | N/A | N/A | N/A |
| Per-breakpoint overrides | Full | N/A | N/A | N/A | N/A |
| Parallax scroll | Full | N/A | N/A | N/A | N/A |
| WCAG decorative handling | Full | N/A | N/A | N/A | N/A |

**Recommendation:** No direct competitor equivalent. Purpose-built for scattered food photography (Indus Foods) and decorative flourishes. No gaps.

---

## Block Types SGS Does Not Cover

Competitors offer block types that SGS has no equivalent for. Categorised by priority based on how many competitors offer it and how commonly clients need it.

### High Priority — Most Competitors Offer, Clients Expect

| Block Type | Kadence | Spectra | GenerateBlocks | Elementor | SGS Recommendation |
|---|---|---|---|---|---|
| **Table of Contents** | Full (free) | Full (free) | None | Full (Pro) | Build — essential for blog/content sites. 3 of 4 competitors have it. |
| **Post Grid / Query Loop** | Pro (Post Grid/Carousel) | Full (Post Grid, Post Carousel, Post Masonry, Loop Builder) | Full (Query block, free) | Full (Posts widget, Loop Grid) | Build — essential for dynamic content sites. All 4 competitors have it. |
| **Image Gallery with lightbox** | Full (Advanced Gallery, free; Pro Gallery Addons for carousel) | Full (Image Gallery, Masonry Gallery) | None | Full (Basic Gallery free, Pro Gallery) | Build — very common need. 3 of 4 competitors have it. |
| **Progress Bar** | None | None | None | Full (free) | Skip — only Elementor has it. Can compose with CSS. Low demand for SGS clients. |
| **Star Rating (standalone)** | None | Full (Star Ratings, free) | None | Full (free) | Build — useful for review sites. Spectra and Elementor have it. Could reuse Testimonial rating component. |
| **Google Map** | None | Full (Google Map, free) | None | Full (free) | Consider — Spectra and Elementor have it. Common for business sites. But iframe embed works without a block. |

### Medium Priority — Some Competitors Offer, Nice to Have

| Block Type | Kadence | Spectra | GenerateBlocks | Elementor | SGS Recommendation |
|---|---|---|---|---|---|
| **Countdown Timer** | Full (free, Pro for evergreen) | Full (Countdown, free) | None | Full (Pro) | Skip for now — SGS has countdown inside Announcement Bar. Could extract as standalone block later. |
| **Content Timeline** | None | Full (Content Timeline, free) | None | None | Consider — only Spectra has it. Useful for company history pages (Indus Foods). |
| **Team Member** | None | Full (Team, free) | None | None | Consider — only Spectra has it. Common need for agency/company "About Us" pages. |
| **Video Popup** | Pro (Video Popup block) | None | None | None | Skip — only Kadence Pro. Can compose with Modal + Video. |
| **Lottie Animation** | None | Full (Lottie Animation, free) | None | Pro | Skip — niche use case, performance concern. |
| **Advanced Slider** | Pro | Full (Slider Block, V3) | None | Pro (Slides widget) | Consider — multiple competitors have general-purpose sliders. SGS has Testimonial Slider and Brand Strip but no general content slider. |
| **Social Share** | None | Full (Share, free) | None | Full (Pro) | Skip — WordPress core and Rank Math handle social sharing. |
| **Image Overlay** | Pro | None | None | None | Skip — only Kadence Pro. Card Grid overlay variant serves this purpose. |
| **Blockquote (styled)** | None | Full (Blockquote, free) | None | Full (Pro) | Skip — WordPress core has a quote block. Style via theme.json. |
| **How To (schema)** | None | Full (How To, free) | None | None | Consider — only Spectra, but has SEO value (schema.org/HowTo). |

### Low Priority — Niche or Composable

| Block Type | Who Has It | SGS Recommendation |
|---|---|---|
| Login Form | Spectra | Skip — niche, can use WP core login |
| Registration Form | Spectra | Skip — can build with SGS Forms |
| Instagram Feed | Spectra | Skip — third-party plugins (Smash Balloon) do this better |
| Flip Box | Elementor | Skip — rare use case |
| Animated Headline | Elementor Pro | Skip — niche, animation extension covers text effects |
| Marketing Button | Spectra | Skip — regular button with custom styling |
| Taxonomy List | Spectra | Skip — niche, can compose with Query |
| Split Content | Kadence Pro | Skip — compose with Container (two-column) |
| Portfolio Grid | Kadence Pro, Elementor | Skip — Card Grid with overlay variant serves this |
| Product Carousel (WooCommerce) | Kadence Pro, Elementor | Skip — no WooCommerce planned for SGS clients |
| Search | Spectra, WP core | Skip — WordPress core search block |
| Separator/Divider | Kadence, WP core | Skip — WordPress core separator block |
| User Info | Kadence Pro | Skip — niche |
| Off-Canvas | Elementor Pro, GB Pro | Skip — Pop-ups plugin handles this |

### Summary: Build These Next

1. **Table of Contents** — highest value, 3 of 4 competitors have it, essential for content sites
2. **Post Grid / Query Loop** — essential for dynamic content, all 4 competitors have some form
3. **Image Gallery with lightbox** — very common need, 3 of 4 competitors have it
4. **Standalone Star Rating** — reuse Testimonial component, adds review site capability
5. **Content Timeline** — useful for Indus Foods heritage page, only Spectra has it
6. **Team Member** — useful for company pages, only Spectra has it

---

## Cross-Cutting Concerns Audit

### 1. Global Defaults System

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Set default styles for all instances of a block | None | Full (Configurable Defaults — free feature) | Full (Global Block Style extension) | Pro (Global Styles) | Full (Global Fonts, Colours, Widget defaults) |
| **Gap assessment** | SGS has no global defaults beyond theme.json tokens. Kadence's "Configurable Defaults" is a **free** feature — every new block instance uses saved defaults. |

**Recommendation:** Phase 2 feature. Implement a "Save as default" action in the block toolbar that stores block attribute defaults in a `sgs_block_defaults` option. When a new block is inserted, merge saved defaults with the block's default attributes. This is a major usability win for site builders who want consistent styling without patterns.

---

### 2. Copy/Paste Styles

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Copy styles from one block, paste to another | Via WP core (6.2+) | Full (Kadence 3.0+) | Full (via WP core) | Full (Pro: Copy+Paste Styles) | Full (Right-click Copy/Paste Style) |

**Recommendation:** WordPress core added Copy Styles / Paste Styles to the block toolbar three-dot menu in WP 6.2+. SGS blocks inherit this via core. GenerateBlocks Pro adds their own implementation. Verify whether SGS custom attributes (per-element colours, sizes) are included in core's copy/paste — if not, extend the mechanism. Low priority.

---

### 3. Responsive Preview Quality

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| In-editor responsive preview | Basic (WP core) | Enhanced (custom breakpoints) | Enhanced (Responsive Conditions) | Basic (WP core) | Full (device preview + responsive controls inline) |
| Per-breakpoint settings visible | Via ResponsiveControl component | Full | Full | Full | Full |
| **Gap assessment** | SGS uses the shared ResponsiveControl component for per-breakpoint settings, which matches Kadence/Spectra. The actual preview relies on WordPress core's device preview buttons, which are adequate. |

**Recommendation:** No urgent gap. The ResponsiveControl component works. WordPress core's responsive preview is used by all native block plugins.

---

### 4. Block Pattern Library

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Pre-built patterns/templates | None | 800+ (Pro, AI-generated) | 100+ templates | 300+ patterns (Pro) | 300+ templates |
| Pattern categories | N/A | Full | Full | Full | Full |
| One-click import | N/A | Full | Full | Full | Full |
| AI-assisted patterns | N/A | Full (Kadence AI) | None | None | Full (Elementor AI) |
| **Gap assessment** | SGS has zero pre-built patterns. Kadence has raised the bar to 800+ with AI-generated patterns. |

**Recommendation:** Phase 2 feature. Create 20-30 section patterns (hero variations, testimonial layouts, CTA sections, feature grids) using SGS blocks. Register as WordPress block patterns with categories. These serve as "starting points" for site builders and demonstrate block capabilities. Not a build priority — blocks themselves must work first.

---

### 5. Import/Export System

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Export block settings | None | Pro (Pattern Hub $99/yr) | None | Pro (GenerateCloud $99/yr) | Full (JSON export) |
| Import block settings | None | Pro (Pattern Hub) | None | Pro (GenerateCloud) | Full (JSON import) |
| Cross-site sharing | None | Pro (Cloud library) | None | Pro (unlimited libraries) | Pro (Template Cloud) |
| **Gap assessment** | GenerateCloud ($99/yr) and Kadence Pattern Hub ($99/yr) both offer dedicated cloud pattern sharing now. WordPress core's pattern system and reusable blocks partially address this. |

**Recommendation:** Low priority. WordPress reusable blocks and pattern system handle cross-page sharing. Cross-site sharing can use the `wp block-patterns` WP-CLI export. A dedicated import/export UI is unnecessary at this stage.

---

### 6. Role-Based Block Visibility

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Show/hide blocks by user role | None | Pro (Kadence Conversions display conditions) | Full (Display Conditions extension) | Pro (Conditional Display) | Full (Conditions) |
| Show/hide by login state | None | Pro | Full | Pro | Full |
| Show/hide by date/time | None | Pro (date schedule — range + recurring) | Full | Pro | Full |
| Show/hide by URL parameter | None | Pro (URL query parameter) | None | Unknown | Full |
| Show/hide by device | Full (hideOnMobile/Tablet/Desktop) | Full | Full (Responsive Conditions) | Pro (Device Visibility) | Full |
| Show/hide by referral domain | None | Pro | None | None | None |
| Show/hide by WooCommerce cart | None | Pro (product in cart, total price) | None | None | None |
| **Gap assessment** | SGS has device-based visibility but no role/login/schedule visibility. Kadence Conversions has the most comprehensive display conditions (20+ types). GenerateBlocks Pro now has Conditional Display as well. |

**Recommendation:** Extend the existing Visibility Extension to add: `hideWhenLoggedIn`, `hideWhenLoggedOut`, `hideForRoles` (array), `showAfterDate`, `showBeforeDate`. These are server-side checks in render.php — zero frontend cost. Important for client sites that show different content to members vs visitors.

---

### 7. Animation/Motion Library Depth

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Entrance animations | 15 types | Pro (Animate on Scroll) ~12 types | ~10 types (Animations extension) | Pro (Effects) | 40+ types |
| Hover effects | 7 types | Basic (colour change) | Basic | Pro (Effects) | 15+ types |
| Scroll-linked effects | CSS Scroll-Driven + fallback | None | None | None | Full (parallax, horizontal scroll, mouse effects) |
| Mouse tracking effects | 1 (3D tilt) | None | None | None | Full (mouse track, 3D tilt, track image) |
| Stagger/sequence | Full | None | None | None | Full |
| Reduced motion respect | Full (non-negotiable) | Basic | Basic | Unknown | Partial |
| **Gap assessment** | SGS entrance animations (15) are adequate vs Kadence (~12 Pro only) and Spectra (~10). GenerateBlocks Pro now has Effects but details are limited. Elementor's 40+ are mostly duplicates/variations. SGS's scroll-linked effects (CSS Scroll-Driven Animations) are more modern than Elementor's JS-heavy parallax. |

**Recommendation:** No urgent gaps. The animation spec already exceeds Kadence and Spectra. Elementor's quantity advantage is mostly vanity — many effects are minor variations. Focus on polish and performance over adding more animation types.

---

### 8. Custom CSS Per Block

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Custom CSS field per block | None | Pro (Page-Specific CSS/JS) | None | Full (via advanced style builder — any CSS property) | Full (per-widget CSS) |
| CSS class field | Full (WP core) | Full | Full | Full | Full |
| **Gap assessment** | GenerateBlocks Pro's style builder allows targeting any CSS property on any element inside a block — this is more powerful than a simple CSS textarea. Kadence Pro offers page-specific CSS/JS. |

**Recommendation:** Add a "Custom CSS" textarea to the block extensions sidebar (the same sidebar that has animation and visibility controls). The CSS is scoped to the block's unique wrapper class. Output via `wp_add_inline_style()`. This is < 50 lines of code and provides significant design flexibility for edge cases. Medium priority.

---

### 9. Dynamic Content / Data Binding

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Pull custom fields into blocks | None | Pro (Dynamic Content) | Pro (Dynamic Content extension) | Pro (Query block with post meta) | Full (Dynamic Tags — extensive) |
| ACF/Pods/Meta Box integration | None | Pro | Pro | Pro | Full |
| Dynamic backgrounds | None | None | Pro (dynamic featured image/CF backgrounds) | Pro | Full |
| Dynamic text (post title, date, author) | None | Pro | Pro | Pro (Headline block dynamic source) | Full |
| Shortcode fallback | None | None | Pro (dynamic shortcodes) | None | None |
| **Gap assessment** | All competitors offer dynamic content in Pro tiers. Essential for template-based sites using custom post types. Not needed for SGS's current target (small business brochure sites) but would be needed for blog templates or CPT-driven layouts. |

**Recommendation:** Phase 3+ feature. Not needed for current Indus Foods use case. If a future client needs dynamic blog templates or CPT-driven content, this becomes high priority. Spectra's implementation (ACF/Pods/Meta Box integration, dynamic backgrounds, shortcodes) is the most comprehensive among block plugins.

---

### 10. AI Content Generation

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| AI-generated copy | None | Full (Kadence AI — OpenAI, inline suggestions, tone control, pattern pre-population) | None | None | Full (Elementor AI — text, image, code) |
| AI-generated images | None | Full (royalty-free imagery) | None | None | Full |
| AI credit system | N/A | 250 free, 1,250-8,000/yr on paid plans (~$20/4,000 addon credits) | N/A | N/A | Usage-based |
| AI starter sites | N/A | Full (customised AI content for starter templates) | None | None | Full |
| **Gap assessment** | Only Kadence and Elementor have built-in AI. Spectra users complained about "AI bloat" — not everyone wants it. |

**Recommendation:** Not a priority. SGS is built entirely by Claude Code — AI content generation is handled at the development level, not the end-user level. If needed for clients, N8N + OpenAI webhooks could provide AI content via a lightweight plugin extension without bundling AI into the blocks plugin. Avoid the "AI bloat" trap that Spectra users complain about.

---

### 11. Popup/Conversion Tools

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Popup builder | Spec exists (07-SGS-POPUPS.md) | Pro (Kadence Conversions — popups, banners, slide-ins) | Modal block only | Pro (Overlay Panels — popups, slide-ins, off-canvas) | Full (Popup builder with conditions) |
| Display conditions | In spec | Pro (20+ condition types including WooCommerce cart, referral, URL params, cookies) | None | Pro (Conditional Display — role, device, page) | Full |
| A/B testing | In spec | Pro (Kadence Insights — A/B testing + conversion tracking, $299 plan) | None | None | None |
| Analytics | In spec | Pro (built-in conversion analytics) | None | None | None |
| **Gap assessment** | SGS Pop-ups spec is competitive with Kadence Conversions. GenerateBlocks Pro now has Overlay Panels. |

**Recommendation:** Build SGS Pop-ups plugin as specified. The spec already covers everything Kadence Conversions offers plus A/B testing and more granular analytics. GenerateBlocks' Overlay Panels are more basic (no A/B testing, limited conditions). Priority: after forms.

---

### 12. Form Builder Comparison

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Form builder | Spec exists (04-SGS-FORMS.md) | Full (Advanced Form block — free basic, Pro for integrations) | Full (Form block) | None | Full (Form widget — extensive) |
| Multi-step forms | In spec | None | None | N/A | Full |
| File upload | In spec | Full | Full | N/A | Full |
| Payment integration | In spec (Stripe, Phase 2) | None (use WooCommerce) | None | N/A | Full (PayPal/Stripe buttons) |
| Conditional logic | In spec | None | None | N/A | Full |
| Submission storage (DB) | In spec | Pro (form submission logging) | None | N/A | None (requires third-party) |
| Email integration (Mailchimp etc.) | Via N8N webhooks | Pro (Mailchimp, ActiveCampaign, etc.) | None | N/A | Full (20+ integrations) |
| **Gap assessment** | SGS Forms spec is more comprehensive than Kadence and Spectra forms. Elementor Pro's form builder is the gold standard with conditional logic and 20+ integrations. SGS achieves integration breadth via N8N webhooks. |

**Recommendation:** Build SGS Forms as specified. The N8N webhook approach provides unlimited integration flexibility without bundling dozens of API connectors. Multi-step and payment are USPs over Kadence/Spectra.

---

### 13. WooCommerce Integration

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Product blocks | None | Pro (Product Carousel, Shop Kit $119/yr for full suite) | None (no dedicated WooCommerce blocks) | None | Full (24+ WooCommerce widgets — complete store builder) |
| Cart/checkout customisation | None | Pro (Shop Kit) | None | None | Full (Cart, Checkout, My Account widgets) |
| **Gap assessment** | Elementor has the deepest WooCommerce integration (24+ widgets). Kadence requires Shop Kit add-on. Spectra and GenerateBlocks have no dedicated WooCommerce blocks. |

**Recommendation:** Not planned. No current SGS clients need WooCommerce. If a future client needs e-commerce, evaluate building Product Carousel and basic product blocks, or recommend Kadence Shop Kit / WooCommerce native blocks as a complementary solution.

---

## Competitor Critique Patterns

Research from WordPress.org 1-star reviews, Reddit r/wordpress, and web searches. These are patterns — consistent complaints across multiple users — not isolated incidents.

### Kadence Blocks (4.8 stars on WP.org — 5 one-star reviews out of 322)

**Lowest complaint rate of any competitor.** Pain points:
1. **WPML incompatibility** — multilingual plugin conflicts
2. **Updates breaking sites** — 2 reports of updates causing site breakage
3. **Editor preview errors** — "block has encountered an error and cannot be previewed"
4. **Perceived limitation** — "basic, doesn't let me create freely"
5. **Memory issues** — PHP memory errors when combined with other block plugins (Stackable)

**SGS takeaway:** Kadence's biggest strength is stability — very few complaints. The "basic/limited" perception is worth noting: purpose-built blocks can feel restrictive if they don't offer enough customisation options. Ensure every SGS block has enough design flexibility.

---

### Spectra (4.7 stars on WP.org — 98 one-star reviews out of 1,833)

**Moderate complaint rate (5.3%).** Strong patterns:
1. **V3 UI regression** — "Old version UI was the best, new one is complete mess." Major UX backlash from V3 update
2. **Updates consistently breaking sites** — "Update damages the site but not fixed for 3 months", WSOD reports, front-end breaking daily
3. **Bloated plugin** — explicit "Bloated Plugin" complaint
4. **Aggressive upselling** — "Constantly annoys with the request to switch to Pro version", "Stop asking me for reviews"
5. **Slow editor performance** — "Always Slow to Edit, Pro Version No Better"
6. **AI bloat** — users annoyed by unwanted AI features
7. **Multilingual incompatibility** — Polylang conflicts
8. **Incomplete documentation** — "Tutorials incomplete"
9. **No nestable accordion** — specific feature gap called out
10. **General frustration** — "So frustrating! Don't use it!", "Full of bugs", "Do not use if you don't want to waste your time"

**SGS takeaway:** Spectra's biggest weaknesses are **stability** (updates breaking sites), **bloat** (too many features loaded), **upselling**, and **editor performance**. SGS should:
- Never nag users to upgrade/review
- Never ship an update without thorough testing
- Keep the plugin lightweight (only load what's used)
- Ensure fast editor performance
- Provide complete documentation

---

### GenerateBlocks (not on WP.org — community forums)

**Niche, developer-focused audience.** Pain points from Reddit and forums:
1. **GB 2.0 learning curve** — "might have made the learning curve a little steeper for unseasoned webdesigners"
2. **Limited template library** — fewer patterns than competitors (now 300+ in Pro)
3. **No popup builder** — (now addressed with Overlay Panels in Pro)
4. **Font problems** — "GenerateBlocks is causing a font problem in my block editor"
5. **Compose-everything approach** — no purpose-built blocks means more work for simple tasks
6. **Marketing positioning** — some feel it's overly tied to GeneratePress theme

**SGS takeaway:** GB's "few blocks, compose everything" philosophy creates a steeper learning curve. SGS's purpose-built blocks (Trust Bar, Heritage Strip, etc.) are an advantage for non-technical users. However, GB's performance focus and clean code output set a high bar SGS should match.

---

### Elementor (4.5 stars on WP.org — 646 one-star reviews out of 7,187)

**Highest absolute complaint volume (9.0% one-star).** Strong patterns:
1. **Updates breaking sites** — v3.33.5 was catastrophic: "broke the text editor", "broke many websites", multiple reports in December 2025
2. **Subscription/billing issues** — "Hard to cancel!", "Shady business practices", "Easy to subscribe, hard to get out", subscription cancelled despite auto-renewal
3. **Poor support** — "Abysmal Support", "Frustrating Lack of Support for Critical Developer Issues", "Terrible support and unprofessional treatment"
4. **Performance** — "Elementor = headache", "Elementor consumes your life" (time to build), still perceived as heavy
5. **Price vs value** — "Pro account doesn't feel worth it", "If you want to spend money for nothing", "expensive hijack"
6. **Vendor lock-in** — "Not scalable or clean for serious branding projects", hard to migrate away
7. **In-product advertising** — "Ads" in free version annoying users
8. **Not intuitive** — steep learning curve despite marketing claims

**SGS takeaway:** Elementor's biggest weaknesses are **subscription practices**, **support quality**, **update stability**, and **vendor lock-in**. SGS should:
- Zero licensing cost eliminates pricing complaints entirely
- No subscription or billing — one-time deploy
- No vendor lock-in — standard WordPress blocks, no proprietary format
- Test every update on the live dev site before deploying to clients

---

## Verified Pricing (February 2026)

| Product | Price | Sites | Notes |
|---|---|---|---|
| **Kadence Blocks Pro** | $119/yr | 5 sites | Blocks only. Includes 1,250 AI credits/yr |
| **Kadence Plus Plan** | $169/yr | 10 sites | Blocks Pro + Theme Kit Pro + Conversions + CAPTCHA + 4,000 AI credits |
| **Kadence Ultimate** | $299/yr | 25 sites | All products + A/B testing + Pattern Hub + Child Theme Builder + 8,000 AI credits |
| **Spectra Pro** | ~$49-199/yr | Varies | Essential Toolkit available; Business Toolkit "coming soon" |
| **GenerateBlocks Pro** | $99/yr | 500 sites | Blocks only |
| **GeneratePress One** | $149/yr | 500 sites | GP Premium + GB Pro + GenerateCloud bundle |
| **Elementor Pro** | $59-399/yr | 1-1,000 sites | Most features require Pro |
| **SGS Blocks** | $0 | Unlimited | No licensing, no subscription, no per-site fees |

---

## Priority Gap Summary

### High Priority (address in next build phases)

| Gap | Blocks Affected | Effort | Impact |
|---|---|---|---|
| FAQ Schema markup | Accordion | Small | High (SEO) |
| Review Schema markup | Testimonial, Testimonial Slider | Small | High (SEO) |
| Info Box: image support, box link, icon position | Info Box | Medium | High (feature parity) |
| Icon List: icon size, dividers, per-item links | Icon List | Small | Medium (feature parity) |
| Accordion: custom open/close icons | Accordion | Small | Medium (customisation) |
| Tabs: vertical layout, icons, anchor links | Tabs | Medium | Medium (feature parity) |
| Role-based visibility extension | All blocks | Medium | High (client sites need this) |
| Second CTA button | Hero, CTA Section | Small | Medium (common pattern) |
| **Table of Contents block** | New block | Medium | High (3 of 4 competitors have it) |
| **Post Grid / Query Loop** | New block or Card Grid extension | Large | High (all 4 competitors have it) |
| **Image Gallery with lightbox** | New block | Medium | High (3 of 4 competitors have it) |

### Medium Priority (Phase 2)

| Gap | Scope | Effort | Impact |
|---|---|---|---|
| Global defaults system ("save as default") | Plugin-wide | Medium | High (usability) |
| Custom CSS per block | Extension | Small | Medium (power users) |
| Process Steps: vertical layout + connector lines | Process Steps | Small | Medium (mobile) |
| Notice Banner: dismissible | Notice Banner | Small | Low-Medium |
| Card Grid: query mode (pull from posts) | Card Grid | Medium | Medium |
| Block pattern library (20-30 section patterns) | Plugin-wide | Large | High (onboarding) |
| Standalone Star Rating block | New block | Small | Medium (reuse Testimonial component) |
| Content Timeline block | New block | Medium | Medium (Indus Foods heritage) |
| Team Member block | New block | Medium | Medium (company pages) |

### Low Priority (defer)

| Gap | Reason |
|---|---|
| Shape dividers on Container | Standard feature but can use CSS clip-path workaround |
| Background video on Container/Hero | Heavy, rarely justified by performance cost |
| Dynamic content / data binding | Not needed for current brochure site clients |
| AI content generation | Avoid "AI bloat"; use N8N+OpenAI if needed |
| WooCommerce blocks | No current e-commerce clients |
| Import/export system | WP reusable blocks handle cross-page, WP-CLI handles cross-site |
| Counter: icon above number | Trust Bar already covers icon+number pattern |
| 40+ entrance animations (Elementor parity) | Most are variations; 15 types cover 99% of use cases |
| General-purpose slider | Testimonial Slider + Brand Strip cover key use cases |

---

## Overall Assessment

**SGS blocks are feature-competitive with Kadence and Spectra for the block types that exist.** The per-element customisation standard (colour, size controls on every text element) matches the depth that Kadence and Spectra offer. GenerateBlocks has evolved significantly with Pro features (Overlay Panels, Navigation, Mega Menu, Accordion, Tabs) but remains deliberately minimal in block count.

**SGS beats all competitors on:**
1. **Purpose-built blocks** — Trust Bar, Heritage Strip, Brand Strip, WhatsApp CTA, Certification Bar, Announcement Bar, Google Reviews, Mega Menu, Decorative Image have no direct equivalents
2. **Performance** — < 100KB CSS + < 50KB JS budget vs Elementor's heavier baseline
3. **Interactivity API** — modern, WordPress-native interactive blocks vs jQuery-dependent competitors
4. **Accessibility** — WCAG 2.2 AA as non-negotiable vs competitors' inconsistent compliance
5. **Zero licensing** — no per-site fees vs $59-399/year for competitors
6. **No vendor lock-in** — standard WordPress block markup, no proprietary format
7. **No upselling/nagging** — clean admin experience vs Spectra/Elementor's aggressive promotion

**Key weaknesses vs competitors:**
1. **Missing block types** — Table of Contents, Post Grid/Query Loop, and Image Gallery are expected by 3+ competitors
2. **No dynamic content** — all competitors offer some form of custom field / dynamic data binding
3. **Zero patterns** — Kadence has 800+, competitors average 100-300
4. **No SEO schema** — FAQ and Review schema on Accordion and Testimonial blocks (Kadence, Spectra, Elementor offer this)
5. **No global defaults** — Kadence offers this for free; it's a significant usability feature

**Strategic differentiation based on competitor critiques:**
- Spectra users hate: instability, bloat, upselling, slow editor — SGS should be stable, lightweight, silent
- Elementor users hate: subscriptions, lock-in, poor support, broken updates — SGS has zero cost, zero lock-in
- GenerateBlocks users struggle with: learning curve, "compose everything" — SGS purpose-built blocks are simpler
- Kadence has very few complaints — it sets the quality standard SGS should aim for
