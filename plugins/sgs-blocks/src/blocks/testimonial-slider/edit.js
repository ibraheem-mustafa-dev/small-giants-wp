/**
 * SGS Testimonial Slider — editor component.
 *
 * Uses useInnerBlocksProps. Operators add/remove/reorder sgs/testimonial
 * blocks natively via the block inserter and drag handles. All slider
 * CONFIG controls (layout, autoplay, speed, dots/arrows, card style,
 * colours, hover) remain in the inspector panel.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useSettings,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	RangeControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { SgsColourPanel, fillRow, textRow, IconPicker, ResponsiveOverride, ResponsiveLengthControl,
	SgsBorderControl,
	TypographyControls,
	resolveColourToken,
} from '../../components';
import { resolveResponsiveTier } from '../../utils/responsive';
import { containerWrapperPreview, backgroundPaintPreview, textPaintPreview, typographyPreviewStyle, usePreviewTier, BandWrap } from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

// Options mirror the 7 sgs/testimonial variants (block.json supports.sgs.variants),
// plus a leading "no default" option so each card can pick its own variant.
const STYLE_OPTIONS = [
	{ label: __( 'Per-card (no default)', 'sgs-blocks' ), value: '' },
	{ label: __( 'Classic card', 'sgs-blocks' ), value: 'classic-card' },
	{
		label: __( 'Editorial pull-quote', 'sgs-blocks' ),
		value: 'pull-quote-editorial',
	},
	{ label: __( 'Rating-led', 'sgs-blocks' ), value: 'rating-led' },
	{
		label: __( 'Avatar spotlight', 'sgs-blocks' ),
		value: 'avatar-spotlight',
	},
	{ label: __( 'Corporate logo', 'sgs-blocks' ), value: 'corporate-logo' },
	{ label: __( 'Case study', 'sgs-blocks' ), value: 'case-study-media' },
	{ label: __( 'Minimal quote', 'sgs-blocks' ), value: 'minimal-quote' },
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
		autoplay,
		autoplaySpeed,
		pauseButton,
		showDots,
		showArrows,
		arrowIconPrev,
		arrowIconNext,
		slidesVisible,
		slidePeek,
		slideGap,
		slideBleed,
		cardStyle,
		backgroundColour,
		backgroundColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		transitionDuration,
		transitionEasing,
		changeTransition,
		changeDistance,
		changeDuration,
		changeEasing,
		dragToScroll,
	} = attributes;

	const className = [
		'sgs-testimonial-slider',
	]
		.filter( Boolean )
		.join( ' ' );

	// The slider root's paint at the previewed tier: the shared wrapper (kind
	// 'layout'), then render.php's own colour and root typography rules.
	const [ colourPalette ] = useSettings( 'color.palette' );
	const previewTier = usePreviewTier();
	const wrapperPreview = containerWrapperPreview( attributes, previewTier, colourPalette );
	const blockProps = useBlockProps( {
		className: [ className, wrapperPreview.className ].filter( Boolean ).join( ' ' ),
		style: {
			...wrapperPreview.style,
			...backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette ),
			...textPaintPreview( attributes.textColour, attributes.textColourGradient, colourPalette ),
			...typographyPreviewStyle( attributes, '', previewTier ),
			'--sgs-transition-duration': transitionDuration
				? `${ transitionDuration }ms`
				: undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	// The visible-card count and peek at the previewed device (tablet inherits desktop; mobile is one slide unless set).
	const slidesDesktop = resolveResponsiveTier( slidesVisible, 'desktop' )?.value || 3;
	const slidesVisibleNow =
		'mobile' === previewTier
			? slidesVisible?.mobile || 1
			: resolveResponsiveTier( slidesVisible, previewTier )?.value || slidesDesktop;
	const slidePeekNow = resolveResponsiveTier( slidePeek, previewTier )?.value || '';
	const slideGapNow = resolveResponsiveTier( slideGap, previewTier )?.value || '';
	const slideBleedNow = resolveResponsiveTier( slideBleed, previewTier )?.value || '';

	// InnerBlocks — allows any number of sgs/testimonial children.
	// templateLock:false lets the client add as many slides as they want.
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-testimonial-slider__track',
			style: {
				'--sgs-slides-visible': slidesVisibleNow,
				'--sgs-slide-peek': slidePeekNow || undefined,
				'--sgs-slide-gap': slideGapNow || undefined,
				padding: slideBleedNow || undefined,
				margin: slideBleedNow ? `calc(-1 * ${ slideBleedNow })` : undefined,
			},
		},
		{
			allowedBlocks: [ 'sgs/testimonial' ],
			template: SLIDER_TEMPLATE,
			templateLock: false,
			orientation: 'horizontal',
		}
	);

	// Wrapper colours: flat backgroundColour/textColour attrs plus Hover siblings
	// (native supports.color stays off, so no native panel renders).
	return (
		<>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					{
						key: 'border',
						label: __( 'Border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) =>
									setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>

				{ /* No outer PanelBody: it would duplicate this
				   ToolsPanel's own "Slider Settings" title, so the client
				   would see the same words twice for no collapse benefit
				   (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Slider Settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								cardStyle: '',
								transitionDuration: '300',
								transitionEasing: 'ease-in-out',
								changeTransition: 'slide',
								changeDistance: 26,
								changeDuration: 520,
								changeEasing: 'drafts',
								showArrows: true,
								arrowIconPrev: 'chevron-left',
								arrowIconNext: 'chevron-right',
								showDots: true,
								autoplay: true,
								autoplaySpeed: 5000,
								pauseButton: false,
								dragToScroll: false,
								slidePeek: {},
								slideGap: {},
								slideBleed: {},
								slidesVisible: { desktop: 3 },
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Default card style', 'sgs-blocks' ) }
							hasValue={ () => !! cardStyle }
							onDeselect={ () =>
								setAttributes( { cardStyle: '' } )
							}
							isShownByDefault
						>
							<SelectControl
								label={ __(
									'Default card style',
									'sgs-blocks'
								) }
								help={ __(
									'Sets the layout variant every card in this slider uses unless it picks its own. Leave as "Per-card" to let each testimonial choose independently.',
									'sgs-blocks'
								) }
								value={ cardStyle }
								options={ STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { cardStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __(
								'Transition duration (ms)',
								'sgs-blocks'
							) }
							hasValue={ () => transitionDuration !== '300' }
							onDeselect={ () =>
								setAttributes( { transitionDuration: '300' } )
							}
						>
							<TextControl
								label={ __(
									'Transition duration (ms)',
									'sgs-blocks'
								) }
								value={ transitionDuration }
								onChange={ ( val ) =>
									setAttributes( { transitionDuration: val } )
								}
								help={ __(
									'Duration of arrow and dot hover transitions in milliseconds. Default: 300.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Change animation', 'sgs-blocks' ) }
							hasValue={ () =>
								changeTransition !== 'slide' ||
								changeDistance !== 26 ||
								changeDuration !== 520 ||
								changeEasing !== 'drafts'
							}
							onDeselect={ () =>
								setAttributes( {
									changeTransition: 'slide',
									changeDistance: 26,
									changeDuration: 520,
									changeEasing: 'drafts',
								} )
							}
						>
							<ToggleGroupControl
								label={ __( 'Change animation', 'sgs-blocks' ) }
								help={ __(
									'Slide moves the track across. Fade up jumps the track and fades the new cards in while they move in from the side.',
									'sgs-blocks'
								) }
								value={ changeTransition }
								onChange={ ( val ) =>
									setAttributes( { changeTransition: val } )
								}
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								<ToggleGroupControlOption
									value="slide"
									label={ __( 'Slide', 'sgs-blocks' ) }
								/>
								<ToggleGroupControlOption
									value="fade-up"
									label={ __( 'Fade up', 'sgs-blocks' ) }
								/>
							</ToggleGroupControl>
							{ changeTransition === 'fade-up' && (
								<>
									<RangeControl
										label={ __( 'Change distance (px)', 'sgs-blocks' ) }
										value={ changeDistance }
										onChange={ ( val ) =>
											setAttributes( { changeDistance: val ?? 26 } )
										}
										min={ -200 }
										max={ 200 }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<RangeControl
										label={ __( 'Change duration (ms)', 'sgs-blocks' ) }
										value={ changeDuration }
										onChange={ ( val ) =>
											setAttributes( { changeDuration: val ?? 520 } )
										}
										min={ 0 }
										max={ 2000 }
										step={ 20 }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
									<SelectControl
										label={ __( 'Change easing', 'sgs-blocks' ) }
										value={ changeEasing }
										options={ [
											{ label: __( 'Smooth settle', 'sgs-blocks' ), value: 'drafts' },
											{ label: __( 'Emphasised', 'sgs-blocks' ), value: 'emphasised' },
											{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
											{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
											{ label: __( 'Quart out', 'sgs-blocks' ), value: 'quart-out' },
											{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
											{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
										] }
										onChange={ ( val ) =>
											setAttributes( { changeEasing: val } )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</>
							) }
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Transition easing', 'sgs-blocks' ) }
							hasValue={ () =>
								transitionEasing !== 'ease-in-out'
							}
							onDeselect={ () =>
								setAttributes( {
									transitionEasing: 'ease-in-out',
								} )
							}
						>
							<SelectControl
								label={ __(
									'Transition easing',
									'sgs-blocks'
								) }
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
											'Ease in–out',
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
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Slides visible', 'sgs-blocks' ) }
							hasValue={ () =>
								JSON.stringify( slidesVisible ) !==
								JSON.stringify( { desktop: 3 } )
							}
							onDeselect={ () =>
								setAttributes( { slidesVisible: { desktop: 3 } } )
							}
							isShownByDefault
						>
							<ResponsiveOverride
								label={ __( 'Slides visible', 'sgs-blocks' ) }
								value={ slidesVisible }
								onChange={ ( obj ) =>
									setAttributes( { slidesVisible: obj } )
								}
							>
								{ ( { tier, ownValue, effectiveValue, setOwnValue } ) => (
									<SelectControl
										label={ __( 'Slides visible', 'sgs-blocks' ) }
										hideLabelFromVision
										value={
											'' !== ownValue
												? ownValue
												: effectiveValue || ( 'mobile' === tier ? 1 : 3 )
										}
										options={ SLIDES_VISIBLE_OPTIONS }
										onChange={ ( val ) =>
											setOwnValue( parseInt( val, 10 ) )
										}
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Peek of the next slide', 'sgs-blocks' ) }
							hasValue={ () =>
								!! slidePeek && Object.keys( slidePeek ).length > 0
							}
							onDeselect={ () => setAttributes( { slidePeek: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Peek of the next slide', 'sgs-blocks' ) }
								scale="spacing"
								help={ __( 'How much of the next card shows at the edge, e.g. 48px. Empty shows none.', 'sgs-blocks' ) }
								value={ slidePeek }
								onChange={ ( obj ) => setAttributes( { slidePeek: obj } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Space between slides', 'sgs-blocks' ) }
							hasValue={ () =>
								!! slideGap && Object.keys( slideGap ).length > 0
							}
							onDeselect={ () => setAttributes( { slideGap: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Space between slides', 'sgs-blocks' ) }
								scale="spacing"
								help={ __( 'The gap between the cards, e.g. 20px. Empty uses the theme spacing.', 'sgs-blocks' ) }
								value={ slideGap }
								onChange={ ( obj ) => setAttributes( { slideGap: obj } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Room for tilts and shadows', 'sgs-blocks' ) }
							hasValue={ () =>
								!! slideBleed && Object.keys( slideBleed ).length > 0
							}
							onDeselect={ () => setAttributes( { slideBleed: {} } ) }
						>
							<ResponsiveLengthControl
								label={ __( 'Room for tilts and shadows', 'sgs-blocks' ) }
								scale="spacing"
								help={ __( 'Space around the cards inside the slider so a tilt, a hover lift or a shadow is not cut off, e.g. 16px. Empty adds none.', 'sgs-blocks' ) }
								value={ slideBleed }
								onChange={ ( obj ) => setAttributes( { slideBleed: obj } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show arrows', 'sgs-blocks' ) }
							hasValue={ () => showArrows !== true }
							onDeselect={ () =>
								setAttributes( { showArrows: true } )
							}
						>
							<ToggleControl
								label={ __( 'Show arrows', 'sgs-blocks' ) }
								checked={ showArrows }
								onChange={ ( val ) =>
									setAttributes( { showArrows: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Previous arrow icon', 'sgs-blocks' ) }
							hasValue={ () =>
								'chevron-left' !== ( arrowIconPrev || 'chevron-left' )
							}
							onDeselect={ () =>
								setAttributes( { arrowIconPrev: 'chevron-left' } )
							}
						>
							<IconPicker
								label={ __( 'Previous arrow icon', 'sgs-blocks' ) }
								value={ {
									source: 'lucide',
									name: arrowIconPrev || 'chevron-left',
								} }
								onChange={ ( { name } ) =>
									setAttributes( { arrowIconPrev: name } )
								}
								sources={ [ 'lucide' ] }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Next arrow icon', 'sgs-blocks' ) }
							hasValue={ () =>
								'chevron-right' !== ( arrowIconNext || 'chevron-right' )
							}
							onDeselect={ () =>
								setAttributes( { arrowIconNext: 'chevron-right' } )
							}
						>
							<IconPicker
								label={ __( 'Next arrow icon', 'sgs-blocks' ) }
								value={ {
									source: 'lucide',
									name: arrowIconNext || 'chevron-right',
								} }
								onChange={ ( { name } ) =>
									setAttributes( { arrowIconNext: name } )
								}
								sources={ [ 'lucide' ] }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Show dots', 'sgs-blocks' ) }
							hasValue={ () => showDots !== true }
							onDeselect={ () =>
								setAttributes( { showDots: true } )
							}
						>
							<ToggleControl
								label={ __( 'Show dots', 'sgs-blocks' ) }
								checked={ showDots }
								onChange={ ( val ) =>
									setAttributes( { showDots: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () =>
								autoplay !== true ||
								autoplaySpeed !== 5000 ||
								!! pauseButton
							}
							onDeselect={ () =>
								setAttributes( {
									autoplay: true,
									autoplaySpeed: 5000,
									pauseButton: false,
								} )
							}
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								checked={ autoplay }
								onChange={ ( val ) =>
									setAttributes( { autoplay: val } )
								}
								__nextHasNoMarginBottom
							/>
							{ autoplay && (
								<RangeControl
									label={ __(
										'Autoplay speed (ms)',
										'sgs-blocks'
									) }
									value={ autoplaySpeed }
									onChange={ ( val ) =>
										setAttributes( { autoplaySpeed: val } )
									}
									min={ 2000 }
									max={ 10000 }
									step={ 500 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
							{ autoplay && (
								<ToggleControl
									label={ __( 'Show pause button', 'sgs-blocks' ) }
									help={ __(
										'Adds a pause/play button. Needed for WCAG 2.2.2 on sites that must meet it, such as public-sector clients.',
										'sgs-blocks'
									) }
									checked={ !! pauseButton }
									onChange={ ( val ) =>
										setAttributes( { pauseButton: val } )
									}
									__nextHasNoMarginBottom
								/>
							) }
						</ToolsPanelItem>
						{ /*
						 * Drag momentum (Spec 38 FR-38-13). This slider always
						 * supports click-and-drag (its own view.js) — this
						 * toggle upgrades the RELEASE feel with real momentum
						 * via GSAP's InertiaPlugin, it does not add dragging
						 * that wasn't there before.
						 *
						 * Wired to this block's OWN behaviour, NOT the shared
						 * Tier G draggable roster: that roster's runtime only
						 * attaches to native `overflow-x` scrollers and could
						 * never do anything on this transform-driven track.
						 */ }
						<ToolsPanelItem
							label={ __( 'Drag momentum', 'sgs-blocks' ) }
							hasValue={ () => dragToScroll !== false }
							onDeselect={ () =>
								setAttributes( { dragToScroll: false } )
							}
						>
							<ToggleControl
								label={ __( 'Drag momentum', 'sgs-blocks' ) }
								checked={ dragToScroll }
								onChange={ ( val ) =>
									setAttributes( { dragToScroll: val } )
								}
								help={ __(
									'A fast flick advances the slide with a real momentum feel instead of always needing the same drag distance.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					</ToolsPanel>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ (() => {
						const sliderContrastAgainst =
							backgroundColour && ! backgroundColourGradient
								? backgroundColour
								: '';
						return (
							<SgsBorderControl
								widthValues={ attributes.borderWidth ?? {} }
								onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
								widthPresets={ [ '10', '20', '30' ] }
								styleValue={ attributes.borderStyle }
								onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
								colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
								colourValue={ attributes.borderColour }
								onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
								colourGradientValue={ attributes.borderColourGradient }
								onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
								colourLinked={ true }
								contrastAgainst={ sliderContrastAgainst }
								radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
								onRadiusChange={ ( tier, next ) => {
									const key = tier === 'base' ? 'desktop' : tier;
									setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
								} }
							/>
						);
					} )() }
				</PanelBody>
			</InspectorControls>
			{ /* ── Styles tab ─────────────────────────────────────────────
			   Typography — the shared TypographyControls
			   component + sgs_typography_css_rule() render.php helper.
			   Root prefix "" — the
			   quote text itself is child-owned by sgs/testimonial, but the
			   slider root scopes its own text-colour/typography styling. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextStroke showTextColumns showWritingMode
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
			</InspectorControls>
			{ /* showLayout={false}: the block owns its own slide structure (__stage > __track,
			     --sgs-slides-visible) and declares no container layout attributes. */ }
			<ContainerWrapperControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				kind="layout"
				showLayout={ false }
			/>

			<div { ...blockProps }>
				{ /*
				 * useInnerBlocksProps renders the .sgs-testimonial-slider__track
				 * directly with the InnerBlocks appender inside. Each sgs/testimonial
				 * child appears as a flex item in the track, matching the CSS that
				 * styles .sgs-testimonial-slider__slide. On the frontend, render.php
				 * wraps each inner block in .sgs-testimonial-slider__slide so view.js
				 * querySelectorAll finds them correctly.
				 */ }
				<BandWrap hasBandProps={ wrapperPreview.hasBandProps } bandStyle={ wrapperPreview.bandStyle }>
					<div { ...innerBlocksProps } />
				</BandWrap>
			</div>
		</>
	);
}
