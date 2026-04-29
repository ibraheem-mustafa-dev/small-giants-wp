# SGS Block Audit — 2026-03-09
**Auditor:** Blub (code review, no visual capture — exec was sandbox-limited this session)
**Scope:** 15 blocks flagged from 2026-03-01 audit + Interactivity API migrations (2026-03-03)
**Grading scale:** S / A / B / C / D / E / F

---

## Summary Table

| # | Block | Grade | Key Issues |
|---|-------|-------|------------|
| 1 | card-grid | **A** | ~~Missing attrs in block.json~~ Fixed: 5 missing attributes added |
| 2 | certification-bar | **A** | ~~Hardcoded font size~~ Fixed: uses `--wp--preset--font-size--x-small` |
| 3 | pricing-table | **A** | ~~D-grade~~ Fixed: encoding, colours tokenised, focus-visible, reduced-motion, shadow elevation |
| 4 | process-steps | **A** | ~~Dead counter-reset, hardcoded px~~ Fixed: CSS custom property system, dead code removed |
| 5 | heritage-strip | **A** | ~~Hardcoded image heights~~ Fixed: CSS custom properties with mobile overrides |
| 6 | trust-bar | A | Clean. view.js is excellent |
| 7 | counter | A | Clean. view.js is excellent |
| 8 | icon-list | **A** | ~~Brittle emoji/unicode~~ Fixed: converted to dynamic render with Lucide SVGs |
| 9 | notice-banner | **A** | ~~Hardcoded hex colours~~ Fixed: block-scoped CSS custom properties with token chain |
| 10 | whatsapp-cta | **A** | ~~Hardcoded values~~ Fixed: shadow/colour/z-index all tokenised |
| 11 | testimonial | **A** | ~~Hardcoded gap~~ Fixed: tokenised spacing, preemptive reduced-motion |
| 12 | form-review | **A** | ~~No noscript fallback~~ Fixed: `<noscript>` message added |
| 13 | icon (sgs/icon) | **A** | ~~Poor accessible name~~ Fixed: `linkLabel` attribute + editor control |
| 14 | icon-block (sgs/icon-block) | **A** | ~~WCAG 2.4.4 fail~~ Fixed: `linkLabel` attribute + `aria-label` on link |
| 15 | testimonial-slider | A | Excellent — WCAG 2.2.2 pause/play, progressive enhancement |
| 16 | tabs | A | Excellent — full ARIA tab pattern, deep linking, keyboard nav |

**All 16 blocks at A-grade.** Fixed 2026-03-10 by Claude Code.
**Previously A:** trust-bar, counter, testimonial-slider, tabs (unchanged)

---

## Detailed Reviews

---

### 1. card-grid — Grade: B

**What's good:**
- Token-compliant CSS throughout
- `--sgs-overlay-gradient-start` CSS var for overlay gradient
- Reduced motion query present
- Responsive with both mobile and tablet breakpoints (H16/M22 fixed)
- Focus-visible on linked card items
- `colourVar()` utility used correctly in save.js

**Issues:**
1. **block.json missing attributes** — `save.js` references `columnsTablet`, `overlayStyle`, `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour` but none are declared in `block.json`. WordPress will strip these on save, causing silent data loss.
2. **No container queries** — uses `@media` only. CLAUDE.md mandates `@container` for component-level breakpoints.
3. **Raw rgba in CSS** — `--sgs-overlay-gradient-start: rgba(0, 0, 0, 0.7)` is a hardcoded value that should be `var(--wp--preset--color--overlay-gradient-start)` or a named token.

**Fixes to reach A:**
```json
// block.json — add to attributes:
"columnsTablet": { "type": "number", "default": 2 },
"overlayStyle": { "type": "string", "default": "gradient" },
"hoverBackgroundColour": { "type": "string" },
"hoverTextColour": { "type": "string" },
"hoverBorderColour": { "type": "string" }
```
```css
/* style.css — add container query */
@container (min-width: 600px) {
  .sgs-card-grid {
    grid-template-columns: repeat(var(--sgs-card-grid-columns-tablet, 2), 1fr);
  }
}
```

---

### 2. certification-bar — Grade: B

**What's good:**
- Full token compliance
- RichText.Content serialisation correct
- Conditional link/div rendering
- Focus-visible on linked badges
- badgeStyle text-only pill variant is clean

**Issues:**
1. **Hardcoded `12px`** — `.sgs-certification-bar--text-only.sgs-certification-bar--small .sgs-certification-bar__badge-label` uses raw `12px`. Should be `var(--wp--preset--font-size--x-small)` or equivalent.
2. **No container queries.**

