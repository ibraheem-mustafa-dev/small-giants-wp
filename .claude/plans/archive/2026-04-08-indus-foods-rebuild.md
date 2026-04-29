# Indus Foods Full Site Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire Indus Foods site on palestine-lives.org so every page is visually indistinguishable from the reference (lightsalmon-tarsier-683012.hostingersite.com) at 1440/768/375px — all via editor attributes, zero hardcoded CSS.

**Architecture:** Fix block attribute gaps first (transition, hover, shadow, border supports), then extract the reference design, map each section to SGS blocks, build section-by-section with per-section screenshot verification, run visual QA, and repeat for all 11 pages.

**Tech Stack:** WordPress 6.9, SGS Framework (55 blocks), WP-CLI, Playwright for screenshots, Gemini for visual comparison.

---

## Current State Assessment

| Item | Status |
|---|---|
| Templates (404, single, archive, search) | Already exist — no action needed |
| Spec drift (fonts) | Already fixed — no DM Serif references in spec |
| Header hardcodes | Phone, email, social links, CTA text all hardcoded in `header.html` |
| Deploy command alignment | `plugins/sgs-blocks/CLAUDE.md` and `sites/indus-foods/CLAUDE.md` still use scp -r |
| Transition controls | Only 3/55 blocks have them (gallery, post-grid, tabs) |
| Hover attributes | 7/55 blocks have them — homepage blocks trust-bar, brand-strip, testimonial-slider, heritage-strip, process-steps lack them |
| Shadow support | 0/55 blocks have `shadow: true` in supports |
| Border radius support | Only card-grid has `__experimentalBorder` — 8 homepage blocks need it |

---

## Session Plan: Phase 0 + Phase 1 (This Session)

### Task 0.1: Fix Header Hardcodes

**Files:**
- Modify: `theme/sgs-theme/parts/header.html`
- Modify: `theme/sgs-theme/functions.php` (add dynamic option rendering)

**Problem:** `header.html` lines 11, 15 hardcode `0121 771 4330` and `amir@indusfoodsltd.com`. Social links use `#`. CTA text says "Register For a Trade Account". These are Indus Foods-specific.

**Solution:** Header template parts in block themes are static HTML — they cannot use `get_option()` directly. The correct approach for a block theme:
1. Replace hardcoded phone/email with generic placeholders that work for any client
2. Use WordPress Site Editor to customise per-site (the phone/email are in paragraph blocks — editable in the editor)
3. The CTA button text and URL are also editor-editable
4. Social links are editor-editable (`wp:social-link` blocks)

This is actually already how it works — the template part IS editable in the Site Editor. The issue is the *default* content shipped with the theme. Fix the defaults to be generic SGS defaults, not Indus Foods content.

- [ ] Read `header.html` (done)
- [ ] Replace phone number with generic SGS placeholder: "Your Phone Number"
- [ ] Replace email with generic: "hello@example.com"
- [ ] Replace CTA text with generic: "Get Started"
- [ ] Replace CTA URL with generic: "/contact/"
- [ ] Keep social links as `#` (already generic placeholders)
- [ ] Commit to `main` (this is a core framework fix)

### Task 0.4: Fix Deploy Command Alignment

**Files:**
- Modify: `plugins/sgs-blocks/CLAUDE.md`
- Modify: `sites/indus-foods/CLAUDE.md`

- [ ] Update both files to reference the tar deploy method from framework CLAUDE.md
- [ ] Remove duplicated scp -r deploy commands
- [ ] Commit to `main`

### Task 1.1: Add Transition Controls to 7 Homepage Blocks

**Blocks:** hero, card-grid, info-box, cta-section, testimonial-slider, trust-bar, brand-strip

For each block:
- [ ] Read the block's `block.json`, `edit.js`, `render.php`/`save.js`, `style.css`
- [ ] Add `transitionDuration` and `transitionEasing` attributes to `block.json`
- [ ] Add inspector controls in `edit.js` (SelectControl for easing, TextControl for duration)
- [ ] Output CSS custom properties in `render.php` or `save.js`
- [ ] Add transition CSS rules in `style.css`
- [ ] `npm run build` — must pass with zero errors

**Order:** hero → card-grid → info-box → cta-section → testimonial-slider → trust-bar → brand-strip

