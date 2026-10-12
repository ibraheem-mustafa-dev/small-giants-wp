// Spec 48 FR-48-28, lib/intake-harness.mjs and lib/intake-reading.mjs: the determinism harness on the fixture export
// tests/fixtures/intake-harness/ (a clock writer, a random writer, a stored key read at boot, a 2000ms timeout writer, a
// 200ms interval counter, a frame-loop counter, an IntersectionObserver reveal below the fold, a Google Font whose
// metrics set a span's width, an infinite CSS animation, an infinite element.animate loop and a 600ms linear fade).
// Two runs give byte-identical JSON lines in rest and sample mode; switching off any one harness item makes the fixture
// differ from the reference or never settle (opts.disable exists only for these negative controls); sample mode reads
// the fade at 0, 300 and 600ms; every record validates against data/reading.schema.json.
// The fixture's HAR is recorded once into the OS temp folder (the first run needs the network); later runs replay it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadAjv } from '../lib/handoff.mjs';
import { recheckManifest, openSandbox } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { HARNESS_DEFAULTS, DISABLE_ITEMS, harnessOptions, harnessSettings, bootStorageKeys, preparePage, gotoDraft, settleRest, sampleTimes } from '../lib/intake-harness.mjs';
import { readRecords, readSurface, sortRecords, toJsonl, readingProblems } from '../lib/intake-reading.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-harness' );
const INDEX = 'Home.dc.html';
// The fixture settles in 2000ms of virtual time; a short ceiling keeps the never-settling controls quick.
const OPTS = { settleMaxMs: 4000 };
const MAIN = '#dc-root > div:nth-child(1) > main:nth-child(1)';
const BAR = { date: 2, random: 3, visits: 4, timeout: 5, interval: 6, frames: 7, spin: 9, loop: 10, fade: 11, reveal: 13 };
const FONT = `${ MAIN } > p:nth-child(8) > span:nth-child(1)`;
const FADE = '[data-h="fade"]';

let harPath;
let ref;

const rest = ( extra = {} ) => readSurface( { folder: FIXTURE, index: INDEX, harPath, width: 1440, mode: 'rest', ...OPTS, ...extra } );
const at = ( records, p, t = 0 ) => records.find( ( r ) => r.path === p && r.t === t ) ?? assert.fail( `no record at ${ p } (t ${ t })` );
const bar = ( records, name ) => at( records, `${ MAIN } > div:nth-child(${ BAR[ name ] })` );
// The records without their harness field, so a negative-control run compares values, layout and boxes only.
const bare = ( records ) => toJsonl( records.map( ( { harness, ...r } ) => r ) );
const changed = ( a, b ) => a.filter( ( r, i ) => JSON.stringify( { ...r, harness: 0 } ) !== JSON.stringify( { ...b[ i ], harness: 0 } ) ).map( ( r ) => r.path );

// One run with a hook between opening the sandbox and preparing the page (a warm profile, a slow font host).
async function customRun( setup, extra = {} ) {
	const sb = await openSandbox( { folder: FIXTURE, index: INDEX, harPath, mode: 'replay' } );
	try {
		await setup( sb );
		const page = await sb.newPage();
		await page.setViewportSize( { width: 1440, height: 900 } );
		const o = await preparePage( page, { ...OPTS, ...extra } );
		await gotoDraft( page, sb.origin, INDEX );
		await settleRest( page, o );
		const records = await readRecords( page, { surface: INDEX, mode: 'rest', width: 1440, harness: harnessSettings( o ) } );
		return { records, sb, page };
	} finally {
		await sb.close();
	}
}

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-harness-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	ref = await rest();
} );

test( 'MUST FAIL (a): two rest runs at one width give byte-identical JSON lines, with every writer at its harness value', async () => {
	const again = await rest();
	assert.equal( again.jsonl, ref.jsonl );
	const r = ref.records;
	// The clock instant: Math.floor(Date.parse('2026-01-05T10:00:00Z') / 1000) % 997 + 1.
	assert.equal( bar( r, 'date' ).declared.width, `${ ( Math.floor( Date.parse( HARNESS_DEFAULTS.clock ) / 1000 ) % 997 ) + 1 }px` );
	assert.equal( bar( r, 'visits' ).declared.width, '10px', 'the stored key was not empty at boot' );
	assert.equal( bar( r, 'timeout' ).declared.width, '200px', 'the 2000ms timeout did not fire at virtual 2000ms' );
	assert.equal( bar( r, 'interval' ).declared.width, '30px', 'the interval did not stop at 3 ticks' );
	assert.equal( bar( r, 'frames' ).declared.width, '60px', 'the frame loop did not stop at 60 frames' );
	assert.equal( bar( r, 'reveal' ).declared.width, '200px', 'the reveal below the fold did not fire' );
	assert.equal( bar( r, 'spin' ).computed.transform, 'matrix(1, 0, 0, 1, 0, 0)', 'the infinite CSS animation is not at phase 0' );
	assert.equal( bar( r, 'loop' ).computed.transform, 'matrix(1, 0, 0, 1, 0, 0)', 'the infinite element.animate loop is not at phase 0' );
	assert.equal( bar( r, 'fade' ).computed.opacity, '1', 'the finite fade is not at its end state' );
	assert.equal( ref.summary.startMs, 0, 'the draft did not boot at virtual time 0' );
	assert.ok( r.length >= 14 && r.every( ( x ) => 'rest' === x.mode && 0 === x.t ) );
} );

