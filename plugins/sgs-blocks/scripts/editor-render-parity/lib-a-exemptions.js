/**
 * CHECK A exemption signals 2 (companion co-write) and 3 (no-preview Notice branch).
 *
 * SIGNAL 2 — COMPANION-ID / ATOMIC CO-WRITE EXEMPTION.
 *   If attribute X is always set in the SAME `setAttributes({...})`
 *   call-site object literal as attribute Y, and Y itself already passes
 *   CHECK A cleanly (referenced outside InspectorControls/BlockControls),
 *   exempt X — its visual effect is already represented via its sibling.
 *   Real shape: sgs/media's `imageId`/`imageUrl` are always co-written
 *   (`setAttributes({ imageId: media.id, imageUrl: media.url })`); imageUrl
 *   feeds the canvas `<img src={imageUrl}>`, so imageId is exempt.
 *   sgs/media's `thumbnailId`/`thumbnail` are ALSO always co-written, but
 *   `thumbnail` itself never appears outside InspectorControls (its only JSX
 *   use is inside the MediaUpload picker panel) — so thumbnail does NOT pass
 *   CHECK A cleanly, and thumbnailId correctly stays UNEXEMPTED by this
 *   signal (both remain a genuine gap: the video poster is never shown in
 *   the canvas preview).
 *
 * SIGNAL 3 — EXPLICIT NO-PREVIEW <Notice> BRANCH EXEMPTION.
 *   Real shape (sgs/media/edit.js ~1601-1623): the Edit function is a
 *   sequence of early-return guards — `if ( isImage ) { ...; return (...); }`
 *   then `if ( isSvg ) { ...; return (...); }` — followed by a FINAL fallback
 *   `return (...)` (reached only when isVideo is true, but not itself wrapped
 *   in a textual `{ isVideo && ... }` JSX gate — it's the function's own
 *   return, not an embedded subtree) that renders a `<Notice>` containing
 *   "Preview not available in editor. ... handled by server." That fallback
 *   also renders `{ inspectorControls }`, a shared JSX const containing a
 *   `{ isVideo && (<PanelBody>...<RangeControl value={videoAutoplay}.../>...
 *   </PanelBody>) }` block covering videoAutoplay/videoLoop/videoMuted/
 *   videoControls/videoPlaysInline/videoLazyLoad.
 *   Detection: (a) find every `<Notice>`-named element whose text matches a
 *   no-preview phrase; walk up to its enclosing ReturnStatement. (b) collect
 *   every top-level `if ( FLAG )` / `if ( ! FLAG )` early-return guard flag in
 *   the same function (isImage, isSvg here) — these are flags the FALLBACK
 *   branch is reached WITHOUT. (c) collect every `const FLAG = 'x' === y` /
 *   `y === 'x'` boolean-flag declaration in the file. (d) collect every
 *   `{ FLAG && (<jsx>) }` JSX-gate group. (e) for each declared flag NOT in
 *   the early-return guard set (isVideo, by elimination), union the spans of
 *   every JSX-gate group using that flag, and exempt every block.json-
 *   declared attribute referenced (as a real Identifier read) anywhere in
 *   that union.
 *   BLIND SPOTS: scoped to exactly this "sequence of `if (FLAG) return`
 *   early-return guards, then one fallback return" shape — a switch
 *   statement, nested early returns, or a Notice wrapped directly in its own
 *   `{ FLAG && (<Notice>) }` (a DIFFERENT, narrower flag than the branch's
 *   reachability flag) are not handled and would conservatively find nothing
 *   (never a false exemption, only a missed one). If more than one
 *   non-guard flag exists with no way to disambiguate which is the
 *   fallback's true reachability flag, ALL of them are tried (their
 *   JSX-gated attributes are unioned) — a rare over-exemption risk, accepted
 *   as this file's other checks already accept comparable whole-file
 *   text-search imprecision (see CHECK B blind spot 1).
 *
 */

'use strict';

const traverse = require( '@babel/traverse' ).default;
const { jsxOpeningName } = require( './lib-ast' );

// ---------------------------------------------------------------------------
// SIGNAL 2 — companion-ID / atomic co-write exemption
// ---------------------------------------------------------------------------

/**
 * Group every `setAttributes({...})` call-site's WRITTEN keys, per call-site
 * (not flattened, unlike collectSetAttributesWrites() — signal 2 needs to
 * know which attributes were written TOGETHER in the same object literal).
 *
 * @param {string} src Raw edit.js source.
 * @return {Array<Set<string>>} One Set of co-written attribute names per call-site with 2+ keys.
 */
