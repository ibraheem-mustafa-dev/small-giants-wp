'use strict';

// GROUND-TRUTH: spec=.claude/reports/2026-08-03-spec35-scanner/02-scanner-architecture.md §4.5
// source=file evidence=live-read plugins/sgs-blocks/src/components/index.js on
// 2026-08-03 — confirms the `export { default as Name } from './Name'` /
// `export { Name } from './Name'` shapes this minimal parser targets.
//
// REVISED 2026-08-03 after coordinator review of rule 01 demanded the same
// scrutiny be applied to rules 18/20. Cross-checking rule 18's population (12)
// against an independent measurement confirmed the COUNT, but a further check
// — "could this rule miss a block whose <img> lives in a shared component
// rather than its own edit.js text?" — found a REAL gap: `MediaPicker.js`
// (which genuinely renders `<img>`, confirmed at :125) is imported by 9
// blocks via a DIRECT path import (`import MediaPicker from
// '../../components/MediaPicker'`), NOT through the index.js barrel — so the
// original discover(), which only parsed index.js, never saw it, and two of
// those 9 blocks (brand-strip, team-member) have ZERO literal `<img>` of
// their own and were invisible to rule 18 entirely.
//
// Fix: discover() now scans EVERY .js file directly in src/components/ (not
// only the ones index.js re-exports), keyed by filename. `exported: true` is
// still recorded for barrel-exported ones (useful metadata), but a
// non-exported, directly-imported component like MediaPicker is now resolved
// exactly the same way. This is still "resolve from source", just widened
// to the whole components directory instead of only the barrel's re-export
// list — the task's ban on import-path STRING MATCHING is respected: a
// block is credited with using MediaPicker because its JSX contains
// `<MediaPicker`, cross-referenced against a component whose OWN source was
// read and found to render `<img>` — never because of the import path text.

const fs = require( 'fs' );
const path = require( 'path' );

const COMPONENTS_DIR = path.resolve( __dirname, '..', '..', '..', 'src', 'components' );
const COMPONENTS_INDEX = path.join( COMPONENTS_DIR, 'index.js' );

const EXPORT_RE = /export\s*\{([^}]*)\}\s*from\s*['"](\.\/[^'"]+)['"]/g;

// GROUND-TRUTH (added 2026-08-03, in response to coordinator review of rule 01):
// source=file evidence=live-read plugins/sgs-blocks/src/components/SgsLinkControl.js
// on 2026-08-03 — the string "PanelBody" appears ONLY inside a doc comment
// ("Inspector `PanelBody`, not a Popover…"); grep for `<PanelBody` (an actual
// JSX open tag) returns 0 hits. A naive raw-text substring check would have
// wrongly classified SgsLinkControl as panel-wrapping — the SAME
// comment-stripping trap rule 18 hit on its own negative-control fixture.
// This is why every derived fact below is computed on cache.strippedText(),
// never cache.text().
const PANEL_OPEN_TAG_RE = /<(PanelBody|ToolsPanel)\b/; // \b excludes ToolsPanelItem
const IMG_OPEN_TAG_RE = /<img\b/;

