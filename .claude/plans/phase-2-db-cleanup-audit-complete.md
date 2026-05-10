# Phase 2 - DB Cleanup Audit

**USP:** Eliminate stale tables and rows so future maintenance + regenerate-csvs pass don't waste time on dead schema.
**Plan label:** [PLAN: opus]
**Docscore:** pending
**Aggregate cost estimate:** ~$0.40 (Opus inline; 2 SELECT-heavy probes; 0-2 ALTER/DROP if confirmed)

**Phase success criteria (done when):**
- [ ] sgs-framework.db audit report at `.claude/reports/db-audit-sgs-framework-2026-05-10.md` lists every table with verdict drop / keep / populate / migrate
- [ ] uimax-pro-max.db audit report at `.claude/reports/db-audit-uimax-pro-max-2026-05-10.md` same
- [ ] Bean approves drop list before any DROP fires
- [ ] Approved drops applied; regenerate-csvs run after; CSV layer matches new DB state
- [ ] `.claude/decisions.md` records each drop with reason

**Entry context:**
- `~/.agents/skills/sgs-wp-engine/sgs-framework.db` - sgs DB (live)
- `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` - uimax DB (live, 48 tables, 10,356 rows)
- `~/.agents/skills/ui-ux-pro-max/SKILL.md` - table inventory in body
- `.claude/handoff.md` - current session naming-convention work (some new tables tied to upcoming convention rollout)
- Phase 1 spec 13 - convention rule may make some tables obsolete or unused

**References:**
- 2026-05-10 capture: 11,964 → 10,356 rebuild discrepancy investigation
- Hard Rule 7 (Rosetta Stone) - every artefact row carries equivalent_implementations
- Hard Rule 8 (uimax data layer location)

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| cli | sqlite3 | Steps 1, 2 |
| inline | Read uimax SKILL.md | Step 3 |
| skill | uimax_write.py | Step 5 (if writes needed) |
| cli | update-db.py regenerate-csvs | Step 6 |

---

## Steps

### Step 1 - Inventory sgs-framework.db
- **Model:** inline
- **Action:** Run `sqlite3 ~/.agents/skills/sgs-wp-engine/sgs-framework.db ".tables"` then per-table COUNT(*) + first-row sample. Capture into report.
- **Files:** `.claude/reports/db-audit-sgs-framework-2026-05-10.md` (new)
- **Inputs:** none
- **Outcome:** Report contains: table name, row count, first-row sample, last-modified hint (if available), proposed verdict (drop / keep / populate / migrate)
- **Exec:** PARALLEL with Step 2 (different DBs, no overlap)
- **Deps:** none
- **Marker:** SESSION-START
- **Time:** 10 min
- **Tooling:** sqlite3 + Write
- **On-Fail:** If DB locked, run blub-db-unlock then retry
- **Cold-Entry:** This file + `~/.agents/skills/sgs-wp-engine/SKILL.md` (table descriptions)
- **Test:**
  - Happy: report exists with all sgs-framework tables enumerated
  - Edge: a table has no rows but schema is intentional (e.g. for future M9 work) → mark "keep, future-use"
  - Fail: DB missing → check Hard Rule 8 location
  - Integration: Step 4 audit verdict consumes this report

### Step 2 - Inventory uimax-pro-max.db (full 48 tables)
- **Model:** inline
- **Action:** Same as Step 1 but for uimax DB. Special attention to: empty stack_* tables (5 known: bootstrap, html_css, php, sgs_wordpress, wordpress); empty pipeline tables (recognition_log, mood_boards, mood_board_items, patterns); naming_conventions row count + new is_canonical_for_sgs_drafts column
- **Files:** `.claude/reports/db-audit-uimax-pro-max-2026-05-10.md` (new)
- **Inputs:** none
- **Outcome:** Report covers all 48 tables; verdict per table; explicit list of "drop candidates"
- **Exec:** PARALLEL with Step 1
- **Deps:** none
- **Marker:** (none)
- **Time:** 15 min
- **Tooling:** sqlite3 + Write
- **On-Fail:** Same as Step 1
- **Test:**
  - Happy: all 48 tables listed with verdicts
  - Edge: tables added by /uimax-* skills since the SKILL.md inventory was written → flag as "newly added, verify intent with Bean"
  - Fail: count mismatch with `_meta.total_rows` → record discrepancy in audit
  - Integration: feeds Step 3

### Step 3 - Cross-reference verdicts against current plan + Phase 1 outcomes
- **Model:** inline
- **Action:** For each "drop candidate" from Steps 1-2, check: (a) is it referenced by any pipeline script? (`grep -r <table_name> plugins/sgs-blocks/scripts/ tools/ ~/.agents/skills/`); (b) is it in the convention rollout (Phases 4-9) plan? (c) does Spec 12 / Spec 13 reference it?
- **Files:** Updates to both audit reports - verdict column gets cross-reference annotation
- **Inputs:** Steps 1-2 reports + grep results
- **Outcome:** Final verdict per table: drop / keep-but-shrink / keep / populate / migrate
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-2 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Grep + inline reading
- **On-Fail:** If cross-reference unclear, default to "keep" (conservative)
- **Test:**
  - Happy: every drop candidate has cross-reference verdict
  - Edge: a table is referenced ONLY by a deprecated script → flag both for cleanup
  - Fail: grep returns ambiguous results → defer to Bean
  - Integration: Step 4 surfaces final list to Bean

---

