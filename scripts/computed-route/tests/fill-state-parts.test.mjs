// A state look on another instance of a repeated part (lib/fill-state-parts.mjs::partStateSlots, used by
// lib/fill-state.mjs::fillStates; Spec 48 FR-48-81, register row C3). Real case: Mama's navigation items hover to a pink pill
// (`style-hover="background:#F9D5D3"`) on plain links, while calibration measured `itemBgHover` on the first item (the one
// with a submenu) and the resting fill `itemBg` on the plain items: the framework DB ties both to the item `card`, so the hover
// look of a plain item is `itemBgHover`'s, and with the fill written the item radius paints (the block draws a radius only
// on a visible fill, plugins/sgs-blocks/includes/nav-menu-css.php).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { partStateSlots } from '../lib/fill-state-parts.mjs';

const db = openDb();
const BLOCK = 'sgs/nav-bar-menu';
const BAR = '.sgs-nav-bar-menu__bar';
const LINK = ( i ) => `${ BAR } > .sgs-nav-bar-menu__item:nth-of-type(${ i }) > .sgs-nav-bar-menu__link`;
const FIRST = `${ BAR } > .sgs-nav-bar-menu__item:nth-of-type(1) > .sgs-nav-bar-menu__submenu-root > .sgs-nav-bar-menu__link`;
const setting = ( property, state, slots ) => ( { slot: slots[ 0 ], slots, reaches: slots, property, state, forms: [ 'hex', 'slug' ], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
// The calibration the nav block has: the resting fill on the plain items' ::before layer (items 3 and 4 here), the hover fill on
// the first item's, the hover and resting text colour on the link itself.
const cal = () => ( {
	elements: Object.fromEntries( [ '', LINK( 3 ), LINK( 4 ), `${ LINK( 3 ) }::before`, `${ LINK( 4 ) }::before`, `${ FIRST }::before`, FIRST ].map( ( p ) => [ p, {} ] ) ),
	settings: {
		itemBg: setting( 'background-color', null, [ `${ LINK( 3 ) }::before`, `${ LINK( 4 ) }::before` ] ),
		itemBgHover: setting( 'background-color', 'hover', [ `${ FIRST }::before` ] ),
		itemColour: setting( 'color', null, [ LINK( 3 ), LINK( 4 ) ] ),
		itemColourHover: setting( 'color', 'hover', [ FIRST ] ),
		itemBgCurrent: setting( 'background-color', 'current', [ `${ LINK( 7 ) }::before` ] ),
		itemBgOpen: setting( 'background-color', 'open', [ `${ LINK( 8 ) }::before` ] ),
		navBgHover: setting( 'background-color', 'hover', [ '::after' ] ),
	},
} );

test( 'MUST FAIL: the hover fill measured on the first item is the hover fill of a plain item the resting fill paints', () => {
	assert.deepEqual( partStateSlots( { db, cal: cal(), block: BLOCK, prop: 'background-color', slot: LINK( 3 ), state: 'hover' } ), [ `${ FIRST }::before` ] );
	assert.deepEqual( partStateSlots( { db, cal: cal(), block: BLOCK, prop: 'background-color', slot: LINK( 4 ), state: 'hover' } ), [ `${ FIRST }::before` ] );
} );

test( 'MUST FAIL: a state setting the slot assigner left without a canonical slot (itemBgCurrent) is the current fill of the plain item its element paints', () => {
	const args = { db, cal: cal(), block: BLOCK, prop: 'background-color', slot: LINK( 3 ), state: 'current' };
	assert.deepEqual( partStateSlots( args ), [ `${ LINK( 7 ) }::before` ] );
	assert.deepEqual( partStateSlots( { ...args, slot: LINK( 9 ) } ), [], 'an element no resting setting paints has none' );
} );

test( 'negative control: the slots are the state setting\'s own, only for a part the resting setting paints, and only for that state, property and block', () => {
	const args = { db, cal: cal(), block: BLOCK, prop: 'background-color', slot: LINK( 3 ), state: 'hover' };
	assert.deepEqual( partStateSlots( { ...args, slot: LINK( 9 ) } ), [], 'an element no resting setting of the property paints is no part of it' );
	assert.ok( ! partStateSlots( args ).includes( '::after' ), 'a hover fill of another part (the whole nav) is not an item fill' );
	assert.deepEqual( partStateSlots( { ...args, state: 'focus' } ), [], 'a state with no setting of the part has none' );
	assert.deepEqual( partStateSlots( { ...args, prop: 'color' } ), [ FIRST ], 'the text colour of the same part is its own pair of settings' );
	assert.deepEqual( partStateSlots( { ...args, prop: 'border-top-color' } ), [], 'a property no setting of the part holds' );
	assert.deepEqual( partStateSlots( { ...args, slot: FIRST } ), [], 'the slot the state setting was measured at is not its own alternate' );
	assert.deepEqual( partStateSlots( { ...args, block: 'sgs/container' } ), [], 'another block has no such part' );
	assert.deepEqual( partStateSlots( { ...args, db: null } ), [], 'no framework DB ties nothing to a part' );
	assert.deepEqual( partStateSlots( { ...args, state: 'open' } ), [], 'a state setting of another element (itemBgOpen, the open item) is no setting of the item' );
} );

const look = ( declared ) => ( { states: [ 'hover' ], family: 'pseudo', selector: 'a:hover', tokens: [ ':hover' ], declared, rendered: declared, read: 'entered' } );
const fillOne = ( slot, declared ) => fillStates( {
	tree: [ { name: BLOCK, attributes: { className: 'cr-ref-n-0' }, innerBlocks: [] } ],
	nodes: [ { index: 0, name: BLOCK, targets: [ { id: 't', slot } ] } ],
	reads: { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { t: { styles: { 'background-color': 'rgba(0, 0, 0, 0)', color: 'rgb(58, 42, 34)' } } } ] ) ), states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { t: [ look( declared ) ] } } ] ) ) },
	calFor: () => cal(), db, snapshot: { palette: [], spacing: [], fontSizes: [] },
} );

test( 'MUST FAIL: fillStates writes a plain item\'s hover fill as itemBgHover, in the draft\'s own colour', () => {
	const r = fillOne( LINK( 3 ), { 'background-color': 'rgb(249, 213, 211)' } );
	assert.deepEqual( r.unmapped.filter( ( u ) => 'background-color' === u.property ), [] );
	const w = r.writes.filter( ( x ) => 'itemBgHover' === x.attr );
	assert.equal( w.length, 1 );
	assert.equal( w[ 0 ].state, 'hover' );
	assert.match( String( w[ 0 ].after ), /^#F9D5D3/i );
} );

test( 'negative control: an item no resting fill paints keeps its hover fill as a named gap', () => {
	const r = fillOne( LINK( 9 ), { 'background-color': 'rgb(249, 213, 211)' } );
	assert.equal( r.writes.filter( ( x ) => 'itemBgHover' === x.attr ).length, 0 );
} );

test( 'negative control: when the state setting was measured on the element itself that slot is the ordinary route, not an alternate', () => {
	const own = cal();
	own.settings.itemBgHover = setting( 'background-color', 'hover', [ `${ LINK( 3 ) }::before`, `${ FIRST }::before` ] );
	assert.deepEqual( partStateSlots( { db, cal: own, block: BLOCK, prop: 'background-color', slot: LINK( 3 ), state: 'hover' } ), [ `${ FIRST }::before` ] );
} );
