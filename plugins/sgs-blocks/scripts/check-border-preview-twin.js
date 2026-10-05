#!/usr/bin/env node
/**
 * check-border-preview-twin — every block that mounts the shared border panel
 * previews that border through the panel's twin.
 *
 * `SgsBorderControl` (src/components/SgsBorderControl.js) is the one border
 * panel; `sgsBorderPreview()` (src/utils/border-preview.js) is its editor-canvas
 * twin, taking the same values the panel takes and returning the border the
 * published page paints. A block that rebuilds the border from the separate
 * width / paint / radius pieces drifts from the twin's rules (a colour with no
 * width, a style with no width, whole-tier radii, a stylesheet default border)
 * and the canvas stops matching the page.
 *
 * Rule: a block folder whose edit.js, or a file edit.js imports from inside the
 * same folder, renders `<SgsBorderControl` must call `sgsBorderPreview()` (or a
 * shared util that itself calls it, found by scanning src/utils, such as the
 * container-wrapper preview) somewhere in that folder. A block whose canvas is
 * a ServerSideRender is exempt: the server paints the border there.
 *
 * USAGE
 *   node scripts/check-border-preview-twin.js --check      # exit 1 on any finding
 *   node scripts/check-border-preview-twin.js --self-test  # prove it passes and fails
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const parser = require( '@babel/parser' );

const ROOT = path.resolve( __dirname, '..' );
const BLOCKS_DIR = path.join( ROOT, 'src', 'blocks' );
const UTILS_DIR = path.join( ROOT, 'src', 'utils' );
const TWIN = 'sgsBorderPreview';
const SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'type', 'leadingComments', 'trailingComments', 'innerComments', 'extra' ] );

/**
 * Parse a JS/JSX source file; null when it does not parse.
 *
 * @param {string} file Absolute path.
 * @return {Object|null} Babel AST.
 */
function parse( file ) {
	try {
		return parser.parse( fs.readFileSync( file, 'utf8' ), { sourceType: 'module', plugins: [ 'jsx' ], errorRecovery: true } );
	} catch ( e ) {
		return null;
	}
}

/**
 * Depth-first walk over every AST node.
 *
 * @param {Object}   node  AST node or array.
 * @param {Function} visit Called with each node.
 */
function walk( node, visit ) {
	if ( ! node || 'object' !== typeof node ) return;
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walk( n, visit ) );
		return;
	}
	if ( 'string' === typeof node.type ) visit( node );
	for ( const key of Object.keys( node ) ) {
		if ( ! SKIP_KEYS.has( key ) ) walk( node[ key ], visit );
	}
}

/**
 * Names of the functions called (bare identifiers) inside a node.
 *
 * @param {Object} node AST node.
 * @return {Set<string>} Callee names.
 */
function calleeNames( node ) {
	const names = new Set();
	walk( node, ( n ) => {
		if ( 'CallExpression' === n.type && n.callee && 'Identifier' === n.callee.type ) names.add( n.callee.name );
	} );
	return names;
}

/**
 * Every util that reaches the twin: `sgsBorderPreview` itself, any function in
 * src/utils whose body calls one of these, and any `const alias = fn` of one.
 *
 * @param {string} utilsDir Directory of shared utils.
 * @return {Set<string>} Function names that paint the border through the twin.
 */
function twinCallers( utilsDir ) {
	const fns = new Map();
	const aliases = new Map();
	for ( const name of fs.existsSync( utilsDir ) ? fs.readdirSync( utilsDir ) : [] ) {
		if ( ! name.endsWith( '.js' ) ) continue;
		const ast = parse( path.join( utilsDir, name ) );
		if ( ! ast ) continue;
		walk( ast.program, ( n ) => {
			if ( 'FunctionDeclaration' === n.type && n.id ) fns.set( n.id.name, calleeNames( n.body ) );
			if ( 'VariableDeclarator' === n.type && n.id && 'Identifier' === n.id.type && n.init ) {
				if ( 'ArrowFunctionExpression' === n.init.type || 'FunctionExpression' === n.init.type ) fns.set( n.id.name, calleeNames( n.init.body ) );
				if ( 'Identifier' === n.init.type ) aliases.set( n.id.name, n.init.name );
			}
		} );
	}
	const twins = new Set( [ TWIN ] );
	let grew = true;
	while ( grew ) {
		grew = false;
		for ( const [ name, callees ] of fns ) {
			if ( ! twins.has( name ) && [ ...callees ].some( ( c ) => twins.has( c ) ) ) {
				twins.add( name );
				grew = true;
			}
		}
		for ( const [ name, target ] of aliases ) {
			if ( ! twins.has( name ) && twins.has( target ) ) {
				twins.add( name );
				grew = true;
			}
		}
	}
	return twins;
}

