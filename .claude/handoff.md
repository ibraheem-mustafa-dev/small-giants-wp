---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-18
---

# Session Handoff — 2026-06-18 (F3-core + F4 + F5-partial)

## Completed This Session
1. **F3-core — LANDED render-oracle — SHIPPED** (`6b430dae`, D234). New `plugins/sgs-blocks/scripts/oracle/`: verdict engine (§3 precedence, tri-state compare, ΔE≤1/≤1px reusing parity2 helpers not its BEM matcher), 4 false-win guards, MR-2, frozen §6 F3→F5 contract, 181 tests in prebuild. **Live-canary-proven**: cloned `rt-centred-maxwidth` → published live on canary page 1199 → probed getComputedStyle → 4 LANDED + 2 UNVERIFIED, all CORRECT. Built SDD → Opus review (4 HIGH+5 MED fixed) → live proof → qc-council (cross-family Gemini tool-blocked → branch-trace stand-in → FIX-M).
2. **F4 — closed `excluded_properties` table — SHIPPED** (`870f48aa`, D235). One idempotent dated migration; **ships EMPTY** (no property is excluded-from-clone — Bean's "why max-width?" challenge proved `_LIFT_EXCLUDED_PROPS` is dead code). Re-scoped via a 3-rater /qc-council that found the originally-proposed literal-ban GATE overclaims (the real no-drop guarantee is F2+F3+coverage-invariant+F5) — the gate moved to F5; its hardened requirements are recorded in the F4 design §3. convert.py untouched (D-MODULAR — Bean's "fresh scripts, leave convert.py legacy" correction).
3. **F5 — STARTED (partial)** (`6193f3e9`, D236). `check_no_mirror.py` armed with a committed legacy baseline (`--baseline`/`--update-baseline`; 10 keys / 13 instances; fails on a NEW draft-class violation, grandfathers the 13). Built SDD → qc-inline (5/5 logic scenarios + 10/10 tests). **The converter still emits 13 live mirror violations** (mid-rebuild) → couldn't arm clean → baselined per §12.6-step-1.
4. **Docs:** D234/D235/D236; state + next-session-prompt rewritten for F6 (carry-forward gate passed: STOP 12→14, ritual 5→5, rules 7 verbatim); `P-F5-REMAINING` parked. 2 lessons captured (cross-family-rater stand-in = blub 359; gate-arm-precondition = STOP-14, blub pending — dashboard down).

## Current State
- **Branch:** main at `6e277444` (pushed; origin 0/0).
- **Tests:** ledger 167 + oracle 181 + check_no_mirror 10 (my runs); Gate A 43; F4 migration idempotent/empty. All green.
- **Build:** n/a (Python-only this session; convert.py needs no build). Oracle + ledger checks wired into prebuild.
- **Uncommitted:** pre-existing not-mine files only (handoff-theme/next-prompt-theme deletions, lucide-icons.php, 3 reports/phase4-*.txt) — left untouched.

## Known Issues / Blockers
- **F5 is PARTIAL** — `check_no_mirror` armed but NOT auto-wired (the orchestrator doesn't call `pipeline-stage-gate.py` → STOP-6 gap), and 5 other F5 gates remain OPEN (`P-F5-REMAINING`). Do NOT treat F5 as done.
- **Gemini cross-family tooling broken on this Windows machine** (3 failures) — qc-council cross-family lens needs a manual branch-trace stand-in (STOP-13).
- **blub.db dashboard down** at session close — the STOP-14 lesson is in the memory file (pending upload).
- F3-runtime (full-37 render-diff, cache, pixel-diff, deploy choreography, %/calc/vw length, MR-1/MR-3) DEFERRED.

## Next Priorities (in order)
1. **Build F6** — DB-as-code consistency suite (§12.4): routing-ambiguity + has_inner_blocks-vs-save.js + variant-collision checks; baseline current violations (STOP-14); wire prebuild. Rule-7 → design-gate first. (Bean's chosen next step.)
2. **Finish F5** (`P-F5-REMAINING`) — start with the check_no_mirror orchestrator-wire (smallest), then check-converter-cheats.py / coverage-matrix / ledger-checker / EXCLUDED-literal gate / PreToolUse hook.
3. **Stage-by-stage rebuild** (§12.6 step 3), each stage gated by the ledger + oracle.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/oracle/*` | NEW (F3-core) — verdict engine, guards, MR-2, §6 contract, live-proof driver, 181 tests |
| `plugins/sgs-blocks/scripts/migrations/2026-06-18-create-excluded-properties.py` | NEW (F4) — empty audited table |
| `plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py` + `check-no-mirror-baseline.json` + `pipeline-stage-gate.py` + `test_check_no_mirror_baseline.py` | NEW/MODIFIED (F5) — baseline-arm + post-clone gate entry + 10 tests |
| `plugins/sgs-blocks/package.json` | prebuild runs oracle tests |
| `.claude/{decisions,state,next-session-prompt,parking}.md` + `plans/2026-06-18-f4-excluded-properties-design.md` + `plans/2026-06-18-f3-render-oracle-design.md` | session docs (D234–D236, F6 prompt, P-F5-REMAINING) |

## Notes for Next Session
- convert.py is FROZEN legacy (D-MODULAR §12.0/§12.4) — F2–F5 never edited it; F6 must not either. The stage-by-stage rebuild replaces it.
- STOP-14 (new): before arming any gate, run it report-mode against current output; if dirty, baseline (don't force-arm/skip). The DB likely has current consistency violations → F6 will need the same baseline pattern.
- A run-output gate (needs a clone run_dir) can't wire into prebuild — wire post-clone. F6 (static DB query) CAN wire into prebuild.
- The F4 /qc-council established the real no-silent-drop guarantee = F2 (draft ledger UNACCOUNTED) + F3 (LANDED) + css_router coverage invariant + F5's ledger checker — NOT a literal scan.

## Next Session Prompt
The full F6 orchestration plan — MANDATORY READING GATE, the 7 rules, the 14-entry STOP catalogue, the 5-question ritual, Skills/MCP/Agents tables, and the F5-REMAINING pointer — is in `.claude/next-session-prompt.md` (rewritten this session, carry-forward gate passed). The SessionStart hook auto-loads it. Start there.
