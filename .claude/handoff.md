---
doc_type: handoff
project: small-giants-wp
session_tag: small-giants-wp-2026-05-12-spec-15-phase-3.5
session_date: 2026-05-12
recommended_model: sonnet
---

# Session Handoff — 2026-05-12 (Spec 15 Phase 2 + 3 + 3.5)

## Completed This Session

1. **Spec 15 Phase 2 shipped** (`59f8b527`) — `/sgs-update` Stages 3+4 wired (behavioural analyser + canonical assignment in `update-db.py`), Stage 9 drift-validator + Stage 10 gap-detection built at `plugins/sgs-blocks/scripts/drift-validator/validate.py` + `gap-detection/detect.py`. Canonical Vocabulary appendix added to `02-SGS-BLOCKS-REFERENCE.md`. 3-rater QC panel BEFORE commit. DB fingerprint stable across 3 idempotent runs.
2. **Spec 15 docs corrections** (`6c8cac6c`) — `/ui-ux-pro-max` named as primary draft-design skill (not `/innovative-design`). Phase 4 step 4.5 split into 4.5a + 4.5b. Spec 14 phase plans archived to `.claude/plans/archive/spec-14-superseded-by-spec-15/`.
3. **Spec 15 Phase 3 shipped** (`0c3409f4`) — `extract.py` rewired to query sgs-db `block_attributes` for canonical_slot/role/derived_selector. JSON→sgs-db backfill (1087 rows). Hero override deletion DEFERRED. Fingerprint-builder retired. Drift validator + gap-detection extended. `assign-canonical` row-select tightened to all-three-NULL for incremental safety. 13 property_suffixes + 96 instance-data flagged.
4. **Phase 3.5 coverage + drift remediation** (`b0cfa3c1`, `c24a3570`, `0abf89e7`) — Two 5-way parallel subagent dispatches. B1+B3 (Gemini Flash) hallucinated reports — redone inline. B5 caught a real parents[3]→parents[4] path bug. Drift selector check relaxed to accept `.sgs-` OR `.wp-block-sgs-`. Tight-vocab rule applied: 18 cross-cutting slots accepted, show*/payment*/security* collapsed to `options`. Modifier check refined twice.
5. **Phase 3.5 long-tail fanout** (`eb1c3adb`) — 5 Sonnet subagents classified 506 attrs across 57 blocks. 28 new property_suffixes for compound-attr trailing tokens. buttonSecondary kept as canonical per Bean correction. 5 reports at `.claude/reports/phase-3.5-fanout-a1..a5.md`.
6. **css-var-bridge applied to mobile-nav** (`b09dd917`) — 46 mobile-nav rows tagged `css-var-bridge` role (covers `$css_vars[]` indirection). Original roles backed up. Spec 15 §6.1 documents the role. Phase 4 plan extended with 4.6a (long-tail close, target 37→≤10) + 4.6b (lint-feedback retro-canonicalisation).
7. **QC-inline run** — 10 scenarios, 10/10 PASS, confidence 100/100. Injection sanity confirms drift validator catches real drift AND ignores compound nouns. Hero baseline byte-identical to HEAD.

## Current State

- **Branch:** main at `b09dd917`
- **Tests:** drift-validator PASS (0 violations / 1343 attrs); hero `--verify-against` PASS
- **Build:** n/a (verified via drift validator + hero baseline)
- **Uncommitted changes:** none
- **DB state:** 1210 / 1343 canonicalised (90.1%); gap canonicalisable 37; slots 74; property_suffixes 99; roles 21

## Known Issues / Blockers

- **Hero override deletion still deferred** — 35-attr standalone regression on content-identity attrs (label/variant/splitImage/headlineColour/subHeadline*). Re-attempt after Phase 4 lints + further vocab expansion.
- **37 long-tail gap candidates** — exotic per-block attrs (splitColumnRatio, submenuIndent, formFocusRing*). Tracked in Phase 4 step 4.6a.

## Next Priorities (in order)

1. **Phase 4 step 4.1–4.3** — Build `bem-lint.py` + `token-lint.py`; wire into `/sgs-clone` Stage 0 with `--strict`/`--draft-mode`/`--legacy` modes (~80 min).
2. **Phase 4 step 4.4** — Pre-commit hook firing Stage 0.1 + 0.5 on `sites/*/mockups/` changes (~15 min).
3. **Phase 4 step 4.5a + 4.5b** — Update `/ui-ux-pro-max` (primary draft-design) + `/innovative-design` (router) SKILL.md (~25 min).
4. **Phase 4 step 4.6a** — Walk 37 long-tail gaps; canonicalise or flag instance-data. Target 37→≤10 (~30 min).
5. **Phase 4 step 4.6b** — Lint-feedback retro-canonicalisation on Mama's mockup (~15 min).

## Files Modified

| File path | What changed |
|---|---|
| `plugins/sgs-blocks/scripts/gap-detection/apply-css-var-bridge.py` | NEW — applies css-var-bridge role to 46 mobile-nav indirection rows |
| `plugins/sgs-blocks/scripts/gap-detection/css-var-bridge-backup.json` | NEW — backup of original roles before css-var-bridge apply |
| `.claude/plans/spec-15-master-execution-plan.md` | Phase 4 extended: 4.6a long-tail close + 4.6b lint-feedback retro |
| `.claude/specs/15-DETERMINISTIC-DRAFT-TO-SGS-CONVERTER.md` | §6.1 documents css-var-bridge role |
| `.claude/state.md` | phase_3_5_summary captures 46-row apply + Phase 4 extension |
| (8 commits total this session — see git log) | See "Completed This Session" |

## Notes for Next Session

