// Solve's reading of a walker report (FR-47-3): which open rows it may write, the draft value at every width for each
// (node, element, property), and the classification of the rows that survive the last round.
export const WRITABLE_KINDS = [ 'style', 'hover', 'box' ];

// One key per written thing: node ref, element path, property, state ('hover' for hover rows, else rest).
export const groupKey = ( r ) => `${ r.ref }|${ r.path }|${ r.key }|${ 'hover' === r.kind ? 'hover' : '' }`;

// Every open (unaccepted) row of a report, flattened with its run's state and width and its pair name.
export function openRows( report ) {
	const out = [];
	for ( const run of report.runs || [] ) {
		for ( const [ pair, p ] of Object.entries( run.pairs || {} ) ) {
			for ( const d of p.diffs || [] ) {
				if ( ! d.accepted ) {
					out.push( { ...d, pair, state: run.state, width: run.width } );
				}
			}
		}
	}
	return out;
}

// The draft's value of `prop` on a pair at every width it was measured (rest styles, or the hover end state), and the
// draft font size there (for em conversions). Read from the pair snapshots, so widths with no difference count too.
export function draftValues( report, pair, prop, hover ) {
	const perWidth = {};
	const fontPx = {};
	for ( const run of report.runs || [] ) {
		const d = run.pairs?.[ pair ]?.draft;
		if ( ! d || d.missing ) {
			continue;
		}
		const v = hover ? d.hover?.[ prop ] : d.styles?.[ prop ];
		if ( undefined !== v ) {
			perWidth[ run.width ] = v;
		}
		const fs = parseFloat( d.styles?.[ 'font-size' ] );
		if ( fs ) {
			fontPx[ run.width ] = fs;
		}
	}
	return { perWidth, fontPx };
}

// The candidate groups a round may write: style and hover rows with a ref, one group per groupKey. Box rows and rows
// without a ref are returned apart (box rows are derived from the spacing that moves them; unreffed rows are unmapped).
export function writableGroups( report ) {
	const groups = new Map();
	const box = [];
	const unmapped = [];
	const other = [];
	for ( const r of openRows( report ) ) {
		if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			other.push( r );
		} else if ( ! r.ref ) {
			unmapped.push( r );
		} else if ( 'box' === r.kind ) {
			box.push( r );
		} else {
			const k = groupKey( r );
			if ( ! groups.has( k ) ) {
				groups.set( k, { key: k, ref: r.ref, path: r.path, prop: r.key, state: 'hover' === r.kind ? 'hover' : null, pair: r.pair, rows: [] } );
			}
			groups.get( k ).rows.push( r );
		}
	}
	return { groups: [ ...groups.values() ], box, unmapped, other };
}

// Distance of a row from the draft: px difference for lengths, 0/1 otherwise (used to spot a write that made it worse).
export function rowDistance( r ) {
	const a = parseFloat( r.draft );
	const b = parseFloat( r.live );
	if ( /px$/.test( String( r.draft ) ) && /px$/.test( String( r.live ) ) && ! Number.isNaN( a ) && ! Number.isNaN( b ) ) {
		return Math.abs( a - b );
	}
	return String( r.draft ) === String( r.live ) ? 0 : 1;
}

// Classifies the surviving open rows. writes: every applied write ({ group, attr }); gaps: { groupKey: { gap, detail } }.
// Returns { hardcode, missing, unresolved, derived, other } (intended rows are already accepted, counted apart).
export function classify( report, { writes, gaps, elements } ) {
	const written = new Set( writes.filter( ( w ) => ! w.reverted ).map( ( w ) => w.group ) );
	const out = { hardcode: [], missing: [], unresolved: [], derived: [], other: [] };
	for ( const r of openRows( report ) ) {
		if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			out.other.push( r );
			continue;
		}
		if ( 'box' === r.kind ) {
			out.derived.push( r );
			continue;
		}
		if ( ! r.ref ) {
			out.unresolved.push( { ...r, reason: 'unmapped-element (no ref)' } );
			continue;
		}
		const k = groupKey( r );
		if ( 'breaks-layout' === gaps[ k ]?.gap ) {
			out.hardcode.push( { ...r, reason: gaps[ k ].detail } );
		} else if ( written.has( k ) ) {
			out.hardcode.push( { ...r, reason: 'the setting holds the draft value; paint still differs' } );
		} else if ( 'no-setting' === gaps[ k ]?.gap ) {
			out.missing.push( { ...r, reason: gaps[ k ].detail } );
		} else if ( gaps[ k ] ) {
			out.unresolved.push( { ...r, reason: `${ gaps[ k ].gap }: ${ gaps[ k ].detail }` } );
		} else if ( elements && ! elements( r ) ) {
			out.unresolved.push( { ...r, reason: 'unmapped-element (path unknown to calibration)' } );
		} else {
			out.unresolved.push( { ...r, reason: 'not written' } );
		}
	}
	return out;
}

// Counts accepted rows (intended: config accepts and divergence ledger entries).
export const intendedCount = ( report ) => ( report.runs || [] ).reduce( ( n, run ) => n + Object.values( run.pairs || {} ).reduce( ( m, p ) => m + ( p.diffs || [] ).filter( ( d ) => d.accepted ).length, 0 ), 0 );

// Rows a round made worse: open style or box rows absent from the previous report, or further from the draft there.
export function regressedRows( prev, report ) {
	const key = ( r ) => `${ r.pair }|${ r.kind }|${ r.key }|${ r.width }`;
	const before = new Map( openRows( prev ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) ).map( ( r ) => [ key( r ), r ] ) );
	return openRows( report ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) && r.ref ).filter( ( r ) => {
		const b = before.get( key( r ) );
		return ! b || rowDistance( r ) > rowDistance( b ) + 0.5;
	} );
}
