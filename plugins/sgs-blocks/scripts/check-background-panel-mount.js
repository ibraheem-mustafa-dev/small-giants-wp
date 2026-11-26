/**
 * check-background-panel-mount.js
 *
 * `BackgroundMediaPanel` renders the shared Background panel in place inside the caller's own
 * `<InspectorControls group="styles">` (`MediaElementPanel`'s `inGroup="styles"`): a fill nested inside another fill
 * registers after every top-level fill, so the panel's place is only the JSX place when it has no slot of its own.
 * That holds only when every mount sits inside a Styles `InspectorControls` in the same file. A mount outside one, or
 * inside a Settings or default group, would put the Background panel in the wrong tab or nowhere.
 *
 * The same holds for every `MediaElementPanel` mount (Stage E2): it mounts one `InspectorControls` slot per tab, and a
 * slot nested inside another `InspectorControls` registers after every top-level fill. A mount inside a parent
 * `InspectorControls` (in its own JSX, or through a component or helper the parent calls) must name that parent's group
 * in `inGroup` so its panels render in place (`settings` for a default-group parent), and must not sit inside a
 * `PanelBody` (its panels would nest inside that panel). A mount outside every parent is fine.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-background-panel-mount.js --check      # gate, exit 1 on a Background or media mount in the wrong place
 *   node scripts/check-background-panel-mount.js --survey [--json out.json]  # every MediaElementPanel mount and its parent group
 *   node scripts/check-background-panel-mount.js --self-test  # proves it can fail
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const scan = require( './lib/jsx-scan' );

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

// ---------------------------------------------------------------------------------------------------------------------
// MediaElementPanel mounts (Stage E2)
// ---------------------------------------------------------------------------------------------------------------------

const MEDIA = 'MediaElementPanel';
const SKIP_KEYS = [ 'loc', 'start', 'end', 'range', 'extra', 'leadingComments', 'trailingComments', 'innerComments' ];

/** The group a parent `<InspectorControls>` names: 'styles', 'settings', 'default' (no prop), another string, or 'expr'. */
function groupOf( ic ) {
	const g = scan.prop( ic, 'group' );
	if ( 'absent' === g.kind ) {
		return 'default';
	}
	return 'string' === g.kind ? g.value : 'expr';
}

/** The `inGroup` a mount in a parent of that group must pass: a default-group parent renders in the Settings tab. */
const expectedInGroup = ( group ) => ( 'default' === group ? 'settings' : group );

/** Every identifier name (JSX element names and plain identifiers) referenced under a node. */
function namesUnder( node ) {
	const out = new Set();
	const seen = new Set();
	const walk = ( n ) => {
		if ( ! n || 'object' !== typeof n || seen.has( n ) ) {
			return;
		}
		seen.add( n );
		if ( Array.isArray( n ) ) {
			n.forEach( walk );
			return;
		}
		if ( ( 'JSXIdentifier' === n.type || 'Identifier' === n.type ) && n.name ) {
			out.add( n.name );
		}
		for ( const key of Object.keys( n ) ) {
			if ( ! SKIP_KEYS.includes( key ) ) {
				walk( n[ key ] );
			}
		}
	};
	walk( node );
	return out;
}

/**
 * Facts of one parsed file for the media scan.
 *
 * @param {string} file Absolute path (the relative path is reported).
 * @param {Object} ast  Parsed file.
 * @return {{mounts: Object[], icRefs: Object[], bodies: Map<string, Set<string>>}} Mounts in the file, the names each
 *   `InspectorControls` subtree references (with that parent's group), and the names each named function references.
 */
function fileFacts( file, ast ) {
	const mounts = [];
	const icRefs = [];
	const bodies = new Map();
	scan.walkJsx( ast, ( el, anc ) => {
		const name = scan.jsxName( el );
		if ( 'InspectorControls' === name ) {
			icRefs.push( { group: groupOf( el ), names: namesUnder( el.children ) } );
		}
		if ( MEDIA === name ) {
			const parent = scan.closestJsx( anc, ( a ) => 'InspectorControls' === scan.jsxName( a ) );
			const parentIdx = parent ? anc.indexOf( parent ) : -1;
			const panelBody = parent ? anc.slice( parentIdx ).some( ( a ) => 'JSXElement' === a.type && 'PanelBody' === scan.jsxName( a ) ) : false;
			const inGroup = scan.prop( el, 'inGroup' );
			const prefix = scan.prop( el, 'prefix' );
			const context = scan.prop( el, 'context' );
			mounts.push( {
				file: scan.rel( file ),
				line: el.loc.start.line,
				symbol: scan.enclosingSymbol( anc ),
				prefix: 'string' === prefix.kind ? prefix.value : 'absent' === prefix.kind ? '' : '(expr)',
				context: 'string' === context.kind ? context.value : 'absent' === context.kind ? '(default)' : '(expr)',
				directGroup: parent ? groupOf( parent ) : null,
				insidePanelBody: panelBody,
				inGroup: 'string' === inGroup.kind ? inGroup.value : 'absent' === inGroup.kind ? '' : '(expr)',
			} );
		}
	} );
	// The names each named function references: a helper or component called from a parent InspectorControls carries
	// that parent's group down to the mounts it holds.
	const seen = new Set();
	const visit = ( n ) => {
		if ( ! n || 'object' !== typeof n || seen.has( n ) ) {
			return;
		}
		seen.add( n );
		if ( Array.isArray( n ) ) {
			n.forEach( visit );
			return;
		}
		let sym = '';
		let fn = null;
		if ( 'FunctionDeclaration' === n.type && n.id ) {
			sym = n.id.name;
			fn = n;
		} else if ( 'VariableDeclarator' === n.type && n.id && 'Identifier' === n.id.type && n.init && /Function|CallExpression/.test( n.init.type ) ) {
			sym = n.id.name;
			fn = n.init;
		}
		if ( sym && fn ) {
			const set = bodies.get( sym ) || new Set();
			namesUnder( fn ).forEach( ( x ) => x !== sym && set.add( x ) );
			bodies.set( sym, set );
		}
		for ( const key of Object.keys( n ) ) {
			if ( ! SKIP_KEYS.includes( key ) ) {
				visit( n[ key ] );
			}
		}
	};
	visit( ast.program.body );
	return { mounts, icRefs, bodies };
}

