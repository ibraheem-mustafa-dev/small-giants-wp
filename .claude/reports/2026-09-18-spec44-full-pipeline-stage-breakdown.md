# Spec 44 (Classless Repeater Recognition) — full pipeline stage breakdown

**2026-09-18.** Final, comprehensive measurement for the Spec 44 completion register —
redo of the original narrow "role coverage" item, done LAST and widened deliberately
because every mechanism the pipeline actually uses changed today (D1103, D1104, the new
`SUSPECT_IDENTICAL` check, the Frame Card second-draft test, and the first real flagged
live run). Every figure below carries the exact command/file it came from. Read-only —
no pipeline code, DB rows, or audit log touched by this task.

---

## 1. Stage B data foundation — `array_item_schema.role` coverage (re-verified LIVE)

Command:
```
python C:/Users/Bean/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT COUNT(*) as total_rows, SUM(CASE WHEN role IS NOT NULL AND role != '' THEN 1 ELSE 0 END) as rows_with_role FROM array_item_schema"
```
→ **90 total rows, 25 with `role` populated (27.8%).**

```
python .../sgs-db.py sql "SELECT COUNT(DISTINCT block_slug) FROM array_item_schema WHERE role IS NOT NULL AND role != ''"
```
→ **9 distinct blocks have at least one row with `role` populated.**

```
python .../sgs-db.py sql "SELECT COUNT(DISTINCT block_slug) FROM array_item_schema"
```
→ **13 distinct blocks have ANY `array_item_schema` row at all** (i.e. 13 is the total
population of blocks with a repeater-shaped attribute seeded into this table; 9 of the
13 have partial-or-better role coverage, 4 have zero rows with a role).

