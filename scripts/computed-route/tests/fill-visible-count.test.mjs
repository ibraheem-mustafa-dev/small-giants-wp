// A track's visible-item count (lib/fill-visible-count.mjs, Spec 48 FR-48-1, R-47-3, R-47-10): the testimonial slider's
// `slidesVisible` carries a css_property, so the skeleton never sets it; Fill reads how many cards sit side by side inside the
// draft's track at 375, 768 and 1440 and writes the per-device object the setting holds. Unit rules first, then through
// fillTree with the real framework database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleCount, countSettings } from '../lib/fill-visible-count.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const SLIDE = '.sgs-testimonial-slider__stage > .sgs-testimonial-slider__track > .sgs-testimonial-slider__slide:nth-of-type(1)';
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const calOf = ( block ) => ( { block, elements: { '': tiers( DEFAULT ), [ SLIDE ]: tiers( DEFAULT ) }, settings: { slidesVisible: { slot: SLIDE, slots: [ SLIDE ], reaches: [], property: 'flex-basis', state: null, forms: [], transform: null, reachedAt: [ 768, 1440 ], effects: [], variants: [ 0 ] } }, discovered: {} } );
const cal = { 'sgs/testimonial-slider': calOf( 'sgs/testimonial-slider' ) };

const rect = ( x, y, w, h = 100 ) => ( { rect: { x, y, w, h }, inFlow: true } );

test( 'visibleCount: the cards on the first card\'s row inside the track; a swipe track\'s overflow and a peeking card do not count', () => {
	const grid = ( n ) => Array.from( { length: 6 }, ( _, i ) => rect( ( i % n ) * 300, Math.floor( i / n ) * 120, 300 ) );
	assert.equal( visibleCount( rect( 0, 0, 900, 300 ), grid( 3 ) ), 3, 'a wrapped grid: the first row' );
	assert.equal( visibleCount( rect( 0, 0, 900, 300 ), [ rect( 0, 0, 400 ), rect( 450, 0, 400 ), rect( 225, 120, 400 ) ] ), 2, 'a staggered second row is not side by side' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), Array.from( { length: 6 }, ( _, i ) => rect( i * 300, 0, 300 ) ) ), 3, 'six cards on one row, three inside the track' );
	assert.equal( visibleCount( rect( 0, 0, 375, 100 ), [ rect( 20, 0, 288 ), rect( 330, 0, 288 ) ] ), 1, 'the second card peeks in at the edge' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [ rect( 0, 0, 300 ), rect( 300, 0, 300 ), rect( 601, 0, 300 ) ] ), 3, 'a sub-pixel overhang is inside' );
	assert.equal( visibleCount( null, grid( 2 ) ), 2, 'no track box: the row' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [] ), 0 );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [ { missing: true }, { rect: { x: 0, y: 0, w: 0, h: 0 } } ] ), 0, 'a missing or hidden card is not drawn' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [ rect( 0, 0, 300 ), { ...rect( 300, 0, 300 ), inFlow: false } ] ), 1, 'an out-of-flow card is no slide' );
} );

test( 'countSettings: the number settings the database ties to flex, at the slot calibration measured', () => {
	assert.deepEqual( countSettings( db, 'sgs/testimonial-slider', cal[ 'sgs/testimonial-slider' ] ), [ { attr: 'slidesVisible', slot: SLIDE } ] );
	assert.deepEqual( countSettings( db, 'sgs/testimonial-slider', { settings: {} } ), [], 'uncalibrated' );
	assert.deepEqual( countSettings( db, 'sgs/text', cal[ 'sgs/testimonial-slider' ] ), [], 'a block with no flex count setting' );
	assert.deepEqual( countSettings( db, 'sgs/container', { settings: { scrollItemWidth: { slot: SLIDE } } } ), [], 'a flex setting that holds no number (a width object)' );
} );

