# Deep Competitor Research — SGS WordPress Framework

> **Date:** 2026-02-21
> **Purpose:** Comprehensive competitive analysis to inform SGS Framework build priorities.
> **Related:** `09-GOLD-STANDARD-AUDIT.md` contains per-block feature parity tables.

---

## 1. Kadence Theme + Kadence Blocks

**Developer:** StellarWP (The Events Calendar parent company)
**Pricing:** Blocks Pro $119/yr (5 sites), Plus $169/yr (10 sites), Ultimate $299/yr (25 sites), Lifetime $899 one-time
**Active Installs:** 400,000+ (blocks plugin), 300,000+ (theme)
**WP.org Rating:** 4.9/5 (blocks), 5/5 (theme)

### A. Feature Inventory

**Complete Block List (Free):**
1. Accordion
2. Advanced Button
3. Advanced Form (basic)
4. Advanced Gallery
5. Advanced Text (heading + paragraph)
6. Countdown
7. Count Up
8. Info Box
9. Icon
10. Icon List
11. Lottie Animation
12. Posts
13. Progress Bar
14. Row Layout
15. Section
16. Show More
17. Spacer / Divider
18. Table of Contents
19. Tabs
20. Testimonials
21. Off Canvas / Off Canvas Trigger

**Form Field Blocks (13):** Date, Text, Hidden, Radio, Select, Email, Textarea, Number, File, Accept, Checkbox, Telephone, Time

**Pro-Only Blocks:**
- Advanced Query Loop
- Advanced Slider
- Image Overlay
- Modal
- Post Grid/Carousel
- Product Carousel (WooCommerce)
- Repeater
- Split Content
- Video Popup
- Marquee (October 2025)
- Table (December 2024)

**Header/Footer Builder:**
- Advanced Header Block (free) for Full Site Editing
- Sticky headers (responsive per device)
- Transparent headers (toggle per page)
- Conditional headers (Pro, Theme Kit) -- different headers per page/post/archive
- Mega menu with multi-column dropdowns (Pro, Advanced Navigation)
- Off-canvas mobile menu with full inner block content
- Desktop and tablet/mobile separate build tabs
- Pre-made header templates (basic, multi-row, with search, with CTA)

**Typography Controls:**
- Global Typography via theme customiser (H1-H6, body, buttons, site title, navigation)
- Per-block typography in Advanced Text (font family, weight, size, line height, letter spacing, transform, decoration)
- Per-element typography on blocks like Info Box (heading, description separately)
- Font clamp settings (fluid typography) since November 2025
- Google Fonts + custom font upload

**Colour Controls:**
- 9-colour global palette (4 groups: base, accent, contrast, notices)
- Extended palette option for additional colours
- Per-block colour pickers with palette integration
- Gradient support on backgrounds
- No CSS custom colour picker per se -- uses palette variables

**Spacing Controls:**
- Per-breakpoint padding and margin on all layout blocks
- Gap controls on flex/grid containers
- Responsive spacer/divider with height per breakpoint

**Layout Features:**
- Row Layout with nested sections (columns)
- Flexbox and CSS Grid support
- Responsive column count per breakpoint
- Content width and inner container width controls
- Min/max height with viewport units

**Design Library / Templates:**
- 800+ design library patterns (Pro, AI-generated)
- AI-powered starter site generation
- Pattern Hub (Ultimate plan) for cross-site sharing
- Categories: headers, footers, heroes, testimonials, CTAs, pricing, team, features, etc.

**Dynamic Content (Pro):**
- Custom field integration (ACF, Pods, Meta Box)
- Post meta, user meta, site options
- Dynamic backgrounds from custom fields
- Dynamic text (title, date, author, custom fields)
- Repeat/query for ACF repeater fields

**Conditional Visibility (Pro):**
- Show/hide by user role
- Show/hide by login state
- Show/hide by date/time schedule (range + recurring)
- Show/hide by URL parameter
- Show/hide by referral domain
- Show/hide by device type
- Show/hide by WooCommerce cart contents/total/weight
- Multiple conditions combinable (AND/OR)

**Animation/Interactions (Pro):**
- Animate on Scroll (~12 types)
- Duration, ease, delay controls
- Pixel offset for trigger point
- Show once per page option

**Performance Features:**
- Modular loading (only load CSS/JS for used blocks)
- No jQuery dependency
- < 50KB theme weight on fresh install
- 99+ PageSpeed scores on mobile consistently
- Performance Optimiser plugin (part of Plus plan)

**WooCommerce (via Shop Kit -- separate $119/yr or bundled):**
- Product Carousel block
- Variation swatches (colour, image, radio)
- Custom checkout fields manager
- Cart messages (conditional)
- Email template customisation
- Product gallery per variation

**Form Builder (Free basic, Pro for integrations):**
- 13 field types (see above)
- File upload
- Form submission logging (Pro)
- Email integrations: Mailchimp, ActiveCampaign, etc. (Pro)
- No multi-step forms
- No conditional logic
- No payment integration

**Popup/Modal (Pro -- Kadence Conversions):**
- Popup, banner, slide-in types
- 20+ display conditions
- A/B testing (Ultimate plan, Kadence Insights)
- Conversion analytics
- Date/time scheduling

### B. Customisation Depth

**Per-element granularity:** High. Kadence Info Box lets you independently control icon colour/size, heading colour/size/font, description colour/size. Advanced Text has full typography controls. Testimonials allow quote text colour, name/role colours independently.

