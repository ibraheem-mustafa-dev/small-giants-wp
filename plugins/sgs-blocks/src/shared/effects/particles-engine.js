/**
 * SGS shared motion: the particle pool's per-slot work (Spec 38 FR-38-32).
 *
 * Writing a spawned particle, advancing the pool one step and painting it. `particles.js` owns the canvas, the ring
 * buffer cursor and the loop. Exports functions only; nothing runs on import.
 *
 * @package
 */

import { MAX_PARTICLES, clamp } from './particles-presets';

/**
 * Build a fresh, empty particle slot. Every field is set on spawn; the
 * shape here just fixes the object's hidden class so the pool never
 * de-optimises from slot to slot.
 *
 * @return {Object} An inert pool slot.
 */
export function emptySlot() {
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
 * Write one particle into a pool slot.
 *
 * @param {Object}  slot      The pool slot to overwrite.
 * @param {number}  x         Local X (relative to the emitter's own box).
 * @param {number}  y         Local Y.
 * @param {boolean} ring      Whether this is a `ripple` ring particle.
 * @param {Object}  preset    The preset definition from PRESETS.
 * @param {Object}  tuning    The effective tuning from `deriveTuning`.
 * @param {number}  maxRadius The coverage-derived radius ceiling.
 */
export function writeParticle( slot, x, y, ring, preset, tuning, maxRadius ) {
	slot.alive = true;
	slot.x = x;
	slot.y = y;
	slot.age = 0;
	// +/-20% life jitter so a burst of particles does not fade in lock-step, which would read as a single flashing
	// blob rather than a trail.
	slot.maxAge = tuning.life * ( 0.8 + Math.random() * 0.4 );
	slot.alpha = 1;
	slot.isRing = !! ring;

	if ( ring ) {
		slot.vx = 0;
		slot.vy = 0;
		slot.radius = 0;
		// A ring is STROKED, not filled, so it is not bounded by the filled-disc coverage ceiling that `maxRadius`
		// encodes: its painted area is circumference x lineWidth, not pi*r^2. At the shipped numbers a 2px stroke at
		// 3x a ~21px radius, capped at 2 rings alive by `minIntervalMs`, measures ~0.075% of the emitter box against
		// SC 2.3.1's 25% threshold.
		slot.ringRadius = preset.ringRadiusFactor * maxRadius;
		slot.currentRingRadius = 0;
		return;
	}
	const angle = Math.random() * Math.PI * 2;
	const speed =
		preset.speed * tuning.speedScale * ( 0.5 + Math.random() * 0.5 );
	slot.vx = Math.cos( angle ) * speed;
	slot.vy = Math.sin( angle ) * speed;
	slot.radius = Math.min(
		maxRadius,
		maxRadius *
			preset.radiusFactor *
			tuning.sizeScale *
			( 0.6 + Math.random() * 0.6 )
	);
}

/**
 * Advance every live particle by `dt` seconds.
 *
 * @param {Object[]} pool      The particle pool.
 * @param {Object}   preset    The preset definition from PRESETS.
 * @param {Object}   tuning    The effective tuning from `deriveTuning`.
 * @param {number}   boxHeight The emitter's height in px.
 * @param {number}   dt        Seconds since the previous frame.
 * @return {number} How many particles are still alive.
 */
export function stepPool( pool, preset, tuning, boxHeight, dt ) {
	let alive = 0;
	for ( let i = 0; i < MAX_PARTICLES; i++ ) {
		const p = pool[ i ];
		if ( ! p.alive ) {
			continue;
		}
		p.age += dt;
		if ( p.age >= p.maxAge ) {
			p.alive = false;
			continue;
		}
		alive++;
		// `t` only ever grows within a particle's life (age rises, maxAge is fixed), so `alpha = 1 - t` cannot rise:
		// the flash ceiling holds by construction, not by a clamp.
		const t = p.age / p.maxAge;
		p.alpha = 1 - t;

		if ( p.isRing ) {
			p.currentRingRadius = p.ringRadius * t;
			continue;
		}

		p.vy += tuning.gravity * dt;
		p.vx *= tuning.drag;
		p.vy *= tuning.drag;
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
	return alive;
}

/**
 * Paint every live particle for the current frame.
 *
 * @param {CanvasRenderingContext2D} ctx       The canvas context.
 * @param {Object[]}                 pool      The particle pool.
 * @param {Object}                   preset    The preset definition from PRESETS.
 * @param {string}                   colour    The resolved particle colour.
 * @param {number}                   boxWidth  The emitter's width in px.
 * @param {number}                   boxHeight The emitter's height in px.
 */
export function drawPool( ctx, pool, preset, colour, boxWidth, boxHeight ) {
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
			ctx.arc(
				p.x,
				p.y,
				Math.max( 0, p.currentRingRadius ),
				0,
				Math.PI * 2
			);
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
