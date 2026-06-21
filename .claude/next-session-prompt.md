---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-21
primary_goal: "DOC AUDIT — review every doc in .claude/, .claude/specs/, .claude/plans/ against GROUND TRUTH and Bean's end goal (the universal cloning pipeline, Spec 31 §0+§12). Find outdated feature descriptions, decisions that have been overturned or expanded, and doc-vs-doc inconsistencies; ARCHIVE docs that are no longer relevant or are complete; MERGE or individuate overlapping/duplicated docs; rewrite survivors clearly (/writing-clearly-and-concisely). Outcome = a lean, internally-consistent doc set all pointing at the universal-pipeline goal, ready for the stage-by-stage rebuild to resume."
---

# Next session — DOC AUDIT: align all .claude / specs / plans docs to the universal-pipeline end goal

## ⛔⛔ READ THIS FIRST — MANDATORY READING GATE (Bean directive: do NOT guess; verify every "stale/duplicate/overturned" claim against ground truth before acting)

This project's docs accreted across 240+ decisions and many plan re-cuts. The risk in an audit is ARCHIVING or REWRITING a doc on a wrong assumption. You may not archive, merge, or rewrite any doc until you have READ IN FULL and can self-attest to each. Tick them in your first message:

1. ☐ `.claude/docs-registry.yaml` — the AUTHORITATIVE canonical-doc list + `cold_start_reading_order`. This is the spine of the audit: every entry is a tracked live doc (audit for staleness, do NOT archive a registry entry without removing it from the registry too).
2. ☐ `.claude/specs/31-UNIVERSAL-CONTAINER-CSS-TRANSFER.md` §0 (plain-English end goal + the one-sentence target) + §12 (the clean-modular-rebuild blueprint). **This IS Bean's end goal — every doc is judged by whether it aligns to it.** The target: a single DB-driven, name-free routing engine that places any draft CSS property on the correct block attribute at the correct responsive tier, for `sgs/container` and every composite identically, with completeness measured by a live coverage ledger and cheats caught by structural gates.
3. ☐ `.claude/decisions.md` (D114→**D241**) — the D-truth for "overturned or expanded". A doc asserting X when a later D reversed/extended X is the PRIMARY defect class to find. Spec 22 (the underlying pipeline architecture) + Spec 31 (the rebuild blueprint, supersedes parts of 22) are both LIVE — know which supersedes which.
4. ☐ `../CLAUDE.md` + `.claude/CLAUDE.md` (project rules + the working-area manifest) + `.claude/state.md` + `.claude/parking.md` — current status + open work. These are LOAD-BEARING — audit for staleness, never archive.
5. ☐ The LOAD-BEARING vs ARCHIVABLE guidance in §"Audit guardrails" below — read it before moving a single file.

**If you archive or rewrite from a doc's cached self-description instead of ground truth, you will delete real signal.** Reading order = `docs-registry.yaml` `cold_start_reading_order`.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; the end-goal the docs must align to — verbatim)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default that overrides faithfully-transferred draft CSS. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break.
4. **NO SKIPPING** — every draft CSS declaration transfers, OR is EXCLUDED-with-reason (the F4 `excluded_properties` table), OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live computed-style + the draft-vs-clone render-diff. Emit-green ≠ rendered. WRITTEN (attr set) ≠ LANDED (computed-style matches draft).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, seeding, ledger, oracle, gates, the EXCLUDED set, DB-consistency, the orchestrator, EACH rebuild stage) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building.

## State recap (plain English, 2026-06-21 close — D241)
The cloning CSS-transfer **foundation is COMPLETE** (Phase F — F1–F6 + the F5 gate cluster all SHIPPED, armed, wired, hardened, and fact-checked; D238–D241). 544 tests green; convert.py frozen (D-MODULAR). The next BUILD step is the stage-by-stage rebuild (Spec 31 §12.6 step 3) — but BEFORE that, Bean wants a **documentation audit**. Over 240 decisions and many plan re-cuts, the `.claude/` docs have accumulated outdated feature descriptions, decisions that were later overturned or expanded, doc-vs-doc inconsistencies, and stale/duplicate/complete plans. This session AUDITS every doc in `.claude/`, `.claude/specs/`, and `.claude/plans/` against ground truth (the live code/DB + Spec 31 §12 as the end-goal blueprint + decisions.md as the D-truth), then: ARCHIVES the no-longer-relevant/complete ones, MERGES or individuates overlapping/duplicated ones, and rewrites survivors clearly — so the doc set is lean and all-aligned to the universal-pipeline goal before the rebuild resumes. (The stage-by-stage rebuild itself is the work AFTER this audit — its plan lives in the prior next-session-prompt history + Spec 31 §12.6.)

