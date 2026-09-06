'use strict';

// GROUND-TRUTH: spec=.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md PART F
// (anti-patterns, "a reset control that does nothing") source=task brief
// 2026-09-04 (Bean-scoped, Task 2a). evidence=live-read
// scripts/check-empty-inspector-containers.js's AST-walk technique (its own
// header records two regex attempts that got this SAME class of question
// wrong in opposite directions — a JSXElement's children/props form a tree,
// not a flat regex-matchable string — so this rule follows its precedent and
// does not regress to regex).
//
// WHAT THIS CATCHES. A `<ToolsPanelItem>` takes two props that exist purely
// to let a client "reset" one control back to its unset state:
//   - `hasValue={ () => ... }` — WordPress calls this to decide whether the
//     control currently differs from its default (drives the "+"/"-" menu
//     and the reset badge).
//   - `onDeselect={ () => ... }` — WordPress calls this WHEN the client
//     clicks reset; its whole job is to clear the attribute(s).
// A `hasValue` arrow whose body references NO identifier (e.g. `() => false`,
// `() => true`) can never distinguish "set" from "unset" — it is a constant
// masquerading as a check. An `onDeselect` arrow whose body calls NOTHING
// (e.g. `() => {}`, `() => undefined`) resets nothing — the client clicks
// "reset", the badge may or may not clear, but the actual attribute value
// never changes. Both are "wired but does nothing": present in the JSX,
// passing every existing shape-based gate (they ARE arrow functions, ARE
// passed to the right prop), invisible to check-dead-controls.js (which asks
// "is the attribute rendered", not "does this specific reset path work").
//
// WHY AN AST WALK, NOT A REGEX (same discipline as check-empty-inspector-
// containers.js). `hasValue={ () => !! attrs.iconColour }` and
// `hasValue={ () => false }` differ only in whether the arrow BODY contains a
// real identifier reference — a question about a parsed expression tree, not
// a string shape. A regex could match "hasValue={ () =>" identically for
// both and would have to re-implement an expression parser to tell them
// apart; Babel already is one.
//
// DELIBERATELY CONSERVATIVE: a `hasValue`/`onDeselect` prop that is NOT a
// literal arrow/function expression (e.g. a reference to an externally
// defined function, `hasValue={ hasIconColour }`) is SKIPPED, not guessed
// at — this rule cannot see into a function it cannot resolve, and a false
// absence here is safe (rule 35's own stated discipline: "a narrow rule that
// is always right beats a broad rule that is sometimes wrong").

const path = require( 'path' );
const { makeFinding } = require( '../core/finding' );

/**
 * Recursively count `Identifier` and `CallExpression` nodes under `node`,
 * ignoring position metadata. Mirrors check-empty-inspector-containers.js's
 * own generic object-tree walker (no @babel/traverse re-entry needed for a
 * subtree already in hand).
 */
function countNodeTypes( node ) {
	const counts = { Identifier: 0, CallExpression: 0 };
	const seen = new Set();
	const walk = ( n ) => {
		if ( ! n || typeof n !== 'object' ) return;
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( seen.has( n ) ) return;
		seen.add( n );
		if ( n.type === 'Identifier' ) counts.Identifier++;
		if ( n.type === 'CallExpression' ) counts.CallExpression++;
		for ( const key of Object.keys( n ) ) {
			if ( [ 'loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments' ].includes( key ) ) continue;
			walk( n[ key ] );
		}
	};
	walk( node );
	return counts;
}

/**
 * Is `node` a literal arrow/function expression this rule can analyse? A
 * reference (`Identifier`) or anything else is left alone — see the
 * "DELIBERATELY CONSERVATIVE" header note.
 */
