// The header's three slotted rows (Spec 48 §3.4, rules.headerSlots): the pure part of the rule, over an inventory and
// what the fact record says of its elements. A header block always holds exactly three row blocks, `top`, `middle` and
// `bottom`; the draft's main bar (the bar holding the logo or navigation) is the middle row and a strip drawn above or
// below it is the top or bottom row. A strip is either BESIDE the header (a sibling of the header's root: the inventory
// reads those in the page and lists them in `inventory.beside`, with the strips' own elements under `strip` roots) or
// INSIDE it (a direct child of the header root that holds neither navigation nor logo, is in flow and is stacked above or
// below the main bar). Either way a strip is stacked: its rendered box lies wholly above or wholly below the bar's box at
// every width where both render; an element inline with the bar is part of the bar.
// Signals are universal: position, rendering, adjacency, whether an element holds another surface's root, and what an
// element holds. Never a surface name, a client name or a pixel value.

// A declared position that takes the element out of the flow (a fixed or absolute element is an overlay, never a strip).
export const OUT_OF_FLOW = new Set( [ 'fixed', 'absolute' ] );

const outOfFlow = ( ...positions ) => positions.some( ( p ) => OUT_OF_FLOW.has( String( p ?? '' ).trim() ) );

// Whether an element draws a box at a width: the inventory carries a box and a visibility per read width, and a width the
// element is not drawn at (display none, no layout box) is a width it does not render at.
const drawnAt = ( el, w ) => !! el?.box?.[ w ] && el.box[ w ].w > 0 && el.box[ w ].h > 0 && false !== el.visible?.[ w ];
const widthsOf = ( el ) => Object.keys( el?.box || {} );

// Whether an element lies wholly above (side 'top') or wholly below (side 'bottom') a reference box at every read width where
// both are drawn, and at one width at least. `refAt( w )` is the reference box at that width or null (the reference is not
// drawn there). A box one pixel short of touching still counts as touching (rounding of fractional layout).
export function stackedOn( el, side, refAt ) {
	const widths = widthsOf( el ).filter( ( w ) => drawnAt( el, w ) && refAt( w ) );
	return widths.length > 0 && widths.every( ( w ) => {
		const a = el.box[ w ];
		const r = refAt( w );
		return 'top' === side ? a.y + a.h <= r.y + 1 : a.y >= r.y + r.h - 1;
	} );
}

// The strips beside the header, nearest the header first on each side: { before: [ element ], after: [ element ], skipped:
// [ { key, side, why } ] }. Walking outward from the header root, a sibling that is out of flow (declared or computed
// position) or does not render is passed over; the first in-flow sibling that is, or holds at any depth, the root of another
// surface (a page, footer, drawer, panel, menu or form; a surface of kind global does not count) ends the walk; any other
// is a strip when it is stacked: wholly above (before) or below (after) the header root's box at every width where both
// render. A sibling that does not share the header root's template parent (`sameParent`) is not a strip. An export with no
// surface for the page reads a plain in-flow block stacked next to the header as a strip, since no signal tells it from
// one; the strip is listed for review. `declared( element )` is the position the template declares ('' or null when none).
export function besideStrips( inventory, { declared = () => null, sameParent = () => true } = {} ) {
	const byKey = new Map( inventory.elements.map( ( e ) => [ e.key, e ] ) );
	const root = byKey.get( inventory.checks?.rootKey ) || inventory.elements.find( ( e ) => ! e.parentKey && ! e.strip );
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
			} else if ( ! stackedOn( el, 'before' === side ? 'top' : 'bottom', ( w ) => ( drawnAt( root, w ) ? root.box[ w ] : null ) ) ) {
				skip( `not stacked ${ 'before' === side ? 'above' : 'below' } the header root at every width where both render` );
			} else {
				out[ side ].push( el );
			}
		}
	}
	return out;
}

// The strips inside the header root, nearest the main bar first on each side: { top: [ element ], bottom: [ element ],
// main: [ element ] }. `kids` are the root's block children in document order. A child that holds the navigation or the
// logo (`holdsMain`) is the main bar (every such child: width alternatives are all the main bar). A child before the first
// of them (after the last) is a top (bottom) strip when it renders at some width, is in flow (neither declared nor computed
// fixed or absolute at a width it renders at) and is stacked: wholly above (below) the main bar's box at every width where
// both render. A child inline with the main bar (a call to action, a burger, social links) is part of the main bar. A child
// hidden at some widths is still a strip where it renders. With no child holding either, nothing is a strip.
export function insideStrips( kids, { holdsMain, declared = () => null } ) {
	const mains = kids.filter( holdsMain );
	if ( ! mains.length ) {
		return { top: [], bottom: [], main: kids };
	}
	const first = kids.indexOf( mains[ 0 ] );
	const last = kids.indexOf( mains.at( -1 ) );
	const barAt = ( side ) => ( w ) => {
		const bar = 'top' === side ? mains.find( ( m ) => drawnAt( m, w ) ) : [ ...mains ].reverse().find( ( m ) => drawnAt( m, w ) );
		return bar ? bar.box[ w ] : null;
	};
	const inFlow = ( k ) => ! outOfFlow( declared( k ) ) && ! widthsOf( k ).some( ( w ) => drawnAt( k, w ) && outOfFlow( k.position?.[ w ] ) );
	const strip = ( k, i ) => {
		const side = i < first ? 'top' : 'bottom';
		return ( i < first || i > last ) && inFlow( k ) && stackedOn( k, side, barAt( side ) );
	};
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
