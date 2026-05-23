---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-24-structural-g1-g5
generated: 2026-05-23
parent_session: small-giants-wp-2026-05-23-architecture-cleanup
primary_goal: "Implement the G1-G5 structural converter gaps (the actual pixel-diff lever). 2026-05-23 shipped 9 commits of architectural cleanup with ZERO pixel-diff movement — verified empirically. G1-G5 is the dominant cause."
---

# Next session — Structural G1-G5 implementation

Invoke `/autopilot` before anything else.

## State recap (plain English)

**2026-05-23 shipped 9 commits but moved pixel-diff numbers by 0%.** Architectural debt is cleared:
- Stage 10 silent-failure fixed — no more "patched OK" against deleted pages
- Stage 11 added — every run auto-captures per-section pixel-diff numbers
- core/group → sgs/container fallback corrected (Decision 3 alignment + sentinel decoupled)
- Hand-authored brand + ingredients-section patterns deleted (deterministic-only rule)
- Stage 0.7 CSS output relocated to `pipeline-state/<run>/variation-d0-d2.css` (Phase 5a CSS half completed)
- All main .claude docs + numbered specs + /sgs-clone skill refreshed
- 4 new parking entries logged

**Canonical pixel-diff baseline** (verified post all 2026-05-23 commits, run `mamas-munches-homepage-2026-05-23-145045`):

| Section | Mean | 375 / 768 / 1440 |
|---|---|---|
| ingredients-section | 31.9% | 42.4 / 28.1 / 25.1 |
| featured-product | 43.7% | 24.3 / 29.1 / 77.8 |
| header | 44.9% | 25.4 / 82.5 / 26.7 |
| hero | 73.3% | 86.6 / 63.9 / 69.4 |
| gift-section | 83.0% | 70.3 / 88.6 / 90.1 |
| brand | 84.0% | 90.2 / 78.5 / 83.4 |
| trust-bar | 84.1% | 99.9 / 52.4 / 100.0 |
| social-proof | 93.4% | 80.3 / 100.0 / 100.0 |
| footer | 96.3% | 93.6 / 96.8 / 98.7 |
| **MEAN** | **70.5%** | |

These are the canonical numbers as of 2026-05-23 end-of-session — every `/sgs-clone --deploy-target page:144` run regenerates them in `pipeline-state/<run>/stage-11-pixel-diff.json`.

## Where the leverage IS (per honest-path council 2026-05-20)

The dominant pixel-diff causes are the **5 structural gaps** captured in `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` + Spec 16 §15. Per `cloning-pipeline-flow.md:1603` binding statement:

> *"The G1+G3+G5 symptoms (empty hero CTAs / text-only slot resolver / per-block DOM mismatches) are all manifestations of one underlying gap: cv2 doesn't walk all classes + assign CSS ownership + record parent-child relations using the tables that exist."*

**Wave 2 reshape = ONE architectural change wiring the DB tables into the walker's emit shape, NOT three per-block fixes.**

## Skills to invoke

| Skill | When |
|---|---|
| `/autopilot` | FIRST — establishes live skill routing |
| `/systematic-debugging` | Root-cause investigation before any code change |
| `/qc-council` | Before EVERY commit touching converter/pipeline (blub.db row 255) |
| `/verify-loop` | 2-attestation rule for every load-bearing claim (Bean directive 2026-05-23) |
| `/dispatching-parallel-agents` | Independent file scopes only |
| `/subagent-driven-development` | Per-step implementer + reviewer |
| `/sgs-clone` | After every commit — measure Stage 11 numbers + compare |
| `/sgs-wp-engine` | Block-level questions during composition |
| `/handoff` | Session close |
| `/capture-lesson` | New architectural rules surfaced |

## MCP servers + tools

| Tool | What for |
|---|---|
| Playwright MCP | Stage 11 auto-uses pixel-diff.py via Playwright |
| WP-CLI over SSH | Sandybrown introspection |
| `python ~/.claude/hooks/wp-blocks.py dump` | Schema enumeration BEFORE "missing X" claim (row 272) |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB query CLI |
| `scripts/pixel-diff.py` | Standalone diff (also auto-invoked at Stage 11) |

## Methodology guardrails (HARD GATES)

1. **Read `pipeline-state/<run>/leftover-buckets.json` + `summary.log` + `trace.jsonl` BEFORE conjecturing** (blub.db row 254). 2026-05-23 biggest insight came from trace.jsonl reading.
2. **Multi-model `/qc-council` BEFORE every commit** touching converter / pipeline / SGS-block (row 255).
3. **Per-section cropped pixel-diff** via `--selector .sgs-{section}`, NEVER full-page (row 256). Stage 11 already does this.
4. **Schema enumeration** via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any "missing X" claim (row 272). A subagent on 2026-05-23 fabricated `block_conventions` + `convention_mappings` tables — verify-loop caught it.
5. **Universal extraction only** — NO per-block legacy fixes (row 269). G1+G3+G5 dissolve simultaneously when the universal walker primitive is wired.
6. **Verify WP API surface** before dismissing intelephense warnings (row 283).
7. **Fact-check via independent attestation** — every load-bearing claim needs 2 sources (Bean trust-calibration 2026-05-23). Demand SQL/grep evidence inline in subagent prompts.
8. **Pipeline test throughout all waves** — Stage 11 now does this automatically on every `--deploy-target` run.

## Task 1 — G1+G3+G5 universal-extraction wiring (~2-3 hrs, THE lever)

