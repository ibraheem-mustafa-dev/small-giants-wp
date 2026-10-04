// Editor-side facts for the wiring-fingerprint gate (read-only).
//
//   node editor_facts.js <pluginDir> <nodeModulesDir>   -> JSON on stdout
//
// For every block's edit.js and each editor file it reaches (relative imports,
// with barrel re-exports resolved to the declaring file, and JSX component names
// resolved through a declared-name map), it records per file: attribute reads on
// the canvas (outside control containers and control descriptors, with the
// device-tier keys read), setAttributes keys (literal, `const next = {…}`,
// string), attribute-shaped string literals, prefix props and calls, prefix-built
// suffixes, shadow-key calls, custom properties the canvas sets (with the
// attributes each one reads), attributes read straight into a real style
// property, ServerSideRender use (conditional or not, with its guard) and the
// attribute keys of controls behind each guard.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

const PLUGIN = path.resolve( process.argv[ 2 ] || path.join( __dirname, '..', '..' ) );
const NM = path.resolve( process.argv[ 3 ] || path.join( PLUGIN, 'node_modules' ) );
const parser = require( path.join( NM, '@babel/parser' ) );
const traverse = require( path.join( NM, '@babel/traverse' ) ).default;
const SRC = path.join( PLUGIN, 'src' );
const BLOCKS = path.join( SRC, 'blocks' );

const OPTS = { sourceType: 'module', plugins: [ 'jsx', 'classProperties', 'optionalChaining', 'objectRestSpread' ], errorRecovery: true };
const CONTROL_CONTAINERS = new Set( [ 'InspectorControls', 'BlockControls', 'InspectorAdvancedControls', 'PanelBody', 'ToolsPanel', 'ToolsPanelItem' ] );
const CONTROL_TAG_RE = /^(Sgs\w*(Panel|Picker|Control|Override)|\w*(Controls?|Picker|Panel|Override|Toggle|Select|ColourPanel))$/;
const ATTR_OBJ_RE = /^(attributes|attrs|atts|blockAttributes)$/;
const ATTR_SHAPE_RE = /^[a-z][A-Za-z0-9]*$/;
const TIER_KEYS = new Set( [ 'desktop', 'tablet', 'mobile' ] );
const SETTERS = new Set( [ 'setAttributes', 'update', 'setAttr', 'updateAttributes' ] );
const rel = ( f ) => path.relative( PLUGIN, f ).split( path.sep ).join( '/' );
const isControlTag = ( n ) => CONTROL_CONTAINERS.has( n ) || CONTROL_TAG_RE.test( n );
const tagName = ( n ) => ( n.type === 'JSXIdentifier' ? n.name : n.type === 'JSXMemberExpression' ? n.property.name : '' );
const calleeName = ( c ) => ( c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : '' );

const { walkJs, parse, exportsOf, resolveSpec, declaringFile, COMPONENT_MAP } = require( './editor_facts_resolve' )( { SRC, BLOCKS, parser, OPTS } );

// The attributes object, or a local derived from it through an object spread, a ternary
// or a logical fallback (`const a = x ? attributes : { ...attributes, k: v }`).
function derivesAttrs( n, scope, depth ) {
	if ( ! n || depth > 3 ) return false;
	if ( n.type === 'Identifier' ) {
		if ( ATTR_OBJ_RE.test( n.name ) ) return true;
		const b = scope && scope.getBinding( n.name );
		return !! b && b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier' && derivesAttrs( b.path.node.init, b.path.scope, depth + 1 );
	}
	if ( n.type === 'ObjectExpression' ) return n.properties.some( ( pr ) => pr.type === 'SpreadElement' && derivesAttrs( pr.argument, scope, depth + 1 ) );
	if ( n.type === 'ConditionalExpression' ) return derivesAttrs( n.consequent, scope, depth + 1 ) || derivesAttrs( n.alternate, scope, depth + 1 );
	if ( n.type === 'LogicalExpression' ) return derivesAttrs( n.left, scope, depth + 1 ) || derivesAttrs( n.right, scope, depth + 1 );
	return false;
}

