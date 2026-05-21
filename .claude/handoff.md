# Session Handoff — 2026-05-22 (in progress)

## Headline

**Phases 0.5 + 1 + 1.5 shipped on `main` (commits `6eaadbc2`, `8c56ab6` in skills repo, `cc541e94`).** Session B (parallel window) shipped 5a + 5b (`43a93df9`, `60220b13`). 67 SGS blocks gained inserter-discoverable presets via Phase 1.5. Critical path Phase 2 → 3 → 4 still pending. No /handoff invocation per Bean directive — continue sequentially.

## Completed This Session

1. **Phase 0.5 — Structural QC enforcement hook** (commit `6eaadbc2`) — `.claude/hooks/qc-on-converter-edit.py` + edit tracker. Warning-only posture. Watches `convert.py`, `sgs-clone-orchestrator.py`, future `sgs-update.py`. Future-proof.

2. **Phase 1 — DB merge** (commit `8c56ab6` in `~/.agents/skills` repo) — `sgs-framework.db` absorbs blocks.db + hooks.db with `source` column (`sgs` / `native_wp` / `third_party`). 73 SGS + 121 core blocks; 5234 unique hooks; 1158 docs; 87 indexed files. 13/13 schema assertions pass via new `sgs-db-assert.py`. Hot-path query 1.5ms vs 500ms budget.

3. **Phase 1.5 — Variations + Styles + Default-Styles for 12 composite blocks** (commit `cc541e94`) — 40 variations + 30 styles registered across hero, card-grid, cta-section, testimonial, team-member, pricing-table, accordion, tabs, gallery, post-grid, form, info-box. Each variation declares default style via `className`. Empirically validated via canary deploy on sandybrown + REST query against `wp-json/wp/v2/block-types/sgs/<slug>`.

4. **First-attempt of Phase 1.5 fatalled sandybrown.** 12 subagent-authored PHP files called `register_block_variation()` — a non-existent PHP function (JS-only API). Site 500'd. Rolled back, ran `/brainstorming` → `/qc-council` → canary-first → re-dispatch via Path B (`add_filter('get_block_type_variations', ...)`). Lesson captured at blub.db row 283 + workspace + CC auto-memory: **verify WP API surface before dismissing static-analyser warnings**.

5. **Session B (parallel) shipped 5a + 5b.** `43a93df9` killed the variation overlay system + per-site theme.json snapshots + push CLI. `60220b13` migrated Header Rules / Footer Rules / Site Info to the Customiser + moved button presets to theme.json + wired View Transitions. Phase 5b has a latent inert-Customiser-output bug — renderers target `.wp-site-header`/`.wp-site-footer` but SGS template parts use generic wrapper classes. Fix path agreed: Option A (CSS custom properties on `:root`).

6. **Living docs walk** — `state.md`, `mistakes.md`, `plan.md`, `decisions.md` (D32 + D33 added), `MEMORY.md`, this `handoff.md`.

## Current State

