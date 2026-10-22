// Clone coverage plan Phase 1 (step 1.4), the gate: data/clone-coverage.json holds an entry for every capability in
// data/capabilities.json, and every recogniser, writer and check it names exists. A capability nobody has decided on
// (covered, a gap with its wave, or Bean's exclusion) turns this red.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildInventory, readInventoryFile } from '../lib/capabilities.mjs';
import { loadCoverage, loadBaseline, coverageProblems, declaredWrites, statusOf, referenceProblem, testProblem, seedGaps, gapList, COVERAGE_SCHEMA } from '../lib/clone-coverage.mjs';
import { likeEntries, draftGaps, reviewCoverageIds, backfillTests } from '../lib/coverage-register.mjs';
import { loadAjv, schemaProblems } from '../lib/handoff.mjs';
import { fixtureDb, BASE_ROWS } from './fixtures/framework-db.mjs';

const clone = ( o ) => JSON.parse( JSON.stringify( o ) );
const committed = { inventory: readInventoryFile(), coverage: loadCoverage() };

test( 'THE GATE: every capability in data/capabilities.json has a sound coverage entry', () => {
	assert.ok( committed.inventory, 'data/capabilities.json exists (node capabilities.mjs --write)' );
	assert.deepEqual( coverageProblems( committed.inventory, committed.coverage ), [] );
} );

test( 'MUST FAIL (control 1): a planted new block setting has no coverage entry', () => {
	const base = buildInventory( { dbFile: fixtureDb( BASE_ROWS ) } );
	const { coverage } = seedGaps( base, { _meta: {}, entries: {} }, 'test' );
	// A freshly seeded map is all gaps, so no module's declared writes apply to it (control 2b covers them).
	assert.deepEqual( coverageProblems( base, coverage, { baseline: [], writes: {} } ), [] );
	const planted = buildInventory( { dbFile: fixtureDb( { ...BASE_ROWS, block_attributes: [ ...BASE_ROWS.block_attributes, { block_slug: 'sgs/hero', attr_name: 'autoplay', attr_type: 'boolean', role: 'carousel' } ] } ) } );
	const problems = coverageProblems( planted, coverage, { baseline: [], writes: {} } );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^block-setting:carousel:boolean: in the inventory with no coverage entry/ );
} );

test( 'MUST FAIL (control 2): a planted draft tag has no coverage entry', () => {
	const inv = clone( committed.inventory );
	inv.sections.html.entries.push( { id: 'html:sgs-planted-element', label: '<sgs-planted-element>', count: 1, examples: [], motion: false } );
	assert.deepEqual( coverageProblems( inv, committed.coverage ).map( ( p ) => p.split( ':' ).slice( 0, 2 ).join( ':' ) ), [ 'html:sgs-planted-element' ] );
} );

test( 'MUST FAIL (control 2b): a module that declares it writes an ID whose entry is still a gap, or names another writer', () => {
	const file = 'scripts/computed-route/lib/fill-media.mjs';
	const coverage = clone( committed.coverage );
	coverage.entries[ 'html:sgs-planted-element' ] = { recognise: null, write: null, check: null, wave: 'unassigned', note: 'planted' };
	const inv = clone( committed.inventory );
	inv.sections.html.entries.push( { id: 'html:sgs-planted-element', label: '<sgs-planted-element>', count: 1, examples: [], motion: false } );
	const writes = { [ file ]: [ 'html:sgs-planted-element' ] };
	assert.deepEqual( coverageProblems( inv, coverage, { writes } ), [ `html:sgs-planted-element: ${ file } declares it writes this ID, but its entry's write is empty (set it to ${ file }#<symbol>)` ] );
	coverage.entries[ 'html:sgs-planted-element' ].write = 'scripts/computed-route/lib/fill-prop.mjs#resolveProperty';
	assert.equal( coverageProblems( inv, coverage, { writes } ).length, 1, 'a write naming a different module is refused' );
	coverage.entries[ 'html:sgs-planted-element' ].write = `${ file }#mediaDecisions`;
	assert.deepEqual( coverageProblems( inv, coverage, { writes } ), [] );
	delete coverage.entries[ 'html:sgs-planted-element' ];
	assert.ok( coverageProblems( inv, coverage, { writes } ).some( ( p ) => /declares it writes this ID, but the coverage map has it missing/.test( p ) ) );
	assert.deepEqual( coverageProblems( committed.inventory, committed.coverage, { writes: { [ file ]: [ 'html:sgs-typo' ] } } ), [ `html:sgs-typo: ${ file } declares it writes this ID, but the inventory holds no such ID` ] );
	assert.ok( Object.keys( declaredWrites() ).includes( file ), 'the image writer declares its IDs' );
} );

