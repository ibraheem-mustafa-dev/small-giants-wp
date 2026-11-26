// The page half of the draft's store calls and setState ways (lib/intake-state.mjs::logicState, op `reach` and `restore`), on a
// page that holds a store and a mounted component the way the harness page does: a `.sc-host` whose React fiber leads to the
// runtime wrapper with `logic` and `__name`. Each case is a MUST FAIL: a setState call on `this`, an unrunnable store call
// before a setState call, a slot-scoped restore, the store's in-memory data after a restore, and a precondition applied at every width.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { storeCalls, describeStoreCall, literalArgs } from '../lib/intake-store-calls.mjs';
import { reachCalls, structuredReach } from '../lib/intake-reach-calls.mjs';
import { reachDraftState, restoreDraftState, snapshotDraftState } from '../lib/intake-state.mjs';

const HOSTED = `<script>
window.APP = { cart: { items: [], add(x) { this.items.push(x); }, gift: { on: false }, setGift(p) { Object.assign(this.gift, p); localStorage.setItem('gift', JSON.stringify(this.gift)); } } };
window.__gift = window.APP.cart.gift;
window.SHOP = { _n: 0, get count() { return this.list.length; }, list: [], tags: new Set( [ 'a' ] ), byId: new Map( [ [ 'x', { n: 1 } ] ] ), put(x) { this._n++; this.list.push(x); this.tags.add(x); this.byId.set(x, { n: 2 }); this.byId.get('x').n++; this.late = 1; } };
document.addEventListener('DOMContentLoaded', () => {
	const host = document.createElement('div');
	host.className = 'sc-host';
	host.dataset.scName = 'Fake';
	const logic = { state: { a: 1 }, setState(p) { Object.assign(this.state, p); } };
	host['__reactFiber$x'] = { stateNode: { logic, __name: 'Fake' }, return: null };
	document.body.append(host);
	window.__logic = logic;
});
</script>`;

async function hostedPage( browser ) {
	const page = await ( await browser.newContext() ).newPage();
	await page.route( '**/*', ( r ) => r.fulfill( { contentType: 'text/html', body: HOSTED } ) );
	await page.goto( 'http://store.test/' );
	return page;
}

const gift = { ident: 'APP', store: true, path: [ 'cart', 'setGift' ], args: [ { on: true } ] };
const add = { ident: 'APP', store: true, path: [ 'cart', 'add' ], args: [ 'cup' ] };

test( 'MUST FAIL: literalArgs reads strings before keys: a bare key inside a string value is left alone and an escape is decoded once', () => {
	assert.deepEqual( literalArgs( '{ note: "x, key: 1", d: 1 }' ), [ { note: 'x, key: 1', d: 1 } ] );
	assert.deepEqual( literalArgs( '"line\\nbreak"' ), [ 'line\nbreak' ] );
	assert.deepEqual( literalArgs( '\'it\\\'s\'' ), [ 'it\'s' ] );
	assert.deepEqual( literalArgs( '\'a"b\'' ), [ 'a"b' ] );
	assert.deepEqual( literalArgs( '{ \'x\': 1, y: \'a\\\'b: c\' }' ), [ { x: 1, y: 'a\'b: c' } ] );
	assert.equal( literalArgs( '{ a: x }' ), null, 'a bare word as a value is no literal' );
	assert.equal( literalArgs( '"bad \\q"' ), null, 'an escape JSON does not know is no literal' );
} );