**CSS properties from editor (no custom CSS needed):**
- Colours (text, background, border, gradient)
- Typography (family, weight, size, line height, spacing, transform, decoration)
- Spacing (padding, margin, gap -- all per-breakpoint)
- Borders (width, style, colour, radius -- per side)
- Box shadow (offset, blur, spread, colour)
- Opacity
- Overflow
- Min/max width/height

**Responsive controls:** 3 breakpoints (Desktop 1024+, Tablet 768-1024, Mobile <768). Fixed breakpoints -- users cannot customise breakpoint values (frequently requested feature). Most spacing, typography, and layout properties have per-breakpoint toggles.

**Global styles / design system:**
- 9-colour global palette with variable names
- Global typography scale (H1-H6, body, buttons)
- Global button styles (primary, secondary, outline)
- Style Guide panel in customiser
- "Configurable Defaults" (free) -- save default styles for any block type

### C. Bad Reviews and Complaints

**WordPress.org (4.9 stars, 5 one-star out of 322 reviews):**

1. "For Us, Major Disappointments" -- sizing options buggy, clicking won't activate, measurement units can't be changed, values won't stick. Pagination in Posts Grid Carousel unstylable. Mega menu doesn't work with dynamic menus.

2. "Basic, doesn't let me create freely" -- user felt constrained by purpose-built block approach.

3. Updates breaking sites -- two reports of updates causing WSOD or broken layouts, particularly during the 3.0/3.1 release cycle which coincided with WordPress 6.3 changes. Kadence pushed 10 fix updates (Blocks Pro) and 12 fix updates (Blocks Free) to resolve.

4. WPML incompatibility -- multilingual plugin conflicts.

5. PHP memory errors when combined with other block plugins (Stackable).

**Trustpilot (5/5 stars, 666 reviews):**
Overwhelmingly positive. Minimal complaints. Support praised repeatedly.

**General review sites:**
- Block spacing issues -- paragraphs stick to Kadence blocks without manual margin
- Support process changed September 2025 -- multiple questions required before ticket submission, some users unhappy
- Limited free templates compared to Divi/Elementor library
- Lifetime plan pricing concerns ($899)

**Reddit/Forums:**
- Documentation for advanced features could be more comprehensive
- Users from Divi/Elementor find the transition difficult (Gutenberg learning curve, not Kadence-specific)
- Caching/optimisation plugin conflicts breaking styles

### D. What They Do Poorly

1. **Fixed responsive breakpoints** -- users cannot customise breakpoint values. Desktop/Tablet/Mobile only. No landscape tablet, no laptop. Most-requested feature on their feedback board.

2. **Learning curve for non-Gutenberg users** -- users migrating from Divi/Elementor struggle with the block editor paradigm, not specifically Kadence's fault but they don't solve it either.

3. **Block spacing defaults** -- paragraph blocks adjacent to Kadence blocks have inconsistent spacing. Requires manual margin adjustment.

4. **Mega menu limitations** -- doesn't work well with dynamic/programmatic menus. Pro-only feature.

5. **Pricing complexity** -- four plans changed in February 2025. Previously simpler. Lifetime plan now has site limits (25 or 1,000).

6. **AI feature creep** -- AI credits bundled into plans, adding cost for users who don't want AI.

### E. Opportunities for SGS

- **Customisable breakpoints** -- SGS could allow users to define their own breakpoint values via theme.json or a settings panel. Nobody offers this.
- **Zero pricing complexity** -- SGS is free. No plans, no tiers, no site limits.
- **Better block spacing defaults** -- ensure consistent spacing between SGS blocks and core blocks out of the box.
- **Mega menu that works with any menu source** -- template parts, classic menus, programmatic menus.
- **No AI bloat** -- keep the plugin focused on blocks, not AI services.

---

## 2. Spectra (formerly Ultimate Addons for Gutenberg)

**Developer:** Brainstorm Force (also makes Astra theme)
**Pricing:** Free, Pro $49/yr (1 site), $69/yr (3 sites), $89/yr (1,000 sites), Lifetime $209 (1 site)
**Active Installs:** 1,000,000+
**WP.org Rating:** 4.7/5 (98 one-star reviews out of 1,833 -- 5.3% complaint rate)

### A. Feature Inventory

**Complete Block List (Free -- ~40 blocks):**

*Content Blocks:*
1. Container
2. Heading
3. Image
4. Icon
5. Buttons
6. Info Box
7. Call To Action
8. Countdown
9. Star Ratings
10. Marketing Button
11. Icon List
12. Image Gallery
13. Lottie Animations

*Slider/Timeline Blocks:*
14. Sliders
15. Content Timelines
16. Post Timeline

*Utility Blocks:*
17. Google Maps
18. Inline Notices
19. Tabs
20. Taxonomy Lists
21. Price Lists

*Post Blocks:*
22. Counter
23. Modal Popup
24. Post Carousel
25. Post Grid

*Social Blocks:*
26. Instagram Feed
27. Blockquote
28. Social Share
29. Team
30. Testimonials

*Form Blocks:*
31. Contact Form
32. Newsletter Signup
33. Suggestion Form

*SEO Blocks:*
34. FAQ (with schema)
35. How-To (with schema)
36. Review (with schema)
37. Table of Contents

**Pro-Only Blocks:**
- Loop Builder
- User Registration Form
- User Login Form
- Advanced design controls on all blocks

