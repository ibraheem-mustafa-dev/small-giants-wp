# SGS WP / Design / Website Tooling — Audit Workbook

**Purpose:** Living audit of every tool that directly serves SGS WordPress, design, and website work, plus the select few code-quality tools used across those pipelines. Evolves in two phases:

1. **Audit phase (now):** For every in-scope tool, capture USP, optimisation level, usage modes, duplicates, gaps, improvements, and trim/expand verdict. Used to refine the toolset before it powers client engagements.
2. **Reference phase (later):** Once the toolset has been refined, the audit collapses to a condensed one-line `name + when to use` reference.

**Generated:** 2026-04-14 | **Rewritten for scope+audit format:** 2026-04-21 | **Maintained by:** `/sgs-update` + manual audit passes

---

## Scope

**In scope** — tools directly involved in:
- SGS WordPress Framework development (theme, blocks, plugins)
- Design and aesthetic work (blocks, patterns, style variations, animations)
- Website building and review (new builds, migrations, audits, QA, deploy)
- Code quality and reliability for the above (select few — see §4)
- Lifecycle tooling that keeps the toolset itself healthy

**Internal vs external** — two separate sections:
- **Internal** = tools *inside* an SGS pipeline, maintained by Bean
- **External dependencies** = MCPs, CLIs, cloud APIs, plugins — maintained by others but load-bearing for SGS work

**Out of scope — deliberately excluded:**
- Personal / business tools: `/invoice-sgs`, `/grant-draft`, `/grant-track`, `/tub-applications`, `/youtube-publish`, `/yt-transcript`, `/whisper`, `/record`, `/linkedin`, `/morning`, `/status`, `/islamic-fact-checker`, ICD-10 MCP
- Communication: `/telegram-history`, Telegram/Discord MCPs, Gmail/Calendar/Drive/Gamma MCPs
- OS automation: `/windowsagent` suite
- Cross-cutting research not used in design/website pipelines: `/deep-research`, `/research-council`, `/research-couple` (unless invoked specifically for design decisions — captured per-pipeline)
- Meta code-quality not currently used: tools present on disk but not actually invoked during SGS work (flagged in audit with verdict: `DELETE from scope`)

**What "ready for when I start using the system" means:** the toolset has to carry a live client engagement end-to-end without gaps, broken links, or duplicates. Every in-scope tool must earn its place.

---

## How to read this doc

Each in-scope tool has a 7-point audit block:

```
### /tool-name
- **USP:** unique value nothing else provides
- **Optimisation:** well-built / decent / rough / broken / [audit needed]
- **Usage modes:** the different ways to invoke it
- **Duplicates / overlaps:** other tools in the same space → keep / delete / merge / specialise
- **Gaps:** what this tool should cover but doesn't
- **Improvements:** features that would unlock more value
- **Trim / expand verdict:** leave as-is / slim down / add features / consolidate
```

Where data is missing or uncertain, the block shows `[audit needed — Stage 1b]` for the pending Sonnet-batch pass. Bean's handoff plan (`NEXT-SESSION-PROMPT.md`) dispatches those batches in size order.

---

## Pipelines — what tools chain into what outcomes

Eight pipelines or standing workflows run on this toolset. Column 2 lists tools in sequence. Any tool not mapped to at least one pipeline is a candidate for `DELETE from scope`.

| # | Pipeline | Sequence (tools invoked in order) |
|---|----------|-----------------------------------|
| 1 | **New client build** (brief → shipped site) | `/sgs-discover` → `/sgs-extraction` or `/design-ref` → `/sgs-wp-engine` → `/wp-block-themes` + `/wp-block-development` + `/interactive-design` → `/visual-qa` → `/deploy-check` → deploy |
| 2 | **WP → SGS migration** (existing site replica) | `/wp-site-extraction` → `/sgs-extraction` → `/sgs-wp-engine` → `/wp-block-development` → `/design-review` → `/visual-qa` → `/deploy-check` |
| 3 | **Draft → SGS** (HTML/JS/image mockup) | `/design-ref` → `/clone-patterns` → `/sgs-wp-engine` → `/wp-block-development` → `/design-review` → `/visual-qa` → `/deploy-check` |
| 4 | **Audit → redesign proposal** | `/site-reviewer` → `/seo-audit` → `/wp-perf` → `/a11y-audit` → `/gap-analysis` → proposal doc |
| 5 | **Client onboarding** (hosting → live WP) | `/cloudflare-toolkit` → `/vps-deploy` (or Hostinger via SSH) → `/wp-wpcli-and-ops` → style variation → content migration |
| 6 | **QA → deploy** (orchestrated pre-ship) | `/visual-qa` → `/design-review` → `/wp-theme-check` → `/wp-perf-gate` → `/diagnostics` → `/lint` → `/deploy-check` → deploy |
| 7 | **`/build-website` (productised 8-stage)** | URL → extract → patterns → blocks → QA → deploy. Single invocation wraps pipelines 2/3. |
| 8 | **Block development (standing)** | `/wp-blocks` lookup → `/wp-block-development` → `/wp-hooks` → `/diagnostics` → `/lint` → `/visual-qa` (single-block mode) |

**Standing workflows (not pipelines but recurring):**
- **Debug a bug:** `/systematic-debugging` → `/diagnostics` → `/wp-performance` or browser MCP → `/verification-before-completion`
- **Ship a framework update:** build → `/wp-theme-check` → `/gap-analysis` (on skill/agent if touched) → commit → deploy
- **Lifecycle maintenance:** `/lifecycle` → `/skillscore` → `/gap-analysis` → `/docscore` (when editing skills/agents/pipelines)

Tools currently **unmapped** to any pipeline (investigate during Stage 1b): `[TBD — listed after audit pass]`

---

## 1. Internal — WordPress Core Skills

