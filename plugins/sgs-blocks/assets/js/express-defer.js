/**
 * Late start for the payment plugin's wallet-button scripts (Spec 27 FR-27-EXPRESS-DEFER).
 *
 * `includes/woocommerce/express-defer.php` prints the payment plugin's front-end scripts, and the inline data that
 * belongs to them, as inert `<script type="text/plain" data-sgs-defer="<real type>">` tags in their normal places.
 * This script waits for the shopper's first scroll, pointer press, key press or touch, or for the wallet buttons to come
 * within one screen height of the viewport, whichever happens first. It then runs the held scripts once, in the order
 * they sit in the page, each external file finishing before the next starts (the order a normal page load keeps). Only a
 * tag carrying `data-sgs-defer` is ever touched, so any script the server did not hold loads as it always did. When the
 * last held script has run it dispatches `sgs:express-loaded` on `window`, which the buy box listens for.
 *
 * The payment plugin starts its controllers the moment its own script runs (it never waits for DOMContentLoaded or the
 * window load event; its skeleton script checks `document.readyState` itself), so running them late needs no replayed
 * events.
 */
( function () {
	'use strict';

	var HELD = 'script[type="text/plain"][data-sgs-defer]';
	var WATCH = '.sgs-buybox__express';
	var TRIGGERS = [ 'scroll', 'pointerdown', 'keydown', 'touchstart' ];
	var started = false;
	var observer = null;

	function release() {
		TRIGGERS.forEach( function ( name ) {
			window.removeEventListener( name, run, true );
		} );
		if ( observer ) {
			observer.disconnect();
			observer = null;
		}
	}

	/** The live copy of a held tag: same attributes and content, real type restored, never `defer` or `async`. */
	function revive( held ) {
		var live = document.createElement( 'script' );
		Array.prototype.forEach.call( held.attributes, function ( attr ) {
			if ( 'type' === attr.name || 'data-sgs-defer' === attr.name || 'defer' === attr.name || 'async' === attr.name ) {
				return;
			}
			live.setAttribute( attr.name, attr.value );
		} );
		var type = held.getAttribute( 'data-sgs-defer' );
		if ( type && 'text/javascript' !== type ) {
			live.type = type;
		}
		if ( ! held.hasAttribute( 'src' ) ) {
			live.text = held.textContent;
		}
		return live;
	}

	function finish() {
		window.dispatchEvent( new CustomEvent( 'sgs:express-loaded' ) );
	}

	function step( list, index ) {
		if ( index >= list.length ) {
			finish();
			return;
		}
		var held = list[ index ];
		var live = revive( held );
		var external = held.hasAttribute( 'src' );
		var next = function () {
			step( list, index + 1 );
		};
		if ( external ) {
			live.async = false;
			live.addEventListener( 'load', next );
			live.addEventListener( 'error', next );
		}
		if ( held.parentNode ) {
			held.parentNode.replaceChild( live, held );
		}
		if ( ! external ) {
			next();
		}
	}

	function run() {
		if ( started ) {
			return;
		}
		started = true;
		release();
		step( Array.prototype.slice.call( document.querySelectorAll( HELD ) ), 0 );
	}

	if ( ! document.querySelector( HELD ) ) {
		return;
	}
	TRIGGERS.forEach( function ( name ) {
		window.addEventListener( name, run, { capture: true, passive: true } );
	} );
	function watch() {
		var target = document.querySelector( WATCH );
		if ( target && 'IntersectionObserver' in window ) {
			observer = new IntersectionObserver(
				function ( entries ) {
					if ( entries.some( function ( entry ) { return entry.isIntersecting; } ) ) {
						run();
					}
				},
				{ rootMargin: '100% 0px 100% 0px' }
			);
			observer.observe( target );
		}
	}
	if ( 'complete' === document.readyState ) {
		watch();
	} else {
		window.addEventListener( 'load', watch );
	}
}() );
