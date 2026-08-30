'use strict';

// scattered-element-controls.js — PROTOTYPE detector (design + feasibility task, 2026-08-30).
//
// PROBLEM: on sgs/hero, the controls for ONE visual element (the split-media
// image) are scattered across up to 4 inspector locations: Settings > "Split
// image", Styles > "Split image styling", Styles > "Container / Entire Block"
// > ToolsPanelItem "Split layout grid", and the shared BackgroundPanel
// (vocabulary overlap only, not a shared attribute). This script is a census
// (--survey) that walks every block's edit.js AST, resolves each control's
// PANEL LOCATION and the ATTRIBUTE(S) it writes, cross-references each
// attribute's css_element via the sgs-framework.db `block_attributes` table,
// and flags an element whose attributes are written from more than one
// distinct panel.
//
// REUSED PRIMITIVES (do not duplicate — see inspector-scan/README.md):
//   - core/sources.js SourceCache — one parse per file (AST + comment-stripped text)
//   - core/roster.js reconcile() — the block roster (roster.json vs disk union)
//   - core/components.js resolveComponentFiles() — name -> file for shared
//     panel components (BackgroundPanel, SgsColourPanel, ...), used ONLY to
//     recognise "this JSX tag is a known shared component" — this script does
//     NOT open those files to find attributes inside them (see Hard Case 3
//     below; that is future work, not a guess).
//
// DB ACCESS: read-only sqlite3, spawned via a one-shot python subprocess
// (matches the project convention documented in CLAUDE.md — never import
// scripts/converter/db/db_lookup.py, which runs migrations as an import
// side effect).
//
// MODES:
//   --survey [--block sgs/x]   full census, human-readable report
//   --survey --json            machine-readable
//   --self-test                positive + negative control assertions on
//                               synthetic fixtures (no real DB / block dependency)
//
// NOT BUILT: --fix. Not asked for, and a codemod moving inspector JSX around
// four call sites per block is a different, much larger job than this
// feasibility prototype.

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const { spawnSync } = require( 'child_process' );

const { SourceCache } = require( './inspector-scan/core/sources' );
const { reconcile } = require( './inspector-scan/core/roster' );
const { resolveComponentFiles } = require( './inspector-scan/core/components' );

const traverseModule = require( '@babel/traverse' );
const traverse = traverseModule.default || traverseModule;

const PLUGIN_ROOT = path.resolve( __dirname, '..' );
const BLOCKS_DIR = path.resolve( PLUGIN_ROOT, 'src', 'blocks' );
const DB_PATH = path.resolve(
	os.homedir(),
	'.claude',
	'skills',
	'sgs-wp-engine',
	'sgs-framework.db'
);

// ---------------------------------------------------------------------------
// DB read (read-only, one shot for the whole run)
// ---------------------------------------------------------------------------

// RULING 1 (2026-08-30) — non-paintable-attribute exclusion.
//
// DB enumeration behind this predicate (run against sgs-framework.db, read-only):
//   SELECT DISTINCT role, css_property FROM block_attributes WHERE css_property='tag';
//   -> ('tag-identity','tag') x1, ('enum-mode','tag') x7   [8 rows total]
//   SELECT * FROM block_attributes WHERE role='tag-identity';
//   -> 5 rows: sgs/heading.level, sgs/media.mediaType, sgs/product-card.headingLevel,
//      sgs/product-faq.headingLevel, sgs/icon-list.headingLevel — only product-card's
//      headingLevel carries a non-NULL css_element ('title'); the other 4 already have
//      css_element=NULL and were already excluded by the existing null-skip path.
//   The other 7 css_property='tag' rows (card-grid/form-review/pricing-table/
//   process-steps/team-member/timeline/trustpilot-reviews, all role='enum-mode') are
//   EXACTLY the bogus-finding elements the owner named (card-grid[title],
//   pricing-table[title], process-steps[title], team-member[name]) plus 3 more of the
//   same shape that never surfaced as findings only because those elements had no OTHER
//   scattered attribute at the time.
//   role='tag-identity' ALONE is insufficient — it would miss the 7 'enum-mode' rows,
//   which are the majority of the real bug. css_property='tag' is the exact, sole,
//   DB-enumerated signal: `SELECT DISTINCT css_property FROM block_attributes WHERE
//   role='enum-mode'` returns only (NULL) and ('tag') — no other enum-mode css_property
//   value exists that would need the same treatment.
//
// This is a structural exclusion, not a styling-control judgement call: `tag` names an
// HTML TAG (h2 vs h3 vs h4, a semantic/SEO choice), never a CSS property. It cannot be
// "co-located" with a colour control in any panel because it isn't part of the visual
// styling surface of the element at all.
const NON_PAINTABLE_CSS_PROPERTIES = new Set( [ 'tag' ] );

// RULING 2 (2026-08-30) — cross-property-family down-rank to "info".
//
// Property-family source: block_attributes.css_property, using the two families the
// owner NAMED explicitly (border / motion-transform), not plugins/sgs-blocks/scripts/
// consistency/cluster-member-sets.json's 6-cluster vocabulary (text/fill/layout/
// position/motion/animation) — that file's clusters do NOT separate "border" from
// other box-layout properties (border-width/style/colour/radius/box-shadow/outline-*
// are ALL one member of its single "layout" cluster, alongside plain `width`/
// `margin-top`/`margin-bottom`/`outline-width`/`box-shadow-color`), so a cluster-set
// difference cannot distinguish the "must still flag" cases from the "by design" cases:
// verified against every case in the ruling — form[focus-ring]'s formFocusRingColour is
// DB-typed css_property='border-color' (same "layout" cluster as its sibling
// formFocusRingWidth/Opacity/Offset), so a pure cluster-diff would have DOWN-RANKED it,
// which the ruling explicitly forbids. The two families below are read directly off
// block_attributes.css_property (DB-enumerated: `SELECT DISTINCT css_property FROM
// block_attributes` — the full "border-*" family is exactly {border-color,
// border-color-gradient, border-radius, border-style, border-width}; `transform` is a
// single distinct value, matching the ruling's own wording "scaleHover IS a transform").
const BORDER_FAMILY_RE = /^border-/;
const MOTION_TRANSFORM_FAMILY = new Set( [ 'transform' ] );

function loadCssElementMap() {
	const pyScript = `
import sqlite3, json, sys
db = ${ JSON.stringify( DB_PATH ) }
con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
cur = con.cursor()
cur.execute("SELECT block_slug, attr_name, css_element, css_property FROM block_attributes")
rows = cur.fetchall()
json.dump(rows, sys.stdout)
`;
	const result = spawnSync( 'python', [ '-c', pyScript ], { encoding: 'utf8' } );
	if ( result.error || result.status !== 0 ) {
		return {
			ok: false,
			reason: `could not query sgs-framework.db (${ result.error ? result.error.message : result.stderr })`,
			map: new Map(),
			nullCount: 0,
			totalRows: 0,
		};
	}
	let rows;
	try {
		rows = JSON.parse( result.stdout );
	} catch ( e ) {
		return { ok: false, reason: `unparseable DB dump: ${ e.message }`, map: new Map(), nullCount: 0, totalRows: 0 };
	}
	const map = new Map(); // "slug|attr" -> { cssElement: string|null, cssProperty: string|null }
	let nullCount = 0;
	for ( const [ slug, attr, cssElement, cssProperty ] of rows ) {
		map.set( `${ slug }|${ attr }`, { cssElement, cssProperty } );
		if ( cssElement === null ) nullCount++;
	}
	return { ok: true, reason: null, map, nullCount, totalRows: rows.length };
}