function isAnalysableFunction( node ) {
	return !! node && ( node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' );
}

function findJsxAttr( openingElement, name ) {
	for ( const attr of openingElement.attributes || [] ) {
		if ( attr.type === 'JSXAttribute' && attr.name && attr.name.name === name ) return attr;
	}
	return null;
}

module.exports = {
	id: '42-no-op-reset-controls',
	checklistItem: null,
	title: 'A ToolsPanelItem reset control (hasValue/onDeselect) that is wired but does nothing (Spec 35 PART F)',
	scope: 'per-block',
	needs: [ 'ast:edit.js' ],
	run( ctx, block ) {
		const ruleId = this.id;
		const editFile = path.join( ctx.blocksDir, block.tail, 'edit.js' );
		const findings = [];

		const ok = ctx.cache.traverse( editFile, {
			JSXElement( nodePath ) {
				const node = nodePath.node;
				const opening = node.openingElement;
				const nameNode = opening.name;
				const name = nameNode && nameNode.type === 'JSXIdentifier' ? nameNode.name : null;
				if ( name !== 'ToolsPanelItem' ) return;

				const label = ( () => {
					const labelAttr = findJsxAttr( opening, 'label' );
					if ( ! labelAttr || ! labelAttr.value ) return null;
					if ( labelAttr.value.type === 'StringLiteral' ) return labelAttr.value.value;
					if (
						labelAttr.value.type === 'JSXExpressionContainer' &&
						labelAttr.value.expression &&
						labelAttr.value.expression.type === 'CallExpression' &&
						labelAttr.value.expression.arguments[ 0 ] &&
						labelAttr.value.expression.arguments[ 0 ].type === 'StringLiteral'
					) {
						return labelAttr.value.expression.arguments[ 0 ].value;
					}
					return null;
				} )();
				const line = node.loc ? node.loc.start.line : 0;

				const hasValueAttr = findJsxAttr( opening, 'hasValue' );
				if ( hasValueAttr && hasValueAttr.value && hasValueAttr.value.type === 'JSXExpressionContainer' ) {
					const fn = hasValueAttr.value.expression;
					if ( isAnalysableFunction( fn ) ) {
						const counts = countNodeTypes( fn.body );
						if ( counts.Identifier === 0 ) {
							findings.push(
								makeFinding( {
									rule: ruleId,
									block: block.slug,
									file: editFile,
									line,
									severity: 'warn',
									kind: 'no-op-has-value',
									detail:
										`${ block.slug }'s ToolsPanelItem${ label ? ` "${ label }"` : '' } at ${ editFile }:${ line } ` +
										"has a `hasValue` prop whose body references NO identifier — it always returns the same " +
										'constant, so it can never tell WordPress whether this control differs from its default. ' +
										'The reset badge / "+" disclosure state is permanently wrong.',
									fix:
										'`hasValue` must read the attribute it is guarding, e.g. `hasValue={ () => !! attributes.' +
										'<attrName> }` (or a comparison against the real default). Point it at the same attribute ' +
										'`onDeselect` clears.',
									keyParts: [ 'no-op-has-value', String( line ) ],
								} )
							);
						}
					}
				}

				const onDeselectAttr = findJsxAttr( opening, 'onDeselect' );
				if ( onDeselectAttr && onDeselectAttr.value && onDeselectAttr.value.type === 'JSXExpressionContainer' ) {
					const fn = onDeselectAttr.value.expression;
					if ( isAnalysableFunction( fn ) ) {
						const counts = countNodeTypes( fn.body );
						if ( counts.CallExpression === 0 ) {
							findings.push(
								makeFinding( {
									rule: ruleId,
									block: block.slug,
									file: editFile,
									line,
									severity: 'warn',
									kind: 'no-op-on-deselect',
									detail:
										`${ block.slug }'s ToolsPanelItem${ label ? ` "${ label }"` : '' } at ${ editFile }:${ line } ` +
										'has an `onDeselect` prop whose body calls NOTHING — clicking "Reset" removes the badge at ' +
										'most, but the attribute value itself never changes.',
									fix:
										'`onDeselect` must call `setAttributes(...)` (or equivalent) to clear the attribute(s) this ' +
										'control owns, e.g. `onDeselect={ () => setAttributes({ <attrName>: undefined }) }`.',
									keyParts: [ 'no-op-on-deselect', String( line ) ],
								} )
							);
						}
					}
				}
			},
		} );
		if ( ! ok ) return [];
		return findings;
	},
	selfTest: {
		fixture: 'fixtures/42-no-op-reset-controls',
		mustFlag: [ 'bad-hasvalue', 'bad-ondeselect' ],
		mustNotFlag: [ 'good', 'no-arrow', 'no-toolspanelitem' ],
	},
};
