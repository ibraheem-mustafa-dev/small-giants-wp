// The object literals a draft component's logic writes its class state with, read from a parsed logic
// (lib/intake-ast.mjs::parseLogic `idx`): the initial `state = { … }` class property, and the object every setState({ … })
// call (or the updater it is given, `s => ({ … })`) writes. Used by lib/intake-breakpoints.mjs (the state keys written from
// a width read), lib/read-logic-conditions.mjs (the class state keys and their writers) and lib/catalogue-options.mjs (a
// key's first value).
import { keyName, propName } from './intake-ast.mjs';

// The initial class state object (`state = { … }`), or null when the component declares none as an object literal.
export const initialStateObject = ( idx ) => idx.all.find( ( n ) => 'ClassProperty' === n.type && 'state' === keyName( n ) && 'ObjectExpression' === n.value?.type )?.value ?? null;

// Every object literal that writes class state: `state = { … }` and the object of every setState call.
export function stateObjects( idx ) {
	return idx.all.filter( ( n ) => 'ClassProperty' === n.type && 'state' === keyName( n ) ).map( ( n ) => n.value )
		.concat( idx.all.filter( ( n ) => 'CallExpression' === n.type && 'setState' === propName( n.callee ) ).map( ( n ) => n.arguments[ 0 ] ) )
		.map( ( v ) => ( /Function/.test( v?.type || '' ) ? v.body : v ) ).filter( ( v ) => 'ObjectExpression' === v?.type );
}
