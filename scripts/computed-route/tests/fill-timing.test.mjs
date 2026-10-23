// State transition timing for Fill (Spec 48 FR-48-81, the states wave): CSS direction semantics against the real framework
// DB. A timing on the resting rule times both directions (settings with no state), one on a state rule times entering that
// state (settings tagged with it), and closing reverses opening unless the draft states otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates } from '../lib/db.mjs';
import { timingFacts, timingWrites, timingCheck, oneTiming } from '../lib/fill-timing.mjs';
import { fillStates, stateDrafts } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: W, effects: [], variants: [ 0 ], ...extra } );
const DUR = 'transition-duration';
const EASE = 'transition-timing-function';
const DRAWER = { elements: { '': {} }, settings: {
	submenuAnimationDuration: setting( DUR, { state: 'open' } ), submenuExitDuration: setting( DUR ), submenuAnimationEasing: setting( EASE, { state: 'open' } ),
} };
const MEMBER = { elements: { '': {} }, settings: { transitionDuration: setting( DUR ), transitionEasing: setting( EASE ) } };
const at3 = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
// reads: the resting declared timings and the state looks (rendered value, the way readStates returns them).
const reads = ( rest = {}, looks = [] ) => ( { declared: at3( { t: rest } ), states: at3( { looks: { t: looks } } ) } );
const look = ( state, prop, value ) => ( { states: [ state ], declared: { [ prop ]: value }, rendered: { [ prop ]: value } } );
const run = ( block, cal, r ) => {
	const node = { name: block, attributes: {}, innerBlocks: [] };
	const out = timingWrites( { node, ref: 'r0', rec: { index: 0, name: block }, target: { id: 't', slot: '' }, cal, db, snapshot, reads: r, held: settingStates( db, block ) } );
	return { ...out, attrs: node.attributes };
};
const summary = ( out ) => out.writes.map( ( w ) => [ w.attr, w.state, w.how ] );

test( 'MUST FAIL: a timing on the resting rule goes to the setting that times both directions, never to the state setting', () => {
	const r = run( 'sgs/nav-drawer-menu', DRAWER, reads( { [ DUR ]: '0.2s' } ) );
	assert.deepEqual( summary( r ), [ [ 'submenuExitDuration', null, 'fill-timing' ] ] );
	assert.equal( r.attrs.submenuExitDuration, 200 );
	assert.equal( r.attrs.submenuAnimationDuration, undefined, 'the open setting is untouched' );
} );

test( 'MUST FAIL: a timing on a state rule goes to the setting tagged with that state; the resting rule still times leaving', () => {
	const r = run( 'sgs/nav-drawer-menu', DRAWER, reads( { [ DUR ]: '0.2s' }, [ look( 'open', DUR, '0.3s' ) ] ) );
	assert.deepEqual( summary( r ).sort(), [ [ 'submenuAnimationDuration', 'open', 'fill-timing' ], [ 'submenuExitDuration', null, 'fill-timing' ] ] );
	assert.equal( r.attrs.submenuAnimationDuration, 300 );
	assert.equal( r.attrs.submenuExitDuration, 200 );
} );

test( 'closing reverses opening: a state timing alone is one write, with no timing invented for leaving', () => {
	const r = run( 'sgs/nav-drawer-menu', DRAWER, reads( {}, [ look( 'open', DUR, '0.3s' ) ] ) );
	assert.deepEqual( summary( r ), [ [ 'submenuAnimationDuration', 'open', 'fill-timing' ] ] );
	assert.equal( r.attrs.submenuExitDuration, undefined );
} );

test( 'MUST FAIL: with no setting for the state, the one timing goes to the setting that times both ways; with a different resting timing it is a named gap', () => {
	const only = run( 'sgs/team-member', MEMBER, reads( {}, [ look( 'hover', DUR, '0.5s' ) ] ) );
	assert.deepEqual( summary( only ), [ [ 'transitionDuration', null, 'fill-timing-reverse' ] ] );
	assert.equal( only.attrs.transitionDuration, '500', 'the setting holds whole milliseconds as text' );
	const differs = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: '0.2s' }, [ look( 'hover', DUR, '0.5s' ) ] ) );
	assert.deepEqual( summary( differs ), [ [ 'transitionDuration', null, 'fill-timing' ] ], 'the resting rule is written as the draft states it' );
	assert.match( differs.unmapped[ 0 ].reason, /^timing-enter-differs/ );
	assert.equal( differs.attrs.transitionDuration, '200' );
} );

