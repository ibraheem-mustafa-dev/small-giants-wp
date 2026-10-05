/**
 * Finds the assignment target or HTML attribute a render.php offset sits in.
 */

'use strict';

const { findEnclosingStringStart, findMatchingParen } = require( './lib-php-mask' );

// ---------------------------------------------------------------------------
// SIGNAL 1 — non-paint output-sink classification
// ---------------------------------------------------------------------------

// A native functional/behavioural HTML attribute NAME is never a paint sink.
// Kept tiny and closed, same discipline as this file's other allowlists.
const NATIVE_FUNCTIONAL_ATTR_NAMES = new Set( [
	'rel', 'target', 'download', 'id', 'name', 'for', 'type',
	'preload', 'controls', 'loop', 'autoplay', 'muted', 'playsinline',
	'disabled', 'readonly', 'required', 'checked', 'selected', 'multiple',
	'autofocus', 'tabindex', 'role',
	// alt: real accessibility text with zero visual paint by definition
	// (sgs/image-sequence's thumbnailAlt, 2026-08-13 audit).
	// accept: a native file-picker filter attribute (browser dialog only),
	// zero rendered paint (sgs/form-field-file's allowedTypes, 2026-08-13 audit).
	'alt', 'accept',
] );

// A bare native boolean-attribute KEYWORD, appended as a literal string
// (e.g. sgs/audio's `$audio_bool .= $loop ? ' loop' : '';`, later echoed raw
// into the `<audio>` tag) rather than assigned to a named HTML attribute.
const BOOLEAN_ATTR_KEYWORDS = new Set( [
	'loop', 'autoplay', 'controls', 'muted', 'playsinline', 'disabled',
	'readonly', 'required', 'checked', 'selected', 'multiple', 'autofocus', 'download',
] );

/**
 * Given `offset` sits inside a PHP string literal (see
 * findEnclosingStringStart()), find the variable NAME the enclosing
 * statement assigns/appends that string INTO — `$hover_rules[] = "..."` or
 * `$css .= "..."` — by looking just before the string's own opening quote.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null}
 */
function precedingAssignmentTargetName( phpSrc, mask, offset ) {
	const stringStart = findEnclosingStringStart( mask, offset );
	if ( stringStart === null ) {
		return null;
	}
	const windowStart = Math.max( 0, stringStart - 80 );
	const before = phpSrc.slice( windowStart, stringStart );
	const m = /\$([A-Za-z_]\w*)\s*(?:\[\s*\])?\s*\.?=\s*$/.exec( before );
	return m ? m[ 1 ] : null;
}

/**
 * Find the assignment TARGET variable of the CURRENT PHP statement
 * containing `offset` — regardless of whether `offset` itself sits inside a
 * string or in real code (a function-call argument). Scans backward for the
 * nearest un-masked statement boundary (`;`/`{`/`}`, real code only, strings
 * skipped via `mask`), then looks for an assignment LHS right after it.
 * Real shape: sgs/quote's `$hover_rules[] = 'box-shadow:' .
 * sgs_shadow_value( $sgs_css_safe_value( $box_shadow_hover ) );` — the
 * variable is several function-call layers deep in real PHP code, never
 * inside a string at all, so precedingAssignmentTargetName() (string-scoped)
 * can't see it; this statement-scoped version can.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null}
 */
function enclosingStatementAssignmentTargetName( phpSrc, mask, offset ) {
	let boundary = -1;
	for ( let i = offset - 1; i >= 0; i-- ) {
		if ( mask[ i ] ) {
			continue;
		}
		if ( phpSrc[ i ] === ';' || phpSrc[ i ] === '{' || phpSrc[ i ] === '}' ) {
			boundary = i;
			break;
		}
	}
	const segment = phpSrc.slice( boundary + 1, offset );
	const m = /^\s*\$([A-Za-z_]\w*)\s*(?:\[\s*\])?\s*\.?=(?!=)/.exec( segment );
	return m ? m[ 1 ] : null;
}

/**
 * Backward-scan for the HTML/PHP-array attribute NAME whose value is
 * currently being built at `offset` — either raw HTML
 * (`name="...<?php echo esc_attr(...`) or a PHP wrapper-attrs array literal
 * (`'name' => ...`).
 *
 * @param {string} phpSrc  render.php source.
 * @param {number} offset  Usage-site offset.
 * @param {number} [window] Backward scan window in characters.
 * @return {string|null} Lower-cased attribute name, or null.
 */
/**
 * Same lookback as precedingHtmlAttributeName() but ONLY the raw-HTML
 * `name="..."` shape — used where an unrecognised name should be treated as
 * an explicit paint blocker (a real HTML attribute IS being written, we
 * just don't safelist that particular name).
 *
 * @param {string} phpSrc  render.php source.
 * @param {number} offset  Usage-site offset.
 * @param {number} [window] Backward scan window in characters.
 * @return {string|null} Lower-cased attribute name, or null.
 */
// Optional scalar cast directly before a usage-site offset — real shape:
// sgs/counter's `esc_attr( (string) $duration )`. Tolerated the same way
// ATTR_READ_WRAPPER_RE_SOURCE already tolerates a cast on the READ side;
// this is the equivalent on the WRITE/emission side (2026-08-13 audit).
const OPTIONAL_SCALAR_CAST_RE_SOURCE =
	'(?:\\(\\s*(?:string|int|float|bool)\\s*\\)\\s*)?';

