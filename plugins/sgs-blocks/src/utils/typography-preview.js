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

// A theme font-family preset slug: lowercase letters, digits and hyphens, the
// shape helpers-typography.php::sgs_font_family_sanitise() turns into the
// preset's custom property.
const FONT_FAMILY_SLUG = /^[a-z0-9-]+$/;

/**
 * The CSS font-family a stored value paints, as the frontend paints it. A
 * preset slug becomes its custom property, falling back to the word itself
 * (PHP prints a lowercase word that names no preset unchanged); any other
 * value (a font-family list) passes through.
 *
 * @param {string} value Stored font-family attribute value.
 * @return {string|undefined} CSS font-family value, or undefined when unset.
 */
export function fontFamilyCssValue( value ) {
	if ( ! value ) {
		return undefined;
	}
	return FONT_FAMILY_SLUG.test( value )
		? `var(--wp--preset--font-family--${ value }, ${ value })`
		: value;
}

/**
 * The value the core font-family picker matches its options against (each
 * option's fontFamily CSS string), for a stored slug or font-family list.
 *
 * @param {string} stored   Stored attribute value.
 * @param {Array}  families Flattened typography.fontFamilies presets.
 * @return {string} The picker value; '' shows Default.
 */
export function fontFamilyPickerValue( stored, families ) {
	if ( ! stored ) {
		return '';
	}
	const preset = ( families || [] ).find( ( f ) => f.slug === stored );
	return preset ? preset.fontFamily : stored;
}

/**
 * The value to store for a picker choice: the preset's slug, so the setting
 * follows the client's theme. Presets sharing one font-family list are
 * indistinguishable in the picker's onChange, so the current slug is kept when
 * it is one of them.
 *
 * @param {string} picked   The fontFamily CSS string the picker emitted.
 * @param {Array}  families Flattened typography.fontFamilies presets.
 * @param {string} current  The currently stored value.
 * @return {string|undefined} Slug, raw value, or undefined for Default.
 */
export function fontFamilyStoredValue( picked, families, current ) {
	if ( ! picked ) {
		return undefined;
	}
	const matches = ( families || [] ).filter( ( f ) => f.slug && f.fontFamily === picked );
	if ( ! matches.length ) {
		return picked;
	}
	return ( matches.find( ( f ) => f.slug === current ) || matches[ 0 ] ).slug;
}

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

	const fontFamily = fontFamilyCssValue( attributes[ attrKey( 'FontFamily' ) ] );
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