Canonical location: `C:\Users\Bean\.agents\skills\<name>\`. All invocable via `/skill-name`.

### `/wordpress-router`
- **USP:** One entry point for any WP task — classifies the request and dispatches to the right specialist.
- **Optimisation:** [audit needed — Stage 1b]
- **Usage modes:** Direct invocation; auto-routed by `/autopilot` on WP-keyword messages.
- **Duplicates / overlaps:** None — it's the router. Downstream specialists are the 10 skills below.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-project-triage`
- **USP:** Deterministic first-touch inspection of any WP repo (plugin / theme / block theme / core / full site).
- **Optimisation:** [audit needed]
- **Usage modes:** Run once per unfamiliar repo.
- **Duplicates / overlaps:** Overlaps partly with `/wp-site-extraction` (repo vs live site). Different targets — keep both.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-block-development`
- **USP:** Authoritative guide for Gutenberg block dev — `block.json`, attributes, save/edit, serialisation, deprecations.
- **Optimisation:** [audit needed]
- **Usage modes:** Building new blocks; editing existing blocks; deprecation handling.
- **Duplicates / overlaps:** None — the other block skills (`/wp-block-themes`, `/wp-interactivity-api`) cover adjacent but distinct areas.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-block-themes`
- **USP:** `theme.json` authority + templates/patterns/style-variations specialist.
- **Optimisation:** [audit needed]
- **Usage modes:** Block theme development, FSE work, design-token configuration.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-interactivity-api`
- **USP:** `data-wp-*` directives, `@wordpress/interactivity` store/state/actions.
- **Optimisation:** [audit needed]
- **Usage modes:** Interactive blocks (accordions, sliders, nav state, lightboxes).
- **Duplicates / overlaps:** None — but vanilla-JS block patterns might belong in `/wp-block-development` instead. Worth clarifying the boundary.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-plugin-development`
- **USP:** Plugin architecture, hooks, activation/deactivation/uninstall, Settings API, data storage, i18n, security.
- **Optimisation:** [audit needed]
- **Usage modes:** Building plugins (sgs-blocks, sgs-booking, sgs-client-notes, future).
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-rest-api`
- **USP:** `register_rest_route`, controller classes, schema validation, auth.
- **Optimisation:** [audit needed]
- **Usage modes:** Custom REST endpoints for blocks, forms, booking system.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-wpcli-and-ops`
- **USP:** WP-CLI safety patterns — search-replace, db export/import, plugin/theme/user/content management, multisite.
- **Optimisation:** [audit needed]
- **Usage modes:** Site migrations, bulk changes, debugging production state.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-site-extraction`
- **USP:** Reverse-engineer a live WP site via SSH — design system, menus, blocks, CSS, header/footer.
- **Optimisation:** [audit needed]
- **Usage modes:** Starting point of the WP → SGS migration pipeline (Pipeline 2).
- **Duplicates / overlaps:** Partial overlap with `/sgs-extraction` (which works on any URL, not just WP via SSH). Specialise each — keep both.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-performance`
- **USP:** Static code review (grep-based anti-patterns) + runtime profiling (WP-CLI profile/doctor, Query Monitor).
- **Optimisation:** [audit needed]
- **Usage modes:** Pre-deploy static scan; post-deploy runtime profile.
- **Duplicates / overlaps:** Overlaps with `/wp-perf` (which adds Core Web Vitals) and `/wp-perf-gate` (PreToolUse gate). **Investigate:** do we need three perf tools or can they merge?
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Flag for consolidation decision.

### `/wp-abilities-api`
- **USP:** Bleeding-edge WP Abilities API (`wp_register_ability`, `/wp-json/wp-abilities/v1/*`).
- **Optimisation:** [audit needed]
- **Usage modes:** Experimental work only.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Potential `DELETE from scope` until Abilities API is GA — flag for decision.

---

## 2. Internal — SGS Framework Skills

### `/sgs-wp-engine`
- **USP:** Central authority for SGS Framework — blocks, theme, QA, mockup-to-blocks, client onboarding. SQLite KB with 619 attributes + 55 blocks + 25 tokens + 25 patterns.
- **Optimisation:** Well-built (has the KB + 33 reference docs + 12 scripts per project CLAUDE.md).
- **Usage modes:** Any SGS work starts here; KB queryable via `python sgs-db.py`.
- **Duplicates / overlaps:** None — it's the framework anchor.
- **Gaps:** [audit needed — does the KB stay fresh? Is `/sgs-update` reliably invoked?]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Likely keep, maybe split ops scripts into separate skill.

### `/build-website`
- **USP:** Productised 8-stage pipeline — URL → shipped SGS site. Three input modes: single URL, multi-source mix, discovery.
- **Optimisation:** Only productised pipeline of the six per handoff — **revenue unlock depends on the other five.**
- **Usage modes:** Full client replication from existing site.
- **Duplicates / overlaps:** Overlaps with `/clone-patterns` (its own stage 5). Correct containment — keep both.
- **Gaps:** Known reliability issues from handoff: corrupted images, broken CSS, lost styles. Pipeline A2 includes hash verification + CSS comparison + visual diff at 3 breakpoints.
- **Improvements:** Already scoped in master feature audit.
- **Trim / expand verdict:** Keep + expand reliability layer.

### `/sgs-discover`
- **USP:** Search galleries (Awwwards, Siteinspire, Dribbble, Godly, CSS Design Awards).
- **Optimisation:** [audit needed]
- **Usage modes:** Reference-site discovery before a client build.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed — does it cover animation galleries for `/animation-harvest`?]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/sgs-extraction`
- **USP:** Any-URL design-system capture — HTML + tokens + DOM. Coordinates `html-capture.js` + `design-extract.py` + Gemini Vision.
- **Optimisation:** [audit needed]
- **Usage modes:** Stage 1 of Pipelines 1/2/3.
- **Duplicates / overlaps:** `/design-ref` does similar two-pass extraction. **Investigate:** merge or specialise?
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Flag for merge decision with `/design-ref`.

### `/sgs-email-branding`
- **USP:** Apply SGS brand tokens to email templates.
- **Optimisation:** [audit needed]
- **Usage modes:** Client email templates, transactional emails, newsletters.
- **Duplicates / overlaps:** Partial overlap with `/email-html-builder`. Different layers — keep.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/sgs-update`
- **USP:** Re-scan codebase and refresh the 619-attribute KB.
- **Optimisation:** [audit needed — is it invoked reliably?]
- **Usage modes:** After any changes to blocks, tokens, patterns.
- **Duplicates / overlaps:** None.
- **Gaps:** Not auto-fired on block edits — relies on manual invocation.
- **Improvements:** Hook into PostToolUse for `plugins/sgs-blocks/**/*.{php,json}` edits.
- **Trim / expand verdict:** Expand — auto-fire on block changes.

