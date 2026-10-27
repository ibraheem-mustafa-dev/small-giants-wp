// A menu record holding several tab panels as states of one record (lib/intake-skeletons.mjs::tabPanels) on the fixture
// export tests/fixtures/intake-tab-panels/: one panel element under `sc-if open` whose content is one of two branches,
// `isSun` (a heading and one link) or `isBrands` (the "Most asked for" grid and "All 40 brands"), each shown by its own
// value of `mega`. Intake reads one skeleton surface per panel, opened by its own tab's state, so each panel's inventory
// holds its own content. The replay HAR is recorded once into the OS temp folder (the first run needs the network).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { staticCensus } from '../lib/intake-census.mjs';
import { surfaceRoots, proposeSkeletons, tabPanels } from '../lib/intake-skeletons.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-tab-panels' );
const INDEX = 'Home.dc.html';
const CLIENT = 'intake-tab-panels-fixture';
const RECORD = JSON.parse( fs.readFileSync( path.join( FIXTURE, 'surfaces.json' ), 'utf8' ) ).records[ 0 ];
// The same panel as one open state (a single-panel menu, as each of a site's separate mega menu records is).
const SINGLE = { ...RECORD, states: [ RECORD.states[ 0 ], { ...RECORD.states[ 2 ], name: 'open' }, { name: 'link hover', state_keys: {}, how_to_reach: 'CSS :hover' } ] };

let harPath;
let census;
let panels;
let single;

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-tab-panels-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	census = await staticCensus( { folder: FIXTURE, entry: INDEX, harPath } );
	const surfacesOf = ( records ) => {
		const r = surfaceRoots( { folder: FIXTURE, census, records } );
		assert.deepEqual( r.gaps, [] );
		return r.surfaces;
	};
	panels = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: surfacesOf( [ RECORD ] ), client: CLIENT, census } );
	single = await proposeSkeletons( { folder: FIXTURE, harPath, surfaces: surfacesOf( [ SINGLE ] ), client: CLIENT, census } );
} );

const words = ( s ) => s.rows.map( ( r ) => r.words ).filter( Boolean ).join( ' | ' );

test( 'tabPanels: a menu record whose open states set one key to their own values is its panels; anything else is none', () => {
	assert.deepEqual( tabPanels( RECORD ).map( ( s ) => s.name ), [ 'Sunglasses', 'Brands' ] );
	const hover = { name: 'link hover', state_keys: {}, how_to_reach: 'CSS :hover' };
	assert.deepEqual( tabPanels( { ...RECORD, states: [ ...RECORD.states, hover ] } ).map( ( s ) => s.name ), [ 'Sunglasses', 'Brands' ], 'a hover state with no keys is beside the panels, not one' );
	const shut = { ...RECORD.states[ 0 ], state_keys: { mega: false } };
	assert.deepEqual( tabPanels( { ...RECORD, states: [ shut, ...RECORD.states.slice( 1 ) ] } ).map( ( s ) => s.name ), [ 'Sunglasses', 'Brands' ], 'a closed state is no panel, whatever value it sets' );
	assert.deepEqual( tabPanels( SINGLE ), [], 'one open state (a hover state with no keys is no panel)' );
	assert.deepEqual( tabPanels( { ...RECORD, kind: 'drawer' } ), [], 'a drawer\'s open variants are one surface' );
	assert.deepEqual( tabPanels( { ...RECORD, states: [ RECORD.states[ 1 ], { ...RECORD.states[ 2 ], state_keys: { other: 'x' } } ] } ), [], 'states over different keys are no tabs' );
	assert.deepEqual( tabPanels( { ...RECORD, states: [ RECORD.states[ 1 ], { ...RECORD.states[ 2 ], state_keys: { mega: 'sun' } } ] } ), [], 'two states with one value are one panel' );
} );

test( 'surface roots: one surface per tab panel, each holding only its own tab state', () => {
	const r = surfaceRoots( { folder: FIXTURE, census, records: [ RECORD ] } );
	assert.deepEqual( r.surfaces.map( ( s ) => [ s.slug, s.panel, s.rootTpl, s.states.map( ( x ) => x.name ) ] ), [ [ 'mega-menu-sunglasses', 'Sunglasses', '5', [ 'Sunglasses' ] ], [ 'mega-menu-brands', 'Brands', '5', [ 'Brands' ] ] ] );
	// Negative control: a single-panel menu stays one surface with every state.
	const one = surfaceRoots( { folder: FIXTURE, census, records: [ SINGLE ] } ).surfaces;
	assert.deepEqual( one.map( ( s ) => [ s.slug, s.panel, s.states.length ] ), [ [ 'mega-menu', undefined, 3 ] ] );
} );

test( 'MUST FAIL: each tab panel gets its own inventory, read with its own tab open', () => {
	const of = ( slug ) => panels.skeletons.find( ( s ) => s.surface === slug ) ?? assert.fail( `no skeleton for ${ slug }` );
	const sun = of( 'mega-menu-sunglasses' );
	const brands = of( 'mega-menu-brands' );
	for ( const s of [ sun, brands ] ) {
		assert.equal( s.gap, undefined, s.gap );
		assert.equal( s.id, 'S-01' );
		assert.equal( s.root.viaState, true );
	}
	assert.deepEqual( [ sun.panel, sun.opened.state, sun.opened.keys ], [ 'Sunglasses', 'Sunglasses', { mega: 'sun' } ] );
	assert.deepEqual( [ brands.panel, brands.opened.state, brands.opened.keys ], [ 'Brands', 'Brands', { mega: 'brands' } ] );
	assert.match( words( sun ), /Shop sunglasses/ );
	assert.doesNotMatch( words( sun ), /Most asked for/ );
	assert.match( words( brands ), /Most asked for/ );
	assert.match( words( brands ), /All 40 brands/ );
	assert.doesNotMatch( words( brands ), /Shop sunglasses|Aviator/, 'the Brands panel is not read with Sunglasses open' );
	assert.ok( brands.inventory.elements > sun.inventory.elements, 'the Brands panel holds its grid' );
} );

test( 'a single-panel menu is read once, as before, by its open state', () => {
	assert.equal( single.skeletons.length, 1 );
	const [ s ] = single.skeletons;
	assert.equal( s.gap, undefined, s.gap );
	assert.deepEqual( [ s.surface, s.panel, s.opened.state ], [ 'mega-menu', undefined, 'open' ] );
	assert.match( words( s ), /All 40 brands/ );
} );
