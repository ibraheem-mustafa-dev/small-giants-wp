// The product card's per-product words a draft holds in its product records (Spec 48 FR-48-92, MERGED F-34): the badge on
// the card's picture, the note beside its price, the button's words and what the button does. The product card reads them
// from each product's own meta when its `cardContentSource` is `product` (plugins/sgs-blocks/includes/product-card-per-product.php:
// `_sgs_card_badge`, `_sgs_card_price_note`, `_sgs_card_cta_label`, `_sgs_card_cta_action` add | page), so the catalogue step
// writes them. Found by structure in the draft's templates and logic, never by a field's or a client's name:
//   - a text hole of a template element that reads one record field (`{{ p.badge }}` in a loop over the records, or
//     `{{ badge }}` whose logic value is `p.badge` of the record the component is handed), the name standing for a record
//     (its loop also shows `p.name`, or the logic reads its `name`: drawsRecords);
//   - badge: the element is absolutely placed inside a link (the card's picture);
//   - note: the element follows, in the same row, an element whose hole reads the record's price (or a field stating it as money);
//   - label: the element is, or is inside, a button; its words are the hole's value for each record with the card at rest
//     (no state flag set, no size variant: `this.state.*` and `this.props.*` other than the record read as unset), so a
//     record the logic gives its own words (`p.id === 'zookies' ? 'Build your box' : p.cta`) gets them;
//   - action: that button's click handler opens a page when a test on the record holds (it assigns location.href and
//     returns) and appends to the basket otherwise (lib/shop-parts-logic.mjs::effectOf): `page` or `add` per record.
// A field read for two roles, or a role two fields fill, is no fact. Pure: the catalogue sources and one record list in.
import { resolveName } from './intake-ast.mjs';
import { effectOf, valuesOf } from './shop-parts-logic.mjs';
import { parseTemplate } from './shop-parts-read.mjs';

const UNSET = Symbol( 'unset' );
const HOLE = /^\s*\{\{\s*([\w$.]+)\s*\}\}\s*$/;
const MONEY = /[£$€¥₹]\s?\d/;

