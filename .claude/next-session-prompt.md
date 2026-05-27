---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-28-phase-2-stream-a-db-quality-pre-pass
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-phase-1.5-CLOSED-phase-2-stream-a-handoff
primary_goal: "Execute Stream A of Phase 2 (Hybrid Block Migration plan) — 5 sequential steps: DB-quality pre-pass + corrected Fix 2b slot_synonyms rows + verify both DBs + /sgs-update downstream + re-baseline /sgs-clone measurement. Stream A QA gate is the decision point for activating Stream B next-next session. NO Stream B/C/D work this session."
---

# Next Session — Spec 22 Phase 2 Stream A (DB-quality pre-pass + corrected Fix 2b)

You are coordinating the active Stream A of Phase 2 (Hybrid Block Migration). The walker is shipped (Fix 1 commit `5731dc36`, mean 81.55% → 58.6%); what's blocking further pixel-diff progress is (a) missing slot_synonyms rows for section-internal BEM wrappers (`__content`, `__media`, etc.) causing the walker to collapse them, and (b) 61 hybrid blocks whose render.php ignores `$content`. Stream A addresses (a); Streams B/C/D (currently deferred) address (b).

## State recap (plain English, no assumed pretext)

Phase 1.5 closed with just Fix 1 shipped — the walker now correctly wraps top-level sections in `sgs/container` per FR-22-4 when no SGS block matches the section's BEM root. Mean pixel-diff dropped 22.9pp. Three things came up that block further progress:

1. **Walker collapses BEM wrappers** inside sections (e.g. `<div class="sgs-hero__content">`, `<div class="sgs-featured-product__products">`) because no `slot_synonyms` row maps those tokens to `sgs/container`. The walker flattens them. Result: hero's split-image lands in the wrong DOM position; featured-product's responsive grid has no recipient block.
2. **Fix 2 attempted directly** but caused +2.34pp regression (wrong rows + mirror-DB divergence + no per-row measurement). Rolled back fully.
3. **Bean's question forced grep-verification** of the canonical row-adding flow. Corrected understanding: `seed-slot-synonyms.py` writes to BOTH DBs by design (`.claude/` + `.agents/`); `/sgs-update` runs downstream refresh stages, doesn't add rows. Lesson `db-rows-canonical-flow` updated.

The new rule from Fix 4's BLOCKED attempt: **R-22-14 — FR-22-6 migrations never carry server-side legacy fallback hacks** (Bean P1 locked). The FR-22-6 hybrid problem is exclusively SGS framework debt; never add per-block scalar guards. Stream B/C/D in the deferred plan would honour this when they activate.

## Mandatory READING

Before Step A1, read in this order:
1. This file (you are reading it)
2. `.claude/handoff.md` — last session full context
3. `.claude/state.md` — current_phase: spec-22-phase-2-hybrid-block-migration-STREAM-A-ACTIVE
4. `.claude/plans/2026-05-28-phase-2-hybrid-block-migration.md` — full Phase 2 plan; Stream A is active scope
5. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §6 R-22-9 + R-22-14 binding rules; §FR-22-2 + §FR-22-2.2 role-exclusion; §FR-22-4 + §FR-22-6 contracts
6. Project memory (4 lessons in `C:/Users/Bean/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/`): `db-rows-canonical-flow`, `row-by-row-measurement-gate-per-db-change`, `section-root-aliases-target-sgs-container-only`, `fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks`

## First action

After reading the above, dispatch Task 1 (Step A1) inline — run the SQL query in the Phase 2 plan Step A1 block to produce the (block × content-bearing-attr × proposed-target-block) triples CSV at `.claude/reports/2026-05-28-hybrid-migration-triples.csv`. ~15 min generate; then Bean reviews and flags suspicious rows. The smallest first action per ADHD Rule 2.

## Tool bindings

Per the Tooling Index in the Phase 2 plan. Critical bindings for Stream A:
- `sgs-db.py` — query both `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (Step A3 independent verification)
- `seed-slot-synonyms.py` — canonical declarative source for slot_synonyms rows + alias extensions (writes both DBs by design)
- `sgs-update-v2.py` — downstream refresh stages (Step A4)
- `sgs-clone-orchestrator.py` — Step A5 baseline + Stage 11 measurement
- `pixel-diff.py --selector .sgs-{section}` — per-section cropped diff (blub.db 256)

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | When Step A2's row decisions need discussion (suspicious rows in the A1 CSV) |
| `/gap-analysis` | If Stream A measurement underperforms — grade Stream A output before deciding on Stream B activation |
| `/lifecycle` | If any skill / agent / pipeline needs editing during Stream A |
| `/research` | If A1 surfaces unknown BEM-target mappings worth checking against WP-core / SGS framework norms |
| `/strategic-plan` | Defer until Stream B activation — Stream A is single-flow execution |
| `/sgs-wp-engine` | ALWAYS — Stream A operates on SGS DB; framework context required |
| `/qc-inline` | Per-row sanity check between A2 row edits and A3 seed run |
| `/capture-lesson` | If anything surfaces a new corrective rule (mirror-DB divergence root cause is a candidate) |
| `/handoff` | Session close |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| `playwright` | A5 measurement — live-page DOM verification per R-22-11 |
| `wp-blocks.py` | Schema queries against sgs-framework.db per blub.db 272 |
| `sgs-db.py` | DB queries — run against BOTH `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND `~/.agents/skills/sgs-wp-engine/sgs-framework.db` (Step A3 independent-verify) |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | If Step A2 row-edit volume is large; bulk row edits via dispatch |
| Sonnet via /delegate | For mechanical CSV row enumeration in A1 (if Bean prefers offloading vs inline) |

