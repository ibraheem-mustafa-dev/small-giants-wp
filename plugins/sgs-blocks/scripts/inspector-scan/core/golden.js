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

// Given a states ArrayExpression, resolve the 'normal' state's GRADIENT
// attribute name (the sibling {attr}Gradient this row's per-state gradient
// toggle writes to) — the mechanism-disambiguation signal recordRowMechanism
// needs; see its own header comment for why the base attr alone is ambiguous.
//
// MOVED HERE from rules/31-golden-colour-control.js 2026-08-22: describeRow()
// below needs it too, and a row-resolution primitive with two consumers belongs
// in the shared engine — the same reasoning that extracted the rest of these.
// Leaving a private copy in the rule would be a second interpretation of the
// same question, which is precisely what this file exists to prevent.
function normalStateGradientAttrName( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return null;
	for ( const el of statesArray.elements ) {
		if ( ! el || el.type !== 'ObjectExpression' ) continue;
		if ( stringLiteralValue( objProp( el, 'key' ) ) === 'normal' ) {
			return resolveAttrName( objProp( el, 'gradientValue' ) );
		}
	}
	const first = statesArray.elements.find( ( el ) => el && el.type === 'ObjectExpression' );
	return first ? resolveAttrName( objProp( first, 'gradientValue' ) ) : null;
}

// ── Colour-variant row HELPERS ────────────────────────────────────────────
// The five-variant family replaces hand-assembled row objects with helper calls
// (3 rows: fill/text/border; overlay and shadow are standalone controls, not rows).
//
// ⛔ WITHOUT THIS, ADOPTING A HELPER BLINDS THE GATE. Measured 2026-08-22: adopting
// fillRow in sgs/process-steps made its `numberBackground` row VANISH from the census
// (7 visible rows -> 6, tree total 255 -> 254). The row rendered perfectly and became
// invisible to every static check, and the finding count DROPPED — which reads exactly
// like progress. Same class as D738, at architectural scale: across 64 blocks the
// census would have reported near-zero findings while measuring nothing.
const ROW_HELPER_NAMES = new Set( [ 'fillRow', 'textRow' ] );

/**
 * A call to a known row helper, or null.
 *
 * Only a DIRECT identifier callee counts (`fillRow( {...} )`). A member call
 * (`x.fillRow(…)`) or an aliased import is deliberately NOT resolved — guessing there
 * would be worse than the honest miss, and the miss is visible as a row that never
 * appears in the census rather than as a wrong number.
 */
function rowHelperCall( node ) {
	let n = node;
	while ( n && n.type === 'LogicalExpression' ) n = n.right;
	if ( ! n || n.type !== 'CallExpression' ) return null;
	if ( ! n.callee || n.callee.type !== 'Identifier' ) return null;
	if ( ! ROW_HELPER_NAMES.has( n.callee.name ) ) return null;
	const arg = n.arguments && n.arguments[ 0 ];
	if ( ! arg || arg.type !== 'ObjectExpression' ) return null;
	return { helper: n.callee.name, arg, node: n };
}

/**
 * Normalise EITHER shape — a literal row object or a row-helper call — into the
 * facts every consumer needs. One interpretation, two callers (rule 31 + survey),
 * so the two can never drift on what a row is.
 *
 * ⚠ THIS ENCODES THE HELPER'S CONTRACT and is therefore COUPLED to it. The mapping
 * below mirrors fillRow's own `states: hover ? [ normal, hoverState ] : [ normal ]`.
 * If a helper gains a third state or renames an attrs key, THIS MUST CHANGE IN THE
 * SAME COMMIT — otherwise the census silently misreports. That coupling is the price
 * of static resolution; it is stated here rather than left to be discovered.
 *
 * @param {Object} node A rows-array element.
 * @return {Object|null} { rowKey, statesArray, statesCount, hasGradient, attrName,
 *                         viaHelper, line } or null when the element is neither shape.
 */
