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
import { openingWrites, openingComponents, flowOpeners, fnWrites, writesOn, opensTarget, ownWrites } from '../lib/intake-pagemap-flow-openers.mjs';
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

test( 'MUST FAIL: a handler reaching the opening method through `this.x = this.y.bind(this)` names the flow (lib/intake-census-map.mjs::fnsNamed)', () => {
	const dir = variant( '<button onClick="{{ openLens }}">', '<button onClick="{{ openFlowNow }}">' );
	const file = path.join( dir, 'Store.dc.html' );
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( '  go(p) {', '  constructor(props) { super(props); this.openBound = this.openFlow.bind(this); }\n  openFlow() { this.setState(s => ({ lens: { ...s.lens, open: true } })); }\n  go(p) {' )
		.replace( '      openLens: () =>', '      openFlowNow: () => this.openBound(),\n      openLens: () =>' ) );
	assert.equal( product( proposePageMap( { folder: dir } ) ).opensFlow, 'choice-flow-add-lenses' );
	// Negative control: the field bound to a method that only steps the flow opens nothing.
	fs.writeFileSync( file, fs.readFileSync( file, 'utf8' ).replace( 'this.openFlow.bind(this)', 'this.go.bind(this)' ) );
	assert.equal( product( proposePageMap( { folder: dir } ) ).opensFlow, undefined );
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

// A how_to_reach call that names its component (`dcLogic('Home').setState(…)`, lib/intake-reach-calls.mjs) runs on that
// component only, so only a handler in that component's draft makes its writes. Before, the names were dropped: on Mama's,
// the Home build form's `dcLogic('Home').setState({ sub: true })` matched the product page's own subscribe button
// (Product.dc.html's pickSub), so the product row named the Home form as the flow its buy box opens.
function hintVariant( reach ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'flow-opener-' ) );
	fs.copyFileSync( path.join( FIX, 'Store.dc.html' ), path.join( dir, 'Store.dc.html' ) );
	const hint = structuredClone( HINT );
	hint.records.find( ( r ) => 'S-04' === r.id ).states.filter( ( st ) => /^open/.test( st.name ) ).forEach( ( st ) => ( st.how_to_reach = reach ) );
	fs.writeFileSync( path.join( dir, 'surfaces.json' ), JSON.stringify( hint ) );
	return dir;
}

test( 'MUST FAIL: a flow whose open states run on another component (dcLogic(\'Home\')) is opened by no button of the product page\'s draft', () => {
	assert.equal( product( proposePageMap( { folder: hintVariant( "dcLogic('Home').setState({lens:{open:true}})" ) } ) ).opensFlow, undefined );
	assert.deepEqual( [ ...openingComponents( { states: [ { name: 'open', how_to_reach: "dcLogic('Home').setState({ sub: true })" } ] } ) ], [ 'Home' ] );
} );

test( 'negative controls: the same call naming the product page\'s own component, or a call naming none, still names the flow', () => {
	assert.equal( product( proposePageMap( { folder: hintVariant( "dcLogic('Store').setState({lens:{open:true}})" ) } ) ).opensFlow, 'choice-flow-add-lenses' );
	assert.equal( product( proposePageMap( { folder: hintVariant( "dcLogic(`Store`)?.setState({lens:{open:true}})" ) } ) ).opensFlow, 'choice-flow-add-lenses', 'a backtick name and ?.setState name the component too' );
	assert.equal( product( proposePageMap( { folder: hintVariant( 'L.setState({lens:{open:true}})' ) } ) ).opensFlow, 'choice-flow-add-lenses' );
	assert.deepEqual( [ ...openingComponents( HINT.records.find( ( r ) => 'S-04' === r.id ) ) ], [ 'Store' ], 'a plain ident call runs on the record\'s own component' );
	assert.equal( openingComponents( { states: [ { name: 'open', how_to_reach: "dcLogic('Home').setState({a:1}); L.setState({b:2})" } ] } ), null, 'a call naming none in a record with no dc: every component' );
	assert.equal( openingComponents( { dc: 'Home', states: [ { name: 'Default', how_to_reach: "dcLogic('Home').setState({a:1})" } ] } ), null, 'a default state is no open state' );
} );

