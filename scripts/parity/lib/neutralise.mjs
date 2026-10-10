// "Does it paint?" (Spec 47 route-accuracy R5, GAP-CHECKLIST 8): a layout difference is proven inert in the open live
// page instead of judged by a rule. For each tested property whose draft and live values differ on a pair, the draft
// value is set on the live element the walker read the property from (collect.mjs::collectPair: a layout property from
// paint.mjs::layoutElement, any other from the pair element), with transitions off, and every box and every line of
// text inside the pair and every sibling after it is read before and after, then the element is restored exactly.
// compare.mjs::isAccepted accepts a row whose value moved nothing (inert), or moved the pair's own box while that box
// matches the draft (breaks-box: writing it would move a matching box away); a value that moves only the pair's content
// or what follows it stays open.

// The layout properties tested: those that can differ while painting nothing (a flex against a block wrapper with one
// child, centred text in a box it fills, the row half of a gap on a one-row flex).
export const NEUTRALISED = [ 'display', 'gap', 'column-gap', 'row-gap', 'align-items', 'text-align', 'justify-content' ];

// The tested properties of one pair whose draft and live values differ, with the draft value: [ { prop, value } ].
export function candidatesOf( draftSnap, liveSnap ) {
	if ( ! draftSnap?.styles || ! liveSnap?.styles || draftSnap.missing || liveSnap.missing ) {
		return [];
	}
	return NEUTRALISED.filter( ( p ) => null != draftSnap.styles[ p ] && null != liveSnap.styles[ p ] && draftSnap.styles[ p ] !== liveSnap.styles[ p ] ).map( ( p ) => ( { prop: p, value: draftSnap.styles[ p ] } ) );
}

// In-page: { [prop]: verdict } for one pair: `inert` (nothing moved), `breaks-box` (the pair element's own box moved: the
// draft value would undo a box that may already match the draft, the two sides reaching one paint by different layout,
// home's process step being a grid with an empty second row where the draft's flex has one) or `moves` (only what is
// inside the pair or after it moved). finder: the pair's live finder; items: candidatesOf's list;
// resolveSrc: collect.mjs::resolveFinder's source; paintSrc: paint.mjs::PAINT_SRC. Self-contained.
export function neutraliseInPage( [ finder, items, resolveSrc, paintSrc ] ) {
	// eslint-disable-next-line no-new-func
	const resolve = new Function( `return (${ resolveSrc });` )();
	// eslint-disable-next-line no-new-func
	const { layoutElement } = new Function( `${ paintSrc }; return { layoutElement };` )();
	const el = resolve( finder );
	if ( ! el ) {
		return {};
	}
	const LAYOUT = [ 'gap', 'row-gap', 'column-gap', 'flex-wrap', 'flex-direction', 'grid-template-columns', 'justify-content', 'align-items' ];
	const watched = [ el, ...el.querySelectorAll( '*' ) ];
	for ( let s = el.nextElementSibling, n = 0; s && n < 20; s = s.nextElementSibling, n++ ) {
		watched.push( s );
	}
	const texts = [];
	const walker = document.createTreeWalker( el, NodeFilter.SHOW_TEXT );
	for ( let t = walker.nextNode(); t && texts.length < 400; t = walker.nextNode() ) {
		t.textContent.trim() && texts.push( t );
	}
	const read = () => {
		const out = [];
		for ( const e of watched ) {
			const r = e.getBoundingClientRect();
			out.push( r.x, r.y, r.width, r.height );
		}
		for ( const t of texts ) {
			const range = document.createRange();
			range.selectNodeContents( t );
			for ( const r of range.getClientRects() ) {
				out.push( r.x, r.y, r.width, r.height );
			}
		}
		return out;
	};
	const result = {};
	for ( const { prop, value } of items ) {
		const target = LAYOUT.includes( prop ) ? layoutElement( el ) : el;
		const keep = [ prop, 'transition' ].map( ( p ) => [ p, target.style.getPropertyValue( p ), target.style.getPropertyPriority( p ) ] );
		const attr = target.getAttribute( 'style' );
		const before = read();
		target.style.setProperty( 'transition', 'none', 'important' );
		target.style.setProperty( prop, value, 'important' );
		const now = read();
		keep.forEach( ( [ p, v, pri ] ) => ( v ? target.style.setProperty( p, v, pri ) : target.style.removeProperty( p ) ) );
		null === attr ? target.removeAttribute( 'style' ) : target.setAttribute( 'style', attr );
		const moved = ( i ) => Math.abs( before[ i ] - now[ i ] ) > 0.5;
		// The first four values are the pair element's own box.
		result[ prop ] = before.length !== now.length ? 'moves' : ( [ 0, 1, 2, 3 ].some( moved ) ? 'breaks-box' : ( before.some( ( _, i ) => moved( i ) ) ? 'moves' : 'inert' ) );
	}
	return result;
}

// Every tested pair of one live state with its verdicts: { [pair name]: { [prop]: verdict } }. Pairs measured as a text run or a group (no one
// element to set a value on) are skipped. page: the live page in that state; pairs: the state's pairs; draftSnap and
// liveSnap: the two sides' collected snapshots by pair name.
export async function neutralisePass( page, pairs, draftSnap, liveSnap, resolveSrc, paintSrc ) {
	const out = {};
	for ( const p of pairs ) {
		if ( p.live?.textRun || p.live?.group || 'function' === typeof p.live ) {
			continue;
		}
		const items = candidatesOf( draftSnap?.[ p.name ], liveSnap?.[ p.name ] );
		if ( ! items.length ) {
			continue;
		}
		const r = await page.evaluate( neutraliseInPage, [ p.live, items, resolveSrc, paintSrc ] ).catch( () => ( {} ) );
		Object.keys( r ).length && ( out[ p.name ] = r );
	}
	return out;
}
