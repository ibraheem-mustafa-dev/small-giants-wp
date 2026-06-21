---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-20
primary_goal: "FINISH Phase-F step F5 (the gate cluster), then the stage-by-stage rebuild. F2/F3-core/F4/F6 DONE; F5 is PARTIAL (check_no_mirror armed with a legacy baseline, `6193f3e9`/D236 — but NOT auto-wired, and the other 5 F5 gates remain OPEN, `P-F5-REMAINING`). Smallest remaining piece = wire the clone orchestrator to call `pipeline-stage-gate.py` so check_no_mirror auto-runs (closes the STOP-6 gap). Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: finish Phase-F step F5 (the gate cluster), then the stage-by-stage rebuild

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each.** Tick them in your first message:

1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.2.5 (MF-5 gates EXIST + WIRED) + §12.7 F5 row + §7a (check-converter-cheats 7 checks) + §5 (coverage matrix) + §12.0 (D-MODULAR — fresh scripts, convert.py FROZEN legacy).
2. ☐ `P-F5-REMAINING` in `parking.md` — the authoritative list of the 5 OPEN F5 gates + the orchestrator-wire. Read it end-to-end; it names each gate's scope.
3. ☐ The F5-partial ground truth (read the SCRIPTS, file:line — STOP-1): `plugins/sgs-blocks/scripts/orchestrator/check_no_mirror.py` (its WIRING NOTE block names the `# R-22-15 WIRE POINT` in `pipeline-stage-gate.py`) + `pipeline-stage-gate.py` (the NEW post-clone gate) + the clone orchestrator `sgs-clone-orchestrator.py` (confirm it does NOT yet call pipeline-stage-gate.py — the STOP-6 gap). Plus `.claude/plans/2026-06-18-f4-excluded-properties-design.md` §3 (the EXCLUDED-literal gate's hardened requirements — the F5 hand-off).
4. ☐ The F6 module you'll mirror the fresh-module pattern from (DONE this session): `plugins/sgs-blocks/scripts/db-consistency/` (7 checks + run.py + resolver_bridge that IMPORTS live converter constants + baseline + 51 tests). Each F5 gate is a fresh single-purpose script + tests, wired to something that RUNS.
5. ☐ `.claude/decisions.md` D232 (F2) + D233/D234 (F3) + D235 (F4) + D236 (F5-partial) + **D237 (F6 SHIPPED)** + the GROUND-TRUTH-FIRST block in `.claude/state.md`.

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole rebuild existed to end. Do not.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (the F4 `excluded_properties` table), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, the EXCLUDED set, DB-consistency, the orchestrator) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-20 close — D237)
The cloning CSS-transfer system is being **rebuilt clean** (Spec 31 §12) — a Tier-1 FOUNDATION (ledger + oracle + EXCLUDED table + armed gates + DB-consistency) built BEFORE any stage, then a stage-by-stage rebuild gated by it. **DONE:** F1 (fixtures); F2 (draft-derived CSS Accounting Ledger, `ledger/`, D232); F3-core (LANDED render-oracle, `oracle/`, D234); F4 (closed `excluded_properties` table ships EMPTY, D235); **F6 (DB-as-code consistency suite, `db-consistency/`, 7 checks/51 tests/0 violations, D237 — re-grounded on the lift surface after a qc-council→adversarial-council NO-GO + fact-check; retired check-composition-sync.py).** **F5 PARTIAL (D236):** the anti-mirror gate `check_no_mirror.py` is armed with a committed legacy baseline (10 keys / 13 instances) — BUT it does NOT auto-run yet (the orchestrator doesn't call `pipeline-stage-gate.py` — STOP-6 gap) and the OTHER 5 F5 gates are OPEN (`check-converter-cheats.py`, `generate-coverage-matrix.py`, the pipeline-close ledger checker, the EXCLUDED-literal gate, the PreToolUse git hook). **NEXT = F5-remaining**, smallest piece first (the orchestrator-wire), then the stage-by-stage rebuild.

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D237**). Confirm the foundation green: `cd plugins/sgs-blocks && python -m pytest scripts/ledger/tests/ scripts/oracle/tests/ scripts/orchestrator/test_check_no_mirror_baseline.py scripts/db-consistency/tests/ -q` (→ 167 + 181 + 10 + 51 pass). Read `check_no_mirror.py`'s WIRING NOTE + grep `sgs-clone-orchestrator.py` for any `pipeline-stage-gate` call (confirm absent = the STOP-6 gap).

## Tasks

