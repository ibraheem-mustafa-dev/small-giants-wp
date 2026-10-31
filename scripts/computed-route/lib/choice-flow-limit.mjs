// How many answers a choice-flow question takes, read from the draft's logic (Spec 43 FR-43-27, Spec 48 choice-flow mapping).
// The question's loop draws a render binding (`flavs`); the binding's mapped list gives each item a handler property (`pick`);
// that handler, or a local helper it calls, writes a state key through `setState`. The helper's own tests on the list it
// writes are the draft's rules, read from the syntax tree, never from the words beside the question:
//   - after adding, a length above N that drops an item (`if ( f.length > 3 ) f.shift()`), a length of N or more that
//     returns before adding, or an add only while the length is below N: N is the most the shopper can hold;
//   - a removal only while the length is above K (`if ( f.length > 1 ) f = f.filter( … )`): K is the least it keeps.
// A handler that writes a single value (`setState( { base: o.id } )`) or tests no length gives no limit.
import { splitDraft, parseLogic, keyName, isFn, resolveName } from './intake-ast.mjs';

const TRIM = new Set( [ 'shift', 'pop', 'slice', 'splice' ] );
const REMOVE = new Set( [ 'filter', 'splice' ] );
const ADD = new Set( [ 'push', 'unshift', 'concat' ] );
const MOST = 12;
const call = ( c ) => ( 'MemberExpression' === c?.callee?.type && ! c.callee.computed ? c.callee.property.name : null );
const within = ( idx, node ) => idx.all.filter( ( n ) => n.start >= node.start && n.end <= node.end );

// The parsed logic of a script (a whole draft or logic alone), or null when it does not parse.
function parsed( script ) {
	if ( 'string' !== typeof script || ! script ) {
		return null;
	}
	let code = script;
	try {
		code = splitDraft( script ).logic;
	} catch {
		// No draft template: the text is the logic itself.
	}
	try {
		return parseLogic( code );
	} catch {
		return null;
	}
}

// The functions that handle one item's click: the handler property's function and the local helpers it calls.
function handlers( idx, binding, handler ) {
	const out = [];
	for ( const prop of idx.all.filter( ( n ) => 'ObjectProperty' === n.type && ! n.computed && keyName( n ) === binding ) ) {
		for ( const m of within( idx, prop.value ).filter( ( n ) => 'CallExpression' === n.type && 'map' === call( n ) && isFn( n.arguments[ 0 ] ) ) ) {
			for ( const h of within( idx, m.arguments[ 0 ] ).filter( ( n ) => 'ObjectProperty' === n.type && keyName( n ) === handler && isFn( n.value ) ) ) {
				out.push( h.value );
				for ( const c of within( idx, h.value ).filter( ( n ) => 'CallExpression' === n.type && 'Identifier' === n.callee.type ) ) {
					const r = resolveName( idx, c.callee );
					'var' === r?.kind && isFn( r.init ) && out.push( r.init );
				}
			}
		}
	}
	return out;
}

// The names a function hands to `setState` as a value (`setState( { flav: f } )` -> f).
function written( idx, fn ) {
	const names = new Set();
	for ( const c of within( idx, fn ).filter( ( n ) => 'CallExpression' === n.type && 'setState' === call( n ) ) ) {
		for ( const p of 'ObjectExpression' === c.arguments[ 0 ]?.type ? c.arguments[ 0 ].properties : [] ) {
			'ObjectProperty' === p.type && 'Identifier' === p.value.type && names.add( p.value.name );
		}
	}
	return names;
}

// { answersMin?, answersMax? } the binding's handler enforces, or null. Only values the block can hold are returned: a most
// of 2 to 12 and a least of 2 to the most (one is the block's default).
export function answerLimits( script, { binding, handler } ) {
	const idx = binding && handler ? parsed( script ) : null;
	if ( ! idx ) {
		return null;
	}
	let min = null;
	let max = null;
	for ( const fn of handlers( idx, binding, handler ) ) {
		const names = written( idx, fn );
		for ( const t of within( idx, fn ).filter( ( n ) => /^(IfStatement|ConditionalExpression)$/.test( n.type ) && 'BinaryExpression' === n.test.type ) ) {
			const { left, right, operator } = t.test;
			if ( 'NumericLiteral' !== right?.type || 'MemberExpression' !== left?.type || 'length' !== left.property?.name || 'Identifier' !== left.object.type || ! names.has( left.object.name ) ) {
				continue;
			}
			const ops = within( idx, t.consequent ).filter( ( n ) => 'CallExpression' === n.type ).map( call );
			const returns = within( idx, t.consequent ).some( ( n ) => 'ReturnStatement' === n.type ) || 'ReturnStatement' === t.consequent.type;
			const N = right.value;
			if ( '>' === operator && ops.some( ( o ) => REMOVE.has( o ) ) ) {
				min = Math.max( min ?? 0, N );
			} else if ( '>=' === operator && ops.some( ( o ) => REMOVE.has( o ) ) ) {
				min = Math.max( min ?? 0, N - 1 );
			} else if ( '>' === operator && ops.some( ( o ) => TRIM.has( o ) ) ) {
				max = Math.min( max ?? MOST + 1, N );
			} else if ( '>=' === operator && returns ) {
				max = Math.min( max ?? MOST + 1, N );
			} else if ( '<' === operator && ops.some( ( o ) => ADD.has( o ) ) ) {
				max = Math.min( max ?? MOST + 1, N );
			}
		}
	}
	const out = {};
	max && max >= 2 && max <= MOST && ( out.answersMax = max );
	min && min >= 2 && min <= ( out.answersMax ?? MOST ) && ( out.answersMin = min );
	return Object.keys( out ).length ? out : null;
}
