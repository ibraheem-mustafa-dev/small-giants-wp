---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-21
primary_goal: "BEGIN the stage-by-stage clean modular rebuild (Spec 31 §12.6 step 3). The Tier-1 FOUNDATION is COMPLETE (F1–F6 + the F5 gate cluster all SHIPPED, armed + WIRED — D239). The rebuild's prerequisite is the exhaustive pipeline routing/logic chart (§11, `.claude/reports/pipeline-routing-map-2026-06-17.html`); the first stage is recognition/match (Stage 2) made universal across ALL block-shapes, design-gated. Mama's parity is the METRIC (content 100%; full mobile 61.82/tablet 59.09/desktop 55.45%), not the goal."
---

# Next session — CLONING CSS-TRANSFER: begin the stage-by-stage rebuild (the foundation is DONE)

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess, assume, or proceed under-read)

This rebuild has failed repeatedly because sessions GUESSED, ASSUMED things were missing, or reasoned from a doc's cached status instead of ground truth. **You may not propose a fix-shape, dispatch a subagent, or write code until you have READ IN FULL and can self-attest to each.** Tick them in your first message:

1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.6 (build sequence — step 3 is the stage-by-stage rebuild you are starting) + §11 (STAGE-BY-STAGE, no deferrals; the routing-map chart is the prerequisite) + §12.4 (D-MODULAR per-resolver files) + §1–§3 (the lift paths, the 4 axes, the DB-driven routing algorithm) + §9 Q2 (Method-2 is foundational, built at its stage).
2. ☐ `.claude/reports/pipeline-routing-map-2026-06-17.html` — the exhaustive start→every-finish routing chart. §11 says building begins ONLY after this chart proves every stage's every-route reachability. If it is stale/incomplete, refreshing it is the FIRST task.
3. ☐ The COMPLETE foundation you build ON TOP OF (read the modules, file:line — STOP-1): `plugins/sgs-blocks/scripts/ledger/` (F2 declare_input + the F5 `coverage_check.py` UNACCOUNTED gate) · `oracle/` (F3-core; the LANDED leg `check_landed()` is DEFERRED) · `db-consistency/` (F6) · `cheat-gate/` + `excluded-gate/` + `coverage-matrix/` (the F5 gates) · `orchestrator/check_no_mirror.py` + `pipeline-stage-gate.py` (wired into `sgs-clone-orchestrator.py`) · `.claude/hooks/f5-commit-gate.py` (the commit gate). Each stage you rebuild is GATED by these (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the fixture set) before the next stage starts.
4. ☐ The fixture corpus the rebuild is tested against: `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/` (README + the absent-shape + red-team fixtures) + the conformance fixtures.
5. ☐ `.claude/decisions.md` D232 (F2) + D234 (F3) + D235 (F4) + D237 (F6) + **D238 (F5 STOP-6 wire) + D239 (F5 COMPLETE)** + the GROUND-TRUTH-FIRST block in `.claude/state.md` + `P-F5-RESIDUALS` in `parking.md` (the deferred follow-ups).

**If you skip the reading and start guessing, you WILL recreate the exact failure this whole rebuild existed to end. Do not.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block/wrapper action — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (the F4 `excluded_properties` table), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, the EXCLUDED set, DB-consistency, the orchestrator, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-21 close — D239)
The cloning CSS-transfer system is being **rebuilt clean** (Spec 31 §12) — a Tier-1 FOUNDATION (ledger + oracle + EXCLUDED table + armed/wired gates + DB-consistency) built BEFORE any stage, then a stage-by-stage rebuild gated by it. **THE FOUNDATION IS NOW COMPLETE.** DONE: F1 (fixtures); F2 (draft-derived CSS Accounting Ledger, `ledger/`, D232); F3-core (LANDED render-oracle, `oracle/`, D234); F4 (closed `excluded_properties` table, ships EMPTY, D235); F6 (DB-as-code consistency suite, `db-consistency/`, D237); **F5 COMPLETE (D238+D239) — the gate cluster: check_no_mirror auto-wired into the clone orchestrator + `check-converter-cheats` (cheat-gate/) + EXCLUDED-literal gate (excluded-gate/) + coverage-matrix (coverage-matrix/) + the pipeline-close ledger checker (ledger/coverage_check.py, UNACCOUNTED leg) + the `f5-commit-gate.py` PreToolUse hook + prebuild/prestart wiring. All armed (STOP-14 baselines) + WIRED to run (STOP-6 closed). 511 tests green.** **NEXT = the stage-by-stage rebuild** (§12.6 step 3): start at the pipeline's beginning, make each stage handle EVERY block/variable/outcome universally, cheat-checked by the F5 gates + gated by the ledger+oracle, BEFORE touching the next stage. **DEFERRED (P-F5-RESIDUALS, not blocking):** F3-RUNTIME (the LANDED leg — arms `coverage_check.check_landed()` + the matrix's COVERED/CHEAT), 2 D2-reparse precision gaps, the cheat-gate tuple-key dict gap, the combined-pytest collision (run gate suites per-dir).

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D239**). Confirm the foundation green (run per-dir — combined `pytest scripts/` collides on module basenames): `cd plugins/sgs-blocks && for d in cheat-gate excluded-gate coverage-matrix ledger db-consistency oracle; do python -m pytest scripts/$d/tests/ -q; done` (→ 30 + 31 + 20 + 198 + 51 + 181 pass). Then OPEN the routing-map chart (§11) and judge whether it is current enough to sequence the rebuild against — if not, refreshing it is Task 1.

