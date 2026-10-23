// A setting the DB places on a part of a block (css_element other than wrapper) is written only from the draft element
// paired to that part (lib/fill-part-pairing.mjs). Real case: sgs/nav-bar-menu.burgerSize (css_element burger,
// calibrated at the nav root) was written "100%" from the nav root's own height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { attrsFor } from '../lib/db.mjs';
import { unpairedPart } from '../lib/fill-part-pairing.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const paint = ( styles ) => Object.fromEntries( THREE.map( ( w ) => [ w, { display: 'block', ...styles } ] ) );
const at = ( slot, property ) => ( { slot, slots: [ slot ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	block: 'sgs/nav-bar-menu',
	elements: { '': paint( { height: '0px', width: '0px' } ), [ BURGER ]: paint( { height: '40px', width: '40px', 'border-top-left-radius': '0px', 'border-top-right-radius': '0px', 'border-bottom-right-radius': '0px', 'border-bottom-left-radius': '0px' } ) },
	settings: {
		burgerSize: at( '', 'height' ),
		burgerWidth: at( '', 'width' ),
		burgerBg: at( BURGER, 'background-color' ),
		burgerBorderRadius: at( BURGER, 'border-radius' ),
		burgerColour: at( BURGER, 'color' ),
	},
	discovered: {},
};
const snap = ( styles, rect ) => ( { styles: { display: 'block', ...styles }, pseudo: {}, rect: rect || { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: '', href: null } );

function run( { root, burger } ) {
	const skeleton = [ { name: 'sgs/nav-bar-menu', draftRef: 'nav', ...( burger ? { draftSlots: { [ BURGER ]: 'button' } } : {} ), attributes: {} } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'hd' );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, { '0:': snap( root ), ...( burger ? { [ `0:${ BURGER }` ]: snap( burger ) } : {} ) } ] ) );
	const reads = { widths, declared: Object.fromEntries( Object.keys( widths ).map( ( w ) => [ w, { '0:': { height: root.height, width: root.width } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes, reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => CAL, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, out };
}

test( 'MUST FAIL: a burger setting calibrated at the nav root is not written from the nav root\'s own height or width', () => {
	const { tree, out } = run( { root: { height: '100%', width: '100%' } } );
	assert.equal( tree[ 0 ].attributes.burgerSize, undefined );
	assert.equal( tree[ 0 ].attributes.burgerWidth, undefined );
	const rows = out.unmapped.filter( ( u ) => /^unpaired-part/.test( u.reason ) );
	assert.ok( rows.some( ( u ) => 'height' === u.property ), 'the refusal is a named UNMAPPED row' );
} );

test( 'MUST FAIL: a decoy pixel value on the root is refused the same way as a percentage', () => {
	const { tree } = run( { root: { height: '64px', width: '1200px' } } );
	assert.equal( tree[ 0 ].attributes.burgerSize, undefined );
	assert.equal( tree[ 0 ].attributes.burgerWidth, undefined );
} );

test( 'MUST FAIL: every non-wrapper part setting of the nav that calibration put at the root is refused, whichever it is', () => {
	const rootAttrs = attrsFor( db, 'sgs/nav-bar-menu' ).filter( ( r ) => r.css_element && 'wrapper' !== r.css_element && '' === CAL.settings[ r.attr_name ]?.slot );
	assert.ok( rootAttrs.length >= 2 );
	const { tree } = run( { root: { height: '64px', width: '1200px' } } );
	for ( const r of rootAttrs ) {
		assert.equal( tree[ 0 ].attributes[ r.attr_name ], undefined, r.attr_name );
	}
} );

test( 'MUST FAIL: the burger\'s own element writes its colour through the existing burger settings', () => {
	const { tree } = run( { root: { height: '64px', width: '1200px' }, burger: { 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-left-radius': '50%', 'border-top-right-radius': '50%', 'border-bottom-right-radius': '50%', 'border-bottom-left-radius': '50%', color: 'rgb(255, 0, 0)' } } );
	assert.ok( undefined !== tree[ 0 ].attributes.burgerColour, 'colour lands on burgerColour' );
	assert.equal( tree[ 0 ].attributes.burgerSize, undefined, 'the root still gives no size' );
} );

test( 'a part calibration measured as the same box as the read element is paired', () => {
	const same = { ...CAL, elements: { ...CAL.elements, '': paint( { height: '40px', width: '40px' } ) } };
	const skeleton = [ { name: 'sgs/nav-bar-menu', draftRef: 'nav', attributes: {} } ];
	const nodes = skeletonNodes( skeleton );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'hd' );
	const widths = Object.fromEntries( [ 375, 768, 1024, 1440, 1920 ].map( ( w ) => [ w, { '0:': snap( { height: '52px' } ) } ] ) );
	fillTree( { tree, nodes, reads: { widths, declared: Object.fromEntries( Object.keys( widths ).map( ( w ) => [ w, { '0:': { height: '52px' } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: {}, calFor: () => same, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	assert.ok( undefined !== tree[ 0 ].attributes.burgerSize );
} );

test( 'MUST FAIL: a wrapper setting is never held to part pairing, whichever slot it is calibrated at', () => {
	const cal = { ...CAL, settings: { ...CAL.settings, navBg: at( BURGER, 'background-color' ), navColour: at( '.sgs-nav-bar-menu__bar', 'color' ), padding: at( '.sgs-nav-bar-menu__bar', 'padding' ) } };
	assert.equal( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal, attr: 'navBg', readSlot: '', prop: 'background-color', value: 'red' } ), null );
	assert.match( unpairedPart( { db, block: 'sgs/nav-bar-menu', cal, attr: 'burgerSize', readSlot: '', prop: 'height', value: '100%' } ), /^unpaired-part/ );
} );
