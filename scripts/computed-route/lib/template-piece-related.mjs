// Related products on the product template (F-54): a draft section listing other products ("You might also like", "More from
// Ray-Ban", "Similar shapes") becomes WooCommerce's Product Collection of `sgs/product-card`s fed by the catalogue, so its
// cards show each product's own photo, price and working Add to Basket for whichever product the page shows.
//
// Found from the draft's logic, never from the section's words. A loop of the surface's own markup (`sc-for`) is a related list
// when its list's value is the draft's product records filtered to leave the shown product out (`p.<id> !== cur.<id>`, the
// catalogue's id key) and cut to a count (`.slice( 0, N )`, or a choice of counts, the largest taken):
//   - a filter that also keeps records sharing one field with the shown product (`p.brand === cur.brand`) lists the products
//     sharing that term: `sgsSameTermAs` is the field's taxonomy (the catalogue's brand is `product_brand`, a facet field is its
//     attribute `pa_<slug>`, a category field `product_cat`; includes/product-collection-same-term.php); a field the catalogue
//     does not make a taxonomy is refused;
//   - a filter that keeps every other product is WooCommerce's own Related Products collection (it leaves the shown product out).
// The loop's holder (the element holding its copies) is replaced by the collection, `perPage` the count and `columns` the copies
// the draft draws side by side at 1440; the card is `sgs/product-card` in `wc-product` mode read at the loop's first copy. A loop
// whose holder holds anything else, whose nodes do not sit in one list, or whose list reads anything else stays as drawn, with
// the reason.
import { countBlocks } from './template-pieces.mjs';
import { draftLogic, inventoryIndex, nodesWithin, refKey } from './template-piece-draft.mjs';
import { valuesOf } from './shop-parts-logic.mjs';
import { resolveName } from './intake-ast.mjs';

const RELATED_COLLECTION = 'woocommerce/product-collection/related';
const bare = ( v ) => String( v ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();
const loopOf = ( e ) => ( e?.membership || [] ).filter( ( m ) => 'sc-for' === m.kind ).at( -1 ) || null;
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );

// The value a name stands for: a variable's initial value, followed through plain renames.
function settle( L, node, depth = 0 ) {
	if ( 'Identifier' === node?.type && depth < 4 ) {
		const r = resolveName( L, node );
		return r?.init ? settle( L, r.init, depth + 1 ) : node;
	}
	return node;
}

// The largest whole number a count expression gives (`3`, `m ? 2 : 3`), or null.
function countOf( node ) {
	if ( 'NumericLiteral' === node?.type && Number.isInteger( node.value ) && node.value > 0 ) {
		return node.value;
	}
	if ( 'ConditionalExpression' === node?.type ) {
		const both = [ countOf( node.consequent ), countOf( node.alternate ) ];
		return both.every( Boolean ) ? Math.max( ...both ) : null;
	}
	return null;
}

// What a loop's list is, when it is the other products: { field: null | '<field>', count } or { why }.
export function relatedList( L, list, idKey ) {
	const values = valuesOf( L, bare( list ) ).map( ( v ) => settle( L, v ) );
	if ( 1 !== values.length ) {
		return { why: `the list ${ bare( list ) } has ${ values.length } values in the draft's logic` };
	}
	let node = values[ 0 ];
	let count = null;
	let filter = null;
	while ( 'CallExpression' === node?.type && 'MemberExpression' === node.callee?.type && ! node.callee.computed ) {
		const name = node.callee.property?.name;
		if ( 'slice' === name && null === count ) {
			const end = node.arguments[ 1 ] ?? null;
			count = 0 === node.arguments[ 0 ]?.value && end ? countOf( end ) : null;
		} else if ( 'filter' === name && ! filter ) {
			filter = node.arguments[ 0 ];
		} else {
			break;
		}
		node = node.callee.object;
	}
	if ( ! filter || ! /Function/.test( filter.type || '' ) || 1 > ( filter.params || [] ).length || 'Identifier' !== filter.params[ 0 ].type ) {
		return { why: `the list ${ bare( list ) } is not the draft's records filtered by a function` };
	}
	if ( ! count ) {
		return { why: `the list ${ bare( list ) } is not cut to a count (.slice( 0, N ))` };
	}
	const item = filter.params[ 0 ].name;
	const inside = L.all.filter( ( n ) => n.start >= filter.body.start && n.end <= filter.body.end && 'BinaryExpression' === n.type );
	// `<item>.<f> <op> <other>.<f>`: the field compared, the operator, and whether the item is on one side.
	const compares = inside.map( ( n ) => {
		const side = ( x ) => ( 'MemberExpression' === x?.type && ! x.computed && 'Identifier' === x.object?.type ? { obj: x.object.name, field: x.property?.name } : null );
		const [ a, b ] = [ side( n.left ), side( n.right ) ];
		if ( ! a || ! b || a.field !== b.field || ( a.obj === item ) === ( b.obj === item ) ) {
			return null;
		}
		return { op: n.operator, field: a.field };
	} ).filter( Boolean );
	const leaves = compares.filter( ( c ) => [ '!==', '!=' ].includes( c.op ) && c.field === idKey );
	if ( ! leaves.length ) {
		return { why: `the list ${ bare( list ) } does not leave the shown product out (no ${ item }.${ idKey } !== …)` };
	}
	const same = compares.filter( ( c ) => [ '===', '==' ].includes( c.op ) && c.field !== idKey );
	if ( same.length > 1 ) {
		return { why: `the list ${ bare( list ) } keeps products sharing ${ same.length } fields (${ same.map( ( c ) => c.field ).join( ', ' ) }), and a collection shares one` };
	}
	const others = inside.length - leaves.length - same.length;
	if ( others > 0 ) {
		return { why: `the list ${ bare( list ) } filters on ${ others } other comparison(s) a collection cannot hold` };
	}
	return { field: same[ 0 ]?.field ?? null, count };
}

