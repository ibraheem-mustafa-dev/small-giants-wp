// The areas of a product template whose content changes with the product (Spec 48 FR-48-96): the title, the price
// outside the buy box, the description and the product's pictures. One template serves every product, so each area the
// draft fills from the product it shows becomes a working piece; every other block stays the draft's own.
//
// `piece.find.field` names the product record field the area shows, a role of `ctx.productFields` (the field names the
// catalogue reader finds in the draft's records, lib/template-pieces-context.mjs::productFieldsOf: `name`, `price`,
// `description`, `image`). `piece.binds` is the binding the area's block gets ({ source, key }), the binding lib/template-pieces.mjs::countPiece checks.
//   - The title (`find.contains`): the element the shop parts record locates the part homed on that template block on
//     (`wp:post-title`); it must be the page's h1, and the skeleton node built from it is bound.
//   - The price and the description: the one element of the surface's own markup whose own text is a single hole the
//     draft's logic feeds from that field of the record the title's hole reads (`p.name` makes `p` the record), so
//     `{{ p.short }}` is the description; a hole among other words is left as it is, as a binding replaces the words.
//   - The pictures (`field: image`): the elements whose pictures the logic feeds from the record's image fields (a
//     background or a src hole, a loop of thumbnails over the record's gallery). `sgs/buybox` draws the product's own
//     gallery beside its controls (theme/sgs-theme/templates/single-product.html: the buy box owns the gallery), so the
//     draft's gallery region (the element holding those pictures, climbing through wrappers that hold only it) is
//     removed and the buy box's gallery shows the pictures; with no buy box in the tree the draft's gallery stays.
// The bound setting is the node's own words setting (lib/template-piece-draft.mjs::wordsSetting). An area found twice,
// or not found, stays as it is and is a note; the required title not found is a problem.
import { countBlocks } from './template-pieces.mjs';
import { runOf } from './template-piece-buybox.mjs';
import { attrHolesOf, dcOf, declsOf, draftLogic, holeReads, holesOf, inventoryIndex, locateParts, loopListOf, nodesWithin, recordSurface, refKey, treeNodes, wordsSetting } from './template-piece-draft.mjs';

const FIXED = ( e ) => Object.values( e?.position || {} ).some( ( p ) => 'fixed' === p );
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const OWN = 'Root';

// The page's h1: the one shown h1 of the surface's own markup, or null.
function pageH1( index ) {
	const h1 = index.elements.filter( ( e ) => 'h1' === e.tag && OWN === e.template && shown( e ) );
	return 1 === h1.length ? h1[ 0 ] : null;
}

// The node built from an element, or null.
const nodeOf = ( tree, key ) => treeNodes( tree ).find( ( r ) => refKey( r.node ) === key ) || null;

// Binds a node's words setting to `binds` ({ source, key }). Returns the bound setting, or null when the node has no single words setting.
function bindNode( node, element, bind ) {
	const attr = wordsSetting( node, element );
	if ( ! attr ) {
		return null;
	}
	const meta = node.attributes.metadata || {};
	node.attributes.metadata = { ...meta, bindings: { ...( meta.bindings || {} ), [ attr ]: { source: bind.source, args: { key: bind.key } } } };
	return attr;
}

// The record the title's hole reads: the declarations of its root (`p` of `{{ p.name }}`), or null.
function recordRoots( L, index, fields ) {
	const h1 = pageH1( index );
	const hole = h1 ? holesOf( h1.srcOwnText ).find( ( h ) => 2 === h.split( '.' ).length && ( fields.name || [] ).includes( h.split( '.' )[ 1 ] ) ) : null;
	const roots = hole ? declsOf( L, hole.split( '.' )[ 0 ] ) : new Set();
	return roots.size ? roots : null;
}

