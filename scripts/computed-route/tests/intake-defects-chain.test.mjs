// Spec 48 FR-48-34 (R-48-3), lib/intake-defects-chain.mjs::chainPass on a fake forced-page session (no browser):
//   - the budget counts only attempts that fired, so a handler's unrendered copies cannot use it up;
//   - stopping at the budget with candidates pending is reported (`exhausted`), never silent;
//   - the named snapshot slots are deleted when the pass ends;
//   - a route change is undone until the same components render again (the visit's URL re-opened when putting the URL
//     back is not enough), and a route that cannot be brought back is reported (`lost`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chainPass, CHAIN_SLOTS } from '../lib/intake-defects-chain.mjs';

// A fake session: one Home component whose state { open, page } decides what renders, a router that follows the URL
// only when told (popstate) unless `deaf`, and template handlers `{ component, draftId, copies, fire(i) }`.
function fakeSession( { deaf = false } = {} ) {
	const win = {
		location: { href: 'http://draft.test/#/' },
		history: { state: null, replaceState: ( st, t, u ) => ( win.location.href = u ) },
		listeners: [],
		dispatchEvent: ( e ) => win.listeners.forEach( ( f ) => f( e ) ),
		PopStateEvent: class {
			constructor( type ) {
				this.type = type;
			}
		},
		HashChangeEvent: class {
			constructor( type ) {
				this.type = type;
			}
		},
	};
	const app = { state: { open: false }, route: 'home', reached: false, last: new Set(), calls: 0 };
	if ( ! deaf ) {
		win.listeners.push( ( e ) => 'popstate' === e.type && ( app.route = win.location.href.endsWith( '#/about' ) ? 'about' : 'home' ) );
	}
	const keys = () => new Set( 'about' === app.route ? [ 'About:1' ] : [ 'Home:1', ...( app.state.open ? [ 'Home:2' ] : [] ) ] );
	const s = {
		page: { evaluate: async ( fn, arg ) => {
			const was = globalThis.window;
			globalThis.window = win;
			try {
				return fn( arg );
			} finally {
				globalThis.window = was;
			}
		} },
		snapshot: async ( slot ) => {
			( win.__sgsStateSnaps ||= {} )[ slot ] = { ...app.state };
		},
		restore: async ( slot ) => {
			app.state = { ...win.__sgsStateSnaps[ slot ] };
		},
		changed: async ( slot ) => JSON.stringify( app.state ) !== JSON.stringify( win.__sgsStateSnaps[ slot ] ),
		nudge: async () => {},
		drain: async () => {},
		copies: async ( h ) => h.copies,
		setState: async () => 0,
		dispatchAt: async ( h, i ) => {
			app.calls++;
			return h.fire( i );
		},
	};
	const opts = {
		patches: [],
		pending: () => ( app.reached ? [] : [ 'row' ] ),
		check: async () => {
			app.last = keys();
			app.reached ||= 'home' === app.route && app.state.open;
		},
		rendered: () => app.last,
		pseudoPass: async () => {},
	};
	return { s, win, app, opts };
}

// A handler that changes nothing; with `copies` above 1, only its first copy fires (a pointer handler whose other
// copies fire no listener).
const inert = ( n, copies = 1 ) => ( { component: 'Home', draftId: `Home:${ n }`, copies, fire: async ( i ) => 0 === i } );

test( 'MUST FAIL (budget): only fired attempts count, so unrendered copies do not stop the opener being tried', async () => {
	const { s, app, opts } = fakeSession();
	const opener = { component: 'Home', draftId: 'Home:9', copies: 4, fire: async ( i ) => 0 === i && ( app.state = { ...app.state, open: true }, true ) };
	await opts.check();
	const out = await chainPass( s, { ...opts, triggers: [ inert( 7, 4 ), opener ], budget: 2 } );
	assert.equal( app.reached, true, 'the second handler opened the row' );
	assert.equal( out.attempts, 2 );
	assert.equal( out.exhausted, false );
} );

test( 'MUST FAIL (budget): stopping at the budget with a candidate pending is reported as exhausted', async () => {
	const { s, opts } = fakeSession();
	await opts.check();
	const out = await chainPass( s, { ...opts, triggers: [ inert( 7 ), inert( 8 ) ], budget: 1 } );
	assert.equal( out.exhausted, true );
	const all = await chainPass( fakeSession().s, { ...fakeSession().opts, triggers: [ inert( 7 ) ], budget: 1 } );
	assert.equal( all.exhausted, false, 'every opener tried within the budget is no exhaustion' );
} );

test( 'MUST FAIL (slots): the chain snapshot slots are deleted when the pass ends', async () => {
	const { s, win, opts } = fakeSession();
	await opts.check();
	await chainPass( s, { ...opts, triggers: [ inert( 7 ) ] } );
	assert.deepEqual( CHAIN_SLOTS.filter( ( k ) => k in ( win.__sgsStateSnaps || {} ) ), [] );
} );

