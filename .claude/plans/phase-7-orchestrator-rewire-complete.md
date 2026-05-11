# Phase 7 - Orchestrator Rewire (replace stages 1-2-9 hardcoded shortcuts)

**USP:** Eliminate the last 3 hardcoded shortcuts in the pipeline so /sgs-clone runs the full canonical 9-stage chain via the recogniser scripts. Pipeline integrity FIRST - Phase 8 then validates the integrated pipeline end-to-end.
**Plan label:** [PLAN: opus]
**Docscore:** pending
**Aggregate cost estimate:** ~$1.50 (Opus design pass + Sonnet subagent for the wiring; ~150 LOC delta)

**Phase success criteria (done when):**
- [ ] Stage 1 of `sgs-clone-orchestrator.py` calls per-section-convention-voter.py via subprocess; ingests structured per-section voter output
- [ ] Stage 2 calls confidence-matrix.score_candidates (importable Python) with layer-1-envelopes; ranked block matches drive matching, not hardcoded names
- [ ] Stage 9 calls leftover-bucket-router.py + writes recognition_log row + invokes simple_html_review_report.py
- [ ] Full /sgs-clone run on Mama's mockup produces composite block markup for all 9 sections; recognition_log + leftover bucket entries persist; operator-review HTML renders
- [ ] /qc-inline verifies no assumption violations
- [ ] Optional: regression test added to test_slot_filler.py covering full-pipeline-not-just-slot-filler

**Entry context:**
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (current; stages 1-2-9 hardcoded shortcuts)
- `plugins/sgs-blocks/scripts/recogniser/per-section-convention-voter.py`
- `plugins/sgs-blocks/scripts/recogniser/confidence-matrix.py` (importable score_candidates)
- `plugins/sgs-blocks/scripts/recogniser/leftover-bucket-router.py`
- `plugins/sgs-blocks/scripts/recogniser/simple_html_review_report.py`
- `plugins/sgs-blocks/scripts/fingerprint-builder/output/layer-1-envelopes.json`
- `~/.agents/skills/ui-ux-pro-max/scripts/ui-ux-pro-max.db` recognition_log table

**References:**
- Phase 6 - Mama's mockup is now SGS-BEM-conforming + visual diff confirmed
- Spec 12 (rewritten 2026-05-09) - canonical 9-stage architecture
- Phase 4 batch B5 - /sgs-clone body now mentions Stage 0 gate

**Tooling Index:**
| Type | Name | Used in |
|---|---|---|
| inline | Edit | Steps 1-3, 5 |
| skill | /subagent-prompt | Step 4 (write the wiring subagent prompt) |
| agent | sonnet (single subagent) | Step 4 (do the wiring) |
| cli | pytest | Step 6 |
| skill | /qc-inline | Step 7 |

---

## Steps

### Step 1 - Read current Stage 1, 2, 9 code in orchestrator + map exact replacement
- **Model:** inline
- **Action:** Read `sgs-clone-orchestrator.py` Stage 1 (regex grep + DEFAULT_SECTION_MAP), Stage 2 (hardcoded block_name with confidence 0.95), Stage 9 (thin inline HTML report). For each, identify exact line range to replace + the new subprocess call shape.
- **Files:** `.claude/scratch/phase-8-rewire-spec-2026-05-10.md` (transient)
- **Inputs:** orchestrator source
- **Outcome:** Detailed rewire spec: which lines to replace, what the new code should call, what data shape is exchanged
- **Exec:** SEQUENTIAL
- **Deps:** Phase 6 complete (mockup migration done, mockup is SGS-BEM-conforming)
- **Marker:** SESSION-START
- **Time:** 20 min
- **Tooling:** Read + Write
- **On-Fail:** If line numbers shift between read and write (concurrent edit), re-read at edit time
- **Cold-Entry:** This file + plan.md + Phase 7 outcomes + orchestrator source
- **Test:**
  - Happy: spec covers all 3 stages with exact line ranges + replacement shapes
  - Edge: stage 9 is split across multiple functions → spec captures all
  - Fail: spec ambiguous → re-read with deeper detail
  - Integration: Steps 4-5 consume this

