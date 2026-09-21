---
doc_type: cold-reader-audit
audit_date: 2026-09-21
docs_reviewed:
  - .claude/prompts/2026-09-21-wave-3c-start.md
  - .claude/plans/2026-09-21-wave-3c-implementation-plan.md
scope: ambiguities, unresolved terms, unclear steps, conflicts, invalid pointers
finding_count: 27
---

# Wave 3C Plan — Cold-Reader Audit

**SUMMARY:** 27 findings ranked by session risk. Five critical blockers that will trap a new reader: fixture pages not pre-built (unresolved entry), Step 0a timeout conflict vs "under 5 min" claim, `SGS_VISUAL_GATE_SKIP` variable not found in codebase, QC council invocation undefined, and fixture-building script timing unclear. High-risk: "chrome-devtools MCP" ambiguous (refers to a skill or MCP?), design gate = file only (process undefined), Step 0a recovery path if attributes missing, Spec 37 §1.2 reference unlocated. Ten unresolved commands/terms.

---

## Critical Blockers (session-trap risk)

### 1. **Step 0a timeout ≠ "under 5 min" (conflict)**
**Quote** (wave-3c-start.md:16): "First action (under 5 minutes): read the plan, then run Step 0a (`sgs-update-v2.py`)"

**Problem:** Step 0 (wave-3c-implementation-plan.md:45) says "about half a day, mostly parallel". Running `sgs-update-v2.py` without `--stage` runs all 13 stages, which takes 20–40 minutes on this project. The prompt says "first action, under 5 min", implying the runner should complete the action and report back within 5 minutes. This is physically impossible.

**Fix:** Clarify: either (a) "read the plan under 5 min, THEN schedule sgs-update in the background" or (b) "run `sgs-update-v2.py --stage 1` and report in 5 min" or (c) move the script run OUT of "first action" and into Step 0a proper.

---

### 2. **SGS_VISUAL_GATE_SKIP environment variable not found**
**Quote** (wave-3c-implementation-plan.md:84): "use `SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="<truthful>"`, then commit"

**Problem:** Grepped the codebase; zero hits. The variable is named but never defined, never checked, never instantiated anywhere. Either (a) it's a new feature to be added, or (b) the actual env var has a different name, or (c) this is a stale placeholder.

**Fix:** Verify the real env var name by checking `.claude/hooks/` or `plugins/sgs-blocks/scripts/` for visual-diff gate enforcement. Add a concrete example: `export SGS_VISUAL_GATE_SKIP=sgs-nav-bar-menu && git commit …` or state "this hook will be added in Step 0".

---

### 3. **Fixture pages (qa-hdr-*) entry point unresolved**
**Quote** (wave-3c-implementation-plan.md:86): "Fixtures are `qa-hdr-*` pages built inside a real `sgs/site-header` by `plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py`"

**Problem:** The plan references fixture pages but does NOT say when they're built. The script EXISTS (checked), but the plan does NOT list building them as part of Step 0. A new reader will: (a) assume they already exist and skip the build, or (b) assume they need to build them and run the script with no context on which pages to create or what post IDs they'll occupy. The script docstring says pages "qa-hdr-mega-dropdown-drawer, qa-hdr-mega-dropdown-drawer-capped, qa-hdr-mega-dropdown-drawer-pill, qa-hdr-drawer-submenus" but the plan never names them.

**Fix:** Add a Step 0f: "Build QA header fixtures via `python plugins/sgs-blocks/scripts/nav-qa/build-header-fixtures.py` (creates four `qa-hdr-*` pages: mega-dropdown-drawer, mega-dropdown-drawer-capped, mega-dropdown-drawer-pill, drawer-submenus)." OR clarify "Fixtures exist from Wave 2; do not rebuild them."

---

### 4. **QC council invocation undefined**
**Quote** (wave-3c-implementation-plan.md:82): "QC council before building any shared change: one code-path census agent and one adversarial reader on different models"

