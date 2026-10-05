// The one definition of what counts as a distinct open issue, and under which class (Spec 47 §3.3, FR-47-3).
// lib/sweep.mjs and lib/triage.mjs both read the same kinds, the same classes, in the same order, under the same key:
// that is the whole reason a surface's triage count equals its sweep count, and why every delta against a recorded
// total can be explained row for row. Both files held their own copy of these four values, so the identity was held
// BY COPY and could drift silently the moment one side gained a row kind. It lives here instead, imported by both.

// The row kinds that paint something a setting could hold. A row of any other kind is reported, never counted here.
export const VISUAL = [ 'style', 'hover', 'box' ];

// Solve's classes for a surviving row (lib/solve-rows.mjs::classify), in the order both readers walk them: the first
// class to hold an issue key keeps it.
export const SOLVE_CLASSES = [ 'hardcode', 'missing', 'unresolved', 'derived' ];

// A visual row from a walker state the surface maps to no setting state. Solve files it under `other`, and it is still
// an open issue on the page (solve-report.mjs::wholePage counts it), so it is listed under this class unless a Solve
// class already holds its key. Walked last, after SOLVE_CLASSES, for that reason.
export const UNMAPPED = 'unmapped-state';

// solve-report.mjs::wholePage's issue key: one element and one property, whatever the width or state. `pair` stands in
// for a row with no ref, which only identifies the same element within one walker config.
export const issueKey = ( x ) => `${ x.ref || x.pair }|${ x.path ?? '' }|${ x.kind }|${ x.key }`;
