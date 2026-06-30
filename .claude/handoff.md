---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline / Phase W3 BUILT + all-routes fixes
session_date: 2026-06-30
---

# Session Handoff — 2026-06-30

## Completed This Session
1. **W3 Step 1 design-gate + sign-off** (`bf1922b3`) — G1–G5 disposition verified against the working `_route_composite_interior` walker. G1/G2/G4/G5 DONE-BY-PORT; G3 built (Bean override: `accepts_allowed_blocks` validation, NULL→permissive+trace). Steps 2–3 found already done (D247).
2. **W3 Step 4 walker port** (`9498f3a7`) — faithful port of the FULL `_route_composite_interior` into `run_mechanism_b` (scalar-media column, content-block recurse, slug-None fold, G1 parent-token, G3). Replaced the thinned D245 recreation. 185 tests.
3. **W3 Step 7 KEYSTONE conductor** (`46d93612`) — `build_block_markup` now runs BOTH `process_element` (CSS, via new `_build_css_attrs`) AND `extract_content` into ONE emit. **Finding A fixed** — the two inert halves connect; `process_element` has a production caller.
4. **Grid-routing all-routes fix** (`625d4ba6`) — `grid-template-*` route PRE-LAYER to the grid resolver (a section root is OUTER for box CSS, GRID for child tracks). `gridTemplateColumns` lands.
5. **`/adversarial-council` (Bean-forced) corrected 2 phantom over-claims** — the "padding/background/radius dropped" claim was BS: convert.py `_lift_root_supports_to_style` emits them via native WP `style.*` + WP core lands them; I'd measured only `block_attributes`. Root-cause rule captured (four-channel check, blub #373).
6. **Fix 1 native `style.*` lift port** (`fa8418c8`) — `root_supports.py`: padding/background-color/border-radius now emit nested `style.*` (verified by smoke test).
7. **Fix 2 box-shadow** (`a3608bac`) — → the `shadow` preset attr via DB-first token-snap to `design_tokens` (sm/md/lg/glow; honest gap on no match).
8. **Fix 3 §5 seeds** (`fa8418c8`) — 20 `property_suffixes` rows (object-fit/position/overflow/aspect-ratio/etc.), idempotent, §9 Q5 data-only. + background-* lift + a **pre-existing `validate.py` enum-parse bug** fixed.
9. **Cheats FIXED not baselined** (`1b3d108c`) — mega-menu `!important` (real cheat) → raised specificity (behaviour-preserving, visual-diff PASS); container `!important` verified NOT a cheat (variant-scoped). **Check #3 made selector-aware** → removed 43 false-flagged variant `!important` (baseline 118→75).

## Current State
- **Branch:** main at 1b3d108c (pushed)
- **Tests:** 267 pass (converter + cheat-gate), 1 skip, 2 xfail; all 6 commit gates exit 0
- **Build:** Python converter (no npm needed for converter). One npm build ran (PowerShell) to regenerate mega-menu/container build CSS.
- **Uncommitted changes:** none of mine (`lucide-icons.php` = npm-regen timestamp drift, not mine). convert.py byte-identical (D-MODULAR).

## Known Issues / Blockers
- New engine still INERT in production (frozen `convert.py` runs live clones — STOP-28). NOT yet LANDED on a real page (Step 10 owed — the real faithfulness gate).
- §5 properties are SEEDED (data) but not LIFTED yet — they show as tracked gaps until the lift-path is built.

## Next Priorities (in order)
1. **LANDED proof (W3 Step 10)** — deploy a genuine `emit_block_markup` clone to a canary (hero split), computed-style vs draft at 375/768/1440 + Bean eye (STOP-21). The real "is it faithful" gate — everything is WRITTEN, nothing LANDED.
2. **A1 media-map loader + A2 content-ledger** (W3 Steps 8–9) — STOP-28 preconditions before production-wiring.
3. **§5 lift-path** — make the seeded §5 properties actually lift (each → its destination); shrinks the coverage baseline.
4. **Broader base-selector `!important` sweep** — ~30 now accurately flagged across blocks; each needs assessment (real cheat vs legit WP-default override).

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | run_mechanism_b walker port (Step 4) + _build_css_attrs conductor (Step 7) |
| `plugins/sgs-blocks/scripts/converter/services/root_supports.py` | NEW — native style.* lift port (Fix 1) |
| `plugins/sgs-blocks/scripts/converter/dispatch_table.py` | grid-template-* pre-layer routing |
| `plugins/sgs-blocks/scripts/converter/resolvers/outer_box.py` | background-* + box-shadow lift (Fix 2) |
| `plugins/sgs-blocks/scripts/converter/services/validate.py` | enum_values JSON-parse bug fix |
| `plugins/sgs-blocks/scripts/migrations/2026-06-30-*.py` | NEW — §5 property_suffixes seeds (Fix 3) |
| `plugins/sgs-blocks/scripts/cheat-gate/check_important_render.py` | Check #3 selector-aware (variant-scope skip) |
| `plugins/sgs-blocks/src/blocks/mega-menu/style.css` | !important → specificity (real cheat fix) |
| `.claude/{decisions.md,handoff.md,next-session-prompt.md,state.md}` | D250 + handoff |

## Notes for Next Session
- **The four-channel check** (memory + blub #373) — never claim a property is "not routed/dropped" until ALL four destination channels are negative (native supports→style.*, custom attrs, wrapper render, spec). I over-claimed twice this session; this rule is the fix.
- **A 316-word Bean message never reached me** (only the brain-dump hook fired, twice) — if Bean gave new direction it may be unaddressed; ask.
- **Check #3 is now variant-scope-aware** — a `!important` on a `--modifier`/`:pseudo` selector is skipped (overrides a variant render, not the base transfer). Base-selector !important still flags.
- **box-shadow uses preset SLUGS not raw values** — the `shadow` attr holds `sm/md/lg/glow`; the resolver token-snaps; arbitrary box-shadow with no preset match → honest gap.

## Next Session Prompt
See `.claude/next-session-prompt.md` (W3-remainder orchestration + carried-forward STOP catalogue 1..32 + ritual + reading gate).
