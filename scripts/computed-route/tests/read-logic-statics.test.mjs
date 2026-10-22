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
import { stateJobsOf, assetPathsIn, holesByState, readStateValues, valueGaps } from '../lib/read-logic-statics.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const EXPORT = path.join( HERE, 'fixtures', 'read-logic-statics', 'export' );
const ENTRY = 'Home.dc.html';
let record;
let harPath;

test.before( async () => {
	const { manifestHash } = recheckManifest( EXPORT );
	harPath = path.join( os.tmpdir(), 'sgs-read-logic-statics-replay', `${ manifestHash }.har` );
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

const byTag = ( tag ) => Object.entries( record.elements ).find( ( [ , e ] ) => tag === e.template.realTag );

test( 'MUST FAIL (state values): a hole that differs in a state is recorded under it, one that does not is omitted', () => {
	const [ , h1 ] = byTag( 'h1' );
	const [ , p ] = byTag( 'p' );
	const [ , img ] = byTag( 'img' );
	assert.deepEqual( Object.keys( h1.logic.holesByState ), [ 'S-01:second', 'S-01:wide', 'S-02:tab-two' ], 'keyed by surface id and state name; a state with no keys is not read' );
	assert.deepEqual( Object.keys( img.logic.holesByState ), [ 'S-01:second', 'S-01:wide' ], 'the image sits outside S-02, so its change there is a side effect' );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => h1.logic.holesByState[ 'S-01:second' ][ 'text#0' ][ w ].v[ 0 ].v ), [ 'Second', 'Second', 'Second' ] );
	assert.deepEqual( h1.logic.holes[ 'text#0' ][ 375 ].v[ 0 ].v, 'First', 'the resting value stays' );
	assert.equal( p.logic.holesByState, undefined, 'a hole the state leaves alone is not recorded' );
	assert.equal( img.logic.holesByState[ 'S-01:second' ][ 'attr:src#0' ][ 375 ].v[ 0 ].v, './assets/about-hero-two.svg' );
} );

test( 'MUST FAIL (still page): a draft that ticks on an interval is read where it starts: one value at every width, and no state differs only by the clock', () => {
	const [ , small ] = byTag( 'small' );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => small.logic.holes[ 'text#0' ][ w ].v[ 0 ].v ), [ 'tick 0', 'tick 0', 'tick 0' ] );
	assert.equal( small.logic.holesByState, undefined, 'a clock that ran between the resting read and a state read would differ in every state' );
} );

test( 'MUST FAIL (state side effects): a change outside the state\'s surface is listed once under the state, not on the element', () => {
	const [ imgKey ] = byTag( 'img' );
	assert.deepEqual( record.logic.stateSideEffects, { 'S-02:tab-two': [ imgKey ] } );
	assert.deepEqual( factsProblems( record ), [] );
} );

test( 'MUST FAIL (state values): the state is put back after the read; a state left set would be a gap row', () => {
	assert.deepEqual( record.gaps.filter( ( g ) => 'state-values' === g.construct && /not put back|changed after the state reads/.test( g.error ) ), [], 'the resting values read again after the state reads have not moved' );
	const [ , h1 ] = byTag( 'h1' );
	assert.deepEqual( [ 375, 768, 1440 ].map( ( w ) => h1.logic.holes[ 'text#0' ][ w ].v[ 0 ].v ), [ 'First', 'First', 'First' ] );
} );

