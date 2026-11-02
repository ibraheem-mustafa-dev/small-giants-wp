// The draft catalogue's filter facets (Spec 48 FR-48-92): each record field a filter callback over the product records
// tests (lib/catalogue-records.mjs::facetFields), other than the price, the brand and the categories, read from the
// draft code by structure into a global WooCommerce attribute (`pa_<slug>`) with its terms and each product's terms.
//   - the test: the callback's answer split at its top-level `&&`; the conjunct reading the field gives the state key it
//     compares with (`f.shapes.includes( p.shape )` gives `shapes`), whether the field is tested directly or through a
//     local function of the record (`band( p )`, evaluated per record), and a literal that matches every choice
//     (`p.gender === f.gender || p.gender === 'Unisex'`: such a record carries every other term);
//   - the kind: a text field is one term per record, an array of words several (`multi`), a value worked out by a local
//     function one term (`derived`), a true/false field one term on the records holding true (`boolean`, the theme's
//     on-off filter toggle);
//   - the terms: named and ordered by the code's own list that holds the values (an array of words, `[ value, label ]`
//     pairs, `{ id, name }` records or an object keyed by the values, `COLS[ k ]`), covering at least half of them; a `#rgb`
//     in a value's entry is that term's `_sgs_swatch_color`; a value the list does not hold is no choice the filter
//     offers, so it is left out and named in a gap row;
//   - the label: the filter group drawing the state key (a call or object literal in an array literal that names it,
//     its first capitalised text argument or its `label`, `title`, `name` or `heading`), else the text the template
//     shows just before the control bound to a render value reading the state key, else the field's name; a boolean's
//     term is the text of the active-filter chip its state key alone guards (`if ( f.pol ) chips.push( { label } )`);
//   - what WooCommerce cannot hold is a `facet` gap row: a conjunct testing several fields together, a number or mixed
//     values compared directly (a range), a worked-out value the code does not give statically.
// Nothing here reads a client's name or the words a draft shows as decisions about structure (R-47-4).
import { isFn, resolveName, subtree } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { UNREAD, arraysOf, valueOf } from './catalogue-source.mjs';

const METHODS = new Set( [ 'includes', 'some', 'every', 'indexOf', 'length', 'filter', 'find', 'map', 'has', 'toLowerCase', 'startsWith', 'endsWith' ] );
const HEX = /^#[0-9a-f]{3,8}$/i;
const LABEL = /^[A-Z][^{}<>]*[a-z]/;
const LABEL_KEYS = [ 'label', 'title', 'name', 'heading' ];
const SLUG_MAX = 28;
const ENTITIES = { '&amp;': '&', '&#39;': "'", '&apos;': "'", '&quot;': '"', '&rsquo;': '’', '&lsquo;': '‘', '&nbsp;': ' ', '&lt;': '<', '&gt;': '>' };

const isUnread = ( v ) => UNREAD === v;
const conjuncts = ( n ) => ( 'LogicalExpression' === n?.type && '&&' === n.operator ? [ ...conjuncts( n.left ), ...conjuncts( n.right ) ] : n ? [ n ] : [] );
const rootOf = ( m ) => {
	let o = m;
	while ( 'MemberExpression' === o.type ) {
		o = o.object;
	}
	return o;
};
const isParamField = ( n, param ) => 'MemberExpression' === n?.type && ! n.computed && 'Identifier' === n.object.type && n.object.name === param;
const uniq = ( a ) => [ ...new Set( a ) ];

// The local function a call hands the record to (`band( p )`): { fn, index } or null.
function localCall( src, n, param ) {
	if ( 'CallExpression' !== n.type || 'Identifier' !== n.callee.type ) {
		return null;
	}
	const index = n.arguments.findIndex( ( a ) => 'Identifier' === a.type && a.name === param );
	const r = index >= 0 ? resolveName( src.idx, n.callee ) : null;
	return 'var' === r?.kind && isFn( r.init ) && 'Identifier' === r.init.params[ index ]?.type ? { fn: r.init, index } : null;
}