- **Branch:** main at `cc541e94` (pushed)
- **Sandybrown:** HTTP 200; sgs/accordion (and 11 others) verified via REST returning 2-4 variations + 2-3 styles each
- **Build:** n/a (no JS/CSS rebuild)
- **Uncommitted changes:** 8 pre-existing untouched
  - Modified: `.claude/.qc-edit-tracker.json` (hook state, expected churn), `.claude/decisions.md` (D32+D33 added this session — to commit with doc updates), `plugins/sgs-blocks/assets/js/customiser-preview.js` + `class-sgs-header-renderer.php` + `class-sgs-footer-renderer.php` (Session B's Phase 5b — needs review for the inert-output fix), `plugins/sgs-blocks/includes/lucide-icons.php` (pre-existing), `theme/sgs-theme/styles/mamas-munches.css` (pre-existing)
  - Deleted: `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (pre-existing — absorbed elsewhere)
  - Untracked: `.claude/next-session-prompt-B.md` (Session B kick-off from 2026-05-21), `plugins/sgs-blocks/sgs-framework.db` (pre-existing copy in plugin dir), `reports/phase2-variation-conflicts.txt` (from killed Phase 2 yesterday)

## Architecture programme — phase status snapshot

| Phase | Status |
|---|---|
| 0 | SHIPPED `aec54882` (2026-05-21) |
| 0.5 | SHIPPED `6eaadbc2` (2026-05-21) |
| 1 | SHIPPED `8c56ab6` skills repo (2026-05-22) |
| **1.5** (new — inserted) | SHIPPED `cc541e94` (2026-05-22) |
| 2 | PENDING — runtime-aware parser per D33 |
| 3 | PENDING — INNER_BLOCK_PATTERNS retirement |
| 4 | PENDING — /sgs-update rebuild |
| 5a | SHIPPED `43a93df9` Session B (2026-05-21) |
| 5b | SHIPPED `60220b13` Session B (2026-05-21) — latent bug |
| 6 | PENDING — now unblocked since Phase 1.5 shipped |
| 7 | PENDING |

## Known Issues / Blockers

- **Phase 5b inert-Customiser-output bug** — Session B's renderers emit `.wp-site-header` / `.wp-site-footer` selectors; SGS template parts use generic wrapper classes. Fix shape agreed: Option A (CSS custom properties on `:root`). ~30 min follow-up.
- **Pre-existing "block contains unexpected content" errors on sandybrown** — surfaced during Phase 5b discussion. Separate technical-debt cleanup task; not blocking Phase 2-4 progress.
- **sgs/button has two `is_default: true` entries** — pre-existing inconsistency where `fill` carries `isDefault: true` (camelCase) and `sgs-accent` carries `is_default: true` (snake_case). WP recognises both but doesn't dedup. Low priority cleanup.
- **Phase 5b property-coverage shim** — if WP 7.0 native CSS doesn't cover a button preset property, slim shim was supposed to be added per gap. Audit not yet performed — confirm during Phase 5b inert-output fix.

## Next Priorities (Bean directive: continue, no /handoff yet)

1. **Phase 2** — variations indexing rewritten with runtime-aware parser (`wp eval` against `WP_Block_Type_Registry` + `WP_Block_Styles_Registry`) per D33. Re-seeds `sgs-framework.db variations` table from Path B registrations. ~30-45 min.
2. **QC gate on Phase 2** — `/qc-inline` or `sgs-db-assert.py` extension confirming variations table contains ≥ 40 rows.
3. **Phase 3** — INNER_BLOCK_PATTERNS retirement (Decisions 12 + 24). DB-backed lookup. ~60-105 min.
4. **QC gate on Phase 3** — pixel-diff per-section + structural checks.
5. **Phase 4** — `/sgs-update` rebuild (9-stage holistic refresh). ~140-260 min.
6. **QC gate on Phase 4**.

After all four phases: re-evaluate whether to ship Phase 5b inert-output fix + Phase 6 + 7 in this session or open a fresh window.

## Lessons captured this session

- **blub.db row 283** — `verify-wp-api-surface-before-dismissing-static-analyser`. Workspace file at `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-05-22-verify-wp-api-surface-before-dismissing-static-analyser.md`. CC auto-memory at `feedback_verify_wp_api_surface_before_dismissing_static_analyser.md`. Classifier-router surfaced 5 likely-violating skills for embedding offer (deferred).

## Files Modified This Session

| File | Change |
|---|---|
| `plugins/sgs-blocks/includes/variations/sgs-{accordion,card-grid,cta-section,form,gallery,hero,info-box,post-grid,pricing-table,tabs,team-member,testimonial}-variations.php` (12 NEW) | Phase 1.5 Path B registration |
| `.claude/plans/phase-1.5-variations-styles-default-styles.md` (NEW → archive after this session) | Phase 1.5 plan |
| `.claude/scratch/sgs-variations-template.php.tpl` (NEW) | Canonical template (gitignored) |
| `.claude/scratch/phase-1.5-block-shapes.md` (NEW) | Per-block shapes table (gitignored) |
| `.claude/state.md` | Phases 0/0.5/1/1.5/5a/5b marked SHIPPED |
| `.claude/mistakes.md` | blub.db row 283 mirror appended at top |
| `.claude/plan.md` | Phase status table updated |
| `.claude/decisions.md` | D32 + D33 entries (Phase 1.5 insertion + runtime parser strategy) |
| `.claude/handoff.md` | This file |
| `C:/Users/Bean/.openclaw/workspace/memory/learning/2026-05-22-...md` (NEW) | Workspace lesson |
| `C:/Users/Bean/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_wp_api_surface_before_dismissing_static_analyser.md` (NEW) | CC auto-memory feedback |
| `C:/Users/Bean/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` | New entry indexed |
