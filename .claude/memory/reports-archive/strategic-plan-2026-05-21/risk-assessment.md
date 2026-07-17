# Risk Assessment — SGS Architecture Programme

**Generated:** 2026-05-21 (strategic-plan Phase 3 risk agent, Sonnet)
**Scope:** Phases 0.5–7 (Phase 0 shipped at commit `aec54882`)
**Method:** Pre-mortem — for each phase, assume failure, trace plausible causes

## Phase 0.5 — Structural QC enforcement hook (Decision 31)

**Top risks:**

1. **The `[qc:<run_id>]` marker requirement is too easy to forget, producing a wall of warnings + getting mentally classified as "that annoying thing" within 2 sessions.** Impact: High | Probability: Med | Trigger: `--no-verify` use in commit OR hook disabled in settings.json within 2 sessions | Mitigation: Instead of a marker-in-commit-message-body discipline, have the hook check for a QC artefact file (`pipeline-state/<run>/qc-panel.json`) modified within the last 60 minutes. Objective file-presence test — no human-typing.

2. **Hook fires on `lucide-icons.php` edits (not converter logic) because pattern matching is too broad — false-positive noise degrades trust.** Impact: Med | Probability: High | Trigger: First lucide-related edit generates spurious warning | Mitigation: Scope paths precisely to `converter_v2/convert.py`, `sgs-clone-orchestrator.py`, `sgs-update.py`. Add explicit exclusion list. Test with known-safe edit before shipping.

3. **PostToolUse hook doesn't fire on Bash heredoc writes to converter files — bypass open.** Impact: Med | Probability: Low | Mitigation: Add PreToolUse hook on Bash matching `*convert.py*` / `*orchestrator*` patterns alongside the Write/Edit PostToolUse.

**Dependency risks:** Phase 0.5 is architecturally independent BUT must ship before Phase 1 dispatches subagents. Otherwise Phase 1 commits won't have the gate active.

**Integration risks:** Every subsequent phase relies on this hook. If 0.5 ships broken, blub.db 255 has no enforcement floor precisely when the riskiest structural changes are running.

---

## Phase 1 — DB merge (Decisions 1, 2, 11)

**Top risks:**

1. **Cold-query latency on Windows (SQLite WAL + AV scanning) exceeds 2-3s per lookup, breaking the "one query" promise on cv2's hot path.** Impact: High | Probability: Med | Trigger: `python sgs-db.py block sgs/hero` takes >500ms post-merge | Mitigation: Benchmark immediately after seeding 7283 hooks + 1150 docs. If >200ms on hot path, add FTS5 index on `docs.content` + covering index on `blocks(source, slug)` BEFORE Phase 3 depends on it.

2. **Importing hooks.db produces duplicates because no dedup guard on `(hook_name, source)` composite key.** Impact: Med | Probability: High | Trigger: `SELECT COUNT(*) FROM hooks WHERE source='sgs'` returns 2× expected | Mitigation: Add `UNIQUE(hook_name, source)` constraint BEFORE import. Use `INSERT OR IGNORE` throughout. Verify with post-import dedup query before declaring done.

3. **`doc_type='cli-command'` conflates command docs with narrative docs — future queries miss commands documented inline within prose.** Impact: Med | Probability: Med | Mitigation: Before seeding, enumerate all WP-CLI commands from handbook repo + build complete list. Cross-reference against `wp help --list`. Treat mismatches as failures.

**Dependency risks:** Phase 0 seeded `slot_synonyms` + `blocks.parent_block`. Phase 1 migration must explicitly PRESERVE existing SGS-source rows while importing native_wp + third_party rows. Use `INSERT OR IGNORE` patterns, never `DROP + RECREATE`.

**Integration risks:** Phase 3 reads `blocks.parent_block` + `slot_synonyms.standalone_block` from merged DB. **If Phase 1 introduces a `source` column that requires filtering (`WHERE source='sgs'`) on slot_synonyms queries, but Phase 3 implementer queries without that filter, they'll silently get native_wp rows intermixed.** Phase 3 implementer prompt MUST scope queries to SGS rows explicitly.

---

## Phase 2 — Block variations indexing (Decisions 7, 8)

**Top risks:**

1. **`class-sgs-block-variations.php` is the seed source but variations registered at runtime via `register_block_variation()` JS may differ from PHP — DB rows out of sync with editor reality.** Impact: Med | Probability: Med | Mitigation: After PHP seeding, run Playwright snapshot of block inserter + cross-reference variation names against DB. Any missing row = seed failure.

2. **`inner_blocks_json` seeded incorrectly for composite blocks → Phase 3 emits wrong block structure.** Impact: High | Probability: Low | Mitigation: For every variation with non-null `inner_blocks_json`, manually verify shape against editor render before Phase 2 gates done.

3. **Leaner variations schema (Decision 7) omits fields blocks.db includes → Phase 7's wp-skills audit flags SGS variations as under-documented.** Impact: Low | Probability: Med | Mitigation: Before creating Phase 2 schema, enumerate full core schema with `SELECT * FROM blocks.db_variations LIMIT 1`. Map every field to "include" or "explicitly exclude with reason". Document exclusions in DDL comment.

