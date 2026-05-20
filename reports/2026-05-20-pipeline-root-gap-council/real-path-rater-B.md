# Rater B — Structural DOM + CSS Diff Report
**Council:** SGS Cloning Pipeline Root-Gap
**Angle:** DOM shape and CSS selector match between mockup and rendered page
**Date:** 2026-05-20
**Source:** `rc-fix-verification-mamas-munches/` vs `sites/mamas-munches/mockups/homepage/index.html`

---

## Methodology

1. Fetched live rendered HTML (159 KB). Located brand + hero sections by class scan.
2. Read mockup HTML + inline `<style>` block directly.
3. Compared DOM shapes element-by-element and class-by-class.
4. Read `pipeline-state/mamas-munches-131-2026-05-17-134327/extract.json` per_section_results.
5. Read `plugins/sgs-blocks/src/blocks/hero/render.php` lines 611–771.
6. Playwright screenshots at 1440px viewport to visually confirm.

---

## Brand Section

### Mockup DOM (from `index.html` body, line ~181)

```html
<section class="sgs-brand" aria-labelledby="story-h2">
  <div class="sgs-brand__content">
    <h2 id="story-h2" class="sgs-brand__headline">A story that started with a friend</h2>
    <blockquote class="sgs-brand__body">
      <p>She was struggling...</p>
      <p>They helped her...</p>
      <p>Now I make them...</p>
      <footer>— Zainab, Founder of Mama's Munches</footer>
    </blockquote>
    <a href="/about/" class="sgs-brand__cta sgs-button sgs-button--ghost">Read the full story →</a>
  </div>
  <img class="sgs-brand__image" ...>
</section>
```

### Rendered DOM (from live HTML, offsets 20437–23050)

```html
<section class="sgs-container sgs-container--grid sgs-container--width-wide sgs-cols-2
  sgs-cols-tablet-2 sgs-cols-mobile-1 sgs-brand wp-block-sgs-container
  has-background has-surface-alt-background-color"
  style="gap:var(--wp--preset--spacing--32); display:grid; grid-template-columns:1fr 1fr; ...">

  <section class="sgs-container sgs-container--stack sgs-container--width-wide
    sgs-brand__content wp-block-sgs-container">

    <div class="wp-block-sgs-heading sgs-brand__headline wp-block-sgs-heading has-text-color">
      <h2 class="wp-block-sgs-heading__headline" id="story-h2"
          style="color:var(--wp--preset--color--text); font-size:28px; font-weight:600; ...">
        A story that started with a friend
      </h2>
    </div>

    <section class="sgs-container sgs-container--stack sgs-container--width-wide
      sgs-brand__body wp-block-sgs-container">
      <p>She was struggling...</p>
      <p>They helped her...</p>
      <p>Now I make them...</p>
      <p>— Zainab, Founder of Mama's Munches</p>
    </section>

    <div class="sgs-button-wrapper sgs-brand__cta sgs-button sgs-button--ghost wp-block-sgs-button">
      <a href="/about/" class="sgs-button is-style-primary">Read the full story →</a>
    </div>
  </section>

  <img class="sgs-media sgs-media--align-left sgs-brand__image wp-block-sgs-media sgs-media__img"
       style="object-fit:cover; object-position:center center; max-height:380px; border-radius:16px" ...>
</section>
```

### Brand DOM Shape Diff Table (7 mismatches)

