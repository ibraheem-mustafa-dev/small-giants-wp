// Spec 48 FR-48-7, lib/read-animations.mjs and its join in lib/fact-record.mjs::joinFacts: each template element holds the
// animations.json records that target it (`self`) or an element under it (`descendant`), by the parent chain the template
// reader recorded. A small template stands in for a draft (no browser). Each MUST FAIL test names the behaviour whose
// removal turns it red (tests/fixtures/read-animations/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readAnimations } from '../lib/read-animations.mjs';
import { joinFacts, countsOf } from '../lib/fact-record.mjs';
import { sourcesOf, assertCurrent, StaleRecordError } from '../lib/freshness.mjs';

// Page/0 holds Page/1 and Page/2 (siblings); Page/3 sits under Page/1.
const chains = { 'Page/0': [], 'Page/1': [ 'Page/0' ], 'Page/2': [ 'Page/0' ], 'Page/3': [ 'Page/1', 'Page/0' ] };
const template = {
	order: Object.keys( chains ),
	elements: Object.fromEntries( Object.entries( chains ).map( ( [ k, parentChain ] ) => [ k, { parentChain, fingerprint: { tag: 'div', parentTags: [], textHash: '' } } ] ) ),
	gaps: [],
};
const rec = ( id, element, extra = {} ) => ( {
	id, name: `effect ${ id }`, mechanism: 'waapi', group: 'entrance', status: 'active',
	element: { dc: 'Page', template_tpl_id: null, nearest_tpl_id: null, selector: 's', description: 'd', ...element },
	trigger: { type: 'scroll-into-view', detail: 'threshold 0.2', state_keys: [ 'open' ] },
	breakpoints: [ 'desktop' ], routes: [ '/' ], reduced_motion: { behaviour: 'skip', detail: 'no entrance' }, ...extra,
} );
const ids = ( by, key ) => ( by[ key ] || [] ).map( ( e ) => `${ e.id }:${ e.reach }` );

test( 'MUST FAIL (containment): a record on a child lands on the child as self and on each ancestor as descendant, never on a sibling', () => {
	const { byElement } = readAnimations( { records: [ rec( 'A-01', { template_tpl_id: '3' } ) ], template } );
	assert.deepEqual( ids( byElement, 'Page/3' ), [ 'A-01:self' ] );
	assert.deepEqual( ids( byElement, 'Page/1' ), [ 'A-01:descendant' ] );
	assert.deepEqual( ids( byElement, 'Page/0' ), [ 'A-01:descendant' ] );
	assert.deepEqual( ids( byElement, 'Page/2' ), [], 'a sibling of the target holds nothing' );
	const e = byElement[ 'Page/1' ][ 0 ];
	assert.deepEqual( [ e.target, e.via, e.trigger, e.breakpoints, e.routes, e.group ], [ 'Page/3', 'template_tpl_id', { type: 'scroll-into-view', detail: 'threshold 0.2', state_keys: [ 'open' ] }, [ 'desktop' ], [ '/' ], 'entrance' ] );
	assert.deepEqual( e.reduced_motion, { behaviour: 'skip', detail: 'no entrance' } );
} );

test( 'MUST FAIL (self wins): an element reached as self by one target and as descendant by another keeps the self entry once', () => {
	const { byElement } = readAnimations( { records: [ rec( 'A-02', { template_tpl_id: [ '3', '1' ] } ) ], template } );
	assert.deepEqual( ids( byElement, 'Page/1' ), [ 'A-02:self' ] );
	assert.deepEqual( ids( byElement, 'Page/3' ), [ 'A-02:self' ] );
} );

test( 'MUST FAIL (nearest fallback): a record with no template_tpl_id lands through nearest_tpl_id, a list of hosts included', () => {
	const { byElement } = readAnimations( { records: [ rec( 'J-01', { nearest_tpl_id: '1' } ), rec( 'J-02', { nearest_tpl_id: [ '2', '3' ] } ) ], template } );
	assert.deepEqual( ids( byElement, 'Page/1' ), [ 'J-01:self', 'J-02:descendant' ] );
	assert.equal( byElement[ 'Page/1' ][ 0 ].via, 'nearest_tpl_id' );
	assert.deepEqual( ids( byElement, 'Page/2' ), [ 'J-02:self' ] );
	assert.deepEqual( ids( byElement, 'Page/3' ), [ 'J-02:self' ] );
} );

test( 'MUST FAIL (status): a dead-code or no-op record is kept and flagged; an active one is not flagged', () => {
	const { byElement } = readAnimations( { records: [ rec( 'A-03', { template_tpl_id: '2' }, { status: 'dead-code' } ), rec( 'A-04', { template_tpl_id: '2' }, { status: 'no-op' } ), rec( 'A-05', { template_tpl_id: '2' } ) ], template } );
	assert.deepEqual( byElement[ 'Page/2' ].map( ( e ) => [ e.id, e.status, e.flagged ] ), [ [ 'A-03', 'dead-code', 'dead-code' ], [ 'A-04', 'no-op', 'no-op' ], [ 'A-05', 'active', null ] ] );
} );

