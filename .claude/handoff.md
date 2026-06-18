---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-18
---

# Session Handoff — 2026-06-18 (F3-core)

## Completed This Session
1. **F3-core — the LANDED render-oracle — SHIPPED** (`6b430dae`, D234). New module `plugins/sgs-blocks/scripts/oracle/` (sibling of `ledger/`): `verdict.py` (§3 precedence + tri-state compare), `guards.py` (4 false-win guards), `models.py` (frozen §6 F3→F5 contract + `written` precondition), `metamorphic.py` (MR-2 name-free routing), `capture.py` (live-probe interface stub), `run_canary_proof.py` (F3-core-B command), `tests/test_oracle.py` (181 tests, wired into `package.json prebuild`).
2. **Live-canary proof (acceptance #1)** — cloned `rt-centred-maxwidth` via `convert.py`, published it live on the canary (page 1199, `/f3-oracle-rt-centred-maxwidth/`) through the editor `wp.data` path, probed `getComputedStyle` on the rendered `.wp-block-sgs-container` → **4 LANDED + 2 UNVERIFIED, all CORRECT** on a non-default fixture. `_render-oracle/rt-centred-maxwidth.{landed,probe}.json` committed (reproducible).
3. **Cross-model Opus adversarial review** found 4 HIGH + 5 MEDIUM (colour/length classifier over-match, per-section NOT-RENDERED mis-tag, empty-cells swallow, computed-style serialisation mis-fail, written precondition, named-colour parse, height tolerance) — all fixed.
4. **qc-council pre-commit gate** — empirical hard-gate met by the live proof; cross-FAMILY Gemini rater tool-blocked (3 harness failures) → stood in with a structured branch trace → FIX-M (unparseable-length → UNVERIFIABLE, consistency with the colour path).
5. **Docs:** D234 added (`912bf692`); state.md one-liner + next-session-prompt rewritten for F4 (carry-forward gate passed: STOP 12→13, ritual 5→5, rules 7 verbatim).

## Current State
- **Branch:** main at `912bf692` (pushed; origin 0/0).
- **Tests:** oracle 181 pass + ledger 167 pass (my own runs); Gate A converter conformance green.
- **Build:** n/a this session (Python-only; convert.py needs no build). Oracle unit tests wired into prebuild.
- **Uncommitted changes:** pre-existing not-mine files only (`.claude/handoff-theme.md` + `next-session-prompt-theme.md` deletions, `lucide-icons.php`, 3 `reports/phase4-*.txt`) — left untouched.
- **Live artefact:** canary page 1199 (`sandybrown…/f3-oracle-rt-centred-maxwidth/`) — the F3-core proof page; leave or reuse.

## Known Issues / Blockers
- **Gemini cross-family tooling is broken on this Windows machine** (gemini-analyser agent harness runs 0 tools; `gemini` CLI hits a node-path bug; binary not at `A:/pnpm/bin/gemini`). The qc-council cross-family lens currently needs a manual branch-trace stand-in (STOP-13). Not blocking, but fix before relying on Gemini delegation.
- F3-runtime (full-37 render-diff, content-hash cache, pixel-diff secondary, deploy choreography, %/calc/vw container-resolved length comparison, MR-1/MR-3) is DEFERRED — build lazily when the rebuild first renders many fixtures.

## Next Priorities (in order)
1. **Build F4** — closed `excluded_properties` DB table (ships EMPTY, migration-only seed) + literal-ban gate. Rule-7 → design-gate (`/brainstorming` → `/adversarial-council` → Bean) BEFORE building.
2. **F5** — build + ARM the 3 gates (check-converter-cheats / generate-coverage-matrix / ledger checker joining F2+F3+F4) + wire prebuild + PreToolUse git hook.
3. **F6** — DB-as-code consistency suite, then the stage-by-stage rebuild (§12.6 step 3), each stage gated by the ledger + oracle.

## Files Modified
| File path | What changed |
|-----------|--------------|
| `plugins/sgs-blocks/scripts/oracle/*` | NEW module — verdict engine, 4 guards, MR-2, §6 contract, live-proof driver, 181 tests |
| `plugins/sgs-blocks/package.json` | prebuild now runs `pytest scripts/oracle/tests/` |
| `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/_render-oracle/rt-centred-maxwidth.{landed,probe}.json` | NEW — committed live-proof artefact + its probe input |
| `.claude/decisions.md` | +D234 (F3-core shipped) |
| `.claude/state.md` | one-liner → D234, NEXT=F4 |
| `.claude/next-session-prompt.md` | rewritten for F4 (carry-forward gate passed) |

## Notes for Next Session
- The fixture `rt-centred-maxwidth.expected.md` frames an MF-3 `widthMode`/`customWidth` bug that is STALE — those attrs were retired v0.4 (D230/D231); the converter's `maxWidth:1200px` is correct and LANDED. Verify a block's CURRENT attr model before trusting an expected.md bug claim (STOP-1 extension).
- F3-core reuses `parity2._parse_px`/`_colour_delta` ONLY (R-22-1) — NEVER parity2's BEM matcher (it pairs by draft BEM class native output lacks). LANDED pairs by rendered block slug + getComputedStyle.
- The §6 F3→F5 contract is FROZEN — F5 joins on `(section_id, block_slug, property, tier)`. F2 joins on `(selector, property, media)`. F4's excluded table is the third leg of `UNACCOUNTED = draft − (transferred ∪ excluded ∪ gap)`.
- Live render on the canary goes via the editor `wp.data` path (parse → resetBlocks → editPost publish → savePost), NOT REST post_content (wp-content-guard).

## Next Session Prompt

The full F4 orchestration plan — with the MANDATORY READING GATE, the 7 non-negotiable rules, the 13-entry STOP catalogue, the 5-question pre-flight ritual, and the Skills/MCP/Agents tables — is in `.claude/next-session-prompt.md` (rewritten this session, carry-forward gate passed). The SessionStart hook auto-loads it. Start there.
