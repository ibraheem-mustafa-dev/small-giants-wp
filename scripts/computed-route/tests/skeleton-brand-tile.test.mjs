// A looping strip of labelled tiles the draft paints (an inline background, border or shadow) is the brand strip drawing each
// name as a tile (data/skeleton-decisions.json `rules.marquee.labelledLogos.tile`: brandTextTile), and the first tile is where
// Fill reads the tile's look (`rules.marquee.itemSlots`, lib/skeleton-part-slots.mjs::itemSlots). Before this the clone's strip
// was a blank band of faint names where the draft has white tiles (2026-11-19).
// Pure functions and a temporary folder only: no command, no site. Mutation list: tests/skeleton-brand-tile.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { facts, N, run, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = 'class Component { renderVals() { return { brands: [] }; } }';
const MOTION = new Set( [ 'Root/2' ] );
const TILE = '.sgs-brand-strip__track > .sgs-brand-strip__set > .sgs-brand-strip__item:nth-of-type(1)';
const CAL = Object.fromEntries( [ 'tileBackgroundColour', 'tileRadius', 'tileShadow', 'tilePadding', 'tileBorderWidth', 'tileBorderColour' ].map( ( s ) => [ s, { slot: TILE, slots: [ TILE ] } ] ) );
const strip = ( style, label = 'Sanam' ) => N( 'section', {}, [ N( 'div', { style: 'display:flex' }, [ N( 'a', { loop: { list: 'brands', as: 'l', copies: 4 }, row: true, attrs: { href: '#/brands', 'aria-label': label }, style, box: [ 150, 150 ] }, [ N( 'img', { attrs: { src: 'brand.png' } } ) ] ) ] ) ] );
const PAINTED = 'display:block;background:#FFFFFF;border-radius:16px;box-shadow:0 6px 14px -8px rgba(0,0,0,.35)';
const node = ( o ) => find( run( strip( ...( o.args || [ PAINTED ] ) ), LOGIC, { motion: MOTION, calSettings: () => CAL, ...( o.run || {} ) } ).skeleton, ( x ) => 'sgs/brand-strip' === x.name )[ 0 ];

test( 'MUST FAIL: a painted labelled tile makes the strip a name tile and its first tile is read at the tile settings', () => {
	const n = node( {} );
	assert.deepEqual( n.attributes, { brandDisplay: 'logo-else-text', brandTextTile: true, logoLayout: 'tiles' }, 'the row layout draws no tile, so the rule sets the tile layout' );
	assert.equal( n.decided.logoLayout, 'tiles', 'and owns it: a lone max-width read must never turn the layout to row' );
	const SET = TILE.split( ' > ' ).slice( 0, -1 ).join( ' > ' );
	assert.deepEqual( Object.keys( n.draftSlots ), [ TILE, SET ], 'the six tile settings share one calibrated slot, the first tile; the strip set of tiles is the draft element laying them out' );
	assert.ok( n.draftSlots[ TILE ], 'the slot names the draft tile' );
	assert.ok( n.draftSlots[ SET ] && JSON.stringify( n.draftSlots[ SET ] ) !== JSON.stringify( n.draftSlots[ TILE ] ), 'the set is read at the parent of the tiles, not at a tile' );
} );

test( 'negative control: an unpainted tile, no calibrated tile slot, the rule removed and an unlabelled strip stay as before', () => {
	assert.deepEqual( node( { args: [ 'display:block;border-radius:16px' ] } ).attributes, { brandDisplay: 'logo-else-text' }, 'a radius alone paints nothing' );
	assert.equal( node( { args: [ 'display:block;border-radius:16px' ] } ).draftSlots, undefined );
	assert.equal( node( { args: [ 'display:block;border-radius:16px' ] } ).decided?.logoLayout, undefined, 'an unpainted strip owns no layout' );
	assert.deepEqual( node( { args: [ 'display:block;background:transparent;border:0' ] } ).attributes, { brandDisplay: 'logo-else-text' }, 'a transparent background and no border paint nothing' );
	assert.equal( node( { run: { calSettings: () => ( {} ) } } ).draftSlots, undefined, 'a block with no calibrated tile slot reads no tile' );
	assert.deepEqual( node( { run: { off: [ 'marquee.labelledLogos' ] } } ).attributes, {} );
	assert.equal( find( run( strip( PAINTED, '' ), LOGIC, { motion: MOTION, calSettings: () => CAL } ).skeleton, ( x ) => 'sgs/brand-strip' === x.name )[ 0 ]?.attributes?.brandTextTile, undefined, 'tiles with no name are no name tile' );
} );

test( 'MUST FAIL: the rule names a setting of the logo block for the tile and for the tile look it reads', () => {
	const bad = ( edit ) => {
		const f = facts( REPO );
		edit( f.decisions.rules.marquee );
		return decisionsProblems( f ).filter( ( p ) => /rules\.marquee\.(labelledLogos\.tile|itemSlots)/.test( p ) );
	};
	assert.deepEqual( bad( () => {} ), [] );
	assert.equal( bad( ( m ) => ( m.labelledLogos.tile.setting = 'noSuchSetting' ) ).length, 1 );
	assert.equal( bad( ( m ) => ( m.labelledLogos.tile.layout.value = 'sideways' ) ).length, 1, 'a layout value the setting lacks' );
	assert.equal( bad( ( m ) => ( m.labelledLogos.tile.layout.setting = 'noSuchSetting' ) ).length, 1 );
	assert.equal( bad( ( m ) => m.itemSlots.push( 'noSuchSetting' ) ).length, 1 );
} );
