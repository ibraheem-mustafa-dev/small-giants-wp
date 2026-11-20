// A numeric setting with Tablet and Mobile siblings (sgs/brand-strip maxHeight, maxHeightTablet, maxHeightMobile) is
// written per device when the framework database marks the family flat_sibling and names each row's device
// (css_tier desktop, tablet, mobile): plugins/sgs-blocks/scripts/lib/object_attr_shape.py::flat_scalar_sibling_shape and
// sgs-update-v2.py::_complete_flat_family_tiers. The rows below are the live rows of that family before and after the
// seeder change (a reseed on a copy of the framework database produced the "after" shape).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const snapshot = { palette: [], spacing: [], fontSizes: [] };
const BLOCK = { slug: 'sgs/brand-strip', title: 'Brand strip', category: 'sgs', type: 'dynamic' };
const row = ( attr_name, tier_shape, css_tier ) => ( { block_slug: 'sgs/brand-strip', attr_name, attr_type: 'number', is_responsive: 1, css_property: 'min-height', css_element: 'wrapper', css_tier, tier_shape, source: 'sgs' } );
const dbWith = ( rows ) => openDb( fixtureDb( { blocks: [ BLOCK ], block_attributes: rows } ) );
const AFTER = [ row( 'maxHeight', 'flat_sibling', 'desktop' ), row( 'maxHeightTablet', 'flat_sibling', 'tablet' ), row( 'maxHeightMobile', 'flat_sibling', 'mobile' ) ];
const BEFORE = [ row( 'maxHeight', null, null ), row( 'maxHeightTablet', null, 'tablet' ), row( 'maxHeightMobile', null, 'mobile' ) ];
const BASE_UNTIERED = [ row( 'maxHeight', 'flat_sibling', null ), row( 'maxHeightTablet', 'flat_sibling', 'tablet' ), row( 'maxHeightMobile', 'flat_sibling', 'mobile' ) ];
const cal = { settings: Object.fromEntries( [ 'maxHeight', 'maxHeightTablet', 'maxHeightMobile' ].map( ( a ) => [ a, { slot: '', property: 'min-height' } ] ) ) };
const ask = ( db, perWidth ) => resolve( { block: 'sgs/brand-strip', slot: '', prop: 'min-height', perWidth }, { db, snapshot, calibration: cal } );
const DRAFT = { 375: '112px', 768: '136px', 1440: '150px' };

test( 'MUST FAIL ON TODAY\'S ROWS: a flat_sibling family with a device on every row plans a write per device', () => {
	const r = ask( dbWith( AFTER ), DRAFT );
	assert.equal( r.gap, undefined );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value, w.merge ] ).sort(), [ [ 'maxHeight', 150, 'replace' ], [ 'maxHeightMobile', 112, 'replace' ], [ 'maxHeightTablet', 136, 'replace' ] ] );
} );

test( 'the rows as the framework database holds them today give no per-device write', () => {
	const r = ask( dbWith( BEFORE ), DRAFT );
	assert.equal( r.gap, 'ambiguous', 'three unrelated settings all paint min-height, so the resolver refuses to choose' );
	assert.match( r.detail, /maxHeight, maxHeightTablet, maxHeightMobile all paint min-height/ );
	assert.equal( r.writes, undefined );
} );

test( 'NEGATIVE CONTROL: classified flat_sibling but the base names no device, so the desktop tier has no row', () => {
	const r = ask( dbWith( BASE_UNTIERED ), DRAFT );
	assert.equal( 'shape', r.gap );
	assert.match( r.detail, /no desktop sibling/ );
} );

test( 'MUST FAIL: a smaller device whose draft value equals the one it inherits is not written', () => {
	const r = ask( dbWith( AFTER ), { 375: '96px', 768: '96px', 1440: '96px' } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'maxHeight', 96 ] ] );
	const mid = ask( dbWith( AFTER ), { 375: '112px', 768: '150px', 1440: '150px' } );
	assert.deepEqual( mid.writes.map( ( w ) => [ w.attr, w.value ] ).sort(), [ [ 'maxHeight', 150 ], [ 'maxHeightMobile', 112 ] ], 'tablet inherits desktop; mobile differs from tablet' );
} );

test( 'NEGATIVE CONTROL: a sibling the node already holds is written even when its value equals the inherited one', () => {
	const r = resolve( { block: 'sgs/brand-strip', slot: '', prop: 'min-height', perWidth: { 375: '96px', 768: '96px', 1440: '96px' }, current: { maxHeightMobile: 40 } }, { db: dbWith( AFTER ), snapshot, calibration: cal } );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ).sort(), [ [ 'maxHeight', 96 ], [ 'maxHeightMobile', 96 ] ] );
} );
