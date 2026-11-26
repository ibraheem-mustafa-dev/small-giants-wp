#!/usr/bin/env node
'use strict';

/**
 * Hover on touch screens: the detector (Spec 38A FR-38A-17). Four jobs:
 *
 *   (a) CSS: every `:hover` selector member in the built block stylesheets and the hand-written stylesheets
 *       (sources.js) sits inside `@media (hover: hover)` and has its `.sgs-pressed` touch half in the same file
 *       (transform.js::auditCss).
 *   (b) PHP within-function: an emitter under `includes/` or a block's `render.php` that builds `:hover` calls a guard
 *       function (php-hover-scan.php).
 *   (c) PHP cross-file: a hover selector passed into a registered shared emitter on a path that skips its guard
 *       (php-hover-scan.php, php-emitter-registry.json).
 *   (d) Hand-rolled touch rules: no source outside the contract writes a `:where(:root.sgs-touch-input)` selector
 *       (the contract writes the touch half itself).
 *
 *   node scripts/hover-guard/check.js [builtBlocksDir]   check; exits 1 on any finding or when a job cannot run
 *   node scripts/hover-guard/check.js --survey [--repo <root>] [--built <dir>]   counts by owner, always exits 0
 *
 * Never fabricates a PASS: a missing directory, or a PHP scan that cannot run, exits non-zero and prints NOT RUN.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { auditCss } = require( './transform.js' );
const { builtStylesheets, handWrittenStylesheets, PLUGIN_ROOT, REPO_ROOT } = require( './sources.js' );

/**
 * Hand-rolled touch rules the contract now writes itself: a rule keyed on the touch class written by hand next to a
 * guarded hover rule duplicates (and outranks) the generated touch half. Only transform.js and helpers-hover-state.php
 * build `:where(:root.sgs-touch-input)` selectors.
 */
const HAND_ROLLED_TOKENS = [ ':where(:root.sgs-touch-input)' ];

/** Default PHP files scanned for job (b). helpers-hover-state.php excluded — it is the definer. */
function defaultPhpTargets( includesDir ) {
	if ( ! fs.existsSync( includesDir ) ) {
		return [];
	}
	return fs
		.readdirSync( includesDir )
		.filter( ( f ) => f.endsWith( '.php' ) && 'helpers-hover-state.php' !== f )
		.map( ( f ) => path.join( includesDir, f ) );
}

/** Every block's own render.php: the second PHP surface for job (b). */
function defaultBlockRenderTargets( blocksDir ) {
	if ( ! fs.existsSync( blocksDir ) ) {
		return [];
	}
	const targets = [];
	for ( const entry of fs.readdirSync( blocksDir, { withFileTypes: true } ) ) {
		if ( ! entry.isDirectory() ) {
			continue;
		}
		const renderPath = path.join( blocksDir, entry.name, 'render.php' );
		if ( fs.existsSync( renderPath ) ) {
			targets.push( renderPath );
		}
	}
	return targets;
}

/** Job (a) over a list of files. */
function runCssCheck( files ) {
	if ( 0 === files.length ) {
		return { ranOk: false, reason: 'no stylesheets found (build the plugin first: the postbuild writes build/blocks)', findings: [] };
	}
	const findings = [];
	let hoverMembers = 0;
	for ( const file of files ) {
		const result = auditCss( fs.readFileSync( file, 'utf8' ), file );
		hoverMembers += result.hoverMembers;
		findings.push( ...result.findings.map( ( f ) => ( { file, ...f } ) ) );
	}
	return { ranOk: true, filesScanned: files.length, hoverMembers, findings };
}

/** Every source file job (d) reads: the plugin's includes, src, assets and bootstrap, and the theme. */
function handRolledTargets( repoRoot ) {
	const roots = [
		path.join( repoRoot, 'plugins', 'sgs-blocks', 'includes' ),
		path.join( repoRoot, 'plugins', 'sgs-blocks', 'src' ),
		path.join( repoRoot, 'plugins', 'sgs-blocks', 'assets' ),
		path.join( repoRoot, 'plugins', 'sgs-blocks', 'sgs-blocks.php' ),
		path.join( repoRoot, 'theme', 'sgs-theme' ),
	];
	const out = [];
	const walk = ( p ) => {
		if ( ! fs.existsSync( p ) ) {
			return;
		}
		if ( fs.statSync( p ).isFile() ) {
			if ( /\.(php|js|css|json)$/.test( p ) ) {
				out.push( p );
			}
			return;
		}
		for ( const e of fs.readdirSync( p ) ) {
			if ( 'node_modules' !== e && 'vendor' !== e && 'build' !== e ) {
				walk( path.join( p, e ) );
			}
		}
	};
	roots.forEach( walk );
	return out;
}

