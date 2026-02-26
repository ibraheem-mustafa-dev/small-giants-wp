# SGS Framework Completion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the SGS WordPress Framework to match or exceed Kadence, Spectra, and GenerateBlocks in functionality, customisation depth, and client UX — then ship Indus Foods as the first production site.

**Architecture:** SGS Theme (block theme with theme.json v3) + SGS Blocks plugin (32 blocks today, ~45 target). All styling via design tokens. Client customisation via style variations + block inspector controls. No jQuery, no page builders, pure Gutenberg.

**Tech Stack:** WordPress 6.9+, PHP 8.0+, @wordpress/scripts, Interactivity API, theme.json v3, self-hosted WOFF2 fonts, N8N webhooks

---

## Context

The SGS Framework was designed to be a professional-grade WordPress block theme + blocks plugin that competes with Kadence, Spectra, and GenerateBlocks. After 16+ development sessions, the framework has a solid foundation (32 blocks, complete theme, form system) but significant gaps remain:

- **9 of 18 documented bugs are still unfixed**
- **The Indus Foods homepage, header, and footer aren't working correctly** (services section blank, hero colours wrong, mobile nav broken, etc.)
- **Key blocks competitors offer are missing** (Post Grid, Image Gallery with lightbox, Tabs improvements, responsive visibility)
- **Customisation depth doesn't match Kadence/Spectra** (missing per-element responsive controls, device visibility, hover state controls in editor)
- **Framework features missing** (conditional visibility, global defaults, block patterns library, responsive header builder)

### Competitor Landscape (Feb 2026)

| Feature | Kadence (35M installs) | Spectra (38M installs) | GenerateBlocks | SGS Today |
|---------|----------------------|----------------------|----------------|-----------|
| Total blocks | 20+ free, 10+ pro | 42+ | 6 | 32 |
| Header builder | No (theme-level) | Limited | No | No |
| Responsive per-breakpoint | Yes (all props) | Yes (all props) | Yes | Partial |
| Device visibility | Yes (per block) | Yes (per block) | No | No |
| Conditional display | Pro (role, schedule) | Pro | No | No |
| Dynamic content | Pro (ACF, MetaBox) | Pro | Pro | No |
| Per-element hover controls | Yes | Yes | Yes | Partial |
| Image gallery + lightbox | Yes | Yes | No | No |
| Post Grid / Query Loop | Yes | Yes (3 variants) | Yes | No |
| Form builder | Yes (12 field types) | Yes (4 types + Pro) | No | Yes (12 types) |
| Popup/Modal builder | Pro | Yes | No | Spec only |
| Table of Contents | Yes | Yes (with schema) | No | Broken |
| Countdown timer | Yes | Yes | No | No |
| FAQ Schema | Yes | Yes | No | Partial |
| Review Schema | Yes | No | No | Partial |
| AI content | Yes (inline) | Yes | No | No |
| Design library/patterns | 400+ patterns | 150+ patterns | 100+ | 0 |
| Copy/paste styles | Native WP 6.2+ | Yes (custom) | Yes | Native only |
| Animation system | Pro (AOS) | Yes (free) | No | Yes (15 types) |
| Price: Free tier | Generous | Generous | Generous | Free |

### Key Competitor Complaints (Opportunities for SGS)

**Kadence:** Site-breaking updates, expensive lifetime plan, support ticket friction
**Spectra:** Slow editor performance, blocks appear distorted, CSS not loading outside content area, free version missing key features (animations)
**GenerateBlocks:** Too few blocks (only 6), steep learning curve ("compose everything" philosophy), TOC takes 30min vs 10min in Kadence
**General:** All competitors lock key features behind Pro — SGS can win by shipping more in free tier

---

## Phase 0: Code Quality Foundation (1 session)

**Why first:** Extract shared helpers and fix code-level issues that will affect every subsequent phase. Doing this first means all new blocks benefit from clean utilities.

### Task 0.1: Fix 9 Outstanding Bugs

**Files to modify:**

1. **Colour detection — 4 blocks** (`info-box`, `hero`, `cta-section`, `testimonial-slider` render.php)
   - Extract shared colour helper to `includes/render-helpers.php`
   - Support `#hex`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, `oklch()`, `lch()`, named colours, and values with whitespace
   - Replace duplicated closures in all 4 blocks with `require_once` + shared function
   - This fixes issues #4 and #8 simultaneously

