// The reading helpers the effect recogniser (lib/motion-behaviours.mjs) and the settings recognisers
// (lib/motion-behaviour-settings.mjs) share: a record's properties, words, trigger and timing, and the number patterns
// their formulas are read with, and the syntax-tree readers of a record's code text (R-47-4).
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

// The tree of a code text's longest leading run of whole statements that parses: a snippet clipped with `…` after the
// statements it opens with (the timer call a record carries before its own clipped call) still gives those statements.
export function leadingTree( text ) {
	let tree = codeTree( text );
	for ( let at = String( text ?? '' ).lastIndexOf( ';' ); ! tree && at > 0; at = text.lastIndexOf( ';', at - 1 ) ) {
		tree = codeTree( text.slice( 0, at + 1 ) );
	}
	return tree;
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

// The delay of a timer call in a record's own code: the second argument of a `setInterval` (or each name given) call, a
// number literal or a constant the same code declares, read from the syntax tree; null when the code holds no such call.
export function timerMs( r, names = [ 'setInterval' ] ) {
	const tree = leadingTree( r?.source?.code );
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
