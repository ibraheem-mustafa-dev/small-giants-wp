/**
 * DistanceAtom: a length with units (the `distance` field type): a number with a unit, or a `distance` token offered
 * as a preset. It builds on `SgsLengthControl` with its opt-in `tokenPresets`. The units and tokens come from the
 * schema, narrowed by the field's own node; only a schema-valid value leaves the atom.
 *
 * @package
 */

import SgsLengthControl from '../SgsLengthControl';
import { validateField } from './field-types';
import { boundsOf, textDraft, tokenLabel, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

const PIXELS = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?$/;

// A stored number is a length in pixels; the unit input shows it as such.
const toDraft = ( value ) =>
	typeof value === 'number' ? `${ value }px` : textDraft( value );

// Pixels, with or without the unit, are the type's base unit and are stored as the plain number the schema bounds;
// any other unit stays text for the field type to check.
const parse = ( raw ) => {
	const text = raw.trim();
	const pixels = PIXELS.exec( text );
	return pixels ? Number( pixels[ 1 ] ) : text;
};

/**
 * @param {Object}      props
 * @param {string}      props.label                 Field label.
 * @param {unknown}     props.value                 A number (px), a length string, a distance token, or undefined.
 * @param {Function}    props.onChange              Receives a schema-valid distance, or undefined to clear.
 * @param {Object|null} [props.fieldNode]           The field's schema node (its narrowing range).
 * @param {boolean}     [props.allowLift]           Also offer the negated distance tokens (a lift, resolved to `calc(-1 * ...)`).
 * @param {unknown}     [props.presetValue]         The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]                Hint text.
 * @param {boolean}     [props.hideLabelFromVision] Visually hide the label when a wrapper already shows it.
 * @return {Element} The control.
 */
export default function DistanceAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	allowLift = false,
	presetValue,
	help,
	hideLabelFromVision,
} ) {
	const range = boundsOf( 'distance', fieldNode );
	const field = useAtomField( {
		type: 'distance',
		fieldNode,
		value,
		onChange,
		presetValue,
		toDraft,
		parse,
	} );
	const candidates = allowLift
		? [ ...range.tokens, ...range.tokens.map( ( token ) => `-${ token }` ) ]
		: range.tokens;
	const tokenPresets = candidates
		.filter( ( token ) => validateField( 'distance', token, fieldNode ).ok )
		.map( ( token ) => ( { label: tokenLabel( token ), value: token } ) );
	const units = range.units.map( ( unit ) => ( {
		value: unit,
		label: unit,
		default: 0,
	} ) );

	return (
		<AtomFrame
			kind="distance"
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
				tokenPresets={ tokenPresets }
				hideLabelFromVision={ hideLabelFromVision }
				onChange={ field.edit }
			/>
		</AtomFrame>
	);
}
