/**
 * Ambient float phase stamping (Spec 38A FR-38A-37): when an ambient-float layer is added, its `phase` is written once
 * as a whole number of milliseconds in [0, period), so two floating elements never bob in step and the saved value
 * (not the browser at run time) decides where in its cycle each one starts. A phase the layer already holds is never
 * replaced, so an edit, a re-stamp or a pasted layer keeps its stored phase.
 *
 * Registered on the on-add hook of `stamp.js` (`registerOnAddRule`).
 *
 * @package
 */

import { registerOnAddRule } from './stamp';

export const AMBIENT_FLOAT_RULE_ID = 'ambient-float-phase';

/** The period the runtime falls back to when the layer stores none (`src/shared/effects/loop-control.js`). */
export const DEFAULT_PERIOD_MS = 4200;

const isPeriod = ( value ) =>
	typeof value === 'number' && Number.isFinite( value ) && value >= 1;

/**
 * The on-add rule: stamp a phase on an ambient-float layer that has none.
 *
 * @param {Object}   layer  The layer being added.
 * @param {Function} random Source of a number in [0, 1); injected by tests.
 * @return {Object} The layer, with `values.phase` written when it was unset.
 */
export function stampAmbientFloatPhase( layer, random = Math.random ) {
	if ( ! layer || layer.effect !== 'ambient-float' ) {
		return layer;
	}
	const values =
		layer.values && typeof layer.values === 'object' ? layer.values : {};
	if ( values.phase !== undefined ) {
		return layer;
	}
	const period = isPeriod( values.period )
		? Math.floor( values.period )
		: DEFAULT_PERIOD_MS;
	const phase = Math.min( period - 1, Math.floor( random() * period ) );
	return { ...layer, values: { ...values, phase } };
}

registerOnAddRule( AMBIENT_FLOAT_RULE_ID, ( layer ) =>
	stampAmbientFloatPhase( layer )
);
