// An inherited value read on one of a block's parts is never written on a setting that only reaches that part
// (lib/fill-resolve-element.mjs::fillElement, the reach-only guard). Real case: Mama's Contact FAQ, where the accordion reads
// a closed row's header (a <button>, 13.333px by the browser's own style) at its calibrated header path, and `fontSize`, the
// accordion's root typography calibrated on its root and only reaching the header, took 13.333px for every question and answer.
// Run against the real framework DB and the real resolver, with a synthetic calibration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const HEADER = '.sgs-container:nth-of-type(2) > .sgs-accordion-item__header';
const paint = ( styles ) => Object.fromEntries( THREE.map( ( w ) => [ w, { display: 'block', ...styles } ] ) );
const at = ( slots, property, reaches, forms = [] ) => ( { slot: slots[ 0 ], slots, ...( reaches ? { reaches } : {} ), property, state: null, forms, transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	block: 'sgs/accordion',
	elements: { '': paint( { 'font-size': '16px', 'column-gap': 'normal' } ), [ HEADER ]: paint( { 'font-size': '16px', 'column-gap': '12px', color: 'rgb(0, 0, 0)' } ) },
	settings: { fontSize: at( [ '' ], 'font-size', [ '', HEADER ] ), headerGap: at( [ HEADER ], 'gap' ), headerColour: at( [ HEADER ], 'color', null, [ 'hex', 'slug' ] ) },
	discovered: {},
};
const snap = ( styles ) => ( { styles: { display: 'flex', ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null, layoutChildren: 2 } );

function run( { rootFont = '16px', slotted = true } = {} ) {
	const skeleton = [ { name: 'sgs/accordion', draftRef: 'acc', ...( slotted ? { draftSlots: { [ HEADER ]: 'head' } } : {} ), attributes: {}, innerBlocks: [] } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'ro' );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, {
		'0:': snap( { 'font-size': rootFont } ),
		...( slotted ? { [ `0:${ HEADER }` ]: snap( { 'font-size': '13.333px', 'column-gap': '16px', 'row-gap': '16px', color: 'rgb(58, 42, 34)' } ) } : {} ),
	} ] ) );
	const reads = { widths, declared: Object.fromEntries( Object.keys( widths ).map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, out };
}

test( 'MUST FAIL WITHOUT THE GUARD: a part\'s font size is not written on the root typography setting that only reaches it, and the row names the setting', () => {
	const { tree, out } = run();
	assert.equal( tree[ 0 ].attributes.fontSize, undefined, 'the header\'s 13.333px never becomes the accordion\'s font size' );
	const row = out.unmapped.find( ( u ) => HEADER === u.slot && 'font-size' === u.property );
	assert.match( row?.reason ?? '', /^reach-only: fontSize is calibrated on another element of sgs\/accordion/ );
} );

test( 'negative control: the part\'s own setting is written from it, and the root\'s own font size is still written from the root', () => {
	const { tree } = run( { rootFont: '18px' } );
	assert.ok( tree[ 0 ].attributes.headerGap, 'headerGap sits on the header itself' );
	assert.ok( tree[ 0 ].attributes.headerColour, 'an inherited value whose setting is calibrated on the part itself is written' );
	assert.ok( tree[ 0 ].attributes.fontSize, 'fontSize read on the root, its own slot' );
} );
