// Universal part pairing (Spec 48 §3.4, FR-48-3): every part a block draws itself is paired with the draft element standing
// in that place under the node's own draft element, so Fill reads the part's look and settings from the draft. The parts
// come from the framework DB and the calibration, never from a rule that names them: each non-wrapper setting
// (`block_attributes.css_element` other than `wrapper`) is calibrated at a slot (`settings.<attr>.slot`, its repeated copies
// in `slots`), and those slots, their ancestors and the block's default paint (the rendered element paths, in document
// order) are the block's part tree. The draft side is the node's own subtree: its elements, stopping at the elements of other
// nodes (the block's inner blocks). Pairing runs down both trees together, by identity, never by class or words (FR-48-10):
//   loop    a repeated part (`:nth-of-type(k)`) is the k-th copy of the draft's repeated template (its sc-for copies, or the
//           elements of the unit the node was built from); a draft with no copies draws one copy at a time, the element
//           standing where the part's single-box chain starts;
//   kind    a part holding a kind of content no sibling part holds (inner blocks, a picture, an svg, words) is the shallowest
//           draft element holding that kind and none of its siblings' kinds; words the draft element holds itself pair the
//           part with that element;
//   order   the parts the block's default render draws, left unpaired, and the draft element's own children left unpaired,
//           equal in number, pair in document order;
//   box     a block root that holds none of the block's box settings itself draws its one child part as the block's box;
//           a draft element with no children of its own is that box.
// A part with no draft element is reported with its reason, never guessed. A part never takes another node's element, nor
// an element holding one unless the part holds the inner blocks.
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { specHit } from './skeleton-facts.mjs';
import { bandSetting } from './fill-band.mjs';

const NTH = /:nth-of-type\((\d+)\)$/;
const LAYER = /::[a-z-]+$/;
const BARE = /^([a-z][a-z0-9-]*)(?::nth-of-type\(\d+\))?$/;
const FONT = [ 'font-size', 'font-family', 'font-weight', 'font-style', 'letter-spacing', 'line-height', 'text-transform' ];
const FIT = [ 'object-fit', 'object-position' ];
const MEDIA_TAGS = [ 'img', 'video', 'picture', 'source' ];
const KINDS = [ 'node', 'media', 'svg', 'words', 'layer' ];
const LAYERED = [ 'absolute', 'fixed' ];

const stepsOf = ( p ) => ( p ? p.split( ' > ' ) : [] );
const parentOf = ( p ) => stepsOf( p ).slice( 0, -1 ).join( ' > ' );
const lastOf = ( p ) => stepsOf( p ).at( -1 ) ?? '';
const propsOf = ( r ) => String( r.css_property || '' ).split( ',' ).map( ( x ) => x.trim() );