**Fixes to reach A:**
```css
/* Replace: font-size: 12px */
font-size: var(--wp--preset--font-size--x-small, 0.75rem);
```

---

### 3. pricing-table — Grade: D

**What's good:**
- Responsive column layout (1→2→3→4)
- Multiple CTA styles (primary/secondary/accent/outline)
- Highlighted plan visual differentiation

**Issues:**
1. **ENCODING BUG (critical)** — block.json default prices: `"Â£9.99"`, `"Â£29.99"`, `"Â£99.99"`. The `£` symbol was double-encoded as `Â£`. Editor preview will show corrupted text.
2. **Hardcoded colours** — `rgba(0,0,0,0.1)`, `rgba(0,0,0,0.15)`, `rgba(0,123,255,0.1)`. All should be design tokens or CSS custom properties.
3. **Missing focus-visible on `.sgs-pricing-table__cta`** — keyboard users cannot see which CTA is focused. WCAG 2.4.11 failure.
4. **Missing reduced-motion query** — hover transform on plan card (`transform: scale(1.05)`) has no `prefers-reduced-motion` override.
5. **`transform: scale(1.05)` on highlighted plan** — causes layout shift, text subpixel blur on some browsers. Better to use `box-shadow` + `z-index` for elevation.
6. **`blockGap` support declared but no CSS** — claims spacing.blockGap support but no CSS variable consumes it.
7. **Content checkmark `'✓'`** — raw character in `::before` content can cause unexpected screen reader behaviour. Use an SVG or `aria-hidden` span.

**Fixes to reach A:**
```json
// Fix encoding in block.json:
"price": "£9.99"   // all three plans
```
```css
/* Replace hardcoded shadows: */
box-shadow: 0 4px 12px var(--wp--preset--shadow--md);

/* Add focus state: */
.sgs-pricing-table__cta:focus-visible {
  outline: 2px solid var(--wp--preset--color--primary-dark);
  outline-offset: 3px;
}

/* Add reduced motion: */
@media (prefers-reduced-motion: reduce) {
  .sgs-pricing-table__plan { transition: none; }
  .sgs-pricing-table__plan--highlighted { transform: none; }
}

/* Replace scale(1.05) with shadow elevation: */
.sgs-pricing-table__plan--highlighted {
  box-shadow: 0 12px 32px var(--wp--preset--shadow--lg);
  z-index: 1;
}
```

---

### 4. process-steps — Grade: C

**What's good:**
- Connector line/arrow/dots variants
- Circle/square number styles
- Mobile vertical reflow with inline layout
- Icon support added (per spec fix)

**Issues:**
1. **Dead CSS** — `counter-reset: step-counter` on wrapper. Numbers are manually rendered, no CSS counter() used anywhere. Confusing dead code.
2. **Hardcoded px values coupled to circle size** — `left: calc(50% + 32px)`, `width: calc(100% - 64px)`, `right: -12px`, `right: -20px`, `padding-left: 68px`. These are all derived from the 48px circle but expressed as magic numbers. Should use a `--sgs-step-number-size: 48px` custom property and calculate from it.
3. **No container queries.**
4. **`max-width: 200px` on description** — arbitrary constraint that won't adapt to varying column counts.

**Fixes to reach A:**
```css
/* Add to :root or .sgs-process-steps: */
--sgs-step-number-size: 48px;
--sgs-step-gap: var(--wp--preset--spacing--20);
--sgs-connector-offset: calc(var(--sgs-step-number-size) / 2);

/* Replace connector calc: */
left: calc(var(--sgs-connector-offset) + var(--sgs-step-gap));
width: calc(100% - calc(var(--sgs-step-number-size) + var(--sgs-step-gap) * 2));

/* Remove: */
counter-reset: step-counter;  /* dead code — delete */

/* Remove max-width: 200px — replace with: */
.sgs-process-steps__description { max-width: none; }

/* Mobile description indent: */
padding-left: calc(var(--sgs-step-number-size) + var(--sgs-step-gap));
```

---

### 5. heritage-strip — Grade: B

**What's good:**
- Token-compliant CSS throughout
- Three layout variants (image-text-image, text-image, image-text)
- Mobile content reorder with `order: -1`
- Clean, no !important

**Issues:**
1. **Hardcoded image heights** — `min-height: 280px`, `max-height: 480px`, `min-height: 200px`, `max-height: 300px`. Should be CSS custom properties configurable per usage.
2. **No container queries.**

