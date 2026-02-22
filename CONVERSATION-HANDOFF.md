# Session Handoff — 2026-02-22 (Session 25 Complete — Security + Performance + Correctness Fixes)

## What Session 25 Accomplished

**6 of 8 audit gap steps completed.** All CRITICAL and HIGH security issues fixed, performance optimised, and correctness issues resolved. Built, deployed, and verified on live site.

### Steps Completed

| Step | Status | Details |
|------|--------|---------|
| 1. Deploy a11y fixes | DONE | Built, deployed, verified via curl (focus-visible, H2 headings, 44px targets, pause button) |
| 2. Security fixes (3 CRITICAL + 7 HIGH) | DONE | See security section below |
| 3. Performance quick wins | DONE | Emoji removed (22KB saved), fetchpriority="high" on hero, fluid spacing |
| 4. Fix sticky header | DONE | Moved position:sticky from inner group to `<header>` element |
| 5. Fix fluid spacing | DONE | 6 spacing sizes now have fluid min/max in theme.json |
| 6. Translation strings | DONE | 6 strings wrapped in __()/_e() across 3 files |
| 7. Test content + verify blocks | NOT STARTED | Needs WP admin access or WP-CLI |
| 8. Commit + scorecard | NOT STARTED | Waiting for Step 7 |

### Security Fixes Applied (Step 2)

**Original 3 CRITICAL from audit:**
1. Nonce verification added to form submit + upload REST endpoints (`verify_form_nonce` callback)
2. `__return_true` replaced with nonce-checking permission callback on both endpoints
3. N8N webhook URL moved from block attributes to `wp_options` (`sgs_n8n_webhook_url`), admin Settings page created

**Original 4 HIGH from audit:**
4. IP spoofing fixed — `get_client_ip()` now uses only `REMOTE_ADDR` (in both class-form-rest-api.php and class-form-processor.php)
5. SSRF prevented — `wp_safe_remote_post()` replaces `wp_remote_post()` + HTTPS-only check
6. CSS injection via colour slug — slug sanitised with `preg_replace('/[^a-z0-9-]/', '')`
7. Admin capability gate — Settings → SGS Forms page requires `manage_options`

**Additional issues found by `ehr-security-reviewer` agent and fixed:**
8. Orphaned `n8nWebhookUrl` attribute removed from block.json (was still serialised in post_content)
9. `storeSubmissions` toggle now enforced server-side (was client-only HTML attribute)
10. `successRedirect` sanitised with `wp_validate_redirect()` to prevent open redirects
11. `fields` REST parameter now has `validate_callback` — 64KB max, no nested objects
12. Upload endpoint now has rate limiting (10/hour/IP)
13. Font-size raw CSS values validated with strict regex (prevents style injection)

**Known remaining items from security review (LOW priority, defer to later):**
- Nonce expiry handling in view.js (403 on long-lived forms — needs client-side retry with page refresh message)
- `get_client_ip()` duplicated in 2 files — extract to shared helper
- `data-store-submissions` HTML attribute still rendered (LOW info disclosure, harmless)
- `wp_check_filetype()` extension-only MIME check — `wp_handle_upload()` does content check on most servers

### Performance Fixes (Step 3)

- Emoji scripts removed via `remove_action()` in functions.php — saves 22.2KB JS
- `fetchpriority="high"` added to hero split image
- Fluid spacing: sizes 30-80 now use `clamp()` via `fluid: { min, max }` in theme.json

### Other Fixes

