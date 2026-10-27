// The content band's width from the draft's render (lib/fill-band.mjs, Spec 48 FR-48-8, Spec 02 container `contentWidth`):
// a full-bleed draft section whose children span it is written `full`, one whose children sit in a narrower centred column
// is written that cap, and one no wider than the theme content size keeps the default. Unit rules first, then through
// fillTree with the real framework database and resolver, calibration fixtures shaped as the cache files are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bandNeed, bandValue, capOf, themeSizes, bandSetting } from '../lib/fill-band.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const SIZES = { normal: 1080, wide: 1400 };
const RAW = { settings: { layout: { contentSize: '1080px', wideSize: '1400px' } } };
const FOUR = [ 375, 768, 1440, 1920 ];
const THREE_W = [ 375, 768, 1440 ];

// One draft element read: x 0, `w` wide, horizontal padding `pad` each side, display and direction.
const own = ( w, pad = 0, extra = {} ) => ( { rect: { x: 0, y: 0, w, h: 200 }, inFlow: true, styles: { display: 'block', 'flex-direction': 'row', 'padding-left': `${ pad }px`, 'padding-right': `${ pad }px`, 'border-left-width': '0px', 'border-right-width': '0px', 'max-width': 'none', ...extra } } );
// A child `w` wide at `x`.
const kid = ( x, w, styles = {} ) => ( { rect: { x, y: 0, w, h: 40 }, inFlow: true, styles: { 'max-width': 'none', ...styles } } );
// A child centred in an element `box` wide with `pad` each side, `cap` wide where the content box is wider, else spanning it.
const centred = ( box, pad, cap, styles = {} ) => {
	const inner = box - 2 * pad;
	const w = Math.min( cap, inner );
	return kid( pad + ( inner - w ) / 2, w, styles );
};

test( 'capOf: no value, full and an empty string are no cap; the presets are the theme sizes; a length is its px', () => {
	assert.equal( capOf( undefined, SIZES ), Infinity );
	assert.equal( capOf( 'full', SIZES ), Infinity );
	assert.equal( capOf( '', SIZES ), Infinity );
	assert.equal( capOf( 'normal', SIZES ), 1080 );
	assert.equal( capOf( 'wide', SIZES ), 1400 );
	assert.equal( capOf( '1200px', SIZES ), 1200 );
	assert.equal( capOf( '80%', SIZES ), null );
	assert.deepEqual( themeSizes( RAW ), SIZES );
	assert.deepEqual( themeSizes( null ), { normal: null, wide: null } );
} );

test( 'bandNeed: children spanning the content box need a band at least the padding box', () => {
	assert.deepEqual( bandNeed( own( 1440, 40 ), [ kid( 40, 1360 ) ] ).min, 1440 );
	assert.equal( bandNeed( own( 305.34, 0 ), [ kid( 0.5, 304.3 ) ] ).min, 305.34, 'a column a sub-pixel layout leaves 1.04px short spans' );
	assert.equal( bandNeed( own( 305.34, 0 ), [ kid( 1.67, 302 ) ] ).exact, 302, 'one 3.34px short is a cap' );
	assert.equal( bandNeed( own( 1440, 40 ), [] ), null, 'no drawn child, no evidence' );
	assert.equal( bandNeed( own( 1440, 40 ), [ { missing: true } ] ), null );
	assert.equal( bandNeed( { missing: true }, [ kid( 40, 1360 ) ] ), null );
	const border = own( 1440, 40, { 'border-left-width': '2px', 'border-right-width': '2px' } );
	assert.equal( bandNeed( border, [ kid( 42, 1356 ) ] ).min, 1436, 'the band sits inside the border' );
} );

test( 'MUST FAIL: bandNeed reads a centred narrower column as a cap of its width plus the padding', () => {
	const n = bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 1200 ) ] );
	assert.equal( n.exact, 1280 );
	assert.equal( bandNeed( own( 1440, 0 ), [ centred( 1440, 0, 900 ), centred( 1440, 0, 1200 ) ] ).exact, 1200, 'the widest child is the column' );
} );

