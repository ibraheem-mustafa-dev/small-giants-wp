/**
 * TypographyControls — shared, uniform typography UI for every SGS block.
 *
 * Extracted from the canonical sgs/text + sgs/heading pattern so that EVERY
 * block customises the SAME variables in the SAME way (Bean R-22-13, 2026-06-11).
 *
 * CANONICAL UI (device-icon switcher + integrated UnitControl):
 *   - Font size  → <ResponsiveControl> device-icon switcher wrapping a
 *                  <UnitControl> whose displayed value combines the numeric
 *                  breakpoint attr with the shared FontSizeUnit string
 *                  (e.g. attr 18 + unit 'px' → '18px'). onChange: parse the
 *                  combined string back to number (breakpoint attr) + unit
 *                  (FontSizeUnit). When showResponsive=false, a single UnitControl
 *                  without the switcher wrapper.
 *   - Line height → single <UnitControl> integrating LineHeight (number) +
 *                  LineHeightUnit (string). The PHP helper emits the unit verbatim:
 *                  '' = unitless (e.g. 1.5 with no suffix), any string = suffixed.
 *                  UnitControl stores '' for the "—" (unitless) option which maps
 *                  to the PHP helper's empty-string semantic (unitless).
 *   - Font weight → SelectControl dropdown (enumerations are fine as dropdowns)
 *   - Font style  → SelectControl dropdown (Normal / Italic)
 *
 * Parameterised by `prefix` so one component drives any element's typography:
 *   prefix ''       → fontSize / fontSizeUnit / fontSizeTablet / fontSizeMobile /
 *                     fontWeight / fontStyle / lineHeight / lineHeightUnit / …
 *   prefix 'label'  → labelFontSize / labelFontSizeUnit / labelFontSizeTablet / …
 *   prefix 'title'  → titleFontSize / …    prefix 'pill' → pillFontSize / …
 *
 * Attribute shape (UNCHANGED — consumers + PHP helper work with zero changes):
 *   {prefix}FontSize        number   (e.g. 18)        — desktop
 *   {prefix}FontSizeUnit    string   (px|em|rem)       — shared across breakpoints
 *   {prefix}FontSizeTablet  number
 *   {prefix}FontSizeMobile  number
 *   {prefix}FontWeight      string   (100–900 | '')
 *   {prefix}FontStyle       string   (normal|italic | '')
 *   {prefix}LineHeight      number   (e.g. 1.5)
 *   {prefix}LineHeightUnit  string   (em|rem|px | '')  — unitless when empty
 *
 * The matching CSS is emitted server-side by sgs_typography_css_rule() in
 * includes/helpers-typography.php — one helper, one shape, every block.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, __experimentalUnitControl as UnitControl } from '@wordpress/components';
import ResponsiveControl from './ResponsiveControl';

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

// text-decoration / text-transform enums (match the PHP helper's allowlists in
// sgs_typography_css_rule — none/underline/line-through/overline and
// none/uppercase/lowercase/capitalize). '' = inherit (emit nothing).
export const SGS_TEXT_DECORATION_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
	{ label: __( 'Overline', 'sgs-blocks' ), value: 'overline' },
];

export const SGS_TEXT_TRANSFORM_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'UPPERCASE', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

// Units for the letter-spacing UnitControl (px/em; '' clears).
const LETTER_SPACING_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];

/**
 * Units available in the font-size UnitControl.
 * Matching the PHP helper's accepted unit set (px/em/rem, stripped to [a-z]).
 */
const FONT_SIZE_UNITS = [
	{ value: 'px', label: 'px', default: 16 },
	{ value: 'em', label: 'em', default: 1 },
	{ value: 'rem', label: 'rem', default: 1 },
];

/**
 * Units available in the line-height UnitControl.
 * '' = unitless (the PHP helper emits the number with no suffix when the unit
 * string is '' — e.g. line-height:1.5 for a pleasing ratio default).
 * UnitControl uses an empty string for the "—" pseudo-unit option, which maps
 * exactly to the helper's empty-string → unitless semantic.
 */
