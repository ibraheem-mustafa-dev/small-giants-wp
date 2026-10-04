/**
 * typographyPreviewStyle — the JS twin of includes/helpers-typography.php's
 * sgs_typography_css_rule(), for blocks whose editor CANVAS is a hand-authored
 * preview element rather than <ServerSideRender>.
 *
 * A block that hosts editable InnerBlocks (e.g. sgs/nav-drawer) cannot wrap
 * its whole canvas in <ServerSideRender> — the render.php-generated CSS never
 * reaches its preview markup, so a typography attribute with real frontend
 * behaviour shows only the browser default in the editor (the "hand-built
 * preview drift" failure class). A block whose canvas IS entirely
 * <ServerSideRender> needs none of this — PHP's own CSS already reaches it.
 *
 * Mirrors every declaration the PHP helper emits on its selector: font-size,
 * line-height and letter-spacing per device tier; font-family, font-weight,
 * font-style, text-transform, text-decoration, text-align, text-wrap,
 * writing-mode and column-count as flat values, each against the same
 * allowlist PHP uses. text-indent is not mirrored: PHP emits it only on a
 * caller-supplied adjacent-sibling selector, never on the element itself.
 *
 * The device tier is the one the editor is previewing (pass usePreviewTier()):
 * a tier-object value resolves mobile -> tablet -> desktop, the legacy flat
 * trio resolves {prop}Mobile -> {prop}Tablet -> {prop}, exactly as the PHP
 * media-query cascade lands at that width.
 *
 * @package SGS\Blocks
 * @param {Object} attributes Block attributes.
 * @param {string} [prefix='']  Attribute prefix ('' | 'close' | 'burger' | …)
 *   — the same prefix passed to sgs_typography_css_rule() server-side.
 * @param {string} [tier='desktop'] 'desktop' | 'tablet' | 'mobile'.
 * @return {Object} React inline `style` object. A property whose backing
 *   attribute is unset is OMITTED entirely (never written as `undefined` or
 *   `''`), so the element still inherits from the surrounding cascade exactly
 *   as the PHP-emitted CSS does when a property is unset.
 */

const TIER_CHAIN = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};

// Per-device families: the attribute suffix of each tier in the legacy flat
// trio, mobile first (a tier-object value is stored under the desktop name).
const RESPONSIVE_BASES = {
	'FontSize': { desktop: 'FontSize', tablet: 'FontSizeTablet', mobile: 'FontSizeMobile' },
	'LineHeight': { desktop: 'LineHeight', tablet: 'LineHeightTablet', mobile: 'LineHeightMobile' },
	'LetterSpacing': { desktop: 'LetterSpacing', tablet: 'LetterSpacingTablet', mobile: 'LetterSpacingMobile' },
};

// Flat keyword declarations: attribute suffix -> [ style key, PHP's allowlist ].
const KEYWORD_SUFFIXES = {
	'FontStyle': [ 'fontStyle', [ 'normal', 'italic' ] ],
	'TextTransform': [ 'textTransform', [ 'none', 'uppercase', 'lowercase', 'capitalize' ] ],
	'TextDecoration': [ 'textDecoration', [ 'none', 'underline', 'line-through', 'overline' ] ],
	'TextAlign': [ 'textAlign', [ 'left', 'center', 'right', 'justify', 'start', 'end' ] ],
	'TextWrap': [ 'textWrap', [ 'wrap', 'nowrap', 'balance', 'pretty', 'stable' ] ],
	'WritingMode': [ 'writingMode', [ 'horizontal-tb', 'vertical-rl', 'vertical-lr' ] ],
};

const isUnset = ( v ) => undefined === v || null === v || '' === v || 'inherit' === v;

// PHP's is_numeric() accepts a numeric STRING ("14") as numeric, and
// block.json commonly declares a numeric-looking typography default as a JSON
// string, which sgs_typography_css_rule() still routes as a number.
const isNumericLike = ( v ) =>
	'number' === typeof v || ( 'string' === typeof v && '' !== v.trim() && ! isNaN( Number( v ) ) );

