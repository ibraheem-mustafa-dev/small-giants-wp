// The product records of a draft and what each field of them is (Spec 48 FR-48-92), read from the draft code
// (lib/catalogue-source.mjs), never from the words it shows or a client's name:
//   - the records: an array literal of two or more object literals that the code looks a record up in by one key
//     (`list.find( ( p ) => p.id === x )`, `list.filter( function ( p ) { return p.id === id; } )[0]`), through any
//     variable, `.map`, class property or shared-script global it is reached by, whose records each carry that key (a
//     different value in every record: a filter on a shared field is no lookup), a `name` and a price. The key compared
//     is the record's draft id.
//   - price: a numeric field a currency formatter is handed (`money( p.price )`, `this.gbp( p.price / 3 )`, through
//     lib/shop-parts-logic.mjs::isMoney), or a numeric field whose value a currency-marked text field of the same
//     record states (`from: 9.5` beside `'from £9.50'`). Two such fields: the one never below the other and above it
//     somewhere is the recommended retail price (`_sgs_rrp`), the other the price.
//   - image: a text field naming a file of the export (an array of them is the gallery), else a key into an object of
//     web addresses the code indexes by that field (`IMG[ p.img ]`).
//   - short description: the longest text field the template shows as text (`{{ p.short }}`), at least 30 characters
//     on average.
//   - facets: the fields a filter callback over the records reads (`list.filter( ( p ) => p.brand === x )`, one local
//     function deep). A `brand` field gives the brands; an array-of-words field filtered on the shop page gives the
//     categories; every other facet is recorded and named in a gap row.
import fs from 'node:fs';
import path from 'node:path';
import { isFn, keyName, resolveName } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { isMoney } from './shop-parts-logic.mjs';
import { UNREAD, arraysOf, follow, valueOf } from './catalogue-source.mjs';

const CURRENCY = /[£$€¥₹]\s?(\d+(?:\.\d+)?)/;
const LOOKUP = new Set( [ 'find', 'filter', 'findLast', 'findIndex', 'some' ] );
const IMAGE = /\.(jpe?g|png|webp|gif|svg|avif)$/i;
const isNum = ( v ) => 'number' === typeof v && Number.isFinite( v );
const calleeName = ( c ) => ( 'MemberExpression' === c?.callee?.type && ! c.callee.computed ? c.callee.property.name : null );

// The single expression a callback answers: an arrow's expression body or a function's one return.
function answerOf( src, fn ) {
	const r = returnsOf( src.idx, fn );
	return 1 === r.length ? r[ 0 ] : null;
}

// The key a lookup callback compares its parameter's field on (`p.id === x` gives 'id'), or null.
function comparedKey( src, fn ) {
	const p = fn.params[ 0 ];
	const body = answerOf( src, fn );
	if ( 'Identifier' !== p?.type || 'BinaryExpression' !== body?.type || ! /^[!=]==?$/.test( body.operator ) ) {
		return null;
	}
	const side = [ body.left, body.right ].find( ( s ) => 'MemberExpression' === s.type && ! s.computed && 'Identifier' === s.object.type && s.object.name === p.name );
	return side ? side.property.name : null;
}

// Every list-of-records lookup in the sources: [{ src, array: { src, node }, key }].
export function lookups( ctx ) {
	const out = [];
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'CallExpression' !== n.type || ! LOOKUP.has( calleeName( n ) ) || ! isFn( n.arguments[ 0 ] ) ) {
				continue;
			}
			const key = comparedKey( src, n.arguments[ 0 ] );
			if ( key ) {
				arraysOf( ctx, src, n.callee.object ).forEach( ( array ) => out.push( { src, array, key } ) );
			}
		}
	}
	return out;
}

// Every currency formatting call in the sources: the field names read inside its arguments.
function moneyFields( ctx ) {
	const names = new Set();
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'CallExpression' === n.type && n.arguments.length && isMoney( src.idx, n ) ) {
				const lo = n.arguments[ 0 ].start;
				const hi = n.arguments[ n.arguments.length - 1 ].end;
				src.idx.all.filter( ( m ) => m.start >= lo && m.end <= hi && 'MemberExpression' === m.type && ! m.computed ).forEach( ( m ) => names.add( m.property.name ) );
			}
		}
	}
	return names;
}