## Tasks

### Task 1 — Validate (or refresh) the pipeline routing/logic chart [the §11 prerequisite]
**What:** confirm `.claude/reports/pipeline-routing-map-2026-06-17.html` maps the WHOLE pipeline start→every finish point (every routing choice, branch/if, DB table/column check, terminal outcome) and is current vs the live code. §11 forbids starting the stage rebuild until the chart proves every stage's every-route reachability.
**Why:** the chart is the ground truth the stage-by-stage build is sequenced + completeness-checked against. A stale chart = building blind.
**Estimated time:** ~30 min (validate) / longer if a refresh is needed.
**Orchestration:** inline (Opus) read + a parallel `Explore`/sonnet pass to diff the chart against the live `orchestrator/` tree if a refresh is needed. **/qc gate after:** the chart accounts for every stage + every terminal outcome present in the code.
**Depends on:** the reading gate. **Acceptance:** every pipeline stage + branch + DB check is on the chart, verified against the code — NOT "the chart exists".

### Task 2 — Begin Stage 2 (recognition/match) rebuild, universal across ALL block-shapes [§12.6 step 3, §9 Q2]
**What:** rebuild the first pipeline stage (recognition/match — incl. Method-2 native-composite routing `.sgs-hero`→`sgs/hero`, foundational not deferred) as a per-resolver modular increment (D-MODULAR), handling every block/variant/outcome universally, cheat-checked by the F5 gates, BEFORE any CSS-lift stage.
**Why:** building one route at a time bakes in route-specific decisions that harm other routes + force rebuilds (Bean lock §12.0). Universality is proven per STAGE.
**Estimated time:** a multi-session stage; scope the first increment tight (one done-when).
**Orchestration:** `/brainstorming` → `/adversarial-council`/`/qc-council` → **Bean design-gate (Rule 7)** → SDD (sonnet implementers, NO commit authority, NO shared-file writes, create own module dirs) → `/qc` + the ledger+oracle gate before the next stage. Do NOT batch stages.
**Depends on:** Task 1. **/qc gate after:** the stage passes zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set (the F3 LANDED leg arms as part of this — see P-F5-RESIDUALS). **Acceptance:** the rebuilt stage is proven UNIVERSAL across all block-shapes on the fixture set + cheat-gate-clean — NOT "Mama's looks better".

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 (validate/refresh the routing chart — inline + 1 Explore diff → /qc)
      → Task 2 (Stage 2 rebuild: /brainstorming → /adversarial-council → Bean gate → SDD → ledger+oracle gate)  [do NOT batch stages]
          → subsequent stages in pipeline order, each gated before the next (§12.6 step 3)