test( 'MUST FAIL: a COVERAGE_WRITES declaration that is not a literal list of quoted IDs throws instead of declaring nothing', () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'declared-writes-' ) );
	const lib = path.join( root, 'scripts', 'computed-route', 'lib', 'sub' );
	fs.mkdirSync( lib, { recursive: true } );
	fs.mkdirSync( path.join( root, 'scripts', 'computed-route', 'tests' ) );
	fs.writeFileSync( path.join( root, 'scripts', 'computed-route', 'tests', 'x.mjs' ), 'export const COVERAGE_WRITES = IGNORED;\n' );
	fs.writeFileSync( path.join( lib, 'a.mjs' ), 'export const COVERAGE_WRITES = [ "html:a", `html:b` ];\n' );
	assert.deepEqual( declaredWrites( root ), { 'scripts/computed-route/lib/sub/a.mjs': [ 'html:a', 'html:b' ] }, 'double quotes, backticks and a subfolder are read; tests are not' );
	for ( const bad of [ 'export const COVERAGE_WRITES = [];\n', 'export const COVERAGE_WRITES = IDS.map( ( x ) => x );\n', "export const COVERAGE_WRITES = [ html, 'html:a' ];\n" ] ) {
		fs.writeFileSync( path.join( lib, 'a.mjs' ), bad );
		assert.throws( () => declaredWrites( root ), /must be a literal array of quoted coverage IDs/, bad );
	}
	fs.rmSync( root, { recursive: true, force: true } );
} );

test( 'MUST FAIL (control 3): a reference to a writer, file or construct reader that does not exist', () => {
	assert.match( referenceProblem( 'scripts/computed-route/lib/fill-entrance.mjs#noSuchWriter' ), /does not define noSuchWriter/ );
	assert.match( referenceProblem( 'scripts/computed-route/lib/no-such-file.mjs#x' ), /does not exist/ );
	assert.match( referenceProblem( 'construct:planted-kind', { registry: { 'planted-kind': { gap: 'no reader yet' } } } ), /no reader/ );
	assert.equal( referenceProblem( 'construct:helmet-font' ), null );
	assert.equal( referenceProblem( 'construct:sc-for' ), null );
	assert.match( referenceProblem( 'construct:not-a-kind' ), /no such construct kind/ );
	assert.equal( referenceProblem( 'scripts/computed-route/lib/fill-motion.mjs#motionWrites' ), null );
	assert.equal( referenceProblem( 'construct:handler' ), null );
	const cov = clone( committed.coverage );
	cov.entries[ 'html:div' ].write = 'scripts/computed-route/lib/fill-entrance.mjs#noSuchWriter';
	assert.ok( coverageProblems( committed.inventory, cov ).some( ( p ) => p.startsWith( 'html:div write:' ) ) );
} );

test( 'MUST FAIL (control 4): an unsigned exclusion, a gap with no wave, an entry for an unknown ID', () => {
	const cov = clone( committed.coverage );
	cov.entries[ 'html:div' ] = { excluded: { reason: 'x', signedBy: 'Claude', date: '2026-10-17' } };
	delete cov.entries[ 'html:video' ].wave;
	cov.entries[ 'html:not-in-the-inventory' ] = { recognise: null, write: null, check: null, wave: 'unassigned' };
	const p = coverageProblems( committed.inventory, cov );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:div: an exclusion needs' ) ) );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:video: a gap names its Phase 4 wave' ) ) );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:not-in-the-inventory: a coverage entry for an ID the inventory does not hold' ) ) );
} );

test( 'a DB section written without the DB does not turn its committed coverage entries into unknown IDs', () => {
	const inv = clone( committed.inventory );
	inv.sections[ 'block-setting' ] = { side: 'framework', source: 'db', status: 'absent', entries: [] };
	const cov = clone( committed.coverage );
	cov.entries[ 'block-setting:colour:styling' ] = { recognise: null, write: null, check: null, wave: 'unassigned' };
	assert.deepEqual( coverageProblems( inv, cov ), [] );
} );

test( 'status: covered needs all three steps; an exclusion is not a gap; the gap list holds only gaps', () => {
	assert.equal( statusOf( { recognise: 'a', write: 'b', check: 'c' } ), 'covered' );
	assert.equal( statusOf( { recognise: 'a', write: null, check: 'c', wave: 'w' } ), 'gap' );
	assert.equal( statusOf( { excluded: { reason: 'r', signedBy: 'Bean', date: '2026-10-17' } } ), 'excluded' );
	assert.ok( gapList( committed.inventory, committed.coverage ).every( ( g ) => 'gap' === statusOf( g.coverage ) ) );
} );