test( 'MUST FAIL (state jobs): a state with a width key and a real key is read with the real key; the states that cannot be set are listed with their reason', () => {
	const surfaces = {
		a: { id: 'a', dc: 'Home', states: [ { name: 'closed', state_keys: {} }, { name: 'open', state_keys: { open: true } }, { name: 'wide', state_keys: { w: '>= 1260' } }, { name: 'openwide', state_keys: { open: true, w: '>= 1260', n: '<= 767' } }, { name: 'variant', state_keys: { 'props.kind': 'x' } }, { name: 'ph', state_keys: { ref: 'IND-######' } }, { name: 'sel', state_keys: { 'select[name=role]': 'x' } } ] },
		b: { id: 'b', dc: '', states: [ { name: 'open', state_keys: { open: true } }, { name: 'rest', state_keys: {} } ] },
	};
	const got = stateJobsOf( surfaces );
	assert.deepEqual( got.jobs, [
		{ id: 'a:open', surface: 'a', state: 'open', component: 'Home', keys: { open: true } },
		{ id: 'a:openwide', surface: 'a', state: 'openwide', component: 'Home', keys: { open: true } },
	] );
	assert.deepEqual( got.skipped.map( ( s ) => s.id ), [ 'a:variant', 'a:ph', 'a:sel', 'b:open' ] );
	assert.match( got.skipped[ 0 ].reason, /prop variant or a selector/ );
	assert.match( got.skipped[ 1 ].reason, /placeholder/ );
	assert.match( got.skipped[ 3 ].reason, /no draft component/ );
	const gaps = record.gaps.filter( ( g ) => 'state-values' === g.construct );
	assert.ok( gaps.some( ( g ) => 'S-01:variant' === g.draftId && /prop variant or a selector/.test( g.error ) ) );
	assert.ok( gaps.some( ( g ) => 'S-03:open' === g.draftId && /no draft component/.test( g.error ) ), 'a state of a surface with no draft is a gap row with its reason' );
	assert.ok( ! gaps.some( ( g ) => /S-01:wide/.test( g.draftId ) ), 'the width-keyed state is a job, not a skip' );
} );

test( 'MUST FAIL (state values): a state of one component never records the holes of another that share hole keys', () => {
	const hole = { id: 'text#0' };
	const elements = [ { key: 'A/1', component: 'A', n: 1, parentChain: [], holes: [ hole ] }, { key: 'B/1', component: 'B', n: 1, parentChain: [], holes: [ hole ] } ];
	const ans = ( v ) => ( { v: [ { t: 'string', v } ], n: 1, loop: false } );
	const rest = { A: { 375: { holes: { '1|text#0': ans( 'a' ) } } }, B: { 375: { holes: { '1|text#0': ans( 'b' ) } } } };
	const states = { 's:on': { component: 'A', reached: 1, widths: { 375: { '1|text#0': ans( 'changed' ) } } } };
	assert.deepEqual( Object.keys( holesByState( { elements, rest, states, widths: [ 375 ] } ).holesByState ), [ 'A/1' ] );
} );

test( 'MUST FAIL (state scope): a changed hole is recorded on an element of the state\'s root or sc-if members, and listed under the state for any other', () => {
	const hole = { id: 'text#0' };
	const el = ( key, parentChain ) => ( { key, component: 'A', n: Number( key.split( '/' )[ 1 ] ), parentChain, holes: [ hole ] } );
	const elements = [ el( 'A/0', [] ), el( 'A/1', [ 'A/0' ] ), el( 'A/2', [ 'A/1', 'A/0' ] ), el( 'A/3', [ 'A/0' ] ), el( 'A/4', [ 'A/0' ] ) ];
	const ans = ( v, extra = {} ) => ( { v: [ { t: 'string', v } ], n: 1, loop: false, ...extra } );
	const rest = { A: { 375: { holes: Object.fromEntries( elements.map( ( e ) => [ `${ e.n }|text#0`, ans( 'rest' ) ] ) ) } } };
	const widths = { 375: Object.fromEntries( elements.map( ( e ) => [ `${ e.n }|text#0`, ans( 'on' ) ] ) ) };
	const states = { 's:on': { component: 'A', surface: 's', state: 'on', reached: 1, widths } };
	const surfaces = { s: { id: 's', dc: 'A', roots: [ 'A/1' ], states: [ { name: 'on', state_keys: { x: 1 }, sc_if_tpl_ids: [ '3' ] } ] } };
	const got = holesByState( { elements, rest, states, widths: [ 375 ], surfaces } );
	assert.deepEqual( Object.keys( got.holesByState ), [ 'A/1', 'A/2', 'A/3' ], 'the root, its descendant and the sc-if member' );
	assert.deepEqual( got.stateSideEffects, { 's:on': [ 'A/0', 'A/4' ] } );
	assert.deepEqual( Object.keys( holesByState( { elements, rest, states, widths: [ 375 ] } ).stateSideEffects ), [], 'a state with no surface to judge by records every element' );
} );

