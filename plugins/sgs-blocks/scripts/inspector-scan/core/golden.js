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

// ---------------------------------------------------------------------------
// Multi-file composer (goldens split, D688 2026-08-19) — additive only.
// loadSchema() above is UNTOUCHED and still returns golden-controls.json
// alone; rule 31 (and anything else already calling loadSchema()) keeps
// reading exactly what it read before this landed. loadMergedSchema() is a
// new, separate entry point for callers that want the union of the base
// schema plus whichever per-session goldens files have landed.
// ---------------------------------------------------------------------------

const GOLDENS_DIR = path.resolve( __dirname, '..', '..', 'consistency', 'goldens' );
// Fixed allowlist, not a directory glob — a glob would silently adopt any
// stray/scratch file dropped in goldens/. The three sessions writing here
// are named explicitly; a fourth peer needs its own line, not an implicit one.
const PEER_FILES = [ 'styling.json', 'input.json', 'behaviour.json' ];

// The axes the census can actually MEASURE, and the schema field each one
// needs to be measurable at all. Keyed by what the axis DOES, not by any
// control type's name — a type is measurable on an axis when it declares the
// field, whatever the type is called.
const MEASURABLE_AXES = [ 'canonical', 'bannedLookalikes', 'nativeUi' ];

/**
 * Can this axis be measured for this row, i.e. does the row carry the field
 * the engine reads? A row whose axis object exists but holds only prose
 * (`_note`) is NOT measurable — that shape is exactly how a capability goes
 * dark while still looking declared.
 *
 * @param {Object} row  One control-type row.
 * @param {string} axis One of MEASURABLE_AXES.
 * @return {boolean} True when the engine has something to read.
 */
function axisIsMeasurable( row, axis ) {
	const a = row && row[ axis ];
	if ( ! a || typeof a !== 'object' ) return false;
	if ( axis === 'canonical' ) {
		return Boolean(
			( a.panel && a.panel.component ) || ( a.row && a.row.component )
		);
	}
	if ( axis === 'bannedLookalikes' ) {
		return Array.isArray( a.jsxComponents ) && a.jsxComponents.length > 0;
	}
	return typeof a.detectVia === 'string' && a.detectVia.length > 0;
}

/**
 * The union of golden-controls.json + any of PEER_FILES that exist on disk.
 * A missing peer file is tolerated (ENOENT) since B/C's files may land after
 * this does — that tolerance is the whole point of writing the composer
 * first. A peer file that EXISTS but fails to parse throws.
 *
 * ⛔ A peer OVERRIDING a base key is EXPECTED, not a collision. Every one of
 * the 13 non-colour/link keys already in golden-controls.json is a "temp
 * golden, not a decision" per the session briefs — finalising one of them
 * IS a peer file replacing the base row for that key, on purpose. Only a
 * collision BETWEEN TWO PEER FILES (styling vs input vs behaviour both
 * claiming the same type) is a real bug: the three sessions' domains are
 * disjoint by design (see the brief's ownership table), so two peers
 * claiming the same key means a scoping mistake, not a legitimate override.
 *
 * @return {{_meta: Object, controls: Object}} Merged schema, same shape as
 *   loadSchema()'s return value, with `_meta.encoded` concatenated across
 *   every file that contributed and `_meta.sources` naming which ones did.
 */
function loadMergedSchema() {
	const base = loadSchema();
	const merged = {
		_meta: {
			...base._meta,
			encoded: [ ...base._meta.encoded ],
			sources: [ 'golden-controls.json' ],
			capabilityLoss: [],
		},
		controls: { ...base.controls },
	};
	const claimedByPeer = Object.create( null ); // control-type key -> which peer file claimed it
	for ( const file of PEER_FILES ) {
		const p = path.join( GOLDENS_DIR, file );
		let peer;
		try {
			peer = JSON.parse( fs.readFileSync( p, 'utf8' ) );
		} catch ( e ) {
			if ( e.code === 'ENOENT' ) continue; // peer not landed yet — tolerated by design
			throw new Error( 'goldens/' + file + ' exists but failed to parse: ' + e.message );
		}
		const peerKeys = Object.keys( peer.controls || {} );
		const dupesAcrossPeers = peerKeys.filter( ( k ) => k in claimedByPeer );
		if ( dupesAcrossPeers.length ) {
			throw new Error(
				'goldens/' + file + ' claims control type(s) already claimed by ' +
					dupesAcrossPeers.map( ( k ) => claimedByPeer[ k ] + ' (' + k + ')' ).join( ', ' ) +
					' — two sessions scoped the same type, not a base-placeholder override.'
			);
		}
		for ( const k of peerKeys ) claimedByPeer[ k ] = file;
		// CAPABILITY-LOSS LEDGER. Overriding a base row is expected, but an
		// override that DROPS a measurable axis the base row declared silently
		// removes a whole detection capability — the census then reports N/A,
		// which is indistinguishable from "this type has no such axis".
		// Measured 2026-08-19: styling.json's finalised typography / box-4value
		// / length-unit rows each replaced a base row carrying
		// `nativeUi.detectVia` with one carrying only a `_note`, and the
		// native-UI axis for those three went dark in one merge. That may be
		// the right call per type — box-4value's own note calls it "a gap, not
		// silently assumed clean" — but it must be VISIBLE, not inferred later
		// from a column of N/A. Recorded on _meta so a caller can print it;
		// deliberately not thrown, since a legitimate finalisation may drop an
		// axis that genuinely does not apply.
		for ( const k of peerKeys ) {
			const baseRow = base.controls[ k ];
			const peerRow = peer.controls[ k ];
			if ( ! baseRow || ! peerRow ) continue;
			for ( const axis of MEASURABLE_AXES ) {
				const had = axisIsMeasurable( baseRow, axis );
				const has = axisIsMeasurable( peerRow, axis );
				if ( had && ! has ) {
					merged._meta.capabilityLoss.push( {
						type: k,
						axis,
						from: 'golden-controls.json',
						to: 'goldens/' + file,
					} );
				}
			}
		}
		Object.assign( merged.controls, peer.controls || {} );
		merged._meta.encoded.push( ...( ( peer._meta && peer._meta.encoded ) || peerKeys ) );
		merged._meta.sources.push( 'goldens/' + file );
	}
	// A peer overriding a base key legitimately appears in BOTH the base and
	// the peer's own encoded list above — dedupe here rather than upstream,
	// so every consumer (survey-golden-conformance.js loops over `encoded`
	// once per type) sees each control type exactly once regardless of how
	// many files touched it.
	merged._meta.encoded = [ ...new Set( merged._meta.encoded ) ];
	return merged;
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
	loadMergedSchema,
	axisIsMeasurable,
	MEASURABLE_AXES,
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