## First action (~5 min, zero deps)
Complete the MANDATORY READING GATE, then the pre-flight ritual (below). Re-confirm ground truth: `git branch --show-current` (→ main) + `git status` + `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (D-ceiling **D241**). Then enumerate the audit surface: `ls .claude/*.md .claude/specs/*.md .claude/plans/*.md .claude/plans/archive/*.md` and read `docs-registry.yaml` to separate registry-tracked (live) docs from the rest.

## Tasks

### Task 1 — Inventory the audit surface + slice it for parallel review
**What:** build a complete inventory of every doc in `.claude/`, `.claude/specs/`, `.claude/plans/` (and note `.claude/reports/` — generated, mostly out-of-scope). For each: its claimed status, its thread (cloning-pipeline / WooCommerce-Spec-30 / doc-ops / other), whether it's in `docs-registry.yaml` (live) or not, and last-touched (git). Group into review slices (e.g. specs / active-plans / archived-plans / working-docs).
**Why:** a parallel review needs disjoint slices; the registry distinguishes load-bearing live docs from candidates-for-archive.
**Estimated time:** ~15 min.
**Orchestration:** inline (Opus) + 1–2 `Explore` agents (read-only) to list + classify docs. Subagents RETURN the inventory; do NOT let them move/edit anything (STOP-2).
**Depends on:** the reading gate. **/qc gate after:** no — it's an inventory. **Acceptance:** a written inventory table (path · thread · registry? · claimed-status · stale-suspicion) covering EVERY doc, not a sample.

### Task 2 — Parallel review each slice against ground truth, then converge with a council
**What:** dispatch parallel review agents (one per slice) to find, per doc: outdated feature descriptions, decisions overturned/expanded by a later D, doc-vs-doc inconsistencies, and misalignment to the universal-pipeline end goal (Spec 31 §0/§12). Each agent VERIFIES each claim against ground truth (the code/DB + decisions.md + the registry) — a "stale" verdict needs evidence, not a hunch (STOP-1, STOP-18). Then run `/qc-council` OR `/adversarial-council` on the consolidated findings to converge + catch false-stale calls (a council finding is a HYPOTHESIS — fact-check it, STOP-15).
**Why:** the audit's value is correctness — wrongly archiving a live doc or "fixing" an inconsistency in the wrong direction is worse than leaving it.
**Estimated time:** ~30–45 min.
**Orchestration:** `/dispatching-parallel-agents` — one sonnet reviewer per slice, each RETURNS a findings list (path · issue-type · evidence-cited · recommended action: keep/rewrite/merge/individuate/archive), NO file writes (STOP-2). Then `/qc-council` or `/adversarial-council` on the merged register. Fact-check the council against ground truth.
**Depends on:** Task 1. **/qc gate after:** the council IS the gate. **Acceptance:** a per-doc action register where every ARCHIVE/MERGE recommendation cites the overturning D-number or the superseding doc — not "feels old".

### Task 3 — Remediate: archive (git mv), merge/individuate, rewrite clearly
**What:** execute the verified register. ARCHIVE no-longer-relevant/complete docs to `.claude/plans/archive/` (plans) or a `.claude/specs/archive/` (specs) or `.claude/memory/` (per the archive-on-resolve discipline) via **`git mv`** (preserve history). MERGE genuine duplicates (or individuate if they serve distinct purposes). Rewrite survivors for clarity with `/writing-clearly-and-concisely`. Update `docs-registry.yaml` + any cross-links when a doc moves. Fix the doc-vs-doc inconsistencies in the direction ground truth dictates.
**Why:** a lean, consistent, end-goal-aligned doc set so the rebuild session isn't misled by stale docs.
**Estimated time:** ~30–45 min.
**Orchestration:** Opus orchestrates ALL file moves/edits (STOP-2 — subagents never write shared files); a sonnet agent may DRAFT a rewrite and RETURN it, Opus applies it. Path-scoped commits. For append-only logs (decisions.md/parking.md) follow archive-on-resolve (move resolved entries to `memory/*-archive.md`), never blanket-truncate.
**Depends on:** Task 2. **/qc gate after:** `/docscore` each rewritten in-scope doc (≥A-); confirm `docs-registry.yaml` still resolves every entry; grep for dangling links to moved docs. **Acceptance:** every register action applied; registry + cross-links intact; no live doc archived; docscore ≥A- on rewritten docs.

