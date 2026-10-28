// Fill's state opener (lib/fill-open.mjs): the three causes that made intake's opener fail on a real export are each a
// refusal, and a component a route mounts is read on its route. Records are the shapes handoff `surfaces.json` holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openState, stateOpener, usableKeys, withRoute, routeHash, refusalRows, STATE_REFUSED, ROOT_HOST, openerSource } from '../lib/fill-open.mjs';
import { isDescription } from '../lib/state-openers.mjs';

const FACTS = { state: {
	Site: { keys: [ 'page', 'w', 'active', 'mobileOpen', 'acc', 'faqOpen' ], widthKeys: [ 'w' ] },
	Wizard: { keys: [ 'ckOpen', 'errs', 'done', 'w' ], widthKeys: [ 'w' ] },
} };
const skeleton = ( over = {} ) => ( { id: 'S-01', root: { viaState: true }, ...over } );
const record = ( dc, states, route = '*' ) => ( { id: 'S-01', dc, route, states } );
const open = ( keys, ids = [ '63' ] ) => ( { name: 'open', state_keys: keys, sc_if_tpl_ids: ids } );
const entry = { states: { open: null } };

test( 'a state key the live component holds opens the surface, on the runtime\'s Root host for the entry draft', () => {
	const o = stateOpener( { entry, skeleton: skeleton(), record: record( 'Site', [ open( { active: 1 } ) ] ), facts: FACTS, rootComponent: 'Site' } );
	assert.equal( o.state, 'open' );
	assert.deepEqual( o.keys, { active: 1 } );
	assert.equal( o.component, ROOT_HOST );
	assert.equal( o.dc, 'Site' );
	assert.deepEqual( o.expect, [ '63' ] );
	assert.deepEqual( o.refused, [] );
} );

test( 'MUST FAIL (cause 2): a render value, a width-derived key and an underscore key are not offered, and a state left with none is refused', () => {
	const drop = usableKeys( { 'R.pin': true, isDesktop: true, w: 375, _closing: true, 'select[name=role]': 'x', mobileOpen: true }, FACTS.state.Site );
	assert.deepEqual( drop.keys, { mobileOpen: true } );
	assert.deepEqual( drop.dropped.map( ( d ) => d.key ).sort(), [ 'R.pin', '_closing', 'isDesktop', 'select[name=role]', 'w' ] );
	const o = stateOpener( { entry, skeleton: skeleton(), record: record( 'Site', [ open( { 'R.pin': true, _closing: true } ) ] ), facts: FACTS } );
	assert.equal( o.state, null );
	assert.match( o.refused[ 0 ].reason, /R\.pin: a render value/ );
	assert.match( o.refused[ 0 ].reason, /_closing: an underscore key/ );
} );

test( 'MUST FAIL (cause 3): a placeholder or prose value is never set, and a state with only those is refused', () => {
	for ( const v of [ { '<page>-<bi>-<gi>-<qi>': true }, { '<field>': '<message>' }, '{â€¦}', 'IND-######', '<category>', '> 0', 'Continue with missing fields', [ '<label>' ] ] ) {
		assert.ok( isDescription( v ), `${ JSON.stringify( v ) } is a description` );
	}
	for ( const v of [ true, 0, 'All', 'about', {}, { 'about-1': true }, [ 'a', 'b' ] ] ) {
		assert.ok( ! isDescription( v ), `${ JSON.stringify( v ) } is a value` );
	}
	const o = stateOpener( { entry, skeleton: skeleton(), record: record( 'Site', [ open( { faqOpen: { '<page>-<bi>-<gi>-<qi>': true } } ) ] ), facts: FACTS } );
	assert.equal( o.state, null );
	assert.match( o.refused[ 0 ].reason, /faqOpen: a placeholder/ );
} );

test( 'a key the component does not hold is refused; without the fact record only the name shape is judged', () => {
	assert.match( stateOpener( { entry, skeleton: skeleton(), record: record( 'Wizard', [ open( { 'L.labels': true, nosuch: true } ) ] ), facts: FACTS } ).refused[ 0 ].reason, /nosuch: not a state key of the component/ );
	const noFacts = stateOpener( { entry, skeleton: skeleton(), record: record( 'Wizard', [ open( { ckOpen: true, _x: 1 } ) ] ), facts: null } );
	assert.deepEqual( noFacts.keys, { ckOpen: true } );
} );

