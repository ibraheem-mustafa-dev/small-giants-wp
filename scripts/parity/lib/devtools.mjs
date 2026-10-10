// What DevTools reads, through the Chrome DevTools Protocol, for draft-live-walk.mjs (Spec 47 A-1,
// GAP-CHECKLIST.md section 19): the page read once its animations finish, every pair's hover
// end state by forcing :hover (no pointer, no hand-picked pairs), and the values the matched CSS rules declare beside
// the computed ones (a declared 168px or 50% width where computed style gives only the used pixels).

// The sizes whose computed value is a used size: their declared values are read from the matched rules.
export const DECLARED_PROPS = [ 'width', 'max-width', 'min-width', 'height', 'min-height', 'max-height', 'left', 'top' ];

// Node side: a CDP session on a page with the DOM and CSS domains on (CSS.forcePseudoState and
// CSS.getMatchedStylesForNode need both).
export async function openDevtools( page ) {
	const cdp = await page.context().newCDPSession( page );
	await cdp.send( 'DOM.enable' );
	await cdp.send( 'CSS.enable' );
	return cdp;
}

// In-page: the animations and transitions still to finish under `root` (the document when null). Only finite ones on
// the document timeline count: an infinite loop never finishes and a scroll-driven one waits for a scroll.
export function unfinishedAnimations( rootSelector ) {
	const root = rootSelector ? document.querySelector( rootSelector ) : null;
	const list = root ? root.getAnimations( { subtree: true } ) : document.getAnimations();
	return list.filter( ( a ) => ( 'running' === a.playState || a.pending ) && a.timeline === document.timeline && Number.isFinite( a.effect?.getComputedTiming?.().endTime ) ).length;
}

// Waits `floor` ms (scripts that start an animation late), then until no finite animation is left, up to `cap` ms.
// Returns { settled, waited, pending }.
export async function settleAnimations( page, { floor = 300, cap = 6000, step = 50 } = {} ) {
	const start = Date.now();
	await page.waitForTimeout( floor );
	for ( ;; ) {
		const pending = await page.evaluate( unfinishedAnimations, null ).catch( () => 0 );
		const waited = Date.now() - start;
		if ( ! pending || waited >= cap ) {
			return { settled: ! pending, waited, pending };
		}
		await page.waitForTimeout( step );
	}
}

// In-page: the entrances still holding their un-played start pose. An armed entrance is a finite document-timeline
// animation that is paused (created by animation-observer.js and played once its element nears the viewport), so
// unfinishedAnimations never counts it and an element read now sits at its start frame. Returns one descriptor per
// armed element, in document order: { index, tag, id, cls, animation, top } with `top` the page-relative offset.
export function armedEntrances() {
	const out = [];
	const seen = new Set();
	for ( const a of document.getAnimations() ) {
		const el = a.effect?.target;
		if ( 'paused' !== a.playState || a.timeline !== document.timeline || ! el || seen.has( el ) || ! Number.isFinite( a.effect.getComputedTiming().endTime ) ) {
			continue;
		}
		seen.add( el );
		out.push( {
			index: out.length,
			tag: el.localName,
			id: el.id || '',
			cls: String( el.getAttribute( 'class' ) || '' ),
			animation: el.getAttribute( 'data-sgs-animation' ) || '',
			top: Math.round( el.getBoundingClientRect().top + window.scrollY ),
		} );
	}
	return out;
}

// In-page: scrolls the `index`th armed element to the middle of the viewport. Returns false when it is gone.
export function scrollArmedIntoView( index ) {
	const el = [ ...new Set( document.getAnimations().filter( ( a ) => 'paused' === a.playState && a.timeline === document.timeline ).map( ( a ) => a.effect?.target ).filter( Boolean ) ) ][ index ];
	if ( ! el ) {
		return false;
	}
	const r = el.getBoundingClientRect();
	window.scrollTo( { top: Math.max( 0, r.top + window.scrollY - window.innerHeight / 2 + r.height / 2 ), behavior: 'instant' } );
	return true;
}

// Scrolls every armed entrance into view so its trigger fires, lets the animations settle, then puts the scroll back.
// Returns { armed, played, unfired } where `unfired` lists the descriptors of entrances still paused after their own
// scroll and a settle: each is a `reveal-unfired` finding (a reveal that never plays), never a settled element.
export async function triggerArmed( page, { floor = 250, cap = 6000 } = {} ) {
	const armed = await page.evaluate( armedEntrances );
	if ( ! armed.length ) {
		return { armed: 0, played: 0, unfired: [] };
	}
	const y = await page.evaluate( () => window.scrollY );
	const keyOf = ( d ) => `${ d.tag }|${ d.id }|${ d.cls }|${ d.animation }|${ d.top }`;
	const unfired = [];
	for ( const d of armed ) {
		const target = ( await page.evaluate( armedEntrances ) ).find( ( s ) => keyOf( s ) === keyOf( d ) );
		if ( ! target ) {
			continue;
		}
		await page.evaluate( scrollArmedIntoView, target.index );
		await settleAnimations( page, { floor, cap } );
		if ( ( await page.evaluate( armedEntrances ) ).some( ( s ) => keyOf( s ) === keyOf( d ) ) ) {
			unfired.push( d );
		}
	}
	await page.evaluate( ( t ) => window.scrollTo( { top: t, behavior: 'instant' } ), y );
	await page.waitForTimeout( 60 );
	return { armed: armed.length, played: armed.length - unfired.length, unfired };
}

