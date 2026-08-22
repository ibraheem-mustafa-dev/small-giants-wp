# Step 3 — Make rule 31's gradient assertion MECHANISM-AWARE, both directions

Repo: `c:\Users\Bean\Projects\small-giants-wp`. **Depends on Step 2 being complete and QA Gate A passed.**

## Constraints

- **Run NO git command. Do NOT run `npm run build`.**
- **Touch ONLY** `plugins/sgs-blocks/scripts/inspector-scan/rules/31-golden-colour-control.js`.

## The job

Replace the binary `row-missing-gradient` check. Today it asks "does *a* gradient path exist?" —
which is insufficient in BOTH directions:

- **False PASS** — a row wired to the WRONG mechanism passes while rendering nothing. The
  enforcement programme doc states it verbatim: *"a text row wired to the background mechanism
  would PASS while rendering nothing."*
- **False FAIL** — a SHADOW row is flagged for missing a gradient it cannot have. `box-shadow`
  takes a colour; a gradient there is invalid CSS.

New rule: a row PASSES when its gradient path MATCHES its resolved mechanism (from Step 2).

- A shadow-mechanism row is **EXEMPT** — no gradient possible, so no finding.
- An **UNRESOLVED** row is reported as unresolved. ⛔ **Never as a pass.** A row the resolver
  cannot classify is not evidence of correctness.

⛔ **Do NOT recognise a shadow row by its NAME.** A name heuristic is banned in this codebase —
detect it by the helper it routes to. If no reliable signal exists, report that rather than
inventing one.

## Negative control — MANDATORY, and you must OBSERVE it landing

Both directions, with the actual output quoted in your report:

1. Inject a row wired to the WRONG mechanism → the gate must go **RED**. Restore → **GREEN**.
2. Confirm a shadow row is no longer flagged for a missing gradient.

⚠ This project's own register records a negative control that **did not land** — the corruption
assertion failed and the run passed anyway. "The self-test passes" is not evidence. "I broke it,
it went red, I restored it, it went green" is.

## Expect the total to MOVE, and reconcile it by ENUMERATION

The count may rise. That is not a regression — finding wrongly-wired rows is the point. But the
delta must be reconciled **finding by finding**, never by subtracting totals measured at different
tree states. This project has a recorded incident of exactly that arithmetic going wrong.

## Verify

- `node scripts/inspector-scan/run.js --check` — report the new total and its composition by `kind`.
- Both negative controls observed, both directions.

## Report

The before/after totals with composition. The observed negative-control output. Whether the shadow
signal was reliable or heuristic. Anything you could not do — named.