test( 'MUST FAIL (a): two sample runs give byte-identical JSON lines', async () => {
	const sample = { target: FADE, times: [ 0, 300, 600 ] };
	const a = await rest( { mode: 'sample', sample } );
	const b = await rest( { mode: 'sample', sample } );
	assert.equal( a.jsonl, b.jsonl );
	assert.equal( a.records.length, ref.records.length * 3 );
} );

test( 'MUST FAIL (c): sample mode reads the 600ms linear fade at 0, 300 and 600ms as opacity 0, 0.5 and 1', async () => {
	const fade = `${ MAIN } > div:nth-child(${ BAR.fade })`;
	// The target named by its draft ID this time (the double-run test above names it by selector).
	const { records } = await rest( { mode: 'sample', sample: { target: { draftId: at( ref.records, fade ).draftId }, times: sampleTimes( 600 ) } } );
	for ( const [ t, want ] of [ [ 0, 0 ], [ 300, 0.5 ], [ 600, 1 ] ] ) {
		const got = Number( at( records, fade, t ).computed.opacity );
		assert.ok( Math.abs( got - want ) <= 0.01, `opacity at ${ t }ms is ${ got }, expected ${ want }` );
	}
	assert.ok( records.every( ( x ) => 'sample' === x.mode ) );
	assert.deepEqual( sampleTimes( 600 ), [ 0, 300, 600 ] );
	assert.throws( () => sampleTimes( Infinity ), /finite positive duration/ );
} );

// Each item off: what must change (a record path) or the run must not settle (a pending writer named).
const CONTROLS = [
	[ 'clock', { differs: [ 'date', 'timeout' ] } ],
	[ 'random', { differs: [ 'random' ] } ],
	[ 'timeouts', { differs: [ 'timeout' ] } ],
	[ 'intervals', { throws: /did not settle[\s\S]*interval 200ms/ } ],
	[ 'raf', { throws: /did not settle[\s\S]*frame: .*requestAnimationFrame\(loop\)/ } ],
	[ 'scroll', { differs: [ 'reveal' ] } ],
	[ 'animations', { differs: [ 'spin', 'loop' ] } ],
];

for ( const [ item, want ] of CONTROLS ) {
	test( `MUST FAIL (b): with the ${ item } item off the fixture differs from the reference or never settles`, async () => {
		if ( want.throws ) {
			await assert.rejects( rest( { disable: [ item ] } ), want.throws );
			return;
		}
		const run = await rest( { disable: [ item ] } );
		assert.notEqual( bare( run.records ), bare( ref.records ), `with ${ item } off the run equals the reference` );
		const diff = changed( ref.records, run.records );
		for ( const name of want.differs ) {
			assert.ok( diff.includes( bar( ref.records, name ).path ), `with ${ item } off the ${ name } record did not change (changed: ${ diff.join( ', ' ) })` );
		}
		assert.deepEqual( run.settings.disabled, [ item ] );
	} );
}

test( 'MUST FAIL (b): storage seeding clears a warm profile; with it off the stored key from an earlier visit leaks in', async () => {
	// An earlier visit in the same profile, before the clock is installed, writes the key.
	const warm = async ( sb ) => {
		const p = await sb.newPage();
		await p.goto( `${ sb.origin }/${ INDEX }` );
		await p.waitForFunction( () => document.querySelector( '#dc-root [data-dc-tpl]' ) && '10px' === document.querySelector( '[data-h="visits"]' )?.style.width );
		await p.close();
	};
	const seeded = await customRun( warm );
	assert.equal( bare( seeded.records ), bare( ref.records ), 'seeded storage on a warm profile differs from the reference' );
	const leaked = await customRun( warm, { disable: [ 'storage' ] } );
	assert.equal( bar( leaked.records, 'visits' ).declared.width, '20px' );
	assert.deepEqual( changed( ref.records, leaked.records ), [ bar( ref.records, 'visits' ).path ] );
} );

