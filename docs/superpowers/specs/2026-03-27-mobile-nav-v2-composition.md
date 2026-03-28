# sgs/mobile-nav v2 — Composition Architecture

> **Status:** Architecture spec. Not started. Current v1 (monolithic, 75 attributes) is shipped and working.
> **Depends on:** WP 7.0 navigation overlays (April 2026), sgs/container block, sgs/social-icons block.
> **Author:** Session 9 (2026-03-27)

---

## Problem

The v1 mobile-nav block is a 985-line monolithic renderer with 75 attributes. Every new feature requires a new attribute, a new PHP render method, new CSS, and a new editor control. The 7 hardcoded zones (header, account tray, search, CTA, nav, socials, tagline) can't be reordered, removed, or extended without code changes. Clients can't add a testimonial, opening hours, or promo banner to the drawer without developer intervention.

This violates three principles:
1. **Single responsibility** — the block handles animation AND layout AND content rendering
2. **Open/closed** — adding features requires modifying the class, not extending it
3. **Client experience** — everything not exposed as an attribute is invisible to clients

## Solution

Split into shell + composition. The mobile-nav block becomes the animation shell only. The content is composed from real blocks inside `sgs/container` wrappers, pre-assembled via block patterns.

---

## Architecture

### The Shell: sgs/mobile-nav v2

**Responsibility:** Popover API, animation, trigger, swipe-to-close, scroll lock, backdrop, focus trap.

**~20 attributes:**

| Attribute | Type | Default | Purpose |
|-----------|------|---------|---------|
| variant | enum | overlay | overlay, slide-left, slide-right, bottom-sheet |
| breakpoint | number | 1024 | px below which hamburger shows |
| animationPreset | enum | spring | snappy, smooth, spring, bouncy, none, custom |
| staggerDelay | number | 25 | ms between item reveals |
| backdropOpacity | number | 60 | % opacity of backdrop overlay |
| backdropBlur | boolean | false | Enable backdrop-filter blur |
| backdropBlurAmount | number | 8 | px blur radius |
| enableSwipe | boolean | true | Swipe-to-close gesture |
| desktopHamburger | boolean | false | Show hamburger at all sizes |

Plus 5 responsive overrides (mobile/tablet for width etc.) = ~15 more if needed.

**What it renders:**

```html
<nav id="sgs-mobile-nav"
     class="sgs-mobile-nav sgs-mobile-nav--overlay"
     popover="manual"
     role="dialog"
     aria-modal="true"
     aria-label="Mobile navigation">

    <!-- InnerBlocks content goes here -->

</nav>
```

That's it. The shell is a styled `<nav>` with popover behaviour. All content comes from InnerBlocks.

**What it owns:**
- CSS for the 4 drawer variants (position, transform, transitions)
- Spring/easing animation via CSS custom properties
- `::backdrop` styling (colour, opacity, blur)
- `@starting-style` for entry animation
- Stagger cascade via `--i` counter on direct children
- `view.js` for: popover open/close, swipe gesture, scroll lock, focus trap, ESC handler, `inert` management, `aria-expanded` on trigger

**What it does NOT own:**
- Logo rendering
- CTA buttons
- Navigation menu
- Social icons
- Close button
- Any content layout

### The Content: Block Patterns Using sgs/container

Each pattern pre-composes the drawer content from standard blocks. Clients can rearrange, remove, or add blocks freely after insertion.

**Pattern: Mobile Nav — B2B Trade**

```
sgs/mobile-nav { variant: "overlay", animationPreset: "spring" }
└── sgs/container { layout: "stack", gap: "40", htmlTag: "div" }
    ├── sgs/container { layout: "flex", verticalAlign: "center", gap: "20", htmlTag: "div" }
    │     ├── core/site-logo { width: 120 }
    │     └── sgs/mobile-nav-close { style: "circle" }
    ├── core/buttons
    │     ├── core/button { text: "Apply for Account", url: "/apply/", style: "fill" }
    │     └── core/button { text: "Call Us", url: "tel:...", className: "is-style-outline" }
    ├── core/navigation { ref: 100 }
    ├── sgs/social-icons { style: "coloured", size: 44 }
    └── core/paragraph { content: "Family-run since 1962", fontSize: "small", opacity: 0.6 }
```

**Pattern: Mobile Nav — Restaurant**

