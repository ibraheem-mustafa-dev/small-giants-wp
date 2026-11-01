// Proves run-output pruning (lib/prune-runs.mjs): the old stamp folders go, the new run, a git-tracked run, a non-stamp
// folder, a link, a newer run and another surface's folder stay, and a path outside sites/<client>/build/qa is refused.
// Each guard has a case that fails when that guard is removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { pruneRuns, pruneRunsReport, STAMP_PATTERN } from '../lib/prune-runs.mjs';

const TMP = process.env.TMP || 'B:\\sgs-tmp';
fs.mkdirSync( TMP, { recursive: true } );

const S1 = '2026-10-01T10-00-00';
const S2 = '2026-10-02T10-00-00';
const S3 = '2026-10-03T10-00-00';

// A scratch client with fill/header and fill/footer, each holding the given stamp folders (one file inside each).
function scratch( stamps = [ S1, S2, S3 ] ) {
	const root = fs.mkdtempSync( path.join( TMP, 'prune-' ) );
	const qa = path.join( root, 'sites', 'acme', 'build', 'qa' );
	for ( const surface of [ 'header', 'footer' ] ) {
		for ( const s of stamps ) {
			fs.mkdirSync( path.join( qa, 'fill', surface, s ), { recursive: true } );
			fs.writeFileSync( path.join( qa, 'fill', surface, s, 'fill-report.json' ), '{}' );
		}
	}
	return { root, qa, header: path.join( qa, 'fill', 'header' ), footer: path.join( qa, 'fill', 'footer' ) };
}
const names = ( d ) => fs.readdirSync( d ).sort();
const cleanup = ( root ) => fs.rmSync( root, { recursive: true, force: true } );

test( 'positive: older stamp folders go, the new run and the other surface stay', () => {
	const t = scratch();
	const r = pruneRuns( { parent: t.header, keep: path.join( t.header, S3 ) } );
	assert.deepEqual( r.removed.sort(), [ S1, S2 ] );
	assert.deepEqual( names( t.header ), [ S3 ] );
	assert.equal( names( t.footer ).length, 3, 'a run of one surface never prunes another' );
	cleanup( t.root );
} );

test( 'the new run is never deleted, and nothing is deleted when it is missing', () => {
	const t = scratch();
	const keep = path.join( t.header, S2 );
	pruneRuns( { parent: t.header, keep } );
	assert.ok( fs.existsSync( path.join( keep, 'fill-report.json' ) ) );
	assert.throws( () => pruneRuns( { parent: t.header, keep: path.join( t.header, '2026-10-09T10-00-00' ) } ), /existing stamp folder/ );
	assert.deepEqual( names( t.header ), [ S2, S3 ] );
	cleanup( t.root );
} );

test( 'a keep folder outside the parent is refused', () => {
	const t = scratch();
	assert.throws( () => pruneRuns( { parent: t.header, keep: path.join( t.footer, S3 ) } ), /directly inside/ );
	assert.equal( names( t.header ).length, 3 );
	cleanup( t.root );
} );

test( 'a non-stamp folder and a loose file are left alone', () => {
	const t = scratch();
	fs.mkdirSync( path.join( t.header, 'baseline' ) );
	fs.writeFileSync( path.join( t.header, 'unjudged.json' ), '{}' );
	fs.mkdirSync( path.join( t.header, '2026-10-01' ) );
	pruneRuns( { parent: t.header, keep: path.join( t.header, S3 ) } );
	assert.deepEqual( names( t.header ), [ '2026-10-01', S3, 'baseline', 'unjudged.json' ] );
	cleanup( t.root );
} );

test( 'a path outside sites/<client>/build/qa, or an unknown run folder, is refused and nothing is deleted', () => {
	const t = scratch();
	const outside = path.join( t.root, 'elsewhere' );
	fs.mkdirSync( path.join( outside, S1 ), { recursive: true } );
	fs.mkdirSync( path.join( outside, S3 ) );
	assert.throws( () => pruneRuns( { parent: outside, keep: path.join( outside, S3 ) } ), /not a run-output folder/ );
	assert.equal( names( outside ).length, 2 );
	const parity = path.join( t.qa, 'parity', 'out' );
	fs.mkdirSync( path.join( parity, S1 ), { recursive: true } );
	fs.mkdirSync( path.join( parity, S3 ) );
	assert.throws( () => pruneRuns( { parent: parity, keep: path.join( parity, S3 ) } ), /not a run-output folder/ );
	assert.throws( () => pruneRuns( { parent: t.qa, keep: path.join( t.qa, S3 ) } ), /not a run-output folder/ );
	assert.equal( names( parity ).length, 2 );
	cleanup( t.root );
} );

