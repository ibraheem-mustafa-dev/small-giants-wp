// Proves R-47-2: the framework database opens read-only and the route's queries read real rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, attrsFor, candidates, siblings, attrRow, cssPropertiesOf, modifierOf, isPseudoProperty, enumSettings, PSEUDO_NAMESPACES } from '../lib/db.mjs';

const db = openDb();

test( 'reads the heading line-height setting as a tier object', () => {
	const rows = candidates( db, 'sgs/heading', 'line-height' );
	assert.equal( rows.length, 1 );
	assert.equal( rows[ 0 ].attr_name, 'lineHeight' );
	assert.equal( rows[ 0 ].tier_shape, 'tier_object' );
} );

test( 'returns block settings and extension settings, never native rows', () => {
	const rows = attrsFor( db, 'sgs/container' );
	assert.ok( rows.every( ( r ) => [ 'sgs', 'sgs-ext' ].includes( r.source ) ) );
	assert.ok( rows.some( ( r ) => 'sgs-ext' === r.source ), 'an extension setting with a css property (sgsHoverLift) is a candidate' );
} );

test( 'finds flat_sibling rows by base name', () => {
	assert.deepEqual( siblings( db, 'sgs/container', 'backgroundImageTablet' ).map( ( r ) => r.css_tier ).sort(), [ 'desktop', 'mobile', 'tablet' ] );
	assert.equal( attrRow( db, 'sgs/heading', 'margin' ).box_family, 'margin' );
} );

test( 'MUST FAIL TO WRITE: a write to the database is refused', () => {
	assert.throws( () => db.exec( 'CREATE TABLE cr_probe (a)' ), /readonly/ );
} );

// L1.2: a namespaced css_property is either a pseudo-property, whose leaf maps to a real CSS property through one
// leaf map, or a real property carrying a modifier, which keeps its exact stored string. `cssPropertiesOf` is the one
// definition both readers use (lib/db.mjs::candidates and lib/triage.mjs::settingFits), so the two cannot drift.
test( 'MUST FAIL: anim:duration is reached as animation-duration, and every unmapped pseudo leaf is unmatchable', () => {
	assert.deepEqual( PSEUDO_NAMESPACES, [ 'anim', 'fx' ] );
	assert.deepEqual( cssPropertiesOf( 'anim:duration' ), [ 'animation-duration' ] );
	assert.deepEqual( cssPropertiesOf( 'anim:easing' ), [ 'animation-timing-function' ] );
	assert.deepEqual( cssPropertiesOf( 'anim:preset' ), [ 'animation-name' ] );
	// A leaf naming no single CSS property maps to nothing, so the setting is deliberately unmatchable.
	assert.deepEqual( cssPropertiesOf( 'anim:stagger' ), [] );
	assert.deepEqual( cssPropertiesOf( 'fx:pin' ), [] );
	assert.equal( isPseudoProperty( 'fx:scrub' ), true );
	assert.equal( isPseudoProperty( 'grid-template-columns:count' ), false );
	// sgs/card-grid::sgsAnimationDuration carries css_property 'anim:duration' and is now a candidate.
	assert.deepEqual( candidates( db, 'sgs/card-grid', 'animation-duration' ).map( ( r ) => r.attr_name ), [ 'sgsAnimationDuration' ] );
	assert.deepEqual( candidates( db, 'sgs/card-grid', 'animation-timing-function' ).map( ( r ) => r.attr_name ), [ 'sgsAnimationEasing' ] );
} );

test( 'MUST FAIL TO MATCH: grid-template-columns:count keeps its stored string and never matches grid-template-columns', () => {
	assert.deepEqual( cssPropertiesOf( 'grid-template-columns:count' ), [ 'grid-template-columns:count' ] );
	assert.equal( modifierOf( 'grid-template-columns:count' ), 'grid-template-columns' );
	assert.equal( modifierOf( 'anim:duration' ), null, 'a pseudo-property is not a modifier of "anim"' );
	assert.equal( modifierOf( 'padding' ), null );
	// Every block holding the modifier row: asking for the property must not return it, asking for the exact stored
	// string must.
	const rows = db.prepare( "SELECT block_slug, attr_name FROM block_attributes WHERE css_property = 'grid-template-columns:count' AND source IN ( 'sgs', 'sgs-ext' )" ).all();
	assert.ok( rows.length >= 9, `expected the 9 count rows, found ${ rows.length }` );
	for ( const r of rows ) {
		assert.ok( ! candidates( db, r.block_slug, 'grid-template-columns' ).some( ( x ) => x.attr_name === r.attr_name ),
			`${ r.block_slug }::${ r.attr_name } holds a track count, never a grid-template-columns value` );
		assert.ok( candidates( db, r.block_slug, 'grid-template-columns:count' ).some( ( x ) => x.attr_name === r.attr_name ) );
	}
} );

// R-47-10 and the enum discovery pool: a setting with no css_property and an enum works through calibration
// discovery (lib/resolve.mjs::resolveDiscovered). ROUTING one would delete that path, which is the hazard this
// guards, and `candidates` structurally cannot return a css_property NULL row (attrsFor excludes them).
//
// This asserted the pool size EXACTLY at 633 and that broke on a legitimate reseed: 2026-10-07 it read 635 after
// peer sessions added attributes and changed `sgs/cart::countPopAnimation` from a boolean to a string enum, which
// JOINED it to the pool. An exact count conflates the two directions — a DECREASE means a discovery-pool setting
// was routed (the real defect), while an INCREASE is ordinary schema growth and happens on every reseed. So the
// floor is asserted instead, plus named members that must stay unrouted, which tests the hazard rather than the
// number. Never re-pin this to an exact count: the DB is the source of truth and a cached count in a test rots
// exactly like a cached count in a doc.
test( 'the enum discovery pool never shrinks and no candidate is ever a css_property NULL row', () => {
	const blocks = db.prepare( 'SELECT slug FROM blocks' ).all().map( ( r ) => r.slug );
	const pool = blocks.reduce( ( n, b ) => n + enumSettings( db, b ).length, 0 );
	assert.ok( pool >= 633, `the discovery pool is ${ pool }, below the 633 floor R-47-10 was written at: a setting that used to reach calibration discovery has been given a css_property, which deletes that path` );
	// Named members, so routing one is caught even if an unrelated addition keeps the total above the floor.
	for ( const [ block, attr ] of [ [ 'sgs/cart', 'displayMode' ], [ 'sgs/cart', 'triggerStyle' ], [ 'sgs/cart', 'itemRemoveStyle' ] ] ) {
		assert.ok( enumSettings( db, block ).some( ( r ) => r.attr_name === attr ),
			`${ block }::${ attr } must stay in the discovery pool (css_property NULL with an enum)` );
	}
	for ( const b of [ 'sgs/container', 'sgs/mega-group', 'sgs/card-grid', 'sgs/accordion' ] ) {
		for ( const prop of [ 'padding', 'display', 'animation-duration', 'flex-grow' ] ) {
			assert.ok( candidates( db, b, prop ).every( ( r ) => null !== r.css_property ) );
		}
	}
} );
