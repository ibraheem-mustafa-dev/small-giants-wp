/**
 * audit-ssr-http-method.js
 *
 * Every `<ServerSideRender>` preview under `src/` must come from the SGS
 * drop-in `src/components/ServerSideRender.js`, which always POSTs. Fails when:
 *  - any file other than the drop-in imports `@wordpress/server-side-render`;
 *  - a file renders `<ServerSideRender` without importing the drop-in;
 *  - the drop-in itself stops passing `httpMethod="POST"`.
 *
 * WHY: core ServerSideRender defaults to GET, which puts EVERY block attribute
 * into the request URL. The host edge (Hostinger's hcdn) answers a request
 * line over 8,192 bytes with 414, and past roughly 11.5 KB of percent-encoded
 * query it drops the whole HTTP/2 connection. Every request sharing that
 * connection dies with it, including the editor's save POST, so the author
 * sees "Updating failed. Could not get a valid response from the server." One
 * pasted custom SVG icon (about 2.4 KB, 52 paths on sgs/nav-drawer-menu) was
 * enough. A POST body has no length limit.
 *
 * Usage
 *   node scripts/consistency/audit-ssr-http-method.js           # report
 *   node scripts/consistency/audit-ssr-http-method.js --check   # exit 1 on any violation
 *   node scripts/consistency/audit-ssr-http-method.js --self-test
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..', '..' );
const SRC = path.join( ROOT, 'src' );
const DROP_IN = path.join( SRC, 'components', 'ServerSideRender.js' );

// A JSX opening at the start of a line; docblock mentions start with `*` or `//`.
const JSX_RE = /^[ \t]*<ServerSideRender(?=[\s/>]|$)/m;
const CORE_IMPORT_RE = /^\s*import\s[^;]*?from\s+['"]@wordpress\/server-side-render['"]/m;
const DROP_IN_IMPORT_RE = /^\s*import\s+ServerSideRender\s+from\s+['"][./]+(?:\/[\w-]+)*\/components\/ServerSideRender['"]/m;
const POST_RE = /<CoreServerSideRender[^]*?httpMethod\s*=\s*(["'])POST\1[^]*?\/>/;

function walk( dir, out ) {
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const p = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			walk( p, out );
		} else if ( /\.(js|jsx|mjs)$/.test( entry.name ) ) {
			out.push( p );
		}
	}
	return out;
}

/**
 * @param {string}  src      File source.
 * @param {boolean} isDropIn Whether this is the drop-in module.
 * @return {string[]} Problems found (empty when clean).
 */
function scanSource( src, isDropIn ) {
	const problems = [];
	if ( isDropIn ) {
		if ( ! POST_RE.test( src ) ) problems.push( 'the drop-in no longer passes httpMethod="POST" to core ServerSideRender' );
		return problems;
	}
	if ( CORE_IMPORT_RE.test( src ) ) problems.push( "imports '@wordpress/server-side-render' directly; import ServerSideRender from components/ServerSideRender instead" );
	if ( JSX_RE.test( src ) && ! DROP_IN_IMPORT_RE.test( src ) ) problems.push( 'renders <ServerSideRender> without importing the SGS drop-in (components/ServerSideRender)' );
	return problems;
}

function selfTest() {
	const core = "import ServerSideRender from '@wordpress/server-side-render';\n\t\t<ServerSideRender block=\"sgs/x\" />\n";
	const good = "import ServerSideRender from '../../components/ServerSideRender';\n\t\t<ServerSideRender block=\"sgs/x\" />\n";
	const comment = ' * wraps <ServerSideRender> in a guard\n';
	const dropInGood = '<CoreServerSideRender\n\t{ ...props }\n\thttpMethod="POST"\n/>';
	const dropInBad = '<CoreServerSideRender { ...props } />';
	const passed = 2 === scanSource( core, false ).length &&
		0 === scanSource( good, false ).length &&
		0 === scanSource( comment, false ).length &&
		0 === scanSource( dropInGood, true ).length &&
		1 === scanSource( dropInBad, true ).length;
	console.log( passed ? 'self-test passed' : 'self-test FAILED' );
	return passed ? 0 : 1;
}

function main() {
	const args = process.argv.slice( 2 );
	if ( args.includes( '--self-test' ) ) process.exit( selfTest() );
	if ( ! fs.existsSync( DROP_IN ) ) {
		console.log( 'src/components/ServerSideRender.js is missing: every SSR preview would fall back to GET.' );
		process.exit( 1 );
	}

	const violations = [];
	let previews = 0;
	for ( const file of walk( SRC, [] ) ) {
		const src = fs.readFileSync( file, 'utf8' );
		if ( file !== DROP_IN && JSX_RE.test( src ) ) previews++;
		scanSource( src, file === DROP_IN ).forEach( ( p ) => violations.push( `${ path.relative( ROOT, file ).split( path.sep ).join( '/' ) }: ${ p }` ) );
	}

	console.log( `Files rendering <ServerSideRender>: ${ previews }; violations: ${ violations.length }` );
	violations.forEach( ( v ) => console.log( `  ${ v }` ) );
	if ( 0 === previews ) {
		console.log( 'No ServerSideRender previews found: the scanner is not seeing src/, treat as a failure.' );
		process.exit( 1 );
	}
	process.exit( args.includes( '--check' ) && violations.length ? 1 : 0 );
}

main();
