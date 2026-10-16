/**
 * SGS motion: the per-device off switch for Tier V effect runtimes (Spec 38A FR-38A-23).
 *
 * The emitter (`Sgs_Motion_Fx_Emitter`) writes two switches per tier (tablet, mobile) on an element:
 *  - `data-sgs-fx-disable-<tier>`: the flat `fxDisableTablet` / `fxDisableMobile` attributes. Present = every effect
 *    on the element is off at that tier.
 *  - `data-sgs-fx-off-<tier>`: a motion layer's `off` list, space-separated effect slugs in the `data-sgs-fx`
 *    vocabulary. Only the listed effects are off at that tier, so a sibling effect on the same element keeps running.
 * Desktop is never off. These are the same semantics and the same tier queries as the Tier G gate in
 * `gsap/provider.js`; this module imports nothing from `gsap/`, so a vanilla bundle never pulls GSAP in.
 *
 * Fail-open: an effect that is off never starts, and one that is torn down leaves the server-rendered element as it
 * was, fully visible (FR-38-2). A browser without matchMedia reads as "no tier", so nothing is ever off there.
 *
 * Three levels, smallest first:
 *  - `isEffectOffAtThisTier( el, effect )`: the one question, read live.
 *  - `onTierChange( callback )`: called once each time the viewport lands in a different device tier.
 *  - `bootGated( effect, targets, init )`: per-element start/stop state, the vanilla twin of `bootEffect`. `init( el )`
 *    starts the effect on one element and may return its cleanup; it runs for every element whose effect is on now,
 *    the cleanup runs when the viewport enters a tier where it is off, and `init` runs again on leaving that tier.
 *
 * @package
 */

/** The device-tier queries: mobile <=767, tablet 768-1023, desktop >=1024. Never design breakpoints. */
export const TIER_QUERIES = {
	mobile: '(max-width: 767px)',
	tablet: '(min-width: 768px) and (max-width: 1023px)',
};

/**
 * The device tier the viewport is in now, or null when it cannot be read.
 *
 * @return {'mobile'|'tablet'|'desktop'|null} The current tier.
 */
export function currentTier() {
	if (
		typeof window === 'undefined' ||
		typeof window.matchMedia !== 'function'
	) {
		return null;
	}
	if ( window.matchMedia( TIER_QUERIES.mobile ).matches ) {
		return 'mobile';
	}
	if ( window.matchMedia( TIER_QUERIES.tablet ).matches ) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Is this effect switched off on this element at the current device tier?
 *
 * @param {Element} el     Element carrying the fx attributes.
 * @param {string}  effect Effect slug as it appears in `data-sgs-fx`.
 * @return {boolean} True when the effect must not run at this viewport.
 */
export function isEffectOffAtThisTier( el, effect ) {
	const tier = currentTier();
	if ( tier !== 'mobile' && tier !== 'tablet' ) {
		return false;
	}
	if ( el.hasAttribute( `data-sgs-fx-disable-${ tier }` ) ) {
		return true;
	}
	const off = el.getAttribute( `data-sgs-fx-off-${ tier }` ) || '';
	return off.split( /\s+/ ).includes( effect );
}

/**
 * Call back once each time the viewport lands in a different device tier.
 *
 * Both tier queries are watched. One resize can flip both (tablet to mobile), so the callback runs only when the tier
 * read after the change differs from the last one seen. A browser without matchMedia, or a returned list without
 * addEventListener, gets no listener and the returned function does nothing.
 *
 * @param {Function} callback Receives `( tier, previousTier )`.
 * @return {Function} Unsubscribe.
 */
export function onTierChange( callback ) {
	if (
		typeof window === 'undefined' ||
		typeof window.matchMedia !== 'function'
	) {
		return () => {};
	}
	let last = currentTier();
	const listener = () => {
		const tier = currentTier();
		if ( tier === last ) {
			return;
		}
		const previous = last;
		last = tier;
		callback( tier, previous );
	};
	const lists = Object.values( TIER_QUERIES )
		.map( ( query ) => window.matchMedia( query ) )
		.filter(
			( list ) => list && typeof list.addEventListener === 'function'
		);
	lists.forEach( ( list ) => list.addEventListener( 'change', listener ) );
	return () => {
		lists.forEach( ( list ) => {
			if ( typeof list.removeEventListener === 'function' ) {
				list.removeEventListener( 'change', listener );
			}
		} );
	};
}

/**
 * Start an effect on every target whose effect is on at this tier, and keep each one in step with the tier.
 *
 * Every target keeps its own state. On a tier change an element whose effect is now off is stopped through the
 * cleanup its `init` returned, and an element whose effect is now on is started; an element whose on/off state does
 * not change is left alone.
 *
 * @param {string}                             effect  Effect slug as it appears in `data-sgs-fx`.
 * @param {string|Iterable<Element>}           targets A selector queried on the document now, or the elements themselves.
 * @param {function(Element): (Function|void)} init    Starts the effect on one element; may return its cleanup.
 * @return {Function} Stops every running element and the tier listener.
 */
export function bootGated( effect, targets, init ) {
	const elements =
		typeof targets === 'string'
			? Array.from( document.querySelectorAll( targets ) )
			: Array.from( targets );
	const states = elements.map( ( el ) => ( {
		el,
		cleanup: undefined,
		running: false,
	} ) );

	const start = ( state ) => {
		state.running = true;
		state.cleanup = init( state.el );
	};
	const stop = ( state ) => {
		const cleanup = state.cleanup;
		state.cleanup = undefined;
		state.running = false;
		if ( typeof cleanup === 'function' ) {
			cleanup();
		}
	};
	const sync = () => {
		states.forEach( ( state ) => {
			const off = isEffectOffAtThisTier( state.el, effect );
			if ( off && state.running ) {
				stop( state );
			} else if ( ! off && ! state.running ) {
				start( state );
			}
		} );
	};

	sync();
	const unsubscribe = states.length > 0 ? onTierChange( sync ) : () => {};

	return () => {
		unsubscribe();
		states.forEach( ( state ) => {
			if ( state.running ) {
				stop( state );
			}
		} );
	};
}
