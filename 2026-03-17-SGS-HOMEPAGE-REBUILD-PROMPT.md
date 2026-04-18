# Indus Foods Full Site Rebuild — Execution Prompt

> **For:** small-giants-wp project session
> **Context:** OpenClaw session 3 (2026-03-17) audited all WP/SGS skills, found the blocks lack the attributes needed for pixel-perfect replication. This prompt fixes the blocks first, then runs the replication across ALL pages.

---

## Session Start

```
/superpowers:using-superpowers
/sgs-wp-engine
```

Read these files before doing anything:
1. `CLAUDE.md` (framework-wide instructions)
2. `plugins/sgs-blocks/CLAUDE.md` (block development rules)
3. `sites/indus-foods/CLAUDE.md` (Indus Foods specifics)
4. `~/.claude/skills/sgs-wp-engine/references/fidelity-comparator.md` (replication methodology — updated 2026-03-17)

Run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` to confirm framework state.

---

## What This Session Must Achieve

Rebuild the entire Indus Foods site on palestine-lives.org so that every page is visually indistinguishable from the reference site (lightsalmon-tarsier-683012.hostingersite.com) at 1440px, 768px, and 375px. Every visual property must be controllable through the WordPress block editor — zero hardcoded CSS.

There are two phases: fix the block attribute gaps that make replication impossible, then run the actual replication across all pages.

### Page Priority Order

| Priority | Page | Status | Notes |
|---|---|---|---|
| 1 | Homepage | Deployed but needs visual polish | Post ID 13. Rebuild from scratch using extraction data |
| 2 | Food Service | Not started | Template for all 4 service pages. Build this template once, reuse for Manufacturing/Retail/Wholesale. V3 mockup at `sites/indus-foods/mockups/` |
| 3 | Manufacturing | Not started | Same service template, different content |
| 4 | Retail | Not started | Same service template, different content |
| 5 | Wholesale | Not started | Same service template, different content |
| 6 | Trade Application | Not started | V2 mockup. Requires form blocks — test forms end-to-end first |
| 7 | /our-story/ | Not started | About page — likely hero + heritage-strip + timeline |
| 8 | /brands/ | Not started | Brand showcase — mega menu template parts ready |
| 9 | /certifications/ | Not started | Certification bar + content |
| 10 | /contact/ | Created (placeholder) | Post ID 57. Replace placeholder with real content |
| 11 | /blog/ | Not started | Post grid template — uses sgs/post-grid |

**Do the homepage first.** It exercises the most blocks and proves the extraction → build → verify chain works. The service page template is second because it serves 4 pages. Everything else follows.

**For the service pages:** Bean has an HTML mockup (Food Service V3) at `sites/indus-foods/mockups/`. Build the template from this mockup, then duplicate for the other 3 services with different content.

**For the Trade Application:** This requires the form system (`sgs/form`, `sgs/form-step`, `sgs/form-field-*`). The forms have NEVER been end-to-end tested (confirmed in gap analysis). Test the form system on a blank page first before building the real application page.

---

## PHASE 0: Framework Fixes (do these FIRST — they affect everything)

These are structural issues that affect every page, not just the homepage. Fix them before touching any block attributes or page content.

### 0.1 — Header Hardcodes Indus Foods Content (CRITICAL)

The `header.html` template part hardcodes the Indus Foods phone number, email, and logo URL. This violates the framework's own rule #1: "SGS is a standalone framework, not a client project."

**Fix:** Move all client-specific content out of `header.html`. Use WordPress customiser options (`sgs_phone`, `sgs_whatsapp`, `sgs_business_email`) and render dynamically. The values are already set via WP-CLI in the ai-cli-workflow reference — the header just needs to read them instead of hardcoding.

Read `theme/sgs-theme/parts/header.html` and identify every hardcoded Indus Foods value. Replace each with the corresponding `get_option('sgs_*')` call or theme.json token.

### 0.2 — Missing Page Templates (blocks all pages)

Only 3 templates exist: front-page, index, page. Missing: single, archive, search, 404.

**Fix:** Create these templates in `theme/sgs-theme/templates/`:
- `single.html` — for blog posts (needed before /blog/ page works)
- `archive.html` — for category/tag/date archives
- `search.html` — search results page
- `404.html` — 404 error page

Use `wp-block-themes` skill for template structure. Each template is a simple HTML file using WordPress template parts (header, footer) and core blocks (post-title, post-content, query-loop).

### 0.3 — Spec Drift

`specs/01-SGS-THEME.md` still shows DM Serif Display + DM Sans as default fonts. The actual `theme.json` uses Inter variable. The spec is wrong.

**Fix:** Update `specs/01-SGS-THEME.md` to match reality. Read `theme/sgs-theme/theme.json` for the actual values.

### 0.4 — Deploy Command Alignment

Three files have deploy commands and they already differ:
- `CLAUDE.md` (framework-wide) — tar method
- `plugins/sgs-blocks/CLAUDE.md` — scp -r method
- `sites/indus-foods/CLAUDE.md` — scp -r method

The tar method is the correct one (scp -r creates nested directories on Hostinger — documented gotcha).

**Fix:** Update `plugins/sgs-blocks/CLAUDE.md` and `sites/indus-foods/CLAUDE.md` to reference the tar method from the framework CLAUDE.md. Do not maintain 3 copies of deploy commands.

### 0.5 — Dead Weight Skills

`wp-abilities-api` and `wpds` are installed but SGS doesn't use the Abilities API, and the WPDS MCP server isn't installed. These add routing noise.

**Fix:** No action needed on the SGS project itself — this was handled in the OpenClaw session. Just be aware: if these skills activate during this session, ignore them.

### 0.6 — Agent/Skill Context Gap

When `sgs-wp-engine` routes to generic WP skills (wp-block-development, wp-block-themes, etc.), those skills don't know SGS conventions. They will produce generic Gutenberg code.

**Fix:** All block work in this session MUST go through the `wp-sgs-developer` agent. The agent knows SGS conventions. Do not invoke generic WP skills directly from the main conversation. The agent will invoke them with the right context.

---

## PHASE 1: Fix Block Attribute Gaps (do all of this BEFORE touching the homepage)

### Why This Comes First

The blocks currently lack the attributes needed to match the reference site's visual properties. Previous replication attempts produced poor results because the blocks couldn't represent hover transitions, shadows, border-radius, and text transforms. Without these attributes, the replication will fail regardless of how good the extraction or mapping is.

### Priority 0 — Transition Controls (blocks look janky without these)

**Problem:** Only 3 of 55 blocks have `transitionDuration` and `transitionEasing` attributes. The other 52 blocks snap instantly between states on hover — no smooth transition. This is the single biggest visual quality difference between SGS and competitors.

**Blocks on the Indus Foods homepage that need transition controls added:**
- `sgs/hero` — has hover colour attributes but no transition timing
- `sgs/card-grid` — has `hoverEffect` but no `transitionDuration` or `transitionEasing`
- `sgs/info-box` — has hover colours but no transition timing
- `sgs/cta-section` — has hover colours but no transition timing
- `sgs/testimonial-slider` — no hover or transition attributes at all
- `sgs/trust-bar` — no hover or transition attributes at all
- `sgs/brand-strip` — no hover or transition attributes at all

**What to add to each block above:**

1. In `block.json`, add to the `attributes` object:
```json
"transitionDuration": {
    "type": "string",
    "default": "300"
},
"transitionEasing": {
    "type": "string",
    "default": "ease-in-out"
}
```

2. In `edit.js`, add inspector controls for both (a SelectControl for easing with options: ease, ease-in, ease-out, ease-in-out, linear; a TextControl for duration in ms).

3. In the block's `style.css`, use the attributes:
```css
.sgs-[block] {
    transition-duration: var(--sgs-transition-duration, 300ms);
    transition-timing-function: var(--sgs-transition-easing, ease-in-out);
}
```

4. In `render.php` (dynamic blocks) or `save.js` (static blocks), output inline style variables:
```php
style="--sgs-transition-duration: <?php echo esc_attr($attributes['transitionDuration']); ?>ms; --sgs-transition-easing: <?php echo esc_attr($attributes['transitionEasing']); ?>;"
```

**Do this for all 7 blocks listed above. Build and deploy after each block to verify it works. Do not batch all 7 then deploy.**

After each block: `npm run build` from `plugins/sgs-blocks/`. Must pass with zero errors.

### Priority 0 — Hover State Attributes for Homepage Blocks

**Problem:** 30 of 55 blocks have zero hover attributes. The Indus Foods reference site has hover effects on almost every interactive element.

**Blocks on the homepage that currently lack hover attributes and need them:**
- `sgs/testimonial` (and `sgs/testimonial-slider`) — no hover attributes at all
- `sgs/trust-bar` — no hover attributes
- `sgs/brand-strip` — no hover attributes
- `sgs/process-steps` — no hover attributes (if used on homepage)
- `sgs/heritage-strip` — no hover attributes (if used on homepage)

**What to add to each:**
```json
"hoverBackgroundColour": { "type": "string", "default": "" },
"hoverTextColour": { "type": "string", "default": "" },
"hoverBorderColour": { "type": "string", "default": "" },
"hoverEffect": { "type": "string", "default": "none" }
```

Plus the transition attributes from above. Add corresponding inspector controls in `edit.js` and CSS rules in `style.css` that apply on `:hover`.

### Priority 1 — Box Shadow on Content Blocks

**Problem:** Only `sgs/container` has a `shadow` attribute. The reference site uses shadows on cards, info boxes, testimonials.

**Add `shadow` attribute to:**
- `sgs/card-grid`
- `sgs/info-box`
- `sgs/testimonial`
- `sgs/cta-section`

Use WordPress's built-in shadow support where possible:
```json
"supports": {
    "shadow": true
}
```

This gives you the shadow picker in the editor for free. Check `/library-docs` for current `shadow` support docs: `/library-docs "WordPress block editor" "shadow support"` (or `python ~/.claude/hooks/context7.py docs /wordpress/block-editor "shadow support"`). Context7 MCP retired 2026-04-18 — hook script is canonical.

### Priority 1 — Border Radius on All Content Blocks

**Problem:** Only `sgs/container` and `sgs/card-grid` have `__experimentalBorder` supports. Most blocks can't have their corner radius adjusted.

**Add to all content blocks on the homepage:**
```json
"supports": {
    "__experimentalBorder": {
        "radius": true,
        "width": true,
        "color": true,
        "style": true
    }
}
```

Blocks to update: `sgs/hero`, `sgs/info-box`, `sgs/testimonial`, `sgs/testimonial-slider`, `sgs/cta-section`, `sgs/trust-bar`, `sgs/heritage-strip`, `sgs/process-steps`.

**This is a supports change, not a custom attribute.** WordPress handles the UI controls, CSS output, and serialisation automatically. Verify by placing the block in the editor after deploy and checking the border controls appear in the sidebar.

### Priority 2 — Typography Enhancements

**Add to all text-heavy blocks' supports:**
```json
"typography": {
    "fontSize": true,
    "lineHeight": true,
    "textAlign": true,
    "letterSpacing": true,
    "textTransform": true,
    "fontWeight": true,
    "fontStyle": true
}
```

The reference site uses uppercase headings with letter-spacing on several sections. Without `letterSpacing` and `textTransform` in supports, these cannot be matched through the editor.

Blocks to update: every block that has a `typography` supports entry currently (check with `sgs-db.py sql "SELECT DISTINCT block_slug FROM block_supports WHERE support_name='typography'"`).

### Priority 2 — Second CTA Button on Hero and CTA-Section

The gap analysis confirms: `sgs/hero` and `sgs/cta-section` only have one CTA button each. The reference site's hero has two CTAs (primary + secondary outline). The attributes exist (`ctaSecondaryText`, `ctaSecondaryUrl`, etc.) but check if `render.php` actually renders the second button. If not, add the rendering.

### Priority 3 — Fix Broken and Untested Blocks (before using them on any page)

These blocks have known issues. Do not place them on a page until the issue is fixed and verified.

| Block | Issue | Fix |
|---|---|---|
| `sgs/table-of-contents` | **BROKEN** since Session 12. Root cause unknown. | Debug or disable. Do not ship broken. Use `/superpowers:systematic-debugging` to trace. |
| `sgs/accordion` | `e.preventDefault()` at view.js:56 breaks native `<details>` element. FAQ schema not implemented. | Fix the JS bug. Remove the preventDefault call. |
| `sgs/testimonial-slider` | Missing ARIA — no `aria-controls` on navigation dots. | Add `aria-controls` linking dots to slides. WCAG 2.2 AA requires this. |
| `sgs/form` | 3 CRITICAL security holes fixed in Session 25 but **never retested**. Forms never tested end-to-end. | Test before building the Trade Application page. Create a blank test page, add a form, submit it, check REST API and database. |
| `sgs/post-grid` | Has render.php with WP_Query + REST API but **never placed on a live page**. | Test before building the /blog/ page. Place on a test page, verify it renders posts. |
| `sgs/gallery` | Has render.php but **never tested on a live page**. | Test before using on any page that needs a gallery. |
| `sgs/tabs` | Has render.php but **never tested on a live page**. Horizontal only — no vertical layout. | Test before using. |
| `sgs/counter` | IntersectionObserver counter. **Never on a live page.** | Test before using on Our Story or service pages. |
| `sgs/heritage-strip` | **Never on a live page.** Indus Foods-specific. | Test before using on homepage. |
| `sgs/certification-bar` | **Never on a live page.** | Test before using on /certifications/ page. |
| `sgs/process-steps` | No vertical layout. No connector line styling. **Never tested.** | Test before using on service pages. |
| `sgs/whatsapp-cta` | **Never on a live page.** | Test before using. |
| `sgs/icon-list` | No icon size control, no per-item links, no dividers. | May need attributes added depending on service page design. |

**Testing means:** place the block on a test page on palestine-lives.org, set attributes, save, view the frontend at 3 breakpoints, verify it renders correctly. If it doesn't render or has visual bugs, fix before using on a real page.

### Priority 3 — Pattern Library

The pattern library has **zero usable patterns**. There is one client-specific file. Patterns accelerate page building — instead of adding 15 blocks individually, you insert a pattern.

After building the homepage, save each major section as a block pattern:
- Hero pattern (hero + trust bar)
- Services grid pattern (container + card-grid)
- Testimonials pattern (container + testimonial-slider)
- CTA pattern (cta-section)
- Footer content pattern

Create patterns in `theme/sgs-theme/patterns/` following the wp-block-themes skill pattern format. These patterns will accelerate building the remaining 10 pages.

---

## PHASE 2: Extract the Reference Homepage

Only start this after Phase 1 is deployed and verified.

Invoke `wp-site-extraction` skill. The reference site is: `lightsalmon-tarsier-683012.hostingersite.com`

You have WP admin access (username: Claude). You also have SSH access:
```bash
ssh -i ~/.ssh/id_ed25519 -p 65002 u945238940@141.136.39.73
```

### Step 2.1: Load client context
```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py context indus-foods
```

### Step 2.2: Extract via WP-CLI (you have admin access)
```bash
# Get homepage ID
ssh hd "cd ~/domains/lightsalmon-tarsier-683012.hostingersite.com/public_html && wp option get page_on_front"

