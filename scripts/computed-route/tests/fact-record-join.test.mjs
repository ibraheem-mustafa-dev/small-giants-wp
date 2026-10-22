// Spec 48 FR-48-7, lib/fact-record.mjs::joinFacts: the record carries nothing taken from the clock (two joins of the same inputs are
// byte-identical), the README reader's gap rows join the record's gaps, and the logic's statics, side effects and truncation reach the
// record. Small stand-in readers replace a draft (no browser). Each MUST FAIL test names the behaviour whose removal turns it red
// (tests/fixtures/fact-record-join/mutations.json holds the mutations, tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import { joinFacts, FACTS_SCHEMA_VERSION, factsProblems } from '../lib/fact-record.mjs';

const template = { order: [], elements: {}, gaps: [] };
const empty = { gaps: [], byElement: {}, surfaces: {}, byTemplate: new Map(), conditions: {}, holes: {}, mounted: {}, records: 0, unjoined: [] };
const join = ( extra = {} ) => joinFacts( { client: 'fixture', sources: { files: {}, route: { commit: null } }, widths: [ 375 ], template, logic: empty, surfaces: empty, animations: empty, instances: empty, ...extra } );
const wait = ( ms ) => new Promise( ( done ) => setTimeout( done, ms ) );

test( 'MUST FAIL (determinism): two joins of the same inputs, made at different times, are byte-identical and the record holds no timestamp', async () => {
	const a = join();
	await wait( 12 );
	const b = join();
	assert.equal( JSON.stringify( a ), JSON.stringify( b ) );
	assert.equal( 'generated' in a, false );
	assert.equal( a.schema, FACTS_SCHEMA_VERSION );
	assert.equal( '6', FACTS_SCHEMA_VERSION );
	assert.deepEqual( factsProblems( a ), [], 'the record validates without a generated field' );
} );

test( 'MUST FAIL (readme gaps): the README reader\'s gap rows are gap rows of the record, and are counted', () => {
	const readme = { present: false, title: null, sections: [], judgementCalls: [], openItems: [], businessDetails: [], platformIntent: [], blockHints: [], flagged: [], missing: [], gaps: [ { construct: 'readme', draftId: 'README.md', error: 'README.md could not be read: EACCES' } ] };
	const r = join( { readme } );
	assert.deepEqual( r.gaps, readme.gaps );
	assert.equal( r.counts.gaps, 1 );
	assert.deepEqual( join( { readme: null } ).gaps, [] );
} );

test( 'MUST FAIL (logic fields): the statics, the side effects of a state and a spent statics budget reach the record', () => {
	const logic = { ...empty, statics: { Home: { entries: [], functions: [], width: 1440 } }, stateSideEffects: { 'S-1:open': [ 'Page/0' ] }, staticsTruncated: true };
	const r = join( { logic } );
	assert.deepEqual( r.logic, { statics: logic.statics, stateSideEffects: logic.stateSideEffects, truncated: true } );
	assert.deepEqual( factsProblems( r ), [] );
	assert.deepEqual( join().logic, { statics: {}, stateSideEffects: {} } );
	assert.deepEqual( join().assets, { files: 0, unused: [], missing: [], logicRefs: [] } );
} );
