// Proves the named paint allowance (lib/paint-gate.mjs, `--allow-missing-paint <block,block>`): a block named there does not
// stop a run, the run prints one line per such block it used, and Fill's report (fill-report.md, fill-report.json) lists
// them. A block not named still stops the run; a named block the tree does not use changes nothing; a wildcard or `all` is
// refused. Fill runs end to end on a local draft served by lib/draft.mjs with a fixture cache; the skeleton writer, the
// re-run, freeze and intake's arguments are called with fixtures; solve.mjs, apply.mjs, check-approved.mjs and site-run.mjs
// read the allowance inside main(), which a test never starts (it reaches a site), so their source is read for it. No site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPaints, parseAllowMissingPaint, allowMissingPaintArg, allowMissingPaintArgs, missingPaintLine } from '../lib/paint-gate.mjs';
import { writeRecordFixture } from '../lib/setting-record.mjs';
import { READ_KEY } from '../lib/calibrate-props.mjs';
import { fillSurface, calibrationLoader } from '../fill.mjs';
import { fillReport } from '../lib/fill-report.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { rerunSkeletons } from '../lib/skeleton-rerun.mjs';
import { main as freeze } from '../freeze.mjs';
import { parseArgs as intakeArgs } from '../lib/intake-run.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '../..' );
const SITE = 'acme-test';
const db = openDb();

