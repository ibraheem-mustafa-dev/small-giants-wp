// The header's three slotted rows (Spec 48 §3.4, rules.headerSlots): the pure part of the rule, over an inventory and
// what the fact record says of its elements. A header block always holds exactly three row blocks, `top`, `middle` and
// `bottom`; the draft's main bar (the bar holding the logo or navigation) is the middle row and a strip drawn above or
// below it is the top or bottom row. A strip is either BESIDE the header (a sibling of the header's root: the inventory
// reads those in the page and lists them in `inventory.beside`, with the strips' own elements under `strip` roots) or
// INSIDE it (a direct child of the header root that holds neither navigation nor logo while a sibling does).
// Signals are universal: position, rendering, adjacency, whether an element holds another surface's root, and what an
// element holds. Never a surface name, a client name or a pixel value.

// A declared position that takes the element out of the flow (a fixed or absolute element is an overlay, never a strip).
export const OUT_OF_FLOW = new Set( [ 'fixed', 'absolute' ] );

const outOfFlow = ( ...positions ) => positions.some( ( p ) => OUT_OF_FLOW.has( String( p ?? '' ).trim() ) );

// The strips beside the header, nearest the header first on each side: { before: [ element ], after: [ element ], skipped:
// [ { key, side, why } ] }. Walking outward from the header root, a sibling that is out of flow (declared or computed
// position) or does not render is passed over; the first in-flow sibling that holds the root of another surface (a page,
// footer, drawer or menu; a surface of kind global does not count) ends the walk; any other is a strip. A sibling that
// does not share the header root's template parent (`sameParent`) is not a strip. `declared( element )` is the position
// the template declares ('' or null when none).
export function besideStrips( inventory, { declared = () => null, sameParent = () => true } = {} ) {
	const byKey = new Map( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	const out = { before: [], after: [], skipped: [] };
	for ( const side of [ 'before', 'after' ] ) {
		const list = ( inventory.beside || [] ).filter( ( b ) => b.side === side ).sort( ( a, b ) => a.distance - b.distance );
		for ( const b of list ) {
			const el = byKey.get( b.key );
			const skip = ( why ) => out.skipped.push( { key: b.key, side, why } );
			if ( outOfFlow( b.position, el && declared( el ) ) ) {
				skip( `out of flow (${ el && declared( el ) || b.position })` );
			} else if ( ! b.renders ) {
				skip( 'does not render' );
			} else if ( b.holdsOtherRoot ) {
				skip( 'holds the root of another surface: the walk ends here' );
				break;
			} else if ( ! el?.strip ) {
				skip( 'its elements are not in the inventory' );
			} else if ( ! sameParent( el ) ) {
				skip( 'does not share the header root\'s template parent' );
			} else {
				out[ side ].push( el );
			}
		}
	}
	return out;
}

// The strips inside the header root, nearest the main bar first on each side: { top: [ element ], bottom: [ element ],
// main: [ element ] }. `kids` are the root's block children in document order. A child that holds the navigation or the
// logo (`holdsMain`) is the main bar (every such child: width alternatives are all the main bar); a child before the first
// of them that is in flow is a top strip, one after the last a bottom strip. With no child holding either, nothing is a strip.
export function insideStrips( kids, { holdsMain, declared = () => null } ) {
	const mains = kids.filter( holdsMain );
	if ( ! mains.length ) {
		return { top: [], bottom: [], main: kids };
	}
	const first = kids.indexOf( mains[ 0 ] );
	const last = kids.indexOf( mains.at( -1 ) );
	const strip = ( k, i ) => ! outOfFlow( declared( k ) ) && ( i < first || i > last );
	return {
		top: kids.filter( ( k, i ) => i < first && strip( k, i ) ).reverse(),
		bottom: kids.filter( ( k, i ) => i > last && strip( k, i ) ),
		main: kids.filter( ( k, i ) => ! strip( k, i ) ),
	};
}

// The row each side gets, and the strips left over: { top, bottom, extras: [ { el, side, taken } ], used: [ element ] }.
// The candidates of a side are listed nearest the main bar first (the inside strips, then those beside the header,
// nearest the header first); the first is the row and every other strip on that side has no row to take (a header holds
// exactly three), so it is an extra for the proposal to name.
export function slotPlan( { beside, inside } ) {
	const side = ( a, b ) => {
		const [ first, ...rest ] = [ ...a, ...b ];
		return { row: first ?? null, extras: rest.map( ( el ) => ( { el, taken: first.key } ) ) };
	};
	const top = side( inside.top, beside.before );
	const bottom = side( inside.bottom, beside.after );
	return {
		top: top.row, bottom: bottom.row,
		extras: [ ...top.extras.map( ( x ) => ( { ...x, side: 'top' } ) ), ...bottom.extras.map( ( x ) => ( { ...x, side: 'bottom' } ) ) ],
	};
}