### `/design-tokens`
- **USP:** Sync design tokens between SGS database and `theme.json`.
- **Optimisation:** [audit needed]
- **Usage modes:** Changing global colours/fonts/spacing in the framework.
- **Duplicates / overlaps:** Partial overlap with `/sgs-update` (which re-scans tokens) and `/wp-block-themes` (which writes theme.json). Clear boundary: this is the bidirectional sync.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-blocks` (CLI + skill)
- **USP:** Search WordPress + SGS blocks, schemas, attributes, markup, variations. Backed by `wp-blocks.py` — replaced the `wp-blockmarkup` and `sgs-blockmarkup` MCP servers.
- **Optimisation:** [audit needed]
- **Usage modes:** Before building a new block — check if one exists.
- **Duplicates / overlaps:** None, but data source overlaps with `/sgs-wp-engine` KB. Investigate consolidation.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-docs` (CLI)
- **USP:** WordPress hooks, docs, and API query CLI. Backed by `wp-docs.py` — replaced the `wp-devdocs` MCP server. Query any WP hook, filter, or API function offline.
- **Optimisation:** [audit needed]
- **Usage modes:** Before writing `add_action`/`add_filter`; before calling any WP API function.
- **Duplicates / overlaps:** Adjacent to `/wp-hooks` (which inspects 7,283 hooks from a verified DB). Different layers — `/wp-docs` covers docs + API surface, `/wp-hooks` covers hook dependency graphs.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/clone-patterns`
- **USP:** URL → SGS WP block-pattern PHP files via Gemini Vision + Playwright. Core engine is `wp-pattern-gen.py`.
- **Optimisation:** [audit needed]
- **Usage modes:** Stage 5 of `/build-website`; standalone when only pattern files needed.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

---

## 3. Internal — Design & Aesthetic

### `/innovative-design`
- **USP:** Design-quality router — dispatches to the right sub-skill (and loads `/ui-ux-pro-max` when option-generation is needed).
- **Optimisation:** [audit needed]
- **Usage modes:** Unclear design requests auto-route here.
- **Duplicates / overlaps:** None — it's the router. Sub-skills are the 20+ below.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/interactive-design`
- **USP:** Animations, micro-interactions, motion effects with purposeful motion design.
- **Optimisation:** [audit needed]
- **Usage modes:** Adding movement to a block or page; works with `/animation-harvest` output.
- **Duplicates / overlaps:** Partial overlap with `/animation-harvest` (harvest finds, interactive-design applies). Clear boundary.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/frontend-design`
- **USP:** Production-grade frontend UI that avoids generic AI aesthetics.
- **Optimisation:** Shipped as a Claude Code plugin (not a local skill). Frontend-design-plugin.
- **Usage modes:** Building distinctive UI from scratch.
- **Duplicates / overlaps:** Sits above the palette tools (`/ui-ux-pro-max`, `/superdesign`). Clear boundary.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/ui-ux-pro-max`
- **USP:** Design intelligence DB — 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks.
- **Optimisation:** [audit needed]
- **Usage modes:** Picking a visual direction at project start.
- **Duplicates / overlaps:** Adjacent to `/superdesign` (which is smaller reference lookup). Different depths — keep both.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/superdesign`
- **USP:** Compact design quality rules — OKLCH colour theory, typography hierarchy, spacing rhythm (4px base), animation micro-syntax with exact timing values, shadow scale with opacity limits, aesthetic grading (A+ to D). Loaded as passive inline context by evaluation skills (`/gap-analysis`, `/design-review`, `/visual-qa`, `/critique`, `/site-reviewer`) — no query needed.
- **Optimisation:** `user-invocable: false` — auto-loaded by evaluation skills, never invoked directly.
- **Usage modes:** Passive — auto-loaded as evaluation context. Not manually invoked.
- **Duplicates / overlaps:** `/ui-ux-pro-max` has 335 quality-rule rows (74 typography + 99 UX guidelines + 162 reasoning rules) that overlap in content, but the access pattern is completely different: `/ui-ux-pro-max` requires an active Python CLI query; superdesign loads instantly as inline context. They serve different pipeline moments.
- **Gaps:** Rules are hand-curated, not DB-driven — can drift from `/ui-ux-pro-max` over time.
- **Improvements:** Future path: `/ui-ux-pro-max` exports an `evaluation-rules.md` from its quality-rule rows that replaces this file. Until that export is built, keep superdesign as-is.
- **Trim / expand verdict:** Keep as passive evaluation context. Do NOT merge into `/ui-ux-pro-max` until the export path exists.

### `/tailwind-design-system`
- **USP:** Tailwind CSS v4 design systems, tokens, responsive patterns.
- **Optimisation:** [audit needed]
- **Usage modes:** Tailwind-based projects (Next.js apps, not SGS WP).
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Mostly out of SGS WP pipeline — may only be needed for Next.js clients. Flag for scope decision.

### `/style-replicator`
- **USP:** Extract and replicate design/style patterns from a reference site.
- **Optimisation:** [audit needed]
- **Usage modes:** Matching an existing brand or reference.
- **Duplicates / overlaps:** **Significant overlap with `/design-ref` and `/sgs-extraction`.** Decision needed: three tools do similar extraction — keep all, merge, or specialise?
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Flag for three-way merge/specialise decision.**

### `/design-ref`
- **USP:** Two-pass design extraction (Playwright CSS + Gemini Vision) → `theme.json`-compatible output with confidence scores.
- **Optimisation:** Has structured output with confidence scoring — **best-optimised of the three extractors**.
- **Usage modes:** Pulling design tokens from any URL.
- **Duplicates / overlaps:** With `/sgs-extraction` and `/style-replicator`. This one has the richest output.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Likely becomes the canonical extractor — absorb from the other two.**

### `/teach-impeccable`
- **USP:** One-time project setup to gather design context and save to AI config.
- **Optimisation:** [audit needed]
- **Usage modes:** Project kickoff.
- **Duplicates / overlaps:** Partial with `/project-init` (out of scope). Clarify boundary.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/adapt`, `/bolder`, `/quieter`, `/colourise`, `/delight`, `/distill`, `/extract`, `/normalize`, `/onboard`, `/optimise`, `/polish`, `/harden`, `/clarify`

These 13 are modifier skills — each takes an existing design and adjusts one axis (louder, quieter, simpler, more joyful, etc.).

- **USP (collective):** Surgical single-axis design modifications.
- **Optimisation:** [audit needed — per skill]
- **Usage modes:** Invoked after initial design is in place; chained by `/innovative-design` router.
- **Duplicates / overlaps:** By design each one is different — BUT the 13 sit together and may deserve reorganisation (e.g. merge closely-adjacent pairs).
  - `/bolder` ↔ `/quieter` — inverse pair, keep separate.
  - `/optimise` vs `/polish` — both pre-ship; investigate overlap.
  - `/distill` vs `/normalize` vs `/extract` — all simplifying, different cuts; investigate.
- **Gaps:** No accessibility-specific modifier (`/accessible` would round out the set).
- **Improvements:** Standardise interface across all 13 — currently inconsistent.
- **Trim / expand verdict:** **Batch audit all 13 together in Stage 1b — decision pending.**

---

## 4. Internal — Design Review, QA, Code Quality (select few)

