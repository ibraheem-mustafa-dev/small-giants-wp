---
doc_type: phase-plan
phase: 2
parent_plan: .claude/plans/2026-05-24-strategic-plan.md
plan_label: sonnet
docscore_grade: B+ (self-assessed)
generated: 2026-05-23
primary_goal: "Close every STILL-OPEN parking entry EXCEPT P-BATCH-GA-14-SKILLS (Phase 3 owns that)."
---

# Phase 2 — Parking sweep close-out

**USP:** Phase 1 closes the structural pixel-diff blockers. Phase 2 closes everything else queued in parking — small architectural debts, doc-drift residuals, the deferred follow-ups from prior sessions. Without this sweep, every future session opens with the cognitive overhead of "what's still open?" and the parking lot keeps growing.

**Plan label:** `[PLAN: sonnet]` — most entries are mechanical or well-scoped; only a few need Opus-level reasoning.

**Aggregate cost estimate:** ~6-8 hrs wall-clock across 2-3 sessions.

## Phase success criteria (done when)

- [ ] parking.md "Open" section contains ZERO entries other than P-BATCH-GA-14-SKILLS
- [ ] Every commit touching converter/pipeline passed /qc-council Stage 5
- [ ] Every commit was followed by `/sgs-clone --deploy-target page:144` with Stage 11 numbers captured (no regression beyond ±5% from Phase 1 close baseline)
- [ ] All resolved entries moved to parking.md "Resolved" section with commit SHA citations
- [ ] Any genuinely-deferred entries explicitly re-classified as Phase 3 / future-session scope (not just "still open")
- [ ] state.md reflects Phase 2 close before Phase 3 starts

## Entry context (read before starting — MANDATORY)

1. `.claude/plans/2026-05-24-strategic-plan.md` — strategic-plan parent doc
2. `.claude/plans/2026-05-24-phase-1-structural-recovery.md` — Phase 1 plan (READ REGARDLESS of completion status; if Phase 1 partially shipped, the documented edge case at Step 1.E "carry residual to Phase 2 scope" applies — Phase 2 cannot scope correctly without knowing what Phase 1 actually closed)
3. `.claude/pipeline-state-debug-artefacts-inventory.md` — diagnostic artefact map
4. `.claude/parking.md` — live state of all entries. Read the "Still open" section in full first.
5. `.claude/handoff.md` (post-Phase-1) — Phase 1 close-out numbers + residuals
6. `pipeline-state/<latest>/stage-11-pixel-diff.json` — Phase 1 close baseline (no regression beyond ±5% allowed)

## References

- blub.db rows 254 / 255 / 256 / 269 / 272 — all apply per-task
- ~/.claude/rules/time-estimates.md — estimates default LOW
- ADHD Rules 9 (negotiated decisions) + 13 (session sprawl prevention)

## Tooling Index

| Type | Name | Used in |
|---|---|---|
| skill | `/qc-inline` | per-entry verification (small entries) |
| skill | `/qc-council` | per-commit (multi-entry close OR converter/pipeline touch) |
| skill | `/sgs-clone` | After every commit touching pipeline/converter (Stage 11 auto) |
| skill | `/sgs-update` | After block.json/DB source changes |
| skill | `/dispatching-parallel-agents` | Quick-win group dispatch (e.g. 3-5 doc-only entries together) |
| skill | `/subagent-driven-development` | Medium entries with isolated file scope |
| skill | `/capture-lesson` | New rules surfacing |
| skill | `/handoff` | Per-session-close |
| agent | `wp-sgs-developer` | Big-ticket entries (P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER, P-11-M9 if still open) |
| mcp | Playwright | Live-page verifications (Customiser visual checks, deploy verifications) |
| cli | WP-CLI over SSH | sandybrown introspection |
| python | `~/.claude/hooks/wp-blocks.py dump` | Schema enumeration before any missing-X claim |

---

## Phase 2 entry inventory (snapshot 2026-05-23)

