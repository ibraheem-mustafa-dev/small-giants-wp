# Session Handoff — 2026-03-21

## Completed This Session
1. Exhaustive 130-item visual comparison between reference site (lightsalmon-tarsier-683012.hostingersite.com) and our site (palestine-lives.org) at 1440px desktop.
2. Global font sizes changed from rem to px in theme.json (medium=18px, small=14px, hero=50px, etc.) so clients see understandable values in the editor.
3. Indus Foods style variation updated: text colour #2C3E50, heading weight 700, button fontSize medium/600, padding 16px 36px, radius 10px, core/navigation block set to medium/600.
4. DB Global Styles updated to match: button padding 16px 36px, weight 600, radius 10px, nav block medium/600, text colour #2C3E50.
5. Removed all hardcoded `!important` font-size/padding/weight overrides from functions.php that conflicted with global defaults. Kept only structural CSS (hover effects, transforms, layout).
6. Added global button hover CSS: scale(1.04) + colour inversion (teal to gold, black to gold, gold to teal).
7. Header template file updated: pill paragraphs fontSize x-small to medium, nav block fontSize small to medium and fontWeight 500 to 600.
8. Footer template: 10 elements changed from has-small-font-size to has-medium-font-size.
9. Testimonial slider author name font-size changed from small to medium in block CSS.
10. Service card button border-radius fixed from 8px to 10px in homepage post content.

## Current State
- **Branch:** main at 937dded
- **Tests:** no test suite
- **Build:** sgs-blocks builds cleanly (`npm run build` passes)
- **Uncommitted changes:** CONVERSATION-HANDOFF.md, CLAUDE.md, brand-strip block files, core-blocks CSS, lucide-icons, testimonial-slider view.js (from earlier sessions)
- **LiteSpeed Cache:** DISABLED on the server — must re-enable before performance testing
- **Live URL:** https://palestine-lives.org

## Known Issues / Blockers
- CRITICAL: Block recovery agent DAMAGED the homepage and header. H1 heading is MISSING from the hero. 12 empty paragraphs inserted across header and footer. Pills lost their font-size class. Nav still renders at 14px/500 despite file being correct. All of this must be fixed via the block editor (WP admin), NOT via code.
- CRITICAL: The root cause was block validation errors — when block attributes in JSON don't match the saved HTML, WordPress falls back to stale HTML. This was caused by editing template files directly and WP-CLI post content updates. ALWAYS check the block editor for validation errors after any code-level block changes.
- indus-foods.json style variation needs comprehensive attribute coverage for ALL customisable properties of every block/element it touches.
- Button hover CSS (scale + colour inversion) is in functions.php but transition property is losing to core's `color 0.15s`. Needs CSS specificity fix.
- LiteSpeed Cache plugin is DISABLED. Cloudflare is in developer mode. Both must be re-enabled after fixes are confirmed.

## Next Priorities (in order)
1. Fix the 5 blocks needing deprecated.js — container, testimonial, notice-banner, whatsapp-cta, accordion/tabs. Add `deprecated.js` with `save: () => null` to each, build, deploy. This prevents future validation errors.
2. Fix homepage damage via WP admin block editor — restore missing H1 heading in hero, remove 12 empty paragraphs from header/footer, fix pill font-size, fix nav font-size/weight. Do everything through the editor UI, NOT code.
3. Run a FULL design review post-recovery — compare every element against the reference site. Check: mega menu panels (open each), all button hover effects, all image hover effects, service card interactions, testimonial layout, CTA strip, footer. Use DevTools computed styles to trace any CSS issues to their source file.
4. Work through each discrepancy with the user — fix, skip, or improve.
5. Complete the Block Test Page (post ID 208) — add ALL 55 blocks. Every block must be valid.
6. Re-enable LiteSpeed Cache and turn off Cloudflare developer mode after confirming.
7. Audit indus-foods.json to comprehensively cover ALL attributes for every element/block.
8. Implement brand-strip infinite carousel refactor (two-container pattern — research complete, not started).

## Files Modified
| File path | What changed |
|-----------|-------------|
| theme/sgs-theme/theme.json | Font sizes rem to px, button weight 600, padding 16px 36px |
| theme/sgs-theme/styles/indus-foods.json | Text #2C3E50, heading weight 700, button medium/600, core/navigation block |
| theme/sgs-theme/functions.php | Removed !important overrides, added global button hover CSS |
| theme/sgs-theme/parts/header.html | Pill fontSize medium, nav fontSize medium/weight 600 |
| theme/sgs-theme/style.css | Version bumped to 1.3.2 |
| plugins/sgs-blocks/src/blocks/testimonial-slider/style.css | Author name font-size small to medium |
| plugins/sgs-blocks/src/blocks/mega-menu/render.php | Inline position:fixed for CDN-proof panels |
| plugins/sgs-blocks/src/blocks/mega-menu/style.css | !important on full-width panel positioning |

## Notes for Next Session
- DB Global Styles (wp_global_styles post ID 7) overrides EVERYTHING — style variation AND theme.json. The palette is nested under `settings.color.palette.theme[]`, not a flat array. Always update DB Global Styles when changing the style variation.
- The user's core rule: if a setting can be expressed in theme.json, the style variation, or the block editor, it MUST NOT be in functions.php. functions.php CSS is ONLY for transform, position, overflow, z-index — things theme.json cannot express.
- LiteSpeed is currently DISABLED — re-enable after resolving the cache issue.
- The user wants rem as the default unit for accessibility but with px equivalents shown. Discussed but not implemented.
- Style variations should cover ALL attributes of elements/blocks they customise, not just the ones explicitly mentioned. Take initiative to set defaults for everything customisable.

## Next Session Prompt

~~~
/using-superpowers

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/superpowers:using-superpowers` | FIRST — before any response |
| `/sgs-wp-engine` | Before any block or theme work |
| `/superpowers:systematic-debugging` | Task 1 — resolving the server cache issue |
| `/wp-block-themes` | Task 2 — comprehensive style variation attributes |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Screenshot verification at 1440px after each fix, hover effect testing |
| GitHub MCP | Commit and push after fixes |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Task 2 — style variation audit (DO NOT let it add CSS to functions.php) |
| `skill-agent` | Task 4 — fix the wp-sgs-developer agent definition |

---

## Task 1: Resolve Hostinger Server Cache

Header template file on the server has correct content (fontSize:"medium") but Hostinger's LiteSpeed Web Server serves stale HTML with old classes. LiteSpeed Cache WP plugin is DISABLED.

Try: .htaccess no-cache header temporarily, verify pills render at 18px and nav at 18px/600, then remove header and re-enable LiteSpeed.

## Task 2: Comprehensive Style Variation Audit

indus-foods.json must define ALL customisable attributes for every element/block. Currently only has colours, button basics, heading weight. Needs full button definition (all states), h1-h6 sizes/weights/colours, paragraph, links, navigation, images, separators, social links. Use 130-item comparison list as source of truth.

## Task 3: Review Comparison List With User

Go through the 130-item discrepancy list section by section. For each: fix, skip, or improve. Group by section.

## Task 4: Fix wp-sgs-developer Agent

Add rules: NEVER add font-size/weight/padding/radius to functions.php. Use theme.json, style variation, Global Styles DB, or block attributes. functions.php CSS ONLY for transform, position, overflow, z-index.

## Guardrails
- LiteSpeed Cache is DISABLED — re-enable after Task 1
- Do NOT add CSS to functions.php unless it involves transform, position, overflow, or z-index
- Do NOT use !important on font-size, font-weight, or padding
- All work on main branch
- Commit and push via GitHub after each task
~~~