**Fixes to reach A:**
```css
.sgs-heritage-strip {
  --sgs-image-min-height: 280px;
  --sgs-image-max-height: 480px;
}
.sgs-heritage-strip__img {
  min-height: var(--sgs-image-min-height);
  max-height: var(--sgs-image-max-height);
}
@media (max-width: 767px) {
  .sgs-heritage-strip__img {
    min-height: 200px;   /* could also be a mobile-specific custom property */
    max-height: 300px;
  }
}
```

---

### 6. trust-bar — Grade: A

**What's good:**
- Token-compliant CSS, no hardcoded colours
- `viewScriptModule` with en-GB number formatting
- IntersectionObserver with `threshold: 0.15`
- Reduced motion check before animating
- Progressive enhancement (final number is always in markup)
- Ease-out cubic for natural deceleration
- 2x2 mobile grid layout

**Issues (minor, non-blocking):**
- No container queries (media query only)
- `min-width: 120px` on items is a hardcoded value — fine for most cases

**Path to S:** Add `@container` queries, add scroll-driven animation as a CSS-only layer (animation-timeline: scroll() for fade-in) so the JS counter is additive on top of CSS scroll animation.

---

### 7. counter — Grade: A

**What's good:**
- Identical quality to trust-bar view.js
- prefix + suffix support
- Configurable duration via `data-duration`
- Progressive enhancement
- Reduced motion check

**Issues (minor):**
- Counter block is typically used inside a grid — it has no self-layout. Works correctly but relies on parent context.

**Path to S:** Same as trust-bar — scroll-driven CSS animation layer.

---

### 8. icon-list — Grade: C

**What's good:**
- Token-compliant colours
- Multiple icon sizes (small/medium/large)
- Clean flex layout

**Issues:**
1. **Brittle emoji rendering via CSS `content`** — the icon system uses Unicode/emoji characters: shipping=`\1F69A` (🚚), shield=`\1F6E1` (🛡️), payment=`\1F4B3` (💳), globe=`\1F310` (🌐), people=`\1F465` (👥). Emoji rendering varies significantly across OS/browser. On Windows 10 these may render as black-and-white glyphs; on some systems they render inconsistently sized.
2. **`check`, `star-filled`, `arrow-right` are Unicode symbols** — `✓`, `★`, `→`. These are cleaner but still platform-dependent in size/weight.
3. The framework has Lucide SVGs available via `sgs_get_lucide_icon()` — icon-list should use the same system for consistency.
4. **`padding-top: 1px` on text** — magic number alignment hack.

**Fixes to reach A:**
- Convert icon rendering to use inline SVG output from `sgs_get_lucide_icon()` (requires converting to server-side render or building a JS SVG map)
- Replace emoji unicode with named SVG icons
- Remove `padding-top: 1px` — adjust alignment via `align-items: center` on the item

---

### 9. notice-banner — Grade: C

**What's good:**
- Clean flex layout
- Four semantic variants (info/success/warning/accent)
- Screen-reader text links handled correctly

**Issues:**
1. **Hardcoded hex colours** — `#EBF5FF`, `#3B82F6`, `#ECFDF5`, `#FFFBEB`, `#F59E0B` are all raw values not from the SGS design token system. This violates the hard rule in CLAUDE.md: "No hardcoded colours found." The info blue (`#3B82F6`) is Tailwind blue-500, not from the SGS palette at all.
2. No reduced motion (no animations so not critical).

**Fixes to reach A:**
```css
/* Add to theme.json or :root — new tokens needed: */
--wp--preset--color--info-bg: #EBF5FF;
--wp--preset--color--info-border: #3B82F6;
--wp--preset--color--warning-bg: #FFFBEB;
--wp--preset--color--warning-border: #F59E0B;

/* Replace in style.css: */
.sgs-notice-banner--info {
  background-color: var(--wp--preset--color--info-bg);
  border-left-color: var(--wp--preset--color--info-border);
}
/* etc. */
```

Note: The success and accent variants already use SGS tokens. Only info and warning need new tokens.

---

### 10. whatsapp-cta — Grade: B

**What's good:**
- Inline/banner/floating three variants
- Reduced motion query present
- Focus-visible on button
- Min-height: 44px (WCAG touch target)
- Throttled scroll listener with requestAnimationFrame
- Screen-reader only text for floating icon variant

**Issues:**
1. **`rgba(0,0,0,0.25)` in floating shadow** — should be a CSS custom property or shadow token.
2. **Hardcoded `#fff` on button text** — should be `var(--wp--preset--color--surface)`.
3. **`z-index: 9999`** on floating variant — same value as nav overlay. Stacking context collision risk.
4. **No container queries.**

