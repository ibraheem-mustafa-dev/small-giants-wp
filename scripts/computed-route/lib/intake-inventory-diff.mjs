// Claude Design's inventory against the re-derived one (Spec 48 FR-48-25): every difference is a review row, never a
// silent pick. Records pair by what identifies an effect, never by name or ID: a code record by its file, line and
// mechanism; a template record by its draft and template element; a stylesheet record by its draft and selector. A
// paired record whose compared field differs is one row per field; a record only one side has is one row; a count total,
// a route or a toggling sc-if only one side lists is one row. Rows: { rowId, draftId, text, field, ours, theirs, why }
// with the default mark `ours` (lib/intake-review.mjs renders them). A row ID, and a record row's `ours` or `theirs`,
// is built from the pairing key, never from either side's record IDs (both renumber when a record is inserted), so a
// re-export that adds one record leaves every other row's ID and content hash, and Bean's mark on it, unchanged.

// Values compared alike: times in ms, lower-case, whitespace collapsed to one space and removed wherever a neighbour is
// not part of a word or number (`rgba(0, 0, 0)` is `rgba(0,0,0)`, `1 0px` stays two numbers), `auto` fill as `none`,
// and every number in a value in one spelling (`.01ms` and `0.01ms`, `1.50` and `1.5`), never a digit inside a word or
// a hex colour.
export function norm( v ) {
	if ( null == v || '' === v ) {
		return null;
	}
	if ( 'number' === typeof v ) {
		return Math.round( v * 1000 ) / 1000;
	}
	const s = String( v ).trim().replace( /\s+/g, ' ' ).replace( / (?![\w.%#-])|(?<![\w.%#-]) /g, '' ).toLowerCase().replace( /(?<![\w#.])(-?)(\d*\.?\d+)(?![\d.])/g, ( m, sign, n ) => String( Number( sign + n ) ) );
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

// Pairs two record lists by key. Records sharing a key pair by likeness when `cost` is given (the unpaired record of
// ours that `cost( ours, theirs )` scores lowest, the earlier one on a tie: two effects at one call site pair with
// their own counterparts whatever order either side lists them in), else in order. Returns { pairs, ours, theirs }
// (the unpaired).
function pairUp( ours, theirs, keyOf, cost = null ) {
	const left = new Map();
	ours.forEach( ( r ) => left.set( keyOf( r ), [ ...( left.get( keyOf( r ) ) || [] ), r ] ) );
	const pairs = [];
	const onlyTheirs = [];
	for ( const t of theirs ) {
		const list = left.get( keyOf( t ) );
		if ( list?.length ) {
			const at = cost ? list.reduce( ( best, o, i ) => ( cost( o, t ) < cost( list[ best ], t ) ? i : best ), 0 ) : 0;
			pairs.push( [ list.splice( at, 1 )[ 0 ], t ] );
		} else {
			onlyTheirs.push( t );
		}
	}
	return { pairs, ours: [ ...left.values() ].flat(), theirs: onlyTheirs };
}

// How many distinct records of `list` share each key.
const groupCount = ( list, keyOf ) => [ ...new Set( list ) ].reduce( ( m, r ) => m.set( keyOf( r ), ( m.get( keyOf( r ) ) || 0 ) + 1 ), new Map() );
const draftOf = ( r ) => ( null != r.source?.line && 'template' !== r.source.function ? `${ r.source.file }:${ r.source.line }` : `${ r.element?.dc }:${ tplList( r.element?.template_tpl_id ) || r.element?.selector }` );
const show = ( v ) => ( null == v ? null : 'object' === typeof v ? JSON.stringify( v ) : String( v ) );

// The fields of two records that differ: [ [ field, ours, theirs ] ].
const differing = ( o, t ) => {
	const a = fields( o );
	const b = fields( t );
	return [ ...new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] ) ].filter( ( f ) => ! same( a[ f ], b[ f ] ) ).map( ( f ) => [ f, a[ f ], b[ f ] ] );
};

// Diff rows for the animations inventories. A record of Claude Design's that names several template elements (one
// call site animating each) covers every re-derived record at its key whose element it names, so none of them is
// "only ours"; a difference already listed for a key, with the same two values, is listed once.
export function diffAnimations( ours, theirs ) {
	const rows = [];
	const paired = pairUp( ours.records || [], theirs.records || [], pairKey, ( o, t ) => differing( o, t ).length );
	const { pairs, theirs: onlyTheirs } = paired;
	const names = ( t ) => [ t.element?.template_tpl_id ?? [] ].flat().map( String );
	const onlyOurs = paired.ours.filter( ( o ) => {
		const t = pairs.map( ( p ) => p[ 1 ] ).find( ( x ) => pairKey( x ) === pairKey( o ) && names( x ).length > 1 && names( x ).includes( String( o.element?.template_tpl_id ) ) );
		return t ? ( pairs.push( [ o, t ] ), false ) : true;
	} );
	const listed = new Set();
	const atKey = groupCount( pairs.map( ( p ) => p[ 1 ] ), pairKey );
	for ( const [ o, t ] of pairs ) {
		// Several effects of theirs at one call site: each row names its own record by what it animates and on what trigger.
		const which = atKey.get( pairKey( t ) ) > 1 ? `#${ norm( o.trigger?.type ) }|${ fields( o ).properties }` : '';
		for ( const [ f, av, bv ] of differing( o, t ) ) {
			const once = JSON.stringify( [ pairKey( o ), f, show( av ), show( bv ) ] );
			if ( ! listed.has( once ) ) {
				listed.add( once );
				rows.push( { rowId: `inventory:anim:${ pairKey( o ) }${ which }:${ f }`, draftId: draftOf( o ), text: `${ o.id } (theirs ${ t.id }) ${ f }: ours ${ show( av ) }, theirs ${ show( bv ) }`, field: f, ours: show( av ), theirs: show( bv ), why: 'the re-derived record and Claude Design\'s disagree on this field' } );
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
