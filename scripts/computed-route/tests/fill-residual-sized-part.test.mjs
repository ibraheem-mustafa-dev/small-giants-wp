// A side padding on a block's root is not written as Custom CSS where the instance holds the draft's size on a part that is the
// root's box (lib/fill-residual-css.mjs::sizedPart). Eye Care's header account icon is a 44px button with the browser's 6px
// side padding; Fill wrote the 44px to the icon's shapeSize (the disc the block draws inside its root) and the padding to the
// root as Custom CSS, so the root came out 56px wide and the header's right group 106px against the draft's 94px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { residualCssWrites } from '../lib/fill-residual-css.mjs';
import { openDb } from '../lib/db.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';

const ext = ( block ) => [ 'sgsCustomCss', 'sgsCustomCssId', 'sgsCustomCssNote' ].map( ( a ) => ( { block_slug: block, attr_name: a, attr_type: 'string', source: 'sgs-ext' } ) );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/disc', title: 'Disc', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [
		...ext( 'sgs/disc' ),
		{ block_slug: 'sgs/disc', attr_name: 'discSize', attr_type: 'object', css_property: 'width', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
		{ block_slug: 'sgs/disc', attr_name: 'discHeight', attr_type: 'object', css_property: 'height', tier_shape: 'tier_object', is_responsive: 1, role: 'layout' },
	],
} ) );
const W = [ 375, 768, 1440 ];
const perW = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
// The disc is as wide as the root at rest; its height is smaller than the root's.
const cal = {
	settings: {
		discSize: { slot: '.d__disc', slots: [ '.d__disc' ], property: 'width', state: null, reachedAt: W, effects: [] },
		discHeight: { slot: '.d__disc', slots: [ '.d__disc' ], property: 'height', state: null, reachedAt: W, effects: [] },
	},
	elements: { '': perW( { display: 'flex', width: '32px', height: '32px' } ), '.d__disc': perW( { display: 'flex', width: '32px', height: '20px' } ) },
};
const gap = ( p ) => `no-setting: sgs/disc has no setting for ${ p }; equivalence: 1 spelling | 2 values | 3 inert: no | 4 effect: no setting's measured effect reaches ${ p } on this element | 5 judges: nothing written`;
const row = ( property, value ) => ( { node: 'n0', block: 'sgs/disc', slot: '', state: null, property, value, reason: gap( property ) } );
function run( attributes, rows ) {
	const flat = [ { name: 'sgs/disc', attributes: { ...attributes }, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/disc', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'a' }, { id: '0:.d__disc', index: 0, slot: '.d__disc', finder: 'b' } ] } ];
	const widths = Object.fromEntries( W.map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: 44, h: 44 }, styles: { display: 'flex' }, layoutDisplay: 'flex' }, '0:.d__disc': { rect: { x: 0, y: 0, w: 44, h: 20 }, styles: { display: 'flex' }, layoutDisplay: 'flex' } } ] ) );
	const out = residualCssWrites( { nodes, flat, refOf: ( n ) => n.ref, reads: { widths, sweep: {} }, db, unmapped: rows, calFor: () => cal, snapshot: { palette: [], spacing: [], fontSizes: [], fontFamilies: [] }, scope: 'h', date: '2026-11-20' } );
	return { out, css: flat[ 0 ].attributes.sgsCustomCss };
}

test( 'MUST FAIL: the root\'s side padding is refused where the instance holds the width on a part that is the root\'s box', () => {
	const { out, css } = run( { discSize: { desktop: { width: '44px' } } }, [ row( 'padding-left', '6px' ), row( 'padding-right', '6px' ) ] );
	assert.equal( css, undefined, 'no padding rule is written' );
	assert.equal( out.refused.length, 2 );
	assert.match( out.refused[ 0 ].reason, /discSize holds the draft's whole width on \.d__disc, the root's box/ );
} );

test( 'negative controls: no written size, another axis, or a part that is a smaller box leave the padding to be written', () => {
	assert.match( run( {}, [ row( 'padding-left', '6px' ) ] ).css, /padding-left: 6px/, 'no size written: the padding is the draft\'s' );
	assert.match( run( { discSize: { desktop: { width: '44px' } } }, [ row( 'padding-top', '1px' ) ] ).css, /padding-top: 1px/, 'a width does not cover the vertical padding' );
	assert.match( run( { discSize: { desktop: { width: '44px' } } }, [ { ...row( 'padding-left', '6px' ), slot: '.d__disc' } ] ).css, /\.d__disc \{ padding-left: 6px/, 'a part own padding is its own' );;
	assert.match( run( { discSize: { desktop: { width: '44px' } } }, [ { ...row( 'padding-left', '6px' ), state: 'hover' } ] ).css, /:hover/, 'a hover padding is a state look, not the resting box' );
	assert.match( run( { discHeight: { desktop: '44px' } }, [ row( 'padding-top', '1px' ) ] ).css, /padding-top: 1px/, 'a height setting on a part that is a smaller box at rest' );
} );
