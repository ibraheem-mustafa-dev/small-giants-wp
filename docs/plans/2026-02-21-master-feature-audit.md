# SGS Framework — Master Feature Audit & Graded Roadmap

> **Date:** 2026-02-21
> **Scope:** Every feature the SGS WordPress Framework could offer — theme, blocks, plugins, interactions, accessibility, performance.
> **Sources:** 6 parallel research agents auditing Webflow, Framer, Elementor, Kadence, Spectra, GenerateBlocks, Squarespace, Wix, Breakdance, Bricks, PostX, and cutting-edge CSS/JS specs.

---

## Grading System

| Grade | Impact (1-5) | Meaning |
|-------|-------------|---------|
| 5 | Critical | Every client needs it, competitors all have it |
| 4 | Important | Strong differentiator, most clients want it |
| 3 | Valuable | Enhances the experience noticeably |
| 2 | Niche | Some clients want it, not universal |
| 1 | Edge case | Experimental or very specialised |

| Grade | Difficulty (1-5) | Meaning |
|-------|------------------|---------|
| 1 | Trivial | CSS-only or simple attribute, < 1 hour |
| 2 | Easy | Simple JS or PHP, < 4 hours |
| 3 | Medium | Multiple files, 1-2 days |
| 4 | Hard | Complex architecture, 3-5 days |
| 5 | Very hard | Major feature, 1+ weeks |

| Priority | Phase | Meaning |
|----------|-------|---------|
| P0 | Done | Already built or in progress |
| P1 | Phase 2-3 | Must have for framework launch |
| P2 | Phase 4-5 | Should have before first client |
| P3 | Post-launch | Nice to have, builds competitive edge |
| P4 | Future | Watch list, experimental, or low ROI |

| Component | Abbreviation |
|-----------|-------------|
| SGS Theme | **Theme** |
| SGS Blocks Plugin | **Blocks** |
| Block Extension (all blocks) | **Ext** |
| Form Blocks | **Forms** |
| SGS Booking | **Booking** |
| SGS Popups (planned) | **Popups** |
| SGS Chatbot (planned) | **Chatbot** |
| SGS Client Notes (planned) | **Notes** |
| Cross-component | **Framework** |

---

## 1. LAYOUT & STRUCTURE

### 1.1 Grid / Column System

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 1 | Responsive columns per breakpoint (desktop/tablet/mobile) | 5 | 2 | P0 | Blocks | Done in Container, Card Grid, hero |
| 2 | Column gap per breakpoint | 5 | 2 | P1 | Blocks | Needs consistent implementation |
| 3 | Row gap per breakpoint | 5 | 2 | P1 | Blocks | Needs consistent implementation |
| 4 | Column ordering / reorder on mobile | 4 | 2 | P2 | Blocks | CSS `order` property per breakpoint |
| 5 | Column spanning (grid-column: span) | 3 | 2 | P2 | Blocks | For asymmetric layouts |
| 6 | Nested grids | 4 | 2 | P0 | Blocks | Container + InnerBlocks |
| 7 | Auto-fill / auto-fit grid | 3 | 1 | P2 | Blocks | CSS Grid `repeat(auto-fit, minmax())` |
| 8 | CSS Subgrid | 3 | 2 | P3 | Blocks | Cross-card alignment; 85% browser support |
| 9 | Asymmetric grid presets (2/3+1/3, etc.) | 4 | 2 | P1 | Blocks | Column layout picker in Container |
| 10 | Named grid areas | 2 | 3 | P4 | Blocks | Advanced; low demand |
| 11 | Bento grid layout | 3 | 3 | P3 | Blocks | Mixed cell sizes; trending |

### 1.2 Container / Section Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 12 | Max-width / boxed / full-width toggle | 5 | 1 | P0 | Theme | Done via theme.json layout |
| 13 | Inner content width control | 4 | 1 | P0 | Theme | contentSize / wideSize |
| 14 | Background colour | 5 | 1 | P0 | Blocks | Native supports.color |
| 15 | Background gradient (linear, radial) | 4 | 1 | P0 | Blocks | Native supports.color.gradients |
| 16 | Background image with position/size/repeat | 4 | 3 | P2 | Blocks | Custom attribute + controls |
| 17 | Background video (autoplay, loop, muted) | 3 | 3 | P3 | Blocks | HTML5 video; medium demand |
| 18 | Background overlay with opacity | 4 | 2 | P1 | Blocks | Pseudo-element + controls |
| 19 | Background overlay blend modes | 3 | 1 | P2 | Blocks | CSS mix-blend-mode |
| 20 | Shape dividers (top/bottom SVG) | 4 | 3 | P2 | Blocks | SVG library + controls; Elementor has 18 |
| 21 | Border per side | 4 | 1 | P0 | Blocks | Native __experimentalBorder |
| 22 | Border radius per corner | 4 | 1 | P0 | Blocks | Native __experimentalBorder |
| 23 | Box shadow | 4 | 1 | P0 | Theme | theme.json shadow presets |
| 24 | Min-height / custom height | 4 | 2 | P1 | Blocks | Per-breakpoint; Hero needs this |
| 25 | Vertical/horizontal alignment | 5 | 1 | P0 | Blocks | Flexbox alignment controls |
| 26 | Overflow control | 3 | 1 | P2 | Ext | Extension attribute |

### 1.3 Spacing System

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 27 | Margin per side | 5 | 1 | P0 | Blocks | Native supports.spacing.margin |
| 28 | Padding per side | 5 | 1 | P0 | Blocks | Native supports.spacing.padding |
| 29 | Responsive spacing per breakpoint | 5 | 3 | P1 | Blocks | Requires ResponsiveControl on all blocks |
| 30 | Negative margins | 3 | 1 | P3 | Blocks | CSS native; overlapping elements |
| 31 | Fluid spacing (clamp) | 4 | 1 | P0 | Theme | theme.json fluid spacing |
| 32 | Linked/unlinked spacing toggle | 4 | 2 | P1 | Blocks | UI component for all spacing controls |
| 33 | Block gap (CSS gap) | 5 | 1 | P0 | Theme | theme.json spacing.blockGap |
| 34 | Responsive gap per breakpoint | 4 | 2 | P1 | Blocks | Per-block attribute |

### 1.4 Responsive Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 35 | Device visibility (show/hide per breakpoint) | 5 | 2 | P0 | Ext | Done in Phase 1.1 |
| 36 | Fluid typography (clamp) | 5 | 1 | P0 | Theme | theme.json typography.fluid |
| 37 | Per-breakpoint font size | 5 | 2 | P1 | Blocks | ResponsiveControl needed |
| 38 | Responsive images (srcset/sizes) | 5 | 1 | P0 | Framework | WordPress core automatic |
| 39 | Container queries | 3 | 2 | P3 | Blocks | 93% support; blocks adapt to container |
| 40 | Custom breakpoints | 2 | 3 | P4 | Theme | Low demand; 3 breakpoints sufficient |
| 41 | Art direction (different crops per breakpoint) | 2 | 4 | P4 | Blocks | Requires `<picture>` element |

### 1.5 Positioning

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 42 | Sticky elements (position: sticky) | 4 | 2 | P2 | Ext | Extension for any block |
| 43 | Sticky header | 5 | 2 | P0 | Theme | CSS on header template part |
| 44 | Z-index control | 3 | 1 | P3 | Ext | Extension attribute |
| 45 | Absolute positioning within container | 3 | 3 | P3 | Blocks | Decorative overlapping elements |