test( 'seeding never changes an existing entry', () => {
	const cov = clone( committed.coverage );
	cov.entries[ 'html:div' ] = { recognise: 'construct:handler', write: null, check: null, wave: 'kept', note: 'mine' };
	delete cov.entries[ 'html:span' ];
	const { coverage, added } = seedGaps( committed.inventory, cov, 'seeded' );
	assert.equal( added, 1 );
	assert.deepEqual( coverage.entries[ 'html:div' ], cov.entries[ 'html:div' ] );
	assert.equal( coverage.entries[ 'html:span' ].wave, 'unassigned' );
} );

test( 'MUST FAIL: no gap carries a Phase 0 marker now the motion model is built; the schema refuses one, and a seeded gap has none', () => {
	assert.ok( Object.values( committed.coverage.entries ).every( ( e ) => ! ( 'waiting' in e ) ) );
	const cov = clone( committed.coverage );
	cov.entries[ 'css-group:animations' ] = { ...cov.entries[ 'css-group:animations' ], waiting: 'phase-0' };
	assert.ok( schemaProblems( loadAjv(), COVERAGE_SCHEMA, cov ).length > 0 );
	const { coverage } = seedGaps( { sections: { svg: { entries: [ { id: 'svg:animate', motion: true } ] } } }, { entries: {} }, 'note' );
	assert.deepEqual( Object.keys( coverage.entries[ 'svg:animate' ] ).sort(), [ 'check', 'note', 'recognise', 'wave', 'write' ] );
} );

const COVERED = { recognise: 'construct:handler', write: 'scripts/computed-route/lib/resolve.mjs#resolve', check: 'scripts/computed-route/lib/triage.mjs#triage', wave: 'w', note: 'n' };
const ONE = { sections: { html: { status: 'present', entries: [ { id: 'html:planted', label: 'planted', count: 1, examples: [], motion: false } ] } } };
const withEntry = ( entry ) => ( { entries: { 'html:planted': entry } } );
const TEST_FILE = 'scripts/computed-route/tests/resolve.test.mjs';

test( 'the committed baseline is sorted, and every covered entry names a test or is in it', () => {
	const baseline = loadBaseline();
	assert.deepEqual( baseline, [ ...baseline ].sort() );
	for ( const [ id, e ] of Object.entries( committed.coverage.entries ) ) {
		if ( 'covered' === statusOf( e ) ) {
			assert.ok( e.test || baseline.includes( id ), `${ id } names no test and is not in the baseline` );
		}
	}
} );

test( 'MUST FAIL: a covered entry with no test that is not in the baseline', () => {
	const p = coverageProblems( ONE, withEntry( COVERED ), { baseline: [], writes: {} } );
	assert.equal( p.length, 1 );
	assert.match( p[ 0 ], /^html:planted: a covered entry names the test that proves it/ );
	assert.deepEqual( coverageProblems( ONE, withEntry( COVERED ), { baseline: [ 'html:planted' ], writes: {} } ), [] );
	assert.deepEqual( coverageProblems( ONE, withEntry( { ...COVERED, test: TEST_FILE } ), { baseline: [], writes: {} } ), [] );
} );

test( 'MUST FAIL: a test path that does not exist, or a #name the file never mentions', () => {
	const missing = coverageProblems( ONE, withEntry( { ...COVERED, test: 'scripts/computed-route/tests/no-such.test.mjs' } ), { baseline: [] } );
	assert.match( missing.join( '\n' ), /html:planted test: .*no-such\.test\.mjs does not exist/ );
	assert.match( testProblem( `${ TEST_FILE }#zzNoSuchTestNamezz` ), /does not mention/ );
	assert.equal( testProblem( `${ TEST_FILE }#fluidForm` ), null );
} );

test( 'MUST FAIL: a baseline id that now has a test, is no longer covered, or has no entry is stale', () => {
	const hasTest = coverageProblems( ONE, withEntry( { ...COVERED, test: TEST_FILE } ), { baseline: [ 'html:planted' ] } );
	assert.match( hasTest.join( '\n' ), /html:planted: in coverage-test-baseline\.json but it now names a test/ );
	const gap = coverageProblems( ONE, withEntry( { recognise: null, write: null, check: null, wave: 'w' } ), { baseline: [ 'html:planted' ] } );
	assert.match( gap.join( '\n' ), /no longer covered/ );
	assert.match( coverageProblems( ONE, withEntry( COVERED ), { baseline: [ 'html:planted', 'html:gone' ] } ).join( '\n' ), /html:gone: in coverage-test-baseline\.json but no longer covered/ );
} );

