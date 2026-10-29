'use strict';

/**
 * The allowed values of a block's "choose from a list" settings, read from the block's own editor source.
 *
 *   node block-source-choices.js <blocks dir>
 *
 * For every block folder it parses edit.js and the relative modules it imports (as code, with @babel/parser, the parser the
 * inspector scanner uses), finds each SelectControl, RadioControl and ToggleGroupControl, names the block.json attribute the
 * control's `value` reads, and resolves the control's option list: an `options` array or constant (followed through top-level
 * constants and relative imports), or ToggleGroupControlOption children written out or mapped from such a constant.
 *
 * Prints one JSON object on stdout:
 *   { "<block folder>": { "<attribute>": { "values": [ ... ], "files": [ ... ] }
 *                                       | { "gap": "<why the list cannot be read statically>", "files": [ ... ] } } }
 * A list that is built at run time (a call, a filter, a computed value) is a `gap` with its reason, never a guess. An attribute
 * with several controls takes the union of their lists; one unreadable control makes the whole attribute a gap.
 */

const fs = require( 'fs' );
const path = require( 'path' );

let parser = null;
try {
	parser = require( '@babel/parser' );
} catch ( e ) {
	process.stderr.write( `@babel/parser is not available (${ e.message }); run npm ci in plugins/sgs-blocks\n` );
	process.exit( 2 );
}

const CONTROLS = new Set( [ 'SelectControl', 'RadioControl', 'ToggleGroupControl' ] );
const OPTION_ELEMENTS = new Set( [ 'ToggleGroupControlOption', 'ToggleGroupControlOptionIcon' ] );
const PARSE_OPTIONS = { sourceType: 'module', plugins: [ 'jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator' ], errorRecovery: false };
const MAX_DEPTH = 12;

const parsed = new Map();

class Unreadable extends Error {}

function load( file ) {
	if ( ! parsed.has( file ) ) {
		let entry = null;
		let ast = null;
		if ( fs.existsSync( file ) ) {
			try {
				ast = parser.parse( fs.readFileSync( file, 'utf8' ), PARSE_OPTIONS ).program;
			} catch ( e ) {
				process.stderr.write( `${ file } could not be parsed: ${ e.message }\n` );
			}
		}
		if ( ast ) {
			entry = { file, ast, consts: new Map(), imports: new Map(), stars: [] };
			for ( const node of ast.body ) {
				const decl = node.type === 'ExportNamedDeclaration' && node.declaration ? node.declaration : node;
				if ( decl.type === 'FunctionDeclaration' && decl.id ) {
					entry.consts.set( decl.id.name, decl );
				} else if ( node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'FunctionDeclaration' ) {
					entry.consts.set( 'default', node.declaration );
				} else if ( decl.type === 'VariableDeclaration' ) {
					for ( const d of decl.declarations ) {
						if ( d.id.type === 'Identifier' && d.init ) {
							entry.consts.set( d.id.name, d.init );
						}
					}
				} else if ( node.type === 'ImportDeclaration' && node.source.value.startsWith( '.' ) ) {
					for ( const s of node.specifiers ) {
						entry.imports.set( s.local.name, { from: node.source.value, imported: s.type === 'ImportSpecifier' ? s.imported.name || s.imported.value : 'default' } );
					}
				} else if ( node.type === 'ExportNamedDeclaration' && node.source && node.source.value.startsWith( '.' ) ) {
					for ( const s of node.specifiers.filter( ( x ) => x.type === 'ExportSpecifier' ) ) {
						entry.imports.set( s.exported.name || s.exported.value, { from: node.source.value, imported: s.local.name || s.local.value } );
					}
				} else if ( node.type === 'ExportAllDeclaration' && node.source.value.startsWith( '.' ) ) {
					entry.stars.push( node.source.value );
				}
			}
		}
		parsed.set( file, entry );
	}
	return parsed.get( file );
}

