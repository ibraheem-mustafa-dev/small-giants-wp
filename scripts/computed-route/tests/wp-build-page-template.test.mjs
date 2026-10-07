// CR25: Solve's shop template build failed intermittently with "page.evaluate: Object". Reproduced 2026-10-07: the host
// refused a database connection under a burst ("Error establishing a database connection", a 500 wp_die), and apiFetch
// rejects with a plain object Playwright cannot print. wp-build-page.js::buildTemplate retries a transient server error
// and names the failing step. Driven here through a fake page whose evaluate runs the in-page function against a fake
// window, so no site is touched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { buildTemplate } = require( '../../wp-build-page.js' );

const DB_DOWN = { code: 'wp_die', message: '<h1>Error establishing a database connection</h1>', data: { status: 500 } };

// A fake WordPress: saving stores the content, reading returns it. `failures` maps a call number to the rejection it gets.
function fakePage( failures ) {
	let stored = '';
	let calls = 0;
	const wp = {
		blocks: {
			createBlock: ( name ) => ( { name } ),
			serialize: ( bs ) => ( Array.isArray( bs ) ? bs : [ bs ] ).map( ( b ) => `<!-- wp:${ b.name } /-->` ).join( '' ),
			parse: ( text ) => [ ...text.matchAll( /<!-- wp:(\S+) \/-->/g ) ].map( ( m ) => ( { name: m[ 1 ], isValid: true, innerBlocks: [] } ) ),
		},
		apiFetch: async ( { path, method, data } ) => {
			calls += 1;
			if ( failures[ calls ] ) {
				throw failures[ calls ];
			}
			if ( path.startsWith( '/wp/v2/themes' ) ) {
				return [ { stylesheet: 'sgs-theme' } ];
			}
			if ( 'POST' === method ) {
				stored = data.content;
				return {};
			}
			return { source: 'custom', content: { raw: stored } };
		},
	};
	return {
		evaluate: async ( fn, arg ) => {
			globalThis.window = { wp };
			try {
				return await fn( arg );
			} finally {
				delete globalThis.window;
			}
		},
		calls: () => calls,
	};
}

const tree = [ { name: 'sgs/container' } ];

test( 'MUST FAIL (CR25): a transient database-connection error during the save is retried and the build succeeds', async () => {
	// Call 1 is the active-theme lookup, call 2 the save.
	const page = fakePage( { 2: DB_DOWN } );
	const r = await buildTemplate( page, tree, 'templates', 'archive-product', false );
	assert.equal( r.ok, true, JSON.stringify( r ) );
	assert.deepEqual( r.retried, [ 'save: wp_die' ] );
} );

test( 'a persistent server error still fails, naming the step and the error instead of "Object"', async () => {
	// The save (call 2) and its three retries all fail.
	const page = fakePage( { 2: DB_DOWN, 3: DB_DOWN, 4: DB_DOWN, 5: DB_DOWN } );
	const r = await buildTemplate( page, tree, 'templates', 'archive-product', false );
	assert.equal( r.ok, false );
	assert.equal( r.code, 5, 'the first save keeps its own save-failed code' );
	assert.match( r.error, /Error establishing a database connection/ );
	assert.equal( page.calls(), 5, 'three retries, then it gives up' );
} );

test( 'a failure after the save names its step and carries the thrown fields', async () => {
	// Call 3 is the first read-back; it and its three retries fail.
	const page = fakePage( { 3: DB_DOWN, 4: DB_DOWN, 5: DB_DOWN, 6: DB_DOWN } );
	const r = await buildTemplate( page, tree, 'templates', 'archive-product', false );
	assert.equal( r.ok, false );
	assert.equal( r.code, 7 );
	assert.equal( r.step, 'read back' );
	assert.equal( r.thrown.status, 500 );
	assert.match( r.error, /^read back failed: wp_die: / );
} );

test( 'not over-retrying: a client error (a 4xx) fails at once, with no retry', async () => {
	const forbidden = { code: 'rest_forbidden', message: 'Sorry, you are not allowed to do that.', data: { status: 403 } };
	const page = fakePage( { 1: forbidden } );
	const r = await buildTemplate( page, tree, 'templates', 'archive-product', false );
	assert.equal( r.ok, false );
	assert.equal( r.step, 'active theme' );
	assert.equal( page.calls(), 1 );
	assert.match( r.error, /rest_forbidden/ );
} );
