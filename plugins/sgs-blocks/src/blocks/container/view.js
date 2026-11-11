/**
 * SGS Container — frontend interactivity.
 *
 * Handles (a responsive background video is swapped by the shared device-video module, `src/shared/media/device-video.js`):
 * - Separators: in a browser without CSS gap decorations, paints the lines between a
 *   grid or flex layout's items (src/shared/separators/); a no-op elsewhere.
 *
 * Loaded only when the container block is on the page (viewScriptModule in block.json).
 *
 * @package SGS\Blocks
 */

import { initSeparators } from '../../shared/separators';
import { initScrollRegions } from '../../shared/scroll-region/index.js';

( function () {
	'use strict';

	/**
	 * Initialise all container blocks on the page.
	 */
	function init() {
		initSeparators();
		// "Scroll sideways" rows become focusable, named regions while they overflow.
		initScrollRegions( '.sgs-container__inner[data-sgs-scroll-region]' );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
