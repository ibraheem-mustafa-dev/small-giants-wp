// A track's visible-item count (lib/fill-visible-count.mjs, Spec 48 FR-48-1, R-47-3, R-47-10): the testimonial slider's
// `slidesVisible` carries a css_property, so the skeleton never sets it; Fill reads how many cards sit side by side in the
// draft's track at 375, 768 and 1440 and writes it through the resolver, one value when every width agrees, a reported
// shape gap when they differ. Unit rules first, then through fillTree with the real framework database and resolver.
import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleCount, countSettings } from '../lib/fill-visible-count.mjs';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const THREE = [ 375, 768, 1440 ];
const SLIDE = '.sgs-testimonial-slider__stage > .sgs-testimonial-slider__track > .sgs-testimonial-slider__list > .sgs-testimonial-slider__slide:nth-of-type(1)';
const DEFAULT = { display: 'block', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'font-weight': '400', 'line-height': '24px' };
const tiers = ( paint ) => Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) );
const cal = { 'sgs/testimonial-slider': { block: 'sgs/testimonial-slider', elements: { '': tiers( DEFAULT ), [ SLIDE ]: tiers( DEFAULT ) }, settings: { slidesVisible: { slot: SLIDE, slots: [ SLIDE ], reaches: [], property: 'flex-basis', state: null, forms: [], transform: null, reachedAt: [ 768, 1440 ], effects: [], variants: [ 0 ] } }, discovered: {} } };

const rect = ( x, y, w, h = 100 ) => ( { rect: { x, y, w, h }, inFlow: true } );
// `n` cards 300 wide side by side from x 0 (a 1200 wide track), then the rest of 6 cards on the next row.
const cards = ( n ) => Array.from( { length: 6 }, ( _, i ) => rect( ( i % n ) * 300, Math.floor( i / n ) * 120, 300 ) );

test( 'visibleCount: the cards on the first card\'s row inside the track; a swipe track\'s overflow does not count', () => {
	assert.equal( visibleCount( rect( 0, 0, 1200, 300 ), cards( 3 ) ), 3 );
	assert.equal( visibleCount( rect( 0, 0, 300, 300 ), cards( 1 ) ), 1 );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), Array.from( { length: 6 }, ( _, i ) => rect( i * 300, 0, 300 ) ) ), 3, 'six cards on one row, three inside the track' );
	assert.equal( visibleCount( null, cards( 2 ) ), 2, 'no track box: the row' );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [] ), 0 );
	assert.equal( visibleCount( rect( 0, 0, 900, 100 ), [ { missing: true } ] ), 0 );
} );

test( 'countSettings: the number settings the database ties to flex, at the slot calibration measured', () => {
	assert.deepEqual( countSettings( db, 'sgs/testimonial-slider', cal[ 'sgs/testimonial-slider' ] ), [ { attr: 'slidesVisible', slot: SLIDE } ] );
	assert.deepEqual( countSettings( db, 'sgs/testimonial-slider', { settings: {} } ), [], 'uncalibrated' );
	assert.deepEqual( countSettings( db, 'sgs/text', cal[ 'sgs/testimonial-slider' ] ), [] );
} );

// A slider (the draft element `.track`) holding three testimonial cards; perWidth( w ) -> the number of cards side by side.
const SKEL = [ { name: 'sgs/testimonial-slider', draftRef: '.track', attributes: { autoplay: false, showArrows: false, showDots: false }, innerBlocks: [
	{ name: 'sgs/testimonial', draftRef: '.c1', attributes: {} },
	{ name: 'sgs/testimonial', draftRef: '.c2', attributes: {} },
	{ name: 'sgs/testimonial', draftRef: '.c3', attributes: {} },
	{ name: 'sgs/testimonial', draftRef: '.c4', attributes: {} },
] } ];
function run( perWidth ) {
	const snap = ( r ) => ( { ...r, styles: { ...DEFAULT } } );
	const widths = Object.fromEntries( THREE.map( ( w ) => {
		const n = perWidth( w );
		const c = cards( n );
		return [ w, { '0:': snap( rect( 0, 0, n * 300, 300 ) ), ...Object.fromEntries( [ 1, 2, 3, 4 ].map( ( i ) => [ `${ i }:`, snap( c[ i - 1 ] ) ] ) ) } ];
	} ) );
	const tree = cleanTree( SKEL );
	addRefs( tree, 'fx' );
	const out = fillTree( { tree, nodes: skeletonNodes( SKEL ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: ( b ) => cal[ b ] ?? null, ledger: [], ledgerStates: [], rawSnapshot: null, origin: 'http://127.0.0.1:1' } );
	return { tree, ...out };
}
const wrote = ( r ) => r.writes.filter( ( x ) => 'slidesVisible' === x.attr );

test( 'MUST FAIL THROUGH FILL: a draft track showing 2 cards at every width gets slidesVisible 2 through the resolver', () => {
	const r = run( () => 2 );
	assert.equal( r.tree[ 0 ].attributes.slidesVisible, 2 );
	assert.equal( wrote( r ).length, 1 );
	assert.equal( wrote( r )[ 0 ].how, 'visible-count' );
	assert.deepEqual( wrote( r )[ 0 ].widths, [ 375, 768, 1440 ] );
	assert.equal( r.unmapped.some( ( u ) => 'flex' === u.property ), false );
} );

test( 'MUST FAIL THROUGH FILL: counts that differ by width are a reported shape gap, never a guessed value', () => {
	const r = run( ( w ) => ( 375 === w ? 1 : 2 ) );
	assert.equal( 'slidesVisible' in ( r.tree[ 0 ].attributes || {} ), false, 'nothing written' );
	assert.equal( wrote( r ).length, 0 );
	const gap = r.unmapped.find( ( u ) => 'flex' === u.property );
	assert.ok( gap, JSON.stringify( r.unmapped ) );
	assert.match( gap.reason, /shape: slidesVisible holds one value for every width; draft has 1, 2/ );
	assert.match( gap.reason, /375: 1, 768: 2, 1440: 2/ );
} );
