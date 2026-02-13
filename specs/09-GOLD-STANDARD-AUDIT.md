# Gold Standard Audit — SGS Blocks vs Competitors

## Overview

Per-block comparison of the 25 SGS blocks against their closest equivalents in Kadence Blocks Pro ($119-299/yr), Spectra Pro ($69-249/yr), GenerateBlocks Pro ($79/yr), and Elementor Pro ($59-399/yr). Followed by cross-cutting concerns audit.

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
| CSS Grid layout | Full | Full | Full | Full | Partial (basic) |
| Stack (vertical) layout | Full | Full | Full | Full | Full |
| Background image/gradient | Full (via supports) | Full | Full | Full | Full |
| Background video | None | None | None | None | Full |
| Shape dividers | None | None | None | Pro | Full (15+ shapes) |
| Per-breakpoint padding/margin | Full | Full | Full | Full | Full |
| Inner content width control | Full | Full | Full | Full | Full |
| Min/max height | Full | Full | Full | Full | Full |
| Overflow control | Full | Full | Full | Full | Full |
| Sticky positioning | None | Pro (Hooked Elements) | None | None | Pro |
| **Performance** | Dynamic render.php, zero JS | Zero JS | Zero JS | Zero JS | 40KB+ base CSS |
| **Gap** | Shape dividers, background video, sticky positioning |

**Recommendation:** Add shape dividers as an optional extension (SVG clip-path, < 1KB CSS). Background video is heavy and rarely used — defer. Sticky positioning can be a CSS utility class rather than a block feature.

---

### 2. Hero (`sgs/hero`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Full-width with background image | Full | Full (via Container) | Full (via Container) | Full (via Container) | Full |
| Video background | None | None | None | None | Full |
| Headline customisation (colour, size) | Full | Full | Full | Full | Full |
| Sub-headline customisation | Full | Full | Full | Full | Full |
| CTA button (text + bg colour) | Full | Full | Full | Partial | Full |
| Multiple CTA buttons | None (1 CTA) | Full (Buttons block) | Full | Full | Full |
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
| Icon + heading + description | Full | Full | Full | N/A (compose manually) | Full |
| Icon colour + background | Full | Full | Full | N/A | Full |
| Heading colour + size | Full | Full | Full | N/A | Full |
| Description colour | Full | Full | Full | N/A | Full |
| Image instead of icon | None | Full | Full | N/A | Full |
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
| Animated number counting | Full | None (no native counter) | Full | None | Full |
| Prefix/suffix text | Full | N/A | Full | N/A | Full |
| Decimal support | Full | N/A | Full | N/A | Full |
| Duration control | Full | N/A | Full | N/A | Full |
| Number colour | Full | N/A | Full | N/A | Full |
| Label colour + size | Full | N/A | Full | N/A | Full |
| Thousands separator | Full | N/A | Full | N/A | Full |
| Icon/image above number | None | N/A | None | N/A | Full |
| **Performance** | 839B viewScriptModule | N/A | ~5KB | N/A | 40KB+ base |
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
| Grid of image+content cards | Full | Partial (Post Grid) | Partial (Post Grid) | Query Loop | Full (Posts widget) |
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
| Slider/carousel | Full | None (single only) | None | N/A | Full (Carousel widget) |
| Star rating display | Full | Full | Full | N/A | Full |
| Quote text customisation | Full (colour) | Full | Full | N/A | Full |
| Name + role customisation | Full (colour + size) | Full | Full | N/A | Full |
| Avatar/photo | Full | Full | Full | N/A | Full |
| Slider autoplay | Full | N/A | N/A | N/A | Full |
| Slider dots/arrows | Full | N/A | N/A | N/A | Full |
| Schema markup (Review) | None | None | Full (Review block) | N/A | None |
| **Performance** | 1.63KB viewScriptModule | Zero JS | Zero JS | N/A | 40KB+ |
| **Gap** | Schema markup for reviews/testimonials |

**Recommendation:** Add optional `schema.org/Review` JSON-LD output when testimonials include star ratings. This is an SEO win that Spectra offers.

