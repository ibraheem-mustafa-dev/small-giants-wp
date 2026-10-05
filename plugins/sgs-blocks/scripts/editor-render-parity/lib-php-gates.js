/**
 * Classifies if-condition gates and boolean keywords around a usage site (SIGNAL 1).
 *
 * SIGNAL 1 — NON-PAINT OUTPUT-SINK CLASSIFICATION (the big one).
 *   For an attribute, resolve every render.php PHP variable that traces back
 *   to it (direct `$var = $attributes['X']` reads, one-hop derived vars — the
 *   same two-hop-capable dataflow already built for CHECK B, reused
 *   unmodified since it is attribute-agnostic) plus every INLINE
 *   `$attributes['X']` occurrence. For every occurrence ("usage site") of
 *   those, classifyUsageSite() below determines whether it lands in a
 *   non-paint sink:
 *     - aria- / data- HTML attribute value (raw `name="...(echoed)..."`
 *       or a PHP array `'data-foo' => $var` wrapper-attrs shape)
 *     - a small closed NATIVE_FUNCTIONAL_ATTR_NAMES set (rel/target/download/
 *       id/name/for/preload/controls/loop/autoplay/muted/playsinline/
 *       disabled/readonly/required/checked/selected/multiple/autofocus/
 *       tabindex/role) as an attribute NAME, or as a bare boolean-attribute
 *       KEYWORD string literal near the usage (e.g. `$loop ? ' loop' : ''`
 *       echoed raw into an `<audio>` tag — sgs/audio's real shape)
 *     - inside a `wp_json_encode(...)` call's argument span (covers both
 *       JSON-LD schema arrays AND Interactivity-API `data-wp-context` state
 *       blobs — both are non-paint, verified against sgs/google-reviews'
 *       autoplaySpeed/showDots/showArrows real shape)
 *     - the CONDITION of an `if (...)` whose braced body contains a
 *       data-, aria-, or wp_json_encode marker (covers sgs/accordion's
 *       `$faq_schema` gating an `if(){ ...wp_json_encode... }` block, and
 *       sgs/google-reviews' `$sgs_gr_drag_to_scroll` gating an
 *       `if(){ $x = ' data-sgs-fx="draggable"'; }` block — the var itself is
 *       never textually inside the quoted attribute value, only the
 *       CONDITION, so this needed its own detector distinct from the direct
 *       attribute-value lookback above)
 *     - a CSS custom property (`--name`) whose name contains "hover"/"focus"
 *       (sgs/button's `--sgs-btn-color-hover`, unconditionally declared in
 *       PHP but only ever CONSUMED by a `:hover` rule in the compiled
 *       style.css — the render.php emission site alone can't see that
 *       consumer, so the naming convention is the signal)
 *     - a CSS declaration whose SELECTOR contains `:hover`/`:focus`/
 *       `:focus-visible` (never a base/unconditional selector — live-verified
 *       this session that editor-canvas `:hover` genuinely works)
 *     - a CSS declaration under `@media (prefers-reduced-motion...)`
 *     - a CSS declaration whose PROPERTY is a motion-timing property
 *       (transition/transition-duration/transition-delay/
 *       transition-timing-function/transition-property/animation/
 *       animation-duration/animation-delay/animation-timing-function/
 *       animation-iteration-count/animation-name) — generalises the
 *       reduced-motion reasoning: a timing spec has zero visible effect on a
 *       STATIC (non-animating) capture regardless of selector. Real shape:
 *       sgs/button's `.uid.sgs-button{transition:all {$duration}ms
 *       {$easing};}` (double-quote `{$var}` interpolation, not CHECK B's
 *       single-quote-concat shape — precedingCssPropertyName() below handles
 *       BOTH styles by scanning backward for the nearest unclosed
 *       `property:` rather than requiring immediate adjacency, since a
 *       `transition` value has multiple tokens before the variable).
 *   If EVERY usage site classifies into one of these, exempt. If even one
 *   site is unclassified (a genuine unconditional CSS property, visible text,
 *   a media src/url, or anything this detector doesn't recognise), the
 *   attribute STAYS FLAGGED — the default is conservative, never a silent
 *   swallow of a real candidate.
 *   String-literal-embedded braces (render.php builds CSS via PHP string
 *   concatenation, and CSS text has its OWN `{`/`}` that would corrupt a
 *   naive PHP-code brace counter) are handled by buildStringMask() — a linear
 *   single/double-quote-aware scan that masks positions inside PHP string
 *   literals so `findMatchingParen`/`findMatchingBrace` only count REAL PHP
 *   control-flow braces/parens, never ones sitting inside a quoted CSS rule.
 *   BLIND SPOTS: heredoc/nowdoc PHP strings are not masked (grepped
 *   2026-08-13 — zero render.php in this tree uses `<<<`, so this is
 *   currently inert, not a live gap). The `if (...)` gating-body scan is
 *   whole-body TEXT search, same "not scoped control-flow proof" caveat as
 *   CHECK B's own isValueIntercepted(). classifyCssDeclarationSink()'s
 *   "nearest preceding selector" is a backward text scan assuming each CSS
 *   rule is authored as one self-contained, brace-balanced PHP string
 *   segment (true everywhere observed in this codebase 2026-08-13) — a rule
 *   split across multiple concatenated PHP statements would not resolve
 *   correctly.
 *   CROSS-FILE CONSUMPTION (measured, not extended — 2026-08-13 refinement
 *   2). The dataflow trace in signal 1 is scoped to the block's OWN
 *   render.php — it does not follow a PHP function call into a SHARED
 *   helper defined in another file (e.g. `field_id()`/`field_label()`/
 *   `field_input_attrs()` in `includes/forms/field-render-helpers.php`,
 *   `sgs_transition_vars()` in `includes/helpers-tokens.php`). When the
 *   attribute's only render.php appearance is as an ARGUMENT to one of
 *   these (`field_id( $attributes['fieldName'] ?? 'unnamed' )`,
 *   `sgs_transition_vars( $attributes )`), the classifier can't see that
 *   the callee ultimately lands the value in a non-paint sink (an `id`/
 *   `for` HTML attribute; a `--sgs-transition-*` custom property consumed
 *   only by a `:hover`/`transition` rule) — so it stays flagged even though
 *   it is, by the same non-paint reasoning signal 1 already applies
 *   elsewhere, a false positive. Measured live 2026-08-13 against the
 *   152-finding backlog: exactly 9 findings are this shape (7x
 *   `fieldName` across the form-field-* family via `field_id()`, plus
 *   `sgs/post-grid`'s `transitionDuration`/`transitionEasing` via
 *   `sgs_transition_vars()`) — 5.9% of the backlog. DELIBERATELY NOT
 *   extended into a real cross-file AST walk: at this volume, hand-
 *   verifying each call site and baselining it is faster and lower-risk
 *   than building a call-graph resolver (which would need to follow `use
 *   function` imports, parse the target file, and re-run the SAME
 *   classifyUsageSite() logic recursively — real complexity for ~9
 *   findings). Revisit if a future survey run finds this shape at a volume
 *   where hand-classification stops being the cheaper path.
 *
 */