2. **`$used_slugs` archive bleed** (`includes/heading-anchors.php`)
   - Add reset: `if ($current_post_id !== $last_post_id) { $used_slugs = []; $last_post_id = $current_post_id; }`

3. **Navigation ref hardcoded** (`theme/sgs-theme/parts/header.html`)
   - Remove `"ref":4` — use `<!-- wp:navigation -->` without ref so it picks up the site's primary navigation
   - Or use `<!-- wp:navigation {"ref":0} -->` to auto-detect

4. **Testimonial ARIA incomplete** (`testimonial-slider/render.php`)
   - Add `aria-controls="slide-{n}"` to each dot
   - Add `id="slide-{n}"` and `role="tabpanel"` and `aria-labelledby="dot-{n}"` to each slide
   - Add `id="dot-{n}"` to each dot button

5. **Accordion `e.preventDefault()` breaks progressive enhancement** (`accordion/view.js`)
   - Remove `e.preventDefault()` — manage animation via CSS transitions on `[open]` state instead
   - Ensure `<details>` toggle works without JS

6. **`lucide-react` devDependency** (`plugins/sgs-blocks/package.json`)
   - Remove `"lucide-react": "^0.564.0"` from dependencies

7. **Missing `prestart` hook** (`plugins/sgs-blocks/package.json`)
   - Add `"prestart": "node scripts/generate-icons.js"` to scripts

8. **`lucide-icons.php` exemption comment** (`plugins/sgs-blocks/includes/lucide-icons.php`)
   - Add `// Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.` after file header

---

## Phase 1: Framework Foundation Gaps (2-3 sessions)

**Why:** These are features every competitor has that SGS is missing. Without them, SGS can't credibly compete. Building these BEFORE client work means Indus Foods benefits from the improved framework.

### Task 1.1: Device Visibility Extension (Per-Block Show/Hide)

**What:** Add responsive visibility controls to every block — hide on mobile, tablet, or desktop.

**Implementation:**
- Create a block extension (`src/extensions/device-visibility/`) using `editor.BlockEdit` filter
- Adds `sgsHideOnMobile`, `sgsHideOnTablet`, `sgsHideOnDesktop` attributes to all blocks
- Inspector panel: "Device Visibility" with 3 toggles (icons for each device)
- CSS classes: `.sgs-hide-mobile`, `.sgs-hide-tablet`, `.sgs-hide-desktop`
- CSS uses `@media` queries with breakpoints matching theme.json
- Server-side: `render_block` filter adds classes based on attributes
- **Performance:** CSS-only hiding (not server-side removal) — matches Block Visibility plugin approach for SEO

**Files:**
- Create: `src/extensions/device-visibility/index.js` (editor UI)
- Create: `src/extensions/device-visibility/style.css` (frontend media queries)
- Modify: `sgs-blocks.php` (register extension)

**Competitors:** Kadence (built-in), Spectra (built-in), Blocksy (conditional visibility), Block Visibility plugin (standalone)

### Task 1.2: Responsive Header System

**What:** Multiple header template parts for different devices, with responsive CSS to show/hide.

**Implementation:**
- `parts/header.html` — desktop (shows full nav + CTA button)
- `parts/header-mobile.html` — mobile (hamburger + logo only)
- `parts/header-tablet.html` — tablet (nav without CTA button) OR use CSS to hide CTA at tablet
- CSS in `core-blocks.css` or style variation to show/hide by breakpoint
- Remove hardcoded `ref=4` — use `<!-- wp:navigation -->` with fallback

**Alternative (simpler):** Single header with CSS `display:none` per breakpoint for specific elements. This is what most competitors do.

**Recommendation:** CSS approach on single header (simpler, fewer template parts to maintain). The device visibility extension (Task 1.1) can then be used on individual header elements.

### Task 1.3: Per-Element Hover State Controls

**What:** Every block with interactive elements (buttons, cards, links) should expose hover colour controls in the editor.

**Current state:** Hover effects exist in CSS but aren't editor-configurable.

