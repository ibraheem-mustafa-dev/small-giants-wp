// A node that draws every record of a query with its one set of settings (the skeleton's `eachRecord`: the product card inside
// WooCommerce's product template, on the shop and in the related products) draws each record in turn, so the look of the one
// copy Fill reads never chooses its block's variant (blocks.variant_attr, `variantStyle` on sgs/product-card): the first
// product's "trial" strip is not every product's. A slide standing for every slide (`itemTemplate` alone) is not held: its
// variant is the design every slide shares. The variant setting is registered as the node's own (lib/fill-prop.mjs::OWNED) at the value the node
// already holds, else the block's default, so no styling answer and no presence evidence (lib/fill-presence.mjs) changes it;
// the draft's look is then answered by the block's plain settings. Nothing is written.
import { variantInfo } from './db.mjs';
import { OWNED } from './fill-prop.mjs';

// nodes: lib/fill-skeleton.mjs::skeletonNodes; flat[index]: the tree node; schemaOf( block ): its block.json attributes.
// Returns the notes naming each node held.
export function holdItemVariants( { nodes, flat, db, schemaOf, refOf } ) {
	const notes = [];
	for ( const rec of nodes ) {
		if ( ! rec.node?.eachRecord ) {
			continue;
		}
		const attr = variantInfo( db, rec.name ).variantAttr;
		const node = flat[ rec.index ];
		if ( ! attr || ! node ) {
			continue;
		}
		const value = node.attributes?.[ attr ] ?? schemaOf( rec.name )?.[ attr ]?.default;
		if ( undefined === value ) {
			continue;
		}
		OWNED.set( node, { ...( OWNED.get( node ) ?? {} ), [ attr ]: value } );
		notes.push( `${ refOf( node ) } ${ rec.name }: draws every record of its query, so its ${ attr } stays ${ JSON.stringify( value ) }; one copy's look never chooses the variant` );
	}
	return notes;
}
