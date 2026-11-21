// The answer sheet: a surface the owner built by hand against the same surface the route cloned, block by block and setting
// by setting. The hand-built side is block markup (a saved-blocks section, lib/block-choice.mjs::parseSavedSections); the
// clone side is the Fill stage's tree (build/qa/fill/<surface>/<run>/filled.tree.json). Blocks of one name are paired by
// how alike they are (equal look settings, shared setting names, the same parent block, then document order), never by
// order alone, so a clone with one container fewer does not shift every later pairing. Each setting row is grouped:
// `look` (what the block paints), `custom-css` (the block's own scoped CSS, where a hand-built look the settings cannot
// hold lives) or `content` (printed words, links, pictures and per-site ids, which differ between any two sites).
// Pure: no file, site or database access; `facts.contentAttrs( name )` comes from the framework database's roles.

// Per-site identifiers and editor notes: they differ between any two sites by nature, so they are content.
const SITE_ID = /^(id|ref)$|Id$|ID$|Note$/;
// The route's own pairing class on a cloned block, never a look.
const ROUTE_CLASS = /^cr-ref-[\w-]+$/;

// A value with every item's `_key` (a per-save id) removed, so two equal item lists compare equal.
export function withoutKeys( value ) {
	if ( Array.isArray( value ) ) {
		return value.map( withoutKeys );
	}
	if ( value && 'object' === typeof value ) {
		return Object.fromEntries( Object.entries( value ).filter( ( [ k ] ) => '_key' !== k ).map( ( [ k, v ] ) => [ k, withoutKeys( v ) ] ) );
	}
	return value;
}

// The class list a block's look depends on: its className less the route's pairing classes ('' when none).
export function lookClasses( className ) {
	return String( className ?? '' ).split( /\s+/ ).filter( ( c ) => c && ! ROUTE_CLASS.test( c ) ).sort().join( ' ' );
}

// Which group a setting belongs to: 'custom-css', 'content' or 'look'.
export function settingGroup( block, attr, facts ) {
	if ( 'sgsCustomCss' === attr ) {
		return 'custom-css';
	}
	if ( SITE_ID.test( attr ) || facts.contentAttrs( block )?.has( attr ) ) {
		return 'content';
	}
	return 'look';
}

// The comparable settings of a block: className reduced to its look classes (dropped when empty), items without keys.
export function comparable( attrs ) {
	const out = {};
	for ( const [ k, v ] of Object.entries( attrs ?? {} ) ) {
		if ( 'className' === k ) {
			const c = lookClasses( v );
			if ( c ) {
				out.className = c;
			}
			continue;
		}
		out[ k ] = withoutKeys( v );
	}
	return out;
}

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

const TIERS = [ 'desktop', 'tablet', 'mobile' ];

// A per-device value ({ desktop, tablet, mobile }, any subset, nothing else) as the value each device shows: a device left
// out takes the next wider one's. Null for any other value.
export function perDevice( v ) {
	if ( ! v || 'object' !== typeof v || Array.isArray( v ) || ! Object.keys( v ).length || ! Object.keys( v ).every( ( k ) => TIERS.includes( k ) ) ) {
		return null;
	}
	const out = {};
	let prev;
	for ( const t of TIERS ) {
		prev = t in v ? v[ t ] : prev;
		out[ t ] = prev;
	}
	return out;
}

// The devices at which two values differ: [] when they show the same everywhere. Two per-device values compare device by
// device; any other pair is one value (every device when it differs).
export function differingDevices( a, b ) {
	const pa = perDevice( a );
	const pb = perDevice( b );
	if ( pa && pb ) {
		return TIERS.filter( ( t ) => ! same( pa[ t ], pb[ t ] ) );
	}
	return same( a, b ) ? [] : [ ...TIERS ];
}

// Every block of a tree in document order: { name, attrs, parent (the parent block's name or null), order }.
// Accepts markup trees ({ name, attrs, innerBlocks }) and route trees ({ name, attributes, innerBlocks }).
export function flatten( roots ) {
	const out = [];
	const walk = ( nodes, parent ) => {
		for ( const b of nodes ?? [] ) {
			if ( ! b?.name ) {
				continue;
			}
			out.push( { name: b.name, attrs: comparable( b.attrs ?? b.attributes ), parent, order: out.length } );
			walk( b.innerBlocks, b.name );
		}
	};
	walk( Array.isArray( roots ) ? roots : [ roots ], null );
	return out;
}

// How alike two blocks of one name are: equal settings count 2, a setting name both hold 1, the same parent block 3.
export function likeness( a, b ) {
	let score = a.parent === b.parent ? 3 : 0;
	for ( const [ k, v ] of Object.entries( a.attrs ) ) {
		if ( k in b.attrs ) {
			score += same( v, b.attrs[ k ] ) ? 2 : 1;
		}
	}
	return score;
}

// Pairs the blocks of one name: the most alike pair first, ties to the closer document position, then the earlier.
export function pairBlocks( hand, clone ) {
	const cands = [];
	hand.forEach( ( h, i ) => clone.forEach( ( c, j ) => cands.push( { i, j, score: likeness( h, c ), gap: Math.abs( i / Math.max( hand.length, 1 ) - j / Math.max( clone.length, 1 ) ) } ) ) );
	cands.sort( ( x, y ) => y.score - x.score || x.gap - y.gap || x.i - y.i || x.j - y.j );
	const usedH = new Set();
	const usedC = new Set();
	const pairs = [];
	for ( const c of cands ) {
		if ( ! usedH.has( c.i ) && ! usedC.has( c.j ) ) {
			usedH.add( c.i );
			usedC.add( c.j );
			pairs.push( [ c.i, c.j ] );
		}
	}
	return pairs.sort( ( x, y ) => x[ 0 ] - y[ 0 ] );
}