// ---------------------------------------------------------------------------
// JSX name / string-literal helpers
// ---------------------------------------------------------------------------

function jsxName( openingElement ) {
	const n = openingElement.name;
	if ( ! n ) return null;
	if ( n.type === 'JSXIdentifier' ) return n.name;
	if ( n.type === 'JSXMemberExpression' ) return n.property && n.property.name ? n.property.name : null;
	return null;
}

function jsxAttrStringValue( openingElement, attrName ) {
	for ( const attr of openingElement.attributes || [] ) {
		if ( attr.type !== 'JSXAttribute' ) continue;
		if ( ! attr.name || attr.name.name !== attrName ) continue;
		const v = attr.value;
		if ( ! v ) return null;
		if ( v.type === 'StringLiteral' ) return v.value;
		if ( v.type === 'JSXExpressionContainer' ) {
			const e = v.expression;
			if ( e.type === 'StringLiteral' ) return e.value;
			// __( 'Title', 'sgs-blocks' )
			if (
				e.type === 'CallExpression' &&
				e.callee.type === 'Identifier' &&
				e.callee.name === '__' &&
				e.arguments[ 0 ] &&
				e.arguments[ 0 ].type === 'StringLiteral'
			) {
				return e.arguments[ 0 ].value;
			}
		}
		return null; // present but not statically resolvable
	}
	return null;
}

// ---------------------------------------------------------------------------
// Dynamic setAttributes() key resolution
// ---------------------------------------------------------------------------
//
// Handles the 3 shapes actually seen in this codebase (verified against
// sgs/hero edit.js): a literal string key, an Identifier bound to a string
// literal, and a computed MemberExpression on a local lookup-object literal
// (`attrMap[tier]` where `const attrMap = { desktop: 'x', tablet: 'xTablet',
// mobile: 'xMobile' }`) or a ConditionalExpression of string literals. Any
// other shape returns null — UNRESOLVED, never guessed at.

function resolveObjectExpression( node, scope ) {
	if ( ! node ) return null;
	if ( node.type === 'ObjectExpression' ) return node;
	if ( node.type === 'Identifier' ) {
		const binding = scope.getBinding( node.name );
		if ( ! binding || ! binding.path.isVariableDeclarator() ) return null;
		return resolveObjectExpression( binding.path.node.init, scope );
	}
	return null;
}

function resolveKeyNode( node, scope ) {
	if ( ! node ) return null;
	if ( node.type === 'StringLiteral' ) return [ node.value ];
	if ( node.type === 'Identifier' ) {
		const binding = scope.getBinding( node.name );
		if ( ! binding || ! binding.path.isVariableDeclarator() ) return null;
		return resolveKeyNode( binding.path.node.init, scope );
	}
	if ( node.type === 'ConditionalExpression' ) {
		const a = resolveKeyNode( node.consequent, scope ) || [];
		const b = resolveKeyNode( node.alternate, scope ) || [];
		const combined = [ ...a, ...b ];
		return combined.length ? combined : null;
	}
	if ( node.type === 'LogicalExpression' ) {
		const a = resolveKeyNode( node.left, scope ) || [];
		const b = resolveKeyNode( node.right, scope ) || [];
		const combined = [ ...a, ...b ];
		return combined.length ? combined : null;
	}
	if ( node.type === 'MemberExpression' && node.computed ) {
		const objExpr = resolveObjectExpression( node.object, scope );
		if ( ! objExpr ) return null;
		const values = [];
		for ( const prop of objExpr.properties ) {
			if ( prop.type !== 'ObjectProperty' ) continue;
			if ( prop.value.type === 'StringLiteral' ) values.push( prop.value.value );
		}
		return values.length ? values : null;
	}
	return null; // TemplateLiteral, BinaryExpression concat, CallExpression, etc. — refused
}

// ---------------------------------------------------------------------------
// FIX 1 — phantom un-named panel: resolve a shared component's OWN hardcoded
// panel title (e.g. SgsColourPanel always renders <PanelBody title="Colour">
// inside its own file) so a call site like `<SgsColourPanel rows={[...]}/>`
// mounted with no local wrapping <PanelBody> in the CALLING edit.js is
// attributed to that title instead of the empty bucket "".
//
// Extensible by construction: resolveComponentPanelTitle() reads the
// component's OWN source, walks its default-exported function's top-level
// `return` statements, and — ONLY when a return unwraps (through a Fragment /
// <InspectorControls> with exactly one child) to a SINGLE <PanelBody>/
// <ToolsPanel> — extracts its title/label. Anything else (multiple returns
// disagreeing, multiple children, a component that renders raw
// ToolsPanelItems with no wrapping panel of its own, no title/label at all)
// refuses (returns null) and is left exactly as before — still opaque,
// still an empty-bucket flag if nothing else names it. This is what makes
// the fix "a small extensible map", not a one-off SgsColourPanel special
// case: MediaSizingPanel (returns several bare <ToolsPanelItem>s, no
// enclosing panel) correctly refuses; ResponsiveBoxControls /
// RowScrollBehaviourControls (same "root IS a titled PanelBody" shape as
// SgsColourPanel) correctly resolve.
// ---------------------------------------------------------------------------

function isSignificantJSXChild( child ) {
	if ( child.type === 'JSXText' ) return child.value.trim().length > 0;
	return true;
}

function jsxChildToExpr( child ) {
	return child.type === 'JSXExpressionContainer' ? child.expression : child;
}

// Unwrap Fragment / <InspectorControls> wrappers (each requires EXACTLY one
// significant child — more than one means "this component renders more than
// a single panel", which is refused, never guessed at) down to a single
// <PanelBody>/<ToolsPanel> and return its title/label, or null.
function unwrapToPanelTitle( node ) {
	let cur = node;
	while ( cur ) {
		if ( cur.type === 'ParenthesizedExpression' ) {
			cur = cur.expression;
			continue;
		}
		if ( cur.type === 'JSXFragment' ) {
			const kids = cur.children.filter( isSignificantJSXChild );
			if ( kids.length !== 1 ) return null;
			cur = jsxChildToExpr( kids[ 0 ] );
			continue;
		}
		if ( cur.type === 'JSXElement' ) {
			const name = jsxName( cur.openingElement );
			if ( name === 'InspectorControls' || name === 'Fragment' ) {
				const kids = cur.children.filter( isSignificantJSXChild );
				if ( kids.length !== 1 ) return null;
				cur = jsxChildToExpr( kids[ 0 ] );
				continue;
			}
			if ( PANEL_TAGS.has( name ) ) {
				return (
					jsxAttrStringValue( cur.openingElement, 'title' ) ||
					jsxAttrStringValue( cur.openingElement, 'label' ) ||
					null
				);
			}
			return null;
		}
		return null;
	}
	return null;
}

