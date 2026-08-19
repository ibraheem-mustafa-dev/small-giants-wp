/**
 * TypographyControls — shared, uniform typography UI for every SGS block.
 *
 * Extracted from the canonical sgs/text + sgs/heading pattern so that EVERY
 * block customises the SAME variables in the SAME way (Bean R-22-13, 2026-06-11).
 *
 * CANONICAL UI (device-icon switcher + integrated UnitControl):
 *   - Font size  → <ResponsiveControl> device-icon switcher wrapping a
 *                  <UnitControl __next40pxDefaultSize > whose displayed value combines the numeric
 *                  breakpoint attr with the shared FontSizeUnit string
 *                  (e.g. attr 18 + unit 'px' → '18px'). onChange: parse the
 *                  combined string back to number (breakpoint attr) + unit
 *                  (FontSizeUnit). When showResponsive=false, a single UnitControl
 *                  without the switcher wrapper.
 *   - Line height → single <UnitControl __next40pxDefaultSize > integrating LineHeight (number) +
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
 *   {prefix}FontSize        number   (e.g. 18)        — desktop; blocks that
 *                           opt in via fontSizePresets may ALSO store a theme
 *                           preset slug STRING (e.g. 'small') here — the PHP
 *                           side resolves it to var(--wp--preset--font-size--…)
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
import { useState } from '@wordpress/element';
import { Button, Flex, FlexItem, SelectControl } from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import ResponsiveControl from './ResponsiveControl';
import ResponsiveOverride from './ResponsiveOverride';
import { UnitControl } from './primitives';
import { makeResponsive } from '../utils/responsive';

/**
 * Is this stored attribute value the modern {desktop,tablet,mobile} OBJECT
 * shape (Spec 35 tier-object migration), rather than the legacy flat scalar?
 * `null` is deliberately excluded (typeof null === 'object' in JS) since a
 * `null` default on a legacy scalar attr means "inherit", not "tiered".
 *
 * @param {*} val Stored attribute value.
 * @return {boolean} True when tiered-object shaped.
 */
