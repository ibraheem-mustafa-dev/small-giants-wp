// The reading helpers the effect recogniser (lib/motion-behaviours.mjs) and the settings recognisers
// (lib/motion-behaviour-settings.mjs) share: a record's properties, words, trigger and timing, and the number patterns
// their formulas are read with, and the syntax-tree readers of a record's code and formula text.
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
// The name of the scroll position a scroll-driven transform of record `r` is written from, or null: `scrollY` when the
// formula reads it, else (a scroll handler that passes the position in as a parameter: `parallax( y )`) the identifier a
// number multiplies inside a translate, in a record whose trigger detail names the scroll.
export function scrollValueName( q, r ) {
	const f = words( q.formula );
	if ( /scrollY/i.test( f ) ) {
		return 'scrollY';
	}
	// Only a translate counts: a transform that also rotates, scales or skews is a different motion, whose factors are not a travel.
	if ( ! /scroll/i.test( words( r.trigger?.detail ) ) || ! /translate/i.test( f ) || /rotate|scale|skew|matrix|perspective/i.test( f ) ) {
		return null;
	}
	return new RegExp( `(?:^|[^\\w$.])((?!px\\b|em\\b|deg\\b|innerHeight\\b|innerWidth\\b|Math\\b)[A-Za-z_$][\\w$]*)\\s*${ TIMES }\\s*${ MINUS }?\\d*\\.?\\d+`, 'i' ).exec( f )?.[ 1 ] ?? null;
}
export const compact =( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ , v ] ) => null !== v && undefined !== v ) );

// The syntax tree of a record's code or formula text (a statement or an expression), read once per text, or null when it
// does not parse (a clipped `…` snippet, a prose formula).
const trees = new Map();
export function codeTree( text ) {
	if ( 'string' !== typeof text || ! text.trim() ) {
		return null;
	}
	if ( ! trees.has( text ) ) {
		let tree = null;
		try {
			tree = parseLogic( text, { sourceType: 'script' } ).program;
		} catch {
			tree = null;
		}
		trees.set( text, tree );
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
