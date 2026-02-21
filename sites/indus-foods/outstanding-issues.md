# Outstanding Issues — SGS Framework & Indus Foods Project

Compiled from session handoffs (sessions 11–16) and the current code review.
Last updated: 2026-02-20

---

## 1. Critical Bugs (Fix Before Merge)

These will cause production problems if left unfixed.

| Issue | File | Detail |
|-------|------|--------|
| `error_log()` calls active in production | `plugins/sgs-blocks/includes/heading-anchors.php:33,37,64,68` | Logs every heading on every page. Fills disk on shared hosting. Remove all four calls. |
| Absolute image URLs in CSS | `theme/sgs-theme/style.css:53,70,92,109,132` | `/wp-content/uploads/indus-foods/...` hard-coded. Will silently break on any environment except the dev site. |
| `cta-section/render.php` font size helper | `plugins/sgs-blocks/src/blocks/cta-section/render.php:38` | Only handles slugs, not raw CSS values (e.g. `16px`). Will produce broken `var(--wp--preset--font-size--16px)` output. `info-box` and `hero` handle both — this one needs the same fix. |

---

## 2. Identified But Unfixed Code Issues

Found in code review or previous sessions, not yet resolved.

### Security / Correctness
- **Colour detection too narrow** — `info-box`, `hero`, `cta-section`, `testimonial-slider` render.php files check for `#` or `rgb` prefix only. Will break with `hsl()`, `oklch()`, or values with leading whitespace. Gutenberg is moving toward oklch. Fix regex to cover all CSS colour formats.
- **`$used_slugs` not reset between posts** — `heading-anchors.php:79`. On archive pages (multiple posts per request), heading slugs from post A bleed into post B, producing broken ToC anchor links. Reset `$used_slugs` when `$checked_post_id` changes.
- **`navigation ref="4"` is database-specific** — `theme/sgs-theme/parts/header.html`. The nav post ID 4 only exists on the dev site. Will render nothing on any other install.

### Accessibility
- **Testimonial slider tab ARIA incomplete** — `testimonial-slider/render.php:176–186`. Dots use `role="tab"` and `role="tablist"` but are missing `aria-controls` pointing to slide IDs, and slides are missing `role="tabpanel"` with `aria-labelledby`. The half-implemented pattern is worse than no ARIA. Either complete it or switch to simple labelled buttons.

### Architecture / Code Quality
- **Colour helper duplicated 4×** — `info-box`, `hero`, `cta-section`, `testimonial-slider` all define the same `$colour_var`/`$colour_value` closure. Should be a shared function in `includes/render-helpers.php`.
- **Indus Foods CSS in the base theme stylesheet** — `theme/sgs-theme/style.css` contains client-specific CSS. It is scoped to `.home` so it won't break other clients visually, but it adds dead weight. Should move to the Indus Foods style variation or a conditional load.
- **`lucide-react` unused devDependency** — `plugins/sgs-blocks/package.json`. Adds ~1MB to node_modules. Remove it.
- **No `prestart` hook for icon generation** — `npm start` on a fresh clone won't have `lucide-icons.php`. Add a `prestart` script matching `prebuild`.
- **`lucide-icons.php` has no exemption comment** — 1,963 lines. Exceeds 300-line PHP limit. Needs `// Auto-generated — exempt from 300-line limit. See scripts/generate-icons.js.` at the top.

### Not Yet Tested
- **DesignTokenPicker stores hex vs slug** — noted in session 11. `ColorPalette` returns hex values but `colourVar()` expects slugs. Not yet tested with real block content. May cause colour breakage when users customise blocks.
- **Font preloading duplication** — `functions.php` manually preloads Inter but WP 6.9 may also preload from theme.json `fontFace`. Check page source for duplicate `<link rel="preload">` tags.

---

## 3. Broken Blocks

| Block | Status | Detail |
|-------|--------|--------|
| Table of Contents | Broken | Noted broken from session 12. Not blocking homepage. Root cause unknown — regex heading detection may miss blocks nested in custom HTML. |
| Form blocks | Untested | Form REST endpoints were built but end-to-end submission has never been tested. |
| Accordion | Untested | Deployed but never browser-tested. No confirmation expand/collapse works, FAQ Schema appears in source, or progressive enhancement (`<details>`) fallback works. |

---

## 4. Indus Foods Pages Missing

All navigation links currently 404. Pages to build:

**Audience pages (high priority — share one template):**
- `/food-service/`
- `/manufacturing/`
- `/retail/`
- `/wholesale/`

