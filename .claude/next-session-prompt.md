---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-23
primary_goal: "Resume the clean modular STAGE-BY-STAGE REBUILD of the cloning CSS-transfer pipeline (Spec 31 §12.6): step 2 = the modular scaffold (the dispatch table (block,layer,property,tier)→resolver + empty per-resolver file structure; F1 fixtures + F6 db-consistency already shipped), then step 3 = the stage-by-stage rebuild in pipeline order, Stage 2 (recognition / Method-2: route .sgs-hero→sgs/hero, not raw sgs/container) FIRST. Each stage is gated by the draft-derived ledger + render-oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set) before the next stage starts. convert.py stays FROZEN (D-MODULAR) — build fresh per-resolver files."
---

# Next session — stage-by-stage MODULAR REBUILD (Spec 31 §12.6 step 2 → step 3)

You are the rebuild orchestrator (always Opus). You plan, delegate to subagents, QC, live-verify, and commit; subagents do the implementation. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE SGS blocks driven by attributes, faithful on the real homepage, with zero cheats and zero silent drops.

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: verify against ground truth, never guess)
Tick each in your first message before any build action:
1. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §0 (end goal) + §12 (the build blueprint). §12.4 = modular architecture (per-resolver files behind ONE dispatch table), §12.6 = build sequence, §12.7 = Phase-F status + the gap-to-stage map. **Phase F (foundation) is COMPLETE; you are at §12.6 step 2.**
2. ☐ `.claude/reports/pipeline-routing-map-2026-06-17.html` — the 24-stage routing/logic map + M1/M2/M3 traces + the gap register. THE structural map the rebuild is built against.
3. ☐ `.claude/decisions.md` (head → D241) — D-truth + D-ceiling. D229 = the clean-modular-rebuild decision (D-MODULAR); D238–D241 = the F5 gate cluster + hardening.
4. ☐ `.claude/specs/22-...` (underlying architecture: §0 + FRs + R-22-* binding rules) + `.claude/cloning-pipeline-flow.md` / `-stages.md` (the as-is pipeline the rebuild maps from).
5. ☐ `.claude/state.md` + `.claude/parking.md` + the foundation modules under `plugins/sgs-blocks/scripts/` (`ledger/`, `oracle/`, `cheat-gate/`, `excluded-gate/`, `coverage-matrix/`, `db-consistency/`) — the spine the rebuild gates against.
6. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — read raw artefacts before ANY converter-quality conjecture.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (F4 `excluded_properties`), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-23, D241)
The cloning CSS-transfer **foundation (Phase F) is COMPLETE** — the draft-derived ledger, render-oracle, closed EXCLUDED set, db-consistency suite, and the F5 gate cluster are all built, armed, wired + hardened (D232–D241; 544 tests green). `convert.py` is FROZEN (D-MODULAR, D229): the rebuild builds FRESH per-resolver files, not edits to the 6,379-line legacy converter. This session's predecessor ran a full **doc audit** (commits `73fe1b95`/`efdc277b`/`1c803bde`) that archived 12 shipped/superseded plans and aligned every doc to Spec 31 §12 — so the doc set's statuses are now trustworthy. **The next BUILD step is the rebuild itself:** Spec 31 §12.6 **step 2** (the modular scaffold) then **step 3** (stage-by-stage, Stage 2 recognition/Method-2 first), each stage gated by the ledger+oracle before the next.