## QA Gate - Audit reports complete + cross-referenced
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-3 complete
- **Check:** `ls -la .claude/reports/db-audit-*-2026-05-10.md && wc -l .claude/reports/db-audit-*-2026-05-10.md`
- **Pass:** Both reports exist, each ≥30 lines (substantive content)
- **Fail:** Re-run Step 1 or 2 if missing
- **Marker:** QA

---

### Step 4 - Surface drop list to Bean for approval
- **Model:** inline
- **Action:** Present the cross-referenced drop list as a structured table (table | verdict | reason | downstream impact). End the turn - wait for Bean's per-row decision.
- **Files:** none (conversation only)
- **Inputs:** Steps 1-3 reports
- **Outcome:** Bean approves / rejects / amends each drop. No DROPs fire without approval.
- **Exec:** SEQUENTIAL
- **Deps:** Step 3 complete + QA gate passed
- **Marker:** HANDOFF
- **Time:** 5 min (just present; Bean response triggers Step 5)
- **Tooling:** AskUserQuestion or plain prompt
- **On-Fail:** If Bean defers all decisions, mark phase 2 partial and proceed to Phase 3
- **Test:**
  - Happy: Bean returns approved/rejected list
  - Edge: Bean wants more detail on one row → re-run Step 1/2 with deeper SELECTs on that table
  - Fail: Bean rejects entire premise (don't drop anything) → skip Steps 5-6
  - Integration: feeds Step 5 only after explicit approval

### Step 5 - Apply approved drops + schema changes
- **Model:** inline
- **Action:** For each approved drop: `DROP TABLE <name>` via uimax_write.py-equivalent flow OR direct sqlite3 if non-uimax. Per migration: ALTER + UPDATE. Record each in `.claude/decisions.md`.
- **Files:** sgs-framework.db / uimax-pro-max.db + `.claude/decisions.md`
- **Inputs:** Bean's approved list from Step 4
- **Outcome:** Each approved table dropped or migrated; decisions.md has one entry per change
- **Exec:** SEQUENTIAL (DB writes serial)
- **Deps:** Step 4 complete with approval
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** uimax_write.py for uimax; sqlite3 for sgs-framework; decisions.md edit
- **On-Fail:** If DROP fails because of FK constraints, surface to Bean before forcing
- **Test:**
  - Happy: post-DROP table count matches approved list (e.g. 48 → 45 if 3 tables dropped from uimax)
  - Edge: row count discrepancy after migration → cross-check sample rows
  - Fail: lock contention → blub-db-unlock + retry
  - Integration: Step 6 regenerate-csvs reflects post-drop state

### Step 6 - regenerate-csvs after schema changes
- **Model:** inline
- **Action:** `python ~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs` (uimax only - sgs-framework doesn't have CSV mirror)
- **Files:** uimax data/*.csv + data/stacks/*.csv
- **Inputs:** post-Step-5 uimax DB state
- **Outcome:** stdout reports correct number of CSVs (was 46; if N tables dropped, now 46-N; if any tables added, +N)
- **Exec:** SEQUENTIAL
- **Deps:** Step 5 complete
- **Marker:** HANDOFF
- **Time:** 1-2 min
- **Tooling:** update-db.py CLI
- **On-Fail:** Same as Phase 1 Step 6
- **Test:**
  - Happy: csv count + row counts match post-drop expectations
  - Edge: if no tables dropped, output identical to Phase 1 Step 6
  - Fail: lock contention → unlock + retry
  - Integration: future regenerate-csvs runs preserve clean schema

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Drop empty pipeline tables (`recognition_log`, `mood_boards`, `mood_board_items`, `patterns`) or keep them as scaffolding for upcoming work?
  - **Options:** A) Drop all 4 (M9 will recreate via /sgs-clone Stage 9 + +REGISTER) / B) Keep all 4 (avoid re-creating schema during M9) / C) Drop mood_board* (uncommon usage), keep recognition_log + patterns (M9 critical path)
  - **Recommendation:** C
  - **Why:** recognition_log + patterns are guaranteed to populate during M9; mood_board* is speculative
  - **Cost of wrong choice:** A re-creates 4 tables but adds Phase 8 friction; B keeps unused noise but no execution cost
  - **Who decides:** Bean

- **Decision:** Drop empty stack_* tables (`stack_bootstrap`, `stack_html_css`, `stack_php`, `stack_sgs_wordpress`, `stack_wordpress`) or wait?
  - **Options:** A) Drop now (5 tables × 0 rows each = no data loss) / B) Keep as scaffolding for future ingests / C) Drop the 4 truly-empty (PHP, html_css, bootstrap, wordpress) and keep stack_sgs_wordpress (to be populated by Phase 4 propagation)
  - **Recommendation:** C
  - **Why:** stack_sgs_wordpress is on the convention rollout's path; the other 4 are dead scaffolding from earlier ingester runs
  - **Cost of wrong choice:** A loses scaffolding for unlikely future ingest; B leaves dead tables forever
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** What if sgs-framework.db audit surfaces unexpected tables (e.g. `block_compositions` populated incorrectly during M9 prep)?
  - **Recommendation:** Surface row sample to Bean; default verdict "keep + flag for review"; do not auto-drop sgs-framework tables in this phase

- **Decision:** Does dropping a table require a corresponding skill-body update (e.g. removing references to dropped table from /uimax-* skills)?
  - **Recommendation:** Yes. Add the affected skill to Phase 4's batch list. Update its body during the same propagation pass (one-stone-two-birds)