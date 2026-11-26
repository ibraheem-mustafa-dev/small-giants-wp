// The shop listing's sorting and results count (Spec 48 FR-48-61, FR-48-87, FR-48-99): the draft's sort control and its
// count of the listing become WooCommerce's working blocks, where the skeleton had built a form select and a static
// text. Each replaces the draft's own node where it stands, inside the draft's own wrappers (whose draftRefs Fill reads
// for their look), so no new node carries a style value (the skeleton lint, lint.mjs::lintSkeleton). Both work outside
// the product collection on the shop's archive: the sorting navigates to `?orderby=` (WooCommerce's catalog-sorting view
// script) and the count reads the main shop query (woocommerce_result_count through wc_get_loop_prop, which sets the loop
// up from the main WC query), as the hand-built shop template has the sorting in its hero band.
//
// The sorting (`find.contains`): the element the shop parts record locates the part homed on that template block on
// (surface `find.surface`; the record and the inventory must agree on it, lib/template-piece-draft.mjs::partAgrees), and
// the skeleton node built from it (or the node that absorbed it). The draft's words beside the select (inside its
// `label`) stay the draft's own text, so WooCommerce's own label is not drawn twice: when the skeleton absorbed them into
// the node, the node becomes the draft's label element again (`find.labelBlock.wrapper`, its draftRef the label) holding
// each word element as `find.labelBlock.text` (its words in `find.labelBlock.words`, its draftRef the element) and the
// sorting, in the draft's order. Each of the draft's sort options is read in the logic: the option's value tested against
// the select's state key guards a `.sort( ( a, b ) => … )` whose comparator orders by a record field. An option with no
// guarded sort is the listing's own order (`find.orders.default`), one ordering by the product's price field upwards or
// downwards is `find.orders.priceAsc` or `priceDesc`, one ordering by the saving downwards or by the brand as text upwards is
// the theme's own order (sgs_biggest_saving, sgs_brand_az: sortOptionsOf), which the site build's shop step turns on and puts
// in the theme's sort menu with the draft's words (lib/site-build-shop-options.mjs), and any other option is a missing-features note.
//
// The count (`find.count`): the one element outside the listing, not a control, whose own hole the logic builds from the
// length of the list the listing's loop walks (`list.length + ' treats'` beside `<sc-for list="{{ list }}">`). A count of
// anything else (the basket's lines) is not it. Not found is a note; found twice is a problem (never a guess).
import { countBlocks } from './template-pieces.mjs';
import { dcOf, declsOf, draftLogic, holesOf, inventoryIndex, locateParts, loopListOf, nodesWithin, openTag, recordSurface, refKey, treeNodes } from './template-piece-draft.mjs';
import { valuesOf } from './shop-parts-logic.mjs';
import { resolveName } from './intake-ast.mjs';

