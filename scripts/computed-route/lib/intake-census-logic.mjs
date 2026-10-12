// Construct census, static pass over the logic (Spec 48 FR-48-24, R-47-4). The draft's logic class (cut at the
// data-dc-script boundary, lib/intake-census-template.mjs::cutDraft) and each helmet script file are parsed with the
// pinned @babel/parser (FR-48-75) and the constructs are listed from the syntax tree, never from a regex: class getters,
// renderVals() keys, event wiring (addEventListener), timers, observers, Web Animations calls, and CSS transitions and
// keyframes written from code. A class member shape the walk does not understand is an `unknown` row; a renderVals()
// key that cannot be resolved statically is a gap row naming why (R-48-3). Logic draft IDs are
// `<component>:js:<file line>:<column>` (file lines, METHOD.md §6).
import { parse } from '@babel/parser';

const TIMERS = new Set( [ 'setTimeout', 'setInterval', 'requestAnimationFrame' ] );
const OBSERVERS = new Set( [ 'IntersectionObserver', 'ResizeObserver', 'MutationObserver' ] );
const GLOBALS = new Set( [ 'window', 'globalThis', 'self' ] );
const SKIP_KEYS = new Set( [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range' ] );
const MAX_DETAIL = 160;

// Parses JavaScript with the pinned parser; `startLine`/`startColumn` place it in its file. Throws the parser's error.
export function parseLogic( text, { startLine = 1, startColumn = 0, sourceType = 'module' } = {} ) {
	return parse( text, { sourceType, startLine, startColumn, plugins: [ 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock' ], errorRecovery: false } );
}

// Every AST node under `node`, depth first, with its parent chain: visit(node, parents).
export function walkAst( node, visit, parents = [] ) {
	if ( ! node || 'object' !== typeof node ) {
		return;
	}
	if ( Array.isArray( node ) ) {
		node.forEach( ( n ) => walkAst( n, visit, parents ) );
		return;
	}
	if ( 'string' !== typeof node.type ) {
		return;
	}
	visit( node, parents );
	const next = [ ...parents, node ];
	for ( const [ k, v ] of Object.entries( node ) ) {
		if ( ! SKIP_KEYS.has( k ) && v && 'object' === typeof v ) {
			walkAst( v, visit, next );
		}
	}
}

const isFn = ( n ) => n && [ 'ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration', 'ClassMethod', 'ClassPrivateMethod', 'ObjectMethod' ].includes( n.type );
const keyName = ( n ) => {
	if ( ! n ) {
		return null;
	}
	if ( 'Identifier' === n.type || 'PrivateName' === n.type ) {
		return 'PrivateName' === n.type ? `#${ n.id.name }` : n.name;
	}
	return [ 'StringLiteral', 'NumericLiteral' ].includes( n.type ) ? String( n.value ) : null;
};
// The global a callee names: `setTimeout` or `window.setTimeout` → 'setTimeout'.
const globalName = ( n ) => {
	if ( 'Identifier' === n?.type ) {
		return n.name;
	}
	if ( 'MemberExpression' === n?.type && ! n.computed && 'Identifier' === n.object.type && GLOBALS.has( n.object.name ) ) {
		return n.property.name;
	}
	return null;
};
const thisMember = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed && 'ThisExpression' === n.object.type ? keyName( n.property ) : null );
// CSS declarations of a string the way the runtime's cssToObj splits a style: [[property, value]].
export const cssDecls = ( css ) => css.split( ';' ).map( ( d ) => [ d.slice( 0, d.indexOf( ':' ) ).trim().toLowerCase(), d.slice( d.indexOf( ':' ) + 1 ).trim() ] ).filter( ( [ p ] ) => p && ! p.includes( ' ' ) );
// The census kind a CSS property belongs to: 'transition', 'keyframes' (animation*) or null.
export const motionKind = ( prop ) => ( /^-?(?:webkit-)?transition/.test( prop ) || 'transition' === prop ? 'transition' : /^-?(?:webkit-)?animation/.test( prop ) ? 'keyframes' : null );
const clip = ( s ) => ( s.length > MAX_DETAIL ? `${ s.slice( 0, MAX_DETAIL ) }…` : s );

// The `class Component` of a parsed logic program, or null.
const componentClass = ( ast ) => ast.program.body.map( ( s ) => ( 'ExportDefaultDeclaration' === s.type || 'ExportNamedDeclaration' === s.type ? s.declaration : s ) )
	.find( ( s ) => 'ClassDeclaration' === s?.type && 'Component' === s.id?.name ) || null;

// The class members as { name, shape, node } where shape is getter|method|field|arrow-field|static-field|static-method,
// and the members the walk does not understand as { unknown: why, node }.
export function classMembers( cls ) {
	const out = [];
	for ( const m of cls.body.body ) {
		const name = m.computed ? null : keyName( m.key );
		if ( [ 'ClassMethod', 'ClassPrivateMethod' ].includes( m.type ) ) {
			if ( m.computed ) {
				out.push( { unknown: `computed-key ${ 'method' === m.kind ? 'method' : `${ m.kind }ter` }`, node: m } );
			} else if ( 'set' === m.kind ) {
				out.push( { unknown: `setter ${ name }`, node: m } );
			} else {
				out.push( { name, shape: 'get' === m.kind ? 'getter' : m.static ? 'static-method' : 'method', node: m } );
			}
		} else if ( [ 'ClassProperty', 'ClassPrivateProperty' ].includes( m.type ) ) {
			if ( m.computed ) {
				out.push( { unknown: 'computed-key field', node: m } );
			} else {
				out.push( { name, shape: m.static ? 'static-field' : isFn( m.value ) ? 'arrow-field' : 'field', node: m } );
			}
		} else {
			out.push( { unknown: `${ m.type } member`, node: m } );
		}
	}
	return out;
}

// Static census of one component's logic. `source`: { component, logic, logicLine, logicColumn }.
// Returns { rows, gaps, model } where model = { members: Map(name → shape), valueOf: Map(renderVals key → value shape) }.
export function logicRows( { component, logic, logicLine = 1, logicColumn = 0 } ) {
	const rows = [];
	const gaps = [];
	const model = { members: new Map(), valueOf: new Map() };
	if ( ! logic.trim() ) {
		return { rows, gaps, model };
	}
	const at = ( n ) => `${ component }:js:${ n.loc.start.line }:${ n.loc.start.column }`;
	let ast;
	try {
		ast = parseLogic( logic, { startLine: logicLine, startColumn: logicColumn } );
	} catch ( e ) {
		rows.push( { kind: 'unknown', draftId: `${ component }:js`, component, detail: { why: `logic does not parse: ${ e.message }` } } );
		return { rows, gaps, model };
	}
	const cls = componentClass( ast );
	if ( ! cls ) {
		rows.push( { kind: 'unknown', draftId: `${ component }:js`, component, detail: { why: 'logic has no class Component' } } );
	} else {
		for ( const m of classMembers( cls ) ) {
			if ( m.unknown ) {
				rows.push( { kind: 'unknown', draftId: at( m.node ), component, detail: { why: m.unknown, text: clip( logic.slice( m.node.start, m.node.end ) ) } } );
				continue;
			}
			model.members.set( m.name, m.shape );
			if ( 'getter' === m.shape ) {
				rows.push( { kind: 'getter', draftId: at( m.node ), component, detail: { name: m.name } } );
			}
		}
		const rv = classMembers( cls ).find( ( m ) => 'renderVals' === m.name && 'method' === m.shape );
		if ( rv ) {
			const keys = returnKeys( rv.node, { cls, logic, seen: new Set( [ 'renderVals' ] ) } );
			const listed = new Set();
			for ( const k of keys ) {
				// A helper reached from several returns lists its keys once per site.
				const site = `${ k.node.start }:${ k.key ?? k.gap }`;
				if ( listed.has( site ) ) {
					continue;
				}
				listed.add( site );
				if ( k.gap ) {
					gaps.push( { construct: 'renderVals-key', draftId: at( k.node ), error: k.gap } );
				} else {
					model.valueOf.set( k.key, k.value );
					rows.push( { kind: 'renderVals-key', draftId: at( k.node ), component, detail: { name: k.key, value: k.value } } );
				}
			}
		}
	}
	rows.push( ...callSiteRows( ast, { component, logic, at } ) );
	return { rows, gaps, model };
}

// Constructs any script has at its call sites: timers, observers, Web Animations, addEventListener wiring, and CSS
// transitions or keyframes written from code. Used for the logic class and for helmet script files.
export function callSiteRows( ast, { component, logic, at } ) {
	const rows = [];
	const text = ( n ) => clip( logic.slice( n.start, n.end ) );
	walkAst( ast.program, ( n ) => {
		const row = ( kind, detail ) => rows.push( { kind, draftId: at( n ), component, detail } );
		if ( 'CallExpression' === n.type ) {
			const g = globalName( n.callee );
			if ( TIMERS.has( g ) ) {
				const delay = n.arguments[ 1 ];
				row( 'timer', { fn: g, delay: 'NumericLiteral' === delay?.type ? delay.value : delay ? text( delay ) : null } );
			}
			if ( 'MemberExpression' === n.callee.type && ! n.callee.computed ) {
				const prop = keyName( n.callee.property );
				if ( 'animate' === prop ) {
					row( 'waapi', { target: text( n.callee.object ) } );
				} else if ( 'addEventListener' === prop ) {
					const [ ev, fn ] = n.arguments;
					const method = thisMember( fn );
					row( 'handler', { wiring: 'addEventListener', target: text( n.callee.object ), event: 'StringLiteral' === ev?.type ? ev.value : ev ? text( ev ) : null, listener: fn ? ( isFn( fn ) ? 'inline function' : text( fn ) ) : null, method } );
				}
			}
		} else if ( 'NewExpression' === n.type && OBSERVERS.has( globalName( n.callee ) ) ) {
			row( 'observer', { type: globalName( n.callee ) } );
		} else if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && ! n.left.computed ) {
			const prop = keyName( n.left.property );
			const k = prop && motionKind( prop.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) );
			if ( k ) {
				row( k, { via: 'style-assign', property: prop, value: text( n.right ) } );
			}
		} else if ( 'ObjectProperty' === n.type && ! n.computed ) {
			const prop = keyName( n.key );
			const k = prop && motionKind( prop.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) );
			if ( k ) {
				row( k, { via: 'object-key', property: prop, value: text( n.value ) } );
			}
		} else if ( 'StringLiteral' === n.type || 'TemplateElement' === n.type ) {
			const s = 'StringLiteral' === n.type ? n.value : n.value.cooked ?? n.value.raw;
			if ( s.includes( '@keyframes' ) ) {
				row( 'keyframes', { via: 'css-string', value: clip( s ) } );
			}
			if ( s.includes( ':' ) ) {
				for ( const [ p, v ] of cssDecls( s ) ) {
					const k = motionKind( p );
					if ( k ) {
						row( k, { via: 'css-string', property: p, value: clip( v ) } );
					}
				}
			}
		}
	} );
	return rows;
}

// Static census of a helmet script file (FR-48-24: external scripts loaded in <helmet>). Parsed as a classic script,
// then as a module; a file that parses as neither is a gap row.
export function scriptRows( { component, text } ) {
	const at = ( n ) => `${ component }:js:${ n.loc.start.line }:${ n.loc.start.column }`;
	let ast = null;
	let error = null;
	for ( const sourceType of [ 'script', 'module' ] ) {
		try {
			ast = parseLogic( text, { sourceType } );
			break;
		} catch ( e ) {
			error = e;
		}
	}
	if ( ! ast ) {
		return { rows: [], gaps: [ { construct: 'helmet-script', draftId: `${ component }:js`, error: `does not parse: ${ error.message }` } ] };
	}
	return { rows: callSiteRows( ast, { component, logic: text, at } ), gaps: [] };
}

// The method a renderVals value shape wires, or null: `this.x`, `this.x.bind(this)`, or an arrow whose body only calls
// `this.x(...)`.
function wiredMethod( v ) {
	if ( thisMember( v ) ) {
		return thisMember( v );
	}
	if ( 'CallExpression' === v?.type && 'MemberExpression' === v.callee.type && 'bind' === keyName( v.callee.property ) ) {
		return thisMember( v.callee.object );
	}
	if ( 'ArrowFunctionExpression' === v?.type ) {
		const body = 'BlockStatement' === v.body.type && 1 === v.body.body.length && 'ExpressionStatement' === v.body.body[ 0 ].type ? v.body.body[ 0 ].expression : v.body;
		return 'CallExpression' === body?.type ? thisMember( body.callee ) : null;
	}
	return null;
}

// A renderVals value's shape: { type, method } (method: the class member a handler key wires, or null).
const valueShape = ( v ) => ( { type: v ? v.type : 'shorthand', method: v ? wiredMethod( v ) : null } );

// The return statements of a function body that belong to it (not to a nested function).
function ownReturns( fn ) {
	const out = [];
	walkAst( fn.body, ( n, parents ) => {
		if ( 'ReturnStatement' === n.type && ! parents.slice( 1 ).some( isFn ) ) {
			out.push( n );
		}
	} );
	return out;
}

// The keys of the object(s) a method returns: [{ key, value, node }] and [{ gap, node }] for what the tree cannot
// resolve (R-48-3). Resolves object literals, shorthand, a local object built then returned (later `obj.key = …` and
// `Object.assign(obj, {…})` add keys), and, returned or spread, this.state (from the class field `state = {…}`),
// another method's return (`this.homeVals(…)`) and `Object.assign(…)`.
function returnKeys( method, ctx ) {
	const out = [];
	const returns = ownReturns( method );
	if ( ! returns.length ) {
		return [ { gap: `${ keyName( method.key ) }() has no return statement of its own`, node: method } ];
	}
	for ( const r of returns ) {
		out.push( ...objectKeys( r.argument, method, ctx, r ) );
	}
	return out;
}

// The keys an expression evaluates to, as returnKeys lists them: an object literal, a local object, this.state, another
// method's return (`this.x(…)`) or `Object.assign(…)` of any of these.
function objectKeys( expr, fn, ctx, at ) {
	const src = ( n ) => clip( ctx.logic.slice( n.start, n.end ) );
	if ( ! expr ) {
		return [ { gap: 'returns nothing', node: at } ];
	}
	if ( 'ObjectExpression' === expr.type ) {
		const out = [];
		for ( const p of expr.properties ) {
			if ( 'SpreadElement' === p.type ) {
				out.push( ...objectKeys( p.argument, fn, ctx, p ) );
			} else if ( p.computed ) {
				out.push( { gap: `computed key [${ src( p.key ) }]`, node: p } );
			} else {
				out.push( { key: keyName( p.key ), value: valueShape( 'ObjectMethod' === p.type ? p : p.shorthand ? null : p.value ), node: p } );
			}
		}
		return out;
	}
	if ( 'Identifier' === expr.type ) {
		return localObjectKeys( expr.name, fn, ctx, at );
	}
	if ( 'state' === thisMember( expr ) ) {
		const field = classMembers( ctx.cls ).find( ( m ) => 'state' === m.name && 'field' === m.shape );
		return field && 'ObjectExpression' === field.node.value?.type ? objectKeys( field.node.value, fn, ctx, at ) : [ { gap: `${ src( expr ) }: the class has no state = {…} field`, node: at } ];
	}
	if ( 'CallExpression' === expr.type && 'Object.assign' === ctx.logic.slice( expr.callee.start, expr.callee.end ) ) {
		return expr.arguments.flatMap( ( a ) => objectKeys( a, fn, ctx, at ) );
	}
	if ( 'CallExpression' === expr.type && thisMember( expr.callee ) ) {
		const name = thisMember( expr.callee );
		const m = classMembers( ctx.cls ).find( ( x ) => name === x.name && 'method' === x.shape );
		if ( ! m ) {
			return [ { gap: `${ src( expr ) }: ${ name } is not a method of the class`, node: at } ];
		}
		if ( ctx.seen.has( name ) ) {
			return [ { gap: `${ src( expr ) }: recursive`, node: at } ];
		}
		return returnKeys( m.node, { ...ctx, seen: new Set( [ ...ctx.seen, name ] ) } );
	}
	return [ { gap: `${ expr.type } (${ src( expr ) }) is not an object the tree can list`, node: at } ];
}

// Keys of a local `const name = {…}` in `fn`, plus later `name.key = …` and `Object.assign(name, {…})`.
function localObjectKeys( name, fn, ctx, at ) {
	let decl = null;
	const extra = [];
	walkAst( fn.body, ( n, parents ) => {
		if ( parents.slice( 1 ).some( isFn ) ) {
			return;
		}
		if ( 'VariableDeclarator' === n.type && name === n.id?.name ) {
			decl = n;
		} else if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && name === n.left.object?.name ) {
			extra.push( n.left.computed ? { gap: `${ name }[…] assigned with a computed key`, node: n } : { key: keyName( n.left.property ), value: valueShape( n.right ), node: n } );
		} else if ( 'CallExpression' === n.type && 'Object.assign' === ctx.logic.slice( n.callee.start, n.callee.end ) && name === n.arguments[ 0 ]?.name ) {
			n.arguments.slice( 1 ).forEach( ( a ) => extra.push( ...objectKeys( a, fn, ctx, n ) ) );
		}
	} );
	if ( ! decl?.init ) {
		return [ { gap: `${ name } is not a local object`, node: at } ];
	}
	return [ ...objectKeys( decl.init, fn, ctx, at ), ...extra ];
}
