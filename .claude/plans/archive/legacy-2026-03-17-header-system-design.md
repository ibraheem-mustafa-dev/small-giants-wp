# SGS Header System — Design Spec

**Approved:** 2026-03-17
**Status:** In progress

## Architecture

Enhanced template part + PHP/JS behaviour layer. One consolidated `header.html` template part. Behaviour (sticky, transparent, shrink, smart-reveal) controlled by CSS classes injected via PHP `render_block` filter. JS scroll handler (~2KB) for transitions. Global setting + per-page meta override.

## Header Modes

| Mode | CSS Class | Behaviour |
|---|---|---|
| Static | (none) | Normal header, scrolls with page |
| Sticky | `sgs-header-sticky` | Sticks to top on scroll |
| Transparent | `sgs-header-transparent` | Overlaps hero, absolute position |
| Transparent + Sticky | `sgs-header-transparent sgs-header-sticky` | Starts transparent, becomes solid sticky on scroll |
| Smart Reveal | `sgs-header-smart-reveal` | Hides on scroll down, reveals on scroll up |

## Files

- `theme/sgs-theme/parts/header.html` — consolidated header template part
- `theme/sgs-theme/includes/class-header-behaviour.php` — render_block filter + settings
- `theme/sgs-theme/assets/js/header-behaviour.js` — scroll handler (~2KB)
- `theme/sgs-theme/assets/css/header-modes.css` — sticky/transparent/shrink/reveal CSS

## Phase 1 (this session)

1. Consolidate 4 header template parts → 1
2. PHP class injector via render_block filter
3. JS scroll handler (IntersectionObserver + scroll delta)
4. Global setting (sgs_header_mode option)
5. Per-page override (_sgs_header_mode post meta + editor sidebar)
6. Top bar visibility toggle
7. Remove Indus Foods hardcoded content
8. Skip link focus fix
9. Focus trap in mobile menu
10. prefers-reduced-motion support
11. CSS for all header modes

## Phase 2 (future)

- Responsive logo variations (desktop/mobile)
- Shrink + blur effect (backdrop-filter)
- Dark mode toggle (Interactivity API)
- Announcement bar pattern (dismissible, countdown, scheduling)
- Mega menu trigger binding
- Off-canvas improvements (search, accordion submenus, bottom CTA)
- Scroll progress indicator
- Vertical/sidebar header variant (needs more research)

## Accessibility (Phase 1)

- Skip link moves focus (tabindex="-1" on #main)
- Focus trap in mobile menu (Tab cycles, Escape closes)
- Touch targets 44px minimum
- Colour contrast 4.5:1 in all states
- ARIA landmarks with distinct labels
- prefers-reduced-motion disables all animations
- Keyboard navigation (Tab, Enter/Space, Escape, arrows)
- 320px reflow without horizontal scroll
