# Phase 1 - Foundation (capture lesson + Spec 13 + living docs + uimax flag)

**USP:** Establish the canonical reference for SGS-BEM convention so every downstream phase points at one authoritative source.
**Plan label:** [PLAN: opus]
**Docscore:** pending (run before execution)
**Aggregate cost estimate:** ~$0.80 (Opus inline; 1 subprocess call to capture-lesson; 1 uimax write + regen)

**Phase success criteria (done when):**
- [ ] blub.db row exists with pattern_key `bean-drafts-use-sgs-prefixed-bem-naming` (id captured)
- [ ] `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` exists with convention spec, examples per role, migration policy, validation rule
- [ ] `~/.claude/.lifecycle-mode-bulk.json` exists permitting subsequent skill edits
- [ ] 6 living docs reference Spec 13: project CLAUDE.md, .claude/CLAUDE.md, state.md, goals.md, architecture.md, mistakes.md
- [ ] uimax `naming_conventions` table has `is_canonical_for_sgs_drafts` column populated; SGS-BEM row flagged true
- [ ] `update-db.py regenerate-csvs` ran cleanly; CSV mirrors match DB

**Entry context:**
- `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` - current pipeline architecture
- `.claude/handoff.md` (current) - naming-convention-coverage session context
- `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` - uimax DB
- `~/.agents/skills/sgs-wp-engine/sgs-framework.db` - sgs DB
- `plugins/sgs-blocks/scripts/uimax-tools/uimax_write.py` - canonical write helper

**References:**
- blub.db lesson row 215 (no-resume) + 220 (broaden search) - already captured
- Hard Rule 7 (Rosetta Stone) in `.claude/CLAUDE.md` - uimax-write discipline
- Hard Rule 8 (uimax data layer location) in `~/.agents/skills/sgs-wp-engine/SKILL.md`

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| skill | /capture-lesson | Step 1 |
| cli | `update-db.py regenerate-csvs` | Step 6 |
| script | uimax_write.py | Step 5 |
| inline | Edit + Write | Steps 2, 3, 4 |

---

## Steps

### Step 1 - Capture canonical-convention lesson via /capture-lesson
- **Model:** inline
- **Action:** Invoke `/capture-lesson` with the rule text drafted in conversation (pattern_key `bean-drafts-use-sgs-prefixed-bem-naming`, area `revenue-sgs`, priority `high`, full body listing all 48 affected surfaces + lingua-franca-conversion sub-rule + cross-platform structural alignment + the 9-stage determinism table)
- **Files:** `~/.openclaw/workspace/memory/learning/2026-05-10-bean-drafts-use-sgs-prefixed-bem-naming.md` (Layer 1) + `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_bean_drafts_use_sgs_prefixed_bem_naming.md` + MEMORY.md (Layer 2) + blub.db `learnings` table row (Layer 3)
- **Inputs:** rule text from conversation
- **Outcome:** All 3 layers persisted; blub.db returns `{"id": N}`
- **Exec:** SEQUENTIAL
- **Deps:** none
- **Marker:** SESSION-START
- **Time:** 5 min
- **Tooling:** `/capture-lesson` skill
- **On-Fail:** If blub.db POST hangs, run `python C:/Users/Bean/.claude/hooks/blub-db-unlock.py` and retry once
- **Cold-Entry:** This file + `.claude/handoff.md` (current session) + the rule text drafted in conversation
- **Test:**
  - Happy: `curl -s "http://localhost:5050/api/learning?pattern_key=bean-drafts-use-sgs-prefixed-bem-naming"` returns 1 row
  - Edge: rule text contains an em-dash → /capture-lesson rejects per Bean preference
  - Fail: blub.db locked → unlock script runs and retry succeeds
  - Integration: Layer 2 MEMORY.md index updated with new entry

