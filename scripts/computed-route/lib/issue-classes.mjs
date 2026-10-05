// The one definition of what counts as a distinct open issue, and under which class (Spec 47 §3.3, FR-47-3).
// lib/sweep.mjs and lib/triage.mjs both read the same kinds, the same classes, in the same order, under the same key:
// that is the whole reason a surface's triage count equals its sweep count, and why every delta against a recorded
// total can be explained row for row. Both files held their own copy of these four values, so the identity was held
// BY COPY and could drift silently the moment one side gained a row kind. It lives here instead, imported by both.

// The row kinds that carry page content a setting could hold: a text row (the words differ) and a presence row (an
// element exists on one side only). They are open issues on the page like a visual difference, but no walker state is
// unmapped for them, so they have their own class (CONTENT) rather than UNMAPPED.
export const CONTENT_KINDS = [ 'text', 'presence' ];

// The row kinds that paint something a setting could hold, plus the content kinds. A row of any other kind is reported,
// never counted here (motion, structure, inventory, scroll, drive and L2's tag, active, lines and entrance rows).
export const VISUAL = [ 'style', 'hover', 'box', ...CONTENT_KINDS ];

// Link coverage is not a kind of its own: the walker emits kind `auto` with a key beginning link-missing or link-extra.
// Kind `auto` also carries ordinary word rows and the focus: / active: rows, which are not issues.
export const LINK_COVERAGE_PREFIXES = [ 'link-missing', 'link-extra' ];
const isLinkCoverage = ( x ) => 'auto' === x.kind && LINK_COVERAGE_PREFIXES.some( ( p ) => String( x.key ?? '' ).startsWith( p ) );

// Whether a row is page content (text, presence or link coverage) rather than a visual difference.
export const isContentRow = ( x ) => CONTENT_KINDS.includes( x.kind ) || isLinkCoverage( x );

// Whether a row is a distinct open issue at all: the one test every reader applies to a surviving row.
export const isIssue = ( x ) => VISUAL.includes( x.kind ) || isLinkCoverage( x );

// Solve's classes for a surviving row (lib/solve-rows.mjs::classify), in the order both readers walk them: the first
// class to hold an issue key keeps it.
export const SOLVE_CLASSES = [ 'hardcode', 'missing', 'unresolved', 'derived' ];

// A visual row from a walker state the surface maps to no setting state. Solve files it under `other`, and it is still
// an open issue on the page (solve-report.mjs::wholePage counts it), so it is listed under this class unless a Solve
// class already holds its key. Walked last, after SOLVE_CLASSES, for that reason.
export const UNMAPPED = 'unmapped-state';

// A content row (isContentRow) no Solve class holds. Solve files it under `other`; it is walked after UNMAPPED, which
// never takes a content row, so the two classes never share a row.
export const CONTENT = 'content';

// solve-report.mjs::wholePage's issue key: one element and one property, whatever the width or state. `pair` stands in
// for a row with no ref, which only identifies the same element within one walker config.
export const issueKey = ( x ) => `${ x.ref || x.pair }|${ x.path ?? '' }|${ x.kind }|${ x.key }`;
