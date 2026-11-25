// The draft's own store calls as openers (Spec 48A surfaces contract, lib/intake-store-calls.mjs): a surfaces.json state's
// `how_to_reach` may name `MM.cart.setGift({ on: true })` or `MM.account.signIn()`; intake runs only that call, on the draft's own
// plain-object store global, before it opens the surface. The page half (lib/intake-state.mjs::logicState, op `reach`) is run in a
// real browser page that defines a store; a built-in (Math), a missing method and a throwing method reach nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { literalArgs, storeCalls, describeStoreCall, preconditionWays } from '../lib/intake-store-calls.mjs';
import { reachCalls } from '../lib/intake-reach-calls.mjs';
import { openers, describeWay } from '../lib/intake-skeletons.mjs';
import { reachDraftState, restoreDraftState } from '../lib/intake-state.mjs';

test( 'literalArgs reads a JSON-like literal and nothing else', () => {
	assert.deepEqual( literalArgs( '' ), [] );
	assert.deepEqual( literalArgs( '{ on: true }' ), [ { on: true } ] );
	assert.deepEqual( literalArgs( '\'x\', [1, 2], { "k": \'v\', n: null }' ), [ 'x', [ 1, 2 ], { k: 'v', n: null } ] );
	assert.equal( literalArgs( '...' ), null );
	assert.equal( literalArgs( 'items.length' ), null );
	assert.equal( literalArgs( '{ on: x }' ), null );
	assert.equal( literalArgs( 'alert(1)' ), null );
	assert.equal( literalArgs( '\'unterminated' ), null );
} );

test( 'MUST FAIL: storeCalls takes each <Ident>.<path>(<literal>) call in order, and not a logic call, a lookup or prose', () => {
	assert.deepEqual( storeCalls( 'Tick "This is a gift" (MM.cart.setGift({ on: true }))' ), [ { ident: 'MM', store: true, path: [ 'cart', 'setGift' ], args: [ { on: true } ] } ] );
	assert.deepEqual( storeCalls( 'MM.account.signIn() before loading' ).map( describeStoreCall ), [ 'MM.account.signIn()' ] );
	assert.deepEqual( storeCalls( 'MM.cart.clear(); dcLogic(\'SiteHeader\').setState({ basket: true })' ).map( describeStoreCall ), [ 'MM.cart.clear()' ] );
	assert.deepEqual( storeCalls( 'Add any item (MM.cart.add(...)); hidden' ), [], 'prose arguments are no call' );
	assert.deepEqual( storeCalls( 'L.setState({ a: 1 })' ), [], 'the logic\'s own setState is reachCalls\'' );
	assert.deepEqual( storeCalls( 'Math.max(1, x)' ), [], 'an argument that is not a literal is no call' );
	assert.deepEqual( storeCalls( 'MM.go({ a: 1' ), [], 'an unbalanced call is no call' );
	assert.deepEqual( reachCalls( 'MM.account.signIn()' ), [], 'reachCalls still takes setState calls only' );
} );

test( 'MUST FAIL: a state whose how_to_reach names a store call is a reach way, store calls before setState calls; no store call, no way', () => {
	const s = { component: 'Basket', states: [ { name: 'gift note open', state_keys: { 'gift.on': true }, how_to_reach: 'Tick (MM.cart.setGift({ on: true }))' } ] };
	const [ w ] = openers( s );
	assert.equal( w.via, 'reach' );
	assert.equal( describeWay( w ), 'reach "gift note open" MM.cart.setGift({"on":true})' );
	const mixed = openers( { component: 'X', states: [ { name: 'open', state_keys: { a: '<id>' }, how_to_reach: 'L.setState({ a: 1 }); MM.go(\'x\')' } ] } )[ 0 ];
	assert.deepEqual( mixed.calls.map( ( c ) => !! c.store ), [ true, false ] );
	assert.deepEqual( openers( { component: 'X', states: [ { name: 'open', state_keys: {}, how_to_reach: 'Tap the button' } ] } ), [] );
} );

test( 'MUST FAIL: preconditionWays names the store call of a state that gives an enclosing condition the value true; another key or value gives none', () => {
	const surfaces = [
		{ id: 'S-01', states: [ { name: 'signed out', state_keys: { signed: false }, how_to_reach: 'MM.account.signOut()' }, { name: 'signed in', state_keys: { signed: true }, how_to_reach: 'MM.account.signIn()' } ] },
		{ id: 'S-27', states: [ { name: 'signed in', state_keys: { signed: true }, how_to_reach: 'MM.account.signIn() before loading' } ] },
		{ id: 'S-04', states: [ { name: 'with items', state_keys: { hasItems: true }, how_to_reach: 'Add an item, then open' } ] },
	];
	const ways = preconditionWays( [ 'signed' ], surfaces );
	assert.equal( ways.length, 1, 'two states with the same call are one way' );
	assert.deepEqual( [ ways[ 0 ].via, ways[ 0 ].calls.map( describeStoreCall ) ], [ 'reach', [ 'MM.account.signIn()' ] ] );
	assert.deepEqual( preconditionWays( [ 'hasItems' ], surfaces ), [], 'a state with no store call is no precondition' );
	assert.deepEqual( preconditionWays( [ 'other' ], surfaces ), [] );
} );

const PAGE = `<script>
window.APP = { cart: { gift: { on: false }, setGift(p) { Object.assign(this.gift, p); localStorage.setItem('gift', JSON.stringify(this.gift)); }, boom() { throw new Error('no'); } } };
localStorage.setItem('keep', '1');
</script>`;

test( 'MUST FAIL: the page half runs the store call on the draft\'s plain-object global once, and restore puts the storage back', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await ( await browser.newContext() ).newPage();
		await page.route( '**/*', ( r ) => r.fulfill( { contentType: 'text/html', body: PAGE } ) );
		await page.goto( 'http://store.test/' );
		const call = ( over ) => ( { ident: 'APP', store: true, path: [ 'cart', 'setGift' ], args: [ { on: true } ], ...over } );
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ call() ] } ), 1 );
		assert.equal( await page.evaluate( () => window.APP.cart.gift.on ), true );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'gift' ) ), '{"on":true}' );
		await restoreDraftState( page );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'gift' ) ), null, 'storage written by the call is put back' );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'keep' ) ), '1' );
		// A later call keeps a snapshot of its own: what the page stored after the first restore survives the second.
		await page.evaluate( () => localStorage.setItem( 'later', '1' ) );
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ call() ] } ), 1 );
		await restoreDraftState( page );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'later' ) ), '1' );
		// Negative controls: a built-in, a missing method, a method that throws and a path through a non-object reach nothing.
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ { ident: 'Math', store: true, path: [ 'max' ], args: [ 1, 2 ] } ] } ), 0, 'Math is a built-in' );
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ call( { path: [ 'cart', 'nope' ] } ) ] } ), 0 );
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ call( { path: [ 'cart', 'boom' ], args: [] } ) ] } ), 0 );
		assert.equal( await reachDraftState( page, { component: 'None', calls: [ call( { ident: 'localStorage', path: [ 'clear' ], args: [] } ) ] } ), 0, 'a built-in object is never the store' );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'keep' ) ), '1', 'the refused calls changed nothing' );
	} finally {
		await browser.close();
	}
} );