function resolveModule( fromFile, spec ) {
	const raw = path.resolve( path.dirname( fromFile ), spec );
	for ( const c of /\.jsx?$/.test( raw ) ? [ raw ] : [ `${ raw }.js`, path.join( raw, 'index.js' ) ] ) {
		if ( fs.existsSync( c ) && fs.statSync( c ).isFile() ) {
			return c;
		}
	}
	return null;
}

// The expression an identifier names in a file (its own top-level constant, else the constant a relative import brings).
function lookup( file, name, depth = 0 ) {
	const mod = load( file );
	if ( ! mod || depth > MAX_DEPTH ) {
		return null;
	}
	if ( mod.consts.has( name ) ) {
		return { node: mod.consts.get( name ), file };
	}
	const imp = mod.imports.get( name );
	if ( imp ) {
		const target = resolveModule( file, imp.from );
		return target ? lookup( target, imp.imported, depth + 1 ) : null;
	}
	for ( const star of mod.stars ) {
		const target = resolveModule( file, star );
		const found = target ? lookup( target, name, depth + 1 ) : null;
		if ( found ) {
			return found;
		}
	}
	return null;
}

function scalarOf( node, file, depth = 0 ) {
	if ( depth > MAX_DEPTH ) {
		throw new Unreadable( 'a value nested too deep to follow' );
	}
	switch ( node.type ) {
		case 'StringLiteral':
		case 'NumericLiteral':
		case 'BooleanLiteral':
			return node.value;
		case 'NullLiteral':
			return null;
		case 'TemplateLiteral':
			if ( ! node.expressions.length ) {
				return node.quasis[ 0 ].value.cooked;
			}
			throw new Unreadable( 'a template literal value' );
		case 'UnaryExpression':
			if ( node.operator === '-' && node.argument.type === 'NumericLiteral' ) {
				return -node.argument.value;
			}
			throw new Unreadable( 'a computed value' );
		case 'TSAsExpression':
		case 'ParenthesizedExpression':
			return scalarOf( node.expression, file, depth + 1 );
		case 'Identifier': {
			const found = lookup( file, node.name );
			if ( found ) {
				return scalarOf( found.node, found.file, depth + 1 );
			}
			throw new Unreadable( `the value ${ node.name } is not a constant in the block's source` );
		}
		default:
			throw new Unreadable( `a ${ node.type } value` );
	}
}

// The `value` of every option object in an array expression, in order, with the file context it was read in.
function optionValues( node, file, depth = 0 ) {
	if ( depth > MAX_DEPTH ) {
		throw new Unreadable( 'a list nested too deep to follow' );
	}
	switch ( node.type ) {
		case 'ArrayExpression': {
			const out = [];
			for ( const el of node.elements ) {
				if ( ! el ) {
					continue;
				}
				if ( el.type === 'SpreadElement' ) {
					out.push( ...optionValues( el.argument, file, depth + 1 ) );
				} else if ( el.type === 'ObjectExpression' ) {
					const prop = el.properties.find( ( p ) => p.type === 'ObjectProperty' && ! p.computed && ( p.key.name === 'value' || p.key.value === 'value' ) );
					if ( ! prop ) {
						throw new Unreadable( 'an option with no literal value' );
					}
					out.push( scalarOf( prop.value, file ) );
				} else {
					out.push( scalarOf( el, file ) );
				}
			}
			return out;
		}
		case 'Identifier': {
			const found = lookup( file, node.name );
			if ( found ) {
				return optionValues( found.node, found.file, depth + 1 );
			}
			throw new Unreadable( `the list ${ node.name } is not a constant in the block's source` );
		}
		case 'ConditionalExpression':
			return [ ...optionValues( node.consequent, file, depth + 1 ), ...optionValues( node.alternate, file, depth + 1 ) ];
		case 'LogicalExpression':
			return node.operator === '&&' ? optionValues( node.right, file, depth + 1 ) : [ ...optionValues( node.left, file, depth + 1 ), ...optionValues( node.right, file, depth + 1 ) ];
		case 'TSAsExpression':
		case 'ParenthesizedExpression':
			return optionValues( node.expression, file, depth + 1 );
		case 'CallExpression':
			throw new Unreadable( 'a list built at run time by a call' );
		default:
			throw new Unreadable( `a list built from a ${ node.type }` );
	}
}

