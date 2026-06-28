---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-26
primary_goal: "REDO the content half of the rebuild UNIFIED (D246 — the D245 separate-content engine is SUPERSEDED). Reading the FULL Spec 31 (§1 'ONE lift path') showed content + CSS are ONE DB-driven dispatch: the working convert.py functions `_lift_scalar_attrs_by_selector` (scalar content) + `_lift_scalar_media_from_img` (scalar media) collapse into the SAME dispatch as the CSS resolvers. D245 wrongly built a SEPARATE parallel content engine (extract_content/run_mechanism_a/b + new db_lookup columns + bespoke media-shaping) that RECREATED those working functions. Corrected build order: (0) compact MEMORY.md <17KB; (1) read the two working content functions IN FULL (sanctioned — modularising working code, not importing brokenness; STOP-22 guarded the BROKEN CSS side); (2) modularise them into resolvers in the ONE dispatch table `(block,layer,property,tier)→resolver`, content + CSS unified; (3) rewrite Spec 31 §3 as the UNIFIED content+CSS routing algorithm; (4) fold the Axis-3 child-routing amendment (parent_block/accepts_allowed_blocks) into that unified §3, not a separate mechanism. Do NOT rebuild content from scratch; do NOT add parallel content logic/columns. Recognition (Stage 2 / D244) is correct + unaffected."
---

# Next session — REDO content UNIFIED into the ONE dispatch (D246 supersedes the D245 separate engine)

You are the rebuild orchestrator (always Opus). You plan, delegate to subagents, QC, live-verify, commit; subagents implement assigned files only. The cloning pipeline must CONVERT any SGS-BEM draft into NATIVE SGS blocks driven by attributes, faithful on the real homepage, with zero cheats and zero silent content drops.