**Problem:** The plan names the council but does NOT say what you invoke it with, what the prompt is, or where to send the code. The skill is `/qc-council` (from global skills list) but the plan provides zero context on what payload it needs. A new reader will not know whether to pass a file, a link, a diff, or a design doc. The checkpoint protocol in the strategic plan says "cross-model, each fix-shape a hypothesis measured against a baseline" but gives no invocation example.

**Fix:** Add: "Invoke `/qc-council` with: (a) the problem statement, (b) the code change file(s), (c) the baseline measurement (what the current code/block does), (d) the hypothesis (what the fix is supposed to do). The council will assess the fix-shape and return pass/fail plus any changes."

---

### 5. **"chrome-devtools MCP" tool unclear**
**Quote** (wave-3c-implementation-plan.md:49 and 86): "ONE headed Chrome window (the chrome-devtools MCP)"

**Problem:** Mentioned three times but not defined. The session has a skill `chrome-devtools-mcp:chrome-devtools` but also a Playwright MCP. A new reader will not know which to use or how to invoke it. The script `build-header-fixtures.py` docstring says "WHY REST AND NOT WP-CLI" but does NOT explain how to start the headed Chrome or whether to use chrome-devtools or Playwright MCP.

**Fix:** Change to: "(the chrome-devtools MCP – invoke via `/chrome-devtools` or use the Playwright MCP for lower-level control if needed; see `~/.claude/TOOLS.md` for configuration)." OR specify one tool only: "Use the Playwright MCP (supports Chromium headed windows; start with `mcp__plugin_playwright_playwright__browser_navigate`)."

---

## High-Risk Issues (session slowdown / wrong-path)

### 6. **Step 0a recovery path missing**
**Quote** (wave-3c-implementation-plan.md:47): "confirm `headerFloat`, `headerFloatInset`, `headerFloatCollapse`, `backdropBlur`, `shadowScrolled` exist in `block_attributes` for `sgs/site-header`"

**Problem:** What does "confirm" mean? Check the database? Check block.json? If one or more DON'T exist after sgs-update, what's the next step? The plan says "confirm" but provides no check command and no failure path. A session will run the script and then not know whether it succeeded or what to do if it didn't.

