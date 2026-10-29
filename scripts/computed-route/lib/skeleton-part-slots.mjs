// The draftSlots of a draft element a drawing block absorbs that is one of the block's own parts (Spec 48 FR-48-6): the
// control that opens the drawer is the navigation block's burger part. Fill reads a part's settings from the draft element
// at the part's calibrated slot, so the absorbed element becomes the node's draftSlots entry at that slot, and the
// element's children become the slots of the part's own sub-parts (the burger's bars) where calibration measured them.
// The part is named by the absorbing rule (`rules.<rule>.part`, a framework DB css_element); its slot is the one most of
// its settings are calibrated at (lib/fill-part-pairing.mjs::partHome). The block itself stands where the part stood in
// the draft's grouping when that changes nothing at its own widths (placePart).
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

// Where an absorbed part's block stands (Spec 48 FR-48-6): the draft groups the part with its wrapper's other content (the
// burger beside a tablet-only call to action, both in a compact-only box), so the block that draws the part is moved into
// the wrapper's node at the part's place, and the wrapper keeps the draft's two-child row and gap. The move is made only
// when it changes nothing at the widths the block's own element renders at: every element from the part up to the wrapper
// below their common ancestor is hidden at the block's widths (so the part is too), and so is every sibling standing
// between the wrapper and the block's element. A wrapper whose only content was the part
// and that cannot take the block is dropped when its node holds nothing, so it never paints an empty box.
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
// to its block node. Returns { placed: <wrapper key> }, { dropped: <wrapper key> }, or { note } when the block stays where
// it is (null when the part already sits beside the block, inside it, or in the node the block stands in).
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
	const from = parents.get( node );
	if ( ! parents.has( wrap ) || wrap === from ) {
		return null;
	}
	const at = m.shownAt( own );
	const hiddenThere = ( x ) => ! at.some( ( w ) => x.visible?.[ w ] );
	const top = ( x ) => [ x, ...above( m, x ) ].find( ( a ) => a.parentKey === common.key );
	const sibs = m.kids( common );
	const [ lo, hi ] = [ sibs.indexOf( top( e ) ), sibs.indexOf( top( own ) ) ].sort( ( a, b ) => a - b );
	let inside = false;
	for ( let p = parents.get( wrap ); p; p = parents.get( p ) ) {
		inside ||= p === from;
	}
	const why = ! mine.slice( 0, mine.indexOf( common ) ).every( hiddenThere ) ? `the elements holding ${ e.key } render at ${ own.key }'s widths` : sibs.slice( lo + 1, hi ).some( ( s ) => ! hiddenThere( s ) ) ? `an element between ${ top( e ).key } and ${ top( own ).key } renders at ${ own.key }'s widths` : ! inside ? `${ host.key } is not inside the node ${ own.key } stands in` : null;
	if ( why ) {
		if ( wrap.innerBlocks?.length || m.kids( host ).some( ( k ) => ! m.isPart( k ) && k !== e && ! mine.includes( k ) ) ) {
			return { note: `${ node.name } stays beside ${ host.key }: ${ why }` };
		}
		const list = parents.get( wrap )?.innerBlocks ?? tree;
		list.splice( list.indexOf( wrap ), 1 );
		return { dropped: host.key, note: `${ host.key } held only the ${ e.key } part, which ${ node.name } draws where it stands (${ why }), so it is not a block` };
	}
	from.innerBlocks.splice( from.innerBlocks.indexOf( node ), 1 );
	const order = ( n ) => m.els.indexOf( m.byKey[ n.variantKey ?? n.draftRef?.tpl ] );
	const list = wrap.innerBlocks;
	const next = list.findIndex( ( n ) => order( n ) > m.els.indexOf( e ) );
	list.splice( next < 0 ? list.length : next, 0, node );
	return { placed: host.key, note: `${ node.name } stands in ${ host.key } where its ${ e.key } part is, beside the wrapper's other content` };
}