// GROUND-TRUTH (added 2026-09-03, fixing a rule-01 false positive on
// sgs/mega-aside): a shared component can itself render
// `<InspectorControls group="...">` internally — e.g. SgsColourPanel renders
// `<InspectorControls group="styles"><PanelBody>...`. A block that mounts
// such a component IS routed (the group prop lives in the shared component's
// own source), but rule 01's per-block regex only scans the BLOCK's own
// edit.js text and can never see it there. `selfRoutesGroup` records the
// literal group name a component's OWN source routes to (or `null`), same
// evidence source (cache.strippedText()) and same one-directive-per-file
// simplicity as `wrapsPanel`/`wrapsImage` above.
const SELF_GROUP_RE = /<InspectorControls\b[^>]*\bgroup\s*=\s*\{?["']([a-zA-Z-]+)["']/;

function barrelExportedNames( cache ) {
	if ( ! fs.existsSync( COMPONENTS_INDEX ) ) return {};
	const raw = cache ? cache.text( COMPONENTS_INDEX ) : fs.readFileSync( COMPONENTS_INDEX, 'utf8' );
	if ( raw == null ) return {};

	const nameToRel = {};
	let m;
	EXPORT_RE.lastIndex = 0;
	while ( ( m = EXPORT_RE.exec( raw ) ) ) {
		const names = m[ 1 ]
			.split( ',' )
			.map( ( s ) => s.trim() )
			.filter( Boolean );
		const rel = m[ 2 ];
		for ( const n of names ) {
			const asMatch = n.match( /^default\s+as\s+(\w+)$/ ) || n.match( /^(\w+)$/ );
			if ( ! asMatch ) continue;
			nameToRel[ asMatch[ 1 ] ] = rel;
		}
	}
	return nameToRel;
}

/**
 * Discovers EVERY shared component file in src/components/ (not only the
 * ones re-exported by index.js), and — for each — resolves its own source to
 * determine whether it renders a PanelBody/ToolsPanel (`wrapsPanel`) or an
 * `<img>` (`wrapsImage`). `exported` records whether index.js re-exports it
 * (informational).
 *
 * Returns { ok, exportsMap: { ComponentName: { source, exported, wrapsPanel, wrapsImage } } }.
 */
function discover( cache ) {
	if ( ! fs.existsSync( COMPONENTS_DIR ) ) {
		return { ok: false, reason: `src/components/ not found at ${ COMPONENTS_DIR }`, exportsMap: {} };
	}

	const exportedNames = barrelExportedNames( cache ); // { Name: './RelPath' }
	const exportedByRel = new Set( Object.values( exportedNames ) );

	const files = fs
		.readdirSync( COMPONENTS_DIR )
		.filter( ( f ) => f.endsWith( '.js' ) && f !== 'index.js' );

	const exportsMap = {};
	for ( const file of files ) {
		const name = path.basename( file, '.js' );
		const rel = `./${ name }`;
		const fullPath = path.join( COMPONENTS_DIR, file );
		let wrapsPanel = false;
		let wrapsImage = false;
		let selfRoutesGroup = null;
		if ( cache ) {
			const stripped = cache.strippedText( fullPath );
			if ( stripped ) {
				wrapsPanel = PANEL_OPEN_TAG_RE.test( stripped );
				wrapsImage = IMG_OPEN_TAG_RE.test( stripped );
				const groupMatch = SELF_GROUP_RE.exec( stripped );
				selfRoutesGroup = groupMatch ? groupMatch[ 1 ] : null;
			}
		}
		exportsMap[ name ] = {
			source: rel,
			exported: exportedByRel.has( rel ),
			wrapsPanel,
			wrapsImage,
			selfRoutesGroup,
		};
	}

	return { ok: true, reason: null, exportsMap };
}

// ---------------------------------------------------------------------------
// resolveComponentFiles() — the SHARED name -> file resolver (C0, 2026-08-19).
// ---------------------------------------------------------------------------
//
// WHY THIS EXISTS, AND WHY IT IS NOT discover().
//
// discover() answers "what does each file in src/components/ RENDER?"
// (wrapsPanel/wrapsImage) and is keyed by FILENAME. Rules 01 and 18 consume it
// and carry committed backlogs. Widening ITS corpus would silently restage both
// populations — rule 21's own header (:274) rejected exactly that, and it was
// right. So discover() is deliberately left untouched here and this is a
// SEPARATE, opt-in map. Rules 01 and 18 must not move by one finding.
//
// This function is a PROMOTION of the resolver rule 21 had built privately
// (21-render-without-control.js allControlComponentFiles()). It is moved here
// rather than copied so the tree has ONE component-resolution mechanism, not
// two that can disagree with no way to arbitrate.
//
// ⛔ THE BUG THIS FIXES, measured 2026-08-19.
// Rule 21's version indexed every exported name + filename, then took
// FIRST-WINS in readdir (alphabetical) order. On 2026-08-17 the wrapper panel
// monolith was split into one file per panel, leaving
// `ContainerWrapperControls.js` a 268-line facade that RE-EXPORTS all six
// panels. It sorts before `LayoutPanel.js`/`WidthPanel.js`/`WrapperColourPanel.js`,
// so it claimed their names — while the attribute vocabulary those names carry
// had MOVED OUT of it. Measured in the facade vs LayoutPanel.js: `gapTablet`
// 0 vs 2, `flexDirection` 0 vs 2, `gridTemplateRows` 0 vs 6, `justifyItems`
// 0 vs 3. Rule 21 therefore resolved `<LayoutPanel` to a file containing none
// of the controls it was asking about and reported the attributes as
// uncontrolled. A false POSITIVE is a detector bug, never baseline fodder.
//
// The fix is precedence, not ordering: a file that DECLARES a name beats a file
// that merely RE-EXPORTS it, regardless of readdir order. Ties fall back to
// first-wins as before.

const REAL_SRC = path.resolve( __dirname, '..', '..', '..', 'src' );

// `export function X` / `export const X` / `export default function X` — the
// file that actually defines the component.
const DECL_EXPORT_RE = /export\s+(?:default\s+)?(?:function|const|let|class)\s+([A-Z]\w*)/g;
// A local declaration that may be exported further down via an export list.
const LOCAL_DECL_RE = /(?:^|\n)\s*(?:function|const|let|class)\s+([A-Z]\w*)/g;
// Any `export { A, B as C }` list, with or without a `from` clause.
const EXPORT_LIST_RE = /export\s*\{([^}]*)\}/g;
// Names this file IMPORTS — an imported name re-exported here is NOT its home.
const IMPORT_NAMED_RE = /import\s*\{([^}]*)\}\s*from/g;
const IMPORT_DEFAULT_RE = /import\s+([A-Z]\w*)\s+from/g;

