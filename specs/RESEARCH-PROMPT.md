# Deep Research & Spec Expansion — Ready-to-Use Prompt

Paste everything below the line into a fresh Claude session.

---

```
/superpowers:using-superpowers
/superpowers:brainstorming
/writing-plans

## Skills to Invoke During This Session

Invoke these skills at the appropriate stage (the session should auto-trigger them via /superpowers:using-superpowers, but call them explicitly if not):

| Skill | When to use |
|---|---|
| `/superpowers:brainstorming` | FIRST — before designing any new component |
| `/writing-plans` | After brainstorming — plan the research and spec-writing sequence |
| `wp-plugin-development` | When speccing standalone plugins (sgs-popups, sgs-chatbot) |
| `wp-block-development` | When speccing blocks (Google Reviews, Mega Menu, Announcement Bar) |
| `wp-rest-api` | When speccing REST endpoints (reviews API, chatbot, pop-up analytics) |
| `wp-interactivity-api` | When speccing interactive frontend behaviour (pop-up triggers, review sliders, chatbot widget) |
| `wp-block-themes` | When speccing mega menu (theme-level navigation integration) |
| `writing-clearly-and-concisely` | When writing the actual spec prose |

## MCPs & Tools to Use Throughout

| Tool | Purpose |
|---|---|
| **Firecrawl** (`/firecrawl:firecrawl-cli`) | Scrape competitor plugin pages, docs, review pages, changelogs. Use for ALL web fetching — superior to built-in WebSearch/WebFetch |
| **Context7** (MCP) | Look up WordPress block development docs, Interactivity API reference, REST API handbook |
| **GitHub** (MCP — `plugin:github:github`) | Search open-source implementations: mega menu repos, chatbot frameworks, review widget code |
| **Memory** (MCP) | Store key research findings as you go so they persist if the session compresses |
| **Web search** | Competitor features, pricing, Reddit/WordPress.org/G2/Capterra complaint threads |

## Task: Deep Research & Spec Expansion for SGS WordPress Framework

You are updating the specification documents for the SGS WordPress Framework (a custom WordPress block theme + plugin ecosystem). Read ALL spec files in `specs/` first (00 through 06), plus every CLAUDE.md in the repo, before doing anything else.

### What I Need

Perform deep competitive research using web search, Context7, Firecrawl, and any other available tools, then write detailed spec additions for the following new components. For EACH item, research the top 3-5 industry tools, find their most common customer complaints (search WordPress.org reviews, G2, Capterra, Trustpilot, Reddit r/wordpress, Facebook groups), and identify USPs/value-add features we can offer that competitors lack.

### New Components to Spec

#### 1. SGS Pop-ups Plugin (`sgs-popups`)
Research: OptinMonster, Popup Maker, Convert Pro, Elementor Pro Popups, Hustle Pro
Spec needs: trigger types (exit intent, scroll %, time delay, click, inactivity), display rules (page targeting, device targeting, user role, new vs returning, cookie/session control), templates/layouts (modal, slide-in, fullscreen, bottom bar, floating), A/B testing, analytics (impressions, conversions, close rate), integration with SGS Forms for email capture, performance impact (lazy load, no CLS), frequency capping, GDPR consent mode.
Key question: Standalone plugin or part of sgs-blocks?
Elementor-specific: Research their popup conditions system (entire page as popup, WooCommerce conditions, dynamic tags inside popups) — identify which ideas translate to a block-editor-native approach.

#### 2. SGS Announcement Bar — Feature Parity Audit
Research: HelloBar, OptinMonster top bars, Elementor Pro sticky header bars, Starter Templates notification bars, WPForms announcement bars
The `sgs/announcement-bar` block already exists in spec 02. Audit it against competitors and expand the spec to match or exceed. Check for: countdown timer, CTA button, multiple colour schemes, scheduling (show between dates), targeting rules, rotation (multiple messages), link/button options, close behaviour (session vs permanent), animation.

#### 3. SGS Google Reviews Display (`sgs/google-reviews`)
Research: Widget for Google Reviews, ReviewsOnMyWebsite, Jetrocket Google Reviews Widget, Elfsight, Trustindex, Elementor Pro Reviews widget + third-party Elementor addons (Essential Addons, PowerPack), Google Places API docs
Spec needs: API connection setup (Google Places API key, place ID), display layouts (grid, slider, list, badge/summary, floating badge, wall), filtering (minimum star rating, hide reviews containing keywords, show only reviews with text), sorting (newest, highest, most helpful), overall rating display (aggregate stars, total count, rating breakdown bar chart), individual review display (avatar, name, date, star rating, text, Google logo attribution), refresh interval, caching strategy, manual review override/pinning, schema.org markup for SEO, performance (lazy load, paginate), responsive layouts, light/dark/transparent themes, link to "write a review" on Google.

#### 4. SGS Mega Menu
Research: Max Mega Menu, JetMenu (Crocoblock), Jetrocket Mega Menu, Kadence mega menu, Elementor Pro mega menu widget, Flavor Starter Sites mega menus
The theme spec mentions "Custom navigation block variation with dropdown patterns" with zero detail. Write a full spec covering: multi-column dropdowns, image/icon support in menu items, featured content panels (promo images, CTAs), category-style layouts, mobile behaviour (accordion sub-menus vs drawer), keyboard navigation, ARIA compliance, performance (load on hover/focus not on page load), integration with WordPress nav block or custom nav block, mega menu builder UI in editor.
Elementor-specific: Research their nested menu widget, horizontal/vertical mega menu layouts, and custom content areas inside dropdowns — identify patterns worth adopting for a block-editor-native mega menu.

#### 5. SGS Chatbot Plugin (`sgs-chatbot`) — LATE STAGE
Research: Tidio, LiveChat, Crisp, tawk.to, Intercom, Botpress, Flowise
Spec needs: live chat mode (human operator), AI mode (connect to OpenAI/Anthropic API), hybrid mode (AI handles initial, escalates to human), widget appearance (position, colours from theme.json, avatar, greeting message), trigger rules (show after delay, on specific pages), conversation storage, offline message handling, N8N integration for notifications, knowledge base ingestion (scrape site pages for AI context), canned responses, typing indicators, file sharing, mobile responsive widget, GDPR consent before chat starts.
NOTE: This is late-stage (after Indus Foods and SGS website are converted). Spec it now, build it last.

#### 6. Gold Standard Audit of Existing Spec Items
For EACH of the 22 blocks already specified in `specs/02-SGS-BLOCKS.md`, compare against the equivalent block/widget in:
- Kadence Blocks Pro
- Spectra Pro (formerly UAG)
- GenerateBlocks Pro
- Elementor Pro (100+ widgets — map each SGS block to its closest Elementor equivalent)
- Jetrocket Starter Sites / Flavor

Check these dimensions for each block:
- Feature completeness (do we have all the controls they offer?)
- Responsive controls (per-breakpoint settings)
- Design flexibility (enough style variants?)
- Animation/interaction options
- Accessibility compliance
- Performance characteristics

Output a comparison table per block with: SGS feature | Kadence | Spectra | Elementor Pro | GenerateBlocks | Gap? | Recommendation

Also check these cross-cutting concerns against the same competitors (including Elementor):
- Global defaults system (set default styles for all instances of a block)
- Copy/paste styles between blocks
- Responsive preview quality
- Block pattern library richness
- Import/export system
- Role-based block visibility
- Motion/animation library depth (Elementor has extensive motion effects — document what's worth matching)
- Custom CSS per block (Elementor offers this at widget level)

### Key Competitive Angle

Our framework's core advantages over Elementor specifically:
1. **Performance** — Elementor adds 200-400KB CSS/JS per page. Our budget is < 100KB CSS + < 50KB JS.
2. **Native block editor** — works WITH Gutenberg, not replacing it. No vendor lock-in.
3. **Zero per-site licensing** — Elementor Pro is $59-399/year per site.
4. **Clean markup** — Elementor generates deeply nested div soup. We output semantic HTML.

Every spec should explicitly note where we beat Elementor on these dimensions.

### Output Format

For each new component (1-5), write a full spec section matching the format and depth of the existing specs in `specs/02-SGS-BLOCKS.md`. Include:
- Purpose & what it replaces
- File/folder structure
- All attributes with types and descriptions
- Render approach (static/dynamic)
- REST API endpoints (if applicable)
- Database schema (if applicable)
- Responsive behaviour
- Accessibility requirements
- Performance budget
- Integration points with other SGS components
- Phase/build order placement

For item 6 (audit), output the comparison tables and a prioritised list of gaps to close.

### Research Approach
1. **Read all existing specs first** — `specs/00-OVERVIEW.md` through `specs/06-BUILD-ORDER.md` + all CLAUDE.md files
2. **Use Firecrawl for ALL web research** — scrape competitor plugin pages, feature lists, changelogs, pricing pages, documentation
3. **Use Context7 MCP** for WordPress block development docs, Interactivity API reference, REST API handbook
4. **Use GitHub MCP** (`plugin:github:github`) to search open-source implementations — mega menu repos, chatbot frameworks, review widgets
5. **Search for customer complaints** on Reddit r/wordpress, WordPress.org plugin reviews (1-2 star), G2, Capterra, Trustpilot — specifically search:
   - "Elementor performance issues", "Elementor bloat", "Elementor lock-in"
   - "OptinMonster alternatives", "popup maker complaints"
   - "WordPress Google reviews plugin issues"
   - "mega menu accessibility", "mega menu mobile problems"
   - "WordPress chatbot plugin slow", "Tidio performance"
6. **Use Memory MCP** to store key findings as you research (prevents loss during context compression)
7. **Invoke domain skills** (`wp-block-development`, `wp-plugin-development`, `wp-rest-api`, `wp-interactivity-api`, `wp-block-themes`) when writing each spec section — they contain current best practices and patterns

### Constraints
- UK English throughout
- Match existing spec formatting exactly
- WCAG 2.2 AA compliance is non-negotiable for all components
- Performance budget: < 100KB CSS, < 50KB JS per page
- No jQuery — vanilla JS only for frontend
- All data via REST API with nonces + capability checks
- Progressive enhancement — must work without JS
```
