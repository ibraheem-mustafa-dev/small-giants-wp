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
import { DesignTokenPicker, TypographyControls, ResponsiveBoxControl } from '../../components';
import { colourVar } from '../../utils';

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
		backgroundColour,
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
	const paddingPreview = boxShorthand( padding );

	const previewStyle = {
		color: colourVar( textColour ) || undefined,
		fontFamily: fontFamily || undefined,
		fontSize: fontSize ? `${ fontSize }${ fontSizeUnit }` : undefined,
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
	const hasRadius = borderRadius !== undefined && borderRadius !== null &&
		borderRadius !== '' && Number( borderRadius ) !== 0;
	previewStyle.borderRadius = hasRadius ? `${ borderRadius }px` : undefined;

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
		backgroundColour,
		fontSize,
		fontSizeUnit,
		fontSizeTablet,
		fontSizeMobile,
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
		paddingTablet,
		paddingMobile,
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
			<InspectorControls>
				<PanelBody
					title={ __( 'Colour', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ textColour }
						onChange={ ( val ) =>
							setAttributes( { textColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Background colour', 'sgs-blocks' ) }
						value={ backgroundColour }
						onChange={ ( val ) =>
							setAttributes( { backgroundColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Typography', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ /*
					 * Font size (responsive: desktop/tablet/mobile) via TypographyControls.
					 * Handles: fontSize/fontSizeUnit/fontSizeTablet/fontSizeMobile
					 * showWeight=false because label uses its own weight SelectControl below
					 * (fontWeight options are a restricted subset, not the full weight set).
					 * showLineHeight=false / showStyle=false because those use UnitControl below.
					 */ }
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showSize={ true }
						showWeight={ false }
						showStyle={ false }
						showLineHeight={ false }
						showResponsive={ true }
					/>

					<SelectControl
						label={ __( 'Font weight', 'sgs-blocks' ) }
						value={ fontWeight }
						options={ FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { fontWeight: val } )
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

					{ /* Line height — UnitControl (number + unit in one input) */ }
					<UnitControl
						label={ __( 'Line height', 'sgs-blocks' ) }
						value={ composeUnit( lineHeight, lineHeightUnit ) }
						units={ LINE_HEIGHT_UNITS }
						onChange={ ( raw ) => {
							const { num, unit } = parseUnit( raw, lineHeightUnit !== undefined ? lineHeightUnit : '' );
							setAttributes( { lineHeight: num, lineHeightUnit: unit } );
						} }
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

					<TextControl
						label={ __( 'Text decoration', 'sgs-blocks' ) }
						value={ textDecoration }
						onChange={ ( val ) =>
							setAttributes( { textDecoration: val } )
						}
						placeholder={ __( 'none', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
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
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { textAlign: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

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
					<RangeControl
						label={ __( 'Border radius (px)', 'sgs-blocks' ) }
						value={ borderRadius }
						onChange={ ( val ) =>
							setAttributes( { borderRadius: val } )
						}
						min={ 0 }
						max={ 50 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: padding ?? {},
							tablet: paddingTablet ?? {},
							mobile: paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( 'base' === tier ) {
								setAttributes( { padding: next } );
							} else {
								setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
							}
						} }
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Spacing', 'sgs-blocks' ) }
					initialOpen={ false }
				>
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
