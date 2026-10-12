/**
 * ColourReferenceAtom: a colour as a palette slug or a one-off hex (the `colourReference` field type). It wraps
 * `DesignTokenPicker` in its `linked` mode, which stores the palette slug of a picked swatch (so a brand change
 * recolours the element) and the hex of a custom colour. A picked value the field type refuses (for example an
 * `rgba()` string from the alpha slider) is not passed on.
 *
 * @package
 */

import DesignTokenPicker from '../DesignTokenPicker';
import { useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';

/**
 * @param {Object}      props
 * @param {string}      props.label         Field label.
 * @param {unknown}     props.value         A palette slug, a hex colour, or undefined.
 * @param {Function}    props.onChange      Receives a schema-valid colour reference, or undefined to clear.
 * @param {Object|null} [props.fieldNode]   The field's schema node.
 * @param {unknown}     [props.presetValue] The preset's stamped value; a differing value shows the Customised tag.
 * @param {boolean}     [props.enableAlpha] Offer the alpha slider (hex8 values are valid).
 * @param {string}      [props.help]        Hint text.
 * @return {Element} The control.
 */
export default function ColourReferenceAtom( {
	label,
	value,
	onChange,
	fieldNode = null,
	presetValue,
	enableAlpha = true,
	help,
} ) {
	const field = useAtomField( {
		type: 'colourReference',
		fieldNode,
		value,
		onChange,
		presetValue,
	} );

	return (
		<AtomFrame
			kind="colour"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<DesignTokenPicker
				label={ label }
				value={ typeof value === 'string' ? value : '' }
				linked
				enableAlpha={ enableAlpha }
				onChange={ ( picked ) => field.edit( picked ) }
			/>
		</AtomFrame>
	);
}