/**
 * Every .js file under a directory, recursively.
 *
 * @param {string} dir Directory.
 * @return {string[]} Absolute paths.
 */
function jsFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) out.push( ...jsFiles( full ) );
		else if ( entry.name.endsWith( '.js' ) && ! entry.name.endsWith( '.test.js' ) ) out.push( full );
	}
	return out;
}

/**
 * edit.js plus every file it imports, transitively, from inside its own folder.
 *
 * @param {string} blockDir Block folder.
 * @return {string[]} Absolute paths.
 */
function editGraph( blockDir ) {
	const seen = new Set();
	const queue = [ path.join( blockDir, 'edit.js' ) ];
	while ( queue.length ) {
		const file = queue.shift();
		if ( seen.has( file ) || ! fs.existsSync( file ) ) continue;
		seen.add( file );
		const ast = parse( file );
		if ( ! ast ) continue;
		walk( ast.program, ( n ) => {
			const source = ( 'ImportDeclaration' === n.type || 'ExportNamedDeclaration' === n.type || 'ExportAllDeclaration' === n.type ) && n.source ? n.source.value : null;
			if ( ! source || ! source.startsWith( '.' ) ) return;
			const base = path.resolve( path.dirname( file ), source );
			if ( ! base.startsWith( blockDir + path.sep ) ) return;
			for ( const candidate of [ base, base + '.js', path.join( base, 'index.js' ) ] ) {
				if ( fs.existsSync( candidate ) && fs.statSync( candidate ).isFile() ) {
					queue.push( candidate );
					break;
				}
			}
		} );
	}
	return [ ...seen ];
}

/**
 * Whether a parsed file renders a JSX element of the given name.
 *
 * @param {Object} ast  Babel AST.
 * @param {string} name Element name.
 * @return {boolean} True when rendered.
 */
function rendersElement( ast, name ) {
	let found = false;
	walk( ast.program, ( n ) => {
		if ( 'JSXOpeningElement' === n.type && n.name && 'JSXIdentifier' === n.name.type && name === n.name.name ) found = true;
	} );
	return found;
}

/**
 * Block folders that mount the border panel without previewing through its twin.
 *
 * @param {string} blocksDir Blocks root.
 * @param {string} utilsDir  Shared utils directory.
 * @return {{findings: Array<{block: string, files: string[]}>, mounted: number, twins: string[]}} Result.
 */
function audit( blocksDir, utilsDir ) {
	const twins = twinCallers( utilsDir );
	const findings = [];
	let mounted = 0;
	for ( const entry of fs.readdirSync( blocksDir, { withFileTypes: true } ) ) {
		if ( ! entry.isDirectory() ) continue;
		const blockDir = path.join( blocksDir, entry.name );
		const mounting = editGraph( blockDir ).filter( ( file ) => {
			const ast = parse( file );
			return ast && rendersElement( ast, 'SgsBorderControl' );
		} );
		if ( ! mounting.length ) continue;
		mounted++;
		let previews = false;
		let serverCanvas = false;
		for ( const file of jsFiles( blockDir ) ) {
			const ast = parse( file );
			if ( ! ast ) continue;
			if ( [ ...calleeNames( ast.program ) ].some( ( c ) => twins.has( c ) ) ) previews = true;
			if ( rendersElement( ast, 'ServerSideRender' ) ) serverCanvas = true;
		}
		if ( ! previews && ! serverCanvas ) {
			findings.push( { block: entry.name, files: mounting.map( ( f ) => path.relative( blocksDir, f ).split( path.sep ).join( '/' ) ) } );
		}
	}
	return { findings, mounted, twins: [ ...twins ].sort() };
}

/**
 * Write a fixture tree for the self-test.
 *
 * @param {string} dir   Root.
 * @param {Object} files Map of relative path to contents.
 */