test( 'a stamp folder holding a git-tracked file is kept and reported', () => {
	const t = scratch();
	const git = ( ...a ) => execFileSync( 'git', a, { cwd: t.root, stdio: 'pipe' } );
	git( 'init', '-q' );
	git( 'add', '--', `sites/acme/build/qa/fill/header/${ S1 }/fill-report.json` );
	const r = pruneRuns( { parent: t.header, keep: path.join( t.header, S3 ) } );
	assert.deepEqual( r.removed, [ S2 ] );
	assert.deepEqual( r.skipped, [ { name: S1, reason: 'holds a git-tracked file' } ] );
	assert.ok( fs.existsSync( path.join( t.header, S1, 'fill-report.json' ) ) );
	cleanup( t.root );
} );

test( 'a link (symlink or junction) in place of a stamp folder is never followed or removed', () => {
	const t = scratch( [ S3 ] );
	const target = path.join( t.root, 'precious' );
	fs.mkdirSync( target );
	fs.writeFileSync( path.join( target, 'keep.txt' ), 'x' );
	fs.symlinkSync( target, path.join( t.header, S1 ), 'junction' );
	const r = pruneRuns( { parent: t.header, keep: path.join( t.header, S3 ) } );
	assert.equal( r.skipped[ 0 ].name, S1 );
	assert.ok( fs.existsSync( path.join( target, 'keep.txt' ) ) );
	assert.ok( fs.lstatSync( path.join( t.header, S1 ) ).isSymbolicLink() );
	cleanup( t.root );
} );

test( 'a parent that is itself a link is refused', () => {
	const t = scratch();
	const real = path.join( t.qa, 'site-run-real' );
	fs.mkdirSync( path.join( real, S1 ), { recursive: true } );
	fs.mkdirSync( path.join( real, S3 ) );
	const link = path.join( t.qa, 'site-run' );
	fs.symlinkSync( real, link, 'junction' );
	assert.throws( () => pruneRuns( { parent: link, keep: path.join( link, S3 ) } ), /link or not a folder/ );
	assert.equal( names( real ).length, 2 );
	cleanup( t.root );
} );

test( 'a run newer than the kept one is left alone (it may still be writing)', () => {
	const t = scratch();
	const r = pruneRuns( { parent: t.header, keep: path.join( t.header, S2 ) } );
	assert.deepEqual( r.removed, [ S1 ] );
	assert.ok( names( t.header ).includes( S3 ) );
	cleanup( t.root );
} );

test( 'site-run, solve and site-check parents are accepted; pruneRunsReport never throws', () => {
	const t = scratch();
	for ( const sub of [ 'site-run', 'site-check', path.join( 'solve', 'header' ) ] ) {
		const p = path.join( t.qa, sub );
		fs.mkdirSync( path.join( p, S1 ), { recursive: true } );
		fs.mkdirSync( path.join( p, S2 ) );
		assert.deepEqual( pruneRuns( { parent: p, keep: path.join( p, S2 ) } ).removed, [ S1 ] );
	}
	const lines = [];
	const r = pruneRunsReport( { parent: t.root, keep: path.join( t.root, 'x' ), log: ( m ) => lines.push( m ) } );
	assert.deepEqual( r.removed, [] );
	assert.match( lines[ 0 ], /prune skipped/ );
	cleanup( t.root );
} );

test( 'the stamp pattern matches what the writers stamp', () => {
	const at = new Date( '2026-11-01T12:34:56.789Z' ).toISOString();
	assert.ok( STAMP_PATTERN.test( at.replace( /[:.]/g, '-' ).slice( 0, 19 ) ) );
	assert.ok( STAMP_PATTERN.test( at.replace( /\.\d+Z$/, '' ).replace( /:/g, '-' ) ) );
	assert.ok( ! STAMP_PATTERN.test( 'baseline' ) );
} );
