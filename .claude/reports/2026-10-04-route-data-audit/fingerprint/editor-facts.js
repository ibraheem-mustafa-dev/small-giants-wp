// Editor-side fact extractor for the fingerprint scanner (read-only).
// For every block's edit.js and every editor file it reaches (relative imports
// + JSX component names resolved through inspector-scan's component map),
// emit: identifiers read outside InspectorControls/BlockControls, string
// literals, setAttributes keys, attributes.X member reads, JSX prefix props,
// helper calls with a literal prefix argument, CSS custom-property tokens,
// ServerSideRender use, and whether the file is a panel (control) file.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const P = 'C:/Users/Bean/Projects/small-giants-wp/plugins/sgs-blocks/';
const parser = require( P + 'node_modules/@babel/parser' );
const traverse = require( P + 'node_modules/@babel/traverse' ).default;
const { resolveComponentFiles } = require( P + 'scripts/inspector-scan/core/components' );
const CMAP = resolveComponentFiles();

const OPTS = { sourceType: 'module', plugins: [ 'jsx', 'classProperties', 'optionalChaining', 'objectRestSpread' ], errorRecovery: true };
const CONTROL_CONTAINERS = new Set( [ 'InspectorControls', 'BlockControls', 'InspectorAdvancedControls', 'PanelBody', 'ToolsPanel', 'ToolsPanelItem' ] );
const fileCache = new Map();

function isPanelFile( src, file ) {
	const base = path.basename( file, '.js' );
	return /(Panel|Controls?|Control|Picker|Select|Toggle|Inspector)$/.test( base ) || /<(InspectorControls|PanelBody|ToolsPanel)\b/.test( src );
}