**Fix:** "After sgs-update completes, verify: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT attr_name FROM block_attributes WHERE block_slug='sgs/site-header' AND attr_name IN ('headerFloat', 'headerFloatInset', 'headerFloatCollapse', 'backdropBlur', 'shadowScrolled');"` must return 5 rows. If fewer: DB seeding is incomplete. Escalate to Bean with the missing attr names."

---

### 7. **Design gate: file defined, process undefined**
**Quote** (wave-3c-implementation-plan.md:80–81): "Design gate (rule 7). A short `reports/<date>-<unit>-design.md`: the problem, the measurements from the capture JSON (cite the reference and cell), the design, the risks."

**Problem:** The plan shows you what to WRITE (a report file) but NOT the decision process or who approves it. It says "rule 7" but the global CLAUDE.md rule 7 is "DESIGN-GATE sensitive/high-blast-radius changes ... get Bean's approval before building." So is the design report FOR Bean's approval? Or is the approval separate? The checkpoint protocol says "Evidence pack → QC → Docs" — where does the design-gate report fit in that order? Who signs off on it before step 2 (build)?

**Fix:** "Design gate (rule 7): Write `reports/<date>-<unit>-design.md` (problem, measurements, design, risks); submit to `/qc-council` (one code-path analyst and one adversarial reader) for approval before building. Carry any requested changes to the report and code into Step 3 (Build)."

---

### 8. **Step 0c capture scope: replace or append?**
**Quote** (wave-3c-implementation-plan.md:49): "Headed capture pass (DEC-04): ButcherBox and rabbit.tech at 768 plus rabbit.tech's open dropdown and both footers"

**Problem:** The implementation plan calls this a "re-capture" (line 24) but doesn't say whether it REPLACES the earlier captures or ADDS to them. DEC-04 is listed as a decision ("Re-capture ButcherBox and rabbit.tech at 768 … before Wave 4"), which suggests the old captures might be stale or wrong. A new reader won't know: (a) whether to re-run the captures, or (b) whether the old captures still exist and should be overwritten, or (c) whether this is an incremental add (e.g., "we had 1024px, now capture 768px too").

**Fix:** "Step 0c (DEC-04): Re-capture ButcherBox and rabbit.tech. Method: use the CAPTURE-PROTOCOL.md script for each reference at 768px (the mobile breakpoint, per DEC-11). This REPLACES the prior `.json` labels if they exist. Output: `labels-butcherbox.json`, `labels-rabbit.json` (and `labels-away-uk.json` for the Away UK re-read). Store in `reports/reference-requirements/`."

---

### 9. **Step 0e is "Optional" but scope unclear**
**Quote** (wave-3c-implementation-plan.md:51): "Optional: a 1000px tablet capture of the two drafts (DEC-11)"

**Problem:** Optional in WHAT SENSE? If you skip it, does Wave 3C still pass Gate 3C? The decision DEC-11 says "The drafts' 768 rows are mobile; no tablet row for them" — so a 1000px tablet capture seems unnecessary by definition. Yet it's still listed in Step 0. Is this capture a "nice-to-have for analysis" or a "must-have for completeness"?

**Fix:** "Optional: a 1000px tablet capture of the two drafts (DEC-11 — for reference, the drafts use 768px rows which count as mobile, so a tablet row is not expected; this capture is for completeness only and does not block Wave 3C)."

---

### 10. **Spec 37 §1.2 location unspecified**
**Quote** (wave-3c-implementation-plan.md:48): "and the same-commit statement in Spec 37 §1.2 if the drawer model text changes"

**Problem:** Spec 37 exists, but §1.2 is not defined anywhere in the plan and is not cited in the strategic plan. A new reader will open Spec 37 and not know what section to edit. The plan says "if the drawer model text changes" — but when DOES it change? Is that step 0b's job, or is step 0b just saying "if it does, update it"?

**Fix:** "Step 0b: Spec 36 FR-36-6 (optional close control — the × is optional per `closeStyle` and per tier, required only when no other visible, keyboard-reachable close control is live). If the drawer model text in Spec 37 (§1.2 'Drawer Semantics') needs amendment, draft it in the same commit as the Spec 36 change."

---

## Medium-Risk Issues (traps under pressure)

### 11. **"the chain" is ambiguous**
**Quote** (wave-3c-start.md:12): "U-12 (four furniture blocks, one agent per block in new directories) and U-15 can run in parallel with the chain from the start"

**Problem:** "the chain from the start" could mean (a) the 14 sequential nav units starting from day 1, or (b) starting from the first unit that isn't U-12 or U-15. The implementation plan table shows U-12 and U-15 as `‖` (parallel mark), but the table order is 1..14 for the nav chain, implying 1 is "the start". Does "from the start" mean "from day 1 of the project" or "from the start of the sequential chain (unit 1)"?

**Fix:** "U-12 and U-15 can run in parallel with the nav chain from Unit 1 (U-1, site-header de-hardcode). Every other nav unit (U-1..11, U-13–14) runs one at a time because they share files (see Lock files column)."

---

### 12. **Step 0a "confirm" has no check command**
**Quote** (wave-3c-implementation-plan.md:47): "confirm … exist in `block_attributes` for `sgs/site-header`"

**Problem:** "Confirm" is passive; it doesn't name a tool or command. Is this a manual inspection (open block.json), a database query, or a Python script? A new reader will either (a) skip it and assume it's fine, or (b) spend 15 minutes figuring out where to check.

**Fix:** See finding #6 above; combine them.

---

### 13. **Parked items location ambiguous**
**Quote** (wave-3c-implementation-plan.md:38): "Parked items go to `.claude/parking.md` ONLY when Bean asks; until then they live here and in the decision log"

**Problem:** "live here" is ambiguous — does it mean (a) section 1 of this plan, (b) the decision log (`decisions.md`), or (c) both? If an item is parked, should you write it into section 1 of the plan AND decisions.md, or just one?

**Fix:** "Parked items (M-08, M-20, M-24, M-25, M-52, etc.): record in this plan's Decisions table (section 1) AND in `.claude/decisions.md` under a 'PARKED' status. Move to `.claude/parking.md` only when Bean explicitly asks to defer a task."

---

### 14. **Commit order: specs first or docs last?**
**Quote** (wave-3c-implementation-plan.md:48): "Spec amendments drafted and committed first" vs. (line 87): "Docs in the same push: Spec 36 (and Spec 37 in the same commit…"

**Problem:** Step 0b says "committed first" (implying before other work) but the per-unit loop (step 4, end of line 87) says "Docs in the same push" alongside code. Which is it? Does the Spec amendment go out as a solo commit before any unit work, or does it ship with the first unit that needs it?

**Fix:** "Step 0b: Spec amendments (FR-36-6) are drafted and committed AS A SOLO COMMIT before any unit building starts. Per-unit doc updates (Spec 36, Spec 37, this plan, verify doc, LEDGER, decisions.md) are committed in the same push as the unit's code (step 4, end of loop)."

---

### 15. **Decision numbering: DEC-04 says "re-capture" but when?**
**Quote** (wave-3c-implementation-plan.md:24): "DEC-04 | Re-capture ButcherBox and rabbit.tech at 768, rabbit's open dropdown and both footers, headed, before Wave 4"

**Problem:** "before Wave 4" is vague. The plan lists it as Step 0c, which IS before Wave 4. But is it BEFORE Wave 3C starts, or AFTER Wave 3C completes (as part of 0 onward), or BETWEEN 3C and 4? The phrase "before Wave 4" is chronologically correct for both Step 0 and late in Wave 3C. 

**Fix:** "DEC-04: Re-capture ButcherBox and rabbit.tech at 768px (Step 0c, before Wave 3C work begins) … rabbit's open dropdown and both footers, using the CAPTURE-PROTOCOL.md headed Chrome setup. Output: labels-*.json files."

---

### 16. **U-15 (notice-banner) file overlap status unclear**
**Quote** (wave-3c-implementation-plan.md:55): "U-12 and U-15 have no file overlap with anything and run in parallel with the chain from day one"

**Problem:** The implementation plan table shows U-15 modifies `notice-banner/*`. If notice-banner is used anywhere else (e.g., in the header as a stacked banner), then U-15 DOES have file overlap. Checked: notice-banner is not listed in any other unit's lock-files column, so the claim is technically correct — but a new reader won't verify this and might assume U-15 touches shared header/nav files.

**Fix:** No change needed (the claim is correct) but add a note: "U-15 (notice-banner) modifies only `notice-banner/block.json` and `notice-banner/style.css`; no overlap with header/nav infrastructure. Safe to run in parallel."

---

### 17. **Gate 3C definition not in implementation plan**
**Quote** (wave-3c-implementation-plan.md:90–91): "Gate 3C passes when every family in the signed list is built or explicitly parked (section 1), each unit's live report is PASS, the specs state the model, and one composed real header (a pill or capped header, a mega, a drawer whose × is optional) matches its requirements-table row, with Bean's eye (R-31-13)."

**Problem:** This definition exists in the implementation plan but NOT in the strategic plan's formal "Milestone gates" section (which just says "architecture harmonised"). A new reader will not look at the implementation plan first; they'll read the strategic plan and find only a one-liner. The full Gate 3C definition is buried in a later section of the implementation plan.

**Fix:** Copy the full Gate 3C definition from the implementation plan section 5 to the strategic plan's "GATE 3C" entry in section 4.

---

## Low-Risk Issues (edge cases, terminology)

### 18. **"LANE" undefined in strategic plan wave handoff**
**Quote** (wave-3c-start.md:3): "You are continuing the merged Spec 36 + Spec 37 nav/header/footer/drawer track"

**Problem:** The strategic plan mentions "Label hint: sonnet builders, one lane each" but never defines what a "lane" is. It's implied to be a parallel work track but is never formalized.

**Fix:** No critical action; clarity: "LANE: a parallel work thread assigned to one builder agent, with disjoint file sets and independent deliverables."

---

### 19. **"visual-diff gate" mechanism not explained**
**Quote** (wave-3c-implementation-plan.md:84): "The visual-diff gate blocks a block commit that has no live capture report"

**Problem:** Stated as fact but the mechanism is not explained. Is it a hook? Is it manual enforcement? Is it a pre-commit check? The plan says "use `SGS_VISUAL_GATE_SKIP=…`" to bypass it, but doesn't say what the gate itself is checking or how it works.

**Fix:** "The visual-diff gate (a pre-commit hook in `.claude/hooks/`) blocks commits to blocks without a live visual-diff report in `reports/visual-diff/`. To bypass (for initial build), set `SGS_VISUAL_GATE_SKIP=sgs-nav-bar-menu SGS_VISUAL_GATE_REASON="initial implementation"` before committing."

---

### 20. **DEC-10 intent unclear**
**Quote** (wave-3c-implementation-plan.md:27): "DEC-10 | Clone the INTENT of Bean's two drafts, not their runtime's bugs | the panel-entry shape in U-5 is a real requirement"

**Problem:** "INTENT not runtime's bugs" is a design directive but doesn't land clearly for a cold reader. What is a "runtime bug" in a Claude Design draft? Are you supposed to fix the draft, or clone it as-is but with the mindset that the intent matters? The note "the panel-entry shape in U-5 is a real requirement" is concrete but leaves unclear whether other design elements should also be treated as "intent-based".

**Fix:** "DEC-10: For Bean's two Claude Design drafts (Halcyon Mega Menu, Indus Foods Mega Menu), clone the layout and content intent, not visual bugs (e.g. if a panel entry is misclustered due to draft rendering, re-cluster it correctly). The panel-entry row shape is a real requirement (U-5), not a bug."

---

### 21. **DEC-02 "one carve-out" scope**
**Quote** (wave-3c-implementation-plan.md:21): "DEC-02 | Keep SGS's accessible default everywhere and record each divergence at clone time; one carve-out: an attribute for lamalama's close-on-scroll (in U-9) | no opt-outs for a11y defects"

**Problem:** "one carve-out" — is this saying that close-on-scroll is the ONLY carve-out allowed, or is it saying "one carve-out example: close-on-scroll"? The phrase is ambiguous and a new reader might think all a11y carve-outs are allowed except close-on-scroll, or that close-on-scroll is the only exception permitted.

**Fix:** "DEC-02: Maintain SGS's accessible defaults on all blocks; record divergences. One exception: add a `closeOnScroll` attribute to U-9 (drawer) for lamalama's behaviour. No other a11y opt-outs permitted."

---

### 22. **"M-08 kept on its merits" — reference unclear**
**Quote** (wave-3c-implementation-plan.md:20): "| DEC-01 | Keep resn as clone 13: real DOM text for its labels, the WebGL scene approximated with a Tier V effect or an existing fx field, the divergence recorded | roster stays 13; M-08 kept on its merits |"

**Problem:** M-08 is "A trigger that outlives its header (detach to a fixed control)" and is parked in DEC-16. But DEC-01 says "M-08 kept on its merits" in the context of resn/clone 13. Is M-08 being built in Wave 3C, or is it parked? The connection between DEC-01 (resn decision) and M-08 (a detached-trigger family) is unclear.

**Fix:** Clarify the connection: "DEC-01: Resn (clone 13) will render with real DOM text labels; the WebGL scene will use a Tier V CSS effect or existing FX field (the full WebGL animation is out of scope per DEC-13). Divergence recorded. Side note: M-08 (detached triggers) is also out of Wave 3C scope per DEC-16; keep that decision separate."

---

### 23. **First action three-line PES vs ADHD guidelines**
**Quote** (wave-3c-start.md:14 & 16): "ADHD-friendly reports (Problem, Effect, Solution; menu plus one recommendation; concise)" … "tell Bean in three lines what you will do first and whether anything blocks it"

**Problem:** A complete PES report is rarely expressible in three lines. Either (a) three lines is too constraining and this is a bad constraint, or (b) the three-line requirement overrides the PES format. A new reader will try to fit PES into three lines and produce garbled output.

**Fix:** "First action report (under 5 min): three lines to Bean — the problem (one line), the immediate action (one line), any blocker (one line). No need for Effect/Solution structure at this stage; this is just a status update."

---

### 24. **No mention of build-deploy.py --blocks-only**
**Quote** (wave-3c-implementation-plan.md:85): "Deploy `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only`"

**Problem:** The plan mentions `--blocks-only` for deploy but never explains what it does or when to use it vs. the default. A new reader will follow the command but won't understand the consequences of using `--blocks-only` vs. omitting it.

**Fix:** "Deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown --blocks-only` (deploys only the blocks plugin, skips the theme). Then repeat for `--target indus-test` and `--target eye-care-test`."

---

### 25. **Negative control mentioned but not defined**
**Quote** (wave-3c-implementation-plan.md:83): "Tests. PHP tests in `plugins/sgs-blocks/tests/php/` with a negative control (the test fails against the previous code)"

**Problem:** "negative control" is a testing concept but is not defined in the plan. A new reader won't know what it means or how to write one.

**Fix:** "Tests. PHP tests in `plugins/sgs-blocks/tests/php/` with a negative control (a test that fails against the PREVIOUS code before the fix, proving the test actually catches the defect; it passes after the fix is applied). Same for JS tests in `scripts/tests/`."

---

### 26. **"Run long commits in the background" — post-commit verification unclear**
**Quote** (wave-3c-implementation-plan.md:84–85): "Run long commits in the background (`run_in_background`) because the hooks take over a minute. Deploy `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown …`"

**Problem:** If you run the commit in the background, do you wait for it to complete before starting the deploy? Or do you kick off both? The plan doesn't say, and a new reader might deploy before the commit hooks finish, causing a mismatch.

**Fix:** "Run the commit in the background (`run_in_background: true`) because the pre-commit hooks take 60+ seconds. After the commit completes (check git status to confirm), deploy: `python plugins/sgs-blocks/scripts/build-deploy.py …`"

---

### 27. **families-master.json content not described**
**Quote** (wave-3c-start.md:7): "`.claude/reports/reference-requirements/FAMILIES-MASTER.md` (the 46 families, the 17 units, the decisions) and `families-master.json`"

**Problem:** The plan references `families-master.json` alongside the markdown file but never explains what's in it, what format it is, or how to use it. A new reader will assume it's a JSON mirror of the markdown, but it actually contains `families`, `units`, `decisions`, `engineering_notes`, `lanes` as top-level keys (checked earlier). That structure is not obvious from the markdown.

**Fix:** "families-master.json: a JSON-serialized index of the families, units, decisions and engineering notes. Use for programmatic access (e.g., filtering by family name). The markdown FAMILIES-MASTER.md is the human-readable source; keep them in sync."

---

## Recommendations (what to ask Bean before starting)

**What you would do first:**
1. Verify the five attributes exist post-sgs-update (Step 0a), or ask what to do if they're missing
2. Check whether qa-hdr-* fixture pages already exist or need building
3. Clarify whether `SGS_VISUAL_GATE_SKIP` is a new env var or an existing one by another name
4. Confirm which tool to use for headed Chrome: chrome-devtools MCP or Playwright MCP

**What you would ask:**
1. "Step 0a says 'under 5 min' but sgs-update takes 20–40 min. Should I run only `--stage 1` to test, or the full run in the background?"
2. "Does SGS_VISUAL_GATE_SKIP exist yet, or is it something I need to add to a hook script?"
3. "Should I build the qa-hdr-* fixture pages as part of Step 0, or do they already exist from Wave 2?"
4. "For the design gate (line 80), do I submit the report to `/qc-council` before building, or is the council invoked per-unit per the checkpoint protocol?"
5. "Parked items (M-08, M-20, etc.): record in this plan's section 1 AND decisions.md, or just one?"
