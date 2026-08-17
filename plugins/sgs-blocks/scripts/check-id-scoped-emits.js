/**
 * check-id-scoped-emits.js
 *
 * STRUCTURAL GUARD — ID-scoped CSS selector emissions.
 *
 * WHY THIS EXISTS
 * ---------------
 * Spec 32 §6.1(b) (D303) requires every per-instance scoped CSS rule to be
 * emitted at CLASS level (`.{$uid}.block-name`) and NEVER at ID level
 * (`#{$uid}`). ID scoping computes at specificity (1,0,0) and becomes
 * un-overridable by equal-specificity client `sgsCustomCss` residual, which is
 * the precise defect D303 fixed.
 *
 * A live instance was found in `plugins/sgs-blocks/src/blocks/button/render.php`:
 *   '@media(prefers-reduced-motion:reduce){#' . $uid . ' .sgs-button{...}}'
 *
 * The CORRECT shape, used seven times in the same file, is:
 *   ".{$uid}.sgs-button{transition:all ...;}"
 *
 * This gate detects ID-scope emissions in all forms:
 *   1. '#' . $uid . '...'         (concatenation — the live instance)
 *   2. "#{$uid}"                   (brace interpolation)
 *   3. "#$uid"                     (bare interpolation)
 *   4. Same three with uid variants ($root_uid, $block_uid, etc.)
 *
 * Deliberately does NOT flag:
 *   - id="..." HTML attributes (the element anchor, not a selector)
 *   - Hex colours (#fff, #e68a95)
 *   - Comment lines
 *   - ".{$uid} .descendant" (class-scoped descendants)
 *
 * USAGE
 *   node scripts/check-id-scoped-emits.js --check      # gate, exit 1 on any finding
 *   node scripts/check-id-scoped-emits.js --self-test  # proves it can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const BASE_DIR = path.resolve( __dirname, '..' );
const BLOCKS_DIR = path.join( BASE_DIR, 'src', 'blocks' );
const INCLUDES_DIR = path.join( BASE_DIR, 'includes' );

/**
 * Collect every PHP file to scan.
 *
 * @param {string} [baseDir] Override for --self-test.
 * @return {string[]} Absolute file paths.
 */
function collectFiles( baseDir = BASE_DIR ) {
	const out = [];
	const blocksDir = path.join( baseDir, 'src', 'blocks' );
	const includesDir = path.join( baseDir, 'includes' );

	if ( fs.existsSync( blocksDir ) ) {
		for ( const dir of fs.readdirSync( blocksDir ) ) {
			const renderFile = path.join( blocksDir, dir, 'render.php' );
			if ( fs.existsSync( renderFile ) ) {
				out.push( renderFile );
			}
		}
	}

	if ( fs.existsSync( includesDir ) ) {
		for ( const file of fs.readdirSync( includesDir ) ) {
			if ( file.endsWith( '.php' ) ) {
				out.push( path.join( includesDir, file ) );
			}
		}
	}

	return out.sort();
}

/**
 * Check if a line is a PHP comment line.
 *
 * @param {string} line Source line.
 * @return {boolean} True if entirely a comment.
 */
function isCommentLine( line ) {
	const trimmed = line.trimLeft();
	return (
		trimmed.startsWith( '//' ) ||
		trimmed.startsWith( '#' ) ||
		trimmed.startsWith( '/*' ) ||
		trimmed.startsWith( '*' )
	);
}

/**
 * Scan a single PHP file for ID-scoped CSS selector emissions.
 *
 * @param {string} file Absolute path.
 * @return {Array<{lineNum: number, line: string}>} Findings.
 */