function collect( re, src, sink, group ) {
	re.lastIndex = 0;
	let m;
	while ( ( m = re.exec( src ) ) ) {
		const raw = m[ group || 1 ];
		if ( undefined === raw ) continue;
		if ( re === EXPORT_LIST_RE || re === IMPORT_NAMED_RE ) {
			for ( const part of raw.split( ',' ) ) {
				const n = part.trim().split( /\s+as\s+/ ).pop().trim();
				if ( /^[A-Z]\w*$/.test( n ) ) sink.add( n );
			}
		} else {
			sink.add( raw );
		}
	}
}

/**
 * Resolve every shared control component to the file that DEFINES it.
 *
 * Corpus: src/components/ (framework-wide), src/blocks/<block>/components/
 * (block-local shared panels) and src/blocks/extensions/ (the extension
 * surface, reachable via ctx.extensionsDir but until now read by no rule).
 *
 * Membership is decided by reading each file's OWN SOURCE — never by matching
 * an import-path string. A caller credits a block with a component because the
 * block's JSX contains `<ComponentName`, cross-referenced against this map.
 *
 * @param {string[]} [extraDirs] Additional absolute directories to index.
 * @return {Map<string,string>} component name -> absolute file path.
 */
function resolveComponentFiles( extraDirs ) {
	const strong = new Map(); // declared here — authoritative
	const weak = new Map(); // re-exported or filename-only — fallback

	const addDir = ( dir ) => {
		if ( ! fs.existsSync( dir ) ) return;
		for ( const f of fs.readdirSync( dir ) ) {
			if ( ! f.endsWith( '.js' ) || 'index.js' === f ) continue;
			const full = path.join( dir, f );
			let src = '';
			try {
				src = fs.readFileSync( full, 'utf8' );
			} catch ( e ) {
				src = '';
			}

			const imported = new Set();
			collect( IMPORT_NAMED_RE, src, imported );
			collect( IMPORT_DEFAULT_RE, src, imported );

			const declared = new Set();
			collect( DECL_EXPORT_RE, src, declared );
			collect( LOCAL_DECL_RE, src, declared );

			const listed = new Set();
			collect( EXPORT_LIST_RE, src, listed );

			// STRONG: declared in this file and not merely an imported binding.
			for ( const n of declared ) {
				if ( imported.has( n ) ) continue;
				if ( ! strong.has( n ) ) strong.set( n, full );
			}
			// WEAK: the filename itself, plus any name this file only re-exports.
			const base = path.basename( f, '.js' );
			if ( /^[A-Z]\w*$/.test( base ) && ! weak.has( base ) ) weak.set( base, full );
			for ( const n of listed ) {
				if ( declared.has( n ) && ! imported.has( n ) ) continue;
				if ( ! weak.has( n ) ) weak.set( n, full );
			}
		}
	};

	addDir( path.join( REAL_SRC, 'components' ) );
	const blocksRoot = path.join( REAL_SRC, 'blocks' );
	if ( fs.existsSync( blocksRoot ) ) {
		for ( const b of fs.readdirSync( blocksRoot ) ) {
			addDir( path.join( blocksRoot, b, 'components' ) );
		}
	}
	addDir( path.join( REAL_SRC, 'blocks', 'extensions' ) );
	for ( const d of extraDirs || [] ) addDir( d );

	// Declaration wins; re-export/filename only fills a name nothing declared.
	const map = new Map( weak );
	for ( const [ n, full ] of strong ) map.set( n, full );
	return map;
}


