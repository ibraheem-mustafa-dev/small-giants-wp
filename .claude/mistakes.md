# small-giants-wp — Mistakes & Recurring Lessons
**Last updated:** 2026-05-01

## 2026-05-01 — auto-clone is structurally sound but visually insufficient

The recogniser pipeline produced valid block markup for the Mama's Munches homepage and the page rendered without errors. Activating the `mamas-munches` style variation lifted fidelity from ~12/100 to ~65/100. Bean's verdict: still not close enough to be an "exact likeness" of the draft.

**Lesson:** programmatic translation captures structure + tokens but misses the design choices that live in the gap between block defaults and mockup-specific styling — section banding, card containers, decorative frames, exact spacing rhythm, custom hover states. For client-facing visual clones the auto-pipeline gets to ~65/100; the last 35 points need a deliberate top-to-bottom rebuild section by section.

**How to apply:** for site clones, run the recogniser to get the structural skeleton + token mapping, then walk the design top-to-bottom matching the mockup section by section. Do not declare done from a one-shot auto-output.

Lessons that have fired repeatedly enough to be worth surfacing here. Living source: CC auto-memory at `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_*.md` — this file is a curated index. Click through for full detail per lesson.

## Recurring patterns

| Lesson | One-line summary | Detail |
|--------|-----------------|--------|
| `always-screenshot-verify` | MUST take a frontend screenshot and visually inspect it before saying any fix is complete — no excep | [feedback_always_screenshot_verify.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_always_screenshot_verify.md) |
| `block-name-search-blindspot` | When a block name contains a parenthetical qualifier (e.g. "Icon Block (single icon)"), Claude's grep instinct breaks. Even when the name is the literal heading, Claude can fail to locate the file. Fix: search the heading verbatim including parens, then search core noun without qualifier as fallback. Capture as a TODO for the eventual ledger-tag system | _captured 2026-04-29 mid-Phase-1c session_ |
| `verify-rendered-output-not-internal-metrics` | Internal metrics (function return value, DB row count, JSON shape, "tests passed", file-content read-back) never prove user-visible visual outcomes. Visual claims require live-DOM assertion: `getComputedStyle`, `getBoundingClientRect`, `element.style.cssText`, or screenshot AT a specific selector. /qc scoring 95/100 while user-visible bugs are everywhere is the failure signature | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) (blub.db row 194) |
| `block-validation-recovery` | When block attribute changes don't render on the frontend, check for block validation errors in the  | [feedback_block_validation_recovery.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_block_validation_recovery.md) |
| `defaults-need-deliberate-judgement` | When setting defaults across a class of components (blocks, templates, fields, palette assignments), | [feedback_defaults_need_deliberate_judgement.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_defaults_need_deliberate_judgement.md) |
| `design-session-2026-03-28` | Extensive design review and fixes session — user's specific dislikes, what was fixed, and what still | [feedback_design_session_2026_03_28.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_design_session_2026_03_28.md) |
| `ingest-dont-generate-reference-data` | For any reference-DB skill, populate via deterministic ingest-*.py from authoritative open-source re | [feedback_ingest_dont_generate_reference_data.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ingest_dont_generate_reference_data.md) |
| `litespeed-gotchas` | LiteSpeed UCSS strips CSS rules it considers unused, and its JS combiner serves stale cached files e | [feedback_litespeed_gotchas.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_litespeed_gotchas.md) |
| `no-hardcoding-mobile-nav` | Never build hardcoded HTML components in template parts. Always flag existing hardcoding when encoun | [feedback_no_hardcoding_mobile_nav.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_no_hardcoding_mobile_nav.md) |
| `palette-defaults-for-blocks` | When setting any default colour value on an SGS block, use a palette token (var(--wp--preset--color- | [feedback_palette_defaults_for_blocks.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_palette_defaults_for_blocks.md) |
| `parallel-dispatch-shared-files` | When dispatching parallel agents that may touch the same file (extension files, theme.json, shared C | [feedback_parallel_dispatch_shared_files.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_parallel_dispatch_shared_files.md) |
| `playground-not-useful` | WordPress Playground is unsuitable for SGS dev/design work because it cannot serve production media  | [feedback_playground_not_useful.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_playground_not_useful.md) |
| `prefer-diagnostics-over-cli-linters` | After any code edit, read the VS Code Problems panel via mcp__ide__getDiagnostics instead of running | [feedback_prefer_diagnostics_over_cli_linters.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_prefer_diagnostics_over_cli_linters.md) |
| `sgs-monorepo-separation` | Framework code lives in plugins/ + theme/sgs-theme/; client code lives in sites/<client-slug>/. Run  | [feedback_sgs_monorepo_separation.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_monorepo_separation.md) |
| `sgs-workflow` | Always invoke /sgs-wp-expert before SGS WordPress work and /sgs-update after all changes | [feedback_sgs_workflow.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_sgs_workflow.md) |
| `ship-skill-and-slash-command` | When a skill wraps a single canonical CLI invocation, ship BOTH the skill AND a slash command in ~/. | [feedback_ship_skill_and_slash_command.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_ship_skill_and_slash_command.md) |
| `stage-files-via-tmp-not-bash-heredoc` | When writing Python scripts, markdown, regex content to a file via Bash, use the file-staged pattern | [feedback_stage_files_via_tmp_not_bash_heredoc.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_stage_files_via_tmp_not_bash_heredoc.md) |
| `use-devtools-first` | When a CSS property isn't applying correctly, use Chrome DevTools or Playwright to check the Compute | [feedback_use_devtools_first.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_use_devtools_first.md) |
| `verify-rendered-output-not-internal-metrics` | Before claiming any visual / CSS / layout / default-rendering work is done, capture a Playwright assertion on the live rendered DOM showing the user-visible value. Internal metrics (commits, builds, validations, contrast values, OPcache reset) prove inputs, never user-visible outcomes. blub.db row 194. | [feedback_verify_rendered_output_not_internal_metrics.md](~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_verify_rendered_output_not_internal_metrics.md) |

## Reference catalogues

- **Common WordPress styling errors** — 21 specific failure patterns from the 2026-04-29 polish session, each with cause + proven fix: [`specs/common-wp-styling-errors.md`](specs/common-wp-styling-errors.md)

## How to add a lesson

When a lesson fires that you want to remember:
1. Add a `feedback_<slug>.md` file to the auto-memory dir
2. Add a row to this table
3. The CC auto-memory system reloads it automatically next session
