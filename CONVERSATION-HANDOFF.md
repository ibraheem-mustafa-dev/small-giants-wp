# Session Handoff — 2026-02-26 (Session 29 — Phase 2 Blocks + Automation)

## Completed This Session

1. **Wired orphaned hooks into `~/.claude/settings.json`:**
   - `branch-guard.sh` — now fires as PreToolUse on `Write|Edit` (blocks edits on main branch)
   - `delete-guard.sh` — now fires as PreToolUse on `Bash` (blocks `rm -rf /` commands)

2. **Created `build-reminder.py` PostToolUse hook:**
   - Fires after any `Write|Edit` to a file under `plugins/sgs-blocks/src/`
   - Prints a clear warning to run `npm run build` and deploy before testing live
   - Registered in `settings.json`. Prevents the stale-build bug that recurred across multiple sessions.

3. **Created `/deploy` skill:**
   - Path: `.claude/skills/deploy/SKILL.md` (project-level)
   - Invoke as `/deploy plugin`, `/deploy theme`, or `/deploy both`
   - Full pipeline: build → tar → SCP → SSH extract → LiteSpeed cache clear → OPcache reset
   - Includes critical gotchas table (single quotes on SSH, rm before mv, etc.)

4. **Completed all three Phase 2 blocks (commit `8e640c4`):**
   - **Countdown Timer** — missing `import './style.css'; import './editor.css';` in `index.js`. Fixed. Block now renders with teal numbers, labels, responsive layout.
   - **Star Rating** — same CSS import fix. Stars now render with correct gold/empty colours, half-star support, schema.org/AggregateRating already working.
   - **Team Member** — added Schema.org/Person JSON-LD to `render.php` (feature #252): `jobTitle`, `description`, `image`, `sameAs` for social URLs.
   - Built, deployed, verified on Block Test page (post 52) with Playwright screenshots.

5. **Created implementation plan:** `docs/plans/2026-02-26-phase2-blocks-complete.md`

---

## Current State

- **Branch:** `feature/indus-foods-homepage`
- **Last commit:** `8e640c4` — pushed to origin
- **Live site:** `https://palestine-lives.org`
- **All three Phase 2 blocks verified working** on Block Test page — countdown-timer ticking, star-rating styled, team-member rendering with schema.

### Unstaged changes from previous sessions (not committed)

These are session 28 leftovers sitting in the working tree — NOT yet committed:

| File | What it is |
|---|---|
| `plugins/sgs-blocks/src/blocks/accordion/deprecated.js` | Deprecated.js v1 for accordion (save: () => null) |
| `plugins/sgs-blocks/src/blocks/counter/deprecated.js` | Deprecated.js v1 for counter |
| `plugins/sgs-blocks/src/blocks/tabs/deprecated.js` | Deprecated.js v1 for tabs |
| `plugins/sgs-blocks/src/blocks/accordion/index.js` | Imports deprecated.js |
| `plugins/sgs-blocks/src/blocks/counter/index.js` | Imports deprecated.js |
| `plugins/sgs-blocks/src/blocks/tabs/index.js` | Imports deprecated.js |
| `plugins/sgs-blocks/src/blocks/hero/editor.css` | Hero badges editor fix |
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Header CSS fixes |
| `plugins/sgs-blocks/includes/lucide-icons.php` | Modified |
| `plugins/sgs-blocks/CLAUDE.md` | Updated |
| `CLAUDE.md` | Updated |

These need to be built and deployed — the deprecated.js files for accordion, counter, and tabs will fix the Block Test page validation errors.

### Manual action still required (Task 1 from this session)

Playwright cannot automate this — Chrome blocks it when already running. **You must do this manually in your browser:**

1. Open `https://palestine-lives.org/wp-admin/post.php?post=65&action=edit` (Food Service)
2. Click **Update** — triggers deprecated.js migration for trust-bar, heritage-strip, certification-bar, process-steps
3. Open `https://palestine-lives.org/wp-admin/post.php?post=13&action=edit` (Homepage)
4. Click **Update**
5. On the Homepage: **re-add images to the heritage-strip block** (imageLeft/imageRight were never set — the block will show image placeholders after migration)

---

## Known Issues / Blockers

1. **Header styling regressions** — live site header has multiple issues vs reference site. See Priority 1 below.
2. **Block Test page — 3 broken blocks** — `sgs/accordion`, `sgs/accordion-item`, `sgs/tab-item` still show "unexpected content" errors. `sgs/social-icons` icons overlap. Deprecated.js exists in working tree but not yet built + deployed.
3. **Pattern Showcase page — 3 broken blocks** — `sgs/counter` invalid, `core/image` blocks invalid (Meet Our Team), `core/group` block invalid (Simple Transparent Pricing).
4. **ToC Test Page — PHP critical error** — page crashes in WP backend. Root cause unknown.
5. **Trade Account page — 2 visual issues** — hero badges stacked in editor (cosmetic only), columns layout collision.

---

## Next Priorities (in order)

### Priority 0: Build + commit the unstaged deprecated.js files

Before anything else — those deprecated.js files in the working tree need to be built and deployed. They fix accordion/counter/tabs on Block Test page.

```bash
cd plugins/sgs-blocks && npm run build
```
Then `/deploy plugin` and commit all unstaged changes.

---

### Priority 1: Header Styling (MUST match reference site)

**Reference (DO NOT modify):** `https://lightsalmon-tarsier-683012.hostingersite.com/`
**Dev site:** `https://palestine-lives.org/`

Use Playwright at 1440px and 375px to screenshot both, extract computed styles, then fix:

1. **Burger menu on desktop** — `@media (min-width: 1024px)` hide rule in `core-blocks-critical.css` isn't winning. Check computed display on `.wp-block-navigation__responsive-container-open`.
2. **Logo size control not working** — width attribute on logo image has no effect on frontend.
3. **Header CTA button** — "Register For a Trade Account" should be teal background, white text. Currently shows browser-default blue, small font.
4. **Social icon hover inconsistency** — top-bar icons have different hover behaviours. Reference has consistent opacity/colour transitions.
5. **Overall header CSS** — many elements likely missing or overridden. Extract computed styles from key elements.

**Relevant files:**
- `theme/sgs-theme/parts/header.html`
- `theme/sgs-theme/parts/header-sticky.html`
- `theme/sgs-theme/assets/css/core-blocks-critical.css`
- `theme/sgs-theme/functions.php`

---

### Priority 2: Block Test Page — Broken Blocks

1. **`sgs/accordion` + `sgs/accordion-item`** — deprecated.js needed (same pattern as session 28). SSH, extract stored HTML for post 52, add `save: () => null` deprecation.
2. **`sgs/tab-item`** — same deprecated.js pattern.
3. **`sgs/social-icons` overlapping** — CSS flexbox issue in `src/blocks/social-icons/style.css`.

---

### Priority 3: Pattern Showcase Page — Broken Blocks

1. **`sgs/counter`** — deprecated.js pattern. Extract stored HTML from post 53 first.
2. **`core/image` in "Meet Our Team"** — attribute mismatch. Extract raw block comment from DB, identify diverging attribute, fix with WP-CLI eval-file str_replace.
3. **`core/group` in "Simple Transparent Pricing"** — same core block fix approach.

---

### Priority 4: ToC Test Page PHP Error

SSH: `tail -100 ~/domains/palestine-lives.org/public_html/wp-content/debug.log`
Likely in `sgs/table-of-contents` render.php — undefined variable or missing function.

---

### Priority 5: Trade Account Visual Issues

- Hero badges stacked in editor → add flex rules to `src/blocks/hero/editor.css`
- Column overlap → Playwright screenshot + computed margins → CSS spacing fix

---

## Files Modified This Session

| File | Change |
|---|---|
| `~/.claude/settings.json` | Added branch-guard.sh + delete-guard.sh PreToolUse hooks |
| `~/.claude/hooks/build-reminder.py` | **NEW** — PostToolUse src/ edit warning |
| `.claude/skills/deploy/SKILL.md` | **NEW** — /deploy skill with full pipeline |
| `plugins/sgs-blocks/src/blocks/countdown-timer/index.js` | Added CSS imports |
| `plugins/sgs-blocks/src/blocks/star-rating/index.js` | Added CSS imports |
| `plugins/sgs-blocks/src/blocks/team-member/render.php` | Added Schema.org/Person JSON-LD |
| `docs/plans/2026-02-26-phase2-blocks-complete.md` | **NEW** — Phase 2 implementation plan |
| `CONVERSATION-HANDOFF.md` | Updated (this file) |

---

## Notes for Next Session

- **Deprecated.js pattern is established** — see `src/blocks/process-steps/deprecated.js` as the template. Pattern: v1 with `save: () => null`, migrate function normalises old attribute shapes.
- **Core block fixes use WP-CLI eval-file** — write PHP str_replace to `/tmp/script.php` via `cat << 'PHPEOF'`, SCP to server, `wp eval-file ~/script.php`, `rm`.
- **Always use Playwright** for header work — screenshot both sites before touching anything, use `browser_evaluate` for computed styles. Never guess what's different.
- **Reference site is read-only** — `lightsalmon-tarsier-683012.hostingersite.com`. Screenshots only, never modify.
- **Unstaged changes need a build first** — accordion/counter/tabs deprecated.js won't do anything until `npm run build` is run and deployed.
- **Build reminder hook is now active** — after editing any `src/` file you'll see a warning. This is intentional, not an error.
- **`/deploy` skill now exists** — use it instead of typing the full command manually.

---

## Relevant Tooling for Next Tasks

### Commands
- `/deploy` — full deploy pipeline. Use `/deploy plugin` or `/deploy both`
- `/handoff` — generate session handoff

### Skills
- `/superpowers:systematic-debugging` — for the PHP error on ToC Test Page
- `/wp-block-development` — reference for deprecated.js patterns

### Agents
- **`wp-developer`** — MANDATORY for all CSS/template/PHP/block work (header fixes, deprecated.js, render.php). Never write WP code in the main conversation.
- **`design-reviewer`** — use after header fixes to verify against reference site at multiple breakpoints
- **`test-and-explain`** — run after fixing blocks to verify in plain English

### MCP Servers
- **Playwright** — essential for header comparison. Use `browser_navigate`, `browser_take_screenshot`, `browser_evaluate`, `browser_resize`.

### Hooks (now active)
- `build-reminder.py` — fires after any src/ edit, reminds to build. Intentional.
- `branch-guard.sh` — blocks file edits on main branch.

---

## Next Session Prompt

~~~
/superpowers:using-superpowers

SGS Framework — Session 30: Unstaged Deprecated.js + Header Fixes + Block Test Repairs

All three Phase 2 blocks (countdown-timer, star-rating, team-member) are working on the live site. Branch is `feature/indus-foods-homepage`, last commit `8e640c4`. There are unstaged deprecated.js files for accordion, counter, and tabs sitting in the working tree that need to be built and committed first.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these in order:

**Priority 0 — Build + commit unstaged deprecated.js files (5 min, do first):**
Files `plugins/sgs-blocks/src/blocks/accordion/deprecated.js`, `counter/deprecated.js`, and `tabs/deprecated.js` are untracked. Run `cd plugins/sgs-blocks && npm run build`, then `/deploy plugin`, then commit all unstaged changes with a descriptive message. These fix Block Test page validation errors for accordion and tabs.

**Priority 1 — Header styling:**
Use Playwright to screenshot both `https://palestine-lives.org/` and `https://lightsalmon-tarsier-683012.hostingersite.com/` at 1440px. Use `browser_evaluate` to extract computed styles on: hamburger button, CTA button, nav links, social icons, logo. Then fix in `theme/sgs-theme/assets/css/core-blocks-critical.css` and header template HTML:
- Burger menu visible on desktop (CSS specificity issue)
- CTA button wrong colour (should be teal + white, not blue)
- Logo size control not working on frontend
- Social icon hover inconsistency in top bar
MANDATORY: delegate all CSS/template writes to `wp-developer` agent. Use `design-reviewer` agent to verify after.

**Priority 2 — Block Test page broken blocks (post 52):**
SSH to server, extract stored HTML for `sgs/accordion`, `sgs/accordion-item`, `sgs/tab-item`. Add deprecated.js with `save: () => null` for each. Fix `sgs/social-icons` overlapping CSS. Build and deploy with `/deploy plugin`.

**Priority 3 — Pattern Showcase broken blocks (post 53):**
`sgs/counter` needs deprecated.js (extract stored HTML first). Two core blocks need WP-CLI eval-file str_replace fix — extract raw block comments from DB to identify the attribute mismatch.

**Priority 4 — ToC Test Page PHP error:**
SSH: `tail -100 ~/domains/palestine-lives.org/public_html/wp-content/debug.log` — identify and fix the fatal in `sgs/table-of-contents` render.php.

**REMINDER — manual action still needed:**
You still need to open posts 65 (Food Service) and 13 (Homepage) in WP admin and click Update to trigger deprecated.js migrations. After saving Homepage, re-add images to the heritage-strip block.

CRITICAL: Use `/deploy plugin` skill for deploys. The build-reminder hook will warn you after any src/ edit — that's intentional, not an error.
~~~
