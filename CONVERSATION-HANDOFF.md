# Session Handoff — 2026-03-21

## Completed This Session
1. Exhaustive 130-item visual comparison between reference (lightsalmon-tarsier-683012.hostingersite.com) and our site (palestine-lives.org) at 1440px. Saved to `sites/indus-foods/extraction/`.
2. Global font sizes changed from rem to px in `theme/sgs-theme/theme.json` (medium=18px, small=14px, hero=50px). Button defaults: weight 600, padding 16px 36px, radius 10px.
3. Indus Foods style variation (`styles/indus-foods.json`) updated: text colour #2C3E50, heading weight 700, button medium/600, core/navigation block medium/600.
4. DB Global Styles (post ID 7) updated to match: button, nav block, text colour palette.
5. Removed all hardcoded `!important` font-size/padding/weight overrides from `functions.php` and `core-blocks-critical.css`. Added global button hover CSS (scale + colour inversion) to `functions.php`.
6. Recovered 27 invalid blocks via Site Editor (4 header templates, footer, homepage). Root cause: block validation failures from editing template HTML files and WP-CLI post content updates.
7. Created Block Test Page (draft, post ID 208) with ~25 blocks. Fixed `sgs/countdown-timer` Carbon dependency and `sgs/table-of-contents` function redeclaration bug.
8. Updated `wp-sgs-developer` and `design-reviewer` agent definitions with mandatory CSS debugging (DevTools computed styles) and block validation check rules.
9. Header template file (`parts/header.html`) updated: pill fontSize medium, nav fontSize medium/weight 600. File is correct on server.
10. LiteSpeed Cache plugin disabled for development. Cloudflare in developer mode.

## Current State
- **Branch:** main at `1e80c53`
- **Tests:** no test suite
- **Build:** webpack compiles successfully
- **Uncommitted changes:** CLAUDE.md, brand-strip files, testimonial-slider view.js, core-blocks.css, lucide-icons.php (all from prior sessions)
- **LiteSpeed Cache:** DISABLED (`wp plugin deactivate litespeed-cache`)
- **Cloudflare:** Developer mode ON (no caching)
- **Live URL:** https://palestine-lives.org — homepage has damage from block recovery (missing H1, empty paragraphs)

## Known Issues / Blockers
- CRITICAL: Block recovery agent stripped the H1 heading from the hero section. 12 empty paragraphs inserted across header and footer. Pill and nav font classes not rendering correctly despite file being correct on server.
- 5 blocks need `deprecated.js` fixes: container, testimonial, notice-banner, whatsapp-cta, accordion/tabs. InnerBlocks save mismatch causes validation errors.
- Block Test Page (ID 208) only has ~25 of 55 blocks. Missing all 14 form blocks, modal, decorative-image, pricing-table.
- Button hover transition CSS (`transform .2s ease`) loses to core's `color 0.15s` — CSS specificity issue.
- Mega menus, button hover effects, image hover effects all unchecked post-recovery.

## Next Priorities (in order)
1. Fix the 5 blocks needing `deprecated.js`, then fix homepage/header/footer damage via the WP admin block editor. NOT via code.
2. Run a full design review comparing every element against the reference. Produce a numbered discrepancy list. Present to the user for decisions — do NOT make changes without approval.
3. Complete the Block Test Page with ALL 55 blocks. Every block must be valid.
4. Re-enable LiteSpeed Cache and turn off Cloudflare developer mode after confirming everything works.
5. Audit `indus-foods.json` to comprehensively cover ALL attributes for every element/block it customises.

