// Proves that a site run neither degrades nor skips silently: it stops before any stage when a gitignored intake file its stages read is
// missing (intakeInputsMissing), records a stage that did not run as { ok: true, skipped: <reason> } and prints it `skip`
// (stageRecord, stageLine), exits 1 when a stage failed and, with --strict, when a stage did not run (stageProblems, runExit), and adds no
// template copy to an --only run with --no-copies (runKeys). The command's own wiring is read from its source. Nothing runs a site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { intakeInputsMissing, runExit, runKeys, stageLine, stageProblems, stageRecord } from '../site-run.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const source = fs.readFileSync( path.join( ROUTE, 'site-run.mjs' ), 'utf8' );

test( 'MUST FAIL: a stage that did not run is recorded ok with its reason and no failure; a run stage keeps its seconds and detail', () => {
	assert.deepEqual( stageRecord( { ok: true, ms: 0, skipped: 'not in --stages' } ), { ok: true, skipped: 'not in --stages', seconds: 0 } );
	assert.deepEqual( stageRecord( { ok: true, ms: 4200, detail: '3 nodes' } ), { ok: true, seconds: 4, detail: '3 nodes' } );
	assert.deepEqual( stageRecord( { ok: false, ms: 900, detail: 'exit 1' } ), { ok: false, seconds: 1, detail: 'exit 1' } );
	assert.equal( stageRecord( { ok: true, ms: 1, skipped: null } ).skipped, undefined, 'negative control: no reason, no skipped field' );
} );

test( 'MUST FAIL: a skipped stage prints `skip`, a failed one `FAIL`, a run one `ok`, each with its surface, stage and reason', () => {
	assert.equal( stageLine( 'home', 'walk', stageRecord( { ok: true, skipped: 'not in --stages' } ) ), 'skip home walk 0s - not in --stages' );
	assert.equal( stageLine( 'home', 'build', stageRecord( { ok: false, ms: 2000, detail: 'exit 5' } ) ), 'FAIL home build 2s - exit 5' );
	assert.equal( stageLine( 'home', 'fill', stageRecord( { ok: true, ms: 3000 } ) ), 'ok   home fill 3s' );
	assert.equal( stageLine( 'home', 'fill', stageRecord( { ok: true, ms: 3000, detail: 'wrote tree' } ) ), 'ok   home fill 3s - wrote tree' );
} );

const status = {
	home: { inventory: stageRecord( { ok: true, ms: 1000 } ), walk: stageRecord( { ok: true, skipped: 'not in --stages' } ) },
	about: { build: stageRecord( { ok: false, ms: 1000, detail: 'exit 5: tree rejected' } ) },
};

test( 'MUST FAIL: stageProblems lists the failed and the not-run stages; a failed stage exits 1, a not-run one only under --strict', () => {
	assert.deepEqual( stageProblems( status ), { failed: [ 'about build: exit 5: tree rejected' ], skipped: [ 'home walk: not in --stages' ] } );
	assert.equal( runExit( status ), 1 );
	assert.equal( runExit( { home: status.home } ), 0, 'a skipped stage alone does not fail a run' );
	assert.equal( runExit( { home: status.home }, { strict: true } ), 1, '--strict fails it' );
	assert.equal( runExit( { home: { inventory: status.home.inventory } }, { strict: true } ), 0, 'negative control: nothing failed or skipped' );
	assert.equal( runExit( {}, { strict: true } ), 0 );
} );

const surfaces = {
	about: { shell: 'page', target: { postId: 2 } },
	contact: { shell: 'page', target: { postId: 3 } },
	'template-page': { copy: { from: 'fill' }, target: { template: 'page' } },
	'template-404': { copy: { from: 'page' }, target: { template: '404' } },
};

test( 'MUST FAIL: --no-copies adds no template copy to an --only run; without it the page copy and the copies built from it come too', () => {
	assert.deepEqual( runKeys( surfaces, [ 'contact' ], { copies: false } ), [ 'contact' ] );
	assert.deepEqual( runKeys( surfaces, [ 'contact' ] ), [ 'contact', 'template-page', 'template-404' ] );
	assert.deepEqual( runKeys( surfaces, [ 'contact', 'template-page' ], { copies: false } ), [ 'contact', 'template-page' ], 'a copy named in --only still runs' );
	assert.deepEqual( runKeys( surfaces, null, { copies: false } ), Object.keys( surfaces ), 'a whole run is the same either way' );
} );

const intake = { skeletons: { form: { kind: 'form' }, drawer: { root: { viaState: 'open' } }, page: { kind: 'page' } } };
const entries = {
	home: { intakeSurface: 'page', target: { postId: 1 } },
	send: { intakeSurface: 'form', target: { postId: 2 } },
	menu: { intakeSurface: 'drawer', target: { postId: 3 } },
	'template-404': { copy: { from: 'page' }, target: { template: '404' } },
	post: { intakeSurface: 'page', contentOnly: true, target: { postId: 4 } },
	cart: { noDraft: 'no draft page', target: { postId: 5 } },
};
const want = ( o ) => intakeInputsMissing( { client: 'acme', build: path.join( 'x', 'build' ), surfaces: entries, intake, exists: () => false, ...o } );