## ⚠️ READ D246 FIRST — the architecture correction this session exists to fix
D245 built content as a SEPARATE parallel engine. That is WRONG (Bean 4-point correction, 2026-06-27). Spec 31 §1 "ONE lift path" lists the WORKING content functions (`_lift_scalar_attrs_by_selector`, `_lift_scalar_media_from_img`) as part of the SINGLE dispatch with the CSS resolvers — content + CSS are ONE routing system. Your job is to MODULARISE the working functions into that one dispatch, NOT recreate content. Read the WHOLE Spec 31 + the two functions HOLISTICALLY (Bean: "do not grep check if you need to read anything — read the entire doc/file"). A council "X missing from the spec" finding = a hypothesis about the spec TEXT; ask "is X actually missing, or elsewhere in the same system I haven't unified?" before adding a parallel mechanism (this session's exact failure). Memory: `do-not-recreate-working-functionality-modularise-it`.

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: verify against ground truth, never guess)
Tick each in your first message before any build action:
1. ☐ **`.claude/plans/2026-06-26-stage3-child-shape-fork-design.md` v3** — the JUST-SHIPPED stage design (D245). §1 (the two mechanisms — the PATTERN to copy), §12 (the 26 folded council must-fixes). This is the design to extend.
2. ☐ **The BUILT Stage-3 code** under `plugins/sgs-blocks/scripts/converter/services/` — `extraction.py` (run_mechanism_a/b + 3-case dispatch — the pattern), `payload.py` (extract_payload 6-role), `content_select.py` (bs4 select + leaf/shell), `draft_oracle.py` (independent oracle). Plus `db_lookup.content_attrs_with_selector`/`content_role_for_slot`/`primary_content_attr` (the read-only accessors) + `ledger/content_gap_check.py` (the wired content-gap gate).
3. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` — §2 Axis 3 (CHILD-SHAPE: scalar→typed attrs incl media*; InnerBlocks→child blocks — the authority for which path a block takes) + §12.0/§12.6 step 3 (build order) + §12.7 gap-to-stage map.
4. ☐ `.claude/decisions.md` (head → **D245**) — D-truth + D-ceiling. **D245 = content extraction BUILT + LANDED (all 3 shape-classes)**; D244 = recognition; D243 = the slice; D229 = D-MODULAR.
5. ☐ `.claude/specs/22-...` — **FR-22-2/2.1/2.2** (child-block-vs-scalar fork) + **§FR-22-5.3** (the SLOT-KEYED predicate `slot_has_equivalent_block`, NOT `equivalent_block_for(block,slot)` — the "fatal catch" v1 hit) + R-22-* binding rules.
6. ☐ `.claude/state.md` + `.claude/parking.md` + the foundation modules (`ledger/` F2, `oracle/` F3, `cheat-gate/`, `excluded-gate/`, `coverage-matrix/`, `db-consistency/` F6) + `orchestrator/converter_v2/db_lookup.py` (the vetted accessor — the ONLY permitted import from the frozen tree).
7. ☐ `pipeline-state/<latest-run>/{leftover-buckets,extract,trace}.json` — read raw artefacts before ANY converter-quality conjecture.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-slot exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP (ContentGap visible to F5). Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (renders on the page).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. **(A NEW stage or a new attr-SHAPE needs its own design-gate; pure generalisation of the SAME mechanism to a new slot is a PROOF, not a new gate — see below.)**

## State recap (plain English, 2026-06-27, D246)
The cloning CSS-transfer **foundation (Phase F) + the modular VERTICAL SLICE (outer_box) + Stage-2 recognition (D244)** are COMPLETE + correct. **D245 built a content-extraction engine that LANDED live — BUT its ARCHITECTURE is SUPERSEDED (D246):** it was a SEPARATE parallel content system (`converter/services/extraction.py` `extract_content`/`run_mechanism_a/b` + new `db_lookup` columns + bespoke media-shaping) that RECREATED the working `_lift_scalar_attrs_by_selector`/`_lift_scalar_media_from_img` functions, when Spec 31 §1 "ONE lift path" says content + CSS are ONE dispatch and the rebuild must MODULARISE the existing functions. **NEXT = redo content UNIFIED:** read the two working functions, modularise them into resolvers in the ONE dispatch table next to the CSS resolvers, rewrite Spec 31 §3 as the unified content+CSS routing. Do NOT rebuild content; do NOT extend the separate engine. Recognition (D244) stays.

## First action (~5 min, zero deps)
(0) Compact `MEMORY.md` to <17KB (move oldest feedback-file-backed stubs to `MEMORY-archive.md`; never drop an autoload rule). Then the reading gate + pre-flight ritual. Re-confirm ground truth: `git branch --show-current` (→ main), `git status` (lucide/phase4/theme-handoff dirty files are NOT yours), `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (→ D246). **READ THE WHOLE Spec 31 end-to-end** (not greps) — esp. §1 "ONE lift path" (the 8 functions incl content) + §3 (CSS routing, to be made unified) + §12.0/§12.4 (modularise into per-resolver files behind ONE dispatch). Then **READ the two working content functions IN FULL** (`_lift_scalar_attrs_by_selector`, `_lift_scalar_media_from_img` in `convert.py`) — sanctioned this stage (modularising working code, not importing brokenness). State — in plain English — how content + CSS share the one routing, BEFORE designing the unified dispatch.

## Tasks

### Task 1 — Read + design the UNIFIED content+CSS dispatch (design-gate, Rule 7)
**What:** Read the whole Spec 31 + the two working content functions holistically. Design how the content resolvers (modularised from `_lift_scalar_attrs_by_selector` / `_lift_scalar_media_from_img`) sit in the SAME `(block, layer, property, tier) → resolver` dispatch as the CSS resolvers — content lands the element's text/media payload into a content attr; CSS lands the declaration value into a CSS attr; SAME recognise→resolve-destination→tier→serialise pipeline. Spell out where the existing `derived_selector` / `canonical_slot` / `standalone_block` / `parent_block` / `accepts_allowed_blocks` DB data drives it (it ALL exists — don't add columns).
**Why:** Spec 31 §1 mandates one lift path; D245 forked it. This unifies it as designed.
**Orchestration:** `/brainstorming` → `/adversarial-council` design-gate (the council MUST be told: validate against Spec 31 §1 + the working functions + the DB; flag any place the design RECREATES instead of modularises) + Bean approval BEFORE build. **/qc gate:** council GO + Bean sign-off.

