---
doc_type: phase-plan
project: small-giants-wp
phase: 5a
phase_name: Variation System Kill + Per-Site theme.json + Push CLI
session_marker: Step 5a.3 (Commit A — archive PHP files) — session boundary after Commit A, before Commit B in next session
calibrated_time: ~60-105 min build + 15 min /qc-council + eyes-on Playwright = ~75-120 min total
prerequisites: Phase 1 (merged DB; specifically NOT a hard dependency but recommended before deploying to live sites)
parallel_with: Phase 4 (/sgs-update rebuild) — can run in a parallel session after Phase 1 ships
qc_gate_after: /qc-council Stage 5 + eyes-on Playwright screenshot of sandybrown homepage verifying Mama's Munches branding
generated: 2026-05-21
---

# Phase 5a — Variation System Kill + Per-Site theme.json + Push CLI

## Plain-English goal

Today every SGS install ships all 9 per-client style variations (`indus-foods.json`, `helping-doctors.json`, etc.) as WP Browse-styles options. The Indus Foods admin can see and accidentally activate the HelpingDoctors variation — a privacy leak. Beyond privacy, the overlay system is architectural complexity with no remaining benefit once we have a per-site theme.json model. This phase kills the overlay system entirely: 3 PHP files deleted (via a two-commit safety pattern), 9 variation JSON files moved from `theme/sgs-theme/styles/` to `sites/<client>/theme-snapshot.json`, the WP Browse-styles UI hidden on single-stylesheet installs, and a new push CLI (`push-theme-snapshot.py`) created for deploying a client's snapshot to a specific site. `/sgs-clone` Stage 10 is updated to invoke the push CLI automatically. After this phase, sandybrown displays Mama's Munches branding without the "eye-care variant is active on Mama's content" wrong-style bug from the prior debugging session.

## Decisions in scope

- **Decision 18** (§3 Phase 5a) — DELETE `class-sgs-variation-picker.php`, `class-variation-rest.php`, `class-sgs-legacy-theme-mod-migrator.php`; remove `active_theme_style` theme_mod logic from `functions.php`; remove variation-CSS-enqueue-by-active-variation logic
- **Decision 19** (§3 Phase 5a) — Move per-client snapshots from `theme/sgs-theme/styles/<client>.json` to `sites/<client>/theme-snapshot.json`; strip `theme/sgs-theme/styles/` from framework deploys
- **Decision 14′** (§3 Phase 5a) — New CLI `push-theme-snapshot.py` with `--client`, `--target`, `--yes`, `--no-push` flags
- **Decision 16′** (§3 Phase 5a) — `/sgs-clone` Stage 10 invokes push-theme-snapshot via auto-derived `--client` flag
- **Decision 17′** (§3 Phase 5a) — PHP filter hides WP Browse-styles UI on single-stylesheet installs

## Three-concept distinction (load-bearing — from staging doc §2)

This phase DELETES: WP style variations (per-client overlay, `theme/sgs-theme/styles/*.json` + PHP classes).

This phase PRESERVES: Header/footer template parts (brand-agnostic starting templates), block-level variations (`register_block_variation()` in `class-sgs-block-variations.php`).

The implementer must confirm they understand this before running any grep or delete commands.

## Risk mitigations (from risk-assessment.md)

| Risk | Mitigation step |
|---|---|
| push-theme-snapshot.py overwrites theme.json — Site Editor operator changes silently lost | Step 5a.5: pre-push diff includes both server theme.json AND wp_global_styles (REST fetch) — surfaces any key in wp_global_styles absent from local snapshot |
| Deleting PHP files with un-cleaned dependents → fatal PHP error on first page load | Step 5a.1: dependency grep is MANDATORY and COMPLETE before any file touches |
| /sgs-clone Stage 10 auto-push runs on dev site sandybrown during QA → overwrites live branding | Step 5a.5: `--no-push` default for sandybrown and palestine-lives.org unless `--yes` explicitly supplied |

## Pre-resolved decisions (from hidden-decisions.md)

