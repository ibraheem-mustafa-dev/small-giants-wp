import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Label block deprecations (newest first).
 *
 * v2 — variantStyle attribute removed in v0.2.0 (2026-06-01).
 *      The three cosmetic presets (plain / pill-fill / pill-wrap) became
 *      proper WP block-styles registered via register_block_style().
 *      WordPress serialises the active style as `is-style-{name}` inside
 *      the block's `className` attribute automatically.
 *
 *      isEligible: true for any saved block that still carries variantStyle
 *      and where the value is not 'plain' (plain was the default and produces
 *      no is-style class — the base state needs no migration).
 *
 *      migrate: strips variantStyle from attrs and appends `is-style-{value}`
 *      to className so the block-styles system picks it up correctly.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce real HTML driven by RichText.Content with
 *      CSS custom properties set as inline style vars on the root element.
 *      After the dynamic conversion, save() returns null and rendering
 *      is delegated entirely to render.php.
 *
 *      This entry covers all posts saved while the block was static.
 *      The attribute snapshot matches block.json v0.1.0.
 *
 *      migrate() is an identity pass-through — attributes did not change
 *      shape during the static→dynamic conversion.
 */

/**
 * Build the CSS custom property map for this block instance.
 * Reproduced verbatim from the pre-conversion save.js so WordPress can
 * re-serialise stored posts to verify the block content matches.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object}           React-compatible style object of CSS custom props.
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
		paddingTop,
		paddingRight,
		paddingBottom,
		paddingLeft,
		borderRadius,
		variantStyle,
	} = attributes;

	const style = {
		'--sgs-label-colour': colourVar( textColour ) || undefined,
		'--sgs-label-bg': colourVar( backgroundColour ) || undefined,
		'--sgs-label-font-size': fontSize
			? `${ fontSize }${ fontSizeUnit }`
			: undefined,
		'--sgs-label-font-weight': fontWeight || undefined,
		'--sgs-label-line-height': lineHeight
			? `${ lineHeight }${ lineHeightUnit }`
			: undefined,
		'--sgs-label-letter-spacing': letterSpacing
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		'--sgs-label-text-transform': textTransform || undefined,
		'--sgs-label-text-decoration': textDecoration || undefined,
		'--sgs-label-border-radius': `${ borderRadius }px`,
	};

	if ( variantStyle !== 'plain' ) {
		style[ '--sgs-label-padding' ] =
			`${ paddingTop }px ${ paddingRight }px ${ paddingBottom }px ${ paddingLeft }px`;
	}

	if ( fontFamily ) {
		style[ '--sgs-label-font-family' ] = fontFamily;
	}

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

/**
 * v2 — variantStyle attr → block-style className migration.
 *
 * Attributes snapshot: block.json v0.1.0 (with variantStyle still present).
 * save() returns null (dynamic block — unchanged from v0.1.0 onwards).
 */
const v2 = {
	attributes: {
		text:              { type: 'string', default: '' },
		tag:               { type: 'string', enum: [ 'span', 'p', 'div' ], default: 'span' },
		variantStyle:      { type: 'string', enum: [ 'plain', 'pill-fill', 'pill-wrap' ], default: 'plain' },
		textColour:        { type: 'string', default: 'primary' },
		backgroundColour:  { type: 'string', default: 'primary' },
		fontFamily:        { type: 'string', default: '' },
		fontSize:          { type: 'number', default: 12 },
		fontSizeUnit:      { type: 'string', default: 'px' },
		fontSizeTablet:    { type: 'number' },
		fontSizeMobile:    { type: 'number' },
		fontWeight:        { type: 'string', default: '600' },
		lineHeight:        { type: 'number', default: 1.2 },
		lineHeightUnit:    { type: 'string', default: 'em' },
		letterSpacing:     { type: 'number', default: 0.08 },
		letterSpacingUnit: { type: 'string', default: 'em' },
		textTransform:     { type: 'string', default: 'uppercase' },
		textDecoration:    { type: 'string', default: '' },
		paddingTop:        { type: 'number', default: 4 },
		paddingRight:      { type: 'number', default: 12 },
		paddingBottom:     { type: 'number', default: 4 },
		paddingLeft:       { type: 'number', default: 12 },
		borderRadius:      { type: 'number', default: 6 },
	},
	supports: {
		align: true,
		html: false,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: false },
	},
	/**
	 * Only run migration when variantStyle is a non-plain pill value.
	 * Plain is the base state and does not need an is-style class.
	 */
	isEligible( attrs ) {
		return !! attrs.variantStyle && attrs.variantStyle !== 'plain';
	},
	save() {
		// Dynamic block — save always returns null.
		return null;
	},
	migrate( attrs ) {
		const { variantStyle, className, ...rest } = attrs;
		const styleClass = `is-style-${ variantStyle }`;
		const mergedClass = className
			? [ className, styleClass ].join( ' ' )
			: styleClass;
		return { ...rest, className: mergedClass };
	},
};

const v1 = {
	attributes: {
		text:              { type: 'string', default: '' },
		tag:               { type: 'string', enum: [ 'span', 'p', 'div' ], default: 'span' },
		variantStyle:      { type: 'string', enum: [ 'plain', 'pill-fill', 'pill-wrap' ], default: 'plain' },
		textColour:        { type: 'string', default: 'primary' },
		backgroundColour:  { type: 'string', default: 'primary' },
		fontFamily:        { type: 'string', default: '' },
		fontSize:          { type: 'number', default: 12 },
		fontSizeUnit:      { type: 'string', default: 'px' },
		fontSizeTablet:    { type: 'number' },
		fontSizeMobile:    { type: 'number' },
		fontWeight:        { type: 'string', default: '600' },
		lineHeight:        { type: 'number', default: 1.2 },
		lineHeightUnit:    { type: 'string', default: 'em' },
		letterSpacing:     { type: 'number', default: 0.08 },
		letterSpacingUnit: { type: 'string', default: 'em' },
		textTransform:     { type: 'string', default: 'uppercase' },
		textDecoration:    { type: 'string', default: '' },
		paddingTop:        { type: 'number', default: 4 },
		paddingRight:      { type: 'number', default: 12 },
		paddingBottom:     { type: 'number', default: 4 },
		paddingLeft:       { type: 'number', default: 12 },
		borderRadius:      { type: 'number', default: 6 },
	},
	supports: {
		align: true,
		html: false,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: false },
	},
	save( { attributes } ) {
		const { text, tag, variantStyle } = attributes;

		const classNames = [
			'wp-block-sgs-label',
			`is-style-${ variantStyle }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( {
			className: classNames,
			style: buildStyle( attributes ),
		} );

		return (
			<RichText.Content
				{ ...blockProps }
				tagName={ tag }
				value={ text }
			/>
		);
	},
	migrate( attributes ) {
		// Attributes did not change shape — pass through unchanged.
		return attributes;
	},
};

export default [ v2, v1 ];