const LINE_HEIGHT_UNITS = [
	{ value: '', label: '—', default: 1.5 },
	{ value: 'em', label: 'em', default: 1.5 },
	{ value: 'rem', label: 'rem', default: 1.5 },
	{ value: 'px', label: 'px', default: 24 },
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
		textDecoration: typographyAttrName( prefix, 'TextDecoration' ),
		textTransform: typographyAttrName( prefix, 'TextTransform' ),
		letterSpacing: typographyAttrName( prefix, 'LetterSpacing' ),
		letterSpacingUnit: typographyAttrName( prefix, 'LetterSpacingUnit' ),
		// Hover companions (D309). Consumed only when showHover is enabled AND the
		// block declares + renders them (else the dead-control gate flags it).
		fontWeightHover: typographyAttrName( prefix, 'FontWeightHover' ),
		textDecorationHover: typographyAttrName( prefix, 'TextDecorationHover' ),
		textTransformHover: typographyAttrName( prefix, 'TextTransformHover' ),
	};
}

/**
 * Compose a UnitControl display value from a numeric attr + a unit string.
 * Returns '' when the number attr is absent/empty so UnitControl shows blank
 * (allowing the user to perceive "unset" correctly).
 *
 * @param {number|undefined} num  The numeric attribute value.
 * @param {string}           unit The unit string (e.g. 'px', 'em', 'rem').
 * @return {string} Combined value string or ''.
 */
