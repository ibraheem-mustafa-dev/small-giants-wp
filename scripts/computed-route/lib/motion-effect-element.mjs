// The effect element of a Web Animation that runs on an element its script creates (a sheen band, a ripple circle): the
// declarations the script gives that element before it animates it, read from the animation inventory's own records
// (lib/intake-inventory-anim.mjs). The effect recogniser (lib/motion-behaviours.mjs) reads an effect's shape from them:
// the sheen band's width, the ripple circle's diameter and colour.
//
// The animation record names its call path in its notes (`called from shine (line 1395): …; from bindMotion (line
// 1374): …`, the inventory's own format); the style is the JS style-write record on a code-created element, with the
// same trigger, written in the innermost function of that path at the nearest line before its call. A record with no
// call path looks in its own function.
import { parseExpression } from '@babel/parser';
import { props, nameOf, triggerOf } from './motion-record-text.mjs';

const CREATED = /^an element created in code\b/;

// The functions an animation record's call path passes through, innermost first: [ { fn, line } ].
export function callPathOf( r ) {
	const path = [ ...String( r.notes ?? '' ).matchAll( /(?:called )?from ([\w$.]+) \(line (\d+)\)/g ) ].map( ( m ) => ( { fn: m[ 1 ], line: Number( m[ 2 ] ) } ) );
	return path.length ? path : r.source?.function ? [ { fn: r.source.function, line: Number( r.source.line ) || Infinity } ] : [];
}

// The pieces of a concatenated string expression (`'width:' + d + 'px'`): [ { text } | { hole } ], or null when the
// formula does not parse (a formula the inventory clipped).
function piecesOf( formula ) {
	let ast;
	try {
		ast = parseExpression( formula );
	} catch {
		return null;
	}
	const out = [];
	const walk = ( n ) => {
		if ( 'BinaryExpression' === n.type && '+' === n.operator ) {
			walk( n.left );
			walk( n.right );
		} else if ( 'StringLiteral' === n.type ) {
			out.push( { text: n.value } );
		} else if ( 'TemplateLiteral' === n.type ) {
			n.quasis.forEach( ( q, i ) => {
				out.push( { text: q.value.cooked } );
				n.expressions[ i ] && out.push( { hole: formula.slice( n.expressions[ i ].start, n.expressions[ i ].end ) } );
			} );
		} else {
			out.push( { hole: formula.slice( n.start, n.end ) } );
		}
	};
	walk( ast );
	return out;
}

// The declarations a cssText formula sets: { <property>: { value, holes } }, a hole's text standing in the value as `{0}`.
export function cssTextDeclarations( formula ) {
	const pieces = piecesOf( formula );
	if ( ! pieces ) {
		return {};
	}
	const holes = [];
	const text = pieces.map( ( p ) => ( undefined !== p.text ? p.text : `{${ holes.push( p.hole ) - 1 }}` ) ).join( '' );
	const out = {};
	for ( const d of text.split( ';' ) ) {
		const at = d.indexOf( ':' );
		if ( at > 0 ) {
			// Each declaration numbers its own holes from {0}.
			const own = [];
			const value = d.slice( at + 1 ).trim().replace( /\{(\d+)\}/g, ( m, n ) => `{${ own.push( holes[ Number( n ) ] ) - 1 }}` );
			out[ d.slice( 0, at ).trim().toLowerCase() ] = { value, holes: own };
		}
	}
	return out;
}

// The value of one property's formula (`Math.max( r.width, r.height ) * 2.2 + 'px'`) as { value, holes }, or null.
function formulaDeclaration( formula ) {
	const pieces = piecesOf( formula );
	if ( ! pieces ) {
		return null;
	}
	const holes = pieces.filter( ( p ) => undefined === p.text ).map( ( p ) => p.hole );
	let i = 0;
	return { value: pieces.map( ( p ) => ( undefined !== p.text ? p.text : `{${ i++ }}` ) ).join( '' ).trim(), holes };
}

// The declarations of one style-write record: a literal property as itself, a property written from a formula as that
// formula's pieces, a cssText formula split into its own.
function declarationsOf( rec ) {
	const out = {};
	for ( const p of props( rec ) ) {
		if ( 'css-text' === nameOf( p ) ) {
			'string' === typeof p.formula && Object.assign( out, cssTextDeclarations( p.formula ) );
		} else if ( null != p.to ) {
			out[ nameOf( p ) ] = { value: String( p.to ), holes: [] };
		} else if ( 'string' === typeof p.formula && formulaDeclaration( p.formula ) ) {
			out[ nameOf( p ) ] = formulaDeclaration( p.formula );
		}
	}
	return out;
}

// The effect element's declarations for an animation record, from `records` (the whole inventory): { <property>:
// { value, holes } }, or null when the record does not animate a code-created element or no style record is found.
export function effectElementStyle( r, records ) {
	if ( ! CREATED.test( String( r.element?.selection_rule ?? '' ) ) || ! Array.isArray( records ) ) {
		return null;
	}
	const styles = records.filter( ( x ) => x !== r && 'js-style-write' === x.mechanism && CREATED.test( String( x.element?.selection_rule ?? '' ) )
		&& ( x.element?.dc ?? null ) === ( r.element?.dc ?? null ) && triggerOf( x ) === triggerOf( r ) && 'active' === ( x.status ?? 'active' ) );
	for ( const { fn, line } of callPathOf( r ) ) {
		const near = styles.filter( ( x ) => x.source?.function === fn && Number( x.source?.line ) <= line ).sort( ( a, b ) => b.source.line - a.source.line )[ 0 ];
		if ( near ) {
			return declarationsOf( near );
		}
	}
	return null;
}

// A single colour value (`rgba(255,255,255,.35)`, `rgb(…)`, `#fff`) as { hex, alpha }, or null (a gradient, a variable).
export function colourOf( value ) {
	const v = String( value ?? '' ).trim();
	const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*\.?\d+)\s*)?\)$/i.exec( v );
	if ( rgb ) {
		const hex = `#${ rgb.slice( 1, 4 ).map( ( c ) => Number( c ).toString( 16 ).padStart( 2, '0' ) ).join( '' ) }`;
		return { hex, alpha: undefined === rgb[ 4 ] ? 1 : Number( rgb[ 4 ] ) };
	}
	const h = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec( v );
	return h ? { hex: `#${ 3 === h[ 1 ].length ? h[ 1 ].replace( /./g, '$&$&' ) : h[ 1 ] }`.toLowerCase(), alpha: 1 } : null;
}

// The multiple of its host's larger side a declared length is: a value of one hole (`{0}px`) whose expression is
// `max(<x>.width, <x>.height) * k` (either order), as k; null otherwise.
export function largerSideFactor( decl ) {
	if ( ! decl || 1 !== decl.holes.length || ! /^\{0\}(?:px)?$/.test( decl.value ) ) {
		return null;
	}
	const max = String.raw`(?:Math\.)?max\(\s*[\w$.]*width\s*,\s*[\w$.]*height\s*\)|(?:Math\.)?max\(\s*[\w$.]*height\s*,\s*[\w$.]*width\s*\)`;
	const m = new RegExp( String.raw`^\(?\s*(?:(?:${ max })\s*\*\s*(\d*\.?\d+)|(\d*\.?\d+)\s*\*\s*(?:${ max }))\s*\)?$` ).exec( decl.holes[ 0 ].trim() );
	return m ? Number( m[ 1 ] ?? m[ 2 ] ) : null;
}