// A length already carrying its unit ("1.2rem", "clamp(...)", "var(...)") passes through.
const hasOwnUnit = ( v ) => 'string' === typeof v && /^(-?\d*\.?\d+[a-z%]+|clamp\(.*\)|var\(.*\)|calc\(.*\))$/i.test( v.trim() );

const tierKeys = ( tier ) => TIER_CHAIN[ tier ] || TIER_CHAIN.desktop;

// The value painting at `tier` for one responsive family, whichever shape it is stored in.
function valueAtTier( attributes, attrKey, family, tier ) {
	const names = RESPONSIVE_BASES[ family ];
	const raw = attributes[ attrKey( names.desktop ) ];
	if ( raw && 'object' === typeof raw && ! Array.isArray( raw ) ) {
		for ( const t of tierKeys( tier ) ) {
			if ( ! isUnset( raw[ t ] ) ) {
				return raw[ t ];
			}
		}
		return undefined;
	}
	for ( const t of tierKeys( tier ) ) {
		const v = attributes[ attrKey( names[ t ] ) ];
		if ( ! isUnset( v ) ) {
			return v;
		}
	}
	return undefined;
}

export function typographyPreviewStyle( attributes, prefix = '', tier = 'desktop' ) {
	const attrKey = ( base ) =>
		prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );
	const style = {};

	const fontSize = valueAtTier( attributes, attrKey, 'FontSize', tier );
	if ( isNumericLike( fontSize ) ) {
		style.fontSize = `${ Number( fontSize ) }${ attributes[ attrKey( 'FontSizeUnit' ) ] || 'px' }`;
	} else if ( hasOwnUnit( fontSize ) ) {
		style.fontSize = fontSize.trim();
	} else if ( 'string' === typeof fontSize && '' !== fontSize.trim() ) {
		// A theme font-size preset slug: the same custom property sgs_font_size_value() emits.
		style.fontSize = `var(--wp--preset--font-size--${ fontSize.toLowerCase().replace( /[^a-z0-9-]/g, '' ) })`;
	}

	const lineHeight = valueAtTier( attributes, attrKey, 'LineHeight', tier );
	if ( isNumericLike( lineHeight ) ) {
		const unit = attributes[ attrKey( 'LineHeightUnit' ) ];
		style.lineHeight = `${ Number( lineHeight ) }${ ! unit || 'unitless' === unit ? '' : unit }`;
	} else if ( hasOwnUnit( lineHeight ) ) {
		style.lineHeight = lineHeight.trim();
	}

	const letterSpacing = valueAtTier( attributes, attrKey, 'LetterSpacing', tier );
	if ( isNumericLike( letterSpacing ) ) {
		style.letterSpacing = `${ Number( letterSpacing ) }${ attributes[ attrKey( 'LetterSpacingUnit' ) ] || 'em' }`;
	} else if ( hasOwnUnit( letterSpacing ) ) {
		style.letterSpacing = letterSpacing.trim();
	}

	const fontFamily = attributes[ attrKey( 'FontFamily' ) ];
	if ( fontFamily ) {
		style.fontFamily = fontFamily;
	}

	const fontWeight = attributes[ attrKey( 'FontWeight' ) ];
	if ( fontWeight ) {
		style.fontWeight = String( fontWeight ).replace( /[^a-z0-9]/gi, '' );
	}

	for ( const [ suffix, [ prop, allowed ] ] of Object.entries( KEYWORD_SUFFIXES ) ) {
		const v = attributes[ attrKey( suffix ) ];
		if ( allowed.includes( v ) ) {
			style[ prop ] = v;
		}
	}

	const columns = attributes[ attrKey( 'TextColumns' ) ];
	if ( isNumericLike( columns ) ) {
		const n = Math.trunc( Math.abs( Number( columns ) ) );
		if ( n >= 1 && n <= 6 ) {
			style.columnCount = n;
		}
	}

	return style;
}