## Dependency graph
```
MANDATORY READING GATE + pre-flight ritual (inline, Opus)
  → Task 1 (inventory — inline + Explore, read-only)
      → Task 2 (parallel review per slice → /qc-council|/adversarial-council; fact-check the council)  [subagents RETURN findings, no writes]
          → Task 3 (Opus applies archive/merge/rewrite via git mv + Edit; /docscore + registry-resolve gate)
              → commit path-scoped (`git commit -m "msg" -- <paths>`, -m BEFORE --); D-ceiling check before any new D (→ D241)
THEN (after the audit, separate session): resume the stage-by-stage rebuild — Spec 31 §12.6 step 3, Stage 2 first, design-gated (carried in this prompt's guardrails + Spec 31 §12.6).
```

## Audit guardrails — LOAD-BEARING vs ARCHIVABLE (read before moving any file)
- **NEVER archive (live, load-bearing):** `CLAUDE.md` (root + `.claude/`), `decisions.md`, `parking.md`, `state.md`, `goals.md`, `handoff.md`, `next-session-prompt.md`, `docs-registry.yaml`, `architecture.md`, `dev-setup.md`, `cloning-pipeline-flow.md`/`-stages.md`, Spec 00/02/21/22/31, and the F3/F4/F6 design docs + the 2026-06-17 council register + routing-map. The append-only logs (decisions/parking) use archive-on-RESOLVE (move resolved entries to `memory/*-archive.md`), never wholesale archival.
- **Likely archivable (verify each against ground truth first):** superseded plan re-cuts already noted as "archived/superseded" in CLAUDE.md, COMPLETE phase plans (`*-complete.md`), one-off reports whose work shipped. The cloning plan history (`2026-06-09-clone-fix-*`) is the LIVE plan — keep.
- **Different-thread, COMPLETE (do NOT delete — they're finished work, not stale):** Spec 26/27/28/30 (WooCommerce layer). Flag if mis-described, but they are legitimate completed/ deferred work, not cloning-pipeline cruft.
- **Archive = `git mv` to an `archive/` subfolder** (preserve history); update `docs-registry.yaml` + any inbound links. Deletion only for true duplicates with zero unique content, and only after the merge target carries everything.

## Methodology guardrails / STOP catalogue (carried forward + extended — do NOT subtract)
- **STOP-1 — READ before you conjecture.** Never archive/merge/rewrite a doc, or assert it stale/duplicate/overturned, from its cached self-description. Verify against ground truth — the live code (file:line), the DB, decisions.md (the D-truth), the registry. The MANDATORY READING GATE is non-skippable. (blub 353.)
- **STOP-2 — Subagents RETURN data, never write shared files.** Every review/audit cold prompt MUST say "return findings in your final message; do NOT write/edit/move/create any file." The Opus orchestrator owns ALL archival/merge/rewrite writes. Commit valuable artefacts BEFORE dispatching. (`feedback_subagents_must_not_write_shared_files`.)
- **STOP-3 — The ledger/oracle input is the DRAFT/rendered-clone, NOT the converter's recognised set.** (Spec 31 §12.2.1.) [Carried for the rebuild that follows.]
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate. (Spec 31 §12.2.2.) [Carried.]
- **STOP-5 — Stage-by-stage is the BUILD ORDER; the ledger+oracle is the cross-stage TEST.** (Spec 31 §12.1/§12.6.) [Carried.]
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** CLOSED (D238–D240): check_no_mirror auto-runs post-clone; the 4 static gates run via `f5-commit-gate.py` + `.githooks/pre-commit` + prebuild/prestart. Before claiming "enforced", grep the wiring + confirm it RUNS. (`dont-claim-a-guard-is-enforced-unless-wired`.)
- **STOP-7 — Hardcoded wrapper/converter defaults are CHEATS to remove, not blockers** (R-22-1). (`feedback_wrapper_hardcoded_defaults_are_cheats_to_remove_not_blockers`.)
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints.** Device-tier = {767/768, 1023/1024, 1024}; a single-rule visual breakpoint (600/640/781) is legitimate + must NOT be snapped to a tier. (`feedback_device_tier_vs_visual_breakpoints_are_distinct`.)
- **STOP-9 — Composites are NEVER a separate system; variant grids are DB-defined.** Ground variant structure in `variant_slots` + `blocks.variant_attr`. (`feedback_ground_in_variant_db_for_variant_block_setups`.)
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail, NOT a recognition miss.** Read extract.json `status` + trace.jsonl FIRST; gate on `innerText.length>0`. (`feedback_empty_section_check_cv2_softfail_trace_first`.)
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column EXISTS is necessary but NOT sufficient before reusing/renaming/retiring; grep how it's WRITTEN and READ first. (`schema-enumeration-is-not-usage-enumeration`.)
- **STOP-12 — A cross-environment verifier must be apples-to-apples; reusing infra ≠ inheriting its assumptions (D233).** (`parity-bem-class-blind-spot`.)
- **STOP-13 — A cross-FAMILY rater catches what same-family review misses; if its tooling is broken, stand in with a structured branch trace (D234).** Gemini cross-family path is tool-blocked in the Windows harness. (blub 255/359.)
- **STOP-14 — Before ARMING any gate, run it in report mode against CURRENT output + baseline today's legacy violations; fail only on NEW (D236).** (`gate-arm-needs-precondition-check-then-baseline`.)
- **STOP-15 — Validate routing/variant claims against pipeline-producible inputs, NOT synthetic dicts; run an adversarial-council AFTER a qc-council; then FACT-CHECK the council against ground truth (D237).** A council finding is a HYPOTHESIS — the F6 council had 2 false checks; the F5 (D240) council's 3 deadliest were all true. ALWAYS verify before acting. (`validate-routing-claims-against-pipeline-producible-inputs`.)
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + the gate's `--check` YOURSELF from the project's CANONICAL cwd (the one prebuild uses), not the module dir; prove the FAILURE path, not just the happy path; inspect the committed baseline for stale plant entries. (`verify-subagent-test-claims-from-canonical-cwd`.)
- **STOP-17 — A coverage/no-drop/diff gate's set-difference join must key BOTH sides on the FULL unit identity incl. responsive tier/media; red-team a BUILT enforcement gate before trusting it.** The F5 coverage join was tier-blind → masked drops; fixing it surfaced 19 hidden drops. (`coverage-gate-join-must-key-full-declaration-identity`.)
- **STOP-18 — Don't defer small polish out of habit; fact-check every residual against ground truth first (NEW, D241).** At feature/audit close, label each residual DONE-NOW (it was minutes — do it), DISMISSED (fact-check shows it's not real / already safe — cite evidence), or DEFERRED (cite the concrete blocker: missing infra, or an owning stage + proof the symptom is handled safely). Never "DEFERRED (polish)" with no evidence — a fresh session pays full re-read cost you already hold. (`fact-check-residuals-dont-defer-small-polish`.)
- **Commit discipline:** path-scoped (`git commit -m "msg" -- <paths>`, -m before --; the pre-existing lucide-icons/phase4/theme-handoff dirty files are NOT yours — leave them). Subagents implement/draft; Opus orchestrates + owns all writes; subagents NEVER `git checkout/restore/stash/reset/clean/mv` the shared tree. **Bean's "are you sure?"/"why?" = a mandate to GROUND in ground truth, not reassure.** **Verify subagent + council claims** — "stale per its own header" can be wrong; check the code/D-log.
- **For the rebuild that FOLLOWS this audit (carried):** Deploy before measure (npm build + deploy + version bump before any pixel/DOM probe); root-cause FAMILY before instance fix (R-22-9); Gate A conformance + the F5 gates `--check` per commit; DB changes via dated `migrations/*.py` + full `/sgs-update` reseed, never manual edits; convert.py FROZEN (D-MODULAR); run gate test suites PER-DIR (combined `pytest scripts/` collides on basenames — `pytest.ini` `--import-mode=importlib` fixes it).

