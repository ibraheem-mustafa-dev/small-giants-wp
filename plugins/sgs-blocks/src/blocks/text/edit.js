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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker, TypographyControls, ResponsiveControl } from '../../components';
import { colourVar } from '../../utils';

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

const LETTER_SPACING_UNITS = [
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'px', label: 'px', default: 0 },
];

const SPACING_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
];

const FIRST_LETTER_SIZE_UNITS = [
	{ value: 'em', label: 'em', default: 3 },
	{ value: 'rem', label: 'rem', default: 3 },
	{ value: 'px', label: 'px', default: 48 },
];

// ---------------------------------------------------------------------------
// Style builder — editor preview only (desktop styles; responsive handled PHP)
// ---------------------------------------------------------------------------

function buildEditorStyle( attributes ) {
	const {
		textColour,
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
		marginTop,
		marginRight,
		marginBottom,
		marginLeft,
		marginUnit,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		paddingUnit,
	} = attributes;

	const style = {};

	if ( textColour ) {
		// colourVar wraps slugs in var(--wp--preset--color--X);
		// raw hex passes through as-is from ColorPalette.
		style.color = /^#|^rgb|^hsl/.test( textColour )
			? textColour
			: colourVar( textColour );
	}
	if ( fontSize ) {
		style.fontSize = `${ fontSize }${ fontSizeUnit }`;
	}
	if ( fontWeight ) {
		style.fontWeight = fontWeight;
	}
	if ( lineHeight ) {
		style.lineHeight = `${ lineHeight }${ lineHeightUnit }`;
	}
	if ( letterSpacing != null ) {
		style.letterSpacing = `${ letterSpacing }${ letterSpacingUnit }`;
	}
	if ( fontStyle ) {
		style.fontStyle = fontStyle;
	}
	if ( textDecoration ) {
		style.textDecoration = textDecoration;
	}
	if ( textTransform ) {
		style.textTransform = textTransform;
	}
	if ( fontFamily ) {
		style.fontFamily = fontFamily;
	}
	if ( textAlign ) {
		style.textAlign = textAlign;
	}
	if ( maxWidth ) {
		style.maxWidth = `${ maxWidth }${ maxWidthUnit }`;
	}
	if ( marginTop != null ) {
		style.marginTop = `${ marginTop }${ marginUnit }`;
	}
	if ( marginRight != null ) {
		style.marginRight = `${ marginRight }${ marginUnit }`;
	}
	if ( marginBottom != null ) {
		style.marginBottom = `${ marginBottom }${ marginUnit }`;
	}
	if ( marginLeft != null ) {
		style.marginLeft = `${ marginLeft }${ marginUnit }`;
	}
	if ( paddingTop != null ) {
		style.paddingTop = `${ paddingTop }${ paddingUnit }`;
	}
	if ( paddingRight != null ) {
		style.paddingRight = `${ paddingRight }${ paddingUnit }`;
	}
	if ( paddingBottom != null ) {
		style.paddingBottom = `${ paddingBottom }${ paddingUnit }`;
	}
	if ( paddingLeft != null ) {
		style.paddingLeft = `${ paddingLeft }${ paddingUnit }`;
	}

	return style;
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
		text,
		textColour,
		fontSize,
		fontSizeUnit,
		fontSizeTablet,
		fontSizeMobile,
		fontWeight,
		lineHeight,
		lineHeightUnit,
		lineHeightTablet,
		lineHeightMobile,
		letterSpacing,
		letterSpacingUnit,
		fontStyle,
		textDecoration,
		textTransform,
		fontFamily,
		textAlign,
		maxWidth,
		maxWidthUnit,
		marginTop,
		marginRight,
		marginBottom,
		marginLeft,
		marginUnit,
		marginTopTablet,
		marginRightTablet,
		marginBottomTablet,
		marginLeftTablet,
		marginTopMobile,
		marginRightMobile,
		marginBottomMobile,
		marginLeftMobile,
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		paddingUnit,
		paddingTopTablet,
		paddingRightTablet,
		paddingBottomTablet,
		paddingLeftTablet,
		paddingTopMobile,
		paddingRightMobile,
		paddingBottomMobile,
		paddingLeftMobile,
		dropCap,
		firstLetterColour,
		firstLetterFontSize,
		firstLetterFontSizeUnit,
		firstLetterFontWeight,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'wp-block-sgs-text',
		style: buildEditorStyle( attributes ),
	} );

	// ---- Helpers for margin/padding responsive breakpoints ----
	// Each breakpoint writes 4 side attrs; unit is shared per axis.

	const marginAttrMap = {
		desktop: {
			Top: 'marginTop', Right: 'marginRight',
			Bottom: 'marginBottom', Left: 'marginLeft',
		},
		tablet: {
			Top: 'marginTopTablet', Right: 'marginRightTablet',
			Bottom: 'marginBottomTablet', Left: 'marginLeftTablet',
		},
		mobile: {
			Top: 'marginTopMobile', Right: 'marginRightMobile',
			Bottom: 'marginBottomMobile', Left: 'marginLeftMobile',
		},
	};

	const paddingAttrMap = {
		desktop: {
			Top: 'paddingTop', Right: 'paddingRight',
			Bottom: 'paddingBottom', Left: 'paddingLeft',
		},
		tablet: {
			Top: 'paddingTopTablet', Right: 'paddingRightTablet',
			Bottom: 'paddingBottomTablet', Left: 'paddingLeftTablet',
		},
		mobile: {
			Top: 'paddingTopMobile', Right: 'paddingRightMobile',
			Bottom: 'paddingBottomMobile', Left: 'paddingLeftMobile',
		},
	};

	return (
		<>
			<InspectorControls>
				{ /* ---- Colour ---- */ }
				<PanelBody
					title={ __( 'Colour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) =>
							setAttributes( { textColour: val ?? '' } )
						}
					/>
				</PanelBody>

				{ /* ---- Typography ---- */ }
				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					 * Font size + line height via shared TypographyControls.
					 * Handles: fontSize/fontSizeUnit/fontSizeTablet/fontSizeMobile
					 *           lineHeight/lineHeightUnit
					 *           fontWeight / fontStyle
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showSize={ true }
						showWeight={ true }
						showStyle={ true }
						showLineHeight={ true }
						showResponsive={ true }
					/>

					{ /* Line height tablet/mobile via ResponsiveControl (TypographyControls
					   handles only the desktop lineHeight; the Tablet/Mobile breakpoints
					   for line height are managed here since TypographyControls' lineHeight
					   control is a single UnitControl without a responsive switcher).
					   We attach it directly below TypographyControls. */ }
					<ResponsiveControl label={ __( 'Line height (tablet / mobile)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							if ( breakpoint === 'desktop' ) {
								return null; // desktop handled by TypographyControls above
							}
							const attrKey = breakpoint === 'tablet' ? 'lineHeightTablet' : 'lineHeightMobile';
							const val = breakpoint === 'tablet' ? lineHeightTablet : lineHeightMobile;
							return (
								<RangeControl
									label={ breakpoint === 'tablet'
										? __( 'Line height (tablet)', 'sgs-blocks' )
										: __( 'Line height (mobile)', 'sgs-blocks' )
									}
									value={ val ?? '' }
									onChange={ ( v ) => setAttributes( { [ attrKey ]: v } ) }
									min={ 0.8 }
									max={ 3 }
									step={ 0.05 }
									allowReset
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

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

					<SelectControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						options={ TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textDecoration: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text transform', 'sgs-blocks' ) }
						value={ textTransform }
						options={ TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textTransform: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Font family', 'sgs-blocks' ) }
						value={ fontFamily }
						onChange={ ( val ) =>
							setAttributes( { fontFamily: val } )
						}
						placeholder={ __( 'Inter, sans-serif', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
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
					/>
				</PanelBody>

				{ /* ---- Spacing ---- */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /* Margin — ResponsiveControl wraps all breakpoints */ }
					<ResponsiveControl label={ __( 'Margin', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const sideMap = marginAttrMap[ breakpoint ];
							const unit = marginUnit || 'px';
							return (
								<>
									{ [ 'Top', 'Right', 'Bottom', 'Left' ].map( ( side ) => (
										<RangeControl
											key={ sideMap[ side ] }
											label={ __( side, 'sgs-blocks' ) }
											value={ attributes[ sideMap[ side ] ] ?? '' }
											onChange={ ( v ) =>
												setAttributes( { [ sideMap[ side ] ]: v } )
											}
											min={ -100 }
											max={ 200 }
											step={ 1 }
											allowReset
											__nextHasNoMarginBottom
										/>
									) ) }
									{ breakpoint === 'desktop' && (
										<UnitControl
											label={ __( 'Margin unit', 'sgs-blocks' ) }
											value={ composeUnit( undefined, unit ) || unit }
											units={ SPACING_UNITS }
											onChange={ ( raw ) => {
												const { unit: u } = parseUnit( raw, unit );
												setAttributes( { marginUnit: u } );
											} }
											__nextHasNoMarginBottom
										/>
									) }
								</>
							);
						} }
					</ResponsiveControl>

					{ /* Padding — ResponsiveControl wraps all breakpoints */ }
					<ResponsiveControl label={ __( 'Padding', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const sideMap = paddingAttrMap[ breakpoint ];
							const unit = paddingUnit || 'px';
							return (
								<>
									{ [ 'Top', 'Right', 'Bottom', 'Left' ].map( ( side ) => (
										<RangeControl
											key={ sideMap[ side ] }
											label={ __( side, 'sgs-blocks' ) }
											value={ attributes[ sideMap[ side ] ] ?? '' }
											onChange={ ( v ) =>
												setAttributes( { [ sideMap[ side ] ]: v } )
											}
											min={ 0 }
											max={ 200 }
											step={ 1 }
											allowReset
											__nextHasNoMarginBottom
										/>
									) ) }
									{ breakpoint === 'desktop' && (
										<UnitControl
											label={ __( 'Padding unit', 'sgs-blocks' ) }
											value={ composeUnit( undefined, unit ) || unit }
											units={ SPACING_UNITS }
											onChange={ ( raw ) => {
												const { unit: u } = parseUnit( raw, unit );
												setAttributes( { paddingUnit: u } );
											} }
											__nextHasNoMarginBottom
										/>
									) }
								</>
							);
						} }
					</ResponsiveControl>
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
							<DesignTokenPicker
								label={ __( 'First-letter colour', 'sgs-blocks' ) }
								value={ firstLetterColour }
								onChange={ ( val ) =>
									setAttributes( {
										firstLetterColour: val ?? '',
									} )
								}
							/>
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
