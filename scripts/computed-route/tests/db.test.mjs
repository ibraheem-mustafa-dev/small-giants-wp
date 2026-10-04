// Proves R-47-2: the framework database opens read-only and the route's queries read real rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, attrsFor, candidates, siblings, attrRow } from '../lib/db.mjs';

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