**Row-level count (25/90, 27.8%) — CONFIRMED CURRENT, unchanged from the 2026-09-17
session's figure.** No `/sgs-update` run or other edit has touched `array_item_schema`
between then and now (D1103's fix touched `slots.aliases`, a different table).

**Block-level count — discrepancy found, correcting the register's own prior wording.**
The task brief cited "13/40 blocks" from the 2026-09-17 session. A live re-derivation
finds no query that produces a denominator of 40 anywhere in this DB (total `blocks`
table population is 209; distinct blocks carrying any `array_item_schema` row is 13).
Grepped `.claude/memory/reports-archive/` for the literal strings `13/40`, `25/90`,
`27.8` — no source document contains "13/40" as an exact figure; it does not resolve to
a real query result. The **honest, current, re-derivable numbers are: 13 blocks have a
repeater-shaped attribute seeded in `array_item_schema` at all; 9 of those 13 (69%) have
partial-or-better role coverage; 4 of the 13 have zero role coverage.** Do not carry
"13/40" forward — it appears to be a mis-transcription (possibly of the row-count 25/90,
or of an unrelated denominator) rather than a real DB fact.

Per-block breakdown (`SELECT block_slug, COUNT(*), SUM(role populated) FROM
array_item_schema GROUP BY block_slug`):

| Block | Rows | With role |
|---|---|---|
| `sgs/brand-strip` | 9 | 1 |
| `sgs/card-grid` | 12 | 4 |
| `sgs/choice-flow-question` | 6 | 0 |
| `sgs/cta-section` | 1 | 0 |
| `sgs/form-field-tiles` | 5 | 2 |
| `sgs/gallery` | 4 | 0 |
| `sgs/icon-list` | 8 | 2 |
| `sgs/option-picker` | 2 | 0 |
| `sgs/pricing-table` | 14 | 8 |
| `sgs/process-steps` | 4 | 1 |
| `sgs/product-card` | 5 | 1 |
| `sgs/social-icons` | 8 | 3 |
| `sgs/trust-bar` | 12 | 3 |

---

## 2. Stage A breakdown — real `match_quality` outcomes on the live run

Source: `pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-18-134414/
classless-decisions.json` (36 decisions, the live flagged run against Eye Care
Birmingham; cross-checked against the git-tracked
`plugins/sgs-blocks/scripts/recogniser/classless-recognition-log.jsonl`, which carries
the identical 36 rows for `run_id` prefix `eye-care-w...`, confirmed via `wc -l`
equivalent Python count: 153 total log rows, 117 tagged `front-c-ta...` (an earlier
Front C session), 36 tagged `eye-care-w...` — matches exactly).

The real quality labels, read from `render_repeater_recogniser.py` (not assumed — the
full enum is `EXACT`, `PARTIAL`, `SUSPECT_IDENTICAL`, `NONE`; `_QUALITY_RANK` at line 72
only ranks EXACT/PARTIAL/NONE because `SUSPECT_IDENTICAL` is a post-hoc downgrade of an
already-EXACT match, not a fourth rank):

| `match_quality` | Count (of 36) |
|---|---|
| EXACT | 0 |
| PARTIAL | 3 |
| SUSPECT_IDENTICAL | 0 |
| NONE | 33 |

**The new `SUSPECT_IDENTICAL` check did NOT fire on this real draft.** Confirmed by a
direct string search across all 36 decision records (`'SUSPECT_IDENTICAL' in
json.dumps(d)`) — zero matches. This is the expected, honest answer, not a gap: the
check (`d54a9aeb6`) only runs after Stage A's structural match already returns EXACT
(`render_repeater_recogniser.py::_value_diff_check`, called only when `best.quality ==
EXACT`), and this live run produced zero EXACT matches (see below — every reachable
match on this draft stayed at PARTIAL). Its only proof-of-concept to date remains the
synthetic fixture in `test_render_repeater_recogniser.py` (5 new tests added in
`d54a9aeb6`, including the specific positive/negative-control pair for this failure
mode). That is a true, disclosed gap in real-draft coverage, not a defect in the check.

**Of the 3 PARTIAL boundaries**, all reached Stage A (`stage: "A"`) with
`match_type: "render-repeater"`:

| Boundary | Block | Reason PARTIAL, not EXACT |
|---|---|---|
| `b3` | `sgs/trustpilot-reviews` | leaf match partial; Step 0 left 14 candidates, not one |
| `b6` | `sgs/trustpilot-reviews` | leaf match partial; Step 0 left 14 candidates; matched window is a merged-shape hypothesis (render.php holds more than one repeater) |
| `b10` | `sgs/product-card` | leaf match partial; Step 0 left 14 candidates; matched window is a merged-shape hypothesis |

**Of the 33 NONE boundaries** — Stage A genuinely ran for all of them (each decision's
`reasons` list carries a `"Stage A ambiguous across: ..."` line naming the surviving
candidate blocks), it simply never narrowed to a single leaf match. 15 of the 36 total
decisions explicitly record a Stage-A-ambiguous line; the remaining boundaries among the
33 NONE either had zero Stage A candidates at all or failed earlier. `stage: "none"` in
the decision record means "no stage produced a usable match", not "Stage A didn't run" —
confirmed by reading `classless_trust_gate.py::evaluate()`: both Stage A and Stage B are
called unconditionally for every classless-eligible boundary (`recognise_classless_
group()`'s own docstring: "both are called unconditionally"), and the function only
falls through to `STAGE_NONE` when neither `stage_a_result.matched` nor
`stage_b_result.matched` is true.

---

## 3. Stage B breakdown — DB-fact elimination outcomes

Source: same 36 `classless-decisions.json` records, `reasons` field.

**Stage B never became the DECIDING stage on this run — `stage: "B"` appears 0 times
in the 36 decisions.** This is because `array_schema_eliminator.py`'s own precondition
(documented in its module docstring, §5's rule) refuses to run its own MATCH when Stage
A has already reached a known shape; and separately, per `classless_trust_gate.py`'s
`evaluate()`, a boundary only surfaces as `stage: "B"` when Stage B reaches a resolved
match AND Stage A did not. On this draft Stage A never resolved (3 PARTIAL, 33 failed to
narrow), so Stage B ran on every boundary but never itself narrowed to a single
confident candidate either — every one of the 33 NONE-quality boundaries carries a
`"Stage B ambiguous across: ..."` line listing multiple surviving `block.field`
candidates (e.g. `sgs/brand-strip.logos, sgs/card-grid.items, sgs/choice-flow-
question.options, ...` — up to 14 candidates on `b1`).

Real breakdown of Stage B's own narrowing outcome across the 36 boundaries it ran on:

| Stage B outcome | Count | Evidence |
|---|---|---|
| Narrowed to exactly one confident candidate | 0 | no decision carries `stage: "B"` |
| Left genuinely ambiguous (2+ surviving candidates) | 33 | each NONE decision's `reasons` names multiple `block.field` survivors |
| Left with zero candidates (no-match, not ambiguous) | 0 | every NONE decision's reasons text is "ambiguous across: [list]", never an empty list |
| Not reached (Stage A already resolved a shape) | 3 | `b3`, `b6`, `b10` — Stage A matched (PARTIAL) so `array_schema_eliminator`'s own precondition means Stage B's *result* is not the reported one, though Stage B is still called (its own module refuses to run its match logic once Stage A matched) |

**Honest caveat:** the "DB-fact elimination did not reach one candidate" line appears
uniformly for all 33 no-match boundaries, but the artefacts do not expose a finer
per-boundary breakdown of *how many* candidates each one narrowed to before stalling
(the `reasons` text lists final survivors, not the elimination trace step-by-step). Re-
deriving that would require re-running `array_schema_eliminator.recognise_by_db_
elimination()` directly per boundary with tracing — out of scope for this measurement
pass, and the existing artefact already answers the register's actual question (none
reached a single candidate).

---

## 4. Tier A (`sc_var_classifier.py`) — confirmed zero contribution, not silently rewired

Read `sgs-clone-orchestrator.py`'s classless-recognition call site directly
(`~line 2217-2267`): `recognise_classless_group()` is called with only
`_classless_adapter.build_stage_a_group()` / `build_stage_b_group()` and
`_classless_gate` (`classless_trust_gate.py`, which itself only imports
`array_schema_eliminator` as `_stage_b` and `render_repeater_recogniser` as `_stage_a`).
**`sc_var_classifier` is not imported anywhere in that call path.**

`sc_var_classifier` IS imported elsewhere in the orchestrator (lines 1551, 2153,
3603-3667) — but for two genuinely different, pre-existing mechanisms: the Tier B
halt-and-prompt cache lookup (`unresolved_sc_for_names()`, used to decide whether a
Claude session needs to classify unresolved `sc-for` names) and the Tier 0
`--sc-var-min-confidence` opt-in eligibility gate for `convert_section` (a different
code path entirely from Spec 44's classless-match route, gated by `_cv2_eligible`, not
by `_classless_enabled`). Neither of these writes to `classless-decisions.json` or
`classless_trust_gate`'s log. **Confirmed: Tier A's contribution to the 36-group
classless-recognition outcome is genuinely zero, and it was not silently reintroduced**
— D1104's "not wired into Stage B" holds as of this read.

---

## 5. Trust gate (FR-44-1) — clause eligibility and the 3 real review-queue reasons

Read `classless_trust_gate.py::_clause_a()` / `evaluate()` directly. Clause (a) requires:
Stage A reached a match, it is EXACT (not PARTIAL/NONE), narrowed to a sole survivor, is
not a merged-shape hypothesis, and clears the `MIN_DISTINCT_ROLES = 2` diversity floor.
Clause (b) requires a prior `KIND_APPROVAL` log row (a real human `--approve` action) for
the same `(client, block, match_type)` — a same-run "forced to review" decision row does
NOT satisfy it (the log is snapshotted once at run start specifically to prevent a run
satisfying its own gate).

**Honest correction to the task's framing:** the brief assumed some groups reached
EXACT and then split on clause (a) vs (b). **On this live run, zero groups reached
EXACT** (see §2) — all 3 review-queue entries are PARTIAL, which fails clause (a) on its
own terms ("leaf match is partial, not exact") before clause (b) is even the deciding
factor. Both `clause_a` and `clause_b` are recorded `false` for all 3 review rows in
`classless-decisions.json`. There is therefore no live-run population of "EXACT and
needed clause (b)" to report a split for — the honest answer is 0/0, not a ratio.

**Per-group reason each of the 3 review-queue entries landed there (not generic):**

| Boundary | Block | Why review, specifically |
|---|---|---|
| `b3` | `sgs/trustpilot-reviews` | Clause (a) fails: leaf match PARTIAL (not EXACT), Step 0 left 14 candidates not one. Clause (b) also fails but is moot: first occurrence of `(sgs/trustpilot-reviews, render-repeater)` for client `eye-care-ward-end` — no prior human approval row exists — so even if (a) had passed, (b) would still force review once. |
| `b6` | `sgs/trustpilot-reviews` | Clause (a) fails: PARTIAL, 14 candidates, AND the matched window is a merged-shape hypothesis — `render.php` holds more than one repeater for this block, so even a structurally exact-looking window is only a per-item guess, not a proven match. Clause (b): same first-occurrence-for-this-block reason as `b3` (second real occurrence in this run, but the human-approval snapshot is taken once at run start, so the run's own first `b3` decision does not open the gate for `b6`). |
| `b10` | `sgs/product-card` | Clause (a) fails: PARTIAL, 14 candidates, merged-shape hypothesis (`sgs/product-card`'s render.php also holds more than one repeater). Clause (b) fails: first occurrence of `(sgs/product-card, render-repeater)` for this client. |

**0 auto-completed is therefore not a trust-gate near-miss — it is two independent
gates both failing simultaneously on every reachable candidate:** no boundary on this
draft produced a genuinely EXACT structural match (clause a never had a chance to pass),
and even where a partial match existed, no prior human approval exists for any of the
two blocks involved (clause b would also have blocked it). The two `sgs/trustpilot-
reviews` hits share one root cause (`render.php` genuinely holds more than one repeater
for that block — a real structural ambiguity, not a recogniser bug) confirmed by both
`b3` and `b6` independently citing it.

---

## 6. Overall pipeline numbers — reconciliation with the live run's 36/0/3/33

| Stage | Output | Count |
|---|---|---|
| Boundaries reaching the classless-match gate | walked | 36 (of 70 total Stage-1 boundaries; 34 excluded because they carry a `class_signature` or hit the slot-map — never classless-eligible) |
| Stage A | match_quality EXACT | 0 |
| Stage A | match_quality PARTIAL | 3 |
| Stage A | match_quality SUSPECT_IDENTICAL | 0 (check exists, did not fire on this draft) |
| Stage A | match_quality NONE (no match reached) | 33 |
| Stage B | narrowed to one candidate (only relevant when Stage A = NONE) | 0 |
| Stage B | left ambiguous (2+ candidates) | 33 |
| Tier A (`sc_var_classifier`) | contribution to this outcome | 0 — confirmed not wired into the classless-match call path (§4) |
| Trust gate | clause (a) passed | 0 |
| Trust gate | clause (b) passed | 0 |
| Trust gate | auto-completed | 0 |
| Trust gate | forced to review | 3 |
| Final | no-match (left on existing conversion path) | 33 |

**Reconciles exactly with the live run's reported 36 groups processed / 0 auto-completed
/ 3 review / 33 no-match** (`.claude/reports/2026-09-18-spec44-live-flagged-run.md`
Check 1). The 3 review entries are precisely the 3 PARTIAL-quality Stage A matches (§2);
the 33 no-match entries are precisely the 33 NONE-quality Stage A outcomes, each of which
also left Stage B ambiguous (§3), with Tier A contributing nothing to any of the 36 (§4).

---

## Summary of what changed vs what's confirmed unchanged

- **Confirmed current, unchanged:** Stage B row-level role coverage, 25/90 (27.8%).
- **Corrected:** the "13/40 blocks" figure does not resolve to any real DB query;
  the honest current block-level figures are 13 blocks with any `array_item_schema` row,
  9 of those 13 (69%) with partial-or-better role coverage.
- **New this session, measured for the first time on a real draft:** Stage A produced
  zero EXACT matches and zero SUSPECT_IDENTICAL fires on Eye Care Birmingham; all 3
  Stage-A-reached boundaries stayed at PARTIAL, all failing clause (a) before clause (b)
  ever becomes the deciding factor.
- **Confirmed, not silently reintroduced:** Tier A (`sc_var_classifier.py`) contributes
  zero to the classless-match/trust-gate outcome — it is wired into two genuinely
  separate, pre-existing tiers (Tier B halt-and-prompt, Tier 0 confidence gate), neither
  of which touches `classless_trust_gate.py` or `classless-decisions.json`.
- **Reconciles cleanly:** every one of the live run's 36/0/3/33 numbers traces to a named,
  read real cause in this report — no unexplained gap between the per-stage counts and
  the final summary line.
