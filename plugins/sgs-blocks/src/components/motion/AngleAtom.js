/**
 * AngleAtom: an angle (the `angle` field type): a number in degrees, or a `deg` or `turn` value. The same unit input
 * as the Distance atom with the angle units; the range comes from the schema, narrowed by the field's own node.
 *
 * @package
 */

import SgsLengthControl from '../SgsLengthControl';
import { boundsOf, textDraft, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

const DEGREES = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?$/;

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

	return (
		<AtomFrame
			kind="angle"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<SgsLengthControl
				label={ label }
				value={ field.draft }
				units={ units }
				hideLabelFromVision={ hideLabelFromVision }
				onChange={ field.edit }
			/>
		</AtomFrame>
	);
}
