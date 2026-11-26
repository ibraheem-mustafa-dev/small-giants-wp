// RF1 (plan 2026-11-24-clone-root-fixes, Spec 48 R-47-4, FR-48-8): a setting that belongs to one variant of a block is offered only
// to a node drawn in that variant, and a setting that paints an element's cover layer holds the plain element's value. Real case:
// Mama's navigation links hover to a pink pill (`style-hover="background:#F9D5D3"` on plain links) and the route wrote it into
// `featuredBgHover`, a setting of the item an author marks featured, because the record placed it on every link.
// Rows and records are the framework database's and a checked-in real record (tests/fixtures/records), never hand-typed shapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { recordRows, compounds, readRecordFixture } from '../lib/setting-record.mjs';
import { variantOnlyOf, variantHeld, rowHoldsVariant } from '../lib/setting-variant.mjs';
import { coversSlot } from '../lib/resolve-layer.mjs';
import { resolve } from '../lib/resolve.mjs';
import { resolveProperty } from '../lib/fill-prop.mjs';
import { parseColour } from '../lib/normalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const db = openDb();
const snapshot = { palette: [ { slug: 'blush', colour: parseColour( '#F9D5D3' ) } ], spacing: [], fontSizes: [] };
const element = ( block, attr ) => db.prepare( 'SELECT css_element FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr )?.css_element;
const variantOf = ( block, attr ) => variantOnlyOf( recordRows( db, block ).rows.filter( ( r ) => attr === r.setting ), element( block, attr ), compounds );

test( 'MUST FAIL: every featured setting of both nav menus is limited to the featured variant', () => {
	for ( const block of [ 'sgs/nav-bar-menu', 'sgs/nav-drawer-menu' ] ) {
		const featured = db.prepare( "SELECT attr_name FROM block_attributes WHERE block_slug = ? AND css_element = 'featured'" ).all( block ).map( ( r ) => r.attr_name );
		assert.ok( featured.length >= 10, `${ block } has its featured settings` );
		const loose = featured.filter( ( a ) => 'featured' !== variantOf( block, a ) && recordRows( db, block ).rows.some( ( r ) => r.setting === a ) );
		assert.deepEqual( loose, [], `${ block }: featured settings the record offers to every item` );
	}
} );

test( 'negative control: a setting with no variant modifier above its part is offered to every node', () => {
	assert.equal( variantOf( 'sgs/nav-bar-menu', 'itemBgHover' ), null );
	assert.equal( variantOf( 'sgs/nav-bar-menu', 'itemBg' ), null );
	assert.equal( variantOf( 'sgs/cart', 'triggerBorderRadius' ), null, 'the cart pill and icon pair is the trigger settings\' own work, not a variant gate' );
	assert.equal( variantOf( 'sgs/cart', 'pillBorderWidth' ), null );
} );

test( 'negative control: a block style variant of the element itself, and the current condition, are not item variants', () => {
	assert.equal( variantOf( 'sgs/post-grid', 'cardRadius' ), null, '`__card--card` is the card style variant of the block' );
	assert.equal( variantOf( 'sgs/breadcrumbs', 'currentColourHover' ), null, 'current is read as a state' );
	assert.equal( rowHoldsVariant( compounds( '.a .a__item--featured .a__link' ), 'a__link', 'featured' ), true );
	assert.equal( rowHoldsVariant( compounds( '.a .a__item .a__link' ), 'a__link', 'featured' ), false );
	assert.equal( rowHoldsVariant( compounds( '.a .a__item--featured' ), 'a__item--featured', 'featured' ), false, 'the modifier must sit above the part' );
} );

test( 'variantHeld: a variant-only entry needs the node drawn in that variant', () => {
	assert.equal( variantHeld( { variantOnly: 'featured' }, [] ), false );
	assert.equal( variantHeld( { variantOnly: 'featured' }, undefined ), false );
	assert.equal( variantHeld( { variantOnly: 'featured' }, [ 'featured' ] ), true );
	assert.equal( variantHeld( {}, [] ), true );
} );

test( 'coversSlot: a cover layer over the element holds only a paint property of it', () => {
	const c = { effects: [ 'a > b::before|inset' ] };
	assert.equal( coversSlot( c, 'a > b::before', 'a > b', 'background-color' ), true );
	assert.equal( coversSlot( c, 'a > b::before', 'a > b', 'border-radius' ), false );
	assert.equal( coversSlot( c, 'a > b::before', 'a > x', 'background-color' ), false );
	assert.equal( coversSlot( { effects: [] }, 'a > b::before', 'a > b', 'background-color' ), false, 'a layer that does not cover is not the element' );
} );

// The nav record of a real client, with the variant gate the loader now stamps on each entry.
function navRecord() {
	const rec = readRecordFixture( path.join( HERE, 'fixtures', 'records' ), 'sgs/nav-bar-menu', 'eye-care-ward-end' );
	for ( const [ attr, entry ] of Object.entries( rec.settings ) ) {
		const only = variantOf( 'sgs/nav-bar-menu', attr );
		only && ( entry.variantOnly = only );
	}
	return rec;
}
const LINK = '.sgs-nav-bar-menu__bar > .sgs-nav-bar-menu__item:nth-of-type(3) > .sgs-nav-bar-menu__link';
const hoverOf = ( input = {} ) => resolve( { block: 'sgs/nav-bar-menu', slot: LINK, prop: 'background-color', state: 'hover', perWidth: { 375: '#F9D5D3', 768: '#F9D5D3', 1440: '#F9D5D3' }, ...input }, { db, snapshot, calibration: navRecord() } );

test( 'MUST FAIL: a plain link\'s hover background is the item hover setting, never the featured one', () => {
	const r = hoverOf();
	assert.deepEqual( r.writes?.map( ( w ) => w.attr ), [ 'itemBgHover' ], JSON.stringify( r ) );
} );

test( 'negative control: a link drawn in the featured variant may take the featured hover setting', () => {
	const r = hoverOf( { variants: [ 'featured' ] } );
	assert.ok( ! r.writes || r.writes.every( ( w ) => /^(item|featured)BgHover$/.test( w.attr ) ), JSON.stringify( r ) );
} );

// Fill's own call (lib/fill-prop.mjs::resolveProperty) hands the node's `drawnVariants` to the resolver: nothing in the route
// sets that field today (no draft singles out one menu item, and `featuredItemIds` is not built), so a variant-only setting is
// written to no node; the field is the one place a later reader of a featured item stamps its variant.
const hoverWrites = ( node ) => resolveProperty( { node, block: 'sgs/nav-bar-menu', prop: 'background-color', state: 'hover', draft: { 375: '#F9D5D3', 768: '#F9D5D3', 1440: '#F9D5D3' }, baseline: () => undefined, slots: [ LINK ], calibration: navRecord(), db, snapshot, log: [] } );

test( 'MUST FAIL: through Fill, a node drawn in the featured variant takes featuredBgHover and a plain node takes itemBgHover', () => {
	assert.deepEqual( hoverWrites( { attributes: {}, drawnVariants: [ 'featured' ] } ).writes?.map( ( w ) => w.attr ), [ 'featuredBgHover' ] );
	assert.deepEqual( hoverWrites( { attributes: {} } ).writes?.map( ( w ) => w.attr ), [ 'itemBgHover' ] );
} );
