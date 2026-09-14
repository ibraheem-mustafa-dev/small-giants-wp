/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — frontend interactivity.
 *
 * Trimmed from nav-menu/view.js (D1059 split, 2026-09-14) — that file also
 * registered `store('sgs/nav')` (burger toggle actions — this block never
 * renders a burger) and `store('sgs/mega')` (desktop hover-disclosure —
 * this block's mega items degrade to a plain link or a plain accordion row,
 * never the hover-disclosure panel that store drives). Neither import
 * belongs here; `sgs/nav-drawer`'s own view.js owns the drawer dialog's
 * open/close/focus-trap mechanics independently of this file.
 *
 * Three responsibilities:
 *  1. Compute `aria-current="page"` CLIENT-SIDE at mount, comparing
 *     `location.pathname` against each link's `data-sgs-nav-path` (set by
 *     render.php). This canNOT be done server-side: the stack sits behind
 *     LiteSpeed page cache, so a server-baked aria-current would serve a
 *     stale page's answer to every cached visitor (FR-36-10/-11).
 *  2. Wire the opt-in sliding-indicator / magnet motion effects, keyed on
 *     the same data-attribute flags render.php emits (BOTH-classified —
 *     the drawer offers the identical controls the bar does).
 *  3. Wire the in-drawer drill-down enhancement (`nav-drilldown.js`) when
 *     the operator picked "Drill-down" over the default "Accordion" — an
 *     accordion drawer needs no JS at all beyond the native `<details>`.
 *
 * Every link is already a real, crawlable server-rendered <a href> — this is
 * progressive enhancement only.
 *
 * A 4th responsibility: reset the two opt-in motion effects on a
 * back/forward-cache RESTORE (`pageshow` with `event.persisted === true`).
 *
 * @package SGS\Blocks
 */

import { initNavIndicator } from '../../shared/effects/nav-indicator';
import { initMagnet } from '../../shared/effects/magnet';
import { initDrillDown } from '../../shared/effects/nav-drilldown';

/**
 * Normalise a path the same way render.php's items do: no trailing slash,
 * '' for the root, so a comparison against `location.pathname` is exact.
 *
 * @param {string} pathname A URL pathname.
 * @return {string} Normalised path.
 */
function normalisePath( pathname ) {
	return pathname.endsWith( '/' ) && pathname !== '/'
		? pathname.replace( /\/$/, '' )
		: pathname;
}

/**
 * Mark the current-page link (if any) inside one `.sgs-nav-drawer-menu` list.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-drawer-menu` root.
 */
function markCurrentPage( root ) {
	const current = normalisePath( window.location.pathname );
	root.querySelectorAll(
		'.sgs-nav-drawer-menu__link[data-sgs-nav-path], .sgs-nav-drawer-menu__sublink[data-sgs-nav-path]'
	).forEach(
		( link ) => {
			const path = normalisePath( link.dataset.sgsNavPath || '' );
			if ( path !== '' && path === current ) {
				link.setAttribute( 'aria-current', 'page' );
			} else {
				link.removeAttribute( 'aria-current' );
			}
		}
	);
}

// Cleanup functions for every currently-active opt-in effect instance
// (sliding indicator / magnet label), across every sgs/nav-drawer-menu on
// the page — torn down and re-created wholesale on a bfcache restore.
let activeCleanups = [];

/**
 * Wire the opt-in motion effects for one `.sgs-nav-drawer-menu__bar`, keyed on the
 * data-attribute flags render.php emits only when an operator has switched
 * the effect on.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-drawer-menu` root.
 */
function initBarEffects( root ) {
	const bar = root.querySelector( '.sgs-nav-drawer-menu__bar' );
	if ( ! bar ) {
		return;
	}

	if ( bar.hasAttribute( 'data-sgs-nav-indicator' ) ) {
		activeCleanups.push( initNavIndicator( bar, 'sgs-nav-drawer-menu' ) );
	}

	if ( bar.hasAttribute( 'data-magnet' ) ) {
		bar.querySelectorAll( '.sgs-nav-drawer-menu__magnet-target' ).forEach(
			( el ) => activeCleanups.push( initMagnet( el ) )
		);
	}

	// Drill-down (FR-36-6): only when the operator picked "Drill-down" over
	// the default "Accordion" — an accordion drawer needs no JS at all
	// beyond the native <details>.
	if ( 'drill-down' === bar.dataset.sgsNavSubmenuModel ) {
		activeCleanups.push( initDrillDown( bar ) );
	}
}

/**
 * Initialise every sgs/nav-drawer-menu instance on the page.
 */
function init() {
	document.querySelectorAll( '.wp-block-sgs-nav-drawer-menu' ).forEach( ( root ) => {
		markCurrentPage( root );
		initBarEffects( root );
	} );
}

/**
 * Tear down every currently-active effect instance (listeners + any
 * DOM the effect created, e.g. the indicator pill).
 */
function teardownEffects() {
	activeCleanups.forEach( ( cleanup ) => cleanup() );
	activeCleanups = [];
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}

// bfcache restore: replay is exact, including any mid-transition motion
// state, so tear everything down and re-initialise from a clean slate.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardownEffects();
		init();
	}
} );