const elementsOf = ( n ) => ( n.children || [] ).filter( ( c ) => c.tag ).flatMap( ( c ) => [ c, ...elementsOf( c ) ] );
const ancestors = ( n ) => {
	const out = [];
	for ( let p = n.parent; p; p = p.parent ) {
		out.push( p );
	}
	return out;
};
const ownHole = ( el ) => {
	const texts = ( el.children || [] ).filter( ( c ) => ! c.tag );
	const kids = ( el.children || [] ).filter( ( c ) => c.tag );
	return 1 === texts.length && ! kids.length ? HOLE.exec( texts[ 0 ].text )?.[ 1 ] ?? null : null;
};
const absolute = ( el ) => /position\s*:\s*absolute/i.test( el.attrs?.style || '' );
const stripHole = ( v ) => String( v || '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();

// What a hole reads of a record: { value (the hole's logic value node, null for a loop alias's own field), direct (the record
// field the value is, or null), inner (the record fields of `keys` read anywhere inside the value), rec (the record's name) }, or
// null. `all`: every record field; `keys`: the fields a card fact may be.
function readOfHole( idx, hole, all, keys ) {
	const parts = hole.split( '.' );
	if ( 2 === parts.length && all.has( parts[ 1 ] ) ) {
		return { value: null, direct: parts[ 1 ], inner: keys.has( parts[ 1 ] ) ? [ parts[ 1 ] ] : [], rec: parts[ 0 ] };
	}
	if ( 1 !== parts.length || ! idx ) {
		return null;
	}
	const values = valuesOf( idx, hole );
	if ( 1 !== values.length ) {
		return null;
	}
	const v = values[ 0 ];
	const member = ( n ) => 'MemberExpression' === n.type && ! n.computed && 'Identifier' === n.object.type && all.has( n.property.name );
	const inside = idx.all.filter( ( n ) => n.start >= v.start && n.end <= v.end && member( n ) );
	const recs = [ ...new Set( inside.map( ( n ) => n.object.name ) ) ];
	if ( 1 !== recs.length ) {
		return null;
	}
	return { value: v, direct: member( v ) ? v.property.name : null, inner: [ ...new Set( inside.map( ( n ) => n.property.name ).filter( ( f ) => keys.has( f ) ) ) ], rec: recs[ 0 ] };
}

// The value of an expression for one record with the card at rest: the record bound to `rec`, `this.*` unset, anything else
// unread (null). Returns the value or UNSET for unset, null for unread.
export function restValue( idx, node, rec, record, depth = 0 ) {
	if ( ! node || depth > 12 ) {
		return null;
	}
	const v = ( n ) => restValue( idx, n, rec, record, depth + 1 );
	const truthy = ( x ) => UNSET !== x && Boolean( x );
	switch ( node.type ) {
		case 'StringLiteral':
		case 'NumericLiteral':
		case 'BooleanLiteral':
			return node.value;
		case 'ThisExpression':
			return UNSET;
		case 'Identifier': {
			if ( node.name === rec ) {
				return record;
			}
			const r = resolveName( idx, node );
			return 'var' === r?.kind && r.init && ! r.key ? v( r.init ) : null;
		}
		case 'MemberExpression': {
			const obj = v( node.object );
			if ( UNSET === obj ) {
				return UNSET;
			}
			const key = node.computed ? v( node.property ) : node.property.name;
			return obj && 'object' === typeof obj && null != key && UNSET !== key ? ( Object.prototype.hasOwnProperty.call( obj, key ) ? obj[ key ] : UNSET ) : null;
		}
		case 'UnaryExpression': {
			const a = v( node.argument );
			return '!' === node.operator && null !== a ? ! truthy( a ) : null;
		}
		case 'BinaryExpression': {
			const [ a, b ] = [ v( node.left ), v( node.right ) ];
			if ( null === a || null === b ) {
				return null;
			}
			const [ x, y ] = [ UNSET === a ? undefined : a, UNSET === b ? undefined : b ];
			const ops = { '===': () => x === y, '!==': () => x !== y, '==': () => x === y, '!=': () => x !== y, '+': () => ( null == x || null == y ? null : x + y ) };
			return ops[ node.operator ] ? ops[ node.operator ]() : null;
		}
		case 'LogicalExpression': {
			const a = v( node.left );
			if ( null === a ) {
				return null;
			}
			if ( '&&' === node.operator ) {
				return truthy( a ) ? v( node.right ) : a;
			}
			return truthy( a ) ? a : v( node.right );
		}
		case 'ConditionalExpression': {
			const t = v( node.test );
			return null === t ? null : v( truthy( t ) ? node.consequent : node.alternate );
		}
		default:
			return null;
	}
}

// What a button's click handler does for one record: 'page', 'add' or null. `handler`: the handler's name.
function actionOf( idx, handler, rec, record ) {
	if ( ! idx || ! handler || ! effectOf( idx, handler ).appends ) {
		return null;
	}
	for ( const fn of valuesOf( idx, handler ) ) {
		const body = 'BlockStatement' === fn.body?.type ? fn.body.body : [];
		const iff = body.find( ( s ) => 'IfStatement' === s.type && ! s.alternate );
		const cons = iff ? ( 'BlockStatement' === iff.consequent.type ? iff.consequent.body : [ iff.consequent ] ) : [];
		const navigates = cons.some( ( s ) => 'ExpressionStatement' === s.type && 'AssignmentExpression' === s.expression.type && 'MemberExpression' === s.expression.left.type && 'href' === s.expression.left.property?.name && /location$/.test( s.expression.left.object?.name || s.expression.left.object?.property?.name || '' ) );
		if ( ! navigates || ! cons.some( ( s ) => 'ReturnStatement' === s.type ) ) {
			continue;
		}
		const t = restValue( idx, iff.test, rec, record );
		return null === t ? null : ( UNSET !== t && Boolean( t ) ? 'page' : 'add' );
	}
	return null;
}

// Whether the name a hole reads its field of stands for a product record: a loop alias whose loop also shows the alias's
// `name`, or a logic name whose `name` the logic reads (the component's product). A loop over other things (filter chips
// with a `label`) is not one.
function drawsRecords( src, el, read ) {
	if ( ! read.value ) {
		const loop = ancestors( el ).find( ( a ) => 'sc-for' === a.tag && a.attrs.as === read.rec );
		return Boolean( loop ) && elementsOf( loop ).some( ( e ) => `${ read.rec }.name` === ownHole( e ) );
	}
	return src.idx.all.some( ( n ) => 'MemberExpression' === n.type && ! n.computed && 'Identifier' === n.object.type && n.object.name === read.rec && 'name' === n.property.name );
}

// The card facts of one record list: { fields: { badge, note, label } (each the record field, or null), valuesOf( record ) =>
// { badge, note, label, action } (only the known ones), notes }. `list`: lib/catalogue-records.mjs::recordLists's entry;
// `taken`: the fields other roles hold (key, name, prices, image, description, brand, categories), never read as a card fact.
export function cardFacts( ctx, list, taken = [] ) {
	const keys = new Set( list.records.flatMap( ( r ) => Object.keys( r ) ).filter( ( k ) => ! taken.includes( k ) ) );
	const priceKeys = new Set( [ list.prices.price, ...[ ...keys ].filter( ( k ) => list.records.every( ( r ) => null == r[ k ] || ( 'string' === typeof r[ k ] && MONEY.test( r[ k ] ) ) ) && list.records.some( ( r ) => 'string' === typeof r[ k ] ) ) ].filter( Boolean ) );
	const allKeys = new Set( list.records.flatMap( ( r ) => Object.keys( r ) ) );
	const found = { badge: [], note: [], label: [] };
	for ( const src of ctx.sources.filter( ( s ) => s.text ) ) {
		const root = parseTemplate( src.text );
		for ( const el of elementsOf( root ).filter( ( e ) => null !== e.tpl ) ) {
			const hole = ownHole( el );
			const read = hole ? readOfHole( src.idx, hole, allKeys, keys ) : null;
			if ( ! read || ! drawsRecords( src, el, read ) ) {
				continue;
			}
			const up = ancestors( el );
			const button = 'button' === el.tag ? el : up.find( ( a ) => 'button' === a.tag );
			if ( button ) {
				1 === read.inner.length && found.label.push( { field: read.inner[ 0 ], ...read, src, el, button } );
				continue;
			}
			const field = read.direct;
			if ( ! field || ! keys.has( field ) || priceKeys.has( field ) ) {
				continue;
			}
			if ( absolute( el ) && up.some( ( a ) => 'a' === a.tag ) ) {
				found.badge.push( { field, ...read, src, el } );
				continue;
			}
			const sibs = ( el.parent.children || [] ).filter( ( c ) => c.tag );
			const prev = sibs[ sibs.indexOf( el ) - 1 ];
			const prevRead = prev && ownHole( prev ) ? readOfHole( src.idx, ownHole( prev ), allKeys, allKeys ) : null;
			if ( prevRead?.direct && priceKeys.has( prevRead.direct ) ) {
				found.note.push( { field, ...read, src, el } );
			}
		}
	}
	const notes = [];
	const one = ( role ) => {
		const fields = [ ...new Set( found[ role ].map( ( h ) => h.field ) ) ];
		fields.length > 1 && notes.push( `the card's ${ role } reads ${ fields.length } record fields (${ fields.join( ', ' ) }), so none is written` );
		return 1 === fields.length ? found[ role ].filter( ( h ) => h.field === fields[ 0 ] ) : [];
	};
	const badge = one( 'badge' );
	const note = one( 'note' );
	const label = one( 'label' );
	const fields = { badge: badge[ 0 ]?.field ?? null, note: note[ 0 ]?.field ?? null, label: label[ 0 ]?.field ?? null };
	if ( fields.badge && fields.badge === fields.note ) {
		notes.push( `the record field ${ fields.badge } is both the card's badge and its price note, so neither is written` );
		fields.badge = fields.note = null;
	}
	const text = ( x ) => ( 'string' === typeof x && x.trim() ? x.trim() : null );
	const factsOf = ( record ) => {
		const out = {};
		fields.badge && text( record[ fields.badge ] ) && ( out.badge = text( record[ fields.badge ] ) );
		fields.note && text( record[ fields.note ] ) && ( out.note = text( record[ fields.note ] ) );
		if ( fields.label ) {
			const words = label.map( ( h ) => ( h.value ? restValue( h.src.idx, h.value, h.rec, record ) : record[ h.field ] ) );
			const said = [ ...new Set( words.map( text ) ) ];
			1 === said.length && said[ 0 ] && ( out.label = said[ 0 ] );
			const acts = [ ...new Set( label.map( ( h ) => actionOf( h.src.idx, stripHole( h.button.attrs.onClick ), h.rec, record ) ) ) ];
			1 === acts.length && acts[ 0 ] && ( out.action = acts[ 0 ] );
		}
		return out;
	};
	return { fields, valuesOf: factsOf, notes };
}
