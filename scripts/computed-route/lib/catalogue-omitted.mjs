// A choice the draft's product page offers but its basket line forgets (Spec 48 FR-48-92; Bean's ruling 2026-11-21: the
// cloner infers it and records the omission as a draft defect; the draft and the Claude Design instructions stay as they
// are). lib/catalogue-options.mjs reads a choice from the basket line's state keys; this reads the keys the line does
// not read. A state key is an omitted choice when
//   - a `setState` writes it inside a `.map` callback and what it writes is the callback's index (`pick: () =>
//     this.setState( { curSwatch: i } )`) or its element, so the key selects one element of the mapped list;
//   - the mapped list is a field read off a product (`( cur.cols || [] ).map( … )`, `cur` reached from the record list
//     by `find`, `filter`, an index or a `.map` over it), so the picker offers options each product record holds, never a
//     fixed list (a view picker over `[ 'Front', 'Side' ]`) or a list of another object;
//   - that field is the record's own list of objects each with a `name`, or a list the code builds from the record
//     (`cols: keys.map( ( k, i ) => ( { name: C.COLS[ k ][ 0 ], hex: … } ) )` inside the function that decorates a record,
//     `keys` coming from `p.cols`), evaluated for each record: every element gives one option, its value and label the
//     element's `name`, its swatch the element's `#rgb` field. A list whose elements carry no name (a thumbnail picker
//     over images) is no choice;
//   - no basket line reads the key (a key the line reads keeps lib/catalogue-options.mjs's path).
// The axis is labelled by the picker's visible heading (the last plain text before the `<sc-for>` that draws the list:
// `Colour`), else by the list's binding name, as a basket-line choice is. Each product whose record yields two or more
// options gets the axis, last after the line's own choices; one gap row of kind `draft-omission` per key names the draft
// file, the state key, the list and what the line leaves out (lib/draft-defects.mjs lists it with the draft's other defects).
import { isFn, keyName, resolveName } from './intake-ast.mjs';
import { returnsOf } from './intake-ast-eval.mjs';
import { UNREAD, arraysOf, valueOf } from './catalogue-source.mjs';
import { bindingName, initialOf, lineKeys, written } from './catalogue-options.mjs';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const PICK = new Set( [ 'find', 'findLast', 'filter', 'at', 'slice' ] );
const callee = ( c ) => ( 'MemberExpression' === c?.callee?.type && ! c.callee.computed ? c.callee.property.name : null );
const parentOf = ( src, n ) => src.idx.parent.get( n );
const inside = ( src, node ) => src.idx.all.filter( ( n ) => n.start >= node.start && n.end <= node.end );

// Whether `node` is a product record or the record list: the list's array literal is among what it follows to, or it is
// a variable, a lookup (`products.find( … )`, `products[ 0 ]`, `a || b`) or a callback parameter over such a list.
function onRecords( ctx, src, node, list, depth = 0 ) {
	if ( ! node || depth > 8 ) {
		return false;
	}
	if ( arraysOf( ctx, src, node ).some( ( a ) => a.node === list.array.node ) ) {
		return true;
	}
	const next = ( n ) => onRecords( ctx, src, n, list, depth + 1 );
	switch ( node.type ) {
		case 'Identifier': {
			const r = resolveName( src.idx, node );
			if ( 'var' === r?.kind && r.init && ! r.key ) {
				return next( r.init );
			}
			const call = 'param' === r?.kind && ! r.key ? parentOf( src, r.fn ) : null;
			return 'CallExpression' === call?.type && call.arguments[ 0 ] === r.fn && !! callee( call ) && next( call.callee.object );
		}
		case 'LogicalExpression':
			return next( node.left ) || next( node.right );
		case 'ConditionalExpression':
			return next( node.consequent ) || next( node.alternate );
		case 'MemberExpression':
			return node.computed && next( node.object );
		case 'CallExpression':
			return PICK.has( callee( node ) ) && next( node.callee.object );
		default:
			return false;
	}
}

