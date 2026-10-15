/**
 * SGS shared motion — pointer-trail particles (Spec 38 §3.4, FR-38-32). Tier V.
 *
 * A canvas-painted trail that follows the pointer across one element. THREE
 * PRESETS, ONE ENGINE — the difference between `sparks` (a fading trail),
 * `gravity-dots` (drift down and settle) and `ripple` (expanding rings) is
 * entirely in the parameter table below (`PRESETS`); the pool, the
 * integrator and the rAF loop are shared code, never duplicated per preset.
 *
 * ── WHY TIER V ────────────────────────────────────────────────────────────
 * Cheap per-frame arithmetic on a fixed pool of 150 filled circles: Canvas 2D, no physics solver, no GPU pass (Tier W
 * is reserved for effects that need one).
 *
 * ── DRIVER-AGNOSTIC CORE, LIKE `magnet.js` AND `webgl/wave-gradient.js` ────
 * This module owns the canvas, the pool and the loop. It attaches NO pointer
 * listener of its own — `fx-particles.js` drives every instance on the page
 * from ONE shared document listener, for the same reason `fx-magnet.js`
 * does (see that file's docblock): N element-scoped listeners multiply
 * per-frame cost by instance count, one document listener does not.
 *
 * ── THE FLASH CEILING IS STRUCTURAL, NOT A RATE LIMIT (WCAG SC 2.3.1) ──────
 * A particle's alpha is written as `1 - (age / maxAge)` every frame. `age`
 * only ever increases and `maxAge` is fixed at spawn, so that expression is
 * a strictly non-increasing function of time BY CONSTRUCTION — there is no
 * code path that could make it rise, because nothing subtracts from `age` or
 * grows `maxAge` after spawn. This is deliberately not "cap the rate of
 * alpha increase"; there is no increase to cap.
 *
 * ── COVERAGE CEILING ARITHMETIC ─────────────────────────────────────────
 * Total painted particle coverage must not exceed ~10% of the emitter's own
 * box, so the maximum single-particle radius is DERIVED from the pool cap
 * and the box's current area, not hand-picked:
 *
 *   CAP filled disks, each of radius r, cover at most  CAP * pi * r^2  px².
 *   Bounding that to 10% of the box area A:            CAP * pi * r^2 <= 0.10 * A
 *   Solving for r:                                      r <= sqrt( 0.10 * A / ( pi * CAP ) )
 *
 * `resize()` recomputes this on every observed size change, so a small
 * button and a full-width hero each get a radius ceiling proportionate to
 * their own box — a fixed pixel radius would either be invisible on a hero
 * or blow past 10% on a small button. `ripple`'s rings are STROKED, not
 * filled, so their true painted area is far below a filled disk of the same
 * radius; the same ceiling is still applied to their radius as the
 * conservative bound, deliberately not relaxed for the stroke case.
 *
 * ── CAP: A RING BUFFER, NOT AN ARRAY THAT GROWS THEN TRIMS ────────────────
 * The pool is allocated ONCE at `MAX_PARTICLES` length. `spawnOne()` always
 * writes into `pool[cursor]` and advances `cursor` modulo the pool length —
 * once full, a new particle silently reclaims the OLDEST slot. There is no
 * `push()`/`splice()` on the pool array, ever, so its length never changes
 * for the life of the instance.
 *
 * ── STOP-ON-IDLE, NO TIMER ─────────────────────────────────────────────────
 * `ensureLoop()` schedules a frame only when the pool has a live particle AND
 * the emitter is on-screen AND the tab is visible. `tick()` does not
 * reschedule itself once every particle has died — the function simply
 * returns, and `rafHandle` goes back to null. Nothing polls to notice this;
 * the loop is provably not running because nothing holds a pending
 * `requestAnimationFrame` handle. It restarts the moment `push()` is called
 * again. The `IntersectionObserver` and `visibilitychange` listener are the
 * two OTHER reasons frames stop; both are created and disconnected inside
 * this same `createParticles`/`destroy` pair, never left as global state.
 *
 * ── PARAMETERS ────────────────────────────────────────────────────────────
 * Life, speed, gravity, drag and spawn rate reshape the presets; `particles-options.js` documents and resolves them,
 * and `particles-presets.js` holds the preset table, the bounds and the `MAX_PARTICLES` and `MAX_DPR` caps.
 *
 * @package
 */

