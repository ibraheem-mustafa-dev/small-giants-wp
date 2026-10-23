// Transitions split per property (Spec 48 FR-48-81): a transition list that times its properties differently is read
// per property with CSS's list-repeat rule, the timing most properties share is written to the one setting that holds
// the element's timing, and every other timing is a named row, never dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates } from '../lib/db.mjs';
import { timingWrites, transitionEntries } from '../lib/fill-timing.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: W, effects: [], variants: [ 0 ], ...extra } );
const PROP = 'transition-property';
const DUR = 'transition-duration';
const EASE = 'transition-timing-function';
const DELAY = 'transition-delay';
const DRAWER = { elements: { '': {} }, settings: {
	submenuAnimationDuration: setting( DUR, { state: 'open' } ), submenuExitDuration: setting( DUR ), submenuAnimationEasing: setting( EASE, { state: 'open' } ),
} };
const MEMBER = { elements: { '': {} }, settings: { transitionDuration: setting( DUR ), transitionEasing: setting( EASE ) } };
const NONE = { elements: { '': {} }, settings: {} };
const at3 = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const reads = ( rest = {}, looks = [] ) => ( { declared: at3( { t: rest } ), states: at3( { looks: { t: looks } } ) } );
const look = ( state, declared ) => ( { states: [ state ], declared, rendered: declared } );
const run = ( block, cal, r ) => {
	const node = { name: block, attributes: {}, innerBlocks: [] };
	const out = timingWrites( { node, ref: 'r0', rec: { index: 0, name: block }, target: { id: 't', slot: '' }, cal, db, snapshot, reads: r, held: settingStates( db, block ) } );
	return { ...out, attrs: node.attributes };
};
const rows = ( out, prefix ) => out.unmapped.filter( ( u ) => u.reason.startsWith( prefix ) );

test( 'MUST FAIL: a list timing its properties differently writes the timing most share and names the others', () => {
	const r = run( 'sgs/team-member', MEMBER, reads( { [ PROP ]: 'color, background-color, box-shadow', [ DUR ]: '0.2s, 200ms, 0.35s' } ) );
	assert.equal( r.attrs.transitionDuration, '200', '0.2s and 200ms are one timing, shared by two of three properties' );
	const conflict = rows( r, 'timing-conflict' );
	assert.equal( conflict.length, 1 );
	assert.match( conflict[ 0 ].reason, /^timing-conflict: transitionDuration holds one transition-duration .*the draft times box-shadow at 0\.35s$/ );
	assert.deepEqual( JSON.parse( conflict[ 0 ].value ), [ { properties: [ 'box-shadow' ], value: '0.35s' } ] );
	assert.deepEqual( conflict[ 0 ].widths, W, 'one row for the widths that read the same split' );
} );

test( 'MUST FAIL: each longhand list repeats to the property list, a repeated property takes its last entry, extra entries are unused', () => {
	const e = transitionEntries( { [ PROP ]: 'color, opacity, transform', [ DUR ]: '0.1s, 0.2s', [ EASE ]: 'ease' } );
	assert.deepEqual( e.map( ( x ) => [ x.property, x[ DUR ], x[ EASE ], x[ DELAY ] ] ), [ [ 'color', '0.1s', 'ease', '0s' ], [ 'opacity', '0.2s', 'ease', '0s' ], [ 'transform', '0.1s', 'ease', '0s' ] ] );
	assert.deepEqual( transitionEntries( { [ PROP ]: 'color, opacity, color', [ DUR ]: '1s, 2s, 3s' } ).map( ( x ) => [ x.property, x[ DUR ] ] ), [ [ 'opacity', '2s' ], [ 'color', '3s' ] ] );
	assert.deepEqual( transitionEntries( { [ PROP ]: 'color', [ DUR ]: '0.2s, 0.4s' } ).map( ( x ) => x[ DUR ] ), [ '0.2s' ] );
	assert.deepEqual( transitionEntries( { [ PROP ]: 'none', [ DUR ]: '0.2s' } ), [] );
	const r = run( 'sgs/team-member', MEMBER, reads( { [ PROP ]: 'color, opacity, transform', [ EASE ]: 'ease, linear' } ) );
	assert.ok( undefined !== r.attrs.transitionEasing, 'the easing two of three properties share is written' );
	assert.deepEqual( rows( r, 'timing-conflict' ).map( ( u ) => JSON.parse( u.value ) ), [ [ { properties: [ 'opacity' ], value: 'linear' } ] ] );
} );

