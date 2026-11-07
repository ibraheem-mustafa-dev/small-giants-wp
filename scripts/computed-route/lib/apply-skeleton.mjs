// The applier's second pairing input: a client's Claude Design skeleton (schema sgs-skeleton/0.1), found by directory search at
// sites/<client>/<any folder>/sgs-skeleton/*.json, so a client without one simply has none. A node carries `b` (block slug), `t`
// (the draft's data-dc-tpl id, sharing the `Root/<t>#n` numbering of the parity pairs; `9+39`, `54/58` and `671-680` name several),
// `slot` (a part the parent block draws itself) and `c` / `item` (children). Its `a` attributes are never read: some name no real
// attribute. Skeleton nodes reach a live block through the pairs already made, never through a guess:
//   - a node whose ids hold a pair is paired;
//   - an unpaired block node takes the live ref that sits between the refs of its neighbouring pairs, has the node's block and
//     is unclaimed (the ref number is the block's pre-order index in the post, the draft id is pre-order too);
//   - a wrapper node whose ids hold no pair, but whose subtree holds a pair on the same block, is an alias of that descendant.
import fs from 'node:fs';
import path from 'node:path';

const DASHES = /[‐-―�-]/;

// The numeric draft ids a `t` names: '9+39' -> [9, 39]; '671-680' -> 671..680; '54/58' -> [54, 58].
export function idsOf( t ) {
	const out = new Set();
	for ( const part of String( t ?? '' ).split( /[+/]/ ) ) {
		const range = new RegExp( `^\\s*(\\d+)\\s*${ DASHES.source }+\\s*(\\d+)\\s*$` ).exec( part );
		if ( range ) {
			for ( let i = Number( range[ 1 ] ); i <= Math.min( Number( range[ 2 ] ), Number( range[ 1 ] ) + 400 ); i++ ) {
				out.add( i );
			}
		} else if ( /^\s*\d+\s*$/.test( part ) ) {
			out.add( Number( part ) );
		}
	}
	return [ ...out ].sort( ( a, b ) => a - b );
}

// Every skeleton file of a client: the first `sgs-skeleton` folder inside any folder of sites/<client>/.
export function skeletonFiles( repo, client ) {
	const root = path.join( repo, 'sites', client );
	if ( ! fs.existsSync( root ) ) {
		return [];
	}
	const out = [];
	for ( const dir of fs.readdirSync( root, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ) ) {
		const folder = path.join( root, dir.name, 'sgs-skeleton' );
		if ( fs.existsSync( folder ) ) {
			out.push( ...fs.readdirSync( folder ).filter( ( f ) => f.endsWith( '.json' ) ).sort().map( ( f ) => path.join( folder, f ) ) );
		}
	}
	return out;
}

// The skeleton surfaces of a client: [ { id, nodes } ] with nodes in pre-order. No file, no surfaces.
export function loadSkeleton( repo, client ) {
	const out = [];
	for ( const file of skeletonFiles( repo, client ) ) {
		const json = JSON.parse( fs.readFileSync( file, 'utf8' ) );
		if ( 'sgs-skeleton/0.1' !== json.schema ) {
			continue;
		}
		for ( const s of json.surfaces || [] ) {
			out.push( { id: s.id, nodes: flatten( s.tree ) } );
		}
	}
	return out;
}

// Pre-order nodes { b, slot, fw, ids, lo, parent (index or -1), depth, last (index of the subtree's final node) }.
export function flatten( tree ) {
	const nodes = [];
	const walk = ( list, parent, depth, isItem = false ) => {
		for ( const n of [].concat( list || [] ) ) {
			if ( ! n || 'object' !== typeof n ) {
				continue;
			}
			const ids = idsOf( n.t );
			const node = { b: n.b ?? null, slot: n.slot ?? null, fw: n.fw ?? null, a: n.a ?? null, range: DASHES.test( String( n.t ?? '' ) ), item: isItem, x: n.x ?? null, ids, lo: ids[ 0 ] ?? null, parent, depth, index: nodes.length, last: nodes.length };
			nodes.push( node );
			walk( n.c, node.index, depth + 1 );
			walk( n.item, node.index, depth + 1, true );
			node.last = nodes.length - 1;
		}
	};
	walk( tree, -1, 0 );
	return nodes;
}