### 1.6 Advanced Layouts

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 46 | Masonry grid | 4 | 2 | P1 | Blocks | CSS column-count; for Gallery + Post Grid |
| 47 | Horizontal scroll sections | 3 | 4 | P3 | Blocks | GSAP ScrollTrigger or CSS scroll-snap |
| 48 | Full-screen sections (100vh) | 4 | 1 | P1 | Blocks | Min-height control on Container/Hero |
| 49 | Infinite/marquee scroll | 3 | 2 | P2 | Blocks | CSS animation; for logo bars |
| 50 | Scroll-snap sections | 3 | 2 | P3 | Blocks | Full-page snap scrolling |

### 1.7 Backgrounds

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 51 | Conic gradient | 2 | 1 | P3 | Blocks | CSS native; niche |
| 52 | Background pattern/texture | 3 | 2 | P3 | Blocks | SVG patterns; decorative |
| 53 | Noise/grain texture | 2 | 2 | P4 | Blocks | SVG feTurbulence; trendy |
| 54 | Animated gradient backgrounds | 3 | 1 | P3 | Blocks | CSS keyframes; eye-catching |
| 55 | Multiple stacked backgrounds | 3 | 2 | P3 | Blocks | CSS native; image + gradient + pattern |
| 56 | Parallax background (CSS) | 3 | 1 | P2 | Blocks | background-attachment: fixed |
| 57 | True parallax (JS-driven) | 3 | 3 | P3 | Blocks | GSAP; risky on mobile |

### 1.8 Dividers / Separators

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 58 | Horizontal rule variants | 3 | 1 | P2 | Theme | Styled core separator |
| 59 | SVG shape dividers (waves, angles, curves) | 4 | 3 | P2 | Blocks | Library of 15-20 SVG shapes |
| 60 | Custom SVG divider upload | 2 | 2 | P3 | Blocks | File upload + position control |
| 61 | Flip/invert dividers | 3 | 1 | P2 | Blocks | CSS transform: scaleX(-1) |
| 62 | Top + bottom independent dividers | 3 | 2 | P2 | Blocks | Separate controls per edge |

---

## 2. BLOCKS — MISSING (Phase 2)