function collectSetAttributesGroups( src ) {
	const groups = [];
	if ( ! src ) {
		return groups;
	}
	const setAttrRe = /setAttributes\(\s*\{\s*([^}]*)\}/g;
	let m;
	while ( ( m = setAttrRe.exec( src ) ) !== null ) {
		const body = m[ 1 ];
		const keyRe = /(?:^|[\s,])(?:['"]?)([A-Za-z_$][\w$]*)(?:['"]?)\s*:/g;
		const keys = new Set();
		let k;
		while ( ( k = keyRe.exec( body ) ) !== null ) {
			keys.add( k[ 1 ] );
		}
		if ( keys.size > 1 ) {
			groups.push( keys );
		}
	}
	return groups;
}

/**
 * SIGNAL 2 driver: true if `attr` is always co-written (same setAttributes
 * call-site object literal) with some companion attribute that itself
 * already passes CHECK A cleanly (used outside InspectorControls/
 * BlockControls).
 *
 * @param {string}              attr               Attribute name.
 * @param {Array<Set<string>>}  setAttributeGroups From collectSetAttributesGroups().
 * @param {Set<string>}         usedOutsideControls From collectUsedIdentifiersOutsideExcluded().
 * @return {boolean}
 */
function checkCompanionExemption( attr, setAttributeGroups, usedOutsideControls ) {
	for ( const group of setAttributeGroups ) {
		if ( ! group.has( attr ) ) {
			continue;
		}
		for ( const companion of group ) {
			if ( companion !== attr && usedOutsideControls.has( companion ) ) {
				return true;
			}
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// SIGNAL 3 — explicit no-preview <Notice> branch exemption
// ---------------------------------------------------------------------------

const NOTICE_COMPONENT_NAMES = new Set( [ 'Notice' ] );
const NO_PREVIEW_TEXT_RE = /not available in (?:the )?editor|handled by (?:the )?server|no (?:live )?preview|preview (?:is )?not available/i;

/**
 * Collect every top-level `const NAME = <BinaryExpression ===/== >` boolean
 * flag declaration in the file (e.g. `const isVideo = 'video' === mediaType;`).
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Set<string>} Flag names.
 */
function collectBooleanFlagDeclarations( ast ) {
	const flags = new Set();
	traverse( ast, {
		VariableDeclarator( nodePath ) {
			const node = nodePath.node;
			if ( node.id.type !== 'Identifier' || ! node.init ) {
				return;
			}
			if ( node.init.type === 'BinaryExpression' && ( node.init.operator === '===' || node.init.operator === '==' ) ) {
				flags.add( node.id.name );
			}
		},
	} );
	return flags;
}

/**
 * Collect every flag used as the bare (optionally negated) test of an
 * `if ( FLAG )` / `if ( ! FLAG )` whose consequent contains a
 * ReturnStatement — an early-return guard. The FINAL fallback branch (this
 * signal's target) is reached only when none of these guard flags apply.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Set<string>} Guard flag names.
 */
function collectEarlyReturnGuardFlags( ast ) {
	const guards = new Set();
	traverse( ast, {
		IfStatement( nodePath ) {
			const test = nodePath.node.test;
			let ident = null;
			if ( test.type === 'Identifier' ) {
				ident = test.name;
			} else if ( test.type === 'UnaryExpression' && test.operator === '!' && test.argument.type === 'Identifier' ) {
				ident = test.argument.name;
			}
			if ( ! ident ) {
				return;
			}
			let hasReturn = false;
			nodePath.get( 'consequent' ).traverse( {
				ReturnStatement() {
					hasReturn = true;
				},
			} );
			if ( hasReturn ) {
				guards.add( ident );
			}
		},
	} );
	return guards;
}

/**
 * Collect every `{ FLAG && (<jsx>) }` JSX-gate group: a JSXExpressionContainer
 * whose expression is a `&&` LogicalExpression with a bare Identifier left
 * operand and a JSX right operand.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @return {Array<{flag:string, start:number, end:number}>}
 */
function collectFlagGatedJsxGroups( ast ) {
	const groups = [];
	traverse( ast, {
		LogicalExpression( nodePath ) {
			const node = nodePath.node;
			if ( node.operator !== '&&' || node.left.type !== 'Identifier' ) {
				return;
			}
			if ( node.right.type !== 'JSXElement' && node.right.type !== 'JSXFragment' ) {
				return;
			}
			groups.push( { flag: node.left.name, start: node.right.start, end: node.right.end } );
		},
	} );
	return groups;
}

/**
 * Find every `<Notice>`-named element whose text matches a no-preview
 * phrase, and return the source span of its enclosing ReturnStatement.
 *
 * @param {Object} ast Parsed edit.js AST.
 * @param {string} src Raw edit.js source.
 * @return {Array<{start:number, end:number}>}
 */
function findNoticeNoPreviewReturnSpans( ast, src ) {
	const spans = [];
	traverse( ast, {
		JSXElement( nodePath ) {
			const name = jsxOpeningName( nodePath.node.openingElement );
			if ( ! NOTICE_COMPONENT_NAMES.has( name ) ) {
				return;
			}
			const text = src.slice( nodePath.node.start, nodePath.node.end );
			if ( ! NO_PREVIEW_TEXT_RE.test( text ) ) {
				return;
			}
			let p = nodePath;
			while ( p && p.node.type !== 'ReturnStatement' ) {
				p = p.parentPath;
			}
			if ( p ) {
				spans.push( { start: p.node.start, end: p.node.end } );
			}
		},
	} );
	return spans;
}

/**
 * Collect every genuine Identifier READ within [start,end) — same exclusion
 * rules as collectUsedIdentifiersOutsideExcluded() (destructuring bindings,
 * plain object-literal keys, JSX tag/attribute names, import specifiers are
 * not reads) but scoped to a source RANGE rather than an exclusion set.
 *
 * @param {Object} ast   Parsed edit.js AST.
 * @param {number} start Range start (inclusive).
 * @param {number} end   Range end (exclusive).
 * @return {Set<string>}
 */
function collectIdentifiersInRange( ast, start, end ) {
	const found = new Set();
	traverse( ast, {
		Identifier( nodePath ) {
			const node = nodePath.node;
			if ( node.start < start || node.start >= end ) {
				return;
			}
			const parent = nodePath.parent;
			if ( parent.type === 'JSXAttribute' && parent.name === node ) {
				return;
			}
			if ( ( parent.type === 'JSXOpeningElement' || parent.type === 'JSXClosingElement' ) && parent.name === node ) {
				return;
			}
			if ( parent.type === 'JSXMemberExpression' ) {
				return;
			}
			if (
				parent.type === 'ImportSpecifier' ||
				parent.type === 'ImportDefaultSpecifier' ||
				parent.type === 'ImportNamespaceSpecifier'
			) {
				return;
			}
			if ( parent.type === 'ObjectProperty' ) {
				const container = nodePath.parentPath.parentPath.node;
				if ( container.type === 'ObjectPattern' ) {
					return;
				}
				if ( container.type === 'ObjectExpression' && parent.key === node && ! parent.computed ) {
					return;
				}
			}
			found.add( node.name );
		},
	} );
	return found;
}

/**
 * SIGNAL 3 driver: attributes gated by the same branch condition as an
 * explicit no-preview `<Notice>`.
 *
 * @param {Object} ast           Parsed edit.js AST.
 * @param {string} src           Raw edit.js source.
 * @param {Set<string>} declaredAttrs Attribute names declared in block.json.
 * @return {Set<string>} Exempt attribute names.
 */
function checkNoPreviewNoticeExemption( ast, src, declaredAttrs ) {
	const noticeSpans = findNoticeNoPreviewReturnSpans( ast, src );
	if ( ! noticeSpans.length ) {
		return new Set();
	}
	const guardFlags = collectEarlyReturnGuardFlags( ast );
	const allFlags = collectBooleanFlagDeclarations( ast );
	const flagGroups = collectFlagGatedJsxGroups( ast );
	const exempt = new Set();
	// noticeSpans existing proves at least one fallback branch renders a
	// no-preview Notice; every declared flag NOT used as an early-return
	// guard is a candidate reachability flag for that fallback (see file
	// header blind-spot note on ambiguity when more than one remains).
	for ( const flagName of allFlags ) {
		if ( guardFlags.has( flagName ) ) {
			continue;
		}
		for ( const group of flagGroups ) {
			if ( group.flag !== flagName ) {
				continue;
			}
			for ( const idName of collectIdentifiersInRange( ast, group.start, group.end ) ) {
				if ( declaredAttrs.has( idName ) ) {
					exempt.add( idName );
				}
			}
		}
	}
	return exempt;
}

module.exports = {
	checkCompanionExemption,
	checkNoPreviewNoticeExemption,
	collectSetAttributesGroups,
};
