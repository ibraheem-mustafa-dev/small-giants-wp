// The burger bars of a nav-bar-menu (Track R wave 4, r4-burger-b), real cases from the Indus header Fill of 2026-10-24:
// (1) lib/fill-state-reach.mjs::motionHolds finds a bar's motion part from its exact calibrated home, as the motion writer does;
// (2) a bar that declares no colour of its own follows its button's hover colour (the draft's `style-hover` on the
//     button turns the bars white), so lib/fill-state.mjs::holdDefaults never holds the block's hover colour at the bars'
//     resting one; (3) a colour setting's side effects are recorded on every element it reaches (a bar painted
//     `background: currentColor`, lib/calibrate.mjs::slotFor), and lib/fill-held.mjs::coveredBySetting compares a written
//     palette slug as its colour, so the bars' resting background is covered by burgerColour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionHolds, ancestorLook, holdDefaults } from '../lib/fill-state.mjs';
import { ancestorHolds } from '../lib/fill-state-reach.mjs';
import { exactHome } from '../lib/fill-part-pairing.mjs';
import { slotFor, WIDTHS, MARKER_RGB } from '../lib/calibrate.mjs';
import { coveredBySetting, slugColour, makeSettle } from '../lib/fill-held.mjs';

const db = openDb();
const BLOCK = 'sgs/nav-bar-menu';
const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
const R3 = [ 375, 768, 1440 ];
const BLUE = 'rgb(10, 126, 168)';
const WHITE = 'rgb(255, 255, 255)';

test( 'MUST FAIL: the state pass finds a bar\'s motion part from its exact calibrated home', () => {
	const targets = [ 1, 2, 3 ].map( ( n ) => ( { target: `burger-bar-${ n }`, cssElement: `burger-bar-${ n }`, kind: 'part' } ) ).concat( { target: 'root', cssElement: 'root', kind: 'root' } );
	const mdb = { targetsOf: () => targets };
	const cal = { settings: Object.fromEntries( [ 1, 2, 3 ].map( ( n ) => [ `burgerBar${ n }BorderRadius`, { slot: bar( n ) } ] ) ) };
	const rec = { name: BLOCK };
	assert.equal( motionHolds( mdb, rec, { slot: bar( 2 ) }, ( el ) => exactHome( db, BLOCK, cal, el ) ), true );
	// Negative control: without the home the positional slot names no part, and a slot no part is homed at is none.
	assert.equal( motionHolds( mdb, rec, { slot: bar( 2 ) } ), false );
	assert.equal( motionHolds( mdb, rec, { slot: bar( 4 ) }, ( el ) => exactHome( db, BLOCK, cal, el ) ), false );
} );

// The burger and its first bar, as Fill reads them: the button declares its colour at rest and white on hover (a script
// look of its `style-hover`); the bar declares only `background: currentColor`.
const burger = { id: 'b', slot: BURGER };
const bar1 = { id: 'k', slot: bar( 1 ) };
const at = ( v ) => Object.fromEntries( R3.map( ( w ) => [ w, v ] ) );
const readsOf = ( { barDeclares = {}, burgerHover = { color: WHITE }, state = 'hover', barLook = null } = {} ) => ( {
	declared: Object.fromEntries( R3.map( ( w ) => [ w, { b: { color: BLUE }, k: { 'background-color': 'currentcolor', ...barDeclares } } ] ) ),
	widths: Object.fromEntries( R3.map( ( w ) => [ w, { b: { styles: { color: BLUE } }, k: { styles: { color: BLUE, 'background-color': BLUE } } } ] ) ),
	states: Object.fromEntries( R3.map( ( w ) => [ w, { looks: { b: [ { states: [ state ], declared: burgerHover, rendered: burgerHover } ], ...( barLook ? { k: [ { states: [ 'hover' ], declared: barLook, rendered: barLook } ] } : {} ) } } ] ) ),
} );
const rec = { index: 0, name: BLOCK, targets: [ { id: 'r', slot: '' }, burger, bar1 ] };