| # | Block | Impact | Diff | Priority | Status | Notes |
|---|-------|--------|------|----------|--------|-------|
| 63 | Post Grid / Query Loop | 5 | 5 | P1 | Not started | Grid/list/masonry/carousel + AJAX pagination |
| 64 | Image Gallery + Lightbox | 5 | 4 | P1 | Not started | Grid/masonry/carousel + Interactivity API lightbox |
| 65 | Tabs | 5 | 3 | P1 | Not started | Horizontal/vertical, InnerBlocks, ARIA |
| 66 | Countdown Timer | 4 | 3 | P1 | Not started | Date-based + evergreen; flip/simple variants |
| 67 | Star Rating | 3 | 2 | P1 | Not started | SVG stars; Schema.org/Rating |
| 68 | Team Member | 4 | 2 | P1 | Not started | Photo/name/role/bio/socials; Schema.org/Person |
| 69 | Table of Contents | 4 | 3 | P2 | Broken | Auto-scan headings, scroll spy, collapsible |
| 70 | Pricing Table | 4 | 3 | P2 | Not started | 2-4 tiers, monthly/yearly toggle |
| 71 | Before/After Image Slider | 4 | 3 | P2 | Not started | Drag comparison; 137 Kadence votes unresolved |
| 72 | Icon Block | 3 | 2 | P2 | Not started | Single icon with link; uses Lucide library |
| 73 | Progress Bar | 3 | 2 | P2 | Not started | Horizontal/circular; animated on scroll |
| 74 | Flip Box | 3 | 2 | P3 | Not started | Front/back card flip on hover |
| 75 | Timeline | 4 | 3 | P2 | Not started | Vertical/horizontal; scroll reveal; 278 Kadence votes (their #1 request) |
| 76 | Video Popup/Lightbox | 3 | 3 | P3 | Not started | Thumbnail + play button opens lightbox |
| 77 | Logo Carousel / Marquee | 4 | 2 | P2 | Not started | Infinite scroll; for trust bars |
| 78 | Map / Google Maps | 3 | 2 | P2 | Not started | Styled embed with marker |
| 79 | Social Icons | 3 | 1 | P2 | Not started | Brand icons with links |
| 80 | Breadcrumbs | 3 | 2 | P2 | Not started | Schema.org/BreadcrumbList |
| 81 | Reading Progress Bar | 3 | 2 | P3 | Not started | Scroll-driven; CSS-only possible |
| 82 | Back to Top Button | 3 | 1 | P2 | Not started | Scroll-triggered fade-in |
| 83 | Lottie Animation | 2 | 3 | P4 | Not started | JSON animation player |
| 84 | Data Table | 3 | 3 | P3 | Not started | Responsive (scroll/stack); sortable |

---

## 3. BLOCK EXTENSIONS (Apply to All Blocks)

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 85 | Device visibility toggles | 5 | 2 | P0 | Ext | Done in Phase 1.1 |
| 86 | Per-element hover controls (bg/text/border colour) | 5 | 2 | P0 | Ext | Done in Phase 1.3 (4 blocks) |
| 87 | Hover scale transform | 4 | 1 | P1 | Ext | `transform: scale()` on hover |
| 88 | Hover shadow change (elevation) | 4 | 1 | P1 | Ext | Box-shadow transition |
| 89 | Hover border glow | 3 | 1 | P2 | Ext | Box-shadow with colour spread |
| 90 | Hover image zoom (inner) | 4 | 1 | P1 | Ext | overflow:hidden + scale on img |
| 91 | Transition duration/easing control | 4 | 1 | P1 | Ext | CSS transition shorthand |
| 92 | Scroll animation (fade in up/down/left/right) | 5 | 2 | P0 | Ext | Done: animation extension with 15 types |
| 93 | Scroll animation stagger delay | 4 | 1 | P1 | Ext | Animation-delay per item |
| 94 | Custom CSS per block | 4 | 3 | P2 | Ext | Textarea in inspector; scoped to block ID |
| 95 | Custom HTML attributes (data-*, aria-*) | 3 | 2 | P3 | Ext | Key-value pairs in inspector |
| 96 | Block link (wrap entire block in link) | 4 | 2 | P1 | Ext | URL + target in inspector |
| 97 | Copy/paste styles | 4 | 3 | P2 | Ext | Toolbar button; JSON clipboard |
| 98 | Save as default | 4 | 3 | P2 | Ext | wp_options storage; admin-only |
| 99 | Block style variations (register_block_style) | 4 | 2 | P1 | Framework | Multiple visual presets per block |
| 100 | Conditional display (user role/schedule/URL param) | 4 | 3 | P2 | Ext | Server-side render_block filter |

---

## 4. HOVER EFFECTS & MICRO-INTERACTIONS

### 4.1 Card/Block Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 101 | Scale transform | 4 | 1 | P1 | Yes | GPU-composited; safe |
| 102 | Shadow elevation shift | 4 | 1 | P1 | Yes | Paint-only; safe |
| 103 | Colour shift (background) | 4 | 1 | P0 | Yes | Done in Phase 1.3 |
| 104 | Image zoom (inner) | 4 | 1 | P1 | Yes | overflow:hidden + scale |
| 105 | Card flip (front/back) | 3 | 2 | P3 | Yes | 3D transform; Flip Box block |
| 106 | Reveal overlay (text over image) | 4 | 1 | P1 | Yes | opacity + transform; gallery |
| 107 | Slide-up content | 3 | 1 | P2 | Yes | translateY on child |
| 108 | Gradient shift | 2 | 1 | P3 | Yes | background-position animation |
| 109 | Card tilt (3D perspective) | 2 | 3 | P4 | No (JS) | mousemove tracking; niche |
| 110 | Magnetic cursor attraction | 2 | 3 | P4 | No (JS) | mousemove; creative sites only |
| 111 | Glassmorphism (backdrop-filter) | 3 | 1 | P3 | Yes | Frosted glass; 97% support |
| 112 | Border glow / neon | 3 | 1 | P2 | Yes | box-shadow with colour |
| 113 | Parallax depth on hover | 2 | 3 | P4 | No (JS) | Multi-layer; niche |
| 114 | Skeleton shimmer (loading) | 3 | 2 | P3 | Yes | For Post Grid loading state |

### 4.2 Text/Link Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 115 | Underline slide-in (left/centre) | 4 | 1 | P1 | Yes | ::after + scaleX; nav links |
| 116 | Underline colour change | 3 | 1 | P2 | Yes | text-decoration-color |
| 117 | Text shadow on hover | 2 | 1 | P3 | Yes | Subtle glow effect |
| 118 | Text gradient reveal | 2 | 1 | P3 | Yes | background-clip: text |
| 119 | Highlight/marker effect | 3 | 1 | P2 | Yes | Background on lower portion |
| 120 | Text colour sweep | 2 | 2 | P3 | Yes | Clip-path on duplicate text |
| 121 | Split text / stagger animation | 3 | 3 | P3 | No (JS) | GSAP SplitText; headings only |

### 4.3 Button/CTA Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 122 | Fill animation (left-to-right) | 4 | 1 | P1 | Yes | ::before scaleX; common |
| 123 | Fill animation (bottom-to-top) | 3 | 1 | P2 | Yes | ::before scaleY |
| 124 | Ripple effect (Material) | 3 | 2 | P2 | CSS/JS | Centre: CSS; click-position: JS |
| 125 | Icon slide (arrow extends) | 4 | 1 | P1 | Yes | translateX on icon |
| 126 | Border draw-in animation | 2 | 2 | P3 | Yes | Pseudo-elements |
| 127 | Pulse glow | 2 | 1 | P3 | Yes | box-shadow keyframes |
| 128 | 3D press / depth button | 3 | 1 | P2 | Yes | :active translateY |

### 4.4 Image Hover Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 129 | Ken Burns (slow zoom + pan) | 3 | 1 | P2 | Yes | keyframes; for hero |
| 130 | Colour-to-grayscale (or reverse) | 4 | 1 | P1 | Yes | filter: grayscale(); team/portfolio |
| 131 | Blur-to-sharp | 2 | 1 | P3 | Yes | filter: blur() transition |
| 132 | Overlay with text | 4 | 1 | P1 | Yes | opacity + transform; gallery |
| 133 | Duotone / hue shift | 3 | 1 | P2 | Yes | CSS filters combo |
| 134 | Clip-path reveal | 2 | 1 | P3 | Yes | clip-path: circle() |

### 4.5 Scroll Animations

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 135 | Fade in (up/down/left/right) | 5 | 2 | P0 | CSS/JS | Done: 15 animation types |
| 136 | Parallax scrolling | 3 | 2 | P2 | CSS/JS | CSS basic; JS for advanced |
| 137 | Counter animation (number count-up) | 4 | 2 | P1 | CSS/JS | IntersectionObserver; Counter block |
| 138 | Scroll progress bar | 3 | 1 | P2 | Yes | CSS scroll-driven animation |
| 139 | Staggered grid entry | 4 | 1 | P1 | Yes | nth-child animation-delay |
| 140 | Text reveal on scroll (word by word) | 3 | 3 | P3 | No (JS) | SplitText; headings only |
| 141 | Zoom on scroll | 2 | 1 | P3 | Yes | CSS scroll-driven |
| 142 | Horizontal scroll conversion | 2 | 4 | P4 | No (JS) | GSAP ScrollTrigger pin |

### 4.6 Loading & Transition Effects

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 143 | Skeleton screens | 3 | 2 | P2 | Yes | For Post Grid, dynamic content |
| 144 | Blur-up image loading (LQIP) | 3 | 3 | P3 | No (JS) | Tiny placeholder + fade |
| 145 | Page transitions (View Transitions API) | 3 | 3 | P3 | CSS/JS | 87% support; progressive |
| 146 | Staggered grid population | 4 | 1 | P1 | Yes | Same as #139 |

### 4.7 Micro-Interactions

| # | Feature | Impact | Diff | Priority | CSS-only? | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 147 | Toggle switch animation | 3 | 1 | P2 | Yes | Styled checkbox; for pricing |
| 148 | Form field focus effects (floating label) | 4 | 1 | P1 | Yes | :focus-within + transform |
| 149 | Toast notifications | 4 | 2 | P2 | No (JS) | For form submissions |
| 150 | Accordion smooth expand/collapse | 4 | 2 | P0 | CSS/JS | Done: details/summary animation |
| 151 | Tab sliding indicator | 3 | 2 | P1 | CSS/JS | Active tab underline slides |
| 152 | Scroll-to-top button reveal | 3 | 1 | P2 | CSS/JS | IntersectionObserver or scroll-driven |
| 153 | Like/heart animation | 2 | 2 | P4 | CSS/JS | Scale + colour burst |
| 154 | Success confetti | 2 | 3 | P4 | No (JS) | After form submit; fun but niche |

---

## 5. TYPOGRAPHY & TEXT

### 5.1 Font Controls Per Element

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 155 | Font family (body + headings) | 5 | 1 | P0 | Theme | Done: theme.json fontFamilies |
| 156 | Font size (static) | 5 | 1 | P0 | Blocks | Native supports.typography |
| 157 | Font size responsive per breakpoint | 5 | 2 | P1 | Blocks | ResponsiveControl needed |
| 158 | Font weight | 5 | 1 | P0 | Blocks | Native supports.typography |
| 159 | Line height | 5 | 1 | P0 | Blocks | Native supports.typography |
| 160 | Letter spacing | 4 | 1 | P1 | Blocks | Custom attribute per text element |
| 161 | Text transform (uppercase/lowercase/capitalise) | 4 | 1 | P1 | Blocks | Custom attribute per text element |
| 162 | Text decoration (underline/strikethrough styles) | 3 | 1 | P2 | Blocks | CSS text-decoration shorthand |
| 163 | Text alignment per breakpoint | 5 | 2 | P1 | Blocks | ResponsiveControl + textAlign |
| 164 | Variable font axes (weight/width/slant continuous) | 2 | 2 | P4 | Theme | Inter variable already used; UI uncommon |
| 165 | Custom font upload (WOFF2) | 4 | 2 | P0 | Theme | Done: self-hosted Inter |

### 5.2 Text Effects

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 166 | Text gradient fill | 3 | 1 | P2 | Blocks | background-clip: text |
| 167 | Text stroke / outline | 3 | 1 | P2 | Blocks | -webkit-text-stroke |
| 168 | Text shadow (multiple layers) | 3 | 1 | P2 | Blocks | Custom text-shadow control |
| 169 | Knockout text (image fill) | 2 | 2 | P3 | Blocks | background-clip: text + image |
| 170 | Animated text (typing/rotating words) | 3 | 3 | P3 | Blocks | JS required; heading block enhancement |
| 171 | Dual-colour heading | 4 | 2 | P2 | Blocks | Span-based; colour picker per segment |
| 172 | Drop cap | 3 | 1 | P2 | Theme | CSS initial-letter; Chrome 110+ |
| 173 | Marquee / ticker text | 3 | 2 | P2 | Blocks | CSS animation translateX |
| 174 | Highlighted / marked text (marker effect) | 3 | 1 | P2 | Blocks | Background on inline span |
| 175 | Text wrap: balance (headings) | 4 | 1 | P1 | Theme | CSS-only; 85% support; zero effort |
| 176 | Text wrap: pretty (body) | 3 | 1 | P2 | Theme | Chrome/Safari; progressive |

### 5.3 Heading Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 177 | Auto-generated anchor IDs | 4 | 2 | P0 | Blocks | Done: heading-anchors.php |
| 178 | Table of Contents (auto-scan headings) | 4 | 3 | P2 | Blocks | Block #69 above |
| 179 | Decorative heading separators (lines, dots, icons) | 3 | 2 | P2 | Blocks | ::before/::after + CSS |
| 180 | Numbered headings (CSS counters) | 2 | 1 | P3 | Theme | CSS counter-increment |
| 181 | Split-colour / dual-colour headings | 4 | 2 | P2 | Blocks | Same as #171 |

### 5.4 Rich Text & Content Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 182 | Inline code styling | 3 | 1 | P2 | Theme | CSS on `<code>` element |
| 183 | Blockquote variants (border, icon, pull quote) | 3 | 2 | P2 | Theme | Styled core Quote block |
| 184 | Footnotes | 3 | 1 | P0 | Framework | WordPress core (WP 6.3+) |
| 185 | Tooltips on hover | 3 | 2 | P2 | Blocks | CSS Anchor Positioning or JS |
| 186 | Reading time calculation | 3 | 1 | P2 | Blocks | PHP word count / 200 wpm |
| 187 | Text columns (CSS multi-column) | 2 | 1 | P3 | Blocks | column-count on Container |
| 188 | Custom text selection colour | 2 | 1 | P3 | Theme | CSS ::selection |

### 5.5 List Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 189 | Custom bullet icons (SVG/emoji) | 4 | 2 | P0 | Blocks | Done: Icon List block |
| 190 | Per-item custom icon + colour | 4 | 2 | P0 | Blocks | Done: Icon List block |
| 191 | Timeline list layout | 3 | 3 | P3 | Blocks | Block #75 above |
| 192 | Numbered list styling (circles, leading zeros) | 3 | 1 | P2 | Theme | CSS counter-style |

### 5.6 Link Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 193 | Link to anchor/element on page | 4 | 1 | P0 | Framework | HTML native |
| 194 | Link to phone/email/WhatsApp | 4 | 1 | P0 | Blocks | Done: WhatsApp CTA block |
| 195 | Link entire block (block link) | 4 | 2 | P1 | Ext | Same as #96 |
| 196 | Link opens in modal/lightbox | 3 | 3 | P2 | Blocks | JS; for Gallery lightbox |
| 197 | nofollow/sponsored/ugc rel attributes | 3 | 1 | P2 | Blocks | Link attribute in inspector |
| 198 | Link hover animation controls | 4 | 1 | P1 | Theme | Underline animation styles |

---

## 6. CONVERSION & MARKETING

### 6.1 CTA Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 199 | Button variants (solid/outline/ghost/gradient) | 5 | 2 | P1 | Blocks | Block style variations |
| 200 | Button sizes (XS to XL) | 4 | 1 | P1 | Blocks | Size attribute or tokens |
| 201 | Button groups (primary + secondary side-by-side) | 4 | 2 | P1 | Blocks | Hero/CTA Section dual buttons |
| 202 | Floating/sticky CTA bar | 4 | 3 | P2 | Blocks | Fixed bottom bar; mobile |
| 203 | Animated CTA (pulse/shimmer) | 3 | 1 | P2 | Blocks | CSS keyframes |
| 204 | Icon + text buttons | 4 | 1 | P0 | Blocks | Done in CTA Section |

### 6.2 Popup / Modal Features

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 205 | Lightbox popup (centred overlay) | 4 | 3 | P2 | Popups | SGS Popups plugin spec |
| 206 | Slide-in scroll box | 3 | 3 | P2 | Popups | Corner/edge slide |
| 207 | Floating bar (header/footer sticky) | 4 | 2 | P2 | Popups | Announcement bar |
| 208 | Exit-intent trigger | 4 | 3 | P3 | Popups | Mouse toward close |
| 209 | Scroll depth trigger | 3 | 2 | P2 | Popups | Percentage-based |
| 210 | Timed delay trigger | 3 | 1 | P2 | Popups | setTimeout |
| 211 | Click trigger (element opens modal) | 4 | 2 | P2 | Popups | Button/link opens popup |
| 212 | Cookie consent bar | 4 | 3 | P2 | Popups | GDPR/CCPA; category toggles |
| 213 | Frequency capping | 3 | 2 | P2 | Popups | Cookie-based; once per session/X days |
| 214 | Toast notifications | 4 | 2 | P2 | Framework | Form success, cart updates |

### 6.3 Social Proof

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 215 | Testimonial cards | 5 | 2 | P0 | Blocks | Done: Testimonial block |
| 216 | Testimonial carousel/slider | 5 | 2 | P0 | Blocks | Done: Testimonial Slider |
| 217 | Review stars (aggregate) | 4 | 2 | P1 | Blocks | Block #67 (Star Rating) |
| 218 | Client logo bar | 5 | 2 | P0 | Blocks | Done: Trust Bar |
| 219 | Trust badges | 4 | 1 | P0 | Blocks | Done: Certification Bar |
| 220 | Before/after image slider | 3 | 3 | P2 | Blocks | Block #71 |
| 221 | Counter animation (stats) | 4 | 2 | P0 | Blocks | Done: Counter block |
| 222 | Social share buttons | 3 | 2 | P2 | Blocks | Per-platform icons |
| 223 | Author bio box | 3 | 2 | P2 | Blocks | For blog posts |

### 6.4 Lead Generation & Forms

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 224 | Contact form | 5 | 3 | P0 | Forms | Done: SGS Forms |
| 225 | Multi-step form with progress | 5 | 3 | P0 | Forms | Done: Form Steps |
| 226 | Conditional logic (show/hide fields) | 4 | 4 | P2 | Forms | Phase 2 of forms spec |
| 227 | File upload with drag-and-drop | 3 | 3 | P2 | Forms | Phase 2 |
| 228 | Payment integration (Stripe) | 4 | 4 | P2 | Forms | Phase 2 |
| 229 | Address autocomplete | 3 | 3 | P3 | Forms | Google Places API |
| 230 | Smart field validation (real-time) | 4 | 2 | P1 | Forms | :user-invalid CSS; JS feedback |
| 231 | Auto-save/resume partial forms | 2 | 3 | P3 | Forms | localStorage |
| 232 | Quiz/calculator funnel | 3 | 4 | P3 | Forms | Multi-step + scoring |
| 233 | WhatsApp chat button | 4 | 1 | P0 | Blocks | Done: WhatsApp CTA block |

### 6.5 Pricing & E-Commerce

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 234 | Pricing table (2-4 tiers) | 4 | 3 | P2 | Blocks | Block #70 |
| 235 | Monthly/yearly toggle | 4 | 2 | P2 | Blocks | Within pricing table |
| 236 | Feature comparison matrix | 3 | 3 | P3 | Blocks | Table variant |
| 237 | Highlighted/recommended tier | 4 | 1 | P2 | Blocks | CSS class for emphasis |

### 6.6 Content Marketing

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 238 | Blog post grid | 5 | 5 | P1 | Blocks | Block #63 (Post Grid) |
| 239 | Category/tag filtering (AJAX) | 4 | 3 | P1 | Blocks | Within Post Grid |
| 240 | Search functionality | 4 | 2 | P2 | Theme | Enhanced core search |
| 241 | Reading progress bar | 3 | 2 | P2 | Blocks | Block #81 |
| 242 | Estimated reading time | 3 | 1 | P2 | Blocks | Feature #186 |
| 243 | Breadcrumbs + schema | 3 | 2 | P2 | Blocks | Block #80 |
| 244 | Related posts | 4 | 2 | P2 | Blocks | Post Grid variant |
| 245 | Next/previous post navigation | 3 | 1 | P2 | Theme | Template-level |

---

## 7. SEO & SCHEMA

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 246 | Article / BlogPosting schema | 4 | 2 | P2 | Theme | JSON-LD in templates |
| 247 | Organisation schema | 4 | 2 | P2 | Theme | Site-wide |
| 248 | LocalBusiness schema | 4 | 2 | P2 | Theme | For service businesses |
| 249 | FAQPage schema | 4 | 1 | P1 | Blocks | On Accordion block |
| 250 | Product schema (price, availability) | 3 | 2 | P3 | Blocks | For e-commerce clients |
| 251 | Review / Rating schema | 4 | 2 | P1 | Blocks | On Star Rating + Testimonial |
| 252 | Person schema | 3 | 2 | P1 | Blocks | On Team Member block |
| 253 | Event schema | 3 | 2 | P3 | Booking | SGS Booking |
| 254 | BreadcrumbList schema | 3 | 1 | P2 | Blocks | On Breadcrumbs block |
| 255 | HowTo schema | 3 | 2 | P3 | Blocks | On Process Steps block |
| 256 | Open Graph tags | 4 | 2 | P2 | Theme | Per-page meta |
| 257 | Twitter Cards | 3 | 1 | P2 | Theme | Per-page meta |
| 258 | Automatic alt text infrastructure | 4 | 1 | P0 | Framework | WordPress core |

---

## 8. ACCESSIBILITY (NON-NEGOTIABLE BASELINE)

| # | Feature | Impact | Diff | Priority | WCAG | Notes |
|---|---------|--------|------|----------|------|-------|
| 259 | Colour contrast 4.5:1 (text) / 3:1 (large) | 5 | 1 | P0 | 1.4.3 | Every block |
| 260 | UI component contrast 3:1 | 5 | 1 | P0 | 1.4.11 | Borders, focus indicators |
| 261 | Focus indicators (2px, 3:1 contrast) | 5 | 1 | P0 | 2.4.7 | All interactive elements |
| 262 | Touch targets 44x44px minimum | 5 | 1 | P0 | 2.5.8 | All buttons, links, controls |
| 263 | Skip navigation link | 5 | 1 | P0 | 2.4.1 | First focusable element |
| 264 | Semantic landmarks (header/nav/main/footer) | 5 | 1 | P0 | 1.3.1 | Template structure |
| 265 | Heading hierarchy | 5 | 1 | P0 | 1.3.1 | H1 > H2 > H3 logical order |
| 266 | Alt text for images | 5 | 1 | P0 | 1.1.1 | Every img element |
| 267 | prefers-reduced-motion respect | 5 | 1 | P0 | 2.3.3 | All animations |
| 268 | Keyboard operability (Tab/Enter/Space/Escape/Arrows) | 5 | 2 | P0 | 2.1.1 | All interactive blocks |
| 269 | No keyboard traps | 5 | 1 | P0 | 2.1.2 | Modals, dropdowns |
| 270 | ARIA roles (tablist/tab/tabpanel/dialog/alert) | 5 | 2 | P1 | 4.1.2 | Tabs, modals, sliders |
| 271 | aria-live regions for dynamic content | 4 | 2 | P1 | 4.1.3 | AJAX updates, form feedback |
| 272 | Focus not obscured by sticky elements | 4 | 1 | P1 | 2.4.11 | NEW in WCAG 2.2 |
| 273 | Dragging alternatives (single-pointer) | 3 | 2 | P2 | 2.5.7 | NEW in WCAG 2.2 |
| 274 | Content on hover: dismissable, hoverable, persistent | 4 | 2 | P1 | 1.4.13 | Tooltips, dropdowns |
| 275 | Form error identification + suggestions | 5 | 2 | P1 | 3.3.1/3.3.3 | SGS Forms |
| 276 | lang attribute on HTML | 5 | 1 | P0 | 3.1.1 | Template |
| 277 | Page titles (unique, descriptive) | 5 | 1 | P0 | 2.4.2 | WordPress core |
| 278 | No auto-playing content > 5 seconds without pause | 4 | 1 | P0 | 2.2.2 | Carousels, video |
| 279 | No flashing > 3 times/second | 5 | 1 | P0 | 2.3.1 | Animations |

---

## 9. PERFORMANCE

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 280 | Lazy loading images (loading="lazy") | 5 | 1 | P0 | Framework | WordPress core |
| 281 | fetchpriority="high" on LCP image | 4 | 1 | P1 | Blocks | Hero block render.php |
| 282 | Explicit image dimensions (CLS) | 5 | 1 | P0 | Framework | width + height attributes |
| 283 | font-display: swap | 5 | 1 | P0 | Theme | Done in @font-face |
| 284 | Self-hosted fonts (no CDN) | 5 | 1 | P0 | Theme | Done: Inter WOFF2 |
| 285 | Critical CSS inlining | 3 | 3 | P3 | Theme | Above-fold inline |
| 286 | content-visibility: auto on below-fold sections | 4 | 1 | P2 | Theme | 7x render improvement |
| 287 | CSS contain: layout paint on isolated blocks | 3 | 1 | P2 | Blocks | Optimise reflow |
| 288 | Conditional block CSS loading | 4 | 3 | P2 | Framework | Only load CSS for blocks on page |
| 289 | Image format: WebP/AVIF with fallback | 4 | 2 | P2 | Framework | WordPress 6.5+ AVIF support |
| 290 | Preconnect/preload critical resources | 4 | 1 | P0 | Theme | Done: font preload |
| 291 | No render-blocking JS | 5 | 1 | P0 | Blocks | viewScriptModule (deferred) |
| 292 | Performance budget (< 100KB CSS, < 50KB JS) | 5 | 2 | P0 | Framework | Non-negotiable |
| 293 | Core Web Vitals targets (LCP < 2.5s, INP < 200ms, CLS < 0.1) | 5 | 3 | P1 | Framework | Lighthouse audit |

---

## 10. CUTTING-EDGE CSS/JS TO ADOPT

| # | Feature | Support | Impact | Diff | Priority | WP Use Case |
|---|---------|---------|--------|------|----------|-------------|
| 294 | CSS Nesting | 87% | 4 | 1 | P1 | Cleaner block stylesheets |
| 295 | :has() selector | 82% | 4 | 1 | P1 | Parent-aware styling |
| 296 | color-mix() | 92% | 4 | 1 | P1 | Generate hover tints from single token |
| 297 | @layer (cascade layers) | 90% | 4 | 2 | P2 | Specificity management |
| 298 | @scope | 87% | 3 | 2 | P2 | Prevent style leaking into InnerBlocks |
| 299 | Popover API | 88% | 4 | 2 | P2 | JS-free tooltips and dropdowns |
| 300 | @starting-style | 86% | 4 | 1 | P1 | **S-TIER:** CSS-only entry/exit animations; Baseline; replaces JS timing hacks |
| 301 | @property (registered custom properties) | 88% | 3 | 2 | P2 | Animatable CSS variables |
| 302 | light-dark() | 85% | 4 | 1 | P2 | Single-line dark mode values; required for dark mode toggle |
| 303 | Scroll-driven animations | 95%+ | 5 | 2 | P1 | **S-TIER:** Replace AOS.js entirely; CSS-only; Baseline 2025; no WP plugin has native controls |
| 304 | View Transitions API | 87% | 4 | 1 | P2 | **S-TIER:** Single CSS rule for app-like page transitions; no WP theme offers this |
| 305 | Anchor Positioning | 80%+ | 4 | 2 | P2 | **S-TIER:** JS-free tooltip/popover positioning; Interop 2026 |
| 306 | :user-invalid / :user-valid | 85% | 4 | 1 | P1 | Form validation UX |
| 307 | :focus-visible | 96% | 5 | 1 | P0 | Done: keyboard-only focus rings |
| 308 | Container queries | 93% | 3 | 2 | P3 | Blocks adapt to container width |
| 309 | Subgrid | 85% | 3 | 2 | P3 | Cross-card alignment |
| 310 | CSS Custom Highlight API | 85% | 2 | 3 | P3 | Search highlighting; Client Notes |
| 311 | Speculation Rules API | Chromium | 3 | 2 | P4 | Instant page prerendering |
| 312 | CSS if() | Chromium | 2 | 2 | P4 | Conditional values inline |
| 313 | CSS Carousel primitives | Chromium | 3 | 2 | P4 | CSS-only carousels |
| 314 | contrast-color() | Safari+FF | 4 | 1 | P3 | **S-TIER:** Auto accessible text colour; progressive enhancement; Safari 26.2 + Firefox 147 |

---

## 11. SECURITY & STANDARDS

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 315 | WordPress nonces on all forms | 5 | 1 | P0 | Forms | Non-negotiable |
| 316 | Capability checks on all actions | 5 | 1 | P0 | Framework | Non-negotiable |
| 317 | Output escaping (esc_html, esc_attr, esc_url) | 5 | 1 | P0 | Framework | Non-negotiable |
| 318 | Prepared statements ($wpdb->prepare) | 5 | 1 | P0 | Framework | Non-negotiable |
| 319 | Input sanitisation at boundaries | 5 | 1 | P0 | Framework | Non-negotiable |
| 320 | No secrets in frontend | 5 | 1 | P0 | Framework | Non-negotiable |
| 321 | RTL layout support (CSS logical properties) | 3 | 3 | P3 | Theme | i18n readiness |
| 322 | Translation-ready strings (__(), _e()) | 4 | 1 | P0 | Framework | All user-facing text |
| 323 | Print stylesheet | 3 | 2 | P3 | Theme | Hide nav/footer, show URLs |

---

## 12. CONDITIONAL DISPLAY

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 324 | Show/hide by device | 5 | 2 | P0 | Ext | Done: Phase 1.1 |
| 325 | Show/hide by user role (logged in/out) | 4 | 2 | P2 | Ext | render_block filter |
| 326 | Show/hide by date/time schedule | 3 | 2 | P2 | Ext | Start/end date |
| 327 | Show/hide by URL parameter | 3 | 2 | P3 | Ext | Query string check |
| 328 | Show/hide by post type / taxonomy | 3 | 2 | P3 | Ext | Context-aware display |
| 329 | AND/OR condition logic | 3 | 3 | P3 | Ext | Multiple conditions combined |

---

## 13. BLOCK PATTERNS LIBRARY

| # | Category | Count | Impact | Diff | Priority | Notes |
|---|----------|-------|--------|------|----------|-------|
| 330 | Hero patterns | 5 | 4 | 2 | P2 | Full-width, split, video, centred, gradient |
| 331 | Feature patterns | 5 | 4 | 2 | P2 | Icon grid, alternating, steps, comparison, cards |
| 332 | Testimonial patterns | 3 | 3 | 2 | P2 | Single, slider, grid |
| 333 | CTA patterns | 3 | 4 | 2 | P2 | Banner, split, gradient+countdown |
| 334 | Content patterns | 5 | 3 | 2 | P2 | FAQ, team, pricing, timeline, stats |
| 335 | Footer patterns | 3 | 3 | 2 | P2 | 3-col, 4-col, centred |
| 336 | Header patterns | 4 | 3 | 2 | P2 | Standard (sticky/non-sticky), transparent overlay, centred logo |
| 337 | Blog patterns | 3 | 3 | 2 | P2 | Magazine, sidebar, full-width |

---

## 14. DARK MODE

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 338 | Dark mode toggle (user preference) | 4 | 2 | P2 | Theme | `prefers-color-scheme` media query + manual toggle button; stores preference in localStorage |
| 339 | Dark mode colour palette in theme.json | 4 | 2 | P2 | Theme | Separate dark palette mapped with `light-dark()` or CSS custom property swap on `[data-theme="dark"]` |
| 340 | Dark mode per-block preview in editor | 3 | 3 | P3 | Ext | Preview blocks in dark context while editing; toggle in editor toolbar |

---

## 15. S-TIER DIFFERENTIATORS (Nobody Else Has These)

> Features identified through competitive research (Feb 2026) that no WordPress plugin or theme currently offers. These are the features that push SGS from Grade B to Grade A.

### 15.1 CSS-Native Interactions (No JavaScript)

| # | Feature | Impact | Diff | Priority | Component | Browser Support | Notes |
|---|---------|--------|------|----------|-----------|----------------|-------|
| 341 | Scroll-driven animation controls in block inspector | 5 | 3 | P1 | Ext | 95%+ (Baseline) | Per-element scroll animation presets (fade-up, parallax, progress). Built on CSS `animation-timeline: view()`. No JS. First WP plugin to offer this natively. See also #303 |
| 342 | CSS-only entry/exit animations (@starting-style) | 4 | 1 | P1 | Ext | Baseline | Accordion, modal, popover blocks animate open/close with zero JS. Combined with `transition-behavior: allow-discrete`. See also #300 |
| 343 | Container scroll-state queries | 4 | 2 | P2 | Theme | Chrome 133+ | Sticky header changes appearance when stuck (shrink, shadow, bg change) — pure CSS, no JS scroll listeners |
| 344 | CSS Grid Lanes (native masonry) | 3 | 2 | P2 | Blocks | Safari TP + Chrome 140 | `display: grid-lanes` for zero-JS masonry. Ship with `column-count` fallback. First to market |

### 15.2 Accessibility Innovation

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 345 | `prefers-contrast` support | 4 | 1 | P1 | Theme | High-contrast alternative styles: thicker borders, solid backgrounds, no gradients. First WP theme to support this. 3 CSS lines per block |
| 346 | Native `<dialog>` for modals | 4 | 2 | P1 | Blocks | Built-in focus trapping, Escape to close, `::backdrop`. Replaces ARIA-heavy div modals. No competitor uses this |
| 347 | Native Popover API for tooltips/dropdowns | 4 | 2 | P2 | Blocks | `popover` attribute for JS-free show/hide with light-dismiss. 88% support. Combined with Anchor Positioning (#305) for zero-JS positioning |
| 348 | APCA contrast checking in editor | 3 | 3 | P3 | Ext | Advanced Perceptual Contrast Algorithm — next-gen contrast science (WCAG 3.0 candidate). Show alongside current WCAG 2.2 ratios |
| 349 | Accessibility statement generator | 3 | 3 | P3 | Theme | Auto-generated accessibility statement page based on which blocks/features the site uses. Required by European Accessibility Act (EAA) |

### 15.3 Visual Differentiators

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 350 | Bento Grid block | 4 | 3 | P2 | Blocks | Mixed-size card grid with per-tile sizing, exaggerated border-radius (12-24px), hover animations. Hottest layout trend 2025-2026. No native WP block |
| 351 | Kinetic Typography block | 3 | 4 | P3 | Blocks | Word-by-word reveal, letter stagger, variable font weight shift on scroll. Built on CSS scroll-driven animations. Webflow territory, but in WordPress |
| 352 | Cursor-reactive elements extension | 2 | 3 | P4 | Ext | Three presets: magnetic (pull toward cursor), tilt (3D perspective shift), glow (light follows cursor). JS required but minimal. Premium creative agency feel |

### 15.4 Developer & Client Experience

| # | Feature | Impact | Diff | Priority | Component | Notes |
|---|---------|--------|------|----------|-----------|-------|
| 353 | In-editor performance dashboard | 4 | 4 | P3 | Framework | Sidebar panel showing estimated page weight (CSS, JS, images), animation count, CWV traffic light. Warn when over budget. No builder offers this |
| 354 | Style variation client onboarding system | 4 | 3 | P2 | Theme | Variations configure entire site personality: default hero layout, CTA style, nav pattern, footer structure, industry-specific block presets — not just colours and fonts |

---

## VERIFICATION AUDIT (2026-02-22, Session 24)

> **Purpose:** Every P0 item below was checked against the live site (palestine-lives.org) and codebase. Items are categorised by verification status, not by whether code exists.

### P0 Verification — Three Buckets

#### Verified Working (~35 items)

Confirmed by Playwright testing on live site, code review, or WordPress core guarantee:

| # | Feature | How verified |
|---|---------|-------------|
| 1 | Responsive columns per breakpoint | Live homepage — Card Grid renders 4 cols desktop, stacks mobile |
| 6 | Nested grids | Container + InnerBlocks confirmed in codebase |
| 12 | Max-width / boxed / full-width | theme.json layout.contentSize / wideSize confirmed |
| 13 | Inner content width control | theme.json confirmed |
| 14 | Background colour | Native supports.color in all block.json files |
| 15 | Background gradient | Native supports.color.gradients in all block.json files |
| 21 | Border per side | Native __experimentalBorder in block.json files |
| 22 | Border radius per corner | Native __experimentalBorder in block.json files |
| 23 | Box shadow presets | theme.json — 4 presets (sm, md, lg, glow) confirmed |
| 25 | Vertical/horizontal alignment | Flexbox controls in block.json files |
| 27 | Margin per side | Native supports.spacing.margin |
| 28 | Padding per side | Native supports.spacing.padding |
| 33 | Block gap (CSS gap) | theme.json spacing.blockGap confirmed |
| 36 | Fluid typography | theme.json typography.fluid with min/max on 5/6 sizes |
| 38 | Responsive images srcset/sizes | WordPress core automatic |
| 155 | Font family (body + headings) | theme.json fontFamilies — Inter, DM Serif, DM Sans confirmed |
| 156 | Font size (static) | Native supports.typography confirmed |
| 158 | Font weight | Native supports.typography confirmed |
| 159 | Line height | Native supports.typography confirmed |
| 165 | Custom font upload (WOFF2) | Self-hosted Inter variable confirmed on live site |
| 184 | Footnotes | WordPress core (WP 6.3+) |
| 193 | Link to anchor/element | HTML native |
| 204 | Icon + text buttons | CTA Section renders dual buttons on live homepage |
| 215 | Testimonial cards | Testimonial block in codebase |
| 216 | Testimonial carousel/slider | Live homepage — arrows + dots work, slides change |
| 218 | Client logo bar | Live homepage — brand strip marquee renders |
| 258 | Automatic alt text infrastructure | WordPress core |
| 266 | Alt text for images | WordPress core |
| 276 | lang attribute on HTML | WordPress core template |
| 277 | Page titles | WordPress core |
| 280 | Lazy loading images | WordPress core |
| 282 | Explicit image dimensions | WordPress core |
| 283 | font-display: swap | Confirmed in theme.json fontFace declarations |
| 284 | Self-hosted fonts | Confirmed — no CDN calls on live site |
| 290 | Preconnect/preload | Font preload exists in functions.php |
| 291 | No render-blocking JS | All 10 blocks use viewScriptModule (deferred) |
| 307 | :focus-visible | CSS rule confirmed in codebase |

#### Code Exists But Unverified (~17 items)

Block or extension code is written and deployed, but never placed on a live page or tested end-to-end:

| # | Feature | Issue |
|---|---------|-------|
| 35 | Device visibility toggles | Extension registered, never tested on live page |
| 86 | Per-element hover controls | Only on 4 blocks (Card Grid, CTA, Hero, Info Box) — not universal |
| 92 | Scroll animation (15 types) | Extension registered, never seen firing on live page |
| 103 | Colour shift (background) | Only on 4 blocks, never tested on live page |
| 135 | Fade in animations | Part of animation extension, never tested |
| 150 | Accordion smooth expand | Accordion block exists, not on any live page |
| 177 | Auto-generated anchor IDs | heading-anchors.php exists, untested on live page |
| 189 | Custom bullet icons | Icon List block exists, not on any live page |
| 190 | Per-item custom icon + colour | Icon List block exists, not on any live page |
| 194 | Link to phone/email/WhatsApp | WhatsApp CTA block exists, not on any live page |
| 219 | Trust badges | Certification Bar exists, not on any live page |
| 221 | Counter animation | Counter block exists, not on any live page |
| 224 | Contact form | Form blocks exist, never submitted, CRITICAL security issues |
| 225 | Multi-step form with progress | Form steps exist, never tested end-to-end |
| 233 | WhatsApp chat button | WhatsApp CTA exists, not on any live page |
| 279 | No flashing > 3 times/sec | No known violations, but never formally checked |
| 324 | Device visibility by device | Same as #35 |

#### Failed Verification (~13 items)

These were claimed P0 but failed when tested:

| # | Feature | Failure | Severity |
|---|---------|---------|----------|
| 31 | Fluid spacing (clamp) | spacingSizes uses static rem values, no `fluid: true` | Medium |
| 43 | Sticky header | `position: sticky` on inner div inside `<header>` — doesn't stick when scrolling | High |
| 292 | Performance budget | JS = 70KB (over 50KB budget) — wp-emoji-release.min.js adds 22.2KB dead weight | Medium |
| 315 | WordPress nonces on all forms | CRITICAL — Form submit + upload endpoints have NO nonce verification | Critical |
| 316 | Capability checks on all actions | Upload endpoint uses `__return_true` permission callback | Critical |
| 317 | Output escaping | form/render.php echoes $content without phpcs annotation | Medium |
| 319 | Input sanitisation at boundaries | REST `fields` param has no per-field sanitisation at schema level | Medium |
| 320 | No secrets in frontend | N8N webhook URL stored in block attributes (publicly readable via REST API) | Critical |
| 322 | Translation-ready strings | 9 user-facing strings missing __()/_e() in 2 files | Low |
| 259 | Colour contrast 4.5:1 | FIXED — Footer headings 1.52:1 → 10.98:1, header CTA 3.62:1 → 4.60:1 | High |
| 261 | Focus indicators (2px, 3:1) | FIXED — Yellow accent (1.68:1) replaced with primary-dark (5.54:1) across 7 CSS files | High |
| 262 | Touch targets 44x44px | FIXED — Hamburger 24→44px, social icons 16→44px. Footer links ~30px (meets WCAG 2.5.8) | Medium |
| 265 | Heading hierarchy | FIXED — Footer H6 → H2, full logical hierarchy restored | Medium |
| 278 | No auto-play > 5 seconds | FIXED — Pause/Play toggle button added to testimonial slider | Medium |
| 260 | UI component contrast 3:1 | PASS — no failing UI borders | — |
| 263 | Skip navigation link | PASS — first focusable element, proper pattern | — |
| 264 | Semantic landmarks | PASS — header/nav/main/footer all present | — |
| 267 | prefers-reduced-motion | PASS — all animations respect it | — |
| 268 | Keyboard operability | PASS — slider, nav keyboard-accessible | — |
| 269 | No keyboard traps | PASS — no traps found | — |

### Additional Issues Found (not in original P0 list)

| Finding | Severity | Detail |
|---------|----------|--------|
| IP spoofing defeats rate limiter | High | X-Forwarded-For header trusted without validation |
| SSRF via webhook URL | High | wp_remote_post() with unvalidated URL from block attributes |
| CSS injection via colour slug | Medium | sgs_colour_value() doesn't validate slug chars |
| No capability gate for submissions | High | No admin UI or access control for stored form data |
| Hero image missing fetchpriority | Medium | LCP image has no `fetchpriority="high"` |
| Emoji script dead weight | Medium | 22.2KB JS loaded on every page for nothing |
| Missing favicon | Low | 404 on every page load |
| Hover controls not universal | Architectural | Per-block, not an extension — needs refactoring |
| Blog/contact pages 404 | Content | Most nav links lead to non-existent pages |

### Honest P0 Count

| Category | Count |
|----------|-------|
| **Verified working** | ~35 |
| **Code exists, unverified** | ~17 |
| **Failed verification** | ~13 |
| **Original P0 claim** | ~65 |

> **The honest P0 "done" count drops from ~65 to ~35 verified.** The other 30 are either untested or broken. The security failures are the most urgent — 3 CRITICAL issues in the form system mean forms should not be used in production until fixed.

---

## SUMMARY SCORECARD

### Total Features Audited: 354

| Priority | Count | Description |
|----------|-------|-------------|
| **P0 (Verified done)** | ~35 | Theme tokens, native WP supports, 6 blocks on live page, core WP features |
| **P0 (Code exists, unverified)** | ~17 | Blocks and extensions deployed but never tested end-to-end |
| **P0 (Failed)** | ~13 | Security, performance, sticky header, fluid spacing, translation |
| **P1 (Must have)** | ~65 | Missing blocks, responsive controls, hover effects, modern CSS, S-tier CSS features |
| **P2 (Should have)** | ~120 | Advanced blocks, patterns, popups, SEO, performance, dark mode, bento grid, client onboarding |
| **P3 (Nice to have)** | ~65 | Creative effects, niche blocks, advanced interactions, APCA, kinetic typography |
| **P4 (Future/watch)** | ~39 | Experimental CSS, cursor effects, gamification |

### Framework Maturity Score (Verified — 2026-02-22)

| Domain | Claimed | Verified | Max | % Verified |
|--------|---------|----------|-----|------------|
| Core Blocks | 32 | 22 | 49 | 45% |
| Block Extensions | 3 | 1 | 14 | 7% |
| Theme Features | 18 | 14 | 33 | 42% |
| Typography | 8 | 6 | 20 | 30% |
| Hover/Interactions | 4 | 2 | 30 | 7% |
| Scroll Animations | 1 | 0 | 10 | 0% |
| Accessibility | 15 | 5 | 27 | 19% |
| Performance | 8 | 5 | 18 | 28% |
| SEO/Schema | 1 | 1 | 13 | 8% |
| Forms | 8 | 0 | 12 | 0% |
| Patterns Library | 0 | 0 | 27 | 0% |
| Dark Mode | 0 | 0 | 11 | 0% |
| S-Tier Differentiators | 0 | 0 | 30 | 0% |
| **TOTAL** | **98** | **56** | **294** | **19%** |

> **Reality check:** The claimed 33% maturity was inflated. Verified maturity is 19%. The gap is mostly in accessibility (never audited), forms (security broken), scroll animations (never tested), and block extensions (only 1 of 3 verified). The "code exists" items can be recovered by creating test content and fixing the ~13 failed items — but they aren't "done" until verified.

### Target After Phase 2-3 Completion

| Domain | Current | After P2-3 | Max | % After |
|--------|---------|-----------|-----|---------|
| Core Blocks | 32 | 44 | 49 | 90% |
| Block Extensions | 3 | 10 | 14 | 71% |
| Theme Features | 18 | 26 | 33 | 79% |
| Typography | 8 | 14 | 20 | 70% |
| Hover/Interactions | 4 | 15 | 30 | 50% |
| Scroll Animations | 1 | 7 | 10 | 70% |
| Accessibility | 15 | 23 | 27 | 85% |
| Performance | 8 | 12 | 18 | 67% |
| SEO/Schema | 1 | 6 | 13 | 46% |
| Forms | 8 | 10 | 12 | 83% |
| Patterns Library | 0 | 20 | 27 | 74% |
| Dark Mode | 0 | 8 | 11 | 73% |
| S-Tier Differentiators | 0 | 18 | 30 | 60% |
| **TOTAL** | **98** | **213** | **294** | **72%** |

### Target After S-Tier Phase (Full Roadmap)

| Domain | After P2-3 | After S-Tier | Max | % After |
|--------|-----------|-------------|-----|---------|
| Core Blocks | 44 | 47 | 49 | 96% |
| Block Extensions | 10 | 13 | 14 | 93% |
| Theme Features | 26 | 31 | 33 | 94% |
| Typography | 14 | 17 | 20 | 85% |
| Hover/Interactions | 15 | 22 | 30 | 73% |
| Scroll Animations | 7 | 9 | 10 | 90% |
| Accessibility | 23 | 26 | 27 | 96% |
| Performance | 12 | 16 | 18 | 89% |
| SEO/Schema | 6 | 10 | 13 | 77% |
| Forms | 10 | 11 | 12 | 92% |
| Patterns Library | 20 | 25 | 27 | 93% |
| Dark Mode | 8 | 11 | 11 | 100% |
| S-Tier Differentiators | 18 | 28 | 30 | 93% |
| **TOTAL** | **213** | **266** | **294** | **90%** |

> **After full S-tier implementation: Grade A (90%).** This puts SGS ahead of every competitor except Kadence (85% on the original scale). With the expanded S-tier features that Kadence doesn't have (scroll-driven animations, View Transitions, contrast-color, prefers-contrast, native HTML elements), SGS would effectively be **the most technically advanced WordPress block framework in existence**.

---

## COMPETITIVE POSITION

### After Phase 2-3 (Grade B, 72%)

| Competitor | Free Blocks | Patterns | Responsive | Hover Controls | Accessibility | SGS Advantage |
|-----------|-------------|----------|------------|---------------|---------------|---------------|
| Kadence | 20 | 800+ | Full | Full | Best (100%) | Pattern count |
| Spectra | 42 | 150+ | Full | Partial | Poor (D) | Stability, a11y |
| GenerateBlocks | 6 | 200+ | Full | Full | Good (B) | Block count, forms |
| Elementor | 100+ | 1000+ | Full | Full | Poor (C) | Perf, a11y, lighter |
| Webflow | N/A | 1000+ | Full | Full | Good (B) | No lock-in, WP native |
| **SGS (after P2-3)** | **40** | **27+** | **Full** | **Full** | **Excellent (A)** | **Free depth, a11y, stability** |

### After S-Tier Phase (Grade A, 90%)

| Feature | Kadence | Elementor | Webflow | Bricks | **SGS** |
|---------|---------|-----------|---------|--------|---------|
| Scroll-driven animations (CSS-only) | No | No | JS-based | No | **Yes** |
| View Transitions API | No | No | No | No | **Yes** |
| `prefers-contrast` support | No | No | No | No | **Yes** |
| `contrast-color()` auto-text | No | No | No | No | **Yes** |
| Native `<dialog>` modals | No | No | No | No | **Yes** |
| Native Popover API | No | No | No | No | **Yes** |
| `@starting-style` animations | No | No | No | No | **Yes** |
| Dark mode toggle | Pro only | No | Yes | Yes | **Yes (free)** |
| Bento Grid block | No | No | Yes | No | **Yes** |
| Performance dashboard | No | No | No | No | **Yes** |
| WCAG 2.2 AA + prefers-contrast | 100% AA | Partial | Partial | Partial | **100% AA + contrast** |

**SGS differentiators (after full roadmap):**
1. More free blocks than Kadence (40+ vs 20)
2. Built-in forms (12 field types free — Kadence is Pro only)
3. WCAG 2.2 AA + `prefers-contrast` + `contrast-color()` = most accessible WP framework
4. No update breakage (dynamic blocks avoid save.js deprecation hell)
5. CSS-native scroll animations (zero JS — nobody in WP does this)
6. View Transitions for app-like page navigation (first WP theme ever)
7. Native HTML elements (`<dialog>`, Popover API) for lighter, more accessible interactive blocks
8. AJAX filtering + pagination together (Kadence's top feature request, 239 votes)
9. Dark mode with `light-dark()` and `prefers-color-scheme` (free, not Pro-only)
10. Zero licensing cost for the full feature set
