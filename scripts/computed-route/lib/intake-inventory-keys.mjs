// The re-derived inventory's state keys (Spec 48 FR-48-25, METHOD.md §7), on the syntax tree of
// lib/intake-inventory-code.mjs::codeModel: the keys each class member's setState writes, the keys a router or the
// viewport writes, and what makes a program's output time-dependent.
import { walkAst } from './intake-census-logic.mjs';
import { isFn, isThis, prop, ancestors, declaratorsOf } from './intake-inventory-code.mjs';

// Per class member, the state keys its setState calls write: Map(member → Set(keys)).
export function stateWriters( p ) {
	const out = new Map();
	for ( const [ name, node ] of p?.members || [] ) {
		const keys = new Set();
		walkAst( node, ( n ) => {
			if ( 'CallExpression' === n.type && isThis( n.callee ) && 'setState' === prop( n.callee ) ) {
				let arg = n.arguments[ 0 ];
				arg = isFn( arg ) ? arg.body : arg;
				arg = 'ParenthesizedExpression' === arg?.type ? arg.expression : arg;
				( 'ObjectExpression' === arg?.type ? arg.properties : [] ).filter( ( x ) => 'ObjectProperty' === x.type && ! x.computed ).forEach( ( x ) => keys.add( x.key.name ?? x.key.value ) );
			}
		} );
		if ( keys.size ) {
			out.set( name, keys );
		}
	}
	return out;
}

// The state keys whose written value reads a member matching `test` (a property name pattern), directly, through a
// local variable, or through a this.<member> it calls (depth 3): in the class field `state = {…}` and in every
// setState object.
function keysReading( p, test ) {
	const out = new Set();
	const declarators = p ? declaratorsOf( p ) : new Map();
	const reads = ( node, depth = 0 ) => {
		let hit = false;
		let fn;
		walkAst( node, ( x ) => {
			if ( hit || depth > 3 ) {
				return;
			}
			if ( ( 'MemberExpression' === x.type && test.test( prop( x ) ?? '' ) ) || ( 'Identifier' === x.type && test.test( x.name ) ) ) {
				hit = true;
			} else if ( 'CallExpression' === x.type && isThis( x.callee ) && p.members.has( prop( x.callee ) ) ) {
				const m = p.members.get( prop( x.callee ) );
				hit = reads( m.body ?? m.value, depth + 1 );
			} else if ( 'Identifier' === x.type ) {
				fn = undefined === fn ? ancestors( p, node ).find( isFn ) ?? null : fn;
				const decl = fn && declarators.get( x.name )?.find( ( d ) => fn.start <= d.start && d.end <= fn.end );
				hit = Boolean( decl && decl.init !== node && reads( decl.init, depth + 1 ) );
			}
		} );
		return hit;
	};
	const state = p?.members.get( 'state' )?.value;
	for ( const n of p?.nodes || [] ) {
		if ( 'ObjectProperty' === n.type && ! n.computed ) {
			const call = ancestors( p, n ).find( ( a ) => 'CallExpression' === a.type );
			const inState = state && state === p.parents.get( n );
			if ( ( inState || ( call && isThis( call.callee ) && 'setState' === prop( call.callee ) ) ) && reads( n.value ) ) {
				out.add( n.key.name ?? n.key.value );
			}
		}
	}
	return out;
}

// The state keys a router writes (METHOD.md §7 route sc-ifs): their value reads `location` or `hash`.
export const routeKeys = ( p ) => keysReading( p, /^(location|hash)$/ );

// The state keys the viewport writes (breakpoint sc-ifs): their value reads the window or root size or a media query.
export const viewportKeys = ( p ) => keysReading( p, /^(innerWidth|innerHeight|outerWidth|clientWidth|matchMedia|visualViewport|contentRect)$/ );

// What makes a program's output time-dependent (METHOD.md §7): the globals it reads among Date, Math.random,
// localStorage, sessionStorage, setInterval, setTimeout and requestAnimationFrame.
export function timeReads( p ) {
	const out = new Set();
	for ( const n of p?.nodes || [] ) {
		if ( 'Identifier' === n.type && /^(Date|localStorage|sessionStorage|setInterval|setTimeout|requestAnimationFrame)$/.test( n.name ) ) {
			out.add( n.name );
		} else if ( 'MemberExpression' === n.type && 'Math' === n.object?.name && 'random' === prop( n ) ) {
			out.add( 'Math.random' );
		}
	}
	return [ ...out ].sort();
}
