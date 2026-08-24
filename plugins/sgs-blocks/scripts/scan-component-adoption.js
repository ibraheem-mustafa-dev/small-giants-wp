#!/usr/bin/env node
/**
 * scan-component-adoption.js — build the unification ADOPTION LEDGER.
 *
 * WHY THIS EXISTS
 * ---------------
 * Bean, 2026-08-24: the `components` table held 13 rows of editor JS with
 * placeholder descriptions and `props` all NULL — a file listing wearing the
 * name. It had ZERO readers and ZERO writers inside this repo; the rows came
 * from an out-of-repo populate-db.py, which is why the descriptions say nothing.
 *
 * Rebuilt as the registry of every shared helper and injector built for
 * unification, WITH ADOPTION COUNTS. The counts are what make it an audit
 * rather than a list: `borderRow.js` has 0 adopters while its two siblings have
 * 22 and 7, and `helpers-box.php` sat at 4 adopters until a codemod migrated
 * 121 definitions across 57 files. That backlog is visible nowhere else.
 *
 * FIVE FAMILIES, THREE DETECTION MECHANISMS
 * -----------------------------------------
 * A component is detected by HOW IT IS ACTUALLY REACHED, never by its name:
 *
 *   editor-component  JSX mount, resolved ONE HOP through shared panels via
 *                     core/components.getSharedOwnerScan — a block reaching a
 *                     control through a shared panel is a real adopter.
 *                     PLUS a call-expression pass, because the one-hop resolver
 *                     is structurally blind to two shapes (see BLIND SPOTS).
 *   util              named import from src/utils, then used.
 *   render-helper     PHP function call in a block's render.php.
 *   injector          `render_block` filter. Adoption is NOT opt-in — see RISK.
 *   wrapper           SGS_Container_Wrapper call in a block's render.php.
 *
 * ⚠ BLIND SPOTS OF THE ONE-HOP RESOLVER — why the call pass is not optional.
 * `reachedComponents` credits a block only when its JSX contains
 * `<ComponentName`, and `resolveComponentFiles` does a FLAT readdirSync that
 * never recurses. Both miss `src/components/colour-variants/fillRow.js`, which
 * is invoked as `fillRow( { … } )` from a subdirectory. Measured 2026-08-24 the
 * resolver reports fillRow/textRow/borderRow as 0-0-0 while
 * accordion-item/edit.js:13 demonstrably imports and calls fillRow. The call
 * pass measures them as 22 / 7 / 0. A zero from ONE mechanism is not evidence of
 * non-adoption; a zero from the mechanism the thing actually uses is.
 *
 * ⚠ INJECTORS ARE A DIFFERENT RISK CLASS AND `family` MUST MAKE THAT LEGIBLE.
 * A `render_block` filter mutates EVERY block's output whether the block opted
 * in or not; a helper is called deliberately. D405 records four injectors whose
 * inline writes were being SILENTLY STRIPPED — the gate passed while the
 * features were dead. Their `adopters` is therefore recorded as the number of
 * blocks AFFECTED, and `adopter_list` is the literal '*' rather than a roster,
 * so nobody reads an injector's count as opt-in uptake.
 *
 * Usage:  node plugins/sgs-blocks/scripts/scan-component-adoption.js [--json]
 * Consumed by sgs-update-v2.py Stage 1, which writes the `components` table.
 * UK English throughout.
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const SCRIPTS = __dirname;
const PLUGIN = path.resolve( SCRIPTS, '..' );
const SRC = path.join( PLUGIN, 'src' );
const INCLUDES = path.join( PLUGIN, 'includes' );
const BLOCKS = path.join( SRC, 'blocks' );
const REPO = path.resolve( PLUGIN, '..', '..' );

const SCAN = path.join( SCRIPTS, 'inspector-scan' );
const { SourceCache } = require( path.join( SCAN, 'core/sources' ) );
const { getSharedOwnerScan } = require( path.join( SCAN, 'core/components' ) );

const rel = ( p ) => path.relative( REPO, p ).split( path.sep ).join( '/' );

/** Block dirs = a directory under src/blocks with a block.json. Enumerated, never assumed. */
function blockDirs() {
	if ( ! fs.existsSync( BLOCKS ) ) return [];
	return fs.readdirSync( BLOCKS ).filter( ( n ) => {
		const full = path.join( BLOCKS, n );
		return fs.statSync( full ).isDirectory() && fs.existsSync( path.join( full, 'block.json' ) );
	} );
}

