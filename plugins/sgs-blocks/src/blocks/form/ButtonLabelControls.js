import { __ } from '@wordpress/i18n';
import SgsFreeTextField from '../../components/SgsFreeTextField';

/**
 * The words on the form's own buttons: Submit, and a multi-step form's Next and Previous.
 * An emptied field shows the button's default words.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    The form block's attributes.
 * @param {Function} props.setAttributes The form block's attribute setter.
 * @return {Element} The three label fields.
 */
export default function ButtonLabelControls( { attributes, setAttributes } ) {
	return (
		<>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Button Label', 'sgs-blocks' ) }
				value={ attributes.submitLabel ?? '' }
				onChange={ ( value ) => setAttributes( { submitLabel: value } ) }
			/>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Next button label (multi-step)', 'sgs-blocks' ) }
				value={ attributes.nextLabel ?? '' }
				onChange={ ( value ) => setAttributes( { nextLabel: value } ) }
			/>
			<SgsFreeTextField
				type="rich"
				noLink
				label={ __( 'Previous button label (multi-step)', 'sgs-blocks' ) }
				value={ attributes.prevLabel ?? '' }
				onChange={ ( value ) => setAttributes( { prevLabel: value } ) }
			/>
		</>
	);
}
