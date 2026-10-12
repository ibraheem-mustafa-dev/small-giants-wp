// Deep static evaluation over one draft's parsed logic (Spec 48 §9, FR-48-30), the split-out extension of
// lib/intake-ast.mjs: evalStr there stops at a loop variable, so `'#/' + s.key` inside `arr.map(s => …)` (or an
// sc-for over such an array) is "built at run time". Here a value is followed to the data it comes from: a callback
// parameter of map/forEach/filter/find resolves to each element of the array it iterates, a member resolves through
// the object literals (spreads included), getters, class properties and `this.x = …` assignments holding it, and a
// called local function or method returns its result with that call's arguments bound. Results are refs
// { node, env } (env: a Map from a function node to the argument refs of one known call), so an element and its
// fields stay paired. Nothing here matches constructs with regular expressions over the logic (R-47-4).
import { resolveName, fnBinding, callsOf, keyName, isThisMember, propName, isFn, subtree, enclosingFn } from './intake-ast.mjs';

const ITER = new Set( [ 'map', 'flatMap', 'forEach', 'filter', 'find', 'findLast', 'some', 'every' ] );
const SAME = new Set( [ 'filter', 'slice', 'sort', 'reverse', 'toSorted', 'toReversed', 'concat' ] );
const MAX = 24;
const STRINGY = new Set( [ 'StringLiteral', 'NumericLiteral', 'TemplateLiteral', 'BinaryExpression', 'ConditionalExpression', 'LogicalExpression', 'NullLiteral' ] );

export const ref = ( node, env ) => ( { node, env: env || new Map() } );
const bind = ( env, fn, args ) => new Map( env ).set( fn, args );

// Class members by name for one parsed logic: getters, methods, class properties and `this.name = x` assignments.
const MEMBERS = new WeakMap();
function members( idx, name ) {
	if ( ! MEMBERS.has( idx ) ) {
		const m = new Map();
		const add = ( k, n ) => k && m.set( k, [ ...( m.get( k ) || [] ), n ] );
		for ( const n of idx.all ) {
			if ( /^Class(Method|Property)$/.test( n.type ) ) {
				add( keyName( n ), n );
			} else if ( 'AssignmentExpression' === n.type && '=' === n.operator && isThisMember( n.left ) ) {
				add( n.left.property.name, n );
			}
		}
		MEMBERS.set( idx, m );
	}
	return MEMBERS.get( idx ).get( name ) || [];
}

// The expressions a function returns: an arrow's expression body, else its own return statements' arguments.
export function returnsOf( idx, fn ) {
	if ( ! isFn( fn ) ) {
		return [];
	}
	if ( 'BlockStatement' !== fn.body.type ) {
		return [ fn.body ];
	}
	return subtree( idx, fn.body ).filter( ( n ) => 'ReturnStatement' === n.type && n.argument && enclosingFn( idx, n ) === fn ).map( ( n ) => n.argument );
}

// The refs a parameter can hold: the bound call's argument, the elements an iteration callback walks, else the
// argument at every call of the function.
function paramArgs( idx, r, env, depth, stack ) {
	if ( env.has( r.fn ) ) {
		const a = env.get( r.fn )[ r.index ];
		return a ? [ a ] : [];
	}
	const call = idx.parent.get( r.fn );
	if ( 'CallExpression' === call?.type && call.arguments[ 0 ] === r.fn && ITER.has( propName( call.callee ) ) ) {
		return 0 === r.index ? elementsOf( idx, ref( call.callee.object, env ), depth + 1, stack ) : [];
	}
	const b = fnBinding( idx, r.fn );
	return b ? callsOf( idx, b ).filter( ( c ) => c.arguments[ r.index ] ).map( ( c ) => ref( c.arguments[ r.index ], env ) ) : [];
}

