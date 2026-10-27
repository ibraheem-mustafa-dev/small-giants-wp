// The draft code the catalogue reader (lib/catalogue-read.mjs, Spec 48 FR-48-92) reads, and the static evaluation it
// reads it with. A Claude Design export keeps its product data in a draft's logic (a class property, a `const` in a
// render method) or in a shared script the drafts load (`<script src="store.js">`, publishing a global object), so the
// sources are every reachable draft's `<script data-dc-script>` logic plus every local script a draft loads that is not
// the Claude Design runtime (data/known-runtimes.json, by SHA-256). Everything here walks the parsed AST
// (lib/intake-ast.mjs::parseLogic); nothing matches the code with regular expressions (R-47-4).
//   - follow: the AST nodes an expression can stand for (a variable's initialiser, an object literal's property, a
//     class's static property, a property of the object a shared script publishes, the list a `.map`/`.filter` walks,
//     both arms of a conditional), across sources;
//   - valueOf: the plain JSON value an expression holds (literals, object and array literals, `+` joins, template
//     strings, a loop parameter bound to one element), UNREAD where it cannot be read statically.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attrOf, isFn, keyName, loadDraft, parseLogic, resolveName, scanTags } from './intake-ast.mjs';
import { loadExport } from './intake-routing.mjs';

export const UNREAD = Symbol( 'unread' );
const MAX = 16;
const DATA = /^(Identifier|MemberExpression|ArrayExpression|ObjectExpression|StringLiteral|NumericLiteral|BooleanLiteral|TemplateLiteral)$/;
const SAME_LIST = new Set( [ 'map', 'filter', 'slice', 'sort', 'concat', 'reverse', 'toSorted', 'toReversed', 'flatMap' ] );
const here = path.dirname( fileURLToPath( import.meta.url ) );

// The SHA-256 of every known Claude Design runtime script (data/known-runtimes.json).
export function runtimeHashes() {
	const file = path.join( here, '..', 'data', 'known-runtimes.json' );
	return new Set( ( JSON.parse( fs.readFileSync( file, 'utf8' ) ).runtimes || [] ).map( ( r ) => r.sha256 ) );
}