The parking entries are grouped by effort. Each entry is referenced by ID + summary; full text lives in parking.md.

### Quick wins (~10-15 min each, batch into one parallel dispatch)
- **P-SKILL-MD-LICENSING-HARD-RULE-CLEAN** — renumber Rules 2-14 after Rule 1 retirement in /sgs-clone SKILL.md
- **P-FR1-VARIATION-BUF-CONSISTENCY (residual)** — Phase 1 of architecture programme partially closed this; verify after Phase 1 ships whether the 2 sibling sites still need the append
- **P-CANARY-PAGE-131-DELETED** — small follow-up: confirm upload_and_patch.py default --target-id changed 131→144 (done in commit `700ff211`); update any remaining 131 references

### Medium effort (~30-45 min each)
- **P-G4-MEASUREMENT-DECONTAMINATION** — verify whether G4 symptoms persist post-Phase-1 (likely closed)
- **P-CLONING-PIPELINE-FLOW-DOC-DRIFT** — verify the doc updates from Wave 2B (2026-05-23 commit `88daa947`) cover the 4 drift points; close residual if any
- **P-QC-COUNCIL-FIXTURE-SMOKE-TEST** — RESOLVED 2026-05-23 (Wave A) — verify in parking and move to Resolved if not already
- **P-SUBAGENT-DRIVEN-DEV-VERIFY-LOOP-XREF** — RESOLVED 2026-05-23 — verify in parking
- **P-PHASE-5B-THEMEJSON-CONSUMPTION-PURITY** — architectural cleanup; convert inline-style consumption to theme.json native
- **P-SUBAGENT-DRIVEN-DEV-SKILLSCORE-DEBT** — 84% skillscore on /subagent-driven-development SKILL.md; /lifecycle pass needed
- **P-PHASE-5B-INERT-CUSTOMISER-OUTPUT** — already shipped per 2026-05-23 Wave A finding; mark RESOLVED in parking if not already done

### Big-ticket (~2-4 hrs each — multi-session candidates)
- **P-CLONE-PIPELINE-HEADER-FOOTER-HANDLER** — handler for header/footer template parts in cloning pipeline
- **P-11-M9** — multi-section orchestrator + live deploy. Likely partially-closed by 2026-05-23 Stage 11 wire-up; verify scope remaining
- **P-STAGE-10-DEPLOY-SILENT-PHANTOM-PAGE** — RESOLVED 2026-05-23 commit `700ff211`; verify in parking
- **P-PIXEL-DIFF-NOT-IN-ORCHESTRATOR** — RESOLVED 2026-05-23 commit `1331f23a` (Stage 11 wire-up); verify in parking
- **P-5A-CLIENT-VARIATION-CSS-PATH** — RESOLVED 2026-05-23 commit `f2fdd091`; verify in parking

### Verification-only (~30 min each)
- **P-G1-HERO-INNERBLOCKS / P-G2-PAGE-ID-SCOPE-STRIP / P-G3-STAGE-3-VISUAL-SLOT-MAPPING / P-G5-PER-BLOCK-DOM-SHAPE-FIXES / P-UNIVERSAL-EXTRACTION-RC-FIXES** — likely all closed by Phase 1 walker-pre-pass. Verify via Stage 11 numbers + leftover-buckets distribution.
- **P-WAVE-2-RESHAPE-AS-ONE-WIRING-GAP** — same; should be marked RESOLVED by Phase 1
- **P-6-MISSING-BLOCK-JSON** — 4 DB rows reference blocks with no source block.json; either create the files OR retire the DB rows
- **P-6-LUCIDE-REST-ENTRY-POINT** — WAITING on WP 7.1; verify still blocked; document in parking as WAITING (not OPEN)
- **P-WP70-REGISTER-BLOCK-VARIATION-MISSING** — WAITING on WP 7.1; verify
- **P-SESSION-B-DEFERRED-VIEW-TRANSITIONS-CLEANUP** — RESOLVED 2026-05-23 Wave A; verify

