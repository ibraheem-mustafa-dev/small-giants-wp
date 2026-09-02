# Detector findings — 18 — Decorative image needs an ARIA/alt-text answer

**Rule:** `18-decorative-image-aria` (`plugins/sgs-blocks/scripts/inspector-scan/rules/18-decorative-image-aria.js`)
**Validated:** 2026-09-02, via `/dispatching-parallel-agents` cross-checked against decisions.md, specs, `dev-setup.md`'s tooling catalogue.

**Problem:** A block renders an image with no decorative-toggle control and no alt-text field — WordPress/screen-readers get nothing to go on.

**Effect:** Accessibility gap: a screen-reader either announces nothing useful, or announces a meaningless filename, for this image.

**Validated count:** 15 genuine finding(s) (raw was 16; 1 excluded — `sgs/decorative-image` already hardcodes `aria-hidden` correctly in most paths, see note below)

## Your call

- [ ] Fix now (this session)
- [ ] Fix later (park it)
- [ ] Not worth it — leave as accepted backlog

**Menu:**
1. **[Recommended] Settle the decorative-toggle name once, then bulk-script** — this session's D918-adjacent work already settled `{element}Decorative` as the naming convention (S8). Apply the same shape here.
2. For blocks that already have an `alt`-style field but no decorative toggle: add the toggle alongside it (smaller, per-block fix).
3. Leave as tracked advisory backlog.

**Excluded as moot:** `sgs/decorative-image` — already hardcodes `aria-hidden="true"` + empty `alt` in most render paths (`render.php:204,290,468,491,549,560`); worth a quick confirmation pass that those paths cover real usage, not a new toggle.

---

### sgs/before-after (1)
- `plugins/sgs-blocks/src/blocks/before-after/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/brand-strip (1)
- `plugins/sgs-blocks/src/blocks/brand-strip/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/card-grid (1)
- `plugins/sgs-blocks/src/blocks/card-grid/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/cta-section (1)
- `plugins/sgs-blocks/src/blocks/cta-section/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/gallery (1)
- `plugins/sgs-blocks/src/blocks/gallery/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/hero (1)
- `plugins/sgs-blocks/src/blocks/hero/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/image-sequence (1)
- `plugins/sgs-blocks/src/blocks/image-sequence/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/nav-drawer (1)
- `plugins/sgs-blocks/src/blocks/nav-drawer/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/post-grid (1)
- `plugins/sgs-blocks/src/blocks/post-grid/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/product-card (1)
- `plugins/sgs-blocks/src/blocks/product-card/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/responsive-logo (1)
- `plugins/sgs-blocks/src/blocks/responsive-logo/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/social-icons (1)
- `plugins/sgs-blocks/src/blocks/social-icons/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/team-member (1)
- `plugins/sgs-blocks/src/blocks/team-member/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/testimonial (1)
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

### sgs/trust-bar (1)
- `plugins/sgs-blocks/src/blocks/trust-bar/edit.js` — no decorative-image toggle or general ARIA-label control is exposed.

