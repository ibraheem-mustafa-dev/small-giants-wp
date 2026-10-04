// Where a pair's properties are painted, for draft-live-walk.mjs's in-page collectors: collect.mjs::collectPair and
// hoverStyles rebuild these from PAINT_SRC, so each function is self-contained.

// Properties read from the element that lays out the pair's children (layoutElement), not the pair's element.
export const LAYOUT_PROPS = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];

// Self-contained (passed to page.evaluate as source). The element whose layout a pair's layout properties describe:
// the first flex or grid container with two or more rendered children, found from the element down a chain of single
// rendered children (a block wrapper, flex or not, holding one inner band that lays out the items), else the element.
// A gap or alignment between fewer than two items paints nothing. The same rule on both sides, so a draft row element
// and a live wrapper-plus-inner band compare the same layout.
export function layoutElement( el, styleOf = ( e ) => getComputedStyle( e ) ) {
	const lays = ( e ) => /(^|-)(flex|grid)$/.test( styleOf( e ).display );
	for ( let a = el; ; ) {
		const kids = [ ...a.children ].filter( ( k ) => k.getClientRects().length && 'none' !== styleOf( k ).display );
		if ( kids.length >= 2 ) {
			return lays( a ) ? a : el;
		}
		if ( 1 !== kids.length ) {
			return el;
		}
		a = kids[ 0 ];
	}
}

// Self-contained. The element painting the first visible text inside el (a button's label span, not the button),
// or null. Text properties at rest and on hover are read from it.
export function textCarrier( el ) {
	const walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT, {
		// The text node's own rects: its parent can be display:contents (no box of its own) and still paint it.
		acceptNode: ( n ) => {
			if ( ! n.textContent.trim() ) {
				return NodeFilter.FILTER_SKIP;
			}
			const range = document.createRange();
			range.selectNodeContents( n );
			return range.getClientRects().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
		},
	} );
	return walker.nextNode()?.parentElement || null;
}

// Self-contained. The underline a visitor sees on the text starting at `from`: text-decoration is not inherited but
// paints through every in-flow descendant, so it comes from the nearest decorated element at or above the text. An
// inline-block, a float or an out-of-flow box stops it reaching further up. Returns that element's computed style, or null.
export function paintedDecoration( from ) {
	for ( let a = from; a && a !== document.documentElement; a = a.parentElement ) {
		const s = getComputedStyle( a );
		if ( 'none' !== s.textDecorationLine ) {
			return s;
		}
		if ( /^inline-/.test( s.display ) || 'none' !== s.cssFloat || /absolute|fixed/.test( s.position ) ) {
			return null;
		}
	}
	return null;
}

// The source collectPair and hoverStyles rebuild their paint helpers from.
export const PAINT_SRC = [ textCarrier, paintedDecoration, layoutElement ].map( ( f ) => f.toString() ).join( ';\n' );
