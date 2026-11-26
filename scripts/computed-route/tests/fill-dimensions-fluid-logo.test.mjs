// A logo a custom element draws (Indus's <indus-logo>, which inlines its SVG) read at the logo block's root, with a fluid
// declared height (clamp() at 1440, min() at 375, 56px at 768) and its width left to its aspect ratio (lib/fill-dimensions.mjs
// rule 2b). The block has no height setting and paints its inner image at the picture's natural size; its max-height is
// calibrated on that inner image. Before this rule the 375 and 1440 rows were `not-plain` and the 768 row found no ceiling at
// the root, so nothing was written and the header logo rendered 3,742px wide (2026-11-19). The generic resolver is stood in for
// by a fixture that records what it is asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensionWrites, innerImageSlot } from '../lib/fill-dimensions.mjs';

const calls = [];
const resolver = ( { prop, draft, block, slots } ) => {
	calls.push( { prop, draft, block, slots } );
	const attr = { 'max-height': 'maxHeight', 'min-height': 'minHeight' }[ prop ];
	if ( ! attr ) {
		return { status: 'gap', gap: 'no-setting', detail: `no ${ prop } setting` };
	}
	const tiers = {};
	for ( const [ w, tier ] of [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ] ) {
		undefined !== draft[ w ] && ( tiers[ tier ] = draft[ w ] );
	}
	return { status: 'written', writes: [ { attr, value: tiers, merge: 'deep' } ], included: draft };
};

const IMG = '.sgs-responsive-logo__link > .sgs-responsive-logo__picture > .sgs-media-el';
const HEIGHT = { 375: 54, 768: 56, 1440: 63.36 };
const FLUID = { 375: 'min(54px, -26.2443px + 22.6244vw)', 768: '56px', 1440: 'clamp(54px, 4.4vw, 66px)' };
const CAL = ( { imgs = [ IMG ] } = {} ) => ( {
	settings: { maxHeight: { slot: IMG, slots: [ IMG ], property: 'max-height' } },
	elements: {
		'': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { _tag: 'div' } ] ) ),
		...Object.fromEntries( imgs.map( ( k ) => [ k, Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { _tag: 'img', height: '704px' } ] ) ) ] ) ),
	},
} );
function world( { tag = 'indus-logo', declared = ( w ) => ( { height: FLUID[ w ], 'aspect-ratio': '3741 / 848' } ), media } = {} ) {
	const flat = [ { name: 'sgs/responsive-logo', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/responsive-logo', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: HEIGHT[ w ] * 4.41, h: HEIGHT[ w ] }, tag, styles: {}, ...( media ? { media } : {} ) } } ] ) );
	return { flat, nodes, reads: { widths, declared: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': declared( w ) } ] ) ) }, refOf: ( n ) => n.ref };
}
const rows = () => [
	{ node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: FLUID[ 375 ], reason: `not-plain: the code declares ${ FLUID[ 375 ] } at 375px, which no setting holds as a length` },
	{ node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: FLUID[ 1440 ], reason: `not-plain: the code declares ${ FLUID[ 1440 ] } at 1440px, which no setting holds as a length` },
	{ node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: '56px', reason: 'no-setting: sgs/responsive-logo has no setting for height' },
];
const run = ( w, cal = CAL(), list = rows() ) => dimensionWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db: null, unmapped: list, calFor: () => cal, scope: 'header', resolver, date: '2026-11-19' } );

test( 'MUST FAIL: a custom element\'s logo with a fluid height gets the block\'s inner image ceiling at its rendered size per device', () => {
	calls.length = 0;
	const w = world();
	const r = run( w );
	assert.deepEqual( w.flat[ 0 ].attributes.maxHeight, { desktop: '63.36px', tablet: '56px', mobile: '54px' } );
	assert.deepEqual( r.unmapped, [], 'every height row, the fluid ones included, is answered' );
	assert.equal( calls[ 0 ].prop, 'max-height' );
	assert.match( r.notes[ 0 ], /a picture a custom element draws .* max-height on its inner image/ );
} );

test( 'the block\'s one inner image is found from its calibrated tags; none or two is no slot', () => {
	assert.equal( innerImageSlot( CAL() ), IMG );
	assert.equal( innerImageSlot( CAL( { imgs: [] } ) ), null );
	assert.equal( innerImageSlot( CAL( { imgs: [ IMG, '.other > img' ] } ) ), null );
} );

test( 'negative control: a fluid height on a div is left as its not-plain row, untouched', () => {
	const w = world( { tag: 'div' } );
	const r = run( w );
	assert.equal( w.flat[ 0 ].attributes.maxHeight, undefined );
	assert.deepEqual( r.unmapped.filter( ( u ) => /^not-plain/.test( u.reason ) ).map( ( u ) => u.reason.includes( 'dimension:' ) ), [ false, false ] );
} );

test( 'negative control: a picture with both sides declared, or a block with no inner image, gets no ceiling', () => {
	const both = world( { declared: ( w ) => ( { height: FLUID[ w ], width: '240px' } ) } );
	run( both );
	assert.equal( both.flat[ 0 ].attributes.maxHeight, undefined );
	const noImg = world();
	run( noImg, { ...CAL( { imgs: [] } ), settings: {} } );
	assert.equal( noImg.flat[ 0 ].attributes.maxHeight, undefined );
	const noCeiling = world();
	run( noCeiling, { ...CAL(), settings: {} } );
	assert.equal( noCeiling.flat[ 0 ].attributes.maxHeight, undefined, 'an inner image with no calibrated max-height holds no ceiling' );
} );

// The site look keeps the cascade's own values for the logo's inner image: height `auto` under `max-height: none`, no length. The
// block bounds the picture nowhere, so a declared 60px is smaller than what it paints and the ceiling is written (Mama's header
// logo lost its maxHeight when the site look replaced calibration's measured 704px box, 2026-11-23).
const UNBOUNDED = ( { height = 'auto', maxHeight = 'none' } = {} ) => ( {
	settings: { maxHeight: { slot: IMG, slots: [ IMG ], property: 'max-height' } },
	elements: {
		'': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { _tag: 'div' } ] ) ),
		[ IMG ]: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { _tag: 'img', height, 'max-height': maxHeight } ] ) ),
	},
} );
const SIXTY = { 375: '48px', 768: '56px', 1440: '60px' };

