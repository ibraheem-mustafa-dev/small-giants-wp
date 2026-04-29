# WP 7.0 Navigation Overlay Compatibility — sgs/mobile-nav

## Context

WordPress 7.0 (beta March 2026, stable April 2026) ships **Customisable Navigation Overlays** — a native system for mobile navigation drawers built from standard blocks.

- [Make WordPress Core announcement](https://make.wordpress.org/core/2026/03/04/customisable-navigation-overlays-in-wordpress-7-0/)
- [Gutenberg tracking issue #73084](https://github.com/WordPress/gutenberg/issues/73084)
- [Call for Testing](https://make.wordpress.org/test/2026/01/27/call-for-testing-customizable-navigation-mobile-overlays/)

## How WP 7.0 Navigation Overlays Work

1. A new **`navigation-overlay`** template part area is registered
2. Theme authors create template parts in `parts/` that fill this area with blocks
3. The **Navigation block** gets a sidebar dropdown to select which overlay template part to use
4. A dedicated **`Navigation Overlay Close`** block handles the close button
5. The hamburger trigger is handled by Core's Navigation block (no custom trigger needed)

Content inside the overlay is standard blocks — navigation, social icons, logo, buttons, paragraphs, anything.

## How sgs/mobile-nav Currently Works

1. **Standalone block** placed in `parts/header.html` after the desktop navigation
2. **Own trigger** — hardcoded hamburger button in `parts/header.html` using `popovertarget`
3. **Server-rendered zones** — header, CTA, nav menu, socials auto-populated from settings
4. **InnerBlocks zone** — clients can add custom content
5. **62 attributes** controlling animation, colours, layout, CTA, navigation, socials
6. **Block patterns** — 6 presets for common use cases

## What SGS Does That Core Doesn't

| Feature | Core 7.0 | sgs/mobile-nav |
|---------|----------|----------------|
| Animation system (spring, snappy, bouncy, smooth, none) | No | Yes |
| Backdrop blur | No | Yes |
| Swipe-to-close gesture | No | Yes |
| Staggered item reveal | No | Yes |
| CTA zone (primary + secondary buttons) | Manual | Auto-populated |
| Contact shortcuts (phone, email, WhatsApp) | Manual | Auto from Business Details |
| Social icons | Manual | Auto from Business Details |
| Trust tagline | No | Yes |
| Mega-menu accordion with rich content | No | Yes |
| Block patterns for presets | Theme-dependent | 6 built-in |

Core provides the canvas. SGS provides the experience.

## Migration Path (When WP 7.0 Ships)

### Phase 1: Coexistence (April 2026)

No changes needed. Our block works independently of Core's overlay system. Both can exist — Core's overlay is opt-in per Navigation block. Our block in `header.html` continues to work as-is.

### Phase 2: Alignment (When Ready)

When we choose to align:

1. **Register sgs/mobile-nav as a `navigation-overlay` template part pattern**
   - Create `parts/navigation-overlay-sgs.html` containing `<!-- wp:sgs/mobile-nav /-->`
   - Register it as assignable to the Navigation block's overlay dropdown
   - Clients can now select "SGS Mobile Nav" from the Navigation block sidebar

2. **Remove the hardcoded hamburger from header.html**
   - Core's Navigation block renders its own hamburger trigger
   - Delete the `<button class="sgs-mobile-nav-toggle" popovertarget="sgs-mobile-nav">` from `parts/header.html`
   - The `popovertarget` attribute would need to reference our block's popover ID — verify Core passes this through

3. **Keep our block's Popover API implementation**
   - Core may use `dialog` or its own overlay mechanism
   - If Core uses a different mechanism, our block may need to adapt its open/close triggers
   - The animation system, zones, and attributes stay unchanged

4. **Test Core trigger → SGS overlay compatibility**
   - Does Core's hamburger correctly toggle our popover?
   - Does focus management chain correctly (Core trigger → SGS drawer → Core trigger on close)?
   - Does `aria-expanded` sync between Core's trigger and our drawer?

### Phase 3: Full Integration (If Desired)

If Core's overlay system matures to support:
- Custom animation presets
- Template part patterns with pre-configured attributes

Then we could register our 6 block patterns as overlay template part patterns. Clients would see "SGS — B2B Trade", "SGS — Restaurant" etc. in the Navigation block's overlay picker.

This is the end state: Core handles the trigger, SGS handles the overlay content.

## Decision: When to Start Phase 2

**Not before WP 7.0 stable release.** The API may change between beta and stable.

**Trigger:** When WP 7.0 is stable AND at least one major theme (Twenty Twenty-Six or similar) ships with navigation-overlay support, test compatibility and begin Phase 2.

**Do not rush this.** Our current implementation works perfectly. Alignment is a nice-to-have for future-proofing, not a blocker.

## What NOT to Do

- Do not rewrite sgs/mobile-nav as a template part. It's a block with 62 attributes — template parts don't have attributes.
- Do not remove the Popover API implementation. Core may use a different mechanism, but ours works and is well-tested.
- Do not split the block into trigger + overlay blocks. The monolithic block is simpler for clients and our patterns depend on it.
- Do not wait for WP 7.0 before shipping. Ship now, align later.
