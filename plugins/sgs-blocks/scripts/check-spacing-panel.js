/**
 * check-spacing-panel.js
 *
 * One shared Spacing panel on every block (Stage E2, item 3). `components/ResponsiveBoxControls.js` is the shared panel
 * (title prop, default "Spacing"). This detector finds every hand-built Padding or Margin pair and every WordPress
 * Dimensions (`supports.spacing`) block that has not moved onto it.
 *
 * Variants (the survey classifies each block by what it mounts today):
 *   A   `ResponsiveOverride` around `SgsBoxControl`, Padding and Margin both (tier object `{desktop,tablet,mobile}`)
 *   A2  the same, Padding only
 *   B   `ResponsiveBoxControl` (singular), no `ResponsiveOverride`
 *   C   the shared `ResponsiveBoxControls` (target; gallery today)
 *   D   the shared nav `ListLayoutPanel` (retired: the two menu blocks mount `ResponsiveBoxControls`)
 *   E   `block.json` `supports.spacing` (core Dimensions, `style.spacing.*` storage)
 * A mount whose attribute is not the block's own `padding` / `margin` (an input's padding, an aside's padding, the grid
 * item defaults) is reported as "other box" and is never a block's spacing panel.
 *
 * USAGE (from plugins/sgs-blocks)
 *   node scripts/check-spacing-panel.js --survey [--json out.json]   # the lists, exit 0
 *   node scripts/check-spacing-panel.js --check                      # gate, exit 1 on any finding
 *   node scripts/check-spacing-panel.js --self-test                  # proves it can fail
 *
 * Exemptions (each with a reason) live in scripts/data/spacing-panel-exemptions.json.
 *
 * @package SGS\Blocks
 */

'use strict';

const fs = require( 'fs' );
const os = require( 'os' );
const path = require( 'path' );
const scan = require( './lib/jsx-scan' );
const { renderSource } = require( './lib/block-source-files' );

const { PLUGIN, SRC } = scan;
const EXEMPT_FILE = path.join( __dirname, 'data', 'spacing-panel-exemptions.json' );
const CONTROLS = new Set( [ 'SgsBoxControl', 'ResponsiveBoxControl' ] );
const FAMILY = { padding: 'Padding', margin: 'Margin' };
/** The shared panel's own file and the control definitions are not mounts. */
const DEFINERS = new Set( [ 'components/ResponsiveBoxControls.js', 'components/ResponsiveBoxControl.js', 'components/SgsBoxControl.js' ] );

/** First string literal of a prop: `"x"`, `{ 'x' }` or `{ __( 'x', 'domain' ) }`. */
function propString( el, name ) {
	const p = scan.prop( el, name );
	if ( 'string' === p.kind ) {
		return p.value;
	}
	if ( 'expr' === p.kind ) {
		const e = p.node.value.expression;
		if ( 'CallExpression' === e.type && e.arguments[ 0 ] && 'StringLiteral' === e.arguments[ 0 ].type ) {
			return e.arguments[ 0 ].value;
		}
	}
	return null;
}

/** Attribute path read by an expression: `attributes.style?.spacing?.padding` gives ['style','spacing','padding']. */
function exprPath( e ) {
	if ( ! e ) {
		return [];
	}
	switch ( e.type ) {
		case 'JSXExpressionContainer':
			return exprPath( e.expression );
		case 'LogicalExpression':
			return exprPath( e.left );
		case 'ChainExpression':
			return exprPath( e.expression );
		case 'TSNonNullExpression':
			return exprPath( e.expression );
		case 'Identifier':
			return [ e.name ];
		case 'MemberExpression':
		case 'OptionalMemberExpression': {
			const base = exprPath( e.object );
			const key = e.computed ? ( 'StringLiteral' === e.property.type ? e.property.value : '(computed)' ) : e.property.name;
			if ( 1 === base.length && 'attributes' === base[ 0 ] ) {
				return [ key ];
			}
			return base.concat( [ key ] );
		}
		default:
			return [];
	}
}

/** The `base` property of an object-literal prop (`values={ { base: x } }`), as an expression, or null. */
function objectProp( el, propName, key ) {
	const p = scan.prop( el, propName );
	if ( ! p.node || ! p.node.value || 'JSXExpressionContainer' !== p.node.value.type ) {
		return null;
	}
	const e = p.node.value.expression;
	if ( 'ObjectExpression' !== e.type ) {
		return null;
	}
	const found = e.properties.find( ( o ) => 'ObjectProperty' === o.type && ( o.key.name === key || o.key.value === key ) );
	return found ? found.value : null;
}