function facts( file ) {
	if ( fileCache.has( file ) ) return fileCache.get( file );
	const out = { file, outside: [], literals: [], setKeys: [], memberReads: [], destructured: [], prefixJsx: [], prefixCalls: [], cpTokens: [], ssr: false, panel: false, imports: [], jsxTags: [], styleTag: false };
	fileCache.set( file, out );
	let src;
	try { src = fs.readFileSync( file, 'utf8' ); } catch ( e ) { return out; }
	out.panel = path.basename( file ) !== 'edit.js' && isPanelFile( src, file );
	let ast;
	try { ast = parser.parse( src, OPTS ); } catch ( e ) { out.parseError = true; return out; }
	const ranges = [];
	const inside = new Set(), outside = new Set(), literals = new Set(), setKeys = new Set(), member = new Set(), destr = new Set(), cps = new Set(), tags = new Set();
	traverse( ast, {
		JSXElement( p ) {
			const n = p.node.openingElement.name;
			const name = n.type === 'JSXIdentifier' ? n.name : ( n.type === 'JSXMemberExpression' ? n.property.name : '' );
			tags.add( name );
			if ( name === 'ServerSideRender' ) out.ssr = true;
			if ( name === 'style' ) out.styleTag = true;
			if ( CONTROL_CONTAINERS.has( name ) ) ranges.push( [ p.node.start, p.node.end ] );
			for ( const a of p.node.openingElement.attributes ) {
				if ( a.type === 'JSXAttribute' && a.name && a.name.name === 'prefix' && a.value && a.value.type === 'StringLiteral' ) {
					out.prefixJsx.push( { tag: name, prefix: a.value.value } );
				}
			}
		},
		ObjectProperty( p ) {
			const k = p.node.key;
			const kn = k && ( k.name || k.value );
			if ( kn === 'prefix' && p.node.value && p.node.value.type === 'StringLiteral' ) {
				const jsx = p.findParent( ( q ) => q.isJSXElement() );
				const n = jsx && jsx.node.openingElement.name;
				out.prefixJsx.push( { tag: n && n.type === 'JSXIdentifier' ? n.name : '', prefix: p.node.value.value } );
			}
		},
		ImportDeclaration( p ) { out.imports.push( { from: p.node.source.value, names: p.node.specifiers.map( ( s ) => s.local.name ) } ); },
		StringLiteral( p ) { literals.add( p.node.value ); const m = p.node.value.match( /--sgs-[a-z0-9-]+/g ); if ( m ) m.forEach( ( x ) => cps.add( x ) ); },
		TemplateElement( p ) { const v = p.node.value.raw; const m = v.match( /--sgs-[a-z0-9-]+/g ); if ( m ) m.forEach( ( x ) => cps.add( x ) ); },
		CallExpression( p ) {
			const c = p.node.callee;
			const fname = c.type === 'Identifier' ? c.name : ( c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : '' );
			if ( fname === 'setAttributes' || fname === 'update' || fname === 'setAttr' ) {
				const a0 = p.node.arguments[ 0 ];
				if ( a0 && a0.type === 'ObjectExpression' ) {
					for ( const pr of a0.properties ) if ( pr.type === 'ObjectProperty' && ! pr.computed ) setKeys.add( pr.key.name || pr.key.value );
				} else if ( a0 && a0.type === 'StringLiteral' ) setKeys.add( a0.value );
			}
			// helper( attributes, 'prefix' ) / helper( 'prefix', ... ) shapes
			p.node.arguments.forEach( ( arg, i ) => {
				if ( arg.type === 'StringLiteral' && /^[a-z][A-Za-z0-9]*$|^$/.test( arg.value ) && arg.value.length < 30 ) {
					out.prefixCalls.push( { fn: fname, idx: i, prefix: arg.value, start: p.node.start } );
				}
			} );
		},
		MemberExpression( p ) {
			const o = p.node.object;
			if ( o.type === 'Identifier' && /^(attributes|attrs|a)$/.test( o.name ) ) {
				if ( ! p.node.computed && p.node.property.type === 'Identifier' ) member.add( p.node.property.name );
				if ( p.node.computed && p.node.property.type === 'StringLiteral' ) member.add( p.node.property.value );
			}
		},
		VariableDeclarator( p ) {
			if ( p.node.id.type === 'ObjectPattern' && p.node.init && p.node.init.type === 'Identifier' && /^(attributes|attrs)$/.test( p.node.init.name ) ) {
				for ( const pr of p.node.id.properties ) if ( pr.type === 'ObjectProperty' ) destr.add( pr.key.name || pr.key.value );
			}
		},
	} );
	const inRange = ( pos ) => ranges.some( ( [ s, e ] ) => pos >= s && pos < e );
	traverse( ast, {
		Identifier( p ) {
			const node = p.node, parent = p.parent;
			if ( parent.type === 'JSXAttribute' ) return;
			if ( parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier' ) return;
			if ( parent.type === 'ObjectProperty' ) {
				const cont = p.parentPath.parentPath.node;
				if ( cont.type === 'ObjectPattern' ) return;
				if ( cont.type === 'ObjectExpression' && parent.key === node && ! parent.computed ) return;
			}
			if ( parent.type === 'MemberExpression' && parent.property === node && ! parent.computed ) {
				// attributes.X read outside controls counts as an outside read of X
				if ( parent.object.type === 'Identifier' && /^(attributes|attrs)$/.test( parent.object.name ) && ! inRange( node.start ) ) outside.add( node.name );
				return;
			}
			if ( inRange( node.start ) ) { inside.add( node.name ); return; }
			outside.add( node.name );
		},
	} );
	out.outside = [ ...outside ]; out.inside = [ ...inside ]; out.literals = [ ...literals ]; out.setKeys = [ ...setKeys ];
	out.memberReads = [ ...member ]; out.destructured = [ ...destr ]; out.cpTokens = [ ...cps ]; out.jsxTags = [ ...tags ];
	// template-literal prefix suffixes: `${ prefix }Suffix` and prefix + 'Suffix'
	const sfx = new Set();
	for ( const m of src.matchAll( /\$\{\s*prefix\s*\}([A-Z][A-Za-z0-9]*)/g ) ) sfx.add( m[ 1 ] );
	for ( const m of src.matchAll( /prefix\s*\+\s*['"]([A-Z][A-Za-z0-9]*)['"]/g ) ) sfx.add( m[ 1 ] );
	for ( const m of src.matchAll( /(?:attrKey|AttrName|attrName|k)\(\s*(?:prefix\s*,\s*)?['"]([A-Z][A-Za-z0-9]*)['"]\s*\)/g ) ) sfx.add( m[ 1 ] );
	out.prefixSuffixes = [ ...sfx ];
	return out;
}

function resolveImport( fromFile, spec ) {
	if ( ! spec.startsWith( '.' ) ) return null;
	const base = path.resolve( path.dirname( fromFile ), spec );
	for ( const c of [ base, base + '.js', path.join( base, 'index.js' ) ] ) {
		if ( fs.existsSync( c ) && fs.statSync( c ).isFile() ) return c;
	}
	return null;
}

function reach( entry, maxDepth ) {
	const seen = new Map();
	const q = [ [ entry, 0 ] ];
	while ( q.length ) {
		const [ f, d ] = q.shift();
		if ( seen.has( f ) ) continue;
		seen.set( f, d );
		if ( d >= maxDepth ) continue;
		const fx = facts( f );
		for ( const im of fx.imports ) {
			const r = resolveImport( f, im.from );
			if ( r && r.endsWith( '.js' ) && path.basename( r ) !== 'index.js' && r.startsWith( path.resolve( P, 'src' ) ) ) q.push( [ r, d + 1 ] );
		}
		for ( const t of fx.jsxTags ) {
			const r = CMAP.get( t );
			if ( r ) q.push( [ path.resolve( r ), d + 1 ] );
		}
	}
	return [ ...seen.keys() ];
}

const blocksDir = path.join( P, 'src/blocks' );
const result = { blocks: {}, files: {} };
for ( const d of fs.readdirSync( blocksDir, { withFileTypes: true } ) ) {
	if ( ! d.isDirectory() || d.name === 'extensions' ) continue;
	const edit = path.join( blocksDir, d.name, 'edit.js' );
	if ( ! fs.existsSync( edit ) ) continue;
	const files = reach( path.resolve( edit ), 4 );
	result.blocks[ d.name ] = { edit: path.resolve( edit ), files };
}
// extensions
const extDir = path.join( blocksDir, 'extensions' );
const extFiles = [];
( function walk( dir ) {
	for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const f = path.join( dir, e.name );
		if ( e.isDirectory() ) walk( f ); else if ( f.endsWith( '.js' ) ) extFiles.push( path.resolve( f ) );
	}
} )( extDir );
result.extensions = extFiles;
for ( const f of extFiles ) facts( f );
for ( const [ f, v ] of fileCache ) result.files[ f ] = v;
process.stdout.write( JSON.stringify( result ) );
