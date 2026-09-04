#!/usr/bin/env node
'use strict';

/**
 * check-undefined-refs.js — JS identifiers REFERENCED but never BOUND.
 *
 * THE GAP THIS CLOSES. On 2026-08-22 three blocks shipped broken editors:
 * sgs/text, sgs/quote and sgs/testimonial referenced `borderColourHover` /
 * `firstLetterColourHover` / `quoteColourHover` in JSX without destructuring
 * them (fixed at c7e4ebdb). The file is VALID JavaScript — it parses, it
 * builds, `node --check` passes — and it fails only at RUNTIME, in the editor,
 * in front of the client.
 *
 * No other gate covers this DIRECTION:
 *   - check-undeclared-attrs.py      → destructured in edit.js, undeclared in block.json (INVERSE)
 *   - check-render-undefined-vars.py → undefined PHP variables in render.php (other language)
 *   - check-editor-render-parity.js  → control writes an attr nothing renders (other question)
 *
 * Usage:
 *   node scripts/check-undefined-refs.js            # survey, always exit 0
 *   node scripts/check-undefined-refs.js --check    # gate, exit 1 on any finding
 *   node scripts/check-undefined-refs.js --self-test
 *
 * ⛔ `node --check` is NOT a substitute — it exits 0 on a broken ES module.
 */

const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN_ROOT = path.resolve( __dirname, '..' );
const SRC_DIR = path.join( PLUGIN_ROOT, 'src' );

// Babel resolves transitively via @wordpress/scripts and is NOT a declared
// devDependency. Same fail-CLOSED handling as inspector-scan/core/sources.js:
// if it ever disappears, every AST rule fails loudly rather than reporting a
// clean tree it never actually parsed.
let babelParser = null;
let babelTraverse = null;
let babelAvailable = true;
let babelUnavailableReason = null;

try {
	babelParser = require( '@babel/parser' );
} catch ( e ) {
	babelAvailable = false;
	babelUnavailableReason =
		`@babel/parser could not be required (${ e.message }). It resolves ` +
		'transitively via @wordpress/scripts and is NOT a declared devDependency.';
}

if ( babelAvailable ) {
	try {
		const traverseModule = require( '@babel/traverse' );
		babelTraverse =
			typeof traverseModule === 'function' ? traverseModule : traverseModule.default;
		if ( typeof babelTraverse !== 'function' ) {
			throw new Error( '@babel/traverse did not export a callable default' );
		}
	} catch ( e ) {
		babelAvailable = false;
		babelUnavailableReason =
			`@babel/traverse could not be required (${ e.message }). Same ` +
			'undeclared-transitive-dependency risk as @babel/parser.';
	}
}

// Byte-identical to inspector-scan/core/sources.js:49-59 — one parse contract
// for the whole repo. If that list changes, change it here in the same commit.
const BABEL_PARSE_OPTS = {
	sourceType: 'module',
	plugins: [
		'jsx',
		'classProperties',
		'objectRestSpread',
		'optionalChaining',
		'nullishCoalescingOperator',
	],
	errorRecovery: false,
};

/**
 * Runtime globals this codebase legitimately references without importing.
 *
 * Explicit list on purpose — the `globals` npm package would be a SECOND
 * undeclared transitive dependency, which is the exact fragility the
 * fail-closed babel handling above exists to manage.
 *
 * `require` is here DELIBERATELY: src/blocks/product-search/edit.js:17-25 uses
 * it inside a try/catch to degrade gracefully when the experimental
 * NumberControl is absent. Legitimate, not a defect.
 */
const GLOBALS = new Set( [
	'window', 'document', 'wp', 'globalThis', 'process', 'require', 'module', 'exports',
	'console', 'fetch', 'navigator', 'performance', 'location', 'history', 'screen',
	'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
	'Set', 'Map', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'Proxy', 'Reflect', 'BigInt',
	'Error', 'TypeError', 'RangeError', 'SyntaxError',
	'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'structuredClone', 'queueMicrotask',
	'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
	'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback',
	'getComputedStyle', 'matchMedia',
	'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'PerformanceObserver',
	'localStorage', 'sessionStorage', 'indexedDB',
	'URL', 'URLSearchParams', 'Image', 'Audio', 'Node', 'Element', 'HTMLElement',
	'CustomEvent', 'Event', 'FormData', 'AbortController', 'Blob', 'File', 'FileReader',
	'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
	'atob', 'btoa', 'CSS', 'DOMParser', 'XMLSerializer', 'SVGElement',
	'AudioContext', 'webkitAudioContext', 'DOMRect', 'DataTransfer',
	'HTMLCanvasElement', 'HTMLImageElement', 'HTMLVideoElement', 'HTMLInputElement',
	// Canvas 2D pixel-buffer constructor — used by fx-generative-background.js
	// to build a putImageData()-ready OKLCH gradient. Genuine browser global.
	'ImageData',
	// Web Crypto API — used by generateItemKey.js for a stable per-repeater-
	// item identity (crypto.randomUUID()). Genuine browser global, available
	// in the WP editor's secure-context iframe.
	'crypto',
] );

/**
 * Recursively collect every .js file under a base directory.
 *
 * ⛔ Deliberately NOT inspector-scan's roster.js: that enumerator only admits
 * directories containing a block.json, which EXCLUDES src/components/. A shared
 * control carrying an undefined reference would then be invisible across every
 * block that mounts it — the exact corpus gap recorded for rule 26.
 *
 * @param {string} baseDir Root to walk. Override for --self-test.
 * @return {string[]} Absolute paths, sorted.
 */
