import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

/**
 * "Note box" (noteField and its four settings): an optional free-text box before Add to basket, for example
 * "Allergies or dietary needs?". Off by default. The label also names the row the text makes on the basket line and the order.
 *
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 */
export default function NotePanel( { attributes, setAttributes } ) {
	const on = true === attributes.noteField;
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Note box', 'sgs-blocks' ) } initialOpen={ on }>
				<ToggleControl
					label={ __( 'Ask the shopper for a note', 'sgs-blocks' ) }
					checked={ on }
					onChange={ ( val ) => setAttributes( { noteField: val } ) }
					help={ __( 'Prints a text box before Add to basket. What the shopper writes shows on the basket line, at checkout, on the order and in the order emails.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
				{ on && (
					<>
						<TextControl
							label={ __( 'Label', 'sgs-blocks' ) }
							__next40pxDefaultSize
							value={ attributes.noteLabel ?? '' }
							onChange={ ( val ) => setAttributes( { noteLabel: val } ) }
							help={ __( 'Also the name of the row on the basket line and the order.', 'sgs-blocks' ) }
						/>
						<TextControl
							label={ __( 'Hint', 'sgs-blocks' ) }
							__next40pxDefaultSize
							value={ attributes.noteHint ?? '' }
							onChange={ ( val ) => setAttributes( { noteHint: val } ) }
							help={ __( 'Optional help under the label, such as examples of what to write. Leave empty for none.', 'sgs-blocks' ) }
						/>
						<ToggleControl
							label={ __( 'Required', 'sgs-blocks' ) }
							checked={ true === attributes.noteRequired }
							onChange={ ( val ) => setAttributes( { noteRequired: val } ) }
							help={ __( 'The shopper cannot add to the basket, or use Apple Pay or Google Pay, until they have written something.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={ __( 'Maximum length (characters)', 'sgs-blocks' ) }
							__next40pxDefaultSize
							type="number"
							min={ 1 }
							max={ 1000 }
							value={ String( attributes.noteMaxLength ?? 300 ) }
							onChange={ ( val ) => setAttributes( { noteMaxLength: Math.min( 1000, Math.max( 1, parseInt( val, 10 ) || 300 ) ) } ) }
						/>
					</>
				) }
			</PanelBody>
		</InspectorControls>
	);
}
