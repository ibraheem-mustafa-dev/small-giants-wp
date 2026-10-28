import { __ } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';

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
	const fields = [
		{ attr: 'submitLabel', label: __( 'Button Label', 'sgs-blocks' ) },
		{ attr: 'nextLabel', label: __( 'Next button label (multi-step)', 'sgs-blocks' ) },
		{ attr: 'prevLabel', label: __( 'Previous button label (multi-step)', 'sgs-blocks' ) },
	];
	return fields.map( ( { attr, label } ) => (
		<TextControl
			key={ attr }
			label={ label }
			value={ attributes[ attr ] ?? '' }
			onChange={ ( value ) => setAttributes( { [ attr ]: value } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	) );
}
