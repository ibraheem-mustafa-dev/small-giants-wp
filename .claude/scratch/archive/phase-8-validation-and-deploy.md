# Phase 8 - Pipeline Validation + Live Deploy + Eyes-On Review

**USP:** Run the post-Phase-7 rewired pipeline end-to-end on all 9 sections of Mama's mockup, validate every section, deploy live to sandybrown homepage, and confirm with Bean's own eyes at all 3 breakpoints. Closes the M9 redo arc.

**Status:** Plan rewritten 2026-05-11 against actual disk state after a dependency audit showed the original Phase 8 plan was written against a proposed-future architecture (`slot-filler.py`, `role-templates.json`, `layer-3-internal-elements.json`, `hero-baseline.json`, `critical-fix-verification.py`, `test_slot_filler.py`) that was never built and is not required for the pipeline to ship. The working pipeline uses `tools/recogniser-v2/extract.py` at stages 4-8, which Spec 12 section 6 documents as "Working" with "Hero verified at 100% PoC parity".

**Plan label:** [PLAN: opus]
**Aggregate cost estimate:** ~$2-3 (Opus inline; full pipeline run with Playwright; deploy; multi-frame capture; eyes-on review)

## Phase success criteria (done when)

- [x] Trustpilot reviews captured to `sites/mamas-munches/research/trustpilot-reviews.json` (4 reviews, real text) — completed 2026-05-11 via Playwright MCP; the SGS Trustpilot Sync infrastructure shipped same day (commit `06df2807`) now keeps this live via wp_options[sgs_trustpilot_data] on any SGS site
- [ ] Full `sgs-clone-orchestrator.py --auto-section` run on Mama's mockup produces composite markup for all 9 sections
- [ ] Per-section coverage extracted from each `stage-9.json`; framework_gap_candidates aggregated to one report
- [ ] sandybrown homepage `post_content` snapshot saved for rollback
- [ ] `global-styles-reset.js` run before deploy (per the 2026-05-04 wp_global_styles cache lesson)
- [ ] Deploy succeeded: tar + scp + extract + OPcache reset + `wp post update`; live URL returns 200 with new markup
- [ ] Multi-frame Playwright captures at 0/200/500/1000/3000 ms × 375/768/1440 viewports exist
- [ ] `mockup-parity-validator.js` + `screenshot-diff-helper.js` at threshold 5 reports clean parity per section
- [ ] **Bean opens URL with own eyes at all 3 breakpoints and confirms PASS** (lesson 221, no agent fallback)
- [ ] `.claude/parking.md` P-11-M9 marked RESOLVED
- [ ] `.claude/state.md` advances past convention-rollout phase

## The 9 Mama's sections (canonical list)

