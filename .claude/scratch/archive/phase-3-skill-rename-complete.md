# Phase 3 - Rename `/style-replicator` → `/bean-voice-replicator`

**USP:** Eliminate the recurring confusion where `/style-replicator` (voice replication) gets mis-routed for design / visual style work; clean break before convention propagation.
**Plan label:** [PLAN: sonnet]
**Docscore:** pending
**Aggregate cost estimate:** ~$0.20 (Sonnet inline; one skill rename; grep + edit ~6-15 references)

**Phase success criteria (done when):**
- [ ] Old skill dir `~/.agents/skills/style-replicator/` removed (or symlinked to new location for back-compat)
- [ ] New skill dir `~/.agents/skills/bean-voice-replicator/` exists with renamed SKILL.md
- [ ] Frontmatter `name: bean-voice-replicator`; description sharpened with explicit "voice/writing-style" language + "NOT for visual / CSS style"
- [ ] All references to `/style-replicator` across `~/.agents/skills/` + `~/.claude/` updated
- [ ] Skillscore v2 CLI passes on the renamed skill (≥90%)
- [ ] No remaining files contain `/style-replicator` except a deprecation note (if Bean wants one)

**Entry context:**
- `~/.agents/skills/style-replicator/SKILL.md` - current voice-replication skill body
- `~/.claude/.lifecycle-mode-bulk.json` - gate-bypass mode file from Phase 1

**References:**
- Phase 1 Step 2 - lifecycle gate disabled
- Capture-lesson row 215 (no-resume) - minor relevance

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| inline | Bash mv + Edit | Steps 1-3 |
| cli | Grep | Step 4 |
| cli | sgs-skillscore.py | Step 6 |
| skill | /capture-lesson | Step 7 (optional) |

---

## Steps

### Step 1 - Move skill directory
- **Model:** inline
- **Action:** `mv ~/.agents/skills/style-replicator ~/.agents/skills/bean-voice-replicator`
- **Files:** entire dir tree under `~/.agents/skills/style-replicator/` → `~/.agents/skills/bean-voice-replicator/`
- **Inputs:** none
- **Outcome:** Directory rename complete; old path doesn't exist
- **Exec:** SEQUENTIAL
- **Deps:** Phase 1 Step 2 complete (gate disabled)
- **Marker:** SESSION-START
- **Time:** 1 min
- **Tooling:** Bash mv
- **On-Fail:** If old dir has uncommitted changes, abort and surface to Bean; if target exists, abort
- **Cold-Entry:** This file + `~/.agents/skills/style-replicator/SKILL.md` (read before move)
- **Test:**
  - Happy: `ls ~/.agents/skills/bean-voice-replicator/SKILL.md` exists; `ls ~/.agents/skills/style-replicator/` returns "no such file"
  - Edge: subdirectories with hooks/scripts/references all moved
  - Fail: permission denied → check filesystem
  - Integration: lifecycle-gate doesn't fire because gate disabled

### Step 2 - Update SKILL.md frontmatter
- **Model:** inline
- **Action:** Edit `~/.agents/skills/bean-voice-replicator/SKILL.md` frontmatter: `name: bean-voice-replicator` (was `style-replicator`); description sharpened to explicit voice/writing-style language with "NOT for visual / CSS style - use `/innovative-design` or related skills for that"
- **Files:** `~/.agents/skills/bean-voice-replicator/SKILL.md`
- **Inputs:** new name + sharpened description
- **Outcome:** frontmatter `name` matches dir; description rejects design-routing
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 5 min
- **Tooling:** Edit
- **On-Fail:** Skillscore (Step 6) catches frontmatter errors
- **Test:**
  - Happy: head -10 shows `name: bean-voice-replicator` + sharpened description
  - Edge: existing description has good voice-replication content → keep it, just sharpen the negative routing
  - Fail: YAML parse error → fix syntax
  - Integration: Step 6 skillscore validates

### Step 3 - Update body sections (When NOT to use, anti-routing, examples)
- **Model:** inline
- **Action:** Edit body of bean-voice-replicator/SKILL.md: `## When NOT to use` section names `/innovative-design` (visual style), `/polish` / `/bolder` / `/colourise` (visual sub-skills), `/humanize` (rephrasing prose tone, but with cross-link to bean-voice-replicator for Bean-specific voice)
- **Files:** `~/.agents/skills/bean-voice-replicator/SKILL.md` body
- **Inputs:** Step 2 frontmatter changes
- **Outcome:** Body is internally consistent with the new name + scope
- **Exec:** SEQUENTIAL
- **Deps:** Step 2 complete
- **Marker:** (none)
- **Time:** 5 min
- **Tooling:** Edit
- **On-Fail:** Same as Step 2
- **Test:**
  - Happy: grep "style-replicator" inside the file returns 0
  - Edge: body has internal cross-refs to itself by old name → all updated
  - Fail: missed reference → Step 4 catches
  - Integration: Step 4 grep across other skills

