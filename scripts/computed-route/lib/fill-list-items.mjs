// The items of a list the draft draws inside one element (Spec 48 FR-48-82, the item-array part), for
// lib/fill-list-content.mjs to write into a block's list settings. Two shapes are read, both from the draft's own data:
//   - a loop: an `sc-for` inside the element. Its copies are read from the rendered surface inventory (the skeleton's
//     `<surface>.inventory.json`, the draft rendered on this surface's route, so a loop nested in another loop reads this
//     page's copies only); each copy's fields are the loop variable's paths its elements print (the fact record's template
//     holes), the value being the element's rendered words.
//   - a current-item display: the element prints `x.field` where `x` is no loop variable and resolves (through the draft's
//     logic, lib/intake-ast-eval.mjs) to an element of an array picked by an index the code moves (a testimonial slider
//     showing `items[i]`). The draft renders one copy, so every item is read from the logic: each element of that array,
//     each field read as one static string.
// A field is named by its path after the loop variable (`ms.year` gives `year`); a field held by an <img> or an image
// placeholder (`id`, `src` or `data-src`) is an image field. A hole in an element's style, an event, a placeholder text or
// a list binding is no field, except a whole-value hole in `background`, `background-color` or `color` (`background:{{ st.bg }}`):
// that is an item's own colour (a style field, `style` naming the property), its value the colour the copy's element paints. Returns { items: [{ field: value }], fields: [{ name, image }], source, reason, current }, `current` true
// for a current-item display (the draft shows one item at a time).
import { templateKeyOf } from './fact-key.mjs';
import { classMethod, isFn } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, returnsOf, oneString } from './intake-ast-eval.mjs';

// The template holes that print an item's content: its words, its address, and an image's source.
const CONTENT_WHERE = /^(?:text|attr:(?:href|src|data-src|alt|id|aria-label))$/;
const IMAGE_TAGS = new Set( [ 'img', 'image-slot' ] );

// The item field one template hole prints, or null: { head, name, image } for a content hole whose path has a head and a field.
// An `aria-label` hole is a field only for an element with no words of its own (`labelled`: a tile that is a link or button
// naming itself by its label): beside words it repeats them.
export function holeField( hole, tag, labelled = false ) {
	if ( ! CONTENT_WHERE.test( hole?.where || '' ) || 'string' !== typeof hole.path || ( 'attr:aria-label' === hole.where && ! labelled ) ) {
		return null;
	}
	const image = IMAGE_TAGS.has( tag ) && /^attr:(?:id|src|data-src)$/.test( hole.where );
	if ( 'attr:id' === hole.where && ! image ) {
		return null;
	}
	const parts = hole.path.split( '.' );
	if ( parts.length < 2 || parts.some( ( p ) => ! /^[A-Za-z_$][\w$]*$/.test( p ) ) ) {
		return null;
	}
	return { head: parts[ 0 ], name: parts.slice( 1 ).join( '.' ), image, text: 'text' === hole.where, attr: /^attr:(.+)$/.exec( hole.where )?.[ 1 ] ?? null };
}

// The item colour one template hole sets, or null: { head, name, image: false, text: false, attr: null, style } for a hole that
// is the whole value of an element's `background`, `background-color` or `color` and whose path has a head and a field (the
// loop variable's own value: `background:{{ st.bg }}`). A hole inside a longer value (a gradient's stop, a shadow) names no colour
// of its own, and a path with no head (`R.stSize`: the template's root data) is no item's.
const STYLE_COLOUR = /^style:(background|background-color|color)$/;
export function holeStyleField( hole ) {
	const prop = STYLE_COLOUR.exec( hole?.where || '' )?.[ 1 ];
	const parts = 'string' === typeof hole?.path ? hole.path.split( '.' ) : [];
	if ( ! prop || true !== hole.whole || parts.length < 2 || parts.some( ( p ) => ! /^[A-Za-z_$][\w$]*$/.test( p ) ) ) {
		return null;
	}
	return { head: parts[ 0 ], name: parts.slice( 1 ).join( '.' ), image: false, text: false, attr: null, style: prop };
}