// Resolve ONE shared component's own hardcoded panel title by reading its
// source file. Returns null (refuse) when the component's default export
// cannot be located, or its top-level returns don't agree on a single
// resolvable <PanelBody>/<ToolsPanel> title.
function resolveComponentPanelTitle( filePath, cache ) {
	const parsed = cache.parse( filePath );
	if ( ! parsed.ok ) return null;

	let resolvedTitle = null;
	let conflict = false;

	const considerReturnArg = ( fnPath, arg ) => {
		if ( ! arg ) return;
		const title = unwrapToPanelTitle( arg );
		if ( ! title ) return;
		if ( resolvedTitle !== null && resolvedTitle !== title ) conflict = true;
		resolvedTitle = title;
	};

	traverse( parsed.ast, {
		ExportDefaultDeclaration( defaultPath ) {
			const decl = defaultPath.get( 'declaration' );
			let fnPath = null;
			if ( decl.isFunctionDeclaration() || decl.isFunctionExpression() || decl.isArrowFunctionExpression() ) {
				fnPath = decl;
			} else if ( decl.isIdentifier() ) {
				const binding = defaultPath.scope.getBinding( decl.node.name );
				if ( binding && binding.path.isVariableDeclarator() ) {
					const init = binding.path.get( 'init' );
					if ( init.isFunctionExpression() || init.isArrowFunctionExpression() ) fnPath = init;
				} else if ( binding && binding.path.isFunctionDeclaration() ) {
					fnPath = binding.path;
				}
			}
			if ( ! fnPath ) return;

			// Implicit-return arrow: `() => ( <PanelBody ...>...</PanelBody> )`.
			if ( fnPath.isArrowFunctionExpression() && fnPath.node.body.type !== 'BlockStatement' ) {
				considerReturnArg( fnPath, fnPath.node.body );
			}

			fnPath.traverse( {
				ReturnStatement( retPath ) {
					const owner = retPath.getFunctionParent();
					if ( ! owner || owner.node !== fnPath.node ) return; // ignore returns inside nested functions (e.g. .map())
					considerReturnArg( fnPath, retPath.node.argument );
				},
			} );
		},
	} );

	return conflict ? null : resolvedTitle;
}

function buildComponentPanelTitles( knownSharedComponents, cache ) {
	const map = new Map();
	for ( const [ name, filePath ] of knownSharedComponents ) {
		const title = resolveComponentPanelTitle( filePath, cache );
		if ( title ) map.set( name, title );
	}
	return map;
}

// ---------------------------------------------------------------------------
// FIX 3 — reset writes (`resetAll={...}` / `onDeselect={...}`) are NOT edit
// locations for panel-grouping purposes: they CLEAR an attribute when a
// ToolsPanel/ToolsPanelItem group is deselected, they don't offer a client a
// second place to SET it. Scoped narrowly to those two prop names — a
// genuine `onChange={...}` (or any other prop) is untouched.
// ---------------------------------------------------------------------------

const RESET_PROP_NAMES = new Set( [ 'resetAll', 'onDeselect' ] );

function isResetWrite( callNodePath ) {
	const attrPath = callNodePath.findParent( ( p ) => p.isJSXAttribute() );
	if ( ! attrPath ) return false;
	const attrName = attrPath.node.name && attrPath.node.name.name;
	return RESET_PROP_NAMES.has( attrName );
}

// ---------------------------------------------------------------------------
// Per-block extraction
// ---------------------------------------------------------------------------
//
// Returns:
//   {
//     ok, reason,
//     writes: [ { bucket:[...panel path...], attrs:[...resolved names...] } ],
//     unresolved: [ { bucket, rawSource } ],
//     opaqueComponents: [ { bucket, component } ],   // Hard Case 3
//   }

const PANEL_TAGS = new Set( [ 'PanelBody', 'ToolsPanel' ] );
const PANEL_ITEM_TAGS = new Set( [ 'ToolsPanelItem' ] );

function extractFromAst( ast, opts ) {
	const { knownSharedComponents, componentPanelTitles = new Map() } = opts;
	const writes = [];
	const unresolved = [];
	const opaqueComponents = [];
	const bucketStack = []; // e.g. [ 'Settings', 'Split image' ] or [ 'Styles', 'Container / Entire Block', 'Split layout grid' ]
	const seenOpaque = new Set();

	traverse( ast, {
		JSXElement: {
			enter( nodePath ) {
				const opening = nodePath.node.openingElement;
				const name = jsxName( opening );
				if ( ! name ) return;

				if ( name === 'InspectorControls' ) {
					const group = jsxAttrStringValue( opening, 'group' );
					bucketStack.push( group === 'styles' ? 'Styles' : 'Settings' );
					nodePath.__pushedBucket = true;
					return;
				}
				if ( PANEL_TAGS.has( name ) ) {
					const title = jsxAttrStringValue( opening, 'label' ) || jsxAttrStringValue( opening, 'title' ) || '(untitled panel)';
					bucketStack.push( title );
					nodePath.__pushedBucket = true;
					return;
				}
				if ( PANEL_ITEM_TAGS.has( name ) ) {
					const label = jsxAttrStringValue( opening, 'label' ) || '(untitled item)';
					bucketStack.push( label );
					nodePath.__pushedBucket = true;
					return;
				}
				// FIX 1: a shared component whose OWN file resolves to a single
				// hardcoded panel title (SgsColourPanel -> "Colour",
				// ResponsiveBoxControls -> "Spacing & width (per device)", ...).
				// Treated exactly like a PanelBody/ToolsPanel: any setAttributes()
				// call lexically inside this JSX element (e.g. inline onChange
				// callbacks passed via a `rows` prop) is attributed to the
				// resolved title instead of the empty "" bucket. A component NOT
				// in this map (its title didn't resolve, or it isn't a known
				// shared component at all) is untouched by this branch.
				if ( componentPanelTitles.has( name ) ) {
					bucketStack.push( componentPanelTitles.get( name ) );
					nodePath.__pushedBucket = true;
					return;
				}
				// Hard Case 3: a known shared panel component mounted here — its own
				// controls (and the attributes they write) are NOT visible from this
				// file's AST. Record it as opaque, do not attempt to attribute-map it.
				if ( knownSharedComponents.has( name ) ) {
					const bucket = bucketStack.slice();
					const key = `${ bucket.join( ' > ' ) }|${ name }`;
					if ( ! seenOpaque.has( key ) ) {
						seenOpaque.add( key );
						opaqueComponents.push( { bucket, component: name } );
					}
				}
			},
			exit( nodePath ) {
				if ( nodePath.__pushedBucket ) bucketStack.pop();
			},
		},
		CallExpression( nodePath ) {
			const callee = nodePath.node.callee;
			if ( ! callee || callee.type !== 'Identifier' || callee.name !== 'setAttributes' ) return;
			const arg = nodePath.node.arguments[ 0 ];
			if ( ! arg || arg.type !== 'ObjectExpression' ) return;
			// FIX 3: a write lexically inside `resetAll={...}`/`onDeselect={...}`
			// CLEARS an attribute when a ToolsPanel/ToolsPanelItem is deselected —
			// it is not a second place a client can SET the value, so it is
			// excluded from panel-grouping entirely (never added to writes/
			// unresolved). A genuine `onChange={...}` write is untouched.
			if ( isResetWrite( nodePath ) ) return;

			const bucket = bucketStack.slice();
			const resolvedAttrs = [];
			for ( const prop of arg.properties ) {
				if ( prop.type === 'SpreadElement' ) {
					unresolved.push( { bucket, rawSource: '...spread' } );
					continue;
				}
				if ( prop.type !== 'ObjectProperty' ) continue;
				if ( ! prop.computed ) {
					const keyName = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
					if ( keyName ) resolvedAttrs.push( keyName );
					continue;
				}
				const resolved = resolveKeyNode( prop.key, nodePath.scope );
				if ( resolved ) {
					resolvedAttrs.push( ...resolved );
				} else {
					unresolved.push( { bucket, rawSource: `[computed key, unresolved]` } );
				}
			}
			if ( resolvedAttrs.length ) writes.push( { bucket, attrs: resolvedAttrs } );
		},
	} );

	return { ok: true, reason: null, writes, unresolved, opaqueComponents };
}