**Trade:**
- `/apply-for-trade-account/` — 4-step form (About You, Business Details, Account Preferences, Review & Submit)
- `/trade/request-catalogue/`
- `/trade/delivery-logistics/`
- `/trade/terms-conditions/`

**Company:**
- `/our-story/`
- `/certifications/`
- `/community-charity/`
- `/sustainability/`
- `/careers/`

**Other:**
- `/brands/`
- `/blog/`
- `/contact/`

---

## 5. Testing Not Done

None of these have been verified since deployment:

- [ ] iPhone Safari — full page load, nav dropdown, carousel, slider
- [ ] Android Chrome — same as above
- [ ] Navigation menu dropdowns — hover and touch
- [ ] Brand carousel touch scroll
- [ ] Testimonial slider autoplay
- [ ] All images load (some are placeholders)
- [ ] CTA button links (all 404 until pages are built)
- [ ] Accordion expand/collapse with keyboard
- [ ] ToC scroll spy and smooth scroll
- [ ] Review Schema JSON-LD output on testimonials
- [ ] End-to-end form submission
- [ ] Lighthouse audit (performance, accessibility, SEO, best practices)
- [ ] WAVE accessibility check
- [ ] 44px touch targets on all buttons

---

## 6. Content Placeholders Waiting on Client

- **Service card images** — currently using food photos (seekh kebab, cake rusks, samosas, ras malai). Client needs to provide proper hero images for: Food Service, Manufacturing, Retail, Wholesale.
- **Real customer testimonials** — current testimonials are placeholder text.
- **Product images** for service pages.

---

## 7. Documentation Out of Date

| File | Problem |
|------|---------|
| `sites/indus-foods/CLAUDE.md` | Design tokens still show navy/gold (`#1A3A5C`/`#D4A843`) and DM Serif Display/DM Sans. Actual values: teal (`#0a7ea8`), gold (`#d8ca50`), Montserrat, Source Sans 3. |
| `specs/02-SGS-BLOCKS.md:1034` | States Firefox 136+ but should be 135+. Minor. |
| `specs/01-SGS-THEME.md` | Still shows DM Serif Display + DM Sans as default fonts. Actual default is Inter variable. |

---

## 8. SGS Framework Blocks Not Yet Built

From `specs/09-GOLD-STANDARD-AUDIT.md` — blocks all 4 competitors have that SGS is missing:

| Block | Priority | Competitor coverage |
|-------|----------|-------------------|
| Post Grid / Query Loop | High | All 4 competitors |
| Image Gallery with lightbox | High | 3 of 4 competitors |
| Tabs | Medium | — |
| Pricing Table | Medium | — |
| Modal / Popup | Medium | — |
| SVG Background | Low | — |
| Announcement Bar | Low | — |

---

## Accessibility Audit Results (WCAG 2.2 AA)

**Critical — must fix:**

| Issue | Block | Detail |
|-------|-------|--------|
| Keyboard navigation broken | Testimonial Slider | Arrow key listener on `.sgs-testimonial-slider__track` only triggers when that element has focus. Keyboard users can't navigate slides reliably. |
| `e.preventDefault()` breaks accordion | Accordion `view.js:56` | Native `<details>/<summary>` toggle is disabled. Without JS, accordion items don't open. Progressive enhancement promise is broken. |
| Info Box link has no accessible name | `info-box/render.php:119–126` | When the whole card is wrapped in `<a>`, the link has no text. Screen readers announce "Link" with no context. |

**High — should fix:**

| Issue | Block | Detail |
|-------|-------|--------|
| `tabindex="0"` on slider track | Testimonial Slider | Track is focusable but not useful. Users expect to tab straight to prev/next/dot controls. |
| Missing `aria-expanded` on accordion summary | Accordion Item | Native `<details>` handles state, but explicit `aria-expanded` improves legacy screen reader support. |
| Logo links have no accessible name | Brand Strip | If logos link somewhere, the link has no name — only an image. Screen reader users hear "Link" with no context. |
| Links that open in new tab give no warning | CTA Section | `target="_blank"` buttons don't say so. Add "(opens in new tab)" to label or `aria-label`. |

**Medium:**
- Decorative pseudo-element images — low risk (background images ignored by screen readers), but document intentionality
- WhatsApp CTA `aria-label` relies on CSS visibility — fragile. Always set `aria-label={label || 'Chat on WhatsApp'}`

---

## Interaction Design Findings

| Component | Rating | Key Issues |
|-----------|--------|-----------|
| Testimonial Slider | Excellent | No changes needed |
| Counter | Excellent | No changes needed |
| Table of Contents | Excellent | Scroll spy intersection margin hard-coded at -66% |
| WhatsApp CTA | Excellent | No changes needed |
| Accordion | Needs Polish | Linear easing (should be ease-out/in); no Space/Enter keyboard support |
| Form Block | Needs Polish | No step transition animations; no progress indicator; jarring step changes |