test( 'the easing follows the same direction rules; a list repeating one value is that value, a computed list is a named gap', () => {
	const r = run( 'sgs/nav-drawer-menu', DRAWER, reads( {}, [ look( 'open', EASE, 'ease-out, ease-out' ) ] ) );
	assert.deepEqual( summary( r ), [ [ 'submenuAnimationEasing', 'open', 'fill-timing' ] ] );
	assert.equal( oneTiming( 'cubic-bezier(0.4, 0, 0.2, 1), cubic-bezier(0.4, 0, 0.2, 1)' ), 'cubic-bezier(0.4, 0, 0.2, 1)' );
	assert.equal( oneTiming( '0.2s, 0.4s' ), null );
	const all = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: '0.2s, 0.4s' } ) );
	assert.equal( all.attrs.transitionDuration, '200', 'with no transition-property (all), only the first time is used' );
	const per = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: 'calc(0.2s * 2), 0.4s' } ) );
	assert.equal( per.writes.length, 0 );
	assert.match( per.unmapped[ 0 ].reason, /^timing-computed/ );
} );

test( 'a computed timing is a gap only on a block that has a setting for it; a combined state is named', () => {
	const none = run( 'sgs/button', { elements: { '': {} }, settings: {} }, reads( { [ DUR ]: 'var(--t)' } ) );
	assert.deepEqual( [ none.writes.length, none.unmapped.length ], [ 0, 0 ], 'sgs/button has no role-motion timing setting' );
	const plain = run( 'sgs/button', { elements: { '': {} }, settings: {} }, reads( { [ DUR ]: '0.2s' } ) );
	assert.deepEqual( [ plain.writes.length, plain.unmapped.length ], [ 0, 0 ], 'a literal timing no setting holds is the motion writer is owner, not a gap' );
	const some = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: 'var(--t)' } ) );
	assert.match( some.unmapped[ 0 ].reason, /^timing-computed/ );
	const both = run( 'sgs/nav-drawer-menu', DRAWER, reads( {}, [ { states: [ 'hover', 'open' ], declared: { [ DUR ]: '1s' }, rendered: { [ DUR ]: '1s' } } ] ) );
	assert.match( both.unmapped[ 0 ].reason, /^combined-state/ );
} );

test( 'timingFacts splits the resting timing from each state\'s, per read width', () => {
	const f = timingFacts( reads( { [ DUR ]: '300ms' }, [ look( 'open', DUR, '0.5s' ) ] ), 't' );
	assert.deepEqual( f.rest[ DUR ], { 375: '300ms', 768: '300ms', 1440: '300ms' } );
	assert.deepEqual( f.enter.open[ DUR ], { 375: '0.5s', 768: '0.5s', 1440: '0.5s' } );
	assert.deepEqual( timingFacts( reads(), 't' ), { rest: {}, enter: {}, skipped: [], split: [] } );
} );

