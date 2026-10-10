// The answer sheet (Spec 47 route-accuracy R1): a frozen set of hand-labelled rows every route change is scored on.
// Each row is a false alarm (a difference the tool reports that is not real), a real problem (must stay open) or a wrong
// write (a setting Solve wrote that moved the page away from the draft). A run is scored per surface from three of its
// files: the walk (`round-N/report.json`), its triage (`qa/triage/<surface>.json`) and its `solve-report.json`.
// Rows are matched on state, width, element (ref, else the pair for a block-less row), path, kind and property; never on
// the pair name, which `pairs.mjs` renumbers on every regeneration.

// Triage labels that say a row is a measuring artefact, never a difference to write. A label a real problem can also
// carry (consequence: it follows another row) is deliberately not here, so it can never count as a drop.
export const ARTEFACT_LABELS = [ 'mispaired', 'unmeasured-side', 'same-element', 'ledger-consequence' ];

const noRef = ( ref ) => ! ref || 'None' === ref;

// The match key of a row: state | width | element | path | kind | property.
export function matchKey( { state, width, ref, pair, path, kind, property } ) {
	return [ state ?? '', Number( width ), noRef( ref ) ? `pair:${ pair ?? '' }` : ref, path ?? '', kind, property ].join( '|' );
}

// Every compared row of a walk report, with the run's state and width and its pair name.
export function reportRows( report ) {
	const out = [];
	for ( const run of report?.runs || [] ) {
		for ( const [ pair, p ] of Object.entries( run.pairs || {} ) ) {
			for ( const d of p?.diffs || [] ) {
				out.push( { state: run.state, width: run.width, pair, ref: d.ref ?? null, path: d.path ?? '', kind: d.kind, property: d.key, accepted: d.accepted ?? null } );
			}
		}
	}
	return out;
}

// What the walk says of one sheet row: `open`, `accepted` (every matching row accepted) or `absent`.
function walkOutcome( rows, sheetRow ) {
	const k = matchKey( sheetRow );
	const hits = rows.filter( ( r ) => matchKey( r ) === k );
	if ( ! hits.length ) {
		return 'absent';
	}
	return hits.some( ( r ) => null === r.accepted ) ? 'open' : 'accepted';
}

// The triage verdict for a sheet row, by triage's issue key (ref | path | kind | property).
function triageVerdict( triage, sheetRow ) {
	const key = sheetRow.triageKey || [ sheetRow.ref, sheetRow.path ?? '', sheetRow.kind, sheetRow.property ].join( '|' );
	return ( triage?.verdicts || [] ).find( ( v ) => v.key === key ) || null;
}

// Every setting group a Solve run wrote, kept or reverted.
export function writtenGroups( solve ) {
	return new Set( [ ...( solve?.writes || [] ), ...( solve?.wrong || [] ) ].map( ( w ) => w.group ) );
}

// One sheet row's outcome against a run.
//   false alarm / real problem: `open`, `accepted`, `absent`, or `artefact` (open in the walk but labelled an artefact by
//   triage); `not-scored` without a walk.
//   wrong write: `written` or `avoided`; `not-scored` without a solve report.
export function outcomeOf( sheetRow, { report, triage, solve } ) {
	if ( 'wrong-write' === sheetRow.label ) {
		if ( ! solve ) {
			return 'not-scored';
		}
		const made = writtenGroups( solve );
		return ( sheetRow.groups || [] ).some( ( g ) => made.has( g ) ) ? 'written' : 'avoided';
	}
	if ( ! report ) {
		return 'not-scored';
	}
	const walk = walkOutcome( reportRows( report ), sheetRow );
	if ( 'open' !== walk ) {
		return walk;
	}
	const v = triageVerdict( triage, sheetRow );
	return v && ARTEFACT_LABELS.includes( v.decidedBy ) ? 'artefact' : 'open';
}

// Whether an outcome passes for its label: a false alarm is dropped, a real problem kept, a wrong write avoided.
export function passes( label, outcome ) {
	if ( 'not-scored' === outcome ) {
		return null;
	}
	if ( 'real-problem' === label ) {
		return 'open' === outcome;
	}
	if ( 'wrong-write' === label ) {
		return 'avoided' === outcome;
	}
	return 'open' !== outcome;
}

// Scores every sheet row of one surface against a run: per-row outcomes, and per label (false alarms per pattern) the
// pass, fail and not-scored counts with the outcomes behind them (an `absent` drop can mean the row is no longer measured).
export function scoreSurface( sheet, surface, run ) {
	const rows = sheet.filter( ( r ) => r.surface === surface ).map( ( r ) => {
		const outcome = outcomeOf( r, run );
		return { id: r.id, label: r.label, pattern: r.pattern ?? null, outcome, pass: passes( r.label, outcome ) };
	} );
	const tally = {};
	for ( const r of rows ) {
		const k = 'false-alarm' === r.label ? `false-alarm/p${ r.pattern }` : r.label;
		tally[ k ] ||= { pass: 0, fail: 0, notScored: 0, outcomes: {} };
		tally[ k ][ null === r.pass ? 'notScored' : r.pass ? 'pass' : 'fail' ]++;
		tally[ k ].outcomes[ r.outcome ] = ( tally[ k ].outcomes[ r.outcome ] || 0 ) + 1;
	}
	return { surface, rows, tally };
}

// The ids that pass, per surface: what a baseline records.
export function baselineOf( score ) {
	return { pass: score.rows.filter( ( r ) => true === r.pass ).map( ( r ) => r.id ).sort() };
}

// Rows that passed in the baseline and fail now. A row that never passed is a known miss, reported but not a regression,
// so the gate guards progress without being red from day one.
export function regressions( score, baseline ) {
	const was = new Set( baseline?.pass || [] );
	return score.rows.filter( ( r ) => was.has( r.id ) && true !== r.pass );
}