## Research Approach

Stream A is execution-mode, not research-mode. Skip /research unless a row decision in A2 needs verification (e.g. "what's the correct target for `__price-row`?"). If a question surfaces, use `/research-check` (2-agent parallel Sonnet, ~2 min).

---

## Task 1 — Step A1 DB-quality pre-pass: produce + review the triples CSV

**What:** Generate CSV of all `(block × content-bearing-attr × proposed-target-block)` triples by querying sgs-framework.db; Bean reviews + marks suspicious rows.
**Why:** Catches wrong slot_synonyms rows (the Fix 2 failure mode — ~30% of new rows were wrong) BEFORE they cause regressions in Stream B parallel dispatch. Pre-empts the row-by-row attribution problem.
**Estimated time:** 30-45 min (15 min generate + 15-30 min Bean review)

**Orchestration:**
- Execution: inline (main thread Opus + Bean sense-checking)
- Brief: Run the SQL query in the Phase 2 plan Step A1; export to `.claude/reports/2026-05-28-hybrid-migration-triples.csv`; Bean reviews row-by-row and adds BEAN_FLAG column (✓/⚠/✗)
- Depends on: none
- Parallel with: none (Stream A is strictly sequential)
- /qc gate after: no — Bean's review IS the gate

**Acceptance:** CSV produced with 180-200 rows; every suspicious row (⚠ or ✗) carries Bean's reasoning in a notes column. Feeds Task 2.

---

## Task 2 — Step A2 fix suspicious slot_synonyms rows + add section-internal BEM rows

**What:** For each suspicious row from A1, edit `seed-slot-synonyms.py` to correct it; add new canonical_slot rows for section-internal BEM wrappers (`__content`, `__media`, `__inner`, `__products`, `__pill-group`, `__price-row`, `__cards`, `__card-inner` → `sgs/container`); extend `text`/`label` aliases for `disclaimer`/`card-tag`/`card-description`/`card-price`.
**Why:** Walker can preserve wrapper structure once the DB rows exist. This is the corrected Fix 2 — no `section-social-proof → sgs/testimonial-slider`; no blanket `split` aliases.
**Estimated time:** 45-90 min (depends on suspicious-row count)

**Orchestration:**
- Execution: inline (Opus + Bean for decisions; Haiku via /delegate for mechanical bulk edits if row count > 20)
- Brief: per the lesson `section-root-aliases-target-sgs-container-only` — section roots → sgs/container only, never content-block primitives. Per `row-by-row-measurement-gate` — group rows by leverage (largest impact first).
- Depends on: Task 1
- Parallel with: none
- /qc gate after: yes — `/qc-inline` on the seed-script diff before running it (catches typos + ensures canonical row shape)

**Acceptance:** seed-slot-synonyms.py edits land cleanly; diff is reviewable; no row violates the section-root-→-container lesson. Feeds Task 3.

---

## Task 3 — Step A3 run seed + INDEPENDENTLY verify BOTH DBs

**What:** Run `python plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py`; query BOTH `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND `~/.agents/skills/sgs-wp-engine/sgs-framework.db` via sgs-db.py to confirm both have identical row counts + the new rows are present.
**Why:** The Fix 2 mirror-DB divergence was caused by implementer-verification error (claimed both DBs got rows; didn't query .agents). This step is the structural defence against that failure mode.
**Estimated time:** 10-15 min

**Orchestration:**
- Execution: inline
- Brief: run the seed; then for each DB query `SELECT COUNT(*), canonical_slot, aliases, standalone_block FROM slot_synonyms WHERE canonical_slot IN (...)`; counts MUST match between DBs; new rows MUST be present in BOTH.
- Depends on: Task 2
- Parallel with: none
- /qc gate after: yes — `/qc-inline` on the verification output (counts match? spot-checked rows match? mirror-DB divergence surfaced?)

**Acceptance:** Both DBs report identical row count + identical values for the new rows. If divergence detected → root-cause investigation (the pre-existing bug surfaced during this session). Feeds Task 4.

---

## Task 4 — Step A4 /sgs-update downstream stage refresh

**What:** Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 5` then `--stage 6` then `--stage 7` then `--stage 9` to refresh block_replacement_mapping + spec_doc_regen + drift_gate.
**Why:** /sgs-update doesn't add rows but DOES refresh dependent stages. Without this, downstream consumers (spec doc, block_replacement table) drift from the new slot_synonyms state.
**Estimated time:** 15-25 min