| # | Section selector | Target SGS block / pattern | Notes |
|---|---|---|---|
| 1 | `header.sgs-header` | header pattern (template part) | Composite. Voter returns sgs/header; matrix flags `registered=false` (it's a pattern, not a block) |
| 2 | `section.sgs-hero` | sgs/hero | Spec 12 §6 PoC parity baseline. The deterministic anchor |
| 3 | `section.sgs-trust-bar` | sgs/trust-bar | Trustpilot rating strip |
| 4 | `section.sgs-featured-product` | Pattern (composite of sgs/product-card + supporting blocks) | 1 of the 4 gap-candidate patterns |
| 5 | `section.sgs-heritage-strip` | sgs/heritage-strip | Brand narrative |
| 6 | `section.sgs-ingredients-section` | `ingredients-section` pattern (4 sgs/info-box in sgs/feature-grid) | Pattern already exists at `theme/sgs-theme/patterns/ingredients-section.php` |
| 7 | `section.sgs-gift-section` | Pattern (composite, gift cards + CTAs) | 1 of the 4 gap-candidate patterns |
| 8 | `section.sgs-social-proof` | Pattern containing sgs/testimonial-slider + trustpilot bar | 1 of the 4 gap-candidate patterns |
| 9 | `footer.sgs-footer` | footer pattern (template part) | Composite, same shape as header |

## Tools used (actual disk-verified inventory)

| Type | Path | Used in |
|---|---|---|
| CLI | `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` | Step 3 (full pipeline run) |
| MCP | Playwright MCP (`mcp__playwright__*`) | Step 1 (Trustpilot scrape), Step 8 (multi-frame capture sidecar if needed) |
| CLI | `tools/multi-frame-qa/capture.js` | Step 8 (multi-frame capture) |
| CLI | `scripts/global-styles-reset.js` | Step 5 |
| CLI | `scripts/mockup-parity-validator.js` | Step 9 |
| CLI | `scripts/screenshot-diff-helper.js` | Step 9 |
| Shell | `tar` + `scp` + `ssh` | Step 6 |
| Shell | `curl` | Step 7 |
| Shell | `wp-cli` over SSH | Step 4 (snapshot), Step 6 (post update) |
| Skill | `/qc-inline` | Step 10 |
| Tool | `AskUserQuestion` | Step 11 (Bean's eyes-on verdict) |
| Editor | `Edit` | Step 12 (state closeout) |

## Tools NOT used and why

- **`slot-filler.py` / `role-templates.json` / `layer-3-internal-elements.json` / `hero-baseline.json` / `critical-fix-verification.py` / `test_slot_filler.py`** -- proposed-future scripts that were never built and are not part of the wired pipeline. Tracked as Phase 9+ candidates in parking, not blockers for M9.
- **`/uimax-scrape`** for Trustpilot -- wrong tool. That skill captures design patterns, not text data. Playwright MCP is the right tool for review text capture (demonstrated 2026-05-11).

---

## Steps -- Part A: Capture + Run Pipeline

### Step 1 - Trustpilot review capture via Playwright MCP

- **Status:** SHIPPED 2026-05-11 (this session)
- **Action:** Navigate to `https://uk.trustpilot.com/review/mamasmunches.com` via `mcp__playwright__browser_navigate`. Wait 6 seconds for AWS WAF JS challenge to clear. Run `browser_evaluate` with JSON-LD + __NEXT_DATA__ + DOM-fallback extractor. 4 reviews captured via `application/ld+json`.
- **Files:** `sites/mamas-munches/research/trustpilot-reviews.json` (4 reviews, real text + ratings + dates)
- **Outcome:** DONE. Real review data available for sgs/testimonial-slider population in Step 3.
- **Cost lesson:** AWS WAF challenge resolves in ~6s with any real-browser MCP. Any curl-class tool fails (HTTP 403 interstitial).

### Step 2 - Smoke-test the rewired orchestrator with Playwright on (single-section sanity)

- **Model:** inline
- **Action:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --section "section.sgs-hero" --client mamas-munches --page homepage` (Playwright on, no `--no-playwright` flag).
- **Files:** `pipeline-state/<run_id>/stage-*.json`, `operator-review.html`
- **Outcome:** Hero attribute-extraction count jumps from 3 (Phase 7 smoke without Playwright) to ~50 (Spec 12 §6 baseline). Confirms Playwright path works end-to-end before going multi-section.
- **Time:** 5 min
- **On-Fail:** Playwright import error -> install `playwright` + `chromium`; per-attribute timeout -> increase per-attribute wait; if structural -> back-trace into extract.py (NOT Phase 7 scripts)
- **Test:**
  - Happy: hero stage-4 reports ~50 attrs extracted; stage-9 coverage ≥80% on visible elements
  - Edge: 40-49 attrs extracted -> acceptable; minor attribute drift since the 2026-05-09 PoC
  - Fail: <30 attrs extracted -> extract.py regression; halt + diagnose before Step 3

### Step 3 - Full `--auto-section` run across all 9 sections

- **Model:** inline
- **Action:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section --client mamas-munches --page homepage`. Capture run_id.
- **Files:** `pipeline-state/<run_id>/stage-*.json`, `operator-review.html`, `extract-result.json` per section
- **Inputs:** Step 2 confirmation
- **Outcome:** All 9 sections produce voter/match/slot-list/extract artefacts. Composite block markup for each. recognition_log rows written to uimax DB. Operator-review HTML aggregates all 9 sections.
- **Time:** 10-15 min (Playwright drives 9 sections × multi-viewport)
- **Tooling:** orchestrator CLI; pipe stdout to file
- **On-Fail:**
  - Multi-section walking: the current orchestrator runs extract.py per top match. If extract.py needs explicit per-section invocation, patch the orchestrator's stage 4-8 to loop over `match.matches[]` instead of taking only `match.matches[0]`. ~30 LOC patch.
  - Per-section failure: capture stage-N.json for diagnosis; do NOT halt the run (orchestrator should soft-fail per section).
- **Test:**
  - Happy: 9 sections produce non-empty filled_slots; recognition_log has 9 × (open_slots + animation_unclassified) rows
  - Edge: 1-2 sections produce 0 filled_slots -> log as framework_gap_candidate, continue
  - Fail: 4+ sections produce 0 filled_slots -> systemic issue, halt before deploy

### Step 4 - Per-section coverage validation + framework_gap_candidates aggregation

- **Model:** inline
- **Action:** Read each section's coverage stats from `stage-9.json` output. Aggregate `framework_gap_candidates` entries (sections that voted slug not in registered_blocks; CSS rules that the classifier marked one-time-custom) into a single report at `.claude/reports/phase-8-framework-gap-candidates-<date>.md`.
- **Files:** `.claude/reports/phase-8-framework-gap-candidates-2026-05-11.md`, `.claude/reports/phase-8-section-coverage-2026-05-11.md`
- **Outcome:** One aggregate gap register documenting Phase 9 work; one coverage report per section.
- **Time:** 15 min
- **Tooling:** Read + Write inline (small, focused; not subagent territory)
- **On-Fail:** Section below 80% coverage with no clear gap -> add to gap register with `reason=unknown` and continue
- **Test:**
  - Happy: 9/9 sections ≥60% coverage on visible elements (composite patterns count constituent blocks, not template part as a whole, per the deferred judgement call from the old plan)
  - Edge: 1-2 sections at 40-60% with explainable gaps in the register -> continue
  - Fail: 4+ sections below 60% -> halt deploy, return to Phase 7 if rewire bug

### Step 5 - Testimonial-slider population check

- **Model:** inline
- **Action:** Verify section 8 (social-proof) stage-4 output contains slots populated from Step 1's `trustpilot-reviews.json` rather than placeholder Lorem text. If the orchestrator's extract.py doesn't read external JSON yet, treat this as a follow-up: the pattern's `sgs/testimonial-slider` block can be populated post-deploy via `wp-update-block-attrs.js`.
- **Files:** none new
- **Outcome:** Either real reviews in the composite markup, OR a parking entry created for post-deploy testimonial swap
- **Time:** 10 min
- **On-Fail:** Not a deploy blocker. Acceptable to ship with placeholder + parking entry for review insertion.

---

## QA Gate - Pipeline run complete

- **Model:** inline
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-5 complete
- **Check:** All 9 sections produced output; gap register exists; reviews captured.
- **Pass:** All green; advance to deploy
- **Fail:** Specific failure -> iterate that step OR escalate to Bean for deferral

---

## Steps -- Part B: Live Deploy

### Step 6 - Snapshot sandybrown homepage post_content for rollback

- **Model:** inline
- **Action:** Identify sandybrown homepage post id via `wp post list --post_type=page` over SSH. Save `wp post get <id> --field=post_content` to `.claude/scratch/sandybrown-homepage-pre-m9-deploy-<timestamp>.html`. Record post id.
- **Files:** scratch HTML snapshot
- **Outcome:** Rollback path documented
- **Time:** 5 min
- **Tooling:** SSH + wp-cli
- **On-Fail:** wp-cli unavailable -> WP admin export

### Step 7 - `global-styles-reset.js` (mandatory per 2026-05-04 lesson)

- **Model:** inline
- **Action:** `node scripts/global-styles-reset.js` (script exists, confirmed disk-verified). Resets `wp_global_styles` post so the new theme.json variation values propagate instead of being masked by the cached merge.
- **Files:** sandybrown WP DB
- **Outcome:** wp_global_styles cleared to theme defaults; the active variation will be re-applied on next render
- **Time:** 5 min
- **On-Fail:** REST unreachable -> fix auth (`wp-content-guard.py` hook may need temporary bypass; do NOT skip this step or the live page won't reflect variation tokens)

### Step 8 - Deploy: tar + scp + extract + OPcache reset + `wp post update`

- **Model:** inline
- **Action:** Per project CLAUDE.md deploy sequence:
  1. `tar -cf sgs-deploy.tar --exclude='node_modules' --exclude='.git' --exclude='plugins/sgs-blocks/src' theme/sgs-theme plugins/sgs-blocks`
  2. `scp -P 65002 sgs-deploy.tar u945238940@141.136.39.73:sgs-deploy.tar`
  3. SSH one-shot: `rm -rf` old dirs, `tar -xf`, `mv` to wp-content, cleanup
  4. OPcache reset via HTTP-fetch of temp `op-reset-tmp.php`
  5. `wp post update <id> --post_content="$(cat composite-markup.html)"` over SSH
- **Files:** sgs-deploy.tar (transient); remote filesystem; sandybrown WP DB
- **Outcome:** Live homepage serves new clone
- **Time:** 10-15 min
- **On-Fail:** Halt + restore via Step 6 snapshot
- **Test:**
  - Happy: each sub-step exits 0; live URL loads without 500
  - Edge: SCP nested-directory bug -> use the documented tar method (already in the command above)
  - Fail: deploy fails mid-way -> rollback path active

### Step 9 - Confirm HTTP 200 + new content visible

- **Model:** inline
- **Action:** `curl -sI https://sandybrown-nightingale-600381.hostingersite.com/` for status. Then `curl -s ... | head -50` for HTML markers (search for `class="sgs-hero"`, `class="sgs-trust-bar"`, etc.)
- **Files:** none
- **Outcome:** 200 + new markup visible
- **Time:** 2 min
- **On-Fail:** 500 -> check OPcache; 404 -> check routing; old content -> check LiteSpeed (`wp plugin list | grep litespeed` first; if active, `wp litespeed-purge all`)

---

## QA Gate - Live deploy succeeded

- **Check:** `curl -s -o /dev/null -w "%{http_code}\n" https://sandybrown-nightingale-600381.hostingersite.com/` returns 200 AND markup contains `class="sgs-hero"`
- **Pass:** Both true
- **Fail:** Halt; rollback active

---

## Steps -- Part C: Visual Verification + Bean Sign-Off

### Step 10 - Multi-frame Playwright capture across breakpoints

- **Model:** inline
- **Action:** `node tools/multi-frame-qa/capture.js --url https://sandybrown-nightingale-600381.hostingersite.com/ --frames 0,200,500,1000,3000 --viewports 375,768,1440`
- **Files:** `reports/visual-diff/m9-deploy-<timestamp>/<viewport>-<frame>ms.png` × 15
- **Outcome:** 15 screenshots captured. Multi-frame catches entrance-animation invisibility bugs per the 2026-05-04 lesson (the original M9 false-claim incident).
- **Time:** 10 min
- **On-Fail:** Captures fail -> retry with longer wait times in capture.js

### Step 11 - `mockup-parity-validator.js` + `screenshot-diff-helper.js` per section

- **Model:** inline
- **Action:** For each of 9 sections: `node scripts/mockup-parity-validator.js --mockup-section section.sgs-<name> --live-url <sandybrown_url>` and `node scripts/screenshot-diff-helper.js --mockup <png> --live <png> --threshold 5`. Both already disk-verified.
- **Files:** `reports/visual-diff/m9-deploy-<timestamp>/parity-<section>.md` × 9
- **Outcome:** Per-section parity report. Q1-Q4 measurement + Section R full-background-family + pseudo-elements + parent-chain per lesson 207. Pixel-level diff at threshold 5 per Hard Rule 10.
- **Time:** 20 min
- **On-Fail:** Any HIGH severity -> surface to Bean before Step 12 (do not silently dismiss; lesson from 2026-05-05 parity-validator dismissal-as-noise incident)
- **Test:**
  - Happy: every section ≤ threshold 5
  - Edge: 1-2 above threshold but explainable (font-loading anomaly, AA contrast tweak) -> document
  - Fail: 3+ above threshold -> structural issue, deploy quality fails, return to Phase 7 or earlier

### Step 12 - Bean's eyes-on review (no delegation per lesson 221)

- **Model:** inline (Bean is the reviewer)
- **Action:** `AskUserQuestion`: "Open https://sandybrown-nightingale-600381.hostingersite.com/ at 375 / 768 / 1440. Confirm clone parity per breakpoint. Verdict: ship / amend / abort."
- **Files:** none
- **Inputs:** live URL + Steps 10-11 reports
- **Outcome:** Bean's verdict captured
- **Time:** as long as Bean takes
- **Marker:** HANDOFF (waiting on Bean)
- **On-Fail:**
  - "amend" -> route to specific section work, do NOT mark M9 RESOLVED until amend lands
  - "abort" -> Step 13 rollback

---

## QA Gate - Bean confirms PASS

- **Check:** Bean response contains explicit "ship" / "PASS" / "M9 confirmed" - not vague
- **Pass:** Explicit verdict; advance to Step 13
- **Fail:** Don't mark RESOLVED; route to amend / abort branch

---

### Step 13 - State closeout (if PASS)

- **Model:** inline
- **Action:** Edit:
  - `.claude/parking.md` -- P-11-M9 marked RESOLVED with completion notes (sections shipped, parity scores, deferred amendments)
  - `.claude/state.md` -- `current_phase` advanced past convention-rollout-phase-8
  - `.claude/decisions.md` -- record Phase 8 outcome + Trustpilot scrape working pattern
  - Add follow-up parking entries: (a) post-deploy testimonial-slider swap with real reviews if Step 5 didn't populate them inline; (b) future slot-filler architecture work (Phase 9 candidate) if framework_gap_candidates register shows persistent extract.py gaps
- **Files:** parking.md, state.md, decisions.md
- **Outcome:** Living docs reflect M9 ship; 8-phase convention-rollout arc closes
- **Time:** 10 min

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Per-section coverage threshold for composite template parts (header / footer / 4 gap-candidate patterns)?
  - **Options:** A) 80% uniform / B) 60% for composites, 80% for single blocks / C) Measure per constituent block, not per template-part section
  - **Recommendation:** C
  - **Why:** Template parts and composite patterns are conceptually different from single blocks. Coverage is a per-block metric, not a per-section metric.
  - **Cost of wrong choice:** A unfairly fails composites; B sets soft targets that mask real gaps
  - **Who decides:** Bean

