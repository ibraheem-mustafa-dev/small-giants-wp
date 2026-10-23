// A node's content (presence, words, links, icon, image) is read where the node is drawn: lib/fill-resolve.mjs::contentWidth
// takes 1440 when the node renders there, else the widest read width it renders at, so an element shown only on phones (a
// width variant hidden from 768, the "Call" pill) keeps its link and icon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { contentWidth } from '../lib/fill-resolve.mjs';

const drawn = { rect: { x: 0, y: 0, w: 75, h: 34 }, inFlow: true, styles: {} };
const state = ( shown ) => ( { reads: { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': shown.includes( w ) ? drawn : { missing: true }, '0:.icon': drawn } ] ) ) } } );
const rec = { targets: [ { id: '0:.icon', slot: '.icon' }, { id: '0:', slot: '' } ] };

test( 'MUST FAIL: content is read at 1440 where the node is drawn there', () => {
	assert.equal( contentWidth( state( [ 375, 768, 1440 ] ), rec ), 1440 );
} );

test( 'MUST FAIL: a node drawn only on phones is read at 375, one drawn up to tablet at 768', () => {
	assert.equal( contentWidth( state( [ 375 ] ), rec ), 375, 'the Call pill keeps its link and icon' );
	assert.equal( contentWidth( state( [ 375, 768 ] ), rec ), 768, 'the widest width it is drawn at' );
} );

test( 'MUST FAIL: the root decides, not a part that happens to be read', () => {
	assert.equal( contentWidth( state( [ 768 ] ), rec ), 768, 'the drawn icon part at 1440 does not make the node drawn there' );
	assert.equal( contentWidth( state( [] ), rec ), 1440, 'a node drawn nowhere falls back to 1440, as before' );
} );
