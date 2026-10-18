/**
 * The Fine-tune fields of the entrance layer (Spec 38A §5, §5.2): from and to values through the property-row atom
 * (opacity, move, scale, rotate including X and Y, blur, clip), extra keyframes, duration, delay and easing, the start
 * line (scroll only), close values and close delay (Panel opens and State), colour to-values (Panel opens and State) and per-device values. Desktop edits `values`;
 * the editor's device toggle chooses whether Tablet or Mobile overrides are edited instead (a blank override inherits
 * the tier above). Every field shows the Customised tag and Reset against the preset that stamped it.
 *
 * @package
 */

import { __, sprintf } from '@wordpress/i18n';
import { Button } from '@wordpress/components';
import ChoiceAtom from '../../../../components/motion/ChoiceAtom';
import defs from '../../../../components/motion/motion-defs';
import PropertyRowAtom from '../../../../components/motion/PropertyRowAtom';
import PerDeviceAtom from '../../../../components/motion/PerDeviceAtom';
import BooleanAtom from '../../../../components/motion/BooleanAtom';
import DurationAtom from '../../../../components/motion/DurationAtom';
import DistanceAtom from '../../../../components/motion/DistanceAtom';
import EasingAtom from '../../../../components/motion/EasingAtom';
import NumberAtom from '../../../../components/motion/NumberAtom';
import { sameValue } from '../../../../components/motion/atom-utils';
import { stampedValue, valueAtPath } from '../layers/stamp';
import SchemaFields, { AllDevicesNote, labelFor } from './SchemaFields';
import EntranceKeyframes from './EntranceKeyframes';
import {
	COLOUR_KEYS,
	MOVE_KEYS,
	MOVE_LABELS,
	moveDefaults,
	rowPropertyFor,
	tierPrefix,
	isDesktopOnly,
	usedMoveKeys,
} from './entrance-facts';

const VALUES = defs.$defs.EntranceValues.properties;
const TIER_NAMES = Object.freeze( {
	desktop: __( 'Desktop', 'sgs-blocks' ),
	tablet: __( 'Tablet', 'sgs-blocks' ),
	mobile: __( 'Mobile', 'sgs-blocks' ),
} );

const withoutUndefined = ( object ) =>
	Object.fromEntries(
		Object.entries( object ).filter(
			( [ , value ] ) => value !== undefined
		)
	);

// One from and to pair as the property row the atom edits.
function MoveRow( { layer, tier, moveKey, editor } ) {
	const prefix = tierPrefix( tier );
	const fromPath = `${ prefix }.from.${ moveKey }`;
	const toPath = `${ prefix }.to.${ moveKey }`;
	const property = rowPropertyFor( moveKey );
	const row = withoutUndefined( {
		property,
		from: valueAtPath( layer, fromPath ),
		to: valueAtPath( layer, toPath ),
	} );
	const stampedFrom = stampedValue( layer, fromPath );
	const stampedTo = stampedValue( layer, toPath );
	const presetValue =
		tier === 'desktop' &&
		( stampedFrom !== undefined || stampedTo !== undefined )
			? withoutUndefined( {
					property,
					from: stampedFrom,
					to: stampedTo,
			  } )
			: undefined;
	const hasValues = row.from !== undefined || row.to !== undefined;
	// Removing a value from Desktop also removes its Tablet and Mobile overrides, so no tier keeps a value for a
	// property the entrance no longer animates.
	const clear = () =>
		editor.editMany( [
			[ fromPath, undefined ],
			[ toPath, undefined ],
			...( tier === 'desktop'
				? [ 'tablet', 'mobile' ].flatMap( ( name ) => [
						[ `devices.${ name }.from.${ moveKey }`, undefined ],
						[ `devices.${ name }.to.${ moveKey }`, undefined ],
				  ] )
				: [] ),
		] );
	return (
		<div className="sgs-motion-entrance__move">
			<PropertyRowAtom
				label={ MOVE_LABELS[ moveKey ] }
				endLabel={ MOVE_LABELS[ moveKey ] }
				properties={ [ property ] }
				value={ row }
				presetValue={ presetValue }
				onChange={ ( next ) =>
					editor.editMany( [
						[ fromPath, next?.from ],
						[ toPath, next?.to ],
					] )
				}
			/>
			{ ( tier === 'desktop' || hasValues ) && (
				<Button
					variant="tertiary"
					isDestructive={ tier === 'desktop' }
					onClick={ clear }
					__next40pxDefaultSize
				>
					{ tier === 'desktop'
						? sprintf(
								/* translators: %s: the property, for example "Opacity". */
								__( 'Remove %s', 'sgs-blocks' ),
								MOVE_LABELS[ moveKey ]
						  )
						: sprintf(
								/* translators: %s: the property, for example "Opacity". */
								__(
									'Use the Desktop value for %s',
									'sgs-blocks'
								),
								MOVE_LABELS[ moveKey ]
						  ) }
				</Button>
			) }
		</div>
	);
}

