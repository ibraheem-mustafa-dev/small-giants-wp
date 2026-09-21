'use strict';

/**
 * Forced-colours shadow fallback for STATIC stylesheets (Wave 3C U-1 commit 4f-1).
 *
 * Browsers remove `box-shadow` in forced-colours (high-contrast) mode, so an element that
 * depends on its shadow for an edge would vanish into its background. PHP-written shadows get
 * the fallback from `sgs_shadow_box_decls()`; this transform gives the same fallback to every
 * shadow written in a stylesheet, in ONE place, so no block stylesheet needs hand-editing.
 *
 * For each resting rule that draws a shadow it appends a sibling rule:
 *
 *   @media (forced-colors:active){ SEL:not(:focus-visible){ outline:1px solid CanvasText; outline-offset:-1px } }
 *
 * Skipped on purpose: `none`/global keywords, inset-only shadows (an inner effect, not an
 * edge), rules for a transient state (`:hover`, `:focus*`, `:active`; a hover shadow is
 * decoration, and the resting rule carries the edge), pseudo-element selectors, rules inside
 * `@keyframes`, and rules already inside a forced-colors query. Idempotent: a selector that
 * already has its fallback is left alone.
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );

const FALLBACK_DECLS = 'outline:1px solid CanvasText;outline-offset:-1px';
const TRANSIENT_STATE = /:(hover|focus|focus-within|focus-visible|active)\b/i;
const PSEUDO_ELEMENT = /::|:(before|after|first-line|first-letter)\b/i;
const FORCED_QUERY = /forced-colors\s*:\s*active/i;

function ignoredValue( value ) {
	const v = value.trim().toLowerCase();
	return (
		'' === v ||
		/^(none|unset|initial|inherit|revert|revert-layer)(\s*!important)?$/.test( v ) ||
		/^inset\b/.test( v )
	);
}

function insideForcedColours( node ) {
	for ( let p = node.parent; p; p = p.parent ) {
		if ( 'atrule' === p.type && 'media' === p.name.toLowerCase() && FORCED_QUERY.test( p.params ) ) {
			return true;
		}
		if ( 'atrule' === p.type && /keyframes$/i.test( p.name ) ) {
			return true;
		}
	}
	return false;
}

function selectorsOf( rule ) {
	// postcss splits a selector list on top-level commas only, so `:is(a, b)` stays whole.
	return rule.selectors.map( ( selector ) => ( { selector } ) );
}

function needsFallback( rule ) {
	if ( insideForcedColours( rule ) ) {
		return false;
	}
	let draws = false;
	rule.walkDecls( /^box-shadow$/i, ( decl ) => {
		if ( decl.parent === rule && ! ignoredValue( decl.value ) ) {
			draws = true;
		}
	} );
	if ( ! draws ) {
		return false;
	}
	const sels = selectorsOf( rule ).map( ( s ) => String( s.selector || s ).trim() ).filter( Boolean );
	return sels.length > 0 && sels.every( ( s ) => ! TRANSIENT_STATE.test( s ) && ! PSEUDO_ELEMENT.test( s ) );
}

function fallbackSelector( rule ) {
	return selectorsOf( rule )
		.map( ( s ) => String( s.selector || s ).trim() )
		.filter( Boolean )
		.map( ( s ) => s + ':not(:focus-visible)' )
		.join( ',' );
}

/**
 * Offset just after the closing brace of the rule that starts at `start`. Counts braces itself,
 * skipping strings and comments, because postcss reports the end of a rule oddly when it is
 * followed directly by its parent's closing brace (minified output).
 *
 * @param {string} css   Stylesheet text.
 * @param {number} start Offset of the rule's first character.
 * @return {number} Offset after the rule's closing brace.
 */
function endOfRule( css, start ) {
	let depth = 0;
	for ( let i = start; i < css.length; i++ ) {
		const c = css[ i ];
		if ( '"' === c || "'" === c ) {
			for ( i++; i < css.length && css[ i ] !== c; i++ ) {
				if ( '\\' === css[ i ] ) {
					i++;
				}
			}
		} else if ( '/' === c && '*' === css[ i + 1 ] ) {
			i = css.indexOf( '*/', i + 2 );
			if ( -1 === i ) {
				return css.length;
			}
			i++;
		} else if ( '{' === c ) {
			depth++;
		} else if ( '}' === c && 0 === --depth ) {
			return i + 1;
		}
	}
	return css.length;
}

/**
 * @param {string} css  Stylesheet text.
 * @param {string} file Path, for messages.
 * @return {{css:string, added:number, existing:number}} Result.
 */
function transformCss( css, file ) {
	const root = postcss.parse( css, { from: file } );
	const have = new Set();
	root.walkAtRules( 'media', ( at ) => {
		if ( FORCED_QUERY.test( at.params ) ) {
			at.walkRules( ( r ) => have.add( r.selector.replace( /\s+/g, '' ) ) );
		}
	} );

	const targets = [];
	root.walkRules( ( rule ) => {
		if ( needsFallback( rule ) ) {
			targets.push( rule );
		}
	} );

	// Splice the new text in at exact offsets instead of re-serialising the tree: postcss
	// rewrites some text inside comments (`<style` becomes `\3c style`), and this runs over
	// hand-written theme files as well as build output.
	const inserts = [];
	let existing = 0;
	for ( const rule of targets ) {
		const sel = fallbackSelector( rule );
		if ( have.has( sel.replace( /\s+/g, '' ) ) ) {
			existing++;
			continue;
		}
		have.add( sel.replace( /\s+/g, '' ) );
		inserts.push( {
			at: endOfRule( css, rule.source.start.offset ),
			text: `\n@media (forced-colors:active){${ sel }{${ FALLBACK_DECLS }}}\n`,
		} );
	}
	let out = css;
	for ( const { at, text } of inserts.sort( ( a, b ) => b.at - a.at ) ) {
		out = out.slice( 0, at ) + text + out.slice( at );
	}
	return { css: out, added: inserts.length, existing };
}

/**
 * Count the rules that still draw a shadow without a fallback (the check).
 *
 * @param {string} css  Stylesheet text.
 * @param {string} file Path, for messages.
 * @return {Array<{line:number, selector:string}>} Uncovered rules.
 */
function findUncovered( css, file ) {
	const root = postcss.parse( css, { from: file } );
	const have = new Set();
	root.walkAtRules( 'media', ( at ) => {
		if ( FORCED_QUERY.test( at.params ) ) {
			at.walkRules( ( r ) => have.add( r.selector.replace( /\s+/g, '' ) ) );
		}
	} );
	const out = [];
	root.walkRules( ( rule ) => {
		if ( needsFallback( rule ) && ! have.has( fallbackSelector( rule ).replace( /\s+/g, '' ) ) ) {
			out.push( { line: rule.source && rule.source.start ? rule.source.start.line : 0, selector: rule.selector } );
		}
	} );
	return out;
}

module.exports = { transformCss, findUncovered, needsFallback };