### Step 2 - Disable lifecycle gate for bulk-edit session
- **Model:** inline
- **Action:** Write `~/.claude/.lifecycle-mode-bulk.json` with `{"mode":"A","target":"bulk-convention-rollout","depth":"skip-grading","session_id":"<env CLAUDE_SESSION_ID or generated UUID>"}`
- **Files:** `~/.claude/.lifecycle-mode-bulk.json` (new)
- **Inputs:** session ID from environment
- **Outcome:** Mode file exists; subsequent SKILL.md edits permitted by lifecycle-gate.py
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 1 min
- **Tooling:** Bash + python json.dump
- **On-Fail:** If mode file write fails (permission), check `~/.claude/` writability
- **Test:**
  - Happy: `cat ~/.claude/.lifecycle-mode-bulk.json` returns valid JSON with mode=A
  - Edge: mode file already exists from prior session → overwrite with current session_id
  - Fail: SKILL.md Edit attempt should now succeed without lifecycle-gate veto (test in Phase 3)
  - Integration: lifecycle-gate.py reads file at next PreToolUse Edit

### Step 3 - Write Spec 13 (Draft Naming Convention)
- **Model:** inline
- **Action:** Write `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` with: (a) the rule statement, (b) per-role examples (block / element / modifier × wrapper / primary-text / media-slot / link-cta / responsive-spacing / visual-token), (c) migration policy for existing drafts, (d) validation rule (selector regex + automated lint command), (e) lingua-franca-conversion sub-rule for live scrapes, (f) cross-platform alignment table from conversation, (g) determinism table (9 stages × today vs after-rule)
- **Files:** `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` (new, ~150-200 lines)
- **Inputs:** drafted rule text + tables from conversation
- **Outcome:** Spec file exists, frontmatter has `doc_type: spec`, body covers all 7 sections above
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 complete (lesson exists to reference)
- **Marker:** (none)
- **Time:** 20 min
- **Tooling:** Write tool
- **On-Fail:** If frontmatter validator rejects, fix per docscore guidance
- **Test:**
  - Happy: `head -10` shows valid YAML frontmatter; sections present per outline
  - Edge: file already exists → confirm with user before overwrite
  - Fail: file path wrong → write to correct `.claude/specs/` not docs/specs/
  - Integration: project CLAUDE.md (Step 4) can reference this file by path

### Step 4 - Update 6 living docs to reference Spec 13
- **Model:** inline
- **Action:** Edit project root `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/state.md`, `.claude/goals.md`, `.claude/architecture.md`, `.claude/mistakes.md` - each gets a 1-3 line block referencing Spec 13 in the appropriate section (Hard Rules / canonical-structure table / current-phase note / goals list / architecture index / latest-lessons)
- **Files:** 6 files listed above
- **Inputs:** Spec 13 path from Step 3
- **Outcome:** Each file contains at least one reference to `.claude/specs/13-DRAFT-NAMING-CONVENTION.md`
- **Exec:** SEQUENTIAL (these files reference each other)
- **Deps:** Step 3 complete
- **Marker:** (none)
- **Time:** 20 min
- **Tooling:** Edit tool (read each before editing per CC convention)
- **On-Fail:** If any edit fails (file missing required anchor), surface to Bean
- **Test:**
  - Happy: `grep -l "specs/13-DRAFT-NAMING-CONVENTION" .claude/*.md CLAUDE.md` returns ≥6 files
  - Edge: anchor text changed since plan write → grep with broader regex
  - Fail: write conflict if file edited externally → re-read and retry
  - Integration: future sessions reading any of the 6 docs see the convention reference

---

## QA Gate - Foundation docs landed
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** steps 1-4 complete
- **Check:** `python -c "import json,os; assert os.path.exists(os.path.expanduser('~/.claude/.lifecycle-mode-bulk.json')); assert os.path.exists('.claude/specs/13-DRAFT-NAMING-CONVENTION.md'); print('PASS')"` AND `grep -c "specs/13-DRAFT-NAMING-CONVENTION" .claude/*.md CLAUDE.md` returns ≥6
- **Pass:** stdout `PASS` + grep count ≥6
- **Fail:** retry the failed step; do not advance to Step 5
- **Marker:** QA

---

