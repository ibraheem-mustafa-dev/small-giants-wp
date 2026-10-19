#!/usr/bin/env node
'use strict';

/**
 * survey-rich-text-formats.js: every SGS `<RichText>` takes its toolbar formats from one shared list, and every
 * render that prints one sanitises it without inline style (Spec 02 FR-2-4, FR-2-5).
 *
 *   --survey [--json]     census: each RichText's field, its `allowedFormats` state and its role; each `wp_kses_post()`
 *                         and `sgs_rich_text_kses()` call in those blocks' PHP and what the roles file says it prints
 *   --fix [--apply]       unified diff (or, with --apply, the write) of: the `allowedFormats={ CONSTANT }` prop, its
 *                         import from src/utils/rich-text-formats.js, and `wp_kses_post(` -> `sgs_rich_text_kses(` for
 *                         every argument the roles file marks `rich-text`
 *   --check               exit 1 while any RichText has an inline list, no `allowedFormats`, a list other than its
 *                         role's, or no role; while a `rich-text` argument still goes through wp_kses_post(); while a
 *                         kses call in those blocks has no decision; or while the corpus control disagrees
 *   --self-test           the rules against built-in fixtures (no repository file is read or written)
 *   --block <slug>        limit any mode to one block folder (repeatable)
 *
 * Roles live in scripts/data/rich-text-format-roles.json: `fields` maps a file and the source text of its RichText's
 * `value` prop to a constant; `render` maps a PHP file and a kses argument to `rich-text` or to the reason it is not;
 * `allowlist` names block folders whose PHP keeps its own sanitiser. Anything unmapped is listed for a decision,
 * never guessed.
 */

const fs = require( 'fs' );
const path = require( 'path' );
const os = require( 'os' );
const { spawnSync } = require( 'child_process' );
const babelParser = require( '@babel/parser' );

const PLUGIN_ROOT = path.resolve( __dirname, '..' );
const SRC_DIR = path.join( PLUGIN_ROOT, 'src' );
const BLOCKS_DIR = path.join( SRC_DIR, 'blocks' );
const ROLES_FILE = path.join( __dirname, 'data', 'rich-text-format-roles.json' );
const FORMATS_MODULE = path.join( SRC_DIR, 'utils', 'rich-text-formats' );

const CONSTANTS = [ 'RICH_TEXT_BODY', 'RICH_TEXT_BODY_NO_LINK', 'RICH_TEXT_EMPHASIS', 'RICH_TEXT_LINK_ONLY', 'RICH_TEXT_PLAIN' ];
const RICH_TEXT_RENDER = 'rich-text';
const OLD_SANITISER = 'wp_kses_post';
const NEW_SANITISER = 'sgs_rich_text_kses';

const posix = ( p ) => p.split( path.sep ).join( '/' );
const rel = ( abs ) => posix( path.relative( PLUGIN_ROOT, abs ) );

// ─── JavaScript side ────────────────────────────────────────────────────────

function parseJs( source ) {
	return babelParser.parse( source, { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: false } );
}

function walkAst( node, visit ) {
	if ( ! node || 'object' !== typeof node ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walkAst( n, visit ) );
		return;
	}
	if ( 'string' === typeof node.type ) {
		visit( node );
	}
	for ( const key of Object.keys( node ) ) {
		if ( 'loc' === key || 'leadingComments' === key || 'trailingComments' === key || 'innerComments' === key ) {
			continue;
		}
		const child = node[ key ];
		if ( child && 'object' === typeof child ) {
			walkAst( child, visit );
		}
	}
}

/** The local names `RichText` is imported under from @wordpress/block-editor (always including `RichText`). */
function richTextNames( ast ) {
	const names = new Set( [ 'RichText' ] );
	for ( const node of ast.program.body ) {
		if ( 'ImportDeclaration' === node.type && '@wordpress/block-editor' === node.source.value ) {
			for ( const s of node.specifiers ) {
				if ( 'ImportSpecifier' === s.type && 'RichText' === ( s.imported.name || s.imported.value ) ) {
					names.add( s.local.name );
				}
			}
		}
	}
	return names;
}

/**
 * Every `<RichText …>` opening element in one source file.
 *
 * @return {Array<{line:number, field:string, state:string, constant:string|null, attr:Object|null, element:Object}>}
 */