### `/design-review`
- **USP:** Review any URL / screenshot / HTML mockup for visual quality, WCAG 2.2 AA, design-system consistency, responsive behaviour, brand alignment.
- **Optimisation:** [audit needed]
- **Usage modes:** Pre-ship gate on any design work.
- **Duplicates / overlaps:** With `/visual-qa` (SGS-specific) and `/critique` (subjective-only) and `/audit` (whole-interface sweep). Different layers — keep all.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/visual-qa`
- **USP:** SGS 8-layer visual QA pipeline with Quick / Full / Compare modes.
- **Optimisation:** Tuned for SGS — uses the framework's scripts (responsive screenshots, element-extractor, global-css-diff, run-audit).
- **Usage modes:** Production QA pre-deploy; `/compare` for A/B or migration.
- **Duplicates / overlaps:** Superset of `/design-review` for SGS contexts. Keep both — `/design-review` for any project, `/visual-qa` for SGS.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/critique`
- **USP:** Subjective design effectiveness — visual hierarchy, IA, emotional resonance.
- **Optimisation:** [audit needed]
- **Usage modes:** "Is this design any good?" gut check with structure.
- **Duplicates / overlaps:** With `/design-review` (objective). Different — keep both.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/audit`
- **USP:** Whole-interface sweep — accessibility + performance + theming + responsive.
- **Optimisation:** [audit needed]
- **Usage modes:** Quarterly audits; after major refactors.
- **Duplicates / overlaps:** With `/site-reviewer` (9-layer for any URL). Likely merge candidate — `/site-reviewer` is broader.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Flag for merge with `/site-reviewer`.**

### `/site-reviewer`
- **USP:** 9-layer audit pipeline for any URL — design + SEO + performance + a11y + security + UX + content/trust.
- **Optimisation:** [audit needed]
- **Usage modes:** Pipeline 4 (audit → redesign). Universal review.
- **Duplicates / overlaps:** Superset of `/audit`. Merge target.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep as canonical; absorb `/audit`.

### `/gap-analysis`
- **USP:** Grade any target 0–5 with opportunity detection and S-grade screen.
- **Optimisation:** Enforced via `gap-analysis-gate.py` hook after skillscore passes.
- **Usage modes:** Mandatory post-skillscore step for any skill/agent/pipeline edit.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep — infrastructure.

### `/a11y-audit` and `/accessibility-scan`
- **USP:** WCAG 2.2 AA audit on URL / HTML / colour contrast (a11y-audit); deeper axe-core integration (accessibility-scan).
- **Optimisation:** [audit needed]
- **Usage modes:** Pre-deploy a11y gate.
- **Duplicates / overlaps:** Direct overlap — **investigate merge.**
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Flag for merge.**

### `/wp-perf`, `/wp-perf-gate`, `/wp-performance`
- **USP (collective):** Full-stack WP performance — static (`wp-performance`), runtime (`wp-perf`), pre-commit gate (`wp-perf-gate`).
- **Optimisation:** [audit needed — three tools is likely too many for one domain]
- **Usage modes:** Dev / pre-deploy / in-production.
- **Duplicates / overlaps:** Three tools, high overlap.
- **Gaps:** [audit needed]
- **Improvements:** Consolidate under a single `/wp-perf` with modes (`static`, `runtime`, `gate`).
- **Trim / expand verdict:** **Flag for three-way consolidation.**

### `/wp-theme-check`
- **USP:** Validate `theme.json` against a WP version — deprecated + v3-only features.
- **Optimisation:** [audit needed]
- **Usage modes:** Before pushing `theme.json` changes.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-scaffold`
- **USP:** Generate SGS-standards plugin skeleton with security, PHPStan, i18n.
- **Optimisation:** [audit needed]
- **Usage modes:** New plugin work.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/wp-hooks` and `/wp-hook-graph`
- **USP:** Search/validate/inspect 7,283 WP hooks (wp-hooks); visualise dependency graph (wp-hook-graph).
- **Optimisation:** wp-hooks has a verified DB — well-optimised.
- **Usage modes:** Before writing `add_action` / `add_filter`; during complex-plugin analysis.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### Code quality (select few)

These are the code-quality tools that ARE actively used in SGS WP work. Anything not listed here is out of scope.

| Tool | USP | Usage | Duplicate? | Verdict |
|------|-----|-------|------------|---------|
| `/diagnostics` | Read VS Code Problems panel via `mcp__ide__getDiagnostics` — all LSP/linter findings without re-running | Before every commit; after every code edit | None — LSP state is authoritative | Keep — infrastructure |
| `/lint` | Routes file to correct CLI linter (eslint+prettier, phpcbf+phpcs, ruff) with autofix | After `/diagnostics` surfaces fixable issues | Pair with `/diagnostics` — clear split | Keep |
| `/review` | Code review for best practices | Before merging branches, during PR prep | Overlaps with `pr-reviewer` agent. Investigate. | Flag for overlap check |
| `/wp-perf-gate` | PreToolUse gate blocks commits with anti-patterns | Auto-fires on PHP/JS edits in SGS contexts | See perf consolidation above | Consolidate |
| `systematic-debugging` skill | Force root-cause diagnosis before fix | Any bug | None | Keep |
| `verification-before-completion` skill | Gate that forces verification before claiming done | Before marking any task complete | None | Keep — critical for Bean's autonomy trajectory |
| `test-driven-development` skill | TDD rhythm for features and bugfixes | Feature/bugfix work | None | Keep but audit usage — is it actually invoked? |
| `pr-reviewer` agent | Automated PR review with structured output | PR creation | Overlaps with `/review` | Flag for merge with `/review` |
| `requesting-code-review` skill | Before merging, verify work meets requirements | Pre-merge self-check | None | Keep |
| `receiving-code-review` skill | Handle incoming review feedback | When feedback arrives | None | Keep |

Out-of-scope code-quality tools (NOT loaded into SGS pipelines — delete reference from this doc): `using-git-worktrees`, `finishing-a-development-branch`, `vercel-react-best-practices` (except when working on Next.js client projects).

---

## 5. Internal — Browser Testing & Capture

### `/playwright`
- **USP:** Scripted multi-step browser automation — navigate, screenshot, form fill, a11y audits, multi-breakpoint loops.
- **Optimisation:** Prefer CLI over MCP for systematic runs per user rules.
- **Usage modes:** Multi-breakpoint screenshot runs, accessibility audits, full QA test suites.
- **Duplicates / overlaps:** With playwright MCP (one-off inline checks). Clear split.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep — critical for visual-qa and site-reviewer.

### `/screenshot`
- **USP:** Cross-platform screenshot utility.
- **Optimisation:** [audit needed]
- **Usage modes:** One-off captures (not systematic).
- **Duplicates / overlaps:** Partial with `/playwright`. Different job — keep.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `chrome-devtools-mcp` suite — `chrome-devtools`, `a11y-debugging`, `debug-optimize-lcp`, `troubleshooting`
- **USP:** Live Chrome DevTools Protocol access — network, Lighthouse, performance traces, a11y debug, LCP optimisation.
- **Optimisation:** [audit needed]
- **Usage modes:** Runtime debugging; LCP optimisation; a11y tree inspection.
- **Duplicates / overlaps:** With playwright MCP (different layer — Playwright automates, DevTools inspects).
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep.

### `/superpowers-chrome` / `browsing`
- **USP:** Persistent Chrome CDP session with auto-capture (different MCP from chrome-devtools).
- **Optimisation:** [audit needed]
- **Usage modes:** Controlling existing browser sessions; multi-tab work.
- **Duplicates / overlaps:** With chrome-devtools MCP.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Flag for overlap decision with chrome-devtools-mcp.**

---

## 6. Internal — Supporting (in-scope)

### `/image-optimiser`
- **USP:** Optimise images for web/app/print. WebP/AVIF conversion + compression + format selection.
- **Optimisation:** [audit needed]
- **Usage modes:** Pre-upload media processing; post-export from mockup.
- **Duplicates / overlaps:** None — sharp-cli / ImageMagick are the external tools it wraps.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/animation-harvest`
- **USP:** 8-stage pipeline — extract web animations, modularise into reusable SGS framework components.
- **Optimisation:** [audit needed]
- **Usage modes:** Building the SGS animation library from inspiration.
- **Duplicates / overlaps:** None — pairs with `/interactive-design` (harvest → apply).
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/email-html-builder`
- **USP:** Production email templates with semantic HTML/CSS compatible across Gmail / Outlook / Apple Mail / Yahoo / ProtonMail.
- **Optimisation:** [audit needed]
- **Usage modes:** Client emails; transactional; newsletters.
- **Duplicates / overlaps:** With `/sgs-email-branding` (brand layer). Clear split — keep both.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/nano-banana-pro` (`/generate`)
- **USP:** Gemini CLI image generation — thumbnails, icons, diagrams, patterns, illustrations.
- **Optimisation:** [audit needed]
- **Usage modes:** Generating assets without external images.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

