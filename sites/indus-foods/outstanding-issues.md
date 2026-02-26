# Outstanding Issues — SGS Framework & Indus Foods Project

Compiled from session handoffs (sessions 11-16) and the SGS Master Audit sprint (2026-02-22).
Last updated: 2026-02-22

---

## 1. Critical Bugs (Fix Before Merge)

| Issue | File | Detail | Status |
|-------|------|--------|--------|
| `error_log()` calls active in production | `plugins/sgs-blocks/includes/heading-anchors.php:33,37,64,68` | Logs every heading on every page. Fills disk on shared hosting. | **FIXED** (audit agent, commit 7d45c78) |
| Absolute image URLs in CSS | `theme/sgs-theme/style.css:53,70,92,109,132` | `/wp-content/uploads/indus-foods/...` hard-coded. | **FIXED** (audit agent, commit 7d45c78) |
| `cta-section/render.php` font size helper | `plugins/sgs-blocks/src/blocks/cta-section/render.php:38` | Only handles slugs, not raw CSS values. | **FIXED** (audit agent, commit 7d45c78) |

---

## 2. Code Issues — Fixed in Audit Sprint

All items from the SGS Master Audit Decision Document fixed on 2026-02-22.

### CRITICAL (all fixed)
- C1: Hero background colour — already correct (accent)
- C2: Placeholder contact info — replaced with real info (0121 771 4330 / amir@indusfoodsltd.com)
- C4: Site title — changed to "Indus Foods Ltd" via WP-CLI
- C5: Navigation links — fixed to point to real pages
- C6: Copyright year — dynamic shortcode added

### HIGH (all fixed)
- H1-H4: Hero text, button labels, social icons — all fixed
- H12: Created /contact/ (post 57) and /apply-for-trade-account/ (post 58) pages
- H13: Responsive images — partial fix (srcset needs WP attachment IDs for full fix)
- H14-H21: Various content and styling fixes across all sections
- H20: All 7 templates switched to header-sticky

### MEDIUM (mostly fixed)
- M3-M5, M7-M14, M16, M18-M26: All fixed
- M9: Brand logo alt text set to empty (decorative, WCAG-correct)
- M15: !important cleanup — 8 band-aids removed, 34 legitimate ones documented (commit 21f97d0)
- M17: Off-canvas mobile nav — full drawer with focus trapping, backdrop, a11y (commit 17678c4)
- M2: Needs client input ("Brands" vs "5,000+ Products") — SKIPPED
- M6: Need to see logos visually to reorder — SKIPPED

### LOW (mostly fixed)
- L2, L4, L5, L11-L13, L15, L17: All fixed
- L11: Hero min-height no longer hardcoded; "Auto (fit content)" preset added
- L14: Pricing Table, Modal, Decorative Image blocks built (commit by sub-agent)
- L3: Mega Menu block built with Interactivity API, 6 template part variations (commit 1a7a0a6)
- L7, L8, L9, L10, L16: SKIPPED (our version better/acceptable)

---

## 3. Remaining Code Issues (Not Yet Fixed)

### Needs npm build
All new/modified block source files need `npm run build` before they work on the frontend:
- L3 Mega Menu block
- L14 Pricing Table, Modal, Decorative Image blocks
- M17 Off-canvas mobile nav
- M4 Testimonial accent variant (CSS done, editor JS missing)
- M16 Outline button variant (CSS done, editor JS missing)
- All 36 files changed by the main audit agent

### Security / Correctness
- **Colour detection too narrow** — `info-box`, `hero`, `cta-section`, `testimonial-slider` render.php check for `#` or `rgb` only. Will break with `hsl()`, `oklch()`.
- **`$used_slugs` not reset between posts** — `heading-anchors.php:79`. Archive pages get wrong anchor links.
- **`navigation ref="4"` is database-specific** — `header.html`. Nav post ID only exists on dev site.

### Accessibility
- **Testimonial slider tab ARIA incomplete** — dots missing `aria-controls`, slides missing `role="tabpanel"`.
- **Info Box link has no accessible name** — when whole card is wrapped in `<a>`.