test( 'MUST FAIL (state values): an answer that differs only in its scope count or loop flag is a changed value', () => {
	const elements = [ { key: 'A/1', component: 'A', n: 1, parentChain: [], holes: [ { id: 'text#0' } ] } ];
	const v = [ { t: 'string', v: 'x' } ];
	const rest = { A: { 375: { holes: { '1|text#0': { v, n: 2, loop: true } } } } };
	const run = ( answer ) => holesByState( { elements, rest, states: { 's:on': { component: 'A', widths: { 375: { '1|text#0': answer } } } }, widths: [ 375 ] } ).holesByState;
	assert.deepEqual( run( { v, n: 2, loop: true } ), {}, 'identical' );
	assert.deepEqual( Object.keys( run( { v, n: 3, loop: true } ) ), [ 'A/1' ], 'a loop that now renders more scopes' );
	assert.deepEqual( Object.keys( run( { v, n: 2, loop: false } ) ), [ 'A/1' ], 'a hole that stopped being in a loop' );
} );

test( 'MUST FAIL (state reads): a read that throws is caught, the state is put back, the job\'s error is named and the other jobs are still read', async () => {
	const calls = [];
	const page = { evaluate: async ( fn, arg ) => {
		arg?.op && calls.push( arg.op );
		return 'set' === arg?.op ? 1 : undefined;
	} };
	const jobs = [ { id: 'a:one', surface: 'a', state: 'one', component: 'C', keys: { x: 1 } }, { id: 'a:two', surface: 'a', state: 'two', component: 'C', keys: { x: 2 } } ];
	const ask = async ( p, comps ) => {
		if ( calls.filter( ( c ) => 'set' === c ).length < 2 ) {
			throw new Error( 'boom\nsecond line' );
		}
		return { C: { holes: { '1|a': { v: [], n: 0, loop: false } } } };
	};
	const got = await readStateValues( { page, plan: { C: [ {} ] }, jobs, widths: [ 375 ], ask, resize: async () => {} } );
	assert.deepEqual( got[ 'a:one' ].errors, [ '375: boom' ] );
	assert.deepEqual( got[ 'a:one' ].widths, {} );
	assert.deepEqual( got[ 'a:two' ].errors, [] );
	assert.deepEqual( Object.keys( got[ 'a:two' ].widths ), [ '375' ] );
	assert.deepEqual( calls, [ 'snapshot', 'set', 'restore', 'snapshot', 'set', 'restore' ], 'every read ends with the state put back' );
} );

test( 'MUST FAIL (gap rows): a throw while reading a state, a state that cannot be set, a missing instance and a spent budget are each a gap row', () => {
	const jobs = [ { id: 'a:one' }, { id: 'a:two' }, { id: 'a:three' } ];
	const states = { 'a:one': { reached: 1, errors: [ '375: boom' ] }, 'a:two': { reached: 0, errors: [] }, 'a:three': { reached: 1, errors: [] } };
	const skipped = [ { id: 'b:x', reason: 'r1' }, { id: 'b:y', reason: 'r1' }, { id: 'b:z', reason: 'r2' } ];
	const gaps = valueGaps( { jobs, skipped, states, noInstance: [ 'Zed', 'Alpha' ], truncated: true } );
	assert.deepEqual( gaps.map( ( g ) => [ g.construct, g.draftId ] ), [ [ 'state-values', 'a:two' ], [ 'state-values', 'b:x, b:y' ], [ 'state-values', 'b:z' ], [ 'state-values', 'a:one' ], [ 'statics', 'Alpha' ], [ 'statics', 'Zed' ], [ 'statics', 'record' ] ] );
	assert.match( gaps[ 3 ].error, /threw \(375: boom\).*put back/ );
	assert.deepEqual( valueGaps( { jobs: [], skipped: [], states: {}, noInstance: [], truncated: false } ), [] );
} );