function scanRichText( source ) {
	const ast = parseJs( source );
	const names = richTextNames( ast );
	const found = [];
	walkAst( ast, ( node ) => {
		if ( 'JSXOpeningElement' !== node.type || 'JSXIdentifier' !== node.name.type || ! names.has( node.name.name ) ) {
			return;
		}
		const attrOf = ( n ) => node.attributes.find( ( a ) => 'JSXAttribute' === a.type && a.name.name === n ) || null;
		const valueAttr = attrOf( 'value' );
		const valueExpr = valueAttr && valueAttr.value && 'JSXExpressionContainer' === valueAttr.value.type ? valueAttr.value.expression : null;
		const field = valueExpr ? source.slice( valueExpr.start, valueExpr.end ) : '(no value prop)';
		const attr = attrOf( 'allowedFormats' );
		let state = 'missing';
		let constant = null;
		if ( attr ) {
			const expr = attr.value && 'JSXExpressionContainer' === attr.value.type ? attr.value.expression : null;
			if ( expr && 'ArrayExpression' === expr.type ) {
				state = 'inline';
			} else if ( expr && 'Identifier' === expr.type && CONSTANTS.includes( expr.name ) ) {
				state = 'constant';
				constant = expr.name;
			} else {
				state = 'indirect';
			}
		}
		found.push( { line: node.loc.start.line, field, state, constant, attr, element: node } );
	} );
	return { ast, found };
}

/**
 * A plain count of `<RichText` openings (not `<RichText.Content`), plus openings of any `RichText as X` alias: the
 * corpus control for the AST walk, by a different mechanism (plain text with comments removed; strings still count).
 */
