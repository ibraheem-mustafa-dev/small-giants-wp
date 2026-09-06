#!/usr/bin/env node
'use strict';

/**
 * check-text-gradient-companion.js — the text-gradient silent-no-op trap.
 *
 * THE TRAP THIS GATE CATCHES. `sgs_text_decls()` (`includes/helpers-colour-
 * variants.php`) returns `color:` DECLARATIONS ONLY. When a text GRADIENT is
 * in play (a caller's map has a `gradient` and/or `hover_gradient` key), the
 * caller MUST ALSO emit `sgs_text_colour_gradient_fallback_rule( $selector,
 * $value )` — the companion rule that produces the `background-clip:text`
 * paint. Omit it and `color:` receives a raw `linear-gradient(...)` string:
 * invalid CSS, the browser drops the WHOLE declaration, and the client's
 * gradient silently paints nothing. See `helpers-colour-variants.php` lines
 * ~132-146 for the helper's own docblock stating this obligation.
 *
 * NO OTHER GATE COVERS THIS. `rules/31-golden-colour-control.js` is a pure
 * editor-side (JS) scanner — zero `.php` references, so it cannot see a PHP
 * emit. `check-dead-controls`, `check-undeclared-attrs`, `audit-inline-
 * styling` and `check-render-undefined-vars` all pass on a block carrying
 * this defect: nothing is dead, nothing is undeclared, nothing is inline,
 * and every PHP variable used IS defined — the bug is a missing SECOND CALL,
 * not a malformed one.
 *
 * METHOD. For every render.php / includes/*.php file: find each real
 * `sgs_text_decls(` CALL (not a comment, not a string mentioning the name —
 * see maskSource() below), inspect its second argument (the attribute-name
 * map) for a `'gradient'` and/or `'hover_gradient'` key, and — only when one
 * is present — require the SAME FILE to also call
 * `sgs_text_colour_gradient_fallback_rule(` for real.
 *
 * A gradient key is REQUIRED for the companion obligation to apply: without
 * one, the map's `base`/`hover` attrs feed `sgs_resolve_text_colour_or_
 * gradient( $colour, $gradient )` with an empty second argument, so the
 * function can only ever return the flat colour — never a gradient string —
 * and the companion rule would be a genuine no-op. Verified against the
 * helper's own signature and docblock, not inferred.
 *
 * CORPUS. Deliberately the SAME roster as check-id-scoped-emits.js — every
 * `src/blocks/<slug>/render.php` plus every flat `includes/*.php` file. This
 * is where `sgs_text_decls()` is called from (a PHP helper facade); there is
 * no JS or theme-template call site for it, so widening the corpus to those
 * trees would inflate the denominator with files that can never contain a
 * match. The corpus size is asserted explicitly in --self-test and printed
 * on every real run — see the CORPUS-SIZE quality bar in the build brief.
 *
 * FAIL-CLOSED. A file this gate cannot read is a COUNTED FINDING (kind
 * 'read-error'), never a silent skip — a skipped file reports zero findings,
 * indistinguishable from a clean one. `--self-test` includes a directory
 * masquerading as a `render.php` file (readFileSync throws EISDIR) to prove
 * this path is real, not aspirational.
 *
 * Usage:
 *   node scripts/check-text-gradient-companion.js            # survey, exit 0
 *   node scripts/check-text-gradient-companion.js --check    # gate, exit 1 on any finding
 *   node scripts/check-text-gradient-companion.js --self-test
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

const BASE_DIR = path.resolve( __dirname, '..' );

/**
 * Collect every PHP file to scan — same roster as check-id-scoped-emits.js:
 * every block's render.php, plus every flat includes/*.php file.
 *
 * @param {string} [baseDir] Override for --self-test.
 * @return {string[]} Absolute file paths, sorted.
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
 * Mask PHP comments (and, optionally, string-literal interiors) with spaces,
 * preserving every character's POSITION and every newline — so a masked
 * offset lines up 1:1 with the original source for both line-number
 * reporting and cross-referencing between a strings-kept and a
 * strings-masked pass of the SAME file.
 *
 * WHY TWO PASSES, NOT ONE. Finding a REAL call to `sgs_text_decls(` must
 * ignore the name appearing inside a comment or a string (mustNOTflag (d)):
 * that requires strings masked. But reading the call's ARGUMENTS — the
 * attribute-name map, e.g. `'gradient' => 'titleColourGradient'` — needs the
 * quoted keys INTACT, because the keys themselves are string literals. One
 * masking pass cannot serve both jobs; two passes over the same positions
 * can, because they stay index-aligned.
 *
 * @param {string}  src         Raw PHP source.
 * @param {boolean} maskStrings True to also blank string-literal interiors
 *                              (used to locate genuine call sites); false to
 *                              strip only comments (used to read real
 *                              argument content).
 * @return {string} Masked text, same length as `src`.
 */
