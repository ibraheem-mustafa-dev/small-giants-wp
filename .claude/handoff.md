---
doc_type: handoff
project: small-giants-wp
thread: cloning-pipeline
session_date: 2026-06-23
---

# Session Handoff — 2026-06-23

## TL;DR
Doc audit of every `.claude`/`specs`/`plans` doc against ground truth — archived 12 shipped/superseded plans, fixed every stale status (Spec 31 F5, Spec 22 H-C1, widthMode→align across specs), repaired the registry, de-hardcoded Spec 22 counts, trimmed mistakes.md to ≤30. 3 commits on `main` (`1c803bde`). No code touched (convert.py FROZEN). NEXT = the stage-by-stage modular rebuild (Spec 31 §12.6 step 2).

## Completed this session
1. **Doc audit (Bean-directed) of every `.claude` / `specs` / `plans` doc** against ground truth (decisions.md D241 + Spec 31 §12 end goal). 5 parallel read-only review slices + fact-check of every archive/stale call (STOP-1/STOP-15). Committed in 3 commits: `73fe1b95`, `efdc277b`, `1c803bde`.
2. **Archived 12 shipped/superseded plans** (`git mv` → `plans/archive/`), each cited to a D-number: F2/F3/F4/F6 + exact-match-width + converter-gaps + child-css-lift (shipped D223/D230–D237); composite-fidelity + universal-band (D228 + absorbed into rebuild); the 2 de-literalisation docs + grid-extraction design (superseded by D229 D-MODULAR / Spec 31 §12). Only `2026-06-09-clone-fix-build-plan.md` + `-sign-off-ledger.md` remain active.
3. **Closed parking `P-CONVERTER-DE-LITERALISATION`** → `memory/parking-archive.md` (SUPERSEDED by D229; convert.py frozen).
4. **Fixed stale statuses in place (load-bearing):** Spec 31 §12.7 F5 row PARTIAL→DONE (D239–D241) + §12.2/§5/§7a gate notes; Spec 22 H-C1 "closed"→WRITTEN-not-LANDED (D226) + retired `css-d1-assignments` PASS test; Spec 29 + WRAPPER DEC-3 `widthMode`→`align`/`maxWidth`; architecture #14 `slot_synonyms`→`slots`; goals Goal A 5-workstream→rebuild; state.md/`.claude/CLAUDE.md` D-pointers.
5. **Repaired `docs-registry.yaml`:** repointed 2 dead phase-3/4 paths; added Spec 30, Spec 31, go-live-checklist; Spec 27/28 status; `plan.md` scope→archived; `last_updated`→2026-06-23.
6. **De-hardcoded Spec 22 counts** to `/sgs-db` pointers — live `block_attributes`=2819 was neither the doc's "2,739" nor the agent's "2,935"; roster fixed 29→31 / 11→13 content (live DB=31).
7. **Spec 02 counter** static→dynamic; **mistakes.md** +D240/D241 lessons, retired 17 oldest → 26 stubs (≤30 cap; was 41 not 30).
8. **DISMISSED by fact-check (no change):** `wrap_inner` still present in `class-sgs-container-wrapper.php` (Spec 29 §6 correct); form-block count = field-types vs total; Sections Q/R exist.
9. **Verified:** registry resolves every path; live dangling links repointed to `archive/`; docscore A/A- on every rewritten in-scope doc.

## Current state
- **Branch:** `main` at `1c803bde`
- **Tests:** 544 foundation tests green (docs-only session; no code changed)
- **Build:** n/a (convert.py FROZEN, D-MODULAR)
- **Uncommitted changes:** pre-existing only (lucide-icons.php, phase4 reports, theme-handoff deletions) — none are this audit's

## Known Issues / Blockers
- None block the rebuild. The git-mv rename-detection bug that left plan duplicates mid-session was caught + fixed (lesson captured, blub.db 364).

## Next priorities
1. **Resume the stage-by-stage modular rebuild** — Spec 31 §12.6 **step 2** (modular scaffold: dispatch table `(block,layer,property,tier)→resolver` + empty per-resolver files; F1 fixtures + F6 db-consistency already shipped), then **step 3** Stage 2 (recognition / Method-2: `.sgs-hero`→`sgs/hero`) first.
2. Each stage gated by the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set) before the next.
3. Arm the 2 deferred F5 residuals (P-F5-RESIDUALS) as the rebuild reaches their stage.

## Files modified
| File path | What changed |
|-----------|-------------|
| `.claude/plans/archive/*` (12 files) | Plans archived with forward-notes (git mv) |
| `.claude/docs-registry.yaml` | 2 dead paths repointed; +Spec 30/31/go-live; status/last_updated |
| `.claude/specs/{31,22,29,02,01,06,11,18,README,WRAPPER-CSS-ROUTING}.md` | Stale-status + retired-attr + count + counter fixes |
| `.claude/{state,goals,architecture,cloning-pipeline-flow,cloning-pipeline-stages,CLAUDE,parking,mistakes}.md` | Status / pointer / de-hardcode / archive-on-resolve edits |
| `.claude/memory/{parking-archive,mistakes-archive}.md` | Received closed parking entry + 17 retired mistake stubs |

## Notes for Next Session
- **De-hardcode counts, don't "correct" them** — the live DB (2819) was already past the agent's "corrected" 2935. Prose counts re-drift; use `/sgs-db` pointers.
- **git-mv + path-scoped commit gotcha** — `git commit -- $(git diff --cached --name-only)` drops the rename source deletion; always `git ls-tree -r HEAD | grep <oldpath>` after. (blub.db 364.)
- **convert.py is FROZEN (D-MODULAR)** — the rebuild builds fresh per-resolver files, not convert.py edits.
- Spec 31 §12 is THE blueprint; the audit aligned every doc to it — a fresh session can trust the doc set's statuses now.

## Next Session Prompt
See `.claude/next-session-prompt.md` — full orchestration plan for the stage-by-stage modular rebuild, with the carried-forward STOP catalogue (1–19), pre-flight ritual, and mandatory reading gate.
