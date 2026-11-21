// Markers in a setting's own shape (lib/calibrate-markers.mjs::markersFor) for the settings calibration could build no
// marker for, so they were never measured: a per-device rotation ({ desktop: 0 }), a per-device border held whole
// ({ desktop: { width, style, colour } }), a per-device on/off switch, an angle in degrees, and a string whose row stores
// its choices where block.json lists none. Rows are the framework database's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor } from '../lib/calibrate.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { openDb, attrsFor, controlsOf } from '../lib/db.mjs';

const SNAP = { palette: [], spacing: [], fontSizes: [] };
const db = openDb();
const rowOf = ( block, attr ) => attrsFor( db, block ).find( ( r ) => r.attr_name === attr );
const markers = ( block, attr, ctx = {} ) => markersFor( rowOf( block, attr ), blockSchema( block ) || {}, SNAP, {}, ctx );

test( 'MUST FAIL (decorative-image rotation no marker): a per-device rotation gets a different number of degrees per tier', () => {
	const [ m, ...rest ] = markers( 'sgs/decorative-image', 'rotation' );
	assert.ok( m, 'a marker is built' );
	assert.deepEqual( rest, [] );
	assert.deepEqual( m.attrs, { rotation: { desktop: 37, tablet: 23, mobile: 7 } } );
	assert.equal( m.expect, null );
} );

test( 'MUST FAIL (drawer menu badgeBorder no marker): a per-device border held whole gets { width, style, colour } at each tier', () => {
	const [ m ] = markers( 'sgs/nav-drawer-menu', 'badgeBorder' );
	assert.ok( m, 'a marker is built' );
	const tiers = m.attrs.badgeBorder;
	assert.deepEqual( Object.keys( tiers ), [ 'desktop', 'tablet', 'mobile' ] );
	for ( const t of Object.values( tiers ) ) {
		assert.deepEqual( Object.keys( t ).sort(), [ 'colour', 'style', 'width' ] );
		assert.equal( t.style, 'dashed' );
		assert.equal( t.colour, '#13579b' );
	}
	assert.equal( new Set( Object.values( tiers ).map( ( t ) => t.width ) ).size, 3, 'a different width per tier, so a dead tier shows' );
} );

test( 'MUST FAIL (container scrollSideways no marker): a per-device on/off switch is switched on at every tier', () => {
	const ctx = { controls: controlsOf( db, 'sgs/container' ) };
	const [ m ] = markers( 'sgs/container', 'scrollSideways', ctx );
	assert.ok( m, 'a marker is built' );
	assert.deepEqual( m.attrs, { scrollSideways: { desktop: 'on', tablet: 'on', mobile: 'on' } } );
} );

test( 'MUST FAIL (sweepAngle no marker): an angle setting is turned a quarter from its default', () => {
	const [ m ] = markers( 'sgs/nav-drawer-menu', 'sweepAngle' );
	assert.ok( m, 'a marker is built' );
	assert.deepEqual( m.attrs, { sweepAngle: 180 } );
} );

test( 'MUST FAIL (card-grid justifyItems no marker): a string whose row stores its choices is marked with each one but the default', () => {
	const ms = markers( 'sgs/card-grid', 'justifyItems' );
	assert.deepEqual( ms.map( ( m ) => m.attrs.justifyItems ), [ 'stretch', 'start', 'center', 'end' ] );
	assert.deepEqual( ms.map( ( m ) => m.enumValue ), [ 'stretch', 'start', 'center', 'end' ] );
} );

test( 'negative control: settings that already had markers keep exactly them', () => {
	// A per-device {x, y} offset, a per-device length, a flat rotation and a colour: unchanged shapes.
	assert.deepEqual( markers( 'sgs/nav-bar-menu', 'triggerDetachOffset' )[ 0 ]?.label, rowOf( 'sgs/nav-bar-menu', 'triggerDetachOffset' ) ? 'tiers-xy' : undefined );
	const rad = markers( 'sgs/nav-drawer-menu', 'itemBadgeBorderRadius' );
	assert.deepEqual( rad.map( ( m ) => m.label ), [ 'length' ] );
	const colour = markers( 'sgs/nav-drawer-menu', 'itemBadgeColour' );
	assert.deepEqual( colour.map( ( m ) => m.label ), [ 'hex' ] );
	// A per-device transform whose tiers hold lengths, not numbers, is not taken for a rotation.
	const lengths = { attr_name: 'nudge', attr_type: 'object', css_property: 'transform', tier_shape: 'tier_object' };
	assert.deepEqual( markersFor( lengths, { nudge: { type: 'object', default: { desktop: '4px' } } }, SNAP ), [] );
	// A stored empty choice and the default are never markers.
	const choice = { attr_name: 'x', attr_type: 'string', css_property: 'justify-items', enum_values: '["", "start", "end"]' };
	assert.deepEqual( markersFor( choice, { x: { type: 'string', default: 'start' } }, SNAP ).map( ( m ) => m.attrs.x ), [ 'end' ] );
	// A switch with no tri-state control recorded stays unmarked (the control is the evidence of the on/off shape).
	assert.deepEqual( markers( 'sgs/container', 'scrollSideways', { controls: {} } ), [] );
	// A string with block.json choices keeps its own enum markers (accordion justifyItems declares them).
	const acc = markers( 'sgs/accordion', 'justifyItems' );
	assert.ok( acc.every( ( m ) => m.label.startsWith( 'enum-' ) ) && acc.length > 0 );
} );
