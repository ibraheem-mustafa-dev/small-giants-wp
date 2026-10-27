// The site build switches WooCommerce's coming-soon mode off for a shop client (Spec 48 FR-48-55 part 6): a site reading
// `woocommerce_coming_soon` = `yes` serves every visitor a holding page, so the plan sets it to `no`; `no` (or unset) plans
// nothing; a client with no shop rows never touches it; `woocommerce_store_pages_only` is never written. The narrow step
// (`--store-visible`) plans, applies and reads back that one option. Each MUST FAIL test turns red under a mutation in
// tests/site-build-store-visible.mutations.json (node scripts/computed-route/tools/mutate.mjs scripts/computed-route
// scripts/computed-route/tests/site-build-store-visible.mutations.json tests/site-build-store-visible.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { statePhp } from '../lib/site-build-state.mjs';
import { COMING_SOON_OPTION, planStoreVisible, runStoreVisible, storeVisiblePhp } from '../lib/site-build-store-visible.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const SHOP = () => [
	row( { slug: 'home', title: 'Home', route: 'home' } ),
	row( { slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', collection: 'live' } ),
];
const PLAIN = () => [ row( { slug: 'home', title: 'Home', route: 'home' } ), row( { slug: 'about', title: 'About' } ) ];
const state = ( options = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary' ], templates: { page: [] },
	options: { show_on_front: 'page', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/', woocommerce_shop_page_id: '0', woocommerce_cart_page_id: '0', woocommerce_checkout_page_id: '0', woocommerce_myaccount_page_id: '0', ...options },
	pointers: { header: 0, footer: 0, drawer: 0 }, templateHashes: {}, customTemplates: [],
} );
const plan = ( rows, st ) => planBuild( { rows, state: st, repo: os.tmpdir(), client: 'none' } );
const comingSoon = ( p ) => p.actions.filter( ( a ) => a.name === COMING_SOON_OPTION );

test( 'MUST FAIL: a shop client on a site reading yes plans woocommerce_coming_soon -> no, in the option table', () => {
	const p = plan( SHOP(), state( { woocommerce_coming_soon: 'yes', woocommerce_store_pages_only: 'yes' } ) );
	assert.deepEqual( p.problems, [] );
	assert.deepEqual( comingSoon( p ).map( ( a ) => [ a.phase, a.type, a.value ] ), [ [ 'site', 'option', 'no' ] ] );
	assert.deepEqual( p.options.filter( ( o ) => o.name === COMING_SOON_OPTION ).map( ( o ) => [ o.before, o.after ] ), [ [ 'yes', 'no' ] ] );
	assert.ok( ! p.actions.some( ( a ) => 'woocommerce_store_pages_only' === a.name ), 'store pages only is left alone' );
} );

test( 'MUST FAIL: a shop client on a site reading no, or with the option unset, plans nothing for it (negative control)', () => {
	assert.deepEqual( comingSoon( plan( SHOP(), state( { woocommerce_coming_soon: 'no' } ) ) ), [] );
	assert.deepEqual( comingSoon( plan( SHOP(), state() ) ), [] );
} );

test( 'MUST FAIL: a client with no shop rows never touches it, even on a site reading yes', () => {
	assert.deepEqual( comingSoon( plan( PLAIN(), state( { woocommerce_coming_soon: 'yes' } ) ) ), [] );
	assert.deepEqual( planStoreVisible( PLAIN(), { comingSoon: 'yes' } ).actions, [] );
} );

test( 'MUST FAIL: the state read and the narrow read both read the option', () => {
	assert.match( statePhp( SHOP() ), /'woocommerce_coming_soon'/ );
	assert.match( storeVisiblePhp(), /get_option\( 'woocommerce_coming_soon'/ );
	assert.doesNotMatch( storeVisiblePhp(), /update_option/ );
} );

test( 'MUST FAIL: the whole build applies it as one wp option update', () => {
	const calls = [];
	const p = plan( SHOP(), state( { woocommerce_coming_soon: 'yes' } ) );
	applyPhase( comingSoon( p ), 'site', { wp: ( a ) => calls.push( a ), build: () => {}, onId: () => {}, log: () => {}, refs: {} } );
	assert.deepEqual( calls, [ [ 'option', 'update', COMING_SOON_OPTION, 'no' ] ] );
} );

// A fake site for the narrow step: answers the read with the current value and records each write.
const fakeSite = ( value, { sticks = true } = {} ) => {
	const site = { value, writes: [] };
	site.runPhp = ( php ) => {
		if ( /update_option/.test( php ) ) {
			site.writes.push( php );
			sticks && ( site.value = 'no' );
			return 'ok';
		}
		return `notice\n${ JSON.stringify( { comingSoon: site.value, storePagesOnly: 'no' } ) }`;
	};
	return site;
};
const quiet = () => {};

test( 'MUST FAIL: --store-visible without --apply plans the change and writes nothing', () => {
	const site = fakeSite( 'yes' );
	const lines = [];
	assert.equal( runStoreVisible( { rows: SHOP(), runPhp: site.runPhp, apply: false, log: ( l ) => lines.push( l ) } ), 0 );
	assert.equal( site.writes.length, 0 );
	assert.match( lines.join( '\n' ), /woocommerce_coming_soon \| yes \| no/ );
} );

test( 'MUST FAIL: --store-visible --apply writes only that option to no and reads it back', () => {
	const site = fakeSite( 'yes' );
	assert.equal( runStoreVisible( { rows: SHOP(), runPhp: site.runPhp, apply: true, log: quiet } ), 0 );
	assert.equal( site.writes.length, 1 );
	assert.match( site.writes[ 0 ], /update_option\( 'woocommerce_coming_soon', 'no' \)/ );
	assert.doesNotMatch( site.writes[ 0 ], /store_pages_only/ );
	assert.equal( site.value, 'no' );
} );

test( 'MUST FAIL: --store-visible --apply fails when the read-back still says yes', () => {
	const site = fakeSite( 'yes', { sticks: false } );
	assert.equal( runStoreVisible( { rows: SHOP(), runPhp: site.runPhp, apply: true, log: quiet } ), 1 );
} );

test( 'MUST FAIL: --store-visible on a site already visible, or for a non-shop client, writes nothing', () => {
	const visible = fakeSite( 'no' );
	assert.equal( runStoreVisible( { rows: SHOP(), runPhp: visible.runPhp, apply: true, log: quiet } ), 0 );
	assert.equal( visible.writes.length, 0 );
	const plain = fakeSite( 'yes' );
	assert.equal( runStoreVisible( { rows: PLAIN(), runPhp: plain.runPhp, apply: true, log: quiet } ), 0 );
	assert.equal( plain.writes.length, 0 );
} );