// A call naming no component runs on the record's own component (`dc`): a Claude Design export that fills
// `how_to_reach_structured` (whose setState names no component) must not bring the product-row fault back.
function recordVariant( edit ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'flow-opener-' ) );
	fs.copyFileSync( path.join( FIX, 'Store.dc.html' ), path.join( dir, 'Store.dc.html' ) );
	const hint = structuredClone( HINT );
	edit( hint.records.find( ( r ) => 'S-04' === r.id ) );
	fs.writeFileSync( path.join( dir, 'surfaces.json' ), JSON.stringify( hint ) );
	return dir;
}
const structured = ( dc ) => ( r ) => {
	r.dc = dc;
	r.states.filter( ( st ) => /^open/.test( st.name ) ).forEach( ( st ) => {
		st.how_to_reach = 'Open the configurator';
		st.how_to_reach_structured = { setState: { lens: { open: true } } };
	} );
};

test( 'MUST FAIL: a flow on another component whose open state is structured (no component named) is opened by no button of the product page\'s draft', () => {
	assert.equal( product( proposePageMap( { folder: recordVariant( structured( 'Home' ) ) } ) ).opensFlow, undefined );
	assert.equal( product( proposePageMap( { folder: recordVariant( ( r ) => ( r.dc = 'Home' ) ) } ) ).opensFlow, undefined, 'a plain ident call on a record of another component too' );
	assert.deepEqual( [ ...openingComponents( { dc: 'Home', states: [ { name: 'open', how_to_reach_structured: { setState: { sub: true } } } ] } ) ], [ 'Home' ] );
} );

test( 'negative control: the same structured open state on the product page\'s own component names the flow', () => {
	assert.equal( product( proposePageMap( { folder: recordVariant( structured( 'Store' ) ) } ) ).opensFlow, 'choice-flow-add-lenses' );
	assert.deepEqual( [ ...openingComponents( { dc: 'Home', states: [ { name: 'open', how_to_reach: "dcLogic('Basket').setState({a:1})" } ] } ) ], [ 'Basket' ], 'a named component wins over the record\'s' );
} );

// A handler's `dcLogic('<X>').setState(…)` writes on component X, never on the handler's own: fnWrites tags those writes with X.
test( 'MUST FAIL: a handler writing another component\'s state through dcLogic opens that component\'s target, never its own', () => {
	const toHome = variant( 'openLens: () => setL({ open: true, step: 0, use: null }),', "openLens: () => dcLogic('Home').setState({ lens: { open: true } }),\n      openLensHere: () => setL({ open: true, step: 0, use: null })," );
	assert.equal( product( proposePageMap( { folder: toHome } ) ).opensFlow, undefined, 'the Store button writes Home\'s lens, not Store\'s' );
	const exp = loadExport( toHome );
	const d = exp.drafts[ 0 ];
	const fn = d.idx.all.find( ( n ) => 'ObjectProperty' === n.type && 'openLens' === n.key.name ).value;
	const writes = fnWrites( d.idx, fn );
	assert.deepEqual( [ ...writesOn( writes, 'Store' ).entries() ].map( ( [ c, s ] ) => [ c, [ ...s ] ] ), [ [ 'Home', [ 'lens.open=true' ] ] ] );
	assert.equal( opensTarget( writes, 'Store', { writes: [ 'lens.open=true' ], components: new Set( [ 'Home' ] ) } ), true, 'it opens the Home target' );
	assert.equal( opensTarget( writes, 'Store', { writes: [ 'lens.open=true' ], components: new Set( [ 'Store' ] ) } ), false );
} );

