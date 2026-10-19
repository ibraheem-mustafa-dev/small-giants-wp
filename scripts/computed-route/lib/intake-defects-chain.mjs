// Two-step forced states for FR-48-34's second draft-defect test (Spec 48 §9, R-48-3): a construct that renders or
// runs only after a first state is set, such as an accordion row inside a drawer (open the drawer, then open a row).
// What opens the container is read from what the draft itself does, never from a named component or selector:
//   - level 1 (the openers): each state patch the pending rows' own conditions ask for (lib/intake-defects-keys.mjs),
//     and each template handler fired on each of its first rendered copies (a loop's first copy is often the one
//     item that opens nothing, such as a menu's plain Home link); an opener counts only when it changes the draft's
//     state;
//   - level 2: under each opener that rendered new template elements, each template handler on those new elements,
//     fired on each of its first rendered copies.
// Depth is 2. The state is snapshotted before each level and put back after each attempt (named snapshot slots of
// lib/intake-state.mjs, deleted when the pass ends), so one attempt never leaks into the next. An attempt that changes
// the URL is a route change, which the visits cover on their own: its URL and state are put back and nothing under it
// is tried. The route counts as back when the same components render as before the attempt; when putting the URL back
// does not bring them back, the visit's URL is re-opened (popstate and hashchange fired on it), and when that fails too
// the pass stops with `lost` set. A budget caps the attempts per visit; only an attempt whose event or patch actually
// fired counts. Stopping at the budget, or on a lost route, with candidates still pending sets `exhausted` / `lost`,
// which the caller records as a gap on each pending row (R-48-3: forcing that cannot finish is a gap, never silent).

export const CHAIN_SLOTS = [ 'chain0', 'chain1' ];
const nOf = ( id ) => id.slice( id.lastIndexOf( ':' ) + 1 );
const freshSince = ( now, before ) => new Set( [ ...now ].filter( ( k ) => ! before.has( k ) ) );
// The components a set of rendered template keys (`<component>:<n>`) belongs to: what a route renders.
const compsOf = ( keys ) => new Set( [ ...keys ].map( ( k ) => k.slice( 0, k.lastIndexOf( ':' ) ) ) );
const sameSet = ( a, b ) => a.size === b.size && [ ...a ].every( ( x ) => b.has( x ) );

// `s`: an openForcedPage session. `triggers`: census template handler rows. `patches`: [ { comp, patch } ] (unique).
// `pending()`: the candidates not reached yet at this width. `check()`: the reach check. `rendered()`: the rendered
// template keys (`<component>:<n>`) at the last check. `pseudoPass(fresh)`: forces hover and pending handlers on the
// fresh keys. Returns { attempts, opened, exhausted, lost } (attempts: those that fired; opened: how many openers
// changed the state; exhausted: the budget ran out with candidates pending; lost: a route change could not be undone).
export async function chainPass( s, { triggers, patches, pending, check, rendered, pseudoPass, maxCopies = 4, budget = 400 } ) {
	const out = { attempts: 0, opened: 0, exhausted: false, lost: false };
	if ( ! pending().length ) {
		return out;
	}
	// Whether another attempt may run: a candidate is pending, the route is intact and the budget has room.
	const room = () => {
		if ( ! pending().length || out.lost ) {
			return false;
		}
		if ( out.attempts >= budget ) {
			out.exhausted = true;
			return false;
		}
		return true;
	};
	const copiesOf = async ( h ) => Math.min( maxCopies, await s.copies( h ) );
	const href = () => s.page.evaluate( () => window.location.href );
	// Puts the URL back to `was` and the state to `slot`; true when the same components render as before the attempt.
	// `reopen` also fires popstate and hashchange, so a router that listens for them renders the visit's route again.
	const backTo = async ( was, slot, before, reopen ) => {
		await s.page.evaluate( ( { u, fire } ) => {
			window.history.replaceState( window.history.state, '', u );
			if ( fire ) {
				window.dispatchEvent( new window.PopStateEvent( 'popstate', { state: window.history.state } ) );
				window.dispatchEvent( new window.HashChangeEvent( 'hashchange' ) );
			}
		}, { u: was, fire: reopen } );
		await s.restore( slot );
		await s.nudge();
		await check();
		return sameSet( compsOf( rendered() ), compsOf( before ) );
	};
	// One attempt: fire, put a changed URL back, keep going only when the state changed, let it render, check, force what it rendered, then
	// put the state back to `slot`. Only a fired attempt counts against the budget.
	const attempt = async ( fire, slot, inner = null ) => {
		const before = rendered();
		const was = await href();
		if ( ! await fire() ) {
			return;
		}
		out.attempts++;
		// The URL is checked before the state: a link can move the route before (or without) any state change.
		if ( was !== await href() ) {
			// The timers the click started (a drawer's close animation) finish first: they would otherwise run on the restored page.
			await s.drain();
			await check();
			if ( ! await backTo( was, slot, before, false ) && ! await backTo( was, slot, before, true ) ) {
				out.lost = true;
			}
			return;
		}
		if ( ! await s.changed( slot ) ) {
			return;
		}
		await s.nudge();
		await check();
		const fresh = freshSince( rendered(), before );
		if ( fresh.size ) {
			await pseudoPass( fresh );
			if ( inner ) {
				out.opened++;
				await inner( fresh );
			}
		}
		// Timers the attempt started run to their end before the state is put back, so none acts on the next attempt's page.
		await s.drain();
		await check();
		await s.restore( slot );
		await s.nudge();
		await check();
	};
	const second = async ( fresh ) => {
		await s.snapshot( 'chain1' );
		for ( const h of triggers.filter( ( t ) => fresh.has( `${ t.component }:${ nOf( t.draftId ) }` ) ) ) {
			for ( let j = 0, n = await copiesOf( h ); j < n && room(); j++ ) {
				await attempt( () => s.dispatchAt( h, j ), 'chain1' );
			}
		}
	};
	try {
		await s.snapshot( 'chain0' );
		for ( const x of patches ) {
			if ( ! room() ) {
				return out;
			}
			await attempt( async () => ( await s.setState( x.comp, x.patch ) ) > 0, 'chain0', second );
		}
		for ( const h of triggers ) {
			for ( let i = 0, n = await copiesOf( h ); i < n && room(); i++ ) {
				await attempt( () => s.dispatchAt( h, i ), 'chain0', second );
			}
		}
		return out;
	} finally {
		await s.page.evaluate( ( slots ) => slots.forEach( ( k ) => delete window.__sgsStateSnaps?.[ k ] ), CHAIN_SLOTS ).catch( () => {} );
	}
}
