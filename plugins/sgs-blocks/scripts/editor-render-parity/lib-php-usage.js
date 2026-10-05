/**
 * Collects and classifies every render.php usage site of an attribute (SIGNAL 1 driver).
 */

'use strict';

const { classifyIfConditionGate, nearbyBooleanKeywordLiteral } = require( './lib-php-gates' );
const { NATIVE_FUNCTIONAL_ATTR_NAMES, enclosingStatementAssignmentTargetName, isInsideJsonEncodeArgument, precedingHtmlAttributeName } = require( './lib-php-html-context' );
const { NON_PAINT_SINK_CLASSES, classifyCssDeclarationSink } = require( './lib-php-sinks' );

/**
 * Classify one usage-site offset into a non-paint sink category, or null
 * (unclassified — conservatively treated as paint-relevant).
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null}
 */
/**
 * Classify one usage-site offset.
 *
 * Returns 'paint' for an EXPLICIT blocker — a real, recognised output-affecting
 * context (an unconditional CSS declaration, or a real HTML attribute name
 * that isn't on the non-paint safelist, e.g. `src`/`class`/`style`/`href`).
 * Returns one of NON_PAINT_SINK_CLASSES for a recognised non-paint sink.
 * Returns null when the offset doesn't match ANY recognised sink SHAPE at
 * all — a pure control-flow/computation read (an `if`/ternary numeric or
 * boolean comparison, a `round()`/`abs()`/`in_array()` argument that feeds a
 * LATER derived variable rather than being an output sink itself). null is
 * NOT a blocker — attributeIsNonPaintSinkOnly() below skips it rather than
 * treating it as paint, since it isn't evidence of anything either way.
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null}
 */
function classifyUsageSite( phpSrc, mask, offset ) {
	// Real shape: sgs/quote's `$hover_rules[] = 'box-shadow:' . sgs_shadow_value(
	// $sgs_css_safe_value( $box_shadow_hover ) );` — the variable is a
	// function-call ARGUMENT (real PHP code, not inside a string at all), so
	// classifyCssDeclarationSink()'s string-boundary-scoped scan can't see it.
	// Checked FIRST, naming-convention-only (same trust already used for
	// `--x-hover` custom properties and the $hover_rules container fallback
	// inside classifyCssDeclarationSink) — low risk given this codebase's
	// locked hover/focus/reduced-motion naming discipline.
	const statementTarget = enclosingStatementAssignmentTargetName( phpSrc, mask, offset );
	if ( statementTarget && /hover|focus/i.test( statementTarget ) ) {
		return 'hover-css';
	}
	if ( statementTarget && /reduced.?motion/i.test( statementTarget ) ) {
		return 'reduced-motion-css';
	}

	const cssClass = classifyCssDeclarationSink( phpSrc, mask, offset );
	if ( cssClass === 'hover-css' || cssClass === 'reduced-motion-css' || cssClass === 'motion-timing' ) {
		return cssClass;
	}
	if ( cssClass === 'paint' ) {
		return 'paint';
	}

	const attrName = precedingHtmlAttributeName( phpSrc, offset );
	if ( attrName ) {
		if ( attrName.startsWith( 'aria-' ) ) {
			return 'aria';
		}
		if ( attrName.startsWith( 'data-' ) ) {
			return 'data';
		}
		if ( NATIVE_FUNCTIONAL_ATTR_NAMES.has( attrName ) ) {
			return 'native-functional';
		}
		return 'paint'; // a recognised-but-not-safelisted attribute name (src, class, style, href...).
	}

	if ( isInsideJsonEncodeArgument( phpSrc, mask, offset ) ) {
		return 'json-ld';
	}

	const gateClass = classifyIfConditionGate( phpSrc, mask, offset );
	if ( gateClass ) {
		return gateClass;
	}

	if ( nearbyBooleanKeywordLiteral( phpSrc, offset ) ) {
		return 'native-functional';
	}

	return null;
}

// Broader than CHECK B's own ATTR_READ_RE (kept untouched there to avoid any
// behaviour change to that check): a direct `$attributes['X']` read is
// frequently wrapped in `! empty()`, `empty()`, `isset()`, or a scalar cast
// before assignment — real shape: sgs/audio's
// `$loop = ! empty( $attributes['audioLoop'] );` and
// `$controls = isset( $attributes['audioControls'] ) ? (bool) $attributes['audioControls'] : true;`.
// Signal 1 needs to resolve these to trace the var's REAL downstream usage
// sites, so it uses its own broader wrapper-tolerant pattern.
const ATTR_READ_WRAPPER_RE_SOURCE =
	"(?:!\\s*|\\(\\s*bool\\s*\\)\\s*|\\(\\s*int\\s*\\)\\s*|\\(\\s*string\\s*\\)\\s*|\\(\\s*float\\s*\\)\\s*|\\(\\s*array\\s*\\)\\s*|empty\\(\\s*|isset\\(\\s*)*";

