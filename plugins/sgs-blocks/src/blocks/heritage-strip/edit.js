import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
} from '@wordpress/components';

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];
import { DesignTokenPicker } from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

const LAYOUT_OPTIONS = [
	{
		label: __( 'Image \u2014 Text \u2014 Image', 'sgs-blocks' ),
		value: 'image-text-image',
	},
	{
		label: __( 'Text \u2014 Image', 'sgs-blocks' ),
		value: 'text-image',
	},
	{
		label: __( 'Image \u2014 Text', 'sgs-blocks' ),
		value: 'image-text',
	},
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

function ImagePicker( { label, image, onSelect, onRemove } ) {
	return (
		<div style={ { marginBottom: '16px' } }>
			<p style={ { fontWeight: 600, marginBottom: '4px' } }>
				{ label }
			</p>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ ( media ) =>
						onSelect( {
							id: media.id,
							url: media.url,
							alt: media.alt,
						} )
					}
					allowedTypes={ [ 'image' ] }
					value={ image?.id }
					render={ ( { open } ) => (
						<div>
							{ image?.url ? (
								<>
									<img
										src={ image.url }
										alt=""
										style={ {
											maxWidth: '100%',
											marginBottom: '8px',
											borderRadius: '4px',
										} }
									/>
									<Button
										variant="secondary"
										onClick={ onRemove }
										isDestructive
										size="small"
									>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</>
							) : (
								<Button
									variant="secondary"
									onClick={ open }
								>
									{ __( 'Select image', 'sgs-blocks' ) }
								</Button>
							) }
						</div>
					) }
				/>
			</MediaUploadCheck>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		layout,
		headline,
		body,
		imageLeft,
		imageRight,
		headlineColour,
		headlineFontSize,
		bodyColour,
		bodyFontSize,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
	} = attributes;

	const showLeftImage =
		layout === 'image-text-image' || layout === 'image-text';
	const showRightImage =
		layout === 'image-text-image' || layout === 'text-image';

	const className = [
		'sgs-heritage-strip',
		`sgs-heritage-strip--${ layout }`,
		hoverEffect && hoverEffect !== 'none' ? `sgs-heritage-strip--hover-${ hoverEffect }` : '',
	].filter( Boolean ).join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
				>
					<SelectControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						value={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layout: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Images', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ showLeftImage && (
						<ImagePicker
							label={ __( 'Left image', 'sgs-blocks' ) }
							image={ imageLeft }
							onSelect={ ( media ) =>
								setAttributes( { imageLeft: media } )
							}
							onRemove={ () =>
								setAttributes( {
									imageLeft: undefined,
								} )
							}
						/>
					) }
					{ showRightImage && (
						<ImagePicker
							label={ __( 'Right image', 'sgs-blocks' ) }
							image={ imageRight }
							onSelect={ ( media ) =>
								setAttributes( { imageRight: media } )
							}
							onRemove={ () =>
								setAttributes( {
									imageRight: undefined,
								} )
							}
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Headline colour', 'sgs-blocks' ) }
						value={ headlineColour }
						onChange={ ( val ) =>
							setAttributes( { headlineColour: val } )
						}
					/>
					<SelectControl
						label={ __(
							'Headline font size',
							'sgs-blocks'
						) }
						value={ headlineFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headlineFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Body colour', 'sgs-blocks' ) }
						value={ bodyColour }
						onChange={ ( val ) =>
							setAttributes( { bodyColour: val } )
						}
					/>
					<SelectControl
						label={ __( 'Body font size', 'sgs-blocks' ) }
						value={ bodyFontSize || '' }
						options={ FONT_SIZE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { bodyFontSize: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background colour', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBackgroundColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text colour', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) =>
							setAttributes( { hoverTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border colour', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) =>
							setAttributes( { hoverBorderColour: val } )
						}
					/>
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) => setAttributes( { transitionDuration: val } ) }
						help={ __( 'Duration of all hover transitions in milliseconds. Default: 300.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
							{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
							{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
							{ label: __( 'Ease in\u2013out', 'sgs-blocks' ), value: 'ease-in-out' },
							{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
						] }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<section { ...blockProps }>
				{ showLeftImage && (
					<div className="sgs-heritage-strip__image sgs-heritage-strip__image--left">
						{ imageLeft?.url ? (
							<img
								src={ imageLeft.url }
								alt={ imageLeft.alt || '' }
								className="sgs-heritage-strip__img"
							/>
						) : (
							<div className="sgs-heritage-strip__placeholder">
								{ __( 'Left image', 'sgs-blocks' ) }
							</div>
						) }
					</div>
				) }

				<div className="sgs-heritage-strip__content">
					<RichText
						tagName="h2"
						className="sgs-heritage-strip__headline"
						value={ headline }
						onChange={ ( val ) =>
							setAttributes( { headline: val } )
						}
						placeholder={ __(
							'Our story\u2026',
							'sgs-blocks'
						) }
						style={ {
							color:
								colourVar( headlineColour ) || undefined,
							fontSize:
								fontSizeVar( headlineFontSize ) ||
								undefined,
						} }
					/>
					<RichText
						tagName="div"
						className="sgs-heritage-strip__body"
						value={ body }
						onChange={ ( val ) =>
							setAttributes( { body: val } )
						}
						multiline="p"
						placeholder={ __(
							'Tell your story\u2026',
							'sgs-blocks'
						) }
						style={ {
							color: colourVar( bodyColour ) || undefined,
							fontSize:
								fontSizeVar( bodyFontSize ) || undefined,
						} }
					/>
				</div>

				{ showRightImage && (
					<div className="sgs-heritage-strip__image sgs-heritage-strip__image--right">
						{ imageRight?.url ? (
							<img
								src={ imageRight.url }
								alt={ imageRight.alt || '' }
								className="sgs-heritage-strip__img"
							/>
						) : (
							<div className="sgs-heritage-strip__placeholder">
								{ __( 'Right image', 'sgs-blocks' ) }
							</div>
						) }
					</div>
				) }
			</section>
		</>
	);
}