// The skeleton surface a walker surface belongs to: the same name, or the skeleton id as the name's first word.
export function surfaceFor( skeleton, name ) {
	return skeleton.find( ( s ) => s.id === name ) ?? skeleton.find( ( s ) => name.startsWith( `${ s.id }-` ) ) ?? null;
}

// The draft id span a node reaches: its own ids up to the next node with a later first id, and never less than its subtree's ids.
// It finds the pair or alias a node resolves to (an unlisted wrapper's pair sits one id after it); it does not say who owns a record.
export function reachOf( nodes, node ) {
	if ( null === node.lo ) {
		return [];
	}
	const next = nodes.slice( node.last + 1 ).find( ( n ) => null !== n.lo && n.lo > node.lo );
	const subMax = subtreeMax( nodes, node );
	const hi = Math.max( subMax, next ? next.lo - 1 : subMax );
	return Array.from( { length: Math.min( hi - node.lo + 1, 400 ) }, ( _, i ) => node.lo + i );
}

// The last draft id of a node's own subtree: its ids and every descendant node's.
const subtreeMax = ( nodes, node ) => Math.max( node.lo, ...nodes.slice( node.index, node.last + 1 ).flatMap( ( n ) => n.ids ) );

// Draft ids a block node owns for records: its subtree's ids (first id to the subtree's last, never the ids that follow it: an
// unlisted element after the subtree, such as a frame that wraps the next node, is not this node's) less every descendant block's reach.
export function ownedIds( nodes, node ) {
	if ( null === node.lo ) {
		return [];
	}
	const skip = new Set( nodes.slice( node.index + 1, node.last + 1 ).filter( ( n ) => n.b ).flatMap( ( n ) => reachOf( nodes, n ) ) );
	const hi = subtreeMax( nodes, node );
	return reachOf( nodes, node ).filter( ( id ) => id <= hi && ! skip.has( id ) );
}

