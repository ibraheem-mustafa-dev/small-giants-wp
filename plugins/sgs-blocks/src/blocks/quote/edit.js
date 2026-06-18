/**
 * edit.js — Block editor component for sgs/quote.
 *
 * Provides editing surfaces for:
 * - Body paragraphs (array of RichText items + Add / Remove controls)
 * - Attribution string (single RichText + tag select)
 * - Body slot typography (colour, font size responsive, weight, style, etc.)
 * - Attribution slot typography
 * - Wrapper (background, border, radius, shadow, padding, margin, width)
 * - Hover state (scale, colour, background, shadow)
 * - Variant style select
 * - Inherit style toggle
 *
 * Primary use case is converter-emitted; the editor just needs to register
 * cleanly and allow manual authoring when needed.
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
	Button,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
import { colourVar } from '../../utils';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing only).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BODY_TAG_OPTIONS = [
	{ label: __( 'p (paragraph)', 'sgs-blocks' ), value: 'p' },
	{ label: __( 'div (block)', 'sgs-blocks' ), value: 'div' },
];

const ATTRIB_TAG_OPTIONS = [
	{ label: __( 'footer', 'sgs-blocks' ), value: 'footer' },
	{ label: __( 'div', 'sgs-blocks' ), value: 'div' },
	{ label: __( 'cite', 'sgs-blocks' ), value: 'cite' },
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

const FONT_SIZE_UNITS = [
	{ value: 'px', label: 'px', default: 16 },
	{ value: 'em', label: 'em', default: 1 },
	{ value: 'rem', label: 'rem', default: 1 },
];

const LINE_HEIGHT_UNITS = [
	{ value: 'em', label: 'em', default: 1.5 },
	{ value: 'rem', label: 'rem', default: 1.5 },
	{ value: 'px', label: 'px', default: 24 },
	{ value: '', label: '—', default: 1.5 },
];

const LETTER_SPACING_UNITS = [
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'px', label: 'px', default: 0 },
];

const MARGIN_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
];

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
];

// ---------------------------------------------------------------------------
// Helpers
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
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] !== undefined ? match[ 2 ] : ( currentUnit || 'px' );
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

// ---------------------------------------------------------------------------
// Editor preview style builder — desktop styles only; responsive via PHP
// ---------------------------------------------------------------------------

function buildWrapperStyle( attributes ) {
	const {
		inheritStyle,
		backgroundColour,
		borderRadius,
		borderRadiusUnit,
		borderStyle,
		borderColour,
		marginTop, marginRight, marginBottom, marginLeft, marginUnit,
		paddingTop, paddingRight, paddingBottom, paddingLeft, paddingUnit,
		maxWidth,
	} = attributes;

	if ( inheritStyle ) {
		return {};
	}

	const style = {};

	if ( backgroundColour ) {
		style.backgroundColor = /^#|^rgb|^hsl/.test( backgroundColour )
			? backgroundColour
			: colourVar( backgroundColour );
	}
	if ( borderRadius != null ) {
		style.borderRadius = `${ borderRadius }${ borderRadiusUnit }`;
	}
	if ( borderStyle && borderStyle !== 'none' ) {
		style.borderStyle = borderStyle;
		if ( borderColour ) {
			style.borderColor = /^#|^rgb|^hsl/.test( borderColour )
				? borderColour
				: colourVar( borderColour );
		}
	}
	if ( marginTop != null ) { style.marginTop = `${ marginTop }${ marginUnit }`; }
	if ( marginRight != null ) { style.marginRight = `${ marginRight }${ marginUnit }`; }
	if ( marginBottom != null ) { style.marginBottom = `${ marginBottom }${ marginUnit }`; }
	if ( marginLeft != null ) { style.marginLeft = `${ marginLeft }${ marginUnit }`; }
	if ( paddingTop != null ) { style.paddingTop = `${ paddingTop }${ paddingUnit }`; }
	if ( paddingRight != null ) { style.paddingRight = `${ paddingRight }${ paddingUnit }`; }
	if ( paddingBottom != null ) { style.paddingBottom = `${ paddingBottom }${ paddingUnit }`; }
	if ( paddingLeft != null ) { style.paddingLeft = `${ paddingLeft }${ paddingUnit }`; }
	if ( maxWidth ) { style.maxWidth = maxWidth; }

	return style;
}

function buildBodyStyle( attributes ) {
	const {
		bodyColour, bodyFontSize, bodyFontSizeUnit, bodyFontWeight,
		bodyFontStyle, bodyLineHeight, bodyLineHeightUnit,
		bodyLetterSpacing, bodyLetterSpacingUnit, bodyMarginBottom, bodyMarginUnit,
	} = attributes;
	const style = {};
	if ( bodyColour ) {
		style.color = /^#|^rgb|^hsl/.test( bodyColour ) ? bodyColour : colourVar( bodyColour );
	}
	if ( bodyFontSize ) { style.fontSize = `${ bodyFontSize }${ bodyFontSizeUnit }`; }
	if ( bodyFontWeight ) { style.fontWeight = bodyFontWeight; }
	if ( bodyFontStyle ) { style.fontStyle = bodyFontStyle; }
	if ( bodyLineHeight != null ) { style.lineHeight = `${ bodyLineHeight }${ bodyLineHeightUnit }`; }
	if ( bodyLetterSpacing != null ) { style.letterSpacing = `${ bodyLetterSpacing }${ bodyLetterSpacingUnit }`; }
	if ( bodyMarginBottom != null ) { style.marginBottom = `${ bodyMarginBottom }${ bodyMarginUnit }`; }
	return style;
}

function buildAttribStyle( attributes ) {
	const {
		attributionColour, attributionFontSize, attributionFontSizeUnit,
		attributionFontWeight, attributionFontStyle,
		attributionLineHeight, attributionLineHeightUnit,
		attributionMarginTop, attributionMarginUnit,
	} = attributes;
	const style = {};
	if ( attributionColour ) {
		style.color = /^#|^rgb|^hsl/.test( attributionColour )
			? attributionColour
			: colourVar( attributionColour );
	}
	if ( attributionFontSize ) { style.fontSize = `${ attributionFontSize }${ attributionFontSizeUnit }`; }
	if ( attributionFontWeight ) { style.fontWeight = attributionFontWeight; }
	if ( attributionFontStyle ) { style.fontStyle = attributionFontStyle; }
	if ( attributionLineHeight != null ) {
		style.lineHeight = `${ attributionLineHeight }${ attributionLineHeightUnit }`;
	}
	if ( attributionMarginTop != null ) {
		style.marginTop = `${ attributionMarginTop }${ attributionMarginUnit }`;
	}
	return style;
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		body,
		bodyTag,
		bodyColour,
		bodyFontSize,
		bodyFontSizeTablet,
		bodyFontSizeMobile,
		bodyFontSizeUnit,
		bodyFontWeight,
		bodyFontFamily,
		bodyFontStyle,
		bodyTextDecoration,
		bodyTextTransform,
		bodyLineHeight,
		bodyLineHeightTablet,
		bodyLineHeightMobile,
		bodyLineHeightUnit,
		bodyLetterSpacing,
		bodyLetterSpacingUnit,
		bodyMarginBottom,
		bodyMarginBottomTablet,
		bodyMarginBottomMobile,
		bodyMarginUnit,
		attribution,
		attributionTag,
		attributionEnabled,
		attributionColour,
		attributionFontSize,
		attributionFontSizeTablet,
		attributionFontSizeMobile,
		attributionFontSizeUnit,
		attributionFontWeight,
		attributionFontFamily,
		attributionFontStyle,
		attributionTextDecoration,
		attributionTextTransform,
		attributionLineHeight,
		attributionLineHeightUnit,
		attributionMarginTop,
		attributionMarginTopTablet,
		attributionMarginTopMobile,
		attributionMarginUnit,
		backgroundColour,
		borderRadius,
		borderRadiusUnit,
		borderStyle,
		borderColour,
		boxShadow,
		boxShadowHover,
		hoverScale,
		hoverColour,
		hoverBackground,
		marginTop, marginRight, marginBottom, marginLeft, marginUnit,
		paddingTop, paddingRight, paddingBottom, paddingLeft, paddingUnit,
		inheritStyle,
		transitionDuration,
		transitionEasing,
	} = attributes;

	const blockProps = useBlockProps( {
		as: 'blockquote',
		className: 'wp-block-sgs-quote',
		style: buildWrapperStyle( attributes ),
	} );

	const bodyItems = Array.isArray( body ) ? body : [];

	function updateBodyItem( index, value ) {
		const updated = [ ...bodyItems ];
		updated[ index ] = value;
		setAttributes( { body: updated } );
	}

	function addBodyItem() {
		setAttributes( { body: [ ...bodyItems, '' ] } );
	}

	function removeBodyItem( index ) {
		const updated = bodyItems.filter( ( _, i ) => i !== index );
		setAttributes( { body: updated } );
	}

	const bodyStyle  = buildBodyStyle( attributes );
	const attribStyle = buildAttribStyle( attributes );

	// Per-breakpoint attr keys for body font size.
	const bodyFontSizeBreakpoints = {
		desktop: 'bodyFontSize',
		tablet: 'bodyFontSizeTablet',
		mobile: 'bodyFontSizeMobile',
	};

	// Per-breakpoint attr keys for body line height.
	const bodyLineHeightBreakpoints = {
		desktop: 'bodyLineHeight',
		tablet: 'bodyLineHeightTablet',
		mobile: 'bodyLineHeightMobile',
	};

	// Per-breakpoint attr keys for body margin-bottom.
	const bodyMarginBottomBreakpoints = {
		desktop: 'bodyMarginBottom',
		tablet: 'bodyMarginBottomTablet',
		mobile: 'bodyMarginBottomMobile',
	};

	// Per-breakpoint attr keys for attribution font size.
	const attributionFontSizeBreakpoints = {
		desktop: 'attributionFontSize',
		tablet: 'attributionFontSizeTablet',
		mobile: 'attributionFontSizeMobile',
	};

	// Per-breakpoint attr keys for attribution margin-top.
	const attributionMarginTopBreakpoints = {
		desktop: 'attributionMarginTop',
		tablet: 'attributionMarginTopTablet',
		mobile: 'attributionMarginTopMobile',
	};

	return (
		<>
			<InspectorControls>
				{ /* ---- Style ---- */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Inherit parent styles (suppress wrapper inline styles)', 'sgs-blocks' ) }
						checked={ inheritStyle }
						onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ---- Body slot ---- */ }
				<PanelBody
					title={ __( 'Body', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Paragraph tag', 'sgs-blocks' ) }
						value={ bodyTag }
						options={ BODY_TAG_OPTIONS }
						onChange={ ( val ) => setAttributes( { bodyTag: val } ) }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ bodyColour }
						onChange={ ( val ) => setAttributes( { bodyColour: val ?? '' } ) }
					/>
					<SelectControl
						label={ __( 'Font style', 'sgs-blocks' ) }
						value={ bodyFontStyle }
						options={ FONT_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { bodyFontStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Font weight', 'sgs-blocks' ) }
						value={ bodyFontWeight }
						options={ FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) => setAttributes( { bodyFontWeight: val } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Body font size — ResponsiveControl + UnitControl per breakpoint.
					   The shared unit (bodyFontSizeUnit) is written once; the breakpoint
					   UnitControl sets both the numeric attr and the shared unit. */ }
					<ResponsiveControl label={ __( 'Font size', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrKey = bodyFontSizeBreakpoints[ breakpoint ];
							const numVal = attributes[ attrKey ];
							const unitVal = bodyFontSizeUnit || 'px';
							return (
								<UnitControl
									label={ __( 'Font size', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ composeUnit( numVal, unitVal ) }
									units={ FONT_SIZE_UNITS }
									onChange={ ( raw ) => {
										const { num, unit } = parseUnit( raw, unitVal );
										setAttributes( {
											[ attrKey ]: num,
											bodyFontSizeUnit: unit,
										} );
									} }
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					{ /* Body line height — ResponsiveControl + RangeControl per breakpoint.
					   The shared unit (bodyLineHeightUnit) is set via UnitControl on desktop. */ }
					<ResponsiveControl label={ __( 'Line height', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrKey = bodyLineHeightBreakpoints[ breakpoint ];
							const numVal = attributes[ attrKey ];
							const unitVal = bodyLineHeightUnit || 'em';
							if ( breakpoint === 'desktop' ) {
								return (
									<UnitControl
										label={ __( 'Line height', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ composeUnit( numVal, unitVal ) }
										units={ LINE_HEIGHT_UNITS }
										onChange={ ( raw ) => {
											const { num, unit } = parseUnit( raw, unitVal );
											setAttributes( {
												bodyLineHeight: num,
												bodyLineHeightUnit: unit,
											} );
										} }
										__nextHasNoMarginBottom
									/>
								);
							}
							return (
								<RangeControl
									label={ breakpoint === 'tablet'
										? __( 'Line height (tablet)', 'sgs-blocks' )
										: __( 'Line height (mobile)', 'sgs-blocks' )
									}
									value={ numVal ?? '' }
									onChange={ ( val ) => setAttributes( { [ attrKey ]: val } ) }
									min={ 0.8 } max={ 3 } step={ 0.05 } allowReset
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>

					{ /* Letter spacing — UnitControl (number + unit in one input) */ }
					<UnitControl
						label={ __( 'Letter spacing', 'sgs-blocks' ) }
						value={ composeUnit( bodyLetterSpacing, bodyLetterSpacingUnit ) }
						units={ LETTER_SPACING_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, bodyLetterSpacingUnit || 'em' );
							setAttributes( { bodyLetterSpacing: num, bodyLetterSpacingUnit: unit } );
						} }
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ bodyTextDecoration }
						options={ TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { bodyTextDecoration: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text transform', 'sgs-blocks' ) }
						value={ bodyTextTransform }
						options={ TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) => setAttributes( { bodyTextTransform: val } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Font family', 'sgs-blocks' ) }
						value={ bodyFontFamily }
						onChange={ ( val ) => setAttributes( { bodyFontFamily: val } ) }
						placeholder={ __( 'Inter, sans-serif', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>

					{ /* Paragraph gap (margin-bottom) — ResponsiveControl + UnitControl per breakpoint */ }
					<ResponsiveControl label={ __( 'Paragraph gap (margin-bottom)', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrKey = bodyMarginBottomBreakpoints[ breakpoint ];
							const numVal = attributes[ attrKey ];
							const unitVal = bodyMarginUnit || 'px';
							if ( breakpoint === 'desktop' ) {
								return (
									<UnitControl
										label={ __( 'Gap', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ composeUnit( numVal, unitVal ) }
										units={ MARGIN_UNITS }
										onChange={ ( raw ) => {
											const { num, unit } = parseUnit( raw, unitVal );
											setAttributes( {
												bodyMarginBottom: num,
												bodyMarginUnit: unit,
											} );
										} }
										__nextHasNoMarginBottom
									/>
								);
							}
							return (
								<RangeControl
									label={ breakpoint === 'tablet'
										? __( 'Gap (tablet)', 'sgs-blocks' )
										: __( 'Gap (mobile)', 'sgs-blocks' )
									}
									value={ numVal ?? '' }
									onChange={ ( val ) => setAttributes( { [ attrKey ]: val } ) }
									min={ 0 } max={ 80 } step={ 1 } allowReset
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* ---- Attribution slot ---- */ }
				<PanelBody
					title={ __( 'Attribution', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show attribution', 'sgs-blocks' ) }
						checked={ attributionEnabled }
						onChange={ ( val ) => setAttributes( { attributionEnabled: val } ) }
						__nextHasNoMarginBottom
					/>
					{ attributionEnabled && (
						<>
							<SelectControl
								label={ __( 'HTML tag', 'sgs-blocks' ) }
								value={ attributionTag }
								options={ ATTRIB_TAG_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTag: val } ) }
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ attributionColour }
								onChange={ ( val ) => setAttributes( { attributionColour: val ?? '' } ) }
							/>
							<SelectControl
								label={ __( 'Font style', 'sgs-blocks' ) }
								value={ attributionFontStyle }
								options={ FONT_STYLE_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionFontStyle: val } ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Font weight', 'sgs-blocks' ) }
								value={ attributionFontWeight }
								options={ FONT_WEIGHT_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionFontWeight: val } ) }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution font size — ResponsiveControl + UnitControl per breakpoint */ }
							<ResponsiveControl label={ __( 'Font size', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrKey = attributionFontSizeBreakpoints[ breakpoint ];
									const numVal = attributes[ attrKey ];
									const unitVal = attributionFontSizeUnit || 'px';
									return (
										<UnitControl
											label={ __( 'Font size', 'sgs-blocks' ) }
											hideLabelFromVision
											value={ composeUnit( numVal, unitVal ) }
											units={ FONT_SIZE_UNITS }
											onChange={ ( raw ) => {
												const { num, unit } = parseUnit( raw, unitVal );
												setAttributes( {
													[ attrKey ]: num,
													attributionFontSizeUnit: unit,
												} );
											} }
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>

							<TextControl
								label={ __( 'Font family', 'sgs-blocks' ) }
								value={ attributionFontFamily }
								onChange={ ( val ) => setAttributes( { attributionFontFamily: val } ) }
								placeholder={ __( 'Inter, sans-serif', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Text decoration', 'sgs-blocks' ) }
								value={ attributionTextDecoration }
								options={ TEXT_DECORATION_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTextDecoration: val } ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Text transform', 'sgs-blocks' ) }
								value={ attributionTextTransform }
								options={ TEXT_TRANSFORM_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTextTransform: val } ) }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution line height — UnitControl (single, no responsive) */ }
							<UnitControl
								label={ __( 'Line height', 'sgs-blocks' ) }
								value={ composeUnit( attributionLineHeight, attributionLineHeightUnit ) }
								units={ LINE_HEIGHT_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, attributionLineHeightUnit || 'em' );
									setAttributes( { attributionLineHeight: num, attributionLineHeightUnit: unit } );
								} }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution margin-top — ResponsiveControl + UnitControl per breakpoint */ }
							<ResponsiveControl label={ __( 'Margin-top (gap above attribution)', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrKey = attributionMarginTopBreakpoints[ breakpoint ];
									const numVal = attributes[ attrKey ];
									const unitVal = attributionMarginUnit || 'px';
									if ( breakpoint === 'desktop' ) {
										return (
											<UnitControl
												label={ __( 'Margin-top', 'sgs-blocks' ) }
												hideLabelFromVision
												value={ composeUnit( numVal, unitVal ) }
												units={ MARGIN_UNITS }
												onChange={ ( raw ) => {
													const { num, unit } = parseUnit( raw, unitVal );
													setAttributes( {
														attributionMarginTop: num,
														attributionMarginUnit: unit,
													} );
												} }
												__nextHasNoMarginBottom
											/>
										);
									}
									return (
										<RangeControl
											label={ breakpoint === 'tablet'
												? __( 'Margin-top (tablet)', 'sgs-blocks' )
												: __( 'Margin-top (mobile)', 'sgs-blocks' )
											}
											value={ numVal ?? '' }
											onChange={ ( val ) => setAttributes( { [ attrKey ]: val } ) }
											min={ 0 } max={ 80 } step={ 1 } allowReset
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }
				</PanelBody>

				{ /* ---- Wrapper ---- */ }
				{ ! inheritStyle && (
					<PanelBody
						title={ __( 'Wrapper', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ backgroundColour }
							onChange={ ( val ) => setAttributes( { backgroundColour: val ?? '' } ) }
						/>
						{ /* Border radius — UnitControl (number + unit in one input) */ }
						<UnitControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							value={ composeUnit( borderRadius, borderRadiusUnit ) }
							units={ [
								{ value: 'px', label: 'px', default: 0 },
								{ value: 'em', label: 'em', default: 0 },
								{ value: 'rem', label: 'rem', default: 0 },
								{ value: '%', label: '%', default: 0 },
							] }
							onChange={ ( raw ) => {
								const { num, unit } = parseUnit( raw, borderRadiusUnit || 'px' );
								setAttributes( { borderRadius: num, borderRadiusUnit: unit } );
							} }
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Border style', 'sgs-blocks' ) }
							value={ borderStyle }
							options={ BORDER_STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
							__nextHasNoMarginBottom
						/>
						{ borderStyle !== 'none' && (
							<DesignTokenPicker
								label={ __( 'Border colour', 'sgs-blocks' ) }
								value={ borderColour }
								onChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
							/>
						) }
						<TextControl
							label={ __( 'Box shadow (desktop)', 'sgs-blocks' ) }
							value={ boxShadow }
							onChange={ ( val ) => setAttributes( { boxShadow: val } ) }
							placeholder={ __( '0 4px 12px rgba(0,0,0,0.1)', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
						<p className="sgs-inspector-label">{ __( 'Padding', 'sgs-blocks' ) }</p>
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
									onChange={ ( v ) => setAttributes( { [ key ]: v } ) }
									min={ 0 } max={ 200 } step={ 1 } allowReset
									__nextHasNoMarginBottom
								/>
							) ) }
						</div>
						<p className="sgs-inspector-label">{ __( 'Margin', 'sgs-blocks' ) }</p>
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
									onChange={ ( v ) => setAttributes( { [ key ]: v } ) }
									min={ -100 } max={ 200 } step={ 1 } allowReset
									__nextHasNoMarginBottom
								/>
							) ) }
						</div>
					</PanelBody>
				) }

				{ /* ---- Hover ---- */ }
				<PanelBody
					title={ __( 'Hover', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Scale on hover (e.g. 1.03)', 'sgs-blocks' ) }
						value={ hoverScale }
						onChange={ ( val ) => setAttributes( { hoverScale: val } ) }
						placeholder="1.03"
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Text colour on hover', 'sgs-blocks' ) }
						value={ hoverColour }
						onChange={ ( val ) => setAttributes( { hoverColour: val ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Background on hover', 'sgs-blocks' ) }
						value={ hoverBackground }
						onChange={ ( val ) => setAttributes( { hoverBackground: val ?? '' } ) }
					/>
					<TextControl
						label={ __( 'Box shadow on hover', 'sgs-blocks' ) }
						value={ boxShadowHover }
						onChange={ ( val ) => setAttributes( { boxShadowHover: val } ) }
						placeholder={ __( '0 8px 24px rgba(0,0,0,0.15)', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
						min={ 0 } max={ 1000 } step={ 50 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: 'ease-in-out', value: 'ease-in-out' },
							{ label: 'ease', value: 'ease' },
							{ label: 'ease-in', value: 'ease-in' },
							{ label: 'ease-out', value: 'ease-out' },
							{ label: 'linear', value: 'linear' },
						] }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* WS-4: width/spacing mirror from sgs/container (content kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
			</InspectorControls>

			{ /* Canvas */ }
			<blockquote { ...blockProps }>
				{ bodyItems.map( ( item, index ) => (
					<div
						key={ index }
						className="wp-block-sgs-quote__body-row"
					>
						<RichText
							tagName={ bodyTag }
							className="wp-block-sgs-quote__body"
							style={ bodyStyle }
							value={ item }
							onChange={ ( val ) => updateBodyItem( index, val ) }
							placeholder={ __( 'Body paragraph…', 'sgs-blocks' ) }
							allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
						/>
						{ bodyItems.length > 1 && (
							<Button
								isSmall
								isDestructive
								onClick={ () => removeBodyItem( index ) }
								style={ { marginBottom: '4px' } }
							>
								{ __( 'Remove paragraph', 'sgs-blocks' ) }
							</Button>
						) }
					</div>
				) ) }
				<Button
					variant="secondary"
					isSmall
					onClick={ addBodyItem }
					style={ { marginBottom: '8px' } }
				>
					{ __( '+ Add paragraph', 'sgs-blocks' ) }
				</Button>
				{ attributionEnabled && (
					<RichText
						tagName={ attributionTag }
						className="wp-block-sgs-quote__attribution"
						style={ attribStyle }
						value={ attribution }
						onChange={ ( val ) => setAttributes( { attribution: val } ) }
						placeholder={ __( '— Attribution…', 'sgs-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					/>
				) }
			</blockquote>
		</>
	);
}
