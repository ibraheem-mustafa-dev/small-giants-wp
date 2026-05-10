# Phase 4 - Bulk Convention Propagation (~48 surfaces, B2-B9)

**USP:** Land the SGS-BEM convention rule across every skill that emits drafts, ingests external sources, dispatches subagents, or queries SGS data - so future sessions can never silently drift to ad-hoc-semantic.
**Plan label:** [PLAN: sonnet]
**Docscore:** pending
**Aggregate cost estimate:** ~$3-5 (Sonnet inline + parallel subagent dispatches across 8 batches)

**Phase success criteria (done when):**
- [ ] All ~48 affected skills/agents have body reference to Spec 13
- [ ] Each touched file passes skillscore v2 ≥90%
- [ ] Plain-english check fires zero new jargon flags (Phase 1 hook patch is in place)
- [ ] Grep for `style-replicator` after Phase 3 returns 0; grep for old `/animation-harvest` (deprecated 2026-05-07) also 0
- [ ] `.claude/reports/phase-4-propagation-summary-2026-05-10.md` records per-batch outcomes

**Entry context:**
- `.claude/specs/13-DRAFT-NAMING-CONVENTION.md` - canonical reference all skills will point at
- `~/.claude/.lifecycle-mode-bulk.json` - gate-bypass mode file from Phase 1
- Phase 1 outcomes (Spec 13 exists, lesson captured, living docs reference it)
- Phase 3 outcomes (rename complete; no stale style-replicator refs)

**References:**
- Phase 1 Step 1 lesson row in blub.db
- Phase 2 audit reports (some skills may have references to dropped tables that need updating)
- Lesson 218 (analysis-skills-search-local + qc-inline) - applies to skills that produce gaps/findings
- Lesson 220 (broaden-search-before-declaring-spec-wrong) - applies to all skills

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| skill | /dispatching-parallel-agents | Steps 2-9 (one batch per dispatch) |
| skill | /subagent-prompt | Each batch dispatch |
| cli | sgs-skillscore.py validate | After every skill edit |
| cli | Grep | Pre + post-batch verification |
| inline | Edit (sequential safety) | Skills with cross-references inside the same batch |

---

## Steps

### Step 1 - Pre-flight: confirm gate disabled + Phase 1-3 outcomes
- **Model:** inline
- **Action:** Verify mode file exists; verify Spec 13 exists; verify Phase 3 grep is clean. Capture into a checklist file.
- **Files:** `.claude/scratch/phase-4-preflight.txt` (new, transient)
- **Inputs:** Phase 1-3 artefacts
- **Outcome:** Checklist confirms green; if any red, return to that phase
- **Exec:** SEQUENTIAL
- **Deps:** Phases 1-3 complete
- **Marker:** SESSION-START
- **Time:** 5 min
- **Tooling:** Bash + grep
- **On-Fail:** Halt; resolve missing prerequisite before proceeding
- **Cold-Entry:** This file + plan.md index + Spec 13
- **Test:**
  - Happy: all 4 prereqs green
  - Edge: 1 prereq partial (e.g. Phase 2 deferred drops) → continue with note
  - Fail: lifecycle gate active → write mode file again
  - Integration: feeds B2-B9 dispatches