function precedingRawHtmlAttributeName( phpSrc, offset, window ) {
	window = window || 150;
	const windowStart = Math.max( 0, offset - window );
	const slice = phpSrc.slice( windowStart, offset );
	// Shape A: markup with embedded PHP echo — `name="...<?php echo esc_attr(`.
	const m = new RegExp(
		'([\\w-]+)\\s*=\\s*"(?:[^"]*<\\?php\\s+echo\\s+)?(?:esc_attr\\(\\s*)?' + OPTIONAL_SCALAR_CAST_RE_SOURCE + '$'
	).exec( slice );
	if ( m ) {
		return m[ 1 ].toLowerCase();
	}
	// Shape B: the whole tag built via PHP string CONCATENATION — real shape:
	// sgs/button's `$rel_attr = ' rel="' . esc_attr( $rel ) . '"';` — the
	// attribute's opening `name="` sits inside its OWN small single-quoted
	// PHP string, closed immediately, then `.`-concatenated with the value.
	const m2 = new RegExp(
		'([\\w-]+)\\s*=\\s*"\'\\s*\\.\\s*(?:esc_attr\\(\\s*)?' + OPTIONAL_SCALAR_CAST_RE_SOURCE + '$'
	).exec( slice );
	if ( m2 ) {
		return m2[ 1 ].toLowerCase();
	}
	return null;
}

/**
 * Backward-scan for the HTML/PHP-array attribute NAME whose value is
 * currently being built at `offset` — either raw HTML
 * (`name="...(echoed)..."`) or a PHP wrapper-attrs array literal
 * (`'name' => ...`). UNLIKE precedingRawHtmlAttributeName(), a PHP
 * array-key match is only meaningful when the key ITSELF looks like an
 * HTML/data attribute name — an arbitrary array key (e.g.
 * `'autoplaySpeed' => $autoplay_speed` inside a `wp_json_encode()` payload
 * array, sgs/google-reviews' real shape) is NOT evidence of an HTML
 * attribute at all, so an unrecognised array key returns null here (never a
 * blocker) rather than being mistaken for a paint-relevant HTML write.
 *
 * @param {string} phpSrc  render.php source.
 * @param {number} offset  Usage-site offset.
 * @param {number} [window] Backward scan window in characters.
 * @return {string|null} Lower-cased attribute name, or null.
 */
function precedingHtmlAttributeName( phpSrc, offset, window ) {
	const rawName = precedingRawHtmlAttributeName( phpSrc, offset, window );
	if ( rawName ) {
		return rawName;
	}
	window = window || 150;
	const windowStart = Math.max( 0, offset - window );
	const slice = phpSrc.slice( windowStart, offset );
	// `'key' => $var` array-literal shape — tolerant of an optional `esc_attr(`
	// wrapper AND a scalar cast between `=>` and the value (real shapes:
	// sgs/table-of-contents' `'data-scroll-offset' => (string) $scroll_offset`
	// and sgs/product-search's `'data-max-results' => esc_attr( (string)
	// $max_results )`, 2026-08-13 audit).
	const m2 = new RegExp(
		'[\'"]([\\w-]+)[\'"]\\s*=>\\s*(?:esc_attr\\(\\s*)?' + OPTIONAL_SCALAR_CAST_RE_SOURCE + '$'
	).exec( slice );
	// `$arr['key'] = $var` array-ELEMENT-assignment shape — real shape:
	// sgs/decorative-image's `$img_attrs['data-parallax'] = esc_attr(
	// $parallax_strength );`.
	const m3 = new RegExp(
		'\\$\\w+\\[\\s*[\'"]([\\w-]+)[\'"]\\s*\\]\\s*=\\s*(?:esc_attr\\(\\s*)?' + OPTIONAL_SCALAR_CAST_RE_SOURCE + '$'
	).exec( slice );
	const key = ( m2 && m2[ 1 ] ) || ( m3 && m3[ 1 ] );
	if ( key ) {
		const lower = key.toLowerCase();
		if ( lower.startsWith( 'aria-' ) || lower.startsWith( 'data-' ) || NATIVE_FUNCTIONAL_ATTR_NAMES.has( lower ) ) {
			return lower;
		}
	}
	return null;
}

/**
 * True if `offset` sits inside the argument span of a `wp_json_encode(...)`
 * call — covers both JSON-LD schema arrays AND Interactivity-API
 * `data-wp-context` state blobs (real shape: sgs/google-reviews'
 * autoplaySpeed/showDots/showArrows are array VALUES fed straight into
 * `'data-wp-context' => wp_json_encode( array( 'autoplaySpeed' =>
 * $autoplay_speed, ... ) )`) — both are non-paint.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {boolean}
 */
function isInsideJsonEncodeArgument( phpSrc, mask, offset ) {
	const callRe = /wp_json_encode\s*\(/g;
	let m;
	while ( ( m = callRe.exec( phpSrc ) ) !== null ) {
		if ( mask[ m.index ] ) {
			continue;
		}
		const openParenIdx = m.index + m[ 0 ].length - 1;
		if ( openParenIdx >= offset ) {
			continue;
		}
		const closeIdx = findMatchingParen( phpSrc, mask, openParenIdx );
		if ( closeIdx === -1 ) {
			continue;
		}
		if ( offset > openParenIdx && offset < closeIdx ) {
			return true;
		}
	}
	return false;
}

module.exports = {
	BOOLEAN_ATTR_KEYWORDS,
	NATIVE_FUNCTIONAL_ATTR_NAMES,
	enclosingStatementAssignmentTargetName,
	isInsideJsonEncodeArgument,
	precedingAssignmentTargetName,
	precedingHtmlAttributeName,
};
