/**
 * typographyPreviewStyle — the JS twin of includes/helpers-typography.php's
 * sgs_typography_css_rule(), for blocks whose editor CANVAS is a hand-authored
 * preview span rather than <ServerSideRender>.
 *
 * A block that hosts editable InnerBlocks (e.g. sgs/nav-drawer) cannot wrap
 * its whole canvas in <ServerSideRender> — the render.php-generated CSS never
 * reaches its preview markup, so a typography attribute with real frontend
 * behaviour (a real font-size / weight / transform / letter-spacing) shows
 * only the browser default in the editor (the "hand-built preview drift"
 * failure class — feedback_ssr_fixes_hand_built_preview_drift.md). A block
 * whose canvas IS entirely <ServerSideRender> (sgs/nav-menu's burger label,
 * for example) needs none of this — PHP's own CSS already reaches it.
 *
 * DESKTOP/base value only, deliberately. The PHP helper also emits tablet/
 * mobile media-query rules, but the editor canvas has one width — there is no
 * tablet/mobile viewport to preview against, so only the value that actually
 * paints at authoring time is mirrored here.
 *
 * @package SGS\Blocks
 * @param {Object} attributes Block attributes.
 * @param {string} [prefix='']  Attribute prefix ('' | 'close' | 'burger' | …)
 *   — the same prefix passed to sgs_typography_css_rule() server-side.
 * @return {Object} React inline `style` object. A property whose backing
 *   attribute is unset is OMITTED entirely (never written as `undefined` or
 *   `''`), so the element still inherits from the surrounding cascade exactly
 *   as the PHP-emitted CSS does when a property is unset.
 */
export function typographyPreviewStyle( attributes, prefix = '' ) {
	const attrKey = ( base ) =>
		prefix ? prefix + base : base.charAt( 0 ).toLowerCase() + base.slice( 1 );

	// Numeric responsive families (font-size / letter-spacing) may be stored
	// either as the modern {desktop,tablet,mobile} tier object or the legacy
	// flat scalar — same dual shape sgs_typography_css_rule() itself routes on
	// (helpers-typography.php's $size_is_tiered / $letter_is_tiered). Only the
	// desktop tier is ever relevant here (see the docblock above).
	const desktopOf = ( raw ) =>
		raw && 'object' === typeof raw && ! Array.isArray( raw ) ? raw.desktop : raw;

	const style = {};

	const fontSize = desktopOf( attributes[ attrKey( 'FontSize' ) ] );
	if ( 'number' === typeof fontSize ) {
		const unit = attributes[ attrKey( 'FontSizeUnit' ) ] || 'px';
		style.fontSize = `${ fontSize }${ unit }`;
	}
	// A string value is a theme font-size PRESET SLUG (TypographyControls'
	// fontSizePresets picker) — not resolvable to a literal length without the
	// theme.json settings tree, so it is left unset here rather than guessed.

	const fontFamily = attributes[ attrKey( 'FontFamily' ) ];
	if ( fontFamily ) {
		style.fontFamily = fontFamily;
	}

	const fontWeight = attributes[ attrKey( 'FontWeight' ) ];
	if ( fontWeight ) {
		style.fontWeight = fontWeight;
	}

	const fontStyle = attributes[ attrKey( 'FontStyle' ) ];
	if ( 'normal' === fontStyle || 'italic' === fontStyle ) {
		style.fontStyle = fontStyle;
	}

	const textTransform = attributes[ attrKey( 'TextTransform' ) ];
	if ( [ 'none', 'uppercase', 'lowercase', 'capitalize' ].includes( textTransform ) ) {
		style.textTransform = textTransform;
	}

	const textDecoration = attributes[ attrKey( 'TextDecoration' ) ];
	if ( [ 'none', 'underline', 'line-through', 'overline' ].includes( textDecoration ) ) {
		style.textDecoration = textDecoration;
	}

	const letterSpacing = desktopOf( attributes[ attrKey( 'LetterSpacing' ) ] );
	if ( 'number' === typeof letterSpacing ) {
		const unit = attributes[ attrKey( 'LetterSpacingUnit' ) ] || 'em';
		style.letterSpacing = `${ letterSpacing }${ unit }`;
	}

	return style;
}