**Accordion fixes needed:**
```css
/* Icon: ease-out on open, ease-in on close */
.sgs-accordion-item__icon { transition: transform 0.2s ease-in; }
.sgs-accordion-item[open] .sgs-accordion-item__icon { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
```

**Form block fixes needed:**
```css
.sgs-form-step { transition: opacity 0.2s ease, transform 0.2s ease; }
.sgs-form-step[data-hidden="true"] { opacity: 0; transform: translateY(8px); pointer-events: none; }
.sgs-form-progress-bar { transition: width 0.3s ease; }
@media (prefers-reduced-motion: reduce) { .sgs-form-step, .sgs-form-progress-bar { transition: none; } }
```

---

## 10. Visual Comparison — Homepage vs Original (All 3 Devices)

Identified via Playwright screenshot comparison on 2026-02-21.
Original: `https://lightsalmon-tarsier-683012.hostingersite.com/`
Dev site: `https://palestine-lives.org/`

### Critical — Visible Immediately

| # | Issue | Devices | Detail |
|---|-------|---------|--------|
| 1 | **Mobile nav completely broken** | Mobile | No hamburger menu renders at 375px. Navigation is inaccessible. |
| 2 | **Services section blank / not rendering** | All | The "Our UK Wide Food Services" section produces a large blank space across all viewports. The block exists in the editor but is not outputting HTML. Root cause unknown — investigate `render.php` for the services/info-box block. |
| 3 | **Hero background colour wrong** | All | Dev site hero is teal (`#0a7ea8`). Original is yellow/mustard (the Indus Foods `--accent` / `#d8ca50`). Fix: set `backgroundColor` attribute or section background in the Indus Foods style variation or via the block's inspector control. Nothing hardcoded. |
| 4 | **"Why Choose" section: white cards should not exist** | All | Dev site renders each icon+heading+text item inside a white bordered card. Original places items directly on the yellow/mustard section background with no card. Fix: the info-box or feature-grid block must not apply card styling when background is set to the accent colour, OR a block attribute must toggle card/no-card display. Must be editor-configurable. |
| 5 | **Testimonials section background wrong** | All | Dev site testimonials section has a teal background. Original is white/light. Fix: update the testimonial-slider block's section background in the homepage content or style variation. |

### Significant — Noticeable on Close Inspection

| # | Issue | Devices | Detail |
|---|-------|---------|--------|
| 6 | **Tablet nav wraps to two rows** | Tablet | At 768px, nav items wrap because the "Register For a Trade Account" button takes up too much space. Original nav stays on one row at this breakpoint. Fix: either hide the CTA button from the nav at tablet or reduce nav item spacing. Must be responsive. |
| 7 | **Top bar: phone/email are plain text links** | All | Original shows pill-shaped icon buttons (phone icon + number, email icon + address). Dev site shows plain `<a>` links with no icon and no pill style. Fix: the top bar widget/pattern needs icon button styling, controlled by the Indus Foods style variation. |
| 8 | **Hero: single CTA button on mobile** | Mobile | "Apply For A Trade Account" button disappears on mobile. Only "Request Our Catalogue" is visible. Fix: check hero block button visibility rules in the Indus Foods variation or hero block responsive CSS. |
| 9 | **Hero buttons: side by side instead of stacked** | All | Original stacks the two CTA buttons vertically. Dev site places them side by side. Fix: hero block button layout attribute or CSS flex-direction in the Indus Foods variation. |
| 10 | **Services section title wrong** | All | Dev site shows "Our Services". Original shows "Our UK Wide Food Services". Fix: update page content in editor — not a code issue. |
| 11 | **Services section button labels wrong** | All | All four service card buttons say "Learn More". Original has specific labels: "Top Ethnic Food Services", "Food Manufacturer", "Food Retailer", "UK Food Wholesaler". Fix: update page content in editor. |
| 12 | **Social icons: TikTok instead of Instagram** | All | Dev site top bar has LinkedIn, Facebook, TikTok, Google. Original has LinkedIn, Facebook, Google, Instagram. Fix: update social links pattern/widget in the header — editor change. |

### Minor

