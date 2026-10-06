# W3-F report: P4 transition calibration markers

Status: done.

## Built
- `scripts/computed-route/lib/calibrate-markers.mjs`: exports `MARKER_DURATION_MS` (437) and `MARKER_EASING` ('linear'); new `transitionMarker` called from `markersFor` after the enum branch (so enum rows keep the enum branch) and before the boolean branch.
  - Duration: only for attr names `transitionDuration` (or `<x>TransitionDuration`) whose css_property lists transition-duration or transition. Written as integer 437 (number type) or '437' (string type); expect '0.437s'. Skipped when the default already is 437.
  - Easing: string-typed, not enum; marker 'linear' (ease-out if the default is linear); never ease-in-out; expect = the keyword.
  - A row with another attribute name, or no type (framework gap: no transition* control) returns no marker.
- `scripts/computed-route/lib/calibrate.mjs`: imports `timingSet` from `../../parity/lib/compare.mjs` (no local copy); `sameFor` uses it for transition-duration / transition-timing-function inside `slotFor` (dead check and `hit`). Re-exports the two marker constants.
- `scripts/computed-route/tests/calibrate.test.mjs`: 5 new tests.

## Dependency checks
- H2: `helpers-tokens.php::sgs_transition_vars` refuses non-integers (default 300, regex digits only); `resolve.mjs::formatValue` calls `timeToMs` (seconds to whole ms).
- `timingSet` exported at `scripts/parity/lib/compare.mjs` (`export const timingSet`).

## Negative control
Command: `node --test scripts/computed-route/tests/calibrate.test.mjs`: 20 pass, 0 fail.
- Red on revert: temporarily set marker to 0.437 and ease-in-out; both "MUST FAIL ON REVERT" tests went red (18 pass, 2 fail); restored, 20 pass.
- No over-reach: enum easing row still yields enum-* labels only; rows for non-transition attributes or untyped rows yield [].

## Not done / notes
- The enum rows were checked synthetically, not by querying the DB per row (DB `%ransition%` with enum_values returned 3 by name; nav-bar-menu names differ). Not fully reconciled to "7".
- Tests did not run the full suite (per instruction). Nothing staged or committed.
