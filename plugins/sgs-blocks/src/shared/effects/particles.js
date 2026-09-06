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
 * A particle pool this size is exactly the shape the 2026-08-02
 * motion-ecosystem survey already settled for `magnet.js`: cheap per-frame
 * arithmetic on a fixed pool, no physics solver, no GSAP plugin does this
 * more cheaply than a `Float32Array`-free plain loop. Canvas 2D, not WebGL —
 * 150 filled circles a frame is nowhere near what needs a GPU pass, and Tier
 * W (Spec 38 §1.2b) is reserved for effects that genuinely do.
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
 * @package
 */

/** Hard pool cap (§ CAP). Never exceeded, never resized. */
const MAX_PARTICLES = 150;

/** Device-pixel-ratio ceiling — same 1.5 precedent as `webgl/wave-gradient.js`. */
const MAX_DPR = 1.5;

/**
 * Per-preset parameters. The engine above this table is 100% shared; every
 * behavioural difference between the three shipped presets lives here.
 *
 * `kind: 'trail'` particles are filled disks that move and fade.
 * `kind: 'ring'` particles are stroked, expanding circles (ripple only).
 *
 * @type {Object<string, Object>}
 */
const PRESETS = {
	sparks: {
		kind: 'trail',
		// Particles spawned per push() call — a "trail" needs several per
		// pointer sample or it reads as a dotted line, not a spark shower.
		count: 3,
		life: 0.55,
		speed: 60,
		// No gravity: sparks fly outward and simply fade, they do not fall.
		gravity: 0,
		drag: 0.92,
		radiusFactor: 0.4,
	},
	'gravity-dots': {
		kind: 'trail',
		count: 2,
		life: 1.3,
		speed: 25,
		// px/s^2 downward acceleration — small, so a dot visibly drifts
		// rather than dropping instantly.
		gravity: 140,
		drag: 0.985,
		radiusFactor: 0.55,
		// Fraction of the emitter's own box height at which a falling dot
		// SETTLES (velocity zeroed) rather than exiting the box. 0.92 keeps
		// a visible resting layer above the very bottom edge.
		settleAtBoxFraction: 0.92,
	},
	ripple: {
		kind: 'ring',
		count: 1,
		life: 0.85,
		// Max 2 rings/second/emitter (owner-approved limit) — enforced by
		// gating spawns on elapsed time, not by dropping frames.
		minIntervalMs: 500,
		// Ring radius grows to (this factor * the coverage-derived max
		// radius) over its life — see the coverage-ceiling arithmetic above.
		ringRadiusFactor: 3,
		ringLineWidth: 2,
	},
};

/**
 * Clamp a value between a minimum and a maximum.
 *
 * @param {number} value The value to clamp.
 * @param {number} min   The minimum.
 * @param {number} max   The maximum.
 * @return {number} The clamped value.
 */
function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

/**
 * Build a fresh, empty particle slot. Every field is set on spawn; the
 * shape here just fixes the object's hidden class so the pool never
 * de-optimises from slot to slot.
 *
 * @return {Object} An inert pool slot.
 */
function emptySlot() {
	return {
		alive: false,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		age: 0,
		maxAge: 0,
		radius: 0,
		alpha: 0,
		isRing: false,
		ringRadius: 0,
		currentRingRadius: 0,
	};
}

/**
 * The driver-agnostic engine. Attaches NO pointer listener.
 *
 * @param {HTMLElement} el             The emitter element. Must be
 *                                     `position: relative` (or similar) —
 *                                     `assets/css/fx-particles.css` sets
 *                                     this on every `[data-sgs-fx="particles"]`.
 * @param {Object}      [opts]         Options.
 * @param {string}      [opts.preset]  'sparks' (default) | 'gravity-dots' | 'ripple'.
 * @param {number}      [opts.density] 0.25-3, multiplies the preset's spawn count.
 * @param {number}      [opts.size]    0.25-3, multiplies the preset's radius.
 * @return {{push: Function, destroy: Function}} The driver.
 */
