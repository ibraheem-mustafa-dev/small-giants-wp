import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Heading block deprecations.
 *
 * v3 — Single-element schema (block.json v0.4.0) with the variantStyle attr.
 *      In 2026-06-01 variantStyle was retired in favour of WP-native block
 *      styles (is-style-*). This entry migrates any post saved while the
 *      v0.4.0 schema was active that has a non-default variantStyle value.
 *      The variantStyle value is moved into `className` as `is-style-{value}`
 *      so the correct block-style CSS fires automatically.
 *
 * v2 — Dynamic-render composite schema (block.json v0.3.0).
 *      The block became dynamic in 2026-05-21 (save returns null).
 *      In 2026-05-26 the composite label/headline/sub attrs were replaced
 *      with a single-element headingRole + content schema (v0.4.0).
 *      This entry migrates old composite posts to the new schema.
 *      The old label and sub content is lost in migration — the block
 *      patterns (sgs/label-heading-subheading-cluster and
 *      sgs/heading-subheading-cluster) provide the new visual cluster.
 *
 * v1 — Static save shape from before the dynamic conversion (2026-05-21).
 *      save.js used to produce real HTML driven by RichText.Content.
 *      After the dynamic conversion save() returns null; after the v0.4.0
 *      single-element refactor the attribute schema changed further.
 *      This entry covers all posts saved while the block was static.
 */

// ─── v3: single-element v0.4.0 → v0.5.0 (variantStyle → is-style-*) ─────────

const v3 = {
	/**
	 * The v0.4.0 attribute schema — identical to current except it includes
	 * `variantStyle`. All other attrs pass through unchanged.
	 */
	attributes: {
		headingRole:         { type: 'string', enum: [ 'heading', 'subheading' ], default: 'heading', role: 'content' },
		content:             { type: 'string', default: '', role: 'content' },
		level:               { type: 'string', enum: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ], default: 'h2' },
		subTag:              { type: 'string', enum: [ 'p', 'div' ], default: 'p' },
		anchor:              { type: 'string', default: '' },

		fontFamily:          { type: 'string', default: '' },
		fontSize:            { type: 'number', default: 28 },
		fontSizeUnit:        { type: 'string', default: 'px' },
		fontSizeTablet:      { type: 'number' },
		fontSizeMobile:      { type: 'number' },
		fontWeight:          { type: 'string', default: '700' },
		lineHeight:          { type: 'number' },
		lineHeightUnit:      { type: 'string', default: 'em' },
		letterSpacing:       { type: 'number' },
		letterSpacingUnit:   { type: 'string', default: 'em' },
		textTransform:       { type: 'string', default: '' },
		textColour:          { type: 'string', default: 'text' },
		fontStyle:           { type: 'string', enum: [ 'normal', 'italic' ], default: '' },
		textDecoration:      { type: 'string', enum: [ 'none', 'underline', 'line-through' ], default: '' },

		marginTop:           { type: 'string', default: '' },
		marginRight:         { type: 'string', default: '' },
		marginBottom:        { type: 'string', default: '' },
		marginLeft:          { type: 'string', default: '' },
		marginTopTablet:     { type: 'string', default: '' },
		marginRightTablet:   { type: 'string', default: '' },
		marginBottomTablet:  { type: 'string', default: '' },
		marginLeftTablet:    { type: 'string', default: '' },
		marginTopMobile:     { type: 'string', default: '' },
		marginRightMobile:   { type: 'string', default: '' },
		marginBottomMobile:  { type: 'string', default: '' },
		marginLeftMobile:    { type: 'string', default: '' },
		marginUnit:          { type: 'string', default: 'px' },

		paddingTop:          { type: 'string', default: '' },
		paddingRight:        { type: 'string', default: '' },
		paddingBottom:       { type: 'string', default: '' },
		paddingLeft:         { type: 'string', default: '' },
		paddingTopTablet:    { type: 'string', default: '' },
		paddingRightTablet:  { type: 'string', default: '' },
		paddingBottomTablet: { type: 'string', default: '' },
		paddingLeftTablet:   { type: 'string', default: '' },
		paddingTopMobile:    { type: 'string', default: '' },
		paddingRightMobile:  { type: 'string', default: '' },
		paddingBottomMobile: { type: 'string', default: '' },
		paddingLeftMobile:   { type: 'string', default: '' },
		paddingUnit:         { type: 'string', default: 'px' },

		backgroundColour:   { type: 'string', default: '' },
		borderRadius:       { type: 'string', default: '' },
		borderRadiusUnit:   { type: 'string', default: 'px' },
		borderRadiusTL:     { type: 'string', default: '' },
		borderRadiusTR:     { type: 'string', default: '' },
		borderRadiusBL:     { type: 'string', default: '' },
		borderRadiusBR:     { type: 'string', default: '' },
		borderWidthTop:     { type: 'string', default: '' },
		borderWidthRight:   { type: 'string', default: '' },
		borderWidthBottom:  { type: 'string', default: '' },
		borderWidthLeft:    { type: 'string', default: '' },
		borderWidthUnit:    { type: 'string', default: 'px' },
		borderStyle:        { type: 'string', enum: [ 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' ], default: 'none' },
		borderColour:       { type: 'string', default: '' },

		boxShadow:          { type: 'string', default: '' },
		boxShadowHover:     { type: 'string', default: '' },
		hoverScale:         { type: 'number' },
		hoverColour:        { type: 'string', default: '' },
		hoverBackground:    { type: 'string', default: '' },

		// The attribute being retired — present in this entry only.
		variantStyle: { type: 'string', enum: [ 'default', 'hero', 'section', 'card' ], default: 'default' },

		customWidth:        { type: 'string', default: '' },
		customWidthUnit:    { type: 'string', default: 'px' },
		inheritStyle:       { type: 'boolean', default: false },
		transitionDuration: { type: 'number', default: 300 },
		transitionEasing:   { type: 'string', enum: [ 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ], default: 'ease' },
	},
	supports: {
		align: true,
		html: false,
		anchor: true,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: true },
	},
	// Dynamic block — save() returns null in v0.4.0.
	save() {
		return null;
	},
	/**
	 * Only migrate posts that have a non-default variantStyle.
	 * Posts with variantStyle='default' (or absent) pass through the current
	 * schema untouched — no migration needed.
	 */
	isEligible( attrs ) {
		return attrs.variantStyle && attrs.variantStyle !== 'default';
	},
	migrate( attrs ) {
		const { variantStyle, ...rest } = attrs;
		// Append is-style-{value} to className, preserving any existing classes.
		const existingClass = rest.className || '';
		const styleClass    = 'is-style-' + variantStyle;
		rest.className = [ existingClass, styleClass ].filter( Boolean ).join( ' ' );
		return rest;
	},
};