### Step 4 - Find all `/style-replicator` references across skills + commands + agents
- **Model:** haiku (mechanical scan)
- **Action:** `grep -rln "/style-replicator\|style-replicator" ~/.agents/skills/ ~/.claude/skills/ ~/.claude/commands/ ~/.claude/agents/ 2>/dev/null`
- **Files:** none written (search only)
- **Inputs:** filesystem
- **Outcome:** List of files referencing old name; saved to `.claude/scratch/style-replicator-refs.txt`
- **Exec:** SEQUENTIAL
- **Deps:** Step 3 complete
- **Marker:** (none)
- **Time:** 2 min
- **Tooling:** Grep + Bash redirect
- **On-Fail:** If grep returns >50 results, narrow scope (likely CC tool match)
- **Test:**
  - Happy: list contains expected refs (description "When NOT to use" anti-route mentions, body cross-refs, example phrases)
  - Edge: refs in deprecated/archive folders → flag but don't update
  - Fail: zero refs found unexpectedly → Step 3 may have missed body cross-refs
  - Integration: Step 5 consumes this list

### Step 5 - Update each found reference
- **Model:** inline (small batch) OR haiku (subagent if list >10 files)
- **Action:** For each file in scratch/style-replicator-refs.txt, Edit replacing `/style-replicator` → `/bean-voice-replicator` (or `style-replicator` → `bean-voice-replicator` per context)
- **Files:** all files in the refs list
- **Inputs:** Step 4 list
- **Outcome:** Post-update grep returns 0 references to old name (except in archive / deprecation notes)
- **Exec:** SEQUENTIAL (each Edit reads + writes)
- **Deps:** Step 4 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Edit
- **On-Fail:** If a reference is in a context that genuinely should keep "style" (e.g. CSS-style discussion), skip and document in scratch
- **Test:**
  - Happy: post-grep returns 0 expected; post-grep returns expected exceptions only
  - Edge: file already has `/bean-voice-replicator` → no-op
  - Fail: Edit fails because exact string not unique → use replace_all
  - Integration: Step 6 skillscore validates the renamed skill is internally consistent

---

## QA Gate - Rename complete + no stale references
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** steps 1-5 complete
- **Check:** `grep -rln "/style-replicator" ~/.agents/skills/ ~/.claude/skills/ ~/.claude/commands/ ~/.claude/agents/ 2>/dev/null | grep -v "deprecation\|archive\|.git"` returns 0 lines
- **Pass:** zero matches OR matches only in expected deprecation notes
- **Fail:** Re-run Step 5 on missed files
- **Marker:** QA

---

### Step 6 - Run skillscore v2 CLI on renamed skill
- **Model:** haiku
- **Action:** `python C:/Users/Bean/.agents/skills/shared-references/sgs-skillscore.py validate ~/.agents/skills/bean-voice-replicator/SKILL.md --json`
- **Files:** none written (validation only)
- **Inputs:** renamed SKILL.md
- **Outcome:** stdout reports score ≥90%
- **Exec:** SEQUENTIAL
- **Deps:** QA gate passed
- **Marker:** (none)
- **Time:** 1 min
- **Tooling:** sgs-skillscore CLI
- **On-Fail:** If <90%, read validator output, fix the specific failure (almost always a missing required section or broken regex), re-run
- **Test:**
  - Happy: score ≥90%
  - Edge: 89% - fix one finding, re-validate
  - Fail: <80% (rare for a rename) → escalate; rename probably broke a structural requirement
  - Integration: passing skillscore = skill is shippable

### Step 7 - Optional: capture deprecation hint
- **Model:** inline (skip if Bean opts out)
- **Action:** Add a one-line note at top of `~/.agents/skills/bean-voice-replicator/SKILL.md` body: "Renamed from `/style-replicator` 2026-05-10 - see lesson `bean-voice-replicator-rename-prevents-design-route-confusion` (blub.db row TBD)"
- **Files:** SKILL.md body header + optional new lesson file
- **Inputs:** rename context
- **Outcome:** Future sessions seeing this skill know it's the renamed version
- **Exec:** SEQUENTIAL
- **Deps:** Step 6 passed
- **Marker:** HANDOFF
- **Time:** 5 min (if capturing as lesson) / 1 min (if just inline note)
- **Tooling:** Edit + optional /capture-lesson
- **On-Fail:** Non-blocking; just a documentation hint
- **Test:**
  - Happy: future grep for `/style-replicator` finds the deprecation note (intentional ref)
  - Edge: Bean opts out → skip
  - Fail: n/a
  - Integration: closes Phase 3

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Hard delete the old `~/.agents/skills/style-replicator/` directory or leave a deprecation symlink?
  - **Options:** A) Hard delete (clean break) / B) Symlink old → new for back-compat / C) Keep old SKILL.md as deprecation stub redirecting to new
  - **Recommendation:** A
  - **Why:** Symlinks confuse the lifecycle gate scanner; deprecation stubs accumulate; if any external tool still references old name, it'll fail loudly (better than silent wrong route)
  - **Cost of wrong choice:** A causes one external-tool break; B/C accumulate cruft
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** What about `/style-replicator-css` or visual-style-replicator? Does that exist or is it referenced anywhere?
  - **Recommendation:** Grep first; if it exists, leave alone (it's the visual one); if it doesn't, /innovative-design + /polish + /colourise cover the visual side and no separate skill is needed

- **Decision:** Should `/humanize` link to `/bean-voice-replicator` for Bean-specific voice?
  - **Recommendation:** Yes - add a one-line cross-ref in /humanize's "When NOT to use" section. Adds to Phase 4 batch B5 or B7