const COLLECTION = 'woocommerce/product-collection';
const CONTROLS = new Set( [ 'button', 'a', 'select', 'input', 'textarea' ] );
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const bare = ( expr ) => String( expr ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();

// The one product collection of the tree and the list its listing loop walks (the loop of the draft element its
// product card was read at, or of its nearest ancestor: a card read at the root of the component its loop cell mounts carries
// the loop on the cell): { collection, list } or { why }.
function listingOf( tree, index ) {
	const all = treeNodes( tree ).filter( ( r ) => COLLECTION === r.node.name );
	if ( 1 !== all.length ) {
		return { why: `the tree holds ${ all.length } ${ COLLECTION }` };
	}
	const card = treeNodes( all[ 0 ].node.innerBlocks ).find( ( r ) => refKey( r.node ) && index.byKey.has( refKey( r.node ) ) );
	const list = card ? index.chain( refKey( card.node ) ).map( ( k ) => loopListOf( index.byKey.get( k ) ) ).find( Boolean ) ?? null : null;
	return list ? { collection: all[ 0 ].node, list } : { why: `no block inside the ${ COLLECTION } was read at a draft element inside a loop` };
}

// The node a located element became: the one node built from it or from inside it, else the leaf node built from an
// element holding it (the field that absorbed it). Null when none or several.
function nodeOfElement( tree, index, key ) {
	const within = nodesWithin( tree, index, [ key ] );
	if ( within.length ) {
		return 1 === within.length ? within[ 0 ] : null;
	}
	const chain = index.chain( key );
	const holders = treeNodes( tree ).filter( ( r ) => refKey( r.node ) && chain.includes( refKey( r.node ) ) && ! ( r.node.innerBlocks || [] ).length );
	return 1 === holders.length ? holders[ 0 ] : null;
}

// The comparator of a `.sort` call: { field, dir: 'asc' | 'desc', text } or null.
function comparatorOf( fn ) {
	const [ a, b ] = ( fn?.params || [] ).map( ( p ) => p.name );
	const body = 'BlockStatement' === fn?.body?.type ? fn.body.body.find( ( s ) => 'ReturnStatement' === s.type )?.argument : fn?.body;
	const side = ( n ) => ( 'MemberExpression' === n?.type && ! n.computed && 'Identifier' === n.object.type ? { of: n.object.name, field: n.property.name } : null );
	if ( 'BinaryExpression' === body?.type && '-' === body.operator ) {
		const l = side( body.left );
		const r = side( body.right );
		if ( l && r && l.field === r.field && [ l.of, r.of ].sort().join() === [ a, b ].sort().join() ) {
			return { field: l.field, dir: l.of === a ? 'asc' : 'desc' };
		}
	}
	if ( 'CallExpression' === body?.type && 'localeCompare' === body.callee.property?.name ) {
		const l = side( body.callee.object );
		const r = side( body.arguments[ 0 ] );
		if ( l && r && l.field === r.field ) {
			return { field: l.field, dir: l.of === a ? 'asc' : 'desc', text: true };
		}
	}
	return null;
}

// What the logic does when the select's state key holds `value`: the comparator of the `.sort` its test guards, `none`
// when no test of that value guards a sort, or null when one does with a comparator not read.
function orderOf( L, stateKey, value ) {
	const names = ( n ) => ( 'Identifier' === n?.type ? n.name : 'MemberExpression' === n?.type && ! n.computed ? n.property.name : null );
	const tests = L.all.filter( ( n ) => ( 'IfStatement' === n.type || 'ConditionalExpression' === n.type ) && 'BinaryExpression' === n.test?.type && /^[!=]==?$/.test( n.test.operator ) && n.test.operator.startsWith( '=' ) &&
		[ [ n.test.left, n.test.right ], [ n.test.right, n.test.left ] ].some( ( [ x, y ] ) => 'StringLiteral' === x?.type && x.value === value && names( y ) === stateKey ) );
	const sorts = tests.flatMap( ( t ) => L.all.filter( ( c ) => 'CallExpression' === c.type && 'sort' === c.callee?.property?.name && c.start >= t.consequent.start && c.end <= t.consequent.end ) );
	if ( ! sorts.length ) {
		return 'none';
	}
	return comparatorOf( sorts[ 0 ].arguments[ 0 ] );
}

// Whether the logic gives record field `field` as the saving: a property `field` whose value (or the variable it names) is
// the record's recommended price minus its price (`save = p.rrp - p.price; … saveRaw: save`). `fields`: productFieldsOf's roles.
function isSavingField( L, field, fields ) {
	const member = ( n, names ) => 'MemberExpression' === n?.type && ! n.computed && ( names || [] ).includes( n.property?.name );
	const saving = ( n ) => 'BinaryExpression' === n?.type && '-' === n.operator && member( n.left, fields.rrp ) && member( n.right, fields.price );
	return valuesOf( L, field ).some( ( v ) => saving( v ) || ( 'Identifier' === v.type && saving( resolveName( L, v )?.init ) ) );
}

// The draft's sort options, in order, each with the order the shop can offer for it: [ { words, value, how, order } ], `order`
// one of menu_order (no guarded sort: the listing's own order), price / price-desc (the price field upwards / downwards),
// sgs_biggest_saving (the saving downwards, isSavingField), sgs_brand_az (the brand field as text upwards), or null (any other
// order). `select`: the inventory's select element; `fields`: productFieldsOf's roles (lib/template-pieces-context.mjs).
export function sortOptionsOf( { index, select, L, fields = {} } ) {
	const stateKey = bare( /\svalue="([^"]*)"/.exec( openTag( select?.snippet ) )?.[ 1 ] ).split( '.' ).pop();
	const options = select ? index.children( select.key ).map( ( k ) => index.byKey.get( k ) ).filter( ( e ) => 'option' === e.tag ) : [];
	return options.map( ( o ) => {
		const value = /\svalue="([^"]*)"/.exec( o.snippet || '' )?.[ 1 ] ?? o.words;
		const how = L && stateKey ? orderOf( L, stateKey, value ) : null;
		const by = ( role ) => how && 'none' !== how && ( fields[ role ] || [] ).includes( how.field );
		let order = null;
		if ( 'none' === how ) {
			order = 'menu_order';
		} else if ( by( 'price' ) && ! how.text ) {
			order = 'asc' === how.dir ? 'price' : 'price-desc';
		} else if ( by( 'brand' ) && how.text && 'asc' === how.dir ) {
			order = 'sgs_brand_az';
		} else if ( how && 'none' !== how && ! how.text && 'desc' === how.dir && isSavingField( L, how.field, fields ) ) {
			order = 'sgs_biggest_saving';
		}
		return { words: String( o.words ?? '' ).trim(), value, how, order };
	} );
}