## Files Modified
| File path | What changed |
|-----------|-------------|
| `theme/sgs-theme/theme.json` | Font sizes rem to px, button weight 600, padding 16px 36px |
| `theme/sgs-theme/styles/indus-foods.json` | Text #2C3E50, heading weight 700, button medium/600, core/navigation |
| `theme/sgs-theme/functions.php` | Removed !important overrides, added button hover CSS |
| `theme/sgs-theme/parts/header.html` | Pill fontSize medium, nav fontSize medium/weight 600 |
| `theme/sgs-theme/style.css` | Version bumped to 1.3.2 |
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Removed font-size 0.875rem !important on pills |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/style.css` | Author name font-size small to medium |
| `plugins/sgs-blocks/src/blocks/mega-menu/render.php` | Inline position:fixed for CDN-proof panels |
| `plugins/sgs-blocks/src/blocks/mega-menu/style.css` | !important on full-width panel positioning |
| `~/.claude/agents/wp-sgs-developer.md` | CSS Override Rule + CSS Debugging Rule added |
| `~/.claude/agents/design-reviewer.md` | Phase 9 CSS debugging step added |

## Notes for Next Session
- DB Global Styles (post ID 7) overrides everything. Palette is nested under `settings.color.palette.theme[]`. Always update DB when changing the style variation.
- Block validation errors are the #1 cause of "I changed it but nothing happened on the frontend." After ANY code-level block change, check the editor for invalid blocks FIRST.
- The user's rule: produce a discrepancy list, present it, let the user decide what to fix. Do NOT make changes autonomously based on the comparison.
- Use DevTools computed styles (or Playwright browser_evaluate) to trace CSS issues to their source file BEFORE attempting fixes. Never guess, never add competing !important rules.
- functions.php CSS is ONLY for transform, position, overflow, z-index, animation — things theme.json cannot express. Never for font-size, font-weight, padding, or colours.

## Next Session Prompt

~~~
/using-superpowers

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/superpowers:using-superpowers` | FIRST — before any response |
| `/sgs-wp-engine` | Before any block or theme work |
| `/wp-block-development` | Task 1 — adding deprecated.js to 5 blocks |
| `/wp-block-themes` | Task 1 — fixing blocks via Site Editor |
| `/design-review` | Task 2 — full site comparison |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Edit blocks via WP admin, screenshot comparisons, hover effect testing, DevTools CSS tracing |
| GitHub MCP | Commit and push after each completed task |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Task 1 — deprecated.js fixes (code only, NOT editor work) |
| `design-reviewer` | Task 2 — full comparison list generation |

---

## Task 1: Fix Blocks and Restore Homepage

Step 1: Add `deprecated.js` with `save: () => null` to these 5 blocks: container, testimonial, notice-banner, whatsapp-cta, accordion/tabs. Build and deploy.

Step 2: Open WP admin block editor. Fix homepage (post ID 13): restore H1 heading in hero, remove empty paragraphs, verify all sections have content. Fix header template: verify pills and nav render correctly. Fix footer template: remove empty paragraphs. Save each after fixing. Do this via the editor UI, NOT code.

## Task 2: Full Design Review — Discrepancy List Only

Run a comprehensive design review comparing palestine-lives.org against the reference at 1440px. Check EVERY element: mega menu panels, all button hover effects, all image hover effects, service cards, testimonials, CTA strip, footer, nav, pills. Use DevTools computed styles to verify CSS values.

Produce a NUMBERED discrepancy list. Present it to the user. Do NOT make any changes — wait for the user to decide which items to fix, skip, or improve.

## Task 3: Complete Block Test Page

Add ALL remaining blocks to the test page (post ID 208). Currently has ~25 — needs all 55 including 14 form blocks, modal, decorative-image, pricing-table. Save and verify all are valid in the editor.

## Guardrails
- LiteSpeed Cache is DISABLED — re-enable after Task 2
- Cloudflare is in developer mode — turn off after confirming
- Do NOT add CSS to functions.php for font-size, font-weight, padding, or colours
- Do NOT make design changes without user approval — produce the list, present it, wait
- After ANY block code change, check the editor for validation errors before claiming done
- Always use DevTools computed styles to trace CSS issues before attempting fixes
~~~
