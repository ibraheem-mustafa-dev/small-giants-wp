/**
 * audit-serverside-render-disabled.js
 *
 * Finds every `<ServerSideRender` JSX usage across `src/blocks/*\/edit.js` and
 * flags any that is NOT wrapped in `<Disabled>` (from `@wordpress/components`)
 * anywhere in its JSX ancestor chain within the same `return ( ... )`
 * statement.
 *
 * WHY THIS MATTERS: `<ServerSideRender>` injects raw server-rendered HTML
 * straight into the block editor's DOM — real `<a href>` / `<iframe>`
 * elements included. Without `<Disabled>` wrapping it, clicking a hyperlinked
 * element inside the canvas (a menu link, a phone/email link, a map iframe)
 * navigates the editor tab instead of selecting the block. `<Disabled>` makes
 * the whole subtree inert (pointer-events + focus trapping) without changing
 * the rendered markup, which is exactly what an editor PREVIEW needs.
 *
 * Modelled on `scripts/audit-inline-styling.js`'s shape/CLI conventions:
 * balanced-region text scanning (no full AST/babel dependency), a `--check`
 * mode that exits non-zero on any violation, human-readable console summary.
 *
 * Usage
 * -----
 *   node scripts/consistency/audit-serverside-render-disabled.js           # survey + report
 *   node scripts/consistency/audit-serverside-render-disabled.js --check   # CI gate
 *
 * Outputs
 * -------
 *   .claude/reports/serverside-render-disabled-audit-<DATE-STAMPED-BY-CALLER>.json
 *   (the JSON is always freshly generated; filename is fixed, not date-stamped,
 *   so re-runs overwrite rather than accumulate)
 *
 * READ-ONLY: this script never writes to any block source file. It only
 * writes its own report file(s).
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..', '..' ); // plugins/sgs-blocks
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const REPORTS_DIR = path.join( ROOT, '..', '..', '.claude', 'reports' );

const OUT_JSON = path.join( REPORTS_DIR, 'serverside-render-disabled-audit.json' );
const OUT_MD = path.join( REPORTS_DIR, 'serverside-render-disabled-audit.md' );

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

/** 1-based line number of `offset` within `src`. */
function lineAt( src, offset ) {
	let line = 1;
	for ( let i = 0; i < offset && i < src.length; i++ ) {
		if ( '\n' === src[ i ] ) line++;
	}
	return line;
}

/**
 * Strip block + line comments and string/template literal contents from a JS
 * source, replacing their interiors with spaces (preserving length/offsets
 * so line numbers stay accurate). This keeps JSX tag scanning from being
 * confused by `<`/`>` characters that appear inside comments or strings
 * (e.g. help text like "Hover colour (older browsers)" — harmless here, but
 * defensive against anything sharper like a literal arrow `->`).
 *
 * Deliberately does NOT try to fully tokenize JS — this is a heuristic
 * scanner in the same spirit as audit-inline-styling.js, not a parser.
 *
 * @param {string} src Raw file source.
 * @return {string} Source with comment/string interiors blanked (same length).
 */
function blankNonJsxNoise( src ) {
	let out = '';
	let i = 0;
	const len = src.length;
	while ( i < len ) {
		const ch = src[ i ];
		const next = src[ i + 1 ];

		// Line comment.
		if ( '/' === ch && '/' === next ) {
			let j = i;
			while ( j < len && '\n' !== src[ j ] ) j++;
			out += src.slice( i, j ).replace( /[^\n]/g, ' ' );
			i = j;
			continue;
		}

		// Block comment (including JSX `{/* ... */}` — the braces are handled
		// as ordinary characters, only the /* */ interior is blanked).
		if ( '/' === ch && '*' === next ) {
			const end = src.indexOf( '*/', i + 2 );
			const j = -1 === end ? len : end + 2;
			out += src.slice( i, j ).replace( /[^\n]/g, ' ' );
			i = j;
			continue;
		}

		// Single/double-quoted string.
		if ( "'" === ch || '"' === ch ) {
			const quote = ch;
			let j = i + 1;
			while ( j < len && src[ j ] !== quote ) {
				if ( '\\' === src[ j ] ) j++; // skip escaped char
				j++;
			}
			j = Math.min( j + 1, len );
			out += src.slice( i, j ).replace( /[^\n]/g, ' ' );
			i = j;
			continue;
		}

		// Template literal — blank the whole thing (JSX inside a template
		// literal is not a pattern used in this codebase's edit.js files).
		if ( '`' === ch ) {
			let j = i + 1;
			while ( j < len && '`' !== src[ j ] ) {
				if ( '\\' === src[ j ] ) j++;
				j++;
			}
			j = Math.min( j + 1, len );
			out += src.slice( i, j ).replace( /[^\n]/g, ' ' );
			i = j;
			continue;
		}

		out += ch;
		i++;
	}
	return out;
}