function placeSorting( ctx, piece, index ) {
	const { key, tree } = ctx;
	const refuse = ( why ) => ( { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: ${ why }` ] } );
	const surface = recordSurface( ctx.shopParts, piece.find.surface );
	const parts = ( surface?.parts || [] ).filter( ( p ) => p.home?.contains === piece.find.contains );
	if ( ! parts.length ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the shop parts record locates no ${ piece.find.contains } part, so the draft draws no sort control` ] };
	}
	if ( ctx.draftFile && dcOf( surface.file ) !== dcOf( ctx.draftFile ) ) {
		return refuse( `the record's ${ piece.find.surface } is read from ${ surface.file }, not from this surface's draft ${ ctx.draftFile }` );
	}
	const { keys, disagree } = locateParts( index, surface, parts );
	const located = [ ...new Set( keys.flatMap( ( k ) => k.keys ) ) ];
	if ( disagree.length || 1 !== located.length ) {
		return refuse( disagree.length ? `the shop parts record and the surface inventory disagree on ${ disagree.join( ', ' ) }: the elements those locators land on do not show the record's sample, so the two were read from different versions of the draft (rerun shop-parts.mjs <client> --write and the surface's inventory from the same draft)` : `its part is located on ${ located.length } elements this inventory shows (${ located.join( ', ' ) || 'none' })` );
	}
	const at = nodeOfElement( tree, index, located[ 0 ] );
	if ( ! at ) {
		return refuse( `no one skeleton node is built from ${ located[ 0 ] }` );
	}
	const select = index.elements.find( ( e ) => 'select' === e.tag && index.within( e.key, located[ 0 ] ) ) || index.elements.find( ( e ) => 'select' === e.tag && index.chain( located[ 0 ] ).includes( e.key ) );
	const notes = [];
	const L = draftLogic( ctx.draftSource );
	const options = select ? sortOptionsOf( { index, select, L, fields: ctx.productFields || {} } ) : [];
	const orders = piece.find.orders || {};
	const wcOf = { menu_order: orders.default, price: orders.priceAsc, 'price-desc': orders.priceDesc };
	const offered = [];
	for ( const o of options ) {
		if ( wcOf[ o.order ] ) {
			offered.push( `"${ o.words }" = ${ wcOf[ o.order ] }` );
		} else if ( o.order ) {
			offered.push( `"${ o.words }" = ${ o.order } (the theme's order, offered once the site build's shop step turns it on: lib/site-build-shop-options.mjs)` );
		} else {
			notes.push( `${ key }: missing feature: the draft's sort option "${ o.words }" (${ o.value }) ${ o.how && 'none' !== o.how ? `orders by ${ o.how.field }${ o.how.text ? ' as text' : '' } ${ 'asc' === o.how.dir ? 'upwards' : 'downwards' }` : 'orders in a way the logic does not show' }, which neither WooCommerce's sorting nor the theme offers` );
		}
	}
	options.length && notes.push( `${ key }: the draft's sort options WooCommerce offers: ${ offered.join( ', ' ) || 'none' }; WooCommerce's sorting lists its own other options until the site build's shop step writes the theme's sort menu` );
	const sorting = { name: piece.block, attributes: {}, innerBlocks: [] };
	const label = select && index.chain( select.key ).map( ( k ) => index.byKey.get( k ) ).find( ( e ) => 'label' === e.tag );
	const words = label ? index.elements.filter( ( e ) => index.within( e.key, label.key ) && ! index.within( e.key, select.key ) && String( e.words || '' ).trim() && ! index.children( e.key ).length ) : [];
	const built = new Set( treeNodes( tree ).map( ( r ) => refKey( r.node ) ) );
	const absorbed = words.filter( ( e ) => ! built.has( e.key ) );
	const lb = piece.find.labelBlock || {};
	let put = sorting;
	if ( absorbed.length && lb.wrapper && lb.text && lb.words ) {
		// The node stood for the whole label: it becomes the draft's label element again, its words and the sorting inside in the draft's order.
		const inner = [ ...absorbed.map( ( e ) => ( { e, node: { name: lb.text, attributes: { [ lb.words ]: e.words }, innerBlocks: [], draftRef: { tpl: e.key } } } ) ), { e: select, node: sorting } ];
		inner.sort( ( a, b ) => index.order( a.e.key ) - index.order( b.e.key ) );
		put = { name: lb.wrapper, attributes: {}, innerBlocks: inner.map( ( x ) => x.node ), draftRef: { tpl: label.key } };
	}
	const where = at.list.indexOf( at.node );
	at.list.splice( where, 1, put );
	const holder = treeNodes( tree ).find( ( r ) => r.node.innerBlocks === at.list )?.node;
	const inside = put === sorting ? '' : `, inside the draft's label ${ label.key } beside its words ${ absorbed.map( ( e ) => e.key ).join( ', ' ) }`;
	// `run`: the draft element the sorting replaced (the select, not the label that became the draft's own wrapper again), whose paint no
	// node reads any more (lib/template-pieces-context.mjs::piecesPaint). WooCommerce's sorting has no part-look locator, so none of it is read.
	const run = [ put !== sorting && label.key === refKey( at.node ) ? select.key : refKey( at.node ) ];
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `${ holder ? refKey( holder ) || holder.name : 'the top' }, position ${ where }, in place of ${ refKey( at.node ) } (${ at.node.name })${ inside }`, run } ], notes };
}

