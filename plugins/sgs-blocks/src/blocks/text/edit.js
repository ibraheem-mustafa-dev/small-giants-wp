/**
 * edit.js — Block editor component for sgs/text.
 *
 * Provides a RichText editing surface with InspectorControls panels for:
 * - Tag selection
 * - Colour (text)
 * - Typography (font size responsive, weight, line height, letter spacing,
 *   font style, text decoration, text transform, font family)
 * - Spacing (4-side margin + padding, per viewport)
 * - Layout (text align, max width)
 * - Drop cap toggle + first-letter overrides
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	InspectorAdvancedControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveControl, ResponsiveBoxControl, SgsColourPanel, SgsLengthControl, SgsBorderControl, DesignTokenPicker, GradientCapableColourControl, ShadowControl, shadowAttrKeys, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { colourVar, fontSizeVar, resolveTextColourPreviewStyle } from '../../utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FONT_WEIGHT_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Thin (100)', 'sgs-blocks' ), value: '100' },
	{ label: __( 'Extra-light (200)', 'sgs-blocks' ), value: '200' },
	{ label: __( 'Light (300)', 'sgs-blocks' ), value: '300' },
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra-bold (800)', 'sgs-blocks' ), value: '800' },
	{ label: __( 'Black (900)', 'sgs-blocks' ), value: '900' },
];

const FONT_STYLE_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

const TEXT_DECORATION_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

const MAX_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: 800 },
	{ value: 'em', label: 'em', default: 60 },
	{ value: 'rem', label: 'rem', default: 60 },
	{ value: '%', label: '%', default: 100 },
	{ value: 'ch', label: 'ch', default: 65 },
];

// Mirrors render.php's $allowed_units for customWidth (px/em/rem/%/vw/vh) —
// a unit outside this set is rejected server-side, so the editor never offers one.
const CUSTOM_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: 300 },
	{ value: 'em', label: 'em', default: 20 },
	{ value: 'rem', label: 'rem', default: 20 },
	{ value: '%', label: '%', default: 50 },
	{ value: 'vw', label: 'vw', default: 50 },
	{ value: 'vh', label: 'vh', default: 50 },
];

const EASING_OPTIONS = [
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

// LETTER_SPACING_UNITS removed — letter-spacing is now rendered exclusively by
// the shared TypographyControls component (showLetterSpacing={ true }); the
// local duplicate UnitControl that used this constant was removed alongside it.

const FIRST_LETTER_SIZE_UNITS = [
	{ value: 'em', label: 'em', default: 3 },
	{ value: 'rem', label: 'rem', default: 3 },
	{ value: 'px', label: 'px', default: 48 },
];

// ---------------------------------------------------------------------------
// Style builder — editor preview only (desktop styles; responsive handled PHP)
// ---------------------------------------------------------------------------

// Box-object interface contract §1: a 4-side/4-corner box is an object with
// named keys, each an already-unit-bearing CSS length string or absent (unset
// side/corner). Build an editor-preview shorthand from the object — mirrors
// render.php's box-shorthand builder so the canvas preview matches the
// frontend (contract §5). Mirrors sgs/button's edit.js boxShorthand helper.
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

function buildEditorStyle( attributes ) {
	const { padding, margin,
		style,
		textColour,
		textColourGradient,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		fontStyle,
		textDecoration,
		textTransform,
		fontFamily,
		textAlign,
		maxWidth,
		maxWidthUnit,
		customWidth,
		customWidthUnit,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
	} = attributes;

	const previewStyle = {};

	// fontSize / lineHeight / letterSpacing are OBJECT-typed {desktop,tablet,
	// mobile} attrs (Spec 35 tier-object migration) — the canvas preview always
	// shows the DESKTOP tier (tablet/mobile only apply via the responsive
	// device-toggle preview, which WP re-renders this same function under).
	// Resolve before use so `${fontSize}` never string-concatenates the whole
	// object into the literal text "[object Object]".
	const resolveDesktop = ( val ) =>
		val !== null && typeof val === 'object' && ! Array.isArray( val ) ? val.desktop : val;
	const fontSizeVal = resolveDesktop( fontSize );
	const lineHeightVal = resolveDesktop( lineHeight );
	const letterSpacingVal = resolveDesktop( letterSpacing );

	// colourVar wraps slugs in var(--wp--preset--color--X); raw hex passes
	// through as-is from ColorPalette. The sibling gradient attribute (D636)
	// switches to the background-clip:text preview shape when set.
	Object.assign(
		previewStyle,
		resolveTextColourPreviewStyle( textColour, textColourGradient, ( v ) =>
			/^#|^rgb|^hsl/.test( v ) ? v : colourVar( v )
		)
	);
	if ( fontSizeVal ) {
		// A string fontSize is a theme preset slug — resolve to the preset
		// custom property (mirrors sgs_font_size_value() server-side).
		previewStyle.fontSize =
			typeof fontSizeVal === 'string'
				? fontSizeVar( fontSizeVal )
				: `${ fontSizeVal }${ fontSizeUnit }`;
	}
	if ( fontWeight ) {
		previewStyle.fontWeight = fontWeight;
	}
	if ( lineHeightVal ) {
		previewStyle.lineHeight = `${ lineHeightVal }${ lineHeightUnit }`;
	}
	if ( letterSpacingVal != null ) {
		previewStyle.letterSpacing = `${ letterSpacingVal }${ letterSpacingUnit }`;
	}
	if ( fontStyle ) {
		previewStyle.fontStyle = fontStyle;
	}
	if ( textDecoration ) {
		previewStyle.textDecoration = textDecoration;
	}
	if ( textTransform ) {
		previewStyle.textTransform = textTransform;
	}
	if ( fontFamily ) {
		previewStyle.fontFamily = fontFamily;
	}
	if ( textAlign ) {
		previewStyle.textAlign = textAlign;
	}
	if ( maxWidth ) {
		previewStyle.maxWidth = `${ maxWidth }${ maxWidthUnit }`;
	}
	// Custom width overrides max-width when both are set — mirrors render.php's
	// step-4 "only one is emitted" rule, so the canvas preview matches the
	// frontend rather than showing both competing rules.
	if ( '' !== customWidth && null !== customWidth && undefined !== customWidth ) {
		previewStyle.width = `${ customWidth }${ customWidthUnit }`;
	}

	// Base padding/margin/border-radius preview — padding/margin are owned
	// tier-object attrs { desktop, tablet, mobile } (desktop tier previewed
	// here only); border-radius stays WP-native style.border.radius; border
	// width comes from the SGS custom borderWidth object attr.
	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) previewStyle.padding = paddingPreview;
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) previewStyle.margin = marginPreview;

	// CSS border-radius shorthand order: top-left top-right bottom-right bottom-left.
	const borderRadiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) previewStyle.borderRadius = borderRadiusPreview;

	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderWidthPreview ) {
		previewStyle.borderWidth = borderWidthPreview;
		previewStyle.borderStyle = borderStyle && 'none' !== borderStyle ? borderStyle : 'solid';
		if ( borderColour ) {
			previewStyle.borderColor = /^#|^rgb|^hsl/.test( borderColour )
				? borderColour
				: colourVar( borderColour );
		}
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			previewStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}

	return previewStyle;
}

// ---------------------------------------------------------------------------
// Drop-cap ::first-letter preview — CSS custom properties consumed by the
// gated ::first-letter rule in editor.css (mirrors sgs/container's ::before
// media-layer pattern; a pseudo-element cannot be styled via an inline React
// `style` prop). Mirrors render.php's `$fl_decls` property list + defaults
// (font-size default 3em; colour/weight unset = inherit) exactly, so the
// canvas preview matches the frontend. Returns undefined when dropCap is off
// so the gating class is never added and the rule never applies.
// ---------------------------------------------------------------------------

function buildDropCapStyle( attributes ) {
	const {
		dropCap,
		firstLetterColour,
		firstLetterColourGradient,
		firstLetterFontSize,
		firstLetterFontSizeUnit,
		firstLetterFontWeight,
	} = attributes;

	if ( ! dropCap ) {
		return undefined;
	}

	const dropCapStyle = {};

	dropCapStyle[ '--sgs-ed-first-letter-font-size' ] =
		firstLetterFontSize !== undefined && firstLetterFontSize !== null && '' !== firstLetterFontSize
			? `${ firstLetterFontSize }${ firstLetterFontSizeUnit || 'em' }`
			: '3em';

	if ( firstLetterFontWeight ) {
		dropCapStyle[ '--sgs-ed-first-letter-font-weight' ] = firstLetterFontWeight;
	}

	// The drop-cap ::first-letter pseudo-element cannot receive an inline React
	// style, so this custom property is consumed by a `color:var(...)`
	// declaration in a companion stylesheet — a gradient string is not a valid
	// `color` value there. D636: the FRONTEND render (render.php +
	// sgs_text_colour_decl()) renders a gradient drop-cap correctly via
	// background-clip:text when the sibling firstLetterColourGradient wins;
	// the editor CANVAS simply shows no colour override when the gradient
	// sibling is set (falls back to inherited colour) rather than risk an
	// invalid CSS custom-property consumer — a solid colour still previews
	// exactly as before.
	if ( firstLetterColour && ! firstLetterColourGradient ) {
		dropCapStyle[ '--sgs-ed-first-letter-colour' ] = /^#|^rgb|^hsl/.test( firstLetterColour )
			? firstLetterColour
			: colourVar( firstLetterColour );
	}

	return dropCapStyle;
}

// ---------------------------------------------------------------------------
// Helpers: UnitControl compose/parse (letter spacing, max width, spacing)
// ---------------------------------------------------------------------------

function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.+-][\d.]*)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		text,
		textColour,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		fontStyle,
		textDecoration,
		textTransform,
		fontFamily,
		textAlign,
		maxWidth,
		maxWidthUnit,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		dropCap,
		firstLetterColour,
		firstLetterColourHover,
		firstLetterColourGradient,
		firstLetterFontSize,
		firstLetterFontSizeUnit,
		firstLetterFontWeight,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourHover,
		borderColourGradient,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		scaleHover,
		customWidth,
		customWidthUnit,
		inheritStyle,
		transitionDuration,
		transitionEasing,
	} = attributes;

	// Drop-cap ::first-letter preview — gate the class only when dropCap is on
	// (mirrors sgs/container's ::before media-layer gating, editor.css) so no
	// other sgs/text block in the canvas gains the pseudo-element.
	const dropCapStyle = buildDropCapStyle( attributes );
	const editorClassName = dropCap
		? 'wp-block-sgs-text wp-block-sgs-text--has-drop-cap'
		: 'wp-block-sgs-text';

	// Contrast check for text colour — warn if text fails WCAG AA contrast
	// against the text block's own background. When the text has no background
	// set, there's no static background to compare against (it depends on the
	// parent container context, which varies per insertion), so the check is
	// skipped. Follows the site-header-row pattern (same block structure).
	//
	// `contrastAgainst` only accepts a FLAT colour/token — it is not itself
	// gradient-aware. When `backgroundColourGradient` is set, the gradient (not
	// the flat `backgroundColour`) is what actually paints (D636: gradient wins
	// over flat), so comparing against the flat colour would compare against a
	// surface that isn't rendered — skip the check entirely in that case rather
	// than feed the raw gradient string in (it fails to parse as a colour and
	// would show an always-wrong "fails contrast" warning regardless of the
	// real text colour).
	const textContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	const blockProps = useBlockProps( {
		className: editorClassName,
		style: { ...buildEditorStyle( attributes ), ...dropCapStyle },
	} );

	return (
		<>
			{ /* ── Styles tab (Spec 35 THE PLACEMENT RULE, D537) ────────────────
			   `text` is this block's isWrapper:true element with clusters
			   [text, fill, layout, motion] — its controls split into
			   property-family panels rather than one merged element panel.
			   `background` is a real, separate declared element (its own
			   `::after` paint layer) and gets its own TIER-1 panel. */ }
			<InspectorControls group="styles">
				{ /* ---- Typography — `text`'s TIER-2 "Text" family panel ----
				   Holds every text-cluster control: font properties, text
				   align (moved out of the old standalone "Layout" panel —
				   align is a text-family property, not a box/layout one) and
				   the element's own colour (moved out of the shared Colour
				   panel above — text's colour belongs with text's other
				   properties, not bundled with `background`'s). */ }
				<ToolsPanel
					label={ __( 'Typography', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							textDecoration: '',
							textTransform: '',
							fontFamily: '',
							textAlign: '',
							textColour: '',
							textColourGradient: '',
							textColourHover: '',
							textColourHoverGradient: '',
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Font', 'sgs-blocks' ) }
						hasValue={ () =>
							( fontSize && 'object' === typeof fontSize && Object.keys( fontSize ).length > 0 ) ||
							'px' !== ( fontSizeUnit || 'px' ) ||
							!! fontWeight ||
							!! fontStyle ||
							( lineHeight && 'object' === typeof lineHeight && Object.keys( lineHeight ).length > 0 ) ||
							'em' !== ( lineHeightUnit || 'em' ) ||
							( letterSpacing && 'object' === typeof letterSpacing && Object.keys( letterSpacing ).length > 0 )
						}
						onDeselect={ () =>
							setAttributes( {
								fontSize: {},
								fontSizeUnit: 'px',
								fontWeight: '',
								fontStyle: '',
								lineHeight: {},
								lineHeightUnit: 'em',
								letterSpacing: {},
							} )
						}
						isShownByDefault
					>
					{ /*
					 * Font size + line height via shared TypographyControls.
					 * Handles: fontSize/fontSizeUnit (fontSize is a TIER OBJECT here
					 *           — {desktop,tablet,mobile} — so the responsive values
					 *           live inside it. The legacy flat fontSizeTablet/
					 *           fontSizeMobile pair does NOT apply to this block and
					 *           must not be re-added; TypographyControls' tiered
					 *           branch never writes them.)
					 *           lineHeight/lineHeightUnit
					 *           fontWeight / fontStyle
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showSize={ true }
						fontSizePresets={ true }
						showWeight={ true }
						showStyle={ true }
						showLineHeight={ true }
						showResponsive={ true }
						showLetterSpacing={ true }
						showDecoration={ true }
						showTransform={ true }
					/>

					{ /* Line height tablet/mobile — lineHeight is now an OBJECT-typed
					   {desktop,tablet,mobile} attr (Spec 35 tier-object migration).
					   TypographyControls' own lineHeight UnitControl only edits the
					   desktop tier; the tablet/mobile tiers are managed here, writing
					   into the SAME object rather than the retired lineHeightTablet/
					   lineHeightMobile sibling attrs (folded into this object — WP
					   silently discards a value written to an undeclared attr). */ }
					<ResponsiveControl label={ __( 'Line height (tablet / mobile)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							if ( breakpoint === 'desktop' ) {
								return null; // desktop handled by TypographyControls above
							}
							const lineHeightObj =
								lineHeight && 'object' === typeof lineHeight && ! Array.isArray( lineHeight )
									? lineHeight
									: {};
							const val = lineHeightObj[ breakpoint ];
							return (
								<RangeControl
									label={ breakpoint === 'tablet'
										? __( 'Line height (tablet)', 'sgs-blocks' )
										: __( 'Line height (mobile)', 'sgs-blocks' )
									}
									value={ val ?? '' }
									onChange={ ( v ) =>
										setAttributes( { lineHeight: { ...lineHeightObj, [ breakpoint ]: v } } )
									}
									min={ 0.8 }
									max={ 3 }
									step={ 0.05 }
									allowReset
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>

					{ /* Letter spacing is already rendered by TypographyControls above
					   (showLetterSpacing={ true }) — this block used to duplicate it with
					   a second, conflicting flat-value UnitControl that would clobber the
					   letterSpacing OBJECT with a bare number. Removed rather than fixed:
					   TypographyControls is the single owner. */ }
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Text decoration & transform', 'sgs-blocks' ) }
						hasValue={ () => textDecoration !== '' || textTransform !== '' }
						onDeselect={ () =>
							setAttributes( { textDecoration: '', textTransform: '' } )
						}
					>
					<SelectControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						options={ TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textDecoration: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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

					<ToolsPanelItem
						label={ __( 'Font family', 'sgs-blocks' ) }
						hasValue={ () => fontFamily !== '' }
						onDeselect={ () => setAttributes( { fontFamily: '' } ) }
					>
					<TextControl
						label={ __( 'Font family', 'sgs-blocks' ) }
						value={ fontFamily }
						onChange={ ( val ) =>
							setAttributes( { fontFamily: val } )
						}
						placeholder={ __( 'Inter, sans-serif', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Text align', 'sgs-blocks' ) }
						hasValue={ () => textAlign !== '' }
						onDeselect={ () => setAttributes( { textAlign: '' } ) }
						isShownByDefault
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

					<ToolsPanelItem
						label={ __( 'Text colour', 'sgs-blocks' ) }
						hasValue={ () =>
							( textColour ?? '' ) !== '' ||
							( textColourGradient ?? '' ) !== '' ||
							( textColourHover ?? '' ) !== '' ||
							( textColourHoverGradient ?? '' ) !== ''
						}
						onDeselect={ () =>
							setAttributes( {
								textColour: '',
								textColourGradient: '',
								textColourHover: '',
								textColourHoverGradient: '',
							} )
						}
						isShownByDefault
					>
					{ /* Text colour — moved out of the shared Colour panel above
					   (was jammed together with `background`'s colour there);
					   this is `text`'s own css:color member and belongs with
					   its other text-cluster properties. Same row component
					   SgsColourPanel itself uses (`GradientCapableColourControl`,
					   since this row previously carried `gradientCapable: true`),
					   so the control is pixel-identical for the client. */ }
					<GradientCapableColourControl
						label={ __( 'Text colour', 'sgs-blocks' ) }
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
						contrastAgainst={ textContrastAgainst }
					/>
					</ToolsPanelItem>
				</ToolsPanel>

				{ /* ---- Background — `background`'s own TIER-1 panel ----
				   A real declared element (the block's `::after` paint layer,
				   Spec 35 element manifest), not a wrapper — it gets its own
				   panel rather than sharing one with `text`. Same row
				   component SgsColourPanel itself uses (`DesignTokenPicker`
				   — this row never carried `gradientCapable: true`, so the
				   component choice is unchanged from before the move). */ }
				<PanelBody
					title={ __( 'Background', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Background colour', 'sgs-blocks' ) }
						states={ [
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
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						] }
					/>
				</PanelBody>

				{ /* ---- Layout — `text`'s TIER-2 "Layout" family panel ----
				   Max width (was the old standalone "Layout" panel, minus
				   textAlign which moved to Typography above), margin/padding
				   (was "Spacing") and border/radius (was "Border") all
				   collapse into one panel — box-shape properties of the same
				   `text` wrapper element, per THE PLACEMENT RULE's TIER-2
				   property-family grouping rather than three separate
				   ungrouped panels. */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Max width — SgsLengthControl (number + unit in one input) */ }
					<SgsLengthControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ composeUnit( maxWidth, maxWidthUnit ) }
						units={ MAX_WIDTH_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, maxWidthUnit || 'px' );
							setAttributes( { maxWidth: num, maxWidthUnit: unit } );
						} }
						presets={ false }
					/>

					{ /* Custom width — split-scalar customWidth/customWidthUnit pair,
					   same SgsLengthControl composeUnit/parseUnit shape as Max width
					   above and sgs/label's lineHeight/lineHeightUnit. render.php
					   emits `width:` from these when set (overriding max-width — only
					   one is emitted server-side). */ }
					<SgsLengthControl
						label={ __( 'Custom width', 'sgs-blocks' ) }
						value={ composeUnit( customWidth, customWidthUnit ) }
						units={ CUSTOM_WIDTH_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, customWidthUnit || 'px' );
							setAttributes( {
								customWidth: undefined === num ? '' : String( num ),
								customWidthUnit: unit,
							} );
						} }
						presets={ false }
					/>

					{ /* padding/margin are each a single block-owned tier-object attr
					   { desktop, tablet, mobile }, written via ResponsiveOverride +
					   SgsBoxControl; read directly by this block's render.php. The
					   device switcher selects desktop/tablet/mobile. */ }
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

					{ /* Box-object interface contract §1/§5: borderWidth is an SGS custom
					   object attr (base only, no tiers — mirrors sgs/button); border-radius
					   routes to WP-native style.border.radius (base only — this block has
					   no radius tiers). Task 0 codemod (migrate-border-control.js) -- one
					   composite row (width/style/colour) mirroring native's
					   BorderBoxControl layout, matching sgs/product-card + sgs/quote. */ }
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
							},
						] }
						contrastAgainst={ textContrastAgainst }
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
				</PanelBody>

				{ /* ---- Effects — `text`'s TIER-2 "motion" family panel ----
				   Box shadow (base + hover, each its own independent
				   ShadowControl mount — mirrors sgs/quote's two-mount pattern
				   exactly, since ShadowControl's own internal Normal/Hover
				   tabs would write a differently-shaped hover-colour attr
				   name than the one already declared here), hover scale, and
				   the hover-transition timing pair. All motion-cluster
				   members of the `text` element's attrMap. */ }
				<PanelBody
					title={ __( 'Effects', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ShadowControl
						label={ __( 'Box shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'boxShadow', { colour: true } ) }
					/>
					<ShadowControl
						label={ __( 'Box shadow (hover)', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'boxShadowHover', { colour: true } ) }
					/>
					<RangeControl
						label={ __( 'Hover scale', 'sgs-blocks' ) }
						value={ parseFloat( scaleHover ) || 1 }
						onChange={ ( val ) => setAttributes( { scaleHover: val } ) }
						min={ 1 }
						max={ 1.1 }
						step={ 0.01 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ transitionDuration ?? 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: val } ) }
						min={ 0 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* D812 (2026-08-26): a 2-5 option enum with longest rendered
					   label <=12 chars renders as ToggleGroupControl, not
					   SelectControl (this enum: 5 options, longest label 11
					   chars — "Ease in-out"). Reference: sgs/heading's identical
					   transitionEasing mount (both blocks share the same
					   enum shape, fixed there first). */ }
					<ToggleGroupControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						onChange={ ( val ) => setAttributes( { transitionEasing: val || 'ease' } ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						{ EASING_OPTIONS.map( ( option ) => (
							<ToggleGroupControlOption
								key={ option.value }
								value={ option.value }
								label={ option.label }
							/>
						) ) }
					</ToggleGroupControl>
				</PanelBody>
			</InspectorControls>

			{ /* Inherit-style escape hatch — Advanced tab, exact copy of
			   sgs/heading's placement (InspectorAdvancedControls, not a
			   block-private "Advanced" PanelBody — that would silently break
			   the guarantee that the real Advanced slot is pinned last on
			   every block, per the 2026-09-02 uniformity-sweep fix). */ }
			<InspectorAdvancedControls>
				<ToggleControl
					label={ __( 'Inherit style from parent', 'sgs-blocks' ) }
					help={ __( 'When enabled, all block-level typography styles are suppressed and the element inherits from its parent container.', 'sgs-blocks' ) }
					checked={ !! inheritStyle }
					onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
				/>
			</InspectorAdvancedControls>

			{ /* ============================================================
			     Settings tab — Drop cap (TIER-1, its own already-exempt
			     element panel; left untouched per Spec 35 THE PLACEMENT RULE)
			     ============================================================ */ }
			<InspectorControls>
				<PanelBody
					title={ __( 'Drop cap', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Enable drop cap', 'sgs-blocks' ) }
						checked={ dropCap }
						onChange={ ( val ) =>
							setAttributes( { dropCap: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ dropCap && (
						<>
							{ /* First-letter size — SgsLengthControl (number + unit in one input) */ }
							<SgsLengthControl
								label={ __( 'First-letter size', 'sgs-blocks' ) }
								value={ composeUnit( firstLetterFontSize, firstLetterFontSizeUnit ) }
								units={ FIRST_LETTER_SIZE_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, firstLetterFontSizeUnit || 'em' );
									setAttributes( {
										firstLetterFontSize: num,
										firstLetterFontSizeUnit: unit,
									} );
								} }
								presets={ false }
							/>
							<SelectControl
								label={ __( 'First-letter weight', 'sgs-blocks' ) }
								value={ firstLetterFontWeight }
								options={ FONT_WEIGHT_OPTIONS }
								onChange={ ( val ) =>
									setAttributes( {
										firstLetterFontWeight: val,
									} )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<GradientCapableColourControl
								label={ __( 'First-letter colour', 'sgs-blocks' ) }
								states={ [
									{
										key: 'normal',
										label: __( 'Normal', 'sgs-blocks' ),
										value: firstLetterColour,
										onChange: ( val ) => setAttributes( { firstLetterColour: val ?? '' } ),
										linked: true,
										gradientValue: firstLetterColourGradient,
										onGradientChange: ( val ) => setAttributes( { firstLetterColourGradient: val ?? '' } ),
									},
									{
										key: 'hover',
										label: __( 'Hover', 'sgs-blocks' ),
										value: firstLetterColourHover,
										onChange: ( val ) => setAttributes( { firstLetterColourHover: val ?? '' } ),
										linked: true,
									},
								] }
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<RichText
				{ ...blockProps }
				tagName="p"
				value={ text }
				onChange={ ( val ) => setAttributes( { text: val } ) }
				placeholder={ __( 'Text…', 'sgs-blocks' ) }
				allowedFormats={ [
					'core/bold',
					'core/italic',
					'core/link',
				] }
			/>
		</>
	);
}
