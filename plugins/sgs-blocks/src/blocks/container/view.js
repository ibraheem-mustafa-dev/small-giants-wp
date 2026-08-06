/**
 * SGS Container — frontend interactivity.
 *
 * Handles:
 * - Responsive video background: swaps src to mobile version on narrow viewports.
 * - Parallax: adds no-parallax class on touch devices to prevent iOS fixed-bg jitter.
 *
 * Loaded only when the container block is on the page (viewScriptModule in block.json).
 *
 * @package SGS\Blocks
 */

( function () {
	'use strict';

	// The locked SGS device standard: mobile < 768, tablet 768-1023, desktop >= 1024.
	// This file carried 600 until 2026-08-06 while sgs/hero's identical swap used
	// 768 — so the SAME background video changed source at different widths
	// depending on which block painted it. Classified before changing, per the
	// device-tier-vs-visual-breakpoint rule: this value selects a DEVICE TIER's
	// media source, so it belongs to the structured tier system and an
	// inconsistent value here is a bug, not a design choice. (The same class of
	// drift the wrapper's 599-vs-767 unification closed at D228.)
	const MOBILE_BREAKPOINT = 768;
	const TABLET_BREAKPOINT = 1024;

	/**
	 * Swap video src based on current viewport width.
	 *
	 * Tiers fall back upward when their own src is absent: mobile falls back
	 * to tablet, tablet falls back to desktop — so a block with no tablet
	 * override behaves identically to before this tier was added.
	 *
	 * @param {HTMLVideoElement} video The video element.
	 */
	function swapVideoSrc( video ) {
		const width = window.innerWidth;
		const desktopSrc = video.dataset.srcDesktop;
		const tabletSrc = video.dataset.srcTablet || desktopSrc;
		const mobileSrc = video.dataset.srcMobile || tabletSrc;

		if ( ! desktopSrc ) {
			return;
		}

		let target;
		if ( width < MOBILE_BREAKPOINT ) {
			target = mobileSrc;
		} else if ( width < TABLET_BREAKPOINT ) {
			target = tabletSrc;
		} else {
			target = desktopSrc;
		}

		const source = video.querySelector( 'source' );

		if ( source && source.src !== target ) {
			source.src = target;
			video.load();
		}
	}

	/**
	 * Disable parallax on touch / iOS devices where background-attachment:fixed
	 * causes repaint jitter or is completely unsupported.
	 */
	function disableParallaxOnTouch() {
		const isTouchDevice =
			navigator.maxTouchPoints > 0 ||
			window.matchMedia( '(pointer: coarse)' ).matches;

		if ( ! isTouchDevice ) {
			return;
		}

		document
			.querySelectorAll( '.sgs-container--parallax' )
			.forEach( ( el ) => el.classList.add( 'no-parallax' ) );
	}

	/**
	 * Initialise all container blocks on the page.
	 */
	function init() {
		disableParallaxOnTouch();

		const responsiveVideos = document.querySelectorAll(
			'.sgs-container__video-bg--responsive'
		);

		if ( ! responsiveVideos.length ) {
			return;
		}

		// Initial swap.
		responsiveVideos.forEach( swapVideoSrc );

		// Re-swap on resize (debounced).
		let resizeTimer;
		window.addEventListener( 'resize', function () {
			clearTimeout( resizeTimer );
			resizeTimer = setTimeout( function () {
				responsiveVideos.forEach( swapVideoSrc );
			}, 200 );
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
