// The width ladder's tier-shaped rung (lib/fill-width-ladder.mjs, Spec 48 FR-48-52) writes a box setting (padding, margin,
// border width) as { top, right, bottom, left } per device, never as a flat string per device: the four side rows of one
// setting compose by deep merge, and a setting a box cannot be built for is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { widthLadderWrites } from '../lib/fill-width-ladder.mjs';
import { boxTierValue, isBoxRow, calibratedPaint } from '../lib/box-tier.mjs';
import { ONE_VALUE_EVERY_WIDTH } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/pad', title: 'Pad', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/pad', attr_name: 'padding', attr_type: 'object', css_property: 'padding', css_element: 'wrapper', tier_shape: 'tier_object', box_family: 'padding', is_responsive: 1, role: 'spacing' },
		{ block_slug: 'sgs/pad', attr_name: 'borderWidth', attr_type: 'object', css_property: 'border-width', css_element: 'wrapper', tier_shape: 'tier_object', box_family: 'borderWidth', is_responsive: 1, role: 'border' },
		{ block_slug: 'sgs/pad', attr_name: 'radius', attr_type: 'object', css_property: 'border-radius', css_element: 'wrapper', tier_shape: 'tier_object', box_family: 'borderRadius', is_responsive: 1, role: 'border' },
		{ block_slug: 'sgs/pad', attr_name: 'justify', attr_type: 'object', css_property: 'justify-content', css_element: 'wrapper', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
	],
} ) );

function world( block = 'sgs/pad' ) {
	const flat = [ { name: block, attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: block, parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 300, h: 40 }, layoutDisplay: 'flex', styles: { display: 'flex' } } } ] ) );
	return { flat, nodes, reads: { widths, sweep: {} }, refOf: ( n ) => n.ref };
}
const rowOf = ( property, byWidth ) => ( { node: 'n0', block: 'sgs/pad', slot: '', property, value: JSON.stringify( byWidth ), code: ONE_VALUE_EVERY_WIDTH, reason: 'shape: x' } );
const run = ( w, rows, cal ) => widthLadderWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db, unmapped: rows, calFor: () => cal, scope: 'header', resolver: () => ( { status: 'gap', gap: 'shape', detail: 'x' } ), date: '2026-10-28' } );
const cal = ( ...attrs ) => ( { settings: Object.fromEntries( attrs.map( ( a ) => [ a, { slot: '' } ] ) ), elements: {} } );

test( 'MUST FAIL WITHOUT THE BOX BUILDER: four side rows of one padding setting that vary by width compose into per-device sides', () => {
	const w = world();
	const r = run( w, [
		rowOf( 'padding-top', { 375: '40px', 768: '52px', 1440: '64px' } ),
		rowOf( 'padding-right', { 375: '20px', 768: '32px', 1440: '40px' } ),
		rowOf( 'padding-bottom', { 375: '40px', 768: '52px', 1440: '64px' } ),
		rowOf( 'padding-left', { 375: '20px', 768: '32px', 1440: '40px' } ),
	], cal( 'padding' ) );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.padding, {
		desktop: { top: '64px', right: '40px', bottom: '64px', left: '40px' },
		tablet: { top: '52px', right: '32px', bottom: '52px', left: '32px' },
		mobile: { top: '40px', right: '20px', bottom: '40px', left: '20px' },
	} );
	assert.equal( w.flat[ 0 ].attributes.sgsCustomCss, undefined );
} );

test( 'no string tier ever lands in a box setting: every tier of a write is an object of sides', () => {
	const w = world();
	const r = run( w, [ rowOf( 'padding-top', { 375: '40px', 768: '52px', 1440: '64px' } ) ], cal( 'padding' ) );
	assert.ok( r.answered.length > 0 );
	assert.ok( Object.values( w.flat[ 0 ].attributes.padding ).every( ( t ) => 'object' === typeof t ) );
	assert.deepEqual( w.flat[ 0 ].attributes.padding.mobile, { top: '40px' } );
} );

