---
doc_type: skills-commands-map
project: small-giants-wp
generated: 2026-05-13
generated_by: research-check audit subagent (Sonnet)
last_verified: 2026-05-14
update_triggers:
  - New skill or command added (project-local or global)
  - Skill/command pipeline position changes (Stage X -> Stage Y)
  - Skill/command retired or renamed
  - Scripts a skill/command invokes change
companion_docs:
  - .claude/tooling-map.md - per-script inventory
  - .claude/cloning-pipeline-flow.md - pipeline position visual
  - .claude/db-tables-map.md - DB R/W matrix
registry_entry: docs-registry.md row 13
purpose: Catalogue of all 17 slash commands + skills + /visual-qa addendum related to the SGS pipeline, cross-referenced against scripts in tooling-map.md.
---

# Skills and Commands - SGS Pipeline Reference

## Quick index by pipeline stage

| Pipeline stage | Commands / skills that operate here |
|---|---|
| Pre-clone (mockup prep) | `/uimax-scrape`, `/uimax-mood-board`, `/uimax-classify-naming` |
| Stage 0 pre-flight + lints | `/sgs-clone` (hard-gates, BEM lint, token lint), `/sgs-wp-engine` (DB check) |
| Stage 1-2 boundary + match | `/sgs-clone`, `/uimax-classify-naming` (invoked by /sgs-clone Stage 1) |
| Stage 3-5 slot/extract/harvest | `/sgs-clone`, `/chrome-devtools-cli` (runtime CSS extraction fallback at Stage 4/5), `/playwright` (same fallback role) |
| Stage 6-7 classify + compose | `/sgs-clone`, `/ui-ux-pro-max` (judgement on ambiguous pattern classification), `/uimax` (query support) |
| Stage 8-9 serialise + report | `/sgs-clone`, `/sgs-db` (slot/block lookups) |
| +DEPLOY +PARITY +REGISTER tail | `/sgs-clone`, `/uimax-sgs-scrape-pattern` (+REGISTER), `/uimax-scrape-animation` (+REGISTER), `/sgs-update` (+REGISTER refresh), `/playwright` (+PARITY capture), `/chrome-devtools-cli` (+PARITY inspect) |
| Sister pipeline (/sgs-update) | `/sgs-update`, `/sgs-db` (DB query during update) |
| Cross-cutting (DB query / reference) | `/sgs-db`, `/wp-blocks`, `/wp-hooks`, `/wp-hook-graph`, `/sgs-wp-engine` |
| Auxiliary (not in pipeline) | `/wp-perf-gate`, `/wp-hook-graph`, `/wp-hooks` |

---

## Per-command/skill detail

### /sgs-db

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\sgs-db.md`
- **Purpose:** Direct CLI shortcut to the SGS Framework SQLite knowledge base - queries blocks, design tokens, patterns, hooks, gotchas, impact analysis, and raw SQL.
- **Pipeline fit:** Cross-cutting reference tool. Not directly wired into the pipeline execution flow, but called by `/uimax-sgs-scrape-pattern` Tool Bindings section for fingerprint lookups (`sgs-db.py fingerprint <hash>`). Available at any stage for operator lookups during a clone run.
- **Scripts referenced:**
  - `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` - the underlying CLI script. Note: command file points to `C:/Users/Bean/.agents/skills/sgs-wp-engine/scripts/sgs-db.py`. This is the agents-location mirror of the sgs-wp-engine skill. The same script exists at `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` (the `.claude` location). **Not in tooling-map.md** - it lives in the sgs-wp-engine skill, not in the repo scripts folders.
- **Databases:** Reads `sgs-framework.db` (canonical at `~/.agents/skills/sgs-wp-engine/sgs-framework.db`). Read-only in normal usage; `--sql` mode can write if operator issues INSERT/UPDATE.
- **Status:** CURRENT

---

### /sgs-update

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\sgs-update.md`
- **Purpose:** Re-scan the SGS codebase and update the sgs-framework.db knowledge base, regenerate the per-block reference doc, and sync SGS blocks into the uimax data layer.
- **Pipeline fit:** Sister pipeline to `/sgs-clone`. The +REGISTER tail of `/sgs-clone` invokes `/sgs-update` after every successful pattern write. Also invoked standalone after any block addition, attribute change, or `atomic-block-scaffold.py --promote` run.
- **Scripts referenced:**
  - `~/.agents/skills/sgs-wp-engine/scripts/update-db.py` - Stage 1 (rescan codebase). **Not in tooling-map.md** - lives in sgs-wp-engine skill.
  - `plugins/sgs-blocks/scripts/generate-block-reference.py` - Stage 2. **In tooling-map.md** under Build + setup tools.
  - `plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py` - Stage 3+4. **In tooling-map.md** under uimax tools.
  - The command also references the following scripts for Phase 5 awareness (informational, not executed by /sgs-update directly): all Phase 5 orchestrator scripts in `plugins/sgs-blocks/scripts/orchestrator/` and `tools/recogniser-v2/visual_qa_config.json`.