import { MAX_DPR, MAX_PARTICLES, PRESETS } from './particles-presets';
import { deriveTuning, resolveParticleOptions } from './particles-options';
import {
	drawPool,
	emptySlot,
	stepPool,
	writeParticle,
} from './particles-engine';

export { resolveParticleOptions };

/**
 * The driver-agnostic engine. Attaches NO pointer listener.
 *
 * @param {HTMLElement} el               The emitter element. Must be
 *                                       `position: relative` (or similar) —
 *                                       `assets/css/fx-particles.css` sets
 *                                       this on every `[data-sgs-fx="particles"]`.
 * @param {Object}      [opts]           Options.
 * @param {string}      [opts.preset]    'sparks' (default) | 'gravity-dots' | 'ripple'.
 * @param {number}      [opts.density]   0.25-3, multiplies the preset's spawn count.
 * @param {number}      [opts.size]      0.25-3, multiplies the preset's radius.
 * @param {number}      [opts.life]      ms, above 0 replaces the preset life.
 * @param {number}      [opts.speed]     ratio, multiplies the preset speed.
 * @param {number}      [opts.gravity]   ratio, px/s² = ratio × 140.
 * @param {number}      [opts.drag]      0-1, replaces the preset drag.
 * @param {number}      [opts.spawnRate] per second, above 0 limits emission by time.
 * @return {{push: Function, configure: Function, stats: Function, destroy: Function}}
 *         The driver.
 */