// The product fields a mapped list is read from: [{ object, field }] (`( cur.cols || [] )` gives { cur, 'cols' }), through
// a variable, either side of `||`, `??` and a conditional, and the calls that keep a list a list.
function fieldReads( ctx, src, node, depth = 0 ) {
	if ( ! node || depth > 6 ) {
		return [];
	}
	const go = ( n ) => fieldReads( ctx, src, n, depth + 1 );
	switch ( node.type ) {
		case 'MemberExpression':
			return node.computed ? [] : [ { object: node.object, field: node.property.name } ];
		case 'LogicalExpression':
			return [ ...go( node.left ), ...go( node.right ) ];
		case 'ConditionalExpression':
			return [ ...go( node.consequent ), ...go( node.alternate ) ];
		case 'CallExpression':
			return /^(slice|filter|concat|sort|reverse|toSorted|toReversed)$/.test( callee( node ) || '' ) ? go( node.callee.object ) : [];
		case 'Identifier': {
			const r = resolveName( src.idx, node );
			return 'var' === r?.kind && r.init && ! r.key ? go( r.init ) : [];
		}
		default:
			return [];
	}
}

// Whether `node` reads the parameter `fn` is declared with (directly or through a variable it reads).
function readsParam( src, node, fn, seen = new Set() ) {
	for ( const n of inside( src, node ).filter( ( x ) => 'Identifier' === x.type ) ) {
		const r = resolveName( src.idx, n );
		if ( 'param' === r?.kind && r.fn === fn && 0 === r.index ) {
			return true;
		}
		if ( 'var' === r?.kind && r.init && ! r.key && ! seen.has( r.init ) && readsParam( src, r.init, fn, new Set( seen ).add( r.init ) ) ) {
			return true;
		}
	}
	return false;
}

// The enclosing function of a node.
function fnOf( src, node ) {
	for ( let up = parentOf( src, node ); up; up = parentOf( src, up ) ) {
		if ( isFn( up ) ) {
			return up;
		}
	}
	return null;
}

// The object literal a callback hands back, or null.
function returned( src, cb ) {
	const r = returnsOf( src.idx, cb );
	return 1 === r.length && 'ObjectExpression' === r[ 0 ].type ? r[ 0 ] : null;
}

// One option of an element: { value, label, swatch, price, badge } from the element's `name` and `#rgb` field, or null.
const optionOfFields = ( name, fields ) => ( 'string' === typeof name && name ? {
	value: name, label: name, price: null, badge: null,
	swatch: Object.values( fields ).find( ( v ) => 'string' === typeof v && HEX.test( v ) ) || null,
} : null );

// The options a product record's own list of named objects holds, or null when the field is no such list.
function rawOptions( record, field ) {
	const els = record[ field ];
	if ( ! Array.isArray( els ) || els.length < 2 || ! els.every( ( e ) => e && 'object' === typeof e && ! Array.isArray( e ) ) ) {
		return null;
	}
	const out = els.map( ( e ) => optionOfFields( e.name, e ) );
	return out.every( Boolean ) ? out : null;
}

// The producers of a derived list: `field: X.map( cb )` where X reads the parameter of the function holding it and `cb`
// hands back an object literal with a `name`. [{ src, fn, listNode, cb, ret }]
function derivedProducers( ctx, field ) {
	const out = [];
	for ( const src of ctx.sources ) {
		for ( const n of src.idx.all ) {
			if ( 'ObjectProperty' !== n.type || n.computed || keyName( n ) !== field || 'CallExpression' !== n.value.type || 'map' !== callee( n.value ) || ! isFn( n.value.arguments[ 0 ] ) ) {
				continue;
			}
			const fn = fnOf( src, n );
			const ret = returned( src, n.value.arguments[ 0 ] );
			if ( fn && 'Identifier' === fn.params[ 0 ]?.type && ret && ret.properties.some( ( p ) => 'ObjectProperty' === p.type && 'name' === keyName( p ) ) && readsParam( src, n.value.callee.object, fn ) ) {
				out.push( { src, fn, listNode: n.value.callee.object, cb: n.value.arguments[ 0 ], ret } );
			}
		}
	}
	return out;
}

// The options a derived list gives one record, or null.
function derivedOptions( ctx, p, record ) {
	const els = valueOf( ctx, p.src, p.listNode, new Map( [ [ p.fn, [ record ] ] ] ) );
	if ( UNREAD === els || ! Array.isArray( els ) || els.length < 2 ) {
		return null;
	}
	const out = els.map( ( el, i ) => {
		const bind = new Map( [ [ p.fn, [ record ] ], [ p.cb, [ el, i ] ] ] );
		const fields = {};
		for ( const prop of p.ret.properties ) {
			if ( 'ObjectProperty' === prop.type && null != keyName( prop ) && ! isFn( prop.value ) ) {
				const v = valueOf( ctx, p.src, prop.value, bind );
				UNREAD !== v && ( fields[ keyName( prop ) ] = v );
			}
		}
		return optionOfFields( fields.name, fields );
	} );
	return out.every( Boolean ) ? out : null;
}

