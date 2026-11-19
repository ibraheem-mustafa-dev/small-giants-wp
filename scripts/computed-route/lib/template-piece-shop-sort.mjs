// The shop listing's sorting and results count (Spec 48 FR-48-61, FR-48-87, FR-48-99): the draft's sort control and its
// count of the listing become WooCommerce's working blocks, where the skeleton had built a form select and a static
// text. Each is placed where it works, as the framework composes the shop (theme/sgs-theme/templates/archive-product.html):
// inside the product collection, in the toolbar that holds the count and the sorting before the product template. The
// toolbar, its settings and the order of its two blocks are read from that file, never written here; the draft's own
// node is removed from where it stood.
//
// The sorting (`find.contains`): the element the shop parts record locates the part homed on that template block on
// (surface `find.surface`; the record and the inventory must agree on it, lib/template-piece-draft.mjs::partAgrees), and
// the skeleton node built from it (or the node that absorbed it). A label the draft shows beside the select sets the
// setting `find.labelSetting`. Each of the draft's sort options is read in the logic: the option's value tested against
// the select's state key guards a `.sort( ( a, b ) => … )` whose comparator orders by a record field. An option with no
// guarded sort is the listing's own order (`find.orders.default`), one ordering by the product's price field upwards or
// downwards is `find.orders.priceAsc` or `priceDesc`, and any other option is a missing-features note.
//
// The count (`find.count`): the one element outside the listing, not a control, whose own hole the logic builds from the
// length of the list the listing's loop walks (`list.length + ' treats'` beside `<sc-for list="{{ list }}">`). A count of
// anything else (the basket's lines) is not it. Not found is a note; found twice is a problem (never a guess).
import { countBlocks } from './template-pieces.mjs';
import { THEME_TEMPLATES, parseBlocks } from './template-copies.mjs';
import { dcOf, declsOf, draftLogic, holesOf, inventoryIndex, locateParts, loopListOf, nodesWithin, openTag, recordSurface, refKey, treeNodes } from './template-piece-draft.mjs';
import { valuesOf } from './shop-parts-logic.mjs';
import { resolveName } from './intake-ast.mjs';
import fs from 'node:fs';
import path from 'node:path';

const COLLECTION = 'woocommerce/product-collection';
const CONTROLS = new Set( [ 'button', 'a', 'select', 'input', 'textarea' ] );
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const bare = ( expr ) => String( expr ?? '' ).replace( /^\{\{\s*|\s*\}\}$/g, '' ).trim();

// The framework's toolbar inside its product collection: { toolbar (node), at (its index in the collection), order
// (block names in the toolbar's order) }, or null.
export function frameworkToolbar( block, dir = THEME_TEMPLATES ) {
	const file = path.join( dir, 'archive-product.html' );
	if ( ! fs.existsSync( file ) ) {
		return null;
	}
	const collection = treeNodes( parseBlocks( fs.readFileSync( file, 'utf8' ) ) ).find( ( r ) => COLLECTION === r.node.name )?.node;
	const at = ( collection?.innerBlocks || [] ).findIndex( ( n ) => countBlocks( [ n ], block ) );
	if ( at < 0 ) {
		return null;
	}
	const toolbar = collection.innerBlocks[ at ];
	return { toolbar, at, order: treeNodes( toolbar.innerBlocks ).map( ( r ) => r.node.name ) };
}

// Puts `node` into the tree's product collection, in the framework's toolbar (made from the framework's when the
// collection has none yet), before the first block the framework orders after it. Returns where, or null.
function intoToolbar( collection, frame, node ) {
	const same = ( n ) => n.name === frame.toolbar.name && ( n.attributes?.className ?? '' ) === ( frame.toolbar.attributes?.className ?? '' );
	let bar = ( collection.innerBlocks || [] ).find( same );
	if ( ! bar ) {
		bar = { name: frame.toolbar.name, attributes: structuredClone( frame.toolbar.attributes || {} ), innerBlocks: [] };
		collection.innerBlocks = collection.innerBlocks || [];
		collection.innerBlocks.splice( Math.min( frame.at, collection.innerBlocks.length ), 0, bar );
	}
	const rank = ( n ) => frame.order.indexOf( n.name );
	const after = bar.innerBlocks.findIndex( ( n ) => rank( n ) > rank( node ) );
	bar.innerBlocks.splice( after < 0 ? bar.innerBlocks.length : after, 0, node );
	return `the product collection's toolbar (${ bar.attributes?.className || bar.name }), position ${ bar.innerBlocks.indexOf( node ) }`;
}

