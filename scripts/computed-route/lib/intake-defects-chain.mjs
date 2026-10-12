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
// lib/intake-state.mjs), so one attempt never leaks into the next. An attempt that changes the URL is a route change,
// which the visits cover on their own: its URL and state are put back and nothing under it is tried. A budget caps
// the attempts per visit.

const nOf = ( id ) => id.slice( id.lastIndexOf( ':' ) + 1 );
const freshSince = ( now, before ) => new Set( [ ...now ].filter( ( k ) => ! before.has( k ) ) );

// `s`: an openForcedPage session. `triggers`: census template handler rows. `patches`: [ { comp, patch } ] (unique).
// `pending()`: the candidates not reached yet at this width. `check()`: the reach check. `rendered()`: the rendered
// template keys (`<component>:<n>`) at the last check. `pseudoPass(fresh)`: forces hover and pending handlers on the
// fresh keys. Returns { attempts, opened } (how many openers changed the state).
export async function chainPass( s, { triggers, patches, pending, check, rendered, pseudoPass, maxCopies = 4, budget = 400 } ) {
	const out = { attempts: 0, opened: 0 };
	if ( ! pending().length ) {
		return out;
	}
	const copiesOf = async ( h ) => Math.min( maxCopies, await s.copies( h ) );
	// One attempt: fire, keep going only when the state changed, let it render, check, force what it rendered, then
	// put the state back to `slot`. Returns the template keys it rendered (empty when it changed nothing).
	const href = () => s.page.evaluate( () => window.location.href );
	const attempt = async ( fire, slot, inner = null ) => {
		out.attempts++;
		const before = rendered();
		const was = await href();
		if ( ! await fire() || ! await s.changed( slot ) ) {
			return;
		}
		if ( was !== await href() ) {
			await s.page.evaluate( ( u ) => window.history.replaceState( window.history.state, '', u ), was );
			await s.restore( slot );
			await s.nudge();
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
		await s.restore( slot );
		await s.nudge();
		await check();
	};
	const second = async ( fresh ) => {
		await s.snapshot( 'chain1' );
		for ( const h of triggers.filter( ( t ) => fresh.has( `${ t.component }:${ nOf( t.draftId ) }` ) ) ) {
			for ( let j = 0, n = await copiesOf( h ); j < n && pending().length && out.attempts < budget; j++ ) {
				await attempt( () => s.dispatchAt( h, j ), 'chain1' );
			}
		}
	};
	await s.snapshot( 'chain0' );
	for ( const x of patches ) {
		if ( ! pending().length || out.attempts >= budget ) {
			return out;
		}
		await attempt( async () => ( await s.setState( x.comp, x.patch ) ) > 0, 'chain0', second );
	}
	for ( const h of triggers ) {
		for ( let i = 0, n = await copiesOf( h ); i < n && pending().length && out.attempts < budget; i++ ) {
			await attempt( () => s.dispatchAt( h, i ), 'chain0', second );
		}
	}
	return out;
}
