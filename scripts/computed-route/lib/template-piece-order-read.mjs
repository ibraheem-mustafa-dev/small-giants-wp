// What a draft's order confirmation shows of the order (Spec 48 FR-48-96), read from the fact record (lib/fact-record.mjs:
// each template element's holes, loops, branches and sample values) and the draft's logic (its AST, lib/intake-ast.mjs),
// never from the words on the page:
//   - the order lines: the loop (`sc-for`) whose items show a quantity (a number) and a currency amount (a value a
//     currency formatter makes, lib/shop-parts-logic.mjs::isMoney, or a sample that is one). Its list comes from one object
//     of the logic, and that object is the order: every other value is an order value when the logic derives it from that
//     object (through variables, `&&`, `||`, conditionals, string joins and currency formatters);
//   - the rows that follow the loop in its own container and show an order amount are its totals rows;
//   - each order value outside the lines is classified to a key of the `sgs/order` binding source by structure first (a
//     currency amount, the order's reference, a link carrying that reference, a field under a part of the order a branch
//     tests) and by data/order-facts.json's words only between keys the structure leaves open; a value no key fits is a
//     problem row naming it;
//   - each branch (`sc-if`) whose test reads the order takes the Show-to rule of the part it tests (a gift, an account),
//     shown or hidden by the test's polarity; a branch that only hides a value its own content shows is a guard and needs
//     no rule.
// Pure apart from reading the draft file named by the fact record's component.
import { classMethod, decodeEntities, isFn, keyName, loadDraft, resolveName } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { isMoney, valuesOf } from './shop-parts-logic.mjs';
import { parseTemplateKey } from './fact-key.mjs';

