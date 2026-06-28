---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-28
---

# Session Handoff — 2026-06-28 (array universal-alignment; W3 deferred)

_Prior handoffs in git history (previous: D247 session-close)._

## Completed This Session
1. **Verified W1/W2 done-state** (a4c0de86/57209f48/afbcaa99/661d3357) vs ground truth — scalar-content path modularised + landed; both qc-councils run; Register A resolved.
2. **W3 walker-port design** written + Bean-approved (full-breadth); scoped the ~1,650-line transitive surface (`walk`+`route_node_css`+`_route_interior_css_to_parent_slot`+fold+emit). `.claude/plans/2026-06-28-w3-walker-port-design.md`. Build deferred (highest-blast, fresh session).
3. **Array feature — full Path-A build (Bean: rebuild arrays correctly per spec):** DB foundation (`array-content-lift` capability + 3 item-selector fixes) → `array_content.py` resolver (slice cta-section.stats, 2 bugs caught) → 8-block rollout via 8 parallel agents → 2-rater `qc-council` (NO-GO-as-authored → gap-pending safety net) → wire-up → content extractors (url-href/icon-slug/plain-integer) → css-modifier flip. Commits b74986b0→8a7aa41f.
4. **Universal-alignment keystone (305d5396)** — ONE shared `converter/services/field_extractors.py`; B1 (scalar) + B4 (array) both delegate (drift structurally impossible); import-ban opened to `icon_resolver` (proven still tight); Spec 31 §3.B.0 universal principle added.
5. **Two proper visual-diff gate fixes** (no `--no-verify`) — metadata-only block.json detection + a utf-8 fix in that detector.
6. **Docs:** `.claude/OUT-OF-SCOPE-NOTES.md` (reframed gap-list → Spec-31-stage map) + captured lesson `bind-definition-of-done-to-full-spec-scope`.

## Current State
- **Branch:** main at f2008bf8 (9 commits this session: b74986b0→f2008bf8)
- **Tests:** 219 pass, 1 skip, 6 xfail (from `plugins/sgs-blocks/scripts`, `--import-mode=importlib`)
- **Build:** n/a (Python converter; no npm build)
- **Uncommitted:** none mine (pre-existing theme-handoff deletions are NOT mine)
- **New engine INERT in production** — frozen `convert.py` runs live clones (STOP-28)

## Outcome vs Completion (Gate 3.5)
- Array feature: **OUTCOME ACHIEVED** for content (text/image/icon/url/number migrate + css-modifier where unambiguous), with un-modellable fields LOUDLY tracked (Rule-4 safe). **CODE SHIPPED, OUTCOME NOT YET LIVE** — the new engine is inert; faithful clones need W3 + the CSS branch + production-wiring.
- Universal alignment: **OUTCOME ACHIEVED** — handlers shared; per-path drift structurally closed.

## Known Issues / Blockers
- **blub.db dashboard DOWN** (localhost:5050 refused) — captured lesson's blub.db layer PENDING (file layers landed); re-POST when up. Same for handoff dashboard gates 4b/4c.5.

## Next Priorities (in order)
1. **W3 walker port** — last big content piece (recursion → nested child blocks). Design ready.
2. **CSS branch (§3.A)** — transfer attached CSS per element (the core remaining fidelity work).
3. **Array residuals** — hero position/style enum-aware disambiguation, hero.suffix split, pricing nested/boolean/enum (all in OUT-OF-SCOPE-NOTES.md).
4. **Production-wiring** (A1 media-map + A2 content ledger) — switches the new engine live.

## Files Modified
| File | What changed |
|------|-------------|
| `.../converter/services/field_extractors.py` | NEW — shared role→value dispatcher (B1+B4) |
| `.../converter/resolvers/array_content.py` | NEW→extended — array resolver + gap-pending |
| `.../converter/resolvers/scalar_content.py` | B1 delegates to field_extractors |
| `.../converter/gates/import_ban.py` | allowlist += icon_resolver |
| `.../orchestrator/converter_v2/db_lookup.py` | array_item_fields table + gap_reason + accessors |
| `.../scripts/sgs-update-v2.py` | arrayContentLift + arrayItemSchema seeders |
| `.../src/blocks/{9 blocks}/block.json` | arrayItemSchema + arrayContentLift |
| `.claude/specs/31-...md` | §3.B.0 universal-extraction principle |
| `.claude/OUT-OF-SCOPE-NOTES.md` | NEW — Spec-31-stage map |

## Notes for Next Session
- **THE captured lesson (binding):** before building any increment of a spec'd subsystem, read the WHOLE spec scope + set definition-of-done = the spec's FULL universal scope; map every deferral to a named spec STAGE, never "out of scope". `feedback_bind_done_to_full_spec_scope.md`.
- Universal stream (Spec 31 §3) = identify → content → CSS, every element, ONE dispatch. Content half built; recursion (W3) + CSS branch + wiring remain.
- Array role handlers are SHARED now (`field_extractors.py`) — extend THAT, never per-path.
- convert.py FROZEN (D-MODULAR). DB changes via override channel + reseed (STOP-24).