test( 'MUST FAIL (route): a route change is undone until the visit route renders again; one that cannot be is lost', async () => {
	const link = ( app, win ) => ( { component: 'Home', draftId: 'Home:5', copies: 1, fire: async () => {
		win.location.href = 'http://draft.test/#/about';
		app.route = 'about';
		app.state = { ...app.state, page: 'about' };
		return true;
	} } );
	const ok = fakeSession();
	await ok.opts.check();
	const out = await chainPass( ok.s, { ...ok.opts, triggers: [ link( ok.app, ok.win ) ] } );
	assert.equal( ok.win.location.href, 'http://draft.test/#/' );
	assert.equal( ok.app.route, 'home', 'the router was told the URL came back' );
	assert.equal( out.lost, false );
	const deaf = fakeSession( { deaf: true } );
	await deaf.opts.check();
	const lost = await chainPass( deaf.s, { ...deaf.opts, triggers: [ link( deaf.app, deaf.win ), inert( 7 ) ] } );
	assert.equal( lost.lost, true, 'a route that never comes back is reported' );
	assert.equal( deaf.app.calls, 1, 'nothing more is tried on the wrong route' );
} );

// Indus drawer (2026-10-19): the first row of the mobile drawer is a plain link whose click starts a close animation and a
// 420ms timer; putting the state back re-opens the drawer, the timer then closes it again, and the rows after it never
// render, so the accordion row that runs the page's code was never tried and its code read as a draft defect.
test( 'MUST FAIL (FR-48-34): a timer an attempt started runs before the state is put back, so it cannot undo the next attempt', async () => {
	const { s, win, app, opts } = fakeSession();
	const timers = [];
	let now = 0;
	const run = ( to ) => {
		for ( const t of timers.filter( ( x ) => x.at <= to ).sort( ( a, b ) => a.at - b.at ) ) {
			timers.splice( timers.indexOf( t ), 1 );
			t.fn();
		}
		now = to;
	};
	s.nudge = async () => run( now + 400 );
	s.drain = async () => run( Math.max( now, ...timers.map( ( t ) => t.at ) ) );
	const opener = { component: 'Home', draftId: 'Home:9', copies: 1, fire: async () => ( app.state = { ...app.state, open: true }, true ) };
	// Row 0 is a plain link: it leaves the page (the URL moves) and closes the drawer 300ms later. Row 1 is the accordion row: it
	// can only be fired while the drawer is open.
	const rows = { component: 'Home', draftId: 'Home:2', copies: 2, fire: async ( i ) => {
		if ( 0 === i ) {
			win.location.href = 'http://draft.test/#/about';
			timers.push( { at: now + 300, fn: () => ( app.state = { ...app.state, open: false } ) } );
			return true;
		}
		if ( app.state.open ) {
			app.reached = true;
			app.state = { ...app.state, acc: 1 };
			return true;
		}
		return false;
	} };
	// Reached means the accordion row ran; opening the drawer alone does not count.
	const check = async () => {
		app.last = new Set( [ 'Home:1', ...( app.state.open && 'home' === app.route ? [ 'Home:2' ] : [] ) ] );
	};
	await check();
	await chainPass( s, { ...opts, check, triggers: [ opener, rows ] } );
	assert.equal( app.reached, true, 'the accordion row was fired with the drawer open' );
} );

test( 'MUST FAIL (FR-48-34): a timer drained after an attempt that changed nothing has its state put back before the next attempt', async () => {
	const { s, app, opts } = fakeSession();
	const timers = [];
	let now = 0;
	const run = ( to ) => {
		for ( const t of timers.filter( ( x ) => x.at <= to ).sort( ( a, b ) => a.at - b.at ) ) {
			timers.splice( timers.indexOf( t ), 1 );
			t.fn();
		}
		now = to;
	};
	s.nudge = async () => run( now + 400 );
	s.drain = async () => run( Math.max( now, ...timers.map( ( t ) => t.at ) ) );
	const opener = { component: 'Home', draftId: 'Home:9', copies: 1, fire: async () => ( app.state = { ...app.state, open: true }, true ) };
	// Row 0 changes no state when fired but closes the drawer 300ms later (a close button's delayed setState). Row 1 is the
	// accordion row: it can only be fired while the drawer is open.
	const rows = { component: 'Home', draftId: 'Home:2', copies: 2, fire: async ( i ) => {
		if ( 0 === i ) {
			timers.push( { at: now + 300, fn: () => ( app.state = { ...app.state, open: false } ) } );
			return true;
		}
		if ( app.state.open ) {
			app.reached = true;
			app.state = { ...app.state, acc: 1 };
			return true;
		}
		return false;
	} };
	const check = async () => {
		app.last = new Set( [ 'Home:1', ...( app.state.open ? [ 'Home:2' ] : [] ) ] );
	};
	await check();
	await chainPass( s, { ...opts, check, triggers: [ opener, rows ] } );
	assert.equal( app.reached, true, 'the accordion row was fired with the drawer open' );
} );
