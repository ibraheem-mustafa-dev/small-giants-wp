// The declarations a `<x>.style.cssText = <expr>` write sets (lib/intake-inventory-target.mjs::writerSites): the value
// split into one { property, to } per declaration when its text is literal, or { property, formula } when a value holds
// a computed part, each value kept whole. A local variable a hole names is replaced by its definition when that
// definition is plain arithmetic (numbers, operators, `Math.*` calls, member reads) and never reassigned, resolved
// through the `const` and `let` of the enclosing functions: `d` of `d = Math.max( r.width, r.height ) * 2.2` becomes
// `( Math.max( r.width, r.height ) * 2.2 )`. A name it cannot resolve (a call's result, a parameter, a reassigned
// variable) stays its own text in the formula: never guessed.
import { ancestors, declaratorsOf, isFn } from './intake-inventory-code.mjs';

const MAX_DEPTH = 4;
const isScope = ( x ) => isFn( x ) || 'BlockStatement' === x.type || 'Program' === x.type;
const isStringy = ( n ) => /^(StringLiteral|TemplateLiteral)$/.test( n.type ) || ( 'BinaryExpression' === n.type && '+' === n.operator && ( isStringy( n.left ) || isStringy( n.right ) ) );

// The child nodes of a node (every field holding a node or a list of them).
function children( n ) {
	return Object.entries( n ).filter( ( [ k ] ) => ! /^(type|start|end|loc|extra|leadingComments|trailingComments|innerComments)$/.test( k ) )
		.flatMap( ( [ , v ] ) => ( Array.isArray( v ) ? v : [ v ] ) ).filter( ( v ) => v && 'string' === typeof v.type );
}

// The pieces of a string-building expression: [ { text } | { expr } ], a numeric sum or a parenthesised group a hole.
function piecesOf( n ) {
	if ( 'StringLiteral' === n.type ) {
		return [ { text: n.value } ];
	}
	if ( 'TemplateLiteral' === n.type ) {
		return n.quasis.flatMap( ( q, i ) => [ { text: q.value.cooked }, ...( n.expressions[ i ] ? [ { expr: n.expressions[ i ] } ] : [] ) ] );
	}
	if ( 'BinaryExpression' === n.type && '+' === n.operator && isStringy( n ) ) {
		return [ ...piecesOf( n.left ), ...piecesOf( n.right ) ];
	}
	return [ { expr: n } ];
}

// Whether an expression is built only of numbers, operators, `Math.*` calls, member reads and names.
function isArithmetic( n ) {
	if ( /^(NumericLiteral|Identifier)$/.test( n.type ) ) {
		return true;
	}
	if ( 'MemberExpression' === n.type ) {
		return ! n.computed && isArithmetic( n.object );
	}
	if ( 'CallExpression' === n.type ) {
		return 'MemberExpression' === n.callee.type && 'Math' === n.callee.object?.name && n.arguments.every( isArithmetic );
	}
	return /^(BinaryExpression|UnaryExpression)$/.test( n.type ) && children( n ).every( isArithmetic );
}

// The definition of the name an identifier use refers to: the nearest enclosing scope's last declaration before the use,
// when the name is never reassigned and the definition is arithmetic; else null.
function definitionOf( p, id ) {
	const decls = declaratorsOf( p ).get( id.name ) || [];
	if ( ! decls.length || p.nodes.some( ( x ) => ( 'AssignmentExpression' === x.type && 'Identifier' === x.left.type && x.left.name === id.name ) || ( 'UpdateExpression' === x.type && x.argument.name === id.name ) ) ) {
		return null;
	}
	const scopeOf = ( d ) => ancestors( p, d ).find( isScope ) ?? null;
	for ( const a of ancestors( p, id ).filter( isScope ) ) {
		const own = decls.filter( ( d ) => d.start < id.start && scopeOf( d ) === a );
		if ( own.length ) {
			const init = own[ own.length - 1 ].init;
			return isArithmetic( init ) ? init : null;
		}
	}
	return null;
}