- **Decision:** What if Step 3 multi-section walking requires an orchestrator patch (extract.py per-section loop)?
  - **Options:** A) Patch inline, treat as Phase 7 amendment / B) Defer to Phase 7.1 plan / C) Abort Step 3, single-section only
  - **Recommendation:** A
  - **Why:** ~30 LOC patch; well-spec'd; faster than another phase boundary
  - **Cost of wrong choice:** A bloats Phase 8 if patch is bigger; B delays M9; C blocks M9
  - **Who decides:** Bean

- **Decision:** Testimonial population timing - inline during clone or post-deploy via `wp-update-block-attrs.js`?
  - **Options:** A) Inline (orchestrator reads external JSON; not yet implemented) / B) Post-deploy WP REST update / C) Lorem placeholder + follow-up parking
  - **Recommendation:** B
  - **Why:** Real reviews are captured; injection via WP REST is a clean 5-min step that doesn't require orchestrator changes
  - **Cost of wrong choice:** A is the right long-term path but adds scope; C ships with placeholders Bean dislikes
  - **Who decides:** Bean

- **Decision:** Rollback trigger threshold during deploy?
  - **Options:** A) Any 500 -> rollback / B) Visual regression above threshold 5 -> rollback / C) Bean's eyes-on PASS is the only gate
  - **Recommendation:** C
  - **Why:** Lesson 221 puts the verdict with Bean; minor issues are fixable inline
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** Step 11 surfaces a HIGH severity issue at one breakpoint that the other two pass cleanly?
  - **Recommendation:** Surface to Bean inline with screenshot evidence; let Bean decide ship-with-followup vs amend-now. Do NOT auto-dismiss as "structural noise" (the 2026-05-05 lesson).

- **Decision:** Bean's verdict is "amend section X specifically"?
  - **Recommendation:** Carry forward. M9 ships with section X amend deferred to next session. P-11-M9 RESOLVED with follow-up parking entry P-11-M9-followup-section-X.

- **Decision:** Step 3 produces partial output for a section (e.g. footer voter found pattern but extract.py returned 0 attrs)?
  - **Recommendation:** Log to framework_gap_candidates with `reason=extract-py-needs-pattern-support`. Phase 9 candidate. Continue Phase 8 deploy with whatever extract.py did return + theme-level pattern markup for the partial sections.