function placeTitle( ctx, piece, index ) {
	const { key, tree } = ctx;
	const surface = recordSurface( ctx.shopParts, piece.find.surface );
	const parts = ( surface?.parts || [] ).filter( ( p ) => p.home?.contains === piece.find.contains );
	if ( ! surface || ! parts.length ) {
		return { problems: [ `${ key }: piece "${ piece.id }" is not placed: the shop parts record locates no ${ piece.find.contains } part on its ${ piece.find.surface } surface` ] };
	}
	if ( ctx.draftFile && dcOf( surface.file ) !== dcOf( ctx.draftFile ) ) {
		return { problems: [ `${ key }: piece "${ piece.id }" is not placed: the record's ${ piece.find.surface } is read from ${ surface.file }, not from this surface's draft ${ ctx.draftFile }` ] };
	}
	const { keys, disagree } = locateParts( index, surface, parts );
	const located = [ ...new Set( keys.flatMap( ( k ) => k.keys ) ) ];
	const h1 = pageH1( index );
	if ( disagree.length || 1 !== located.length || ! h1 || located[ 0 ] !== h1.key ) {
		const at = located.map( ( k ) => `${ k } (${ index.byKey.get( k )?.tag })` ).join( ', ' ) || 'no element this inventory shows';
		return { problems: [ `${ key }: piece "${ piece.id }" is not placed: the record locates the title on ${ at }${ disagree.length ? `, which does not show its sample` : '' }, and the page's h1 is ${ h1 ? h1.key : 'not one element' }: the title is the page's h1, so the record and the inventory do not describe the same draft (rerun shop-parts.mjs <client> --write and the surface's inventory from the same draft)` ] };
	}
	const at = nodeOf( tree, h1.key );
	if ( ! at || at.node.name !== piece.block ) {
		return { problems: [ `${ key }: piece "${ piece.id }" is not placed: the page's h1 ${ h1.key } was built ${ at ? `as ${ at.node.name }` : 'as no node of its own' }, not as ${ piece.block }` ] };
	}
	const attr = bindNode( at.node, h1, piece.binds );
	if ( ! attr ) {
		return { problems: [ `${ key }: piece "${ piece.id }" is not placed: ${ piece.block } at ${ h1.key } holds no single setting with the h1's words` ] };
	}
	return { tree, placed: [ { id: piece.id, block: piece.block, at: h1.key, bind: `${ attr } <- ${ piece.binds.source } ${ piece.binds.key }` } ] };
}

function placeHole( ctx, piece, index, L ) {
	const { key, tree } = ctx;
	const fields = ctx.productFields?.[ piece.find.field ] || [];
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }" stays as the draft draws it: ${ why }` ] } );
	if ( ! fields.length ) {
		return note( `the draft's product records have no ${ piece.find.field } field` );
	}
	const roots = recordRoots( L, index, ctx.productFields );
	if ( ! roots ) {
		return note( 'the page\'s h1 reads no product record\'s name, so the record the page shows is unknown' );
	}
	const fed = index.elements.filter( ( e ) => OWN === e.template && shown( e ) && ! index.chain( e.key ).some( ( a ) => FIXED( index.byKey.get( a ) ) ) &&
		holesOf( e.srcOwnText ).some( ( h ) => holeReads( L, h, roots, fields, loopListOf( e ) ) ) );
	const built = fed.map( ( e ) => ( { e, at: nodeOf( tree, e.key ) } ) ).filter( ( x ) => x.at );
	if ( ! built.length ) {
		return note( fed.length ? `the element(s) showing the product's ${ piece.find.field } (${ fed.map( ( e ) => e.key ).join( ', ' ) }) have no node of their own in this tree (they are inside the buy box, or another block absorbed them)` : `no element of the page shows the product's ${ piece.find.field }` );
	}
	if ( built.length > 1 ) {
		return note( `${ built.length } elements show the product's ${ piece.find.field } (${ built.map( ( x ) => x.e.key ).join( ', ' ) }), so which one is the area is not known` );
	}
	const { e, at } = built[ 0 ];
	if ( 1 !== holesOf( e.srcOwnText ).length || String( e.srcOwnText ).replace( /\{\{[^}]*\}\}/g, '' ).trim() ) {
		return note( `${ e.key } shows the ${ piece.find.field } among other words ("${ String( e.srcOwnText ).trim() }"), which a binding would replace` );
	}
	const attr = bindNode( at.node, e, piece.binds );
	if ( ! attr ) {
		return note( `${ at.node.name } at ${ e.key } holds no single setting with the element's words` );
	}
	return { tree, placed: [ { id: piece.id, block: at.node.name, at: e.key, bind: `${ attr } <- ${ piece.binds.source } ${ piece.binds.key }` } ] };
}

