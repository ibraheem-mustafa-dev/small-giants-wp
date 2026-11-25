// Register D7 (PI-14): a draft's nav section whose item links only to its first child (Indus: Sectors -> Food service, Trade ->
// Apply for Trade Account) names that child the section's landing page, and the section's other pages sit under it, so the
// page map carries the nesting the draft's breadcrumb shows (Home / section / page). Bean's saved marks still win.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { readRouting } from '../lib/intake-routing.mjs';
import { applyMarks } from '../lib/intake-pagemap-regen.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'intake-pagemap', 'hash' );
const real = ( slug ) => path.resolve( HERE, '../../../sites', slug, 'handoff' );
const map = proposePageMap( { folder: FIX, routing: readRouting( { folder: FIX } ) } );
const parentOf = ( m, slug ) => m.rows.find( ( r ) => r.slug === slug )?.parent;

test( 'MUST FAIL: a section whose item links to its first child parents its other pages under that landing page; the landing page stays top-level', () => {
	assert.equal( parentOf( map, 'repairs' ), 'cleaning', 'Services links to Cleaning, its first child: Repairs sits under it' );
	assert.equal( parentOf( map, 'cleaning' ), null, 'the landing page is the section\'s top, not its own child' );
} );

test( 'negative control: a section with its own page keeps parenting its children, and a page in no section keeps no parent', () => {
	assert.equal( parentOf( map, 'team' ), 'about', 'About links to its own page and holds Our team' );
	assert.equal( parentOf( map, 'about' ), null );
	assert.equal( parentOf( map, 'contact' ), null );
	assert.ok( map.rows.every( ( r ) => ! r.parent || map.rows.some( ( p ) => p.slug === r.parent && p.postType === r.postType ) ), 'every parent names a row of the map' );
} );

test( 'Bean\'s saved marks win over the proposed parent: edit:parent= clears it, edit:parent=<slug> sets another', () => {
	const cleared = applyMarks( map.rows, new Map( [ [ 'page:page:repairs', 'edit:parent=' ] ] ) );
	assert.equal( cleared.rows.find( ( r ) => 'repairs' === r.slug ).parent, null );
	const moved = applyMarks( map.rows, new Map( [ [ 'page:page:repairs', 'edit:parent=about' ] ] ) );
	assert.equal( moved.rows.find( ( r ) => 'repairs' === r.slug ).parent, 'about' );
	const untouched = applyMarks( map.rows, new Map( [ [ 'page:page:team', 'edit:title=The team' ] ] ) );
	assert.equal( untouched.rows.find( ( r ) => 'repairs' === r.slug ).parent, 'cleaning' );
} );

test( 'real Indus export: the sector pages sit under Food service and the trade pages under Apply', { skip: ! fs.existsSync( real( 'indus-foods' ) ) && 'no client exports in this checkout' }, () => {
	const folder = real( 'indus-foods' );
	const indus = proposePageMap( { folder, routing: readRouting( { folder } ) } );
	assert.deepEqual( [ 'manufacturing', 'retail', 'wholesale' ].map( ( s ) => parentOf( indus, s ) ), [ 'food-service', 'food-service', 'food-service' ] );
	assert.deepEqual( [ 'catalogue', 'delivery', 'faqs', 'terms' ].map( ( s ) => parentOf( indus, s ) ), [ 'apply', 'apply', 'apply', 'apply' ] );
	assert.deepEqual( [ 'food-service', 'apply', 'brands', 'about' ].map( ( s ) => parentOf( indus, s ) ), [ null, null, null, null ] );
	assert.equal( parentOf( indus, 'our-story' ), 'about' );
} );