## First action (~5 min, zero deps)
Complete the reading gate + pre-flight ritual. Re-confirm ground truth: `git branch --show-current` (→ main), `git status`, `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (→ D241). Then read Spec 31 §12.4 + §12.6 + §12.7 end-to-end and state, in plain English, the dispatch-table shape before proposing the scaffold.

## Tasks

### Task 1 — Design + build the modular scaffold (Spec 31 §12.6 step 2)
**What:** the ONE dispatch table `(block, layer, property, tier) → resolver` (one entry point + one DB-sourced routing table, NOT a mega-function) + the empty per-resolver file structure (each resolver = its own file + frozen golden + metamorphic test) + remake the orchestrator against the routing map. F1 multi-shape fixtures + F6 db-consistency suite already exist.
**Why:** small single-purpose files = locatable failures, visible cheats, wirable gates (the giant-script failure mode D229 killed).
**Estimated time:** ~30 min design, then build.
**Orchestration:** inline (Opus) design → `/brainstorming` → `/adversarial-council` (Rule 7, shared-mechanism) → Bean design-gate BEFORE build → `/subagent-driven-development` (sonnet implementers + 2 reviewers). Subagents implement assigned files; never write shared design docs (STOP-2).
**Depends on:** reading gate. **/qc gate after:** `/qc-council` before commit. **Acceptance:** dispatch table resolves every `(block,layer,property,tier)` to exactly one resolver; db-consistency suite green; both conformance suites green.

### Task 2 — Stage-by-stage rebuild, Stage 2 (recognition / Method-2) first (§12.6 step 3)
**What:** rebuild each pipeline stage in order; Stage 2 first = route `.sgs-hero`→`sgs/hero` (and every class-section→its composite) instead of the raw `sgs/container` @conf 0.10 fallback. Then onward stages, each owning its mapped Tier-2 gap (§12.7 gap-to-stage map).
**Why:** Method-2 (native composite routing) is foundational, not deferred (§9 Q2); it is the biggest fidelity lever.
**Estimated time:** per-stage; do NOT batch stages.
**Orchestration:** per-stage `/brainstorming` → design-gate → SDD build → `/qc-council` → deploy → live computed-style verify on the canary (page 8). One stage at a time.
**Depends on:** Task 1. **/qc gate after:** ledger+oracle gate (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the fixture set) + Bean visual sign-off (R-22-13). **Acceptance:** the stage's declaration classes are end-to-end accounted AND landed on the multi-shape fixture set — not page 8 alone, not emit-green.

## Dependency graph
```
READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 modular scaffold (design-gate → SDD → /qc-council)   [convert.py FROZEN]
      → Task 2 stage-by-stage (Stage 2 recognition FIRST), each stage: design-gate → SDD → /qc-council → deploy → live-verify → ledger+oracle gate → Bean sign-off → next stage
          → commit path-scoped per stage (D-ceiling check before any new D → D241)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Cold prompts say "do NOT write/move/create any shared doc." Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every clone (orchestrator) + every `git commit` (`.githooks/pre-commit` + `f5-commit-gate.py`). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier.
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233).
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234; Gemini cross-family path is tool-blocked in the Windows harness).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236).
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237 — a council finding is a HYPOTHESIS; the F6 council had 2 false checks).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (prebuild's, not the module dir); prove the FAILURE path; inspect the committed baseline for stale plants.
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240 — the tier-blind F5 join masked 19 drops).
- **STOP-18 — Don't defer small residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker. Never "DEFERRED (polish)" with no evidence.
- **STOP-19 — A path-scoped `git commit -- $(git diff --cached --name-only)` can DROP the source-path deletion of a `git mv`** (rename detection emits the new path only) → the old file stays tracked in HEAD (duplicate). After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (NEW 2026-06-23, blub.db 364.)
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, `-m` before `--`; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). Bare commits are blocked by the path-scoped-commit gate (co-active threads on main). Subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure.**
- **Rebuild build-discipline (carried):** Deploy before measure (npm build + deploy + version bump before any pixel/DOM probe); root-cause FAMILY before instance fix (R-22-9); Gate A conformance + the F5 gates `--check` per commit; DB changes via dated `migrations/*.py` + full `/sgs-update` reseed, never manual; de-hardcode counts to `/sgs-db` pointers (never write a fixed number — it re-drifts); run gate suites PER-DIR (`pytest.ini` `--import-mode=importlib`).

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the MANDATORY READING GATE — Spec 31 §0/§12 + the routing map + decisions.md D229/D238–D241 + Spec 22 + state.md + parking.md + the foundation modules? (Quote one specific thing — e.g. the §12.6 step I'm on — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D241.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Is the change I'm about to make a CONVERT (native blocks from attrs), not a mirror? Does it touch a high-blast-radius mechanism (shared wrapper, walker, converter, ledger, oracle, gates, a rebuild stage) → has it had `/adversarial-council` or `/qc-council` + Bean design-gate BEFORE build (Rule 7)?
4. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree"? Am I verifying its test/gate claims myself from the canonical cwd (STOP-16)?
5. Will I gate this stage on the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set) AND live computed-style on the real homepage + Bean sign-off — not emit-green, not page 8 alone (Rules 4/5, STOP-3/4/5)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — any architectural / design decision (dispatch-table shape, per-stage design) BEFORE build |
| `/strategic-plan` + `/phase-planner` | ALWAYS — sequence the rebuild stages + break a stage into steps |
| `/adversarial-council` · `/qc-council` | Rule-7 design-gate on every shared-mechanism / stage change; validate fix-shapes; FACT-CHECK the council (STOP-15) |
| `/gap-analysis` | ALWAYS — grade a design/output before applying |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar mechanism; don't guess |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | orchestrate per-stage implementation (implementer + reviewers; cold prompts) |
| `/systematic-debugging` · `/verify-loop` | root-cause gate + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` · `/sgs-wp-engine` | run the pipeline / verify DB + block ground truth |
| `/capture-lesson` · `/handoff` | new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Playwright (chrome-devtools fallback on "Browser already in use") | live computed-style + draft-vs-clone render-diff on the real homepage — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify any DB/table/count claim (DB-authoritative; never hardcode a count) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a block/attr/schema claim before calling it missing |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy SGS build — resolver files, converter logic, render.php, migrations |
| general-purpose (sonnet) | per-stage implementers (under `/subagent-driven-development`) — implement assigned files, no shared-tree writes |
| general-purpose (opus) | cross-model adversarial review of a design/fix-shape before build |
| `code-reviewer` | spec + quality review per SDD task |

## Guardrails
convert.py stays FROZEN (D-MODULAR) — build fresh per-resolver files. Every shared-mechanism / per-stage change is design-gated (`/adversarial-council` or `/qc-council` + Bean approval) BEFORE build (Rule 7). Each stage gated by the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the multi-shape fixture set) + live computed-style on the real homepage + Bean visual sign-off (R-22-13) before the next stage. Deploy before measure. Path-scoped commits (`-m` before `--`); verify HEAD after rename commits (STOP-19); D-ceiling check before any new D (→ D241). Do NOT batch stages.