test( 'negative controls: a child sized by itself, an off-centre child, a flex row and an out-of-flow child are no cap', () => {
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 1080, { 'max-width': '1080px' } ) ] ).min, 1440, 'its own ceiling' );
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 1080 ) ], () => ( { width: '1080px' } ) ).min, 1440, 'its own declared width' );
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 1080 ) ], () => ( { width: 'auto' } ) ).exact, 1160, 'an auto width is no size of its own' );
	assert.equal( bandNeed( own( 1440, 40 ), [ kid( 40, 600 ) ] ).min, 1440, 'off-centre' );
	assert.equal( bandNeed( own( 1440, 40, { display: 'flex' } ), [ centred( 1440, 40, 600 ) ] ).min, 1440, 'a flex row' );
	assert.equal( bandNeed( own( 1440, 40, { display: 'flex', 'flex-direction': 'column' } ), [ centred( 1440, 40, 600 ) ] ).exact, 680, 'a flex column is a cap' );
	assert.equal( bandNeed( own( 1440, 40 ), [ { ...kid( 40, 1360 ), inFlow: false }, centred( 1440, 40, 600 ) ] ).exact, 680, 'an out-of-flow child says nothing' );
	assert.equal( bandNeed( own( 1440, 40 ), [ kid( 40, 0 ), centred( 1440, 40, 600 ) ] ).exact, 680, 'a zero-width child says nothing' );
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 300, { display: 'inline-block' } ) ] ).min, 1440, 'a child that does not stretch' );
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 300, { display: 'flex' } ) ] ).exact, 380, 'a block-level flex child stretches' );
	assert.equal( bandNeed( own( 1440, 40 ), [ centred( 1440, 40, 300, { display: 'inline-block' } ), centred( 1440, 40, 600 ) ] ).exact, 680, 'the stretching child is the column' );
	assert.equal( bandNeed( own( 1440, 40, { display: 'flex', 'flex-direction': 'column', 'align-items': 'center' } ), [ centred( 1440, 40, 600 ) ] ).min, 1440, 'an aligned flex column' );
	assert.equal( bandNeed( own( 1440, 40, { display: 'flex', 'flex-direction': 'column', 'align-items': 'stretch' } ), [ centred( 1440, 40, 600 ) ] ).exact, 680, 'a stretching flex column' );
	assert.equal( bandNeed( own( 1440, 40, { display: 'grid' } ), [ centred( 1440, 40, 600 ) ] ).min, 1440, 'a grid' );
} );

const spanNeeds = ( widths ) => Object.fromEntries( widths.map( ( w ) => [ w, { min: w } ] ) );

test( 'MUST FAIL: bandValue writes full where a full-bleed band is wider than the theme content size, held where it is not', () => {
	assert.deepEqual( bandValue( spanNeeds( THREE_W ), { desktop: 'normal' }, SIZES ), { value: { desktop: 'full' } } );
	assert.deepEqual( bandValue( spanNeeds( [ 375, 768 ] ), { desktop: 'normal' }, SIZES ), { held: true }, 'every width fits the content size' );
	assert.deepEqual( bandValue( { 375: { min: 375 }, 768: { min: 768 }, 1440: { min: 1080 } }, { desktop: 'normal' }, SIZES ), { held: true }, 'a theme-width element stays normal' );
	assert.deepEqual( bandValue( { 1440: { min: 1081.5 } }, { desktop: 'normal' }, SIZES ), { value: { desktop: 'full' } }, 'past the tolerance' );
	assert.deepEqual( bandValue( spanNeeds( THREE_W ), {}, SIZES ), { held: true }, 'a block with no band cap by default' );
	assert.deepEqual( bandValue( { 1440: { min: 1440 }, 1920: { exact: 300 } }, { desktop: 'normal' }, SIZES ), { value: { desktop: 'full' } }, '1920 reads lengths only and is not judged' );
} );

test( 'MUST FAIL: bandValue writes a cap as its px length, or as the preset it equals', () => {
	const capped = ( cap ) => ( { 375: { min: 375 }, 768: { min: 768 }, 1440: { exact: cap } } );
	assert.deepEqual( bandValue( capped( 1280 ), { desktop: 'normal' }, SIZES ), { value: { desktop: '1280px' } } );
	assert.deepEqual( bandValue( capped( 1400 ), { desktop: 'normal' }, SIZES ), { value: { desktop: 'wide' } } );
	assert.deepEqual( bandValue( capped( 1080 ), { desktop: 'normal' }, SIZES ), { held: true }, 'a cap equal to the content size is the default' );
	assert.deepEqual( bandValue( capped( 1280 ), { desktop: 'normal' }, SIZES, ( n ) => `${ n }.00px` ), { value: { desktop: '1280.00px' } }, 'the formatter shapes a custom cap' );
	assert.match( bandValue( capped( 1280 ), { desktop: 'normal' }, SIZES, () => '80%' ).conflict, /desktop: no one value gives/, 'a cap the formatter cannot hold as a length is refused' );
} );

