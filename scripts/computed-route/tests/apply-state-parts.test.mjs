// A state look held by a part of the block (an icon list's text and icons), and a pair that is only a part of the live block.
// Run: node --test tests/apply-state-parts.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { state } from '../lib/apply-family-state.mjs';
import { partOfLive } from '../lib/apply-state-scope.mjs';
import { loadSnapshot } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = loadSnapshot( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', 'sites', 'indus-foods', 'theme-snapshot.json' ) );
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const TEXT = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1) > .sgs-icon-list__text';
const ICON = '.sgs-icon-list > .sgs-icon-list__item:nth-of-type(1) > .sgs-icon-list__icon';
const setting = ( slot ) => ( { slot, slots: [ slot ], property: 'color', state: 'hover', forms: [ 'hex', 'slug' ], reachedAt: [ 375, 768, 1440 ] } );
const calibration = ( text = TEXT, icon = ICON ) => ( { elements: { '': {}, [ text ]: {}, [ icon ]: {} }, settings: { textColourHover: setting( text ), iconColourHover: setting( icon ) } } );
const read = ( styles, hover, extra = {} ) => ( { 1440: { styles, hover, ...extra } } );
const GOLD = 'rgb(216, 202, 80)';
const ctx = ( o ) => ( { target, block: 'sgs/icon-list', saved: {}, recordsIndex: new Map(), db, rawSnapshot: null, snapshot, calFor: () => calibration(), ...o } );
const colour = ( items ) => items.find( ( i ) => 'color' === i.prop && 'hover' === i.state );

test( 'a hover colour no root setting paints goes to the settings of the parts that paint it', () => {
	const item = colour( state.decide( ctx( { draft: read( {}, { color: GOLD } ), live: read( {}, { color: 'rgb(255, 255, 255)' } ) } ) ) );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes.map( ( w ) => w.attr ).sort(), [ 'iconColourHover', 'textColourHover' ] );
	assert.deepEqual( item.checks, [] );
} );

test( 'negative control: a setting calibrated on the root element is written on the root, not on parts', () => {
	const item = colour( state.decide( ctx( { calFor: () => ( { elements: { '': {} }, settings: { textColourHover: setting( '' ) } } ), draft: read( {}, { color: GOLD } ), live: read( {}, { color: 'rgb(255, 255, 255)' } ) } ) ) );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes.map( ( w ) => w.attr ), [ 'textColourHover' ] );
	assert.equal( item.checks[ 0 ].state, 'hover' );
} );

test( 'a part that already holds a different value of its own is left alone; the other part is written', () => {
	const item = colour( state.decide( ctx( { saved: { iconColourHover: 'primary' }, draft: read( {}, { color: GOLD } ), live: read( {}, { color: 'rgb(255, 255, 255)' } ) } ) ) );
	assert.deepEqual( item.writes.map( ( w ) => w.attr ), [ 'textColourHover' ] );
	const both = colour( state.decide( ctx( { saved: { iconColourHover: 'primary', textColourHover: 'primary' }, draft: read( {}, { color: GOLD } ), live: read( {}, { color: 'rgb(255, 255, 255)' } ) } ) ) );
	assert.equal( both.status, 'equal' );
	assert.match( both.why, /hold a value of their own/ );
} );

test( 'negative control: a property no setting of the block paints in the state stays a named gap', () => {
	const item = state.decide( ctx( { draft: read( {}, { 'letter-spacing': '2px' } ), live: read( {}, { 'letter-spacing': 'normal' } ) } ) ).find( ( i ) => 'letter-spacing' === i.prop );
	assert.equal( item.status, 'no-setting' );
	assert.doesNotMatch( item.why, /parts of/ );
} );

test( 'a draft element that is only a part of the live block gives no resting row, and a like-for-like pair still does', () => {
	const box = ( w ) => ( { x: 0, y: 0, w, h: 59 } );
	const held = { 'background-color': 'rgb(0, 0, 0)' };
	const draft = { styles: held, hover: held, text: 'Apply for a trade account', box: box( 259 ) };
	const rows = ( liveFacts ) => state.decide( ctx( { block: 'sgs/multi-button', draft: { 1440: draft }, live: { 1440: liveFacts } } ) ).filter( ( i ) => 'background-color' === i.prop );
	const lived = { styles: { 'background-color': 'rgba(0, 0, 0, 0)' }, hover: { 'background-color': 'rgba(0, 0, 0, 0)' } };
	const part = rows( { ...lived, text: 'Apply for a trade account Request a catalogue', box: box( 540 ) } );
	assert.equal( part[ 0 ].status, 'unpaired' );
	assert.match( part[ 0 ].why, /part of the live block/ );
	assert.equal( rows( { ...lived, text: 'Apply for a trade account', box: box( 259 ) } )[ 0 ].status, 'no-setting' );
	assert.equal( rows( { ...lived, text: 'Something else entirely here now', box: box( 540 ) } )[ 0 ].status, 'no-setting' );
} );

test( 'partOfLive: needs words and boxes on both sides', () => {
	assert.equal( partOfLive( { text: '', box: { w: 1, h: 1 } }, { text: 'a b', box: { w: 9, h: 9 } } ), null );
	assert.equal( partOfLive( { text: 'ab cd', box: { w: 1, h: 1 } }, { text: 'ab cd ef', box: null } ), null );
	assert.match( partOfLive( { text: 'ab cd', box: { w: 10, h: 10 } }, { text: 'ab cd ef', box: { w: 40, h: 10 } } ), /part of the live block/ );
} );

test( 'an underline colour on an element with no underline gives no row; with an underline it does', () => {
	const hover = ( line ) => ( { 'text-decoration-line': line, 'text-decoration-color': 'none' } );
	const rows = ( line ) => state.decide( ctx( { draft: read( {}, hover( line ) ), live: read( {}, { 'text-decoration-line': line, 'text-decoration-color': 'rgb(1, 2, 3)' } ) } ) ).filter( ( i ) => 'text-decoration-color' === i.prop );
	assert.deepEqual( rows( 'none' ), [] );
	assert.equal( rows( 'underline' ).length, 1 );
} );