// The block's part tree. cal: the block's calibration settings holder ({ settings }); paint: the default paint's element
// paths in document order; inner: whether the node holds inner blocks (a bare-tag path is then an inner block's root, whose
// parent holds the inner blocks). Returns { targets (the calibrated part slots, in order), kids( path ), kinds( path ),
// painted( path ), boxRoot } where kinds are the content kinds the part holds and boxRoot says the root holds none of
// the block's own box settings.
export function partTree( { db, block, cal, paint = [], inner = false } ) {
	const targets = [];
	// The content band is read at the block's root (lib/fill-band.mjs: the root's draft element is the band too).
	const band = bandSetting( db, block, cal );
	const media = new Set();
	const words = new Set();
	let rootBox = false;
	for ( const r of attrsFor( db, block ) ) {
		const s = cal?.settings?.[ r.attr_name ];
		if ( r.css_state || 'string' !== typeof s?.slot ) {
			continue;
		}
		// The element a fit setting was measured on is a picture the block draws, whichever element the DB files it under.
		propsOf( r ).some( ( x ) => FIT.includes( x ) ) && s.slot && media.add( s.slot.replace( LAYER, '' ) );
		if ( 'wrapper' === r.css_element ) {
			continue;
		}
		const copies = [ s.slot, ...( s.slots || [] ) ].filter( ( p ) => 'string' === typeof p && LOOSE( p ) === LOOSE( s.slot ) ).map( ( p ) => p.replace( LAYER, '' ) );
		for ( const p of copies ) {
			if ( band && LOOSE( p ) === LOOSE( band.slot ) ) {
				continue;
			}
			if ( ! p ) {
				rootBox = true;
				continue;
			}
			targets.includes( p ) || targets.push( p );
			propsOf( r ).some( ( x ) => FIT.includes( x ) ) && media.add( p );
			propsOf( r ).some( ( x ) => FONT.includes( x ) ) && words.add( p );
		}
	}
	const paintPaths = Array.isArray( paint ) ? paint : Object.keys( paint || {} );
	const painted = paintPaths.map( ( p ) => p.replace( LAYER, '' ) ).filter( Boolean );
	// A layer: an element the default paint places out of flow (absolute or fixed) at every width it reads.
	const layered = ( p ) => {
		const reads = Object.values( ( Array.isArray( paint ) ? {} : paint )?.[ p ] || {} ).filter( ( r ) => r && r.position );
		return reads.length > 0 && reads.every( ( r ) => LAYERED.includes( r.position ) );
	};
	// An inner block's root, under a block that holds inner blocks: a bare-tag step outside an svg, or a step whose class is
	// another block's root class (`.sgs-<slug>` of a block the framework DB holds).
	const blocks = new Set( db.prepare( 'SELECT DISTINCT block_slug FROM block_attributes' ).all().map( ( r ) => r.block_slug ) );
	const blockOf = ( step ) => {
		const hit = /^\.sgs-([a-z0-9-]+)(?::nth-of-type\(\d+\))?$/.exec( step );
		return hit && `sgs/${ hit[ 1 ] }` !== block && blocks.has( `sgs/${ hit[ 1 ] }` ) ? `sgs/${ hit[ 1 ] }` : null;
	};
	const otherBlock = ( step ) => !! blockOf( step );
	const isInner = ( p ) => inner && ( otherBlock( lastOf( p ) ) || ( BARE.test( lastOf( p ) ) && ! stepsOf( p ).includes( 'svg' ) && ! [ ...MEDIA_TAGS, 'svg' ].includes( BARE.exec( lastOf( p ) )[ 1 ] ) ) );
	const all = [];
	const add = ( p ) => {
		const chain = stepsOf( p ).map( ( _, i, s ) => s.slice( 0, i + 1 ).join( ' > ' ) );
		chain.forEach( ( q ) => all.includes( q ) || all.push( q ) );
	};
	[ ...painted, ...targets ].forEach( add );
	// A part's subtree, its repeated copies' subtrees included: every copy holds what the first holds.
	const under = ( p ) => all.filter( ( q ) => LOOSE( q ) === LOOSE( p ) || LOOSE( q ).startsWith( `${ LOOSE( p ) } > ` ) );
	const kinds = ( p ) => {
		const sub = under( p );
		const out = new Set();
		sub.some( ( q ) => isInner( q ) ) && out.add( 'node' );
		sub.some( ( q ) => media.has( q ) || stepsOf( q ).some( ( s ) => MEDIA_TAGS.includes( BARE.exec( s )?.[ 1 ] ) ) ) && out.add( 'media' );
		sub.some( ( q ) => stepsOf( q ).includes( 'svg' ) ) && out.add( 'svg' );
		sub.some( ( q ) => words.has( q ) ) && out.add( 'words' );
		layered( p ) && out.add( 'layer' );
		return out;
	};
	// A part's child parts, in document order; an inner block's root and everything under it is not a part.
	const kids = ( p ) => all.filter( ( q ) => parentOf( q ) === p && q !== p && ! isInner( q ) && ! stepsOf( p ).some( ( _, i ) => isInner( stepsOf( p ).slice( 0, i + 1 ).join( ' > ' ) ) ) );
	// The inner block a path stands in: the inner root step it passes through, or null.
	const innerRoot = ( p ) => stepsOf( p ).map( ( _, i, s ) => s.slice( 0, i + 1 ).join( ' > ' ) ).find( isInner ) ?? null;
	return { targets, band: band?.slot ?? null, blockOf, kids, kinds, innerRoot, painted: ( p ) => painted.includes( p ), anyPaint: painted.length > 0, boxRoot: ! rootBox };
}