// The setting rows of one pair: hand-only, different, clone-only, each with its group.
export function settingRows( name, h, c, facts ) {
	const rows = [];
	for ( const [ k, v ] of Object.entries( h.attrs ) ) {
		if ( ! ( k in c.attrs ) ) {
			rows.push( { kind: 'hand-only', attr: k, hand: v, group: settingGroup( name, k, facts ) } );
		} else {
			const devices = differingDevices( v, c.attrs[ k ] );
			if ( devices.length ) {
				rows.push( { kind: 'different', attr: k, hand: v, clone: c.attrs[ k ], devices, group: settingGroup( name, k, facts ) } );
			}
		}
	}
	for ( const [ k, v ] of Object.entries( c.attrs ) ) {
		if ( ! ( k in h.attrs ) ) {
			rows.push( { kind: 'clone-only', attr: k, clone: v, group: settingGroup( name, k, facts ) } );
		}
	}
	return rows;
}

// The whole comparison: { counts: { name: [ hand, clone ] }, blocks: [ { name, hand, clone, rows } ] } where hand and clone
// are the block's document position on each side (null when that side has no partner), in hand-built document order.
export function compareSurface( handRoots, cloneRoots, facts ) {
	const hand = flatten( handRoots );
	const clone = flatten( cloneRoots );
	const names = [ ...new Set( [ ...hand, ...clone ].map( ( b ) => b.name ) ) ].sort();
	const counts = {};
	const blocks = [];
	for ( const name of names ) {
		const hs = hand.filter( ( b ) => b.name === name );
		const cs = clone.filter( ( b ) => b.name === name );
		counts[ name ] = [ hs.length, cs.length ];
		const pairs = pairBlocks( hs, cs );
		for ( const [ i, j ] of pairs ) {
			blocks.push( { name, hand: hs[ i ].order, clone: cs[ j ].order, rows: settingRows( name, hs[ i ], cs[ j ], facts ) } );
		}
		hs.forEach( ( h, i ) => pairs.some( ( p ) => p[ 0 ] === i ) || blocks.push( { name, hand: h.order, clone: null, rows: [] } ) );
		cs.forEach( ( c, j ) => pairs.some( ( p ) => p[ 1 ] === j ) || blocks.push( { name, hand: null, clone: c.order, rows: [] } ) );
	}
	blocks.sort( ( a, b ) => ( a.hand ?? 1e9 ) - ( b.hand ?? 1e9 ) || ( a.clone ?? 1e9 ) - ( b.clone ?? 1e9 ) );
	return { counts, blocks };
}

// The totals a report leads with: look rows by kind, custom-css rows, content rows, unpaired blocks per side.
export function totals( result ) {
	const t = { 'hand-only': 0, different: 0, 'clone-only': 0, 'custom-css': 0, content: 0, handBlocksUnpaired: 0, cloneBlocksUnpaired: 0 };
	for ( const b of result.blocks ) {
		t.handBlocksUnpaired += null === b.clone ? 1 : 0;
		t.cloneBlocksUnpaired += null === b.hand ? 1 : 0;
		for ( const r of b.rows ) {
			t[ 'look' === r.group ? r.kind : r.group ]++;
		}
	}
	return t;
}

const show = ( v, n ) => {
	const s = JSON.stringify( v );
	return s.length > n ? `${ s.slice( 0, n ) }…` : s;
};

// The report as text: totals, block counts, then each block's look rows, custom CSS rows and (with content) content rows.
export function reportText( result, { content = false } = {} ) {
	const t = totals( result );
	const lines = [
		`look settings: ${ t[ 'hand-only' ] } held only by the hand-built side, ${ t.different } at another value, ${ t[ 'clone-only' ] } held only by the clone; custom CSS rows ${ t[ 'custom-css' ] }; content rows ${ t.content }; blocks with no partner: hand-built ${ t.handBlocksUnpaired }, clone ${ t.cloneBlocksUnpaired }`,
		`block counts (hand-built / clone): ${ Object.entries( result.counts ).map( ( [ n, [ h, c ] ] ) => `${ n.split( '/' ).pop() } ${ h }/${ c }` ).join( ', ' ) }`,
	];
	for ( const b of result.blocks ) {
		const where = `hand-built #${ b.hand ?? '-' }, clone #${ b.clone ?? '-' }`;
		if ( null === b.clone || null === b.hand ) {
			lines.push( '', `=== ${ b.name } (${ where }): ${ null === b.clone ? 'only the hand-built side has it' : 'only the clone has it' }` );
			continue;
		}
		const rows = b.rows.filter( ( r ) => content || 'content' !== r.group );
		if ( ! rows.length ) {
			continue;
		}
		lines.push( '', `=== ${ b.name } (${ where })` );
		for ( const r of rows ) {
			const tag = 'look' === r.group ? r.kind.toUpperCase() : `${ r.group.toUpperCase() } ${ r.kind }`;
			const at = 'different' === r.kind && r.devices.length < 3 ? ` (differs at ${ r.devices.join( ', ' ) })` : '';
			const val = 'different' === r.kind ? `hand-built ${ show( r.hand, 120 ) } | clone ${ show( r.clone, 120 ) }${ at }` : show( 'hand-only' === r.kind ? r.hand : r.clone, 200 );
			lines.push( `  ${ tag }  ${ r.attr } = ${ val }` );
		}
	}
	return lines.join( '\n' );
}