test( 'MUST FAIL (route first): a route-mounted component carries its route, and the draft url is read on it', () => {
	const o = stateOpener( { entry, skeleton: skeleton(), record: record( 'Wizard', [ open( { ckOpen: true } ) ], '/apply' ), facts: FACTS, rootComponent: 'Site' } );
	assert.equal( o.route, '/apply' );
	assert.equal( o.component, 'Wizard', 'a component other than the entry draft keeps its own host name' );
	assert.equal( withRoute( 'http://127.0.0.1:5/Site.dc.html', o.route ), 'http://127.0.0.1:5/Site.dc.html#/apply' );
	assert.equal( withRoute( 'http://127.0.0.1:5/Site.dc.html#/about', '/apply' ), 'http://127.0.0.1:5/Site.dc.html#/apply', 'the url\'s own hash is replaced' );
	for ( const r of [ '*', '/', '', null ] ) {
		assert.equal( withRoute( 'http://x/#/about', r ), 'http://x/#/about', `${ r } is the entry page` );
		assert.equal( routeHash( r ), null );
	}
} );

test( 'a surface that is not state-driven has no opener, and a record or state that cannot be found is a refusal', () => {
	assert.equal( stateOpener( { entry, skeleton: skeleton( { root: { viaState: false } } ), record: record( 'Site', [ open( { active: 1 } ) ] ), facts: FACTS } ), null );
	assert.match( stateOpener( { entry, skeleton: skeleton(), record: null, facts: FACTS } ).refused[ 0 ].reason, /no handoff record/ );
	assert.match( stateOpener( { entry: { states: { other: null } }, skeleton: skeleton(), record: record( 'Site', [ open( { active: 1 } ) ] ), facts: FACTS } ).refused[ 0 ].reason, /no state of record S-01 is named/ );
	const closedOnly = stateOpener( { entry: { states: { closed: null } }, skeleton: skeleton(), record: record( 'Site', [ { name: 'closed', state_keys: { active: null } } ] ), facts: FACTS } );
	assert.equal( closedOnly.state, null, 'a closed state is never an opener' );
} );

// A drawer kept in the page off-canvas while closed: intake found its root without opening it (no viaState), and the
// surface's states name the open state by its walker key (surfaces.json), never by the record's prose name.
const DRAWER = [ { name: 'closed', state_keys: { nav: false }, how_to_reach: 'Default' }, { name: 'open: drawer slides in, contents stagger in from the left', state_keys: { nav: true }, how_to_reach: 'dcLogic(\'Header\').setState({ nav: true })' } ];
const DRAWER_FACTS = { state: { Header: { keys: [ 'nav', 'signed' ], widthKeys: [] } } };
const drawerEntry = { states: { 'open-drawer-slides-in-contents-stagger-in-from-the-left': null } };
const kinded = ( kind, dc, states ) => ( { ...record( dc, states ), kind } );

test( 'MUST FAIL: a drawer whose root renders closed opens by its record\'s open state, named by its walker key', () => {
	const o = stateOpener( { entry: drawerEntry, skeleton: skeleton( { root: { viaCondition: false } } ), record: kinded( 'drawer', 'Header', DRAWER ), facts: DRAWER_FACTS, rootComponent: 'Home' } );
	assert.ok( o, 'the surface is state-driven' );
	assert.equal( o.state, DRAWER[ 1 ].name );
	assert.deepEqual( o.keys, { nav: true } );
	assert.equal( o.component, 'Header' );
	assert.equal( o.ways[ 0 ].via, 'state', 'plain keys are set first' );
	assert.deepEqual( o.refused, [] );
} );

test( 'MUST FAIL: a state-driven root\'s open state is found by its walker key too', () => {
	const o = stateOpener( { entry: drawerEntry, skeleton: skeleton(), record: record( 'Header', DRAWER ), facts: DRAWER_FACTS } );
	assert.equal( o.state, DRAWER[ 1 ].name );
} );

test( 'every open-able kind whose root renders closed opens; a menu panel, a modal and an accordion too', () => {
	for ( const kind of [ 'menu', 'modal', 'accordion' ] ) {
		assert.equal( stateOpener( { entry: drawerEntry, skeleton: skeleton( { root: {} } ), record: kinded( kind, 'Header', DRAWER ), facts: DRAWER_FACTS } )?.state, DRAWER[ 1 ].name, kind );
	}
} );

test( 'negative controls: a root that renders without a state has no opener unless it is an open-able surface named open', () => {
	const shown = skeleton( { root: { viaCondition: false } } );
	assert.equal( stateOpener( { entry: { states: { resting: null } }, skeleton: shown, record: kinded( 'drawer', 'Header', DRAWER ), facts: DRAWER_FACTS } ), null, 'a surface naming no record state is not state-driven (no refusal row)' );
	assert.equal( stateOpener( { entry: { states: { closed: null } }, skeleton: shown, record: kinded( 'drawer', 'Header', DRAWER ), facts: DRAWER_FACTS } ), null, 'naming only the closed state opens nothing' );
	assert.equal( stateOpener( { entry: { states: { default: null } }, skeleton: shown, record: kinded( 'modal', 'Header', [ { name: 'default', state_keys: {} }, { name: 'open', state_keys: { nav: true } } ] ), facts: DRAWER_FACTS } ), null, 'naming only the default state opens nothing' );
	const hours = [ { name: 'open now', state_keys: { openNow: true } }, { name: 'closed', state_keys: { openNow: false } } ];
	assert.equal( stateOpener( { entry: { states: { 'open-now': null } }, skeleton: shown, record: kinded( 'footer', 'Footer', hours ), facts: null } ), null, 'a footer showing opening hours is shown at rest, whatever its states are called' );
	for ( const kind of [ 'page', 'global', 'header', 'panel', 'form', undefined ] ) {
		assert.equal( stateOpener( { entry: drawerEntry, skeleton: shown, record: kinded( kind, 'Header', DRAWER ), facts: DRAWER_FACTS } ), null, `${ kind } is not an open-able kind` );
	}
	assert.equal( stateOpener( { entry: drawerEntry, skeleton: null, record: kinded( 'drawer', 'Header', DRAWER ), facts: DRAWER_FACTS } ), null, 'no skeleton, no opener' );
} );

