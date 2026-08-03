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

module.exports = { discover, COMPONENTS_INDEX, COMPONENTS_DIR };