// The refs `this.<name>` can hold: a getter's returns, a method or class property, and every this.<name> = x.
function thisRefs( idx, name, env, depth, stack ) {
	const out = [];
	for ( const m of members( idx, name ) ) {
		if ( 'ClassMethod' === m.type ) {
			out.push( ...( 'get' === m.kind ? returnsOf( idx, m ).flatMap( ( e ) => resolveRefs( idx, ref( e, env ), depth + 1, stack ) ) : [ ref( m, env ) ] ) );
		} else if ( 'ClassProperty' === m.type && m.value ) {
			out.push( ...( isFn( m.value ) ? [ ref( m.value, env ) ] : resolveRefs( idx, ref( m.value, env ), depth + 1, stack ) ) );
		} else if ( 'AssignmentExpression' === m.type ) {
			out.push( ...resolveRefs( idx, ref( m.right, env ), depth + 1, stack ) );
		}
	}
	return out;
}

const staticKey = ( n ) => ( 'StringLiteral' === n.type || 'NumericLiteral' === n.type ? String( n.value ) : null );

// The refs property `name` holds across terminal refs `objs` (object literals, Object.assign merges, array indexes).
export function propRefs( idx, objs, name, depth = 0, stack = new Map() ) {
	const out = [];
	for ( const t of objs ) {
		if ( t.merge ) {
			for ( const m of [ ...t.merge ].reverse() ) {
				const hit = propRefs( idx, [ m ], name, depth + 1, stack );
				if ( hit.length ) {
					out.push( ...hit );
					break;
				}
			}
		} else if ( 'ObjectExpression' === t.node?.type ) {
			const p = [ ...t.node.properties ].reverse().find( ( x ) => 'SpreadElement' !== x.type && keyName( x ) === name );
			if ( 'ObjectProperty' === p?.type ) {
				out.push( ...resolveRefs( idx, ref( p.value, t.env ), depth + 1, stack ) );
			} else if ( p ) {
				out.push( ...( 'get' === p.kind ? returnsOf( idx, p ).flatMap( ( e ) => resolveRefs( idx, ref( e, t.env ), depth + 1, stack ) ) : [ ref( p, t.env ) ] ) );
			} else {
				for ( const s of [ ...t.node.properties ].reverse().filter( ( x ) => 'SpreadElement' === x.type ) ) {
					const hit = propRefs( idx, resolveRefs( idx, ref( s.argument, t.env ), depth + 1, stack ), name, depth + 1, stack );
					if ( hit.length ) {
						out.push( ...hit );
						break;
					}
				}
			}
		} else if ( /^\d+$/.test( name ) ) {
			const els = elementsOf( idx, t, depth + 1, stack );
			if ( els[ Number( name ) ] ) {
				out.push( els[ Number( name ) ] );
			}
		}
	}
	return out;
}

// Every value an object (all property values) or array (all elements) can give, for a computed member with a key
// that cannot be read statically.
function allValues( idx, objs, depth, stack ) {
	return objs.flatMap( ( t ) => ( 'ObjectExpression' === t.node?.type
		? t.node.properties.flatMap( ( p ) => ( 'ObjectProperty' === p.type ? resolveRefs( idx, ref( p.value, t.env ), depth + 1, stack )
			: 'SpreadElement' === p.type ? allValues( idx, resolveRefs( idx, ref( p.argument, t.env ), depth + 1, stack ), depth + 1, stack ) : [] ) )
		: elementsOf( idx, t, depth + 1, stack ) ) );
}

// The terminal refs a member expression can hold.
function memberRefs( idx, r, depth, stack ) {
	const n = r.node;
	if ( isThisMember( n ) ) {
		return thisRefs( idx, n.property.name, r.env, depth, stack );
	}
	const objs = resolveRefs( idx, ref( n.object, r.env ), depth + 1, stack );
	if ( ! n.computed ) {
		return propRefs( idx, objs, n.property.name, depth + 1, stack );
	}
	const k = staticKey( n.property );
	return null === k ? allValues( idx, objs, depth + 1, stack ) : propRefs( idx, objs, k, depth + 1, stack );
}

