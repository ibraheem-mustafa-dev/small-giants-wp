/**
 * The drawer's motion lifecycle, shared by the nav store (`store.js`) and the drawer's own view script.
 *
 * - `announceDrawer( drawer, phase )` dispatches `sgs-nav-drawer-phase` on the drawer, synchronously, at the two points
 *   the store opens and starts closing it. `sgs/nav-drawer`'s view script listens and publishes the matching motion
 *   state (`@sgs/motion-state`, Spec 38A FR-38A-51), so the close animations it starts already exist when the store
 *   samples them a line later. Detail: `{ phase: 'open' | 'close' }`.
 * - `whenAnimationsSettle( el, done )` calls `done` once every animation on `el` or inside it has finished: the panel
 *   entrance, each item's own close delay and duration, and any pseudo-element layer. A fail-safe timer set to the
 *   latest animation end (plus 50ms) guarantees `done` still runs if a finish never settles; a stuck drawer is far
 *   worse than a clipped animation.
 *
 * @package
 */

export const DRAWER_PHASE_EVENT = 'sgs-nav-drawer-phase';

/**
 * Tell the drawer's own script that the store opened it or started closing it.
 *
 * @param {HTMLElement}      drawer The drawer dialog element.
 * @param {'open' | 'close'} phase  The lifecycle point.
 * @return {void}
 */
export function announceDrawer( drawer, phase ) {
	if ( ! drawer || 'function' !== typeof drawer.dispatchEvent ) {
		return;
	}
	drawer.dispatchEvent(
		new CustomEvent( DRAWER_PHASE_EVENT, { detail: { phase } } )
	);
}

/**
 * Call `done` once every animation running on `el` or inside it has finished.
 *
 * @param {HTMLElement} el   The element whose subtree animations to wait on.
 * @param {Function}    done Called exactly once.
 * @return {void}
 */
export function whenAnimationsSettle( el, done ) {
	let called = false;
	let timer = 0;
	const finish = () => {
		if ( called ) {
			return;
		}
		called = true;
		clearTimeout( timer );
		done();
	};

	// getAnimations() flushes style, so the animations the state change just
	// started are already in the list.
	const animations =
		'function' === typeof el.getAnimations
			? el.getAnimations( { subtree: true } )
			: [];
	let latest = 0;
	animations.forEach( ( animation ) => {
		const end = animation.effect?.getComputedTiming?.().endTime;
		if ( Number.isFinite( end ) && end > latest ) {
			latest = end;
		}
	} );
	timer = setTimeout( finish, latest + 50 );

	if ( animations.length ) {
		Promise.allSettled(
			animations.map( ( animation ) => animation.finished )
		).then( finish );
	}
}
