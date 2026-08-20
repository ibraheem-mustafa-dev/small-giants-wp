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

// GROUND-TRUTH: same undeclared-transitive-dependency risk as core/sources.js
// (@babel/parser + @babel/traverse resolve only via @wordpress/scripts today,
// not a declared devDependency of plugins/sgs-blocks/package.json). Guarded
// the same way — a rule/survey that reaches mountedComponents()/
// reachedComponents() below fails closed (empty Set / unchanged Map) rather
// than throwing, exactly like core/sources.js's SourceCache does for AST-based
// rules when babel is unavailable.
let babelParser = null;
let babelTraverseFn = null;
try {
	babelParser = require( '@babel/parser' );
	const traverseModule = require( '@babel/traverse' );
	babelTraverseFn = typeof traverseModule === 'function' ? traverseModule : traverseModule.default;
	if ( typeof babelTraverseFn !== 'function' ) throw new Error( 'no callable default export' );
} catch ( e ) {
	babelParser = null;
	babelTraverseFn = null;
}

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
 * AXIS REGISTRY — which audit axes a control type DECLARES.
 *
 * ⭐ THE POINT. The census used to run a FIXED list of axes over every type:
 * canonical / bannedLookalikes / nativeUi, plus hoverMechanism when a row
 * happened to carry `states`. That list is COLOUR'S shape generalised outward,
 * and it is why 17 of 21 types had at least one axis reading N/A across all 83
 * blocks — the engine was asking questions their contracts never posed, and
 * never asking the ones they did. `colour.gradient` is the starkest case: a
 * required, Bean-ruled contract with 193 live findings that the census scored
 * ZERO of, because `gradient` was not in the fixed list.
 *
 * An axis is DECLARED when the row carries its field. Declaring is separate
 * from being MEASURABLE (see axisIsMeasurable) and separate again from having
 * an EVALUATOR built — a type can declare an axis the engine cannot yet score,
 * and that must surface as OWED WORK rather than as silence. Those three states
 * are exactly what the old fixed list collapsed into one undifferentiated N/A.
 *
 * Adding an axis is: one entry here + one evaluator in the survey + the rows
 * that want it. It is NOT a new per-type scanner — 21 private scanners would be
 * 21 places for the same false-absence bug to hide, and this file exists so the
 * five questions are asked once. (2026-08-19 found two such bugs in ONE shared
 * engine; each fix repaired every type at once.)
 */
const AXIS_FIELD = {
	canonical: 'canonical',
	bannedLookalikes: 'bannedLookalikes',
	nativeUi: 'nativeUi',
	hoverMechanism: 'states',
	gradient: 'gradient',
};

/**
 * The axis names a row declares, in AXIS_FIELD order.
 *
 * @param {Object} row One control-type row.
 * @return {string[]} Declared axis names.
 */
function declaredAxes( row ) {
	if ( ! row || typeof row !== 'object' ) return [];
	return Object.keys( AXIS_FIELD ).filter( ( axis ) => Boolean( row[ AXIS_FIELD[ axis ] ] ) );
}

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
		return canonicalComponentNames( row ).length > 0;
	}
	if ( axis === 'bannedLookalikes' ) {
		return Array.isArray( a.jsxComponents ) && a.jsxComponents.length > 0;
	}
	// A `detectVia` string the family regex cannot READ is not measurable, even
	// though the field is present and non-empty. Checking mere presence is what
	// let `border` report "measured" while resolving to null — the MEASURABILITY
	// table would then have vouched for an axis producing N/A on all 83 blocks.
	return supportFamilyFromDetectVia( a.detectVia ) !== null;
}

/**
 * A JSX component identifier, as opposed to a prose description of a pattern.
 *
 * Load-bearing. Finalised goldens rows describe their canonical shape in two
 * different registers and both live under a `component` key:
 *
 *   "MediaPicker"                                  <- a real, resolvable component
 *   "ResponsiveOverride + SelectControl (tier-…)"  <- a description of a PATTERN
 *   "trust-bar's per-item editor shape … NOT YET extracted to a shared component"
 *
 * Only the first can ever appear in a block's reached-component set. Treating
 * the other two as component names would score six control types against names
 * that can never match, turning an honest "this type has no single canonical
 * component" into a library-wide false VIOLATION/MISSING sweep.
 */