// The function a callback argument names (an inline function, or a name resolving to one).
const fnOf = ( idx, node, env, depth, stack ) => ( isFn( node ) ? node : node && resolveRefs( idx, ref( node, env ), depth + 1, stack ).map( ( t ) => t.node ).find( isFn ) ) || null;

// The terminal refs a call can give: array pass-throughs, map results (one synthetic `items` list), find, an
// Object.assign merge, and the returns of a called local function or class method with the call's arguments bound.
function callRefs( idx, r, depth, stack ) {
	const n = r.node;
	const env = r.env;
	const args = n.arguments.map( ( a ) => ref( a, env ) );
	const m = propName( n.callee );
	const call = ( fn ) => returnsOf( idx, fn ).flatMap( ( e ) => resolveRefs( idx, ref( e, bind( env, fn, args ) ), depth + 1, stack ) );
	if ( 'MemberExpression' === n.callee.type ) {
		const keep = 'filter' === m && fnOf( idx, n.arguments[ 0 ], env, depth, stack );
		if ( keep && 'BlockStatement' !== keep.body.type ) {
			const els = elementsOf( idx, ref( n.callee.object, env ), depth + 1, stack );
			return [ { node: null, items: els.filter( ( el ) => false !== staticTruth( idx, keep.body, bind( env, keep, [ el ] ) ) ), env } ];
		}
		if ( SAME.has( m ) ) {
			const base = resolveRefs( idx, ref( n.callee.object, env ), depth + 1, stack ).filter( ( t ) => t.items || 'ArrayExpression' === t.node?.type );
			return 'concat' === m ? [ ...base, ...args.flatMap( ( a ) => resolveRefs( idx, a, depth + 1, stack ) ) ] : base;
		}
		if ( 'map' === m || 'flatMap' === m ) {
			const cb = fnOf( idx, n.arguments[ 0 ], env, depth, stack );
			if ( ! cb ) {
				return [ r ];
			}
			const items = elementsOf( idx, ref( n.callee.object, env ), depth + 1, stack ).flatMap( ( el ) => returnsOf( idx, cb ).flatMap( ( e ) => {
				const one = ref( e, bind( env, cb, [ el ] ) );
				return 'flatMap' === m ? elementsOf( idx, one, depth + 1, stack ) : resolveRefs( idx, one, depth + 1, stack );
			} ) );
			return [ { node: null, items, env } ];
		}
		if ( 'find' === m || 'findLast' === m ) {
			return elementsOf( idx, ref( n.callee.object, env ), depth + 1, stack );
		}
		if ( 'assign' === m && 'Object' === n.callee.object.name ) {
			return [ { node: null, merge: args.flatMap( ( a ) => resolveRefs( idx, a, depth + 1, stack ) ), env } ];
		}
		if ( isThisMember( n.callee ) ) {
			return thisRefs( idx, n.callee.property.name, env, depth, stack ).filter( ( t ) => isFn( t.node ) ).flatMap( ( t ) => call( t.node ) );
		}
		return [ r ];
	}
	const fns = 'Identifier' === n.callee.type ? resolveRefs( idx, ref( n.callee, env ), depth + 1, stack ).filter( ( t ) => isFn( t.node ) ) : [];
	return fns.length ? fns.flatMap( ( t ) => call( t.node ) ) : [ r ];
}