## Pre-flight self-attestation ritual (answer in your first message, before the first action)
1. Have I completed the MANDATORY READING GATE — `docs-registry.yaml` + Spec 31 §0/§12 (the end goal) + decisions.md D114→D241 + CLAUDE.md + state.md + parking.md + the LOAD-BEARING-vs-ARCHIVABLE list? (Quote one specific thing — e.g. a D-number that overturned an earlier decision — to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D241.) Anything uncommitted that's MINE? (The pre-existing lucide-icons/phase4/theme-handoff files are NOT mine — leave them. Commit by explicit path, `-m` before `--`.)
3. For every ARCHIVE/MERGE/REWRITE recommendation: have I CITED the ground-truth evidence (the overturning D-number, the superseding doc, the code that contradicts it) — not "feels old" (STOP-1, STOP-18)? Am I using `git mv` for archival to preserve history + updating `docs-registry.yaml` + inbound links?
4. For any subagent I dispatch: did I tell it "RETURN findings, do NOT write/move/edit any file"? Did I commit valuable artefacts first? Am I verifying its claims (and any council finding) against ground truth, not trusting "stale per spec" (STOP-2, STOP-15)?
5. Is every survivor aligned to the universal-pipeline end goal (Spec 31 §0/§12) + internally consistent with decisions.md + the other docs? Did I `/docscore` rewritten in-scope docs (≥A-) + confirm the registry still resolves every entry?