test( 'the first usable state opens the surface; a state refused before it is listed', () => {
	const states = [ { name: 'open', state_keys: { _closing: true } }, { name: 'open wide', state_keys: { active: 2 }, sc_if_tpl_ids: [ '9' ] } ];
	const o = stateOpener( { entry: { states: { open: null, 'open wide': null } }, skeleton: skeleton(), record: record( 'Site', states ), facts: FACTS } );
	assert.equal( o.state, 'open wide' );
	assert.equal( o.refused.length, 1 );
	assert.equal( o.refused[ 0 ].state, 'open' );
} );

test( 'a state named open is tried before any other', () => {
	const states = [ { name: 'show', state_keys: { active: 3 } }, open( { active: 2 } ) ];
	const o = stateOpener( { entry: { states: { show: null, open: null } }, skeleton: skeleton(), record: record( 'Site', states ), facts: FACTS } );
	assert.deepEqual( [ o.state, o.keys ], [ 'open', { active: 2 } ] );
} );

test( 'a refusal is an UNMAPPED gap row on the surface root naming the state and the reason', () => {
	const o = stateOpener( { entry, skeleton: skeleton(), record: record( 'Site', [ open( { _closing: true } ) ] ), facts: FACTS } );
	const rows = refusalRows( { opener: o, nodes: [ { index: 0, parent: null, name: 'sgs/container' } ], flat: [ { r: 'cr-ref-x-0' } ], refOf: ( n ) => n.r } );
	assert.equal( rows.length, 1 );
	assert.deepEqual( { node: rows[ 0 ].node, block: rows[ 0 ].block, property: rows[ 0 ].property, value: rows[ 0 ].value }, { node: 'cr-ref-x-0', block: 'sgs/container', property: STATE_REFUSED, value: 'open' } );
	assert.match( rows[ 0 ].reason, /^state-refused: state "open" of S-01 was not opened: no usable state key/ );
} );

test( 'the walker config carries the same opener as source text that evaluates', () => {
	const src = openerSource( { component: 'Root', keys: { active: 1 } } );
	const fn = new Function( `return ( ${ src } );` )();
	assert.equal( typeof fn, 'function' );
	assert.match( src, /"op":"set","patch":\{"active":1\}/ );
	assert.match( src, /comp: "Root"/ );
} );

// A page whose in-page calls answer by function name: the instance count of setDraftState, the animation count, and how
// many of the record's sc-if ids render.
const stubPage = ( { reached, rendered } ) => ( {
	evaluate: async ( fn ) => ( 'logicState' === fn.name ? reached : 'renderedTpls' === fn.name ? rendered : 0 ),
	waitForTimeout: async () => {},
} );
const OPENER = { component: ROOT_HOST, state: 'open', keys: { active: 1 }, expect: [ '63', '66', '75' ], route: '*' };

test( 'MUST FAIL: a state whose sc-if ids did not render is refused with the reason, not read as a closed surface', async () => {
	const none = await openState( stubPage( { reached: 1, rendered: 0 } ), OPENER );
	assert.equal( none.ok, false );
	assert.match( none.reason, /none of the 3 sc-if ids of state "open" \(63, 66, 75\) rendered after state "open" \{"active":1\}/ );
	assert.equal( ( await openState( stubPage( { reached: 1, rendered: 2 } ), OPENER ) ).ok, true );
	assert.equal( ( await openState( stubPage( { reached: 1, rendered: null } ), { ...OPENER, expect: [] } ) ).ok, true, 'a record that lists no sc-if id is judged by the instance reached' );
} );

test( 'MUST FAIL: a component with no live instance is refused naming the page it was looked for on', async () => {
	const entry = await openState( stubPage( { reached: 0, rendered: 0 } ), OPENER );
	assert.equal( entry.ok, false );
	assert.match( entry.reason, /no live instance on the entry page/ );
	assert.match( ( await openState( stubPage( { reached: 0, rendered: 0 } ), { ...OPENER, component: 'Wizard', route: '/apply' } ) ).reason, /Wizard has no live instance on #\/apply/ );
} );