- **Databases:** Writes to `sgs-framework.db` (Stage 1 via update-db.py). Writes to `ui-ux-pro-max.db` (Stage 3 via sgs-update-uimax-sync.py). Does NOT write to root `theme.json`.
- **Status:** CURRENT

---

### /sgs-clone

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\sgs-clone\SKILL.md`
- **Purpose:** Convert one HTML+CSS draft mockup into a deployable SGS WordPress site via the 9-stage Draft-to-SGS pipeline (BOUNDARY -> MATCH -> SLOT-LIST -> EXTRACT -> HARVEST -> CLASSIFY -> COMPOSE -> SERIALISE -> REPORT + +DEPLOY +PARITY +REGISTER tail).
- **Pipeline fit:** This IS the pipeline. Entry point for the entire clone workflow.
- **Scripts referenced (from Tool Bindings section):**

  Recogniser (Stages 1-4 + Stage 9):
  - `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/bucket-c-classifier.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/functionality-gap-detector.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/attribute-gap-writer.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/gap-review-report.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` - **In tooling-map.md**

  Pipeline coordination (Phase 5b-5f):
  - `plugins/sgs-blocks/scripts/orchestrator/staged_output.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/validate-stage-artifact.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/mutex.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/media-sideload.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/attribute-staged-apply.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/functionality-bulk-apply.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/atomic-block-scaffold.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/lingua_franca.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/stage1_boundary_hook.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/token_resolver.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/variation_router.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/supports_writer.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/modifier_extractors.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/wp_integration.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/preflight_chain.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/orchestrator/critical-fix-verification.py` - **In tooling-map.md**

  uimax + visual + deploy:
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md**
  - `tools/multi-frame-qa/capture.js` - **In tooling-map.md**
  - `scripts/mockup-parity-validator.js` - **In tooling-map.md**
  - `scripts/screenshot-diff-helper.js` - **In tooling-map.md**
  - `scripts/global-styles-reset.js` - **In tooling-map.md**
  - `scripts/wp-update-block-attrs.js` - **In tooling-map.md**
  - `tools/recogniser-v2/visual_qa_config.json` - **NEW - not in tooling-map.md** (configuration file, not a script, but referenced in Tool Bindings and /sgs-update command)

  Stage 0 pre-flight gate:
  - `tools/recogniser-v2/validate-naming.py` - **NEW - not in tooling-map.md** (referenced in SKILL.md Stage 0 pre-flight gate section as the BEM naming validator; see New Scripts section below)

- **Databases:** Reads and writes `sgs-framework.db` (via orchestrator scripts). Reads and writes `ui-ux-pro-max.db` (via +REGISTER tail uimax writes). Does NOT write to `theme.json` directly - writes to client style variation JSON via variation_router.py.
- **Status:** CURRENT
- **Notes:** This is a pipeline-type skill that is a thin router. All heavy work delegated to the scripts in the repo.

---

### /uimax-sgs-scrape-pattern (duplicate note)

The task list includes `/uimax-sgs-scrape-pattern` twice. The second entry is identical to the first. Both refer to the same skill at `C:\Users\Bean\.claude\skills\uimax-sgs-scrape-pattern\SKILL.md`. There is no separate duplicate. Documented once below.

### /uimax-sgs-scrape-pattern

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\uimax-sgs-scrape-pattern\SKILL.md`
- **Purpose:** Harvest one design pattern (header, hero, pricing card, footer, etc.) from a URL or local mockup and register it to BOTH sgs-framework.db `patterns` AND ui-ux-pro-max.db `patterns` with full Rosetta Stone equivalent_implementations.
- **Pipeline fit:** Invoked by `/sgs-clone` at the +REGISTER tail (Stage 9) for every novel pattern surfaced. Also invocable standalone for ad-hoc pattern harvesting.
- **Scripts referenced:**
  - `plugins/sgs-blocks/scripts/pattern-fingerprint.py` - **In tooling-map.md** under Pattern tools
  - `plugins/sgs-blocks/scripts/pattern-classify.py` - **In tooling-map.md** under Pattern tools
  - `plugins/sgs-blocks/scripts/pattern-register.py` - **In tooling-map.md** under Pattern tools
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - **In tooling-map.md** (listed as the canonical write chokepoint)
  - `~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` - referenced for fingerprint dedup query. Not in tooling-map.md (lives in skill, not repo).