## Skills to Invoke
| Skill | When |
|-------|------|
| `/dispatching-parallel-agents` | Task 2 — one read-only reviewer per doc slice (RETURN findings, no writes) |
| `/qc-council` · `/adversarial-council` | Task 2 — converge the findings + catch false-stale calls; a finding is a HYPOTHESIS, fact-check it (STOP-15) |
| `/writing-clearly-and-concisely` | Task 3 — rewrite survivors for clarity |
| `/docscore` | Task 3 — grade each rewritten in-scope `.claude`/`specs`/`plans` doc (≥A-) |
| `/brainstorming` | ALWAYS — any structural decision (merge vs individuate, what archive layout) |
| `/gap-analysis` | ALWAYS — grade the audit register / a rewrite vs its goal before applying |
| `/lifecycle` | ALWAYS — before any skill/agent/pipeline change |
| `/research` (+ `/library-docs`) | ALWAYS — any unfamiliar doc-pattern/convention you're unsure of (don't guess) |
| `/strategic-plan` + `/phase-planner` | if the rebuild (after the audit) needs a fresh phase breakdown |
| `/capture-lesson` · `/handoff` | new rules / session close |
| `/sgs-db` · `/wp-blocks` | ground-truth checks when a doc's feature/attr/DB claim must be verified |

## MCP Servers & Tools
| Tool | For |
|------|-----|
| `/sgs-db` (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py`) | verify a doc's DB/table/count claim against the live DB (DB-authoritative) |
| `/wp-blocks` (`python ~/.claude/hooks/wp-blocks.py dump`) | verify a doc's block/attr claim before calling it stale |
| Playwright (chrome-devtools fallback on "Browser already in use") | only if a doc claim needs live-render verification — creds `.claude/secrets/sandybrown.env` (grep/cut, never `source`) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only) | Task 1 inventory + Task 2 slice review — fast, read-only, RETURN findings |
| general-purpose (sonnet) | Task 2 deeper per-slice review + Task 3 rewrite DRAFTS (RETURN text; Opus applies) — NO file writes |
| general-purpose (opus) | cross-model adversarial review of the audit register before applying |
| general-purpose (haiku) | 2nd cross-family rater on `/qc-council` (NOT nuanced archive judgment). [Gemini path tool-blocked — STOP-13.] |

## Guardrails
This session is a DOC AUDIT only — no pipeline code changes (convert.py stays FROZEN, D-MODULAR; the foundation modules stay as shipped). The deliverable is doc hygiene: archive stale/complete docs (`git mv`), merge/individuate duplicates, rewrite survivors clearly, fix doc-vs-doc inconsistencies, and align everything to the universal-pipeline end goal (Spec 31 §0/§12) — every action evidence-cited against ground truth. Do NOT archive a load-bearing live doc (see the LOAD-BEARING list). Update `docs-registry.yaml` + inbound links on every move. `/docscore` ≥A- on rewritten in-scope docs. D-ceiling check before any new D (→ D241). After the audit, the next work is the stage-by-stage rebuild (Spec 31 §12.6 step 3) — its guardrails are carried in the STOP catalogue above.
