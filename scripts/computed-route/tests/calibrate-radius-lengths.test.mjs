// Proves a per-device border-radius with no box family (the burger's burgerBorderRadius holds one CSS length per tier,
// nav-menu-trigger-css.php) is marked with a length per tier beside the corner object, so it no longer reads as dead;
// a radius with a box family keeps its corners only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor, slotFor, WIDTHS } from '../lib/calibrate.mjs';
import { blockSchema } from '../lib/resolve.mjs';

const SNAPSHOT = { palette: [], spacing: [], fontSizes: [] };
const burgerRow = { attr_name: 'burgerBorderRadius', css_property: 'border-radius', tier_shape: 'tier_object', box_family: null };
const boxRow = { attr_name: 'borderRadius', css_property: 'border-radius', tier_shape: 'tier_object', box_family: 'borderRadius' };

test( 'MUST FAIL TO BE DEAD: a box-less tier radius gets a length per tier beside the corners', () => {
	const ms = markersFor( burgerRow, blockSchema( 'sgs/nav-bar-menu' ), SNAPSHOT );
	assert.deepEqual( ms.map( ( m ) => m.label ), [ 'corners-tiers', 'tiers-radius' ] );
	const m = ms[ 1 ];
	assert.deepEqual( m.attrs.burgerBorderRadius, { desktop: '37px', tablet: '23px', mobile: '7px' } );
	assert.deepEqual( m.expect, { 375: '7px', 768: '23px', 1440: '37px' } );
} );

test( 'MUST FAIL: a radius with a box family keeps its corner marker only', () => {
	const ms = markersFor( boxRow, blockSchema( 'sgs/heading' ), SNAPSHOT );
	assert.deepEqual( ms.map( ( m ) => m.label ), [ 'corners-tiers' ] );
} );

test( 'MUST FAIL TO BE DEAD: the length marker lands where the corner marker reads as nothing', () => {
	const ms = markersFor( burgerRow, blockSchema( 'sgs/nav-bar-menu' ), SNAPSHOT );
	const BURGER = '.sgs-nav-bar-menu__burger';
	const reads = ( px ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { [ BURGER ]: { 'border-radius': px( w ) } } ] ) );
	const def = reads( () => '8px' );
	const corners = slotFor( burgerRow, ms[ 0 ], def, def );
	const lengths = slotFor( burgerRow, ms[ 1 ], def, reads( ( w ) => ms[ 1 ].expect[ w ] ) );
	assert.equal( corners.dead, true );
	assert.equal( lengths.slot, BURGER );
	assert.deepEqual( lengths.reachedAt, [ 375, 768, 1440 ] );
} );
