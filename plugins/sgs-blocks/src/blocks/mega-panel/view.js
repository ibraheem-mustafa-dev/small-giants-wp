/**
 * SGS Mega Panel — frontend view module.
 *
 * Wires the shared cursor spotlight into every rendered panel. The panel's
 * open motion and item stagger belong to the bar that shows it
 * (`sgs/nav-bar-menu`): on the Entrance model its `mega-item` and `mega-row`
 * parts take stored delays written by the server and the bar's
 * `panel-motion-state.js` publishes the open state (Spec 38A FR-38A-51); a bar
 * off the model keeps its U-5 CSS stagger. Nothing here runs on open.
 *
 * - Cursor spotlight (`initSpotlight`), always on for the aside slot when a
 *   `.sgs-mega-aside` child is present — no opt-in attribute for this one.
 *
 * @package SGS\Blocks
 */

import { initSpotlight } from '../../shared/effects/spotlight';

/**
 * Boot the motion effects for one rendered mega-panel instance.
 *
 * @param {HTMLElement} panelEl The `.wp-block-sgs-mega-panel` root element.
 * @return {Function} Teardown — disconnects observers and effect cleanups.
 */
function bootMegaPanel( panelEl ) {
	const teardownFns = [];

	const asideEl = panelEl.querySelector( '.sgs-mega-aside' );
	if ( asideEl ) {
		// Attribute is applied here (JS-only) rather than by render.php —
		// this is the mechanism that scopes the shared spotlight CSS contract
		// (style.css `.sgs-mega-aside[data-spotlight]`) to asides that actually
		// got the effect wired up, without needing a new PHP-side attribute.
		asideEl.setAttribute( 'data-spotlight', '' );
		const spotlightCleanup = initSpotlight( asideEl );
		teardownFns.push( spotlightCleanup );
	}

	return () => teardownFns.forEach( ( fn ) => 'function' === typeof fn && fn() );
}

document
	.querySelectorAll( '.wp-block-sgs-mega-panel' )
	.forEach( ( panelEl ) => bootMegaPanel( panelEl ) );