const jsxName = ( el ) => ( el.openingElement.name.type === 'JSXIdentifier' ? el.openingElement.name.name : null );
const jsxProp = ( el, name ) => el.openingElement.attributes.find( ( a ) => a.type === 'JSXAttribute' && a.name.name === name );
const propExpression = ( p ) => ( p.value && p.value.type === 'JSXExpressionContainer' ? p.value.expression : p.value );

// `attributes` or `props.attributes`: the object a block's attributes are read from.
const isAttributesObject = ( o ) => ( o.type === 'Identifier' && o.name === 'attributes' ) || ( o.type === 'MemberExpression' && ! o.computed && o.property.name === 'attributes' );

// The block.json attribute a control's `value` reads: the first identifier or member name inside the expression that is one.
function attributeOf( expr, attributes ) {
	let found = null;
	( function walk( n ) {
		if ( ! n || found || typeof n.type !== 'string' ) {
			return;
		}
		if ( n.type === 'Identifier' && attributes.has( n.name ) ) {
			found = n.name;
			return;
		}
		if ( n.type === 'MemberExpression' && ! n.computed && n.property.type === 'Identifier' && attributes.has( n.property.name ) && isAttributesObject( n.object ) ) {
			found = n.property.name;
			return;
		}
		for ( const key of [ 'left', 'right', 'object', 'expression', 'test', 'consequent', 'alternate', 'argument' ] ) {
			walk( n[ key ] );
		}
	}( expr ) );
	return found;
}

// The values a ToggleGroupControl's children give: written-out options, options mapped from a constant, and either inside a
// condition.
function childValues( children, file ) {
	const out = [];
	const fromElement = ( el ) => {
		if ( OPTION_ELEMENTS.has( jsxName( el ) ) ) {
			const p = jsxProp( el, 'value' );
			if ( ! p ) {
				throw new Unreadable( 'an option element with no value' );
			}
			out.push( scalarOf( propExpression( p ), file ) );
		} else {
			children_( el.children );
		}
	};
	const fromExpression = ( e ) => {
		if ( e.type === 'JSXElement' ) {
			fromElement( e );
		} else if ( e.type === 'JSXFragment' ) {
			children_( e.children );
		} else if ( e.type === 'ConditionalExpression' ) {
			fromExpression( e.consequent );
			fromExpression( e.alternate );
		} else if ( e.type === 'LogicalExpression' ) {
			fromExpression( e.right );
		} else if ( e.type === 'NullLiteral' || ( e.type === 'Identifier' && e.name === 'undefined' ) || e.type === 'BooleanLiteral' ) {
			// renders nothing
		} else if ( e.type === 'CallExpression' && e.callee.type === 'MemberExpression' && e.callee.property.name === 'map' ) {
			out.push( ...optionValues( e.callee.object, file ) );
		} else {
			throw new Unreadable( `an option list built from a ${ e.type }` );
		}
	};
	const children_ = ( list ) => {
		for ( const ch of list ) {
			if ( ch.type === 'JSXElement' ) {
				fromElement( ch );
			} else if ( ch.type === 'JSXExpressionContainer' && ch.expression.type !== 'JSXEmptyExpression' ) {
				fromExpression( ch.expression );
			}
		}
	};
	children_( children );
	return out;
}

// Every node under `root`, parents first.
function walkNodes( root, visit ) {
	( function walk( n ) {
		if ( ! n || typeof n.type !== 'string' ) {
			return;
		}
		visit( n );
		for ( const key of Object.keys( n ) ) {
			if ( key === 'loc' || key === 'start' || key === 'end' ) {
				continue;
			}
			const child = n[ key ];
			if ( Array.isArray( child ) ) {
				child.forEach( walk );
			} else if ( child && typeof child.type === 'string' ) {
				walk( child );
			}
		}
	}( root ) );
}