test( 'a border-width side row seeds the unset sides from the calibrated paint, as the resolver does', () => {
	const w = world();
	const paint = { 'border-top-width': '1px', 'border-right-width': '2px', 'border-bottom-width': '3px', 'border-left-width': '4px' };
	const c = { settings: { borderWidth: { slot: '' } }, elements: { '': { 375: paint, 768: paint, 1440: paint } } };
	run( w, [ rowOf( 'border-top-width', { 375: '1px', 768: '5px', 1440: '8px' } ) ], c );
	assert.deepEqual( w.flat[ 0 ].attributes.borderWidth.desktop, { right: '2px', bottom: '3px', left: '4px', top: '8px' } );
	assert.deepEqual( w.flat[ 0 ].attributes.borderWidth.tablet, { right: '2px', bottom: '3px', left: '4px', top: '5px' } );
} );

test( 'a border width the node already holds is not reseeded by a later side row', () => {
	const w = world();
	w.flat[ 0 ].attributes.borderWidth = { desktop: { right: '9px' } };
	const paint = { 'border-top-width': '1px', 'border-right-width': '2px', 'border-bottom-width': '3px', 'border-left-width': '4px' };
	run( w, [ rowOf( 'border-top-width', { 375: '1px', 768: '5px', 1440: '8px' } ) ], { settings: { borderWidth: { slot: '' } }, elements: { '': { 375: paint, 768: paint, 1440: paint } } } );
	assert.deepEqual( w.flat[ 0 ].attributes.borderWidth.desktop, { right: '9px', top: '8px' } );
	assert.deepEqual( w.flat[ 0 ].attributes.borderWidth.tablet, { right: '2px', bottom: '3px', left: '4px', top: '5px' } );
} );

test( 'a padding side row seeds nothing', () => {
	const w = world();
	run( w, [ rowOf( 'padding-top', { 375: '1px', 768: '5px', 1440: '8px' } ) ], { settings: { padding: { slot: '' } }, elements: { '': { 1440: { 'padding-right': '9px' } } } } );
	assert.deepEqual( w.flat[ 0 ].attributes.padding.desktop, { top: '8px' } );
} );

test( 'a non-box tier-object setting still writes a flat value per device', () => {
	const w = world();
	run( w, [ rowOf( 'justify-content', { 375: 'center', 768: 'flex-start', 1440: 'flex-start' } ) ], cal( 'justify' ) );
	assert.deepEqual( w.flat[ 0 ].attributes.justify, { desktop: 'flex-start', mobile: 'center' } );
} );

test( 'a corner of a box border-radius setting is skipped, never written as a string', () => {
	const w = world();
	run( w, [ rowOf( 'border-top-left-radius', { 375: '2px', 768: '4px', 1440: '8px' } ) ], cal( 'radius' ) );
	assert.equal( w.flat[ 0 ].attributes.radius, undefined );
} );

test( 'boxTierValue: several shorthand values, a corner and a radius build no box; one shorthand value fills four sides; a non-box passes through', () => {
	const box = { tier_shape: 'tier_object', box_family: 'padding' };
	assert.equal( boxTierValue( { row: box, short: 'padding', side: null, value: '8px 4px' } ), null );
	assert.equal( boxTierValue( { row: box, short: 'border-radius', side: null, corner: 'topLeft', value: '8px' } ), null );
	assert.deepEqual( boxTierValue( { row: box, short: 'padding', side: null, value: '8px' } ), { top: '8px', right: '8px', bottom: '8px', left: '8px' } );
	assert.equal( boxTierValue( { row: { tier_shape: 'tier_object' }, short: 'gap', side: null, value: '8px' } ), '8px' );
	assert.equal( isBoxRow( { tier_shape: 'box_only' } ), true );
	assert.equal( isBoxRow( { tier_shape: 'tier_object' } ), false );
	assert.deepEqual( calibratedPaint( { calibration: { elements: { a: { 375: { x: 1 } } } }, slot: 'a', tier: 'mobile' } ), { x: 1 } );
	const loose = ( p ) => p.replace( /:nth-of-type\(\d+\)/g, '' );
	assert.deepEqual( calibratedPaint( { calibration: { elements: { 'a:nth-of-type(2)': { 1440: { y: 2 } } } }, slot: 'a', tier: 'desktop', loose } ), { y: 2 } );
} );
