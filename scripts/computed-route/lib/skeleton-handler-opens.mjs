// Which surface a control's click handler opens (Spec 48 FR-48-6, the `blockPartOpener` standing rule), read from the draft's
// logic syntax tree, never run and never matched by a name: the handler is a renderVals key; the `this.setState(…)` calls
// inside its value write component state keys (an object literal, or a function returning one); a key written with a value
// that is not a falsy literal (false, null, undefined, 0, '') opens. A surface opens on that key when one of its
// surfaces.json states holds the key at `true` (the fact record's surface states). A computed key is unknown and opens
// nothing.
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { keyName, isThisMember, isFn, subtree } from './intake-ast.mjs';

// A literal the draft writes to close or clear a key.
const falsy = ( n ) => ( 'BooleanLiteral' === n?.type && false === n.value ) || 'NullLiteral' === n?.type || ( 'Identifier' === n?.type && 'undefined' === n.name ) || ( 'NumericLiteral' === n?.type && 0 === n.value ) || ( 'StringLiteral' === n?.type && '' === n.value );

// The state keys the setState calls inside `node` write with an opening value.
function opening( d, node ) {
	const out = new Set();
	for ( const n of subtree( d.idx, node ) ) {
		if ( 'CallExpression' !== n.type || ! isThisMember( n.callee, 'setState' ) ) {
			continue;
		}
		const arg = n.arguments[ 0 ];
		const obj = 'ObjectExpression' === arg?.type ? arg : isFn( arg ) && 'ObjectExpression' === arg.body?.type ? arg.body : null;
		( obj?.properties || [] ).filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed && keyName( p ) && ! falsy( p.value ) ).forEach( ( p ) => out.add( keyName( p ) ) );
	}
	return out;
}

// The state keys a component's renderVals handler `handler` writes with an opening value (an empty Set when the record
// names no draft file for the component or the handler is not a renderVals key). o: { folder, record, component, handler }.
export function handlerOpens( { folder, record, component, handler } ) {
	const d = draftLogicOf( { folder, record, component } );
	const value = d?.values.get( handler );
	return value ? opening( d, value ) : new Set();
}

// Whether a fact-record surface opens on one of `keys`: a state of it holds the key at true.
export const opensOn = ( surface, keys ) => ( surface?.states || [] ).some( ( st ) => Object.entries( st.state_keys || {} ).some( ( [ k, v ] ) => true === v && keys.has( k ) ) );
