---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Fact-check of the DB-usage conformance audit"
created: 2026-06-07
status: REFERENCE — verifies the findings in 2026-06-07-db-usage-conformance-audit.md against primary sources
method: "each load-bearing audit claim re-verified directly against the scripts + sgs-framework.db by the main thread (not a subagent) — subagent conclusions are hypotheses (feedback_read_ground_truth_before_concluding)"
parent: ".claude/reports/2026-06-07-db-usage-conformance-audit.md"
---

# Fact-check — DB-usage conformance audit

## 0. Why this exists

The conformance audit was produced by 9 parallel subagents. Per the project's binding rule (*subagent conclusions are HYPOTHESES — verify against ground truth before acting*), every load-bearing finding was re-checked directly against the actual scripts + `sgs-framework.db`. **Result: the audit is mostly accurate, but verification overturned one finding (I2) and refined another (V2) — which is exactly why this step is mandatory.**

## 1. Verdict table

| Finding | Audit claim | Fact-check verdict | Evidence |
|---|---|---|---|
| **V1** — `_sgs_bem_regex` hardcoded | docstring says "fetch from uimax.naming_conventions"; body is hardcoded `re.compile` | ✅ **CONFIRMED** | `db_lookup.py` `def _sgs_bem_regex()` docstring "Fetch the canonical SGS-BEM regex from uimax.naming_conventions" then `return re.compile(...)` — no SELECT |
| **V2** — gap-candidates written to wrong DB | converter writes to `sgs-framework.db` (claimed read-only/`is_stale=1`) instead of uimax | 🟡 **CONFIRMED (write-target) / REFINED (justification)** | `write_attribute_gap_candidate()` does `sqlite3.connect(SGS_DB)` ✓. BUT the sgs `attribute_gap_candidates` table has **no `is_stale` column** (`id, block_slug, attr_name, stem, proposed_action, created_at`) — so the audit's "marked is_stale=1" justification is imprecise. The write-to-sgs-DB fact is real; whether it's *wrong* rests on FR-22-8.1's intent (uimax-as-write-target), not on an `is_stale` flag. |
| **V3** — modal/mobile-nav exclusion unenforced in `convert.py` | `_is_container_mirror_block` checks `wraps_block` only; modal/mobile-nav would return True | ✅ **CONFIRMED** | `_is_container_mirror_block` queries `wraps_block='sgs/container'` only (no `containerMirror` check). DB: `sgs/modal`→`(sgs/container, section)`, `sgs/mobile-nav`→`(sgs/container, content)`. Both would return True. **(Latent — only bites if they reach the walker as resolved slugs.)** |
| **V4** — `accepts_allowed_blocks` is a dead column | NULL across all 29 roster rows | ✅ **CONFIRMED** | `SELECT COUNT(*) ... WHERE accepts_allowed_blocks IS NOT NULL` → **0** |
| **V5** — WS-3 C3/C5 still hardcoded | `_CAPABILITY_PRIORITY` hardcoded list; `_infer_role` substring-match | ✅ **CONFIRMED** | `db_lookup.py:677` `_CAPABILITY_PRIORITY: list[str] = [...]`; `css_router.py:566 def _infer_role` (still heuristic) |
| **V6** — 3 direct `sqlite3.connect` in `convert.py` | breaches FR-22-8 "zero direct connects" PASS test | ✅ **CONFIRMED** | `convert.py:920, 950, 1871` — exactly 3 `sqlite3.connect` calls |
| **I1** — DB-path split-brain | `sgs-update` writes `.agents`; `db_lookup` reads `.claude` | ✅ **CONFIRMED** | `db_lookup.py:30 SGS_DB = ~/.claude/.../sgs-framework.db` vs `sgs-update-v2.py:64 SGS_DB = ~/.agents/.../sgs-framework.db` |
| **I2** — `assign-canonical.py` MISSING from disk; Stage 1 call fails | file absent at `plugins/sgs-blocks/scripts/assign-canonical.py`; Stage 1 tail subprocess fails | ❌ **OVERTURNED → reframed as a low-severity DOC-PATH error** | The script **EXISTS** at `plugins/sgs-blocks/scripts/behavioural-analyser/assign-canonical.py` (70 KB, 2026-05-30), and `sgs-update-v2.py:559` **calls that correct path** — so Stage 1 does NOT fail. The audit checked the wrong location (the path printed in dev-setup.md). The *real* issue is minor: **dev-setup.md line 590 documents the wrong command** (`python plugins/sgs-blocks/scripts/assign-canonical.py` — missing the `behavioural-analyser/` segment). Doc fix, not a broken pipeline. |
| **I4** — variant seeding for one block | `variant_attr` 1 block; `variant_slots` hero-only | ✅ **CONFIRMED** | `variant_attr IS NOT NULL` → **1**; `variant_slots` distinct block_slug → **1** (hero) |
| **Doc-drift counts** (Spec 21 / dev-setup) | block_attributes 2077→2826; slots 96→101; block_capabilities 88→76; class-section 2→3 | ✅ **CONFIRMED** | DB: block_attributes **2826**, slots **101**, block_capabilities **76**, class-section **3** |

