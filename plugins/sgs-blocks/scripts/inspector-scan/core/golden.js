'use strict';

/**
 * core/golden.js — the shared GOLDEN-CONTROL engine (C4 step 1, 2026-08-19).
 *
 * WHY THIS EXISTS. Enforcing `golden-controls.json` is not one job, it is FIVE
 * independent axes (canonical adoption, native-UI retirement, state minimum,
 * gradient mechanism, emission mechanism) applied across THIRTEEN control types.
 * Written per rule that is 65 implementations of the same five questions. This
 * module asks them once, so a rule, a survey and a codemod all get the SAME
 * answer, and so a new control type is a schema row rather than new code.
 *
 * Extracted from `rules/31-golden-colour-control.js`, which owned all of it
 * privately. The extraction's regression check is that rule 31's finding count
 * does not move when it starts importing instead of owning: 409 before, 409
 * after. A refactor that changes a detector's output is not a refactor.
 *
 * ⛔ AXIS SCOPE IS NOT UNIFORM — the trap that cost five false positives on
 * survey-golden-conformance.js's first run. `canonical` adoption needs the
 * one-hop view THROUGH shared components (a block reaches DesignTokenPicker via
 * SgsColourPanel). `bannedLookalikes` needs that view MINUS the canonical
 * components, because the canonical row component legitimately wraps the raw
 * primitive: `<ColorPalette>` lives inside `DesignTokenPicker.js` (:250, :483)
 * and `GradientCapableColourControl.js` (:107). Flagging that is flagging the
 * conformant shape. Every axis added here must be asked which scope it wants,
 * and pinned by a fixture in BOTH directions.
 *
 * ⛔ COMPONENT RESOLUTION IS NOT DONE HERE. It lives in `core/components.js`
 * `resolveComponentFiles()` — one resolver for the whole tree, carrying the
 * declaration-beats-re-export precedence the 2026-08-17 panel split made
 * load-bearing. Do not add a second one.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const GOLDEN_PATH = path.resolve( __dirname, '..', '..', 'consistency', 'golden-controls.json' );

/** The contract, read from disk. Never inline a copy of it in a rule. */
function loadSchema() {
	return JSON.parse( fs.readFileSync( GOLDEN_PATH, 'utf8' ) );
}

/**
 * `supports.color` sub-flags that make WordPress CORE render its own colour UI.
 *
 * ⛔ `__experimentalSkipSerialization` is NOT one of them. It is the
 * serialisation opt-out and is REQUIRED by the schema's own `conformantShape`
 * ("declared with every sub-flag false" keeps skip-serialisation while
 * suppressing core's UI). Counting it inverts the answer: measured 2026-08-19,
 * including it reports 50 blocks against a true 26. That mistake was made once
 * in this session and caught only by re-reading the schema.
 */
const NATIVE_UI_FLAGS = [ 'background', 'text', 'link', 'gradients', 'button', 'heading', 'enableContrastChecker' ];

/** Live native-UI flags on a parsed block.json; [] when core renders none. */
function nativeUiFlags( blockJson ) {
	const colour = ( ( blockJson || {} ).supports || {} ).color;
	if ( ! colour || typeof colour !== 'object' ) return [];
	return NATIVE_UI_FLAGS.filter( ( f ) => colour[ f ] === true );
}

/**
 * Resolve `rows`/`states` arrays that are NOT bare inline literals.
 *
 * Three live shapes, each confirmed against a real block:
 *   (a) `const rows = []; rows.push({...})`          — product-card
 *   (b) `const rows = [ {...} ]; rows={ rows }`      — nav-menu
 *   (c) `rows={ [ ...(cond ? [...] : []), {...} ] }` — social-icons
 *
 * ⚠ This is the piece that cost a 33-row undercount. Rule 31's first version
 * handled inline literals only, so product-card, nav-menu and social-icons each
 * scored ZERO colour rows while visibly having colour panels — a false absence
 * that reads exactly like a clean result. Do not reimplement it elsewhere.
 *
 * @param {Function} traverseFn Runs a Babel visitor object over the target file.
 * @param {Function} unwrap     Row-object unwrapper (`unwrapRowObject`).
 * @return {{pushedRows:Object, declaredArrays:Object}} keyed by variable name.
 */
function collectIndirectRowSources( traverseFn, unwrap ) {
	const pushedRows = Object.create( null );
	const declaredArrays = Object.create( null );
	traverseFn( {
		CallExpression( nodePath ) {
			const node = nodePath.node;
			const callee = node.callee;
			if (
				! callee ||
				callee.type !== 'MemberExpression' ||
				callee.computed ||
				! callee.property ||
				callee.property.name !== 'push' ||
				! callee.object ||
				callee.object.type !== 'Identifier'
			) {
				return;
			}
			const varName = callee.object.name;
			for ( const arg of node.arguments ) {
				const rowObj = unwrap( arg );
				if ( ! rowObj ) continue;
				if ( ! pushedRows[ varName ] ) pushedRows[ varName ] = [];
				pushedRows[ varName ].push( rowObj );
			}
		},
		VariableDeclarator( nodePath ) {
			const node = nodePath.node;
			if ( node.id && node.id.type === 'Identifier' && node.init && node.init.type === 'ArrayExpression' ) {
				declaredArrays[ node.id.name ] = node.init;
			}
		},
	} );
	return { pushedRows, declaredArrays };
}

