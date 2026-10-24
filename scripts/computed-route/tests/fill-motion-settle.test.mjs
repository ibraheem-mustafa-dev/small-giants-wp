// lib/fill-motion-settle.mjs::motionSettled and lib/fill-part-pairing.mjs::unpairedPart's rendered-width and inherited
// rules: a burger bar's resting timing and rest length that its written motion part's hover state carries are settled by
// the motion pass, a value the state does not carry stays raised; a bar's width or colour read lands on the icon box or
// the burger setting when calibration measured the same box where both render, or saw the setting's colour reach the bar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionSettled } from '../lib/fill-motion-settle.mjs';
import { unpairedPart, rendered } from '../lib/fill-part-pairing.mjs';

const db = openDb();
const WRAP = '.sgs-nav-bar-menu__toggle-wrap';
const BURGER = `${ WRAP } > .sgs-nav-bar-menu__burger`;
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
const targets = [ 1, 2, 3 ].map( ( n ) => ( { target: `burger-bar-${ n }`, cssElement: `burger-bar-${ n }`, kind: 'part' } ) ).concat( { target: 'root', cssElement: 'root', kind: 'root' } );
const mdb = { targetsOf: () => targets };
const cal = { settings: Object.fromEntries( [ 1, 2, 3 ].map( ( n ) => [ `burgerBar${ n }BorderRadius`, { slot: bar( n ) } ] ) ) };
const nodes = [ { index: 0, name: 'sgs/nav-bar-menu', targets: [ { id: '0:', slot: '' }, ...[ 2, 3 ].map( ( n ) => ( { id: `0:${ n }`, slot: bar( n ) } ) ) ] } ];
const flat = [ { ref: 'cr-ref-header-16' } ];
const doc = { v: 1, elements: { root: { hover: { state: { values: { restWidth: '13px', duration: 300 } } } }, 'burger-bar-2': { hover: { state: { values: { restWidth: '13px', width: '18px', duration: 'token:duration.medium', easing: 'cubic-bezier(0.16, 0.84, 0.32, 1)' }, source: 'item' } } } } };
const writes = [ { node: 'cr-ref-header-16', attr: 'sgsMotion', how: 'motion', after: doc } ];
const rawSnapshot = { settings: { custom: { duration: { medium: '300ms' } } } };
const row = ( property, value, n = 2 ) => ( { node: 'cr-ref-header-16', block: 'sgs/nav-bar-menu', slot: bar( n ), property, value, state: null, reason: 'no-setting: test' } );
const run = ( unmapped ) => motionSettled( { unmapped, writes, nodes, flat, refOf: ( x ) => x.ref, mdb, db, calFor: () => cal, reads: null, rawSnapshot } );

test( 'MUST FAIL: a bar\'s resting duration, easing and rest length that its motion part\'s hover state carries are settled', () => {
	const r = run( [ row( 'transition-duration', '{"375":"0.3s","768":"0.3s"}' ), row( 'transition-timing-function', 'cubic-bezier(0.16, 0.84, 0.32, 1)' ), row( 'width', '13px' ) ] );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( r.answered.map( ( a ) => [ a.property, a.widths ] ), [ [ 'transition-duration', [ 375, 768 ] ], [ 'transition-timing-function', [ 375, 768, 1440 ] ], [ 'width', [ 375, 768, 1440 ] ] ] );
} );

test( 'negative control: a value the state does not carry, a part with no state, a root row and a hover row stay raised', () => {
	const kept = [ row( 'transition-duration', '0.35s' ), row( 'transition-delay', '0.04s' ), row( 'width', '8px', 3 ), row( 'width', '14px' ), { ...row( 'width', '13px' ), slot: '' }, { ...row( 'width', '13px' ), state: 'hover' }, row( 'color', 'red' ) ];
	const r = run( kept );
	assert.equal( r.answered.length, 0 );
	assert.equal( r.unmapped.length, kept.length );
} );

test( 'MUST FAIL: a bar width read pairs to the icon box where both render with equal default paint; hidden widths are no measurement', () => {
	const paint = { '': { 375: { display: 'flex' }, 768: { display: 'flex' }, 1440: { display: 'flex' } }, [ WRAP ]: { 375: { display: 'flex' }, 768: { display: 'none' }, 1440: { display: 'none' } },
		[ ICON ]: { 375: { width: '24px' }, 768: { width: '24px' }, 1440: { width: '24px' } }, [ bar( 1 ) ]: { 375: { width: '24px' }, 768: { width: '100%' }, 1440: { width: '100%' } } };
	const c = { elements: paint, settings: { burgerIconWidth: { slot: ICON }, burgerBarGap: { slot: ICON }, burgerBarAlign: { slot: ICON } } };
	assert.equal( rendered( c, bar( 1 ), 768 ), false );
	assert.equal( rendered( c, bar( 1 ), 375 ), true );
	assert.equal( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: c, attr: 'burgerIconWidth', readSlot: bar( 1 ), prop: 'width', value: '18px' } ), null );
	// Negative controls: a different box where both render is still refused, and no width where both render proves nothing.
	const hidden = { ...c, elements: { ...paint, [ WRAP ]: { 375: { display: 'none' }, 768: { display: 'none' }, 1440: { display: 'none' } } } };
	assert.match( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: hidden, attr: 'burgerIconWidth', readSlot: bar( 1 ), prop: 'width', value: '18px' } ), /^unpaired-part/ );
	const other = { ...c, elements: { ...paint, [ bar( 1 ) ]: { 375: { width: '20px' }, 768: { width: '100%' }, 1440: { width: '100%' } } } };
	assert.match( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: other, attr: 'burgerIconWidth', readSlot: bar( 1 ), prop: 'width', value: '18px' } ), /^unpaired-part/ );
} );

test( 'MUST FAIL: an inherited colour calibration saw reach the bar pairs to the burger setting; one it did not reach is refused', () => {
	const settings = { burgerColour: { slot: BURGER, reaches: [ BURGER, ICON, bar( 1 ) ] }, burgerBg: { slot: BURGER }, burgerSize: { slot: BURGER } };
	assert.equal( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: { elements: {}, settings }, attr: 'burgerColour', readSlot: bar( 1 ), prop: 'color', value: 'rgb(10, 126, 168)' } ), null );
	assert.match( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: { elements: {}, settings }, attr: 'burgerColour', readSlot: bar( 2 ), prop: 'color', value: 'rgb(10, 126, 168)' } ), /^unpaired-part/ );
} );
