// A property that places children (align-items, justify-content, gap...) read from a draft element that lays out the
// children a block's part holds is paired to that part (lib/fill-part-pairing.mjs::laysOutPart): the draft's burger button
// lays out its three bars itself, where the block puts them in the bar-stack box inside the button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import * as pairing from '../lib/fill-part-pairing.mjs';

const { unpairedPart } = pairing;

const db = openDb();
const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const bar = ( n ) => `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
const cal = { settings: {
	burgerBarAlign: { slot: ICON, slots: [ ICON ], property: 'align-items' },
	burgerIconWidth: { slot: ICON, slots: [ ICON ], property: 'width' },
	burgerIconHeight: { slot: ICON, slots: [ ICON ], property: 'height' },
}, elements: { [ BURGER ]: { 375: { 'align-items': 'center' } }, [ ICON ]: { 375: { 'align-items': 'normal' } } } };
const targets = [ { id: '16:', slot: '' }, { id: 'b', slot: BURGER }, ...[ 1, 2, 3 ].map( ( n ) => ( { id: `bar${ n }`, slot: bar( n ) } ) ) ];
const reads = ( over = {} ) => ( { b: { rect: { x: 307, y: 58, w: 48, h: 48 }, layoutChildren: 3 }, bar1: { rect: { x: 323, y: 74, w: 18, h: 2.5 } }, bar2: { rect: { x: 328, y: 81, w: 13, h: 2.5 } }, bar3: { rect: { x: 333, y: 87, w: 8, h: 2.5 } }, ...over } );
const at = ( r ) => ( id, w ) => ( 375 === w ? r[ id ] : null );
const ask = ( o = {} ) => unpairedPart( { db, block: 'sgs/nav-bar-menu', cal, attr: 'burgerBarAlign', readSlot: BURGER, prop: 'align-items', value: 'flex-end', targets, readAt: at( reads() ), ...o } );

test( 'MUST FAIL: align-items read from the draft button that lays out the bars is paired to the bar-stack box', () => {
	assert.equal( ask(), null );
} );

test( 'negative control: a box property, other children, a draft element at the part, or no reads stay unpaired', () => {
	assert.match( ask( { attr: 'burgerIconHeight', prop: 'height', value: '48px' } ) ?? '', /^unpaired-part/, 'height is the box, not its children' );
	assert.match( ask( { readAt: at( reads( { b: { rect: { x: 307, y: 58, w: 48, h: 48 }, layoutChildren: 4 } } ) ) } ) ?? '', /^unpaired-part/, 'a fourth draft child the part does not hold' );
	assert.match( ask( { readAt: at( reads( { bar3: { rect: { x: 400, y: 87, w: 8, h: 2.5 } } } ) ) } ) ?? '', /^unpaired-part/, 'a bar outside the button' );
	assert.match( ask( { targets: [ ...targets, { id: 'i', slot: ICON } ] } ) ?? '', /^unpaired-part/, 'the draft draws the part itself' );
	assert.match( ask( { readAt: () => null } ) ?? '', /^unpaired-part/, 'nothing read proves nothing' );
	assert.notEqual( pairing.laysOutPart?.( { readSlot: bar( 1 ), home: ICON, targets, readAt: at( reads() ) } ), true, 'the part is not inside a bar' );
	const deep = [ targets[ 1 ], ...[ 1, 2, 3 ].map( ( n ) => ( { id: `bar${ n }`, slot: `${ bar( n ) } > .x` } ) ) ];
	assert.match( ask( { targets: deep } ) ?? '', /^unpaired-part/, 'elements below the part\'s children are not its children' );
	assert.match( ask( { targets: targets.slice( 0, 2 ), readAt: at( reads( { b: { rect: { x: 307, y: 58, w: 48, h: 48 }, layoutChildren: 0 } } ) ) } ) ?? '', /^unpaired-part/, 'no child of the part is drawn' );
	const beside = [ { id: 'b', slot: '.sgs-nav-bar-menu__bar' }, ...targets.slice( 2 ) ];
	assert.notEqual( pairing.laysOutPart?.( { readSlot: '.sgs-nav-bar-menu__bar', home: ICON, targets: beside, readAt: at( reads() ) } ), true, 'the part is not inside the read element' );
} );
