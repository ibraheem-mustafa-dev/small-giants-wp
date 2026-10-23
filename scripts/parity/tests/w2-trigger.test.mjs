// Track W wave 2 fix 4c: a state whose action finds nothing to trigger on either side (a typo in a click target, a
// control hidden at that width) is one open `(state)` row `nothing-to-trigger`, counted in the summary and the exit
// code, never silent; a state the config scopes to other widths (`widths` on the state) is not run at this one.
// The walk runs the real walker (--lean, headless) on a local page at two widths.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { unmeasuredRun } from '../lib/state-rest.mjs';
import { lintRun } from '../lib/lint.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const WALKER = path.join( HERE, '..', 'draft-live-walk.mjs' );
const PAGE = `<!doctype html><html><head><style>body{margin:0}@media (max-width:600px){#wide{display:none}}</style></head><body>
<header id="bar"><span id="label">Start</span> <button id="go">Go</button> <button id="wide">Wide</button></header>
<script>go.onclick = () => { label.textContent = 'Gone'; }; wide.onclick = () => { label.textContent = 'Wide'; };</script></body></html>`;

let dir;
let walk;
const runOf = ( state, width ) => walk.report.runs.find( ( r ) => r.state === state && r.width === width );
before( () => {
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'w2-trigger-' ) );
	fs.writeFileSync( path.join( dir, 'page.html' ), PAGE );
	const url = JSON.stringify( pathToFileURL( path.join( dir, 'page.html' ) ).href );
	const click = ( src ) => `( h ) => h.clickText( ${ JSON.stringify( src ) }, { tag: 'button', optional: true, wait: 100 } )`;
	const both = ( fn ) => `draft: ${ fn }, live: ${ fn }`;
	fs.writeFileSync( path.join( dir, 'cfg.mjs' ), `export default {
	name: 'w2-trigger', widths: [ 800, 400 ], links: false,
	draft: { url: ${ url } }, live: { url: ${ url } },
	states: [
		{ name: 'closed', settle: 100 },
		{ name: 'typo', settle: 100, ${ both( click( '^og$' ) ) } },
		{ name: 'wide-only', settle: 100, widths: [ 800 ], ${ both( click( '^wide$' ) ) } },
		{ name: 'go', settle: 100, ${ both( click( '^go$' ) ) } },
	],
	pairs: [ { name: 'label', states: [ 'closed', 'typo', 'wide-only', 'go' ], draft: '#label', live: '#label', box: [], structure: false } ],
};
` );
	const out = path.join( dir, 'out' );
	const r = spawnSync( process.execPath, [ WALKER, path.join( dir, 'cfg.mjs' ), '--out', out, '--headless', '--no-review', '--lean' ], { encoding: 'utf8', timeout: 110000 } );
	const report = fs.existsSync( path.join( out, 'report.json' ) ) ? JSON.parse( fs.readFileSync( path.join( out, 'report.json' ), 'utf8' ) ) : { runs: [], failed: `${ r.stdout }\n${ r.stderr }` };
	walk = { report, status: r.status, stdout: r.stdout, md: fs.existsSync( path.join( out, 'report.md' ) ) ? fs.readFileSync( path.join( out, 'report.md' ), 'utf8' ) : '' };
} );
after( () => fs.rmSync( dir, { recursive: true, force: true } ) );

test( 'MUST FAIL: a state whose click finds nothing on either side is one open (state) row, counted in the summary and the exit code', () => {
	const r = runOf( 'typo', 800 );
	assert.ok( r, walk.report.failed );
	assert.deepEqual( Object.keys( r.pairs ), [ '(state)' ] );
	const [ row ] = r.pairs[ '(state)' ].diffs;
	assert.deepEqual( [ row.kind, row.key, row.accepted ], [ 'state', 'nothing-to-trigger', null ] );
	assert.match( row.draft, /\^og\$/ );
	assert.match( row.live, /\^og\$/ );
	assert.match( walk.stdout, /w2-trigger: 2 open/, 'one row at each width, and nothing else open' );
	assert.equal( walk.status, 1 );
	assert.match( walk.md, /- typo @ 400: nothing to trigger on either side, not measured/ );
} );

test( 'control: a state scoped to other widths is not run there, and is run where it is scoped; a state that triggers is measured', () => {
	assert.equal( runOf( 'wide-only', 400 ), undefined, 'scoped away from 400: no run, no row' );
	assert.ok( runOf( 'wide-only', 800 ), 'run at 800' );
	const rows = ( r ) => Object.values( r.pairs ).flatMap( ( p ) => p.diffs );
	assert.deepEqual( rows( runOf( 'wide-only', 800 ) ), [], 'the Wide button is there at 800: the state triggered and both sides agree' );
	assert.equal( runOf( 'wide-only', 800 ).untriggered, undefined );
	assert.deepEqual( rows( runOf( 'go', 400 ) ), [] );
	assert.equal( runOf( 'go', 400 ).untriggered, undefined );
} );

test( 'unmeasuredRun: both sides untriggered is one open row naming what each side tried', () => {
	const run = { pairs: {} };
	assert.equal( unmeasuredRun( run, { untriggered: 'a' }, { untriggered: 'b' } ), true );
	assert.deepEqual( run.pairs[ '(state)' ].diffs.map( ( d ) => [ d.key, d.draft, d.live, d.accepted ] ), [ [ 'nothing-to-trigger', 'tried a, found nothing', 'tried b, found nothing', null ] ] );
	const one = { pairs: {} };
	assert.equal( unmeasuredRun( one, {}, { untriggered: 'b' } ), false );
	assert.deepEqual( one.pairs, {} );
} );

test( 'the lint refuses a state widths that is not a list of widths', () => {
	const cfg = ( widths ) => ( { name: 'x', draft: { url: 'a' }, live: { url: 'b' }, states: [ { name: 'rest' }, { name: 's', widths } ], pairs: [ { name: 'p', states: [ 's' ], draft: '#a', live: '#a' } ] } );
	const lint = ( widths ) => lintRun( path.join( dir, 'none.mjs' ), cfg( widths ), null ).filter( ( p ) => /widths/.test( p ) );
	assert.deepEqual( lint( [ 375, 1440 ] ), [] );
	assert.equal( lint( 1440 ).length, 1 );
	assert.equal( lint( [ '1440' ] ).length, 1 );
	assert.equal( lint( [] ).length, 1 );
} );
