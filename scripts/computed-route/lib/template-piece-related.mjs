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
import { declsOf, draftLogic, holesOf, inventoryIndex, mountedRoot, nodesWithin, refKey, treeNodes, wordsSetting } from './template-piece-draft.mjs';
import { recordRoots } from './template-piece-product-field.mjs';
import { blockSchema } from './resolve.mjs';
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

// The words a section draws around the shared term ("More from Ray-Ban" from `'More from ' + cur.brand`, "See all {{ cur.brand }}"):
// { before, after } when the element's whole words are one value made of the shown record's `field` with fixed words around it, or null.
export function termWords( L, e, roots, field ) {
	const holes = holesOf( e?.srcOwnText );
	if ( 1 !== holes.length ) {
		return null;
	}
	const own = String( e.srcOwnText );
	const [ pre, post ] = own.split( /\{\{[^}]*\}\}/ );
	const onRecord = ( obj ) => 'Identifier' === obj?.type && [ ...declsOf( L, obj.name ) ].some( ( d ) => roots.has( d ) );
	const parts = holes[ 0 ].split( '.' );
	if ( 2 === parts.length && parts[ 1 ] === field && [ ...declsOf( L, parts[ 0 ] ) ].some( ( d ) => roots.has( d ) ) ) {
		return { before: pre, after: post };
	}
	if ( pre.trim() || post.trim() ) {
		return null;
	}
	// A value of fixed words joined to the field: `'More from ' + cur.brand` (string literals and one member of the shown record).
	const values = valuesOf( L, holes[ 0 ] ).map( ( v ) => settle( L, v ) );
	if ( 1 !== values.length ) {
		return null;
	}
	const flat = [];
	const walk = ( n ) => ( 'BinaryExpression' === n?.type && '+' === n.operator ? ( walk( n.left ), walk( n.right ) ) : flat.push( n ) );
	walk( values[ 0 ] );
	const at = flat.findIndex( ( n ) => 'MemberExpression' === n?.type && ! n.computed && n.property?.name === field && onRecord( n.object ) );
	if ( at < 0 || flat.some( ( n, i ) => i !== at && 'StringLiteral' !== n?.type ) ) {
		return null;
	}
	const text = ( list ) => list.map( ( n ) => n.value ).join( '' );
	return { before: text( flat.slice( 0, at ) ), after: text( flat.slice( at + 1 ) ) };
}

