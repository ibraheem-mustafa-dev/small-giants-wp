/**
 * SGS Hero — frontend interactivity.
 *
 * Handles:
 * - Responsive video background: swaps src to mobile version on narrow viewports.
 * - Parallax: adds no-parallax class on touch devices to prevent iOS fixed-bg jitter.
 *
 * Loaded only when the hero block is on the page.
 *
 * @package SGS\Blocks
 */

( function () {
	'use strict';

	const MOBILE_BREAKPOINT = 768;

	/**
	 * Swap video src based on current viewport width.
	 *
	 * @param {HTMLVideoElement} video The video element.
	 */
	function swapVideoSrc( video ) {
		const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
		const mobileSrc  = video.dataset.srcMobile;
		const desktopSrc = video.dataset.srcDesktop;

		if ( ! mobileSrc || ! desktopSrc ) {
			return;
		}

		const target = isMobile ? mobileSrc : desktopSrc;
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
			.querySelectorAll( '.sgs-hero--parallax' )
			.forEach( ( hero ) => hero.classList.add( 'no-parallax' ) );
	}

	/**
	 * Initialise all hero blocks on the page.
	 */
	function init() {
		disableParallaxOnTouch();

		const responsiveVideos = document.querySelectorAll(
			'.sgs-hero__video-bg--responsive'
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
