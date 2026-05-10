# Phase 8 - Pipeline Validation + Live Deploy + Eyes-On Review

**USP:** Run the full rewired pipeline end-to-end on Mama's mockup, validate every section against the SGS clone target, deploy live to sandybrown homepage, and confirm with Bean's own eyes at all 3 breakpoints. Closes the M9 redo arc.
**Plan label:** [PLAN: opus]
**Docscore:** pending
**Aggregate cost estimate:** ~$3-4 (Opus inline; pytest iterations; full pipeline run; deploy; multi-frame capture; eyes-on review)

**Phase success criteria (done when):**
- [ ] `pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py` reports 14/14 PASS (hero baseline 50/50 inside)
- [ ] Full `/sgs-clone` run on Mama's mockup produces composite markup for all 9 sections; per-section coverage ≥80%
- [ ] `python plugins/sgs-blocks/scripts/recogniser/critical-fix-verification.py` reports 5/5 PASS
- [ ] `framework_gap_candidates` register at `.claude/reports/phase-8-framework-gap-candidates-<date>.md` aggregates all sections
- [ ] /qc-inline reports no assumption violations
- [ ] sandybrown homepage `post_content` snapshot saved for rollback
- [ ] Deploy succeeded: `tar/scp/extract + OPcache reset + wp post update`; live URL returns 200 with new markup
- [ ] Multi-frame Playwright captures at 0/200/500/1000/3000 ms × 375/768/1440 viewports exist
- [ ] mockup-parity-validator + screenshot-diff-helper at threshold 5 reports clean parity per section
- [ ] **Bean opens URL with own eyes at all 3 breakpoints and confirms PASS** (lesson 221)
- [ ] `.claude/parking.md` P-11-M9 marked RESOLVED with notes
- [ ] `.claude/state.md` advances to bucket-2-ready

**The 9 Mama's sections (canonical list):**

| # | Section | Target SGS block(s) | Notes |
|---|---|---|---|
| 1 | header | header pattern + sgs/multi-button + sgs/business-info | Composite (template part) |
| 2 | hero | sgs/hero | Has 50-attr baseline fixture; deterministic target |
| 3 | trust-bar | sgs/trust-bar | Trustpilot + ratings strip |
| 4 | card-grid (featured-product) | sgs/card-grid | Product showcase |
| 5 | heritage-strip (brand-story) | sgs/heritage-strip | Brand narrative |
| 6 | icon-list (ingredients) | sgs/icon-list | Bulleted features with icons |
| 7 | cta-section (gift-section) | sgs/cta-section | Composite with sgs/multi-button + sgs/button |
| 8 | testimonial-slider (social-proof) | sgs/testimonial-slider | Real Trustpilot reviews from `sites/mamas-munches/research/trustpilot-reviews.json` |
| 9 | footer | footer pattern + sgs/business-info | Composite (template part) |

**Entry context:**
- Phase 7 outputs - orchestrator rewired with subprocess calls into recogniser scripts; pipeline integrity verified
- `plugins/sgs-blocks/scripts/recogniser/slot-filler.py` (v1, 1116 LOC, 8/14 pre-migration)
- `plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py` (14 tests)
- `plugins/sgs-blocks/scripts/recogniser/tests/fixtures/hero-baseline.json` (50-attr baseline; DO NOT MODIFY)
- `sites/mamas-munches/mockups/homepage/` (post-Phase-6, SGS-BEM)
- `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` - section catalogue
- `sites/mamas-munches/research/trustpilot-reviews.json` - testimonial data
- Project root CLAUDE.md - deploy command sequence
- SSH credentials: `u945238940@141.136.39.73:65002`

