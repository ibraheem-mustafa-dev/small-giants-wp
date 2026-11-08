// A stored hover is removed only when proven a no-op; every other hover with no record found is left for review.
// Run: node --test tests/apply-stray-hover.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../lib/apply-family-state.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { strayHovers } from '../lib/apply-stray.mjs';
import { parseColour } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const rec = ( id, tpl, props ) => ( { id, element: { dc: 'D', template_tpl_id: String( tpl ) }, trigger: { type: 'hover', detail: ':hover rule (style-hover)' }, properties: props } );
// A Why Choose card: the card (231) is the one element with a hover record; its heading (235) has none.
const cardRec = rec( 'TR-052', 231, [ { property: 'color', from: 'rgb(255, 255, 255)', to: 'rgb(216, 202, 80)' } ] );
const card = { ref: 'cr-ref-home-18', tpl: 'Root/231#0', owns: [ 231 ], reach: [ 231, 235 ] };
const heading = { ref: 'cr-ref-home-21', tpl: 'Root/235#0', owns: [ 235 ], reach: [ 235 ] };
const surface = { pairs: [ card, heading ] };
const index = recordIndex( [ cardRec ], 'D' );
const navy = 'rgb(44, 62, 80)';
const read = ( color ) => ( { 1440: { styles: { color } }, 768: { styles: { color } }, 375: { styles: { color } } } );
const snapshot = { palette: [ { slug: 'text-dark', colour: parseColour( navy ) } ] };
const run = ( target, saved, block, live = read( navy ) ) => strayHovers( { target, block, saved, surface, recordsIndex: index, db, draft: read( navy ), live, snapshot } );

test( 'a text hover colour equal to the element resting colour (a slug or a hex) is removed', () => {
	for ( const stored of [ 'text-dark', '#2C3E50' ] ) {
		const [ item ] = run( heading, { textColourHover: stored }, 'sgs/heading' );
		assert.equal( item.status, 'op' );
		assert.deepEqual( item.writes, [ { attr: 'textColourHover', unset: true } ] );
	}
} );

test( 'negative controls: a different hover colour, a card shadow, a process-steps number hover and a drawer shift are kept', () => {
	assert.deepEqual( run( heading, { textColourHover: '#D8CA50' }, 'sgs/heading' ).map( ( i ) => i.status ), [ 'unchecked' ], 'a different colour is reviewed, not removed' );
	const shadow = run( heading, { shadowHover: '0 8px 20px rgba(0,0,0,.2)' }, 'sgs/container' );
	assert.deepEqual( shadow.map( ( i ) => [ i.status, /hover with no draft record found: shadowHover/.test( i.why ) ] ), [ [ 'unchecked', true ] ] );
	assert.deepEqual( run( heading, { numberColourHover: 'text-dark', numberBackgroundHover: 'primary' }, 'sgs/process-steps' ), [], 'number* hovers are never touched' );
	assert.deepEqual( run( heading, { drawerLinkTextShiftHover: 4, drawerCardHoverLift: 3 }, 'sgs/mega-panel' ), [], 'drawer* hovers are never touched' );
	// Resting colour unread, or different at one width: nothing is proven.
	assert.deepEqual( run( heading, { textColourHover: 'text-dark' }, 'sgs/heading', {} ).map( ( i ) => i.status ), [ 'unchecked' ] );
	assert.deepEqual( run( heading, { textColourHover: 'text-dark' }, 'sgs/heading', { ...read( navy ), 375: { styles: { color: 'rgb(255, 255, 255)' } } } ).map( ( i ) => i.status ), [ 'unchecked' ] );
} );

test( 'negative control: an element whose draft has a hover record keeps its hover', () => {
	assert.deepEqual( run( card, { textColourHover: 'text-dark', shadowHover: 'x' }, 'sgs/container' ), [] );
} );

test( 'the state family writes a hover look only for a property a record of the element names', () => {
	const hov = ( hover ) => ( { 1440: { styles: { color: 'rgb(255, 255, 255)' }, hover } } );
	const ctx = ( records ) => ( { target: heading, surface, block: 'sgs/heading', saved: {}, draft: hov( { color: 'rgb(216, 202, 80)' } ), live: hov( { color: 'rgb(255, 255, 255)' } ), recordsIndex: recordIndex( records, 'D' ), db, rawSnapshot: null, snapshot: null, calFor: () => null } );
	const colour = ( items ) => items.filter( ( i ) => 'color' === i.prop && 'hover' === i.state );
	const moves = rec( 'TR-own', 235, [ { property: 'transform', from: null, to: 'translateY(-2px)' } ] );
	assert.deepEqual( colour( state.decide( ctx( [ cardRec, moves ] ) ) ).map( ( i ) => i.status ), [ 'equal' ] );
	const own = rec( 'TR-own', 235, [ { property: 'color', from: 'rgb(255, 255, 255)', to: 'rgb(216, 202, 80)' } ] );
	assert.ok( ! colour( state.decide( ctx( [ cardRec, own ] ) ) ).some( ( i ) => 'equal' === i.status && /not its own/.test( i.why ) ) );
} );
