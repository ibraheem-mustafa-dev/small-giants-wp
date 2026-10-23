// lib/intake-defects-force.mjs::bounded, ::forcedVisits and ::unless, and lib/intake-harness.mjs::drainTimeouts' clock
// step, on planted stubs (no browser): a browser call that never returns fails within its bound with `timedOut`, naming
// the call and the forcing step; a timed-out visit is a gap row naming its route and width and the next visit opens a
// fresh page; a catch that answers for a failed call still rethrows a timed-out one; the harness's clock step passes a
// timed-out call on as it is. tests/intake-hang-page.test.mjs runs the same bound on a real stuck page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bounded, forcedVisits, timedOut, unless } from '../lib/intake-defects-force.mjs';
import { drainTimeouts, draftErrors, preparePage, RAW_PAGE } from '../lib/intake-harness.mjs';

const never = () => new Promise( () => {} );
// What a call ended with: its value or error, or 'hung' when it has not ended within a second.
const ended = ( p ) => Promise.race( [ p.catch( ( x ) => x ), new Promise( ( done ) => setTimeout( () => done( { message: 'hung' } ), 1000 ).unref() ) ] );
const stuck = () => Object.assign( new Error( 'page.evaluate(frame) during settle did not return within 1s' ), { timedOut: true } );

test( 'bounded: a call that never returns rejects within the bound, naming the call and the step; others pass through', async () => {
	const raw = { evaluate: never, send: never, ok: async ( x ) => x * 2, sync: () => 7, clock: { runFor: never }, title: 'kept' };
	const page = bounded( raw, 50, 'page', () => 'setState Nav {"open":true}' );
	const t0 = Date.now();
	const e = await ended( page.evaluate( function frame() {} ) );
	assert.ok( Date.now() - t0 < 1000, 'rejected within the bound' );
	assert.equal( timedOut( e ), true );
	assert.equal( e.message, 'page.evaluate(frame) during setState Nav {"open":true} did not return within 0.05s' );
	assert.match( ( await ended( page.evaluate( () => 1 ) ) ).message, /^page\.evaluate\(\(\) => 1\) during / );
	assert.match( ( await ended( page.send( 'DOM.getDocument' ) ) ).message, /^page\.send\(DOM\.getDocument\) during / );
	assert.match( ( await ended( page.clock.runFor( 16 ) ) ).message, /^page\.clock\.runFor during / );
	assert.equal( await page.ok( 4 ), 8 );
	assert.equal( page.sync(), 7 );
	assert.equal( page.title, 'kept' );
	assert.equal( page[ RAW_PAGE ], raw );
	assert.equal( timedOut( new Error( 'other' ) ), false );
} );

test( 'bounded: with no step running the message names the call alone', async () => {
	const e = await ended( bounded( { evaluate: never }, 20, 'cdp' ).evaluate( 'x' ) );
	assert.equal( e.message, 'cdp.evaluate(x) did not return within 0.02s' );
} );

test( 'draftErrors: a wrapped page reads the errors of the page it wraps', async () => {
	const on = {};
	const raw = { context: () => ( {} ), on: ( k, fn ) => ( on[ k ] = fn ), clock: { pauseAt: async () => {} }, addInitScript: async () => {} };
	await preparePage( raw, {} );
	on.pageerror( new Error( 'draft threw' ) );
	assert.deepEqual( draftErrors( bounded( raw, 10, 'page' ) ).page, [ 'draft threw' ] );
} );

// A planted run: `fail` maps a visit label to the error its visit throws.
async function run( fail, slice = [ 'a', 'b', 'c' ] ) {
	const opened = [];
	const visited = [];
	let closed = 0;
	const lines = [];
	const u = await forcedVisits( {
		file: 'Home.dc.html', width: 375, slice: slice.map( ( label ) => ( { label, hash: label } ) ), log: ( l ) => lines.push( l ),
		open: async ( v ) => {
			opened.push( v.label );
			return { blocked: [ `blocked-${ v.label }` ], close: async () => closed++ };
		},
		visit: async ( s, v, i, fresh ) => {
			visited.push( `${ v.label }${ fresh ? '*' : '' }` );
			if ( fail[ v.label ] ) {
				throw fail[ v.label ]();
			}
		},
	} );
	return { u, opened, visited, closed, lines };
}

test( 'forcedVisits: a timed-out visit is a gap row naming its route and width, and the next visit opens a fresh page', async () => {
	const r = await run( { b: stuck } );
	assert.deepEqual( r.visited, [ 'a*', 'b', 'c*' ] );
	assert.deepEqual( r.opened, [ 'a', 'c' ] );
	assert.equal( r.closed, 2 );
	assert.equal( r.u.failed, true );
	assert.deepEqual( r.u.gaps, [ { construct: 'defect-visit', draftId: 'b@375', error: 'the forced visit timed out: page.evaluate(frame) during settle did not return within 1s' } ] );
	assert.deepEqual( r.u.blocked, [ 'blocked-a', 'blocked-c' ] );
	assert.deepEqual( r.lines, [ 'a at 375: started', 'b at 375: started', 'b at 375: timed out (page.evaluate(frame) during settle did not return within 1s)', 'c at 375: started' ] );
} );

test( 'forcedVisits: a run with no timeout keeps one page and no gap row', async () => {
	const r = await run( {} );
	assert.deepEqual( r.visited, [ 'a*', 'b', 'c' ] );
	assert.equal( r.closed, 1 );
	assert.equal( r.u.failed, false );
	assert.deepEqual( r.u.gaps, [] );
} );

test( 'forcedVisits: any other error ends the run as one gap row naming the page group', async () => {
	const r = await run( { b: () => new Error( 'boom\nstack' ) } );
	assert.deepEqual( r.visited, [ 'a*', 'b' ] );
	assert.equal( r.closed, 1 );
	assert.equal( r.u.failed, true );
	assert.deepEqual( r.u.gaps, [ { construct: 'defect-visit', draftId: 'Home.dc.html@375', error: 'boom stack' } ] );
} );

test( 'unless: a failed call gets its answer, a timed-out one is rethrown', () => {
	assert.equal( unless( null )( new Error( 'node gone' ) ), null );
	assert.throws( () => unless( null )( stuck() ), ( e ) => timedOut( e ) );
} );

test( 'drainTimeouts: a clock step that timed out is passed on as it is', async () => {
	const page = { evaluate: async () => 0, clock: { runFor: async () => {
		throw stuck();
	} } };
	const e = await drainTimeouts( page, {} ).catch( ( x ) => x );
	assert.equal( timedOut( e ), true );
	assert.equal( e.message, stuck().message );
} );