| Slot | Mockup element | Rendered element | Impact |
|------|---------------|-----------------|--------|
| Root | `<section class="sgs-brand">` | `<section class="sgs-container sgs-container--grid ... sgs-brand">` | Low — `.sgs-brand` present in both |
| `__content` | `<div class="sgs-brand__content">` | `<section class="sgs-container sgs-container--stack ... sgs-brand__content">` | Low — BEM name preserved |
| `__headline` | `<h2 class="sgs-brand__headline">` | `<div class="wp-block-sgs-heading sgs-brand__headline"><h2 class="wp-block-sgs-heading__headline">` | Medium — h2 wrapped in extra div |
| `__body` | `<blockquote class="sgs-brand__body">` | `<section class="sgs-container ... sgs-brand__body">` | **HIGH — element type changed from blockquote to section** |
| Attribution | `<footer>— Zainab...</footer>` inside blockquote | `<p>— Zainab...</p>` inside section | **HIGH — kills blockquote + footer CSS** |
| `__cta` | `<a class="sgs-brand__cta sgs-button">` | `<div class="sgs-button-wrapper sgs-brand__cta"><a class="sgs-button">` | Low — visual output same |
| `__image` | `<img class="sgs-brand__image">` | `<img class="sgs-media sgs-brand__image wp-block-sgs-media">` | Low — extra classes, same element |

### Brand CSS: Dead Selectors

The mockup `<style>` block carries these rules that target the `<blockquote>` structure:

```css
blockquote { font-style: italic; }
blockquote p { font-size: 17px; color: var(--text-muted); line-height: 1.75; margin-bottom: 16px; }
blockquote footer {
  font-style: normal; font-size: 15px; font-weight: 600;
  color: var(--primary-dark); margin-top: 4px;
}
```

**All three rules are dead CSS against the rendered DOM.** The rendered body is `<section class="sgs-brand__body">` containing plain `<p>` elements. There is no `<blockquote>` in the rendered HTML.

Visible effect: the three body paragraphs render at default browser font-size (~16px), default line-height (~1.5), and default text colour (dark grey). Mockup renders them at 17px, 1.75 line-height, `text-muted` colour. The attribution line "— Zainab…" renders as a plain unstyled `<p>` instead of a bold, `primary-dark`-coloured attribution footer.

### Brand Gap Diff (not dead-CSS — genuine attr mismatch)

Desktop grid gap: mockup CSS at `@media (min-width: 768px)` sets `gap: 60px` between the content column and image column. The rendered `sgs-container` emits `gap:var(--wp--preset--spacing--32)` = **32px**. The converter lifted `gap: "32"` from the mobile rule; it did not detect the desktop override. This causes the content and image to sit ~28px closer together than the mockup at 1440px.

Image `max-height`: mockup CSS at desktop sets `max-height: 440px; height: 440px`. The rendered image has `max-height:380px` from block attribute. The converter read the mobile rule (380px) not the desktop override.

---

## Hero Section

### Mockup DOM (from `index.html` body, line ~131)

```html
<section class="sgs-hero" aria-labelledby="hero-h1">
  <div class="sgs-hero__content">
    <span class="sgs-section-heading__label">Handmade in Birmingham</span>
    <h1 id="hero-h1">Made for the mum<br>who needs it most</h1>
    <p class="sgs-hero__sub">Handmade lactation cookies with proper galactagogue ingredients...</p>
    <div class="sgs-hero__ctas">
      <a href="/shop/" class="sgs-button sgs-button--primary">Shop Zookies</a>
      <a href="/product/trial-pack/" class="sgs-button sgs-button--secondary">Try 3 for £5</a>
    </div>
  </div>
  <div class="sgs-hero__media">
    <img class="sgs-hero__split-image sgs-hero__split-image--mobile" ...>
    <img class="sgs-hero__split-image sgs-hero__split-image--desktop" ...>
  </div>
</section>
```

### Rendered DOM (from live HTML, offset ~12303)

```html
<section class="sgs-hero sgs-hero--split sgs-hero--align-left sgs-hero-b53ade04
  wp-block-sgs-hero has-text-color has-background has-surface-pink-background-color"
  style="display:grid; grid-template-columns:1fr 1fr; gap:0px; ...">

  <div class="sgs-hero__content" style="display:flex; flex-direction:column; justify-content:center">
    <span class="sgs-hero__label" style="font-size:12px; font-weight:600; ...">Handmade in Birmingham</span>
    <h1 class="sgs-hero__headline" style="color:var(--wp--preset--color--text)">
      Made for the mumwho needs it most
    </h1>
    <p class="sgs-hero__subheadline" style="color:var(...); line-height:1.65em">
      Handmade lactation cookies...
    </p>
    <div class="sgs-hero__ctas"></div>   <!-- EMPTY -->
  </div>

  <div class="sgs-hero__media">
    <img class="sgs-hero__split-image sgs-hero__split-image--mobile" ...>
    <img class="sgs-hero__split-image sgs-hero__split-image--desktop" ...>
  </div>
</section>
```

