/**
 * AngleAtom: an angle (the `angle` field type): a number in degrees, or a `deg` or `turn` value. A unit box (deg and
 * turn) with a slider beside it, the way core pairs a number with a range; the range comes from the schema, narrowed by
 * the field's own node. An angle is not a length, so it does not use SgsLengthControl.
 *
 * @package
 */

import { Flex, FlexBlock, FlexItem, RangeControl } from '@wordpress/components';
import { UnitControl } from '../primitives';
import { boundsOf, textDraft, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

const DEGREES = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?$/;
const ANGLE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(deg|turn)?$/;

// The slider's range per unit when the schema names none: a full turn either way.
const FALLBACK_RANGE = {
	deg: { min: -360, max: 360, step: 1 },
	turn: { min: -1, max: 1, step: 0.01 },
};
const VALUE_BOX_STYLE = { width: 104, flexShrink: 0 };

// A stored number is degrees; the unit input shows it as such.
const toDraft = ( value ) =>
	typeof value === 'number' ? `${ value }deg` : textDraft( value );

// Degrees, with or without the unit, are the type's base unit and are stored as the plain number the schema bounds;
// `turn` stays text for the field type to check.
const parse = ( raw ) => {
	const text = raw.trim();
	const degrees = DEGREES.exec( text );
	return degrees ? Number( degrees[ 1 ] ) : text;
};

/**
 * @param {Object}      props
 * @param {string}      props.label                 Field label.
 * @param {unknown}     props.value                 A number (degrees), a `deg` or `turn` string, or undefined.
 * @param {Function}    props.onChange              Receives a schema-valid angle, or undefined to clear.
 * @param {Object|null} [props.fieldNode]           The field's schema node (its narrowing range).
 * @param {unknown}     [props.presetValue]         The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]                Hint text.
 * @param {boolean}     [props.hideLabelFromVision] Visually hide the label when a wrapper already shows it.
 * @return {Element} The control.
 */
export default function AngleAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	help,
	hideLabelFromVision,
} ) {
	const range = boundsOf( 'angle', fieldNode );
	const field = useAtomField( {
		type: 'angle',
		fieldNode,
		value,
		onChange,
		presetValue,
		toDraft,
		parse,
	} );
	const units = range.units.map( ( unit ) => ( {
		value: unit,
		label: unit,
		default: 0,
	} ) );

	const shown = ANGLE.exec( String( field.draft ?? '' ).trim() );
	const unit = shown?.[ 2 ] || 'deg';
	const fallback = FALLBACK_RANGE[ unit ];
	// The schema bounds are degrees; a turn is 360 of them.
	const scale = 'turn' === unit ? 1 / 360 : 1;
	const sliderMin = null === range.min ? fallback.min : range.min * scale;
	const sliderMax = null === range.max ? fallback.max : range.max * scale;

	return (
		<AtomFrame
			kind="angle"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<Flex align="center" gap={ 2 }>
				<FlexItem style={ VALUE_BOX_STYLE }>
					<UnitControl
						label={ label }
						hideLabelFromVision={ hideLabelFromVision }
						value={ field.draft }
						units={ units }
						onChange={ ( raw ) => field.edit( raw ?? '' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexItem>
				<FlexBlock>
					<RangeControl
						label={ label }
						hideLabelFromVision
						value={ shown ? Number( shown[ 1 ] ) : 0 }
						onChange={ ( next ) =>
							field.edit(
								undefined === next || null === next
									? ''
									: `${ next }${ unit }`
							)
						}
						min={ sliderMin }
						max={ sliderMax }
						step={ fallback.step }
						withInputField={ false }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexBlock>
			</Flex>
		</AtomFrame>
	);
}