---

## Phase 3 — INNER_BLOCK_PATTERNS retirement (Decisions 24, 12)

**Top risks:**

1. **Rewritten `_lift_inner_blocks(node, parent_slug)` emits adjacent-button grouping correctly for 2-button case but silently drops buttons when mockup has 3+ CTAs — wrap-adjacent-siblings logic assumes pairs.** Impact: High | Probability: Med | Mitigation: Write explicit regression test for N=3 and N=4 CTA cases BEFORE deleting INNER_BLOCK_PATTERNS. Use real mockup HTML, not synthetic.

2. **`slot_synonyms.standalone_block` returns NULL for unseeded slots (~30 of 89 seeded in Phase 0) — converter silently omits inner blocks rather than raising visible error.** Impact: High | Probability: High | Mitigation: Add explicit fallback in `_lift_inner_blocks` that logs WARNING to `errors.log` (Spec 20 structured pipeline log) for every NULL lookup. Never fail silently.

3. **Decision 24 RESOLVED in this session but implementer may re-investigate Pattern Overrides and waste 30-45 min.** Impact: Low | Probability: Med | Mitigation: Phase 3 cold prompt MUST include explicit "Decision 24 RESOLVED — see `.claude/reports/2026-05-21-pattern-overrides-research.md`. Do NOT re-investigate."

**Integration risks:** Pre-dispatch grep of `scripts/orchestrator/` for `INNER_BLOCK_PATTERNS` is MANDATORY — covers any test fixture / import / docstring reference outside convert.py.

---

## Phase 4 — `/sgs-update` rebuild + Option B port (Decisions 13, 30)

**Top risks:**

1. **Largest single phase (~5.5 hr) likely to spill into 2 sessions mid-rewrite, leaving `sgs-update.py` in hybrid state.** Impact: High | Probability: High | Mitigation: Structure as NEW file `sgs-update-v2.py` co-existing with old. Only delete old + swap entrypoint after all 9 stages complete + Phase 4 gate passes. Subagent prompt MUST include this staging.

2. **`developer.wordpress.org/reference/since/<version>/` scraper hits rate limiting or JS-rendered HTML, returns zero items — completeness gate silently passes.** Impact: High | Probability: Med | Mitigation: Hard minimum threshold — if <100 functions/classes/hooks found for current WP version, gate FAILS with explicit count. Use Playwright headless for JS-rendered pages.

3. **Per-release drift-check fires on EVERY deploy (dev site running 7.0.x vs DB indexed for 7.0.y) → daily false-positives train Bean to ignore.** Impact: Med | Probability: Med | Mitigation: Drift check compares MAJOR.MINOR only (`7.0` not `7.0.1`). Only fire on minor-version mismatch (7.1+ against 7.0 index).

---

## Phase 5a — Variation system kill + per-site theme.json (Decisions 14′, 16′, 17′, 18, 19)

**Top risks:**

1. **`push-theme-snapshot.py` overwrites server's theme.json — if snapshot missing a key the operator set in Site Editor, effective value silently reverts to framework default.** Impact: High | Probability: Med | Mitigation: Pre-push diff (Decision 12.2 resolution) must compare LOCAL snapshot against `wp_global_styles` (fetched via REST), not just server's theme.json. Flag keys present in `wp_global_styles` but absent from snapshot as "operator overrides that WILL survive."

2. **Deleting 3 PHP files without confirming no other PHP file `require_once`s them → fatal PHP error on first page load → site down.** Impact: High | Probability: Med | Mitigation: Before deleting, run `grep -r "Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator" plugins/sgs-blocks/`. Every reference cleaned up BEFORE delete. Mandatory pre-delete step.

3. **`/sgs-clone` Stage 10 auto-derives `--client` and invokes push — running clone pipeline on dev site for QA changes the live branding.** Impact: Med | Probability: High | Mitigation: Add `--no-push` flag. Default for `--target` matching `sandybrown-*` or `palestine-lives.org` should be `--no-push` unless explicitly overridden.

**Integration risks:** Phase 5b assumes `active_theme_style` theme_mod cleanly removed. If 5a deletes PHP files but leaves `set_theme_mod` calls in `functions.php`, Customiser interacts with stale theme_mod → silent state corruption.

---

## Phase 5b — Customiser migration (Decisions 21, 22, 27)

**Top risks:**

1. **Decision 22's CSS bridge deletion requires confirming WP 7.0 covers every property — if ANY uncovered, buttons render incorrectly, no fallback.** Impact: High | Probability: Med | Mitigation: Property-coverage audit script BEFORE deleting bridge: (1) list every `--wp--custom--button-presets--*` property current bridge emits, (2) render test button via Playwright, (3) compute which properties come from WP-native theme.json CSS generation vs the bridge. Delete bridge ONLY after (3) shows 100% coverage. **This is the exact check the staging doc §6.3 calls out — make it a GATE, not a manual check.**

