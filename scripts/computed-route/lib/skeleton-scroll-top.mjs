// Whether a control's click handler scrolls the page back to its top and does nothing else the page shows (the back-to-top
// rule's signal by what the handler does, beside its words and its name: data/skeleton-decisions.json `rules.backToTop`),
// read from the draft's logic syntax tree, never run: the handler is a renderVals key whose value is a function, or a
// `this.<name>` member naming one; the function calls scrollTo or scroll on the window or the document's root element with
// a top of 0 (`(0, 0)` or `{ top: 0 }`), and writes no component state (a handler that navigates and then scrolls to the top
// of the new view writes the view's state, so it is a navigation, not a back-to-top control).
import { draftLogicOf } from './skeleton-narrowing.mjs';
import { isThisMember, isFn, subtree, keyName } from './intake-ast.mjs';
import { fnsNamed } from './intake-census-map.mjs';

const zero = ( n ) => 'NumericLiteral' === n?.type && 0 === n.value;
const propOf = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed ? n.property?.name ?? null : null );
// window, document.documentElement, document.body, or a bare call (the global scrollTo).
const pageScroller = ( obj ) => ( 'Identifier' === obj?.type && 'window' === obj.name ) || ( 'MemberExpression' === obj?.type && 'Identifier' === obj.object?.type && 'document' === obj.object.name && [ 'documentElement', 'body' ].includes( propOf( obj ) ) );
const toTop = ( call ) => {
	const c = call.callee;
	const named = 'Identifier' === c?.type ? c.name : propOf( c );
	if ( ! [ 'scrollTo', 'scroll' ].includes( named ) || ( 'MemberExpression' === c.type && ! pageScroller( c.object ) ) ) {
		return false;
	}
	const [ a, b ] = call.arguments;
	return ( zero( a ) && zero( b ) ) || ( 'ObjectExpression' === a?.type && a.properties.some( ( p ) => 'ObjectProperty' === p.type && 'top' === keyName( p ) && zero( p.value ) ) );
};

// The functions a renderVals value stands for: itself when a function, else the class members a `this.<name>` names.
function fnsOf( d, value ) {
	if ( isFn( value ) ) {
		return [ value ];
	}
	const name = 'MemberExpression' === value?.type && 'ThisExpression' === value.object?.type ? propOf( value ) : null;
	return name ? fnsNamed( { nodes: d.idx.all }, name, 'member' ).filter( Boolean ) : [];
}

// o: { folder, record, component, handler } as lib/skeleton-handler-opens.mjs::handlerOpens.
export function handlerScrollsTop( { folder, record, component, handler } ) {
	const d = handler ? draftLogicOf( { folder, record, component } ) : null;
	const value = d?.values.get( String( handler ).split( '.' ).pop() ) ?? d?.values.get( handler );
	const fns = value ? fnsOf( d, value ) : [];
	return fns.length > 0 && fns.every( ( fn ) => {
		const calls = subtree( d.idx, fn ).filter( ( n ) => 'CallExpression' === n.type );
		return calls.some( toTop ) && ! calls.some( ( n ) => isThisMember( n.callee, 'setState' ) );
	} );
}
