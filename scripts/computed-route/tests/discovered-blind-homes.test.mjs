// A footer root's declared `overflow: hidden` reached no setting and no Custom CSS (an Indus homepage, 2026-11-19): calibration
// records every value of shapeDividerBottom and shapeDividerTop painting overflow hidden on the block root (a side effect of
// a divider being on), so the equivalence engine named fifteen values that "all paint the draft's value" and the row was
// classed as a setting's to hold (`route`), never written. The footer's decorative glow then spilled past the page (1,480px
// at 1440, 535px at 375). A value-blind record (lib/css-equivalence/effect.mjs::valueBlind) is no home and no write, so the row
// is residual and reaches the Custom CSS writer. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { measuredHomes, discoveredWrite } from '../lib/css-equivalence/effect.mjs';
import { classifyRow } from '../lib/fill-residual-css.mjs';
import { resolve } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const W = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const SHAPES = [ 'wave', 'triangle', 'curve', 'zigzag' ];
const blind = ( v ) => ( { slots: [ '' ], values: Object.fromEntries( SHAPES.map( ( s ) => [ s, every( v ) ] ) ) } );
const cal = {
	settings: {},
	elements: { '': every( { 'overflow-x': 'visible', 'overflow-y': 'visible', display: 'block' } ) },
	discovered: {
		shapeDividerBottom: { 'overflow-x': blind( 'hidden' ), 'overflow-y': blind( 'hidden' ) },
		shapeDividerTop: { 'overflow-x': blind( 'hidden' ) },
	},
};
const db = openDb( fixtureDb( { blocks: [ { slug: 'sgs/site-footer', title: 'Footer', category: 'sgs', type: 'dynamic' } ], block_attributes: [ { block_slug: 'sgs/site-footer', attr_name: 'shapeDividerBottom', attr_type: 'string', role: 'layout' } ] } ) );

test( 'MUST FAIL: a value-blind discovered property is no home and no write for the draft\'s overflow', () => {
	assert.deepEqual( measuredHomes( cal, { slot: '', prop: 'overflow-x' } ), [] );
	assert.equal( discoveredWrite( cal, { slot: '', prop: 'overflow-x', perWidth: every( 'hidden' ) } ), null );
} );

test( 'MUST FAIL: the resolver leaves the root\'s overflow as no-setting, and that row is residual, so the Custom CSS writer takes it', () => {
	const r = resolve( { block: 'sgs/site-footer', slot: '', anyIndex: false, tag: null, prop: 'overflow-x', state: null, perWidth: every( 'hidden' ), fontPx: {}, current: {}, siblings: {} }, { db, snapshot: null, calibration: cal, log: [] } );
	assert.equal( r.gap, 'no-setting', `the gap was ${ r.gap }: ${ String( r.detail ).slice( 0, 120 ) }` );
	const row = { block: 'sgs/site-footer', slot: '', property: 'overflow-x', state: null, reason: `no-setting: ${ r.detail }`, values: every( 'hidden' ) };
	assert.equal( classifyRow( row, { calFor: () => cal, db } ).cls, 'residual' );
} );

test( 'negative control: a discovered property whose values differ is still a home, and still writes the value that fits', () => {
	const c = { ...cal, discovered: { layout: { display: { slots: [ '' ], values: { flex: every( 'flex' ), stack: every( 'flex' ), grid: every( 'grid' ) } } } } };
	assert.deepEqual( measuredHomes( c, { slot: '', prop: 'display' } ).map( ( h ) => [ h.attr, h.via ] ), [ [ 'layout', 'discovered' ] ] );
	assert.deepEqual( discoveredWrite( c, { slot: '', prop: 'display', perWidth: every( 'grid' ) } ), { attr: 'layout', value: 'grid', name: 'display' } );
} );

test( 'negative control: the shape dividers still answer a property only one divider value paints', () => {
	const c = { ...cal, discovered: { shapeDividerBottom: { height: { slots: [ '' ], values: { wave: every( '40px' ) } } } } };
	assert.equal( measuredHomes( c, { slot: '', prop: 'height' } ).length, 1 );
} );