function scanFile( file ) {
	const findings = [];
	let content;
	try {
		content = fs.readFileSync( file, 'utf8' );
	} catch ( e ) {
		return findings;
	}

	const lines = content.split( '\n' );

	for ( let i = 0; i < lines.length; i++ ) {
		const line = lines[ i ];
		const lineNum = i + 1;

		// Skip comment-only lines
		if ( isCommentLine( line ) ) {
			continue;
		}

		let isIdScope = false;

		// Pattern 1: '#' . $uid (concatenation with any uid-bearing variable)
		// Matches: '#' . $uid, '#' . $root_uid, '#' . $block_uid, etc.
		// Case-insensitive to catch $UID, $Uid, etc.
		if ( /#['"][\s]*\.[\s]*\$\w*uid\w*/i.test( line ) ) {
			isIdScope = true;
		}

		// Pattern 2: #{$uid} / #{$root_uid} (brace interpolation), ANYWHERE in the
		// line. The delivered version required a double quote immediately before
		// the `#`, which meant it only fired when the selector opened the string.
		// Real emits put it mid-string — `"@media(max-width:767px){#{$uid} ..."` —
		// and slipped through. The pattern's blind spot was the shape of the
		// pattern, not an absence in the codebase.
		if ( /#\{\$\w*uid\w*\}/i.test( line ) ) {
			isIdScope = true;
		}

		// Pattern 3: "#$uid" or "#$root_uid" (bare interpolation)
		// Careful: must distinguish from hex colours
		if ( /#\$\w*uid\w*/i.test( line ) ) {
			// Verify it's actually a PHP variable, not a hex colour.
			// Hex colours have 3 or 6 hex digits after #.
			// Our pattern has a $ after #, which hex colours never have.
			if ( /#\$/.test( line ) ) {
				isIdScope = true;
			}
		}

		if ( ! isIdScope ) {
			continue;
		}

		// NOTE — there are deliberately NO line-level exclusions here.
		//
		// The delivered version carried three, and QC proved two of them were
		// simultaneously HARMFUL and UNNECESSARY:
		//
		//   `if ( /id\s*=\s*["']/ ) continue;`      (HTML id attributes)
		//   `if ( /["']\.\{?\$\w*uid\w*/ ) continue;` (class-scoped descendants)
		//
		// HARMFUL: both are evaluated per LINE and skip the line WHOLESALE, so a
		// line carrying a genuine ID-scoped selector AND an id= attribute (or a
		// correct class-scoped rule) was silently passed. Proven with fixtures —
		// two real violations went undetected.
		//
		// UNNECESSARY: neither shape can reach this point anyway. Every detection
		// pattern above requires a literal `#` immediately followed by a quote-then-
		// concatenation or a `$`. An HTML attribute (`id="' . $uid . '"`) and a hex
		// colour (`'#fff'`) contain no such sequence, so they never match in the
		// first place — the self-test's own negative controls still pass without
		// these guards, which is the proof they were dead weight.
		//
		// The comment-line skip above is retained: a comment CAN legitimately quote
		// the bad pattern while discussing it (this file's own header does).

		// This line has an ID scope emission
		findings.push( {
			lineNum,
			line: line.trim(),
		} );
	}

	return findings;
}

/**
 * Scan the whole tree.
 *
 * @param {string} [baseDir] Override for --self-test.
 * @return {{findings: Array<{file: string, lineNum: number, line: string}>, filesScanned: number}} Result.
 */
function scanTree( baseDir = BASE_DIR ) {
	const files = collectFiles( baseDir );
	const findings = [];

	for ( const f of files ) {
		const fileFindings = scanFile( f );
		for ( const finding of fileFindings ) {
			findings.push( {
				file: path.relative( path.resolve( __dirname, '..', '..' ), f ).replace( /\\/g, '/' ),
				...finding,
			} );
		}
	}

	return { findings, filesScanned: files.length };
}

/**
 * --self-test: prove the detector CAN fail and stays quiet on legitimate shapes.
 *
 * @return {void}
 */