// ---------------------------------------------------------------------------
// Element-scatter grouping
// ---------------------------------------------------------------------------

function bucketKey( bucket ) {
	return bucket.join( ' > ' );
}

// FIX 2 — a ToolsPanel group heading ("Settings > Typography > Typography")
// and a ToolsPanelItem's own sub-label nested one level below it
// ("Settings > Typography > Typography > Font weight") are ONE physical
// panel, not two. Collapse any panel path that is a STRICT prefix extension
// of another panel path (for the SAME element) onto the shorter (parent)
// path, merging attrs. Two genuine siblings — neither path a prefix of the
// other, e.g. "Styles > Border" vs "Styles > Shadow" — are left distinct.
function isStrictPathPrefix( shorter, longer ) {
	// A zero-length (un-named/phantom) bucket is NOT a "prefix" of every other
	// panel — that would silently absorb a genuinely un-named finding into
	// whatever other panel happens to sit alongside it for the same element.
	// Only a REAL, non-empty panel-heading path can subsume a longer one.
	if ( shorter.length === 0 ) return false;
	if ( shorter.length >= longer.length ) return false;
	for ( let i = 0; i < shorter.length; i++ ) {
		if ( shorter[ i ] !== longer[ i ] ) return false;
	}
	return true;
}

function collapsePrefixPanels( bMap ) {
	const entries = Array.from( bMap.values() );
	const removed = new Set();
	for ( let i = 0; i < entries.length; i++ ) {
		for ( let j = 0; j < entries.length; j++ ) {
			if ( i === j || removed.has( j ) ) continue;
			if ( isStrictPathPrefix( entries[ i ].bucket, entries[ j ].bucket ) ) {
				for ( const attr of entries[ j ].attrs ) entries[ i ].attrs.add( attr );
				removed.add( j );
			}
		}
	}
	const collapsed = new Map();
	for ( let i = 0; i < entries.length; i++ ) {
		if ( removed.has( i ) ) continue;
		collapsed.set( bucketKey( entries[ i ].bucket ), entries[ i ] );
	}
	return collapsed;
}

// RULING 2 helpers — classify one PANEL's attrs (via their DB css_property) as
// homogeneously belonging to a single recognised cross-cutting family (border /
// motion-transform), or not. A panel that mixes a recognised-family attr with
// anything else does NOT count — only a panel that is PURELY one family is treated
// as "the architecture's own dedicated panel for that family" (SgsBorderControl's
// Border panel; a Hover panel containing only scaleHover).
function classifyPanelFamily( bucketEntry, cssPropByAttr ) {
	const attrs = Array.from( bucketEntry.attrs );
	if ( ! attrs.length ) return null;
	let allBorder = true;
	let allMotion = true;
	for ( const attr of attrs ) {
		const cssProperty = cssPropByAttr.get( attr );
		if ( ! cssProperty || ! BORDER_FAMILY_RE.test( cssProperty ) ) allBorder = false;
		if ( ! cssProperty || ! MOTION_TRANSFORM_FAMILY.has( cssProperty ) ) allMotion = false;
	}
	if ( allBorder ) return 'border';
	if ( allMotion ) return 'motion-transform';
	return null;
}

function isColourBucket( bucketEntry ) {
	return bucketKey( bucketEntry.bucket ) === 'Colour';
}

// A finding downranks to "info" ONLY when: (a) exactly one bucket is the Colour
// panel, (b) every OTHER bucket is homogeneously a recognised family (border or
// motion-transform) per classifyPanelFamily(), and (c) there is at least one such
// other bucket. A 3rd bucket that is neither Colour nor a recognised family (e.g.
// a bespoke "Settings > Width" maxWidth control) means the split is NOT purely
// "colour + architecture's own family panel" — real scatter remains, so severity
// is computed as before (unaffected by this ruling).
function isDesignedColourVsFamilySplit( buckets, cssPropByAttr ) {
	const colourBuckets = buckets.filter( isColourBucket );
	if ( colourBuckets.length !== 1 ) return false;
	const otherBuckets = buckets.filter( ( b ) => ! isColourBucket( b ) );
	if ( ! otherBuckets.length ) return false;
	return otherBuckets.every( ( b ) => classifyPanelFamily( b, cssPropByAttr ) !== null );
}

function computeScatter( writes, dbLookup, blockSlug ) {
	// element -> Map(bucketKey -> {bucket, attrs:Set})
	const byElement = new Map();
	// element -> Map(attr -> css_property), for RULING 2 family classification
	const cssPropByElement = new Map();
	let mappedCount = 0;
	let nullElementCount = 0;
	let notInDbCount = 0;
	let nonPaintableSkipped = 0; // RULING 1

	for ( const w of writes ) {
		for ( const attr of w.attrs ) {
			const dbKey = `${ blockSlug }|${ attr }`;
			if ( ! dbLookup.has( dbKey ) ) {
				notInDbCount++;
				continue;
			}
			const { cssElement: el, cssProperty } = dbLookup.get( dbKey );
			if ( el === null ) {
				nullElementCount++;
				continue;
			}
			// RULING 1 — a css_property of 'tag' names an HTML TAG, not a paintable
			// CSS property (e.g. sgs/product-card::headingLevel: role='tag-identity',
			// css_property='tag', css_element='title'). It is excluded from scatter
			// grouping entirely — never treated as a styling control of its element.
			if ( cssProperty !== null && NON_PAINTABLE_CSS_PROPERTIES.has( cssProperty ) ) {
				nonPaintableSkipped++;
				continue;
			}
			mappedCount++;
			if ( ! byElement.has( el ) ) byElement.set( el, new Map() );
			if ( ! cssPropByElement.has( el ) ) cssPropByElement.set( el, new Map() );
			const bMap = byElement.get( el );
			cssPropByElement.get( el ).set( attr, cssProperty );
			const bk = bucketKey( w.bucket );
			if ( ! bMap.has( bk ) ) bMap.set( bk, { bucket: w.bucket, attrs: new Set() } );
			bMap.get( bk ).attrs.add( attr );
		}
	}

	const scattered = [];
	for ( const [ el, rawBMap ] of byElement ) {
		const bMap = collapsePrefixPanels( rawBMap ); // FIX 2
		if ( bMap.size <= 1 ) continue;
		const buckets = Array.from( bMap.values() );
		const cssPropByAttr = cssPropByElement.get( el ) || new Map();
		let severity;
		if ( isDesignedColourVsFamilySplit( buckets, cssPropByAttr ) ) {
			// RULING 2 — Colour panel + the architecture's own dedicated family
			// panel(s) (Border / motion-transform-only Hover). By design, not scatter.
			severity = 'info';
		} else {
			const severityHigh = buckets.length >= 3 || buckets.some( ( b ) => /container|entire block/i.test( bucketKey( b.bucket ) ) );
			severity = severityHigh ? 'high' : 'warn';
		}
		scattered.push( {
			element: el,
			severity,
			panels: buckets.map( ( b ) => ( { bucket: b.bucket, attrs: Array.from( b.attrs ) } ) ),
		} );
	}
	const severityRank = { high: 0, warn: 1, info: 2 };
	scattered.sort( ( a, b ) => severityRank[ a.severity ] - severityRank[ b.severity ] );

	return { scattered, mappedCount, nullElementCount, notInDbCount, nonPaintableSkipped };
}

