// Spec 48 FR-48-6, FR-48-17 (register row E1): the skeleton proposals read the fact record, which the facts stage rewrites for the
// export, so they run after it, from the inventories the skeletons stage saved. The browser stage only reads and saves; a proposal
// that fails is recorded apart from a read failure, so the next run proposes it again from the inventory this run saved. A temp
// repo and a spy proposer; no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { rerunSkeletons, refreshIntakeSkeletons } from '../lib/skeleton-rerun.mjs';
import { StaleRecordError } from '../lib/freshness.mjs';
import { STAGES, STAGE_NEEDS } from '../lib/intake-run-stages.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CLIENT = 'eye-care-ward-end';
const footer = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' ) );
const db = openDb();

function fixture() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'skel-order-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	const skeletons = {
		'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: {} },
		'other-footer': { id: 'S-15', kind: 'footer', name: 'Other footer', inventory: {} },
	};
	Object.keys( skeletons ).forEach( ( slug ) => fs.writeFileSync( path.join( build, 'intake', 'inventories', `${ slug }.json` ), JSON.stringify( footer ) ) );
	return { repo, skeletons, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}
const ok = { skeleton: [], proposal: { counts: {}, rows: [] }, problems: [] };
// A proposer that fails the way a stale fact record fails every proposal, for the surfaces named.
const failing = ( names ) => ( args ) => {
	if ( names.includes( args.surface ) ) {
		throw new StaleRecordError( 'facts.json', [ 'Home.dc.html changed' ] );
	}
	return ok;
};

test( 'MUST FAIL: the proposals run after the facts stage, and nothing before it reads the fact record to propose', () => {
	const names = STAGES.map( ( [ n ] ) => n );
	assert.ok( names.indexOf( 'proposals' ) > names.indexOf( 'facts' ), `stages: ${ names.join( ', ' ) }` );
	assert.ok( STAGE_NEEDS.proposals.includes( 'facts' ) && STAGE_NEEDS.proposals.includes( 'skeletons' ), 'the proposals wait for the rewritten fact record and the saved inventories' );
	assert.ok( STAGE_NEEDS[ 'missing features' ].includes( 'proposals' ), 'the missing-features list reads the proposed rows' );
	const skeletons = String( STAGES.find( ( [ n ] ) => 'skeletons' === n )[ 1 ] );
	assert.match( skeletons, /propose:\s*null/, 'the browser stage reads and saves inventories only' );
	assert.doesNotMatch( skeletons, /frameworkFacts|\bfacts:\s*fw/, 'the browser stage loads no facts' );
} );

test( 'MUST FAIL: a proposal that throws keeps its surface (inventory summary, no rows, proposalGap) and the others are proposed', () => {
	const f = fixture();
	const run = rerunSkeletons( { client: CLIENT, db, repo: f.repo, codeRepo: REPO, skeletons: f.skeletons, breakpoints: [], pageMap: [], propose: failing( [ 'other-footer' ] ) } );
	assert.deepEqual( run.failed, [ { slug: 'other-footer', error: 'facts.json is stale: the export changed since it was written (Home.dc.html changed); run intake again' } ] );
	assert.deepEqual( run.missing, [], 'the inventory was read, so the surface is not missing' );
	const entry = run.surfaces[ 'other-footer' ].entry;
	assert.equal( entry.gap, undefined, 'a proposal failure is not a read failure' );
	assert.match( entry.proposalGap, /facts\.json is stale/ );
	assert.ok( entry.inventory.elements > 0 );
	assert.deepEqual( entry.rows, [] );
	assert.equal( run.surfaces[ 'site-footer' ].entry.proposalGap, undefined );
	f.done();
} );

