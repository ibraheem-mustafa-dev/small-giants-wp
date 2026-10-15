/**
 * Preset lookup (Spec 38A §5, §5.4): a preset row by slug, the row a new effect layer is stamped from, and whether a
 * row may stamp a layer. `stamp.js` re-exports all three.
 *
 * @package
 */

import { intensityRowsFor } from '../../../../components/motion/IntensityPicker';
import presetFile from '../../../../components/motion/generated-motion-presets.json';
import { DEFS } from './layer-lists';
import { isObject } from './stamp-common';

/**
 * A preset row by its slug.
 *
 * @param {string} slug Preset slug.
 * @return {Object|null} The row, or null.
 */
export function presetBySlug( slug ) {
	return presetFile.presets.find( ( row ) => row.slug === slug ) || null;
}

/**
 * The preset a newly added effect layer is stamped from, always a row of the layer's own panel: the Standard row of the
 * family named for the effect, else the Standard intensity row of any family whose rows name the effect (an Effects-
 * panel hover scramble is `scramble-hover-standard`), else the one preset row named for the effect.
 *
 * @param {string} effect   Effect slug.
 * @param {string} layerDef The layer's `$def` name.
 * @return {Object|null} The row, or null when the panel has no preset for the effect.
 */
export function defaultPresetFor( effect, layerDef ) {
	const panel = DEFS[ layerDef ]?.[ 'x-sgs-panel' ];
	const standard = intensityRowsFor( effect )?.standard;
	if ( standard && standard.panel === panel ) {
		return standard;
	}
	const ownPanelStandard = presetFile.presets.find(
		( row ) =>
			row.kind === 'intensity' &&
			row.intensity === 'standard' &&
			row.effect === effect &&
			row.panel === panel &&
			intensityRowsFor( row.family )
	);
	if ( ownPanelStandard ) {
		return ownPanelStandard;
	}
	return (
		presetFile.presets.find(
			( row ) =>
				row.kind === 'preset' &&
				row.effect === effect &&
				row.panel === panel
		) || null
	);
}

/**
 * Whether a preset row may stamp a layer: the row's panel is the layer's panel and the row's effect is the layer's
 * effect (none for a hover state or an entrance).
 *
 * @param {Object}           row      The preset row.
 * @param {string}           layerDef The layer's `$def` name.
 * @param {string|undefined} effect   The layer's effect slug.
 * @return {boolean} True when the row fits.
 */
export function presetFits( row, layerDef, effect ) {
	return (
		isObject( row ) &&
		row.panel === DEFS[ layerDef ]?.[ 'x-sgs-panel' ] &&
		( row.effect ?? null ) === ( effect ?? null )
	);
}
