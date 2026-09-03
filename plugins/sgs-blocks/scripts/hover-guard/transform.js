'use strict';

/**
 * Build-time transform: wraps motion-only `:hover` rules in compiled block
 * CSS with BOTH touch-safety layers (see includes/helpers-hover-state.php
 * for the authoritative contract this mirrors on the static-CSS side).
 *
 * Runs over `build/blocks/*​/style.css` as a postbuild step — see the
 * repo report for the exact package.json line to add (this script does
 * not edit package.json itself, by design/scope).
 *
 * SCOPE (deliberate, matches the brief):
 *   - Only `:hover` rules whose declarations are motion-only (transform,
 *     opacity, filter, translate, scale, rotate, box-shadow, or a proven
 *     colour-free subset of border/outline/background shorthands) are
 *     auto-guarded.
 *   - A `:hover` rule carrying any colour-family declaration is left
 *     completely untouched — colour hovers are out of scope for this
 *     transform (see the report's "deliberately not touched" section).
 *   - A `:hover` rule this module cannot classify with confidence is left
 *     completely untouched AND recorded, so the companion checker
 *     (check.js) can fail the build on it rather than the transform
 *     silently mangling an edge case.
 *   - A selector member combining `:hover` with `:focus-visible` /
 *     `:focus-within` in the SAME compound chain is split: only the hover
 *     half is guarded, the focus half is left outside both guards,
 *     unmoved, per helpers-hover-state.php's binding rule.
 *
 * IDEMPOTENCE. A hover-member selector already carrying the exact guard
 * prefix `:where(:root:not(.sgs-touch-input))` is left completely alone —
 * this makes re-running the transform over already-guarded output a no-op.
 *
 * @package SGS\Blocks
 */

const postcss = require( 'postcss' );
const { splitSelectorList } = require( './selector-split.js' );
const { classifyDeclarations } = require( './classify.js' );

/** Must stay byte-identical to includes/helpers-hover-state.php's constants. */
const SGS_HOVER_MEDIA_PARAMS = '(hover: hover) and (pointer: fine)';
const SGS_HOVER_NOT_TOUCH = ':where(:root:not(.sgs-touch-input))';

/**
 * @typedef {Object} TransformFinding
 * @property {string} kind      'ambiguous-selector' | 'unclassified-declarations'
 * @property {string} selector  The offending selector text.
 * @property {number} line      1-based source line in the input CSS.
 * @property {string} rule      The full rule text (selector + declarations) for the report.
 */

/**
 * Read declarations off a postcss Rule into {prop, value} pairs, ignoring
 * comments.
 *
 * @param {import('postcss').Rule} rule
 * @returns {{prop: string, value: string}[]}
 */
function ruleDeclarations( rule ) {
	const decls = [];
	rule.walkDecls( ( decl ) => {
		// only DIRECT children — a plain rule has no nested rules, but guard
		// against the (currently impossible pre-nesting-spec) case anyway.
		if ( decl.parent === rule ) {
			decls.push( { prop: decl.prop, value: decl.value } );
		}
	} );
	return decls;
}

/**
 * Clone the chain of at-rule ancestors of `node` (root excluded), OUTERMOST
 * first, as empty shells (no children) ready to be nested around new content.
 *
 * @param {import('postcss').Node} node
 * @returns {import('postcss').AtRule[]} Empty at-rule clones, outermost first.
 */
function ancestorAtRuleChain( node ) {
	const chain = [];
	let cursor = node.parent;
	while ( cursor && 'root' !== cursor.type ) {
		if ( 'atrule' === cursor.type ) {
			const shell = cursor.clone();
			shell.removeAll();
			chain.unshift( shell );
		}
		cursor = cursor.parent;
	}
	return chain;
}

/**
 * Nest `innerNode` inside a clone of each at-rule in `chain` (outermost
 * first), then inside the layer-1 hover media query as the true outermost
 * wrapper, and return the finished top-level node ready to insert.
 *
 * @param {import('postcss').Rule} innerNode
 * @param {import('postcss').AtRule[]} chain Outermost-first ancestor shells.
 * @returns {import('postcss').AtRule} The `@media (hover...)` wrapper.
 */
function wrapForInsertion( innerNode, chain ) {
	let content = innerNode;
	// Nest existing ancestors innermost-first around content, so the final
	// order (outside-in) is: hover-media -> chain[0] -> chain[1] -> ... -> rule.
	for ( let i = chain.length - 1; i >= 0; i-- ) {
		const shell = chain[ i ];
		shell.append( content );
		content = shell;
	}
	const hoverMedia = postcss.atRule( { name: 'media', params: SGS_HOVER_MEDIA_PARAMS } );
	hoverMedia.append( content );
	return hoverMedia;
}

