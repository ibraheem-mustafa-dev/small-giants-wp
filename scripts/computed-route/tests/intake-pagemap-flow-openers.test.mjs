// Spec 48 FR-48-30, Spec 43 FR-43-25 (register A1): a row whose page holds a control whose click handler makes a choice flow or
// modal surface's opening writes lists that row in `opens` ([ { kind, slug } ]), read from the draft code
// (lib/intake-pagemap-flow-openers.mjs).
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
import { openingWrites, pageOpeners, fnWrites } from '../lib/intake-pagemap-flow-openers.mjs';
import { mapChanges } from '../lib/intake-pagemap-regen.mjs';
import { loadExport, readRouting } from '../lib/intake-routing.mjs';
import { codeSurfaces } from '../lib/intake-pagemap-surfaces.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'flow-opener' );
const HINT = JSON.parse( fs.readFileSync( path.join( FIX, 'surfaces.json' ), 'utf8' ) );
const product = ( map ) => map.rows.find( ( r ) => 'product' === r.postType );
// The flow slugs a row opens.
const flowsOf = ( row ) => ( row.opens || [] ).filter( ( o ) => 'flow' === o.kind ).map( ( o ) => o.slug );

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
	assert.deepEqual( flowsOf( product( map ) ), [ 'choice-flow-add-lenses' ] );
	assert.deepEqual( map.rows.filter( ( r ) => r.opens ).map( ( r ) => r.slug ), [ 'product' ], 'only the product row opens anything' );
	assert.deepEqual( pageMapProblems( map.rows ), [], 'the map with opens validates' );
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

test( 'MUST FAIL: the product row also lists the modal the "Which size am I?" button opens, beside the flow, in a fixed order', () => {
	const modal = proposePageMap( { folder: FIX } ).rows.find( ( r ) => 'sgs_modal' === r.postType );
	assert.ok( modal, 'the size guide is a modal row' );
	assert.deepEqual( product( proposePageMap( { folder: FIX } ) ).opens, [ { kind: 'flow', slug: 'choice-flow-add-lenses' }, { kind: 'modal', slug: modal.slug } ] );
	const closed = product( proposePageMap( { folder: variant( '<button onClick="{{ openSize }}">', '<button onClick="{{ closeModal }}">' ) } ) );
	assert.deepEqual( closed.opens, [ { kind: 'flow', slug: 'choice-flow-add-lenses' } ], 'a handler that closes the modal opens none' );
} );

test( 'negative control: a product button that closes the flow, or only steps it, names none', () => {
	const modalOnly = [ { kind: 'modal', slug: 'modal-size-guide' } ];
	const opens = ( dir ) => product( proposePageMap( { folder: dir } ) ).opens?.filter( ( o ) => 'flow' === o.kind );
	assert.deepEqual( opens( variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ closeLens }}">' ) ), [] );
	assert.deepEqual( opens( variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ addFrame }}">' ) ), [] );
	assert.equal( product( proposePageMap( { folder: FIX, surfacesHint: null } ) ).opens, undefined, 'no surfaces.json record, no how_to_reach to match' );
	void modalOnly;
} );

test( 'MUST FAIL: a handler calling a class method whose updater returns from a block names the flow too', () => {
	const dir = variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ openFlowNow }}">' );
	const file = path.join( dir, 'Store.dc.html' );
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( '  go(p) {', '  openFlow() { this.setState(s => { return { lens: { ...s.lens, open: true } }; }); }\n  go(p) {' )
		.replace( '      openLens: () =>', '      openFlowNow: () => this.openFlow(),\n      openLens: () =>' ) );
	assert.deepEqual( flowsOf( product( proposePageMap( { folder: dir } ) ) ), [ 'choice-flow-add-lenses' ] );
} );

test( 'MUST FAIL: a handler reaching the opening method through `this.x = this.y.bind(this)` names the flow (lib/intake-census-map.mjs::fnsNamed)', () => {
	const dir = variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ openFlowNow }}">' );
	const file = path.join( dir, 'Store.dc.html' );
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( '  go(p) {', '  constructor(props) { super(props); this.openBound = this.openFlow.bind(this); }\n  openFlow() { this.setState(s => ({ lens: { ...s.lens, open: true } })); }\n  go(p) {' )
		.replace( '      openLens: () =>', '      openFlowNow: () => this.openBound(),\n      openLens: () =>' ) );
	assert.deepEqual( flowsOf( product( proposePageMap( { folder: dir } ) ) ), [ 'choice-flow-add-lenses' ] );
	// Negative control: the field bound to a method that only steps the flow opens nothing.
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( 'this.openFlow.bind(this)', 'this.go.bind(this)' ) );
	assert.deepEqual( flowsOf( product( proposePageMap( { folder: dir } ) ) ), [] );
} );

