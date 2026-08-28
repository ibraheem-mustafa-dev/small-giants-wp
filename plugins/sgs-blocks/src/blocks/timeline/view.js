/**
 * SGS Timeline — view.js (frontend scroll-reveal + progress-line driver)
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
 *
 * Also drives the connector progress-line fill (--sgs-timeline-fill-progress)
 * on browsers with no native `animation-timeline: view()` support (today:
 * every Firefox — stable is 153, and it lands in 157), so this is a PRIMARY
 * rendering path, not a fallback — see initProgressDriver() below.
 */

import {
	prefersReducedMotion as isReducedMotionNow,
	rafThrottle,
} from '../../shared/effects/motion-utils.js';

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
	 * Vanilla rAF driver for the connector progress-line.
	 *
	 * This is the PRIMARY path for any browser without native
	 * `animation-timeline: view()` support (Firefox stable has none at
	 * all as of this writing — it lands in a later release). On a browser
	 * that DOES support the native timeline, style.scss's own CSS
	 * animation already owns --sgs-timeline-fill-progress and outranks a
	 * JS inline style write in the cascade, so this driver returns
	 * immediately and never attaches a single listener.
	 *
	 * @param {HTMLElement} root - The .sgs-timeline--connector-progress <ol>.
	 * @return {Function|void} A cleanup function, or nothing if the driver
	 *                         never attached (native support / reduced motion).
	 */
	function initProgressDriver( root ) {
		// 1. Feature-detect FIRST, before attaching anything. A CSS
		// animation outranks a JS inline style write, so on a browser with
		// native support this driver would burn frames producing nothing
		// visible — and this early return is what makes the negative
		// branch testable (a test can stub CSS.supports).
		// The feature tested here MUST be the one style.scss gates its
		// native driver on (`view()`), not merely a related one. Testing
		// `scroll()` instead would leave a hole on any engine that shipped
		// one without the other: the CSS driver would not apply and this
		// one would have already exited, so nothing would fill the line.
		if ( window.CSS?.supports?.( 'animation-timeline', 'view()' ) ) {
			return;
		}

		// 2. Reduced motion: use the LIVE check (re-evaluates every call),
		// not the module-load-cached const above. The stylesheet already
		// forces the line fully filled under prefers-reduced-motion, so
		// doing nothing here is correct — do not write 1 ourselves.
		if ( isReducedMotionNow() ) {
			return;
		}

		/**
		 * Compute fill progress (0..1) from the root's position in the
		 * viewport.
		 *
		 * Range chosen for a comfortable "fills while the timeline is on
		 * screen" feel rather than an edge-to-edge scrollIntoView range:
		 * progress reaches 0 once the root's top edge crosses the bottom
		 * of the viewport, and reaches 1 once the root's bottom edge
		 * crosses the top of the viewport — i.e. the fill tracks exactly
		 * how much of the timeline has scrolled past the top of the
		 * screen while it's in view.
		 *
		 * @return {number} Progress clamped to 0..1.
		 */
		const horizontal = root.classList.contains(
			'sgs-timeline--horizontal'
		);
		let lastProgress = 0;

		function computeProgress() {
			const rect = root.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const total = rect.height + viewportHeight;
			const scrolled = viewportHeight - rect.top;
			const progress = total > 0 ? scrolled / total : 0;
			return Math.min( 1, Math.max( 0, progress ) );
		}

		// ── Sparks (FR-38-35) ──────────────────────────────────────────
		//
		// Spawned ONLY while progress is actually CHANGING. That gate is not a
		// performance nicety, it is what keeps the effect scroll-linked: motion
		// that continues while the user sits still is AUTONOMOUS, and autonomous
		// motion running past five seconds owes a WCAG SC 2.2.2 pause control.
		// No scroll, no sparks, no pause control owed.
		//
		// Deliberately not a particle library — tsparticles is 20-100KB against
		// a 50KB page budget, and canvas-confetti is built for one-shot bursts,
		// not a continuous trail. Each spark is a 3px element animated on
		// transform + opacity (compositor-only) that removes itself.
		const progressEl = root.querySelector( '.sgs-timeline__progress' );
		let lastSparkAt = 0;

		function maybeSpark( delta ) {
			if ( ! progressEl || delta < 0.004 ) {
				return;
			}
			// Rate-limit independently of scroll frequency so a fast flick does
			// not dump dozens of nodes in one frame.
			const now = performance.now();
			if ( now - lastSparkAt < 60 ) {
				return;
			}
			lastSparkAt = now;

			const spark = document.createElement( 'span' );
			spark.className = 'sgs-timeline__spark';
			// The head sits at the progress position on the travel axis; place
			// the spark there and let CSS scatter it outward.
			const pct = `${ lastProgress * 100 }%`;
			if ( horizontal ) {
				spark.style.left = pct;
				spark.style.top = '50%';
			} else {
				spark.style.left = '50%';
				spark.style.top = pct;
			}
			spark.style.setProperty(
				'--sgs-spark-dx',
				`${ ( Math.random() - 0.5 ) * 22 }px`
			);
			spark.style.setProperty(
				'--sgs-spark-dy',
				`${ ( Math.random() - 0.5 ) * 22 }px`
			);
			spark.addEventListener( 'animationend', () => spark.remove(), {
				once: true,
			} );
			progressEl.appendChild( spark );
		}

		function writeProgress() {
			const next = computeProgress();
			const delta = Math.abs( next - lastProgress );
			lastProgress = next;
			root.style.setProperty( '--sgs-timeline-fill-progress', String( next ) );
			maybeSpark( delta );
		}

		// 3. Share the ONE page-wide rAF loop rather than running our own.
		const throttledWrite = rafThrottle( writeProgress );

		writeProgress();
		window.addEventListener( 'scroll', throttledWrite, { passive: true } );
		// 7. Recompute on resize — the element's height changes with
		// content/breakpoint, which shifts the progress curve.
		window.addEventListener( 'resize', throttledWrite, { passive: true } );

		return function cleanup() {
			window.removeEventListener( 'scroll', throttledWrite );
			window.removeEventListener( 'resize', throttledWrite );
			throttledWrite.cancel();
			// Sparks self-remove on `animationend`, but a teardown mid-flight
			// would otherwise strand however many are alive at that instant.
			if ( progressEl ) {
				progressEl
					.querySelectorAll( '.sgs-timeline__spark' )
					.forEach( ( el ) => el.remove() );
			}
		};
	}

	/**
	 * init/cleanup wrapper for the progress driver across every
	 * .sgs-timeline--connector-progress root on the page, with bfcache
	 * teardown-and-reinit on pageshow.
	 */
	function bootProgressDriver() {
		let cleanups = [];

		function init() {
			const roots = document.querySelectorAll(
				'.sgs-timeline--connector-progress'
			);
			roots.forEach( ( root ) => {
				const cleanup = initProgressDriver( root );
				if ( cleanup ) {
					cleanups.push( cleanup );
				}
			} );
		}

		function teardown() {
			cleanups.forEach( ( cleanup ) => cleanup() );
			cleanups = [];
		}

		init();

		// 5. bfcache: a page restored from the back/forward cache keeps
		// its old listeners attached to a DOM that may since have
		// changed size/position — tear down and re-init cleanly.
		window.addEventListener( 'pageshow', ( event ) => {
			if ( event.persisted ) {
				teardown();
				init();
			}
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

		bootProgressDriver();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
} )();