## 2. The two corrections (the payoff of fact-checking)

**I2 — OVERTURNED.** The audit's headline "Tier-1 footgun: `assign-canonical.py` is missing, Stage 1 silently fails" is **false**. The script exists at `behavioural-analyser/assign-canonical.py` and the orchestrator calls that exact path. The subagent did a literal `ls plugins/sgs-blocks/scripts/assign-canonical.py` (the path quoted in dev-setup.md) and concluded "missing" — without checking the path the *code* actually uses. The residual truth is a **doc-path typo in dev-setup.md** (line 590 omits `behavioural-analyser/`), which is a Tier-3 doc-refresh item, not a Tier-1 correctness risk. **Severity downgraded from Tier-1 to Tier-3.**

**V2 — REFINED.** The write-to-sgs-DB fact is real (`connect(SGS_DB)` + INSERT), but the audit's stated reason ("the sgs table is marked `is_stale=1`") is wrong — that table has no such column. The finding still stands *if* FR-22-8.1 mandates uimax as the gap-candidate write target, but it should be re-grounded on the spec clause, not on a non-existent flag. **Action: re-read FR-22-8.1 before acting on V2.**

## 3. Net assessment

- **8 of 10 findings confirmed exactly** (V1, V3, V4, V5, V6, I1, I4, doc-drift counts).
- **1 refined** (V2 — fact true, justification imprecise).
- **1 overturned** (I2 — script exists; downgraded to a doc typo).

The audit's **convergent finding (V1, flagged by 4 independent auditors) is solid** and is the single clearest R-22-1 breach. The split-brain risk (I1) is real. The overturned item (I2) is a useful reminder: **a subagent's `ls` against a doc-quoted path is not the same as checking the path the code actually invokes** — the same class of error the whole methodology guards against.

## 4. Revised Tier-1 remediation (post-fact-check)

1. **I1 DB-path split-brain** — unify `.agents`/`.claude` to one canonical path or a documented symlink. (Confirmed; highest latent risk.)
2. **V1 `_sgs_bem_regex` hardcoded** — make it DB-driven or delete the false docstring. (Confirmed; 4-auditor convergence.)
3. **V2 gap-candidate write target** — re-ground on FR-22-8.1, then point the writer at uimax if the spec mandates it. (Refined — verify the spec clause first.)
4. **V3 modal/mobile-nav exclusion** — enforce in `convert.py`. (Confirmed; latent.)

~~I2 assign-canonical.py missing~~ → **removed from Tier-1** (script exists; only a dev-setup.md command-path typo remains).

## 5. Methodology reinforcement

This fact-check is itself the lesson: the conformance audit was good, but **one in ten of its findings was wrong in a way that would have sent the next session chasing a phantom "missing script"** had it not been verified. Subagent registers are hypotheses. The cheap, mandatory step — re-run the load-bearing checks against the actual code path + DB rows in the main thread — overturned one and refined another in a handful of tool calls.
