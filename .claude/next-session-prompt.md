---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-26
primary_goal: "CONTINUE Spec 31 §12.6 step 3 — the stage-by-stage modular rebuild. Stage 2 (recognition / Method-2) is DONE + LANDED + universal (D244). NEXT = the next pipeline stage IN ORDER: the slot-list / scalar-media child-shape fork (Stage 3c / 4f) — fill the relevant `converter/resolvers/*` stub(s) with real logic so a recognised composite's CHILD content (the scalar/media slots: quote, image, video, icon, …) extracts + lands. Each stage = its OWN `/brainstorming` → `/adversarial-council` design-gate (Rule 7) → SDD build → `/qc-council` → deploy → live computed-style LANDED proof → ledger+oracle gate → Bean sign-off, THEN the next stage (do NOT batch). Build FRESH from Spec 22/31 + the DB + the draft; the frozen `convert.py` is NEVER the reference or oracle (STOP-22). Generalisation is EARNED per-stage, never banked (A14)."
---

# Next session — CONTINUE step 3: the next pipeline stage (slot-list / scalar-media child-shape fork)

You are the rebuild orchestrator (always Opus). You plan, delegate to subagents, QC, live-verify, and commit; subagents implement assigned files only. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE SGS blocks driven by attributes, faithful on the real homepage, with zero cheats and zero silent drops.

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: verify against ground truth, never guess)
Tick each in your first message before any build action:
1. ☐ **`.claude/plans/2026-06-23-stage2-recognition-design.md` v2** — the Stage-2 design that JUST SHIPPED (D244). §1 (the recognise() contract + branches), §2 (variant via BEM modifier ↔ `variant_slots`), §9 (council folds). This is the PATTERN to copy for the next stage's design.
2. ☐ **The BUILT Stage-2 code** under `plugins/sgs-blocks/scripts/converter/` — `recognition.py` (the 4-branch recogniser — the pattern), `services/{has_inner,recognise_helpers,variant_detect}.py`, `context.py` (Recognition + Ctx), plus the BUILT `resolvers/outer_box.py` (the ONE real CSS-transfer resolver — the pattern for filling a resolver stub) + the 5 remaining GAP-stubs (`content_band,grid,grid_area,scalar_content,scalar_media,typography`).
3. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §12.6 step 3 (build order) + **§12.7 gap-to-stage map** (the next stage owns: scalar-media `<video>`/caption swallow → no content-dropping `continue`; pseudo-elements; non-device-tier breakpoints) + §3 (routing algorithm + the device-tier-vs-visual-breakpoint F-fork) + §2 (4 axes).
4. ☐ `.claude/decisions.md` (head → **D244**) — D-truth + D-ceiling. **D244 = Stage 2 recognition BUILT + LANDED + universal** (the pattern proven); D243 = the vertical slice (outer_box); D229 = D-MODULAR (build fresh, convert.py frozen); D230/D231 = the width model.
5. ☐ `.claude/specs/22-...` (underlying architecture: §0 + FRs + R-22-* binding rules — esp. **FR-22-2/FR-22-2.5** for array/child-slot emission + `slots.standalone_block` for child-block routing) + `.claude/cloning-pipeline-flow.md` / `-stages.md` (the as-is pipeline + where the child-shape fork sits).
6. ☐ `.claude/state.md` + `.claude/parking.md` + the foundation modules under `plugins/sgs-blocks/scripts/` (`ledger/` F2 conservation, `oracle/` F3 verdict+capture, `cheat-gate/`, `excluded-gate/`, `coverage-matrix/`, `db-consistency/` F6) + `orchestrator/converter_v2/db_lookup.py` (the vetted attr-NAME resolver — the ONLY permitted import from the frozen tree).
7. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — read raw artefacts before ANY converter-quality conjecture.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (F4 `excluded_properties`), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. **(EACH step-3 stage needs its OWN design-gate before build — Stage 2's gate does NOT cover the next stage.)**

## State recap (plain English, 2026-06-26, D244)
The cloning CSS-transfer **foundation (Phase F) + the modular VERTICAL SLICE (outer_box) are COMPLETE** (D232–D243). **Step-3 Stage 2 (recognition / Method-2) is now DONE + LANDED + universal + Bean-signed-off (D244):** the fresh `converter/` engine recognises a draft `.sgs-hero`→`sgs/hero` with `variant=split` (BEM modifier ↔ `variant_slots.variant_value`) and the genuine `emit_block_markup()` output renders live on a canary as a true `wp-block-sgs-hero` with the exclusive `sgs-hero--split` class — proven universal across all 10 variants (hero ×4, testimonial ×6). Built name-free from Spec 22 FR-22-3 + the DB + the draft (never `convert.py`). 75 converter + 603 scoped-regression tests green; `no_slug_literal` hardened; `convert.py` byte-identical (D-MODULAR). **NEXT = the next pipeline stage in order: the slot-list / scalar-media child-shape fork (Stage 3c/4f)** — extract + land a recognised composite's CHILD content (the scalar/media slots). Recognition produces the block identity + variant; this stage produces the content that makes content-gated blocks (testimonial etc.) actually render.

## First action (~5 min, zero deps)
Complete the reading gate + pre-flight ritual. Re-confirm ground truth: `git branch --show-current` (→ main), `git status` (the lucide/phase4/theme-handoff dirty files are NOT yours — leave them), `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (→ D244). Then read the BUILT `converter/recognition.py` + `resolvers/outer_box.py` end-to-end (the patterns to copy) + §12.7's Stage-3c/4f row, and state — in plain English — the next stage's architectural primitive (extract a recognised composite's child scalar/media slots → emit them as child InnerBlocks / typed attrs, DB-driven via `slots.standalone_block` + FR-22-2.5) BEFORE proposing the stage design. Then invoke `/brainstorming` for the design and `/adversarial-council` to gate it (Rule 7) — do NOT build before its own design-gate.

## Tasks

### Task 1 — Next pipeline stage (slot-list / scalar-media child-shape fork) design-gate + build
**What:** Per Spec 31 §12.6 step 3 + §12.7 (this stage owns: scalar-media `<video>`/caption swallow → no content-dropping `continue`; route unconsumed children to walk/gap). Design then build so a recognised composite's CHILD content (quote/image/video/icon/etc.) extracts from the draft and emits as the right child blocks/attrs — DB-driven via `slots.standalone_block` + FR-22-2/2.5 (array-item child emission). Fill the relevant `converter/resolvers/*.py` stub(s) with real logic (copy the `outer_box.py` pattern); each earns its OWN draft-vs-clone LANDED proof (A14 — do NOT bank from Stage 2).
**Why:** Recognition (Stage 2) sets the block + variant; this stage produces the CONTENT that makes content-gated blocks (testimonial etc.) render at all — the next biggest fidelity lever (§12.7).
**Estimated time:** per-stage; do NOT batch stages.
**Orchestration:** `/brainstorming` → `/adversarial-council` design-gate (Rule 7) + Bean approval → `/subagent-driven-development` (implementer + spec & quality reviewers; cold prompts: "implement only your assigned files; do NOT write shared docs or touch the shared git tree; reuse the cited db_lookup/services, build no parallel mechanism") → `/qc-council` before commit → deploy → live computed-style LANDED verify on the canary → ledger+oracle gate → Bean sign-off.
**Depends on:** reading gate + the design-gate. **/qc gate after:** ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED for the stage's declaration classes on the multi-shape fixture set) + draft-vs-clone LANDED + Bean visual sign-off (R-22-13). **Acceptance:** a recognised composite's child content extracts + lands draft-vs-clone (e.g. a testimonial with a quote renders the quote; a hero split-image renders the image), the stub no longer emits UNIMPLEMENTED_STUB, convert.py byte-identical.

### Task 2 — (only after Task 1 + Bean sign-off) the next pipeline stage, in order
**What:** The next stage per §12.6 step 3 / the stage map (e.g. cascade resolver Stage 4b — pseudo-elements + non-device-tier breakpoints; or the typed-attr/grid lift Stage 4c/4e). Same per-stage ritual.
**Why:** Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST (§12.1).
**Orchestration:** identical per-stage ritual. **Depends on:** Task 1.

### Task 3 — continue stage-by-stage to the decommission trigger
**What:** Repeat per-stage until §8's decommission trigger: 100% of the multi-shape fixture set's declarations TRANSFER-and-LAND draft-vs-clone with zero UNACCOUNTED / zero UNROUTED / zero CHEAT — then `convert.py` is DELETED in the same commit the final stage swaps live.
**Acceptance:** the full multi-shape fixture set is TRANSFER-and-LAND green; convert.py deleted at swap.

### Side task — seed the scalar slot data gap
`slots.standalone_block` is 40/103 populated; the 63 unmapped element-slots loud-fail (UNRECOGNISED) honestly. Seed via `/sgs-update` (dated migration + reseed, never manual — `db-changes-reproducible-via-migration`) to unblock scalar recognition coverage; baseline today's unmapped-slot UNRECOGNISED set before arming `coverage_report --check` as a build-blocker.

## Dependency graph
```
READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 (child-shape fork): /brainstorming → /adversarial-council DESIGN-GATE (Rule 7) + Bean approval
      → SDD build (fill resolver stub w/ real logic) → /qc-council → deploy → live LANDED → ledger+oracle → Bean sign-off
        → Task 2 next stage (its OWN design-gate → SDD → qc-council → deploy → live LANDED → sign-off)
          → … repeat per-stage (do NOT batch) → Task 3 decommission trigger (delete convert.py at final swap)
            → commit path-scoped per stage (D-ceiling check before any new D → D244)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Cold prompts say "do NOT write/move/create any shared doc." Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every clone + every CC `git commit` (`.claude/hooks/f5-commit-gate.py` `_GATES`, wired in `settings.json`). `no_slug_literal` + `import_ban` are in `_GATES`; `coverage_report --check` runs in the test suite (orchestrator is a namespace pkg that only resolves under -m/pytest). Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier (`Decl.tier` carries `Other:<cond>`).
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess). **Stage 2 proved this — variant = BEM modifier matched to variant_slots.variant_value, name-free.**
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. **NOTE: a content-gated block (testimonial) renders EMPTY without content BY DESIGN — that's a Stage-4f content concern, not a recognition miss (D244 A14 finding).**
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep how it's WRITTEN and READ first.
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233). (Stage 2's LANDED probe rendered the new-engine output in the SAME live WP env it measures — apples-to-apples.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234; Gemini cross-family path is tool-blocked in the Windows harness).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236). (The scalar-slot UNRECOGNISED baseline is the live example — baseline the 63 unmapped slots before arming coverage --check as a blocker.)
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS; this session a council "hero is broken" premise + my own "FR-22-4 drops hero" + "variant detection impossible" were ALL falsified by the live run / the DB).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path (plant a violation → exit 1); inspect the committed baseline for stale plants. (Done for every gate this session.)
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer small residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker.
- **STOP-19 — A path-scoped `git commit -- $(git diff --cached --name-only)` can DROP the source-path deletion of a `git mv`** (rename detection emits the new path only). After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (blub.db 364.)
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs; make LANDED the headline signal, NOT conservation/coverage-green; and DOUBLE-VERIFY a design before build (`/adversarial-council` for "what breaks" + conformance audits for "matches spec/rules/goal") then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: build markup via `recognise()`/resolver → `orchestrator.emit_block_markup()` → REST-create a FRESH canary page (guard-safe; the wp-content-guard blocks post_content REWRITES, not REST page CREATE) → anonymous Chrome-DevTools/Playwright `getComputedStyle`/classList (no admin bar) → require the block-identity-exclusive marker + non-default. Delete the test page after. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`). **PROVEN this session: all 10 variants landed via this recipe.**
- **STOP-22 (NEW, D244) — The frozen `convert.py` is NEVER the design reference or the fact-check oracle for a rebuild stage.** The authority is Spec 31/22 + the modern DB tables (`variant_slots`, `slots`, `block_composition`) + the draft. Reading the broken engine to learn "how it's done" imports its assumptions + brokenness → the rebuild silently re-implements it (project-threatening). `convert.py` is consulted ONLY to NAME the bug being killed. Tell `/adversarial-council` + `/qc-council` raters to fact-check against Spec+DB+draft, never the engine. This session a council "variant detection is impossible" verdict + my own "FR-22-4 drops hero" root-cause were BOTH false — anchored on the broken source. (`feedback_rebuild_stage_authority_is_spec_and_db.md`.)
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, `-m` before `--`; pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours; exclude `__pycache__`). Bare commits are blocked by the path-scoped-commit gate. Subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure** (this session he overturned 3 of my wrong conclusions that way).
- **Rebuild build-discipline (carried):** Deploy before measure (pure-Python `converter/` needs no npm build, but DB/render changes need deploy); root-cause FAMILY before instance fix (R-22-9); the F5 gates `--check` per commit; DB changes via dated `migrations/*.py` + full `/sgs-update` reseed, never manual; de-hardcode counts to `/sgs-db` pointers; run gate suites PER-DIR or scoped (`ledger oracle cheat-gate excluded-gate db-consistency coverage-matrix converter`, `--import-mode=importlib`) for a clean regression.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the MANDATORY READING GATE — the Stage-2 design + the BUILT `converter/` code (recognition.py + outer_box.py + services) + Spec 31 §12.6-step-3/§12.7 child-shape row + the routing map + decisions.md D244/D243/D229 + Spec 22 (FR-22-2/2.5 child emission) + state.md + parking.md + the foundation modules? (Quote one specific thing — e.g. the §12.7 Stage-3c/4f gap I'll own, or the outer_box pattern I'll copy — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D244.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Is the change I'm about to make a CONVERT (native blocks/attrs from the draft via the DB), not a mirror? Have I design-gated THIS stage (Stage 2's gate does NOT cover the child-shape fork) via `/brainstorming` + `/adversarial-council` + Bean approval BEFORE building (Rule 7)?
4. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree"? Am I verifying its test/gate claims myself from the canonical cwd + proving the FAILURE path (STOP-16)?
5. Am I building FRESH from Spec+DB+draft — NOT reading `convert.py` to learn how (STOP-22)? Will I gate this stage on the ledger+oracle (zero UNACCOUNTED + zero WRITTEN-not-LANDED on the MULTI-SHAPE fixture set) AND draft-vs-clone LANDED (computed-style, STOP-21) + Bean sign-off — not emit-green, not page 8 alone (Rules 4/5, STOP-3/4/5, A1/A14)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | ALWAYS — the next-stage design BEFORE build |
| `/adversarial-council` · `/qc-council` | Rule-7 design-gate on each step-3 stage; validate fix-shapes; FACT-CHECK the council against ground truth (STOP-15/20/22) |
| `/strategic-plan` + `/phase-planner` | sequence the stage build steps |
| `/gap-analysis` | ALWAYS — grade a design/output before applying |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar mechanism; don't guess |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | orchestrate per-stage implementation |
| `/systematic-debugging` · `/verify-loop` | root-cause gate + 2-attestation per load-bearing claim |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` · `/sgs-wp-engine` · `/sgs-update` | run the pipeline / verify DB + block ground truth (esp. `slots.standalone_block`, `variant_slots` + reseed the scalar slot gap) |
| `/capture-lesson` · `/handoff` | new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Chrome-DevTools (Playwright fallback) | the draft-vs-clone LANDED check — live computed-style/classList on the deployed canary (STOP-21 recipe) — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify any DB/table/count claim — esp. `slots.standalone_block`, `variant_slots`, `block_composition`, `block_attributes` (canonical_slot/derived_selector for child emission) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a block/attr/schema claim before calling it missing |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy SGS build — resolver files, services, render.php, migrations |
| general-purpose (sonnet) | per-file implementers (under `/subagent-driven-development`) — implement assigned files, no shared-tree writes |
| general-purpose (opus) | cross-model adversarial review of a stage design/fix-shape before build |
| `code-reviewer` | spec + quality review per SDD task |

## Guardrails
Each step-3 stage gets its OWN `/brainstorming` → design-gate (Rule 7, `/adversarial-council` + Bean approval) BEFORE build — Stage 2's D244 gate does NOT cover the child-shape fork. Build FRESH by filling the existing `converter/resolvers/<id>.py` stubs with real logic (copy `outer_box.py` + `recognition.py` patterns); convert.py stays FROZEN (D-MODULAR) — the frozen engine is NEVER a reference or comparison oracle (STOP-22). Each resolver earns its OWN draft-vs-clone LANDED proof (A14 — never bank generalisation). Deploy/measure via the STOP-21 recipe (Chrome-DevTools). Path-scoped commits (`-m` before `--`, exclude `__pycache__`); verify HEAD after any rename commit (STOP-19); D-ceiling check before any new D (→ D244). Do NOT batch step-3 stages.
