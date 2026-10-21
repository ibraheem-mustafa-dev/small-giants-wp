// The skeleton writer's intake context (skeleton.mjs::proposeSurface, lib/key-space.mjs): the surface kind, name, built post and
// motion that intake passes, the link a manifest entry holds to its intake skeleton, and the two key spaces of a draft's
// elements. A temp repo; no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { servedKey, servedMotion, isServedInventory } from '../lib/key-space.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const footer = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const ROOT = 'Eye Care Site';
const db = openDb();

// A temp repo holding one surface: the manifest entry, intake.json, the inventory and the saved files.
function fixture( { entry = { site: 'x', intakeSurface: 'site-footer' }, decisions = { surfaces: {} }, built = null } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'skel-ctx-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: entry } ) );
	const animations = { records: [ { iterations: 'infinite', element: { dc: ROOT, template_tpl_id: '847' }, properties: [ { property: 'transform', from: 'translateX(0)', to: 'translateX(-50%)' } ] } ] };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: { checks: { rootName: ROOT } } } }, inventory: { animations } } ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'footer.inventory.json' ), JSON.stringify( footer ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( decisions ) );
	// The facts read the list block's block.json from the repo they are given.
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	built && fs.writeFileSync( path.join( build, 'skeleton', 'built-surfaces.json' ), JSON.stringify( { surfaces: built } ) );
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

test( 'propose passes the intake skeleton kind, name, built post and looping templates under the intake slug', () => {
	const seen = [];
	const f = fixture( { built: { 'S-14': { postId: 7 } } } );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( seen ) } );
	const a = seen[ 0 ];
	assert.equal( a.surface, 'site-footer' );
	assert.equal( a.surfaceKind, 'footer' );
	assert.equal( a.surfaceName, 'Footer' );
	assert.deepEqual( a.built, { postId: 7 } );
	assert.deepEqual( [ ...a.motion ], [ 'Root/847' ], 'a looping template of the root host is keyed in the served space' );
	f.done();
} );

test( 'a served inventory applies decisions saved in intake space; an import chain key is not rewritten', () => {
	const sig = footer.elements.find( ( e ) => 'Root/848#0' === e.key );
	const own = { block: 'sgs/heading', signature: `${ sig.tag }|${ sig.words.replace( /\s+/g, ' ' ).trim() }` };
	const chain = `${ ROOT }>Child@5#0/3#0`;
	const seen = [];
	const f = fixture( { decisions: { surfaces: { 'site-footer': { [ `${ ROOT }/848#0` ]: own, [ chain ]: own } } } } );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, propose: spy( seen ) } );
	assert.deepEqual( Object.keys( seen[ 0 ].clientDecisions.surfaces[ 'site-footer' ] ), [ 'Root/848#0', chain ] );
	const real = proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db } );
	assert.equal( real.proposal.rows.find( ( r ) => 'Root/848#0' === r.key ).source, 'client decision' );
	f.done();
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
