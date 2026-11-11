/**
 * SGS Nav Drawer Menu (sgs/nav-drawer-menu) — frontend interactivity.
 * This file does not register `store('sgs/nav')` (burger toggle actions — this
 * block never renders a burger) or `store('sgs/mega')` (desktop
 * hover-disclosure — this block's mega items degrade to a plain link or a
 * plain accordion row, never the hover-disclosure panel that store drives).
 * `sgs/nav-drawer`'s own view.js owns the drawer dialog's open/close/
 * focus-trap mechanics independently of this file.
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
 * Lines between a multi-column list's rows (src/shared/separators/), in a browser
 * without CSS gap decorations.
 *
 * A 4th responsibility: reset the two opt-in motion effects on a
 * back/forward-cache RESTORE (`pageshow` with `event.persisted === true`).
 *
 * @package SGS\Blocks
 */

import { initSeparators } from '../../shared/separators';
import { DRAWER_PHASE_EVENT } from '../../shared/nav-interactivity/drawer-lifecycle';

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
	).forEach( ( link ) => {
		const path = normalisePath( link.dataset.sgsNavPath || '' );
		if ( path !== '' && path === current ) {
			link.setAttribute( 'aria-current', 'page' );
		} else {
			link.removeAttribute( 'aria-current' );
		}
	} );

	// A mega item's panel links are container-block links without a
	// `data-sgs-nav-path`. When one of them points at the current page, the
	// item's accordion row takes `data-sgs-nav-has-current`, which the
	// ancestor-current rule in includes/nav-menu-css.php reads.
	root.querySelectorAll( '.sgs-nav-drawer-menu__mega-body' ).forEach(
		( body ) => {
			const row = body.closest( '.sgs-nav-drawer-menu__accordion-row' );
			if ( ! row ) {
				return;
			}
			const hasCurrent = Array.from(
				body.querySelectorAll( 'a[href]' )
			).some( ( anchor ) => {
				if ( anchor.origin !== window.location.origin ) {
					return false;
				}
				const path = normalisePath( anchor.pathname );
				return path !== '' && path === current;
			} );
			row.toggleAttribute( 'data-sgs-nav-has-current', hasCurrent );
		}
	);
}

// Cleanup functions for every currently-active opt-in effect instance
// (sliding indicator / magnet label), across every sgs/nav-drawer-menu on
// the page — torn down and re-created wholesale on a bfcache restore.
let activeCleanups = [];

// The effects module, once loaded (bar-effects.js).
let effects = null;

/**
 * Load the effects module (once) and start the effects on every drawer menu on the page.
 *
 * @return {Promise<void>} Resolves once the effects are running.
 */
function startEffects() {
	return import(
		/* webpackChunkName: "drawer-menu-effects" */ './bar-effects'
	).then( ( module ) => {
		if ( effects ) {
			return;
		}
		effects = module;
		document
			.querySelectorAll( '.wp-block-sgs-nav-drawer-menu' )
			.forEach( ( root ) => {
				activeCleanups.push( ...effects.initBarEffects( root ) );
			} );
	} );
}

/**
 * Run `start` once, on the first pointer, touch or key press anywhere on the page, or when any drawer starts opening
 * (a drawer opened by script, with no press first). The menu sits in a closed drawer until then, so its effects
 * need not cost anything at page load; the press that opens the drawer starts the load before its click lands.
 *
 * @param {Function} start Called once.
 */
function whenFirstNeeded( start ) {
	const types = [ 'pointerdown', 'touchstart', 'keydown' ];
	const fire = () => {
		types.forEach( ( type ) =>
			document.removeEventListener( type, fire, true )
		);
		document.removeEventListener( DRAWER_PHASE_EVENT, fire, true );
		start();
	};
	types.forEach( ( type ) =>
		document.addEventListener( type, fire, {
			capture: true,
			passive: true,
		} )
	);
	// The phase event fires on the drawer itself and does not bubble; a capturing listener on the document still sees it.
	document.addEventListener( DRAWER_PHASE_EVENT, fire, true );
}

/**
 * Initialise every sgs/nav-drawer-menu instance on the page.
 */
function init() {
	document
		.querySelectorAll( '.wp-block-sgs-nav-drawer-menu' )
		.forEach( ( root ) => {
			markCurrentPage( root );
		} );
	whenFirstNeeded( startEffects );
	// A multi-column list with lines between its rows: the fallback overlay for
	// browsers without CSS gap decorations (a no-op elsewhere).
	initSeparators();
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
		document
			.querySelectorAll( '.wp-block-sgs-nav-drawer-menu' )
			.forEach( ( root ) => {
				markCurrentPage( root );
				if ( effects ) {
					activeCleanups.push( ...effects.initBarEffects( root ) );
				}
			} );
	}
} );
