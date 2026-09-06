import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	Button,
} from '@wordpress/components';

// D649 — no JSON `enum` reliance in the UI list order; mirrors sgs/icon-list's
// allow-list exactly (render.php validates the same set independently).
const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Heading 5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'Heading 6', 'sgs-blocks' ), value: 'h6' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Scale', 'sgs-blocks' ), value: 'scale' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];
import { IconPicker, IconPreview, ResponsiveBoxControl, fillRow, SgsBorderControl, DesignTokenPicker, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';

const CONNECTOR_OPTIONS = [
	{ label: __( 'Line', 'sgs-blocks' ), value: 'line' },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Dots', 'sgs-blocks' ), value: 'dots' },
];

const NUMBER_STYLE_OPTIONS = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

// Box-object interface contract §1/§5: build an editor-preview shorthand from
// a box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

function StepEditor( { step, index, onChange, onRemove } ) {
	const update = ( key, value ) => {
		onChange( { ...step, [ key ]: value } );
	};

	return (
		<div
			style={ {
				padding: '12px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				marginBottom: '12px',
			} }
		>
			<TextControl
				label={ __( 'Step number / label', 'sgs-blocks' ) }
				value={ step.number || '' }
				onChange={ ( val ) => update( 'number', val ) }
				placeholder={ String( index + 1 ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Title', 'sgs-blocks' ) }
				value={ step.title || '' }
				onChange={ ( val ) => update( 'title', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextareaControl
				label={ __( 'Description', 'sgs-blocks' ) }
				value={ step.description || '' }
				onChange={ ( val ) => update( 'description', val ) }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
			<IconPicker
				label={ __( 'Icon (optional)', 'sgs-blocks' ) }
				value={ { source: 'lucide', name: step.icon || '' } }
				onChange={ ( { name } ) => update( 'icon', name ) }
				sources={ [ 'lucide' ] }
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove step', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const { padding, margin,
		steps,
		headingLevel,
		connectorStyle,
		numberStyle,
		numberColour,
		numberColourHover,
		numberColourHoverGradient,
		numberBackground,
		titleColour,
		titleColourGradient,
		titleColourHover,
		descriptionColour,
		descriptionColourGradient,
		descriptionColourHover,
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColourHover,
		textColourHoverGradient,
		borderColourHover,
		borderColourHoverGradient,
		effectHover,
		transitionDuration,
		transitionEasing,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
	} = attributes;

	const className = [
		'sgs-process-steps',
		`sgs-process-steps--connector-${ connectorStyle }`,
		`sgs-process-steps--number-${ numberStyle }`,
		effectHover && effectHover !== 'none' ? `sgs-process-steps--hover-${ effectHover }` : '',
	].filter( Boolean ).join( ' ' );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the process-steps wrapper's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const processStepsContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// Box-object interface contract §5: editor-canvas preview of the base
	// (desktop) box families, mirroring render.php's scoped output so the
	// canvas matches the frontend. Tablet/mobile tiers are @media-scoped and
	// intentionally not previewed on the desktop canvas.
	const wrapperPreviewStyle = {};
	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderWidthPreview ) {
		wrapperPreviewStyle.borderWidth = borderWidthPreview;
		if ( borderStyle && 'none' !== borderStyle ) {
			wrapperPreviewStyle.borderStyle = borderStyle;
		}
		if ( borderColour ) {
			wrapperPreviewStyle.borderColor = colourVar( borderColour ) || undefined;
		}
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			wrapperPreviewStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}
	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperPreviewStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperPreviewStyle.margin = marginPreview;
	}
	const borderRadiusPreview = boxShorthand( attributes.borderRadius?.desktop, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) {
		wrapperPreviewStyle.borderRadius = borderRadiusPreview;
	}

	// Wrapper text colour/gradient — CHECK A finding: textColour/textColourGradient
	// are written by the "Text & fill" panel below and consumed by render.php
	// (sgs_resolve_text_colour_or_gradient()/sgs_text_colour_decl() on $root_sel),
	// but nothing applied them to the canvas. Mirrors the existing
	// titleStyle/descStyle pattern immediately below using the SAME
	// `resolveTextColourPreviewStyle()` + `colourVar` combination already
	// established in this file, rather than introducing the palette-based
	// `textPaintPreview()` sibling used elsewhere — one resolver convention
	// per file.
	const wrapperTextStyle = resolveTextColourPreviewStyle( textColour, textColourGradient, colourVar );

	const blockProps = useBlockProps( {
		className,
		style: {
			...wrapperPreviewStyle,
			...wrapperTextStyle,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	const numStyle = {
		color: colourVar( numberColour ) || undefined,
		backgroundColor: colourVar( numberBackground ) || undefined,
	};

	const titleStyle = resolveTextColourPreviewStyle( titleColour, titleColourGradient, colourVar );

	const descStyle = resolveTextColourPreviewStyle( descriptionColour, descriptionColourGradient, colourVar );

	// D649 — heading level is an identity control (document-outline
	// placement), not a style control; mirrors render.php's own fallback.
	const HeadingTag = headingLevel || 'h3';

	// Wrapper normal text/background colour is the flat backgroundColour/
	// textColour attrs (block.json attrMap: "css:color":"textColour",
	// "css:background-color":"backgroundColour"). Moved off native
	// `style.color.{text,background}` 2026-08-16 — that path required
	// `supports.color.background`/`.text` to stay `true` for the
	// element-manifest checker's BASE resolution on this element's declared
	// `states.hover` to keep resolving (native attrMap only resolves when
	// the matching `supports` flag is `true`); the flat-attr form resolves
	// regardless, which is what let `supports.color.background`/`.text` flip
	// to `false` and the native Text/Background panel stop rendering.

	const updateStep = ( index, updated ) => {
		const newSteps = [ ...steps ];
		newSteps[ index ] = updated;
		setAttributes( { steps: newSteps } );
	};

	const removeStep = ( index ) => {
		setAttributes( {
			steps: steps.filter( ( _, i ) => i !== index ),
		} );
	};

	const addStep = () => {
		setAttributes( {
			steps: [
				...steps,
				{
					number: String( steps.length + 1 ),
					title: '',
					description: '',
					icon: '',
				},
			],
		} );
	};

	return (
		<>
			{ /* D609/D618/D619 — ONE grouped, SGS-owned colour panel, mounted FIRST.
			   Replaces the scattered "Text Styling" + "Hover States" colour
			   DesignTokenPickers below. GROUND-TRUTH (render.php + block.json
			   attrMap, this session): number/title/description are single-state
			   (no hover pair declared anywhere); background/text pair the
			   wrapper's native style.color.{text,background} (normal) with the
			   custom *Hover scalar attrs; border pairs borderColour (normal)
			   with borderColourHover. All colours are BLOCK-LEVEL (uniform
			   across every repeated step) — verified: numberColour/
			   numberBackground/titleColour/descriptionColour are flat block
			   attributes read once and applied via numStyle/titleStyle/
			   descStyle to every step in the steps.map() below, not per-item
			   fields on the `step` object (StepEditor's own fields are number/
			   title/description/icon only — no colour field). Every state sets
			   linked: true per D619. */ }
			{ /* Spec 35 THE PLACEMENT RULE (D537) — colour splits FOUR ways across
			   the declared elements rather than one mixed "Colour" panel:
			   number colour+background+hover -> "Step number badge"; title
			   colour -> "Step title" (paired with its headingLevel content
			   control below); description colour -> "Step description";
			   wrapper text+background+hover -> the wrapper's own TIER-2
			   Text & fill family panel (the wrapper is isWrapper:true, so it
			   resolves by property-family, not a per-element panel). Built
			   directly with DesignTokenPicker (mirrors what SgsColourPanel
			   does internally) since SgsColourPanel has no per-caller title
			   override and these four panels each need a different title. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Step number badge', 'sgs-blocks' ) } className="sgs-colour-panel">
					{ /* Moved in from the Settings-tab "Appearance" panel
					     (D622 — an element-scoped control belongs in its own
					     element's TIER 1 panel; "step number badge" is a
					     declared element whose attrMap claims numberStyle). */ }
					<SelectControl
						label={ __( 'Number style', 'sgs-blocks' ) }
						value={ numberStyle }
						options={ NUMBER_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { numberStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<DesignTokenPicker
						label={ __( 'Number colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: numberColour,
								onChange: ( val ) => setAttributes( { numberColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: numberColourHover,
								onChange: ( val ) => setAttributes( { numberColourHover: val ?? '' } ),
								linked: true,
								gradientValue: numberColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { numberColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					{ ( () => {
						const numberBackgroundRow = fillRow( {
							key: 'numberBackground',
							label: __( 'Number background colour', 'sgs-blocks' ),
							attrs: {
								base: 'numberBackground',
								hover: 'numberBackgroundHover',
								gradient: 'numberBackgroundGradient',
							},
							attributes,
							setAttributes,
						} );
						return (
							<DesignTokenPicker
								label={ numberBackgroundRow.label }
								states={ numberBackgroundRow.states }
							/>
						);
					} )() }
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Step title', 'sgs-blocks' ) } className="sgs-colour-panel">
					{ /* Moved in from the Settings-tab "Step title" panel
					     (D622 — an element-scoped control belongs in its own
					     element's TIER 1 panel). */ }
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel || 'h3' }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingLevel: val } )
						}
						help={ __(
							'Pick the level that fits your page outline — usually H3 under a page-level H2.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<DesignTokenPicker
						label={ __( 'Title colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
								gradientValue: titleColourGradient,
								onGradientChange: ( val ) => setAttributes( { titleColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: titleColourHover,
								onChange: ( val ) => setAttributes( { titleColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
					{ /* Typography — replaces the old WP-native supports.typography
					   (fontSize/lineHeight/fontWeight/fontStyle, plus letterSpacing/
					   textTransform/textAlign now dropped as honest gaps) with the
					   shared TypographyControls component + sgs_typography_css_rule()
					   render.php helper (D971/D972 full-replacement track). Prefix
					   "title" matches this element's own attrMap prefix — native
					   typography previously painted the step title via
					   `selectors.typography: ".sgs-process-steps__title"`, now removed. */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="title"
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<PanelBody title={ __( 'Step description', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Description colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: descriptionColour,
								onChange: ( val ) => setAttributes( { descriptionColour: val ?? '' } ),
								linked: true,
								gradientValue: descriptionColourGradient,
								onGradientChange: ( val ) => setAttributes( { descriptionColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: descriptionColourHover,
								onChange: ( val ) => setAttributes( { descriptionColourHover: val ?? '' } ),
								linked: true,
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* WRAPPER element (isWrapper:true) — TIER 2, property-family panel
			   (Text + Fill), not a per-element panel. Border/spacing (also
			   wrapper, Layout family) stay in the default Settings group
			   below, merged into ONE "Layout" panel per THE PLACEMENT RULE. */ }
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Text & fill', 'sgs-blocks' ) } className="sgs-colour-panel">
					<DesignTokenPicker
						label={ __( 'Wrapper text colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
					<DesignTokenPicker
						label={ __( 'Wrapper background colour', 'sgs-blocks' ) }
						states={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) => setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls>
				<PanelBody title={ __( 'Steps', 'sgs-blocks' ) }>
					{ steps.map( ( step, index ) => (
						<StepEditor
							key={ index }
							step={ step }
							index={ index }
							onChange={ ( updated ) =>
								updateStep( index, updated )
							}
							onRemove={ () => removeStep( index ) }
						/>
					) ) }
					<Button variant="secondary" onClick={ addStep }>
						{ __( 'Add step', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				<PanelBody
					title={ __( 'Appearance', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Connector style', 'sgs-blocks' ) }
						value={ connectorStyle }
						options={ CONNECTOR_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { connectorStyle: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Hover States', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
					<TextControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: val } )
						}
						help={ __(
							'Duration of all hover transitions in milliseconds. Default: 300.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
						onChange={ ( val ) =>
							setAttributes( { transitionEasing: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Layout panel (wrapper TIER-2 family) ── Border + spacing merged
				   into ONE panel per THE PLACEMENT RULE: both are `layout`-cluster
				   members on the `wrapper` element (block.json attrMap), so they
				   share the same property-family panel rather than two separate
				   catch-all panels. Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (skip-serialised → scoped,
				   matches sgs/heading + sgs/quote). */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
										{ /* Task 0 codemod (migrate-border-control.js) -- one composite row
					   (width/style/colour) mirroring native's BorderBoxControl layout,
					   matching sgs/product-card + sgs/quote. Border-radius is unchanged
					   (stays WP-native). */ }
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
								linked: true,
								gradientValue: borderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						] }
						contrastAgainst={ processStepsContrastAgainst }
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

				{ /* Padding/margin — same `layout` cluster on the wrapper element,
				   merged into this panel (was a separate "Spacing" panel). Each is a
				   single block-owned tier-object attr { desktop, tablet, mobile },
				   written via ResponsiveOverride + SgsBoxControl; read directly by
				   this block's render.php. */ }
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ steps.map( ( step, index ) => (
					<div key={ index } className="sgs-process-steps__step">
						{ step.icon && (
							<span
								className="sgs-process-steps__icon"
								aria-hidden="true"
								data-icon={ step.icon }
							>
								<IconPreview source="lucide" name={ step.icon } size={ 24 } />
							</span>
						) }
						{ numberStyle !== 'none' && (
							<span
								className="sgs-process-steps__number"
								style={ numStyle }
							>
								{ step.number || index + 1 }
							</span>
						) }
						<HeadingTag
							className="sgs-process-steps__title"
							style={ titleStyle }
						>
							{ step.title || __(
								'Step title',
								'sgs-blocks'
							) }
						</HeadingTag>
						{ step.description && (
							<p
								className="sgs-process-steps__description"
								style={ descStyle }
							>
								{ step.description }
							</p>
						) }
					</div>
				) ) }
			</div>
		</>
	);
}
