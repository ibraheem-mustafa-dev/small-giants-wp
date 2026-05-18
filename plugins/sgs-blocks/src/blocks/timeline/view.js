/**
 * SGS Timeline — view.js (frontend scroll-reveal)
 *
 * Uses IntersectionObserver to add .is-revealed to each .sgs-timeline__entry
 * as it enters the viewport. Stagger delay is read from the
 * data-reveal-stagger attribute on the root <ol>.
 *
 * Respects prefers-reduced-motion: when the user has requested reduced
 * motion, all entries are immediately marked as revealed without any
 * stagger or transition delay.
 *
 * Each observer is disconnected per-entry after it fires (one-shot).
 */

( function () {
	'use strict';

	/**
	 * Whether the user has requested reduced motion.
	 *
	 * @type {boolean}
	 */
	const prefersReducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;

	/**
	 * Initialise scroll-reveal for a single timeline root element.
	 *
	 * @param {HTMLElement} root - The .sgs-timeline <ol> element.
	 */
	function initTimeline( root ) {
		const revealOnScroll = root.dataset.revealOnScroll === 'true';

		if ( ! revealOnScroll ) {
			// revealOnScroll=false: render.php bakes in is-revealed already.
			// Nothing for view.js to do.
			return;
		}

		const stagger = parseInt( root.dataset.revealStagger || '100', 10 );
		const entries = root.querySelectorAll( '.sgs-timeline__entry' );

		if ( ! entries.length ) {
			return;
		}

		// Reduced motion: reveal everything immediately, no stagger.
		if ( prefersReducedMotion ) {
			entries.forEach( ( entry ) => entry.classList.add( 'is-revealed' ) );
			return;
		}

		// Normal motion: observe each entry and reveal with stagger.
		entries.forEach( ( entry, index ) => {
			const observer = new IntersectionObserver(
				( observedEntries, obs ) => {
					observedEntries.forEach( ( observed ) => {
						if ( observed.isIntersecting ) {
							const delay = index * stagger;
							if ( delay > 0 ) {
								setTimeout( () => {
									observed.target.classList.add( 'is-revealed' );
								}, delay );
							} else {
								observed.target.classList.add( 'is-revealed' );
							}
							// One-shot: stop watching after reveal.
							obs.unobserve( observed.target );
						}
					} );
				},
				{
					// Trigger when 15% of the entry is visible.
					threshold: 0.15,
				}
			);

			observer.observe( entry );
		} );
	}

	/**
	 * Boot on DOMContentLoaded.
	 */
	function boot() {
		const timelines = document.querySelectorAll(
			'.sgs-timeline[data-reveal-on-scroll]'
		);
		timelines.forEach( initTimeline );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
} )();
