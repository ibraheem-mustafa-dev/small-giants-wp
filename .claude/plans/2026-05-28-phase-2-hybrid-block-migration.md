---
doc_type: phase-plan
project: small-giants-wp
plan_id: 2026-05-28-phase-2-hybrid-block-migration
phase_name: Phase 2 — Hybrid Block Migration (Spec 22)
plan_label: "[PLAN: opus] — main session coordinates parallel Sonnet implementers + handles inline DB-row sense-checking with Bean"
parent_spec: .claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md
parent_session: small-giants-wp-2026-05-27-spec-22-phase-1.5-fix-1-shipped
generated: 2026-05-28
last_updated: 2026-06-02
active_scope: STREAM_A_RESHAPED_POST_D99
progress_2026_06_02: |
  THEME THREAD — FR-22-6 migration progress (feat/theme-blocks-wave1, NOT yet merged):
    - FR-22-6 roster classification report written: .claude/reports/2026-06-01-fr22-6-migration-classification.md
      (full 61-block roster classified by migration complexity; Wave-2A = 5 single-text blocks identified)
    - notice-banner MIGRATED (first content block using FR-22-6 InnerBlocks echo-$content pattern;
      mirrors info-box v4 reference migration; live-verified)
    - Wave-2A defined: social-proof / featured-product / gift-section / footer / header
    - Wave-2A GATED on P-FR226: null-save→InnerBlocks finding (blocks with save()=null need
      different migration path than blocks with save()=<InnerBlocks.Content />; classification
      report maps which blocks are affected; resolving P-FR226 unblocks Wave-2A dispatch)
    - Stream A steps (DB pre-pass + Fix 2b + canary measurement) UNCHANGED in scope
progress_2026_06_01: "Shared-branch converter advances (cloning thread, orthogonal to Stream A's DB pre-pass; Stream A steps unchanged): D141 routing fixes, D145 is-style carry + tag-authoritative content-leaf (b93a3b51), D146 sgs/button replaces core/button + multi-button grouping (270cd995). FR-22-20 variant detection PARTIALLY SHIPPED (D134, Commits 1-5/6). Plan-internal R-22-14 contradiction fixed this date: the 'add legacy fallback' instructions at Steps B0/B1 (lines ~329/332/387/399/631) were struck — they violated the P1-locked no-legacy-fallback rule; backwards-compat is Stream C WP-CLI batch migration only."
progress_2026_05_30: |
  D107-D113 architectural cleanup batch SHIPPED (Stream A continuation):
    - D107: XS-2 voter tier-driven recognition + `blocks.tier` column (sgs/hero + sgs/cta-section flagged class-section)
    - D108: `block_composition` table (188 rows; data layer LIVE, walker consumption DEFERRED)
    - D109: XS-3 walker code REVERTED post +13.07pp featured-product / +10.40pp social-proof regression
    - D110: XS-4 assign-canonical.py D99 port + batch backfill (canonical_slot 2.5% → 33.4%; role 5.3% → 33.2%)
    - D111: XS-5 retire 12 wrong/dead section-scope slot rows; re-insert testimonial/testimonial-slider at element scope
    - D112: D6 expanded sync-container-wrapping-blocks.py inheritance script (4 blocks flagged; threshold re-tune deferred)
    - D113: D5 methodology — STOP catalogue #12 + pre-flight ritual Q6 + STOP #13-#16 added
    - D3 build-deploy.py automation; mojibake fix announcement-bar block.json
    - product-card featured variant; XS-9.1 + XS-9.2 SGS atomic rich-text + button URL hardening
    - Pixel-diff trajectory: 58.6% → 56.40% = -2.20pp aggregate session movement
  DEFERRED to next session:
    - XS-3 walker recursion code (refined trigger at P-XS-3-TRIGGER-REFINEMENT)
    - D6 threshold re-tune (4 → 20-30 blocks at P-D6-THRESHOLD-RETUNE)
    - block_attributes 1316 NULL canonical_slot rows (vocabulary/regex gaps; runtime Tier B2 picks up some)
  block_composition data layer LIVE — Stream B walker consumption now unblocked from data side; walker code path still pending.