test( 'MUST FAIL: a run whose propose or fill stage reads facts.json stops, naming the file and both ways to get it', () => {
	const m = want( { stages: [ 'propose', 'fill', 'build' ], keys: [ 'home' ] } );
	assert.equal( m.length, 1 );
	assert.match( m[ 0 ], /^sites\/acme\/build\/intake\/facts\.json is missing, and the propose and fill stage reads it/ );
	assert.match( m[ 0 ], /cp <that checkout>\/sites\/acme\/build\/intake\/facts\.json sites\/acme\/build\/intake\// );
	assert.match( m[ 0 ], /node scripts\/computed-route\/intake\.mjs --facts acme/ );
	assert.equal( want( { stages: [ 'fill' ], keys: [ 'home' ] } )[ 0 ].match( /the (\w+) stage reads it/ )[ 1 ], 'fill' );
} );

test( 'a run that reads no facts.json (walk only, nothing to read, or the file there) is not stopped', () => {
	assert.deepEqual( want( { stages: [ 'build', 'apply', 'walk' ], keys: [ 'home' ] } ), [], 'no stage reads it' );
	assert.deepEqual( want( { stages: [ 'propose', 'fill' ], keys: [ 'template-404' ] } ), [], 'a copy reads no draft' );
	assert.deepEqual( want( { stages: [ 'propose', 'fill' ], keys: [ 'cart' ] } ), [], 'a surface with no draft reads none' );
	assert.deepEqual( want( { stages: [ 'propose', 'fill' ], keys: [ 'post' ] } ), [], 'a content-only post without --with-content is skipped' );
	assert.equal( want( { stages: [ 'propose', 'fill' ], keys: [ 'post' ], withContent: true } ).length, 1, 'with --with-content it is read' );
	assert.deepEqual( want( { stages: [ 'propose', 'fill', 'inventory' ], keys: [ 'home', 'send', 'menu' ], exists: () => true } ), [], 'negative control: both there' );
} );

test( 'MUST FAIL: the inventory stage on a state-driven or form surface stops when inventories/ is missing, and only then', () => {
	const m = want( { stages: [ 'inventory' ], keys: [ 'home', 'send', 'menu' ] } );
	assert.equal( m.length, 1 );
	assert.match( m[ 0 ], /^sites\/acme\/build\/intake\/inventories\/ is missing, and the inventory stage reads it for send, menu/ );
	assert.match( m[ 0 ], /cp -r <that checkout>\/sites\/acme\/build\/intake\/inventories sites\/acme\/build\/intake\// );
	assert.deepEqual( want( { stages: [ 'inventory' ], keys: [ 'home' ] } ), [], 'a plain page reads its own inventory' );
	assert.deepEqual( want( { stages: [ 'fill' ], keys: [ 'send' ], exists: ( f ) => /facts/.test( f ) } ), [], 'no inventory stage, no inventories folder' );
	assert.equal( want( { stages: [ 'inventory', 'fill' ], keys: [ 'send' ], exists: ( f ) => /inventories/.test( f ) } ).length, 1, 'inventories there, facts missing: only facts' );
} );

test( 'MUST FAIL: the command records not-run stages, returns the exit code, names no --skip-stages and fails a page with no recorded shell under --no-copies', () => {
	assert.match( source, /note\( key, stage, true, 0, null, 'not in --stages' \);\n\t\t\treturn true;/ );
	assert.match( source, /note\( key, 'apply', true, 0, null, 'not in --stages' \);/ );
	assert.match( source, /const record = stageRecord\( \{ ok, ms, detail, skipped, na \} \);/ );
	assert.match( source, /return runExit\( status, \{ strict \} \);/ );
	assert.match( source, /main\( process\.argv\.slice\( 2 \) \)\.then\( \( code \) => \{\n\t\tprocess\.exitCode = code;/ );
	assert.match( source, /if \( missingInputs\.length \) \{\n\t\tthrow new Error\( missingInputs\.join\( '\\n' \) \);\n\t\}\n\tconst dir = path\.join/ );
	assert.match( source, /if \( ! recorded && ! withCopies \) \{\n\t\t\t\treturn note\( key, 'build', false, 0, `--no-copies: no \$\{ entry\.shell \} shell is recorded/ );
	assert.match( source, /const keys = runKeys\( surfaces, only, \{ copies: withCopies \} \);/ );
	assert.ok( ! /--skip-stages/.test( source ), 'the header names no flag main never reads' );
	assert.match( source, /\[--no-copies\] \[--strict\]/ );
} );
