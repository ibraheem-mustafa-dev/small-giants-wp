/**
 * Section-adaptive header ink — the pure tone-decision logic (Wave 3C U-13
 * §4.2, `.claude/reports/2026-09-26-u13-header-ink-design.md`).
 *
 * Kept as its own ES module (imported by `header-behaviours/view.js`, which
 * is a real webpack entry — bundled, not copied — so an import here reaches
 * the deployed script) so the decision can be unit-tested with plain
 * descriptor objects, independent of a real DOM
 * (`scripts/tests/test-header-ink-tone.mjs`).
 *
 * The PHP twin of the luminance/white-wins maths is
 * `includes/helpers-colour-wcag.php::sgs_wcag_relative_luminance()` /
 * `::sgs_wcag_white_wins_for_luminance()` — ported faithfully so a colour
 * judged 'dark' server-side for a solid background is judged 'dark' here too.
 *
 * @package SGS\Blocks
 */

/**
 * WCAG 2.1 relative luminance of an sRGB colour, 0..255 channels.
 *
 * @param {number} r Red channel, 0-255.
 * @param {number} g Green channel, 0-255.
 * @param {number} b Blue channel, 0-255.
 * @return {number} Relative luminance in [0, 1].
 */
export function relativeLuminance( r, g, b ) {
	const linearise = ( c ) => {
		const n = c / 255;
		return n <= 0.03928 ? n / 12.92 : Math.pow( ( n + 0.055 ) / 1.055, 2.4 );
	};
	return 0.2126 * linearise( r ) + 0.7152 * linearise( g ) + 0.0722 * linearise( b );
}

/**
 * Whether white beats black for WCAG contrast against a background of the
 * given relative luminance — the exact decision
 * `sgs_wcag_white_wins_for_luminance()` makes server-side.
 *
 * @param {number} lBg Relative luminance of the background, in [0, 1].
 * @return {boolean} True when white wins.
 */
export function whiteWinsForLuminance( lBg ) {
	const lBlack = 0;
	const lWhite = 1;

	const ratioWithBlack =
		( Math.max( lBg, lBlack ) + 0.05 ) / ( Math.min( lBg, lBlack ) + 0.05 );
	const ratioWithWhite =
		( Math.max( lBg, lWhite ) + 0.05 ) / ( Math.min( lBg, lWhite ) + 0.05 );

	const blackPasses = ratioWithBlack >= 4.5;
	const whitePasses = ratioWithWhite >= 4.5;

	if ( blackPasses && ! whitePasses ) {
		return false;
	}
	if ( whitePasses && ! blackPasses ) {
		return true;
	}
	return ratioWithWhite > ratioWithBlack;
}

/**
 * Parse a computed `rgb()`/`rgba()` colour string (the only shape
 * `getComputedStyle().backgroundColor` ever returns) into channels + alpha.
 * Never throws; returns null for anything else (`transparent`, `''`).
 *
 * @param {string} value A computed colour string.
 * @return {{r:number,g:number,b:number,a:number}|null}
 */
export function parseComputedColour( value ) {
	const match = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(
		( value || '' ).trim()
	);
	if ( ! match ) {
		return null;
	}
	return {
		r: parseFloat( match[ 1 ] ),
		g: parseFloat( match[ 2 ] ),
		b: parseFloat( match[ 3 ] ),
		a: undefined === match[ 4 ] ? 1 : parseFloat( match[ 4 ] ),
	};
}

/**
 * Classify one candidate colour as 'dark' or 'light' via the shared
 * white-wins rule, or null when it is not a solid, opaque-enough colour.
 *
 * @param {string} value    A computed colour string.
 * @param {number} minAlpha Minimum alpha to count as opaque enough. Default 0.5.
 * @return {'dark'|'light'|null}
 */
export function classifyComputedColour( value, minAlpha = 0.5 ) {
	const parsed = parseComputedColour( value );
	if ( ! parsed || parsed.a < minAlpha ) {
		return null;
	}
	const luminance = relativeLuminance( parsed.r, parsed.g, parsed.b );
	return whiteWinsForLuminance( luminance ) ? 'dark' : 'light';
}

/**
 * Decide the tone contributed by ONE element in the stack under the header,
 * per §4.2's three-step rule. Pure — takes a plain descriptor, never a real
 * DOM node, so it is directly unit-testable.
 *
 * @param {Object}  el                  Element descriptor.
 * @param {string}  el.tagName          Upper-case tag name (e.g. 'IMG').
 * @param {boolean} el.hasToneClassDark  Carries `sgs-on-dark`.
 * @param {boolean} el.hasToneClassLight Carries `sgs-on-light`.
 * @param {boolean} el.hasBackgroundImage Computed `background-image` is not 'none'.
 * @param {string}  el.backgroundColor  Computed `background-color`.
 * @return {'dark'|'light'|'unknown'|null} null = inconclusive, keep looking
 *     further down the stack; 'unknown' = STOP, never look through a picture.
 */
export function classifyStackElement( el ) {
	if ( el.hasToneClassDark ) {
		return 'dark';
	}
	if ( el.hasToneClassLight ) {
		return 'light';
	}

	const opaqueMediaTags = [ 'IMG', 'VIDEO', 'CANVAS', 'IFRAME' ];
	if ( opaqueMediaTags.indexOf( el.tagName ) !== -1 || el.hasBackgroundImage ) {
		return 'unknown';
	}

	return classifyComputedColour( el.backgroundColor );
}

/**
 * Walk the elements-under-the-header stack, top (frontmost) to bottom, and
 * return the FIRST element's decision. `null` when nothing in the stack
 * decides (the header keeps its own ink — an image hero with no stated tone
 * behaves exactly as today).
 *
 * @param {Array<Object>} stack Element descriptors, frontmost first (the
 *                               same order `document.elementsFromPoint()`
 *                               returns), already filtered of excluded
 *                               elements (the header itself, dialogs, the
 *                               mega panel, the detached burger chip).
 * @return {'dark'|'light'|'unknown'|null}
 */
export function decideSectionTone( stack ) {
	for ( const el of stack ) {
		const decision = classifyStackElement( el );
		if ( decision ) {
			return decision;
		}
	}
	return null;
}