function MoveRows( { layer, tier, editor } ) {
	const used = usedMoveKeys( layer );
	const unused = MOVE_KEYS.filter( ( key ) => ! used.includes( key ) );
	return (
		<div className="sgs-motion-entrance__moves">
			<h4 className="sgs-motion-fields__heading">
				{ tier === 'desktop'
					? __( 'From and to values', 'sgs-blocks' )
					: sprintf(
							/* translators: %s: Tablet or Mobile. */
							__(
								'%s values (leave blank to use the tier above)',
								'sgs-blocks'
							),
							TIER_NAMES[ tier ]
					  ) }
			</h4>
			{ used.map( ( key ) => (
				<MoveRow
					key={ key }
					layer={ layer }
					tier={ tier }
					moveKey={ key }
					editor={ editor }
				/>
			) ) }
			{ tier === 'desktop' && unused.length > 0 && (
				<ChoiceAtom
					label={ __( 'Add a value to animate', 'sgs-blocks' ) }
					value={ undefined }
					emptyLabel={ __( 'Choose a property', 'sgs-blocks' ) }
					options={ unused.map( ( key ) => ( {
						label: MOVE_LABELS[ key ],
						value: key,
					} ) ) }
					onChange={ ( key ) => {
						if ( key ) {
							const { from, to } = moveDefaults( key );
							editor.editMany( [
								[ `values.from.${ key }`, from ],
								[ `values.to.${ key }`, to ],
							] );
						}
					} }
				/>
			) }
			{ used.length === 0 && (
				<p className="sgs-motion-atom__help">
					{ __(
						'This entrance sets no from or to values yet.',
						'sgs-blocks'
					) }
				</p>
			) }
		</div>
	);
}

// The Desktop value and the Tablet and Mobile overrides of one flat field, written as the changed paths only.
function PerDeviceField( { fieldKey, label, layer, editor, children } ) {
	return (
		<PerDeviceAtom
			label={ label }
			fieldKey={ fieldKey }
			type={ VALUES[ fieldKey ].$ref.replace( '#/$defs/', '' ) }
			fieldNode={ VALUES[ fieldKey ] }
			values={ layer.values }
			devices={ layer.devices }
			onChange={ ( { values, devices } ) => {
				const pairs = [
					[ `values.${ fieldKey }`, values[ fieldKey ] ],
					[
						`devices.tablet.${ fieldKey }`,
						devices.tablet?.[ fieldKey ],
					],
					[
						`devices.mobile.${ fieldKey }`,
						devices.mobile?.[ fieldKey ],
					],
				].filter(
					( [ path, value ] ) =>
						! sameValue( valueAtPath( layer, path ), value )
				);
				if ( pairs.length ) {
					editor.editMany( pairs );
				}
			} }
		>
			{ ( { tier, value, onChange } ) =>
				children( {
					value,
					onChange,
					label,
					fieldNode: VALUES[ fieldKey ],
					presetValue:
						tier === 'desktop'
							? stampedValue( layer, `values.${ fieldKey }` )
							: undefined,
				} )
			}
		</PerDeviceAtom>
	);
}

// The colours an open or state entrance changes to (Desktop only: the schema stores a colour once).
function ColourFields( { layer, editor } ) {
	return (
		<div className="sgs-motion-entrance__colours">
			<h4 className="sgs-motion-fields__heading">
				{ __( 'Colours to change to', 'sgs-blocks' ) }
			</h4>
			<SchemaFields
				defName="EntranceTo"
				prefix="values.to"
				keys={ COLOUR_KEYS }
				layer={ layer }
				onEdit={ editor.edit }
				label={ __( 'Colour values', 'sgs-blocks' ) }
			/>
		</div>
	);
}