// Whether a hole's values are the length of the list `list` (the listing's loop list) plus any words.
function countsList( L, hole, list ) {
	const decls = declsOf( L, bare( list ) );
	const values = valuesOf( L, hole );
	const lengths = ( v ) => L.all.filter( ( n ) => n.start >= v.start && n.end <= v.end && 'MemberExpression' === n.type && ! n.computed && 'length' === n.property.name && 'Identifier' === n.object.type );
	return decls.size > 0 && values.length > 0 && values.every( ( v ) => lengths( v ).some( ( n ) => decls.has( resolveName( L, n.object )?.decl ) ) );
}

function placeCount( ctx, piece, index, listing ) {
	const { key, tree } = ctx;
	const L = draftLogic( ctx.draftSource );
	if ( ! L ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the surface's draft has no logic to read what its counts count` ] };
	}
	const inListing = ( e ) => ( e.membership || [] ).some( ( m ) => 'sc-for' === m.kind && bare( m.list ) === bare( listing.list ) );
	const counts = index.elements.filter( ( e ) => 'Root' === e.template && shown( e ) && ! CONTROLS.has( e.tag ) && ! inListing( e ) && holesOf( e.srcOwnText ).some( ( h ) => countsList( L, h, listing.list ) ) );
	if ( ! counts.length ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the draft shows no count of the listing (${ listing.list })` ] };
	}
	if ( counts.length > 1 ) {
		return { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: ${ counts.length } elements count the listing (${ counts.map( ( e ) => e.key ).join( ', ' ) })` ] };
	}
	const e = counts[ 0 ];
	const at = treeNodes( tree ).find( ( r ) => refKey( r.node ) === e.key );
	if ( ! at ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the listing's count ${ e.key } ("${ e.words }") has no node of its own in the skeleton, so it stays as built` ] };
	}
	const where = at.list.indexOf( at.node );
	at.list.splice( where, 1, { name: piece.block, attributes: {}, innerBlocks: [] } );
	const holder = treeNodes( tree ).find( ( r ) => r.node.innerBlocks === at.list )?.node;
	// `run`: the draft element the count replaced, whose paint no node reads any more (lib/template-pieces-context.mjs::piecesPaint).
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `${ holder ? refKey( holder ) || holder.name : 'the top' }, position ${ where }, in place of ${ e.key } (${ at.node.name })`, run: [ e.key ] } ], notes: [ `${ key }: piece "${ piece.id }": WooCommerce words the count its own way; the draft's reads "${ String( e.srcOwnText ).trim() }" ("${ e.words }")` ] };
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	if ( countBlocks( tree, piece.block ) ) {
		return { notes: [ `${ key }: piece "${ piece.id }": the tree already holds ${ piece.block }` ] };
	}
	const index = inventoryIndex( ctx.inventory );
	if ( ! index.elements.length ) {
		return { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: the surface has no inventory` ] };
	}
	const listing = listingOf( tree, index );
	if ( ! listing.collection ) {
		return { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: ${ listing.why }` ] };
	}
	return piece.find?.contains ? placeSorting( ctx, piece, index ) : placeCount( ctx, piece, index, listing );
}