```
sgs/mobile-nav { variant: "bottom-sheet", animationPreset: "smooth" }
└── sgs/container { layout: "stack", gap: "40" }
    ├── sgs/container { layout: "flex", verticalAlign: "center" }
    │     ├── core/site-logo { width: 140 }
    │     └── sgs/mobile-nav-close { style: "circle" }
    ├── core/buttons
    │     ├── core/button { text: "Book a Table", style: "fill" }
    │     └── core/button { text: "Call Us", className: "is-style-outline" }
    ├── core/navigation { ref: 100 }
    ├── sgs/whatsapp-cta { text: "Message us on WhatsApp" }
    ├── sgs/social-icons { style: "plain", size: 44 }
    └── core/paragraph { content: "Open 7 days a week", fontSize: "small" }
```

**Pattern: Mobile Nav — Minimal**

```
sgs/mobile-nav { variant: "slide-left", animationPreset: "snappy" }
└── sgs/container { layout: "stack", gap: "30" }
    ├── sgs/mobile-nav-close { style: "plain" }
    ├── core/navigation { ref: 100 }
    └── sgs/social-icons { style: "plain", size: 36 }
```

Six patterns total, matching the v1 presets: Default, E-commerce, Restaurant, B2B Trade, Minimal, Brand Forward.

---

## New Blocks Required

### sgs/mobile-nav-close

Tiny block. Renders a close button that targets the parent drawer's popover.

**Attributes:**
- `style` (enum: circle, square, plain) — default "circle"
- `size` (number) — default 48

**Render:**
```html
<button type="button"
        class="sgs-mobile-nav-close sgs-mobile-nav-close--circle"
        popovertarget="sgs-mobile-nav"
        popovertargetaction="hide"
        aria-label="Close menu">
    <svg><!-- X icon --></svg>
</button>
```

~30 lines of PHP. No JS. CSS inherits from the shell's colour scheme.

### sgs/social-icons

Reads social URLs from Business Details settings (`sgs_social_*` options). Renders an icon row. Reusable in footer, drawer, sidebar, anywhere.

**Attributes:**
- `style` (enum: coloured, plain, outline) — default "coloured"
- `size` (number) — default 44
- `alignment` (enum: left, centre, right) — default "centre"

**Render:** Queries `get_option('sgs_social_linkedin')`, etc. Renders SVG icons with links. Skips empty URLs.

~100 lines of PHP. No JS. Could replace the hardcoded social rendering in the footer template too.

---

## What Happens to v1 Attributes

| v1 Attribute Group | Count | v2 Equivalent |
|---|---|---|
| Animation/popover/swipe | ~15 | Stays in sgs/mobile-nav shell |
| Drawer colours (17) | 17 | Moved to sgs/container `supports.color` |
| Logo (3) | 3 | Replaced by core/site-logo attributes |
| CTA (12) | 12 | Replaced by core/buttons attributes |
| Navigation (7) | 7 | CSS on core/navigation via container |
| Social (3) | 3 | Moved to sgs/social-icons attributes |
| Tagline (2) | 2 | Replaced by core/paragraph |
| Close button (3) | 3 | Moved to sgs/mobile-nav-close |
| Responsive overrides (10) | 10 | sgs/container handles responsive natively |
| **Total removed** | **~57** | |
| **Total remaining** | **~18** | Shell attributes only |

From 75 attributes to ~18. The rest live where they belong — on the blocks that render them.

---

## Migration Path

### Phase 1: Build sgs/social-icons + sgs/mobile-nav-close (standalone)

These blocks are useful independently. Social icons can replace the hardcoded social rendering in the footer. The close button is needed for the drawer composition.

No changes to v1 mobile-nav. Both blocks ship on main.

### Phase 2: Register Composition Patterns

Register the 6 new patterns using the composition approach. These coexist with the v1 patterns — new insertions get the composition patterns, existing v1 blocks continue to work.

### Phase 3: Build sgs/mobile-nav v2 Shell

New block registration alongside v1. The v2 shell is `sgs/mobile-nav-v2` during development, renamed to `sgs/mobile-nav` when v1 is deprecated.

- Strip all content-rendering methods from the renderer
- Keep: popover, animation, swipe, scroll lock, focus trap, backdrop
- InnerBlocks with `templateLock: false` and `allowedBlocks` whitelist
- Template default: the "Default" pattern content

### Phase 4: Deprecation + Migration

Add `deprecated.js` to the v1 block that:
1. Detects v1 attributes (showCta, ctaText, showSocials, etc.)
2. Transforms them into the equivalent InnerBlocks composition
3. Returns the new markup

This is the hardest part — attribute-to-InnerBlocks migration. It's a one-way transform: the v1 attribute values become block attributes on the inner blocks. The deprecated block markup is regenerated as the composition pattern.

