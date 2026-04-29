# M15: !important Band-Aid Patch Audit

## Summary
Found 40+ !important declarations across the SGS theme and blocks plugin. Categorised into:
- **LEGITIMATE** (utilities, accessibility, editor-only): Keep as-is
- **BAND-AID PATCHES**: Require root-cause fixes

---

## LEGITIMATE !important Uses (Keep)

### extensions.css
1. **Lines 66, 70, 74**: `.sgs-hide-mobile/tablet/desktop` — Device visibility utilities
2. **Line 368-369**: Reduced motion overrides — Accessibility requirement

### Block editor-only
3. **back-to-top/editor.css line 3**: `position: static !important` — Editor preview only
4. **gallery/editor.css line 120**: Hiding lightbox in editor

### Accessibility & core overrides
5. **core-blocks.css line 383**: Focus outline — WCAG 2.2 requirement
6. **core-blocks.css line 287**: Hiding header CTA on mobile — Utility class
7. **core-blocks.css line 322**: Hamburger button `display: inline-flex` — Documented as beating WP core JS

---

## BAND-AID PATCHES (Fix Root Cause)

### Category A: Block Editor Inline Styles Override

#### A1. Container responsive grid columns (container/style.css lines 45-54)
```css
.sgs-cols-mobile-1 { grid-template-columns: 1fr !important; }
.sgs-cols-mobile-2 { grid-template-columns: repeat(2, 1fr) !important; }
/* etc. */
```
**Root cause**: Block editor adds inline `style="grid-template-columns: ..."` attributes
**Fix**: Use CSS custom properties in block attributes instead of inline styles

#### A2. Form tiles grid (form/style.css line 281)
```css
.sgs-form-tiles { grid-template-columns: 1fr 1fr !important; }
```
**Root cause**: Block editor inline grid styles
**Fix**: Same as A1

#### A3. Hero CTA display (functions.php Issue 9 & 8)
```css
.sgs-hero__ctas { flex-direction: column!important; }
.sgs-hero__cta { display: inline-flex!important; visibility: visible!important; }
```
**Root cause**: Block editor button wrapper inline styles
**Fix**: Use block CSS custom properties or remove inline styles from render.php

#### A4. Hero button hover effects (functions.php Issue 12)
```css
.sgs-hero .wp-block-button__link.has-primary-background-color:hover {
	background-color: ... !important;
	color: ... !important;
	border-color: ... !important;
}
```
**Root cause**: WordPress button block adds inline background/color styles
**Fix**: Use CSS custom properties for hover states instead

---

### Category B: Theme.json Cascade Issues

#### B1. Button text colour fix (core-blocks.css line 197)
```css
.wp-block-button__link.has-surface-color.has-text-color {
	color: var(--wp--preset--color--surface, #ffffff) !important;
}
```
**Root cause**: theme.json colour cascade — `.has-text-color` overrides `.has-surface-color`
**Fix**: Adjust theme.json colour inheritance or use higher specificity selector

#### B2. Transparent header background (core-blocks.css lines 229, 233)
```css
header.wp-block-template-part.sgs-header-transparent {
	background: transparent !important;
}
```
**Root cause**: theme.json section background or block editor group background
**Fix**: Check if header template part can use custom attribute instead

#### B3. Footer heading/link colour fixes (core-blocks.css lines 417, 461, 466)
```css
footer .wp-block-heading.has-surface-color.has-text-color {
	color: var(--wp--preset--color--surface, #ffffff) !important;
}
```
**Root cause**: Same as B1 — theme.json colour cascade
**Fix**: Same as B1

#### B4. Info-box text on accent background (functions.php Issue 4)
```css
.has-accent-background-color .sgs-info-box--subtle .sgs-info-box__heading {
	color: var(--wp--preset--color--text,#1e1e1e)!important;
}
```
**Root cause**: CSS variable --text-muted has insufficient contrast
**Fix**: Use explicit colour in info-box CSS when on accent background

---

### Category C: WordPress Inline Attributes

#### C1. Footer logo size (functions.php Issue 16)
```css
footer .wp-block-image img { max-width: 140px!important; height: auto!important; }
```
**Root cause**: WordPress adds inline `style="width:200px"` attribute on images
**Fix**: Remove width attribute from block or use aspect-ratio CSS instead

---

### Category D: Specificity Wars

#### D1. Nav overlay z-index (functions.php)
```css
.wp-block-navigation__responsive-container.is-menu-open { z-index: 9999!important; }
```
**Root cause**: Competing z-index from other blocks or theme
**Fix**: Audit z-index stack, use CSS layers or increase base specificity

#### D2. Nav link hover (functions.php Issue 12 H3)
```css
.wp-block-navigation .wp-block-navigation-item__content:hover {
	background-color: var(--wp--preset--color--accent)!important;
}
```
**Root cause**: WordPress core nav hover styles or block editor inline styles
**Fix**: Use `:where()` selector to reduce core specificity or target more specifically

#### D3. Process steps connector hide (process-steps/style.css line 132)
```css
.sgs-process-steps__step::after { display: none !important; }
```
**Root cause**: Likely overriding a previous rule in the same file
**Fix**: Restructure CSS to avoid conflicting rules

#### D4. Testimonial slider CSS variable (testimonial-slider/style.css line 313)
```css
.sgs-testimonial-slider__track { --sgs-slides-visible: 1 !important; }
```
**Root cause**: Overriding a JS-set CSS variable
**Fix**: Let JS set the variable correctly instead

---

### Category E: Acceptable (But Could Be Improved)

#### E1. Ghost button variant (core-blocks.css lines 584, 586, 591, 592)
Button style variant — arguably acceptable as it's a named style override.
**Could improve**: Use higher specificity selector without !important

#### E2. Social icon brand colours (core-blocks.css lines 524, 529, 535, 541)
Theme customisation of social icons — acceptable but could use CSS variables
**Could improve**: Add social icon colour tokens to theme.json

#### E3. Social icon brand colours DUPLICATE (functions.php Issue 14)
**Fix**: Remove from functions.php — already in core-blocks.css (H21)

---

## Fixing Priority

1. **High**: Category A (block editor inline styles) — structural issue
2. **High**: Category C (WordPress inline attributes) — clean markup
3. **Medium**: Category B (theme.json cascade) — CSS architecture
4. **Medium**: Category D (specificity wars) — CSS quality
5. **Low**: Category E (acceptable but improvable) — polish

---

## Next Steps

1. Fix Category A by refactoring block render.php files to use CSS custom properties
2. Fix Category C by removing width attributes from block markup
3. Fix Category B by adjusting theme.json colour inheritance
4. Fix Category D by auditing and restructuring selectors
5. Remove duplicate Issue 14 from functions.php
6. Test on actual site to ensure no visual regressions
7. Commit with detailed message
