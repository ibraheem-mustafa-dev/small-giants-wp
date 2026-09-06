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
 * Every identifier a file EXPORTS, plus its own surface name.
 *
 * ⚠ Matching on the surface NAME alone produces false zeros for any indexed
 * directory, because nothing ever writes `<colour-picker`. Measured 2026-08-24:
 * colour-picker exports ColorPalette (3 users), gradient-picker exports
 * SgsGradientPicker (5) and primitives exports BorderRadiusControl (1) — all
 * three read 0 adopters until this existed. Match on what a file offers, not on
 * what it is called.
 */
/**
 * Names a file exports that are CONSTANTS (SCREAMING_CASE). These are referenced
 * by bare identifier — never `<Name` and never `Name(` — so mount-or-call
 * matching reports a false zero for a pure data module. _shared.js exports
 * LENGTH_UNITS and is imported by three sibling panels; it read 0 until this
 * existed. Deliberately restricted to SCREAMING_CASE so bare-identifier matching
 * never loosens detection for an actual component.
 */
function exportedConstants( file ) {
	let src = '';
	try {
		src = stripJsComments( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		return [];
	}
	const out = new Set();
	for ( const m of src.matchAll( /export\s+const\s+([A-Z][A-Z0-9_]{2,})\s*=/g ) ) out.add( m[ 1 ] );
	return [ ...out ];
}

function exportedNames( file ) {
	const names = new Set( [ surfaceName( file ) ] );
	let src = '';
	try {
		src = stripJsComments( fs.readFileSync( file, 'utf8' ) );
	} catch ( e ) {
		return [ ...names ];
	}
	for ( const m of src.matchAll( /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)/g ) ) {
		names.add( m[ 1 ] );
	}
	for ( const m of src.matchAll( /export\s*\{([^}]*)\}/g ) ) {
		for ( const part of m[ 1 ].split( ',' ) ) {
			const tok = part.trim().split( /\s+as\s+/ ).pop().trim();
			if ( tok && tok !== 'default' && /^[A-Za-z0-9_$]+$/.test( tok ) ) names.add( tok );
		}
	}
	return [ ...names ];
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
// Block-LOCAL component directories are real shared surfaces too — they are
// exactly what resolveComponentFiles indexes as `src/blocks/*/components`, and
// ScaleAxisControl lives in container/components/ShapeDividersPanel.js's tree.
const componentFiles = jsFilesRecursive( path.join( SRC, 'components' ) );
for ( const b of blockDirs() ) {
	componentFiles.push( ...jsFilesRecursive( path.join( BLOCKS, b, 'components' ) ) );
}
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
// A block's index.js is a real consumer — the `icons` util is imported there by
// 35 blocks for registration and never appears in an edit.js.
for ( const name of blockDirs() ) {
	const idx = path.join( BLOCKS, name, 'index.js' );
	if ( fs.existsSync( idx ) ) editSources.set( `index:${ name }`, fs.readFileSync( idx, 'utf8' ) );
}
const EXT_DIR = path.join( BLOCKS, 'extensions' );
if ( fs.existsSync( EXT_DIR ) ) {
	for ( const f of fs.readdirSync( EXT_DIR ).filter( ( x ) => x.endsWith( '.js' ) ) ) {
		editSources.set( `extension:${ path.basename( f, '.js' ) }`, fs.readFileSync( path.join( EXT_DIR, f ), 'utf8' ) );
	}
}
for ( const file of componentFiles ) {
	// Match on every name the file OFFERS, not just what it is called.
	const names = exportedNames( file );
	const consts = exportedConstants( file );
	const called = new RegExp( `(?:^|[^A-Za-z0-9_$])(?:${ names.join( '|' ) })\\s*\\(`, 'm' );
	const mounted = new RegExp( `<(?:${ names.join( '|' ) })[\\s/>]`, 'm' );
	const referenced = consts.length
		? new RegExp( `(?:^|[^A-Za-z0-9_$])(?:${ consts.join( '|' ) })(?:[^A-Za-z0-9_$]|$)`, 'm' )
		: null;
	for ( const [ slug, src ] of editSources ) {
		const code = stripJsComments( src );
		if ( called.test( code ) || mounted.test( code ) || ( referenced && referenced.test( code ) ) ) {
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
const utilFiles = jsFilesRecursive( path.join( SRC, 'utils' ) );
// Utils are reached THROUGH components at least as often as directly, so they
// must be closure targets — objectPosition and presetSettings both read 0
// otherwise, while being genuinely consumed inside other components.
const closureTargets = [ ...componentFiles, ...utilFiles ];
const compSrc = new Map();
for ( const f of componentFiles ) compSrc.set( f, stripJsComments( fs.readFileSync( f, 'utf8' ) ) );

for ( let pass = 0; pass < 12; pass++ ) {
	let grew = false;
	for ( const host of componentFiles ) {
		const hostAdopters = adopters.get( host );
		if ( ! hostAdopters || ! hostAdopters.size ) continue;
		const src = compSrc.get( host ) || '';
		for ( const inner of closureTargets ) {
			if ( inner === host ) continue;
			// Exported names, not the surface name — nothing writes `<colour-picker`,
			// it writes `<ColorPalette`. Matching the folder name left three indexed
			// directories and two component-consumed utils reading a false 0.
			const nms = exportedNames( inner );
			const cst = exportedConstants( inner );
			const mounted = new RegExp( `<(?:${ nms.join( '|' ) })[\\s/>]` );
			const called = new RegExp( `(?:^|[^A-Za-z0-9_$])(?:${ nms.join( '|' ) })\\s*\\(` );
			const refd = cst.length
				? new RegExp( `(?:^|[^A-Za-z0-9_$])(?:${ cst.join( '|' ) })(?:[^A-Za-z0-9_$]|$)` )
				: null;
			if ( ! mounted.test( src ) && ! called.test( src ) && ! ( refd && refd.test( src ) ) ) continue;
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
for ( const file of utilFiles ) {
	const base = surfaceName( file );
	const exported = [ ...fs.readFileSync( file, 'utf8' )
		.matchAll( /export\s+(?:const|function)\s+([A-Za-z0-9_$]+)/g ) ].map( ( m ) => m[ 1 ] );
	const names = exported.length ? exported : [ base ];
	const set = new Set( adopters.get( file ) || [] );   // closure results first
	for ( const [ slug, src ] of editSources ) {
		const code = stripJsComments( src );
		if ( names.some( ( n ) => new RegExp( `(?:^|[^A-Za-z0-9_$])${ n }\\s*[(,)]` ).test( code ) ) ) {
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

// The render_block INJECTORS in includes/ are real consumers of a shared PHP
// helper. helpers-scoped-instance-vars.php read 0 adopters while being used by
// exactly D405's four injectors, because only block render.php was scanned.
if ( fs.existsSync( INCLUDES ) ) {
	for ( const f of fs.readdirSync( INCLUDES ).filter( ( x ) => x.endsWith( '.php' ) ) ) {
		renderSources.set(
			`includes:${ path.basename( f, '.php' ) }`,
			stripPhpComments( fs.readFileSync( path.join( INCLUDES, f ), 'utf8' ) )
		);
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
	const selfKey = `includes:${ path.basename( hf, '.php' ) }`;
	for ( const [ slug, rsrc ] of renderSources ) {
		if ( slug === selfKey ) continue;   // a helper defining a function is not adopting it
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
// 6. PHP helper FUNCTIONS (family='render-helper-function') — merged in from
//    generate-helper-catalogue.py's own --json mode, NOT re-extracted here.
//
// WHY: seed-component-adoption.py's own header is explicit that detection
// lives in THIS scanner, never in the Python writer — a second Python-side
// extraction would be a second mechanism, and two mechanisms are how two
// numbers start disagreeing. But the per-FUNCTION PHP docblock/signature
// extraction (`_php_functions()`) already lives in
// generate-helper-catalogue.py, built for the dev-setup.md doc table. Rather
// than re-implementing THAT parsing a third time here, this scanner shells
// out to it (mirroring, in reverse, how seed-component-adoption.py already
// shells out to THIS scanner) and merges its rows into this scanner's own
// output — so seed-component-adoption.py keeps trusting exactly one thing
// (`scan-component-adoption.js --json`), while the PHP-function extraction
// itself still lives in exactly one place.
//
// Real per-function adoption counting is out of scope here — the rows arrive
// with adopters:0/adopter_list:[] already, and are passed through unchanged.
// ---------------------------------------------------------------------------
const { execFileSync } = require( 'child_process' );
const HELPER_CATALOGUE = path.join( SCRIPTS, 'generate-helper-catalogue.py' );
if ( fs.existsSync( HELPER_CATALOGUE ) ) {
	let out;
	try {
		out = execFileSync( 'python', [ HELPER_CATALOGUE, '--json' ], {
			encoding: 'utf8',
			maxBuffer: 1024 * 1024 * 16,
		} );
	} catch ( e ) {
		console.error( '[adoption] FATAL: generate-helper-catalogue.py --json failed:\n' +
			( e.stderr || e.message ) );
		process.exit( 2 );
	}
	let phpRows;
	try {
		phpRows = JSON.parse( out );
	} catch ( e ) {
		console.error( '[adoption] FATAL: generate-helper-catalogue.py --json did not return valid JSON.' );
		process.exit( 2 );
	}
	for ( const r of phpRows ) add( r );
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