/**
 * Capture every top-level `return (` ... `)` region in a cleaned source
 * (comments/strings already blanked). Balanced on parens. This scopes the
 * JSX-ancestor check to "within the same return statement", per the task's
 * own specification — a block's various helper components' `return`s stay
 * separate scopes from the main `Edit` component's `return`, and separate
 * `return`s (e.g. an early-return placeholder) don't bleed into each other.
 *
 * @param {string} cleaned Comment/string-blanked source.
 * @return {Array<{start:number,end:number,text:string}>} Regions, by offset
 *   into `cleaned` (and therefore into the original source too, since
 *   blanking preserves length/offsets).
 */
function captureReturnRegions( cleaned ) {
	const regions = [];
	const returnRe = /\breturn\s*\(/g;
	let m;
	while ( ( m = returnRe.exec( cleaned ) ) !== null ) {
		const parenStart = m.index + m[ 0 ].length - 1; // index of the '('
		let depth = 1;
		let i = parenStart + 1;
		while ( i < cleaned.length && depth > 0 ) {
			if ( '(' === cleaned[ i ] ) depth++;
			else if ( ')' === cleaned[ i ] ) depth--;
			i++;
		}
		const end = i; // just past the matching ')'
		regions.push( {
			start: parenStart + 1,
			end: end - 1,
			text: cleaned.slice( parenStart + 1, end - 1 ),
		} );
	}
	return regions;
}

/**
 * Tokenize JSX tags within a region: opening tags, closing tags, self-closing
 * tags, and fragment shorthand (`<>` / `</>`). Returns tokens in source order
 * with their name, kind, and offset (relative to the region's own start —
 * caller adds the region's base offset to recover absolute file offsets).
 *
 * Heuristic, not a parser: matches `<Name ...>`, `<Name .../>`, `</Name>`,
 * `<>`, `</>`. Skips comparison/generic-looking `<` that isn't followed by a
 * tag-name character or `/` or `>` (defends against stray `<` from arrow-ish
 * text that survived comment/string blanking, though that should be rare).
 *
 * @param {string} region JSX region text.
 * @return {Array<{kind:'open'|'close'|'self',name:string,offset:number}>}
 */
function tokenizeJsxTags( region ) {
	const tokens = [];
	// Fragment shorthand first (no tag name).
	const tagRe = /<(\/?)([A-Za-z][A-Za-z0-9_.]*)?((?:[^<>]|\n)*?)(\/?)>/g;
	let m;
	while ( ( m = tagRe.exec( region ) ) !== null ) {
		const isClose = '/' === m[ 1 ];
		const name = m[ 2 ] || ''; // '' = fragment
		const isSelfClosing = '/' === m[ 4 ];

		if ( isClose ) {
			tokens.push( { kind: 'close', name, offset: m.index } );
		} else if ( isSelfClosing ) {
			tokens.push( { kind: 'self', name, offset: m.index } );
		} else {
			tokens.push( { kind: 'open', name, offset: m.index } );
		}
	}
	return tokens;
}

/**
 * Given a region's tag tokens, compute the JSX ancestor-tag-name stack at
 * the point just BEFORE a given offset (i.e. every tag currently "open").
 * Mismatched closes (an artefact of the heuristic tokenizer, e.g. a stray
 * `<` inside an expression it couldn't fully classify) pop the nearest
 * matching open tag on the stack rather than corrupting the whole scan.
 *
 * @param {Array} tokens    Tokens from tokenizeJsxTags(), in source order.
 * @param {number} beforeOffset Offset (into the same region) to stop before.
 * @return {string[]} Ancestor tag names, outermost first.
 */
function ancestorStackAt( tokens, beforeOffset ) {
	const stack = [];
	for ( const tok of tokens ) {
		if ( tok.offset >= beforeOffset ) break;
		if ( 'open' === tok.kind ) {
			stack.push( tok.name );
		} else if ( 'close' === tok.kind ) {
			// Pop the nearest matching open tag; if none matches, ignore
			// (defends against a heuristic mis-tokenization rather than
			// throwing the whole ancestor stack off for everything after).
			for ( let i = stack.length - 1; i >= 0; i-- ) {
				if ( stack[ i ] === tok.name ) {
					stack.length = i;
					break;
				}
			}
		}
		// 'self' tokens never open scope — nothing to do.
	}
	return stack;
}

// ---------------------------------------------------------------------------
// PER-FILE ANALYSIS
// ---------------------------------------------------------------------------

/**
 * @param {string} filePath Absolute path to an edit.js file.
 * @param {string} blockName block.json `name` for this block dir (best-effort).
 * @return {Array<{file:string,block:string,line:number,wrapped:boolean}>}
 */
function analyseFile( filePath, blockName ) {
	const raw = readIfExists( filePath );
	if ( ! raw || ! raw.includes( 'ServerSideRender' ) ) {
		return [];
	}

	const cleaned = blankNonJsxNoise( raw );
	const regions = captureReturnRegions( cleaned );
	const findings = [];

	// A ServerSideRender usage could in principle sit outside any `return (`
	// paren-wrapped statement (e.g. `return <ServerSideRender .../>;` with no
	// parens) — handle that as a zero-width "region" spanning just the JSX
	// expression itself, so the ancestor stack is simply empty (no wrap).
	const ssrRe = /<ServerSideRender\b/g;
	const claimedOffsets = new Set();

	for ( const region of regions ) {
		const tokens = tokenizeJsxTags( region.text );
		let m;
		const localSsrRe = /<ServerSideRender\b/g;
		while ( ( m = localSsrRe.exec( region.text ) ) !== null ) {
			const absoluteOffset = region.start + m.index;
			claimedOffsets.add( absoluteOffset );
			const stack = ancestorStackAt( tokens, m.index );
			const wrapped = stack.includes( 'Disabled' );
			findings.push( {
				file: path.relative( ROOT, filePath ).replace( /\\/g, '/' ),
				block: blockName,
				line: lineAt( raw, absoluteOffset ),
				wrapped,
				ancestors: stack,
			} );
		}
	}

	// Catch any <ServerSideRender not inside a captured return-paren region
	// (e.g. `return <ServerSideRender ... />;` with no wrapping parens, or a
	// usage inside a ternary branch that itself sits directly in a `return`
	// without an outer paren). These have no ancestor JSX to speak of within
	// the return statement, so they are UNWRAPPED by construction.
	let sm;
	while ( ( sm = ssrRe.exec( cleaned ) ) !== null ) {
		if ( claimedOffsets.has( sm.index ) ) continue;
		findings.push( {
			file: path.relative( ROOT, filePath ).replace( /\\/g, '/' ),
			block: blockName,
			line: lineAt( raw, sm.index ),
			wrapped: false,
			ancestors: [],
		} );
	}

	return findings;
}

function resolveBlockName( blockDir ) {
	const blockJsonPath = path.join( blockDir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) return path.basename( blockDir );
	try {
		const meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
		return meta.name || path.basename( blockDir );
	} catch ( e ) {
		return path.basename( blockDir );
	}
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------

function buildMarkdownReport( allFindings ) {
	const lines = [];
	lines.push( '# SGS Blocks — ServerSideRender `<Disabled>` Wrap Audit' );
	lines.push( '' );
	lines.push( '_Generated by `plugins/sgs-blocks/scripts/consistency/audit-serverside-render-disabled.js`._' );
	lines.push( '' );
	lines.push(
		'Finds every `<ServerSideRender>` JSX usage across `src/blocks/*/edit.js` and reports ' +
			'whether it is wrapped in `<Disabled>` (from `@wordpress/components`) within the same ' +
			'`return ( ... )` statement. An unwrapped usage lets real `<a href>`/`<iframe>` elements ' +
			'stay clickable in the editor canvas, so clicking one navigates instead of selecting the block.'
	);
	lines.push( '' );

	const violations = allFindings.filter( ( f ) => ! f.wrapped );
	const clean = allFindings.filter( ( f ) => f.wrapped );

	lines.push( `## Summary — ${ allFindings.length } total, ${ violations.length } violation(s), ${ clean.length } wrapped` );
	lines.push( '' );
	lines.push( '| Block | File | Line | Wrapped in `<Disabled>`? |' );
	lines.push( '|---|---|---|---|' );
	for ( const f of allFindings ) {
		lines.push( `| ${ f.block } | ${ f.file } | ${ f.line } | ${ f.wrapped ? 'yes' : '**NO**' } |` );
	}
	lines.push( '' );

	if ( violations.length ) {
		lines.push( '## Violations' );
		lines.push( '' );
		for ( const f of violations ) {
			lines.push( `- \`${ f.file }:${ f.line }\` (${ f.block }) — ancestors: ${ f.ancestors.length ? f.ancestors.join( ' > ' ) : '(none)' }` );
		}
		lines.push( '' );
	}

	return lines.join( '\n' );
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main() {
	if ( ! fs.existsSync( BLOCKS_DIR ) ) {
		process.stderr.write( `[audit-serverside-render-disabled] blocks dir not found: ${ BLOCKS_DIR }\n` );
		process.exitCode = 1;
		return;
	}

	const blockDirs = fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && 'extensions' !== d.name )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) )
		.sort();

	const allFindings = [];
	for ( const dir of blockDirs ) {
		const editPath = path.join( dir, 'edit.js' );
		if ( ! fs.existsSync( editPath ) ) continue;
		const blockName = resolveBlockName( dir );
		allFindings.push( ...analyseFile( editPath, blockName ) );
	}

	const violations = allFindings.filter( ( f ) => ! f.wrapped );

	if ( ! fs.existsSync( REPORTS_DIR ) ) {
		fs.mkdirSync( REPORTS_DIR, { recursive: true } );
	}
	const md = buildMarkdownReport( allFindings );
	fs.writeFileSync(
		OUT_JSON,
		JSON.stringify( { generatedAt: new Date().toISOString(), total: allFindings.length, violations: violations.length, findings: allFindings }, null, '\t' ) + '\n',
		'utf8'
	);
	fs.writeFileSync( OUT_MD, md, 'utf8' );

	process.stdout.write( `[audit-serverside-render-disabled] Scanned ${ blockDirs.length } block dirs.\n` );
	process.stdout.write( `  <ServerSideRender> usages found: ${ allFindings.length }\n` );
	process.stdout.write( `  Wrapped in <Disabled>: ${ allFindings.length - violations.length }\n` );
	process.stdout.write( `  NOT wrapped (violations): ${ violations.length }\n` );
	if ( violations.length ) {
		process.stdout.write( '\n  Violations:\n' );
		for ( const f of violations ) {
			process.stdout.write( `    X  ${ f.block }  (${ f.file }:${ f.line })\n` );
		}
	}
	process.stdout.write( `\n  Report written: ${ path.relative( ROOT, OUT_JSON ) }\n` );
	process.stdout.write( `  Report written: ${ path.relative( ROOT, OUT_MD ) }\n` );

	if ( process.argv.includes( '--check' ) ) {
		if ( violations.length ) {
			process.stdout.write( `\n[audit-serverside-render-disabled --check] FAIL — ${ violations.length } unwrapped ServerSideRender usage(s).\n` );
			process.exitCode = 1;
			return;
		}
		process.stdout.write( '\n[audit-serverside-render-disabled --check] PASS — every ServerSideRender usage is wrapped in <Disabled>.\n' );
	}
}

main();
