---
doc_type: next-session-prompt
project: small-giants-wp
last_updated: 2026-05-12
session_tag: small-giants-wp-2026-05-12-spec15-p1-foundation-shipped
recommended_model: sonnet
recommended_model_score: 3/12 (novelty 0 + adversarial 1 + context 1 + design 1)
---

# Next Session — Spec 15 Phase 2 (/sgs-update unified)

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec15-p1-foundation-shipped"`

You are a senior systems engineer specialising in deterministic-pipeline tooling: SQLite-backed catalogues, /sgs-update orchestration, drift detection, and idempotent-stage architecture for the SGS WordPress framework. Phase 1 of the Spec 15 build is shipped; your job is to wire it together as a single idempotent /sgs-update pass + close out the two Phase-1-deferred architectural decisions.

Read `.claude/handoff.md` and `.claude/CLAUDE.md` for full context, then work through the priorities below.

## Where You Are

Plan: `.claude/plans/spec-15-master-execution-plan.md`
Current phase: Phase 2 — /sgs-update unified
Progress: 1/5 phases complete (Phase 1 — Foundation SHIPPED 2026-05-12, commit `2581b1d5`)
Next task: Step 2.1 — Add Stage 3 (behavioural analysis) to update-db.py

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Architectural call at Steps 2.3 (F3) + 2.4 (F4) — drift validator + gap detection design |
| `/gap-analysis` | Grade Phase 2 deliverable before the QC panel |
| `/lifecycle` | Only if Phase 2 introduces a new skill/agent/pipeline (unlikely — should be pure code) |
| `/research` | Only if drift validator needs reference to industry-standard catalogue patterns |
| `/strategic-plan` | Not needed — Phase 2 plan already in master execution plan |
| `/delegate` | Before every Agent dispatch — returns model + fallback chain |
| `/subagent-prompt` | Pre-write cold prompts for Sonnet dispatches at Steps 2.1-2.5 |
| `/sgs-db` | Inspect sgs-framework.db state during 2.1-2.4 |
| `/wp-blocks` | Cross-reference block.json schemas if needed during drift detection |
| `/uimax` | Query design tokens / naming conventions if drift validator needs cross-platform context |
| `/dispatching-parallel-agents` | Only if 2+ steps can safely run on independent files (sqlite-lock check first) |
| `/qc` | Phase 2 QC panel at Step 2.7 — BEFORE commit (Sonnet + Haiku + Gemini Flash) |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Python 3.13 + sqlite3 stdlib | DB queries + ALTER + idempotent INSERT/UPDATE |
| BeautifulSoup4 | If drift validator parses HTML for non-canonical class detection |
| Pytest | Extend Phase 1 test suite for new stages |
| Cerebras agent (`python ~/.claude/agents/cerebras-agent/agent.py`) | Bounded mechanical SQL only — NOT for QC review (rate-limits) |
| Gemini Flash CLI (`gemini -p ... --model gemini-3-flash-preview`) | QC panel 3rd rater (free, 1M context) — source `~/.openclaw/.env` first |
| `gh pr create` / `gh pr merge` | Phase 2 PR |
| `wp-devdocs` MCP | Validate any new WP hook references during drift detection |

## Agents to Delegate To

| Agent | When |
|------|------|
| `wp-sgs-developer` | If drift validator needs WP-specific block-attribute conventions explained inline |
| `general-purpose` (model=sonnet) | All bounded code-gen dispatches at Steps 2.1-2.5 |
| `general-purpose` (model=haiku) | QC panel rater 1 (fast sanity check) |
| `general-purpose` (model=sonnet) | QC panel rater 2 (strict critic — honour fix-before-ship verdicts inline) |

---

## Task 1: Wire Phase 1 modules into /sgs-update (Steps 2.1-2.2, ~40 min)

Dispatch via `/delegate` then Sonnet. Edit `~/.claude/skills/sgs-wp-engine/scripts/update-db.py` to add Stage 3 (behavioural analysis) calling `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` and Stage 4 (canonical assignment) calling `assign-canonical.py`. Idempotent — re-run produces no diffs. Run `/qc-inline` after each: dry-run shows Stage 3/4 logged in order; spot-check 3 DB rows post-run.

## Task 2: Drift validator + F3 architectural call (Step 2.3, ~25 min)

Sonnet dispatch creates `plugins/sgs-blocks/scripts/drift-validator/validate.py`. Decomposes every block_attributes row; reports violations. Inline architectural call on F3: decide accept-NULL canonical_slot vs add `__root__` pseudo-slot vs extend slot vocab. Record decision in `.claude/decisions.md`.

## Task 3: Gap detection + F4 architectural call (Step 2.4, ~25 min)

Sonnet dispatch creates `plugins/sgs-blocks/scripts/gap-detection/detect.py`. Reads `recognition_log` for `extraction_failed` events + `block_attributes` for NULL canonical_slot. Writes to `attribute_gap_candidates`. Inline architectural call on F4: accept 74.1% output_signature coverage vs invest 60-90 min in PHP-AST-light extension. Record decision in `.claude/decisions.md`.

## Task 4: Reference doc regen + idempotency (Steps 2.5-2.6, ~20 min)

Sonnet dispatch updates the regen script to append "Canonical Vocabulary" appendix to `02-SGS-BLOCKS-REFERENCE.md` (20 slot synonyms + 48 property suffixes + 19 modifier suffixes). Inline: run `/sgs-update` twice, `diff` outputs — expect empty.

## Task 5: QC panel BEFORE commit, then single clean commit (Steps 2.7-2.8, ~20 min)

Dispatch 3-rater panel (Sonnet + Haiku + Gemini Flash) — NOT after the commit. Apply Sonnet-flagged fixes inline; re-run panel if diff material. Only then commit + push + open PR with title `feat(spec-15-p2): /sgs-update unified pipeline`. Squash-merge.

## Guardrails

- No `--resume` flags in any pipeline or script.
- No em-dashes in pipeline output.
- QC panel BEFORE commit — hard rule.
- UK English everywhere; no emojis; no mocking in tests.
- Pre-commit: verify no `.bak`, `.pyc`, or temp files staged.
- Phase 1 modules are shipped — DO NOT rewrite them. Wire them in.
- F3 + F4 are architectural decisions to MAKE inline at Steps 2.3 + 2.4 — don't pre-empt them in cold prompts.
- Branch discipline: `feat/spec-15-p2-sgs-update-unified` for the build; main only for the squash-merge.
