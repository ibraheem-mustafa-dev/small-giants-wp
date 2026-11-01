// Spec 48 FR-48-55 (register A1): a walk whose live page lacks the surface's root element is a failed walk, never "ok"
// (lib/site-run-walk.mjs). Reports in the walker's shape (scripts/parity/draft-live-walk.mjs). Tests marked MUST FAIL fail
// before the check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkAbsence, walkVerdict } from '../lib/site-run-walk.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FOUND = { draft: { box: { w: 1 } }, live: { box: { w: 1 } }, diffs: [] };
const ABSENT = { draft: { box: { w: 1 } }, live: { missing: true, running: null }, diffs: [ { kind: 'presence', key: 'element', draft: 'present', live: 'missing' } ] };
const run = ( state, width, root, rest = [] ) => ( { state, width, pairs: { '(state)': { draft: [], live: [], diffs: [] }, root, ...Object.fromEntries( rest.map( ( p, i ) => [ `child-${ i }`, p ] ) ) } } );
const write = ( report ) => {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'site-run-walk-' ) ), 'report.json' );
	fs.writeFileSync( file, JSON.stringify( report ) );
	return file;
};

test( 'MUST FAIL: a run whose root pair has no live element is absent, with the state and width; a run that found its root is not', () => {
	const report = { runs: [ run( 'open', 1440, ABSENT, [ ABSENT, ABSENT ] ), run( 'open', 768, FOUND, [ ABSENT ] ), run( 'closed', 375, ABSENT ) ] };
	assert.deepEqual( walkAbsence( report ), [ 'open at 1440', 'closed at 375' ] );
	assert.deepEqual( walkAbsence( { runs: [ run( 'default', 1440, FOUND, [ FOUND ] ) ] } ), [] );
} );

test( 'NEGATIVE: a run with no compared pair, the state pair alone, and a root whose live side is merely different are no absence', () => {
	assert.deepEqual( walkAbsence( { runs: [ { state: 'auto-scrolled', width: 1440, pairs: {} } ] } ), [] );
	assert.deepEqual( walkAbsence( { runs: [ { state: 'sent', width: 1440, pairs: { '(state)': { diffs: [] } } } ] } ), [] );
	assert.deepEqual( walkAbsence( { runs: [ run( 'default', 1440, { ...FOUND, diffs: [ { kind: 'style', key: 'color' } ] } ) ] } ), [], 'a style difference is an open row, not an absent surface' );
	assert.deepEqual( walkAbsence( { runs: [ run( 'default', 1440, { draft: null, live: null } ) ] } ), [], 'neither side drew it: nothing to compare' );
	assert.deepEqual( walkAbsence( null ), [] );
	assert.deepEqual( walkAbsence( {} ), [] );
} );

test( 'MUST FAIL: the walk step returns what the walker said for a found surface and throws for an absent one, naming the runs', () => {
	assert.equal( walkVerdict( 'walked', write( { runs: [ run( 'default', 1440, FOUND ) ] } ) ), 'walked [0 open, 0 unreviewed, 0 live errors]' );
	assert.throws( () => walkVerdict( 'walked', write( { runs: [ run( 'open', 1440, ABSENT ), run( 'open', 768, ABSENT ) ] } ) ), /does not show the surface: its root element is missing in open at 1440, open at 768/ );
	assert.equal( walkVerdict( 'no report', path.join( os.tmpdir(), 'site-run-walk-none', 'report.json' ) ), 'no report', 'a missing file is the walker\'s own failure, not judged here' );
} );

test( 'MUST FAIL: site-run.mjs\'s walk step returns its result through walkVerdict', () => {
	const text = fs.readFileSync( path.join( HERE, '..', 'site-run.mjs' ), 'utf8' );
	assert.match( text, /return walkVerdict\( said, path\.join\( parity, 'out', key, 'report\.json' \) \);/ );
	assert.match( text, /import \{ walkVerdict \} from '\.\/lib\/site-run-walk\.mjs';/ );
} );

// A surface the draft itself does not show at a width is missing on both sides there. MUST FAIL: counting every missing
// live root as absent failed indus-foods' mega menus at 768 and 375 and its drawer at 1440, where the draft shows neither
// (2026-11-01).
test( 'walkAbsence: a root missing on both sides is a match, not an absence', () => {
	const BOTH = { draft: { missing: true }, live: { missing: true, running: null }, diffs: [] };
	assert.deepEqual( walkAbsence( { runs: [ run( 'open', 1440, FOUND ), run( 'open', 768, BOTH ), run( 'open', 375, BOTH ) ] } ), [] );
	assert.deepEqual( walkAbsence( { runs: [ run( 'open', 768, BOTH ), run( 'open', 375, ABSENT ) ] } ), [ 'open at 375' ] );
} );