/** Title of the nearest enclosing panel element. */
function panelTitle( ancestors ) {
	const panel = scan.closestJsx( ancestors, ( e ) => [ 'PanelBody', 'ToolsPanel', 'SgsInnerSection' ].includes( scan.jsxName( e ) ) );
	if ( ! panel ) {
		return null;
	}
	return propString( panel, 'title' ) || propString( panel, 'label' ) || '(not a literal)';
}

/**
 * Every Padding / Margin mount and every shared-panel mount in one source text.
 *
 * @param {string} text Source.
 * @return {Array<Object>} Mounts: { control, line, symbol, label, attr, shape, panel }.
 */
function mountsIn( text ) {
	const ast = scan.parse( text );
	const out = [];
	scan.walkJsx( ast, ( el, ancestors ) => {
		const name = scan.jsxName( el );
		if ( 'ResponsiveBoxControls' === name ) {
			out.push( { control: name, line: el.loc.start.line, symbol: scan.enclosingSymbol( ancestors ), label: 'Spacing', attr: 'padding+margin', shape: 'tier-object', panel: propString( el, 'title' ) || 'Spacing & width', wrapped: false } );
			return;
		}
		if ( ! CONTROLS.has( name ) ) {
			return;
		}
		const label = propString( el, 'label' );
		if ( ! label || ! /^(padding|margin)$/i.test( label.trim() ) ) {
			return;
		}
		const family = label.trim().toLowerCase();
		const ro = scan.closestJsx( ancestors, ( e ) => 'ResponsiveOverride' === scan.jsxName( e ) );
		let attrPath = [];
		let shape = 'unknown';
		if ( ro ) {
			attrPath = exprPath( scan.prop( ro, 'value' ).node && scan.prop( ro, 'value' ).node.value );
			shape = 'tier-object';
		} else if ( 'ResponsiveBoxControl' === name ) {
			const base = objectProp( el, 'values', 'base' );
			attrPath = exprPath( base );
			if ( 'style' === attrPath[ 0 ] ) {
				shape = 'native style.spacing';
			} else if ( 2 === attrPath.length && [ 'desktop', 'base' ].includes( attrPath[ 1 ] ) ) {
				attrPath = attrPath.slice( 0, 1 );
				shape = 'tier-object';
			} else if ( 1 === attrPath.length ) {
				shape = 'single box (no tiers)';
			}
		} else {
			attrPath = exprPath( scan.prop( el, 'values' ).node && scan.prop( el, 'values' ).node.value );
			shape = 'box value (no ResponsiveOverride)';
		}
		out.push( {
			control: name,
			line: el.loc.start.line,
			symbol: scan.enclosingSymbol( ancestors ),
			label,
			family,
			attr: attrPath.join( '.' ) || '(unreadable)',
			shape,
			panel: panelTitle( ancestors ),
			wrapped: Boolean( ro ),
		} );
	} );
	return out;
}

/** Read one block's block.json, or null. */
function blockJson( dir ) {
	try {
		return JSON.parse( fs.readFileSync( path.join( dir, 'block.json' ), 'utf8' ) );
	} catch ( e ) {
		return null;
	}
}

function loadExemptions() {
	try {
		return JSON.parse( fs.readFileSync( EXEMPT_FILE, 'utf8' ) );
	} catch ( e ) {
		return { files: {}, attributes: {}, blocks: {} };
	}
}

/** How the block's render emits box CSS: 'wrapper', 'own', 'both' or 'none-found'. */
function renderPath( dir ) {
	let src = '';
	try {
		src = renderSource( dir );
	} catch ( e ) {
		return 'unreadable';
	}
	const wrapper = /SGS_Container_Wrapper/.test( src );
	const own = /\$(?:attributes|attrs)\[\s*'(?:padding|margin)'\s*\]/.test( src );
	return wrapper && own ? 'both' : wrapper ? 'wrapper' : own ? 'own' : 'none-found';
}

/** `supports.spacing` / `style.spacing` reads in a block's editor and render sources, as plugin-relative files. */
function nativeSpacingReaders( dir ) {
	const files = [];
	const walk = ( d ) => {
		for ( const entry of fs.readdirSync( d, { withFileTypes: true } ) ) {
			const full = path.join( d, entry.name );
			if ( entry.isDirectory() ) {
				walk( full );
			} else if ( /\.(js|php)$/.test( entry.name ) && /style(\??\.|'\]\[')spacing|\['style'\]\['spacing'\]|style\.spacing/.test( fs.readFileSync( full, 'utf8' ) ) ) {
				files.push( scan.rel( full ) );
			}
		}
	};
	walk( dir );
	return files.sort();
}