### Step 2 - Batch B2: Design generation skills (5)
- **Model:** sonnet (parallel subagent dispatch - 5 cold prompts in one /dispatching-parallel-agents call)
- **Action:** Dispatch 5 Sonnet subagents in parallel; each gets the canonical rule text + the exact section to insert in (one of "Hard Rules" / "When to Use" / "Common Mistakes"). Returns must include grep-confirm of `selector_strategies` reference (or equivalent rule-anchor) before merge.
- **Files:** SKILL.md for /ui-ux-pro-max, /innovative-design, /frontend-design, /superdesign, /sgs-discover (+ optional reference files where the skill has them)
- **Inputs:** Spec 13 path; canonical rule text; per-skill section anchors
- **Outcome:** 5 SKILL.md files updated; each passes skillscore ≥90%; each contains explicit Spec 13 reference
- **Exec:** PARALLEL within the batch (5 subagents); SEQUENTIAL across batches B2-B9
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 25-35 min wall-clock (5 subagents + verification)
- **Tooling:** /dispatching-parallel-agents, /subagent-prompt, sgs-skillscore validate
- **On-Fail:** If any subagent's edit drops skillscore below 90%, reject and re-prompt; if any subagent invented content (grep mismatch), reject hard
- **Prompt:** (pre-written by /subagent-prompt for each subagent - template includes: Spec 13 path, section anchor for that skill, rule text, grep-verification checklist, no-em-dash rule, lesson 215 + 220 + 221 references)
- **Test:**
  - Happy: 5/5 skills updated, all pass skillscore ≥90%, all reference Spec 13
  - Edge: a skill body lacks the standard "Hard Rules" / "When to Use" anchor → subagent appends section before "## Common Mistakes"
  - Fail: subagent body changes more than expected → hard-reject + re-prompt
  - Integration: B3 starts only after B2 verification

### Step 3 - Batch B3: /innovative-design sub-family (14)
- **Model:** sonnet (parallel subagent dispatch - 14 cold prompts)
- **Action:** 14 Sonnet subagents add a one-line Spec 13 reference + cross-link to `/innovative-design` parent. Each is a small, surgical edit.
- **Files:** SKILL.md for polish, bolder, colourise, harden, adapt, distill, normalize, extract, humanize, quieter, delight, critique, audit, optimise
- **Inputs:** Spec 13 path; one-line addition template
- **Outcome:** 14 SKILL.md files updated; all pass skillscore ≥90%
- **Exec:** PARALLEL within batch
- **Deps:** Batch B2 complete
- **Marker:** (none)
- **Time:** 30-45 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same as B2
- **Prompt:** (pre-written; sub-family template is shorter than B2 because addition is one-line)
- **Test:**
  - Happy: 14/14 updated
  - Edge: a sub-skill lacks any reference structure for new content → use `## References` section
  - Fail: massive over-edit on a sub-skill → reject
  - Integration: B4 starts after

### Step 4 - Batch B4: Extraction + scrape (5)
- **Model:** sonnet (parallel - 5 subagents)
- **Action:** Each subagent adds: (a) Spec 13 reference, (b) lingua-franca-conversion sub-rule for live scrapes (convert to SGS-BEM as primary at recognition time, preserve original convention as sibling in equivalent_implementations)
- **Files:** SKILL.md for /sgs-extraction, /design-ref, /uimax-scrape, /uimax-classify-naming, /uimax-scrape-animation
- **Inputs:** Spec 13 + lingua-franca sub-rule text
- **Outcome:** 5 SKILL.md updated; lingua-franca clause present + cross-links present
- **Exec:** PARALLEL within batch
- **Deps:** B3 complete
- **Marker:** (none)
- **Time:** 25-35 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same
- **Prompt:** (pre-written; includes both sub-rules for ingestion-side skills)
- **Test:**
  - Happy: 5/5 updated; lingua-franca clause present
  - Edge: skill already has a "tagging convention at write time" section → extend rather than add new
  - Fail: lingua-franca clause omitted → re-prompt
  - Integration: feeds B5

---

## QA Gate - Batches B2-B4 verified
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Batches B2, B3, B4 complete
- **Check:** `for f in <list of 24 files>; do python ~/.agents/skills/shared-references/sgs-skillscore.py validate "$f" --json | jq '.score'; done` - all ≥90
- **Pass:** all 24 scores ≥90
- **Fail:** Re-prompt the failing subagent for that specific skill
- **Marker:** QA

---