active_scope_note: |
  2026-05-29 UPDATE — D93-D100 architectural cleanup batch SHIPPED (commit bcbafe09).
  Stream A's original premise (fix slot_synonyms rows + verify both DBs) is MASSIVELY
  RESHAPED:
    - slot_synonyms TABLE GONE (D99) — replaced by unified `slots` table; row corrections
      now apply via UPDATE on `slots WHERE scope='element'`
    - "both DBs" framing was wrong (junction = same physical file); verify one suffices
    - Stream A2 partial: price slot fixed inline (sgs/text); items/social/section-roots
      deferred pending empirical measurement priorities
    - Stream A3 obsolete (same file)
    - Stream A4 ran as part of /sgs-update full sweep + populate-db.py refresh
    - Stream A5 (canary measurement) is the only major task remaining, plus 3 cleanups:
      sgs/media.videoUrl canonical_slot backfill, seed-slot-synonyms.py porting, remaining
      row corrections based on measurement results
  See .claude/next-session-prompt.md for the 5-task next-session plan.

  ORIGINAL active_scope_note (2026-05-27, pre-D99) for git-blame continuity:
  Per Bean directive 2026-05-27: Streams B/C/D are STRICTLY DEPENDENT on Stream A
  (walker can't preserve wrappers correctly until Fix 2b DB rows land; per-block
  migrations can't proceed without that). Active focus is Stream A only — make
  it work end-to-end first, then re-evaluate B/C/D scope after the empirical
  result of Stream A's measurement.
docscore_grade: PENDING — to be run as Stage 7 tightening pass next session
aggregate_cost_estimate_active: "Stream A: 3-5 hr focused work, 1-2 sessions"
aggregate_cost_estimate_total_if_all_streams_proceed: "~22-28 hr focused work, 4-6 sessions"
deferred_skill_invocations:
  - /research-check Stage 2 (scope well-defined; deferred unless mid-execution unknowns surface)
  - /dispatching-parallel-agents Hidden Decisions pass (deferred — run as tightening pass at session N+1 start)
  - /docscore on this plan (deferred — run at session N+1 start)
  - /subagent-prompt formal invocation per step (prompts written inline below; tightening pass can refine if needed)
binding_rules_invoked:
  - R-22-9 universal mechanism (no per-block hyperfocus)
  - R-22-14 NEW 2026-05-27 — FR-22-6 migrations never carry server-side legacy fallback hacks (Bean P1 locked)
  - FR-22-6 hybrid block migration spec
  - FR-22-6.1 parallel-session coordination protocol
  - blub.db 255 mandatory /qc-council per converter/SGS-block commit
  - blub.db 256 per-section cropped pixel-diff
  - blub.db 288 phases never ship as single commits
---

# Phase 2 — Hybrid Block Migration (Spec 22)

**USP:** Migrate 61 SGS hybrid blocks from scalar-attr-driven render.php to FR-22-6 InnerBlocks (`echo $content`) pattern. Eliminates ~60 block-specific scalar-render hacks; framework becomes consistent with WP-native InnerBlocks discipline. Unblocks Phase 2.5 (≤1% pixel-diff target) by ensuring walker-emitted content actually renders. R-22-9 universal mechanism — no per-block hyperfocus; same migration pattern across all 61 blocks.

**Plan label:** `[PLAN: opus]` — main session (Opus + Bean) coordinates parallel Sonnet implementers + handles inline DB-row sense-checking. Per-step Sonnet/Haiku dispatch via /delegate.

**Phase success criteria (done when):**
- [ ] DB-quality pre-pass complete: 180-200 `(block × content-bearing-attr × target-block)` triples sense-checked; suspicious slot_synonyms rows corrected
- [ ] Fix 2b shipped: section-internal BEM wrapper rows in slot_synonyms (`__content`, `__media`, `__inner`, `__products`, `__pill-group`, `__price-row`, `__cards`, `__card-inner` → sgs/container; alias extensions to text/label for `disclaimer`, `card-tag`, `card-description`, `card-price`) — applied via canonical seed-slot-synonyms.py flow, both DBs verified, per-row measurement gating
- [ ] Top 10 hybrid blocks migrated to FR-22-6 InnerBlocks pattern (hero, media, icon-list, cta-section, form-field-number, plus next 5 by hybrid_attr_count)
- [ ] Remaining 51 blocks migrated (long-tail; single-attr blocks)
- [ ] WP-CLI batch existing-post migration script shipped + tested on palestine-lives staging
- [ ] Mama's canary Stage 11 pixel-diff per-section ≤5% × 3 viewports (Phase 1 acceptance gate per Spec 22 FR-22-7)
- [ ] R-22-13 Bean visual sign-off on cropped-pair PNGs per section
- [ ] TEMP header-hide CSS override removed (commit `9a1bb252` reverted when header/footer migrate)
- [ ] state.md + decisions.md updated; Phase 2 marked CLOSED

**Entry context (read before starting):**
- `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-6 + §7 Phase 2 + §6 R-22-9 — canonical scope
- `.claude/reports/2026-05-27-hybrid-block-roster.md` — the 61-block prioritised roster
- `.claude/reports/2026-05-27-phase-1.5-systematic-debugging-synthesis.md` — Round 2 synthesis with the corrected primitive
- `plugins/sgs-blocks/src/blocks/product-card/render.php` + `deprecated.js` — proven FR-22-6 migration template (commit `a757ff1c`)
- `plugins/sgs-blocks/CLAUDE.md` "Adding a deprecation when a block's save output changes" section — canonical procedure
- `.claude/worktrees/agent-adf7827adc88aea77/plugins/sgs-blocks/src/blocks/hero/` — Fix 4's BLOCKED hero attempt; review what went wrong (walker collapse + missing legacy fallback) before re-attempting
- Project memory: `feedback_db_rows_via_sgs_update_not_direct_seed.md`, `feedback_row_by_row_measurement_gate_per_db_change.md`, `feedback_section_root_aliases_target_sgs_container_only.md`

**References:**
- Spec 22 §FR-22-6 — hybrid-block migration spec; §FR-22-6.1 — parallel-session coordination protocol
- Spec 22 §R-22-3 — 3-branch walker invariant
- Spec 22 §R-22-4 — pixel-diff gates every commit (predicted vs actual cited)
- Spec 22 §R-22-9 — universal mechanisms, no per-block hyperfocus
- Spec 22 §R-22-13 — Bean visual sign-off co-authoritative with script measurement
- blub.db 255 — /qc-council 4-rater pre-commit gate for converter/pipeline/SGS-block commits
- blub.db 256 — per-section cropped pixel-diff via `--selector .sgs-{section}`
- blub.db 276 — council fix-shapes are HYPOTHESES not specs
- blub.db 288 — phases never ship as single commits
- Reference migration: commit `a757ff1c` (sgs/product-card CTA migration)
- Previous Fix 4 attempt diff: `.claude/worktrees/agent-adf7827adc88aea77` (intact, /qc-council blocked)

**Tooling Index (used across this phase):**

| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /subagent-prompt | parallel dispatch prompts (pre-written inline below) |
| skill | /subagent-driven-development | Stream B per-block dispatches |
| skill | /qc-council | per-block pre-commit gate |
| skill | /sgs-clone | per-block Stage 11 measurement |
| skill | /capture-lesson | any new corrective rule surfaced |
| skill | /verify-loop | 2-attestation per load-bearing claim |
| skill | /handoff | session-close at SESSION-START markers |
| script | seed-slot-synonyms.py | Fix 2b rows |
| script | sgs-update-v2.py | post-row downstream rebuilds |
| script | sgs-clone-orchestrator.py | per-block pixel-diff measurement |
| script | pixel-diff.py --selector .sgs-{block} | per-section cropped diff |
| script | sgs-db.py | DB queries for fact-checking |
| script | WP-CLI (new) | batch existing-post migration |
| mcp | playwright | live-page DOM verification per R-22-11 |
| mcp | wp-blocks.py / wp-hooks.py | schema queries per blub.db 272 |

---

## Pre-conditions

Before Stream A starts:
- Fix 1 (walker FR-22-3 #3 ordering) shipped on origin/main as commit `5731dc36`. Verified by: `git log --oneline | grep 5731dc36`.
- Post-Fix-1 baseline measurement captured at `pipeline-state/mamas-munches-homepage-2026-05-27-193804/stage-11-pixel-diff.json` (mean 58.6%). Stream A's Step A5 compares against this.
- **Post-D107-D113 baseline (2026-05-30):** mean **56.40%** (−2.20pp from post-Fix-1 baseline). Stream A continuation shipped: XS-2 voter tier column (D107), block_composition data layer (D108, walker consumption deferred), XS-4 canonical_slot backfill 2.5% → 33.4% (D110), XS-5 slot row retirements (D111), D6 inheritance script expansion (D112). XS-3 walker recursion REVERTED (D109) after +13.07pp regression on featured-product / +10.40pp on social-proof — refined trigger queued for next session at parking entry P-XS-3-TRIGGER-REFINEMENT.
- R-22-14 binding rule active in Spec 22 §6 (commit `37dd2c79`).
- 4 captured lessons indexed in MEMORY.md.
- TEMP header-hide CSS override deployed (commit `9a1bb252`) — removes when Phase 2 sibling spec ships, not in this phase.

## Parking lot

Items deliberately deferred from this phase plan (do NOT add to Stream A scope):
- Phase 2.5 noise-floor work (≤1% pixel-diff bridge) — separate phase after Phase 2 closes.
- Header/footer cloner Phase 2 sibling spec (`.claude/plans/2026-05-24-phase-2-header-footer-cloner.md`) — blocked on Phase 2 hybrid migration close.
- Removing the TEMP header-hide CSS override — tied to header/footer cloner ship date.
- 5 pre-existing duplicate parking slugs from prior sessions — separate cleanup pass.
- Mirror-DB divergence root-cause investigation BEYOND Step A3 verification (Stream A's A3 surfaces it; deeper investigation is a separate parking entry if it persists).

## Streams overview

Phase 2 splits into four streams. **Active scope (Bean directive 2026-05-27): STREAM A ONLY.** Streams B/C/D are STRICTLY DEPENDENT on Stream A and are NOT yet in active scope. Their detailed step blocks below are PLACEHOLDER for future activation — they document the work shape so future-Bean knows what's coming, but they don't dispatch until Stream A's empirical measurement (Step A5) closes successfully.

| Stream | Scope | Time (optimistic) | Active scope? |
|---|---|---|---|
| **A** | DB-quality pre-pass + Fix 2b slot_synonyms rows + walker-wrapper preservation verified | 3-5 hr | **YES — active focus** |
| **B** | Per-block migrations (top 10 then long-tail 51) | 6-12 hr | NO — blocked on Stream A close + Stream A measurement result (decision-gate: does A's drop justify B's scope?) |
| **C** | WP-CLI batch existing-post migration script + production-site sweep | 2-4 hr | NO — blocked on Stream B critical mass |
| **D** | Mama's canary final measurement + Bean visual sign-off + cleanup + close | 1-2 hr | NO — phase closure |

**Why Stream-A-only first:** Stream B's per-block migrations depend on the walker correctly preserving `__content`/`__media` BEM wrappers as InnerBlock containers. Without Fix 2b (Stream A) the walker collapses those wrappers (empirically confirmed by Fix 4 Rater C 2026-05-27). Dispatching Stream B implementers before Stream A is wasted work — they'd produce migrations against the wrong walker output shape.

Stream A's Step A5 empirical measurement IS the gate. If the post-Fix-2b mean drops substantially (e.g. 58.6% → ~45-50% indicating wrapper preservation worked), Stream B becomes the next session's scope. If it doesn't drop or regresses, Stream A's row choices need revisiting before Stream B dispatch.

---

## Stream A — Prerequisites (sequential, inline)

### Step A1 — DB-quality pre-pass: fact-check the (block × attr × target) triples

```
Step A1 — DB-quality pre-pass
  Model:       inline (Opus + Bean sense-check)
  Action:      Run `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT ba.block_slug, ba.attr_name, ba.canonical_slot, ss.standalone_block, ss.role, ss.role_classification FROM block_attributes ba LEFT JOIN slot_synonyms ss ON ba.canonical_slot = ss.canonical_slot WHERE ba.canonical_slot IS NOT NULL AND ss.role_classification = 'content-bearing' ORDER BY ba.block_slug, ba.attr_name"` against `~/.claude/skills/sgs-wp-engine/sgs-framework.db`. Export to .claude/reports/2026-05-28-hybrid-migration-triples.csv. Bean reviews row-by-row (~180-200 rows), flags suspicious targets.
  Files:       .claude/reports/2026-05-28-hybrid-migration-triples.csv (new)
  Inputs:      sgs-framework.db block_attributes + slot_synonyms tables
  Outcome:     CSV of all (block × content-bearing attr × proposed target block) triples; Bean has marked which rows are suspicious (column "BEAN_FLAG: ✓ / ⚠ / ✗"). Suspicious rows feed Step A2.
  Exec:        SEQUENTIAL
  Deps:        none — first step
  Marker:      SESSION-START
  Time:        30-45 min (15 min generate, 15-30 min Bean review)
  Tooling:     sgs-db.py + spreadsheet/CSV viewer
  On-Fail:     If query returns 0 rows or schema errors, check Phase 0.1 backfill state — block_attributes.canonical_slot may not be populated.
  Cold-Entry:  Read Spec 22 §FR-22-2 + §FR-22-2.2 + the 3 captured lessons (db-rows-canonical-flow, row-by-row-measurement-gate, section-root-aliases). Then run the SQL query above.
  Test:
    Happy:       CSV produced; ~180-200 rows; Bean reviews + marks flags.
    Edge:        Blocks with 0 content-bearing attrs (rare — likely pure-styling blocks) — exclude from migration scope.
    Fail:        block_attributes.canonical_slot mass-NULL → halt; Phase 0.1 backfill needed first.
    Integration: standalone; output consumed by Step A2.
```

### Step A2 — Fix suspicious slot_synonyms rows (corrected Fix 2)

```
Step A2 — Fix suspicious slot_synonyms rows
  Model:       inline (Opus + Bean for decisions; haiku for mechanical row edits if many)
  Action:      For each row Bean flagged ⚠ or ✗ in Step A1: discuss the correct standalone_block target; edit `plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py` to add/correct the row; for new section-internal BEM rows (`__content`, `__media`, `__inner`, `__products`, `__pill-group`, `__price-row`, `__cards`, `__card-inner`) add as new canonical_slot rows → sgs/container; for alias extensions to `text` and `label` (`disclaimer`, `card-tag`, `card-description`, `card-price`, `price-note`) extend existing aliases. Apply per-row with measurement gate between batches.
  Files:       plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py
  Inputs:      Bean's marked CSV from A1; the 3 captured lessons (especially section-root-aliases — sgs/container only for section roots)
  Outcome:     seed-slot-synonyms.py edited with corrected rows; ready to run.
  Exec:        SEQUENTIAL
  Deps:        A1
  Marker:      (none)
  Time:        45-90 min (depends on how many rows Bean flags)
  Tooling:     Edit, sgs-db.py, the synthesis report
  On-Fail:     If a row's correct target is unclear, defer to Bean inline; do not guess.
  Test:
    Happy:       seed script syntactically valid; new/updated rows match Bean's CSV markings.
    Edge:        Row references a block that doesn't exist (typo) → reject; Bean re-checks.
    Fail:        Bean disagrees with target after dispute → revisit DB structure; may need new canonical_slot.
    Integration: feeds A3.
```

### Step A3 — Apply seed-slot-synonyms.py + verify BOTH DBs

```
Step A3 — Apply seed + verify both DBs
  Model:       inline
  Action:      Run `python plugins/sgs-blocks/scripts/uimax-tools/seed-slot-synonyms.py`. After completion, run `sgs-db.py sql "SELECT COUNT(*) FROM slot_synonyms"` against BOTH `~/.claude/skills/sgs-wp-engine/sgs-framework.db` AND `~/.agents/skills/sgs-wp-engine/sgs-framework.db` — counts must match. Spot-check 3 specific rows in BOTH DBs (the implementer-verification step Fix 2 failed at).
  Files:       Both sgs-framework.db locations (.claude/ + .agents/)
  Inputs:      Updated seed-slot-synonyms.py from A2
  Outcome:     Both DBs have identical row counts + the new rows are present in both.
  Exec:        SEQUENTIAL
  Deps:        A2
  Marker:      (none)
  Time:        10-15 min
  Tooling:     seed-slot-synonyms.py + sgs-db.py against both DB paths
  On-Fail:     If counts don't match, inspect seed script's two-DB iteration (lines 47-48, 647); manually re-run seed pointing at the lagging DB if needed. The Fix 2 mirror-divergence is exactly this risk.
  Test:
    Happy:       Both DBs at same count; new rows present in both.
    Edge:        seed script SKIPs one DB silently (file permission, missing file) → output line indicates which.
    Fail:        Mirror divergence persists → halt; investigate seed script's iteration code.
    Integration: feeds A4 (measurement) + Stream B (parallel dispatchers depend on correct DB rows).
```

### Step A4 — Run /sgs-update Stage 5+ for downstream refresh

```
Step A4 — /sgs-update downstream stage refresh
  Model:       inline
  Action:      Run `python plugins/sgs-blocks/scripts/sgs-update-v2.py --stage 5` (slot_synonym_auto_seed — auto-fills missing standalone_block on existing rows), then `--stage 6` (block_replacement_mapping verify) + `--stage 7` (spec_doc_regen) + `--stage 9` (drift_gate). Per the corrected captured lesson — /sgs-update doesn't add rows but DOES refresh dependent stages.
  Files:       sgs-framework.db (~/.agents only — /sgs-update writes there) + specs/02-SGS-BLOCKS-REFERENCE.md
  Inputs:      Updated slot_synonyms rows from A3
  Outcome:     Downstream stages refreshed; spec docs regenerated.
  Exec:        SEQUENTIAL
  Deps:        A3
  Marker:      (none)
  Time:        15-25 min
  Tooling:     sgs-update-v2.py
  On-Fail:     If --stage 5 reports anomalies on auto-seed (e.g. a slot_synonym with no clear standalone_block), inspect manually; may indicate Step A2 missed a row.
  Test:
    Happy:       4 stages green; spec doc regenerated; drift gate PASS.
    Edge:        Stage 5 reports unmatched canonical_slot → manual review.
    Fail:        Stage 9 drift gate flags WP version mismatch → not Phase 2 work; park as separate task.
    Integration: feeds A5.
```

### Step A5 — Re-baseline /sgs-clone post-Fix-2b

```
Step A5 — Re-baseline /sgs-clone post-Fix-2b
  Model:       inline
  Action:      Run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --converter-v2 --debug-trace --spec-22-acceptance --deploy-target page:144`. Capture stage-11-pixel-diff.json. Compare per-cell vs post-Fix-1 baseline (58.65% mean; run dir `pipeline-state/mamas-munches-homepage-2026-05-27-193804/`).
  Files:       New pipeline-state/<run-id>/ artefacts
  Inputs:      Live walker with Fix 1 + Fix 2b rows in place
  Outcome:     Per-cell pixel-diff captured; per-section deltas computed. **Hero 1440 in particular: did it drop now that __content/__media wrappers preserve?** Featured-product, gift-section, ingredients-section also expected to improve from internal-wrapper resolution.
  Exec:        SEQUENTIAL
  Deps:        A4
  Marker:      QA — Stream A pass-gate
  Time:        10 min (5 min /sgs-clone + 5 min comparison)
  Tooling:     sgs-clone-orchestrator.py + Python diff script
  On-Fail:     If any cell REGRESSES from post-Fix-1 baseline (58.65% mean), the Step A2 row decisions were wrong; revert specific rows + redo.
  Test:
    Happy:       Mean drops below 58.65% AND no cell regresses by more than 5pp.
    Edge:        Some cells improve while others don't change → per-block migration in Stream B addresses the rest.
    Fail:        Mean increases → revert Step A2 rows + revisit Bean's decisions on the suspicious triples.
    Integration: Stream B parallel dispatch gated on this PASSING.
```

### QA Gate (after Stream A) — A's commit boundary

```
QA Gate — Stream A acceptance
  Model:    inline
  Exec:     SEQUENTIAL
  Deps:     A1–A5 complete
  Check:    A3 confirms both DBs synced + A5 mean ≤ 58.65% (post-Fix-1 baseline) + no per-cell regression > 5pp
  Pass:     Commit seed-slot-synonyms.py changes to main with R-22-4 cite of per-cell pre/post; push to origin/main
  Fail:     Revert specific rows from A2 that caused regression; redo A3-A5
  Marker:   QA
```

---

---

## 2026-05-30 progress note — Stream A continuation + remaining waves

D107-D113 batch landed as Stream A continuation. block_composition (188 rows, D108) provides the data layer for Stream B's eventual walker consumption — Stream B implementers can now reference composition rows once the walker code path lands. XS-3 walker recursion was reverted (D109) and re-queued as P-XS-3-TRIGGER-REFINEMENT (refined trigger condition needed before re-attempt). D6 inheritance script (D112) flagged 4 blocks at the current threshold; threshold re-tune (4 → 20-30 blocks) deferred to next session at P-D6-THRESHOLD-RETUNE.

**Next-session Stream A continuation candidates:**
- P-XS-3-TRIGGER-REFINEMENT — refined walker recursion trigger (post-D109 revert)
- P-D6-THRESHOLD-RETUNE — sync-container-wrapping-blocks.py threshold re-tune
- block_attributes 1316 NULL canonical_slot rows — vocabulary/regex gaps (runtime Tier B2 in db_lookup picks up some at lookup time)

Stream B/C/D activation criteria unchanged from original plan (Bean approval after Stream A measurement gate).

## ⏸ DEFERRED FOLLOW-ON STREAMS (blocked on Stream A close)

The detailed step blocks for Streams B, C, D below DOCUMENT the work shape so future-Bean / future-sessions know what's coming. **They are NOT in active scope.** Do not dispatch implementers from these blocks until:

1. Stream A's Step A5 measurement passes the gate (mean drops + no per-cell regression > 5pp)
2. Bean approves Stream B kick-off based on the Stream A empirical result
3. Bean reviews and selects the Wave-1 block list (currently sketched as top 5-10 by `hybrid_attr_count` — top 5 = hero, media, icon-list, cta-section, form-field-number)

If Stream A's measurement is inconclusive or worse than expected, re-evaluate scope before activating Stream B. The plan stays usable as documentation either way.

R-22-14 invoked throughout Streams B/C/D: **NEVER add server-side legacy fallback hacks** to migrated render.php files. Backwards-compat comes via Stream C's WP-CLI batch existing-post migration, not via per-block scalar guards.

---

## Stream B — Per-block migrations (parallel via /subagent-driven-development) [DEFERRED]

### Step B0 — Read Fix 4 worktree to extract lessons

```
Step B0 — Review Fix 4 BLOCKED implementation
  Model:       inline
  Action:      Read the diff at `.claude/worktrees/agent-adf7827adc88aea77` (specifically hero's render.php, deprecated.js, edit.js changes). Extract the proven migration template. NB the BLOCKED attempt was missing a "legacy fallback" — DO NOT add one: R-22-14 (P1-locked D92) forbids it. The diff is structurally sound — it needs the prereq Fix 2b rows, NOT a fallback.
  Files:       .claude/worktrees/agent-adf7827adc88aea77/plugins/sgs-blocks/src/blocks/hero/*
  Inputs:      Round 2 synthesis report; Fix 4 implementer report; Rater B Step 8 finding
  Outcome:     Migration template extracted as `.claude/reports/2026-05-28-hybrid-migration-template.md` covering: (a) render.php diff shape (replace scalar inner-HTML with `echo $content`; NO server-side legacy fallback per R-22-14); (b) deprecated.js v(N+1) shape with isEligible + migrate(); (c) edit.js InnerBlocks template; (d) block.json schema (keep all attrs for round-trip).
  Exec:        SEQUENTIAL
  Deps:        Stream A complete (so prereq DB rows are in place)
  Marker:      SESSION-START — clean entry point for Stream B
  Time:        15-20 min
  Tooling:     Read, git diff
  On-Fail:     If worktree is gone (cleaned up), reconstruct template from product-card commit a757ff1c + the synthesis report's Fix 4 section.
  Cold-Entry:  Read this plan + the synthesis report + `plugins/sgs-blocks/CLAUDE.md` "Adding a deprecation" section before starting.
  Test:
    Happy:       Template doc produced; per-block dispatchers consume it.
    Edge:        Hero's edit.js had extra typography panels (dead post-migration) — template flags as Phase 2.2 cleanup, not blocking.
    Fail:        Migration template ambiguous on some pattern → invoke /research-check.
    Integration: feeds B1+.
```

### Step B1 — Dispatch top-10 hybrid blocks in parallel (Wave 1)

```
Step B1 — Wave 1: top-10 hybrid blocks via /subagent-driven-development
  Model:       sonnet per implementer × 10 (each block has its own implementer + 2 reviewers per blub.db 240)
  Action:      For each of the top 10 blocks by hybrid_attr_count (per `.claude/reports/2026-05-27-hybrid-block-roster.md` — hero, media, icon-list, cta-section, form-field-number, plus next 5), dispatch a fresh implementer with the migration template (B0 output). Per FR-22-6.1: each implementer's diff confined to `plugins/sgs-blocks/src/blocks/<slug>/` only; no shared-helper edits. Implementers return uncommitted diffs.
  Files:       plugins/sgs-blocks/src/blocks/<slug>/ × 10
  Inputs:      Migration template from B0; the roster CSV; the Spec 22 §FR-22-6 5-step procedure
  Outcome:     10 uncommitted diffs returned, one per block. Main thread reviews each.
  Exec:        PARALLEL with all of B1's 10 implementers
  Deps:        B0 + Stream A complete
  Marker:      (none)
  Time:        Per-implementer ~30-60 min; total wall-time ~60-90 min with parallelism
  Tooling:     /subagent-driven-development + isolated worktrees per implementer
  On-Fail:     If an implementer blocks on a shared helper, halt parallel wave; main thread adds the helper sequentially; restart the blocked implementer.
  Prompt:      [Pre-written cold prompt — see template below]
  Test:
    Happy:       All 10 diffs returned uncommitted; each contains render.php + deprecated.js + edit.js + (optionally) block.json + npm build success.
    Edge:        Single-attr blocks (form-field-number with 6 attrs is mid-range; tail blocks may have only 1 hybrid attr — migration still applies but is simpler).
    Fail:        Implementer reports "shared helper needed" — halt parallel; sequential main-thread fix.
    Integration: feeds B2 (per-block /qc-council).
```

#### Pre-written cold prompt for B1 per-block implementers

```
You are the IMPLEMENTER for Spec 22 Phase 2 Commit 2.N — migrate sgs/<SLUG> render.php from scalar-attr-driven to FR-22-6 InnerBlocks pattern.

Working dir: c:/Users/Bean/Projects/small-giants-wp (inherited worktree)
Block: sgs/<SLUG> — currently has <N> content-bearing hybrid attrs per Phase 0.4 roster

Read FIRST:
- `.claude/reports/2026-05-28-hybrid-migration-template.md` — proven migration template
- `.claude/specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md` §FR-22-6 + §FR-22-6.1
- `plugins/sgs-blocks/src/blocks/product-card/` (proven reference; commit a757ff1c)
- `plugins/sgs-blocks/src/blocks/<SLUG>/` (your target)
- `plugins/sgs-blocks/CLAUDE.md` "Adding a deprecation when a block's save output changes" — canonical procedure

Do:
1. Identify content-bearing attrs to deprecate (vs structural/styling/behavioural to keep on wrapper)
2. Migrate render.php: replace scalar inner-HTML build with `echo $content` slot consumption. **R-22-14 (P1-LOCKED): NEVER add a server-side legacy fallback** (`if (empty($content) && !empty($<attr>)) {…}`) — it re-adds exactly what FR-22-6 retires. Unedited production posts are migrated by Stream C's WP-CLI batch existing-post migration, NOT by a per-block scalar guard.
3. Add deprecated.js v(N+1) with isEligible + migrate() that builds transient InnerBlocks via createBlock()
4. Update edit.js to use useInnerBlocksProps + template
5. Verify save.js is `<InnerBlocks.Content />`
6. Run `npm run build` from plugins/sgs-blocks/
7. Run R-22-3 AST self-test + pytest (both must stay green)

Constraints:
- NO git commit / push / stash / reset / restore / checkout (blub.db 230)
- NO new bespoke blocks (R-22-9)
- Touch ONLY plugins/sgs-blocks/src/blocks/<SLUG>/ (FR-22-6.1)
- Preserve all attrs in block.json (round-trip safety)
- Server-side legacy fallback FORBIDDEN per R-22-14 (P1-locked D92, supersedes the earlier Rater B Step 8 finding). Backwards-compat = Stream C WP-CLI batch migration, never a scalar guard.

Return uncommitted diff + R-22-3 PASS + pytest PASS + build success.
```

### Step B2 — Per-block /qc-council 4-rater gate (Wave 1)

```
Step B2 — Per-block /qc-council 4-rater
  Model:       cross-family (Sonnet + Haiku + Gemini Flash + inline Opus) per block
  Action:      For each Wave 1 diff: dispatch 3 parallel cross-family raters (spec compliance / correctness-edge-cases / pragmatic-end-to-end) + inline Opus rater. Per blub.db 255. Same shape as Fix 1's council.
  Files:       Each implementer's worktree
  Inputs:      The 10 Wave 1 diffs from B1
  Outcome:     APPROVE / APPROVE-WITH-FIXES / BLOCK per block. Track in `.claude/reports/2026-05-28-phase-2-council-results.md`.
  Exec:        PARALLEL per block (3 raters × 10 blocks); SEQUENTIAL per block (rater verdicts then commit decision)
  Deps:        B1
  Marker:      QA
  Time:        Per-block ~15-20 min wall-time; total ~30-45 min with parallelism
  Tooling:     /subagent-driven-development for cross-family raters
  On-Fail:     BLOCK verdicts → halt the specific block; address findings; re-rate.
  Test:
    Happy:       All 10 blocks APPROVE (with or without non-blocking findings).
    Edge:        APPROVE-WITH-FIXES findings tracked as parking entries.
    Fail:        BLOCK verdict on any block → fix or defer that block; proceed with the others.
    Integration: feeds B3.
```

### Step B3 — Per-block deploy + Stage 11 measurement + commit (Wave 1)

```
Step B3 — Deploy + measure + commit per block (Wave 1)
  Model:       inline (main thread coordinates; each block is its own commit per blub.db 288)
  Action:      For each APPROVED block: copy diff from worktree to main; `npm run build` if not done; deploy via tar to sandybrown; run `/sgs-clone --auto-section --debug-trace --converter-v2 --spec-22-acceptance --deploy-target page:144` to measure per-section delta; commit with R-22-4 predicted-vs-actual cite.
  Files:       Main repo `plugins/sgs-blocks/src/blocks/<slug>/` + `plugins/sgs-blocks/build/`
  Inputs:      APPROVED diffs from B2
  Outcome:     10 commits on origin/main, one per block; per-commit pixel-diff delta cited.
  Exec:        SEQUENTIAL per block (each block's measurement must complete before the next deploys — otherwise attribution is muddled per the captured row-by-row lesson)
  Deps:        B2
  Marker:      HANDOFF candidate after every 2-3 commits if session is long
  Time:        Per-block ~15-20 min (deploy 5 min + measure 5 min + commit 5 min + verify); total ~3-4 hr
  Tooling:     git, tar deploy, sgs-clone-orchestrator.py, pixel-diff.py
  On-Fail:     If a block's pixel-diff REGRESSES, do not commit; investigate; possibly revert.
  Test:
    Happy:       Each commit's predicted-vs-actual matches (or exceeds) the prediction; pixel-diff drops monotonically.
    Edge:        Long-tail single-attr blocks produce minimal pixel-diff change (expected).
    Fail:        Regression on any block → revert that block's diff; re-investigate.
    Integration: feeds B4 (next wave) + Stream C (WP-CLI script can start once Wave 1 done).
```

### Step B4 — Wave 2: long-tail 51 blocks via parallel dispatch

```
Step B4 — Wave 2: long-tail 51 blocks
  Model:       Sonnet × 51 implementers (parallel batches of 8-12 at a time)
  Action:      Same per-block migration template as B1; dispatch in batches of 8-12 (to avoid overwhelming the council/measurement pipeline). Per-block /qc-council + measurement + commit as per B2+B3.
  Files:       plugins/sgs-blocks/src/blocks/<slug>/ × 51
  Inputs:      Wave 1 migration template + lessons learned from Wave 1 (any common patterns that need refinement)
  Outcome:     51 additional commits on origin/main; Phase 2 migration roster complete.
  Exec:        PARALLEL within batches; SEQUENTIAL across batches
  Deps:        B3 (Wave 1 done)
  Marker:      SESSION-START between batches
  Time:        Wave 2 ~6-10 hr wall-time across 4-7 batches
  Tooling:     Same as B1-B3
  On-Fail:     Same as B1-B3
  Prompt:      [Same as B1 template — adjust SLUG + roster row per dispatch]
  Test:
    Happy:       All 51 blocks migrated; council + measurement + commit per block.
    Edge:        Tail blocks with 1 hybrid attr — quick wins; commit batches of 5-10.
    Fail:        Same as B1-B3.
    Integration: feeds D (phase closure).
```

### QA Gate (after Stream B) — all 61 blocks migrated

```
QA Gate — Stream B acceptance
  Model:    inline
  Exec:     SEQUENTIAL
  Deps:     B1–B4 complete
  Check:    `git log --oneline --grep="fix(spec-22-phase-2)" | wc -l` ≥ 61 (one commit per block); Phase 0.4 roster query returns 0 blocks with non-migrated render.php
  Pass:     Stream C kick-off
  Fail:     Identify missing blocks; dispatch follow-up wave
  Marker:   QA
```

---

## Stream C — WP-CLI batch existing-post migration (can start once Wave 1 done) [DEFERRED]

### Step C1 — Design WP-CLI migration script

```
Step C1 — WP-CLI migration script design
  Model:       inline (architectural)
  Action:      Design `plugins/sgs-blocks/scripts/migrate-legacy-hero-posts.php` (and equivalent for other migrated blocks). Script: walk all posts via `wp post list --post_type=any --field=ID`, for each post `wp post get --field=post_content`, parse blocks, find hybrid blocks with legacy scalar shape, force deprecated.js migration via headless WP block-parser (use `parse_blocks()` + `serialize_blocks()` + `apply_filters('block_parser_class', ...)`), `wp post update --post_content=<migrated>`.
  Files:       plugins/sgs-blocks/scripts/migrate-legacy-hybrid-posts.php (new)
  Inputs:      Spec 22 §FR-22-6 deprecation procedure; WP block parser docs
  Outcome:     Design doc + WP-CLI script ready for testing.
  Exec:        SEQUENTIAL
  Deps:        B3 Wave 1 done (at least hero migrated; existence-of-migrator depends on this)
  Marker:      (none)
  Time:        60-90 min (design + skeleton script)
  Tooling:     WP-CLI; PHP; wp-includes/blocks.php reference
  On-Fail:     If WP-CLI can't run deprecated.js migrations (they're JS-only), fall back to: WP-CLI walks posts, identifies legacy shapes, queues them for manual editor-open (less efficient but works).
  Test:
    Happy:       Script identifies legacy-shaped hero blocks correctly; migration produces v(N+1)-shaped output.
    Edge:        Posts with mixed legacy + already-migrated blocks (rare) → migrate only the legacy ones.
    Fail:        Block parser can't round-trip → manual editor-open fallback.
    Integration: feeds C2.
```

### Step C2 — Test on palestine-lives staging

```
Step C2 — Test WP-CLI script on palestine-lives staging
  Model:       inline
  Action:      Take a backup of palestine-lives DB. Run script in `--dry-run` mode first (logs would-migrate posts without writing). Then run live on 1-2 test posts. Verify frontend renders correctly before + after via Playwright.
  Files:       (none; runs against live WP)
  Inputs:      C1 script + palestine-lives.org SSH access
  Outcome:     Script verified safe; ready for production sweep.
  Exec:        SEQUENTIAL
  Deps:        C1
  Marker:      QA
  Time:        45-60 min
  Tooling:     WP-CLI, Playwright, SSH
  On-Fail:     Rollback from DB backup; redesign C1.
  Test:
    Happy:       1-2 posts migrated cleanly; frontend before/after pixel-diff < 1%.
    Edge:        Post with complex InnerBlocks structure (e.g. existing partial migration) — migrate only what needs migrating.
    Fail:        Frontend regresses post-migration → rollback + script bug.
    Integration: feeds C3.
```

### Step C3 — Production sweep across all client sites

```
Step C3 — Production sweep
  Model:       inline (Bean-gated per site)
  Action:      For each production client site (palestine-lives.org, mamas-munches client site if live, indus-foods, helping-doctors): backup DB, run dry-run, present queue to Bean for approval, run live migration. Per blub.db 213 (Rosetta Stone discipline) — log migrations to recognition_log.
  Files:       (per-site; backups stored in pipeline-state/)
  Inputs:      C2 verified script
  Outcome:     All production sites' legacy hybrid-block posts migrated to v(N+1) shape.
  Exec:        SEQUENTIAL per site (Bean approves each)
  Deps:        C2
  Marker:      QA per site
  Time:        Per-site ~20-30 min; total ~1-2 hr
  Tooling:     WP-CLI, Playwright, SSH per site
  On-Fail:     Per-site rollback from backup.
  Test:
    Happy:       Each site's posts migrate cleanly; frontend visual parity holds.
    Edge:        Sites with custom content overrides may have edge cases — Bean reviews.
    Fail:        Any site regresses → rollback that site only; investigate.
    Integration: feeds Stream D.
```

---

## Stream D — Phase closure [DEFERRED]

### Step D1 — Mama's canary final Stage 11 measurement

```
Step D1 — Phase 2 acceptance measurement
  Model:       inline
  Action:      Final `/sgs-clone --debug-trace` run on Mama's page 144. Compare every body cell (7 sections × 3 viewports = 21 cells) against the ≤5% Phase 1 acceptance gate (Spec 22 §FR-22-7). Aggregate mean + per-cell verdicts.
  Files:       New pipeline-state run dir
  Inputs:      All Stream A + B + C work complete
  Outcome:     Per-cell PASS/FAIL table; aggregate mean cited.
  Exec:        SEQUENTIAL
  Deps:        All of A, B, C
  Marker:      QA — Phase 2 acceptance gate
  Time:        15 min (5 min /sgs-clone + 10 min comparison vs targets)
  Tooling:     sgs-clone-orchestrator.py + Python diff script
  On-Fail:     If any cell > 5%, investigate (likely Phase 2.5 noise-floor territory, not migration issue).
  Test:
    Happy:       21/21 cells PASS ≤5%; Phase 1 acceptance gate met.
    Edge:        18-20/21 cells PASS — remaining cells are Phase 2.5 work (chrome-bleed / font-load timing).
    Fail:        <17/21 cells PASS → halt; root-cause per residual class-of-failure; may need additional migration scope.
    Integration: feeds D2.
```

### Step D2 — R-22-13 Bean visual sign-off

```
Step D2 — Bean visual sign-off
  Model:       inline (Bean reviews cropped-pair PNGs)
  Action:      Bean opens 21 cropped-pair PNGs at `pipeline-state/<run>/pixel-diff/<sel>-<vp>/{mockup,sgs}.png` and signs off each. Per R-22-13: script number + visual sign-off both required.
  Files:       Cropped-pair PNGs from D1
  Inputs:      D1 measurement results
  Outcome:     Visual sign-off captured (markdown table in `.claude/reports/2026-05-28-phase-2-bean-sign-off.md` with ✓ / ⚠ / ✗ per cell).
  Exec:        SEQUENTIAL
  Deps:        D1
  Marker:      QA — R-22-13 binding rule
  Time:        20-30 min (~1 min per cell × 21)
  Tooling:     Image viewer; markdown editor
  On-Fail:     Any ⚠ or ✗ → investigate that specific cell; may need targeted block migration follow-up or Phase 2.5 noise-floor work.
  Test:
    Happy:       21/21 ✓; Phase 2 visually acceptable.
    Edge:        Some ⚠ → minor cosmetic issues; flag for Phase 2.5.
    Fail:        ✗ on any cell → halt; specific block needs follow-up.
    Integration: feeds D3.
```

### Step D3 — Remove TEMP header-hide override + close phase

```
Step D3 — Close Phase 2
  Model:       inline
  Action:      (a) Remove the TEMP CSS override from sites/mamas-munches/theme-snapshot.json (added in commit 9a1bb252). (b) Update state.md: current_phase → spec-22-phase-2-CLOSED. (c) Update decisions.md with D-numbers for any architectural decisions surfaced during Phase 2. (d) Update parking.md if any deferred items emerged. (e) Re-deploy theme-snapshot via push-theme-snapshot.py to remove the override. (f) Final commit: "phase(spec-22-phase-2): CLOSED — 61 hybrid blocks migrated, ≤5% acceptance met, Bean sign-off captured".
  Files:       sites/mamas-munches/theme-snapshot.json, .claude/state.md, .claude/decisions.md, .claude/parking.md
  Inputs:      D2 sign-off complete
  Outcome:     Phase 2 marked CLOSED; framework state clean; Phase 2.5 (≤1% pixel-diff) can begin in next session.
  Exec:        SEQUENTIAL
  Deps:        D2
  Marker:      HANDOFF — Phase 2 close
  Time:        30-45 min
  Tooling:     Edit, push-theme-snapshot.py, git
  On-Fail:     If theme-snapshot push fails, leave the override in place; Phase 2 still closes architecturally.
  Cold-Entry:  This is a session-close step; next session starts Phase 2.5 from scratch.
  Test:
    Happy:       Header renders correctly on canary post-override-removal; all docs updated; final commit + push succeed.
    Edge:        Removing the override surfaces a remaining header issue → Phase 2 sibling spec (header/footer cloner) becomes next session's focus, not Phase 2.5.
    Fail:        Push fails → manual intervention.
    Integration: closes the phase; Phase 2.5 begins next session.
```

---

## Key Judgement Calls

### Primary decisions

- **Decision — RESOLVED by R-22-14 (D92, P1-locked 2026-05-27):** NO server-side legacy fallback in any migrated render.php. Backwards-compat is **Option [B]** only — Stream C's WP-CLI batch migration sweeps production posts first. (Option [A]/[C] legacy-fallback paths are FORBIDDEN — they re-add the exact hybrid debt FR-22-6 retires; see memory `feedback_fr22_6_hybrid_problem_is_sgs_only_no_legacy_fallback_hacks`.)
  - ~~**Options:** [A] Legacy fallback in every render.php; [B] WP-CLI batch migration first; [C] Hybrid~~ — superseded by R-22-14.
  - **Recommendation:** [C] Hybrid. The fallback is small per-block; the sweep is the primary migration path; if the sweep misses any post (caching, mid-deploy timing) the fallback prevents content loss.
  - **Why:** Production safety > code purity. The fallback IS scalar code we want to remove, but it's a 10-line guard per block, not 100 lines.
  - **Cost of wrong choice:** [A]-only adds maintenance burden across 61 blocks. [B]-only risks content loss if sweep misses anything. [C] is robust.
  - **Who decides:** Bean (production-safety call)

- **Decision:** Wave 1 size — 10 blocks or smaller batches (e.g. 5)?
  - **Options:** [A] 10 in parallel (max throughput); [B] 5 in parallel + iterate (more measurement gates); [C] 3 in parallel (most cautious)
  - **Recommendation:** [B] 5 + iterate. The first wave lands the top-leverage blocks (hero/media/icon-list/cta-section/form-field-number) with proper measurement gates between. Wave 2 starts with 10 once the pattern is proven.
  - **Why:** Fix 4's BLOCK at /qc-council showed an unforeseen issue (walker collapse). Wave 1 needs to surface any cross-cutting issues with the migration template before scaling up.
  - **Cost of wrong choice:** [A] risks 10 simultaneous BLOCK verdicts at council = 10× re-implementation; [C] is too cautious (wastes parallelism).
  - **Who decides:** Bean (risk tolerance)

- **Decision:** Per-block commit message format — verbose (cite spec FR/R per commit) or compact (cite once in phase-close commit)?
  - **Options:** [A] Verbose per-block (every commit cites FR-22-6 + R-22-9 + predicted-vs-actual); [B] Compact per-block + comprehensive phase-close commit; [C] Tag-based (commits link to phase-close doc)
  - **Recommendation:** [A] Verbose per-block. Per blub.db 288 + R-22-4 + R-22-13, each commit is its own measurement event with its own predicted-vs-actual cite.
  - **Why:** Bisectability + audit trail. If a regression surfaces 6 months later, the per-block commit message has the spec rationale + measurement.
  - **Cost of wrong choice:** [B/C] make bisecting hard.
  - **Who decides:** main thread (project conventions)

### Pre-emptive decisions (deferred — Hidden Decisions pass to run next session)

The formal Hidden Decisions pass (gemini-flash + cerebras parallel peer review per phase-planner Stage 6) is deferred to a tightening pass at session N+1 start. Likely topics to surface:

- How to handle blocks where multiple slot_synonyms aliases conflict (one alias maps to two different standalone_blocks)
- What to do if the WP-CLI block-parser can't roundtrip a specific block shape
- Whether to ship Phase 2 commits as a single PR (61 commits squashed) or one-at-a-time
- How to handle hero's split-variant vs standard-variant — does the migration shape differ?

---

## Risks (Stage 3)

| Risk | Likelihood × Impact | Mitigation |
|---|---|---|
| Wave-1 parallel implementers produce inconsistent migration shapes | M × H | Detailed migration template in B0; council per block in B2 |
| WP-CLI batch script fails on edge-case post shapes | M × H | C2 staging test on palestine-lives before C3 production sweep |
| Wave-2 parallel dispatch overwhelms /qc-council bandwidth | M × M | Batch size of 8-12; sequential between batches |
| Production site regression during sweep | L × H | Per-site DB backup; Bean-gated approval per site |
| Some blocks have content-bearing attrs that don't map to any existing primitive (need new InnerBlock target) | L × M | DB-quality pre-pass (A1) catches this; surface as parking entry |
| Phase 2.5 noise-floor work surfaces an unexpected blocker at D1 measurement | L × M | Phase 2 acceptance gate is ≤5%, not ≤1% — buys margin |
| Mid-migration walker bug surfaces that wasn't anticipated | L × H | Per-block measurement after each commit catches regressions early; revertible commits |

---

## Aggregate cost estimate

- Stream A: 3-5 hr inline (Opus + Bean sense-checking)
- Stream B: ~10 hr Sonnet implementer time (parallelisable) + ~3 hr inline coordination + ~3-4 hr /qc-council
- Stream C: 2-4 hr inline
- Stream D: 1-2 hr inline

**Total: ~22-28 hr focused work, multi-session (4-6 sessions of 3-5 hr each).**

Per blub.db 288 (phases never ship as single commits) — Phase 2 will produce ~65-70 commits on origin/main (1 per block + WP-CLI script + Phase 2 close + Fix 2b commit).

---

## Next-session entry — Stream A ONLY active

Open this plan. Start at **Step A1** (DB-quality pre-pass) — the smallest first action per ADHD Rule 2 (≤45 min, zero dependencies, produces an immediately reviewable CSV).

**Active session goal:** complete Stream A's 5 steps + the QA gate. Stop when A5's measurement is captured. Bean reviews the empirical result + decides whether to activate Stream B in the next session.

If picking up mid-Stream-A:
- After A1: pick up at A2 (Bean sense-checks suspicious rows in the CSV)
- After A2: pick up at A3 (run seed + verify both DBs synced)
- After A3: pick up at A4 (/sgs-update downstream stages)
- After A4: pick up at A5 (/sgs-clone re-baseline measurement)
- After A5 (QA gate PASS): close session via /handoff; surface measurement results; await Bean decision on Stream B activation

**Streams B/C/D entry deferred** until Stream A's empirical result clears the QA gate AND Bean approves activation.

---

## Stage 7 — Docscore (deferred)

Run `python ~/.agents/skills/shared-references/docscore.py .claude/plans/2026-05-28-phase-2-hybrid-block-migration.md` at session N+1 start. Target: Grade A. Tightening pass adjusts any sub-A sections.

## Stage 8 — Living Docs Update (to be done at next-session start)

Pending writes when Phase 2 opens:
- `.claude/state.md`: `current_phase: spec-22-phase-2-hybrid-block-migration`; `current_subphase: A1 DB-quality pre-pass`
- `.claude/decisions.md`: D90 — Phase 1.5 closed with just Fix 1; Phase 2 reordered ahead of pixel-diff target; Phase 2.5 = bridge to ≤1% (was original Phase 1.5 stretch)
- `.claude/parking.md`: any deferred items from this planning session
- blub.db `plans` table: write this plan's machine-readable record via /api/knowledge