/**
 * Padding or margin edited through a table or helper instead of a literal mount: `[ 'padding', __( 'Padding' ) ]` rows or
 * `attrs={ [ 'padding' ] }`. Returns the plugin-relative files in the block folder that do it.
 */
function helperMounts( dir, root ) {
	const files = [];
	const walk = ( d ) => {
		for ( const entry of fs.readdirSync( d, { withFileTypes: true } ) ) {
			const full = path.join( d, entry.name );
			if ( entry.isDirectory() ) {
				walk( full );
			} else if ( entry.name.endsWith( '.js' ) && /\[\s*'(?:padding|margin)'\s*,\s*__\(|attrs=\{\s*\[\s*'(?:padding|margin)'/.test( fs.readFileSync( full, 'utf8' ) ) ) {
				files.push( path.relative( path.dirname( root ), full ).split( path.sep ).join( '/' ) );
			}
		}
	};
	walk( dir );
	return files.sort();
}

/**
 * Survey a source tree.
 *
 * @param {string} root `src` folder (a fixture in the self-test).
 * @return {Object} { blocks: {slug: {...}}, mounts: [...], parseErrors: [...] }
 */
function survey( root = SRC ) {
	const relTo = ( f ) => path.relative( path.dirname( root ), f ).split( path.sep ).join( '/' );
	const mounts = [];
	const parseErrors = [];
	for ( const file of scan.jsFiles( root ) ) {
		const text = fs.readFileSync( file, 'utf8' );
		if ( ! /SgsBoxControl|ResponsiveBoxControl/.test( text ) ) {
			continue;
		}
		const relPath = relTo( file );
		if ( DEFINERS.has( relPath.replace( /^src\//, '' ) ) ) {
			continue;
		}
		try {
			const owner = relPath.match( /^src\/(?:blocks|commerce-blocks)\/([^/]+)\// );
			for ( const m of mountsIn( text ) ) {
				mounts.push( { file: relPath, block: owner ? owner[ 1 ] : '', ...m } );
			}
		} catch ( e ) {
			parseErrors.push( { file: relPath, error: e.message } );
		}
	}

	const blocks = {};
	for ( const group of [ 'blocks', 'commerce-blocks' ] ) {
		const groupDir = path.join( root, group );
		if ( ! fs.existsSync( groupDir ) ) {
			continue;
		}
		for ( const entry of fs.readdirSync( groupDir, { withFileTypes: true } ) ) {
			if ( ! entry.isDirectory() || 'extensions' === entry.name ) {
				continue;
			}
			const dir = path.join( groupDir, entry.name );
			const json = blockJson( dir );
			if ( ! json ) {
				continue;
			}
			const attrs = json.attributes || {};
			const own = mounts.filter( ( m ) => m.block === entry.name );
			const spacing = json.supports && json.supports.spacing;
			const info = {
				owns: [ 'padding', 'margin' ].filter( ( a ) => attrs[ a ] && 'object' === attrs[ a ].type ),
				mounts: own,
				spacingSupport: spacing ? { keys: [ 'padding', 'margin' ].filter( ( k ) => spacing[ k ] ), skipSerialization: Boolean( spacing.__experimentalSkipSerialization ), raw: spacing } : null,
				render: renderPath( dir ),
				nativeReaders: spacing ? nativeSpacingReaders( dir ) : [],
			};
			const own1 = own.filter( ( m ) => 'ResponsiveBoxControls' !== m.control && /^(padding|margin)$/.test( m.attr ) );
			const pads = own1.filter( ( m ) => 'padding' === m.family );
			const mars = own1.filter( ( m ) => 'margin' === m.family );
			const viaRO = own1.filter( ( m ) => m.wrapped );
			const viaB = own1.filter( ( m ) => 'ResponsiveBoxControl' === m.control );
			let variant = '';
			if ( own.some( ( m ) => 'ResponsiveBoxControls' === m.control ) ) {
				variant = 'C';
			} else if ( viaRO.length ) {
				variant = pads.length && mars.length ? 'A' : 'A2';
				if ( ! pads.length && mars.length ) {
					variant = 'A (margin only)';
				}
			} else if ( viaB.length ) {
				variant = 'B';
			}
			info.helperFiles = ! variant && info.owns.length ? helperMounts( dir, root ) : [];
			if ( ! variant && info.helperFiles.length ) {
				variant = 'A-helper';
			}
			info.variant = variant;
			info.otherBox = own.filter( ( m ) => 'ResponsiveBoxControls' !== m.control && ! /^(padding|margin)$/.test( m.attr ) );
			blocks[ entry.name ] = info;
		}
	}
	return { blocks, mounts, parseErrors };
}

/** Findings for a survey and an exemption table. */
function findings( s, ex ) {
	const out = [];
	for ( const [ slug, b ] of Object.entries( s.blocks ) ) {
		if ( b.spacingSupport && ! ( ex.blocks || {} )[ slug ] ) {
			out.push( { block: slug, kind: 'supports.spacing', detail: `block.json declares supports.spacing (${ b.spacingSupport.keys.join( ', ' ) || 'no keys' }): core Dimensions panel and style.spacing storage` } );
		}
	}
	for ( const m of s.mounts ) {
		if ( 'ResponsiveBoxControls' === m.control ) {
			continue;
		}
		const key = `${ m.file }::${ m.attr }`;
		if ( ( ex.files || {} )[ m.file ] || ( ex.attributes || {} )[ key ] ) {
			continue;
		}
		out.push( { block: m.block, kind: 'hand-built pair', file: m.file, line: m.line, detail: `${ m.control } "${ m.label }" writes ${ m.attr } in panel "${ m.panel }": mount the shared ResponsiveBoxControls panel` } );
	}
	for ( const [ slug, b ] of Object.entries( s.blocks ) ) {
		if ( ! b.owns.length || ( ex.blocks || {} )[ slug ] ) {
			continue;
		}
		if ( ! b.mounts.some( ( m ) => 'ResponsiveBoxControls' === m.control ) ) {
			const handled = b.mounts.some( ( m ) => /^(padding|margin)$/.test( m.attr ) && ( ( ex.files || {} )[ m.file ] || ( ex.attributes || {} )[ `${ m.file }::${ m.attr }` ] ) )
				|| ( b.helperFiles || [] ).some( ( f ) => ( ex.files || {} )[ f ] );
			if ( ! handled ) {
				out.push( { block: slug, kind: 'no shared panel', detail: `declares ${ b.owns.join(' and ') } but no file in its folder mounts ResponsiveBoxControls` } );
			}
		}
	}
	return out;
}

function render( s ) {
	const lines = [];
	const byVariant = {};
	for ( const [ slug, b ] of Object.entries( s.blocks ) ) {
		const v = b.variant || ( b.spacingSupport ? 'E' : b.owns.length ? '(owns box attrs, no mount)' : '-' );
		( byVariant[ v ] = byVariant[ v ] || [] ).push( slug );
	}
	lines.push( 'Variant counts:' );
	for ( const [ v, list ] of Object.entries( byVariant ).sort() ) {
		if ( '-' !== v ) {
			lines.push( `  ${ v }: ${ list.length } (${ list.join( ', ' ) })` );
		}
	}
	return lines.join( '\n' );
}

function selfTest() {
	const failures = [];
	const ok = ( label, cond ) => {
		process.stdout.write( `  ${ cond ? 'PASS' : 'FAIL' }  ${ label }\n` );
		if ( ! cond ) {
			failures.push( label );
		}
	};
	process.stdout.write( '[check-spacing-panel --self-test]\n\n' );
	const A = mountsIn( `export const X = () => (<PanelBody title={ __( 'Spacing', 'd' ) }><ResponsiveOverride value={ attributes.padding }>{ () => <SgsBoxControl label={ __( 'Padding', 'd' ) } /> }</ResponsiveOverride></PanelBody>);` );
	ok( 'reads variant A: label, attribute, panel title, tier shape', 1 === A.length && 'padding' === A[ 0 ].attr && 'Spacing' === A[ 0 ].panel && 'tier-object' === A[ 0 ].shape && A[ 0 ].wrapped );
	const B = mountsIn( `export const X = () => (<ResponsiveBoxControl label="Margin" values={ { base: margin?.desktop ?? {} } } />);` );
	ok( 'reads variant B tier shape from the base value', 'margin' === B[ 0 ].attr && 'tier-object' === B[ 0 ].shape && ! B[ 0 ].wrapped );
	const Bn = mountsIn( `export const X = () => (<ResponsiveBoxControl label="Padding" values={ { base: attributes.style?.spacing?.padding ?? {} } } />);` );
	ok( 'flags a variant B mount storing the native shape', 'native style.spacing' === Bn[ 0 ].shape );
	ok( 'ignores a control labelled something else', 0 === mountsIn( 'export const X = () => (<SgsBoxControl label="Link padding" />);' ).length );
	ok( 'reads a shared-panel mount', 'ResponsiveBoxControls' === mountsIn( 'export const X = () => (<ResponsiveBoxControls attributes={ a } />);' )[ 0 ].control );

	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'spc-' ) );
	const src = path.join( root, 'src' );
	const mk = ( rel, text ) => {
		fs.mkdirSync( path.dirname( path.join( src, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( src, rel ), text, 'utf8' );
	};
	const attrsJson = ( extra = {} ) => JSON.stringify( { name: 'sgs/x', attributes: { padding: { type: 'object' }, margin: { type: 'object' } }, ...extra } );
	mk( 'blocks/bad/block.json', attrsJson() );
	mk( 'blocks/bad/edit.js', 'export const E = () => (<ResponsiveOverride value={ attributes.padding }><SgsBoxControl label="Padding" /></ResponsiveOverride>);' );
	mk( 'blocks/good/block.json', attrsJson() );
	mk( 'blocks/good/edit.js', 'export const E = () => (<ResponsiveBoxControls attributes={ attributes } />);' );
	mk( 'blocks/native/block.json', attrsJson( { supports: { spacing: { padding: true, __experimentalSkipSerialization: true } } } ) );
	mk( 'blocks/native/edit.js', 'export const E = () => (<ResponsiveBoxControls attributes={ attributes } />);' );
	mk( 'blocks/none/block.json', attrsJson() );
	mk( 'blocks/none/edit.js', 'export const E = () => (<div />);' );
	const s = survey( src );
	const f = findings( s, { files: {}, attributes: {}, blocks: {} } );
	const has = ( block, kind ) => f.some( ( x ) => x.block === block && x.kind === kind );
	ok( 'CATCHES a hand-built Padding pair', has( 'bad', 'hand-built pair' ) );
	ok( 'CATCHES a block that owns padding and mounts no shared panel', has( 'bad', 'no shared panel' ) && has( 'none', 'no shared panel' ) );
	ok( 'CATCHES supports.spacing', has( 'native', 'supports.spacing' ) );
	ok( 'ACCEPTS a block that mounts the shared panel', ! f.some( ( x ) => 'good' === x.block ) );
	const ex = { files: { 'src/blocks/bad/edit.js': 'test' }, attributes: {}, blocks: { none: 'test', native: 'test' } };
	ok( 'an exemption silences its file and block only', 0 === findings( s, ex ).length );
	fs.rmSync( root, { recursive: true, force: true } );
	process.stdout.write( 0 === failures.length ? '\n[check-spacing-panel --self-test] ALL ASSERTIONS PASS.\n' : `\n[check-spacing-panel --self-test] ${ failures.length } FAILURE(S).\n` );
	process.exit( 0 === failures.length ? 0 : 1 );
}

const argv = process.argv.slice( 2 );
if ( argv.includes( '--self-test' ) ) {
	selfTest();
} else if ( argv.includes( '--survey' ) ) {
	const s = survey();
	const f = findings( s, loadExemptions() );
	const mountCount = s.mounts.filter( ( m ) => 'ResponsiveBoxControls' !== m.control ).length;
	process.stdout.write( `${ render( s ) }\n\nMounts found: ${ mountCount } (Padding and Margin controls); findings now: ${ f.length }; parse errors: ${ s.parseErrors.length }\n` );
	const at = argv.indexOf( '--json' );
	if ( at >= 0 && argv[ at + 1 ] ) {
		fs.writeFileSync( argv[ at + 1 ], JSON.stringify( { ...s, findings: f }, null, 2 ), 'utf8' );
	}
	process.exit( 0 );
} else if ( argv.includes( '--check' ) ) {
	const s = survey();
	const f = findings( s, loadExemptions() );
	for ( const x of f ) {
		process.stdout.write( `${ x.file ? `${ x.file }:${ x.line } ` : '' }[${ x.block }] ${ x.kind }: ${ x.detail }\n` );
	}
	for ( const p of s.parseErrors ) {
		process.stdout.write( `parse error: ${ p.file }: ${ p.error }\n` );
	}
	process.stdout.write( f.length || s.parseErrors.length ? `\n[check-spacing-panel] ${ f.length } finding(s)\n` : '[check-spacing-panel] OK\n' );
	process.exit( f.length || s.parseErrors.length ? 1 : 0 );
} else {
	process.stdout.write( 'usage: node scripts/check-spacing-panel.js --survey [--json out.json] | --check | --self-test\n' );
	process.exit( 2 );
}
