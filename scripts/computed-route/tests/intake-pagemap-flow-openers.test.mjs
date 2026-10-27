// Spec 48 FR-48-30, Spec 43 FR-43-25: a product row whose page holds a control whose click handler makes a choice flow
// surface's opening writes names that flow (`opensFlow`), read from the draft code (lib/intake-pagemap-flow-openers.mjs).
// Fixture tests/fixtures/flow-opener: one draft routed by state; the product page's "Add my prescription" button calls a
// local `setL` helper that merges its patch into the `lens` state through an updater and Object.assign; the bag drawer's
// "Add lenses" opens the same flow from no page; the lenses page only links to the shop. Negative controls rewrite the
// product button's handler in a temp copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, pageMapProblems } from '../lib/intake-pagemap.mjs';
import { openingWrites, flowOpeners, fnWrites } from '../lib/intake-pagemap-flow-openers.mjs';
import { mapChanges } from '../lib/intake-pagemap-regen.mjs';
import { loadExport, readRouting } from '../lib/intake-routing.mjs';
import { codeSurfaces } from '../lib/intake-pagemap-surfaces.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'flow-opener' );
const HINT = JSON.parse( fs.readFileSync( path.join( FIX, 'surfaces.json' ), 'utf8' ) );
const product = ( map ) => map.rows.find( ( r ) => 'product' === r.postType );

// A temp copy of the fixture with the draft text rewritten.
function variant( find, replace ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'flow-opener-' ) );
	fs.copyFileSync( path.join( FIX, 'surfaces.json' ), path.join( dir, 'surfaces.json' ) );
	const text = fs.readFileSync( path.join( FIX, 'Store.dc.html' ), 'utf8' );
	assert.equal( text.split( find ).length, 2, `the fixture holds "${ find }" once` );
	fs.writeFileSync( path.join( dir, 'Store.dc.html' ), text.replace( find, replace ) );
	return dir;
}

test( 'MUST FAIL: the product row names the flow its page\'s button opens through a local helper and an updater', () => {
	const map = proposePageMap( { folder: FIX } );
	assert.equal( product( map ).opensFlow, 'choice-flow-add-lenses' );
	assert.deepEqual( map.rows.filter( ( r ) => r.opensFlow ).map( ( r ) => r.slug ), [ 'product' ], 'only the product row names a flow' );
	assert.deepEqual( pageMapProblems( map.rows ), [], 'the map with opensFlow validates' );
} );

test( 'MUST FAIL: a flow\'s opening writes are the values every open state sets, less a width condition and the closed state', () => {
	assert.deepEqual( openingWrites( HINT.records.find( ( r ) => 'S-04' === r.id ) ), [ 'lens.open=true' ] );
	assert.deepEqual( openingWrites( HINT.records.find( ( r ) => 'S-03' === r.id ) ), [ 'modal="size"' ] );
	const one = { states: [ { name: 'open', state_keys: { lens: '{open:true}', w: '768–1023' }, how_to_reach: 'L.setState({lens:{open:true, step:-1}, w:900, flag:null})' } ] };
	assert.deepEqual( openingWrites( one ), [ 'lens.open=true', 'lens.step=-1', 'flag=null' ] );
	assert.deepEqual( openingWrites( { states: [ { name: 'open', how_to_reach: 'click the button' } ] } ), [], 'no setState call, no writes' );
	assert.deepEqual( openingWrites( { states: [ { name: 'open', how_to_reach: 'L.setState({lens:{open:true}' } ] } ), [], 'an unclosed call writes nothing' );
	assert.deepEqual( openingWrites( { states: [ { name: 'Default', how_to_reach: 'L.setState({a:1})' } ] } ), [], 'a default state is no open state' );
} );

test( 'MUST FAIL: a handler\'s writes follow helpers, parameters, spreads and Object.assign', () => {
	const exp = loadExport( FIX );
	const d = exp.drafts[ 0 ];
	const fn = ( name ) => d.idx.all.find( ( n ) => 'ObjectProperty' === n.type && name === n.key.name ).value;
	assert.deepEqual( [ ...fnWrites( d.idx, fn( 'openLens' ) ) ].sort(), [ 'lens.open=true', 'lens.step=0', 'lens.use=null' ] );
	assert.deepEqual( [ ...fnWrites( d.idx, fn( 'closeLens' ) ) ], [ 'lens.open=false' ] );
	assert.deepEqual( [ ...fnWrites( d.idx, fn( 'reopenLens' ) ) ].sort(), [ 'lens.open=true', 'lens.step=0' ], 'a spread of a const object is read from its declaration' );
	assert.deepEqual( [ ...fnWrites( d.idx, fn( 'toShop' ) ) ], [ 'page="shop"' ], 'a method call binds its argument' );
} );

