// A node that stands for every item of a loop (the skeleton's `itemTemplate`: the product card inside WooCommerce's product
// template, a slide standing for every slide) draws each item in turn, so the look of the one copy Fill reads never chooses
// its block's variant (blocks.variant_attr, `variantStyle` on sgs/product-card): the first product's "trial" strip is not
// every product's. The variant setting is registered as the node's own (lib/fill-prop.mjs::OWNED) at the value the node
// already holds, else the block's default, so no styling answer and no presence evidence (lib/fill-presence.mjs) changes it;
// the draft's look is then answered by the block's plain settings. Nothing is written.
import { variantInfo } from './db.mjs';
import { OWNED } from './fill-prop.mjs';

// nodes: lib/fill-skeleton.mjs::skeletonNodes; flat[index]: the tree node; schemaOf( block ): its block.json attributes.
// Returns the notes naming each node held.
export function holdItemVariants( { nodes, flat, db, schemaOf, refOf } ) {
	const notes = [];
	for ( const rec of nodes ) {
		if ( ! rec.node?.itemTemplate ) {
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
		notes.push( `${ refOf( node ) } ${ rec.name }: stands for every item of its loop, so its ${ attr } stays ${ JSON.stringify( value ) }; one copy's look never chooses the variant` );
	}
	return notes;
}