// ---------------------------------------------------------------------------
// One-hop block -> shared-component ownership (extracted from rule 31, 2026-08-24)
// ---------------------------------------------------------------------------
//
// A block that reaches a component THROUGH a shared panel is a real adopter of
// that component. Counting only direct `edit.js` imports undercounts badly --
// measured on the colour surface, three counting methods disagreed by ~50%.
//
// Lives here rather than in a rule so there is exactly ONE implementation with
// two callers: inspector-scan rule 31, and the `components` adoption-ledger
// writer in sgs-update-v2.py Stage 1. `reachedComponents` is imported from
// ./golden; that direction is safe because golden.js requires only fs/path/babel
// and never requires this module, so no cycle is created.

const { reachedComponents } = require( './golden' );

function discoverBlockDirNames( ctx ) {
	if ( ! fs.existsSync( ctx.blocksDir ) ) return [];
	return fs.readdirSync( ctx.blocksDir ).filter( ( name ) => {
		const full = path.join( ctx.blocksDir, name );
		return fs.statSync( full ).isDirectory() && fs.existsSync( path.join( full, 'block.json' ) );
	} );
}

/**
 * Every shared-component file reached by ANY on-disk block, mapped to the
 * set of block slugs that reach it. Memoised on `ctx` itself (not module
 * state) so a fresh ctx — one real run.js invocation, or one self-test
 * fixture run — gets a correctly-scoped, independent computation; ctx is the
 * SAME object across every per-block call within one run, so this only runs
 * once per run.
 *
 * `resolveComponentFiles` is passed `[ ctx.componentsDir ]` as an extra
 * search directory — a no-op duplicate against the real tree in a live run
 * (ctx.componentsDir === the real src/components already scanned by
 * default), but load-bearing for self-test: buildTestCtx points
 * ctx.componentsDir at the fixture's own isolated `_components/` copy, so a
 * fixture can declare its own shared panel without depending on any real,
 * actively-edited framework file.
 */
function getSharedOwnerScan( ctx ) {
	if ( ctx.__rule31SharedOwnerScan ) return ctx.__rule31SharedOwnerScan;

	const compFiles = resolveComponentFiles( ctx.componentsDir ? [ ctx.componentsDir ] : [] );
	const ownerMountedBy = new Map(); // ownerFile -> Set(blockSlug)
	const parseFile = ( f ) => {
		const p = ctx.cache.parse( f );
		return p.ok ? p.ast : null;
	};

	for ( const name of discoverBlockDirNames( ctx ) ) {
		const entryEditFile = path.join( ctx.blocksDir, name, 'edit.js' );
		const parsed = ctx.cache.parse( entryEditFile );
		if ( ! parsed.ok ) continue;
		const reached = reachedComponents( parsed.ast, compFiles, parseFile );
		for ( const ownerFile of reached.values() ) {
			if ( ! ownerFile ) continue; // null = the block's own edit.js — already covered per-block
			if ( ! ownerMountedBy.has( ownerFile ) ) ownerMountedBy.set( ownerFile, new Set() );
			ownerMountedBy.get( ownerFile ).add( `sgs/${ name }` );
		}
	}

	const result = { ownerMountedBy };
	ctx.__rule31SharedOwnerScan = result;
	return result;
}

