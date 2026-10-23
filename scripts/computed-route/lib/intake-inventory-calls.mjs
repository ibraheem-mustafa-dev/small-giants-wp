// A shared helper's parameters bound to the arguments of the calls that run it (Spec 48 FR-48-25, METHOD.md §5.4): a
// Web Animations call inside a helper (`fx( host, el, kf, dur )` forwarding `kf` and `dur` into `el.animate()`) takes
// its keyframes, timing, element and host from each call site, followed out through every caller whose own arguments
// read the caller's parameters. A path is a Map(function node → the call that runs it); a parameter no call binds keeps
// its own name.
import { walkAst } from './intake-census-logic.mjs';
import { isFn, prop, memberOf, ancestors } from './intake-inventory-code.mjs';

const MAX_DEPTH = 4;
const INSERTS = /^(appendChild|append|prepend|insertBefore|before|after|replaceChildren|insertAdjacentElement)$/;

// A parameter's own name (a plain name or one with a default), else null.
const paramName = ( x ) => ( 'Identifier' === x?.type ? x.name : 'AssignmentPattern' === x?.type && 'Identifier' === x.left.type ? x.left.name : null );

// The names a subtree reads as values (never a member's property name or an object key).
function readsOf( p, nodes ) {
	const out = new Set();
	for ( const n of nodes.filter( Boolean ) ) {
		walkAst( n, ( x ) => {
			const up = p.parents.get( x );
			const key = ( 'MemberExpression' === up?.type && up.property === x && ! up.computed ) || ( 'ObjectProperty' === up?.type && up.key === x && ! up.computed );
			if ( 'Identifier' === x.type && ! key ) {
				out.add( x.name );
			}
		} );
		if ( 'Identifier' === n.type ) {
			out.add( n.name );
		}
	}
	return out;
}

// The calls that run a function node, outside the function itself: `this.<member>( … )` for a class member, `<name>( … )`
// for a function declaration or a function a variable holds.
export function callsOf( p, fn ) {
	const m = memberOf( p, fn );
	const outside = ( c ) => ! ( fn.start <= c.start && c.end <= fn.end );
	if ( m && ( m.node === fn || m.node.value === fn ) ) {
		return ( p.refs.get( m.name ) || [] ).map( ( r ) => p.parents.get( r ) ).filter( ( c ) => 'CallExpression' === c?.type && 'MemberExpression' === c.callee.type && prop( c.callee ) === m.name && outside( c ) );
	}
	const up = p.parents.get( fn );
	const name = 'FunctionDeclaration' === fn.type ? fn.id?.name : 'VariableDeclarator' === up?.type && up.init === fn && 'Identifier' === up.id.type ? up.id.name : null;
	return name ? ( p.calls.get( name ) || [] ).filter( outside ) : [];
}

// The call paths that run `node` with the parameters it reads bound: one Map(function → call) per chain of callers,
// followed outward while a call's arguments read its own function's parameters. `reads` are the names the node reads.
// Returns [ new Map() ] when the node reads no parameter or nothing calls the function that declares it.
export function callPaths( p, node, reads = readsOf( p, [ node ] ), depth = 0 ) {
	const fn = ancestors( p, node ).find( ( a ) => isFn( a ) && a.params.some( ( x ) => reads.has( paramName( x ) ) ) );
	const calls = fn && depth < MAX_DEPTH ? callsOf( p, fn ) : [];
	if ( ! calls.length ) {
		return [ new Map() ];
	}
	return calls.flatMap( ( call ) => callPaths( p, call, readsOf( p, call.arguments ), depth + 1 ).map( ( up ) => new Map( [ [ fn, call ], ...up ] ) ) );
}

// The function around a node that declares a parameter of the node's name, nearest first, or null.
function paramOwner( p, n ) {
	return ancestors( p, n ).find( ( a ) => isFn( a ) && a.params.some( ( x ) => paramName( x ) === n.name ) ) ?? null;
}

// The expression a parameter stands for on a path: the argument its call passes (followed through further bound
// parameters), the parameter's default when the call passes none, else the node itself.
export function resolveArg( p, n, path, depth = 0 ) {
	if ( 'Identifier' !== n?.type || ! path?.size || depth > MAX_DEPTH * 2 ) {
		return n;
	}
	const fn = paramOwner( p, n );
	const call = fn && path.get( fn );
	if ( ! call ) {
		return n;
	}
	const i = fn.params.findIndex( ( x ) => paramName( x ) === n.name );
	const arg = call.arguments[ i ];
	const fallback = 'AssignmentPattern' === fn.params[ i ].type ? fn.params[ i ].right : null;
	return arg || fallback ? resolveArg( p, arg ?? fallback, path, depth + 1 ) : n;
}

// The element a code-created element is inserted into (`host.appendChild( el )`, `host.append( el )`, …) in the functions
// a path runs through: the inserting call's receiver, or null. Two names are one element when they resolve to the same
// node, or are the same local name in the same function.
export function insertedInto( p, el, path ) {
	const fnOf = ( n ) => ancestors( p, n ).find( isFn );
	const scopes = [ fnOf( el ), ...( path?.keys() || [] ), ...[ ...( path?.values() || [] ) ].map( fnOf ) ].filter( Boolean );
	const target = resolveArg( p, el, path );
	const same = ( a ) => {
		const r = resolveArg( p, a, path );
		return r === target || ( 'Identifier' === r?.type && 'Identifier' === target?.type && r.name === target.name && fnOf( r ) === fnOf( target ) );
	};
	for ( const fn of scopes ) {
		let found = null;
		walkAst( fn, ( x ) => {
			if ( ! found && 'CallExpression' === x.type && 'MemberExpression' === x.callee.type && INSERTS.test( prop( x.callee ) ?? '' ) && x.arguments.some( same ) ) {
				found = x.callee.object;
			}
		} );
		if ( found ) {
			return found;
		}
	}
	return null;
}