- **Snapshot format:** Full theme.json copy, not diff. Small file (~5-20 KB), simplicity outweighs bandwidth savings.
- **Push CLI authentication:** SSH via existing `id_ed25519` key + scp + WP-CLI. REST endpoint NOT created (avoids new attack surface).
- **Strip styles JSONs:** MOVE (not delete) to `sites/<client>/theme-snapshot.json`. Add `theme/sgs-theme/styles/` to `.gitignore`. Exclude from tar deploy.
- **Migration safety:** One-time admin notice (existing `Sgs_Site_Info_Admin_Notices` pattern) — "Style variations migrated to per-site theme.json".
- **Two-commit pattern:** Commit A = archive (move PHP files to `_retired/`). Commit B = delete `_retired/`. This session ships Commit A only. Commit B deferred to next session after 1-hour soak confirming no PHP fatals.

---

## Steps

### Step 5a.1 — Dependency grep (MANDATORY — run before touching any files)

- **Action:** Run comprehensive grep for all 3 PHP class names + the `active_theme_style` theme_mod key across the ENTIRE codebase:
  ```
  grep -r "Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator\|active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/ --include="*.php" --include="*.json" --include="*.js"
  ```
  Also grep for `require_once` / `include` patterns that may load these files. List every reference with file:line. Every reference MUST be cleaned up before the PHP files are moved in Step 5a.3. Do not proceed to Step 5a.2 until this list is complete and every item has a fix planned.
- **Files:** Read-only grep pass; no writes
- **Inputs:** Current filesystem state
- **Outputs:** Complete reference list with cleanup plan per item
- **Time:** 5 min
- **Tooling:** Bash grep; Read on any referenced file to understand context
- **On-Fail:** If any reference is in a file outside the SGS plugin/theme (e.g. an MU plugin, a site-specific file), flag to Bean before continuing — cleanup scope may be larger than expected

### Step 5a.2 — Clean up all references (before moving files)

- **Action:** For every reference found in Step 5a.1: remove `require_once`/`include` lines that load the 3 PHP files; remove any PHP code that calls into `Sgs_Variation_Picker` or `Sgs_Variation_Rest` or `Sgs_Legacy_Theme_Mod_Migrator`; remove `active_theme_style` `get_theme_mod`/`set_theme_mod` calls from `functions.php` and any other PHP files; remove the variation-CSS-enqueue block that gates CSS loading on `active_theme_style` value.
- **Files:** `plugins/sgs-blocks/sgs-blocks.php`, `theme/sgs-theme/functions.php`, any other files from Step 5a.1 grep
- **Inputs:** Step 5a.1 reference list
- **Outputs:** Zero remaining references to the 3 PHP classes or `active_theme_style` theme_mod; codebase in a state where the PHP files can be moved without triggering a fatal PHP error
- **Time:** 10-15 min
- **Tooling:** Edit tool (surgical edits); grep to verify post-cleanup
- **On-Fail:** Re-run the Step 5a.1 grep after editing to confirm zero remaining references. If any remain, fix them. Do not proceed to Step 5a.3 until the post-cleanup grep returns 0 results.

### Step 5a.3 — Commit A: Archive PHP files + move variation JSONs (Commit A)

- **Action:**
  1. Create `plugins/sgs-blocks/_retired/` directory
  2. MOVE (not delete) the 3 PHP files into `_retired/`: `class-sgs-variation-picker.php`, `class-variation-rest.php`, `class-sgs-legacy-theme-mod-migrator.php`
  3. Create `sites/<client>/` directories if not already present for each of the 9 clients
  4. MOVE (not copy) each `theme/sgs-theme/styles/<client>.json` to `sites/<client>/theme-snapshot.json`
  5. Add `theme/sgs-theme/styles/` to `.gitignore`
  6. Add admin notice for migration (Step 5a.6 details)
  7. Commit with message: `"feat(phase-5a): variation system kill (archive) + per-site snapshots — Decisions 14' 16' 17' 18 19 [qc:phase-5a-archive]"`
- **Files:**
  - CREATE `plugins/sgs-blocks/_retired/` (directory)
  - MOVE `plugins/sgs-blocks/includes/class-sgs-variation-picker.php` → `plugins/sgs-blocks/_retired/`
  - MOVE `plugins/sgs-blocks/includes/class-variation-rest.php` → `plugins/sgs-blocks/_retired/`
  - MOVE `plugins/sgs-blocks/includes/class-sgs-legacy-theme-mod-migrator.php` → `plugins/sgs-blocks/_retired/`
  - MOVE `theme/sgs-theme/styles/mamas-munches.json` → `sites/mamas-munches/theme-snapshot.json`
  - MOVE `theme/sgs-theme/styles/indus-foods.json` → `sites/indus-foods/theme-snapshot.json`
  - MOVE remaining 7 `theme/sgs-theme/styles/*.json` → `sites/<client>/theme-snapshot.json`
  - MODIFY `.gitignore` (add `theme/sgs-theme/styles/`)
