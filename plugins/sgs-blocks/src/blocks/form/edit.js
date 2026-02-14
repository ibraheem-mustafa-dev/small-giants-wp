import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { DesignTokenPicker } from '../../components';

const SUBMIT_STYLE_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Success', 'sgs-blocks' ), value: 'success' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		formId,
		formName,
		submitLabel,
		submitStyle,
		successMessage,
		successRedirect,
		n8nWebhookUrl,
		honeypot,
		storeSubmissions,
		submitColour,
		submitBackground,
		progressBarColour,
	} = attributes;

	// Auto-generate formId from clientId on first insert.
	useEffect( () => {
		if ( ! formId ) {
			setAttributes( {
				formId: `form-${ clientId.substr( 0, 8 ) }`,
			} );
		}
	}, [ formId, clientId, setAttributes ] );

	const blockProps = useBlockProps( {
		className: 'sgs-form',
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-form__inner' },
		{
			allowedBlocks: [
				'sgs/form-step',
				'sgs/form-field-text',
				'sgs/form-field-email',
				'sgs/form-field-phone',
				'sgs/form-field-textarea',
				'sgs/form-field-select',
				'sgs/form-field-radio',
				'sgs/form-field-checkbox',
				'sgs/form-field-tiles',
				'sgs/form-field-file',
				'sgs/form-field-consent',
				'sgs/form-review',
			],
			template: [ [ 'sgs/form-step', { label: 'Step 1' } ] ],
			orientation: 'vertical',
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Form Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Form ID', 'sgs-blocks' ) }
						value={ formId }
						onChange={ ( value ) =>
							setAttributes( { formId: value } )
						}
						help={ __(
							'Unique identifier for this form. Used for analytics and tracking submissions.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Form Name', 'sgs-blocks' ) }
						value={ formName }
						onChange={ ( value ) =>
							setAttributes( { formName: value } )
						}
						help={ __(
							'Human-readable name for admin display.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Submission', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextareaControl
						label={ __( 'Success Message', 'sgs-blocks' ) }
						value={ successMessage }
						onChange={ ( value ) =>
							setAttributes( { successMessage: value } )
						}
						rows={ 3 }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Success Redirect URL', 'sgs-blocks' ) }
						value={ successRedirect }
						onChange={ ( value ) =>
							setAttributes( { successRedirect: value } )
						}
						help={ __(
							'Optional. Redirect to this URL after successful submission.',
							'sgs-blocks'
						) }
						type="url"
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'N8N Webhook URL', 'sgs-blocks' ) }
						value={ n8nWebhookUrl }
						onChange={ ( value ) =>
							setAttributes( { n8nWebhookUrl: value } )
						}
						help={ __(
							'Webhook endpoint for notifications. Leave empty to disable.',
							'sgs-blocks'
						) }
						type="url"
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Store Submissions', 'sgs-blocks' ) }
						checked={ storeSubmissions }
						onChange={ ( value ) =>
							setAttributes( { storeSubmissions: value } )
						}
						help={ __(
							'Save submissions to the WordPress database.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Honeypot Protection', 'sgs-blocks' ) }
						checked={ honeypot }
						onChange={ ( value ) =>
							setAttributes( { honeypot: value } )
						}
						help={ __(
							'Add a hidden field to catch spam bots.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Submit Button', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Button Label', 'sgs-blocks' ) }
						value={ submitLabel }
						onChange={ ( value ) =>
							setAttributes( { submitLabel: value } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Button Style', 'sgs-blocks' ) }
						value={ submitStyle }
						options={ SUBMIT_STYLE_OPTIONS }
						onChange={ ( value ) =>
							setAttributes( { submitStyle: value } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Text Colour', 'sgs-blocks' ) }
						value={ submitColour }
						onChange={ ( value ) =>
							setAttributes( { submitColour: value } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Background Colour', 'sgs-blocks' ) }
						value={ submitBackground }
						onChange={ ( value ) =>
							setAttributes( { submitBackground: value } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Progress Bar', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Progress Colour', 'sgs-blocks' ) }
						value={ progressBarColour }
						onChange={ ( value ) =>
							setAttributes( { progressBarColour: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