// Whether a predicate is statically true or false for one bound element (comparisons of single static strings,
// !, && and ||); null when it cannot be read, so a filter keeps every element it cannot judge.
export function staticTruth( idx, node, env = new Map() ) {
	if ( 'UnaryExpression' === node.type && '!' === node.operator ) {
		const v = staticTruth( idx, node.argument, env );
		return null === v ? null : ! v;
	}
	if ( 'LogicalExpression' === node.type && '??' !== node.operator ) {
		const [ a, b ] = [ staticTruth( idx, node.left, env ), staticTruth( idx, node.right, env ) ];
		if ( '&&' === node.operator ) {
			return false === a || false === b ? false : a && b ? true : null;
		}
		return true === a || true === b ? true : false === a && false === b ? false : null;
	}
	if ( 'BinaryExpression' === node.type && /^[!=]==?$/.test( node.operator ) ) {
		const one = ( x ) => {
			const r = evalDeep( idx, x, env );
			return 1 === r.values.length && ! r.partial.length && ! r.unresolved.length ? r.values[ 0 ] : null;
		};
		const [ a, b ] = [ one( node.left ), one( node.right ) ];
		return null === a || null === b ? null : ( a === b ) === node.operator.startsWith( '=' );
	}
	return null;
}

// The terminal refs an expression can hold: literals, object and array literals, functions, synthetic map results
// ({ items }) and merges ({ merge }); an expression that cannot be followed comes back as itself.
export function resolveRefs( idx, r, depth = 0, stack = new Map() ) {
	const n = r.node;
	if ( r.items || r.merge ) {
		return [ r ];
	}
	if ( ! n || depth > MAX ) {
		return [];
	}
	const seen = stack.get( n );
	if ( seen?.has( r.env ) ) {
		return [];
	}
	const next = new Map( stack ).set( n, new Set( seen ).add( r.env ) );
	const go = ( node ) => resolveRefs( idx, ref( node, r.env ), depth + 1, next );
	switch ( n.type ) {
		case 'Identifier': {
			const res = resolveName( idx, n );
			if ( ! res ) {
				return 'undefined' === n.name ? [] : [ r ];
			}
			if ( 'var' === res.kind ) {
				return ! res.init ? [] : res.key ? propRefs( idx, go( res.init ), res.key, depth + 1, next ) : go( res.init );
			}
			const vals = paramArgs( idx, res, r.env, depth, next ).flatMap( ( a ) => resolveRefs( idx, a, depth + 1, next ) );
			return res.key ? propRefs( idx, vals, res.key, depth + 1, next ) : vals;
		}
		case 'ConditionalExpression':
			return [ ...go( n.consequent ), ...go( n.alternate ) ];
		case 'LogicalExpression':
			return '&&' === n.operator ? go( n.right ) : [ ...go( n.left ), ...go( n.right ) ];
		case 'MemberExpression':
			return memberRefs( idx, r, depth, next );
		case 'CallExpression':
			return callRefs( idx, r, depth, next );
		case 'SequenceExpression':
			return go( n.expressions[ n.expressions.length - 1 ] );
		case 'AssignmentExpression':
			return go( n.right );
		default:
			return [ r ];
	}
}

// The element refs an array expression can hold (spreads flattened, each element resolved), across every array the
// expression can be.
export function elementsOf( idx, r, depth = 0, stack = new Map() ) {
	return resolveRefs( idx, r, depth, stack ).flatMap( ( t ) => {
		if ( t.items ) {
			return t.items;
		}
		if ( 'ArrayExpression' !== t.node?.type ) {
			return [];
		}
		return t.node.elements.filter( Boolean ).flatMap( ( el ) => ( 'SpreadElement' === el.type ? elementsOf( idx, ref( el.argument, t.env ), depth + 1, stack )
			: resolveRefs( idx, ref( el, t.env ), depth + 1, stack ) ) );
	} );
}

const empty = () => ( { values: [], partial: [], unresolved: [] } );
const merge = ( a, b ) => ( { values: [ ...a.values, ...b.values ], partial: [ ...a.partial, ...b.partial ], unresolved: [ ...a.unresolved, ...b.unresolved ] } );
const dedupe = ( r ) => ( { values: [ ...new Set( r.values ) ], partial: [ ...new Set( r.partial ) ], unresolved: r.unresolved } );

