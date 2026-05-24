# Session Handoff — 2026-05-24 (Doc-Optimisation EXECUTION)

**This supersedes the previous handoff-doc-op.md** which captured the 2026-05-24 council planning session. This handoff captures the EXECUTION session that followed — 12 commits to main, 5 GB disk recovered, full SonarLint cc sweep landed on `sgs-update-v2.py`, Tasks I + H closed, and the doc-optimisation programme is partially through (Phases 1, 2, 3, 4, 5 done; 6, 7, 9, 10, 12, 13 remaining).

## TL;DR (read this first)

**12 commits shipped to main this session** (excluding doc fixes):

| SHA | Phase / Task |
|---|---|
| `a252fb75` | Tasks I + H + 3 script ports + sweep |
| `4c5aaa5c` | Proposal A — `stage_5_slot_synonym_auto_seed` cc 29 → ~10 |
| `8127f880` | Proposal B — `stage_4_style_variation_sync` cc 85 → ~9 |
| `c0fb9639` | Proposal C — `_mode_b_refresh_upstream` cc 142 → ~28 |
| `1f299169` | Polish A/C + collapse Mode A/B + sweep stale DB refs |
| `222022a0` | Batch 1 cc sweep — `_insert_or_count` helper + Sources 1/2/3 |
| `a670d565` | Batch 2 cc sweep — token helpers split |
| `3988ca10` | Batch 3 cc sweep — handbook sources extract |
| `4db155fd` | Batch 4 cc sweep — stage_6 + main() dict-dispatch |
| `44aa91f8` | Batch 5 cc sweep — stage_1 + Source 1 + 4 residuals |
| `47bf8b1f` | Phase 3 — gitignore auto-generated 02-SGS-BLOCKS-REFERENCE.md |
| `9b1cd251` | Phase 4 — F5 + F6 + F3 small fixes |

Plus one to user `~/.claude` repo: `768488e` — wp-blocks.py + wp-docs.py port to sgs-framework.db.

**Disk recovered today: ~5.04 GB** (4.39 GB worktrees + 24 MB source DBs + 623 MB MCP caches).

**5 lessons captured to auto-memory** (Phase 5 / Task J):
- `feedback_active_prune_over_age_cutoff_archive.md`
- `feedback_mistakes_md_as_keyword_stubs.md`
- `feedback_memory_md_silent_dropout_safety_bug.md`
- `feedback_shipped_claims_need_grep_verify.md`
- `feedback_data_migration_needs_read_path_port.md`

MEMORY.md auto-memory index recompressed from 35,417 bytes → 22,581 bytes (well under the 24,576-byte autoload cap that was silently truncating ~15-20 binding rules).

## What was done

### Phase 1 (F2) — MEMORY.md silent dropout fix
- Rewrote MEMORY.md from multi-line block-quote summaries to one-line stubs.
- 76 feedback files indexed (was ~52 before truncation).
- 35,417 → 22,581 bytes, all rules now auto-load.

### Phase 2 (F1) — Worktree force-removal
- 21 locked agent worktrees + 20 stale branch refs deleted.
- Disk: `.claude/` 4.4 GB → 14 MB.
- Branches investigated before delete: 3 named `feat/phase-2a-branch-{c,h,d}` branches found to be SUPERSEDED by main's `a7f85a4a` commit — content already on main, safe to drop. 1 empty `feat/spec18-customiser-cleanup` branch dropped.

### Task I — `block_compositions` migration close-out
- Standalone `block_compositions` table merged into `patterns.block_composition` JSON column (35 of 37 rows ported; 2 orphans dropped).
- Active references stripped across `.claude/`, project root `CLAUDE.md`, and 4 scripts (`pattern-register.py`, `seed-block-compositions.py`, `enrich-db.py`, `uimax-tools/README.md`).
- D55 decisions.md entry is the single canonical migration record.

### Task H — Source-DB retirement (`blocks.db` + `hooks.db`)
- **Empirical audit caught the prior "SHIPPED" claim was incomplete** — 122 variations + 331 markup_examples + 187 hooks missing + 2 entire tables (api_usages, block_registrations) never migrated.
- Back-filled the missing rows via direct ATTACH + INSERT into sgs-framework.db.
- Ported 3 read-path consumers: `wp-blocks.py` (full rewrite), `wp-docs.py` (full rewrite), `sgs-update-v2.py` Mode A + Stage 3.
- Deleted source DBs (24 MB) + MCP cache dirs (127 + 496 MB).
- D56 decisions.md entry is the single canonical migration record.

### Mode A / Mode B / Stage 3 collapse
- Mode A (cached-source-DB read) was a stub after Task H; collapsed to always-Mode-B.
- `--refresh-upstream` CLI flag removed (live-scrape is now the default).
- Stage 3 became a tombstone log line (Stage 2 Source 3 covers the same wp-cli/handbook scrape).
- Net file shrink: 2,873 → 2,392 lines.

### Cognitive-complexity sweep (Proposals A/B/C + Batches 1-5)

