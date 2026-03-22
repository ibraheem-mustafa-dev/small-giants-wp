# Session Handoff — 2026-03-22

## Completed This Session
1. Added deprecated.js to 4 blocks (container, notice-banner, whatsapp-cta, testimonial) with save: () => null catch-all. Built, deployed, verified zero validation errors in editor.
2. Fixed hero block headline bug: removed `source: html` from headline/subHeadline attributes in block.json (dynamic blocks can't use source:html since save returns null). Deployed, set attributes via wp.data.dispatch JS API, verified H1 renders on frontend.
3. Fixed brand strip marquee: replaced hardcoded CSS translateX(-50%) with pixel-based --sgs-scroll-distance set by JS. Works regardless of logo count, container width, or nesting.
4. Reverted footer damage from failed PHP str_replace approach. Recovered 4 invalid paragraph blocks via JS data API (replaceBlock with fresh paragraph + correct content). Copyright link now covers "Website by Small Giants Studio".
5. Added PreToolUse hook `wp-content-guard.py` that blocks wp post update, wp eval-file, wp eval, wp_update_post, str_replace commands. Allows wp post get reads.
6. Set attribution commit/pr to empty strings globally (no co-authored-by lines).
7. Updated CLAUDE.md gotchas: never use source:html on dynamic blocks, never modify post_content via WP-CLI.

## Current State
- **Branch:** main at `642d420`
- **Tests:** no test suite
- **Build:** webpack compiles successfully
- **Uncommitted changes:** none (untracked files from prior sessions remain)
- **LiteSpeed Cache:** DISABLED
- **Cloudflare:** Developer mode ON
- **Live URL:** https://palestine-lives.org — hero working, brand strip scrolling, footer content restored

## Known Issues / Blockers
- CRITICAL: Header template part (DB post 201) has block validation failures. Pills render at 12px instead of 18px, nav at 14px/500 instead of 20px/600. The block comments say fontSize:"medium" but WordPress regenerates HTML with wrong classes. The header.html file AND DB template both need rewriting from scratch.
- CRITICAL: Footer template part (DB post 103) also has pre-existing invalid paragraphs (nested empty `<p></p>` wrapping content paragraphs). Copyright colour is white instead of gold (#E7D768).
- The header and footer template files in `theme/sgs-theme/parts/` are outdated compared to the DB versions. The DB versions (post 201, 103) take precedence but are corrupted.
- Google Maps embed loads but marker pin is not visible.

## Next Priorities (in order)
1. Research best-in-class WordPress block theme headers and footers (Kadence, Flavor, Flavor theme). Rewrite header.html and footer.html from scratch to S-tier quality — proper block markup, correct classes, no nested tags. Delete DB overrides (posts 201, 103) so file versions take precedence.
2. Fix remaining visual discrepancies: pill font sizes, nav font size/weight, copyright gold colour, Google Maps marker. All through the file-based templates, NOT DB.
3. Run full design review comparing every element against reference at 1440px. Produce numbered discrepancy list for user approval before fixing.
4. Complete block test page (post 208) with all 55 blocks.
5. Re-enable LiteSpeed Cache, turn off Cloudflare developer mode.

## Files Modified
| File path | What changed |
|-----------|-------------|
| `plugins/sgs-blocks/src/blocks/hero/block.json` | Removed source:html from headline/subHeadline attributes |
| `plugins/sgs-blocks/src/blocks/container/deprecated.js` | New — save: () => null catch-all |
| `plugins/sgs-blocks/src/blocks/container/index.js` | Imports deprecated |
| `plugins/sgs-blocks/src/blocks/container/save.js` | Stripped to minimal dynamic save |
| `plugins/sgs-blocks/src/blocks/notice-banner/deprecated.js` | New — save: () => null catch-all |
| `plugins/sgs-blocks/src/blocks/notice-banner/index.js` | Imports deprecated |
| `plugins/sgs-blocks/src/blocks/whatsapp-cta/deprecated.js` | New — save: () => null catch-all |
| `plugins/sgs-blocks/src/blocks/whatsapp-cta/index.js` | Imports deprecated |
| `plugins/sgs-blocks/src/blocks/testimonial/deprecated.js` | Added v2 null-save catch-all |
| `plugins/sgs-blocks/src/blocks/brand-strip/view.js` | Pixel-based scroll distance via --sgs-scroll-distance |
| `plugins/sgs-blocks/src/blocks/brand-strip/style.css` | Keyframe uses var(--sgs-scroll-distance) |
| `plugins/sgs-blocks/src/blocks/brand-strip/block.json` | Attribute updates |
| `plugins/sgs-blocks/src/blocks/brand-strip/edit.js` | Editor overhaul |
| `plugins/sgs-blocks/src/blocks/brand-strip/render.php` | Two-container architecture |
| `plugins/sgs-blocks/CLAUDE.md` | Added source:html and post_content gotchas |
| `~/.claude/hooks/wp-content-guard.py` | New — blocks WP-CLI content writes |
| `~/.claude/settings.json` | Added hook + attribution config |

## Notes for Next Session
- The root cause of header/footer rendering issues is that the DB template parts (posts 201, 103) have corrupted HTML from multiple sessions of WP-CLI manipulation and block recovery. The cleanest fix is to rewrite the file-based templates to S-tier quality, then delete the DB overrides with `wp post delete 201 --force` and `wp post delete 103 --force`.
- For editing template part content, ALWAYS use the Site Editor + wp.data.dispatch JS API via Playwright. A hook now blocks WP-CLI content writes.
- The Indus Foods gold colour is #E7D768 — NOT the `accent` token (which resolves to #F87A1F orange or #2C3E50 dark depending on context).
- wp.data.dispatch('core/block-editor').updateBlockAttributes() + wp.data.dispatch('core/editor').savePost() is the proven pattern for content changes via Playwright.
- After ANY content change, take a frontend screenshot and visually inspect before claiming done.

## Next Session Prompt

~~~
/using-superpowers

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/superpowers:using-superpowers` | FIRST — before any response |
| `/sgs-wp-engine` | Before any block or theme work |
| `/wp-block-themes` | Task 1 — rewriting header.html and footer.html |
| `/wp-block-development` | Task 1 — block markup standards |
| `/research` | Task 1 — research best-in-class WP block theme headers/footers |
| `/design-review` | Task 2 — full site comparison |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Context7 | Fetch latest WordPress block theme docs, theme.json v3 reference, core/navigation block API |
| Firecrawl | Research Kadence, flavor theme, developer.wordpress.org for header/footer patterns |
| Playwright MCP | Screenshot comparisons, Site Editor interaction, DevTools CSS verification |
| GitHub MCP | Commit and push after each completed task |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Task 1 — write the header.html and footer.html files |
| `design-reviewer` | Task 2 — full comparison list generation |
| `test-and-explain` | After Task 1 — verify header/footer render correctly |

## Research Approach
1. Use Context7 to fetch current WordPress block theme documentation for template parts, core/navigation block, and theme.json typography
2. Use Firecrawl to study Flavor theme (flavor-developer.flavortheme.com) header/footer patterns — they're the gold standard for block theme template parts
3. Search for "WordPress block theme header template part best practices 2025 2026" and "core/navigation block fontSize fontWeight not applying"
4. Check GitHub issues for WordPress/gutenberg regarding navigation block font size inheritance bugs

---

## Task 1: Rewrite Header and Footer Template Parts from Scratch

Research S-tier WordPress block theme headers and footers first. Then rewrite `theme/sgs-theme/parts/header.html` and `theme/sgs-theme/parts/footer.html` with clean, valid block markup. Delete the DB overrides (posts 201 and 103) so the file versions take precedence. Build and deploy. Take a screenshot at 1440px and verify:
- Header pills at 18px/600 weight
- Nav links at ~20px/600 weight matching reference
- Copyright text in gold #E7D768
- "Website by Small Giants Studio" fully linked
- Google Maps showing marker
- No empty paragraph gaps anywhere

## Task 2: Full Design Review — Discrepancy List Only

After Task 1, run a comprehensive design review comparing palestine-lives.org against the reference (lightsalmon-tarsier-683012.hostingersite.com) at 1440px. Check EVERY element: mega menu panels, button hover effects, image hover effects, service cards, testimonials, CTA strip, footer, nav, pills. Use DevTools computed styles.

Produce a NUMBERED discrepancy list. Present to user. Do NOT make changes — wait for approval.

## Task 3: Complete Block Test Page

Add ALL remaining blocks to test page (post ID 208). Currently has ~25 — needs all 55 including 14 form blocks.

## Guardrails
- A PreToolUse hook blocks wp post update, wp eval-file, wp eval, wp_update_post, str_replace via Bash. Use the Site Editor or JS data API instead.
- LiteSpeed Cache is DISABLED — re-enable after Task 2
- After ANY content change, take a frontend screenshot and visually inspect before claiming done
- Do NOT add CSS to functions.php for font-size, font-weight, padding, or colours
- Do NOT make design changes without user approval — produce the list, present it, wait
~~~