test( 'MUST FAIL: a state rule\'s list is split per property, with the resting property list where the state states none', () => {
	const r = run( 'sgs/nav-drawer-menu', DRAWER, reads( { [ PROP ]: 'opacity, transform', [ DUR ]: '0.2s' }, [ look( 'open', { [ DUR ]: '0.3s, 0.5s' } ) ] ) );
	assert.equal( r.attrs.submenuAnimationDuration, 300, 'a tie keeps the draft\'s first timing' );
	assert.equal( r.attrs.submenuExitDuration, 200 );
	const conflict = rows( r, 'timing-conflict' );
	assert.deepEqual( conflict.map( ( u ) => [ u.state, JSON.parse( u.value ) ] ), [ [ 'open', [ { properties: [ 'transform' ], value: '0.5s' } ] ] ] );
	assert.match( conflict[ 0 ].reason, /^timing-conflict: submenuAnimationDuration / );
	const reverse = run( 'sgs/team-member', MEMBER, reads( {}, [ look( 'hover', { [ PROP ]: 'color, transform', [ DUR ]: '0.2s, 0.4s' } ) ] ) );
	assert.equal( reverse.attrs.transitionDuration, '200', 'closing reverses opening: the hover list times both directions' );
	assert.deepEqual( rows( reverse, 'timing-' ).map( ( u ) => [ u.state, u.reason.split( ':' )[ 0 ] ] ), [ [ 'hover', 'timing-conflict' ] ] );
	assert.match( rows( reverse, 'timing-conflict' )[ 0 ].reason, /^timing-conflict: transitionDuration / );
} );

test( 'MUST FAIL: a property whose timing has no home is a named row; the motion hover layer holds transform\'s timing and names the rest', () => {
	const none = run( 'sgs/button', NONE, reads( { [ PROP ]: 'color, box-shadow, opacity', [ DUR ]: '0.2s, 0.25s, 0.2s', [ DELAY ]: '0s, 0ms, 0.04s' } ) );
	assert.equal( none.writes.length, 0 );
	const homeless = rows( none, 'timing-no-home' ).map( ( u ) => [ u.property, ...JSON.parse( u.value ).map( ( g ) => `${ g.properties[ 0 ] } ${ g.value }` ) ] );
	assert.deepEqual( homeless, [
		[ DUR, 'color 0.2s' ], [ DUR, 'opacity 0.2s' ], [ DUR, 'box-shadow 0.25s' ],
		[ DELAY, 'color 0s' ], [ DELAY, 'box-shadow 0s' ], [ DELAY, 'opacity 0.04s' ],
	] );
	assert.equal( rows( none, 'timing-conflict' ).length + rows( none, 'timing-split' ).length, 0 );
	const hover = look( 'hover', { transform: 'translateY(-2px)' } );
	const layer = run( 'sgs/button', NONE, reads( { [ PROP ]: 'box-shadow, transform', [ DUR ]: '0.25s, 0.2s' }, [ hover ] ) );
	assert.equal( rows( layer, 'timing-no-home' ).length, 0, 'the motion hover layer times the element' );
	const conflict = rows( layer, 'timing-conflict' );
	assert.equal( conflict.length, 1 );
	assert.match( conflict[ 0 ].reason, /motion hover layer \(sgsMotion\).*transform's transition-duration 0\.2s; the draft times box-shadow at 0\.25s$/ );
} );