// What one conjunct of a filter callback tests: { direct: fields read off the record, derived: [{ field, fn, index }],
// keys: the state keys it compares with, wildcards: Map( field -> literal matching every choice ) }.
export function testOf( src, c, param ) {
	const nodes = subtree( src.idx, c );
	const inner = new Set( nodes.filter( ( n ) => isFn( n ) ).flatMap( ( f ) => f.params.filter( ( p ) => 'Identifier' === p.type ).map( ( p ) => p.name ) ) );
	const direct = uniq( nodes.filter( ( n ) => isParamField( n, param ) ).map( ( n ) => n.property.name ) );
	const derived = [];
	for ( const n of nodes ) {
		const call = localCall( src, n, param );
		if ( call ) {
			const name = call.fn.params[ call.index ].name;
			uniq( subtree( src.idx, call.fn.body ).filter( ( m ) => isParamField( m, name ) ).map( ( m ) => m.property.name ) ).forEach( ( field ) => derived.push( { field, ...call } ) );
		}
	}
	const state = nodes.filter( ( n ) => 'MemberExpression' === n.type && ! n.computed && ! METHODS.has( n.property.name ) && ! ( 'Identifier' === rootOf( n ).type && ( rootOf( n ).name === param || inner.has( rootOf( n ).name ) ) ) );
	const outer = state.filter( ( m ) => ! state.some( ( o ) => o.object === m ) );
	const keys = uniq( outer.map( ( m ) => m.property.name ) );
	const wildcards = new Map();
	const compares = nodes.filter( ( n ) => 'BinaryExpression' === n.type && /^[!=]==?$/.test( n.operator ) && n.operator.startsWith( '=' ) );
	for ( const field of direct ) {
		const side = ( b ) => [ [ b.left, b.right ], [ b.right, b.left ] ].find( ( [ a ] ) => isParamField( a, param ) && a.property.name === field )?.[ 1 ];
		const lit = compares.map( side ).find( ( o ) => 'StringLiteral' === o?.type );
		const live = compares.some( ( b ) => side( b ) && 'StringLiteral' !== side( b ).type ) || nodes.some( ( n ) => 'CallExpression' === n.type && n.arguments.some( ( a ) => isParamField( a, param ) && a.property.name === field ) );
		if ( lit && live ) {
			wildcards.set( field, lit.value );
		}
	}
	return { direct, derived, keys, wildcards };
}

// The entries a code list gives: [{ value, name, swatch }] (null when it is not a list of named values).
function entryOf( x ) {
	if ( 'string' === typeof x ) {
		return HEX.test( x ) ? null : { value: x, name: x, swatch: null };
	}
	if ( Array.isArray( x ) && 'string' === typeof x[ 0 ] ) {
		const pair = 2 === x.length && 'string' === typeof x[ 1 ] && ! HEX.test( x[ 1 ] ) && x[ 1 ].length > 1;
		return { value: x[ 0 ], name: pair ? x[ 1 ] : x[ 0 ], swatch: x.find( ( s ) => 'string' === typeof s && HEX.test( s ) ) || null };
	}
	if ( x && 'object' === typeof x && ! Array.isArray( x ) ) {
		const value = [ x.id, x.value, x.key ].find( ( v ) => 'string' === typeof v );
		const name = LABEL_KEYS.map( ( k ) => x[ k ] ).find( ( v ) => 'string' === typeof v );
		return value ? { value, name: name || value, swatch: Object.values( x ).find( ( s ) => 'string' === typeof s && HEX.test( s ) ) || null } : null;
	}
	return null;
}

