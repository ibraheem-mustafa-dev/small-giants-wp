/**
 * SGS Nav Menu (sgs/nav-menu) — frontend interactivity.
 *
 * Three responsibilities:
 *  1. Register the shared `store('sgs/nav')` (importing it is what registers
 *     it — see the module doc-block in shared/nav-interactivity/store.js).
 *     This is what makes the burger's `data-wp-on--click="actions.toggleDrawer"`
 *     work.
 *  2. Register the separate `store('sgs/mega')` (importing it is what
 *     registers it — see the module doc-block in
 *     shared/nav-interactivity/mega-disclosure.js). This is what makes a
 *     desktop mega-menu item's disclosure trigger/panel — hover-intent open,
 *     click/tap toggle, keyboard, single-open — work (U9).
 *  3. Compute `aria-current="page"` CLIENT-SIDE at mount, comparing
 *     `location.pathname` against each link's `data-sgs-nav-path` (set by
 *     render.php). This canNOT be done server-side: the stack sits behind
 *     LiteSpeed page cache, so a server-baked aria-current would serve a
 *     stale page's answer to every cached visitor (FR-36-10/-11).
 *
 * Every link is already a real, crawlable server-rendered <a href> — this is
 * progressive enhancement only; with zero JS the bar still works, it just
 * has no "you are here" indicator and the burger/mega-disclosure has no
 * handler.
 *
 * A 4th responsibility: reset the two opt-in motion effects (sliding
 * indicator, magnet label) on a back/forward-cache RESTORE. The bfcache
 * replays the page's JS state exactly as it was frozen — a user who hovered
 * an item, navigated away, then pressed Back would otherwise see the
 * indicator pill still parked mid-transition with no live cursor anywhere
 * near it (verified: web.dev bfcache docs; Hyvä/Magento's documented bfcache
 * breakage). `pageshow` with `event.persisted === true` is the signal.
 *
 * @package SGS\Blocks
 */

import '../../shared/nav-interactivity/store';
import '../../shared/nav-interactivity/mega-disclosure';
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
 * Mark the current-page link (if any) inside one `.sgs-nav-menu` bar.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-menu` root.
 */
function markCurrentPage( root ) {
	const current = normalisePath( window.location.pathname );
	/*
	 * Sublinks are included deliberately (Bean, 2026-07-31). This selector was
	 * `.sgs-nav-menu__link[...]` only, so a DROPDOWN child could never be marked
	 * as the current page — a visitor sitting on /services/web/ saw nothing
	 * highlighted. `data-sgs-nav-path` was already emitted on children, which
	 * made the omission easy to miss: the data was there, nothing read it.
	 * Applies in the bar AND inside the burger drawer, since the drawer holds
	 * its own nav-menu instance and this runs per root.
	 */
	root.querySelectorAll(
		'.sgs-nav-menu__link[data-sgs-nav-path], .sgs-nav-menu__sublink[data-sgs-nav-path]'
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
// (sliding indicator / magnet label), across every sgs/nav-menu on the page —
// torn down and re-created wholesale on a bfcache restore (see below).
let activeCleanups = [];

/**
 * Wire the opt-in motion effects (Mega-Menu Build Spec §6 rows 2 & 4) for
 * one `.sgs-nav-menu__bar`, keyed on the data-attribute flags render.php
 * emits only when an operator has switched the effect on.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-nav-menu` root.
 */
function initBarEffects( root ) {
	const bar = root.querySelector( '.sgs-nav-menu__bar' );
	if ( ! bar ) {
		return;
	}

	if ( bar.hasAttribute( 'data-sgs-nav-indicator' ) ) {
		activeCleanups.push( initNavIndicator( bar ) );
	}

	if ( bar.hasAttribute( 'data-magnet' ) ) {
		bar.querySelectorAll( '.sgs-nav-menu__magnet-target' ).forEach(
			( el ) => activeCleanups.push( initMagnet( el ) )
		);
	}

	// In-drawer drill-down (FR-36-6): only the drawer's OWN nav-menu instance
	// ever carries this data attribute (render.php's render_items_drawer()
	// fork), and only when the operator picked "Drill-down" over the default
	// "Accordion" — an accordion drawer needs no JS at all beyond the native
	// <details>, so this never runs for it.
	if ( 'drill-down' === bar.dataset.sgsNavSubmenuModel ) {
		activeCleanups.push( initDrillDown( bar ) );
	}
}

/**
 * Initialise every sgs/nav-menu instance on the page.
 */
function init() {
	document.querySelectorAll( '.wp-block-sgs-nav-menu' ).forEach( ( root ) => {
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
// state, so tear everything down and re-initialise from a clean slate —
// this also re-runs markCurrentPage, which is cheap and keeps the
// current-page indicator correct if the restore is a different history
// entry than the one that was frozen.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardownEffects();
		init();
	}
} );