- **Inputs:** Steps 5a.1-5a.2 complete; zero remaining references to 3 PHP classes
- **Outputs:** Files moved; `.gitignore` updated; dev site still loads without PHP fatals
- **Time:** 10-15 min
- **Tooling:** Bash (mv commands); Edit tool (.gitignore)
- **On-Fail:** If `git mv` fails for any file (file not tracked), use Bash `mv` + `git add` for the destination + `git rm` for the source
- **Session marker:** After Commit A ships, this is a safe session boundary. Commit B (delete `_retired/`) happens next session after 1-hour soak. All remaining steps in this plan can pause here.

### Step 5a.4 — Update tar deploy command in CLAUDE.md

- **Action:** Update the tar exclude list in the project CLAUDE.md Deploy Commands section to include `--exclude='theme/sgs-theme/styles/*.json'`. Also add a comment noting the styles/ directory is now empty after Phase 5a.
- **Files:** `c:/Users/Bean/Projects/small-giants-wp/CLAUDE.md` (Deploy Commands section)
- **Inputs:** Current tar command; Step 5a.3 completed
- **Outputs:** Deploy command excludes variation JSON files (which now live in `sites/<client>/` not `theme/sgs-theme/styles/`)
- **Time:** 3-5 min
- **Tooling:** Edit tool (surgical edit to CLAUDE.md)
- **On-Fail:** Not blocking — if CLAUDE.md edit fails, note manually and proceed. The deploy still works; it just won't accidentally ship variation files it no longer has.

### Step 5a.5 — New push-theme-snapshot CLI

- **Action:** Create `plugins/sgs-blocks/scripts/push-theme-snapshot.py`. Arguments: `--client <slug>` (required), `--target <ssh-host>` (required), `--target-domain <domain>` (defaults to sandybrown-nightingale-600381.hostingersite.com), `--yes` (skip confirmation), `--no-push` / `--dry-run` (print diff + exit). Behaviour:
  1. Read local `sites/<slug>/theme-snapshot.json`
  2. SSH-cat the server's current `wp-content/themes/sgs-theme/theme.json`
  3. Compute diff of local vs server
  4. Fetch `wp_global_styles` via WP REST API (`GET /wp-json/wp/v2/global-styles/themes/sgs-theme`) — flag any keys present in wp_global_styles but absent from local snapshot as "operator overrides that WILL survive the push"
  5. Print diff summary to stdout
  6. If `--no-push` or `--dry-run`: exit 0 after printing diff
  7. If `--target` matches `sandybrown-*` or `palestine-lives.org` AND `--yes` not supplied: default to `--no-push` behaviour (safety net for dev sites)
  8. Otherwise: prompt y/N interactively
  9. If confirmed: scp local snapshot to server theme.json path; run `wp cache flush` via SSH
  10. Print success + verification URL
- **Files:** CREATE `plugins/sgs-blocks/scripts/push-theme-snapshot.py`
- **Inputs:** `sites/<client>/theme-snapshot.json`; SSH credentials (existing `~/.ssh/id_ed25519`); WP REST API (public endpoint — no auth needed for read-only wp_global_styles)
- **Outputs:** Working push CLI; test run with `--no-push` on Mama's Munches confirms diff prints correctly
- **Time:** 20-25 min
- **Tooling:** Python subprocess (scp/ssh); Python json (diff); Python argparse; Python urllib/requests for REST fetch
- **On-Fail:** If WP REST API returns 401 on wp_global_styles (auth required), skip that step and flag in the diff output — "operator overrides via Site Editor not checked (REST auth required)" — do not block the push for this. The core file-level diff still provides safety.

### Step 5a.6 — One-time migration admin notice

- **Action:** Using the existing `Sgs_Site_Info_Admin_Notices::maybe_show_deprecated_blocks_notice` pattern, add a new notice method that fires once on first admin page load after this phase deploys. Notice text: "SGS style variations have been migrated to per-site theme.json files. Find your client's branding snapshot at `sites/<client>/theme-snapshot.json`. No action required — branding is unchanged." Use a wp_options flag `sgs_phase5a_migration_noticed` to fire once only.
- **Files:** `plugins/sgs-blocks/includes/class-sgs-site-info.php` (or wherever `Sgs_Site_Info_Admin_Notices` lives — grep for it)
- **Inputs:** Existing admin notice pattern; Step 5a.3 completed
- **Outputs:** Admin notice fires once on first WP Admin load after deploy; dismissed by default after view
- **Time:** 10-15 min
- **Tooling:** Edit tool; Grep to find the existing notice class location
- **On-Fail:** If the existing notice pattern is significantly different from what's described, use a simple `add_action('admin_notices', function() { ... })` in functions.php — the pattern detail is less important than the notice firing

