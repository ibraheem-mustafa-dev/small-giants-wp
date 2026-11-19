// The order confirmation reaches the route as a surface of its own (Spec 48 FR-48-96): intake reads a result record that is a
// page of its own like a page (lib/intake-skeletons.mjs::surfaceRoots), the manifest matches the confirmation's template row
// to that record (lib/manifest-build.mjs::matchRecord) so its copy is Filled at it, and the copy is the whole Filled tree in
// the theme's frame (lib/template-copies.mjs::WHOLE_TREE, site-run.mjs::copyTrees), as the basket's and checkout's are.
// Tests marked MUST FAIL fail without the wiring they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRoots } from '../lib/intake-skeletons.mjs';
import { matchRecord, templateSurfaces } from '../lib/manifest-build.mjs';
import { WHOLE_TREE, copySource } from '../lib/template-copies.mjs';
import { copyTrees } from '../site-run.mjs';

const census = { rows: [
	{ kind: 'template-element', draftId: 'Confirmation:6', component: 'Confirmation', detail: { tag: 'div' } },
	{ kind: 'template-element', draftId: 'Gifts:9', component: 'Gifts', detail: { tag: 'div' } },
	{ kind: 'template-element', draftId: 'Gifts:40', component: 'Gifts', detail: { tag: 'section' } },
] };
const CONFIRMED = { id: 'S-32', kind: 'result', name: 'Order confirmation', dc: 'Confirmation', template_tpl_id: '6', route: 'Confirmation.dc.html', page_key: 'Confirmation', parent: null, states: [ { name: 'with gift note', state_keys: { hasNote: true } } ] };
const RESULTS = { id: 'S-21', kind: 'result', name: 'Gift results', dc: 'Gifts', template_tpl_id: '40', route: 'Gifts.dc.html#results', page_key: null, parent: 'S-19', states: [] };
const ROW = { slug: 'order-confirmation', title: 'Order confirmed', template: 'order-confirmation', postType: 'template', route: 'Confirmation.dc.html', id: null };

test( 'MUST FAIL: a result record that is a page of its own is read like a page; a result inside a page stays a part', () => {
	const r = surfaceRoots( { folder: null, census, records: [ CONFIRMED, RESULTS ] } );
	assert.deepEqual( r.gaps, [] );
	assert.deepEqual( r.surfaces.map( ( s ) => [ s.id, s.kind, s.slug, s.rootTpl ] ), [ [ 'S-32', 'page', 'page-confirmation-dc-html', '6' ] ] );
	assert.deepEqual( r.parts.map( ( p ) => [ p.id, p.kind ] ), [ [ 'S-21', 'result' ] ] );
	// A result with a page key that sits inside another surface is still a part.
	const inside = surfaceRoots( { folder: null, census, records: [ { ...CONFIRMED, parent: 'S-25' } ] } );
	assert.deepEqual( [ inside.surfaces.length, inside.parts.length ], [ 0, 1 ] );
} );

test( "MUST FAIL: the confirmation's template row matches its result record, so its copy is Filled at it", () => {
	assert.equal( matchRecord( ROW, [ CONFIRMED ] ).record?.id, 'S-32' );
	// A page record of the same route is matched as before, and a page row never takes a result record.
	assert.equal( matchRecord( ROW, [ { ...CONFIRMED, kind: 'page', id: 'S-16' } ] ).record?.id, 'S-16' );
	assert.match( matchRecord( { ...ROW, postType: 'page', template: null, slug: 'confirmation' }, [ CONFIRMED ] ).reason, /no page record matches/ );
	const shop = { slug: 'shop', postType: 'shop', template: 'archive-product', route: 'Shop.dc.html', id: null };
	const copy = templateSurfaces( [ shop, ROW ] ).find( ( c ) => 'order-confirmation' === c.slug );
	assert.deepEqual( copy.copy, { from: 'fill', row: 'template:order-confirmation' } );
} );

test( "MUST FAIL: the confirmation's copy is the whole Filled tree in the theme's frame, not its shell around the theme's content", () => {
	assert.ok( WHOLE_TREE.includes( 'order-confirmation' ) );
	assert.equal( copySource( [ ROW ], 'order-confirmation' ), 'whole' );
	const filled = [ { name: 'sgs/container', attributes: { tagName: 'main' }, innerBlocks: [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'sgs/order-items', attributes: {} } ] } ] } ];
	const surfaces = { 'template-order-confirmation': { target: { template: 'order-confirmation' }, copy: { from: 'fill', row: 'template:order-confirmation' } } };
	const out = copyTrees( { surfaces, keys: [ 'template-order-confirmation' ], filled: { 'template-order-confirmation': filled }, buildDir: 'E:/no-such-build' } );
	assert.equal( out[ 'order-confirmation' ].shell, null );
	assert.deepEqual( out[ 'order-confirmation' ].tree.map( ( n ) => n.name ), [ 'core/template-part', 'sgs/container', 'core/template-part' ] );
	assert.ok( JSON.stringify( out[ 'order-confirmation' ].tree ).includes( 'sgs/order-items' ) );
} );