// A table value keyed by its term value (`blk: [ 'Black', '#1b1b1b' ]`): { name, swatch }, or null.
function tableEntry( key, x ) {
	if ( 'string' === typeof x ) {
		return HEX.test( x ) ? { value: key, name: key, swatch: x } : { value: key, name: x, swatch: null };
	}
	const strings = Array.isArray( x ) ? x.filter( ( s ) => 'string' === typeof s ) : x && 'object' === typeof x ? [ ...LABEL_KEYS.map( ( k ) => x[ k ] ), ...Object.values( x ) ].filter( ( s ) => 'string' === typeof s ) : null;
	if ( ! strings ) {
		return null;
	}
	return { value: key, name: strings.find( ( s ) => ! HEX.test( s ) ) || key, swatch: strings.find( ( s ) => HEX.test( s ) ) || null };
}

// Every list of named values the sources hold, read once per sources object: [{ src, node, entries: [{ value, name, swatch }] }].
const VOCAB = new WeakMap();
function vocabularies( ctx ) {
	if ( ! VOCAB.has( ctx ) ) {
		const out = [];
		for ( const src of ctx.sources ) {
			for ( const n of src.idx.all ) {
				if ( 'ArrayExpression' === n.type && n.elements.length >= 2 ) {
					const v = valueOf( ctx, src, n );
					const entries = Array.isArray( v ) ? v.map( entryOf ) : [];
					entries.length && entries.every( Boolean ) && out.push( { src, node: n, entries } );
				} else if ( 'ObjectExpression' === n.type && n.properties.length >= 2 && n.properties.every( ( p ) => 'ObjectProperty' === p.type && ! isFn( p.value ) ) ) {
					const v = valueOf( ctx, src, n );
					const entries = v && ! isUnread( v ) && 'object' === typeof v ? Object.entries( v ).map( ( [ k, x ] ) => tableEntry( k, x ) ) : [];
					entries.length && entries.every( Boolean ) && out.push( { src, node: n, entries } );
				}
			}
		}
		VOCAB.set( ctx, out );
	}
	return VOCAB.get( ctx );
}

// The code's list naming a set of values: the one covering most of them (at least half, and two when there are two or
// more), the shorter on a tie, never one inside the record list `records` ({ src, node }: a product's own values are no
// list of choices); { entries (the covered values, in the list's order), missing } or null.
export function vocabularyFor( ctx, values, records = null ) {
	const want = new Set( values );
	let best = null;
	const within = ( v ) => records && v.src === records.src && v.node.start >= records.node.start && v.node.end <= records.node.end;
	for ( const { entries } of vocabularies( ctx ).filter( ( v ) => ! within( v ) ) ) {
		const covered = uniq( entries.filter( ( e ) => want.has( e.value ) ).map( ( e ) => e.value ) ).length;
		if ( covered < Math.min( 2, want.size ) || covered * 2 < want.size ) {
			continue;
		}
		if ( ! best || covered > best.covered || ( covered === best.covered && entries.length < best.entries.length ) ) {
			best = { entries, covered };
		}
	}
	if ( ! best ) {
		return null;
	}
	const seen = new Set();
	const entries = best.entries.filter( ( e ) => want.has( e.value ) && ! seen.has( e.value ) && seen.add( e.value ) );
	return { entries, missing: values.filter( ( v ) => ! seen.has( v ) ) };
}

// Whether a node (or a variable it names, one step) refers to the state key: a `'key'` literal or a `.key` member.
function mentions( src, node, key, deep = true ) {
	return subtree( src.idx, node ).some( ( n ) => ( 'StringLiteral' === n.type && n.value === key ) || ( 'MemberExpression' === n.type && ! n.computed && n.property.name === key )
		|| ( deep && 'Identifier' === n.type && ( () => {
			const r = resolveName( src.idx, n );
			return 'var' === r?.kind && r.init && ! r.key && r.init !== node && mentions( src, r.init, key, false );
		} )() ) );
}

