---
plan_id: spec44-completion
phase_name: "Spec 44 — Close every remaining item"
project: small-giants-wp
docscore_grade: A (100.0%)
---

# Phase — Spec 44 (Classless Repeater Recognition) completion

**USP:** Spec 44 is the last thing standing between "the pipeline recognises structure it's
already built for" and "we've actually watched it do that on a real client, live." Every other
piece of the classless-recognition programme (Spec 45's four tiers, the structural-facts trio,
the trust gate) is built and tested — this phase is what turns "built" into "proven", and
closes the front for good.

**Plan label:** [PLAN: sonnet] — settled design throughout (this is finishing named gaps in an
already-built system, not new architecture); no step needs Opus-level ambiguity resolution.

**Docscore:** A (100.0%), scored under the `phase-plan` template. This plan stays at `plans/`
until it ships, then moves to `plans/archive/` and re-scores under the `archived-plan` template.

**Aggregate cost estimate:** ~9 subagent dispatches (5 Sonnet, 2 Haiku, 2 Sonnet-QA), roughly
180K input / 60K output tokens total across all dispatches — cheap; every step reuses existing
code/tests rather than building from scratch. No live-inference cost beyond normal Claude Code
session use (no external API calls — Item 5's "AI fallback" question is scoped as a KJC, not a
build task, so no Anthropic-API spend is incurred by this phase itself).

**Phase success criteria (done when):**
- [ ] `array_item_schema.role` population rate + the "N of M groups narrowed" figure are
      re-measured against real current data and written to a file (not conversation-derived)
- [ ] A per-group vs per-member consistency check for Stage B is designed, validated via
      `/qc-council` against a measured baseline, and built if validated
- [ ] Spec 44's full pipeline (Stage A + Stage B + trust gate) has been run against
      `Frame Card.dc.html` (a second, independently-generated draft) with results recorded
- [ ] The `items`/`thumbs` → wrong `sgs/info-box` alias bug is root-caused and fixed; Tier A's
      real integration question (third Stage B signal vs superseded) is answered with a
      measurement, not an assumption
- [ ] `sgs/brand-strip`'s "count" field (e.g. "12 frames") has a decided, built resolution —
      dropped with an honest skip-reason, or a new attribute — no longer an open question
- [ ] A real client draft has been run through the gated pipeline with BOTH
      `--classless-match` and `--classless-auto-complete` flags ON, producing real completions
      or honest review-queue entries, with the audit log / `operator-review.html` / end-of-run
      summary all confirmed firing, and the existing BEM-path baseline confirmed unaffected
- [ ] `decisions.md` carries a D-numbered entry for every decision made in this phase;
      `LEDGER.md`'s Front C section is updated to reflect the closed front (or the specific
      residual, if one genuinely remains)

## Pre-conditions

Must be true before Step 1 runs:
- `main` is clean and pushed — `git status --short` empty, `git log origin/main -1` matches
  local HEAD. This phase starts from a known-good tree, not on top of uncommitted work.
- Both rollout flags still read `default=False` in `sgs-clone-orchestrator.py` — re-confirm
  with `grep -n "classless_match\|classless_auto_complete" plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py`.
  If either has flipped to `True` since this plan was written, STOP — that changes Wave 3's risk
  profile and needs a fresh look before Step 8 runs.
- The existing 83-test baseline passes clean:
  `cd plugins/sgs-blocks/scripts/recogniser && python -m pytest test_render_repeater_recogniser.py test_array_schema_eliminator.py test_render_repeater_seeder.py test_classless_trust_gate.py -q`
  — if this doesn't pass BEFORE this phase starts, fix that first; this phase's own QA gates
  assume a clean starting baseline to measure against.
- `Frame Card.dc.html` still exists at its recorded path and still contains `<sc-for>` markup
  (`grep -c "sc-for" "sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html"`
  — confirmed 2 at plan-write time; if it's since been edited/moved, Step 3's expectations need
  re-checking).

**Entry context (read before starting):**
- `.claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md` — full spec; §4 Stage A, §5 Stage B
  (especially §5.0's re-verification ask and §5.3's brand-strip finding), §9 build sequencing,
  §10 test plan, §11 deferred items (the source of this whole register)
- `.claude/decisions.md` D1071/D1073/D1074/D1075/D1077/D1078/D1081/D1084/D1088-D1100 — the full
  Spec 44/45 build trail; D1074 specifically for why per-group-vs-per-member matters (it's what
  killed v2.0.0 round 2); the D1090-area entry (~line 1080-1093) for the Tier A alias-bug detail
- `.claude/LEDGER.md` — Front C section, current status
- `plugins/sgs-blocks/scripts/recogniser/` — `classless_trust_gate.py`,
  `render_repeater_recogniser.py`, `array_schema_eliminator.py`, `render_repeater_seeder.py`,
  `classless_field_resolver.py`, `dom_shape_classifier.py`, `sc_var_classifier.py` + their test
  files (83 tests currently passing across the four Stage A/B/trust-gate modules)
- `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py::classless_match` /
  `::classless_auto_complete` (both `default=False` today — confirmed live 2026-09-17)
- `sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html` — the untested
  second draft (confirmed exists, 2026-09-17)

**References:**
- `plugins/sgs-blocks/src/blocks/brand-strip/block.json` — confirmed live 2026-09-17: zero
  attrs containing "count" today; the field genuinely doesn't exist yet
