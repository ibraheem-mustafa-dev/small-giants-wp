// Spec 48 FR-48-7 and FR-48-17, lib/skeleton-record.mjs::recordForIntakeRun: the fact record an intake run's own skeleton
// stage proposes from. The run writes facts.json after that stage (the facts stage reads the inventories it saves), so a
// record the export has outgrown, one an older schema wrote or one that does not parse is the record the run is replacing:
// the stage proposes without it, as on a client's first run, and says so. Before, each surface's proposal threw on the
// stale record, every surface became a gap row with no inventory and the pass after the facts stage skipped them all, so a
// rerun after a draft change gave no skeleton rows and lost every mark (Indus, 2026-11-19: 43 surfaces, 43 gaps, 0 rows).
// tests/skeleton-record-intake-run.mutations.json holds the mutations (tools/mutate.mjs runs them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { recordFor, recordForIntakeRun } from '../lib/skeleton-record.mjs';
import { factsFile, factsProblems, loadFacts, InvalidRecordError, FACTS_SCHEMA_VERSION } from '../lib/fact-record.mjs';
import { sourcesOf, StaleRecordError } from '../lib/freshness.mjs';

const temps = [];
test.after( () => temps.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );

// A repository holding one client's handoff folder and a fact record written for it as it stands.
function repoWithRecord( client = 'fixture' ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-record-run-' ) );
	temps.push( repo );
	const handoff = path.join( repo, 'sites', client, 'handoff' );
	fs.mkdirSync( handoff, { recursive: true } );
	fs.writeFileSync( path.join( handoff, 'Home.dc.html' ), '<main>one</main>\n' );
	const record = {
		schema: FACTS_SCHEMA_VERSION, client, widths: [ 375, 768, 1440 ], sources: sourcesOf( handoff, { commit: null } ), elements: {}, surfaces: {}, pages: [], animations: { records: 0, unjoined: [] }, assets: { files: 0, unused: [], missing: [], logicRefs: [] }, gaps: [],
		counts: { elements: 0, holes: 0, perWidth: {}, widthConditions: 0, elementsInSurfaces: 0, instances: 0, gaps: 0, effects: { records: 0, joined: 0, unjoined: 0, elements: 0 }, assets: { files: 0, elements: 0, unused: 0, missing: 0 } },
	};
	assert.deepEqual( factsProblems( record ), [], 'the fixture record is a valid fact record' );
	const file = factsFile( repo, client );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( record ) );
	return { repo, client, handoff, file, facts: { repo, client } };
}
const logged = () => {
	const lines = [];
	return { lines, log: ( l ) => lines.push( l ) };
};

test( 'a current record is the record the stage proposes from, and nothing is logged', () => {
	const r = repoWithRecord();
	const l = logged();
	assert.equal( recordForIntakeRun( r.facts, l ).client, 'fixture' );
	assert.deepEqual( l.lines, [] );
} );

test( 'MUST FAIL (stale): a record the export has outgrown is none for the run that replaces it, and the log names the changed file', () => {
	const r = repoWithRecord();
	fs.appendFileSync( path.join( r.handoff, 'Home.dc.html' ), '<!-- edited -->\n' );
	// Every other reader still refuses it.
	assert.throws( () => recordFor( r.facts ), StaleRecordError );
	const l = logged();
	assert.equal( recordForIntakeRun( r.facts, l ), null );
	assert.equal( l.lines.length, 1 );
	assert.match( l.lines[ 0 ], /Home\.dc\.html changed/ );
	assert.match( l.lines[ 0 ], /proposed again from the new record/ );
} );

test( 'MUST FAIL (invalid): a record that does not validate, or does not parse, is none for the run that replaces it', () => {
	const r = repoWithRecord();
	const record = JSON.parse( fs.readFileSync( r.file, 'utf8' ) );
	fs.writeFileSync( r.file, JSON.stringify( { ...record, schema: '1' } ) );
	assert.throws( () => loadFacts( r.client, { repo: r.repo } ), ( e ) => e instanceof InvalidRecordError && /does not validate/.test( e.message ) );
	const l = logged();
	assert.equal( recordForIntakeRun( r.facts, l ), null );
	assert.match( l.lines[ 0 ], /does not validate/ );
	const cut = repoWithRecord( 'cut' );
	fs.writeFileSync( cut.file, '{"schema":' );
	assert.throws( () => loadFacts( cut.client, { repo: cut.repo } ), ( e ) => e instanceof InvalidRecordError && /does not parse/.test( e.message ) );
	assert.equal( recordForIntakeRun( cut.facts, logged() ), null );
} );

test( 'negative control: a client with no record has none and logs nothing here; any other failure still throws', () => {
	const r = repoWithRecord();
	fs.rmSync( r.file );
	const l = logged();
	const warn = console.warn;
	console.warn = () => {};
	try {
		assert.equal( recordForIntakeRun( r.facts, l ), null );
	} finally {
		console.warn = warn;
	}
	assert.deepEqual( l.lines, [] );
	const boom = () => {
		throw new Error( 'the disk is gone' );
	};
	assert.throws( () => recordForIntakeRun( r.facts, { ...logged(), load: boom } ), /the disk is gone/ );
} );