// The label a filter group gives itself: a call's first capitalised text argument, an object's label-like property.
function directLabel( el ) {
	if ( 'CallExpression' === el.type ) {
		return el.arguments.find( ( a ) => 'StringLiteral' === a.type && LABEL.test( a.value ) )?.value || null;
	}
	const p = el.properties.find( ( x ) => 'ObjectProperty' === x.type && LABEL_KEYS.includes( x.key?.name ?? x.key?.value ) && 'StringLiteral' === x.value.type );
	return p ? p.value.value : null;
}

// The label of the filter group drawing a state key: an element of an array literal (a call or an object literal) that
// names it.
export function groupLabel( ctx, key ) {
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all.filter( ( x ) => 'ArrayExpression' === x.type && x.elements.length >= 2 ) ) {
			for ( const el of n.elements.filter( ( e ) => 'CallExpression' === e?.type || 'ObjectExpression' === e?.type ) ) {
				const label = mentions( src, el, key ) ? directLabel( el ) : null;
				if ( label ) {
					return label;
				}
			}
		}
	}
	return null;
}

const decode = ( s ) => s.replace( /&[#a-z0-9]+;/gi, ( e ) => ENTITIES[ e.toLowerCase() ] ?? e ).replace( /\s+/g, ' ' ).trim();

// The text a draft template shows just before the control bound to a render value that reads the state key, or null.
export function templateLabel( ctx, key ) {
	for ( const src of ctx.sources.filter( ( s ) => s.text && s.draft?.cut ) ) {
		const tpl = src.text.slice( src.draft.cut.templateStart, src.draft.cut.templateEnd );
		const names = uniq( src.idx.all.filter( ( n ) => 'ObjectProperty' === n.type && ! n.computed && 'Identifier' === n.key.type && n.value && mentions( src, n.value, key, false ) ).map( ( n ) => n.key.name ) );
		const at = Math.min( ...names.map( ( name ) => tpl.search( new RegExp( `\\{\\{\\s*${ name }\\s*\\}\\}` ) ) ).filter( ( i ) => i >= 0 ) );
		if ( Number.isFinite( at ) ) {
			const start = tpl.lastIndexOf( '<', at );
			const texts = [ ...tpl.slice( Math.max( 0, start - 800 ), start ).matchAll( />([^<>]*)</g ) ].map( ( m ) => decode( m[ 1 ] ) ).filter( ( t ) => /[A-Za-z]/.test( t ) && ! t.includes( '{{' ) );
			if ( texts.length ) {
				return texts[ texts.length - 1 ];
			}
		}
	}
	return null;
}

// The text of the active-filter chip a state key alone guards (`if ( f.pol ) chips.push( { label: 'Polarised' } )`).
export function chipLabel( ctx, key ) {
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all.filter( ( x ) => 'IfStatement' === x.type ) ) {
			const t = n.test;
			if ( ! ( ( 'MemberExpression' === t.type && ! t.computed && t.property.name === key ) || ( 'Identifier' === t.type && t.name === key ) ) ) {
				continue;
			}
			const p = subtree( src.idx, n.consequent ).find( ( x ) => 'ObjectProperty' === x.type && LABEL_KEYS.includes( x.key?.name ?? x.key?.value ) && 'StringLiteral' === x.value.type );
			if ( p ) {
				return p.value.value;
			}
		}
	}
	return null;
}

// The filter callbacks over a record list, each conjunct's test: [{ src, test }].
function listTests( ctx, list ) {
	const out = [];
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'CallExpression' !== n.type || 'MemberExpression' !== n.callee.type || n.callee.computed || 'filter' !== n.callee.property.name || ! isFn( n.arguments[ 0 ] ) ) {
				continue;
			}
			const fn = n.arguments[ 0 ];
			const param = fn.params[ 0 ];
			const body = returnsOf( src.idx, fn );
			if ( 'Identifier' !== param?.type || 1 !== body.length || ! arraysOf( ctx, src, n.callee.object ).some( ( t ) => t.node === list.array.node ) ) {
				continue;
			}
			conjuncts( body[ 0 ] ).forEach( ( c ) => out.push( { src, test: testOf( src, c, param.name ) } ) );
		}
	}
	return out;
}