/**
 * Every shared surface under a dir. Recurses — deliberately unlike
 * resolveComponentFiles's flat scan, which is why that resolver cannot see
 * colour-variants/fillRow.js at all.
 *
 * ⚠ A SUBDIRECTORY CARRYING AN index.js IS ONE COMPONENT, NOT N. Its index is
 * the public surface and the rest are its private guts. Enumerating them put
 * vendored internals (circular-option-picker-option, color-input, control-points)
 * into the ledger as if they were shared surfaces, and produced TWO rows named
 * `constants`, which collide on `name TEXT PRIMARY KEY`. Checking the roster
 * member-by-member found this; the count alone looked fine.
 *
 * colour-variants/ has NO index.js, so its three files ARE separate helpers and
 * are still enumerated individually. The rule is the index, never the depth.
 */
function jsFilesRecursive( dir ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) return out;
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			const idx = path.join( full, 'index.js' );
			if ( fs.existsSync( idx ) ) out.push( idx );      // the directory IS the component
			else out.push( ...jsFilesRecursive( full ) );      // no index: separate helpers
			continue;
		}
		if ( entry.name.endsWith( '.js' ) && entry.name !== 'index.js' ) out.push( full );
	}
	return out;
}

/** A file whose basename is `index` is named for its DIRECTORY, not the file. */
function surfaceName( file ) {
	const base = path.basename( file, path.extname( file ) );
	return 'index' === base ? path.basename( path.dirname( file ) ) : base;
}

/**
 * One line of what a surface UNIFIES. Taken from the file's own leading
 * docblock — a DESCRIPTION, which is the one thing a docblock is authoritative
 * about. Every WIRING claim in this file is derived from code instead, because
 * headers in this tree are provably false about their own wiring.
 */
function functionalityOf( file ) {
	let src = '';
	try {
		src = fs.readFileSync( file, 'utf8' );
	} catch ( e ) {
		return '';
	}
	const base = path.basename( file, path.extname( file ) );
	const block = src.match( /\/\*\*([\s\S]*?)\*\// );
	if ( block ) {
		const lines = block[ 1 ]
			.split( '\n' )
			.map( ( l ) => l.replace( /^\s*\*ecko?\s?/, '' ).replace( /^\s*\*\s?/, '' ).trim() )
			.filter( ( l ) => l && ! l.startsWith( '@' ) );
		for ( const l of lines ) {
			const cleaned = l.replace( new RegExp( `^${ base }\\s*[—:-]\\s*`, 'i' ), '' ).trim();
			if ( cleaned.length > 12 ) return cleaned.replace( /\s+/g, ' ' ).slice( 0, 400 );
		}
	}
	const php = src.match( /^\s*\*\s*(.+)$/m );
	if ( php && php[ 1 ].trim().length > 12 ) return php[ 1 ].trim().slice( 0, 400 );
	return '';
}

/**
 * Strip JS comments before matching. A comment MENTIONING a component is not a
 * use of it — measured: all 8 files "referencing" SgsLinkControl do so in prose.
 * Counting those would have manufactured 8 adopters for a component mounted
 * nowhere, the same shape as a `grep -c` counting docblock mentions of
 * SGS_Container_Wrapper as calls.
 */
function stripJsComments( src ) {
	return src.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /^\s*\/\/.*$/gm, '' );
}

const rows = [];
const add = ( o ) => rows.push( o );

// ---------------------------------------------------------------------------
// 1. Editor components + row helpers — JSX one hop, then call expressions.
// ---------------------------------------------------------------------------
const cache = new SourceCache();
const ctx = { cache, blocksDir: BLOCKS, componentsDir: path.join( SRC, 'components' ) };
const { ownerMountedBy } = getSharedOwnerScan( ctx );

// JSX one-hop results, keyed by absolute file.
const adopters = new Map(); // absFile -> Set(slug)
for ( const [ file, slugs ] of ownerMountedBy ) {
	adopters.set( path.resolve( file ), new Set( slugs ) );
}

// Call-expression pass over every block edit.js, for the shapes the one-hop
// resolver cannot see (function-style helpers, and anything in a subdirectory).
const componentFiles = jsFilesRecursive( path.join( SRC, 'components' ) );
const editSources = new Map();
for ( const name of blockDirs() ) {
	const f = path.join( BLOCKS, name, 'edit.js' );
	if ( fs.existsSync( f ) ) editSources.set( `sgs/${ name }`, fs.readFileSync( f, 'utf8' ) );
}
// blocks/extensions/*.js is a REAL consumption surface — the universal
// extensions mount shared controls onto blocks that never import them
// directly. AnimationControl read 0 adopters purely because this was not
// scanned, while blocks/extensions/animation.js uses it. A zero from an
// incomplete corpus is an artefact of where you looked.
const EXT_DIR = path.join( BLOCKS, 'extensions' );
if ( fs.existsSync( EXT_DIR ) ) {
	for ( const f of fs.readdirSync( EXT_DIR ).filter( ( x ) => x.endsWith( '.js' ) ) ) {
		editSources.set( `extension:${ path.basename( f, '.js' ) }`, fs.readFileSync( path.join( EXT_DIR, f ), 'utf8' ) );
	}
}
for ( const file of componentFiles ) {
	const base = surfaceName( file );
	// Called as a function OR mounted as JSX — either counts as reaching it.
	const called = new RegExp( `(?:^|[^A-Za-z0-9_$])${ base }\\s*\\(`, 'm' );
	const mounted = new RegExp( `<${ base }[\\s/>]`, 'm' );
	for ( const [ slug, src ] of editSources ) {
		const code = stripJsComments( src );
		if ( called.test( code ) || mounted.test( code ) ) {
			if ( ! adopters.has( file ) ) adopters.set( file, new Set() );
			adopters.get( file ).add( slug );
		}
	}
}

