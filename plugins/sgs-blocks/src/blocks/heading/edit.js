import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
	InspectorAdvancedControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RadioControl,
	ToggleControl,
	RangeControl,
} from '@wordpress/components';
import { TypographyControls, ResponsiveBoxControl, SgsColourPanel, SgsBorderControl, SgsLengthControl, ShadowControl, shadowAttrKeys, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { colourVar, fontSizeVar, resolveTextColourPreviewStyle } from '../../utils';

// ─── Option sets ─────────────────────────────────────────────────────────────

const HEADING_ROLE_OPTIONS = [
	{ label: __( 'Heading', 'sgs-blocks' ), value: 'heading' },
	{ label: __( 'Subheading', 'sgs-blocks' ), value: 'subheading' },
];

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'H1', 'sgs-blocks' ), value: 'h1' },
	{ label: __( 'H2 (default)', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'H3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'H4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'H5', 'sgs-blocks' ), value: 'h5' },
	{ label: __( 'H6', 'sgs-blocks' ), value: 'h6' },
];

const SUB_TAG_OPTIONS = [
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

// ⛔ TEXT_TRANSFORM_OPTIONS / FONT_STYLE_OPTIONS / TEXT_DECORATION_OPTIONS /
// TEXT_ALIGN_OPTIONS / TEXT_WRAP_OPTIONS / LETTER_SPACING_UNITS all lived here
// until 2026-09-06. Every one is now owned by the shared TypographyControls
// component (src/components/TypographyControls.js), which exports the canonical
// sets as SGS_TEXT_TRANSFORM_OPTIONS, SGS_FONT_STYLE_OPTIONS,
// SGS_TEXT_DECORATION_OPTIONS, SGS_TEXT_ALIGN_OPTIONS and
// SGS_TEXT_WRAP_OPTIONS. Do not re-declare a block-private copy: divergence
// between a block's list and the PHP allowlist in sgs_typography_css_rule() is
// silent — an out-of-enum value is coerced to the attribute default by
// WordPress and simply stops rendering, with nothing to flag it.
//
// FONT_STYLE_OPTIONS in particular was ALREADY dead here before this pass (one
// reference: its own declaration) — font style has come from TypographyControls
// for some time.

// Heading's own block.json default is 'ease' (NOT team-member/gallery's
// 'ease-in-out') — the options list is copied from those siblings, the
// default stays heading's own.
const EASING_OPTIONS = [
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

const CUSTOM_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: undefined },
	{ value: '%', label: '%', default: undefined },
	{ value: 'em', label: 'em', default: undefined },
	{ value: 'rem', label: 'rem', default: undefined },
	{ value: 'vw', label: 'vw', default: undefined },
	{ value: 'vh', label: 'vh', default: undefined },
];

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
		const unit = match[ 2 ] || currentUnit || 'em';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'em' };
}

// ─── Inline style builder ─────────────────────────────────────────────────────

/**
 * Editor-canvas font-size: numeric attr + unit, or a theme preset slug string
 * resolved to var(--wp--preset--font-size--{slug}) — mirrors the server's
 * sgs_font_size_value() so the canvas matches the front end.
 *
 * @param {number|string|null} fontSize     Numeric size or preset slug.
 * @param {string}             fontSizeUnit Unit for numeric values.
 * @return {string|undefined} CSS font-size value or undefined when unset.
 */
function buildPreviewFontSize( fontSize, fontSizeUnit ) {
	if ( ! fontSize ) {
		return undefined;
	}
	if ( typeof fontSize === 'string' ) {
		return fontSizeVar( fontSize );
	}
	return `${ fontSize }${ fontSizeUnit }`;
}