const fieldsOf = ( test ) => uniq( [ ...test.direct, ...test.derived.map( ( d ) => d.field ) ] );

// The facets of one record list's filter fields. fields: the fields to read (the filter fields other than the price,
// brand and categories); helpers: { slugify, human }. Returns { facets, gaps, termsOf( record ) -> { slug: [ names ] } }.
export function readFacets( ctx, list, fields, { slugify, human } ) {
	const tests = listTests( ctx, list );
	const facets = [];
	const gaps = [];
	const gap = ( field, why ) => gaps.push( { draftId: '*', kind: 'facet', detail: `the filter on "${ field }" ${ why }` } );
	const perRecord = new Map( list.records.map( ( r ) => [ r, {} ] ) );
	for ( const field of fields ) {
		const cands = tests.filter( ( t ) => fieldsOf( t.test ).includes( field ) );
		const single = cands.filter( ( t ) => 1 === fieldsOf( t.test ).length );
		if ( ! single.length ) {
			gap( field, `tests it together with ${ uniq( cands.flatMap( ( t ) => fieldsOf( t.test ) ) ).filter( ( f ) => f !== field ).map( ( f ) => `"${ f }"` ).join( ', ' ) || 'nothing the code names' } in one condition, which no single WooCommerce attribute holds; recorded, not built` );
			continue;
		}
		const labelled = single.map( ( t ) => ( { ...t, key: 1 === t.test.keys.length ? t.test.keys[ 0 ] : null } ) ).map( ( t ) => ( { ...t, group: t.key ? groupLabel( ctx, t.key ) || templateLabel( ctx, t.key ) : null } ) );
		const pick = labelled.find( ( t ) => t.group ) || labelled[ 0 ];
		const { test, key } = pick;
		const raw = list.records.map( ( r ) => r[ field ] );
		let kind;
		let values;
		if ( ! test.direct.includes( field ) ) {
			const d = test.derived.find( ( x ) => x.field === field );
			const body = returnsOf( pick.src.idx, d.fn );
			values = 1 === body.length ? list.records.map( ( r ) => valueOf( ctx, pick.src, body[ 0 ], new Map( [ [ d.fn, Object.assign( [], { [ d.index ]: r } ) ] ] ) ) ) : [ UNREAD ];
			if ( values.some( ( v ) => isUnread( v ) || ( null != v && 'string' !== typeof v ) ) ) {
				gap( field, 'tests a value a local function works out from it, which the code does not give as text for every product; recorded, not built' );
				continue;
			}
			kind = 'derived';
		} else if ( raw.every( ( v ) => null == v || 'boolean' === typeof v ) && raw.some( ( v ) => true === v ) ) {
			kind = 'boolean';
			values = raw;
		} else if ( raw.every( ( v ) => null == v || 'string' === typeof v ) ) {
			kind = 'value';
			values = raw;
		} else if ( raw.every( ( v ) => null == v || ( Array.isArray( v ) && v.every( ( x ) => 'string' === typeof x ) ) ) ) {
			kind = 'multi';
			values = raw;
		} else {
			gap( field, `compares its ${ uniq( raw.map( ( v ) => ( Array.isArray( v ) ? 'list' : typeof v ) ) ).join( ' and ' ) } values directly (a range or a sum), and a WooCommerce attribute holds named terms only; recorded, not built` );
			continue;
		}
		const label0 = pick.group || human( field ) || field;
		const wildcard = 'value' === kind ? test.wildcards.get( field ) ?? null : null;
		let terms;
		let names;
		if ( 'boolean' === kind ) {
			const name = ( key && chipLabel( ctx, key ) ) || label0;
			terms = [ { name, swatch: null } ];
			names = values.map( ( v ) => ( true === v ? [ name ] : [] ) );
		} else {
			const each = values.map( ( v ) => ( null == v ? [] : Array.isArray( v ) ? v : [ v ] ) );
			const distinct = uniq( each.flat().filter( ( v ) => v !== wildcard ) );
			const vocab = vocabularyFor( ctx, distinct, list.array );
			const entries = vocab ? vocab.entries : distinct.map( ( v ) => ( { value: v, name: v, swatch: null } ) );
			if ( vocab?.missing.length ) {
				gap( field, `meets ${ vocab.missing.map( ( v ) => `"${ v }"` ).join( ', ' ) } on products, which the filter's own list offers no choice for; ${ 1 === vocab.missing.length ? 'it is' : 'they are' } not written as terms` );
			}
			const nameOf = new Map( entries.map( ( e ) => [ e.value, e.name ] ) );
			terms = entries.map( ( e ) => ( { name: e.name, swatch: e.swatch } ) );
			names = each.map( ( vs ) => uniq( vs.flatMap( ( v ) => ( v === wildcard ? entries.map( ( e ) => e.value ) : [ v ] ) ).filter( ( v ) => nameOf.has( v ) ).map( ( v ) => nameOf.get( v ) ) ) );
		}
		if ( ! terms.length ) {
			gap( field, 'gives no value a term can name; recorded, not built' );
			continue;
		}
		const label = 'boolean' === kind ? terms[ 0 ].name : label0;
		const base = slugify( label ).slice( 0, SLUG_MAX ).replace( /-+$/, '' ) || slugify( field );
		let slug = base;
		for ( let n = 2; facets.some( ( x ) => x.slug === slug ); n++ ) {
			slug = `${ base.slice( 0, SLUG_MAX - 3 ).replace( /-+$/, '' ) }-${ n }`;
		}
		facets.push( { field, key, label, slug, kind, terms, wildcard, toggleLabel: 'boolean' === kind && label0 !== label ? label0 : null, axis: false, files: uniq( cands.map( ( t ) => t.src.file ) ).sort() } );
		list.records.forEach( ( r, i ) => names[ i ].length && ( perRecord.get( r )[ slug ] = names[ i ] ) );
	}
	return { facets, gaps, termsOf: ( r ) => ( { ...( perRecord.get( r ) || {} ) } ) };
}

