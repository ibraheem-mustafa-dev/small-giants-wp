# Session Handoff — 2026-03-22 (Session 2)

## Completed This Session
1. Added deprecated.js to 4 blocks (container, notice-banner, whatsapp-cta, testimonial). Zero validation errors in editor.
2. Fixed hero block: removed source:html from headline/subHeadline in block.json. Set attributes via wp.data.dispatch JS API. H1 renders on frontend.
3. Fixed brand strip marquee: pixel-based --sgs-scroll-distance for universal seamless loop.
4. Rewrote footer.html with real Indus Foods content (description, Quick Links, Contact, Opening Hours, Google Maps, Address, gold copyright, full credit link).
5. Added PreToolUse hook wp-content-guard.py blocking WP-CLI content writes.
6. Set attribution commit/pr to empty strings globally.
7. Recovered invalid footer blocks via JS data API (replaceBlock with fresh paragraphs).

## Current State
- **Branch:** main at `dcb5d81`
- **Tests:** no test suite
- **Build:** webpack compiles successfully
- **Uncommitted changes:** none
- **LiteSpeed Cache:** DISABLED
- **Cloudflare:** Developer mode ON
- **Live URL:** https://palestine-lives.org — hero working, footer has Indus content, brand strip scrolling

## Known Issues / Blockers
- CRITICAL: Header pill paragraphs render at 12px (has-x-small-font-size) instead of 18px (has-medium-font-size). The DB content (post 219) has correct attributes and HTML, but WordPress 6.9 server-side block validation replaces the class at render time. Tried: file template, DB template, fontSize preset, explicit pixel style, JS data API — all produce the same wrong output. This is a WP core-level rendering issue in template parts.
- CRITICAL: Navigation block renders at 14px/500 instead of 18px/600. Same root cause — WP block validation overriding saved attributes at render time in template part context.
- Footer logo SVG returns 404 (IndusFoods_Animated_Logo_Horizontal_Multi_Shade-1.svg not on server).
- Footer copyright gold colour renders but only on "Copyright" text, not the full line.

## Next Priorities (in order)
1. Debug and fix the WordPress 6.9 template part block validation issue. The server replaces has-medium-font-size with has-x-small-font-size during render. Check: render_block filters in functions.php, WP_Block_Supports, Global Styles layout pipeline, wp_get_layout_style(), and any filter that touches font-size classes specifically in template part context. Compare the HTML WordPress expects from paragraph save() vs what is stored. Use WP_DEBUG + SAVEQUERIES to trace the exact render pipeline.
2. Fix nav font size and weight (same root cause as pills).
3. Upload footer logo SVG to server. Fix copyright colour to apply to full text.
4. Run full design review against reference site.
5. Re-enable LiteSpeed Cache, turn off Cloudflare developer mode.

## Files Modified
| File path | What changed |
|-----------|-------------|
| `plugins/sgs-blocks/src/blocks/hero/block.json` | Removed source:html from headline/subHeadline |
| `plugins/sgs-blocks/src/blocks/container/deprecated.js` | New — save: () => null |
| `plugins/sgs-blocks/src/blocks/notice-banner/deprecated.js` | New — save: () => null |
| `plugins/sgs-blocks/src/blocks/whatsapp-cta/deprecated.js` | New — save: () => null |
| `plugins/sgs-blocks/src/blocks/testimonial/deprecated.js` | Added v2 null-save |
| `plugins/sgs-blocks/src/blocks/brand-strip/view.js` | Pixel-based scroll via --sgs-scroll-distance |
| `plugins/sgs-blocks/src/blocks/brand-strip/style.css` | Keyframe uses var(--sgs-scroll-distance) |
| `theme/sgs-theme/parts/header.html` | Added has-link-color class to pills |
| `theme/sgs-theme/parts/footer.html` | Full Indus Foods content rewrite |
| `plugins/sgs-blocks/CLAUDE.md` | source:html and post_content gotchas |
| `~/.claude/hooks/wp-content-guard.py` | New — blocks WP-CLI content writes |
| `~/.claude/settings.json` | Hook + attribution config |

## Notes for Next Session
- The root cause is NOT in the template files or DB content. Post 219 (DB header) has correct has-medium-font-size HTML. The PHP function do_blocks() on the raw content returns has-medium-font-size. But the full page render outputs has-x-small-font-size. Something in the WordPress template part rendering pipeline changes the class AFTER block parsing.
- Check functions.php render_block filters: fix_has_text_color_override, ensure_nav_list_structure, specific_submenu_aria_labels, replace_current_year_token, fix_duotone_arg_count. One of these or a WP core filter may be the culprit.
- The x-small preset is defined in theme.json at 12px. Something is selecting it as the default instead of medium.
- For content edits, ALWAYS use the Site Editor + wp.data.dispatch JS API. A hook blocks WP-CLI content writes.
- After ANY change, take a frontend screenshot and visually check before claiming done.
- The gold colour for Indus Foods is #E7D768. The accent token resolves differently per context — use explicit hex.

## Next Session Prompt

~~~
/using-superpowers

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/superpowers:using-superpowers` | FIRST — before any response |
| `/sgs-wp-engine` | Before any block or theme work |
| `/superpowers:systematic-debugging` | Task 1 — debugging the font size override |
| `/wp-block-themes` | Task 1 — understanding template part rendering pipeline |
| `/research` | Task 1 — search for WP 6.9 template part block validation bugs |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Context7 | Fetch WP 6.9 block rendering docs, WP_Block class, template part pipeline |
| Firecrawl | Search WordPress Trac and GitHub issues for template part fontSize override bugs |
| Playwright MCP | Frontend verification screenshots, DevTools CSS tracing |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Task 2 — once root cause is found, apply fix and deploy |
| `design-reviewer` | Task 3 — full comparison after font sizes are fixed |

## Research Approach
1. Search WordPress Trac for "template part fontSize" or "block validation font size override"
2. Search GitHub wordpress/gutenberg issues for "has-x-small-font-size" or "template part block validation"
3. Use Context7 to read WP_Block_Supports and the template part rendering pipeline
4. Check if render_block_core_template_part() applies its own layout/typography processing
5. Enable WP_DEBUG_LOG on the server, add a temporary render_block filter to log what changes the paragraph HTML

---

## Task 1: Debug Template Part Font Size Override (CRITICAL)

WordPress 6.9 is replacing has-medium-font-size with has-x-small-font-size during server-side rendering of template parts. The DB content is correct. do_blocks() on the raw content produces correct output. But the full page render changes the class.

Debug approach:
1. SSH to server, enable WP_DEBUG_LOG
2. Add a temporary render_block filter that logs the paragraph block content before and after all other filters
3. Check if the issue is in render_block_core_template_part() or in WP_Block_Supports
4. Check if Global Styles layout CSS is overriding the class
5. Check the theme's render_block filters in functions.php — especially fix_has_text_color_override
6. Once root cause is found, fix it and verify with a frontend screenshot

## Task 2: Fix Remaining Visual Issues

After Task 1, fix:
- Navigation font size and weight
- Footer logo SVG (upload to server)
- Copyright gold colour on full text
- Any other discrepancies found

## Task 3: Full Design Review

Compare every element at 1440px against reference. Produce numbered discrepancy list for user approval.

## Guardrails
- PreToolUse hook blocks wp post update, wp eval-file, wp eval, wp_update_post, str_replace
- After ANY change, take a frontend screenshot and LOOK at it before claiming done
- Do NOT add CSS to functions.php for font-size, font-weight, padding, or colours
- LiteSpeed Cache is DISABLED
~~~