test( 'negative control: a product button that closes the flow, or only steps it, names none', () => {
	assert.equal( product( proposePageMap( { folder: variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ closeLens }}">' ) } ) ).opensFlow, undefined );
	assert.equal( product( proposePageMap( { folder: variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ addFrame }}">' ) } ) ).opensFlow, undefined );
	assert.equal( product( proposePageMap( { folder: FIX, surfacesHint: null } ) ).opensFlow, undefined, 'no surfaces.json record, no how_to_reach to match' );
} );

test( 'MUST FAIL: a handler calling a class method whose updater returns from a block names the flow too', () => {
	const dir = variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ openFlowNow }}">' );
	const file = path.join( dir, 'Store.dc.html' );
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( '  go(p) {', '  openFlow() { this.setState(s => { return { lens: { ...s.lens, open: true } }; }); }\n  go(p) {' )
		.replace( '      openLens: () =>', '      openFlowNow: () => this.openFlow(),\n      openLens: () =>' ) );
	assert.equal( product( proposePageMap( { folder: dir } ) ).opensFlow, 'choice-flow-add-lenses' );
} );

test( 'MUST FAIL: a product page opening two flows records neither and leaves a gap row', () => {
	const exp = loadExport( FIX );
	const route = readRouting( { folder: FIX } );
	const code = codeSurfaces( exp, () => null, new Set( route.routes.map( ( x ) => x.key ) ), route.links );
	const rows = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' }, { slug: 'flow-b', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' } ];
	const gaps = flowOpeners( { exp, rows, hint: HINT, pageOfTag: code.pageOfTag } );
	assert.equal( rows[ 0 ].opensFlow, undefined );
	assert.deepEqual( gaps.map( ( g ) => g.draftId ), [ 'product' ] );
	assert.match( gaps[ 0 ].error, /2 choice flows \(flow-a, flow-b\)/ );
	const one = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' }, { slug: 'size', postType: 'sgs_modal', draftId: 'surfaces.json S-03' } ];
	assert.deepEqual( flowOpeners( { exp, rows: one, hint: HINT, pageOfTag: code.pageOfTag } ), [] );
	assert.equal( one[ 0 ].opensFlow, 'flow-a', 'a modal row is no flow' );
	const odd = [ { route: 'product', slug: 'product', postType: 'product' }, { route: 'product', slug: 'twin', postType: 'page' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' } ];
	flowOpeners( { exp, rows: odd, hint: HINT, pageOfTag: code.pageOfTag } );
	assert.deepEqual( odd.map( ( r ) => r.opensFlow ), [ 'flow-a', undefined, undefined ], 'only a product row names the flow' );
	const bare = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-09' } ];
	flowOpeners( { exp, rows: bare, hint: { records: [ ...HINT.records, { id: 'S-09', kind: 'modal', name: 'No states' } ] }, pageOfTag: code.pageOfTag } );
	assert.equal( bare[ 0 ].opensFlow, undefined, 'a flow record with no open state matches no handler' );
} );

test( 'MUST FAIL: the schema refuses an opensFlow that is no slug, and a page-map regeneration prints the change', () => {
	const map = proposePageMap( { folder: FIX } );
	const bad = map.rows.map( ( r ) => ( 'product' === r.postType ? { ...r, opensFlow: 'Add Lenses' } : r ) );
	assert.ok( pageMapProblems( bad ).some( ( p ) => /opensFlow/.test( p ) ), 'a bad opensFlow is refused' );
	const before = map.rows.map( ( r ) => { const { opensFlow, ...rest } = r; void opensFlow; return rest; } );
	assert.deepEqual( mapChanges( before, map.rows ), [ 'product:product: opensFlow (none) -> "choice-flow-add-lenses"' ] );
} );