**Fixes to reach A:**
```css
box-shadow: 0 4px 12px var(--wp--preset--shadow--float, rgba(0,0,0,0.25));
color: var(--wp--preset--color--surface, #fff);
z-index: var(--wp--custom--z-index--floating, 200);  /* standardise z-index scale */
```

---

### 11. testimonial — Grade: B

**What's good:**
- Three variants: card/minimal/featured — all well-styled
- Token-compliant colours throughout
- `:not([style*="color"])` fallback pattern used correctly
- Star rating with empty star opacity
- Avatar initials fallback

**Issues:**
1. **No reduced motion** — no animated elements currently, but `transition` may be added later. Add preemptively.
2. **`gap: 2px` on stars** — minor hardcoded spacing, use a token or CSS custom property.
3. **No container queries.**
4. **save.js not yet reviewed** — needs visual confirmation that RichText serialisation is correct for multi-field object (quote, name, role, rating, avatar).

**Fixes to reach A:**
```css
.sgs-testimonial__stars { gap: var(--wp--preset--spacing--5, 2px); }
```

---

### 12. form-review — Grade: B

**What's good:**
- Server-side render is correct
- `get_block_wrapper_attributes()` used properly
- Proper `defined('ABSPATH') || exit` guard
- All strings use `__()` for i18n
- Correct `parent` constraint (child of sgs/form or sgs/form-step only)

**Issues:**
1. **No dedicated CSS** — styles inherited from parent form block. This is intentional but means the review component can't be independently styled or reused.
2. **Empty `<dl>` on server render** — populated entirely by JS. If JS fails or is slow, user sees "Please check your details below before submitting" with no content. No loading indicator or noscript fallback.
3. **`heading` attribute is plain string, not RichText** — consistent with block.json but limits formatting.

**Path to A:** Add a `<noscript>` fallback or loading state indicator. Minor issue.

---

### 13. icon (sgs/icon) — Grade: C

**What's good:**
- Server-side render with Lucide icons
- `sgs_colour_value()` helper used correctly
- `aria-hidden="true"` on SVG span — correct
- `esc_url()` on link — correct
- `defined('ABSPATH') || exit` guard

**Issues:**
1. **Poor accessible name on linked variant** — `aria-label="{icon name}"` uses the icon slug (e.g. "star", "shield-check") as the accessible name. Screen reader users will hear "link, star" which is meaningless. Should require a `linkLabel` attribute for meaningful accessible text.
2. **Near-duplicate of icon-block** — two blocks with almost identical functionality. `sgs/icon` uses `size`/`backgroundShape`; `sgs/icon-block` uses `iconSize`/`shape`. Creates maintenance burden and editor confusion.
3. **`width/height` as inline styles** — not using CSS custom property (`--sgs-icon-size` approach used in icon-block is better).

**Fixes to reach A:**
```json
// block.json — add:
"linkLabel": { "type": "string", "default": "" }
```
```php
// render.php — change aria-label:
$link_label = ! empty( $attributes['linkLabel'] ) ? $attributes['linkLabel'] : $icon;
'aria-label="%s"', esc_attr( $link_label )
```

---

### 14. icon-block (sgs/icon-block) — Grade: D

**What's good:**
- Lucide SVG icons
- CSS custom property for icon size (`--sgs-icon-size`)
- Shape variants (circle/square/rounded/none)
- `sgs_colour_value()` used correctly
- `esc_url()` on link

**Issues:**
1. **WCAG 2.4.4 FAILURE — Missing accessible name on linked variant.** The link renders as:
   ```html
   <a href="..." class="sgs-icon-block__link">
     <span aria-hidden="true"><!-- SVG --></span>
   </a>
   ```
   This is an empty link — zero accessible text. Screen reader users get "link" with no destination context. This is a hard accessibility failure.
2. **Near-duplicate of sgs/icon** — see above. Should be consolidated.
3. **No `linkLabel` attribute** — same problem as sgs/icon but worse (no fallback at all).

**Fixes to reach A:**
```json
// block.json — add:
"linkLabel": { "type": "string", "default": "" }
```
```php
// render.php:
$link_label = ! empty( $attributes['linkLabel'] ) ? $attributes['linkLabel'] : '';
$aria = $link_label ? ' aria-label="' . esc_attr( $link_label ) . '"' : ' aria-label="' . esc_attr( $icon ) . '"';

$inner = sprintf(
  '<a href="%s"%s%s class="sgs-icon-block__link">%s</a>',
  esc_url( $link ),
  $target,
  $aria,
  $inner
);
```

---

