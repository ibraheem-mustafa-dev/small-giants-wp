---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / CSS-resolver unification
generated: 2026-06-29
primary_goal: "FACT-CHECK the merged CSS-resolver unification BEFORE building anything else. Last session merged the unification to main (311c120f) but produced confident-but-UNVERIFIED claims (worst: an audit that said '9 routes' and hand-waved Bean's '17'). Task 1 = verify universality / route-coverage / no-cheating / the claimed DB-data gaps against GROUND TRUTH (wp-blocks dump + the ENTIRE Spec 31), via subagents that read the rules + known cheats first. Then justify (or reject) the OUT-OF-SCOPE deferrals and decide what to build next. Only AFTER fact-check: LANDED proof + interior-walker production-wiring. Do a full /handoff hygiene pass early (it was owed — last session ran out of context)."
---

# Next session — FACT-CHECK the merged unification, THEN decide the build

Invoke `/autopilot` before anything else.

## ⛔ READ FIRST + the carry-forward (D101 — do NOT subtract)
- `.claude/handoff.md` (2026-06-29) — the VERIFIED-vs-UNVERIFIED split. Trust only what's labelled verified-with-evidence.
- **CARRY FORWARD the full STOP catalogue (STOP-1..29) + the pre-flight self-attestation ritual + the tiered MANDATORY READING GATE** from the PRIOR next-session-prompt — recover verbatim via `git show <prior-commit>:.claude/next-session-prompt.md` (the D247/D248 version) and re-merge them into this doc as your FIRST hygiene act. D101 forbids subtraction; this version was written under exhausted context and points to them rather than reproducing 29 verbatim. NEW STOP this session: **STOP-30 — a subagent's "covered / N routes / no-cheating" verdict is a HYPOTHESIS; the 9-routes audit confidently conflated REGISTRY-ids with routes + hand-waved the 17. Re-enumerate + verify against ground truth; never relay a count you didn't derive.** Also: a worktree dispatched via `isolation:worktree` may branch from a STALE base — always `git merge-base main <branch>` before trusting/merging a worktree's "all green".
- `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — read §3 (the unified content+CSS routing algorithm) + §12 (the rebuild stages + §12.7 gap-to-stage map) IN FULL (Bean's instruction — not greps).

## VERIFIED state (last session, evidence in handoff.md)
CSS-resolver UNIFICATION merged to main **311c120f**: Option-A seam (per-decl `Write|list[Write]|GAP`, per-declaration TOTALITY + collision guard, `Write.value` int|float|str, `align_finalise` hook, `Ctx.area_name` + `layer_detect` GRID_AREA) + 5 resolvers (outer_box/content_band/grid/typography/grid_area; scalar_media A11-deferred). 176 converter tests pass; convert.py byte-identical (D-MODULAR); no hardcoded suffix vocab (the R-22-1 cheat Bean caught is DB-driven via `modifier_suffixes`); conservation catches a planted leak. Engine still INERT (STOP-28 — `build_block_markup` has no production caller).

## TASK 1 — FACT-CHECK (do this BEFORE any build; dispatch subagents, then verify their findings yourself)

**1a — Universality + route-coverage + DB-data fact-check.** Enumerate what the dispatch ACTUALLY routes (read `converter/dispatch_table.py` `resolver_id` + `REGISTRY` + each resolver). Reconcile Bean's **"17 routes"** — figure out what the 17 are (likely the (layer/role × property-family × has_inner_blocks) routing branches, NOT the 9 REGISTRY ids) and verify EACH is covered-real / honestly-deferred / cheat. **Fact-check every claimed "DB-data gap"** (content_band's `contentBandPadding*`, grid_area FIX-A per-area max-width, scalar_media `media_signal` predicate, the `slots.standalone_block` 40/103) by running `python ~/.claude/hooks/wp-blocks.py dump` + `/sgs-db` — is the data REALLY missing, or is it a routing bug / conjecture? Read the ENTIRE Spec 31 to ground the universality claim (does the dispatch cover §3.A's 8 steps + §3.B's B1-B4 for every element shape?).

**1b — Comprehensive cheat / rule-break sweep (subagents).** Dispatch ≥2 cross-model subagents, each FIRST reading: the 7 project rules (project CLAUDE.md §⛔), R-22-1..R-22-15 (decisions.md / Spec 22 §6), the STOP catalogue, and the known-cheats list (no `sourceMode='bound'`, no echo-`$content`, no hardcoded `!important`/default/dict/suffix overriding faithful CSS, no slug literals, no input-class≠output-class, no silent drops). Then have them comprehensively search the MERGED converter (`converter/**`) for ANY rule-break or cheat — file:line evidence, no hand-waving. Fact-check their findings against ground truth (a finding is a hypothesis — STOP-15/STOP-30).

**1c — OUT-OF-SCOPE-NOTES.md** was NEVER written last session (the agent was killed). Audit every deferral: is it JUSTIFIED (a real named Spec 31 stage) or conjecture/avoidable? Map each to its stage (padding-shorthand pre-dispatch expansion; FIX-A; scalar_media A11; content_band DB-routing; align-items→OUTER/VerticalAlign D172; interior-walker wiring; A1 media-map; A2 content-ledger). Then DECIDE what to build next.

## BUILD STAGES (only AFTER Task 1 + Bean sign-off)
1. **LANDED proof** for ≥1 resolver via genuine `emit_block_markup` on a canary (STOP-21 recipe) — resolvers are WRITTEN, not LANDED; this is the real faithfulness gate.
2. **Interior-walker wiring** (Spec 31 §3.B3 + the Ctx-builder that populates `area_name` + walks the draft + drives the dispatch) — makes the resolvers reach a real clone.
3. **A1 (media-map loader) + A2 (content conservation-ledger)** — STOP-28 preconditions before production-wiring.

## Skills / Tools / Agents
| Use | For |
|-----|-----|
| `/qc-council` · `/adversarial-council` | the cheat-sweep + the route-coverage verdict (cross-model raters; fact-check their output) |
| `/sgs-wp-engine` · `/sgs-db` · `python ~/.claude/hooks/wp-blocks.py dump` | DB-data fact-check (the authoritative source) |
| `/systematic-debugging` · `/verify-loop` | root-cause + 2-attestation per load-bearing claim |
| `/dispatching-parallel-agents` · `/subagent-driven-development` · `/subagent-prompt` | the subagent sweeps (RETURN data, never write shared files — STOP-2) |
| `/sgs-clone` · Playwright/Chrome-DevTools | the LANDED proof (creds `.claude/secrets/sandybrown.env`) |
| `/handoff` · `/doc-audit` · `/capture-lesson` | the OWED hygiene pass + session close |
| `wp-sgs-developer` agent | heavy build (interior-walker wiring) |

## OWED HYGIENE (do early — last session ran out of context)
- Full `/handoff`: assign a D-number for the unification merge (311c120f); update state.md's next-action cleanly (it drifted + couldn't be edited last session — the hook may inject a stale "BUILD W3"); registry/parking/docscore.
- Re-merge the full STOP catalogue + ritual + reading gate (above).

## Pre-flight ritual (answer in your first message)
1. Quote one VERIFIED fact from handoff.md (with how it was verified) to prove you read it — not the summary.
2. `git branch --show-current` (→ main), `git rev-parse --short HEAD` (→ 311c120f or later), D-ceiling (`grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1`).
3. Am I FACT-CHECKING (Task 1) before building, and verifying every subagent "covered/N-routes/no-cheating" claim against ground truth myself (STOP-30)?
4. Did I read the ENTIRE Spec 31 §3 + §12 (not greps) before judging universality?