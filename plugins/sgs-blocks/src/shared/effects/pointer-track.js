/**
 * SGS motion: the pointer tracker the pointer-writer effects share (Spec 38A FR-38A-41, FR-38A-47).
 *
 * `trackPointer` listens for the pointer over one element, reduces each frame's latest position to a 0 to 1 pair
 * inside the element's layout box, and hands it to the caller, which writes custom properties and nothing else. Touch
 * pointers are ignored (a finger has no hover). `onReducedMotionChange` reads the preference live, so a switch
 * mid-session starts or stops every writer without a reload.
 *
 * @package
 */

import { bootGated } from './off-switch';

/**
 * Clamp a number into a range.
 *
 * @param {number} n  Number.
 * @param {number} lo Lowest value.
 * @param {number} hi Highest value.
 * @return {number} The clamped number.
 */
export function clamp( n, lo, hi ) {
	return Math.min( hi, Math.max( lo, n ) );
}

/**
 * Bind a pointer tracker to an element. It does nothing until `start()`.
 *
 * @param {HTMLElement} el       Element the pointer moves over.
 * @param {Object}      handlers `move( nx, ny )` once per frame with the position as 0 to 1 of the element's width
 *                               and height; `reset()` when the pointer leaves or the tracker stops.
 * @return {{start: Function, stop: Function}} Controller.
 */
export function trackPointer( el, handlers ) {
	let frame = null;
	let leaveFrame = null;
	let last = null;
	let running = false;

	const flush = () => {
		frame = null;
		if ( null === last ) {
			return;
		}
		// The size is the layout box's (`offsetWidth` and `offsetHeight` ignore transforms) and the centre is the
		// transformed box's, which a scale or a rotation about the centre leaves in place. Reading the transformed
		// box's own edges would shrink the range as the hover scale grows it, so the corner never reached the maximum.
		const rect = el.getBoundingClientRect();
		const width = el.offsetWidth || rect.width;
		const height = el.offsetHeight || rect.height;
		if ( ! width || ! height ) {
			return;
		}
		handlers.move(
			clamp( 0.5 + ( last.x - ( rect.left + rect.width / 2 ) ) / width, 0, 1 ),
			clamp( 0.5 + ( last.y - ( rect.top + rect.height / 2 ) ) / height, 0, 1 )
		);
	};

	const cancel = () => {
		if ( null !== frame ) {
			window.cancelAnimationFrame( frame );
			frame = null;
		}
		if ( null !== leaveFrame ) {
			window.cancelAnimationFrame( leaveFrame );
			leaveFrame = null;
		}
		last = null;
	};

	// Stopping resets at once.
	const reset = () => {
		cancel();
		handlers.reset();
	};

	// Leaving resets on the next frame: Firefox clears `:hover` after `pointerleave` fires, and the settle
	// transition the renderer writes only runs while the hover state is disengaged, so an immediate reset would snap.
	const onLeave = () => {
		cancel();
		leaveFrame = window.requestAnimationFrame( () => {
			leaveFrame = null;
			handlers.reset();
		} );
	};

	const onMove = ( event ) => {
		if ( 'touch' === event.pointerType ) {
			return;
		}
		if ( null !== leaveFrame ) {
			window.cancelAnimationFrame( leaveFrame );
			leaveFrame = null;
		}
		last = { x: event.clientX, y: event.clientY };
		if ( null === frame ) {
			frame = window.requestAnimationFrame( flush );
		}
	};

	return {
		start() {
			if ( running ) {
				return;
			}
			running = true;
			el.addEventListener( 'pointermove', onMove );
			el.addEventListener( 'pointerleave', onLeave );
		},
		stop() {
			if ( ! running ) {
				return;
			}
			running = false;
			el.removeEventListener( 'pointermove', onMove );
			el.removeEventListener( 'pointerleave', onLeave );
			reset();
		},
	};
}

/**
 * Run a callback now and whenever the reduced-motion preference changes.
 *
 * @param {Function} callback Called with `true` when reduced motion is requested.
 * @return {Function} Unsubscribe.
 */
export function onReducedMotionChange( callback ) {
	const query =
		typeof window.matchMedia === 'function'
			? window.matchMedia( '(prefers-reduced-motion: reduce)' )
			: null;
	const apply = () => callback( null !== query && query.matches );
	apply();
	if ( null === query ) {
		return () => {};
	}
	if ( typeof query.addEventListener === 'function' ) {
		query.addEventListener( 'change', apply );
		return () => query.removeEventListener( 'change', apply );
	}
	query.addListener( apply );
	return () => query.removeListener( apply );
}

/**
 * Start a tracker per element, each following the live reduced-motion preference. Returns one teardown.
 *
 * With an `effect` slug (the `data-sgs-fx` token) every element runs through `bootGated`: an element whose effect is
 * off at the current device tier gets no listener, one entering such a tier is stopped and reset, and one leaving it
 * is started again (Spec 38A FR-38A-23). Without a slug every element is always bound.
 *
 * @param {HTMLElement[]} els      Elements.
 * @param {Function}      create   Builds one element's tracker controller.
 * @param {string}        [effect] Effect slug to gate on the per-device off switch.
 * @return {Function} Teardown that stops every tracker and the preference listener.
 */
export function bindAll( els, create, effect ) {
	if ( effect ) {
		return bootGated( effect, els, ( el ) => {
			const c = create( el );
			const off = onReducedMotionChange( ( reduced ) =>
				reduced ? c.stop() : c.start()
			);
			return () => {
				off();
				c.stop();
			};
		} );
	}
	const controllers = els.map( create );
	const off = onReducedMotionChange( ( reduced ) =>
		controllers.forEach( ( c ) => ( reduced ? c.stop() : c.start() ) )
	);
	return () => {
		off();
		controllers.forEach( ( c ) => c.stop() );
	};
}
