---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-22-architecture-execution
generated: 2026-05-21
prior_session: small-giants-wp-2026-05-21-architecture-staging
primary_goal: "Execute the architecture programme. Each of 9 phases has a full per-step plan with copy-paste-ready cold prompt at .claude/plans/phase-<N>-*.md. Dispatch sequentially with /qc-council gates between, OR open multiple parallel sessions per the §13 parallel-session plan. Goal: zero mid-execution interrupts beyond QC-gate verdicts + commit gates + eyes-on verification. CALIBRATED EFFORT (post-correction): critical path (0.5→1→3→5a) ~3-6 hrs; full programme sequential ~13-23 hrs; full programme with 4 parallel sessions ~5-8 hrs wall-clock."
---

# Next session — Auto-runnable execution of live-correctness critical path

Invoke `/autopilot` before doing anything else.

You are picking up an architectural execution programme. The architecture was designed, debated across 6 pushback rounds, /qc-council-validated, and broken into 8 phases yesterday (2026-05-21). Phase 0 already shipped at commit `aec54882`. Your job this session: execute Phases **0.5 → 1 → 3 → 5a** sequentially. These four phases close all user-visible bugs from the prior debugging session. The other 4 phases (2, 4, 5b, 6, 7) are quality/UX/automation improvements that can run in parallel sessions OR after this critical path.

**Expected cost (CALIBRATED post-correction):** Critical path with QC gates ≈ **3-6 hrs sequential** — one long session OR two normal sessions. Per-phase breakdown: 0.5 ~25 min, 1 ~45-75 min, 3 ~60-105 min, 5a ~60-105 min, plus ~45-65 min QC gates between. PERT report at `.claude/reports/strategic-plan-2026-05-21/effort-pert.md` has corrected per-phase numbers.

## Mandatory reads BEFORE Phase 0.5 dispatches

1. `.claude/plans/2026-05-21-architecture-staging.md` — the canonical architecture doc with 31 decisions, 8 phases, WP 7.0 audit, impacted-spec revision plan, all open questions resolved
2. `.claude/reports/strategic-plan-2026-05-21/risk-assessment.md` — per-phase pre-mortem
3. `.claude/reports/strategic-plan-2026-05-21/hidden-decisions.md` — pre-resolved decision points so implementer subagents don't pause
4. `.claude/reports/strategic-plan-2026-05-21/effort-pert.md` — calibrated time estimates
5. `.claude/reports/2026-05-21-pattern-overrides-research.md` — Decision 24 RESOLVED (Pattern Overrides is operator UX layer, NOT INNER_BLOCK_PATTERNS replacement)
6. `.claude/handoff.md` — last session digest

## Critical binding rules (re-violation = recurring correction)

- **blub.db 254** — Read `pipeline-state/<run>/leftover-buckets.json` BEFORE conjecturing about causes
- **blub.db 255** — Multi-model `/qc` panel BEFORE every converter/pipeline/SGS-block commit
- **blub.db 256** — Per-section cropped pixel-diff via `--selector .sgs-{section}`, NOT full-page
- **blub.db 272** — Schema enumeration BEFORE any "missing column" claim
- **blub.db 276** — Council fix-shape proposals are hypotheses; empirical pre/post baseline before implementer dispatch
- **blub.db 281** (NEW) — QC gate must be structural, not remembered. After Phase 0.5 ships, every subsequent commit on converter / orchestrator paths must cite `[qc:<run_id>]` in commit message
- **No `git stash`** in subagents (feedback_no_git_stash_in_subagents.md)
- **No `git reset --hard` / `git restore .` / `git checkout --` / `git clean -f`**
- **No `Co-Authored-By:`** in commit messages
- **Always merge to main** (squash + delete branch + checkout main + pull) at session close

## Pre-existing uncommitted changes

Three items present since yesterday session start (DO NOT TOUCH):
- Deleted spec 15 file
- Modified `plugins/sgs-blocks/includes/lucide-icons.php`
- Untracked `plugins/sgs-blocks/sgs-framework.db`

Scope every commit by exact path. Never `git add .` or `git add -A`.

---

## Phase 0.5 — Structural QC enforcement hook (~40 min, dispatch first)

**What:** New PostToolUse hook that warns when converter / orchestrator commits skip `/qc` panel.