**Header/Footer Builder:**
- No dedicated header builder in Spectra itself
- Relies on Astra theme's header/footer builder
- Astra offers: sticky header, transparent header, mega menu (Pro), mobile header customisation
- Less independent than Kadence's approach (tight coupling to Astra)

**Typography Controls:**
- Global typography via Spectra settings dashboard
- Per-block typography (font family, weight, size, line height, letter spacing)
- Responsive font sizes per breakpoint
- Google Fonts integration

**Colour Controls:**
- Global colour palette (inherits from theme + custom)
- Per-block colour controls
- Gradient backgrounds
- Copy/paste styling between blocks

**Spacing Controls:**
- Per-breakpoint padding/margin on containers
- Gap controls
- Global spacing presets

**Layout Features:**
- Container block with flexbox
- Responsive column layouts
- Content width controls
- Full-width and boxed layout options

**Design Library / Templates:**
- 100+ templates via Starter Templates plugin (separate install)
- Full site imports and individual page imports
- Categories by industry
- No AI-generated templates

**Dynamic Content (Pro):**
- Custom field integration (ACF, Pods, WooCommerce)
- Post meta display
- Dynamic backgrounds from custom fields
- Loop Builder for custom post type layouts

**Conditional Visibility:**
- Device-based visibility (desktop/tablet/mobile)
- Display conditions extension (Pro)
- No role-based or schedule-based visibility in Spectra itself

**Animation/Interactions:**
- Scroll-based entrance animations (~10 types)
- Duration, delay controls
- Pro version adds advanced control (ease, smoothness)
- No hover effects beyond basic colour changes
- No scroll-linked parallax

**Performance Features:**
- Switched to Flexbox CSS in 2.0 (leaner code output)
- Asset regeneration system (CSS/JS)
- Conditional block loading

**WooCommerce:**
- No dedicated WooCommerce blocks in Spectra
- WooCommerce compatibility via Astra theme
- Loop Builder (Pro) can query products

**Form Builder (Free):**
- Contact form, newsletter signup, suggestion form blocks
- Basic field types
- reCAPTCHA support
- No file upload
- No conditional logic
- No multi-step
- No payment integration
- No submission storage

**Popup Builder (Free):**
- Modal block
- Click, hover, timed, scroll %, exit intent triggers
- Display rules (page-level)
- Custom design with any block content
- No A/B testing
- No conversion analytics

### B. Customisation Depth

**Per-element granularity:** Moderate. Info Box has icon/heading/description colour controls. Star Ratings have individual element styling. But generally less granular than Kadence -- fewer typography options per sub-element.

**CSS properties from editor:**
- Colours (text, background, border, gradient)
- Typography (family, weight, size, line height, spacing)
- Spacing (padding, margin)
- Borders (basic)
- Box shadow (basic)
- Custom CSS textarea (Pro)

**Responsive controls:** 3 breakpoints (Desktop/Tablet/Mobile). Per-breakpoint on most spacing and typography properties. Not every property is responsive.

**Global styles / design system:**
- Global Block Style extension
- Copy/paste styles between blocks
- Inherits from Astra theme's global settings

### C. Bad Reviews and Complaints

**WordPress.org (4.7 stars, 98 one-star reviews -- 5.3% rate):**

1. **V3 UI regression:** "Old version UI was the best, new one is complete mess." Major backlash from the V3 redesign. Multiple users reported the new interface being harder to use than V2.

2. **Updates consistently breaking sites:** "Update damages the site but not fixed for 3 months." Multiple WSOD reports. Front-end layouts breaking after updates. Quote: "So frustrating! Don't use it!"

3. **"Bloated Plugin":** Explicit complaint about unnecessary features being loaded. Combined with slow editor performance: "Always Slow to Edit, Pro Version No Better."

4. **Aggressive upselling:** "Constantly annoys with the request to switch to Pro version." "Stop asking me for reviews." In-plugin advertising for Astra, Starter Templates, and Pro upgrade.

5. **Slow editor performance:** "Abysmally slow performance... every action, whether adding or editing content, felt like wading through molasses." Backend slows significantly with long articles.

6. **AI bloat:** Users annoyed by AI features they didn't ask for being added to the plugin.

7. **Multilingual incompatibility:** Polylang/WPML conflicts.

8. **Incomplete documentation:** "Tutorials incomplete." Many simple tasks from other builders can't be figured out without hours of searching.

9. **CSS/JS regeneration required:** "Occasional need to frequently regenerate CSS and JavaScript assets for optimal performance" -- brittle workflow.

10. **Database bloat:** "Database size increases significantly, impacting loading speed."

**Comparison reviews:**
- "Spectra sucks quite fast as soon as you lift the curtain"
- "Broke while in use, support unable to fix issues for a month"

### D. What They Do Poorly

1. **Stability** -- the single biggest issue. Updates regularly break sites. The V3 migration was particularly painful. Users report 3+ month wait times for critical bug fixes.

2. **Editor performance** -- backend editing is noticeably slow, especially on longer pages. Database bloat compounds this over time.

3. **Aggressive monetisation** -- upsell nags, review requests, and cross-promotion of Astra products create a poor user experience in the free version.

4. **Astra dependency** -- tight coupling to Astra theme. Header/footer building requires Astra. Starter Templates are Astra-optimised. Less useful with other themes.

5. **CSS/JS regeneration** -- users must manually regenerate assets after changes. This is a fragile workflow that causes confusion.

6. **Documentation gaps** -- common tasks are undocumented or poorly explained. Users report spending hours on things that should be simple.