### Step 5 - Batch B5: Pipeline + WP (8)
- **Model:** sonnet (parallel - 8 subagents)
- **Action:** Each subagent adds Spec 13 reference + integration note (e.g. /sgs-clone gets: "Stage 0 pre-flight rejects non-conforming draft mockups per Spec 13"; /visual-qa gets: "mockup-parity-validator's selector queries assume SGS-BEM conformance per Spec 13")
- **Files:** SKILL.md for /sgs-clone, /sgs-wp-engine, /visual-qa, /clone-patterns, /interactive-design, /wp-block-development, /wp-block-themes, /wp-plugin-development
- **Inputs:** Spec 13 + per-skill integration notes
- **Outcome:** 8 SKILL.md updated
- **Exec:** PARALLEL within batch
- **Deps:** B4 + QA gate complete
- **Marker:** (none)
- **Time:** 35-50 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same
- **Prompt:** (pre-written; per-skill integration notes vary)
- **Test:**
  - Happy: 8/8 updated; integration notes present
  - Edge: /sgs-clone needs a Stage 0 pre-flight gate addition (more than just a reference) → handle as a separate sub-step
  - Fail: integration note misses key behavior → re-prompt
  - Integration: feeds B6

### Step 6 - Batch B6: Subagent + delegation (4)
- **Model:** sonnet (parallel - 4 subagents)
- **Action:** Each subagent adds rule: "every cold prompt MUST include the SGS-BEM convention for any draft-shaped task; emit/accept the convention to prevent training-default drift"
- **Files:** SKILL.md for /subagent-prompt, /subagent-driven-development, /dispatching-parallel-agents, /delegate
- **Inputs:** Spec 13 + cold-prompt-convention requirement
- **Outcome:** 4 SKILL.md updated; cold-prompt requirement explicit
- **Exec:** PARALLEL within batch
- **Deps:** B5 complete
- **Marker:** (none)
- **Time:** 20-30 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same
- **Prompt:** (pre-written; emphasises propagation through dispatch)
- **Test:**
  - Happy: 4/4 updated
  - Edge: /delegate is convention-orthogonal but should still surface the constraint → minimal one-liner
  - Fail: rule omitted from cold-prompt template → reject
  - Integration: feeds B7

### Step 7 - Batch B7: Ops + queries (5)
- **Model:** sonnet (parallel - 5 subagents)
- **Action:** Each subagent adds Spec 13 reference appropriate to skill (e.g. /sgs-update body documents that regenerate-csvs reflects the canonical-flag column; /sgs-db query examples include filter by canonical convention)
- **Files:** SKILL.md for /sgs-update, /wp-blocks, /sgs-db, /dev, /feature-dev
- **Inputs:** Spec 13 + per-skill query / regen integration
- **Outcome:** 5 SKILL.md updated
- **Exec:** PARALLEL within batch
- **Deps:** B6 complete
- **Marker:** (none)
- **Time:** 25-35 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same
- **Prompt:** (pre-written)
- **Test:** Same shape as prior batches

### Step 8 - Batch B8: Agents (2)
- **Model:** sonnet (parallel - 2 subagents)
- **Action:** Each subagent adds Spec 13 reference + agent-specific enforcement note (wp-sgs-developer enforces convention on every block build; design-reviewer treats non-conforming drafts as fail criterion)
- **Files:** `~/.claude/agents/wp-sgs-developer.md`, `~/.claude/agents/design-reviewer.md`
- **Inputs:** Spec 13 + agent enforcement notes
- **Outcome:** Both agent .md files updated
- **Exec:** PARALLEL within batch
- **Deps:** B7 complete
- **Marker:** (none)
- **Time:** 15-25 min wall-clock
- **Tooling:** Same as B2 (skillscore validates agent .md too)
- **On-Fail:** Same
- **Prompt:** (pre-written)