**References:**
- Phase 7 - orchestrator rewired
- Phase 6 - mockup migrated
- Spec 12 Hard Rule 5 - pull all CSS, every declaration ends in bucket A/B/C
- Spec 13 sub-rule - `framework_gap_candidates` distinguishes from `scoped_custom_css`
- Lesson 218 (search-local + qc-inline gates)
- Lesson 221 (don't delegate test of unproven work)
- Hard Rule 10 (screenshot-diff before classifier severity reduction)

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| cli | pytest | Steps 1-3 |
| inline | Edit slot-filler.py | Steps 2-3 (if patches needed) |
| cli | sgs-clone-orchestrator.py | Step 4 (full pipeline run) |
| cli | critical-fix-verification.py | Step 7 |
| skill | /qc-inline | Step 8 |
| cli | wp-cli over SSH | Steps 9, 12 |
| cli | global-styles-reset.js | Step 10 |
| cli | tar / scp / ssh | Step 11 |
| mcp | Playwright | Step 13 |
| cli | mockup-parity-validator.js + screenshot-diff-helper.js | Step 14 |
| inline | AskUserQuestion (eyes-on confirm) | Step 15 |

---

## Steps - Part A: Validation

### Step 1 - Pytest baseline (hero parity gate)
- **Model:** inline
- **Action:** `python -m pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py -v` - capture pass/fail.
- **Files:** none (capture stdout)
- **Inputs:** post-Phase-7 pipeline state
- **Outcome:** Pass count + failing tests recorded; hero baseline 50/50 confirmed or root-causable
- **Exec:** SEQUENTIAL
- **Deps:** Phase 7 complete
- **Marker:** SESSION-START
- **Time:** 5 min
- **Tooling:** pytest
- **On-Fail:** Test runner errors → diagnose path issues
- **Cold-Entry:** This file + Phase 7 outputs + TRUTH-SPEC.md
- **Test:**
  - Happy: 14/14 PASS immediately → skip to Step 4
  - Edge: 12-13/14 → fix in Steps 2-3
  - Fail: <8/14 → Phase 6 or Phase 7 broke something; back-trace
  - Integration: feeds Step 2

### Step 2 - Patch slot-filler.py for visual-token / responsive-spacing roles (if hero parity not 50/50)
- **Model:** inline
- **Action:** Implement `attr_name_to_element_id(attr_name)` derivation + visual-token dispatch path. Element_id derivation: strip viewport suffix → strip property suffix → leading semantic word. Then layer-3 lookup + SGS-BEM construct strategy (`.sgs-<block>__<element_id>`) + computed-style query with @media handling per viewport tier + role-template value_extractor.
- **Files:** `plugins/sgs-blocks/scripts/recogniser/slot-filler.py`
- **Inputs:** Step 1 root-cause map; layer-3-internal-elements.json; role-templates.json
- **Outcome:** Visual-token / responsive-spacing roles now resolve via element_id derivation
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 if failures present
- **Marker:** (none)
- **Time:** 45-90 min if patches needed; 0 if Step 1 already 14/14
- **Tooling:** Edit
- **On-Fail:** Patch breaks existing passes → revert + smaller increments
- **Test:**
  - Happy: post-patch pytest 14/14
  - Edge: 13/14 stuck → role-templates content gap; surface to Bean
  - Fail: regression → revert
  - Integration: Step 3 verifies

### Step 3 - Iterate to 14/14 (cap 5 iterations)
- **Model:** inline
- **Action:** Re-run pytest; narrow further if needed
- **Files:** slot-filler.py (additional patches)
- **Outcome:** All 14 PASS
- **Exec:** SEQUENTIAL (loop)
- **Deps:** Step 2 if patches applied
- **Time:** 15-45 min
- **On-Fail:** 5+ iterations no convergence → escalate to Bean
- **Test:** As Step 1

---

## QA Gate - Hero parity 50/50 + slot-filler 14/14
- **Model:** inline
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-3 complete
- **Check:** `pytest plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py -v --tb=short`
- **Pass:** 14/14 PASS
- **Fail:** Don't advance - iterate
- **Marker:** QA

---

### Step 4 - Run full /sgs-clone on Mama's mockup via rewired orchestrator
- **Model:** inline
- **Action:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage`. Capture run_id + per-section outputs.
- **Files:** `pipeline-state/<run_id>/stage-N.json`, `composite-markup.json`, `composite-review.html`, per-section results
- **Inputs:** rewired orchestrator + post-Phase-6 mockup
- **Outcome:** All 9 sections produce composite markup; recognition_log + leftover entries persist; coverage reports generated per section
- **Exec:** SEQUENTIAL
- **Deps:** QA gate passed
- **Marker:** (none)
- **Time:** 10-15 min
- **Tooling:** orchestrator CLI
- **On-Fail:** If orchestrator errors out, diagnose via stage-N.json artefacts; return to Phase 7 if rewire bug surfaced
- **Test:**
  - Happy: stage-9.json produced; composite-markup.json has 9 section entries
  - Edge: section produces empty filled_slots → root-cause per section
  - Fail: orchestrator error → Phase 7 issue
  - Integration: feeds Step 5

### Step 5 - Per-section coverage validation + framework_gap_candidates aggregation
- **Model:** inline
- **Action:** For each of 9 sections, read stage-9.json coverage stats. Verify ≥80% per Spec 12 Hard Rule. Aggregate `framework_gap_candidates` from all sections into a single register at `.claude/reports/phase-8-framework-gap-candidates-<date>.md`. Each entry: which block, which selector, suggested attribute name.
- **Files:** `.claude/reports/phase-8-section-<name>-<date>.md` per section + `.claude/reports/phase-8-framework-gap-candidates-<date>.md`
- **Inputs:** Step 4 outputs
- **Outcome:** 9 per-section reports + 1 aggregate gap register
- **Exec:** PARALLEL across sections (read-only) then SEQUENTIAL aggregation
- **Deps:** Step 4 complete
- **Marker:** (none)
- **Time:** 20 min
- **Tooling:** Read + Write
- **On-Fail:** Section below 80% coverage → document root cause; if 7+ of 9 pass, acceptable to continue with deferred section work
- **Test:**
  - Happy: 9/9 ≥80%; gap register has 5-30 entries
  - Edge: 1-2 sections below threshold → document, continue if Bean approves
  - Fail: 4+ sections below threshold → systemic issue, halt deploy
  - Integration: feeds Step 6

### Step 6 - Testimonial-slider real-data validation
- **Model:** inline
- **Action:** Verify section 8 (testimonial-slider) filled_slots include the 4 reviews from trustpilot-reviews.json
- **Files:** none new
- **Inputs:** Step 4 testimonial-slider output + trustpilot-reviews.json
- **Outcome:** 4 reviews present in filled_slots
- **Exec:** SEQUENTIAL
- **Deps:** Step 5 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Read + jq
- **On-Fail:** Reviews not ingesting → slot-filler may need data-source attr handler; document but don't block (placeholder reviews acceptable for M9)
- **Test:**
  - Happy: 4 reviews populate the slider
  - Edge: 3/4 (one review has special chars) → fix encoding
  - Fail: 0 reviews → document gap; use Lorem-text placeholder
  - Integration: section 8 report flagged

### Step 7 - Critical-fix-verification 5/5
- **Model:** inline
- **Action:** `python plugins/sgs-blocks/scripts/recogniser/critical-fix-verification.py`
- **Files:** none new
- **Outcome:** 5/5 PASS
- **Exec:** SEQUENTIAL
- **Deps:** Step 6 complete
- **Time:** 5 min
- **On-Fail:** <5/5 → identify regression; likely Phase 4 propagation or Phase 7 rewire
- **Test:**
  - Happy: 5/5 PASS
  - Edge: 4/5 → spot-check role-templates / layer-1-envelopes
  - Fail: 3/5 or less → halt; back-trace
  - Integration: feeds Step 8

### Step 8 - /qc-inline final verification on validation outputs
- **Model:** inline
- **Action:** /qc-inline on Steps 1-7 outputs (slot-filler patches + 9 section reports + gap register + critical-fix verdict)
- **Files:** none
- **Outcome:** No assumption violations
- **Exec:** SEQUENTIAL
- **Deps:** Step 7 complete
- **Marker:** (none)
- **Time:** 15 min
- **On-Fail:** Resolve flagged assumptions before deploy
- **Test:**
  - Happy: clean
  - Edge: 1-2 minor flags → resolve
  - Fail: structural violation → halt deploy
  - Integration: validation gate complete

---

## QA Gate - Validation passed; pipeline cleared for deploy
- **Model:** sonnet
- **Exec:** SEQUENTIAL
- **Deps:** Steps 4-8 complete
- **Check:** All success criteria from "Phase success criteria" Validation section met (14/14 + 9 sections ≥80% + 5/5 critical fix + qc-inline clean)
- **Pass:** All green; advance to deploy
- **Fail:** Specific failure → iterate that step OR escalate to Bean for deferral decision
- **Marker:** QA

---

## Steps - Part B: Live Deploy

### Step 9 - Snapshot sandybrown homepage post_content for rollback
- **Model:** inline
- **Action:** Lookup homepage post id (`wp post list --post_type=page` over SSH; sandybrown's home is whatever Settings → Reading → "Your homepage" points to). `wp post get <id> --field=post_content > .claude/scratch/sandybrown-homepage-pre-m9-deploy-<timestamp>.html` over SSH.
- **Files:** scratch HTML snapshot
- **Inputs:** SSH access; wp-cli on remote
- **Outcome:** Snapshot exists; rollback path documented; post id recorded
- **Exec:** SEQUENTIAL
- **Deps:** Validation QA gate passed
- **Marker:** (none)
- **Time:** 5 min
- **Tooling:** SSH + wp-cli + Bash
- **On-Fail:** wp-cli unavailable → fall back to admin export
- **Test:**
  - Happy: file exists with non-trivial content
  - Edge: homepage empty → still snapshot for record
  - Fail: SSH issue → fix per CLAUDE.md
  - Integration: Step 16 may use for revert

### Step 10 - global-styles-reset
- **Model:** inline
- **Action:** `node scripts/global-styles-reset.js` - reset wp_global_styles overlay
- **Files:** sandybrown WP DB
- **Outcome:** wp_global_styles reset to theme defaults
- **Exec:** SEQUENTIAL
- **Deps:** Step 9 complete
- **Time:** 5 min
- **Tooling:** node script
- **On-Fail:** Document cause; consider whether to proceed or block
- **Test:**
  - Happy: stdout reports success
  - Edge: already at defaults → no-op success
  - Fail: REST unreachable → fix auth
  - Integration: feeds Step 11

### Step 11 - Deploy: tar + scp + extract + OPcache reset + wp post update
- **Model:** inline
- **Action:** Per project CLAUDE.md deploy sequence: tar SGS theme + plugin + composite markup; scp to server; extract; OPcache HTTP one-shot; `wp post update <id> --post_content="<composite-markup>"` over SSH.
- **Files:** sgs-deploy.tar (transient); remote filesystem; sandybrown WP DB
- **Inputs:** Step 4 composite-markup.json + project CLAUDE.md deploy sequence
- **Outcome:** Live homepage serves new clone
- **Exec:** SEQUENTIAL (sub-steps must serialise)
- **Deps:** Step 10 complete
- **Time:** 10-15 min
- **Tooling:** tar + scp + ssh + wp-cli
- **On-Fail:** Halt + rollback via Step 9 snapshot
- **Test:**
  - Happy: each sub-step exits 0; live URL loads without 500
  - Edge: SCP nested-directory bug → use documented tar method
  - Fail: deploy fails mid-way → rollback path active
  - Integration: feeds Step 12

### Step 12 - Confirm 200 + new content visible
- **Model:** inline
- **Action:** `curl -sI https://sandybrown-nightingale-600381.hostingersite.com/`. Then `curl -s ... | head -50` for HTML markers.
- **Files:** none
- **Outcome:** 200 + new content visible
- **Exec:** SEQUENTIAL
- **Deps:** Step 11 complete
- **Time:** 2 min
- **Tooling:** curl
- **On-Fail:** 500 → check OPcache; 404 → check routing; old content → check LiteSpeed (`wp litespeed-purge all` if active)
- **Test:**
  - Happy: 200 + new markup
  - Edge: 200 + old markup → cache issue, purge
  - Fail: 500 → revert per Step 9
  - Integration: feeds Step 13

---

## QA Gate - Live deploy succeeded
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Steps 9-12 complete
- **Check:** `curl -s -o /dev/null -w "%{http_code}\n" https://sandybrown-nightingale-600381.hostingersite.com/` returns 200
- **Pass:** 200
- **Fail:** Halt; rollback active
- **Marker:** QA

---

### Step 13 - Multi-frame Playwright capture across breakpoints
- **Model:** inline
- **Action:** `node tools/multi-frame-qa/capture.js --url https://sandybrown-... --frames 0,200,500,1000,3000 --viewports 375,768,1440`
- **Files:** `reports/visual-diff/m9-deploy-<timestamp>/<viewport>-<frame>ms.png` × 15
- **Outcome:** 15 screenshots captured
- **Exec:** PARALLEL within capture.js
- **Deps:** Step 12 + QA gate complete
- **Time:** 10 min
- **Tooling:** capture.js (Playwright headless)
- **On-Fail:** Captures fail → retry with longer timeouts
- **Test:**
  - Happy: 15 PNG files exist; each non-trivial
  - Edge: 1-2 captures fail (timing) → re-run those
  - Fail: all fail → browser environment issue
  - Integration: feeds Step 14

### Step 14 - mockup-parity-validator + screenshot-diff-helper per section
- **Model:** inline
- **Action:** For each Mama's section: run mockup-parity-validator.js (Q1-Q4 + Section R measurement) + screenshot-diff-helper.js at threshold 5
- **Files:** `reports/visual-diff/m9-deploy-<timestamp>/parity-<section>.md` × 9
- **Outcome:** Per-section parity report; Q1-Q4 deltas with screenshot-diff evidence per Hard Rule 10
- **Exec:** PARALLEL across sections
- **Deps:** Step 13 complete
- **Time:** 20 min
- **Tooling:** mockup-parity-validator.js + screenshot-diff-helper.js
- **On-Fail:** Any HIGH severity → surface to Bean before Step 15
- **Test:**
  - Happy: every section ≤ threshold 5
  - Edge: 1-2 above threshold but explainable (font-loading, AA) → document
  - Fail: 3+ above threshold → structural issue; deploy quality fails
  - Integration: feeds Step 15

### Step 15 - Bean's eyes-on review (no delegation per lesson 221)
- **Model:** inline (Bean is the reviewer)
- **Action:** AskUserQuestion: "Open https://sandybrown-... at 375 / 768 / 1440. Confirm clone parity per breakpoint. Verdict: ship / amend / abort."
- **Files:** none
- **Inputs:** live URL + Steps 13-14 reports
- **Outcome:** Bean's verdict captured (PASS / amend / abort)
- **Exec:** SEQUENTIAL
- **Deps:** Step 14 complete
- **Marker:** HANDOFF (waiting on Bean)
- **Time:** as long as Bean takes (5-30 min)
- **Tooling:** AskUserQuestion + Bean's browser
- **On-Fail:** "amend" → route to Phase 7/8 amendments; "abort" → Step 16 rollback
- **Test:**
  - Happy: Bean confirms PASS at all 3 breakpoints
  - Edge: PASS with deferred amendments → log + carry forward
  - Fail: ABORT → rollback + post-mortem
  - Integration: closes M9 with verdict

---

## QA Gate - Bean confirms PASS
- **Model:** inline
- **Exec:** SEQUENTIAL
- **Deps:** Step 15 complete with Bean response
- **Check:** Bean response contains explicit "ship" / "PASS" / "M9 confirmed" - not vague
- **Pass:** Explicit verdict
- **Fail:** Don't mark RESOLVED; route to amend / abort
- **Marker:** QA

---

### Step 16 - Mark P-11-M9 RESOLVED + advance state (if PASS)
- **Model:** inline
- **Action:** Edit `.claude/parking.md`: P-11-M9 → RESOLVED <date> with completion notes (sections shipped, parity scores, deferred amendments). Edit `.claude/state.md`: current_phase → bucket-2-ready. Edit `.claude/decisions.md` recording Phase 8 outcome.
- **Files:** parking.md, state.md, decisions.md
- **Outcome:** Living docs reflect M9 ship
- **Exec:** SEQUENTIAL
- **Deps:** Step 15 PASS verdict
- **Marker:** HANDOFF (closes 8-phase arc)
- **Time:** 10 min
- **Tooling:** Edit
- **On-Fail:** Updates non-blocking; retry on conflict
- **Test:**
  - Happy: 3 docs updated; M9 RESOLVED; state advanced
  - Edge: state.md next-phase uncertain → ask Bean
  - Fail: edit conflict → re-read + retry
  - Integration: closes the entire 8-phase plan

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Per-section coverage threshold for composite template parts (header / footer)?
  - **Options:** A) 80% uniform / B) Lower threshold for templates / C) Coverage measured per constituent block, not per template-part section
  - **Recommendation:** C
  - **Why:** Template parts are conceptually different from blocks
  - **Cost of wrong choice:** A unfairly fails template parts; B sets soft target
  - **Who decides:** Bean