export function createParticles( el, opts = {} ) {
	const preset = PRESETS[ opts.preset ] || PRESETS.sparks;
	const density = clamp( Number( opts.density ) || 1, 0.25, 3 );
	const sizeScale = clamp( Number( opts.size ) || 1, 0.25, 3 );

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
		slot.alive = true;
		slot.x = x;
		slot.y = y;
		slot.age = 0;
		// +/-20% life jitter so a burst of particles does not fade in
		// lock-step, which would read as a single flashing blob rather
		// than a trail.
		slot.maxAge = preset.life * ( 0.8 + Math.random() * 0.4 );
		slot.alpha = 1;
		slot.isRing = !! ring;

		if ( ring ) {
			slot.vx = 0;
			slot.vy = 0;
			slot.radius = 0;
			// A ring is STROKED, not filled, so it is not bounded by the
			// filled-disc coverage ceiling that `maxRadius` encodes — its
			// painted area is circumference x lineWidth, not pi*r^2. It may
			// therefore exceed `maxRadius` deliberately.
			//
			// This was previously written as
			// `Math.min( f * maxRadius, maxRadius * f )` — both arguments are
			// the SAME value, so the clamp was VACUOUS: it read as a guard and
			// guarded nothing. Assigning directly is honest about the intent.
			// The coverage ceiling is still respected in fact: at the shipped
			// numbers a 2px stroke at 3x a ~21px radius, capped at 2 rings
			// alive by `minIntervalMs`, measures ~0.075% of the emitter box
			// against SC 2.3.1's 25% threshold.
			slot.ringRadius = preset.ringRadiusFactor * maxRadius;
			slot.currentRingRadius = 0;
		} else {
			const angle = Math.random() * Math.PI * 2;
			const speed = preset.speed * ( 0.5 + Math.random() * 0.5 );
			slot.vx = Math.cos( angle ) * speed;
			slot.vy = Math.sin( angle ) * speed;
			slot.radius = Math.min(
				maxRadius,
				maxRadius * preset.radiusFactor * sizeScale * ( 0.6 + Math.random() * 0.6 )
			);
		}
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
			if ( now - lastRingAt < preset.minIntervalMs ) {
				return;
			}
			lastRingAt = now;
			spawnOne( localX, localY, true );
			return;
		}

		const count = Math.max( 1, Math.round( preset.count * density ) );
		for ( let i = 0; i < count; i++ ) {
			spawnOne( localX, localY, false );
		}
	}

	/**
	 * Advance every live particle by `dt` seconds.
	 *
	 * @param {number} dt Seconds since the previous frame.
	 * @return {boolean} True while at least one particle is still alive.
	 */
	function step( dt ) {
		for ( let i = 0; i < MAX_PARTICLES; i++ ) {
			const p = pool[ i ];
			if ( ! p.alive ) {
				continue;
			}
			p.age += dt;
			if ( p.age >= p.maxAge ) {
				p.alive = false;
				liveCount--;
				continue;
			}
			// `t` only ever grows within a particle's life (age rises,
			// maxAge is fixed), so `alpha = 1 - t` cannot rise — the flash
			// ceiling holds by construction, not by a clamp.
			const t = p.age / p.maxAge;
			p.alpha = 1 - t;

			if ( p.isRing ) {
				p.currentRingRadius = p.ringRadius * t;
				continue;
			}

			p.vy += preset.gravity * dt;
			p.vx *= preset.drag;
			p.vy *= preset.drag;
			p.x += p.vx * dt;
			p.y += p.vy * dt;

			if ( preset.settleAtBoxFraction && boxHeight > 0 ) {
				const floor = boxHeight * preset.settleAtBoxFraction;
				if ( p.y >= floor ) {
					p.y = floor;
					p.vy = 0;
					p.vx *= 0.9;
				}
			}
		}
		return liveCount > 0;
	}

	/**
	 * Paint every live particle for the current frame.
	 */
	function draw() {
		ctx.clearRect( 0, 0, boxWidth, boxHeight );
		for ( let i = 0; i < MAX_PARTICLES; i++ ) {
			const p = pool[ i ];
			if ( ! p.alive ) {
				continue;
			}
			ctx.globalAlpha = clamp( p.alpha, 0, 1 );
			if ( p.isRing ) {
				ctx.strokeStyle = colour;
				ctx.lineWidth = preset.ringLineWidth;
				ctx.beginPath();
				ctx.arc( p.x, p.y, Math.max( 0, p.currentRingRadius ), 0, Math.PI * 2 );
				ctx.stroke();
			} else {
				ctx.fillStyle = colour;
				ctx.beginPath();
				ctx.arc( p.x, p.y, p.radius, 0, Math.PI * 2 );
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
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

		const stillAlive = step( dt );
		draw();

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
		 * PROBE API — read-only, permanent, no side effects.
		 *
		 * Exists so the two claims FR-38-32 makes about itself can be measured
		 * on the live page instead of trusted: that the pool CAP BINDS (`live`
		 * never exceeds MAX_PARTICLES however fast the pointer sweeps) and that
		 * the LOOP STOPS (`ticks` stops rising once the pointer rests). Both sat
		 * "STILL UNMEASURED" in Spec 38 §3.3 because the first probe to attempt
		 * them was unreliable.
		 *
		 * Kept in the shipped bundle deliberately (approved by Bean): a probe
		 * that only exists in a debug build cannot verify the build that ships,
		 * and this is two integers behind a closure — no listener, no timer, no
		 * measurable cost.
		 *
		 * ⚠ Sample `live` DURING a pointer sweep, never after. Every particle
		 * dies within its preset life, so a single reading taken afterwards is
		 * 0 and reads as dead code.
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
			document.removeEventListener( 'visibilitychange', onVisibilityChange );
			canvas.remove();
		},
	};
}
