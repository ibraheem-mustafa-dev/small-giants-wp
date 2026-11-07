// The second pairing pass (lib/refresh-pairs.mjs): a block the type-and-text rule cannot judge (a container, an icon, a button
// group, a form step: it has no text of its own to match) is given the draft element it draws, by what the draft shows, never
// by block name:
//   - its text: every text its descendant blocks show, put together, is all the text the element holds (the element's `allText`);
//   - its box: the live block's border box at 1440 (at 375 when the block is hidden at 1440), against the element's box at that
//     width, within 2px on x, width and height. A block with a box is matched among the draft's opening-state elements; a block
//     hidden in the opening state, among the elements only a draft state shows.
// A candidate must lie inside the element its parent block holds and hold the elements its paired child blocks hold. When the
// text and the box agree on an element it is that one; when only one of them names candidates, that one's (a text match that would
// replace an old pair must also be within 10% of the live box on width and height). More than one
// survivor is not guessed: the block gets a named reason; text and box naming different elements is the same. A block whose old
// pair names an element with the block's own box (within 2px), or the text of its blocks and a near box, keeps it: that pair is
// already confirmed. When a draft element is one block's wrapper and its text block's
// text node (a row whose label is a bare text node), the outermost block takes the element and the text block shares it as a
// `part: 'text'` pair (a text block whose box is the element's is the element itself and keeps it). A block no draft element matches by box or text is `structural`: the framework needs it (a wrapper, an
// icon set) and the draft draws nothing of its own for it.
import { norm, textOf } from './pair-text.mjs';
import { recId, revealId } from './reveal-merge.mjs';

export const BOX_TOLERANCE = 2;
export const WIDTHS = [ 1440, 375 ];
// The inventory cuts an element's `allText` short; one this long is compared as the start of the blocks' text.
const CUT = 100;

const compact = ( s ) => norm( s ).replace( /\s+/g, '' );
const near = ( a, b ) => Math.abs( a - b ) <= BOX_TOLERANCE;

// The first width at which the live block has a box: [ width, box ] or null.
export const liveBox = ( boxes, ref ) => {
	const w = WIDTHS.find( ( x ) => boxes?.[ ref ]?.[ x ] );
	return w ? [ w, boxes[ ref ][ w ] ] : null;
};

export const sameBox = ( el, [ width, box ] ) => {
	const e = el.box?.[ width ];
	return !! e && false !== el.visible?.[ width ] && near( e.x, box.x ) && near( e.w, box.w ) && near( e.h, box.h );
};

// Within 10% on width and height: close enough to corroborate a text match whose box is not exact.
export const closeBox = ( el, [ width, box ] ) => {
	const e = el.box?.[ width ];
	return !! e && false !== el.visible?.[ width ] && Math.abs( e.w - box.w ) <= 0.1 * box.w && Math.abs( e.h - box.h ) <= 0.1 * box.h;
};

export const sameText = ( el, sub ) => {
	const all = compact( el.allText );
	return !! all && !! sub && ( String( el.allText ).length >= CUT ? sub.startsWith( all ) : sub === all );
};