const DRAFT = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body { margin: 0; font-family: sans-serif } main { display: flex; flex-direction: column; gap: 16px; padding: 24px } h1 { margin: 0; font-size: 32px } p { margin: 0 }
</style></head><body><main><p class="lead">Lead words</p><h1>Hello there</h1></main></body></html>`;
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', 'margin-top': '0px', 'margin-bottom': '0px', 'padding-top': '0px', 'padding-bottom': '0px', 'row-gap': '0px', 'column-gap': '0px' };
const tiers = () => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { ...DEFAULT } ] ) );
const setting = ( property ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
const CAL = {
	'sgs/container': { settings: { gap: setting( 'gap' ), padding: setting( 'padding' ) } },
	'sgs/text': { settings: { fontSize: setting( 'font-size' ) }, text: { text: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
	'sgs/heading': { settings: { fontSize: setting( 'font-size' ) }, text: { content: { path: '', reachedAt: [ 375, 768, 1440 ] } } },
};
const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [
	{ name: 'sgs/text', draftRef: 'p.lead', attributes: {} },
	{ name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } },
] } ];

// Every block of CAL has a record; each except `without` has its default look on SITE.
function cacheWithout( without ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-allow-' ) );
	for ( const [ block, cal ] of Object.entries( CAL ) ) {
		writeRecordFixture( dir, block, { block, site: SITE, discovered: {}, ...cal, ...( without.includes( block ) ? {} : { elements: { '': tiers() } } ) } );
	}
	return dir;
}

function fillRepo() {
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-allow-fill-' ) );
	const build = path.join( work, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: SITE, tree: 'home.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( build, 'qa', 'divergences.json' ), '[]\n' );
	fs.writeFileSync( path.join( work, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [] } } } ) );
	fs.mkdirSync( path.join( work, 'draft' ) );
	fs.writeFileSync( path.join( work, 'draft', 'Home.dc.html' ), DRAFT );
	fs.writeFileSync( path.join( work, 'skeleton.json' ), JSON.stringify( SKELETON ) );
	return work;
}
const fill = ( work, cache, allowMissingPaint, lines ) => fillSurface( { repo: work, client: 'acme', surface: 'home', skeleton: path.join( work, 'skeleton.json' ), draftDir: path.join( work, 'draft' ), draftIndex: 'Home.dc.html', liveUrl: 'http://127.0.0.1:9/home/', out: path.join( work, 'out' ), cache, allowMissingPaint, sweep: false, log: ( m ) => lines.push( m ) } );

test( 'MUST FAIL: Fill goes through with a named block that has no default paint, prints one line for it and lists it in both reports', async () => {
	const work = fillRepo();
	const lines = [];
	const r = await fill( work, cacheWithout( [ 'sgs/heading' ] ), [ 'sgs/heading' ], lines );
	assert.deepEqual( r.missingPaint, [ 'sgs/heading' ] );
	assert.deepEqual( lines.filter( ( l ) => /without default paint/.test( l ) ), [ missingPaintLine( { block: 'sgs/heading', site: SITE, what: 'fill home' } ) ] );
	assert.deepEqual( JSON.parse( fs.readFileSync( path.join( work, 'out', 'fill-report.json' ), 'utf8' ) ).missingPaint, [ 'sgs/heading' ] );
	assert.match( fs.readFileSync( path.join( work, 'out', 'fill-report.md' ), 'utf8' ), /## Resolved without default paint[\s\S]*resolved without it: sgs\/heading\./ );
} );

test( 'negative control: a block not named still stops Fill, before any output', async () => {
	const work = fillRepo();
	// A served draft is not needed: the gate stops first, and a gate that did not would fail at once on the closed port.
	await assert.rejects( fillSurface( { repo: work, client: 'acme', surface: 'home', skeleton: path.join( work, 'skeleton.json' ), draftUrl: 'http://127.0.0.1:9/', liveUrl: 'http://127.0.0.1:9/home/', out: path.join( work, 'out' ), cache: cacheWithout( [ 'sgs/heading' ] ), allowMissingPaint: [ 'sgs/text' ], sweep: false, log: () => {} } ), /fill home stops before writing: 1 block in its tree has no default paint for acme-test \(sgs\/heading\)[\s\S]*name it in --allow-missing-paint sgs\/heading to resolve its settings without default paint/ );
	assert.equal( fs.existsSync( path.join( work, 'out' ) ), false );
} );

test( 'negative control: a report with no block resolved without paint has no such section', () => {
	const r = fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [] } );
	assert.deepEqual( r.json.missingPaint, [] );
	assert.doesNotMatch( r.markdown, /Resolved without default paint/ );
} );

test( 'negative control: a named block the tree does not use changes nothing, and the gate returns the named gaps it used', () => {
	const calFor = calibrationLoader( SITE, cacheWithout( [ 'sgs/heading' ] ) );
	const lines = [];
	assert.deepEqual( assertPaints( { blocks: [ 'sgs/container', 'sgs/text' ], calFor, site: SITE, what: 'x', allow: [ 'sgs/heading' ], log: ( m ) => lines.push( m ) } ), [] );
	assert.deepEqual( lines, [] );
	assert.throws( () => assertPaints( { blocks: [ 'sgs/heading' ], calFor, site: SITE, what: 'x', allow: [ 'sgs/button' ], log: () => {} } ), /sgs\/heading/ );
	assert.deepEqual( assertPaints( { blocks: [ 'sgs/heading', 'sgs/text' ], calFor, site: SITE, what: 'x', allow: [ 'sgs/heading', 'sgs/button' ], log: ( m ) => lines.push( m ) } ), [ 'sgs/heading' ] );
	assert.equal( lines.length, 1 );
} );

test( 'the allowance takes block names only: a wildcard, all, an empty entry or a bare slug is refused', () => {
	assert.deepEqual( parseAllowMissingPaint( 'sgs/decorative-image, sgs/heading,sgs/heading' ), [ 'sgs/decorative-image', 'sgs/heading' ] );
	for ( const bad of [ '*', 'all', 'sgs/*', 'sgs/a,,sgs/b', 'decorative-image', '', 'ALL' ] ) {
		assert.throws( () => parseAllowMissingPaint( bad ), /never a wildcard or "all"/, bad );
	}
	assert.deepEqual( allowMissingPaintArg( [ '--site', 'x' ] ), [] );
	assert.deepEqual( allowMissingPaintArg( [ '--allow-missing-paint', 'sgs/a' ] ), [ 'sgs/a' ] );
	assert.throws( () => allowMissingPaintArg( [ '--allow-missing-paint' ] ), /needs a comma-separated list/ );
	assert.throws( () => allowMissingPaintArg( [ '--allow-missing-paint', '--write' ] ), /needs a comma-separated list/ );
	assert.deepEqual( allowMissingPaintArgs( [] ), [] );
	assert.deepEqual( allowMissingPaintArgs( [ 'sgs/a', 'sgs/b' ] ), [ '--allow-missing-paint', 'sgs/a,sgs/b' ] );
	assert.deepEqual( intakeArgs( [ 'acme', '--allow-missing-paint', 'sgs/a' ] ).allowMissingPaint, [ 'sgs/a' ] );
	assert.match( intakeArgs( [ 'acme', '--allow-missing-paint', 'all' ] ).error, /never a wildcard/ );
} );

// A temp repo holding one surface for the skeleton writer, after tests/paint-gate.test.mjs.
const CLIENT = 'eye-care-ward-end';
function skeletonRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-allow-skel-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	const footer = fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: { site: SITE, intakeSurface: 'site-footer' } } ) );
	const skeletons = { 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: {} } };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons } ) );
	fs.writeFileSync( path.join( build, 'intake', 'inventories', 'site-footer.json' ), footer );
	fs.writeFileSync( path.join( build, 'skeleton', 'footer.inventory.json' ), footer );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( { surfaces: {} } ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, skeletons, file: path.join( build, 'skeleton', 'footer.skeleton.json' ) };
}
const proposing = ( skeleton ) => () => ( { skeleton, proposal: { counts: {}, rows: [] }, problems: [] } );

test( 'the skeleton writer and the re-run go through with a named block, and still stop on one not named', () => {
	const cache = cacheWithout( [ 'sgs/heading' ] );
	const f = skeletonRepo();
	const quiet = console.log;
	const lines = [];
	console.log = ( m ) => lines.push( m );
	try {
		assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, allowMissingPaint: [ 'sgs/text' ], propose: proposing( SKELETON ) } ), /stops before writing/ );
		assert.equal( fs.existsSync( f.file ), false );
		proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, allowMissingPaint: [ 'sgs/heading' ], propose: proposing( SKELETON ) } );
		assert.equal( fs.existsSync( f.file ), true );
		assert.throws( () => rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, cache, propose: proposing( SKELETON ) } ), /skeleton site-footer stops before writing/ );
		assert.deepEqual( Object.keys( rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, cache, allowMissingPaint: [ 'sgs/heading' ], propose: proposing( SKELETON ) } ).surfaces ), [ 'site-footer' ] );
	} finally {
		console.log = quiet;
	}
	assert.deepEqual( lines.filter( ( l ) => /without default paint/.test( l ) ), [ missingPaintLine( { block: 'sgs/heading', site: SITE, what: 'skeleton propose footer' } ), missingPaintLine( { block: 'sgs/heading', site: SITE, what: 'skeleton site-footer' } ) ] );
} );

test( 'freeze passes its allowance to the proposer and refuses "all"', async () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-allow-freeze-' ) );
	const seen = [];
	const io = { repo, propose: async ( client, useBuilt, r, allow ) => ( seen.push( allow ), {} ), now: () => new Date( 2026, 10, 19 ), out: () => {}, err: () => {} };
	assert.equal( await freeze( [ 'snapshot', 'acme-fixture', '--allow-missing-paint', 'sgs/heading' ], io ), 0 );
	assert.deepEqual( seen, [ [ 'sgs/heading' ] ] );
	assert.equal( await freeze( [ 'snapshot', 'acme-fixture', '--allow-missing-paint', 'all' ], io ), 2 );
} );

// The index of `needle` in `src`, failing by name when it is absent.
const holds = ( file, ...needles ) => {
	const src = fs.readFileSync( path.join( ROUTE, file ), 'utf8' );
	needles.forEach( ( n ) => assert.ok( src.includes( n ), `${ file } no longer holds ${ n }` ) );
};

test( 'solve, apply, check-approved and site-run read the allowance and pass it on', () => {
	holds( 'solve.mjs', 'allow: allowMissingPaintArg( argv ) } );' );
	holds( 'apply.mjs', 'allow: allowMissingPaintArg( process.argv ) } );' );
	holds( 'check-approved.mjs', 'allowMissingPaint: allowMissingPaintArg( flags ) } );' );
	holds( 'site-run.mjs', 'const allowMissingPaint = allowMissingPaintArg( argv );', 'proposeSurface( { client, surface: key, allowMissingPaint, site, runLedger: ledger } )', "'--out', path.relative( REPO, out ), '--run-ledger', ledger.file, ...allowMissingPaintArgs( allowMissingPaint ) ]", "'--site', site, '--write', ...allowMissingPaintArgs( allowMissingPaint ) ]" );
	holds( 'lib/intake-run.mjs', 'allowMissingPaint: o.allowMissingPaint } ).intake;' );
	holds( 'lib/intake-run-finalise.mjs', 'allowMissingPaint: o.allowMissingPaint || [] } );' );
} );
