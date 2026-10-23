// Divergence ledger library (FR-47-5): the rules an entry may name, matching a row, finding stale entries, migrating
// walker accepts, and building a new entry from a report row. Entries live in sites/<client>/build/qa/divergences.json.
import fs from 'fs';
import path from 'path';

// Rule names an entry may use instead of a value, each with its meaning. An unknown rule name fails the run.
export const RULES = {
	'touch-target': 'An interactive element is never written below the 24px target size (WCAG 2.2 AA 2.5.8): a smaller draft size is written as 24px (house rule).',
	'bean-choice': 'Bean chose a value other than the draft\'s; the reason names the decision and date.',
	'real-data': 'Live shows real data (counts, prices, stock) where the draft shows placeholder data.',
	'not-painted': 'The property differs with no visible effect; the reason says why nothing paints.',
	'draft-flaw': 'The draft itself is wrong here and live deliberately does better.',
	'accessibility': 'Live differs to meet WCAG 2.1 AA (contrast, focus, motion) where the draft does not.',
	'breakpoint-snap': 'A draft width threshold sits within 5% of an SGS tier (768, 1024), so live uses the tier (Spec 48 FR-48-50, house rule).',
};

const KEYS = [ 'id', 'scope', 'node', 'state', 'property', 'expected', 'reason', 'decided' ];

// Throws on an entry the run cannot use: missing keys, an unknown rule, or both a value and a rule.
export function validate( entries ) {
	const problems = [];
	const ids = new Set();
	entries.forEach( ( e, i ) => {
		KEYS.filter( ( k ) => undefined === e[ k ] ).forEach( ( k ) => problems.push( `entry ${ e.id || '#' + i } has no ${ k }` ) );
		if ( undefined !== e.path && 'string' !== typeof e.path ) {
			problems.push( `entry ${ e.id } path must be a selector path string ("" is the node's own element)` );
		}
		if ( ids.has( e.id ) ) {
			problems.push( `entry ${ e.id } is listed twice` );
		}
		ids.add( e.id );
		const x = e.expected || {};
		if ( ( 'value' in x ) === ( 'rule' in x ) ) {
			problems.push( `entry ${ e.id } needs exactly one of expected.value or expected.rule` );
		}
		if ( 'rule' in x && ! RULES[ x.rule ] ) {
			problems.push( `entry ${ e.id } names unknown rule "${ x.rule }" (known: ${ Object.keys( RULES ).join( ', ' ) })` );
		}
		if ( undefined !== e.register && ( ! Array.isArray( e.register ) || ! e.register.length || e.register.some( ( id ) => 'string' !== typeof id || ! id ) ) ) {
			problems.push( `entry ${ e.id } register must be a non-empty list of register item ids` );
		}
		if ( ! /^\d{4}-\d{2}-\d{2} \S/.test( e.decided || '' ) ) {
			problems.push( `entry ${ e.id } decided must be "YYYY-MM-DD <source>"` );
		}
	} );
	if ( problems.length ) {
		throw new Error( `divergences invalid:\n- ${ problems.join( '\n- ' ) }` );
	}
	return true;
}

export function load( file ) {
	if ( ! fs.existsSync( file ) ) {
		return [];
	}
	const entries = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	validate( entries );
	return entries;
}