const COMPONENT_IDENTIFIER = /^[A-Z][A-Za-z0-9]*$/;

/**
 * Every canonical component identifier a row declares, at any nesting depth.
 *
 * ⛔ DO NOT narrow this back to `canonical.panel` + `canonical.row`. That was
 * the original shape, written when only `colour` was encoded, and it silently
 * mis-scored every row that names its component under a different key. Measured
 * 2026-08-19 across the finalised goldens: `media` uses `single`/`bulk`,
 * `responsive-wrapper` uses `tierPrimitive`/`objectPrimitive`, `border` uses
 * `widthSlot`/`radiusSlot`/`styleSlot`/`colourSlot`. All three named real,
 * verified-live components and all three reported N/A on all 83 blocks — 249
 * rows scored as "no contract to check" when the contract was right there.
 * Same defect class as the `__experimental` family regex, one axis over.
 *
 * @param {Object} row One control-type row.
 * @return {string[]} De-duplicated component identifiers; empty when the row
 *   describes a pattern in prose rather than naming a component.
 */
function canonicalComponentNames( row ) {
	const out = new Set();
	( function walk( node, depth ) {
		if ( depth > 4 || ! node || typeof node !== 'object' ) return;
		// A slot the contract marks `independentlySufficient: false` names a real
		// component but cannot on its own prove the block adopted the canonical
		// shape — it is reached THROUGH the primary component, or it covers a
		// narrower case. Measured 2026-08-20: without this, sgs/site-footer
		// flipped VIOLATION -> CONFORMANT for colour because it reaches
		// GradientOverlayControl via BackgroundPanel while still having no
		// SgsColourPanel at all. A widening that turns a real violation into a
		// pass is a loosened detector, not a fixed one.
		if ( node.independentlySufficient !== false && typeof node.component === 'string' ) {
			const name = node.component.trim();
			if ( COMPONENT_IDENTIFIER.test( name ) ) out.add( name );
		}
		for ( const v of Object.values( node ) ) {
			if ( v && typeof v === 'object' ) walk( v, depth + 1 );
		}
	} )( row && row.canonical, 0 );
	return [ ...out ];
}

/**
 * The `supports.*` family a `detectVia` string names, or null when none.
 *
 * ⛔ The leading `_` in the character class is REQUIRED — WordPress ships real
 * support families under `__experimental*` names. Without it `border`'s
 * declared `supports.__experimentalBorder` resolved to null and its native-UI
 * axis reported N/A across all 83 blocks: 49 real violations reading exactly
 * like a clean result. ONE definition, shared by the survey's axis scorer and
 * by axisIsMeasurable() above, so the two can never disagree about whether a
 * row is readable.
 *
 * @param {string} detectVia The row's `nativeUi.detectVia` prose.
 * @return {string|null} The support-family key, or null when unreadable.
 */
