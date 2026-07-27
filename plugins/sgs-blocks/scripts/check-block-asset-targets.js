/**
 * check-block-asset-targets.js
 *
 * STRUCTURAL GUARD (post-D382 hardening) — stops the "block.json names a
 * source filename that never gets compiled" class of bug from regressing.
 *
 * D382 (2026-07-27): `src/blocks/table-of-contents/block.json` declared
 * `"style": "file:./style-index.css"`, but `index.js` never imported
 * `./style.css` — and @wordpress/scripts only compiles a block's `style.css`
 * into `style-index.css` when the block's own entry imports it. So no
 * `build/blocks/table-of-contents/style-index.css` was ever produced.
 * WordPress silently enqueues NOTHING for a `file:` reference that doesn't
 * resolve — no error, no warning, no failing test. The block rendered
 * completely unstyled on the front end for an unknown period before this
 * gate existed. An earlier ad-hoc audit (same incident) found FOUR other
 * blocks with the same class of problem via block.json filename mismatches;
 * this run's fresh sweep found this FIFTH case on its first pass.
 *
 * WHAT IT CHECKS
 * --------------
 * For every `build/blocks/*\/block.json` (the COMPILED output — never the
 * src/ block.json, which never has compiled filenames), resolve every
 * `file:` reference across:
 *   style, editorStyle, script, editorScript, viewScript, viewScriptModule,
 *   render
 * WordPress permits any of these to be either a single string or an array of
 * strings — both shapes are handled. Confirm the resolved path EXISTS
 * relative to the block's own build directory.
 *
 * WHY THIS RUNS ON build/, NOT src/
 * ---------------------------------
 * The bug is specifically that the COMPILED block.json (copied into build/
 * verbatim by --webpack-copy-php, since block.json itself is not touched by
 * webpack) names a compiled filename (`style-index.css`, `index.js`) that
 * the bundler may or may not actually have produced, depending on whether
 * the block's own JS entry imported the source file. Checking src/ block.json
 * would only prove the JSON is well-formed — it can never prove the referenced
 * asset was actually emitted. This gate is therefore INHERENTLY POST-BUILD: on
 * a clean checkout with no build/ directory it has nothing to check and every
 * finding would be a false "missing" (the build hasn't run yet, not a real
 * bug). It CANNOT be wired into `prebuild` (which runs BEFORE the build, see
 * package.json's `clean:build` step deleting build/ first) — it must run
 * AFTER `wp-scripts build` completes. See package.json's `postbuild` script,
 * where this is wired directly after `copy-built-styles.js`.
 *
 * NO BASELINE
 * -----------
 * Unlike check-dead-controls.js / check-hardcoded-render-defaults.js, this
 * gate carries no baseline file. There is no legitimate reason for a
 * block.json to reference a compiled asset that was never produced — every
 * finding is a real bug, and the existing debt (the one D382 instance) is
 * fixed as PART of shipping this gate, not baselined around it. Zero
 * tolerance from day one.
 *
 * Usage:
 *   node scripts/check-block-asset-targets.js          # report (exit 0 unless findings)
 *   node scripts/check-block-asset-targets.js --check   # same, for prebuild/CI (exit 1 on findings)
 *   node scripts/check-block-asset-targets.js --json     # machine-readable findings
 *
 * Wired into `postbuild` in package.json (runs after the webpack build, so
 * build/ actually exists to check).
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..' );
const BUILD_BLOCKS_DIR = path.join( ROOT, 'build', 'blocks' );

// The block.json keys that WordPress resolves as `file:` references relative
// to the block's own directory. Each may be a single string or an array of
// strings (WP explicitly permits arrays for script/style-family keys).
const ASSET_KEYS = [
	'style',
	'editorStyle',
	'script',
	'editorScript',
	'viewScript',
	'viewScriptModule',
	'render',
];

/**
 * Read + parse a block.json. Throws with a clear message on invalid JSON so
 * a syntax error surfaces as a build failure, not a silent skip.
 */
function readBlockJson( blockJsonPath ) {
	let raw;
	try {
		raw = fs.readFileSync( blockJsonPath, 'utf8' );
	} catch ( e ) {
		throw new Error( `Could not read ${ blockJsonPath }: ${ e.message }` );
	}
	try {
		return JSON.parse( raw );
	} catch ( e ) {
		throw new Error( `Invalid JSON in ${ blockJsonPath }: ${ e.message }` );
	}
}

