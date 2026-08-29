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
	 * Milestone observer — an INDEPENDENT layer, deliberately not part of the
	 * rAF driver. Owns TWO things that both key off the same progress value:
	 * the persistent `is-reached` STATE on each dot, and the spark burst EVENT
	 * when the fill crosses one. Named for sparks alone until 2026-08-29, when
	 * the reached state joined it; the separation from the driver below is what
	 * makes both work on every browser.
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
		// Presence of the progress element is the feature gate — sparks belong
		// to the progress connector even though they now attach to the dots.
		if ( ! root.querySelector( '.sgs-timeline__progress' ) ) {
			return;
		}
		// ⛔ THE REDUCED-MOTION BAIL MOVED, and the move is the point.
		//
		// This observer now has TWO consumers, and only one of them is motion:
		//   * `is-reached` — a persistent STATE saying "the reader has passed
		//     this milestone". Informational, so it must survive reduced motion.
		//     Under `reduce` the CSS forces progress to 1 (style.scss:313), so
		//     every dot correctly reads as reached — the same "show the end
		//     state" convention the fill itself follows.
		//   * sparks — pure decoration, still OFF entirely under `reduce`.
		//
		// Bailing at the top of the function would have taken the state with
		// the decoration, which is `degrade-to-more-content-never-less` in
		// reverse: a reduced-motion reader would see a full line and no marked
		// milestones. Re-read per tick rather than cached, because the OS
		// setting can change while the page is open.
		const sparksAllowed = () => ! isReducedMotionNow();
		const horizontal = root.classList.contains( 'sgs-timeline--horizontal' );

		/**
		 * Where each milestone dot sits as a FRACTION along the connector.
		 *
		 * ⛔ This is the difference between a spark and a bubble. The first
		 * build dripped particles from the moving head at a fixed interval,
		 * which reads as drifting bubbles because nothing anchors them to
		 * anything. A spark is an EVENT: the fill reaches a milestone, and
		 * that milestone throws off light. Re-measured on resize because the
		 * fractions move with the layout.
		 *
		 * @return {Array<{frac:number,el:HTMLElement}>} Nodes by position.
		 */
		function measureNodes() {
			const rootBox = root.getBoundingClientRect();
			const span = horizontal ? rootBox.width : rootBox.height;
			if ( ! span ) {
				return [];
			}
			return [ ...root.querySelectorAll( '.sgs-timeline__node' ) ]
				.map( ( el ) => {
					const b = el.getBoundingClientRect();
					const centre = horizontal
						? b.left + b.width / 2 - rootBox.left
						: b.top + b.height / 2 - rootBox.top;
					return { frac: centre / span, el };
				} )
				.sort( ( a, b ) => a.frac - b.frac );
		}

		let nodes = measureNodes();
		let last = null;

		/**
		 * Throw a burst of sparks off one milestone dot.
		 *
		 * @param {{frac:number,el:HTMLElement}} node The milestone crossed.
		 */
		function burst( node ) {
			node.el.classList.add( 'is-lit' );
			// One-shot: the class is what drives the CSS ring, so it has to
			// come off or the animation can never replay on the way back.
			setTimeout( () => node.el.classList.remove( 'is-lit' ), 640 );

			const count = 7;
			for ( let i = 0; i < count; i++ ) {
				const spark = document.createElement( 'span' );
				spark.className = 'sgs-timeline__spark';
				// ⛔ APPENDED TO THE DOT, not to the connector.
				//
				// The first attempt placed each spark at a FRACTION along the
				// progress element, which is the 2px connector line. That is
				// only the same place as the dot in the centred layout: in the
				// left-aligned variant the nodes sit ~100px to the side of the
				// line, so the ring pulsed on the dot while the sparks fired
				// on the line, visibly disconnected. Anchoring to the node
				// itself is correct in EVERY alignment and orientation, and
				// needs no fraction maths at all.
				spark.style.left = '50%';
				spark.style.top = '50%';
				// RADIAL throw: an even fan with a little jitter, so it reads as
				// a burst off the dot rather than random drift.
				const angle =
					( i / count ) * Math.PI * 2 + ( Math.random() - 0.5 ) * 0.7;
				// Far enough to clearly leave the 16px dot behind.
				const dist = 34 + Math.random() * 26;
				spark.style.setProperty(
					'--sgs-spark-dx',
					`${ Math.cos( angle ) * dist }px`
				);
				spark.style.setProperty(
					'--sgs-spark-dy',
					`${ Math.sin( angle ) * dist }px`
				);
				spark.style.animationDelay = `${ i * 18 }ms`;
				spark.addEventListener( 'animationend', () => spark.remove(), {
					once: true,
				} );
				node.el.appendChild( spark );
			}
		}

		/**
		 * Read whatever the progress value currently is, whichever driver wrote
		 * it. NaN when the property is absent or unparseable.
		 *
		 * @return {number} Progress 0-1, or NaN.
		 */
		function readProgress() {
			return parseFloat(
				getComputedStyle( root )
					.getPropertyValue( '--sgs-timeline-fill-progress' )
					.trim()
			);
		}

		/**
		 * Mark every milestone the fill has passed.
		 *
		 * A STATE, not an event: it is recomputed from the current progress on
		 * every tick rather than latched when a node is crossed. That is what
		 * makes scrolling back up un-mark the milestones ahead of the reader,
		 * and it means a page loaded already scrolled part-way down paints the
		 * correct state on the first frame instead of only after a scroll.
		 *
		 * @param {number} now Current progress, 0-1.
		 */
		function applyReached( now ) {
			nodes.forEach( ( node ) => {
				node.el.classList.toggle( 'is-reached', node.frac <= now );
			} );
		}

		function tick() {
			const now = readProgress();
			if ( ! Number.isFinite( now ) ) {
				return;
			}
			// State first, and OUTSIDE every early return below. The two
			// `return`s that follow are both about the spark EVENT (no previous
			// sample to compare against; travelling backwards) and neither is a
			// reason to leave the reached state stale.
			applyReached( now );
			if ( last === null ) {
				last = now;
				return;
			}
			const from = last;
			last = now;
			// Only ever forward — scrolling back up re-arms the milestones
			// rather than firing them again on the way past.
			if ( now <= from || ! sparksAllowed() ) {
				return;
			}
			nodes.forEach( ( node ) => {
				if ( node.frac > from && node.frac <= now ) {
					burst( node );
				}
			} );
		}

		const throttledTick = rafThrottle( tick );
		const remeasure = rafThrottle( () => {
			nodes = measureNodes();
			// The fractions just moved, so the reached set may have changed even
			// though the progress value did not. Without this, a resize that
			// reflows the entries leaves dots marked against their old
			// positions until the next scroll.
			const now = readProgress();
			if ( Number.isFinite( now ) ) {
				applyReached( now );
			}
		} );
		window.addEventListener( 'scroll', throttledTick, { passive: true } );
		window.addEventListener( 'resize', remeasure, { passive: true } );

		// Paint the state once at attach. A reader arriving at a deep link, or
		// restoring a scroll position, must not need to scroll before the dots
		// tell the truth — and under reduced motion (progress pinned to 1) no
		// scroll event may ever fire at all, so this is the ONLY thing that
		// marks the milestones on that path.
		const initial = readProgress();
		if ( Number.isFinite( initial ) ) {
			applyReached( initial );
		}

		return function cleanup() {
			window.removeEventListener( 'scroll', throttledTick );
			window.removeEventListener( 'resize', remeasure );
			throttledTick.cancel();
			remeasure.cancel();
			root.querySelectorAll( '.sgs-timeline__spark' ).forEach( ( el ) =>
				el.remove()
			);
			root.querySelectorAll(
				'.sgs-timeline__node.is-lit, .sgs-timeline__node.is-reached'
			).forEach( ( el ) =>
				el.classList.remove( 'is-lit', 'is-reached' )
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
