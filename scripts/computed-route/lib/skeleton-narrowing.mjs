// Which lists a group of choice chips narrows (Spec 48 FR-48-6, the `optionSetFilter` standing rule). Read from the draft's
// logic syntax tree, never run and never matched with a pattern over its text: the chips' loop list is a renderVals key; the
// handlers inside that key's value write component state keys (`this.setState({ k: … })`); another renderVals key is a list
// that choice narrows when its value is produced by a `.filter(callback)` (directly, through a local variable, or through a
// `.map`/`.sort`/`.slice` chain) whose callback reads one of those state keys (`this.state.k`, an alias of this.state, or a
// name destructured from it). A write whose key is computed is unknown and narrows nothing.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StaleRecordError } from './freshness.mjs';
import { loadDraft, keyName, isThisMember, isFn, subtree } from './intake-ast.mjs';

const MAX_DEPTH = 8;
const parsed = new Map();

// The draft file's logic read once per path and content hash: { idx, method (renderVals), values (Map key → value node) },
// or null when the file has no renderVals returning an object literal. A file the record hashed that is missing or whose
// sha256 differs is a stale record (lib/freshness.mjs::StaleRecordError), never an empty answer.
function readDraft( folder, file, hash ) {
	const full = path.join( folder, file );
	if ( ! fs.existsSync( full ) ) {
		if ( hash ) {
			throw new StaleRecordError( 'the fact record', [ `${ file } removed` ] );
		}
		return null;
	}
	const bytes = fs.readFileSync( full );
	if ( hash && crypto.createHash( 'sha256' ).update( bytes ).digest( 'hex' ) !== hash ) {
		throw new StaleRecordError( 'the fact record', [ `${ file } changed` ] );
	}
	const id = `${ full }|${ crypto.createHash( 'sha256' ).update( bytes ).digest( 'hex' ) }`;
	if ( ! parsed.has( id ) ) {
		parsed.set( id, build( loadDraft( folder, file ) ) );
	}
	return parsed.get( id );
}

function build( draft ) {
	const idx = draft.idx;
	const method = idx?.all.find( ( n ) => 'ClassMethod' === n.type && 'renderVals' === keyName( n ) );
	if ( ! method ) {
		return null;
	}
	const own = ( n ) => {
		let up = idx.parent.get( n );
		while ( up && ! isFn( up ) ) {
			up = idx.parent.get( up );
		}
		return up === method;
	};
	const returned = subtree( idx, method ).filter( ( n ) => 'ReturnStatement' === n.type && own( n ) && 'ObjectExpression' === n.argument?.type );
	if ( ! returned.length ) {
		return null;
	}
	const values = new Map();
	for ( const r of returned ) {
		for ( const p of r.argument.properties ) {
			if ( ( 'ObjectProperty' === p.type || 'ObjectMethod' === p.type ) && ! p.computed && keyName( p ) ) {
				values.set( keyName( p ), 'ObjectMethod' === p.type ? p : p.value );
			}
		}
	}
	// The names renderVals binds to component state: whole (`const S = this.state`) or per key (`const { filter } = this.state`).
	const whole = new Set();
	const named = new Map();
	for ( const n of subtree( idx, method ) ) {
		if ( 'VariableDeclarator' === n.type && isThisMember( n.init, 'state' ) ) {
			if ( 'Identifier' === n.id.type ) {
				whole.add( n.id.name );
			} else if ( 'ObjectPattern' === n.id.type ) {
				n.id.properties.filter( ( p ) => 'ObjectProperty' === p.type && ! p.computed && 'Identifier' === p.value?.type ).forEach( ( p ) => named.set( p.value.name, keyName( p ) ) );
			}
		}
	}
	return { idx, method, values, whole, named };
}

// The state keys read anywhere inside `node`.
function reads( d, node ) {
	const out = new Set();
	for ( const n of subtree( d.idx, node ) ) {
		if ( 'MemberExpression' === n.type && ! n.computed && ( ( 'Identifier' === n.object.type && d.whole.has( n.object.name ) ) || isThisMember( n.object, 'state' ) ) ) {
			out.add( n.property.name );
		} else if ( 'Identifier' === n.type && d.named.has( n.name ) ) {
			out.add( d.named.get( n.name ) );
		}
	}
	return out;
}

// The state keys `this.setState({ … })` calls inside `node` write by a literal key.
function writes( d, node ) {
	const out = new Set();
	for ( const n of subtree( d.idx, node ) ) {
		if ( 'CallExpression' === n.type && isThisMember( n.callee, 'setState' ) && 'ObjectExpression' === n.arguments[ 0 ]?.type ) {
			n.arguments[ 0 ].properties.filter( ( p ) => 'SpreadElement' !== p.type && ! p.computed && keyName( p ) ).forEach( ( p ) => out.add( keyName( p ) ) );
		}
	}
	return out;
}

// The state keys read by the `.filter(callback)` calls an expression's value passes through.
function filteredBy( d, expr, depth = 0, seen = new Set() ) {
	const out = new Set();
	if ( ! expr || depth > MAX_DEPTH ) {
		return out;
	}
	const add = ( s ) => s.forEach( ( k ) => out.add( k ) );
	if ( 'Identifier' === expr.type ) {
		if ( ! seen.has( expr.name ) ) {
			const decl = subtree( d.idx, d.method ).find( ( n ) => 'VariableDeclarator' === n.type && 'Identifier' === n.id.type && expr.name === n.id.name && n.init );
			decl && add( filteredBy( d, decl.init, depth + 1, new Set( [ ...seen, expr.name ] ) ) );
		}
	} else if ( 'CallExpression' === expr.type && 'MemberExpression' === expr.callee.type ) {
		if ( ! expr.callee.computed && 'filter' === expr.callee.property.name && isFn( expr.arguments[ 0 ] ) ) {
			add( reads( d, expr.arguments[ 0 ] ) );
		}
		add( filteredBy( d, expr.callee.object, depth + 1, seen ) );
	} else if ( 'ArrayExpression' === expr.type ) {
		expr.elements.filter( ( el ) => 'SpreadElement' === el?.type ).forEach( ( el ) => add( filteredBy( d, el.argument, depth + 1, seen ) ) );
	} else if ( 'ConditionalExpression' === expr.type ) {
		add( filteredBy( d, expr.consequent, depth + 1, seen ) );
		add( filteredBy( d, expr.alternate, depth + 1, seen ) );
	} else if ( [ 'ParenthesizedExpression', 'TSAsExpression' ].includes( expr.type ) ) {
		add( filteredBy( d, expr.expression, depth + 1, seen ) );
	}
	return out;
}

// The renderVals keys (other than `listKey`) whose lists the chips looped from `listKey` narrow, for a component of a fact
// record. `folder` is the draft folder, `record` the fact record (its `sources.files` hashes name the draft files).
export function narrowedLists( { folder, record, component, listKey } ) {
	const file = `${ component }.dc.html`;
	const d = folder && record?.sources?.files?.[ file ] ? readDraft( folder, file, record.sources.files[ file ] ) : null;
	const value = d?.values.get( listKey );
	if ( ! value ) {
		return [];
	}
	const written = writes( d, value );
	return [ ...d.values.keys() ].filter( ( k ) => k !== listKey && [ ...filteredBy( d, d.values.get( k ) ) ].some( ( s ) => written.has( s ) ) );
}
