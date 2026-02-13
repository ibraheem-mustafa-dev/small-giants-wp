import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

const VARIANT_OPTIONS = [
	{ label: __( 'Inline button', 'sgs-blocks' ), value: 'inline' },
	{ label: __( 'Floating button', 'sgs-blocks' ), value: 'floating' },
	{ label: __( 'Banner', 'sgs-blocks' ), value: 'banner' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		phoneNumber,
		message,
		variant,
		label,
		showOnMobile,
		showOnDesktop,
		labelColour,
		labelFontSize,
		backgroundColour,
	} = attributes;

	const className = [
		'sgs-whatsapp-cta',
		`sgs-whatsapp-cta--${ variant }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const btnStyle = {
		color: colourVar( labelColour ) || undefined,
		backgroundColor: colourVar( backgroundColour ) || undefined,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'WhatsApp Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Phone number', 'sgs-blocks' ) }
						help={ __(
							'International format without + or spaces (e.g. 447700900000)',
							'sgs-blocks'
						) }
						value={ phoneNumber || '' }
						onChange={ ( val ) =>
							setAttributes( { phoneNumber: val } )
						}
						type="tel"
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={ __(
							'Pre-filled message',
							'sgs-blocks'
						) }
						value={ message || '' }
						onChange={ ( val ) =>
							setAttributes( { message: val } )
						}
						rows={ 2 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Visibility', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show on mobile', 'sgs-blocks' ) }
						checked={ showOnMobile }
						onChange={ ( val ) =>
							setAttributes( { showOnMobile: val } )
						}
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show on desktop', 'sgs-blocks' ) }
						checked={ showOnDesktop }
						onChange={ ( val ) =>
							setAttributes( { showOnDesktop: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ labelColour }
						onChange={ ( val ) =>
							setAttributes( { labelColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Label font size', 'sgs-blocks' ) }
						value={ labelFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { labelFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __(
							'Background colour',
							'sgs-blocks'
						) }
						value={ backgroundColour }
						onChange={ ( val ) =>
							setAttributes( { backgroundColour: val } )
						}
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<span
					className="sgs-whatsapp-cta__btn"
					style={ btnStyle }
				>
					<svg
						className="sgs-whatsapp-cta__icon"
						viewBox="0 0 24 24"
						width="24"
						height="24"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
					</svg>
					{ variant !== 'floating' ? (
						<RichText
							tagName="span"
							className="sgs-whatsapp-cta__label"
							value={ label }
							onChange={ ( val ) =>
								setAttributes( { label: val } )
							}
							placeholder={ __(
								'Chat on WhatsApp',
								'sgs-blocks'
							) }
						/>
					) : (
						<span className="sgs-whatsapp-cta__label sgs-sr-only">
							{ label ||
								__( 'Chat on WhatsApp', 'sgs-blocks' ) }
						</span>
					) }
				</span>

				{ ! phoneNumber && (
					<p className="sgs-whatsapp-cta__warning">
						{ __(
							'Set a phone number in the sidebar.',
							'sgs-blocks'
						) }
					</p>
				) }
			</div>
		</>
	);
}
