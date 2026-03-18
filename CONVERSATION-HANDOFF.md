# Session Handoff — 2026-03-18

## Completed This Session

1. **Recovered mid-flight subagent work** — two agents (hero-nav-fixer, megamenu-fixer) were running when the previous session hit context. Reviewed all uncommitted diffs, confirmed both completed their tasks, committed 32-file changeset (47dfba8).
2. **Fixed vendor directory corruption** — `--exclude='src'` in the tar deploy command was stripping `vendor/*/src/` subdirectories (myclabs, phpunit, etc.), causing fatal PHP errors via WP-CLI. Redeployed full vendor via `scp -r`. Fixed the tar exclude in CLAUDE.md to `--exclude='plugins/sgs-blocks/src'`.
3. **Deployed homepage visual QA fixes** — hero split image bounded (aspect-ratio 4/3, max-width 50%); card grid equal-height rows; testimonial dots refactored to pseudo-element pattern (44px transparent button, 10px visible dot); arrows repositioned to sides of track via absolute stage wrapper; section gap CSS reset; brand strip logos 80px.
4. **Mega menu overhaul** — animation switched from display:none to visibility:hidden for smooth transitions; viewport overflow repositioning via `repositionPanel()` in view.js; link pill-hover pattern; text colour tokens fixed; panel max-width `min(900px, calc(100vw - 2rem))` added to compiled CSS (2988806).
5. **Decorative image extension bug fixed** — hero-nav-fixer agent changed `.png` → `.webp` in functions.php for decorative spice images, but only `.png` files exist in theme assets. Reverted to `.png`.
6. **wp_sgs_developer Playwright tools added** — 8 Playwright MCP tools + mandatory visual QA section added to the agent definition (applied in previous session, logged in skill-writer/results.md).
7. **functions.php additions** — duotone WP 6.9.x arg-count fix; ARIA menubar role filter for mega-menu navigation; nav list structure filter; global `wp_content_img_tag` image dimension injector; brand-logo-tile CSS for mega menu brands panel; button hover accessibility fix excluding gold-bg buttons.
8. **Five style variations committed** — eye-care-ward-end, sgs-construction, sgs-healthcare, sgs-mosque, sgs-professional added to `theme/sgs-theme/styles/`.
9. **LiteSpeed disabled for dev** — deactivated via WP-CLI (`wp plugin deactivate litespeed-cache`). Must be re-enabled before performance testing.

## Current State

- **Branch:** main at e70a7e3
- **Tests:** no test suite
- **Build:** npm run build passes (webpack compiled successfully)
- **Uncommitted changes:** none (tree is clean)
- **Live site:** palestine-lives.org — all fixes deployed, OPcache reset
- **LiteSpeed:** DEACTIVATED — re-enable before any performance testing (`wp plugin activate litespeed-cache`)

## Known Issues / Blockers

- **Mega-menu CSS source/build divergence** — `build/blocks/mega-menu/style-index.css` is a more sophisticated implementation than `src/blocks/mega-menu/style.css` (CSS variables, multiple layout variants). The max-width fix was hand-patched into the build file. `index.js` doesn't import `style.css` so webpack never rebuilds it. Next session must sync src to match build and add `import './style.css'` to `index.js`.
- **Playwright browser cache** — CSS has `Cache-Control: max-age=14400` (4 hours). QA agent will see stale styles until cache expires or file URLs change. Fixes confirmed correct via direct curl checks.
- **Service pages (IDs 65-68)** — reference `uploads/indus-foods/decorative-foods/*.webp` as actual image blocks. These webp files exist in uploads but the pages were not visually QA'd this session.
- **ARCHITECTURE.md stale** — says 32 blocks, actual count is 55. Not session-critical but needs a refresh pass.

## Next Priorities (in order)

1. **Re-enable LiteSpeed** — `ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin activate litespeed-cache"` — do this before any performance work or before handing back to client.
2. **Fix mega-menu CSS source sync** — copy the sophisticated `build/blocks/mega-menu/style-index.css` content into `src/blocks/mega-menu/style.css`, then add `import './style.css'; import './editor.css';` to `src/blocks/mega-menu/index.js` so future builds are reproducible. Run `npm run build` and verify output matches.
3. **Visual QA on service pages** — run the `design-reviewer` agent on Food Service (ID 65), Manufacturing (66), Retail (67), Wholesale (68) pages to check image rendering and layout at 375/1440px.
4. **Testimonial two-column layout** — reference mockup specifies a two-column layout (text left, author/stars right). Currently single-column. Implement as a variant or default style change in `testimonial-slider`.
5. **ARCHITECTURE.md refresh** — update block count (32 → 55), add the 5 new style variations, add vendor gotcha, update Phase status.

## Files Modified

| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/src/blocks/mega-menu/style.css` | max-width added; visibility animation; link pill-hover; text tokens |
| `plugins/sgs-blocks/src/blocks/mega-menu/render.php` | wp_unique_id() replaces static counter |
| `plugins/sgs-blocks/src/blocks/mega-menu/view.js` | repositionPanel() for viewport overflow; focus management |
| `plugins/sgs-blocks/src/blocks/hero/render.php` | Image dimension fallback from WP metadata |
| `plugins/sgs-blocks/src/blocks/hero/style.css` | Split image: aspect-ratio 4/3, max-height 600px, max-width 50% |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/render.php` | Added stage wrapper div around track + arrows |
| `plugins/sgs-blocks/src/blocks/testimonial-slider/style.css` | Arrows absolute within stage; dots refactored to pseudo-element |
| `plugins/sgs-blocks/src/blocks/card-grid/style.css` | height:100% for equal-height cards |
| `plugins/sgs-blocks/src/blocks/brand-strip/block.json` | Logo size default updated |
| `plugins/sgs-blocks/src/blocks/brand-strip/render.php` | Logo output changes |
| `plugins/sgs-blocks/src/blocks/brand-strip/style.css` | Logo sizing |
| `plugins/sgs-blocks/src/blocks/trust-bar/style.css` | Style tweaks |
| `plugins/sgs-blocks/includes/render-helpers.php` | Helper additions |
| `plugins/sgs-blocks/includes/block-defaults.php` | Default seed updates |
| `plugins/sgs-blocks/includes/lucide-icons.php` | Timestamp only |
| `plugins/sgs-blocks/build/blocks/mega-menu/style-index.css` | Hand-patched: max-width added to base panel (not rebuilt from src) |
| `theme/sgs-theme/functions.php` | Duotone fix; menubar ARIA; nav list filter; image dimensions; brand tiles CSS; decorative .png fix |
| `theme/sgs-theme/parts/mega-menu-brands.html` | Real brand logo images replacing emoji placeholders |
| `theme/sgs-theme/styles/indus-foods.json` | Token adjustments |
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Section gap reset |
| `theme/sgs-theme/assets/css/core-blocks.css` | Section gap reset |
| `theme/sgs-theme/assets/css/mobile-nav-drawer.css` | Mobile nav tweaks |
| `theme/sgs-theme/styles/eye-care-ward-end.json` | New style variation |
| `theme/sgs-theme/styles/sgs-construction.json` | New style variation |
| `theme/sgs-theme/styles/sgs-healthcare.json` | New style variation |
| `theme/sgs-theme/styles/sgs-mosque.json` | New style variation |
| `theme/sgs-theme/styles/sgs-professional.json` | New style variation |
| `CLAUDE.md` | Deploy command fixed: `--exclude='src'` → `--exclude='plugins/sgs-blocks/src'`; vendor gotcha added |
| `specs/03-SGS-BOOKING.md` | Minor updates |
| `plugins/sgs-booking/CLAUDE.md` | Minor updates |

## Notes for Next Session

- The `--exclude='src'` tar deploy bug was silently corrupting vendor on every deploy since it was introduced. Any server that received a tar deploy may have incomplete vendor packages — check with `php -r "require '/path/to/vendor/autoload.php';"` if WP-CLI fails with autoload errors.
- CSS cache `max-age=14400` (4 hours) means Playwright QA will show stale styles. Verify fixes via `curl -s URL | grep 'class-name{[^}]*}'` instead of relying on Playwright screenshots.
- Mega-menu build/src divergence: the compiled file has CSS variables (`--sgs-mm-panel-min-width`, `--sgs-mega-menu-max-width`), multiple layout variants (full, contained, columns, flyout), and animation via JS removing `[hidden]` — more feature-rich than the source. Do not overwrite the compiled file with webpack output until the source is synced.
- LiteSpeed is currently OFF on the dev site. Re-enable before any Lighthouse or performance checks.

## Next Session Prompt

~~~
Invoke `/superpowers:using-superpowers` before doing anything else.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through the priorities below.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/superpowers:using-superpowers` | FIRST — before any response |
| `/sgs-wp-engine` | Before any SGS block or theme work — loads block knowledge base |
| `/wp-block-development` | When syncing mega-menu src/build CSS or implementing testimonial two-column |
| `/visual-qa` | Before and after any visual changes to the homepage |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Visual QA on service pages; verify mega-menu after CSS sync |
| GitHub MCP | Push commits, open PRs if feature branch needed |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All block code changes: mega-menu CSS sync, testimonial two-column |
| `design-reviewer` | Visual QA on service pages (IDs 65-68) and homepage re-check |

---

## Task 1: Re-enable LiteSpeed

Run: `ssh hd "cd ~/domains/palestine-lives.org/public_html && wp plugin activate litespeed-cache"` then reset OPcache. Do this first, before any other work.

## Task 2: Fix Mega-Menu CSS Source/Build Divergence

Copy `plugins/sgs-blocks/build/blocks/mega-menu/style-index.css` content into `src/blocks/mega-menu/style.css` (this is the authoritative version — more feature-rich). Then add `import './style.css'; import './editor.css';` to `src/blocks/mega-menu/index.js`. Run `npm run build` and verify the compiled output matches. Deploy and verify the panel max-width still applies via `curl -s "https://palestine-lives.org/wp-content/plugins/sgs-blocks/build/blocks/mega-menu/style-index.css" | grep max-width`. Delegate to `wp-sgs-developer`.

## Task 3: Visual QA — Service Pages

Run `design-reviewer` agent on Food Service, Manufacturing, Retail, Wholesale pages (IDs 65-68) at 375px and 1440px. Check: images load, layout is correct, no broken images. These pages reference `uploads/indus-foods/decorative-foods/*.webp` as image blocks — verify they render.

## Guardrails

- LiteSpeed MUST be re-enabled before any Lighthouse or performance testing.
- Do NOT run `npm run build` before syncing `src/blocks/mega-menu/style.css` to match the build — it would overwrite the sophisticated compiled version with the simpler source.
- CSS changes take up to 4 hours to show in Playwright due to `Cache-Control: max-age=14400`. Verify CSS changes via `curl -s URL | grep 'rule'` not Playwright screenshots.
- Branch discipline: all current work is framework-level (main branch). Client-specific changes go on a `feat/indus-foods-*` branch.
~~~
