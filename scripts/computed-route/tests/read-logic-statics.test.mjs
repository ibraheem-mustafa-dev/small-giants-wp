// Spec 48 FR-48-7, lib/read-logic-statics.mjs: the logic instance's statics, getters and fields that hold data, each hole's value
// with a surface state's keys applied, and the asset paths the logic builds by string. The fixture export
// (tests/fixtures/read-logic-statics/export/) has a static catalogue holding a function, a static method, a getter, an instance
// field, and an image whose path is built from the `tab` state key. Each MUST FAIL test names the code whose removal turns it
// red (tests/fixtures/read-logic-statics/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { draftSources } from '../lib/intake-census-template.mjs';
import { buildFactRecord, factsProblems } from '../lib/fact-record.mjs';
import { stateJobsOf, assetPathsIn, holesByState } from '../lib/read-logic-statics.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const EXPORT = path.join( HERE, 'fixtures', 'read-logic-statics', 'export' );
const ENTRY = 'Home.dc.html';
let record;

test.before( async () => {
	const { manifestHash } = recheckManifest( EXPORT );
	const harPath = path.join( os.tmpdir(), 'sgs-read-logic-statics-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: EXPORT, index: ENTRY, harPath } );
	}
	const sources = await draftSources( { folder: EXPORT, entry: ENTRY, harPath } );
	record = ( await buildFactRecord( { folder: EXPORT, client: 'fixture', entry: ENTRY, harPath, sources } ) ).record;
} );

const entry = ( name ) => record.logic.statics.Home.entries.find( ( e ) => e.name === name );

test( 'MUST FAIL (statics): a static array, a getter and an instance field come back with kind, length and value', () => {
	assert.deepEqual( [ entry( 'CATALOGUE' ).source, entry( 'CATALOGUE' ).kind, entry( 'CATALOGUE' ).length ], [ 'static', 'array', 3 ] );
	assert.deepEqual( entry( 'CATALOGUE' ).value.map( ( x ) => x.name ), [ 'Rice', 'Lentils', 'Flour' ] );
	assert.deepEqual( [ entry( 'menu' ).source, entry( 'menu' ).value ], [ 'getter', [ 'Home', 'About' ] ] );
	assert.deepEqual( [ entry( 'schema' ).source, entry( 'schema' ).kind, entry( 'schema' ).length ], [ 'field', 'object', 1 ] );
	assert.deepEqual( entry( 'schema' ).value.fields[ 0 ].chips, [ 'Pricing', 'Samples' ] );
	assert.equal( entry( 'state' ), undefined, 'the runtime\'s state and props are not data of the draft' );
	assert.deepEqual( factsProblems( record ), [], 'the record validates against the schema' );
} );

test( 'MUST FAIL (statics): a function is dropped from the value and named, a static method is named', () => {
	assert.deepEqual( entry( 'CATALOGUE' ).dropped, [ 'CATALOGUE[0].onPick' ] );
	assert.equal( 'onPick' in entry( 'CATALOGUE' ).value[ 0 ], false );
	assert.deepEqual( record.logic.statics.Home.functions, [ 'helper' ] );
} );

test( 'MUST FAIL (state values): a hole that differs in a state is recorded under it, one that does not is omitted', () => {
	const withStates = Object.values( record.elements ).filter( ( e ) => e.logic.holesByState );
	assert.equal( withStates.length, 2, 'the heading and the image differ in the second state' );
	assert.ok( withStates.every( ( e ) => 'S-01:second' === Object.keys( e.logic.holesByState )[ 0 ] && 1 === Object.keys( e.logic.holesByState ).length ), 'keyed by surface id and state name; the state with no keys is not read' );
	const h1 = Object.values( record.elements ).find( ( e ) => 'h1' === e.template.realTag );
	const p = Object.values( record.elements ).find( ( e ) => 'p' === e.template.realTag );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => h1.logic.holesByState[ 'S-01:second' ][ 'text#0' ][ w ].v[ 0 ].v ), [ 'Second', 'Second', 'Second' ] );
	assert.deepEqual( h1.logic.holes[ 'text#0' ][ 375 ].v[ 0 ].v, 'First', 'the resting value stays' );
	assert.equal( p.logic.holesByState, undefined, 'a hole the state leaves alone is not recorded' );
	const img = Object.values( record.elements ).find( ( e ) => 'img' === e.template.realTag );
	assert.equal( img.logic.holesByState[ 'S-01:second' ][ 'attr:src#0' ][ 375 ].v[ 0 ].v, './assets/about-hero-two.svg' );
} );

test( 'MUST FAIL (state values): the state is put back after the read; a state left set would be a gap row', () => {
	assert.deepEqual( record.gaps.filter( ( g ) => 'state-values' === g.construct ), [], 'the resting values read again after the state reads have not moved' );
	const h1 = Object.values( record.elements ).find( ( e ) => 'h1' === e.template.realTag );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => h1.logic.holes[ 'text#0' ][ w ].v[ 0 ].v ), [ 'First', 'First', 'First' ] );
} );

test( 'MUST FAIL (state jobs): only a state that sets a state key of its own logic is read', () => {
	const surfaces = {
		a: { id: 'a', dc: 'Home', states: [ { name: 'closed', state_keys: {} }, { name: 'open', state_keys: { open: true } }, { name: 'wide', state_keys: { w: '>= 1260' } }, { name: 'variant', state_keys: { 'props.kind': 'x' } }, { name: 'ph', state_keys: { ref: 'IND-######' } }, { name: 'sel', state_keys: { 'select[name=role]': 'x' } } ] },
	};
	const got = stateJobsOf( surfaces );
	assert.deepEqual( got.jobs, [ { id: 'a:open', component: 'Home', keys: { open: true } } ] );
	assert.deepEqual( got.skipped, [ 'a:variant', 'a:ph', 'a:sel' ] );
} );

test( 'MUST FAIL (state values): a state of one component never records the holes of another that share hole keys', () => {
	const hole = { id: 'text#0' };
	const elements = [ { key: 'A/1', component: 'A', n: 1, holes: [ hole ] }, { key: 'B/1', component: 'B', n: 1, holes: [ hole ] } ];
	const ans = ( v ) => ( { v: [ { t: 'string', v } ], n: 1, loop: false } );
	const rest = { A: { 375: { holes: { '1|text#0': ans( 'a' ) } } }, B: { 375: { holes: { '1|text#0': ans( 'b' ) } } } };
	const states = { 's:on': { component: 'A', reached: 1, widths: { 375: { '1|text#0': ans( 'changed' ) } } } };
	assert.deepEqual( Object.keys( holesByState( { elements, rest, states, widths: [ 375 ] } ) ), [ 'A/1' ] );
} );

test( 'MUST FAIL (asset paths): a path the logic builds by string marks its file used; the file nothing names stays unused', () => {
	assert.deepEqual( record.assets.unused, [ 'assets/about-hero-three.svg' ], 'one and two are named by the hole, in the resting and the second state' );
	assert.deepEqual( record.assets.missing, [] );
	assert.deepEqual( [ ...assetPathsIn( { a: [ './assets/x/y.svg', 'url(assets/z.png)', 'https://e.com/assets/no.svg' ] } ) ].sort(), [ 'assets/x/y.svg', 'assets/z.png' ], 'a nested value is walked, a url() is read, a remote URL is not a path' );
} );
