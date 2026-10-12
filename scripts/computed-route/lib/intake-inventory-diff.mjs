// Claude Design's inventory against the re-derived one (Spec 48 FR-48-25): every difference is a review row, never a
// silent pick. Records pair by what identifies an effect, never by name or ID: a code record by its file, line and
// mechanism; a template record by its draft and template element; a stylesheet record by its draft and selector. A
// paired record whose compared field differs is one row per field; a record only one side has is one row; a count total,
// a route or a toggling sc-if only one side lists is one row. Rows: { rowId, draftId, text, field, ours, theirs, why }
// with the default mark `ours` (lib/intake-review.mjs renders them). A row ID, and a record row's `ours` or `theirs`,
// is built from the pairing key, never from either side's record IDs (both renumber when a record is inserted), so a
// re-export that adds one record leaves every other row's ID and content hash, and Bean's mark on it, unchanged.

// Values compared alike: times in ms, lower-case, whitespace removed, `auto` fill as `none`.
export function norm( v ) {
	if ( null == v || '' === v ) {
		return null;
	}
	if ( 'number' === typeof v ) {
		return Math.round( v * 1000 ) / 1000;
	}
	const s = String( v ).replace( /\s+/g, '' ).toLowerCase();
	const t = /^(-?\d*\.?\d+)(ms|s)$/.exec( s );
	if ( t ) {
		return Number( t[ 1 ] ) * ( 's' === t[ 2 ] ? 1000 : 1 );
	}
	if ( /^-?\d*\.?\d+$/.test( s ) ) {
		return Number( s );
	}
	return 'auto' === s ? 'none' : s;
}

const same = ( a, b ) => JSON.stringify( norm( a ) ) === JSON.stringify( norm( b ) );
const tplList = ( x ) => [ x ?? [] ].flat().map( String ).sort().join( ',' );
const FAMILY = { waapi: 'waapi', 'waapi-control': 'js', 'js-style-write': 'js', 'js-text-write': 'js', 'js-scroll': 'js', 'js-dom-insert': 'js', 'css-transition': 'css', 'css-pseudo': 'css', 'css-animation': 'css', 'css-media': 'media' };

// The pairing key of an animation record: code records by file, line and family; template records by draft and
// element; stylesheet records by draft and selector.
export function pairKey( r ) {
	const fam = FAMILY[ r.mechanism ] ?? r.mechanism;
	if ( null != r.source?.line && 'template' !== r.source.function ) {
		return `${ r.source.file }|${ r.source.line }|${ fam }`;
	}
	if ( 'css-media' === r.mechanism ) {
		return `${ r.element?.dc }|css-media`;
	}
	if ( null == r.element?.template_tpl_id && r.element?.selection_rule ) {
		return `${ r.element.dc }|media|${ norm( r.element.selection_rule ?? r.element.selector ) }`;
	}
	return `${ r.element?.dc }|tpl|${ tplList( r.element?.template_tpl_id ) }|${ fam }`;
}

// The compared fields of an animation record, normalised: trigger type, timing, status, reduced motion, and per
// property its from and to values.
function fields( r ) {
	const out = {
		'trigger.type': r.trigger?.type, duration_ms: r.duration_ms, delay_ms: r.delay_ms, easing: r.easing, iterations: r.iterations,
		status: r.status, 'reduced_motion.behaviour': r.reduced_motion?.behaviour, properties: ( r.properties || [] ).map( ( p ) => p.property ).sort().join( ',' ),
	};
	for ( const p of r.properties || [] ) {
		out[ `${ p.property }.from` ] = p.from;
		out[ `${ p.property }.to` ] = p.to;
	}
	return out;
}

