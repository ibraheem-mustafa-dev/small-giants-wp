/**
 * The generic layer controls of the Effects panel (Spec 38A §5.3, §5.4, Appendix A; FR-38A-11): one renderer that
 * builds every effect's Trigger, Intensity and Fine-tune from the effect's own data, with no per-effect control code.
 * The Trigger offers the effect's registry triggers (`fx_effects.triggers`), the Intensity appears when the layer's
 * preset family has Subtle, Standard and Bold rows, and the Fine-tune fields come from the effect's `x-sgs-effects`
 * entry: its values `$def` on Desktop and its device `$def` on Tablet and Mobile (the editor's device toggle chooses).
 * Scalar fields go through `entrance/SchemaFields.js`; the three field types it has no atom for (an asset, a part and
 * the property row list) are drawn here from the same atoms, so every field of every effect is reachable.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import defs from '../../../components/motion/motion-defs';
import AssetAtom from '../../../components/motion/AssetAtom';
import ChoiceAtom from '../../../components/motion/ChoiceAtom';
import IntensityPicker from '../../../components/motion/IntensityPicker';
import PartReferenceAtom from '../../../components/motion/PartReferenceAtom';
import PropertyRowAtom from '../../../components/motion/PropertyRowAtom';
import TriggerPicker from '../../../components/motion/TriggerPicker';
import { rowProperties } from '../../../components/motion/field-types';
import { effectLabel } from './layers/refusals';
import { presetBySlug, stampedValue, valueAtPath } from './layers/stamp';
import SchemaFields, {
	AllDevicesNote,
	labelFor,
} from './entrance/SchemaFields';
import { layerEditor, problemText } from './entrance/layer-edit';
import { rowDefaults } from './entrance/entrance-facts';
import { EFFECTS_LIST, effectTriggers } from './effect-options';

const EFFECTS = defs[ 'x-sgs-effects' ];
const REF_PREFIX = '#/$defs/';
const deRef = ( ref ) => String( ref || '' ).replace( REF_PREFIX, '' );
const DEFAULT_ASSET_TYPES = Object.freeze( [ 'image' ] );

/**
 * The `$def` that holds an effect's fields on one device tier.
 *
 * @param {string} effect Effect slug.
 * @param {string} tier   `desktop`, `tablet` or `mobile`.
 * @return {string} The `$def` name, or '' when the effect stores nothing for the tier.
 */
export function effectFieldsDef( effect, tier ) {
	const entry = EFFECTS[ effect ];
	if ( tier === 'desktop' ) {
		return deRef( entry?.values );
	}
	return deRef(
		defs.$defs[ deRef( entry?.devices ) ]?.properties?.[ tier ]?.$ref
	);
}

/**
 * The editor of one effect layer.
 *
 * @param {Object}   layers              The `useMotionLayers` result.
 * @param {string}   target              The target.
 * @param {Object}   layer               The layer.
 * @param {Function} setProblem          Receives the text of a write that was not accepted, or null.
 * @param {string}   [list=EFFECTS_LIST] The list the layer sits in (`effects`, or `hover.effects` for a hover effect).
 * @return {Object} `entrance/layer-edit.js::layerEditor` over the list.
 */
export const effectEditor = (
	layers,
	target,
	layer,
	setProblem,
	list = EFFECTS_LIST
) =>
	layerEditor( {
		layers,
		target,
		list,
		layer,
		onProblem: setProblem,
	} );

// The property row list (scrub's and pin-scrub's `rows`): one row atom per row, Remove, and a choice that adds a row.
function RowList( { label, path, layer, editor, stamped } ) {
	const rows = valueAtPath( layer, path );
	const list = Array.isArray( rows ) ? rows : [];
	const preset = stamped ? stampedValue( layer, path ) : undefined;
	const write = ( next ) =>
		editor.edit( path, next.length ? next : undefined );
	const used = list.map( ( row ) => row?.property );
	const unused = rowProperties().filter(
		( property ) => ! used.includes( property )
	);
	return (
		<fieldset className="sgs-motion-fields__group">
			<legend>{ label }</legend>
			{ list.map( ( row, index ) => (
				<div
					key={ `${ row?.property || 'row' }-${ index }` }
					className="sgs-motion-effects__row"
				>
					<PropertyRowAtom
						label={ labelFor( row?.property || 'row' ) }
						value={ row }
						presetValue={
							Array.isArray( preset )
								? preset[ index ]
								: undefined
						}
						onChange={ ( next ) =>
							write(
								next === undefined
									? list.filter(
											( item, at ) => at !== index
									  )
									: list.map( ( item, at ) =>
											at === index ? next : item
									  )
							)
						}
					/>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ () =>
							write( list.filter( ( item, at ) => at !== index ) )
						}
						__next40pxDefaultSize
					>
						{ sprintf(
							/* translators: %s: the property, for example "Opacity". */
							__( 'Remove %s', 'sgs-blocks' ),
							labelFor( row?.property || 'row' )
						) }
					</Button>
				</div>
			) ) }
			{ unused.length > 0 && (
				<ChoiceAtom
					label={ __( 'Add a value to animate', 'sgs-blocks' ) }
					value={ undefined }
					emptyLabel={ __( 'Choose a property', 'sgs-blocks' ) }
					options={ unused.map( ( property ) => ( {
						value: property,
						label: labelFor( property ),
					} ) ) }
					onChange={ ( property ) =>
						property &&
						write( [
							...list,
							{ property, ...rowDefaults( property ) },
						] )
					}
				/>
			) }
		</fieldset>
	);
}