// A single arbitrary HELPER-FUNCTION-call wrapper DIRECTLY around
// `$attributes['X']` (optionally followed by `?? default` before the
// closing paren) — real shape: sgs/product-search's `$max_results_tiers =
// sgs_responsive_normalise_object( $attributes['maxResults'] ?? null );`.
// ATTR_READ_WRAPPER_RE_SOURCE only tolerates a small CLOSED set of
// cast/empty/isset wrappers (deliberately, to avoid over-matching arbitrary
// call chains), so a genuine one-hop helper-function wrapper never lands in
// the main direct-read map at all — measured live 2026-08-13: the resulting
// var (`max_results_tiers`) then has no attrVarMap entry, so
// collectDerivedVarMapAll()'s hop-1/hop-2 tracing has nothing to chain from,
// and `maxResults` stays wrongly flagged despite its only real usage site
// being a plain `data-max-results` non-paint sink. Deliberately a SEPARATE,
// narrower regex (single function layer, first argument only) rather than
// broadening ATTR_READ_WRAPPER_RE_SOURCE itself.
const FUNCTION_WRAPPED_ATTR_READ_RE_SOURCE =
	'[A-Za-z_]\\w*\\(\\s*\\$attributes\\[\\s*[\'"]([A-Za-z0-9_]+)[\'"]\\s*\\]';

/**
 * Signal-1-specific direct-read map: `$var = [wrappers] $attributes['X']`,
 * tolerant of `!empty()`/`empty()`/`isset()`/scalar-cast wrapping (see
 * ATTR_READ_WRAPPER_RE_SOURCE doc comment above), PLUS a single
 * helper-function-call wrapper (see FUNCTION_WRAPPED_ATTR_READ_RE_SOURCE
 * doc comment above).
 *
 * @param {string} phpSrc render.php source.
 * @return {Map<string,string>} localVar -> attrName.
 */
function collectAttrVarMapBroad( phpSrc ) {
	const map = new Map();
	const re = new RegExp(
		'\\$([A-Za-z_]\\w*)\\s*=\\s*' + ATTR_READ_WRAPPER_RE_SOURCE + "\\(?\\s*\\$attributes\\[\\s*['\"]([A-Za-z0-9_]+)['\"]\\s*\\]",
		'g'
	);
	let m;
	while ( ( m = re.exec( phpSrc ) ) !== null ) {
		map.set( m[ 1 ], m[ 2 ] );
	}
	const funcWrappedRe = new RegExp(
		'\\$([A-Za-z_]\\w*)\\s*=\\s*' + FUNCTION_WRAPPED_ATTR_READ_RE_SOURCE,
		'g'
	);
	let fm;
	while ( ( fm = funcWrappedRe.exec( phpSrc ) ) !== null ) {
		if ( ! map.has( fm[ 1 ] ) ) {
			map.set( fm[ 1 ], fm[ 2 ] );
		}
	}
	return map;
}

/**
 * Collect every "usage site" offset for an attribute in render.php: inline
 * `$attributes['X']` occurrences (excluding ones that are part of a
 * `$var = ... $attributes['X'] ...;` definition STATEMENT — the whole
 * statement, not just the first match, so a repeated inline read within the
 * same ternary/ `isset()` check, as in sgs/audio's `$controls` example
 * above, doesn't double-count as an independent usage site) plus every real
 * READ of every PHP variable that resolves back to X (direct, via
 * collectAttrVarMapBroad(), + derived via collectDerivedVarMapAll(), which
 * unlike CHECK B's single-hop/single-attr collectDerivedVarMap() follows up
 * to two hops and records EVERY attribute a derived var traces back to).
 *
 * COMMENT-AWARE (2026-08-13 audit fix): every match is checked against
 * `commentMask` (from buildCommentMask() — comment spans ONLY, NOT quoted
 * strings) and skipped when true — a bare `\$var\b`/attribute-key regex
 * match has no way to tell a real PHP read from a `// phpcs:ignore ...
 * $var built with esc_attr()`-style comment MENTIONING the variable name in
 * prose. Deliberately NOT buildStringMask()'s mask here: that one ALSO
 * marks a genuinely-interpolated `{$var}` inside a double-quoted PHP string
 * as masked, and that IS a real usage site (the exact shape
 * classifyCssDeclarationSink() exists to classify) — using it here would
 * skip real CSS-interpolation paint sites right along with comment mentions.
 * Real bug this fixes: sgs/button's `ariaLabel` usage sites at
 * render.php:998/:1015 were both inside phpcs-ignore comments, which wrongly
 * classified as a real `paint` sink and blocked the otherwise-correct
 * aria-only exemption.
 *
 * @param {string}                  phpSrc        render.php source.
 * @param {Array<boolean>}          commentMask   From buildCommentMask().
 * @param {string}                  attrName      Attribute name.
 * @param {Map<string,string>}      attrVarMap    From collectAttrVarMapBroad().
 * @param {Map<string,Set<string>>} derivedVarMap From collectDerivedVarMapAll().
 * @return {Array<number>} Usage-site offsets.
 */