function composeUnitValue( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

/**
 * Parse a UnitControl onChange value (e.g. '18px', '1.2em', '24') into its
 * numeric and unit parts. Returns { num: number|undefined, unit: string }.
 * When the string is empty/null, returns { num: undefined, unit } preserving
 * the current unit so it is not wiped on clear.
 *
 * @param {string} raw         Raw string from UnitControl onChange.
 * @param {string} currentUnit The currently-stored unit (used when raw is empty).
 * @return {{ num: number|undefined, unit: string }}
 */
function parseUnitValue( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	// Match leading number (int or float), optional unit suffix.
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	// Couldn't parse — treat as clear.
	return { num: undefined, unit: currentUnit || 'px' };
}

/**
 * Uniform typography controls. Drop into any InspectorControls panel.
 *
 * Renders:
 *   - Font size: ResponsiveControl (device-icon switcher) → UnitControl
 *     (number + unit in one input). showResponsive=false → single UnitControl.
 *   - Line height: single UnitControl (number + unit; '' unit = unitless).
 *   - Font weight: SelectControl.
 *   - Font style: SelectControl.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setter.
 * @param {string}   [props.prefix='']   Attribute prefix for this element.
 * @param {boolean}  [props.showSize=true]
 * @param {boolean}  [props.showWeight=true]
 * @param {boolean}  [props.showStyle=true]
 * @param {boolean}  [props.showLineHeight=true]
 * @param {boolean}  [props.showResponsive=true] Show device-icon switcher for size.
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
	showDecoration = false,
	showTransform = false,
	showLetterSpacing = false,
	showHover = false,
} ) {
	const k = typographyAttrKeys( prefix );

	const currentLetterSpacingUnit = attributes[ k.letterSpacingUnit ] || 'px';

	function onLetterSpacingChange( raw ) {
		const { num, unit } = parseUnitValue( raw, currentLetterSpacingUnit );
		setAttributes( {
			[ k.letterSpacing ]: num,
			[ k.letterSpacingUnit ]: unit,
		} );
	}

	// Shared unit across all breakpoints. Default 'px' if unset.
	const currentFontSizeUnit = attributes[ k.fontSizeUnit ] || 'px';

	// Responsive breakpoint → attr key map (mirrors the PHP helper's responsive output).
	const fontSizeAttrMap = {
		desktop: k.fontSize,
		tablet: k.fontSizeTablet,
		mobile: k.fontSizeMobile,
	};

	/**
	 * onChange for the font-size UnitControl for a given breakpoint.
	 * Writes the numeric part to the breakpoint attr and the unit to fontSizeUnit.
	 *
	 * @param {string} breakpoint 'desktop'|'tablet'|'mobile'
	 * @param {string} raw        Raw value from UnitControl onChange.
	 */
	function onFontSizeChange( breakpoint, raw ) {
		const { num, unit } = parseUnitValue( raw, currentFontSizeUnit );
		const attrKey = fontSizeAttrMap[ breakpoint ];
		setAttributes( {
			[ attrKey ]: num,
			[ k.fontSizeUnit ]: unit,
		} );
	}

	const currentLineHeightUnit = attributes[ k.lineHeightUnit ] !== undefined
		? attributes[ k.lineHeightUnit ]
		: '';

	/**
	 * onChange for the line-height UnitControl.
	 * Writes the numeric part to lineHeight and the unit to lineHeightUnit.
	 * The PHP helper emits the number with no suffix when unit === '' (unitless).
	 *
	 * @param {string} raw Raw value from UnitControl onChange.
	 */
	function onLineHeightChange( raw ) {
		const { num, unit } = parseUnitValue( raw, currentLineHeightUnit );
		setAttributes( {
			[ k.lineHeight ]: num,
			[ k.lineHeightUnit ]: unit,
		} );
	}

	return (
		<>
			{ showSize && showResponsive && (
				<ResponsiveControl label={ __( 'Font size', 'sgs-blocks' ) }>
					{ ( breakpoint ) => (
						<UnitControl
							label={ __( 'Font size', 'sgs-blocks' ) }
							hideLabelFromVision
							value={ composeUnitValue(
								attributes[ fontSizeAttrMap[ breakpoint ] ],
								currentFontSizeUnit
							) }
							units={ FONT_SIZE_UNITS }
							onChange={ ( val ) => onFontSizeChange( breakpoint, val ) }
							__nextHasNoMarginBottom
						/>
					) }
				</ResponsiveControl>
			) }

			{ showSize && ! showResponsive && (
				<UnitControl
					label={ __( 'Font size', 'sgs-blocks' ) }
					value={ composeUnitValue(
						attributes[ k.fontSize ],
						currentFontSizeUnit
					) }
					units={ FONT_SIZE_UNITS }
					onChange={ ( val ) => onFontSizeChange( 'desktop', val ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showWeight && (
				<SelectControl
					label={ __( 'Font weight', 'sgs-blocks' ) }
					value={ attributes[ k.fontWeight ] || '' }
					options={ SGS_FONT_WEIGHT_OPTIONS }
					onChange={ ( val ) => setAttributes( { [ k.fontWeight ]: val } ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showStyle && (
				<SelectControl
					label={ __( 'Font style', 'sgs-blocks' ) }
					value={ attributes[ k.fontStyle ] || '' }
					options={ SGS_FONT_STYLE_OPTIONS }
					onChange={ ( val ) => setAttributes( { [ k.fontStyle ]: val } ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showLineHeight && (
				<UnitControl
					label={ __( 'Line height', 'sgs-blocks' ) }
					value={ composeUnitValue(
						attributes[ k.lineHeight ],
						currentLineHeightUnit
					) }
					units={ LINE_HEIGHT_UNITS }
					onChange={ onLineHeightChange }
					__nextHasNoMarginBottom
				/>
			) }

			{ showLetterSpacing && (
				<UnitControl
					label={ __( 'Letter spacing', 'sgs-blocks' ) }
					value={ composeUnitValue(
						attributes[ k.letterSpacing ],
						currentLetterSpacingUnit
					) }
					units={ LETTER_SPACING_UNITS }
					onChange={ onLetterSpacingChange }
					__nextHasNoMarginBottom
				/>
			) }

			{ showDecoration && (
				<SelectControl
					label={ __( 'Text decoration', 'sgs-blocks' ) }
					value={ attributes[ k.textDecoration ] || '' }
					options={ SGS_TEXT_DECORATION_OPTIONS }
					onChange={ ( val ) => setAttributes( { [ k.textDecoration ]: val } ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ showTransform && (
				<SelectControl
					label={ __( 'Text transform', 'sgs-blocks' ) }
					value={ attributes[ k.textTransform ] || '' }
					options={ SGS_TEXT_TRANSFORM_OPTIONS }
					onChange={ ( val ) => setAttributes( { [ k.textTransform ]: val } ) }
					__nextHasNoMarginBottom
				/>
			) }

			{ /* Hover typography (D309). Opt-in: only render for a block that
			     DECLARES + renders the {prop}Hover companions, else the
			     dead-control gate flags it. */ }
			{ showHover && (
				<>
					<SelectControl
						label={ __( 'Text decoration (hover)', 'sgs-blocks' ) }
						value={ attributes[ k.textDecorationHover ] || '' }
						options={ SGS_TEXT_DECORATION_OPTIONS }
						onChange={ ( val ) => setAttributes( { [ k.textDecorationHover ]: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Text transform (hover)', 'sgs-blocks' ) }
						value={ attributes[ k.textTransformHover ] || '' }
						options={ SGS_TEXT_TRANSFORM_OPTIONS }
						onChange={ ( val ) => setAttributes( { [ k.textTransformHover ]: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Font weight (hover)', 'sgs-blocks' ) }
						value={ attributes[ k.fontWeightHover ] || '' }
						options={ SGS_FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) => setAttributes( { [ k.fontWeightHover ]: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</>
	);
}