// The price fields of a record list: { price, rrp, why } (rrp null when one field), or { problem }.
export function priceFields( records, formatted ) {
	const numeric = Object.keys( records[ 0 ] ).filter( ( k ) => records.every( ( r ) => isNum( r[ k ] ) || null == r[ k ] ) && records.some( ( r ) => isNum( r[ k ] ) ) );
	const stated = ( k ) => records.every( ( r ) => ! isNum( r[ k ] ) || Object.values( r ).some( ( v ) => 'string' === typeof v && Number( CURRENCY.exec( v )?.[ 1 ] ) === r[ k ] ) );
	const money = numeric.filter( ( k ) => formatted.has( k ) || stated( k ) );
	if ( 1 === money.length ) {
		return { price: money[ 0 ], rrp: null };
	}
	if ( 2 === money.length ) {
		const [ a, b ] = money;
		const above = ( hi, lo ) => records.every( ( r ) => ! isNum( r[ hi ] ) || ! isNum( r[ lo ] ) || r[ hi ] >= r[ lo ] ) && records.some( ( r ) => r[ hi ] > r[ lo ] );
		if ( above( b, a ) ) {
			return { price: a, rrp: b };
		}
		if ( above( a, b ) ) {
			return { price: b, rrp: a };
		}
	}
	return { problem: money.length ? `${ money.length } fields read as prices (${ money.join( ', ' ) }) and none is always the higher` : 'no field reads as a price' };
}

// The object of web addresses the code indexes by `field` (`IMG[ p.img ]`), or null.
function addressTable( ctx, field ) {
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'MemberExpression' === n.type && n.computed && 'MemberExpression' === n.property.type && ! n.property.computed && field === n.property.property.name ) {
				for ( const t of follow( ctx, src, n.object ).filter( ( x ) => 'ObjectExpression' === x.node.type ) ) {
					const table = valueOf( ctx, t.src, t.node );
					if ( table && UNREAD !== table && Object.values( table ).some( ( v ) => 'string' === typeof v && /^https?:\/\//.test( v ) ) ) {
						return table;
					}
				}
			}
		}
	}
	return null;
}

// The image fields: { image, gallery, table } naming the record fields (null when none).
export function imageFields( ctx, records, folder, taken ) {
	const exists = ( v ) => 'string' === typeof v && IMAGE.test( v ) && ! /^([a-z]+:|\/\/)/i.test( v ) && fs.existsSync( path.join( folder, v ) );
	const keys = Object.keys( records[ 0 ] ).filter( ( k ) => ! taken.includes( k ) );
	const image = keys.find( ( k ) => records.some( ( r ) => exists( r[ k ] ) ) );
	const gallery = keys.find( ( k ) => records.some( ( r ) => Array.isArray( r[ k ] ) && r[ k ].length && r[ k ].every( exists ) ) );
	if ( image ) {
		return { image, gallery: gallery || null, table: null };
	}
	for ( const k of keys.filter( ( x ) => records.some( ( r ) => 'string' === typeof r[ x ] ) ) ) {
		const table = addressTable( ctx, k );
		if ( table && records.some( ( r ) => 'string' === typeof table[ r[ k ] ] ) ) {
			return { image: k, gallery: gallery || null, table };
		}
	}
	return { image: null, gallery: gallery || null, table: null };
}

// The fields each draft template shows as text through a `{{ x.field }}` binding between tags.
function textBindings( ctx ) {
	const out = new Set();
	for ( const src of ctx.sources.filter( ( s ) => s.text && s.draft?.cut ) ) {
		const t = src.text.slice( src.draft.cut.templateStart, src.draft.cut.templateEnd );
		for ( const m of t.matchAll( />[^<]*?\{\{\s*[\w$]+\.([\w$]+)\s*\}\}/g ) ) {
			out.add( m[ 1 ] );
		}
	}
	return out;
}