**Cold prompt for the implementer subagent (copy verbatim into Agent tool):**

```
You are implementing Decision 31 (Structural QC enforcement hook) from the SGS architecture programme.

# Plain-English context

Three commits in the previous session shipped without running the multi-model /qc panel that binding rule blub.db 255 requires. The rule depends on Claude remembering it; that's provably insufficient. Your job: build a hook that makes the gate structural.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §11 Decision 31 (the design)
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md "Phase 0.5" section (3 risks + mitigations)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md "Phase 0.5" section (pre-resolved decisions)
- An existing hook for shape reference: ~/.claude/hooks/drift-check-dispatcher.py (mixed posture A/B pattern)

# What to build

1. NEW FILE: `.claude/hooks/qc-on-converter-edit.py`
2. Behaviour:
   - PostToolUse hook fires when Write/Edit targets these EXACT paths:
     - `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py`
     - `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`
     - `plugins/sgs-blocks/scripts/sgs-update.py` (does not exist yet — Phase 4 creates it; future-proof)
   - On those edits, write a transient marker to `.claude/.qc-edit-tracker.json` (path + timestamp + tool that did the edit)
   - Stale-purge entries older than 2 hours from the tracker on every read
   - ALSO: PreToolUse hook on Bash commands matching git commit. If the commit message body does NOT contain `[qc:<run_id>]` AND any tracker entry exists on a converter path, emit systemMessage warning naming the missing gate. systemMessage only — does not block the commit (operator can still proceed with `[qc-skipped:<reason>]` marker if they consciously skip).
3. NEW FILE: `.claude/.qc-edit-tracker.json` (initial empty `{"edits": []}` for the hook to read)
4. UPDATE: `.claude/settings.json` — register the hook (PostToolUse + PreToolUse entries)

# Safety scope

- ONLY fire on the 3 specific converter/orchestrator/update paths. Add explicit exclusion test for `lucide-icons.php` and any non-converter file under sgs-blocks.
- Hook itself must not crash. Wrap in try/except + log to stderr on failure.
- Use the CC hook output schema: `permissionDecision: "allow"` + `systemMessage` for warnings (NEVER `decision: "allow"` — that's invalid per blub.db row feedback_cc_hook_schema_decision_allow).

# Verification gate (before committing)

1. Trigger the hook intentionally: edit one of the 3 watched files (a no-op whitespace edit), then attempt a git commit without the `[qc:...]` marker. Confirm warning fires.
2. Trigger the false-positive test: edit lucide-icons.php (the third uncommitted file) + attempt commit. Confirm warning does NOT fire.
3. Verify settings.json registration loads without error: `python ~/.claude/hooks/qc-on-converter-edit.py --self-test` (add a self-test mode to the hook for this).

# Commit gate

Do NOT commit if:
- The hook crashes on any of the 3 test cases above
- settings.json fails to load after editing
- The lucide-icons.php false-positive test fires the warning

If all 3 pass, commit with message: "feat(phase-0.5): structural QC enforcement hook + edit tracker — Decision 31 [qc:phase-0.5-self-verify]"

# Time budget

40 min realistic. 60 min ceiling. Past the ceiling, stop and report status.

# Safety clauses

No git stash. No reset --hard. No --no-verify. No Co-Authored-By.

Branch: main directly. Don't create feature branch.
```

**After Phase 0.5 ships:** run `/qc-council` Stage 5 baseline check on the hook (smoke test against the canonical example fixture). If passes, proceed to Phase 1.

---

## Phase 1 — DB merge (~2.5 hr, dispatch after 0.5 commits)

**What:** Merge `~/.wp-blockmarkup-mcp/blocks.db` + `~/.wp-devdocs-mcp/hooks.db` into `~/.agents/skills/sgs-wp-engine/sgs-framework.db` via a new `source` column on key tables.

**Cold prompt for the implementer subagent (copy verbatim into Agent tool):**

