# Session Handoff — Research Sessions (Spec Expansion)

## Completed This Session

1. **Deep Firecrawl research** — scraped and stored competitor research on:
   - Elfsight Google Reviews features (layouts, filters, templates, customisation options)
   - Google Places API (New) documentation (endpoints, authentication, field masks, pricing)
   - HelloBar notification bars and WordPress notification bar plugin roundup (feature comparison)
   - WordPress Developer Blog mega menu tutorial (block-based mega menu architecture using template parts)

2. **Read and analysed existing `specs/02-SGS-BLOCKS.md`** — identified insertion points and current stub content for blocks 18-22.

3. **Wrote enhanced Announcement Bar spec (#18)** — expanded from a one-line stub into a full spec covering:
   - 3 variants: standard, countdown, rotating
   - 25+ attributes (scheduling, dismissal behaviour, countdown, rotation, styling)
   - Interactivity API integration (`data-wp-interactive` directives for dismiss/countdown/rotation)
   - Dynamic `render.php` for server-side date-range checking
   - Zero-CLS approach (CSS `min-height` reservation)
   - Competitive positioning vs HelloBar ($29/month), OptinMonster (3rd-party account), Elementor (popup workaround)

4. **Wrote Google Reviews block spec (#23)** — new spec covering:
   - 6 display variants: grid, slider, list, badge, floating-badge, wall
   - 30+ attributes (filtering, sorting, display toggles, styling, slider controls)
   - Google Places API (New) integration (server-side fetching, transient caching, encrypted API key storage)
   - Settings page for API key + Place ID + cache TTL + connection test
   - Schema.org JSON-LD markup for SEO rich snippets
   - Competitive positioning vs Elfsight ($5-18/month per widget), no Elementor native equivalent

5. **Wrote Mega Menu block spec (#24)** — new spec covering:
   - Template-part-based architecture (following WordPress Developer Blog tutorial pattern)
   - Custom template part area registration via `default_wp_template_part_areas` hook
   - Full Interactivity API store with hover/click/keyboard actions
   - Complete ARIA roles and keyboard navigation (menubar pattern)
   - Mobile accordion fallback with hamburger toggle
   - Example `render.php` output markup with all `data-wp-*` directives
   - Example `view.js` Interactivity store code
   - Competitive positioning vs Max Mega Menu (WCAG failures), JetMenu (heavy), Elementor Pro ($59-399/yr)

6. **Wrote Decorative Image / Sticker block spec (#25)** — new spec covering:
   - Absolute-positioned decorative images with percentage-based offsets
   - Per-breakpoint responsive overrides (position, size, rotation, visibility)
   - Optional parallax via `IntersectionObserver` + `requestAnimationFrame` (< 1KB JS)
   - Output: single `<img>` element with inline positioning styles
   - `aria-hidden="true"` + `role="presentation"` + empty `alt` for full WCAG compliance
   - Use case: Indus Foods homepage scattered food photography

7. **Wrote Enhanced Animation & Interactivity extension spec** — expanded from a 5-line stub into a comprehensive spec covering:
   - **Entrance animations** (15 types): fade-up, slide-left, scale-in, rotate-in, blur-in, etc. with stagger support
   - **Hover animations** (7 types): lift, scale, glow, tilt-3d, border-accent, shadow-grow, colour-shift
   - **Scroll-linked effects**: CSS Scroll-Driven Animations (progressive enhancement) + JS fallback, `--sgs-scroll-progress` custom property
   - **General page effects**: floating/bobbing CSS keyframes, scroll-snap, section colour transitions
   - Reduced motion handling (non-negotiable `prefers-reduced-motion` overrides)
   - Performance budget: < 10KB CSS + < 4KB JS worst case
   - Competitive context vs Elementor Pro (40+ animations), Motion.page, Kadence Pro

8. **Expanded stubs for blocks 19-22** — SVG Background, Pricing Table, Modal, Icon List now have proper attribute definitions and render approach specified (previously one-line stubs).

9. **Updated plugin directory structure** in spec to include new blocks: google-reviews, mega-menu, decorative-image.

## Current State

- **`specs/02-SGS-BLOCKS.md`** — expanded by +639 lines. Contains full specs for all 25 blocks + enhanced animation/interactivity extension. Uncommitted.
- **Research files** stored in `.firecrawl/competitor-research/`:
  - `elfsight-google-reviews-features.md` — raw scrape of Elfsight features page
  - `google-places-api-overview.md` — raw scrape of Google Places API (New) docs
  - `hellobar-notification-bars.md` — raw scrape of HelloBar competitor roundup
  - `wp-dev-mega-menu.md` — raw scrape of WordPress Developer Blog mega menu tutorial
- **`specs/RESEARCH-PROMPT.md`** — the full research prompt document. Uncommitted.
- **All changes are uncommitted** — these are spec/doc changes only, no code.

## Key Decisions Made

1. **Announcement Bar uses Interactivity API** — not plain JS. The countdown, rotation, and dismissal are all driven by `data-wp-interactive` directives with a proper store. This aligns with the mega menu and other interactive blocks.
2. **Google Reviews uses server-side API calls only** — API key never exposed to frontend. Reviews cached as WordPress transients with configurable TTL. Fallback: show stale cache if API fails.
3. **Mega Menu uses template parts** — each dropdown panel is a template part created in the Site Editor. This is the approach recommended by the WordPress Developer Blog and gives site editors full block-editor control over dropdown content.
4. **Decorative Image is a separate block, not an extension** — it could have been an "overlay" feature on Container, but a dedicated block is cleaner, more reusable, and lets users place multiple decorative images per section.
5. **Animation extension uses CSS Scroll-Driven Animations** — progressive enhancement. Chrome 115+ and Firefox 135+ get native CSS animations. Older browsers get a JS fallback via IntersectionObserver.
6. **3D tilt is the only hover effect needing JS** — all other hover effects are pure CSS `:hover` transitions. Tilt JS is < 1KB and loaded only when that specific effect is used.

## What Was NOT Completed

The following items from the research prompt (`specs/RESEARCH-PROMPT.md`) were **not addressed** in this session:

1. **SGS Pop-ups Plugin (`sgs-popups`)** — no spec written. Research prompt has full requirements but needs competitive research + spec.
2. **SGS Chatbot Plugin (`sgs-chatbot`)** — no spec written. Marked as late-stage in the prompt.
3. **Gold Standard Audit (item 6)** — no comparison tables created. This is the per-block audit against Kadence/Spectra/Elementor/GenerateBlocks.
4. **Cross-cutting concerns audit** — global defaults, copy/paste styles, responsive preview, pattern library, import/export, role-based visibility, custom CSS per block — none audited.
5. **Booking spec changes** — `specs/03-SGS-BOOKING.md` has a major rewrite (+928/-481) that was also done in a parallel session. Uncommitted.

## Files Modified

All paths relative to `c:\Users\Bean\Projects\small-giants-wp\`:

**Modified (uncommitted):**
- `specs/02-SGS-BLOCKS.md` — +639 lines (announcement bar, Google Reviews, mega menu, decorative image, animation extension, stubs for 19-22)
- `specs/03-SGS-BOOKING.md` — major rewrite (+928/-481 lines)
- `CLAUDE.md` — framework instruction updates
- `plugins/sgs-blocks/CLAUDE.md` — blocks plugin instruction updates
- `plugins/sgs-booking/CLAUDE.md` — booking plugin instruction rewrite
- `plugins/sgs-client-notes/CLAUDE.md` — client notes instruction updates
- `sites/indus-foods/CLAUDE.md` — Indus Foods instruction updates
- `theme/sgs-theme/CLAUDE.md` — theme instruction updates

**Created (untracked):**
- `.firecrawl/competitor-research/elfsight-google-reviews-features.md`
- `.firecrawl/competitor-research/google-places-api-overview.md`
- `.firecrawl/competitor-research/hellobar-notification-bars.md`
- `.firecrawl/competitor-research/wp-dev-mega-menu.md`
- `specs/RESEARCH-PROMPT.md` — the full deep research prompt for remaining items

## Notes for Next Session

- **The research prompt is only partially complete.** Items 1 (pop-ups), 5 (chatbot), and 6 (gold standard audit) from `specs/RESEARCH-PROMPT.md` still need doing. These can be a separate research session.
- **Spec formatting matches existing style** — all new specs follow the same heading structure, attribute tables, render approach, responsive/accessibility/performance sections as blocks 1-17.
- **Google Reviews needs a settings page** — this is the first block that requires plugin-level admin settings (API key, Place ID). The settings page pattern will need establishing. The booking plugin will need the same pattern for Stripe keys.
- **Mega menu has the most complex Interactivity API usage** — the spec includes full example markup and store code. The WordPress Developer Blog tutorial (`wp-dev-mega-menu.md` research file) is the reference implementation.
- **Announcement bar scheduling** — the server-side date check in `render.php` means the bar truly disappears outside its scheduled range, not just hidden by JS. This prevents flash-of-content issues.
- **All new block specs beat Elementor on the 4 core advantages** — performance (< 100KB budget), native block editor (no vendor lock-in), zero per-site licensing, clean semantic markup. Each spec has an explicit "Competitive edge over Elementor" note.

## Relevant Tooling for Next Tasks

### Commands
- `/handoff` — generate session handoff
- `/commit` — commit the uncommitted spec changes

### Skills
- `/superpowers:using-superpowers` — start every session
- `/superpowers:brainstorming` — if continuing pop-ups or chatbot research
- `wp-block-development` — for building any of the newly specced blocks
- `wp-rest-api` — for Google Reviews API endpoints
- `wp-interactivity-api` — for announcement bar, mega menu, decorative image parallax
- `wp-plugin-development` — for pop-ups plugin spec if continuing research
- `writing-clearly-and-concisely` — for spec prose

### MCP Servers
- Firecrawl — for scraping competitor pages, docs, review pages (use for ALL web fetching)
- Context7 — WordPress block development docs, Interactivity API reference
- GitHub (`plugin:github:github`) — search open-source implementations
- Memory — store research findings

## Next Session Prompt (for continuing research)

```
/superpowers:using-superpowers
/superpowers:brainstorming

The SGS WordPress Framework spec expansion is partially complete. Read RESEARCH-HANDOFF.md, CONVERSATION-HANDOFF.md, and CLAUDE.md for full context.

Sessions 2-3 completed: enhanced Announcement Bar spec, Google Reviews block spec, Mega Menu block spec, Decorative Image block spec, and Animation & Interactivity extension spec — all written into specs/02-SGS-BLOCKS.md (uncommitted, +639 lines). Competitive research stored in .firecrawl/competitor-research/.

The full research prompt is in specs/RESEARCH-PROMPT.md. The following items remain:

1. **SGS Pop-ups Plugin spec** — research OptinMonster, Popup Maker, Convert Pro, Elementor Pro Popups, Hustle Pro. Write full spec covering trigger types, display rules, templates, A/B testing, analytics, SGS Forms integration, performance, GDPR. Use `wp-plugin-development` and `wp-interactivity-api` skills.
2. **SGS Chatbot Plugin spec** — research Tidio, LiveChat, Crisp, tawk.to, Intercom. Write full spec covering live/AI/hybrid modes, widget appearance, N8N integration, knowledge base ingestion, GDPR. Late-stage — spec now, build last. Use `wp-plugin-development` and `wp-rest-api` skills.
3. **Gold Standard Audit** — compare all 22 existing SGS blocks against Kadence Blocks Pro, Spectra Pro, GenerateBlocks Pro, Elementor Pro. Output comparison tables per block covering feature completeness, responsive controls, design flexibility, animation, accessibility, performance. Also audit cross-cutting concerns (global defaults, copy/paste styles, pattern library, import/export, role-based visibility, custom CSS per block).

Use Firecrawl for ALL web research. Use Context7 for WordPress docs. Use GitHub MCP to search open-source implementations. Store key findings in Memory MCP.

IMPORTANT: Commit the existing uncommitted spec changes first before starting new work.
```
