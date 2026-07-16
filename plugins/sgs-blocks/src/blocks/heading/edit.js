import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RadioControl,
	ToggleControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import { colourVar, fontSizeVar } from '../../utils';

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

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
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

const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
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

const LETTER_SPACING_UNITS = [
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'px', label: 'px', default: 0 },
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
	} = attributes;

	const style = {
		color: colourVar( textColour ) || undefined,
		// A string fontSize is a theme preset slug — resolve to the preset
		// custom property (mirrors sgs_font_size_value() server-side).
		fontSize: buildPreviewFontSize( fontSize, fontSizeUnit ),
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeight ? `${ lineHeight }${ lineHeightUnit }` : undefined,
		letterSpacing: ( letterSpacing !== null && letterSpacing !== undefined )
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
		fontStyle: fontStyle || undefined,
		textDecoration: textDecoration || undefined,
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
	const { textAlign, backgroundColour, borderWidth, borderStyle, borderColour, style } = attributes;
	const wrapperStyle = {};
	if ( textAlign ) {
		wrapperStyle.textAlign = textAlign;
	}
	if ( backgroundColour ) {
		wrapperStyle.backgroundColor = colourVar( backgroundColour ) || undefined;
	}
	// Border-radius base preview — Box-object interface contract §1/§5: base
	// radius is WP-native style.border.radius (CSS shorthand order top-left
	// top-right bottom-right bottom-left).
	const borderRadiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( borderRadiusPreview ) {
		wrapperStyle.borderRadius = borderRadiusPreview;
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
	}
	// Base padding/margin preview — WP-native style.spacing.* objects
	// (contract §B; box-model order top/right/bottom/left).
	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}
	return wrapperStyle;
}

// ─── Main edit component ──────────────────────────────────────────────────────

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		headingRole,
		content,
		level,
		subTag,
		textColour,
		textAlign,
		backgroundColour,
		fontStyle,
		textDecoration,
		inheritStyle,
		letterSpacing,
		letterSpacingUnit,
		textTransform,
		borderWidth,
		borderStyle,
		borderColour,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
	} = attributes;

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
						/>
					) }

					{ isSubheading && (
						<SelectControl
							label={ __( 'HTML tag', 'sgs-blocks' ) }
							value={ subTag }
							options={ SUB_TAG_OPTIONS }
							onChange={ ( val ) => setAttributes( { subTag: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				{ /* ── Colour panel ── */ }
				<PanelBody title={ __( 'Colour', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) => setAttributes( { textColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Background colour', 'sgs-blocks' ) }
						value={ backgroundColour }
						onChange={ ( val ) => setAttributes( { backgroundColour: val ?? '' } ) }
					/>
				</PanelBody>

				{ /* ── Typography panel ── */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					{ /*
					 * Font size (responsive) + line height + font weight + font style
					 * via shared TypographyControls.
					 * Handles: fontSize/fontSizeUnit/fontSizeTablet/fontSizeMobile
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
					/>

					<SelectControl
						label={ __( 'Text transform', 'sgs-blocks' ) }
						value={ textTransform }
						options={ TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) => setAttributes( { textTransform: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						options={ TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { textDecoration: val } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Letter spacing — UnitControl (number + unit in one input) */ }
					<UnitControl
						label={ __( 'Letter spacing', 'sgs-blocks' ) }
						value={ composeUnit( letterSpacing, letterSpacingUnit ) }
						units={ LETTER_SPACING_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, letterSpacingUnit || 'em' );
							setAttributes( { letterSpacing: num, letterSpacingUnit: unit } );
						} }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Layout panel ── */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) => setAttributes( { textAlign: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ── Border panel ── Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (base only — the block
				   declares __experimentalBorder.__experimentalSkipSerialization so it
				   serialises scoped, not inline, matching the spacing pattern already
				   proven on sgs/container + sgs/button). */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Border style', 'sgs-blocks' ) }
						value={ borderStyle }
						options={ BORDER_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Border colour', 'sgs-blocks' ) }
						value={ borderColour }
						onChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
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

				{ /* ── Spacing panel ── Box-object interface contract §B/§E:
				   padding/margin base routes to WP-native style.spacing.* (mirrors
				   sgs/container + sgs/button); tiers are the paddingTablet/paddingMobile
				   + marginTablet/marginMobile object attrs. The spacing support declares
				   __experimentalSkipSerialization so base serialises scoped, not inline. */ }
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

				{ /* ── Advanced panel ── */ }
				<PanelBody title={ __( 'Advanced', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Inherit style from parent', 'sgs-blocks' ) }
						help={ __( 'When enabled, all block-level typography styles are suppressed and the element inherits from its parent container.', 'sgs-blocks' ) }
						checked={ !! inheritStyle }
						onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

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