7. **Accessibility** -- Equalize Digital's 2025 report found significant failures in keyboard functionality, form field labelling, and other issues. Scored in the mid-range, well below Kadence.

8. **No FAQ schema on the FAQ block** -- the FAQ block exists but the schema implementation is handled separately, creating confusion.

### E. Opportunities for SGS

- **Stability as a feature** -- never ship a breaking update. Test on live dev site before every deploy.
- **Zero upselling** -- no nags, no review requests, no cross-promotion. Clean admin experience.
- **Theme-independent** -- SGS Blocks work with any theme, not just SGS Theme.
- **Inline asset generation** -- no manual CSS/JS regeneration needed. Dynamic render.php handles this.
- **Accessible by default** -- WCAG 2.2 AA on every block, not as an afterthought.
- **Complete documentation** -- every block, every control, every use case documented before shipping.

---

## 3. GeneratePress + GenerateBlocks

**Developer:** Tom Usborne (solo developer, Edge22 Studios)
**Pricing:** GenerateBlocks Pro $99/yr (500 sites), GeneratePress Premium $59/yr (500 sites), GP One bundle $149/yr
**Active Installs:** 80,000+ (GenerateBlocks), 400,000+ (GeneratePress)
**WP.org Rating:** 5/5 (GenerateBlocks), 5/5 (GeneratePress)

### A. Feature Inventory

**Core Blocks (Free -- 6 blocks):**
1. Container
2. Grid
3. Headline
4. Button
5. Image
6. Query Loop

**Pro Blocks/Features:**
- Accordion
- Tabs
- Carousel (new in 2.2)
- Overlay Panels (popups, modals, slide-ins, off-canvas -- new in 2.3)
- Navigation + Mega Menu
- Global Styles
- Effects (entrance animations, hover effects)
- Dynamic Data Tags (post meta, user meta, options table, ACF, nested arrays)
- Device Visibility (show/hide by device)
- Conditional Display (role, page, device)
- Custom Attributes
- Copy/Paste Styles
- 200+ professional patterns

**Header/Footer Builder:**
- Uses GeneratePress theme's header system (classic, non-block)
- GenerateBlocks 2.0+ can build headers in FSE context
- Navigation block with responsive mobile menu
- Mega Menu support (Pro)
- Sticky and transparent headers via theme elements (GeneratePress Premium)

**Typography Controls:**
- GeneratePress theme: Global typography (H1-H6, body, navigation, sidebar, footer)
- GenerateBlocks: Per-block typography via style builder
- Google Fonts + custom font upload via theme
- Full typographic control: family, weight, size, line height, letter spacing, transform, decoration

**Colour Controls:**
- Theme global colour palette
- Per-block colour in style builder
- Gradient support
- Any CSS colour value supported

**Spacing Controls:**
- 100% responsive -- every spacing property can be set at any breakpoint
- Padding, margin, gap
- 5 breakpoints: Base (all), Desktop only, Tablet only, <1024px, <768px

**Layout Features:**
- Container block with Flexbox and CSS Grid
- Named grid areas (2.2+)
- Implicit row/column sizing
- Magazine-style grid layouts
- Full responsive control at every breakpoint

**Design Library / Templates:**
- 200+ professional patterns (Pro, part of GenerateCloud)
- GenerateCloud for cross-site pattern sharing ($99/yr or bundled)
- Pattern Global Styles for consistent design tokens
- Fewer templates than Kadence (800+) or Elementor (300+)

**Dynamic Content (Pro):**
- Dynamic Tags on any text element
- Post meta, user meta, options table
- Deeply nested meta (ACF repeaters, complex arrays)
- Dynamic backgrounds from custom fields
- WooCommerce product data

**Conditional Visibility (Pro):**
- Device visibility (show/hide per device)
- Conditional Display (role, login state, page type)
- Less comprehensive than Kadence's 20+ condition types

**Animation/Interactions (Pro -- Effects):**
- Entrance animations
- Hover effects
- Transition controls
- Less documented than Kadence/Elementor

**Performance Features:**
- ~10KB total code addition (lightest of all competitors)
- Zero jQuery dependency
- Minimal JavaScript
- No render-blocking resources
- Green Core Web Vitals consistently
- The performance benchmark for WordPress block plugins

**WooCommerce:**
- No dedicated WooCommerce blocks
- Dynamic Tags can query product data (Pro)
- GeneratePress theme has WooCommerce compatibility

**Form Builder:**
- **None.** GenerateBlocks has no form builder at all.
- Users must use third-party plugins (Fluent Forms, WPForms, etc.)
- This is the biggest feature gap vs Kadence and Spectra

**Popup/Modal (Pro -- Overlay Panels, new in 2.3):**
- Standard (popup), Slide-in, Off-canvas, Tooltip types
- Triggers: click, hover, timed, scroll %, exit intent, custom
- Focus trapping for accessibility
- No A/B testing
- No conversion analytics
- No WooCommerce-aware conditions

### B. Customisation Depth

**Per-element granularity:** Very high for Pro users. The Style Builder provides 100+ CSS properties. You can target any element inside any block using CSS selectors. But this requires understanding CSS selector syntax -- not beginner-friendly.

**CSS properties from editor:**
Virtually any CSS property via the Style Builder (Pro). 80+ commonly used properties with UI controls. Custom selectors for targeting sub-elements. This is the most powerful styling system among block plugins but also the most complex.