// A slider (the draft element `.track`) holding six testimonial cards in one swiped row, each `card( w )` wide with a 22px gap
// from x 20 inside a track `w` wide; perWidth( w ) -> how many cards fit inside the track.
const SKEL = [ { name: 'sgs/testimonial-slider', draftRef: '.track', attributes: { autoplay: false }, innerBlocks: [ 1, 2, 3, 4, 5, 6 ].map( ( i ) => ( { name: 'sgs/testimonial', draftRef: `.c${ i }`, attributes: {} } ) ) } ];
function run( perWidth, { calFor = ( b ) => cal[ b ] ?? null, skel = SKEL, hide = [], wide = [], withDb = db } = {} ) {
	const snap = ( r ) => ( { ...r, styles: { ...DEFAULT } } );
	const widths = Object.fromEntries( THREE.map( ( w ) => {
		const n = perWidth( w );
		const card = wide.includes( w ) ? w + 100 : ( w - 40 - ( n - 1 ) * 22 ) / n;
		const cards = [ 1, 2, 3, 4, 5, 6 ].map( ( i ) => [ `${ i }:`, hide.includes( w ) ? { missing: true } : snap( rect( 20 + ( i - 1 ) * ( card + 22 ), 0, card, 300 ) ) ] );
		return [ w, { '0:': hide.includes( w ) ? { missing: true } : snap( rect( 0, 0, w, 340 ) ), ...Object.fromEntries( cards ) } ];
	} ) );
	const tree = cleanTree( skel );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( skel ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db: withDb, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor, ledger: [], ledgerStates: [], rawSnapshot: null, origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}
const wrote = ( r ) => r.writes.filter( ( x ) => 'slidesVisible' === x.attr );

test( 'MUST FAIL THROUGH FILL: a rail showing 3 cards at 1440, 2 at 768 and 1 at 375 gets slidesVisible { desktop 3, tablet 2, mobile 1 }', () => {
	const r = run( ( w ) => ( { 1440: 3, 768: 2, 375: 1 }[ w ] ) );
	assert.deepEqual( r.tree[ 0 ].attributes.slidesVisible, { desktop: 3, tablet: 2, mobile: 1 } );
	assert.equal( wrote( r ).length, 1 );
	assert.equal( wrote( r )[ 0 ].how, 'visible-count' );
	assert.deepEqual( wrote( r )[ 0 ].widths, [ 375, 768, 1440 ] );
	assert.equal( r.unmapped.some( ( u ) => 'flex' === u.property ), false );
	assert.equal( r.unread.some( ( u ) => /slidesVisible/.test( JSON.stringify( u ) ) ), false, 'the setting is judged, so no unread row names it' );
} );

test( 'MUST FAIL THROUGH FILL: the count replaces a value the skeleton or an earlier pass left, and equal counts are written for every tier', () => {
	const skel = [ { ...SKEL[ 0 ], attributes: { slidesVisible: { desktop: 3 } } } ];
	const r = run( () => 2, { skel } );
	assert.deepEqual( r.tree[ 0 ].attributes.slidesVisible, { desktop: 2, tablet: 2, mobile: 2 } );
	assert.deepEqual( wrote( r )[ 0 ].before, { desktop: 3 } );
} );

test( 'negative controls: no card drawn at 1440, no child cards, or no calibrated slot write nothing; a hidden tier is left to inherit', () => {
	assert.equal( wrote( run( () => 2, { hide: [ 1440 ] } ) ).length, 0, 'no desktop reading: nothing is guessed' );
	assert.deepEqual( run( () => 2, { hide: [ 375 ] } ).tree[ 0 ].attributes.slidesVisible, { desktop: 2, tablet: 2 }, 'the mobile tier the draft does not draw is not written' );
	const bare = [ { ...SKEL[ 0 ], innerBlocks: [] } ];
	assert.equal( wrote( run( () => 2, { skel: bare } ) ).length, 0 );
	const uncal = run( () => 2, { calFor: ( b ) => ( 'sgs/testimonial-slider' === b ? { ...calOf( b ), settings: {} } : cal[ b ] ?? null ) } );
	assert.equal( wrote( uncal ).length, 0 );
	assert.equal( 'slidesVisible' in ( uncal.tree[ 0 ].attributes || {} ), false );
} );

test( 'MUST FAIL: cards stacked in one place (a fade slider) are one visible card; a card at opacity 0 or visibility hidden is not seen', () => {
	const stack = ( n, view = () => undefined ) => Array.from( { length: n }, ( _, i ) => ( { ...rect( 20, 0, 600 ), view: view( i ) } ) );
	assert.equal( visibleCount( rect( 0, 0, 1440, 400 ), stack( 6 ) ), 1, 'six cards in one grid cell' );
	assert.equal( visibleCount( rect( 0, 0, 1440, 400 ), stack( 6, ( i ) => ( { opacity: i ? 0 : 1 } ) ) ), 1 );
	const pair = [ rect( 0, 0, 400 ), { ...rect( 420, 0, 400 ), view: { opacity: 0 } }, { ...rect( 840, 0, 400 ), view: { visibility: 'hidden' } } ];
	assert.equal( visibleCount( rect( 0, 0, 1440, 400 ), pair ), 1, 'the unseen cards beside the shown one do not count' );
	assert.equal( visibleCount( rect( 0, 0, 1440, 400 ), [ rect( 0, 0, 400 ), rect( 150, 0, 400 ) ] ), 1, 'overlapping by more than half a card is one place' );
	assert.equal( visibleCount( rect( 0, 0, 1440, 400 ), [ rect( 0, 0, 400 ), rect( 300, 0, 400 ) ] ), 2, 'negative control: a quarter overlap (a fanned deck) is two cards' );
} );

test( 'MUST FAIL: a card wider than the track still shows one card, and the clipping ancestor and the page cut the track', () => {
	assert.equal( visibleCount( rect( 0, 0, 300, 100 ), [ rect( 0, 0, 340 ), rect( 362, 0, 340 ) ] ), 1 );
	const three = [ rect( 0, 0, 300 ), rect( 300, 0, 300 ), rect( 600, 0, 300 ) ];
	assert.equal( visibleCount( { ...rect( 0, 0, 900, 100 ), view: { clip: { x: 0, w: 600 } } }, three ), 2, 'the track\'s clipping ancestor shows two' );
	assert.equal( visibleCount( { ...rect( 0, 0, 900, 100 ), view: { page: 768 } }, three ), 2, 'the page is 768 wide' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), three.map( ( c ) => ( { ...c, view: { clip: { x: 0, w: 600 } } } ) ) ), 2, 'each card\'s own clipping ancestor' );
	assert.equal( visibleCount( { ...rect( 0, 0, 900, 100 ), view: { clip: null, page: 1440, opacity: 1, visibility: 'visible' } }, three ), 3, 'negative control: no clip on a wide page' );
} );

