// Fill writes the focus and open settings (plan decisions 1 and 6 of 2026-10-24) against the real framework DB with planted
// calibration: the ring's style and ringOnly in the snapshot patch, sgsFocusRests where a hover look shares focus, and a
// nav item's open look through itemBgOpen and itemColourOpen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { openSlots } from '../lib/fill-state-script.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const WIDTHS = [ 375, 768, 1440 ];
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: WIDTHS, effects: [], variants: [ 0 ], ...extra } );
const look = ( states, declared, extra = {} ) => ( { states, declared, rendered: declared, ...extra } );
const perWidth = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) );
// targets: [{ id, slot, looks, snap }]
const run = ( block, cal, targets ) => fillStates( {
	tree: [ { name: block, attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ],
	nodes: [ { index: 0, name: block, targets: targets.map( ( t ) => ( { id: t.id, slot: t.slot ?? '' } ) ) } ],
	reads: {
		states: perWidth( { looks: Object.fromEntries( targets.map( ( t ) => [ t.id, t.looks || [] ] ) ) } ),
		widths: perWidth( Object.fromEntries( targets.map( ( t ) => [ t.id, t.snap || {} ] ) ) ),
	},
	calFor: () => cal, db, snapshot,
} );
const focusOf = ( r ) => r.patch.settings?.custom?.focus || {};
const plainCal = { elements: { '': {} }, settings: { textColour: setting( 'color' ) } };

test( 'MUST FAIL: the browser\'s own ring writes focus.style auto and ringOnly 1, and raises no style row', () => {
	const r = run( 'sgs/text', plainCal, [ { id: 't', snap: { tag: 'button', styles: { 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 2px 6px 0px' } } } ] );
	assert.equal( focusOf( r ).style, 'auto' );
	assert.equal( focusOf( r ).ringOnly, '1', 'the browser draws no hairline or glow, whatever the element rests with' );
	assert.equal( focusOf( r ).bloom, '0' );
	assert.deepEqual( r.unmapped.filter( ( u ) => 'focus' === u.state ), [] );
} );

test( 'MUST FAIL: a declared dashed ring with its own glow writes style dashed and ringOnly 0', () => {
	const r = run( 'sgs/text', plainCal, [ { id: 't', snap: { tag: 'a', href: '/x', styles: { 'box-shadow': 'none' } }, looks: [ look( [ 'focus' ], { 'outline-style': 'dashed', 'outline-width': '2px', 'outline-color': 'rgb(10, 20, 30)', 'box-shadow': 'rgba(10, 20, 30, 0.4) 0px 0px 8px 2px' } ) ] } ] );
	assert.deepEqual( [ focusOf( r ).style, focusOf( r ).ringOnly, focusOf( r ).bloom ], [ 'dashed', '0', '1' ] );
	assert.ok( ! r.unmapped.some( ( u ) => /^outline-style:/.test( u.reason ) ), 'the style is written, not raised' );
} );

test( 'MUST FAIL: a declared focus shadow equal to the resting one draws the ring only, with no glow tokens from it', () => {
	const rest = 'rgba(0, 0, 0, 0.5) 0px 0px 0px 2px';
	const r = run( 'sgs/text', plainCal, [ { id: 't', snap: { tag: 'a', href: '/x', styles: { 'box-shadow': rest } }, looks: [ look( [ 'focus' ], { 'outline-width': '3px', 'outline-color': 'rgb(10, 20, 30)', 'box-shadow': `  ${ rest }` } ) ] } ] );
	assert.deepEqual( [ focusOf( r ).ringOnly, focusOf( r ).bloom, focusOf( r ).style ], [ '1', '0', undefined ] );
	assert.ok( ! r.unmapped.some( ( u ) => /^box-shadow/.test( u.reason ) ), 'the resting hard shadow is not a focus layer' );
} );

test( 'MUST FAIL: two declared focus looks that differ on ringOnly conflict, the first kept', () => {
	const r = run( 'sgs/text', plainCal, [
		{ id: 'a', snap: { tag: 'button', styles: {} }, looks: [ look( [ 'focus' ], { 'outline-width': '1px', 'outline-color': 'rgb(16, 16, 16)' } ) ] },
		{ id: 'b', snap: { tag: 'a', href: '/x', styles: {} }, looks: [ look( [ 'focus' ], { 'outline-width': '1px', 'outline-color': 'rgb(16, 16, 16)', 'box-shadow': 'rgb(1, 2, 3) 0px 0px 6px 0px' } ) ] },
	] );
	assert.equal( focusOf( r ).ringOnly, '1' );
	assert.ok( r.unmapped.some( ( u ) => 'settings.custom.focus.ringOnly' === u.property && /^conflict/.test( u.reason ) ) );
} );

const buttonCal = { elements: { '': {} }, settings: {
	colourTextHover: setting( 'color', { state: 'hover' } ), colourText: setting( 'color' ),
	colourBackgroundHover: setting( 'background-color', { state: 'hover' } ), colourBackground: setting( 'background-color' ),
} };
const BUTTON = { tag: 'a', href: '/x', styles: { color: 'rgb(1, 2, 3)', 'background-color': 'rgb(9, 9, 9)' } };

test( 'MUST FAIL: hover looks that share focus write sgsFocusRests true once per node and drop every focus-shares-hover row', () => {
	const r = run( 'sgs/button', buttonCal, [ { id: 't', snap: BUTTON, looks: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)', 'background-color': 'rgb(0, 0, 200)' } ) ] } ] );
	const rests = r.writes.filter( ( w ) => 'sgsFocusRests' === w.attr );
	assert.equal( rests.length, 1 );
	assert.deepEqual( [ rests[ 0 ].after, rests[ 0 ].before, rests[ 0 ].prop ], [ true, null, 'color, background-color' ] );
	assert.ok( ! r.unmapped.some( ( u ) => /focus-shares-hover/.test( u.reason ) ) );
} );

test( 'MUST FAIL: a draft focus look equal to hover writes nothing, and blocks sgsFocusRests for another property on the node', () => {
	const same = run( 'sgs/button', buttonCal, [ { id: 't', snap: BUTTON, looks: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ), look( [ 'focus' ], { color: 'rgb(200, 0, 0)' } ) ] } ] );
	assert.ok( ! same.writes.some( ( w ) => 'sgsFocusRests' === w.attr ), 'the default already paints hover on focus' );
	assert.ok( ! same.unmapped.some( ( u ) => /focus-shares-hover/.test( u.reason ) ) );
	const mixed = run( 'sgs/button', buttonCal, [ { id: 't', snap: BUTTON, looks: [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)', 'background-color': 'rgb(0, 0, 200)' } ), look( [ 'focus' ], { color: 'rgb(200, 0, 0)' } ) ] } ] );
	assert.ok( ! mixed.writes.some( ( w ) => 'sgsFocusRests' === w.attr ) );
	const row = mixed.unmapped.find( ( u ) => /^focus-shares-hover/.test( u.reason ) );
	assert.equal( row?.property, 'background-color' );
	assert.match( row.reason, /not separated: sgsFocusRests would also cancel the draft's focus look that equals its hover color/ );
} );

const NAV = '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item';
const PANEL_LINK = `${ NAV }:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link`;
const PLAIN_LINK = `${ NAV }:nth-of-type(3) > .sgs-nav-bar-menu__link`;
const CARET = `${ NAV }:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__subtoggle > .sgs-nav-bar-menu__caret`;
const navCal = { elements: { [ PANEL_LINK ]: {}, [ `${ PANEL_LINK }::before` ]: {}, [ PLAIN_LINK ]: {}, [ CARET ]: {} }, settings: {
	itemColourOpen: setting( 'color', { state: 'open', slot: PANEL_LINK, slots: [ PANEL_LINK ], reaches: [ PANEL_LINK ] } ),
	itemBgOpen: setting( 'background-color', { state: 'open', slot: `${ PANEL_LINK }::before`, slots: [ `${ PANEL_LINK }::before` ], reaches: [] } ),
} };
const script = { kind: 'open-panel', events: [ 'hover' ], element: 'Root/47#1', items: [ { copy: 0, label: 'About', look: true }, { copy: 1, label: 'Home', look: false } ] };

test( 'MUST FAIL: a nav item\'s script open look writes itemBgOpen and itemColourOpen; the caret\'s open turn stays a named row', () => {
	const r = run( 'sgs/nav-bar-menu', navCal, [
		{ id: 'item', slot: PLAIN_LINK, snap: { tag: 'a', href: '/x', styles: {} }, looks: [ look( [ 'open' ], { color: 'rgb(10, 126, 168)', 'background-color': 'rgba(10, 126, 168, 0.12)' }, { read: 'script', script } ) ] },
		{ id: 'caret', slot: CARET, snap: { tag: 'span', styles: {} }, looks: [ look( [ 'open' ], { transform: 'matrix(-1, 0, 0, -1, 0, 0)' }, { read: 'script', script: { ...script, element: 'Root/50#0' } } ) ] },
	] );
	const open = r.writes.filter( ( w ) => 'open' === w.state ).map( ( w ) => [ w.attr, w.script, w.slot ] ).sort();
	assert.deepEqual( open, [ [ 'itemBgOpen', 'open-panel', PLAIN_LINK ], [ 'itemColourOpen', 'open-panel', PLAIN_LINK ] ] );
	assert.ok( ! r.unmapped.some( ( u ) => PLAIN_LINK === u.slot && 'open' === u.state ) );
	const caret = r.unmapped.filter( ( u ) => 'transform' === u.property && 'open' === u.state );
	assert.equal( caret.length, 1 );
	assert.match( caret[ 0 ].reason, /^script-look: open on Root\/50#0 \(open-panel look\): no-setting/ );
	assert.doesNotMatch( caret[ 0 ].reason, /pending/ );
} );

test( 'MUST FAIL: an open look widens only to open settings that end on the same element', () => {
	assert.deepEqual( openSlots( navCal, 'color', PLAIN_LINK, 'open' ), [ PANEL_LINK ] );
	assert.deepEqual( openSlots( navCal, 'background-color', PLAIN_LINK, 'open' ), [ `${ PANEL_LINK }::before` ], 'the item link\'s ::before layer' );
	assert.deepEqual( openSlots( { settings: { ...navCal.settings, itemColourHover: setting( 'color', { state: 'hover', slots: [ PANEL_LINK ] } ) } }, 'color', PLAIN_LINK, 'hover' ), [], 'any other state keeps its own path' );
	assert.deepEqual( openSlots( navCal, 'color', CARET, 'open' ), [], 'the caret never takes the item link\'s open setting' );
} );