// Pairs two record lists by key; records sharing a key pair in order. Returns { pairs, ours, theirs } (the unpaired).
function pairUp( ours, theirs, keyOf ) {
	const left = new Map();
	ours.forEach( ( r ) => left.set( keyOf( r ), [ ...( left.get( keyOf( r ) ) || [] ), r ] ) );
	const pairs = [];
	const onlyTheirs = [];
	for ( const t of theirs ) {
		const list = left.get( keyOf( t ) );
		if ( list?.length ) {
			pairs.push( [ list.shift(), t ] );
		} else {
			onlyTheirs.push( t );
		}
	}
	return { pairs, ours: [ ...left.values() ].flat(), theirs: onlyTheirs };
}

const draftOf = ( r ) => ( null != r.source?.line && 'template' !== r.source.function ? `${ r.source.file }:${ r.source.line }` : `${ r.element?.dc }:${ tplList( r.element?.template_tpl_id ) || r.element?.selector }` );
const show = ( v ) => ( null == v ? null : 'object' === typeof v ? JSON.stringify( v ) : String( v ) );

// Diff rows for the animations inventories.
export function diffAnimations( ours, theirs ) {
	const rows = [];
	const { pairs, ours: onlyOurs, theirs: onlyTheirs } = pairUp( ours.records || [], theirs.records || [], pairKey );
	for ( const [ o, t ] of pairs ) {
		const a = fields( o );
		const b = fields( t );
		for ( const f of [ ...new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] ) ] ) {
			if ( ! same( a[ f ], b[ f ] ) ) {
				rows.push( { rowId: `inventory:anim:${ pairKey( o ) }:${ f }`, draftId: draftOf( o ), text: `${ o.id } (theirs ${ t.id }) ${ f }: ours ${ show( a[ f ] ) }, theirs ${ show( b[ f ] ) }`, field: f, ours: show( a[ f ] ), theirs: show( b[ f ] ), why: 'the re-derived record and Claude Design\'s disagree on this field' } );
			}
		}
	}
	onlyOurs.forEach( ( o ) => rows.push( { rowId: `inventory:anim:${ pairKey( o ) }:only-ours`, draftId: draftOf( o ), text: `${ o.id } ${ o.mechanism } ${ o.name } is not in Claude Design's animations.json`, field: 'record', ours: pairKey( o ), theirs: null, why: 'only the re-derived inventory has this effect' } ) );
	onlyTheirs.forEach( ( t ) => rows.push( { rowId: `inventory:anim:theirs:${ pairKey( t ) }:only-theirs`, draftId: draftOf( t ), text: `Claude Design's ${ t.id } ${ t.mechanism } ${ t.name } has no re-derived record`, field: 'record', ours: null, theirs: pairKey( t ), why: 'only Claude Design\'s inventory has this effect' } ) );
	for ( const cat of Object.keys( { ...ours.counts, ...theirs.counts } ) ) {
		const a = ours.counts?.[ cat ]?.total ?? null;
		const b = theirs.counts?.[ cat ]?.total ?? null;
		if ( a !== b ) {
			rows.push( { rowId: `inventory:count:${ cat }`, draftId: cat, text: `count ${ cat }: ours ${ a }, theirs ${ b }`, field: `counts.${ cat }.total`, ours: show( a ), theirs: show( b ), why: 'a recount replaces any count carried from an older inventory' } );
		}
	}
	return rows;
}

