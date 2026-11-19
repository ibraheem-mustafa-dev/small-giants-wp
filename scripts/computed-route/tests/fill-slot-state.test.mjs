// A path the block's fixture renders in a state at rest is read in that state first (lib/fill-resolve-element.mjs::
// fillElement, target.state from the node's draftSlotStates, lib/skeleton-child-slots.mjs::unitSlots). Real case: Mama's
// Contact FAQ, whose open row has a hard 4px offset shadow. The accordion reads the open unit's row at its calibrated open
// child, where the closed shadow (itemShadow, calibrated on both children) and the open shadow (itemShadowOpen, calibrated
// in the open state on the open child) both paint; read at rest, the shadow went to itemShadow and every closed row took it.
// Run against the real framework DB and the real resolver, with a synthetic calibration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const OPEN = '.sgs-container:nth-of-type(1)';
const CLOSED = '.sgs-container:nth-of-type(2)';
const HEADER = `${ OPEN } > .sgs-accordion-item__header`;
const paint = ( styles ) => Object.fromEntries( THREE.map( ( w ) => [ w, { display: 'block', ...styles } ] ) );
const at = ( slots, property, state = null, forms = [], transform = null ) => ( { slot: slots[ 0 ], slots, property, state, forms, transform, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const MARK = Object.fromEntries( THREE.map( ( w ) => [ w, 'rgb(232, 106, 117) 0px 4px 12px 0px' ] ) );
const CAL = {
	block: 'sgs/accordion',
	elements: { '': paint( {} ), [ OPEN ]: paint( { 'box-shadow': 'none', 'background-color': 'rgba(0, 0, 0, 0)', color: 'rgb(0, 0, 0)' } ), [ HEADER ]: paint( { color: 'rgb(0, 0, 0)' } ), [ CLOSED ]: paint( { 'box-shadow': 'none' } ) },
	settings: {
		itemShadow: at( [ OPEN, CLOSED ], 'box-shadow' ),
		itemShadowColour: at( [ OPEN, CLOSED ], 'box-shadow', null, [ 'hex', 'slug' ], MARK ),
		itemShadowOpen: at( [ OPEN ], 'box-shadow', 'open' ),
		itemShadowOpenColour: at( [ OPEN ], 'box-shadow', 'open', [ 'hex', 'slug' ], MARK ),
		itemBackgroundOpen: at( [ OPEN ], 'background-color', null, [ 'hex', 'slug' ] ),
		// The open header colour paints the header and only reaches the row; the resting header colour is (synthetically)
		// calibrated on the row itself, as a category line's own colour is on the line.
		headerColourOpen: { ...at( [ HEADER ], 'color', 'open', [ 'hex', 'slug' ] ), reaches: [ HEADER, OPEN ] },
		headerColour: at( [ OPEN ], 'color', null, [ 'hex', 'slug' ] ),
	},
	discovered: {},
};
const snap = ( styles ) => ( { styles: { display: 'block', ...styles }, pseudo: {}, rect: { x: 0, y: 0, w: 470, h: 77 }, inFlow: true, words: '', href: null, layoutChildren: 2 } );

function run( { stated = true } = {} ) {
	const skeleton = [ { name: 'sgs/accordion', draftRef: 'acc', draftSlots: { [ OPEN ]: 'open-row' }, ...( stated ? { draftSlotStates: { [ OPEN ]: 'open' } } : {} ), attributes: {}, innerBlocks: [] } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'ss' );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, {
		'0:': snap( {} ),
		[ `0:${ OPEN }` ]: snap( { 'box-shadow': 'rgb(58, 42, 34) 4px 4px 0px 0px', 'background-color': 'rgb(252, 235, 190)', color: 'rgb(142, 52, 68)' } ),
	} ] ) );
	const reads = { widths, declared: Object.fromEntries( Object.keys( widths ).map( ( w ) => [ w, {} ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { attrs: tree[ 0 ].attributes, out };
}

test( 'MUST FAIL WITHOUT THE STATE READ: the open row\'s shadow is the open shadow, and the closed shadow stays empty', () => {
	const { attrs } = run();
	assert.ok( attrs.itemShadowOpen, `the open shadow is written (attributes: ${ JSON.stringify( attrs ) })` );
	assert.equal( attrs.itemShadow, undefined, 'the closed rows take no shadow from the open row' );
} );

test( 'a property no setting of the state paints there falls back to the resting settings: the open fill is still written', () => {
	const { attrs } = run();
	assert.ok( attrs.itemBackgroundOpen, 'itemBackgroundOpen (calibrated with no state on the open child) takes the open row\'s fill' );
} );

test( 'negative control: with no slot state the row is read at rest, as before (the shadow goes to the closed setting)', () => {
	const { attrs } = run( { stated: false } );
	assert.equal( attrs.itemShadowOpen, undefined );
	assert.ok( attrs.itemShadow, 'read at rest, the resting shadow setting takes it' );
} );

test( 'MUST FAIL WITHOUT THE OWN-SLOT TEST: an open-state setting that only reaches the path never takes the read; the resting setting on the path does', () => {
	const { attrs, out } = run();
	assert.ok( attrs.headerColour, `the setting calibrated on the path takes its colour (attributes: ${ JSON.stringify( attrs ) })` );
	assert.equal( attrs.headerColourOpen, undefined );
	assert.ok( ! out.unmapped.some( ( u ) => 'color' === u.property && /^reach-only/.test( String( u.reason ) ) ), 'no reach-only row for the colour' );
} );