function runSelfTest() {
	const os = require( 'os' );
	const failures = [];
	const assert = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};

	process.stdout.write( '[check-id-scoped-emits --self-test]\n\n' );

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'cise-' ) );
	const testBlocksDir = path.join( root, 'src', 'blocks' );
	const testIncludesDir = path.join( root, 'includes' );
	fs.mkdirSync( testBlocksDir, { recursive: true } );
	fs.mkdirSync( testIncludesDir, { recursive: true } );

	const writeBlock = ( slug, body ) => {
		fs.mkdirSync( path.join( testBlocksDir, slug ), { recursive: true } );
		fs.writeFileSync( path.join( testBlocksDir, slug, 'render.php' ), body, 'utf8' );
	};

	const writeInclude = ( name, body ) => {
		fs.writeFileSync( path.join( testIncludesDir, name + '.php' ), body, 'utf8' );
	};

	// POSITIVE CONTROL — the EXACT defect line from button/render.php
	writeBlock(
		'bad-concat',
		`<?php
// The exact defect from the spec:
echo '@media(prefers-reduced-motion:reduce){#' . $uid . ' .sgs-button{transition:none !important;transform:none !important;}}';
?>`
	);

	// POSITIVE CONTROL — brace interpolation form
	writeBlock(
		'bad-brace-interp',
		`<?php
// Brace interpolation: "#{$uid}"
$css = "#{$uid} .sgs-button{color:blue;}";
?>`
	);

	// POSITIVE CONTROL — bare interpolation form
	writeBlock(
		'bad-bare-interp',
		`<?php
// Bare interpolation: "#$uid"
$css = "#$uid .sgs-button{color:red;}";
?>`
	);

	// POSITIVE CONTROL — brace interpolation MID-STRING, not opening it.
	// Regression control: the first version required a `"` immediately before the
	// `#`, so this real-world shape (selector inside an @media block) passed
	// silently. Keep this fixture — it is the one that proves the pattern is not
	// anchored to the start of a string.
	writeBlock(
		'bad-brace-midstring',
		`<?php
$css = "@media(max-width:767px){#{$uid} .sgs-button{color:red;}}";
?>`
	);

	// POSITIVE CONTROL — a genuine violation sharing its line with an id=
	// attribute. Regression control for the removed line-level exclusions, which
	// skipped the whole line and hid violations like this one.
	writeBlock(
		'bad-alongside-id-attr',
		`<?php
echo '<div id="' . $uid . '">' . '@media(x){#' . $uid . ' .sgs-button{color:red;}}';
?>`
	);

	// POSITIVE CONTROL — variant with root_uid
	writeInclude(
		'bad-root-uid',
		`<?php
// Variant with $root_uid
$css = "@media screen { #' . $root_uid . ' { ... } }";
?>`
	);

	// NEGATIVE CONTROL — correct class scoping
	writeBlock(
		'good-class-scoped',
		`<?php
// Correct: class-scoped with dot and brace variable
$scoped_css_parts[] = ".{$uid}.sgs-button{transition:all;}";
?>`
	);

	// NEGATIVE CONTROL — HTML id attribute
	writeBlock(
		'good-html-id',
		`<?php
// HTML id= attribute, not a CSS selector
echo '<div id="' . $uid . '">';
echo '<div id="{$uid}">';
echo '<div id="$uid">';
?>`
	);

	// NEGATIVE CONTROL — hex colours
	writeBlock(
		'good-hex-colours',
		`<?php
// Hex colours #fff, #abc, #e68a95 should not flag
$primary = '#fff';
$secondary = '#e68a95';
$tertiary = '#abc';
?>`
	);

	// NEGATIVE CONTROL — comment lines
	writeBlock(
		'good-comments',
		`<?php
// This comment mentions #$uid but should not flag
# Another comment with #$uid_in_text
/* Block comment with #$uid_mentioned */
?>`
	);

	// NEGATIVE CONTROL — class-scoped descendants
	writeInclude(
		'good-class-descendant',
		`<?php
// Class-scoped descendant is fine
echo ".{$uid} .sgs-x__y { color: red; }";
echo ".{$uid}.sgs-item { padding: 10px; }";
?>`
	);

	const { findings } = scanTree( root );

	// Map findings by file basename for assertions
	const at = ( filename ) => findings.filter( ( f ) => f.file.includes( filename ) );

	assert( 'CATCHES concatenation form (#\' . $uid)', at( 'bad-concat' ).length === 1 );
	assert( 'CATCHES brace interpolation form (#{$uid})', at( 'bad-brace-interp' ).length === 1 );
	assert( 'CATCHES brace interpolation MID-STRING (@media(...){#{$uid})', at( 'bad-brace-midstring' ).length === 1 );
	assert( 'CATCHES a violation sharing its line with an id= attribute', at( 'bad-alongside-id-attr' ).length === 1 );
	assert( 'CATCHES bare interpolation form (#$uid)', at( 'bad-bare-interp' ).length === 1 );
	assert( 'CATCHES root_uid variant (#\' . $root_uid)', at( 'bad-root-uid' ).length === 1 );
	assert( 'does NOT flag class scoping (.{$uid})', at( 'good-class-scoped' ).length === 0 );
	assert( 'does NOT flag HTML id= attributes', at( 'good-html-id' ).length === 0 );
	assert( 'does NOT flag hex colours', at( 'good-hex-colours' ).length === 0 );
	assert( 'does NOT flag comments', at( 'good-comments' ).length === 0 );
	assert( 'does NOT flag class descendants', at( 'good-class-descendant' ).length === 0 );
	assert( 'total findings are exactly 6', findings.length === 6 );

	fs.rmSync( root, { recursive: true, force: true } );

	process.stdout.write(
		failures.length === 0
			? '\n[check-id-scoped-emits --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-id-scoped-emits --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( failures.length === 0 ? 0 : 1 );
}

/**
 * CLI entry point.
 *
 * @return {void}
 */
function main() {
	const check = process.argv.includes( '--check' );
	const { findings, filesScanned } = scanTree();

	process.stdout.write( '[check-id-scoped-emits]\n\n' );
	process.stdout.write( `Files scanned: ${ filesScanned }\n` );

	if ( findings.length > 0 ) {
		process.stdout.write( `ID-scoped CSS emits: ${ findings.length }\n` );
		for ( const f of findings ) {
			process.stdout.write( `  ${ f.file }:${ f.lineNum }  ${ f.line }\n` );
		}
	} else {
		process.stdout.write( 'ID-scoped CSS emits: 0\n' );
	}

	if ( check ) {
		process.exit( findings.length > 0 ? 1 : 0 );
	}
	process.exit( 0 );
}

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		runSelfTest();
	} else {
		main();
	}
}

module.exports = { scanFile, scanTree, collectFiles };