- **Databases:** Writes to `sgs-framework.db` (patterns table). Writes to `ui-ux-pro-max.db` (patterns table). Atomic cross-database write - both succeed or both roll back.
- **Status:** CURRENT
- **Notes:** Pattern-level granularity (not full-page clones). Hard Rule 5 mandates atomic write to both databases. Invokes `/sgs-update` at Stage 8 after the write to refresh the SGS DB scan.

---

### /wp-blocks

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\wp-blocks.md`
- **Purpose:** Search and query WordPress + SGS blocks, schemas, attributes, markup, design tokens, and pattern coverage gaps via the wp-blocks CLI.
- **Pipeline fit:** Cross-cutting reference tool. Used during `/sgs-clone` Stage 3 (SLOT-LIST) and Stage 2 (MATCH) to verify block attribute existence and generate slot lists from block.json. Also useful pre-clone to identify the right target block for a section.
- **Scripts referenced:**
  - `~/.claude/hooks/wp-blocks.py` - the CLI script. **Not in tooling-map.md** - lives in the hooks folder, not the repo scripts folders.
- **Databases:** Reads `sgs-framework.db` (SGS block data). Also reads WordPress core block data from the wp-blocks local DB (backed by the `wp-blockmarkup` data source referenced in the command description as "replaces the wp-blockmarkup and sgs-blockmarkup MCP servers").
- **Status:** CURRENT
- **Notes:** Replaces the retired `wp-blockmarkup` and `sgs-blockmarkup` MCP servers. The "health" subcommand checks DB status.

---

### /wp-hook-graph

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\wp-hook-graph.md`
- **Purpose:** Map WordPress hook dependencies in a plugin - scan PHP for hook usage, generate dependency graphs (ASCII, Graphviz DOT, or Insight Graph JSON), and validate all consumed hooks exist in the database.
- **Pipeline fit:** Auxiliary - not part of the clone pipeline. Useful for SGS plugin development (sgs-blocks, sgs-booking) to audit hook wiring before deployment. Could be used during `/sgs-clone` Stage 7 (COMPOSE) if a section requires plugin hooks, but not invoked by the pipeline automatically.
- **Scripts referenced:**
  - `~/.claude/hooks/wp-hook-graph.py` - the CLI script. **Not in tooling-map.md** - lives in hooks folder.
- **Databases:** Reads the WordPress hooks database (the same verified 7,283-hook database that backs `wp-docs.py`). Does not read or write `sgs-framework.db` or `ui-ux-pro-max.db`.
- **Status:** CURRENT

---

