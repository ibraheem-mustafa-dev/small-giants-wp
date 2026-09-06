import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveBoxControl, SgsColourPanel, SgsLengthControl } from '../../components';
import {
	colourVar,
	SGS_LENGTH_UNITS,
	sgsNormaliseLength,
	sgsHasLength,
	sgsLengthPreview,
	resolveTextColourPreviewStyle,
} from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

const FONT_STYLE_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

const FONT_WEIGHT_OPTIONS = [
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
];

const LETTER_SPACING_UNITS = [
	{ value: 'em', label: 'em', default: 0.08 },
	{ value: 'rem', label: 'rem', default: 0.08 },
	{ value: 'px', label: 'px', default: 1 },
];

const LINE_HEIGHT_UNITS = [
	{ value: '', label: '—', default: 1.2 },
	{ value: 'em', label: 'em', default: 1.2 },
	{ value: 'rem', label: 'rem', default: 1.2 },
	{ value: 'px', label: 'px', default: 18 },
];

/**
 * Build the fontSize reset value for the font-size responsive family owned by
 * <TypographyControls>. fontSize is an OBJECT-typed {desktop,tablet,mobile}
 * attr (Spec 35 tier-object migration) — resetting a Tablet/Mobile sibling
 * individually would silently no-op (WP discards a write to an undeclared
 * attr), so the WHOLE object resets to the block's own default
 * (block.json: `{"desktop":12}`) instead.
 */
function resetFontSizeResponsive() {
	return {
		fontSize: { desktop: 12 },
	};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'em' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'em' };
	}
	const match = str.match( /^([\d.+-][\d.]*)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] !== undefined ? match[ 2 ] : ( currentUnit || 'em' );
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'em' };
}

/**
 * Build the box-family editor-canvas preview shorthand — mirrors render.php's
 * hand-built box shorthand so the canvas matches the frontend (contract §5).
 */
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const { top, right, bottom, left } = box;
	if ( ! top && ! right && ! bottom && ! left ) return undefined;
	return [ top, right, bottom, left ].map( ( v ) => v || '0' ).join( ' ' );
}

/**
 * Build the editor-canvas preview style object for the label element.
 * This is editor-only convenience (mirrors sgs/heading) — the frontend
 * render.php emits every declaration into a scoped `.{uid}` <style> tag,
 * never inline (contract §A).
 */
