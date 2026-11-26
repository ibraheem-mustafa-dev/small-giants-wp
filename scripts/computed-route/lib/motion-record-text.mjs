// The reading helpers the effect recogniser (lib/motion-behaviours.mjs) and the settings recognisers
// (lib/motion-behaviour-settings.mjs) share: a record's properties, words, trigger and timing, and the number patterns
// their formulas are read with, and the syntax-tree readers of a record's code and formula text (R-47-4).
import { parseLogic, walkAst } from './intake-census-logic.mjs';

export const props = ( r ) => ( Array.isArray( r.properties ) ? r.properties : [] );
export const nameOf = ( p ) => String( p.property ?? '' ).toLowerCase();
export const words = ( ...parts ) => parts.filter( ( s ) => 'string' === typeof s ).join( ' ' );
export const blob = ( r ) => words( r.source?.code, r.trigger?.detail, r.element?.selector, r.element?.description, r.notes, ...props( r ).flatMap( ( p ) => [ p.property, p.from, p.to, p.formula ] ) );
export const triggerOf = ( r ) => r.trigger?.type ?? null;
export const MINUS = '[-\\u2212]';
export const TIMES = '[\\u00d7*]';
export const NUMBER = '(\\d*\\.?\\d+)';
export const number = ( s ) => ( null == s ? null : Number( s ) );
export const round = ( n ) => Math.round( n * 1000 ) / 1000;
export const durationOf = ( r ) => ( 'number' === typeof r.duration_ms ? r.duration_ms : null );
export const easingOf = ( r ) => ( 'string' === typeof r.easing && r.easing ? r.easing : null );
export const compact = ( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );

// The syntax tree of a record's code or formula text (a statement or an expression), read once per text, or null when it
// does not parse (a clipped `…` snippet, a prose formula).
const trees = new Map();
const parsed = ( text ) => {
	try {
		return parseLogic( text, { sourceType: 'script' } ).program;
	} catch {
		return null;
	}
};
export function codeTree( text ) {
	if ( 'string' !== typeof text || ! text.trim() ) {
		return null;
	}
	if ( ! trees.has( text ) ) {
		trees.set( text, parsed( text ) );
	}
	return trees.get( text );
}

// The nodes of a tree that pass a test, depth first.
export function nodesOf( tree, test ) {
	const out = [];
	walkAst( tree, ( n ) => test( n ) && out.push( n ) );
	return out;
}

const calleeName = ( n ) => ( 'MemberExpression' === n.callee?.type && ! n.callee.computed ? n.callee.property?.name : n.callee?.name ) ?? null;
// The calls of a function or method by name in a tree.
export const callsOf = ( tree, name ) => ( tree ? nodesOf( tree, ( n ) => 'CallExpression' === n.type && name === calleeName( n ) ) : [] );

// The delay of the timer that schedules a record: the second argument of a `setInterval` (or each name given) call in the
// record's `source.timer` (lib/intake-inventory-anim.mjs), else in its own code, a number literal or a constant the same code
// declares, read from the syntax tree; null when neither holds such a call.
export function timerMs( r, names = [ 'setInterval' ] ) {
	for ( const text of [ r?.source?.timer, r?.source?.code ] ) {
		const ms = timerIn( codeTree( text ), names );
		if ( null !== ms ) {
			return ms;
		}
	}
	return null;
}
function timerIn( tree, names ) {
	const constant = ( id ) => nodesOf( tree, ( n ) => 'VariableDeclarator' === n.type && id === n.id?.name && 'NumericLiteral' === n.init?.type )[ 0 ]?.init.value ?? null;
	for ( const c of names.flatMap( ( name ) => callsOf( tree, name ) ) ) {
		const v = c.arguments[ 1 ];
		const ms = 'NumericLiteral' === v?.type ? v.value : 'Identifier' === v?.type ? constant( v.name ) : null;
		if ( null !== ms ) {
			return ms;
		}
	}
	return null;
}

// The one expression a tree holds (an expression statement), or null.
export const expressionOf = ( tree ) => ( 1 === tree?.body?.length && 'ExpressionStatement' === tree.body[ 0 ].type ? tree.body[ 0 ].expression : null );

// Whether an expression's value is negative as written: a unary minus, a product or quotient of one negative factor, or a
// number method or Math rounding of a negative value.
export function negativeExpr( n ) {
	if ( ! n ) {
		return false;
	}
	if ( 'UnaryExpression' === n.type && '-' === n.operator ) {
		return ! negativeExpr( n.argument );
	}
	if ( 'BinaryExpression' === n.type && /^[*/]$/.test( n.operator ) ) {
		return negativeExpr( n.left ) !== negativeExpr( n.right );
	}
	if ( 'CallExpression' === n.type && 'MemberExpression' === n.callee.type ) {
		return 'Math' === n.callee.object?.name ? negativeExpr( n.arguments[ 0 ] ) : negativeExpr( n.callee.object );
	}
	return false;
}

// A string-building expression as its pieces in order: literal text, and every other sub-expression as a node.
export function stringPieces( n ) {
	if ( ! n ) {
		return [];
	}
	if ( 'StringLiteral' === n.type ) {
		return [ n.value ];
	}
	if ( 'TemplateLiteral' === n.type ) {
		return n.quasis.flatMap( ( q, i ) => [ q.value.cooked, ...( n.expressions[ i ] ? [ n.expressions[ i ] ] : [] ) ] );
	}
	if ( 'BinaryExpression' === n.type && '+' === n.operator ) {
		return [ ...stringPieces( n.left ), ...stringPieces( n.right ) ];
	}
	return [ n ];
}