const slugClass = ( node ) => 'sgs-' + node.replace( /^sgs\//, '' );

// The element paths a row sits on: its own `path` (a walker report row), or `paths` (a measurement, which holds every
// path of its traced pair). Null when the row names none.
const rowPaths = ( row ) => row.paths ?? ( null == row.path ? null : [ row.path ] );

// Whether an entry covers the row's node (its ref, its block slug or '*'), ignoring state, property and width.
const nodeOk = ( e, row ) => '*' === e.node || e.node === row.ref || !! ( row.block && e.node.includes( '/' ) && slugClass( e.node ) === row.block );

// The entry covering one row: { ref, block, property, state, width, path?, kind? }. Same matching as the walker's
// lib/divergences.mjs: state 'hover' matches hover rows; any other state names the walker state. An entry with a `path`
// (FR-48-9) covers only the row on that element path, and wins over a path-less entry for the same row; a row that names
// no path is never covered by a path-scoped entry.
export function match( entries, row ) {
	const stateOk = ( e ) => '*' === e.state || ( 'hover' === e.state ? 'hover' === row.kind : e.state === row.state );
	const hits = entries.filter( ( e ) => stateOk( e ) &&
		( e.pseudo ?? null ) === ( row.pseudo ?? null ) &&
		( '*' === e.property || e.property === row.property ) &&
		( ! e.widths || e.widths.includes( row.width ) ) &&
		( undefined === e.path || !! rowPaths( row )?.includes( e.path ) ) &&
		nodeOk( e, row ) );
	return hits.find( ( e ) => undefined !== e.path ) || hits[ 0 ] || null;
}

// Every element path of one traced pair: the measured element's, and where its text, layout, icon, underline and paint sit.
const tracePaths = ( t ) => [ ...new Set( [ t.path, t.textPath, t.layoutPath, t.iconPath, t.decoPath, t.paintPath ].filter( ( x ) => null != x ) ) ];

// Every measured property of every traced pair in a walker report: { ref, block, property, state, width, draft, live, paths }.
export function measurements( report ) {
	const out = [];
	for ( const run of report.runs || [] ) {
		for ( const p of Object.values( run.pairs || {} ) ) {
			const trace = p.live?.trace;
			if ( ! trace || ! p.draft?.styles ) {
				continue;
			}
			for ( const [ property, live ] of Object.entries( p.live.styles || {} ) ) {
				out.push( { ref: trace.ref, block: trace.block, property, state: run.state, width: run.width, draft: p.draft.styles[ property ], live, paths: tracePaths( trace ) } );
			}
		}
	}
	return out;
}

const same = ( a, b ) => {
	const n = ( v ) => String( v ?? '' ).replace( /\s+/g, '' );
	const pa = parseFloat( a );
	const pb = parseFloat( b );
	return n( a ) === n( b ) || ( /px$/.test( a ) && /px$/.test( b ) && Math.abs( pa - pb ) <= 0.5 );
};

// Stale entries: a cr-ref node no longer in the tree, a path-scoped entry whose path no measured element of its node has,
// or a measured row where live now equals the draft.
// refs: the set of refs in the surface's tree; rows: measurements().
export function stale( entries, { refs, rows } ) {
	const out = [];
	for ( const e of entries ) {
		if ( e.node.startsWith( 'cr-ref-' ) && refs && ! refs.has( e.node ) ) {
			out.push( { id: e.id, why: `node ${ e.node } no longer exists` } );
			continue;
		}
		const onNode = rows.filter( ( r ) => nodeOk( e, r ) );
		if ( undefined !== e.path && onNode.length && ! onNode.some( ( r ) => rowPaths( r )?.includes( e.path ) ) ) {
			out.push( { id: e.id, why: `path "${ e.path }" matches no element of ${ e.node }` } );
			continue;
		}
		const hits = rows.filter( ( r ) => match( [ e ], r ) );
		if ( hits.length && hits.every( ( r ) => same( r.draft, r.live ) ) ) {
			out.push( { id: e.id, why: `live now equals the draft for ${ e.property } at ${ [ ...new Set( hits.map( ( r ) => r.width ) ) ].join( ', ' ) }` } );
		}
	}
	return out;
}

// A walker config's accept entries that carry only pair, key, kind, state and width migrate one to one (node '*',
// expected rule 'bean-choice' with the accept's reason); entries using when or notPainted stay in the config.
export function migrateAccepts( accepts, { scope, firstId = 1, decided } ) {
	const migrated = [];
	const unmigrated = [];
	let n = firstId;
	for ( const a of accepts || [] ) {
		if ( a.when || a.notPainted || ! a.key ) {
			unmigrated.push( a );
			continue;
		}
		migrated.push( { id: `D-${ n++ }`, scope, node: '*', state: a.state || '*', property: a.key, ...( a.width ? { widths: [ a.width ] } : {} ),
			expected: { rule: 'bean-choice' }, reason: a.reason, decided, pair: a.pair } );
	}
	return { migrated, unmigrated };
}

// Builds the entry accepting one report row (by its id), dated today. rule names a RULES entry in place of the row's
// live value; everyWidth drops the width (every width); everyProperty covers every property of the row's node (a
// decided replacement such as a real embed for a draft sketch); scoped keeps the row's element path, so the entry
// covers that element alone (FR-48-9).
export function entryFromRow( report, rowId, { reason, scope, entries, source = 'Bean', rule = null, everyWidth = false, everyProperty = false, scoped = false } ) {
	for ( const run of report.runs || [] ) {
		for ( const p of Object.values( run.pairs || {} ) ) {
			const d = ( p.diffs || [] ).find( ( x ) => x.id === rowId );
			if ( d ) {
				const next = 1 + Math.max( 0, ...entries.map( ( e ) => Number( String( e.id ).replace( /^D-/, '' ) ) || 0 ) );
				const node = d.ref || ( d.block ? 'sgs/' + d.block.replace( /^sgs-/, '' ) : '*' );
				if ( everyProperty && '*' === node ) {
					throw new Error( `row ${ rowId } names no node, so it cannot cover every property` );
				}
				return { id: `D-${ next }`, scope, node, state: run.state, property: everyProperty ? '*' : d.key,
					...( everyWidth ? {} : { widths: [ run.width ] } ), ...( scoped && null != d.path ? { path: d.path } : {} ), expected: rule || everyProperty ? { rule: rule || 'bean-choice' } : { value: String( d.live ) },
					reason, decided: `${ new Date().toISOString().slice( 0, 10 ) } ${ source }` };
			}
		}
	}
	throw new Error( `row ${ rowId } is not in the report` );
}

// The independent check's differences (sites/<client>/build/qa/independent-check.mjs) use their own keys: each maps to
// the ledger properties that can cover it (its painted inset to padding or the walker's text inset, its text transform
// to text-transform, its box to the walker's box keys).
const INDEPENDENT_KEYS = {
	'box.x': [ 'x' ], 'box.y': [ 'y' ], 'box.w': [ 'w', 'width' ], 'box.h': [ 'h', 'height' ],
	'padding.top': [ 'padding-top', 'text-inset-y' ], 'padding.bottom': [ 'padding-bottom', 'text-inset-y' ],
	'padding.left': [ 'padding-left', 'text-inset-x' ], 'padding.right': [ 'padding-right', 'text-inset-x' ],
	ground: [ 'painted-ground', 'background-color' ], gap: [ 'gap', 'row-gap', 'column-gap' ],
	border: [ 'border-top-width', 'border-top-color', 'border-top-style' ], weight: [ 'font-weight' ],
	letterSpacing: [ 'letter-spacing' ], transform: [ 'text-transform' ],
};

// A value entry holds while live shows the decided value: equal numbers within pxTol (the check reports pixels as
// numbers), else equal text ignoring spaces.
export function holdsValue( expected, live, pxTol = 2 ) {
	const a = parseFloat( expected );
	const b = parseFloat( live );
	const pixels = /^-?(\d+(\.\d+)?|\.\d+)(px)?$/;
	if ( ! Number.isNaN( a ) && ! Number.isNaN( b ) && pixels.test( String( expected ).trim() ) && pixels.test( String( live ).trim() ) ) {
		return Math.abs( a - b ) <= pxTol;
	}
	return String( expected ).replace( /\s+/g, '' ) === String( live ).replace( /\s+/g, '' );
}

// Judges one independent-check difference { ref, width, prop, live } against the ledger, matched on each entry's
// `node` (its ref or its block) like a walker row, in the walker state the check reads (state). Returns
// { accepted: reason } for a rule entry or a value entry live still holds, { drift: entry id } for a value entry live
// has drifted from, or null when no entry covers it.
export function judgeIndependent( entries, diff, { state } ) {
	const block = String( diff.ref ).includes( '/' ) ? slugClass( diff.ref ) : null;
	for ( const property of INDEPENDENT_KEYS[ diff.prop ] || [ diff.prop ] ) {
		const e = match( entries, { ref: diff.ref, block, property, state, width: diff.width, kind: 'style' } );
		if ( ! e ) {
			continue;
		}
		if ( e.expected.rule || holdsValue( e.expected.value, diff.live ) ) {
			return { accepted: `${ e.id } (${ e.expected.rule || 'value ' + e.expected.value }): ${ e.reason }` };
		}
		return { drift: e.id };
	}
	return null;
}

// Adds new entries (the width gate's `breakpoint-snap` entries) to the ledger file, leaving out any the ledger already holds
// (the same node, property, rule and reason), so a re-run adds nothing. Returns the entries it added.
export function addEntries( file, entries ) {
	const held = load( file );
	const same = ( a, b ) => a.node === b.node && a.property === b.property && a.expected?.rule === b.expected?.rule && a.reason === b.reason;
	const fresh = [];
	for ( const e of entries ) {
		if ( ! [ ...held, ...fresh ].some( ( x ) => same( x, e ) ) ) {
			fresh.push( e );
		}
	}
	fresh.length && save( file, [ ...held, ...fresh ] );
	return fresh;
}

export function save( file, entries ) {
	validate( entries );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( entries, null, 2 ) + '\n' );
}