**Responsive controls:** Best in class. **Every style property is 100% responsive.** 5 breakpoints: Base, Desktop-only, Tablet-only, <1024px, <768px. More granular than Kadence's 3 breakpoints.

**Global styles / design system (Pro):**
- Global Styles with reusable style definitions
- Apply a global style to any block type
- Global Style Usage Modal shows every instance using a style
- Pattern Global Styles for design token consistency
- The most mature design system implementation among block plugins

### C. Bad Reviews and Complaints

**WordPress.org (5/5 stars -- very few reviews, niche audience):**
Community forums are the primary feedback channel.

1. **Translation/i18n problems:** The .pot file is incomplete, lots of strings missing. Not translatable for non-English users. Multiple reports from different language communities.

2. **GB 2.0 breaking changes:** Flexbox alignment matrix removed. Buttons lost icon options. Container link disappeared from toolbar. Users who relied on 1.x workflows were disrupted.

3. **Table of Contents plugin incompatibility:** New headline block doesn't work with SimpleToc and other TOC plugins that worked with the old version.

4. **Block duplication bug:** Duplicating blocks doesn't regenerate IDs consistently, causing styling conflicts.

5. **Support quality declining:** "The will to solve problems has lessened" in recent years.

6. **Starter site paywall (GeneratePress):** Previously free starter sites now require GeneratePress ONE subscription. Users with expensive lifetime licences feel betrayed.

7. **No visual editor for non-developers:** The style builder requires understanding of CSS concepts like flex-direction, grid areas, selectors. Non-technical users find it frustrating.

### D. What They Do Poorly

1. **No form builder** -- the single biggest feature gap. Every competitor has one. Users must install a third-party plugin, adding complexity and potential conflicts.

2. **Steep learning curve** -- the "compose everything from primitives" philosophy requires CSS knowledge. Non-technical site builders struggle. Designing a page takes significantly longer than with Kadence.

3. **Small block count** -- 6 free blocks means users must compose everything manually. No purpose-built blocks for testimonials, info boxes, counters, etc. in the free version.

4. **Developer-centric marketing** -- positioned as a tool for developers, which alienates the much larger non-technical WordPress user market.

5. **Translation readiness** -- incomplete .pot files mean the plugin is unusable for many non-English markets.

6. **Breaking changes in major versions** -- the 2.0 release removed or relocated key features without adequate migration guidance.

7. **Pattern library size** -- 200+ patterns vs Kadence's 800+. Adequate but not competitive.

### E. Opportunities for SGS

- **Purpose-built blocks that don't require CSS knowledge** -- SGS Trust Bar, Info Box, Heritage Strip, etc. provide what GenerateBlocks requires manual composition for.
- **Built-in form builder** -- SGS Forms spec is more comprehensive than Kadence's forms. GenerateBlocks has nothing.
- **Translation-ready from day one** -- proper .pot/.po files with all strings translatable.
- **Match GenerateBlocks' performance** -- their ~10KB footprint sets the standard. SGS should aim for comparable weight.
- **Match their responsive depth** -- 5 breakpoints is better than Kadence's 3. SGS should consider offering customisable breakpoints.

---

## 4. Flavor (by the Flavor Starter team)

**Developer:** Flavor Starter team (independent)
**Pricing:** Free (basic), Pro EUR 49/yr (unlimited sites)
**Active Installs:** Low (not in WordPress.org top themes)
**WP.org Rating:** Not prominently rated

> **Note on "Developer Developer":** Extensive searching found no WordPress theme company called "Developer Developer" producing themes named "Flavor" or "Flavstarter." The closest match is the **Flavor Starter** theme by the Flavor Starter team. If "Developer Developer" refers to a specific company not found in public searches, additional details would be needed to research them.

### A. Feature Inventory

**Theme Type:** Full Site Editing block theme (not a blocks plugin)

**Free Features:**
- Full Site Editing support
- 30+ block patterns
- 4 starter templates
- Responsive design
- WooCommerce compatibility
- Clean, lightweight code (no jQuery unless needed)
- Inline CSS delivery (prevents render-blocking)
- Typography-focused design (suited for blogs, magazines)

**Pro Features (EUR 49/yr):**
- 150+ block patterns
- 20+ premium templates
- Advanced header and footer builder
- Custom CSS and JavaScript options
- Priority email support
- Lifetime updates

**Header/Footer:** Basic (free), Advanced builder (Pro)
**Typography:** Theme-level via theme.json, focus on readability
**Colour:** Standard block theme colour palette via theme.json
**Spacing:** Standard WordPress spacing controls
**Layout:** FSE templates and template parts
**Design Library:** 30 patterns (free), 150+ (Pro)
**Dynamic Content:** None beyond WordPress core
**Conditional Visibility:** None
**Animation:** None
**Performance:** Excellent -- consistently scores 90+ on PageSpeed. No heavy JS libraries. Minimal code.
**WooCommerce:** Basic compatibility
**Form Builder:** None
**Popup:** None

### B. Customisation Depth

**Per-element granularity:** Low. Standard WordPress block controls only. No custom per-element styling beyond what theme.json provides.

**Responsive controls:** WordPress core defaults only.

**Global styles:** Via theme.json and the WordPress Site Editor global styles panel.

### C. Bad Reviews and Complaints

Very limited public review data. The theme is too small/niche to have accumulated significant feedback on WordPress.org, Reddit, or review sites.

### D. What They Do Poorly