/**
 * The drawer for the field types `SchemaFields` has no atom for.
 *
 * @param {Object} context
 * @param {Object} context.layer     The layer.
 * @param {Object} context.editor    The layer editor.
 * @param {string} context.blockName The block's name.
 * @param {Object} context.elements  The block's `supports.sgs.elements`.
 * @return {Function} `SchemaFields`' `renderExtra`.
 */
export function extraFields( { layer, editor, blockName, elements } ) {
	return ( { key, type, node, path, label, stamped } ) => {
		const common = {
			label,
			fieldNode: node,
			value: valueAtPath( layer, path ),
			presetValue: stamped ? stampedValue( layer, path ) : undefined,
			onChange: ( next ) => editor.edit( path, next ),
		};
		if ( type === 'assetReference' ) {
			return (
				<AssetAtom
					key={ key }
					{ ...common }
					allowedTypes={
						node?.[ 'x-sgs-field' ]?.allowedTypes ||
						DEFAULT_ASSET_TYPES
					}
				/>
			);
		}
		if ( type === 'partReference' ) {
			return (
				<PartReferenceAtom
					key={ key }
					{ ...common }
					blockName={ blockName }
					elements={ elements }
				/>
			);
		}
		if ( type === 'propertyRow' ) {
			return (
				<RowList
					key={ key }
					label={ label }
					path={ path }
					layer={ layer }
					editor={ editor }
					stamped={ stamped }
				/>
			);
		}
		return null;
	};
}

/**
 * The simple-layer controls of one effect layer: its Trigger and, when its preset family has three intensities, its
 * Intensity (re-stamped through `useRestamp`, which confirms before replacing customised values).
 *
 * @param {Object}   props
 * @param {Object}   props.layer      The layer.
 * @param {string}   props.target     The target.
 * @param {Object}   props.layers     The `useMotionLayers` result.
 * @param {Object}   props.flow       The `useRestamp` flow.
 * @param {Function} props.setProblem Receives the text of a write that was not accepted, or null.
 * @return {Element} The controls.
 */
export function EffectLayerHead( { layer, target, layers, flow, setProblem } ) {
	const editor = effectEditor( layers, target, layer, setProblem );
	const family = layer.preset ? presetBySlug( layer.preset )?.family : null;
	const name = effectLabel( layer.effect );
	return (
		<>
			<TriggerPicker
				panel="effects"
				label={ sprintf(
					/* translators: %s: the effect, for example "Parallax". */
					__( '%s trigger', 'sgs-blocks' ),
					name
				) }
				effectTriggers={ effectTriggers( layer.effect ) }
				value={ layer.trigger }
				onChange={ ( trigger ) =>
					trigger && editor.replace( { ...layer, trigger } )
				}
			/>
			{ family && (
				<IntensityPicker
					label={ sprintf(
						/* translators: %s: the effect, for example "Parallax". */
						__( '%s intensity', 'sgs-blocks' ),
						name
					) }
					family={ family }
					value={ layer.intensity }
					values={ layer.values }
					customised={ layer.customised }
					onChange={ ( { intensity } ) =>
						setProblem(
							problemText(
								flow.requestIntensity(
									target,
									EFFECTS_LIST,
									layer.id,
									intensity
								)
							)
						)
					}
				/>
			) }
		</>
	);
}

/**
 * The Fine-tune fields of one effect layer on the edited device tier, built from the effect's schema entry.
 *
 * @param {Object}      props
 * @param {Object}      props.layer      The layer.
 * @param {string}      props.target     The target.
 * @param {Object}      props.layers     The `useMotionLayers` result.
 * @param {string}      props.tier       `desktop`, `tablet` or `mobile`.
 * @param {Function}    props.setProblem Receives the text of a write that was not accepted, or null.
 * @param {string}      props.blockName  The block's name.
 * @param {Object|null} props.elements   The block's `supports.sgs.elements`.
 * @param {string}      [props.list]     The list the layer sits in; the Effects panel's list when omitted.
 * @return {Element} The fields.
 */
export default function EffectLayerControls( {
	layer,
	target,
	layers,
	tier,
	setProblem,
	blockName,
	elements,
	list = EFFECTS_LIST,
} ) {
	const editor = effectEditor( layers, target, layer, setProblem, list );
	const desktop = tier === 'desktop';
	const defName = effectFieldsDef( layer.effect, tier );
	const name = effectLabel( layer.effect );
	const fields = defName ? (
		<SchemaFields
			defName={ defName }
			prefix={ desktop ? 'values' : `devices.${ tier }` }
			layer={ layer }
			onEdit={ editor.edit }
			stamped={ desktop }
			renderExtra={ extraFields( {
				layer,
				editor,
				blockName,
				elements,
			} ) }
			label={
				desktop
					? sprintf(
							/* translators: %s: the effect, for example "Parallax". */
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
	) : null;
	return (
		<div className="sgs-motion-effects__controls">
			{ fields || (
				<p className="sgs-motion-atom__help">
					{ __(
						'This effect has no values to fine-tune on this device.',
						'sgs-blocks'
					) }
				</p>
			) }
			{ ! desktop && <AllDevicesNote /> }
		</div>
	);
}
