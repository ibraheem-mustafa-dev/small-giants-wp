// A content selector is the skeleton's, never a look's (Spec 48 FR-48-97): `sgs/business-info` `displayType` decides which
// Site Info row the block prints, and the skeleton writes it from the draft's words and link. Calibration also recorded the
// display each value paints, so a draft's `display: block` used to turn an email row into an address row (the Contact page's
// Email card printed nothing). `lib/fill-content-selector.mjs::contentSelectors` names such a setting by its framework
// database role and calibration's presence entries; `lib/fill-prop.mjs::resolveProperty` leaves it as decided. Run through
// fillTree on the real framework DB.
// Run: node --test tests/fill-content-selector.test.mjs
// Mutations (each must turn it red): node tools/mutate.mjs . tests/fixtures/fill-content-selector/mutations.json tests/fill-content-selector.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { contentSelectors } from '../lib/fill-content-selector.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const BASE = { display: 'inline', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const at = ( value ) => Object.fromEntries( THREE.map( ( w ) => [ w, value ] ) );
const SHOWS = { shows: [ '.sgs-business-info__link' ], hides: [] };
// Calibration of sgs/business-info as measured: each displayType value paints its own display on the block's root.
const CAL = {
	block: 'sgs/business-info',
	elements: { '': tiers( BASE ) },
	settings: {},
	discovered: { displayType: { display: { slots: [ '' ], state: null, tier: 'flat', values: { email: at( 'inline' ), address: at( 'block' ) } } } },
	presence: { 'displayType=email': SHOWS, 'displayType=address': { shows: [ '.sgs-business-info__label' ], hides: [] } },
};
const { presence, ...WITHOUT_PRESENCE } = CAL;

function fill( attributes, cal = CAL ) {
	const skeleton = [ { name: 'sgs/business-info', draftRef: 'main', attributes } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'bi' );
	// The draft prints the Email card as a block.
	const root = { styles: { ...BASE, display: 'block' }, pseudo: {}, rect: { x: 0, y: 0, w: 200, h: 24 }, inFlow: true, words: 'hello@example.com', href: null };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': root } ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { display: 'block' } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( 'sgs/business-info' === b ? cal : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}

test( 'MUST FAIL (G-7): the draft\'s display never turns the skeleton\'s email row into an address row', () => {
	const r = fill( { displayType: 'email' } );
	assert.equal( r.tree[ 0 ].attributes.displayType, 'email' );
	assert.deepEqual( r.writes.filter( ( w ) => 'displayType' === w.attr ), [] );
	assert.ok( r.unmapped.some( ( u ) => 'display' === u.property ), 'the display the draft paints is a named row, not a write' );
} );

test( 'contentSelectors names a setting by its database role and calibration\'s presence entries', () => {
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: { displayType: 'email', className: 'x' }, calibration: CAL } ), { displayType: 'email' } );
} );

test( 'negative controls: a setting calibration found no presence change for, a node holding no value, a layout enum and a block with no such setting are look settings', () => {
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: { displayType: 'email' }, calibration: WITHOUT_PRESENCE } ), {}, 'no presence entries: nothing is held' );
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: { displayType: 'email' }, calibration: { presence: { showIcon: SHOWS } } } ), {}, 'a presence entry of another setting does not hold it' );
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: {}, calibration: CAL } ), {}, 'a node the skeleton wrote no value on is not held' );
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: { hoursLayout: 'x' }, calibration: { presence: { 'hoursLayout=x': SHOWS } } } ), {}, 'an enum of another role is a look' );
	assert.deepEqual( contentSelectors( { db, block: 'sgs/business-info', attributes: { writingMode: 'vertical-rl' }, calibration: { presence: { 'writingMode=vertical-rl': SHOWS } } } ), {}, 'an enum of the same role that paints a CSS property is a look' );
	assert.deepEqual( contentSelectors( { db, block: 'sgs/not-a-block', attributes: { displayType: 'email' }, calibration: CAL } ), {} );
	assert.deepEqual( contentSelectors( { db: null, block: 'sgs/business-info', attributes: { displayType: 'email' }, calibration: CAL } ), {} );
	const free = fill( { displayType: 'email' }, WITHOUT_PRESENCE );
	assert.equal( free.tree[ 0 ].attributes.displayType, 'address', 'without the presence evidence the discovered display still answers, as before' );
} );
