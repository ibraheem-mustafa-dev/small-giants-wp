# Session Handoff — 2026-02-27

## Completed This Session

1. **Merged PR #1 to main** — `feature/indus-foods-homepage` closed. All Indus Foods Phase 1 work is now on main.

2. **Fixed hamburger at desktop** — LiteSpeed CSS optimiser was merging adjacent `max-width`/`min-width` media blocks and dropping the desktop `display: none` rule. Moved show/hide pair from `core-blocks-critical.css` to `mobile-nav-drawer.css` (separate LiteSpeed output file). Bumped theme version to 1.2.7. Deployed and verified.

3. **Block editor validation** — confirmed no red validation banners on Homepage (post 13), Food Service (post 65), or Trade Account (post 58). All deprecation migrations are clean.

4. **Updated master feature audit** — Phase 2 blocks marked done (posts #63–68), new scorecard added: 68/294 verified (23%). `CLAUDE.md` updated with Phase 3 priorities.

5. **Started visual colour audit** — a design-reviewer agent ran and made incorrect changes: changed section backgrounds instead of button/text colours, destroyed gradient variety on the service cards. The changes may need partial reverting (see Known Issues).

6. **Investigated hero block bugs** — identified three code-level issues that need fixing before the visual audit can be completed properly (see Next Priorities).

---

## Current State

- **Branch:** `main` — clean, pushed
- **Live site:** `https://palestine-lives.org` — deployed, caches cleared
- **Working tree:** clean (docs only uncommitted)
- **Colour audit:** in progress, paused pending hero block fixes

### What the design-reviewer agent changed (requires review)

The agent edited post content for all three pages via WP-CLI. Changes that may need reverting:

| Page | Section | Agent's change | Verdict |
|------|---------|----------------|---------|
| Homepage | "Our Brands" bg | Changed to `surface-alt` grey | Possibly undesired |
| Homepage | "Our Services" heading | Changed from teal to dark | Changed backgrounds too — needs review |
| Homepage | Service card gradients | Changed all to same teal gradient | **Wrong — gradients should differ** |
| Homepage | "Why Choose" heading | Changed to dark | Should be fine |
| Food Service | "Product Range" text | Changed to dark | Verify |
| Food Service | Eyebrow labels | Changed to teal on white | Verify |
| Trade Account | Trust bar headings | Changed to dark | Fine |

---

## Known Issues / Blockers

1. **Hero heading invisible** — computed colour is white (`rgb(255,255,255)`) against what should be a gold gradient background. Root cause is unclear: `headlineColour` in the DB is `#424242`, `sgs_is_css_colour` correctly handles hex, so the output should be `style="color:#424242"`. The rendered HTML shows `style="color:var(--wp--preset--color--surface)"`. Needs live debugging — either the post content was modified by the previous agent, or there is a caching issue.

2. **Hero secondary button renders as solid teal** — the block stores `ctaSecondaryStyle:"custom"`, `ctaSecondaryBackground:"transparent"`, but the button renders with a solid teal background. Either the post content differs from WP-CLI output (agent changed it), or a CSS rule overrides the inline style.

3. **Hero has no content width control** — the hero always sets `.sgs-hero__content` to `max-width: var(--wp--style--global--wide-size, 1200px)` via hardcoded CSS. There is no `layout` support in `block.json` and no `contentWidth` attribute. The editor offers no way to constrain content to a narrower width. See the implementation plan for the fix.

4. **Split hero image scales forever** — `.sgs-hero__split-image` uses `height: 100%` and `object-fit: cover` with no `max-height`. As text content grows, the image column grows to match, causing the section to expand unboundedly.

5. **Full colour + hover audit not done** — the visual audit of all three pages (colours, hover effects, font sizes, button sizes, logo size) is incomplete. The hero block bugs above are blockers.

---

## Next Priorities (in order)

1. **Fix hero block bugs** — four code fixes in `render.php`, `style.css`, `block.json`, and `edit.js`. See `docs/plans/2026-02-27-hero-fixes.md` for the complete step-by-step plan.

2. **Verify and revert bad agent changes** — open the three pages in WP editor, screenshot each section against the pattern showcase, and revert any changes that broke the intended design (particularly the service card gradients).

3. **Full visual audit and colour fix** — once the hero block renders correctly, audit all elements on all three pages against the pattern showcase. Fix text/button colours to match backgrounds. Do NOT change section backgrounds. See computed CSS reference below.

4. **Apply hover effects** — after colours are correct, apply the hover controls (scale, shadow, transition) to the service cards and CTA buttons on all three pages.

---

## Files Modified This Session

```
CLAUDE.md                                              (Phase 2 done, Phase 3 priorities)
CONVERSATION-HANDOFF.md                               (this file)
docs/plans/2026-02-21-master-feature-audit.md         (Phase 2 blocks marked done, new scorecard)
theme/sgs-theme/assets/css/core-blocks-critical.css   (hamburger CSS simplified)
theme/sgs-theme/assets/css/mobile-nav-drawer.css      (hamburger hide rule moved here)
theme/sgs-theme/style.css                             (version bump 1.2.6 → 1.2.7)
```

---

## Notes for Next Session

### Computed CSS reference (pattern showcase vs. live pages)

From Playwright extraction — use these as the source of truth when fixing colours:

**Pattern showcase — correct values:**

| Element | Background | Text colour | Button bg | Button text |
|---------|-----------|-------------|-----------|-------------|
| Top bar links | `rgb(10,126,168)` teal | `rgb(255,255,255)` white | — | — |
| Hero on teal bg | transparent | `rgb(255,255,255)` white | `rgb(216,202,80)` gold | `rgb(30,30,30)` dark |
| Hero on white bg | transparent | `rgb(10,126,168)` teal | `rgb(216,202,80)` gold | `rgb(30,30,30)` dark |
| Sections on light bg | `rgb(242,245,247)` | `rgb(10,126,168)` teal h2 | — | — |
| Gold sections | `rgb(216,202,80)` | `rgb(30,30,30)` dark | — | — |

**Homepage — current live values:**

| Element | Current | Problem |
|---------|---------|---------|
| Hero heading | `rgb(255,255,255)` white | Should be `#424242` — render.php bug or post content changed |
| Hero primary btn text | `rgb(255,255,255)` white | Should be `rgb(30,30,30)` dark |
| Hero secondary btn bg | `rgb(10,126,168)` teal | Should be transparent |
| CTA section heading | `rgb(255,255,255)` white on `#F2F5F7` | Invisible — should be teal |
| CTA primary btn text | `rgb(255,255,255)` white | Should be `rgb(30,30,30)` dark |

### Hero block width — root cause

The hero block has no `layout` support in `block.json`. The content column always receives `max-width: var(--wp--style--global--wide-size, 1200px)` from hardcoded CSS. The editor offers no control to set a narrower content width. The implementation plan at `docs/plans/2026-02-27-hero-fixes.md` covers the fix: a `contentWidth` attribute with "content" | "wide" | "full" options.

### Hero split image — root cause

`.sgs-hero__split-image` has `height: 100%` and `object-fit: cover`. The media column uses `flex: 1 1 50%` with no `max-height`. As the content column grows (longer text), both columns grow together. Fix: add `max-height: 600px` (or a block attribute) to `.sgs-hero__media`, and `overflow: hidden` to clip the image.

### Colour fix rule (DO NOT change backgrounds)

Change text and button colours to suit their background. Do not change section backgrounds. The backgrounds on the live pages are intentional design choices. The rule is: if text or a button is the same colour family as its background, change the text/button — not the background.

### Deploy sequence

Always run all four steps after any deploy:
```bash
# 1. Build (if JS/block source changed)
cd plugins/sgs-blocks && npm run build

# 2. Deploy
cd /c/Users/Bean/Projects/small-giants-wp
tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='src' theme/sgs-theme plugins/sgs-blocks
scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar
ssh -p 65002 u945238940@141.136.39.73 'WP=domains/palestine-lives.org/public_html/wp-content && rm -rf $WP/themes/sgs-theme $WP/plugins/sgs-blocks && tar -xf sgs-deploy.tar && mv theme/sgs-theme $WP/themes/ && mv plugins/sgs-blocks $WP/plugins/ && rm -rf theme plugins sgs-deploy.tar'
rm sgs-deploy.tar

# 3. Reset OPcache
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"

# 4. Clear both LiteSpeed caches
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/css/*.css"
ssh hd "cd ~/domains/palestine-lives.org/public_html && wp litespeed-purge all"
```

---

## Relevant Tooling for Next Tasks

### Skills (invoke in this order at session start)

| Skill | When to invoke |
|-------|---------------|
| `/superpowers:using-superpowers` | **First** — session start, every time |
| `/superpowers:executing-plans` | **Second** — immediately after, to work through `docs/plans/2026-02-27-hero-fixes.md` task by task. The plan header requires this. |
| `/wp-block-development` | When editing `block.json`, `render.php`, `edit.js`, `style.css` for the hero block (Tasks 1–5) |
| `/superpowers:systematic-debugging` | If hero heading colour is still wrong after OPcache reset — use before proposing any code change |
| `/superpowers:verification-before-completion` | Before claiming any task done — run the verification commands from the plan, confirm output |
| `/superpowers:dispatching-parallel-agents` | When running colour audits on Food Service (post 65) and Trade Account (post 58) simultaneously (Task 7) |
| `/superpowers:writing-plans` | Only if new bugs surface that need a sub-plan before touching code |
| `/commit` | Between each task commit (Tasks 2–5 each have their own commit step) |
| `/handoff` | End of session — update this file |
| `/deploy` | After every build. Full tar deploy + OPcache reset + both LiteSpeed cache clears |

### Agents (mandatory delegation rules)

| Agent | Responsibility | Constraints |
|-------|---------------|-------------|
| **wp-developer** | ALL WordPress code changes: hero `render.php`, `style.css`, `block.json`, `edit.js`, build, deploy | Must follow the plan step-by-step. No improvising beyond the plan. |
| **design-reviewer** | Screenshot comparison only — compare live pages against pattern showcase, flag colour mismatches | **Must NOT make autonomous changes.** Give explicit per-element instructions from the computed CSS table. Never instruct it to "fix the colours" — only "report what you see". |
| **test-and-explain** | After each hero fix — verify block renders correctly in WP editor and explain result in plain English | Invoke after deploy, before marking task complete |

### MCP Servers

| MCP | Tool(s) | Use for |
|-----|---------|---------|
| **Playwright** | `browser_navigate`, `browser_take_screenshot`, `browser_evaluate`, `browser_resize` | Visual verification after every deploy. Use `browser_evaluate` to extract computed CSS — do not rely on screenshots alone. Test at 375px, 768px, 1440px. |
| **GitHub** | `pull_request_read`, `create_pull_request`, `list_commits` | After all tasks complete, create PR to main if work is on a feature branch |
| **Context7** | `resolve-library-id`, `get-library-docs` | Look up WordPress Block API, Interactivity API, or `@wordpress/scripts` docs if anything is unclear during hero block edits |
| **Memory** | `search_nodes`, `add_observations` | Check memory for established SGS patterns before writing new code. Save any new patterns discovered. |

### Commands

| Command | When |
|---------|------|
| `/handoff` | End of session |
| `/deploy both` | Full build + deploy pipeline (alias for the tar method + cache clears) |
| `/commit` | Between individual task commits |
| `/commit-push-pr` | When all tasks are done and ready for PR review |

---

## Next Session Prompt

```
/superpowers:using-superpowers

PR #1 is merged to main. The hero block has three confirmed bugs (heading colour ignored, secondary CTA button renders solid instead of transparent, and no content width control). A partial colour audit ran last session but the agent made incorrect changes (swapped backgrounds instead of text colours). A full implementation plan is at docs/plans/2026-02-27-hero-fixes.md.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

1. **Hero block fixes** — delegate to `wp-developer` with the plan at docs/plans/2026-02-27-hero-fixes.md. The plan covers: (a) diagnose and fix the headlineColour render bug, (b) fix the secondary CTA transparent background, (c) add a contentWidth attribute with "content" | "wide" | "full" options, (d) fix the split image max-height so it stops growing. Build and deploy after each fix. Use /superpowers:verification-before-completion before claiming done.

2. **Review and revert bad agent changes** — use Playwright to screenshot each section of Homepage (post 13), Food Service (post 65), and Trade Account (post 58) against the pattern showcase. Revert any section where the agent changed a background instead of text/button colours. Service card gradients must be different per card (not all the same teal).

3. **Full colour fix pass** — using the computed CSS table in the handoff, fix text and button colours on all three pages to match the pattern showcase reference values. Rule: change text/buttons to suit their background. Never change section backgrounds.

IMPORTANT: The design-reviewer agent must not make autonomous changes. Give it explicit per-element instructions from the computed CSS table in the handoff notes. Use Playwright browser_evaluate to extract computed colours — do not rely on screenshots alone.
```
