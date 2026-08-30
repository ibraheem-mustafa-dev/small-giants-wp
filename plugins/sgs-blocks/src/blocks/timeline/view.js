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

	// ── Shared sparkler coordinator ───────────────────────────────────────
	//
	// ONE frame loop for the whole page, and at most ONE burning timeline.
	//
	// ⛔ Why a coordinator rather than a gate on each instance: the per-instance
	// version lit every timeline whose block was on screen, so a page with
	// several of them ran several sparklers at once (measured live: 2 of 8) and
	// N idle rAF loops besides. A sparkler is a focal point — two compete, and
	// the reader cannot tell which line is "the" one. Election is per frame, so
	// the active timeline changes as the reader scrolls, with no handover code.
	const sparklers = new Set();
	let coordinatorFrame = 0;
	let lastEmit = 0;

	// One spark per interval, and a hard ceiling on live sparks. The ceiling is
	// the backstop that stops a slow machine — where a spark's animationend
	// arrives later than the next emission — from accumulating nodes for ever.
	const EMIT_EVERY_MS = 45;
	const MAX_LIVE_SPARKS = 26;

	function coordinatorTick( ts ) {
		coordinatorFrame = window.requestAnimationFrame( coordinatorTick );
		if ( ts - lastEmit < EMIT_EVERY_MS ) {
			return;
		}

		// Elect the single active timeline: its head must be on screen, and of
		// those it is the one nearest the viewport centre — i.e. the one the
		// reader is actually looking at.
		let best = null;
		let bestDistance = Infinity;
		sparklers.forEach( ( s ) => {
			if ( ! s.isOnScreen() || ! s.allowed() ) {
				return;
			}
			const distance = s.headDistanceFromCentre();
			if ( null === distance || distance >= bestDistance ) {
				return;
			}
			best = s;
			bestDistance = distance;
		} );
		if ( ! best ) {
			return;
		}

		lastEmit = ts;
		if (
			best.progressEl.querySelectorAll( '.sgs-timeline__spark' ).length >=
			MAX_LIVE_SPARKS
		) {
			return;
		}
		best.emit();
	}

	/**
	 * Add one timeline to the sparkler election, starting the shared loop on
	 * the first registration.
	 *
	 * @param {Object} sparkler The instance descriptor.
	 */
	function registerSparkler( sparkler ) {
		sparklers.add( sparkler );
		if ( ! coordinatorFrame ) {
			coordinatorFrame = window.requestAnimationFrame( coordinatorTick );
		}
	}

	/**
	 * Remove one timeline, stopping the shared loop once none remain — the loop
	 * must not outlive the last instance, or a bfcache restore leaves two.
	 *
	 * @param {Object} sparkler The instance descriptor.
	 */
	function unregisterSparkler( sparkler ) {
		sparklers.delete( sparkler );
		if ( ! sparklers.size && coordinatorFrame ) {
			window.cancelAnimationFrame( coordinatorFrame );
			coordinatorFrame = 0;
		}
	}

	/**
	 * Fill progress (0..1) for one timeline, computed from GEOMETRY.
	 *
	 * ⛔ THIS EXISTS BECAUSE READING THE CUSTOM PROPERTY BACK IS NOT RELIABLE.
	 * The obvious implementation is
	 * `getComputedStyle( root ).getPropertyValue( '--sgs-timeline-fill-progress' )`,
	 * and that is what the milestone observer used until 2026-08-29. Measured on
	 * the live canary, sampling every 50px of scroll, it returns a STAIRCASE:
	 *
	 *   elTop  900..700 -> 0        elTop  350..150 -> 0.635
	 *   elTop  650..400 -> 0.223    elTop  100..-100 -> 0.836
	 *
	 * — flat for 200-250px at a time, and it reports 1 while the block is still
	 * BELOW the viewport. The painted fill is smooth; the value handed back to JS
	 * is quantised. Anything keyed off that read therefore fires in clumps, which
	 * is exactly how the connector-triggered reveal failed: milestones appeared
	 * three at once instead of one at a time, and the owner reported the effect as
	 * simply not working.
	 *
	 * The geometry below is deliberately the SAME window the CSS uses
	 * (`animation-range: entry 0% exit 100%`): 0 when the element's top edge is at
	 * the viewport bottom, 1 when its bottom edge reaches the viewport top. So the
	 * dots and the reveal stay in step with the painted line by construction,
	 * on BOTH drivers, without either reading the other's output.
	 *
	 * @param {HTMLElement} root The .sgs-timeline root.
	 * @return {number} Progress clamped to 0..1.
	 */
	function computeViewProgress( root ) {
		const rect = root.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const total = rect.height + viewportHeight;
		const scrolled = viewportHeight - rect.top;
		const progress = total > 0 ? scrolled / total : 0;
		return Math.min( 1, Math.max( 0, progress ) );
	}

	/**
	 * Initialise scroll-reveal for a single timeline root element.
	 *
	 * @param {HTMLElement} root - The .sgs-timeline <ol> element.
	 */
	function initTimeline( root ) {
		const revealOnScroll = root.dataset.revealOnScroll === 'true';
		const revealByConnector = 'connector' === root.dataset.revealTrigger;

		// The connector path is reached WITHOUT `data-reveal-on-scroll` (see
		// render.php), so it is handled before the gate below rather than after.
		// `is-js` is what licenses the hidden state; the milestone observer does
		// the revealing.
		if ( revealByConnector ) {
			root.classList.add( 'is-js' );
			return;
		}

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

		// The viewport path keeps its ATTRIBUTE-keyed hidden state (style.scss:392)
		// and therefore its pre-existing behaviour, unchanged. `is-js` is added
		// anyway so the two paths carry the same marker.
		//
		// ⚠ PRE-EXISTING, RAISED NOT FIXED: because that rule keys on the
		// attribute rather than on `is-js`, a viewport-reveal timeline hides its
		// entries with JS disabled and nothing unhides them. Re-keying it would
		// trade a hidden-forever bug for a flash-then-hide one, which is a
		// decision for the owner rather than a tidy-up to slip into this change.
		root.classList.add( 'is-js' );

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
		const computeProgress = () => computeViewProgress( root );

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

		// Whether this timeline hands its entry reveal to the fill rather than to
		// the viewport. Read once: it is a server-rendered attribute and cannot
		// change for the life of the page.
		// Keyed on the TRIGGER alone. It used to also require
		// `data-reveal-on-scroll`, which a connector timeline deliberately does
		// not carry any more — that conjunction would have switched the whole
		// feature off silently.
		const revealOnReached = 'connector' === root.dataset.revealTrigger;
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
		 * Flash the halo ring on one milestone dot as the fill reaches it.
		 *
		 * ⛔ RING ONLY — no particles. This used to also throw a 7-spark burst
		 * from the dot, and the owner's verdict was that the burst COVERED the
		 * ring, which is the effect worth keeping. Sparks moved to the fill
		 * head (see emitHeadSpark), leaving every ring unobstructed.
		 *
		 * @param {{frac:number,el:HTMLElement}} node The milestone crossed.
		 */
		function flashRing( node ) {
			node.el.classList.add( 'is-lit' );
			// One-shot: the class is what drives the CSS ring, so it has to
			// come off or the animation can never replay on the way back.
			setTimeout( () => node.el.classList.remove( 'is-lit' ), 640 );
		}

		/**
		 * Emit ONE sparkler spark from the travelling fill head.
		 *
		 * The brief is a sparkler — the little firework stick — so the lit tip
		 * is the emitter and it throws fine, fast, short-lived sparks the whole
		 * time it burns down the line. That is why this is a continuous emitter
		 * rather than an event fired at each milestone.
		 *
		 * ⛔ ANCHORED TO THE LINE, and this is the exact OPPOSITE of the rule
		 * that governs the milestone ring — so read both before moving either.
		 * A burst belonging to a DOT must anchor to the dot, because in the
		 * left-aligned variant the dots sit ~100px off the line. A sparkler
		 * belonging to the HEAD must anchor to the line, because the head IS on
		 * the line. `.sgs-timeline__progress` is the right parent for it in
		 * every alignment: it is the positioning container the head's own
		 * `::after` uses, it moves with the connector, and it is deliberately
		 * UNMASKED (the mask lives on its two child layers precisely so the
		 * head is not clipped in half at the progress boundary) — so a spark
		 * thrown past the head is not cut off.
		 *
		 * @param {HTMLElement} progressEl The .sgs-timeline__progress element.
		 * @param {number}      frac       Head position, 0-1.
		 */
		function emitHeadSpark( progressEl ) {
			const spark = document.createElement( 'span' );
			spark.className = 'sgs-timeline__spark';
			// ⛔ POSITIONED BY THE SAME CSS EXPRESSION AS THE HEAD, never by a JS
			// number. The head is `::after` on this element at
			// `calc(var(--sgs-timeline-fill-progress) * 100%)`; handing the spark
			// a JS-computed percentage instead put the two in DIFFERENT places,
			// because the geometry maths and the animated property do not agree.
			// Measured live: the CSS said the head sat at fraction 0.931
			// (viewport y=644) while the sparks landed at y≈340 — 304px adrift,
			// and the owner spotted it immediately. The property inherits, so
			// letting CSS resolve the same calc makes them coincide BY
			// CONSTRUCTION, on either driver, whatever the animation-range.
			const along = 'calc(var(--sgs-timeline-fill-progress) * 100%)';
			if ( horizontal ) {
				spark.style.left = along;
				spark.style.top = '50%';
			} else {
				spark.style.left = '50%';
				spark.style.top = along;
			}
			// Full radial throw with a downward bias, so it reads as a spark
			// under gravity rather than a symmetrical firework. Short distance
			// and short life: a sparkler's sparks wink out close to the tip.
			const angle = Math.random() * Math.PI * 2;
			const dist = 12 + Math.random() * 26;
			spark.style.setProperty(
				'--sgs-spark-dx',
				`${ Math.cos( angle ) * dist }px`
			);
			spark.style.setProperty(
				'--sgs-spark-dy',
				`${ Math.sin( angle ) * dist + 10 }px`
			);
			spark.addEventListener( 'animationend', () => spark.remove(), {
				once: true,
			} );
			progressEl.appendChild( spark );
		}

		/**
		 * Read whatever the progress value currently is, whichever driver wrote
		 * it. NaN when the property is absent or unparseable.
		 *
		 * @return {number} Progress 0-1, or NaN.
		 */
		function readProgress() {
			return computeViewProgress( root );
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
				const reached = node.frac <= now;
				node.el.classList.toggle( 'is-reached', reached );
				// Connector-triggered reveal: the entry appears as its own dot
				// lights up, so the journey assembles in step with the line.
				//
				// ⛔ One-way ON, deliberately — unlike `is-reached`, which is
				// recomputed both ways. Un-revealing on the way back up would
				// make content the reader has already seen VANISH as they scroll
				// up to re-read it, which is the same content-loss failure the
				// `is-js` gate exists to prevent, just triggered by scrolling
				// rather than by a broken script.
				if ( revealOnReached && reached ) {
					const entry = node.el.closest( '.sgs-timeline__entry' );
					if ( entry ) {
						entry.classList.add( 'is-revealed' );
					}
				}
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
			if ( now <= from ) {
				return;
			}
			nodes.forEach( ( node ) => {
				if ( node.frac > from && node.frac <= now ) {
					flashRing( node );
				}
			} );
		}

		// ── The sparkler ──────────────────────────────────────────────────
		//
		// A real sparkler burns continuously, so emission is driven by a frame
		// loop rather than by the scroll event — the tip keeps throwing sparks
		// whether or not the reader is moving.
		//
		// ⛔ ONLY ONE TIMELINE ON A PAGE MAY BURN AT A TIME, and that is why this
		// instance only REGISTERS here instead of running its own loop. Each
		// instance used to drive its own rAF with an `onScreen` gate, so a page
		// with several timelines lit several sparklers at once — measured live:
		// 2 of 8 emitting simultaneously, which the owner reported. A sparkler is
		// a focal point; two of them compete, and N idle loops burn frames for
		// nothing. The shared coordinator below elects a single ACTIVE instance
		// each frame and emits for that one only.
		const progressEl = root.querySelector( '.sgs-timeline__progress' );
		let onScreen = false;

		const sparkler = {
			progressEl,
			horizontal,
			allowed: sparksAllowed,
			isOnScreen: () => onScreen,
			emit: () => emitHeadSpark( progressEl ),
			/**
			 * Where the HEAD is painted, in viewport coordinates.
			 *
			 * Read from the CSS property rather than from geometry, because the
			 * head itself is placed from that property — so this is the head's
			 * real position, not a parallel estimate of it. Its staircase
			 * quantisation is harmless for choosing WHICH timeline is active.
			 *
			 * @return {number|null} Distance past the viewport edge, or null when
			 *                       the burn has not started or has finished.
			 */
			headDistanceFromCentre() {
				const frac = parseFloat(
					getComputedStyle( root )
						.getPropertyValue( '--sgs-timeline-fill-progress' )
						.trim()
				);
				// Strictly between: an unstarted line has no lit tip and a finished
				// one has burnt out. Both are silent.
				if ( ! Number.isFinite( frac ) || frac <= 0 || frac >= 1 ) {
					return null;
				}
				const box = progressEl.getBoundingClientRect();
				const headY = horizontal
					? box.top + box.height / 2
					: box.top + frac * box.height;
				// The head must be ON SCREEN to be worth lighting.
				if ( headY < 0 || headY > window.innerHeight ) {
					return null;
				}
				return Math.abs( headY - window.innerHeight / 2 );
			},
		};
		if ( progressEl ) {
			registerSparkler( sparkler );
		}

		const visibility = new window.IntersectionObserver(
			( entries ) => {
				onScreen = entries.some( ( e ) => e.isIntersecting );
			},
			{ threshold: 0 }
		);
		if ( progressEl ) {
			visibility.observe( root );
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
			// Leave the shared coordinator, or it keeps emitting into a torn-down
			// instance and a bfcache restore registers a second copy.
			unregisterSparkler( sparkler );
			visibility.disconnect();
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
	 * Task 2 — `mobileLayout: carousel` keyboard reachability (SC 2.1.1).
	 *
	 * A native overflow scroller with no focusable children cannot be reached
	 * or operated by keyboard in Chromium before 127, and in Safari at all.
	 * `tabindex="0"` + `role="region"` + an accessible name fix that — but
	 * those are HTML attributes and CANNOT be media-queried, so they must be
	 * present ONLY while the element actually scrolls (≤767px), or a
	 * screen-reader user at desktop gets a pointless verbose region that does
	 * not scroll. Toggled on a `matchMedia` listener that also fires on
	 * `change`, so a rotated phone or a resized window updates it — mirrors
	 * the existing `matchMedia('(prefers-reduced-motion: reduce)')`/
	 * `motionQuery.addEventListener('change', …)` pattern already used
	 * elsewhere in this file and in shared/effects/smooth-scroll.js.
	 *
	 * @param {HTMLElement} root The `.sgs-timeline--mobile-carousel` root.
	 */
	function initCarouselA11y( root ) {
		if ( typeof window.matchMedia !== 'function' ) {
			return;
		}

		const mobileQuery = window.matchMedia( '(max-width: 767px)' );
		// Server-rendered, i18n'd via render.php — never hardcoded here, so a
		// translated site gets a translated name. Falls back to a sensible
		// default only if the data attribute is somehow absent.
		const label = root.dataset.carouselLabel || 'Timeline milestones';

		function applyState() {
			if ( mobileQuery.matches ) {
				root.setAttribute( 'tabindex', '0' );
				root.setAttribute( 'role', 'region' );
				root.setAttribute( 'aria-label', label );
			} else {
				root.removeAttribute( 'tabindex' );
				root.removeAttribute( 'role' );
				root.removeAttribute( 'aria-label' );
			}
		}

		applyState();
		mobileQuery.addEventListener( 'change', applyState );
	}

	/**
	 * Boot on DOMContentLoaded.
	 */
	function boot() {
		// BOTH reveal triggers, and the second selector is load-bearing: a
		// connector-reveal timeline deliberately does NOT carry
		// `data-reveal-on-scroll` (render.php explains why), so selecting on that
		// attribute alone would silently skip it and `is-js` would never be added.
		const timelines = document.querySelectorAll(
			'.sgs-timeline[data-reveal-on-scroll], .sgs-timeline[data-reveal-trigger="connector"]'
		);
		timelines.forEach( initTimeline );

		bootProgressDriver();

		// Independent of reveal config — a carousel timeline may have reveal
		// on or off, so this is its own selector rather than reusing `timelines`.
		document
			.querySelectorAll( '.sgs-timeline--mobile-carousel' )
			.forEach( initCarouselA11y );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
} )();
