---
doc_type: next-session-prompt
project: small-giants-wp
last_updated: 2026-05-12
recommended_model_next: opus (architectural judgement at phase boundaries; per-step dispatch to Sonnet / Cerebras / Gemini Flash per the execution plan)
---

# Next Session — Spec 15 Phase 1 (Foundation)

Spec 15 ratified and migrated. Specs 12 / 13 / 14 absorbed into `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` (originals at `.claude/scratch/absorbed/`).

This session executes **Spec 15 Phase 1 — Foundation** (~6 hr): three new vocabulary tables, `block_attributes` extension, behavioural static analyser, token value-matcher, default-inheritance lookup.

## Invoke first

`/autopilot` — establishes routing + ADHD support for the whole session.

## Cold-start reads (~10 min)

1. **`.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md`** — full architecture spec. Focus on §3 (convention rules), §5 (mapping layer / rosetta stone), §11 (phase plan), §12E (asset inventory + lifecycle).
2. **`.claude/plans/spec-15-master-execution-plan.md`** — phase-by-phase build plan with model assignments + subagent prompt templates.
3. **`.claude/state.md`** — current_phase = `spec-15-phase-1-foundation`.

## What's already shipped (context — don't redo)

- Spec 14 P1 doc reconciliation + 9 static-block snapshots + FR18 decisions (commit `f467bc72`)
- Spec 14 P2 uimax schema migrations + recursion-guard module (commit `15f4d6cf`)
- Spec 14 P3 4-layer catalogue (commits `e0f26ec5` + `10819cbb` + `833fed21`)
- Spec 14 P4 extract.py refactor + hero override (commit `8e2e427a`)
- Spec 15 ratified v0.2 with multi-rater QC + 6 Bean decisions locked + 4 post-QC fixes applied (commits this session)
- Spec migration: 12/13/14 + master-spec14-build-plan.md → `.claude/scratch/absorbed/`
- Asset inventory + lifecycle of every relevant file added to Spec 15 §12E

## Phase 1 — step-by-step

Per the master plan §Phase 1. Steps 1.1 through 1.9. Each step has a model assignment + estimated time + ready-to-dispatch subagent prompt template (in the master plan).

| Step | Description | Model | Time |
|---|---|---|---:|
| 1.1 | DB schema migration — 3 CREATE TABLE + 6 ALTER COLUMN | Cerebras | 15 min |
| 1.2 | Seed vocab tables (20 + 32 + 16 rows) | Cerebras | 15 min |
| 1.3 | Static analyser (render.php + save.js parser → output_signature) | Sonnet | 60 min |
| 1.4 | Backfill canonical_slot + role + derived_selector for 1343 attrs | Sonnet | 30 min |
| 1.5 | Token value-matcher (ΔE2000 + spacing/font) | Sonnet | 45 min |
| 1.6 | Default-inheritance lookup against theme.json styles.* | Sonnet | 30 min |
| 1.7 | Unit tests for 1.3 / 1.4 / 1.5 / 1.6 | Sonnet | 30 min |
| 1.8 | Commit + push (branch `feat/spec-15-p1-foundation`) | Inline | 5 min |
| 1.9 | Phase 1 QC — multi-rater panel (Haiku + Sonnet + Gemini Flash) | Gemini Flash + Inline | 15 min |

Use `/delegate` before each dispatch.

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | First — routing + ADHD support |
| `/delegate` | Before every Agent dispatch — returns model + fallback chain |
| `/subagent-prompt` | Pre-write cold prompts when complex dispatches needed |
| `/sgs-db` | Inspect sgs-framework.db during steps 1.1-1.4 |
| `/wp-blocks` | Query block.json schemas during step 1.3 |
| `/uimax` | Query uimax design_tokens / animations / naming_conventions |
| `/qc` | Phase 1 QC at step 1.9 (multi-rater panel) |
| `/handoff` | Session close |

## Tooling reference

| Tool | Purpose |
|---|---|
| Python 3.13 + sqlite3 stdlib | DB migrations + queries |
| `colormath` library | ΔE2000 colour-distance calc (`pip install colormath`) |
| BeautifulSoup | render.php parsing in static analyser |
| Playwright | Default-inheritance verification |
| Pytest | Unit tests at step 1.7 |
| `gh pr create` | Phase 1 feature-branch PR |

## Hard constraints (always)

- UK English in code + comments + docs
- No emojis unless asked
- No mocking in tests
- No `--resume` flags in pipelines (per blub.db lesson)
- No em-dashes in pipeline output
- Per-rater QC verdict before any "ship" claim
- Branch discipline: framework work → feature branch + PR; small fixes → main
- `/delegate` before every Agent dispatch

## Don't

- Don't rewrite Spec 15 — it's APPROVED. Use it as-is.
- Don't re-derive selectors from convention guesses — Phase 1 populates the DB authoritatively from static analysis.
- Don't delete `tools/recogniser/data/fingerprints.json` — it's Phase 1's seed data (DATA-SOURCE per spec §12E inventory).
- Don't delete `overrides/hero.py` yet — Phase 3 territory, only after canonical-slot data validates against the regression baseline.
- Don't merge to main without Phase QC panel ship verdict.

## Done-when (session)

- [ ] Phase 1 commit `feat(spec-15-p1): foundation — vocabulary tables + behavioural analyser` shipped on origin/main (after PR merge)
- [ ] Multi-rater QC panel returns pass/ship verdict
- [ ] `block_attributes` has 6 new columns populated for all 1343 rows
- [ ] 3 new vocab tables exist + seeded (slot_synonyms 20, property_suffixes 32, modifier_suffixes 16)
- [ ] Token value-matcher + default-inheritance lookup self-tests green
- [ ] `.claude/state.md` advanced to `spec-15-phase-2-sgs-update-unified`
- [ ] Handoff written for next session (Phase 2 cold-start)