**Implementation:**
- Add `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour` attributes to: Hero, CTA Section, Info Box, Card Grid
- Inspector panel: "Hover States" section with DesignTokenPicker for each
- Output as inline CSS custom properties: `--sgs-hover-bg`, `--sgs-hover-text`, `--sgs-hover-border`
- Block CSS uses these custom properties for `:hover` styles

**Files to modify:** `hero/edit.js`, `hero/render.php`, `cta-section/edit.js`, `cta-section/render.php`, `info-box/edit.js`, `info-box/render.php`, `card-grid/edit.js`, `card-grid/render.php`

### Task 1.4: Shared Render Helpers

**What:** Extract duplicated PHP helpers into a single shared file.

**Implementation:**
- Create `includes/render-helpers.php`
- Move into it: `sgs_colour_value()`, `sgs_font_size_value()`, `sgs_is_css_colour()`
- All render.php files `require_once` this file
- Fix the colour detection to handle all CSS colour formats

**Files:**
- Create: `includes/render-helpers.php`
- Modify: All 5 blocks with duplicated helpers

---

## Phase 2: Missing Blocks — Table Stakes (3-4 sessions)

**Why:** These are blocks that 3+ competitors offer. Clients expect them.

### Task 2.1: Post Grid / Query Loop Block (`sgs/post-grid`)

**What:** Display posts/CPTs in a grid, carousel, or list. The most-requested missing block.

**Attributes:** postType, postsPerPage, columns, columnsTablet, columnsMobile, orderBy, order, categories, tags, showFeaturedImage, showExcerpt, showDate, showAuthor, showReadMore, readMoreText, cardStyle, gap, pagination

**Implementation:**
- Dynamic block (render.php) using `WP_Query`
- Editor: live preview with `useEntityRecords` from `@wordpress/core-data`
- Variants: grid, list, carousel (reuse testimonial-slider scroll-snap pattern)
- Card templates for each layout
- Inspector: post type picker, taxonomy filter, display toggles, layout controls

**Competitors:** Kadence Posts Block, Spectra Post Grid + Post Carousel + Post Timeline, GenerateBlocks Query Loop

### Task 2.2: Image Gallery Block (`sgs/gallery`)

**What:** Multi-image gallery with lightbox, carousel, masonry, and grid layouts.

**Attributes:** images (array), layout (grid/masonry/carousel/slider), columns, gap, lightbox, lightboxCaptions, imageSize, borderRadius, hoverEffect

**Implementation:**
- Static block (save.js) with view.js for lightbox + carousel
- Lightbox: pure CSS + Interactivity API (no external library)
- Masonry: CSS `column-count` (no JS)
- Carousel: reuse scroll-snap pattern from testimonial-slider
- Keyboard accessible: arrow keys in lightbox, Escape to close

**Competitors:** Kadence Advanced Gallery, Spectra Image Gallery

### Task 2.3: Tabs Block (`sgs/tabs`)

**What:** Horizontal or vertical tabbed content sections.

**Attributes:** tabs (array with label, icon, content), orientation (horizontal/vertical), defaultTab, iconPosition, subtitleColour, borderStyle, activeTabColour, activeTabBackground

