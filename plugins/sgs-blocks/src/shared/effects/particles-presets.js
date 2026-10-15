/**
 * SGS shared motion: the particle presets, schema bounds and engine caps (Spec 38 FR-38-32, Spec 38A M5.16c).
 *
 * The engine in `particles.js` is shared by every preset; every behavioural difference between `sparks`,
 * `gravity-dots` and `ripple` lives in `PRESETS`. Exports data and `clamp` only; nothing runs on import.
 *
 * @package
 */

/** Hard pool cap (§ CAP). Never exceeded, never resized. */
export const MAX_PARTICLES = 150;

/** Device-pixel-ratio ceiling — same 1.5 precedent as `webgl/wave-gradient.js`. */
export const MAX_DPR = 1.5;

/**
 * Gravity ratio base: a stored `gravity` ratio of 1 is this many px/s². It is
 * the gravity-dots preset's own gravity, so ratio 1 reproduces that preset.
 */
export const GRAVITY_RATIO_BASE = 140;

/**
 * Schema bounds (`schemas/motion.schema.json` `$defs/ParticlesValues`) for
 * every stored parameter. A value outside its bound is clamped to it, never
 * rejected.
 */
export const FIELD_RANGES = {
	density: [ 0.25, 3 ],
	size: [ 0.25, 3 ],
	life: [ 0, 20000 ],
	speed: [ 0.1, 5 ],
	gravity: [ -10, 10 ],
	drag: [ 0, 1 ],
	spawnRate: [ 0, 200 ],
};

/** The stored parameter names, in the order `resolveParticleOptions` reads them. */
export const PARTICLE_FIELDS = Object.keys( FIELD_RANGES );

/**
 * Per-preset parameters. The engine above this table is 100% shared; every
 * behavioural difference between the three shipped presets lives here.
 *
 * `kind: 'trail'` particles are filled disks that move and fade.
 * `kind: 'ring'` particles are stroked, expanding circles (ripple only).
 *
 * @type {Object<string, Object>}
 */
export const PRESETS = {
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
		gravity: GRAVITY_RATIO_BASE,
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
export function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}
