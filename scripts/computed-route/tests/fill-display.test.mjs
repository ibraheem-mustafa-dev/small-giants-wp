// A declared display on a flex or grid element (FR-48-42): routed to the block's layout setting when calibration shows a
// setting painting that display, nothing written when it is the setting's default, a named gap when no layout setting
// holds it. A yes/no visibility toggle tied to display holds none, never a flex or a grid. Run through fillTree on the
// real framework DB, with a calibration shaped like sgs/site-header-row's (hide toggles at the root, a layout enum
// discovered on the inner element).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const BASE = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'background-color': 'rgba(0, 0, 0, 0)' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const toggle = ( at ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property: 'display', state: null, forms: [], transform: null, reachedAt: at, effects: [], variants: [ 0 ] } );
const INNER = '.sgs-container__inner';

function calibration( innerDisplay ) {
	return {
		block: 'sgs/site-header-row',
		elements: { '': tiers( { ...BASE, display: 'block' } ), [ INNER ]: tiers( { ...BASE, display: innerDisplay } ) },
		settings: { sgsHideOnDesktop: toggle( [ 1440 ] ), sgsHideOnTablet: toggle( [ 768 ] ), sgsHideOnMobile: toggle( [ 375 ] ) },
		discovered: { layout: { display: { slots: [ INNER ], state: null, tier: 'flat', values: { grid: Object.fromEntries( THREE.map( ( w ) => [ w, 'grid' ] ) ) } } } },
	};
}

// One site-header-row whose code lays out as `display` at every width.
function fillDisplay( display, cal = calibration( 'flex' ), block = 'sgs/site-header-row' ) {
	const skeleton = [ { name: block, draftRef: 'main', attributes: {} } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'dp' );
	const snap = { styles: { ...BASE, display }, pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 80 }, inFlow: true, words: '', href: null };
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': snap } ] ) );
	const reads = { widths, declared: Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': { display } } ] ) ), sweep: {}, origin: 'http://127.0.0.1:1' };
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => ( b === block ? cal : null ), ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
	return { tree, ...out, display: out.unmapped.filter( ( u ) => 'display' === u.property ), writes: out.writes.filter( ( w ) => 'display' === w.prop ) };
}

test( 'MUST FAIL: display:grid on a flex-default row writes the layout setting, never a hide toggle, with no shape error', () => {
	const r = fillDisplay( 'grid' );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.slot ] ), [ [ 'layout', INNER ] ] );
	assert.equal( r.tree[ 0 ].attributes.layout, 'grid' );
	assert.equal( r.tree[ 0 ].attributes.sgsHideOnDesktop, undefined );
	assert.equal( r.display.length, 0, JSON.stringify( r.display ) );
} );

test( 'MUST FAIL: display:flex where the layout setting already paints flex writes nothing and reports nothing', () => {
	const r = fillDisplay( 'flex' );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.tree[ 0 ].attributes.layout, undefined );
	assert.equal( r.display.length, 0, JSON.stringify( r.display ) );
} );

test( 'MUST FAIL: display:flex with no layout setting that paints it is a named gap, not "cannot be held"', () => {
	const cal = calibration( 'grid' );
	cal.discovered = {};
	const r = fillDisplay( 'flex', cal );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.display.length, 1 );
	assert.match( r.display[ 0 ].reason, /no layout setting holds display:flex/ );
	assert.doesNotMatch( r.display[ 0 ].reason, /cannot be held/ );
} );

test( 'a block with no display setting at all names the same gap', () => {
	const cal = { block: 'sgs/text', elements: { '': tiers( BASE ) }, settings: {}, discovered: {} };
	const r = fillDisplay( 'flex', cal, 'sgs/text' );
	assert.equal( r.display.length, 1 );
	assert.match( r.display[ 0 ].reason, /no layout setting holds display:flex/ );
} );

test( 'display:block on an element whose default display is block is equal, not an error', () => {
	const r = fillDisplay( 'block' );
	assert.equal( r.writes.length, 0 );
	assert.equal( r.display.length, 0, JSON.stringify( r.display ) );
} );

test( 'a visibility toggle stays a candidate for display:none only', () => {
	const cal = calibration( 'flex' );
	const input = ( v ) => ( { block: 'sgs/site-header-row', slot: '', prop: 'display', perWidth: { 1440: v }, fontPx: {}, current: {}, siblings: {} } );
	const ctx = { db, calibration: cal, snapshot: null, log: [] };
	assert.equal( resolve( input( 'flex' ), ctx ).gap, 'no-setting' );
	assert.notEqual( resolve( input( 'none' ), ctx ).gap, 'no-setting', 'none is still tied to the hide toggle' );
} );