### Task 2 — Rewrite Spec 31 §3 as the unified content+CSS routing algorithm
**What:** §3 currently describes only the CSS-declaration path. Rewrite it to be the ONE routing algorithm covering BOTH content payload (text/media → content attr, via the modularised scalar functions) AND CSS declarations (→ CSS attr), with the Axis-3 child-routing (parent_block → slots.standalone_block → accepts_allowed_blocks) folded in — closing the qc-council's 7 gaps (G1–G5 + the content/array gaps) as ONE unified spec, not a v2 cross-ref to Spec 22. Then Spec 31 absorbs the working Spec 22 content logic (§FR-22-2/2.5) so Spec 22 can be archived (Spec 31's stated end-goal).
**Why:** Makes the spec match the one-dispatch architecture; closes the council NO-GO at the right layer (the spec, not a code patch).
**Orchestration:** `/spec-writer`-shaped edit → `/qc-council` manual-simulation re-validation (same method as this session: hand-trace random blocks → full content+CSS handover). **Depends on:** Task 1.

### Task 3 — Build the unified dispatch (modularise the working functions) + LANDED + decommission convert.py at coverage
**What:** Implement the Task-1 design: content resolvers in the one dispatch, modularised from the working functions; refactor/replace the D245 separate engine. Gate per Spec 31 §12.6 step-3 ritual (ledger+oracle on the multi-shape fixture set + draft-vs-clone LANDED + Bean sign-off). Continue stage-by-stage to §8's decommission trigger (delete convert.py when the fixture set is fully TRANSFER-and-LAND green).
**Orchestration:** `/subagent-driven-development` → re-run gates from canonical cwd (STOP-16) → `/qc-council` on the BUILT code (STOP-23, blub 255) → deploy → live LANDED → Bean sign-off → path-scoped commit. **Depends on:** Task 2.