- **Tight-vocab rule** — when proposing new slot_synonyms, collapse single-feature toggles to `options` unless cross-cutting (3+ blocks).
- **Drift validator modifier check** — only flags trailing CamelCase when stripping it leaves the canonical_slot. Distinguishes missing suffix from compound noun (`phoneNumber` NOT flagged; `paddingFoozle` IS flagged).
- **css-var-bridge role** — when extract.py extends to mobile-nav, use `value_extractor: computed_var_value` (reads `--sgs-mn-*` declaration), not `computed_color`/`computed_px_int`. CSS-variable name encodes the value type.
- **Spec §11 amended** — slot vocab spans content-identity + layout + state + motion. No longer content-identity-only.
- **assign-canonical row-select is locked** — `WHERE canonical_slot IS NULL AND role IS NULL AND derived_selector IS NULL`. Do not loosen without backup; would overwrite JSON-sourced finer roles.
- **buttonSecondary stays canonical** — Bean correction mid-session. Do not recreate `secondaryCta` as a separate slot.

## Next Session Prompt

~~~
You are a senior WordPress block developer specialising in the SGS Framework, Gutenberg blocks, and Spec 15's deterministic draft-to-SGS converter. This session continues Phase 4 (draft convention enforcement + long-tail close).

## Where You Are

Plan: `.claude/plans/spec-15-master-execution-plan.md`
Current phase: Phase 4 — Draft convention enforcement + long-tail close
Progress: Phase 1, 2, 3, 3.5 shipped — ~50% of Spec 15 milestones
Next task: Phase 4 step 4.1 — Implement Stage 0.1 BEM lint at `plugins/sgs-blocks/scripts/lints/bem-lint.py`

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-12-spec-15-phase-3.5"

Read `.claude/handoff.md` and `.claude/CLAUDE.md` for full context. Living plan at `.claude/plans/spec-15-master-execution-plan.md` §Phase 4.

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | Design-mode for BEM regex edge cases + token-snap policy decisions |
| `/gap-analysis` | Grade lint scripts + final Phase 4 deliverables before commit |
| `/lifecycle` | Required gate for step 4.5a/b SKILL.md edits |
| `/research` | Auto-routes; pick `/research-check` for quick lookups (e.g. git-hooks patterns) |
| `/strategic-plan` | Confirm Phase 4 step ordering before writing code |
| `/sgs-wp-engine` | SGS Framework operations + QA pipeline |
| `/wp-block-development` | If any block work surfaces during long-tail close |
| `/qc-inline` | Per-step /qc-inline checks per Phase 4 plan |
| `/handoff` | End-of-session handoff generation |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` MCP | Render Mama's mockup + capture lint output for steps 4.6 + 4.6b |
| Python sqlite3 | DB queries against sgs-framework.db for long-tail close (step 4.6a) |
| Git CLI | Per-step commits direct to main per always-merge-to-main rule |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | Block PHP/JS work during long-tail close if surfaced |
| 3-rater QC panel (Sonnet + Haiku + Gemini Flash) | Step 4.7 — BEFORE commit per qc-before-commit rule |

## Research Approach

Phase 4 work is mostly mechanical lint + DB work. Skip research unless pre-commit hook implementation hits an unfamiliar git-hooks pattern — then `/research-check` for a quick lookup.

---

## Task 1: Phase 4 step 4.1 — BEM lint

Build `plugins/sgs-blocks/scripts/lints/bem-lint.py`. Validate every HTML class against Spec 13 regex (`^\.sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$`). Report violations with line numbers. /qc-inline: compliant Mama's mockup expect 0 violations; deliberately-malformed `.hero-copy` expect 1; mixed file expect violations only on bad classes.

## Task 2: Phase 4 step 4.2 — Token-usage lint

Build `plugins/sgs-blocks/scripts/lints/token-lint.py`. Reads CSS values; calls the Phase 1 value-matcher; flags un-snappable values as gap candidates. /qc-inline: 5 inputs (3 palette colours, 1 arbitrary hex, 1 non-token spacing).

## Task 3: Phase 4 step 4.3–4.4 — Wire + pre-commit hook

Wire both lints into `/sgs-clone` Stage 0 with three modes (strict / draft-mode / legacy). Add `.git/hooks/pre-commit` firing on `sites/*/mockups/` changes.

## Task 4: Phase 4 step 4.5a + 4.5b — Skill updates

Update `~/.agents/skills/ui-ux-pro-max/SKILL.md` (primary draft-design — hard rule for SGS-BEM + theme.json tokens) and `~/.claude/skills/innovative-design/SKILL.md` (router — propagate to dispatch targets). Reference Spec 15 §3 + §8. Gate via `/lifecycle`.

## Task 5: Phase 4 step 4.6a + 4.6b — Long-tail close + lint retro

Walk 37 residual gap candidates. Canonicalise (existing or one new slot) OR flag `instance-data-not-canonicalisable`. Target queue 37→≤10. Then run BEM + token lints on Mama's mockup; cross-reference gap-candidate flags against `attribute_gap_candidates`; canonicalise matches. Report delta.

## Guardrails

- Drift validator must stay PASS after every step (`python plugins/sgs-blocks/scripts/drift-validator/validate.py`).
- Hero `--verify-against tests/golden/hero-extraction-baseline.json` must stay PASS.
- assign-canonical row-select is locked to (canonical_slot IS NULL AND role IS NULL AND derived_selector IS NULL) — do not loosen.
- buttonSecondary stays canonical; do not recreate `secondaryCta` as a separate slot.
- 3-rater QC panel BEFORE commit per qc-before-commit rule.
- Direct commits to main per always-merge-to-main rule.
~~~