function writeTree( dir, files ) {
	for ( const [ rel, body ] of Object.entries( files ) ) {
		const full = path.join( dir, rel );
		fs.mkdirSync( path.dirname( full ), { recursive: true } );
		fs.writeFileSync( full, body );
	}
}

/**
 * One passing and one failing fixture block; the gate must flag exactly the failing one.
 *
 * @return {boolean} True when the gate behaves.
 */
function selfTest() {
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-border-twin-' ) );
	try {
		writeTree( tmp, {
			'utils/border-preview.js': 'export function sgsBorderPreview() { return {}; }\n',
			'utils/wrapper.js': "import { sgsBorderPreview } from './border-preview';\nexport function wrapPreview( a ) { return sgsBorderPreview( a ); }\nexport const wrapAlias = wrapPreview;\n",
			'blocks/passes/edit.js': "import Panel from './Panel';\nimport { cardStyle } from './preview-style';\nexport default function Edit() { return <div style={ cardStyle() }><Panel /></div>; }\n",
			'blocks/passes/Panel.js': 'export default function Panel() { return <SgsBorderControl widthValues={ {} } />; }\n',
			'blocks/passes/preview-style.js': "import { sgsBorderPreview } from '../../utils';\nexport function cardStyle( a ) { return sgsBorderPreview( a ); }\n",
			'blocks/passes-via-util/edit.js': 'export default function Edit( { attributes } ) { const s = wrapAlias( attributes ); return <div style={ s }><SgsBorderControl /></div>; }\n',
			'blocks/passes-ssr/edit.js': 'export default function Edit() { return <><SgsBorderControl /><ServerSideRender block="x" /></>; }\n',
			'blocks/fails/edit.js': '// sgsBorderPreview( attributes ) is mentioned only in a comment.\nexport default function Edit( { attributes } ) { const s = borderBoxPreview( attributes.borderWidth ); return <div style={ s }><SgsBorderControl /></div>; }\n',
			'blocks/no-panel/edit.js': 'export default function Edit() { return <div />; }\n',
		} );
		const { findings, mounted } = audit( path.join( tmp, 'blocks' ), path.join( tmp, 'utils' ) );
		const flagged = findings.map( ( f ) => f.block ).sort();
		const ok = 4 === mounted && 1 === flagged.length && 'fails' === flagged[ 0 ];
		console.log( `[border-preview-twin --self-test] mounting blocks: ${ mounted } (expected 4); flagged: ${ JSON.stringify( flagged ) } (expected ["fails"])` );
		return ok;
	} finally {
		fs.rmSync( tmp, { recursive: true, force: true } );
	}
}

function main() {
	const argv = process.argv.slice( 2 );
	if ( argv.includes( '--self-test' ) ) {
		if ( selfTest() ) {
			console.log( '[border-preview-twin --self-test] PASS — the passing fixtures pass and the failing fixture fails.' );
			process.exit( 0 );
		}
		console.error( '[border-preview-twin --self-test] FAIL — the gate did not separate the passing fixtures from the failing one.' );
		process.exit( 1 );
	}
	if ( ! argv.includes( '--check' ) ) {
		console.log( 'usage: node scripts/check-border-preview-twin.js --check | --self-test' );
		process.exit( 0 );
	}
	const { findings, mounted, twins } = audit( BLOCKS_DIR, UTILS_DIR );
	if ( findings.length ) {
		console.error( `[border-preview-twin] FAIL — ${ findings.length } of ${ mounted } block(s) mount SgsBorderControl without previewing through ${ TWIN }():` );
		for ( const f of findings ) console.error( `  ${ f.block }: panel mounted in ${ f.files.join( ', ' ) }` );
		console.error( `  Fix: pass the values that SgsBorderControl call receives to ${ TWIN }() (src/utils/border-preview.js)` );
		console.error( '  on the element render.php paints, in place of the block\'s own border assembly.' );
		console.error( `  Twin-reaching utils accepted: ${ twins.join( ', ' ) }` );
		process.exit( 1 );
	}
	console.log( `[border-preview-twin] PASS — all ${ mounted } block(s) that mount SgsBorderControl preview through ${ TWIN }().` );
	process.exit( 0 );
}

main();
