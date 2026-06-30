---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline / Phase W3 remainder — A1 + hero bugs + child-lift design-gate + DB role root-cause
session_date: 2026-06-30
---

# Session Handoff — 2026-06-30 (W3 remainder — D251)

## Completed This Session
1. **A1 media-map (`8ea61b58`):** built `converter/services/media_map.py` loader + threaded `media_map` through `run_mechanism_b` AND the `_child_content_for_node`→`build_block_markup` recursion (nested-child images remap too). 273 tests.
2. **Hero LANDED bug 1 (`0b9bc509`):** `_mobile_suffixes` read the wrong tuple element → `splitImageMobile` dropped. Fixed.
3. **Hero LANDED bug 3 (`1ef2afc2`):** ported FR-22-20 variant detection into `build_block_markup` so render.php's `$is_split` gate fires (split image+grid were ignored).
4. **6-persona `/adversarial-council` design-gate** of the universal child-lift (hero bug 2 — CTAs lose url+inheritStyle). Council REVISED the design: route every child through `build_block_markup`, reuse the shared `field_extractors` handlers. Register: `.claude/reports/2026-06-30-role-derivation-root-cause.md`.
5. **DB role-derivation root-cause fix (`b921a909`):** `/systematic-debugging` proved the role classifier was never wired into `/sgs-update` (ran with no args) AND was NULL-only. Wired `apply_role_detection_inline` into `run()` + upgrade generic `content`→specific (high-confidence only). 11 roles corrected (4 upgrade + 7 fill), 2 scalar-media correctly excluded; report-first per Bean; 2 regression tests; F5/F6 gates green.

## Current State
- **Branch:** main at `b921a909` (pushed)
- **Tests:** 276 pass (converter + cheat-gate) + 2 new role-detection tests; F5/F6 commit gates exit 0
- **Build:** Python converter (no npm needed). Live DB roles corrected (deterministic on reseed via the wiring).
- **Uncommitted changes:** doc updates only (decisions/state/handoff/next-session-prompt/mistakes); convert.py byte-identical (D-MODULAR).

## Known Issues / Blockers
- New engine still INERT in production (frozen `convert.py` runs live clones — STOP-28). Not yet LANDED.
- Hero bug 2 (CTA child-lift) is OPEN — the keystone B work, design-gated, fresh-session per STOP-19 (highest-regression walker).

## Next Priorities (in order)
1. **B — universal child-lift** (route every child through `build_block_markup`; reconcile `url-href`→`link-href`; shared-handler atomic leaf; `/qc-council` before commit). READ the register doc first.
2. **Re-run LANDED hero proof** (full hero incl CTAs) + Bean eye (page-source compare + computed-style; the JS parity scripts are unreliable, blub #374).
3. **W3 remainder:** A2 ledger, §5 lift, !important sweep, dead-code, commit.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/converter/services/media_map.py` | NEW — media-map loader (A1) |
| `plugins/sgs-blocks/scripts/converter/services/extraction.py` | media_map threaded through walker + recursion |
| `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` | `apply_role_detection_inline` + wired into `run()` (role root-cause fix) |
| `plugins/sgs-blocks/scripts/converter/tests/test_role_detection_inline.py` | NEW — 2 regression tests |
| `.claude/reports/2026-06-30-role-derivation-root-cause.md` | NEW — proven root cause + council design register |
| `.claude/{decisions.md,handoff.md,next-session-prompt.md,state.md}` | D251 + handoff |

## Notes for Next Session
- **The B-design is council-validated and captured** in `.claude/reports/2026-06-30-role-derivation-root-cause.md` — read it before touching the walker. The fix is SMALLER than first proposed (delete the bypass, reuse `field_extractors`), not a ChildBlock rewrite + `_atomic_attrs_for` clone.
- **DB role data is now correct** (icon.linkUrl=link-href etc.) and deterministic on reseed — B can rely on it.
- **Council DB false-positives** (already corrected): multi-button=layout wrapper, social-icons=array, `icon-slug` role doesn't exist (use `identity`).
- **Handoff gates run:** living docs (Gate 1/4.5), D251, lesson already captured this session (blub #374). SKIPPED (context length): OC-sync POSTs, independent /qc subagent, docscore — flagged honestly, not silently.

## Next Session Prompt
See `.claude/next-session-prompt.md` (B orchestration + carried-forward STOP catalogue 1..33 + ritual + reading gate).

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