// ---------------------------------------------------------------------------
// Structural/behavioural-control resolution (rule 01, 2026-09-03) — "does this
// attribute have a CSS property behind it at all?"
// ---------------------------------------------------------------------------
//
// GROUND-TRUTH, measured live against sgs-framework.db before writing this:
// `block_attributes.css_property` is the Spec 31 declarative routing column,
// but it is NOT a complete "has CSS" census — 2045 of 3549 rows (58%) have a
// NULL css_property tree-wide, and that NULL population is a MIX of (a)
// genuinely structural/behavioural attrs (sgs/audio.playerStyle,
// sgs/post-grid.layout — real variant pickers with no CSS form) and (b) box-
// model attrs the DB routes through `box_family` instead of `css_property`
// (sgs/audio.paddingTablet/marginTablet — real CSS, css_property NULL,
// box_family:'padding'/'margin') and (c) other genuinely-CSS attrs (object/
// number-typed dimensions like sgs/container.columns, sgs/feature-grid.
// minItemWidth) that Spec 31's declarative routing simply hasn't reached yet.
// Trusting NULL alone would over-exempt (b) and (c) — measured: `role='layout'`
// alone mixes `sgs/container.layout` (genuinely structural) with
// `sgs/container.columns`/`contentWidth`/`minColumnWidth` (genuinely CSS,
// still NULL) in the SAME role bucket, so role cannot discriminate either.
//
// The predicate below only trusts NULL/pseudo css_property for a SCALAR
// selector/toggle shape (attr_type 'string' or 'boolean', never 'object'/
// 'number'), which is exactly the vocabulary the sibling rule's own FIX text
// already names (variant/tagName/layout/autoplay/showDots/required — verified
// live, every one of those is string-or-boolean with css_property AND
// box_family both null) and additionally excludes a dimension-UNIT companion
// (`fooUnit`) — a Unit attr's own row is usually unpopulated too, but it always
// pairs with a real CSS dimension and must never be treated as the reason a
// mixed panel is exempt.
const DB_CANDIDATES = [
	path.join( require( 'os' ).homedir(), '.agents', 'skills', 'sgs-wp-engine', 'sgs-framework.db' ),
	path.resolve( __dirname, '..', 'sgs-framework.db' ),
];

// Inline (not a new .py file — this module is the one file this task may add
// code to) — reads block_attributes with NO role filter, unlike
// export-colour-css-property.py's colour-only query, because a structural
// control can be any role (behaviour/layout/technical/enum-mode/...).
const STRUCTURAL_ATTR_MAP_PY = [
	'import sys, sqlite3, json, os',
	'paths = sys.argv[1:]',
	'db = None',
	'for p in paths:',
	'    if os.path.exists(p) and os.path.getsize(p) > 0:',
	'        db = p',
	'        break',
	'if db is None:',
	'    sys.exit(1)',
	'conn = sqlite3.connect(db)',
	'cur = conn.cursor()',
	'cur.execute("SELECT block_slug, attr_name, attr_type, css_property, box_family FROM block_attributes")',
	'out = {}',
	'for slug, attr, attr_type, css_property, box_family in cur.fetchall():',
	'    out.setdefault(slug, {})[attr] = {"attr_type": attr_type, "css_property": css_property, "box_family": box_family}',
	'conn.close()',
	'print(json.dumps(out))',
].join( '\n' );