- `sgs-db.py sql "SELECT COUNT(*), SUM(CASE WHEN role IS NOT NULL AND role!='' THEN 1 ELSE 0 END) FROM array_item_schema"` —
  confirmed live 2026-09-17: **25 of 90** rows carry a role (the spec's own "25 of 84" figure is
  itself stale by 6 rows — re-verify at execution time, don't trust either cached number)
- Correction ledger: no phase-planner-specific entries collide with this scope

**Tooling Index (used across this phase):**
| Type | Name | Used in |
|------|------|---------|
| skill | /delegate | every dispatched step |
| skill | /subagent-prompt | steps 2, 3, 4, 5, 6, 8 |
| skill | /sgs-db + /wp-blocks | steps 2, 7 (schema truth, R-31-8 discipline) |
| skill | /systematic-debugging | step 5 |
| skill | /qc-council | step 4 (validates the consistency-check fix-shape before build) |
| skill | /sgs-wp-engine | step 7 (brand-strip block edit) |
| skill | /verify-loop | step 9 (2-attestation on the live-run claim) |
| skill | /dispatching-parallel-agents | Wave 1 dispatch, Hidden Decisions pass |
| cli | pytest | steps 3, 5, 6, 8 |
| cli | git | every step (path-scoped commit + push after each) |
| hook | handoff-preflight.py | before any HANDOFF marker |

---

## Wave 1 — parallel, independent (no shared files, no shared state)

Step 1 — Re-verify Stage B's data foundation
  Model:       sonnet
  Action:      Query `array_item_schema` for the real current role-population rate (row count,
               rows-with-role, distinct blocks with any coverage) via `/sgs-db`. Separately,
               re-run Spec 44's own narrowing measurement against the real Eye Care Birmingham
               fixture (§5.1's "6 of 8 groups" claim) and write BOTH figures to a new file —
               `.claude/reports/2026-09-1X-spec44-stage-b-data-verification.md` — with the exact
               SQL/command used, not just the resulting numbers. Decide (state explicitly, don't
               imply): does Stage B need a seeding push before being relied on, yes or no, and why.
  Files:       .claude/reports/2026-09-1X-spec44-stage-b-data-verification.md (new)
  Inputs:      Spec 44 §5.0/§5.1; sgs-framework.db `array_item_schema` table
  Outcome:     A committed report file with sourced figures + an explicit seeding-push decision;
               Spec 44 §5.0/§5.1 updated to point at it instead of "measured this session"/
               "reportedly" language
  Exec:        PARALLEL with steps 2, 3, 5, 6
  Deps:        none
  Marker:      SESSION-START
  Time:        20 min
  Tooling:     /sgs-db, /wp-blocks schema dump, /sgs-wp-engine's GROUND-TRUTH discipline (R-31-8)
  On-Fail:     If the DB query tooling is unavailable, fall back to `sqlite3` read-only against
               `~/.claude/skills/sgs-wp-engine/sgs-framework.db` directly (documented convention
               in project CLAUDE.md) — do not guess the figures from memory.
  Cold-Entry:  .claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md §5.0/§5.1; CLAUDE.md's
               "DB-first, no hardcoded dicts" section for the query convention
  Prompt: |
    Re-verify two figures from Spec 44 §5.0/§5.1 against real current data — both are flagged
    in the spec as unverified/conversation-derived and must not be trusted as-is.

    1. Query sgs-framework.db's `array_item_schema` table for: total row count, rows where
       `role IS NOT NULL AND role != ''`, and the count of distinct `block_slug` values with
       ANY row in the table at all (compare against the total live block count from
       `/wp-blocks dump`). Use `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..."`
       — read-only, do not write anything to the DB.

    2. Re-run Spec 44's own group-narrowing measurement against the real Eye Care Birmingham
       draft (sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html)
       using the existing recogniser modules in plugins/sgs-blocks/scripts/recogniser/ (read
       render_repeater_recogniser.py and array_schema_eliminator.py to understand the existing
       measurement approach — measure-classless-baseline.py in the same directory is the
       existing baseline script and may be reusable or adaptable). State the real denominator
       (how many distinct repeated groups exist in the draft) and how many Stage B narrows to
       exactly one confident candidate.

    Write both results, with the exact command/query used for each, to a new file:
    .claude/reports/2026-09-1X-spec44-stage-b-data-verification.md (use today's real date).
    End the report with an explicit yes/no decision: does Stage B need a seeding push (more
    array_item_schema.role coverage) before FR-44-1 auto-completion is relied on for real, and
    why — cite the numbers, don't assert without them.

    Do NOT edit any code. Do NOT edit the spec file yourself — report back what you found so the
    main session can update Spec 44 §5.0/§5.1 with a pointer to your report.

    Return: the report file path, the two headline figures, and your seeding-push recommendation
    in 3-5 sentences.

Step 2 — Design + validate the per-group/per-member consistency check (Stage B)
  Model:       sonnet
  Action:      This is a fix-shape proposal, not a settled design — Spec 44 §11 names the gap
               (a systematic error repeating identically across every group member currently
               still passes an "exact structural match") but no fix-shape exists yet. Invoke
               `/qc-council` in fix-shape mode: propose 1-2 concrete mechanisms (e.g. a
               per-member field-value diff pass after Stage A's structural match succeeds,
               flagging when every member shares an identical VALUE for a field Stage A treated
               as "matched" but didn't itself check for content-level correctness), measure each
               against a real baseline (does the current pipeline actually miss this case on a
               real or synthetic fixture?), and only proceed to build the validated one.
  Files:       plugins/sgs-blocks/scripts/recogniser/render_repeater_recogniser.py,
               plugins/sgs-blocks/scripts/recogniser/test_render_repeater_recogniser.py
  Inputs:      Spec 44 §3.1, §11; D1074's round-2 failure trail (why this matters); step 1's
               report (Stage B's real data foundation, for context on how much this can even bite)
  Outcome:     Either a built, tested fix (new function + passing negative-control test proving
               a fixture WOULD have wrongly auto-completed before the fix and correctly falls to
               review after it) or a `/qc-council` verdict of "unverifiable"/"diagnosis wrong"
               recorded in a report — either is a valid, honest outcome; a built-but-unvalidated
               fix is not
  Exec:        PARALLEL with steps 1, 3, 5, 6
  Deps:        none
  Marker:      (none)
  Time:        45 min
  Tooling:     /qc-council (Stage 0-5: ground truth load, personas, empirical validation hard
               gate), /delegate for the council's own rater routing, pytest
  On-Fail:     If `/qc-council` returns "unverifiable" (no fixture can demonstrate the gap),
               record that finding in Spec 44 §11 as "investigated, not currently demonstrable"
               rather than leaving it silently unresolved — do not force a build with no proof
               it fixes anything.
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    Run `/qc-council` on this fix-shape question from Spec 44 §11 / §3.1:

    "A systematic error that affects every member of a repeated group IDENTICALLY currently
    still passes Stage A's 'exact structural match' auto-complete gate (FR-44-1 clause a) — this
    is the exact failure mode that caused D1074's round-2 (v2.0.0) to be reverted, and it is
    still an open, undesigned gap today."

    Ground truth to load first (Stage 1 of the council): read
    plugins/sgs-blocks/scripts/recogniser/render_repeater_recogniser.py in full (the Stage A
    matcher), its test file, and Spec 44 §3.1 ("What 'exact structural match' means, and why
    parent-narrowing comes first") and §11.

    Propose 1-2 concrete fix-shapes (e.g.: after Stage A's structural match succeeds for a
    group, add a per-member content-value diff — if every member's matched field carries the
    exact same literal value where the draft's real DOM shows different content per member,
    that's evidence the "match" is actually a mis-projection, not real per-item data — flag for
    review instead of auto-completing). For each proposal, follow the council's mandatory
    empirical-validation gate: can you construct or find a real/synthetic fixture that
    demonstrates the CURRENT pipeline wrongly treats this case as an exact match? Measure it. Do
    not proceed to a build recommendation without that measurement.

    If a fix-shape validates, build it (new function in render_repeater_recogniser.py + a
    negative-control test in test_render_repeater_recogniser.py proving the specific gap is now
    caught) and run the full existing test suite to confirm no regression (pytest
    test_render_repeater_recogniser.py — expect all existing tests plus your new one to pass).

    If nothing validates, do NOT build anything — write your findings (what you tried, what the
    baseline measurement showed) to
    .claude/reports/2026-09-1X-spec44-consistency-check-qc-council.md instead.

    Return: the council verdict, what (if anything) was built, and the full pytest output.

Step 3 — Run Spec 44's full pipeline against a second draft
  Model:       sonnet
  Action:      Run Stage A + Stage B + the trust gate against `Frame Card.dc.html` (confirmed
               to exist, never previously tested — every prior run used only Eye Care
               Birmingham). ⚠ CONFIRMED (Hidden Decisions pass, sonnet-reviewer, verified against
               the real script before this instruction was written): `measure-classless-baseline.py`
               is NOT read-only — it calls `recognise_classless_group(...,
               auto_complete_enabled=True, conn=conn)` then `gate.append_decision(decision)`,
               writing REAL rows to the git-tracked audit log
               (`classless-recognition-log.jsonl`), under a hardcoded `CLIENT_SLUG =
               "eye-care-ward-end"`. Running it unmodified against Frame Card would write real
               precedent under the SAME client slug as the existing Eye Care Birmingham
               precedent — risking Frame Card itself tripping FR-44-1(b)'s same-client
               second-occurrence auto-complete clause for real, contaminating the precedent
               history Step 8's live run depends on being clean. **Do not run the script
               unmodified.** Either (a) point it at an isolated/throwaway audit-log path for
               this measurement only (confirm `classless_trust_gate.py`'s `append_decision`/log
               path accepts an override), or (b) use a distinct `CLIENT_SLUG` (e.g.
               `"eye-care-ward-end-frame-card-test"`) so this measurement can never satisfy a
               real second-occurrence clause. Read `classless_trust_gate.py`'s audit-log
               mechanism first to pick the cleaner option — do not guess.
  Files:       sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html (read
               only), plugins/sgs-blocks/scripts/recogniser/measure-classless-baseline.py (read,
               extend with an isolated-log or isolated-client-slug parameter — never run it
               unmodified against a second draft in the same client directory)
  Inputs:      D1074's own recommendation (test against a second, independently-generated
               draft); the existing baseline script's approach (D1094)
  Outcome:     A report recording: group count, auto-complete count, review count, no-match
               count for Frame Card.dc.html — structured the same way as D1094's Eye Care
               figures, so the two are directly comparable. Note: confirmed live 2026-09-17
               (`grep -c "sc-for"` returns 2) — expect a thin sample, likely 1 repeater group,
               not a rich multi-group draft like Eye Care's 39; a small proof of generalisation
               is still the correct, honest outcome here, not a sign the step failed
  Exec:        PARALLEL with steps 1, 2, 5, 6
  Deps:        none
  Marker:      (none)
  Time:        25 min
  Tooling:     the existing recogniser pipeline modules, pytest (if any new fixture tests are
               warranted)
  On-Fail:     If `measure-classless-baseline.py` is hardcoded to the Eye Care path in a way
               that resists parameterisation cleanly, extend it with a `--draft` CLI arg rather
               than duplicating the script — this project's own code-quality rule bans
               unnecessary duplication. If the audit-log/client-slug isolation (see Action
               above) can't be cleanly retrofitted onto the existing script without risking its
               own correctness, a small standalone read-only measurement IS the right call here
               — duplication is the lesser risk against writing real contaminated precedent rows.
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    Run Spec 44's classless-recognition measurement against a SECOND draft that has never been
    tested: sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html
    (confirmed to exist).

    ⚠ READ THIS BEFORE RUNNING ANYTHING. `measure-classless-baseline.py` is NOT read-only —
    verified live: it calls `recognise_classless_group(..., auto_complete_enabled=True,
    conn=conn)` then `gate.append_decision(decision)`, writing REAL rows to the git-tracked
    audit log (`classless-recognition-log.jsonl`), under a hardcoded `CLIENT_SLUG =
    "eye-care-ward-end"`. Frame Card.dc.html sits in the SAME client directory as Eye Care
    Birmingham. If you run the script unmodified, Frame Card's groups get written under the
    IDENTICAL client slug as the existing Eye Care precedent — which could trip FR-44-1(b)'s
    same-client second-occurrence auto-complete clause for real, contaminating the precedent
    history this phase's later live-flagged run (Step 8 of the plan) depends on being clean.

    Read `classless_trust_gate.py`'s audit-log mechanism (`append_decision`, `pattern_precedent`,
    the log file path) first. Then pick ONE of: (a) point this measurement at an
    isolated/throwaway audit-log file instead of the real one, or (b) run it under a distinct
    `client_slug` (e.g. `"eye-care-ward-end-frame-card-test"`) so it can never satisfy a real
    second-occurrence check against the real Eye Care client's history. Do not guess which is
    cleaner — the mechanism's own code will make it obvious which override point exists.

    Read plugins/sgs-blocks/scripts/recogniser/measure-classless-baseline.py in full — it
    already implements the real Stage A -> Stage B -> trust-gate pipeline measurement for the
    Eye Care Birmingham draft (used for D1094's baseline: 39 groups, 0 auto-completed, 2 review,
    37 no-match). Extend it with a draft-path parameter AND the isolation fix above (don't
    duplicate the script — this project bans unnecessary duplication; do isolate the audit-log
    write path, that's not duplication, it's correctness).

    Run it against Frame Card.dc.html and record: total repeated-group count, auto-completed
    count, review-queue count, no-match count — in the same shape as the Eye Care figures so
    the two drafts are directly comparable. Write the result to a report file
    (.claude/reports/2026-09-1X-spec44-frame-card-second-draft-measurement.md) and note any
    STRUCTURAL differences you observe between how the two drafts' groups resolve (e.g. does
    Frame Card have any groups the Eye Care draft's shape never exercised — a different block,
    a different nesting depth) — that's the real point of testing a second, independently-
    generated draft: proving the design generalises, not just re-confirming the first result.

    Return: the report path and the four headline figures.

Step 4 — Root-cause the Tier A alias bug
  Model:       sonnet
  Action:      Invoke `/systematic-debugging` on the known `items`/`thumbs` → wrong
               `sgs/info-box` alias resolution bug in `sc_var_classifier.py` (flagged, not
               fixed, per decisions.md ~line 1090: "the implementer correctly judged this needs
               real DB investigation before a confident fix, not a guess"). Find the real cause
               against `slots.aliases` DB data, not a guessed regex fix.
  Files:       plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py,
               plugins/sgs-blocks/scripts/recogniser/test_sc_var_classifier.py (create if absent)
  Inputs:      decisions.md's Tier A hit-rate measurement (0 of 35 correct, 2 resolve-but-wrong,
               the fabricated-docstring correction already landed in `372ed8ce1`); `slots.aliases`
               DB table
  Outcome:     A proven root cause (DB-verified, not guessed) + a fix + a regression test proving
               `items`/`thumbs` no longer resolve to `sgs/info-box` incorrectly
  Exec:        PARALLEL with steps 1, 2, 3, 6
  Deps:        none
  Marker:      (none)
  Time:        30 min
  Tooling:     /systematic-debugging (root-cause gate), /sgs-db (query `slots.aliases`), pytest
  On-Fail:     If the DB investigation shows the alias table itself is the source of truth and
               is simply wrong (not a code bug), fix the DATA (via `/sgs-update` or a direct,
               documented DB correction) rather than papering over it with a code-side
               exception — matches this project's DB-first rule (R-31-1).
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    Root-cause a known, disclosed-but-unfixed bug: in
    plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py, the aliases `items`/`thumbs`
    resolve to `sgs/info-box`, which is wrong (per decisions.md, ~line 1090 area: "the
    implementer correctly judged this needs real DB investigation before a confident fix").

    Use `/systematic-debugging`'s protocol: read the actual evidence first. Query the
    `slots.aliases` table (via `/sgs-db`) for every row involving `items`/`thumbs` as an alias
    key. Read sc_var_classifier.py's resolution logic in full to see exactly how it picks a
    slug from the alias table. Determine: is this a CODE bug (the classifier picks the wrong row
    when multiple candidates exist) or a DATA bug (the DB row itself is wrong)? Do not guess —
    cite the specific row(s)/logic that produces the wrong answer.

    Fix at the layer the root cause actually lives in. If it's a code bug, fix the resolution
    logic. If it's a data bug, fix it via the project's documented DB-correction path (check
    CLAUDE.md's DB-first section) rather than adding a code-side special case for these two
    words specifically (that would be a hardcoded carve-out, banned by this project's R-31-9
    universal-mechanism rule).

    Add or extend test_sc_var_classifier.py with a regression test proving `items`/`thumbs` now
    resolve correctly (or explicitly fail closed / fall through, if no correct single answer
    exists — never a guessed wrong answer). Run the full existing sc_var_classifier test suite
    to confirm no regression.

    Return: the root cause (one sentence, with the DB query or code line that proves it), what
    was fixed and where, and the full pytest output.

Step 5 — Decide + build sgs/brand-strip's "count" field
  Model:       sonnet
  Action:      Confirmed live (2026-09-17): `sgs/brand-strip`'s block.json has zero attrs
               containing "count" today — the §5.3 finding is real, not stale. Decide: drop the
               field type with an honest skip-reason recorded in the classless pipeline's
               skip-reason vocabulary, OR add a small new `count`-shaped attribute (e.g.
               `itemCountLabel` per-item text) to the block. Recommendation for whoever executes
               this step: build the attribute — it's a small, real, generically useful addition
               (a "12 frames"-style count label is not Eye-Care-specific) rather than a
               dropped-field workaround, but this is a KJC (see below) for the human to confirm
               before committing to the larger option.
  Files:       plugins/sgs-blocks/src/blocks/brand-strip/block.json,
               plugins/sgs-blocks/src/blocks/brand-strip/edit.js,
               plugins/sgs-blocks/src/blocks/brand-strip/render.php (if the attribute path is
               chosen)
  Inputs:      Spec 44 §5.3; live block.json read (2026-09-17, confirmed no count attr exists)
  Outcome:     Either a shipped, deployed new attribute (block-editor control + render.php
               output + `npm run build` clean + `check-dead-controls.js` passing) or a
               documented skip-reason decision recorded in the pipeline's skip vocabulary — not
               left as an open question
  Exec:        PARALLEL with steps 1, 2, 3, 4
  Deps:        none — but see KJC below; this step's OUTCOME depends on the KJC's answer, so
               confirm the KJC decision (drop vs build) before or during this step, not after
  Marker:      (none)
  Time:        30 min (build path) / 10 min (skip-reason path)
  Tooling:     /sgs-wp-engine (GROUND-TRUTH discipline + block build), /sgs-db (confirm no
               existing count-shaped attr elsewhere in the framework to reuse as precedent —
               R-31-8 schema-enumeration-before-"missing X")
  On-Fail:     If a `npm run build` or `check-dead-controls.js` failure blocks the build path,
               fall back to the skip-reason path for this session and leave the attribute build
               as a follow-up — do not let this block Wave 2/3.
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    Resolve Spec 44 §5.3's open item: `sgs/brand-strip`'s "count" field (e.g. "12 frames" text
    next to a brand/logo entry) has no matching attribute. Confirmed live 2026-09-17 — zero
    attrs containing "count" in plugins/sgs-blocks/src/blocks/brand-strip/block.json.

    First, per this project's GROUND-TRUTH discipline: query
    `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name
    FROM block_attributes WHERE attr_name LIKE '%count%' OR attr_name LIKE '%label%'"` to check
    whether any other block already has a similar per-item count/label pattern you should match
    (Spec 44's own R-31-8 rule: never assume "missing" without checking existing precedent
    first).

    Decision (confirm with the KJC recorded in the phase plan before committing — default
    recommendation is BUILD, not drop): add a small new per-item attribute to `sgs/brand-strip`
    (e.g. `itemCountLabel`, a per-logo optional text string) following this block's existing
    per-item attribute pattern (read block.json's `logos[]` shape first). Wire it through
    edit.js's per-item controls and render.php's output. Run `npm run build` clean and
    `node scripts/check-dead-controls.js --check` to confirm no dead-control violation.

    If BUILD is not confirmed (KJC says drop instead), record the skip-reason in whatever
    vocabulary the classless pipeline's skip-reason system already uses (read
    classless_field_resolver.py / classless_trust_gate.py for the existing skip-reason string
    format) and do not touch the block files.

    Return: which path was taken, what was built (or the skip-reason text used), and build/gate
    output confirming it's clean.

---

## QA Gate 1 — Wave 1 completion check

  Model:   haiku (simple assertion)
  Exec:    SEQUENTIAL
  Deps:    steps 1-5 must be complete
  Check:   `cd plugins/sgs-blocks/scripts/recogniser && python -m pytest test_render_repeater_recogniser.py test_array_schema_eliminator.py test_sc_var_classifier.py -q 2>&1 | tail -5` AND confirm 4 new/updated files exist: the step-1 verification report, step-2's report or fix, step-3's second-draft report, step-4's fix
  Pass:    pytest exits 0 with no failures; all four Wave-1 artefacts exist on disk (git status
           or a direct file-existence check)
  Fail:    Re-dispatch the specific failing step with the pytest failure output appended to its
           original prompt — do not re-dispatch all of Wave 1
  Marker:  QA

---

## Wave 2 — sequential (depends on Wave 1 results)

Step 6 — Integrate + commit Wave 1's changes
  Model:       inline
  Action:      Review all Wave 1 outputs for conflicts (all touched disjoint files, per the
               Files: fields above, so none expected — verify with `git status --short`). Commit
               each logically-separate change with its own path-scoped commit (never a single
               `git add -A`), per this project's git hygiene rules. Update Spec 44 §5.0/§5.1 to
               point at step 1's report instead of the stale conversation-derived figures.
  Files:       .claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md (§5.0/§5.1 pointer update),
               plus whatever Wave 1 steps touched
  Inputs:      Wave 1's four outputs
  Outcome:     `git log` shows 4-5 clean, path-scoped commits on `main`, pushed; `main` matches
               `origin/main`
  Exec:        SEQUENTIAL
  Deps:        QA Gate 1 must pass first
  Marker:      HANDOFF
  Time:        20 min
  Tooling:     git, this project's path-scoped-commit gate
  On-Fail:     If a path-scoped commit is rejected by the repo's own commit gate for touching
               too broad a scope, split further — never bypass with `[batch-ok:...]` unless the
               overlap is genuinely reviewed and intentional.
  Cold-Entry:  Wave 1's four output files/reports (listed above); `git log --oneline -10` to see
               what's already landed
  Prompt: (inline step — no dispatch prompt needed)

Step 7 — Re-run Tier A integration measurement (depends on step 4's fix)
  Model:       sonnet
  Action:      With step 4's alias-bug fix landed, MEASURE (per Spec 44 §11's own instruction —
               "measure, don't assume additive") whether Tier A now contributes real, correct
               resolutions on top of what Stage A/B already resolve alone, or whether it's fully
               superseded. Run Tier A against both drafts (Eye Care Birmingham + Frame Card,
               from step 3) and compare its output group-by-group against Stage A/B's own
               resolution for the same groups.
  Files:       plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py (read-only at this
               step — decision only, no further code change unless the measurement clearly
               calls for wiring it in)
  Inputs:      Step 4's fix; step 3's Frame Card baseline; D1094's Eye Care baseline
  Outcome:     A written decision (in Spec 44 §11, replacing the current "measure, don't assume
               additive" open bullet): Tier A is either (a) wired in as a third Stage B signal,
               with the specific integration point named, or (b) recorded as superseded/
               redundant with the specific evidence (e.g. "0 of N groups where Tier A resolves
               correctly AND Stage A/B doesn't already resolve the same group")
  Exec:        SEQUENTIAL
  Deps:        step 4 (alias fix) and step 3 (second-draft baseline) must both be complete
  Marker:      (none)
  Time:        25 min
  Tooling:     the existing recogniser modules, /sgs-db if any further alias-table checks are
               needed
  On-Fail:     If the comparison is genuinely ambiguous (Tier A helps on some groups, redundant
               on others), record BOTH findings honestly rather than forcing a binary answer —
               state the exact groups on each side.
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    With plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py's alias bug now fixed (see
    the prior step's fix), answer Spec 44 §11's open question: "does Tier A become a third
    signal layered into Stage B, or is it superseded? Measure, don't assume additive."

    Run sc_var_classifier.py's resolution against every repeated group in BOTH
    sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Eye Care Birmingham.dc.html (D1094's
    baseline: 39 groups) and Frame Card.dc.html (this phase's new baseline, see the earlier
    step's report). For each group, compare Tier A's answer against what Stage A/Stage B already
    resolve for that same group (read the existing measurement reports for both drafts).

    Classify every group into one of: (a) Tier A agrees with Stage A/B — redundant; (b) Tier A
    resolves correctly where Stage A/B do NOT — genuinely additive; (c) Tier A resolves
    INCORRECTLY where Stage A/B are silent or correct — Tier A would be actively harmful if wired
    in unconditionally.

    Write the classified breakdown to a report
    (.claude/reports/2026-09-1X-spec44-tier-a-integration-measurement.md) and recommend: wire in
    (if (b) is non-trivial and (c) is zero/rare and safely excludable), or leave superseded (if
    (b) is empty or (c) dominates). Then update Spec 44 §11's Tier A bullet in place with the
    real answer, replacing the "measure, don't assume additive" placeholder — cite your report.

    Return: the report path, the (a)/(b)/(c) counts, and your wire-in-or-not recommendation.

---

## QA Gate 2 — Wave 2 completion check

  Model:   haiku
  Exec:    SEQUENTIAL
  Deps:    steps 6-7 must be complete
  Check:   `git log --oneline -5` shows step 6's commits landed AND
           `grep -c "measure, don't assume additive" .claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md`
           returns 0 (confirms the placeholder text was actually replaced, not left alongside
           the new answer)
  Pass:    both conditions true
  Fail:    if the placeholder text is still present, re-dispatch step 7's spec-update sub-task
           specifically (not the whole measurement) with an explicit instruction to REPLACE, not
           append
  Marker:  QA

---

## Wave 3 — the real gate (sequential, depends on everything above)

Step 8 — Live run with both rollout flags ON
  Model:       sonnet
  Action:      Run the real gated pipeline path (not the dry-run measurement script) against a
               real client draft with `--classless-match --classless-auto-complete` both set.
               Use the Eye Care Birmingham draft (the one with the fullest existing baseline
               history, so any deviation from D1094's dry-run figures is immediately
               interpretable). Confirm: (a) real completions or honest review-queue entries are
               produced, matching or explicably differing from D1094's dry-run figures; (b) the
               existing BEM-path baseline (non-classless groups) is byte-for-byte unaffected;
               (c) the audit log, `operator-review.html`, and end-of-run summary file (Spec 44
               §7) all actually fire — check each file exists and has real content, don't trust
               a "ran successfully" exit code alone.
  Files:       (run-time artefacts under `pipeline-state/`, not source files — this step runs
               the pipeline, doesn't edit code)
  Inputs:      Steps 1-7's completed work (the full register); D1094's dry-run baseline for
               comparison
  Outcome:     A real pipeline run with both flags on, its output artefacts inspected and
               confirmed against all three checks above, written up in a report
  Exec:        SEQUENTIAL
  Deps:        QA Gate 2 must pass; this is deliberately last per Bean's own sequencing —
               everything else must be resolved before the real end-to-end proof runs
  Marker:      (none)
  Time:        30 min
  Tooling:     the real `sgs-clone-orchestrator.py` (not the dry-run script), /verify-loop for
               2-attestation on the "it worked" claim
  On-Fail:     If the live run misbehaves (wrong completions, BEM-path regression, missing audit
               artefacts), the flags stay off (they're default-off — no revert needed) and the
               specific failure is written up as a new Spec 44 §11 item, NOT silently reported as
               success. This is the one step in this phase where "found a real problem" is a
               completely valid, expected, useful outcome — don't let sunk-cost pressure from
               the prior 7 steps turn a genuine finding into a glossed-over pass.
  Cold-Entry:  n/a (not a SESSION-START step, but functions as the plan's true finish line)
  Prompt: |
    Run Spec 44's REAL gated pipeline (not measure-classless-baseline.py's dry-run measurement)
    against the Eye Care Birmingham draft with both rollout flags on:
    `--classless-match --classless-auto-complete`, via the real
    plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py entry point (read its `--help` and the
    surrounding orchestrator flow first to confirm the exact invocation — do not guess the CLI
    shape).

    After the run, verify THREE things with direct evidence, not a trusted exit code:
    1. Compare the run's completion/review/no-match counts against D1094's dry-run baseline (39
       groups, 0 auto-completed, 2 review, 37 no-match). If they differ, explain why (e.g. this
       phase's Wave 1/2 fixes changing behaviour is expected and good; an unexplained difference
       is a red flag).
    2. Confirm the existing BEM-classed (non-classless) sections of the same draft render
       byte-for-byte identically to a pre-this-phase baseline run (diff the emitted markup for
       BEM-classed sections specifically).
    3. Open and read the real content of the audit log, `operator-review.html`, and the
       end-of-run summary file (Spec 44 §7 names these) — confirm each has real, non-empty,
       correctly-shaped content for this run, not just that the file exists.

    Use `/verify-loop`'s 2-attestation discipline for the "it worked" claim: find TWO
    independent pieces of evidence (e.g. the emitted pipeline-state JSON AND a direct read of
    operator-review.html's actual HTML content) before declaring success.

    If ANYTHING looks wrong (a completion that shouldn't have happened, a BEM-path diff, a
    missing/empty audit artefact), STOP and write up the finding honestly — this is a genuinely
    useful outcome, not a failure of this task. Do not paper over it to report a clean pass.

    Write the full result to .claude/reports/2026-09-1X-spec44-live-flagged-run.md.

    Return: pass/fail on each of the 3 checks, the report path, and — if everything passed —
    confirm the flags are safe to consider for a real production toggle (still requires Bean's
    own sign-off, this step doesn't flip that decision itself).

---

## QA Gate 3 — Phase completion check

  Model:   inline (architectural judgment — this is the phase's real close)
  Exec:    SEQUENTIAL
  Deps:    step 8 complete
  Check:   Re-read Spec 44 §11 in full; confirm every one of this phase's 6 register items now
           has either a "RESOLVED" strikethrough (matching this project's own doc-op convention
           — never silently delete, see D1097's precedent) or an honestly-recorded remaining gap
  Pass:    all 6 items accounted for one way or the other; no item silently dropped
  Fail:    identify which item(s) are unaccounted for and dispatch a targeted follow-up
  Marker:  QA

Step 9 — Close out: decisions.md, LEDGER.md, handoff gate
  Model:       inline
  Action:      Write one consolidated D-numbered decisions.md entry (or several, per this
               project's convention of one entry per real decision — use judgment based on how
               distinct the Wave 1-3 decisions turned out to be) covering: the Stage-B data
               verification result, the consistency-check outcome, the second-draft test result,
               the Tier A resolution, the brand-strip decision, and the live-flagged-run result.
               Update LEDGER.md's Front C section to reflect the closed front (or the specific,
               named residual, if step 8 found a real problem). Run
               `python .claude/hooks/handoff-preflight.py --check` and fix anything it flags
               before considering this phase done.
  Files:       .claude/decisions.md, .claude/LEDGER.md
  Inputs:      All prior steps' outputs
  Outcome:     handoff-preflight.py passes clean; LEDGER.md's Front C section is current; the
               plan file itself is moved to `plans/archive/` once everything above is genuinely
               closed (per this project's own "plans/archive/ holds plans that are DONE"
               convention)
  Exec:        SEQUENTIAL
  Deps:        QA Gate 3
  Marker:      HANDOFF
  Time:        20 min
  Tooling:     handoff-preflight.py
  On-Fail:     If step 8 found a genuine problem (flags don't get switched on cleanly), do NOT
               move this plan to archive/ — leave it at `plans/` with the specific remaining
               item named, exactly like `front-d-wave-2-orchestration.md`'s Task 6 pattern from
               the prior session's audit.
  Cold-Entry:  n/a (final step)
  Prompt: (inline step — no dispatch prompt needed)

---

## Key Judgement Calls

### Primary decisions (surfaced during planning)

- **Decision:** Does the recent "markup upgrade" reduce or eliminate the need for Spec 44 §11's
  AI fallback tier?
  - **Options:** [A] Investigate now, as part of this phase, before deciding whether to keep it
    in Spec 44's deferred list as-is / [B] Leave the AI fallback bullet exactly as it is in Spec
    44 §11 (still blocked on the Anthropic API-key decision, still deferred) and revisit only if
    it comes up again / [C] Formally mark it superseded now, on the strength of the markup
    upgrade alone
  - **Recommendation:** [B] — Bean explicitly clarified this is a suggestion to investigate, not
    a settled supersession ("we didn't explicitly supersede the AI fallback, I'm just
    suggesting it btw"). This phase's scope (the 6 concrete register items) doesn't depend on
    this answer either way, so forcing a decision now risks exactly the premature-convergence
    pattern this project's `/brainstorming` discipline warns against. Leave §11's bullet
    text unchanged; if a future session has time, [A] is the honest next step (name what "the
    markup upgrade" specifically changed, then re-measure whether classless cases nothing else
    resolves still occur at a rate that would need an AI fallback).
  - **Why:** Deciding [C] without measurement would be exactly the pattern this project's
    prove-the-cause-before-fix rule exists to prevent — "not deferred any more" needs the same
    evidence bar as any other status claim in this codebase (per this project's own
    citation-with-command discipline).
  - **Cost of wrong choice:** Marking it superseded incorrectly could mean a real classless case
    silently falls to an unhelpful review-queue entry forever with nobody looking at an AI
    fallback as the fix, because the deferred item was closed prematurely.
  - **Who decides:** Bean (not delegated to this phase's subagents)

- **Decision:** `sgs/brand-strip`'s "count" field — build a real attribute, or drop with a
  skip-reason?
  - **Options:** [A] Build `itemCountLabel` (or similar) as a small new per-item attribute /
    [B] Drop the field type entirely with an honest skip-reason recorded in the pipeline's skip
    vocabulary
  - **Recommendation:** [A] — it's small (one attribute, following an existing per-item pattern
    already in the block), generically useful (not Eye-Care-specific), and the alternative
    (a permanent skip-reason) just defers the same decision to the next draft that has this
    shape.
  - **Why:** This project's own architecture rule says a missing block-equivalent is a "gap
    candidate to add," never silently dropped, when the gap is small and generic.
  - **Cost of wrong choice:** Building an unnecessary attribute costs ~20 minutes and a small
    schema addition — cheap to reverse. Dropping a genuinely useful pattern means every future
    "N items" style draft field re-triggers the same open question.
  - **Who decides:** Bean can override at Step 5's dispatch time; the step's prompt defaults to
    build but is written to accept a KJC override before it runs

### Pre-emptive decisions (Hidden Decisions pass — Sonnet + Haiku cold peer review)

- **Decision:** `measure-classless-baseline.py` is not read-only — running it unmodified
  against Frame Card would write real audit-log precedent under the same `CLIENT_SLUG` as the
  existing Eye Care Birmingham run, risking a real FR-44-1(b) second-occurrence trip that
  contaminates the precedent history Step 8's live run depends on.
  - **Flagged by:** sonnet-reviewer (verified against the real script's source before being
    written up, not just asserted)
  - **Recommendation:** Already folded directly into Step 3's Action/Files/Prompt fields above
    — isolate via a throwaway audit-log path or a distinct test client-slug before running.
    Not left as an open question for the executor to discover mid-step.
  - **Why:** This is exactly the "found by construction, not by guessing" class of issue this
    Hidden Decisions pass exists to catch before execution, not during it.

- **Decision:** Does `measure-classless-baseline.py` already accept a draft-path parameter, or
  does Step 3's executor need to read the script first to find out?
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** Read it first — Step 3's Action field already says so explicitly
    ("read it first"). No separate confirmation step needed; this is Step 3's own first action,
    not a blocker to resolve before dispatch.

- **Decision:** No confirmation that `Frame Card.dc.html` actually contains `<sc-for>` repeater
  markup at all — if it has zero/near-zero repeated groups, Step 3's "structural differences"
  comparison is degenerate before it starts.
  - **Flagged by:** sonnet-reviewer
  - **Recommendation:** Checked live 2026-09-17: `grep -c "sc-for" "Frame Card.dc.html"` returns
    2 — genuine `<sc-for>` markup exists but the sample is small (likely 1 repeater group, not a
    rich multi-group draft like Eye Care Birmingham's 39). Step 3's executor should expect a
    thin, not degenerate-but-not-rich result, and the "structural differences" writeup should be
    read accordingly — a small draft still proves the design generalises, it just won't surface
    much variety.

- **Decision:** If Step 3's script crashes on Frame Card's HTML shape for a genuine
  incompatibility reason (not the hardcoding already addressed above), should the executor
  debug/extend the script or fall back to calling the underlying recogniser modules
  (Stage A → Stage B → trust gate) directly and derive counts by hand?
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** Extend/debug the script first (it's the maintained, tested entry point);
    fall back to calling the underlying modules directly only if the crash is specific to the
    script's own CLI/report-writing wrapper, not the recognition logic itself — in which case
    that's useful evidence for the report, not just a workaround.

- **Decision:** What exact shape should Step 3's output report take — just the four headline
  counts, or a fuller per-group breakdown?
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** Match D1094's own report shape (read
    `.claude/reports/2026-09-17-front-c-task3-baseline-remeasure.md` as the template) — four
    headline counts plus enough per-group detail to support the "structural differences" writeup
    the step already asks for. Don't under- or over-build relative to the precedent report.

- **Decision:** What counts as "the same client" for FR-44-1(b)'s second-occurrence
  auto-complete rule, when Wave 3's live run is the FIRST real flagged run ever — does step 8
  need to simulate a prior occurrence, or is a true first-run always forced to review by design?
  - **Flagged by:** sonnet-reviewer
  - **Recommendation:** A true first run is CORRECTLY forced to review under clause (b) by
    design (this is the whole point of the human-approval gate, per D1094/D1097's own test
    suite — `test_second_occurrence_for_the_same_client_auto_completes_under_a_alone` already
    proves the mechanism exists). Step 8 should NOT try to simulate a second occurrence — a
    review-queue-only result on the first-ever flagged run is a PASS for this phase, not a
    failure to investigate further.
  - **Why:** Conflating "the live run produced 0 auto-completions" with "the live run failed"
    would misread the trust gate's own intended behaviour.

- **Decision:** If step 4's alias-bug root cause turns out to be a DATA bug (a wrong row in
  `slots.aliases`), does fixing it require a full `/sgs-update` reseed, and could that reseed
  have side effects on unrelated, already-shipped features that depend on the same table?
  - **Flagged by:** haiku-reviewer
  - **Recommendation:** Before running any `/sgs-update` reseed as part of step 4, grep for
    every OTHER consumer of `slots.aliases` (not just sc_var_classifier.py) and confirm the
    specific row correction doesn't change behaviour for an already-shipped feature. If it does,
    escalate to Bean before landing the DB fix rather than reseeding silently.
  - **Why:** `slots.aliases` is shared framework data, not scoped to Spec 44 — a fix here is
    exactly the shared-mechanism-change category this project's design-gate rule (Rule 7 of the
    7 non-negotiables) requires checking blast radius for first.

- **Decision:** Step 3's second-draft test may surface a genuinely NEW block/shape Frame Card
  uses that Eye Care Birmingham never exercised — is fixing that gap in scope for THIS phase, or
  is it a new Spec 44 §11 item for a future phase?
  - **Flagged by:** both
  - **Recommendation:** Record it as a new, explicit Spec 44 §11 item (don't silently build a
    fix mid-phase for something outside the named 6-item register) — unless it's a trivial,
    same-pattern fix that step 3's own dispatch can close in under 10 minutes without touching
    shared mechanisms. Anything bigger goes to the register, not into scope creep.
  - **Why:** This phase's whole point is closing a NAMED register — an unbounded "and also fix
    whatever else turns up" would recreate the same drift pattern the completion-audit session
    just cleaned up.

## Parking lot

Items surfaced during planning that are deliberately OUT of this phase's scope — named here so
they aren't lost, not silently dropped. **Not written to `.claude/parking.md` itself** — this
project's own rule is that parking.md entries need Bean's explicit ask, not an automatic add
from a planning pass (memory: `feedback_never_add_to_parking_without_explicit_permission`).

- **Option [A] of the AI-fallback KJC** — actually investigating what "the markup upgrade"
  changed and re-measuring whether classless cases nothing else resolves still occur at a rate
  needing an AI fallback. Deliberately deferred (see the KJC itself) rather than decided this
  phase.
- **Any new block/shape gap Step 3's Frame Card run surfaces** that doesn't fit the "same
  pattern, under 10 minutes" bar — becomes a new Spec 44 §11 item for a future phase, not
  built inline here (Hidden Decisions pass, both reviewers).
- **A full production toggle of `--classless-match`/`--classless-auto-complete`** — Step 8
  proves the mechanism works when flagged on for a test run; actually flipping the flags for
  real client work stays a separate, Bean-signed-off decision (Step 8's own Outcome field says
  so explicitly) — not something this phase's completion authorises by itself.
- **A dedicated fixture/regression test for the `sc_var_classifier.py` alias-table fix** beyond
  what Step 4 already requires — if the DB-data-bug path is taken (a shared-table correction),
  consider whether OTHER consumers of `slots.aliases` need their own regression coverage too,
  not just sc_var_classifier's — flagged but not scoped into this phase's Step 4.