function CloseFields( { layer, tier, editor } ) {
	const desktop = tier === 'desktop';
	return (
		<div className="sgs-motion-entrance__close">
			<h4 className="sgs-motion-fields__heading">
				{ __( 'When it closes', 'sgs-blocks' ) }
			</h4>
			<SchemaFields
				defName={ desktop ? 'EntranceClose' : 'EntranceCloseDevice' }
				prefix={ desktop ? 'close' : `devices.${ tier }.close` }
				layer={ layer }
				onEdit={ editor.edit }
				stamped={ false }
				label={
					desktop
						? __( 'Close values', 'sgs-blocks' )
						: sprintf(
								/* translators: %s: Tablet or Mobile. */
								__( 'Close values for %s', 'sgs-blocks' ),
								TIER_NAMES[ tier ]
						  )
				}
			/>
		</div>
	);
}

/**
 * @param {Object} props
 * @param {Object} props.layer  The entrance layer.
 * @param {string} props.tier   The tier being edited (`desktop`, `tablet`, `mobile`).
 * @param {Object} props.editor `layer-edit.js::layerEditor` for this layer.
 * @return {Element} The Fine-tune fields.
 */
export default function EntranceFineTune( { layer, tier, editor } ) {
	const keys = usedMoveKeys( layer );
	const rotates3d = keys.includes( 'rotateX' ) || keys.includes( 'rotateY' );
	return (
		<div className="sgs-motion-entrance__fine-tune">
			<MoveRows layer={ layer } tier={ tier } editor={ editor } />
			<EntranceKeyframes
				layer={ layer }
				tier={ tier }
				editor={ editor }
			/>
			<h4 className="sgs-motion-fields__heading">
				{ __( 'Timing', 'sgs-blocks' ) }
			</h4>
			<PerDeviceField
				fieldKey="duration"
				label={ __( 'Duration', 'sgs-blocks' ) }
				layer={ layer }
				editor={ editor }
			>
				{ ( props ) => <DurationAtom { ...props } /> }
			</PerDeviceField>
			<PerDeviceField
				fieldKey="delay"
				label={ __( 'Delay', 'sgs-blocks' ) }
				layer={ layer }
				editor={ editor }
			>
				{ ( props ) => <DurationAtom { ...props } /> }
			</PerDeviceField>
			<EasingAtom
				label={ labelFor( 'easing' ) }
				fieldNode={ VALUES.easing }
				value={ valueAtPath( layer, 'values.easing' ) }
				presetValue={ stampedValue( layer, 'values.easing' ) }
				onChange={ ( next ) => editor.edit( 'values.easing', next ) }
			/>
			{ tier !== 'desktop' && isDesktopOnly( 'easing' ) && (
				<AllDevicesNote />
			) }
			{ layer.trigger === 'scroll' && (
				<PerDeviceField
					fieldKey="start"
					label={ __( 'Start line (%)', 'sgs-blocks' ) }
					layer={ layer }
					editor={ editor }
				>
					{ ( props ) => (
						<NumberAtom { ...props } type="percentage" />
					) }
				</PerDeviceField>
			) }
			{ rotates3d && (
				<PerDeviceField
					fieldKey="perspective"
					label={ __( 'Perspective', 'sgs-blocks' ) }
					layer={ layer }
					editor={ editor }
				>
					{ ( props ) => <DistanceAtom { ...props } /> }
				</PerDeviceField>
			) }
			{ layer.trigger === 'load' && (
				<>
					<BooleanAtom
						label={ __(
							'Let the first element fade in',
							'sgs-blocks'
						) }
						help={ __(
							'Warning: a fade on the first thing visitors see delays the page’s largest paint and can lower its speed score. Left off, that element moves without fading.',
							'sgs-blocks'
						) }
						fieldNode={ VALUES.allowLcpFade }
						value={ valueAtPath( layer, 'values.allowLcpFade' ) }
						presetValue={ stampedValue(
							layer,
							'values.allowLcpFade'
						) }
						onChange={ ( next ) =>
							editor.edit( 'values.allowLcpFade', next )
						}
					/>
					{ tier !== 'desktop' && isDesktopOnly( 'allowLcpFade' ) && (
						<AllDevicesNote />
					) }
				</>
			) }
			{ ( layer.trigger === 'open' || layer.trigger === 'state' ) &&
				tier === 'desktop' && (
					<ColourFields layer={ layer } editor={ editor } />
				) }
			{ ( layer.trigger === 'open' || layer.trigger === 'state' ) && (
				<CloseFields layer={ layer } tier={ tier } editor={ editor } />
			) }
		</div>
	);
}
