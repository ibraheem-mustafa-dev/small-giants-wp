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
		if ( cache ) {
			const stripped = cache.strippedText( fullPath );
			if ( stripped ) {
				wrapsPanel = PANEL_OPEN_TAG_RE.test( stripped );
				wrapsImage = IMG_OPEN_TAG_RE.test( stripped );
			}
		}
		exportsMap[ name ] = {
			source: rel,
			exported: exportedByRel.has( rel ),
			wrapsPanel,
			wrapsImage,
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

module.exports = {
	discover,
	resolveComponentFiles,
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
