# SGS Cloning Skill — Salvage Matrix

**Date:** 2026-05-05

---

## ⚠ REVISIONS — Bean's late-session corrections (2026-05-05) override the original below

The original salvage matrix (preserved below) treated all 3 use cases as in-scope and assumed a complex IP-aware schema. Bean's corrections re-scope it. **Read this section first.**

### What's now in scope

- **Use Case 3 ONLY: HTML drafts → WP** — get this perfect first. "Don't dilute efforts."
- Recogniser operates at PATTERN boundaries (Hard Rule 6, captured 2026-05-05 row 209)
- Single-table sgs-db with `fingerprint` as the headline column
- uimax extensions to existing tables (no new instance table); add categories (industry/mood/style) + new platforms (PHP/HTML/CSS/WP/Tailwind/Bootstrap/Astro/Next.js/etc.)
- BEM as reference doc OR DB table — defer the choice

### What's now OUT of scope (until Use Case 3 hits 100%)

- Use Case 1: draft → 1-page mockup with LLM design generation
- Use Case 2: competitor pattern harvesting
- Multi-source mix-and-match mode (`--multi`)
- Discovery mode (`--discover`)
- IP wall / licensing / provenance complexity (Bean: "the licensing thing is absurdly stupid, you can't license a web design or pattern of web components")
- Layer 2 structural fingerprinting + Layer 3 perceptual hash decision layer

### What changes about the salvage decisions below

| Capability | Original disposition | REVISED disposition |
|---|---|---|
| `--multi` mix-and-match merge logic (build-website Mode 2) | KEEP | DEFER — Use Case 1 territory |
| `/sgs-discover` discovery mode (build-website Mode 3) | KEEP | DEFER — Use Case 1 territory |
| design-ref's confidence-tiered theme.json schema | KEEP | KEEP — still valuable for HTML draft extraction |
| sgs-extraction's 3-pass capture (HTML / CSS / DOM) | KEEP | KEEP — core of HTML draft ingest |
| recogniser-v2 pattern-boundary emission | KEEP | KEEP and PROMOTE — this is the heart of the pipeline |
| Hostinger MCP `hosting_deployStaticWebsite` | KEEP for UC1 mockup preview | DEFER — UC1 out of scope |
| Single-class vs full-page autonomy targets | A grade = single-class; S grade = full-page | UNCHANGED — Bean confirmed in rubric |
| Schema design (sgs-db patterns, uimax classification) | Complex IP-aware multi-table | SIMPLIFY per dedup spec corrections — single sgs-db table, fingerprint-keyed, source = `idea`/`draft`/URL only |

### Tools confirmed correct

