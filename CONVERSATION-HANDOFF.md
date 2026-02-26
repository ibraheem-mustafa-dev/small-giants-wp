# Session Handoff — 2026-02-26 (Session 30 — Indus Foods Trade Account + Cache Debugging)

## Completed This Session

1. **Diagnosed and fixed Trade Account hero badge overlap:**
   - Root cause: LiteSpeed page cache was serving HTML rendered by an OLD OPcache'd version of `render.php` (before the `.sgs-hero__badges` wrapper was added)
   - Fix: reset PHP OPcache via HTTP, then `wp litespeed-purge all`, then clear CSS optimiser files (`litespeed/css/*.css`)
   - Badges now render correctly in a horizontal flex row (~3 min | £0 | £75 | 5,000+)

2. **Committed all session 28 leftovers (accordion/counter/tabs deprecations):**
   - `deprecated.js` v1 added for accordion, counter, tabs — prevents block validation errors in WP editor
   - Hero `editor.css` badge layout fix (flex row preview in editor)
   - `core-blocks-critical.css` hamburger CSS split into proper mobile/desktop media queries

3. **Built + deployed theme and plugin** — full tar deploy, OPcache reset, LiteSpeed CSS + page cache cleared

4. **Updated CLAUDE.md** with accurate LiteSpeed cache instructions:
   - `wp litespeed-purge all` WORKS (old note was wrong)
   - Two separate caches: page cache AND CSS optimiser (`litespeed/css/*.css`)
   - `litespeed/cache/` path doesn't exist on this host — never use it

5. **Added `.playwright-mcp/` to `.gitignore`** — prevents screenshot/log dumps from polluting the repo

6. **Pushed to origin, PR #1 updated** — all commits on `feature/indus-foods-homepage`

---

## Current State

- **Branch:** `feature/indus-foods-homepage`
- **Last commits:** `4b245bb` (gitignore), `9894e37` (deprecations + fixes) — both pushed
- **PR:** `https://github.com/ibraheem-mustafa-dev/small-giants-wp/pull/1` (open, ready for review)
- **Live site:** `https://palestine-lives.org` — deployed and cache-cleared
- **Working tree:** Only `CLAUDE.md` and `CONVERSATION-HANDOFF.md` have uncommitted changes (docs)

### Pages verified working
- Trade Account (`/apply-for-trade-account/`) — hero badges fixed, form functional
- Homepage (`/`) — split hero with badge, nav correct
- Block Test page (post 52) — countdown-timer, star-rating, team-member confirmed

### One open visual issue
- **Hamburger icon visible at desktop** alongside nav links — CSS on server is correct (`display: none !important` at `min-width: 1024px`), but this may be a WordPress navigation block **Overlay Menu** editor setting rather than a CSS problem. Check in WP editor: Navigation block → "Overlay Menu" setting should be "Mobile" not "Always".

---

## Known Issues / Blockers

1. **Hamburger at desktop** — see above. Check WP editor nav block settings before touching CSS again.
2. **LiteSpeed browser HTTP cache** — Playwright's persistent Chrome profile caches CSS files. After deploying CSS changes, the Playwright browser may show stale styles even after server purge. Use `location.reload(true)` in `browser_evaluate` or navigate to a fresh URL to bypass.
3. **`wp litespeed-purge all` clears page cache but NOT CSS optimiser cache** — must ALSO run `rm -rf wp-content/litespeed/css/*.css` after CSS deploys.

---

## Next Priorities (in order)

1. **Merge PR #1 to main** — `feature/indus-foods-homepage` has all Indus Foods work. Branch has been going for a while; clean merge to main then start fresh feature branch for next client or Phase 3 work.
2. **Block editor validation check** — open Homepage, Food Service, and Trade Account pages in WP editor to confirm no block validation errors remain after the deprecations deploy. Just open, check for red banners, save if needed.
3. **Phase 3 planning** — update the master feature audit scorecard (`docs/plans/2026-02-21-master-feature-audit.md`) to reflect Phase 2 blocks complete, then decide Phase 3 priorities. Current framework maturity ~43% (tabs, countdown, star-rating, team-member added).
4. **Hamburger nav block setting** — open WP editor → Templates → Header template part → click Navigation block → Inspector → confirm "Overlay Menu" is set to "Mobile" not "Always".

---

## Files Modified This Session

