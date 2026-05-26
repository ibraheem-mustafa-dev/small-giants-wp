---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-28-spec-22-phase-0-4-hybrid-roster
generated: 2026-05-27
parent_session: small-giants-wp-2026-05-27-spec-22-phase-0-1-foundation
primary_goal: "Close Spec 22 Phase 0 by running the hybrid-block audit (Phase 0.4). Produces the empirically-scoped roster of blocks needing render.php migration in Phase 2. Estimated 8–15 blocks per FR-22-2.2 role-exclusion + D85 positive-allowlist. Phase 1 walker rewrite (Commits 1.1–1.5) opens after Phase 0.4 closes."
first_action_eta: "5 minutes (read Spec 22 §FR-22-6 + Phase 1 plan Phase 0.4 row; dispatch Haiku via /delegate with the brief below)"
---

# Next session — Spec 22 Phase 0.4 (hybrid-block audit roster)

You are a senior SGS Framework architect implementing the final commit of Spec 22 Phase 0. Domain: cloning-pipeline foundation. Goal: empirically scope which SGS blocks need render.php migration for Phase 2, by querying `equivalent_block_for()` against every block × attr and filtering through the FR-22-2.2 positive-allowlist (D85 — content-bearing roles only).

## State recap

Phase 0.1 + 0.2 + 0.3 ALL CLOSED in the 2026-05-27 session (4 commits on `main`):

- **`884d13e9`** — D84 scope correction (1,214 → ≤72 Tier B backfill)
- **`49bd2f24`** — Phase 0.1 + 0.3.a bundle: DB enrichment + role classification + pixel-diff chrome-hide + D85-D88
- **`82821922`** — Phase 0.3.b: orchestrator `--wait-fonts` propagation
- **`c417b7a4`** — Phase 0.2: wp-blocks.py test infra (FR-22-8 CLI extensions)

Empirical state of the DB post Phase 0.1-0.3:
- `block_attributes` rows: 2,246 total; canonical_slot populated: 1,036; role populated: 962
- Triple-NULL baseline corrected from 1,142 → **1,090** (role-detection apply reclassified 52 mis-tagged-as-behavioural rows as content-bearing; snapshot at `pipeline-state/_snapshots/triple-null-baseline.json`)
- `slot_synonyms.role_classification` column added: 33 content-bearing / 3 styling-behaviour / 53 unclassified
- Tier C DELETED from `db_lookup.equivalent_block_for()` per D86 (Spec 22 now 2-tier)
- D85 — positive-allowlist closes FR-22-2.2 NULL-role hole. Walker now correctly returns None for styling attrs whose canonical_slot looks content-bearing.
- Pixel-diff hardening — hero-clone-poc 1440 went 54.5% → 10.3% (-44.2pp); Mama's hero 1440 honest baseline 69.6% → 60.8% (D88 — methodology shift not flake)

