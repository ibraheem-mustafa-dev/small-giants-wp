// Spec 48 FR-48-95, Spec 43 FR-43-25: a choice flow's product link is made only where the draft's buy box itself opens the
// flow, and only on purchasable products holding options and every attribute the flow prices (lib/site-build-flow-scope.mjs,
// called by lib/site-build-flow-links.mjs::runFlowLinks). The site is an in-memory fake answering the PHP the step sends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowRefusal, productRefusal, scopePlan, shapePhp, flowAttributesPhp, FLOW_LINKS } from '../lib/site-build-flow-scope.mjs';
import { runFlowLinks, flowStatePhp } from '../lib/site-build-flow-links.mjs';
import { openDb } from '../lib/db.mjs';

const FLOW = 'choice-flow-add-lenses';
const buyBox = [ { kind: 'flow', slug: FLOW, buyBox: true } ];
const rows = ( opens = buyBox ) => [
	{ route: 'product', slug: 'product', title: 'Product', postType: 'product', collection: 'live', id: null, opensFlow: FLOW, opens },
	{ slug: FLOW, title: 'Add lenses', postType: 'sgs_choice_flow', collection: 'static', id: 120 },
];
const products = () => [
	{ id: 10, title: 'Round', flow: '', calibration: false, type: 'variable', options: [ 'size', 'colour' ] },
	{ id: 11, title: 'Gift card', flow: '', calibration: false, type: 'sgs_gift_card', options: [ 'amount' ] },
	{ id: 12, title: 'Cloth', flow: '', calibration: false, type: 'simple', options: [] },
	{ id: 13, title: 'Square', flow: '', calibration: false, type: 'variable', options: [ 'colour' ] },
];
const site = ( flowAttributes = {} ) => ( { flows: { [ FLOW ]: 120 }, products: products(), flowAttributes } );
function run( rowsIn, state ) {
	const out = [];
	const code = runFlowLinks( { rows: rowsIn, runPhp: () => JSON.stringify( state ), apply: false, log: ( l ) => out.push( l ), error: ( l ) => out.push( l ) } );
	return { code, planned: out.filter( ( l ) => / -> /.test( l ) ).map( ( l ) => Number( /product (\d+)/.exec( l )[ 1 ] ) ), out };
}

test( 'MUST FAIL: a buy box that opens the flow links only purchasable products with options', () => {
	const r = run( rows(), site() );
	assert.equal( r.code, 0 );
	assert.deepEqual( r.planned, [ 10, 13 ] );
	assert.ok( r.out.includes( 'note: product 11 "Gift card" is a sgs_gift_card, which a flow never links' ) );
	assert.ok( r.out.includes( 'note: product 12 "Cloth" has no options (no variation attribute), so the flow has nothing of it to price' ) );
} );

test( 'MUST FAIL: a flow pricing an attribute links only the products holding it', () => {
	const r = run( rows(), site( { [ FLOW ]: [ 'size' ] } ) );
	assert.deepEqual( r.planned, [ 10 ] );
	assert.ok( r.out.includes( 'note: product 13 "Square" lacks the attribute size the flow prices' ) );
	assert.equal( productRefusal( { id: 1, title: 'A', type: 'variable', options: [ 'size' ] }, [ 'size', 'base' ] ), 'product 1 "A" lacks the attribute base the flow prices' );
	assert.equal( productRefusal( { id: 1, title: 'A', type: 'variable', options: [ 'size', 'base' ] }, [ 'size', 'base' ] ), null );
} );