test( 'negative controls: dcLogic naming the handler\'s own component, and an untagged write, keep their component; part of the opening writes opens nothing', () => {
	const own = variant( 'openLens: () => setL({ open: true, step: 0, use: null }),', "openLens: () => dcLogic('Store').setState({ lens: { open: true } })," );
	assert.equal( product( proposePageMap( { folder: own } ) ).opensFlow, 'choice-flow-add-lenses' );
	assert.equal( opensTarget( new Set( [ 'a=1' ] ), 'Store', { writes: [ 'a=1', 'b=2' ], components: new Set( [ 'Store' ] ) } ), false, 'part of the opening writes' );
	assert.equal( opensTarget( new Set( [ `Home${ String.fromCharCode( 0 ) }a=1`, 'b=2' ] ), 'Store', { writes: [ 'a=1', 'b=2' ], components: new Set( [ 'Store', 'Home' ] ) } ), false, 'the writes split over two components make neither whole' );
	assert.deepEqual( [ ...writesOn( new Set( [ 'a=1' ] ), 'Store' ).keys() ], [ 'Store' ] );
	assert.equal( opensTarget( new Set( [ 'a=1' ] ), null, { writes: [ 'a=1' ], components: new Set( [ 'Store' ] ) } ), false, 'a handler of no known component opens no named component\'s target' );
	assert.equal( opensTarget( new Set( [ 'a=1' ] ), 'Shop', { writes: [ 'a=1' ], components: null } ), true, 'a target with no component is opened from any' );
} );

// The lookup's name may be a template literal with no hole (`dcLogic(`Home`)`); a lookup of a name no literal gives (a variable,
// a hole) writes on a component unknown here, so its writes count on none, never on the handler's own.
const LOOKUP = 'openLens: () => setL({ open: true, step: 0, use: null }),';
const lookupWrites = ( arg ) => {
	const d = loadExport( variant( LOOKUP, `openLens: () => dcLogic(${ arg }).setState({ lens: { open: true } }),` ) ).drafts[ 0 ];
	const fn = d.idx.all.find( ( n ) => 'ObjectProperty' === n.type && 'openLens' === n.key.name ).value;
	return [ ...writesOn( fnWrites( d.idx, fn ), 'Store' ).entries() ].map( ( [ c, s ] ) => [ c, [ ...s ] ] );
};

test( 'MUST FAIL: dcLogic(`Home`) writes on Home, and dcLogic(name) or dcLogic(`${ x }`) on no component, never on the handler\'s own', () => {
	assert.deepEqual( lookupWrites( '`Home`' ), [ [ 'Home', [ 'lens.open=true' ] ] ] );
	assert.equal( product( proposePageMap( { folder: variant( LOOKUP, 'openLens: () => dcLogic(`Home`).setState({ lens: { open: true } }),' ) } ) ).opensFlow, undefined, 'a Store button writing Home\'s lens opens no Store flow' );
	assert.deepEqual( lookupWrites( 'name' ), [], 'a variable names no component' );
	assert.deepEqual( lookupWrites( '`H${ "ome" }`' ), [], 'a template literal with a hole names no component' );
	assert.equal( product( proposePageMap( { folder: variant( LOOKUP, 'openLens: () => dcLogic(which).setState({ lens: { open: true } }),' ) } ) ).opensFlow, undefined );
} );

test( 'negative controls: dcLogic(`Store`) and dcLogic(\'Store\') write on the handler\'s own component and open its flow', () => {
	assert.deepEqual( lookupWrites( '`Store`' ), [ [ 'Store', [ 'lens.open=true' ] ] ] );
	assert.equal( product( proposePageMap( { folder: variant( LOOKUP, 'openLens: () => dcLogic(`Store`).setState({ lens: { open: true } }),' ) } ) ).opensFlow, 'choice-flow-add-lenses' );
	assert.deepEqual( [ ...ownWrites( new Set( [ `Store${ String.fromCharCode( 0 ) }a=1`, 'b=2', `Home${ String.fromCharCode( 0 ) }c=3` ] ), 'Store' ) ], [ 'a=1', 'b=2' ], 'ownWrites: the own tag and the untagged, never another component\'s' );
	assert.deepEqual( [ ...ownWrites( new Set( [ 'b=2' ] ), null ) ], [ 'b=2' ], 'an unknown own component keeps the untagged writes' );
} );
