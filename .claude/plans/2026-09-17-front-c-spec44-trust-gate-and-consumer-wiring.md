# Front C — Spec 44 trust-gate fixes + structural-facts consumer wiring

**Written:** 2026-09-17, at session close via `/handoff`. This is the orchestration plan for
whoever picks up Front C next — read `.claude/LEDGER.md`'s Front C section first for the
state recap, then this file for the task-by-task plan.

## State recap

The 7-persona `/adversarial-council` re-verification of Spec 44 (2026-09-17) found
`--classless-auto-complete` unsafe and returned NO-GO. Both rollout flags (`--classless-match`,
`--classless-auto-complete`) stay OFF. The structural-facts trio (`block_render_repeaters`,
`block_render_composition`, `block_render_singletons`) is now fully built and
`/qc-council`-validated, but two of the three tables have no consumer wiring at all yet.

## Task 1 — FR-44-1(b) real human-approval gate

**What:** replace the current "forced review once" check (satisfied by the pipeline's own log
write) with a real human-approval artefact. **Why:** this is the single finding all 7 council
personas converged on or independently confirmed — without it, `--classless-auto-complete` can
ship an unreviewed guess after exactly one automated run. **Estimated time:** small — one new
field + one small CLI/UI action, per the council's own concrete proposal (read D1088's
Ship-PM/Cynic/Support-Realist findings, all in `.claude/decisions.md`, for the exact shape
already proposed: an `approved`/`reviewed` boolean field on the log row, settable only by a
genuine human action, not by `append_decision()` itself).

**Orchestration:** delegated, `/subagent-driven-development` (implementer + reviewer). Model:
sonnet implementer, opus reviewer (this is trust-gate logic — the highest-stakes surface in the
whole spec). Depends on: none. Parallel with: Task 2.
**Acceptance:** a real, reproducible test proving a second run for the same client CANNOT
auto-complete without an explicit approval action having happened in between — the exact
scenario the council used to prove the gap exists.

## Task 2 — match-diversity floor on FR-44-1(a)

**What:** refuse "exact structural match" when the matched role sequence is a single repeated
role (e.g. `label, label, label`) — require a minimum of distinct role kinds before treating a
match as strong evidence. **Why:** Ship-PM's council finding — a plain three-line paragraph can
currently look identical to a real repeated block fingerprint. **Estimated time:** small, one
guard clause + a negative-control test.

**Orchestration:** delegated, `/subagent-driven-development`. Model: sonnet implementer, sonnet
reviewer. Depends on: none. Parallel with: Task 1.
**Acceptance:** a real test proving the buybox-price-ladder-shaped 3-label sequence no longer
satisfies clause (a) alone; a genuinely rich, multi-role sequence still does.

## Task 3 — re-measure the safety baseline

**What:** re-run the full Stage A → Stage B → trust gate → log pipeline over the real Eye Care
Birmingham draft's 35 classless groups, now that `block_render_repeaters` holds real data
(unlike last session's "35/0" figure, measured against an empty table). **Why:** the one number
Bean would actually rely on for safety is currently void. **Estimated time:** small — it's a
single orchestrator dry-run against an already-existing draft.

**Orchestration:** inline (main thread) — this is a measurement, not a build task. Depends on:
Tasks 1+2 landing first (re-measuring against a still-unsafe gate wastes the run). Sequential,
not parallel.
**Acceptance:** a real number, with the log/review-page artefacts it produced, replacing the
stale "35/0" figure everywhere it's currently cited (LEDGER, decisions.md).

## Task 4 — structural-facts consumer wiring (Stage A + Spec 45 Tier 4)

**What:** decide and build how `block_render_composition` and `block_render_singletons` roles
fold into a candidate's overall matching fingerprint alongside `block_render_repeaters` roles,
AND how `block_render_singletons` strengthens Spec 45 Tier 4's currently-weak
`dom_shape_classifier` guess. **Why:** both tables are built and proven correct but consumed by
nothing — parked as `P-SPEC44-RENDER-COMPOSITION-CONSUMER` / `P-SPEC44-RENDER-SINGLETON-CONSUMER`
in `.claude/parking.md` (read both entries for the exact blocking question). **Estimated time:**
medium — this needs its own `/brainstorming` pass first (real design question: `role_order` is a
sorted index, not a raw file offset, so merging three tables' sequences into one ordered
fingerprint isn't mechanical).

**Orchestration:** `/brainstorming` (design) → `/subagent-driven-development` (build) → `/qc-council`
(validate), same shape as the singleton table's own build this session. Model: opus for the
brainstorming pass (architecture judgement), sonnet/opus per `/delegate` for the build. Depends
on: none technically, but doing it AFTER Tasks 1-3 land means testing the richer fingerprint
against an already-safer trust gate, not a still-unsafe one.
**Acceptance:** Spec 44 §4.3 and Spec 45 §10 both get their pointer notes upgraded to real
algorithm descriptions (per the discussion that led to this task — a pointer note is only
honest while the consumer is unbuilt); a real before/after measurement showing the richer
fingerprint changes at least one real match outcome on the Eye Care draft.

## Dependency graph

```
Task 1 (approval gate) ─┐
Task 2 (diversity floor)─┼─→ Task 3 (re-measure) ─→ Task 4 (consumer wiring, own brainstorm→SDD→qc-council cycle)
```

## Methodology guardrails (carry forward from this session)

- Council fix-shapes are hypotheses, not specs — validate empirically (`/qc-council`) before
  treating a proposed fix as done.
- Reuse existing primitives across the seeder family (`mask_php`, `markup_view`,
  `derive_roles`, `resolve_sources`, `source_sha`, `_match_pair`) — do not re-implement PHP
  parsing a second time for Task 4's consumer logic either.
- A value-only conditional-attribute detector misses a whole-attribute PHP-ternary toggle —
  check both shapes in any new detector logic (see `.claude/mistakes.md`, 2026-09-17 entry).
- Matching-signal and write-disposition are separate questions — don't exclude content from a
  matcher just because it needs no declared attribute (same mistakes.md date).
