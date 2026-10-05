/**
 * Classifies CSS declaration sinks in render.php source.
 */

'use strict';

const { precedingAssignmentTargetName } = require( './lib-php-html-context' );
const { findEnclosingStringStart } = require( './lib-php-mask' );

// A CSS property whose VALUE is a timing/duration spec, not a paintable
// state — zero visible effect on a static (non-animating) capture,
// regardless of selector. Generalises the reduced-motion reasoning.
const MOTION_TIMING_PROPERTIES = new Set( [
	'transition', 'transition-duration', 'transition-delay',
	'transition-timing-function', 'transition-property',
	'animation', 'animation-duration', 'animation-delay',
	'animation-timing-function', 'animation-iteration-count', 'animation-name',
] );

const NON_PAINT_SINK_CLASSES = new Set( [
	'hover-css', 'reduced-motion-css', 'motion-timing', 'aria', 'data', 'native-functional', 'json-ld',
] );

/**
 * Backward-scan from a usage offset for the CSS property name currently
 * being declared, if the offset sits inside an unclosed `property:` value.
 * Handles BOTH the single-quote-concat shape CHECK B already knows
 * (`'property:'.$var.'`) AND double-quote `{$var}` interpolation
 * (`"transition:all {$duration}ms {$easing};"`) where the variable is not
 * immediately adjacent to the colon — by scanning backward for the nearest
 * unclosed `:` (bailing out on a `;`/`{`/`}` boundary first, which means no
 * declaration is open here at all) then reading the property-name token
 * before that colon. The scan is clamped to the CURRENT PHP string literal
 * (via findEnclosingStringStart()) — if `offset` isn't inside a string at
 * all, there's no CSS declaration here full stop.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null} Lower-cased property name, or null if not inside a CSS declaration value.
 */
function precedingCssPropertyName( phpSrc, mask, offset ) {
	const stringStart = findEnclosingStringStart( mask, offset );
	if ( stringStart === null ) {
		return null;
	}
	const windowStart = Math.max( stringStart, offset - 200 );
	let slice = phpSrc.slice( windowStart, offset );
	// PHP double-quote interpolation (`"transition:all {$duration}ms
	// {$easing};"` — sgs/button's real shape) puts `{`/`}` around each
	// variable that are interpolation delimiters, not CSS rule boundaries.
	// A FULLY CONTAINED `{$word}` earlier in the slice (an already-finished
	// interpolation for a PRIOR variable, e.g. `{$transition_duration}` when
	// scanning for `{$transition_easing}`) is blanked out entirely so its
	// braces don't falsely look like a closed declaration/rule. The variable
	// currently being scanned FOR has its own interpolation-open `{`
	// trailing the slice (its closing `}` is after `offset`, invisible to a
	// backward-only slice) — that trailing `{` is stripped too.
	slice = slice.replace( /\{\$[A-Za-z_]\w*\}/g, ( s ) => ' '.repeat( s.length ) );
	if ( slice.endsWith( '{' ) && phpSrc[ offset ] === '$' ) {
		slice = slice.slice( 0, -1 );
	}
	let colonIdx = -1;
	for ( let i = slice.length - 1; i >= 0; i-- ) {
		const c = slice[ i ];
		if ( c === ':' && slice[ i - 1 ] !== ':' && slice[ i + 1 ] !== ':' ) {
			colonIdx = i;
			break;
		}
		if ( c === ';' || c === '{' || c === '}' ) {
			return null;
		}
	}
	if ( colonIdx === -1 ) {
		return null;
	}
	const before = slice.slice( 0, colonIdx );
	const m = /([\w-]+)\s*$/.exec( before );
	return m ? m[ 1 ].toLowerCase() : null;
}

/**
 * Find the CSS selector text of the rule currently open at `offset` — the
 * text between the nearest still-unclosed `{` and the previous `}` (or the
 * start of the current PHP string literal — see findEnclosingStringStart()).
 * Assumes each CSS rule is authored as one self-contained, brace-balanced
 * PHP string segment (true everywhere observed in this codebase 2026-08-13
 * — see file-header blind-spot note).
 *
 * @param {string}          phpSrc  render.php source.
 * @param {Array<boolean>}  mask    From buildStringMask().
 * @param {number}          offset  Usage-site offset.
 * @param {number}          [window] Backward scan window in characters.
 * @return {string|null} Lower-cased selector text, or null if no unclosed rule found.
 */