- **Decision:** Hero parity is gate-blocking; ALL 9 sections gate-block too, or only hero?
  - **Options:** A) All 9 (strict) / B) Hero only / C) 7+ of 9 with hero mandatory
  - **Recommendation:** C
  - **Why:** Hero is deterministic; some sections may have framework gaps that aren't slot-filler bugs (those go in framework_gap_candidates)
  - **Cost of wrong choice:** A blocks on legitimate gaps; B lets quiet failures through
  - **Who decides:** Bean

- **Decision:** Rollback trigger threshold during deploy?
  - **Options:** A) Any 500 → rollback / B) Visual regression above threshold 5 → rollback / C) Bean's eyes-on PASS is the only gate
  - **Recommendation:** C
  - **Why:** Lesson 221 puts verdict with Bean; minor issues fixable inline
  - **Cost of wrong choice:** A reverts on transient errors; B reverts on borderline; C requires Bean
  - **Who decides:** Bean

- **Decision:** Should /visual-qa run as a final gate before Step 15?
  - **Options:** A) Yes - full 9-layer audit / B) No - Step 14 covers it / C) Only if Step 14 surfaces high-severity issues
  - **Recommendation:** C
  - **Why:** /visual-qa is heavy; Step 14 is M9 critical path
  - **Cost of wrong choice:** A adds time; B may miss issues parity-validator doesn't surface (a11y, performance)
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** Step 11 deploy succeeds but homepage still shows debug WP nav (the M9 false-claim artefact)?
  - **Recommendation:** Debug nav was a separate theme issue. Verify with Inspect Element on Step 12; if persists, that's a follow-up theme fix not a blocker for M9.

- **Decision:** Step 6 testimonial reviews don't ingest cleanly - does it block?
  - **Recommendation:** No. M9 ships with Lorem placeholder testimonials acceptable; mark testimonial-slider real-data ingest as a follow-up parking entry.

- **Decision:** Bean's verdict is "amend section X specifically" - does that block M9 or carry forward?
  - **Recommendation:** Carry forward. M9 ships with section X amend deferred to next session. P-11-M9 RESOLVED with follow-up parking entry P-11-M9-followup-section-X. Bean's call.

- **Decision:** What if /sgs-clone Step 4 produces fewer filled slots than slot-filler-isolation tests would predict (orchestrator wiring degrades vs direct slot-filler)?
  - **Recommendation:** That's a Phase 7 regression; halt validation; return to Phase 7 with the diagnostic.