/**
 * Every MediaElementPanel mount under `root`, with its parent group (direct, or inherited through the components and
 * helpers a parent `InspectorControls` calls), whether a `PanelBody` sits between, and the verdict.
 *
 * @param {string} root Directory to scan (default: the plugin `src`).
 * @return {{mounts: Object[], parseErrors: Object[]}} Mounts with `group`, `via`, `expected`, `problem` ('' when fine).
 */
function scanMedia( root = SRC ) {
	const all = [];
	const refs = [];
	const bodies = new Map();
	const parseErrors = [];
	for ( const file of scan.jsFiles( root ) ) {
		if ( 'MediaElementPanel.js' === path.basename( file ) ) {
			continue;
		}
		let ast = null;
		try {
			ast = scan.parse( fs.readFileSync( file, 'utf8' ) );
		} catch ( e ) {
			parseErrors.push( { file, error: e.message } );
			continue;
		}
		const facts = fileFacts( file, ast );
		all.push( ...facts.mounts );
		refs.push( ...facts.icRefs );
		for ( const [ k, v ] of facts.bodies ) {
			const cur = bodies.get( k ) || new Set();
			v.forEach( ( x ) => cur.add( x ) );
			bodies.set( k, cur );
		}
	}
	// Symbols (components and helpers) called inside a parent InspectorControls, with that parent's group.
	const nested = new Map();
	for ( const r of refs ) {
		for ( const n of r.names ) {
			if ( bodies.has( n ) && ! nested.has( n ) ) {
				nested.set( n, r.group );
			}
		}
	}
	for ( let i = 0; i < 6; i++ ) {
		for ( const [ sym, group ] of [ ...nested ] ) {
			for ( const n of bodies.get( sym ) || [] ) {
				if ( bodies.has( n ) && ! nested.has( n ) ) {
					nested.set( n, group );
				}
			}
		}
	}
	for ( const m of all ) {
		let group = m.directGroup;
		let via = group ? 'direct' : '';
		if ( ! group && m.symbol && 'Edit' !== m.symbol && nested.has( m.symbol ) ) {
			group = nested.get( m.symbol );
			via = `through <${ m.symbol }>`;
		}
		m.group = group;
		m.via = via;
		m.expected = group ? expectedInGroup( group ) : '';
		m.problem = '';
		if ( group ) {
			if ( m.insidePanelBody ) {
				m.problem = 'sits inside a PanelBody under its parent InspectorControls: move it out so its panels do not nest in that panel';
			} else if ( ! m.inGroup ) {
				m.problem = `inside <InspectorControls${ 'default' === group ? '' : ` group="${ group }"` }> ${ via }: pass inGroup="${ m.expected }"`;
			} else if ( m.inGroup !== m.expected ) {
				m.problem = `inGroup="${ m.inGroup }" but the parent group is ${ group }: it must be "${ m.expected }"`;
			}
		}
	}
	return { mounts: all, parseErrors };
}