test( 'MUST FAIL: a surface whose proposal failed is proposed again from the inventory the same run saved; a read failure is not', () => {
	const f = fixture();
	const first = refreshIntakeSkeletons( { intake: { skeletons: f.skeletons, breakpoints: [], pageMap: [] }, client: CLIENT, db, repo: f.repo, codeRepo: REPO } );
	assert.deepEqual( first.failed, [] );
	const run = rerunSkeletons( { client: CLIENT, db, repo: f.repo, codeRepo: REPO, skeletons: f.skeletons, breakpoints: [], pageMap: [], propose: failing( [ 'other-footer' ] ) } );
	const seen = [];
	const again = rerunSkeletons( { client: CLIENT, db, repo: f.repo, codeRepo: REPO, skeletons: Object.fromEntries( Object.entries( run.surfaces ).map( ( [ k, v ] ) => [ k, v.entry ] ) ), breakpoints: [], pageMap: [], propose: ( a ) => ( seen.push( a.surface ), ok ) } );
	assert.deepEqual( seen.sort(), [ 'other-footer', 'site-footer' ], 'the failed proposal is retried' );
	assert.deepEqual( again.failed, [] );
	assert.equal( again.surfaces[ 'other-footer' ].entry.proposalGap, undefined );
	// Negative control: a surface the run failed to READ (`gap`) is never refilled from an older inventory.
	const readGap = { ...run.surfaces[ 'other-footer' ].entry, proposalGap: undefined, gap: 'the harness run failed', inventory: null };
	const control = rerunSkeletons( { client: CLIENT, db, repo: f.repo, codeRepo: REPO, skeletons: { 'other-footer': readGap }, breakpoints: [], pageMap: [], propose: () => assert.fail( 'a read failure was proposed' ) } );
	assert.deepEqual( control.missing, [ 'other-footer' ] );
	f.done();
} );

test( 'MUST FAIL: the refresh reads the run\'s routing and its motion inventory\'s carousels, not the saved intake.json\'s', () => {
	const f = fixture();
	const timer = { id: 'J-07', mechanism: 'js-scroll', status: 'active', element: { dc: 'Home', template_tpl_id: '150' }, source: { function: 'step', code: 't.scrollTo({ left: 0 })' }, trigger: { type: 'interval', detail: 'setInterval every 6000ms via step' }, properties: [ { property: 'scroll-position' } ] };
	const seen = [];
	const intake = { skeletons: { 'site-footer': f.skeletons[ 'site-footer' ] }, breakpoints: [], pageMap: [ { id: 'p1', route: '#/shop' } ], routing: { adapter: 'state-page', routes: [], links: [] }, inventory: { animations: { records: [ timer ] } } };
	refreshIntakeSkeletons( { intake, client: CLIENT, db, repo: f.repo, codeRepo: REPO, propose: ( a ) => ( seen.push( a ), ok ) } );
	assert.deepEqual( [ ...seen[ 0 ].loops.carousels ], [ 'Home/150' ] );
	assert.equal( seen[ 0 ].draftLinks.adapter, 'state-page' );
	// Control: a record with no routing adapter reads none.
	refreshIntakeSkeletons( { intake: { ...intake, routing: { adapter: null, routes: [], links: [] }, inventory: { animations: { records: [] } } }, client: CLIENT, db, repo: f.repo, codeRepo: REPO, propose: ( a ) => ( seen.push( a ), ok ) } );
	assert.equal( seen[ 1 ].loops.carousels.size, 0 );
	assert.equal( seen[ 1 ].draftLinks.adapter, null );
	f.done();
} );

test( 'the proposals take the run\'s own routing, page map and carousels, and the carried ids, commerce and loops skeleton.mjs passes', () => {
	const f = fixture();
	const seen = [];
	const routing = { adapter: 'hash', routes: [], links: [] };
	const pageMap = [ { id: 'p1', route: '#/shop' } ];
	const carousels = new Set( [ 'Eye Care Birmingham/9' ] );
	rerunSkeletons( { client: CLIENT, db, repo: f.repo, codeRepo: REPO, skeletons: { 'site-footer': f.skeletons[ 'site-footer' ] }, breakpoints: [], pageMap, routing, carousels, propose: ( a ) => ( seen.push( a ), ok ) } );
	const a = seen[ 0 ];
	assert.deepEqual( a.pageMap, pageMap );
	assert.equal( a.draftLinks.adapter, 'hash', 'the draft-link context is built over the run\'s own routing' );
	assert.deepEqual( a.draftLinks.rows, pageMap );
	assert.equal( a.loops.carousels, carousels );
	assert.deepEqual( a.loops.rows, pageMap, 'before a confirmed page map exists the proposed rows are the loops\' rows' );
	assert.equal( typeof a.carried.logo, 'function' );
	assert.ok( 'commerce' in a, 'the commerce region is passed (null for a surface that is no commerce page)' );
	f.done();
} );