// The values one control lists (throws Unreadable when they are not static).
function controlValues( n, file ) {
	if ( jsxName( n ) === 'ToggleGroupControl' ) {
		return childValues( n.children, file );
	}
	const opts = jsxProp( n, 'options' );
	if ( ! opts ) {
		throw new Unreadable( `a ${ jsxName( n ) } with no options prop` );
	}
	return optionValues( propExpression( opts ), file );
}

const mentions = ( expr, name ) => {
	let hit = false;
	walkNodes( expr, ( n ) => {
		hit = hit || ( n.type === 'Identifier' && n.name === name );
	} );
	return hit;
};

// The function a component name stands for (a declaration, an arrow or a memo/forwardRef wrapper round one).
function componentFunction( file, name ) {
	const found = lookup( file, name );
	let node = found && found.node;
	while ( node && node.type === 'CallExpression' && node.arguments.length ) {
		node = node.arguments[ 0 ];
	}
	return node && /^(FunctionDeclaration|ArrowFunctionExpression|FunctionExpression)$/.test( node.type ) ? { fn: node, file: found.file } : null;
}

// The local name a component gives the prop it is passed (`function C( { styleValue: current = 'x' } )` gives `current`).
function propLocalName( fn, prop ) {
	const param = fn.params[ 0 ];
	if ( ! param || param.type !== 'ObjectPattern' ) {
		return null;
	}
	const p = param.properties.find( ( x ) => x.type === 'ObjectProperty' && ! x.computed && ( x.key.name === prop || x.key.value === prop ) );
	const target = p && ( p.value.type === 'AssignmentPattern' ? p.value.left : p.value );
	return target && target.type === 'Identifier' ? target.name : null;
}

const isComponentElement = ( n ) => n.type === 'JSXElement' && /^[A-Z]/.test( jsxName( n ) || '' ) && ! CONTROLS.has( jsxName( n ) );

// Each control inside a component that reads the prop `local`, following the prop into the components it passes it to.
function controlsReading( fn, file, local, depth, out ) {
	walkNodes( fn.body, ( n ) => {
		if ( n.type === 'JSXElement' && CONTROLS.has( jsxName( n ) ) ) {
			const valueProp = jsxProp( n, 'value' );
			if ( valueProp && mentions( propExpression( valueProp ), local ) ) {
				try {
					out.push( { values: controlValues( n, file ), file } );
				} catch ( e ) {
					if ( ! ( e instanceof Unreadable ) ) {
						throw e;
					}
					out.push( { gap: e.message, file } );
				}
			}
		} else if ( isComponentElement( n ) && depth < 4 ) {
			for ( const a of n.openingElement.attributes ) {
				const expr = a.type === 'JSXAttribute' ? propExpression( a ) : null;
				const comp = expr && expr.type === 'Identifier' && expr.name === local ? componentFunction( file, jsxName( n ) ) : null;
				const inner = comp && propLocalName( comp.fn, a.name.name );
				inner && controlsReading( comp.fn, comp.file, inner, depth + 1, out );
			}
		}
	} );
}

