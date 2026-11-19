// Route faults behind the residual classifier's class (b) rows (a setting exists for the draft's value and the route did
// not write it): a `normal` letter-spacing or line-height written as the value it renders (lib/fill-normal-keywords.mjs);
// one border style held for the sides that paint, the bare sides having no width (lib/resolve.mjs::foldFamily); text-align
// start and end as the edge the element's direction gives them (lib/css-equivalence/keywords.mjs::alignmentCanon).
// Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalKeywords } from '../lib/fill-normal-keywords.mjs';
import { resolve } from '../lib/resolve.mjs';
import { alignmentCanon } from '../lib/css-equivalence/keywords.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const W = [ 375, 768, 1440 ];
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/box', title: 'Box', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		{ block_slug: 'sgs/box', attr_name: 'borderStyle', attr_type: 'string', css_property: 'border-style', role: 'border', source: 'sgs-ext' },
		{ block_slug: 'sgs/box', attr_name: 'textAlign', attr_type: 'string', css_property: 'text-align', role: 'typography', source: 'sgs-ext', enum_values: '["left","center","right","justify"]' },
	],
} ) );
const cal = {
	settings: {
		borderStyle: { slot: '', slots: [ '' ], property: 'border-style', state: null, reachedAt: W, effects: [] },
		textAlign: { slot: '', slots: [ '' ], property: 'text-align', state: null, reachedAt: W, effects: [] },
	},
	elements: { '': perW( { 'border-top-style': 'none', 'text-align': 'center' } ) },
};
const ctx = { db, calibration: cal, snapshot: { palette: [], spacing: [], fontSizes: [], fontFamilies: [] }, log: [] };
const sides = ( top, right, bottom, left, widths ) => ( {
	'border-top-style': perW( top ), 'border-right-style': perW( right ), 'border-bottom-style': perW( bottom ), 'border-left-style': perW( left ),
	'border-top-width': perW( widths[ 0 ] ), 'border-right-width': perW( widths[ 1 ] ), 'border-bottom-width': perW( widths[ 2 ] ), 'border-left-width': perW( widths[ 3 ] ),
} );

test( 'MUST FAIL WITHOUT THE NORMAL KEYWORDS: letter-spacing normal is 0px; line-height normal is the measured line box', () => {
	const snaps = perW( { normalLineHeight: 23.4 } );
	assert.deepEqual( normalKeywords( 'letter-spacing', perW( 'normal' ), { snaps } ).draft, perW( '0px' ) );
	assert.deepEqual( normalKeywords( 'line-height', perW( 'normal' ), { snaps } ).draft, perW( '23.4px' ) );
	assert.equal( normalKeywords( 'line-height', perW( 'normal' ), { snaps } ).changed.length, 3 );
} );

test( 'negative control: a block already painting normal, an unmeasured line, another value or property stay as read', () => {
	assert.deepEqual( normalKeywords( 'line-height', perW( 'normal' ), { snaps: perW( { normalLineHeight: 23.4 } ), base: () => 'normal' } ).draft, perW( 'normal' ) );
	assert.deepEqual( normalKeywords( 'line-height', perW( 'normal' ), { snaps: perW( {} ) } ).draft, perW( 'normal' ) );
	assert.deepEqual( normalKeywords( 'line-height', perW( '1.4' ), { snaps: perW( { normalLineHeight: 23.4 } ) } ).draft, perW( '1.4' ) );
	assert.deepEqual( normalKeywords( 'word-spacing', perW( 'normal' ), {} ).draft, perW( 'normal' ) );
} );

test( 'MUST FAIL WITHOUT THE BARE-SIDE FOLD: a bottom border alone is one solid style, the other sides having no width', () => {
	const r = resolve( { block: 'sgs/box', slot: '', prop: 'border-bottom-style', perWidth: perW( 'solid' ), siblings: sides( 'none', 'none', 'solid', 'none', [ '0px', '0px', '2px', '0px' ] ) }, ctx );
	assert.deepEqual( r.writes?.map( ( x ) => [ x.attr, x.value ] ), [ [ 'borderStyle', 'solid' ] ], JSON.stringify( r ) );
} );

test( 'negative control: two painted sides of different styles stay a shape gap', () => {
	const r = resolve( { block: 'sgs/box', slot: '', prop: 'border-bottom-style', perWidth: perW( 'solid' ), siblings: sides( 'dashed', 'none', 'solid', 'none', [ '2px', '0px', '2px', '0px' ] ) }, ctx );
	assert.equal( r.gap, 'shape' );
} );

test( 'MUST FAIL WITHOUT THE DIRECTION RULE: text-align start is left in ltr and right in rtl; unread, it stays start', () => {
	const ltr = resolve( { block: 'sgs/box', slot: '', prop: 'text-align', perWidth: perW( 'start' ), siblings: { direction: perW( 'ltr' ) } }, ctx );
	assert.deepEqual( ltr.writes?.map( ( x ) => [ x.attr, x.value ] ), [ [ 'textAlign', 'left' ] ], JSON.stringify( ltr ) );
	const rtl = resolve( { block: 'sgs/box', slot: '', prop: 'text-align', perWidth: perW( 'start' ), siblings: { direction: perW( 'rtl' ) } }, ctx );
	assert.deepEqual( rtl.writes?.map( ( x ) => x.value ), [ 'right' ] );
	assert.equal( alignmentCanon( 'text-align', 'end', { direction: 'ltr' } ), 'right' );
	const unread = resolve( { block: 'sgs/box', slot: '', prop: 'text-align', perWidth: perW( 'start' ), siblings: {} }, ctx );
	assert.equal( unread.gap, 'shape', 'no direction read: start is no edge the enum names' );
} );