### Hero DOM Shape Diff Table (5 mismatches)

| Slot | Mockup | Rendered | Impact |
|------|--------|----------|--------|
| Root | `<section class="sgs-hero">` | `<section class="sgs-hero sgs-hero--split ... wp-block-sgs-hero">` | Low — `.sgs-hero` present |
| Label | `<span class="sgs-section-heading__label">` | `<span class="sgs-hero__label">` | Low — rendered has own inline styles covering same visuals |
| Subheadline | `<p class="sgs-hero__sub">` | `<p class="sgs-hero__subheadline">` | Medium — **dead CSS for `.sgs-hero__sub`** |
| Headline text | `Made for the mum<br>who needs it most` | `Made for the mumwho needs it most` | **HIGH — `<br>` collapsed during text extraction, no word boundary** |
| CTAs | `<div class="sgs-hero__ctas"><a>...</a><a>...</a></div>` | `<div class="sgs-hero__ctas"></div>` | **CRITICAL — both CTA buttons are absent** |

### Hero CTA Root Cause

The pipeline converter emitted a **self-closing** block marker with CTA data as legacy attributes:

```
<!-- wp:sgs/hero {"ctaPrimaryText":"Shop Zookies","ctaPrimaryUrl":"/shop/",
  "ctaSecondaryText":"Try 3 for £5","ctaSecondaryUrl":"/product/trial-pack/",...} /-->
```

`render.php` line 611–613 documents that CTA buttons are now rendered via `sgs/button` InnerBlocks — the legacy `ctaPrimary*` / `ctaSecondary*` attrs are migration stubs handled by `deprecated.js`. `render.php` line 770–771 does:

```php
$content_html .= '<div class="sgs-hero__ctas">' . $content . '</div>';
```

`$content` is WordPress's InnerBlocks output. With no InnerBlocks children (self-closing block), `$content` = `""`. The `<div class="sgs-hero__ctas">` wrapper is emitted but empty. Both CTA buttons are invisible to the user.

### Hero Dead CSS

The mockup CSS rule `.sgs-hero__sub` (font-size 16px, colour, line-height, margin-bottom 24px) is dead against the rendered class `.sgs-hero__subheadline`. However, the rendered `<p>` carries its own `style` attribute for `line-height:1.65em`, so line-height matches. Font-size is not forced inline and falls to block default (render.php sets 16px via internal logic), so this difference is partially self-correcting.

The mockup CSS rule `.sgs-hero__content h1 { padding: 56px 48px }` at `@media (min-width: 768px)` applies to the content column. The rendered version has no equivalent padding via inline style — `justify-content:center` is set but no padding. This collapses the horizontal breathing room inside the content column at 1440px.

---

## Diagnosis Summary

### Cause 1 — DOM Shape Mismatch (brand `__body`)

**What:** Mockup uses `<blockquote class="sgs-brand__body">` with `<p>` + `<footer>` children. Rendered uses `<section class="sgs-brand__body">` with all `<p>` children.

**Why it happened:** The converter recognised the semantic slot and preserved the BEM class name, but block markup used `sgs/container` (which renders as `<section>`) and `core/paragraph` blocks for the attribution line rather than a blockquote element.

**Effect on pixel-diff:** Body text lacks italic, muted colour, and tighter line-height. Attribution lacks bold weight and `primary-dark` colour. At 1440px the brand section's left column diverges by ~4–6px of text flow difference per line. **Estimated contribution to brand 1440 pixel-diff: ~35–40% of the 43.7% gap.**

### Cause 2 — Converter Written as Self-Closing (hero CTAs)

**What:** `sgs/hero` block requires `sgs/button` children as InnerBlocks for the CTA div. Converter emitted a self-closing block with legacy CTA attrs instead.

