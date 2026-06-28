---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-28
---

# Session Handoff — 2026-06-28 (D246/D247 content-UNIFY: W1+W2 wrap-up, both `/qc-council` gates run, A1-seam+A3 fixed, A2 ruled a ledger gap)

> Prior handoffs (D245 Stage-3 content build, D244 Stage-2 recognition) are in git history + `memory/`.

## Completed This Session
1. **Wrap-up of the W1+W2 milestone (committed by the prior context window).** W1 (`a4c0de86`) modularised the working scalar-content lift (`_lift_scalar_attrs_by_selector` → `converter/resolvers/scalar_content.py:lift_scalar_content` + helpers in `lift_helpers.py`); W2 (`57209f48`) wired it via the thin wrapper `run_mechanism_a` + retired the D245 from-scratch scalar path + re-LANDED live; Spec 31 §3 rewritten unified (`661d3357`). Wrote handoff.md + next-session-prompt.md (carried the full STOP-1..26 catalogue forward) + state.md (`2d2327f9`).
2. **Ran BOTH `/qc-council` gates (6 raters, cross-model), every finding fact-checked against live code + DB (STOP-15).** No `sourceMode='bound'` / echo-`$content` / hardcoded-`!important` cheat exists — the no-cheat floor HOLDS. Results captured as Register A (W1+W2 built code) + Register B (W3 plan) in next-session-prompt.
3. **A3 — false-green test FIXED (`afbcaa99`).** `test_extraction.py` monkeypatched `content_attrs_with_selector`, a function `run_mechanism_a` no longer calls (vacuous green). Now patches `block_attrs` + `capabilities_for`; failure-path proven (starving `capabilities_for` → `[]`). 318 converter+ledger tests green.
4. **A1 — `media_map` seam FIXED (`afbcaa99`).** Killed the hardcoded `{}`; `media_map` now threads `build_block_markup`→`extract_content`→`run_mechanism_a`→`lift_scalar_content` (§3.B1-aligned). NO url-shape heuristic added (would be a non-DB hardcoded rule). FULL fix (images resolving to WP URLs) needs the media-map LOADER/driver — the new engine has no production caller yet — so it's folded into the W3 engine-wiring.
5. **A2 — ruled a §12.2.1 conservation-ledger gap, NOT a lift patch (D247).** Spec 31 §3.B1 mandates the lift's strict no-op, so a per-attr `ContentGap` inside the lift would breach the spec + re-introduce a D245-style parallel tracker (STOP-25). Spec-aligned fix = extend `declare_input` to capture CONTENT routing units. Design-gated; Bean folded it into the W3 engine-wiring.
6. **Specs + registry updated.** Spec 31 §3.B1 status note (W1/W2 done + A1 driver pending) + §12.2.1 CONTENT-LEDGER GAP note (A2); `docs-registry.yaml` `last_updated` + Spec 31 note refreshed.

## Current State
- **Branch:** `main` (this session's commits: `2d2327f9` docs wrap-up → `988d8113`/`bc04534e`/`50a5b930` council registers + roadmap → `afbcaa99` A1-seam+A3 fix → this handoff/decisions/spec/registry commit).
- **Tests:** 318 converter+ledger pass (1 skip, 6 xfailed); F5 + F6 commit gates green.
- **Build:** n/a (pure-Python converter changes).
- **Uncommitted (NOT mine — leave them):** `plugins/sgs-blocks/includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/handoff-theme.md` + `.claude/next-session-prompt-theme.md` (deletions). Pre-existing, not this session's — dropped from every commit.
- **convert.py:** byte-identical (D-MODULAR). **D-ceiling:** D247.

## Known Issues / Blockers
- None block the next session. A1-full + A2 are deliberately deferred to the W3 engine-wiring (neither can bite a real clone until the engine is production-wired — `build_block_markup` has no production caller yet).

## Next Priorities (in order)
1. **Build W3** (only on Bean sign-off, Rule 7) — port the FULL `convert.py` walker (`_route_composite_interior`) into `run_mechanism_b` honouring Register B (B1 scalar-media + fold/CSS-route, B2 styling-lift consuming `_bp_decls`, B3 arrays port-as-is, B4 ambiguous-attr loud gap, B-order delete-dead-last). See next-session-prompt Task 3 + Register B.
2. **Close A1-full + A2 with the engine-wiring** (post-W3 roadmap item 2): media-map loader/driver + extend `declare_input` to content routing units.
3. **Continue the post-W3 roadmap** — generalise mechanisms to all content blocks → wire resolvers into the unified dispatch → finish §3 unified → full fixture-set gate → convert.py decommission (§8).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | A1 seam (media_map threaded) + honest docstring (A2) |
| `plugins/sgs-blocks/scripts/converter/tests/test_extraction.py` | A3 false-green test repaired |
| `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` | §3.B1 W1/W2 status note + §12.2.1 content-ledger gap (A2) |
| `.claude/docs-registry.yaml` | last_updated + Spec 31 note refreshed |
| `.claude/next-session-prompt.md` | Register A/B + post-W3 roadmap + A2 fold-in decision |
| `.claude/handoff.md` + `.claude/state.md` + `.claude/decisions.md` | this session record + D247 |

## Notes for Next Session
- **A2 is the load-bearing ruling:** content completeness lives in the ONE conservation ledger (§12.2.1 extended to content routing units), never as a gap inside the lift (§3.B1 strict no-op). Hacking it into the lift = breaking the spec + the D246 parallel-system mistake. Memory: `content-completeness-is-a-ledger-gap-not-a-lift-patch`.
- **A1/A2 can't bite until the engine is production-wired** — `build_block_markup` is test/canary-only; that wiring is post-W3 roadmap item 2.
- The W3 walker port is HIGH blast-radius (Register B B1): a thinned port re-opens the hero-split image + content-CSS evaporation (D212/MF-1). Port ALL three walker branches.

## Next Session Prompt
The operative orchestration plan is already written and current at `.claude/next-session-prompt.md` — it carries the full STOP-1..26 catalogue, the pre-flight ritual, the tiered reading gate, Register A + Register B (the council must-fix registers), and the post-W3 roadmap. Skills/MCP/Agents tables are in that file. Do NOT regenerate it from scratch — it is the carry-forward-complete version (Gate 6.5). Open it and execute Task 3 (build W3) after the reading gate + Bean sign-off.