function maskSource( src, maskStrings ) {
	let out = '';
	let i = 0;
	const n = src.length;

	while ( i < n ) {
		const c = src[ i ];
		const c2 = i + 1 < n ? src[ i + 1 ] : '';

		// Line comment: // ... or # ...
		if ( ( c === '/' && c2 === '/' ) || c === '#' ) {
			while ( i < n && src[ i ] !== '\n' ) {
				out += ' ';
				i++;
			}
			continue;
		}

		// Block comment: /* ... */
		if ( c === '/' && c2 === '*' ) {
			out += '  ';
			i += 2;
			while ( i < n && ! ( src[ i ] === '*' && i + 1 < n && src[ i + 1 ] === '/' ) ) {
				out += src[ i ] === '\n' ? '\n' : ' ';
				i++;
			}
			if ( i < n ) {
				out += '  ';
				i += 2;
			}
			continue;
		}

		// Single- or double-quoted string, with backslash-escape handling.
		if ( c === "'" || c === '"' ) {
			const quote = c;
			out += maskStrings ? ' ' : c;
			i++;
			while ( i < n && src[ i ] !== quote ) {
				if ( src[ i ] === '\\' && i + 1 < n ) {
					out += maskStrings
						? ( src[ i ] === '\n' ? '\n' : ' ' ) + ( src[ i + 1 ] === '\n' ? '\n' : ' ' )
						: src[ i ] + src[ i + 1 ];
					i += 2;
					continue;
				}
				out += maskStrings ? ( src[ i ] === '\n' ? '\n' : ' ' ) : src[ i ];
				i++;
			}
			if ( i < n ) {
				out += maskStrings ? ' ' : src[ i ];
				i++;
			}
			continue;
		}

		out += c;
		i++;
	}

	return out;
}