---

### 10. CTA Section (`sgs/cta-section`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Headline + body + button | Full | N/A (compose manually) | Full | N/A | Full |
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
| Expandable sections | Full | Full | Full | N/A | Full |
| FAQ Schema markup | None | Full | Full | N/A | Full |
| Allow multiple open | Full | Full | Full | N/A | Full |
| Custom icon (open/close) | None | Full | Full | N/A | Full |
| Nested accordions | None | None | None | N/A | Full |
| Title typography control | Full | Full | Full | N/A | Full |
| Content area (inner blocks) | Full | Full | Full | N/A | Full |
| Initial open item | Full | Full | Full | N/A | Full |
| **Gap** | FAQ Schema markup, custom open/close icons |

**Recommendation:** Add FAQ Schema (`schema.org/FAQPage`) JSON-LD output — critical for SEO. Add `openIcon` and `closeIcon` attributes (chevron, plus/minus, arrow). Both Kadence and Spectra offer these.

---

### 13. Tabs (`sgs/tabs`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Tabbed content panels | Full | Full | Full | N/A | Full |
| Horizontal tabs | Full | Full | Full | N/A | Full |
| Vertical tabs | None | Full | Full | N/A | Full |
| Tab icon | None | Full | Full | N/A | Full |
| Tab alignment | Full | Full | Full | N/A | Full |
| Initial active tab | Full | Full | Full | N/A | Full |
| Tab content (inner blocks) | Full | Full | Full | N/A | Full |
| Anchor links to tabs | None | Full | Full | N/A | Full |
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
| Top-of-page banner | Full | Pro (Kadence Conversions) | None | None | Popup workaround |
| Countdown timer | Full | Pro | N/A | N/A | Pro (Countdown widget) |
| Message rotation | Full | None | N/A | N/A | None |
| Scheduling (date range) | Full | Pro | N/A | N/A | Pro (Popup conditions) |
| Dismissible (session/persistent) | Full | Pro | N/A | N/A | None |
| CTA button | Full | Pro | N/A | N/A | Pro |
| Interactivity API | Full | N/A | N/A | N/A | jQuery-based |
| **Performance** | viewScriptModule, zero CLS | Unknown | N/A | N/A | Heavy |

**Recommendation:** No gaps. SGS already matches or exceeds Kadence Conversions (which requires the $169+ plan).

---

### 19. SVG Background (`sgs/svg-background`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| SVG animation container | Stub only | None | None | None | None |
| Custom SVG content | Planned | N/A | N/A | N/A | N/A |
| Animation types | Planned | N/A | N/A | N/A | N/A |

**Recommendation:** Low priority. No competitor offers this natively. Build when a client project needs it.

---

### 20. Pricing Table (`sgs/pricing-table`)

| Feature | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Plan comparison table | Stub only | None | Full (Price List) | N/A | Full |
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
| Lightbox/modal overlay | Stub only | Pro | Full | None | Full (Popup) |
| Inner blocks content | Planned | Pro | Full | N/A | Full |
| Trigger (button click) | Planned | Pro | Full | N/A | Full |
| Trigger (image click) | Planned | Pro | Full | N/A | Full |
| Trigger (text/link click) | Planned | Pro | Full | N/A | Full |
| Close on overlay click | Planned | Pro | Full | N/A | Full |
| Close on Escape | Planned | Pro | Full | N/A | Full |
| Animation | Planned | Pro | Full | N/A | Full |
| Focus trapping | Planned | Unknown | Unknown | N/A | Unknown |

**Recommendation:** When built, ensure WCAG-compliant focus trapping and Escape key handling — areas where competitors are often weak. Use SGS Pop-ups plugin for advanced popup needs; this block is for simple inline modals.

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
| Multi-column dropdowns | Full | None | None | None | Pro |
| Template part content areas | Full | N/A | N/A | N/A | Custom content areas |
| Full keyboard navigation | Full | N/A | N/A | N/A | Partial |
| ARIA menubar pattern | Full | N/A | N/A | N/A | Partial |
| Mobile accordion fallback | Full | N/A | N/A | N/A | Full |
| Interactivity API | Full | N/A | N/A | N/A | jQuery |

