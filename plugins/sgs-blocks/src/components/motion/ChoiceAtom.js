/**
 * ChoiceAtom: one option out of a list (the `choice` field type). Up to three options whose labels fit one row of the
 * inspector sidebar show as a segmented `ToggleGroupControl`; any other list shows as a `SelectControl`, the same split
 * `TypographyControls.js` makes (a segmented control gets cramped). The options come from the `options` prop or, failing that, from
 * the field node's `enum`; a value that is not one of them is refused.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../primitives';
import { boundsOf, refusalMessage, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

const MAX_SEGMENTED = 3;
// Label characters one segmented row holds in the 280px inspector sidebar at the editor's 13px font.
const SEGMENTED_CHAR_BUDGET = 24;

const humanise = ( value ) => {
	const text = value.replace( /-/g, ' ' );
	return text.charAt( 0 ).toUpperCase() + text.slice( 1 );
};

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         The chosen option, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid option, or undefined to clear.
 * @param {Array}       [props.options]     `[ { value, label } ]`; defaults to the node's `enum`, with the value as its label.
 * @param {Object|null} [props.fieldNode]   The field's schema node (its `enum`).
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {string|null} [props.emptyLabel]  Label of the unset option in the select form; `null` leaves the option out
 *                                          (a caller whose value can never be unset).
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function ChoiceAtom( {
	label,
	value,
	onChange,
	options,
	fieldNode = null,
	presetValue,
	emptyLabel = __( 'Not set', 'sgs-blocks' ),
	help,
} ) {
	const listed =
		options ||
		( boundsOf( 'choice', fieldNode ).options || [] ).map( ( option ) => ( {
			value: option,
			label: humanise( option ),
		} ) );
	const field = useAtomField( {
		type: 'choice',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );

	const choose = ( next ) => {
		if ( next === '' || next === undefined ) {
			field.commit( undefined );
		} else if ( listed.some( ( option ) => option.value === next ) ) {
			field.commit( next );
		} else {
			field.fail(
				refusalMessage( 'choice', {
					enum: listed.map( ( option ) => option.value ),
				} )
			);
		}
	};

	const segmented =
		listed.length > 0 &&
		listed.length <= MAX_SEGMENTED &&
		listed.reduce( ( sum, option ) => sum + String( option.label ).length, 0 ) <= SEGMENTED_CHAR_BUDGET;
	const current = typeof value === 'string' ? value : '';

	return (
		<AtomFrame
			kind="choice"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			{ segmented ? (
				<ToggleGroupControl
					label={ label }
					value={ current }
					onChange={ choose }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ listed.map( ( option ) => (
						<ToggleGroupControlOption
							key={ option.value }
							value={ option.value }
							label={ option.label }
						/>
					) ) }
				</ToggleGroupControl>
			) : (
				<SelectControl
					label={ label }
					value={ current }
					options={
						emptyLabel === null
							? listed
							: [ { label: emptyLabel, value: '' }, ...listed ]
					}
					onChange={ choose }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</AtomFrame>
	);
}
