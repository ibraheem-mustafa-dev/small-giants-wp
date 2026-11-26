/**
 * SGS Container — frontend interactivity.
 *
 * Handles (a responsive background video is swapped by the shared device-video module, `src/shared/media/device-video.js`):
 * - "Scroll sideways" rows: a focusable named region while they overflow (src/shared/scroll-region), and their optional arrows,
 *   position dots and mouse drag (src/shared/scroll-row-controls).
 *
 * Loaded only when the container block is on the page (viewScriptModule in block.json).
 *
 * @package SGS\Blocks
 */

import { initScrollRegions } from '../../shared/scroll-region/index.js';
import { initScrollRowControls } from '../../shared/scroll-row-controls/index.js';

( function () {
	'use strict';

	/**
	 * Initialise all container blocks on the page.
	 */
	function init() {
		// "Scroll sideways" rows become focusable, named regions while they overflow.
		initScrollRegions( '.sgs-container__inner[data-sgs-scroll-region]' );
		// Their optional arrows, position dots and mouse drag (each off by default).
		initScrollRowControls(
			'.sgs-container__inner[data-sgs-scroll-controls]'
		);
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