// A value is only safe to interpolate into CSS TEXT if it cannot terminate the
// declaration or the rule. typographyPreviewStyle()'s output is normally handed
// to React as a `style` object, where React itself blocks a breakout, so two of
// its values reach it unsanitised: `{prefix}FontFamily` is passed through raw,
// and the three `{prefix}*Unit` attributes are concatenated raw onto a number.
// In a <style> rule those become a CSS-injection vector, so they are sanitised
// here, mirroring the PHP this file is the twin of:
// helpers-typography.php sanitises font-family with `[^a-zA-Z0-9 ,"'\-]` and
// helpers-responsive.php::sgs_responsive_sanitise_unit units with `[^a-z%]/i`.
const CSS_TEXT_BREAKOUT = /[{}<>;=\\]|url\s*\(|expression\s*\(|@import|\/\*/i;

// PHP's font-family charset, applied to the whole declaration value. A preset
// custom property from fontFamilyCssValue() is built from a checked slug and
// passes as it is.
const PRESET_FONT_FAMILY = /^var\(--wp--preset--font-family--([a-z0-9-]+), \1\)$/;
const safeFontFamily = ( v ) => ( PRESET_FONT_FAMILY.test( String( v ) ) ? String( v ) : String( v ).replace( /[^a-zA-Z0-9 ,"'\-]/g, '' ) );

/**
 * typographyPreviewCss — the same declarations typographyPreviewStyle() returns,
 * emitted as a CSS RULE for an editor <style> element instead of an inline
 * `style` object.
 *
 * Needed when the element a block's control paints is NOT rendered by that
 * block's own canvas: a parent that hosts editable InnerBlocks paints a
 * descendant the CHILD renders (sgs/product-faq's `question` family paints
 * every sgs/product-faq-item `<summary class="sgs-product-faq-item__question">`),
 * and an inline style cannot reach another block's element any more than it can
 * reach a sibling — the same reason textIndentPreviewCss() exists.
 *
 * The rule is scoped to the block's own editor wrapper, so it reaches that
 * instance's descendants and nothing else on the canvas.
 *
 * @param {Object} attributes    Block attributes.
 * @param {string} prefix        Attribute prefix, '' for the root family.
 * @param {string} scopeSelector Editor selector the rule is scoped to, e.g.
 *   `#block-${ clientId } .sgs-product-faq-item__question`.
 * @param {string} [tier='desktop'] 'desktop' | 'tablet' | 'mobile'.
 * @return {string} The CSS rule, or '' when nothing is set or unscoped.
 */
export function typographyPreviewCss( attributes, prefix, scopeSelector, tier = 'desktop' ) {
	if ( ! scopeSelector ) {
		return '';
	}
	if ( CSS_TEXT_BREAKOUT.test( scopeSelector ) ) {
		return '';
	}
	const style = typographyPreviewStyle( attributes, prefix, tier );
	const decls = Object.keys( style )
		.map( ( key ) => {
			const prop  = key.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
			const value = 'fontFamily' === key ? safeFontFamily( style[ key ] ) : String( style[ key ] );
			// Drop the declaration rather than the rule: one hostile value must not
			// silently take the other properties' preview down with it.
			if ( '' === value.trim() || CSS_TEXT_BREAKOUT.test( value ) ) {
				return '';
			}
			return `${ prop }:${ value }`;
		} )
		.filter( Boolean )
		.join( ';' );
	return decls ? `${ scopeSelector }{${ decls };}` : '';
}

// JS twin of sgs_css_length_value() for an editor <style> rule: a bare number
// is px; a value carrying CSS-breakout characters or a url()/expression()/
// @import is rejected (''), every other length passes through trimmed.
function indentLengthValue( raw ) {
	const value = String( raw ?? '' ).trim();
	if ( '' === value ) {
		return '';
	}
	if ( /^\d+$/.test( value ) ) {
		return `${ value }px`;
	}
	if ( /url\s*\(|expression\s*\(|@import/i.test( value ) || /[\{}<>;=]/.test( value ) || value.includes( '/*' ) ) {
		return '';
	}
	return value;
}

/**
 * textIndentPreviewCss — the editor twin of the text-indent rule
 * sgs_typography_css_rule() emits on its adjacent-sibling selector. Core's
 * convention: indent every paragraph that follows another paragraph inside
 * the element, so the rule is
 * `{scope} :is(p, .wp-block-sgs-text) + :is(p, .wp-block-sgs-text){text-indent:X;}`,
 * returned as a string for an editor `<style>` element (an inline style cannot
 * reach a sibling relationship).
 *
 * PHP reads `{prefix}TextIndent` as one flat length; a tier object (never
 * written by TypographyControls) resolves at the previewed tier.
 *
 * @param {Object} attributes    Block attributes.
 * @param {string} prefix        Attribute prefix, '' for the root family.
 * @param {string} scopeSelector Editor selector of the element the PHP call targets.
 * @param {string} [tier='desktop'] 'desktop' | 'tablet' | 'mobile'.
 * @return {string} The CSS rule, or '' when unset, invalid or unscoped.
 */
export function textIndentPreviewCss( attributes, prefix, scopeSelector, tier = 'desktop' ) {
	if ( ! scopeSelector ) {
		return '';
	}
	const key = prefix ? `${ prefix }TextIndent` : 'textIndent';
	let raw = ( attributes || {} )[ key ];
	if ( raw && 'object' === typeof raw && ! Array.isArray( raw ) ) {
		raw = tierKeys( tier ).map( ( t ) => raw[ t ] ).find( ( v ) => ! isUnset( v ) );
	}
	const value = indentLengthValue( raw );
	if ( '' === value ) {
		return '';
	}
	const para = ':is(p, .wp-block-sgs-text)';
	return `${ scopeSelector } ${ para } + ${ para }{text-indent:${ value };}`;
}
