# Lighthouse 100/100 All Categories — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve 100/100 on Lighthouse Performance, Accessibility, Best Practices, and SEO across all 5 deployed pages on palestine-lives.org.

**Architecture:** Fix issues at the theme and plugin code level so all current and future sites benefit. No one-off server patches or content hacks.

**Tech Stack:** WordPress block theme (sgs-theme), Gutenberg blocks plugin (sgs-blocks), PHP, CSS, JS.

---

## Baseline Scores (2026-03-18)

| Page | Perf (M) | A11y (M) | BP (M) | SEO (M) | Perf (D) | A11y (D) |
|------|----------|----------|--------|---------|----------|----------|
| Homepage | 71 | 97 | 100 | 92 | 94 | 89 |
| Food Service | 73 | 96 | 100 | 92 | — | — |
| Manufacturing | 70 | 95 | 100 | 92 | — | — |
| Retail | 79 | 95 | 96 | 92 | — | — |
| Wholesale | 73 | 95 | 100 | 92 | — | — |

---

## Task 1: SEO — Fix robots.txt (92 → 100)

**Root cause:** Cloudflare injects `Content-Signal: search=yes,ai-train=no` (unknown directive) into the robots.txt response at the proxy level. Physical file on disk is clean. Lighthouse flags this as invalid.

**Files:**
- Modify: `theme/sgs-theme/functions.php` — add `robots_txt` filter
- Delete: physical `robots.txt` on server (let WordPress generate it virtually)

- [ ] **Step 1:** Delete the physical robots.txt on the server so WordPress's virtual robots.txt takes over
- [ ] **Step 2:** Add a `robots_txt` filter in functions.php that outputs only valid directives
- [ ] **Step 3:** If Cloudflare still injects Content-Signal (proxy-level rewrite), flag as infrastructure blocker — need Hostinger dashboard access to disable

---

## Task 2: Accessibility — Fix Contrast Ratios (biggest a11y issue)

**Root cause:** Gold #D8CA50 on white background = 2.73:1. Needs 4.5:1 minimum for normal text, 3:1 for large text. This affects the Indus Foods style variation tokens.

**Files:**
- Modify: `theme/sgs-theme/styles/indus-foods.json` — darken gold accent
- Modify: Block render.php files that output hardcoded colour values

- [ ] **Step 1:** Calculate a WCAG AA-compliant gold that maintains brand feel. Target: #8B7A00 or similar (4.5:1+ on white)
- [ ] **Step 2:** Update `indus-foods.json` accent colour token
- [ ] **Step 3:** Search all page content for hardcoded `#D8CA50` and replace with the new token value
- [ ] **Step 4:** Fix button contrast pairs (white text on light backgrounds)

---

## Task 3: Accessibility — Fix ARIA Role Containment

**Root cause:** Mega menu triggers have `role="menuitem"` but parent `<ul>` lacks `role="menubar"`. This is in the mega menu block's render output.

**Files:**
- Modify: `plugins/sgs-blocks/src/blocks/mega-menu/render.php` or the navigation filter
- Modify: `theme/sgs-theme/functions.php` — add `render_block` filter for navigation

- [ ] **Step 1:** Read the mega menu block's render.php to understand current ARIA output
- [ ] **Step 2:** Add `role="menubar"` to the parent `<ul>` element
- [ ] **Step 3:** Fix the "list contains non-li children" issue — ensure only `<li>` elements are direct children of navigation lists

---

## Task 4: Accessibility — Fix Heading Order (Service Pages)

**Root cause:** Service pages skip heading levels (e.g. h2 → h4). This is in the page content set via WP-CLI.

**Files:**
- Server content: Pages 65-68 via `wp post update`
- Review: Block render.php files that output headings — ensure they use the heading level from attributes

