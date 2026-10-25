// Proves a census row whose Fill reason is itself I-calibration carries FR-48-66 evidence from the calibration cache (the
// paint file and the key that holds no reading, or the slot-map file that is absent), and that the census still refuses an
// I-class row when the cache does not bear the reason out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { classifyRows, classCounts, calibrationEvidence } from '../lib/census-gap-class.mjs';
import { isEvidence } from '../lib/gate-evidence.mjs';
import { surfaceRows } from '../lib/census-mechanism.mjs';

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		CREATE TABLE blocks ( slug TEXT, parent_block TEXT );
		INSERT INTO blocks VALUES ( 'sgs/container', NULL );` );
	return d;
};
const fresh = () => ( { pass: true, class: null, evidence: { command: 'git log', line: 'fresh' } } );
const row = ( over = {} ) => ( { client: 'c', surface: 's', element: 'cr-ref-s-0', slug: 'sgs/container', slot: '', block: 'sgs/container', kind: 'fill', key: 'transition-property', property: 'transition-property', state: 'default', runStates: 'all', tier: 'all', side: 'fill-unwritten', reason: 'uncalibrated', fillClass: 'I-calibration', fillCandidate: false, ...over } );
const files = () => ( { slotMap: 'cache/container.json', paint: 'cache/site-a/container.paint.json' } );
const paint = ( styles ) => ( { readKey: 'k1', elements: { '': { 375: styles, 1440: styles } } } );

test( 'MUST FAIL: a Fill-reason I-calibration row carries the paint file and the key with no reading', () => {
	const rows = classifyRows( [ row() ], { db: db(), calFor: () => paint( { color: 'red' } ), calFiles: files, freshness: fresh } );
	assert.equal( rows[ 0 ].gapClass, 'I-calibration' );
	assert.ok( isEvidence( rows[ 0 ].gapEvidence ), JSON.stringify( rows[ 0 ].gapEvidence ) );
	assert.equal( rows[ 0 ].gapEvidence.file, 'cache/site-a/container.paint.json' );
	assert.equal( rows[ 0 ].gapEvidence.key, 'elements[""].*.transition-property' );
	assert.match( rows[ 0 ].gapEvidence.line, /no reading at 375, 1440 \(readKey k1\)/ );
	const c = classCounts( rows );
	assert.deepEqual( c.counts, { 'I-calibration': 1 } );
	assert.deepEqual( c.instrument[ 0 ].evidence, rows[ 0 ].gapEvidence );
} );

test( 'MUST FAIL: a block with no calibration names the absent slot-map file; a missing paint names the paint file', () => {
	const none = classifyRows( [ row( { key: '(block)', property: null } ) ], { db: db(), calFor: () => null, calFiles: files, freshness: fresh } );
	assert.deepEqual( none[ 0 ].gapEvidence, { file: 'cache/container.json', key: 'sgs/container', line: 'no calibration slot map for sgs/container' } );
	const noPaint = classifyRows( [ row() ], { db: db(), calFor: () => ( { elements: {}, paintMissing: 'no default paint for site-a' } ), calFiles: files, freshness: fresh } );
	assert.deepEqual( noPaint[ 0 ].gapEvidence, { file: 'cache/site-a/container.paint.json', key: 'sgs/container', line: 'no default paint for site-a' } );
	assert.equal( classCounts( [ ...none, ...noPaint ] ).total, 2 );
} );

test( 'MUST FAIL: a slot the paint does not hold is named as absent', () => {
	const e = calibrationEvidence( row( { slot: '.sgs-x__y' } ), paint( { color: 'red' } ), files() );
	assert.deepEqual( e, { file: 'cache/site-a/container.paint.json', key: 'elements[".sgs-x__y"].*.transition-property', line: 'the paint holds no element .sgs-x__y (readKey k1)' } );
} );

test( 'negative control: a paint that does hold the reading gives no evidence, and the census still refuses the row', () => {
	const rows = classifyRows( [ row() ], { db: db(), calFor: () => paint( { 'transition-property': 'all' } ), calFiles: files, freshness: fresh } );
	assert.equal( rows[ 0 ].gapClass, 'I-calibration' );
	assert.equal( rows[ 0 ].gapEvidence, null );
	assert.throws( () => classCounts( rows ), /I-calibration with no evidence for its class/ );
	const noFiles = classifyRows( [ row() ], { db: db(), calFor: () => paint( {} ), freshness: fresh } );
	assert.throws( () => classCounts( noFiles ), /I-calibration with no evidence for its class/, 'no file reader, no evidence' );
	const nonI = classifyRows( [ row( { fillClass: 'W-route', reason: 'x' } ) ], { db: db(), calFor: () => paint( {} ), calFiles: files, freshness: fresh } );
	assert.equal( nonI[ 0 ].gapEvidence, null, 'a non-I row gets no calibration evidence' );
} );

test( 'MUST FAIL: census rows carry the Fill row\'s slot', () => {
	const run = { unmapped: [ { node: 'cr-ref-s-0', block: 'sgs/container', slot: '.sgs-container__inner', property: 'transition-property', value: '{"375":"all"}', reason: 'calibration has no reading of transition-property' } ], held: [], writes: [], confirm: [], tree: [] };
	const { rows } = surfaceRows( { client: 'c', surface: 's', report: null, run, lookup: ( slug ) => ( { slug, parent_block: null } ) } );
	assert.equal( rows[ 0 ].slot, '.sgs-container__inner' );
} );