2. **Customiser `postMessage` live-preview can't simulate server-side conditional rules → preview shows wrong header for conditional configurations.** Impact: Med | Probability: High | Mitigation: Use `transport: 'refresh'` (not postMessage) for ANY Customiser control that maps to server-side conditional rule. Only postMessage for pure CSS/visual.

3. **View Transitions silently no-ops in Customiser iframe (function targets admin not Customiser) — missing UX enhancement goes unnoticed.** Impact: Low | Probability: Med | Mitigation: Playwright assertion navigating between 2 Customiser panels capturing screenshots at 100ms intervals. If all identical, apply manual fallback (`customize_controls_enqueue_scripts`).

---

## Phase 6 — Markup examples + supports backfill + WP 7.0 audits + Lucide REST (Decisions 9, 10, 23, 25, 28)

**Top risks:**

1. **Bumping all 73 blocks to `apiVersion: 3` → WP 7.0 enforces iframed editor → static blocks with save.js may produce "unexpected content" errors due to different CSS cascade in iframe.** Impact: High | Probability: Med | Mitigation: Canary group of 3 representative static blocks. Bump + test in iframed editor on dev site. Confirm save output renders identically. Only bulk-bump after canary passes. NO bulk-bump without canary.

2. **Auto-generated markup examples reflect current attribute defaults → stale silently when attributes refactor.** Impact: Med | Probability: Med | Mitigation: Add `generated_from` column to `markup_examples` storing block's `block.json` mtime at generation time. Phase 4 drift gate cross-references against current mtimes — flag stale examples in `/sgs-update` output.

3. **Lucide REST migration changes delivery mechanism for ALL consumers simultaneously → broken icon picker.** Impact: High | Probability: Med | Mitigation: Compatibility shim keeps existing `sgs_get_lucide_icon()` PHP function working alongside new REST registration. Delete shim only after Playwright confirms icon picker loads in editor.

---

## Phase 7 — WP 7.0 alignment (Decisions 26, 29)

**Top risks:**

1. **Skill revisions introduce misunderstood WP 7.0 APIs → every downstream task using that skill generates buggy code.** Impact: High | Probability: Med | Mitigation: Each skill revision includes minimal code example tested on dev site (Playwright + console error check) before commit. "Audited" ≠ "verified" — gate is working code on live WP 7.0.

2. **`Sgs_Ai_Connector` requires AI provider plugin active — `wp_get_connector()` returns null without one → fatal errors on first call.** Impact: Med | Probability: High | Mitigation: `Sgs_Ai_Connector::call()` checks `wp_is_connector_registered($provider)` BEFORE calling. Returns `WP_Error` (not throw) if no provider. Infrastructure class safe to instantiate even with zero registered connectors.

3. **Phase 7 schedulable parallel with all others — but skills audit revises skills used by concurrent Phase 6.** Impact: Med | Probability: Low | Mitigation: Phase 7 skill revisions DISPATCHED only after Phase 6 completes. Annotate phase plan: "Phase 7 parallel with 4/5a/5b, but NOT 6."

---

## Plan-level risks (cross-phase)

1. **Phase 1 silent schema regression → every downstream phase reads from merged DB; Python `if row:` checks treat empty as "no data" not "broken query".** Mitigation: Phase 1 gate MUST include comprehensive schema assertion script (`sgs-db-assert.py`) running every query shape downstream phases use + verifying non-empty results for known rows. Committed alongside migration.

2. **Programme spans 8-10 sessions — staging doc may drift from implementation state if subagent modifies a decision without updating doc.** Mitigation: Each phase's subagent prompt includes: "Before starting, `git log --oneline -20` for commits referencing staging doc decision numbers. If found, skip done work + update staging doc."

3. **Phase 5a deletes 3 PHP files — only irreversible destructive operation in programme.** Mitigation: Two-commit pattern. Commit 1: archive files to `_retired/` directory. Commit 2: delete from `_retired/` after 1 session of confirmed correct operation. Recovery = single `git revert`.

4. **4-parallel-session strategy: Session A's Phase 4 introduces changes B/C/D depend on; sessions block silently.** Mitigation: Sessions B/C/D prompts check Phase 4 completion BEFORE invoking `/sgs-update`: "Do NOT invoke `/sgs-update --refresh-upstream` until Phase 4 confirmed shipped (`git log --oneline | grep 'Phase 4'`). If not yet merged, use existing 4-stage version."

5. **WP 7.1 could ship mid-programme (~4-month cadence puts 7.1 within 8-10 session window).** Mitigation: Phase 4's `/sgs-update` queries `developer.wordpress.org/reference/deprecated-7.1/` and warns if any API used in SGS appears deprecated. If 7.1 ships before Phase 7, scope expands to 7.1 — note in Phase 7 prompt template.

6. **No rollback plan for sandybrown if mid-programme deployment breaks pixel-diff baseline.** Mitigation: Before each PHP/CSS-modifying phase (3, 5a, 5b, 6), snapshot current sandybrown pixel-diff numbers via `scripts/pixel-diff.py` → `reports/pixel-diff-baseline-phase-N-pre.json`. If post-phase measurement exceeds pre by >5%, treat as regression + block gate.