test( 'MUST FAIL: an inner image the site look leaves unbounded (height auto, max-height none) takes the declared height as its ceiling', () => {
	calls.length = 0;
	const w = world( { tag: 'img', declared: ( x ) => ( { height: SIXTY[ x ] } ), media: [ { natural: { w: 1200, h: 400 } } ] } );
	const list = [ { node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: '60px', reason: 'no-setting: sgs/responsive-logo has no setting for height' } ];
	const r = run( w, UNBOUNDED(), list );
	assert.deepEqual( w.flat[ 0 ].attributes.maxHeight, { desktop: '60px', tablet: '56px', mobile: '48px' } );
	assert.deepEqual( r.unmapped, [] );
	assert.match( r.notes[ 0 ], /the block paints it 400px \/ 400px \/ 400px/ );
} );

test( 'MUST FAIL: an unbounded picture whose own file is smaller than the declared size is given no ceiling (it renders at its file size)', () => {
	calls.length = 0;
	const w = world( { tag: 'img', declared: ( x ) => ( { height: '48px' } ), media: [ { natural: { w: 16, h: 16 } } ] } );
	const list = [ { node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: '48px', reason: 'no-setting: sgs/responsive-logo has no setting for height' } ];
	run( w, UNBOUNDED(), list );
	assert.equal( w.flat[ 0 ].attributes.maxHeight, undefined, 'a ceiling above the file size would write max-height beside a 16px picture' );
	assert.ok( ! calls.some( ( c ) => 'max-height' === c.prop ) );
} );

test( 'a picture with no known natural size (an svg with no intrinsic size) claims no ceiling room either', () => {
	const w = world( { tag: 'img', declared: ( x ) => ( { height: SIXTY[ x ] } ), media: [ { natural: null } ] } );
	const list = [ { node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: '60px', reason: 'no-setting: sgs/responsive-logo has no setting for height' } ];
	run( w, UNBOUNDED(), list );
	assert.equal( w.flat[ 0 ].attributes.maxHeight, undefined );
} );

test( 'negative control: an inner image the block itself caps (max-height 40px) is not given a second ceiling by this rule', () => {
	const w = world( { tag: 'img', declared: ( x ) => ( { height: SIXTY[ x ] } ), media: [ { natural: { w: 1200, h: 400 } } ] } );
	const list = [ { node: 'n0', block: 'sgs/responsive-logo', slot: '', property: 'height', value: '60px', reason: 'no-setting: sgs/responsive-logo has no setting for height' } ];
	run( w, UNBOUNDED( { maxHeight: '40px' } ), list );
	assert.equal( w.flat[ 0 ].attributes.maxHeight, undefined );
} );
