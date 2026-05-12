---
doc_type: next-session-prompt
project: small-giants-wp
last_updated: 2026-05-12
recommended_model_next: sonnet (Phase 2 is mostly Sonnet code-gen with light architectural calls; Opus only needed if F3 drift-validator design opens an architectural debate)
---

# Next Session — Spec 15 Phase 2 (/sgs-update unified)

Phase 1 — Foundation SHIPPED on main 2026-05-12 (commit `2581b1d5`, PR #14 merged). 58 min wall-clock vs 6 hr estimate. All four foundation modules green; 17/17 pytest; 3-rater QC panel verdict applied; F3 + F4 deferred to Phase 2 per panel consensus.

This session executes **Spec 15 Phase 2 — /sgs-update unified** (~2 hr): wire Phase 1 modules into `/sgs-update` as new stages, add drift validator + gap detection, regen reference doc, idempotency test.

## Invoke first

`/autopilot` — establishes routing + ADHD support for the whole session.

## Step 0 — Continue the session timer

The Phase 1 session-start timestamp is at `.claude/scratch/spec-15-session-start.txt`. Keep it — Phase 2 elapsed-time tracking reads from the same file. If the file is gone for any reason, re-init:

```bash
mkdir -p .claude/scratch
date +%s > .claude/scratch/spec-15-session-start.txt
```

## Cold-start reads (~10 min)

1. **`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`** — focus on §6 (`/sgs-update` 11-stage pipeline), §11 Phase 2 success criteria.
2. **`.claude/plans/spec-15-master-execution-plan.md`** — Phase 2 step table + Global Rule "QC before commit" (added 2026-05-12).
3. **`.claude/state.md`** — `current_phase = spec-15-phase-2-sgs-update-unified`.
4. **`.claude/parking.md`** — P-S15-F3 + P-S15-F4 (Phase 1 deferrals) — these are decisions to make during Phase 2 Steps 2.3 + 2.4.
5. **`.claude/decisions.md`** — 2026-05-12 entry on slot-vocab-content-identity-only.
6. **`.claude/mistakes.md`** — top two entries (case-sensitive endswith; QC-before-commit).

## What's already shipped (don't redo)

- 3 vocab tables seeded in sgs-framework.db: `slot_synonyms` (20), `property_suffixes` (48), `modifier_suffixes` (19)
- `block_attributes` extended +6 cols, all 1343 rows preserved
- `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` — populates `output_signature` (74.1% coverage; 300 NULL design-shape attrs)
- `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` — populates `canonical_slot` + `role` + `derived_selector` for 320 content-identity attrs; 1023 structural attrs in `attribute_gap_candidates`
- `plugins/sgs-blocks/scripts/value-matcher/match.py` — ΔE2000 + percent-deviation snap (13/13 self-tests)
- `plugins/sgs-blocks/scripts/value-matcher/inheritance.py` — WP precedence (4/4 self-tests)
- `plugins/sgs-blocks/scripts/tests/test_spec_15_phase_1.py` — pytest suite (17/17)
- Migration + seed scripts at `~/.claude/skills/sgs-wp-engine/scripts/migrate-spec-15-p1.py` and `seed-spec-15-p1-vocab.py`

## Phase 2 — step-by-step

Per the master plan §Phase 2. Note: **QC step now runs BEFORE commit** (2026-05-12 process correction). Use `/delegate` before each Agent dispatch.

| Step | Description | Model | Time |
|---|---|---|---:|
| 2.1 | Add Stage 3 (behavioural analysis) to `update-db.py` | Sonnet | 20 min |
| 2.2 | Add Stage 4 (canonical assignment) | Sonnet | 20 min |
| 2.3 | Add Stage 9 (drift validator) — also rules on P-S15-F3 (NULL slot vs __root__ pseudo-slot) | Sonnet + inline architectural call | 25 min |
| 2.4 | Add Stage 10 (gap detection) — also rules on P-S15-F4 (accept 74.1% vs PHP-AST extension) | Sonnet | 25 min |
| 2.5 | Update reference doc regen to include canonical vocabulary appendix | Sonnet | 15 min |
| 2.6 | Idempotency test — run `/sgs-update` twice, diff outputs | Inline | 5 min |
| 2.7 | **Phase 2 QC — 3-rater panel BEFORE commit** | Sonnet + Haiku + Gemini Flash | 15 min |
| 2.8 | Commit + push + open PR (single clean commit) | Inline | 5 min |

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — routing + ADHD support |
| `/delegate` | Before every Agent dispatch — returns model + fallback chain |
| `/subagent-prompt` | Pre-write cold prompts when complex dispatches needed |
| `/sgs-db` | Inspect sgs-framework.db state during steps 2.1–2.4 |
| `/wp-blocks` | Cross-reference block.json schemas |
| `/uimax` | Query uimax tables if drift validator needs cross-platform mappings |
| `/qc` | Phase 2 QC panel at step 2.7 (BEFORE commit) |
| `/dispatching-parallel-agents` | If 2.1+2.2 or 2.3+2.4 can run in parallel (file-independent) |
| `/handoff` | Session close |

## Tooling reference

| Tool | Purpose |
|---|---|
| Python 3.13 + sqlite3 stdlib | DB queries + migrations |
| BeautifulSoup4 | If drift validator needs HTML parsing for non-canonical class detection |
| Pytest | Extend Phase 1 test suite for new stages |
| Cerebras agent | Bounded mechanical work only (avoid for QC panel — rate-limits) |
| Gemini Flash CLI | `gemini -p ... -y --model gemini-3-flash-preview` after sourcing `~/.openclaw/.env` |
| `gh pr create / merge` | Phase 2 PR |

## Hard constraints (always)

- UK English in code + comments + docs
- No emojis unless asked
- No mocking in tests
- No `--resume` flags in pipelines (per blub.db lesson)
- No em-dashes in pipeline output
- **QC panel runs BEFORE commit, not after** (NEW 2026-05-12)
- Per-rater QC verdict + Sonnet-flagged fixes applied BEFORE any "ship" claim
- Branch discipline: framework work → feature branch + PR; small fixes → main
- `/delegate` before every Agent dispatch

## Don't

- Don't rewrite Phase 1 modules — they're shipped. Wire them in, don't re-build.
- Don't accept Sonnet's "partial" verdict at step 2.7 — apply its fixes inline, then re-run the panel. Only commit once the panel returns 2+ ship verdicts on the patched state.
- Don't commit before QC. The 2026-05-12 process correction makes this a hard rule.
- Don't open a separate PR for QC fixes — fold them into the same commit that ships the phase build.
- Don't expand the slot vocabulary or output_signature coverage as side-quests. F3 + F4 are Phase 2 architectural decisions (Steps 2.3 + 2.4), not Phase-1-rework opportunities.

## Done-when (session)

- [ ] All 11 `/sgs-update` stages run cleanly in one pass + are idempotent (re-run produces no diffs)
- [ ] Drift validator reports zero violations on current codebase OR surfaces real drift
- [ ] `attribute_gap_candidates` populated per gap-detection logic (decides P-S15-F3 + P-S15-F4)
- [ ] `02-SGS-BLOCKS-REFERENCE.md` regen includes "Canonical Vocabulary" appendix (20 + 48 + 19 entries)
- [ ] Phase 2 multi-rater QC panel returns 2+ pass/ship verdicts on the patched state
- [ ] Single clean commit `feat(spec-15-p2): /sgs-update unified pipeline` shipped on origin/main (post-PR-merge)
- [ ] `.claude/state.md` advanced to `spec-15-phase-3-catalogue-extractor-rewire`
- [ ] Handoff written for next session (Phase 3 cold-start)

## Phase 3 preview (after this session)

Phase 3 (~2 hr) rewires `tools/recogniser-v2/extract.py` to read canonical slots from sgs-db, deletes `overrides/hero.py`, retires `fingerprint-builder/`. Hero `--verify-against tests/golden/hero-extraction-baseline.json` is the regression gate before deleting the override.