### /wp-hooks

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\wp-hooks.md`
- **Purpose:** Search, validate, and inspect WordPress hooks from the verified hook database (7,283 hooks) - full-text search, context retrieval, JS API usages, and block registrations.
- **Pipeline fit:** Auxiliary - not part of the clone pipeline. Useful when building SGS block internals that use WordPress hooks, or when auditing hook usage in sgs-blocks. The command description says it replaces the retired `wp-devdocs` MCP server.
- **Scripts referenced:**
  - `~/.claude/hooks/wp-docs.py` - the CLI script. **Not in tooling-map.md** - lives in hooks folder.
- **Databases:** Reads a local WordPress hooks/docs database (the same one backing `wp-hook-graph.py`). Does not touch `sgs-framework.db` or `ui-ux-pro-max.db`.
- **Status:** CURRENT
- **Notes:** Note the naming discrepancy: the slash command is `/wp-hooks`, but the underlying CLI is `wp-docs.py`. The command also handles documentation, JS APIs, and block registrations - not just hooks.

---

### /wp-perf-gate

- **Type:** command
- **File:** `C:\Users\Bean\.claude\commands\wp-perf-gate.md`
- **Purpose:** Performance regression gate - a PreToolUse hook that auto-fires on `git commit` in WordPress projects and blocks commits containing critical performance anti-patterns (`posts_per_page => -1`, `query_posts()`, `session_start()`, JS polling patterns).
- **Pipeline fit:** Auxiliary - runs as a CI-style gate on every git commit, not as part of the clone pipeline stages. Protects the SGS codebase quality but is not invoked by `/sgs-clone` or `/sgs-update`.
- **Scripts referenced:**
  - `~/.claude/hooks/wp-perf-gate.py` - the PreToolUse hook script. **Not in tooling-map.md** - lives in hooks folder.
- **Databases:** Does not read or write any databases. Pure static-analysis hook.
- **Status:** CURRENT
- **Notes:** This is a hook description command, not a runnable analysis command. The `/wp-perf-gate status` subcommand explains the hook configuration; the actual enforcement is via `~/.claude/settings.json` hooks.PreToolUse wiring.

---

### /sgs-wp-engine

- **Type:** skill (discipline type)
- **File:** `C:\Users\Bean\.claude\skills\sgs-wp-engine\SKILL.md` (also mirrored at `C:\Users\Bean\.agents\skills\sgs-wp-engine\SKILL.md`)
- **Purpose:** Central authority for all Small Giants Studio WordPress development - builds, tests, and ships SGS Framework blocks, themes, and client sites to S-tier quality standards. Coordinates sub-skills and the design intelligence DB.
- **Pipeline fit:** Cross-cutting coordinator. Not a stage in `/sgs-clone` itself, but invoked by `/sgs-clone` during Stage 7 (COMPOSE) for block-level questions. The skill itself IS the primary SGS block development entry point independent of the clone pipeline.
- **Scripts referenced:**
  - `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` - knowledge base CLI. **Not in tooling-map.md**.
  - `~/.agents/skills/ui-ux-pro-max/scripts/search.py` - design intelligence DB query (referenced in SKILL.md consult section). **Not in tooling-map.md**.
  - SKILL.md references `references/correction-ledger.md` but no direct script invocations into the repo scripts.
- **Databases:** Reads `sgs-framework.db` (via sgs-db.py). Reads `ui-ux-pro-max.db` (via search.py). Does not write in normal usage - writes are handled by sub-skills and pipeline scripts.
- **Status:** CURRENT
- **Notes:** This skill has two locations on disk - `~/.claude/skills/sgs-wp-engine/` (the original) and `~/.agents/skills/sgs-wp-engine/` (a mirror used by agents). Both have the same SKILL.md content. The scripts folder under `.agents` location has the scripts including `sgs-db.py` and `update-db.py`.

---

### /ui-ux-pro-max

- **Type:** skill (discipline type), backed by `/uimax` command
- **File (skill):** `C:\Users\Bean\.agents\skills\ui-ux-pro-max\SKILL.md`
- **File (command):** `C:\Users\Bean\.claude\commands\uimax.md` (the `/uimax` command wraps and exposes this skill)
- **Purpose:** Design intelligence database - queryable SQLite DB (48 tables, 10,356 rows) for palettes, fonts, styles, UX rules, chart types, stack patterns, components, animations, naming conventions. Also accepts write-back via `/uimax ingest <manifest>`.
- **Pipeline fit:** Invoked by `/sgs-clone` at Stage 6 (CLASSIFY, for ambiguous pattern matching), Stage 7 (COMPOSE, for pattern judgement), and at +REGISTER tail (for equivalent_implementations classification). Also invoked by `/uimax-classify-naming` (Stage 4), `/uimax-mood-board` (Stage 4 synthesis), and `/uimax-scrape-animation` (Stage 3 SGS mapping). `/sgs-update` Stage 3 syncs SGS blocks into this DB.
- **Scripts referenced:**
  - `~/.agents/skills/ui-ux-pro-max/scripts/search.py` - query CLI. **Not in tooling-map.md**.
  - `~/.agents/skills/ui-ux-pro-max/scripts/ingest-extraction.py` - write-back ingester. **Not in tooling-map.md**.
  - `~/.agents/skills/ui-ux-pro-max/scripts/update-db.py` - DB update script. **Not in tooling-map.md**.
  - 9 deterministic ingester scripts (`ingest-dtcg.py`, `ingest-wcag.py`, `ingest-iconify.py`, `ingest-vega-lite.py`, `ingest-aria-practices.py`, `ingest-govuk.py`, `ingest-radix.py`, `ingest-gcds.py`, `ingest-uswds.py`) - all under `~/.agents/skills/ui-ux-pro-max/scripts/`. **None in tooling-map.md**.
- **Databases:** Reads and writes `ui-ux-pro-max.db` at `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db`. Does not touch `sgs-framework.db`.
- **Status:** CURRENT
- **Notes:** The `/uimax` command is the CLI entry point that wraps both the query (`/uimax <query>`) and write-back (`/uimax ingest`) modes. The skill `/ui-ux-pro-max` is the intelligence layer that uses the DB for recommendations. Distinction: `/uimax-*` commands are DB activity; `/ui-ux-pro-max` is the intelligence judgement layer (see CLAUDE.md distinction note).

---

### /uimax

- **Type:** command (wraps the `/ui-ux-pro-max` skill)
- **File:** `C:\Users\Bean\.claude\commands\uimax.md`
- **Purpose:** CLI entry point for the design intelligence DB - two modes: query (palettes, fonts, styles, UX rules, tokens, animations, naming conventions) and ingest (write extracted design intelligence back to the DB from a manifest file).
- **Pipeline fit:** Same as `/ui-ux-pro-max` above. This is the command interface; the skill is the backing implementation.
- **Scripts referenced:** Same as `/ui-ux-pro-max` - `~/.agents/skills/ui-ux-pro-max/scripts/search.py` and `ingest-extraction.py`.
- **Databases:** `ui-ux-pro-max.db` (reads on query, writes on ingest).
- **Status:** CURRENT
- **Notes:** `/uimax` and `/ui-ux-pro-max` are two faces of the same system. The command exposes it via slash-invocation; the skill provides the description/trigger-condition layer for the autopilot router.

---

### /uimax-classify-naming

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\uimax-classify-naming\SKILL.md`
- **Purpose:** Identify the naming convention used in an HTML/CSS source (BEM, Tailwind, Bootstrap, hybrid, atomic, custom) and write the result to uimax `naming_conventions` if novel.
- **Pipeline fit:** Invoked by `/sgs-clone` Stage 1 (BOUNDARY) to classify per-section naming conventions. Also invoked by `/uimax-scrape` Stage 3 and `/uimax-mood-board` Stage 4.
- **Scripts referenced:**
  - `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - **In tooling-map.md**
- **Databases:** Reads and writes `ui-ux-pro-max.db` (naming_conventions table). Does not touch `sgs-framework.db`.
- **Status:** CURRENT

---

### /uimax-mood-board

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\uimax-mood-board\SKILL.md`
- **Purpose:** Bulk-extract design intelligence from 2+ URLs into a named uimax `mood_boards` entry, aggregating palette, typography, animations, and naming conventions across sources.
- **Pipeline fit:** Invoked by `/sgs-clone` only when a multi-mockup dogfood batch needs an aggregated mood board (operator-requested). Not invoked on standard single-mockup clone runs.
- **Scripts referenced:**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md** (via the `uimax_write.py` chokepoint)
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - **In tooling-map.md**
  - No direct script invocations from the mood-board skill itself - delegates to `/uimax-scrape`, `/uimax-classify-naming`, and `/ui-ux-pro-max` as sub-skills.
