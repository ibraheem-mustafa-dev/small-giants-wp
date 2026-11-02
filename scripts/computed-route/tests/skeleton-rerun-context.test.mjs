// lib/skeleton-rerun.mjs::rerunSkeletons proposes each surface with the context skeleton.mjs::intakeContext passes
// (lib/skeleton-context.mjs::proposalContext): the handoff record's states, the draft's width thresholds, and the
// calibration keys and settings. A temp repo; the proposer is a spy. No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { rerunSkeletons } from '../lib/skeleton-rerun.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { intakeContext } from '../skeleton.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const footer = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const db = openDb();
const STATES = [ { name: 'open', how_to_reach: 'click', sc_if_tpl_ids: [ '5' ] } ];
const BREAKPOINTS = [ { thresholds: [ { value: 768 }, { value: '1024' } ] }, { thresholds: [ { value: 768 } ] } ];

function fixture() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'skel-rerun-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	fs.mkdirSync( path.join( repo, 'sites', CLIENT, 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: { site: 'x', intakeSurface: 'site-footer' } } ) );
	fs.writeFileSync( path.join( repo, 'sites', CLIENT, 'handoff', 'surfaces.json' ), JSON.stringify( { records: [ { id: 'S-14', states: STATES }, { id: 'S-99', states: [ { name: 'other' } ] } ] } ) );
	const skeletons = { 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: {} } };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons, breakpoints: BREAKPOINTS } ) );
	fs.writeFileSync( path.join( build, 'intake', 'inventories', 'site-footer.json' ), JSON.stringify( footer ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, skeletons, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}
const spy = ( seen ) => ( args ) => {
	seen.push( args );
	return { skeleton: [], proposal: { counts: {}, rows: [] }, problems: [] };
};

test( 'rerunSkeletons passes the surface states, thresholds, calKeys and calSettings, as intakeContext does', () => {
	const f = fixture();
	const seen = [];
	rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, propose: spy( seen ) } );
	const a = seen[ 0 ];
	const ctx = intakeContext( { client: CLIENT, surface: 'footer', repo: f.repo } );
	assert.deepEqual( a.states, STATES, 'the handoff record of the surface id, not of another' );
	assert.deepEqual( a.states, ctx.states );
	assert.deepEqual( a.thresholds, [ 768, 1024 ], 'distinct numeric thresholds of the saved intake breakpoints' );
	assert.deepEqual( a.thresholds, ctx.thresholds );
	assert.equal( typeof a.calKeys, 'function' );
	assert.equal( typeof a.calSettings, 'function' );
	assert.deepEqual( a.calKeys( 'no-such-block' ), [] );
	assert.deepEqual( a.calSettings( 'no-such-block' ), {} );
	f.done();
} );

test( 'a breakpoints argument wins over the saved intake.json', () => {
	const f = fixture();
	const seen = [];
	rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, breakpoints: [ { thresholds: [ { value: 600 } ] } ], propose: spy( seen ) } );
	assert.deepEqual( seen[ 0 ].thresholds, [ 600 ] );
	f.done();
} );
