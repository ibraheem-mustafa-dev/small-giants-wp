---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-25-step-1.7-g3-slot-list-visual-extension
generated: 2026-05-24
parent_session: small-giants-wp-2026-05-24-bem-canonical-walker-stage4-wiring
primary_goal: "Ship Step 1.7 (G3 slot_list visual extension via property_suffixes) — the highest-leverage move to close the +30% pixel-diff regression on featured-product / ingredients-section. The 2026-05-24 commit (e3cd1a04) landed the data-layer + BEM-canonical walker foundation; this session lifts visual/structural slots (backgroundImage, overlayColour, minHeight, gridTemplateColumns, etc.) into typed attrs on the new richer skeleton."
---

# Next session — Step 1.7 G3 slot_list visual extension + remaining Phase 1 steps

**Invoke `/autopilot` before anything else.**

## STOP — 6 BINDING RULES (mandatory, derived from 2026-05-24 systematic-debugging retrospective)

The previous session shipped Changes 1+2+3'+4+5 + +REGISTER gate to main (`e3cd1a04`). 12 mistakes were caught + corrected during the session via Bean redirects. Those mistakes cluster into 6 themes. The binding rules below prevent each theme from recurring. **Apply ALL six on every proposal, plan, or conclusion in this session.**

### Rule 1 — Comprehensive scope inventory before ANY conclusion

Before proposing, recommending, or concluding ANYTHING: enumerate the FULL set, not a sample.

- For a section/block analysis: read ALL 9 sections of the mockup CSS + every relevant block.json, not just the one in question.
- For a canonical/alias question: read every row in slot_synonyms + every relevant block_attributes row, not just one.
- For a "does this apply to X?" question: list X's full scope and check each member with evidence, not pattern-match a sample.

**Pressure-test question before presenting:** "Did I check the FULL scope or did I sample?" If sampled, go back and enumerate.

**Captured at:** `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_evidence_based_deduction_not_probabilistic.md`.

### Rule 2 — Engineering deduction is MY job, not Bean's

When Bean hints at a pattern ("doesn't X look universal?", "what about Y?"), that's a RESEARCH QUESTION. Go answer it with evidence. Come back with ONE conclusion + file:line citations.

**Banned patterns:**
- "Options (a) / (b) / (c) — pick one" when (a) can be verified by reading 5 files
- "I'd default to (i)" / "probably (b)" — probabilistic phrases without evidence
- Treating Bean's hypothesis as the answer; he asks, I deduce

**Pressure-test question before presenting:** "Could I have answered this myself with 5–15 minutes of file reads / DB queries?" If yes, do it before asking.

### Rule 3 — Data-first audit before code change

Before any walker / converter / pipeline code edit:

1. **Schema enumeration**: `python ~/.claude/hooks/wp-blocks.py dump` (~1500 tokens — shows all 87 tables across 3 DBs).
2. **DB rows for the target**: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT … FROM …"` for every relevant block_attributes / slot_synonyms / block_supports / block_selectors row.
3. **Existing helpers**: grep `db_lookup.py` + `convert.py` for existing functions that already do what you're about to write.
4. **Spec 00 §3 BEM-as-canonical**: if the proposed code change adds a recognition path that isn't via BEM, STOP. It's a side-channel — use the data layer instead.

**Pressure-test question:** "Is this a code change because the data is wrong, or because I'm reaching for code-first thinking?" If data is wrong, fix data.

**Captured at:** `feedback_comprehensive_db_audit_before_data_layer_changes.md` + blub.db row 269 (universal extraction primitive).

### Rule 4 — Write-path audit on every data-layer change

Every DB UPDATE / INSERT / DELETE must be paired with the corresponding seed-script + migration-script updates.

Before applying any DB change:
- Locate the seed script(s) that wrote the original data (`plugins/sgs-blocks/scripts/uimax-tools/seed-*.py`, `plugins/sgs-blocks/scripts/migrations/*.py`)
- Update the seed script in the SAME commit
- `git grep` for the term to find any other duplicate write-back paths

**Pressure-test question:** "Where else does this data get written? Did I update those paths too?" If not, the fix is a re-seeding vulnerability.

### Rule 5 — Comprehensive doc walk on architectural changes

Architectural changes touch 10–15 docs, not 3.