function dumbRichTextCount( raw ) {
	const source = raw.replace( /\/\*[\s\S]*?\*\//g, '' ).replace( /(^|[^:'"`\\])\/\/[^\n]*/g, '$1' );
	const names = [ 'RichText', ...[ ...source.matchAll( /\bRichText\s+as\s+([A-Za-z_$][\w$]*)/g ) ].map( ( m ) => m[ 1 ] ) ];
	return names.reduce( ( n, name ) => n + ( source.match( new RegExp( `<${ name }(?=[\\s>/])`, 'g' ) ) || [] ).length, 0 );
}

function importPathFor( relFile ) {
	let p = posix( path.relative( path.dirname( path.join( PLUGIN_ROOT, relFile ) ), FORMATS_MODULE ) );
	if ( ! p.startsWith( '.' ) ) {
		p = './' + p;
	}
	return p;
}

/** Text edits ({start, end, text}) that give each RichText its role's constant and import what they use. */
function jsEdits( relFile, source, scan, fieldRoles ) {
	const edits = [];
	const needed = new Set();
	for ( const f of scan.found ) {
		const role = fieldRoles[ f.field ];
		if ( ! role || ! CONSTANTS.includes( role ) ) {
			continue;
		}
		if ( 'constant' === f.state && f.constant === role ) {
			needed.add( role );
			continue;
		}
		if ( 'indirect' === f.state ) {
			continue;
		}
		needed.add( role );
		const prop = `allowedFormats={ ${ role } }`;
		if ( f.attr ) {
			edits.push( { start: f.attr.start, end: f.attr.end, text: prop } );
		} else {
			const attrs = f.element.attributes;
			const last = attrs[ attrs.length - 1 ];
			if ( last ) {
				const lineStart = source.lastIndexOf( '\n', last.start ) + 1;
				const indent = source.slice( lineStart, last.start ).match( /^\s*/ )[ 0 ];
				const sameLine = source.slice( lineStart, last.start ).trim() !== '';
				edits.push( { start: last.end, end: last.end, text: sameLine ? ` ${ prop }` : `\n${ indent }${ prop }` } );
			} else {
				edits.push( { start: f.element.name.end, end: f.element.name.end, text: ` ${ prop }` } );
			}
		}
	}
	if ( 0 === needed.size || 0 === edits.length ) {
		return edits;
	}
	const importPath = importPathFor( relFile );
	const body = scan.ast.program.body;
	const existing = body.find( ( n ) => 'ImportDeclaration' === n.type && n.source.value === importPath );
	if ( existing ) {
		const have = new Set( existing.specifiers.map( ( s ) => s.local.name ) );
		const add = [ ...needed ].filter( ( n ) => ! have.has( n ) ).sort();
		const lastSpec = existing.specifiers[ existing.specifiers.length - 1 ];
		if ( add.length && lastSpec ) {
			edits.push( { start: lastSpec.end, end: lastSpec.end, text: ', ' + add.join( ', ' ) } );
		}
	} else {
		const imports = body.filter( ( n ) => 'ImportDeclaration' === n.type );
		const anchor = imports.length ? imports[ imports.length - 1 ].end : 0;
		const line = `import { ${ [ ...needed ].sort().join( ', ' ) } } from '${ importPath }';`;
		edits.push( { start: anchor, end: anchor, text: imports.length ? '\n' + line : line + '\n' } );
	}
	return edits;
}

// ─── PHP side ───────────────────────────────────────────────────────────────

/**
 * The PHP code of a file with everything else blanked to spaces (inline HTML, comments, string contents), offsets
 * and newlines kept, so a call found in it sits at the same index in the original.
 */
function phpCodeMask( source ) {
	const out = source.split( '' );
	const blank = ( from, to ) => {
		for ( let k = from; k < to; k++ ) {
			if ( '\n' !== out[ k ] && '\r' !== out[ k ] ) {
				out[ k ] = ' ';
			}
		}
	};
	let i = 0;
	let inPhp = false;
	const n = source.length;
	while ( i < n ) {
		if ( ! inPhp ) {
			const open = source.indexOf( '<?php', i );
			const openEcho = source.indexOf( '<?=', i );
			const next = [ open, openEcho ].filter( ( x ) => x >= 0 ).sort( ( a, b ) => a - b )[ 0 ];
			if ( undefined === next ) {
				blank( i, n );
				break;
			}
			blank( i, next );
			i = next + ( next === open ? 5 : 3 );
			inPhp = true;
			continue;
		}
		const c = source[ i ];
		const c2 = source.slice( i, i + 2 );
		if ( '?>' === c2 ) {
			inPhp = false;
			i += 2;
		} else if ( '//' === c2 || '#' === c ) {
			let end = i;
			while ( end < n && '\n' !== source[ end ] && '?>' !== source.slice( end, end + 2 ) ) {
				end++;
			}
			blank( i, end );
			i = end;
		} else if ( '/*' === c2 ) {
			const end = source.indexOf( '*/', i + 2 );
			const stop = -1 === end ? n : end + 2;
			blank( i, stop );
			i = stop;
		} else if ( "'" === c || '"' === c ) {
			let end = i + 1;
			while ( end < n && source[ end ] !== c ) {
				end += '\\' === source[ end ] ? 2 : 1;
			}
			blank( i + 1, end );
			i = end + 1;
		} else {
			i++;
		}
	}
	return out.join( '' );
}

/** Every wp_kses_post( … ) and sgs_rich_text_kses( … ) call: its function, argument text and offsets. */
function scanKses( source ) {
	const mask = phpCodeMask( source );
	const calls = [];
	const re = new RegExp( `\\b(${ OLD_SANITISER }|${ NEW_SANITISER })\\s*\\(`, 'g' );
	let m;
	while ( ( m = re.exec( mask ) ) ) {
		const open = m.index + m[ 0 ].length - 1;
		let depth = 0;
		let close = -1;
		for ( let k = open; k < mask.length; k++ ) {
			if ( '(' === mask[ k ] ) {
				depth++;
			} else if ( ')' === mask[ k ] ) {
				depth--;
				if ( 0 === depth ) {
					close = k;
					break;
				}
			}
		}
		if ( -1 === close ) {
			continue;
		}
		calls.push( {
			fn: m[ 1 ],
			start: m.index,
			nameEnd: m.index + m[ 1 ].length,
			arg: source.slice( open + 1, close ).trim(),
			line: source.slice( 0, m.index ).split( '\n' ).length,
		} );
	}
	return calls;
}

function phpEdits( calls, argRoles ) {
	return calls
		.filter( ( c ) => OLD_SANITISER === c.fn && RICH_TEXT_RENDER === argRoles[ c.arg ] )
		.map( ( c ) => ( { start: c.start, end: c.nameEnd, text: NEW_SANITISER } ) );
}

// ─── Shared ─────────────────────────────────────────────────────────────────

/** Apply text edits from the end backwards; inserted line breaks follow the file's own (CRLF or LF). */
function applyEdits( source, edits ) {
	const eol = source.includes( '\r\n' ) ? '\r\n' : '\n';
	let out = source;
	[ ...edits ].sort( ( a, b ) => b.start - a.start ).forEach( ( e ) => {
		out = out.slice( 0, e.start ) + e.text.split( '\n' ).join( eol ) + out.slice( e.end );
	} );
	return out;
}

/** A real unified diff (git diff --no-index, two lines of context); the line-range fallback when git is absent. */
function unifiedDiff( relFile, before, after ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'rtf-diff-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'a' ), before );
		fs.writeFileSync( path.join( dir, 'b' ), after );
		const res = spawnSync( 'git', [ 'diff', '--no-index', '--no-color', '-U2', 'a', 'b' ], { cwd: dir, encoding: 'utf8' } );
		if ( 'string' === typeof res.stdout && res.stdout.includes( '@@' ) ) {
			return res.stdout
				.replace( /^diff --git .*\n(index .*\n)?/, '' )
				.replace( /^--- a\/a$/m, `--- a/${ relFile }` )
				.replace( /^\+\+\+ b\/b$/m, `+++ b/${ relFile }` )
				.trimEnd();
		}
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
	return lineRangeDiff( relFile, before, after );
}

function lineRangeDiff( relFile, before, after ) {
	const a = before.split( '\n' );
	const b = after.split( '\n' );
	let top = 0;
	while ( top < a.length && top < b.length && a[ top ] === b[ top ] ) {
		top++;
	}
	let ea = a.length - 1;
	let eb = b.length - 1;
	while ( ea >= top && eb >= top && a[ ea ] === b[ eb ] ) {
		ea--;
		eb--;
	}
	const from = Math.max( 0, top - 2 );
	const lines = [ `--- a/${ relFile }`, `+++ b/${ relFile }`, `@@ -${ from + 1 } +${ from + 1 } @@` ];
	for ( let k = from; k < top; k++ ) {
		lines.push( ' ' + a[ k ] );
	}
	for ( let k = top; k <= ea; k++ ) {
		lines.push( '-' + a[ k ] );
	}
	for ( let k = top; k <= eb; k++ ) {
		lines.push( '+' + b[ k ] );
	}
	for ( let k = ea + 1; k < Math.min( a.length, ea + 3 ); k++ ) {
		lines.push( ' ' + a[ k ] );
	}
	return lines.join( '\n' );
}

function writeAtomic( abs, text ) {
	const tmp = abs + '.tmp';
	fs.writeFileSync( tmp, text, { encoding: 'utf8' } );
	fs.renameSync( tmp, abs );
}

function listFiles( dir, test ) {
	const out = [];
	if ( ! fs.existsSync( dir ) ) {
		return out;
	}
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const abs = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			if ( '__tests__' !== entry.name && 'node_modules' !== entry.name ) {
				out.push( ...listFiles( abs, test ) );
			}
		} else if ( test( entry.name ) ) {
			out.push( abs );
		}
	}
	return out.sort();
}