**What:** Implement Spec 16 §15 Wave 2 reshape. The walker must:
1. Walk every CSS class encountered in each section
2. Assign CSS ownership per class (every rule targeting that class via direct/descendant/parent-qualified selectors)
3. Record parent-child relations between classes via natural BEM relations + `blocks.parent_block` (NOT block_compositions — WRITE-ONLY)
4. Use the parent-child graph to drive nested-block emission shape

**Files:**
- Primary: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (walker entry + emit shape)
- Companion: `plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py` (query property_suffixes for visual slots, not just text)

**Numeric acceptance criterion (per Spec 16 §15):**
- Hero `stage_3_slot_list` failures drop from 142 to under 30
- Hero `variation_css_rules` rises from 0 to at least 8
- Brand pixel-diff at 1440 drops below 20% (from 83.4%)

**Process:**
- Read Spec 16 §15 in FULL (Bean: no skim)
- `wp-sgs-developer` agent with the full spec + this prompt + all 8 methodology guardrails embedded
- `/qc-council` BEFORE commit
- `/sgs-clone --deploy-target page:144` after commit to capture impact via Stage 11

## Task 2 — G2 + G4 verification post Task 1 (~30 min)

G2 + G4 were FALSIFIED 2026-05-20 (implemented exactly to spec, 0% pixel-diff movement). With G1+G3+G5 landing, verify whether G2/G4 symptoms are still present or swept up. Read leftover-buckets.json after Task 1 for any G2/G4-shaped entries.

## Task 3 — Investigation residuals from 2026-05-23 (~45 min)

**Q1B follow-up — pattern quality gate (optional, high-value):**
1% gate exists for PIPELINE success, NOT individual pattern registration. To enforce "only register patterns that pass 1% pixel-diff", add post-Stage-11 gate to `+REGISTER` in `register_patterns.py` reading `stage-11-pixel-diff.json`.

**Q1A residual — DB-driven fallback (optional polish):**
2026-05-23 Q1A patch hardcoded the fallback to `sgs/container`. A purer version: `SELECT sgs_slug FROM legacy_role_lookup WHERE kebab_role = 'core/group'` so future edits go via DB row. Low priority.

**Q3 residual — `theme/sgs-theme/styles/mamas-munches.css` cleanup:**
Pre-existing file at `theme/sgs-theme/styles/mamas-munches.css` (parking entry P-5A-MAMAS-MUNCHES-CSS) was NOT touched by Q3. Delete now that Q3 shipped, OR park as follow-up.

## Task 4 — Hardcoding purge (multi-session)

| Site | Current | Target |
|---|---|---|
| `convert.py:3591` `VARIANT_MODIFIERS` | hero-specific BEM dict | Move to `block_attributes` enum_values on sgs/hero |
| `convert.py:923` `elif slug == "sgs/button"` | per-block extraction | DB-driven via block_attributes.derived_selector |
| `convert.py:1550` `elif slug == "sgs/info-box"` | per-block media detection | DB-driven derived_selector + media-type heuristic |
| `lingua_franca.py:55` `_SGS_BLOCKS` set | hardcoded list | Query `blocks WHERE source='sgs' AND status='built'` |
| `lingua_franca.py:69-156` 5 convention dicts | _BEM_BARE, _TAILWIND_UTILITY, _BOOTSTRAP, _SHADCN, _KEBAB_SEMANTIC | Requires NEW DB tables (uimax `naming_conventions` exists 16 rows — may need extension) |
| `per-section-convention-voter.py:152` `RETIRED_BLOCK_REMAP` | legacy slug→replacement | Move to `blocks.replaces` column (exists) |

**Note (verify-loop falsified 2026-05-23):** `block_conventions` + `convention_mappings` tables in sgs-framework.db DO NOT EXIST. Earlier subagent claim was fabrication. Creating these tables would need to be a separate explicit step before lingua_franca.py can move to DB-driven.

## Task 5 — Wave 2C tidy (~15 min)

Wave 2C subagent 2026-05-23 transcript was truncated. /sgs-clone SKILL.md edit landed (system-reminder confirmed). `references/pipeline-stages.md` + `references/router-pattern.md` may have been pending. Open them, verify current, fix anything stale.

## Dependency graph

```
Task 1 — G1+G3+G5 wiring (THE lever)
  ↓ + /qc-council + /sgs-clone measurement
Task 2 — G2/G4 verification
  ↓
Task 3 — Investigation residuals
  ↓
Task 4 — Hardcoding purge (separate session(s))
  ↓
Task 5 — Wave 2C tidy
```

## Reference docs

- `.claude/handoff.md` — 2026-05-23 session summary
- `.claude/parking.md` — live state, ~20 STILL OPEN
- `.claude/state.md` — current phase + blockers
- `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15 — Wave 2 reshape (UPDATED 2026-05-23)
- `.claude/cloning-pipeline-flow.md` — pipeline flow with new Stage 11 block
- `.claude/decisions.md` D41-D45 — 2026-05-23 decisions
- `.claude/mistakes.md` — 3 new lessons 2026-05-23
- `reports/2026-05-20-pipeline-root-gap-council/real-path-synthesis.md` — G1-G5 diagnosis
- `pipeline-state/mamas-munches-homepage-2026-05-23-145045/` — canonical pre-G1-G5 baseline
- `pipeline-state/mamas-munches-homepage-2026-05-23-145045/stage-11-pixel-diff.json` — empirical reference

## Read FIRST (per ADHD Rule 1)

1. This file (you're reading it)
2. `.claude/handoff.md`
3. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` §15
4. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/trace.jsonl` (tail 50 lines)
5. `pipeline-state/mamas-munches-homepage-2026-05-23-145045/leftover-buckets.json`

Then smallest-first-action per Rule 2.