### Task 1.2: Add Hover Attributes to 5 Missing Homepage Blocks

**Blocks:** testimonial-slider, trust-bar, brand-strip, process-steps, heritage-strip

These blocks have zero hover attributes. Add:
- `hoverBackgroundColour`, `hoverTextColour`, `hoverBorderColour`, `hoverEffect`
- Plus transition attributes from Task 1.1

For each block:
- [ ] Read the block files
- [ ] Add hover + transition attributes to `block.json`
- [ ] Add hover inspector controls in `edit.js`
- [ ] Add hover CSS rules in `style.css` using `:hover` pseudo-class
- [ ] Output CSS custom properties for hover values
- [ ] `npm run build` — must pass with zero errors

### Task 1.3: Add Shadow Support to 4 Content Blocks

**Blocks:** card-grid, info-box, testimonial, cta-section

- [ ] Add `"shadow": true` to `supports` in each block's `block.json`
- [ ] Verify shadow picker appears in editor after build
- [ ] `npm run build`

### Task 1.4: Add Border Support to 8 Homepage Blocks

**Blocks:** hero, info-box, testimonial, testimonial-slider, cta-section, trust-bar, heritage-strip, process-steps

- [ ] Add `__experimentalBorder` supports to each block's `block.json`:
  ```json
  "__experimentalBorder": {
    "radius": true,
    "width": true,
    "color": true,
    "style": true
  }
  ```
- [ ] `npm run build`

### Task 1.5: Enhance Typography Supports

**All text-heavy blocks.** Add `letterSpacing`, `textTransform`, `fontWeight`, `fontStyle` to typography supports where missing.

- [ ] Query DB for blocks with typography supports
- [ ] Add missing typography sub-properties
- [ ] `npm run build`

### Task 1.6: Verify Second CTA on Hero and CTA-Section

- [ ] Read `hero/render.php` — check if `ctaSecondaryText` is rendered
- [ ] Read `cta-section/render.php` — check if secondary CTA is rendered
- [ ] Fix rendering if missing
- [ ] `npm run build`

### Task 1.7: Build, Deploy, and Verify Phase 1

- [ ] Final `npm run build` — zero errors
- [ ] Deploy via tar method
- [ ] Reset OPcache + clear LiteSpeed cache
- [ ] Verify in WP editor: open a test page, add hero block, confirm transition/hover/shadow/border controls visible
- [ ] Commit all Phase 1 changes to `main`

---

## Future Sessions (not this session)

### Session 2: Phase 2 — Extract Reference Homepage
- Run wp-site-extraction on lightsalmon-tarsier reference
- Extract via WP-CLI (raw blocks, Astra settings, plugin list)
- Extract computed CSS via Playwright at 3 breakpoints
- Screenshot reference at all breakpoints + per-section crops
- Save all to `sites/indus-foods/extraction/`

### Session 3: Phase 3 — Map and Build Homepage
- Map each reference section to SGS block with attribute table
- Build section-by-section with per-section screenshot verification
- Use token names, not hex values
- Log every feature gap

### Session 4: Phase 4-5 — QA + Improvements
- Run Gemini comparison
- Run design-reviewer agent
- Fix discrepancies in priority order
- Run axe-core accessibility audit
- Run Lighthouse performance audit

### Session 5: Phase 6 — Service Pages
- Build Food Service page from V3 mockup
- Create reusable template, duplicate for Manufacturing/Retail/Wholesale

### Session 6: Phase 6 continued — Remaining Pages
- Trade Application (test forms first)
- Our Story, Brands, Certifications, Contact, Blog

---

## Key Rules During Execution

1. **Build one section at a time.** Screenshot each section at 1440px immediately after building.
2. **Use token names, not hex values.** If a colour isn't in the variation, add it.
3. **Log every feature gap.** Block name, missing attribute, what it would control, reference value.
4. **Do not use custom CSS.** If it can't be done through attributes, log it and move on.
5. **Always deploy via tar method.** Never scp -r.
6. **After every deploy:** OPcache reset + LiteSpeed cache clear.
7. **Read before writing.** Always read block files before modifying.
8. **Verify after deploy.** Re-read deployed content to confirm changes are present.
