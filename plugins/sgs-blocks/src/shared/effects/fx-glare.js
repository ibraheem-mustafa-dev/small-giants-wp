/**
 * SGS motion: the glare pointer writer (Spec 38A FR-38A-41, FR-38A-47). Tier V.
 *
 * The `@sgs/fx-glare` script module the PHP motion registry enqueues for an element marked `data-sgs-fx~="glare"`.
 * It writes `--sgs-glare-x` and `--sgs-glare-y` (percentages of the element's box) on that element and nothing else;
 * `assets/css/fx-glare.css` paints the radial highlight in the injected layer from them and from the glare colour,
 * opacity and size custom properties. Glare is its own module, not part of Follow pointer's, because the registry
 * loads one module per `data-sgs-fx` token: glare works on an element with no Follow pointer, and Follow pointer
 * works with no glare. Under reduced motion nothing is written, live.
 *
 * @package
 */

import { trackPointer, bindAll } from './pointer-track';

const SELECTOR = '[data-sgs-fx~="glare"]';
const PROP_X = '--sgs-glare-x';
const PROP_Y = '--sgs-glare-y';

let teardown = null;

/**
 * One element's pointer tracker.
 *
 * @param {HTMLElement} el Element.
 * @return {{start: Function, stop: Function}} Controller.
 */
function bindElement( el ) {
	return trackPointer( el, {
		move( nx, ny ) {
			el.style.setProperty( PROP_X, ( nx * 100 ).toFixed( 1 ) + '%' );
			el.style.setProperty( PROP_Y, ( ny * 100 ).toFixed( 1 ) + '%' );
		},
		reset() {
			el.style.removeProperty( PROP_X );
			el.style.removeProperty( PROP_Y );
		},
	} );
}

/**
 * Bind every marked element.
 *
 * @return {void}
 */
function boot() {
	const els = [ ...document.querySelectorAll( SELECTOR ) ];
	if ( els.length > 0 ) {
		teardown = bindAll( els, bindElement, 'glare' );
	}
}

boot();

// A bfcache restore keeps the listeners but may describe a DOM that has been re-rendered: rebuild.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		if ( teardown ) {
			teardown();
			teardown = null;
		}
		boot();
	}
} );