- [ ] **Step 1:** Audit heading structure on each service page via `wp post get --field=post_content`
- [ ] **Step 2:** Fix heading levels to be sequential (h1 → h2 → h3)
- [ ] **Step 3:** Ensure block render.php files respect the `level` attribute and don't hardcode heading levels

---

## Task 5: Best Practices — Fix Console Errors (Retail Page)

**Root cause:** JavaScript error logged to console on the Retail page.

**Files:**
- Likely: `plugins/sgs-blocks/src/blocks/*/view.js` — one of the frontend scripts

- [ ] **Step 1:** Navigate to Retail page in Playwright, capture console errors
- [ ] **Step 2:** Trace error to source file
- [ ] **Step 3:** Fix the JS error

---

## Task 6: Performance — Image Optimisation (biggest perf issue)

**Root cause:** Images served as PNG/JPG instead of WebP, missing explicit dimensions, too large for display size.

**Files:**
- Modify: `theme/sgs-theme/functions.php` — add WebP conversion on upload, add width/height to images
- Modify: Block render.php files — ensure all `<img>` tags have width/height attributes
- Modify: `.htaccess` or LiteSpeed config — serve WebP when available

- [ ] **Step 1:** Add `wp_get_attachment_image_attributes` filter in functions.php to always include width/height
- [ ] **Step 2:** Audit all block render.php files that output `<img>` tags — add width/height from attributes
- [ ] **Step 3:** Convert existing images to WebP on server (one-time)
- [ ] **Step 4:** Add LiteSpeed WebP replacement rule to serve .webp when browser supports it
- [ ] **Step 5:** Add `fetchpriority="high"` to hero images, `loading="lazy"` to below-fold images

---

## Task 7: Performance — Reduce Render-Blocking Resources

**Root cause:** CSS and JS loaded synchronously in `<head>` blocks rendering.

**Files:**
- Modify: `theme/sgs-theme/functions.php` — defer non-critical CSS/JS, preload critical
- Modify: Block registration — ensure viewScriptModule (already deferred by design)

- [ ] **Step 1:** Audit all enqueued styles and scripts in functions.php
- [ ] **Step 2:** Add `preload` for critical CSS, `defer` for non-critical JS
- [ ] **Step 3:** Inline critical above-fold CSS if needed
- [ ] **Step 4:** Preload hero image via `<link rel="preload">`

---

## Task 8: Performance — Fix Forced Reflow / CLS

**Root cause:** JavaScript reads layout properties then writes (forced synchronous layout). CLS from elements without reserved dimensions.

**Files:**
- Modify: `theme/sgs-theme/assets/js/` — any JS that causes reflow
- Modify: Block CSS — add explicit dimensions for dynamic elements (brand-strip, trust-bar counters)

- [ ] **Step 1:** Identify which JS files cause forced reflow via Playwright profiling
- [ ] **Step 2:** Batch DOM reads before writes
- [ ] **Step 3:** Add CSS `min-height` / `aspect-ratio` for CLS-causing elements (trust-bar, brand-strip)

---

## Task 9: Performance — Minify CSS + Reduce Unused JS

**Root cause:** CSS not minified (5KB savings). Unused JS loaded (200KB).

**Files:**
- Modify: `theme/sgs-theme/functions.php` — conditionally load block CSS
- Server: Enable LiteSpeed CSS/JS minification

- [ ] **Step 1:** Enable LiteSpeed CSS minification via WP-CLI
- [ ] **Step 2:** Audit unused JS — identify which scripts are loading but not needed on these pages
- [ ] **Step 3:** Conditionally enqueue scripts only when their blocks are present on the page

---

## Task 10: Deploy + Verify

- [ ] **Step 1:** `npm run build` — zero errors
- [ ] **Step 2:** Deploy via tar method
- [ ] **Step 3:** Clear OPcache + LiteSpeed cache
- [ ] **Step 4:** Re-run PageSpeed Insights on all 5 pages (mobile + desktop)
- [ ] **Step 5:** Confirm 100/100 across all categories