// The taxonomy a record field becomes in the catalogue: the brand, a facet's attribute, the category, or null.
export function taxonomyOf( catalogue, field ) {
	if ( 'brand' === field && ( catalogue?.products || [] ).some( ( p ) => p.brand ) ) {
		return 'product_brand';
	}
	const facet = ( catalogue?.facets || [] ).find( ( f ) => f.field === field );
	if ( facet?.slug ) {
		return `pa_${ facet.slug }`;
	}
	return [ 'category', 'categories', 'cat' ].includes( field ) ? 'product_cat' : null;
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }": ${ why }` ] } );
	const index = inventoryIndex( ctx.inventory );
	const L = draftLogic( ctx.draftSource );
	if ( ! index.elements.length || ! L ) {
		return note( `no related list is read: the surface has ${ index.elements.length ? 'no draft logic' : 'no inventory' }` );
	}
	const idKey = ctx.catalogue?.source?.idKey || 'id';
	// Each loop of the surface's own markup: its list, its copies (the outermost element of each copy) and the holder of those.
	const loops = new Map();
	for ( const e of index.elements.filter( ( x ) => 'Root' === x.template && shown( x ) ) ) {
		const loop = loopOf( e );
		const up = index.byKey.get( e.parentKey );
		if ( loop && loopOf( up )?.tpl !== loop.tpl ) {
			const at = loops.get( loop.tpl ) || { list: loop.list, copies: [], holder: e.parentKey };
			at.copies.push( e.key );
			loops.set( loop.tpl, at );
		}
	}
	const placed = [];
	const notes = [];
	for ( const loop of loops.values() ) {
		const rel = relatedList( L, loop.list, idKey );
		if ( rel.why ) {
			continue;
		}
		const where = `the related list ${ bare( loop.list ) } (${ loop.holder })`;
		const tax = rel.field ? taxonomyOf( ctx.catalogue, rel.field ) : null;
		if ( rel.field && ! tax ) {
			notes.push( `${ key }: piece "${ piece.id }": ${ where } keeps products sharing their ${ rel.field }, which the catalogue makes no taxonomy, so it stays as drawn` );
			continue;
		}
		if ( index.children( loop.holder ).some( ( k ) => ! loop.copies.includes( k ) ) ) {
			notes.push( `${ key }: piece "${ piece.id }": ${ where } holds more than its cards, so it stays as drawn` );
			continue;
		}
		const nodes = nodesWithin( tree, index, [ loop.holder ] );
		if ( ! nodes.length || nodes.some( ( r ) => r.list !== nodes[ 0 ].list ) || nodes.some( ( r ) => countBlocks( [ r.node ], piece.block ) ) ) {
			notes.push( `${ key }: piece "${ piece.id }": ${ where } has ${ nodes.length ? 'nodes in more than one place' : 'no node' }, so it stays as drawn` );
			continue;
		}
		const first = index.byKey.get( loop.copies[ 0 ] );
		const top = first?.box?.[ 1440 ]?.y;
		const columns = Math.max( 1, loop.copies.filter( ( k ) => undefined !== top && Math.abs( ( index.byKey.get( k )?.box?.[ 1440 ]?.y ?? NaN ) - top ) <= 1 ).length );
		const node = {
			name: piece.block,
			attributes: {
				queryId: 0,
				query: { inherit: false, perPage: rel.count, pages: 1, offset: 0, postType: 'product', isProductCollectionBlock: true },
				tagName: 'div',
				displayLayout: { type: 'flex', columns: Math.min( columns, rel.count ), shrinkColumns: true },
				...( tax ? { sgsSameTermAs: tax } : { collection: RELATED_COLLECTION } ),
			},
			innerBlocks: [ { name: 'woocommerce/product-template', attributes: {}, innerBlocks: [ { name: 'sgs/product-card', attributes: { sourceMode: 'wc-product' }, innerBlocks: [], draftRef: { tpl: loop.copies[ 0 ] } } ] } ],
		};
		const list = nodes[ 0 ].list;
		const at = Math.min( ...nodes.map( ( r ) => list.indexOf( r.node ) ) );
		nodes.forEach( ( r ) => list.splice( list.indexOf( r.node ), 1 ) );
		list.splice( at, 0, node );
		placed.push( { id: piece.id, block: piece.block, at: `${ loop.holder }, in place of ${ nodes.map( ( r ) => refKey( r.node ) ).join( ', ' ) }`, run: [ loop.holder ], list: bare( loop.list ), ...( tax ? { sameTermAs: tax } : { collection: RELATED_COLLECTION } ), perPage: rel.count, columns: node.attributes.displayLayout.columns } );
		notes.push( `${ key }: piece "${ piece.id }": ${ where } lists ${ tax ? `the products sharing the shown product's ${ rel.field } (sgsSameTermAs ${ tax })` : 'the other products (WooCommerce\'s Related Products collection)' }, ${ rel.count } at most, as product cards` );
	}
	if ( ! placed.length && ! notes.length ) {
		return note( 'the draft draws no list of the other products' );
	}
	return placed.length ? { tree, placed, notes } : { notes };
}
