// Which surface a control's click handler opens (Spec 48 FR-48-6, the `blockPartOpener` and `drawerOpener` standing rules), read from the draft's
// logic syntax tree, never run and never matched by a name: the handler is a renderVals key; the `this.setState(…)` calls
// inside its value write component state keys (an object literal, or a function returning one); a key written with a value
// that is not a falsy literal (false, null, undefined, 0, '') opens. A surface opens on that key when one of its
// surfaces.json states holds the key at `true` (the fact record's surface states). A computed key is unknown and opens
// nothing.
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { keyName, isThisMember, isFn, subtree } from './intake-ast.mjs';

// A literal the draft writes to close or clear a key.
const falsy = ( n ) => ( 'BooleanLiteral' === n?.type && false === n.value ) || 'NullLiteral' === n?.type || ( 'Identifier' === n?.type && 'undefined' === n.name ) || ( 'NumericLiteral' === n?.type && 0 === n.value ) || ( 'StringLiteral' === n?.type && '' === n.value );

// The named properties of the object each `this.setState(…)` call inside `node` writes (an object literal, or a function
// returning one).
function patchProperties( d, node ) {
	const out = [];
	for ( const n of subtree( d.idx, node ) ) {
		if ( 'CallExpression' !== n.type || ! isThisMember( n.callee, 'setState' ) ) {
			continue;
		}
		const arg = n.arguments[ 0 ];
		const obj = 'ObjectExpression' === arg?.type ? arg : isFn( arg ) && 'ObjectExpression' === arg.body?.type ? arg.body : null;
		out.push( ...( obj?.properties || [] ).filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed && keyName( p ) ) );
	}
	return out;
}

// The state keys the setState calls inside `node` write, with an opening value (`closing` false) or with a falsy literal
// (`closing` true: the keys the handler closes or clears).
function writtenKeys( d, node, closing ) {
	return new Set( patchProperties( d, node ).filter( ( p ) => closing === falsy( p.value ) ).map( keyName ) );
}

// The state keys a component's renderVals handler `handler` writes with an opening value (an empty Set when the record
// names no draft file for the component or the handler is not a renderVals key). o: { folder, record, component, handler }.
export function handlerOpens( { folder, record, component, handler } ) {
	const d = draftLogicOf( { folder, record, component } );
	const value = d?.values.get( handler );
	return value ? writtenKeys( d, value, false ) : new Set();
}

// The literal a setState value is, or undefined for anything else (a state read, a computed value).
const literalOf = ( n ) => ( [ 'StringLiteral', 'NumericLiteral', 'BooleanLiteral' ].includes( n?.type ) ? n.value : undefined );

// The state keys a component's renderVals handler `handler` writes with an opening value, each with the literal values it
// writes ({ key -> Set of literals }; the set is empty when the value is not a literal): a modal that opens on
// `modal: 'size'` is opened by the handler writing 'size' to `modal`.
export function handlerWrites( { folder, record, component, handler } ) {
	const d = draftLogicOf( { folder, record, component } );
	const value = d?.values.get( handler );
	const out = new Map();
	for ( const p of value ? patchProperties( d, value ).filter( ( x ) => ! falsy( x.value ) ) : [] ) {
		const seen = out.get( keyName( p ) ) ?? out.set( keyName( p ), new Set() ).get( keyName( p ) );
		undefined !== literalOf( p.value ) && seen.add( literalOf( p.value ) );
	}
	return out;
}

// Whether a fact-record surface opens on the writes `written` (handlerWrites): a state holds one written key at true (the
// opens-on-any-write reading, opensOn), or at the very literal the handler writes to it (`modal: "size"`).
export const opensOnWrites = ( surface, written ) => opensOn( surface, new Set( written.keys() ) )
	|| ( surface?.states || [] ).some( ( st ) => Object.entries( st.state_keys || {} ).some( ( [ k, v ] ) => 'boolean' !== typeof v && written.get( k )?.has( v ) ) );

// The state keys a component's renderVals handler `handler` writes with a falsy literal (false, null, undefined, 0, ''): the
// keys it closes. A key it also writes with an opening value in the same handler is a toggle's, not a close.
export function handlerCloses( { folder, record, component, handler } ) {
	const d = draftLogicOf( { folder, record, component } );
	const value = d?.values.get( handler );
	if ( ! value ) {
		return new Set();
	}
	const opens = writtenKeys( d, value, false );
	return new Set( [ ...writtenKeys( d, value, true ) ].filter( ( k ) => ! opens.has( k ) ) );
}

// Whether a fact-record surface opens on one of `keys`: a state of it holds the key at true.
export const opensOn = ( surface, keys ) => ( surface?.states || [] ).some( ( st ) => Object.entries( st.state_keys || {} ).some( ( [ k, v ] ) => true === v && keys.has( k ) ) );