const idOfTpl = ( tpl ) => Number( /^Root\/(\d+)#\d+$/.exec( String( tpl ?? '' ) )?.[ 1 ] ?? NaN );
const numOfRef = ( ref ) => Number( /-(\d+)$/.exec( String( ref ) )?.[ 1 ] ?? NaN );

// Pairs that give a monotone (draft id, ref number) ladder: the anchors a gap is measured between.
export function anchorsOf( pairs ) {
	const rows = pairs.map( ( p ) => ( { id: idOfTpl( p.tpl ), n: numOfRef( p.ref ), ref: p.ref } ) ).filter( ( r ) => Number.isFinite( r.id ) && Number.isFinite( r.n ) );
	rows.sort( ( a, b ) => a.id - b.id || a.n - b.n );
	const out = [];
	for ( const r of rows ) {
		if ( ! out.length || r.n > out[ out.length - 1 ].n ) {
			out.push( r );
		}
	}
	return out;
}

// Whether two boxes ( { x, y, w, h } ) overlap by at least `min` of the smaller box's area.
export function overlap( a, b ) {
	const w = Math.min( a.x + a.w, b.x + b.w ) - Math.max( a.x, b.x );
	const h = Math.min( a.y + a.h, b.y + b.h ) - Math.max( a.y, b.y );
	const small = Math.min( a.w * a.h, b.w * b.h );
	return w > 0 && h > 0 && small > 0 ? ( w * h ) / small : 0;
}

const words = ( s ) => new Set( String( s ?? '' ).toLowerCase().match( /[a-z0-9]{3,}/g ) ?? [] );

// Position matching inside a paired ancestor, for a live block the pairs cannot reach: the box overlap is at least 0.6, the block
// family (slug) is the same, and the words are shared where either side has text. { draft: { box, text }, live: { box, text, block },
// block } -> true or false. The caller logs every match.
export function positionMatch( { draft, live, block } ) {
	if ( ! draft?.box || ! live?.box || live.block !== block || overlap( draft.box, live.box ) < 0.6 ) {
		return false;
	}
	const a = words( draft.text );
	const b = words( live.text );
	return ! a.size || ! b.size || [ ...a ].some( ( w ) => b.has( w ) );
}

// Targets the skeleton adds to a surface's pairs. pairs: [ { ref, tpl } ]; saved: { ref: { block } } of the post; nodes: the
// skeleton surface's nodes. Returns { targets, notes }: each target { ref, tpl, via: 'skeleton', nearest_tpl, owns, ... }, a slot
// target { ref: `${ parentRef }~${ slot }`, owner, slot, ... }; notes explain every node left unpaired.
export function skeletonTargets( { nodes, pairs, saved } ) {
	const anchors = anchorsOf( pairs );
	const paired = new Map( pairs.map( ( p ) => [ idOfTpl( p.tpl ), p.ref ] ) );
	const used = new Set( pairs.map( ( p ) => p.ref ) );
	const refOf = new Map();
	const notes = [];
	const targets = [];
	const nearest = ( id ) => [ ...anchors ].reverse().find( ( a ) => a.id <= id ) ?? anchors[ 0 ] ?? null;
	const blockNodes = nodes.filter( ( n ) => n.b && null !== n.lo );
	for ( const n of blockNodes ) {
		const hit = n.ids.find( ( id ) => paired.has( id ) && saved[ paired.get( id ) ]?.block === n.b ) ?? n.ids.find( ( id ) => paired.has( id ) );
		if ( undefined !== hit ) {
			refOf.set( n.index, paired.get( hit ) );
		}
	}
	// A wrapper whose ids hold no pair, but whose subtree or id span holds a pair on its own block, is an alias of that block: the
	// logo node that names the wrapper resolves to the logo block paired one id later.
	const alias = new Map();
	for ( const n of blockNodes.filter( ( x ) => ! refOf.has( x.index ) ) ) {
		const span = new Set( reachOf( nodes, n ) );
		const hit = anchors.find( ( a ) => span.has( a.id ) && saved[ a.ref ]?.block === n.b );
		if ( hit ) {
			alias.set( n.index, hit.ref );
			refOf.set( n.index, hit.ref );
		}
	}
	const claimed = new Set();
	const place = ( n, strict ) => {
		const prev = [ ...anchors ].reverse().find( ( a ) => a.id < n.lo );
		const next = anchors.find( ( a ) => a.id > n.lo );
		const lo = prev ? prev.n : -1;
		const hi = next ? next.n : Infinity;
		const gap = blockNodes.filter( ( g ) => g.b === n.b && ! refOf.has( g.index ) && ( ! prev || g.lo > prev.id ) && ( ! next || g.lo < next.id ) );
		const near = strict ? [] : [ prev?.ref, next?.ref ].filter( Boolean );
		const cands = Object.keys( saved ).filter( ( r ) => ( near.includes( r ) || ( numOfRef( r ) > lo && numOfRef( r ) < hi ) ) && saved[ r ].block === n.b && ! claimed.has( r ) && ( ! strict || ! used.has( r ) ) ).sort( ( a, b ) => numOfRef( a ) - numOfRef( b ) );
		return { gap, cands, at: gap.findIndex( ( g ) => g.index === n.index ) };
	};
	for ( const strict of [ true, false ] ) {
		for ( const n of blockNodes.filter( ( x ) => ! refOf.has( x.index ) ) ) {
			const { gap, cands, at } = place( n, strict );
			if ( cands.length !== gap.length ) {
				continue;
			}
			const ref = cands[ at ];
			refOf.set( n.index, ref );
			claimed.add( ref );
			const near = nearest( n.lo );
			// A live block a pair already holds for another draft element is measured against this element too, under its own key.
			targets.push( { key: strict ? ref : `${ ref }@${ n.lo }`, ref, tpl: `Root/${ n.lo }#0`, via: 'skeleton', shared: ! strict, nearest_tpl: near ? `Root/${ near.id }#0` : null, owns: ownedIds( nodes, n ), reach: reachOf( nodes, n ), block: n.b } );
		}
	}
	for ( const n of blockNodes.filter( ( x ) => ! refOf.has( x.index ) ) ) {
		const { gap, cands } = place( n, false );
		notes.push( { id: n.lo, block: n.b, why: `${ cands.length } ${ n.b } between the neighbouring pairs, ${ gap.length } skeleton nodes want one` } );
	}
	// Aliased wrappers and paired nodes carry the ids they own, so a record that names the wrapper reaches the real block.
	const owners = new Map();
	for ( const n of blockNodes ) {
		const ref = refOf.get( n.index );
		if ( ref ) {
			const prev = owners.get( ref ) ?? { owns: [], reach: [] };
			owners.set( ref, { owns: [ ...prev.owns, ...ownedIds( nodes, n ) ], reach: [ ...prev.reach, ...reachOf( nodes, n ) ] } );
		}
	}
	// A pair whose block is the skeleton node's own block but whose draft id sits inside the node (the pair names a child of the
	// node's wrapper): the node's ids are the block's.
	for ( const p of pairs.filter( ( q ) => ! owners.has( q.ref ) ) ) {
		const id = idOfTpl( p.tpl );
		const n = blockNodes.find( ( x ) => x.b === saved[ p.ref ]?.block && reachOf( nodes, x ).includes( id ) );
		n && owners.set( p.ref, { owns: ownedIds( nodes, n ), reach: reachOf( nodes, n ) } );
	}
	// Two or more pairs of one block that each claim the whole of one node (the open-status badge and its next-change line, both
	// inside one hours node): each owns the ids from its own pair to the next pair, the first from the node's start, so a record
	// names one block only. Only a node whose `t` is a range (not alternatives such as `54/58`, which name separate elements) and that holds a pair of its own is split, over the pairs whose draft id its `t` names; a node with a deeper node of its own block inside it, and a pair that claims less than the node, are left.
	for ( const n of blockNodes ) {
		if ( ! n.range || ! refOf.has( n.index ) || nodes.slice( n.index + 1, n.last + 1 ).some( ( x ) => x.b === n.b ) ) {
			continue;
		}
		const span = reachOf( nodes, n );
		const whole = ownedIds( nodes, n );
		const claims = ( q ) => JSON.stringify( owners.get( q.ref )?.owns ) === JSON.stringify( whole );
		const inside = pairs.filter( ( q ) => saved[ q.ref ]?.block === n.b && n.ids.includes( idOfTpl( q.tpl ) ) && ( q.ref === refOf.get( n.index ) || claims( q ) ) ).sort( ( a, b ) => idOfTpl( a.tpl ) - idOfTpl( b.tpl ) );
		if ( inside.length < 2 ) {
			continue;
		}
		const all = new Set( whole );
		inside.forEach( ( q, i ) => {
			const from = 0 === i ? -Infinity : idOfTpl( q.tpl );
			const to = i + 1 < inside.length ? idOfTpl( inside[ i + 1 ].tpl ) - 1 : Infinity;
			owners.set( q.ref, { owns: span.filter( ( id ) => all.has( id ) && id >= from && id <= to ), reach: span.filter( ( id ) => id >= from && id <= to ) } );
		} );
	}
	// A pair no node of its own block holds: the innermost node that holds its id gives it a reach (not ownership).
	for ( const p of pairs.filter( ( q ) => ! owners.has( q.ref ) ) ) {
		const id = idOfTpl( p.tpl );
		const inner = nodes.filter( ( x ) => x.b && null !== x.lo && reachOf( nodes, x ).includes( id ) ).sort( ( a, b ) => reachOf( nodes, a ).length - reachOf( nodes, b ).length )[ 0 ];
		inner && owners.set( p.ref, { owns: [], reach: reachOf( nodes, inner ) } );
	}
	for ( const n of nodes.filter( ( x ) => x.slot && ! x.b && null !== x.lo ) ) {
		let parent = nodes[ n.parent ];
		while ( parent && ! ( parent.b && refOf.has( parent.index ) ) ) {
			parent = nodes[ parent.parent ];
		}
		const owner = parent ? refOf.get( parent.index ) : null;
		if ( owner ) {
			targets.push( { key: `${ owner }~${ n.slot }`, ref: owner, slot: n.slot, tpl: `Root/${ n.lo }#0`, via: 'skeleton-slot', nearest_tpl: nearest( n.lo ) ? `Root/${ nearest( n.lo ).id }#0` : null, owns: [ ...n.ids ] } );
		}
	}
	return { targets, owners, notes, aliases: Object.fromEntries( [ ...alias ].map( ( [ i, r ] ) => [ nodes[ i ].lo, r ] ) ) };
}

// The draft ids of the floating panels other skeleton surfaces draw (each mega surface's own mega-panel node): a menu that opens
// a `panel` part reaches them, since the surface that holds the menu does not hold its panels. The drawer's surface is not one.
export function panelIds( skeleton, surfaceName ) {
	const own = surfaceFor( skeleton, surfaceName );
	return ( skeleton || [] ).filter( ( s ) => s !== own && ! s.nodes.some( ( n ) => 'sgs/nav-drawer' === n.b ) ).flatMap( ( s ) => s.nodes.filter( ( n ) => 'sgs/mega-panel' === n.b ).flatMap( ( n ) => n.ids ) );
}
