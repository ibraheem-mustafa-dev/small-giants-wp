/**
 * The effects the Effects panel offers for one block and target (Spec 38A §5.3, FR-38A-9): the `effects` list's
 * schema slugs, kept when the effect's generated meta row lists the Effects panel (`panels`, never `in_picker`, which
 * marks only the old `fx.js` picker), the block qualifies for it (`generated-fx-qualifying-blocks.json`, derived from
 * `fx_effects.scope` and `requires`), and its target level (`target_level`) fits the target. Site-level rows
 * (`scroll-smoother`, `page-transitions`) list no panel and are never offered.
 *
 * @package
 */

import qualifyingBlocks from '../generated-fx-qualifying-blocks.json';
import effectMeta from '../generated-fx-effect-meta.json';
import defs from '../../../components/motion/motion-defs';
import { DEFS, effectsForList } from './layers/layer-lists';
import { levelsForTarget } from './layers/refusal-match';

export const EFFECTS_LIST = 'effects';
export const EFFECTS_PANEL = 'effects';
const EFFECT_LAYER_DEF = 'EffectLayer';
const ENTRANCE_PANEL = 'entrance';
const PANELS = defs[ 'x-sgs-panels' ];

/**
 * One effect's generated meta row.
 *
 * @param {string} effect Effect slug.
 * @return {Object|null} The row, or null when the registry has none.
 */
export function effectMetaOf( effect ) {
	return effectMeta[ effect ] || null;
}

/**
 * The triggers an effect layer may use in one list: the effect's registry triggers (`fx_effects.triggers`, in registry
 * order) that the list's layer `$def` accepts. In the Effects panel, an effect the Entrance and reveal panel also lists
 * leaves that panel's triggers to it (§5.2, §5.4: a load or scroll scramble or draw is an entrance; the Effects panel
 * holds the hover one).
 *
 * @param {string} effect                   Effect slug.
 * @param {string} [layerDef='EffectLayer'] The layer `$def` of the list.
 * @return {string[]} The trigger names; the first is the one a new layer takes when its preset sets none.
 */
export function effectTriggers( effect, layerDef = EFFECT_LAYER_DEF ) {
	const accepted = DEFS[ layerDef ]?.properties?.trigger?.enum || [];
	const panel = DEFS[ layerDef ]?.[ 'x-sgs-panel' ];
	const ceded =
		panel === EFFECTS_PANEL &&
		( effectMetaOf( effect )?.panels || [] ).includes( ENTRANCE_PANEL )
			? PANELS[ ENTRANCE_PANEL ]?.triggers || []
			: [];
	return ( effectMetaOf( effect )?.triggers || [] ).filter(
		( trigger ) =>
			accepted.includes( trigger ) && ! ceded.includes( trigger )
	);
}

/**
 * The effect slugs the Effects panel offers for a block and target, in schema order.
 *
 * @param {string}      blockName  The block's name.
 * @param {string}      target     `root`, a part key or a `custom:<n>` target.
 * @param {Object|null} [elements] The block's `supports.sgs.elements` (a part marked `"surface": true` takes
 *                                 surface-level effects).
 * @return {string[]} The slugs.
 */
export function effectOptions( blockName, target, elements = null ) {
	const qualifying = qualifyingBlocks[ blockName ] || [];
	const levels = levelsForTarget( target, elements );
	return effectsForList( EFFECTS_LIST ).filter( ( effect ) => {
		const row = effectMetaOf( effect );
		return (
			Boolean( row ) &&
			( row.panels || [] ).includes( EFFECTS_PANEL ) &&
			qualifying.includes( effect ) &&
			( row.target_level || [] ).some( ( level ) =>
				levels.includes( level )
			)
		);
	} );
}