- `block_compositions` table resurrection (currently 0 rows) ✓
- `wp-pattern-gen.py` extension (don't replace) ✓
- `/sgs-update` keeps its current narrow role (re-scan only, NOT dedup queries) ✓
- `/sgs-db` extension subcommand for fingerprint queries ✓ (Bean: "we could use /sgs-db or a command that calls a script which queries it")

### Out-of-scope skills/commands until UC3 lands

The original spec recommended deprecating `/build-website` + `/clone-patterns` + `/design-tokens`. The revised position: don't deprecate yet, just don't invoke them in the new pipeline. They can be revived for Use Cases 1 and 2 when those are scoped back in.

### Net effect on the new skill's design

The skill becomes considerably simpler:

- One input mode: HTML draft folder path
- Output: pattern artefacts in `plugins/sgs-blocks/patterns/<client-slug>-<intent>/` + DB rows
- Internal stages: extract → recognise (pattern-boundaries) → fingerprint → dedup-check → classify → register → assemble → deploy → verify
- All Wave 1-3 Wave 5 deliverables wire in cleanly: screenshot-diff-helper, mockup-parity-validator + Q1-Q4 flag, global-styles-reset, wp-update-block-attrs, brand-palette-sampler, MediaPicker / sgs_render_media (now live across hero + 7 migrated blocks)

### Updated open questions for next session

The 5 original questions become 3:

**Q1** Skill name? (`/clone`, `/site-clone`, `/sgs-clone`, or new `/draft-to-wp` since UC3 is the only mode)
**Q2** Pattern registration scope: every clone auto-registers, OR draft → human-confirm → register batch-promote?
**Q3** uimax existing tables — at session start, run `.schema` on the actual DB and confirm which tables get the industry/mood/style/platform extensions

The Q3 / Q5 / Q6 / Q7 / Q8 from the original next-session-prompt are deferred (LLM design gen, Hostinger MCP scope, IP wall, Layer 2 risk, commit policy) — not relevant until UC1/UC2 are scoped back in.

---

## ORIGINAL v1 SALVAGE MATRIX BELOW — sections C "Use Case 1" and "Use Case 2" are deferred
**Author:** Claude (research pass for Bean's next-session design)
**Purpose:** Capture every reusable capability across the 6 existing site-clone-related skills/commands so the new independent cloning super-pipeline (built next session) can absorb the best parts and deprecate the rest. **Not** a design — a salvage inventory.

---

## Headline Summary

**(a) Skills/commands that should be deprecated entirely or fully subsumed:** `/build-website` (thin router that doesn't know what it routes to — 8 stages mostly unused; replaced by an absorbing super-pipeline). `/clone-patterns` and `/design-tokens` are CLI thin-wrappers — collapse them into pipeline stages and keep the underlying CLIs (`wp-pattern-gen.py`, `wp-token-bridge.py`) as called tools. `sgs-extraction` is functional capture-only and stays as a callable stage. `design-ref` mostly overlaps with `sgs-extraction` + `design-extract.py`; merge its confidence-scoring + Vision-prompt logic into the new pipeline's extraction stage and deprecate the standalone skill.

**(b) Capabilities unique-and-worth-keeping:** confidence-tiered theme.json output schema (design-ref); pattern boundary recogniser at section level (sgs-wp-engine Hard Rule 6 + recogniser-v2); auto-derived fingerprints from block.json (mistakes 2026-05-03); SGS DB `match`/`block`/`gaps` queries for block-coverage gating (sgs-wp-engine); fidelity-comparator's 6-phase replication loop with editor-attribute-only constraint; `wp-token-bridge.py diff` for one-source-of-truth token sync; pattern artefact registration to `plugins/sgs-blocks/patterns/<client-slug>-<intent>` (compounding library); manual Playwright fallback for Cloudflare-blocked sites.

**(c) Highest-leverage Wave 1-3 dependency:** **`scripts/mockup-parity-validator.js` with the extended WATCHED set + `requires_screenshot_review` Q1-Q4 flag**. Every other deliverable feeds into or out of this validator. Without it, the pipeline cannot detect first-paint defects, hero gradient overpaints, font-load silent fails, or full-bleed math errors structurally — so it falls back to "I'll check by eye" which is exactly the failure mode that produced 2 weeks of remediation. Second-priority: `scripts/global-styles-reset.js` because every variation deploy is silently broken without it.

---

## A. Per-Source Skill Summary

### A1. `/build-website` (skill)

- **Path:** `~/.claude/skills/build-website/SKILL.md`
- **Stated goal:** Full pipeline from URL to shipped SGS WordPress site.
- **Argument shape:** `<url>` | `--discover '<query>'` | `--multi 'nav from A, hero from B'` | `--resume <run_id>`
- **Stages:** DETECT → EXTRACT → SEO MAP → FEATURE CHECK → PATTERN GEN → ASSEMBLE → QA → DEPLOY (8 stages)
- **Scripts dispatched:** `wp-site-extraction` (skill), `design-ref` (skill), `seo-technical` (skill), `sgs-wp-engine` (skill), `wp-pattern-gen.py`, `visual-qa` (skill), `deploy-check` (skill), `sgs-discover` (skill — does not exist). Run state on disk at `~/.claude/pipeline-state/build-website/<run_id>/`.
- **Artefacts:** `stage-N-<name>.json` per stage with `{stage, status, run_id, output, errors}`; `HALT.json` on kill-gate; `REPORT.md` at completion.
- **What's worth keeping:**
  - **Run-ID + on-disk state model** (`~/.claude/pipeline-state/<skill>/<run_id>/`) — survives session boundaries; supports `--resume`
  - **Per-stage JSON artefact + validator-before-dispatch** pattern
  - **HALT artefact + interactive vs background mode** (Telegram polling)
  - **Multi-source mix-and-match merge logic** (Mode 2) — extract only the named section per URL, flag conflicts
  - **Pre-deployment kill-gate at fidelity < 70%** with retry loop
- **What's broken / missing:**
  - Stage 4 (Pattern Gen) treats a mockup section as "1 block" — violates Hard Rule 6 (pattern-not-block, 2026-05-05)
  - Stage 6 (Visual QA) uses `/visual-qa` but doesn't enforce the extended WATCHED set, multi-frame capture, or pixel-sample fallback — so the hero-gradient and font-load classes of bug pass through
  - Stage 5 (Assemble) has no `wp_global_styles` reset step → variation changes silently invisible
  - No use of `wp.blocks.createBlock` + `replaceBlock` for attribute updates → block-validation rejection
  - Discovery mode (`--discover`) dispatches to a skill that doesn't exist (`/sgs-discover`)
  - Bean's verdict: "thin router I'm not a fan of — should be independent"
- **Disposition:** **DEPRECATE** the skill; **SUBSUME** state-model + halt + multi-source logic into the new super-pipeline.

### A2. `sgs-extraction` (skill)

- **Path:** `~/.claude/skills/sgs-extraction/SKILL.md`
- **Stated goal:** Capture raw HTML, design tokens, and DOM structure from any URL.
- **Argument shape:** `<url>`
- **Stages:** CAPTURE (`html-capture.js`) → EXTRACT (`design-extract.py`) → STRUCTURE (Playwright `browser_evaluate`) → OUTPUT (manifest)
- **Scripts dispatched:** `node C:/Users/Bean/.agents/skills/shared-references/html-capture.js`, `python ~/.claude/hooks/design-extract.py`, Playwright MCP (`browser_navigate`, `browser_evaluate`, `browser_snapshot`)
- **Artefacts:** `capture.html`, `capture.html.meta.json`, `dembrandt-tokens.json`, `dom-structure.json`, `accessibility-tree.txt`, `extraction-manifest.json` (self-check; not read by downstream skills currently)
- **What's worth keeping:**
  - **`html-capture.js` + Cloudflare hard-exit handling** (waits for networkidle + 2s; correctly fails on Cloudflare instead of returning challenge HTML)
  - **`design-extract.py` dembrandt CSS pull** with `--css-only` / `--mobile` / `--dark-mode` flags
  - **DOM-structure JS evaluator** (sections, headings, image counts, computed bg-colour, height)
  - **Section-boundary detection** via `section, [role="region"], main > div, .section`
- **What's broken / missing:**
  - `extraction-manifest.json` is unused by downstream skills (orphaned self-check)
  - `components.json` and `layout.json` were documented but never produced — doc lied for months
  - Vision pass is manual-only (writes a `vision-prompt.md`) — no automation hook
  - `dom-structure.json` JS doesn't extend the WATCHED set for `backgroundImage`, `filter`, `mixBlendMode` (2026-05-05 lesson)
- **Disposition:** **KEEP** as the capture stage of the new pipeline. Extend the JS evaluator to capture the full background family + filter + pseudo-elements per the 2026-05-05 measurement rule.

### A3. `/clone-patterns` (command)

- **Path:** `~/.claude/commands/clone-patterns.md`
- **Stated goal:** Clone a website's design into SGS WordPress block patterns via Gemini Vision + Playwright.
- **Argument shape:** `analyse <url>` | `generate <url> --output <dir>` | `clone <url> --output <dir>` | `--theme-slug <slug>`
- **Stages:** Single CLI invocation: `python ~/.claude/hooks/wp-pattern-gen.py`
- **Scripts dispatched:** `wp-pattern-gen.py` only.
- **Artefacts:** PHP pattern files in `<dir>/`; for WP source, raw block markup via `/wp-json/`; for non-WP, Playwright screenshot + Vision-inferred section map.
- **What's worth keeping:**
  - **Auto-detect WordPress** via `/wp-json/` probe and use REST raw block markup (high-fidelity input)
  - **Three modes** (`analyse` / `generate` / `clone`) — useful for staged adoption
- **What's broken / missing:**
  - Same Hard-Rule-6 violation: section → single pattern (which can be right) but no recogniser-v2 fingerprint matching against existing patterns first → emits duplicate patterns instead of reusing
  - No registration in `plugins/sgs-blocks/patterns/` index → patterns generated but not surfaced in editor inserter
  - No connection to uimax / sgs-db pattern dedup (Wave 4B's job, but no output schema to feed it)
- **Disposition:** **MERGE** as a stage. Keep the underlying `wp-pattern-gen.py` CLI; deprecate the slash-command thin wrapper — invocation lives inside the new pipeline.

### A4. `/design-tokens` (command)

- **Path:** `~/.claude/commands/design-tokens.md`
- **Stated goal:** Sync design tokens between SGS database and WordPress theme.json.
- **Argument shape:** `export [--variation <slug>]` | `diff <theme.json>` | `import <theme.json> [--dry-run]`
- **Scripts dispatched:** `python ~/.claude/hooks/wp-token-bridge.py` only.
- **Artefacts:** Updated theme.json (export); diff report (diff); SGS DB row updates (import).
- **What's worth keeping:**
  - **`wp-token-bridge.py diff`** as a hard-gate check before deploy (Wave 1 dependency for variation-deploy reset cycle)
  - **One-source-of-truth principle** between SGS DB + theme.json
- **What's broken / missing:**
  - No call to `global-styles-reset.js` after import → cached merge stays stale
  - Doesn't validate against `wp-theme-check.py` after import
- **Disposition:** **MERGE** as a stage in the assemble step. Keep the CLI; deprecate the slash command.

### A5. `design-ref` (skill)

- **Path:** `~/.claude/skills/design-ref/SKILL.md`
- **Stated goal:** Extract a structured, theme.json-compatible design specification from any website URL or screenshot — colours, fonts, spacing, components.
- **Argument shape:** `<url>` or `<path-to-screenshot>`
- **Stages:** SCREENSHOT → EXTRACT CSS (dembrandt) → VISION (Gemini) → MERGE → CONFIRM
- **Scripts dispatched:** `python ~/.claude/hooks/design-extract.py --css-only`, Playwright `browser_take_screenshot`, Gemini Vision (manual prompt), `wp-token-bridge.py diff`, `wp-blocks.py search`, `wp-theme-check.py validate`
- **Artefacts:** `dembrandt-tokens.json` + theme.json-compatible spec with `confidence_summary { high, medium, low }` per value; visual confirmation strip (palette + typography + component thumbnails) for Bean.
- **What's worth keeping:**
  - **Theme.json-compatible output schema with confidence tiers** (high = CSS-verified, medium = Vision + partial CSS, low = Vision-only) — this is the single best schema across all 6 sources
  - **Confirmation gate as visual summary** (palette strip, typography preview, component thumbnails) instead of raw JSON dump — ADHD-friendly
  - **Screenshot-only fallback** for Cloudflare-blocked sites
  - **Edge-case handling** for SPAs, CSS-in-JS, dark-mode-only sites, multi-font sites (cap at 3)
  - **Caching to design_references SQL table** with `confirmed_at` / `confirmed_by`
- **What's broken / missing:**
  - 70% overlap with `sgs-extraction` (both wrap `design-extract.py`)
  - Vision prompt is hand-pasted rather than scripted
  - No ground-truth pixel-sample step when CSS + Vision disagree
- **Disposition:** **MERGE** the schema + confirmation gate into the new pipeline. Deprecate the standalone skill. Keep `design-extract.py` as a called tool.

### A6. `sgs-wp-engine` (skill — central authority)

- **Path:** `~/.claude/skills/sgs-wp-engine/SKILL.md`
- **Stated goal:** Build, test, and ship SGS WordPress Framework blocks, themes, and client sites to S-tier quality.
- **Argument shape:** N/A (discipline skill, invoked contextually)
- **Stages:** CONTEXT → BUILD → QA → SHIP (4-phase loop with Replication Mode for clones)
- **Scripts dispatched:** `sgs-db.py` (15+ commands), `wp-blocks.py`, `wp-token-bridge.py`, `wp-theme-check.py`, `wp-pattern-gen.py`, `wp-perf.py`, `a11y-audit.py`, all sub-skills (`wp-block-development`, `wp-interactivity-api`, `wp-rest-api`, `wp-plugin-development`, `wp-block-themes`, `wp-performance`, `wp-wpcli-and-ops`, `wp-site-extraction`, `visual-qa`, `wordpress-router`, `ui-ux-pro-max`, `capture-lesson`, `lifecycle`)
- **Artefacts:** Built blocks; deployed sites; pattern artefacts in `plugins/sgs-blocks/patterns/<client-slug>-<intent>/`; correction-ledger appends; gap-analysis Lens 6 grades.
- **References worth keeping:** (read in detail above)
  - `fidelity-comparator.md` — 6-phase migration loop (extract → map → build via editor attributes → compare → fix → verify); Phase 2's per-section attribute mapping table is the canonical format
  - `design-compare.md` — Quick (5min) vs Deep (15-20min) audit modes; Gemini Pro vision prompts; theme.json token validator JS; a11y audit JS; perf check JS; OUTPUT_FORMAT scoring rubric
  - `pattern-generator.md` — pattern PHP file format; design-tokens-only rule; SGS naming conventions; 25→40+ pattern roadmap
  - `client-onboarding.md` — `sgs_generate_palette()` 10-step colour scale derivation; industry-pattern recommendations table
  - `site-auditor.md` — 4-phase audit (responsive / code / perf / SEO); severity matrix
  - `mockup-to-blocks.md` — section→block mapping table (16 typical sections); Indus Foods worked example
- **Hard Rules to bake in structurally** (not as docs):
  - **Rule 6** (pattern-not-block): recogniser must run at section boundaries first
  - **Rule 1** (no hardcoding): static-analysis grep for hex codes, absolute paths, hardcoded font URLs
  - **Rule 4** (`--reference <url>` mandatory for replication): pipeline arg validation
  - **Rule 5** (read-back after deploy): every deploy stage runs verification fetch
- **Disposition:** **KEEP** as the central authority + reference library. The new cloning pipeline **invokes** sgs-wp-engine for the build/QA/ship phases — does not duplicate its work. Reference docs (fidelity-comparator, design-compare, pattern-generator) become required reading at the relevant pipeline stages.

---

## B. Capability Map

| # | Capability | Source(s) | Best-implemented-by | Salvage decision | Notes |
|---|------------|-----------|---------------------|------------------|-------|
| 1 | Detect WordPress at URL (`/wp-json/` probe) | build-website S0, clone-patterns | `wp-pattern-gen.py` auto-detect | KEEP | Reuse the curl probe |
| 2 | Capture full-page HTML after networkidle | sgs-extraction | `html-capture.js` | KEEP | Cloudflare hard-exit handling already correct |
| 3 | Extract CSS tokens (colours/fonts/spacing/shadows) | sgs-extraction, design-ref | `design-extract.py --css-only` | KEEP | Outputs `dembrandt-tokens.json` |
| 4 | Extract DOM section structure | sgs-extraction | Playwright `browser_evaluate` JS | EXTEND | Add `backgroundImage`, `filter`, `mixBlendMode`, pseudo-elements per 2026-05-05 |
| 5 | Vision-based component inventory | design-ref, clone-patterns | `wp-pattern-gen.py` (Gemini Flash) + design-ref prompt | MERGE | Use design-ref's structured prompt with wp-pattern-gen automation |
| 6 | Confidence-tiered theme.json output | design-ref | design-ref schema | KEEP | Best schema across all sources |
| 7 | Visual confirmation gate (palette strip + typography + thumbnails) | design-ref | design-ref | KEEP | ADHD-friendly format |
| 8 | Cloudflare screenshot-only fallback | design-ref, sgs-extraction | design-ref's manual-extraction-fallback | KEEP | Document limitation |
| 9 | WordPress raw block markup via REST | clone-patterns | `wp-pattern-gen.py` | KEEP | High-fidelity input for WP→WP clones |
| 10 | Gemini Vision section detection (non-WP) | clone-patterns, design-ref | `wp-pattern-gen.py` | KEEP | Use Flash by default |
| 11 | Section→pattern boundary recogniser | sgs-wp-engine Hard Rule 6 | recogniser-v2 (existing) | KEEP | This is the structural fix for pattern-not-block |
| 12 | Auto-derived fingerprints from block.json | mistakes.md 2026-05-03 | recogniser-v2 fingerprint scaffolder | KEEP | Coverage enforced by code |
| 13 | Pattern PHP file generation with design-token slugs | pattern-generator.md, clone-patterns | `wp-pattern-gen.py` + pattern-generator.md rules | MERGE | Tokens-only rule must be enforced |
| 14 | Match a section description to existing SGS block | sgs-wp-engine | `sgs-db.py match` | KEEP | One-line answer; avoids re-building |
| 15 | Block-coverage gap analysis (% feature coverage) | build-website S3 | `sgs-db.py gaps <industry>` + match results | KEEP | Kill-gate at <60% coverage |
| 16 | Style variation JSON generation (10-step palette) | client-onboarding.md | `sgs_generate_palette()` PHP helper | KEEP | Bake into pipeline as the variation-creation step |
| 17 | Design tokens DB↔theme.json sync | design-tokens command | `wp-token-bridge.py diff/export/import` | KEEP | Hard-gate before deploy |
| 18 | theme.json schema validation | design-ref, sgs-wp-engine | `wp-theme-check.py validate` | KEEP | Run after every variation write |
| 19 | Mockup parity validator (computed-style diff) | mistakes.md M-Q-R sections | `scripts/mockup-parity-validator.js` (Wave 1) | KEEP | Must include extended WATCHED set |
| 20 | Multi-frame first-paint capture | mistakes.md 2026-05-04 | `tools/multi-frame-qa/capture.js` (Wave 1) | KEEP | Frames at 0/200/500/1000/3000ms |
| 21 | Pixel-sample fallback (canvas RGB read) | mistakes.md 2026-05-05, measurement-vs-eye rule | `scripts/screenshot-diff-helper.js` (Wave 1) | KEEP | Only ground-truth for visible parity |
| 22 | Brand-palette validation (k-means against approved palette) | Wave 1 | `scripts/brand-palette-sampler.py` | KEEP | Per-client check |
| 23 | Font-load assertion (`document.fonts` enumeration) | mistakes.md 2026-05-04 | extend multi-frame-qa/capture.js | KEEP | Detects silent CDN font fail |
| 24 | `wp_global_styles` reset+reapply | mistakes.md 2026-05-04 | `scripts/global-styles-reset.js` (Wave 1) | KEEP | Mandatory after every variation deploy |
| 25 | Block-attribute update bypassing validation | mistakes.md 2026-05-04 | `scripts/wp-update-block-attrs.js` (Wave 1) | KEEP | `createBlock` + `replaceBlock` |
| 26 | Image OR video media slot rendering | Wave 1 | `MediaPicker.js` + `sgs_render_media()` PHP helper | KEEP | Per-block media flexibility |
| 27 | Hostinger subdomain provisioning | Wave 1A | `mcp__hostinger__hosting_generateAFreeSubdomainV1` | KEEP | Use Case 1 deploy target |
| 28 | Hostinger static HTML deploy | Wave 1A | `mcp__hostinger__hosting_deployStaticWebsite` | KEEP | Use Case 1 mockup preview before WP build |
| 29 | List Hostinger sites | Wave 1A | `mcp__hostinger__hosting_listWebsitesV1` | KEEP | Pre-flight check |
| 30 | Theme/plugin deploy (excludes filter) | mistakes.md, project CLAUDE.md | tar + scp method (NOT Hostinger MCP) | KEEP | Hostinger plugin/theme MCP deploys can't exclude |
| 31 | Pattern artefact registration to plugins/sgs-blocks/patterns/ | Hard Rule 6 + pattern-generator.md | new pipeline post-build step | KEEP | Library compounds across clients |
| 32 | Visual QA at 3 breakpoints (375/768/1280) | sgs-wp-engine Phase 3, build-website S6 | `/visual-qa` skill | KEEP | Stays as called sub-skill |
| 33 | Multi-source mix-and-match merge | build-website Mode 2 | build-website skill (extract logic) | KEEP | Useful for hybrid briefs |
| 34 | On-disk pipeline state (run_id + stage artefacts) | build-website | build-website state model | KEEP | Survives session boundaries; supports resume |
| 35 | Halt artefact + interactive vs background mode | build-website | build-website halt logic | KEEP | Telegram polling for cron runs |
| 36 | SEO permalink + redirect map preservation | build-website S2 | `seo-technical` skill | KEEP | Skip only when source is brand-new |
| 37 | Pre-deploy checklist | build-website S7 | `/deploy-check` skill | KEEP | Stays as called sub-skill |
| 38 | Recurring-rule capture to blub.db | sgs-wp-engine | `/capture-lesson` skill | KEEP | Every novel pipeline failure → lesson |
| 39 | Correction-ledger read at session start | sgs-wp-engine, sgs-extraction, design-ref | per-skill correction-ledger.md | KEEP | Hard-gate at pipeline start |
| 40 | Design-intelligence DB lookup (palettes/fonts/UX rules) | sgs-wp-engine | `ui-ux-pro-max` search | KEEP | Cite Provenance field |

---

## C. Three Use-Case Flows

### C1. Use Case 1 — Draft → 1-page WP Mockup (Client Proposal)

**Bean's input:** A sketch (PNG/JPG), a written brief (markdown), or a chat brief. No live URL.

**Output:** A live WP page on a Hostinger subdomain (e.g. `<slug>.hostingersite.com`) that the client can click through. Pattern fidelity acceptable; not pixel-perfect.

**Stages:**

1. **INTAKE** — Parse input type (sketch / brief / chat). If sketch, run Gemini Vision to extract section-by-section description. If brief, structured-parse into intent + sections + brand cues. **Output:** `intake.json` with `{client, industry, sections[], brand_cues, ref_urls[]}`.
2. **DESIGN-INTELLIGENCE LOOKUP** — `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<industry> <intent>" --domain product --limit 5` to seed palette + font candidates. **Output:** `design-candidates.json`.
3. **VARIATION GENERATION** — Run `client-onboarding.md` flow: `sgs_generate_palette(<primary_hex>)` for the 10-step scale; build `theme/sgs-theme/styles/<slug>.json`; `wp-theme-check.py validate`. **Output:** variation file.
4. **PATTERN ASSEMBLY** — For each section in `intake.json`, query `sgs-db.py match "<section>"` → either reuse existing pattern from `plugins/sgs-blocks/patterns/` or compose from blocks. **Hard Rule 6 enforced** at this stage.
5. **STAGING DEPLOY** — `mcp__hostinger__hosting_generateAFreeSubdomainV1` → tar+scp theme+plugin → `global-styles-reset.js` → page assembly via `wp.blocks.createBlock` + `replaceBlock` (using `wp-update-block-attrs.js`). **Output:** live URL.
6. **QA STAMP** — `tools/multi-frame-qa/capture.js` at 3 breakpoints + `mockup-parity-validator.js` (lenient mode — pattern fidelity not pixel) + `screenshot-diff-helper.js` for brand-palette check. **Output:** QC stamp report.
7. **HANDOFF** — URL + screenshot grid + "what to ask the client" notes for Bean.

**Captured rules plugged in:** `wp_global_styles` reset (step 5), block-validation bypass (step 5), font-load assertion (step 6), measurement-vs-eye via pixel-sample (step 6), pattern-not-block at step 4, no-hardcoding (variation tokens enforced step 3).

**Open question for Bean:** intake stage may or may not need an LLM design-generation step — see Section E.

---

### C2. Use Case 2 — Competitor Pattern Clone (Library Enrichment)

**Bean's input:** A URL (e.g. a competitor SaaS site, an Awwwards winner, an industry leader's homepage).

**Output:** Extracted patterns registered into BOTH the SGS pattern library (`plugins/sgs-blocks/patterns/<source>-<intent>/`) AND the uimax intelligence DB. Output schema feeds Wave 4B's dedup/classify mechanism.

**Stages:**

1. **PRE-FLIGHT** — Read `correction-ledger.md`. Probe `/wp-json/`. Cloudflare check.
2. **CAPTURE** — `html-capture.js` + `design-extract.py --css-only` + Playwright DOM-structure JS (with extended WATCHED set). For WP source: `wp-pattern-gen.py` raw block markup pull.
3. **VISION SECTION SCAN** — Gemini Flash with design-ref structured prompt at 1440/768/375. **Output:** `sections.json` with section type, layout, hierarchy per breakpoint.
4. **RECOGNISER-V2 PASS** — For each section, auto-fingerprint match against existing patterns in `plugins/sgs-blocks/patterns/`. If match >= threshold → tag as "duplicate of <existing>". If no match → mark as new candidate.
5. **PATTERN EMISSION** — For each new candidate: generate PHP pattern file per `pattern-generator.md` rules (design-tokens-only, no hex). Register in `plugins/sgs-blocks/patterns/<source-domain>-<intent>/`. Emit a sidecar `pattern-metadata.json` with `{source_url, source_domain, intent, fingerprint, captured_at, confidence_per_section}`.
6. **UIMAX INGEST FEED** — Emit `uimax-feed.json` with the design-candidate rows (palette, fonts, layout class, citation source URL) ready for Wave 4B's dedup/classify step.
7. **REPORT** — Summary table: N sections detected, M new patterns emitted, K duplicates flagged.

**Output schemas (for Wave 4B):**
- `pattern-metadata.json`: `{slug, source_url, source_domain, intent, sections[], fingerprint, breakpoint_screenshots[]}`
- `uimax-feed.json`: `[{kind: "palette"|"font"|"layout", value, provenance, source_url, captured_at}]`

**Captured rules plugged in:** measurement extension (step 2 capture), pattern-not-block (step 4 fingerprint), tokens-only (step 5 emission), no client-leakage grep (step 5 — every emitted pattern uses framework tokens, never client-specific).

---

### C3. Use Case 3 — Full HTML→WP Conversion (Designer Handoff)

**Bean's input:** A folder of HTML/CSS/JS mockup files (a complete static site, possibly multi-page).

**Output:** A full WP site cloned at pattern fidelity, deployed to staging or production, every section editable via block editor with zero hardcoded CSS.

**Stages:**

1. **PRE-FLIGHT** — Read `correction-ledger.md` + `mockup-to-blocks.md` section→block mapping table. Confirm `--reference <folder>` arg is set (Hard Rule 4). Optional: `mcp__hostinger__hosting_deployStaticWebsite` to push raw mockup to a temp subdomain so QC tools have a URL to point at.
2. **MOCKUP CAPTURE** — Run mockup files through `html-capture.js` (file:// URL or via temp Hostinger static deploy from step 1). `design-extract.py --css-only` against the rendered mockup.
3. **PULL-ALL-CSS PASS** — Per 2026-05-03 rule: harvest every CSS rule whose selector matches an element in each section. Classify into block-attribute / universal / one-time-custom-CSS. **Hard gate:** no selective pulling.
4. **SECTION SEGMENTATION** — Walk the mockup top-to-bottom per `mockup-to-blocks.md` table. Produce a section list with `{name, layout_type, bg_treatment, content, visual_props, hover_states}`.
5. **VARIATION DERIVATION** — Run extracted tokens through `client-onboarding.md` palette generation; build `<client-slug>.json` style variation; `wp-theme-check.py validate`; `wp-token-bridge.py diff` against SGS DB.
6. **PATTERN MAPPING** — For each section, `sgs-db.py match "<description>"` + recogniser-v2 fingerprint pass. Hard Rule 6 enforced. If no existing pattern matches: emit a new pattern (per `pattern-generator.md`). If single-unit element: emit a single block.
7. **FEATURE-GAP CHECK** — Aggregate gaps. Kill-gate if framework coverage <60% — present per-gap menu (build custom block / use plugin / skip). Bean picks per Rule 9.
8. **BUILD** — Per-page assembly. Use `wp-update-block-attrs.js` for every attribute set (avoid block-validation rejection). Migrate text + images (download to media library).
9. **DEPLOY** — tar+scp theme+plugin (Hostinger plugin/theme MCP can't exclude — keep tar). `global-styles-reset.js`. OPcache HTTP reset. LiteSpeed page + CSS purge.
10. **MULTI-FRAME QC** — `tools/multi-frame-qa/capture.js` at 3 breakpoints + 5 timepoints. `mockup-parity-validator.js` strict mode against the original mockup. `screenshot-diff-helper.js` pixel-diff at every Q1-Q4-flagged section.
11. **PARITY GATE** — If overall fidelity <70% → loop back to step 8 (max 2 retries). Each retry must include a side-by-side screenshot grid (Section Q rule). After 2 retries, halt with named top mismatches.
12. **REGISTER + HANDOFF** — Pattern artefacts registered under `plugins/sgs-blocks/patterns/<client-slug>-<intent>/`. Pattern-metadata + uimax-feed emitted (same schemas as Use Case 2). Handoff bundle: live URL + screenshot grid + parity report + open-issues list.

**Captured rules plugged in:** `wp_global_styles` reset (step 9), `--exclude='plugins/sgs-blocks/src'` not bare `src` (step 9), OPcache HTTP reset (step 9), multi-frame capture (step 10), extended WATCHED set + pixel-sample (step 10), classifier-trap (step 11 — no severity reduction without screenshot evidence), font-load assertion (step 10), `save:()=>null` InnerBlocks check (step 8 — sniff every dynamic block), `replaceBlock` over `updateBlockAttributes` (step 8), pattern-not-block (step 6), tokens-only (step 5+6), no-hardcoding (step 8 grep).

---

## D. Captured-Rule Coverage Check

Walk every captured rule in `c:/Users/Bean/Projects/small-giants-wp/.claude/mistakes.md` and confirm structural enforcement.

| Rule | Year-month-day | Where enforced in new pipeline | Mechanism |
|------|----------------|--------------------------------|-----------|
| `getComputedStyle().backgroundColor` lies (gradient overpaint) | 2026-05-05 | UC1 step 6, UC3 step 10 | `mockup-parity-validator.js` extended WATCHED set + pixel-sample fallback (script invocation) |
| Parity validator deltas dismissed as "structural noise" turn out to be visible defects (classifier-trap) | 2026-05-05 | UC3 step 11 | Hard rule: severity reduction requires attached side-by-side screenshot. Enforced in validator output schema (`requires_screenshot_review` flag) |
| `wp_global_styles` cache layer for theme variations | 2026-05-04 | UC1 step 5, UC3 step 9 | `scripts/global-styles-reset.js` mandatory in every variation deploy stage — pipeline halts if step missing |
| Fraunces font silent CDN load fail | 2026-05-04 | UC1 step 6, UC3 step 10 | `document.fonts` enumeration in `tools/multi-frame-qa/capture.js`. Static-analysis: any `https://` in `theme.json` font src fails pre-deploy |
| Single-frame post-load screenshots miss first-paint defects | 2026-05-04 | UC1 step 6, UC3 step 10 | `tools/multi-frame-qa/capture.js` runs at 0/200/500/1000/3000ms, diffs frames |
| Dynamic blocks `save:()=>null` drop InnerBlocks | 2026-05-04 | UC3 step 8 (build) | Static sniff: any block with `<InnerBlocks>` in edit.js + `save:()=>null` fails build pre-deploy |
| Extension-via-binding wrong shape; composition wins | 2026-05-03 | Pipeline-wide rule for new feature gaps | At feature-gap step (UC3 step 7), hard question: "is this a block?" If yes, emit a new block, never an extension |
| Fingerprints must be auto-derived from block.json | 2026-05-03 | UC2 step 4, UC3 step 6 | recogniser-v2 fingerprint scaffolder runs from block.json; no hand-written fingerprints accepted |
| Pull all CSS every time, classify after | 2026-05-03 | UC3 step 3 | Hard-gate: BS4 native selector engine harvests every rule; classifier runs after. Selective pulling fails the gate |
| Auto-clone structurally sound but visually insufficient | 2026-05-01 | UC3 step 11 | Parity gate: <70% loops back, max 2 retries, then halts to Bean for top-down rebuild |
| `--exclude='src'` breaks vendor autoload | various | UC1 step 5, UC3 step 9 | Pipeline tar command literally hardcoded as `--exclude='plugins/sgs-blocks/src'`; no parametrisation |
| OPcache reset via CLI ≠ web pool | Project CLAUDE.md | UC1 step 5, UC3 step 9 | HTTP curl reset built into deploy stage |
| `wp eval` breaks on shell special chars | Project CLAUDE.md | UC3 step 8 | Pipeline uses `eval-file` pattern for any PHP needing shell escaping |
| Block validation silently rejects `updateBlockAttributes` | Project CLAUDE.md | UC1 step 5, UC3 step 8 | `wp-update-block-attrs.js` (Wave 1) used for every attribute write |
| Mockup classes map to PATTERNS, not single blocks (Hard Rule 6) | 2026-05-05 | UC1 step 4, UC2 step 4, UC3 step 6 | recogniser-v2 operates at pattern boundary first; single-block emission only for self-contained units |
| `verify-rendered-output-not-internal-metrics` (blub.db row 194) | 2026-04-29 | UC1 step 6, UC3 step 10/11 | Every "shipped" claim requires a fresh Playwright assertion on the live DOM |
| `extend-measurement-set-when-human-eye-disputes` (blub.db row 207) | 2026-05-05 | UC3 step 10/11 | When validator says match + Bean disputes, pipeline auto-escalates to pixel sample before reporting back |
| Parallel dispatch shared files (race conditions) | 2026-04-28 | Pipeline orchestration | Pipeline scopes parallel branches per-file; never two agents on the same PHP file |
| Palette defaults must be tokens, not hex | mistakes.md table | UC1 step 3, UC3 step 5+6 | Static-analysis grep: any `"color":"#..."` outside variation files fails pre-deploy |
| Header/footer universal not per-client | mistakes.md table | UC3 step 8 | Pipeline forbids creation of `header-<client>.html`; one universal per project |
| Use DevTools first for CSS override debugging | mistakes.md table | UC3 step 11 retry loop | Retry loop dispatches Playwright `getComputedStyle` + Computed-styles-source-map check, not file scans |
| LiteSpeed gotchas (UCSS, JS combiner, lazy-load) | mistakes.md table | UC3 step 9 | Disable LiteSpeed during dev; before perf check, re-enable + clear ALL caches (page + CSS + cache dir) |
| Always-screenshot-verify | mistakes.md table | UC1 step 6, UC3 step 10 | Hard gate: no claim of "fixed" without a fresh screenshot in the report |
| No hardcoding mobile nav | mistakes.md table | UC3 step 8 | Pipeline flags any `<nav>` HTML in template parts and refuses to emit; must be a block |

**Gaps still text-only after this design** (need to be lifted into scripts during next session):

- **Block-name search blindspot** (parenthetical qualifiers) — currently a behavioural rule. Could be lifted into a search wrapper that strips parens before grep. Low priority.
- **Always invoke /sgs-wp-expert before SGS work** — handled by autopilot routing; no script needed.
- **Stage files via /tmp not bash heredoc** — handled by `wp eval-file` pattern; no script needed.
- **Prefer diagnostics over CLI linters** — handled by tooling defaults; no script needed.
- **Defaults need deliberate judgement** — judgement rule, not scriptable. Stays as a doc.

---

## E. Open Questions for Bean (Next Session)

### E1. Router vs Absorbing super-pipeline?

**Question:** Should the new skill be a thin router that dispatches to the existing 5 skills, or an absorbing super-pipeline that calls underlying scripts (`html-capture.js`, `design-extract.py`, `wp-pattern-gen.py`, `wp-token-bridge.py`, etc.) directly and deprecates the wrapper skills?

**Bean's stated preference:** "independent super-pipeline".

**What's lost if we deprecate vs absorb:**

- **Deprecating `/build-website`:** Lose nothing — it's already a thin router Bean dislikes.
- **Deprecating `sgs-extraction`:** Lose a clean documentation surface for the capture-only use case (someone wants HTML+CSS of a URL without building anything). Mitigation: keep `html-capture.js` + `design-extract.py` callable directly; document the "just capture" path in the new pipeline as `--mode capture-only`.
- **Deprecating `design-ref`:** Lose the standalone "extract design from a URL or screenshot" flow used by Bean for early-phase brief work. Mitigation: same — `--mode design-ref-only` in the new pipeline.
- **Deprecating `/clone-patterns` + `/design-tokens`:** Lose nothing — they're CLI wrappers. The CLIs (`wp-pattern-gen.py`, `wp-token-bridge.py`) stay.

**Recommendation (for Bean to confirm):** Absorb everything. Provide pipeline modes (`--mode capture-only`, `--mode design-ref-only`, `--mode pattern-clone`, `--mode full-clone`) so the standalone use cases are still one-command. Keep `sgs-wp-engine` as the central authority — the new pipeline invokes it for build/QA/ship.

### E2. Naming?

**Question:** Does the new skill keep `/build-website`, take a fresh slug like `/clone`, or live as multiple aliased commands per use case (`/draft-mockup`, `/clone-patterns`, `/clone-site`)?

**Considerations:**
- `/build-website` is muscle-memory but Bean dislikes it
- `/clone` is short, clear, but may overlap with `gh repo clone` mental model
- Multi-aliased (`/draft-mockup` etc.) per use case is most discoverable but adds maintenance
- Alternative: one slug `/sgs-clone` with sub-commands (`/sgs-clone draft <input>`, `/sgs-clone url <url>`, `/sgs-clone html <folder>`)

**Recommendation (for Bean to confirm):** `/sgs-clone` with sub-commands. Single skill file, three modes.

### E3. Use Case 1 — design-generation stage?

**Question:** When Bean's input is a sketch or a brief (no live URL, no HTML mockup), does the pipeline need an LLM-driven design-generation stage that produces a section-by-section visual design, or is it human-handoff at that point (Bean designs the page in some other tool, then the pipeline picks up at the HTML-mockup stage)?

**Considerations:**
- LLM-generated section designs (via Gemini Vision + design-intelligence DB lookups) could produce a pattern map + variation candidate that Bean reviews, then the pipeline assembles — fast but quality-variable
- Human-in-the-loop with the existing `frontend-design` skill (`/frontend-design`) could produce a real HTML mockup that becomes Use Case 3 input — slower but higher quality
- Hybrid: LLM proposes 3 options at design-intelligence-lookup stage; Bean picks one; pipeline runs from there

**Recommendation (for Bean to confirm):** Hybrid. The pipeline includes a design-proposal stage that produces 3 ranked options (palette + section layout + reference Awwwards-style examples from `ui-ux-pro-max`). Bean picks one. Pipeline runs.

### E4. Hostinger MCP for theme/plugin deploy — when (if ever)?

**Question:** Hostinger MCP `hosting_deployWordpressPlugin` and `hosting_deployWordpressTheme` exist but can't apply excludes — so they ship `node_modules`, `.git`, `src/`, etc. We currently use tar+scp. Should the pipeline ever call the Hostinger MCP path for new sites where the exclusion problem doesn't matter?

**Recommendation (for Bean to confirm):** Use Hostinger MCP **only** for the static-mockup preview step in Use Case 1 (`hosting_deployStaticWebsite`). Theme/plugin deploys always tar+scp. Document the limitation explicitly.

### E5. Pattern artefact registration scope?

**Question:** When Use Case 2 (competitor clone) emits patterns, where do they live? Options:
- **A.** `plugins/sgs-blocks/patterns/<source-domain>-<intent>/` (current Hard Rule 6 spec) — patterns register globally and appear in every client's editor inserter
- **B.** A separate `plugins/sgs-blocks/patterns/library/<source-domain>-<intent>/` namespace, hidden from clients by default; surface only in the SGS-internal pattern explorer
- **C.** Outside `sgs-blocks` plugin entirely — in a `library/` repo or `scripts/pattern-library/` directory

**Recommendation (for Bean to confirm):** Option B. Library patterns shouldn't appear in client editors by default — it would clutter the inserter and risk client-leakage. Make the library a curated source that Bean and the pipeline can pull from when building a new client site.

---

## End of Salvage Matrix