function blockSlugOf( relFile ) {
	const m = relFile.match( /^src\/blocks\/([^/]+)\// );
	return m ? m[ 1 ] : null;
}

/**
 * The whole census over a corpus.
 *
 * @param {Object}   corpus
 * @param {Array}    corpus.jsFiles  [{ rel, source }]
 * @param {Function} corpus.phpFilesFor ( slug ) => [{ rel, source }]
 * @param {Object}   corpus.roles    The roles file.
 * @param {Array}    [corpus.only]   Block slugs to limit to.
 */
function census( { jsFiles, phpFilesFor, roles, only } ) {
	const fields = roles.fields || {};
	const render = roles.render || {};
	const allowlist = roles.allowlist || {};
	const result = { richText: [], kses: [], allowlisted: [], unparsed: [], width: [], edits: {} };
	const blocks = new Set();
	for ( const file of jsFiles ) {
		const slug = blockSlugOf( file.rel );
		if ( only && only.length && ! only.includes( slug ) ) {
			continue;
		}
		if ( ! /\bRichText\b/.test( file.source ) ) {
			continue;
		}
		let scan;
		try {
			scan = scanRichText( file.source );
		} catch ( e ) {
			result.unparsed.push( { file: file.rel, error: e.message } );
			continue;
		}
		const dumb = dumbRichTextCount( file.source );
		if ( dumb !== scan.found.length ) {
			result.width.push( { file: file.rel, ast: scan.found.length, plain: dumb } );
		}
		const fieldRoles = fields[ file.rel ] || {};
		for ( const f of scan.found ) {
			const role = fieldRoles[ f.field ] || null;
			let status;
			if ( ! role ) {
				status = 'unmapped';
			} else if ( ! CONSTANTS.includes( role ) ) {
				status = 'unknown-constant';
			} else if ( 'constant' === f.state ) {
				status = f.constant === role ? 'ok' : 'wrong-constant';
			} else if ( 'indirect' === f.state ) {
				status = 'indirect';
			} else {
				status = f.state;
			}
			result.richText.push( { file: f && file.rel, line: f.line, field: f.field, state: f.state, constant: f.constant, role, status } );
		}
		if ( slug && scan.found.length ) {
			blocks.add( slug );
		}
		const edits = jsEdits( file.rel, file.source, scan, fieldRoles );
		if ( edits.length ) {
			result.edits[ file.rel ] = { source: file.source, edits };
		}
	}
	for ( const slug of [ ...blocks ].sort() ) {
		if ( allowlist[ slug ] ) {
			result.allowlisted.push( { block: slug, reason: allowlist[ slug ] } );
			continue;
		}
		for ( const file of phpFilesFor( slug ) ) {
			const argRoles = render[ file.rel ] || {};
			const calls = scanKses( file.source );
			for ( const c of calls ) {
				const decision = argRoles[ c.arg ];
				let status;
				if ( NEW_SANITISER === c.fn ) {
					status = RICH_TEXT_RENDER === decision ? 'ok' : 'unmapped-kses';
				} else if ( undefined === decision ) {
					status = 'unmapped-kses';
				} else if ( RICH_TEXT_RENDER === decision ) {
					status = 'kses-post';
				} else {
					status = 'exempt';
				}
				result.kses.push( { file: file.rel, line: c.line, fn: c.fn, arg: c.arg, decision: decision || null, status } );
			}
			const edits = phpEdits( calls, argRoles );
			if ( edits.length ) {
				result.edits[ file.rel ] = { source: file.source, edits };
			}
		}
	}
	return result;
}

function failures( result ) {
	const bad = [];
	result.richText.filter( ( r ) => 'ok' !== r.status ).forEach( ( r ) => bad.push( `${ r.file }:${ r.line } RichText value={ ${ r.field } }: ${ r.status }${ r.role ? ` (role ${ r.role })` : '' }` ) );
	result.kses.filter( ( k ) => 'ok' !== k.status && 'exempt' !== k.status ).forEach( ( k ) => bad.push( `${ k.file }:${ k.line } ${ k.fn }( ${ k.arg } ): ${ k.status }` ) );
	result.unparsed.forEach( ( u ) => bad.push( `${ u.file }: unparsed (${ u.error })` ) );
	result.width.forEach( ( w ) => bad.push( `${ w.file }: corpus control: AST found ${ w.ast } RichText, a plain count found ${ w.plain }` ) );
	return bad;
}

function crossCheck( roles ) {
	const problems = [];
	for ( const key of [ ...Object.keys( roles.fields || {} ), ...Object.keys( roles.render || {} ) ] ) {
		if ( ! fs.existsSync( path.join( PLUGIN_ROOT, key ) ) ) {
			problems.push( `roles file names ${ key }, which does not exist` );
		}
	}
	for ( const slug of Object.keys( roles.allowlist || {} ) ) {
		if ( ! fs.existsSync( path.join( BLOCKS_DIR, slug ) ) ) {
			problems.push( `roles allowlist names block ${ slug }, which does not exist` );
		}
	}
	for ( const [ file, map ] of Object.entries( roles.fields || {} ) ) {
		for ( const [ field, constant ] of Object.entries( map ) ) {
			if ( ! CONSTANTS.includes( constant ) ) {
				problems.push( `${ file } field ${ field }: ${ constant } is not one of ${ CONSTANTS.join( ', ' ) }` );
			}
		}
	}
	const formats = fs.existsSync( FORMATS_MODULE + '.js' ) ? fs.readFileSync( FORMATS_MODULE + '.js', 'utf8' ) : '';
	for ( const c of CONSTANTS ) {
		if ( ! new RegExp( `export const ${ c }\\b` ).test( formats ) ) {
			problems.push( `src/utils/rich-text-formats.js does not export ${ c }` );
		}
	}
	return problems;
}

function repoCorpus( only ) {
	const jsFiles = listFiles( SRC_DIR, ( n ) => n.endsWith( '.js' ) ).map( ( abs ) => ( { rel: rel( abs ), source: fs.readFileSync( abs, 'utf8' ) } ) );
	const phpFilesFor = ( slug ) =>
		listFiles( path.join( BLOCKS_DIR, slug ), ( n ) => n.endsWith( '.php' ) ).map( ( abs ) => ( { rel: rel( abs ), source: fs.readFileSync( abs, 'utf8' ) } ) );
	const roles = JSON.parse( fs.readFileSync( ROLES_FILE, 'utf8' ) );
	return { jsFiles, phpFilesFor, roles, only };
}

function printSurvey( result ) {
	const count = ( list, key ) => list.reduce( ( acc, r ) => ( { ...acc, [ r[ key ] ]: ( acc[ r[ key ] ] || 0 ) + 1 } ), {} );
	const files = new Set( result.richText.map( ( r ) => r.file ) );
	console.log( `RichText usages: ${ result.richText.length } in ${ files.size } files` );
	console.log( '  by status: ' + JSON.stringify( count( result.richText, 'status' ) ) );
	console.log( '  by allowedFormats state: ' + JSON.stringify( count( result.richText, 'state' ) ) );
	for ( const r of result.richText ) {
		console.log( `  ${ r.status.padEnd( 16 ) } ${ r.file }:${ r.line } value={ ${ r.field } } state=${ r.state }${ r.constant ? ` (${ r.constant })` : '' } role=${ r.role || '-' }` );
	}
	console.log( `kses calls in those blocks' PHP: ${ result.kses.length }` );
	console.log( '  by status: ' + JSON.stringify( count( result.kses, 'status' ) ) );
	for ( const k of result.kses ) {
		console.log( `  ${ k.status.padEnd( 16 ) } ${ k.file }:${ k.line } ${ k.fn }( ${ k.arg } )${ k.decision && RICH_TEXT_RENDER !== k.decision ? ` -- ${ k.decision }` : '' }` );
	}
	result.allowlisted.forEach( ( a ) => console.log( `  allowlisted      src/blocks/${ a.block }/ -- ${ a.reason }` ) );
	console.log( `unrecognised: ${ result.unparsed.length } unparsed file(s), ${ result.width.length } corpus-control mismatch(es)` );
	result.unparsed.forEach( ( u ) => console.log( `  unparsed ${ u.file }: ${ u.error }` ) );
	result.width.forEach( ( w ) => console.log( `  width ${ w.file }: ast ${ w.ast }, plain ${ w.plain }` ) );
	console.log( `files --fix would change: ${ Object.keys( result.edits ).length }` );
}

// ─── Self-test ──────────────────────────────────────────────────────────────

function selfTest() {
	const failuresList = [];
	const expect = ( ok, label ) => {
		console.log( ( ok ? 'ok   ' : 'FAIL ' ) + label );
		if ( ! ok ) {
			failuresList.push( label );
		}
	};
	const literal = [
		"import { RichText } from '@wordpress/block-editor';",
		"import { __ } from '@wordpress/i18n';",
		'export default function Edit( { attributes: { content } } ) {',
		'\treturn (',
		'\t\t<RichText',
		"\t\t\ttagName=\"h2\"",
		'\t\t\tvalue={ content }',
		"\t\t\tallowedFormats={ [ 'core/bold', 'core/italic' ] }",
		'\t\t/>',
		'\t);',
		'}',
		'',
	].join( '\n' );
	const missing = [
		"import { RichText as RT } from '@wordpress/block-editor';",
		"import { RICH_TEXT_PLAIN } from '../../utils/rich-text-formats';",
		'export default function Edit( { attributes: a } ) {',
		'\treturn <RT',
		'\t\tvalue={ a.title }',
		'\t\tonChange={ () => {} }',
		'\t/>;',
		'}',
		'',
	].join( '\n' );
	const correct = [
		"import { RichText } from '@wordpress/block-editor';",
		"import { RICH_TEXT_BODY } from '../../utils/rich-text-formats';",
		'// <RichText value={ x } /> in a comment is not a usage.',
		'export const E = ( { text } ) => <RichText value={ text } allowedFormats={ RICH_TEXT_BODY } />;',
		'export const S = ( { text } ) => <RichText.Content value={ text } />;',
		'',
	].join( '\n' );
	const unmapped = "import { RichText } from '@wordpress/block-editor';\nexport const E = ( { x } ) => <RichText value={ x.note } />;\n";
	const php = [
		'<?php',
		'// wp_kses_post() in a comment is not a call.',
		"$text = (string) ( $attributes['text'] ?? '' );",
		"$price = wp_kses_post( $data['price_html'] );",
		"echo '<p>' . wp_kses_post( $text ) . '</p>';",
		"echo 'it\\'s wp_kses_post( $text ) in a string';",
		'?>',
		"<div>Don't wp_kses_post( $text ) in HTML</div>",
		'<?php echo wp_kses_post( sprintf( "%s", $text ) ); ?>',
		'',
	].join( '\n' );
	const roles = {
		fields: {
			'src/blocks/a/edit.js': { content: 'RICH_TEXT_BODY' },
			'src/blocks/b/edit.js': { 'a.title': 'RICH_TEXT_BODY_NO_LINK' },
			'src/blocks/c/edit.js': { text: 'RICH_TEXT_BODY' },
		},
		render: { 'src/blocks/a/render.php': { $text: 'rich-text', "$data['price_html']": 'WooCommerce price markup, not RichText' } },
		allowlist: { c: 'keeps its own allowlist' },
	};
	const jsFiles = [
		{ rel: 'src/blocks/a/edit.js', source: literal },
		{ rel: 'src/blocks/b/edit.js', source: missing },
		{ rel: 'src/blocks/c/edit.js', source: correct },
		{ rel: 'src/blocks/d/edit.js', source: unmapped },
		{ rel: 'src/blocks/e/edit.js', source: 'export const x = 1;\n' },
	];
	const phpFor = ( slug ) => ( 'a' === slug ? [ { rel: 'src/blocks/a/render.php', source: php } ] : [] );
	const run = ( files, only ) => census( { jsFiles: files, phpFilesFor: phpFor, roles, only } );
	const result = run( jsFiles );
	const byFile = ( f ) => result.richText.filter( ( r ) => r.file === f );

	// 1. classification
	expect( 'inline' === byFile( 'src/blocks/a/edit.js' )[ 0 ]?.status, 'literal: an inline list is found' );
	expect( 'missing' === byFile( 'src/blocks/b/edit.js' )[ 0 ]?.status, 'missing: no allowedFormats is found, through an import alias' );
	expect( 'ok' === byFile( 'src/blocks/c/edit.js' )[ 0 ]?.status && 1 === byFile( 'src/blocks/c/edit.js' ).length, 'correct: the role constant passes; RichText.Content and a comment are not usages' );
	expect( 'unmapped' === byFile( 'src/blocks/d/edit.js' )[ 0 ]?.status, 'unmapped: a field with no role is listed, never guessed' );
	expect( 0 === result.width.length, 'corpus control: the AST and the plain count agree on every fixture' );

	// 2. the PHP side
	const k = ( arg ) => result.kses.find( ( c ) => c.arg === arg );
	expect( 3 === result.kses.length, `php: exactly the three real calls are found (comment, string and HTML mentions are not); found ${ result.kses.length }` );
	expect( 'kses-post' === k( '$text' )?.status, 'php: a rich-text argument through wp_kses_post is a finding' );
	expect( 'exempt' === k( "$data['price_html']" )?.status, 'php: an argument decided as not rich text is exempt' );
	expect( 'unmapped-kses' === k( 'sprintf( "%s", $text )' )?.status, 'php: an undecided argument is listed for a decision' );
	expect( 1 === result.allowlisted.length && 'c' === result.allowlisted[ 0 ].block, 'php: an allowlisted block is skipped with its reason' );

	// 3. the fixes
	const fixed = ( f ) => applyEdits( result.edits[ f ].source, result.edits[ f ].edits );
	const a = fixed( 'src/blocks/a/edit.js' );
	expect( a.includes( 'allowedFormats={ RICH_TEXT_BODY }' ) && ! a.includes( "'core/bold'" ), 'fix literal: the list becomes the role constant' );
	expect( a.includes( "import { RICH_TEXT_BODY } from '../../utils/rich-text-formats';" ), 'fix literal: the import is added after the last import' );
	const b = fixed( 'src/blocks/b/edit.js' );
	expect( b.includes( "\t\tonChange={ () => {} }\n\t\tallowedFormats={ RICH_TEXT_BODY_NO_LINK }\n\t/>" ), 'fix missing: the prop is added on its own line at the attributes\' indent' );
	expect( b.includes( "import { RICH_TEXT_PLAIN, RICH_TEXT_BODY_NO_LINK } from '../../utils/rich-text-formats';" ), 'fix missing: the name joins the existing import' );
	expect( ! result.edits[ 'src/blocks/c/edit.js' ], 'negative control: a correct file gets no edit (byte-identical)' );
	expect( ! result.edits[ 'src/blocks/d/edit.js' ], 'unmapped: --fix never writes a field with no role' );
	const p = fixed( 'src/blocks/a/render.php' );
	expect( p.includes( "echo '<p>' . sgs_rich_text_kses( $text ) . '</p>';" ), 'fix swap: the rich-text argument moves to sgs_rich_text_kses' );
	expect( p.includes( "wp_kses_post( $data['price_html'] )" ) && p.includes( "it\\'s wp_kses_post( $text ) in a string" ), 'fix swap: exempt calls and string mentions are untouched' );

	// 4. idempotence: the fixed corpus is clean and gets no further edit
	const again = run( [
		{ rel: 'src/blocks/a/edit.js', source: a },
		{ rel: 'src/blocks/b/edit.js', source: b },
		{ rel: 'src/blocks/c/edit.js', source: correct },
	] );
	expect( again.richText.every( ( r ) => 'ok' === r.status ), 'idempotence: every fixed RichText passes' );
	expect( 0 === Object.keys( again.edits ).filter( ( f ) => f.endsWith( '.js' ) ).length, 'idempotence: a second --fix changes no script' );
	const phpAgain = census( { jsFiles: [ { rel: 'src/blocks/a/edit.js', source: a } ], phpFilesFor: () => [ { rel: 'src/blocks/a/render.php', source: p } ], roles } );
	expect( 'ok' === phpAgain.kses.find( ( c ) => '$text' === c.arg ).status && ! phpAgain.edits[ 'src/blocks/a/render.php' ], 'idempotence: the swapped call passes and is not swapped again' );

	// 5. --check reads failures; --block limits the corpus
	expect( failures( result ).length > 0, '--check: the unfixed fixtures fail' );
	expect( 0 === failures( run( jsFiles, [ 'c' ] ) ).length, '--block: limiting to a clean block passes' );
	expect( 'wrong-constant' === run( [ { rel: 'src/blocks/c/edit.js', source: correct.replace( 'allowedFormats={ RICH_TEXT_BODY }', 'allowedFormats={ RICH_TEXT_PLAIN }' ) } ] ).richText[ 0 ].status, 'wrong-constant: a list other than the role is a finding' );

	// 6. a mismatch between the AST and the plain count is reported
	const hidden = { rel: 'src/blocks/c/edit.js', source: correct + "const t = '<RichText value>';\n" };
	expect( 1 === run( [ hidden ] ).width.length, 'corpus control: a plain mention the AST does not see is reported' );

	// 7. the PHP mask keeps offsets
	const mask = phpCodeMask( php );
	expect( mask.length === php.length && mask.split( '\n' ).length === php.split( '\n' ).length, 'php mask: offsets and lines are kept' );

	// 8. the atomic writer leaves no temporary file
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'rtf-' ) );
	const target = path.join( dir, 'x.js' );
	writeAtomic( target, 'a' );
	expect( 'a' === fs.readFileSync( target, 'utf8' ) && ! fs.existsSync( target + '.tmp' ), 'write: atomic, no .tmp left' );
	fs.rmSync( dir, { recursive: true, force: true } );

	console.log( `${ failuresList.length ? 'FAILED' : 'PASSED' }: ${ failuresList.length } failing` );
	return failuresList.length ? 1 : 0;
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function main( argv ) {
	const has = ( f ) => argv.includes( f );
	const only = argv.flatMap( ( a, i ) => ( '--block' === a ? [ argv[ i + 1 ] ] : [] ) );
	if ( has( '--self-test' ) ) {
		return selfTest();
	}
	const corpus = repoCorpus( only );
	const problems = crossCheck( corpus.roles );
	const result = census( corpus );
	if ( has( '--survey' ) ) {
		if ( has( '--json' ) ) {
			const { edits, ...rest } = result;
			console.log( JSON.stringify( { ...rest, crossCheck: problems, fixable: Object.keys( edits ) }, null, 2 ) );
		} else {
			printSurvey( result );
			problems.forEach( ( p ) => console.log( `cross-check: ${ p }` ) );
		}
		return 0;
	}
	if ( has( '--fix' ) ) {
		for ( const [ file, { source, edits } ] of Object.entries( result.edits ) ) {
			const after = applyEdits( source, edits );
			if ( has( '--apply' ) ) {
				writeAtomic( path.join( PLUGIN_ROOT, file ), after );
				console.log( `wrote ${ file } (${ edits.length } edit(s))` );
			} else {
				console.log( unifiedDiff( file, source, after ) );
			}
		}
		if ( ! Object.keys( result.edits ).length ) {
			console.log( 'nothing to fix' );
		}
		return 0;
	}
	if ( has( '--check' ) ) {
		const bad = [ ...problems, ...failures( result ) ];
		bad.forEach( ( b ) => console.log( `FAIL ${ b }` ) );
		console.log( bad.length ? `survey-rich-text-formats: ${ bad.length } finding(s)` : 'survey-rich-text-formats: every RichText uses its shared list and every rich-text render is style-free.' );
		return bad.length ? 1 : 0;
	}
	console.log( 'usage: survey-rich-text-formats.js --survey [--json] | --fix [--apply] | --check | --self-test [--block <slug>]' );
	return 2;
}

if ( require.main === module ) {
	process.exitCode = main( process.argv.slice( 2 ) );
}

module.exports = { census, scanRichText, scanKses, phpCodeMask, jsEdits, phpEdits, applyEdits, failures };