### Architecture
- **Colour helper duplicated 4x** — should be shared function in `includes/render-helpers.php`.
- **`lucide-react` unused devDependency** — remove from package.json.
- **No `prestart` hook for icon generation**.

---

## 4. Indus Foods Pages Missing

| Page | Status |
|------|--------|
| /contact/ | Created (post 57) |
| /apply-for-trade-account/ | Created (post 58) |
| /food-service/ | Not started |
| /manufacturing/ | Not started |
| /retail/ | Not started |
| /wholesale/ | Not started |
| /brands/ | Not started |
| /our-story/ | Not started |
| /certifications/ | Not started |
| /blog/ | Not started |
| /trade/request-catalogue/ | Not started |
| /trade/delivery-logistics/ | Not started |
| /trade/terms-conditions/ | Not started |

---

## 5. Deploy Issues (palestine-lives.org)

Issues found during 2026-02-22 deploy session:

| Issue | Status | Detail |
|-------|--------|--------|
| Background sections not full-width | **TODO** | Sections need `alignfull` on wrapper groups to stretch edge-to-edge |
| Quick Links bullet dots showing | **TODO** | `is-style-no-bullets` CSS being overridden by WP core specificity |
| Google Maps embed in footer | **Deployed** | May need API key for full rendering |
| SVG upload blocked by default | **Fixed** | mu-plugin `svg-support.php` added to allow SVG uploads |
| SCP creates nested directories | **Known** | Use tar + extract approach instead of `scp -r` for reliable deploys |
| Hostinger caches CSS aggressively | **Known** | Bump version in style.css to bust cache; currently 1.2.1 |
| Broken data-sgs-animation in homepage HTML | **Fixed** | Malformed attributes were eating heading text; fixed via PHP script |

---

## 6. Visual Polish (move to #indus channel)

These are Indus-specific visual refinements, not framework issues:

- Testimonial section has white bg (should match test site's blue/primary)
- Info-box icon styling differences vs test site
- Footer social icon hover effects need matching
- Copyright bar styling refinements
- Background colour sections not stretching full width
- Service card layout/sizing on different viewports

---

## 7. Testing Not Done

- [ ] npm run build (blocks plugin)
- [ ] iPhone Safari — full page load, nav, carousel, slider
- [ ] Android Chrome
- [ ] Navigation menu dropdowns — hover and touch
- [ ] Brand carousel touch scroll
- [ ] Testimonial slider autoplay
- [ ] Accordion expand/collapse with keyboard
- [ ] ToC scroll spy
- [ ] End-to-end form submission
- [ ] Lighthouse audit
- [ ] WAVE accessibility check
- [ ] New blocks: Pricing Table, Modal, Decorative Image, Mega Menu

---

## 8. Documentation Out of Date

| File | Problem | Status |
|------|---------|--------|
| `specs/01-SGS-THEME.md` | Shows DM Serif Display + DM Sans as default fonts. Actual: Inter variable. | TODO |
| `specs/02-SGS-BLOCKS.md:1034` | States Firefox 136+ but should be 135+. | TODO |
| `theme.json` | contentSize was 800px, now 1200px. wideSize was 1200px, now 1400px. | **FIXED** |

---

## 9. Broken Blocks

| Block | Status | Detail |
|-------|--------|--------|
| Table of Contents | Broken | Regex heading detection may miss blocks nested in custom HTML |
| Form blocks | Untested | REST endpoints built but never end-to-end tested |
| Accordion | Untested | Never browser-tested for expand/collapse, FAQ Schema |

---

## 10. Git Status

- **Branch:** feature/indus-foods-homepage
- **Latest commits:**
  - `26a2488` — fix: deploy fixes - layout width, logo, footer overhaul, broken HTML
  - `1a7a0a6` — feat: mega menu block
  - `21f97d0` — refactor: !important cleanup
  - `17678c4` — feat: off-canvas mobile nav
  - `935e1a0` — fix: hero min-height not hardcoded
  - `7d45c78` — fix: audit fixes (36 files)
- **Working tree:** Clean
- **npm build:** NOT RUN (source changes only, build/ is stale)
