---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-13
---

# Session Handoff — 2026-06-13 (cloning thread, D223)

## Completed This Session
1. **Redesigned the de-literalisation programme** after Bean's correction: the per-block `if slug==` branches are a SYMPTOM of the universal mechanism never being taught child-element typography/colour CSS. Two `/adversarial-council` rounds — #1 NO-GO'd a mechanism that would have silently DROPPED child CSS on every clone; #2 GO'd a hard-trimmed shape.
2. **Shipped the universal child-CSS styling-lift** (commit `c1543df5`): new SIBLING `_lift_styling_attrs_by_selector` (capability-gated `scalar-styling-lift`, `sgs/testimonial` only) lifts child typography/colour by `derived_selector`. Verified: lift values exact-match the fixture draft CSS; golden regen faithful (nothing dropped); BOTH conformance suites green (43+26) after a FULL `/sgs-update` reseed; classifications + capability survive reseed.
3. **Removed 6 dead `core/*` handlers** from `_atomic_attrs_for` (unreachable — `atomic_tag_map()` resolves every tag to sgs/* via `blocks.replaces`; Bean's "why core" catch; conformance proves it).
4. **FR-22-3 slug-literal guard** (commit `524c7aa5`): `check-atomic-slug-literals.py` wired to prebuild — fails the build on a new `if slug==` branch outside the allow-list (shrink-only).
5. **8-row OPEN-ledger root-cause RE-VERIFICATION** (7 parallel agents, Bean directive): report `.claude/reports/2026-06-13-open-row-rootcause-verification.md`. The ledger's diagnoses were WRONG/PARTIAL on IN-B, FP-P, IN-E, BR-B; GF-B.2 pinned a broad CSS selector-scope bug; SP-C dropped (not a defect).

## Current State
- **Branch:** `main` at `c1543df5` (+ docs commit from this handoff). In sync with origin.
- **Tests:** both conformance suites green — Gate A 43/43, converter_v2 26/26.
- **Build:** n/a (no plugin rebuild needed — styling-lift is converter+DB side; the `scalarStylingLift` block.json flag is non-visual metadata).
- **Uncommitted changes:** the doc set committed by this handoff (next-session-prompt, root-cause report, decisions, state, handoff).

## Known Issues / Blockers
- Styling-lift has 2 documented DB-data gaps (not blockers): quoteStyle font-style (`Style` suffix css_property=NULL) + nameFontWeight `__name`-vs-`__author` draft-class drift.
- The styling-lift's live RENDER on canary page 8 is NOT yet verified (emit + conformance proven; rendered-DOM probe is Task 1 next session).

## Next Priorities (in order)
1. Live-verify the D223 styling-lift renders on canary page 8 (close the R-22-11 loop).
2. Design + build the OPEN-row fixes from the VERIFIED root causes — 3 are Rule-7 shared-mechanism (GF-B.2 CSS matcher, IN-E container-wrapper transfer, IN-B co-declared-var resolution); the rest are localised per-block extraction maps. Drop SP-C. Close FP-D (design-decision).

## Files Modified
| File | What changed |
|------|--------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | removed 6 dead core/* handlers; added `_lift_styling_attrs_by_selector` + G3 wiring + tripwire |
| `plugins/sgs-blocks/scripts/check-atomic-slug-literals.py` | NEW guard (allow-list 17→11) |
| `plugins/sgs-blocks/scripts/sgs-update-v2.py` | `scalarStylingLift` capability seeding + 3 `ATTR_CLASSIFICATION_OVERRIDES` |
| `plugins/sgs-blocks/src/blocks/testimonial/block.json` | `supports.sgs.scalarStylingLift: true` |
| `plugins/sgs-blocks/scripts/tests/fixtures/conformance/sgs-testimonial.golden.json` | faithful regen (+3 lifted attrs) |
| `.claude/plans/2026-06-13-*-DESIGN.md` (×2) | de-lit NO-GO + universal-lift design + build plan |
| `.claude/reports/2026-06-13-open-row-rootcause-verification.md` | NEW — corrected OPEN-row root causes |
| `.claude/decisions.md` · `state.md` · `next-session-prompt.md` | D223 + status + OPEN-row orchestration plan |

## Notes for Next Session
- **The ledger's diagnoses are hypotheses (R-22-7) — 4 of 8 were wrong.** Use the root-cause report, not the stale ledger row-notes, when building.
- **A subagent regenerating a golden can bake an unfaithful emit** — always diff a regen vs the fixture DRAFT CSS (D223 verified faithful this way).
- **GF-B.2's CSS selector-scope bug is broad** — `_collect_css_decls_for_element` matches ancestor-scoped compound selectors as single-class; fixing it may close other cross-section leaks.
- **Spec 27 + 30 are built → nothing is gated** (Bean confirmed). FP-E/FP-H shipped; FP-D is a design-decision close.

## Next Session Prompt

See `.claude/next-session-prompt.md` — full orchestration plan (live-verify Task 1 + design/build the OPEN-row fixes Task 2, with the corrected root-cause table, the 3 Rule-7 shared-mechanism flags, the 7 NON-NEGOTIABLE RULES, methodology guardrails, pre-flight ritual, and Skills/MCP/Agents tables). It is the operative opener — the SessionStart hook auto-loads it.
