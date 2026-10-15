/**
 * SGS shared motion: the particle parameters (Spec 38A M5.16c).
 *
 * `resolveParticleOptions()` parses raw stored values (a bare number or a numeric string; `life` also takes an `ms` or
 * `s` suffix) and returns the first valid candidate per field. The caller states the precedence; this module only
 * parses, so it never reads the DOM. `deriveTuning()` turns a preset and the resolved parameters into the numbers the
 * engine uses, clamped to the schema bounds in `FIELD_RANGES`. Exports functions only; nothing runs on import.
 *
 * Five stored parameters reshape the presets. Each is `undefined` when unset,
 * and an unset parameter leaves the preset's own value in force:
 *
 *   life       ms. Above 0 it replaces the preset life (seconds = ms / 1000).
 *   speed      ratio. Multiplies the preset's launch speed.
 *   gravity    ratio. Acceleration in px/s² = ratio × 140 (the gravity-dots
 *              base). Negative pulls upward. A set 0 is a real zero, not unset.
 *   drag       0–1. Replaces the preset's per-step velocity multiplier.
 *   spawnRate  per second. Above 0 it limits emission by time: an accumulator
 *              adds spawnRate × elapsed seconds on each pointer event, carries
 *              the fraction to the next event, and is capped at one pool's
 *              worth. It replaces the preset's per-event count, so `density`
 *              does not apply on this path. Ripple's minIntervalMs becomes
 *              1000 / spawnRate.
 *
 * Ripple has no motion, so gravity, drag and speed do not affect it. Life and
 * spawnRate (through minIntervalMs) do. Every value is clamped to the schema
 * bounds in FIELD_RANGES. `MAX_PARTICLES` and `MAX_DPR` cap the engine whatever
 * the parameters say.
 *
 * @package
 */

import {
	FIELD_RANGES,
	GRAVITY_RATIO_BASE,
	PARTICLE_FIELDS,
	clamp,
} from './particles-presets';

/**
 * Parse one raw stored value. Accepts a bare number or a numeric string.
 * Only `life` takes a time unit (`ms` or `s`), so `speed: 1s` is rejected
 * rather than silently read as seconds. Anything unparsable is `undefined`,
 * which the caller reads as "unset".
 *
 * @param {string} field The parameter name.
 * @param {*}      raw   The raw value (number, string, null or undefined).
 * @return {number|undefined} The parsed number, or undefined when invalid.
 */
function parseParticleValue( field, raw ) {
	if ( 'number' === typeof raw ) {
		return Number.isFinite( raw ) ? raw : undefined;
	}
	if ( 'string' !== typeof raw ) {
		return undefined;
	}
	const pattern =
		'life' === field
			? /^([+-]?(?:\d+\.?\d*|\.\d+))(ms|s)?$/
			: /^([+-]?(?:\d+\.?\d*|\.\d+))$/;
	const match = pattern.exec( raw.trim() );
	if ( ! match ) {
		return undefined;
	}
	const value = Number( match[ 1 ] );
	return 's' === match[ 2 ] ? value * 1000 : value;
}

/**
 * Resolve every stored parameter from its candidate raw values. Candidates
 * are listed in precedence order (the caller decides it: custom property,
 * then legacy attribute); the first one that parses wins. A field with no
 * valid candidate stays `undefined`, which the engine reads as "use the
 * preset". Pure: it never touches the DOM.
 *
 * @param {Object<string, Array<*>>} [candidates] Per-field candidate values.
 * @return {Object<string, number|undefined>} The resolved parameters.
 */
export function resolveParticleOptions( candidates = {} ) {
	const resolved = {};
	PARTICLE_FIELDS.forEach( ( field ) => {
		const list = Array.isArray( candidates[ field ] )
			? candidates[ field ]
			: [];
		resolved[ field ] = undefined;
		for ( const raw of list ) {
			const value = parseParticleValue( field, raw );
			if ( undefined !== value ) {
				resolved[ field ] = value;
				break;
			}
		}
	} );
	return resolved;
}

/**
 * Turn a preset and the resolved parameters into the numbers the engine uses.
 * Every rule is the one the module header states; an unset parameter yields
 * the preset's own value (or 1 for the multiplicative fields).
 *
 * @param {Object} base   The preset definition from PRESETS.
 * @param {Object} [opts] The resolved parameters (undefined = unset).
 * @return {Object} The effective tuning for one instance.
 */
export function deriveTuning( base, opts = {} ) {
	const bounded = ( field ) => {
		const value = opts[ field ];
		if ( 'number' !== typeof value || ! Number.isFinite( value ) ) {
			return undefined;
		}
		const [ min, max ] = FIELD_RANGES[ field ];
		return clamp( value, min, max );
	};
	const density = bounded( 'density' );
	const sizeScale = bounded( 'size' );
	const lifeMs = bounded( 'life' );
	const speed = bounded( 'speed' );
	const gravity = bounded( 'gravity' );
	const drag = bounded( 'drag' );
	const spawnRate = bounded( 'spawnRate' );
	const rateSet = undefined !== spawnRate && spawnRate > 0;

	return {
		density: undefined === density ? 1 : density,
		sizeScale: undefined === sizeScale ? 1 : sizeScale,
		life: undefined !== lifeMs && lifeMs > 0 ? lifeMs / 1000 : base.life,
		speedScale: undefined === speed ? 1 : speed,
		gravity:
			undefined === gravity ? base.gravity : gravity * GRAVITY_RATIO_BASE,
		drag: undefined === drag ? base.drag : drag,
		spawnRate: rateSet ? spawnRate : 0,
		minIntervalMs: rateSet ? 1000 / spawnRate : base.minIntervalMs,
	};
}
