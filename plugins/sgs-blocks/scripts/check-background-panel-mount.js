/**
 * check-background-panel-mount.js
 *
 * `BackgroundMediaPanel` renders the shared Background panel in place inside the caller's own
 * `<InspectorControls group="styles">` (`MediaElementPanel`'s `inGroup="styles"`): a fill nested inside another fill
 * registers after every top-level fill, so the panel's place is only the JSX place when it has no slot of its own.
 * That holds only when every mount sits inside a Styles `InspectorControls` in the same file. A mount outside one, or
 * inside a Settings or default group, would put the Background panel in the wrong tab or nowhere.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-background-panel-mount.js --check      # gate, exit 1 on a mount outside a Styles slot
 *   node scripts/check-background-panel-mount.js --self-test  # proves it can fail
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
const MOUNTS = new Set( [ 'BackgroundPanel', 'BackgroundMediaPanel' ] );
/** The files that define or re-export the panel are not mounts. */
const DEFINERS = new Set( [ 'BackgroundPanel.js', 'BackgroundMediaPanel.js' ] );

function jsFiles( dir ) {
	const out = [];
	for ( const entry of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const full = path.join( dir, entry.name );
		if ( entry.isDirectory() ) {
			out.push( ...jsFiles( full ) );
		} else if ( entry.name.endsWith( '.js' ) && ! DEFINERS.has( entry.name ) ) {
			out.push( full );
		}
	}
	return out;
}

const attr = ( el, name ) => {
	const found = el.openingElement.attributes.find( ( a ) => a.type === 'JSXAttribute' && a.name.name === name );
	if ( ! found ) {
		return undefined;
	}
	return found.value && found.value.type === 'StringLiteral' ? found.value.value : null;
};

/**
 * Findings for one source text: each mount with no enclosing `<InspectorControls group="styles">`.
 *
 * @param {string} text Source.
 * @return {Array<{line: number, name: string}>} Findings.
 */
function scanText( text ) {
	const ast = parser.parse( text, { sourceType: 'module', plugins: [ 'jsx' ] } );
	const findings = [];
	const seen = new Set();
	const walk = ( node, inStyles ) => {
		if ( ! node || 'object' !== typeof node ) {
			return;
		}
		if ( Array.isArray( node ) ) {
			node.forEach( ( n ) => walk( n, inStyles ) );
			return;
		}
		if ( seen.has( node ) ) {
			return;
		}
		seen.add( node );
		let next = inStyles;
		if ( 'JSXElement' === node.type ) {
			const name = node.openingElement.name;
			if ( name && 'JSXIdentifier' === name.type ) {
				if ( 'InspectorControls' === name.name ) {
					next = 'styles' === attr( node, 'group' );
				} else if ( MOUNTS.has( name.name ) && ! inStyles ) {
					findings.push( { line: node.loc.start.line, name: name.name } );
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
	walk( ast.program.body, false );
	return findings;
}

function scanTree( root = SRC ) {
	const findings = [];
	const parseErrors = [];
	for ( const file of jsFiles( root ).sort() ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! /Background(Media)?Panel/.test( text ) ) {
			continue;
		}
		try {
			for ( const f of scanText( text ) ) {
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
	process.stdout.write( '[check-background-panel-mount --self-test]\n\n' );
	const wrap = ( open, mount ) => `export const A = () => (${ open }${ mount }</InspectorControls>);`;
	assert(
		'accepts a mount inside a Styles InspectorControls',
		0 === scanText( wrap( '<InspectorControls group="styles"><PanelBody>x</PanelBody>', '<BackgroundPanel a={ () => 1 } />' ) ).length
	);
	assert(
		'CATCHES a mount inside a default-group InspectorControls',
		1 === scanText( wrap( '<InspectorControls>', '<BackgroundPanel />' ) ).length
	);
	assert(
		'CATCHES a mount inside a Settings InspectorControls',
		1 === scanText( wrap( '<InspectorControls group="settings">', '<BackgroundMediaPanel />' ) ).length
	);
	assert( 'CATCHES a mount with no InspectorControls at all', 1 === scanText( 'export const A = () => (<div><BackgroundPanel /></div>);' ).length );
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'bpm-' ) );
	fs.writeFileSync( path.join( root, 'bad.js' ), 'export const A = () => (<BackgroundPanel />);', 'utf8' );
	fs.writeFileSync( path.join( root, 'good.js' ), 'export const A = () => (<InspectorControls group="styles"><BackgroundPanel /></InspectorControls>);', 'utf8' );
	const tree = scanTree( root );
	assert( 'the tree scan reports the planted file only', 1 === tree.findings.length && 'bad.js' === path.basename( tree.findings[ 0 ].file ) );
	fs.rmSync( root, { recursive: true, force: true } );
	process.stdout.write(
		0 === failures.length
			? '\n[check-background-panel-mount --self-test] ALL ASSERTIONS PASS.\n'
			: `\n[check-background-panel-mount --self-test] ${ failures.length } FAILURE(S).\n`
	);
	process.exit( 0 === failures.length ? 0 : 1 );
}

function check() {
	const { findings, parseErrors } = scanTree();
	for ( const f of findings ) {
		process.stdout.write(
			`${ f.file }:${ f.line } <${ f.name }> is not inside <InspectorControls group="styles">: the Background panel renders in place there.\n`
		);
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( ! findings.length && ! parseErrors.length ) {
		process.stdout.write( '[check-background-panel-mount] OK\n' );
	}
	process.exit( findings.length || parseErrors.length ? 1 : 0 );
}

if ( process.argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( process.argv.includes( '--check' ) ) {
	check();
} else {
	process.stdout.write( 'usage: node scripts/check-background-panel-mount.js --check | --self-test\n' );
	process.exit( 2 );
}