test( 'bandValue writes a narrower tier only where the wider tier does not give it', () => {
	const needs = { 375: { min: 375 }, 768: { exact: 600 }, 1440: { exact: 1200 } };
	assert.deepEqual( bandValue( needs, { desktop: 'normal' }, SIZES ), { value: { desktop: '1200px', tablet: '600px' } } );
	assert.deepEqual( bandValue( { 375: { exact: 300 }, 1440: { min: 1440 } }, { desktop: 'normal' }, SIZES ), { value: { desktop: 'full', mobile: '300px' } } );
	assert.deepEqual( bandValue( { 768: { exact: 600 } }, { desktop: 'normal' }, SIZES ), { value: { desktop: 'normal', tablet: '600px' } }, 'an unread desktop keeps the value it has' );
	assert.deepEqual( bandValue( { 375: { exact: 300 }, 768: { exact: 600 } }, { desktop: '600px' }, SIZES ), { value: { desktop: '600px', mobile: '300px' } }, 'the value an unread desktop holds is carried down' );
} );

test( 'bandSetting: the max-width setting on the block\'s content slot, at the slot calibration measured', () => {
	assert.deepEqual( bandSetting( db, 'sgs/container', { settings: { contentWidth: { slot: '.sgs-container__inner' }, maxWidth: { slot: '' } } } ), { attr: 'contentWidth', slot: '.sgs-container__inner' } );
	assert.equal( bandSetting( db, 'sgs/container', { settings: { maxWidth: { slot: '' } } } ), null, 'uncalibrated band' );
	assert.equal( bandSetting( db, 'sgs/container', { settings: { contentWidth: { slot: '' } } } ), null, 'a band that is the root is no band' );
	assert.equal( bandSetting( db, 'sgs/text', { settings: { maxWidth: { slot: '.x' } } } ), null, 'no content-slot setting' );
	assert.equal( bandSetting( db, 'sgs/container', { settings: { maxWidth: { slot: '.x' } } } ), null, 'a max-width setting off the content slot is no band' );
	assert.equal( bandSetting( null, 'sgs/container', { settings: {} } ), null );
} );

// Through fillTree: a container (the draft element `main`) holding two text children.
const THREE = [ 375, 768, 1440 ];
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px', 'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'row-gap': '0px', 'column-gap': '0px', 'max-width': 'none' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const setting = ( property, slot = '' ) => ( { slot, slots: [ slot ], reaches: [ slot ], property, state: null, forms: [], transform: null, reachedAt: THREE, effects: [], variants: [ 0 ] } );
const CAL = {
	'sgs/text': { block: 'sgs/text', elements: { '': tiers( DEFAULT ) }, settings: { fontSize: setting( 'font-size' ) }, discovered: {} },
	'sgs/container': { block: 'sgs/container', elements: { '': tiers( DEFAULT ), '.sgs-container__inner': tiers( { ...DEFAULT, 'max-width': '1080px' } ) }, settings: { padding: setting( 'padding', '.sgs-container__inner' ), maxWidth: setting( 'max-width' ), contentWidth: setting( 'max-width', '.sgs-container__inner' ) }, discovered: {} },
};
const SKEL = ( attributes = {}, draftSlots = undefined ) => [ { name: 'sgs/container', draftRef: 'main', attributes, ...( draftSlots ? { draftSlots } : {} ), innerBlocks: [
	{ name: 'sgs/text', draftRef: '.a', attributes: { text: 'A' } },
	{ name: 'sgs/text', draftRef: '.b', attributes: { text: 'B' } },
] } ];
const snapOf = ( r ) => ( { ...r, styles: { ...DEFAULT, ...r.styles } } );

// geometry( w ) -> { own, kids: [ a, b ] } at each read width.
function run( geometry, { attributes = {}, draftSlots, rawSnapshot = RAW, cal = CAL } = {} ) {
	const widths = Object.fromEntries( FOUR.map( ( w ) => {
		const g = geometry( w );
		return [ w, { '0:': snapOf( g.own ), '1:': { ...snapOf( g.kids[ 0 ] ), words: 'A' }, '2:': { ...snapOf( g.kids[ 1 ] ), words: 'B' }, ...( draftSlots ? { '0:.sgs-container__inner': snapOf( { ...g.own, styles: { ...g.own.styles, 'max-width': '1080px' } } ) } : {} ) } ];
	} ) );
	const skeleton = SKEL( attributes, draftSlots );
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => cal[ b ] ?? null, ledger: [], ledgerStates: [], rawSnapshot, origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}
const stacked = ( w, pad, cap ) => ( { own: own( w, pad ), kids: [ centred( w, pad, cap ), centred( w, pad, cap ) ] } );
const bandWrites = ( r ) => r.writes.filter( ( x ) => 'contentWidth' === x.attr );
const unreadBand = ( r ) => r.unread.filter( ( u ) => u.settings?.includes( 'contentWidth' ) );

