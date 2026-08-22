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
import { IconPicker, IconPreview, ResponsiveBoxControl, ResponsiveBorderRadiusControl, SgsColourPanel } from '../../components';
import { colourVar } from '../../utils';

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

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
	{ label: __( 'Groove', 'sgs-blocks' ), value: 'groove' },
	{ label: __( 'Ridge', 'sgs-blocks' ), value: 'ridge' },
	{ label: __( 'Inset', 'sgs-blocks' ), value: 'inset' },
	{ label: __( 'Outset', 'sgs-blocks' ), value: 'outset' },
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
	const {
		style,
		steps,
		headingLevel,
		connectorStyle,
		numberStyle,
		numberColour,
		numberBackground,
		titleColour,
		descriptionColour,
		backgroundColour,
		textColour,
		backgroundColourHover,
		textColourHover,
		borderColourHover,
		borderColourHoverGradient,
		effectHover,
		transitionDuration,
		transitionEasing,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

	const className = [
		'sgs-process-steps',
		`sgs-process-steps--connector-${ connectorStyle }`,
		`sgs-process-steps--number-${ numberStyle }`,
		effectHover && effectHover !== 'none' ? `sgs-process-steps--hover-${ effectHover }` : '',
	].filter( Boolean ).join( ' ' );

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
	}
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperPreviewStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperPreviewStyle.margin = marginPreview;
	}
	const borderRadiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) {
		wrapperPreviewStyle.borderRadius = borderRadiusPreview;
	}

	const blockProps = useBlockProps( {
		className,
		style: {
			...wrapperPreviewStyle,
			'--sgs-transition-duration': transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing': transitionEasing || undefined,
		},
	} );

	const numStyle = {
		color: colourVar( numberColour ) || undefined,
		backgroundColor: colourVar( numberBackground ) || undefined,
	};

	const titleStyle = {
		color: colourVar( titleColour ) || undefined,
	};

	const descStyle = {
		color: colourVar( descriptionColour ) || undefined,
	};

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
			<SgsColourPanel
				rows={ [
					{
						key: 'number',
						label: __( 'Number colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: numberColour,
								onChange: ( val ) => setAttributes( { numberColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'numberBackground',
						label: __( 'Number background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: numberBackground,
								onChange: ( val ) => setAttributes( { numberBackground: val ?? '' } ),
								gradientValue: attributes.numberBackgroundGradient,
								onGradientChange: ( val ) => setAttributes( { numberBackgroundGradient: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: numberBackgroundHover,
								onChange: ( val ) => setAttributes( { numberBackgroundHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'title',
						label: __( 'Title colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: titleColour,
								onChange: ( val ) => setAttributes( { titleColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'description',
						label: __( 'Description colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: descriptionColour,
								onChange: ( val ) => setAttributes( { descriptionColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'wrapperText',
						label: __( 'Wrapper text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'wrapperBackground',
						label: __( 'Wrapper background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'border',
						label: __( 'Border colour', 'sgs-blocks' ),
						states: [
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
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Process Steps Settings', 'sgs-blocks' ) }>
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
				</PanelBody>
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

				{ /* ── Border panel ── Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (skip-serialised → scoped,
				   matches sgs/heading + sgs/quote). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Border style', 'sgs-blocks' ) }
						value={ borderStyle }
						options={ BORDER_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ResponsiveBoxControl
						label={ __( 'Border width', 'sgs-blocks' ) }
						values={ { base: borderWidth ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
					/>
					<ResponsiveBorderRadiusControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						values={ { base: style?.border?.radius ?? {} } }
						showResponsive={ false }
						onChange={ ( tier, next ) => setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } ) }
					/>
				</PanelBody>

				{ /* ── Spacing panel ── Box-object interface contract §B/§E: padding/
				   margin base routes to WP-native style.spacing.* (skip-serialised →
				   scoped); tiers are the paddingTablet/paddingMobile + marginTablet/
				   marginMobile object attrs. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: style?.spacing?.margin ?? {},
							tablet: marginTablet ?? {},
							mobile: marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
							} else {
								setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
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