- **Databases:** Writes to `ui-ux-pro-max.db` (mood_boards table, plus indirectly via /uimax-scrape sub-invocations to colors, animations, naming_conventions). Does not touch `sgs-framework.db`.
- **Status:** CURRENT

---

### /uimax-scrape

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\uimax-scrape\SKILL.md`
- **Purpose:** Extract design tokens (colours, fonts, spacing, shadows, radii, animations, naming convention) from a URL or local folder and write them to the uimax database with cross-platform equivalents.
- **Pipeline fit:** Pre-clone preparation tool. Used before running `/sgs-clone` on a new client to seed uimax with the client's design language. Also invoked by `/uimax-mood-board` as a sub-step per URL.
- **Scripts referenced:**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - **In tooling-map.md**
  - Delegates URL ingestion to `/sgs-extraction` skill and token extraction to `/design-ref` skill - no direct repo script invocations beyond the write validator.
- **Databases:** Writes to `ui-ux-pro-max.db` (colors, animations, naming_conventions, component_libraries, icon_libraries tables). Does not touch `sgs-framework.db`.
- **Status:** CURRENT

---

### /uimax-scrape-animation

- **Type:** skill (pipeline type)
- **File:** `C:\Users\Bean\.claude\skills\uimax-scrape-animation\SKILL.md`
- **Purpose:** Harvest one animation (CSS keyframes, transition, scroll-driven animation, hover effect) from a URL or local file and write it to uimax `animations` with the SGS block-attribute equivalent populated. Replaces deprecated `/animation-harvest`.
- **Pipeline fit:** Invoked by `/sgs-clone` at the +REGISTER tail (Stage 9) for every novel animation surfaced from the source CSS. Also invocable standalone for ad-hoc animation harvesting.
- **Scripts referenced:**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` - **In tooling-map.md**
  - `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - **In tooling-map.md**
  - Delegates URL ingestion to `/sgs-extraction` and SGS-block mapping judgement to `/ui-ux-pro-max`. No direct repo script invocations beyond the write validator.
- **Databases:** Writes to `ui-ux-pro-max.db` (animations table, including `is_gap_candidate`, `gap_reason`, `sgs_block`, `sgs_animation_attribute`, `equivalent_implementations` columns). Does not touch `sgs-framework.db`.
- **Status:** CURRENT
- **Notes:** The `is_gap_candidate=1` rows written by this skill are read by `/sgs-update` Stage 4 (via `sgs-update-uimax-sync.py`) to generate the gap-candidates report.

---

### /chrome-devtools-cli

- **Type:** skill (provided by `chrome-devtools-mcp` plugin)
- **File:** `C:\Users\Bean\.claude\plugins\cache\claude-plugins-official\chrome-devtools-mcp\0.22.0\skills\chrome-devtools-cli\SKILL.md`
- **Purpose:** Write shell scripts or run shell commands to automate browser tasks via the `chrome-devtools` CLI tool (a wrapper around the Chrome DevTools MCP server daemon).
- **Pipeline fit:** Stage 4/5 fallback dependency. `/sgs-clone` SKILL.md explicitly states that runtime CSS extraction for hashed/minified classes uses "Chrome DevTools MCP (preferred)" as a fallback parser tier at Stages 4 and 5. The CLI is the command-line face of this. Also used in +PARITY for visual inspection if needed.
- **Scripts referenced:** No Python or JS scripts in the repo. The CLI itself is the `chrome-devtools` global npm binary from the `chrome-devtools-mcp` package.
- **Databases:** Does not read or write `sgs-framework.db` or `ui-ux-pro-max.db`.
- **Status:** CURRENT
- **Notes:** The CLI invokes a background daemon (Chrome DevTools MCP server) that persists between commands. On Windows it uses named pipes. Key commands for the pipeline: `evaluate_script` (runtime CSS extraction), `take_screenshot` (+PARITY), `take_snapshot` (accessibility tree inspection). See `docs/cli.md` in the plugin cache for full reference.

---

### /playwright

- **Type:** skill
- **File:** `C:\Users\Bean\.agents\skills\playwright\SKILL.md`
- **Purpose:** Browser automation and visual testing - navigate sites, take screenshots at multiple breakpoints, fill forms, run accessibility audits, and verify deployments via Playwright CLI or MCP tools.
- **Pipeline fit:** Stage 4/5 fallback dependency (same role as `/chrome-devtools-cli` - Playwright is the alternative runtime CSS extraction method). Explicitly used by `visual_qa_capture.py` (in tooling-map.md) which is the production capture callable for `autonomy_gate.py`. Also used by `tools/multi-frame-qa/capture.js` for +PARITY.
- **Scripts referenced:**
  - `tools/multi-frame-qa/capture.js` - **In tooling-map.md** (multi-frame QA section). The skill provides the Playwright runtime that this script depends on.
  - `scripts/mockup-parity-validator.js` - **In tooling-map.md**. Requires Playwright.
  - `scripts/screenshot-diff-helper.js` - **In tooling-map.md**. Requires Playwright.
  - `plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` - **In tooling-map.md**. Uses Playwright MCP tools or CLI for screenshot capture.
- **Databases:** Does not read or write any databases directly.
- **Status:** CURRENT
- **Notes:** The skill recommends CLI for systematic work (multi-breakpoint suites, full QA runs) and MCP tools for quick inline checks. The `/sgs-clone` SKILL.md lists Playwright as the fallback after Chrome DevTools MCP for runtime CSS extraction (Stage 4/5). In practice `visual_qa_capture.py` is the production path that calls Playwright.

---

## New scripts surfaced (not yet in tooling-map.md)

| Script path | Referenced by | What it does |
|---|---|---|
| `tools/recogniser-v2/validate-naming.py` | `/sgs-clone` SKILL.md Stage 0 pre-flight gate section | Validates HTML draft class names against the SGS-BEM naming convention before Stage 1; three modes: production (hard-reject), --draft-mode (warn), --legacy (bypass) |
| `tools/recogniser-v2/visual_qa_config.json` | `/sgs-clone` SKILL.md Tool Bindings + `/sgs-update` command | Visual-QA threshold config (1% pass / 0.5% surface / 3 viewports); not a script but a config file used by autonomy_gate.py and capture.js |
| `~/.agents/skills/sgs-wp-engine/scripts/sgs-db.py` | `/sgs-db` command, `/uimax-sgs-scrape-pattern` Tool Bindings | SGS framework CLI - queries blocks, tokens, patterns, hooks; used for fingerprint dedup queries and all `/sgs-db` command invocations |
| `~/.agents/skills/sgs-wp-engine/scripts/update-db.py` | `/sgs-update` command Stage 1 | Rescans the SGS codebase and updates sgs-framework.db |
| `~/.claude/hooks/wp-blocks.py` | `/wp-blocks` command | Block schema lookup CLI replacing wp-blockmarkup + sgs-blockmarkup MCP servers |
| `~/.claude/hooks/wp-docs.py` | `/wp-hooks` command | WordPress hook search and validation CLI replacing wp-devdocs MCP server |
| `~/.claude/hooks/wp-hook-graph.py` | `/wp-hook-graph` command | Plugin hook dependency mapper + graph generator |
| `~/.claude/hooks/wp-perf-gate.py` | `/wp-perf-gate` command | PreToolUse git-commit performance anti-pattern gate |
| `~/.agents/skills/ui-ux-pro-max/scripts/search.py` | `/uimax` command, `/ui-ux-pro-max` skill, `/sgs-wp-engine` skill | Design intelligence DB query CLI |
| `~/.agents/skills/ui-ux-pro-max/scripts/ingest-extraction.py` | `/uimax` command (ingest mode) | Write-back ingester for /sgs-extraction and /design-ref manifests |

Note: the hook scripts (`~/.claude/hooks/`) and skill scripts (`~/.agents/skills/`) live outside the repo. They are shared infrastructure and would be catalogued separately from the repo tooling-map. The two repo-relative entries (`tools/recogniser-v2/validate-naming.py` and `tools/recogniser-v2/visual_qa_config.json`) are genuine additions to the tooling-map.md.

---

## Cross-reference: scripts in tooling-map.md to commands/skills

For each major script category in tooling-map.md, which command or skill is the primary invoker?

| Script | Primary invoker |
|---|---|
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | `/sgs-clone` skill - this IS the pipeline entry |
| `plugins/sgs-blocks/scripts/orchestrator/orchestrator_main.py` | `/sgs-clone` (via sgs-clone-orchestrator.py); no direct command |
| `plugins/sgs-blocks/scripts/orchestrator/register_patterns.py` | `/sgs-clone` +REGISTER tail (via orchestrator_main.py); no direct command |
| `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py` | `/sgs-clone` Stage 1; `/uimax-classify-naming` Stage 2 |
| `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` | `/sgs-clone` Stage 2 |
| `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py` | `/sgs-clone` Stage 9 |
| `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py` | `/sgs-clone` Stage 9 |
| `plugins/sgs-blocks/scripts/recogniser/bucket-c-classifier.py` | `/sgs-clone` Stage 9 (tests-only path currently) |
| `plugins/sgs-blocks/scripts/recogniser/attribute-gap-writer.py` | `/sgs-clone` Stage 9 (tests-only path currently) |
| `plugins/sgs-blocks/scripts/recogniser/functionality-gap-detector.py` | `/sgs-clone` Stage 9 (tests-only path currently) |
| `plugins/sgs-blocks/scripts/recogniser/gap-review-report.py` | `/sgs-clone` Stage 9 (tests-only path currently) |
| `plugins/sgs-blocks/scripts/recogniser/recursion-guard.py` | `/sgs-clone` (imported throughout DOM-walking stages) |
| `tools/recogniser-v2/extract.py` | `/sgs-clone` Stages 4-8 (via sgs-clone-orchestrator.py subprocess) |
| `tools/recogniser-v2/extract_strategies.py` | `/sgs-clone` (imported by extract.py) |
| `plugins/sgs-blocks/scripts/value-matcher/match.py` | `/sgs-clone` (imported by token_resolver.py) |
| `plugins/sgs-blocks/scripts/value-matcher/inheritance.py` | `/sgs-clone` (imported by supports_writer.py + preflight_chain.py) |
| `plugins/sgs-blocks/scripts/lints/bem-lint.py` | `/sgs-clone` pre-commit gate (via preflight_chain.py) |
| `plugins/sgs-blocks/scripts/lints/token-lint.py` | `/sgs-clone` pre-commit gate (via preflight_chain.py) |
| `plugins/sgs-blocks/scripts/drift-validator/validate.py` | `/sgs-clone` pre-commit gate (via preflight_chain.py) |
| `plugins/sgs-blocks/scripts/gap-detection/detect.py` | `/sgs-update` Stage 10 |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | `/sgs-update` Stage 4 |
| `plugins/sgs-blocks/scripts/pattern-fingerprint.py` | `/uimax-sgs-scrape-pattern` Stage 3 |
| `plugins/sgs-blocks/scripts/pattern-classify.py` | `/uimax-sgs-scrape-pattern` Stage 5 |
| `plugins/sgs-blocks/scripts/pattern-register.py` | `/uimax-sgs-scrape-pattern` Stage 7 (older standalone path; superseded by register_patterns.py in live pipeline) |
| `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` | All `/uimax-*` skills at their write step; also `/uimax-sgs-scrape-pattern` |
| `plugins/sgs-blocks/scripts/uimax-tools/uimax-write-validator.py` | All `/uimax-*` skills; `/sgs-clone` +REGISTER; all uimax writes |
| `plugins/sgs-blocks/scripts/uimax-tools/sgs-update-uimax-sync.py` | `/sgs-update` Stage 3+4 |
| `plugins/sgs-blocks/scripts/generate-block-reference.py` | `/sgs-update` Stage 2 |
| `scripts/mockup-parity-validator.js` | `/sgs-clone` +PARITY tail; `/playwright` skill provides the runtime |
| `scripts/screenshot-diff-helper.js` | `/sgs-clone` +PARITY tail; `/playwright` skill provides the runtime |
| `scripts/global-styles-reset.js` | `/sgs-clone` +DEPLOY tail |
| `scripts/wp-update-block-attrs.js` | `/sgs-clone` +DEPLOY tail |
| `scripts/colour-parity-audit.js` | Standalone QA tool; not invoked by any command/skill automatically |
| `tools/multi-frame-qa/capture.js` | `/sgs-clone` +PARITY (via visual_qa_capture.py); `/playwright` skill provides Playwright runtime |
| `plugins/sgs-blocks/scripts/orchestrator/autonomy_gate.py` | `/sgs-clone` (via orchestrator_main.py) |
| `plugins/sgs-blocks/scripts/orchestrator/visual_qa_capture.py` | `/sgs-clone` (via sgs-clone-orchestrator.py import + orchestrator_main.py) |

---

## ADDENDUM 2026-05-13 - /visual-qa pipeline skill (sibling, not in /sgs-clone path)

The `/visual-qa` skill was missed in the initial 17-item audit. It IS a pipeline skill but it is NOT called by `/sgs-clone`. The clone pipeline's Stage 8 uses the lightweight `visual_qa_capture.py` (Quick-mode equivalent embedded into the autonomy_gate). The full 9-layer `/visual-qa` is operator-invoked separately for deep audits. They share `tools/recogniser-v2/visual_qa_config.json` but no code.

### /visual-qa

- **Type:** skill (pipeline)
- **File:** `C:/Users/Bean/.claude/skills/visual-qa/SKILL.md` (429 lines, mirrored byte-for-byte at `C:/Users/Bean/.agents/skills/visual-qa/SKILL.md`)
- **Purpose:** Operator-invoked 9-layer audit on an SGS WordPress page. Quick / Full / Compare modes.
- **Pipeline fit:** NOT part of /sgs-clone. Sibling pipeline that runs independently when an operator wants a deep audit. /sgs-clone Stage 8 uses `visual_qa_capture.py` instead (Quick mode subset).
- **Scripts referenced:** 8 skill-internal JS scripts at `C:/Users/Bean/.agents/skills/visual-qa/scripts/` (NOT in repo, lives in skill bundle):
  - `responsive-screenshots.js` - multi-breakpoint capture
  - `capture-states.js` - hover/focus/active state capture
  - `global-css-diff.js` - computed-style diff between mockup + render
  - `element-extractor.js` - DOM element extraction for parity checks
  - `token-validator.js` - theme.json token compliance
  - `a11y-audit.js` - axe-core wrapper
  - `perf-check.js` - Core Web Vitals via Playwright
  - `run-audit.js` - top-level coordinator that calls the 7 above
- **Databases:** none directly (uses Playwright runtime + filesystem only)
- **Status:** CURRENT - but with a live bug
- **KNOWN BUG (2026-05-13):** `run-audit.js:137` calls `responsive-audit.js` but the file on disk is `responsive-screenshots.js`. The coordinator would crash at L1 with module-not-found. Fix: rename the call or rename the file. Verified by Gemini Flash QC.

### Relationship to visual_qa_capture.py (critical clarification)

| Aspect | `/visual-qa` skill (operator-invoked) | `visual_qa_capture.py` (live pipeline) |
|---|---|---|
| Invocation | Operator types `/visual-qa <url>` | Automatically called by autonomy_gate at Stage 8 |
| Mode coverage | Quick / Full / Compare (9 layers) | Quick-mode subset only |
| Implementation | 8 JS scripts coordinated by run-audit.js | Single Python file + Playwright + PIL |
| Output | Operator-readable markdown report | `stage-8-visual_qa.json` artefact in pipeline-state |
| Shared config | Reads `tools/recogniser-v2/visual_qa_config.json` | Reads same file |
| Code sharing | None | None - parallel implementations |

**Implication for Phase 6:** the pixel-parity gate that determines /sgs-clone success/halt is owned by `visual_qa_capture.py`, NOT by `/visual-qa`. The /visual-qa skill is the deep-audit tool you'd run AFTER the pipeline succeeds, not the gate that makes it succeed.