// ---------------------------------------------------------------------------
// Transitive closure: a component mounted INSIDE another component is reached by
// every block that reaches its host. DeviceTabs read 0 adopters while living
// inside ResponsiveControl/ResponsiveOverride/ResponsiveTriStateControl, all of
// which blocks do reach — a zero produced by the one-hop depth limit, not by
// non-adoption. Iterated to a fixed point so depth stops mattering.
//
// Checked, not assumed: SgsLinkControl, StateToggleControl and SgsLengthControl
// were tested the same way and are mounted NOWHERE — in any file, at any depth.
// Their zeros are real and survive this pass.
const compSrc = new Map();
for ( const f of componentFiles ) compSrc.set( f, stripJsComments( fs.readFileSync( f, 'utf8' ) ) );

for ( let pass = 0; pass < 12; pass++ ) {
	let grew = false;
	for ( const host of componentFiles ) {
		const hostAdopters = adopters.get( host );
		if ( ! hostAdopters || ! hostAdopters.size ) continue;
		const src = compSrc.get( host ) || '';
		for ( const inner of componentFiles ) {
			if ( inner === host ) continue;
			const nm = surfaceName( inner );
			const mounted = new RegExp( `<${ nm }[\\s/>]` );
			const called = new RegExp( `(?:^|[^A-Za-z0-9_$])${ nm }\\s*\\(` );
			if ( ! mounted.test( src ) && ! called.test( src ) ) continue;
			if ( ! adopters.has( inner ) ) adopters.set( inner, new Set() );
			const target = adopters.get( inner );
			for ( const slug of hostAdopters ) {
				if ( ! target.has( slug ) ) { target.add( slug ); grew = true; }
			}
		}
	}
	if ( ! grew ) break;
}

for ( const file of componentFiles ) {
	const set = adopters.get( file ) || new Set();
	add( {
		name: surfaceName( file ),
		family: 'editor-component',
		functionality: functionalityOf( file ),
		file_path: rel( file ),
		adopters: set.size,
		adopter_list: [ ...set ].sort(),
	} );
}

// ---------------------------------------------------------------------------
// 2. Utils — named import from src/utils, then actually referenced.
// ---------------------------------------------------------------------------
for ( const file of jsFilesRecursive( path.join( SRC, 'utils' ) ) ) {
	const base = surfaceName( file );
	const exported = [ ...fs.readFileSync( file, 'utf8' )
		.matchAll( /export\s+(?:const|function)\s+([A-Za-z0-9_$]+)/g ) ].map( ( m ) => m[ 1 ] );
	const names = exported.length ? exported : [ base ];
	const set = new Set();
	for ( const [ slug, src ] of editSources ) {
		if ( names.some( ( n ) => new RegExp( `(?:^|[^A-Za-z0-9_$])${ n }\\s*[(,)]` ).test( src ) ) ) {
			set.add( slug );
		}
	}
	add( {
		name: base,
		family: 'util',
		functionality: functionalityOf( file ),
		file_path: rel( file ),
		adopters: set.size,
		adopter_list: [ ...set ].sort(),
	} );
}

