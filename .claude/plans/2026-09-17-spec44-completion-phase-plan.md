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
- ⚠ CORRECTED (qc-council code-path-tracer, verified live 2026-09-17): the real baseline is
  **82 passed, 1 error** — `test_render_repeater_seeder.py::test_source_mutation_changes_sha_and_warns`
  errors on a wrong fixture name (`capture`, not a real pytest fixture — likely means `capsys`).
  This is a PRE-EXISTING, unrelated test-infra bug, not something this phase introduced.
  `cd plugins/sgs-blocks/scripts/recogniser && python -m pytest test_render_repeater_recogniser.py test_array_schema_eliminator.py test_render_repeater_seeder.py test_classless_trust_gate.py -q`
  — confirm the SAME 82/1 result before starting (a different result means something else
  changed and needs investigating first). Fixing the broken fixture itself is a 2-minute,
  in-scope opportunistic fix at Step 6 (Wave 1 integration) — not worth its own step, but don't
  leave it unfixed either now that it's been found.
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
  files (82 passing + 1 pre-existing broken fixture across the four Stage A/B/trust-gate
  modules — see Pre-conditions)
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
               Birmingham). ⚠ CONFIRMED real, then RE-VERIFIED and corrected by `/qc-council`
               (structural-diff rater, 2026-09-17): `measure-classless-baseline.py` is NOT
               read-only — it calls `recognise_classless_group(..., auto_complete_enabled=True,
               conn=conn)` then `gate.append_decision(decision)` (`classless_trust_gate.py::append_decision`,
               genuinely takes a `path` override, defaults to module-level `LOG_PATH`), writing
               REAL rows to the git-tracked audit log (`classless-recognition-log.jsonl`), under
               a hardcoded module constant `CLIENT_SLUG = "eye-care-ward-end"` at
               `measure-classless-baseline.py:64`, threaded straight into
               `recognise_classless_group(sa_group, sb_group, CLIENT_SLUG, precedent, ...)`
               (lines 113-115). Running it unmodified against Frame Card would write real
               precedent under the SAME client slug as the existing Eye Care Birmingham
               precedent — risking Frame Card itself tripping FR-44-1(b)'s same-client
               second-occurrence auto-complete clause for real, contaminating the precedent
               history Step 8's live run depends on being clean. **Do not run the script
               unmodified.** The council's finding: swapping `CLIENT_SLUG` to a distinct test
               value (e.g. `"eye-care-ward-end-frame-card-test"`) is the LOWER-FRICTION fix —
               it's a plain constant threaded through one call, no signature change needed —
               versus threading a `path=` override through `append_decision` (real, but requires
               editing the call site at `measure-classless-baseline.py:116`, which currently
               passes no path argument at all). Use the `CLIENT_SLUG` swap unless a specific
               reason favours the path-isolation route instead. Note the correction to the
               original draft of this step: the READ-side override lives in
               `classless_trust_gate.py::read_precedent` (which calls `read_log(path)`), NOT in
               `pattern_precedent()` — `pattern_precedent()` takes an already-loaded `rows`
               sequence, no path parameter at all. Cite the right function if the path-isolation
               route is taken.
  Files:       sites/eye-care-ward-end/design_handoff_ward_end_eye_care/Frame Card.dc.html (read
               only), plugins/sgs-blocks/scripts/recogniser/measure-classless-baseline.py (read,
               extend with an isolated `CLIENT_SLUG` — never run it unmodified against a second
               draft in the same client directory)
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

    Already verified for you by `/qc-council` (2026-09-17): the lower-friction fix is swapping
    `measure-classless-baseline.py:64`'s `CLIENT_SLUG` module constant to a distinct test value
    (e.g. `"eye-care-ward-end-frame-card-test"`) — it's threaded straight through one call
    (`recognise_classless_group(sa_group, sb_group, CLIENT_SLUG, precedent, ...)`, lines
    113-115), no signature change needed. This is the recommended route; use it unless you find
    a specific reason it doesn't work. The alternative (isolating the audit-log FILE path
    instead) is also real — `classless_trust_gate.py::append_decision` genuinely accepts a
    `path` override — but requires editing the call site at
    `measure-classless-baseline.py:116` (currently calls `gate.append_decision(decision)` with
    no path argument) and is more moving parts for no extra benefit here. ⚠ If you go the
    path-isolation route instead, note the read-side override lives in
    `classless_trust_gate.py::read_precedent` (which calls `read_log(path)`) — NOT in
    `pattern_precedent()`, which takes an already-loaded `rows` sequence and has no path
    parameter at all.

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
               `sgs/info-box` alias resolution bug (flagged, not fixed, per decisions.md
               ~line 1090: "the implementer correctly judged this needs real DB investigation
               before a confident fix, not a guess"). ⚠ SCOPE CORRECTED by `/qc-council`
               (pipeline-forensics rater, verified live 2026-09-17, DISPUTED the original
               scoping): this is TWO SEPARATE bugs, not one, and only one of them lives in the
               file this step originally named. `slots` table query (`scope='element'`) shows
               exactly ONE row with `"thumbs"` in its `aliases` JSON array, mapping to
               `standalone_block='sgs/info-box'` — a genuine single-candidate DATA-QUALITY bug
               (an over-broad alias), correctly reachable and fixable through
               `sc_var_classifier.py::_load_slot_aliases`. But **no row's `aliases` array
               contains the literal string `"items"` anywhere in the table** — `items` cannot
               be reproduced through `sc_var_classifier.py`'s alias lookup AT ALL. Its real root
               cause must live in a DIFFERENT consumer of `slots.aliases`/`slot_name` — the
               rater's hypothesis, not yet confirmed, points at
               `converter/db/db_lookup.py::equivalent_block_for`. Investigate BOTH, don't stop
               at `thumbs` and assume `items` shares its cause.
  Files:       plugins/sgs-blocks/scripts/recogniser/sc_var_classifier.py (the `thumbs` data-fix
               and its regression test), plugins/sgs-blocks/scripts/recogniser/test_sc_var_classifier.py
               (ALREADY EXISTS — confirmed live 2026-09-17, extend it, do not treat as new),
               plugins/sgs-blocks/scripts/converter/db/db_lookup.py (read first — likely where
               `items`'s real root cause lives; do not assume without checking)
  Inputs:      decisions.md's Tier A hit-rate measurement (0 of 35 correct, 2 resolve-but-wrong,
               the fabricated-docstring correction already landed in `372ed8ce1`); `slots.aliases`
               DB table; the qc-council finding above (two bugs, two different files)
  Outcome:     TWO proven root causes (DB-verified, not guessed) — `thumbs`'s single-row data
               issue AND `items`'s real location (wherever it turns out to live) — each fixed at
               its own layer, each with a regression test proving the specific word no longer
               resolves incorrectly
  Exec:        PARALLEL with steps 1, 2, 3, 6
  Deps:        none
  Marker:      (none)
  Time:        40 min (revised up from 30 — this is now confirmed to be two investigations, not
               one)
  Tooling:     /systematic-debugging (root-cause gate), /sgs-db (query `slots.aliases`), pytest
  On-Fail:     If the DB investigation shows the alias table itself is the source of truth and
               is simply wrong (not a code bug), fix the DATA (via `/sgs-update` or a direct,
               documented DB correction) rather than papering over it with a code-side
               exception — matches this project's DB-first rule (R-31-1). If `items`'s real
               consumer turns out to be a shared mechanism used by more than just Tier A, treat
               that as a design-gate trigger (Rule 7) and flag it rather than fixing silently.
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: |
    Root-cause a known, disclosed-but-unfixed bug: `items`/`thumbs` resolve to `sgs/info-box`,
    which is wrong (per decisions.md, ~line 1090 area: "the implementer correctly judged this
    needs real DB investigation before a confident fix").

    ⚠ THIS IS TWO BUGS, NOT ONE — confirmed by `/qc-council` verification before you start, so
    you don't waste time re-discovering it. Query the `slots` table
    (`scope='element'`, via `/sgs-db`) for every row whose `aliases` JSON array contains
    `"thumbs"` — you'll find exactly ONE row, mapping to `sgs/info-box`. That's a real, single-
    candidate DATA bug: fix it via this project's documented DB-correction path (check
    CLAUDE.md's DB-first section), not a code-side special case (R-31-9 bans hardcoded
    carve-outs). Add/extend `plugins/sgs-blocks/scripts/recogniser/test_sc_var_classifier.py`
    (it already exists — extend it, don't treat this as a new file) with a regression test
    proving `thumbs` now resolves correctly or fails closed.

    Then query the same table for `"items"` — you will find NO row contains it. This means
    `items` CANNOT be reproduced through `sc_var_classifier.py`'s alias lookup at all — the
    bug, wherever it lives, is not in that file. Read
    `plugins/sgs-blocks/scripts/converter/db/db_lookup.py` (specifically anything named
    `equivalent_block_for` or similar — a council rater's unconfirmed hypothesis, verify before
    trusting it) and trace where `"items"` genuinely resolves to `sgs/info-box` from. Find the
    real consumer, root-cause it with the same DB-first discipline, and fix it at whatever layer
    it actually lives in.

    Run the full existing sc_var_classifier test suite (and whatever test suite covers the
    second bug's real location) to confirm no regression on either fix.

    Return: TWO root causes (one sentence each, with the DB query or code line/file that proves
    each), what was fixed and where for each, and the full pytest output for both.

Step 5 — Record the corrected brand-tile target block finding (no build needed)
  Model:       inline
  Action:      SUPERSEDED 2026-09-18 (D1103) — this step originally proposed building a new
               `itemCountLabel` attribute on `sgs/brand-strip`. That premise was wrong on two
               counts, found during a live `/brainstorming` session with Bean: (1) `sgs/brand-strip`
               is the wrong TARGET block for this content group in the first place — the framework
               already has a shipped precedent, `theme/sgs-theme/patterns/mega-brands-1.php`
               ("Mega: Brands", Spec 36's `sgs_mega_menu` CPT starter), which uses `sgs/card-grid`
               for exactly this clickable logo-tile-with-count shape; (2) `sgs/card-grid`'s
               existing per-item schema already has `title`/`subtitle`/`media`/`badge`/`link` —
               the "count" text has a direct home (`subtitle` or `badge`) with NO new attribute
               needed at all. Spec 44 §5.3 has already been corrected in place with this finding.
               Nothing to build. This step is now just confirming the spec correction landed.
  Files:       .claude/specs/44-CLASSLESS-REPEATER-RECOGNITION.md §5.3 (already corrected)
  Inputs:      D1103; the live `mega-brands-1.php` pattern read directly
  Outcome:     Spec 44 §5.3 correctly states: target block is `sgs/card-grid` (not
               `sgs/brand-strip`) for this shape, no new attribute required, `sgs/mega-panel`'s
               aside wrapper not needed for this specific content group (Bean's call)
  Exec:        PARALLEL with steps 1, 2, 3, 4
  Deps:        none
  Marker:      (none)
  Time:        2 min (verification only — the actual decision + doc fix already landed 2026-09-18)
  Tooling:     none — read-only confirmation
  On-Fail:     n/a
  Cold-Entry:  n/a (not a SESSION-START step)
  Prompt: (inline step — no dispatch needed; just confirm Spec 44 §5.3 reads as corrected above
    before closing out the register)

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

Step 7 — DONE 2026-09-18 (D1104) — Tier A integration measurement
  Model:       sonnet
  Action:      COMPLETED. Measured against Eye Care Birmingham only (Frame Card's own Stage A/B
               baseline is item 3, still not done, so this ran against the one draft that had a
               real baseline to compare against — matches this plan's own On-Fail guidance to
               record findings honestly rather than force a premature both-drafts answer).
               Result: 0 redundant, 4 additive (all inside an unparsed `dc-import` sub-draft), 33
               harmful (89% of 37 total fires wrong — the `sc_var_count` heuristic blanket-fires
               on any 2+-item loop with zero content awareness). Decision: leave Tier A
               superseded, do not wire in. Full breakdown:
               `.claude/reports/2026-09-18-spec44-tier-a-integration-measurement.md`. Spec 44
               §11 and decisions.md (D1104) both updated in place.
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
               a "ran successfully" exit code alone. `/qc-council` (pipeline-forensics rater,
               2026-09-17) confirmed this 3-artefact trio is the complete, correct set —
               `sgs-clone-orchestrator.py:2027,2255,2261-2262,2267,2782,3230-3261` traces cleanly
               to all three. ℹ Informational, not a gate: every Stage-9 run (regardless of these
               flags) also inserts into the pre-existing uimax `recognition_log` DB table
               (`insert_recognition_log`, `sgs-clone-orchestrator.py:3022-3069`) — a same-named
               but UNRELATED "learning surface", not new behaviour this step introduces and not
               part of Spec 44's own audit trail. No action needed; noted so it isn't mistaken
               for an unexpected side effect during Step 8.
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

- **Decision (SETTLED 2026-09-18, D1103 — no longer open):** `sgs/brand-strip`'s "count"
  field — build a real attribute, or drop with a skip-reason?
  - **What actually happened:** Neither option was right. A live `/brainstorming` session with
    Bean found the premise itself was wrong — `sgs/brand-strip` is the wrong TARGET block for
    this content group (a clickable logo-tile-with-count grid), and the framework's own shipped
    `mega-brands-1.php` precedent already routes this shape to `sgs/card-grid`, whose existing
    `subtitle`/`badge` fields already cover "count" text with zero new attributes.
  - **Why the original framing was wrong:** I checked `block_attributes`' styling-column names
    (`titleColour`, `subtitleColour`, etc.) and wrongly read the absence of a literal "count"
    column as "no per-item text field exists" — the actual per-item JSON schema (`items.properties`
    in block.json) has `title`/`subtitle` and was never checked directly before concluding. Bean
    caught this. Lesson: a styling-attribute name survey is not the same check as reading the
    item schema itself.
  - **Who decided:** Bean, 2026-09-18

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
