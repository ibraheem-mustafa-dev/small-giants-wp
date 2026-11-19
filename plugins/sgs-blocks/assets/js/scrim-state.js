/**
 * Shared viewport scrim: shows each scrim while its owner is open.
 *
 * includes/helpers-scrim.php::sgs_scrim_render prints every scrim at `wp_footer` with the CSS selector that matches
 * while its owner is open (`data-sgs-scrim-open`, e.g. `.{uid}[open]`, `.{uid}:modal` or
 * `.{uid} [data-sgs-mega-trigger][aria-expanded="true"]`). This script sets `data-sgs-scrim-on` on the scrim while
 * that selector matches, and the scrim's own open rule keys on it.
 *
 * Every owner opens through script (`showModal()`, or a disclosure setting `aria-expanded`), and both change an
 * attribute this script watches (`open`, `aria-expanded`). The observer's callback runs before the next frame, so
 * the scrim starts its fade in the same frame its owner opens.
 *
 * Why not CSS `:root:has(<open selector>)`: a `:has()` on the document root makes the browser re-check the whole
 * document on every style pass a script causes. Mama's product page spent about 3.5 s of style work on two such
 * rules (local mirror, phone size, CPU slowed 4x, 2026-11-19; plans/2026-11-19-stage-c-per-instance-css.md).
 *
 * @package SGS\Blocks
 */
( function () {
	'use strict';

	function sync() {
		var scrims = document.querySelectorAll( '.sgs-scrim[data-sgs-scrim-open]' );
		for ( var i = 0; i < scrims.length; i++ ) {
			var scrim = scrims[ i ];
			var on = false;
			try {
				on = null !== document.querySelector( scrim.getAttribute( 'data-sgs-scrim-open' ) );
			} catch ( e ) {
				on = false; // a selector this browser cannot read (e.g. :modal in an old engine) leaves the scrim hidden.
			}
			if ( on !== scrim.hasAttribute( 'data-sgs-scrim-on' ) ) {
				scrim.toggleAttribute( 'data-sgs-scrim-on', on );
			}
		}
	}

	if ( ! document.querySelector( '.sgs-scrim[data-sgs-scrim-open]' ) ) {
		return;
	}
	new MutationObserver( sync ).observe( document.documentElement, {
		subtree: true,
		attributes: true,
		attributeFilter: [ 'open', 'aria-expanded' ],
	} );
	sync();
} )();