### Task 1 — Wire check_no_mirror to auto-run (close STOP-6) [smallest F5 piece]
**What:** make the clone orchestrator (`sgs-clone-orchestrator.py`) invoke `pipeline-stage-gate.py` after the converter writes `extract.json`, so `check_no_mirror.py --enforce --baseline` actually runs on every clone (today it's armed+baselined+tested but NEVER called).
**Why:** a gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing (STOP-6). This is the smallest remaining F5 piece and removes the one overclaim risk.
**Estimated time:** ~15 min.
**Orchestration:** inline (Opus) OR a single sonnet implementer (no commit authority). Rule-7 (orchestrator change) → quick `/qc-inline` or design-gate if the wire touches the run sequence non-trivially. Look for the `# R-22-15 WIRE POINT` comment in `pipeline-stage-gate.py`; confirm `pipeline-stage-gate.py` is itself invoked by the orchestrator (if not, that's the real gap — wire it post-converter).
**Depends on:** none. **/qc gate after:** run a real clone, confirm check_no_mirror fires + a planted NEW draft-class violation makes the clone fail (exit 1).
**Acceptance:** a clone run demonstrably executes check_no_mirror and FAILS on a planted new violation — NOT "the call was added".

### Task 2 — Build the other 4 F5 gates (each its own design→council→build) [Spec 31 §12.2.5 + §7a + §5]
**What (per `P-F5-REMAINING`):** (a) `check-converter-cheats.py` (§7a, whole-tree + PHP/CSS, 7 checks — BASELINE the legacy `_SUFFIX_ATTR_OVERRIDES`/`prop_map`/`_BP_SUFFIX_MAP` violations, do NOT edit convert.py); (b) `generate-coverage-matrix.py` (§5 dashboard, secondary); (c) the pipeline-close ledger checker (UNACCOUNTED/WRITTEN-not-LANDED join of F2∪F3∪F4∪gap — its LANDED leg needs F3-runtime); (d) the EXCLUDED-literal gate per the F4 design §3 hand-off (import-graph-wide scan, content-hashed self-blessing baseline, inline/anonymous-set detection, explicit F2/F3/lint delegation, Python pre-commit wiring); (e) the PreToolUse git-commit hook in `.claude/settings.json`.
**Why:** without ALL gates armed+wired, "no silent drops / cheat-proof" is theatre (the council's fatal-flaw finding).
**Estimated time:** ~30–45 min per gate.
**Orchestration:** each gate is its own `/brainstorming` → `/adversarial-council` (or `/qc-council`) → Bean gate → SDD (sonnet implementer, NO commit authority, NO shared-file writes, RETURN data) → `/qc-inline`/`/qc-council` before commit. Do NOT batch — high-blast. Per STOP-14, run each gate against current output FIRST + baseline today's violations.
**Depends on:** Task 1 first (smallest). **/qc gate after:** each gate proven to FAIL on a planted violation + wired to something that runs.
**Acceptance:** per the §12.7 done-when of each; F3-runtime (full-37, cache, pixel-diff, deploy choreography) DEFERRED until the rebuild first renders many fixtures.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 (orchestrator-wire — smallest; inline or 1 sonnet → /qc-inline → commit)
      → Task 2 (per-gate: /brainstorming → /adversarial-council → Bean → SDD → /qc → commit)  [do NOT batch]
          → stage-by-stage rebuild (§12.6 step 3; per stage: design→council→SDD→ledger+oracle gate, before next stage)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); Gate A conformance; D-ceiling check before any new D (→ D237); convert.py UNTOUCHED
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw artefacts, Spec 31 §12, the design doc, the routing map. The MANDATORY READING GATE is non-skippable. Even a fixture's `.expected.md` can be STALE. Verify the block's CURRENT attr model before trusting a doc's bug claim. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every audit/review/extraction cold prompt MUST say "return findings in your final message; do NOT write/edit/create any shared file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. SDD IMPLEMENTERS that create a NEW module dir are fine; never give them commit/deploy authority. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** A ledger fed by the converter's recognised set / the same gap-bearing DB is circular and hides drops. (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. Only LANDED (live computed-style = draft on a NON-DEFAULT fixture) closes a cell. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** A value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger+oracle. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Distinguish "code can check" from "something runs the check on every build/clone". LIVE (D236): check_no_mirror was armed+baselined+tested but the orchestrator does NOT call `pipeline-stage-gate.py` → does NOT auto-run → Task 1 this session. A run-output gate (needs a clone `run_dir`) CANNOT wire into `prebuild` (static); wire it post-clone. Before claiming "enforced", grep for the wiring + confirm it RUNS. (`dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1). (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = canonical {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. A mechanical/Haiku agent can't make this call. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST. An empty section scores a FALSE pixel-diff WIN — gate on `innerText.length>0`. (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS (R-22-8) is necessary but NOT sufficient before reusing/renaming/retiring it. Grep how it's WRITTEN and READ first. Baseline against the LIVE DB, not the doc. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (D233).** Reuse infra (R-22-1) but CHECK the reused tool's assumptions match your data. (`parity-bem-class-blind-spot`.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace (D234).** The Gemini cross-family rater is tool-blocked in the Windows harness; trace the cardinal-sin questions branch-by-branch yourself rather than skip the diversity lens. (blub 255/359.)
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output to check the precondition; don't assume clean (D236).** If dirty, use the §12.6-step-1 BASELINE pattern: enumerate + commit today's legacy violations as a baseline, fail only on NEW ones, baseline shrinks as the rebuild fixes them. (`gate-arm-needs-precondition-check-then-baseline`.)
- **STOP-15 — Validate routing/variant claims against inputs the pipeline can ACTUALLY produce, NOT a synthetic attr dict; run an adversarial-council AFTER a qc-council; then fact-check the council against ground truth (NEW, D237).** A `/qc-council` "empirically validated" the F6 hero fix by feeding `detect_variant` a `splitGap` key the CSS lift cannot produce — the realistic input resolves to `None`. The `/adversarial-council` caught the synthetic input + that check #1's `block_selectors` disambiguator references a table the resolver never reads + that `role` is the wrong proxy for liftability. The fact-check then overturned TWO of the council's own proposed checks as FALSE (`leaf`+`has_inner_blocks=1` is the documented IN-F state, convert.py:5084). Derive test inputs from the real lift surface (`resolver_bridge.lift_producible_attrs`). (`validate-routing-claims-against-pipeline-producible-inputs`.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe. **block.json `supports.sgs.*` meta is NON-VISUAL** — commit with `--no-verify` (the visual-diff gate's own documented path). **Editor-push for live render:** cloned markup → canary via the editor `wp.data` path, NOT REST post_content. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **Root-cause FAMILY before instance fix** (R-22-9). **Gate A** `scripts/tests/test_converter_conformance.py` (pre-commit) is the live converter conformance suite. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit (`/sgs-update` does NOT auto-run migrations — run them manually). **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m before --; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure.** **Verify subagent + council claims against ground truth** — "correct per spec" can mean "correct per a buggy spec line"; a council finding is a HYPOTHESIS (R-22-7).

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — Spec 31 §12.2.5/§12.7 F5 + §7a + `P-F5-REMAINING` + the F5-partial scripts (check_no_mirror + pipeline-stage-gate + the orchestrator) + the F6 module pattern + D232–D237? (Quote one specific thing — e.g. the `# R-22-15 WIRE POINT` location — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D237.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.)
3. Have I DESIGN-GATED each F5 gate (Rule 7) — `/brainstorming` → `/adversarial-council`/`/qc-council` → Bean approval — BEFORE building? Did I run it against the CURRENT output to check the precondition + baseline current violations (STOP-14)? Is it wired to something that RUNS (STOP-6)?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files / NO commit authority"? Did I commit valuable artefacts first? Am I verifying its claims (and any council finding) against ground truth, not trusting "correct per spec"? Am I NOT editing convert.py (D-MODULAR)?
5. What is the MEASURABLE acceptance — the gate demonstrably REJECTS a planted violation + runs on every clone/build — NOT "gate written"/"tests green alone"? Is this Rule-7 high-blast? → council BEFORE the commit. Am I validating against pipeline-producible inputs, not synthetic ones (STOP-15)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | MANDATORY for each F5 gate design BEFORE building |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any pre-commit-hook / AST-scan / import-graph pattern you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if an F5 gate needs a formal step breakdown |
| `/adversarial-council` · `/qc-council` | on each F5 gate design (Rule 7); MANDATORY before every gate/SGS-block/oracle commit (blub 255); a council finding is a HYPOTHESIS — fact-check it (STOP-15) |
| `/qc-inline` | bounded single-gate tasks (e.g. the orchestrator-wire) |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-gate dispatch (subagents implement, NO commit authority, NO shared-file writes) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | DB ground truth for any gate that queries tables (DB-authoritative) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES (query before "missing X") |
| Playwright (chrome-devtools fallback on "Browser already in use") | live computed-style verification on the canary — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | F5 gate implementers — NO commit/deploy authority, NO shared-file writes, return uncommitted |
| general-purpose (opus) | cross-model adversarial code-review before commit |
| general-purpose (haiku) | 2nd cross-family rater on `/qc-council` (NOT breakpoint/architecture judgment). [Gemini path tool-blocked — STOP-13.] |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |

## Guardrails
This is the only active workstream. It owns convert.py (FROZEN legacy — do NOT edit, D-MODULAR) + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + the modular foundation (`ledger/` F2, `oracle/` F3, the `excluded_properties` table F4, the armed `check_no_mirror` F5-partial, the `db-consistency/` suite F6) + the OPEN F5 gates. ALL are Rule-7 high-blast → design-gate. `/qc-council`/`/qc-inline` + Gate A + the F2 ledger `--check` + the F3 oracle tests + the F6 `db-consistency --check` (now in prebuild) + the F5 baseline test per commit. D-ceiling check before any new D (→ D237). **F5 is PARTIAL** — the 5 gates + the check_no_mirror orchestrator-wire are OPEN (`P-F5-REMAINING`); do NOT treat F5 as done. **F6 is DONE** (7 checks/51 tests/0 violations) — do NOT rebuild it. F3-RUNTIME (full-37 / cache / pixel-diff / deploy-orchestration / %-calc-vw length / MR-1/MR-3) DEFERRED.