```
You are implementing Decisions 1, 2, 11 (DB merge) from the SGS architecture programme.

# Plain-English context

We have three databases that should be one. Today every WP-knowledge query checks blocks.db (core WP blocks), hooks.db (WP hooks + docs), and sgs-framework.db (SGS blocks + framework data). After this phase: one DB (sgs-framework.db) holds everything, distinguished by a `source` column ('sgs' / 'native_wp' / 'third_party').

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 1 row + §11 Decision 30 (completeness assurance — feeds Phase 4 later but informs schema choices now)
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md "Phase 1" section (3 risks + plan-level risk 1 on schema regression)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md "Phase 1" section (pre-resolved: merge by composite key, MCP .db file locations, src/ for indexed_files)

# What to build

## Step 1: Schema migration (~30 min)

Add to `sgs-framework.db`:
- `blocks.source` TEXT NOT NULL DEFAULT 'sgs' (backfill existing rows to 'sgs')
- `block_attributes.source` TEXT NOT NULL DEFAULT 'sgs' (backfill)
- `block_supports.source` TEXT NOT NULL DEFAULT 'sgs' (backfill)
- NEW table `indexed_files` (file_path TEXT PRIMARY KEY, source TEXT, mtime_ms INTEGER, content_hash TEXT)
- NEW table `variations` (deferred to Phase 2 schema — DO NOT create here; Phase 2 owns this)
- UNIQUE constraint `(block_name OR block_slug, source)` composite key on `blocks`, `block_attributes`, `block_supports`

Use ALTER TABLE for column adds. Use CREATE TABLE for `indexed_files`. Do NOT drop or rename existing rows.

## Step 2: Import core blocks.db (~45 min)

Source: `~/.wp-blockmarkup-mcp/blocks.db` (121 blocks, 475 attributes, 819 supports, 122 variations, 331 markup_examples).

- INSERT OR IGNORE blocks → sgs-framework.blocks with source='native_wp', mapping `block_name → slug`, preserving title, description, category, block_type, api_version
- INSERT OR IGNORE attributes → sgs-framework.block_attributes with source='native_wp', mapping `name → attr_name`, preserving type, default_val, selector
- INSERT OR IGNORE supports → sgs-framework.block_supports with source='native_wp', mapping `feature → support_name`, preserving config → support_value
- The variations + markup_examples tables don't exist in sgs-framework.db yet. Variations go to Phase 2. Markup_examples is Phase 6 work — DO NOT import here.

After import, verify counts: `SELECT source, COUNT(*) FROM blocks GROUP BY source` should show approximately {sgs: 73, native_wp: 121}.

## Step 3: Import hooks.db hooks + docs (~30 min)

Source: `~/.wp-devdocs-mcp/hooks.db` (7283 hooks, 1150 docs).

Two NEW tables in sgs-framework.db (don't try to merge into existing — different schema shape):
- `hooks` (id, source, name, type, php_function, params, docblock, file_path) — import all 7283 with source='native_wp' for wp-core/gutenberg origins, source='third_party' for woocommerce origins, source='sgs' for any SGS-defined hooks (cross-check existing sgs-framework.hooks table — 13 rows — and migrate those to source='sgs')
- `docs` (id, source, file_path, slug, title, doc_type, category, content) — import all 1150 with source matched per origin (wp-cli-handbook, gutenberg-docs, etc.)

After import, verify: `SELECT source, COUNT(*) FROM hooks GROUP BY source` should show ~7283 native_wp + woocommerce, plus ~13 sgs.

## Step 4: Extend docs with cli-command rows (~30 min)

For every command in `.claude/specs/19-SGS-CLI-COMMANDS.md` (12 `wp sgs` commands), insert a row into `docs` with:
- source='sgs'
- doc_type='cli-command'
- slug=<command name>
- content=<command syntax + examples from spec 19>

Plus: add rows for the SGS pipeline commands `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`, `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`, `python ~/.claude/hooks/wp-blocks.py` — hand-curated from CLAUDE.md and the script files themselves.

## Step 5: indexed_files seeding (~15 min)

Walk every `plugins/sgs-blocks/src/blocks/*/block.json` + `theme/sgs-theme/parts/*.html` + key SGS theme + plugin files. For each, compute SHA256 of content + mtime_ms. Insert into `indexed_files` with source='sgs'.

## Step 6: Schema assertion (HARD GATE — ~10 min)

Write `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` that runs these queries + verifies non-empty results for known rows:

- SELECT * FROM blocks WHERE source='sgs' AND slug='sgs/hero' → must return 1 row
- SELECT * FROM blocks WHERE source='native_wp' AND slug='core/button' → must return 1 row
- SELECT * FROM blocks WHERE source='sgs' AND parent_block='sgs/multi-button' → must return 1 row (sgs/button per Phase 0 commit aec54882)
- SELECT * FROM slot_synonyms WHERE standalone_block='sgs/button' → must return ≥1 row (button + buttonSecondary slots per Phase 0)
- SELECT * FROM docs WHERE doc_type='cli-command' AND slug LIKE '%sgs%' → must return ≥12 rows
- SELECT * FROM hooks WHERE source='native_wp' → must return ~7000+ rows

Any failure = commit gate fails. Commit this script alongside the migration.

# Verification gate

Run `python ~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` post-import. All assertions must pass.

Performance check: `time python ~/.claude/hooks/wp-blocks.py block sgs/hero` should return in <500ms on Windows (risk 1 mitigation). If >500ms, add `CREATE INDEX IF NOT EXISTS idx_blocks_source_slug ON blocks(source, slug)` and re-test.

# Commit gate

Do NOT commit if:
- Any sgs-db-assert.py assertion fails
- Query latency >500ms on hot path
- Duplicate row counts on blocks/attributes/supports (UNIQUE constraint violations)

Commit message: "feat(phase-1): DB merge — Decisions 1, 2, 11 [qc:phase-1-self-verify]"

# Time budget

2.5 hr realistic. 4 hr ceiling.

# Safety clauses

Same as Phase 0.5. No git stash, no reset --hard, no Co-Authored-By. Pre-existing uncommitted changes untouched. Commit by exact path.
```

**After Phase 1 ships:** run `/qc-council` with the Phase 1 commit as the proposal set. Stage 5 verifies the merge produced expected row counts + queries work. Then proceed to Phase 3.

---

## Phase 3 — INNER_BLOCK_PATTERNS retirement (~2 hr, dispatch after Phase 1 commits)

**Cold prompt:**

```
You are implementing Decision 12 (INNER_BLOCK_PATTERNS retirement) from the SGS architecture programme.

# Plain-English context

The mockup-to-WordPress converter (cv2) has a hardcoded Python dict `INNER_BLOCK_PATTERNS` that tells it which parent blocks emit which child blocks. After this phase: the dict is gone; cv2 reads from `sgs-framework.db.blocks.parent_block` + `sgs-framework.db.slot_synonyms.standalone_block` (both seeded in Phase 0 + extended via Phase 1's merge).

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §3 Phase 3 row + §11 Decision 24 resolution
- .claude/reports/2026-05-21-pattern-overrides-research.md — Decision 24 RESOLVED: Pattern Overrides is operator UX layer, NOT a replacement for converter logic. DO NOT re-investigate. The DB-backed approach is the chosen path.
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md "Phase 3" section (3 risks — adjacent-button grouping for N=3+, silent NULL lookups, Wave 2 hero entry retirement)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md "Phase 3" section
- plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py lines 1303-1389 (current INNER_BLOCK_PATTERNS + _lift_inner_blocks)
- Wave 2 commit `ad706d0d` (the hero entry that gets retired by this phase)

# What to build

## Step 1: Pre-dispatch grep audit

Run `grep -rn "INNER_BLOCK_PATTERNS" plugins/sgs-blocks/` to find every reference. List them. If any reference is OUTSIDE convert.py (test fixture, comment, docstring, import in another file), surface them before continuing — those need updates too.

## Step 2: Rewrite _lift_inner_blocks signature

Current: `_lift_inner_blocks(node: Tag, pattern: dict) -> list[str]` reads pattern dict.
New: `_lift_inner_blocks(node: Tag, parent_slug: str) -> list[str]` queries DB.

The new function:
1. Queries `sgs-framework.db.blocks` for child slugs where `parent_block = parent_slug` AND `source = 'sgs'` (explicit source filter — risk mitigation per Phase 1 integration risk)
2. For each matched child slug, queries `slot_synonyms` for slot names where `standalone_block = child_slug`
3. For each (child_slug, slot) pair, walks node.find_all() looking for descendant elements matching the slot's BEM class pattern (e.g. `.sgs-hero__cta` for button slot in hero context)
4. Groups adjacent siblings under one parent wrapper when 2+ match the same slot (the adjacent-grouping logic)
5. Returns list of WP block markup strings

Critical implementation details (from risk mitigation):
- **Silent NULL guard:** if `slot_synonyms.standalone_block` query returns NULL for an expected slot, log WARNING to `pipeline-state/<run>/errors.log` (via Spec 20 structured pipeline log infrastructure). NEVER silently omit; named gap > invisible data loss.
- **N-button grouping:** test with N=3 and N=4 CTAs explicitly. The wrap-adjacent-siblings logic must handle arbitrary N. Use BeautifulSoup find_next_sibling iteratively, not pairwise.
- **Same-parent definition:** adjacent siblings count as "same parent" when (a) same `parent_block` value in DB AND (b) no non-matching siblings between them in the DOM.

## Step 3: Delete INNER_BLOCK_PATTERNS dict

Remove lines 1303-1321 (the dict + comment block). Update the 6 call sites (lines ~3684, ~3685, ~3756, ~3757, ~3811, ~3812) to call `_lift_inner_blocks(node, target)` with the new signature. Pass the `target` block slug as parent_slug.

## Step 4: Regression tests

Write `plugins/sgs-blocks/scripts/orchestrator/converter_v2/test_phase_3_inner_blocks.py` with:
- test_hero_2_ctas: mockup with 2 buttons, expect 1 multi-button containing 2 buttons
- test_hero_3_ctas: mockup with 3 buttons, expect 1 multi-button containing 3 buttons (no dropping)
- test_hero_4_ctas: mockup with 4 buttons, expect 1 multi-button containing 4 buttons
- test_no_ctas: mockup with hero but zero buttons, expect no multi-button emitted
- test_unseeded_slot: mockup with an unrecognised slot, expect WARNING logged + slot omitted (controlled failure mode, not silent)

All 5 tests must pass before commit.

## Step 5: Pixel-diff verification (per blub.db 256)

Run the cv2 pipeline on Mama's Munches mockup with `--converter-v2 --client mamas-munches`. Capture hero variation_css_rules + extraction_failed counts. They should be ≥ post-Wave-2 baselines (no regression).

Per-section cropped pixel-diff: `python scripts/pixel-diff.py --selector .sgs-hero` against the previous baseline. If >5% regression, do NOT commit; investigate.

# Commit gate

Do NOT commit if:
- Any regression test fails
- Grep finds INNER_BLOCK_PATTERNS references outside convert.py that you didn't update
- Pixel-diff regression >5% on hero section
- WARNING log doesn't fire for the unseeded-slot test case

Commit message: "feat(phase-3): retire INNER_BLOCK_PATTERNS — Decision 12 [qc:phase-3-self-verify]"

# Time budget

2 hr realistic. 3 hr ceiling.

# Safety clauses

Same as prior phases. Hero entry from Wave 2 (commit ad706d0d) gets retired by this phase — that's expected. The hero CTAs must still render correctly via the new DB-backed path; regression test test_hero_2_ctas verifies this.
```

**After Phase 3 ships:** /qc-council on commit + pixel-diff verification. Proceed to Phase 5a.

---

## Phase 5a — Variation system kill + per-site theme.json + push CLI (~2.5 hr, dispatch after Phase 3 commits)

**Cold prompt:**

```
You are implementing Decisions 14′, 16′, 17′, 18, 19 (Variation system kill) from the SGS architecture programme.

# Plain-English context

The WordPress style-variation overlay system ships all 9 client variations to every install — a privacy leak (Indus Foods admin sees HelpingDoctors variation). This phase kills the overlay system entirely. Each site gets ONE theme.json. Per-client snapshots live in our local repo at `sites/<client>/theme-snapshot.json`. A new CLI pushes a specific client's snapshot to a specific site.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §2 (three-concept distinction — load-bearing), §3 Phase 5a row, §11 Decision 18 + 19
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md "Phase 5a" section (3 risks: snapshot completeness, dependency grep, dev-site safety)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md "Phase 5a" section

# What to build

## Step 1: Pre-delete dependency audit (MANDATORY — risk mitigation)

Run: grep -r "Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator\|active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/

List every reference. Every one MUST be cleaned up BEFORE the file deletes. Do not delete files first and clean up later — that breaks the live site between commits.

## Step 2: Two-commit archive-then-delete pattern (risk mitigation)

NOT a single commit. TWO commits:
- Commit A: MOVE the 3 PHP files into `plugins/sgs-blocks/_retired/` (new directory). Update sgs-blocks.php to NOT load them. Verify dev site still works (Playwright load + console error check).
- Commit B (next session OR same session after 1 hr soak): DELETE the `_retired/` directory.

This makes recovery a single `git revert` rather than file archaeology.

For THIS phase, ship Commit A only. Commit B happens next session after confirmed-working soak time.

## Step 3: Move per-client variations to sites/

Currently: `theme/sgs-theme/styles/<client>.json` × 9 files.
After: `sites/<client>/theme-snapshot.json` × 9 files (move, don't copy).

For Mama's Munches specifically, also move `theme/sgs-theme/styles/mamas-munches.css` to `sites/mamas-munches/theme-overrides.css`.

Add `theme/sgs-theme/styles/` to `.gitignore` so any future-created files don't accidentally ship.

## Step 4: Update tar deploy command

The existing tar exclude list in CLAUDE.md doesn't strip styles/. Update the deploy command in CLAUDE.md (Deploy Commands section) to include `--exclude='theme/sgs-theme/styles/*.json'`.

## Step 5: New push-theme-snapshot CLI

Create `plugins/sgs-blocks/scripts/push-theme-snapshot.py` with:
- `--client <slug>` (required) — picks `sites/<slug>/theme-snapshot.json` as the source
- `--target <ssh-host>` (required) — e.g. `u945238940@141.136.39.73`
- `--target-domain <domain>` — for path resolution on the server (defaults to `sandybrown-nightingale-600381.hostingersite.com`)
- `--yes` (flag) — skips interactive confirmation
- `--no-push` (flag) — dry-run; print diff + exit without writing
- `--dry-run` alias for `--no-push`

Behaviour:
1. Read local `sites/<slug>/theme-snapshot.json`
2. Fetch current server theme.json via SSH cat OR via REST API GET (whichever is simpler — SSH cat is fine)
3. Fetch current `wp_global_styles` via REST API (to detect operator overrides not in theme.json file)
4. Compute diff: local snapshot vs server theme.json + flag any `wp_global_styles` keys absent from local snapshot as "operator overrides that WILL survive"
5. Print diff to stdout in a readable format
6. If `--yes` not supplied AND `--no-push` not supplied, prompt y/N
7. If confirmed, scp local snapshot to server theme.json path
8. Run WP-CLI cache clear: `wp cache flush` via SSH
9. Print success + URL to verify

Safety: when `--target` matches `sandybrown-*` or `palestine-lives.org`, default `--no-push` is on UNLESS `--yes` explicitly supplied. Document this in --help.

## Step 6: Wire Stage 10 of /sgs-clone

In `sgs-clone-orchestrator.py` Stage 10 (the existing variation-activation Stage 10), replace the REST POST to `/wp-json/sgs/v1/active-variation` with a subprocess call to `push-theme-snapshot.py --client {auto-derived-or-explicit-client} --target {ssh-host}`. Use the `--client` flag value (derived per Decision 6 from Phase 0, already shipped).

## Step 7: Hide Browse-styles UI (Decision 17′)

In `theme/sgs-theme/functions.php`, add a PHP filter on `wp_theme_json_data_styles` that removes any registered style variations from the styles array. This hides the Browse-styles UI (it shows empty / one default) on installs that no longer have variation files.

## Step 8: Migration safety notice

Use the existing pattern from `Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice` to emit a one-time admin notice on first load after this phase deploys: "Style variations migrated to per-site theme.json. See sites/<client>/theme-snapshot.json for your branding."

# Verification gate

1. After all steps, deploy to sandybrown (the dev/test domain): tar deploy with the new exclude list, ssh, OPcache reset, LiteSpeed purge if active.
2. Open sandybrown in browser. Should display Mama's Munches branding (the active client per recent test work). NOT eye-care-ward-end (the wrong-style-active bug from prior session).
3. Eyes-on Playwright screenshot of sandybrown homepage. Verify:
   - Page renders without PHP fatal errors
   - Branding colours match `sites/mamas-munches/theme-snapshot.json`
   - WP Admin → Appearance → Editor → Browse styles shows EMPTY (or one default option)
   - WP Admin shows the one-time migration notice
4. Run `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --target u945238940@141.136.39.73 --no-push` — verify diff prints + no actual push.

# Commit gate

Do NOT commit (Commit A — the archive-then-delete first commit) if:
- Any pre-delete grep reference is left un-cleaned-up
- sandybrown deploy produces PHP fatal errors
- Browse-styles UI still shows 9 variations
- push-theme-snapshot.py --no-push fails on Mama's Munches snapshot
- The migration admin notice doesn't appear

Commit A message: "feat(phase-5a): variation system kill (archive) + per-site snapshots + push CLI — Decisions 14′ 16′ 17′ 18 19 [qc:phase-5a-self-verify]"

# Time budget

2.5 hr realistic. 4 hr ceiling.

# Safety clauses

Pre-existing uncommitted changes untouched. No git stash. No reset --hard. Direct to main. Two-commit pattern is non-negotiable; do NOT delete files in Commit A — only move them.
```

**After Phase 5a Commit A ships:** /qc-council + eyes-on verification + 1 hr soak time. Then Commit B (delete `_retired/` directory) OR defer Commit B to next session if uncertain.

---

## Session close

After all dispatched phases commit + verify:

1. Run `/qc-council` summary on the session's phases as a single proposal set
2. Run `/handoff` to update `.claude/handoff.md` + `.claude/state.md` + write the next `next-session-prompt.md`
3. POST summary to blub.db `/api/knowledge` with `category='session-completion'`

## All 9 phase plans now exist — full programme auto-runnable

| Phase | Plan file | Calibrated time | Parallel session candidate |
|---|---|---|---|
| 0 | (shipped at `aec54882`) | — | — |
| 0.5 | `.claude/plans/phase-0.5-structural-qc-hook.md` | ~25 min | Session A |
| 1 | `.claude/plans/phase-1-db-merge.md` | ~45-75 min | Session A (foundation) |
| 2 | `.claude/plans/phase-2-variations-indexing.md` | ~40-60 min | Session B (parallel after 1) |
| 3 | `.claude/plans/phase-3-inner-block-patterns-retirement.md` | ~60-105 min | Session A or B (after 1) |
| 4 | `.claude/plans/phase-4-sgs-update-rebuild.md` | ~140-260 min | Session A (after 1) — bottleneck |
| 5a | `.claude/plans/phase-5a-variation-system-kill.md` | ~60-105 min | Session C (after 1) |
| 5b | `.claude/plans/phase-5b-customiser-migration.md` | ~205-385 min | Session C (after 5a) — highest variance |
| 6 | `.claude/plans/phase-6-backfill-audits-lucide-rest.md` | ~135-215 min | Session D (after 1+2) |
| 7 | `.claude/plans/phase-7-wp7-alignment.md` | ~75-165 min | Session D (after Phase 6) |

**Parallel session dispatch plan** (Bean opens 4 VS Code windows for max wall-clock compression):

- **Session A** — critical path: 0.5 → 1 → 4 sequentially (~3.5-7 hr including QC gates)
- **Session B** — after Phase 1 lands: 2 → 3 sequentially (~1.7-3 hr)
- **Session C** — after Phase 1 lands: 5a → 5b sequentially (~4.4-8 hr) ← longest chain
- **Session D** — after Phase 1+2 land: 6 → 7 sequentially (~3.5-6 hr)

Wall-clock with 4 parallel sessions = max(A, B, C, D) = **~4.4-8 hr** (Session C bottleneck).

Each session opens with `.claude/next-session-prompt.md` (or session-specific variant) → autopilot → first phase dispatches. Per-session Bean interrupts: QC-gate verdicts + commit-gate acknowledgements + eyes-on verification on visible changes.

---

## Open question for Bean to decide at session open

Before Phase 0.5 dispatches, ONE decision Bean needs to make explicitly:

**Should the QC hook (Decision 31) emit a warning-only systemMessage, OR escalate to a HARD-BLOCK on the commit Bash call?**

- Warning-only: Lower friction; operator can override quickly. Risk: same forgetting pattern continues.
- Hard-block: Higher friction; forces compliance. Risk: false-positives block legitimate work.

Recommendation: warning-only for the first 5 commits; if compliance >80%, keep. If <80%, escalate to hard-block via a second-phase change. Document this decision criterion in the hook itself.

If Bean doesn't engage on this at session open, default to warning-only and continue.