function buildStyle( attributes ) {
	const {
		textColour,
		textColourGradient,
		backgroundColour,
		backgroundColourGradient,
		fontFamily,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		textDecoration,
		fontStyle,
		textAlign,
		padding,
		borderRadius,
		fullWidth,
		className,
		style,
	} = attributes;

	const marginPreview = boxShorthand( style?.spacing?.margin );
	// padding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
	// box-tier migration) — the canvas preview always shows the desktop tier.
	const paddingPreview = boxShorthand( padding?.desktop );

	// fontSize is OBJECT-typed {desktop,tablet,mobile} (Spec 35 tier-object
	// migration) — the canvas preview always shows the desktop tier.
	const fontSizeDesktop =
		fontSize && 'object' === typeof fontSize && ! Array.isArray( fontSize )
			? fontSize.desktop
			: fontSize;

	const previewStyle = {
		...resolveTextColourPreviewStyle( textColour, textColourGradient, colourVar ),
		fontFamily: fontFamily || undefined,
		fontSize: fontSizeDesktop ? `${ fontSizeDesktop }${ fontSizeUnit }` : undefined,
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeight ? `${ lineHeight }${ lineHeightUnit }` : undefined,
		letterSpacing: ( letterSpacing !== null && letterSpacing !== undefined )
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		textDecoration: textDecoration || undefined,
		fontStyle: fontStyle || undefined,
		textAlign: textAlign || undefined,
		margin: marginPreview,
	};

	// Box (padding / background / radius) paints on VALUE-PRESENCE — mirrors
	// render.php's ungated helper (no pill gate).
	previewStyle.padding = paddingPreview;
	previewStyle.backgroundColor = colourVar( backgroundColour ) || undefined;
	// Gradient sibling preview (colour-conformance FILL closeout, 2026-09-06) —
	// mirrors render.php's sgs_background_paint_decl() gradient-wins-when-set.
	if ( backgroundColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( backgroundColourGradient ) ) {
		previewStyle.backgroundImage = backgroundColourGradient;
	}
	// borderRadius is a CSS-length STRING (2026-08-13). The old check used
	// `Number( borderRadius ) !== 0`, which is NaN for '1.5rem' — and the old
	// preview appended 'px' unconditionally, so '1.5rem' painted as '1.5rempx'
	// and silently did nothing. Both now go through the shared helpers so the
	// canvas matches render.php exactly, legacy bare numbers included.
	const hasRadius = sgsHasLength( borderRadius );
	previewStyle.borderRadius = sgsLengthPreview( borderRadius );

	// Display model — mirrors render.php. When an is-style-* variant class owns
	// display, emit none (the variant CSS decides). Otherwise: fullWidth →
	// block+100%, a boxed label → inline-block, a bare eyebrow → block.
	const hasStyleVariant = typeof className === 'string' &&
		className.includes( 'is-style-' );
	if ( ! hasStyleVariant ) {
		const boxPresent = !! paddingPreview || !! backgroundColour || hasRadius;
		if ( fullWidth ) {
			previewStyle.display = 'block';
			previewStyle.width = '100%';
		} else if ( boxPresent ) {
			previewStyle.display = 'inline-block';
		} else {
			previewStyle.display = 'block';
		}
	}

	// Remove undefined values so the DOM stays clean.
	return Object.fromEntries(
		Object.entries( previewStyle ).filter( ( [ , v ] ) => v !== undefined )
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		text,
		style,
		textColour,
		textColourGradient,
		backgroundColour,
		backgroundColourGradient,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		textDecoration,
		fontStyle,
		textAlign,
		// padding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
		// box-tier migration) — the paddingTablet/paddingMobile sibling attrs no
		// longer exist in this block's schema.
		padding,
		marginTablet,
		marginMobile,
		borderRadius,
		fullWidth,
	} = attributes;

	const blockProps = useBlockProps( {
		style: buildStyle( attributes ),
	} );

	return (
		<>
			{ /* D609/D618 — ONE grouped, SGS-OWNED colour panel, rendered FIRST.
			   Replaces the inline DesignTokenPicker rows that used to live in
			   the "Colour" panel below. Neither attr has a hover pair, so both
			   render as single-state rows. Links to the theme palette (D619). */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToolsPanel
						className="sgs-nested-tools-panel"
						label={ __( 'Typography', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								...resetFontSizeResponsive(),
								fontWeight: '600',
								textTransform: 'uppercase',
								lineHeight: 1.2,
								lineHeightUnit: 'em',
								letterSpacing: 0.08,
								letterSpacingUnit: 'em',
								textDecoration: '',
								fontStyle: '',
								textAlign: '',
							} )
						}
					>
						{ /*
						 * Font size (responsive: desktop/tablet/mobile) via TypographyControls.
						 * Handles: fontSize/fontSizeUnit/fontSizeTablet/fontSizeMobile
						 * showWeight=false because label uses its own weight SelectControl below
						 * (fontWeight options are a restricted subset, not the full weight set).
						 * showLineHeight=false / showStyle=false because those use UnitControl below.
						 */ }
						<ToolsPanelItem
							label={ __( 'Font size', 'sgs-blocks' ) }
							hasValue={ () => {
								// fontSize is OBJECT-typed {desktop,tablet,mobile}; compare
								// against the whole default shape, not a bare number.
								const fsObj = fontSize && 'object' === typeof fontSize ? fontSize : {};
								return (
									fsObj.desktop !== 12 ||
									!! fsObj.tablet ||
									!! fsObj.mobile
								);
							} }
							onDeselect={ () =>
								setAttributes( {
									...resetFontSizeResponsive(),
								} )
							}
							isShownByDefault
						>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix=""
								showSize={ true }
								showWeight={ false }
								showStyle={ false }
								showLineHeight={ false }
								showDecoration={ true }
								showResponsive={ true }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Font weight', 'sgs-blocks' ) }
							hasValue={ () => fontWeight !== '600' }
							onDeselect={ () => setAttributes( { fontWeight: '600' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Font weight', 'sgs-blocks' ) }
								value={ fontWeight }
								options={ FONT_WEIGHT_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { fontWeight: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Text transform', 'sgs-blocks' ) }
							hasValue={ () => textTransform !== 'uppercase' }
							onDeselect={ () => setAttributes( { textTransform: 'uppercase' } ) }
						>
							<SelectControl
								label={ __( 'Text transform', 'sgs-blocks' ) }
								value={ textTransform }
								options={ TEXT_TRANSFORM_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { textTransform: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>

						{ /* Line height — UnitControl (number + unit in one input) */ }
						<ToolsPanelItem
							label={ __( 'Line height', 'sgs-blocks' ) }
							hasValue={ () => lineHeight !== 1.2 || lineHeightUnit !== 'em' }
							onDeselect={ () =>
								setAttributes( { lineHeight: 1.2, lineHeightUnit: 'em' } )
							}
						>
							{ /* SgsLengthControl adoption (Gate B, presets={false}) — split-scalar
							   case (composeUnit builds a display string from two separate
							   attrs, lineHeight+lineHeightUnit; parseUnit splits the raw
							   string back on change). Safe: SgsLengthControl's presets=false
							   branch forwards the raw UnitControl string unchanged to
							   onChange, so this caller's own split-and-setAttributes logic
							   is untouched — see Branch 2 report. */ }
							<SgsLengthControl
								label={ __( 'Line height', 'sgs-blocks' ) }
								value={ composeUnit( lineHeight, lineHeightUnit ) }
								units={ LINE_HEIGHT_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, lineHeightUnit !== undefined ? lineHeightUnit : '' );
									setAttributes( { lineHeight: num, lineHeightUnit: unit } );
								} }
								presets={ false }
							/>
						</ToolsPanelItem>

						{ /* Letter spacing — UnitControl (number + unit in one input) */ }
						<ToolsPanelItem
							label={ __( 'Letter spacing', 'sgs-blocks' ) }
							hasValue={ () =>
								letterSpacing !== 0.08 || letterSpacingUnit !== 'em'
							}
							onDeselect={ () =>
								setAttributes( { letterSpacing: 0.08, letterSpacingUnit: 'em' } )
							}
						>
							{ /* SgsLengthControl adoption (Gate B, presets={false}) — same
							   split-scalar shape as Line height above (composeUnit/parseUnit),
							   safe passthrough, see Branch 2 report. */ }
							<SgsLengthControl
								label={ __( 'Letter spacing', 'sgs-blocks' ) }
								value={ composeUnit( letterSpacing, letterSpacingUnit ) }
								units={ LETTER_SPACING_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, letterSpacingUnit || 'em' );
									setAttributes( { letterSpacing: num, letterSpacingUnit: unit } );
								} }
								presets={ false }
							/>
						</ToolsPanelItem>

						{ /* Text decoration now lives inside the TypographyControls mount
						   above (showDecoration) — a restricted 4-value dropdown matching
						   the shared sgs_typography_css_rule() helper's allowlist, not the
						   previous free-text control (D971/D972 full-replacement track). */ }
						<ToolsPanelItem
							label={ __( 'Font style', 'sgs-blocks' ) }
							hasValue={ () => !! fontStyle }
							onDeselect={ () => setAttributes( { fontStyle: '' } ) }
						>
							<SelectControl
								label={ __( 'Font style', 'sgs-blocks' ) }
								value={ fontStyle }
								options={ FONT_STYLE_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { fontStyle: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Text align', 'sgs-blocks' ) }
							hasValue={ () => !! textAlign }
							onDeselect={ () => setAttributes( { textAlign: '' } ) }
						>
							<SelectControl
								label={ __( 'Text align', 'sgs-blocks' ) }
								value={ textAlign }
								options={ TEXT_ALIGN_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( { textAlign: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
			</InspectorControls>

			{ /* ── Settings tab (structural — no CSS property) ─────────────── */ }
			<InspectorControls>
				<PanelBody
					title={ __( 'Box', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Stretch to full width', 'sgs-blocks' ) }
						help={ __(
							'Make the label span the full width of its container (block, 100% wide) instead of hugging its text.',
							'sgs-blocks'
						) }
						checked={ !! fullWidth }
						onChange={ ( val ) =>
							setAttributes( { fullWidth: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ /* UnitControl, not a raw-px RangeControl (contract §4.3) —
					     the operator picks the unit. Stored as a CSS-length
					     STRING; a legacy bare number is treated as px by both
					     render.php and the canvas preview. */ }
					{ /* SgsLengthControl adoption (Gate B, presets={false}). */ }
					<SgsLengthControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						value={ borderRadius ?? '' }
						units={ SGS_LENGTH_UNITS }
						onChange={ ( val ) =>
							setAttributes( {
								borderRadius: sgsNormaliseLength( val ),
							} )
						}
						presets={ false }
					/>
					{ /* padding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
					     (Spec 35 box-tier migration) — ONE attr; each tier holds the
					     4-side box, unchanged in shape from the old sibling attrs. */ }
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: padding?.desktop ?? {},
							tablet: padding?.tablet ?? {},
							mobile: padding?.mobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const tierKey = {
								base: 'desktop',
								tablet: 'tablet',
								mobile: 'mobile',
							}[ tier ];
							setAttributes( {
								padding: { ...padding, [ tierKey ]: next },
							} );
						} }
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
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

			<RichText
				{ ...blockProps }
				tagName="span"
				value={ text }
				onChange={ ( val ) => setAttributes( { text: val } ) }
				placeholder={ __(
					'Label text…',
					'sgs-blocks'
				) }
				allowedFormats={ [] }
			/>
		</>
	);
}