export function descriptionField( ctx, records, taken ) {
	const shown = textBindings( ctx );
	const avg = ( k ) => records.reduce( ( a, r ) => a + ( 'string' === typeof r[ k ] ? r[ k ].length : 0 ), 0 ) / records.length;
	const best = Object.keys( records[ 0 ] ).filter( ( k ) => ! taken.includes( k ) && shown.has( k ) && records.every( ( r ) => null == r[ k ] || 'string' === typeof r[ k ] ) )
		.sort( ( a, b ) => avg( b ) - avg( a ) )[ 0 ];
	return best && avg( best ) >= 30 ? best : null;
}

// The record fields read inside one filter callback (and one local function it hands the record to).
function readsOf( src, fn ) {
	const p = fn.params[ 0 ];
	if ( 'Identifier' !== p?.type ) {
		return [];
	}
	const inside = ( f ) => src.idx.all.filter( ( n ) => n.start >= f.body.start && n.end <= f.body.end );
	const fields = new Set();
	const scan = ( f, name, deep ) => {
		for ( const n of inside( f ) ) {
			if ( 'MemberExpression' === n.type && ! n.computed && 'Identifier' === n.object.type && n.object.name === name ) {
				fields.add( n.property.name );
			}
			if ( deep && 'CallExpression' === n.type && 'Identifier' === n.callee.type ) {
				const i = n.arguments.findIndex( ( a ) => 'Identifier' === a.type && a.name === name );
				const r = i >= 0 ? resolveName( src.idx, n.callee ) : null;
				if ( 'var' === r?.kind && isFn( r.init ) && 'Identifier' === r.init.params[ i ]?.type ) {
					scan( r.init, r.init.params[ i ].name, false );
				}
			}
		}
	};
	scan( fn, p.name, true );
	return [ ...fields ];
}

// The facet fields of the record list `array` (an { src, node }): [{ field, files }] where files are the drafts whose
// filter reads it.
export function facetFields( ctx, array ) {
	const out = new Map();
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'CallExpression' === n.type && 'filter' === calleeName( n ) && isFn( n.arguments[ 0 ] )
				&& arraysOf( ctx, src, n.callee.object ).some( ( t ) => t.node === array.node ) ) {
				readsOf( src, n.arguments[ 0 ] ).forEach( ( f ) => out.set( f, new Set( [ ...( out.get( f ) || [] ), src.file ] ) ) );
			}
		}
	}
	return [ ...out ].map( ( [ field, files ] ) => ( { field, files: [ ...files ].sort() } ) );
}

// The record lists of the sources: { lists: [{ array, key, records, src, prices }], ambiguous: [{ src, problem }] } —
// every looked-up list of object literals whose records each carry the key, a name and a price (priceFields). A list
// with two price-like fields neither of which is always the higher is `ambiguous`; one with no price is no catalogue.
export function recordLists( ctx ) {
	const formatted = moneyFields( ctx );
	const seen = new Map();
	const ambiguous = [];
	for ( const l of lookups( ctx ) ) {
		const node = l.array.node;
		if ( seen.has( node ) || node.elements.length < 2 || ! node.elements.every( ( e ) => 'ObjectExpression' === e?.type ) ) {
			continue;
		}
		const records = valueOf( ctx, l.array.src, node );
		if ( UNREAD === records || ! records.every( ( r ) => r && ( 'string' === typeof r[ l.key ] || isNum( r[ l.key ] ) ) && 'string' === typeof r.name && Object.values( r ).some( isNum ) )
			|| new Set( records.map( ( r ) => r[ l.key ] ) ).size !== records.length ) {
			continue;
		}
		const prices = priceFields( records, formatted );
		if ( prices.problem ) {
			/^\d/.test( prices.problem ) && ambiguous.push( { src: l.array.src, problem: prices.problem } );
			seen.set( node, null );
			continue;
		}
		seen.set( node, { array: l.array, key: l.key, records, src: l.array.src, prices } );
	}
	return { lists: [ ...seen.values() ].filter( Boolean ), ambiguous };
}

export { moneyFields, keyName };
