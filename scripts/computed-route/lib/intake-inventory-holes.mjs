// Animation values the draft's code hands to a template hole (Spec 48 FR-48-25): `style="animation: {{ tickerAnim }}"`
// binds a renderVals key whose value the code builds (`mobile ? 'marquee 30s linear infinite' : 'none'`). The string
// literals of that key's value, each with the viewport widths it applies at (decided from the comparisons of the width in
// the conditions around it), are the animations the hole carries. A condition the reader cannot decide at a width leaves
// the widths unknown (null), never guessed.
import { walkAst } from './intake-census-logic.mjs';
import { prop, declaratorsOf, memberOf, literalOf } from './intake-inventory-code.mjs';

export const WIDTHS = [ 375, 768, 1440 ];
export const WIDTH_NAMES = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };
const WIDTHISH = /^(?:w|width|effW|innerWidth|vw|clientWidth|viewportWidth)$/i;

// An expression's value with the viewport width `w`: a number, a boolean, or undefined when it cannot be decided.
function valueAt( p, n, w, depth = 0 ) {
	if ( ! n || depth > 8 ) {
		return undefined;
	}
	const lit = literalOf( n );
	if ( 'number' === typeof lit || 'boolean' === typeof lit ) {
		return lit;
	}
	if ( 'Identifier' === n.type ) {
		if ( WIDTHISH.test( n.name ) ) {
			return w;
		}
		const decls = ( declaratorsOf( p ).get( n.name ) || [] ).filter( ( d ) => d.start < n.start );
		return decls.length ? valueAt( p, decls[ decls.length - 1 ].init, w, depth + 1 ) : undefined;
	}
	if ( 'MemberExpression' === n.type && ! n.computed && WIDTHISH.test( prop( n ) ?? '' ) ) {
		return w;
	}
	if ( 'UnaryExpression' === n.type && '!' === n.operator ) {
		const v = valueAt( p, n.argument, w, depth + 1 );
		return undefined === v ? undefined : ! v;
	}
	if ( 'LogicalExpression' === n.type && /^(&&|\|\|)$/.test( n.operator ) ) {
		const [ a, b ] = [ valueAt( p, n.left, w, depth + 1 ), valueAt( p, n.right, w, depth + 1 ) ];
		if ( '&&' === n.operator ) {
			return false === a || false === b ? false : undefined === a || undefined === b ? undefined : Boolean( a && b );
		}
		return true === a || true === b ? true : undefined === a || undefined === b ? undefined : Boolean( a || b );
	}
	if ( 'BinaryExpression' === n.type && /^(<|<=|>|>=|===|==|!==|!=)$/.test( n.operator ) ) {
		const [ a, b ] = [ valueAt( p, n.left, w, depth + 1 ), valueAt( p, n.right, w, depth + 1 ) ];
		if ( 'number' !== typeof a || 'number' !== typeof b ) {
			return undefined;
		}
		return { '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b, '===': a === b, '==': a === b, '!==': a !== b, '!=': a !== b }[ n.operator ];
	}
	return undefined;
}

// The string literals of a value expression with the conditions (test node, the branch taken) around each.
function literals( n, conds = [] ) {
	if ( ! n ) {
		return [];
	}
	if ( 'ConditionalExpression' === n.type ) {
		return [ ...literals( n.consequent, [ ...conds, { test: n.test, on: true } ] ), ...literals( n.alternate, [ ...conds, { test: n.test, on: false } ] ) ];
	}
	if ( 'LogicalExpression' === n.type ) {
		return [ ...literals( n.left, conds ), ...literals( n.right, conds ) ];
	}
	const s = literalOf( n );
	return 'string' === typeof s ? [ { text: s, conds } ] : [];
}

// The renderVals key's string values: [ { text, widths } ] (widths: the widths of WIDTHS the value applies at, or null when
// a condition around it cannot be decided from the width). Keys of every object the component's code returns are searched;
// a key built in more than one place yields all of them.
export function holeValues( p, key ) {
	const out = [];
	if ( ! p?.nodes?.length ) {
		return out;
	}
	for ( const n of p.nodes ) {
		if ( 'ObjectProperty' !== n.type || n.computed || ( n.key.name ?? n.key.value ) !== key || ! memberOf( p, n ) ) {
			continue;
		}
		for ( const lit of literals( n.value ) ) {
			const widths = lit.conds.length ? WIDTHS.filter( ( w ) => lit.conds.every( ( c ) => {
				const v = valueAt( p, c.test, w );
				return undefined === v ? false : Boolean( v ) === c.on;
			} ) ) : WIDTHS;
			const undecided = lit.conds.some( ( c ) => WIDTHS.some( ( w ) => undefined === valueAt( p, c.test, w ) ) );
			out.push( { text: lit.text, widths: undecided ? null : widths } );
		}
	}
	return out;
}