test( 'MUST FAIL: Fill\'s state pass writes a timing through the timing rules, and the one-look-one-state path no longer carries it', () => {
	const rd = reads( {}, [ look( 'open', DUR, '0.3s' ) ] );
	assert.equal( stateDrafts( rd, 't' ).size, 0, 'the generic state path leaves timings to lib/fill-timing.mjs' );
	const tree = [ { name: 'sgs/nav-drawer-menu', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const res = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/nav-drawer-menu', targets: [ { id: 't', slot: '' } ] } ], reads: rd, calFor: () => DRAWER, db, snapshot } );
	assert.deepEqual( res.writes.map( ( w ) => [ w.attr, w.how ] ), [ [ 'submenuAnimationDuration', 'fill-timing' ] ] );
	assert.equal( tree[ 0 ].attributes.submenuAnimationDuration, 300 );
	const both = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/nav-drawer-menu', targets: [ { id: 't', slot: '' } ] } ], reads: reads( {}, [ { states: [ 'hover', 'open' ], declared: { [ DUR ]: '1s' }, rendered: { [ DUR ]: '1s' } } ] ), calFor: () => DRAWER, db, snapshot } );
	assert.match( both.unmapped[ 0 ].reason, /^combined-state/, 'a timing gap reaches the state pass unmapped list' );
} );

test( 'MUST FAIL: the timing check finds a live page that times a change differently, and holds closing to the reverse of opening', () => {
	const draft = at3( { rest: { d: { [ DUR ]: '0.2s' } }, states: { looks: { d: [ look( 'open', DUR, '0.3s' ) ] } } } );
	const live = ( rest, liveLook ) => at3( { rest: { l: rest }, states: { looks: { l: liveLook ? [ look( 'open', DUR, liveLook ) ] : [] } } } );
	const pairs = [ { draft: 'd', live: 'l' } ];
	const verdicts = ( rows ) => rows.filter( ( r ) => r.prop === DUR && 375 === r.width ).map( ( r ) => [ r.direction, r.verdict ] );
	assert.deepEqual( verdicts( timingCheck( { draft, live: live( { [ DUR ]: '200ms' }, '300ms' ), pairs } ) ), [ [ 'enter', 'match' ], [ 'both', 'match' ] ] );
	assert.deepEqual( verdicts( timingCheck( { draft, live: live( { [ DUR ]: '200ms' }, '900ms' ), pairs } ) ), [ [ 'enter', 'differs' ], [ 'both', 'match' ] ], 'a wrong enter timing' );
	assert.deepEqual( verdicts( timingCheck( { draft, live: live( { [ DUR ]: '1s' }, '300ms' ), pairs } ) ), [ [ 'enter', 'match' ], [ 'both', 'differs' ] ], 'a wrong resting timing' );
	assert.deepEqual( verdicts( timingCheck( { draft, live: live( {}, null ), pairs } ) ), [ [ 'enter', 'unreadable' ], [ 'both', 'unreadable' ] ], 'an unread live timing is not a match' );
	const ease = ( rest, live ) => timingCheck( { draft: at3( { rest: { d: { [ EASE ]: rest } }, states: { looks: {} } } ), live: at3( { rest: { l: { [ EASE ]: live } }, states: { looks: {} } } ), pairs } ).filter( ( r ) => 375 === r.width ).map( ( r ) => r.verdict );
	assert.deepEqual( [ ease( 'ease-in', 'ease-in' ), ease( 'ease-in', 'ease-out' ), ease( 'cubic-bezier(.4,0,.2,1)', 'cubic-bezier(0.4, 0, 0.2, 1)' ) ], [ [ 'match' ], [ 'differs' ], [ 'match' ] ], 'easings compare by their canonical spelling' );
	const only = at3( { rest: { d: {} }, states: { looks: { d: [ look( 'open', DUR, '0.3s' ) ] } } } );
	assert.deepEqual( verdicts( timingCheck( { draft: only, live: live( { [ DUR ]: '300ms' }, '300ms' ), pairs } ) ), [ [ 'enter', 'match' ], [ 'leave', 'match' ] ], 'closing reverses opening' );
	assert.deepEqual( verdicts( timingCheck( { draft: only, live: live( { [ DUR ]: '1s' }, '300ms' ), pairs } ) ), [ [ 'enter', 'match' ], [ 'leave', 'differs' ] ], 'a live close that does not reverse the open' );
} );

test( 'MUST FAIL: with no resting timing and several states timing entry, one value is written (hover first) and each other state is named', () => {
	const r = run( 'sgs/team-member', MEMBER, reads( {}, [ look( 'active', DUR, '0.05s' ), look( 'hover', DUR, '0.2s' ) ] ) );
	assert.deepEqual( summary( r ), [ [ 'transitionDuration', null, 'fill-timing-reverse' ] ] );
	assert.equal( r.attrs.transitionDuration, '200' );
	assert.equal( r.unmapped.length, 1 );
	assert.equal( r.unmapped[ 0 ].state, 'active' );
	assert.match( r.unmapped[ 0 ].reason, /^timing-enter-differs/ );
	const agree = run( 'sgs/team-member', MEMBER, reads( {}, [ look( 'hover', DUR, '0.2s' ), look( 'active', DUR, '0.2s' ) ] ) );
	assert.equal( agree.writes.length, 1 );
	assert.equal( agree.unmapped.length, 0, 'states agreeing on the timing need no row' );
} );

test( 'MUST FAIL: a state timing equal to the resting timing is not a timing-enter-differs gap', () => {
	const same = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: '0.2s' }, [ look( 'hover', DUR, '0.2s' ) ] ) );
	assert.equal( same.unmapped.length, 0 );
	assert.equal( same.attrs.transitionDuration, '200' );
	const differs = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: '0.2s' }, [ look( 'hover', DUR, '0.5s' ) ] ) );
	assert.equal( differs.unmapped.length, 1 );
	const spelled = run( 'sgs/team-member', MEMBER, reads( { [ DUR ]: '.2s' }, [ look( 'hover', DUR, '200ms' ) ] ) );
	assert.equal( spelled.unmapped.length, 0, '.2s and 200ms are one timing' );
	const states = run( 'sgs/team-member', MEMBER, reads( {}, [ look( 'hover', DUR, '0.2s' ), look( 'active', DUR, '200ms' ) ] ) );
	assert.equal( states.unmapped.length, 0, 'two states timing 0.2s and 200ms agree' );
} );

test( 'MUST FAIL: the timing check compares a draft look with the live look of the same state that times the same property', () => {
	const draft = at3( { rest: { d: {} }, states: { looks: { d: [ look( 'hover', EASE, 'ease-in' ), look( 'hover', DUR, '0.3s' ) ] } } } );
	const liveLooks = [ look( 'hover', EASE, 'ease-in' ), look( 'hover', DUR, '0.3s' ) ];
	const live = at3( { rest: { l: {} }, states: { looks: { l: liveLooks } } } );
	const rows = timingCheck( { draft, live, pairs: [ { draft: 'd', live: 'l' } ] } ).filter( ( r ) => 375 === r.width && 'enter' === r.direction );
	assert.deepEqual( rows.map( ( r ) => [ r.prop, r.verdict ] ), [ [ DUR, 'match' ], [ EASE, 'match' ] ] );
} );
