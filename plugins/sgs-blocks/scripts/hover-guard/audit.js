'use strict';

/**
 * Pure (non-mutating) audit of `:hover` rules in a CSS source string. Used
 * both for baseline measurement (before the transform runs) and by the
 * checker (after the transform runs) to confirm zero motion-only `:hover`
 * rules remain unguarded. Shares classification logic with transform.js —
 * this module must never diverge from what the transform actually does, or
 * a "0 unguarded" checker result would not mean what it claims.
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );
const { splitSelectorList } = require( './selector-split.js' );
const { classifyDeclarations } = require( './classify.js' );
const { SGS_HOVER_NOT_TOUCH } = require( './transform.js' );

/**
 * @typedef {Object} AuditFinding
 * @property {string} kind 'unguarded-motion' | 'ambiguous-selector' | 'unclassified-declarations'
 * @property {string} selector
 * @property {number} line
 * @property {string} rule
 */

/**
 * @param {string} css
 * @param {string} filename
 * @returns {{
 *   unguardedMotion: AuditFinding[],
 *   ambiguous: AuditFinding[],
 *   unclassified: AuditFinding[],
 *   colourSkippedCount: number,
 *   textDecorationSkippedCount: number,
 *   alreadyGuardedCount: number,
 *   totalHoverMembers: number,
 * }}
 */
function auditCss( css, filename ) {
	const root = postcss.parse( css, { from: filename } );

	const unguardedMotion = [];
	const ambiguous = [];
	const unclassified = [];
	let colourSkippedCount = 0;
	let textDecorationSkippedCount = 0;
	let alreadyGuardedCount = 0;
	let totalHoverMembers = 0;

	root.walkRules( ( rule ) => {
		const selectorText = rule.selector || '';
		if ( ! selectorText.includes( ':hover' ) ) {
			return;
		}

		const { hover, ambiguous: ambig } = splitSelectorList( selectorText );
		const line = rule.source && rule.source.start ? rule.source.start.line : 0;

		if ( ambig.length > 0 ) {
			ambiguous.push( { kind: 'ambiguous-selector', selector: ambig.join( ', ' ), line, rule: rule.toString() } );
		}

		if ( 0 === hover.length ) {
			return;
		}

		const alreadyGuarded = hover.filter( ( s ) => s.startsWith( SGS_HOVER_NOT_TOUCH ) );
		const freshHover = hover.filter( ( s ) => ! s.startsWith( SGS_HOVER_NOT_TOUCH ) );

		totalHoverMembers += hover.length;
		alreadyGuardedCount += alreadyGuarded.length;

		if ( 0 === freshHover.length ) {
			return;
		}

		const decls = [];
		rule.walkDecls( ( d ) => {
			if ( d.parent === rule ) {
				decls.push( { prop: d.prop, value: d.value } );
			}
		} );
		const verdict = classifyDeclarations( decls );

		if ( 'colour' === verdict ) {
			colourSkippedCount += freshHover.length;
			return;
		}

		if ( 'text-decoration-only' === verdict ) {
			textDecorationSkippedCount += freshHover.length;
			return;
		}

		if ( 'unknown' === verdict ) {
			unclassified.push( { kind: 'unclassified-declarations', selector: freshHover.join( ', ' ), line, rule: rule.toString() } );
			return;
		}

		unguardedMotion.push( { kind: 'unguarded-motion', selector: freshHover.join( ', ' ), line, rule: rule.toString() } );
	} );

	return {
		unguardedMotion,
		ambiguous,
		unclassified,
		colourSkippedCount,
		textDecorationSkippedCount,
		alreadyGuardedCount,
		totalHoverMembers,
	};
}

module.exports = { auditCss };