### Step 5 - Add `is_canonical_for_sgs_drafts` flag to uimax `naming_conventions` table
- **Model:** inline
- **Action:** Write a one-shot script (or inline Python via Bash) that ALTERs the table to add the boolean column if missing, then UPDATEs the SGS-BEM row to `is_canonical_for_sgs_drafts=1`. All other rows default 0. Use `uimax_write.py` for the write per Hard Rule 7.
- **Files:** `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` (column added + row updated)
- **Inputs:** uimax_write helper module
- **Outcome:** SELECT confirms column exists + 1 row has flag=1, all others flag=0
- **Exec:** SEQUENTIAL
- **Deps:** Step 4 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** uimax_write.py + sqlite3 ALTER
- **On-Fail:** If column already exists from a prior partial run, skip ALTER and proceed to UPDATE
- **Test:**
  - Happy: `sqlite3 ui-ux-pro-max.db "SELECT name, is_canonical_for_sgs_drafts FROM naming_conventions WHERE is_canonical_for_sgs_drafts=1"` returns SGS-BEM row
  - Edge: SGS-BEM row doesn't exist yet → INSERT it before flag-set
  - Fail: ALTER fails because of locked DB → run `blub-db-unlock.py` then retry
  - Integration: Step 6 regenerate-csvs will mirror the new column to component-libraries.csv

### Step 6 - Regenerate all uimax CSVs
- **Model:** inline
- **Action:** Run `python ~/.agents/skills/ui-ux-pro-max/scripts/update-db.py regenerate-csvs`
- **Files:** ~46 CSV files under `~/.agents/skills/ui-ux-pro-max/data/*.csv` and `data/stacks/*.csv`
- **Inputs:** uimax DB post-Step 5
- **Outcome:** stdout reports `Regenerated 46 CSVs from DB. Skipped 2 housekeeping tables.`; `naming-conventions.csv` includes new column
- **Exec:** SEQUENTIAL
- **Deps:** Step 5 complete
- **Marker:** HANDOFF
- **Time:** 1-2 min
- **Tooling:** update-db.py CLI
- **On-Fail:** If output reports a table failure, debug per `regenerate-csvs` error message
- **Test:**
  - Happy: stdout matches expected line + new column visible in `head -1 naming-conventions.csv`
  - Edge: empty table → header-only CSV produced, no data row error
  - Fail: DB locked → unlock + retry
  - Integration: Phase 4 subagents reading naming_conventions row pick up the canonical flag

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Should the canonical convention literally be `.sgs-<block>__<element>--<modifier>` or `<draft-prefix>-<block>__<element>--<modifier>` (e.g. `.draft-hero__copy`)?
  - **Options:** A) `.sgs-` prefix (matches SGS Framework block output style) / B) `.draft-` prefix (visually distinguishes drafts from rendered SGS) / C) `.dft-` short prefix
  - **Recommendation:** A - `.sgs-` prefix
  - **Why:** Drafts and rendered SGS share class-name space; pipeline does literal slug match (`.sgs-hero` → `sgs/hero`); zero ambiguity at recognition; 1:1 stack match in role-templates `sgs` and `wp_core` platform entries already exist
  - **Cost of wrong choice:** Visual confusion of "is this a draft or rendered output?" but trivially solvable with file naming or directory placement
  - **Who decides:** Bean (already chose A in conversation; recording for record)

- **Decision:** Validation enforcement strength - pre-flight gate (hard reject) vs lint warning (soft)?
  - **Options:** A) Hard pre-flight gate in `/sgs-clone` Stage 0 (rejects mockup if non-conforming) / B) Soft lint warning with suggested fixes / C) Both: hard gate on production runs, soft on `--draft-mode` runs
  - **Recommendation:** C
  - **Why:** Hard gate prevents the kebab-semantic problem at source; soft mode lets Bean iterate quickly during draft authoring
  - **Cost of wrong choice:** Hard-only blocks rapid iteration; soft-only lets non-conforming drafts back into the pipeline
  - **Who decides:** Bean

### Pre-emptive decisions (anticipated mid-execution pauses)

- **Decision:** What happens to existing drafts in `sites/*/mockups/` that were authored pre-rule?
  - **Recommendation:** Add `--legacy` flag to `/sgs-clone` that bypasses the pre-flight gate AND uses passport fallback. Migrate per-mockup as time permits (Mama's first in Phase 6). New drafts MUST conform.
  - **Why:** Avoids forcing migration of every existing client mockup before the rule lands

- **Decision:** Does the lingua-franca-conversion-on-scrape rule modify existing uimax data or only new ingests?
  - **Recommendation:** Only new ingests. Existing rows in uimax `patterns` / `component_libraries` / `animations` stay as-is. Add a `lingua_franca_form` column for new ingests; legacy rows have NULL.
  - **Why:** Migration of existing data is a separate work item; not on M9 critical path