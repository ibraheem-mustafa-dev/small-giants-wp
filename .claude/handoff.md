---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-04-30
session_tag: small-giants-wp-2026-04-30-block-uniformity-polish
next_session: html-to-blocks-compiler-OR-deploy
recommended_model_next: sonnet
last_updated: 2026-04-30
---

# Session Handoff — 2026-04-30 afternoon: SGS block uniformity overhaul + spec refresh + auto-generated reference

## Completed This Session

1. **Block uniformity audit + 13 fixes** — Wrote a Python audit script that scans all 59 SGS blocks for non-uniformity. Found and fixed: `viewScript` → `viewScriptModule` on hero (last legacy holdout); `source:html` removed from `mega-menu` `label` attr (silent bug on dynamic blocks); duplicate `letterSpacing`/`textTransform` custom attrs removed from hero/cta-section/info-box (covered by `supports.typography` + Block Selectors API); full `supports.color` migration on announcement-bar + google-reviews with backward-compat shim; `supports.color` added to back-to-top, mega-menu, reading-progress; selector naming standardised (`.wp-block-sgs-*` canonical for all 28 dynamic blocks, 7 outliers fixed).
2. **Pre-commit hook** — `plugins/sgs-blocks/scripts/audit-block-uniformity.py` saved permanently. Wired into `.git/hooks/pre-commit` (appended to existing gitleaks check) so it only fires when `block.json` files are staged. Blocks future uniformity regressions structurally.
3. **Auto-generated block reference** — `plugins/sgs-blocks/scripts/generate-block-reference.py` queries `sgs-framework.db` and emits `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` (59 blocks, 941 attributes, grouped by category, full per-block tables). Wired into `/sgs-update` so it regenerates whenever the DB is re-indexed.
4. **WordPress + WP-CLI IDE stubs via Composer** — `composer.json` + `composer.lock` at repo root install `php-stubs/wordpress-stubs` v6.9.1 (matches palestine-lives.org WP version) and `php-stubs/wp-cli-stubs` v2.12.0 to `vendor/` (gitignored). Intelephense `intelephense.environment.includePaths` set in `.vscode/settings.json`. Eliminates the universal P1010 false positives on `esc_attr`, `wp_kses_post`, `get_block_wrapper_attributes`, etc. across all render.php files. User must reload VS Code window once for it to take effect.
5. **6-doc spec audit + updates** — `architecture.md` (block count 57→59, maturity score replaced with directional reference, infrastructure additions, 3 new architectural decisions); `01-SGS-THEME.md` (real file structure, 29 patterns, 8 style variations including `mamas-munches.json`, 7 mega-menu parts); `02-SGS-BLOCKS.md` (Container + Info Box dynamic-not-static correction + auto-reference link); `06-BUILD-ORDER.md` (original archived to `plans/archive/`, replaced with current-state roadmap); `09-GOLD-STANDARD-AUDIT.md` (Hero CTAs + Info Box hover gap markers closed); `common-wp-styling-errors.md` (5 new entries from today's catches). Toolkit design + design-brain architecture each gained wp-studio AI manual cross-references. `00-OVERVIEW.md` deleted by user (clashed with architecture.md).
6. **Dead code removed** — Both copies of `footer-indus-foods.php` deleted (framework copy was a CLAUDE.md violation; client override referenced non-existent `sgs/site-info` block). Legacy `CONVERSATION-HANDOFF.md` + `NEXT-SESSION-PROMPT.md` deleted in favour of canonical `.claude/` layout.
7. **Research-buddies panel scoped HTML-to-blocks compiler** — 9-agent panel (Sonnet + Opus + Haiku) produced full architecture: fork `html-to-gutenberg` (Verneaut), add 3 SGS-specific processors, AI annotator pre-step, `block.config.json` sidecar, `--mode=pattern` flag. Build estimate 3.5–4 days, ships as `/sgs-mockup-to-block` skill + slash command. Full research at `~/.openclaw/workspace/memory/research/2026-04-30-html-mockup-to-sgs-blocks.md`.
8. **QC panel verification** — Dispatched Sonnet + Gemini Flash + Gemini Pro + Cerebras to verify the block uniformity work. Sonnet (primary) caught 2 critical issues (announcement-bar + google-reviews dual-class collision when adding `supports.color`) which were then fully migrated inline. Gemini Pro 503'd as the QC skill predicted. Cerebras queue-saturated mid-run.

## Current State

- **Branch:** `feat/mamas-munches-strategic-brief` at `079318f`
- **Tests:** No formal test suite. Pre-commit audit passes (`audit-block-uniformity.py` exits 0). Block reference regenerates cleanly (59 blocks, 941 attributes).
- **Build:** Not run this session. `npm run build` needed before deploy.
- **Uncommitted changes:** 52 files (38 modified + 14 new). See "Files Modified" below for the breakdown.
- **Live site:** palestine-lives.org runs framework v1; today's polish has not been deployed yet.

## Known Issues / Blockers

- **52 uncommitted files** require a commit-and-push before further work on this branch.
- **VS Code reload required** for the new Intelephense stubs to take effect (one-time, user action).
- **Cerebras free-tier queue** is unreliable for time-sensitive tasks — stalled twice this session. `/delegate` routing flagged this; future code-gen tasks with `time_sensitivity: high` should bypass Cerebras.

## Next Priorities (in order)

1. **Decide commit strategy + ship today's polish** — 52 files is a large diff. Either one feature branch commit or split into logical chunks (block fixes, audit infrastructure, doc refresh, Composer stubs). Then build (`cd plugins/sgs-blocks && npm run build`) and deploy to palestine-lives.org via the tar method in CLAUDE.md.
2. **Build the HTML-to-blocks compiler** — 3.5–4 day Sonnet job. Highest leverage of the open work. Architecture fully scoped in the 2026-04-30 research doc. Day 1 should prototype the AI annotator + Hero block end-to-end in parallel to de-risk timing assumptions.
3. **Static-block deprecations** (carried over from morning state) — `certification-bar`, `counter`, `notice-banner`, `process-steps`, `testimonial`. Spec at `plans/strategy/post-wave2-deprecations.md`. Without these, existing pages with these blocks show "unexpected content" editor errors after deploys including the new defaults. ~90 min, fresh session.
4. **announcement-bar / google-reviews legacy attr cleanup** — backward-compat shim is in render.php for `backgroundColour`/`textColour` UK names. After a content sweep confirming no posts still use them, remove the shim and the dead attrs. Future major-version task.

## Files Modified

| Path | What changed |
|---|---|
| `.claude/architecture.md` | Block count 57→59, maturity score directional reference, 3 new architectural decisions (#16 customisation standard, #17 PHP IDE stubs, #18 HTML→blocks compiler), directory tree fixed |
| `.claude/handoff.md` (this file) | Refreshed for this session |
| `.claude/next-session-prompt.md` | Rewritten for next session priorities |
| `.claude/parking.md` | Pre-existing modifications |
| `.claude/plans/strategy/2026-04-24-design-brain-architecture.md` | Pipeline 6 — added wp-studio MCP tools cross-reference |
| `.claude/specs/01-SGS-THEME.md` | File-structure tree updated to match disk reality |
| `.claude/specs/02-SGS-BLOCKS.md` | Container + Info Box render type corrected; pointer to auto-generated reference |
| `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` | NEW — auto-generated, 2,216 lines |
| `.claude/specs/06-BUILD-ORDER.md` | Replaced — original archived, new current-state roadmap |
| `.claude/specs/09-GOLD-STANDARD-AUDIT.md` | Hero CTAs + Info Box hover gap markers updated |
| `.claude/specs/2026-04-27-optimisation-toolkit-design.md` | New 10.4 wp-studio cross-reference; renumbered 10.5/10.6 |
| `.claude/specs/common-wp-styling-errors.md` | 5 new errors (H5/H6/H7/C6/I4) + B2 enhancement |
| `.claude/specs/00-OVERVIEW.md` | DELETED by user (clashed with architecture.md) |
| `.claude/plans/archive/2026-04-30-archived-06-build-order.md` | NEW — archived original 06 |
| `.gitignore` | `vendor/` + `composer.phar` added |
| `.vscode/settings.json` | `intelephense.environment.includePaths` for Composer stubs |
| `composer.json` + `composer.lock` | NEW — dev-only WP stubs |
| `~/.claude/commands/sgs-update.md` | Chains generate-block-reference.py after update-db.py |
| `plugins/sgs-blocks/src/blocks/announcement-bar/{block.json,render.php}` | Full migration to native `supports.color` + backward-compat shim |
| `plugins/sgs-blocks/src/blocks/google-reviews/{block.json,render.php}` | Same — `--sgs-gr-text/bg-colour` CSS vars dropped, `--sgs-gr-star-colour` retained for inner element |
| `plugins/sgs-blocks/src/blocks/hero/{block.json,render.php}` | viewScript → viewScriptModule; letterSpacing + textTransform custom attrs removed |
| `plugins/sgs-blocks/src/blocks/cta-section/{block.json,render.php}` | Typography deduplication; `wp_strip_all_tags` + phpcs:ignore on `$responsive_css` |
| `plugins/sgs-blocks/src/blocks/info-box/{block.json,render.php}` | Typography deduplication |
| `plugins/sgs-blocks/src/blocks/mega-menu/block.json` | source:html bug fixed on `label`; `supports.color` added |
| `plugins/sgs-blocks/src/blocks/back-to-top/block.json` | `supports.color` added |
| `plugins/sgs-blocks/src/blocks/reading-progress/block.json` | `supports.color` added |
| `plugins/sgs-blocks/src/blocks/{card-grid,icon-list,post-grid,testimonial-slider,trust-badges}/block.json` | Selector naming standardised to `.wp-block-sgs-*` |
| `plugins/sgs-blocks/scripts/audit-block-uniformity.py` | NEW |
| `plugins/sgs-blocks/scripts/generate-block-reference.py` | NEW |
| `.git/hooks/pre-commit` | Extended to run uniformity audit when block.json staged |
| `theme/sgs-theme/patterns/footer-indus-foods.php` | DELETED — framework violation |
| `sites/indus-foods/theme-overrides/patterns/footer-indus-foods.php` | DELETED — referenced non-existent block |

## Notes for Next Session

- **The audit script is the long-term win.** Today's individual fixes mattered, but the script catches every form of non-uniformity in 0.5 s. Wired into the pre-commit hook = future blocks can't ship with viewScript / source:html / typography duplication / missing supports.color.
- **The auto-generated reference replaces a class of doc-drift forever.** `02-SGS-BLOCKS.md` covers patterns and standards; `02-SGS-BLOCKS-REFERENCE.md` covers per-block detail and is regenerated from the DB on `/sgs-update`. No more 29-block-missing audits.
- **Cerebras corruption pattern (third occurrence today).** Cerebras-generated scripts have failed twice with literal `n` characters where newlines should be — heredoc/string-literal corruption. Captured in blub.db corrections (`feedback_stage_files_via_tmp_not_bash_heredoc`). For code generation in production paths, escalate past Cerebras to Sonnet or write inline.
- **`/delegate` routing decisions worked but logged failures.** Cerebras was the right cost choice on paper for the script-gen task; in practice the queue stall + corruption made fallback faster. Worth setting `time_sensitivity: high` on similar small-but-time-pressed tasks to skip Cerebras directly.
- **The HTML-to-blocks compiler is buildable now.** 9 research agents converged on the architecture. The fork target (`jverneaut/html-to-gutenberg`) is verified — its `<server-block>` mode already does dynamic render.php. The 40% gap is SGS-specific attribute richness (colour tokens, responsive variants, hover behaviour) — three new processor files of ~100 lines each.

---

# Session Handoff — 2026-04-30 morning: gap-analysis B 3.9 → B 4.4 upgrade + lesson capture

## What shipped this session

| Output | Path | State |
|---|---|---|
| `gap-analysis-floor-check.py` hook | `~/.claude/hooks/gap-analysis-floor-check.py` | NEW; 3-fixture self-test passes; registered in `settings.json` PostToolUse Write\|Edit |
| `gap-analysis-backlog-write.py` hook | `~/.claude/hooks/gap-analysis-backlog-write.py` | NEW; 5-case self-test passes |
| `gap-analysis-qc-dispatch.py` hook | `~/.claude/hooks/gap-analysis-qc-dispatch.py` | NEW; 8-case self-test passes |
| `gap_analysis_report_parser.py` shared | `~/.claude/hooks/gap_analysis_report_parser.py` | NEW |
| `/gap-analysis` Tier B schema edits | `~/.claude/skills/gap-analysis/SKILL.md` | 5 fields + rec #2 `calibration_applied` per criterion |
| `/gap-analysis` backlog file | `~/.claude/skills/gap-analysis/references/backlog.md` | NEW; 6 open B/C/D items |
| Tier-C re-grade run 3 report | `~/.claude/gap-analysis/reports/2026-04-30-gap-analysis-skill-3.md` | B 4.4 (raw 4.37); Lens 4 PARTIAL; QC verdict REVIEW certainty 62 |
| Lesson: blub knowledge POST unicode | `~/.openclaw/workspace/memory/learning/2026-04-30-blub-knowledge-post-unicode-substitution.md` | NEW |

## Decisions captured

1. **Stop the A-promotion chase.** Hooks are durable infrastructure (worth keeping); the recursive A-chase is a perfectionism trap. Decision: ship hooks + rec #2 schema field, defer recs #1, #3-8 to a parking-lot.
2. **Lens 4 PARTIAL is honest.** Three previously prose-only enforcement points gained hooks. C-grade calibration discipline remains prose-only. PARTIAL not PASS.
3. **QC peer-review caught self-preference.** Initial scoring had C6/C10 at 4.5; Sonnet reviewers amended to 4.3 because qc-dispatch validates schema shape but not reviewer independence.
4. **Hooks dogfooded on first live use.** First Write of the run-3 report was rejected by both backlog-write (wording mismatch) and qc-dispatch (qc_review missing). Both fixed; report wrote on second attempt.
5. **Blub knowledge-API unicode hang.** `/api/knowledge` POST hung 20+ s on em-dash; ASCII-substituted version posted in <1 s. Lesson captured at recurrence pattern_key `diagnose-blub-db-locks-not-park-on-timeout`.
