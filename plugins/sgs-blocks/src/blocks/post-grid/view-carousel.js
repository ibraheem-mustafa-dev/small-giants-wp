/* Post grid: carousel prev/next/dots controls, on the shared carousel runtime (src/shared/carousel). */

import { createCarousel } from '../../shared/carousel/index.js';

/**
 * Initialise carousel prev/next/dots controls.
 *
 * The inner grid scrolls horizontally with CSS scroll-snap; the shared runtime moves it, keeps the dots and arrows in step
 * with the scroll position however it got there (arrow, dot, key, drag, swipe), loops when `fx-carousel-loop.js` is on and
 * runs autoplay with the shared pause (WCAG 2.2.2).
 *
 * @param {Element} gridEl    The .sgs-post-grid root element.
 * @param {Object}  queryData Block query parameters.
 */
export function initCarousel( gridEl, queryData ) {
	createCarousel( {
		root: gridEl,
		track: gridEl.querySelector( '.sgs-post-grid__inner' ),
		itemSelector: '.sgs-post-grid__card',
		prev: gridEl.querySelector( '.sgs-post-grid__carousel-prev' ),
		next: gridEl.querySelector( '.sgs-post-grid__carousel-next' ),
		buildDots: {
			host: gridEl.querySelector( '.sgs-post-grid__carousel-dots' ),
			className: 'sgs-post-grid__dot',
			activeClass: 'sgs-post-grid__dot--active',
			label: ( number ) => 'Go to slide ' + number,
		},
		activeBy: 'nearest',
		dotScroll: 'view',
		disableAtEnds: true,
		keyboard: true,
		restartAutoplayOnInput: true,
		autoplay: queryData.carouselAutoplay
			? { speed: queryData.carouselSpeed || 5000, wrap: true }
			: null,
	} );
}