test( 'MUST FAIL: a reference or test under sites/ is refused', () => {
	assert.match( referenceProblem( 'sites/some-draft/build/x.mjs#y' ), /never by a file under sites\// );
	assert.match( testProblem( 'sites/some-draft/tests/x.test.mjs' ), /never by a file under sites\// );
	const p = coverageProblems( ONE, withEntry( { ...COVERED, write: 'sites/some-draft/fix.mjs#fix', test: 'sites/some-draft/t.test.mjs' } ), { baseline: [] } );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:planted write:' ) && x.includes( 'sites/' ) ) );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:planted test:' ) && x.includes( 'sites/' ) ) );
} );

test( '--like: same write reference, or the same id prefix when the entry has no write; a gap and the entry itself are never listed', () => {
	const cov = { entries: {
		'a:one': { ...COVERED, write: 'w.mjs#x' }, 'a:two': { ...COVERED, write: 'w.mjs#x' }, 'a:three': { ...COVERED, write: 'other.mjs#y' },
		'a:gap': { recognise: null, write: 'w.mjs#x', check: null, wave: 'w' }, 'svg:new': { recognise: null, write: null, check: null, wave: 'w' },
		'svg:old': COVERED, 'html:old': COVERED,
	} };
	assert.deepEqual( likeEntries( cov, 'a:one' ).map( ( x ) => x.id ), [ 'a:two' ] );
	assert.deepEqual( likeEntries( cov, 'svg:new' ).map( ( x ) => x.id ), [ 'svg:old' ] );
	assert.equal( likeEntries( cov, 'nope:x' ), null );
} );

test( '--drafts: ids from missing:coverage cells that are still gaps, grouped by wave with the draft folder name; covered ids are dropped, an id with no entry lands under wave none', () => {
	const cov = { entries: { 'x:gap1': { recognise: null, write: null, check: null, wave: 'wave a' }, 'x:gap2': { recognise: null, write: null, check: null, wave: 'wave b' }, 'x:done': COVERED } };
	const row = ( id ) => `| \`missing:coverage:${ id }\` | ${ id } seen | gap |`;
	const reviews = [ { draft: 'draft-one', markdown: [ row( 'x:gap1' ), row( 'x:gap1' ), row( 'x:done' ) ].join( '\n' ) }, { draft: 'draft-two', markdown: [ row( 'x:gap1' ), row( 'x:gap2' ), row( 'x:unknown' ) ].join( '\n' ) } ];
	const r = draftGaps( cov, reviews );
	assert.deepEqual( r.byWave, { 'wave a': { 'x:gap1': [ 'draft-one', 'draft-two' ] }, 'wave b': { 'x:gap2': [ 'draft-two' ] }, none: { 'x:unknown': [ 'draft-two' ] } } );
	assert.equal( r.ids, 3 );
	assert.deepEqual( r.drafts, { 'draft-one': 1, 'draft-two': 3 } );
	assert.deepEqual( reviewCoverageIds( row( 'a:b' ) ), [ 'a:b' ] );
} );

test( 'backfill: a note naming an existing test sets it; the rest goes to the baseline', () => {
	const cov = { entries: { 'x:a': { ...COVERED, note: 'proved by tests/resolve.test.mjs' }, 'x:b': { ...COVERED, note: 'proved by tests/no-such.test.mjs' }, 'x:c': { ...COVERED, note: 'none' }, 'x:d': { ...COVERED, test: TEST_FILE } } };
	const r = backfillTests( cov );
	assert.equal( r.coverage.entries[ 'x:a' ].test, TEST_FILE );
	assert.equal( r.backfilled, 1 );
	assert.deepEqual( r.baseline, [ 'x:b', 'x:c' ] );
} );

test( 'the seven fluid and presentational-hint entries are covered with a test', () => {
	for ( const id of [ 'css-function:calc', 'css-function:clamp', 'css-function:min', 'css-function:max', 'css-unit:vh', 'css-unit:vw', 'html-attr:img.height' ] ) {
		assert.equal( statusOf( committed.coverage.entries[ id ] ), 'covered', id );
		assert.ok( committed.coverage.entries[ id ].test, id );
	}
} );