**Recommendation:** No gaps. Most block plugin ecosystems have no native mega menu. Elementor Pro's version is heavy and has known WCAG issues.

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

## Cross-Cutting Concerns Audit

### 1. Global Defaults System

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Set default styles for all instances of a block | None | Pro (Global Linked Colours) | Full (Global Block Style extension) | Pro (Global Styles) | Full (Global Fonts, Colours, Widget defaults) |
| **Gap assessment** | SGS has no global defaults beyond theme.json tokens. Competitors allow "save this block's settings as default for all new instances." |

**Recommendation:** Phase 2 feature. Implement a "Save as default" action in the block toolbar that stores block attribute defaults in a `sgs_block_defaults` option. When a new block is inserted, merge saved defaults with the block's default attributes. This is a major usability win for site builders who want consistent styling without patterns.

---

### 2. Copy/Paste Styles

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Copy styles from one block, paste to another | None | None | None | None | Full (Right-click → Copy/Paste Style) |

**Recommendation:** This is an Elementor exclusive. WordPress core has no equivalent. Building this would require a custom clipboard mechanism (store styles in sessionStorage, paste via block toolbar action). Nice-to-have, low priority — the block supports system and theme.json tokens already ensure consistency.

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
| Pre-built patterns/templates | None | 800+ (Pro) | 100+ templates | 30+ patterns | 300+ templates |
| Pattern categories | N/A | Full | Full | Basic | Full |
| One-click import | N/A | Full | Full | Full | Full |
| **Gap assessment** | SGS has zero pre-built patterns. Competitors use patterns as a major selling point and onboarding tool. |

**Recommendation:** Phase 2 feature. Create 20-30 section patterns (hero variations, testimonial layouts, CTA sections, feature grids) using SGS blocks. Register as WordPress block patterns with categories. These serve as "starting points" for site builders and demonstrate block capabilities. Not a build priority — blocks themselves must work first.

---

### 5. Import/Export System

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Export block settings | None | Pro (Pattern Hub) | None | None | Full (JSON export) |
| Import block settings | None | Pro (Pattern Hub) | None | None | Full (JSON import) |
| Cross-site sharing | None | Pro (Cloud library) | None | None | Pro (Template Cloud) |
| **Gap assessment** | Most block plugins don't have this either. Kadence and Elementor are the exceptions. WordPress core's pattern system and reusable blocks partially address this. |

**Recommendation:** Low priority. WordPress reusable blocks and pattern system handle cross-page sharing. Cross-site sharing can use the `wp block-patterns` WP-CLI export. A dedicated import/export UI is unnecessary at this stage.

---

### 6. Role-Based Block Visibility

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Show/hide blocks by user role | None | Pro (Kadence Conversions) | Full (Display Conditions extension) | None | Full (Conditions) |
| Show/hide by login state | None | Pro | Full | None | Full |
| Show/hide by date/time | None | Pro | Full | None | Full |
| Show/hide by URL parameter | None | None | None | None | Full |
| **Gap assessment** | SGS currently has device-based visibility (hideOnMobile/Tablet/Desktop) but no role/login/schedule visibility. Spectra's Display Conditions extension is comprehensive. |

**Recommendation:** Extend the existing Visibility Extension to add: `hideWhenLoggedIn`, `hideWhenLoggedOut`, `hideForRoles` (array), `showAfterDate`, `showBeforeDate`. These are server-side checks in render.php — zero frontend cost. Important for client sites that show different content to members vs visitors.

---

### 7. Animation/Motion Library Depth

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Entrance animations | 15 types | 12 types | ~10 types | None | 40+ types |
| Hover effects | 7 types | Basic (colour change) | Basic | None | 15+ types |
| Scroll-linked effects | CSS Scroll-Driven + fallback | None | None | None | Full (parallax, horizontal scroll, mouse effects) |
| Mouse tracking effects | 1 (3D tilt) | None | None | None | Full (mouse track, 3D tilt, track image) |
| Stagger/sequence | Full | None | None | None | Full |
| Reduced motion respect | Full (non-negotiable) | Basic | Basic | N/A | Partial |
| **Gap assessment** | SGS entrance animations (15) are adequate vs Kadence (12) and Spectra (~10). Elementor's 40+ are mostly duplicates/variations. SGS's scroll-linked effects (CSS Scroll-Driven Animations) are more modern than Elementor's JS-heavy parallax. The 3D tilt covers the most popular mouse effect. |

**Recommendation:** No urgent gaps. The animation spec already exceeds Kadence and Spectra. Elementor's quantity advantage is mostly vanity — many effects are minor variations. Focus on polish and performance over adding more animation types.

---

### 8. Custom CSS Per Block

| Concern | SGS | Kadence | Spectra | GenerateBlocks | Elementor Pro |
|---|---|---|---|---|---|
| Custom CSS field per block | None | Pro (Custom CSS) | None | None | Full (per-widget CSS) |
| CSS class field | Full (WP core) | Full | Full | Full | Full |
| **Gap assessment** | WordPress core's Additional CSS Classes field is available on every block. A dedicated Custom CSS textarea per block is a power-user feature. Kadence Pro and Elementor Pro offer it. |

**Recommendation:** Add a "Custom CSS" textarea to the block extensions sidebar (the same sidebar that has animation and visibility controls). The CSS is scoped to the block's unique wrapper class. Output via `wp_add_inline_style()`. This is < 50 lines of code and provides significant design flexibility for edge cases. Medium priority.

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

### Medium Priority (Phase 2)

| Gap | Scope | Effort | Impact |
|---|---|---|---|
| Global defaults system ("save as default") | Plugin-wide | Medium | High (usability) |
| Custom CSS per block | Extension | Small | Medium (power users) |
| Process Steps: vertical layout + connector lines | Process Steps | Small | Medium (mobile) |
| Notice Banner: dismissible | Notice Banner | Small | Low-Medium |
| Card Grid: query mode (pull from posts) | Card Grid | Medium | Medium |
| Block pattern library (20-30 section patterns) | Plugin-wide | Large | High (onboarding) |

### Low Priority (defer)

| Gap | Reason |
|---|---|
| Shape dividers on Container | Rarely used, CSS workaround exists |
| Background video on Container/Hero | Heavy, rarely justified by performance cost |
| Copy/paste styles | Elementor exclusive, WP has no equivalent pattern |
| Import/export system | WP reusable blocks handle cross-page, WP-CLI handles cross-site |
| Counter: icon above number | Trust Bar already covers icon+number pattern |
| 40+ entrance animations (Elementor parity) | Most are variations; 15 types cover 99% of use cases |

---

## Overall Assessment

**SGS blocks are feature-competitive with Kadence and Spectra for the block types that exist.** The per-element customisation standard (colour, size controls on every text element) matches the depth that Kadence and Spectra offer. GenerateBlocks is deliberately minimal and not a useful comparison target.

**SGS beats all competitors on:**
1. **Purpose-built blocks** — Trust Bar, Heritage Strip, Brand Strip, WhatsApp CTA, Certification Bar, Announcement Bar, Google Reviews, Mega Menu, Decorative Image have no direct equivalents
2. **Performance** — < 100KB CSS + < 50KB JS budget vs Elementor's 200-400KB baseline
3. **Interactivity API** — modern, WordPress-native interactive blocks vs jQuery-dependent competitors
4. **Accessibility** — WCAG 2.2 AA as non-negotiable vs competitors' inconsistent compliance
5. **Zero licensing** — no per-site fees vs $59-399/year for competitors

**Key areas to address:**
1. **SEO schema markup** — FAQ and Review schema on Accordion and Testimonial blocks (Kadence and Spectra offer this)
2. **Info Box feature parity** — image support, full-box link, icon positioning (standard in Kadence/Spectra)
3. **Role-based visibility** — important for client sites, offered by Spectra and Kadence Pro
4. **Block patterns** — zero patterns is a notable gap; even 20-30 section patterns would significantly improve onboarding