// ─── v2: dynamic composite → single-element ──────────────────────────────────

const v2 = {
	attributes: {
		label:                       { type: 'string', default: '', role: 'content' },
		labelEnabled:                { type: 'boolean', default: true },
		labelTag:                    { type: 'string', enum: [ 'span', 'p', 'div' ], default: 'span' },
		labelFontFamily:             { type: 'string', default: '' },
		labelFontSize:               { type: 'number', default: 12 },
		labelFontSizeUnit:           { type: 'string', default: 'px' },
		labelFontSizeTablet:         { type: 'number' },
		labelFontSizeMobile:         { type: 'number' },
		labelFontWeight:             { type: 'string', default: '600' },
		labelLineHeight:             { type: 'number', default: 1.2 },
		labelLineHeightUnit:         { type: 'string', default: 'em' },
		labelLetterSpacing:          { type: 'number', default: 0.08 },
		labelLetterSpacingUnit:      { type: 'string', default: 'em' },
		labelTextTransform:          { type: 'string', default: 'uppercase' },
		labelColour:                 { type: 'string', default: 'primary' },
		labelFontStyle:              { type: 'string', enum: [ 'normal', 'italic' ], default: '' },
		labelTextDecoration:         { type: 'string', enum: [ 'none', 'underline', 'line-through' ], default: '' },
		labelMarginTop:              { type: 'string', default: '' },
		labelMarginRight:            { type: 'string', default: '' },
		labelMarginBottom:           { type: 'string', default: '' },
		labelMarginLeft:             { type: 'string', default: '' },
		labelMarginTopTablet:        { type: 'string', default: '' },
		labelMarginRightTablet:      { type: 'string', default: '' },
		labelMarginBottomTablet:     { type: 'string', default: '' },
		labelMarginLeftTablet:       { type: 'string', default: '' },
		labelMarginTopMobile:        { type: 'string', default: '' },
		labelMarginRightMobile:      { type: 'string', default: '' },
		labelMarginBottomMobile:     { type: 'string', default: '' },
		labelMarginLeftMobile:       { type: 'string', default: '' },
		labelMarginUnit:             { type: 'string', default: 'px' },

		headline:                    { type: 'string', default: '', role: 'content' },
		headlineLevel:               { type: 'string', enum: [ 'h1', 'h2', 'h3', 'h4' ], default: 'h2' },
		headlineId:                  { type: 'string', default: '' },
		headlineFontFamily:          { type: 'string', default: '' },
		headlineFontSize:            { type: 'number', default: 28 },
		headlineFontSizeUnit:        { type: 'string', default: 'px' },
		headlineFontSizeTablet:      { type: 'number' },
		headlineFontSizeMobile:      { type: 'number' },
		headlineFontWeight:          { type: 'string', default: '700' },
		headlineLineHeight:          { type: 'number' },
		headlineLineHeightUnit:      { type: 'string', default: 'em' },
		headlineLetterSpacing:       { type: 'number' },
		headlineLetterSpacingUnit:   { type: 'string', default: 'em' },
		headlineTextTransform:       { type: 'string', default: '' },
		headlineColour:              { type: 'string', default: 'text' },
		headlineFontStyle:           { type: 'string', enum: [ 'normal', 'italic' ], default: '' },
		headlineTextDecoration:      { type: 'string', enum: [ 'none', 'underline', 'line-through' ], default: '' },
		headlineMarginTop:           { type: 'string', default: '' },
		headlineMarginRight:         { type: 'string', default: '' },
		headlineMarginBottom:        { type: 'string', default: '' },
		headlineMarginLeft:          { type: 'string', default: '' },
		headlineMarginTopTablet:     { type: 'string', default: '' },
		headlineMarginRightTablet:   { type: 'string', default: '' },
		headlineMarginBottomTablet:  { type: 'string', default: '' },
		headlineMarginLeftTablet:    { type: 'string', default: '' },
		headlineMarginTopMobile:     { type: 'string', default: '' },
		headlineMarginRightMobile:   { type: 'string', default: '' },
		headlineMarginBottomMobile:  { type: 'string', default: '' },
		headlineMarginLeftMobile:    { type: 'string', default: '' },
		headlineMarginUnit:          { type: 'string', default: 'px' },

		sub:                         { type: 'string', default: '' },
		subEnabled:                  { type: 'boolean', default: true },
		subTag:                      { type: 'string', enum: [ 'p', 'div' ], default: 'p' },
		subFontFamily:               { type: 'string', default: '' },
		subFontSize:                 { type: 'number', default: 16 },
		subFontSizeUnit:             { type: 'string', default: 'px' },
		subFontSizeTablet:           { type: 'number' },
		subFontSizeMobile:           { type: 'number' },
		subFontWeight:               { type: 'string', default: '400' },
		subLineHeight:               { type: 'number' },
		subLineHeightUnit:           { type: 'string', default: 'em' },
		subLetterSpacing:            { type: 'number' },
		subLetterSpacingUnit:        { type: 'string', default: 'em' },
		subTextTransform:            { type: 'string', default: '' },
		subColour:                   { type: 'string', default: 'text-muted' },
		subFontStyle:                { type: 'string', enum: [ 'normal', 'italic' ], default: '' },
		subTextDecoration:           { type: 'string', enum: [ 'none', 'underline', 'line-through' ], default: '' },
		subMarginTop:                { type: 'string', default: '' },
		subMarginRight:              { type: 'string', default: '' },
		subMarginBottom:             { type: 'string', default: '' },
		subMarginLeft:               { type: 'string', default: '' },
		subMarginTopTablet:          { type: 'string', default: '' },
		subMarginRightTablet:        { type: 'string', default: '' },
		subMarginBottomTablet:       { type: 'string', default: '' },
		subMarginLeftTablet:         { type: 'string', default: '' },
		subMarginTopMobile:          { type: 'string', default: '' },
		subMarginRightMobile:        { type: 'string', default: '' },
		subMarginBottomMobile:       { type: 'string', default: '' },
		subMarginLeftMobile:         { type: 'string', default: '' },
		subMarginUnit:               { type: 'string', default: 'px' },

		icon:            { type: 'string', default: '' },
		iconPosition:    { type: 'string', enum: [ 'before-label', 'before-headline', 'none' ], default: 'none' },
		emoji:           { type: 'string', default: '' },

		marginTop:           { type: 'string', default: '' },
		marginRight:         { type: 'string', default: '' },
		marginBottom:        { type: 'string', default: '' },
		marginLeft:          { type: 'string', default: '' },
		marginTopTablet:     { type: 'string', default: '' },
		marginRightTablet:   { type: 'string', default: '' },
		marginBottomTablet:  { type: 'string', default: '' },
		marginLeftTablet:    { type: 'string', default: '' },
		marginTopMobile:     { type: 'string', default: '' },
		marginRightMobile:   { type: 'string', default: '' },
		marginBottomMobile:  { type: 'string', default: '' },
		marginLeftMobile:    { type: 'string', default: '' },
		marginUnit:          { type: 'string', default: 'px' },

		paddingTop:           { type: 'string', default: '' },
		paddingRight:         { type: 'string', default: '' },
		paddingBottom:        { type: 'string', default: '' },
		paddingLeft:          { type: 'string', default: '' },
		paddingTopTablet:     { type: 'string', default: '' },
		paddingRightTablet:   { type: 'string', default: '' },
		paddingBottomTablet:  { type: 'string', default: '' },
		paddingLeftTablet:    { type: 'string', default: '' },
		paddingTopMobile:     { type: 'string', default: '' },
		paddingRightMobile:   { type: 'string', default: '' },
		paddingBottomMobile:  { type: 'string', default: '' },
		paddingLeftMobile:    { type: 'string', default: '' },
		paddingUnit:          { type: 'string', default: 'px' },

		backgroundColour:  { type: 'string', default: '' },
		borderRadius:      { type: 'string', default: '' },
		borderRadiusUnit:  { type: 'string', default: 'px' },
		borderRadiusTL:    { type: 'string', default: '' },
		borderRadiusTR:    { type: 'string', default: '' },
		borderRadiusBL:    { type: 'string', default: '' },
		borderRadiusBR:    { type: 'string', default: '' },
		borderWidthTop:    { type: 'string', default: '' },
		borderWidthRight:  { type: 'string', default: '' },
		borderWidthBottom: { type: 'string', default: '' },
		borderWidthLeft:   { type: 'string', default: '' },
		borderWidthUnit:   { type: 'string', default: 'px' },
		borderStyle:       { type: 'string', enum: [ 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' ], default: 'none' },
		borderColour:      { type: 'string', default: '' },

		boxShadow:         { type: 'string', default: '' },
		boxShadowHover:    { type: 'string', default: '' },
		hoverScale:        { type: 'number', default: null },
		hoverColour:       { type: 'string', default: '' },
		hoverBackground:   { type: 'string', default: '' },

		variantStyle:      { type: 'string', enum: [ 'default', 'hero', 'section', 'card' ], default: 'default' },
		customWidth:       { type: 'string', default: '' },
		customWidthUnit:   { type: 'string', default: 'px' },
		inheritStyle:      { type: 'boolean', default: false },
		transitionDuration: { type: 'number', default: 300 },
		transitionEasing:  { type: 'string', enum: [ 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ], default: 'ease' },
	},
	supports: {
		align: true,
		html: false,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: true },
	},
	// Dynamic block — save was null in v0.3.0.
	save() {
		return null;
	},
	migrate( oldAttrs ) {
		// Route the old HEADLINE into the new single-element content + level.
		// The old label and sub elements are intentionally dropped: the block
		// patterns sgs/label-heading-subheading-cluster and
		// sgs/heading-subheading-cluster reconstruct the full visual cluster
		// using atomic sibling blocks.
		//
		// Note: headlineLevel in v0.3.0 was limited to h1-h4. The new schema
		// extends to h6; no coercion needed — h1-h4 are valid in both.
		const newAttrs = {
			headingRole:         'heading',
			content:             oldAttrs.headline || '',
			level:               oldAttrs.headlineLevel || 'h2',
			subTag:              oldAttrs.subTag || 'p',
			anchor:              oldAttrs.headlineId || '',

			// Map headline typography to flat single-element attrs.
			fontFamily:          oldAttrs.headlineFontFamily || '',
			fontSize:            oldAttrs.headlineFontSize || 28,
			fontSizeUnit:        oldAttrs.headlineFontSizeUnit || 'px',
			fontSizeTablet:      oldAttrs.headlineFontSizeTablet,
			fontSizeMobile:      oldAttrs.headlineFontSizeMobile,
			fontWeight:          oldAttrs.headlineFontWeight || '700',
			lineHeight:          oldAttrs.headlineLineHeight,
			lineHeightUnit:      oldAttrs.headlineLineHeightUnit || 'em',
			letterSpacing:       oldAttrs.headlineLetterSpacing,
			letterSpacingUnit:   oldAttrs.headlineLetterSpacingUnit || 'em',
			textTransform:       oldAttrs.headlineTextTransform || '',
			textColour:          oldAttrs.headlineColour || 'text',
			fontStyle:           oldAttrs.headlineFontStyle || '',
			textDecoration:      oldAttrs.headlineTextDecoration || '',

			// Wrapper-level attrs pass through verbatim.
			marginTop:           oldAttrs.marginTop || '',
			marginRight:         oldAttrs.marginRight || '',
			marginBottom:        oldAttrs.marginBottom || '',
			marginLeft:          oldAttrs.marginLeft || '',
			marginTopTablet:     oldAttrs.marginTopTablet || '',
			marginRightTablet:   oldAttrs.marginRightTablet || '',
			marginBottomTablet:  oldAttrs.marginBottomTablet || '',
			marginLeftTablet:    oldAttrs.marginLeftTablet || '',
			marginTopMobile:     oldAttrs.marginTopMobile || '',
			marginRightMobile:   oldAttrs.marginRightMobile || '',
			marginBottomMobile:  oldAttrs.marginBottomMobile || '',
			marginLeftMobile:    oldAttrs.marginLeftMobile || '',
			marginUnit:          oldAttrs.marginUnit || 'px',

			paddingTop:           oldAttrs.paddingTop || '',
			paddingRight:         oldAttrs.paddingRight || '',
			paddingBottom:        oldAttrs.paddingBottom || '',
			paddingLeft:          oldAttrs.paddingLeft || '',
			paddingTopTablet:     oldAttrs.paddingTopTablet || '',
			paddingRightTablet:   oldAttrs.paddingRightTablet || '',
			paddingBottomTablet:  oldAttrs.paddingBottomTablet || '',
			paddingLeftTablet:    oldAttrs.paddingLeftTablet || '',
			paddingTopMobile:     oldAttrs.paddingTopMobile || '',
			paddingRightMobile:   oldAttrs.paddingRightMobile || '',
			paddingBottomMobile:  oldAttrs.paddingBottomMobile || '',
			paddingLeftMobile:    oldAttrs.paddingLeftMobile || '',
			paddingUnit:          oldAttrs.paddingUnit || 'px',

			backgroundColour:  oldAttrs.backgroundColour || '',
			borderRadius:      oldAttrs.borderRadius || '',
			borderRadiusUnit:  oldAttrs.borderRadiusUnit || 'px',
			borderRadiusTL:    oldAttrs.borderRadiusTL || '',
			borderRadiusTR:    oldAttrs.borderRadiusTR || '',
			borderRadiusBL:    oldAttrs.borderRadiusBL || '',
			borderRadiusBR:    oldAttrs.borderRadiusBR || '',
			borderWidthTop:    oldAttrs.borderWidthTop || '',
			borderWidthRight:  oldAttrs.borderWidthRight || '',
			borderWidthBottom: oldAttrs.borderWidthBottom || '',
			borderWidthLeft:   oldAttrs.borderWidthLeft || '',
			borderWidthUnit:   oldAttrs.borderWidthUnit || 'px',
			borderStyle:       oldAttrs.borderStyle || 'none',
			borderColour:      oldAttrs.borderColour || '',

			boxShadow:         oldAttrs.boxShadow || '',
			boxShadowHover:    oldAttrs.boxShadowHover || '',
			hoverScale:        oldAttrs.hoverScale ?? null,
			hoverColour:       oldAttrs.hoverColour || '',
			hoverBackground:   oldAttrs.hoverBackground || '',

			variantStyle:       oldAttrs.variantStyle || 'default',
			customWidth:        oldAttrs.customWidth || '',
			customWidthUnit:    oldAttrs.customWidthUnit || 'px',
			inheritStyle:       oldAttrs.inheritStyle || false,
			transitionDuration: oldAttrs.transitionDuration ?? 300,
			transitionEasing:   oldAttrs.transitionEasing || 'ease',
		};

		return newAttrs;
	},
};

// ─── v1: static save shape (pre 2026-05-21 dynamic conversion) ────────────────

/**
 * Build inline style for a single slot.
 * Reproduced verbatim from the pre-conversion save.js so WordPress can
 * re-serialise stored posts to verify the block content matches.
 *
 * @param {Object} args Style property arguments.
 * @return {Object}     React-compatible style object.
 */
function buildSlotStyle( {
	colour,
	fontFamily,
	fontSize,
	fontSizeUnit,
	fontWeight,
	lineHeight,
	lineHeightUnit,
	letterSpacing,
	letterSpacingUnit,
	textTransform,
} ) {
	const style = {
		color: colourVar( colour ) || undefined,
		fontSize: fontSize ? `${ fontSize }${ fontSizeUnit }` : undefined,
		fontWeight: fontWeight || undefined,
		lineHeight: lineHeight ? `${ lineHeight }${ lineHeightUnit }` : undefined,
		letterSpacing: ( letterSpacing !== null && letterSpacing !== undefined )
			? `${ letterSpacing }${ letterSpacingUnit }`
			: undefined,
		textTransform: textTransform || undefined,
		fontFamily: fontFamily || undefined,
	};

	return Object.fromEntries(
		Object.entries( style ).filter( ( [ , v ] ) => v !== undefined )
	);
}

const v1 = {
	attributes: {
		label:                    { type: 'string', default: '' },
		labelEnabled:             { type: 'boolean', default: true },
		labelTag:                 { type: 'string', enum: [ 'span', 'p', 'div' ], default: 'span' },
		labelFontFamily:          { type: 'string', default: '' },
		labelFontSize:            { type: 'number', default: 12 },
		labelFontSizeUnit:        { type: 'string', default: 'px' },
		labelFontSizeTablet:      { type: 'number' },
		labelFontSizeMobile:      { type: 'number' },
		labelFontWeight:          { type: 'string', default: '600' },
		labelLineHeight:          { type: 'number', default: 1.2 },
		labelLineHeightUnit:      { type: 'string', default: 'em' },
		labelLetterSpacing:       { type: 'number', default: 0.08 },
		labelLetterSpacingUnit:   { type: 'string', default: 'em' },
		labelTextTransform:       { type: 'string', default: 'uppercase' },
		labelColour:              { type: 'string', default: 'primary' },

		headline:                    { type: 'string', default: '' },
		headlineLevel:               { type: 'string', enum: [ 'h1', 'h2', 'h3', 'h4' ], default: 'h2' },
		headlineId:                  { type: 'string', default: '' },
		headlineFontFamily:          { type: 'string', default: '' },
		headlineFontSize:            { type: 'number', default: 28 },
		headlineFontSizeUnit:        { type: 'string', default: 'px' },
		headlineFontSizeTablet:      { type: 'number' },
		headlineFontSizeMobile:      { type: 'number' },
		headlineFontWeight:          { type: 'string', default: '700' },
		headlineLineHeight:          { type: 'number' },
		headlineLineHeightUnit:      { type: 'string', default: 'em' },
		headlineLetterSpacing:       { type: 'number' },
		headlineLetterSpacingUnit:   { type: 'string', default: 'em' },
		headlineTextTransform:       { type: 'string', default: '' },
		headlineColour:              { type: 'string', default: 'text' },

		sub:                  { type: 'string', default: '' },
		subEnabled:           { type: 'boolean', default: true },
		subTag:               { type: 'string', enum: [ 'p', 'div' ], default: 'p' },
		subFontFamily:        { type: 'string', default: '' },
		subFontSize:          { type: 'number', default: 16 },
		subFontSizeUnit:      { type: 'string', default: 'px' },
		subFontSizeTablet:    { type: 'number' },
		subFontSizeMobile:    { type: 'number' },
		subFontWeight:        { type: 'string', default: '400' },
		subLineHeight:        { type: 'number' },
		subLineHeightUnit:    { type: 'string', default: 'em' },
		subLetterSpacing:     { type: 'number' },
		subLetterSpacingUnit: { type: 'string', default: 'em' },
		subTextTransform:     { type: 'string', default: '' },
		subColour:            { type: 'string', default: 'text-muted' },

		icon:         { type: 'string', default: '' },
		iconPosition: { type: 'string', enum: [ 'before-label', 'before-headline', 'none' ], default: 'none' },
		emoji:        { type: 'string', default: '' },
	},
	supports: {
		align: true,
		html: false,
		color: { text: true, background: true, link: false },
		spacing: { margin: true, padding: true },
	},
	save( { attributes } ) {
		const {
			label,
			labelEnabled,
			labelTag,
			labelColour,
			labelFontFamily,
			labelFontSize,
			labelFontSizeUnit,
			labelFontWeight,
			labelLineHeight,
			labelLineHeightUnit,
			labelLetterSpacing,
			labelLetterSpacingUnit,
			labelTextTransform,

			headline,
			headlineLevel,
			headlineId,
			headlineColour,
			headlineFontFamily,
			headlineFontSize,
			headlineFontSizeUnit,
			headlineFontWeight,
			headlineLineHeight,
			headlineLineHeightUnit,
			headlineLetterSpacing,
			headlineLetterSpacingUnit,
			headlineTextTransform,

			sub,
			subEnabled,
			subTag,
			subColour,
			subFontFamily,
			subFontSize,
			subFontSizeUnit,
			subFontWeight,
			subLineHeight,
			subLineHeightUnit,
			subLetterSpacing,
			subLetterSpacingUnit,
			subTextTransform,

			icon,
			iconPosition,
			emoji,
		} = attributes;

		const labelStyle = buildSlotStyle( {
			colour: labelColour,
			fontFamily: labelFontFamily,
			fontSize: labelFontSize,
			fontSizeUnit: labelFontSizeUnit,
			fontWeight: labelFontWeight,
			lineHeight: labelLineHeight,
			lineHeightUnit: labelLineHeightUnit,
			letterSpacing: labelLetterSpacing,
			letterSpacingUnit: labelLetterSpacingUnit,
			textTransform: labelTextTransform,
		} );

		const headlineStyle = buildSlotStyle( {
			colour: headlineColour,
			fontFamily: headlineFontFamily,
			fontSize: headlineFontSize,
			fontSizeUnit: headlineFontSizeUnit,
			fontWeight: headlineFontWeight,
			lineHeight: headlineLineHeight,
			lineHeightUnit: headlineLineHeightUnit,
			letterSpacing: headlineLetterSpacing,
			letterSpacingUnit: headlineLetterSpacingUnit,
			textTransform: headlineTextTransform,
		} );

		const subStyle = buildSlotStyle( {
			colour: subColour,
			fontFamily: subFontFamily,
			fontSize: subFontSize,
			fontSizeUnit: subFontSizeUnit,
			fontWeight: subFontWeight,
			lineHeight: subLineHeight,
			lineHeightUnit: subLineHeightUnit,
			letterSpacing: subLetterSpacing,
			letterSpacingUnit: subLetterSpacingUnit,
			textTransform: subTextTransform,
		} );

		const blockProps = useBlockProps.save( {
			className: 'wp-block-sgs-heading',
		} );

		return (
			<div { ...blockProps }>
				{ /* Icon / emoji before label */ }
				{ iconPosition === 'before-label' && ( icon || emoji ) && (
					<span className="wp-block-sgs-heading__icon" aria-hidden="true">
						{ emoji || icon }
					</span>
				) }

				{ /* Label - only serialised when enabled */ }
				{ labelEnabled && (
					<RichText.Content
						tagName={ labelTag }
						className="wp-block-sgs-heading__label"
						value={ label }
						style={ labelStyle }
					/>
				) }

				{ /* Icon / emoji before headline */ }
				{ iconPosition === 'before-headline' && ( icon || emoji ) && (
					<span className="wp-block-sgs-heading__icon" aria-hidden="true">
						{ emoji || icon }
					</span>
				) }

				{ /* Headline - always present */ }
				<RichText.Content
					tagName={ headlineLevel }
					className="wp-block-sgs-heading__headline"
					id={ headlineId || undefined }
					value={ headline }
					style={ headlineStyle }
				/>

				{ /* Sub - only serialised when enabled */ }
				{ subEnabled && (
					<RichText.Content
						tagName={ subTag }
						className="wp-block-sgs-heading__sub"
						value={ sub }
						style={ subStyle }
					/>
				) }
			</div>
		);
	},
	migrate( attributes ) {
		// v1 (static save) shares the same attribute shape as v2 (dynamic render)
		// so delegate to v2's migrate for the full composite-to-single-element
		// transformation.
		return v2.migrate( attributes );
	},
};

export default [ v3, v2, v1 ];