1. **No custom blocks** -- relies entirely on WordPress core blocks. No enhanced blocks for testimonials, info boxes, counters, etc.
2. **Limited pattern library** -- 30 free patterns is minimal. Even the Pro's 150 is behind Kadence's 800+.
3. **No dynamic content** -- WordPress core only.
4. **No conditional visibility** -- no show/hide controls.
5. **No animation** -- zero motion/interaction features.
6. **Small ecosystem** -- no complementary plugins (forms, popups, booking).

### E. Opportunities for SGS

- Flavor Starter demonstrates that a performance-focused, FSE-native theme can work. SGS Theme already takes this approach with more features.
- SGS's advantage is the complete ecosystem: theme + blocks plugin + forms + booking + client notes + popups. Flavor is theme-only with no blocks plugin.

---

## 5. Flavstarter

> **Note:** "Flavstarter" does not appear to be a distinct product. All searches for "Flavstarter" redirect to or reference **Flavor Starter** (covered in section 4 above). No WordPress theme called "Flavstarter" was found on WordPress.org, ThemeForest, GitHub, or any theme marketplace.
>
> If "Flavstarter" is a different product from a company called "Developer Developer," I was unable to locate it through web searches, WordPress.org, GitHub, or theme directories. Additional details (URL, developer name, or alternative spelling) would be needed to research it.

---

## Summary Comparison Matrix

### Block/Feature Availability