// The draft side: own children, the content kinds an element holds, and the copies of a repeated template under it.
function draftSide( { m, own, isMedia, items } ) {
	const shown = ( e ) => 'svg' === e.tag || Object.values( e.visible || {} ).some( Boolean );
	const kids = ( x ) => ( x.virtual ? items : m.kids( x ).filter( shown ) );
	const supply = new Map();
	const layer = ( x ) => {
		const at = Object.entries( x.position || {} ).filter( ( [ w ] ) => x.visible?.[ w ] );
		return at.length > 0 && at.every( ( [ , v ] ) => LAYERED.includes( v ) );
	};
	const kinds = ( x ) => {
		if ( supply.has( x ) ) {
			return supply.get( x );
		}
		const out = new Set();
		if ( own( x ) ) {
			isMedia( x ) && out.add( 'media' );
			'svg' === x.tag && out.add( 'svg' );
			layer( x ) && out.add( 'layer' );
			! x.virtual && m.words( x ) && out.add( 'words' );
			kids( x ).forEach( ( k ) => kinds( k ).forEach( ( v ) => 'layer' === v || out.add( v ) ) );
		} else {
			out.add( 'node' );
		}
		supply.set( x, out );
		return out;
	};
	// The own descendants of x, shallowest first.
	const below = ( x ) => {
		const out = [];
		let level = kids( x ).filter( own );
		while ( level.length ) {
			out.push( ...level );
			level = level.flatMap( ( k ) => kids( k ).filter( own ) );
		}
		return out;
	};
	const tplOf = ( e ) => String( e.key ).replace( /#\d+$/, '' );
	// The copies of the shallowest template drawn more than once under x (a virtual root's copies are the unit's items).
	const loop = ( x ) => {
		if ( x.virtual ) {
			return items;
		}
		const list = below( x );
		const first = list.find( ( e ) => list.filter( ( o ) => tplOf( o ) === tplOf( e ) ).length > 1 );
		return first ? list.filter( ( o ) => tplOf( o ) === tplOf( first ) ) : null;
	};
	const depth = ( e ) => ( e.virtual ? -1 : e.depth ?? 0 );
	return { kids, kinds, below, loop, depth };
}

// The pairing of one node. el: the node's draft element; items: the elements of the unit the node was built from (a
// list's items), or null; own( e ): whether e belongs to this node's draft (not another node's element); isMedia( e ): a
// picture element; inner: whether the node holds inner blocks; finder( e ): the element's finder. Returns
// { slots: { <calibrated slot>: finder }, unpaired: [ { slot, reason } ] }.
export function pairParts( { db, block, cal, paint = [], m, el, items = null, own, isMedia, children = [], finder } ) {
	const B = partTree( { db, block, cal, paint, inner: children.length > 0 } );
	const out = { slots: {}, unpaired: [] };
	if ( ! B.targets.length ) {
		return out;
	}
	const ownEl = ( e ) => !! e && ( e.virtual || e === el || own( e ) );
	const D = draftSide( { m, own: ownEl, isMedia, items } );
	const root = items ? { virtual: true, key: el.key, depth: el.depth - 1 } : el;
	// The content band is the root's own draft element (lib/fill-band.mjs).
	const at = new Map( [ [ '', root ], ...( B.band ? [ [ B.band, root ] ] : [] ) ] );
	const why = new Map();
	const taken = new Set();
	const holds = ( a, b ) => {
		for ( let p = b; p; p = m.byKey[ p.parentKey ] ) {
			if ( p === a ) {
				return true;
			}
		}
		return false;
	};
	const free = ( y ) => ! taken.has( y ) && ! [ ...taken ].some( ( t ) => t !== y && holds( y, t ) && ! y.virtual );

	const align = ( P, x ) => {
		const next = [];
		const pair = ( c, y ) => {
			at.set( c, y );
			y === x || y.virtual || taken.add( y );
			next.push( [ c, y ] );
		};
		// A repeated part's copies: the k-th copy of the draft's loop under x, or, with no loop and the copies the only parts
		// here (`only`), the first copy is the element x the draft draws one copy at a time as.
		const copiesOf = ( copies, L, only ) => copies.forEach( ( c ) => {
			const k = Number( NTH.exec( lastOf( c ) )[ 1 ] );
			const y = L ? L[ k - 1 ] : only && 1 === k ? x : null;
			y ? pair( c, y ) : why.set( c, L ? `the draft draws ${ L.length } copies of this repeated part` : 'the draft draws one copy of this repeated part, at the first' );
		} );
		let pending = B.kids( P ).filter( ( c ) => ! at.has( c ) );
		// A variant's wrapper: a child holding a part a sibling is too (the linked icon's link around the shape) is the same
		// part in another render, not a box beside it.
		const variant = ( c ) => B.kids( c ).some( ( k ) => pending.some( ( s ) => s !== c && lastOf( s ) === lastOf( k ) ) );
		pending.filter( variant ).forEach( ( c ) => why.set( c, 'a wrapper another render of the block adds around a part, which this draft does not draw' ) );
		pending = pending.filter( ( c ) => ! variant( c ) );

		// loop: the copies of a repeated part standing here.
		// Copies with no loop beside other parts (the slider's two arrows around its track) are left to the order rule.
		for ( const g of [ ...new Set( pending.filter( ( c ) => NTH.test( lastOf( c ) ) ).map( LOOSE ) ) ] ) {
			const L = D.loop( x );
			const only = pending.every( ( c ) => LOOSE( c ) === g );
			if ( L || only ) {
				copiesOf( pending.filter( ( c ) => LOOSE( c ) === g ), L, only );
				pending = pending.filter( ( c ) => LOOSE( c ) !== g );
			}
		}
		// loop: a part whose children are all copies of one repeated part (the list around its items) is the element holding the
		// draft's copies, or a box the draft does not draw when the copies stand straight in x; with no copies and no sibling, the
		// draft draws the part and its one copy as x.
		for ( const c of [ ...pending ] ) {
			const sub = B.kids( c );
			if ( ! sub.length || ! sub.every( ( k ) => NTH.test( lastOf( k ) ) && LOOSE( k ) === LOOSE( sub[ 0 ] ) ) ) {
				continue;
			}
			const L = D.loop( x );
			const box = L ? m.byKey[ L[ 0 ].parentKey ] : null;
			if ( L && box && box !== x && ownEl( box ) && free( box ) && L.every( ( e ) => e.parentKey === box.key ) ) {
				pair( c, box );
			} else if ( L ) {
				why.set( c, 'a box the draft does not draw: the copies stand straight in the element above' );
				copiesOf( sub, L, false );
			} else if ( 1 === pending.length ) {
				pair( c, x );
			} else {
				continue;
			}
			pending = pending.filter( ( s ) => s !== c );
		}

		// kind: a part told apart from its siblings by the kinds it holds (K, the kinds some but not all of them hold) is the
		// shallowest draft element holding exactly those of K; a part holding inner blocks alone may take an element holding
		// another node's element. Words the draft element x holds itself, with no element below holding them, are x's.
		const K = KINDS.filter( ( k ) => pending.some( ( c ) => B.kinds( c ).has( k ) ) && ! pending.every( ( c ) => B.kinds( c ).has( k ) ) );
		for ( const c of [ ...pending ] ) {
			const sig = K.filter( ( k ) => B.kinds( c ).has( k ) );
			if ( ! sig.length ) {
				continue;
			}
			const fits = ( y ) => free( y ) && K.every( ( k ) => sig.includes( k ) === D.kinds( y ).has( k ) ) && ( sig.includes( 'node' ) || ! D.kinds( y ).has( 'node' ) );
			const hits = D.below( x ).filter( fits );
			const top = hits.filter( ( y ) => D.depth( y ) === D.depth( hits[ 0 ] ) );
			if ( 1 === top.length ) {
				pair( c, top[ 0 ] );
			} else if ( ! hits.length && ! x.virtual && sig.every( ( k ) => D.kinds( x ).has( k ) ) && ! D.below( x ).some( ( y ) => sig.some( ( k ) => D.kinds( y ).has( k ) ) ) ) {
				// x itself holds the kinds and nothing below it does (the item's own words).
				pair( c, x );
			} else {
				continue;
			}
			pending = pending.filter( ( s ) => s !== c );
		}

		// order: what the default render draws, against the draft element's own free children.
		const left = B.anyPaint ? pending.filter( B.painted ) : [];
		const rest = D.kids( x ).filter( ( k ) => ownEl( k ) && free( k ) && ! D.kinds( k ).has( 'node' ) );
		if ( left.length && left.length === rest.length ) {
			left.forEach( ( c, i ) => pair( c, rest[ i ] ) );
			pending = pending.filter( ( c ) => ! left.includes( c ) );
		} else if ( 1 === pending.length && 1 === rest.length && [ ...B.kinds( pending[ 0 ] ) ].every( ( k ) => D.kinds( rest[ 0 ] ).has( k ) ) ) {
			// One part left and one own child left, the child holding every kind the part holds (the media part's frame).
			pair( pending[ 0 ], rest[ 0 ] );
			pending = [];
		}

		// box: the block root's one child part is the box a childless draft element draws.
		if ( '' === P && B.boxRoot && 1 === pending.length && ! x.virtual && ! D.kids( x ).filter( ownEl ).length ) {
			pair( pending[ 0 ], x );
			pending = [];
		}
		pending.forEach( ( c ) => why.has( c ) || why.set( c, 'the draft has no element of its own here' ) );
		next.forEach( ( [ c, y ] ) => align( c, y ) );
	};
	align( '', root );

	for ( const t of B.targets ) {
		// An inner block's root (a grid item the block paints) is the k-th inner block's draft element, under the element the
		// part holding the inner blocks is.
		// The host is the nearest paired part above it (the node's element when the draft draws no box of its own for it); an
		// inner block named by its block class is the k-th inner block of that block, a bare tag the k-th inner block.
		const ib = B.innerRoot( t );
		const above = ib ? stepsOf( parentOf( ib ) ).map( ( _, i, s ) => s.slice( 0, s.length - i ).join( ' > ' ) ).concat( '' ).find( ( q ) => at.has( q ) ) : null;
		const host = null === above ? null : at.get( above );
		const named = B.blockOf( lastOf( t ) );
		const pool = named ? children.filter( ( c ) => c.name === named ) : children;
		const kid = ib === t && host ? pool[ Number( NTH.exec( lastOf( t ) )?.[ 1 ] ?? 1 ) - 1 ]?.el : null;
		const y = ib ? ( kid && ( host.virtual || holds( host, kid ) ) ? kid : null ) : at.get( t );
		if ( y && ! y.virtual ) {
			out.slots[ t ] = finder( y );
			continue;
		}
		if ( ib ) {
			out.unpaired.push( { slot: t, reason: ib === t ? 'no inner block of this node stands at this place' : 'inside an inner block, which its own node reads' } );
			continue;
		}
		const up = stepsOf( t ).map( ( _, i, s ) => s.slice( 0, i + 1 ).join( ' > ' ) ).reverse().find( ( q ) => why.has( q ) );
		out.unpaired.push( { slot: t, reason: up ? `${ up === t ? '' : `${ up }: ` }${ why.get( up ) }` : 'the draft has no element of its own here' } );
	}
	return out;
}

// Every node of a proposed skeleton paired (proposeSkeleton's last pass). tree: the skeleton; m: the inventory model;
// rowOf: element key to its proposal row; calSettings( slug ) / calPaint( slug ): the block's calibrated settings and its
// default paint ({ <path>: { <width>: computed style } }, in document order); unitItems: node to the elements of the unit it was built from; mediaSpec: rules.mediaElement (the draft's
// picture custom elements). A node whose draftRef is not one draft element (a selector, none) is not paired. A slot a node
// already holds stands. Returns { paired, unpaired: [ { key, block, slot, reason } ] }, and each row gains `slots`.
export function pairSkeletonParts( { db, tree, m, finder, rowOf = {}, calSettings = () => ( {} ), calPaint = () => ( {} ), unitItems = new Map(), mediaSpec = null } ) {
	const nodes = [];
	const walk = ( list ) => list.forEach( ( n ) => {
		nodes.push( n );
		walk( n.innerBlocks || [] );
	} );
	walk( tree );
	const elOf = ( n ) => ( n.draftRef && 'object' === typeof n.draftRef && n.draftRef.tpl ? m.byKey[ n.draftRef.tpl ] : null );
	const owners = new Map();
	nodes.forEach( ( n ) => elOf( n ) && owners.set( elOf( n ), [ ...( owners.get( elOf( n ) ) || [] ), n ] ) );
	const isMedia = ( e ) => MEDIA_TAGS.includes( e.tag ) || ( e.tag.includes( '-' ) && !! specHit( mediaSpec, e.tag ) );
	const out = { paired: 0, unpaired: [] };
	for ( const n of nodes ) {
		const el = elOf( n );
		if ( ! el ) {
			continue;
		}
		const items = unitItems.get( n ) || null;
		const own = ( e ) => ! owners.has( e ) || owners.get( e ).includes( n ) || ( items || [] ).includes( e );
		const children = ( n.innerBlocks || [] ).filter( elOf ).map( ( c ) => ( { el: elOf( c ), name: c.name } ) );
		const made = pairParts( { db, block: n.name, cal: { settings: calSettings( n.name ) }, paint: calPaint( n.name ), m, el, items, own, isMedia, children, finder } );
		const fresh = Object.fromEntries( Object.entries( made.slots ).filter( ( [ k ] ) => ! ( k in ( n.draftSlots || {} ) ) ) );
		if ( Object.keys( fresh ).length ) {
			n.draftSlots = { ...n.draftSlots, ...fresh };
			rowOf[ el.key ] && ( rowOf[ el.key ].slots = { ...rowOf[ el.key ].slots, ...fresh } );
		}
		out.paired += Object.keys( made.slots ).length;
		made.unpaired.filter( ( u ) => ! ( u.slot in ( n.draftSlots || {} ) ) ).forEach( ( u ) => out.unpaired.push( { key: el.key, block: n.name, ...u } ) );
	}
	return out;
}