// ---------------------------------------------------------------------------
// 3. PHP render helpers — a function DEFINED in includes/helpers-*.php and
//    CALLED from a block's render.php. Comment/docblock lines are stripped
//    first: a `grep -c` here counts docblock mentions as calls, which is how
//    "mega-panel calls the wrapper" was nearly reported when its only mention
//    is a comment explaining that it does NOT.
// ---------------------------------------------------------------------------
const stripPhpComments = ( s ) =>
	s.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /^\s*(\/\/|#).*$/gm, '' );

const renderSources = new Map();
for ( const name of blockDirs() ) {
	const f = path.join( BLOCKS, name, 'render.php' );
	if ( fs.existsSync( f ) ) {
		renderSources.set( `sgs/${ name }`, stripPhpComments( fs.readFileSync( f, 'utf8' ) ) );
	}
}

const helperFiles = fs.existsSync( INCLUDES )
	? fs.readdirSync( INCLUDES ).filter( ( f ) => /^helpers-.*\.php$/.test( f ) )
	: [];
for ( const hf of helperFiles ) {
	const full = path.join( INCLUDES, hf );
	const src = fs.readFileSync( full, 'utf8' );
	const fns = [ ...stripPhpComments( src ).matchAll( /function\s+([a-z0-9_]+)\s*\(/gi ) ]
		.map( ( m ) => m[ 1 ] )
		.filter( ( n ) => ! /^(__construct|__get|__set)$/.test( n ) );
	const set = new Set();
	for ( const [ slug, rsrc ] of renderSources ) {
		if ( fns.some( ( n ) => new RegExp( `(?:^|[^A-Za-z0-9_])${ n }\\s*\\(` ).test( rsrc ) ) ) {
			set.add( slug );
		}
	}
	add( {
		name: path.basename( hf, '.php' ),
		family: 'render-helper',
		functionality: functionalityOf( full ),
		file_path: rel( full ),
		adopters: set.size,
		adopter_list: [ ...set ].sort(),
	} );
}

// ---------------------------------------------------------------------------
// 4. Injectors — render_block filters. NOT opt-in: they mutate every block's
//    output whether it asked or not. adopter_list is '*', never a roster.
// ---------------------------------------------------------------------------
const allBlocks = blockDirs().length;
if ( fs.existsSync( INCLUDES ) ) {
	for ( const f of fs.readdirSync( INCLUDES ).filter( ( x ) => x.endsWith( '.php' ) ) ) {
		const full = path.join( INCLUDES, f );
		const src = stripPhpComments( fs.readFileSync( full, 'utf8' ) );
		if ( ! /add_filter\s*\(\s*['"]render_block/.test( src ) ) continue;
		add( {
			name: path.basename( f, '.php' ),
			family: 'injector',
			functionality: functionalityOf( full ),
			file_path: rel( full ),
			adopters: allBlocks,
			adopter_list: [ '*' ],
		} );
	}
}

// ---------------------------------------------------------------------------
// 5. The shared wrapper.
// ---------------------------------------------------------------------------
const wrapperFile = path.join( INCLUDES, 'class-sgs-container-wrapper.php' );
if ( fs.existsSync( wrapperFile ) ) {
	const set = new Set();
	for ( const [ slug, rsrc ] of renderSources ) {
		if ( /SGS_Container_Wrapper/.test( rsrc ) ) set.add( slug );
	}
	add( {
		name: 'SGS_Container_Wrapper',
		family: 'wrapper',
		functionality: functionalityOf( wrapperFile ),
		file_path: rel( wrapperFile ),
		adopters: set.size,
		adopter_list: [ ...set ].sort(),
	} );
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------
// `name` is the table's PRIMARY KEY. A duplicate would be silently swallowed by
// an INSERT OR REPLACE, losing a whole surface with no error — so fail here.
const seen = new Map();
for ( const r of rows ) {
	if ( seen.has( r.name ) ) {
		console.error( `[adoption] FATAL: duplicate surface name '${ r.name }'\n` +
			`  ${ seen.get( r.name ) }\n  ${ r.file_path }\n` +
			'  `name` is the components PRIMARY KEY; a duplicate would be silently ' +
			'replaced. Disambiguate before writing.' );
		process.exit( 2 );
	}
	seen.set( r.name, r.file_path );
}

rows.sort( ( a, b ) => a.family.localeCompare( b.family ) || b.adopters - a.adopters || a.name.localeCompare( b.name ) );

if ( process.argv.includes( '--json' ) ) {
	process.stdout.write( JSON.stringify( { rows, block_count: allBlocks }, null, 1 ) );
	process.exit( 0 );
}

const byFamily = {};
for ( const r of rows ) byFamily[ r.family ] = ( byFamily[ r.family ] || 0 ) + 1;
console.log( `[adoption] ${ rows.length } surfaces across ${ Object.keys( byFamily ).length } families ` +
	`(${ Object.entries( byFamily ).map( ( [ k, v ] ) => `${ k }=${ v }` ).join( ' ' ) }), ${ allBlocks } blocks\n` );
for ( const r of rows ) {
	const list = r.adopter_list[ 0 ] === '*' ? '  (ALL blocks — not opt-in)' : '';
	console.log( `${ String( r.adopters ).padStart( 4 ) }  ${ r.family.padEnd( 17 ) } ${ r.name }${ list }` );
}
const zero = rows.filter( ( r ) => r.adopters === 0 );
console.log( `\n[adoption] ZERO-ADOPTION surfaces (${ zero.length }) — built and unreferenced:` );
for ( const r of zero ) console.log( `   ${ r.family.padEnd( 17 ) } ${ r.name }  ${ r.file_path }` );