// ---------------------------------------------------------------------------
// Survey
// ---------------------------------------------------------------------------

function surveyBlock( slug, tail, cache, dbMap, knownSharedComponents, componentPanelTitles ) {
	const editFile = path.join( BLOCKS_DIR, tail, 'edit.js' );
	if ( ! fs.existsSync( editFile ) ) return null;
	const parsed = cache.parse( editFile );
	if ( ! parsed.ok ) return { slug, error: parsed.error };

	const extracted = extractFromAst( parsed.ast, { knownSharedComponents, componentPanelTitles } );
	const scatterResult = computeScatter( extracted.writes, dbMap, slug );

	return {
		slug,
		editFile,
		scattered: scatterResult.scattered,
		mappedCount: scatterResult.mappedCount,
		nullElementCount: scatterResult.nullElementCount,
		notInDbCount: scatterResult.notInDbCount,
		nonPaintableSkipped: scatterResult.nonPaintableSkipped,
		unresolvedCount: extracted.unresolved.length,
		unresolved: extracted.unresolved,
		opaqueComponents: extracted.opaqueComponents,
	};
}

function runSurvey( { onlyBlock, json } ) {
	const dbResult = loadCssElementMap();
	if ( ! dbResult.ok ) {
		console.error( `[scattered-element-controls] DB read failed: ${ dbResult.reason }` );
		process.exit( 1 );
	}

	const cache = new SourceCache();
	const roster = reconcile();
	const knownSharedComponents = resolveComponentFiles();
	const componentPanelTitles = buildComponentPanelTitles( knownSharedComponents, cache ); // FIX 1

	const entries = onlyBlock
		? roster.entries.filter( ( e ) => e.slug === onlyBlock || e.tail === onlyBlock.replace( 'sgs/', '' ) )
		: roster.entries.filter( ( e ) => e.onDisk );

	const results = [];
	for ( const entry of entries ) {
		const r = surveyBlock( entry.slug, entry.tail, cache, dbResult.map, knownSharedComponents, componentPanelTitles );
		if ( r ) results.push( r );
	}

	const blocksWithScatter = results.filter( ( r ) => r.scattered && r.scattered.length );
	const totalScatterFindings = blocksWithScatter.reduce( ( n, r ) => n + r.scattered.length, 0 );
	const severityCounts = { high: 0, warn: 0, info: 0 };
	for ( const r of blocksWithScatter ) {
		for ( const s of r.scattered ) severityCounts[ s.severity ]++;
	}

	if ( json ) {
		console.log(
			JSON.stringify(
				{
					dbTotalRows: dbResult.totalRows,
					dbNullCssElement: dbResult.nullCount,
					blocksScanned: results.length,
					blocksWithScatter: blocksWithScatter.length,
					totalScatterFindings,
					severityCounts,
					results,
				},
				null,
				2
			)
		);
		return { results, blocksWithScatter, totalScatterFindings, severityCounts };
	}

	console.log( `[scattered-element-controls] --survey` );
	console.log( `DB: ${ dbResult.totalRows } block_attributes rows (${ dbResult.nullCount } NULL css_element)` );
	console.log( `Blocks scanned: ${ results.length }` );
	console.log( '' );

	for ( const r of results ) {
		if ( r.error ) {
			console.log( `⚠ ${ r.slug }: PARSE ERROR (${ r.error })` );
			continue;
		}
		if ( ! r.scattered.length ) continue;
		console.log( `── ${ r.slug } ──` );
		for ( const s of r.scattered ) {
			console.log( `  [${ s.severity.toUpperCase() }] element="${ s.element }" scattered across ${ s.panels.length } panels:` );
			for ( const p of s.panels ) {
				console.log( `      - ${ bucketKey( p.bucket ) }  (${ p.attrs.join( ', ' ) })` );
			}
		}
		if ( r.unresolvedCount ) console.log( `  (${ r.unresolvedCount } dynamic-key setAttributes writes could not be statically resolved — not guessed at)` );
		if ( r.opaqueComponents.length ) {
			const names = Array.from( new Set( r.opaqueComponents.map( ( o ) => o.component ) ) ).join( ', ' );
			console.log( `  (mounts shared component(s) not analysed for attribute writes: ${ names })` );
		}
		console.log( '' );
	}

	console.log( `SUMMARY: ${ blocksWithScatter.length } / ${ results.length } blocks have ≥1 scattered element; ${ totalScatterFindings } scattered-element findings total.` );
	console.log( `  Severity split — HIGH: ${ severityCounts.high }  WARN: ${ severityCounts.warn }  INFO (by-design, RULING 2): ${ severityCounts.info }` );
	const nullSkipped = results.reduce( ( n, r ) => n + ( r.nullElementCount || 0 ), 0 );
	const notInDb = results.reduce( ( n, r ) => n + ( r.notInDbCount || 0 ), 0 );
	const nonPaintable = results.reduce( ( n, r ) => n + ( r.nonPaintableSkipped || 0 ), 0 );
	console.log( `(${ nullSkipped } control-attribute writes skipped for NULL css_element; ${ notInDb } writes resolved to a name not present in block_attributes at all; ${ nonPaintable } writes skipped for a non-paintable css_property [RULING 1, e.g. 'tag'] — all three excluded from grouping, never guessed at.)` );

	return { results, blocksWithScatter, totalScatterFindings, severityCounts };
}

// ---------------------------------------------------------------------------
// Self-test — synthetic positive (hero-shaped) and negative (cohesive) fixtures
// ---------------------------------------------------------------------------

const HERO_SHAPED_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { BackgroundPanel } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	const attrMap = { desktop: 'splitMediaWidth', tablet: 'splitMediaWidthTablet', mobile: 'splitMediaWidthMobile' };
	return (
		<>
			<InspectorControls>
				<PanelBody title="Split image">
					<RangeControl onChange={ ( val ) => setAttributes( { mediaAnimationDuration: val } ) } />
					<BackgroundPanel prefix="background" attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>
				<PanelBody title="Container / Entire Block">
					<ToolsPanel label="Split layout grid">
						<ToolsPanelItem label="Split layout grid">
							<RangeControl onChange={ ( obj ) => setAttributes( { splitContentOrder: obj } ) } />
						</ToolsPanelItem>
					</ToolsPanel>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title="Split image styling">
					<RangeControl onChange={ ( tier, next ) => setAttributes( { [ attrMap[ tier ] ]: next } ) } />
				</PanelBody>
			</InspectorControls>
		</>
	);
}
`;

const COHESIVE_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="WhatsApp Settings">
				<TextControl onChange={ ( val ) => setAttributes( { phoneNumber: val } ) } />
				<TextControl onChange={ ( val ) => setAttributes( { message: val } ) } />
				<TextControl onChange={ ( val ) => setAttributes( { buttonLabel: val } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
`;

