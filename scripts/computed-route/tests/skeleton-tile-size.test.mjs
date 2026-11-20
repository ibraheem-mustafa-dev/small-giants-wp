// A strip of square tiles the draft sizes in pixels per device is the logo block's count of tiles per device and its tile cap per
// device (data/skeleton-decisions.json `rules.marquee.labelledLogos.tileSize`, lib/skeleton-tile-count.mjs). The block paints a tile
// as the strip's width shared by the count, never above that device's cap, so a length per device is no setting it holds: Fill listed
// the tile's height as "painted from a count per device" and the clone drew 158px tiles against the draft's 150 (2026-11-20). Once
// the block held a cap per device (maxHeight, maxHeightTablet, maxHeightMobile) the cap is the draft's tile at each device and the
// count the most tiles that leave each at least that size, so the tile is the draft's to the pixel.
// Pure functions and a temporary folder only: no command, no site. Mutation list: tests/skeleton-tile-size.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { tileCount, stripGap, squareTile } from '../lib/skeleton-tile-count.mjs';
import { facts, N, run, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return { brands: [] }; } }';
const MOTION = new Set( [ 'Root/2' ] );
const strip = ( tile = [ 150, 150 ], gap = 'gap:14px' ) => N( 'section', { box: [ 1000, 100 ] }, [ N( 'div', { style: `display:flex;${ gap }` }, [ N( 'a', { loop: { list: 'brands', as: 'l', copies: 4 }, row: true, attrs: { href: '#/brands', 'aria-label': 'Sanam' }, style: 'display:block;background:#FFFFFF', box: tile }, [ N( 'img', { attrs: { src: 'brand.png' } } ) ] ) ] ) ] );
const node = ( root, o = {} ) => find( run( root, LOGIC, { motion: MOTION, calSettings: () => ( {} ), ...o } ).skeleton, ( x ) => 'sgs/brand-strip' === x.name )[ 0 ];

test( 'MUST FAIL: fixed square tiles are decided as the count per device and the cap, never written as attributes', () => {
	const n = node( strip() );
	assert.deepEqual( n.decided.columns, { desktop: 6, tablet: 6, mobile: 6 }, 'a 1000px strip of 150px tiles 14px apart: six tiles of at least 150px (1000 + 14 over 164)' );
	assert.equal( n.decided.maxHeight, 150, 'the desktop cap is the draft tile' );
	assert.equal( n.decided.maxHeightTablet, undefined, 'a device whose cap is what the cascade gives writes none' );
	assert.equal( n.decided.maxHeightMobile, undefined );
	assert.equal( n.attributes.columns, undefined, 'a setting that paints a size is decided, never a skeleton attribute' );
	assert.equal( n.attributes.maxHeight, undefined );
} );

test( 'MUST FAIL: the count for the draft tiles of 150, 136 and 112px in a viewport of 1440, 768 and 375px', () => {
	const r = tileCount( { tiles: { 1440: 150, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } );
	assert.deepEqual( r, { columns: { desktop: 8, tablet: 5, mobile: 3 }, caps: { desktop: 150, tablet: 136, mobile: 112 } } );
	const tile = ( n, span ) => ( span - ( n - 1 ) * 14 ) / n;
	assert.ok( tile( 8, 1440 ) >= 150 && tile( 5, 768 ) >= 136 && tile( 3, 375 ) >= 112, 'every count leaves a tile at least the cap, so the cap draws the draft tile' );
	assert.ok( tile( 9, 1440 ) < 150 && tile( 6, 768 ) < 136 && tile( 4, 375 ) < 112, 'one more tile would fall under the cap' );
	assert.deepEqual( tileCount( { tiles: { 1440: 150, 768: 150, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ).caps, { desktop: 150, mobile: 112 }, 'a tablet cap equal to the desktop one is the cascade, so none is written' );
	assert.deepEqual( tileCount( { tiles: { 1440: 150, 768: 150, 375: 150 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ).caps, { desktop: 150 } );
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 136, 375: 112 }, viewport: { 1440: 100, 768: 768, 375: 375 }, gap: 14 } ).columns.desktop, 1, 'a viewport narrower than a tile still holds one' );
} );

test( 'negative control: no tile, an unequal box, a missing viewport, the rule removed and a gap in no unit read nothing wrong', () => {
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 136 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ), null, 'a device with no tile' );
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768 }, gap: 14 } ), null, 'a device with no viewport' );
	assert.equal( tileCount( { tiles: { 1440: 0, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ), null, 'a zero tile' );
	assert.deepEqual( squareTile( { box: { 1440: { w: 150, h: 150 }, 768: { w: 136, h: 100 } } } ), { 1440: 150 }, 'a tile that is not square at a width is left out' );
	assert.equal( node( strip( [ 150, 100 ] ) ).decided.columns, undefined, 'a tile taller than wide is no square tile' );
	assert.equal( node( strip( [ 150, 100 ] ) ).decided.maxHeight, undefined );
	assert.equal( node( strip( [ 150, 100 ] ) ).decided.maxHeightMobile, undefined );
	assert.equal( node( strip(), { off: [ 'marquee.labelledLogos' ] } ).decided, undefined, 'MUST FAIL without the rule' );
	assert.equal( stripGap( 'display: flex; gap: 14px; width: max-content' ), 14 );
	assert.equal( stripGap( 'display: flex; column-gap: 8.5px' ), 8.5 );
	assert.equal( stripGap( 'display: flex; gap: 1rem' ), null );
	assert.equal( stripGap( 'display: flex' ), null );
	assert.deepEqual( node( strip( [ 150, 150 ], 'gap:1rem' ) ).decided.columns, node( strip( [ 150, 150 ], 'gap:0px' ) ).decided.columns, 'a gap in rem reads as none' );
} );

test( 'MUST FAIL: the rule names a count and a cap setting of the logo block', () => {
	const bad = ( edit ) => {
		const f = facts( REPO );
		edit( f.decisions.rules.marquee.labelledLogos );
		return decisionsProblems( f ).filter( ( p ) => /tileSize/.test( p ) );
	};
	assert.deepEqual( bad( () => {} ), [] );
	assert.equal( bad( ( l ) => ( l.tileSize.count = 'noSuchSetting' ) ).length, 1 );
	assert.equal( bad( ( l ) => ( l.tileSize.cap = '' ) ).length, 1 );
	assert.equal( bad( ( l ) => ( l.tileSize.cap.mobile = 'noSuchSetting' ) ).length, 1, 'the cap at each device must be a setting too' );
	assert.equal( bad( ( l ) => delete l.tileSize.cap.tablet ).length, 1 );
} );