function collectFiles( baseDir = SRC_DIR ) {
	const out = [];
	if ( ! fs.existsSync( baseDir ) ) {
		return out;
	}
	const walk = ( dir ) => {
		for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
			const full = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				if ( entry.name === 'node_modules' || entry.name === 'build' ) {
					continue;
				}
				walk( full );
			} else if ( entry.isFile() && entry.name.endsWith( '.js' ) ) {
				out.push( full );
			}
		}
	};
	walk( baseDir );
	return out.sort();
}

/**
 * True when a JSX name is an intrinsic HTML/SVG tag (`div`, `foreignObject`)
 * rather than a component reference that must resolve to a binding.
 *
 * @param {string} name JSX identifier name.
 * @return {boolean}
 */
function isIntrinsicJsxTag( name ) {
	return /^[a-z]/.test( name ) || name.includes( '-' );
}

/**
 * Scan one file for referenced-but-unbound identifiers.
 *
 * A parse failure is a COUNTED FINDING, never a silent skip: a skipped file
 * reports zero findings, which is indistinguishable from a clean file. That is
 * the vacuity mode this gate must not have.
 *
 * @param {string} file Absolute path.
 * @param {string} rel  Display path.
 * @return {Object[]} Findings.
 */
function scanFile( file, rel ) {
	const findings = [];
	const text = fs.readFileSync( file, 'utf8' );

	// Honour ESLint's own `/* global name, other */` directive rather than
	// hardcoding optional globals into this script. The declaration lives in
	// the file that depends on it, shows up in review, and is already the
	// convention this codebase uses (post-grid/view.js, header-behaviours/view.js).
	const declaredGlobals = new Set();
	const GLOBAL_DIRECTIVE_RE = /\/\*\s*globals?\s+([^*]+?)\*\//g;
	for ( const m of text.matchAll( GLOBAL_DIRECTIVE_RE ) ) {
		for ( const raw of m[ 1 ].split( ',' ) ) {
			const name = raw.split( ':' )[ 0 ].trim();
			if ( name ) {
				declaredGlobals.add( name );
			}
		}
	}

	let ast;
	try {
		ast = babelParser.parse( text, BABEL_PARSE_OPTS );
	} catch ( e ) {
		findings.push( {
			kind: 'parse-error',
			file: rel,
			line: e.loc ? e.loc.line : 0,
			name: null,
			detail: `${ rel } — could not be parsed (${ e.message }). A file this gate cannot parse is a file it cannot check, so it is reported rather than skipped.`,
		} );
		return findings;
	}

	const seen = new Set();

	babelTraverse( ast, {
		'Identifier|JSXIdentifier': ( nodePath ) => {
			const node = nodePath.node;
			const name = node.name;

			if ( ! nodePath.isReferencedIdentifier() ) {
				return;
			}
			if ( nodePath.isJSXIdentifier() && isIntrinsicJsxTag( name ) ) {
				return;
			}
			if ( GLOBALS.has( name ) || declaredGlobals.has( name ) ) {
				return;
			}
			// `typeof X` NEVER throws, even for a name that was never declared —
			// that is the whole point of the optional-global guard pattern
			// (`typeof wpApiSettings !== 'undefined' && wpApiSettings.root`).
			// Flagging it would be a false positive on correct defensive code.
			if (
				nodePath.parentPath &&
				nodePath.parentPath.isUnaryExpression( { operator: 'typeof' } )
			) {
				return;
			}
			if ( nodePath.scope.hasBinding( name ) ) {
				return;
			}

			const line = node.loc ? node.loc.start.line : 0;
			const key = `${ name }|${ line }`;
			if ( seen.has( key ) ) {
				return;
			}
			seen.add( key );

			findings.push( {
				kind: 'undefined-reference',
				file: rel,
				line,
				name,
				detail: `${ rel }:${ line } — "${ name }" is referenced but has no binding in scope. Valid JavaScript; throws a ReferenceError at runtime. If it is a block attribute, add it to the Edit component's OWN destructure — a sibling helper function's scope does not cover the JSX. If it is a genuine runtime global, add it to GLOBALS in this script with a one-line reason.`,
			} );
		},
	} );

	return findings;
}

/**
 * @param {string} baseDir Root to scan. Override for --self-test.
 * @return {{findings: Object[], filesScanned: number}}
 */
function scanTree( baseDir = SRC_DIR ) {
	const files = collectFiles( baseDir );
	const findings = [];
	for ( const file of files ) {
		const rel = path.relative( PLUGIN_ROOT, file ).replace( /\\/g, '/' );
		findings.push( ...scanFile( file, rel ) );
	}
	return { findings, filesScanned: files.length };
}

function main() {
	const check = process.argv.includes( '--check' );

	if ( ! babelAvailable ) {
		process.stdout.write( `[check-undefined-refs] FAILED CLOSED: ${ babelUnavailableReason }\n` );
		process.exit( 1 );
	}

	const { findings, filesScanned } = scanTree();

	process.stdout.write( '[check-undefined-refs]\n\n' );
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

if ( require.main === module ) {
	if ( process.argv.includes( '--self-test' ) ) {
		// eslint-disable-next-line global-require
		require( './check-undefined-refs.selftest.js' ).run( {
			scanTree,
			collectFiles,
			babelAvailable,
			babelUnavailableReason,
		} );
	} else {
		main();
	}
}

module.exports = { scanTree, collectFiles, scanFile, GLOBALS };
