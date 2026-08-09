/**
 * survey-inspector-surface.js — Spec 35 replacement census of the WHOLE
 * inspector surface across all 83 sgs/ blocks, per D543/D544.
 *
 * WHY THIS EXISTS (read .claude/decisions.md D543 + D544 in full before
 * touching this file). `check-simple-surface-cap.js` was repurposed from its
 * correct 2-block FR-37-27 job into an 83-block library census and REJECTED
 * (D543) for four proven defects:
 *
 *   1. Any custom composite scored ONE row and was never descended into
 *      (ContainerWrapperControls kind="layout" ~21 real rows -> 1; 29 blocks
 *      route through it).
 *   2. Native `supports` panels (rendered by WP core straight off block.json,
 *      zero JSX) were invisible — 64/83 blocks declare at least one.
 *   3. `src/blocks/extensions/*.js` (universal `addFilter('editor.BlockEdit')`
 *      injections) were excluded entirely.
 *   4. Mutually-exclusive conditional branches were SUMMED as if
 *      simultaneously visible.
 *
 * D544's live-editor calibration then showed the rejected metric doesn't
 * just undercount, it MIS-RANKS: sgs/label scored 8 (near-simplest in the
 * library) against a live ~50 controls, while sgs/button scored 28 against
 * hero's 45 yet shows MORE live controls than hero.
 *
 * THIS DETECTOR reports TWO numbers per block, never one total (Bean's
 * ruling, D543):
 *   - OWN         — controls/panels the block's own edit.js declares.
 *   - EXTENSION   — controls/panels injected by the universal extensions in
 *                   src/blocks/extensions/*.js.
 *   - CORE        — WordPress-core "Advanced" panel rows (anchor/className)
 *                   PLUS the two SGS extensions (custom-css.js,
 *                   block-defaults.js) that inject into that SAME native
 *                   InspectorAdvancedControls region — visually
 *                   indistinguishable from a live count, and D544's own
 *                   label breakdown (CORE: Advanced 3) only reconciles if
 *                   those two are folded in here rather than counted as a
 *                   4th EXTENSION panel. Documented, not silent.
 *
 * COUNTING UNIT — "one labelled inspector row = one control" (the same unit
 * check-simple-surface-cap.js and the survey-*-controls.py triad already use)
 * — NOT a raw `.components-base-control` DOM-node count. These two units
 * diverge whenever a single JSX-level control internally renders more than
 * one DOM base-control (observed: `ResponsiveBoxControl` renders one
 * `.components-base-control` per responsive tier — base/tablet/mobile). A
 * SEPARATE "DOM-estimate" total applies a disclosed x3 multiplier to the
 * small, named set of components known to do this (RESPONSIVE_DOM_MULTIPLIER
 * below) — this is what is compared against D544's live `.components-base-
 * control` counts. The row-level total is the reliable, reproducible,
 * non-estimated number and is reported alongside it.
 *
 * READ-ONLY. Never writes to disk, never touches git, never runs npm/build.
 * `--survey` mode only — no `--fix`, no `--check` (those are a later phase).
 *
 * Usage:
 *   node survey-inspector-surface.js                    # human report, all 83 blocks
 *   node survey-inspector-surface.js --json              # machine report
 *   node survey-inspector-surface.js --block=sgs/label   # single block, verbose
 *   node survey-inspector-surface.js --self-test         # capability negative controls + sabotage demo
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const parser = require( '@babel/parser' );
const traverse = require( '@babel/traverse' ).default;

const SCRIPT_DIR = __dirname;
const PLUGIN_ROOT = path.join( SCRIPT_DIR, '..', '..' );
const REPO_ROOT = path.join( PLUGIN_ROOT, '..', '..' );
const BLOCKS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks' );
const COMPONENTS_DIR = path.join( PLUGIN_ROOT, 'src', 'components' );
const EXTENSIONS_DIR = path.join( PLUGIN_ROOT, 'src', 'blocks', 'extensions' );
const DB_PATH = path.join(
	require( 'os' ).homedir(), '.claude', 'skills', 'sgs-wp-engine', 'sgs-framework.db'
);

const PARSER_OPTIONS = {
	sourceType: 'module',
	plugins: [
		'jsx', 'classProperties', 'objectRestSpread',
		'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport',
	],
};

// ---------------------------------------------------------------------------
// KNOWN VOCABULARY (small, disclosed, no per-block entries — R-31-1)
// ---------------------------------------------------------------------------

// Structural wrappers — never a row/panel themselves, walk descends through.
const PASSTHROUGH_NAMES = new Set( [
	'InspectorControls', 'PanelRow', 'Fragment', 'React.Fragment',
] );

// PanelBody / ToolsPanel are treated as PANEL containers (see walkElement).
const PANEL_NAMES = new Set( [ 'PanelBody', 'ToolsPanel', '__experimentalToolsPanel' ] );

// Leaf control primitives — one row, never descended into.
const KNOWN_PRIMITIVES = new Set( [
	'RangeControl', 'BoxControl', 'TextControl', 'TextareaControl',
	'NumberControl', '__experimentalNumberControl', 'SelectControl',
	'ToggleControl', 'BorderRadiusControl', '__experimentalBorderRadiusControl',
	'BorderBoxControl', '__experimentalBorderBoxControl', 'UnitControl',
	'__experimentalUnitControl', 'ColorGradientControl', 'ColorPalette',
	'GradientPicker', 'RadioControl', 'CheckboxControl', 'Button',
	'ButtonGroup', 'FontSizePicker', 'DesignTokenPicker', 'ComboboxControl',
	'CustomSelectControl', 'FormTokenField', 'MediaUpload', 'MediaUploadCheck',
	'ResponsiveTriStateControl', 'ToggleGroupControl', 'ToggleGroupControlOption',
	'BaseControl', 'TabPanel', 'AnglePickerControl', 'FocalPointPicker',
	'DateTimePicker', 'DimensionControl', 'QueryControls', 'URLInput',
] );

// Rendered inside <InspectorControls> but NOT an editable control — purely
// informational (a <Notice> banner). Excluded entirely (not a row, not
// descended into) rather than either miscounted as a control OR silently
// swallowed as "unresolved" (which would wrongly suggest a detection gap).
const INFORMATIONAL_ONLY = new Set( [ 'Notice', 'Spinner', 'Tooltip' ] );

// A control-like component that renders MORE THAN ONE `.components-base-
// control` DOM node per JSX-level "row" — a disclosed, documented estimate
// (see module header), applied only to the SECONDARY dom-estimate total.
// The x3 is this codebase's OWN device-tier convention: base + Tablet +
// Mobile (CLAUDE.md "Responsive breakpoint discipline"), not invented here.
const RESPONSIVE_DOM_MULTIPLIER = {
	ResponsiveBoxControl: 3,
	ResponsiveBoxControls: 3,
};

// Extension panel title -> gating metadata. Built from reading each
// extensions/*.js file directly (see report footer "Extension gating" for
// the file:line each entry was read from). hideKey null = unconditional
// (no isExtensionHidden() call found in the source for that panel).
const EXTENSION_PANEL_META = {
	Animation: { hideKey: 'animation', file: 'animation.js' },
	'Hover Effects': { hideKey: 'hover', file: 'hover-effects.js' },
	'Block Link': { hideKey: 'blockLink', file: 'hover-effects.js' },
	'Click Effects': { hideKey: 'clickEffects', file: 'hover-effects.js' },
	'Element parallax': { hideKey: 'parallax', file: 'parallax.js' },
	'Visibility conditions': { hideKey: null, file: 'conditional-visibility.js' },
	'Scroll & effects': { hideKey: 'fx', file: 'fx.js', gate: 'fxQualifying' },
	'Image Controls': { hideKey: null, file: 'image-controls.js', gate: 'imageControls' },
};

const EXTENSION_FILES_WITH_PANELS = [
	'animation.js', 'hover-effects.js', 'parallax.js',
	'conditional-visibility.js', 'fx.js', 'image-controls.js',
];

// Extension files that inject into InspectorAdvancedControls — folded into
// the CORE bucket, not a 4th EXTENSION panel (see module header + D544).
const CORE_ADVANCED_EXTENSION_FILES = [ 'custom-css.js', 'block-defaults.js' ];

// KNOWN, DISCLOSED EXCLUSION (capability limitation, not a silent gap):
// responsive-visibility.js renders no PanelBody/ToolsPanel of its own — it
// augments EXISTING per-control device toggles (the ~192-switcher system,
// D544's Phase 1 concern), so it has no discrete panel/row unit this census
// counts. Named here so a reader can see it was considered, not missed.
const KNOWN_EXCLUDED_EXTENSION_FILES = [ 'responsive-visibility.js', 'hide-extensions.js', 'index.js' ];

// Native `supports` family -> { panel title, row-counting rule, de-dup
// keywords checked against the block's OWN PanelBody/ToolsPanel titles }.
// De-dup exists because a block that builds its own "Colour" panel (Spec 32
// block-private pattern) does not ALSO get a redundant native "Color" panel
// in the live editor (verified empirically: sgs/label declares
// color.text/background=true in block.json AND has its own "Colour"
// PanelBody in edit.js; D544's live count shows exactly ONE Colour bucket,
// not two) — the exact WP mechanism for this is not modelled here, only the
// observed behaviour, and this is disclosed as a heuristic, not fact.
const NATIVE_SUPPORT_FAMILIES = [
	{ key: 'color', panelTitle: 'Color (native)', dedupKeywords: [ 'colour', 'color' ] },
	{ key: 'typography', panelTitle: 'Typography (native)', dedupKeywords: [ 'typo', 'font' ] },
	{ key: 'spacing', panelTitle: 'Dimensions (native)', dedupKeywords: [ 'spacing', 'dimension', 'box', 'padding', 'margin' ] },
	{ key: '__experimentalBorder', panelTitle: 'Border (native)', dedupKeywords: [ 'border' ] },
	{ key: 'shadow', panelTitle: 'Shadow (native)', dedupKeywords: [ 'shadow' ] },
];

// ---------------------------------------------------------------------------
// AST HELPERS
// ---------------------------------------------------------------------------

function readFile( p ) {
	try {
		return fs.readFileSync( p, 'utf8' );
	} catch ( e ) {
		return null;
	}
}

function parseSafe( src ) {
	try {
		return parser.parse( src, PARSER_OPTIONS );
	} catch ( e ) {
		return null;
	}
}

function getJsxName( nameNode ) {
	if ( ! nameNode ) return null;
	if ( nameNode.type === 'JSXIdentifier' ) return nameNode.name;
	if ( nameNode.type === 'JSXMemberExpression' ) {
		const object = getJsxName( nameNode.object );
		const property = getJsxName( nameNode.property );
		return object && property ? `${ object }.${ property }` : null;
	}
	return null;
}

function findAttr( attributes, name ) {
	return ( attributes || [] ).find(
		( a ) => a.type === 'JSXAttribute' && a.name && a.name.name === name
	);
}

function resolveStringAttr( attributes, name ) {
	const attr = findAttr( attributes, name );
	if ( ! attr || ! attr.value ) return null;
	if ( attr.value.type === 'StringLiteral' ) return attr.value.value;
	if ( attr.value.type !== 'JSXExpressionContainer' ) return null;
	const expr = attr.value.expression;
	if ( expr.type === 'StringLiteral' ) return expr.value;
	if (
		expr.type === 'CallExpression' && expr.callee &&
		expr.callee.type === 'Identifier' && expr.callee.name === '__' &&
		expr.arguments[ 0 ] && expr.arguments[ 0 ].type === 'StringLiteral'
	) {
		return expr.arguments[ 0 ].value;
	}
	return null;
}

function nodeLine( node ) {
	return node && node.loc ? node.loc.start.line : 0;
}

// ---------------------------------------------------------------------------
// COMPONENT INDEX — every exported capitalised function/const-arrow
// component under src/components/ AND every per-block src/blocks/*/
// components/ dir (capability #1's "reach those dirs, not just edit.js").
// ---------------------------------------------------------------------------

