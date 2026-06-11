/**
 * TypographyControls — shared, uniform typography UI for every SGS block.
 *
 * Extracted from the canonical sgs/text + sgs/heading pattern so that EVERY
 * block customises the SAME variables in the SAME way (Bean R-22-13, 2026-06-11):
 *   - Font size  → responsive RangeControl (desktop/tablet/mobile) + unit dropdown
 *                  (NOT a freeform text box, NOT a token-slug picker)
 *   - Font weight → SelectControl dropdown
 *   - Font style  → SelectControl dropdown (Normal / Italic)
 *   - Line height → responsive RangeControl + unit dropdown
 *
 * Parameterised by `prefix` so one component drives any element's typography:
 *   prefix ''       → fontSize / fontSizeUnit / fontSizeTablet / fontSizeMobile /
 *                     fontWeight / fontStyle / lineHeight / lineHeightUnit / …
 *   prefix 'label'  → labelFontSize / labelFontSizeUnit / labelFontSizeTablet / …
 *   prefix 'title'  → titleFontSize / …    prefix 'pill' → pillFontSize / …
 *
 * The matching CSS is emitted server-side by sgs_typography_css() in
 * includes/helpers-typography.php — one helper, one shape, every block.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl } from '@wordpress/components';

export const SGS_FONT_WEIGHT_OPTIONS = [
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

export const SGS_FONT_STYLE_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

export const SGS_FONT_SIZE_UNIT_OPTIONS = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

/**
 * Build the attribute name for a given prefix + base (camelCase).
 * prefix '' + 'FontSize' → 'fontSize' ; prefix 'label' + 'FontSize' → 'labelFontSize'.
 *
 * @param {string} prefix Attribute prefix ('' | 'label' | 'title' | …).
 * @param {string} base   PascalCase base ('FontSize', 'FontWeight', …).
 * @return {string} The attribute key.
 */
export function typographyAttrName( prefix, base ) {
	return prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
}

/**
 * The full set of attribute keys this component reads/writes for a prefix.
 * Use in a block's block.json generator or to register attrs — exported so a
 * block can spread the canonical set rather than hand-declaring each key.
 *
 * @param {string} prefix Attribute prefix.
 * @return {Object} Map of logical-name → attribute-key.
 */
export function typographyAttrKeys( prefix ) {
	return {
		fontSize: typographyAttrName( prefix, 'FontSize' ),
		fontSizeUnit: typographyAttrName( prefix, 'FontSizeUnit' ),
		fontSizeTablet: typographyAttrName( prefix, 'FontSizeTablet' ),
		fontSizeMobile: typographyAttrName( prefix, 'FontSizeMobile' ),
		fontWeight: typographyAttrName( prefix, 'FontWeight' ),
		fontStyle: typographyAttrName( prefix, 'FontStyle' ),
		lineHeight: typographyAttrName( prefix, 'LineHeight' ),
		lineHeightUnit: typographyAttrName( prefix, 'LineHeightUnit' ),
	};
}

/**
 * Uniform typography controls. Drop into any InspectorControls panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setter.
 * @param {string}   [props.prefix='']   Attribute prefix for this element.
 * @param {boolean}  [props.showSize=true]
 * @param {boolean}  [props.showWeight=true]
 * @param {boolean}  [props.showStyle=true]
 * @param {boolean}  [props.showLineHeight=true]
 * @param {boolean}  [props.showResponsive=true] Show tablet/mobile size rows.
 * @param {number}   [props.sizeMin=8]
 * @param {number}   [props.sizeMax=96]
 * @return {JSX.Element} Controls fragment.
 */
export default function TypographyControls( {
	attributes,
	setAttributes,
	prefix = '',
	showSize = true,
	showWeight = true,
	showStyle = true,
	showLineHeight = true,
	showResponsive = true,
	sizeMin = 8,
	sizeMax = 96,
} ) {
	const k = typographyAttrKeys( prefix );
	const set = ( key ) => ( val ) => setAttributes( { [ key ]: val } );

	return (
		<>
			{ showSize && (
				<>
					<p className="sgs-inspector-label">
						{ __( 'Font size', 'sgs-blocks' ) }
					</p>
					<div className="sgs-inspector-row">
						<RangeControl
							label={ __( 'Desktop', 'sgs-blocks' ) }
							value={ attributes[ k.fontSize ] ?? '' }
							onChange={ set( k.fontSize ) }
							min={ sizeMin }
							max={ sizeMax }
							step={ 1 }
							allowReset
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Unit', 'sgs-blocks' ) }
							value={ attributes[ k.fontSizeUnit ] || 'px' }
							options={ SGS_FONT_SIZE_UNIT_OPTIONS }
							onChange={ set( k.fontSizeUnit ) }
							__nextHasNoMarginBottom
						/>
					</div>
					{ showResponsive && (
						<div className="sgs-inspector-row">
							<RangeControl
								label={ __( 'Tablet', 'sgs-blocks' ) }
								value={ attributes[ k.fontSizeTablet ] ?? '' }
								onChange={ set( k.fontSizeTablet ) }
								min={ sizeMin }
								max={ sizeMax }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Mobile', 'sgs-blocks' ) }
								value={ attributes[ k.fontSizeMobile ] ?? '' }
								onChange={ set( k.fontSizeMobile ) }
								min={ sizeMin }
								max={ sizeMax }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
						</div>
					) }
				</>
			) }

			{ showWeight && (
				<SelectControl
					label={ __( 'Font weight', 'sgs-blocks' ) }
					value={ attributes[ k.fontWeight ] || '' }
					options={ SGS_FONT_WEIGHT_OPTIONS }
					onChange={ set( k.fontWeight ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showStyle && (
				<SelectControl
					label={ __( 'Font style', 'sgs-blocks' ) }
					value={ attributes[ k.fontStyle ] || '' }
					options={ SGS_FONT_STYLE_OPTIONS }
					onChange={ set( k.fontStyle ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showLineHeight && (
				<RangeControl
					label={ __( 'Line height', 'sgs-blocks' ) }
					value={ attributes[ k.lineHeight ] ?? '' }
					onChange={ set( k.lineHeight ) }
					min={ 0.8 }
					max={ 3 }
					step={ 0.1 }
					allowReset
					__nextHasNoMarginBottom
				/>
			) }
		</>
	);
}
