// A calibration fixture variant of null removes the attribute (a layer with no image), so the page builder never refuses the
// instance for an object setting given null (sgs/decorative-image lost 36 instances and its default, 2026-10-25).
import test from 'node:test';
import assert from 'node:assert/strict';
import { variantAttributes } from '../lib/calibrate-instances.mjs';

test( 'MUST FAIL: a null variant value removes the attribute, other values override, the base stays', () => {
	const base = { decorMedia: { id: 1, url: 'x' }, width: { desktop: 200 } };
	assert.deepEqual( variantAttributes( base, { decorMedia: null } ), { width: { desktop: 200 } } );
	assert.deepEqual( variantAttributes( base, { width: { desktop: 300 } } ), { decorMedia: { id: 1, url: 'x' }, width: { desktop: 300 } } );
	assert.deepEqual( variantAttributes( base, {} ), base );
	assert.ok( ! Object.hasOwn( variantAttributes( base, { decorMedia: null } ), 'decorMedia' ) );
} );

// The null-removal holds at every place a variant is merged: the tree builder (it restored the key from the fixture base)
// and the content planner (it spread variant 0 raw, null included).
test( 'MUST FAIL: a planned instance of a no-image variant reaches the tree without the removed attribute', async () => {
	const { buildTree, planInstances } = await import( '../lib/calibrate.mjs' );
	const fixture = { attributes: { decorMedia: { id: 1, url: 'x' }, width: { desktop: 200 } }, variants: [ { decorMedia: null } ] };
	const { instances } = planInstances( 'sgs/x', { rows: [], schema: {}, snapshot: {}, fixture } );
	const tree = buildTree( 'sgs/x', fixture, instances );
	const attrs = tree[ 0 ].innerBlocks.at( -1 ).attributes;
	assert.ok( ! Object.hasOwn( attrs, 'decorMedia' ), 'the fixture base must not restore the removed attribute' );
	assert.deepEqual( attrs.width, { desktop: 200 } );
} );

test( 'MUST FAIL: the content planner drops a null variant value instead of carrying null', async () => {
	const { planContentInstances } = await import( '../lib/calibrate-content.mjs' );
	const fixture = { attributes: { decorMedia: { id: 1, url: 'x' } }, variants: [ { decorMedia: null } ] };
	const contentRows = { presence: [], text: [], link: [ { attr_name: 'ctaUrl', attr_type: 'string', css_property: null, role: 'link-href' } ] };
	const { instances } = planContentInstances( 'sgs/x', { contentRows, variant: { variantAttr: null, variantSlots: [] }, schema: { ctaUrl: { type: 'string' } }, fixture, ctx: {} } );
	assert.ok( instances.length > 0 );
	for ( const i of instances ) {
		assert.ok( ! Object.hasOwn( i.attrs, 'decorMedia' ), `${ i.key } carries the removed attribute` );
	}
} );
