#!/usr/bin/env node
/**
 * survey-experimental-imports.js — the `__experimental*` compat-boundary triad.
 *
 * ONE DETECTOR, THREE MODES (D542, Bean-locked):
 *   --survey  census of every raw `__experimental*` component import
 *   --fix     codemod rewriting them to import from src/components/primitives
 *             (DRY RUN by default; --apply writes)
 *   --check   the gate — exit 1 on any raw import outside the barrel
 *   --self-test  proves the transform and the gate can both fail
 *
 * WHY (Spec 35 Phase 0 item 0d, D565)
 * -----------------------------------
 * Every component primitive this tree imports from WordPress is
 * `__experimental*` — core's explicit statement that it may be renamed or
 * removed with no deprecation cycle. Measured at introduction: 115 import sites
 * across 50 files, 10 symbols. Routing them through one barrel turns a rename
 * from a 50-file emergency into a one-line edit.
 * (This header said 47 when first committed — the number a line-start-anchored
 * grep gave, which this detector itself corrected to 50. Fixed per D566.)
 *
 * THREE TRAPS THIS ENCODES, each measured rather than assumed:
 *
 *  1. TWO SOURCE PACKAGES. `__experimentalBorderRadiusControl` comes from
 *     `@wordpress/block-editor`; the other nine from `@wordpress/components`. A
 *     naive rewrite to one package breaks the build at those sites. The barrel
 *     re-exports each from its own package, so the codemod does not need to care
 *     — but --check must not assume a single package either.
 *
 *  2. TWO QUOTE STYLES. 114 of the 115 import sites use single quotes and tabs;
 *     `src/blocks/icon-list/edit.js` uses DOUBLE quotes and two-space indent. A
 *     single-quote-only regex silently skips it — which is exactly how a codemod
 *     reports "all done" while leaving live violations behind. Both styles are
 *     handled, and the self-test pins the double-quote case.
 *
 * NOT IN SCOPE (deliberately — every occurrence in src/ is inside a COMMENT):
 *   `__experimentalSkipSerialization` and `__experimentalBorder` are block.json
 *   `supports` keys, and `__experimentalGetPreviewDeviceType` is a data-store
 *   selector. None is a component import. The IMPORT_SPECIFIER regex requires an
 *   ` as ` alias inside an import statement, so prose mentions cannot match — and
 *   comments are stripped before scanning regardless.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
// Used by --self-test AND by --fix, which refuses to write a file it cannot
// parse. A codemod that emits a SyntaxError is worse than one that does nothing.
const parser = require( '@babel/parser' );

const REPO_SRC = path.resolve( __dirname, '..', '..', 'src' );
const BARREL_ABS = path.join( REPO_SRC, 'components', 'primitives' );
// Path is compared case-insensitively and separator-normalised: this repo is on
// Windows, where the same file arrives as both `src\...` and `src/...`.
const BARREL_KEY = path.join( 'components', 'primitives', 'index.js' ).toLowerCase();

const WP_PACKAGES = [ '@wordpress/components', '@wordpress/block-editor' ];

/** `import { ... } from '<pkg>'` — both quote styles, multiline. */
const IMPORT_BLOCK = /import\s*\{([^}]*)\}\s*from\s*(['"])(@wordpress\/[a-z-]+)\2\s*;?/g;
/** `__experimentalFoo as Foo` */
const SPECIFIER = /(__experimental[A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_$]+)/g;

/**
 * NON-IMPORT access to the same unstable symbols — the blind spot this gate had
 * on the day it shipped, found by a QC council (D566).
 *
 * `IMPORT_BLOCK` matches only `import { ... } from '@wordpress/...'` statement
 * syntax. Two live files reach `__experimentalNumberControl` through a
 * structurally different path and were invisible to it, so the gate reported
 * 100% coverage while missing them:
 *   src/blocks/filter-search/edit.js  — `const { __experimentalNumberControl: NumberControl } = wp?.components ?? {};`
 *   src/blocks/product-search/edit.js — `( { __experimentalNumberControl: NumberControl } = require( '@wordpress/components' ) );`
 *
 * Both are DELIBERATE compat guards (the symbol may be absent on older WP, and
 * they fall back to TextControl), so they are exempted BY NAME with a reason
 * below rather than migrated — but the gate must SEE them, or "every access goes
 * through the barrel" is a claim nothing checks. `--survey` reports them.
 */
// ⚠ Must NOT require the closing brace right after the alias: product-search
// writes the pattern across three lines with a trailing comma, and the first
// version of this regex silently missed it — the same blind-spot shape, one
// layer down. Caught only because the exemption list named a file the
// detector never reported. `s` flag so the pattern may span lines.
const DESTRUCTURED_ACCESS = /\{[^{}]*?(__experimental[A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_$]+)/gs;

/**
 * Reasoned exemptions for non-import access. Each MUST carry why. An entry here
 * is accepted debt, not an oversight — and it is visible in `--survey` output.
 */
const NON_IMPORT_EXEMPT = {
	'blocks/filter-search/edit.js':
		'deliberate compat guard — reads wp.components at runtime and falls back to TextControl when the experimental export is absent on older WP',
	'blocks/product-search/edit.js':
		'deliberate compat guard — require() inside try/catch so a missing module cannot crash the editor; falls back to TextControl',
	'components/SgsMultiSelectField.js':
		"`__experimentalInvalid` here is a FormTokenField `messages` object KEY (its own documented prop shape, verified live 2026-08-19 against the runtime wp.components bundle — not smuggling an internal import). No component symbol is imported by this name; it's a string key in an object literal passed as a prop value.",
};

/** Strip // and block comments so prose mentions never count as code. */
function stripComments( text ) {
	return text
		.replace( /\/\*[\s\S]*?\*\//g, '' )
		.replace( /(^|[^:])\/\/[^\n]*/g, '$1' );
}

/**
 * Is `index` inside a // or /* *​/ comment within `text`?
 * Needed because an import body may carry prose that happens to mention a
 * specifier, and prose must never be rewritten as code.
 */
function isInsideComment( text, index ) {
	const before = text.slice( 0, index );
	const lineStart = before.lastIndexOf( '\n' ) + 1;
	if ( before.slice( lineStart ).includes( '//' ) ) return true;
	const lastOpen = before.lastIndexOf( '/*' );
	const lastClose = before.lastIndexOf( '*/' );
	return lastOpen > lastClose;
}

function isBarrel( filePath ) {
	return filePath.toLowerCase().replace( /\//g, path.sep ).endsWith( BARREL_KEY );
}

function walk( dir, out = [] ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( entry.name === 'node_modules' ) continue;
			walk( full, out );
		} else if ( /\.(js|jsx)$/.test( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

/**
 * Findings for one file's SOURCE TEXT.
 * Returns [ { symbol, alias, pkg, quote } ].
 */
function findRawImports( text ) {
	const code = stripComments( text );
	const found = [];
	let block;
	IMPORT_BLOCK.lastIndex = 0;
	while ( ( block = IMPORT_BLOCK.exec( code ) ) !== null ) {
		const [ , body, quote, pkg ] = block;
		if ( ! WP_PACKAGES.includes( pkg ) ) continue;
		let spec;
		SPECIFIER.lastIndex = 0;
		while ( ( spec = SPECIFIER.exec( body ) ) !== null ) {
			found.push( { symbol: spec[ 1 ], alias: spec[ 2 ], pkg, quote } );
		}
	}
	return found;
}


/** Non-import access findings for one file's text: [{symbol, alias}]. */
function findNonImportAccess( text ) {
	const code = stripComments( text );
	const out = [];
	let m;
	DESTRUCTURED_ACCESS.lastIndex = 0;
	while ( ( m = DESTRUCTURED_ACCESS.exec( code ) ) !== null ) {
		out.push( { symbol: m[ 1 ], alias: m[ 2 ] } );
	}
	return out;
}

/** Relative specifier from a source file to the barrel, POSIX-style. */
function barrelSpecifier( fileAbs ) {
	let rel = path.relative( path.dirname( fileAbs ), BARREL_ABS ).split( path.sep ).join( '/' );
	if ( ! rel.startsWith( '.' ) ) rel = './' + rel;
	return rel;
}

/**
 * Rewrite one file's text. Returns { text, moved: [aliases] }.
 * Pure — no filesystem — so the self-test can drive it directly.
 */
function transform( text, barrelPath ) {
	const raw = findRawImports( text );
	if ( raw.length === 0 ) return { text, moved: [] };

	const moved = [];
	const quote = raw[ 0 ].quote;

	let out = text.replace( IMPORT_BLOCK, ( whole, body, q, pkg ) => {
		if ( ! WP_PACKAGES.includes( pkg ) ) return whole;

		// ⛔ SURGICAL REMOVAL, not re-serialisation. An earlier version split the
		// body on commas and rebuilt it from the surviving pieces. That SHREDDED
		// any comment inside the import block that contained a comma —
		// `responsive-device-toggle.js` carries a nine-line comment explaining
		// why the `__experimental` prefix is mandatory, and the rebuild scattered
		// its fragments as bare code, producing a SyntaxError. Deleting a
		// load-bearing comment would have been the worse outcome of the two,
		// because it fails silently.
		//
		// So: excise exactly the specifier substrings and leave every other byte
		// of the body — comments, indentation, ordering — untouched.
		let newBody = body;
		SPECIFIER.lastIndex = 0;
		const specs = [ ...body.matchAll( SPECIFIER ) ];
		for ( const m of specs ) {
			// Skip a "specifier" that is actually inside a comment.
			if ( isInsideComment( body, m.index ) ) continue;
			moved.push( m[ 2 ] );
			// Remove the specifier plus its trailing comma and the whitespace of
			// its own line, so no blank hole is left behind.
			const escaped = m[ 0 ].replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
			newBody = newBody.replace(
				new RegExp( `[ \\t]*${ escaped }[ \\t]*,?[ \\t]*\\n?` ),
				''
			);
		}

		if ( moved.length === 0 ) return whole;

		// Anything left that is real code (not just comments/whitespace)?
		const survivingCode = stripComments( newBody ).replace( /[\s,]/g, '' );
		if ( survivingCode === '' ) {
			// No survivors. Drop the statement rather than leave an empty
			// `import {} from '...'` — but if it carried comments, keep them:
			// silently deleting documentation is exactly the failure this
			// rewrite exists to avoid.
			const comments = newBody.match( /\/\/[^\n]*|\/\*[\s\S]*?\*\//g );
			return comments && comments.length ? comments.join( '\n' ) + '\n' : '';
		}
		// A single-line import would otherwise keep a dangling comma
		// (`{ PanelBody,}`) — valid JS, but noise in every reviewer's diff.
		// Multi-line bodies KEEP their trailing comma: that is the house style
		// and removing it would enlarge the diff for no reason.
		if ( ! /\n/.test( newBody ) ) {
			const inner = newBody.replace( /,\s*$/, '' ).trim();
			return `import { ${ inner } } from ${ q }${ pkg }${ q };`;
		}
		return `import {${ newBody }} from ${ q }${ pkg }${ q };`;
	} );

	if ( moved.length === 0 ) return { text, moved: [] };

	// De-duplicate, stable order for a reviewable diff.
	const unique = [ ...new Set( moved ) ].sort();
	const importLine = `import { ${ unique.join( ', ' ) } } from ${ quote }${ barrelPath }${ quote };`;

	// Insert after the LAST surviving import so the new line sits with its peers
	// rather than above the file's docblock.
	const lines = out.split( '\n' );
	let lastImport = -1;
	for ( let i = 0; i < lines.length; i++ ) {
		if ( /^\s*import\s/.test( lines[ i ] ) ) lastImport = i;
		if ( /^\s*}\s*from\s*['"]/.test( lines[ i ] ) ) lastImport = i;
	}
	if ( lastImport === -1 ) {
		out = importLine + '\n' + out;
	} else {
		lines.splice( lastImport + 1, 0, importLine );
		out = lines.join( '\n' );
	}

	// Collapse the blank lines a removed statement leaves behind.
	out = out.replace( /\n{3,}/g, '\n\n' );

	return { text: out, moved: unique };
}

// ---------------------------------------------------------------------------

function collect() {
	return walk( REPO_SRC )
		.filter( ( f ) => ! isBarrel( f ) )
		.map( ( f ) => ( { file: f, findings: findRawImports( fs.readFileSync( f, 'utf8' ) ) } ) )
		.filter( ( r ) => r.findings.length > 0 );
}

/** Non-import access sites, split into exempt and unexempt. */
function collectNonImport() {
	const exempt = [], flagged = [];
	for ( const f of walk( REPO_SRC ) ) {
		if ( isBarrel( f ) ) continue;
		const hits = findNonImportAccess( fs.readFileSync( f, 'utf8' ) );
		if ( ! hits.length ) continue;
		const rel = path.relative( REPO_SRC, f ).split( path.sep ).join( '/' );
		( NON_IMPORT_EXEMPT[ rel ] ? exempt : flagged ).push( { rel, hits } );
	}
	return { exempt, flagged };
}

function modeSurvey() {
	const results = collect();
	const bySymbol = new Map();
	let total = 0;
	for ( const { findings } of results ) {
		for ( const f of findings ) {
			const key = `${ f.symbol } as ${ f.alias }`;
			if ( ! bySymbol.has( key ) ) bySymbol.set( key, { count: 0, pkgs: new Set() } );
			const e = bySymbol.get( key );
			e.count++;
			e.pkgs.add( f.pkg );
			total++;
		}
	}
	console.log( '='.repeat( 78 ) );
	console.log( '  __experimental* COMPONENT IMPORT SURVEY (Spec 35 item 0d)' );
	console.log( '='.repeat( 78 ) );
	console.log( `  files with raw imports : ${ results.length }` );
	console.log( `  total import sites     : ${ total }` );
	console.log( `  distinct symbols       : ${ bySymbol.size }` );
	console.log( '' );
	for ( const [ key, e ] of [ ...bySymbol.entries() ].sort( ( a, b ) => b[ 1 ].count - a[ 1 ].count ) ) {
		const flag = e.pkgs.size > 1 ? '  <-- MULTIPLE PACKAGES' : '';
		console.log( `  ${ String( e.count ).padStart( 3 ) }  ${ key.padEnd( 60 ) } ${ [ ...e.pkgs ].join( ',' ) }${ flag }` );
	}
	console.log( '' );
	console.log( '  Quote styles in play:' );
	const quotes = new Map();
	for ( const { file, findings } of results ) {
		const q = findings[ 0 ].quote;
		quotes.set( q, ( quotes.get( q ) || 0 ) + 1 );
		if ( q === '"' ) console.log( `    double-quoted: ${ path.relative( REPO_SRC, file ) }` );
	}
	console.log( `    ${ [ ...quotes.entries() ].map( ( [ q, n ] ) => `${ q } x${ n } file(s)` ).join( ', ' ) }` );

	// D566 — non-import access, the blind spot this gate shipped with.
	const nonImport = collectNonImport();
	console.log( '' );
	console.log( '  NON-IMPORT access (destructuring wp.components / require()):' );
	if ( ! nonImport.exempt.length && ! nonImport.flagged.length ) {
		console.log( '    none' );
	}
	for ( const f of nonImport.exempt ) {
		console.log( `    EXEMPT  ${ f.rel }  [${ f.hits.map( ( h ) => h.alias ).join( ', ' ) }]` );
		console.log( `            reason: ${ NON_IMPORT_EXEMPT[ f.rel ] }` );
	}
	for ( const f of nonImport.flagged ) {
		console.log( `    FLAGGED ${ f.rel }  [${ f.hits.map( ( h ) => h.alias ).join( ', ' ) }]` );
	}
	return 0;
}

function modeFix( apply ) {
	const results = collect();
	if ( results.length === 0 ) {
		console.log( '[fix] nothing to do — no raw __experimental* component imports.' );
		return 0;
	}
	let changed = 0;
	let refused = 0;
	for ( const { file } of results ) {
		const before = fs.readFileSync( file, 'utf8' );
		const { text, moved } = transform( before, barrelSpecifier( file ) );
		if ( text === before ) continue;

		// ⛔ REFUSE to emit anything that does not parse. On 2026-08-11 an earlier
		// version of this transform produced a SyntaxError in
		// responsive-device-toggle.js by shredding a comma-bearing comment; it was
		// written to disk and only caught later by the build. A codemod that can
		// emit broken syntax must check its own output, not rely on a downstream
		// gate noticing.
		try {
			parser.parse( text, { sourceType: 'module', plugins: [ 'jsx' ] } );
		} catch ( err ) {
			console.log( `  ✗ REFUSED  ${ path.relative( REPO_SRC, file ) } — output would not parse: ${ err.message }` );
			refused++;
			continue;
		}

		changed++;
		console.log( `  ${ apply ? 'WRITE' : 'would rewrite' }  ${ path.relative( REPO_SRC, file ) }  [${ moved.join( ', ' ) }]` );
		if ( apply ) fs.writeFileSync( file, text, 'utf8' );
	}
	if ( refused > 0 ) {
		console.log( '' );
		console.log( `[fix] ⛔ ${ refused } file(s) REFUSED — left untouched. Fix the transform, not the file.` );
	}
	console.log( '' );
	console.log( `[fix] ${ apply ? 'rewrote' : 'DRY RUN — would rewrite' } ${ changed } file(s).` );
	if ( ! apply ) console.log( '[fix] re-run with --apply to write. Review the diff before committing.' );
	return 0;
}

function modeCheck() {
	const results = collect();
	// D566: non-import access is a real bypass of this gate. Unexempted hits FAIL.
	const nonImport = collectNonImport();
	// A stale exemption is its own defect: it reads as "handled" while pointing at
	// nothing. Surface it rather than let the list rot silently.
	const seen = new Set( [ ...nonImport.exempt, ...nonImport.flagged ].map( ( f ) => f.rel ) );
	const stale = Object.keys( NON_IMPORT_EXEMPT ).filter( ( k ) => ! seen.has( k ) );
	if ( stale.length ) {
		console.log( '' );
		console.log( 'BUILD BLOCKED — STALE non-import exemption(s); the file no longer has the access they excuse:' );
		stale.forEach( ( k ) => console.log( `  ${ k }` ) );
		console.log( '  Remove the entry from NON_IMPORT_EXEMPT.' );
		return 1;
	}
	if ( nonImport.flagged.length ) {
		console.log( '' );
		console.log( 'BUILD BLOCKED — __experimental* reached WITHOUT an import statement:' );
		for ( const f of nonImport.flagged ) {
			for ( const h of f.hits ) console.log( `  ${ f.rel }: { ${ h.symbol }: ${ h.alias } }` );
		}
		console.log( '' );
		console.log( '  Destructuring wp.components or require() bypasses the compat boundary just as' );
		console.log( '  surely as a raw import. Route it through src/components/primitives, or add a' );
		console.log( '  reasoned entry to NON_IMPORT_EXEMPT in this file.' );
		return 1;
	}
	if ( results.length === 0 ) {
		const ex = nonImport.exempt.length;
		console.log( `[check-experimental-imports] PASS — every __experimental* component import goes through src/components/primitives${ ex ? ` (+${ ex } reasoned non-import exemption(s))` : '' }.` );
		return 0;
	}
	console.log( '' );
	console.log( 'COMMIT/BUILD BLOCKED — raw __experimental* component import(s) outside the compat boundary:' );
	for ( const { file, findings } of results ) {
		for ( const f of findings ) {
			console.log( `  ${ path.relative( REPO_SRC, file ) }: ${ f.symbol } as ${ f.alias }  (from ${ f.pkg })` );
		}
	}
	console.log( '' );
	console.log( '  Import it from the barrel instead:' );
	console.log( "      import { UnitControl } from '<relative>/components/primitives';" );
	console.log( '  Or run: node scripts/surveys/survey-experimental-imports.js --fix --apply' );
	console.log( '' );
	console.log( '  Why: __experimental* exports can be renamed or removed by core with no' );
	console.log( '  deprecation cycle. One barrel means one file changes, not 47.' );
	return 1;
}

// ---------------------------------------------------------------------------
// Self-test — every rule gets a POSITIVE and a NEGATIVE control.
// ---------------------------------------------------------------------------
const CASES = [
	{
		name: 'POSITIVE — single-quoted import is detected and rewritten',
		input: "import { PanelBody, __experimentalUnitControl as UnitControl } from '@wordpress/components';\n",
		expectMoved: [ 'UnitControl' ],
		mustContain: [ "import { PanelBody } from '@wordpress/components';", "import { UnitControl } from './primitives';" ],
	},
	{
		name: 'POSITIVE — DOUBLE-quoted import is detected too (icon-list/edit.js)',
		input: 'import { PanelBody, __experimentalToggleGroupControl as ToggleGroupControl } from "@wordpress/components";\n',
		expectMoved: [ 'ToggleGroupControl' ],
		mustContain: [ 'import { ToggleGroupControl } from "./primitives";' ],
	},
	{
		name: 'POSITIVE — block-editor is a second source package, not ignored',
		input: "import { useBlockProps, __experimentalBorderRadiusControl as BorderRadiusControl } from '@wordpress/block-editor';\n",
		expectMoved: [ 'BorderRadiusControl' ],
		mustContain: [ "import { useBlockProps } from '@wordpress/block-editor';" ],
	},
	{
		name: 'POSITIVE — an import left with NO survivors is deleted, not left empty',
		input: "import { __experimentalDivider as Divider } from '@wordpress/components';\nconst x = 1;\n",
		expectMoved: [ 'Divider' ],
		mustNotContain: [ '{}' , "{ } from '@wordpress/components'" ],
	},
	{
		name: 'POSITIVE — multiline import keeps its layout for the survivors',
		input: "import {\n\tPanelBody,\n\tSelectControl,\n\t__experimentalUnitControl as UnitControl,\n} from '@wordpress/components';\n",
		expectMoved: [ 'UnitControl' ],
		mustContain: [ 'PanelBody', 'SelectControl' ],
	},
	{
		// REGRESSION GUARD for the defect that broke responsive-device-toggle.js
		// on 2026-08-11: the first transform split the import body on commas and
		// rebuilt it, which scattered a multi-line comment CONTAINING COMMAS into
		// bare code and produced a SyntaxError. Verbatim shape from that file.
		name: 'POSITIVE — a multi-line COMMENT WITH COMMAS inside the import survives intact',
		input:
			"import {\n" +
			"\t// The `__experimental` prefix is REQUIRED, and aliasing it is the\n" +
			"\t// pattern in five callers (nav-menu/edit.js:38-39, fx.js:39-40,\n" +
			"\t// before-after/BooleanResponsiveControl.js:44-45). The unprefixed\n" +
			"\t// names are NOT exported, which React reports as error #130.\n" +
			"\t__experimentalToggleGroupControl as ToggleGroupControl,\n" +
			"\tVisuallyHidden,\n" +
			"} from '@wordpress/components';\n",
		expectMoved: [ 'ToggleGroupControl' ],
		mustContain: [
			'// The `__experimental` prefix is REQUIRED, and aliasing it is the',
			'// before-after/BooleanResponsiveControl.js:44-45). The unprefixed',
			'VisuallyHidden,',
		],
		mustNotContain: [ '\n\tand\n', '__experimentalToggleGroupControl as' ],
		mustParse: true,
	},
	{
		name: 'POSITIVE — comments are KEPT when every specifier is removed',
		input: "import {\n\t// load-bearing note, do not lose\n\t__experimentalDivider as Divider,\n} from '@wordpress/components';\n",
		expectMoved: [ 'Divider' ],
		mustContain: [ '// load-bearing note, do not lose' ],
		mustNotContain: [ "from '@wordpress/components'" ],
	},
	{
		name: 'NEGATIVE — a specifier named inside a COMMENT is not treated as code',
		input: "import {\n\t// we deliberately avoid __experimentalUnitControl as UnitControl here\n\tPanelBody,\n} from '@wordpress/components';\n",
		expectMoved: [],
		unchanged: true,
	},
	{
		name: 'NEGATIVE — a file with no experimental import is untouched',
		input: "import { PanelBody } from '@wordpress/components';\n",
		expectMoved: [],
		unchanged: true,
	},
	{
		name: 'NEGATIVE — a COMMENT mentioning __experimentalSkipSerialization is not an import',
		input: "// block.json declares __experimentalBorder.__experimentalSkipSerialization here\nimport { PanelBody } from '@wordpress/components';\n",
		expectMoved: [],
		unchanged: true,
	},
	{
		name: 'NEGATIVE — a non-WordPress package is not rewritten',
		input: "import { __experimentalThing as Thing } from './local-module';\n",
		expectMoved: [],
		unchanged: true,
	},
	{
		name: 'NEGATIVE — an ALREADY-migrated file is not rewritten twice (idempotent)',
		input: "import { UnitControl } from './primitives';\n",
		expectMoved: [],
		unchanged: true,
	},
];

function selfTest() {
	let failures = 0;

	// ── D566: the non-import blind spot ──────────────────────────────────────
	const niCases = [
		[ 'single-line wp.components destructure IS detected',
		  "const { __experimentalNumberControl: NumberControl } = wp?.components ?? {};", 1 ],
		[ 'MULTI-LINE require() destructure with a trailing comma IS detected',
		  [ '( {', "\t__experimentalNumberControl: NumberControl,", "} = require( '@wordpress/components' ) );" ].join( '\n' ), 1 ],
		[ 'NEGATIVE — an ordinary import is not counted as non-import access',
		  "import { UnitControl } from '../../components/primitives';", 0 ],
		[ 'NEGATIVE — a COMMENT mentioning the pattern is not access',
		  "// we avoid { __experimentalNumberControl: NumberControl } here", 0 ],
	];
	for ( const [ name, src, expected ] of niCases ) {
		const got = findNonImportAccess( src ).length;
		const ok = got === expected;
		if ( ! ok ) failures++;
		console.log( `  [${ ok ? 'PASS' : 'FAIL' }] ${ name }` );
		if ( ! ok ) console.log( `         expected ${ expected } hit(s), got ${ got }` );
	}

	for ( const c of CASES ) {
		const { text, moved } = transform( c.input, './primitives' );
		const problems = [];
		if ( JSON.stringify( moved ) !== JSON.stringify( c.expectMoved ) ) {
			problems.push( `moved=${ JSON.stringify( moved ) } expected ${ JSON.stringify( c.expectMoved ) }` );
		}
		if ( c.unchanged && text !== c.input ) problems.push( 'file was modified but should not be' );
		for ( const s of c.mustContain || [] ) {
			if ( ! text.includes( s ) ) problems.push( `missing: ${ s }` );
		}
		for ( const s of c.mustNotContain || [] ) {
			if ( text.includes( s ) ) problems.push( `should not contain: ${ s }` );
		}
		// PARSE the result. The defect that broke responsive-device-toggle.js was
		// a SyntaxError, and every string assertion above passed on it — only
		// actually parsing the output catches that class.
		if ( c.mustParse ) {
			try {
				parser.parse( text, { sourceType: 'module', plugins: [ 'jsx' ] } );
			} catch ( err ) {
				problems.push( `output does not PARSE: ${ err.message }` );
			}
		}
		if ( problems.length ) {
			failures++;
			console.log( `  [FAIL] ${ c.name }` );
			problems.forEach( ( p ) => console.log( `         ${ p }` ) );
			console.log( `         --- got ---\n${ text }` );
		} else {
			console.log( `  [PASS] ${ c.name }` );
		}
	}

	// Gate-level control: the checker must FLAG a planted violation and CLEAR a
	// clean file. A gate that cannot fail reads green forever.
	const planted = findRawImports( "import { __experimentalUnitControl as UnitControl } from '@wordpress/components';" );
	if ( planted.length !== 1 ) {
		failures++;
		console.log( '  [FAIL] gate control: planted violation was NOT detected' );
	} else {
		console.log( '  [PASS] gate control: a planted raw import IS detected' );
	}
	const clean = findRawImports( "import { UnitControl } from '../../components/primitives';" );
	if ( clean.length !== 0 ) {
		failures++;
		console.log( '  [FAIL] gate control: a migrated import was wrongly flagged' );
	} else {
		console.log( '  [PASS] gate control: a migrated import is NOT flagged' );
	}

	console.log( '' );
	if ( failures ) {
		console.log( `self-test: FAIL (${ failures } of ${ CASES.length + 6 } cases)` );
		return 1;
	}
	console.log( `self-test: PASS (${ CASES.length + 6 } cases — both quote styles, both packages, statement deletion, idempotency, comment immunity, and both gate controls)` );
	return 0;
}

function main() {
	const args = process.argv.slice( 2 );
	if ( args.includes( '--self-test' ) ) return selfTest();
	if ( args.includes( '--check' ) ) return modeCheck();
	if ( args.includes( '--fix' ) ) return modeFix( args.includes( '--apply' ) );
	return modeSurvey();
}

process.exit( main() );