/** Job (d): every hand-rolled touch rule outside the contract. */
function runHandRolledCheck( repoRoot ) {
	const findings = [];
	for ( const file of handRolledTargets( repoRoot ) ) {
		if ( 'helpers-hover-state.php' === path.basename( file ) ) {
			continue; // The contract's definer writes the touch-only guard.
		}
		fs.readFileSync( file, 'utf8' ).split( '\n' ).forEach( ( line, i ) => {
			for ( const token of HAND_ROLLED_TOKENS ) {
				if ( line.includes( token ) ) {
					findings.push( { file, line: i + 1, token } );
				}
			}
		} );
	}
	return findings;
}

/** Every .php file under a directory. */
function walkPhp( dir ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) {
		return out;
	}
	for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, e.name );
		if ( e.isDirectory() && 'vendor' !== e.name && 'node_modules' !== e.name ) {
			out.push( ...walkPhp( full ) );
		} else if ( e.isFile() && e.name.endsWith( '.php' ) ) {
			out.push( full );
		}
	}
	return out;
}

/**
 * Survey: hover selector members by owner, and how many follow the contract.
 *
 * @param {string} repoRoot
 * @param {string} builtDir
 */
function survey( repoRoot, builtDir ) {
	const rows = [];
	const addCss = ( owner, files ) => {
		let members = 0;
		let following = 0;
		let active = 0;
		let activeFollowing = 0;
		for ( const file of files ) {
			const audit = auditCss( fs.readFileSync( file, 'utf8' ), file );
			members += audit.hoverMembers;
			active += audit.activeMembers;
			const pressFindings = audit.findings.filter( ( f ) => 'missing-press-half' === f.kind ).length;
			following += audit.hoverMembers - ( audit.findings.length - pressFindings );
			activeFollowing += audit.activeMembers - pressFindings;
		}
		rows.push( { owner, files: files.filter( ( f ) => /:(hover|active)/.test( fs.readFileSync( f, 'utf8' ) ) ).length, members, following } );
		rows.push( { owner: `${ owner }, :active members`, files: '', members: active, following: activeFollowing } );
	};
	addCss( 'plugin block stylesheets (build/blocks/*/style-index.css)', builtStylesheets( builtDir ).filter( ( f ) => /style-index\.css$/.test( f ) ) );
	const hand = handWrittenStylesheets( repoRoot );
	addCss( 'plugin hand-written stylesheets (assets/css)', hand.filter( ( f ) => f.includes( 'sgs-blocks' ) ) );
	addCss( 'theme hand-written stylesheets (assets/css, style.css)', hand.filter( ( f ) => f.includes( 'sgs-theme' ) ) );

	// Generated CSS: `:hover` literals in PHP and the editor's JS emitters, by owner.
	const plugin = path.join( repoRoot, 'plugins', 'sgs-blocks' );
	const groups = {
		'plugin includes/ (generated per-block and per-instance CSS)': walkPhp( path.join( plugin, 'includes' ) ).filter( ( f ) => ! f.includes( `${ path.sep }motion${ path.sep }` ) && ! f.endsWith( 'helpers-hover-state.php' ) ),
		'plugin includes/motion/ (motion Hover layers)': walkPhp( path.join( plugin, 'includes', 'motion' ) ),
		'block render.php (per-instance CSS)': defaultBlockRenderTargets( path.join( plugin, 'src', 'blocks' ) ),
		'theme PHP (inline CSS)': walkPhp( path.join( repoRoot, 'theme', 'sgs-theme' ) ),
	};
	for ( const [ owner, files ] of Object.entries( groups ) ) {
		let literals = 0;
		let filesWith = 0;
		for ( const f of files ) {
			const n = ( fs.readFileSync( f, 'utf8' ).match( /:hover(?![\w-])/g ) || [] ).length;
			literals += n;
			filesWith += n ? 1 : 0;
		}
		rows.push( { owner: `${ owner }: :hover literals`, files: filesWith, members: literals, following: null } );
	}
	const json = [ path.join( repoRoot, 'theme', 'sgs-theme', 'theme.json' ) ];
	const sitesDir = path.join( repoRoot, 'sites' );
	if ( fs.existsSync( sitesDir ) ) {
		json.push( ...fs.readdirSync( sitesDir ).map( ( s ) => path.join( sitesDir, s, 'theme-snapshot.json' ) ) );
	}
	let jsonHover = 0;
	let jsonFiles = 0;
	for ( const f of json.filter( ( p ) => fs.existsSync( p ) ) ) {
		const n = ( fs.readFileSync( f, 'utf8' ).match( /":hover"/g ) || [] ).length;
		jsonHover += n;
		jsonFiles += n ? 1 : 0;
	}
	rows.push( { owner: 'theme.json and site snapshots (":hover" keys, printed by WordPress as global-styles)', files: jsonFiles, members: jsonHover, following: null } );
	const retired = runHandRolledCheck( repoRoot );
	rows.push( { owner: 'hand-rolled touch rules in sources', files: new Set( retired.map( ( r ) => r.file ) ).size, members: retired.length, following: null } );

	console.log( 'owner | files with :hover | :hover members (or literals) | following the contract' );
	for ( const r of rows ) {
		console.log( `${ r.owner } | ${ r.files } | ${ r.members } | ${ null === r.following ? 'n/a' : r.following }` );
	}
}

