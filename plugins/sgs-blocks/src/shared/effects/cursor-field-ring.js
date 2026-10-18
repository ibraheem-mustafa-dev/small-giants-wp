/**
 * SGS motion: the cursor-field ring writer (Spec 38A FR-38A-34, FR-38A-47). Tier V.
 *
 * The `image-reveal` field type can carry a ring: the renderer's injected `span.sgs-motion-layer` with
 * `data-sgs-layer="cursor-field-ring"` (aria-hidden). This module writes the pointer's position inside the element, in
 * pixels, to `--sgs-ring-x` and `--sgs-ring-y` on that layer and nothing else (it also marks the emitter element with the same
 * `data-sgs-ring-live` flag, which switches on the lag of the revealed circle in `assets/css/fx-cursor-field.css`); `assets/css/fx-cursor-field.css` paints the
 * ring, scales it 0 to 1 while the element is hovered, and makes the position lag by transitioning the two registered
 * properties over the ring's lag.
 *
 * The first write after the pointer arrives is seeded: the layer's `data-sgs-ring-live` flag is off for it (the stylesheet
 * transitions the position only while the flag is on), then set on the next frame, so the ring appears under the pointer
 * instead of sliding in from the corner. Leaving drops the flag and keeps the last position, so the ring shrinks where it
 * stood. Under reduced motion nothing is written, live.
 *
 * @package
 */

import { trackPointer, bindAll } from './pointer-track';

const LAYER = ':scope > .sgs-motion-layer[data-sgs-layer="cursor-field-ring"]';
const PROP_X = '--sgs-ring-x';
const PROP_Y = '--sgs-ring-y';
const LIVE = 'data-sgs-ring-live';

/**
 * One element's ring tracker, or null when it has no ring layer.
 *
 * @param {HTMLElement} el Emitter element.
 * @return {{start: Function, stop: Function}|null} Controller.
 */
function bindElement( el ) {
	const layer = el.querySelector( LAYER );
	if ( ! layer ) {
		return { start() {}, stop() {} };
	}
	let liveFrame = null;
	const cancelLive = () => {
		if ( null !== liveFrame ) {
			window.cancelAnimationFrame( liveFrame );
			liveFrame = null;
		}
	};
	return trackPointer( el, {
		move( nx, ny ) {
			const rect = el.getBoundingClientRect();
			const width = el.offsetWidth || rect.width;
			const height = el.offsetHeight || rect.height;
			layer.style.setProperty( PROP_X, ( nx * width ).toFixed( 1 ) + 'px' );
			layer.style.setProperty( PROP_Y, ( ny * height ).toFixed( 1 ) + 'px' );
			if ( ! layer.hasAttribute( LIVE ) && null === liveFrame ) {
				liveFrame = window.requestAnimationFrame( () => {
					liveFrame = null;
					layer.setAttribute( LIVE, '' );
					el.setAttribute( LIVE, '' );
				} );
			}
		},
		reset() {
			cancelLive();
			layer.removeAttribute( LIVE );
			el.removeAttribute( LIVE );
		},
	} );
}

/**
 * Bind the ring tracker on every emitter that has a ring layer.
 *
 * @param {HTMLElement[]} els Emitter elements.
 * @return {Function} Teardown.
 */
export function initCursorFieldRings( els ) {
	return bindAll( els, bindElement );
}