/**
 * The DB's `{ block_slug: { attr_name: { attr_type, css_property, box_family } } }`
 * map for EVERY attribute (not role-filtered), shelled out to Python once per
 * ctx and memoised on it. Deliberately its OWN ctx field (`__tabGroupStructuralAttrMap`)
 * rather than reusing rule 31's `ctx.__colourCssPropertyMap` — that field's
 * shape (`{ slug: { attr: cssProperty|null } }`, a flat string) is a
 * DIFFERENT contract golden.js's `getColourCssPropertyMap` depends on; writing
 * a rich object into it would silently break rule 31's mechanism resolution
 * for every colour row in a real run (`ctx` is one shared object across all
 * rules — confirmed live in run.js `runAllRules(table, ctx)`). FAILS CLOSED
 * like its sibling: a DB the query can't reach throws rather than resolving
 * every attribute as "no CSS", which would look identical to "every panel is
 * legitimately exempt" — the exact false-clean this mechanism must avoid.
 */
function getStructuralAttrMap( ctx ) {
	if ( ctx.__tabGroupStructuralAttrMap ) return ctx.__tabGroupStructuralAttrMap;
	const { spawnSync } = require( 'child_process' );
	const result = spawnSync( 'python', [ '-c', STRUCTURAL_ATTR_MAP_PY, ...DB_CANDIDATES ], {
		encoding: 'utf8',
	} );
	if ( result.status !== 0 || ! result.stdout ) {
		throw new Error(
			'getStructuralAttrMap: sgs-framework.db read failed — refusing to silently treat every ' +
				`attribute as structural. stderr: ${ result.stderr || '(none)' }`
		);
	}
	const map = JSON.parse( result.stdout );
	ctx.__tabGroupStructuralAttrMap = map;
	return map;
}

/**
 * Does this ONE attribute's DB row show "no CSS property behind it at all" —
 * i.e. is it a genuine structural/behavioural control (variant picker,
 * tagName, autoplay toggle, ...) rather than a real CSS-styling control? See
 * the header note above `DB_CANDIDATES` for the full reasoning.
 *
 * @param {string} attrName
 * @param {{attr_type:?string, css_property:?string, box_family:?string}|undefined} row
 * @return {boolean}
 */
function isStructuralNoCssAttr( attrName, row ) {
	if ( ! row ) return false; // no DB row at all -> unknown, assume it MIGHT carry CSS (never over-exempt on absence)
	if ( row.box_family ) return false; // box-model attrs route CSS through box_family, not css_property (padding/margin/border)
	const cssProperty = row.css_property;
	if ( cssProperty ) {
		const tokens = String( cssProperty )
			.split( ',' )
			.map( ( t ) => t.trim() )
			.filter( Boolean );
		// A token with no ':' is a real CSS property name (kebab-case). A
		// colon-prefixed token (fx:pin, anim:stagger) is JS behavioural config,
		// never real CSS — falls through to the type-shape check below.
		if ( tokens.some( ( t ) => ! t.includes( ':' ) ) ) return false;
	}
	if ( 'string' !== row.attr_type && 'boolean' !== row.attr_type ) return false;
	if ( /Unit$/.test( attrName ) ) return false; // a dimension-unit companion always pairs with real CSS
	return true;
}

module.exports = {
	discover,
	resolveComponentFiles,
	discoverBlockDirNames,
	getSharedOwnerScan,
	getStructuralAttrMap,
	isStructuralNoCssAttr,
	COMPONENTS_INDEX,
	COMPONENTS_DIR,
	REAL_SRC,
};

// ---------------------------------------------------------------------------
// --dump-json — JSON entry point for Python consumers (R3-a, 2026-08-20).
// ---------------------------------------------------------------------------
//
// `check-inert-controls.py` and `check-undeclared-attrs.py` need the SAME
// name -> file resolution resolveComponentFiles() provides, but they run in
// a separate Python process with no access to this module's JS internals.
// Rather than reimplement the resolver in Python (a SECOND mechanism that
// can silently drift from this one — exactly what R-3's register warns
// against), those scripts spawn `node components.js --dump-json` and parse
// its stdout. Only invoked when this file is run directly (`require.main
// === module`), so it never fires as a side effect of the many JS scripts
// that `require()` this module for resolveComponentFiles() itself.
if ( require.main === module && process.argv.includes( '--dump-json' ) ) {
	const map = resolveComponentFiles();
	process.stdout.write( JSON.stringify( Object.fromEntries( map ) ) + '\n' );
}