'use strict';

const { BOOLEAN_ATTR_KEYWORDS } = require( './lib-php-html-context' );
const { findMatchingBrace, findMatchingParen } = require( './lib-php-mask' );

/**
 * Find the innermost `if ( ... ) { ... }` whose CONDITION span contains
 * `offset` (i.e. this usage IS part of the if-test itself, not its body).
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {{bodyStart:number, bodyEnd:number}|null}
 */
function findEnclosingIfConditionAndBody( phpSrc, mask, offset ) {
	const ifRe = /\bif\s*\(/g;
	let best = null;
	let m;
	while ( ( m = ifRe.exec( phpSrc ) ) !== null ) {
		if ( mask[ m.index ] ) {
			continue;
		}
		const openParenIdx = m.index + m[ 0 ].length - 1;
		const closeParenIdx = findMatchingParen( phpSrc, mask, openParenIdx );
		if ( closeParenIdx === -1 ) {
			continue;
		}
		if ( offset <= openParenIdx || offset >= closeParenIdx ) {
			continue;
		}
		let bodyOpen = -1;
		for ( let i = closeParenIdx + 1; i < phpSrc.length; i++ ) {
			if ( mask[ i ] ) {
				continue;
			}
			if ( /\s/.test( phpSrc[ i ] ) ) {
				continue;
			}
			if ( phpSrc[ i ] === '{' ) {
				bodyOpen = i;
			}
			break;
		}
		if ( bodyOpen === -1 ) {
			continue;
		}
		const bodyClose = findMatchingBrace( phpSrc, mask, bodyOpen );
		if ( bodyClose === -1 ) {
			continue;
		}
		if ( ! best || bodyClose - bodyOpen < best.bodyEnd - best.bodyStart ) {
			best = { bodyStart: bodyOpen, bodyEnd: bodyClose };
		}
	}
	return best;
}

/**
 * Classify a usage site that is the CONDITION of an `if (...)` whose braced
 * BODY textually contains a data-, aria-, or JSON-LD marker (real shape:
 * sgs/accordion's `$faq_schema` gating `if(){ ...wp_json_encode... }`;
 * sgs/google-reviews' `$sgs_gr_drag_to_scroll` gating
 * `if(){ $x = ' data-sgs-fx="draggable"'; }`).
 *
 * @param {string}          phpSrc render.php source.
 * @param {Array<boolean>}  mask   From buildStringMask().
 * @param {number}          offset Usage-site offset.
 * @return {string|null} 'json-ld' | 'data' | 'aria' | null.
 */
function classifyIfConditionGate( phpSrc, mask, offset ) {
	const enclosing = findEnclosingIfConditionAndBody( phpSrc, mask, offset );
	if ( ! enclosing ) {
		return null;
	}
	const bodyText = phpSrc.slice( enclosing.bodyStart, enclosing.bodyEnd );
	if ( /wp_json_encode\s*\(|application\/ld\+json/.test( bodyText ) ) {
		return 'json-ld';
	}
	if ( /data-[\w-]+\s*=|['"]data-[\w-]+['"]\s*=>/.test( bodyText ) ) {
		return 'data';
	}
	if ( /aria-[\w-]+\s*=|['"]aria-[\w-]+['"]\s*=>/.test( bodyText ) ) {
		return 'aria';
	}
	return null;
}

/**
 * True if a native boolean-attribute keyword literal (loop/autoplay/etc.)
 * sits within a small window of `offset` — the shape used when a var GATES
 * appending a bare keyword string rather than being assigned to a named
 * attribute (sgs/audio's `$audio_bool .= $loop ? ' loop' : '';`).
 *
 * @param {string} phpSrc render.php source.
 * @param {number} offset Usage-site offset.
 * @param {number} [window] Scan window in characters, each side.
 * @return {boolean}
 */
function nearbyBooleanKeywordLiteral( phpSrc, offset, window ) {
	window = window || 200;
	const start = Math.max( 0, offset - window );
	const end = Math.min( phpSrc.length, offset + window );
	const slice = phpSrc.slice( start, end );
	const re = /['"]\s*([a-zA-Z-]+)\s*['"]/g;
	let m;
	while ( ( m = re.exec( slice ) ) !== null ) {
		if ( BOOLEAN_ATTR_KEYWORDS.has( m[ 1 ].toLowerCase() ) ) {
			return true;
		}
	}
	return false;
}

module.exports = {
	classifyIfConditionGate,
	findEnclosingIfConditionAndBody,
	nearbyBooleanKeywordLiteral,
};
