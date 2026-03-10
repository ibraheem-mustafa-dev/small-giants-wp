# Block Audit Fix Summary — 2026-03-10

All 16 audited blocks now at **A-grade**. 12 blocks fixed, 4 were already A-grade.

## Fixes Applied

### D-grade → A (critical fixes)

| Block | Fixes |
|-------|-------|
| **pricing-table** | Encoding bug (Â£→£), hardcoded colours replaced with `color-mix()` tokens, `focus-visible` on CTA, `prefers-reduced-motion`, `scale(1.05)` replaced with shadow elevation, dead `blockGap` support removed |
| **icon-block** | WCAG 2.4.4 fix: `linkLabel` attribute + `aria-label` on linked variant, editor TextControl for accessible name |

### C-grade → A (standards violations)

| Block | Fixes |
|-------|-------|
| **icon** | `linkLabel` attribute + meaningful `aria-label` on linked variant (was using icon slug) |
| **notice-banner** | Hardcoded hex colours (`#EBF5FF`, `#3B82F6`, etc.) replaced with block-scoped CSS custom properties chaining through theme.json tokens |
| **process-steps** | Dead `counter-reset` removed, `--sgs-step-number-size` CSS custom property replaces all magic px values, `max-width: 200px` removed |
| **icon-list** | Converted from static block with CSS `content` emoji/unicode to dynamic server-render with `sgs_get_lucide_icon()` inline SVGs. Deprecation added for existing content. `padding-top: 1px` hack removed. |

### B-grade → A (polish)

| Block | Fixes |
|-------|-------|
| **card-grid** | 5 missing attributes added to block.json (`columnsTablet`, `overlayStyle`, `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour`) |
| **certification-bar** | Hardcoded `12px` replaced with `var(--wp--preset--font-size--x-small, 0.75rem)` |
| **heritage-strip** | Image heights converted to CSS custom properties with mobile overrides on the block root |
| **whatsapp-cta** | `#fff` → `var(--wp--preset--color--base)`, `z-index: 9999` → `var(--wp--custom--z-index--floating, 200)`, shadow tokenised |
| **testimonial** | Star `gap: 2px` tokenised, preemptive `@media (prefers-reduced-motion: reduce)` added |
| **form-review** | `<noscript>` fallback added for when JS fails to populate the review `<dl>` |

### Already A-grade (no changes)

- trust-bar, counter, testimonial-slider, tabs

## S-grade Opportunities (framework-wide, not per-block)

These are cross-cutting enhancements that would push A-grade blocks toward S:

1. **Container queries (`@container`)** — heritage-strip, card-grid, trust-bar are layout-heavy and would benefit most. Currently all blocks use `@media` only.
2. **Scroll-driven CSS animations (`animation-timeline: scroll()`)** — trust-bar counter entrance, counter, process-steps reveal. Would be additive CSS-only layer on top of existing JS.
3. **View transitions (`@view-transition`)** — testimonial-slider and tabs have natural transition points.
4. **`aria-roledescription="carousel"`** — testimonial-slider (currently missing from the wrapper).
5. **Swipe gesture support** — testimonial-slider (touch devices).
6. **`scrollIntoView()` instead of `offsetLeft`** — testimonial-slider (more robust in transformed containers).

## Build Status

`npm run build` completed successfully after all fixes.