### Phase 5: WP 7.0 Alignment

When WP 7.0 ships with navigation overlays:
1. The v2 shell can be placed inside a `navigation-overlay` template part
2. Core's Navigation block handles the trigger (hamburger)
3. Our shell handles animation/popover/backdrop
4. The container composition handles content

This is the endgame: Core trigger → SGS shell → Container composition → Standard blocks.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| core/navigation inside InnerBlocks doesn't auto-sync with header nav | High | Medium | Pattern pre-sets `ref: 100` (Primary Navigation post ID). Works for same-nav use case. Different nav requires user to select a different ref in the editor. |
| Stagger animation doesn't cascade to nested blocks | Medium | High | The shell sets `--i` on direct children. If containers wrap individual items, the counter breaks. Fix: use `:nth-child()` CSS counter on the shell's direct children, or add a `data-stagger` attribute the shell's JS reads. |
| sgs/container gap/padding overrides the drawer's built-in spacing | Low | Low | Patterns pre-configure spacing. Users can adjust via container controls. |
| Deprecated v1 blocks break on migration | Medium | High | Test migration transform extensively. Keep v1 renderer as fallback — if migration fails, render v1 output. |
| core/navigation renders differently inside a popover than in the header | Medium | Medium | Test thoroughly. May need CSS overrides to reset WP navigation styling inside the drawer context. |
| Clients break the drawer by removing the close button or navigation | Medium | Low | Add a warning in the editor if required blocks are missing. The close button is also accessible via ESC and backdrop click, so removing it is survivable. |

---

## Decision Log

| Decision | Rationale |
|---|---|
| Shell owns animation only, not layout | Single responsibility. Layout is the container's job. |
| Use sgs/container, not core/group | sgs/container has responsive columns, background images, overlay, min-height — core/group lacks most of these. The container is our competitive advantage over Kadence's off-canvas. |
| core/navigation with ref, not custom menu parser | Eliminates the entire `get_nav_blocks()` → `render_menu_items()` → `render_mega_menu_item()` chain (400+ lines). WordPress handles menu rendering natively. The mega-menu accordion behaviour moves to CSS/JS that targets navigation blocks inside the drawer context. |
| sgs/social-icons as standalone block | Reusable in footer, sidebar, any template. One settings page, one block, works everywhere. |
| Patterns not templates | Patterns are zero-cost (no template part to manage). Clients can customise after insertion. Patterns can evolve without breaking existing instances. |
| Deprecation migration, not breaking change | Existing v1 blocks must continue working. The migration transform runs once when the block is edited in the block editor. |

---

## Files Affected

### New files
- `src/blocks/mobile-nav-close/` (block.json, edit.js, render.php, style.css)
- `src/blocks/social-icons/` (block.json, edit.js, render.php, style.css)
- `includes/social-icons-patterns.php` (or extend mobile-nav-patterns.php)

### Modified files
- `src/blocks/mobile-nav/block.json` — strip content attributes, keep shell attributes
- `src/blocks/mobile-nav/edit.js` — strip content panels, add InnerBlocks with template
- `src/blocks/mobile-nav/render.php` — strip zone rendering, output shell + InnerBlocks.Content
- `src/blocks/mobile-nav/style.css` — keep shell styles, remove zone styles
- `src/blocks/mobile-nav/view.js` — keep popover/swipe/focus, remove accordion (handled by core/navigation)
- `includes/class-mobile-nav-renderer.php` — DELETE (985 lines → 0)
- `includes/mobile-nav-patterns.php` — rewrite patterns as compositions

### Deleted files
- `src/blocks/mobile-nav/AnimationPanel.js` — merge into main edit.js (it's small enough)
- `src/blocks/mobile-nav/ColoursPanel.js` — DELETE (colours handled by container supports)
- `src/blocks/mobile-nav/NavigationPanel.js` — DELETE (nav handled by core/navigation)

---

## Success Criteria

1. New insertion via pattern produces a fully functional drawer with zero configuration
2. Clients can drag-reorder zones in the block editor
3. Clients can add any block to the drawer (testimonial, hours, promo, form)
4. Existing v1 blocks continue to render correctly without migration
5. Migrated v1 blocks produce identical visual output to v1
6. Shell block is under 200 lines of PHP
7. Total attribute count: under 20
8. All 6 pattern presets produce professional results
9. sgs/social-icons works independently in footer and other locations
10. WP 7.0 navigation overlay compatibility preserved