test( 'MUST FAIL: a bar that declares no colour follows its button\'s hover look', () => {
	assert.equal( ancestorLook( readsOf(), rec, bar1, 'hover', 'color' ), burger );
	// Negative controls: a bar with its own colour, focus (never entered by an ancestor), a property the button's hover
	// leaves alone, and a button whose hover changes no colour.
	assert.equal( ancestorLook( readsOf( { barDeclares: { color: BLUE } } ), rec, bar1, 'hover', 'color' ), null );
	assert.equal( ancestorLook( readsOf( { state: 'focus' } ), rec, bar1, 'focus', 'color' ), null );
	assert.equal( ancestorLook( readsOf( { burgerHover: { 'box-shadow': 'none' } } ), rec, bar1, 'hover', 'box-shadow' ), null, 'box-shadow never inherits' );
	assert.equal( ancestorLook( readsOf( { barLook: { color: WHITE } } ), rec, bar1, 'hover', 'color' ), burger, 'the element itself is never its own ancestor' );
	assert.equal( ancestorLook( readsOf(), rec, bar1, 'hover', 'font-size' ), null );
	assert.equal( ancestorLook( readsOf( { burgerHover: { 'box-shadow': 'none' } } ), rec, bar1, 'hover', 'color' ), null );
	assert.equal( ancestorLook( readsOf(), rec, burger, 'hover', 'color' ), null, 'the button\'s own hover is its own look' );
} );

test( 'MUST FAIL: the bars\' hover colour is never held at their resting colour when the button\'s hover turns them white', () => {
	const setting = ( property, extra = {} ) => ( { slot: BURGER, slots: [ BURGER ], reaches: [ BURGER, bar( 1 ) ], property, state: null, forms: [ 'hex' ], transform: null, reachedAt: R3, effects: [], variants: [ 0 ], ...extra } );
	const cal = { elements: { [ BURGER ]: {}, [ bar( 1 ) ]: {} }, settings: { burgerColour: setting( 'color' ), burgerColourHover: setting( 'color', { state: 'hover', slots: [ BURGER, bar( 1 ) ], effects: [ `${ bar( 1 ) }|background-color` ], look: { [ BURGER ]: { color: at( 'rgb(0, 0, 0)' ) } } } ) } };
	const run = ( reads ) => holdDefaults( { node: { attributes: {} }, ref: 'cr-ref-x-0', rec, target: bar1, cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads, drafts: new Map(), held: new Set( [ 'hover' ] ), interaction: new Set( [ 'hover' ] ), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } );
	const out = run( readsOf() );
	assert.deepEqual( out.unmapped, [], JSON.stringify( out.unmapped ) );
	assert.deepEqual( out.writes, [] );
	assert.deepEqual( out.held.map( ( h ) => h.prop ).sort(), [ 'background-color', 'color' ] );
	out.held.forEach( ( h ) => assert.match( h.reason, /follows .*__burger, whose hover look the draft declares/ ) );
	// Negative control: a bar with its own colour is still held (here raised), never followed.
	const own = run( readsOf( { barDeclares: { color: BLUE } } ) );
	assert.ok( own.unmapped.some( ( u ) => 'color' === u.property && /^default-state:/.test( u.reason ) ), JSON.stringify( own ) );
	assert.ok( own.held.every( ( h ) => ! /whose hover look the draft declares/.test( h.reason ) ) );
} );

// The calibration page's burger at rest (black) and under the colour marker: the bar's background follows its colour.
const colourRow = { attr_name: 'burgerColour', css_property: 'color', tier_shape: null, css_state: null };
const colourMarker = { label: 'hex', attrs: { burgerColour: '#13579b' }, expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, MARKER_RGB ] ) ) };
const reading = ( colour ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ BURGER ]: { color: colour, 'border-top-color': colour }, [ bar( 1 ) ]: { color: colour, 'background-color': colour } } ] ) );

