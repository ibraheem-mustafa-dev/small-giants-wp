---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline / CSS-resolver unification
session_date: 2026-06-29
written_under: NEAR-EXHAUSTED CONTEXT — lean capture; a FULL /handoff hygiene pass (docscore, registry walk, D-number assignment, parking sweep, STOP-catalogue carry-forward) is OWED next session.
---

# Handoff — 2026-06-29 (CSS-resolver unification merged; route-coverage UNVERIFIED)

## ⛔ NEXT SESSION TASK 1 — FACT-CHECK THIS HANDOFF + THE ROUTE COVERAGE BEFORE BUILDING
This session repeatedly produced confident-but-unverified subagent claims (the worst: an audit that reported "9 routes" confidently and hand-waved the "17 routes" Bean asked about — conjecture, NOT verified). DO NOT trust any "covered / no-cheating / N routes" claim below or in the agent transcripts until re-checked against ground truth (dispatch_table.py + each resolver + the DB + the draft). Separate VERIFIED from UNVERIFIED on sight; treat every unlabelled claim as suspect.

## VERIFIED THIS SESSION (I personally ran the check — evidence noted)
- **CSS-resolver unification MERGED to main at `311c120f`** (merge of branch unify-v2). Fast-forward was impossible (main had moved to 688788a2 via 3 docs/config commits — no converter overlap, confirmed by `git diff --name-only`); merged via `--no-ff`.
- **176 converter tests pass** (`python -m pytest converter/tests -q --import-mode=importlib` from `plugins/sgs-blocks/scripts`, run by me on main post-merge; 1 skip, 2 xfail = the honest scalar_content/scalar_media stubs).
- **convert.py + fold_helpers/text_leaf/button_group byte-identical** vs c3014874 (`git diff --stat` empty — I ran it). D-MODULAR held.
- **No hardcoded side/breakpoint suffix vocab in live resolver code** (I grepped: `re.sub`/`_BP_SUFFIX_MAP`/frozenset over Top|…|Mobile — none; only docstrings).
- **Conservation catches a planted leak** — I monkeypatched a resolver to return None → `ConservationError: TOTALITY: 1 declarations produced 0 routed results`. Proven myself, not trusted.
- **R-22-1 hardcoded-suffix cheat fixed** (Bean caught it): `grid_area.py` regex `(Top|Right|Bottom|Left)(Mobile|Tablet|Desktop)?` → DB-driven via new `db_lookup.modifier_suffixes(kind)` + `unit_companion_attr(attr,conn)`; a 2nd violation (`styling_content._BP_SUFFIX_MAP`) also DB-driven. Suffixes confirmed DB-owned in `modifier_suffixes` (side/breakpoint/unit).

## BUILT THIS SESSION (verified to TEST/GATE level, NOT to LANDED)
- **The Option-A seam:** `process_element` accepts `Write|list[Write]|GAP`; conservation = per-declaration-result TOTALITY + a collision guard (duplicate-attr in one decl raises); `Write.value` widened int|float|str; `align_finalise` element hook; `Ctx.area_name` + `layer_detect` GRID_AREA branch.
- **5 resolvers** (outer_box/content_band/grid/typography/grid_area) built REAL against main's reused helpers. scalar_media stays UNIMPLEMENTED_STUB (A11-deferred — media_signal has no DB predicate yet; the media CONTENT lift already lives in the content branch).
- **STOP-23 3-rater qc-council** on the built code found 2 real bugs (align_finalise tier-blind → wrong align:"full" on tablet-only max-width; synthetic Write `property="max-width"` mis-keyed the F5 ledger) + should-fixes — ALL fixed + re-verified (added tests for both).
- **Evidence gate hardened + de-bugged + committed** (4704b12 + later): covers `.py`, converter surface requires `spec=22|31` citation, ignores tool-result boundary entries; the stale `.sgs-gate-off` flag (off for ~10 days) deleted.
- **Session-grounding fix prompt** committed (`.claude/plans/2026-06-29-cc-session-grounding-fix-PROMPT.md`) — the GAP-1 SessionStart spec-anchor hook is now LIVE (it injected this session).

## NOT VERIFIED / SUSPECT — fact-check before relying on any of these
- **"All 17 routes covered without cheating" — NOT ANSWERED.** The audit reported 9 resolver-ids and did NOT reconcile the 17. RE-DO: enumerate what Bean means by the 17 routes (likely the (layer/role × property-family × has_inner_blocks) routing branches, NOT the 9 REGISTRY ids), then verify EACH is covered-real / honestly-deferred / cheat, against dispatch_table.py + each resolver + the draft. The "no-cheating" partial finding is UNVERIFIED — re-confirm.
- **`OUT-OF-SCOPE-NOTES.md` was NOT updated** (the audit subagent was killed before writing it). Still owed: map every deferral to a named Spec 31 stage.
- **LANDED proof NOT done.** The resolvers are WRITTEN + emit-green + test-green + conservation-safe ONLY. No draft-vs-clone computed-style proof (STOP-21). This is the real "is it faithful" gate and it is OWED.
- **Engine is NOT production-wired (STOP-28).** The resolvers don't drive a real clone yet — `build_block_markup` has no production caller. The interior-walker WIRING (the Ctx-builder that populates `area_name` + walks the draft + calls the dispatch) is the next build stage; A1 (media-map loader) + A2 (content conservation-ledger) gate production-wiring.

## NEXT BUILD STAGES (after Task 1 fact-check)
1. **17-route coverage verdict** (re-done properly) + **finish OUT-OF-SCOPE-NOTES.md** audit.
2. **LANDED proof** for ≥1 resolver via genuine `emit_block_markup` on a canary (STOP-21 recipe).
3. **Interior-walker wiring** (Spec 31 §3.B3 + the Ctx-builder for area_name) — makes the resolvers reach a real clone.
4. **A1 media-map + A2 content-ledger** before production-wiring (STOP-28 precondition).

## CARRY-FORWARD (do NOT subtract — D101)
The full STOP catalogue (STOP-1..29) + the pre-flight ritual + tiered reading gate live in `.claude/next-session-prompt.md` (the D247/D248 version) — it is INTACT; the next full /handoff must carry it forward verbatim + extended, never subtracted. D-ceiling was D248; **assign a D-number for the CSS-resolver unification merge (311c120f)** in the full /handoff. Branch: main. Uncommitted/not-mine: lucide-icons.php, phase4 reports, theme-handoff deletions.