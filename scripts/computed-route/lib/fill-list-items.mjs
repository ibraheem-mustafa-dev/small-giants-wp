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
// a list binding is no field. Returns { items: [{ field: value }], fields: [{ name, image }], source, reason }.
import { templateKeyOf } from './fact-key.mjs';
import { classMethod, isFn } from './intake-ast.mjs';
import { ref, resolveRefs, propRefs, returnsOf, oneString } from './intake-ast-eval.mjs';

// The template holes that print an item's content: its words, its address, and an image's source.
const CONTENT_WHERE = /^(?:text|attr:(?:href|src|data-src|alt|id))$/;
const IMAGE_TAGS = new Set( [ 'img', 'image-slot' ] );

// The item field one template hole prints, or null: { head, name, image } for a content hole whose path has a head and a field.
export function holeField( hole, tag ) {
	if ( ! CONTENT_WHERE.test( hole?.where || '' ) || 'string' !== typeof hole.path ) {
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

// The loop items the rendered inventory shows inside `rootKey`: the outermost loop inside the element whose copies print
// fields of its own variable. null when the element holds no such loop.
export function loopItems( { inventory, facts, rootKey, rootComponent = null } ) {
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
			const f = holeField( h, t.realTag || t.tag );
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
	// A copy is a loop member whose parent is outside the loop; its fields are read from the copy and its descendants.
	const copies = els.filter( ( e ) => inLoop( e ) && ! inLoop( byKey.get( e.parentKey ) ) );
	const fields = new Map();
	const items = copies.map( ( copy ) => {
		const item = {};
		const within = els.filter( ( e ) => {
			for ( let x = e; x; x = byKey.get( x.parentKey ) ) {
				if ( x === copy ) {
					return true;
				}
			}
			return false;
		} );
		for ( const e of within ) {
			const t = factOf( facts, e.key, rootComponent );
			const own = ( t?.holes || [] ).map( ( h ) => holeField( h, t.realTag || t.tag ) ).filter( ( f ) => f && f.head === loop.as );
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
		}
		return item;
	} );
	return { items, fields: [ ...fields.values() ], source: `loop ${ loop.as } (sc-for ${ loop.tpl }), ${ items.length } rendered copies`, reason: null };
}

// What the draft's renderVals returns (the template's root data), for a parsed logic index.
export function rootData( idx ) {
	const m = idx && classMethod( idx, 'renderVals' );
	const fn = m && ( isFn( m ) ? m : m.value );
	return fn ? returnsOf( idx, fn ).flatMap( ( e ) => resolveRefs( idx, ref( e ) ) ) : [];
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
	return { items, fields: list.fields, source: `current item ${ list.head } of a ${ items.length }-item list in the draft's logic`, reason: null };
}

// The list one element draws: its loop when the rendered inventory shows one, else its current-item display. idx: the
// parsed logic of the element's draft file (null when the draft folder is not given).
export function listItems( { inventory, facts, rootKey, rootComponent = null, idx = null } ) {
	return loopItems( { inventory, facts, rootKey, rootComponent } ) ?? currentItems( { facts, rootKey, rootComponent, idx } );
}