test( 'MUST FAIL THROUGH FILL: a full-bleed draft section whose children span it gets contentWidth full', () => {
	const r = run( ( w ) => stacked( w, 40, Infinity ) );
	assert.deepEqual( r.tree[ 0 ].attributes.contentWidth, { desktop: 'full' } );
	assert.equal( bandWrites( r ).length, 1 );
	assert.equal( bandWrites( r )[ 0 ].how, 'band' );
	assert.equal( bandWrites( r )[ 0 ].slot, '.sgs-container__inner' );
	assert.deepEqual( unreadBand( r ), [], 'the band setting is judged, not left unread' );
	assert.ok( r.notes.some( ( n ) => /band \.sgs-container__inner contentWidth \{"desktop":"full"\}/.test( n ) ) );
} );

test( 'MUST FAIL THROUGH FILL: a draft section whose children sit in a centred 1200px column gets that cap', () => {
	const r = run( ( w ) => stacked( w, 40, 1200 ) );
	assert.deepEqual( r.tree[ 0 ].attributes.contentWidth, { desktop: '1280px' } );
	const wide = run( ( w ) => stacked( w, 0, 1400 ) );
	assert.deepEqual( wide.tree[ 0 ].attributes.contentWidth, { desktop: 'wide' } );
} );

test( 'MUST FAIL THROUGH FILL: a draft element no wider than the theme content size keeps normal and writes nothing', () => {
	const r = run( ( w ) => stacked( Math.min( w, 1080 ), 0, Infinity ) );
	assert.equal( r.tree[ 0 ].attributes.contentWidth, undefined );
	assert.deepEqual( bandWrites( r ), [] );
	assert.deepEqual( unreadBand( r ), [], 'held is judged' );
	assert.ok( r.notes.some( ( n ) => /contentWidth: \{"desktop":"normal"\} already gives the draft's band/.test( n ) ) );
	const capped = run( ( w ) => stacked( w, 0, 1080 ) );
	assert.equal( capped.tree[ 0 ].attributes.contentWidth, undefined, 'a column at the content size is the default' );
} );

test( 'negative controls through Fill: a band a finder reads, a value the node holds, an uncalibrated band and a missing snapshot', () => {
	const read = run( ( w ) => stacked( w, 40, Infinity ), { draftSlots: { '.sgs-container__inner': 'main' } } );
	assert.ok( ! bandWrites( read ).some( ( x ) => 'band' === x.how ), 'the generic path owns a read band' );
	assert.equal( read.tree[ 0 ].attributes.contentWidth, undefined, 'a read band at its default paint is held by the generic path' );
	const held = run( ( w ) => stacked( w, 40, Infinity ), { attributes: { contentWidth: { desktop: 'wide' } } } );
	assert.deepEqual( held.tree[ 0 ].attributes.contentWidth, { desktop: 'wide' } );
	const { contentWidth, ...rest } = CAL[ 'sgs/container' ].settings;
	const uncal = run( ( w ) => stacked( w, 40, Infinity ), { cal: { ...CAL, 'sgs/container': { ...CAL[ 'sgs/container' ], settings: rest } } } );
	assert.deepEqual( bandWrites( uncal ), [] );
	assert.ok( contentWidth );
	const noSizes = run( ( w ) => stacked( w, 0, 1400 ), { rawSnapshot: null } );
	assert.deepEqual( noSizes.tree[ 0 ].attributes.contentWidth, { desktop: '1400px' }, 'without theme sizes a cap is its length' );
	const blind = run( ( w ) => ( { own: own( w, 40 ), kids: [ kid( 40, 0 ), kid( 40, 0 ) ] } ) );
	assert.deepEqual( bandWrites( blind ), [] );
	assert.equal( unreadBand( blind ).length, 1, 'no drawn child, no evidence: the band stays unread' );
	const settings = { ...rest, maxWidth: { ...rest.maxWidth, slots: [ '', '.sgs-container__inner' ], reaches: [ '', '.sgs-container__inner' ] }, contentWidth: { ...contentWidth, property: 'max-height' } };
	const other = run( ( w ) => stacked( w, 40, Infinity ), { cal: { ...CAL, 'sgs/container': { ...CAL[ 'sgs/container' ], settings } } } );
	assert.equal( other.tree[ 0 ].attributes.contentWidth, undefined, 'the resolver holds max-width on the band with another setting' );
	assert.ok( other.notes.some( ( n ) => /the resolver does not hold max-width there with contentWidth/.test( n ) ) );
} );