test( 'MUST FAIL: a product page opening two flows lists both and leaves a gap row', () => {
	const exp = loadExport( FIX );
	const route = readRouting( { folder: FIX } );
	const code = codeSurfaces( exp, () => null, new Set( route.routes.map( ( x ) => x.key ) ), route.links );
	const rows = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' }, { slug: 'flow-b', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' } ];
	const gaps = pageOpeners( { exp, rows, hint: HINT, pageOfTag: code.pageOfTag } );
	assert.deepEqual( rows[ 0 ].opens, [ { kind: 'flow', slug: 'flow-a' }, { kind: 'flow', slug: 'flow-b' } ] );
	assert.deepEqual( gaps.map( ( g ) => g.draftId ), [ 'product' ] );
	assert.match( gaps[ 0 ].error, /2 choice flows \(flow-a, flow-b\)/ );
	const one = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' }, { slug: 'size', postType: 'sgs_modal', draftId: 'surfaces.json S-03' } ];
	assert.deepEqual( pageOpeners( { exp, rows: one, hint: HINT, pageOfTag: code.pageOfTag } ), [] );
	assert.deepEqual( one[ 0 ].opens, [ { kind: 'flow', slug: 'flow-a' }, { kind: 'modal', slug: 'size' } ], 'a modal row is a modal, a flow row a flow' );
	const odd = [ { route: 'product', slug: 'product', postType: 'product' }, { route: 'product', slug: 'twin', postType: 'page' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' } ];
	assert.deepEqual( pageOpeners( { exp, rows: odd, hint: HINT, pageOfTag: code.pageOfTag } ), [] );
	assert.deepEqual( odd.map( ( r ) => r.opens ), [ [ { kind: 'flow', slug: 'flow-a' } ], [ { kind: 'flow', slug: 'flow-a' } ], undefined ], 'every row of the page opens it; a target row opens nothing' );
	const plain = [ { route: 'product', slug: 'lenses', postType: 'page' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' }, { slug: 'flow-b', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-04' } ];
	assert.deepEqual( pageOpeners( { exp, rows: plain, hint: HINT, pageOfTag: code.pageOfTag } ), [], 'a page that is no product links no flow, so two are no gap' );
	assert.equal( plain[ 0 ].opens.length, 2 );
	const bare = [ { route: 'product', slug: 'product', postType: 'product' }, { slug: 'flow-a', postType: 'sgs_choice_flow', draftId: 'surfaces.json S-09' } ];
	pageOpeners( { exp, rows: bare, hint: { records: [ ...HINT.records, { id: 'S-09', kind: 'modal', name: 'No states' } ] }, pageOfTag: code.pageOfTag } );
	assert.equal( bare[ 0 ].opens, undefined, 'a flow record with no open state matches no handler' );
} );

test( 'MUST FAIL: the schema refuses an opens entry with no slug or an unknown kind, and a page-map regeneration prints the change', () => {
	const map = proposePageMap( { folder: FIX } );
	const bad = ( opens ) => map.rows.map( ( r ) => ( 'product' === r.postType ? { ...r, opens } : r ) );
	assert.ok( pageMapProblems( bad( [ { kind: 'flow', slug: 'Add Lenses' } ] ) ).some( ( p ) => /opens/.test( p ) ), 'a bad slug is refused' );
	assert.ok( pageMapProblems( bad( [ { kind: 'form', slug: 'x' } ] ) ).some( ( p ) => /opens/.test( p ) ), 'an unknown kind is refused' );
	assert.deepEqual( pageMapProblems( bad( [ { kind: 'modal', slug: 'x' } ] ) ), [] );
	const before = map.rows.map( ( r ) => { const { opens, ...rest } = r; void opens; return rest; } );
	const changes = mapChanges( before, map.rows );
	assert.equal( changes.length, 1 );
	assert.match( changes[ 0 ], /^product:product: opens \(none\) -> \[\{"kind":"flow","slug":"choice-flow-add-lenses"\},\{"kind":"modal"/ );
} );