test( 'MUST FAIL (statics): a value that changes between two reads is dropped and named volatile; the viewport width read at is recorded', () => {
	const home = record.logic.statics.Home;
	assert.equal( home.entries.some( ( e ) => 'tick' === e.name ), false, 'a getter that returns a new counter every read is no data' );
	assert.deepEqual( home.dropped, [ { name: 'tick', source: 'getter', reason: 'volatile' } ] );
	assert.equal( home.width, 1440, 'the getters were read at the last read width' );
	assert.equal( home.truncated, undefined );
	assert.equal( record.logic.truncated, undefined );
} );

test( 'MUST FAIL (statics): a component with no live instance anywhere is a gap row', () => {
	assert.deepEqual( record.gaps.filter( ( g ) => 'statics' === g.construct ).map( ( g ) => g.draftId ), [ 'Child' ], 'Child has no holes and is never mounted, so its statics could not be read' );
	assert.equal( record.logic.statics.Child, undefined );
} );

test( 'MUST FAIL (statics budget): a component past its node budget, and a record past its own, are marked truncated', async () => {
	const { CAPS } = await import( '../lib/read-logic-statics.mjs' );
	const sources = await draftSources( { folder: EXPORT, entry: ENTRY, harPath } );
	const run = async ( caps ) => {
		const keep = { ...CAPS };
		Object.assign( CAPS, caps );
		try {
			return ( await buildFactRecord( { folder: EXPORT, client: 'fixture', entry: ENTRY, harPath, sources } ) ).record;
		} finally {
			Object.assign( CAPS, keep );
		}
	};
	const comp = await run( { componentNodes: 2 } );
	assert.equal( comp.logic.statics.Home.truncated, true );
	assert.equal( comp.logic.truncated, undefined, 'the record budget was not reached' );
	assert.ok( comp.logic.statics.Home.entries.some( ( e ) => e.truncated ) );
	const whole = await run( { recordNodes: 2 } );
	assert.equal( whole.logic.truncated, true );
	assert.ok( whole.gaps.some( ( g ) => 'statics' === g.construct && 'record' === g.draftId && /node budget/.test( g.error ) ) );
	assert.deepEqual( factsProblems( whole ), [] );
} );

test( 'MUST FAIL (asset paths): a path the logic builds by string marks its file used; the file nothing names stays unused', () => {
	assert.deepEqual( record.assets.unused, [ 'assets/about-hero-four.svg' ], 'one and two are named by the hole, in the resting and the second state; three by a static' );
	assert.deepEqual( record.assets.logicRefs, [ { path: 'assets/about-hero-three.svg', by: 'static Home.GALLERY' } ], 'a static names no element, so its path is a logic ref' );
	const [ , img ] = byTag( 'img' );
	assert.deepEqual( img.assets.map( ( a ) => [ a.path, a.via ] ), [ [ 'assets/about-hero-one.svg', 'logic:attr:src#0' ], [ 'assets/about-hero-two.svg', 'logic:attr:src#0' ] ], 'the element a hole belongs to is a user through the logic' );
	assert.deepEqual( record.assets.missing, [] );
	assert.deepEqual( [ ...assetPathsIn( { a: [ './assets/x/y.svg', 'url(assets/z.png)', 'https://e.com/assets/no.svg' ] } ) ].sort(), [ 'assets/x/y.svg', 'assets/z.png' ], 'a nested value is walked, a url() is read, a remote URL is not a path' );
} );
