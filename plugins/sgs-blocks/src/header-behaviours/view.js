/**
 * Header Behaviours — frontend view script (F1 + F2, FR-S9-9; per-row Phase 1).
 *
 * Responsibilities:
 *   1. Publishes `--sgs-header-height` CSS custom property on :root and body
 *      via ResizeObserver so sticky headers don't obscure anchor targets
 *      (WCAG 2.4.11 — scroll-padding-top picks this up via CSS). UNCHANGED.
 *   2. Reads the INDEPENDENT flag SET from body class (not a single slug —
 *      several flags can be present at once):
 *      - body.sgs-header-behaviour-transparent → toggles body.is-header-scrolled
 *        when scrollY > 50.
 *      - body.sgs-header-behaviour-shrink → toggles body.is-header-shrunk
 *        (its OWN state class + threshold, independent of transparent, so the
 *        two behaviours can be tuned separately).
 *      - body.sgs-header-behaviour-hide-on-scroll-down (FR-37-13, LIVE — set
 *        by the "Hide on scroll" Advanced control on sgs/site-header) →
 *        toggles body.is-header-scrolling-down when scrollY > 100 AND
 *        direction is down.
 *   3. When none of transparent / shrink / hide-on-scroll-down flags are on
 *      body, the scroll listener is skipped entirely — zero event overhead on
 *      pages without active behaviours.
 *   4. PER-ROW (Phase 1, additive, does NOT replace #2/#3 above): scans every
 *      `.sgs-row-behaviour` element (emitted by sgs/site-header-row +
 *      sgs/site-footer-row render.php when rowTransparent/rowHideOnScroll is
 *      ON for at least one device tier) and toggles ITS OWN state classes
 *      (is-row-scrolled / is-row-hidden) independently of every other row and
 *      of the header-level body-class path. Device tier is resolved via
 *      matchMedia at the project's 768/1024 breakpoints and re-evaluated on
 *      resize, so a row can be transparent on desktop only, for example.
 *
 * State classes for #2/#3 are toggled on document.body; CSS descends from
 * body. State classes for #4 are toggled on the ROW element itself; CSS
 * descends from the row's own class/uid (header-behaviours.css).
 *
 * Single shared passive scroll listener + requestAnimationFrame coalesce
 * throttle serves BOTH the header-level (#2/#3) and per-row (#4) paths.
 *
 * @package SGS\Blocks
 */

/* global ResizeObserver */

( function () {
	'use strict';

	/**
	 * Locate the header element.
	 *
	 * @return {HTMLElement|null}
	 */
	function getHeaderEl() {
		return document.querySelector( 'header.sgs-site-header' );
	}

	/**
	 * Read the active behaviour flag SET from body class. Independent flags —
	 * more than one may be true at once (e.g. sticky AND transparent).
	 *
	 * @return {{transparent: boolean, shrink: boolean, hideOnScrollDown: boolean}}
	 */
	function getActiveBehaviours() {
		const classes = document.body.className;
		return {
			transparent: / sgs-header-behaviour-transparent(?: |$)/.test(
				' ' + classes
			),
			shrink: / sgs-header-behaviour-shrink(?: |$)/.test( ' ' + classes ),
			hideOnScrollDown: / sgs-header-behaviour-hide-on-scroll-down(?: |$)/.test(
				' ' + classes
			),
		};
	}

	/**
	 * Publish `--sgs-header-height` (integer px) to :root and body.
	 *
	 * @param {number} height
	 */
	function publishHeight( height ) {
		const value = Math.round( height ) + 'px';
		document.documentElement.style.setProperty( '--sgs-header-height', value );
		document.body.style.setProperty( '--sgs-header-height', value );
	}

	/**
	 * Wire up ResizeObserver for F1 (header-height publisher).
	 *
	 * @param {HTMLElement} header
	 */
	function initHeightPublisher( header ) {
		if ( typeof ResizeObserver === 'undefined' ) {
			// Graceful degradation: publish once from getBoundingClientRect.
			publishHeight( header.getBoundingClientRect().height );
			return;
		}
		const ro = new ResizeObserver( function ( entries ) {
			for ( const entry of entries ) {
				const h =
					entry.borderBoxSize && entry.borderBoxSize[ 0 ]
						? entry.borderBoxSize[ 0 ].blockSize
						: entry.contentRect.height;
				publishHeight( h );
			}
		} );
		ro.observe( header );
	}

	/**
	 * Wire up the scroll listener for F2 behaviour state classes. Transparent
	 * and shrink each get their OWN state class (is-header-scrolled /
	 * is-header-shrunk) so the two axes can be tuned independently — a header
	 * can be transparent-only, shrink-only, or both at once. State is toggled
	 * on document.body, not on the header element.
	 *
	 * @param {{transparent: boolean, shrink: boolean, hideOnScrollDown: boolean}} behaviours Active flag set.
	 */
	function initScrollBehaviours( behaviours ) {
		const { transparent, shrink, hideOnScrollDown } = behaviours;

		if ( ! transparent && ! shrink && ! hideOnScrollDown ) {
			return;
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;

			// Transparent → opaque transition (own state class on body).
			if ( transparent ) {
				if ( scrollY > 50 ) {
					document.body.classList.add( 'is-header-scrolled' );
				} else {
					document.body.classList.remove( 'is-header-scrolled' );
				}
			}

			// Shrink — own state class + threshold, independent of transparent.
			if ( shrink ) {
				if ( scrollY > 50 ) {
					document.body.classList.add( 'is-header-shrunk' );
				} else {
					document.body.classList.remove( 'is-header-shrunk' );
				}
			}

			// Hide on scroll down — smart reveal (state on body). FR-37-13:
			// LIVE, set by the "Hide on scroll" Advanced control on
			// sgs/site-header.
			if ( hideOnScrollDown ) {
				if ( scrollY > 100 && scrollY > prevScrollY ) {
					document.body.classList.add( 'is-header-scrolling-down' );
				} else if ( scrollY <= prevScrollY ) {
					document.body.classList.remove( 'is-header-scrolling-down' );
				}
			}

			prevScrollY = scrollY;
		}

		window.addEventListener(
			'scroll',
			function () {
				if ( ! rafScheduled ) {
					rafScheduled = true;
					window.requestAnimationFrame( onScrollTick );
				}
			},
			{ passive: true }
		);

		// Run once on load to set correct initial state (e.g. page loaded
		// mid-scroll after browser back-navigation).
		onScrollTick();
	}

	/**
	 * Resolve the CURRENT device tier via matchMedia, at the project's
	 * canonical 768/1024 breakpoints (SGS_BREAKPOINTS — mirrors
	 * utils/responsive.js MOBILE_MAX 767 / TABLET_MAX 1023; do not hardcode a
	 * second pair).
	 *
	 * @return {'desktop'|'tablet'|'mobile'}
	 */
	function getCurrentDeviceTier() {
		if ( window.matchMedia( '(max-width: 767px)' ).matches ) {
			return 'mobile';
		}
		if ( window.matchMedia( '(max-width: 1023px)' ).matches ) {
			return 'tablet';
		}
		return 'desktop';
	}

	/**
	 * Parse a space-separated tier-list data-attr value (e.g. "desktop
	 * tablet") into an array. Absent/empty attr → [] (behaviour off at every
	 * tier for this row).
	 *
	 * @param {string|undefined} value
	 * @return {string[]}
	 */
	function parseTierList( value ) {
		return ( value || '' ).split( ' ' ).filter( Boolean );
	}

	/**
	 * PER-ROW behaviour path (Phase 1). NEW parallel mechanism, additive to
	 * the header-level body-class path above (#2/#3) — does not read or write
	 * document.body state, and is skipped entirely when no row on the page
	 * carries `.sgs-row-behaviour` (zero overhead on pages without per-row
	 * behaviours). Each row's data-sgs-row-transparent /
	 * data-sgs-row-hide-on-scroll attrs list the tiers where that behaviour is
	 * ON (emitted by sgs/site-header-row + sgs/site-footer-row render.php via
	 * sgs_resolve_tier_booleans()). Toggles `is-row-scrolled` /
	 * `is-row-hidden` on the ROW element itself, independently per row.
	 */
	function initRowBehaviours() {
		const rows = document.querySelectorAll( '.sgs-row-behaviour' );
		if ( ! rows.length ) {
			return;
		}

		const rowData = Array.prototype.map.call( rows, function ( row ) {
			return {
				el: row,
				transparentTiers: parseTierList(
					row.dataset.sgsRowTransparent
				),
				hideOnScrollTiers: parseTierList(
					row.dataset.sgsRowHideOnScroll
				),
			};
		} );

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;
			const tier = getCurrentDeviceTier();
			const scrollingDown = scrollY > 100 && scrollY > prevScrollY;
			const scrollingUp = scrollY <= prevScrollY;

			rowData.forEach( function ( row ) {
				// Transparent → opaque, own state classes per row. The
				// resting-transparent CSS is keyed on `is-row-transparent-active`
				// (added ONLY on a tier where this row's transparent behaviour is
				// ON) — NOT on the data-attr's mere presence — so a row set
				// "transparent on desktop only" is NOT transparent on mobile/tablet.
				if ( row.transparentTiers.indexOf( tier ) !== -1 ) {
					row.el.classList.add( 'is-row-transparent-active' );
					row.el.classList.toggle(
						'is-row-scrolled',
						scrollY > 50
					);
				} else {
					row.el.classList.remove( 'is-row-transparent-active' );
					row.el.classList.remove( 'is-row-scrolled' );
				}

				// Hide on scroll down — smart reveal, own state class per row.
				if ( row.hideOnScrollTiers.indexOf( tier ) !== -1 ) {
					if ( scrollingDown ) {
						row.el.classList.add( 'is-row-hidden' );
					} else if ( scrollingUp ) {
						row.el.classList.remove( 'is-row-hidden' );
					}
				} else {
					row.el.classList.remove( 'is-row-hidden' );
				}
			} );

			prevScrollY = scrollY;
		}

		function onScrollOrResize() {
			if ( ! rafScheduled ) {
				rafScheduled = true;
				window.requestAnimationFrame( onScrollTick );
			}
		}

		window.addEventListener( 'scroll', onScrollOrResize, {
			passive: true,
		} );
		// Re-evaluate on resize too — a row's active tier can change
		// (desktop→tablet→mobile) without a scroll event firing.
		window.addEventListener( 'resize', onScrollOrResize, {
			passive: true,
		} );

		// Run once on load to set correct initial per-row state.
		onScrollTick();
	}

	/**
	 * Boot F1, F2 (header-level) and per-row behaviours after the DOM is ready.
	 */
	function boot() {
		const header = getHeaderEl();
		if ( header ) {
			// F1 — always publish header height for scroll-padding-top.
			initHeightPublisher( header );

			// F2 — scroll behaviour state; only active when a relevant flag exists.
			initScrollBehaviours( getActiveBehaviours() );
		}

		// Per-row (Phase 1) — independent of header presence; also serves
		// footer rows. No-ops when no `.sgs-row-behaviour` row exists.
		initRowBehaviours();
	}

	if (
		document.readyState === 'complete' ||
		document.readyState === 'interactive'
	) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
