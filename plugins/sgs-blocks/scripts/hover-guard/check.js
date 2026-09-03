#!/usr/bin/env node
'use strict';

/**
 * Build-failing checker. Three jobs (per the brief):
 *
 *   (a) Fail if any `:hover` rule in the scanned CSS is left unguarded and
 *       motion-only, OR could not be classified with confidence
 *       (ambiguous hover/focus selector mix, or undecidable declarations).
 *   (b) Fail if any PHP emission helper under `includes/` builds a
 *       `:hover` selector without ever calling a guard function in the
 *       same function body — see php-hover-scan.php's own docblock for the
 *       exact method and its documented limitation.
 *   (c) Fail if a hover-carrying selector, built in one function, flows
 *       (traced ONE hop) into a registered shared CSS-emitting helper
 *       (`php-emitter-registry.json`) on a call path where that helper's
 *       own guarded branch is proven skipped — the cross-file case job (a)
 *       cannot see because the emitting function's own body carries no
 *       `:hover` literal at all. Also fails on an UNRESOLVED cross-file
 *       case (can't prove clean, can't prove broken) rather than silently
 *       passing it — see php-hover-scan.php's docblock for exactly what
 *       this can and cannot resolve.
 *
 * Never fabricates a PASS. If a target directory/file is missing, or the
 * PHP scan cannot run, this exits non-zero and prints NOT RUN rather than
 * silently reporting 0 findings.
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );
const { auditCss } = require( './audit.js' );

function findStyleCssFiles( baseDir ) {
	const found = [];
	if ( ! fs.existsSync( baseDir ) ) {
		return found;
	}
	for ( const entry of fs.readdirSync( baseDir, { withFileTypes: true } ) ) {
		const full = path.join( baseDir, entry.name );
		if ( entry.isDirectory() ) {
			const candidate = path.join( full, 'style.css' );
			if ( fs.existsSync( candidate ) ) {
				found.push( candidate );
			}
			found.push( ...findStyleCssFiles( full ).filter( ( f ) => f !== candidate ) );
		}
	}
	return found;
}

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

/**
 * Every block's own render.php — a SECOND PHP surface for job (b), added
 * 2026-09-03 (D934/D937 handoff). `defaultPhpTargets()` above only ever read
 * `includes/`, non-recursively, and never looked at `src/blocks/*\/render.php`
 * at all — measured, 20 of 31 block render.php files build a raw, unguarded
 * `:hover` rule. Same shape as `defaultPhpTargets()`: one directory read, one
 * filter, no recursion (each block owns exactly one render.php).
 */
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

function runCssCheck( cssDir ) {
	if ( ! fs.existsSync( cssDir ) ) {
		return { ranOk: false, reason: `directory does not exist: ${ cssDir }`, findings: [] };
	}
	const files = findStyleCssFiles( cssDir );
	if ( 0 === files.length ) {
		return { ranOk: false, reason: `no style.css files found under ${ cssDir }`, findings: [] };
	}

	const findings = [];
	let totalHover = 0;
	let colourSkipped = 0;
	let textDecorationSkipped = 0;
	let alreadyGuarded = 0;

	for ( const file of files ) {
		const css = fs.readFileSync( file, 'utf8' );
		const result = auditCss( css, file );

		totalHover += result.totalHoverMembers;
		colourSkipped += result.colourSkippedCount;
		textDecorationSkipped += result.textDecorationSkippedCount;
		alreadyGuarded += result.alreadyGuardedCount;

		for ( const f of result.unguardedMotion ) {
			findings.push( { file, ...f } );
		}
		for ( const f of result.ambiguous ) {
			findings.push( { file, ...f } );
		}
		for ( const f of result.unclassified ) {
			findings.push( { file, ...f } );
		}
	}

	return {
		ranOk: true,
		filesScanned: files.length,
		totalHover,
		colourSkipped,
		textDecorationSkipped,
		alreadyGuarded,
		findings,
	};
}

function runPhpCheck( includesDir, blocksDir ) {
	const targets = [ ...defaultPhpTargets( includesDir ), ...defaultBlockRenderTargets( blocksDir ) ];
	if ( 0 === targets.length ) {
		return { ranOk: false, reason: `no PHP files found under ${ includesDir } or ${ blocksDir }`, findings: [] };
	}

	let stdout;
	let status;
	try {
		stdout = execFileSync( 'php', [ path.join( __dirname, 'php-hover-scan.php' ), ...targets ], {
			encoding: 'utf8',
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
	const cssDirArg = process.argv[ 2 ];
	const cssDir = cssDirArg
		? path.resolve( cssDirArg )
		: path.resolve( __dirname, '..', '..', 'build', 'blocks' );
	const includesDir = path.resolve( __dirname, '..', '..', 'includes' );
	const blocksDir = path.resolve( __dirname, '..', '..', 'src', 'blocks' );

	console.log( '[hover-guard check] CSS surface:', cssDir );
	console.log( '[hover-guard check] PHP surface:', includesDir, 'and', blocksDir );

	const cssResult = runCssCheck( cssDir );
	const phpResult = runPhpCheck( includesDir, blocksDir );

	let exitCode = 0;

	if ( ! cssResult.ranOk ) {
		console.error( `[hover-guard check] CSS check NOT RUN — ${ cssResult.reason }` );
		exitCode = 1;
	} else {
		console.log(
			`[hover-guard check] CSS: scanned ${ cssResult.filesScanned } files, ${ cssResult.totalHover } hover members total, ${ cssResult.alreadyGuarded } already guarded, ${ cssResult.colourSkipped } colour (out of scope), ${ cssResult.textDecorationSkipped } text-decoration-only (out of scope), ${ cssResult.findings.length } findings.`
		);
		for ( const f of cssResult.findings ) {
			console.error( `  [css] ${ f.file }:${ f.line } [${ f.kind }] ${ f.selector }` );
		}
		if ( cssResult.findings.length > 0 ) {
			exitCode = 1;
		}
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
			'[hover-guard check] PASS — 0 unguarded motion hover rules, 0 unclassified rules, 0 unguarded PHP hover emitters (within-function or cross-file), 0 unresolved cross-file cases.'
		);
	} else {
		console.error( '[hover-guard check] FAIL' );
	}

	process.exit( exitCode );
}

main();