# Get raw block content
ssh hd "cd ~/domains/lightsalmon-tarsier-683012.hostingersite.com/public_html && wp post get <ID> --field=post_content" > indus-homepage-blocks.txt

# Get Astra colour palette
ssh hd "cd ~/domains/lightsalmon-tarsier-683012.hostingersite.com/public_html && wp option get astra-settings --format=json" > indus-astra-settings.json

# Get all active plugin list (to know which builder blocks are in use)
ssh hd "cd ~/domains/lightsalmon-tarsier-683012.hostingersite.com/public_html && wp plugin list --status=active --format=table"
```

### Step 2.3: Extract computed CSS via Playwright (new step added 2026-03-17)
Navigate to the reference homepage in Playwright. For every major section, extract computed styles at 1440px, 768px, and 375px. Extract transition and hover properties for every interactive element. Save the full extraction to `sites/indus-foods/extraction/homepage-computed-css.md`.

### Step 2.4: Screenshot the reference at all breakpoints
Take full-page screenshots at 1440px, 768px, 375px. Also take per-section cropped screenshots for each major section (hero, trust bar, about, services, testimonials, CTA, footer). Save to `sites/indus-foods/extraction/screenshots/`.

---

## PHASE 3: Map and Build

Follow `~/.claude/skills/sgs-wp-engine/references/fidelity-comparator.md` exactly. The methodology was updated on 2026-03-17 with:
- Screenshot after each section (do not batch)
- Animation/transition attribute mapping template
- 6-step fix priority order
- Design-reviewer agent relay for visual QA

### Key Rules During Build

1. **Build one section at a time.** Screenshot each section at 1440px immediately after building it. Compare against the reference screenshot. Fix discrepancies before moving to the next section.

2. **Use token names, not hex values.** The Indus Foods style variation tokens are in `theme/sgs-theme/styles/indus-foods.json`. If a colour from the reference isn't in the variation, add it to the variation — do not hardcode.

3. **Log every feature gap.** If a visual property from the reference cannot be achieved through block attributes or supports, log it as a FEATURE GAP with: block name, missing attribute, what it would control, the reference value. These become framework development tasks.

4. **Do not use custom CSS.** If something can't be done through block attributes, log the gap and move on. Do not work around it with inline styles, additional CSS, or `wp_add_inline_style`. The whole point is everything through the editor.

---

## PHASE 4: Visual QA

After all sections are built:

1. Run the Gemini comparison script (falls back to GOOGLE_API_KEY_MAIN):
```bash
python ~/.claude/skills/site-reviewer/scripts/gemini-design-review.py \
  --compare ref-desktop.png target-desktop.png --breakpoint desktop \
  --ref-url lightsalmon-tarsier-683012.hostingersite.com --target-url palestine-lives.org