test( 'MUST FAIL: a colour setting records its side effects on every element it reaches', () => {
	const s = slotFor( colourRow, colourMarker, reading( 'rgb(0, 0, 0)' ), reading( MARKER_RGB ) );
	assert.deepEqual( s.slots, [ BURGER ] );
	assert.ok( s.effects.includes( `${ bar( 1 ) }|background-color` ), JSON.stringify( s.effects ) );
	assert.ok( s.effects.includes( `${ BURGER }|border-top-color` ) );
	// Negative control: a non-inherited setting keeps its side effects to its own slots.
	const bg = slotFor( { ...colourRow, css_property: 'background-color' }, colourMarker, { ...reading( 'rgb(0, 0, 0)' ) }, Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ BURGER ]: { 'background-color': MARKER_RGB }, [ bar( 1 ) ]: { color: MARKER_RGB } } ] ) ) );
	assert.deepEqual( bg.effects, [] );
} );

test( 'MUST FAIL: the bars\' resting background is covered by the written burger colour, a palette slug compared as its colour', () => {
	const palette = [ { slug: 'primary', colour: { r: 10, g: 126, b: 168, a: 1 } }, { slug: 'veil', colour: { r: 0, g: 0, b: 0, a: 0.5 } } ];
	assert.equal( slugColour( 'primary', palette ), BLUE );
	assert.equal( slugColour( 'veil', palette ), 'rgba(0, 0, 0, 0.5)' );
	assert.equal( slugColour( '#0A7EA8', palette ), '#0A7EA8' );
	const cal = { settings: { burgerColour: { slot: BURGER, slots: [ BURGER ], reaches: [ BURGER, bar( 1 ) ], property: 'color', state: null, effects: [ `${ bar( 1 ) }|background-color` ] } }, elements: {} };
	const row = { node: 'n', slot: bar( 1 ), property: 'background-color', state: null };
	const writes = [ { node: 'n', attr: 'burgerColour', after: 'primary', how: 'single', widths: [ 768 ] } ];
	assert.match( coveredBySetting( row, at( BLUE ), writes, cal, () => ( {} ), palette ), /burgerColour was written/ );
	// Negative controls: another colour, and a setting with no effect there.
	assert.equal( coveredBySetting( row, at( WHITE ), writes, cal, () => ( {} ), palette ), null );
	assert.equal( coveredBySetting( row, at( BLUE ), writes, { ...cal, settings: { burgerColour: { ...cal.settings.burgerColour, effects: [] } } }, () => ( {} ), palette ), null );
} );

test( 'MUST FAIL: the classifier compares the bar background with the run palette', () => {
	const cal = { settings: { burgerColour: { slot: BURGER, slots: [ BURGER ], reaches: [ BURGER, bar( 1 ) ], property: 'color', state: null, effects: [ `${ bar( 1 ) }|background-color` ] } }, elements: {} };
	const st = {
		rawSnapshot: { settings: { custom: {} } }, snapshot: { palette: [ { slug: 'primary', colour: { r: 10, g: 126, b: 168, a: 1 } } ] },
		nodes: [ { index: 0, name: BLOCK, parent: null, children: [], targets: [ { id: 'k', slot: bar( 1 ) } ] } ], flat: [ { attributes: { className: 'cr-ref-x-0' } } ],
		reads: { widths: Object.fromEntries( R3.map( ( w ) => [ w, { k: { styles: { 'background-color': BLUE } } } ] ) ) }, calFor: () => cal,
	};
	const row = { node: 'cr-ref-x-0', block: BLOCK, slot: bar( 1 ), property: 'background-color', value: BLUE, state: null, reason: 'no-setting: no background-color setting' };
	const out = makeSettle( st )( { unmapped: [ row ], writes: [ { node: 'cr-ref-x-0', attr: 'burgerColour', after: 'primary', how: 'single', widths: [ 768 ] } ] } );
	assert.deepEqual( out.alreadyHeld.map( ( h ) => h.heldReason ), [ 'covered' ] );
	assert.equal( out.unmapped.length, 0 );
} );