function identsIn( node ) {
	const out = new Set();
	( function walk( n ) {
		if ( ! n || typeof n !== 'object' ) return;
		if ( n.type === 'Identifier' ) out.add( n.name );
		if ( ( n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression' ) && ! n.computed && n.property.type === 'Identifier' ) out.add( n.property.name );
		for ( const k of Object.keys( n ) ) {
			if ( k === 'loc' || k === 'start' || k === 'end' ) continue;
			const v = n[ k ];
			if ( Array.isArray( v ) ) v.forEach( walk );
			else if ( v && typeof v.type === 'string' ) walk( v );
		}
	} )( node );
	return out;
}

const factCache = new Map();
function facts( file ) {
	if ( factCache.has( file ) ) return factCache.get( file );
	const out = { file: rel( file ), callsSet: false, setKeys: [], literals: [], canvasReads: {}, controlReads: [], cpCanvas: {}, realPropAttrs: [], prefixJsx: [], prefixCalls: [], prefixSuffixes: [], shadowBases: [], ssr: [], guarded: {}, canvasCalls: [], canvasJsx: [], imports: [], jsxTags: [], blockListBlock: false, blockEdit: false };
	factCache.set( file, out );
	const { ast, src } = parse( file );
	if ( ! ast ) { out.parseError = true; return out; }
	out.callsSet = /setAttributes/.test( src );
	out.blockListBlock = src.includes( 'editor.BlockListBlock' );
	out.blockEdit = src.includes( 'editor.BlockEdit' );
	const ranges = [], descriptor = [];
	const lits = new Set(), setKeys = new Set(), tags = new Set(), objVars = new Map();
	const canvas = new Map(), controlReads = new Set(), realProp = new Set(), sfx = new Set();
	const inR = ( pos, rs ) => rs.some( ( [ s, e ] ) => pos >= s && pos < e );
	const isControlPos = ( pos ) => inR( pos, ranges ) || inR( pos, descriptor );
	const addSetObj = ( obj ) => {
		for ( const pr of obj.properties ) {
			if ( pr.type === 'ObjectProperty' && ! pr.computed ) setKeys.add( pr.key.name || pr.key.value );
			if ( pr.type === 'SpreadElement' && pr.argument.type === 'Identifier' && objVars.has( pr.argument.name ) ) objVars.get( pr.argument.name ).forEach( ( k ) => setKeys.add( k ) );
		}
	};
	// A table of rows mapped into prefixed controls: `[ [ 'panelTitle', … ], … ].map(
	// ( [ prefix ] ) => ( { prefix } ) )` (rows may be arrays or objects; the table may be
	// a const). Every row's literal at the destructured slot is a prefix.
	function tupleTablePrefixes( p ) {
		let table = p.node.callee.object;
		if ( table.type === 'Identifier' ) {
			const b = p.scope.getBinding( table.name );
			table = b && b.path.isVariableDeclarator() ? b.path.node.init : null;
		}
		const cb = p.get( 'arguments.0' );
		if ( ! table || table.type !== 'ArrayExpression' || ! cb || ! cb.node || ! cb.isFunction() || ! cb.node.params.length ) return;
		const pat = cb.node.params[ 0 ];
		const slots = pat.type === 'ArrayPattern' ? pat.elements.map( ( el, i ) => [ el, i ] ) : pat.type === 'ObjectPattern' ? pat.properties.filter( ( pr ) => pr.type === 'ObjectProperty' ).map( ( pr ) => [ pr.value, pr.key.name || pr.key.value ] ) : [];
		for ( const [ el, slot ] of slots ) {
			const local = el && ( el.type === 'Identifier' ? el.name : el.type === 'AssignmentPattern' && el.left.type === 'Identifier' ? el.left.name : null );
			const b = local && cb.scope.getBinding( local );
			if ( ! b ) continue;
			const uses = [];
			for ( const r of b.referencePaths ) {
				const par = r.parent;
				if ( par.type === 'ObjectProperty' && par.value === r.node && ( par.key.name || par.key.value ) === 'prefix' ) uses.push( [ 'jsx' ] );
				else if ( par.type === 'JSXExpressionContainer' && r.parentPath.parent.type === 'JSXAttribute' && r.parentPath.parent.name.name === 'prefix' ) uses.push( [ 'jsx' ] );
				else if ( par.type === 'CallExpression' && par.arguments.indexOf( r.node ) > -1 && par.arguments.indexOf( r.node ) <= 1 ) uses.push( [ 'call', calleeName( par.callee ), par.arguments.indexOf( r.node ) ] );
			}
			if ( ! uses.length ) continue;
			for ( const row of table.elements ) {
				const v = ! row ? null : row.type === 'ArrayExpression' ? row.elements[ slot ] : row.type === 'ObjectExpression' ? ( row.properties.find( ( pr ) => pr.type === 'ObjectProperty' && ( pr.key.name || pr.key.value ) === slot ) || {} ).value : null;
				if ( ! v || v.type !== 'StringLiteral' || ! ( v.value === '' || ATTR_SHAPE_RE.test( v.value ) ) ) continue;
				for ( const [ kind, fn, idx ] of uses ) {
					if ( kind === 'jsx' ) out.prefixJsx.push( { tag: '', prefix: v.value } );
					else out.prefixCalls.push( { fn, idx, prefix: v.value, start: p.node.start } );
				}
			}
		}
	}
	// Pass 1: ranges, literals, setters, prefixes, imports, SSR.
	traverse( ast, {
		JSXElement( p ) {
			const name = tagName( p.node.openingElement.name );
			tags.add( name );
			if ( isControlTag( name ) ) ranges.push( [ p.node.start, p.node.end ] );
			for ( const a of p.node.openingElement.attributes ) {
				if ( a.type !== 'JSXAttribute' || ! a.name ) continue;
				const an = a.name.name;
				if ( /^on[A-Z]/.test( an ) && a.value && a.value.type === 'JSXExpressionContainer' ) descriptor.push( [ a.value.start, a.value.end ] );
				if ( an === 'prefix' && a.value && a.value.type === 'StringLiteral' ) out.prefixJsx.push( { tag: name, prefix: a.value.value } );
			}
			if ( name === 'ServerSideRender' ) {
				let cond = false, guard = new Set(), alt = null, q = p.parentPath;
				while ( q && ! q.isFunction() ) {
					if ( q.isConditionalExpression() ) { cond = true; identsIn( q.node.test ).forEach( ( x ) => guard.add( x ) ); alt = q.node.consequent === p.node || inR( p.node.start, [ [ q.node.consequent.start, q.node.consequent.end ] ] ) ? q.node.alternate : q.node.consequent; }
					if ( q.isLogicalExpression() || q.isIfStatement() ) { cond = true; identsIn( q.node.test || q.node.left ).forEach( ( x ) => guard.add( x ) ); }
					q = q.parentPath;
				}
				if ( q && q.node.body && q.node.body.body ) {
					for ( const st of q.node.body.body ) {
						if ( st.start >= p.node.start ) break;
						if ( st.type === 'IfStatement' && JSON.stringify( st.consequent ).includes( '"ReturnStatement"' ) ) { cond = true; identsIn( st.test ).forEach( ( x ) => guard.add( x ) ); alt = st.consequent; }
					}
				}
				for ( const g of [ ...guard ] ) {
					const b = p.scope.getBinding( g ); // `const isLive = 'live' === mode` guards on `mode`
					if ( b && b.path.isVariableDeclarator() && b.path.node.init ) identsIn( b.path.node.init ).forEach( ( x ) => guard.add( x ) );
				}
				const altSrc = alt ? src.slice( alt.start, alt.end ) : '';
				const altReads = ( altSrc.match( /\battributes\??\.\w+|<[A-Z]\w+/g ) || [] ).length;
				out.ssr.push( { conditional: cond, guard: [ ...guard ].sort(), altReads } );
			}
		},
		JSXExpressionContainer( p ) {
			const e = p.node.expression;
			const test = e.type === 'LogicalExpression' ? e.left : e.type === 'ConditionalExpression' ? e.test : null;
			if ( ! test ) return;
			const body = e.type === 'LogicalExpression' ? e.right : e.consequent;
			const keys = new Set( [ ...( src.slice( body.start, body.end ).match( /\battributes\??\.(\w+)|\b(\w+)\s*:/g ) || [] ) ].map( ( s ) => s.replace( /^attributes\??\./, '' ).replace( /\s*:$/, '' ) ).filter( ( s ) => ATTR_SHAPE_RE.test( s ) ) );
			for ( const m of src.slice( body.start, body.end ).matchAll( /['"]([a-z][A-Za-z0-9]*)['"]/g ) ) keys.add( m[ 1 ] );
			for ( const g of identsIn( test ) ) {
				out.guarded[ g ] = out.guarded[ g ] || [];
				keys.forEach( ( k ) => out.guarded[ g ].push( k ) );
			}
		},
		ObjectExpression( p ) {
			const on = p.node.properties.find( ( pr ) => pr.type === 'ObjectProperty' && pr.key && /^on[A-Z]/.test( pr.key.name || pr.key.value || '' ) );
			if ( on && /setAttributes|set[A-Z]\w*\(|update\w*\(/.test( src.slice( on.value.start, on.value.end ) ) ) descriptor.push( [ p.node.start, p.node.end ] );
			for ( const pr of p.node.properties ) {
				if ( pr.type !== 'ObjectProperty' ) continue;
				const kn = pr.key && ( pr.key.name || pr.key.value );
				if ( kn === 'prefix' && pr.value.type === 'StringLiteral' ) out.prefixJsx.push( { tag: '', prefix: pr.value.value } );
			}
		},
		VariableDeclarator( p ) {
			if ( p.node.id.type === 'Identifier' && p.node.init && p.node.init.type === 'ObjectExpression' ) {
				objVars.set( p.node.id.name, p.node.init.properties.filter( ( pr ) => pr.type === 'ObjectProperty' && ! pr.computed ).map( ( pr ) => pr.key.name || pr.key.value ) );
			}
			if ( p.node.id.type === 'Identifier' && /BASES|SUFFIXES/.test( p.node.id.name ) && p.node.init ) {
				for ( const m of src.slice( p.node.init.start, p.node.init.end ).matchAll( /['"]([A-Z][A-Za-z0-9]*)['"]/g ) ) sfx.add( m[ 1 ] );
			}
		},
		ImportDeclaration( p ) { out.imports.push( { from: p.node.source.value, names: p.node.specifiers.map( ( s ) => ( s.imported ? s.imported.name || s.imported.value : 'default' ) ) } ); },
		StringLiteral( p ) { if ( ATTR_SHAPE_RE.test( p.node.value ) && p.node.value.length < 60 ) lits.add( p.node.value ); },
		CallExpression( p ) {
			const fname = calleeName( p.node.callee );
			const a0 = p.node.arguments[ 0 ];
			if ( SETTERS.has( fname ) && a0 ) {
				if ( a0.type === 'ObjectExpression' ) addSetObj( a0 );
				else if ( a0.type === 'StringLiteral' ) setKeys.add( a0.value );
				else if ( a0.type === 'Identifier' && objVars.has( a0.name ) ) objVars.get( a0.name ).forEach( ( k ) => setKeys.add( k ) );
			}
			if ( ( fname === 'shadowAttrKeys' || fname === 'shadowAttrName' ) && a0 && a0.type === 'StringLiteral' ) {
				const opt = p.node.arguments[ 1 ];
				const optSrc = opt ? src.slice( opt.start, opt.end ) : '';
				out.shadowBases.push( { base: a0.value, hover: /hover\s*:\s*true/.test( optSrc ) || optSrc === "'hover'", hoverColour: /hoverColour\s*:\s*true/.test( optSrc ) || optSrc === "'hoverColour'", part: fname === 'shadowAttrName' ? optSrc.replace( /['"]/g, '' ) || 'base' : null } );
			}
			if ( fname === 'map' && p.node.callee.type === 'MemberExpression' ) tupleTablePrefixes( p );
			p.node.arguments.slice( 0, 3 ).forEach( ( arg, i ) => {
				if ( arg.type === 'StringLiteral' && ( arg.value === '' || ATTR_SHAPE_RE.test( arg.value ) ) && arg.value.length < 40 ) out.prefixCalls.push( { fn: fname, idx: i, prefix: arg.value, start: p.node.start } );
			} );
		},
	} );
	// Pass 2: attribute reads (member reads and destructured bindings), CP sets, real-property reads.
	// A value read into a local that only controls use (`const forContrast = attributes.bg;`
	// feeding `contrastAgainst={ forContrast }`) is a control read, not a canvas read.
	const onlyFeedsControls = ( refPath ) => {
		const decl = refPath && refPath.findParent( ( q ) => q.isVariableDeclarator() || q.isStatement() );
		if ( ! decl || ! decl.isVariableDeclarator() || decl.node.id.type !== 'Identifier' ) return false;
		const b = decl.scope.getBinding( decl.node.id.name );
		return !! b && b.referencePaths.length > 0 && b.referencePaths.every( ( r ) => isControlPos( r.node.start ) );
	};
	const noteRead = ( attr, refPath, pos ) => {
		if ( ! ATTR_SHAPE_RE.test( attr ) ) return;
		if ( isControlPos( pos ) || onlyFeedsControls( refPath ) ) { controlReads.add( attr ); return; }
		const rec = canvas.get( attr ) || { whole: false, tiers: new Set(), flag: true };
		rec.flag = rec.flag && flagOnly( refPath, 0 );
		const par = refPath && refPath.parent;
		if ( par && ( par.type === 'MemberExpression' || par.type === 'OptionalMemberExpression' ) && par.object === refPath.node && ! par.computed && TIER_KEYS.has( par.property.name ) ) rec.tiers.add( par.property.name );
		else rec.whole = true;
		canvas.set( attr, rec );
		// Read straight into a real style property: `{ gap: attributes.gap }`, `style.color = …`,
		// or through a preview helper that returns real properties (`textPaintPreview( colour )`).
		if ( intoRealProp( refPath ) ) {
			realProp.add( attr );
			return;
		}
		// One local hop: `const v = colourVar( attributes.x ); … style={ { color: v } }`.
		const decl = refPath && refPath.findParent( ( q ) => q.isVariableDeclarator() || q.isStatement() );
		if ( decl && decl.isVariableDeclarator() && decl.node.id.type === 'Identifier' ) {
			const b = decl.scope.getBinding( decl.node.id.name );
			if ( b && b.referencePaths.some( ( r ) => intoRealProp( r ) ) ) realProp.add( attr );
		}
	};
	// The value only ever feeds a presence or numeric comparison (`columns[ t ] !== undefined`,
	// `1 === Number( columns.mobile )`): the canvas derives a flag from it but never shows the
	// value. A comparison with a string (`'grid' === layout`) selects markup, so it is a read.
	function flagOnly( refPath, depth ) {
		let q = refPath;
		let numeric = false;
		for ( let i = 0; q && q.parent && i < 8; i++, q = q.parentPath ) {
			const par = q.parent;
			if ( par.type === 'BinaryExpression' && /^(===|!==|==|!=|<|>|<=|>=)$/.test( par.operator ) ) {
				const other = par.left === q.node ? par.right : par.left;
				return numeric || other.type === 'NumericLiteral' || other.type === 'NullLiteral' || ( other.type === 'Identifier' && other.name === 'undefined' ) || ( other.type === 'StringLiteral' && other.value === '' );
			}
			if ( ( par.type === 'MemberExpression' || par.type === 'OptionalMemberExpression' ) && par.object === q.node ) continue;
			if ( par.type === 'CallExpression' && /^(Number|parseInt|parseFloat)$/.test( calleeName( par.callee ) ) ) { numeric = true; continue; }
			if ( par.type === 'LogicalExpression' || ( par.type === 'ConditionalExpression' && par.test !== q.node ) ) continue;
			if ( par.type === 'VariableDeclarator' && par.init === q.node && par.id.type === 'Identifier' && depth < 2 ) {
				const b = q.parentPath.scope.getBinding( par.id.name );
				return !! b && b.referencePaths.length > 0 && b.referencePaths.every( ( r ) => flagOnly( r, depth + 1 ) );
			}
			return false;
		}
		return false;
	}
	function intoRealProp( refPath ) {
		let q = refPath;
		for ( let i = 0; q && q.parent && i < 5; i++, q = q.parentPath ) {
			const par = q.parent;
			if ( par.type === 'ObjectProperty' && par.value === q.node ) {
				const kn = par.key && ( par.key.name || par.key.value || '' );
				return /^[a-z][A-Za-z]+$/.test( kn ) && ! par.computed;
			}
			if ( par.type === 'AssignmentExpression' && par.right === q.node ) {
				return par.left.type === 'MemberExpression' && ! par.left.computed && /^[a-z][A-Za-z]+$/.test( par.left.property.name || '' );
			}
			if ( par.type === 'CallExpression' && par.arguments.includes( q.node ) && /Preview|Style|Paint|Css|resolve/i.test( calleeName( par.callee ) ) ) return true;
			if ( /Statement|Declaration$/.test( par.type ) ) return false;
		}
		return false;
	}
	traverse( ast, {
		'MemberExpression|OptionalMemberExpression'( p ) {
			const o = p.node.object;
			if ( o.type === 'Identifier' && ATTR_OBJ_RE.test( o.name ) ) {
				const attr = ! p.node.computed && p.node.property.type === 'Identifier' ? p.node.property.name : p.node.computed && p.node.property.type === 'StringLiteral' ? p.node.property.value : null;
				if ( attr ) noteRead( attr, p, p.node.start );
			}
		},
		VariableDeclarator( p ) {
			const init = p.node.init;
			const fromAttrs = init && ( ( init.type === 'Identifier' && ATTR_OBJ_RE.test( init.name ) ) || ( init.type === 'MemberExpression' && init.property.name === 'attributes' ) );
			if ( p.node.id.type !== 'ObjectPattern' || ! fromAttrs ) return;
			for ( const pr of p.node.id.properties ) {
				if ( pr.type !== 'ObjectProperty' ) continue;
				const attr = pr.key.name || pr.key.value;
				const local = pr.value.type === 'Identifier' ? pr.value.name : pr.value.type === 'AssignmentPattern' && pr.value.left.type === 'Identifier' ? pr.value.left.name : null;
				const b = local && p.scope.getBinding( local );
				if ( b ) b.referencePaths.forEach( ( r ) => noteRead( attr, r, r.node.start ) );
			}
		},
		ObjectProperty( p ) {
			const kn = p.node.key && ( p.node.key.value || p.node.key.name || '' );
			if ( typeof kn === 'string' && kn.startsWith( '--sgs-' ) && ! isControlPos( p.node.start ) ) {
				const ids = identsIn( p.node.value );
				out.cpCanvas[ kn ] = [ ...new Set( [ ...( out.cpCanvas[ kn ] || [] ), ...ids ] ) ].sort();
			}
		},
		'StringLiteral|TemplateElement'( p ) {
			const v = p.node.type === 'StringLiteral' ? p.node.value : p.node.value.raw;
			for ( const m of v.match( /--sgs-[a-z0-9-]+/g ) || [] ) if ( ! isControlPos( p.node.start ) && ! out.cpCanvas[ m ] ) out.cpCanvas[ m ] = [];
		},
		CallExpression( p ) {
			if ( isControlPos( p.node.start ) ) return;
			const args = p.node.arguments;
			const passes = args.some( ( a ) => derivesAttrs( a, p.scope, 0 ) );
			if ( passes ) out.canvasCalls.push( { fn: calleeName( p.node.callee ), prefixes: args.filter( ( a ) => a.type === 'StringLiteral' ).map( ( a ) => a.value ) } );
		},
		JSXOpeningElement( p ) {
			if ( isControlPos( p.node.start ) ) return;
			const attrs = p.node.attributes.filter( ( a ) => a.type === 'JSXAttribute' && a.name );
			const passes = attrs.some( ( a ) => a.value && a.value.type === 'JSXExpressionContainer' && derivesAttrs( a.value.expression, p.scope, 0 ) ) || p.node.attributes.some( ( a ) => a.type === 'JSXSpreadAttribute' );
			const pre = attrs.find( ( a ) => a.name.name === 'prefix' && a.value && a.value.type === 'StringLiteral' );
			if ( passes ) out.canvasJsx.push( { tag: tagName( p.node.name ), prefix: pre ? pre.value.value : null } );
		},
	} );
	for ( const m of src.matchAll( /\$\{\s*prefix\s*\}([A-Z][A-Za-z0-9]*)/g ) ) sfx.add( m[ 1 ] );
	for ( const m of src.matchAll( /prefix\s*\+\s*['"]([A-Z][A-Za-z0-9]*)['"]/g ) ) sfx.add( m[ 1 ] );
	for ( const m of src.matchAll( /\w*(?:[aA]ttrKey|[aA]ttrName|Name|\bk)\(\s*(?:prefix\s*,\s*)?['"]([A-Z][A-Za-z0-9]*)['"]\s*\)/g ) ) sfx.add( m[ 1 ] );
	out.literals = [ ...lits ].sort();
	out.setKeys = [ ...setKeys ].sort();
	out.controlReads = [ ...controlReads ].sort();
	out.realPropAttrs = [ ...realProp ].sort();
	out.prefixSuffixes = [ ...sfx ].sort();
	out.jsxTags = [ ...tags ].sort();
	for ( const [ k, v ] of [ ...canvas.entries() ].sort() ) out.canvasReads[ k ] = { whole: v.whole, tiers: [ ...v.tiers ].sort(), flag: v.flag };
	for ( const g of Object.keys( out.guarded ) ) out.guarded[ g ] = [ ...new Set( out.guarded[ g ] ) ].sort();
	return out;
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
			const r = resolveSpec( f, im.from );
			if ( ! r || ! r.startsWith( SRC ) ) continue;
			const targets = new Set();
			for ( const n of im.names ) targets.add( declaringFile( r, n ) || r );
			for ( const t of targets ) if ( t.endsWith( '.js' ) ) q.push( [ t, d + 1 ] );
		}
		for ( const t of fx.jsxTags ) {
			const r = COMPONENT_MAP.get( t );
			if ( r ) q.push( [ r, d + 1 ] );
		}
	}
	return [ ...seen.keys() ].sort();
}

const result = { blocks: {}, files: {}, extensions: [], exports: {} };
if ( fs.existsSync( BLOCKS ) ) {
	for ( const d of fs.readdirSync( BLOCKS, { withFileTypes: true } ).sort( ( a, b ) => ( a.name < b.name ? -1 : 1 ) ) ) {
		if ( ! d.isDirectory() || d.name === 'extensions' ) continue;
		const edit = path.join( BLOCKS, d.name, 'edit.js' );
		if ( ! fs.existsSync( edit ) ) continue;
		result.blocks[ d.name ] = { edit: rel( edit ), files: reach( edit, 6 ).map( rel ) };
	}
}
for ( const f of walkJs( path.join( BLOCKS, 'extensions' ), [] ) ) {
	result.extensions.push( rel( f ) );
	facts( f );
}
for ( const [ f, v ] of [ ...factCache.entries() ].sort( ( a, b ) => ( a[ 0 ] < b[ 0 ] ? -1 : 1 ) ) ) {
	result.files[ rel( f ) ] = v;
	result.exports[ rel( f ) ] = [ ...exportsOf( f ).declared ].sort();
}
process.stdout.write( JSON.stringify( result ) );
