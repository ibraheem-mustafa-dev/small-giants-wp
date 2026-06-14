---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-14
---

# Session Handoff — 2026-06-14 (cloning thread)

## Completed This Session
1. **4 converter fixes SHIPPED to `main`** (commit `a8bf5616`, path-scoped, each with a fire-proof lock-in test, both conformance suites green 84/84): **GF-B.2** selector-scope matcher (`convert.py:619-622` — class-branch now respects descendant-combinator ancestor scope, no cross-section CSS bleed; compound `.A.B` edge preserved); **H-C1** per-slot max-width (`convert.py:2399` via `attr_for_area_property`, around the `_area_excluded` guard, widthMode untouched); **IN-B** general `_resolve_co_declared_var` (`convert.py:384`, flag-not-drop); **gridItem\*** uniform per-item CSS (`_lift_uniform_grid_item_css` `:2734`, wired top-level `:4414` + nested `:5574`, R-22-9 universal).
2. **Testimonial styling bridge** committed (`32e73f44`) — 5 styling attrs get draft-class multi-aliases; golden +`nameColour=#5c4f46`.
3. **3 Spec-22 "gaps" DEFERRED** by verify-first as design-gate PHASES (NOT built): array→child wiring (FR-22-2.5), draft breakpoints (FR-22-5.2), D1 sidecar.
4. **nameFontWeight hardcode REVERTED** (`d62d0d2f`) — Bean rejected hardcoded selectors; zero hardcoded `nameFontWeight` selector across all 3 channels. Still transfers for the fixture via the generic `typography_css_to_attrs()` path.
5. **Routing-redesign exploration RETIRED + unified element-pass council NO-GO** (D224) — code analysis proved the routing was already BUILT; both dead-end specs deleted, reasoning preserved in D224.
6. **Spec-22 built_status TRUTH-SYNC** (`ee0f572e`) — stale labels corrected with code-verified file:line (FR-22-5.1/5.3 mislabelled PLANNED but BUILT; gridItem* shipped; FR-22-20 data-not-code; FR-22-5.2/2.5 design-gate; FR-22-9 absent).
7. **Lesson captured** (blub.db 353, 3 layers): read the implementing script before proposing/critiquing any converter mechanism — never trust spec `built_status:` labels or attr/column names.
8. **Architecture decision (D225):** selector-seeding should be block.json-declared + auto-seeded, not hardcoded in `/sgs-update` (parked P-BLOCKJSON-SELECTOR-AUTOSEED, top next task).

## Current State
- **Branch:** `main` at `ee0f572e` (pushed; origin in sync 0/0).
- **Tests:** 84 pass, 0 fail (Gate A golden harness + `converter_v2/tests/`).
- **Build:** conformance green; converter fixes NOT live-verified (Bean deploys).
- **Uncommitted changes:** none of this session's work (only pre-existing non-mine `reports/phase4-*.txt` + a gap-analysis report remain untracked).

## Known Issues / Blockers
- The 4 converter fixes are CODE SHIPPED, OUTCOME NOT YET HIT — they pass conformance (no-regression) but are **not live-verified on canary page 8**. Closing the ledger rows requires Bean's deploy + live computed-style check.
- `nameFontWeight` won't transfer via the scalar-lift path on a clean reseed (hardcode reverted) until the block.json auto-seed is built (still works for the conformance fixture via the typography path).
- `border` shorthand has no `property_suffixes` row → `gridItemBorder` not lifted from a shorthand (DB-data follow-up).

## Next Priorities (in order)
1. **block.json-declared selector auto-seed** (P-BLOCKJSON-SELECTOR-AUTOSEED) — design-gate + `/adversarial-council`, then build. The proper fix for the hardcoded-selector smell.
2. **Bean: deploy + live-verify** the 4 shipped converter fixes on canary page 8.
3. **The 3 deferred design-gate phases** — array→child, draft breakpoints, D1 sidecar — each a design session before build.
4. **IN-E** emit-gate widen — after the live-probe confirms it's a real defect.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | GF-B.2 matcher + H-C1 max-width + IN-B var-resolver + gridItem* writer |
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/tests/` | 3 new lock-in test files |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | removed hardcoded `nameFontWeight` selector |
| `tools/recogniser/data/fingerprints.json` + the 2026-06-13 migration | removed dead `nameFontWeight` copies |
| `.claude/specs/22-…EXTRACTION.md` | built_status truth-sync (8 FRs, file:line) |
| `.claude/decisions.md` · `CLAUDE.md` · `parking.md` · `state.md` | D224 + D225; pointer → D225; 2 parking entries; cloning block |

## Notes for Next Session
- **Hardcoded-selector root cause:** `assign-canonical.py:485` is `WHERE canonical_slot IS NULL` — so assign-canonical AND fingerprints both skip `canonical_slot`-populated rows; the only channel reaching the 5 testimonial styling attrs was the hardcoded override dict. The auto-seed fix must reach canonical_slot-populated rows.
- **Verify-first paid off:** of the 4 "Spec-22 gaps", only gridItem* was a clean build; the other 3 were bigger-than-labelled phases. Apply verify-first to any "gap" — labels lie.
- **The block.json-auto-seed is Rule-7** (every block's selector seeding) — design-gate before build.

## Next Session Prompt
See `.claude/next-session-prompt.md` — the operative opener (7 rules, methodology guardrails, pre-flight ritual, orchestration plan).