// The value an inline style text gives a property ( `background: rgb(216, 202, 80); color: …` ), or null. `background` also reads
// a `background-color` declaration, the longhand a browser writes back for a flat colour in some engines.
export function styleValue( style, prop ) {
	const names = 'background' === prop ? [ 'background', 'background-color' ] : [ prop ];
	for ( const name of names ) {
		const m = new RegExp( `(?:^|;)\\s*${ name }\\s*:\\s*([^;]+)` ).exec( String( style ?? '' ) );
		if ( m ) {
			return m[ 1 ].trim();
		}
	}
	return null;
}

// The fact record's template element for an inventory instance key.
const factOf = ( facts, key, rootComponent ) => facts?.elements?.[ templateKeyOf( key, rootComponent ) ]?.template ?? null;

// The inventory elements under (and including) `rootKey`, by key, in inventory order.
function subtreeOf( inventory, rootKey ) {
	const els = inventory?.elements || [];
	const byKey = new Map( els.map( ( e ) => [ e.key, e ] ) );
	const under = ( e ) => {
		for ( let x = e; x; x = byKey.get( x.parentKey ) ) {
			if ( x.key === rootKey ) {
				return true;
			}
		}
		return false;
	};
	return { root: byKey.get( rootKey ) ?? null, els: els.filter( under ), byKey };
}

const loopsOf = ( e ) => ( e?.membership || [] ).filter( ( m ) => 'sc-for' === m.kind );

// A loop the draft's code repeats so a scrolling strip has no gap draws its list twice: when the second half of the copies repeats
// the first half and every item holds something (a word, an address), the list is the first half. Items holding nothing (pictures
// whose address the inventory does not keep) cannot be told apart, so they are never folded.
export function readOnce( items ) {
	const half = items.length / 2;
	const held = ( it ) => Object.values( it ).some( ( v ) => null !== v && undefined !== v && '' !== v );
	return items.length >= 4 && items.every( held ) && items.slice( 0, half ).every( ( it, i ) => JSON.stringify( it ) === JSON.stringify( items[ half + i ] ) ) ? items.slice( 0, half ) : items;
}

// The outermost loop inside the element `rootKey` whose copies print fields of its own variable, with its copies (a copy is a
// loop member whose parent is outside the loop) and the inventory elements within one copy: { loop, copies, within( copy ), byKey,
// facts: ( element ) => the template's field holes of that variable }, or null when the element holds no such loop.
function loopOf( { inventory, facts, rootKey, rootComponent = null } ) {
	const { root, els, byKey } = subtreeOf( inventory, rootKey );
	if ( ! root ) {
		return null;
	}
	const outer = new Set( loopsOf( root ).map( ( m ) => String( m.tpl ) ) );
	// Each loop inside the element with the fields its member elements print of its own variable.
	const loops = new Map();
	for ( const e of els ) {
		const t = factOf( facts, e.key, rootComponent );
		for ( const h of t?.holes || [] ) {
			const f = holeField( h, t.realTag || t.tag, ! String( e.words ?? '' ).trim() );
			const loop = f && loopsOf( e ).find( ( m ) => m.as === f.head && ! outer.has( String( m.tpl ) ) );
			if ( loop ) {
				const l = loops.get( String( loop.tpl ) ) ?? { tpl: String( loop.tpl ), as: loop.as, depth: loopsOf( e ).indexOf( loop ) };
				loops.set( l.tpl, l );
			}
		}
	}
	const loop = [ ...loops.values() ].sort( ( a, b ) => a.depth - b.depth )[ 0 ];
	if ( ! loop ) {
		return null;
	}
	const inLoop = ( e ) => !! e && loopsOf( e ).some( ( m ) => String( m.tpl ) === loop.tpl );
	const copies = els.filter( ( e ) => inLoop( e ) && ! inLoop( byKey.get( e.parentKey ) ) );
	const within = ( copy ) => els.filter( ( e ) => {
		for ( let x = e; x; x = byKey.get( x.parentKey ) ) {
			if ( x === copy ) {
				return true;
			}
		}
		return false;
	} );
	const holes = ( e ) => {
		const t = factOf( facts, e.key, rootComponent );
		return ( t?.holes || [] ).map( ( h ) => holeField( h, t.realTag || t.tag, ! String( e.words ?? '' ).trim() ) ).filter( ( f ) => f && f.head === loop.as );
	};
	const styleHoles = ( e ) => ( factOf( facts, e.key, rootComponent )?.holes || [] ).map( holeStyleField ).filter( ( f ) => f && f.head === loop.as );
	return { loop, copies, within, holes, styleHoles, byKey };
}

