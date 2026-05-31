import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
	{ label: __( 'Featured', 'sgs-blocks' ), value: 'featured' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		avatar,
		authorMedia,
		rating,
		style: cardStyle,
		quoteColour,
		nameColour,
		nameFontSize,
		roleColour,
		ratingColour,
		reviewSource,
		reviewDate,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
		schemaEnabled,
	} = attributes;

	const className = [
		'sgs-testimonial',
		`sgs-testimonial--${ cardStyle }`,
		hoverEffect && hoverEffect !== 'none'
			? `sgs-testimonial--hover-${ hoverEffect }`
			: '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			'--sgs-hover-bg': hoverBackgroundColour
				? colourVar( hoverBackgroundColour )
				: undefined,
			'--sgs-hover-text': hoverTextColour
				? colourVar( hoverTextColour )
				: undefined,
			'--sgs-hover-border': hoverBorderColour
				? colourVar( hoverBorderColour )
				: undefined,
			'--sgs-transition-duration': transitionDuration
				? `${ transitionDuration }ms`
				: undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	// ── InnerBlocks — seeded with a core/paragraph for quote text.
	// Converter will emit sgs/star-rating + sgs/text + sgs/text (author/role)
	// once those Phase 2 blocks are built. templateLock:false preserves
	// Bean's add/remove flexibility in the block editor.
	const TESTIMONIAL_TEMPLATE = [
		[ 'core/paragraph', { placeholder: __( 'Write the testimonial quote…', 'sgs-blocks' ), className: 'sgs-testimonial__quote' } ],
	];

	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-testimonial__inner-content' },
		{
			template: TESTIMONIAL_TEMPLATE,
			templateLock: false,
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ [
							{
								label: __( 'None', 'sgs-blocks' ),
								value: 'none',
							},
							{
								label: __( 'Lift', 'sgs-blocks' ),
								value: 'lift',
							},
							{
								label: __( 'Scale', 'sgs-blocks' ),
								value: 'scale',
							},
							{
								label: __( 'Glow', 'sgs-blocks' ),
								value: 'glow',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { hoverEffect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( {
								hoverBackgroundColour: val,
							} )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover text', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) =>
							setAttributes( { hoverTextColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Hover border', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) =>
							setAttributes( {
								hoverBorderColour: val,
							} )
						}
					/>
					<TextControl
						label={ __(
							'Transition duration (ms)',
							'sgs-blocks'
						) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( {
								transitionDuration: val,
							} )
						}
						help={ __(
							'Duration of all hover transitions in milliseconds. Default: 300.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{
								label: __( 'Ease', 'sgs-blocks' ),
								value: 'ease',
							},
							{
								label: __( 'Ease in', 'sgs-blocks' ),
								value: 'ease-in',
							},
							{
								label: __( 'Ease out', 'sgs-blocks' ),
								value: 'ease-out',
							},
							{
								label: __(
									'Ease in\u2013out',
									'sgs-blocks'
								),
								value: 'ease-in-out',
							},
							{
								label: __( 'Linear', 'sgs-blocks' ),
								value: 'linear',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { transitionEasing: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Testimonial Style', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { style: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Star rating', 'sgs-blocks' ) }
						value={ rating }
						onChange={ ( val ) =>
							setAttributes( { rating: val } )
						}
						min={ 0 }
						max={ 5 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Avatar', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<MediaPicker
						value={ authorMedia || ( avatar?.url ? {
							url: avatar.url,
							type: 'image',
							id: avatar.id || 0,
							alt: avatar.alt || '',
							mime: 'image/jpeg',
						} : null ) }
						onChange={ ( media ) =>
							setAttributes( {
								authorMedia: media,
								// Mirror to legacy avatar so existing CSS / fallback render paths still work.
								avatar: media
									? {
										id: media.id,
										url: media.url,
										alt: media.alt,
									}
									: undefined,
							} )
						}
						onRemove={ () =>
							setAttributes( {
								authorMedia: null,
								avatar: undefined,
							} )
						}
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select author photo', 'sgs-blocks' ) }
						instructionsImage={ __(
							'Choose an image for the testimonial author',
							'sgs-blocks'
						) }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Text Styling', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Quote colour', 'sgs-blocks' ) }
						value={ quoteColour }
						onChange={ ( val ) =>
							setAttributes( { quoteColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) =>
							setAttributes( { nameColour: val } )
						}
					/>
					<ResponsiveControl
						label={ __( 'Name font size', 'sgs-blocks' ) }
					>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'nameFontSize',
								tablet: 'nameFontSizeTablet',
								mobile: 'nameFontSizeMobile',
							};
							return (
								<SelectControl
									value={
										attributes[
											attrMap[ breakpoint ]
										] || ''
									}
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __(
															'Same as desktop',
															'sgs-blocks'
														),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) =>
															opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( {
											[ attrMap[ breakpoint ] ]:
												val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<DesignTokenPicker
						label={ __( 'Role colour', 'sgs-blocks' ) }
						value={ roleColour }
						onChange={ ( val ) =>
							setAttributes( { roleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Star colour', 'sgs-blocks' ) }
						value={ ratingColour }
						onChange={ ( val ) =>
							setAttributes( { ratingColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Review Source', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Source platform', 'sgs-blocks' ) }
						help={ __(
							'e.g. Google Reviews, LinkedIn, Trustpilot. Leave empty for hand-written testimonials (no schema output).',
							'sgs-blocks'
						) }
						value={ reviewSource }
						onChange={ ( val ) =>
							setAttributes( { reviewSource: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ reviewSource && (
						<TextControl
							label={ __( 'Review date', 'sgs-blocks' ) }
							help={ __(
								'Date of the original review (YYYY-MM-DD).',
								'sgs-blocks'
							) }
							value={ reviewDate }
							onChange={ ( val ) =>
								setAttributes( { reviewDate: val } )
							}
							type="date"
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'SEO Schema Markup', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Output schema.org/Review JSON-LD', 'sgs-blocks' ) }
						help={ __(
							'Adds structured data for this testimonial. Enable when the review author has given permission for their name to appear in search results.',
							'sgs-blocks'
						) }
						checked={ schemaEnabled }
						onChange={ ( val ) =>
							setAttributes( { schemaEnabled: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /*
			 * Editor card shell. InnerBlocks replace the old RichText
			 * quote / name / role fields. Content (quote text, stars,
			 * author name, role) lives in child blocks; presentation
			 * (card style, hover, colours) stays in inspector attrs.
			 *
			 * Avatar is kept as a MediaPicker attr \u2014 it is presentation
			 * identity controlled by the inspector, not inline content.
			 */ }
			<blockquote { ...blockProps }>
				<div { ...innerBlocksProps } />
				<footer className="sgs-testimonial__footer">
					<div className="sgs-testimonial__avatar">
						{ ( authorMedia?.url || avatar?.url ) ? (
							<img
								src={ authorMedia?.url || avatar?.url }
								alt={ authorMedia?.alt || avatar?.alt || '' }
								className="sgs-testimonial__avatar-img"
							/>
						) : (
							<span
								className="sgs-testimonial__avatar-initials"
								aria-hidden="true"
							>
								{ '?' }
							</span>
						) }
					</div>
				</footer>
			</blockquote>
		</>
	);
}
