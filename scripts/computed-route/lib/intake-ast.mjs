// Shared intake readers for one Claude Design draft (Spec 48 §9, METHOD.md §2), general to every intake reader:
// loadDraft (read, cut and parse one draft); splitDraft (the template/logic cut the runtime itself makes);
// scanTags/attrOf/decodeEntities (a start-tag and attribute scanner; link values are attribute values, FR-48A-3);
// parseLogic (@babel/parser, a parent-linked node list and draft-file line numbers); subtree/classMethod;
// resolveName/fnBinding/callsOf (nearest-scope lookup and call sites); evalStr (static string evaluation);
// readBinding/bindingKey (`{{ }}` attribute bindings); snippet/lineMap/enclosingFn/keyName/propName/isFn/isThisMember.
// Nothing here matches constructs with regular expressions over the draft (R-47-4); a parse failure is thrown with
// its text for the caller to record as a gap row (R-48-3).
import fs from 'fs';
import path from 'path';
import { parse, parseExpression } from '@babel/parser';

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
// Decodes the HTML character references an attribute value can carry (an unknown reference is kept as written).
export const decodeEntities = ( s ) => s.replace( /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, ( all, ref ) => {
	if ( '#' !== ref[ 0 ] ) {
		return ENTITIES[ ref.toLowerCase() ] ?? all;
	}
	const n = 'x' === ref[ 1 ].toLowerCase() ? parseInt( ref.slice( 2 ), 16 ) : parseInt( ref.slice( 1 ), 10 );
	return n >= 0 && n <= 0x10ffff ? String.fromCodePoint( n ) : all;
} );

// A function giving { line, col } (1-based) of a character index in `text`; line starts are found once.
export function lineMap( text ) {
	const starts = [ 0 ];
	for ( let i = text.indexOf( '\n' ); i >= 0; i = text.indexOf( '\n', i + 1 ) ) {
		starts.push( i + 1 );
	}
	return ( index ) => {
		let lo = 0;
		for ( let hi = starts.length - 1; lo < hi; ) {
			const mid = ( lo + hi + 1 ) >> 1;
			[ lo, hi ] = starts[ mid ] <= index ? [ mid, hi ] : [ lo, mid - 1 ];
		}
		return { line: lo + 1, col: index - starts[ lo ] + 1 };
	};
}

// The nearest function enclosing `node`, or null.
export const enclosingFn = ( idx, node ) => {
	let up = idx.parent.get( node );
	while ( up && ! isFn( up ) ) {
		up = idx.parent.get( up );
	}
	return up || null;
};

// Every start tag in `text` from `from` to `to`: { name, attrs: [ { name, value } ], index, end }. Comments are
// skipped; script and style bodies are raw text and are not scanned for tags.
export function scanTags( text, from = 0, to = text.length ) {
	const tags = [];
	let i = from;
	while ( i < to ) {
		const lt = text.indexOf( '<', i );
		if ( lt < 0 || lt >= to ) {
			break;
		}
		if ( text.startsWith( '<!--', lt ) ) {
			const close = text.indexOf( '-->', lt + 4 );
			i = close < 0 ? to : close + 3;
			continue;
		}
		if ( ! /[A-Za-z]/.test( text[ lt + 1 ] || '' ) ) {
			i = lt + 1;
			continue;
		}
		let j = lt + 1;
		while ( j < to && /[A-Za-z0-9_:.-]/.test( text[ j ] ) ) {
			j++;
		}
		const name = text.slice( lt + 1, j ).toLowerCase();
		const attrs = [];
		while ( j < to && '>' !== text[ j ] ) {
			if ( /[\s/]/.test( text[ j ] ) ) {
				j++;
				continue;
			}
			const a = j;
			while ( j < to && ! /[\s=>/]/.test( text[ j ] ) ) {
				j++;
			}
			const attr = text.slice( a, j );
			let value = '';
			const ws = () => {
				while ( /\s/.test( text[ j ] || '' ) ) {
					j++;
				}
			};
			ws();
			if ( '=' === text[ j ] ) {
				j++;
				ws();
				const q = text[ j ];
				if ( '"' === q || "'" === q ) {
					const close = text.indexOf( q, j + 1 );
					value = text.slice( j + 1, close < 0 ? to : close );
					j = close < 0 ? to : close + 1;
				} else {
					const v = j;
					while ( j < to && ! /[\s>]/.test( text[ j ] ) ) {
						j++;
					}
					value = text.slice( v, j );
				}
			}
			attrs.push( { name: attr, value: decodeEntities( value ) } );
		}
		tags.push( { name, attrs, index: lt, end: j + 1 } );
		i = j + 1;
		if ( 'script' === name || 'style' === name ) {
			const close = text.toLowerCase().indexOf( `</${ name }`, i );
			i = close < 0 ? to : close;
		}
	}
	return tags;
}