10 functions refactored across 5 batches + 3 standalone proposals. Every commit was gated by:
- Baseline capture (Stage N stdout + return dict + report file bytes)
- Implementer subagent dispatched cold
- Live-network smoke-test confirming byte-equal output
- Cross-model 2-rater review (Sonnet + Haiku in parallel)
- Per-reviewer concern fixed before commit (per Bean's "all even non-blocking" rule)

| Function | cc Before | cc After |
|---|---|---|
| `stage_1_sgs_codebase_scan` | 73 | ~8 |
| `_scrape_source_1_gutenberg` | 33 (after first pass: 29) | ~6 |
| `_mode_b_refresh_upstream` | 142 → 52 (after Proposal C) → ~13 | ~13 |
| `_scrape_handbook_sources_5_to_10` | new — ~20 | ~10 |
| `stage_4_style_variation_sync` | 85 | ~9 |
| `_build_token_candidates` | 20 | ~2 |
| `_write_token_row` | 18 | ~6 |
| `stage_5_slot_synonym_auto_seed` | 29 | ~10 |
| `stage_6_block_replacement_mapping` | 18 | ~6 |
| `main` | 18 | ~5 |

Shared helpers built: `_insert_or_count` (used 8+ times across the file), `_SELECT_*_NATIVE_WP` SQL constants (4), `_UTC_TIMESTAMP_FMT`, `_REPORT_NONE_MARKER`, `_SELECT_TOKEN_DEFAULT_VALUE`.

### Phase 3 — gitignore auto-generated reference
- Untracked `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` (6,089 lines) + added to `.gitignore`.

### Phase 4 — 3 small fixes (F5 + F6 + F3)
- F5: removed broken `subprojects.md` reference from `.claude/CLAUDE.md` (file doesn't exist).
- F6: docs-registry.yaml header 23 → 3 lines (trim history in git log).
- F3: deleted 6 stale next-session-prompts from `.claude/memory/`.

### Phase 5 — Lesson capture
- 5 `feedback_*.md` files written (listed in TL;DR above) + indexed in MEMORY.md.

## Empirical state (verified)

- All 9 stages of `/sgs-update --dry-run` produce identical output pre/post cc sweep.
- Live-network Mode B (`--dry-run` against GitHub): 10 sources succeeded, 0 failed, `new_rows={blocks:1, attrs:0, supports:0, hooks:1, docs:97}`, full `items_per_source` dict byte-identical.
- All 12 main + 1 user .claude commits pushed.
- Working tree clean on small-giants-wp main at `9b1cd251`.

## Efficiency observations (per Bean directive 2026-05-24)

This session was ~7 hours and dispatched 20+ subagents. Patterns worth codifying as skills/commands going forward:

### What worked well

1. **Sonnet + Haiku parallel cross-model review via Agent tool.** Cheap, fast, caught real bugs (Haiku flagged `_index_sgs_block_files` unused `conn` param, Sonnet caught conflict-insert return-value smell, both flagged docstring drift). Cross-model coverage from 2 raters proved sufficient for low-to-medium-risk refactors; the binding rule's 4-rater panel is overkill for byte-equal mechanical extractions.
2. **Baseline → implementer → smoke-test gate.** Every batch verified byte-identical Stage N output pre/post via `diff` against captured baselines. Caught zero real regressions but proved behaviour preservation cheaply.
3. **Shared-helper-first batching.** Building `_insert_or_count` first in Batch 1 made Batches 2/3/4/5 each cheaper (call-site is one line instead of 8). Worth doing this every refactor sweep: holistic investigation → identify Pattern A across N functions → build the shared helper once.
4. **The implementer subagent + cold prompt pattern.** Cold prompts produced clean diffs every time; same-model self-critique never beat cross-model.

### What was inefficient

1. **`/subagent-driven-development` skill ceremony.** Heavy boilerplate for what became identical workflow each batch. Used 1x for Proposal A then collapsed to direct Agent calls + manual review-orchestration. Skill is correct conceptually but too verbose for repeat-pattern work.
2. **Diagnostic line numbers drifted after every commit.** Implementers had to `grep -n "^def name"` each time. A function-name-keyed cc dump (instead of line-keyed) would be more durable.
3. **Initial cc estimates from agents were optimistic.** Sonnet predicted `_scrape_handbook_sources_5_to_10` at cc=10 post-split; actual was 15 (had to split again). cc=29 reduction predictions landed at cc=29. Estimates over-reduced by ~30-40%. A `sonarlint` local CLI hook to ground-truth cc per function pre-implementation would calibrate.
4. **Re-running `wc -c` / `grep` / `diff` manually for commit gates** — ~10 times this session. A `/baseline-and-smoke <command>` helper that captures-runs-diffs in one call would save tool overhead.

### Skills/commands worth building before next refactor session

1. **`/cc-refactor <function-name>`** — codifies the workflow used 10+ times this session:
   - Identifies cc via SonarLint or AST analysis
   - Dispatches investigation agent for refactor proposal
   - Runs `/qc-inline` on the proposal
   - Captures baseline (function-N stdout + return dict + relevant report file bytes)
   - Dispatches implementer with cold prompt + commit-gate spec
   - Re-runs baseline diff
   - Dispatches 2-rater (Sonnet + Haiku) parallel review on the diff
   - Auto-fixes any non-blocking concerns the reviewers raise
   - Commits + pushes if all gates pass

2. **`/baseline-and-smoke <cmd>`** — one Bash invocation that:
   - Captures `cmd` output before edit (sha256 + first/last line)
   - Reminds the operator to make their edit
   - Re-runs `cmd` after edit
   - Outputs the byte-diff + sha256 match indicator
   - Optional `--report-file <path>` to diff a regenerated report file ignoring timestamp lines

3. **`/parking-entry <KEY>`** — quick parking-entry write with consistent format (status / context / trigger / effort), inserted in `.claude/parking.md` under the right date heading.

4. **Local `sonarlint` CLI hook** — runs Cognitive Complexity rule on a single function by name, returns the number. Eliminates the IDE-diagnostic round-trip + line-drift confusion.

5. **`/refactor-sweep <file>`** — given a single file with N cc warnings, dispatches one holistic investigation agent (like the one used this session for the 8-function batch plan), then runs `/cc-refactor` per function in dependency-aware order (shared-helper functions first), then commits each as a separate cohesive commit.

## Files modified this session

### small-giants-wp repo (12 commits to main)

| File | Phase / Task |
|---|---|
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | Tasks I + H + Proposals A/B/C + Batches 1-5 + polish + collapse |
| `plugins/sgs-blocks/scripts/pattern-register.py` | Task I (block_compositions migration) |
| `plugins/sgs-blocks/scripts/uimax-tools/seed-block-compositions.py` | Task I |
| `plugins/sgs-blocks/scripts/uimax-tools/enrich-db.py` | Task I print message |
| `plugins/sgs-blocks/scripts/uimax-tools/README.md` | Task I |
| `CLAUDE.md` | Tasks I + H sweeps |
| `.claude/CLAUDE.md` | Phase 4 F5 |
| `.claude/architecture.md` | Task H + cc sweep references |
| `.claude/decisions.md` | D55 + D56 |
| `.claude/parking.md` | P-SGS-UPDATE-V2-COGNITIVE-COMPLEXITY-REFACTOR entry |
| `.claude/mistakes.md` | Task I sweep |
| `.claude/cloning-pipeline-flow.md` | Task I + H sweeps |
| `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` | Tasks I + H sweeps |
| `.claude/next-session-prompt.md` | BEM-canonical session prompt (preserved — DO NOT TOUCH per Bean) |
| `.claude/plan.md` | Task I sweep |
| `.claude/docs-registry.yaml` | Phase 4 F6 trim |
| `TOOLING-REFERENCE.md` | Task H sweep |
| `.gitignore` | Phase 3 |
| 6 deletions in `.claude/memory/next-session-prompt-2026-05-*.md` | Phase 4 F3 |

### user `~/.claude` repo (1 commit on `fix/wave-1-g2-...` branch)

| File | Task |
|---|---|
| `hooks/wp-blocks.py` | Task H1 — full rewrite for sgs-framework.db |
| `hooks/wp-docs.py` | Task H2 — full rewrite for sgs-framework.db |

### user `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/` (auto-memory, not git-tracked)

| File | Phase / Task |
|---|---|
| `MEMORY.md` | Phase 1 F2 (recompressed) + Phase 5 J (5 new stubs) |
| 5 new `feedback_*.md` files | Phase 5 J |

## Next priorities (in order)

1. **Phase 6 (B') — Active prune of mistakes.md / decisions.md / parking.md** per Bean's 5 refinements. 3 sub-commits. Highest judgement load remaining; needs a focused session. Est. 45-60 min.
2. **Phase 7 (F4) — Retention policy in docs-registry.yaml** for `memory/` (30-day TTL on next-session-prompt; 60-day TTL on handoff; permanent otherwise). Est. 5 min.
3. **Phase 9 (C') — Relocate 11 misplaced specs + archive quickstart**, with inbound-reference grep + same-commit update. Est. 30 min.
4. **Phase 10 (D') — Atomic restructure of heavy docs** (architecture.md split + cloning-pipeline-flow.md split + Spec 21 rename + CLAUDE.md Karpathy rewrite + plan.md stub). 6 atomic sub-commits. Est. 60-75 min.
5. **Phase 12 (E') — Registry sync + decision-entry close-out post-Phase-10.** Est. 10 min.
6. **Phase 13 (G) — `/docscore` rule integration.** Add universal + doc-type-specific rules to `/docscore` command. Est. 30 min.
7. **AFTER doc-op closes:** Resume Step 1.7 G3 (BEM-canonical slot_list visual extension) per the standard `.claude/next-session-prompt.md`. This is the deferred work the doc-op was scheduled before.

Estimated remaining doc-op work: ~3-4 hours.

## Next Session Prompt

See `.claude/next-session-prompt-doc-op.md` (updated this session — covers Phases 6, 7, 9, 10, 12, 13 with the efficiency recommendations above).