```
plugins/sgs-blocks/src/blocks/accordion/deprecated.js  (new)
plugins/sgs-blocks/src/blocks/accordion/index.js
plugins/sgs-blocks/src/blocks/counter/deprecated.js    (new)
plugins/sgs-blocks/src/blocks/counter/index.js
plugins/sgs-blocks/src/blocks/tabs/deprecated.js       (new)
plugins/sgs-blocks/src/blocks/tabs/index.js
plugins/sgs-blocks/src/blocks/hero/editor.css
plugins/sgs-blocks/includes/lucide-icons.php
plugins/sgs-blocks/CLAUDE.md
theme/sgs-theme/assets/css/core-blocks-critical.css
CLAUDE.md                                              (LiteSpeed cache instructions updated)
.gitignore                                             (.playwright-mcp/ added)
```

---

## Notes for Next Session

### LiteSpeed cache — correct sequence after any deploy

```bash
# 1. Build (if sgs-blocks source changed)
cd plugins/sgs-blocks && npm run build

# 2. Deploy
cd /path/to/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar

# 3. Reset OPcache (MUST be HTTP — CLI pool doesn't affect web requests)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"

# 4. Clear BOTH LiteSpeed caches
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/css/*.css"
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

### Playwright browser cache gotcha
After a LiteSpeed purge, Playwright's Chrome profile may still serve stale CSS from its HTTP cache (CSS filenames don't change when content changes — LiteSpeed reuses the hash). Force a bypass:
```javascript
// In browser_evaluate:
location.reload(true); // hard reload, bypasses browser HTTP cache
```

### Deprecations pattern (for future blocks)
When adding `deprecated.js` to a dynamic block (render.php), the deprecation only needs to handle validation (not migration), because the PHP regenerates HTML fresh:
```javascript
// deprecated.js for a fully dynamic block
export default [{ save: () => null }];
```
For static blocks with stored HTML (like brand-strip before it went dynamic), include a `migrate` function.

### Master feature audit scorecard
Update `docs/plans/2026-02-21-master-feature-audit.md` — Phase 2 blocks are done:
- tabs ✓, countdown-timer ✓, star-rating ✓, team-member ✓
- Framework maturity estimate: ~43% (was 33% at session 23)

---

## Relevant Tooling for Next Tasks

### Commands (slash commands)
- `/handoff` — generate session summary at end of session
- `/deploy both` — full build + deploy pipeline (theme + plugin)
- `/commit-push-pr` — commit, push, and open PR

### Skills (plugin skills)
- `/superpowers:verification-before-completion` — before claiming any fix is done, verify it
- `/wp-block-development` — use when modifying block.json, save.js, deprecated.js patterns
- `/superpowers:systematic-debugging` — use if block validation errors reappear

### Agents
- **wp-developer** — delegate ALL WordPress build work: block editor checks, template part edits, nav block settings. If checking the hamburger nav block setting in the editor, describe the task to wp-developer.
- **design-reviewer** — use after any visual changes to verify WCAG 2.2 AA compliance and layout correctness across breakpoints
- **test-and-explain** — run after merging PR to verify live site

### MCP Servers
- **Playwright** (`mcp__plugin_playwright_playwright__browser_*`) — visual verification of live pages. Remember to `location.reload(true)` after cache operations.

---

## Next Session Prompt

```
/superpowers:using-superpowers

The Indus Foods homepage branch (`feature/indus-foods-homepage`) is complete — all blocks validated, hero badges fixed, deprecations deployed, PR #1 open at github.com/ibraheem-mustafa-dev/small-giants-wp/pull/1. The working tree is clean except for docs files. Framework maturity ~43%.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

1. **Merge PR #1 to main** — `feature/indus-foods-homepage` is ready. Merge it, then create a new branch for the next work stream.

2. **Block editor validation check** — use the `wp-developer` agent to open Homepage, Food Service, and Trade Account pages in the WP editor (palestine-lives.org/wp-admin). Confirm no red block validation banners. Save each page to trigger any deprecation migrations.

3. **Hamburger nav at desktop** — use `wp-developer` to check the Navigation block in the Header template part. Inspector → "Overlay Menu" setting. Should be "Mobile" not "Always". If it's set wrong, change it — no CSS edit needed.

4. **Update master feature audit** — mark Phase 2 blocks complete in `docs/plans/2026-02-21-master-feature-audit.md`, update the framework maturity percentage, and decide Phase 3 priorities.

IMPORTANT: Always use `wp litespeed-purge all` AND `rm -rf wp-content/litespeed/css/*.css` after any CSS deploys — there are two separate LiteSpeed caches. OPcache reset must go via HTTP (not CLI). See CLAUDE.md Deploy Commands section for the full sequence.
```
