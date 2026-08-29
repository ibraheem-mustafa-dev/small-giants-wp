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
		function computeProgress() {
			const rect = root.getBoundingClientRect();
			const viewportHeight = window.innerHeight;
			const total = rect.height + viewportHeight;
			const scrolled = viewportHeight - rect.top;
			const progress = total > 0 ? scrolled / total : 0;
			return Math.min( 1, Math.max( 0, progress ) );
		}

		function writeProgress() {
			root.style.setProperty(
				'--sgs-timeline-fill-progress',
				String( computeProgress() )
			);
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
		};
	}

	/**
	 * Sparks — an INDEPENDENT layer, deliberately not part of the rAF driver.
	 *
	 * ⛔ This is where the first build was wrong, and the shape of the mistake
	 * is worth keeping: the spawner lived INSIDE initProgressDriver(), which
	 * returns early on any browser with native `animation-timeline` support.
	 * So sparks existed ONLY on the JS path — i.e. only on Firefox — the exact
	 * inverse of what was wanted, and invisible to everyone who looked. A
	 * decorative layer must never live inside the fallback driver: it has to
	 * observe the progress VALUE, whoever wrote it.
	 *
	 * On the native path nothing tells JS the value moved, so this polls the
	 * computed property — one read per animation frame, only while scrolling.
	 *
	 * @param {HTMLElement} root - The .sgs-timeline root.
	 * @return {Function|undefined} cleanup, or undefined if none attached.
	 */
	function initSparks( root ) {
		// Sparks are pure decoration with no informational content, so unlike
		// the glow and head they switch OFF entirely under reduced motion.
		if ( isReducedMotionNow() ) {
			return;
		}
		const host = root.querySelector( '.sgs-timeline__progress' );
		if ( ! host ) {
			return;
		}
		const horizontal = root.classList.contains( 'sgs-timeline--horizontal' );
		let last = null;
		let lastSparkAt = 0;

		function tick() {
			const raw = getComputedStyle( root )
				.getPropertyValue( '--sgs-timeline-fill-progress' )
				.trim();
			const now = parseFloat( raw );
			if ( ! Number.isFinite( now ) ) {
				return;
			}
			if ( last === null ) {
				last = now;
				return;
			}
			const delta = Math.abs( now - last );
			last = now;

			// The gate that keeps this scroll-linked rather than autonomous:
			// no movement, no sparks. Autonomous motion running past five
			// seconds would owe a WCAG SC 2.2.2 pause control; this owes none.
			if ( delta < 0.002 ) {
				return;
			}
			const t = performance.now();
			if ( t - lastSparkAt < 55 ) {
				return;
			}
			lastSparkAt = t;

			const spark = document.createElement( 'span' );
			spark.className = 'sgs-timeline__spark';
			const pct = `${ Math.min( 1, Math.max( 0, now ) ) * 100 }%`;
			if ( horizontal ) {
				spark.style.left = pct;
				spark.style.top = '50%';
			} else {
				spark.style.left = '50%';
				spark.style.top = pct;
			}
			spark.style.setProperty(
				'--sgs-spark-dx',
				`${ ( Math.random() - 0.5 ) * 26 }px`
			);
			spark.style.setProperty(
				'--sgs-spark-dy',
				`${ ( Math.random() - 0.5 ) * 26 }px`
			);
			spark.addEventListener( 'animationend', () => spark.remove(), {
				once: true,
			} );
			host.appendChild( spark );
		}

		const throttledTick = rafThrottle( tick );
		window.addEventListener( 'scroll', throttledTick, { passive: true } );

		return function cleanup() {
			window.removeEventListener( 'scroll', throttledTick );
			throttledTick.cancel();
			host.querySelectorAll( '.sgs-timeline__spark' ).forEach( ( el ) =>
				el.remove()
			);
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
			// Independent of the driver above — runs on the native CSS path too.
			const sparkCleanup = initSparks( root );
			if ( sparkCleanup ) {
				cleanups.push( sparkCleanup );
			}
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
