// Spec 48 FR-48-100: the site build sets a choice flow's `flowProductId` from the catalogue product its draft adds to the
// basket (lib/site-build-flow-product.mjs, called by lib/site-build-plan.mjs::planBuild), so the flow renders a real product
// id and never `data-flow-product-id="0"`. Fixture tests/fixtures/flow-product/handoff: the Home component's "Add to basket"
// adds the catalogue product `box` (a `cart.add` whose argument holds the literal draft id); the Lenses component's flow adds
// whatever frame its page shows (a state value, no literal), so it names none.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { basketIdsOf, flowProductIds, withFlowProduct } from '../lib/site-build-flow-product.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOLDER = path.join( HERE, 'fixtures', 'flow-product', 'handoff' );
const CATALOGUE = { products: [ { draftId: 'box' }, { draftId: 'trio' }, { draftId: '5' } ], sites: { 'local-x': { products: { box: { id: 257 }, trio: { id: 282 } } } } };
const FLOWS = [
	{ slug: 'choice-flow-build-your-box', title: 'Build your box', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-08', collection: 'static', parent: null, template: null, menus: [], flags: [], id: null },
	{ slug: 'choice-flow-add-lenses', title: 'Add lenses', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-09', collection: 'static', parent: null, template: null, menus: [], flags: [], id: null },
];
const TREE = [ { name: 'sgs/choice-flow', attributes: { flowLayout: 'compact' }, innerBlocks: [ { name: 'sgs/form-step', attributes: {} } ] } ];

test( 'MUST FAIL: the flow whose basket call names one catalogue product takes that product\'s site id', () => {
	assert.deepEqual( basketIdsOf( FOLDER, 'Home', [ 'box', 'trio', '5' ] ), [ 'box' ] );
	const form = { slug: 'form-box', postType: 'sgs_form', draftId: 'surfaces.json S-08' };
	const { ids, notes } = flowProductIds( { rows: [ ...FLOWS, form ], folder: FOLDER, catalogue: CATALOGUE, site: 'local-x' } );
	assert.deepEqual( ids, { 'choice-flow-build-your-box': 257 } );
	assert.deepEqual( notes, [ 'flow choice-flow-add-lenses: its draft\'s basket calls name no catalogue product, so flowProductId stays unset (the flow prices the product page that opens it)' ] );
} );

test( 'MUST FAIL: the site build writes the id onto the flow block of the flow post\'s tree', () => {
	const tree = withFlowProduct( TREE, FLOWS[ 0 ], { 'choice-flow-build-your-box': 257 } );
	assert.equal( tree[ 0 ].attributes.flowProductId, 257 );
	assert.equal( tree[ 0 ].attributes.flowLayout, 'compact' );
	assert.equal( TREE[ 0 ].attributes.flowProductId, undefined, 'the stored tree is not changed' );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'flow-product-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build', 'trees', 'sgs_choice_flow' ), { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'build', 'trees', 'sgs_choice_flow', 'choice-flow-build-your-box.json' ), JSON.stringify( TREE ) );
	const state = { holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [], templates: { page: [] }, options: {}, pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [] };
	const plan = planBuild( { rows: [ FLOWS[ 0 ] ], state, repo, client: 'c', flowProducts: { 'choice-flow-build-your-box': 257 } } );
	const create = plan.actions.find( ( a ) => 'create' === a.type && a.slug === 'choice-flow-build-your-box' );
	assert.equal( create?.tree[ 0 ].attributes.flowProductId, 257 );
} );

test( 'negative control: no product, two products, a product not on the site and a non-flow row leave the setting unset', () => {
	assert.deepEqual( basketIdsOf( FOLDER, 'Lenses', [ 'box', '5' ] ), [], 'a state value is no literal id' );
	const two = { ...CATALOGUE, products: [ ...CATALOGUE.products, { draftId: 'Box' } ] };
	assert.deepEqual( basketIdsOf( FOLDER, 'Home', two.products.map( ( p ) => p.draftId ) ), [ 'box' ], 'a word in a name is no id' );
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'flow-product-two-' ) );
	fs.copyFileSync( path.join( FOLDER, 'surfaces.json' ), path.join( dir, 'surfaces.json' ) );
	fs.writeFileSync( path.join( dir, 'Home.dc.html' ), fs.readFileSync( path.join( FOLDER, 'Home.dc.html' ), 'utf8' ).replace( "addTrial: () => window.track('trio'),", "addTrial: () => cart.add({ id: 'trio', qty: 1 })," ) );
	const both = flowProductIds( { rows: FLOWS.slice( 0, 1 ), folder: dir, catalogue: CATALOGUE, site: 'local-x' } );
	assert.deepEqual( both.ids, {} );
	assert.match( both.notes[ 0 ], /name 2 catalogue products \(box, trio\)/ );
	const away = flowProductIds( { rows: FLOWS.slice( 0, 1 ), folder: FOLDER, catalogue: CATALOGUE, site: 'local-y' } );
	assert.deepEqual( away.ids, {} );
	assert.match( away.notes[ 0 ], /catalogue\.json records on no product of local-y/ );
	assert.deepEqual( flowProductIds( { rows: FLOWS, folder: FOLDER, catalogue: null, site: 'local-x' } ).ids, {}, 'no catalogue, no product' );
	assert.equal( withFlowProduct( TREE, { ...FLOWS[ 0 ], postType: 'page' }, { 'choice-flow-build-your-box': 257 } ), TREE );
	assert.equal( withFlowProduct( TREE, FLOWS[ 1 ], { 'choice-flow-build-your-box': 257 } ), TREE );
} );