### Step 5a.7 — Hide WP Browse-styles UI (Decision 17′)

- **Action:** In `theme/sgs-theme/functions.php`, add a PHP filter on `wp_theme_json_data_styles`. The callback removes all registered style variation entries from the styles data object when the `styles/` directory is empty (which it will be after this phase). This causes WP's Browse-styles UI to show no variations (or just the default), hiding the now-useless picker from operators.
- **Files:** `theme/sgs-theme/functions.php`
- **Inputs:** WP 7.0 filter documentation; Step 5a.3 completed (styles/ now empty)
- **Outputs:** WP Admin → Appearance → Editor → Browse styles shows no client variations
- **Time:** 10 min
- **Tooling:** Edit tool; Bash grep to find the existing filter hooks in functions.php before inserting
- **On-Fail:** If `wp_theme_json_data_styles` filter is not the right hook for Browse-styles suppression (hook name may differ in WP 7.0), fall back to: check `WP_Theme_JSON_Resolver` for the correct filter. If uncertain, leave Browse-styles as-is and note the gap — it's cosmetic (shows empty menu) not functional.

### Step 5a.8 — Wire /sgs-clone Stage 10 (Decision 16′)

- **Action:** In `sgs-clone-orchestrator.py` Stage 10, replace the current REST POST to `/wp-json/sgs/v1/active-variation` with a subprocess call to `push-theme-snapshot.py`. Use the `--client` flag value auto-derived in Phase 0 (Decision 6, commit `aec54882`). Pass `--target {ssh_host_from_orchestrator_config}`. Always pass `--no-push` by default in the orchestrator; add `--push` flag to the orchestrator that when supplied removes `--no-push` from the subprocess call.
- **Files:** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (Stage 10 section)
- **Inputs:** Phase 0 `--client` auto-derive logic (already committed); push-theme-snapshot.py from Step 5a.5
- **Outputs:** Stage 10 calls push-theme-snapshot.py instead of the deleted REST endpoint; `--push` orchestrator flag enables live push
- **Time:** 10-15 min
- **Tooling:** Edit tool; Grep to find Stage 10 in orchestrator (find by `# Stage 10` comment or REST POST call to active-variation endpoint)
- **On-Fail:** If Stage 10 doesn't exist or uses a different mechanism (not REST POST to active-variation), grep for `active-variation` or `variation` in sgs-clone-orchestrator.py to find the actual location

### Step 5a.9 — Verification + sandybrown deploy

- **Action:**
  1. Build: `cd plugins/sgs-blocks && npm run build`
  2. Deploy to sandybrown using tar method (with updated exclude list from Step 5a.4)
  3. SSH: OPcache reset
  4. Open sandybrown in browser (Playwright screenshot at 1440px + 375px)
  5. Verify: Mama's Munches branding active (warm cream/terracotta palette, not teal eye-care palette)
  6. WP Admin → Appearance → Editor → Browse styles: no client variations shown
  7. WP Admin: migration notice visible on first load
  8. `python plugins/sgs-blocks/scripts/push-theme-snapshot.py --client mamas-munches --target u945238940@141.136.39.73 --no-push` → diff prints, no actual push
  9. No PHP fatal errors in WP Admin or frontend
- **Files:** Read/deploy only; no code changes in this step
- **Inputs:** Sandybrown SSH access; built plugin; updated theme
- **Outputs:** Playwright screenshots (1440px + 375px) confirming Mama's Munches branding
- **Time:** 15-20 min including build + deploy
- **Tooling:** Bash (npm run build + tar + scp + ssh); Playwright MCP or CLI for screenshots
- **On-Fail:** If PHP fatal error on sandybrown after deploy: SSH in, check `wp --debug` output for the specific class/function causing the fatal; most likely a missed dependency from Step 5a.1. Fix the reference, rebuild, redeploy. Do NOT commit Commit A until sandybrown is clean.

---

## Acceptance criteria

