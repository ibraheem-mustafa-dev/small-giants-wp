#!/usr/bin/env node
// Runs the route's non-browser test suite on GitHub Actions for a pushed branch and prints the result:
//   node scripts/computed-route/tools/ci-route-tests.mjs <branch> [--no-wait]
// The branch must be on origin and contain .github/workflows/route-tests.yml (a branch cut from main after that file landed does).
// A branch named fix/** or main starts a run by itself when pushed; this tool then finds that run for the branch's head commit,
// and starts one with `gh workflow run` only when none exists (any other branch name). It then waits (`gh run watch`), prints the
// per-file summary (`ci-summary.mjs` over the run's artifacts, downloaded to E:/sgs-tmp/ci-runs/<run id>) and, on failure, the
// failed steps' log. Exit 0 when every failure is a known one (data/ci-known-failures.json), 1 otherwise, 2 on a usage problem.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '..', '..' );
const WORKFLOW = 'route-tests.yml';
const RUNS = 'E:/sgs-tmp/ci-runs';

const sh = ( cmd, args, opts = {} ) => spawnSync( cmd, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts } );
const gh = ( ...args ) => {
	const r = sh( 'gh', args );
	if ( 0 !== r.status ) { console.error( `ci-route-tests: gh ${ args.join( ' ' ) } failed:\n${ r.stderr || r.stdout }` ); process.exit( 2 ); }
	return r.stdout.trim();
};
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

const argv = process.argv.slice( 2 );
const branch = argv.find( ( a ) => ! a.startsWith( '--' ) );
if ( ! branch ) { console.error( 'usage: ci-route-tests.mjs <branch> [--no-wait]' ); process.exit( 2 ); }

const remote = sh( 'git', [ 'ls-remote', 'origin', `refs/heads/${ branch }` ] ).stdout.split( /\s/ )[ 0 ];
if ( ! remote ) { console.error( `ci-route-tests: origin has no branch ${ branch }. Push it first: git push origin ${ branch }` ); process.exit( 2 ); }
console.log( `ci-route-tests: ${ branch } at ${ remote.slice( 0, 9 ) } on origin` );

const find = () => JSON.parse( gh( 'run', 'list', '--workflow', WORKFLOW, '--branch', branch, '--limit', '20', '--json', 'databaseId,headSha,status,event' ) ).find( ( r ) => r.headSha === remote );
let run = find();
if ( ! run && /^(fix\/|main$)/.test( branch ) ) { await sleep( 15000 ); run = find(); }
if ( ! run ) {
	console.log( 'ci-route-tests: no run for that commit yet, starting one' );
	gh( 'workflow', 'run', WORKFLOW, '--ref', branch );
	for ( let i = 0; i < 12 && ! run; i++ ) { await sleep( 5000 ); run = find(); }
	if ( ! run ) { console.error( 'ci-route-tests: the run did not appear (does the branch contain the workflow file?)' ); process.exit( 2 ); }
}
const id = String( run.databaseId );
console.log( `ci-route-tests: run ${ id }: https://github.com/${ gh( 'repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner' ) }/actions/runs/${ id }` );
if ( argv.includes( '--no-wait' ) ) process.exit( 0 );

sh( 'gh', [ 'run', 'watch', id, '--interval', '20' ], { stdio: [ 'ignore', 'ignore', 'inherit' ] } );
const out = path.join( RUNS, id );
fs.mkdirSync( out, { recursive: true } );
const pattern = 'route-tests-shard-*';
const dl = sh( 'gh', [ 'run', 'download', id, '--pattern', pattern, '--dir', out ] );
if ( 0 !== dl.status ) console.error( `ci-route-tests: no shard output downloaded:\n${ dl.stderr }` );
const sum = sh( process.execPath, [ path.join( ROUTE, 'tools', 'ci-summary.mjs' ), out ] );
console.log( sum.stdout + sum.stderr );
if ( 0 !== sum.status ) {
	const failed = sh( 'gh', [ 'run', 'view', id, '--log-failed' ] ).stdout;
	console.log( failed.split( '\n' ).slice( -60 ).join( '\n' ) );
}
process.exitCode = 0 === sum.status ? 0 : 1;