test( 'MUST FAIL (b): the font wait reads a late font loaded; with it off the span keeps its fallback width', async () => {
	// The font host answers 6 s late (real time); the harness settles in about 3 s.
	const slow = ( sb ) => sb.context.route( /^https:\/\/fonts\.gstatic\.com\//, async ( route ) => {
		await new Promise( ( done ) => setTimeout( done, 6000 ) );
		await route.fallback();
	} );
	const waited = await customRun( slow );
	assert.equal( at( waited.records, FONT ).box.w, at( ref.records, FONT ).box.w );
	assert.equal( bare( waited.records ), bare( ref.records ) );
	const early = await customRun( slow, { disable: [ 'fonts' ] } );
	assert.notEqual( at( early.records, FONT ).box.w, at( ref.records, FONT ).box.w, 'the span already had the late font' );
} );

test( 'MUST FAIL (d): every record validates against data/reading.schema.json; a record without harness is refused', async () => {
	const ajv = loadAjv();
	assert.deepEqual( readingProblems( ref.records, ajv ), [] );
	const { harness, ...noHarness } = ref.records[ 0 ];
	assert.ok( harness.clock && harness.seed && harness.stepMs );
	const problems = readingProblems( [ noHarness ], ajv );
	assert.ok( problems.some( ( p ) => /harness/.test( p ) ), `no problem names harness: ${ problems.join( '; ' ) }` );
	await assert.rejects( readRecords( { evaluate: () => assert.fail( 'read without harness' ) }, { surface: INDEX, mode: 'rest', width: 1440 } ), /without its harness settings is refused/ );
} );

test( 'records sort by draft ID, then path, then property, and serialise deterministically', () => {
	const shuffled = [ ...ref.records ].reverse().map( ( r ) => ( { ...r, computed: Object.fromEntries( Object.entries( r.computed ).reverse() ) } ) );
	assert.equal( toJsonl( shuffled ), ref.jsonl );
	const ids = sortRecords( shuffled ).map( ( r ) => r.draftId );
	assert.deepEqual( ids, [ ...ids ].sort() );
	const keys = Object.keys( sortRecords( shuffled )[ 0 ].computed );
	assert.deepEqual( keys, [ ...keys ].sort() );
} );

test( 'bootStorageKeys lists keys the logic both reads and writes, resolving literals, class fields and consts', () => {
	const logic = fs.readFileSync( path.join( FIXTURE, INDEX ), 'utf8' ).split( 'data-dc-script' )[ 1 ].split( '>' ).slice( 1 ).join( '>' ).split( '</script>' )[ 0 ];
	assert.deepEqual( bootStorageKeys( logic ), [ { store: 'localStorage', key: 'harness-visits', expr: "'harness-visits'", resolved: true } ] );
	const src = `const S = 'saved';
class Component extends DCLogic {
  KEY = 'trade-form';
  componentDidMount() { const d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); sessionStorage.getItem(S); window.localStorage.getItem('only-read'); }
  persist(v) { localStorage.setItem(this.KEY, JSON.stringify(v)); sessionStorage.setItem(S, '1'); localStorage.setItem('only-written', 1); localStorage.getItem(this.k + 'x'); localStorage.setItem(this.k + 'x', 2); }
}`;
	assert.deepEqual( bootStorageKeys( src ).map( ( k ) => `${ k.store }:${ k.key ?? `?${ k.expr }` }` ), [ "localStorage:?this.k + 'x'", 'localStorage:trade-form', 'sessionStorage:saved' ] );
	assert.throws( () => bootStorageKeys( 'class {' ), /does not parse/ );
} );

test( 'harness settings and options: recorded settings, the disable list checked, one run per context', async () => {
	const s = harnessSettings( { storageKeys: [ { store: 'localStorage', key: 'harness-visits' } ] } );
	assert.equal( s.clock, '2026-01-05T10:00:00.000Z' );
	assert.deepEqual( [ s.stepMs, s.timeoutMaxMs, s.intervalTicks, s.rafFrames, s.scrollStepMs ], [ 16, 10000, 3, 60, 100 ] );
	assert.deepEqual( s.storageKeys, [ 'localStorage:harness-visits' ] );
	assert.equal( s.disabled, undefined );
	assert.deepEqual( ref.settings, harnessSettings( OPTS ) );
	assert.throws( () => harnessOptions( { disable: [ 'gravity' ] } ), /unknown harness item/ );
	assert.throws( () => harnessOptions( { clock: 'soon' } ), /not an ISO instant/ );
	assert.deepEqual( DISABLE_ITEMS.length, 9 );
	const sb = await openSandbox( { folder: FIXTURE, index: INDEX, harPath, mode: 'replay' } );
	try {
		await preparePage( await sb.newPage() );
		await assert.rejects( preparePage( await sb.newPage() ), /already ran the harness/ );
	} finally {
		await sb.close();
	}
} );
