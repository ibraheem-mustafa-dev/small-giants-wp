# SGS / WordPress / Design / Design-Review — Full Tooling Reference

**Purpose:** Single source of truth for every tool, skill, agent, script, hook, MCP server, plugin, CLI, and reference doc that supports WordPress, SGS Framework, design, and design review/analysis work.

**Scope:** Only includes tools that are installed, working, and relevant to these four areas. Ambiguous or unverified items are flagged.

**Generated:** 2026-04-14 | **Maintained:** manually; re-run the audit when the skill roster changes

---

## Table of Contents

1. [Skills — WordPress Core](#skills--wordpress-core)
2. [Skills — SGS Framework Specific](#skills--sgs-framework-specific)
3. [Skills — Design & Aesthetic](#skills--design--aesthetic)
4. [Skills — Design Review / QA / Analysis](#skills--design-review--qa--analysis)
5. [Skills — Performance & Accessibility](#skills--performance--accessibility)
6. [Skills — Browser Testing & Capture](#skills--browser-testing--capture)
7. [Skills — Supporting (research, image, email, animation)](#skills--supporting)
8. [Slash Commands](#slash-commands)
9. [Agents (Custom Subagents)](#agents-custom-subagents)
10. [Python Hooks & Scripts (`~/.claude/hooks/`)](#python-hooks--scripts)
11. [SGS WP Engine Scripts (`~/.agents/skills/sgs-wp-engine/scripts/`)](#sgs-wp-engine-scripts)
12. [PHP / Build Tooling (inside `small-giants-wp/`)](#php--build-tooling)
13. [MCP Servers](#mcp-servers)
14. [Claude Code Plugins](#claude-code-plugins)
15. [CLI Tools (External Binaries)](#cli-tools-external-binaries)
16. [Hooks Fired Automatically on WP/SGS Work](#hooks-fired-automatically)
17. [Reference Docs & Knowledge Bases](#reference-docs--knowledge-bases)

---

## Skills — WordPress Core

All live in `C:\Users\Bean\.agents\skills\` (shared between CC and OC).

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/wordpress-router` | Classifies any WP request and dispatches to the right specialist sub-skill | Start of any WP task where the specific skill isn't already obvious |
| `/wp-project-triage` | Deterministic inspection of a WP repo (plugin / theme / block theme / WP core / full site) | First touch with an unfamiliar WP codebase |
| `/wp-block-development` | Gutenberg block dev — `block.json`, attributes, serialisation, save/edit, deprecations | Building or editing custom blocks |
| `/wp-block-themes` | `theme.json` (global settings/styles), templates, template parts, patterns, style variations | Block theme work, FSE, design token configuration |
| `/wp-interactivity-api` | `data-wp-*` directives, `@wordpress/interactivity` store/state/actions | Interactive block behaviour (accordions, sliders, nav state) |
| `/wp-plugin-development` | Plugin architecture, hooks, activation/deactivation/uninstall, Settings API, data storage | Building or modifying WP plugins |
| `/wp-rest-api` | `register_rest_route`, controller classes, schema validation, auth | Custom REST endpoints |
| `/wp-wpcli-and-ops` | WP-CLI commands — safe search-replace, db export/import, plugin/theme/user/content management | Any WP ops work, migrations, bulk changes |
| `/wp-site-extraction` | Reverse-engineer live WP sites via SSH — design system, menus, blocks, CSS, header/footer structure | When you have SSH access and need the full site blueprint |
| `/wp-performance` | Static code review (grep-based anti-patterns) + runtime profiling (WP-CLI profile/doctor, Query Monitor) | Performance investigation before or after deployment |
| `/wp-abilities-api` | `wp_register_ability`, `wp_register_ability_category`, `/wp-json/wp-abilities/v1/*` | Bleeding-edge WP Abilities API work |

---

## Skills — SGS Framework Specific

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/sgs-wp-engine` | Central authority for SGS blocks, theme, client onboarding, QA pipeline, mockup-to-blocks, pattern building. Has access to the 57-block / 822-attribute SQLite KB | Any SGS Framework task — block dev, theme customisation, client site setup, innovating new features |
| `/sgs-site-clone` | 8-stage pipeline: URL → shipped SGS WordPress site. Three input modes: single URL, multi-source mix-and-match, discovery. Location: `C:/Users/Bean/.claude/skills/sgs-site-clone/` (corrected 2026-04-18 — doc previously said `.agents/skills/`) | Client website replication (WP or non-WP source) |
| `/sgs-discover` | Gallery search across Awwwards / Siteinspire / Dribbble / Godly / CSS Design Awards | Finding reference sites before a client build |
| `/sgs-extraction` | Capture full-page HTML, design tokens, DOM structure. Coordinates `html-capture.js` + `design-extract.py` + Gemini Vision | Pulling a design system out of any URL into the SGS DB |
| `/sgs-email-branding` | Apply SGS brand tokens to email templates | Client email templates, newsletters, transactional emails |
| `/sgs-update` | Re-scan SGS codebase and refresh the 619-attribute knowledge base DB | After changes to blocks, tokens, or patterns |
| `/design-tokens` | Sync design tokens between SGS database and `theme.json` | Changing global colours/fonts/spacing in the framework |
| `/wp-blocks` | Search WordPress + SGS blocks, schemas, attributes, markup, variations | Before building a new block — check if one already exists |
| `/clone-patterns` | URL → SGS WP block-pattern PHP files (Gemini Vision + Playwright). Outputs one pattern per identified section (hero, features, testimonials, etc.). Renamed from `/site-clone` on 2026-04-18 for clarity. | Pattern-generation component of the `/sgs-site-clone` pipeline (used at Stage 5 — PATTERN GEN). Invoke standalone when you only need the pattern files without assembly/QA/deploy. |

---

## Skills — Design & Aesthetic

All live in `~/.agents/skills/`. Most are routed via `/innovative-design` but each is also invokable directly.

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/innovative-design` | Design quality router — classifies request and dispatches to the right sub-skill | Entry point when design request is unclear |
| `/interactive-design` | Purposeful animations, micro-interactions, motion effects | Adding movement to a component or page |
| `/frontend-design` | Production-grade frontend interfaces (avoids generic AI aesthetics) | Building distinctive UI from scratch |
| `/ui-ux-pro-max` | 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks | Design system ideation, choosing a visual direction |
| `/superdesign` | Typography hierarchy, OKLCH colour theory, spacing rhythm (4px base), animation micro-reference | Reference lookup while designing |
| `/tailwind-design-system` | Tailwind CSS v4 design systems, tokens, responsive patterns | Tailwind-based projects |
| `/style-replicator` | Extract and replicate design/style patterns | Matching an existing brand or reference design |
| `/design-ref` | Two-pass design extraction (Playwright CSS + Gemini Vision) → `theme.json`-compatible output | Pulling design tokens from ANY URL with confidence scores |
| `/teach-impeccable` | One-time setup to gather design context for a project and save to AI config | Project kickoff — establish design baseline |
| `/adapt` | Adapt designs across screen sizes, devices, contexts, platforms | Responsive/multi-platform work |
| `/bolder` | Amplify safe or boring designs to be more visually interesting | Design feels flat, needs punch |
| `/quieter` | Tone down overly bold or visually aggressive designs | Design feels shouty, needs restraint |
| `/colourise` | Add strategic colour to monochromatic features | Interface feels grey and dull |
| `/delight` | Add moments of joy, personality, unexpected touches | Pre-ship polish — turn functional into memorable |
| `/distill` | Strip designs to their essence, remove unnecessary complexity | Over-designed interface needs simplification |
| `/extract` | Extract and consolidate reusable components, design tokens, patterns into a design system | Systematising a codebase's design decisions |
| `/normalize` | Normalise design to match the design system, ensure consistency | Off-brand or inconsistent components |
| `/onboard` | Design or improve onboarding flows, empty states, first-time UX | First-run experience work |
| `/optimise` | Improve interface performance (loading, rendering, animations, images, bundle) | Performance feel-smoothness work |
| `/polish` | Final quality pass — alignment, spacing, consistency, detail | Pre-ship polish |
| `/harden` | Improve resilience — error handling, i18n, overflow, edge cases | Making interfaces robust |
| `/clarify` | Improve UX copy, error messages, microcopy, labels | Copy feels unclear or jargon-heavy |

---

## Skills — Design Review / QA / Analysis

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/design-review` | Design review on any URL, screenshot, or HTML mockup. Checks visual quality, WCAG 2.2 AA, design system consistency | Any pre-ship design check |
| `/visual-qa` | SGS 8-layer visual QA pipeline with Quick / Full / Compare modes | Production QA on an SGS site before deployment |
| `/critique` | Evaluate design effectiveness (visual hierarchy, IA, emotional resonance) | "Is this design any good?" gut check with structure |
| `/audit` | Comprehensive audit across accessibility, performance, theming, responsive design | Whole-interface quality sweep |
| `/site-reviewer` | 9-layer audit pipeline for any URL (design + SEO + performance + a11y + security) | Universal website quality report for any client site |
| `/gap-analysis` | Grade any target 0–5 with opportunity detection + S-grade screen | After building a skill/agent/pipeline/page — quality gate |

---

## Skills — Performance & Accessibility

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/a11y-audit` | WCAG 2.2 AA audit on URL, HTML string, or colour contrast | Any accessibility check, pre-deploy or in-development |
| `/accessibility-scan` | Comprehensive accessibility audit via axe-core integration | Deeper a11y audit than `a11y-audit` |
| `/wp-perf` | Full-stack WP performance audit — backend (WP-CLI) + frontend (Core Web Vitals) | Performance investigation on a live WP site |
| `/wp-perf-gate` | Performance regression gate — designed to wire into PreToolUse to block bad commits | Pre-deploy gate |
| `/wp-theme-check` | Validate `theme.json` against a WP version — flags deprecated + v3-only features | Before pushing `theme.json` changes |
| `/wp-scaffold` | Generate SGS-standards plugin skeleton with security, PHPStan, i18n | New plugin work |
| `/wp-hooks` | Search, validate, inspect WP hooks from the 7,283-hook verified database | Before writing `add_action` / `add_filter` — verify the hook is real |
| `/wp-hook-graph` | Map WP hook dependencies in a plugin — scan, visualise, validate | Understanding hook flow in a complex plugin |

---

## Skills — Browser Testing & Capture

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/playwright` | Browser automation — navigate, screenshots, forms, a11y audits, page behaviour verification | All systematic browser work (multi-breakpoint, loops, structured output) |
| `/screenshot` | Capture screens, windows, regions across platforms with the right tools | One-off screenshots — not multi-breakpoint systematic |
| `/superpowers-chrome:browsing` | Persistent Chrome DevTools Protocol browser with auto-capture | Controlling an existing browser session, multi-tab work |
| `/chrome-devtools-mcp:chrome-devtools` | Chrome DevTools via MCP — debugging, network inspection, Lighthouse, performance traces | Live browser debug, LCP optimisation, a11y debugging |
| `/chrome-devtools-mcp:a11y-debugging` | Chrome DevTools-based a11y audit — semantic HTML, ARIA, keyboard | Deep a11y debug beyond axe-core |
| `/chrome-devtools-mcp:debug-optimize-lcp` | Guided LCP debugging/optimisation with Chrome DevTools traces | Fixing specific LCP regressions |
| `/chrome-devtools-mcp:troubleshooting` | DevTools connection/target issue troubleshooting | When Chrome DevTools MCP itself is misbehaving |

---

## Skills — Supporting

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `/image-optimiser` | Optimise images for web, apps, print. Convert to WebP/AVIF, compress | Before uploading media, after mockup export |
| `/animation-harvest` | 8-stage pipeline: extract web animations → modular SGS framework extensions | Building the SGS animation library from web inspiration |
| `/email-html-builder` | Build production email templates with semantic HTML/CSS (Gmail, Outlook, Apple Mail compatible) | Client emails, transactional templates, newsletters |
| `/nano-banana-pro` / `/generate` | Nano Banana image generation via Gemini CLI — thumbnails, icons, diagrams, illustrations | Synthetic image generation for blog, YT, mockups |
| `/deep-research` | High-stakes research — iterative depth, multi-angle cross-reading, 20+ sources | Design strategy decisions, competitor deep-dives |
| `/research-buddies` | Cutting-edge + practical angles (The Nerd + The Practitioner) | Design pattern research with real-world validation |
| `/research` | Entry point — auto-routes to the right research tier | Any research question, unclear which tier |
| `/search` | Web search — auto-routes to Brave / Firecrawl / SerpAPI / Tavily | Web search that needs routing |
| `/library-docs` | Fetch up-to-date library docs (replaces Context7 MCP) | WP/React/Playwright API lookups |
| `/handoff` | Generate session handoff summary | End of session |
| `/watch` | Process YouTube videos — learning or research | Turning video inspiration into text notes |
| `/deploy-check` | Pre-deployment checklist for a WP site | Before pushing to staging/production |
| `/deploy-nextjs` | Pre-deployment checklist for Next.js | Next.js project deploy |

---

## Slash Commands

Located in `C:\Users\Bean\.claude\commands\`. These are thin wrappers over skills — the distinction is that commands appear in the `/` menu. The skills table above already lists the main ones. Additional commands not yet covered:

| Command | Path | Purpose |
|---------|------|---------|
| `/cerebras` | `cerebras.md` | Zero-cost LLM delegation via Cerebras (primary free model — Qwen-3-235b at 1,400 t/s) |
| `/gemini`, `/gemini-flash`, `/gemini-pro` | `gemini*.md` | Gemini CLI delegation (1M context, zero or low cost) |
| `/where-am-i` | `where-am-i.md` | Show position in the current project's plan |
| `/update-architecture` | `update-architecture.md` | Update the project's living architecture doc |
| `/review` | `review.md` | Code review for best practices |
| `/dev` | `dev.md` | Development workflow — auto-detects phase |
| `/status` | `status.md` | Live-verified cross-project portfolio dashboard |
| `/morning` | `morning.md` | Daily planning ritual |
| `/lifecycle` | `lifecycle.md` | Create/edit/audit/grade skills/agents/pipelines/commands/routers |
| `/diagnostics` | `diagnostics.md` | Show VS Code Problems panel — all errors/warnings from every LSP and linter extension (TypeScript, ESLint, PHP LSP, Tailwind, Error Lens). Uses `mcp__ide__getDiagnostics`. Faster than running `tsc`/`eslint`/`phpcs` via Bash because the LSPs have already cached results. Pass a file path to scope. |
| `/lint` | `lint.md` | Runs the correct CLI linter/formatter for the target file(s) with autofix. Routes by extension: eslint+prettier (JS/TS), prettier (JSON/MD/CSS), phpcbf+phpcs (PHP), ruff (Python). Pair with `/diagnostics` — the LSPs surface findings, this command applies fixes. |

### VS Code Extension Capabilities

Claude Code runs inside the Anthropic VS Code extension, which exposes a locked-down `ide` MCP server with exactly two model-visible tools:

| Tool | What it does |
|------|-------------|
| `mcp__ide__getDiagnostics` | Returns the Problems panel — every error/warning from every language server and linter extension you have installed. Read-only. |
| `mcp__ide__executeCode` | Runs Python in the active Jupyter notebook kernel (with manual confirmation each time). Jupyter-only. |

**Not exposed:** GitLens APIs, Prettier/ESLint fix triggers, Tailwind IntelliSense completions, extension-to-extension calls of any kind. Use `/lint` (CLI) when fixes are needed.

**Also useful passively:** selection is auto-sent to Claude; `@file:L5-10` mentions with line ranges; diff-viewer for pending edits; autosave before reads/writes. All free, no config.

---

## Agents (Custom Subagents)

Located in `C:\Users\Bean\.claude\agents\`.

### Critical — always consider first

| Agent | Path | Purpose | When to delegate |
|-------|------|---------|------------------|
| `wp-sgs-developer` | `wp-sgs-developer.md` | All SGS WordPress work — blocks, theme, client sites, QA, mockup-to-WP | Any WP build task where the SGS framework is involved |
| `design-reviewer` | `design-reviewer.md` | Visual quality, WCAG 2.2 AA, design system consistency, mockup-vs-build comparison | Pre-ship design gate, design handoff validation |
| `site-reviewer` | `site-reviewer.md` | 9-layer universal site audit (any URL) | Auditing a client site or competitor site |
| `performance-auditor` | `performance-auditor.md` | Next.js performance, Lighthouse, Core Web Vitals, bundle size | Next.js perf (for WP use `/wp-perf` skill) |

### Design research / SEO support

| Agent | Path | Purpose |
|-------|------|---------|
| `seo-visual` | `seo-visual.md` | Visual SEO and layout analysis |
| `seo-auditor` | `seo-auditor.md` | SEO recommendations (read-only) |
| `seo-technical` | `seo-technical.md` | Crawlability, indexability, Core Web Vitals for SEO |
| `seo-performance` | `seo-performance.md` | SEO performance metrics |
| `seo-schema` | `seo-schema.md` | Schema.org JSON-LD detection, validation, generation |
| `seo-sitemap` | `seo-sitemap.md` | XML sitemap validation and generation |

### Cost optimisation (delegate to cheaper models)

| Agent | Path | Purpose |
|-------|------|---------|
| `gemini-analyser` | `gemini-analyser.md` | Structured analysis tasks → Gemini CLI (zero-cost, 1M context) |
| `cerebras-agent` | `cerebras-agent/` | Zero-cost Qwen-3-235b via Cerebras for heavy-but-not-deep work |
| `Explore` | Built-in | Fast codebase search (Haiku, read-only) |

### Meta / lifecycle

| Agent | Path | Purpose |
|-------|------|---------|
| `project-manager` | `project-manager.md` | Portfolio status, phase tracking, blocker alerts, agent routing |
| `research-pipeline` | `research-pipeline.md` | Full research-to-decision pipeline |
| `search-conversations` | `search-conversations.md` | Search past CC conversations for context |
| `test-and-explain` | `test-and-explain.md` | Test completed work + explain results in plain English |

---

## Python Hooks & Scripts

Located in `C:\Users\Bean\.claude\hooks\`. Includes both **hook scripts** (fired by settings.json automation) and **utility scripts** (manually invoked).

### WP-specific

| Script | Type | Purpose |
|--------|------|---------|
| `wp-blocks.py` | CLI | Search/schema/attributes/markup/variations/validate/tokens/gaps/impact for blocks |
| `wp-hook-graph.py` | CLI | Map WP hook dependencies in a plugin |
| `wp-pattern-gen.py` | CLI | Generate WP block patterns from URL or mockup |
| `wp-perf.py` | CLI | Full-stack WP performance audit |
| `wp-perf-review.py` | PostToolUse hook | Scans PHP/JS edits for WP performance anti-patterns |
| `wp-perf-gate.py` | CLI / hook | Performance regression gate |
| `wp-scaffold.py` | CLI | Generate SGS-standards plugin skeleton |
| `wp-theme-check.py` | CLI | Validate `theme.json` against WP version |
| `wp-token-bridge.py` | CLI | Sync tokens between SGS DB and `theme.json` |
| `wp-content-guard.py` | PreToolUse hook (Bash) | Protect WP content from accidental overwrites |
| `wp-docs.py` | CLI | Generate WP documentation |
| `wpcs-lint.py` | PostToolUse hook | WordPress Coding Standards linting (phpcs wrapper) |
| `php-lint.py` | PostToolUse hook | PHP syntax + style lint |

### SGS-specific

| Script | Type | Purpose |
|--------|------|---------|
| `sgs-validate.py` | PostToolUse hook | SGS-specific validation (hardcoded colours, unescaped output, missing ARIA) |

### Design extraction

| Script | Type | Purpose |
|--------|------|---------|
| `design-extract.py` | CLI | Extract design tokens, CSS, colours, fonts, spacing via Dembrandt + Gemini Vision |
| `design-extract-gate.py` | PreToolUse hook | Gate before design extraction — validates inputs |

### Accessibility

| Script | Type | Purpose |
|--------|------|---------|
| `a11y-audit.py` | CLI | WCAG 2.2 AA audit via Playwright + axe-core |

### Skill/pipeline lifecycle

| Script | Type | Purpose |
|--------|------|---------|
| `lifecycle-gate.py` | PreToolUse hook | Blocks direct edits to skill/agent/pipeline files unless pipeline active or lifecycle mode set |
| `pipeline-enforcer.py` | CLI + Stop hook | **Intentionally absent** (2026-04-18). Other hooks guard references with `if ENFORCER.exists()` so behaviour fails-open. Rebuild when a concrete pipeline-state-tracking need re-emerges. |
| `pipeline-stage-gate.py` | PreToolUse hook | Enforces pipeline stage ordering |
| `pending-gap-analysis-gate.py` | PreToolUse hook | Blocks tool calls after skillscore pass until gap-analysis runs |
| `pending-gap-analysis-writer.py` | PostToolUse hook | Creates "gap-analysis pending" marker |
| `gap-analysis-gate.py` | PostToolUse Skill + Stop hook | Enforces gap-analysis completion. Option B (2026-04-17): auto-skips reference files under recently-graded parent skills |
| `gap-analysis-clear.py` | PostToolUse Skill hook | Clears gap-analysis pending marker |
| `grading-reminder-hook.py` | PostToolUse hook | Reminds to grade after edit |
| `skillscore-check.py` | PostToolUse hook | Auto-runs skillscore on skill/agent edits. Fires `Skillscore: N% — passed/failed` as additionalContext. Fixed 2026-04-18 — the earlier "BROKEN" claim was stale; hook now returns accurate scores. |
| `skill-outcome-logger.py` | PostToolUse hook | Logs skill use outcomes |
| `track-skill-edits.py` | PostToolUse hook | Tracks skill edits for later grading |
| `validate-pipeline-artifact.py` | CLI | Validate pipeline stage JSON artifacts (NEW 2026-04-08) |

### Other hook/utility scripts (tangential to WP/design)

`routing-correction.py`, `routing-log.py`, `session-init.py`, `session_utils.py`, `local-search.py`, `search.py`, `tg-cli.py`, `context7.py`, `knowledge-prefetch.py`, `brain-dump-hook.py`, `plain-english-check.py`, `parking-lot.py`, `proactive-next.py`, `working-memory.py`, `cc-oc-sync.py`, `sync-agent-skills.py`, `block-env.py`, `build-reminder.py`, `conversation-reader.py`, `research-saver.py`, `search-guard.py`, `delete-guard.sh`, `branch-guard.sh`, `auto-lint.py`, `prettier-format.sh`, `backup-claude-config.ps1`, `_register-adhd-hooks.py`

---

## SGS WP Engine Scripts

Located in `C:\Users\Bean\.agents\skills\sgs-wp-engine\scripts\`.

### Python

| Script | Purpose |
|--------|---------|
| `sgs-db.py` | Query the SGS Framework SQLite DB — blocks, tokens, patterns, hooks, impacts, gaps |
| `create-db.py` | Initialise SGS Framework database |
| `populate-db.py` | Populate database with block definitions from source |
| `update-db.py` | Update database after schema changes |
| `generate-patterns.py` | Generate WordPress block patterns programmatically |
| `sgs-db-temp.py` | Staging/temporary version of `sgs-db.py` |
| `touch-scan.ps1` | PowerShell scan (touchpoint detection) |

### JavaScript (design-qa/)

Located in `C:\Users\Bean\.agents\skills\sgs-wp-engine\scripts\design-qa\`.

| Script | Purpose |
|--------|---------|
| `capture-states.js` | Capture interactive states (hover, focus, active) for visual comparison |
| `element-extractor.js` | Extract individual elements with full computed styles |
| `global-css-diff.js` | Compare global CSS between two sites |
| `responsive-audit.js` | Audit responsive behaviour across breakpoints |
| `responsive-screenshots.js` | Capture screenshots at 375 / 768 / 1440 |
| `run-audit.js` | Execute the full design-QA pipeline |

### MCP Server

`C:\Users\Bean\.agents\skills\sgs-wp-engine\mcp\server.py` — FastMCP server for unified block queries (core WP + SGS blocks)

### SGS Framework Database

`C:\Users\Bean\.agents\skills\sgs-wp-engine\sgs-framework.db` — SQLite. 57 SGS blocks / 822 attributes / design tokens / patterns / hooks.

Query via: `python C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py <command>`

---

## PHP / Build Tooling

Inside `C:\Users\Bean\Projects\small-giants-wp\`.

### Theme (`theme/sgs-theme/`)

| File | Purpose |
|------|---------|
| `theme.json` | WP design tokens, settings, styles — single source of truth for colours/fonts/spacing/layout |
| `composer.json` | PHP deps (no dev deps currently — linting inherited from `sgs-blocks`) |

### Blocks plugin (`plugins/sgs-blocks/`)

| File | Purpose |
|------|---------|
| `composer.json` | `php`, `league/csv`, `nesbot/carbon`, `spatie/color` |
| `package.json` | Dev deps: `@wordpress/scripts`, `@wordpress/icons`, `lucide-static`. Scripts: `build`, `start`, `lint:js`, `lint:css`, `format` |

**Npm scripts you'll actually use:**
- `npm run build` — compile blocks for production
- `npm run start` — dev build with watch
- `npm run lint:js` — JS lint
- `npm run lint:css` — CSS lint
- `npm run format` — Prettier format

### Client sites (`sites/*/`)

| File | Purpose |
|------|---------|
| `theme.json` | Client-specific style variation (overrides SGS base tokens) |
| `package.json` | Client-specific build (e.g. `sites/small-giants-studio-v2/`) |
| `CLAUDE.md` | Client-specific development rules |

### Top-level docs

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Framework-wide dev instructions — naming conventions, design tokens, branch discipline |
| `ARCHITECTURE.md` | Architecture overview, block inventory, data flow |
| `AUDIT-REPORT.md`, `M15-*.md` | Historical audits / fix reports |

---

## MCP Servers

Registered in `C:\Users\Bean\AppData\Roaming\Claude\claude_desktop_config.json` (desktop) and via Claude Code plugins.

### Claude Desktop MCPs (also available in CC where plugin-bridged)

| Server | Purpose | Relevant to |
|--------|---------|-------------|
| `chrome-devtools` | Live Chrome browser — Lighthouse audits, performance traces, network inspection, a11y debug | Design review, perf, a11y |
| `playwright` | Full browser automation — navigate, screenshot, evaluate, click, hover, resize, console | Design review, QA, visual testing |
| `github` | PRs, issues, code search, branches, releases | Any GitHub work (SGS releases, client repos) |
| `filesystem` | Scoped filesystem access (Desktop only by default) | Limited — CC has full FS |
| `memory` | Knowledge graph memory | Cross-session memory (rarely used in WP work) |
| `fetch` | Generic URL fetch (Python-based) | One-off URL fetches |
| `sequential-thinking` | Structured reasoning chain | Rare — complex architectural debates |

### CC Plugin-provided MCPs (via plugin system)

| Server | Purpose | Relevant to |
|--------|---------|-------------|
| `context7` | Up-to-date library docs + code examples | WP / React / Playwright API lookups |
| `firecrawl` | JS-rendered web scraping with clean markdown | Scraping gallery sites, Cloudflare-protected URLs |
| `mintlify` | Mintlify docs search/query | Documentation work |

### SGS-specific MCP (not currently running — needs startup)

| Server | Purpose |
|--------|---------|
| `sgs-wp-engine/mcp/server.py` | FastMCP unified block queries (core WP + SGS) |

---

## Claude Code Plugins

Located in `C:\Users\Bean\.claude\plugins\marketplaces\claude-plugins-official\plugins\`.

| Plugin | Provides | Relevant to |
|--------|----------|-------------|
| `chrome-devtools-mcp` | Chrome DevTools MCP + 4 skills (a11y-debugging, debug-lcp, troubleshooting, chrome-devtools) | Design review, perf, a11y |
| `playwright` | Full browser MCP + `/playwright` skill | Visual testing, QA, multi-breakpoint screenshots |
| `superpowers-chrome` | Persistent Chrome browser + `/browsing` skill | Interactive browser control with existing session |
| `firecrawl` | `/firecrawl` + `/skill-gen` + MCP | Web scraping, doc → skill generation |
| `context7` | MCP for library docs | WP/React API reference |
| `github` | MCP for PR/issue/repo operations | SGS releases, client repo work |
| `frontend-design` | `/frontend-design` skill | Production-grade UI building |
| `nano-banana` | `/generate` skill | Image generation via Gemini |
| `wordpress.com` | `/quick-build`, `/preview-designs`, `/site-specification` skills + WordPress.com Studio integration | WP.com projects (not used for SGS self-hosted) |
| `commit-commands` | `/commit`, `/commit-push-pr`, `/clean_gone` | Git workflow on SGS repos |
| `feature-dev` | `/feature-dev` + code-architect/explorer/reviewer subagents | Feature development with architectural thinking |
| `code-review` | `/code-review` | PR review |
| `optibot` | `/optibot` AI code review | Code review with pattern detection |
| `mintlify` | Docs skill + MCP | Documentation |
| `playground` | `/playground` — interactive single-file HTML playgrounds with live preview | Quick HTML prototypes |
| `plugin-dev` | 7 skills for building Claude Code plugins | Meta-work — not WP |
| `episodic-memory` | `/search-conversations`, `/remembering-conversations` | Finding past decisions |
| `claude-md-management` | `/revise-claude-md`, `/claude-md-improver` | Maintaining CLAUDE.md files |

---

## CLI Tools (External Binaries)

### WP & PHP

| Tool | Where | Purpose |
|------|-------|---------|
| `wp-cli` (`wp`) | SSH to remote WP sites, or local WP installs | All WP ops — search-replace, db export/import, plugin/theme management |
| `phpcs` | `composer global`, also via `@wordpress/scripts` | PHP Coding Standards (WordPress ruleset). Wired into PostToolUse hook `wpcs-lint.py` — fires on every PHP edit |
| `phpstan` | `plugins/sgs-blocks/vendor/bin/phpstan` (dev dep in `plugins/sgs-blocks/composer.json`) | PHP static analysis. Config: `plugins/sgs-blocks/phpstan.neon`, level 5, uses `szepeviktor/phpstan-wordpress` extension. Run: `cd plugins/sgs-blocks && vendor/bin/phpstan analyse` |
| `composer` | Global | PHP package manager. Run `composer install` in `plugins/sgs-blocks/` to set up phpstan + phpunit dev deps |

### Frontend / build

| Tool | Where | Purpose |
|------|-------|---------|
| `npm` / `node` | Global | JS tooling, @wordpress/scripts build |
| `@wordpress/scripts` | npm devDep in `sgs-blocks` | Block build, dev server, lint |
| `lucide-static` | npm devDep | Lucide icon assets |

### Browser / visual

| Tool | Where | Purpose |
|------|-------|---------|
| `playwright` (`npx playwright`) | Global + MCP | Multi-breakpoint testing, a11y runs, systematic browser automation. **Prefer CLI over MCP for loops/suites** |
| `dembrandt` | Referenced in `design-extract.py` | CSS extraction + design token detection |

### Image

| Tool | Where | Purpose |
|------|-------|---------|
| `sharp-cli` | Global npm | Image optimisation, format conversion (WebP/AVIF) |
| ImageMagick | `C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\` | Heavy image processing |

### Skill quality

| Tool | Where | Purpose |
|------|-------|---------|
| `skillscore` (sgs-skillscore v2) | `C:\Users\Bean\bin\skillscore` (wraps `sgs-skillscore.py`) | Deterministic skill/agent/pipeline quality grading |

### Git / GitHub

| Tool | Where | Purpose |
|------|-------|---------|
| `gh` | Global | All GitHub ops — PRs, issues, releases, `gh api` |
| `git` | Global | Version control |

### Search / research

| Tool | Where | Purpose |
|------|-------|---------|
| `firecrawl` | npm / plugin | Web scrape with JS rendering |
| `search.py` | `~/.claude/hooks/search.py` | Unified search — auto-routes Brave/Firecrawl/SerpAPI/Tavily |
| `local-search.py` | `~/.claude/hooks/local-search.py` | Local-first search across SGS DB + WP hooks + past corrections |

---

## Hooks Fired Automatically

From `C:\Users\Bean\.claude\settings.json`. These run without Claude triggering them — they enforce quality gates invisibly.

### PreToolUse (block before action)

| Matcher | Hook | What it does |
|---------|------|--------------|
| `.*` | `pending-gap-analysis-gate.py` | Blocks all tools when a "grade this skill" marker is pending |
| `Write\|Edit` | `lifecycle-gate.py` | Blocks direct edits to skill/agent/pipeline files unless pipeline active or lifecycle mode |
| `Skill` | `pipeline-stage-gate.py` | Enforces pipeline stage ordering |
| `Bash` | `wp-content-guard.py` | Protects WP content from accidental overwrites |

### PostToolUse (react after action)

| Matcher | Hook | What it does |
|---------|------|--------------|
| `Bash` | `sync-agent-skills.py` | Sync skills between CC and OC after any Bash action |
| `Skill` | `gap-analysis-gate.py` / `gap-analysis-clear.py` | Track gap-analysis runs, clear pending markers |
| `Write\|Edit` | `sgs-validate.py` | SGS validation (hardcoded colours, unescaped output, missing ARIA) on SGS repo files |
| `Write\|Edit` | `wp-perf-review.py` | WP performance anti-pattern scan on PHP/JS edits |
| `Write\|Edit` | `skillscore-check.py` | Auto-skillscore on skill/agent .md edits. Reports accurate scores (was previously stuck at 30% — fixed 2026-04-18). |
| `Write\|Edit` | `pending-gap-analysis-writer.py` | Write "grade this" marker after skill edits |
| `Write\|Edit` | `skill-outcome-logger.py` | Log outcomes of skill use |
| `Edit\|Write` | `track-skill-edits.py` | Track skill edit events for lifecycle |

### Stop (session-end)

| Matcher | Hook | What it does |
|---------|------|--------------|
| `*` | `gap-analysis-gate.py` | Check for ungraded skill edits before stop. Auto-skips reference files under parent skills graded within 7 days (Option B, 2026-04-17). |

**Known hook bugs:**
- `lifecycle-gate.py` — with multiple CC windows open, picks newest session marker by mtime → can block the pipeline's own session. Workaround: create `.lifecycle-mode-<sid>.json` manually.
- `branch-guard.sh` — runs `git branch --show-current` in shell CWD, not target file's git repo. False positive when editing files in a different repo than the CWD (e.g. `A:/.openclaw/...` from `small-giants-wp/`). Workaround: route through `python3 - << EOF ... EOF` in Bash to bypass the pre-Edit check, or `cd` into the target repo first.

---

## Reference Docs & Knowledge Bases

### Project CLAUDE.md files (hierarchical)

| File | Scope |
|------|-------|
| `C:\Users\Bean\.claude\CLAUDE.md` | Global — applies to every project. Philosophy, ADHD support, git workflow, tool roster |
| `C:\Users\Bean\Projects\small-giants-wp\CLAUDE.md` | SGS framework-wide — naming conventions, hook prefix (`sgs_`), block namespace, branch discipline |
| `C:\Users\Bean\Projects\small-giants-wp\sites\*\CLAUDE.md` | Per-client — site-specific rules, reference URLs, QA checklists |
| `a:\.openclaw\CLAUDE.md` | OC runtime — shared between CC and OC sessions |

### Rules (`C:\Users\Bean\.claude\rules\`)

| Rule | What it enforces |
|------|------------------|
| `wp-project-tooling.md` | Required WP tooling section in every WP CLAUDE.md |
| `uk-english.md` | British spelling across all output (colour, behaviour, organise) |
| `code-quality.md` | PHP ≤300 lines, TS strict, zero `any`, no stubs, comprehensive fixes, security non-negotiables |
| `no-coauthored-by.md` | Never add `Co-Authored-By: Claude` to commits |
| `always-invoke-autopilot.md` | `/autopilot` at start of every session |

### Skill references (for self-modification)

| File | Purpose |
|------|---------|
| `~/.claude/skills/skill-writer/references/skill-anatomy.md` | Structure rules for SKILL.md — frontmatter, body, pipeline mode |
| `~/.claude/skills/gap-analysis/references/report-template.md` | Mandatory gap-analysis report template |
| `~/.claude/skills/gap-analysis/references/correction-ledger.md` | Past evaluation corrections to calibrate future grades |
| `~/.agents/skills/shared-references/communication-standards.md` | Plain English + ADHD-friendly rules for all output |
| `~/.agents/skills/shared-references/sgs-skillscore.py` | The actual skillscore v2 implementation (1,400 lines) |

### SGS Framework knowledge base

| File | Purpose |
|------|---------|
| `~/.agents/skills/sgs-wp-engine/sgs-framework.db` | SQLite — 57 blocks, 822 attributes, tokens, patterns, hooks |
| `~/.agents/skills/sgs-wp-engine/references/design-compare.md` | Methodology for visual fidelity comparison |
| `~/.agents/skills/sgs-wp-engine/references/design-compare-grades.md` | Grading rubric for design comparison (A+ to F) |
| `~/.agents/skills/sgs-wp-engine/references/fidelity-comparator.md` | 6-phase visual fidelity comparison methodology |
| `~/.agents/skills/sgs-wp-engine/references/visual-qa-pipeline.md` | 8-layer QA pipeline specification |
| `~/.agents/skills/sgs-wp-engine/references/design-qa-rubric.yaml` | SGS aesthetics benchmark rubric (brand, typography, UX, layout) |
| `~/.agents/skills/sgs-wp-engine/references/mockup-to-blocks.md` | HTML/JS mockup → SGS blocks conversion methodology |
| `~/.agents/skills/sgs-wp-engine/references/pattern-generator.md` | WP pattern generation guide |
| `~/.agents/skills/sgs-wp-engine/references/theme-development.md` | SGS theme development standards |
| `~/.agents/skills/sgs-wp-engine/references/gutenberg-blocks.md` | Gutenberg block reference |
| `~/.agents/skills/sgs-wp-engine/references/block-developer.md` | Custom block development guide |
| `~/.agents/skills/sgs-wp-engine/references/admin-ux.md` | WP admin UX standards |
| `~/.agents/skills/sgs-wp-engine/references/design-qa-prompts/` | Structured QA evaluation prompts (a11y, code, visual, ux, pm, global) |
| `~/.agents/skills/sgs-wp-engine/references/brand.json` | SGS brand tokens (colours, fonts, spacing) |

### Plans (current work)

| File | Scope |
|------|-------|
| `C:\Users\Bean\.claude\plans\sgs-pipeline-architecture.md` | SGS pipeline architecture — 8 work units, current in-progress |
| `C:\Users\Bean\.claude\plans\imperative-squishing-fairy.md` | Master OpenClaw rehab + upgrades plan |
| `C:\Users\Bean\.claude\plans\prancy-yawning-cookie.md` | OC skill salvage + merge-into-shared plan |
| `C:\Users\Bean\Projects\small-giants-wp\NEXT-SESSION-PROMPT.md` | Next-session handoff for SGS work |
| `C:\Users\Bean\Projects\small-giants-wp\CONVERSATION-HANDOFF.md` | Last-session summary for SGS work |

### Secrets

| File | Purpose |
|------|---------|
| `A:\.openclaw\.secrets\wp-app-passwords.env` | WP app passwords for all live SGS client sites |
| `A:\.openclaw\.env` | API keys (Brave, SerpAPI, Gemini, Firecrawl, Anthropic) |

---

## Custom WP CLI Suite (10 tools — replaces 4 MCPs + adds 7 novel capabilities)

Built 2026-04-04 to reduce MCP schema-registration token cost. All live in `C:\Users\Bean\.claude\hooks\`. Saves ~6,000 tokens per session vs keeping the MCPs registered.

**Why CLIs over MCPs:** MCP tools register their full schema at conversation start, consuming tokens even when never invoked. CLIs consume zero tokens until you actually run them. The trade-off: you lose the auto-discoverable tool interface, but the WP skills reference these CLIs explicitly in their ## CLI Tools tables, so the cost is paid once per skill load rather than per conversation.

### The 3 Direct MCP Replacements

| CLI | Replaces | Data source | Slash command |
|-----|----------|-------------|---------------|
| `wp-blocks.py` | `wp-blockmarkup` + `sgs-blockmarkup` MCPs | `~/.agents/skills/sgs-wp-engine/sgs-framework.db` — filter rows by `source='native_wp'` (121 core blocks, 475 attrs, 819 supports, 122 variations, 331 markup examples) or `source='sgs'` (73 SGS blocks). Architecture-staging Phase 1 close-out — see decisions.md D56. | `/wp-blocks` |
| `wp-docs.py` | `wp-devdocs` MCP | `~/.agents/skills/sgs-wp-engine/sgs-framework.db` — `hooks` table (2,775 native + 2,633 third_party + 13 sgs) and `docs` table (1,142 native_wp + 16 sgs). Architecture-staging Phase 1 close-out — see decisions.md D56. | `/wp-hooks` |
| `a11y-audit.py` | `a11y-accessibility` MCP | Playwright + axe-core via CDN | `/a11y-audit` |

### The 7 Novel Tools (new capabilities, not replacements)

| CLI | Purpose | Slash command |
|-----|---------|---------------|
| `wp-perf.py` | Full-stack perf: WP-CLI backend + Lighthouse CWV + baseline/diff | `/wp-perf` |
| `wp-hook-graph.py` | Hook dependency graph — scan / graph / validate (feeds Insight Graph product) | `/wp-hook-graph` |
| `wp-scaffold.py` | SGS-standards plugin scaffold generator | `/wp-scaffold` |
| `wp-token-bridge.py` | Design token sync (SGS DB ↔ `theme.json`) — competitive moat | `/design-tokens` |
| `wp-theme-check.py` | `theme.json` version validator (v2/v3 feature mapping) | `/wp-theme-check` |
| `wp-pattern-gen.py` | URL → sections → SGS block patterns. Uses Gemini 3 Flash Vision + Playwright (not Firecrawl) | Used by `/sgs-site-clone` Stage 5 (PATTERN GEN) and by the `/clone-patterns` command directly |
| `wp-perf-gate.py` | PreToolUse hook — blocks git commits containing critical perf anti-patterns | `/wp-perf-gate` + hook |

### Related MCP Replacement (separate from the 10)

| CLI | Replaces | Note |
|-----|----------|------|
| `context7.py` | `/library-docs` command (Context7 MCP plugin retired 2026-04-18) | Fixed Git Bash MSYS path translation bug for `/org/repo` arguments |
| `skillscore` (→ `sgs-skillscore.py`) | npm `skillscore@2.0.2` | Installed as global command 2026-04-08. 4-tier weighted (FATAL 30% / QUALITY 40% / ARCH 20% / HYGIENE 10%), 38 checks, type-aware thresholds |
| `search.py` | multiple search MCPs | Unified router: Brave → Firecrawl → SerpAPI → Tavily |
| `local-search.py` | — | Novel: local-first search across SGS DB + WP hooks + past corrections, before going to web |

### Status of the Original 4 MCPs

Verified 2026-04-18 — all four are DISABLED. `settings.json` has empty `mcpServers` for these, so the ~6,000 tokens/session savings is actually being realised.

| MCP | Current status | Replaced by |
|-----|---------------|-------------|
| `wp-blockmarkup` | DISABLED ✓ | `wp-blocks.py` |
| `sgs-blockmarkup` | DISABLED ✓ | `wp-blocks.py` |
| `wp-devdocs` | DISABLED ✓ | `wp-docs.py` |
| `a11y-accessibility` | DISABLED ✓ | `a11y-audit.py` |

Re-check periodically if MCPs get re-registered by plugin updates — `python -c "import json; d=json.load(open(r'C:/Users/Bean/.claude/settings.json', encoding='utf-8')); print(list(d.get('mcpServers', {}).keys()))"`.

---

## OpenClaw (Blub) Pipelines & Flows

OC is the always-on side of the stack. It has its own pipelines and automation flows — separate from Claude Code's lifecycle hooks, but often coordinating the same skills.

### OC Lifecycle Pipelines

Located in `a:\.openclaw\workspace\pipelines\`. These are structurally similar to CC pipelines but enforced by OC's gateway at runtime.

| Pipeline | Stages | Purpose | Relevant to |
|----------|--------|---------|-------------|
| `design-build.json` | 5 | Design-to-deploy pipeline for SGS WordPress sites — enforces the full chain from design extraction through deploy | SGS-theme, design, design-review |
| `skill-lifecycle.json` | 5 | Full skill improvement cycle — audit → write → grade before/after → fix-loop | Meta (skill building) |
| `agent-lifecycle.json` | 5 | Full agent improvement cycle — audit roster → assess perf → grade → fix-loop | Meta (agent building) |
| `pipeline-lifecycle.json` | 6 | Pipeline creation/improvement cycle — enforces research + debate before writing | Meta (pipeline building) |
| `handoff.json` | 5 | Session handoff pipeline — ensures all gates pass before handoff doc is written | Session management |

**Key one for SGS:** `design-build.json` — this is the OC-side equivalent of `/sgs-site-clone` + `/visual-qa` stitched together with gate enforcement at each stage.

### OC Automation Flows (Blub Automation Engine)

Located in `a:\.openclaw\workspace\automations\flows\`. 31 flows, replaces the old n8n workflows. Runs on OC's runner.py service at port 17891 (BlubRunner NSSM service).

**Note for SGS:** most flows are personal/ops (prayer times, email, invoices, physio) — not directly WP/design work. But these are relevant:

| Flow | Purpose | Relevant to |
|------|---------|-------------|
| `github-sync.json` / `github-reporting.json` | Sync GitHub activity, generate reports | SGS repo tracking |
| `cc-oc-update-watcher.json` | Watch for Claude Code + OC updates | Stack hygiene |
| `dashboard-heartbeat.json` | Keep Blub Dashboard (port 5050) alive | Any dashboard-fed work |
| `memory-maintenance.json` | Nightly memory consolidation, blub.db maintenance | Knowledge pipeline health |
| `invoice-*.json` (5 flows) | Invoice pipeline | `/invoice-sgs` skill integration |
| `prayer-*.json` (9 flows) | Prayer times — double-fire incident lesson: one feature = one automation | Not WP, but relevant cross-stack rule |

**Registry:** `a:\.openclaw\flows\registry.sqlite` tracks flow state.

### OC Skills (shared where relevant)

Located in `a:\.openclaw\workspace\skills\`. Most OC-only skills don't apply to SGS work. These ones do:

| Skill | Purpose | Relevant to |
|-------|---------|-------------|
| `dev-workflow` | Development workflow orchestration | Any dev work |
| `pr-reviewer` | PR review automation | SGS releases, client repos |
| `cc-delegate` | Delegate OC → CC work | Cross-stack coordination |
| `session-sync` | Sync session state between CC and OC | When working across both |
| `screenshot` | OC screenshot utility | Visual capture from Blub sessions |
| `evolver-blub` | Propose improvements from captured signals | Self-improvement (approval required) |
| `openclaw-backup` / `openclaw-hardener` | OC ops | Maintaining OC itself |

### OC Gateway & Services

| Service | Type | Port | Purpose |
|---------|------|------|---------|
| BlubGateway | Scheduled Task | 18789 | Main OC gateway — routes messages from all channels |
| BlubRunner | NSSM service | 17891 | Automation Engine runtime |
| BlubDashboard | Scheduled Task | 5050 | Second Brain dashboard (Next.js 15) |
| Cloudflared | NSSM service | - | Cloudflare tunnel for external access |

**Source code:** `A:\src\openclaw\` (pnpm-linked). Updates via `git pull + pnpm install`. Don't edit here unless fixing upstream — edit `A:\.openclaw\` (runtime data) instead.

### CC ↔ OC Coordination

Hooks that keep the two in sync:

| Hook | Direction | Purpose |
|------|-----------|---------|
| `cc-oc-sync.py` | both | Sync shared skills/agents between CC and OC |
| `sync-agent-skills.py` | CC → shared | Propagate CC skill changes to `~/.agents/skills/` |
| `session-sync` skill (OC) | OC → CC | Read CC session state into OC context |

---

## Workflow: Starting a New SGS Client Build

A recommended order of operations using this tooling:

1. `/sgs-discover` or `/research` — find reference sites
2. `/design-ref` — extract design tokens from chosen reference
3. `/sgs-wp-engine` — delegate via `wp-sgs-developer` agent to build site
4. `/wp-blocks` (or `sgs-db.py search`) — check existing block coverage before building new
5. `/wp-scaffold` — if new plugin/theme needed
6. `/wp-theme-check` — validate `theme.json` changes
7. `/visual-qa` — run 8-layer QA
8. `/design-review` — visual/a11y/design system check via `design-reviewer` agent
9. `/a11y-audit` — WCAG 2.2 AA
10. `/wp-perf` — performance audit
11. `/deploy-check` — pre-deploy checklist
12. `/commit-push-pr` — ship

---

## Functional Overlaps to Reconcile

Identified 2026-04-15 during gap-analysis batch prep. Five pairs worth grading together rather than in isolation — the boundary decision often resolves the gaps themselves.

### Inside design sub-skills

| Pair | What they share | Differentiation today | Decision needed |
|------|-----------------|----------------------|-----------------|
| `bolder` + `colourise` | Both amplify visual impact | Bolder covers all dimensions (scale, contrast, weight). Colourise is specifically hue. | Colourise stays as colour specialist of bolder, or colourise absorbs into bolder with a `--mode colour` flag |
| `distill` + `quieter` | Both reduce visual intensity | Distill removes elements entirely. Quieter keeps them but dials down. | Keep boundary explicit (remove vs soften) or merge with a mode flag |
| `audit` + `critique` | Both assess design quality | Audit = systematic checklist with severity. Critique = subjective design-director opinion. | Keep (objective vs subjective lens), differentiate explicitly, or merge |
| `normalize` + `extract` | Both concern design-system alignment | Normalize = align TO existing system. Extract = pull patterns INTO a system. | Directions already clear — confirm disambiguation holds |

### Skill vs agent duplication

| Pair | What they share | Likely resolution |
|------|-----------------|-------------------|
| `design-review` skill + `design-reviewer` agent | Both run design reviews on URLs/screenshots/mockups | Agent should wrap skill (thin-router), or delete one |

### Agent scope overlap

| Pair | What they share | Differentiation |
|------|-----------------|-----------------|
| `design-reviewer` agent + `site-reviewer` agent (design layer) | Both review visual quality | Site-reviewer is 9-layer (design + SEO + perf + a11y + security + UX + content + responsive + smoke). Design-reviewer is purely design — effectively one layer of site-reviewer. Should dispatch |

### Not-duplicates worth mentioning

- **`polish` + `normalize`** — touch adjacent territory but different phases. Polish = final pre-ship finish. Normalize = structural design-system compliance. Keep separate.
- **`sgs-wp-engine` overlaps every WP skill** — intentional. SGS-specific authority layer on top of the WP skills.
- **`wordpress-router` + `wp-project-triage`** — both classify WP repos but different phases (routing vs deep inspection). Keep separate.
- **CSS/Tailwind stack:** `tailwind-design-system` and `interactive-design` share animation ground but different targets (Tailwind-specific vs framework-agnostic motion). Keep separate.

### Batch grading recommendation

For the 35-item gap-analysis pass: grade the 6 overlap batches above as single items, reducing effective evaluations from 35 to ~25-27. Reconcile-then-grade is cheaper than grade-then-reconcile. Boundary decisions often close `ecosystem_awareness` gaps in both members of the pair at once.

---

## Known Gaps / Things Missing from the Stack

- ~~`skillscore-check.py` hook is broken — reports 30% regardless~~ **RESOLVED 2026-04-18** — hook returns accurate scores; the earlier claim was stale.
- **No animation QA mode in `visual-qa`** — FPS / CLS / intersection observer measurement not yet implemented (flagged in 2026-04-08 audit).
- **No "block extension mode" in `sgs-wp-engine`** — `animation-harvest` Stage 5 dispatches to a mode that doesn't exist yet.
- **No "animation analysis mode" in `interactive-design`** — `animation-harvest` Stage 3 dispatches to a mode that doesn't exist yet.
- **`pipeline_runs` table does not exist in `blub.db`** — `sgs-site-clone` REPORT section will fail on first completion.
- **Playwright MCP lacks `record_video`** — `animation-harvest` Path B assumes video recording; redesign needed.
- **`sgs-db.py add-animation` referenced but doesn't exist** — use `sgs-db.py sql` instead.

These are tracked in `C:\Users\Bean\.claude\gap-analysis\reports\2026-04-08-pipeline-audit.md`.
