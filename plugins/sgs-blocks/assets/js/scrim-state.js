/**
 * Shared viewport scrim: shows each scrim while its owner is open.
 *
 * includes/helpers-scrim.php::sgs_scrim_render prints every scrim at `wp_footer` with the CSS selector that matches
 * while its owner is open (`data-sgs-scrim-open`, e.g. `.{uid}[open]`, `.{uid}:modal` or
 * `.{uid} [data-sgs-mega-trigger][aria-expanded="true"]`). This script sets `data-sgs-scrim-on` on the scrim while
 * that selector matches, and the scrim's own open rule keys on it.
 *
 * Every owner opens through script (`showModal()`, or a disclosure setting `aria-expanded`). The observer re-checks
 * on any `open` or `aria-expanded` change and on any element added or removed (an owner removed, replaced or moved
 * while open, or a scrim added after load), and its callback runs before the next frame, so the scrim starts its fade
 * in the same frame its owner opens or closes.
 *
 * An owner carrying `.is-closing` counts as closed. The shared nav store (src/shared/nav-interactivity/store.js::runClose)
 * adds that class when a drawer starts to close and removes `[open]` only after every exit animation has finished, so
 * keying on `[open]` alone starts the scrim's fade after the exit instead of with it, and a long exit leaves the page
 * dimmed under a drawer that is already gone. A second observer re-checks when `is-closing` is added to or removed from
 * an element (it ignores every other class change).
 *
 * The scrim does not use CSS `:root:has(<open selector>)`: a `:has()` on the document root makes the browser
 * re-check the whole document on every style pass a script causes (plans/archive/2026-11-19-stage-c-per-instance-css.md).
 *
 * @package SGS\Blocks
 */
( function () {
	'use strict';

	var CLOSING_CLASS = 'is-closing';
	var CLOSING_RE = /(^|\s)is-closing(\s|$)/;

	/** Whether any element matching the owner's open selector is open and not on its way out. */
	function ownerOpen( selector ) {
		var owners = document.querySelectorAll( selector );
		for ( var i = 0; i < owners.length; i++ ) {
			if ( ! owners[ i ].classList.contains( CLOSING_CLASS ) ) {
				return true;
			}
		}
		return false;
	}

	function sync() {
		var scrims = document.querySelectorAll( '.sgs-scrim[data-sgs-scrim-open]' );
		for ( var i = 0; i < scrims.length; i++ ) {
			var scrim = scrims[ i ];
			var on = false;
			try {
				on = ownerOpen( scrim.getAttribute( 'data-sgs-scrim-open' ) );
			} catch ( e ) {
				on = false; // a selector this browser cannot read (e.g. :modal in an old engine) leaves the scrim hidden.
			}
			if ( on !== scrim.hasAttribute( 'data-sgs-scrim-on' ) ) {
				scrim.toggleAttribute( 'data-sgs-scrim-on', on );
			}
		}
	}

	new MutationObserver( sync ).observe( document.documentElement, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: [ 'open', 'aria-expanded' ],
	} );
	new MutationObserver( function ( records ) {
		for ( var i = 0; i < records.length; i++ ) {
			var was = CLOSING_RE.test( records[ i ].oldValue || '' );
			if ( was !== records[ i ].target.classList.contains( CLOSING_CLASS ) ) {
				sync();
				return;
			}
		}
	} ).observe( document.documentElement, {
		subtree: true,
		attributes: true,
		attributeFilter: [ 'class' ],
		attributeOldValue: true,
	} );
	sync();
} )();