### Documentation (~10-20 min total)
- Stale doc claims surfaced in 2026-05-23 fact-check that PHASE 1 already fixes — verify they actually landed
- Any drift surfaced post-Phase-1 trace.jsonl reading (e.g. new walker behaviour not documented in cloning-pipeline-flow.md Stage 2/3/4)

---

## Execution flow

### Step 2.0 — Resume context + parking audit `[SESSION-START]`

```
Step 2.0 — Read Phase 1 close-out artefacts + audit parking.md
  Model:       inline
  Action:      Read the post-Phase-1 handoff.md + Phase 1 close numbers. Then read parking.md in full. Build a fresh list of GENUINELY-STILL-OPEN entries (some entries in the snapshot above may have moved to Resolved during Phase 1).
  Outcome:     Fresh entry list with effort tier per entry
  Time:        15 min
  Tooling:     Read
  Marker:      SESSION-START
  Cold-Entry:  This phase plan + .claude/handoff.md + .claude/parking.md
  Test: Happy: fresh list written. Edge: parking.md has 0 still-open entries (Phase 1 closed everything) → skip to Step 2.E close-out. Fail: parking.md missing → restore from git.
```

### Step 2.1 — Quick-win batch (~30 min total, ONE parallel dispatch)

```
Step 2.1 — Dispatch one Sonnet subagent with all 3 quick wins
  Model:       sonnet via /delegate
  Action:      Single subagent gets all 3 quick-win entries with full context per entry. Brief includes parking text + safety clauses + per-entry validation criterion.
  Files:       /sgs-clone SKILL.md (P-SKILL-MD-LICENSING), parking.md (P-FR1 residual + P-CANARY-PAGE-131)
  Outcome:     3 entries closed in 1 commit; parking.md updated
  Time:        30 min wall-clock
  Tooling:     /subagent-prompt + /delegate
  Marker:      (none)
  Prompt:      [cold prompt — include each entry's parking text verbatim + commit-gate per entry]
  Test:
    Happy: 3 commits OR 1 batch commit; parking entries moved
    Edge: One entry turns out to be more involved → split it off + complete the other 2
    Fail: Pre-commit hook fires → fix + recommit
```

### Step 2.2 — Verification batch (~45 min, parallel-friendly)

```
Step 2.2 — Verify each "RESOLVED 2026-05-23" parking entry actually moved
  Model:       inline OR 1 haiku subagent (mechanical grep)
  Action:      For each entry tagged as resolved during 2026-05-23 (Wave A/B1/B2 + Phase A commits), grep parking.md to confirm it's in the "Resolved" section. If still in "Open" section, move it.
  Outcome:     Parking.md cleanly partitioned; only genuine open entries remain in Open
  Time:        20 min
  Tooling:     Grep, Edit
  Marker:      (none)
  Test:
    Happy: parking.md "Open" section count drops sharply (probably half)
    Edge: An entry was tagged RESOLVED in chat but never moved in parking.md — fix
    Fail: Parking.md has corrupt formatting — surface for manual repair
```

### Step 2.3 — Medium entries (~3-4 hrs across 5-7 entries)

```
Step 2.3 — Process each medium entry per its individual brief
  Model:       per-entry — inline OR sonnet subagent depending on scope
  Action:      For EACH still-open medium entry:
                 (a) Read the parking entry text in full
                 (b) Read referenced files (cite line numbers)
                 (c) Implement the fix per the entry's stated acceptance criterion
                 (d) /qc-inline self-check per entry
                 (e) If the entry touches converter/pipeline: /qc-council BEFORE commit + /sgs-clone after commit
                 (f) Commit + move parking entry to Resolved with SHA
  Outcome:     Each medium entry either CLOSED or explicitly RE-CLASSIFIED with a reason
  Time:        ~45 min × number of medium entries
  Tooling:     per-entry tooling per parking text
  Marker:      (none — multiple steps internally)
  Test:
    Happy: each entry has commit SHA + parking moved to Resolved
    Edge: an entry turns out to depend on Phase 3 or a deeper issue — re-classify as deferred + document
    Fail: any /qc-council Stage 5 falsifies → STOP that entry; surface for Bean
```