// A route key in one spelling: `#/about`, `/about`, `about`, `About.dc.html` → `about`; the home route → `home`.
export const routeKey = ( r ) => String( r ).replace( /\.dc\.html$/i, '' ).replace( /^#?\/?/, '' ).toLowerCase() || 'home';
// An sc-if key in one spelling: `Comp:63`, `Comp#63`, `Comp:63 isOpen` → `Comp:63`.
export const scIfKey = ( k ) => {
	const m = /^(.*?)[#:](\d+)\b/.exec( String( k ) );
	return m ? `${ m[ 1 ] }:${ m[ 2 ] }` : String( k );
};

// Diff rows for the surfaces inventories: routes, toggling sc-ifs, the count totals, and per paired surface (by draft
// and template element, or route) its kind and its number of states.
export function diffSurfaces( ours, theirs ) {
	const rows = [];
	const sets = [
		[ 'route', ( x ) => Object.keys( x.counts?.routes?.covered_by || {} ).map( routeKey ) ],
		[ 'toggling-sc-if', ( x ) => Object.keys( x.counts?.toggling_sc_ifs?.covered_by || {} ).map( scIfKey ) ],
	];
	for ( const [ what, list ] of sets ) {
		const a = new Set( list( ours ) );
		const b = new Set( list( theirs ) );
		[ ...a ].filter( ( k ) => ! b.has( k ) ).forEach( ( k ) => rows.push( { rowId: `inventory:surface:${ what }:${ k }:only-ours`, draftId: k, text: `${ what } ${ k } is listed only in the re-derived surfaces`, field: what, ours: k, theirs: null, why: 'only the re-derived inventory lists it' } ) );
		[ ...b ].filter( ( k ) => ! a.has( k ) ).forEach( ( k ) => rows.push( { rowId: `inventory:surface:${ what }:${ k }:only-theirs`, draftId: k, text: `${ what } ${ k } is listed only in Claude Design's surfaces.json`, field: what, ours: null, theirs: k, why: 'only Claude Design\'s inventory lists it' } ) );
	}
	for ( const cat of [ 'routes', 'toggling_sc_ifs' ] ) {
		const a = ours.counts?.[ cat ]?.total ?? null;
		const b = theirs.counts?.[ cat ]?.total ?? null;
		if ( a !== b ) {
			rows.push( { rowId: `inventory:surface-count:${ cat }`, draftId: cat, text: `surface count ${ cat }: ours ${ a }, theirs ${ b }`, field: `counts.${ cat }.total`, ours: show( a ), theirs: show( b ), why: 'a recount replaces any count carried from an older inventory' } );
		}
	}
	const keyOf = ( s ) => ( s.route && '*' !== s.route ? `route|${ routeKey( s.route ) }` : `${ s.dc }|${ tplList( s.template_tpl_id ) }` );
	const { pairs } = pairUp( ours.records || [], theirs.records || [], keyOf );
	for ( const [ o, t ] of pairs ) {
		if ( o.kind !== t.kind ) {
			rows.push( { rowId: `inventory:surface:${ keyOf( o ) }:kind`, draftId: keyOf( o ), text: `${ o.id } (theirs ${ t.id }) kind: ours ${ o.kind }, theirs ${ t.kind }`, field: 'kind', ours: o.kind, theirs: t.kind, why: 'the re-derived surface and Claude Design\'s disagree on its kind' } );
		}
		if ( o.states.length !== t.states.length ) {
			rows.push( { rowId: `inventory:surface:${ keyOf( o ) }:states`, draftId: keyOf( o ), text: `${ o.id } (theirs ${ t.id }) states: ours ${ o.states.length }, theirs ${ t.states.length }`, field: 'states', ours: String( o.states.length ), theirs: String( t.states.length ), why: 'the re-derived surface and Claude Design\'s list a different number of states' } );
		}
	}
	return rows;
}

// Every diff row, animations then surfaces; `theirs` holds Claude Design's parsed files (either may be null: a missing
// file is one row).
export function diffInventory( ours, theirs ) {
	const rows = [];
	for ( const [ k, fn ] of [ [ 'animations', diffAnimations ], [ 'surfaces', diffSurfaces ] ] ) {
		if ( ! theirs?.[ k ] ) {
			rows.push( { rowId: `inventory:${ k }:missing`, draftId: `${ k }.json`, text: `the export has no readable ${ k }.json`, field: k, ours: 'present', theirs: null, why: theirs?.[ `${ k }Error` ] ?? 'not in the export' } );
		} else {
			rows.push( ...fn( ours[ k ], theirs[ k ] ) );
		}
	}
	const seen = new Map();
	return rows.map( ( r ) => {
		const n = ( seen.get( r.rowId ) || 0 ) + 1;
		seen.set( r.rowId, n );
		return 1 === n ? r : { ...r, rowId: `${ r.rowId }~${ n }` };
	} );
}
