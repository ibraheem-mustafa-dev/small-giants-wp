// The skeleton writer's intake context (skeleton.mjs::proposeSurface, lib/key-space.mjs): the surface kind, name and
// motion that intake passes, the link a manifest entry holds to its intake skeleton, and the two key spaces of a draft's
// elements. A temp repo; no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { proposeSurface, reviewSurface, intakeContext, main } from '../skeleton.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { servedKey, servedMotion, isServedInventory } from '../lib/key-space.mjs';
import { sourcesOf } from '../lib/freshness.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const footer = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const ROOT = 'Eye Care Site';
// A re-export renumbers the draft's elements, so the key under test is found by a stable property: the first root-host
// paragraph that carries words, never a literal number.
// When the inventory has no such paragraph the first test below fails by name; the file still loads.
const SIG = footer.elements.find( ( e ) => /^Root\/\d+#0$/.test( e.key ) && ( e.words || '' ).trim() && 'p' === e.tag ) ?? null;
const KEY = SIG?.key ?? '';
const KEY_PATH = KEY.replace( /^Root/, '' );
const db = openDb();

test( 'the committed footer inventory holds a root-host paragraph with words (the key the tests below read)', () => {
	assert.ok( SIG, `sites/${ CLIENT }/build/skeleton/footer.inventory.json has no element keyed Root/<n>#0 that is a <p> with words; the tests that read KEY have no subject` );
} );

// A temp repo holding one surface: the manifest entry, intake.json, the inventory and the saved files.
function fixture( { entry = { site: 'x', intakeSurface: 'site-footer' }, decisions = { surfaces: {} }, extra = [] } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'skel-ctx-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: entry } ) );
	const animations = { records: [ { iterations: 'infinite', element: { dc: ROOT, template_tpl_id: '847' }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-50%)' } ] }, ...extra ] };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: { checks: { rootName: ROOT } } } }, inventory: { animations } } ) );
	// The saved inventory records the export it was read from (lib/freshness.mjs): here an export holding one draft.
	const handoff = path.join( repo, 'sites', CLIENT, 'handoff' );
	fs.mkdirSync( handoff, { recursive: true } );
	fs.writeFileSync( path.join( handoff, 'Home.dc.html' ), '<p>draft</p>' );
	fs.writeFileSync( path.join( build, 'skeleton', 'footer.inventory.json' ), JSON.stringify( { ...footer, sources: sourcesOf( handoff, { commit: null } ) } ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( decisions ) );
	// The facts read the list block's block.json from the repo they are given.
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}
const spy = ( seen ) => ( args ) => {
	seen.push( args );
	return { skeleton: [], proposal: { counts: {}, rows: [] }, problems: [] };
};

test( 'propose without an intakeSurface refuses and names the missing link', () => {
	const f = fixture( { entry: { site: 'x' } } );
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( [] ) } ), /no intakeSurface/ );
	const bad = fixture( { entry: { site: 'x', intakeSurface: 'gone' } } );
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: bad.repo, db, propose: spy( [] ) } ), /"gone", which is not in/ );
	f.done();
	bad.done();
} );

test( 'MUST FAIL (a proposal is built only from an inventory that describes the export): one read before the draft changed is refused naming the changed file, and one recording no sources is refused too', () => {
	const f = fixture();
	const inv = path.join( f.repo, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' );
	fs.writeFileSync( path.join( f.repo, 'sites', CLIENT, 'handoff', 'Home.dc.html' ), '<p>draft, edited</p>' );
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( [] ) } ), /footer\.inventory\.json is stale: .*Home\.dc\.html changed/ );
	const { sources, ...bare } = JSON.parse( fs.readFileSync( inv, 'utf8' ) );
	assert.ok( sources );
	fs.writeFileSync( inv, JSON.stringify( bare ) );
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( [] ) } ), /records no sources/ );
	f.done();
	// Negative control: an inventory whose export is unchanged is proposed.
	const g = fixture();
	const seen = [];
	proposeSurface( { client: CLIENT, surface: 'footer', repo: g.repo, db, propose: spy( seen ) } );
	assert.equal( seen.length, 1 );
	g.done();
} );

test( 'propose passes the intake skeleton kind, name and looping templates under the intake slug', () => {
	const seen = [];
	const f = fixture();
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( seen ) } );
	const a = seen[ 0 ];
	assert.equal( a.surface, 'site-footer' );
	assert.equal( a.surfaceKind, 'footer' );
	assert.equal( a.surfaceName, 'Footer' );
	assert.equal( a.built, undefined );
	assert.deepEqual( [ ...a.motion ], [ 'Root/847' ], 'a looping template of the root host is keyed in the served space' );
	f.done();
} );

test( 'a served inventory applies decisions saved in intake space; an import chain key is not rewritten', () => {
	const sig = SIG;
	const own = { block: 'sgs/heading', signature: `${ sig.tag }|${ sig.words.replace( /\s+/g, ' ' ).trim() }` };
	const chain = `${ ROOT }>Child@5#0/3#0`;
	const seen = [];
	const f = fixture( { decisions: { surfaces: { 'site-footer': { [ `${ ROOT }${ KEY_PATH }` ]: own, [ chain ]: own } } } } );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( seen ) } );
	assert.deepEqual( Object.keys( seen[ 0 ].clientDecisions.surfaces[ 'site-footer' ] ), [ KEY, chain ] );
	const real = proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db } );
	assert.equal( real.proposal.rows.find( ( r ) => KEY === r.key ).source, 'client decision' );
	f.done();
} );