function runPhpCheck( includesDir, blocksDir ) {
	const targets = [ ...defaultPhpTargets( includesDir ), ...defaultBlockRenderTargets( blocksDir ) ];
	if ( 0 === targets.length ) {
		return { ranOk: false, reason: `no PHP files found under ${ includesDir } or ${ blocksDir }`, findings: [] };
	}

	// Relative paths from the plugin root keep the JSON report small; the buffer is sized for the full report.
	const pluginRoot = path.resolve( __dirname, '..', '..' );
	const relTargets = targets.map( ( t ) => path.relative( pluginRoot, t ).split( path.sep ).join( '/' ) );
	let stdout;
	let status;
	try {
		stdout = execFileSync( 'php', [ path.join( __dirname, 'php-hover-scan.php' ), ...relTargets ], {
			cwd: pluginRoot,
			encoding: 'utf8',
			maxBuffer: 256 * 1024 * 1024,
		} );
		status = 0;
	} catch ( err ) {
		// execFileSync throws on non-zero exit; the JSON is still on stdout.
		stdout = err.stdout ? err.stdout.toString() : '';
		status = typeof err.status === 'number' ? err.status : null;
	}

	if ( 2 === status || null === status ) {
		return { ranOk: false, reason: `php-hover-scan.php could not complete (exit ${ status })`, findings: [], raw: stdout };
	}

	let parsed;
	try {
		parsed = JSON.parse( stdout );
	} catch ( e ) {
		return { ranOk: false, reason: `php-hover-scan.php produced non-JSON output: ${ e.message }`, findings: [], raw: stdout };
	}

	return {
		ranOk: true,
		functionsScanned: parsed.functions.length,
		findings: parsed.failures,
		crossFileCalls: parsed.cross_file_calls || [],
		crossFileFlags: parsed.cross_file_flags || [],
		crossFileUnresolved: parsed.cross_file_unresolved || [],
	};
}