test( 'MUST FAIL (unjoined): a record with no element is listed with its reason; one naming a missing element is a gap and listed', () => {
	const r = readAnimations( { records: [ rec( 'A-06', {} ), rec( 'A-07', { template_tpl_id: '99' } ) ], template } );
	assert.deepEqual( r.unjoined.map( ( u ) => u.id ), [ 'A-06', 'A-07' ] );
	assert.match( r.unjoined[ 0 ].reason, /names no template element/ );
	assert.match( r.unjoined[ 1 ].reason, /missing from the annotated template/ );
	assert.equal( r.gaps.length, 1 );
	assert.match( r.gaps[ 0 ].error, /Page\/99/ );
	assert.deepEqual( r.byElement, {} );
} );

test( 'MUST FAIL (records shape): records that are not a list, or a record that is not an object, is a gap row and never a throw', () => {
	for ( const records of [ {}, 'text', 7 ] ) {
		const r = readAnimations( { records, template } );
		assert.deepEqual( [ r.records, r.byElement, r.unjoined ], [ 0, {}, [] ] );
		assert.equal( r.gaps.length, 1 );
		assert.match( r.gaps[ 0 ].error, /not a list/ );
	}
	const mixed = readAnimations( { records: [ null, rec( 'A-01', { template_tpl_id: '2' } ), 'x' ], template } );
	assert.deepEqual( ids( mixed.byElement, 'Page/2' ), [ 'A-01:self' ] );
	assert.equal( mixed.gaps.filter( ( g ) => /not an object/.test( g.error ) ).length, 2 );
} );

test( 'MUST FAIL (empty ids): an empty-string template_tpl_id falls through to nearest_tpl_id; a missing status reads as active', () => {
	const records = [ rec( 'E-01', { template_tpl_id: '', nearest_tpl_id: '1' } ), rec( 'E-02', { template_tpl_id: [ '' ], nearest_tpl_id: '2' } ), rec( 'E-03', { template_tpl_id: '2' }, { status: undefined } ) ];
	const { byElement, unjoined } = readAnimations( { records, template } );
	assert.deepEqual( unjoined, [] );
	assert.deepEqual( byElement[ 'Page/1' ].map( ( e ) => [ e.id, e.via ] ), [ [ 'E-01', 'nearest_tpl_id' ] ] );
	assert.deepEqual( byElement[ 'Page/2' ].map( ( e ) => [ e.id, e.via, e.status, e.flagged ] ), [ [ 'E-02', 'nearest_tpl_id', 'active', null ], [ 'E-03', 'template_tpl_id', 'active', null ] ] );
} );

test( 'MUST FAIL (join): joinFacts puts effects on each element, the unjoined list and the effect counts in the record', () => {
	const animations = readAnimations( { records: [ rec( 'A-01', { template_tpl_id: '3' } ), rec( 'A-06', {} ) ], template } );
	const empty = { gaps: [], byElement: {}, surfaces: {}, byTemplate: new Map(), conditions: {}, holes: {}, mounted: {} };
	const joined = joinFacts( { client: 'fixture', sources: { files: {}, route: { commit: null } }, widths: [ 375 ], template, logic: empty, surfaces: empty, animations, instances: empty } );
	assert.deepEqual( joined.elements[ 'Page/0' ].effects.map( ( e ) => e.id ), [ 'A-01' ] );
	assert.deepEqual( joined.elements[ 'Page/2' ].effects, [] );
	assert.deepEqual( joined.animations, { records: 2, unjoined: animations.unjoined } );
	assert.deepEqual( joined.counts.effects, { records: 2, joined: 1, unjoined: 1, elements: 3 } );
	assert.deepEqual( countsOf( joined.elements, [ 375 ], [] ).effects, { records: 0, joined: 0, unjoined: 0, elements: 3 }, 'countsOf without the reader result counts no records' );
} );

test( 'MUST FAIL (freshness): a record whose sources hold animations.json is refused when animations.json changes', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'read-animations-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'animations.json' ), '{"records":[]}' );
		const sources = sourcesOf( dir, { commit: null } );
		assert.ok( 'animations.json' in sources.files );
		assert.deepEqual( assertCurrent( { sources }, dir ), { checked: true } );
		fs.writeFileSync( path.join( dir, 'animations.json' ), '{"records":[{}]}' );
		assert.throws( () => assertCurrent( { sources }, dir ), ( e ) => e instanceof StaleRecordError && /animations\.json changed/.test( e.message ) );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );
