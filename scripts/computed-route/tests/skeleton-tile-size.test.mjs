// A strip of square tiles the draft sizes in pixels per device is the logo block's count of tiles per device and its tile cap
// (data/skeleton-decisions.json `rules.marquee.labelledLogos.tileSize`, lib/skeleton-tile-count.mjs). The block paints a tile as
// the strip's width shared by the count, never above the cap, so a length per device is no setting it holds: Fill listed the
// tile's height as "painted from a count per device" and the clone drew 158px tiles against the draft's 150 (2026-11-20).
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
	assert.deepEqual( n.decided.columns, { desktop: 7, tablet: 7, mobile: 7 }, 'a 1000px strip of 150px tiles 14px apart: the first count whose tile fits the cap is 7 (131px), the nearest to 150' );
	assert.equal( n.decided.maxHeight, 150, 'the cap is the largest tile' );
	assert.equal( n.attributes.columns, undefined, 'a setting that paints a size is decided, never a skeleton attribute' );
	assert.equal( n.attributes.maxHeight, undefined );
} );

test( 'MUST FAIL: the count for the draft tiles of 150, 136 and 112px in a viewport of 1440, 768 and 375px', () => {
	const r = tileCount( { tiles: { 1440: 150, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } );
	assert.deepEqual( r, { columns: { desktop: 9, tablet: 5, mobile: 3 }, cap: 150 } );
	const tile = ( n, span ) => ( span - ( n - 1 ) * 14 ) / n;
	assert.ok( tile( 9, 1440 ) <= 150 && tile( 5, 768 ) <= 150 && tile( 3, 375 ) <= 150, 'no count needs a tile above the cap, so the strip spans its viewport' );
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 100, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ).columns.tablet, 7, 'a small tablet tile takes the count nearest it (7 gives 100px), not the first count that fits the cap (5 gives 142px)' );
} );

test( 'negative control: no tile, an unequal box, a missing viewport, the rule removed and a gap in no unit read nothing wrong', () => {
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 136 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ), null, 'a device with no tile' );
	assert.equal( tileCount( { tiles: { 1440: 150, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768 }, gap: 14 } ), null, 'a device with no viewport' );
	assert.equal( tileCount( { tiles: { 1440: 0, 768: 136, 375: 112 }, viewport: { 1440: 1440, 768: 768, 375: 375 }, gap: 14 } ), null, 'a zero tile' );
	assert.deepEqual( squareTile( { box: { 1440: { w: 150, h: 150 }, 768: { w: 136, h: 100 } } } ), { 1440: 150 }, 'a tile that is not square at a width is left out' );
	assert.equal( node( strip( [ 150, 100 ] ) ).decided.columns, undefined, 'a tile taller than wide is no square tile' );
	assert.equal( node( strip( [ 150, 100 ] ) ).decided.maxHeight, undefined );
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
} );
