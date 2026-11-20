// A saved template copy no surface builds is removed before a site run builds (lib/site-run-stale-templates.mjs): a stale
// `page-my-account` copy outranked the account page's own content, so the walk's root (`cr-ref-my-account-0`) was absent from the
// live page and the hero kept its default dark gradient. Each MUST FAIL test turns red under a mutation in
// tests/site-run-stale-templates.mutations.json (node scripts/computed-route/tools/mutate.mjs scripts/computed-route
// scripts/computed-route/tests/site-run-stale-templates.mutations.json tests/site-run-stale-templates.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { removeStaleTemplates, staleCopies } from '../lib/site-run-stale-templates.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: 1, ...o } );
// The page map after the account became an ordinary page: no row names `page-my-account`.
const ROWS = [ row( { slug: 'home', template: 'front-page' } ), row( { slug: 'shop', postType: 'shop', template: 'archive-product', collection: 'live' } ), row( { slug: 'my-account', template: 'page' } ) ];
const SURFACES = {
	'template-page': { target: { template: 'page' } },
	'template-404': { target: { template: '404' } },
	'my-account': { target: { postId: 9 } },
};
const HASH = 'a'.repeat( 64 );

test( 'MUST FAIL: a recorded copy no surface builds and no row sources is stale, and the account page\'s old page-my-account copy is the case', () => {
	const state = { hashes: { page: HASH, '404': HASH, 'page-my-account': HASH }, saved: { page: 148, '404': 152, 'page-my-account': 178 } };
	assert.deepEqual( staleCopies( { state, surfaces: SURFACES, rows: ROWS } ), [ { slug: 'page-my-account', id: 178 } ] );
} );

test( 'MUST FAIL: a copy the clone did not write (no recorded hash) is never stale (negative control)', () => {
	const state = { hashes: { page: HASH }, saved: { page: 148, 'page-my-account': 178, 'page-contact': 180 } };
	assert.deepEqual( staleCopies( { state, surfaces: SURFACES, rows: ROWS } ), [] );
} );

test( 'MUST FAIL: a copy a manifest surface builds, or a page-map row sources, is kept (negative controls)', () => {
	const state = { hashes: { page: HASH, '404': HASH, 'front-page': HASH, 'archive-product': HASH }, saved: { page: 148, '404': 152, 'front-page': 146, 'archive-product': 498 } };
	assert.deepEqual( staleCopies( { state, surfaces: SURFACES, rows: ROWS } ), [], 'page and 404 are surfaces; front-page and archive-product have rows' );
	// The same copy is stale once the surface that built it is gone from the manifest and no row names it.
	const checkout = { hashes: { checkout: HASH }, saved: { checkout: 164 } };
	assert.deepEqual( staleCopies( { state: checkout, surfaces: { ...SURFACES, 'template-checkout': { target: { template: 'checkout' } } }, rows: ROWS } ), [] );
	assert.deepEqual( staleCopies( { state: checkout, surfaces: SURFACES, rows: ROWS } ), [ { slug: 'checkout', id: 164 } ] );
} );

test( 'MUST FAIL: a recorded hash with no saved copy is nothing to remove', () => {
	assert.deepEqual( staleCopies( { state: { hashes: { 'page-my-account': HASH }, saved: {} }, surfaces: SURFACES, rows: ROWS } ), [] );
} );

// A site: the saved copies and recorded hashes it holds, and what the run did to it.
function site( saved, hashes ) {
	const log = { wp: [], php: [] };
	const runPhp = ( php ) => {
		log.php.push( php );
		return /get_block_templates/.test( php ) ? JSON.stringify( { hashes, saved } ) : 'ok';
	};
	const wp = ( args ) => {
		log.wp.push( args );
		return '';
	};
	return { log, runPhp, wp };
}

test( 'MUST FAIL: the run deletes the stale post for good, drops its recorded hash and content marker, and says so', () => {
	const s = site( { page: 148, 'page-my-account': 178 }, { page: HASH, 'page-my-account': 'b'.repeat( 64 ) } );
	const said = [];
	const removed = removeStaleTemplates( { runPhp: s.runPhp, wp: s.wp, rows: ROWS, surfaces: SURFACES, log: ( m ) => said.push( m ) } );
	assert.deepEqual( removed, [ 'page-my-account' ] );
	assert.deepEqual( s.log.wp[ 0 ], [ 'post', 'delete', '178', '--force' ] );
	assert.deepEqual( s.log.wp[ 1 ].slice( 0, 3 ), [ 'option', 'update', 'sgs_site_build_templates' ] );
	assert.deepEqual( JSON.parse( s.log.wp[ 1 ][ 3 ] ), { page: HASH }, 'only the removed slug leaves the record' );
	assert.ok( s.log.php.some( ( p ) => /sgs_site_build_template_content/.test( p ) && /page-my-account/.test( p ) ), 'its content marker goes with it' );
	assert.match( said.join( '\n' ), /removed the saved page-my-account copy \(wp_template 178\)/ );
} );

test( 'MUST FAIL: a site holding no stale copy is not written to (negative control)', () => {
	const s = site( { page: 148 }, { page: HASH } );
	assert.deepEqual( removeStaleTemplates( { runPhp: s.runPhp, wp: s.wp, rows: ROWS, surfaces: SURFACES, log: () => {} } ), [] );
	assert.deepEqual( s.log.wp, [] );
	assert.equal( s.log.php.length, 1, 'only the read ran' );
} );

test( 'MUST FAIL: a saved copy with no post id stops the run instead of deleting nothing', () => {
	const s = site( { 'page-my-account': 0 }, { 'page-my-account': HASH } );
	assert.throws( () => removeStaleTemplates( { runPhp: s.runPhp, wp: s.wp, rows: ROWS, surfaces: SURFACES, log: () => {} } ), /no post id/ );
	assert.deepEqual( s.log.wp, [] );
} );
