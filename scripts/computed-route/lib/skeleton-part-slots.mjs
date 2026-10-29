// The draftSlots of a draft element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the
// control that opens the drawer is the navigation block's burger part. Fill reads a part's settings from the draft element
// at the part's calibrated slot, so the absorbed element becomes the node's draftSlots entry at that slot, and the
// element's children become the slots of the part's own sub-parts (the burger's bars) where calibration measured them.
// The part is named by the absorbing rule (`rules.<rule>.part`, a framework DB css_element); its slot is the one most of
// its settings are calibrated at (lib/fill-part-pairing.mjs::partHome). The block itself stays where its own element stands
// (placePart).
import { attrsFor } from './db.mjs';
import { LOOSE } from './resolve.mjs';
import { partHome } from './fill-part-pairing.mjs';

const NTH = /:nth-of-type\((\d+)\)\s*$/;
const PSEUDO = /::(?:before|after)$/;

// The calibrated slot strings the block's settings hold on the part's descendants: { settings entries' slot and slots }
// under `homeSlot`, the settings of any other part (a sub-part, never the wrapper and never a state).
function subPartPaths( db, block, cal, part, homeSlot ) {
	const found = new Set();
	for ( const r of attrsFor( db, block ) ) {
		const s = cal?.settings?.[ r.attr_name ];
		if ( ! s || r.css_state || ! r.css_element || 'wrapper' === r.css_element || part === r.css_element ) {
			continue;
		}
		[ s.slot, ...( s.slots || [] ) ].filter( ( p ) => 'string' === typeof p && p.startsWith( `${ homeSlot } > ` ) ).forEach( ( p ) => found.add( p ) );
	}
	return [ ...found ].sort( ( a, b ) => a.length - b.length || a.localeCompare( b ) );
}

// The draft element a calibrated sub-part path is, walking down from the part's element: a repeated step
// (`:nth-of-type(k)`) is the k-th child; a lone step is the only child; a step with several children below it that
// the next steps count over is a box the draft does not draw (the burger's icon box when the bars sit straight in the
// button), and has no element of its own. Returns { el } or { note }.
function walk( steps, from, kids ) {
	let cur = from;
	for ( let i = 0; i < steps.length; i++ ) {
		const list = kids( cur );
		const nth = NTH.exec( steps[ i ] );
		if ( nth ) {
			cur = list[ Number( nth[ 1 ] ) - 1 ];
		} else if ( 1 === list.length ) {
			cur = list[ 0 ];
		} else if ( list.length > 1 && i < steps.length - 1 && NTH.test( steps[ i + 1 ] ) ) {
			continue;
		} else {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
		if ( ! cur ) {
			return { note: `the draft has no element for ${ steps[ i ] }` };
		}
	}
	return cur === from ? { note: 'the draft has no element of its own for this step' } : { el: cur };
}

// opener: the absorbed draft element; part: the DB css_element it is; m: the inventory model; finder: the element's
// finder; subParts false gives the part's own slot only. Returns { slots: { <calibrated path>: finder }, notes: [text] }.
export function partSlots( { db, block, cal, part, opener, m, finder, subParts = true } ) {
	const out = { slots: {}, notes: [] };
	const home = partHome( db, block, cal, part, null );
	if ( null === home ) {
		out.notes.push( `the calibration has no slot for the ${ part } part of ${ block }, so the ${ opener.key } slot is not given` );
		return out;
	}
	const homeSlot = Object.values( cal.settings ).map( ( s ) => s.slot ).find( ( p ) => LOOSE( p ) === home );
	// A part calibrated at a painted layer (`@scrim::before`) is read from its element: the slot names the element.
	out.slots[ homeSlot.replace( PSEUDO, '' ) ] = finder( opener );
	if ( ! subParts ) {
		return out;
	}
	const kids = ( e ) => m.kids( e ).filter( ( k ) => ! m.isPart( k ) );
	for ( const p of subPartPaths( db, block, cal, part, homeSlot ) ) {
		const steps = p.slice( homeSlot.length + 3 ).split( ' > ' );
		const hit = walk( steps, opener, kids );
		hit.el ? ( out.slots[ p ] = finder( hit.el ) ) : out.notes.push( `${ p }: ${ hit.note }` );
	}
	return out;
}

// Where an absorbed part's block stands (Spec 48 FR-48-6): the block that draws the part (the navigation that draws the
// burger) stays where its own element stands. It never moves into the part's wrapper: that wrapper renders where the part
// renders, and a block shown at a width never nests under one the draft hides at that width (the compact-only box holding
// the burger and a tablet-only call to action is hidden where the desktop navigation shows). A wrapper whose only content
// was the part is dropped when its node holds nothing, so it never paints an empty box; one with other content keeps it,
// and the review says why the block stays beside it.
const above = ( m, x ) => {
	const out = [];
	for ( let p = m.byKey[ x.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
		out.push( p );
	}
	return out;
};
const parentsOf = ( list, out = new Map(), parent = null ) => {
	list.forEach( ( n ) => {
		out.set( n, parent );
		parentsOf( n.innerBlocks || [], out, n );
	} );
	return out;
};

// e: the absorbed part element; node: the absorbing block's node; tree: the skeleton's top-level list; nodeOfKey: element key
// to its block node. Returns { dropped: <wrapper key>, note }, or { note } when the block stays beside the part's wrapper
// (null when the part already sits beside the block, inside it, or in the node the block stands in).
export function placePart( { e, node, tree, nodeOfKey, m } ) {
	const own = m.byKey[ node.draftRef?.tpl ];
	if ( ! own ) {
		return null;
	}
	const mine = above( m, e );
	const common = mine.find( ( a ) => a === own || above( m, own ).includes( a ) );
	const host = common && common !== own ? mine.slice( 0, mine.indexOf( common ) ).find( ( a ) => nodeOfKey[ a.key ] ) : null;
	if ( ! host ) {
		return null;
	}
	const parents = parentsOf( tree );
	const wrap = nodeOfKey[ host.key ];
	if ( ! parents.has( wrap ) || wrap === parents.get( node ) ) {
		return null;
	}
	const hiddenAt = m.shownAt( own ).filter( ( w ) => ! host.visible?.[ w ] );
	const why = hiddenAt.length ? `${ host.key } is hidden at ${ hiddenAt.join( ', ' ) }, where ${ own.key } renders, and a block shown at a width never stands in one the draft hides there` : `${ host.key } renders at ${ own.key }'s widths, so the part's place is not ${ node.name }'s`;
	if ( wrap.innerBlocks?.length || m.kids( host ).some( ( k ) => ! m.isPart( k ) && k !== e && ! mine.includes( k ) ) ) {
		return { note: `${ node.name } stays beside ${ host.key }: ${ why }` };
	}
	const list = parents.get( wrap )?.innerBlocks ?? tree;
	list.splice( list.indexOf( wrap ), 1 );
	return { dropped: host.key, note: `${ host.key } held only the ${ e.key } part, which ${ node.name } draws where it stands (${ why }), so it is not a block` };
}