// blocks: [ { ref, block, attrs, parent } ] in document order. state: { pairs, claimed, unpaired } as the type pass left them.
// Returns { take: { ref: { el, how } }, part: [ ref ], structural: { ref: reason }, unresolved: { ref: reason }, confirmed: { ref: el } }.
// `old`: { ref: key } the pairs the surface had.
export function pairWrappers( { blocks, elements, pairs, claimed, todo, boxes = {}, old = {} } ) {
	const out = { take: {}, part: [], structural: {}, unresolved: {}, confirmed: {} };
	const byRef = new Map( blocks.map( ( b ) => [ b.ref, b ] ) );
	const kids = new Map();
	blocks.forEach( ( b ) => kids.set( b.parent ?? null, [ ...( kids.get( b.parent ?? null ) || [] ), b ] ) );
	const subtree = ( ref ) => ( kids.get( ref ) || [] ).flatMap( ( c ) => [ textOf( c.attrs ), ...subtree( c.ref ).split( '\u0000' ) ] ).join( '\u0000' );
	const text = ( b ) => compact( `${ textOf( b.attrs ) } ${ subtree( b.ref ).replace( /\u0000/g, ' ' ) }` );
	const held = new Map( Object.entries( pairs ).map( ( [ ref, p ] ) => [ ref, p ] ) );
	const elOf = ( ref ) => {
		const p = held.get( ref );
		return p && elements.find( ( e ) => e.key === p.tpl && revealId( e.reveal ) === revealId( p.reveal ) );
	};
	const parentOf = ( e ) => elements.find( ( x ) => x.key === e.parentKey && revealId( x.reveal ) === revealId( e.reveal ) ) ?? elements.find( ( x ) => x.key === e.parentKey && ! x.reveal );
	const inside = ( e, anc, self = false ) => {
		for ( let a = self ? e : parentOf( e ), n = 0; a && n < 60; a = parentOf( a ), n++ ) {
			// By key, so a block paired to an element's copy in a draft state is still inside the element's opening-state copy.
			if ( a.key === anc.key ) {
				return true;
			}
		}
		return false;
	};
	const descends = ( ref, of ) => {
		for ( let b = byRef.get( ref ), n = 0; b && n < 60; b = byRef.get( b.parent ), n++ ) {
			if ( b.parent === of ) {
				return true;
			}
		}
		return false;
	};
	// An element a descendant text block holds (a block with text of its own) can be shared with the wrapper when that block is a deeper node of it (a bare text
	// node of a row): its own box differs from the element's. A text block whose box is the element's is the element itself.
	const shareable = ( e, ref ) => {
		const holder = claimed.get( recId( e ) );
		const lb = liveBox( boxes, holder );
		return descends( holder, ref ) && !! textOf( byRef.get( holder )?.attrs ) && ! ( lb && sameBox( e, lb ) );
	};
	// A block whose old pair names an element that has the block's own box, or the text of its blocks and a near box, keeps it.
	for ( const b of blocks ) {
		const box = liveBox( boxes, b.ref );
		const was = todo.has( b.ref ) ? elements.find( ( e ) => ! e.reveal && e.key === old[ b.ref ] ) : null;
		const sub = text( b );
		const ok = was && ( ( box && sameBox( was, box ) ) || ( sub && sameText( was, sub ) && ( ! box || closeBox( was, box ) ) ) );
		if ( ok && ! claimed.has( recId( was ) ) ) {
			claimed.set( recId( was ), b.ref );
			held.set( b.ref, { tpl: was.key } );
			out.confirmed[ b.ref ] = was;
		}
	}
	for ( const b of blocks ) {
		if ( ! todo.has( b.ref ) || out.confirmed[ b.ref ] ) {
			continue;
		}
		const sub = text( b );
		const box = liveBox( boxes, b.ref );
		if ( ! sub && ! box ) {
			out.unresolved[ b.ref ] = `${ b.block } is hidden at 1440 and 375 and holds no text: there is nothing to measure it against`;
			continue;
		}
		const pool = box ? elements.filter( ( e ) => ! e.reveal ) : elements;
		// A text match that would replace an old pair must also be near the block's box: the text of a block's descendants can equal a
		// smaller element than the one the old pair names.
		const near = box && old[ b.ref ];
		const byText = sub ? pool.filter( ( e ) => sameText( e, sub ) && ( ! near || closeBox( e, box ) ) ) : [];
		const byBox = box ? pool.filter( ( e ) => sameBox( e, box ) ) : [];
		const both = byText.filter( ( e ) => byBox.includes( e ) );
		if ( byText.length && byBox.length && ! both.length ) {
			out.unresolved[ b.ref ] = `${ b.block } has no draft element of its own to pair by type and text: its blocks' text names ${ byText[ 0 ].key } and its box names ${ byBox[ 0 ].key }, so neither is chosen`;
			continue;
		}
		let all = both.length ? both : byText.length ? byText : byBox;
		const parentEl = b.parent ? elOf( b.parent ) : null;
		parentEl && ( all = all.filter( ( e ) => inside( e, parentEl ) ) );
		const childEls = ( kids.get( b.ref ) || [] ).map( ( c ) => ( 'text' === held.get( c.ref )?.part ? null : elOf( c.ref ) ) ).filter( Boolean );
		all = all.filter( ( e ) => childEls.every( ( c ) => inside( c, e, true ) ) );
		// Free, or held by one of this block's own text blocks (shared as a part).
		// A free element is preferred: an element a descendant text block holds is shared only when no other candidate is free.
		const usable = all.filter( ( e ) => ! claimed.has( recId( e ) ) || shareable( e, b.ref ) );
		const free = usable.filter( ( e ) => ! claimed.has( recId( e ) ) );
		const open = free.length ? free : usable;
		if ( ! all.length && ! box && ! Object.keys( boxes ).length ) {
			out.unresolved[ b.ref ] = `${ b.block } has no draft element of its own to pair by type and text, and no draft element shows its blocks' text${ parentEl ? ' inside its parent element' : '' }`;
		} else if ( ! all.length && ! box ) {
			out.structural[ b.ref ] = `${ b.block } is structural: it is hidden at 1440 and 375, and no draft element in any state shows exactly its blocks' text${ parentEl ? ' inside its parent element' : '' }, so the draft draws nothing of its own for it`;
		} else if ( ! all.length ) {
			out.structural[ b.ref ] = `${ b.block } is structural: no draft element${ parentEl ? ' inside its parent\'s' : '' } has its ${ sub ? 'text or ' : '' }${ box ? `box (${ box[1].w }x${ box[1].h } at ${ box[0] }px)` : 'box' }, so the draft draws nothing of its own for it`;
		} else if ( ! open.length ) {
			out.structural[ b.ref ] = `${ b.block } is structural: its draft element ${ all[ 0 ].key } is held by ${ claimed.get( recId( all[ 0 ] ) ) }, the outermost block with that box and text`;
		} else if ( open.length > 1 ) {
			out.unresolved[ b.ref ] = `${ open.length } draft elements (${ open.slice( 0, 3 ).map( ( e ) => e.key ).join( ', ' ) }) have this ${ b.block }'s ${ both.length ? 'text and box' : byText.length ? 'text' : 'box' }; none is chosen by guess`;
		} else {
			const el = open[ 0 ];
			const sharer = claimed.get( recId( el ) );
			sharer && out.part.push( sharer );
			claimed.set( recId( el ), b.ref );
			out.take[ b.ref ] = { el, how: `${ both.length ? 'text and box' : byText.length ? 'the text of its blocks' : 'box' } of the draft element` };
			held.set( b.ref, { tpl: el.key, ...( el.reveal ? { reveal: el.reveal } : {} ) } );
			sharer && held.set( sharer, { ...held.get( sharer ), part: 'text' } );
		}
	}
	return out;
}

// Before the type pass: a block whose old pair names an element with the block's own box (within 2px), or one that shows the
// block's own text within 10% of the block's box, keeps it, so a text block the type pass reaches first does not take an element
// another block already has. Returns { ref: element }.
export function confirmedByBox( { blocks, elements, old, boxes } ) {
	const out = {};
	const taken = new Set();
	for ( const b of blocks ) {
		const box = liveBox( boxes, b.ref );
		const was = box ? elements.find( ( e ) => ! e.reveal && e.key === old[ b.ref ] ) : null;
		const own = compact( textOf( b.attrs ) );
		const ok = was && ( sameBox( was, box ) || ( own && ( compact( was.words ) === own || compact( was.allText ) === own ) && closeBox( was, box ) ) );
		if ( ok && ! taken.has( was.key ) ) {
			taken.add( was.key );
			out[ b.ref ] = was;
		}
	}
	return out;
}
