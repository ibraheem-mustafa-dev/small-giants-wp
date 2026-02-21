# VS Code Session — Indus Foods Homepage Visual + Hover Fixes

Start by invoking `/superpowers:using-superpowers`, then read the following files before touching anything:

- `CLAUDE.md` (root)
- `theme/sgs-theme/CLAUDE.md`
- `plugins/sgs-blocks/CLAUDE.md`
- `sites/indus-foods/CLAUDE.md`
- `sites/indus-foods/outstanding-issues.md` — Section 10 (Visual Comparison) and the Hover Effects table within it

---

## Context

This session fixes all visual and interactive differences between the original Indus Foods test site (`lightsalmon-tarsier-683012.hostingersite.com`) and the dev site (`palestine-lives.org`). Both sites have been screenshot-compared at desktop (1280px), tablet (768px), and mobile (375px), and all block CSS files have been read for hover state definitions.

All issues are documented in `sites/indus-foods/outstanding-issues.md` Section 10. Use that as your checklist — mark each issue resolved in the doc as you fix it.

---

## Architecture Rules (Non-Negotiable)

- **Nothing hardcoded.** Every visual property must be editor-configurable via block attributes OR set in `theme/sgs-theme/styles/indus-foods.json` OR in `functions.php` via `wp_add_inline_style()` gated on the Indus Foods style variation.
- **Variation-specific CSS** goes in `functions.php` gated on `'indus-foods' === $active_style`. Never in the base `style.css`.
- **Variation-specific images** go in `theme/sgs-theme/assets/` — never `uploads/`.
- **After any PHP/JS/CSS block change:** `cd plugins/sgs-blocks && npm run build`, then deploy via SCP.
- **Deploy to dev site only** (`palestine-lives.org`). Never touch `lightsalmon-tarsier-683012.hostingersite.com`.
- **Use the `wp-developer` agent** for all WordPress build work.
- **Use `/systematic-debugging`** before proposing any fix for issues #1 and #2 — investigate root cause first, don't guess.

---

## Fix Order

Work through issues in this exact order. Do not move to the next group until the current one is verified visually with a Playwright screenshot.

---

### Group 1 — Critical (Broken Functionality)

**Issue #1 — Mobile hamburger menu missing (375px)**
- No navigation renders at all on mobile. The hamburger icon is absent.
- Investigate `theme/sgs-theme/parts/header.html` and any nav-related JS/CSS.
- Check whether the mobile toggle button exists in the HTML but is hidden via CSS, or is genuinely not present.
- Fix so navigation is accessible on mobile and matches the original's hamburger → slide-out pattern.

**Issue #2 — Services section renders blank (all devices)**
- The "Our Services" / "Our UK Wide Food Services" block exists in the editor but produces a large blank space in the browser across desktop, tablet, and mobile.
- Investigate the `render.php` of the block used for the services grid. Check for PHP errors, missing required attributes, or broken conditionals.
- Run `/systematic-debugging` before proposing a fix.

---

### Group 2 — Critical Visual (Most Visible on Load)

**Issue #3 — Hero background: teal → yellow/mustard**
- Dev site hero section is teal (`#0a7ea8`). Original is gold/mustard (`#d8ca50`, the Indus Foods `--accent` token).
- Fix by updating the hero block's background colour attribute in the homepage content, or in `indus-foods.json` if it's a variation-level default. Do not hardcode the value — use the `--accent` token.

**Issue #4 — Why Choose section: remove white cards**
- Dev site renders each icon+heading+text item inside a white bordered card. Original places items directly on the yellow section background with no card, no border, no shadow.
- In the block editor, check what hover modifier class (if any) is applied to these info-box blocks. If `hover-lift`, `hover-border-accent`, or `hover-glow` is set, remove it — these classes also affect the card-style background.
- The fix may be purely an attribute change in the editor, or may require a CSS adjustment to ensure no card background renders when the section background is the accent colour.

**Issue #5 — Testimonials section background: teal → white**
- Dev site testimonials section has a teal background. Original is white/light.
- Update the testimonial-slider block's section background attribute in the homepage content, or in `indus-foods.json`. Use `--surface` token, not a hardcode.

---

### Group 3 — Hover Effects (Code Changes Required)

These require changes to block CSS files. After each change: `npm run build` + deploy + Playwright verify.

**Hover fix H1 — Hero primary CTA button**
- File: `plugins/sgs-blocks/src/blocks/hero/style.css`
- Current: `.sgs-hero__cta--accent:hover` → background `primary-dark`, text `surface`
- Required: Full invert — background transparent, border 2px solid current text colour, text colour unchanged (gold)
- Match the original's behaviour: filled button becomes ghost/outline on hover.

**Hover fix H2 — Hero secondary/outline CTA button**
- File: `plugins/sgs-blocks/src/blocks/hero/style.css`
- Current: `.sgs-hero__cta--outline:hover` → background `surface` (white), text `primary-dark`
- Required: Inverts to filled — background `primary` teal, text `surface` (white), remove border.
- Match the original's behaviour: outline button fills with teal on hover.

**Hover fix H3 — Top-level nav link hover missing**
- File: `theme/sgs-theme/assets/css/core-blocks.css`
- Current: No hover state defined for `.wp-block-navigation .wp-block-navigation-item__content` at the top level (only submenu items are styled).
- Required: Add hover rule — background fills with `--accent` (gold), text colour adjusts for contrast. Match original: nav item gets a gold background fill on hover, same as the active "Home" state.
- Add after the existing nav transition rule (around line 44).

