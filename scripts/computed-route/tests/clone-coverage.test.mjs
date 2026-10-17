// Clone coverage plan Phase 1 (step 1.4), the gate: data/clone-coverage.json holds an entry for every capability in
// data/capabilities.json, and every recogniser, writer and check it names exists. A capability nobody has decided on
// (covered, a gap with its wave, or Bean's exclusion) turns this red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInventory, readInventoryFile } from '../lib/capabilities.mjs';
import { loadCoverage, coverageProblems, statusOf, referenceProblem, seedGaps, gapList } from '../lib/clone-coverage.mjs';
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
	assert.deepEqual( coverageProblems( base, coverage ), [] );
	const planted = buildInventory( { dbFile: fixtureDb( { ...BASE_ROWS, block_attributes: [ ...BASE_ROWS.block_attributes, { block_slug: 'sgs/hero', attr_name: 'autoplay', attr_type: 'boolean', role: 'carousel' } ] } ) } );
	const problems = coverageProblems( planted, coverage );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^block-setting:carousel:boolean: in the inventory with no coverage entry/ );
} );

test( 'MUST FAIL (control 2): a planted draft tag has no coverage entry', () => {
	const inv = clone( committed.inventory );
	inv.sections.html.entries.push( { id: 'html:sgs-planted-element', label: '<sgs-planted-element>', count: 1, examples: [], motion: false } );
	assert.deepEqual( coverageProblems( inv, committed.coverage ).map( ( p ) => p.split( ':' ).slice( 0, 2 ).join( ':' ) ), [ 'html:sgs-planted-element' ] );
} );

test( 'MUST FAIL (control 3): a reference to a writer, file or construct reader that does not exist', () => {
	assert.match( referenceProblem( 'scripts/computed-route/lib/fill-entrance.mjs#noSuchWriter' ), /does not define noSuchWriter/ );
	assert.match( referenceProblem( 'scripts/computed-route/lib/no-such-file.mjs#x' ), /does not exist/ );
	assert.match( referenceProblem( 'construct:sc-for' ), /no reader/ );
	assert.match( referenceProblem( 'construct:not-a-kind' ), /no such construct kind/ );
	assert.equal( referenceProblem( 'scripts/computed-route/lib/fill-entrance.mjs#entranceWrites' ), null );
	assert.equal( referenceProblem( 'construct:handler' ), null );
	const cov = clone( committed.coverage );
	cov.entries[ 'html:div' ].write = 'scripts/computed-route/lib/fill-entrance.mjs#noSuchWriter';
	assert.ok( coverageProblems( committed.inventory, cov ).some( ( p ) => p.startsWith( 'html:div write:' ) ) );
} );

test( 'MUST FAIL (control 4): an unsigned exclusion, a gap with no wave, a motion gap not waiting on Phase 0, an entry for an unknown ID', () => {
	const cov = clone( committed.coverage );
	cov.entries[ 'html:div' ] = { excluded: { reason: 'x', signedBy: 'Claude', date: '2026-10-17' } };
	delete cov.entries[ 'html:video' ].wave;
	delete cov.entries[ 'css-group:animations' ].waiting;
	cov.entries[ 'html:not-in-the-inventory' ] = { recognise: null, write: null, check: null, wave: 'unassigned' };
	const p = coverageProblems( committed.inventory, cov );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:div: an exclusion needs' ) ) );
	assert.ok( p.some( ( x ) => x.startsWith( 'html:video: a gap names its Phase 4 wave' ) ) );
	assert.ok( p.some( ( x ) => x.startsWith( 'css-group:animations: a motion gap waits on Phase 0' ) ) );
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