### 15. testimonial-slider — Grade: A

**What's good:**
- CSS scroll-snap for carousel (no JS dependency for scrolling)
- WCAG 2.2.2 compliant — pause/play button injected by JS when autoplay is active
- `prefersReducedMotion` check — skips smooth scroll and disables autoplay
- `wp_unique_id()` for multiple sliders on one page
- `sgs_responsive_image()` for avatar images
- Stars with `role="img"` and `aria-label` for screen readers
- Slide `aria-label="Testimonial X of Y"` — carousel position context
- Dot navigation as `role="tablist"` with Arrow key keyboard support
- Progressive enhancement — first slide visible without JS

**Issues (non-blocking):**
1. `aria-live="polite"` placed on the track (parent of all slides) rather than a dedicated status region. Any DOM change in the track will be announced — this is over-announcing.
2. `offsetLeft` for scroll position can be unreliable inside transformed containers. `scrollIntoView()` would be more robust.
3. Long multi-line `sprintf` for slides in render.php makes the template hard to scan.

**Path to S:** Add scroll-driven CSS animations for entrance effects, implement swipe gesture support, add `aria-roledescription="carousel"` on the wrapper.

---

### 16. tabs — Grade: A

**What's good:**
- Full WAI-ARIA tab pattern (role="tablist", role="tab", role="tabpanel")
- Arrow key + Home/End keyboard navigation
- Deep linking via URL hash
- Focus management on keyboard tab switch
- `hidden` attribute on inactive panels (semantic, accessible)
- Vertical layout collapses to horizontal with overflow scroll on mobile
- CSS custom property-driven theming (7 colour vars)
- Three style variants: underline/boxed/pills
- Reduced motion query
- `viewScriptModule` for ES module loading
- `get_block_wrapper_attributes()` used correctly

**Issues (non-blocking):**
1. `outline: none` in `.sgs-tabs__tab` reset — correct pattern (immediately overridden by `:focus-visible`) but worth noting.
2. Style string in render.php is built from `sgs_colour_value()` output without sanitizing the assembled CSS string. Low risk but not zero.
3. `--sgs-panel-border: #e0e0e0` is a hardcoded default in CSS — should be a design token.

**Path to S:** Add `aria-roledescription="tablist"` localised string, add scroll-driven panel entrance animation, add `@container` for panel content.

---

## Priority Fix Order

### Immediate (D-grade — blocks that fail standards):

**pricing-table:**
1. Fix `£` encoding in block.json defaults
2. Replace hardcoded colours with tokens
3. Add focus-visible on CTA button
4. Add reduced-motion query
5. Replace `scale(1.05)` with shadow elevation
6. Remove dead `blockGap` support declaration

**icon-block:**
1. Add `linkLabel` attribute to block.json
2. Update render.php to use `aria-label` from `linkLabel` with icon slug fallback

### High Priority (C-grade — standards violations or fragile):

**icon (sgs/icon):**
1. Add `linkLabel` attribute
2. Use meaningful accessible name in linked variant

**notice-banner:**
1. Add `info` and `warning` colour tokens to theme.json
2. Replace hardcoded hex values in style.css

**process-steps:**
1. Remove dead `counter-reset: step-counter`
2. Add `--sgs-step-number-size` custom property
3. Replace all hardcoded px connector values with calculated vars

**icon-list:**
1. Convert icon rendering from CSS content/unicode to inline Lucide SVGs
2. Requires converting to server-side render OR building a JS SVG injection layer

### Medium Priority (B-grade — bring to A):

**card-grid:** Add missing attributes to block.json
**certification-bar:** Fix 12px hardcoded size
**heritage-strip:** Convert image heights to CSS custom properties
**whatsapp-cta:** Fix hardcoded shadow, button colour, z-index
**testimonial:** Fix star gap, add save.js review

---

## S-Class Gaps (All blocks)

None of the 15 blocks currently implement:
- `@view-transition { navigation: auto; }` — page transitions
- `@container` queries — component-level breakpoints (CLAUDE.md mandates this)
- `animation-timeline: scroll()` — scroll-driven animations
- `<script type="speculationrules">` — speculation rules

These are framework-wide gaps, not per-block. The highest-value implementation targets are:
1. Container queries — heritage-strip, card-grid, trust-bar (layout-heavy blocks)
2. Scroll-driven animations — trust-bar counter entrance, counter, process-steps reveal
3. View transitions — testimonial-slider, tabs (natural transition points)

---

*Next session: Apply D-grade fixes first (pricing-table, icon-block), then C-grade, then container query pass across all B/A blocks.*
