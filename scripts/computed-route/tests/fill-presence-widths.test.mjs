// A part a block shows or hides is present when the draft draws it at any read width (lib/fill-resolve.mjs, the presence
// evidence): the Indus burger is drawn only below the nav's collapse point, and judged at 1440 alone it read as absent, so
// Fill switched the burger off (showBurger false) and it vanished on tablets and phones. Built through fillTree with the
// real framework DB; the calibration's presence key is the nav's real one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const WRAP = '.sgs-nav-bar-menu__toggle-wrap';
const CAL = { block: 'sgs/nav-bar-menu', elements: {}, settings: {}, discovered: {}, presence: { showBurger: { shows: [], hides: [ WRAP ] } } };
const box = { styles: { display: 'flex' }, pseudo: {}, rect: { x: 0, y: 0, w: 48, h: 48 }, inFlow: true, words: '', href: null };

function run( burgerAt ) {
	const skeleton = [ { name: 'sgs/nav-bar-menu', draftRef: '.nav', draftSlots: { [ WRAP ]: '.burger' }, attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const nodes = skeletonNodes( skeleton );
	const wrapId = nodes[ 0 ].targets.find( ( t ) => WRAP === t.slot ).id;
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, { '0:': box, [ wrapId ]: burgerAt.includes( w ) ? box : { missing: true } } ] ) );
	fillTree( { tree, nodes, reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return tree[ 0 ].attributes;
}

test( 'MUST FAIL: a burger drawn only below the collapse point keeps the burger on', () => {
	assert.notEqual( run( [ 375, 768 ] ).showBurger, false, 'drawn on phones and tablets is present' );
} );

test( 'MUST FAIL: a burger the draft never draws at any width is switched off', () => {
	assert.equal( run( [] ).showBurger, false );
} );