// The one product collection of the tree and the list its listing loop walks (the loop of the draft element its
// product card was read at): { collection, list } or { why }.
function listingOf( tree, index ) {
	const all = treeNodes( tree ).filter( ( r ) => COLLECTION === r.node.name );
	if ( 1 !== all.length ) {
		return { why: `the tree holds ${ all.length } ${ COLLECTION }` };
	}
	const card = treeNodes( all[ 0 ].node.innerBlocks ).find( ( r ) => refKey( r.node ) && index.byKey.has( refKey( r.node ) ) );
	const list = card ? loopListOf( index.byKey.get( refKey( card.node ) ) ) : null;
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

function placeSorting( ctx, piece, index, listing, frame ) {
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
	const attributes = {};
	const label = select && index.chain( select.key ).map( ( k ) => index.byKey.get( k ) ).find( ( e ) => 'label' === e.tag );
	if ( label && piece.find.labelSetting && index.elements.some( ( e ) => e.key !== select.key && index.within( e.key, label.key ) && ! index.within( e.key, select.key ) && String( e.words || '' ).trim() ) ) {
		attributes[ piece.find.labelSetting ] = true;
	}
	const L = draftLogic( ctx.draftSource );
	const stateKey = bare( /\svalue="([^"]*)"/.exec( openTag( select?.snippet ) )?.[ 1 ] ).split( '.' ).pop();
	const options = select ? index.children( select.key ).map( ( k ) => index.byKey.get( k ) ).filter( ( e ) => 'option' === e.tag ) : [];
	const orders = piece.find.orders || {};
	const offered = [];
	for ( const o of options ) {
		const value = /\svalue="([^"]*)"/.exec( o.snippet || '' )?.[ 1 ] ?? o.words;
		const how = L && stateKey ? orderOf( L, stateKey, value ) : null;
		const byPrice = how && 'none' !== how && ! how.text && ( ctx.productFields?.price || [] ).includes( how.field );
		const wc = 'none' === how ? orders.default : byPrice ? orders[ 'asc' === how.dir ? 'priceAsc' : 'priceDesc' ] : null;
		if ( wc ) {
			offered.push( `"${ o.words }" = ${ wc }` );
		} else {
			notes.push( `${ key }: missing feature: the draft's sort option "${ o.words }" (${ value }) ${ how && 'none' !== how ? `orders by ${ how.field }${ how.text ? ' as text' : '' } ${ 'asc' === how.dir ? 'upwards' : 'downwards' }` : 'orders in a way the logic does not show' }, which WooCommerce's sorting does not offer` );
		}
	}
	options.length && notes.push( `${ key }: the draft's sort options WooCommerce offers: ${ offered.join( ', ' ) || 'none' }; WooCommerce's sorting also lists its own other options, which no block setting limits` );
	const node = { name: piece.block, attributes, innerBlocks: [] };
	at.list.splice( at.list.indexOf( at.node ), 1 );
	const where = intoToolbar( listing.collection, frame, node );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `${ where }, in place of ${ refKey( at.node ) } (${ at.node.name })` } ], notes };
}

// Whether a hole's values are the length of the list `list` (the listing's loop list) plus any words.
function countsList( L, hole, list ) {
	const decls = declsOf( L, bare( list ) );
	const values = valuesOf( L, hole );
	const lengths = ( v ) => L.all.filter( ( n ) => n.start >= v.start && n.end <= v.end && 'MemberExpression' === n.type && ! n.computed && 'length' === n.property.name && 'Identifier' === n.object.type );
	return decls.size > 0 && values.length > 0 && values.every( ( v ) => lengths( v ).some( ( n ) => decls.has( resolveName( L, n.object )?.decl ) ) );
}

function placeCount( ctx, piece, index, listing, frame ) {
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
	at.list.splice( at.list.indexOf( at.node ), 1 );
	const where = intoToolbar( listing.collection, frame, { name: piece.block, attributes: {}, innerBlocks: [] } );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: `${ where }, in place of ${ e.key } (${ at.node.name })` } ], notes: [ `${ key }: piece "${ piece.id }": WooCommerce words the count its own way; the draft's reads "${ String( e.srcOwnText ).trim() }" ("${ e.words }")` ] };
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
	const frame = frameworkToolbar( piece.block, ctx.themeDir );
	if ( ! frame ) {
		return { problems: [ `${ key }: piece "${ piece.id }" (${ piece.block }) is not placed: the framework's archive-product.html holds no ${ piece.block } inside its ${ COLLECTION }` ] };
	}
	return piece.find?.contains ? placeSorting( ctx, piece, index, listing, frame ) : placeCount( ctx, piece, index, listing, frame );
}