function describeRow( node ) {
	const helper = rowHelperCall( node );
	if ( helper ) {
		const { arg } = helper;
		const attrs = objProp( arg, 'attrs' );
		const attrsObj = attrs && attrs.type === 'ObjectExpression' ? attrs : null;
		const nameOf = ( k ) => {
			const p = attrsObj ? objProp( attrsObj, k ) : null;
			return stringLiteralValue( p );
		};
		const base = nameOf( 'base' );
		const hover = nameOf( 'hover' );
		const gradient = nameOf( 'gradient' );
		const hoverGradient = nameOf( 'hoverGradient' );
		return {
			rowKey: stringLiteralValue( objProp( arg, 'key' ) ) || null,
			statesArray: null, // generated inside the helper — never a literal here
			statesCount: base ? 1 + ( hover ? 1 : 0 ) : 0,
			hasGradient: !! ( gradient || hoverGradient ),
			// WHICH gradient SHAPE the helper emits, not merely whether it emits one.
			// textRow alone returns `gradientCapable: true` (its own line 78, set ONLY
			// when a gradient attr was supplied); fillRow and borderRow deliberately
			// never do — borderRow's docblock states it outright. Rule 31's
			// gradientPathMatchesMechanism() accepts ONLY gradientCapable for a text
			// mechanism, so collapsing the two shapes here reports every gradient-
			// bearing textRow as a mechanism-mismatch. That false positive was live
			// and invisible: the sole adopter (sgs/nav-drawer) has an unresolved
			// css_property, so the mechanism check never ran on it.
			gradientCapable: helper.helper === 'textRow' && !! ( gradient || hoverGradient ),
			attrName: base || null,
			gradientAttrName: gradient || hoverGradient || null,
			viaHelper: helper.helper,
			line: helper.node.loc ? helper.node.loc.start.line : 0,
		};
	}

	const obj = unwrapRowObject( node );
	if ( ! obj ) return null;
	const statesArray = objProp( obj, 'states' );
	const isArr = statesArray && statesArray.type === 'ArrayExpression';
	return {
		rowKey: stringLiteralValue( objProp( obj, 'key' ) ) || null,
		statesArray: isArr ? statesArray : null,
		statesCount: isArr ? statesArray.elements.length : 1,
		hasGradient:
			booleanLiteralValue( objProp( obj, 'gradientCapable' ) ) === true ||
			statesArrayHasGradient( statesArray ),
		attrName: normalStateAttrName( statesArray ),
		gradientAttrName: normalStateGradientAttrName( statesArray ),
		viaHelper: null,
		line: obj.loc ? obj.loc.start.line : 0,
	};
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
// ── Declared state vocabulary (2026-09-03) ───────────────────────────────
// The REAL, admitted state names, read from golden-controls.json's own
// `_meta.stateVocabulary.real` rather than hardcoded here (R-31-1: no
// hardcoded dicts; the schema is the source and a new state is admitted by
// editing it, not by editing this file).
//
// `normal` is deliberately NOT in that vocabulary — it is the resting state
// every row has by definition, not a named state a row opts into.
let _stateVocabCache = null;
function declaredStateVocabulary() {
	if ( _stateVocabCache ) return _stateVocabCache;
	let names = [];
	try {
		const real = loadSchema()?._meta?.stateVocabulary?.real;
		if ( real && typeof real === 'object' ) names = Object.keys( real );
	} catch ( e ) {
		names = [];
	}
	_stateVocabCache = new Set( names );
	return _stateVocabCache;
}

/**
 * The row's SOLE state key, when the row declares exactly one state and that
 * state names a real, admitted, non-`normal` state.
 *
 * WHY THIS EXISTS. The 2-state floor asks "can the client set this colour's
 * hover?". It is the wrong question for a row that is ITSELF a single named
 * state — measured 2026-09-03, nine such rows across seven blocks, in three
 * distinct legitimate shapes:
 *
 *   1. The HOVER HALF of a split control (6 rows). `sgs/testimonial`'s row is
 *      literally labelled "Border colour (hover)" and paints
 *      `borderColourHover`; the RESTING half is `borderColour`, owned by
 *      `SgsBorderControl` — a different component this rule cannot see.
 *      ⛔ Adding a `normal` state here would create a SECOND WRITER for an
 *      attribute another control already owns, which is the duplicate-control
 *      defect this project bans. The "fix" would be the bug.
 *   2. A colour for a HOVER-ONLY FEATURE (2 rows). `info-box`'s shadowHover row
 *      is gated behind the `shadowHover` toggle and colours a shadow that only
 *      exists on hover. There is no resting thing to colour.
 *   3. A STATE-SCOPED row (1 row). `sgs/tabs`' panel-border paints the CURRENT
 *      panel; `current` is the only state a panel has.
 *
 * ⚠ The key is read from the row's DECLARED state, never inferred from the
 * attribute name — golden-controls.json's own `states.derivation.why` warns
 * that `pauseOnHover`/`grayscaleHover` contain "Hover" and are booleans, and
 * that `tabActiveTextColour` renders as `[aria-selected="true"]`, not `:active`.
 * A name-based proxy was tried first and was wrong in BOTH directions: it
 * missed `tabs.panelBorderColour` (no "Hover" in the name) and would have
 * caught boolean attrs that are not colour rows at all.
 *
 * @param {Object} statesArray The row's `states` ArrayExpression node.
 * @return {string|null} The sole declared state key, or null if this row is not that shape.
 */
function soleDeclaredStateKey( statesArray ) {
	if ( ! statesArray || statesArray.type !== 'ArrayExpression' ) return null;
	const objects = statesArray.elements.filter( ( el ) => el && el.type === 'ObjectExpression' );
	if ( objects.length !== 1 || statesArray.elements.length !== 1 ) return null;
	const key = stringLiteralValue( objProp( objects[ 0 ], 'key' ) );
	if ( ! key || key === 'normal' ) return null;
	return declaredStateVocabulary().has( key ) ? key : null;
}

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

// ── Mechanism resolution (Step 2, phase-colour-conformance.md, 2026-08-22) ──
// Rule 31 asks "which PAINT MECHANISM does this colour row use?" by reading
// `block_attributes.css_property` — the declarative routing column Spec 31
// R-31-1 (DB-first, no hardcoded dicts) already requires blocks to populate —
// rather than scanning render.php. A council tracer measured the render.php
// scan and found it unsound: the shared wrapper calls neither
// `sgs_background_paint_decl` nor `sgs_text_colour_decl` anywhere across its
// 3,243 lines, so wrapper-routed blocks could never resolve fill/text that
// way, and the dominant real pattern (a bare `sgs_colour_value()` embedded in
// a hand-written CSS string) has no helper-name vocabulary to match at all.
// The DB column already answers the question the scan was trying to ask.
const MECHANISM_BY_CSS_PROPERTY = {
	color: 'text',
	'color-gradient': 'text',
	'background-color': 'fill',
	'background-image': 'fill',
	'background-color-gradient': 'fill',
	'border-color': 'border',
	'border-color-gradient': 'border',
	'outline-color': 'border',
	'box-shadow-color': 'shadow',
	fill: 'fill',
	stroke: 'stroke',
};

/**
 * Resolve a `css_property` DB value to the set of mechanisms it satisfies.
 * Returns `{ mechanisms: string[], unresolved: boolean }`. A compound value
 * (comma-joined, e.g. "background-color,color" — one attribute painting two
 * CSS properties at once, confirmed live in this DB) resolves to EVERY
 * mechanism it names; a row is correct if it matches ANY of them. An empty/
 * null/unrecognised value is UNRESOLVED — never guessed from the attr's name.
 */
function resolveMechanismFromCssProperty( cssProperty ) {
	if ( ! cssProperty ) return { mechanisms: [], unresolved: true };
	const parts = String( cssProperty )
		.split( ',' )
		.map( ( p ) => p.trim() )
		.filter( Boolean );
	const mechanisms = [];
	for ( const part of parts ) {
		const m = MECHANISM_BY_CSS_PROPERTY[ part ];
		if ( m && ! mechanisms.includes( m ) ) mechanisms.push( m );
	}
	return { mechanisms, unresolved: mechanisms.length === 0 };
}

const EXPORT_COLOUR_CSS_PROPERTY_SCRIPT = path.join(
	__dirname,
	'..',
	'export-colour-css-property.py'
);

/**
 * The DB's { block_slug: { attr_name: css_property|null } } colour-attribute
 * map, shelled out to Python once per ctx and memoised on it — same pattern
 * as rule 31's `getSharedOwnerScan`/roster.js's `build-roster.py` call.
 * FAILS CLOSED: a DB the export script cannot reach throws rather than
 * silently resolving every row as unresolved, which would look identical to
 * "the mechanism axis found nothing wrong" — the exact false-clean this rule
 * exists to prevent.
 */
function getColourCssPropertyMap( ctx ) {
	if ( ctx.__colourCssPropertyMap ) return ctx.__colourCssPropertyMap;
	const { spawnSync } = require( 'child_process' );
	const result = spawnSync( 'python', [ EXPORT_COLOUR_CSS_PROPERTY_SCRIPT ], {
		encoding: 'utf8',
	} );
	if ( result.status !== 0 || ! result.stdout ) {
		throw new Error(
			'getColourCssPropertyMap: export-colour-css-property.py failed to read ' +
				'sgs-framework.db — refusing to silently treat every colour row as ' +
				`unresolved. stderr: ${ result.stderr || '(none)' }`
		);
	}
	const map = JSON.parse( result.stdout );
	ctx.__colourCssPropertyMap = map;
	return map;
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
	rowHelperCall,
	describeRow,
	ROW_HELPER_NAMES,
	objProp,
	objHasProp,
	stringLiteralValue,
	booleanLiteralValue,
	resolveAttrName,
	normalStateAttrName,
	normalStateGradientAttrName,
	statesArrayHasGradient,
	requiredStatesFor,
	soleDeclaredStateKey,
	declaredStateVocabulary,
	slugify,
	MECHANISM_BY_CSS_PROPERTY,
	resolveMechanismFromCssProperty,
	getColourCssPropertyMap,
};