### `/research`, `/search`, `/library-docs`
- **USP:** Research entry point (auto-tiered) / unified web search / library-docs lookup.
- **Optimisation:** [audit needed]
- **Usage modes:** Any design/tech research during SGS work.
- **Duplicates / overlaps:** Clear three-way split — research (tier selection), search (web), library-docs (Context7 replacement).
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep all three.

### `/handoff`
- **USP:** Generate session handoff summary.
- **Optimisation:** [audit needed]
- **Usage modes:** End of every session.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep — infrastructure.

### `/deploy-check`, `/deploy-nextjs`
- **USP:** Pre-deployment checklist — WP (deploy-check) / Next.js (deploy-nextjs).
- **Optimisation:** [audit needed]
- **Usage modes:** Before pushing to staging/production.
- **Duplicates / overlaps:** None.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep.

---

## 7. Internal — Lifecycle (maintains the toolset itself)

### `/lifecycle`
- **USP:** Single entry point for create/edit/audit/grade of skills/agents/pipelines/commands/routers. Sub-skills (`skill-writer`, `agent-writer`, `pipeline-writer`, etc.) locked behind it.
- **Optimisation:** Enforced by `lifecycle-gate.py` hook.
- **Usage modes:** Any skill/agent/pipeline work.
- **Duplicates / overlaps:** None — it's the router.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep — infrastructure.

### `/skillscore` (and `/docscore`)
- **USP:** Structural validator for skills/agents/pipelines (skillscore) and project docs (docscore).
- **Optimisation:** Auto-fires via PostToolUse hook after skill edits.
- **Usage modes:** Post-edit gate; pre-merge check.
- **Duplicates / overlaps:** None.
- **Gaps:** Bean's 2026-04-11 lesson — skillscore pass ≠ content quality. Gap-analysis must follow.
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep both.

### `skill-writer`, `skill-auditor`, `skill-optimiser`, `skill-router-writer` (sub-skills, locked)
- **USP:** Full skill lifecycle — create / audit / optimise / specialise-into-routers.
- **Optimisation:** [audit needed]
- **Usage modes:** Dispatched by `/lifecycle` only.
- **Duplicates / overlaps:** None — different phases.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep — infrastructure.

### `agent-writer`, `agent-auditor`, `agent-optimiser` (sub-skills, locked)
- Same as above but for agents.

### `pipeline-writer`, `pipeline-optimiser`, `command-writer` (sub-skills, locked)
- Same as above but for pipelines and slash commands.