- `grep -r "Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator\|active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/ --include="*.php"` returns 0 results
- `theme/sgs-theme/styles/` directory is empty (or contains only a `.gitignore` entry)
- 9 `sites/<client>/theme-snapshot.json` files exist
- `push-theme-snapshot.py --client mamas-munches --no-push` runs without error and prints a diff
- Sandybrown displays Mama's Munches branding (visual confirmation via Playwright screenshot)
- WP Admin Browse-styles shows no client variations
- WP Admin shows one-time migration notice
- No PHP fatal errors on sandybrown frontend or admin
- `sgs-clone-orchestrator.py` Stage 10 calls push-theme-snapshot.py (grep confirms REST POST to active-variation removed)
- CLAUDE.md deploy command includes `--exclude='theme/sgs-theme/styles/*.json'`

## Subagent cold prompt (for the orchestrator to dispatch)

```
You are implementing Decisions 14′, 16′, 17′, 18, 19 (Variation system kill) from the SGS architecture programme.

# CRITICAL THREE-CONCEPT DISTINCTION (read before ANY grep or delete)

There are THREE variation concepts in SGS. This phase DELETES one. It PRESERVES two.

DELETED BY THIS PHASE:
- WP style variations: theme/sgs-theme/styles/<client>.json files + class-sgs-variation-picker.php + class-variation-rest.php + class-sgs-legacy-theme-mod-migrator.php + active_theme_style theme_mod

PRESERVED BY THIS PHASE (do NOT touch):
- Header/footer template parts: wp_template_part CPT + class-sgs-template-part-seeder.php + the header/footer HTML files
- Block-level variations: class-sgs-block-variations.php + register_block_variation() calls

If you are uncertain which category a file falls into, check staging doc §2 before touching it.

# Plain-English context

Every SGS install ships all 9 client variation JSONs to every WP site — a privacy leak and unnecessary complexity. This phase kills the overlay system. Each site gets ONE theme.json. Per-client snapshots live locally at sites/<client>/theme-snapshot.json. A new push CLI deploys a specific client's snapshot to a specific site.

# Read first

- .claude/plans/2026-05-21-architecture-staging.md §2 (three-concept distinction, load-bearing) + §3 Phase 5a row
- .claude/reports/strategic-plan-2026-05-21/risk-assessment.md Phase 5a section (3 risks)
- .claude/reports/strategic-plan-2026-05-21/hidden-decisions.md Phase 5a section

# What to build — 9 steps

## Step 1: Dependency grep (MANDATORY — do this before touching any file)
grep -r "Sgs_Variation_Picker\|class-sgs-variation-picker\|class-variation-rest\|class-sgs-legacy-theme-mod-migrator\|active_theme_style" plugins/sgs-blocks/ theme/sgs-theme/ --include="*.php"
List every reference with file:line. Every item MUST have a cleanup plan before proceeding.

## Step 2: Clean up all references
Remove require_once/include lines loading the 3 PHP files. Remove all active_theme_style get/set_theme_mod calls. Remove the variation-CSS-enqueue block in functions.php. Run Step 1 grep again to verify 0 remaining results.

## Step 3: Commit A — archive + move (THE SAFE COMMIT — ship this, then PAUSE before Step 4)
- CREATE plugins/sgs-blocks/_retired/
- MOVE 3 PHP files → _retired/ (not delete)
- CREATE sites/<client>/ directories for all 9 clients
- MOVE theme/sgs-theme/styles/<client>.json → sites/<client>/theme-snapshot.json for each
- ADD theme/sgs-theme/styles/ to .gitignore
- ADD migration admin notice (Step 6 below)
Commit A message: "feat(phase-5a): variation system kill (archive) + per-site snapshots — Decisions 14' 16' 17' 18 19 [qc:phase-5a-archive]"
PAUSE after Commit A — verify sandybrown before continuing. Commit B (delete _retired/) happens next session.

## Step 4: Update CLAUDE.md tar deploy command
Add --exclude='theme/sgs-theme/styles/*.json' to the tar command in Deploy Commands section.

## Step 5: New push-theme-snapshot CLI
CREATE plugins/sgs-blocks/scripts/push-theme-snapshot.py
Arguments: --client <slug>, --target <ssh-host>, --target-domain, --yes, --no-push/--dry-run
Behaviour:
1. Read local sites/<slug>/theme-snapshot.json
2. SSH-cat server's current wp-content/themes/sgs-theme/theme.json
3. Diff local vs server
4. Fetch wp_global_styles via WP REST API GET /wp-json/wp/v2/global-styles/themes/sgs-theme — flag wp_global_styles keys absent from snapshot as "operator overrides that survive"
5. Print diff
6. --no-push: exit after diff
7. --target matches sandybrown-* or palestine-lives.org AND no --yes: default --no-push
8. Otherwise: prompt y/N, then scp + wp cache flush via SSH

## Step 6: One-time migration admin notice
Using Sgs_Site_Info_Admin_Notices pattern, add a notice that fires once (wp_options flag sgs_phase5a_migration_noticed) on first admin load.
Text: "SGS style variations migrated to per-site theme.json. See sites/<client>/theme-snapshot.json."

## Step 7: Hide Browse-styles UI (Decision 17')
In theme/sgs-theme/functions.php, add a filter on wp_theme_json_data_styles that removes registered variations when the styles/ directory is empty. Hides the WP Browse-styles picker from operators.

## Step 8: Wire /sgs-clone Stage 10 (Decision 16')
In sgs-clone-orchestrator.py Stage 10: replace REST POST to /wp-json/sgs/v1/active-variation with subprocess call to push-theme-snapshot.py --client {auto_client} --target {ssh_host} --no-push (default safe). Add --push flag to orchestrator that removes --no-push when explicitly set.

## Step 9: Verify on sandybrown
1. npm run build (from plugins/sgs-blocks/)
2. tar deploy to sandybrown using updated exclude list
3. SSH + OPcache reset
4. Playwright screenshot at 1440px + 375px — verify Mama's Munches branding (NOT eye-care teal)
5. WP Admin → Browse styles: no client variations
6. WP Admin: migration notice visible
7. python push-theme-snapshot.py --client mamas-munches --target u945238940@141.136.39.73 --no-push → prints diff, no push

# Commit gate (for Commit A)

Do NOT commit Commit A if:
- Any reference from the Step 1 grep remains un-cleaned
- sandybrown produces PHP fatal errors after deploy
- Browse-styles still shows 9 variations
- push-theme-snapshot.py --no-push fails
- Migration notice doesn't appear

Commit A message: "feat(phase-5a): variation system kill (archive) + per-site snapshots — Decisions 14' 16' 17' 18 19 [qc:phase-5a-archive]"

# Time budget

75 min realistic. 105 min ceiling. At ceiling, commit all completed steps + report status.

# Safety clauses

TWO-COMMIT PATTERN IS NON-NEGOTIABLE. Commit A = archive (move files, not delete). Commit B = delete _retired/ after 1-hour soak (next session). Do not skip this.
Pre-existing uncommitted changes untouched (deleted spec 15, modified lucide-icons.php, untracked sgs-framework.db).
No git stash. No reset --hard. Direct to main. Commit by exact path.

# Methodology guardrails (do not skip)
- blub.db 254 — Read pipeline-state/<run>/leftover-buckets.json BEFORE conjecturing
- blub.db 255 — Multi-model /qc panel BEFORE every converter/pipeline/SGS-block commit (use Decision 31 hook from Phase 0.5)
- blub.db 256 — Per-section cropped pixel-diff, never full-page
- blub.db 272 — Schema enumeration BEFORE missing-X claims
- blub.db 276 — Council fix-shape proposals are hypotheses; empirical pre/post baseline required
- blub.db 281 — QC gate must be structural; commit messages MUST cite [qc:<run_id>] for converter/orchestrator path commits
- No git stash, reset --hard, restore, checkout --, clean -f
- No --no-verify
- No Co-Authored-By
- Commit by exact path (never `git add .` or -A)
- Stay on main directly
```

## Post-phase QC

/qc-council Stage 5 (Sonnet + Haiku + Gemini Flash + Cerebras):

1. **Sonnet primary:** Verify all 9 theme-snapshot.json files exist in `sites/<client>/`; verify `_retired/` contains exactly 3 PHP files; verify grep returns 0 references to deleted classes
2. **Haiku cross-check:** Run Step 1 grep independently — confirm 0 results
3. **Gemini Flash:** Eyes-on Playwright screenshot review — confirm Mama's Munches branding (warm cream/terracotta) NOT eye-care (teal/medical)
4. **Cerebras:** Verify push-theme-snapshot.py `--no-push` test passes on Mama's Munches snapshot

Then: 1-hour soak on sandybrown. If no PHP fatals reported, dispatch Commit B (delete `_retired/`) in the next session.
