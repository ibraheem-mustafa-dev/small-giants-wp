---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-23
primary_goal: "BUILD the modular-scaffold VERTICAL SLICE (Spec 31 §12.6 step 2, vertical-slice form, design-gated as D242): the orchestrator + the ONE DB-driven dispatch table (block,layer,property,tier)→resolver + context + the ONE `outer_box` resolver wired end-to-end through its services + 6 GAP-stubs, proving ONE real property (OUTER `max-width`→`maxWidth`) TRANSFERS-and-LANDS draft-vs-clone on the rt-centred-maxwidth fixture AND on a real canary page-8 section (Rule 5). The build is driven by `.claude/plans/2026-06-23-modular-scaffold-design.md` v3 — §3 (slice) + §10 (BINDING conformance corrections). F6 baseline + the anti-cheat gates wired BEFORE any resolver logic. convert.py stays FROZEN (D-MODULAR); the old engine is NEVER a comparison oracle (D-B)."
---

# Next session — BUILD the modular-scaffold VERTICAL SLICE (design-gated D242)

You are the rebuild orchestrator (always Opus). You plan, delegate to subagents, QC, live-verify, and commit; subagents implement assigned files only. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE SGS blocks driven by attributes, faithful on the real homepage, with zero cheats and zero silent drops.

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: verify against ground truth, never guess)
Tick each in your first message before any build action:
1. ☐ **`.claude/plans/2026-06-23-modular-scaffold-design.md` v3 — THE build spec for this session.** §0/§0.1 (the 3 Bean decisions D-A/D-B/D-C), §2 (dispatch table + routing function), §3 (what gets BUILT this slice + the typed Ctx/Decl + service signatures), §4 (the draft-vs-clone correctness gate + §4.1 anti-cheat gates), and **§10 — the BINDING conformance corrections (A1–A15)** from the 3-auditor pass. §10 is non-optional: it amends §2–§9.
2. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §0 (end goal) + §12 (build blueprint; §12.4 modular architecture, §12.6 build sequence — you are at step 2 vertical-slice form, §12.7 gap-to-stage map) + §2 (4 axes) + §3 (the 8-step routing algorithm + MF-3/MF-4 + the device-tier-vs-visual-breakpoint F-fork).
3. ☐ `.claude/decisions.md` (head → D242) — D-truth + D-ceiling. D229 = D-MODULAR (build fresh, convert.py frozen); D238–D241 = the F5 gate cluster; **D242 = THIS design-gate** (vertical slice + the 3 Bean decisions).
4. ☐ `.claude/specs/22-...` (underlying architecture: §0 + FRs + R-22-* binding rules) + `.claude/cloning-pipeline-flow.md` / `-stages.md` (the as-is pipeline the rebuild maps from).
5. ☐ `.claude/state.md` + `.claude/parking.md` + the foundation modules under `plugins/sgs-blocks/scripts/` (`ledger/` F2 conservation, `oracle/` F3 verdict+capture — BOTH BUILT, `cheat-gate/`, `excluded-gate/`, `coverage-matrix/`, `db-consistency/` F6) + `orchestrator/converter_v2/db_lookup.py` (the vetted attr-NAME resolver the services wrap — `attr_for_property:1289`, `attr_for_layer_property:2400`, `_writer_path:1367`, `_LAYER_PREFIXES:2385`) — the spine the slice wires INTO.
6. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — read raw artefacts before ANY converter-quality conjecture.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (F4 `excluded_properties`), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. **(The slice's DESIGN is already gated — D242. Any DEVIATION from design doc §3/§10 needs a fresh gate.)**

## State recap (plain English, 2026-06-23, D242)
The cloning CSS-transfer **foundation (Phase F) is COMPLETE** (D232–D241; 544 tests green; gates armed+wired). This session's predecessor **PASSED the design-gate (D242)** for the modular scaffold: it designed the dispatch-table + resolver architecture, ran a 6-persona `/adversarial-council` (graded D/D+, CONDITIONAL GO — the headline was "16 empty stub files = the stall trap, build a VERTICAL SLICE instead"), fact-checked the council against the code (fixed 3 real ground-truth errors, dismissed 1 false council claim), got Bean to ratify **3 decisions**, ran **3 conformance audits** (spec/anti-cheat/end-goal, all GO), and wrote the corrected, APPROVED design doc v3. **`convert.py` is FROZEN (D-MODULAR) — build FRESH per-resolver files, never edit the 6,379-line legacy converter.** The NEXT step is the BUILD of the slice.

**Bean's 3 ratified decisions (BINDING — supersede the council where they differ):**
- **D-A — VERTICAL SLICE, not horizontal scaffold.** Build ONE resolver (`outer_box`, `max-width`→`maxWidth`) end-to-end first; prove the architecture on one LANDED property before the rest. Other resolvers ship one-per-stage in step 3.
- **D-B — NO shadow-mode / NO new-vs-old comparison.** The old `convert.py` is NEVER an oracle or golden source. The ONLY correctness comparison is **draft-vs-clone** (the F3 render-oracle). convert.py stays frozen+live for un-rebuilt stages, deleted at 100% coverage (design §8).
- **D-C — MF-4 fail-loud is report-only first** (run F6, baseline today's ≥2-candidate ambiguities, fail only on NEW — the D236 pattern).

## First action (~5 min, zero deps)
Complete the reading gate + pre-flight ritual. Re-confirm ground truth: `git branch --show-current` (→ main), `git status` (the lucide/phase4/theme-handoff dirty files are NOT yours — leave them), `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (→ D242). Then read design doc §3 + §10 end-to-end and state, in plain English, the smallest first build step (recommended: run F6 in report mode + baseline the ≥2-candidate count, per D-C) before writing any resolver code.

## Tasks

### Task 1 — F6 baseline + wire the anti-cheat gates (BEFORE any resolver logic)
**What:** Run the F6 db-consistency suite, baseline today's ≥2-candidate ambiguities (D-C / STOP-14). Then build + wire the slice's anti-cheat gates per design §4.1 + §10 (A5–A10): the AST no-slug-literal gate (A7), the import-ban gate, the golden-source gate that mechanically re-captures (A8), the conservation test asserting disjointness (A10), and `test_unrouted_fails.py` (A9) — each with a stated RUN-TRIGGER (prebuild suite + `f5-commit-gate.py`) and a report-mode baseline first (A6).
**Why:** A gate built AFTER the resolver can be written to pass the resolver's cheat. Gates first = the resolver is born under enforcement (R-22-12 structural, not prompt).
**Estimated time:** ~25 min.
**Orchestration:** inline (Opus) F6 run; `/subagent-driven-development` (sonnet implementers + spec & quality reviewers) for the gate files. Opus self-verifies every gate's `--check` + plants a violation to prove exit-1 from the canonical cwd (STOP-16).
**Depends on:** reading gate. **/qc gate after:** `/qc-council` before commit. **Acceptance:** each gate runs on a planted violation (exit 1, proven by Opus), baselines clean on current output, and is wired to something that runs (grep the invocation — STOP-6).

### Task 2 — Build the vertical slice (orchestrator + dispatch table + `outer_box` end-to-end)
**What:** Per design §3 — `converter/orchestrator.py` (matches the `walk`/`convert_page` seam, NOT swapped live yet) + `dispatch_table.py` (the DB-sourced routing function §2) + `context.py` (typed `Ctx`/`Decl`, §3.1) + the ONE real `resolvers/outer_box.py` (`max-width`→`maxWidth`/`align`, D230/D231) + the services it calls (`layer_detect attr_resolve tier_suffix value_serialise token_snap validate gap_writer`, typed signatures §3.1) + 6 `GAP(origin="UNIMPLEMENTED_STUB")` stub resolvers + `coverage_report.py`. Honour §10: non-device-tier breakpoint → UNACCOUNTED never coerced (A4); LANDED is the headline signal not conservation (A1); media_signal NOT faked inline (A11).
**Why:** Prove the dispatch/conservation/gate SPINE on one real landed property — the cheap go/no-go on the whole rebuild. (Generalisation to hard branches is DEFERRED to per-resolver proof, §10 A14 — do NOT bank it from the slice.)
**Estimated time:** per-file; ~45–60 min across the slice.
**Orchestration:** `/subagent-driven-development` (implementer + spec & quality reviewers per file); Opus orchestrates all shared-file writes (STOP-2); cold prompts say "implement only your assigned files; do NOT write shared docs or touch the shared git tree". `/qc-council` before commit.
**Depends on:** Task 1. **/qc gate after:** ledger+oracle gate (zero UNACCOUNTED + zero WRITTEN-not-LANDED for `maxWidth` on the slice fixtures) + draft-vs-clone LANDED on a real page-8 section (Rule 5, A3) + Bean visual sign-off (R-22-13). **Acceptance:** `outer_box` transfers `maxWidth` AND the F3 oracle (`oracle/verdict.py` on `capture.py` computed-style of the DEPLOYED canary section) confirms it LANDS draft-vs-clone; conservation + totality + the 4 anti-cheat gates green; 6 stubs `xfail`; coverage report renders; convert.py byte-identical.

### Task 3 — (only after Task 2 + Bean sign-off) begin step-3 stage-by-stage, Stage 2 recognition first
**What:** Per Spec 31 §12.6 step 3 — rebuild each pipeline stage in order, Stage 2 (recognition / Method-2: route `.sgs-hero`→`sgs/hero`, not raw `sgs/container` @conf 0.10) first; each stage builds its resolver(s) with real logic + earns its OWN draft-vs-clone LANDED proof (§10 A14).
**Why:** Method-2 native-composite routing is the biggest fidelity lever; foundational, not deferred (§9 Q2).
**Estimated time:** per-stage; do NOT batch stages.
**Orchestration:** per-stage `/brainstorming` → design-gate (Rule 7) → SDD → `/qc-council` → deploy → live computed-style verify on canary page 8 → ledger+oracle gate → Bean sign-off → next stage.
**Depends on:** Task 2. **/qc gate after:** ledger+oracle + Bean visual sign-off per stage. **Acceptance:** the stage's declaration classes are end-to-end accounted AND landed on the multi-shape fixture set — not page 8 alone, not emit-green.

## Dependency graph
```
READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 F6 baseline + wire anti-cheat gates (SDD → /qc-council)   [gates BEFORE resolver logic]
      → Task 2 vertical slice: orchestrator + dispatch table + outer_box end-to-end (SDD → /qc-council
        → deploy → draft-vs-clone LANDED on page 8 → Bean sign-off)   [convert.py FROZEN]
          → Task 3 step-3 stage-by-stage (Stage 2 recognition FIRST), each stage its own design-gate → SDD
            → /qc-council → deploy → live-verify → ledger+oracle gate → Bean sign-off → next stage
              → commit path-scoped per stage (D-ceiling check before any new D → D242)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Cold prompts say "do NOT write/move/create any shared doc." Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every clone (orchestrator) + every CC `git commit` (`.claude/hooks/f5-commit-gate.py`, wired in `settings.json`). NOTE: the shared `.githooks/pre-commit` does NOT run F5 + `core.hooksPath` is unset → a real *terminal* commit skips F5 (P-F5 follow-up; the CC-side hook is the live floor). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. (Slice: a non-device-tier breakpoint → UNACCOUNTED, never coerced — design §10 A4.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234; Gemini cross-family path is tool-blocked in the Windows harness).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS; the D242 council's scariest claim "the commit gate doesn't exist" was FALSE).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (prebuild's, not the module dir); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240 — the tier-blind F5 join masked 19 drops). (Slice: the MF-4 candidate join keys on full `(block,layer,property)` identity — design §3.1.)
- **STOP-18 — Don't defer small residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — A path-scoped `git commit -- $(git diff --cached --name-only)` can DROP the source-path deletion of a `git mv`** (rename detection emits the new path only) → the old file stays tracked in HEAD (duplicate). After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (blub.db 364.)
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs (the stall trap); make LANDED (rendered-output matches draft), NOT conservation/coverage-green, the headline signal; and DOUBLE-VERIFY a design before build (`/adversarial-council` for "what breaks" + conformance audits for "matches spec/rules/goal") then FACT-CHECK the verifiers — they catch each other's false findings** (D242, blub.db 366; conservation goes 100% green while transferring nothing).
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, `-m` before `--`; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). Bare commits are blocked by the path-scoped-commit gate (co-active threads on main). Subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure.**
- **Rebuild build-discipline (carried):** Deploy before measure (npm build + deploy + version bump before any pixel/DOM probe); root-cause FAMILY before instance fix (R-22-9); Gate A conformance + the F5 gates `--check` per commit; DB changes via dated `migrations/*.py` + full `/sgs-update` reseed, never manual; de-hardcode counts to `/sgs-db` pointers (never write a fixed number — it re-drifts); run gate suites PER-DIR (`pytest.ini` `--import-mode=importlib`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the MANDATORY READING GATE — design doc §3/§10 + Spec 31 §0/§12 + the routing map + decisions.md D229/D238–D242 + Spec 22 + state.md + parking.md + the foundation modules? (Quote one specific thing — e.g. the §10 binding correction I'll honour first — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D242.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Is the change I'm about to make a CONVERT (native blocks from attrs), not a mirror? Does it deviate from the gated design doc §3/§10 → does the deviation need a fresh `/adversarial-council` or `/qc-council` + Bean design-gate BEFORE build (Rule 7)?
4. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree"? Am I verifying its test/gate claims myself from the canonical cwd + proving the FAILURE path (STOP-16)?
5. Will I gate the slice on the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED for `maxWidth` on the fixtures) AND draft-vs-clone LANDED on a REAL page-8 section + Bean sign-off — not emit-green, not conservation-green, not page 8 alone (Rules 4/5, STOP-3/4/5, §10 A1/A3)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — any architectural / design decision (a per-stage design in Task 3) BEFORE build |
| `/strategic-plan` + `/phase-planner` | ALWAYS — sequence the slice build steps + break a stage into steps |
| `/adversarial-council` · `/qc-council` | Rule-7 design-gate on any DEVIATION from the gated design + each step-3 stage; validate fix-shapes; FACT-CHECK the council (STOP-15/20) |
| `/gap-analysis` | ALWAYS — grade a design/output before applying |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar mechanism; don't guess |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | orchestrate the slice + per-stage implementation (implementer + reviewers; cold prompts) |
| `/systematic-debugging` · `/verify-loop` | root-cause gate + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` · `/sgs-wp-engine` | run the pipeline / verify DB + block ground truth |
| `/capture-lesson` · `/handoff` | new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | the draft-vs-clone LANDED check — live computed-style on the deployed canary page-8 section — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify any DB/table/count claim (DB-authoritative; never hardcode a count) — incl. the F6 ≥2-candidate baseline |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a block/attr/schema claim before calling it missing |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy SGS build — resolver files, services, render.php, migrations |
| general-purpose (sonnet) | per-file implementers (under `/subagent-driven-development`) — implement assigned files, no shared-tree writes |
| general-purpose (opus) | cross-model adversarial review of a design/fix-shape before build |
| `code-reviewer` | spec + quality review per SDD task |

## Guardrails
Build is driven by `.claude/plans/2026-06-23-modular-scaffold-design.md` v3 — §3 (slice) + §10 (BINDING). convert.py stays FROZEN (D-MODULAR) — build FRESH `converter/` files; the old engine is NEVER a comparison oracle (D-B). F6 baseline + anti-cheat gates wired BEFORE resolver logic (Task 1 before Task 2). Each gate: report-mode baseline first (STOP-14), wired to something that runs (STOP-6), with a planted-failure proof (STOP-16). The slice gates on draft-vs-clone LANDED on a REAL page-8 section + Bean sign-off (Rules 4/5, R-22-13) — NOT conservation-green, NOT emit-green (§10 A1/A3). Deploy before measure. Path-scoped commits (`-m` before `--`); verify HEAD after any rename commit (STOP-19); D-ceiling check before any new D (→ D242). Generalisation to hard branches is DEFERRED to per-resolver proof (§10 A14) — do NOT bank it from the slice. Do NOT batch step-3 stages.