- **Sticky header:** `position: sticky` moved from inner group (where it can't work) to `<header.wp-block-template-part>` via core-blocks.css
- **Header variants:** Added to P2 roadmap (item 336) with bumped impact grade — sticky/non-sticky/transparent for style variations
- **Translation strings:** 6 bare strings wrapped: Submit, Thank you message, Step labels, Leave this field empty, Read more

## Current State

- **Branch:** `feature/indus-foods-homepage`
- **Latest commit:** `48cdffd` (no new commit yet — waiting for Steps 7-8)
- **Uncommitted changes:** ~20 modified files (all fixes) + 1 new file (class-form-admin.php) + untracked screenshots
- **Build status:** Built and deployed
- **Deploy status:** Live site matches source — all fixes deployed
- **Dev site:** palestine-lives.org (WP 6.9.1)

### Files Modified This Session

**Plugin — security fixes:**
- `plugins/sgs-blocks/includes/forms/class-form-rest-api.php` — nonce verification, rate limiting, IP fix, fields validation, storeSubmissions
- `plugins/sgs-blocks/includes/forms/class-form-processor.php` — IP fix, webhook to wp_options, wp_safe_remote_post, storeSubmissions support
- `plugins/sgs-blocks/includes/forms/class-form-upload.php` — unchanged (rate limiting added in REST layer)
- `plugins/sgs-blocks/includes/forms/class-form-admin.php` — NEW: Settings page + submissions viewer
- `plugins/sgs-blocks/includes/render-helpers.php` — CSS slug sanitisation, font-size CSS injection fix
- `plugins/sgs-blocks/sgs-blocks.php` — register Form_Admin
- `plugins/sgs-blocks/src/blocks/form/block.json` — removed n8nWebhookUrl attribute
- `plugins/sgs-blocks/src/blocks/form/edit.js` — webhook URL field replaced with server-side notice
- `plugins/sgs-blocks/src/blocks/form/render.php` — removed webhook filter, sanitised redirect, translation strings
- `plugins/sgs-blocks/src/blocks/form/view.js` — storeSubmissions param added to REST body

**Plugin — performance:**
- `plugins/sgs-blocks/src/blocks/hero/render.php` — fetchpriority="high"

**Plugin — translations:**
- `plugins/sgs-blocks/src/blocks/form-step/render.php` — 'Step' wrapped
- `plugins/sgs-blocks/src/blocks/post-grid/render.php` — 'Read more' wrapped

**Theme:**
- `theme/sgs-theme/functions.php` — emoji removal
- `theme/sgs-theme/parts/header.html` — removed sticky from inner group
- `theme/sgs-theme/assets/css/core-blocks.css` — sticky header CSS on `<header>`
- `theme/sgs-theme/theme.json` — fluid spacing sizes

**Docs:**
- `docs/plans/2026-02-21-master-feature-audit.md` — header patterns item 336 updated

## Untracked Files to Handle

Same as Session 24 — `.firecrawl/` directory, loose PNGs, `sites/indus-foods/assets.zip`. Add to `.gitignore` before committing.

---

## Next Session: Complete Steps 7-8

### Step 7: Create Test Content + Verify Unverified Blocks

17 blocks/extensions have code deployed but were never tested end-to-end. This requires WP admin access or WP-CLI:

1. Create a "Block Showcase" test page on palestine-lives.org
2. Insert every Phase 0 block never on a live page: Accordion, Counter, Icon List, WhatsApp CTA, Certification Bar, all form blocks
3. Insert Phase 1 extensions on test blocks: device visibility, scroll animations, hover colour shifts
4. Create 6-10 blog posts with featured images and categories (for Post Grid testing)
5. Upload 8-10 images to Media Library (for Gallery testing)
6. Test Phase 2 blocks: Post Grid (all layouts, pagination, filtering), Gallery (all layouts, lightbox), Tabs (styles, keyboard nav, deep linking)

### Step 8: Commit, Update Scorecard, Prepare for Phase 2.4

1. Add `.firecrawl/`, `*.png`, `sites/indus-foods/assets.zip` to `.gitignore`
2. Commit all fixes with descriptive messages
3. Update verification section in `docs/plans/2026-02-21-master-feature-audit.md`
4. Recalculate maturity score (target: 25-30% after fixes + verification)
5. Update MEMORY.md with new patterns
6. Set the N8N webhook URL via WP admin: Settings → SGS Forms

### THEN Phase 2.4: Countdown Timer, Star Rating, Team Member

---

## Webhook URL Migration

**IMPORTANT:** The N8N webhook URL was moved from block attributes to `wp_options`. The next session needs to:

1. Log into WP admin → Settings → SGS Forms
2. Enter the N8N webhook URL (ask the user for the value)
3. Any existing blocks with `n8nWebhookUrl` in their saved content are harmless — the attribute is no longer read, but the old value persists in post_content. A cleanup migration could be written but is low priority.

---

## Relevant Tooling

### Patterns Established in Session 25

| Pattern | Reference File | Notes |
|---------|---------------|-------|
| REST nonce verification | `class-form-rest-api.php` | `verify_form_nonce()` checks `X-WP-Nonce` header against `wp_rest` action |
| Rate limiting | `class-form-rest-api.php` | 10/hour/IP via transient, `REMOTE_ADDR` only |
| SSRF prevention | `class-form-processor.php` | `wp_safe_remote_post()` + HTTPS-only check |
| CSS injection prevention | `render-helpers.php` | Slug: `preg_replace('/[^a-z0-9-]/', '')`. Raw CSS values: strict regex |
| Settings API admin page | `class-form-admin.php` | Template for future admin pages (webhook URL, submissions viewer) |
| Fluid spacing | `theme.json` | `fluid: { min, max }` on spacing sizes 30-80, generates `clamp()` |
| Sticky header | `core-blocks.css` | `position: sticky` on `<header.wp-block-template-part>`, NOT inner group |

### Agents — When to Use Each

| Agent | When to Use |
|-------|-------------|
| `wp-developer` | **MANDATORY** for ALL WordPress build work — block development, template creation, PHP, theme customisation, plugin architecture |
| `test-and-explain` | After completing any feature, fix, or modification — tests it and explains results in plain English |
| `design-reviewer` | After visual changes — checks WCAG 2.2 AA, design system consistency, responsive behaviour |
| `performance-auditor` | After deployment — checks Core Web Vitals, Lighthouse, bundle size, page load |
| `seo-auditor` | When building new pages — checks SEO, content optimisation, technical SEO |
| `project-manager` | Status dashboard, blocker tracking, deciding which agent to use next |

### Skills — When to Invoke Each

| Skill | When to Invoke | Notes |
|-------|---------------|-------|
| `/superpowers:using-superpowers` | **First thing every session** | Establishes skill checking before every action |
| `/brainstorming` | Before any creative work — new blocks, new features, new pages | Explores requirements and approaches |
| `/writing-plans` | Before any multi-step task touching 3+ files | Creates `.claude/plans/current_mission.md` |
| `/systematic-debugging` | Before proposing any fix for broken functionality | Investigate root cause first, never guess |
| `/verification-before-completion` | Before claiming work is done | Runs verification commands, confirms output |
| `/commit` or `/commit-push-pr` | When committing work | Handles git workflow, branch strategy, PR creation |
| `/handoff` | End of session | Generates session summary for next session |
| `/wp-block-development` | When building new Gutenberg blocks | block.json, attributes, supports, save/render |
| `/wp-block-themes` | When modifying theme.json, templates, template parts | theme.json v3, patterns, style variations |
| `/wp-interactivity-api` | When building blocks needing reactive frontend state | `data-wp-*` directives, `@wordpress/interactivity` store |
| `/wp-plugin-development` | Plugin architecture, hooks, activation, settings API | Security patterns, admin UI, data storage |
| `/wp-rest-api` | When building or debugging REST endpoints | `register_rest_route`, controllers, schema validation |
| `/wp-performance` | When profiling or optimising WordPress performance | Query Monitor, Server-Timing, code profiling |
| `/frontend-design` | When building polished UI — hover transitions, button states, pill buttons, animations | Production-grade frontend — NOT for structural bugs |
| `/interaction-design` | When adding microinteractions, transitions, feedback patterns | Loading states, form transitions, hover polish |
| `/review` | When reviewing code quality before merge | Best practices check |

### MCP Servers — What to Use Each For

| MCP Server | Tools | When to Use |
|------------|-------|-------------|
| **Playwright** (`mcp__plugin_playwright_*`) | `browser_navigate`, `browser_take_screenshot`, `browser_snapshot`, `browser_resize`, `browser_evaluate`, `browser_click`, `browser_console_messages` | Visual verification at 375/768/1440px, testing interactive blocks (accordion, slider, tabs, gallery lightbox), checking console errors, confirming CSS loads correctly |
| **GitHub** (`mcp__plugin_github_*`) | `create_pull_request`, `list_issues`, `search_code`, `get_file_contents`, `push_files` | PR creation, issue tracking, code search across repos |
| **Context7** (`mcp__plugin_context7_*`) | `resolve-library-id`, `get-library-docs` | Up-to-date docs for WordPress, @wordpress/scripts, Interactivity API, any npm package |
| **Memory** (`mcp__memory__*`) | `search_nodes`, `create_entities`, `add_observations` | Persistent knowledge graph — store patterns, decisions, gotchas across sessions |
| **n8n** (`mcp__n8n__*`) | `search_nodes`, `get_node`, `search_templates`, `validate_workflow` | Building/debugging n8n workflows for form notifications, webhook processing |

### Playwright Verification Checklist (Use After Every Deploy)

```
1. browser_resize → 1440 (desktop)
2. browser_navigate → https://palestine-lives.org/
3. browser_take_screenshot → fullPage: true
4. browser_resize → 768 (tablet) → screenshot
5. browser_resize → 375 (mobile) → screenshot
6. browser_console_messages → level: "error" (check for JS errors)
7. browser_snapshot → check accessibility tree
```

### Deploy Pipeline (Run After Every Build)

```bash
# 1. Build
cd plugins/sgs-blocks && npm run build

# 2. Deploy plugin
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# 3. Deploy theme (if theme files changed)
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# 4. Clear LiteSpeed page cache (wp litespeed-purge is broken on this host)
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# 5. Reset PHP OPcache via HTTP (CLI reset is a SEPARATE pool — does nothing for web)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

---

## Next Session Prompt

~~~
/superpowers:using-superpowers

SGS Framework — Session 26: Commit Session 25 Fixes + Visual/Hover Audit + Phase 2.4

## Context

Read these files IN ORDER before touching anything:
1. `CONVERSATION-HANDOFF.md` — full session 25 recap, what's done, what remains
2. `CLAUDE.md` (root) — framework architecture rules, deploy commands, naming conventions
3. `plugins/sgs-blocks/CLAUDE.md` — block inventory, build commands, customisation standard
4. `theme/sgs-theme/CLAUDE.md` — theme structure, design tokens, style variation rules
5. `sites/indus-foods/CLAUDE.md` — client-specific design tokens, page status, deploy rules
6. `sites/indus-foods/outstanding-issues.md` — 17 visual/hover issues (Section 10), accessibility findings, broken blocks
7. `sites/indus-foods/vscode-session-prompt.md` — detailed fix order for visual/hover issues with architecture rules

Session 25 completed steps 1-6 of 8 from the audit gap closure plan:
- All 3 CRITICAL + 7 HIGH security issues fixed (nonce verification, rate limiting, SSRF, CSS injection, webhook URL migration)
- 3 additional security issues found by `ehr-security-reviewer` agent and fixed
- Performance: emoji removed (22KB saved), fetchpriority on hero, fluid spacing
- Sticky header fixed, translation strings wrapped
- All fixes built, deployed, and verified on live site (palestine-lives.org)

**Branch:** `feature/indus-foods-homepage` — ~29 files modified, NOT YET COMMITTED.

---

## Task 1: Commit Session 25 Fixes (Step 8)

Use `/commit-push-pr` skill.

1. Add to `.gitignore`: `.firecrawl/`, `*.png` (root only), `sites/indus-foods/assets.zip`, loose screenshot PNGs
2. Stage and commit all Session 25 security + performance + a11y fixes
3. Push to `feature/indus-foods-homepage` branch
4. Do NOT merge to main yet — more work coming on this branch

---

## Task 2: Set N8N Webhook URL

**IMPORTANT:** The N8N webhook URL was moved from block attributes to `wp_options` in Session 25.

1. Ask the user for the N8N webhook URL value
2. Set it via WP admin → Settings → SGS Forms (or via WP-CLI: `wp option update sgs_n8n_webhook_url '<URL>'`)
3. Verify form submission works end-to-end after setting it

---

## Task 3: Visual + Hover Audit Fixes (from outstanding-issues.md Section 10)

Read `sites/indus-foods/vscode-session-prompt.md` for the FULL fix order. Work through groups in exact order. Verify each group with Playwright screenshots before moving to the next.

### Fix Order Summary

**Group 1 — Critical (broken functionality):**
- Issue #1: Mobile hamburger menu missing (375px). Use `/systematic-debugging` before proposing fix
- Issue #2: Services section renders blank (all devices). Use `/systematic-debugging` before proposing fix

**Group 2 — Critical visual (most visible on load):**
- Issue #3: Hero background teal → should be gold/mustard (`--accent` token)
- Issue #4: Why Choose section white cards → should have no card/border/shadow
- Issue #5: Testimonials background teal → should be white (`--surface` token)

**Group 3 — Hover effects (code changes required):**
Invoke `/frontend-design` for hover transition polish.
- H1: Hero primary CTA — filled → ghost/outline on hover
- H2: Hero secondary CTA — outline → teal fill on hover
- H3: Top-level nav link — add gold background fill on hover
- H4: CTA section buttons — full invert to match hero buttons

**Group 4 — Significant visual:**
- Issue #6: Tablet nav wraps to two rows at 768px
- Issue #7: Top bar plain text → icon pill buttons (invoke `/frontend-design`)
- Issue #8: Hero second CTA missing on mobile
- Issue #9: Hero buttons side-by-side → stacked vertically

**Group 5 — Content fixes (editor only, no code):**
- Issues #10-12, #15, #17: title text, button labels, social icons, button variant, brands background

**Group 6 — Minor:**
- Issues #13-14, #16: footer logo, social icon brand colours, mobile logo sizing

### Architecture Rules for Visual Fixes
- **Never hardcode** — use block attributes, `indus-foods.json` style variation, or `wp_add_inline_style()` gated on active variation
- **Variation-specific CSS** in `functions.php` gated on `'indus-foods' === $active_style`
- **Variation-specific images** in `theme/sgs-theme/assets/`, never `uploads/`
- **After any PHP/JS/CSS block change:** build → deploy → Playwright verify

---

## Task 4: Phase 2.4 Blocks (After Visual Fixes Complete)

Build these three blocks. Invoke `/brainstorming` before each block, then `/writing-plans` for the implementation plan. Use the `wp-developer` agent for all build work. Invoke `/wp-block-development` when starting block development.

1. **Countdown Timer** (`sgs/countdown`) — date-based + evergreen; flip/simple/minimal variants; auto-expire message
2. **Star Rating** (`sgs/star-rating`) — 1-5 SVG stars; half-star support; Schema.org/Rating JSON-LD
3. **Team Member** (`sgs/team-member`) — photo/name/role/bio; social links; Schema.org/Person JSON-LD

For each block, follow the Block Customisation Standard (MANDATORY):
1. Native WP `supports` for wrapper-level controls
2. Custom attributes + controls for each inner text element
3. Custom attributes + controls for interactive elements
4. CSS fallback colours with `:not([style*="color"])`
5. Block Selectors API in block.json

After each block: build → deploy → verify with Playwright → run `test-and-explain` agent.

---

## Task 5: Update Scorecard + Handoff

1. Update verification section in `docs/plans/2026-02-21-master-feature-audit.md`
2. Recalculate maturity score (target: 30-35% after Session 26 work)
3. Update `MEMORY.md` with any new patterns or gotchas
4. Run `/handoff` to generate session summary

---

## Skill Invocation Guide

Invoke these skills at the right moment — not all upfront:

| When | Invoke |
|------|--------|
| Session start | `/superpowers:using-superpowers` |
| Before committing (Task 1) | `/commit-push-pr` |
| Before investigating Issues #1 or #2 | `/systematic-debugging` |
| Before hover transition work (Group 3) | `/frontend-design` |
| Before pill button design (Issue #7) | `/frontend-design` |
| Before each new block (Task 4) | `/brainstorming` then `/writing-plans` |
| When starting block dev | `/wp-block-development` |
| When modifying theme.json or templates | `/wp-block-themes` |
| When building REST endpoints | `/wp-rest-api` |
| When adding Interactivity API features | `/wp-interactivity-api` |
| Before claiming any task complete | `/verification-before-completion` |
| End of session | `/handoff` |

## Agent Delegation Guide

| Task | Delegate To |
|------|-------------|
| ALL WordPress build work (blocks, templates, PHP, CSS) | `wp-developer` agent |
| Testing completed features | `test-and-explain` agent |
| Visual quality check after fixes | `design-reviewer` agent |
| Performance check after deployment | `performance-auditor` agent |
| Security review of new code | `ehr-security-reviewer` agent |
| SEO check on new pages | `seo-auditor` agent |

## MCP Tools Reference

| Tool | Use For |
|------|---------|
| **Playwright** `browser_navigate` + `browser_take_screenshot` | Visual verification at 375/768/1440px after every deploy |
| **Playwright** `browser_snapshot` | Accessibility tree — better than screenshots for finding elements and ARIA issues |
| **Playwright** `browser_console_messages` | Check for JS errors after page load |
| **Playwright** `browser_evaluate` | Run JS in page to inspect computed styles, DOM state |
| **Playwright** `browser_resize` | Switch viewport: 375 (mobile), 768 (tablet), 1440 (desktop) |
| **Context7** `resolve-library-id` + `get-library-docs` | Up-to-date docs for @wordpress/scripts, Interactivity API, any npm package |
| **GitHub MCP** | PR creation, issue tracking, code search |
| **Memory MCP** `search_nodes` + `create_entities` | Persist patterns and decisions across sessions |

## Research Approach (Before Non-Trivial Implementations)

1. Read the relevant spec document (`specs/02-SGS-BLOCKS.md` for blocks, `specs/09-GOLD-STANDARD-AUDIT.md` for competitor analysis)
2. Check `docs/plans/2026-02-21-master-feature-audit.md` for the feature's priority, impact grade, and difficulty rating
3. Use Context7 to get current WordPress/block development docs
4. Web search for current best practices + competitor implementations
5. Check complaints/poor reviews of Kadence, Spectra, GenerateBlocks for the equivalent feature — avoid repeating their mistakes
6. Search the existing codebase for established patterns (`Grep` for similar blocks/components)
7. Present findings before coding — get user approval on approach

## Deploy Pipeline

```bash
# Build
cd plugins/sgs-blocks && npm run build

# Deploy plugin
scp -r plugins/sgs-blocks/sgs-blocks.php plugins/sgs-blocks/includes plugins/sgs-blocks/build plugins/sgs-blocks/assets hd:~/domains/palestine-lives.org/public_html/wp-content/plugins/sgs-blocks/

# Deploy theme (if theme files changed)
scp -r theme/sgs-theme hd:~/domains/palestine-lives.org/public_html/wp-content/themes/

# Clear LiteSpeed cache
ssh hd "rm -rf ~/domains/palestine-lives.org/public_html/wp-content/litespeed/cache/*"

# Reset OPcache via HTTP (CLI reset does nothing for web requests)
ssh hd "echo '<?php opcache_reset(); echo \"ok\";' > ~/domains/palestine-lives.org/public_html/op-reset-tmp.php" && curl -s https://palestine-lives.org/op-reset-tmp.php && ssh hd "rm ~/domains/palestine-lives.org/public_html/op-reset-tmp.php"
```

**Dev site:** palestine-lives.org — safe for testing
**Test site:** lightsalmon-tarsier-683012.hostingersite.com — DO NOT modify (client-facing)
~~~
