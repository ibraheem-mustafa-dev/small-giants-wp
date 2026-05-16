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
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG_OPTIONS = [
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'span (inline)', 'sgs-blocks' ), value: 'span' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
	{ label: __( 'blockquote', 'sgs-blocks' ), value: 'blockquote' },
	{ label: __( 'em (italic)', 'sgs-blocks' ), value: 'em' },
	{ label: __( 'strong (bold)', 'sgs-blocks' ), value: 'strong' },
];

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

const UNIT_OPTIONS_PX = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const UNIT_OPTIONS_EM = [
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
	{ label: 'px', value: 'px' },
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
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		text,
		tag,
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

	return (
		<>
			<InspectorControls>
				{ /* ---- Tag ---- */ }
				<PanelBody title={ __( 'Element', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'HTML tag', 'sgs-blocks' ) }
						value={ tag }
						options={ TAG_OPTIONS }
						onChange={ ( val ) => setAttributes( { tag: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

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
					{ /* Font size — responsive */ }
					<p className="sgs-inspector-label">
						{ __( 'Font size', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Desktop', 'sgs-blocks' ) }
							value={ fontSize ?? '' }
							onChange={ ( val ) =>
								setAttributes( { fontSize: val } )
							}
							min={ 8 }
							max={ 96 }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ fontSizeUnit }
							options={ UNIT_OPTIONS_PX }
							onChange={ ( val ) =>
								setAttributes( { fontSizeUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Tablet', 'sgs-blocks' ) }
							value={ fontSizeTablet ?? '' }
							onChange={ ( val ) =>
								setAttributes( { fontSizeTablet: val } )
							}
							min={ 8 }
							max={ 96 }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Mobile', 'sgs-blocks' ) }
							value={ fontSizeMobile ?? '' }
							onChange={ ( val ) =>
								setAttributes( { fontSizeMobile: val } )
							}
							min={ 8 }
							max={ 96 }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
						/>
					</div>

					<SelectControl
						label={ __( 'Font weight', 'sgs-blocks' ) }
						value={ fontWeight }
						options={ FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { fontWeight: val } )
						}
						__nextHasNoMarginBottom
					/>

					{ /* Line height — responsive */ }
					<p className="sgs-inspector-label">
						{ __( 'Line height', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Desktop', 'sgs-blocks' ) }
							value={ lineHeight ?? '' }
							onChange={ ( val ) =>
								setAttributes( { lineHeight: val } )
							}
							min={ 0.8 }
							max={ 3 }
							step={ 0.05 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ lineHeightUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) =>
								setAttributes( { lineHeightUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Tablet', 'sgs-blocks' ) }
							value={ lineHeightTablet ?? '' }
							onChange={ ( val ) =>
								setAttributes( { lineHeightTablet: val } )
							}
							min={ 0.8 }
							max={ 3 }
							step={ 0.05 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<RangeControl
							label={ __( 'Mobile', 'sgs-blocks' ) }
							value={ lineHeightMobile ?? '' }
							onChange={ ( val ) =>
								setAttributes( { lineHeightMobile: val } )
							}
							min={ 0.8 }
							max={ 3 }
							step={ 0.05 }
							allowReset
							__nextHasNoMarginBottom
						/>
					</div>

					{ /* Letter spacing */ }
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Letter spacing', 'sgs-blocks' ) }
							value={ letterSpacing ?? '' }
							onChange={ ( val ) =>
								setAttributes( { letterSpacing: val } )
							}
							min={ -0.1 }
							max={ 0.5 }
							step={ 0.01 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ letterSpacingUnit }
							options={ UNIT_OPTIONS_EM }
							onChange={ ( val ) =>
								setAttributes( { letterSpacingUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>

					<SelectControl
						label={ __( 'Font style', 'sgs-blocks' ) }
						value={ fontStyle }
						options={ FONT_STYLE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { fontStyle: val } )
						}
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
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							value={ maxWidth ?? '' }
							onChange={ ( val ) =>
								setAttributes( { maxWidth: val } )
							}
							min={ 0 }
							max={ 1600 }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ maxWidthUnit }
							options={ [
								...UNIT_OPTIONS_PX,
								{ label: '%', value: '%' },
								{ label: 'ch', value: 'ch' },
							] }
							onChange={ ( val ) =>
								setAttributes( { maxWidthUnit: val } )
							}
							__nextHasNoMarginBottom
						/>
					</div>
				</PanelBody>

				{ /* ---- Spacing ---- */ }
				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Margin unit', 'sgs-blocks' ) }
						value={ marginUnit }
						options={ UNIT_OPTIONS_PX }
						onChange={ ( val ) =>
							setAttributes( { marginUnit: val } )
						}
						__nextHasNoMarginBottom
					/>
					<p className="sgs-inspector-label">
						{ __( 'Margin — Desktop', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', marginTop, 'marginTop' ],
							[ 'Right', marginRight, 'marginRight' ],
							[ 'Bottom', marginBottom, 'marginBottom' ],
							[ 'Left', marginLeft, 'marginLeft' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ -100 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
					<p className="sgs-inspector-label">
						{ __( 'Margin — Tablet', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', marginTopTablet, 'marginTopTablet' ],
							[ 'Right', marginRightTablet, 'marginRightTablet' ],
							[ 'Bottom', marginBottomTablet, 'marginBottomTablet' ],
							[ 'Left', marginLeftTablet, 'marginLeftTablet' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ -100 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
					<p className="sgs-inspector-label">
						{ __( 'Margin — Mobile', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', marginTopMobile, 'marginTopMobile' ],
							[ 'Right', marginRightMobile, 'marginRightMobile' ],
							[ 'Bottom', marginBottomMobile, 'marginBottomMobile' ],
							[ 'Left', marginLeftMobile, 'marginLeftMobile' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ -100 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>

					<SelectControl
						label={ __( 'Padding unit', 'sgs-blocks' ) }
						value={ paddingUnit }
						options={ UNIT_OPTIONS_PX }
						onChange={ ( val ) =>
							setAttributes( { paddingUnit: val } )
						}
						__nextHasNoMarginBottom
					/>
					<p className="sgs-inspector-label">
						{ __( 'Padding — Desktop', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', paddingTop, 'paddingTop' ],
							[ 'Right', paddingRight, 'paddingRight' ],
							[ 'Bottom', paddingBottom, 'paddingBottom' ],
							[ 'Left', paddingLeft, 'paddingLeft' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ 0 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
					<p className="sgs-inspector-label">
						{ __( 'Padding — Tablet', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', paddingTopTablet, 'paddingTopTablet' ],
							[ 'Right', paddingRightTablet, 'paddingRightTablet' ],
							[ 'Bottom', paddingBottomTablet, 'paddingBottomTablet' ],
							[ 'Left', paddingLeftTablet, 'paddingLeftTablet' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ 0 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
					<p className="sgs-inspector-label">
						{ __( 'Padding — Mobile', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						{ [
							[ 'Top', paddingTopMobile, 'paddingTopMobile' ],
							[ 'Right', paddingRightMobile, 'paddingRightMobile' ],
							[ 'Bottom', paddingBottomMobile, 'paddingBottomMobile' ],
							[ 'Left', paddingLeftMobile, 'paddingLeftMobile' ],
						].map( ( [ label, val, key ] ) => (
							<RangeControl
								key={ key }
								label={ __( label, 'sgs-blocks' ) }
								value={ val ?? '' }
								onChange={ ( v ) =>
									setAttributes( { [ key ]: v } )
								}
								min={ 0 }
								max={ 200 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						) ) }
					</div>
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
							<div className="sgs-inspector-row">
								<RangeControl
									label={ __( 'First-letter size', 'sgs-blocks' ) }
									value={ firstLetterFontSize ?? '' }
									onChange={ ( val ) =>
										setAttributes( {
											firstLetterFontSize: val,
										} )
									}
									min={ 1 }
									max={ 10 }
									step={ 0.1 }
									allowReset
									__nextHasNoMarginBottom
								/>
								<SelectControl
									label={ __( 'Unit', 'sgs-blocks' ) }
									value={ firstLetterFontSizeUnit }
									options={ UNIT_OPTIONS_EM }
									onChange={ ( val ) =>
										setAttributes( {
											firstLetterFontSizeUnit: val,
										} )
									}
									__nextHasNoMarginBottom
								/>
							</div>
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
				tagName={ tag }
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