/**
 * Run the transform over a CSS source string.
 *
 * @param {string} css      Input CSS text.
 * @param {string} filename For error/finding messages only.
 * @returns {{css: string, findings: TransformFinding[], guardedCount: number, skippedAlreadyGuarded: number}}
 */
function transformCss( css, filename ) {
	const root = postcss.parse( css, { from: filename } );
	const findings = [];
	let guardedCount = 0;
	let skippedAlreadyGuarded = 0;

	/** @type {{atRule: import('postcss').AtRule, after: import('postcss').Node}[]} */
	const pendingInsertions = [];
	/** @type {import('postcss').Rule[]} */
	const pendingRemovals = [];

	root.walkRules( ( rule ) => {
		const selectorText = rule.selector || '';
		if ( ! selectorText.includes( ':hover' ) ) {
			return;
		}

		const { hover, focus, other, ambiguous } = splitSelectorList( selectorText );

		if ( ambiguous.length > 0 ) {
			findings.push( {
				kind: 'ambiguous-selector',
				selector: ambiguous.join( ', ' ),
				line: rule.source && rule.source.start ? rule.source.start.line : 0,
				rule: rule.toString(),
			} );
			return; // leave this rule untouched entirely
		}

		// Split off members already guarded from a prior run (idempotence).
		const alreadyGuarded = hover.filter( ( s ) => s.startsWith( SGS_HOVER_NOT_TOUCH ) );
		const freshHover = hover.filter( ( s ) => ! s.startsWith( SGS_HOVER_NOT_TOUCH ) );
		skippedAlreadyGuarded += alreadyGuarded.length;

		if ( 0 === freshHover.length ) {
			return; // nothing new to guard in this rule
		}

		const decls = ruleDeclarations( rule );
		const verdict = classifyDeclarations( decls );

		if ( 'colour' === verdict || 'text-decoration-only' === verdict ) {
			return; // out of scope by design — see classify.js module docblock
		}

		if ( 'unknown' === verdict ) {
			findings.push( {
				kind: 'unclassified-declarations',
				selector: freshHover.join( ', ' ),
				line: rule.source && rule.source.start ? rule.source.start.line : 0,
				rule: rule.toString(),
			} );
			return; // leave untouched — checker will fail the build on this
		}

		// verdict === 'motion' — build the guarded sibling rule.
		const guardedSelector = freshHover
			.map( ( s ) => SGS_HOVER_NOT_TOUCH + ' ' + s )
			.join( ',\n' );

		const guardedRule = postcss.rule( { selector: guardedSelector } );
		for ( const { prop, value } of decls ) {
			guardedRule.append( postcss.decl( { prop, value } ) );
		}

		const chain = ancestorAtRuleChain( rule );
		const wrapper = wrapForInsertion( guardedRule, chain );

		// Insert near the outermost ancestor (or the rule itself if none),
		// so guarded output stays close to its source for readability.
		const insertAfterNode = chain.length > 0 ? topOf( rule ) : rule;
		pendingInsertions.push( { atRule: wrapper, after: insertAfterNode } );

		guardedCount += freshHover.length;

		// Strip the freshly-guarded members out of the original selector,
		// leaving focus/other/already-guarded members exactly as they were.
		const remaining = [ ...other, ...focus, ...alreadyGuarded ];
		if ( 0 === remaining.length ) {
			pendingRemovals.push( rule );
		} else {
			rule.selector = remaining.join( ',\n' );
		}
	} );

	// Apply removals first (cheap, no interaction with insertion targets
	// since we insert AFTER the outermost ancestor of the original rule,
	// never after the rule's own now-possibly-removed self in a way that
	// would leave a dangling reference — postcss Node.after() only needs
	// the node's current parent, which removal doesn't invalidate for a
	// node whose parent is still in the tree).
	for ( const rule of pendingRemovals ) {
		if ( rule.parent ) {
			rule.remove();
		}
	}

	for ( const { atRule, after } of pendingInsertions ) {
		if ( after.parent ) {
			after.after( atRule );
		} else {
			root.append( atRule );
		}
	}

	return {
		css: root.toString(),
		findings,
		guardedCount,
		skippedAlreadyGuarded,
	};
}

/**
 * Walk up to the highest ancestor that is still a direct child of the
 * postcss Root (i.e. the outermost at-rule containing `node`, or `node`
 * itself if it has no at-rule ancestors).
 *
 * @param {import('postcss').Node} node
 * @returns {import('postcss').Node}
 */
function topOf( node ) {
	let cursor = node;
	while ( cursor.parent && 'root' !== cursor.parent.type ) {
		cursor = cursor.parent;
	}
	return cursor;
}

module.exports = { transformCss, SGS_HOVER_MEDIA_PARAMS, SGS_HOVER_NOT_TOUCH };