## Dependency graph
```
(0) MEMORY.md compaction + READING GATE (whole Spec 31 + the 2 working functions, holistic) + ritual
  → Task 1 (design the UNIFIED dispatch) /brainstorming → /adversarial-council DESIGN-GATE + Bean approval
      → Task 2 (rewrite Spec 31 §3 unified) /qc-council manual-sim re-validate → Bean sign-off
          → Task 3 (build the unified dispatch — modularise the working functions; refactor D245)
              SDD → re-run gates (STOP-16) → /qc-council on BUILT code → deploy → LANDED → sign-off
                → continue stage-by-stage to convert.py decommission (Spec 31 §8)
                  → commit path-scoped per increment (D-ceiling check before any new D → D246)
```

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, decisions.md, the raw run artefacts. The reading gate is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.** Cold prompts say "do NOT write/move/create any shared doc." Opus orchestrates all shared-file writes; commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.)
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.)
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.)
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** The F5 gates run on every CC `git commit` (`.claude/hooks/f5-commit-gate.py` `_GATES`). `content_gap_check` is now wired there. Before claiming "enforced", grep the wiring + confirm it RUNS.
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1).
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier.
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined** (`variant_slots` + `blocks.variant_attr`; query, don't guess).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. A content-gated block (testimonial) renders EMPTY without content BY DESIGN — Stage 3 is what fills it.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column/function EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep the real signature + how it's WRITTEN and READ first. (v1's `equivalent_block_for(slug,slot)` fatal catch was exactly this.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions** (D233). The LANDED probe renders the new-engine output in the SAME live WP env it measures.
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace** (D234; Gemini cross-family path is tool-blocked in the Windows harness).
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations (key by identity, not line); fail only on NEW** (D236). (The content-gap baseline is the live example.)
- **STOP-15 — Validate routing/variant claims against pipeline-PRODUCIBLE inputs, not synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth** (D237/D242 — a council finding is a HYPOTHESIS; this session BOTH council rounds' headlines were fact-checked TRUE against the live DB before folding).
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`); prove the FAILURE path (plant a violation → exit 1); inspect the committed baseline for stale plants. (Done for every gate this session.)
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT gate before trusting it** (D240).
- **STOP-18 — Don't defer residuals out of habit; fact-check each against ground truth first** (D241). Label each DONE-NOW / DISMISSED-with-evidence / DEFERRED-with-cited-blocker. (Arrays FR-22-2.5 deferral = decide by fixture-set evidence, not habit.)
- **STOP-19 — A path-scoped `git commit -- $(...)` can DROP the source-path deletion of a `git mv`.** After any rename commit, verify `git ls-tree -r HEAD --name-only | grep <oldpath>`; commit by an explicit path list naming BOTH sides of every rename. (blub.db 364.)
- **STOP-20 — Restructure a multi-file rebuild as a VERTICAL SLICE (one real output LANDED), not a horizontal scaffold of empty stubs; make LANDED the headline signal; DOUBLE-VERIFY a design before build then FACT-CHECK the verifiers** (D242).
- **STOP-21 — A new-engine resolver is only LANDED-proven by deploying its GENUINE output to a live page + computed-style/innerText + verdict — NOT by new-vs-frozen attr equivalence** (D243). Recipe: build markup via the engine → `orchestrator.emit_block_markup()` → REST-create a FRESH canary page (guard-safe; the wp-content-guard blocks post_content REWRITES, not REST page CREATE) → anonymous Chrome-DevTools/Playwright `getComputedStyle`/innerText (no admin bar) → require the OUTPUT marker + non-default. Delete the test page + 404-confirm. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`). **PROVEN this session for all 3 shape-classes.**
- **STOP-22 — The frozen `convert.py` is NEVER the design reference or the fact-check oracle for a rebuild stage.** The authority is Spec 31/22 + the modern DB tables + the draft. `convert.py` is consulted ONLY to NAME the bug being killed. Tell council/qc raters to fact-check against Spec+DB+draft, never the engine. (`feedback_rebuild_stage_authority_is_spec_and_db.md`.)
- **STOP-23 (NEW, D245) — Run a pre-commit `/qc-council` on the BUILT converter code, not just the design.** This session the design passed 2 council rounds + my verification, yet a pre-commit qc-council found 4 real bugs (defeated href escaping, a wrong-content role fallback, a string-attr silent-drop coverage hole, a malformed-gap exit-0) that ALL my passing tests missed. Self-tests exercise the paths you thought of; the multi-model qc exercises the ones you didn't (blub 255). Input class ≠ output class is a live trap (draft `__author` → render `__name`): verify render.php reads the attr you write AND paints the element you check (WRITTEN-not-LANDED).
- **STOP-25 (NEW, D246) — A rebuild's "fresh/modular" = RE-HOUSE the existing WORKING logic into smaller files behind one dispatch; NEVER recreate it with new logic + new DB columns.** Before building, READ THE WHOLE spec/file holistically (not greps — Bean: "read the entire doc/file"), enumerate what ALREADY exists+works (the spec's own component list — Spec 31 §1 lists the 8 working lift functions incl content — + the DB columns + the named functions read in full), and PORT working code rather than re-derive it. A council "X is missing from the spec" finding is a HYPOTHESIS about the spec TEXT — ask "is X actually missing, or elsewhere in the same system I haven't unified?" before adding a parallel mechanism. STOP-22 (never read the frozen engine) guards against importing BROKEN assumptions — it does NOT forbid modularising the parts that WORK (reading-to-port ≠ importing-brokenness). This session's exact failure: D245 built a separate content engine recreating `_lift_scalar_attrs_by_selector`/`_lift_scalar_media_from_img` (`do-not-recreate-working-functionality-modularise-it`).
- **STOP-24 (D245) — A DB change to a column that `/sgs-update` assign-canonical RE-DERIVES (role/canonical_slot/derived_selector) must use the reseed-surviving `ATTR_CLASSIFICATION_OVERRIDES` channel (sgs-update-v2.py), not a bare migration** (a migration writes the row but the next reseed overwrites it). Pair the override (reproducible source) with a dated migration (immediate effect). `db-changes-reproducible-via-migration` + the 2026-06-13 selector-override migration docstring are the precedent.
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, `-m` before `--`; pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours; exclude `__pycache__`). Bare commits are blocked by the path-scoped-commit gate. Subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure.**
- **Generalisation discipline (carried):** the mechanism is ALREADY universal — a new slot/block is usually a PROOF (richer fixture + LANDED), not new code; A14 — each earns its own draft-vs-clone LANDED, never bank from a prior slot. A new attr-SHAPE (object media) is the exception — it needs shaping logic + a mini design-gate. DB changes via the override channel + dated migration + full reseed reproduces it; run BOTH conformance suites; de-hardcode counts to `/sgs-db` pointers.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the MANDATORY READING GATE — the Stage-3 v3 design + the BUILT `converter/services/` code (extraction.py + payload + content_select + the 3 db_lookup accessors + content_gap_check) + Spec 31 §2 Axis 3 + §12.6 step 3 + decisions.md D245/D244/D229 + Spec 22 (FR-22-2/2.1/2.2 + §FR-22-5.3) + state.md + parking.md + the foundation modules? (Quote one specific thing — e.g. the extraction.py 3-case dispatch I'll copy, or the Axis 3 row for my target block — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D245.) Anything uncommitted that's MINE? (lucide/phase4/theme-handoff are NOT mine.)
3. Is my generalisation target a PURE PROOF (same mechanism, new slot — richer fixture + LANDED, no new code) or does it need new code (a new attr-SHAPE)? If new code/SHAPE, have I design-gated it (Rule 7)?
4. For any subagent: did I tell it "implement only your assigned files / RETURN findings; do NOT write shared docs or touch the shared git tree"? Am I verifying its test/gate claims myself from the canonical cwd + proving the FAILURE path (STOP-16) + running a pre-commit `/qc-council` on the BUILT code (STOP-23)?
5. Am I building FRESH from Spec+DB+draft — NOT reading `convert.py` to learn how (STOP-22)? Will I gate on draft-vs-clone LANDED (computed-style/innerText, input-class≠output-class checked, STOP-21/23) + Bean sign-off — not emit-green, not a passing self-test alone (Rules 4/5, STOP-3/4/5, A14)?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | a NEW attr-SHAPE or a new stage's design BEFORE build |
| `/adversarial-council` · `/qc-council` | Rule-7 design-gate on a new SHAPE; **pre-commit qc-council on the BUILT converter code (STOP-23, blub 255)**; FACT-CHECK the council against ground truth (STOP-15) |
| `/strategic-plan` + `/phase-planner` | sequence the generalisation increments |
| `/gap-analysis` | grade a design/output before applying |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | any unfamiliar mechanism; don't guess |
| `/subagent-driven-development` · `/dispatching-parallel-agents` · `/subagent-prompt` | orchestrate per-increment implementation |
| `/systematic-debugging` · `/verify-loop` | root-cause gate + 2-attestation per load-bearing claim |
| `/qc-inline` | quick inline QC of a small increment (this session's media QC used it) |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` · `/sgs-wp-engine` · `/sgs-update` | run the pipeline / verify DB + block ground truth (esp. `content_attrs_with_selector`, `slot_has_equivalent_block`, the override channel) |
| `/capture-lesson` · `/handoff` | new rules / session close |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| Chrome-DevTools / Playwright | the draft-vs-clone LANDED check — live computed-style/innerText on the deployed canary (STOP-21 recipe) — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify any DB/table/count claim — esp. `block_attributes` (role/derived_selector/attr_type), `block_capabilities` (scalar-content-lift), `block_composition` (has_inner_blocks) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a block/attr/schema claim before calling it missing |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `wp-sgs-developer` | heavy SGS build — resolver files, services, render.php, migrations |
| general-purpose (sonnet) | per-file implementers (under `/subagent-driven-development`) — implement assigned files, no shared-tree writes |
| general-purpose (opus) | cross-model adversarial/correctness review of a BUILT increment before commit (STOP-23) |
| `code-reviewer` | spec + quality review per SDD task |

## Guardrails
A new attr-SHAPE or a new stage gets its OWN `/brainstorming` → design-gate (Rule 7) BEFORE build; pure generalisation of the SAME mechanism to a new slot is a PROOF (richer fixture + LANDED), not a new gate. Build FRESH from Spec 22/31 + DB + draft; convert.py stays FROZEN (D-MODULAR) — never a reference or comparison oracle (STOP-22). Each increment earns its OWN draft-vs-clone LANDED proof (A14). Run a pre-commit `/qc-council` on the BUILT code (STOP-23). DB changes that touch reseed-derived columns use the `ATTR_CLASSIFICATION_OVERRIDES` channel + a dated migration (STOP-24). Deploy/measure via the STOP-21 recipe; input class ≠ output class. Path-scoped commits (`-m` before `--`, exclude `__pycache__`); verify HEAD after any rename (STOP-19); D-ceiling check before any new D (→ D245).
