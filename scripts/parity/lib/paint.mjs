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

// Self-contained. A text run: the rendered text of `el` (only its own text nodes when `direct`, every text node inside it
// otherwise; with `match`, a regex source, only the nodes it matches), for a block whose draft text has no element of its
// own (a value sharing its element with a label). Returns { box: the union of the text's rects (page coordinates),
// carrier: the element painting the first text } or null.
export function textRun( el, direct, match = null ) {
	const re = match ? new RegExp( match, 'iu' ) : null;
	const nodes = direct ? [ ...el.childNodes ].filter( ( n ) => 3 === n.nodeType ) : ( () => {
		const out = [];
		const tw = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
		for ( let n = tw.nextNode(); n; n = tw.nextNode() ) {
			out.push( n );
		}
		return out;
	} )();
	let box = null;
	let carrier = null;
	for ( const n of nodes.filter( ( x ) => x.textContent.trim() && ( ! re || re.test( x.textContent ) ) ) ) {
		const rg = document.createRange();
		rg.selectNodeContents( n );
		const b = rg.getBoundingClientRect();
		if ( ! b.width || ! b.height ) {
			continue;
		}
		carrier = carrier || n.parentElement;
		box = box ? { l: Math.min( box.l, b.left ), t: Math.min( box.t, b.top ), r: Math.max( box.r, b.right ), b: Math.max( box.b, b.bottom ) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
	}
	return box ? { box: { x: Math.round( box.l ), y: Math.round( box.t + window.scrollY ), w: Math.round( box.r - box.l ), h: Math.round( box.b - box.t ) }, carrier } : null;
}

// Self-contained. A group: the union of the boxes of the elements at `paths` (CSS selectors), for a block whose draft has
// no element of its own (a form whose fields sit beside a heading in one card). Returns { box, carrier: null } or null.
export function groupBox( paths ) {
	const rects = paths.map( ( p ) => document.querySelector( p ) ).filter( Boolean ).map( ( e ) => e.getBoundingClientRect() ).filter( ( r ) => r.width && r.height );
	if ( ! rects.length ) {
		return null;
	}
	const l = Math.min( ...rects.map( ( r ) => r.left ) );
	const t = Math.min( ...rects.map( ( r ) => r.top ) );
	const w = Math.max( ...rects.map( ( r ) => r.right ) ) - l;
	const h = Math.max( ...rects.map( ( r ) => r.bottom ) ) - t;
	return { box: { x: Math.round( l ), y: Math.round( t + window.scrollY ), w: Math.round( w ), h: Math.round( h ) }, carrier: null };
}

// The source collectPair and hoverStyles rebuild their paint helpers from.
export const PAINT_SRC = [ textCarrier, paintedDecoration, layoutElement, textRun, groupBox ].map( ( f ) => f.toString() ).join( ';\n' );