### Step 9 - Batch B9: Reference-only (3)
- **Model:** sonnet (parallel - 3 subagents)
- **Action:** Each subagent adds a minimal one-line pointer to Spec 13. Lighter touch than other batches.
- **Files:** SKILL.md for /test-driven-development, /uimax-mood-board, /uimax-sgs-scrape-pattern
- **Inputs:** Spec 13 path + minimal-pointer template
- **Outcome:** 3 SKILL.md updated with one-line refs
- **Exec:** PARALLEL within batch
- **Deps:** B8 complete
- **Marker:** (none)
- **Time:** 10-15 min wall-clock
- **Tooling:** Same as B2
- **On-Fail:** Same
- **Prompt:** (pre-written; smallest template)

---

## QA Gate - All 8 batches complete + skillscore ≥90 across all touched skills
- **Model:** sonnet (multi-file review)
- **Exec:** SEQUENTIAL
- **Deps:** Batches B2-B9 complete
- **Check:** Bash loop validating all ~48 files; collect any below 90; output structured pass/fail report
- **Pass:** All ≥90; report saved to `.claude/reports/phase-4-propagation-summary-2026-05-10.md`
- **Fail:** Re-prompt failing subagents on specific skills; max 2 retries per skill; if 3rd attempt fails, escalate to inline manual edit
- **Marker:** QA

---

### Step 10 - Spot-check + write Phase 4 summary report
- **Model:** inline
- **Action:** Random spot-check 5 of the 48 touched files (pick across batches). Confirm rule reference present and consistent. Write Phase 4 summary report listing per-batch outcomes (skills touched, scores, retries needed, any rejected subagent outputs).
- **Files:** `.claude/reports/phase-4-propagation-summary-2026-05-10.md` (new)
- **Inputs:** Batches B2-B9 outcomes
- **Outcome:** Summary report exists; per-batch outcomes documented
- **Exec:** SEQUENTIAL
- **Deps:** All QA gates passed
- **Marker:** HANDOFF
- **Time:** 15 min
- **Tooling:** Read + Write
- **On-Fail:** If spot-check finds a wrong reference, route to manual fix; document the slip
- **Test:**
  - Happy: report exists with batch-by-batch breakdown; spot-checks confirm consistency
  - Edge: 1 of 5 spot-checks finds a typo → fix inline + note
  - Fail: 3+ spot-checks show problems → larger systemic issue, re-run failing batches
  - Integration: closes Phase 4

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Subagent vs inline for the bulk propagation - risk of hero-hardcoded subagent failure (which already bit this session)?
  - **Options:** A) All subagent-dispatched (fastest, scalable) / B) Inline-only (slowest, safest) / C) Hybrid: subagent for one-line additions (B3, B6, B9), inline for substantive edits (B2, B5)
  - **Recommendation:** C
  - **Why:** Substantive edits where the subagent has design discretion fail more often; one-line additions are mechanical and safe. The earlier session's failed slot-filler subagent was a substantive build (1329 LOC); none of B3/B6/B9 are anywhere near that scale.
  - **Cost of wrong choice:** A risks repeat of subagent failure pattern; B costs ~3x more wall-clock; C balances
  - **Who decides:** Bean (default to recommendation if no objection)

- **Decision:** Skill-touch order - does it matter (which batch first)?
  - **Options:** A) B2 first then dependents (recommended) / B) Mechanical order (B2-B9 sequential) / C) Random
  - **Recommendation:** A
  - **Why:** /ui-ux-pro-max in B2 is the design-brain that other skills reference; landing it first makes downstream cross-references stable
  - **Cost of wrong choice:** Cross-refs may need updating in late batches if order changes upstream content
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** What if a subagent body change increases skillscore TOO much (>5% gain) - does that imply the addition was disproportionate?
  - **Recommendation:** Yes. Spot-check that skill - large positive deltas often mean the subagent rewrote sections beyond the brief. Reject + re-prompt with "narrow surgical edit only".

- **Decision:** What if Phase 2 dropped a table that's referenced in a skill we're now editing?
  - **Recommendation:** Add the table-removal note to the skill's "Common Mistakes" or migration section IN THE SAME SUBAGENT EDIT. Don't return to the skill later for a second pass.