**Cold prompt template (use for each medium entry; substitute the bracketed sections):**

```
You are dispatched 2026-05-2X for Phase 2 Step 2.3 — close parking entry <ENTRY-ID> in the SGS WordPress project.

PARKING ENTRY (verbatim — find in .claude/parking.md):
<paste the entry's full text here — quote the acceptance criterion + "Trigger" + any referenced files>

CONTEXT:
- Phase 1 of the recovery plan (2026-05-24-phase-1-structural-recovery.md) shipped <SHIPPED|partially-shipped>; the post-Phase-1 baseline pixel-diff numbers live in pipeline-state/<latest>/stage-11-pixel-diff.json
- Phase 2 acceptance gate: parking.md "Open" section contains zero entries other than P-BATCH-GA-14-SKILLS

YOUR JOB:
1. Read every file referenced in the parking entry (cite line numbers in your report)
2. Implement the fix per the entry's stated acceptance criterion
3. If your change touches converter/pipeline/SGS-block code: run /qc-council Stage 5 BEFORE commit (blub.db row 255). If docs-only, /qc-inline is sufficient.
4. After commit, if change touched the pipeline: run `python plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --mockup sites/mamas-munches/mockups/homepage/index.html --client mamas-munches --page homepage --auto-section --deploy-target page:144 --debug-trace` and verify NO regression beyond ±5% per section vs Phase 1 close baseline (read stage-11-pixel-diff.json).
5. Move the parking entry from "Open" to "Resolved" with the commit SHA cited.

METHODOLOGY GUARDRAILS (mandatory):
- blub.db row 254: read leftover-buckets.json BEFORE conjecturing
- blub.db row 255: /qc-council BEFORE any converter/pipeline/SGS-block commit
- blub.db row 256: per-section cropped pixel-diff; Stage 11 auto-captures
- blub.db row 269: NO per-block legacy patches; universal extraction primitive only
- blub.db row 272: schema enumeration via `python ~/.claude/hooks/wp-blocks.py dump` BEFORE any missing-X claim

SAFETY:
- Never `git stash` (wipes work)
- Never `git add .` or `-A` (scope by exact path)
- Never `--no-verify` on commits
- Branch discipline: this is core SGS work → commit to main
- DO NOT commit if Stage 11 numbers REGRESS beyond ±5% per section

OUTPUT:
- Commit SHA + files touched
- Parking entry RESOLVED text (one paragraph)
- Pre/post Stage 11 deltas if pipeline-touching
- Any new architectural rules surfaced (candidates for /capture-lesson)

Budget: 45 min wall-clock. If exceeded, STOP + report progress.
```

### QA Gate 2.A — Pipeline regression check after medium entries

```
QA Gate 2.A — Stage 11 numbers post Step 2.3
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Step 2.3 complete OR partial with explicit stop
  Check:   /sgs-clone --deploy-target page:144 fresh run; read stage-11-pixel-diff.json; assert NO regression beyond ±5% per section vs Phase 1 close baseline
  Pass:    All sections within ±5% (or improved); Phase 2 medium-entry batch certified
  Fail:    Regression → identify which medium-entry commit caused it; revert; re-investigate
  Marker:  QA
```

### Step 2.4 — Big-ticket entries (multi-session if scope demands)