const CALL_RE = /\bsgs_text_decls(?!\w)\s*\(/g;
const COMPANION_RE = /\bsgs_text_colour_gradient_fallback_rule(?!\w)\s*\(/;
const GRADIENT_KEY_RE = /['"](gradient|hover_gradient)['"]\s*=>/;

/**
 * Given a masked-for-calls text and the offset of a `(` that opens a
 * `sgs_text_decls(` call, return the substring spanning to its matching
 * closing paren (balance counted on the CALL-MASKED text, so a paren
 * character living inside a string literal can never miscount).
 *
 * @param {string} callMasked Text with comments+strings masked.
 * @param {number} openIdx    Index of the opening `(`.
 * @return {number} Index of the matching closing `)`, or -1 if unbalanced.
 */
function findMatchingParen( callMasked, openIdx ) {
	let depth = 0;
	for ( let i = openIdx; i < callMasked.length; i++ ) {
		if ( callMasked[ i ] === '(' ) {
			depth++;
		} else if ( callMasked[ i ] === ')' ) {
			depth--;
			if ( depth === 0 ) {
				return i;
			}
		}
	}
	return -1;
}

/**
 * Line number (1-based) of a character offset in `src`.
 *
 * @param {string} src Source text.
 * @param {number} idx Character offset.
 * @return {number} Line number.
 */
function lineAt( src, idx ) {
	let line = 1;
	for ( let i = 0; i < idx && i < src.length; i++ ) {
		if ( src[ i ] === '\n' ) {
			line++;
		}
	}
	return line;
}

/**
 * Scan one file's source for the trap.
 *
 * @param {string} rel Display path (already relativised).
 * @param {string} src Raw file contents.
 * @return {Object[]} Findings.
 */
function scanSource( rel, src ) {
	const findings = [];

	const callMasked = maskSource( src, true ); // comments + strings masked — for locating real calls
	const argsSource = maskSource( src, false ); // comments only masked — for reading real argument text

	const companionPresent = COMPANION_RE.test( callMasked );

	let match;
	CALL_RE.lastIndex = 0;
	while ( ( match = CALL_RE.exec( callMasked ) ) !== null ) {
		const openIdx = match.index + match[ 0 ].length - 1; // index of the '('
		const closeIdx = findMatchingParen( callMasked, openIdx );
		if ( closeIdx === -1 ) {
			// Unbalanced parens — cannot honestly determine the map contents.
			// Fail CLOSED: count it, never skip it.
			findings.push( {
				kind: 'unparseable-call',
				file: rel,
				line: lineAt( src, match.index ),
				detail: `${ rel }:${ lineAt( src, match.index ) } — a sgs_text_decls( call has unbalanced parentheses and could not be parsed. Counted as a finding rather than silently skipped.`,
			} );
			continue;
		}

		const argsText = argsSource.slice( openIdx + 1, closeIdx );
		const hasGradientKey = GRADIENT_KEY_RE.test( argsText );

		if ( hasGradientKey && ! companionPresent ) {
			findings.push( {
				kind: 'missing-companion',
				file: rel,
				line: lineAt( src, match.index ),
				detail: `${ rel }:${ lineAt( src, match.index ) } — sgs_text_decls() is called with a 'gradient'/'hover_gradient' key in its map, but this file never calls sgs_text_colour_gradient_fallback_rule(). A resolved text gradient becomes an invalid "color:linear-gradient(...)" declaration the browser silently drops — the client's gradient paints nothing.`,
			} );
		}
	}

	return findings;
}

/**
 * @param {string} baseDir Root to scan. Override for --self-test.
 * @return {{findings: Object[], filesScanned: number}}
 */
function scanTree( baseDir = BASE_DIR ) {
	const files = collectFiles( baseDir );
	const findings = [];

	for ( const file of files ) {
		const rel = path.relative( path.resolve( __dirname, '..', '..' ), file ).replace( /\\/g, '/' );
		let src;
		try {
			src = fs.readFileSync( file, 'utf8' );
		} catch ( e ) {
			// Fail CLOSED — a file this gate cannot read is a counted finding,
			// never a silent skip (a skipped file is indistinguishable from a
			// clean one).
			findings.push( {
				kind: 'read-error',
				file: rel,
				line: 0,
				detail: `${ rel } — could not be read (${ e.message }). Counted as a finding rather than silently skipped.`,
			} );
			continue;
		}
		findings.push( ...scanSource( rel, src ) );
	}

	return { findings, filesScanned: files.length };
}

function main() {
	const check = process.argv.includes( '--check' );
	const { findings, filesScanned } = scanTree();

	process.stdout.write( '[check-text-gradient-companion]\n\n' );
	process.stdout.write( `Files scanned: ${ filesScanned }\n` );
	process.stdout.write( `Findings: ${ findings.length }\n` );

	if ( findings.length > 0 ) {
		process.stdout.write( '\n' );
		for ( const f of findings ) {
			process.stdout.write( `  [${ f.kind }] ${ f.detail }\n` );
		}
	}

	if ( check ) {
		process.exit( findings.length > 0 ? 1 : 0 );
	}
	process.exit( 0 );
}

/**
 * --self-test: prove the detector CAN fail, stays quiet on legitimate
 * shapes, and fails CLOSED on an unreadable file.
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

	process.stdout.write( '[check-text-gradient-companion --self-test]\n\n' );

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'ctgc-' ) );
	const blocksDir = path.join( root, 'src', 'blocks' );
	const includesDir = path.join( root, 'includes' );
	fs.mkdirSync( blocksDir, { recursive: true } );
	fs.mkdirSync( includesDir, { recursive: true } );

	const writeBlock = ( slug, body ) => {
		fs.mkdirSync( path.join( blocksDir, slug ), { recursive: true } );
		fs.writeFileSync( path.join( blocksDir, slug, 'render.php' ), body, 'utf8' );
	};

	const writeInclude = ( name, body ) => {
		fs.writeFileSync( path.join( includesDir, name + '.php' ), body, 'utf8' );
	};

	// (a) MUST-FLAG — gradient key present, NO companion call anywhere in file.
	writeBlock(
		'bad-no-companion',
		`<?php
$decls = sgs_text_decls(
	$attributes,
	array(
		'base'     => 'titleColour',
		'hover'    => 'titleColourHover',
		'gradient' => 'titleColourGradient',
	)
);
echo sgs_emit_state_colour_css( $sel, $decls['normal'], $decls['hover'] );
?>`
	);

	// (b) MUST-NOT-FLAG — gradient key present, companion call IS present.
	writeBlock(
		'good-with-companion',
		`<?php
$decls = sgs_text_decls(
	$attributes,
	array(
		'base'     => 'titleColour',
		'gradient' => 'titleColourGradient',
	)
);
$resolved = sgs_resolve_text_colour_or_gradient( $a, $b );
echo sgs_text_colour_gradient_fallback_rule( $sel, $resolved );
?>`
	);

	// (b2) MUST-NOT-FLAG — hover_gradient key specifically, companion present.
	writeBlock(
		'good-hover-gradient-with-companion',
		`<?php
$decls = sgs_text_decls(
	$attributes,
	array(
		'base'           => 'navColour',
		'hover'          => 'navColourHover',
		'hover_gradient' => 'navColourHoverGradient',
	)
);
echo sgs_text_colour_gradient_fallback_rule( $sel . ':hover', $resolved_hover );
?>`
	);

	// (c) MUST-NOT-FLAG — sgs_text_decls() called with NO gradient key at all.
	writeInclude(
		'good-no-gradient-key',
		`<?php
$decls = sgs_text_decls(
	$attributes,
	array(
		'base'  => 'labelColour',
		'hover' => 'labelColourHover',
	)
);
echo sgs_emit_state_colour_css( $sel, $decls['normal'], $decls['hover'] );
?>`
	);

	// (d) MUST-NOT-FLAG — a comment merely mentions the function name (the
	// exact "commented-out call is a deleted fix" trap named in the brief).
	writeBlock(
		'good-commented-mention',
		`<?php
// Old approach, removed:
// $decls = sgs_text_decls( $attributes, array( 'base' => 'x', 'gradient' => 'y' ) );
/*
 * See sgs_text_decls( $attributes, array( 'gradient' => 'z' ) ) for reference.
 */
?>`
	);

	// (d2) MUST-NOT-FLAG — a STRING literal merely mentions the function name.
	writeInclude(
		'good-string-mention',
		`<?php
$doc = 'Call sgs_text_decls( $attrs, array( "gradient" => "x" ) ) like this.';
echo $doc;
?>`
	);

	// (e) MUST-NOT-FLAG — the docblock example shape from helpers-colour-
	// variants.php itself: a gradient key inside a comment, function DEFINED
	// (not called) in the same file.
	writeInclude(
		'good-definition-only',
		`<?php
/**
 * @param array $map [ 'base' => 'titleColour', 'hover' => 'titleColourHover',
 *                      'gradient' => '…', 'hover_gradient' => '…' ].
 */
function sgs_text_decls( array $attributes, array $map ): array {
	return array( 'normal' => array(), 'hover' => array() );
}
?>`
	);

	// (f) MUST-NOT-FLAG — a similarly-named function is not confused with the
	// real one (no false match on a longer identifier).
	writeInclude(
		'good-similar-name',
		`<?php
$decls = sgs_text_decls_variant(
	$attributes,
	array( 'base' => 'x', 'gradient' => 'y' )
);
?>`
	);

	// (g) FAIL CLOSED — a "render.php" that is actually a directory. readFileSync
	// throws EISDIR; this must be a COUNTED finding, never a silent skip.
	fs.mkdirSync( path.join( blocksDir, 'unreadable-fixture', 'render.php' ), { recursive: true } );

	const { findings, filesScanned } = scanTree( root );
	const at = ( name ) => findings.filter( ( f ) => f.file.includes( name ) );

	assert( 'CATCHES gradient key with no companion call', at( 'bad-no-companion' ).length === 1 );
	assert( 'flags the correct kind for a missing companion', at( 'bad-no-companion' )[ 0 ] && at( 'bad-no-companion' )[ 0 ].kind === 'missing-companion' );
	assert( 'does NOT flag gradient key WITH companion call', at( 'good-with-companion' ).length === 0 );
	assert( 'does NOT flag hover_gradient key WITH companion call', at( 'good-hover-gradient-with-companion' ).length === 0 );
	assert( 'does NOT flag a call with no gradient key at all', at( 'good-no-gradient-key' ).length === 0 );
	assert( 'does NOT flag a commented-out mention of the function name', at( 'good-commented-mention' ).length === 0 );
	assert( 'does NOT flag a string literal merely mentioning the function name', at( 'good-string-mention' ).length === 0 );
	assert( 'does NOT flag the function DEFINITION + docblock example', at( 'good-definition-only' ).length === 0 );
	assert( 'does NOT flag a longer, similarly-named function', at( 'good-similar-name' ).length === 0 );
	assert( 'FAILS CLOSED on an unreadable file (counted, not skipped)', at( 'unreadable-fixture' ).length === 1 );
	assert( 'unreadable finding is kind read-error', at( 'unreadable-fixture' )[ 0 ] && at( 'unreadable-fixture' )[ 0 ].kind === 'read-error' );
	assert( 'CORPUS-SIZE — every fixture file was actually opened (9 files)', filesScanned === 9 );
	assert( 'TOTAL findings are exactly 2 (1 missing-companion + 1 read-error)', findings.length === 2 );

	fs.rmSync( root, { recursive: true, force: true } );

	process.stdout.write(
		failures.length === 0
			? '\n[check-text-gradient-companion --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-text-gradient-companion --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( failures.length === 0 ? 0 : 1 );
}

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		runSelfTest();
	} else {
		main();
	}
}

module.exports = { scanTree, collectFiles, scanSource, maskSource };