each commit: path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); Gate A conformance; the F5 commit-gate runs the gates; D-ceiling check before any new D (→ D239); convert.py UNTOUCHED (D-MODULAR)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never propose a fix-shape, dispatch a build, or assert built/not-built from a doc's cached status. Read the implementing SCRIPT (file:line), the raw artefacts, Spec 31 §12, the design doc, the routing map. The MANDATORY READING GATE is non-skippable. Even a fixture's `.expected.md` can be STALE. Verify the block's CURRENT attr model before trusting a doc's bug claim. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every audit/review/extraction cold prompt MUST say "return findings in your final message; do NOT write/edit/create any shared file." Orchestrator owns shared writes. Commit valuable artefacts BEFORE dispatching file-capable subagents. SDD IMPLEMENTERS that create a NEW module dir are fine; never give them commit/deploy authority. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** A ledger fed by the converter's recognised set / the same gap-bearing DB is circular and hides drops. (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. Only LANDED (live computed-style = draft on a NON-DEFAULT fixture) closes a cell. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** A value recognised right at stage 2 can be dropped at stage 4. Gate each stage on the end-to-end ledger+oracle. (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Distinguish "code can check" from "something runs the check on every build/clone". CLOSED (D238/D239): check_no_mirror auto-runs via pipeline-stage-gate.py (post-clone); the 4 static gates run via `f5-commit-gate.py` (every `git commit`) + prebuild/prestart. Before claiming "enforced", grep for the wiring + confirm it RUNS. (`dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1). (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = canonical {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. A mechanical/Haiku agent can't make this call. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`, never guess. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST. An empty section scores a FALSE pixel-diff WIN — gate on `innerText.length>0`. (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS (R-22-8) is necessary but NOT sufficient before reusing/renaming/retiring it. Grep how it's WRITTEN and READ first. Baseline against the LIVE DB, not the doc. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (D233).** Reuse infra (R-22-1) but CHECK the reused tool's assumptions match your data. (`parity-bem-class-blind-spot`.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace (D234).** The Gemini cross-family rater is tool-blocked in the Windows harness; trace the cardinal-sin questions branch-by-branch yourself rather than skip the diversity lens. (blub 255/359.)
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output to check the precondition; don't assume clean (D236).** If dirty, use the §12.6-step-1 BASELINE pattern: enumerate + commit today's legacy violations as a baseline, fail only on NEW ones, baseline shrinks as the rebuild fixes them. (`gate-arm-needs-precondition-check-then-baseline`.)
- **STOP-15 — Validate routing/variant claims against inputs the pipeline can ACTUALLY produce, NOT a synthetic attr dict; run an adversarial-council AFTER a qc-council; then fact-check the council against ground truth (D237).** A `/qc-council` "empirically validated" the F6 hero fix by feeding `detect_variant` a `splitGap` key the CSS lift cannot produce; the `/adversarial-council` caught the synthetic input; the fact-check then overturned TWO of the council's own proposed checks as FALSE. Derive test inputs from the real lift surface (`resolver_bridge.lift_producible_attrs`). (`validate-routing-claims-against-pipeline-producible-inputs`.)
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS, not ground truth (NEW, D239).** Re-run the suite AND the gate's `--check` YOURSELF from the project's CANONICAL cwd (the one prebuild uses), not the module dir — cwd-dependent passes hid a bare-import `ModuleNotFoundError` (coverage-matrix) + a regex false-positive (cheat-gate flagged the block name `cta-section` as a CSS property; fixed via DB `property_suffixes` membership). Prove the FAILURE path (planted violation → exit 1, then revert), not just the happy path. Inspect the committed baseline for stale plant entries (a subagent overflow baked one in). (`verify-subagent-test-claims-from-canonical-cwd`.)
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. the responsive tier/media; run an adversarial-council on BUILT gates (D240).** The F5 `coverage_check` join keyed `produced` on `(selector,property)` but `expected` on `(selector,property,tier)` → a base-tier match silently masked a drop at every other breakpoint (0 UNACCOUNTED while a real responsive drop shipped). Fixing the join surfaced 19 hidden cross-tier drops. A gate's value is its FAILURE path, which happy-path self-QC doesn't exercise — red-team a built enforcement gate ("how do I keep it green while cheating?") before trusting it; when an identity axis is hard to recover on one side, COUNT-as-unaccounted (loud) rather than collapse (silent pass). (`coverage-gate-join-must-key-full-declaration-identity`.)
- **Deploy before measure** — convert.py needs no build; block.json/render.php/style.css/theme changes need `npm run build` (PowerShell) + deploy + version bump (Hostinger CDN 7-day) BEFORE any pixel/DOM probe. **block.json `supports.sgs.*` meta is NON-VISUAL** — commit with `--no-verify` (the visual-diff gate's own documented path). **Editor-push for live render:** cloned markup → canary via the editor `wp.data` path, NOT REST post_content. Creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **Root-cause FAMILY before instance fix** (R-22-9). **Gate A** `scripts/tests/test_converter_conformance.py` (pre-commit) is the live converter conformance suite. **DB changes reproducible** from a dated `migrations/*.py` OR `block.json supports.sgs`, verified by a FULL `/sgs-update` reseed — never a manual DB edit (`/sgs-update` does NOT auto-run migrations — run them manually). **Commit path-scoped** (`git commit -m "msg" -- <paths>`, -m before --; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit); subagents NEVER `git checkout/restore/stash/reset/clean` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in the architecture, not reassure.** **Verify subagent + council claims against ground truth** — "correct per spec" can mean "correct per a buggy spec line"; a council finding is a HYPOTHESIS (R-22-7).

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — Spec 31 §12.6/§11/§12.4 + the routing-map chart + the COMPLETE foundation modules (ledger incl. coverage_check + oracle + db-consistency + the F5 gates + the wiring) + D232–D239? (Quote one specific thing — e.g. a resolver file path or a §12.6 step — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D239.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.)
3. Have I DESIGN-GATED this rebuild stage (Rule 7) — `/brainstorming` → `/adversarial-council`/`/qc-council` → Bean approval — BEFORE building? Is the stage proven UNIVERSAL across all block-shapes, gated by the ledger+oracle (STOP-5), not just on Mama's?
4. For any subagent I dispatch: did I tell it "return data, do NOT write shared files / NO commit authority"? Did I commit valuable artefacts first? Am I verifying its claims (and any council finding) against ground truth, AND re-running its tests/gates from the canonical cwd + proving the failure path (STOP-16)? Am I NOT editing convert.py (D-MODULAR)?
5. What is the MEASURABLE acceptance — the stage demonstrably handles every block-shape with zero UNACCOUNTED + zero WRITTEN-not-LANDED + cheat-gate-clean — NOT "code shipped"/"tests green alone"/"Mama's improved"? Is this Rule-7 high-blast? → council BEFORE the commit. Am I validating against pipeline-producible inputs, not synthetic ones (STOP-15)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | MANDATORY for each rebuild stage design BEFORE building |
| `/gap-analysis` | ALWAYS — grade any unit/plan vs its acceptance before delivery |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar pattern (AST, import-graph, transpiler correctness) you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | the stage-by-stage rebuild needs a formal phase breakdown |
| `/adversarial-council` · `/qc-council` | on each rebuild stage design (Rule 7); MANDATORY before every converter/SGS-block/oracle commit (blub 255); a council finding is a HYPOTHESIS — fact-check it (STOP-15) |
| `/qc-inline` · `/qc` | bounded single-unit tasks / end-to-end stage verification |
| `/subagent-driven-development` · `/subagent-prompt` · `/dispatching-parallel-agents` | per-stage dispatch (subagents implement, NO commit authority, NO shared-file writes; re-verify their tests from the canonical cwd — STOP-16) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone+deploy / DB reseed / schema + attr TYPES + variant_slots ground truth |
| `/systematic-debugging` · `/verify-loop` · `/capture-lesson` · `/handoff` | root-cause / 2-attestation / new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | DB ground truth for any stage that queries tables (DB-authoritative) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | block schema + attr TYPES (query before "missing X") |
| Playwright (chrome-devtools fallback on "Browser already in use") | live computed-style verification on the canary — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| general-purpose (sonnet) | stage-rebuild implementers — NO commit/deploy authority, NO shared-file writes, return uncommitted; re-verify their tests from the canonical cwd (STOP-16) |
| general-purpose (opus) | cross-model adversarial code-review before commit |
| general-purpose (haiku) | 2nd cross-family rater on `/qc-council` (NOT breakpoint/architecture judgment). [Gemini path tool-blocked — STOP-13.] |
| `wp-sgs-developer` | heavier WP/block.json/render.php work |

## Guardrails
This is the only active workstream. It owns convert.py (FROZEN legacy — do NOT edit, D-MODULAR) + the homepage pipeline + the SHARED `SGS_Container_Wrapper` + /sgs-update seeding + the COMPLETE modular foundation (`ledger/` F2+coverage_check, `oracle/` F3, the `excluded_properties` table F4, `db-consistency/` F6, the `cheat-gate/`+`excluded-gate/`+`coverage-matrix/` F5 gates, `check_no_mirror`+`pipeline-stage-gate` + the `f5-commit-gate.py` commit hook) + the stage-by-stage rebuild. ALL are Rule-7 high-blast → design-gate. `/qc-council`/`/qc-inline` + Gate A + the F2 ledger `--check` + the F3 oracle tests + the F6 + F5 gates' `--check` (now in prebuild + the commit hook) per commit. D-ceiling check before any new D (→ D239). **F5 is COMPLETE** — do NOT rebuild the gates; build the rebuild stages ON TOP of them. **F3-RUNTIME** (the LANDED leg + matrix COVERED/CHEAT) + the other `P-F5-RESIDUALS` items arm as part of the rebuild. Run gate test suites PER-DIR (combined `pytest scripts/` collides on module basenames).