/**
 * Check one block directory's compiled block.json for `file:` references
 * that don't resolve to a real file on disk. Returns an array of findings.
 */
function checkBlock( blockDir, blockName ) {
	const findings = [];
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		// Should not happen — caller only invokes this for dirs it found a
		// block.json in — but guard defensively rather than crash the sweep.
		return findings;
	}

	const meta = readBlockJson( blockJsonPath );

	for ( const key of ASSET_KEYS ) {
		const rawVal = meta[ key ];
		if ( ! rawVal ) {
			continue;
		}
		// WordPress permits either a single string or an array of strings.
		const values = Array.isArray( rawVal ) ? rawVal : [ rawVal ];

		for ( const val of values ) {
			if ( typeof val !== 'string' || ! val.startsWith( 'file:' ) ) {
				continue; // not a file reference (e.g. a handle name) — not our concern
			}
			const relPath = val.slice( 'file:'.length );
			const resolvedPath = path.join( blockDir, relPath );
			if ( ! fs.existsSync( resolvedPath ) ) {
				findings.push( {
					block: blockName,
					key,
					reference: val,
					resolvedPath: path.relative( ROOT, resolvedPath ),
					reason:
						`block.json declares "${ key }": "${ val }" but the compiled file does not ` +
						'exist — WordPress will silently enqueue nothing for this handle (no error, no warning).',
				} );
			}
		}
	}

	return findings;
}

/**
 * Sweep every build/blocks/*\/block.json. Returns { findings, checkedCount }.
 * If BUILD_BLOCKS_DIR doesn't exist at all, returns an explicit "not built
 * yet" signal rather than silently reporting zero findings (which would look
 * identical to a clean pass and mask the gate never having run).
 */
function sweep() {
	if ( ! fs.existsSync( BUILD_BLOCKS_DIR ) ) {
		return { findings: [], checkedCount: 0, buildMissing: true };
	}

	const blockDirs = fs
		.readdirSync( BUILD_BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() )
		.map( ( d ) => ( { name: d.name, dir: path.join( BUILD_BLOCKS_DIR, d.name ) } ) )
		.filter( ( d ) => fs.existsSync( path.join( d.dir, 'block.json' ) ) );

	let findings = [];
	for ( const { name, dir } of blockDirs ) {
		findings = findings.concat( checkBlock( dir, name ) );
	}

	return { findings, checkedCount: blockDirs.length, buildMissing: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
	const check = process.argv.includes( '--check' );
	const asJson = process.argv.includes( '--json' );

	const { findings, checkedCount, buildMissing } = sweep();

	if ( buildMissing ) {
		const msg =
			'[check-block-asset-targets] build/blocks/ does not exist — this gate runs ' +
			'AFTER the webpack build (it is wired into postbuild), so nothing to check yet. ' +
			'If you are seeing this from a direct invocation, run `npm run build` first.';
		if ( asJson ) {
			process.stdout.write(
				JSON.stringify( { findings: [], checkedCount: 0, buildMissing: true }, null, 2 ) + '\n'
			);
		} else {
			process.stdout.write( msg + '\n' );
		}
		// Not a failure — there is nothing to validate yet, not a violation.
		process.exit( 0 );
	}

	if ( asJson ) {
		process.stdout.write(
			JSON.stringify( { findings, checkedCount, buildMissing: false }, null, 2 ) + '\n'
		);
	} else if ( findings.length ) {
		process.stderr.write(
			`[check-block-asset-targets] ${ findings.length } missing asset target(s) across ${ checkedCount } blocks:\n`
		);
		for ( const f of findings ) {
			process.stderr.write( `  - ${ f.block } :: ${ f.key } — ${ f.reason }\n` );
			process.stderr.write( `      expected at: ${ f.resolvedPath }\n` );
		}
		process.stderr.write(
			'Fix: the block\'s own entry (index.js) must import the source file so @wordpress/scripts ' +
				'compiles it (e.g. `import \'./style.css\';` for a `style: file:./style-index.css` reference), ' +
				'OR correct the block.json reference to the filename that actually gets produced.\n'
		);
	} else {
		process.stdout.write(
			`[check-block-asset-targets] OK — 0 missing asset targets across ${ checkedCount } blocks.\n`
		);
	}

	if ( check && findings.length ) {
		process.exit( 1 );
	}
}

main();