// The draft element of the loop's first copy that prints each item field by itself: { [field]: inventory element }, a field
// printed by one element only (an element printing two fields shows them run together, so neither is its own element). Empty
// when the element holds no loop. A block's draftSlots at an item part (a timeline's year ring) are read from these elements.
export function loopFieldElements( o ) {
	const l = loopOf( o );
	const first = l?.copies[ 0 ];
	if ( ! first ) {
		return {};
	}
	const out = {};
	for ( const e of l.within( first ) ) {
		const own = l.holes( e ).filter( ( f ) => f.text && ! f.image );
		own.length === 1 && ( out[ own[ 0 ].name ] = e );
	}
	return out;
}

// The draft element that lays out the loop's copies (the parent of the first copy): the element whose gap, tracks and wrapping
// arrange the entries. null when the element holds no loop. A block's draftSlots at its list part are read from this element.
export function loopContainer( o ) {
	const l = loopOf( o );
	const first = l?.copies[ 0 ];
	return first ? l.byKey.get( first.parentKey ) ?? null : null;
}

// The loop items the rendered inventory shows inside `rootKey`: the outermost loop inside the element whose copies print
// fields of its own variable. null when the element holds no such loop.
export function loopItems( o ) {
	const l = loopOf( o );
	if ( ! l ) {
		return null;
	}
	const { loop, copies, within } = l;
	const fields = new Map();
	const items = copies.map( ( copy ) => {
		const item = {};
		for ( const e of within( copy ) ) {
			const own = l.holes( e );
			const texts = own.filter( ( f ) => f.text );
			for ( const f of own ) {
				fields.set( f.name, { name: f.name, image: f.image } );
				if ( f.image ) {
					// The rendered inventory keeps no image address: the item names its field, its value unread.
					item[ f.name ] ??= null;
				} else if ( f.text ) {
					// An element printing two fields shows them run together: neither value is the element's words.
					item[ f.name ] = 1 === texts.length ? String( e.words ?? '' ).replace( /\s+/g, ' ' ).trim() : null;
				} else {
					item[ f.name ] = e.attrs?.[ f.attr ] ?? null;
				}
			}
			// An item's own colour: the colour the copy's element paints, read from the style the rendered copy carries.
			for ( const f of l.styleHoles( e ) ) {
				fields.set( f.name, { name: f.name, image: false, style: f.style } );
				item[ f.name ] ??= styleValue( e.attrs?.style, f.style );
			}
		}
		return item;
	} );
	const once = readOnce( items );
	return { items: once, fields: [ ...fields.values() ], source: `loop ${ loop.as } (sc-for ${ loop.tpl }), ${ items.length } rendered copies${ once.length < items.length ? `, a loop doubled for a scroll read once (${ once.length } items)` : '' }`, reason: null };
}

// What the draft's renderVals returns (the template's root data), for a parsed logic index.
export function rootData( idx ) {
	return rootDataByReturn( idx ).flat();
}

// The same refs, one list per return statement of renderVals, in source order (a return's own list holds what its one expression resolves to).
export function rootDataByReturn( idx ) {
	const m = idx && classMethod( idx, 'renderVals' );
	const fn = m && ( isFn( m ) ? m : m.value );
	return fn ? returnsOf( idx, fn ).map( ( e ) => resolveRefs( idx, ref( e ) ) ) : [];
}