| Feature | Kadence | Spectra | GenerateBlocks | Flavor Starter | SGS |
|---|---|---|---|---|---|
| **Custom blocks (free)** | 20+ | 40+ | 6 | 0 | 25 |
| **Custom blocks (Pro)** | 30+ | 45+ | 12+ | 0 | N/A (all free) |
| **Form builder** | Yes (built-in) | Yes (basic) | No | No | Yes (spec'd) |
| **Popup builder** | Pro (Conversions) | Yes (free) | Pro (Overlay Panels) | No | Spec'd (separate plugin) |
| **Header builder** | Yes (Advanced, free) | Via Astra only | Via GP theme | Pro only | Yes (theme) |
| **Mega menu** | Pro | No | Pro | No | Yes (free) |
| **Sticky header** | Yes | Via Astra | Via GP theme | No | Planned |
| **Transparent header** | Yes | Via Astra | Via GP theme | No | Planned |
| **Conditional headers** | Pro | No | No | No | Planned |
| **FAQ Schema** | Yes (free) | Yes (free) | No | No | Planned |
| **Dynamic content** | Pro | Pro | Pro | No | Phase 3+ |
| **Conditional visibility (role)** | Pro | Pro | Pro | No | Planned |
| **Conditional visibility (device)** | Yes | Yes | Pro | No | Yes |
| **Animation on scroll** | Pro | Yes (basic free) | Pro | No | Yes (free) |
| **Global defaults** | Yes (free) | Yes | Pro | No | Phase 2 |
| **Design library** | 800+ (Pro) | 100+ | 200+ (Pro) | 30 free / 150 Pro | 0 (planned) |
| **WooCommerce blocks** | Pro (Shop Kit) | No | No | No | Not planned |
| **AI content generation** | Yes (built-in) | No | No | No | Not planned |
| **Table of Contents** | Yes (free) | Yes (free) | No | No | Planned |
| **Post Grid/Query Loop** | Pro | Yes (free) | Yes (free) | No | Planned |
| **Image Gallery + lightbox** | Yes (free) | Yes (free) | No | No | Planned |
| **Google Reviews** | No | No | No | No | Yes (free) |
| **WhatsApp CTA** | No | No | No | No | Yes (free) |
| **Trust Bar** | No | No | No | No | Yes (free) |
| **Announcement Bar** | Pro (Conversions) | No | Pro (Overlay) | No | Yes (free) |

### Performance

| Metric | Kadence | Spectra | GenerateBlocks | Flavor Starter | SGS Target |
|---|---|---|---|---|---|
| Base CSS/JS weight | < 50KB | Moderate (Flexbox CSS) | ~10KB | Minimal | < 100KB CSS, < 50KB JS |
| jQuery dependency | No | No | No | No | No |
| PageSpeed Mobile | 99+ | 80-90 | 99+ | 90+ | 99+ |
| Conditional loading | Yes | Yes (with regeneration) | Yes | N/A | Yes |
| Core Web Vitals | Green | Mixed | Green | Green | Green |

### Accessibility (Equalize Digital 2025 Report)

| Builder | Score Ranking | Key Failures |
|---|---|---|
| **Kadence** | #1 (perfect score) | None documented |
| **GeneratePress/GenerateBlocks** | #2 | Minor: user-definable nav aria-label |
| **Spectra/Astra** | Mid-range | Keyboard functionality, form field labelling, zoom issues, mobile menu |
| **Flavor Starter** | Not tested | Unknown |
| **SGS** | Target: #1 | WCAG 2.2 AA non-negotiable |

### Pricing

| Product | Annual Cost | Sites | What's Included |
|---|---|---|---|
| Kadence Express | $69/yr | 5 | Blocks Pro only |
| Kadence Plus | $169/yr | 10 | Blocks + Theme + Conversions |
| Kadence Ultimate | $299/yr | 25 | Everything + A/B testing |
| Spectra Pro | $49-89/yr | 1-1,000 | Pro blocks + features |
| Astra Essential Toolkit | $79/yr | Varies | Spectra Pro + Astra Pro + Templates |
| GenerateBlocks Pro | $99/yr | 500 | Pro blocks + features |
| GP One Bundle | $149/yr | 500 | GP Premium + GB Pro + Cloud |
| Flavor Starter Pro | EUR 49/yr | Unlimited | Premium patterns + builder |
| **SGS (all products)** | **$0** | **Unlimited** | **Everything** |

---

## SGS Opportunities -- Where to Leapfrog

Based on the full competitive analysis and complaint patterns, these are the highest-impact opportunities for SGS:

### 1. Stability as a Competitive Moat

**The problem:** Spectra (5.3% complaint rate), Elementor (9.0%), and even Kadence have histories of updates breaking sites. GenerateBlocks 2.0 removed features users relied on.

**SGS approach:** Test every update on the live dev site (palestine-lives.org) before deploying to any client. Never ship a breaking change. When SGS blocks change their save.js output, always include deprecations. This alone differentiates from the entire market.

### 2. Purpose-Built Blocks for Non-Technical Users

**The problem:** GenerateBlocks requires CSS knowledge. Kadence is powerful but overwhelming. Spectra has many blocks but inconsistent quality.

**SGS approach:** Purpose-built blocks (Trust Bar, Heritage Strip, Brand Strip, Process Steps, WhatsApp CTA, Google Reviews, Certification Bar, Announcement Bar) that solve specific business needs with zero CSS required. These have no direct equivalents in any competitor.

### 3. WCAG 2.2 AA as Default, Not Add-On

**The problem:** Kadence leads at #1 but still has gaps. Spectra has significant keyboard and form labelling failures. GenerateBlocks is good but not perfect. Elementor is poor.

**SGS approach:** Every block built with WCAG 2.2 AA from the ground up. ARIA landmarks, keyboard navigation, focus management, reduced motion respect, semantic HTML. Not as a plugin add-on -- baked into every render.php.

### 4. Zero Licensing, Zero Upselling

**The problem:** Spectra nags users constantly. Elementor has subscription traps. Kadence has complex pricing tiers ($69-$899). GenerateBlocks changed starter site access behind a paywall.

**SGS approach:** Everything is free, forever. No per-site fees, no subscription, no upselling, no review nags, no in-admin advertising. The cleanest admin experience in the WordPress block plugin space.

### 5. Integrated Ecosystem (Theme + Blocks + Forms + Booking + Popups)

**The problem:** Kadence requires 3-4 separate products ($169-299/yr). Spectra needs Astra + Starter Templates. GenerateBlocks has no forms, no booking, and needs GeneratePress.

**SGS approach:** One theme, one blocks plugin, one forms system, one booking system, one popups plugin -- all designed to work together seamlessly. No third-party dependencies for core site-building needs.

### 6. Performance Matching GenerateBlocks

**The problem:** GenerateBlocks sets the ~10KB standard. Kadence is good at <50KB. Spectra is heavier.

**SGS approach:** Target <100KB CSS and <50KB JS per page. Use dynamic render.php (zero client-side JS for static blocks). Interactivity API for interactive blocks (lighter than jQuery). Conditional loading -- only ship CSS/JS for blocks actually on the page.

### 7. Customisable Responsive Breakpoints

**The problem:** Kadence has 3 fixed breakpoints (most-requested change on their feedback board). Spectra has 3. GenerateBlocks has 5 but still fixed.

**SGS approach:** Allow breakpoint customisation via theme.json or a settings panel. Let users define their own breakpoint values. No competitor offers this.

### 8. Schema Markup on Content Blocks

**The problem:** FAQ Schema on accordions and Review Schema on testimonials are scattered across competitors. Kadence has FAQ Schema free but no Review Schema. Spectra has both via separate blocks. GenerateBlocks has neither.

**SGS approach:** Add schema.org/FAQPage to Accordion and schema.org/Review to Testimonial blocks with a single toggle. Zero configuration needed. Output via JSON-LD (cleanest approach).

### 9. Documentation Quality

**The problem:** Spectra's documentation is "incomplete." GenerateBlocks documentation doesn't help non-developers. Kadence's advanced docs require forum assistance.

**SGS approach:** Every block ships with complete documentation: what it does, every control explained, common patterns, accessibility notes, and performance characteristics. Write for non-technical users.

### 10. Interactivity API Instead of jQuery/Custom JS

**The problem:** Elementor still uses jQuery. Kadence Conversions has unknown JS dependencies. Spectra's JS is heavy. GenerateBlocks is lightweight but uses vanilla JS.

**SGS approach:** All interactive blocks use WordPress's Interactivity API or viewScriptModule with vanilla JS. This is the modern WordPress standard, ensuring forward compatibility and minimal bundle size.

---

## Priority Actions for SGS

Based on this research, the immediate priorities are:

### Must Have (Feature Parity)
1. Table of Contents block (3 of 4 competitors have it)
2. Post Grid / Query Loop (all competitors have it)
3. Image Gallery with lightbox (3 of 4 competitors have it)
4. FAQ Schema on Accordion block
5. Review Schema on Testimonial blocks
6. Info Box: image support, entire-box link, icon position options
7. Tabs: vertical layout, icons, anchor links
8. Role-based conditional visibility extension

### Should Have (Competitive Advantage)
9. Global defaults system ("save as default" per block type)
10. 20-30 section patterns (hero, testimonial, CTA, features)
11. Custom CSS per block extension
12. Second CTA button on Hero and CTA Section
13. Content Timeline block
14. Team Member block
15. Standalone Star Rating block

### Could Have (Differentiation)
16. Customisable responsive breakpoints
17. Shape dividers on Container
18. Process Steps vertical layout + connector lines
19. Card Grid query mode (pull from posts/CPT)

### Not Needed
- AI content generation (avoid bloat)
- WooCommerce blocks (no current client need)
- Instagram Feed (third-party plugins do it better)
- Login/Registration forms (WordPress core handles this)

---

## Sources

### Kadence
- [Kadence Blocks -- WordPress.org](https://wordpress.org/plugins/kadence-blocks/)
- [Kadence WP Official Site](https://www.kadencewp.com/)
- [Kadence Blocks Pro Features](https://www.kadencewp.com/kadence-blocks/pro/)
- [Kadence Advanced Header Documentation](https://www.kadencewp.com/help-center/docs/kadence-blocks/getting-started-with-advanced-header-navigations/)
- [Kadence Mega Menu Documentation](https://www.kadencewp.com/help-center/docs/kadence-blocks/advanced-navigation-sub-menus-and-mega-menus/)
- [Kadence Conditional Headers](https://www.kadencewp.com/help-center/docs/kadence-theme/how-to-use-conditional-header/)
- [Kadence Conditional Display](https://www.kadencewp.com/help-center/docs/kadence-blocks/conditional-display/)
- [Kadence Dynamic Content](https://www.kadencewp.com/help-center/docs/kadence-blocks/dynamic-content/)
- [Kadence Responsive Breakpoints](https://www.kadencewp.com/help-center/docs/kadence-blocks/responsive-breakpoints-in-kadence/)
- [Kadence Pricing](https://www.kadencewp.com/pricing/)
- [Kadence 2025 Plan Changes](https://www.kadencewp.com/blog/2025-plan-changes/)
- [KadenceWP Trustpilot Reviews](https://www.trustpilot.com/review/kadencewp.com)
- [Kadence WP.org Reviews](https://wordpress.org/support/plugin/kadence-blocks/reviews/)
- [Kadence Theme Review (Webidextrous)](https://webidextrous.com/kadence-wordpress-theme-a-comprehensive-2025-review/)

### Spectra
- [Spectra -- WordPress.org](https://wordpress.org/plugins/ultimate-addons-for-gutenberg/)
- [Spectra Official Site](https://wpspectra.com/)
- [Spectra Blocks and Extensions](https://wpspectra.com/blocks-and-extensions/)
- [Spectra Pro Features](https://wpspectra.com/pro/)
- [Spectra Dynamic Content](https://wpspectra.com/blocks-and-extensions/dynamic-content/)
- [Spectra Popup Builder](https://wpspectra.com/docs/popup-builder-v3/)
- [Spectra Global Styles](https://wpspectra.com/blocks-and-extensions/global-styles/)
- [Spectra Pricing](https://wpspectra.com/pricing/)
- [Spectra WP.org Reviews](https://wordpress.org/support/plugin/ultimate-addons-for-gutenberg/reviews/)
- [Spectra 1-star Review: "Unfortunate Experience"](https://wordpress.org/support/topic/unfortunate-experience-of-using-this-builder/)
- [Spectra 1-star Review: "So Frustrating"](https://wordpress.org/support/topic/so-frustating-dont-use-it/)
- [Spectra Backend Performance Issue](https://wordpress.org/support/topic/spectra-slows-down-back-end/)

### GeneratePress / GenerateBlocks
- [GenerateBlocks -- WordPress.org](https://wordpress.org/plugins/generateblocks/)
- [GenerateBlocks Official Site](https://generateblocks.com/)
- [GenerateBlocks 2.0 Announcement](https://generatepress.com/generateblocks-2-0-a-new-era/)
- [GenerateBlocks 2.1 Announcement](https://generatepress.com/introducing-generateblocks-2-1/)
- [GenerateBlocks 2.2 + Pro 2.5](https://generatepress.com/introducing-generateblocks-2-2-0-generateblocks-pro-2-5-0/)
- [GenerateBlocks Overlay Panels (Pro 2.3)](https://generatepress.com/introducing-overlay-panels-and-conditions-in-generateblocks-pro/)
- [GenerateBlocks Global Styles](https://learn.generatepress.com/blocks/block-guide/getting-started-generateblocks/generateblocks-pro/global-styles/)
- [GeneratePress Pricing](https://generatepress.com/pricing/)
- [GenerateBlocks Review (Authority Hacker)](https://www.authorityhacker.com/generateblocks-review/)
- [GenerateBlocks Review (WPLogout)](https://www.wplogout.com/generateblocks-review/)

### Flavor Starter
- [Flavor Starter Review (HostingRadar)](https://www.hostingradar.io/en/blog/flavor-starter-review)

### Accessibility
- [WordPress Page Builder Accessibility Comparison 2025 (Equalize Digital)](https://equalizedigital.com/wordpress-page-builder-accessibility/)

### Comparisons
- [Kadence vs Spectra Comparison (MyWPDiary)](https://mywpdiary.com/kadence-blocks-vs-spectra/)
- [Kadence vs Spectra (WPGutenKit)](https://wpgutenkit.com/kadence-vs-spectra-blocks/)
- [GenerateBlocks vs Kadence vs Stackable (WebTNG)](https://www.webtng.com/generateblocks-kadence-blocks-and-stackable-blocks-compared/)
- [Kadence Theme Review (DIY Dream Site)](https://diydreamsite.com/kadence-theme-review/)
