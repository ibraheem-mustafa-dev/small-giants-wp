/**
 * SGS Hero — frontend interactivity.
 *
 * Handles:
 * - Animated SVG parts: a hero whose SVG carries `data-sgs-svg-parts` loads src/shared/svg-parts/svg-parts.js on
 *   demand; a hero without it loads nothing extra. (A responsive background or split video is swapped by the shared
 *   device-video module, `src/shared/media/device-video.js`.)
 *
 * Loaded only when the hero block is on the page.
 *
 * @package
 */

( function () {
	'use strict';

	/**
	 * Initialise all hero blocks on the page.
	 */
	function init() {
		const animated = document.querySelectorAll(
			'.sgs-hero [data-sgs-svg-parts]'
		);
		if ( animated.length ) {
			import( '../../shared/svg-parts/svg-parts' ).then(
				( { bootSvgParts } ) => {
					animated.forEach( ( layer ) =>
						bootSvgParts( layer.parentNode )
					);
				}
			);
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