// The items of a current-item display inside `rootKey`: the template elements under it (the fact record's parent chain)
// printing `head.field` where `head` is no loop variable, and `head` resolves through the logic to two or more objects (an
// array element picked by an index the code moves). null when the element holds none; a reason when it holds several.
export function currentItems( { facts, rootKey, rootComponent = null, idx } ) {
	const rootTpl = templateKeyOf( rootKey, rootComponent );
	const els = Object.values( facts?.elements || {} ).map( ( e ) => e.template ).filter( ( t ) => t && ( t.parentChain || [] ).includes( rootTpl ) );
	const heads = new Map();
	for ( const t of els ) {
		const loopVars = new Set( ( t.membership?.scFor || [] ).map( ( m ) => m.as ) );
		for ( const h of t.holes || [] ) {
			const f = holeField( h, t.realTag || t.tag );
			if ( f && ! loopVars.has( f.head ) ) {
				const list = heads.get( f.head ) ?? new Map();
				list.set( f.name, { name: f.name, image: f.image } );
				heads.set( f.head, list );
			}
		}
	}
	if ( ! heads.size || ! idx ) {
		return heads.size ? { items: [], fields: [], source: null, reason: 'the draft\'s logic is not read (no draft folder), so the items behind its current-item display are unknown' } : null;
	}
	const roots = rootData( idx );
	const lists = [ ...heads ].map( ( [ head, fields ] ) => ( { head, fields: [ ...fields.values() ], els: propRefs( idx, roots, head ).filter( ( r ) => 'ObjectExpression' === r.node?.type ) } ) )
		.filter( ( l ) => new Set( l.els.map( ( r ) => r.node ) ).size >= 2 );
	if ( ! lists.length ) {
		return null;
	}
	if ( lists.length > 1 ) {
		return { items: [], fields: [], source: null, reason: `the element shows ${ lists.length } current-item displays (${ lists.map( ( l ) => l.head ).join( ', ' ) }), so which list the block holds is not decided` };
	}
	const [ list ] = lists;
	const value = ( el, name ) => {
		const refs = name.split( '.' ).reduce( ( acc, k ) => propRefs( idx, acc, k ), [ el ] );
		return refs.map( ( r ) => oneString( idx, r.node, r.env ) ).find( ( v ) => null !== v ) ?? null;
	};
	const items = list.els.map( ( el ) => Object.fromEntries( list.fields.map( ( f ) => [ f.name, value( el, f.name ) ] ) ) );
	return { items, fields: list.fields, source: `current item ${ list.head } of a ${ items.length }-item list in the draft's logic`, reason: null, current: true };
}

// The draft elements of a current-item display inside `rootKey` (the one visible copy of an item the code picks by an index):
// { head, fields: [ { name, image, element } ], card }, where `element` is the inventory element printing the field (the first
// to print it) and `card` is the element that holds every one of them, the lowest ancestor they share below `rootKey`: the
// one card the draft shows. null when the element holds no such display, holds several (two different heads), or its fields
// share no ancestor but the element itself (nothing to call a card). Fields are the words and the pictures the item prints.
export function currentFieldElements( { inventory, facts, rootKey, rootComponent = null } ) {
	const { root, els, byKey } = subtreeOf( inventory, rootKey );
	if ( ! root ) {
		return null;
	}
	const heads = new Map();
	for ( const e of els ) {
		const t = factOf( facts, e.key, rootComponent );
		const loopVars = new Set( [ ...( t?.membership?.scFor || [] ), ...loopsOf( e ) ].map( ( m ) => m.as ) );
		for ( const h of t?.holes || [] ) {
			const f = holeField( h, t.realTag || t.tag, ! String( e.words ?? '' ).trim() );
			if ( f && ! loopVars.has( f.head ) && ( f.text || f.image ) ) {
				const list = heads.get( f.head ) ?? new Map();
				list.has( f.name ) || list.set( f.name, { name: f.name, image: f.image, element: e } );
				heads.set( f.head, list );
			}
		}
	}
	if ( 1 !== heads.size ) {
		return null;
	}
	const [ [ head, list ] ] = [ ...heads ];
	const fields = [ ...list.values() ];
	const upFrom = ( e ) => {
		const path = [];
		for ( let x = e; x; x = byKey.get( x.parentKey ) ) {
			path.push( x );
			if ( x === root ) {
				break;
			}
		}
		return path;
	};
	const paths = fields.map( ( f ) => upFrom( f.element ) );
	const card = paths[ 0 ]?.find( ( x ) => paths.every( ( p ) => p.includes( x ) ) ) ?? null;
	return fields.length >= 2 && card && card !== root ? { head, fields, card } : null;
}

// The list one element draws: its loop when the rendered inventory shows one, else its current-item display. idx: the
// parsed logic of the element's draft file (null when the draft folder is not given).
export function listItems( { inventory, facts, rootKey, rootComponent = null, idx = null } ) {
	return loopItems( { inventory, facts, rootKey, rootComponent } ) ?? currentItems( { facts, rootKey, rootComponent, idx } );
}