function isTieredValue( val ) {
	return val !== null && typeof val === 'object' && ! Array.isArray( val );
}

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
		fontFamily: typographyAttrName( prefix, 'FontFamily' ),
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
	// A string value is a theme preset slug (or a legacy raw-CSS size) — not
	// representable in the numeric UnitControl. Show blank rather than a
	// garbled concatenation like 'smallpx'.
	if ( typeof num === 'string' ) {
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
 * @param {boolean}  [props.fontSizePresets=false] Offer the theme.json preset
 *   scale as a dropdown. OPT-IN: only pass true when the block's
 *   {prefix}FontSize attr is typed ["number","string"] — on a number-only
 *   attr WP discards the stored slug at render (silent-discard class, D338).
 * @param {boolean}  [props.showFontFamily=false] Offer a font-family picker
 *   sourced from the theme.json `typography.fontFamilies` preset list (same
 *   opt-in shape as fontSizePresets). OPT-IN: only pass true when the block
 *   declares {prefix}FontFamily as a string attr — an undeclared attr is
 *   silently discarded by WP at render (D338), same trap fontSizePresets
 *   already guards against.
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
	fontSizePresets = false,
	showFontFamily = false,
	showDecoration = false,
	showTransform = false,
	showLetterSpacing = false,
	showHover = false,
} ) {
	const k = typographyAttrKeys( prefix );

	// Weight / Style / Line height / Letter spacing default COLLAPSED behind a
	// "More typography options" toggle (Bean-requested compact-by-default
	// pass, 2026-08-19) — mirrors WP core's own opt-in-via-menu disclosure
	// pattern rather than rendering all four unconditionally. Local UI state
	// only: it governs render visibility, never whether the attribute exists
	// or is reachable — a block that already has a value stored in one of
	// these four still shows it once expanded, same as before this change.
	const [ moreOpen, setMoreOpen ] = useState( false );
	const hasMoreFields = showWeight || showStyle || showLineHeight || showLetterSpacing;

	const [ themeFontFamilies ] = useSettings( 'typography.fontFamilies' );
	const fontFamilyOptions = [
		{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
		...( themeFontFamilies ?? [] ).map( ( f ) => ( {
			label: f.name || f.slug,
			value: f.fontFamily,
		} ) ),
	];

	// Each property's tier shape is read from the CURRENTLY STORED value, not
	// hardcoded per-block — the tier-object migration runs property-by-property,
	// so e.g. sgs/label has an object fontSize but a still-scalar lineHeight.
	const fontSizeRaw       = attributes[ k.fontSize ];
	const fontSizeIsTiered  = isTieredValue( fontSizeRaw );
	const lineHeightRaw     = attributes[ k.lineHeight ];
	const lineHeightIsTiered = isTieredValue( lineHeightRaw );
	const letterSpacingRaw  = attributes[ k.letterSpacing ];
	const letterSpacingIsTiered = isTieredValue( letterSpacingRaw );

	// Theme preset font-size scale (guard against null before settings load —
	// same pattern as SpacingControl.js). Hook must run unconditionally.
	const [ themeFontSizes ] = useSettings( 'typography.fontSizes' );
	const fontSizePresetOptions = [
		{ label: __( '— none —', 'sgs-blocks' ), value: '' },
		...( themeFontSizes ?? [] ).map( ( size ) => ( {
			label: `${ size.name || size.slug } (${ size.size })`,
			value: size.slug,
		} ) ),
	];

	/**
	 * onChange for the preset-size dropdown. A preset is global (no device
	 * tiers), so selecting one stores the slug string on the base attr and
	 * clears the tablet/mobile numeric tiers; '— none —' clears back to unset.
	 * Typing a numeric size afterwards overwrites the slug (mutual exclusion).
	 *
	 * @param {string} slug Preset slug or '' to clear.
	 */
	function onFontSizePresetChange( slug ) {
		if ( fontSizeIsTiered ) {
			setAttributes( {
				[ k.fontSize ]: slug ? makeResponsive( { desktop: slug } ) : makeResponsive( {} ),
			} );
			return;
		}
		setAttributes( {
			[ k.fontSize ]: slug || undefined,
			[ k.fontSizeTablet ]: undefined,
			[ k.fontSizeMobile ]: undefined,
		} );
	}

	const currentLetterSpacingUnit = attributes[ k.letterSpacingUnit ] || 'px';
	const currentLetterSpacingValue = letterSpacingIsTiered
		? letterSpacingRaw?.desktop
		: letterSpacingRaw;

	function onLetterSpacingChange( raw ) {
		const { num, unit } = parseUnitValue( raw, currentLetterSpacingUnit );
		if ( letterSpacingIsTiered ) {
			setAttributes( {
				[ k.letterSpacing ]: makeResponsive( { ...( letterSpacingRaw || {} ), desktop: num } ),
				[ k.letterSpacingUnit ]: unit,
			} );
			return;
		}
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
		if ( fontSizeIsTiered ) {
			setAttributes( {
				[ k.fontSize ]: makeResponsive( { ...( fontSizeRaw || {} ), [ breakpoint ]: num } ),
				[ k.fontSizeUnit ]: unit,
			} );
			return;
		}
		const attrKey = fontSizeAttrMap[ breakpoint ];
		setAttributes( {
			[ attrKey ]: num,
			[ k.fontSizeUnit ]: unit,
		} );
	}

	/**
	 * onChange for the font-size UnitControl in TIERED mode, writing only the
	 * active tier via ResponsiveOverride's setOwnValue.
	 *
	 * @param {Function} setOwnValue Writer for the active tier (from ResponsiveOverride).
	 * @param {string}   raw         Raw value from UnitControl onChange.
	 */
	function onFontSizeChangeTiered( setOwnValue, raw ) {
		const { num, unit } = parseUnitValue( raw, currentFontSizeUnit );
		setOwnValue( num );
		if ( unit !== currentFontSizeUnit ) {
			setAttributes( { [ k.fontSizeUnit ]: unit } );
		}
	}

	const currentLineHeightUnit = attributes[ k.lineHeightUnit ] !== undefined
		? attributes[ k.lineHeightUnit ]
		: '';
	const currentLineHeightValue = lineHeightIsTiered
		? lineHeightRaw?.desktop
		: lineHeightRaw;

	/**
	 * onChange for the line-height UnitControl.
	 * Writes the numeric part to lineHeight and the unit to lineHeightUnit.
	 * The PHP helper emits the number with no suffix when unit === '' (unitless).
	 *
	 * @param {string} raw Raw value from UnitControl onChange.
	 */
	function onLineHeightChange( raw ) {
		const { num, unit } = parseUnitValue( raw, currentLineHeightUnit );
		if ( lineHeightIsTiered ) {
			setAttributes( {
				[ k.lineHeight ]: makeResponsive( { ...( lineHeightRaw || {} ), desktop: num } ),
				[ k.lineHeightUnit ]: unit,
			} );
			return;
		}
		setAttributes( {
			[ k.lineHeight ]: num,
			[ k.lineHeightUnit ]: unit,
		} );
	}

	// Font size, in whichever of the 3 shapes applies (tiered / responsive /
	// static) — extracted to a variable so it can sit in a FlexItem paired
	// with Preset size below, instead of each shape owning its own full-width
	// row (Bean-requested compact pass, 2026-08-19).
	let fontSizeField = null;
	if ( showSize && showResponsive && fontSizeIsTiered ) {
		fontSizeField = (
			<ResponsiveOverride
				label={ __( 'Font size', 'sgs-blocks' ) }
				value={ fontSizeRaw }
				onChange={ ( obj ) => setAttributes( { [ k.fontSize ]: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<UnitControl
						label={ __( 'Font size', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ composeUnitValue( inherited ? undefined : ownValue, currentFontSizeUnit ) }
						placeholder={ inherited ? composeUnitValue( effectiveValue, currentFontSizeUnit ) : undefined }
						units={ FONT_SIZE_UNITS }
						onChange={ ( val ) => onFontSizeChangeTiered( setOwnValue, val ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveOverride>
		);
	} else if ( showSize && showResponsive && ! fontSizeIsTiered ) {
		fontSizeField = (
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
						__next40pxDefaultSize
					/>
				) }
			</ResponsiveControl>
		);
	} else if ( showSize && ! showResponsive ) {
		fontSizeField = (
			<UnitControl
				label={ __( 'Font size', 'sgs-blocks' ) }
				value={ composeUnitValue(
					fontSizeIsTiered ? fontSizeRaw?.desktop : attributes[ k.fontSize ],
					currentFontSizeUnit
				) }
				units={ FONT_SIZE_UNITS }
				onChange={ ( val ) => onFontSizeChange( 'desktop', val ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		);
	}

	return (
		<>
			{ /* Preset size + Font size share one row, half-width each — both are
			     measurement/selection controls for the SAME property, so pairing
			     them (rather than each taking a full-width row) halves the height
			     this pair costs without losing either field. */ }
			{ ( ( showSize && fontSizePresets ) || fontSizeField ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showSize && fontSizePresets && (
						<FlexItem isBlock>
							<SelectControl
								label={ __( 'Preset size', 'sgs-blocks' ) }
								value={ ( () => {
									const desktopVal = fontSizeIsTiered ? fontSizeRaw?.desktop : attributes[ k.fontSize ];
									return typeof desktopVal === 'string' ? desktopVal : '';
								} )() }
								options={ fontSizePresetOptions }
								onChange={ onFontSizePresetChange }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
					{ fontSizeField && <FlexItem isBlock>{ fontSizeField }</FlexItem> }
				</Flex>
			) }

			{ showFontFamily && (
				<SelectControl
					label={ __( 'Font family', 'sgs-blocks' ) }
					value={ attributes[ k.fontFamily ] || '' }
					options={ fontFamilyOptions }
					onChange={ ( val ) => setAttributes( { [ k.fontFamily ]: val || undefined } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }

			{ /* Weight / Style / Line height / Letter spacing default COLLAPSED —
			     see the moreOpen state comment above the function body. Whatever
			     is already stored keeps working the moment this is expanded; this
			     toggle only changes what renders by default, never what exists. */ }
			{ hasMoreFields && (
				<Button
					variant="link"
					onClick={ () => setMoreOpen( ( v ) => ! v ) }
					aria-expanded={ moreOpen }
					style={ { marginBottom: '8px' } }
				>
					{ moreOpen
						? __( 'Hide weight, style & spacing', 'sgs-blocks' )
						: __( 'More typography options', 'sgs-blocks' ) }
				</Button>
			) }

			{ moreOpen && ( showWeight || showStyle ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showWeight && (
						<FlexItem isBlock>
							<SelectControl
								label={ __( 'Weight', 'sgs-blocks' ) }
								value={ attributes[ k.fontWeight ] || '' }
								options={ SGS_FONT_WEIGHT_OPTIONS }
								onChange={ ( val ) => setAttributes( { [ k.fontWeight ]: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
					{ showStyle && (
						<FlexItem isBlock>
							<SelectControl
								label={ __( 'Style', 'sgs-blocks' ) }
								value={ attributes[ k.fontStyle ] || '' }
								options={ SGS_FONT_STYLE_OPTIONS }
								onChange={ ( val ) => setAttributes( { [ k.fontStyle ]: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
				</Flex>
			) }

			{ moreOpen && ( showLineHeight || showLetterSpacing ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showLineHeight && (
						<FlexItem isBlock>
							<UnitControl
								label={ __( 'Line height', 'sgs-blocks' ) }
								value={ composeUnitValue(
									currentLineHeightValue,
									currentLineHeightUnit
								) }
								units={ LINE_HEIGHT_UNITS }
								onChange={ onLineHeightChange }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
					{ showLetterSpacing && (
						<FlexItem isBlock>
							<UnitControl
								label={ __( 'Letter spacing', 'sgs-blocks' ) }
								value={ composeUnitValue(
									currentLetterSpacingValue,
									currentLetterSpacingUnit
								) }
								units={ LETTER_SPACING_UNITS }
								onChange={ onLetterSpacingChange }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
				</Flex>
			) }

			{ ( showDecoration || showTransform ) && (
				<Flex gap={ 2 } align="flex-start">
					{ showDecoration && (
						<FlexItem isBlock>
							<SelectControl
								label={ __( 'Decoration', 'sgs-blocks' ) }
								value={ attributes[ k.textDecoration ] || '' }
								options={ SGS_TEXT_DECORATION_OPTIONS }
								onChange={ ( val ) => setAttributes( { [ k.textDecoration ]: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
					{ showTransform && (
						<FlexItem isBlock>
							<SelectControl
								label={ __( 'Transform', 'sgs-blocks' ) }
								value={ attributes[ k.textTransform ] || '' }
								options={ SGS_TEXT_TRANSFORM_OPTIONS }
								onChange={ ( val ) => setAttributes( { [ k.textTransform ]: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FlexItem>
					) }
				</Flex>
			) }

			{ /* Hover typography (D309). Opt-in: only render for a block that
			     DECLARES + renders the {prop}Hover companions, else the
			     dead-control gate flags it. Paired into one compact row, same
			     as the base fields above — three narrow SelectControls with
			     short labels fit comfortably at the standard sidebar width. */ }
			{ showHover && (
				<Flex gap={ 2 } align="flex-start">
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Decoration (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.textDecorationHover ] || '' }
							options={ SGS_TEXT_DECORATION_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.textDecorationHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Transform (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.textTransformHover ] || '' }
							options={ SGS_TEXT_TRANSFORM_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.textTransformHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
					<FlexItem isBlock>
						<SelectControl
							label={ __( 'Weight (hover)', 'sgs-blocks' ) }
							value={ attributes[ k.fontWeightHover ] || '' }
							options={ SGS_FONT_WEIGHT_OPTIONS }
							onChange={ ( val ) => setAttributes( { [ k.fontWeightHover ]: val } ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexItem>
				</Flex>
			) }
		</>
	);
}
