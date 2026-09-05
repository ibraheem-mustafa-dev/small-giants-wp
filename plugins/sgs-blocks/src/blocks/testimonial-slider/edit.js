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
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	ToggleControl,
	TextControl,
} from '@wordpress/components';
import { SgsColourPanel, fillRow, textRow,
	SgsBorderControl,
	TypographyControls,
	resolveColourToken,
} from '../../components';
import { colourVar } from '../../utils';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

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
		showDots,
		showArrows,
		slidesVisible,
		cardStyle,
		backgroundColour,
		backgroundColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		effectHover,
		transitionDuration,
		transitionEasing,
		dragToScroll,
	} = attributes;

	const className = [
		'sgs-testimonial-slider',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			'--sgs-transition-duration': transitionDuration
				? `${ transitionDuration }ms`
				: undefined,
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

	// D619/D609 — the wrapper's own colours pair a normal state with a hover
	// state per row (background/text), matching quote/heading. Border stays
	// hover-only — no border-colour base attr exists on this block.
	//
	// The normal state reads/writes flat `backgroundColour`/`textColour`
	// attrs (the same pattern quote/heading/card-grid/text already use), not
	// native `style.color.background`/`.text` — the element-manifest
	// checker's BASE resolution for this element's declared `states.hover`
	// only resolves an `attrMap` pointing at `native:color.*` when
	// `supports.color.*` is `true`, so `supports.color.background`/`.text`
	// stay `false` and the native Text/Background panel does not render.
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

				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Slider Settings" title with no
				   initialOpen, so the client saw the same words twice for
				   no collapse benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Slider Settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								cardStyle: '',
								transitionDuration: '300',
								transitionEasing: 'ease-in-out',
								slidesVisible: 3,
								showArrows: true,
								showDots: true,
								autoplay: true,
								autoplaySpeed: 5000,
								dragToScroll: false,
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
							label={ __(
								'Slides visible (desktop)',
								'sgs-blocks'
							) }
							hasValue={ () => slidesVisible !== 3 }
							onDeselect={ () =>
								setAttributes( { slidesVisible: 3 } )
							}
							isShownByDefault
						>
							<SelectControl
								label={ __(
									'Slides visible (desktop)',
									'sgs-blocks'
								) }
								value={ slidesVisible }
								options={ SLIDES_VISIBLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( {
										slidesVisible: parseInt( val, 10 ),
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
								autoplay !== true || autoplaySpeed !== 5000
							}
							onDeselect={ () =>
								setAttributes( {
									autoplay: true,
									autoplaySpeed: 5000,
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

				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Colours moved to the top-level SgsColourPanel (D609/D619)
					   — this panel now holds only the non-colour hover
					   behaviour (the transition shape). */ }
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ effectHover }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effectHover: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
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
			   Typography — replaces the old WP-native supports.typography
			   (fontSize/lineHeight only) with the shared TypographyControls
			   component + sgs_typography_css_rule() render.php helper
			   (D971/D972 full-replacement track). Root prefix "" — the
			   quote text itself is child-owned by sgs/testimonial, but the
			   slider root scopes its own text-colour/typography styling. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>
			</InspectorControls>
			{ /* showLayout={false}: this block builds its OWN internal structure
			     (__stage > __track, slide count driven by --sgs-slides-visible), so a
			     container layout control would be a SECOND owner of one behaviour.
			     History: the block used to declare its own `layout` attr with an
			     enum of full|split, colliding with the container vocabulary the
			     shared control writes (stack/flex/grid). Every such write was
			     accepted in the editor, stored, then SILENTLY reverted by WordPress
			     enum coercion — and the CONVERTER hit the same collision on a path
			     this workaround never covered, emitting layout:"grid" and collapsing
			     a cloned slider to zero width. The attr (and the redundant split
			     shell, which a container composes better) was removed 2026-08-25;
			     hiding the control is now a statement about ownership, not a
			     workaround for a name clash. Same collision family as sgs/gallery. */ }
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
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
