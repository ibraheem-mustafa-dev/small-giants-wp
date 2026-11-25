/**
 * check-inner-section-depth.js
 *
 * A panel holds light inner sections (`SgsInnerSection`) one level deep and no more. A `PanelBody` or `SgsInnerSection`
 * with two collapsible ancestors in the same JSX tree is a third nesting level: it costs 32px of a 280px sidebar a
 * level and reads as boxes inside boxes. The run-time twin is the warning `SgsInnerSection` prints when it sits inside
 * another inner section.
 *
 * Reach: the JSX nesting a file shows. A component that returns a `PanelBody` and is mounted inside two others in
 * another file is not seen here; `SgsInnerSection`'s run-time warning covers its own case.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-inner-section-depth.js --check      # gate, exit 1 on any third level
 *   node scripts/check-inner-section-depth.js --self-test  # proves it can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const parser = require( '@babel/parser' );

const PLUGIN = path.resolve( __dirname, '..' );
const SRC = path.join( PLUGIN, 'src' );
/** The collapsible panels. A third one deep is the finding. */
const COLLAPSIBLE = new Set( [ 'PanelBody', 'SgsInnerSection' ] );
const MAX_DEPTH = 2;

function jsFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...jsFiles( full ) );
		} else if ( entry.name.endsWith( '.js' ) ) {
			out.push( full );
		}
	}
	return out;
}

/**
 * Findings for one source text: each collapsible panel with more than MAX_DEPTH collapsible ancestors-and-self.
 *
 * @param {string} text Source.
 * @return {Array<{line: number, name: string, depth: number}>} Findings.
 */
function scanText( text ) {
	const ast = parser.parse( text, { sourceType: 'module', plugins: [ 'jsx' ] } );
	const findings = [];
	const seen = new Set();
	const walk = ( node, depth ) => {
		if ( ! node || 'object' !== typeof node ) {
			return;
		}
		if ( Array.isArray( node ) ) {
			node.forEach( ( n ) => walk( n, depth ) );
			return;
		}
		if ( seen.has( node ) ) {
			return;
		}
		seen.add( node );
		let next = depth;
		if ( 'JSXElement' === node.type ) {
			const name = node.openingElement.name;
			if ( name && 'JSXIdentifier' === name.type && COLLAPSIBLE.has( name.name ) ) {
				next = depth + 1;
				if ( next > MAX_DEPTH ) {
					findings.push( { line: node.loc.start.line, name: name.name, depth: next } );
				}
			}
		}
		for ( const key of Object.keys( node ) ) {
			if ( [ 'loc', 'start', 'end', 'range' ].includes( key ) ) {
				continue;
			}
			walk( node[ key ], next );
		}
	};
	walk( ast.program.body, 0 );
	return findings;
}

function scanTree( root = SRC ) {
	const findings = [];
	const parseErrors = [];
	for ( const file of jsFiles( root ).sort() ) {
		try {
			for ( const f of scanText( fs.readFileSync( file, 'utf8' ) ) ) {
				findings.push( { file: path.relative( PLUGIN, file ).split( path.sep ).join( '/' ), ...f } );
			}
		} catch ( e ) {
			parseErrors.push( { file, error: e.message } );
		}
	}
	return { findings, parseErrors };
}

function selfTest() {
	const failures = [];
	const assert = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-inner-section-depth --self-test]\n\n' );
	const deep = scanText(
		'export const A = () => (<PanelBody title="a"><SgsInnerSection title="b"><SgsInnerSection title="c">x</SgsInnerSection></SgsInnerSection></PanelBody>);'
	);
	assert( 'CATCHES an inner section inside an inner section inside a panel', 1 === deep.length && 3 === deep[ 0 ].depth );
	const panels = scanText(
		'export const A = () => (<PanelBody title="a"><PanelBody title="b"><PanelBody title="c">x</PanelBody></PanelBody></PanelBody>);'
	);
	assert( 'CATCHES a PanelBody three deep', 1 === panels.length );
	const viaRenderProp = scanText(
		'export const A = () => (<PanelBody title="a"><SgsInnerSection title="b">{ () => <PanelBody title="c">x</PanelBody> }</SgsInnerSection></PanelBody>);'
	);
	assert( 'CATCHES a third level reached through a render prop', 1 === viaRenderProp.length );
	const ok = scanText(
		'export const A = () => (<><PanelBody title="a"><SgsInnerSection title="b">x</SgsInnerSection><SgsInnerSection title="c">y</SgsInnerSection></PanelBody><PanelBody title="d">z</PanelBody></>);'
	);
	assert( 'does NOT flag a panel with sibling inner sections', 0 === ok.length );

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'isd-' ) );
	fs.writeFileSync(
		path.join( root, 'bad.js' ),
		'export const A = () => (<PanelBody><PanelBody><PanelBody>x</PanelBody></PanelBody></PanelBody>);',
		'utf8'
	);
	fs.writeFileSync( path.join( root, 'good.js' ), 'export const A = () => (<PanelBody>x</PanelBody>);', 'utf8' );
	const tree = scanTree( root );
	assert( 'the tree scan reports the planted file only', 1 === tree.findings.length && 'bad.js' === path.basename( tree.findings[ 0 ].file ) );
	fs.rmSync( root, { recursive: true, force: true } );

	process.stdout.write(
		0 === failures.length
			? '\n[check-inner-section-depth --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-inner-section-depth --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( 0 === failures.length ? 0 : 1 );
}

function check() {
	const { findings, parseErrors } = scanTree();
	for ( const f of findings ) {
		process.stdout.write(
			`${ f.file }:${ f.line } <${ f.name }> is ${ f.depth } collapsible levels deep (limit ${ MAX_DEPTH }): a panel holds inner sections one level deep.\n`
		);
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	process.stdout.write(
		findings.length || parseErrors.length ? '' : '[check-inner-section-depth] OK\n'
	);
	process.exit( findings.length || parseErrors.length ? 1 : 0 );
}

if ( process.argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( process.argv.includes( '--check' ) ) {
	check();
} else {
	process.stdout.write( 'usage: node scripts/check-inner-section-depth.js --check | --self-test\n' );
	process.exit( 2 );
}
