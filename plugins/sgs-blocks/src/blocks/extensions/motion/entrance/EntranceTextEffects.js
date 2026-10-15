/**
 * The text and SVG effects of the Entrance and reveal panel (Spec 38A §5.2): an ordered list of split reveal and
 * scramble on text parts and draw on SVG parts, from the layer operations' `effectsFor`. Each layer has its own
 * Trigger, Intensity and the effect's value fields, drawn from its schema entry. Adding a Scramble beside a Split reveal
 * (or the reverse) is refused with the schema's text, which the Add effect menu shows beside the disabled item.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import defs from '../../../../components/motion/motion-defs';
import TriggerPicker from '../../../../components/motion/TriggerPicker';
import IntensityPicker from '../../../../components/motion/IntensityPicker';
import LayerList from '../layers/LayerList';
import { effectLabel } from '../layers/refusals';
import { LAYER_LISTS } from '../layers/layer-lists';
import { presetBySlug } from '../layers/stamp';
import SchemaFields, { AllDevicesNote } from './SchemaFields';
import { layerEditor, problemText, withTrigger } from './layer-edit';
import { ENTRANCE_TRIGGER_LABELS, TEXT_LIST } from './entrance-facts';

const EFFECTS = defs[ 'x-sgs-effects' ];

const REF_PREFIX = '#/$defs/';
const deRef = ( ref ) => String( ref || '' ).replace( REF_PREFIX, '' );

// The `$def` that holds an effect's value fields (`split-reveal` is `SplitRevealValues`).
const valuesDefOf = ( effect ) => deRef( EFFECTS[ effect ]?.values );

// The `$def` of an effect's Tablet or Mobile overrides (`SplitRevealValuesDevice`).
const deviceDefOf = ( effect, tier ) =>
	deRef(
		defs.$defs[ deRef( EFFECTS[ effect ]?.devices ) ]?.properties?.[ tier ]
			?.$ref
	);

// Text effects play on page load or on scroll; a hover redraw is an Effects-panel layer (§5.2).
const TEXT_TRIGGER_EXCLUDE = Object.freeze( [ 'open', 'state' ] );

function TextEffectControls( {
	layer,
	target,
	layers,
	flow,
	tier,
	setProblem,
} ) {
	const editor = layerEditor( {
		layers,
		target,
		list: TEXT_LIST,
		layer,
		onProblem: setProblem,
	} );
	const family = layer.preset ? presetBySlug( layer.preset )?.family : null;
	const desktop = tier === 'desktop';
	const valuesDef = desktop
		? valuesDefOf( layer.effect )
		: deviceDefOf( layer.effect, tier );
	const name = effectLabel( layer.effect );
	return (
		<div className="sgs-motion-entrance__text-effect">
			<TriggerPicker
				panel="entrance-text"
				label={ __( 'Trigger', 'sgs-blocks' ) }
				labels={ ENTRANCE_TRIGGER_LABELS }
				value={ layer.trigger }
				exclude={ TEXT_TRIGGER_EXCLUDE }
				onChange={ ( trigger ) =>
					trigger && editor.replace( withTrigger( layer, trigger ) )
				}
			/>
			{ family && (
				<IntensityPicker
					family={ family }
					value={ layer.intensity }
					values={ layer.values }
					customised={ layer.customised }
					onChange={ ( { intensity } ) =>
						setProblem(
							problemText(
								flow.requestIntensity(
									target,
									TEXT_LIST,
									layer.id,
									intensity
								)
							)
						)
					}
				/>
			) }
			{ valuesDef && (
				<SchemaFields
					defName={ valuesDef }
					prefix={ desktop ? 'values' : `devices.${ tier }` }
					layer={ layer }
					onEdit={ editor.edit }
					stamped={ desktop }
					label={
						desktop
							? sprintf(
									/* translators: %s: the effect, for example "Split reveal". */
									__( '%s values', 'sgs-blocks' ),
									name
							  )
							: sprintf(
									/* translators: 1: the effect, 2: Tablet or Mobile. */
									__( '%1$s values for %2$s', 'sgs-blocks' ),
									name,
									tier === 'tablet'
										? __( 'Tablet', 'sgs-blocks' )
										: __( 'Mobile', 'sgs-blocks' )
							  )
					}
				/>
			) }
			{ ! desktop && <AllDevicesNote /> }
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.target     The chosen target.
 * @param {Object}   props.layers     The `useMotionLayers` result.
 * @param {Object}   props.flow       The `useRestamp` flow.
 * @param {string}   props.tier       The tier being edited (`desktop`, `tablet`, `mobile`).
 * @param {Function} props.setProblem Receives the text of a write that was not accepted, or null.
 * @return {Element} The list.
 */
export default function EntranceTextEffects( {
	target,
	layers,
	flow,
	tier,
	setProblem,
} ) {
	const items = layers.layersOf( target, TEXT_LIST );
	const maxItems = LAYER_LISTS[ TEXT_LIST ].maxItems;
	return (
		<LayerList
			label={ __( 'Text and SVG effects (in order)', 'sgs-blocks' ) }
			layers={ items }
			effects={ layers.effectsFor( target, TEXT_LIST ) }
			refusalFor={ ( effect ) =>
				layers.refusalFor( target, TEXT_LIST, effect )
			}
			onAdd={ ( effect ) => layers.add( target, TEXT_LIST, { effect } ) }
			onMove={ ( id, delta ) =>
				layers.move( target, TEXT_LIST, id, delta )
			}
			onRemove={ ( id ) => layers.remove( target, TEXT_LIST, id ) }
			full={ maxItems !== null && items.length >= maxItems }
			renderControls={ ( layer ) => (
				<TextEffectControls
					layer={ layer }
					target={ target }
					layers={ layers }
					flow={ flow }
					tier={ tier }
					setProblem={ setProblem }
				/>
			) }
		/>
	);
}