function supportFamilyFromDetectVia( detectVia ) {
	if ( ! detectVia || typeof detectVia !== 'string' ) return null;
	const m = detectVia.match( /supports\.(_*[A-Za-z][A-Za-z0-9_]*)/ );
	return m ? m[ 1 ] : null;
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

// ---------------------------------------------------------------------------
// Shared component-reach walk (C4 step 1, 2026-08-20) — extracted VERBATIM
// from scripts/surveys/survey-golden-conformance.js so rule 31 and the survey
// read the SAME shared-panel reach, never two resolvers that can disagree.
// Regression check on the extraction: the survey's own `--json` output must
// not move by a single row when it switches to importing these instead of
// owning them (survey-golden-conformance.js's own header documents the
// MAX_REACH_DEPTH=4 plateau measurement this preserves unchanged).
// ---------------------------------------------------------------------------

const REACH_PARSER_OPTIONS = {
	sourceType: 'module',
	plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
};

// Default file->AST resolver: read + parse from disk, no caching. A caller
// that already owns a parse cache (rule 31 via ctx.cache.parse) should pass
// its own `parseFile` to reachedComponents() instead of using this — see the
// third parameter below.
function defaultParseFile( file ) {
	if ( ! babelParser ) return null;
	let src;
	try {
		src = fs.readFileSync( file, 'utf8' );
	} catch ( e ) {
		return null;
	}
	try {
		return babelParser.parse( src, REACH_PARSER_OPTIONS );
	} catch ( e ) {
		return null;
	}
}

/**
 * Every capitalised component a source file MOUNTS in JSX.
 *
 * Membership is decided by the JSX containing `<ComponentName`, never by an
 * import-path string — the same "detect by what it does" discipline the
 * shared resolver (core/components.js) documents.
 */
function mountedComponents( ast ) {
	const names = new Set();
	if ( ! ast || ! babelTraverseFn ) return names;
	babelTraverseFn( ast, {
		JSXOpeningElement( p ) {
			const n = p.node.name;
			const name = n && n.type === 'JSXIdentifier' ? n.name : null;
			if ( name && /^[A-Z]/.test( name ) ) names.add( name );
		},
	} );
	return names;
}

// MAX_REACH_DEPTH=4 is a MEASURED plateau, not an arbitrary ceiling — see
// survey-golden-conformance.js's own header (compare-reach-depth.py) for the
// full derivation: reach is identical at depth 4 and depth 6, and the
// remaining gap beyond it is a runtime-selection blind spot
// (`SgsColourPanel.js`'s `const Control = row.gradientCapable ? A : B`) that
// no amount of extra depth can close. Do not raise this without re-running
// that measurement.
const MAX_REACH_DEPTH = 4;

/**
 * Components a block reaches, following shared components up to
 * MAX_REACH_DEPTH hops, bounded with a per-block visited-file guard against
 * cycles (not an unbounded import-graph walk).
 *
 * @param {Object}        editAst   Parsed AST of the block's own edit.js (or
 *                                   a per-component file's AST, for a hop).
 * @param {Map}            compFiles resolveComponentFiles() result — name ->
 *                                   absolute file path.
 * @param {Function}       [parseFile] Optional file->AST resolver. Defaults to
 *                                   an uncached read+parse from disk. Pass a
 *                                   cache-backed resolver (e.g. a wrapper
 *                                   around ctx.cache.parse) to reuse an
 *                                   existing parse cache instead of
 *                                   re-reading files this walk has already
 *                                   seen via another rule.
 * @return {Map<string,string|null>} name -> owning file (null = the caller's
 *                                   own edit.js).
 */
function reachedComponents( editAst, compFiles, parseFile ) {
	const resolveAst = parseFile || defaultParseFile;
	const direct = mountedComponents( editAst );
	const reached = new Map(); // name -> owning file (null = the block's own edit.js)
	const visitedFiles = new Set();
	let frontier = [];
	for ( const n of direct ) {
		reached.set( n, null );
		frontier.push( n );
	}

	for ( let depth = 0; depth < MAX_REACH_DEPTH && frontier.length; depth++ ) {
		const next = [];
		for ( const n of frontier ) {
			const file = compFiles.get( n );
			if ( ! file || visitedFiles.has( file ) ) continue;
			visitedFiles.add( file );
			const ast = resolveAst( file );
			for ( const inner of mountedComponents( ast ) ) {
				if ( ! reached.has( inner ) ) {
					reached.set( inner, file );
					next.push( inner );
				}
			}
		}
		frontier = next;
	}
	return reached;
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
	declaredAxes,
	AXIS_FIELD,
	MEASURABLE_AXES,
	canonicalComponentNames,
	supportFamilyFromDetectVia,
	GOLDEN_PATH,
	NATIVE_UI_FLAGS,
	nativeUiFlags,
	MAX_REACH_DEPTH,
	mountedComponents,
	reachedComponents,
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