| # | Issue | Devices | Detail |
|---|-------|---------|--------|
| 13 | **Footer logo: stacked version instead of horizontal** | All | Dev site uses the stacked logo variant. Original uses the horizontal animated SVG. Fix: swap logo in footer pattern — editor change. |
| 14 | **Footer social icons: flat/grey instead of brand colours** | All | Original footer social icons have brand colours (LinkedIn blue, Facebook blue, Google red, Instagram gradient). Dev site shows flat grey icons. Fix: Indus Foods style variation should apply brand colour overrides to social icon links. |
| 15 | **"Get Directions" button: filled instead of outline** | All | Original uses a yellow outline/ghost button. Dev site renders it as a filled yellow button. Fix: button variant attribute on the Get Directions button — editor change. |
| 16 | **Footer logo oversized on mobile** | Mobile | Logo takes up excessive vertical space in the footer column on 375px. Fix: max-width cap on footer logo in Indus Foods variation responsive CSS. |
| 17 | **Brands section background** | All | Dev site "Our Brands" section appears on white at certain scroll positions. Original is teal background with gold heading text. Verify in editor that the correct background colour attribute is set. |

### Hover Effects — Mismatches (identified from CSS + visual testing, 2026-02-21)

All hover states in the copy are defined in block CSS files. Issues are where those effects don't match the original.

| # | Element | Original hover | Copy hover | Status | Fix |
|---|---------|---------------|------------|--------|-----|
| H1 | Primary hero CTA | Full invert — black fill → ghost/outline, gold text | Changes to `primary-dark` bg, white text (`--accent:hover` in hero/style.css:115) | **Mismatch** | Update `--accent:hover` in hero/style.css to match invert behaviour, or change button variant used on the page |
| H2 | Secondary hero CTA | Inverts — outline → teal fill, white text | Fills with `surface` (white), text `primary-dark` (`--outline:hover` in hero/style.css:139) | **Mismatch** | Update `--outline:hover` to fill with primary teal + white text |
| H3 | Top-level nav links | Gold/yellow background fill on hover | **No hover state defined** — `core-blocks.css` only styles submenu items, not top-level links | **Missing** | Add top-level nav link hover to `core-blocks.css`: `background: var(--wp--preset--color--accent)` |
| H4 | Why Choose items | No hover effect (no cards, items on plain yellow bg) | `hover-lift`, `hover-border-accent`, or `hover-glow` class activates if set on the block — verify what class is set in editor | **Verify** | In the block editor, confirm no hover modifier class is applied to these info-box blocks |
| H5 | Service cards | No hover on card container | `hover-zoom` or `hover-lift` activates if class is set — verify in editor | **Verify** | In editor, confirm no hover modifier class is set on the services card-grid block |
| H6 | CTA section buttons | Full invert (same as hero buttons) | `opacity: 0.9` + 1px lift only (`cta-section/style.css:126`) | **Mismatch** | Update `sgs-cta-section__btn:hover` to match the hero button invert pattern |
| H7 | Testimonial arrows | Visual unclear — arrows advance slide | background/border/text → primary teal on hover (`testimonial-slider/style.css:182`) | **Acceptable** | No change needed — copy is solid |
| H8 | Footer nav links | Turns gold on hover | Turns `accent` colour on hover | **Match** ✓ | — |
| H9 | Brand strip | No pause, no greyscale effect | Scrolling strip pauses on hover (`--scrolling` mode in brand-strip/style.css:63) | **Copy is better** | Keep as-is |
| H10 | Submenu links | Yellow highlight | Text → primary, bg → surface-alt | **Different but acceptable** | Low priority |

### Fix Approach (Architecture Reminder)

- **Never hardcode** — all colour, spacing, and layout changes go through block attributes (editor-configurable) or the `indus-foods.json` style variation
- **Variation-specific CSS** — any CSS not expressible via theme.json tokens goes in `functions.php` via `wp_add_inline_style()` gated on `'indus-foods' === $active_style`
- **Images in assets** — any decorative images used by the variation go in `theme/sgs-theme/assets/`, never `uploads/`
- **Build required** — after any PHP/JS block changes: `cd plugins/sgs-blocks && npm run build`, then deploy via SCP

---

## 9. Minor / Housekeeping

- **CRLF warnings on Windows** — every commit shows LF → CRLF warnings. Cosmetic. Add `.gitattributes` to enforce LF.
- **ToC `$used_slugs` / `render.php` generate slugs independently** — both use `sanitize_title` + counter suffix but separate arrays. Could cause anchor mismatches on pages with duplicate heading text.
- **Review Schema `itemReviewed` defaults to site name as `LocalBusiness`** — may need per-page config for multi-service sites in future.
- **`heading-anchors.php` `render_block` filter runs on every block** — not just headings. Has an early return for non-heading blocks, which is correct, but adds overhead proportional to total block count per page.