// holdDefaults follows the ancestor only where its written state look holds the element (lib/fill-state-reach.mjs::ancestorHolds).
const follow = ( { cal, taken } ) => holdDefaults( { node: { attributes: {} }, ref: 'cr-ref-x-0', rec, target: bar1, cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads: readsOf(), drafts: new Map(), held: new Set( [ 'hover' ] ), interaction: new Set( [ 'hover' ] ), taken } );
const followed = ( out ) => out.held.filter( ( h ) => /whose hover look the draft declares/.test( h.reason ) ).map( ( h ) => h.prop ).sort();
const setting = ( property, extra = {} ) => ( { slot: BURGER, slots: [ BURGER ], reaches: [ BURGER, bar( 1 ) ], property, state: null, forms: [ 'hex' ], transform: null, reachedAt: R3, effects: [], variants: [ 0 ], ...extra } );
const followCal = ( more = {} ) => ( { elements: { [ BURGER ]: {}, [ bar( 1 ) ]: {} }, settings: { burgerColour: setting( 'color' ), burgerColourHover: setting( 'color', { state: 'hover', slots: [ BURGER, bar( 1 ) ], effects: [ `${ bar( 1 ) }|background-color` ], look: { [ BURGER ]: { color: at( 'rgb(0, 0, 0)' ) } } } ), ...more } } );

test( 'MUST FAIL: a bar is not held by its button\'s hover when the button\'s hover write did not land', () => {
	assert.deepEqual( followed( follow( { cal: followCal(), taken: new Map() } ) ), [] );
	assert.deepEqual( followed( follow( { cal: followCal(), taken: new Map( [ [ 'burgerColour', 'surface' ] ] ) } ) ), [], 'a resting write is not the hover look' );
} );

test( 'MUST FAIL: a bar that paints its own hover rule is not held by its button\'s hover', () => {
	const own = { barColourHover: setting( 'color', { state: 'hover', slot: bar( 1 ), slots: [ bar( 1 ) ], look: { [ bar( 1 ) ]: { color: at( 'rgb(0, 0, 0)' ) } } } ) };
	assert.deepEqual( followed( follow( { cal: followCal( own ), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ) ), [] );
	const effect = { burgerBgHover: setting( 'background-color', { state: 'hover', slot: '.sgs-nav-bar-menu__panel', slots: [ '.sgs-nav-bar-menu__panel' ], effects: [ `${ bar( 1 ) }|color` ] } ) };
	assert.deepEqual( followed( follow( { cal: followCal( effect ), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ) ), [], 'a side effect of another element\'s rule is the bar\'s own change' );
	// Negative control: the nav root's hover colour reaching the bar (calibrated with no burger colour) comes through the button.
	const rootRule = { navColourHover: setting( 'color', { state: 'hover', slot: '', slots: [ '' ], effects: [ `${ bar( 1 ) }|background-color`, `${ bar( 1 ) }|color` ] } ) };
	assert.deepEqual( followed( follow( { cal: followCal( rootRule ), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ) ), [ 'background-color', 'color' ] );
} );

test( 'negative control: the Indus burger bars\' hover colour is held by the button\'s written hover, on the real calibration', async () => {
	assert.deepEqual( followed( follow( { cal: followCal(), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ) ), [ 'background-color', 'color' ] );
	const focusRule = { barColourFocus: setting( 'color', { state: 'focus', slot: bar( 1 ), slots: [ bar( 1 ) ] } ) };
	assert.deepEqual( followed( follow( { cal: followCal( focusRule ), taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ) ), [ 'background-color', 'color' ], 'a focus rule of the bar is not a hover rule' );
	const { readFileSync } = await import( 'node:fs' );
	const real = JSON.parse( readFileSync( new URL( '../cache/nav-bar-menu.json', import.meta.url ), 'utf8' ) );
	const holds = ( taken ) => ancestorHolds( { cal: real, state: 'hover', slot: bar( 1 ), prop: 'color', ancestor: burger, aprop: 'color', taken } );
	assert.equal( holds( new Map( [ [ 'burgerColourHover', 'surface' ] ] ) ), true );
	assert.equal( holds( new Map( [ [ 'burgerHoverColour', 'primary' ] ] ) ), false, 'the ground\'s hover write does not hold the colour' );
	assert.equal( ancestorHolds( { cal: real, state: 'hover', slot: bar( 1 ), prop: 'background-color', ancestor: burger, aprop: 'color', taken: new Map( [ [ 'burgerColourHover', 'surface' ] ] ) } ), true );
} );