// --- FIX 1 fixture: SgsColourPanel-shaped call site (no local wrapping
// panel) alongside a genuine unwrapped top-level control that is NOT a
// known shared component and must stay un-named. ---
const FIX1_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel } from '../../components';
import { RangeControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<SgsColourPanel
				rows={ [ { onChange: ( val ) => setAttributes( { textColour: val } ) } ] }
			/>
			<RangeControl onChange={ ( val ) => setAttributes( { looseAttr: val } ) } />
		</>
	);
}
`;

// --- FIX 3 fixture: a ToolsPanel `resetAll` + a nested ToolsPanelItem
// `onDeselect`, alongside a genuine `onChange` write in the same file. ---
const RESET_FIXTURE = `
import { InspectorControls } from '@wordpress/block-editor';
import { ToolsPanel, ToolsPanelItem, RangeControl } from '../../components/primitives';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<ToolsPanel label="Box shadow" resetAll={ () => setAttributes( { boxShadowColour: '' } ) }>
				<ToolsPanelItem label="Colour" onDeselect={ () => setAttributes( { anotherColour: '' } ) }>
					<RangeControl onChange={ ( val ) => setAttributes( { boxShadowSize: val } ) } />
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);
}
`;

// Self-test dbMap entries now carry { cssElement, cssProperty } (computeScatter's real
// DB-map shape, since RULING 1/2 need css_property alongside css_element). This helper
// keeps every fixture below terse: mk('split-media') === no css_property (unaffected by
// either ruling); mk('title', 'tag') / mk('wrapper', 'border-width') opt a fixture attr
// into a ruling's predicate.
function mk( cssElement, cssProperty = null ) {
	return { cssElement, cssProperty };
}

function parseFixtureSource( src ) {
	const babelParser = require( '@babel/parser' );
	return babelParser.parse( src, {
		sourceType: 'module',
		plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ],
	} );
}

function selfTest() {
	const assertions = [];
	function assert( cond, msg ) {
		assertions.push( { pass: !! cond, msg } );
	}

	const knownSharedComponents = new Map( [ [ 'BackgroundPanel', '/fake/BackgroundPanel.js' ] ] );

	// --- POSITIVE CONTROL: hero-shaped fixture MUST flag split-media as scattered ---
	{
		const ast = parseFixtureSource( HERO_SHAPED_FIXTURE );
		const extracted = extractFromAst( ast, { knownSharedComponents } );
		const dbMap = new Map( [
			[ 'sgs/hero-fixture|mediaAnimationDuration', mk( 'split-media' ) ],
			[ 'sgs/hero-fixture|splitContentOrder', mk( 'split-media' ) ],
			[ 'sgs/hero-fixture|splitMediaWidth', mk( 'split-media' ) ],
			[ 'sgs/hero-fixture|splitMediaWidthTablet', mk( 'split-media' ) ],
			[ 'sgs/hero-fixture|splitMediaWidthMobile', mk( 'split-media' ) ],
		] );
		const result = computeScatter( extracted.writes, dbMap, 'sgs/hero-fixture' );
		const splitMedia = result.scattered.find( ( s ) => s.element === 'split-media' );
		assert( splitMedia, 'POSITIVE CONTROL: hero-shaped fixture flags "split-media" as scattered' );
		assert( splitMedia && splitMedia.panels.length >= 3, `POSITIVE CONTROL: split-media spans >=3 panels (got ${ splitMedia ? splitMedia.panels.length : 0 })` );
		assert( splitMedia && splitMedia.severity === 'high', 'POSITIVE CONTROL: severity is "high" (3+ panels, one named "Container / Entire Block")' );
		assert(
			extracted.opaqueComponents.some( ( o ) => o.component === 'BackgroundPanel' ),
			'POSITIVE CONTROL: BackgroundPanel recorded as an opaque shared component, not guessed at'
		);
	}

	// --- NEGATIVE CONTROL: cohesive fixture MUST NOT flag anything ---
	{
		const ast = parseFixtureSource( COHESIVE_FIXTURE );
		const extracted = extractFromAst( ast, { knownSharedComponents } );
		const dbMap = new Map( [
			[ 'sgs/cohesive-fixture|phoneNumber', mk( 'root' ) ],
			[ 'sgs/cohesive-fixture|message', mk( 'root' ) ],
			[ 'sgs/cohesive-fixture|buttonLabel', mk( 'root' ) ],
		] );
		const result = computeScatter( extracted.writes, dbMap, 'sgs/cohesive-fixture' );
		assert( result.scattered.length === 0, `NEGATIVE CONTROL: cohesive fixture produces 0 scattered findings (got ${ result.scattered.length })` );
	}

	// --- NULL css_element must never be guessed into a group ---
	{
		const ast = parseFixtureSource( COHESIVE_FIXTURE );
		const extracted = extractFromAst( ast, { knownSharedComponents } );
		const dbMap = new Map( [
			[ 'sgs/null-fixture|phoneNumber', mk( null ) ],
			[ 'sgs/null-fixture|message', mk( null ) ],
			[ 'sgs/null-fixture|buttonLabel', mk( null ) ],
		] );
		const result = computeScatter( extracted.writes, dbMap, 'sgs/null-fixture' );
		assert( result.scattered.length === 0, 'NULL css_element: 0 scattered findings when every attr maps to NULL (never guessed)' );
		assert( result.nullElementCount === 3, `NULL css_element: 3 writes correctly counted as null-skipped (got ${ result.nullElementCount })` );
	}

	// --- FIX 1: resolveComponentPanelTitle() against the REAL source files ---
	{
		const realCache = new SourceCache();
		const colourPanelFile = path.join( PLUGIN_ROOT, 'src', 'components', 'SgsColourPanel.js' );
		const t1 = resolveComponentPanelTitle( colourPanelFile, realCache );
		assert( t1 === 'Colour', `FIX1: resolveComponentPanelTitle resolves the REAL SgsColourPanel.js to "Colour" (got ${ JSON.stringify( t1 ) })` );

		const boxControlsFile = path.join( PLUGIN_ROOT, 'src', 'components', 'ResponsiveBoxControls.js' );
		const t2 = resolveComponentPanelTitle( boxControlsFile, realCache );
		assert(
			t2 === 'Spacing & width (per device)',
			`FIX1: resolveComponentPanelTitle resolves the REAL ResponsiveBoxControls.js (got ${ JSON.stringify( t2 ) })`
		);

		// NEGATIVE CONTROL: MediaSizingPanel returns several bare ToolsPanelItems
		// with no wrapping panel of its own — must refuse (null), never guessed.
		const mediaSizingFile = path.join( PLUGIN_ROOT, 'src', 'components', 'MediaSizingPanel.js' );
		const t3 = resolveComponentPanelTitle( mediaSizingFile, realCache );
		assert( t3 === null, `FIX1 NEGATIVE CONTROL: MediaSizingPanel (no single wrapping panel) resolves to null (got ${ JSON.stringify( t3 ) })` );
	}

	// --- FIX 1: grouping/consumption side — the resolved title is applied at
	// grouping time, and an unrelated non-component write is left un-named. ---
	{
		const ast = parseFixtureSource( FIX1_FIXTURE );
		const componentPanelTitles = new Map( [ [ 'SgsColourPanel', 'Colour' ] ] );
		const fix1KnownShared = new Map( [ [ 'SgsColourPanel', '/fake/SgsColourPanel.js' ] ] );
		const extracted = extractFromAst( ast, { knownSharedComponents: fix1KnownShared, componentPanelTitles } );

		const colourWrite = extracted.writes.find( ( w ) => w.attrs.includes( 'textColour' ) );
		assert( colourWrite, 'FIX1 POSITIVE CONTROL: SgsColourPanel-mounted write is captured' );
		assert(
			colourWrite && bucketKey( colourWrite.bucket ) === 'Colour',
			`FIX1 POSITIVE CONTROL: bucket resolves to "Colour", not the empty phantom panel (got ${ colourWrite ? JSON.stringify( bucketKey( colourWrite.bucket ) ) : 'none' })`
		);

		const looseWrite = extracted.writes.find( ( w ) => w.attrs.includes( 'looseAttr' ) );
		assert( looseWrite, 'FIX1 NEGATIVE CONTROL: unrelated top-level write (not a known component) is still captured' );
		assert(
			looseWrite && bucketKey( looseWrite.bucket ) === '',
			`FIX1 NEGATIVE CONTROL: a control genuinely at top level, NOT wrapped, NOT a known component, stays un-named (got ${ looseWrite ? JSON.stringify( bucketKey( looseWrite.bucket ) ) : 'none' })`
		);
	}

	// --- FIX 2: prefix-path panel collapse (ToolsPanel heading + its own
	// ToolsPanelItem sub-label = ONE physical panel) ---
	{
		const writes = [
			{ bucket: [ 'Settings', 'Typography', 'Typography' ], attrs: [ 'fontStyle' ] },
			{ bucket: [ 'Settings', 'Typography', 'Typography', 'Font weight' ], attrs: [ 'fontWeight' ] },
			{ bucket: [ 'Styles', 'Colour' ], attrs: [ 'colour' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/fix2-fixture|fontStyle', mk( 'heading' ) ],
			[ 'sgs/fix2-fixture|fontWeight', mk( 'heading' ) ],
			[ 'sgs/fix2-fixture|colour', mk( 'heading' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/fix2-fixture' );
		const heading = result.scattered.find( ( s ) => s.element === 'heading' );
		assert( heading, 'FIX2 POSITIVE CONTROL: heading still scattered (2 real panels survive collapse: Typography-group + Colour)' );
		assert(
			heading && heading.panels.length === 2,
			`FIX2 POSITIVE CONTROL: the prefix-collapsed ToolsPanel+ToolsPanelItem pair counts as ONE panel, total=2 (got ${ heading ? heading.panels.length : 0 })`
		);
		const typographyPanel = heading && heading.panels.find( ( p ) => bucketKey( p.bucket ) === 'Settings > Typography > Typography' );
		assert(
			typographyPanel && typographyPanel.attrs.includes( 'fontStyle' ) && typographyPanel.attrs.includes( 'fontWeight' ),
			'FIX2 POSITIVE CONTROL: the collapsed panel keeps BOTH attrs (fontWeight merged up onto its parent path)'
		);
	}

	// --- FIX 2 NEGATIVE CONTROL: genuine siblings (neither path a prefix of
	// the other) must NOT collapse ---
	{
		const writes = [
			{ bucket: [ 'Styles', 'Border' ], attrs: [ 'borderColour' ] },
			{ bucket: [ 'Styles', 'Shadow' ], attrs: [ 'shadowColour' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/fix2-neg|borderColour', mk( 'card', 'border-color' ) ],
			[ 'sgs/fix2-neg|shadowColour', mk( 'card', 'box-shadow-color' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/fix2-neg' );
		const card = result.scattered.find( ( s ) => s.element === 'card' );
		assert(
			card && card.panels.length === 2,
			`FIX2 NEGATIVE CONTROL: sibling panels "Styles > Border" / "Styles > Shadow" stay distinct (got ${ card ? card.panels.length : 0 })`
		);
	}

	// --- FIX 2 REGRESSION CONTROL: an un-named ("") bucket must NEVER be
	// treated as a "prefix" of an unrelated real panel and absorbed into it —
	// caught for real during this build (sgs/nav-menu [bar] -> featuredItemIds
	// silently vanished because isStrictPathPrefix([], anything) was true). ---
	{
		const writes = [
			{ bucket: [], attrs: [ 'featuredItemIds' ] },
			{ bucket: [ 'Styles', 'Bar' ], attrs: [ 'gap' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/fix2-empty-guard|featuredItemIds', mk( 'bar' ) ],
			[ 'sgs/fix2-empty-guard|gap', mk( 'bar' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/fix2-empty-guard' );
		const bar = result.scattered.find( ( s ) => s.element === 'bar' );
		assert(
			bar && bar.panels.length === 2,
			`FIX2 REGRESSION CONTROL: an un-named "" bucket stays a DISTINCT panel, never absorbed as a "prefix" of an unrelated real panel (got ${ bar ? bar.panels.length : 0 })`
		);
	}

	// --- FIX 3: resetAll/onDeselect writes excluded; a genuine onChange write
	// in the SAME file still counts (positive + negative control in one pass) ---
	{
		const ast = parseFixtureSource( RESET_FIXTURE );
		const extracted = extractFromAst( ast, { knownSharedComponents: new Map() } );

		const resetAllWrite = extracted.writes.some( ( w ) => w.attrs.includes( 'boxShadowColour' ) );
		assert( ! resetAllWrite, 'FIX3 POSITIVE CONTROL: a resetAll={...} write (boxShadowColour) is excluded from writes entirely' );

		const onDeselectWrite = extracted.writes.some( ( w ) => w.attrs.includes( 'anotherColour' ) );
		assert( ! onDeselectWrite, 'FIX3 POSITIVE CONTROL: an onDeselect={...} write (anotherColour) is excluded from writes entirely' );

		const onChangeWrite = extracted.writes.find( ( w ) => w.attrs.includes( 'boxShadowSize' ) );
		assert( onChangeWrite, 'FIX3 NEGATIVE CONTROL: a genuine onChange={...} write in the same file (boxShadowSize) still counts' );
	}

	// --- RULING 1 (2026-08-30) POSITIVE CONTROL: a css_property='tag' attribute
	// (e.g. product-card::headingLevel) alongside a colour attr on the SAME element
	// must be EXCLUDED from grouping — the element must NOT be flagged as scattered
	// when the "tag" attr is the only other write. This is the exact bogus-finding
	// shape (card-grid[title] / pricing-table[title] / process-steps[title] /
	// team-member[name]) the ruling exists to remove. ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'titleColour' ] },
			{ bucket: [ 'Settings', 'Card Settings' ], attrs: [ 'headingLevel' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling1-fixture|titleColour', mk( 'title', 'color' ) ],
			[ 'sgs/ruling1-fixture|headingLevel', mk( 'title', 'tag' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling1-fixture' );
		assert(
			result.scattered.length === 0,
			`RULING1 POSITIVE CONTROL: a css_property='tag' attr (headingLevel) is excluded, so title is NOT flagged as scattered (got ${ result.scattered.length } findings)`
		);
		assert( result.nonPaintableSkipped === 1, `RULING1 POSITIVE CONTROL: 1 write correctly counted as non-paintable-skipped (got ${ result.nonPaintableSkipped })` );
	}

	// --- RULING 1 NEGATIVE CONTROL (required by the brief): a GENUINE paintable
	// attribute on the same element must STILL be grouped and still flag, even
	// alongside an excluded 'tag' attr — the exclusion must not swallow real scatter. ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'titleColour' ] },
			{ bucket: [ 'Settings', 'Card Settings' ], attrs: [ 'headingLevel' ] },
			{ bucket: [ 'Settings', 'Border' ], attrs: [ 'borderWidth' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling1-neg|titleColour', mk( 'title', 'color' ) ],
			[ 'sgs/ruling1-neg|headingLevel', mk( 'title', 'tag' ) ],
			[ 'sgs/ruling1-neg|borderWidth', mk( 'title', 'border-width' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling1-neg' );
		const title = result.scattered.find( ( s ) => s.element === 'title' );
		assert( title, 'RULING1 NEGATIVE CONTROL: a genuine paintable attr (borderWidth) alongside an excluded "tag" attr still flags "title" as scattered' );
		assert(
			title && title.panels.length === 2,
			`RULING1 NEGATIVE CONTROL: exactly the 2 real panels (Colour + Border) survive, the excluded tag write contributes no 3rd panel (got ${ title ? title.panels.length : 0 })`
		);
		assert(
			title && ! title.panels.some( ( p ) => p.attrs.includes( 'headingLevel' ) ),
			'RULING1 NEGATIVE CONTROL: headingLevel never appears inside any surviving panel\'s attrs'
		);
	}

	// --- RULING 2 (2026-08-30) POSITIVE CONTROL A: Colour + a Border panel whose
	// attrs are ALL border-family (accordion-item[wrapper] shape) downranks to "info". ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'textColour' ] },
			{ bucket: [ 'Settings', 'Border' ], attrs: [ 'borderWidth', 'borderStyle', 'borderColour', 'borderRadius' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling2a-fixture|textColour', mk( 'wrapper', 'color' ) ],
			[ 'sgs/ruling2a-fixture|borderWidth', mk( 'wrapper', 'border-width' ) ],
			[ 'sgs/ruling2a-fixture|borderStyle', mk( 'wrapper', 'border-style' ) ],
			[ 'sgs/ruling2a-fixture|borderColour', mk( 'wrapper', 'border-color' ) ],
			[ 'sgs/ruling2a-fixture|borderRadius', mk( 'wrapper', 'border-radius' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling2a-fixture' );
		const wrapper = result.scattered.find( ( s ) => s.element === 'wrapper' );
		assert( wrapper, 'RULING2A POSITIVE CONTROL: Colour+Border split still recorded as a finding (down-ranked, not deleted)' );
		assert( wrapper && wrapper.severity === 'info', `RULING2A POSITIVE CONTROL: Colour + all-border-family panel down-ranks to "info" (got ${ wrapper ? wrapper.severity : 'none' })` );
	}

	// --- RULING 2 POSITIVE CONTROL D: Colour + a Hover panel containing ONLY a
	// transform attr (icon[wrapper]/post-grid[card] shape) downranks to "info". ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'iconColour' ] },
			{ bucket: [ 'Settings', 'Hover effects' ], attrs: [ 'scaleHover' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling2d-fixture|iconColour', mk( 'wrapper', 'color' ) ],
			[ 'sgs/ruling2d-fixture|scaleHover', mk( 'wrapper', 'transform' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling2d-fixture' );
		const wrapper = result.scattered.find( ( s ) => s.element === 'wrapper' );
		assert( wrapper && wrapper.severity === 'info', `RULING2D POSITIVE CONTROL: Colour + transform-only Hover panel down-ranks to "info" (got ${ wrapper ? wrapper.severity : 'none' })` );
	}

	// --- RULING 2 NEGATIVE CONTROL (required — the "must still flag" group):
	// Colour + a panel whose attrs are NEITHER all-border NOR all-transform (the
	// sgs/form[focus-ring] shape: border-color colour paired with outline-width /
	// box-shadow-color / outline-offset in "Focus State") must STAY warn/high. ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'formFocusRingColour' ] },
			{ bucket: [ 'Settings', 'Focus State' ], attrs: [ 'formFocusRingWidth', 'formFocusRingOpacity', 'formFocusRingOffset' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling2neg-fixture|formFocusRingColour', mk( 'focus-ring', 'border-color' ) ],
			[ 'sgs/ruling2neg-fixture|formFocusRingWidth', mk( 'focus-ring', 'outline-width' ) ],
			[ 'sgs/ruling2neg-fixture|formFocusRingOpacity', mk( 'focus-ring', 'box-shadow-color' ) ],
			[ 'sgs/ruling2neg-fixture|formFocusRingOffset', mk( 'focus-ring', 'outline-offset' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling2neg-fixture' );
		const focusRing = result.scattered.find( ( s ) => s.element === 'focus-ring' );
		assert(
			focusRing && focusRing.severity === 'warn',
			`RULING2 NEGATIVE CONTROL: formFocusRingColour is css_property='border-color' (not a homogeneous border-family PANEL — the sibling panel mixes outline-width/box-shadow-color/outline-offset), so this stays "warn", never down-ranked (got ${ focusRing ? focusRing.severity : 'none' })`
		);
	}

	// --- RULING 2 REGRESSION CONTROL: a 3rd bucket that is neither Colour nor a
	// recognised family (e.g. a bespoke "Width" panel, the team-member[wrapper]
	// shape) means the split is NOT purely "colour + architecture's own panel" —
	// severity computes as before (unaffected by this ruling), never silently
	// downranked just because ONE of the panels happens to be all-border. ---
	{
		const writes = [
			{ bucket: [ 'Colour' ], attrs: [ 'cardShadowColour' ] },
			{ bucket: [ 'Settings', 'Width' ], attrs: [ 'maxWidth' ] },
			{ bucket: [ 'Settings', 'Border' ], attrs: [ 'borderWidth', 'borderColour' ] },
		];
		const dbMap = new Map( [
			[ 'sgs/ruling2reg-fixture|cardShadowColour', mk( 'wrapper', 'box-shadow-color' ) ],
			[ 'sgs/ruling2reg-fixture|maxWidth', mk( 'wrapper', 'max-width' ) ],
			[ 'sgs/ruling2reg-fixture|borderWidth', mk( 'wrapper', 'border-width' ) ],
			[ 'sgs/ruling2reg-fixture|borderColour', mk( 'wrapper', 'border-color' ) ],
		] );
		const result = computeScatter( writes, dbMap, 'sgs/ruling2reg-fixture' );
		const wrapper = result.scattered.find( ( s ) => s.element === 'wrapper' );
		assert(
			wrapper && wrapper.severity === 'high',
			`RULING2 REGRESSION CONTROL: Colour + Width + Border (3 panels, Width is neither Colour nor a recognised family) stays "high" as before, NOT down-ranked (got ${ wrapper ? wrapper.severity : 'none' })`
		);
	}

	const failed = assertions.filter( ( a ) => ! a.pass );
	for ( const a of assertions ) console.log( `  ${ a.pass ? 'PASS' : 'FAIL' } — ${ a.msg }` );
	console.log( `\n${ assertions.length - failed.length }/${ assertions.length } assertions passed.` );
	if ( failed.length ) process.exit( 1 );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice( 2 );
if ( argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( argv.includes( '--survey' ) ) {
	const blockIdx = argv.indexOf( '--block' );
	const onlyBlock = blockIdx !== -1 ? argv[ blockIdx + 1 ] : null;
	runSurvey( { onlyBlock, json: argv.includes( '--json' ) } );
} else {
	console.log( 'Usage: node scattered-element-controls.js --survey [--block sgs/x] [--json] | --self-test' );
	process.exit( 1 );
}