// Settles the facets' slugs against the catalogue's variation attributes (readFacets already numbers two facets of one
// slug): a facet whose slug a variation attribute already takes is that axis when the attribute holds all its terms (it
// is not written again), else it is renamed `<slug>-filter` (numbered when that is taken too). Products' facet keys
// follow. Mutates `catalogue`.
export function settleFacets( catalogue ) {
	const axes = new Map();
	catalogue.products.flatMap( ( p ) => p.attributes ).forEach( ( a ) => axes.set( a.slug, new Set( [ ...( axes.get( a.slug ) || [] ), ...a.options.map( ( o ) => o.term ) ] ) ) );
	const taken = new Set( [ ...axes.keys(), ...catalogue.facets.map( ( f ) => f.slug ) ] );
	for ( const f of catalogue.facets ) {
		const was = f.slug;
		if ( ! axes.has( f.slug ) ) {
			continue;
		}
		if ( f.terms.every( ( t ) => axes.get( f.slug ).has( t.name ) ) ) {
			f.axis = true;
			continue;
		}
		const base = `${ f.slug.slice( 0, SLUG_MAX - 7 ).replace( /-+$/, '' ) }-filter`;
		let slug = base;
		for ( let n = 2; taken.has( slug ); n++ ) {
			slug = `${ base.slice( 0, SLUG_MAX - 3 ).replace( /-+$/, '' ) }-${ n }`;
		}
		taken.add( slug );
		f.slug = slug;
		catalogue.products.forEach( ( p ) => {
			if ( p.facets[ was ] ) {
				p.facets = Object.fromEntries( Object.entries( p.facets ).map( ( [ k, v ] ) => [ k === was ? slug : k, v ] ) );
			}
		} );
	}
	return catalogue;
}