function survey( jsonPath ) {
	const { mounts, parseErrors } = scanMedia();
	const nestedMounts = mounts.filter( ( m ) => m.group );
	process.stdout.write( `[check-background-panel-mount --survey] ${ mounts.length } MediaElementPanel mounts in ${ new Set( mounts.map( ( m ) => m.file ) ).size } files; ${ nestedMounts.length } sit inside a parent InspectorControls (${ nestedMounts.filter( ( m ) => m.problem ).length } need a change)\n` );
	for ( const m of mounts ) {
		process.stdout.write(
			`${ m.file }:${ m.line } ${ m.symbol || '(module)' } prefix="${ m.prefix }" context=${ m.context } parent=${ m.group ? `${ m.group } (${ m.via })` : 'none' } inGroup=${ m.inGroup || '-' }${ m.insidePanelBody ? ' in-PanelBody' : '' }${ m.problem ? `  -> ${ m.problem }` : '' }\n`
		);
	}
	for ( const p of parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	if ( jsonPath ) {
		fs.writeFileSync( jsonPath, JSON.stringify( { mounts, parseErrors }, null, 2 ), 'utf8' );
	}
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

	// MediaElementPanel mounts. Each scenario gets its own tree: jsx-scan-style caches are per path.
	const mediaTree = ( files ) => {
		const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'mep-' ) );
		for ( const [ name, body ] of Object.entries( files ) ) {
			fs.writeFileSync( path.join( dir, name ), body, 'utf8' );
		}
		const found = scanMedia( dir );
		fs.rmSync( dir, { recursive: true, force: true } );
		return found.mounts;
	};
	const one = ( src ) => mediaTree( { 'a.js': src } )[ 0 ];
	assert( 'media: a mount outside every InspectorControls is fine', '' === one( 'export const A = () => (<><InspectorControls /><MediaElementPanel prefix="x" /></>);' ).problem );
	assert( 'media: a mount in a styles parent with a matching inGroup is fine', '' === one( 'export const A = () => (<InspectorControls group="styles"><MediaElementPanel inGroup="styles" /></InspectorControls>);' ).problem );
	assert( 'media: a mount in a default-group parent with inGroup="settings" is fine', '' === one( 'export const A = () => (<InspectorControls><MediaElementPanel inGroup="settings" /></InspectorControls>);' ).problem );
	assert( 'media: CATCHES a mount in a styles parent with no inGroup', /pass inGroup="styles"/.test( one( 'export const A = () => (<InspectorControls group="styles"><MediaElementPanel /></InspectorControls>);' ).problem ) );
	assert( 'media: CATCHES a mount in a default-group parent with no inGroup', /pass inGroup="settings"/.test( one( 'export const A = () => (<InspectorControls><MediaElementPanel /></InspectorControls>);' ).problem ) );
	assert( 'media: CATCHES an inGroup that names the other group', /must be "styles"/.test( one( 'export const A = () => (<InspectorControls group="styles"><MediaElementPanel inGroup="settings" /></InspectorControls>);' ).problem ) );
	assert( 'media: CATCHES a mount inside a PanelBody under the parent', /move it out/.test( one( 'export const A = () => (<InspectorControls group="styles"><PanelBody><MediaElementPanel inGroup="styles" /></PanelBody></InspectorControls>);' ).problem ) );
	const through = mediaTree( {
		'edit.js': 'import { Chrome } from "./chrome"; export const Edit = () => (<InspectorControls group="styles"><Chrome /></InspectorControls>);',
		'chrome.js': 'export const Chrome = () => (<MediaElementPanel prefix="logo" />);',
	} ).find( ( m ) => 'logo' === m.prefix );
	assert( 'media: CATCHES a mount inside a component the parent InspectorControls calls', /through <Chrome>/.test( through.problem ) );
	const callThrough = mediaTree( {
		'edit.js': 'import { slotPanel } from "./h"; export const Edit = () => (<InspectorControls>{ slotPanel( 1 ) }</InspectorControls>);',
		'h.js': 'export const slotPanel = ( n ) => (<MediaElementPanel prefix="s" />);',
	} ).find( ( m ) => 's' === m.prefix );
	assert( 'media: CATCHES a mount inside a helper function the parent calls', /through <slotPanel>/.test( callThrough.problem ) );
	const free = mediaTree( {
		'edit.js': 'import { Chrome } from "./chrome"; export const Edit = () => (<><InspectorControls /><Chrome /></>);',
		'chrome.js': 'export const Chrome = () => (<MediaElementPanel prefix="logo" />);',
	} ).find( ( m ) => 'logo' === m.prefix );
	assert( 'media: a component rendered beside the InspectorControls is fine', '' === free.problem );
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
	const media = scanMedia();
	const bad = media.mounts.filter( ( m ) => m.problem );
	for ( const m of bad ) {
		process.stdout.write( `${ m.file }:${ m.line } <MediaElementPanel prefix="${ m.prefix }"> ${ m.problem }\n` );
	}
	for ( const p of media.parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	const failed = findings.length + parseErrors.length + bad.length + media.parseErrors.length;
	if ( ! failed ) {
		process.stdout.write( '[check-background-panel-mount] OK\n' );
	}
	process.exit( failed ? 1 : 0 );
}

if ( process.argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( process.argv.includes( '--survey' ) ) {
	const i = process.argv.indexOf( '--json' );
	survey( i >= 0 ? process.argv[ i + 1 ] : null );
} else if ( process.argv.includes( '--check' ) ) {
	check();
} else {
	process.stdout.write( 'usage: node scripts/check-background-panel-mount.js --check | --survey [--json out] | --self-test\n' );
	process.exit( 2 );
}
