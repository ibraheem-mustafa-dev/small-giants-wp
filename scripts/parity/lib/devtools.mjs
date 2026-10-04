// What DevTools reads, through the Chrome DevTools Protocol, for draft-live-walk.mjs (A-1, plan
// .claude/plans/2026-10-04-eye-care-sweep-audit-fix.md): the page read once its animations finish, every pair's hover
// end state by forcing :hover (no pointer, no hand-picked pairs), and the values the matched CSS rules declare beside
// the computed ones (a declared 168px or 50% width where computed style gives only the used pixels).

// The sizes whose computed value is a used size: their declared values are read from the matched rules.
export const DECLARED_PROPS = [ 'width', 'max-width', 'min-width', 'height', 'min-height', 'max-height' ];

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

// The DOM nodeIds of a finder's element and its ancestors (nearest first), or null when it resolves to nothing.
async function nodeChain( cdp, finder, resolveSrc, ancestors ) {
	const { result } = await cdp.send( 'Runtime.evaluate', { expression: `(${ resolveSrc })(${ JSON.stringify( finder ) })` } );
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
		const up = await cdp.send( 'Runtime.callFunctionOn', { objectId, functionDeclaration: 'function () { return this.parentElement; }' } );
		objectId = up.result?.objectId || null;
	}
	return ids;
}

// The hover end state of one pair, read with :hover forced on its element and every ancestor (as a real pointer hovers
// the whole chain, so `.card:hover .title` rules apply), after its transitions finish; the force is cleared after.
// read( ) reads the styles in the page (collect.mjs::hoverStyles). Returns its result, or null for a missing element.
export async function forcedHover( cdp, page, finder, resolveSrc, read ) {
	const ids = await nodeChain( cdp, finder, resolveSrc, true );
	if ( ! ids ) {
		return null;
	}
	const force = ( classes ) => Promise.all( ids.map( ( nodeId ) => cdp.send( 'CSS.forcePseudoState', { nodeId, forcedPseudoClasses: classes } ) ) );
	await force( [ 'hover' ] );
	try {
		await settleAnimations( page, { floor: 30, cap: 3000 } );
		return await read();
	} finally {
		await force( [] );
		await settleAnimations( page, { floor: 0, cap: 3000 } );
	}
}

// Node side: the declared value of `prop` from CSS.getMatchedStylesForNode's answer, as the cascade picks it: the
// matched author rules in ascending precedence then the inline style, the last declaration winning, an !important
// one over any normal one. User-agent rules are ignored (they declare no design). Null when nothing declares it.
export function cascadeWinner( matched, prop ) {
	const decls = [
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
