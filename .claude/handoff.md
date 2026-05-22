# Session Handoff — 2026-05-22 (architecture programme CLOSED)

## Completed This Session

1. **Step 0 — Unexpected-content audit + fix.** Programmatic audit via `wp.blocks.parse()` caught 34 invalid block instances (1 page hero + 33 across 9 template parts). Subagent fix + 6 inline edge-case fixes. Final verification: 0 invalid blocks. Commits `d18b7354` + `830f627b`.
2. **Step 1 — Phase 4 /sgs-update rebuild.** Created `plugins/sgs-blocks/scripts/sgs-update-v2.py` (2400+ lines) — single entrypoint for 9 stages replacing the legacy 3-script chain. Stages 1, 7, 8 ported; Stages 2-6, 9 new. Mode B scrapes 10 canonical upstream sources. Commits `39d32799` → `0676f0ee`.
3. **Step 1 council fix + Source 2 counter rewrite.** `/qc-council` caught a Source 2 silent-success logic flaw (gated on insert-count instead of extraction-count). Fix: track both `s2_extracted` + `s2_inserted`, gate success on extraction (scraper-health signal). Commits `9f1e2194` + `99081252`.
4. **Step 2 — Phase 7.1 Sgs_Ai_Connector PHP class.** WP 7.0 native AI Connectors wrapper. API surface curl-verified pre-write per blub.db row 283. Live-tested on sandybrown: 4 default connectors auto-discovered, `WP_Error` on missing provider, no fatals. Commit `da19374c`.
5. **Step 2 — Phase 7.2 skills audit + revisions (24 targets).** Original 10 WP-family skills revised via 7 parallel subagents. Extended audit added 14 more (5 SGS skills + 9 slash commands), 13 revised via 5 parallel subagents. Live-verified corrections: Icons block is `core/icon` singular, heading has no variations in WP 7.0, `settings.dimensions.presets` doesn't exist. Commits `b26abf56` + `34a4be5b`.
6. **PAT rotation + Mode B 10/10 verification.** Bean rotated GITHUB_PERSONAL_ACCESS_TOKEN to a working `ghp_*` classic PAT. Mode B `--refresh-upstream --dry-run` now succeeds on all 10 sources end-to-end. Source 2 extracts 161 hooks (proves council fix correctness).
7. **Step 3 — Parking sweep (47 entries audited).** Subagent classified each: 23 RESOLVED, 1 DECIDED, 3 DECISION-NEEDED, 2 WAITING (WP 7.1), 18 STILL OPEN. Net: 47 → 16 actually-open. Commit `34a4be5b`.
8. **2 parking decisions executed.** Deleted `plugins/sgs-blocks/_retired/` (5 files) + retired WP 6.x view-transitions fallback. Commits `db69b693` + `c09d24cc`.

## Current State

- **Branch:** main at `68388b5a`
- **Tests:** sgs-db-assert.py exit 0 (27 assertions across Phase 1+2+4 all pass)
- **Build:** N/A — Python tooling project
- **Uncommitted changes:** none
- **Mode B verified:** 10/10 sources succeed end-to-end with working PAT
- **Sandybrown live:** WP 7.0, Sgs_Ai_Connector deployed + tested, 0 invalid blocks

## Known Issues / Blockers

- **/batch-gap-analysis deferred** — Bean approved fresh-session execution (~3 hours, full /gap-analysis protocol per target, sequential per blub.db row 176 hard gate).
- **P-5A-CLIENT-VARIATION-CSS-PATH** — orchestrator helper still returns a deleted path. Needs redirect to `sites/<client>/theme-overrides.css`. Quick fix.
- **16 STILL-OPEN parking items** — mostly cloning-pipeline G1-G5 gaps + Wave 2 wiring reshape. Not blocking close-out.

## Next Priorities (in order)

1. **Run /batch-gap-analysis on 14 skills** for quality baseline (~3 hours dedicated session).
2. **Resolve P-5A-CLIENT-VARIATION-CSS-PATH** (orchestrator helper redirect — small).
3. **Walk STILL-OPEN parking items by importance** — P-WAVE-2-RESHAPE (architectural), P-G4-MEASUREMENT-DECONTAMINATION (pixel-diff cleanup), P-FR1-VARIATION-BUF-CONSISTENCY (1-line fix).

## Files Modified

| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | Created — 9-stage refresh (2400+ lines) |
| `plugins/sgs-blocks/scripts/playwright-fetch.js` | Created — Source 4 JS-render fallback |
| `plugins/sgs-blocks/includes/class-sgs-ai-connector.php` | Created — WP 7.0 AI Connectors wrapper |
| `plugins/sgs-blocks/tests/manual-test-sgs-ai-connector.php` | Created — smoke test |
| `plugins/sgs-blocks/sgs-blocks.php` | Sgs_Ai_Connector registered + WP 6.x fallback retired |
| `plugins/sgs-blocks/_retired/` (5 files) | Deleted permanently |
| `theme/sgs-theme/parts/*.html` (9 files) | Block validation drift fixed |
| `~/.claude/commands/sgs-update.md` + 10 other commands | WP 7.0 alignment additions |
| `~/.claude/skills/` (14 WP/SGS skills) | WP 7.0 alignment additions (symlinked — both paths updated) |
| `~/.claude/hooks/wp-scaffold.py + wp-theme-check.py` | Block templates + validation updated for WP 7.0 |
| `~/.agents/skills/sgs-wp-engine/scripts/sgs-db-assert.py` | Phase 4 assertions added |
| `~/.agents/skills/sgs-wp-engine/scripts/migrate-design-tokens-shadow.py` | Created — schema migration |
| `reports/*.md` (6 reports) | Audit + classification + idempotency artefacts |
| `.claude/parking.md` | 47 → 16 actually-open |
| `.claude/state.md` | Programme CLOSED status |
| `.claude/plans/archive/` | Phase 4 + Phase 7 plans archived |

## Notes for Next Session

- **PAT classic format works; fine-grained didn't.** Earlier `github_pat_*` returned 401. Working `ghp_*` classic with `public_repo` scope (rate limit 4995/5000 confirmed). Use classic for Mode B until GitHub fixes fine-grained scope handling.
- **Skills are symlinked between `~/.claude/skills/` and `~/.agents/skills/` (same inode).** Edit one path, both update. Confirmed across 12 subagent dispatches.
- **Skill repo `~/.claude/`** has dozens of unrelated pending changes. The 24 skill revisions live on disk but are NOT committed in Bean's personal config repo. Bean's discretion whether to track.
- **WP 7.0 lessons carry forward.** Icons block slug is `core/icon` singular; `core/heading` retains `level` attribute (no variations); `settings.dimensions` has no `presets` key. Live verification on sandybrown caught 3 audit assumptions that would have shipped wrong.
- **batch-gap-analysis hard gate.** blub.db row 176 forbids sgs-skillscore as substitute for `/gap-analysis`. Sequential, main conversation. Don't shortcut.

## Next Session Prompt

See `.claude/next-session-prompt.md`.