function main() {
	const args = process.argv.slice( 2 );
	const flag = ( name ) => {
		const i = args.indexOf( name );
		return -1 === i ? null : args[ i + 1 ];
	};
	if ( args.includes( '--survey' ) ) {
		const repo = path.resolve( flag( '--repo' ) || REPO_ROOT );
		const built = path.resolve( flag( '--built' ) || path.join( repo, 'plugins', 'sgs-blocks', 'build', 'blocks' ) );
		survey( repo, built );
		process.exit( 0 );
	}

	const cssDir = args[ 0 ] ? path.resolve( args[ 0 ] ) : path.join( PLUGIN_ROOT, 'build', 'blocks' );
	const includesDir = path.join( PLUGIN_ROOT, 'includes' );
	const blocksDir = path.join( PLUGIN_ROOT, 'src', 'blocks' );

	console.log( '[hover-guard check] CSS surface:', cssDir, 'and the hand-written stylesheets' );
	console.log( '[hover-guard check] PHP surface:', includesDir, 'and', blocksDir );

	const built = builtStylesheets( cssDir );
	const cssResult = runCssCheck( [ ...built, ...handWrittenStylesheets() ] );
	const phpResult = runPhpCheck( includesDir, blocksDir );
	const retired = runHandRolledCheck( REPO_ROOT );

	let exitCode = 0;

	if ( ! cssResult.ranOk || 0 === built.length ) {
		console.error( `[hover-guard check] CSS check NOT RUN — ${ cssResult.reason || 'no built block stylesheets under ' + cssDir }` );
		exitCode = 1;
	} else {
		console.log( `[hover-guard check] CSS: scanned ${ cssResult.filesScanned } files, ${ cssResult.hoverMembers } hover members, ${ cssResult.findings.length } findings.` );
		for ( const f of cssResult.findings ) {
			console.error( `  [css] ${ f.file }:${ f.line } [${ f.kind }] ${ f.selector }` );
		}
		if ( cssResult.findings.length > 0 ) {
			exitCode = 1;
		}
	}

	console.log( `[hover-guard check] hand-rolled touch rules: ${ retired.length } findings.` );
	for ( const f of retired ) {
		console.error( `  [hand-rolled] ${ f.file }:${ f.line } writes ${ f.token }` );
	}
	if ( retired.length > 0 ) {
		exitCode = 1;
	}

	if ( ! phpResult.ranOk ) {
		console.error( `[hover-guard check] PHP check NOT RUN — ${ phpResult.reason }` );
		if ( phpResult.raw ) {
			console.error( phpResult.raw );
		}
		exitCode = 1;
	} else {
		console.log(
			`[hover-guard check] PHP: scanned ${ phpResult.functionsScanned } functions, ${ phpResult.findings.length } within-function findings.`
		);
		for ( const f of phpResult.findings ) {
			console.error( `  [php] ${ f.file }:${ f.line } function ${ f.name }() builds :hover without calling a guard function` );
		}

		const cfCalls = phpResult.crossFileCalls || [];
		const cfFlags = phpResult.crossFileFlags || [];
		const cfUnresolved = phpResult.crossFileUnresolved || [];
		const cfClean = cfCalls.length - cfFlags.length - cfUnresolved.length;
		console.log(
			`[hover-guard check] PHP cross-file: ${ cfCalls.length } calls to registered shared emitters, ${ cfClean } resolve clean, ${ cfFlags.length } flagged unguarded, ${ cfUnresolved.length } unresolved.`
		);
		for ( const f of cfFlags ) {
			console.error(
				`  [php-cross-file] ${ f.file }:${ f.line } ${ f.caller_function }() passes a hover-carrying selector into ${ f.callee }() on a call path where its guard is proven skipped`
			);
		}
		for ( const f of cfUnresolved ) {
			console.error(
				`  [php-cross-file] ${ f.file }:${ f.line } ${ f.caller_function }() -> ${ f.callee }() UNRESOLVED (${ f.resolution }) — cannot confirm guarded or unguarded`
			);
		}

		if ( phpResult.findings.length > 0 || cfFlags.length > 0 || cfUnresolved.length > 0 ) {
			exitCode = 1;
		}
	}

	if ( 0 === exitCode ) {
		console.log(
			'[hover-guard check] PASS — every hover member follows the touch contract, 0 unguarded PHP hover emitters (within-function or cross-file), 0 unresolved cross-file cases, 0 hand-rolled touch rules.'
		);
	} else {
		console.error( '[hover-guard check] FAIL' );
	}

	process.exit( exitCode );
}

if ( require.main === module ) {
	main();
}

module.exports = { runCssCheck, runHandRolledCheck, HAND_ROLLED_TOKENS };