// The parsed sources of one export folder: [{ file, idx, kind: 'logic'|'script', text? }]. `text` is the draft's
// whole text (for its template), absent for a script. A source that does not parse is left out and named in `skipped`.
export function catalogueSources( folder ) {
	const exp = loadExport( folder );
	const sources = [];
	const skipped = [];
	const runtimes = runtimeHashes();
	const scripts = new Set();
	for ( const d of exp.drafts ) {
		d.idx ? sources.push( { file: d.file, idx: d.idx, kind: 'logic', text: d.text, draft: d } ) : d.error && skipped.push( { file: d.file, why: d.error } );
		for ( const t of scanTags( d.text ) ) {
			const src = 'script' === t.name ? attrOf( t, 'src' ) : null;
			if ( src && ! /^([a-z][a-z0-9+.-]*:|\/\/|\/)/i.test( src ) ) {
				scripts.add( path.posix.normalize( path.posix.join( path.posix.dirname( d.file ), src.split( /[?#]/ )[ 0 ] ) ) );
			}
		}
	}
	for ( const file of [ ...scripts ].sort() ) {
		const at = path.join( folder, file );
		if ( ! fs.existsSync( at ) ) {
			continue;
		}
		const code = fs.readFileSync( at, 'utf8' );
		if ( runtimes.has( crypto.createHash( 'sha256' ).update( code ).digest( 'hex' ) ) ) {
			continue;
		}
		try {
			sources.push( { file, idx: parseLogic( code ), kind: 'script' } );
		} catch ( e ) {
			skipped.push( { file, why: e.message } );
		}
	}
	return { exp, sources, skipped };
}

// One draft loaded on its own (tests).
export const sourceOfDraft = ( folder, file ) => {
	const d = loadDraft( folder, file );
	return { file, idx: d.idx, kind: 'logic', text: d.text, draft: d };
};

// The value nodes a property name can name outside its own expression: a static or instance class property, or an
// object-literal property of any source whose value is data (a literal, an array or object literal, a variable or a
// member, never a call or a function), the asking source first, never one whose value holds `from`
// (the expression asking: `sizes: ( M ? M.sizes : [] ).map( … )` does not answer `M.sizes`). [{ src, node }].
export function propertyNodes( ctx, name, src, from = null ) {
	const out = [];
	for ( const s of [ src, ...ctx.sources.filter( ( x ) => x !== src ) ].filter( Boolean ) ) {
		for ( const n of s.idx.all ) {
			if ( ( 'ClassProperty' === n.type || 'ObjectProperty' === n.type ) && ! n.computed && keyName( n ) === name && DATA.test( n.value?.type || '' )
				&& ! ( from && s === src && n.value.start <= from.start && n.value.end >= from.end ) ) {
				out.push( { src: s, node: n.value } );
			}
		}
		if ( out.length ) {
			return out;
		}
	}
	return out;
}

// The terminal nodes an expression can stand for: [{ src, node }] (an array, object, literal or anything that cannot be
// followed further, then itself).
export function follow( ctx, src, node, depth = 0, seen = new Set() ) {
	if ( ! node || depth > MAX || seen.has( node ) ) {
		return [];
	}
	const next = new Set( seen ).add( node );
	const go = ( n, s = src ) => follow( ctx, s, n, depth + 1, next );
	switch ( node.type ) {
		case 'Identifier': {
			const r = resolveName( src.idx, node );
			if ( 'var' === r?.kind && r.init && ! r.key ) {
				return go( r.init );
			}
			return r ? [ { src, node } ] : [ { src, node } ];
		}
		case 'ConditionalExpression':
			return [ ...go( node.consequent ), ...go( node.alternate ) ];
		case 'LogicalExpression':
			return [ ...go( node.left ), ...go( node.right ) ];
		case 'SequenceExpression':
			return go( node.expressions[ node.expressions.length - 1 ] );
		case 'CallExpression': {
			const name = 'MemberExpression' === node.callee.type && ! node.callee.computed ? node.callee.property.name : null;
			return name && SAME_LIST.has( name ) ? go( node.callee.object ) : [ { src, node } ];
		}
		case 'MemberExpression': {
			if ( node.computed ) {
				return [ { src, node } ];
			}
			const name = node.property.name;
			const owners = go( node.object ).filter( ( t ) => 'ObjectExpression' === t.node.type );
			const hits = owners.flatMap( ( t ) => t.node.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === name ).map( ( p ) => go( p.value, t.src ) ).flat() );
			if ( hits.length ) {
				return hits;
			}
			return propertyNodes( ctx, name, src, node ).flatMap( ( t ) => go( t.node, t.src ) );
		}
		default:
			return [ { src, node } ];
	}
}

// The array literal nodes an expression can be (follow's ArrayExpression terminals).
export const arraysOf = ( ctx, src, node ) => follow( ctx, src, node ).filter( ( t ) => 'ArrayExpression' === t.node.type );

const isUnread = ( v ) => UNREAD === v;
const known = ( v ) => ! isUnread( v );

// The plain value an expression holds, or UNREAD. `bind` maps a function node to the values of its parameters for one
// call (a loop callback bound to one element), and `$var:<name>` to the value one named variable stands for (the
// record a line of the basket is built from).
export function valueOf( ctx, src, node, bind = new Map(), depth = 0 ) {
	if ( ! node || depth > MAX ) {
		return UNREAD;
	}
	const v = ( n, s = src ) => valueOf( ctx, s, n, bind, depth + 1 );
	switch ( node.type ) {
		case 'StringLiteral':
		case 'NumericLiteral':
		case 'BooleanLiteral':
			return node.value;
		case 'NullLiteral':
			return null;
		case 'TemplateLiteral': {
			let out = '';
			for ( let i = 0; i < node.quasis.length; i++ ) {
				out += node.quasis[ i ].value.cooked;
				if ( node.expressions[ i ] ) {
					const e = v( node.expressions[ i ] );
					if ( isUnread( e ) || ( e && 'object' === typeof e ) ) {
						return UNREAD;
					}
					out += String( e );
				}
			}
			return out;
		}
		case 'UnaryExpression': {
			const a = v( node.argument );
			if ( isUnread( a ) ) {
				return UNREAD;
			}
			return '-' === node.operator ? -a : '+' === node.operator ? +a : '!' === node.operator ? ! a : UNREAD;
		}
		case 'BinaryExpression': {
			const [ a, b ] = [ v( node.left ), v( node.right ) ];
			if ( isUnread( a ) || isUnread( b ) || ( a && 'object' === typeof a ) || ( b && 'object' === typeof b ) ) {
				return UNREAD;
			}
			const ops = { '+': () => a + b, '-': () => a - b, '*': () => a * b, '/': () => a / b, '===': () => a === b, '!==': () => a !== b, '==': () => a === b, '!=': () => a !== b };
			return ops[ node.operator ] ? ops[ node.operator ]() : UNREAD;
		}
		case 'ArrayExpression': {
			const out = [];
			for ( const el of node.elements ) {
				if ( ! el ) {
					continue;
				}
				if ( 'SpreadElement' === el.type ) {
					const s = v( el.argument );
					if ( ! Array.isArray( s ) ) {
						return UNREAD;
					}
					out.push( ...s );
				} else {
					out.push( v( el ) );
				}
			}
			return out;
		}
		case 'ObjectExpression': {
			const out = {};
			for ( const p of node.properties ) {
				if ( 'SpreadElement' === p.type ) {
					const s = v( p.argument );
					if ( ! s || 'object' !== typeof s || Array.isArray( s ) ) {
						return UNREAD;
					}
					Object.assign( out, s );
				} else if ( 'ObjectProperty' === p.type && null != keyName( p ) && ! isFn( p.value ) ) {
					out[ keyName( p ) ] = v( p.value );
				}
			}
			return out;
		}
		case 'ConditionalExpression': {
			const t = v( node.test );
			return known( t ) ? v( t ? node.consequent : node.alternate ) : UNREAD;
		}
		case 'LogicalExpression': {
			const a = v( node.left );
			if ( '||' === node.operator || '??' === node.operator ) {
				return known( a ) && ( '||' === node.operator ? a : null != a ) ? a : v( node.right );
			}
			return known( a ) && ! a ? a : v( node.right );
		}
		case 'Identifier': {
			if ( 'undefined' === node.name ) {
				return null;
			}
			if ( bind.has( `$var:${ node.name }` ) ) {
				return bind.get( `$var:${ node.name }` );
			}
			const r = resolveName( src.idx, node );
			if ( 'param' === r?.kind && bind.has( r.fn ) && ! r.key ) {
				const args = bind.get( r.fn );
				return r.index < args.length ? args[ r.index ] : UNREAD;
			}
			if ( 'var' === r?.kind && r.init && ! r.key ) {
				return v( r.init );
			}
			return UNREAD;
		}
		case 'MemberExpression': {
			const obj = v( node.object );
			const key = node.computed ? v( node.property ) : node.property.name;
			if ( known( obj ) && obj && 'object' === typeof obj && known( key ) ) {
				return Object.prototype.hasOwnProperty.call( obj, key ) ? obj[ key ] : 'length' === key && Array.isArray( obj ) ? obj.length : UNREAD;
			}
			if ( ! node.computed ) {
				const t = follow( ctx, src, node ).filter( ( x ) => x.node !== node );
				if ( 1 === t.length ) {
					return valueOf( ctx, t[ 0 ].src, t[ 0 ].node, bind, depth + 1 );
				}
			}
			return UNREAD;
		}
		default:
			return UNREAD;
	}
}

export const isRead = known;
