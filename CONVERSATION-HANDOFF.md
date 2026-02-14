# Session Handoff — 2026-02-14 (Session 12 — Accordion + Review Schema + ToC)

## Completed This Session

1. **Committed and deployed accordion blocks with FAQ Schema** — Accordion (3 styles: bordered/flush/card, single/multi-open, default-open item, FAQ Schema JSON-LD toggle) and Accordion Item (parent-constrained, context-inherited styling, progressive enhancement via `<details>/<summary>`). Commit `6c01146`.

2. **Committed and deployed custom SVG icons for all 32 blocks** — Every SGS block now has a distinct teal (#0F7E80) SVG icon in the block inserter. Block categories renamed to "SGS — Layout/Content/Interactive/Forms". Included in commit `6c01146`.

3. **Added Review Schema to testimonial block** — `render_block` PHP filter injects `schema.org/Review` JSON-LD when `reviewSource` attribute is set. Only externally sourced reviews (Google Reviews, LinkedIn, Trustpilot) get schema — hand-written testimonials are excluded. Two new attributes: `reviewSource`, `reviewDate`. No save.js changes, no deprecation needed. Commit `76cb362`.

4. **Built and deployed Table of Contents block** — Dynamic block with server-side heading detection. Parses post content for H2-H6 tags, builds navigable nested list with auto-generated anchor IDs. Features: smooth scroll with configurable offset, IntersectionObserver scroll spy, collapsible via `<details>/<summary>`, three visual styles (card/minimal/flush), heading level toggles, `sgs-toc-ignore` class exclusion. Also created `heading-anchors.php` filter to inject `id` attributes on core/heading blocks that lack them (only when a ToC block is present on the page). Commit `3761ac0`.

5. **Wrote implementation plan** — `docs/plans/2026-02-14-accordion-deploy-review-schema-toc.md`

## Current State

- **SGS Theme Phase 1a LIVE** on palestine-lives.org (WP 6.9.1)
- **SGS Blocks** — 32 blocks registered and deployed (16 original + 13 form blocks + accordion + accordion-item + table-of-contents)
- **SGS Forms** — fully operational (13 blocks, REST API, DB table, multi-step navigation)
- **All blocks have custom teal SVG icons** in the inserter
- **Git:** 22 commits on `main`, latest `3761ac0`. All code committed and deployed.
- **No remote repository** — local git only

## Known Issues / Blockers

1. **No browser testing done this session** — Accordion, ToC, and Review Schema deployed but not tested in the editor or frontend. Need manual verification.
2. **ToC heading detection uses regex** — Works for standard heading blocks but may miss headings deeply nested in custom block HTML. `DOMDocument` parsing would be more robust but adds complexity.
3. **Review Schema `itemReviewed` defaults to site name as LocalBusiness** — May need per-page configuration for multi-service sites.
4. **No end-to-end form submission test** — REST endpoints respond but no actual form submission tested.
5. **Firefox 136+ claim** in `specs/02-SGS-BLOCKS.md` line 1034 should be 136+ (not 135+). Minor.

## Next Priorities (in order)

1. **Manual testing of new blocks** — Verify accordion (expand/collapse, FAQ Schema in page source), ToC (scroll spy, smooth scroll, heading detection, anchor IDs), Review Schema (JSON-LD output when reviewSource is set vs not set).
2. **Build Indus Foods pages** — Homepage, Trade Application (4-step form), Food Service (template for all service pages). Reference `sites/indus-foods/CLAUDE.md`.
3. **Build Post Grid / Query Loop block** — highest-priority missing block type (all 4 competitors have it).
4. **Build Image Gallery with lightbox** — third-highest missing block type (3 of 4 competitors have it).
5. **Build remaining blocks** — Tabs, Pricing Table, Modal, SVG Background, Announcement Bar (from spec).

## Files Modified This Session

**Created:**
- `plugins/sgs-blocks/src/blocks/accordion/` (8 files: block.json, index.js, edit.js, save.js, render.php, view.js, style.css, editor.css)
- `plugins/sgs-blocks/src/blocks/accordion-item/` (4 files: block.json, index.js, edit.js, render.php)
- `plugins/sgs-blocks/src/blocks/table-of-contents/` (7 files: block.json, index.js, edit.js, render.php, view.js, style.css, editor.css)
- `plugins/sgs-blocks/includes/review-schema.php`
- `plugins/sgs-blocks/includes/heading-anchors.php`
- `plugins/sgs-blocks/src/utils/icons.js` (custom SVG icons for all blocks)
- `docs/plans/2026-02-14-accordion-deploy-review-schema-toc.md`

**Modified:**
- `plugins/sgs-blocks/src/blocks/testimonial/block.json` (added reviewSource, reviewDate attributes)
- `plugins/sgs-blocks/src/blocks/testimonial/edit.js` (added Review Source panel with TextControl)
- `plugins/sgs-blocks/src/utils/icons.js` (added tableOfContentsIcon)
- `plugins/sgs-blocks/sgs-blocks.php` (added requires for review-schema.php, heading-anchors.php)
- `plugins/sgs-blocks/includes/block-categories.php` (renamed to "SGS — Layout/Content/Interactive/Forms")
- `plugins/sgs-blocks/src/blocks/*/index.js` (30+ files — imported custom SVG icons)

## Notes for Next Session

- **Review Schema is gated by `reviewSource`** — hand-written testimonials get no schema (correct). Only testimonials with a source platform set (e.g. "Google Reviews") output JSON-LD. This was a deliberate design decision because Google penalises self-serving review markup.
- **Accordion blocks were written in a previous session** but never committed or built. This session committed, built, and deployed them.
- **The `heading-anchors.php` filter only runs when `has_block('sgs/table-of-contents')` returns true** — it won't inject anchor IDs on pages without a ToC block.
- **The ToC `render.php` and `heading-anchors.php` both generate slugs independently** — they use the same deduplication logic (`sanitize_title` + counter suffix) but maintain separate `$used_slugs` arrays. This could theoretically cause mismatches on pages with duplicate heading text. Worth monitoring during testing.
- **Gold Standard Audit** (`specs/09-GOLD-STANDARD-AUDIT.md`) is verified with live competitor data. It identifies remaining block gaps and competitive positioning.

## Relevant Tooling for Next Tasks

### Commands
- `/handoff` — generate session handoff
- `/deploy-check` — pre-deployment checklist
- `/commit` — create git commit

### Skills
- `/superpowers:using-superpowers` — start every session
- `/superpowers:brainstorming` — explore page composition before building Indus Foods pages
- `/superpowers:verification-before-completion` — verify blocks work before claiming done
- `wp-block-development` — for building Post Grid, Image Gallery, Tabs blocks
- `wp-interactivity-api` — for multi-step form behaviour on Indus Foods trade application
- `wp-block-themes` — for theme.json template work on Indus Foods pages

### Agents
- `test-and-explain` — test deployed blocks and explain results in plain English
- `wp-developer` — WordPress development specialist
- `performance-auditor` — check Core Web Vitals after deploying Indus Foods pages

### MCP Servers
- **Context7** — WordPress block development docs
- **Firecrawl** — web research, competitor page scraping
- **Playwright** — browser testing for manual verification of new blocks

## Next Session Prompt

```
/superpowers:using-superpowers

SGS Blocks has 32 deployed blocks on palestine-lives.org (WP 6.9.1), including 3 new blocks from this session: Accordion (with FAQ Schema), Table of Contents (with scroll spy), and Review Schema on Testimonials. All blocks have custom teal SVG icons. Nothing has been browser-tested yet.

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

1. **Test the new blocks** — Use `test-and-explain` agent or Playwright to verify: (a) Accordion expand/collapse animation works, FAQ Schema JSON-LD appears in page source when toggle is on, (b) Table of Contents detects headings, generates anchor links, smooth scroll works, scroll spy highlights active heading, (c) Review Schema outputs JSON-LD only when reviewSource is set on a testimonial. Use `/superpowers:verification-before-completion` before moving on.

2. **Build Indus Foods pages** — Read `sites/indus-foods/CLAUDE.md` for the full brief. Start with the Trade Application page (4-step form using deployed SGS Form blocks). Use `/superpowers:brainstorming` to plan page composition before building. Invoke `wp-interactivity-api` for form step navigation. Invoke `wp-block-themes` for template work.

3. **Build Post Grid / Query Loop block** — All 4 competitors have this. Use `/superpowers:brainstorming` to design it, then `wp-block-development` to build. Research how Kadence and Spectra implement theirs first (use Firecrawl).

IMPORTANT: The test site (lightsalmon-tarsier-683012.hostingersite.com) is client-facing — DO NOT deploy there. Use palestine-lives.org only.
```