// The static strings an expression can produce, as intake-ast.mjs::evalStr returns them ({ values, partial,
// unresolved }), following loop variables, members and calls through resolveRefs. `env` pins parameters to one call
// (or one element, see loopEnvs).
export function evalDeep( idx, node, env = new Map(), depth = 0 ) {
	return dedupe( evalIn( idx, node, env, depth ) );
}

function evalIn( idx, node, env, depth ) {
	const out = empty();
	if ( ! node || depth > MAX ) {
		if ( node ) {
			out.unresolved.push( node );
		}
		return out;
	}
	switch ( node.type ) {
		case 'StringLiteral':
		case 'NumericLiteral':
			out.values.push( String( node.value ) );
			return out;
		case 'NullLiteral':
			return out;
		case 'TemplateLiteral':
			return concat( idx, node.quasis.flatMap( ( q, i ) => [ { type: 'StringLiteral', value: q.value.cooked }, node.expressions[ i ] ] ).filter( Boolean ), env, depth );
		case 'BinaryExpression':
			if ( '+' === node.operator ) {
				return concat( idx, [ node.left, node.right ], env, depth );
			}
			out.unresolved.push( node );
			return out;
		case 'ConditionalExpression':
			return merge( evalIn( idx, node.consequent, env, depth + 1 ), evalIn( idx, node.alternate, env, depth + 1 ) );
		case 'LogicalExpression':
			return '&&' === node.operator ? evalIn( idx, node.right, env, depth + 1 ) : merge( evalIn( idx, node.left, env, depth + 1 ), evalIn( idx, node.right, env, depth + 1 ) );
		case 'Identifier':
			if ( 'undefined' === node.name ) {
				return out;
			}
	}
	const terms = resolveRefs( idx, ref( node, env ), depth + 1 );
	if ( ! terms.length ) {
		out.unresolved.push( node );
	}
	return terms.reduce( ( acc, t ) => ( t.node && t.node !== node && STRINGY.has( t.node.type ) ? merge( acc, evalIn( idx, t.node, t.env, depth + 1 ) )
		: { ...acc, unresolved: [ ...acc.unresolved, t.node || node ] } ), out );
}

function concat( idx, parts, env, depth ) {
	let acc = { values: [ '' ], partial: [], unresolved: [] };
	for ( const p of parts ) {
		const r = evalIn( idx, p, env, depth + 1 );
		const values = acc.values.flatMap( ( a ) => r.values.map( ( b ) => a + b ) );
		const partial = [ ...acc.partial, ...acc.values.flatMap( ( a ) => r.partial.map( ( b ) => a + b ) ) ];
		if ( r.unresolved.length ) {
			partial.push( ...acc.values.filter( Boolean ) );
		}
		acc = { values, partial, unresolved: [ ...acc.unresolved, ...r.unresolved ] };
	}
	return acc;
}

// One env per element for the nearest iteration callback enclosing `node` (map/forEach/filter/… over an array the
// resolver can read), so a field read inside the callback is evaluated once per element; [ new Map() ] when `node`
// is not inside one.
export function loopEnvs( idx, node ) {
	for ( let fn = enclosingFn( idx, node ); fn; fn = enclosingFn( idx, fn ) ) {
		const call = idx.parent.get( fn );
		if ( 'CallExpression' === call?.type && call.arguments[ 0 ] === fn && ITER.has( propName( call.callee ) ) && fn.params.length ) {
			const els = elementsOf( idx, ref( call.callee.object ) );
			return els.length ? els.map( ( el ) => bind( new Map(), fn, [ el ] ) ) : [ new Map() ];
		}
	}
	return [ new Map() ];
}

// The one static string a field holds, or null (none, several, or not readable).
export function oneString( idx, node, env = new Map() ) {
	const r = evalDeep( idx, node, env );
	return 1 === r.values.length && ! r.partial.length && ! r.unresolved.length ? r.values[ 0 ] : null;
}