function nearestPrecedingSelectorText( phpSrc, mask, offset, window ) {
	window = window || 300;
	const stringStart = findEnclosingStringStart( mask, offset );
	if ( stringStart === null ) {
		return null;
	}
	const windowStart = Math.max( stringStart, offset - window );
	const slice = phpSrc.slice( windowStart, offset );
	const lastOpen = slice.lastIndexOf( '{' );
	if ( lastOpen === -1 ) {
		return null;
	}
	const afterOpen = slice.slice( lastOpen + 1 );
	if ( afterOpen.includes( '}' ) ) {
		return null;
	}
	const beforeOpenSlice = slice.slice( 0, lastOpen );
	const prevClose = beforeOpenSlice.lastIndexOf( '}' );
	const selectorStart = prevClose === -1 ? 0 : prevClose + 1;
	return slice.slice( selectorStart, lastOpen ).toLowerCase();
}

/**
 * True if `offset` sits inside an `@media (prefers-reduced-motion...) { }`
 * block — raw brace counting over the literal CSS text (safe here since a
 * media block's CSS content is naturally brace-balanced, unlike PHP code
 * mixed with quoted CSS strings), clamped to the current PHP string literal
 * (see findEnclosingStringStart()).
 *
 * @param {string}          phpSrc  render.php source.
 * @param {Array<boolean>}  mask    From buildStringMask().
 * @param {number}          offset  Usage-site offset.
 * @param {number}          [window] Backward scan window in characters.
 * @return {boolean}
 */
function isReducedMotionScoped( phpSrc, mask, offset, window ) {
	window = window || 2000;
	const stringStart = findEnclosingStringStart( mask, offset );
	if ( stringStart === null ) {
		return false;
	}
	const windowStart = Math.max( stringStart, offset - window );
	const slice = phpSrc.slice( windowStart, offset );
	const mediaRe = /@media\s*\([^)]*prefers-reduced-motion[^)]*\)\s*\{/gi;
	let lastMatch = null;
	let m;
	while ( ( m = mediaRe.exec( slice ) ) !== null ) {
		lastMatch = m;
	}
	if ( ! lastMatch ) {
		return false;
	}
	const afterMedia = slice.slice( lastMatch.index + lastMatch[ 0 ].length );
	let depth = 1;
	for ( let i = 0; i < afterMedia.length; i++ ) {
		if ( afterMedia[ i ] === '{' ) {
			depth++;
		} else if ( afterMedia[ i ] === '}' ) {
			depth--;
			if ( depth === 0 ) {
				return false;
			}
		}
	}
	return depth > 0;
}

/**
 * BARE-CONCAT-AFTER-DOT resolution (2026-08-13 audit). precedingCssPropertyName()
 * requires `offset` to sit INSIDE a masked PHP string literal (via
 * findEnclosingStringStart()) — true for double-quote `{$var}` interpolation
 * and the three-piece single-quote shape `'x:'.$var.'y'`. It is FALSE for the
 * real shape found live in sgs/form/post-grid:
 * `'--sgs-hover-bg:' . $hover_bg` — the variable sits AFTER the `.`
 * concatenation operator, as bare PHP code, not inside any string at all.
 * This walks backward from `offset` over whitespace + the `.` operator to
 * find the CLOSING QUOTE of the immediately-preceding string literal, then
 * returns that quote's own index — feeding THAT back into
 * precedingCssPropertyName() as if it were the offset gives an identical
 * slice-ending-at-the-real-last-content-character result (the quote index
 * satisfies findEnclosingStringStart()'s `mask[offset-1]` check because the
 * whole string body up to the quote is masked). ALSO tolerates ONE enclosing
 * helper-function-call wrapper around the variable before the dot — real
 * shape: sgs/social-icons' `'--sgs-social-hover:' . sgs_colour_value(
 * $hover_colour_token )` — the variable is the function's argument, not
 * directly concatenated, so the dot sits before `sgs_colour_value(`, not
 * immediately before `$hover_colour_token`. Returns null if, after
 * optionally skipping one such wrapper, the immediately-preceding token is
 * still not a real closing quote of a masked string.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset (bare PHP code, not in a string).
 * @return {number|null} A virtual offset suitable for precedingCssPropertyName(), or null.
 */