// The words shown just above a picker: the last plain text (no binding, at most three words) before the `<sc-for>` that
// draws the list kept under `binding`, after the previous `</sc-for>` (another picker's heading is never taken) and within
// 600 characters, in the draft whose template holds it; null when none.
function headingOf( src, binding ) {
	if ( ! binding || ! src.text || ! src.draft?.cut ) {
		return null;
	}
	const t = src.text.slice( src.draft.cut.templateStart, src.draft.cut.templateEnd );
	const at = new RegExp( `<sc-for\\b[^>]*\\blist="\\{\\{\\s*${ binding }\\s*\\}\\}"` ).exec( t );
	if ( ! at ) {
		return null;
	}
	const earlier = t.slice( 0, at.index );
	const before = earlier.slice( Math.max( earlier.lastIndexOf( '</sc-for>' ) + 9, at.index - 600 ) );
	const texts = [ ...before.matchAll( />([^<>{}]+)</g ) ].map( ( m ) => m[ 1 ].replace( /\s+/g, ' ' ).trim() ).filter( Boolean );
	const last = texts[ texts.length - 1 ];
	return last && last.split( ' ' ).length <= 3 ? last.charAt( 0 ).toUpperCase() + last.slice( 1 ) : null;
}

// The choices the basket lines of `list` leave out: [{ key, file, field, binding, label, name, optionsFor( record ) }].
// `file` is the draft of the page map's product row; its pickers come first.
export function omittedChoices( ctx, lines, list, file = null ) {
	const read = new Set( lines.flatMap( ( l ) => lineKeys( ctx, l ).map( ( k ) => k.key ) ) );
	const found = new Map();
	for ( const src of [ ...ctx.sources.filter( ( s ) => s.file === file ), ...ctx.sources.filter( ( s ) => s.file !== file ) ] ) {
		for ( const call of src.idx.all.filter( ( n ) => 'CallExpression' === n.type && 'setState' === callee( n ) ) ) {
			const obj = written( call );
			for ( const prop of 'ObjectExpression' === obj?.type ? obj.properties : [] ) {
				const key = 'ObjectProperty' === prop.type && ! prop.computed ? keyName( prop ) : null;
				if ( ! key || read.has( key ) || 'Identifier' !== prop.value.type ) {
					continue;
				}
				const r = resolveName( src.idx, prop.value );
				const cb = 'param' === r?.kind && ! r.key ? r.fn : null;
				const map = cb ? parentOf( src, cb ) : null;
				if ( ! cb || 'CallExpression' !== map?.type || 'map' !== callee( map ) || map.arguments[ 0 ] !== cb || r.index > 1 ) {
					continue;
				}
				for ( const { object, field } of fieldReads( ctx, src, map.callee.object ) ) {
					if ( ! onRecords( ctx, src, object, list ) ) {
						continue;
					}
					const binding = bindingName( src, map );
					const heading = headingOf( src, binding );
					const entry = found.get( key ) || { key, file: src.file, field, binding, name: heading, label: heading, src, candidates: [] };
					entry.candidates.push( { field } );
					found.set( key, entry );
				}
			}
		}
	}
	return [ ...found.values() ].map( ( e ) => ( {
		...e,
		// The choice one record gives: the options of the first candidate field that yields two or more, or null.
		optionsFor( record ) {
			for ( const { field } of e.candidates ) {
				const raw = rawOptions( record, field );
				const options = raw || derivedProducers( ctx, field ).map( ( p ) => derivedOptions( ctx, p, record ) ).find( Boolean ) || null;
				const unique = ( options || [] ).filter( ( o, i, all ) => all.findIndex( ( x ) => x.value === o.value ) === i );
				if ( unique.length >= 2 ) {
					const first = initialOf( ctx, e.src, e.key );
					const at = 'number' === typeof first ? unique[ first ] : unique.find( ( o ) => o.value === first );
					return { key: e.key, kind: 'choice', options: unique, name: e.name || e.binding, label: e.label, gatedBy: null, first: ( at || unique[ 0 ] ).value, inferred: true };
				}
			}
			return null;
		},
	} ) );
}
