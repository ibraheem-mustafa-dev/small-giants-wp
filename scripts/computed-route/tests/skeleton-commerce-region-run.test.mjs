// The commerce region's run (lib/skeleton-commerce-region.mjs::regionRun, passed by skeleton.mjs::proposeSurface to the pieces
// pass as paint.runs): the shop's product collection, placed by the rules for the draft's listing, stands for every draft
// element inside the listing, state copies included, so their unread paint is the collection's missing feature
// (lib/template-pieces-context.mjs::piecesPaint), not a propose refusal. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { regionRun } from '../lib/skeleton-commerce-region.mjs';

const el = ( key, parentKey, extra = {} ) => ( { key, parentKey, tag: 'div', ...extra } );
const INVENTORY = {
	elements: [ el( 'Root/1#0', null ), el( 'Root/2#0', 'Root/1#0' ), el( 'Root/3#0', 'Root/2#0' ), el( 'Root/4#0', 'Root/3#0' ), el( 'Root/9#0', 'Root/1#0' ) ],
	revealed: [ el( 'Root>Card@3#1/0#0', 'Root/2#0' ) ],
};
const PROPOSAL = { commerceRegion: { key: 'Root/2#0', role: 'shop', block: 'woocommerce/product-collection' } };
const card = { name: 'sgs/product-card', attributes: {}, draftRef: { tpl: 'Root/3#0' }, innerBlocks: [] };
const TREE = ( extra = [] ) => [ { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/1#0' }, innerBlocks: [
	{ name: 'woocommerce/product-collection', attributes: {}, innerBlocks: [ { name: 'woocommerce/product-template', attributes: {}, innerBlocks: [ card ] } ] },
	{ name: 'sgs/text', attributes: { text: 'x' }, draftRef: { tpl: 'Root/9#0' }, innerBlocks: [] },
	...extra,
] } ];

test( 'MUST FAIL: the rules\' block standing for the whole region reports the region as its run', () => {
	assert.deepEqual( regionRun( { proposal: PROPOSAL, skeleton: TREE(), inventory: INVENTORY } ), { id: 'commerce-region', block: 'woocommerce/product-collection', at: 'Root/2#0', run: [ 'Root/2#0' ] } );
} );

test( 'a region whose draft elements keep nodes outside the block, two such blocks, a linked block or no region report none', () => {
	assert.equal( regionRun( { proposal: PROPOSAL, skeleton: TREE( [ { name: 'sgs/text', attributes: {}, draftRef: { tpl: 'Root/4#0' }, innerBlocks: [] } ] ), inventory: INVENTORY } ), null, 'a node outside the block built from inside the region' );
	assert.equal( regionRun( { proposal: PROPOSAL, skeleton: TREE( [ { name: 'woocommerce/product-collection', attributes: {}, innerBlocks: [] } ] ), inventory: INVENTORY } ), null, 'two blocks' );
	assert.equal( regionRun( { proposal: { commerceRegion: { ...PROPOSAL.commerceRegion, block: 'core/post-content' } }, skeleton: TREE(), inventory: INVENTORY } ), null, 'no node of the block' );
	assert.equal( regionRun( { proposal: {}, skeleton: TREE(), inventory: INVENTORY } ), null, 'no region' );
	assert.equal( regionRun( { proposal: { commerceRegion: { note: 'several' } }, skeleton: TREE(), inventory: INVENTORY } ), null, 'a region left as a note' );
} );