```
Step 2.4 — Big-ticket entries (sequential, /qc-council per entry)
  Model:       wp-sgs-developer per entry + /qc-council pre-commit
  Action:      For each genuinely-still-open big-ticket entry (likely fewer than the snapshot list because many were closed by 2026-05-23 commits):
                 (a) /research-check if scope ambiguity
                 (b) Read entry context (referenced specs, prior commit history)
                 (c) Cold-prompt wp-sgs-developer with FULL parking entry text + Spec 16 §15 if relevant + Phase 1 outcomes for context
                 (d) /qc-council Stage 5 BEFORE commit
                 (e) /sgs-clone post-commit; verify Stage 11 numbers
                 (f) Move parking to Resolved with SHA
  Outcome:     Big-ticket entries closed sequentially
  Time:        2-4 hrs per entry — likely 2-3 entries left, so 6-12 hrs total. SESSION-START before each.
  Tooling:     /research-check (optional), /qc-council, Agent (wp-sgs-developer)
  Marker:      SESSION-START per entry if energy/context permits handoff between
  Test:
    Happy: entry closes within budget; pixel-diff regression-free
    Edge: entry larger than estimated → handoff + park residual for next session
    Fail: /qc-council falsifies fix-shape → re-research + re-scope
```

### QA Gate 2.B — Phase 2 close

```
QA Gate 2.B — Parking.md Open section contains only P-BATCH-GA-14-SKILLS
  Model:   inline
  Exec:    SEQUENTIAL
  Deps:    Steps 2.1-2.4 complete OR explicit-stop with documented residuals
  Check:   `grep "^\*\*P-" .claude/parking.md | grep -v "RESOLVED\|WAITING" | grep -v "P-BATCH-GA-14-SKILLS"` should return 0 entries OR a documented list of explicitly-deferred items
  Pass:    Open section = {P-BATCH-GA-14-SKILLS} OR Bean signs off on deferred entries
  Fail:    Surface remaining open entries; either close inline OR re-classify
  Marker:  QA
```

### Step 2.E — Phase 2 close handoff `[HANDOFF]`

```
Step 2.E — Phase 2 close + Phase 3 next-session prompt
  Model:       inline
  Action:      Invoke /handoff. Update state.md (current_phase → "phase-3-skill-optimisation"). Write next-session-prompt scoped to Phase 3 + blub.db row 176 reminder (gap-analysis in main conversation only).
  Files:       .claude/handoff.md, .claude/next-session-prompt.md, .claude/state.md
  Outcome:     Clean phase boundary; Phase 3 ready
  Exec:        SEQUENTIAL
  Deps:        QA Gate 2.B
  Marker:      HANDOFF
  Time:        15 min
  Tooling:     /handoff
  Cold-Entry:  .claude/plans/2026-05-24-phase-3-skill-optimisation.md
  Test: Happy: handoff regen; Phase 3 ready. Edge: Phase 2 had partial — document. Fail: /handoff stalls → manual.
```

---

## Key Judgement Calls

### Primary
- **D2A — Parallel dispatch vs sequential per entry?** 
  - Options: (A) parallel for file-independent entries; (B) strict sequential
  - Recommendation: A for quick wins + verifications; B for medium/big-ticket entries
  - Why: blub.db row 254 + 255 require sequential for converter/pipeline touches; doc-only entries are safely parallel
  - Cost of wrong choice: parallel on shared files = merge conflicts; sequential on doc-only = wasted time

### Pre-emptive
- **Pre-empt 1:** What if some "RESOLVED 2026-05-23" entries actually weren't moved in parking.md? — Step 2.2 explicitly checks this; budget for ~5 entries needing relocation.
- **Pre-empt 2:** What if Phase 1 left residuals (e.g. partial walker-pre-pass)? — Phase 2 starts with reading Phase 1 handoff. Residuals become Phase 2 first-priority scope.
- **Pre-empt 3:** What if a "big-ticket" entry turns out to depend on Phase 3 (skill optimisation)? — Re-classify as Phase 3 scope; explicitly defer with Bean sign-off. Don't force.

## Living docs to update

- `.claude/parking.md` per-entry as closed
- `.claude/state.md` current_phase
- `.claude/decisions.md` if any architectural decisions surface
- `.claude/cloning-pipeline-flow.md` if any pipeline change lands

## What success looks like

After Phase 2: parking.md "Open" section contains exactly one entry — P-BATCH-GA-14-SKILLS. Stage 11 numbers held steady vs Phase 1 close (no regression). Phase 3 starts with a clean slate.