const DEPTH = 8;
const SKIP = new Set( [ 'loc', 'start', 'end', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'range' ] );
const CURRENCY = /^\s*[£$€¥₹]\s?-?\d[\d,]*(\.\d+)?\s*$/;
// A whole value with an order reference's shape: letters, an optional hyphen and three or more digits, or # and digits.
const REFERENCE = /^\s*(#\d{3,}|[A-Z]{2,}-?\d{3,})\s*$/;
const REFERENCE_IN = /(^|[^\w#-])(#\d{3,}|[A-Z]{2,}-\d{3,})(?![\w-])/;
// List methods through which a list keeps coming from the same object.
const LIST_STEPS = new Set( [ 'map', 'filter', 'slice', 'concat', 'sort', 'reverse', 'flat' ] );
// Value methods through which a value keeps coming from the same field.
const VALUE_STEPS = new Set( [ 'toFixed', 'toString', 'trim', 'toUpperCase', 'toLowerCase', 'toLocaleString', 'toLocaleDateString' ] );
const IMAGE_WHERE = /^(style:background(-image)?|attr:src|attr:srcset)\b/;

export const exprOf = ( v ) => String( v ?? '' ).replace( /^\s*\{\{\s*|\s*\}\}\s*$/g, '' ).trim();
const wordsOf = ( s ) => String( s ).replace( /([a-z0-9])([A-Z])/g, '$1 $2' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( Boolean );
const pathText = ( p ) => p.join( '.' );
const samePath = ( a, b ) => pathText( a ) === pathText( b );
const under = ( p, prefix ) => p.length > prefix.length && prefix.every( ( s, i ) => p[ i ] === s );

// Every child node of an AST node.
function children( n ) {
	const out = [];
	for ( const k of Object.keys( n ) ) {
		if ( SKIP.has( k ) ) {
			continue;
		}
		const v = n[ k ];
		Array.isArray( v ) ? v.forEach( ( c ) => c && 'string' === typeof c.type && out.push( c ) ) : v && 'string' === typeof v.type && out.push( v );
	}
	return out;
}

const isVarDecl = ( d ) => 'VariableDeclarator' === d?.type;

// The places an expression's value comes from: [ { decl, path, money, joined } ], `decl` the variable declarator of the
// object at the root (null for a global, 'this' for the component), `path` the fields read below it. A variable whose
// value comes from another local variable's fields is followed to that variable; any other variable is a root of its own.
// `money`: a currency formatter made the value; `joined`: the value is joined into a string.
export function originsOf( L, n, depth = 0 ) {
	if ( ! n || depth > DEPTH ) {
		return [];
	}
	const go = ( x ) => originsOf( L, x, depth + 1 );
	const mark = ( list, flag ) => list.map( ( o ) => ( { ...o, [ flag ]: true } ) );
	switch ( n.type ) {
		case 'MemberExpression': {
			const prop = n.computed ? ( 'StringLiteral' === n.property.type ? n.property.value : '[]' ) : n.property.name;
			const base = 'ThisExpression' === n.object.type ? [ { decl: 'this', path: [] } ] : go( n.object );
			return base.map( ( b ) => ( { ...b, path: [ ...b.path, prop ] } ) );
		}
		case 'Identifier': {
			const r = resolveName( L, n );
			if ( ! r ) {
				return [ { decl: null, root: n.name, path: [] } ];
			}
			if ( 'var' !== r.kind ) {
				return [ { decl: r.fn, param: r.index, path: r.key ? [ r.key ] : [] } ];
			}
			const inner = r.init ? go( r.init ) : [];
			const local = inner.filter( ( o ) => isVarDecl( o.decl ) );
			const base = local.length ? local : [ { decl: r.decl, path: [] } ];
			return r.key ? base.map( ( b ) => ( { ...b, path: [ ...b.path, r.key ] } ) ) : base;
		}
		case 'LogicalExpression':
			return '&&' === n.operator ? go( n.right ) : [ ...go( n.left ), ...go( n.right ) ];
		case 'ConditionalExpression':
			return [ ...go( n.consequent ), ...go( n.alternate ) ];
		case 'CallExpression': {
			const prop = 'MemberExpression' === n.callee.type && ! n.callee.computed ? n.callee.property.name : null;
			if ( isMoney( L, n ) ) {
				return mark( n.arguments.flatMap( go ), 'money' );
			}
			if ( prop && ( LIST_STEPS.has( prop ) || VALUE_STEPS.has( prop ) ) ) {
				return go( n.callee.object );
			}
			return 'Identifier' === n.callee.type && [ 'String', 'Number' ].includes( n.callee.name ) ? go( n.arguments[ 0 ] ) : [];
		}
		case 'BinaryExpression':
			return '+' === n.operator ? mark( [ ...go( n.left ), ...go( n.right ) ], 'joined' ) : [];
		case 'TemplateLiteral':
			return mark( n.expressions.flatMap( go ), 'joined' );
		case 'UnaryExpression':
			return go( n.argument );
		default:
			return [];
	}
}

// Every place an expression reads, its tests included (a conditional's test, a `&&` guard): originsOf over each maximal
// member chain and each name in it.
export function readsOf( L, n, depth = 0 ) {
	if ( ! n || depth > DEPTH ) {
		return [];
	}
	if ( 'MemberExpression' === n.type || 'Identifier' === n.type ) {
		const own = originsOf( L, n );
		// A name's own value is read through, so the tests inside a variable's value count (`note = o.gift && o.gift.on && …`).
		const r = 'Identifier' === n.type ? resolveName( L, n ) : null;
		const inner = 'var' === r?.kind && r.init ? readsOf( L, r.init, depth + 1 ) : [];
		return [ ...own, ...inner, ...( 'MemberExpression' === n.type && n.computed ? readsOf( L, n.property, depth + 1 ) : [] ) ];
	}
	if ( 'ObjectProperty' === n.type ) {
		return readsOf( L, n.value, depth + 1 );
	}
	return children( n ).flatMap( ( c ) => readsOf( L, c, depth + 1 ) );
}

// The value nodes a renderVals key holds (its value in each object renderVals returns), else every value the logic gives
// that name (lib/shop-parts-logic.mjs::valuesOf).
export function topValues( L, key ) {
	const rv = classMethod( L, 'renderVals' );
	const fn = rv && ( isFn( rv ) ? rv : rv.value );
	const hits = ( fn ? returnsOf( L, fn ) : [] ).filter( ( o ) => 'ObjectExpression' === o.type ).flatMap( ( o ) => o.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === key ).map( ( p ) => p.value ) );
	return hits.length ? hits : valuesOf( L, key );
}

// The object literals that are the items of a list value: an array's object elements, a map callback's returned objects.
function itemObjects( L, n, depth = 0 ) {
	if ( ! n || depth > DEPTH ) {
		return [];
	}
	if ( 'ArrayExpression' === n.type ) {
		return n.elements.filter( ( e ) => 'ObjectExpression' === e?.type );
	}
	if ( 'CallExpression' === n.type && 'map' === n.callee.property?.name && isFn( n.arguments[ 0 ] ) ) {
		return returnsOf( L, n.arguments[ 0 ] ).filter( ( r ) => 'ObjectExpression' === r.type );
	}
	if ( 'LogicalExpression' === n.type ) {
		return [ ...itemObjects( L, n.left, depth + 1 ), ...itemObjects( L, n.right, depth + 1 ) ];
	}
	if ( 'Identifier' === n.type ) {
		const r = resolveName( L, n );
		return 'var' === r?.kind && ! r.key ? itemObjects( L, r.init, depth + 1 ) : [];
	}
	return [];
}

// The value nodes of a hole expression: a loop variable's field (`it.total`) inside the loop's item objects, else a
// renderVals key and the fields below it. Each comes with `rest`, the fields no object literal resolved.
export function holeValues( L, expr, loops = [] ) {
	const [ first, ...more ] = String( expr ).split( '.' );
	const loop = loops.find( ( l ) => l.as === first );
	if ( loop ) {
		const objs = topValues( L, exprOf( loop.list ) ).flatMap( ( v ) => itemObjects( L, v ) );
		const found = objs.flatMap( ( o ) => o.properties.filter( ( p ) => 'ObjectProperty' === p.type && keyName( p ) === more[ 0 ] ).map( ( p ) => ( { node: p.value, rest: more.slice( 1 ) } ) ) );
		return found.length ? found : valuesOf( L, expr, exprOf( loop.list ) ).map( ( node ) => ( { node, rest: [] } ) );
	}
	return topValues( L, first ).map( ( node ) => ( { node, rest: more } ) );
}

// The text of a draft element's own source (its start tag to its end tag), with each hole kept as `{{ expr }}`; null when
// the source cannot be found. The fact record's template number `n` is the start tag's place among the template's tags.
export function sourceText( draft, el ) {
	const start = draft?.tags?.[ Number( el?.template?.n ) ];
	if ( ! start || start.name.toLowerCase() !== String( el.template.tag || '' ).toLowerCase() ) {
		return null;
	}
	const re = /<\/?([a-zA-Z][\w-]*)\b[^>]*>/g;
	const VOID = new Set( [ 'img', 'br', 'wbr', 'hr', 'input', 'source', 'meta', 'link' ] );
	re.lastIndex = start.index;
	let depth = 0;
	for ( let hit = re.exec( draft.text ); hit; hit = re.exec( draft.text ) ) {
		if ( hit[ 0 ].startsWith( '</' ) ) {
			depth--;
		} else if ( ! VOID.has( hit[ 1 ].toLowerCase() ) && ! hit[ 0 ].endsWith( '/>' ) ) {
			depth++;
		}
		if ( depth <= 0 ) {
			const html = draft.text.slice( start.index, re.lastIndex );
			return decodeEntities( html.replace( /<[^>]*>/g, ' ' ) ).replace( /\s+/g, ' ' ).replace( /\s+([.,;:!?·])/g, '$1' ).trim();
		}
	}
	return null;
}

const samples = ( el, id ) => Object.values( el?.logic?.holes?.[ id ] || {} ).flatMap( ( w ) => w?.v || [] );
const isMoneySample = ( vs ) => vs.length > 0 && vs.every( ( x ) => 'string' === x.t && CURRENCY.test( x.v ) );
const isNumberSample = ( vs ) => vs.length > 0 && vs.every( ( x ) => 'number' === x.t && Number.isInteger( x.v ) );

// The elements of the surface: those at or below `tops` (template keys), in template order.
export function surfaceElements( record, tops ) {
	const set = new Set( tops );
	const order = ( k ) => Number( parseTemplateKey( k )?.tpl );
	return Object.entries( record?.elements || {} ).filter( ( [ k, e ] ) => set.has( k ) || ( e.template?.parentChain || [] ).some( ( p ) => set.has( p ) ) ).sort( ( a, b ) => order( a[ 0 ] ) - order( b[ 0 ] ) ).map( ( [ key, e ] ) => ( { key, ...e } ) );
}

// The words that pick a key, a group or a row out of the order facts: the path's own words.
const wordHit = ( segment, words ) => wordsOf( segment ).some( ( w ) => words.includes( w ) ) || words.includes( String( segment ).toLowerCase() );

// The order as the draft shows it: { lines, rows, holes, branches, problems, notes } (see the header). `record` is the fact
// record, `tops` the template keys of the surface's top elements, `draft` the draft file loaded by lib/intake-ast.mjs::
// loadDraft (its logic in `draft.idx`), `facts` data/order-facts.json.
export function readOrder( { record, tops, draft, facts } ) {
	const L = draft?.idx || null;
	const els = surfaceElements( record, tops );
	const byKey = new Map( els.map( ( e ) => [ e.key, e ] ) );
	const problems = [];
	const notes = [];
	const out = { lines: null, rows: [], holes: [], branches: [], problems, notes, numberPath: null, order: null };
	// An order reference written as fixed words: no value of the logic shows it, so nothing can bind it and the page would
	// show that one reference for every order.
	for ( const e of els ) {
		const ref = REFERENCE_IN.exec( String( e.template?.words || '' ).replace( /\{\{[^}]*\}\}/g, ' ' ) )?.[ 2 ];
		ref && problems.push( `the draft writes the order reference "${ ref }" as fixed words in <${ e.template.tag }> ${ e.key } ("${ String( e.template.words ).trim().slice( 0, 80 ) }"): no value of the logic shows it, so it cannot be bound and would show for every order` );
	}
	if ( ! L ) {
		problems.push( `the draft's logic cannot be read (${ draft?.error || 'no logic' }), so no value is known to come from the order` );
		return out;
	}
	const loopsOf = ( e ) => ( e.template?.membership?.scFor || [] ).map( ( f ) => ( { key: f.key, list: f.list, as: f.as } ) );
	const itemsOf = ( loopKey ) => els.filter( ( e ) => ( e.template?.membership?.scFor || [] ).some( ( f ) => f.key === loopKey ) );
	const valuesFor = ( e, h ) => holeValues( L, h.expr, loopsOf( e ) );
	const originsFor = ( e, h ) => valuesFor( e, h ).flatMap( ( { node, rest } ) => originsOf( L, node ).map( ( o ) => ( { ...o, path: [ ...o.path, ...rest ] } ) ) );
	const readsFor = ( e, h ) => valuesFor( e, h ).flatMap( ( { node } ) => readsOf( L, node ) );
	const moneyHole = ( e, h ) => isMoneySample( samples( e, h.id ) ) || valuesFor( e, h ).some( ( { node } ) => isMoney( L, node ) );

	// The order lines: a loop whose items show a whole number and a currency amount.
	const loops = els.filter( ( e ) => 'sc-for' === e.template?.tag ).map( ( loop ) => {
		const items = itemsOf( loop.key );
		const text = items.flatMap( ( e ) => ( e.template.holes || [] ).filter( ( h ) => 'text' === String( h.where ).split( '#' )[ 0 ] ).map( ( h ) => ( { e, h } ) ) );
		const qty = text.filter( ( { e, h } ) => isNumberSample( samples( e, h.id ) ) );
		const money = text.filter( ( { e, h } ) => moneyHole( e, h ) );
		return { loop, items, text, qty, money };
	} ).filter( ( x ) => x.qty.length && x.money.length );
	if ( loops.length > 1 ) {
		problems.push( `${ loops.length } loops show order lines (${ loops.map( ( x ) => x.loop.key ).join( ', ' ) }): which one is the order's is not known, none is placed` );
	}
	const lines = 1 === loops.length ? loops[ 0 ] : null;
	if ( lines ) {
		const list = exprOf( lines.loop.template.own?.list );
		const from = topValues( L, list ).flatMap( ( v ) => originsOf( L, v ) ).filter( ( o ) => isVarDecl( o.decl ) );
		const roots = [ ...new Set( from.map( ( o ) => o.decl ) ) ];
		if ( 1 === roots.length ) {
			out.order = { decl: roots[ 0 ], name: roots[ 0 ].id?.name ?? null, listPath: from.find( ( o ) => o.decl === roots[ 0 ] ).path };
		} else {
			problems.push( `the order lines loop ${ lines.loop.key } takes its list "${ list }" from ${ roots.length ? 'several objects' : 'no object the logic holds' }, so no other value can be traced to the order` );
		}
		const named = lines.text.filter( ( x ) => ! lines.qty.includes( x ) && ! lines.money.includes( x ) );
		out.lines = {
			key: lines.loop.key,
			parent: lines.loop.template.parent,
			items: lines.items.map( ( e ) => e.key ),
			thumbnail: lines.items.some( ( e ) => ( e.template.holes || [] ).some( ( h ) => IMAGE_WHERE.test( h.where ) ) ),
			options: named.length >= 2,
		};
	}
	const D = out.order?.decl ?? null;
	const ofOrder = ( list ) => list.filter( ( o ) => D && o.decl === D && ! ( out.order.listPath.length && ( samePath( o.path, out.order.listPath ) || under( o.path, out.order.listPath ) ) ) );

	// Every hole outside the order lines that reads the order, with what its value is.
	const lineItems = new Set( out.lines?.items || [] );
	for ( const e of els ) {
		for ( const h of e.template?.holes || [] ) {
			const where = String( h.where );
			if ( /^attr:(value|list|ref|hint-|key)/.test( where ) || lineItems.has( e.key ) ) {
				continue;
			}
			const reads = ofOrder( readsFor( e, h ) );
			if ( ! reads.length ) {
				continue;
			}
			const spine = ofOrder( originsFor( e, h ) );
			const paths = [ ...new Map( spine.map( ( o ) => [ pathText( o.path ), o.path ] ) ).values() ];
			out.holes.push( {
				el: e.key, id: h.id, expr: h.expr, where: where.split( '#' )[ 0 ], loops: loopsOf( e ).map( ( l ) => l.key ),
				paths, reads: [ ...new Set( reads.map( ( o ) => pathText( o.path ) ) ) ], money: spine.some( ( o ) => o.money ) || moneyHole( e, h ),
				joined: spine.some( ( o ) => o.joined ), sample: samples( e, h.id ).find( ( x ) => 'string' === x.t && x.v )?.v ?? null,
			} );
		}
	}

	// The order's reference: the field a link to the order carries, else the one field whose sample has a reference's shape.
	const linked = out.holes.filter( ( h ) => 'attr:href' === h.where && h.joined && 1 === h.paths.length ).map( ( h ) => h.paths[ 0 ] );
	const shaped = out.holes.filter( ( h ) => 1 === h.paths.length && h.sample && REFERENCE.test( h.sample ) ).map( ( h ) => h.paths[ 0 ] );
	const distinct = ( ps ) => [ ...new Map( ps.map( ( p ) => [ pathText( p ), p ] ) ).values() ];
	const refs = distinct( linked ).length ? distinct( linked ) : distinct( shaped );
	out.numberPath = 1 === refs.length ? refs[ 0 ] : null;

	// The totals rows: elements after the loop in its own container that show an order amount.
	if ( out.lines ) {
		const loopN = Number( byKey.get( out.lines.key )?.template?.n );
		const after = els.filter( ( e ) => e.template?.parent === out.lines.parent && Number( e.template.n ) > loopN && 'sc-for' !== e.template.tag && 'sc-if' !== e.template.tag );
		for ( const row of after ) {
			const inside = ( h ) => h.el === row.key || ( byKey.get( h.el )?.template?.parentChain || [] ).includes( row.key );
			const amounts = out.holes.filter( ( h ) => inside( h ) && h.money && 1 === h.paths.length && ! h.loops.length );
			if ( ! amounts.length ) {
				continue;
			}
			const field = amounts[ 0 ].paths[ 0 ];
			const kind = Object.entries( facts.items?.rows || {} ).filter( ( [ , r ] ) => wordHit( field.at( -1 ), r.words ) ).map( ( [ k ] ) => k );
			const label = els.filter( ( x ) => ( x.key === row.key || ( x.template.parentChain || [] ).includes( row.key ) ) && ! ( x.template.holes || [] ).length ).map( ( x ) => String( x.template.words || '' ).trim() ).filter( Boolean ).join( ' ' );
			amounts.forEach( ( h ) => ( h.row = row.key ) );
			if ( 1 === kind.length ) {
				out.rows.push( { el: row.key, kind: kind[ 0 ], label, field: pathText( field ) } );
			} else {
				problems.push( `the totals row ${ row.key } shows the order's ${ pathText( field ) }, which ${ kind.length ? `fits several rows (${ kind.join( ', ' ) })` : 'no sgs/order-items totals row fits' }` );
			}
		}
	}

	// Each order value's key.
	const groupOf = ( p ) => Object.entries( facts.groups || {} ).filter( ( [ , g ] ) => p.slice( 0, -1 ).some( ( s ) => wordHit( s, g.words ) ) ).map( ( [ k ] ) => k );
	for ( const h of out.holes ) {
		if ( h.row ) {
			h.absorbed = h.row;
			continue;
		}
		if ( h.loops.length ) {
			h.problem = `the value {{ ${ h.expr } }} (${ h.el }) sits in the loop ${ h.loops.at( -1 ) }, which is not the order lines, and reads the order's ${ h.reads.join( ', ' ) }: no binding reaches a loop item`;
			continue;
		}
		if ( 1 !== h.paths.length ) {
			h.problem = h.paths.length
				? `the value {{ ${ h.expr } }} (${ h.el }) joins several order fields (${ h.paths.map( pathText ).join( ', ' ) }): one binding holds one key`
				: `the value {{ ${ h.expr } }} (${ h.el }) chooses fixed words by the order's ${ h.reads.join( ', ' ) }: no binding key or Show-to rule holds that choice`;
			continue;
		}
		const p = h.paths[ 0 ];
		const link = 'attr:href' === h.where;
		const groups = groupOf( p );
		const fits = Object.entries( facts.keys || {} ).filter( ( [ , k ] ) => {
			if ( !! k.link !== link || !! k.money !== h.money ) {
				return false;
			}
			if ( k.link ) {
				return h.joined && !! out.numberPath && samePath( p, out.numberPath );
			}
			if ( k.reference ) {
				return !! out.numberPath && samePath( p, out.numberPath );
			}
			// A key of a part of the order needs a field under that part; any other key a field of the order itself (a
			// field under a part no group names, `bake.date`, is not the order's date).
			if ( k.group ? ! groups.includes( k.group ) : p.length > 1 ) {
				return false;
			}
			return wordHit( p.at( -1 ), k.words || [] );
		} ).map( ( [ name ] ) => name );
		const money = Object.entries( facts.keys || {} ).filter( ( [ , k ] ) => k.money ).map( ( [ name ] ) => name );
		// A currency amount with no words of its own still takes the one money key there is.
		const keys = fits.length ? fits : h.money && 1 === money.length && ! groups.length ? money : [];
		if ( 1 === keys.length ) {
			h.key = keys[ 0 ];
		} else {
			h.problem = `the value {{ ${ h.expr } }} (${ h.el }) reads the order's ${ pathText( p ) }, which ${ keys.length ? `fits several keys (${ keys.join( ', ' ) })` : `no ${ link ? 'link ' : '' }key of the order binding holds` }`;
		}
	}

	// Each branch whose test reads the order.
	for ( const e of els.filter( ( x ) => 'sc-if' === x.template?.tag ) ) {
		const test = exprOf( e.template.own?.value );
		let polarity = true;
		let inner = test;
		while ( inner.startsWith( '!' ) ) {
			polarity = ! polarity;
			inner = inner.slice( 1 ).trim();
		}
		let nodes = /^[\w$.]+$/.test( inner ) ? holeValues( L, inner, loopsOf( e ) ).map( ( x ) => x.node ) : [];
		const flip = ( n ) => {
			let node = n;
			let pos = true;
			for ( let guard = 0; guard < DEPTH; guard++ ) {
				if ( 'UnaryExpression' === node?.type && '!' === node.operator ) {
					pos = ! pos;
					node = node.argument;
				} else if ( 'CallExpression' === node?.type && 'Identifier' === node.callee.type && 'Boolean' === node.callee.name ) {
					node = node.arguments[ 0 ];
				} else {
					break;
				}
			}
			return { node, pos };
		};
		nodes = nodes.map( flip );
		const reads = nodes.flatMap( ( { node } ) => ofOrder( readsOf( L, node ) ) );
		if ( ! reads.length ) {
			continue;
		}
		const shown = nodes.every( ( x ) => x.pos === nodes[ 0 ].pos ) ? nodes[ 0 ].pos === polarity : null;
		const paths = [ ...new Set( reads.map( ( o ) => pathText( o.path ) ) ) ];
		const content = out.holes.filter( ( h ) => ( byKey.get( h.el )?.template?.membership?.scIf || [] ).some( ( s ) => s.key === e.key ) );
		const bound = new Set( content.filter( ( h ) => h.key && 1 === h.paths.length ).map( ( h ) => pathText( h.paths[ 0 ] ) ) );
		const groups = [ ...new Set( reads.flatMap( ( o ) => Object.entries( facts.groups || {} ).filter( ( [ , g ] ) => o.path.some( ( s ) => wordHit( s, g.words ) ) ).map( ( [ k ] ) => k ) ) ) ];
		const b = { el: e.key, test, reads: paths, shown };
		// A guard reads only what its content binds, and the parts of the order above it (`o.gift && o.gift.to`), and its content
		// is nothing but the elements showing those values, so nothing of it shows once the value prints nothing.
		const guards = ( p ) => [ ...bound ].some( ( b ) => b === p || b.startsWith( `${ p }.` ) );
		const inBranch = els.filter( ( x ) => 'sc-if' !== x.template?.tag && ( x.template?.membership?.scIf || [] ).some( ( s ) => s.key === e.key ) );
		const bare = inBranch.every( ( x ) => content.some( ( h ) => h.el === x.key && h.key ) );
		if ( shown && bound.size && bare && paths.every( guards ) ) {
			b.guard = true;
			notes.push( `the branch ${ e.key } ({{ ${ test } }}) only hides an order value its own content binds (${ paths.join( ', ' ) }): the binding prints nothing when the order has no such value, so it takes no Show-to rule` );
		} else if ( null === shown ) {
			b.problem = `the branch ${ e.key } ({{ ${ test } }}) reads the order with tests of both signs: no single Show-to rule fits it`;
		} else if ( 1 !== groups.length ) {
			b.problem = `the branch ${ e.key } ({{ ${ test } }}) tests the order's ${ paths.join( ', ' ) }, which ${ groups.length ? `fits several parts (${ groups.join( ', ' ) })` : 'no part of the order with a Show-to rule fits' }`;
		} else {
			const rule = facts.groups[ groups[ 0 ] ][ shown ? 'shown' : 'hidden' ];
			rule ? ( b.rule = rule, b.group = groups[ 0 ] ) : ( b.problem = `the branch ${ e.key } ({{ ${ test } }}) tests the order's ${ groups[ 0 ] }, which has no Show-to rule for ${ shown ? 'shown' : 'hidden' }` );
		}
		out.branches.push( b );
	}
	return out;
}

// The draft file of a component (a handoff folder's `<component>.dc.html`), loaded once per folder and file.
const DRAFTS = new Map();
export function draftOf( folder, component ) {
	const id = `${ folder }|${ component }`;
	DRAFTS.has( id ) || DRAFTS.set( id, loadDraft( folder, `${ component }.dc.html` ) );
	return DRAFTS.get( id );
}