**Implementation:**
- Dynamic block (render.php) with view.js for tab switching
- Hash-based deep linking (`#tab-name` in URL)
- ARIA: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`
- Keyboard: arrow keys to switch tabs
- Each tab accepts InnerBlocks

**Competitors:** Kadence Tabs (recently added subtitle colours), Spectra Tabs

### Task 2.4: Countdown Timer Block (`sgs/countdown`)

**What:** Countdown to a specific date/time, or evergreen (per-visitor).

**Attributes:** targetDate, format (days/hours/minutes/seconds), expiredAction (hide/showMessage/redirect), expiredMessage, expiredRedirect, labelDays, labelHours, labelMinutes, labelSeconds, separator, variant (flip/simple/minimal)

**Implementation:**
- Dynamic block (render.php) with view.js
- Server renders initial state; JS updates live
- Progressive enhancement: shows target date if JS fails
- Evergreen: cookie-based per-visitor countdown (future enhancement)

**Competitors:** Kadence Countdown, Spectra Countdown

### Task 2.5: Star Rating Block (`sgs/star-rating`)

**What:** Standalone star rating display (reuse testimonial rating component).

**Attributes:** rating (0-5, 0.5 steps), maxRating, size, filledColour, emptyColour, showNumber, label

**Implementation:**
- Static block (save.js)
- SVG stars with accessible text alternative
- Schema.org/Rating markup option

### Task 2.6: Team Member Block (`sgs/team-member`)

**What:** Staff/team member card with photo, name, role, bio, social links.

**Attributes:** name, role, bio, photo, socialLinks (array), layout (vertical/horizontal), photoShape (square/circle/rounded)

**Implementation:**
- Static block (save.js)
- Schema.org/Person markup
- Social links with brand icons (reuse Lucide icons)

---

## Phase 3: Customisation Depth — Matching Kadence/Spectra (2-3 sessions)

**Why:** This is where clients feel the difference. Every property that can be set per-breakpoint should be.

### Task 3.1: Per-Breakpoint Controls for All Blocks

**What:** Every spacing, font size, and layout property should be settable for desktop, tablet, and mobile independently.

**Current state:** `ResponsiveControl` component exists but isn't used consistently across all blocks.

**Implementation:**
- Audit every block's edit.js — identify properties that should be responsive
- Wrap each in `<ResponsiveControl>` component
- Store as `{ desktop: value, tablet: value, mobile: value }` in attributes
- Output CSS with `@media` queries in render.php

**Priority blocks:** Hero (min-height, font sizes, padding), Container (columns, gap, padding), Card Grid (columns, gap), Info Box (icon size, padding), CTA Section (padding, font sizes)

### Task 3.2: Global Defaults System

**What:** "Save as Default" action on any block — new instances use saved defaults.

**Implementation:**
- Store defaults in `wp_options` as `sgs_block_defaults_{block_name}`
- Block registration: merge saved defaults with block.json defaults
- Inspector panel: "Save as Default" button (admin only)
- Settings page to view/reset all defaults

**Competitors:** Kadence (Configurable Defaults), Spectra (Global Block Styling)

### Task 3.3: Block Patterns Library (20-30 patterns)

**What:** Pre-built section patterns using SGS blocks. Zero patterns exist today.

**Categories:**
- **Hero patterns** (5): Full-width image, split image, video background, centered text, gradient overlay
- **Feature patterns** (5): Icon grid, alternating image/text, numbered steps, comparison table, feature cards
- **Testimonial patterns** (3): Single quote, slider, grid with stats
- **CTA patterns** (3): Simple banner, split with image, gradient with countdown
- **Content patterns** (5): FAQ accordion, team grid, pricing table, timeline, stats bar
- **Footer patterns** (3): 3-column, 4-column, centered minimal
- **Header patterns** (3): Standard, centered logo, transparent overlay

**Implementation:**
- PHP pattern files in `theme/sgs-theme/patterns/`
- Registered with `register_block_pattern()`
- Use SGS blocks + core blocks
- Each pattern uses design tokens (not hardcoded colours)

### Task 3.4: Custom CSS Per Block

**What:** Textarea in inspector for adding custom CSS scoped to the block.

**Implementation:**
- Add `customCSS` attribute to all blocks via extension
- Inspector panel: code editor textarea
- Output as `<style>` tag scoped to block's unique ID
- Editor preview: inject CSS into editor iframe

**Competitors:** Kadence (Custom CSS on Row Layout), Spectra (not available), GenerateBlocks (Custom CSS panel)

---

## Phase 4: Indus Foods Completion (2-3 sessions)

**Why:** First client site. Proves the framework works end-to-end. By this point the framework has device visibility, new blocks, responsive controls, and patterns — Indus Foods gets the full benefit.

**Prerequisite:** Phases 0-3 complete (or at minimum 0-2).

### Task 4.0: Fix Indus Foods Homepage Visual Issues

**From outstanding-issues.md Section 10 — 17 visual issues + hover mismatches:**

Priority order (critical first):
1. **Mobile nav broken** — hamburger menu not rendering at 375px
2. **Services section blank** — info-box blocks not outputting HTML
3. **Hero background colour** — should be accent/gold, not teal
4. **"Why Choose" white cards** — should be no-card on accent background
5. **Testimonials background** — should be white/light, not teal
6. **Tablet nav wraps** — hide CTA at tablet breakpoint
7. **Top bar styling** — needs pill-shaped icon buttons
8. **Hero buttons stacking** — should stack vertically, not side-by-side
9. **Hero + CTA hover effect mismatches** (H1-H6 from comparison table)
10. **Content fixes** — service titles, button labels, social icons (editor changes)
11. **Footer** — swap logo, brand-colour social icons, outline button variant

**Approach:** Content/styling fixes, not block code changes. Most require:
- Updating block attributes in the WordPress editor (colours, layouts)
- Adding responsive CSS to the Indus Foods style variation
- Using new device visibility extension for responsive header elements

**Critical rule:** All fixes go through the style variation system or block attributes — never hardcode.

### Task 4.1: Build All Missing Pages

**From outstanding-issues.md Section 4:**

| Page | Template | Key Blocks Used |
|------|----------|----------------|
| `/food-service/` | Audience page | Hero, Info Box grid, CTA Section, Process Steps |
| `/manufacturing/` | Audience page | Same template as above |
| `/retail/` | Audience page | Same template |
| `/wholesale/` | Audience page | Same template |
| `/apply-for-trade-account/` | Form page | Hero, Form (4-step), Notice Banner |
| `/trade/request-catalogue/` | Form page | Hero, Form (simple) |
| `/trade/delivery-logistics/` | Content page | Hero, Process Steps, Accordion (FAQ) |
| `/trade/terms-conditions/` | Content page | Hero, Accordion |
| `/our-story/` | Content page | Hero, Heritage Strip, Counter, Brand Strip |
| `/certifications/` | Content page | Hero, Certification Bar, Accordion |
| `/community-charity/` | Content page | Hero, Heritage Strip, CTA Section |
| `/sustainability/` | Content page | Hero, Info Box grid, CTA Section |
| `/careers/` | Content page | Hero, CTA Section, Accordion (positions) |
| `/brands/` | Content page | Hero, Brand Strip (detailed), Card Grid |
| `/blog/` | Archive | Post Grid (new block from Phase 2) |
| `/contact/` | Form page | Hero, Form (contact), Google Map embed |

### Task 4.2: Fix All Visual Issues from Comparison

**17 issues from outstanding-issues.md Section 10 + hover mismatches**

These are primarily content and styling fixes applied through:
- Block editor attribute changes
- Indus Foods style variation CSS
- `functions.php` conditional inline styles

### Task 4.3: End-to-End Testing

**Using Playwright + design-reviewer agent:**

- [ ] Mobile Safari (375px) — full page load, nav, carousel, slider
- [ ] Android Chrome (390px) — same
- [ ] Tablet (768px) — nav, layout, cards
- [ ] Desktop (1440px) — full layout
- [ ] Keyboard navigation — all interactive blocks
- [ ] Screen reader — headings, landmarks, ARIA
- [ ] Lighthouse audit — Performance, Accessibility, SEO, Best Practices
- [ ] 44px touch targets — all buttons and links
- [ ] Form submission — end-to-end with N8N webhook
- [ ] Schema markup — FAQ, Review, Organisation

---

## Phase 5: Framework Polish & Documentation (1-2 sessions)

### Task 5.1: Conditional Visibility Extension (Beyond Device)

**What:** Show/hide blocks by user role, schedule, URL parameter.

**Conditions:**
- User logged in/out
- User role (admin, editor, subscriber, custom)
- Date range (start/end)
- Days of week
- URL contains parameter
- Referrer contains

**Implementation:** Extend device-visibility extension with server-side `render_block` filter for non-CSS conditions.

### Task 5.2: Performance Audit & Optimisation

- Run Lighthouse on Indus Foods homepage
- Measure: CSS bundle size, JS bundle size, font loading, CLS, LCP, FID
- Target: < 100KB CSS, < 50KB JS, green Core Web Vitals
- Check for duplicate font preloads (functions.php vs theme.json fontFace)
- Conditional block CSS loading (only load CSS for blocks on the page)

### Task 5.3: Update All Documentation

- Update `specs/01-SGS-THEME.md` (font correction: Inter, not DM Serif Display)
- Update `sites/indus-foods/CLAUDE.md` (correct design tokens)
- Update `specs/09-GOLD-STANDARD-AUDIT.md` with new blocks and completed gaps
- Update root `CLAUDE.md` with new block inventory
- Add `.gitattributes` to enforce LF line endings

### Task 5.4: Accessibility Compliance Pass

Run WAVE + axe-core + manual keyboard testing on every block. Fix all Critical and High issues from outstanding-issues.md accessibility audit section.

---

## Phase 6: Future (Not in This Plan)

These are specced but not prioritised for the current milestone:

- SGS Popups plugin (Phase 4 in specs)
- SGS Chatbot plugin (Phase 6 in specs)
- SGS Booking plugin (Phase 5 in specs)
- SGS Client Notes plugin (Phase 3 in specs)
- WooCommerce integration
- Dynamic content system
- AI content generation

---

## Execution Strategy

### Session Order (Framework First)

| Session | Phase | Focus | Agent |
|---------|-------|-------|-------|
| 1 | Phase 0 | Shared helpers + 9 bug fixes | wp-developer |
| 2 | Phase 1.1-1.2 | Device visibility + responsive header | wp-developer |
| 3 | Phase 1.3-1.4 | Hover controls + shared helpers refinement | wp-developer |
| 4 | Phase 2.1 | Post Grid block | wp-developer |
| 5 | Phase 2.2-2.3 | Gallery + Tabs blocks | wp-developer |
| 6 | Phase 2.4-2.6 | Countdown + Star Rating + Team Member | wp-developer |
| 7 | Phase 3.1-3.2 | Responsive controls + global defaults | wp-developer |
| 8 | Phase 3.3-3.4 | Block patterns library + custom CSS | wp-developer |
| 9 | Phase 4 (bugs) | Fix Indus Foods visual issues (17 items) | wp-developer + design-reviewer |
| 10 | Phase 4 (pages) | Build all missing Indus Foods pages | wp-developer |
| 11 | Phase 4.3 | End-to-end testing | test-and-explain + design-reviewer |
| 12 | Phase 5 | Polish, docs, accessibility, conditional visibility | wp-developer + seo-auditor |

### Skills to Invoke Per Session

| Session | Skills |
|---------|--------|
| All | `/superpowers:using-superpowers`, `/verification-before-completion` |
| Bug fixes | `/systematic-debugging`, `/wp-block-development` |
| New blocks | `/brainstorming`, `/wp-block-development`, `/wp-interactivity-api` |
| Theme work | `/wp-block-themes` |
| Visual fixes | `/interaction-design`, `/web-design-guidelines` |
| Testing | `/skill-adapter` (accessibility), `/seo-page` |
| Patterns | `/wp-block-themes`, `/frontend-design` |

### MCP Tools & Agents

| Tool/Agent | Use For |
|-----------|---------|
| wp-developer agent | All WordPress build work (mandatory delegation) |
| design-reviewer agent | Visual QA after each phase |
| test-and-explain agent | Testing completed work in plain English |
| seo-auditor agent | Schema markup, meta tags, performance |
| Context7 MCP | WordPress block editor docs, theme handbook |
| GitHub MCP | PR creation, branch management |
| Playwright MCP | Visual testing, screenshot comparison |
| Chrome MCP | Live site inspection, DOM analysis |
| Memory MCP | Store patterns and decisions across sessions |

### Verification Checklist (Per Phase)

- [ ] `npm run build` succeeds with zero errors
- [ ] Deploy to dev site via SCP
- [ ] Purge LiteSpeed cache
- [ ] Visual check at 375px, 768px, 1440px
- [ ] Keyboard navigation test on new/modified blocks
- [ ] No console errors in browser
- [ ] Lighthouse score maintained or improved
- [ ] Git commit with descriptive message

---

## Summary: What SGS Will Have After This Plan

**Blocks:** ~40 (up from 32) — matching Kadence's free tier, exceeding GenerateBlocks
**Framework features:** Device visibility, responsive header, hover controls, global defaults, patterns library, conditional visibility
**Indus Foods:** Complete production site with all pages, tested across devices
**Competitive edge:** More blocks free than Kadence, better accessibility than Spectra, purpose-built blocks (not "compose everything" like GenerateBlocks), zero licensing cost