function buildTextStyle( attributes ) {
	const {
		textColour,
		textColourGradient,
		fontFamily,
		fontSize,
		fontSizeUnit,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		fontStyle,
		textDecoration,
		textWrap,
	} = attributes;

	// lineHeight / letterSpacing are OBJECT-typed {desktop,tablet,mobile} attrs
	// (tier-object migration, 2026-09-06) — resolve the DESKTOP tier before use.
	//
	// ⛔ Without this, `${ lineHeight }` string-coerces the whole object to the
	// literal "[object Object]" and the canvas emits
	// `line-height:[object Object]em` — invalid CSS the browser silently drops,
	// so the preview would just stop reflecting the control with no error
	// anywhere. Same bug class as D569/D570's `trim( (string) $attr )` → "Array"
	// on the PHP side, and exactly why migrate-tier-object.py refuses to
	// auto-fix a read: what breaks is what the surrounding code DOES with the
	// value, not the read itself.
	//
	// Copied deliberately from sgs/text's identical resolveDesktop helper — the
	// block that hit this first. `fontSize` needs no such guard: it routes
	// through buildPreviewFontSize(), which already handles the tiered shape.
	const resolveDesktop = ( val ) =>
		val !== null && typeof val === 'object' && ! Array.isArray( val ) ? val.desktop : val;
	const lineHeightVal = resolveDesktop( lineHeight );
	const letterSpacingVal = resolveDesktop( letterSpacing );

	const style = {
		...resolveTextColourPreviewStyle( textColour, textColourGradient, colourVar ),
		// A string fontSize is a theme preset slug — resolve to the preset
		// custom property (mirrors sgs_font_size_value() server-side).
		fontSize: buildPreviewFontSize( fontSize, fontSizeUnit ),
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeightVal ? `${ lineHeightVal }${ lineHeightUnit }` : undefined,
		letterSpacing: ( letterSpacingVal !== null && letterSpacingVal !== undefined )
			? `${ letterSpacingVal }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
		fontStyle: fontStyle || undefined,
		textDecoration: textDecoration || undefined,
		// render.php allowlist: wrap/nowrap/balance/pretty/stable.
		textWrap: textWrap || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

// Box-object interface contract §1: a 4-side/4-corner box is an object with
// named keys, each an already-unit-bearing CSS length string or absent
// (unset side/corner). Build an editor-preview shorthand from the object —
// mirrors render.php's box-shorthand builder so the canvas preview matches
// the frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/** Build wrapper-level inline style for the editor canvas (mirrors render.php $wrapper_inline). */
function buildWrapperStyle( attributes ) {
	const { padding, margin, textAlign, backgroundColour, borderWidth, borderStyle, borderColour, borderColourGradient, inheritStyle, customWidth, customWidthUnit } = attributes;
	const wrapperStyle = {};
	// Contract §A (render.php): inheritStyle suppresses block-level wrapper
	// styling (background/border/text-align) and inherits from the parent —
	// mirrored here so the canvas doesn't show the OPPOSITE of what saves.
	if ( ! inheritStyle ) {
		if ( textAlign ) {
			wrapperStyle.textAlign = textAlign;
		}
		if ( backgroundColour ) {
			wrapperStyle.backgroundColor = colourVar( backgroundColour ) || undefined;
		}
		// Custom width — mirrors render.php's sgs_heading_spacing_val() numeric
		// guard (a non-numeric raw value emits nothing, same as the server).
		if ( '' !== customWidth && null !== customWidth && undefined !== customWidth
			&& /^-?\d+(\.\d+)?$/.test( String( customWidth ).trim() ) ) {
			wrapperStyle.width = `${ customWidth }${ customWidthUnit || 'px' }`;
		}
		// Border-width preview — SGS custom object attr (base only, no tiers).
		const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
		if ( borderWidthPreview ) {
			wrapperStyle.borderWidth = borderWidthPreview;
			if ( borderStyle && 'none' !== borderStyle ) {
				wrapperStyle.borderStyle = borderStyle;
			}
			if ( borderColour ) {
				wrapperStyle.borderColor = colourVar( borderColour ) || undefined;
			}
			// A gradient border renders frontend as a masked ::before ring, which cannot
			// be reproduced in a plain inline style — approximate it with the gradient as
			// a border-image so the canvas at least shows that a gradient is applied.
			if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
				wrapperStyle.borderImage = `${ borderColourGradient } 1`;
			}
		}
	}
	// Border-radius base preview — Box-object interface contract §1/§5: base
	// radius is WP-native style.border.radius (CSS shorthand order top-left
	// top-right bottom-right bottom-left). NOT part of Contract §A — render.php
	// doesn't gate this on inheritStyle either, so neither does the preview.
	const borderRadiusPreview = boxShorthand( attributes.borderRadius?.desktop, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) {
		wrapperStyle.borderRadius = borderRadiusPreview;
	}
	// Base padding/margin preview — padding/margin are owned tier-object
	// attrs { desktop, tablet, mobile }; the desktop tier is a box (box-model
	// order top/right/bottom/left).
	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}
	return wrapperStyle;
}

// ─── Main edit component ──────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		headingRole,
		content,
		level,
		subTag,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		inheritStyle,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		scaleHover,
		customWidth,
		customWidthUnit,
		transitionDuration,
		transitionEasing,
	} = attributes;
	// ⚠ textAlign / fontStyle / textDecoration / letterSpacing /
	// letterSpacingUnit / textTransform / textWrap are deliberately NOT
	// destructured here any more. Their controls moved to the shared
	// TypographyControls (which reads them straight off `attributes`), and the
	// editor-canvas preview builders below likewise take `attributes` whole.
	// Leaving them destructured would be an unused binding, which is a lint
	// error, not merely untidy.

	// Contrast check for border — warn if border fails WCAG contrast against
	// the block's own background. When there's no background set or a gradient
	// is active, skip the check entirely.
	const headingContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';


	const isSubheading = headingRole === 'subheading';

	// Determine the tag to render in the editor canvas.
	// Defensive coercion: `level` is a string enum ('h1'–'h6'), but a block
	// template may pass a bare number (e.g. level: 3). A numeric tag name makes
	// React throw "Element type is invalid: got number" (#130), which crashes
	// the editor for this block AND any parent whose template inserts it. Coerce
	// a number to its `h{n}` form so a mis-typed template can never crash.
	const normalisedLevel =
		typeof level === 'number' ? `h${ level }` : level;
	const editorTag = isSubheading ? subTag : normalisedLevel;

	// Contract §B3: NO wrapper <div> — the RichText h-tag/<p> IS the block root
	// (matches render.php). It carries the block class + BOTH the box/background/
	// border preview AND the typography preview, so the two style builders merge
	// onto the single root element.
	const blockProps = useBlockProps( {
		className: [
			'wp-block-sgs-heading',
			isSubheading ? 'wp-block-sgs-heading--subheading' : '',
		].filter( Boolean ).join( ' ' ),
		style: { ...buildWrapperStyle( attributes ), ...buildTextStyle( attributes ) },
	} );

	return (
		<>
			{ /* D609/D618 — ONE grouped, SGS-OWNED colour panel, rendered FIRST.
			   Replaces the scattered inline DesignTokenPicker rows that used to
			   live in the "Colour" and "Border" panels below. Every state links
			   to the theme palette (D619) so a picked swatch stores the theme
			   slug, not a raw hex. */ }
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
						key: 'background',
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
				] }
			/>
			<InspectorControls>
				{ /* ── Role panel ── */ }
				<PanelBody title={ __( 'Role', 'sgs-blocks' ) }>
					<RadioControl
						label={ __( 'Heading role', 'sgs-blocks' ) }
						selected={ headingRole }
						options={ HEADING_ROLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { headingRole: val } ) }
					/>

					{ ! isSubheading && (
						<SelectControl
							label={ __( 'Heading level', 'sgs-blocks' ) }
							value={ level }
							options={ HEADING_LEVEL_OPTIONS }
							onChange={ ( val ) => setAttributes( { level: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }

					{ isSubheading && (
						<SelectControl
							label={ __( 'HTML tag', 'sgs-blocks' ) }
							value={ subTag }
							options={ SUB_TAG_OPTIONS }
							onChange={ ( val ) => setAttributes( { subTag: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* ── Typography panel ── */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					{ /*
					 * THE WHOLE PANEL is the shared TypographyControls component
					 * (2026-09-06 redesign). Every field this panel used to
					 * hand-roll — text transform, text decoration, text wrap,
					 * letter spacing — is now rendered by the shared component
					 * instead, so sgs/heading and every other consumer show the
					 * SAME controls in the SAME order with the SAME spacing.
					 * Text align moved UP from the "Layout" panel below for the
					 * same reason `sgs/text` moved its own: alignment is a
					 * text-family property, not a box/layout one.
					 *
					 * Handles: fontSize (tier object) / fontSizeUnit
					 *          fontWeight / fontStyle
					 *          lineHeight / lineHeightUnit (unitless stepper)
					 *          letterSpacing / letterSpacingUnit
					 *          textDecoration / textTransform
					 *          textAlign / textWrap
					 *
					 * ⛔ Do NOT re-add a block-private duplicate of any of these
					 * here. Two controls writing one attribute is the
					 * duplicate-writer class `check-duplicate-controls.js`
					 * exists to catch, and it cannot see a writer that lives
					 * inside a config object rather than literal JSX.
					 *
					 * fontFamily is DECLARED by this block and consumed by both
					 * render.php (via sgs_typography_css_rule) and the canvas
					 * preview (buildTextStyle) — showFontFamily switched ON
					 * 2026-09-06 to close the parity gap with sgs/text, which
					 * already exposes this control.
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showSize={ true }
						fontSizePresets={ true }
						showFontFamily={ true }
						showWeight={ true }
						showStyle={ true }
						showLineHeight={ true }
						showResponsive={ true }
						showLetterSpacing={ true }
						showDecoration={ true }
						showTransform={ true }
						showTextAlign={ true }
						showTextWrap={ true }
						showWritingMode={ true }
					/>
				</PanelBody>

				{ /* ── Layout panel ── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* ⛔ Text align is NOT here any more (2026-09-06) — it moved
					   into the Typography panel above, rendered by the shared
					   TypographyControls, matching where `sgs/text` already put
					   its own. Alignment is a text-family property; grouping it
					   with box/width controls split it from the properties a
					   client changes alongside it. Do not re-add it here: a
					   second SelectControl writing `textAlign` would be a
					   duplicate writer for one attribute. */ }
					{ /* Custom width — ONE SgsLengthControl mount, split-scalar pattern
					   (customWidth stores the raw number as a string; render.php calls
					   sgs_heading_spacing_val( $custom_width, $custom_width_unit )). */ }
					<SgsLengthControl
						label={ __( 'Custom width', 'sgs-blocks' ) }
						value={ composeUnit( customWidth, customWidthUnit ) }
						units={ CUSTOM_WIDTH_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, customWidthUnit || 'px' );
							setAttributes( {
								customWidth: ( num === undefined || num === null ) ? '' : String( num ),
								customWidthUnit: unit,
							} );
						} }
						presets={ false }
					/>
				</PanelBody>

				{ /* ── Border panel ── Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (base only — the block
				   declares __experimentalBorder.__experimentalSkipSerialization so it
				   serialises scoped, not inline, matching the spacing pattern already
				   proven on sgs/container + sgs/button). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* One composite Width/Style/Colour row, mirroring native's
					     BorderBoxControl layout (Task 0). This block used to mount border
					     colour+style TWICE — here, and again as a "Border colour" row in
					     the SgsColourPanel above — both wired to the same attributes. Bean's
					     call (2026-08-29): keep this mount, drop the colour-panel row, so
					     width sits with its own style and colour instead of being split from
					     them. Border radius stays WP-native, below. */ }
					<SgsBorderControl
						widthValues={ borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ borderColourGradient }
						onColourGradientChange={ ( val ) =>
							setAttributes( { borderColourGradient: val ?? '' } )
						}
						colourLinked={ true }
						contrastAgainst={ headingContrastAgainst }
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

				{ /* ── Effects panel ── Box shadow (2 states, mirroring sgs/quote's
				   two SEPARATE ShadowControl mounts) + hover scale + transition
				   duration/easing. */ }
				<PanelBody title={ __( 'Effects', 'sgs-blocks' ) } initialOpen={ false }>
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
						value={ transitionDuration }
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
					   chars — "Ease in-out"). Reference: sgs/mega-aside's Format
					   ToggleGroupControl mount. */ }
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

				{ /* ── Spacing panel ── padding/margin are each a single block-owned
				   tier-object attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read directly by this
				   block's render.php. */ }
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
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

			{ /* S1 fix (2026-09-02, uniformity sweep, inspector-scan rule 35): moved
			   out of a block-private "Advanced" PanelBody in the default Settings
			   group into the real InspectorAdvancedControls slot — "Advanced" is
			   pinned structurally last on every block via the shared
			   src/blocks/extensions/custom-css.js mechanism, and a block-private
			   panel with the same title silently broke that guarantee for this one
			   block while reading, by title alone, as if it kept it. */ }
			<InspectorAdvancedControls>
				<ToggleControl
					label={ __( 'Inherit style from parent', 'sgs-blocks' ) }
					help={ __( 'When enabled, all block-level typography styles are suppressed and the element inherits from its parent container.', 'sgs-blocks' ) }
					checked={ !! inheritStyle }
					onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
				/>
			</InspectorAdvancedControls>

			{ /* ── Canvas ── the RichText h-tag/<p> IS the block root (§B3, no
			   wrapper div): useBlockProps spreads straight onto it. ── */ }
			<RichText
				{ ...blockProps }
				tagName={ editorTag }
				value={ content }
				onChange={ ( val ) => setAttributes( { content: val } ) }
				placeholder={
					isSubheading
						? __( 'Subheading copy…', 'sgs-blocks' )
						: __( 'Section heading…', 'sgs-blocks' )
				}
				allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
			/>
		</>
	);
}