**Hover fix H4 — CTA section buttons**
- File: `plugins/sgs-blocks/src/blocks/cta-section/style.css`
- Current: `.sgs-cta-section__btn:hover` → `opacity: 0.9` + `translateY(-1px)`. Too subtle.
- Required: Full invert to match hero buttons — primary button becomes ghost on hover, outline button fills on hover. Add separate selectors for `__btn--primary:hover` and `__btn--outline:hover` mirroring the hero button patterns.

**Hover fix H5 and H6 — Verify editor block attributes (no code change if clean)**
- In the WordPress block editor on the homepage:
  - Check the info-box blocks in the Why Choose section — confirm no hover modifier class (`hover-lift`, `hover-border-accent`, `hover-glow`) is set. Remove if present.
  - Check the card-grid block in the Services section — confirm no hover modifier class (`hover-zoom`, `hover-lift`) is set. Remove if present.

---

### Group 4 — Significant Visual

**Issue #6 — Tablet nav wraps to two rows (768px)**
- At 768px the nav items wrap because the "Register For a Trade Account" button takes too much space.
- Fix: hide the CTA button from the nav bar at tablet breakpoint, or reduce nav item spacing. Must be responsive — desktop keeps the button, tablet and below hide it.

**Issue #7 — Top bar: plain text links → icon pill buttons**
- Original shows pill-shaped buttons with phone icon + number, email icon + address.
- Dev site shows plain `<a>` text links with no icon and no pill style.
- Fix the top bar pattern/block to render icon + pill button styling. Must be controlled by the Indus Foods style variation — not hardcoded.

**Issue #8 — Hero: single CTA button visible on mobile**
- "Apply For A Trade Account" button disappears on mobile (375px). Only "Request Our Catalogue" shows.
- Check hero block responsive CSS or button visibility attributes in the Indus Foods variation.

**Issue #9 — Hero buttons: side by side → stacked vertically**
- Original stacks the two CTA buttons vertically (column layout).
- Dev site places them side by side (row layout).
- Fix via hero block button layout attribute or responsive CSS in the Indus Foods variation.

---

### Group 5 — Content Fixes (Editor Only, No Code)

Make these directly in the block editor on the homepage:

- **Issue #10** — Change services section title from "Our Services" to "Our UK Wide Food Services"
- **Issue #11** — Change all four service card button labels from "Learn More" to their specific CTAs: "Top Ethnic Food Services", "Food Manufacturer", "Food Retailer", "UK Food Wholesaler"
- **Issue #12** — Top bar social icons: replace TikTok with Instagram; fix order to LinkedIn, Facebook, Google, Instagram (matching original)
- **Issue #15** — "Get Directions" button: change from filled to outline/ghost button variant
- **Issue #17** — Brands section: verify background colour attribute is set to teal (`--primary`) with gold (`--accent`) heading text

---

### Group 6 — Minor

**Issue #13 — Footer logo: stacked → horizontal**
- Swap logo in the footer pattern to the horizontal SVG version. Editor change.

**Issue #14 — Footer social icons: flat → brand colours**
- Original footer social icons have brand colours (LinkedIn blue, Facebook blue, Google red, Instagram gradient).
- Dev site shows flat icons. Fix: Indus Foods style variation should apply brand colour overrides to social icon links in `functions.php` via `wp_add_inline_style()`.

**Issue #16 — Footer logo oversized on mobile**
- Add a `max-width` cap on the footer logo at 375px in the Indus Foods variation CSS.

---

## Verification Step (After All Groups Complete)

Use Playwright to take full-page screenshots of `palestine-lives.org` at 1280px, 768px, and 375px and compare against `lightsalmon-tarsier-683012.hostingersite.com`. Also test hover states on:
- Primary and secondary hero CTA buttons
- Top-level nav links
- CTA section buttons
- Footer nav links (should turn gold — already correct)
- Testimonial slider arrows (already correct)

Mark all resolved issues in `sites/indus-foods/outstanding-issues.md` Section 10.

---

## Deploy Commands

```bash
# After any block CSS/JS/PHP change:
cd plugins/sgs-blocks && npm run build

# Deploy blocks plugin
scp -r sgs-blocks.php includes build assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# Deploy theme (after any theme file change)
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# Purge cache
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

Run all commands from the repo root: `C:\Users\Bean\Projects\small-giants-wp`

---

## When to Use the `frontend-design` Skill

The `frontend-design` skill is available in this session. Use it selectively — not upfront.

**Do NOT use it for:**
- Issues #1 and #2 (blank services section, missing mobile nav) — these are PHP/structural bugs, not design work
- Background colour mismatches (#3, #5) — token/attribute fixes, not design work
- Tablet nav wrapping (#6) — responsive layout fix

**DO invoke `/frontend-design` for:**
- Hover fix H1 and H2 — getting the button invert transitions smooth with correct easing and timing
- Hover fix H3 — nav link hover background transition (should feel instant but not jarring)
- Hover fix H4 — CTA button hover transitions
- Issue #7 — top bar pill buttons with icon (shape, padding, border-radius, icon alignment)
- Issue #9 — hero button stack layout and spacing on mobile

**Correct workflow:**
1. Complete Groups 1 and 2 (broken functionality + critical visual) without `frontend-design`
2. Once the page is structurally correct, invoke `/frontend-design` for Group 3 hover transitions and Issue #7 pill buttons
3. Use it to verify the finished result looks and feels production-grade