export function createParticles( el, opts = {} ) {
	const preset = PRESETS[ opts.preset ] || PRESETS.sparks;
	// The effective numbers for this instance. `configure()` replaces them.
	let tuning = deriveTuning( preset, opts );

	const canvas = document.createElement( 'canvas' );
	canvas.className = 'sgs-particles__canvas';
	// Decoration with no informational content — nothing here needs to
	// reach a screen reader.
	canvas.setAttribute( 'aria-hidden', 'true' );
	el.appendChild( canvas );
	const ctx = canvas.getContext( '2d' );

	// Read the particle colour from the element's own resolved `color` once
	// per resize rather than per frame — `getComputedStyle` is not free, and
	// a pointer trail's colour does not change mid-gesture. Falls back to
	// the theme's inherited text colour with no bespoke attribute needed:
	// a client re-theming the site re-colours the trail with no JS change,
	// same reasoning `fx-wave-gradient.js` documents for reading computed
	// custom properties rather than trusting a stored value.
	let colour = '#000000';

	// Coverage-ceiling radius (see the module docblock's arithmetic),
	// recomputed on every observed size change.
	let maxRadius = 4;
	let boxWidth = 0;
	let boxHeight = 0;

	const pool = [];
	for ( let i = 0; i < MAX_PARTICLES; i++ ) {
		pool.push( emptySlot() );
	}
	let cursor = 0;
	let liveCount = 0;
	// Frames this emitter has actually drawn. Read-only, exported via stats()
	// so the self-terminating-loop claim can be MEASURED rather than asserted
	// (D807). Deliberately per-emitter: a global rAF counter catches every
	// other effect on the page and proves nothing about this one.
	let tickCount = 0;

	let visible = false;
	let lastRingAt = 0;
	let rafHandle = null;
	let lastTick = 0;
	// Spawn-rate accumulator (spawnRate above 0 only). It carries the fractional
	// particle between pointer events and is capped at one pool's worth, so an
	// idle gap cannot bank an unbounded burst.
	let spawnBudget = 0;
	let lastSpawnAt = null;

	/**
	 * Recompute canvas buffer size + the coverage-derived radius ceiling.
	 * JS sets the canvas's `width`/`height` ATTRIBUTES only (buffer pixel
	 * size) — never inline `style`, per Spec 32; layout size comes from
	 * `assets/css/fx-particles.css`'s `width:100%;height:100%`.
	 */
	function resize() {
		const rect = el.getBoundingClientRect();
		boxWidth = rect.width;
		boxHeight = rect.height;
		const dpr = Math.min( window.devicePixelRatio || 1, MAX_DPR );
		canvas.width = Math.max( 1, Math.round( rect.width * dpr ) );
		canvas.height = Math.max( 1, Math.round( rect.height * dpr ) );
		ctx.setTransform( dpr, 0, 0, dpr, 0, 0 );

		const area = Math.max( 1, rect.width * rect.height );
		// r <= sqrt( 0.10 * A / ( pi * CAP ) ) — see the docblock derivation.
		maxRadius = Math.sqrt( ( 0.1 * area ) / ( Math.PI * MAX_PARTICLES ) );

		// Read from the CANVAS, not the emitter (D846). The canvas declares
		// `color: var( --sgs-fx-particle-colour, inherit )` in fx-particles.css,
		// so this single read covers both cases and always returns a resolved
		// `rgb()`: the client's override when one is set, and the emitter's
		// inherited text colour (the pre-D846 behaviour) when one is not.
		// Reading the custom property directly would return the literal
		// `var(--wp--preset--color--x)` text, which canvas cannot paint with.
		colour = getComputedStyle( canvas ).color || colour;
	}

	/**
	 * Write one particle into the ring buffer's next slot, overwriting the
	 * oldest live particle once the pool is full.
	 *
	 * @param {number}  x    Local X (relative to the emitter's own box).
	 * @param {number}  y    Local Y.
	 * @param {boolean} ring Whether this is a `ripple` ring particle.
	 */
	function spawnOne( x, y, ring ) {
		const slot = pool[ cursor ];
		cursor = ( cursor + 1 ) % MAX_PARTICLES;
		if ( ! slot.alive ) {
			liveCount++;
		}
		writeParticle( slot, x, y, ring, preset, tuning, maxRadius );
	}

	/**
	 * How many particles the spawn-rate budget allows at this pointer event.
	 * Adds spawnRate × elapsed seconds since the previous event, keeps the
	 * fraction for the next event, and never exceeds one pool's worth.
	 *
	 * @param {number} now Current time in ms (performance.now()).
	 * @return {number} Whole particles to spawn at this event.
	 */
	function takeSpawnBudget( now ) {
		const elapsedSeconds =
			null === lastSpawnAt ? 0 : Math.max( 0, now - lastSpawnAt ) / 1000;
		lastSpawnAt = now;
		spawnBudget = Math.min(
			MAX_PARTICLES,
			spawnBudget + tuning.spawnRate * elapsedSeconds
		);
		const count = Math.floor( spawnBudget );
		spawnBudget -= count;
		return count;
	}

	/**
	 * Spawn this preset's particles at one pointer sample, in the emitter's
	 * OWN local coordinate space.
	 *
	 * @param {number} clientX Pointer clientX.
	 * @param {number} clientY Pointer clientY.
	 */
	function spawnAt( clientX, clientY ) {
		const rect = el.getBoundingClientRect();
		const localX = clientX - rect.left;
		const localY = clientY - rect.top;

		if ( 'ring' === preset.kind ) {
			const now = performance.now();
			// FLASH CEILING (ripple-specific): max 2 rings/second/emitter,
			// enforced by refusing a spawn rather than dropping a drawn
			// frame — the rate limit is on CREATION, not on paint.
			if ( now - lastRingAt < tuning.minIntervalMs ) {
				return;
			}
			lastRingAt = now;
			spawnOne( localX, localY, true );
			return;
		}

		if ( tuning.spawnRate > 0 ) {
			const budgetCount = takeSpawnBudget( performance.now() );
			for ( let i = 0; i < budgetCount; i++ ) {
				spawnOne( localX, localY, false );
			}
			return;
		}

		const count = Math.max(
			1,
			Math.round( preset.count * tuning.density )
		);
		for ( let i = 0; i < count; i++ ) {
			spawnOne( localX, localY, false );
		}
	}

	/**
	 * The shared per-frame callback. Stops itself — see the module docblock
	 * — the instant nothing is left alive.
	 *
	 * @param {number} now `requestAnimationFrame` timestamp.
	 */
	function tick( now ) {
		tickCount++;
		if ( ! lastTick ) {
			lastTick = now;
		}
		// Clamp dt so a long tab-hidden gap (which still delivers one more
		// rAF on return) does not integrate a giant physics step.
		const dt = Math.min( 0.05, ( now - lastTick ) / 1000 );
		lastTick = now;

		liveCount = stepPool( pool, preset, tuning, boxHeight, dt );
		drawPool( ctx, pool, preset, colour, boxWidth, boxHeight );
		const stillAlive = liveCount > 0;

		if ( stillAlive ) {
			rafHandle = requestAnimationFrame( tick );
		} else {
			// STOP. No re-schedule — `rafHandle` goes back to null and
			// nothing is pending until the next `push()`.
			rafHandle = null;
		}
	}

	/**
	 * Start the loop if it is not already running, and if it is actually
	 * allowed to run right now.
	 */
	function ensureLoop() {
		if ( null !== rafHandle || ! visible || document.hidden ) {
			return;
		}
		lastTick = 0;
		rafHandle = requestAnimationFrame( tick );
	}

	/**
	 * Cancel the loop, if running, without touching the pool. Used by the
	 * off-screen and hidden-tab gates — the particles already in flight are
	 * simply frozen, not cleared, so returning to view resumes mid-fade
	 * rather than popping fresh ones in.
	 */
	function stopLoop() {
		if ( null !== rafHandle ) {
			cancelAnimationFrame( rafHandle );
			rafHandle = null;
		}
	}

	const intersectionObserver = new IntersectionObserver(
		( entries ) => {
			visible = entries.some( ( entry ) => entry.isIntersecting );
			if ( visible ) {
				ensureLoop();
			} else {
				// Off-screen means no frames at all, not merely paused
				// physics — this IS the "no rAF while nothing is alive"
				// contract extended to "no rAF while nobody can see it".
				stopLoop();
			}
		},
		{ rootMargin: '50px' }
	);
	intersectionObserver.observe( el );

	const onVisibilityChange = () => {
		if ( document.hidden ) {
			stopLoop();
		} else {
			ensureLoop();
		}
	};
	document.addEventListener( 'visibilitychange', onVisibilityChange );

	const resizeObserver = new ResizeObserver( () => resize() );
	resizeObserver.observe( el );
	resize();

	return {
		/**
		 * Spawn this preset's particles at one pointer position and (re)start
		 * the loop. A no-op while off-screen or the tab is hidden — the
		 * particles would spawn and immediately freeze un-drawn, which is
		 * worse than not spawning them.
		 *
		 * @param {number} x Pointer clientX.
		 * @param {number} y Pointer clientY.
		 */
		push: ( x, y ) => {
			if ( ! visible || document.hidden ) {
				return;
			}
			spawnAt( x, y );
			ensureLoop();
		},

		/**
		 * Replace the parameters without re-creating the canvas, the pool or the
		 * observers. `fx-particles.js` calls this on window resize, when a
		 * per-device custom property may have changed. Particles already in
		 * flight keep their current state; new ones use the new values.
		 *
		 * @param {Object} [next] The resolved parameters, as for createParticles().
		 */
		configure: ( next = {} ) => {
			tuning = deriveTuning( preset, next );
		},

		/**
		 * PROBE API: read-only, permanent, no side effects. It lets the live page measure that the pool cap binds (`live`
		 * never exceeds MAX_PARTICLES) and that the loop stops (`ticks` stops rising once the pointer rests). Sample
		 * `live` DURING a pointer sweep, never after: every particle dies within its preset life.
		 *
		 * @return {{ live: number, ticks: number }} Live particles now, and
		 *         frames drawn since this emitter was created.
		 */
		stats: () => ( { live: liveCount, ticks: tickCount } ),

		/**
		 * Tear this instance down completely — loop, both observers, the
		 * canvas element. Safe to call at any point in the lifecycle.
		 */
		destroy: () => {
			stopLoop();
			intersectionObserver.disconnect();
			resizeObserver.disconnect();
			document.removeEventListener(
				'visibilitychange',
				onVisibilityChange
			);
			canvas.remove();
		},
	};
}
