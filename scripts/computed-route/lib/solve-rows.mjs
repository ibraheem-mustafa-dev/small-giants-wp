// Solve's reading of a walker report (FR-47-3): which open rows it may write, the draft value at every width for each
// (node, element, property), and the classification of the rows that survive the last round.
export const WRITABLE_KINDS = [ 'style', 'hover', 'box' ];

// The CSS property a row's key stands for: icon size rows (on the svg's path) are its width and height; a painted
// ground (the colour an element shows, from its own background or a covering layer) is its background colour.
export const cssProp = ( key ) => ( 'painted-ground' === key ? 'background-color' : key.replace( /^icon-(width|height)$/, '$1' ) );

// The setting state a row's values belong to, from the surface's map of walker state to setting state
// ({ "<walker state>": null | "scrolled" | "open" | "shrunk" | "current" }). undefined = not writable: the walker state
// is unmapped, or the row is a hover in a non-rest state (no setting holds hover-while-scrolled).
export function settingState( r, stateMap ) {
	if ( ! stateMap || ! Object.hasOwn( stateMap, r.state ) ) {
		return undefined;
	}
	if ( 'hover' === r.kind ) {
		return null === stateMap[ r.state ] ? 'hover' : undefined;
	}
	return stateMap[ r.state ];
}

// One key per written thing: node ref, element path, property, setting state ('' = rest).
export const groupKey = ( r, state ) => `${ r.ref }|${ r.path }|${ r.key }|${ state || '' }`;

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

// One draft snapshot's value of prop: on a pseudo layer, at the hover end state, the painted ground (a full-check value
// chrome-walk.mjs stores on extras), a text run's row spacing (row-gap, from its rows), or the collected style.
function draftValueOf( d, prop, hover, pseudo ) {
	if ( pseudo ) {
		return d.pseudo?.[ pseudo ]?.[ prop ];
	}
	if ( hover ) {
		return d.hover?.[ prop ];
	}
	if ( 'painted-ground' === prop ) {
		return d.extras?.ground;
	}
	if ( 'row-gap' === prop && undefined === d.styles?.[ prop ] && d.rows ) {
		return `${ d.rows.space }px`;
	}
	return d.styles?.[ prop ];
}

// The draft's value of `prop` on a pair at every width it was measured (rest styles, or the hover end state), and the
// draft font size there (for em conversions). Read from the pair snapshots, so widths with no difference count too.
// walkerStates: only runs in these walker states are read (the states mapped to the group's setting state).
// pseudo ('::before' / '::after'): the value is read on that painting layer of the pair's element.
// declared: the value the draft's matched rules declare for prop at each width (the walker's DevTools read), when any.
// At a width where a divergence-ledger entry covers the row, the target is the entry's decided value instead.
export function draftValues( report, pair, prop, hover, walkerStates = null, pseudo = null ) {
	const perWidth = {};
	const fontPx = {};
	const declared = {};
	for ( const run of report.runs || [] ) {
		if ( walkerStates && ! walkerStates.includes( run.state ) ) {
			continue;
		}
		const d = run.pairs?.[ pair ]?.draft;
		if ( ! d || d.missing ) {
			continue;
		}
		// A ledgered row (parity/lib/divergences.mjs::judgeDivergence) holds Bean's decided value at this width: that is
		// the target, accepted or drifted, so no group written from other widths overwrites the decision.
		const ruled = ( run.pairs[ pair ].diffs || [] ).find( ( x ) => x.decided && x.key === prop && ( 'hover' === x.kind ) === !! hover && ( x.pseudo || null ) === ( pseudo || null ) );
		const v = ruled ? ruled.decided.value : draftValueOf( d, prop, hover, pseudo );
		if ( undefined !== v ) {
			perWidth[ run.width ] = v;
		}
		if ( ! hover && ! pseudo && undefined !== d.declared?.[ prop ] ) {
			declared[ run.width ] = d.declared[ prop ];
		}
		const fs = parseFloat( d.styles?.[ 'font-size' ] );
		if ( fs ) {
			fontPx[ run.width ] = fs;
		}
	}
	return { perWidth, fontPx, declared };
}

// A declared value a setting can hold as it is: a plain length or percentage (not auto, a keyword, var() or calc()).
export const plainLength = ( v ) => /^-?(\d+(\.\d+)?|\.\d+)(px|rem|em|%|vw|vh|ch)$/.test( String( v ?? '' ) );

// The candidate groups a round may write: style and hover rows with a ref from a mapped walker state, one group per
// groupKey. Box rows, rows without a ref and rows from an unmapped state are returned apart (box rows are derived from
// the spacing that moves them; unreffed rows are unmapped; unmapped-state rows are reported, never written).
export function writableGroups( report, stateMap ) {
	const groups = new Map();
	const box = [];
	const unmapped = [];
	const unmappedState = [];
	const other = [];
	for ( const r of openRows( report ) ) {
		const st = settingState( r, stateMap );
		if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			other.push( r );
		} else if ( undefined === st ) {
			unmappedState.push( r );
		} else if ( ! r.ref ) {
			unmapped.push( r );
		} else if ( 'box' === r.kind ) {
			box.push( r );
		} else {
			const k = groupKey( r, st );
			if ( ! groups.has( k ) ) {
				groups.set( k, { key: k, ref: r.ref, path: r.path, owners: r.owners || [], prop: r.key, state: st, pair: r.pair, pseudo: r.pseudo || null, walkerStates: [], rows: [] } );
			}
			const g = groups.get( k );
			g.rows.push( r );
			if ( ! g.walkerStates.includes( r.state ) ) {
				g.walkerStates.push( r.state );
			}
		}
	}
	return { groups: [ ...groups.values() ], box, unmapped, unmappedState, other };
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
// Rows from an unmapped walker state go to `other` with their reason.
export function classify( report, { writes, gaps, elements, stateMap } ) {
	const written = new Set( writes.filter( ( w ) => ! w.reverted ).map( ( w ) => w.group ) );
	const out = { hardcode: [], missing: [], unresolved: [], derived: [], other: [] };
	for ( const r of openRows( report ) ) {
		if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			out.other.push( r );
			continue;
		}
		const st = settingState( r, stateMap );
		if ( undefined === st ) {
			out.other.push( { ...r, reason: `unmapped-state ${ r.state }` } );
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
		const k = groupKey( r, st );
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
	const key = ( r ) => `${ r.pair }|${ r.state }|${ r.kind }|${ r.key }|${ r.width }`;
	const before = new Map( openRows( prev ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) ).map( ( r ) => [ key( r ), r ] ) );
	return openRows( report ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) && r.ref ).filter( ( r ) => {
		const b = before.get( key( r ) );
		return ! b || rowDistance( r ) > rowDistance( b ) + 0.5;
	} );
}