// The DOM nodeIds of a finder's element and its ancestors (nearest first), or null when it resolves to nothing. The
// remote objects it makes are released before it returns (one object group per call).
const GROUP = 'sgs-walk';
async function nodeChain( cdp, finder, resolveSrc, ancestors ) {
	try {
		return await chainOf( cdp, finder, resolveSrc, ancestors );
	} finally {
		await cdp.send( 'Runtime.releaseObjectGroup', { objectGroup: GROUP } ).catch( () => {} );
	}
}

async function chainOf( cdp, finder, resolveSrc, ancestors ) {
	const { result } = await cdp.send( 'Runtime.evaluate', { expression: `(${ resolveSrc })(${ JSON.stringify( finder ) })`, objectGroup: GROUP } );
	if ( ! result?.objectId ) {
		return null;
	}
	await cdp.send( 'DOM.getDocument', { depth: 0 } );
	const ids = [];
	for ( let objectId = result.objectId; objectId; ) {
		ids.push( ( await cdp.send( 'DOM.requestNode', { objectId } ) ).nodeId );
		if ( ! ancestors ) {
			break;
		}
		const up = await cdp.send( 'Runtime.callFunctionOn', { objectId, objectGroup: GROUP, functionDeclaration: 'function () { return this.parentElement; }' } );
		objectId = up.result?.objectId || null;
	}
	return ids;
}

// What an ancestor of the forced element matches while the element is in a state: a pointer over or a press on an
// element hovers or presses the whole chain (so `.card:hover .title` and `.card:active .title` rules apply); focus on an
// element makes each ancestor :focus-within, never :focus.
const ANCESTOR_STATE = { hover: 'hover', active: 'active', focus: 'focus-within', 'focus-visible': 'focus-within' };

// One pair's end state with `states` (any of hover, active, focus, focus-visible) forced on its element through the
// DevTools protocol, and the matching state on every ancestor, after its transitions finish; the force is cleared after.
// read( ) reads the styles in the page (collect.mjs::hoverStyles). Returns its result, or null for a missing element.
export async function forcedPseudo( cdp, page, finder, resolveSrc, states, read ) {
	const ids = await nodeChain( cdp, finder, resolveSrc, true );
	if ( ! ids ) {
		return null;
	}
	const up = [ ...new Set( states.map( ( s ) => ANCESTOR_STATE[ s ] ).filter( Boolean ) ) ];
	const force = ( own, above ) => Promise.all( ids.map( ( nodeId, i ) => cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: 0 === i ? own : above } ) ) );
	await force( states, up );
	try {
		await settleAnimations( page, { floor: 30, cap: 3000 } );
		return await read();
	} finally {
		await force( [], [] );
		await settleAnimations( page, { floor: 0, cap: 3000 } );
	}
}

// The hover end state of one pair: forcedPseudo with :hover (read( ) is collect.mjs::hoverStyles).
export const forcedHover = ( cdp, page, finder, resolveSrc, read ) => forcedPseudo( cdp, page, finder, resolveSrc, [ 'hover' ], read );

// Node side: the declared value of `prop` from CSS.getMatchedStylesForNode's answer, as the cascade picks it: the
// matched author rules in ascending precedence then the inline style, the last declaration winning, an !important
// one over any normal one. User-agent rules are ignored (they declare no design). Null when nothing declares it.
export function cascadeWinner( matched, prop ) {
	// A presentation attribute (an svg's width="18") is an author declaration below every rule; SVG reads a unitless
	// length as px.
	const attrs = ( matched.attributesStyle?.cssProperties || [] ).map( ( p ) => ( /^\d*\.?\d+$/.test( String( p.value ).trim() ) && /width|height|^(x|y|r|rx|ry|cx|cy)$/.test( p.name ) ? { ...p, value: `${ String( p.value ).trim() }px` } : p ) );
	const decls = [
		{ cssProperties: attrs },
		...( matched.matchedCSSRules || [] ).filter( ( m ) => 'user-agent' !== m.rule?.origin ).map( ( m ) => m.rule.style ),
		...( matched.inlineStyle ? [ matched.inlineStyle ] : [] ),
	].flatMap( ( s ) => ( s?.cssProperties || [] ).filter( ( p ) => p.name === prop && ! p.disabled && false !== p.parsedOk && '' !== String( p.value ).trim() ) );
	const important = decls.filter( ( p ) => p.important );
	const win = ( important.length ? important : decls ).at( -1 );
	return win ? String( win.value ).replace( /\s*!important\s*$/, '' ).trim() : null;
}

// The declared values of `props` on a finder's element: { prop: value } for each prop some rule declares.
export async function declaredValues( cdp, finder, resolveSrc, props = DECLARED_PROPS ) {
	const ids = await nodeChain( cdp, finder, resolveSrc, false );
	if ( ! ids ) {
		return null;
	}
	const matched = await cdp.send( 'CSS.getMatchedStylesForNode', { nodeId: ids[ 0 ] } );
	return Object.fromEntries( props.map( ( p ) => [ p, cascadeWinner( matched, p ) ] ).filter( ( [ , v ] ) => null !== v ) );
}