```

2. Delegate to the `design-reviewer` agent for human-eye visual QA. The design-reviewer now loads tokens dynamically — it will query `sgs-db.py tokens indus-foods` at the start.

3. Fix order: layout-breaking issues first, then content, then attributes, then tokens, then animations, then feature gap logging.

---

## PHASE 5: Improvements (After Match Verified)

Only after the homepage matches the reference at all 3 breakpoints:

1. Run axe-core via Playwright at 1440/768/375 — fix every violation
2. Run Lighthouse performance audit — flag anything below 90
3. Check every touch target is 44px minimum
4. Check total CSS < 100KB and JS < 50KB
5. Tab through entire page with keyboard — every element reachable with visible focus ring
6. List SGS block features the reference builder doesn't have — propose specific enhancements

---

## PHASE 6: Remaining Pages (after homepage is verified)

Repeat Phases 2-5 for each remaining page in priority order. For each page:

### Service Pages (Food Service → Manufacturing → Retail → Wholesale)

1. Read the Food Service V3 mockup at `sites/indus-foods/mockups/`
2. Extract computed CSS from the mockup (serve locally via `python3 -m http.server`)
3. Map mockup sections to SGS blocks using `sgs-db.py match`
4. Build as a WordPress page template (not a page — a template that all 4 service pages share)
5. Create the Food Service page first, verify at all breakpoints
6. Duplicate for Manufacturing, Retail, Wholesale — change content only
7. Run design-reviewer agent on each

### Trade Application Page

1. Read the Trade Application V2 mockup
2. **Test the form system first:** create a blank test page, add `sgs/form` with `sgs/form-step` and a few fields, submit it, verify the REST API receives the data, verify the database stores it. The form system has never been tested end-to-end. Do not build the real application page until this test passes.
3. Build the 4-step form: About You → Business Details → Account Preferences → Review & Submit
4. Each step is a `sgs/form-step` with the appropriate `sgs/form-field-*` blocks inside
5. Test every field type, test file upload, test the review step, test submission
6. Deploy and verify

### Static Pages (Our Story, Brands, Certifications, Contact, Blog)

These are simpler pages. For each:
1. Identify which SGS blocks compose the page
2. Build using editor attributes — most of these are straightforward container + content block combinations
3. Screenshot and compare (no reference site equivalent — compare against the brand style)
4. For /blog/: use the `sgs/post-grid` block. This block has never been tested on a live page. Test it first.

---

## Verification Before Declaring Done

Run `/superpowers:verification-before-completion`.

### Per-Page Checklist (run for EVERY page before moving to the next)
- [ ] Full-page screenshots at 1440/768/375 match the reference or mockup (Gemini score 8+ on every section)
- [ ] Design-reviewer agent confirms no critical discrepancies
- [ ] Every section is editable in the WordPress block editor — open the editor, change a colour, change text, swap an image, save, verify on frontend
- [ ] Zero hardcoded CSS anywhere
- [ ] Feature gaps logged in `sites/indus-foods/feature-gaps.md`

### Site-Wide Checklist (run once after all pages are done)
- [ ] `npm run build` passes with zero errors
- [ ] axe-core returns zero violations on every page
- [ ] Lighthouse performance score 90+ on homepage
- [ ] Every page loads in under 3 seconds on mobile
- [ ] Total CSS < 100KB, total JS < 50KB per page
- [ ] Tab through every page with keyboard — every interactive element reachable
- [ ] All feature gaps compiled into a single prioritised list
- [ ] `sites/indus-foods/CLAUDE.md` Page Build Status table updated for every page

---

## Files to Create/Modify

### Phase 1 (Block Fixes)
- `plugins/sgs-blocks/src/blocks/hero/block.json` — add transition, border supports
- `plugins/sgs-blocks/src/blocks/hero/edit.js` — add transition controls
- `plugins/sgs-blocks/src/blocks/hero/style.css` — add transition CSS
- `plugins/sgs-blocks/src/blocks/hero/render.php` — output transition variables
- Same pattern for: card-grid, info-box, cta-section, testimonial, testimonial-slider, trust-bar, brand-strip, heritage-strip, process-steps
- After each block: `npm run build`, deploy, verify controls appear in editor

### Phase 2 (Extraction)
- Create: `sites/indus-foods/extraction/homepage-blocks.txt`
- Create: `sites/indus-foods/extraction/homepage-computed-css.md`
- Create: `sites/indus-foods/extraction/astra-settings.json`
- Create: `sites/indus-foods/extraction/screenshots/` (ref screenshots at 3 breakpoints)

### Phase 3 (Build)
- Modify: homepage content on palestine-lives.org via WP editor/WP-CLI
- Modify: `theme/sgs-theme/styles/indus-foods.json` (add any missing tokens)

### Phase 4-5 (QA + Improvements)
- Create: `sites/indus-foods/feature-gaps.md` (logged feature gaps)
- Create: `sites/indus-foods/extraction/screenshots/target/` (SGS screenshots for comparison)

---

## Tools Available

| Tool | When |
|---|---|
| `/sgs-wp-engine` | Load at session start — central authority |
| `sgs-db.py` | Before touching any block — query attributes, tokens, gaps |
| `wp-block-development` | When adding attributes to blocks — knows block.json patterns |
| `wp-interactivity-api` | If any interactive block needs viewScript changes |
| `wp-site-extraction` | Phase 2 — extraction workflow (updated with computed CSS + animation steps) |
| `design-reviewer` agent | Phase 4 — visual QA (updated with dynamic tokens) |
| `test-and-explain` agent | After each phase — test and explain in plain English |
| `context7` MCP | Before implementing any new block support — get current WordPress docs |
| Playwright MCP | Screenshots, computed CSS extraction, accessibility tree |
| `deploy-check` | Before deploying to verify nothing is broken |

---

## Critical Reminders

- **GEMINI_API_KEY is restricted.** Use GOOGLE_API_KEY_MAIN for any Google API calls (Gemini comparison script already falls back to this).
- **Never commit core SGS framework changes to a client branch.** Phase 1 block fixes go on `main`. Phase 3 client content goes on `feat/indus-foods-homepage`.
- **Run `sgs-db.py impact <block>` before modifying any block** to understand cascading effects.
- **After every deploy:** reset OPcache and LiteSpeed cache. The deploy sequence is in the framework CLAUDE.md.
- **Read files before editing.** Read `block.json`, `edit.js`, `render.php` for every block before adding attributes. Do not guess the existing structure.
- **The wp-sgs-developer agent duplicates ~70% of sgs-wp-engine skill.** This is a known maintenance debt. Do not add content to both — add knowledge to the skill, operational details to the agent. If you find a conflict between them, the skill is the source of truth for SGS standards, the agent is truth for infrastructure/deploy.
- **The framework's honest grade is C-/D+, not S.** The gap analysis at `~/.claude/skills/sgs-wp-engine/references/indus-gap-analysis.md` has the full truth. 56 of 294 features verified (19%). Do not claim higher maturity than this.
- **17 blocks have never been placed on a live page.** Before using any block on a client page, test it on a blank page first. The gap analysis lists every untested block.
- **The wp-site-extraction skill now has 2 new steps** (added 2026-03-17): step 8 (computed CSS extraction via Playwright) and step 9 (animation/transition property extraction). These did not exist before — previous extraction attempts missed CSS applied via classes and all hover/transition data.
- **The fidelity-comparator now requires screenshot-per-section during build** (added 2026-03-17). Previous replication attempts batched the entire page build then compared — errors compounded. Build and verify one section at a time.
- **The design-reviewer agent no longer has hardcoded tokens** (fixed 2026-03-17). It now queries `sgs-db.py tokens <client>` dynamically. If it asks which client, answer "indus-foods".
- **The sgs-wp-engine routing table now includes the design-reviewer agent** (added 2026-03-17). Invoke it for visual QA — it was previously missing from the routing.

## Honest State of the Framework (read this, don't skip it)

From the deep gap analysis (`~/.claude/skills/sgs-wp-engine/references/indus-gap-analysis.md`):

- **19% feature verified** (56/294). The S-tier target is 90% (266/294). The gap is massive.
- **Good foundations:** Dynamic block system, design token approach, Interactivity API usage, WCAG 2.2 baseline are genuinely well-built.
- **The blocks that ARE on the homepage work:** hero, card-grid, container, trust-bar, brand-strip, testimonial-slider, cta-section all render and have editor controls.
- **The visual quality gap is attributes, not architecture.** The block system is sound — it just needs more attributes per block to match competitors. That is what Phase 1 fixes.
- **Competitive position:** Roughly where Kadence was in 2019. Solid foundation, too few working features for general clients. This site rebuild is the forcing function that closes the gaps.