export const attrOf = ( tag, name ) => tag.attrs.find( ( a ) => a.name.toLowerCase() === name.toLowerCase() )?.value;

// The runtime's own cut of a draft: the template between <x-dc> and the last </x-dc>, and the logic in the
// <script data-dc-script> body. Throws naming what is missing.
export function splitDraft( text ) {
	const tags = scanTags( text );
	const open = tags.find( ( t ) => 'x-dc' === t.name );
	const close = text.lastIndexOf( '</x-dc>' );
	if ( ! open || close < open.end ) {
		throw new Error( 'no <x-dc> … </x-dc> template in the draft' );
	}
	const script = tags.find( ( t ) => 'script' === t.name && t.attrs.some( ( a ) => 'data-dc-script' === a.name.toLowerCase() ) );
	let logic = '';
	let logicStart = -1;
	if ( script ) {
		const end = text.toLowerCase().indexOf( '</script', script.end );
		logic = text.slice( script.end, end < 0 ? text.length : end );
		logicStart = script.end;
	}
	return { templateStart: open.end, templateEnd: close, logic, logicStart, logicLine: logicStart < 0 ? 0 : lineMap( text )( logicStart ).line };
}

const SKIP = new Set( [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range' ] );

// Parses the logic and returns { ast, code, parent (Map), all (every node, sorted by start, outer first), line(node) }.
export function parseLogic( code, logicLine = 1 ) {
	const ast = parse( code, { sourceType: 'module', plugins: [ 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'classStaticBlock' ] } );
	const parent = new Map();
	const all = [];
	const visit = ( node, up ) => {
		parent.set( node, up );
		all.push( node );
		for ( const k of Object.keys( node ) ) {
			if ( SKIP.has( k ) ) {
				continue;
			}
			const v = node[ k ];
			if ( Array.isArray( v ) ) {
				v.forEach( ( c ) => c && 'string' === typeof c.type && visit( c, node ) );
			} else if ( v && 'string' === typeof v.type ) {
				visit( v, node );
			}
		}
	};
	visit( ast.program, null );
	all.sort( ( a, b ) => a.start - b.start || b.end - a.end );
	return { ast, code, parent, all, line: ( n ) => logicLine + ( n.loc?.start.line || 1 ) - 1 };
}

// The source text of a node, shortened for a report.
export const snippet = ( idx, n, max = 140 ) => {
	const s = idx.code.slice( n.start, n.end ).replace( /\s+/g, ' ' );
	return s.length > max ? `${ s.slice( 0, max - 1 ) }…` : s;
};

export const keyName = ( p ) => ( p.computed ? ( 'StringLiteral' === p.key.type ? p.key.value : null ) : p.key.name ?? p.key.value ?? null );
export const isThisMember = ( n, name ) => 'MemberExpression' === n?.type && 'ThisExpression' === n.object.type && ! n.computed && ( ! name || n.property.name === name );
export const propName = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed ? n.property.name : null );
export const isFn = ( n ) => /Function|Method/.test( n?.type || '' ) && Array.isArray( n.params );

const patternHas = ( pat, name ) => {
	if ( ! pat ) {
		return null;
	}
	if ( 'Identifier' === pat.type ) {
		return pat.name === name ? { pat } : null;
	}
	if ( 'AssignmentPattern' === pat.type ) {
		return patternHas( pat.left, name );
	}
	if ( 'ObjectPattern' === pat.type ) {
		for ( const p of pat.properties ) {
			if ( 'ObjectProperty' === p.type && patternHas( p.value, name ) ) {
				return { pat, key: keyName( p ) };
			}
		}
	}
	return null;
};

// The nearest declaration of the identifier `node` names: { kind: 'var', init, key } (key set when destructured) or
// { kind: 'param', fn, index, key }; null when undeclared in the logic.
export function resolveName( idx, node ) {
	const name = node.name;
	for ( let up = idx.parent.get( node ); up; up = idx.parent.get( up ) ) {
		if ( isFn( up ) ) {
			for ( let i = 0; i < up.params.length; i++ ) {
				const hit = patternHas( up.params[ i ], name );
				if ( hit ) {
					return { kind: 'param', fn: up, index: i, key: hit.key };
				}
			}
		}
		const body = 'BlockStatement' === up.type || 'Program' === up.type || 'StaticBlock' === up.type ? up.body : null;
		for ( const st of body || [] ) {
			if ( 'VariableDeclaration' !== st.type ) {
				continue;
			}
			for ( const d of st.declarations ) {
				const hit = patternHas( d.id, name );
				if ( hit && d !== node ) {
					return { kind: 'var', init: d.init, key: hit.key, decl: d };
				}
			}
		}
	}
	return null;
}

// How a function is called: { local: name } for a const/let binding, { member: name } for a class method, class
// property or object property (called as x.name()). Null when anonymous.
export function fnBinding( idx, fn ) {
	const up = idx.parent.get( fn );
	if ( /ClassMethod|ObjectMethod/.test( fn.type ) ) {
		return { member: keyName( fn ) };
	}
	if ( 'VariableDeclarator' === up?.type && 'Identifier' === up.id.type ) {
		return { local: up.id.name, decl: up };
	}
	if ( /ClassProperty|ObjectProperty/.test( up?.type || '' ) ) {
		return { member: keyName( up ) };
	}
	if ( 'AssignmentExpression' === up?.type && isThisMember( up.left ) ) {
		return { member: up.left.property.name };
	}
	return null;
}

// Every call of a bound function: the CallExpression nodes.
export function callsOf( idx, binding ) {
	return idx.all.filter( ( n ) => 'CallExpression' === n.type && ( binding.local
		? 'Identifier' === n.callee.type && n.callee.name === binding.local && resolveName( idx, n.callee )?.decl === binding.decl
		: null != binding.member && propName( n.callee ) === binding.member ) );
}

const empty = () => ( { values: [], partial: [], unresolved: [] } );
const merge = ( a, b ) => ( { values: [ ...a.values, ...b.values ], partial: [ ...a.partial, ...b.partial ], unresolved: [ ...a.unresolved, ...b.unresolved ] } );

// The static strings an expression can produce: `values` (whole strings), `partial` (a static prefix followed by a
// dynamic part; `{ a: 'x', b: 'y' }[k]` gives every value) and `unresolved` (nodes that cannot be read statically). Identifiers resolve to their declaration or,
// for a parameter, to the arguments at every call of the function (up to four levels). `env` (a Map from a function
// node to the argument nodes of one known call) pins a parameter to that call instead.
export function evalStr( idx, node, depth = 0, env = null ) {
	const out = empty();
	if ( ! node || depth > 4 ) {
		if ( node ) {
			out.unresolved.push( node );
		}
		return out;
	}
	switch ( node.type ) {
		case 'StringLiteral':
			out.values.push( node.value );
			return out;
		case 'NumericLiteral':
			out.values.push( String( node.value ) );
			return out;
		case 'NullLiteral':
			return out;
		case 'TemplateLiteral':
			return concat( idx, node.quasis.flatMap( ( q, i ) => [ { type: 'StringLiteral', value: q.value.cooked }, node.expressions[ i ] ] ).filter( Boolean ), depth, env );
		case 'BinaryExpression':
			if ( '+' === node.operator ) {
				return concat( idx, [ node.left, node.right ], depth, env );
			}
			break;
		case 'ConditionalExpression':
			return merge( evalStr( idx, node.consequent, depth, env ), evalStr( idx, node.alternate, depth, env ) );
		case 'LogicalExpression':
			return '&&' === node.operator ? evalStr( idx, node.right, depth, env ) : merge( evalStr( idx, node.left, depth, env ), evalStr( idx, node.right, depth, env ) );
		case 'MemberExpression':
			if ( node.computed && 'ObjectExpression' === node.object.type ) {
				return node.object.properties.reduce( ( acc, p ) => ( 'ObjectProperty' === p.type ? merge( acc, evalStr( idx, p.value, depth + 1, env ) ) : { ...acc, unresolved: [ ...acc.unresolved, p ] } ), empty() );
			}
			break;
		case 'Identifier': {
			if ( 'undefined' === node.name ) {
				return out;
			}
			const r = resolveName( idx, node );
			if ( r?.kind === 'var' && r.init && ! r.key ) {
				return evalStr( idx, r.init, depth + 1, env );
			}
			if ( r?.kind === 'param' && ! r.key && env?.has( r.fn ) ) {
				const arg = env.get( r.fn )[ r.index ];
				return arg ? evalStr( idx, arg, depth + 1, env ) : out;
			}
			if ( r?.kind === 'param' && ! r.key ) {
				const b = fnBinding( idx, r.fn );
				const calls = b ? callsOf( idx, b ) : [];
				if ( calls.length ) {
					return calls.reduce( ( acc, c ) => ( c.arguments[ r.index ] ? merge( acc, evalStr( idx, c.arguments[ r.index ], depth + 1, env ) ) : acc ), empty() );
				}
			}
			break;
		}
	}
	out.unresolved.push( node );
	return out;
}

function concat( idx, parts, depth, env ) {
	let acc = { values: [ '' ], partial: [], unresolved: [] };
	for ( const p of parts ) {
		const r = evalStr( idx, p, depth, env );
		const values = acc.values.flatMap( ( a ) => r.values.map( ( b ) => a + b ) );
		const partial = [ ...acc.partial, ...acc.values.flatMap( ( a ) => r.partial.map( ( b ) => a + b ) ) ];
		if ( r.unresolved.length ) {
			partial.push( ...acc.values.filter( Boolean ) );
		}
		acc = { values, partial, unresolved: [ ...acc.unresolved, ...r.unresolved ] };
	}
	acc.partial = [ ...new Set( acc.partial ) ];
	return acc;
}

// A `{{ expr }}` binding in an attribute value: { expr (AST) } when the whole value is one binding, { prefix } when
// static text precedes a binding, null when the value has no binding. Throws on an unparsable binding.
export function readBinding( value ) {
	const open = value.indexOf( '{{' );
	if ( open < 0 ) {
		return null;
	}
	const close = value.lastIndexOf( '}}' );
	if ( open > 0 || close !== value.length - 2 || value.indexOf( '{{', 2 ) >= 0 ) {
		return { prefix: value.slice( 0, open ), text: value };
	}
	const text = value.slice( 2, -2 ).trim();
	return { expr: parseExpression( text ), text };
}

// The last property name of a dotted binding (`item.mega.href` → href, `href` → href); null for any other shape.
export function bindingKey( expr ) {
	if ( 'Identifier' === expr?.type ) {
		return expr.name;
	}
	if ( 'MemberExpression' === expr?.type && ! expr.computed ) {
		return expr.property.name;
	}
	return null;
}

// Every node inside `node` (itself included), in source order.
export function subtree( idx, node ) {
	let lo = 0;
	let hi = idx.all.length;
	while ( lo < hi ) {
		const mid = ( lo + hi ) >> 1;
		if ( idx.all[ mid ].start < node.start ) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}
	const out = [];
	for ( let i = lo; i < idx.all.length && idx.all[ i ].start < node.end; i++ ) {
		if ( idx.all[ i ].end <= node.end ) {
			out.push( idx.all[ i ] );
		}
	}
	return out;
}

// The class method (or function-valued class property) called `name`, or null.
export function classMethod( idx, name ) {
	return idx.all.find( ( n ) => ( 'ClassMethod' === n.type && keyName( n ) === name ) || ( 'ClassProperty' === n.type && keyName( n ) === name && isFn( n.value ) ) ) || null;
}

// One draft file read and cut: { file, text, cut, tags (template start tags with `line` and `col`), idx (parsed logic, null when
// there is none or it failed), error (the cut or parse error text, else null) }.
export function loadDraft( folder, file ) {
	const text = fs.readFileSync( path.join( folder, file ), 'utf8' );
	const d = { file, text, cut: null, tags: [], idx: null, error: null };
	try {
		d.cut = splitDraft( text );
		const at = lineMap( text );
		d.tags = scanTags( text, d.cut.templateStart, d.cut.templateEnd ).map( ( t ) => ( { ...t, ...at( t.index ) } ) );
		d.idx = d.cut.logic.trim() ? parseLogic( d.cut.logic, d.cut.logicLine ) : null;
	} catch ( e ) {
		d.error = e.message;
	}
	return d;
}