function placeGallery( ctx, piece, index, L ) {
	const { key, tree } = ctx;
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }": ${ why }` ] } );
	const fields = ctx.productFields?.[ piece.find.field ] || [];
	if ( 1 !== countBlocks( tree, piece.block ) ) {
		return note( `the draft's pictures stay as drawn: the tree holds ${ countBlocks( tree, piece.block ) } ${ piece.block }, whose own gallery shows the product's pictures` );
	}
	const roots = fields.length ? recordRoots( L, index, ctx.productFields ) : null;
	if ( ! roots ) {
		return note( fields.length ? 'the page\'s h1 reads no product record\'s name, so the record whose pictures the page shows is unknown' : 'the draft\'s product records have no picture field' );
	}
	const pictures = index.elements.filter( ( e ) => OWN === e.template && shown( e ) && [ ...attrHolesOf( e.snippet ), ...holesOf( e.srcOwnText ) ].some( ( h ) => holeReads( L, h, roots, fields, loopListOf( e ) ) ) ).map( ( e ) => e.key );
	if ( ! pictures.length ) {
		return note( `no element shows the product's own pictures, so ${ piece.block } shows its gallery where the draft draws none` );
	}
	const region = runOf( index, pictures );
	const h1 = region && index.elements.some( ( e ) => 'h1' === e.tag && region.some( ( r ) => index.within( e.key, r ) ) );
	const nodes = region ? nodesWithin( tree, index, region ) : [];
	if ( ! region || h1 || nodes.some( ( r ) => countBlocks( [ r.node ], piece.block ) ) ) {
		return note( `the elements showing the product's pictures (${ pictures.join( ', ' ) }) share ${ region ? `${ region.join( ', ' ) }, which also holds ${ h1 ? 'the page\'s h1' : `the ${ piece.block }` }` : 'no element' }, so the draft's gallery stays as drawn` );
	}
	const removed = nodes.map( ( r ) => refKey( r.node ) );
	const worded = nodes.flatMap( ( r ) => treeNodes( [ r.node ] ) ).filter( ( x ) => wordsSetting( x.node, index.byKey.get( refKey( x.node ) ) ) ).map( ( x ) => `${ refKey( x.node ) } "${ index.byKey.get( refKey( x.node ) ).words }"` );
	for ( const r of nodes ) {
		r.list.splice( r.list.indexOf( r.node ), 1 );
	}
	return {
		tree,
		placed: [ { id: piece.id, block: piece.block, at: `the ${ piece.block }'s own gallery, in place of the draft's gallery ${ region.join( ', ' ) } (nodes ${ removed.join( ', ' ) })` } ],
		notes: worded.length ? [ `${ key }: piece "${ piece.id }": the words drawn on the draft's gallery go with it (${ worded.join( '; ' ) }); the ${ piece.block }'s gallery sticker and badge settings are where they belong` ] : [],
	};
}

export function place( ctx, piece ) {
	const index = inventoryIndex( ctx.inventory );
	if ( ! index.elements.length ) {
		return { problems: [ `${ ctx.key }: piece "${ piece.id }" is not placed: the surface has no inventory` ] };
	}
	if ( piece.find?.contains ) {
		return placeTitle( ctx, piece, index );
	}
	const L = draftLogic( ctx.draftSource );
	if ( ! L ) {
		return { notes: [ `${ ctx.key }: piece "${ piece.id }" stays as the draft draws it: the surface's draft has no logic to read what feeds it` ] };
	}
	return 'image' === piece.find?.field ? placeGallery( ctx, piece, index, L ) : placeHole( ctx, piece, index, L );
}
