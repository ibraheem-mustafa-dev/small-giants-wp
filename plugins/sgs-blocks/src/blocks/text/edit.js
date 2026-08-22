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
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import {
	TypographyControls,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	SgsColourPanel,
} from '../../components';
import { colourVar, fontSizeVar, resolveTextColourPreviewStyle } from '../../utils';
import { UnitControl } from '../../components/primitives';

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

// LETTER_SPACING_UNITS removed — letter-spacing is now rendered exclusively by
// the shared TypographyControls component (showLetterSpacing={ true }); the
// local duplicate UnitControl that used this constant was removed alongside it.

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
	const {
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
		borderWidth,
		borderStyle,
		borderColour,
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

	// Box-object interface contract §5: base padding/margin/border-radius come
	// from WP-native style.spacing.* / style.border.radius (object); border
	// width from the SGS custom borderWidth object attr. Tablet/mobile tiers
	// stay flat per-side attrs (contract exception for this block — not
	// previewed here, matching the pre-existing desktop-only canvas preview).
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) previewStyle.padding = paddingPreview;
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
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
	} = attributes;

	// Drop-cap ::first-letter preview — gate the class only when dropCap is on
	// (mirrors sgs/container's ::before media-layer gating, editor.css) so no
	// other sgs/text block in the canvas gains the pseudo-element.
	const dropCapStyle = buildDropCapStyle( attributes );
	const editorClassName = dropCap
		? 'wp-block-sgs-text wp-block-sgs-text--has-drop-cap'
		: 'wp-block-sgs-text';

	const blockProps = useBlockProps( {
		className: editorClassName,
		style: { ...buildEditorStyle( attributes ), ...dropCapStyle },
	} );

	return (
		<>
			{ /* Colour panel FIRST (D618/D619, sgs/button pattern). Text
			   colour and background colour each pair their resting value
			   with a Hover state (textColourHover/backgroundColourHover).
			   Border colour and the first-letter drop-cap colour stay
			   single-state — neither has a hover counterpart. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'textColour',
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
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'backgroundColour',
						label: __( 'Background colour', 'sgs-blocks' ),
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
						],
					},
					{
						key: 'borderColour',
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
							},
						],
					},
					{
						key: 'firstLetterColour',
						label: __( 'First-letter colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
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
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* ---- Typography ---- */ }
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
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
				</PanelBody>

				{ /* ---- Layout ---- */ }
				<PanelBody
					title={ __( 'Layout', 'sgs-blocks' ) }
					initialOpen={ false }
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
					{ /* Max width — UnitControl (number + unit in one input) */ }
					<UnitControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ composeUnit( maxWidth, maxWidthUnit ) }
						units={ MAX_WIDTH_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, maxWidthUnit || 'px' );
							setAttributes( { maxWidth: num, maxWidthUnit: unit } );
						} }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ---- Spacing ---- */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Box-object interface contract §B (100% box-group): base padding/
					   margin route to WP-native style.spacing (mirrors sgs/container +
					   sgs/button); tablet/mobile tiers are the SGS object attrs
					   marginTablet/marginMobile + paddingTablet/paddingMobile, written
					   via the container/button onChange( tier, next ) split. The device
					   switcher selects base/tablet/mobile. */ }
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
				</PanelBody>

				{ /* ---- Border ----
				   Box-object interface contract §1/§5: borderWidth is an SGS custom
				   object attr (base only, no tiers — mirrors sgs/button); border-radius
				   routes to WP-native style.border.radius (base only — this block has
				   no radius tiers). */ }
				<PanelBody
					title={ __( 'Border', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
						onChange={ ( tier, next ) =>
							setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } )
						}
					/>
				</PanelBody>

				{ /* ---- Drop cap ---- */ }
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
							{ /* First-letter size — UnitControl (number + unit in one input) */ }
							<UnitControl
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
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