Wave B (Mama's full-page baseline re-capture with new pixel-diff.py) was dispatched at session close 2026-05-27. **Check status of Wave B Haiku at session start** — if completed, review the new baseline + commit it; if still running, wait.

## Mandatory reading

1. This file
2. `.claude/state.md` (current_subphase_step — post Phase 0.3 close)
3. `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-2 (full) + §FR-22-6 (hybrid block render.php migration) + §FR-22-6.1 (parallel-session coordination) + §7 Commit 0.4
4. `.claude/plans/2026-05-26-phase-1-spec-22-implementation.md` Phase 0.4 row + Phase 2 row (the consumer of this roster)
5. `.claude/decisions.md` D84, D85, D86, D87, D88 (top entries)
6. `plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` (`equivalent_block_for()` function — the roster query target)

## Tool bindings

- **Skills:** `/autopilot` (SessionStart), `/sgs-wp-engine` (when touching SGS code), `/qc-inline` (small-artefact gate), `/delegate` (model picking), `/handoff` (session close)
- **DB queries:** `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py stats` (sanity); `python ~/.claude/hooks/wp-blocks.py equivalent-block <slug> <attr>` (per-attr lookup via FR-22-8 CLI now wired)
- **External regression test:** `python plugins/sgs-blocks/scripts/orchestrator/_tests/external-derivation-regression.py` (4/4 PASS at session start should hold)

## First action

Dispatch Haiku via `/delegate` with the Phase 0.4 brief below. ETA: ~30-45 min wall-time. Returns roster file `.claude/reports/2026-05-27-hybrid-block-roster.md` (date stamp may shift to actual run date).

---

## Phase 0.4 — Hybrid-block audit (Haiku, ~30-45 min)

**What:** Query `equivalent_block_for(block_slug, attr_name)` against every block × every attr in `block_attributes`. Group results by block. Filter via FR-22-2.2 role-exclusion (only count attrs returning non-NULL slug). Produce a markdown roster at `.claude/reports/2026-05-27-hybrid-block-roster.md` (or current date).

**Why:** Spec 22 Phase 2 needs an empirical roster — not hand-curated — of blocks where `equivalent_block_for()` returns non-NULL for ≥1 attr after role-exclusion. Per FR-22-2.2 + D85 + D86, this set is much smaller than the 63 raw blocks (the role-exclusion + Tier C deletion shrinks scope dramatically). Estimated 8-15 true content-bearing hybrid blocks.

**Estimated time:** ~30-45 min.

**Orchestration:**
- Execution: delegated subagent (Haiku via `/delegate`)
- Dispatch pattern: single Haiku agent (mechanical DB query + report generation)
- /qc gate after: `/qc-inline` — Bean visual review of roster count (expect 8-15; if >20 or <5, role-exclusion rule needs revisiting)
- Acceptance: roster file exists with `block_slug | hybrid_attr_count | example_attrs` table; Bean confirms count is within 8-15

**Cold prompt for Haiku agent:**

```
You are Haiku producing the Spec 22 Phase 0.4 hybrid-block audit roster. Mechanical task. UK English. ~30 min.

# Working directory
c:\Users\Bean\Projects\small-giants-wp (branch: main, post commit c417b7a4)

# Goal
Query equivalent_block_for() against every block × every attr in block_attributes; group results by block; produce roster of blocks with ≥1 content-bearing attr (filtered through FR-22-2.2 + D85 positive-allowlist).

# Reading (5 min)
- plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py — `equivalent_block_for()` function (the query target)
- Spec 22 §FR-22-6 + §FR-22-2.2 (role-exclusion rule)
- Verify db_lookup self-tests pass: `python plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py` should show 5/5 PASS

# Audit logic
1. SELECT DISTINCT block_slug FROM block_attributes ORDER BY block_slug
2. For each block_slug:
   - SELECT attr_name FROM block_attributes WHERE block_slug = ?
   - For each attr_name, call equivalent_block_for(block_slug, attr_name)
   - Collect attrs where return is non-NULL
3. Filter blocks: keep only blocks with ≥1 non-NULL attr
4. Sort descending by hybrid_attr_count

# Output: `.claude/reports/<date>-hybrid-block-roster.md` (use today's date)

Required schema:
```
---
doc_type: report
generated: 2026-05-27
spec_ref: 22-FR-22-6
---

# Spec 22 Phase 0.4 — Hybrid-block roster

## Summary
- Total SGS blocks audited: <N>
- Total block_attributes rows scanned: <N>
- Hybrid blocks (≥1 content-bearing attr): <N>
- Estimated Phase 2 render.php migrations: <N>

## Roster

| block_slug | hybrid_attr_count | example_attrs (first 5) |
|---|---|---|
| sgs/product-card | <N> | description, image, productName, packSizes, ctaText |
| sgs/info-box | <N> | heading, body, image |
| ...  | ... | ... |

## Per-block-attr breakdown
(Optional — for blocks with hybrid_attr_count ≥ 3, list all attrs + resolved equivalent_block)

## Methodology
- equivalent_block_for() implementation: db_lookup.py:799 (positive-allowlist 2-tier per D85/D86)
- Query date: <UTC timestamp>
- DB snapshot: triple-NULL = 1,090 (baseline)
```

# Halt conditions
- equivalent_block_for() raises on any (slug, attr) pair → halt + report the pair
- Roster count outside 5-20 range → flag for Bean review at top of report (do NOT halt; report is still the deliverable)
- DB query takes >5 min → check LRU cache warmth; halt if anomalous

# Bindings
- A: NO commit authority — main session reviews + commits
- C: Living-docs — note in roster file's footer that Phase 2 scope is locked by this roster
- D: TodoWrite per major step (query, group, sort, write)
- F: Pure read-only against the DB; only write the roster markdown file
```

**Post-Haiku-return main-session steps:**
1. Review the roster file inline (Bean confirms count)
2. `/qc-inline` on the report (optional — it's a mechanical query result)
3. Update `.claude/state.md` current_subphase_step → "Phase 0 CLOSED; ready for Phase 1.1 (pre-rewrite snapshot)"
4. Commit Phase 0.4 with message citing predicted count vs actual
5. Update Spec 22 §FR-22-6 + §7 Commit 0.4 to cross-reference the roster file path

## Wave B (Mama's baseline re-capture) — check at session start

A Haiku agent was dispatched at the end of 2026-05-27 session to re-capture the Mama's full-page baseline with the new pixel-diff.py (chrome-hide + --wait-fonts). Per D88, the 2026-05-26 baseline was partially stale on chrome-affected cells.

- **If Wave B completed before this session opens:** check `pipeline-state/mamas-munches-baseline-2026-05-27-<timestamp>/` for the new run dir. Review the per-section deltas. If all cells within ±2pp or improved, commit the new baseline + update `.claude/state.md empirical_baseline` pointer + update Spec 22 §FR-22-7 with new baseline figures.
- **If Wave B is still running:** check the background task log + wait for completion before Phase 0.4. The two are independent so Phase 0.4 can start in parallel — but the Mama's baseline commit should land before Phase 1.4 dispatches anyway.

## Methodology guardrails (do not skip)

- **DB-first, no hardcoded dicts (R-22-1)** — Phase 0.4 audit uses the live `equivalent_block_for()` function + DB. No hand-curated lists.
- **Universal mechanisms, no per-block hyperfocus (R-22-9)** — every roster entry passes "does this block have ≥1 content-bearing attr per `equivalent_block_for()`?" — same logic for all blocks.
- **Read full spec before proposing fix-shape (R-22-10)** — for any block in the roster, the next session writing its render.php migration must read the full block.json + render.php END-TO-END before proposing the migration shape.
- **Verify rendered output, not internal metrics (R-22-11)** — Phase 2's commit gate is live editor smoke test ("no unexpected content" warning) + Stage 11 pixel-diff, not "the function returns the right slug".
- **/qc-council pre-commit gate (R-22-12)** — Phase 2 per-block migrations are converter-adjacent (blub.db 255); each commit gets multi-rater council.
- **Bean visual sign-off (R-22-13)** — Phase 4 acceptance is co-authoritative: script measurement + Bean's eye.

## Guardrails — what must not break

- Phase 0.4 audit must NOT modify any DB rows (read-only query).
- The roster file is the SOLE Phase 2 scope source — no hand-curated additions in Phase 2 dispatch briefs.
- `pipeline-state/_snapshots/triple-null-baseline.json` must still report 1,090 post-Phase-0.4 (no drift; this audit is read-only).
- All 30 wp-blocks-adversarial.py tests must still pass (`python plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-adversarial.py`).
- All 5 db_lookup.py unit tests must still pass.
- External regression test 4/4 PASS must hold.