**Effect on pixel-diff:** At 1440px the hero content column is missing ~80px of button area. The subheadline and label shift upward. Entire hero proportions differ. **Estimated contribution to hero 1440 pixel-diff: ~50–55% of the 67.8% gap.**

### Cause 3 — `<br>` Collapse in Headline

**What:** Mockup headline has `<br>` between "mum" and "who". `innerText` extraction during cv2 collapses it without inserting a space, producing "mumwho". The word runs together on a single baseline.

**Effect:** Minor text reflow. At 1440px with large headline font-size the two words sit on the same line rather than wrapping, reducing headline visual weight. **Estimated contribution: ~5–8% of hero gap.**

### Cause 4 — Responsive Attribute Not Lifted (brand gap + image height)

**What:** Converter read the mobile CSS value (gap 32px, image max-height 380px) but did not detect the `@media (min-width: 768px)` overrides (gap 60px, height 440px). Desktop renders with tighter spacing and shorter image.

**Effect:** At 1440px the brand image appears vertically shorter than the mockup and the two columns sit closer together. **Estimated contribution: ~10–15% of brand gap.**

### Cause 5 — Dead CSS on `.sgs-hero__sub`

Minor. Rendered class is `.sgs-hero__subheadline`. Mockup CSS targets `.sgs-hero__sub`. However render.php pushes matching values via inline style for line-height. Font-size divergence is small. **Estimated contribution: ~3–5% of hero gap.**

---

## Verdict: DOM Shape Mismatch is Primary

Both sections fail primarily due to **DOM shape mismatch**, not dead CSS selectors. The class names are largely preserved (the BEM structure is right) but the element types differ in ways that break cascading CSS rules:

- `<blockquote>` → `<section>` kills the italic + muted-colour body text in brand
- Self-closing `wp:sgs/hero` → empty CTA div in hero

**No amount of attribute promotion in the pipeline will close these gaps** until:

1. Either the `brand` mockup's `<blockquote>` structure is replaced with semantic equivalents that the block system can render (e.g., paragraph colour/italic set at block attribute level), OR the style-variation CSS for Mama's Munches targets `.sgs-brand__body p` instead of `blockquote p`.

2. The converter emits `sgs/button` InnerBlocks children for hero CTAs, not a self-closing block with legacy CTA attrs.

3. The converter reads responsive CSS at the correct breakpoint for `gap` and `max-height` on brand (desktop value, not mobile fallback).

4. The headline `<br>` tag is preserved during extraction (replace `innerText` with `innerHTML` for the headline slot, then strip all tags except `<br>`).

---

## Per-Cause Fix Paths

| Cause | Fix location | Effort | Expected improvement |
|-------|-------------|--------|---------------------|
| Hero CTAs empty | Converter: emit open `<!-- wp:sgs/hero -->` + `<!-- wp:sgs/button -->` children; remove self-close | Small (1 converter change) | ~50–55pp off hero diff |
| Brand body blockquote → section | Style-variation CSS: retarget `blockquote p` → `.sgs-brand__body p`, `blockquote footer` → `.sgs-brand__body p:last-child` | Small (CSS only) | ~35–40pp off brand diff |
| `<br>` collapse | Converter: extract headline slot via `innerHTML`, strip all tags except `<br>` | Small (1 slot rule change) | ~5–8pp off hero diff |
| Desktop responsive attrs not lifted | Converter: read `@media (min-width: 768px)` block for gap + height attrs | Medium (responsive CSS parser) | ~10–15pp off brand diff |
| `.sgs-hero__sub` dead CSS | Style-variation CSS: add `.sgs-hero__subheadline` alias, or render.php already covers it inline | Trivial | ~3–5pp off hero diff |

**Priority order: CTA fix → brand body CSS retarget → `<br>` preservation → desktop responsive lift.**

Screenshots saved: `reports/2026-05-20-pipeline-root-gap-council/rendered-hero-1440.png` and `rendered-brand-1440.png`.