**Orchestration:**
- Execution: inline
- Brief: per the CORRECTED lesson `db-rows-canonical-flow` — /sgs-update is downstream refresh, not row-add. Stage 5 auto-fills missing standalone_block on existing rows; Stage 6 verifies block.replaces; Stage 7 regenerates spec doc; Stage 9 drift gate.
- Depends on: Task 3
- Parallel with: none
- /qc gate after: no — /sgs-update has its own internal validation

**Acceptance:** All 4 stages green; spec doc regenerated; drift gate PASS. Feeds Task 5.

---

## Task 5 — Step A5 re-baseline /sgs-clone measurement (Stream A QA gate)

**What:** Run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --debug-trace --spec-22-acceptance --deploy-target page:144`. Compare per-cell vs post-Fix-1 baseline 58.65%.
**Why:** Empirical gate for Stream A close + decision point for Stream B activation. Expected: hero/featured-product/gift-section/ingredients-section cells improve substantially with `__content`/`__media` wrappers preserved.
**Estimated time:** 10 min (5 min /sgs-clone + 5 min comparison)

**Orchestration:**
- Execution: inline
- Brief: deploy-included; per-cell pre/post table; capture aggregate mean drop. Per blub.db 256 — per-section cropped pixel-diff via `--selector .sgs-{section}`, never full-page.
- Depends on: Task 4
- Parallel with: none
- /qc gate after: yes — Stream A QA gate. Mean must drop further from 58.6% AND no per-cell regression > 5pp.

**Acceptance:** PASS: Stream A closes; commit with R-22-4 predicted-vs-actual cite; surface measurement results to Bean; deferred-decision on Stream B activation taken next-next session. FAIL: investigate which rows caused regression; revert specific rows; re-measure.

---

## Dependency graph

```
Task 1 (inline, Opus + Bean)
  ↓
Task 2 (inline, Opus + Bean; optional Haiku for bulk edits)
  ↓ /qc-inline gate on seed-script diff
Task 3 (inline)
  ↓ /qc-inline gate on both-DB verification
Task 4 (inline)
  ↓
Task 5 (inline) — Stream A QA gate
  ↓ if PASS: commit + /handoff
  ↓ if FAIL: revert + investigate
```

---

## Methodology guardrails (do not skip)

- **R-22-9 universal mechanism, no per-block hyperfocus** — section-root aliases route to `sgs/container` only (lesson `section-root-aliases-target-sgs-container-only`).
- **R-22-14 no legacy fallback hacks** — Stream A doesn't touch render.php so this doesn't apply directly, but it does apply to ALL future Stream B work that may be discussed.
- **Per-row /sgs-clone measurement gating** — if Task 2's row count is large, consider splitting Task 5 into Task 5a (subset of rows measured) and Task 5b (remaining rows) per the captured `row-by-row-measurement-gate` lesson.
- **Independent verification of BOTH DBs** in Task 3 — implementer-verification error caused Fix 2 mirror-DB divergence. Query each DB separately; don't assume the seed iterated both correctly.
- **Deploy before measure** — Task 5's /sgs-clone deploys to sandybrown via Stage 10 before Stage 11 measurement; that's automatic.
- **/qc multi-rater BEFORE any commit touching converter/walker/SGS-block code** (blub.db 255) — Stream A doesn't touch those directly (only DB rows + downstream-refresh-script output) so single-rater /qc-inline is sufficient. Per blub.db 288 — split commits where attribution matters.
- **Per-section cropped pixel-diff via `--selector .sgs-{section}`** (blub.db 256) — never full-page.
- **WP_DEBUG_DISPLAY stays false** on sandybrown staging (blub.db 282) — debug notices contaminate measurement.

---

## Hard constraints (carried forward)

- **NO new bespoke blocks** (R-22-9). Stream A is DB rows + downstream refresh; ZERO new SGS block directories.
- **NO `git stash` / `git reset` / `git restore` / `git checkout`** in dispatched subagents (blub.db 230).
- **Phase 1.5 is CLOSED.** Don't reopen pixel-diff targets in Stream A — Stream A's goal is structural prerequisite for Stream B, not ≤5% closure.
- **Streams B/C/D are DEFERRED.** Do not dispatch implementers from those streams during this session.
- **TEMP header-hide override** stays in place until Phase 2 sibling spec (header/footer cloner) ships; commit 9a1bb252 cites the removal condition.

---

## Out-of-scope this session

- Streams B/C/D of the Phase 2 plan (deferred per Bean directive)
- Phase 2.5 noise-floor work (≤1% pixel-diff)
- Header/footer cloner Phase 2 sibling spec
- Removing the TEMP header-hide CSS override
- Mirror-DB divergence investigation BEYOND the Task 3 verification (if it surfaces, capture as parking entry)
- 5 pre-existing duplicate parking slugs (separate cleanup pass)