Doc walk = enumerate ALL of:
- `.claude/*.md` (architecture, state, decisions, mistakes, parking, handoff, next-session-prompt, plans/, plan.md, goals.md, cloning-pipeline-flow.md, pipeline-state-debug-artefacts-inventory.md)
- EVERY entry in `.claude/docs-registry.yaml` (29 canonical docs)
- EVERY numbered spec in `.claude/specs/` (25 spec docs)
- Active plans in `.claude/plans/*.md` (7 docs)

Classify each as MUST-UPDATE / LIKELY-AFFECTED / UNAFFECTED, then update the first two tiers.

**Pressure-test question:** "Did I check every doc in the registry + every numbered spec, or did I update the 3 obvious ones?"

### Rule 6 — Grep-verify spec claims before trusting

When a spec declares behaviour ("Stage X runs in /sgs-update", "the converter routes Y through Z", "block_compositions is read at runtime"), grep the orchestrator code to confirm.

```
grep -rn "stage_X\|invokes assign-canonical\|standalone_block" plugins/sgs-blocks/scripts/
```

Drift between spec and implementation is a real failure mode (Spec 16 §12.6 declared Stage 4 ran in /sgs-update; assign-canonical.py was orphaned). Don't trust spec docs as proof of implementation — verify with the code.

**Pressure-test question:** "Did I grep the orchestrator code to confirm this spec claim, or am I trusting the spec text?"

## Mandatory READING (in order, before any code work)

1. `.claude/handoff.md` — 2026-05-24 session summary + systematic-debugging retrospective + 6 binding rules (above)
2. `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — Phase 1 plan + "What ACTUALLY shipped" section + F1+F2 follow-on items at end
3. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — §14.3 (G3 specific gap) + §15 (status update second-pass) + §12.3 (canonical slot vocabulary including new quote row)
4. `.claude/specs/00-naming-conventions.md` §3.1 — BEM-as-canonical recognition rule (NEW)
5. `pipeline-state/mamas-munches-homepage-2026-05-24-122653/` — read `summary.log`, `match.json`, `stage-11-pixel-diff.json`, `convert-trace-b4.jsonl` (featured-product), `convert-trace-b6.jsonl` (ingredients-section), `leftover-buckets.json`
6. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/slot_list.py` — the file to edit for Step 1.7 G3
7. The 5 feedback memory files referenced in `MEMORY.md` index — covers the binding rules' full context