test( 'MUST FAIL: a setState call on `this` (a structured way, or prose `this.setState(...)`) reaches the component', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const a = () => page.evaluate( () => window.__logic.state.a );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ { ident: 'this', args: '{ a: 2 }' } ] } ), 1, 'the logic is bound as `this`' );
		assert.equal( await a(), 2 );
		const structured = structuredReach( { how_to_reach_structured: { setState: { a: 3 } } } );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: structured.set } ), 1 );
		assert.equal( await a(), 3, 'a structured setState way runs' );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: reachCalls( 'tap, then this.setState({ a: 4 })' ) } ), 1 );
		assert.equal( await a(), 4, 'prose this.setState runs' );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ { ident: 'L', args: '{ a: 5 }' } ] } ), 1, 'a named identifier still runs' );
		assert.equal( await a(), 5 );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ { ident: 'this', args: 'nope.x' } ] } ), 0, 'a call that throws reaches nothing' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a store call whose root the draft does not define is skipped, so the setState way behind it still runs; a call on `this` is no store call', async () => {
	assert.deepEqual( storeCalls( 'this.cart.add(1) then MM.cart.clear()' ).map( describeStoreCall ), [ 'MM.cart.clear()' ] );
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const stray = [ { ident: 'e', store: true, path: [ 'preventDefault' ], args: [] }, { ident: 'Date', store: true, path: [ 'now' ], args: [] } ];
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ ...stray, { ident: 'this', args: '{ a: 6 }' } ] } ), 1 );
		assert.equal( await page.evaluate( () => window.__logic.state.a ), 6, 'the setState behind unrunnable store calls ran' );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ ...stray, gift ] } ), 1, 'a runnable store call after an unrunnable one runs' );
		assert.equal( await page.evaluate( () => window.APP.cart.gift.on ), true );
		// Negative control: store calls that all fail to run, with no logic call beside them, reach nothing.
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: stray } ), 0 );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: restore is per slot and puts the store\'s in-memory data back, not only the storage', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		await snapshotDraftState( page );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ gift, add ] } ), 1 );
		// Another step's slot-scoped restore (Fill's reveal and forcing steps) leaves the opener's store call in place.
		await snapshotDraftState( page, 'step' );
		await restoreDraftState( page, 'step' );
		assert.equal( await page.evaluate( () => window.APP.cart.gift.on ), true, 'a restore of another slot rolls nothing back' );
		assert.equal( await page.evaluate( () => localStorage.getItem( 'gift' ) ), '{"on":true}' );
		assert.equal( await page.evaluate( () => window.APP.cart.items.length ), 1 );
		// The default restore puts back the storage and the store's own data, in the objects the page's closures hold.
		await restoreDraftState( page );
		assert.deepEqual( await page.evaluate( () => [ window.APP.cart.gift.on, window.APP.cart.items.length, window.__gift === window.APP.cart.gift, window.__gift.on, localStorage.getItem( 'gift' ) ] ), [ false, 0, true, false, null ] );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a precondition named `once` runs once however often it is applied, and again after the restore', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const items = () => page.evaluate( () => window.APP.cart.items.length );
		for ( let i = 0; i < 3; i++ ) {
			assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ add ], once: 'add cup' } ), 1 );
		}
		assert.equal( await items(), 1, 'three widths, one item' );
		await restoreDraftState( page );
		assert.equal( await items(), 0 );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ add ], once: 'add cup' } ), 1 );
		assert.equal( await items(), 1, 'a new open runs it again' );
		// Negative control: with no `once`, each application runs the call.
		await reachDraftState( page, { component: 'Fake', calls: [ add ] } );
		assert.equal( await items(), 2 );
	} finally {
		await browser.close();
	}
} );

const put = { ident: 'SHOP', store: true, path: [ 'put' ], args: [ 'cup' ] };

test( 'MUST FAIL: a restore keeps a store\'s getters (it deletes only keys the store did not have), puts back Map and Set contents, and still removes a key the call added', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const shop = () => page.evaluate( () => ( { keys: Object.keys( window.SHOP ).sort(), count: window.SHOP.count, tags: [ ...window.SHOP.tags ], byId: [ ...window.SHOP.byId ], late: window.SHOP.late } ) );
		const before = await shop();
		assert.equal( before.count, 0 );
		await snapshotDraftState( page );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ put ] } ), 1 );
		const during = await shop();
		assert.deepEqual( [ during.count, during.tags, during.byId.map( ( e ) => e[ 0 ] ), during.late ], [ 1, [ 'a', 'cup' ], [ 'x', 'cup' ], 1 ], 'the call changed the store' );
		await restoreDraftState( page );
		assert.deepEqual( await shop(), before, 'the getter, the Set, the Map and its nested object are as they were, and the added key is gone' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a store call whose root is defined but whose method is missing reaches nothing, even with a setState way beside it', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const login = { ident: 'APP', store: true, path: [ 'account', 'login' ], args: [] };
		const renamed = { ident: 'APP', store: true, path: [ 'cart', 'addd' ], args: [ 'cup' ] };
		for ( const missing of [ login, renamed ] ) {
			assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ missing, { ident: 'this', args: '{ a: 9 }' } ] } ), 0, `${ missing.path.join( '.' ) } is not a function` );
			assert.equal( await page.evaluate( () => window.__logic.state.a ), 1, 'the setState way behind it did not run' );
		}
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ gift, { ident: 'this', args: '{ a: 9 }' } ] } ), 1, 'negative control: a defined method runs' );
		assert.equal( await page.evaluate( () => window.__logic.state.a ), 9 );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: a `once` key already done skips only the store calls: the component calls still run at the next width', async () => {
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await hostedPage( browser );
		const items = () => page.evaluate( () => window.APP.cart.items.length );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ add, { ident: 'this', args: '{ a: 7 }' } ], once: 'k' } ), 1 );
		assert.equal( await reachDraftState( page, { component: 'Fake', calls: [ add, { ident: 'this', args: '{ a: 8 }' } ], once: 'k' } ), 1 );
		assert.equal( await page.evaluate( () => window.__logic.state.a ), 8, 'the second width\'s component call ran' );
		assert.equal( await items(), 1, 'the store call ran once' );
	} finally {
		await browser.close();
	}
} );