// The source text of an expression with every resolvable local name replaced by its definition (itself resolved).
function expandedText( p, n, seen = [] ) {
	const edits = [];
	const visit = ( x ) => {
		if ( 'Identifier' === x.type ) {
			const def = seen.length < MAX_DEPTH && ! seen.includes( x.name ) ? definitionOf( p, x ) : null;
			def && edits.push( { start: x.start, end: x.end, text: wrapped( expandedText( p, def, [ ...seen, x.name ] ) ) } );
		} else if ( 'MemberExpression' === x.type ) {
			visit( x.object );
			x.computed && visit( x.property );
		} else if ( 'ObjectProperty' === x.type ) {
			x.computed && visit( x.key );
			visit( x.value );
		} else if ( ! isFn( x ) ) {
			children( x ).forEach( visit );
		}
	};
	visit( n );
	return edits.sort( ( a, b ) => b.start - a.start ).reduce( ( t, e ) => t.slice( 0, e.start - n.start ) + e.text + t.slice( e.end - n.start ), p.text.slice( n.start, n.end ) );
}

// An expression text as one operand: bare when a name, a member path or a call, else in parentheses.
const wrapped = ( t ) => ( /^[\w$.]+(?:\(.*\))?$/s.test( t ) || closesAtEnd( t ) ? t : `( ${ t } )` );

// Whether a text opens with a parenthesis that closes only at its last character.
function closesAtEnd( t ) {
	let depth = 0;
	for ( let i = 0; i < t.length; i++ ) {
		depth += '(' === t[ i ] ? 1 : ')' === t[ i ] ? -1 : 0;
		if ( ! depth ) {
			return '(' === t[ 0 ] && i === t.length - 1;
		}
	}
	return false;
}
const quoted = ( t ) => `'${ t.replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ).replace( /\n/g, '\\n' ) }'`;

// The declarations as lists of pieces: ';' at parenthesis depth 0 ends one, a hole standing whole inside its own.
function splitDeclarations( pieces ) {
	const out = [ [] ];
	let depth = 0;
	for ( const piece of pieces ) {
		if ( ! ( 'text' in piece ) ) {
			out[ out.length - 1 ].push( piece );
			continue;
		}
		let run = '';
		for ( const ch of piece.text ) {
			depth = Math.max( 0, depth + ( '(' === ch ? 1 : ')' === ch ? -1 : 0 ) );
			if ( ';' === ch && ! depth ) {
				run && out[ out.length - 1 ].push( { text: run } );
				run = '';
				out.push( [] );
			} else {
				run += ch;
			}
		}
		run && out[ out.length - 1 ].push( { text: run } );
	}
	return out.filter( ( d ) => d.some( ( x ) => ! ( 'text' in x ) || x.text.trim() ) );
}

// The properties a cssText expression sets: [ { property, to } | { property, formula } ], or null when the expression is
// not a string whose declarations name their properties in literal text.
export function cssTextProperties( p, n ) {
	const props = [];
	for ( const decl of splitDeclarations( piecesOf( n ) ) ) {
		const first = decl[ 0 ];
		const at = 'text' in first ? first.text.indexOf( ':' ) : -1;
		const property = at > 0 ? first.text.slice( 0, at ).trim().toLowerCase() : '';
		if ( ! /^-{0,2}[a-z][\w-]*$/.test( property ) ) {
			if ( decl.every( ( x ) => 'text' in x ) ) {
				continue;
			}
			return null;
		}
		const value = [ { text: first.text.slice( at + 1 ) }, ...decl.slice( 1 ) ].filter( ( x ) => ! ( 'text' in x ) || x.text );
		const text = value.every( ( x ) => 'text' in x ) ? value.map( ( x ) => x.text ).join( '' ).trim() : null;
		if ( null !== text ) {
			text && props.push( { property, to: text } );
			continue;
		}
		const edge = ( x, i ) => ( 'text' in x ? { text: i ? x.text.replace( /\s+$/, '' ) : x.text.replace( /^\s+/, '' ) } : x );
		const trimmed = value.map( ( x, i ) => ( 0 === i ? edge( x, 0 ) : x ) ).map( ( x, i, all ) => ( i === all.length - 1 ? edge( x, 1 ) : x ) ).filter( ( x ) => ! ( 'text' in x ) || x.text );
		props.push( { property, formula: trimmed.map( ( x ) => ( 'text' in x ? quoted( x.text ) : wrapped( expandedText( p, x.expr ) ) ) ).join( ' + ' ) } );
	}
	return props.length ? props : null;
}
