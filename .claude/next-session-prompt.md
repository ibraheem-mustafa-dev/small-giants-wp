---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-23
primary_goal: "BEGIN Spec 31 §12.6 step 3 — the stage-by-stage modular rebuild, **Stage 2 (recognition / Method-2) FIRST**: route a draft `.sgs-hero` (and every native-composite BEM root) to its native composite block (`sgs/hero`, …) instead of raw `sgs/container`@conf-0.10. Each stage = its OWN `/brainstorming` → design-gate (Rule 7) → SDD build → `/qc-council` → deploy → live computed-style LANDED proof → ledger+oracle gate → Bean sign-off, THEN the next stage (do NOT batch). The D242/D243 vertical slice proved the SPINE (dispatch + conservation + gates + one OUTER property LANDED); generalisation to recognition/scalar/variant branches is EARNED per-stage, NEVER banked from the slice (A14). convert.py stays FROZEN (D-MODULAR); the old engine is NEVER a comparison oracle (D-B)."
---

# Next session — BEGIN step 3: stage-by-stage rebuild, Stage 2 (recognition) FIRST

You are the rebuild orchestrator (always Opus). You plan, delegate to subagents, QC, live-verify, and commit; subagents implement assigned files only. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE SGS blocks driven by attributes, faithful on the real homepage, with zero cheats and zero silent drops.

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: verify against ground truth, never guess)
Tick each in your first message before any build action:
1. ☐ **`.claude/plans/2026-06-23-modular-scaffold-design.md` v3** — the slice design (NOW BUILT). §2 (dispatch table + routing function), §3 (the typed Ctx/Decl + service signatures the new `converter/` already exposes), §8 (decommission trigger), and **§10 (BINDING A1–A15)** — esp. **A14** (generalisation deferred to per-resolver LANDED proof at each step-3 stage — never bank it from the slice) + **A11** (media_signal DB-source is pinned at the scalar stage).
2. ☐ **The BUILT slice code** under `plugins/sgs-blocks/scripts/converter/` — `dispatch_table.py` (routing), `context.py` (Ctx/Decl), `orchestrator.py` (process_element conservation spine + emit_block_markup), `resolvers/outer_box.py` (the ONE real resolver — the pattern to copy), `resolvers/{content_band,grid,grid_area,typography,scalar_content,scalar_media}.py` (the 6 GAP-stubs you will fill in, one per stage), `services/*.py` (the 7 typed services), `gates/{no_slug_literal,import_ban}.py` (armed), `coverage_report.py`, `README.md` (symptom→file map).
3. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.6 step 3 (build order) + **§12.7 gap-to-stage map** (Stage 2 owns: classification exhaustiveness → unknown slug = hard fail not empty emit; stale has_inner_blocks → derive at convert-time) + §3 (routing algorithm + the device-tier-vs-visual-breakpoint F-fork) + §2 (4 axes).
4. ☐ `.claude/decisions.md` (head → D243) — D-truth + D-ceiling. **D243 = the slice BUILT + LANDED** (the spine proven); D242 = its design-gate; D229 = D-MODULAR (build fresh, convert.py frozen); D230/D231 = the width model (align/maxWidth/contentWidth — outer_box's transfer rule); D238–D241 = the F5 gate cluster.
5. ☐ `.claude/specs/22-...` (underlying architecture: §0 + FRs + R-22-* binding rules — esp. **FR-22-20 + `variant_slots`/`blocks.variant_attr`** for recognition's variant routing) + `.claude/cloning-pipeline-flow.md` / `-stages.md` (the as-is pipeline + where Stage 2 recognition sits).
6. ☐ `.claude/state.md` + `.claude/parking.md` + the foundation modules under `plugins/sgs-blocks/scripts/` (`ledger/` F2 conservation, `oracle/` F3 verdict+capture, `cheat-gate/`, `excluded-gate/`, `coverage-matrix/`, `db-consistency/` F6) + `orchestrator/converter_v2/db_lookup.py` (the vetted attr-NAME resolver — `attr_for_property:1281`, `attr_for_layer_property:2400`, `_LAYER_PREFIXES:2385`, `_TYPOGRAPHY_CSS_SCOPE:1268`, `SGS_DB:30`).
7. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — read raw artefacts before ANY converter-quality conjecture.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (F4 `excluded_properties`), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. **(EACH step-3 stage needs its OWN design-gate before build — the slice's gate does NOT cover the recognition/scalar/variant stages.)**

## State recap (plain English, 2026-06-23, D243)
The cloning CSS-transfer **foundation (Phase F) is COMPLETE** (D232–D241). The **modular-scaffold VERTICAL SLICE is BUILT + LANDED + Bean-signed-off (D243)**: a fresh `converter/` modular home with 2 armed static anti-cheat gates, a block-naming-free dispatch table, typed Ctx/Decl, 7 services, the ONE real `outer_box` resolver (max-width→maxWidth), 6 honest GAP-stubs, an orchestrator with the conservation spine, and a Bean-visible coverage report. It was LANDED-proven on a live canary (the new engine's genuine `emit_block_markup()` output deployed → `oracle/verdict.py` = LANDED, computed max-width 1200px == draft, box actually 1200px, non-default). 580+6xfail tests green; `convert.py` byte-identical (D-MODULAR). **The architecture go/no-go on the whole rebuild is GO.** NEXT = step 3: rebuild each pipeline stage in order, **recognition (Stage 2 / Method-2) FIRST**, each stage earning its own LANDED proof.

## First action (~5 min, zero deps)
Complete the reading gate + pre-flight ritual. Re-confirm ground truth: `git branch --show-current` (→ main), `git status` (the lucide/phase4/theme-handoff dirty files are NOT yours — leave them), `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (→ D243). Then read the BUILT `converter/resolvers/outer_box.py` + `orchestrator.py` end-to-end (the pattern to extend) and §12.7's Stage-2 row, and state — in plain English — the recognition stage's architectural primitive (route a native-composite BEM root → its native composite block via the DB, name-free) BEFORE proposing the stage design. Then invoke `/brainstorming` for the Stage-2 design and `/adversarial-council` to gate it (Rule 7) — do NOT build recognition logic before its own design-gate.

## Tasks

### Task 1 — Stage 2 (recognition / Method-2) design-gate + build
**What:** Per Spec 31 §12.6 step 3 + §12.7 (Stage 2 owns classification exhaustiveness + stale has_inner_blocks). Design then build the recognition stage so a draft `.sgs-hero` (and every native-composite BEM root) routes to its native composite block (`sgs/hero`, `sgs/cta-section`, …) instead of raw `sgs/container`@conf-0.10 — name-free, DB-driven (`slots.standalone_block` / `block_composition` / `variant_slots` + `blocks.variant_attr` for the variant). Unknown slug → HARD FAIL (assert_never), never a silent empty emit. has_inner_blocks derived at convert-time from the save.js marker, not a cached column. Fill in the relevant stub resolver(s) with real logic; each earns its OWN draft-vs-clone LANDED proof (A14 — do NOT bank from the slice).
**Why:** Method-2 native-composite routing is the biggest fidelity lever; foundational, not deferred (§9 Q2 / §12.6 step 3).
**Estimated time:** per-stage; do NOT batch stages.
**Orchestration:** `/brainstorming` → `/adversarial-council` design-gate (Rule 7) + Bean approval → `/subagent-driven-development` (implementer + spec & quality reviewers; cold prompts say "implement only your assigned files; do NOT write shared docs or touch the shared git tree") → `/qc-council` before commit → deploy → live computed-style LANDED verify on the canary → ledger+oracle gate → Bean sign-off.
**Depends on:** reading gate + the Stage-2 design-gate. **/qc gate after:** ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED for the stage's declaration classes on the multi-shape fixture set, not page 8 alone) + draft-vs-clone LANDED + Bean visual sign-off (R-22-13). **Acceptance:** a `.sgs-hero` draft routes to `sgs/hero` (correct variant via `variant_slots`), its declarations are end-to-end accounted AND landed on the multi-shape fixture set, the recognition stub no longer emits UNIMPLEMENTED_STUB (the §3.2 stage gate fails if it does), convert.py byte-identical.

### Task 2 — (only after Task 1 + Bean sign-off) the next pipeline stage, in order
**What:** The next stage per §12.6 step 3 / the stage map (e.g. the scalar/child-shape fork — Stage 3c/4f — where `media_signal`'s DB-source is pinned, A11). Same per-stage ritual. Also arm the deferred gates as their inputs land: the **golden-source gate (A8)** + a **fixture-corpus conservation runnable** once the full draft walk produces many-element output (the slice's offline conservation is per-element; the corpus gate needs the walk).
**Why:** Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST (§12.1).
**Estimated time:** per-stage; do NOT batch.
**Orchestration:** identical per-stage ritual (brainstorm → design-gate → SDD → qc-council → deploy → live LANDED → ledger+oracle → Bean sign-off).
**Depends on:** Task 1. **Acceptance:** the stage's declaration classes end-to-end accounted AND landed on the multi-shape fixture set.

### Task 3 — continue stage-by-stage to the decommission trigger
**What:** Repeat per-stage until §8's decommission trigger: 100% of the multi-shape fixture set's declarations TRANSFER-and-LAND draft-vs-clone with zero UNACCOUNTED / zero UNROUTED / zero CHEAT — then `convert.py` is DELETED in the same commit the final stage swaps live (a consistency check FAILS if both `converter/orchestrator.py` and `converter_v2/convert.py` are importable by the live pipeline after the swap).
**Why:** No trigger = two engines forever = permanent tax (cynic MF-C).
**Acceptance:** the full multi-shape fixture set is TRANSFER-and-LAND green; convert.py deleted at swap.

## Dependency graph
```
READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 Stage 2 recognition: /brainstorming → /adversarial-council DESIGN-GATE (Rule 7) + Bean approval
      → SDD build (fill recognition stub w/ real logic) → /qc-council → deploy → live LANDED → ledger+oracle → Bean sign-off
        → Task 2 next stage (its OWN design-gate → SDD → qc-council → deploy → live LANDED → sign-off)
          → … repeat per-stage (do NOT batch) → Task 3 decommission trigger (delete convert.py at final swap)
            → commit path-scoped per stage (D-ceiling check before any new D → D243)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Cold prompts say "do NOT write/move/create any shared doc." Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every clone (orchestrator) + every CC `git commit` (`.claude/hooks/f5-commit-gate.py`, wired in `settings.json`; the slice's 2 static gates are now in its `_GATES` list). NOTE: the shared `.githooks/pre-commit` does NOT run F5 + `core.hooksPath` is unset → a real *terminal* commit skips F5 (P-F5 follow-up; the CC-side hook is the live floor). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. (The slice routes a non-device-tier breakpoint → UNACCOUNTED/gap, never coerced — design §10 A4, `Decl.tier` carries `Other:<cond>`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess). **This is Task 1's core — the recognition stage routes the variant via the DB, never an `if slug ==`.**
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0` (oracle guard 1 already does this).
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233). (The slice's LANDED probe rendered the new-engine output in the SAME live WP env it measures — apples-to-apples.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234; Gemini cross-family path is tool-blocked in the Windows harness). (Used this session to harden the no-slug-literal gate past the design forms.)
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236). (The 2 slice gates baselined clean = 0; key by source-hash, not line.)
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS; the D242 council's scariest claim "the commit gate doesn't exist" was FALSE).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path (plant a violation → exit 1); inspect the committed baseline for stale plants. (Done for both slice gates this session.)
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240 — the tier-blind F5 join masked 19 drops). (The slice's conservation keys on full (block,layer,property,tier) identity.)
- **STOP-18 — Don't defer small residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — A path-scoped `git commit -- $(git diff --cached --name-only)` can DROP the source-path deletion of a `git mv`** (rename detection emits the new path only) → the old file stays tracked in HEAD (duplicate). After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (blub.db 364.)
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs (the stall trap); make LANDED (rendered-output matches draft), NOT conservation/coverage-green, the headline signal; and DOUBLE-VERIFY a design before build (`/adversarial-council` for "what breaks" + conformance audits for "matches spec/rules/goal") then FACT-CHECK the verifiers** (D242, blub.db 366). **PROVEN this session: the slice landed one real property and that GO is worth more than 16 empty stubs.**
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style + verdict.py — NOT by new-vs-frozen attr equivalence** (D243, this session). Recipe: build the markup via `orchestrator.emit_block_markup()` (the real engine output, NOT a convert.py clone) → REST-create a FRESH canary page (guard-safe; the wp-content-guard blocks post_content REWRITES like `str_replace`/`wp post update`, not REST page CREATE) → anonymous Playwright `getComputedStyle` (no admin bar) → feed a `RenderedObservation`/`CellInput` to `oracle/verdict.py compute_section_result` → require `VERDICT=LANDED` (all 4 guards green, non-default vs the block.json default). Equivalence to a D234 clone value is supporting evidence, never the proof (STOP-4). Delete the test page after. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, `-m` before `--`; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them; exclude `__pycache__` from staging). Bare commits are blocked by the path-scoped-commit gate (co-active threads on main). Subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure.**
- **Rebuild build-discipline (carried):** Deploy before measure (npm build + deploy + version bump before any pixel/DOM probe — though pure-Python `converter/` needs no npm build); root-cause FAMILY before instance fix (R-22-9); Gate A conformance + the F5 gates `--check` per commit; DB changes via dated `migrations/*.py` + full `/sgs-update` reseed, never manual; de-hardcode counts to `/sgs-db` pointers (never write a fixed number — it re-drifts); run gate suites PER-DIR or scoped (the combined `pytest` run hits pre-existing `orchestrator/converter_v2/test_*.py` collection errors that import cwd-relative `convert` — scope to `ledger oracle cheat-gate excluded-gate db-consistency coverage-matrix converter` for a clean regression).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the MANDATORY READING GATE — design doc §3/§10 + the BUILT `converter/` code (outer_box + orchestrator + dispatch_table) + Spec 31 §12.6-step-3/§12.7 + the routing map + decisions.md D243/D242/D229/D230-231 + Spec 22 (FR-22-20 variants) + state.md + parking.md + the foundation modules? (Quote one specific thing — e.g. the §12.7 Stage-2 gap I'll own first, or the outer_box pattern I'll copy — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D243.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Is the change I'm about to make a CONVERT (native blocks from attrs via the DB), not a mirror? Have I design-gated THIS stage (the slice's gate does NOT cover recognition) via `/brainstorming` + `/adversarial-council` + Bean approval BEFORE building (Rule 7)?
4. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree"? Am I verifying its test/gate claims myself from the canonical cwd + proving the FAILURE path (STOP-16)?
5. Will I gate this stage on the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED for the stage's declaration classes on the MULTI-SHAPE fixture set) AND draft-vs-clone LANDED (computed-style + verdict.py, STOP-21) + Bean sign-off — not emit-green, not conservation-green, not page 8 alone (Rules 4/5, STOP-3/4/5, §10 A1/A14)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — the Stage-2 recognition design (and every per-stage design) BEFORE build |
| `/adversarial-council` · `/qc-council` | Rule-7 design-gate on each step-3 stage; validate fix-shapes; FACT-CHECK the council (STOP-15/20) |
| `/strategic-plan` + `/phase-planner` | sequence the stage build steps + break a stage into steps |
| `/gap-analysis` | ALWAYS — grade a design/output before applying |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar mechanism; don't guess |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | orchestrate per-stage implementation (implementer + reviewers; cold prompts) |
| `/systematic-debugging` · `/verify-loop` | root-cause gate + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` · `/sgs-wp-engine` | run the pipeline / verify DB + block ground truth (esp. `variant_slots` + `blocks.variant_attr` for recognition) |
| `/capture-lesson` · `/handoff` | new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | the draft-vs-clone LANDED check — live computed-style on the deployed canary section (STOP-21 recipe) — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify any DB/table/count claim (DB-authoritative; never hardcode a count) — esp. `variant_slots`, `blocks.variant_attr`, `slots.standalone_block`, `block_composition` |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a block/attr/schema claim before calling it missing |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy SGS build — resolver files, services, render.php, migrations |
| general-purpose (sonnet) | per-file implementers (under `/subagent-driven-development`) — implement assigned files, no shared-tree writes |
| general-purpose (opus) | cross-model adversarial review of a stage design/fix-shape before build |
| `code-reviewer` | spec + quality review per SDD task |

## Guardrails
Each step-3 stage gets its OWN `/brainstorming` → design-gate (Rule 7, `/adversarial-council` + Bean approval) BEFORE build — the slice's D242 gate does NOT cover recognition/scalar/variant. Build FRESH by filling the existing `converter/resolvers/<id>.py` stubs with real logic (copy the `outer_box.py` pattern); convert.py stays FROZEN (D-MODULAR) — the old engine is NEVER a comparison oracle (D-B). Each resolver earns its OWN draft-vs-clone LANDED proof (A14 — never bank generalisation from the slice). The 2 static gates are armed; arm the golden-source gate (A8) + fixture-corpus conservation runnable when the full walk lands. Deploy/measure via the STOP-21 recipe. Path-scoped commits (`-m` before `--`, exclude `__pycache__`); verify HEAD after any rename commit (STOP-19); D-ceiling check before any new D (→ D243). Do NOT batch step-3 stages.