function controlsOf( file, attributes, found ) {
	const mod = load( file );
	if ( ! mod ) {
		return;
	}
	const slotOf = ( attr ) => {
		if ( ! found.has( attr ) ) {
			found.set( attr, { values: [], files: new Set(), gap: null } );
		}
		return found.get( attr );
	};
	walkNodes( mod.ast, ( n ) => {
		if ( n.type !== 'JSXElement' ) {
			return;
		}
		if ( CONTROLS.has( jsxName( n ) ) ) {
			const valueProp = jsxProp( n, 'value' );
			const attr = valueProp ? attributeOf( propExpression( valueProp ), attributes ) : null;
			if ( attr ) {
				const slot = slotOf( attr );
				slot.files.add( path.basename( file ) );
				try {
					slot.values.push( ...controlValues( n, file ) );
				} catch ( e ) {
					if ( ! ( e instanceof Unreadable ) ) {
						throw e;
					}
					slot.gap = slot.gap || e.message;
				}
			}
		} else if ( isComponentElement( n ) ) {
			// A shared component that draws the control: follow the attribute through the prop it is passed in.
			const comp = componentFunction( file, jsxName( n ) );
			for ( const a of comp ? n.openingElement.attributes : [] ) {
				const attr = a.type === 'JSXAttribute' && propExpression( a ) ? attributeOf( propExpression( a ), attributes ) : null;
				const local = attr && propLocalName( comp.fn, a.name.name );
				const reads = [];
				local && controlsReading( comp.fn, comp.file, local, 0, reads );
				for ( const r of reads ) {
					const slot = slotOf( attr );
					slot.files.add( path.basename( r.file ) );
					r.gap ? ( slot.gap = slot.gap || r.gap ) : slot.values.push( ...r.values );
				}
			}
		}
	} );
}

// edit.js and every relative module it imports, inside the block's own folder or the plugin's shared source.
function sourceFiles( blockDir, srcRoot ) {
	const entry = path.join( blockDir, 'edit.js' );
	if ( ! fs.existsSync( entry ) ) {
		return [];
	}
	const seen = new Set( [ entry ] );
	const queue = [ entry ];
	while ( queue.length ) {
		const file = queue.shift();
		const mod = load( file );
		if ( ! mod ) {
			continue;
		}
		for ( const node of mod.ast.body ) {
			const spec = ( node.type === 'ImportDeclaration' || ( node.type === 'ExportNamedDeclaration' && node.source ) || node.type === 'ExportAllDeclaration' ) && node.source ? node.source.value : null;
			if ( spec && spec.startsWith( '.' ) ) {
				const target = resolveModule( file, spec );
				if ( target && ! seen.has( target ) && path.relative( srcRoot, target ).split( path.sep )[ 0 ] !== '..' ) {
					seen.add( target );
					queue.push( target );
				}
			}
		}
	}
	return [ ...seen ];
}

function main() {
	const blocksDir = path.resolve( process.argv[ 2 ] || '' );
	if ( ! process.argv[ 2 ] || ! fs.existsSync( blocksDir ) ) {
		process.stderr.write( 'usage: node block-source-choices.js <blocks dir>\n' );
		process.exit( 2 );
	}
	const srcRoot = path.dirname( blocksDir );
	const result = {};
	for ( const name of fs.readdirSync( blocksDir ).sort() ) {
		const blockDir = path.join( blocksDir, name );
		const manifest = path.join( blockDir, 'block.json' );
		if ( ! fs.statSync( blockDir ).isDirectory() || ! fs.existsSync( manifest ) ) {
			continue;
		}
		const attributes = new Set( Object.keys( JSON.parse( fs.readFileSync( manifest, 'utf8' ) ).attributes || {} ) );
		const found = new Map();
		for ( const file of sourceFiles( blockDir, srcRoot ) ) {
			try {
				controlsOf( file, attributes, found );
			} catch ( e ) {
				process.stderr.write( `${ name }: ${ path.relative( blockDir, file ) } could not be parsed: ${ e.message }\n` );
			}
		}
		if ( found.size ) {
			result[ name ] = {};
			for ( const [ attr, slot ] of [ ...found ].sort( ( a, b ) => a[ 0 ].localeCompare( b[ 0 ] ) ) ) {
				const files = [ ...slot.files ].sort();
				if ( slot.gap ) {
					result[ name ][ attr ] = { gap: slot.gap, files };
				} else if ( ! slot.values.length ) {
					result[ name ][ attr ] = { gap: 'the control lists no values', files };
				} else {
					result[ name ][ attr ] = { values: slot.values.filter( ( v, i, all ) => all.indexOf( v ) === i ), files };
				}
			}
		}
	}
	process.stdout.write( `${ JSON.stringify( result, null, '\t' ) }\n` );
}

main();