function bareConcatStringEndOffset( phpSrc, mask, offset ) {
	let i = offset;
	while ( i > 0 && /\s/.test( phpSrc[ i - 1 ] ) ) {
		i--;
	}
	// Optionally skip MULTIPLE nested enclosing `identifier(` function-call
	// wrappers immediately preceding — real shape: sgs/form's
	// `'--sgs-focus-ring-colour:' . esc_attr( sgs_colour_value(
	// $focus_ring_colour ) )`, TWO layers (esc_attr then sgs_colour_value)
	// around the variable, vs. sgs/social-icons' single-layer
	// `sgs_colour_value( $hover_colour_token )`. Bounded by the loop only
	// finding real `identifier(` tokens — stops the moment one isn't found.
	for ( ;; ) {
		if ( i === 0 || phpSrc[ i - 1 ] !== '(' ) {
			break;
		}
		let j = i - 1;
		while ( j > 0 && /\s/.test( phpSrc[ j - 1 ] ) ) {
			j--;
		}
		let k = j;
		while ( k > 0 && /[A-Za-z0-9_]/.test( phpSrc[ k - 1 ] ) ) {
			k--;
		}
		if ( k === j ) {
			break; // no identifier immediately before the '(' — stop unwrapping.
		}
		i = k;
		while ( i > 0 && /\s/.test( phpSrc[ i - 1 ] ) ) {
			i--;
		}
	}
	if ( i === 0 || phpSrc[ i - 1 ] !== '.' ) {
		return null;
	}
	i--; // consume the '.' concatenation operator.
	while ( i > 0 && /\s/.test( phpSrc[ i - 1 ] ) ) {
		i--;
	}
	if ( i === 0 ) {
		return null;
	}
	const closingQuoteIdx = i - 1;
	const quoteChar = phpSrc[ closingQuoteIdx ];
	if ( ( quoteChar !== "'" && quoteChar !== '"' ) || ! mask[ closingQuoteIdx ] ) {
		return null;
	}
	return closingQuoteIdx;
}

/**
 * Classify a usage site that sits inside a CSS declaration value.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null} 'hover-css' | 'reduced-motion-css' | 'motion-timing' | 'paint' (a real, unconditional CSS declaration) | null (not a CSS declaration context at all).
 */
function classifyCssDeclarationSink( phpSrc, mask, offset ) {
	let effectiveOffset = offset;
	let propName = precedingCssPropertyName( phpSrc, mask, offset );
	if ( ! propName ) {
		const bareConcatOffset = bareConcatStringEndOffset( phpSrc, mask, offset );
		if ( bareConcatOffset !== null ) {
			const bareConcatPropName = precedingCssPropertyName( phpSrc, mask, bareConcatOffset );
			if ( bareConcatPropName ) {
				propName = bareConcatPropName;
				effectiveOffset = bareConcatOffset;
			}
		}
	}
	if ( ! propName ) {
		return null;
	}
	if ( propName.startsWith( '--' ) && /hover|focus/i.test( propName ) ) {
		return 'hover-css';
	}
	if ( MOTION_TIMING_PROPERTIES.has( propName ) ) {
		return 'motion-timing';
	}
	const selector = nearestPrecedingSelectorText( phpSrc, mask, effectiveOffset );
	if ( selector && /:hover|:focus-visible|:focus\b/.test( selector ) ) {
		return 'hover-css';
	}
	if ( isReducedMotionScoped( phpSrc, mask, effectiveOffset ) ) {
		return 'reduced-motion-css';
	}
	// The selector and the declaration are sometimes built in SEPARATE PHP
	// string literals joined later (real shape: sgs/button's
	// `$hover_rules[] = "box-shadow:{$bsh_inset}...";` builds a bare
	// declaration with no selector in sight — the `:hover,:focus-visible{}`
	// wrapper is only added several statements later via
	// `implode( ';', $hover_rules )`), so nearestPrecedingSelectorText() can
	// see nothing to scope against. Fall back to the CONTAINER variable's own
	// name (the array/string being appended to) — the same naming-convention
	// trust already used above for `--x-hover` custom properties.
	const containerName = precedingAssignmentTargetName( phpSrc, mask, effectiveOffset );
	if ( containerName && /hover|focus/i.test( containerName ) ) {
		return 'hover-css';
	}
	if ( containerName && /reduced.?motion/i.test( containerName ) ) {
		return 'reduced-motion-css';
	}
	return 'paint';
}

module.exports = {
	NON_PAINT_SINK_CLASSES,
	bareConcatStringEndOffset,
	classifyCssDeclarationSink,
	isReducedMotionScoped,
	nearestPrecedingSelectorText,
	precedingCssPropertyName,
};