// ---------------------------------------------------------------------------
// Pure AST helpers — moved VERBATIM from rule 31 so its output cannot change.
// ---------------------------------------------------------------------------

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) {
		return n.property && n.property.name ? n.property.name : null;
	}
	return null;
}

function findJsxAttr( openingElement, name ) {
	return ( openingElement.attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name
	);
}

function jsxAttrExpr( openingElement, name ) {
	const attr = findJsxAttr( openingElement, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'JSXExpressionContainer' ) return attr.value.expression;
	return attr.value; // e.g. a plain StringLiteral attribute (type="color")
}

function jsxAttrStringValue( openingElement, name ) {
	const attr = findJsxAttr( openingElement, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'StringLiteral' ) return attr.value.value;
	return null;
}

// Resolve a `rows` array element that may be wrapped in a conditional
// (`cond && { ... }`, as trust-bar's icon-circle-shadow row is at edit.js:382)
// down to its underlying ObjectExpression, or null if it isn't one.
function unwrapRowObject( node ) {
	let n = node;
	while ( n && n.type === 'LogicalExpression' ) n = n.right;
	return n && n.type === 'ObjectExpression' ? n : null;
}

function objProp( objExpr, name ) {
	if ( ! objExpr || objExpr.type !== 'ObjectExpression' ) return null;
	const p = objExpr.properties.find(
		( pr ) =>
			pr.type === 'ObjectProperty' &&
			( ( pr.key.type === 'Identifier' && pr.key.name === name ) ||
				( pr.key.type === 'StringLiteral' && pr.key.value === name ) )
	);
	return p ? p.value : null;
}

function objHasProp( objExpr, name ) {
	return objProp( objExpr, name ) !== null;
}

function stringLiteralValue( node ) {
	return node && node.type === 'StringLiteral' ? node.value : null;
}

function booleanLiteralValue( node ) {
	return node && node.type === 'BooleanLiteral' ? node.value : null;
}

// A row/state's `value` expression, resolved to a block.json attribute name.
// Handles the two shapes actually present in this tree: a plain destructured
// identifier (`value={ iconColour }`) and `attributes.x` (`value={
// attributes.iconColour }`). Anything else (nested object access like
// `asideSeparator?.colour`, a ternary, a template) is deliberately NOT
// resolved — see BLIND SPOTS: this can only under-count, never over-count,
// the derived required-states minimum.
function resolveAttrName( node ) {
	if ( ! node ) return null;
	if ( node.type === 'Identifier' ) return node.name;
	if (
		node.type === 'MemberExpression' &&
		! node.computed &&
		node.object &&
		node.object.type === 'Identifier' &&
		node.object.name === 'attributes' &&
		node.property &&
		node.property.type === 'Identifier'
	) {
		return node.property.name;
	}
	return null;
}

// Given a states ArrayExpression, find the 'normal' state object and resolve
// its bound attribute name.
function normalStateAttrName( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return null;
	for ( const el of statesArray.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) continue;
		const keyVal = stringLiteralValue( objProp( el, 'key' ) );
		if ( keyVal === 'normal' ) return resolveAttrName( objProp( el, 'value' ) );
	}
	// A single-state row with no explicit 'normal' key still counts as the
	// base state — fall back to the first state object's value.
	const first = statesArray.elements.find( ( el ) => el && el.type === 'ObjectExpression' );
	return first ? resolveAttrName( objProp( first, 'value' ) ) : null;
}

function statesArrayHasGradient( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return false;
	return statesArray.elements.some(
		( el ) =>
			el &&
			el.type === 'ObjectExpression' &&
			( objHasProp( el, 'gradientValue' ) || objHasProp( el, 'onGradientChange' ) )
	);
}

// The schema's derived required-state count for a row bound to `attrName`:
// 1 (normal, always required) + the states DECLARED on the matching
// `supports.sgs.elements.<el>.states` entry, floored at 2 (golden-controls.
// json `controls.colour.states.minimum`). No match / no resolvable attrName
// => the schema's stated default floor of 2.
function requiredStatesFor( elements, attrName ) {
	if ( ! attrName || ! elements || typeof elements !== 'object' ) return 2;
	for ( const el of Object.values( elements ) ) {
		if ( ! el || typeof el !== 'object' || ! el.attrMap ) continue;
		if ( Object.values( el.attrMap ).includes( attrName ) ) {
			const declared = el.states && typeof el.states === 'object' ? Object.keys( el.states ) : [];
			return Math.max( 2, 1 + declared.length );
		}
	}
	return 2;
}

function slugify( s ) {
	return String( s )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' );
}

module.exports = {
	loadSchema,
	GOLDEN_PATH,
	NATIVE_UI_FLAGS,
	nativeUiFlags,
	collectIndirectRowSources,
	jsxName,
	findJsxAttr,
	jsxAttrExpr,
	jsxAttrStringValue,
	unwrapRowObject,
	objProp,
	objHasProp,
	stringLiteralValue,
	booleanLiteralValue,
	resolveAttrName,
	normalStateAttrName,
	statesArrayHasGradient,
	requiredStatesFor,
	slugify,
};