test( 'MUST FAIL THROUGH FILL: a tablet whose card is wider than the track writes 1 there, never inheriting the desktop count', () => {
	const r = run( ( w ) => ( { 1440: 3, 768: 2, 375: 1 }[ w ] ), { wide: [ 768 ] } );
	assert.deepEqual( r.tree[ 0 ].attributes.slidesVisible, { desktop: 3, tablet: 1, mobile: 1 } );
} );

test( 'a setting holding one number refuses counts that differ by width, and the gap is no second unread row', () => {
	// A synthetic framework row: the slider's number-only autoplaySpeed tied to flex, calibrated at the slide.
	const fake = new Proxy( db, { get: ( t, k ) => ( 'prepare' === k ? ( sql ) => ( /css_property = 'flex'/.test( sql ) ? { all: () => [ { attr_name: 'autoplaySpeed' } ] } : t.prepare( sql ) ) : ( 'function' === typeof t[ k ] ? t[ k ].bind( t ) : t[ k ] ) ) } );
	const one = calOf( 'sgs/testimonial-slider' );
	one.settings = { autoplaySpeed: { ...one.settings.slidesVisible } };
	const calFor = ( b ) => ( 'sgs/testimonial-slider' === b ? one : cal[ b ] ?? null );
	const r = run( ( w ) => ( 375 === w ? 1 : 2 ), { calFor, withDb: fake } );
	assert.equal( 'autoplaySpeed' in ( r.tree[ 0 ].attributes || {} ), false, 'nothing guessed' );
	const gap = r.unmapped.find( ( u ) => 'flex' === u.property );
	assert.match( gap?.reason ?? '', /shape: autoplaySpeed holds one value for every width; draft has 2, 1/ );
	assert.equal( r.unread.filter( ( u ) => /autoplaySpeed/.test( JSON.stringify( u ) ) ).length, 0, 'the setting is judged once, as the gap' );
	const same = run( () => 2, { calFor, withDb: fake } );
	assert.equal( same.tree[ 0 ].attributes.autoplaySpeed, 2, 'negative control: equal counts are the one number' );
} );