// The section around a related list that shares a term: its words naming the term are bound to the shown product's term (the brand
// binding with the draft's words around it, a link's address to the brand's page), and the section is hidden when the collection
// finds no products (sgsConditionCollectionQueryId, includes/conditional-visibility.php: the section renders after its collection, so
// the result is known), as the draft draws it only when the term has other products. The section is the lowest element holding the
// list and such words and no other loop. Returns { bound, section, notes }.
export function sectionWords( { L, index, roots, tree, holder, field, tax, queryId } ) {
	const key = 'brand' === field && 'product_brand' === tax ? 'brand' : ( /^pa_/.test( tax || '' ) ? `attribute.${ tax }` : null );
	if ( ! key ) {
		return { bound: [], section: null, notes: [] };
	}
	const words = index.elements.filter( ( e ) => 'Root' === e.template && Object.values( e.visible || {} ).some( Boolean ) && ! index.within( e.key, holder ) ).map( ( e ) => ( { e, w: termWords( L, e, roots, field ) } ) ).filter( ( x ) => x.w );
	const section = index.chain( holder ).slice( 1 ).find( ( k ) => words.some( ( x ) => index.within( x.e.key, k ) ) );
	const mine = section ? words.filter( ( x ) => index.within( x.e.key, section ) ) : [];
	const notes = [];
	const bound = [];
	for ( const { e, w } of mine ) {
		const at = treeNodes( tree ).find( ( r ) => refKey( r.node ) === e.key );
		const attr = at ? wordsSetting( at.node, e ) : null;
		if ( ! attr ) {
			notes.push( `${ e.key } shows the shared ${ field } among the section's words, and ${ at ? `${ at.node.name } holds no single setting with them` : 'no node of its own' }` );
			continue;
		}
		const meta = at.node.attributes.metadata || {};
		const bindings = { ...( meta.bindings || {} ), [ attr ]: { source: 'sgs-product/field', args: { key, ...( w.before ? { before: w.before } : {} ), ...( w.after ? { after: w.after } : {} ) } } };
		'brand' === key && 'a' === e.tag && Object.hasOwn( blockSchema( at.node.name ) || {}, 'url' ) && ( bindings.url = { source: 'sgs-product/field', args: { key: 'brand_url' } } );
		at.node.attributes.metadata = { ...meta, bindings };
		bound.push( `${ e.key } ${ attr } <- ${ key }${ w.before ? ` after "${ w.before }"` : '' }${ w.after ? ` before "${ w.after }"` : '' }${ bindings.url ? ' (url <- brand_url)' : '' }` );
	}
	const sectionNode = section ? treeNodes( tree ).find( ( r ) => refKey( r.node ) === section ) : null;
	if ( sectionNode && bound.length ) {
		sectionNode.node.attributes.sgsConditionCollectionQueryId = queryId;
	} else if ( bound.length ) {
		notes.push( `the section around ${ holder } has no node of its own, so it is not hidden when the collection finds nothing` );
	}
	return { bound, section: sectionNode && bound.length ? section : null, notes };
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
		// The card is read at the root of the card the first copy mounts (lib/template-piece-draft.mjs::mountedRoot), and stands for
		// every product the collection lists (`itemTemplate`), so Fill never takes one product's variant for it.
		const node = {
			name: piece.block,
			attributes: {
				queryId: 0,
				query: { inherit: false, perPage: rel.count, pages: 1, offset: 0, postType: 'product', isProductCollectionBlock: true },
				tagName: 'div',
				displayLayout: { type: 'flex', columns: Math.min( columns, rel.count ), shrinkColumns: true },
				...( tax ? { sgsSameTermAs: tax } : { collection: RELATED_COLLECTION } ),
			},
			innerBlocks: [ { name: 'woocommerce/product-template', attributes: {}, innerBlocks: [ { name: 'sgs/product-card', attributes: { sourceMode: 'wc-product' }, innerBlocks: [], draftRef: { tpl: mountedRoot( index, loop.copies[ 0 ] ) }, itemTemplate: true } ] } ],
		};
		const list = nodes[ 0 ].list;
		const at = Math.min( ...nodes.map( ( r ) => list.indexOf( r.node ) ) );
		nodes.forEach( ( r ) => list.splice( list.indexOf( r.node ), 1 ) );
		list.splice( at, 0, node );
		// The section's words naming the shared term follow the shown product, and the section hides with an empty collection.
		const roots = tax && ctx.productFields ? recordRoots( L, index, ctx.productFields ) : null;
		const queryId = Number( /\/(\d+)#/.exec( loop.holder )?.[ 1 ] ) || 0;
		const words = roots ? sectionWords( { L, index, roots, tree, holder: loop.holder, field: rel.field, tax, queryId } ) : { bound: [], section: null, notes: [] };
		words.section && ( node.attributes.queryId = queryId );
		notes.push( ...words.notes.map( ( x ) => `${ key }: piece "${ piece.id }": ${ x }` ) );
		placed.push( { id: piece.id, block: piece.block, at: `${ loop.holder }, in place of ${ nodes.map( ( r ) => refKey( r.node ) ).join( ', ' ) }`, run: [ loop.holder ], list: bare( loop.list ), ...( tax ? { sameTermAs: tax } : { collection: RELATED_COLLECTION } ), perPage: rel.count, columns: node.attributes.displayLayout.columns, ...( words.bound.length ? { words: words.bound, hidesWith: words.section } : {} ) } );
		notes.push( `${ key }: piece "${ piece.id }": ${ where } lists ${ tax ? `the products sharing the shown product's ${ rel.field } (sgsSameTermAs ${ tax })` : 'the other products (WooCommerce\'s Related Products collection)' }, ${ rel.count } at most, as product cards` );
	}
	if ( ! placed.length && ! notes.length ) {
		return note( 'the draft draws no list of the other products' );
	}
	return placed.length ? { tree, placed, notes } : { notes };
}