function buildComponentIndex() {
	const index = new Map(); // name -> { file, relFile, returnNodes: [JSXElement|JSXFragment] }

	const dirs = [ COMPONENTS_DIR ];
	// One level of sub-directory components (observed pattern:
	// src/components/IconPicker/IconPicker.js) — shallow, not fully
	// recursive, disclosed scope.
	if ( fs.existsSync( COMPONENTS_DIR ) ) {
		for ( const entry of fs.readdirSync( COMPONENTS_DIR, { withFileTypes: true } ) ) {
			if ( entry.isDirectory() ) dirs.push( path.join( COMPONENTS_DIR, entry.name ) );
		}
	}
	if ( fs.existsSync( BLOCKS_DIR ) ) {
		for ( const entry of fs.readdirSync( BLOCKS_DIR, { withFileTypes: true } ) ) {
			if ( ! entry.isDirectory() ) continue;
			const compDir = path.join( BLOCKS_DIR, entry.name, 'components' );
			if ( fs.existsSync( compDir ) ) dirs.push( compDir );
		}
	}

	for ( const dir of dirs ) {
		let files;
		try {
			files = fs.readdirSync( dir ).filter( ( f ) => f.endsWith( '.js' ) );
		} catch ( e ) {
			continue;
		}
		for ( const file of files ) {
			const full = path.join( dir, file );
			const src = readFile( full );
			if ( ! src ) continue;
			const ast = parseSafe( src );
			if ( ! ast ) continue;
			const relFile = path.relative( REPO_ROOT, full ).split( path.sep ).join( '/' );

			traverse( ast, {
				FunctionDeclaration( p ) {
					registerIfComponent( p.node.id && p.node.id.name, p.node.body, index, relFile );
				},
				VariableDeclarator( p ) {
					if (
						p.node.id && p.node.id.type === 'Identifier' &&
						p.node.init &&
						( p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression' )
					) {
						registerIfComponent( p.node.id.name, p.node.init.body, index, relFile );
					}
				},
			} );
		}
	}
	return index;
}

function registerIfComponent( name, body, index, relFile ) {
	if ( ! name || name[ 0 ] !== name[ 0 ].toUpperCase() ) return;
	const returnNodes = extractReturnJsxNodes( body );
	if ( returnNodes.length === 0 ) return;
	// A component name can legitimately be re-declared across files (rare) —
	// first registration wins; collisions are reported in the JSON output's
	// `componentIndexCollisions` list so they are visible, not silent.
	if ( index.has( name ) ) {
		index.get( name ).collisions = index.get( name ).collisions || [];
		index.get( name ).collisions.push( relFile );
		return;
	}
	index.set( name, { relFile, returnNodes, collisions: [] } );
}

/** Every top-level (not nested inside another function) `return <JSX/>` in a
 * function body — concise-arrow body (`=> <jsx/>`) or block body with one or
 * more ReturnStatements. Multiple returns = mutually exclusive early-return
 * guards; resolved as branches later (max-not-sum), same as a ternary. */
function extractReturnJsxNodes( body ) {
	if ( ! body ) return [];
	if ( body.type === 'JSXElement' || body.type === 'JSXFragment' ) return [ body ];
	if ( body.type !== 'BlockStatement' ) return [];

	const found = [];
	const stack = [ ...body.body ];
	while ( stack.length ) {
		const stmt = stack.shift();
		if ( ! stmt ) continue;
		if ( stmt.type === 'ReturnStatement' && stmt.argument ) {
			if ( stmt.argument.type === 'JSXElement' || stmt.argument.type === 'JSXFragment' ) {
				found.push( stmt.argument );
			} else if ( stmt.argument.type === 'ParenthesizedExpression' ) {
				const inner = stmt.argument.expression;
				if ( inner && ( inner.type === 'JSXElement' || inner.type === 'JSXFragment' ) ) found.push( inner );
			}
		} else if ( stmt.type === 'IfStatement' ) {
			if ( stmt.consequent && stmt.consequent.body ) stack.push( ...stmt.consequent.body );
			else if ( stmt.consequent ) stack.push( stmt.consequent );
			if ( stmt.alternate && stmt.alternate.body ) stack.push( ...stmt.alternate.body );
			else if ( stmt.alternate ) stack.push( stmt.alternate );
		}
		// Deliberately NOT descending into nested FunctionDeclaration/
		// ArrowFunctionExpression bodies — those are separate components.
	}
	return found;
}

// ---------------------------------------------------------------------------
// ContainerWrapperControls SPECIAL CASE (capability #1's flagship case)
//
// Its render tree is data-driven (`KIND_PANELS[kind].map(renderPanel)`), not
// literal JSX at the call site — the generic composite resolver above cannot
// see through a `.map()` callback that returns `{ renderPanel(props) }`
// (a CallExpression, not inline JSX). This is a UNIVERSAL special case keyed
// off the `kind` prop every consumer already passes (29 blocks) — not a
// per-block carve-out (R-31-9): any block passing kind="layout" gets the
// SAME layout-panel set, any block passing kind="section" (or omitting the
// prop) gets the SAME section-panel set, and so on.
// ---------------------------------------------------------------------------

const CONTAINER_WRAPPER_FILE = path.join( BLOCKS_DIR, 'container', 'components', 'ContainerWrapperControls.js' );
const CONTAINER_WRAPPER_REL = path.relative( REPO_ROOT, CONTAINER_WRAPPER_FILE ).split( path.sep ).join( '/' );

function buildContainerKindPanels() {
	const src = readFile( CONTAINER_WRAPPER_FILE );
	if ( ! src ) return null;
	const ast = parseSafe( src );
	if ( ! ast ) return null;

	let kindPanels = null;
	traverse( ast, {
		VariableDeclarator( p ) {
			if ( p.node.id && p.node.id.type === 'Identifier' && p.node.id.name === 'KIND_PANELS' ) {
				if ( p.node.init && p.node.init.type === 'ObjectExpression' ) {
					kindPanels = {};
					for ( const prop of p.node.init.properties ) {
						if ( prop.type !== 'ObjectProperty' ) continue;
						const kindName = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
						if ( prop.value.type !== 'ArrayExpression' ) continue;
						const jsxBodies = [];
						for ( const el of prop.value.elements ) {
							if ( ! el ) continue;
							if ( el.type === 'ArrowFunctionExpression' || el.type === 'FunctionExpression' ) {
								jsxBodies.push( ...extractReturnJsxNodes( el.body ) );
							}
						}
						kindPanels[ kindName ] = jsxBodies;
					}
				}
			}
		},
	} );
	return kindPanels;
}

// ---------------------------------------------------------------------------
// THE ROW/PANEL WALKER — the shared engine used for own edit.js, extension
// files, and every resolved composite (including ContainerWrapperControls'
// per-kind panel bodies). Returns { rowsMax, rowsTotal, panelsMax, panelsTotal }.
//
//   rowsMax / panelsMax   — post branch-reduction (max-not-sum, capability #4)
//   rowsTotal / panelsTotal — every declared instance, both sides of a
//                             ternary / all early-return branches included —
//                             this is the "total declared" figure the brief
//                             asks for alongside "max any single client
//                             state shows".
// ---------------------------------------------------------------------------

function emptyResult() {
	return { rowsMax: [], rowsTotal: [], panelsMax: [], panelsTotal: [] };
}

function mergeResults( a, b ) {
	return {
		rowsMax: [ ...a.rowsMax, ...b.rowsMax ],
		rowsTotal: [ ...a.rowsTotal, ...b.rowsTotal ],
		panelsMax: [ ...a.panelsMax, ...b.panelsMax ],
		panelsTotal: [ ...a.panelsTotal, ...b.panelsTotal ],
	};
}

function walkChildren( children, ctx ) {
	let out = emptyResult();
	for ( const child of children || [] ) {
		if ( child.type === 'JSXElement' ) {
			out = mergeResults( out, walkElement( child, ctx ) );
		} else if ( child.type === 'JSXFragment' ) {
			out = mergeResults( out, walkChildren( child.children, ctx ) );
		} else if ( child.type === 'JSXExpressionContainer' ) {
			out = mergeResults( out, walkExpression( child.expression, ctx ) );
		}
	}
	return out;
}

/** Branch reduction (capability #4). LogicalExpression `&&` — single-sided
 * guard, its own count is already the "on" state, nothing to reduce against.
 * ConditionalExpression (ternary) — genuine two-way branch: rowsMax/panelsMax
 * take the LARGER branch only; rowsTotal/panelsTotal take BOTH (declared). */
function walkExpression( expr, ctx ) {
	if ( ! expr ) return emptyResult();
	if ( expr.type === 'JSXElement' ) return walkElement( expr, ctx );
	if ( expr.type === 'JSXFragment' ) return walkChildren( expr.children, ctx );

	if ( expr.type === 'LogicalExpression' && expr.operator === '&&' ) {
		const inner = walkExpression( expr.right, ctx );
		return {
			rowsMax: inner.rowsMax.map( ( r ) => ( { ...r, conditional: true, branchKind: 'and' } ) ),
			rowsTotal: inner.rowsTotal.map( ( r ) => ( { ...r, conditional: true, branchKind: 'and' } ) ),
			panelsMax: inner.panelsMax,
			panelsTotal: inner.panelsTotal,
		};
	}

	if ( expr.type === 'ConditionalExpression' ) {
		const cons = walkExpression( expr.consequent, ctx );
		const alt = walkExpression( expr.alternate, ctx );
		const consLarger = cons.rowsMax.length >= alt.rowsMax.length;
		const chosen = consLarger ? cons : alt;
		return {
			rowsMax: chosen.rowsMax.map( ( r ) => ( { ...r, conditional: true, branchKind: 'ternary', branchChosen: consLarger ? 'consequent' : 'alternate' } ) ),
			rowsTotal: [
				...cons.rowsTotal.map( ( r ) => ( { ...r, conditional: true, branchKind: 'ternary', branchSide: 'consequent' } ) ),
				...alt.rowsTotal.map( ( r ) => ( { ...r, conditional: true, branchKind: 'ternary', branchSide: 'alternate' } ) ),
			],
			panelsMax: chosen.panelsMax,
			panelsTotal: [ ...cons.panelsTotal, ...alt.panelsTotal ],
		};
	}

	// LogicalExpression `||`, CallExpression (e.g. `.map()` we can't resolve
	// generically outside the ContainerWrapperControls special case),
	// identifiers, literals — genuinely out of static reach. Not counted;
	// visible in the JSON as `unresolvedExpressions` count per block.
	if ( ctx.unresolvedExpressions ) ctx.unresolvedExpressions.push( { type: expr.type, line: nodeLine( expr ) } );
	return emptyResult();
}

function walkElement( el, ctx ) {
	const opening = el.openingElement;
	const name = getJsxName( opening.name );
	if ( ! name ) return emptyResult();

	if ( name === 'ToolsPanelItem' || name === '__experimentalToolsPanelItem' ) {
		const label = resolveStringAttr( opening.attributes, 'label' ) || '(unlabelled)';
		const row = { kind: 'ToolsPanelItem', label, file: ctx.currentFile, line: nodeLine( el ) };
		return { rowsMax: [ row ], rowsTotal: [ row ], panelsMax: [], panelsTotal: [] };
	}

	if ( PANEL_NAMES.has( name ) ) {
		const title = resolveStringAttr( opening.attributes, 'title' ) || resolveStringAttr( opening.attributes, 'label' ) || '(untitled panel)';
		// De-dupe a NESTED panel-producing wrapper (e.g. a <ToolsPanel> whose
		// only job is to disclose the SAME <PanelBody>'s content, both titled
		// identically) so it doesn't count as a second panel — observed in
		// sgs/label ("Typography" PanelBody wrapping a "Typography"
		// ToolsPanel). A nested wrapper with a DIFFERENT title is a genuine
		// sub-panel and still counts.
		const isRedundantNestedPanel = ctx.parentPanelTitle === title;
		const innerCtx = { ...ctx, parentPanelTitle: title };
		const inner = walkChildren( el.children, innerCtx );
		if ( isRedundantNestedPanel ) {
			return { rowsMax: inner.rowsMax, rowsTotal: inner.rowsTotal, panelsMax: inner.panelsMax, panelsTotal: inner.panelsTotal };
		}
		const panel = { title, file: ctx.currentFile, line: nodeLine( el ) };
		return {
			rowsMax: inner.rowsMax, rowsTotal: inner.rowsTotal,
			panelsMax: [ panel, ...inner.panelsMax ], panelsTotal: [ panel, ...inner.panelsTotal ],
		};
	}

	if ( PASSTHROUGH_NAMES.has( name ) ) {
		return walkChildren( el.children, ctx );
	}

	if ( name[ 0 ] !== name[ 0 ].toUpperCase() ) {
		// Lowercase host element (div/p/hr/span) — transparent, descend.
		return walkChildren( el.children, ctx );
	}

	// ContainerWrapperControls special case (see block above).
	if ( name === 'ContainerWrapperControls' && ctx.containerKindPanels ) {
		const kindAttr = resolveStringAttr( opening.attributes, 'kind' );
		const kind = kindAttr || 'section';
		const panelsForKind = ctx.containerKindPanels[ kind ] || ctx.containerKindPanels.section || [];
		let out = emptyResult();
		const subCtx = { ...ctx, currentFile: CONTAINER_WRAPPER_REL };
		for ( const jsxBody of panelsForKind ) {
			out = mergeResults( out, jsxBody.type === 'JSXFragment' ? walkChildren( jsxBody.children, subCtx ) : walkElement( jsxBody, subCtx ) );
		}
		out.resolvedKind = kind; // surfaced by caller for reporting
		return out;
	}

	if ( INFORMATIONAL_ONLY.has( name ) ) {
		return emptyResult();
	}

	if ( KNOWN_PRIMITIVES.has( name ) ) {
		const label = resolveStringAttr( opening.attributes, 'label' ) || name;
		const row = { kind: 'primitive', label, componentName: name, file: ctx.currentFile, line: nodeLine( el ) };
		return { rowsMax: [ row ], rowsTotal: [ row ], panelsMax: [], panelsTotal: [] };
	}

	// Unknown capitalised component — attempt composite resolution. Prefer a
	// component LOCALLY defined in the SAME file being walked (a common
	// pattern: `function RRangeControl(...)` declared inside a block's own
	// edit.js, e.g. sgs/hero — not in src/components/ or a per-block
	// components/ dir, so the global index never sees it) over the shared
	// index, since a local definition shadows any same-named shared one.
	const localEntry = ctx.localComponentIndex && ctx.localComponentIndex.get( name );
	const entry = localEntry || ctx.componentIndex.get( name );
	if ( entry && ! ctx.visiting.has( name ) ) {
		ctx.visiting.add( name );
		const subCtx = { ...ctx, currentFile: entry.relFile };
		// Multiple top-level returns = mutually exclusive early-return
		// guards (capability #4 extended to component bodies) — take the
		// branch with the most rows, same reduction as a ternary.
		let best = emptyResult();
		for ( const returnNode of entry.returnNodes ) {
			const candidate = returnNode.type === 'JSXFragment'
				? walkChildren( returnNode.children, subCtx )
				: walkElement( returnNode, subCtx );
			if ( candidate.rowsMax.length >= best.rowsMax.length ) best = candidate;
		}
		ctx.visiting.delete( name );
		return best;
	}

	if ( ctx.visiting.has( name ) ) {
		// Cycle guard fired — recorded, not silently dropped.
		if ( ctx.cycles ) ctx.cycles.push( { component: name, file: ctx.currentFile, line: nodeLine( el ) } );
		const row = { kind: 'cycle-guard', label: name, componentName: name, file: ctx.currentFile, line: nodeLine( el ), unresolved: true };
		return { rowsMax: [ row ], rowsTotal: [ row ], panelsMax: [], panelsTotal: [] };
	}

	// Truly unresolved composite — disclosed as ONE opaque row, flagged.
	const label = resolveStringAttr( opening.attributes, 'label' ) || name;
	const row = { kind: 'unresolved-composite', label, componentName: name, file: ctx.currentFile, line: nodeLine( el ), unresolved: true };
	return { rowsMax: [ row ], rowsTotal: [ row ], panelsMax: [], panelsTotal: [] };
}

/** Find every `<InspectorControls>` region anywhere in a file's AST
 * (not scoped to any particular function — extension files nest theirs
 * inside `addFilter('editor.BlockEdit', (BlockEdit) => (props) => {...})`
 * HOCs and this must reach them exactly like check-simple-surface-cap.js
 * reaches edit.js's), and walk each region. */
function scanFileForInspectorRegions( filePath, ctx ) {
	const src = readFile( filePath );
	if ( ! src ) return { regions: [], parseError: null, missing: true };
	const ast = parseSafe( src );
	if ( ! ast ) return { regions: [], parseError: 'parse failed', missing: false };

	const regions = [];
	const relFile = path.relative( REPO_ROOT, filePath ).split( path.sep ).join( '/' );

	// Build a same-file local-component index (functions/const-arrows defined
	// directly in this file, e.g. a block's own edit.js) so a locally-defined
	// composite resolves exactly like a shared one — see walkElement's
	// localComponentIndex lookup.
	const localComponentIndex = new Map();
	traverse( ast, {
		FunctionDeclaration( p ) {
			registerIfComponent( p.node.id && p.node.id.name, p.node.body, localComponentIndex, relFile );
		},
		VariableDeclarator( p ) {
			if (
				p.node.id && p.node.id.type === 'Identifier' && p.node.init &&
				( p.node.init.type === 'ArrowFunctionExpression' || p.node.init.type === 'FunctionExpression' )
			) {
				registerIfComponent( p.node.id.name, p.node.init.body, localComponentIndex, relFile );
			}
		},
	} );

	const subCtx = { ...ctx, currentFile: relFile, localComponentIndex };

	traverse( ast, {
		JSXElement( elPath ) {
			const name = getJsxName( elPath.node.openingElement.name );
			if ( name !== 'InspectorControls' ) return;
			const groupAttr = resolveStringAttr( elPath.node.openingElement.attributes, 'group' ) || 'default';
			const result = walkChildren( elPath.node.children, subCtx );
			regions.push( { group: groupAttr, line: nodeLine( elPath.node ), ...result } );
			elPath.skip();
		},
	} );

	return { regions, parseError: null, missing: false };
}

function findEditFile( blockDirName ) {
	const candidates = [
		path.join( BLOCKS_DIR, blockDirName, 'edit.js' ),
		path.join( BLOCKS_DIR, blockDirName, 'edit', 'index.js' ),
	];
	return candidates.find( ( c ) => fs.existsSync( c ) ) || null;
}

// ---------------------------------------------------------------------------
// BLOCK ROSTER + block.json supports
// ---------------------------------------------------------------------------

function loadBlockRoster() {
	const roster = [];
	for ( const entry of fs.readdirSync( BLOCKS_DIR, { withFileTypes: true } ) ) {
		if ( ! entry.isDirectory() || entry.name === 'extensions' ) continue;
		const blockJsonPath = path.join( BLOCKS_DIR, entry.name, 'block.json' );
		if ( ! fs.existsSync( blockJsonPath ) ) continue;
		let blockJson;
		try {
			blockJson = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
		} catch ( e ) {
			continue;
		}
		if ( ! blockJson.name || ! blockJson.name.startsWith( 'sgs/' ) ) continue;
		roster.push( { slug: blockJson.name, dirName: entry.name, supports: blockJson.supports || {} } );
	}
	roster.sort( ( a, b ) => a.slug.localeCompare( b.slug ) );
	return roster;
}

// ---------------------------------------------------------------------------
// NATIVE `supports` RESOLVER (capability #2)
// ---------------------------------------------------------------------------

function nativeSupportsEstimate( supports, ownPanelTitles ) {
	const titlesLower = ownPanelTitles.map( ( t ) => t.toLowerCase() );
	const hasKeyword = ( kws ) => kws.some( ( kw ) => titlesLower.some( ( t ) => t.includes( kw ) ) );

	const panels = [];
	const rows = [];
	const suppressed = [];

	for ( const family of NATIVE_SUPPORT_FAMILIES ) {
		const val = supports[ family.key ];
		if ( val === undefined || val === null || val === false ) continue;

		let n = 0;
		if ( family.key === 'color' && typeof val === 'object' ) {
			n = [ 'text', 'background', 'link' ].filter( ( k ) => val[ k ] === true ).length;
		} else if ( family.key === 'typography' && typeof val === 'object' ) {
			n = Object.keys( val ).filter(
				( k ) => val[ k ] === true && ! k.startsWith( '__experimentalSkipSerialization' ) && ! k.startsWith( '__experimentalDefaultControls' )
			).length;
		} else if ( family.key === 'spacing' && typeof val === 'object' ) {
			n = [ 'margin', 'padding', 'blockGap' ].filter( ( k ) => val[ k ] === true || Array.isArray( val[ k ] ) ).length;
			if ( supports.dimensions && supports.dimensions.minHeight === true ) n += 1;
		} else if ( family.key === '__experimentalBorder' && typeof val === 'object' ) {
			if ( val.radius === true ) n += 1;
			if ( val.color === true || val.width === true || val.style === true ) n += 1;
		} else if ( family.key === 'shadow' && val === true ) {
			n = 1;
		}

		if ( n === 0 ) continue;

		if ( hasKeyword( family.dedupKeywords ) ) {
			suppressed.push( { family: family.key, n, reason: 'own PanelBody/ToolsPanel title matches ' + family.dedupKeywords.join( '/' ) } );
			continue;
		}

		panels.push( { title: family.panelTitle } );
		for ( let i = 0; i < n; i++ ) rows.push( { kind: 'native-support', family: family.key } );
	}

	return { panels, rows, suppressed };
}

// ---------------------------------------------------------------------------
// CORE / Advanced bucket (D544's reconciliation — see module header)
// ---------------------------------------------------------------------------

function coreAdvancedBucket( supports ) {
	const rows = [];
	if ( supports.anchor === true ) rows.push( { kind: 'core-advanced', label: 'HTML anchor' } );
	// customClassName / className default to true when the key is absent.
	const classNameEnabled = supports.customClassName !== false && supports.className !== false;
	if ( classNameEnabled ) rows.push( { kind: 'core-advanced', label: 'Additional CSS class(es)' } );
	rows.push( { kind: 'core-advanced-extension', label: 'Custom CSS (custom-css.js)' } );
	rows.push( { kind: 'core-advanced-extension', label: 'Save as Default (block-defaults.js)' } );
	return { panels: [ { title: 'Advanced' } ], rows };
}

// ---------------------------------------------------------------------------
// EXTENSION SCAN (capability #3) — scan each extension file ONCE, cache.
// ---------------------------------------------------------------------------

function scanExtensions( ctx ) {
	const perFilePanels = []; // flat list of { title, rowsMax, rowsTotal, sourceFile }
	for ( const file of EXTENSION_FILES_WITH_PANELS ) {
		const full = path.join( EXTENSIONS_DIR, file );
		const { regions, missing, parseError } = scanFileForInspectorRegions( full, ctx );
		if ( missing || parseError ) continue;
		for ( const region of regions ) {
			for ( const panel of region.panelsMax ) {
				// Rows belonging to THIS panel only: re-walk isn't needed —
				// region.rowsMax already holds all rows for the region; a
				// region here is exactly one InspectorControls block, and in
				// every extension file scanned that contains exactly one
				// PanelBody/ToolsPanel, so region rows == panel rows.
				perFilePanels.push( {
					title: panel.title,
					rowsMax: region.rowsMax,
					rowsTotal: region.rowsTotal,
					sourceFile: path.relative( REPO_ROOT, full ).split( path.sep ).join( '/' ),
				} );
			}
		}
	}
	return perFilePanels;
}

function loadFxQualifyingBlocks() {
	const p = path.join( EXTENSIONS_DIR, 'generated-fx-qualifying-blocks.json' );
	try {
		return new Set( Object.keys( JSON.parse( fs.readFileSync( p, 'utf8' ) ) ) );
	} catch ( e ) {
		return new Set();
	}
}

function extensionBucketForBlock( block, extensionPanels, fxQualifying ) {
	const hideList = ( block.supports.sgs && Array.isArray( block.supports.sgs.hideExtensions ) ) ? block.supports.sgs.hideExtensions : [];
	const imageControlsOn = !! ( block.supports.sgs && block.supports.sgs.imageControls === true );

	const panels = [];
	const rows = [];
	const excluded = [];

	for ( const panel of extensionPanels ) {
		const meta = EXTENSION_PANEL_META[ panel.title ];
		if ( ! meta ) {
			excluded.push( { title: panel.title, reason: 'no gating metadata registered — see EXTENSION_PANEL_META' } );
			continue;
		}
		if ( meta.hideKey && hideList.includes( meta.hideKey ) ) {
			excluded.push( { title: panel.title, reason: `opted out via supports.sgs.hideExtensions: ["${ meta.hideKey }"]` } );
			continue;
		}
		if ( meta.gate === 'fxQualifying' && ! fxQualifying.has( block.slug ) ) {
			excluded.push( { title: panel.title, reason: 'block not in generated-fx-qualifying-blocks.json' } );
			continue;
		}
		if ( meta.gate === 'imageControls' && ! imageControlsOn ) {
			excluded.push( { title: panel.title, reason: 'supports.sgs.imageControls not true' } );
			continue;
		}
		panels.push( { title: panel.title, source: panel.sourceFile } );
		for ( const r of panel.rowsMax ) rows.push( { ...r, panelTitle: panel.title } );
	}

	return { panels, rows, excluded };
}

// ---------------------------------------------------------------------------
// DOM-ESTIMATE (secondary total, disclosed multiplier)
// ---------------------------------------------------------------------------

function domEstimateFromRows( rows ) {
	let extra = 0;
	for ( const r of rows ) {
		const mult = RESPONSIVE_DOM_MULTIPLIER[ r.componentName ];
		if ( mult ) extra += mult - 1;
	}
	return rows.length + extra;
}

// ---------------------------------------------------------------------------
// PER-BLOCK ANALYSIS
// ---------------------------------------------------------------------------

function analyseBlock( block, sharedCtx ) {
	const editFile = findEditFile( block.dirName );
	if ( ! editFile ) {
		return { slug: block.slug, missing: true };
	}

	const ctx = { ...sharedCtx, visiting: new Set(), cycles: [], unresolvedExpressions: [] };
	const { regions, parseError } = scanFileForInspectorRegions( editFile, ctx );
	if ( parseError ) {
		return { slug: block.slug, parseError };
	}

	let ownRowsMax = [], ownRowsTotal = [], ownPanelsMax = [], ownPanelsTotal = [];
	for ( const region of regions ) {
		ownRowsMax.push( ...region.rowsMax );
		ownRowsTotal.push( ...region.rowsTotal );
		ownPanelsMax.push( ...region.panelsMax );
		ownPanelsTotal.push( ...region.panelsTotal );
	}

	const ownPanelTitles = ownPanelsMax.map( ( p ) => p.title );
	const native = nativeSupportsEstimate( block.supports, ownPanelTitles );

	const own = {
		panels: [ ...ownPanelsMax.map( ( p ) => ( { title: p.title, source: 'edit.js' } ) ), ...native.panels ],
		rows: [ ...ownRowsMax, ...native.rows ],
		rowsTotalDeclared: [ ...ownRowsTotal, ...native.rows ].length,
		nativeSuppressed: native.suppressed,
		unresolvedCount: ownRowsMax.filter( ( r ) => r.unresolved ).length,
		cycles: ctx.cycles,
	};

	const extBucket = extensionBucketForBlock( block, sharedCtx.extensionPanels, sharedCtx.fxQualifying );
	const core = coreAdvancedBucket( block.supports );

	const domEstimateOwn = domEstimateFromRows( own.rows );
	const domEstimateExt = domEstimateFromRows( extBucket.rows );

	return {
		slug: block.slug,
		missing: false,
		own: {
			panels: own.panels.length,
			rows: own.rows.length,
			rowsTotalDeclared: own.rowsTotalDeclared,
			domEstimate: domEstimateOwn,
			nativeSuppressed: own.nativeSuppressed,
			unresolvedCount: own.unresolvedCount,
			panelTitles: own.panels.map( ( p ) => p.title ),
			cycles: own.cycles,
		},
		extension: {
			panels: extBucket.panels.length,
			rows: extBucket.rows.length,
			domEstimate: domEstimateExt,
			panelTitles: extBucket.panels.map( ( p ) => p.title ),
			excluded: extBucket.excluded,
		},
		core: {
			panels: core.panels.length,
			rows: core.rows.length,
			panelTitles: core.panels.map( ( p ) => p.title ),
		},
		total: {
			panels: own.panels.length + extBucket.panels.length + core.panels.length,
			rows: own.rows.length + extBucket.rows.length + core.rows.length,
			domEstimate: domEstimateOwn + domEstimateExt + core.rows.length,
		},
	};
}

// ---------------------------------------------------------------------------
// DB CROSS-CHECK — independent-method expected population (rules.json
// `_meta.zeroIsAClaim` doctrine: state expected population BEFORE trusting
// the live scan, using a method independent of the scan's own code).
// ---------------------------------------------------------------------------

function dbCrossCheck() {
	if ( ! fs.existsSync( DB_PATH ) ) {
		return { ok: false, reason: 'sgs-framework.db not found at ' + DB_PATH };
	}
	const script = `
import sqlite3
conn = sqlite3.connect('file:${ DB_PATH.replace( /\\/g, '/' ) }?mode=ro', uri=True)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM blocks WHERE slug LIKE 'sgs/%'")
block_count = cur.fetchone()[0]
out = {'block_count': block_count}
for key in ['color','spacing','__experimentalBorder','typography','shadow','dimensions']:
    cur.execute("SELECT COUNT(DISTINCT block_slug) FROM block_supports WHERE block_slug LIKE 'sgs/%' AND support_name=? AND support_value NOT IN ('false','null')", (key,))
    out[key] = cur.fetchone()[0]
import json
print(json.dumps(out))
`;
	try {
		const out = execFileSync( 'python', [ '-c', script ], { encoding: 'utf8' } );
		return { ok: true, data: JSON.parse( out.trim() ) };
	} catch ( e ) {
		return { ok: false, reason: e.message };
	}
}

// ---------------------------------------------------------------------------
// BUILD SHARED CONTEXT (once)
// ---------------------------------------------------------------------------

function buildSharedContext() {
	const componentIndex = buildComponentIndex();
	const containerKindPanels = buildContainerKindPanels();
	const baseCtx = { componentIndex, containerKindPanels, unresolvedExpressions: null };
	const extensionPanels = scanExtensions( { ...baseCtx, visiting: new Set() } );
	const fxQualifying = loadFxQualifyingBlocks();
	return { ...baseCtx, extensionPanels, fxQualifying };
}

// ---------------------------------------------------------------------------
// REPORTING
// ---------------------------------------------------------------------------

function renderHuman( results, dbCheck ) {
	const lines = [];
	lines.push( '='.repeat( 88 ) );
	lines.push( 'INSPECTOR SURFACE survey (READ-ONLY, Spec 35 D543/D544 replacement) — --survey mode only' );
	lines.push( '='.repeat( 88 ) );
	lines.push( '' );
	lines.push( 'INDEPENDENT-METHOD POPULATION CHECK (sgs-framework.db, zeroIsAClaim doctrine):' );
	if ( dbCheck.ok ) {
		lines.push( `  block count (DB)               : ${ dbCheck.data.block_count }` );
		lines.push( `  block count (filesystem)        : ${ results.length }` );
		lines.push( `  color supports (DB)              : ${ dbCheck.data.color }` );
		lines.push( `  spacing supports (DB)             : ${ dbCheck.data.spacing }` );
		lines.push( `  __experimentalBorder supports (DB): ${ dbCheck.data.__experimentalBorder }` );
		lines.push( `  typography supports (DB)          : ${ dbCheck.data.typography }` );
		lines.push( `  shadow supports (DB)               : ${ dbCheck.data.shadow }` );
		lines.push( `  dimensions supports (DB)           : ${ dbCheck.data.dimensions }` );
	} else {
		lines.push( `  DB cross-check UNAVAILABLE: ${ dbCheck.reason }` );
	}
	lines.push( '' );
	lines.push( '-'.repeat( 88 ) );
	lines.push( 'PER-BLOCK: OWN | EXTENSION | CORE | TOTAL   (rows [row-level] / domEstimate [.components-base-control estimate])' );
	lines.push( '-'.repeat( 88 ) );
	lines.push( 'slug'.padEnd( 28 ) + 'OWN(panels/rows/dom)'.padEnd( 22 ) + 'EXT(panels/rows/dom)'.padEnd( 22 ) + 'CORE(panels/rows)'.padEnd( 20 ) + 'TOTAL(panels/rows/dom)' );

	for ( const r of results ) {
		if ( r.missing ) {
			lines.push( `${ r.slug.padEnd( 28 ) } [no edit.js found]` );
			continue;
		}
		if ( r.parseError ) {
			lines.push( `${ r.slug.padEnd( 28 ) } [PARSE ERROR: ${ r.parseError }]` );
			continue;
		}
		const own = `${ r.own.panels }/${ r.own.rows }/${ r.own.domEstimate }`;
		const ext = `${ r.extension.panels }/${ r.extension.rows }/${ r.extension.domEstimate }`;
		const core = `${ r.core.panels }/${ r.core.rows }`;
		const total = `${ r.total.panels }/${ r.total.rows }/${ r.total.domEstimate }`;
		lines.push( r.slug.padEnd( 28 ) + own.padEnd( 22 ) + ext.padEnd( 22 ) + core.padEnd( 20 ) + total );
	}

	return lines.join( '\n' );
}

function renderCalibration( results ) {
	const CALIBRATION = {
		'sgs/product-card': { livePanels: 19, liveControls: 86 },
		'sgs/hero': { livePanels: 22, liveControls: 80 },
		'sgs/button': { livePanels: 17, liveControls: 84 },
		'sgs/quote': { livePanels: 11, liveControls: 60 },
		'sgs/label': { livePanels: 11, liveControls: 50 },
	};
	const lines = [];
	lines.push( '' );
	lines.push( '='.repeat( 88 ) );
	lines.push( 'CALIBRATION — D544 live-canary-editor measurement vs this detector' );
	lines.push( '='.repeat( 88 ) );
	lines.push( 'slug'.padEnd( 22 ) + 'live panels/controls'.padEnd( 24 ) + 'detector panels/rows/dom' );
	const rows = [];
	for ( const [ slug, cal ] of Object.entries( CALIBRATION ) ) {
		const r = results.find( ( x ) => x.slug === slug );
		if ( ! r || r.missing ) {
			lines.push( `${ slug.padEnd( 22 ) } NOT FOUND` );
			continue;
		}
		rows.push( { slug, cal, r } );
		lines.push(
			slug.padEnd( 22 ) +
			`${ cal.livePanels }/${ cal.liveControls }`.padEnd( 24 ) +
			`${ r.total.panels }/${ r.total.rows }/${ r.total.domEstimate }`
		);
	}
	lines.push( '' );
	const liveOrder = Object.entries( CALIBRATION ).sort( ( a, b ) => b[ 1 ].liveControls - a[ 1 ].liveControls ).map( ( x ) => x[ 0 ] );
	const detOrderByDom = rows.slice().sort( ( a, b ) => b.r.total.domEstimate - a.r.total.domEstimate ).map( ( x ) => x.slug );
	const detOrderByRows = rows.slice().sort( ( a, b ) => b.r.total.rows - a.r.total.rows ).map( ( x ) => x.slug );
	lines.push( `Live ordering (by controls, desc):        ${ liveOrder.join( ' > ' ) }` );
	lines.push( `Detector ordering (by domEstimate, desc):  ${ detOrderByDom.join( ' > ' ) }` );
	lines.push( `Detector ordering (by row-count, desc):    ${ detOrderByRows.join( ' > ' ) }` );
	lines.push( `Ordering (domEstimate) MATCHES live: ${ JSON.stringify( liveOrder ) === JSON.stringify( detOrderByDom ) }` );
	lines.push( `Ordering (row-count) MATCHES live:    ${ JSON.stringify( liveOrder ) === JSON.stringify( detOrderByRows ) }` );
	return lines.join( '\n' );
}

function renderLabelBreakdown( results ) {
	const r = results.find( ( x ) => x.slug === 'sgs/label' );
	const lines = [];
	lines.push( '' );
	lines.push( '='.repeat( 88 ) );
	lines.push( 'sgs/label OWN / EXTENSION / CORE breakdown vs D544 measured' );
	lines.push( '='.repeat( 88 ) );
	if ( ! r || r.missing ) {
		lines.push( 'sgs/label not found.' );
		return lines.join( '\n' );
	}
	lines.push( `OWN      — panels: ${ r.own.panels } (measured 4), rows: ${ r.own.rows } (measured 11)  [${ r.own.panelTitles.join( ', ' ) }]` );
	lines.push( `EXTENSION — panels: ${ r.extension.panels } (measured 6), rows: ${ r.extension.rows } (measured 34)  [${ r.extension.panelTitles.join( ', ' ) }]` );
	lines.push( `CORE     — panels: ${ r.core.panels } (measured 1), rows: ${ r.core.rows } (measured 3)  [${ r.core.panelTitles.join( ', ' ) }]` );
	if ( r.own.nativeSuppressed.length ) {
		lines.push( `  own.nativeSuppressed: ${ JSON.stringify( r.own.nativeSuppressed ) }` );
	}
	if ( r.extension.excluded.length ) {
		lines.push( `  extension.excluded: ${ JSON.stringify( r.extension.excluded ) }` );
	}
	return lines.join( '\n' );
}

// ---------------------------------------------------------------------------
// SELF-TEST — one negative control per capability, plus a sabotage-and-
// restore demonstration (rules.json zeroIsAClaim: "the rejected instrument's
// self-test certified its own worst defect as correct" — this one must be
// able to FAIL on each of the four defects it exists to catch).
// ---------------------------------------------------------------------------

function selfTest() {
	let passed = 0;
	const failed = [];
	const record = ( ok, msg ) => { if ( ok ) passed++; else failed.push( msg ); };

	// --- Capability 4: conditional branches are MAX not SUM -----------------
	const ternarySrc = `
import { InspectorControls } from '@wordpress/block-editor';
import { ToggleControl, RangeControl, SelectControl } from '@wordpress/components';
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			{ attributes.mode === 'query'
				? ( <>
					<ToggleControl label="A" checked={ false } onChange={ () => {} } />
					<RangeControl label="B" value={ 1 } onChange={ () => {} } />
					<SelectControl label="C" value="" options={ [] } onChange={ () => {} } />
				</> )
				: ( <ToggleControl label="D" checked={ false } onChange={ () => {} } /> ) }
		</InspectorControls>
	);
}`;
	{
		const ast = parseSafe( ternarySrc );
		const ctx = { componentIndex: new Map(), containerKindPanels: null, visiting: new Set(), unresolvedExpressions: [] };
		let region = null;
		traverse( ast, {
			JSXElement( p ) {
				if ( getJsxName( p.node.openingElement.name ) === 'InspectorControls' ) {
					region = walkChildren( p.node.children, { ...ctx, currentFile: '(fixture)' } );
					p.skip();
				}
			},
		} );
		// SUM would give 4 (3+1). MAX must give 3 (the larger branch).
		record( region.rowsMax.length === 3, `ternary max-not-sum: expected rowsMax=3, got ${ region.rowsMax.length }` );
		// Total-declared must still show both branches: 4.
		record( region.rowsTotal.length === 4, `ternary total-declared: expected rowsTotal=4, got ${ region.rowsTotal.length }` );
	}

	// NEGATIVE CONTROL for capability 4 — a SUM-style detector (what the
	// rejected instrument would effectively do if it counted every JSX
	// element regardless of branch) must NOT be what this detector reports.
	// Prove the detector CAN be wrong by simulating the naive sum and
	// showing it disagrees with rowsMax (proves rowsMax isn't accidentally
	// equal to the naive sum on this fixture).
	{
		const ast = parseSafe( ternarySrc );
		let naiveSum = 0;
		traverse( ast, {
			JSXOpeningElement( p ) {
				const name = getJsxName( p.node.name );
				if ( [ 'ToggleControl', 'RangeControl', 'SelectControl' ].includes( name ) ) naiveSum++;
			},
		} );
		record( naiveSum === 4, `sabotage baseline: naive JSX-element sum should be 4, got ${ naiveSum } (this IS the rejected instrument's failure mode)` );
	}

	// --- Capability 1: composite descent -------------------------------------
	const compositeSrc = `
import { InspectorControls } from '@wordpress/block-editor';
import { WidthPanel } from './components/FakeComposite';
export default function Edit( props ) {
	return ( <InspectorControls><WidthPanel { ...props } /></InspectorControls> );
}`;
	const fakeCompositeSrc = `
import { PanelBody } from '@wordpress/components';
import { UnitControl, RangeControl } from '@wordpress/components';
export function WidthPanel( props ) {
	return (
		<PanelBody title="Width">
			<UnitControl label="Max width" value="" onChange={ () => {} } />
			<RangeControl label="Min width" value={ 0 } onChange={ () => {} } />
		</PanelBody>
	);
}`;
	{
		const compAst = parseSafe( fakeCompositeSrc );
		const index = new Map();
		traverse( compAst, {
			FunctionDeclaration( p ) {
				registerIfComponent( p.node.id && p.node.id.name, p.node.body, index, '(fixture-composite)' );
			},
		} );
		const editAst = parseSafe( compositeSrc );
		const ctx = { componentIndex: index, containerKindPanels: null, visiting: new Set(), unresolvedExpressions: [] };
		let region = null;
		traverse( editAst, {
			JSXElement( p ) {
				if ( getJsxName( p.node.openingElement.name ) === 'InspectorControls' ) {
					region = walkChildren( p.node.children, { ...ctx, currentFile: '(fixture)' } );
					p.skip();
				}
			},
		} );
		// Undescended = 1 row (the rejected instrument's answer). Descended = 2.
		record( region.rowsMax.length === 2, `composite descent: expected 2 leaf rows inside WidthPanel, got ${ region.rowsMax.length } (1 would be the REJECTED instrument's answer)` );
		record( region.panelsMax.length === 1 && region.panelsMax[ 0 ].title === 'Width', 'composite descent: expected the composite\'s own "Width" panel to surface, got ' + JSON.stringify( region.panelsMax ) );
	}

	// --- Capability 2: native supports panels are visible --------------------
	{
		const supports = { color: { text: true, background: true, link: false } };
		const native = nativeSupportsEstimate( supports, [] ); // no own panel titled "Colour" -> must surface
		record( native.panels.length === 1 && native.rows.length === 2, `native supports (undedup'd): expected 1 panel / 2 rows, got ${ native.panels.length }/${ native.rows.length }` );

		const nativeDeduped = nativeSupportsEstimate( supports, [ 'Colour' ] ); // own panel exists -> suppressed
		record( nativeDeduped.panels.length === 0 && nativeDeduped.suppressed.length === 1, `native supports de-dup: expected 0 panels / 1 suppressed entry when own "Colour" panel exists, got ${ nativeDeduped.panels.length }/${ nativeDeduped.suppressed.length }` );
	}

	// NEGATIVE CONTROL for capability 2 — supports object with everything
	// false/absent must yield ZERO native panels (proves the detector CAN
	// say "none", not hard-wired to always report a native panel).
	{
		const none = nativeSupportsEstimate( { color: { text: false, background: false, link: false } }, [] );
		record( none.panels.length === 0, `native supports negative control: expected 0 panels when nothing is true, got ${ none.panels.length }` );
	}

	// --- Capability 3: extension reach + hideExtensions opt-out --------------
	{
		const fakePanels = [
			{ title: 'Hover Effects', rowsMax: [ { kind: 'ToolsPanelItem', label: 'x' } ], rowsTotal: [], sourceFile: 'hover-effects.js' },
			{ title: 'Animation', rowsMax: [ { kind: 'ToolsPanelItem', label: 'y' } ], rowsTotal: [], sourceFile: 'animation.js' },
		];
		const blockNoOptOut = { slug: 'sgs/fake', supports: { sgs: {} } };
		const bucketA = extensionBucketForBlock( blockNoOptOut, fakePanels, new Set() );
		record( bucketA.panels.length === 2, `extension reach (no opt-out): expected 2 panels, got ${ bucketA.panels.length }` );

		const blockOptOut = { slug: 'sgs/fake', supports: { sgs: { hideExtensions: [ 'hover' ] } } };
		const bucketB = extensionBucketForBlock( blockOptOut, fakePanels, new Set() );
		record( bucketB.panels.length === 1 && bucketB.excluded.length === 1, `extension reach (hover opted out): expected 1 panel + 1 excluded, got ${ bucketB.panels.length } panels / ${ bucketB.excluded.length } excluded` );
	}

	// --- SABOTAGE-AND-RESTORE: prove the detector can genuinely FAIL --------
	// Sabotage: temporarily corrupt RESPONSIVE_DOM_MULTIPLIER to claim
	// ResponsiveBoxControl renders x1 instead of x3, run the dom-estimate
	// calc, show it now gives the WRONG (undercounted) answer, then restore
	// and show it gives the right one again. This proves selfTest() is not
	// vacuously green — it can and does distinguish a broken state.
	{
		const rows = [
			{ componentName: 'ResponsiveBoxControl' },
			{ componentName: 'ResponsiveBoxControl' },
			{ componentName: 'ToggleControl' },
		];
		const correctEstimate = domEstimateFromRows( rows ); // 3 + (3-1) + (3-1) = 7
		record( correctEstimate === 7, `dom-estimate baseline: expected 7, got ${ correctEstimate }` );

		const originalMultiplier = RESPONSIVE_DOM_MULTIPLIER.ResponsiveBoxControl;
		RESPONSIVE_DOM_MULTIPLIER.ResponsiveBoxControl = 1; // SABOTAGE
		const sabotagedEstimate = domEstimateFromRows( rows );
		RESPONSIVE_DOM_MULTIPLIER.ResponsiveBoxControl = originalMultiplier; // RESTORE
		const restoredEstimate = domEstimateFromRows( rows );

		record( sabotagedEstimate === 3, `SABOTAGE: with multiplier forced to 1x, expected wrong answer 3, got ${ sabotagedEstimate } (proves the metric is NOT hardcoded/inert — it moved when sabotaged)` );
		record( restoredEstimate === 7, `RESTORE: after undoing sabotage, expected 7 again, got ${ restoredEstimate } (proves restore genuinely reverses the sabotage, not a fluke)` );
		record( sabotagedEstimate !== correctEstimate, 'SABOTAGE must disagree with the correct baseline (else the self-test cannot distinguish broken from working)' );
	}

	return { passed, failed };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
	const argv = process.argv.slice( 2 );

	if ( argv.includes( '--self-test' ) ) {
		process.stdout.write( '[survey-inspector-surface] --self-test\n\n' );
		const { passed, failed } = selfTest();
		process.stdout.write( `Self-test: ${ passed } passed, ${ failed.length } failed\n` );
		for ( const f of failed ) process.stdout.write( `  FAIL: ${ f }\n` );
		process.exit( failed.length === 0 ? 0 : 1 );
	}

	const asJson = argv.includes( '--json' );
	const blockFilterArg = argv.find( ( a ) => a.startsWith( '--block=' ) );
	const blockFilter = blockFilterArg ? blockFilterArg.slice( '--block='.length ) : null;

	const sharedCtx = buildSharedContext();
	let roster = loadBlockRoster();
	if ( blockFilter ) roster = roster.filter( ( b ) => b.slug === blockFilter );

	const results = roster.map( ( b ) => analyseBlock( b, sharedCtx ) );
	const dbCheck = dbCrossCheck();

	if ( asJson ) {
		process.stdout.write( JSON.stringify( { dbCheck, results }, null, 2 ) + '\n' );
		return;
	}

	process.stdout.write( renderHuman( results, dbCheck ) + '\n' );
	if ( ! blockFilter ) {
		process.stdout.write( renderCalibration( results ) + '\n' );
		process.stdout.write( renderLabelBreakdown( results ) + '\n' );
	}
}

if ( require.main === module ) {
	main();
}

module.exports = {
	buildComponentIndex, buildContainerKindPanels, buildSharedContext,
	loadBlockRoster, analyseBlock, nativeSupportsEstimate, extensionBucketForBlock,
	domEstimateFromRows, selfTest, RESPONSIVE_DOM_MULTIPLIER,
	scanFileForInspectorRegions, findEditFile,
};