test( 'MUST FAIL: a flow no buy box opens (an inline flow, or a control elsewhere on the page) links no product', () => {
	for ( const opens of [ null, [], [ { kind: 'flow', slug: FLOW } ], [ { kind: 'modal', slug: FLOW, buyBox: true } ], [ { kind: 'flow', slug: 'other', buyBox: true } ] ] ) {
		const r = run( rows( opens ), site() );
		assert.deepEqual( r.planned, [], JSON.stringify( opens ) );
		assert.equal( r.out.filter( ( l ) => /opens flow "choice-flow-add-lenses" from no buy box/.test( l ) ).length, 1, 'one note, however many products' );
	}
	assert.equal( rowRefusal( rows()[ 0 ] ), null );
	// Two live product rows on one flow cover the same products: the flow is linked when either row's buy box opens it.
	const two = [ ...rows( [] ), { slug: 'other', postType: 'product', collection: 'live', opensFlow: FLOW, opens: buyBox } ];
	const plan = scopePlan( { actions: [ { id: 10, title: 'Round', to: FLOW } ], notes: [], problems: [] }, two, site() );
	assert.deepEqual( plan.actions.map( ( a ) => a.id ), [ 10 ] );
	const back = [ { slug: 'other', postType: 'product', collection: 'live', opensFlow: FLOW, opens: buyBox }, ...rows( [] ) ];
	assert.deepEqual( scopePlan( { actions: [ { id: 10, title: 'Round', to: FLOW } ], notes: [], problems: [] }, back, site() ).actions.map( ( a ) => a.id ), [ 10 ], 'whichever row comes first' );
} );

test( 'MUST FAIL: a static product row covers no product, so its buy box does not justify the live row\'s link', () => {
	const live = rows( [] );
	const staticBox = { slug: 'hand-built', postType: 'product', collection: 'static', opensFlow: FLOW, opens: buyBox };
	const asked = { actions: [ { id: 10, title: 'Round', to: FLOW } ], notes: [], problems: [] };
	for ( const set of [ [ ...live, staticBox ], [ staticBox, ...live ] ] ) {
		const plan = scopePlan( asked, set, site() );
		assert.deepEqual( plan.actions, [], 'the live row opens the flow from no buy box' );
		assert.ok( plan.notes.some( ( n ) => /product row "product" opens flow "choice-flow-add-lenses" from no buy box/.test( n ) ), 'the note names the live row' );
	}
	// Negative control: the live row's own buy box links, whatever static rows say.
	const noBox = { ...staticBox, opens: [] };
	assert.deepEqual( scopePlan( asked, [ ...rows(), noBox ], site() ).actions.map( ( a ) => a.id ), [ 10 ] );
	assert.deepEqual( scopePlan( asked, [ noBox, ...rows() ], site() ).actions.map( ( a ) => a.id ), [ 10 ] );
	// The whole run agrees: the static row's buy box links no product.
	const r = run( [ ...live, staticBox ], site() );
	assert.deepEqual( r.planned, [] );
} );

test( 'negative control: the unscoped plan would link every product', () => {
	const plan = { actions: products().map( ( p ) => ( { id: p.id, title: p.title, to: FLOW } ) ), notes: [], problems: [] };
	assert.equal( plan.actions.length, 4 );
	assert.deepEqual( scopePlan( plan, rows(), site() ).actions.map( ( a ) => a.id ), [ 10, 13 ] );
} );

test( 'MUST FAIL: the state read asks each product its type and variation attributes, and each flow its priced attributes', () => {
	const php = flowStatePhp( [ FLOW ] );
	assert.ok( php.includes( shapePhp( '$p' ) ), 'each product carries its shape' );
	assert.ok( php.includes( flowAttributesPhp( '$post', '$slug' ) ), 'each published flow carries its priced attributes' );
	assert.match( php, /'flowAttributes' => \$flow_attributes/ );
	assert.match( flowAttributesPhp( '$post', '$slug' ), /"sgs\/choice-flow-question" === \$b\['blockName'\]/ );
	assert.match( flowAttributesPhp( '$post', '$slug' ), /\$b\['attrs'\]\[ "productAttribute" \]/ );
	assert.match( shapePhp( '$p' ), /get_variation\(\)/ );
	assert.deepEqual( FLOW_LINKS.productTypes, [ 'simple', 'variable' ] );
	// The settings the data file names are settings the blocks hold (framework DB, read-only).
	const db = openDb();
	const has = ( block, attr ) => !! db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );
	assert.ok( has( 'sgs/choice-flow-question', FLOW_LINKS.pricedSetting ) );
	assert.ok( has( 'sgs/choice-flow', FLOW_LINKS.productSetting ) );
	db.close();
} );