function collectAttrUsageOffsets( phpSrc, commentMask, attrName, attrVarMap, derivedVarMap ) {
	const offsets = [];
	const definitionSpans = [];
	const defRe = new RegExp(
		'\\$([A-Za-z_]\\w*)\\s*=\\s*' + ATTR_READ_WRAPPER_RE_SOURCE + "\\(?\\s*\\$attributes\\[\\s*['\"]" + attrName + "['\"]\\s*\\]",
		'g'
	);
	let dm;
	while ( ( dm = defRe.exec( phpSrc ) ) !== null ) {
		const semiIdx = phpSrc.indexOf( ';', dm.index );
		const end = semiIdx === -1 ? phpSrc.length : semiIdx + 1;
		definitionSpans.push( [ dm.index, end ] );
	}
	const inlineRe = new RegExp( "\\$attributes\\[\\s*['\"]" + attrName + "['\"]\\s*\\]", 'g' );
	let im;
	while ( ( im = inlineRe.exec( phpSrc ) ) !== null ) {
		const pos = im.index;
		if ( commentMask[ pos ] ) {
			continue; // inside a comment — not a real PHP read.
		}
		const insideDef = definitionSpans.some( ( [ s, e ] ) => pos >= s && pos < e );
		if ( ! insideDef ) {
			offsets.push( pos );
		}
	}

	const varNames = new Set();
	for ( const [ v, a ] of attrVarMap ) {
		if ( a === attrName ) {
			varNames.add( v );
		}
	}
	for ( const [ v, attrSet ] of derivedVarMap ) {
		if ( ! attrSet.has( attrName ) ) {
			continue;
		}
		// A derived var whose OWN definition is an array literal is a
		// multi-attribute CONTAINER, not a scalar alias of `attrName` — real
		// shape: sgs/accordion's `$extra_attrs = array( 'data-allow-multiple'
		// => $allow_multi ? ... , 'data-default-open' => ... );` derives from
		// BOTH allowMultiple and defaultOpen at once, then gets passed along
		// wholesale (`'extra_attrs' => $extra_attrs`) elsewhere — that
		// pass-along site says nothing about allowMultiple specifically (the
		// real per-attribute site is the `$allow_multi`/`$default_open`
		// occurrence already captured directly above), so it must NOT be
		// expanded into a second, generic usage site for every attribute
		// that fed the container.
		const containerDefRe = new RegExp( '\\$' + v + '\\s*=\\s*(?:array\\(|\\[)' );
		if ( containerDefRe.test( phpSrc ) ) {
			continue;
		}
		varNames.add( v );
	}
	for ( const v of varNames ) {
		const varRe = new RegExp( '\\$' + v + '\\b', 'g' );
		let vm;
		while ( ( vm = varRe.exec( phpSrc ) ) !== null ) {
			const pos = vm.index;
			if ( commentMask[ pos ] ) {
				continue; // inside a comment — not a real PHP read.
			}
			const after = phpSrc.slice( pos + vm[ 0 ].length );
			if ( /^\s*=(?!=)/.test( after ) ) {
				continue; // this var's OWN assignment LHS, not a read
			}
			offsets.push( pos );
		}
	}
	return offsets;
}

/**
 * SIGNAL 1 driver: true if every render.php consumption site for `attrName`
 * classifies as a non-paint sink. False (no exemption) if render.php has no
 * resolvable consumption at all — that is a candidate true-dead-attribute,
 * out of scope here (check-dead-controls.js's job), so this signal stays
 * conservative rather than exempting on absence of evidence.
 *
 * @param {string}                  phpSrc        render.php source.
 * @param {Array<boolean>}          mask          From buildStringMask() — for classifyUsageSite().
 * @param {Array<boolean>}          commentMask   From buildCommentMask() — for collectAttrUsageOffsets().
 * @param {string}                  attrName      Attribute name.
 * @param {Map<string,string>}      attrVarMap    From collectAttrVarMap().
 * @param {Map<string,Set<string>>} derivedVarMap From collectDerivedVarMapAll().
 * @return {boolean}
 */
function attributeIsNonPaintSinkOnly( phpSrc, mask, commentMask, attrName, attrVarMap, derivedVarMap ) {
	const offsets = collectAttrUsageOffsets( phpSrc, commentMask, attrName, attrVarMap, derivedVarMap );
	if ( ! offsets.length ) {
		return false;
	}
	let sawNonPaintSink = false;
	for ( const offset of offsets ) {
		const cls = classifyUsageSite( phpSrc, mask, offset );
		if ( cls === 'paint' ) {
			return false; // an explicit, recognised paint-relevant sink — real candidate, not noise.
		}
		if ( NON_PAINT_SINK_CLASSES.has( cls ) ) {
			sawNonPaintSink = true;
		}
		// cls === null: not a recognised sink SHAPE at all (pure control-flow/
		// computation, e.g. an `if`/ternary comparison or a round()/abs()/
		// in_array() argument feeding a later derived variable) — neither
		// evidence for nor against; skipped rather than blocking.
	}
	return sawNonPaintSink;
}

module.exports = {
	attributeIsNonPaintSinkOnly,
	classifyUsageSite,
	collectAttrUsageOffsets,
	collectAttrVarMapBroad,
};
