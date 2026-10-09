// Where a pair's properties are painted, for draft-live-walk.mjs's in-page collectors: collect.mjs::collectPair and
// hoverStyles rebuild these from PAINT_SRC, so each function is self-contained.

// Properties read from the element that lays out the pair's children (layoutElement), not the pair's element.
export const LAYOUT_PROPS = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];

// Whether a layout or display row means anything. A pair's snapshot carries its layout element's display
// (collect.mjs::collectPair, layoutDisplay). Gaps always compare: a side not laying out with flex or grid reads its
// gap as the 0 it paints, so a block stack against a flex column with a gap is a real row. The other layout
// properties compare only where both sides lay out their children with flex or grid, and a property of one model
// (grid tracks, flex wrap and direction) only where both use that model: a block stack and a gapless flex column paint
// the same, and the children's flow rows judge where the children sit. A display row between two block-level values
// is the same judgement (the box sits in the flow the same way).
const GAPS = [ 'gap', 'row-gap', 'column-gap' ];
const MODEL = { 'grid-template-columns': /grid$/, 'flex-wrap': /flex$/, 'flex-direction': /flex$/ };
const BLOCK_LEVEL = new Set( [ 'block', 'flow-root', 'flex', 'grid', 'list-item' ] );
export function layoutComparable( prop, d, l ) {
	if ( 'display' === prop ) {
		return ! ( BLOCK_LEVEL.has( d.styles?.display ) && BLOCK_LEVEL.has( l.styles?.display ) );
	}
	if ( GAPS.includes( prop ) || ! LAYOUT_PROPS.includes( prop ) || undefined === d.layoutDisplay || undefined === l.layoutDisplay ) {
		return true;
	}
	const model = MODEL[ prop ] || /(^|-)(flex|grid)$/;
	return model.test( d.layoutDisplay ) && model.test( l.layoutDisplay );
}

// Self-contained (passed to page.evaluate as source). The element whose layout a pair's layout properties describe:
// the first flex or grid container with two or more rendered children, found from the element down a chain of single
// rendered children (a block wrapper, flex or not, holding one inner band that lays out the items), else the element.
// A gap or alignment between fewer than two items paints nothing. The same rule on both sides, so a draft row element
// and a live wrapper-plus-inner band compare the same layout. A closed <details> that renders its <summary> plus
// collapsed content counts only its <summary>: a visitor sees one child, and a draft that drops the answer when closed
// presents the same single child. An open <details>, or one with no rendered <summary>, counts every rendered child.
export function layoutElement( el, styleOf = ( e ) => getComputedStyle( e ) ) {
	const lays = ( e ) => /(^|-)(flex|grid)$/.test( styleOf( e ).display );
	for ( let a = el; ; ) {
		let kids = [ ...a.children ].filter( ( k ) => k.getClientRects().length && 'none' !== styleOf( k ).display );
		if ( 'DETAILS' === a.tagName && ! a.open && kids.length >= 2 && kids.some( ( k ) => 'SUMMARY' === k.tagName ) ) {
			kids = kids.filter( ( k ) => 'SUMMARY' === k.tagName );
		}
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
	// Visually hidden text (a screen-reader link name clipped to nothing) paints nothing; the same test as
	// auto-collect.mjs::collectAuto's srOnly, walked up to `el`.
	const srOnly = ( from ) => {
		for ( let a = from; a && a !== el.parentElement; a = a.parentElement ) {
			const r = a.getBoundingClientRect();
			const cs = getComputedStyle( a );
			if ( ( 'absolute' === cs.position && r.width <= 2 && r.height <= 2 && 'visible' !== cs.overflow ) || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test( cs.clip ) || /inset\(50%\)/.test( cs.clipPath ) ) {
				return true;
			}
		}
		return false;
	};
	const walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT, {
		// The text node's own rects: its parent can be display:contents (no box of its own) and still paint it.
		acceptNode: ( n ) => {
			if ( ! n.textContent.trim() || srOnly( n.parentElement ) ) {
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
// carrier: the element painting the first text, rows: { count, space } } or null. Rows are the text's boxes grouped by
// their top (a day and its hours on one line are one row); space is the median distance from one row's bottom to the
// next row's top less the line's leading (a text box is the font's height, the line box the line-height's), so it
// reads as the gap between the rows' line boxes; 0 for one row.
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
	// Visually hidden text paints nothing (textCarrier's test).
	const srOnly = ( from ) => {
		for ( let a = from; a && a !== el.parentElement; a = a.parentElement ) {
			const r = a.getBoundingClientRect();
			const cs = getComputedStyle( a );
			if ( ( 'absolute' === cs.position && r.width <= 2 && r.height <= 2 && 'visible' !== cs.overflow ) || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test( cs.clip ) || /inset\(50%\)/.test( cs.clipPath ) ) {
				return true;
			}
		}
		return false;
	};
	let box = null;
	let carrier = null;
	const tops = [];
	for ( const n of nodes.filter( ( x ) => x.textContent.trim() && ( ! re || re.test( x.textContent ) ) && ! srOnly( x.parentElement ) ) ) {
		const rg = document.createRange();
		rg.selectNodeContents( n );
		const b = rg.getBoundingClientRect();
		if ( ! b.width || ! b.height ) {
			continue;
		}
		carrier = carrier || n.parentElement;
		const row = tops.find( ( r ) => Math.abs( r.t - b.top ) <= 2 );
		if ( row ) {
			row.b = Math.max( row.b, b.bottom );
		} else {
			tops.push( { t: b.top, b: b.bottom } );
		}
		box = box ? { l: Math.min( box.l, b.left ), t: Math.min( box.t, b.top ), r: Math.max( box.r, b.right ), b: Math.max( box.b, b.bottom ) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
	}
	tops.sort( ( a, c ) => a.t - c.t );
	const lh = carrier ? parseFloat( getComputedStyle( carrier ).lineHeight ) : NaN;
	const textH = Math.min( ...tops.map( ( r ) => r.b - r.t ) );
	const leading = lh > textH ? lh - textH : 0;
	const spaces = tops.slice( 1 ).map( ( r, i ) => r.t - tops[ i ].b - leading ).sort( ( a, c ) => a - c );
	const rows = { count: tops.length, space: spaces.length ? Math.round( spaces[ Math.floor( spaces.length / 2 ) ] * 10 ) / 10 : 0 };
	return box ? { box: { x: Math.round( box.l ), y: Math.round( box.t + window.scrollY ), w: Math.round( box.r - box.l ), h: Math.round( box.b - box.t ) }, carrier, rows } : null;
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

// Self-contained. The number of line boxes the text inside `el` is laid out on: every text node's per-line client rects,
// grouped by their top the way textRun groups its text boxes (rects within 2px of one top are one line). A title that
// wraps is 2, a one-line label 1; 0 when no text paints. (GAP-CHECKLIST.md section 25.)
export function lineRows( el ) {
	const tops = [];
	const tw = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
	for ( let n = tw.nextNode(); n; n = tw.nextNode() ) {
		if ( ! n.textContent.trim() ) {
			continue;
		}
		const rg = document.createRange();
		rg.selectNodeContents( n );
		for ( const b of rg.getClientRects() ) {
			if ( b.width && b.height && ! tops.some( ( t ) => Math.abs( t - b.top ) <= 2 ) ) {
				tops.push( b.top );
			}
		}
	}
	return tops.length;
}

// The source collectPair and hoverStyles rebuild their paint helpers from.
export const PAINT_SRC = [ textCarrier, paintedDecoration, layoutElement, textRun, groupBox, lineRows ].map( ( f ) => f.toString() ).join( ';\n' );
