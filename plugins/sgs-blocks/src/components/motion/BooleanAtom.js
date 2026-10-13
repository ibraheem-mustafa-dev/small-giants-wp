/**
 * BooleanAtom: an on/off switch for a `boolean` field (Follow pointer, parallax background, the stagger helper's apply
 * and restart-each-row). An unset field reads as off; switching writes `true` or `false`, and Reset restores the
 * preset's value. A per-device field is wrapped in `PerDeviceAtom` by its panel, like every other value atom.
 *
 * @package
 */

import { ToggleControl } from '@wordpress/components';
import { useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         The stored flag, or undefined.
 * @param {Function}    props.onChange      Receives `true` or `false`, or undefined to clear.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function BooleanAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	help,
} ) {
	const field = useAtomField( {
		type: 'boolean',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );

	return (
		<AtomFrame
			kind="boolean"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<ToggleControl
				label={ label }
				checked={ value === true }
				onChange={ ( next ) => field.commit( !! next ) }
				__nextHasNoMarginBottom
			/>
		</AtomFrame>
	);
}