After reading: cite the line numbers + summarise back ≤ 200 words per doc (READING DISCIPLINE from previous session's prompt remains in force).

## Phase 1 remaining steps (priority order)

| Step | What | Why this order | Est |
|---|---|---|---|
| **1.7** | **G3 — slot_list.py visual-slot extension via property_suffixes** | HIGHEST LEVERAGE. Closes the +30% pixel-diff regression on featured-product / ingredients-section. Lifts visual/structural slots (backgroundImage, overlayColour, minHeight, gridTemplateColumns, alignment, ctaPrimaryColour etc.) from CSS into typed attrs on the newly-richer skeleton. | 60–90 min |
| 1.6 | G1 — hero OPEN-block emit (CTAs as InnerBlocks instead of self-closing attrs) | After 1.7. Hero already at FR1 confidence 1.0; this is structural correctness inside the matched block. Scoped narrow to hero only per Bean. | 45–60 min |
| 1.8 | G5 — per-block DOM-shape fixes (parallel across blocks) | Parallelisable across blockquote / testimonial-slider / trust-bar fixes. File-disjoint per block. | 90–120 min |
| 1.9 | Hooks completion (2,049 missing) + role='content' DB sync via /sgs-update Stage 1 | Independent of walker work. Data-only. | 30–45 min |
| 1.10 | Final /qc-council Stage 5 on combined Phase 1 work | Multi-rater verification before Phase 1 close. | 30 min |
| 1.11 | Phase 1 close /handoff | Trigger handoff skill at close. | 20 min |

After Phase 1 closes: Phase 1 follow-on F1 (ARRAY_LIFT_PATTERNS full migration) + F2 (9 remaining NULL canonical_slot array attrs).

## Tool bindings (mandatory)

| Tool | When |
|---|---|
| `/qc-council` | BEFORE every commit touching converter/pipeline/SGS-block (blub.db row 255) |
| `/qc-inline` | Single-file checks during implementation |
| `/sgs-clone --deploy-target page:144 --debug-trace` | AFTER EACH code change (per Binding B — NO --converter-v2 flag needed; it's default since 2026-05-21) |
| `/verify-loop` | 2-attestation per load-bearing claim |
| `/systematic-debugging` | Root-cause investigation before fix proposals (use the 4-phase methodology) |
| `/dispatching-parallel-agents` | Per-block G5 work (Step 1.8) |
| `/subagent-prompt` | Pre-write cold prompts for dispatched implementers |
| `/capture-lesson` | New architectural rules surfaced |
| `/handoff` | Phase 1 close (Step 1.11) |
| Playwright MCP | Stage 11 + live-page DOM verification for G1 (CTAs present in `header.sgs-hero`) |
| `python ~/.claude/hooks/wp-blocks.py dump` | **MANDATORY before any "missing X" claim or "needs new column/table" proposal** |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | DB queries |

## Dispatch bindings (MANDATORY — per `feedback_dispatched_agents_no_commit_authority.md`)

Embed all four in every Agent cold prompt:
- **A — NO commit authority.** Agent returns uncommitted artefacts.
- **B — `/sgs-clone` per sub-change (NOT bundled).** Stage 11 auto-captures.
- **C — Living-docs + /capture-lesson inline per change.** Update mistakes / decisions / parking / cloning-pipeline-flow / architecture as the work fires.
- **D — TodoWrite breakdown + per-sub-task status.**

## Phase 1 success criteria for Step 1.7 (G3 closure)

- [ ] `slot_list.py` extended to read visual/structural slots via `property_suffixes` table (`backgroundImage`, `overlayColour`, `minHeight`, `gridTemplateColumns`, `alignment`, `padding*`, `margin*`, etc.)
- [ ] Hero `stage_3_slot_list` failures drop from 142 to under 30 (per Spec 16 §15 numeric acceptance)
- [ ] Featured-product / ingredients-section / social-proof Stage 11 pixel-diff drops measurably from 73.6% / 62.0% / 94.8% respectively (no required numeric threshold; just measurable improvement)
- [ ] No regression on FR1 sections (hero / trust-bar stay at confidence 1.0)
- [ ] /qc-council Stage 5 on the Step 1.7 commit passes

## Pre-Step-1.7 baseline (compare against post-Step-1.7)

From `pipeline-state/mamas-munches-homepage-2026-05-24-122653/stage-11-pixel-diff.json`:

| Section | Pixel-diff (post-2026-05-24-commit, this is the new baseline) |
|---|---|
| header (chrome-skipped) | 44.9% |
| hero | 73.3% |
| trust-bar | 79.8% |
| featured-product | 73.6% (regressed from 43.7% baseline — CSS-lift gap on new richer skeleton) |
| brand | 66.3% |
| ingredients-section | 62.0% (regressed from 31.9% — same CSS-lift gap) |
| gift-section | 81.0% |
| social-proof | 94.8% (slight increase) |
| footer | 96.3% |
| **mean** | **73.9%** |

Step 1.7 should drop featured-product / ingredients-section / social-proof by 10–25 percentage points each.

## Where to look when something feels off

| Symptom | First read | Then |
|---|---|---|
| Universal walker regresses an FR1 section | `pipeline-state/<run>/match.json` per-boundary — hero/trust-bar should stay at conf 1.0 | If dropped, code change touched Stage 2 incorrectly |
| /sgs-clone reports OK but live page didn't update | `pipeline-state/<run>/stage-10.json` exit code | If 4/5/6 → known halt path; if "OK" but stale, verify deploy target page-id is 144 (not 131 which is deleted) |
| Slot_list extension breaks existing text extraction | `convert-trace-b*.jsonl` per boundary — `stage_3_slot_list` events | Should still resolve text slots correctly; visual slots should now ALSO resolve |
| canonical_slot is NULL on an attr you expected populated | Run `python plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` manually | Stage 1 tail wires it but immediate one-off ensures the latest state |

## First action

After reading discipline (Tier 1 docs above), do not skip Rule 3 (Data-first audit). Before touching slot_list.py:

1. `python ~/.claude/hooks/wp-blocks.py dump` (schema enumeration)
2. `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, canonical_slot, role, derived_selector, output_signature FROM block_attributes WHERE block_slug='sgs/hero' AND canonical_slot IS NOT NULL LIMIT 30"`
3. Read `convert.py:_lift_styling_attrs` (existing helper that lifts visual styling) + `slot_list.py` (current text-content slot resolver) — find the structural difference
4. Surface findings + ONE proposed approach to Bean (per Rule 2: no options for him to pick; deduce the conclusion + cite evidence)

Then dispatch implementer subagent with full cold prompt + bindings A–D + 6 binding rules embedded.