### `batch-gap-analysis`
- **USP:** Grade multiple artefacts in one pass (needed for this audit's Stage 1c).
- **Optimisation:** [audit needed]
- **Usage modes:** Audit mode only.
- **Duplicates / overlaps:** With `/gap-analysis` (single-target). Clear split.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** Keep.

### `brainstorming`, `strategic-plan`, `phase-planner`, `subagent-driven-development`, `subagent-prompt`, `executing-plans`, `dispatching-parallel-agents`
- **USP:** Process scaffolding for multi-step work — design decisions, roadmaps, phase execution, subagent dispatch.
- **Optimisation:** [audit needed]
- **Usage modes:** Any complex or multi-step task.
- **Duplicates / overlaps:** Batch-audit this cluster in Stage 1b — likely 1–2 consolidations.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** **Batch-audit cluster.**

### `research-check`, `research-buddies`, `research-pipeline` (agent)
- **USP:** Research tiers — quick (check), cutting-edge + practical (buddies), orchestrated (pipeline).
- **Optimisation:** [audit needed]
- **Usage modes:** Called from `/research` router.
- **Duplicates / overlaps:** `research-council` and `research-couple` deliberately excluded from scope (non-SGS use cases). Kept: check, buddies, pipeline.
- **Gaps:** [audit needed]
- **Improvements:** [audit needed]
- **Trim / expand verdict:** [audit needed]

---

## 8. External Dependencies

These aren't Bean's tools — they're third-party MCPs, CLIs, APIs, and plugins the internal toolset depends on. They're tracked here because a breaking change in any of them breaks a pipeline stage.

### MCP servers

| MCP | Provides | Load-bearing for |
|-----|----------|-----------------|
| `playwright` | Browser automation (navigate, screenshot, snapshot, click, type, evaluate, console messages, resize) | `/visual-qa`, `/design-review`, `/site-reviewer`, QA pipelines |
| `chrome-devtools` | CDP — network, Lighthouse, performance traces, a11y tree | LCP debugging, performance audits |
| `github` | PRs, issues, code search, releases | Deployment, PR workflow |
| `firecrawl` | Scrape/search/crawl with clean markdown | `/search` fallback, `/research` |
| `context7` (replaced by `/library-docs`) | Library docs + examples | Any library API lookup |

### Out-of-scope MCPs (installed but not used in SGS pipelines): Gmail, Google Calendar, Google Drive, Gamma, Discord, SerpAPI, ICD-10.

### CLI tools

| Tool | Version | Role |
|------|---------|------|
| `gh` | 2.87.3 | All GitHub ops — PRs, releases, issues, `gh api` |
| `wp` | via SSH on Hostinger | WP-CLI ops on live site (not locally installed — flagged in earlier scan) |
| `playwright` | 1.58.2 | Global CLI (alternate to MCP) |
| `phpcs` / `phpcbf` | via Composer | PHP linting + autofix (WordPress standards) |
| `composer` | — | PHP package manager (in SGS plugin dev) |
| `npm` / `node` | — | JS package manager / runtime (block builds) |
| `ffmpeg` | via Chocolatey | Video processing (if YT pipeline is invoked) |
| `sharp-cli` | via npm | Image processing backend for `/image-optimiser` |
| ImageMagick | 7.1.2 | Alternative image processing |
| `skillscore` | local wrapper | Skill/agent/pipeline validator |

### Cloud APIs (keys in `A:/.openclaw/.env` → migrated to `C:/Users/Bean/.openclaw/.env` per 2026-04-19 rule — verify)

| API | Free tier | Used by |
|-----|-----------|--------|
| Brave Search | 1000/mo | `/search` (primary) |
| Firecrawl | — | `/search`, `/research` |
| Tavily | — | `/search`, `/research` |
| SerpAPI | 100/mo | `/search` (fallback) |
| Gemini (CLI + API) | free tier | `/nano-banana-pro`, Gemini Vision in extractors, `/gemini-analyser` |
| Cerebras | free tier | `/cerebras` (Qwen-3-235b @ 1400 t/s) |

### Claude Code plugins (in-scope only)

Frontend-design, playground, nano-banana-pro, firecrawl, playwright, superpowers-chrome, chrome-devtools-mcp, commit-commands, feature-dev, code-simplifier, claude-md-management, typescript-lsp, php-lsp, elements-of-style, episodic-memory, security-guidance, github, supabase, bean-tools.

### Auto-firing hooks (in-scope for SGS work)

| Hook | Trigger | Action |
|------|---------|--------|
| `wpcs-lint.py` | PostToolUse on PHP edits | Runs phpcs with WP standards |
| `wp-perf-review.py` | PostToolUse on PHP/JS edits | Scans for perf anti-patterns |
| `sgs-validate.py` | PostToolUse on edits in SGS repo | SGS-specific validation |
| `lifecycle-gate.py` | PreToolUse on skill/agent edits | Blocks direct edits outside `/lifecycle` |
| `gap-analysis-gate.py` | Stop hook | Enforces grading |
| `pipeline-stage-gate.py` | During lifecycle pipelines | Enforces stage ordering |
| `skillscore-check.py` | PostToolUse on skill edits | Runs skillscore silently |
| `sync-agent-skills.py` | PostToolUse | Syncs agents/skills cross-reference |
| `skill-outcome-logger.py` | PostToolUse | Logs outcomes for skill-optimiser |

---

## 9. Custom Subagents (in-scope)

| Agent | Speciality | Dispatch when |
|-------|-----------|---------------|
| `wp-sgs-developer` | All SGS WP build/QA work | ALWAYS for SGS heavy lifting (mandated by project CLAUDE.md) |
| `design-reviewer` | Visual quality, WCAG 2.2 AA, design-system consistency | Pre-ship design reviews |
| `site-reviewer` | Universal 9-layer site audit | Pipeline 4 (audit → redesign) |
| `performance-auditor` | Next.js perf (not WP — use `/wp-performance` for WP) | Next.js client projects |
| `research-pipeline` | Orchestrated research | Multi-source research questions |
| `search-conversations` | Search past conversations | Finding prior decisions |
| `test-and-explain` | Test results + plain-English explanation | After feature/fix work |
| `gemini-analyser` | Zero-cost structured analysis | Bulk per-item profiling (Stage 1b of this audit) |
| `cerebras-agent` | Zero-cost LLM delegation | Simple classification, bulk text tasks |
| `Explore` (built-in Haiku) | Fast codebase search | Scoping unfamiliar code |
| `Plan` (built-in) | Plan design in plan mode | Plan-phase only |
| `general-purpose` | Complex multi-step tasks | Fallback for multi-tool work |

---

## Appendix A — Tool-type flat list (alphabetical)

### Skills (internal)
`/a11y-audit`, `/accessibility-scan`, `/adapt`, `/animation-harvest`, `/audit`, `/batch-gap-analysis`, `/bolder`, `/brainstorming`, `/clarify`, `/clone-patterns`, `/colourise`, `/critique`, `/delight`, `/design-ref`, `/design-review`, `/design-tokens`, `/dispatching-parallel-agents`, `/distill`, `/email-html-builder`, `/executing-plans`, `/extract`, `/frontend-design`, `/gap-analysis`, `/handoff`, `/harden`, `/image-optimiser`, `/innovative-design`, `/interactive-design`, `/library-docs`, `/nano-banana-pro`, `/normalize`, `/onboard`, `/optimise`, `/phase-planner`, `/playwright`, `/polish`, `/quieter`, `/receiving-code-review`, `/requesting-code-review`, `/research`, `/research-buddies`, `/research-check`, `/screenshot`, `/search`, `/sgs-discover`, `/sgs-email-branding`, `/sgs-extraction`, `/build-website`, `/sgs-update`, `/sgs-wp-engine`, `/site-reviewer`, `/strategic-plan`, `/style-replicator`, `/subagent-driven-development`, `/subagent-prompt`, `/superdesign`, `/systematic-debugging`, `/tailwind-design-system`, `/teach-impeccable`, `/test-driven-development`, `/ui-ux-pro-max`, `/verification-before-completion`, `/visual-qa`, `/wp-abilities-api`, `/wp-block-development`, `/wp-block-themes`, `/wp-blocks`, `/wp-hooks`, `/wp-hook-graph`, `/wp-interactivity-api`, `/wp-perf`, `/wp-perf-gate`, `/wp-performance`, `/wp-plugin-development`, `/wp-project-triage`, `/wp-rest-api`, `/wp-scaffold`, `/wp-site-extraction`, `/wp-theme-check`, `/wp-wpcli-and-ops`, `/wordpress-router`

### Slash commands (not covered by skills above)
`/cerebras`, `/gemini`, `/gemini-flash`, `/gemini-pro`, `/diagnostics`, `/lint`, `/review`, `/dev`, `/lifecycle`, `/skillscore`, `/docscore`, `/deploy`, `/update-architecture`, `/where-am-i`, `/delegate`

### Sub-skills (locked behind `/lifecycle`)
`agent-auditor`, `agent-optimiser`, `agent-writer`, `command-writer`, `pipeline-optimiser`, `pipeline-writer`, `skill-auditor`, `skill-optimiser`, `skill-router-writer`, `skill-writer`

### Agents (custom subagents)
cerebras-agent, design-reviewer, gemini-analyser, performance-auditor, project-manager, research-pipeline, search-conversations, site-reviewer, test-and-explain, wp-sgs-developer

### Deliberately excluded from scope
See §Scope above for the full out-of-scope list. Audit passes do not touch these; they're tracked in the global portfolio, not here.

---

## Appendix B — Audit status dashboard

| Section | Tools | Audit populated | [audit needed] blocks |
|---------|-------|-----------------|---------------------|
| 1. WP Core | 11 | 0 | 11 |
| 2. SGS Framework | 9 | 2 | 7 |
| 3. Design & Aesthetic | 22 | 4 | 18 |
| 4. Design Review / QA / Code Quality | 17 | 3 | 14 |
| 5. Browser | 6 | 1 | 5 |
| 6. Supporting | 10 | 0 | 10 |
| 7. Lifecycle | 13 | 3 | 10 |
| 8. External deps | — | fully enumerated | — |
| 9. Agents | 12 | fully enumerated | — |

**Next action:** Stage 1b — dispatch Sonnet batches per handoff plan (bottom-up: simple implementation skills → composites → research → pipelines → meta-orchestrators). Each batch reads actual source files and populates the 7-point audit per tool.

## Appendix C — Known duplicate/merge flags (surfaced during this rewrite)

Rows pre-seeded for Stage 1c decision table. Each needs KEEP / MERGE / SPLIT / DELETE verdict.

1. `/sgs-extraction` ↔ `/design-ref` ↔ `/style-replicator` — three design extractors. Likely: `/design-ref` absorbs the other two.
2. `/wp-perf` ↔ `/wp-perf-gate` ↔ `/wp-performance` — three perf tools. Likely: one tool with `static` / `runtime` / `gate` modes.
3. `/a11y-audit` ↔ `/accessibility-scan` — two a11y tools. Likely merge.
4. `/audit` ↔ `/site-reviewer` — `site-reviewer` is the superset.
5. `/review` (command) ↔ `pr-reviewer` (agent) — review tools, different layers; confirm or merge.
6. `/superdesign` ↔ `/ui-ux-pro-max` — reference-lookup overlap; investigate.
7. `/chrome-devtools-mcp` ↔ `/superpowers-chrome` — two CDP-based tools, overlap.
8. The 13 modifier skills (`/adapt`, `/bolder`, `/quieter`, `/colourise`, `/delight`, `/distill`, `/extract`, `/normalize`, `/onboard`, `/optimise`, `/polish`, `/harden`, `/clarify`) — interface consistency + possible pair merges (distill / normalize / extract).
9. Planning-process cluster (`/brainstorming`, `/strategic-plan`, `/phase-planner`, `/subagent-driven-development`, `/subagent-prompt`, `/executing-plans`, `/dispatching-parallel-agents`) — audit for 1–2 consolidations.

## Appendix D — Known gaps (surfaced during this rewrite)

1. **No auto-invoke of `/sgs-update`** on block edits — relies on manual invocation.
2. **No accessibility-specific modifier** in the 13 design modifier skills — would round out the set.
3. **No productised equivalent of `/build-website`** for the other 5 pipelines (new-build, draft→SGS, audit→redesign, client-onboarding, QA→deploy). This is the revenue unlock per handoff.
4. **`/wp-abilities-api`** — maybe premature (Abilities API not GA). Scope decision.
5. **Cloud-API key location** — migrated to `C:/Users/Bean/.openclaw/.env` per 2026-04-19 rule; verify no references still point at `A:/.openclaw/.env`.

---

## Appendix E — 2026-04-21 Recon Update (from small-giants-studio session)

**Master spec:** see `docs/plans/2026-04-21-toolset-spec-from-sgs-studio-session.md` — 12-section spec with 13-pipeline architecture + effectiveness rubric + change/improve/add/subtract recommendations.

**Deferred pipelines:** see `docs/plans/2026-04-21-non-essential-pipelines-deferred.md` — P8/P10/P11/P13 and their dependencies.

### Confirmed facts (supersede `[audit needed]` blocks for these skills)

| Skill/command | Confirmed scope | Verified status |
|---|---|---|
| `/innovative-design` | Tier 1 orchestrator, owns 19 sub-skills (Phase 0-5) | user-invocable:true |
| `/interactive-design` | Tier 3, owned by /innovative-design | user-invocable:**false** (not user-facing) |
| `/frontend-design` | Shared aesthetic reference loaded by modifiers — **absorb candidate** into /innovative-design/references/ | user-invocable:true but redundant |
| `/ui-ux-pro-max` (= `/uimax`) | Cross-cutting queryable reference DB — **11,925+ rows, 16 stack CSVs**, NOT a sub-skill. Call at every design decision. | spine infrastructure |
| `/superdesign` | Auto-loaded by evaluation skills — typography/OKLCH/spacing/animation reference | user-invocable:**false**, Tier 5 infrastructure |
| `/style-replicator` | **VOICE/CONTENT skill, NOT design** — generates in Bean's authentic writing voice. Tooling-doc misclassification corrected. | reclassify to content domain |
| `/design-ref` | Pipeline type (frontmatter). Two-pass CSS + Gemini Vision, theme.json-compatible output with confidence scores. Best-optimised of the 3 extractors for TOKENS | Tier 2 coordinator |
| `/sgs-extraction` | Pipeline type. Captures HTML + DOM + **also tokens via design-extract.py**. Boundary per SKILL.md line 47: **"this skill captures, it does not interpret"** — capture-vs-interpret, not raw-vs-token | Tier 2 coordinator — 4 factual errors flagged (see captured lesson 151) |
| `/visual-qa` | Pipeline type, **SGS-only** (frontmatter line 8: "for non-SGS use /design-review"). 8-layer mockup-vs-build QA | Tier 1 orchestrator |
| `/design-review` | **Non-SGS** design audit (mirror of visual-qa scope-wise). 3-stage dispatcher to design-reviewer agent | Tier 2 coordinator (not full pipeline as this doc previously implied) |
| `/site-reviewer` | Universal **9-layer site audit** (any URL/stack). Broader than design-review. NOT redundant with either design-review or visual-qa | Tier 1 orchestrator — keep |
| `/animation-harvest` | Pipeline type (frontmatter line 3 confirmed: `type: pipeline`). 8 stages | Tier 1 orchestrator |
| `/wp-site-extraction` | **user-invocable:false** (confirmed at lines 4+5, both spellings). SSH + WP-CLI internal only | Internal-only pipeline stage |
| `/build-website` | Pipeline type. 8 stages dispatching to: sgs-discover (mode 3), wp-site-extraction OR design-ref (S1), seo-technical (S2), sgs-wp-engine (S3+S5), wp-pattern-gen.py (S4), visual-qa (S6), deploy-check (S7) | Tier 1 orchestrator — ONLY formalised revenue pipeline today |
| `/seo` | Router owning **12** sub-skills (not 11 as CLAUDE.md implied): seo-audit, seo-page, seo-schema, seo-sitemap, seo-technical, seo-content, seo-images, seo-geo, seo-plan, seo-programmatic, seo-competitor-pages, seo-hreflang | Tier 1 router |
| `/seo-audit` | Internally delegates to 6 specialists including **seo-performance + seo-visual** (undocumented sub-skills not in the router's 12 — possible additional SEO sub-skills exist) | Tier 2 coordinator, user-invocable:false |
| `/clone-patterns` | Command wrapping wp-pattern-gen.py. URL → SGS block pattern PHP files. | Tier 3 implementation |
| `/a11y-audit` | Command wrapping a11y-audit.py (Playwright + axe-core). Modes: test/html/contrast/rules | Tier 5 infrastructure |
| `/deploy-check` | **Command, not skill** — pipeline-stage-gate.py enforcement bypassed at build-website Stage 7 | Tier 3 implementation |
| `/design-tokens` | Command wrapping wp-token-bridge.py. **WP/SGS-specific** (not generic design tokens) — reclassify from design to WP domain | Tier 3 |
| `/wordpress-router` | Router — calls detect_wp_project.mjs + dispatches to 6 WP specialist skills | Tier 5 infrastructure |

### Confirmed pairings (CLI ↔ command)

| CLI | Command | Notes |
|---|---|---|
| `wp-blocks.py` | `/wp-blocks` | ✓ |
| `wp-docs.py` | `/wp-hooks` | **Bean's memory said /wp-docs — /wp-docs does NOT exist.** Correct pairing is wp-docs.py ↔ /wp-hooks |
| `wp-hook-graph.py` | `/wp-hook-graph` | ✓ |
| `wp-pattern-gen.py` | `/clone-patterns` + internal to build-website Stage 4 | No direct command (invoked by skill/pipeline) |
| `wp-scaffold.py` | `/wp-scaffold` | **Plugin only** — no theme or block scaffold capability (doc implied wider scope) |
| `wp-token-bridge.py` | `/design-tokens` | ✓ |
| `wp-perf.py` | `/wp-perf` + `/wp-performance` skill | ✓ |
| `wp-theme-check.py` | `/wp-theme-check` | ✓ |
| `wpcs-lint.py` | **Auto-firing PostToolUse hook** (not CLI) | Not manually invocable |
| `sgs-db.py` | `/sgs-db` + /sgs-wp-engine skill | Path: `C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` (not `.claude/skills/...`) |
| `html-capture.js` | Internal to /sgs-extraction | Path: `C:/Users/Bean/.agents/skills/shared-references/html-capture.js` |
| `design-extract.py` | Internal to /sgs-extraction + /design-ref | Path: `C:/Users/Bean/.claude/hooks/design-extract.py` |
| `a11y-audit.py` | `/a11y-audit` command | Path: `C:/Users/Bean/.claude/hooks/a11y-audit.py` |
| `context7.py` | `/library-docs` command | Path: `C:/Users/Bean/.claude/hooks/context7.py` |

### Cross-batch systemic findings

1. **Autopilot domain table missing 4 skills** (playwright, animation-harvest, sgs-discover, sgs-extraction). Systemic routing invisibility — trigger phrases in SKILL.md frontmatters are inert without autopilot registration. Patch batch required.
2. **Documentation drift detected in sgs-extraction** (4 factual errors: hard-exit vs documented graceful fallback, wrong output filenames, Vision pass manual-not-automated, integration contract unimplemented). Captured as correction row 151: `gap-analysis-read-the-scripts-not-just-skill-md`.
3. **Grade-cap arithmetic bug in /gap-analysis** — validator enforces 5 lenses but skill uses 6; `grade_cap_applied=null` despite FAIL lens verdicts in 4 of 5 evals this session. Fix required.
4. **3 genuinely distinct extraction layers exist** (not redundant as tooling-doc earlier implied): sgs-extraction = raw HTML+DOM+a11y, design-ref = token interpretation, wp-site-extraction = WP server-side truth. Keep all three, clarify boundaries.

### Decisions locked this session

| Decision | Resolution |
|---|---|
| /frontend-design fate | **Absorb into /innovative-design/references/aesthetic-reference.md** — only used as shared reference by modifiers |
| /style-replicator classification | **Move to content/voice domain** (not design) |
| /design-tokens classification | **Move to WP/SGS domain** (wraps wp-token-bridge.py, not generic) |
| sgs-extraction/design-ref/style-replicator "three redundant extractors" | **Not redundant — three layers**. Update tooling-doc overlap section |
| /uimax role | **Cross-cutting queryable reference** called at every design decision; NOT a sub-skill of innovative-design |
| Canonical rubric | **18-cell matrix (block/container/page × static/animation/interactivity/device-responsive/content+tone/flow+UX) + 3 output paths (uimax ingest / SGS theme / app delivery) + 5 end-goals + 6-lens system-effect check** — absorb into skill-optimiser + pipeline-optimiser as DESIGN mode |

### Proposed new skills (not yet built)

- `/qc` — delegated multi-model review panel with Sonnet/Cerebras/Gemini-Pro/Flash/Opus routing table + Cerebras chunk-loop pattern + brief-staging in project sandbox
- `/qc-inline` — main-thread QC mirror with optional non-producer fan-out
- `/scroll-animation-originator` — Chase Chapman workflow (fal.ai LTX-Video + Nano Banana 2)
- `/brand-voice-replicator` — client-voice sibling to /style-replicator
- `/app-block-library` — parked, SGS theme priority first

### Proposed skill enhancements (not yet built)

- `/skill-optimiser` — add DESIGN mode (pre-hoc rubric grading) alongside existing POST-USE performance mode. Auto-select on run-data presence.
- `/pipeline-optimiser` — same dual-mode treatment
- `/gap-analysis` — slim to non-skill target types (website/design/research/plan/custom); fix validator (6-lens enforcement, grade_cap_applied block, captured-lesson-151 HARD GATE)
- `/sgs-extraction` — 4 factual error remediation
- `/autopilot` — domain-table patch for 4 invisible skills
- `/uimax` — ADD INGEST command (currently read-only; needs write-back from extractions)
- `/sgs-db` — schema additions: `animations`, `sections_detected`, `block_opportunities`, `extraction_cache`

---

**End of 2026-04-21 recon update.** Full per-skill detail + reviewer JSONs at `C:/Users/Bean/.openclaw/workspace/memory/research/gap-analysis/2026-04-20-154111/`.

---

**End of audit workbook.** Next iteration: populate remaining `[audit needed]` blocks via Stage 1b Sonnet batches using the recon data above as verified seeds.
