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

// A menu whose draft <nav> lays out its links itself: the block wraps each link in an item inside its bar, and the
// skeleton names only some links (one per item it needs), so the nav's laid-out children outnumber the targets.
const BAR = '.sgs-nav-bar-menu__bar';
const link = ( n ) => `${ BAR } > .sgs-nav-bar-menu__item:nth-of-type(${ n }) > .sgs-nav-bar-menu__link`;
const navCal = { settings: { gap: { slot: BAR, slots: [ BAR ], property: 'gap' }, flexWrap: { slot: BAR, slots: [ BAR ], property: 'flex-wrap' }, burgerBarAlign: { slot: ICON, slots: [ ICON ], property: 'align-items' } } };
const navTargets = [ { id: 'nav', slot: '', finder: { tpl: 'Root/45#0' } }, { id: 'l3', slot: link( 3 ), finder: { tpl: 'Root/47#1' } }, { id: 'l7', slot: link( 7 ), finder: { tpl: 'Root/47#0' } }, { id: 'burger', slot: BURGER, finder: { tpl: 'Root/59#0' } } ];
const navInventory = { elements: [ { key: 'Root/45#0', parentKey: 'Root/40#0' }, { key: 'Root/47#0', parentKey: 'Root/45#0' }, { key: 'Root/47#1', parentKey: 'Root/45#0' }, { key: 'Root/59#0', parentKey: 'Root/56#0' } ] };
const navReads = ( over = {} ) => ( { nav: { rect: { x: 300, y: 20, w: 700, h: 40 }, layoutChildren: 6 }, l3: { rect: { x: 420, y: 28, w: 90, h: 24 } }, l7: { rect: { x: 900, y: 28, w: 80, h: 24 } }, ...over } );
const navAsk = ( o = {} ) => unpairedPart( { db, block: 'sgs/nav-bar-menu', cal: navCal, attr: 'gap', readSlot: '', prop: 'column-gap', value: '2px', targets: navTargets, readAt: ( id, w ) => ( 1440 === w ? navReads()[ id ] : null ), parentOf: pairing.draftParents?.( navInventory ), ...o } );

test( 'MUST FAIL: a gap read from the draft nav that lays out its links is paired to the bar the block puts the items in', () => {
	assert.equal( navAsk(), null );
	assert.equal( pairing.draftParents?.( navInventory )?.( { tpl: 'Root/47#1' } ), 'Root/45#0' );
} );

test( 'negative control: no draft parents, a distributing property, one item, a child outside the bar or outside the box stays unpaired', () => {
	assert.match( navAsk( { parentOf: null } ) ?? '', /^unpaired-part/, 'nothing says the links are the nav\'s children' );
	assert.match( navAsk( { attr: 'flexWrap', prop: 'justify-content', value: 'space-between' } ) ?? '', /^unpaired-part/, 'justify-content spreads every child of the nav, not only the items' );
	assert.match( navAsk( { targets: navTargets.filter( ( t ) => 'l7' !== t.id ) } ) ?? '', /^unpaired-part/, 'one item shows no gap between items' );
	const burgerInNav = { elements: navInventory.elements.map( ( e ) => ( 'Root/59#0' === e.key ? { ...e, parentKey: 'Root/45#0' } : e ) ) };
	assert.match( navAsk( { parentOf: pairing.draftParents( burgerInNav ) } ) ?? '', /^unpaired-part/, 'the nav also lays out the burger, which the bar does not hold' );
	assert.match( navAsk( { readAt: ( id, w ) => ( 1440 === w ? navReads( { l7: { rect: { x: 1100, y: 28, w: 80, h: 24 } } } )[ id ] : null ) } ) ?? '', /^unpaired-part/, 'a link outside the nav\'s box' );
	const nested = { elements: navInventory.elements.map( ( e ) => ( 'Root/47#0' === e.key ? { ...e, parentKey: 'Root/46#0' } : e ) ) };
	assert.match( navAsk( { parentOf: pairing.draftParents( nested ) } ) ?? '', /^unpaired-part/, 'a link inside another element of the nav is not the nav\'s item' );
} );
