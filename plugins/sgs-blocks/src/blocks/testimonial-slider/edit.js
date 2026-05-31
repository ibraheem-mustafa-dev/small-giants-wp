/**
 * SGS Testimonial Slider — editor component.
 *
 * FR-22-6 InnerBlocks migration (2026-05-30):
 * The previous custom repeater (testimonials array + TextareaControl rows)
 * is replaced with useInnerBlocksProps. Operators add/remove/reorder
 * sgs/testimonial blocks natively via the block inserter and drag handles.
 * All slider CONFIG controls (layout, autoplay, speed, dots/arrows, card style,
 * colours, hover) remain in the inspector panel.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const LAYOUT_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Split (image + slider)', 'sgs-blocks' ), value: 'split' },
];

const STYLE_OPTIONS = [
	{ label: __( 'Card', 'sgs-blocks' ), value: 'card' },
	{ label: __( 'Minimal', 'sgs-blocks' ), value: 'minimal' },
	{ label: __( 'Featured', 'sgs-blocks' ), value: 'featured' },
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
];

const SLIDES_VISIBLE_OPTIONS = [
	{ label: __( '1 slide', 'sgs-blocks' ), value: 1 },
	{ label: __( '2 slides', 'sgs-blocks' ), value: 2 },
	{ label: __( '3 slides', 'sgs-blocks' ), value: 3 },
];

// Seed the slider with 2 sgs/testimonial blocks so it's not empty on first insert.
const SLIDER_TEMPLATE = [
	[ 'sgs/testimonial', {} ],
	[ 'sgs/testimonial', {} ],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		layout,
		sideImage,
		autoplay,
		autoplaySpeed,
		showDots,
		showArrows,
		slidesVisible,
		cardStyle,
		quoteColour,
		nameColour,
		roleColour,
		ratingColour,
		hoverBackgroundColour,
		hoverTextColour,
		hoverBorderColour,
		hoverEffect,
		transitionDuration,
		transitionEasing,
	} = attributes;

	const isSplit = layout === 'split';

	const className = [
		'sgs-testimonial-slider',
		`sgs-testimonial-slider--${ cardStyle }`,
		isSplit ? 'sgs-testimonial-slider--split' : '',
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

	// InnerBlocks — allows any number of sgs/testimonial children.
	// templateLock:false preserves Bean's "add as many as I want" flexibility.
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-testimonial-slider__track',
			style: { '--sgs-slides-visible': slidesVisible },
		},
		{
			allowedBlocks: [ 'sgs/testimonial' ],
			template: SLIDER_TEMPLATE,
			templateLock: false,
			orientation: 'horizontal',
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Layout', 'sgs-blocks' ) }
						value={ layout || 'full' }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { layout: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ isSplit && (
					<PanelBody title={ __( 'Side Image', 'sgs-blocks' ) } initialOpen={ true }>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										sideImage: { id: media.id, url: media.url, alt: media.alt },
									} )
								}
								allowedTypes={ [ 'image' ] }
								value={ sideImage?.id }
								render={ ( { open } ) => (
									<div>
										{ sideImage?.url ? (
											<>
												<img
													src={ sideImage.url }
													alt=""
													style={ { maxWidth: '100%', marginBottom: '8px', borderRadius: '4px' } }
												/>
												<Button
													variant="secondary"
													onClick={ () => setAttributes( { sideImage: undefined } ) }
													isDestructive
												>
													{ __( 'Remove image', 'sgs-blocks' ) }
												</Button>
											</>
										) : (
											<Button variant="secondary" onClick={ open }>
												{ __( 'Select side image', 'sgs-blocks' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				) }

				<PanelBody title={ __( 'Slider Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) => setAttributes( { transitionDuration: val } ) }
						help={ __( 'Duration of arrow and dot hover transitions in milliseconds. Default: 300.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
							{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
							{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
							{ label: __( 'Ease in–out', 'sgs-blocks' ), value: 'ease-in-out' },
							{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
						] }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Slides visible (desktop)', 'sgs-blocks' ) }
						value={ slidesVisible }
						options={ SLIDES_VISIBLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { slidesVisible: parseInt( val, 10 ) } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show arrows', 'sgs-blocks' ) }
						checked={ showArrows }
						onChange={ ( val ) => setAttributes( { showArrows: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Show dots', 'sgs-blocks' ) }
						checked={ showDots }
						onChange={ ( val ) => setAttributes( { showDots: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Autoplay', 'sgs-blocks' ) }
						checked={ autoplay }
						onChange={ ( val ) => setAttributes( { autoplay: val } ) }
						__nextHasNoMarginBottom
					/>
					{ autoplay && (
						<RangeControl
							label={ __( 'Autoplay speed (ms)', 'sgs-blocks' ) }
							value={ autoplaySpeed }
							onChange={ ( val ) => setAttributes( { autoplaySpeed: val } ) }
							min={ 2000 }
							max={ 10000 }
							step={ 500 }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Text Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Quote colour', 'sgs-blocks' ) }
						value={ quoteColour }
						onChange={ ( val ) => setAttributes( { quoteColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) => setAttributes( { nameColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Role colour', 'sgs-blocks' ) }
						value={ roleColour }
						onChange={ ( val ) => setAttributes( { roleColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Star colour', 'sgs-blocks' ) }
						value={ ratingColour }
						onChange={ ( val ) => setAttributes( { ratingColour: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Hover States', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { hoverEffect: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Hover background colour', 'sgs-blocks' ) }
						value={ hoverBackgroundColour }
						onChange={ ( val ) => setAttributes( { hoverBackgroundColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover text colour', 'sgs-blocks' ) }
						value={ hoverTextColour }
						onChange={ ( val ) => setAttributes( { hoverTextColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Hover border colour', 'sgs-blocks' ) }
						value={ hoverBorderColour }
						onChange={ ( val ) => setAttributes( { hoverBorderColour: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ isSplit && sideImage?.url && (
					<div className="sgs-testimonial-slider__side-image">
						<img
							src={ sideImage.url }
							alt={ sideImage.alt || '' }
							className="sgs-testimonial-slider__side-img"
						/>
					</div>
				) }
				{ /*
				 * useInnerBlocksProps renders the .sgs-testimonial-slider__track
				 * directly with the InnerBlocks appender inside. Each sgs/testimonial
				 * child appears as a flex item in the track, matching the CSS that
				 * styles .sgs-testimonial-slider__slide. On the frontend, render.php
				 * wraps each inner block in .sgs-testimonial-slider__slide so view.js
				 * querySelectorAll finds them correctly.
				 */ }
				{ isSplit ? (
					<div className="sgs-testimonial-slider__slider-content">
						<div { ...innerBlocksProps } />
					</div>
				) : (
					<div { ...innerBlocksProps } />
				) }
			</div>
		</>
	);
}