### Step 2 - Read I/O contracts of recogniser scripts being wired in
- **Model:** inline
- **Action:** Read per-section-convention-voter.py (CLI signature + JSON output schema), confidence-matrix.py (importable score_candidates signature), leftover-bucket-router.py (CLI), simple_html_review_report.py (CLI). Verify each has the I/O contract that the rewire spec assumes.
- **Files:** scratch additions to phase-8-rewire-spec-2026-05-10.md
- **Inputs:** recogniser scripts
- **Outcome:** Each script's I/O documented; mismatches with rewire-spec flagged
- **Exec:** SEQUENTIAL
- **Deps:** Step 1 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** Read
- **On-Fail:** If a script's I/O contract is unclear, run it on a sample input to discover
- **Test:**
  - Happy: all 4 scripts have clear contracts; no mismatch with rewire spec
  - Edge: per-section-convention-voter expects HTML on stdin or file path → spec accommodates
  - Fail: contract mismatch → revise rewire spec OR patch the recogniser script's CLI (in scope of this phase)
  - Integration: feeds Step 4

### Step 3 - Update recognition_log table schema if needed
- **Model:** inline
- **Action:** Verify recognition_log table in uimax has columns (section_id, run_id, block_match, confidence, leftover_bucket, leftover_count, timestamp). If missing columns, ALTER + regenerate-csvs.
- **Files:** uimax DB if schema needs change
- **Inputs:** recognition_log current schema
- **Outcome:** Schema supports Stage 9 INSERTs; CSV mirror present
- **Exec:** SEQUENTIAL
- **Deps:** Step 2 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** sqlite3 + uimax_write.py + update-db.py regenerate-csvs
- **On-Fail:** If schema migration unwise this late, defer Stage 9 INSERT to a no-op stub + parking entry
- **Test:**
  - Happy: schema sufficient
  - Edge: recognition_log dropped in Phase 2 → recreate (ALTER won't work; CREATE TABLE)
  - Fail: lock contention → unlock + retry
  - Integration: Stage 9 INSERT path is operational

---

## QA Gate - Rewire spec complete + recogniser contracts verified
- **Model:** haiku
- **Exec:** SEQUENTIAL
- **Deps:** Steps 1-3 complete
- **Check:** scratch file exists; all 4 recogniser contracts documented; recognition_log schema query confirms columns
- **Pass:** All present
- **Fail:** Re-run failing step
- **Marker:** QA

---

### Step 4 - Dispatch single Sonnet subagent for wiring
- **Model:** sonnet (1 subagent - single-file edit, narrow scope)
- **Action:** Dispatch a Sonnet subagent with the rewire spec from Steps 1-2. Subagent: replaces Stage 1 with subprocess to per-section-convention-voter; replaces Stage 2 with import of confidence-matrix.score_candidates + layer-1-envelopes load; replaces Stage 9 with leftover-bucket-router subprocess + recognition_log INSERT (via uimax_write.py) + simple_html_review_report subprocess. Maintains existing JSON-artefact contract.
- **Files:** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py` (~150 LOC delta)
- **Inputs:** rewire spec + Step 1-2 contracts + cold prompt template
- **Outcome:** Subagent returns diff; orchestrator now wires through recogniser chain
- **Exec:** SEQUENTIAL
- **Deps:** QA gate passed
- **Marker:** (none)
- **Time:** 30-45 min wall-clock (subagent + verification)
- **Tooling:** /subagent-prompt + Sonnet via /delegate
- **On-Fail:** If subagent returns >200 LOC delta or significantly modifies non-Stage-1/2/9 code, hard-reject + re-prompt with stricter scope. Do not allow inline rewrite of additional stages.
- **Prompt:** (pre-written by /subagent-prompt - includes rewire spec, exact line ranges, recogniser contracts, scope-creep prohibition, no-em-dash, lesson 215 reminder)
- **Test:**
  - Happy: subagent returns clean diff; orchestrator imports/subprocess calls correct
  - Edge: subagent's diff includes a small refactor of an adjacent helper → acceptable if minimal
  - Fail: subagent returns hero-hardcoded fallback or rewrites slot-filler → reject hard
  - Integration: Step 5 verifies

### Step 5 - Inline review + minimal cleanup of subagent diff
- **Model:** inline
- **Action:** Read the diff. Spot-check each replaced stage. Confirm no scope creep, no em-dashes, no removed imports. If clean, accept. If issues, edit inline.
- **Files:** `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`
- **Inputs:** Step 4 subagent diff
- **Outcome:** Orchestrator rewire approved + applied
- **Exec:** SEQUENTIAL
- **Deps:** Step 4 complete
- **Marker:** (none)
- **Time:** 15 min
- **Tooling:** Read + Edit
- **On-Fail:** Reject diff entirely + re-dispatch with sharper prompt (max 1 retry)
- **Test:**
  - Happy: clean diff; minimal scope; rewire correct
  - Edge: scope creep → trim or reject
  - Fail: 2nd reject → escalate to Bean for inline manual rewire
  - Integration: Step 6 validates

### Step 6 - Run full /sgs-clone on Mama's mockup; sanity-check output shape
- **Model:** inline
- **Action:** `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --auto-section`. Capture composite block markup. Sanity-check: every section produces non-empty filled_slots; recognition_log INSERTs landed; leftover-bucket-router routed; operator-review HTML rendered.
- **Files:** `pipeline-state/<run_id>/composite-markup.json`, `composite-review.html`
- **Inputs:** post-rewire orchestrator + Mama's mockup
- **Outcome:** Composite markup is non-empty for all 9 sections; recognition_log + leftover bucket entries persisted; operator-review HTML present. NO judgement on parity quality - Phase 8 owns that.
- **Exec:** SEQUENTIAL
- **Deps:** Step 5 complete
- **Marker:** (none)
- **Time:** 10 min
- **Tooling:** orchestrator CLI + diff
- **On-Fail:** If composite markup has fewer filled slots than Phase 7, the rewire broke a stage. Back-trace.
- **Test:**
  - Happy: composite markup matches Phase 7 quality + new recognition_log + leftover entries
  - Edge: small slot count delta (e.g. 1-2 attrs different) → acceptable if explainable
  - Fail: regression → revert orchestrator + re-dispatch
  - Integration: feeds Step 7

### Step 7 - /qc-inline + add regression test (optional)
- **Model:** inline
- **Action:** Run /qc-inline on the orchestrator rewire diff + composite output. Optional: add a pytest in test_slot_filler.py that runs the FULL orchestrator (not just slot-filler) on the hero section, asserts the composite markup matches a baseline snapshot.
- **Files:** orchestrator (no change); test_slot_filler.py (optional new test); fixtures/hero-orchestrator-baseline.json (optional new snapshot)
- **Inputs:** Step 6 outputs
- **Outcome:** /qc-inline clean; regression test (if added) passes
- **Exec:** SEQUENTIAL
- **Deps:** Step 6 complete
- **Marker:** HANDOFF
- **Time:** 15-25 min
- **Tooling:** /qc-inline + Edit (for optional test)
- **On-Fail:** If /qc-inline flags assumptions, resolve before claiming Phase 8 done
- **Test:**
  - Happy: clean qc + optional test green
  - Edge: small assumption flag → resolve inline
  - Fail: structural issue → escalate
  - Integration: closes Phase 7 cleanly; Phase 8 (validation + deploy) can run

---

## Key Judgement Calls

### Primary decisions

- **Decision:** Should Stage 9 INSERT into recognition_log fail soft (log + continue) or hard (halt run)?
  - **Options:** A) Soft (log warning, continue to operator-review HTML) / B) Hard (DB unavailable means run failed) / C) Configurable via flag
  - **Recommendation:** A
  - **Why:** recognition_log is a learning surface, not a runtime gate; DB unavailability shouldn't block a clone that otherwise succeeded
  - **Cost of wrong choice:** A loses learning data when DB is down; B prevents legitimate clone delivery
  - **Who decides:** Bean

- **Decision:** Should the recogniser-chain orchestration be its own script (separate from sgs-clone-orchestrator.py) or stay inline?
  - **Options:** A) Inline (current; just modify the 3 stages) / B) Extract `recogniser-chain.py` as a separate orchestrator-of-recognisers / C) Defer extraction to parking
  - **Recommendation:** A for now, C for future
  - **Why:** A delivers M9 fastest; B is cleaner architecture but adds scope. Worth a parking entry for the refactor.
  - **Cost of wrong choice:** A bloats orchestrator; B delays M9
  - **Who decides:** Bean

### Pre-emptive decisions

- **Decision:** What if confidence-matrix.score_candidates returns multiple high-confidence matches (score within 0.5)?
  - **Recommendation:** Use the existing tie-breakers per confidence-matrix's docstring (internal element presence count, child node count, parent context). Already encoded in the script; orchestrator just consumes the top result.

- **Decision:** What if per-section-convention-voter scores all sections low confidence (uncommon for SGS-BEM-conformant drafts but possible)?
  - **Recommendation:** Stage 1 falls back to DEFAULT_SECTION_MAP for that section; logs the fallback in recognition_log; doesn't halt the run. The fallback path is the legacy regex grep - stays in code as fallback, not as primary.