test( 'the review shows a decision saved under the intake slug in intake key space, for a served inventory', () => {
	const marker = 'sgs/review-marker-block';
	const f = fixture( { decisions: { surfaces: { 'site-footer': { [ `${ ROOT }${ KEY_PATH }` ]: { block: marker } } } } } );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( [] ) } );
	assert.ok( reviewSurface( { client: CLIENT, surface: 'footer', repo: f.repo } ).includes( marker ) );
	f.done();
} );

test( 'decide refuses without an intakeSurface, as propose does', async () => {
	const f = fixture( { entry: { site: 'x' } } );
	await assert.rejects( () => main( [ 'decide', '--client', CLIENT, '--surface', 'footer', '--key', KEY, '--block', 'sgs/heading' ], { repo: f.repo } ), /no intakeSurface/ );
	assert.equal( fs.readFileSync( path.join( f.repo, 'sites', CLIENT, 'build', 'skeleton', 'decisions.json' ), 'utf8' ), '{"surfaces":{}}' );
	f.done();
} );

test( 'the intake context carries the handoff record states of the intake skeleton id and the draft width thresholds', () => {
	const f = fixture();
	const build = path.join( f.repo, 'sites', CLIENT );
	fs.mkdirSync( path.join( build, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-99', states: [ { name: 'x' } ] }, { id: 'S-14', states: [ { name: 'desktop nav', how_to_reach: 'state.w ≥ 1024', sc_if_tpl_ids: [ '44' ] } ] } ] } ) );
	const file = path.join( build, 'build', 'intake', 'intake.json' );
	const intake = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	fs.writeFileSync( file, JSON.stringify( { ...intake, breakpoints: [ { thresholds: [ { value: 1024 }, { value: 768 } ] }, { thresholds: [ { value: 1024 } ] } ] } ) );
	const ctx = intakeContext( { client: CLIENT, surface: 'footer', repo: f.repo } );
	assert.deepEqual( ctx.states.map( ( x ) => x.name ), [ 'desktop nav' ] );
	assert.deepEqual( ctx.thresholds.sort( ( a, b ) => a - b ), [ 768, 1024 ] );
	f.done();
} );

test( 'MUST FAIL (C5 skeleton 12): propose passes the scroll tracks the draft script steps, keyed in the served space, with the loops the loop reader gets', () => {
	const timer = { id: 'J-1', mechanism: 'js-scroll', status: 'active', element: { dc: ROOT, template_tpl_id: '312' }, source: { function: 'step', code: 't.scrollTo({ left: 0 })' }, trigger: { type: 'interval', detail: 'setInterval every 6000ms via step' }, properties: [ { property: 'scroll-position' } ] };
	const seen = [];
	const f = fixture( { extra: [ timer ] } );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( seen ) } );
	assert.deepEqual( [ ...seen[ 0 ].loops.carousels ], [ 'Root/312' ] );
	assert.deepEqual( [ ...intakeContext( { client: CLIENT, surface: 'footer', repo: f.repo } ).carousels ], [ `${ ROOT }/312` ], 'intake keys it by the entry component' );
	f.done();
	const plain = [];
	const g = fixture();
	proposeSurface( { client: CLIENT, surface: 'footer', repo: g.repo, db, propose: spy( plain ) } );
	assert.equal( plain[ 0 ].loops.carousels.size, 0, 'negative control: a marquee track is no carousel' );
	g.done();
} );

test( 'key-space helpers rewrite only a root-host key', () => {
	assert.equal( servedKey( `${ ROOT }/12#3`, ROOT ), 'Root/12#3' );
	assert.equal( servedKey( 'Other/12#3', ROOT ), 'Other/12#3' );
	assert.equal( servedKey( `${ ROOT }>Child@5#0/3#0`, ROOT ), `${ ROOT }>Child@5#0/3#0` );
	assert.equal( servedKey( `${ ROOT }/12#3`, null ), `${ ROOT }/12#3` );
	assert.deepEqual( [ ...servedMotion( [ `${ ROOT }/9`, 'Other/9' ], ROOT ) ], [ 'Root/9', 'Other/9' ] );
	assert.equal( isServedInventory( footer ), true );
	assert.equal( isServedInventory( { elements: [ { key: `${ ROOT }/1#0` } ] } ), false );
} );

test( 'MUST FAIL: main passes its repo option to every call: propose reads and writes the given repo, never the default one', async () => {
	const f = fixture();
	const other = 'zz-repo-option-client';
	fs.renameSync( path.join( f.repo, 'sites', CLIENT ), path.join( f.repo, 'sites', other ) );
	const log = console.log;
	console.log = () => {};
	try {
		await main( [ 'propose', '--client', other, '--surface', 'footer' ], { repo: f.repo } );
	} finally {
		console.log = log;
	}
	assert.ok( fs.existsSync( path.join( f.repo, 'sites', other, 'build', 'skeleton', 'footer.proposal.json' ) ), 'the proposal was written under the given repo' );
	assert.ok( ! fs.existsSync( path.join( REPO, 'sites', other ) ), 'nothing was written under the default repo' );
	process.exitCode = 0;
	f.done();
} );

test( 'MUST FAIL: decide with --block validates the block against the given repo\'s facts', async () => {
	const f = fixture();
	const other = 'zz-repo-option-client';
	fs.renameSync( path.join( f.repo, 'sites', CLIENT ), path.join( f.repo, 'sites', other ) );
	const log = console.log;
	console.log = () => {};
	try {
		await main( [ 'decide', '--client', other, '--surface', 'footer', '--key', KEY, '--block', 'sgs/heading' ], { repo: f.repo } );
	} finally {
		console.log = log;
	}
	assert.ok( fs.existsSync( path.join( f.repo, 'sites', other, 'build', 'skeleton', 'decisions.json' ) ) );
	assert.ok( ! fs.existsSync( path.join( REPO, 'sites', other ) ) );
	f.done();
} );
