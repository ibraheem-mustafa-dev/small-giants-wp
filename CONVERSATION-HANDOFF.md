---
doc_type: handoff
project: small-giants-wp
last_updated: 2026-04-28
session_date: 2026-04-28 (Phase 3.2 + hover gaps + Floating UI Customiser)
recommended_model: sonnet
session_tag: small-giants-wp-2026-04-28-framework-close
---

# Session Handoff — 2026-04-28

## Completed This Session

1. **Phase 3.2 Global Defaults System** — `Block_Defaults` PHP class (REST endpoint, option storage, editor injection, admin page at Settings → SGS Block Defaults), `block-defaults.js` extension adds "Save as Default" button to every SGS block's Advanced inspector panel. Verified end-to-end: save → option persists → admin shows it → editor reload injects defaults via `blocks.registerBlockType` filter.
2. **4 hover variant gap fixes** — `border-accent` lifted from per-block to universal hover-effects extension; `tilt-3d` mouse-tracking JS hover (`assets/js/tilt-3d.js`); `overlay-slide` named hoverEffect on Card Grid + Gallery; `sgsScrollProgress` CSS variable extension (`assets/js/scroll-progress.js`) exposes `--sgs-scroll-progress`, `--sgs-scroll-y`, `--sgs-scroll-direction` on documentElement.
3. **Animation extension** expanded 11 → 16 types — added `bounce-in` (cubic-bezier overshoot) and `reveal-up` (clip-path wipe); synced `ANIMATION_LABELS` with `AnimationControl.js`.
4. **Universal hover defaults** — sensible defaults across all SGS blocks (scale 1.02, shadow medium, image zoom on, duration 250ms). 26 blocks opted out (announcement-bar, breadcrumbs, all form-fields, container, mega-menu) where lift/scale would feel wrong. PHP layer updated so existing blocks pick up defaults without re-save.
5. **8 audit-driven quality fixes** — form box-sizing border-box (38px overflow gone), floating-label vs placeholder overlap fix, footer social icons regression (new `social-icons-footer` style variation matching lightsalmon), Google Reviews dummy fallback, Icon Block content-width + visible bg, Breadcrumbs contrast (5.12:1 → 7.46:1), Pricing Table `toggleStyle` attribute, Modal block save() bug fix.
6. **Palette token system** — added `border-light` (`#E5E7EB`) and `error` (`#DC2626`) slugs to theme.json + all 7 style variations; corrected 4 stale fallback hexes (gallery, cta-section, mega-menu).
7. **SGS Floating UI Customiser** — `Appearance → Customise → SGS Floating UI` with 16 settings across Back to Top + Reading Progress sub-panels, live preview, post-meta override `_sgs_hide_floating_ui`. Old `sgs/back-to-top` block neutered to no-op with editor deprecation notice.
8. **Documentation** — `ARCHITECTURE.md` decisions list grew to 15 entries (added Floating UI, Block Defaults, palette-token mandate); `specs/02-SGS-BLOCKS.md` got as-built status header, expanded animation list, full universal-hover-attribute list, new Block Defaults + Floating UI sections.
9. **Indus Foods (Phase 4) extracted** — to `sites/indus-foods/.claude/plans/current_mission.md` with Phase 1–5 numbering. Phase 1 = pre-flight audit reconciling stale `outstanding-issues.md` against current live state (today's framework work likely auto-resolved several items).
10. **Race-condition recovery** — parallel agents on `hover-effects.php` left an orphan `}` on line 238 that took the live site down briefly; PHP lint + targeted edit + redeploy recovered. Lesson captured to memory.

## Current State

- **Branch:** main at 9665524
- **Tests:** No unit suite — verification via Playwright + 12/12 deterministic harness on `/block-test/`
- **Build:** Passes (webpack compiled successfully, zero warnings)
- **Uncommitted changes:** `.scratch/` + `audit-folder-1-2026-04-29.md` + `audit-folder-2-2026-04-29.md` (working files, intentionally excluded)
- **Live deploy:** `https://palestine-lives.org` — Phase 3.2 + all gap fixes + Floating UI Customiser shipped, no PHP errors in `~/.logs/error_log_palestine-lives_org`
- **Plugin version:** sgs-blocks 0.1.1
- **Framework completion plan:** still active at `docs/plans/2026-02-21-framework-completion-plan.md` — Bean wants to close + archive AFTER 5.1 ships next session, NOT before

## Known Issues / Blockers

- **`outstanding-issues.md` is stale** — written before today. Many items (hover mismatches, form bugs, footer social icons, breadcrumbs contrast, Pricing Table toggle, palette drift) likely auto-fixed by today's framework work. Indus Foods plan Phase 1 is the reconcile pass.
- **Decorative Image `imageAlt` rendering bug** — alt attr empty even when set. Minor, separate from this session's scope.
- **3 framework gaps still open:** Phase 5.1 Conditional Visibility (role/login/schedule), `sgsParallax` universal extension, framework-wide QC.

## Next Priorities (in order)

1. **Phase 5.1 Conditional Visibility extension** — extend the visibility extension with server-side `render_block` filter for non-CSS conditions: user logged in/out, user role, date range, days of week, URL param contains, referrer contains. Zero frontend cost.
2. **`sgsParallax` universal extension** — `background` (background-attachment fixed with reduced-motion respect) + `element` (scroll-translate) variants. CSS Scroll-Driven Animations where supported, IntersectionObserver + rAF fallback otherwise.
3. **Framework-wide QC sweep + close framework plan** — visual QA on `/block-test/`, deploy verification, mark `2026-02-21-framework-completion-plan.md` complete, move to `docs/plans/archive/`.
4. **Update Indus Foods page-build status table** in `sites/indus-foods/CLAUDE.md` after Phase 1 audit reconciles outstanding-issues.

## Files Modified

| File path | What changed |
|---|---|
| `ARCHITECTURE.md` | Date 2026-03-29 → 2026-04-28, block count 58 → 57, decisions #13 Floating UI / #14 Block Defaults / #15 palette tokens added; Current Development Focus rewritten |
| `specs/02-SGS-BLOCKS.md` | As-built status, animation list (16 types), universal hover attribute list, Block Defaults + Floating UI sections |
| `plugins/sgs-blocks/includes/class-block-defaults.php` | NEW — REST endpoint + option storage + admin page |
| `plugins/sgs-blocks/includes/class-sgs-blocks.php` | Register Block_Defaults + style variations + Floating UI hooks |
| `plugins/sgs-blocks/includes/hover-effects.php` | Server-side wrapper class injection for new attrs; orphan `}` bug fixed |
| `plugins/sgs-blocks/src/blocks/extensions/{hover-effects,animation,block-defaults}.js` | New attrs + ToggleControls + animation labels + save-as-default flow |
| `plugins/sgs-blocks/src/blocks/{card-grid,gallery}/{block.json,edit.js,render.php,style.css}` | overlay-slide hoverEffect variant |
| `plugins/sgs-blocks/src/blocks/icon/{block.json,edit.js,render.php,style.css}` | Content-width alignment + visible default bg |
| `plugins/sgs-blocks/src/blocks/pricing-table/{block.json,edit.js,render.php,style.css}` | toggleStyle attribute (text/button), font size match |
| `plugins/sgs-blocks/src/blocks/{back-to-top,reading-progress}/{render.php,edit.js}` | Neutered to no-op with editor deprecation notice |
| `plugins/sgs-blocks/src/blocks/google-reviews/render.php` | 3 dummy reviews when no API key |
| `plugins/sgs-blocks/src/blocks/breadcrumbs/style.css` | text-muted token (7.46:1 contrast) |
| `plugins/sgs-blocks/src/blocks/social-icons/style.css` | New is-style-social-icons-footer variation |
| `plugins/sgs-blocks/src/blocks/form/style.css` | Universal box-sizing border-box + placeholder hide when label down |
| `plugins/sgs-blocks/src/blocks/modal/index.js` | save() function + deprecation |
| `plugins/sgs-blocks/assets/js/{tilt-3d,scroll-progress}.js` | NEW — universal extension scripts |
| `plugins/sgs-blocks/assets/css/extensions.css` | border-accent + tilt-3d + scroll-progress base styles |
| `theme/sgs-theme/inc/floating-ui-{customiser,output}.php` | NEW — Customiser registration + wp_footer renderer |
| `theme/sgs-theme/assets/{js,css}/{back-to-top,reading-progress,customiser-preview}.*` | NEW — Floating UI assets |
| `theme/sgs-theme/functions.php` | Require floating-ui-customiser + floating-ui-output |
| `theme/sgs-theme/theme.json` + `styles/*.json` (×7) | Added border-light + error palette slugs |
| `sites/indus-foods/.claude/plans/current_mission.md` | Phase 1–5 plan extracted from framework completion plan (Phase 1 = pre-flight audit) |
| `~/.claude/projects/.../memory/` | New entries: feedback_palette_defaults_for_blocks, feedback_parallel_dispatch_shared_files, project_floating_ui_architecture |

## Notes for Next Session

- **Don't archive `2026-02-21-framework-completion-plan.md` yet** — Bean wants to mark it complete and move to `docs/plans/archive/` only after Phase 5.1 + sgsParallax + QC ship next session.
- **WP-Customiser live preview is wired via postMessage transport** — JS at `theme/sgs-theme/assets/js/customiser-preview.js`. When adding new Floating UI controls, follow the pattern: `wp.customize('setting_id', value => …)` mutating CSS variables / classes directly on the floating UI containers.
- **Gemini Flash on Windows can't run shell commands** — every branch's `npm run build` returned "File not found". Don't include build steps in Gemini Flash prompts; run manually after.
- **Parallel agents on shared files = race condition** — branches editing `hover-effects.js` + `hover-effects.php` + `extensions.css` simultaneously left an orphan `}` that took the site down. Sequentialise or scope each branch to a different file. See `feedback_parallel_dispatch_shared_files.md`.
- **WP REST routes can't have forward slashes in route parameters** — `/defaults/sgs/counter` won't match `/defaults/(?P<block>[a-z0-9\-\/]+)`. Pass dynamic IDs in request body.
- **Hostinger live error log lives at `~/.logs/error_log_<domain>`**, not `wp-content/debug.log` (often months stale).

## Next Session Prompt

~~~
You are a senior WordPress block developer specialising in the SGS Framework, theme.json v3, and Gutenberg block extensions. Your focus this session is closing out the SGS Framework Completion Plan: Phase 5.1 Conditional Visibility extension, sgsParallax universal extension, then framework-wide QC and archival.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-04-28-framework-close"

## Where You Are

Plan: `docs/plans/2026-02-21-framework-completion-plan.md` (still active, NOT yet archived per Bean's instruction)
Current phase: Phase 5.1 Conditional Visibility (only outstanding work besides sgsParallax + QC)
Progress: ~95% complete — Phase 0–3 done, Phase 4 (Indus Foods) extracted, Phase 5.2/5.3/5.4 done
Next task: Build Conditional Visibility extension (server-side render_block filter for role/login/schedule)

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS — architecture for Conditional Visibility (which conditions to expose, how to compose, SEO indexability impact) |
| `/gap-analysis` | ALWAYS — grade Phase 5.1 + sgsParallax outputs before declaring complete |
| `/lifecycle` | ALWAYS — start pipeline before any extension changes |
| `/research` | ALWAYS — auto-routes; for 5.1 confirm Block Visibility plugin patterns + Kadence/Spectra conditional logic UX |
| `/strategic-plan` | ALWAYS — sequence Phase 5.1 (extend visibility extension first, then UI controls) |
| `/sgs-wp-engine` | Any SGS work — framework standards, gotchas, deploy sequence |
| `/wp-block-development` | Visibility extension JS edits, attribute additions |
| `/wp-rest-api` | If Conditional Visibility needs a REST helper for "current user role" checks in editor preview |
| `/visual-qa` | Final framework-wide QC pass on `/block-test/` |
| `/research-check --tier extended` | Multi-angle compare Block Visibility plugin + Kadence Pro Conditional Display + GenerateBlocks visibility |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` | Visual QA on `/block-test/`, verify Customiser live preview still works after extension additions |
| `github` | PR creation if 5.1 work goes on a feature branch (recommend yes — bigger change) |
| `/library-docs` | WP `render_block` filter API + `WP_HTML_Tag_Processor` for class injection |
| `search.py` | Web research on Block Visibility / Kadence conditional display UX patterns |
| `wp-blockmarkup` MCP | Validate new attribute schema in visibility extension |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Phase 5.1 implementation + sgsParallax build |
| `design-reviewer` | Visual QC of Customiser preview behaviour after changes land |
| `site-reviewer` | Framework-wide audit before closing the completion plan |
| `research-pipeline` | Conditional visibility competitor research before locking the design |

## Research Approach

1. `/research-check` — quick lookup of WordPress Block Visibility plugin's condition options (free version)
2. `/research-check --tier extended` — multi-angle compare to Kadence Pro Conditional Display + GenerateBlocks Pro Visibility
3. `python ~/.claude/hooks/search.py "wordpress block visibility plugin conditional display role schedule 2026"`
4. `/library-docs` for `render_block` filter signature + `current_user_can` + `wp_get_current_user` server-side patterns

---

## Task 1: Phase 5.1 — Conditional Visibility Extension

Extend `plugins/sgs-blocks/src/blocks/extensions/responsive-visibility.js` (or split into `conditional-visibility.js` if cleaner) with conditions beyond device:
- `sgsConditionLoggedIn` — none / logged-in / logged-out
- `sgsConditionUserRole` — array of role slugs (admin/editor/author/subscriber/contributor/custom)
- `sgsConditionDateStart` / `sgsConditionDateEnd` — ISO date strings, render only inside this range
- `sgsConditionDays` — array of weekday integers (0=Sunday) for "Tuesdays/Thursdays only" rules
- `sgsConditionUrlParam` — string "key=value", show only when URL has this query param
- `sgsConditionReferrer` — substring match against HTTP_REFERER

Server-side: WP `render_block` filter that bails (returns empty string) when any condition fails. ZERO frontend cost.

Editor: Inspector panel "Visibility Conditions" with controls per attribute. Editor preview should NOT bail — show a Notice "This block is conditionally hidden on the frontend (logged-in only)" so authors can still edit.

Use `/wp-block-development` and `wp-sgs-developer` agent. Validate via `/gap-analysis` before deploy.

## Task 2: sgsParallax Universal Extension

Add a parallax extension to `plugins/sgs-blocks/src/blocks/extensions/`:
- `sgsParallax` — none / background / element
- `sgsParallaxStrength` — number 0–100 (default 30)

CSS Scroll-Driven Animations (`animation-timeline: scroll()`) where supported (Chrome 115+, Firefox 135+); IntersectionObserver + requestAnimationFrame fallback at `assets/js/parallax.js` for older browsers. Background variant uses `background-attachment: fixed` with reduced-motion respect. Element variant translates the block on scroll.

Use `/wp-block-development`, `/wp-interactivity-api` if needed for element parallax.

## Task 3: Framework-Wide QC + Close Framework Plan

After 5.1 + sgsParallax ship and pass /gap-analysis:
1. Run `/visual-qa` 8-layer pipeline on `/block-test/` — confirm no regressions from today's race-condition recovery
2. Lighthouse on the test page (Performance / Accessibility / Best Practices / SEO)
3. If all green: mark `docs/plans/2026-02-21-framework-completion-plan.md` complete with closure note + final stats (block count, attribute count, animation types, hover variants)
4. Move to `docs/plans/archive/2026-02-21-framework-completion-plan-complete.md`
5. Then start a new framework plan if Bean wants — confirm with him first

## Guardrails

- Build verification: `cd plugins/sgs-blocks && npm run build` — must pass with zero warnings
- Verification harness on `/block-test/` must remain green
- All colour values use palette tokens — zero new bare hex (per `feedback_palette_defaults_for_blocks.md`)
- WCAG 2.2 AA on all visual changes (4.5:1 text contrast, 44px touch targets, focus rings)
- UK English throughout
- DO NOT dispatch parallel agents on the same file — sequentialise or scope each to its own file (per `feedback_parallel_dispatch_shared_files.md`)
- DO NOT modify post_content via WP-CLI — use REST API or Gutenberg JS data API
- DO NOT archive `2026-02-21-framework-completion-plan.md` until 5.1 + sgsParallax + QC are all done

WP credentials: Blub admin user, password `BlubAuto123!`, app password `zVQnIGUwsYL6fPr7mjOFUZpD`. Full record at `C:/Users/Bean/.openclaw/.secrets/credentials.yaml` under `wordpress.palestine_lives`.
~~~
