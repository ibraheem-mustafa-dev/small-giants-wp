// lib/fill-motion-settle.mjs::transitionListOutcomes and lib/fill-motion-account.mjs::motionWidths: a resting
// transition-property or transition-behavior read is settled where live transitions the draft's properties (the calibrated
// default paint in order, or the written sgsMotion hover state as a set), raised with the difference named otherwise, and
// the strict conservation check credits each outcome; a node's sgsMotion write answers the widths its root was read at.
import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionListOutcomes, HOVER_PAINT } from '../lib/fill-motion-settle.mjs';
import { motionWidths } from '../lib/fill-motion-account.mjs';
import { conservation } from '../lib/census-conservation.mjs';

const mdb = { targetsOf: () => [ { target: 'root', cssElement: 'root', kind: 'root' } ] };
const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
const flat = [ { ref: 'r0' } ];
const declared = ( decl, widths = [ 375, 768, 1440 ] ) => ( { declared: Object.fromEntries( widths.map( ( w ) => [ w, { '0:': decl } ] ) ), widths: Object.fromEntries( widths.map( ( w ) => [ w, { '0:': { styles: {} } } ] ) ) } );
const paint = ( list, behaviour ) => ( { elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { 'transition-property': list, ...( behaviour ? { 'transition-behavior': behaviour } : {} ) } ] ) ) } } );
const motionWrite = ( values ) => ( { node: 'r0', block: 'sgs/button', slot: '', prop: 'motion root', attr: 'sgsMotion', after: { v: 1, elements: { root: { hover: { state: { values } } } } }, widths: [ 375, 768, 1440 ], how: 'motion' } );
const base = { 'sgs/button': { root: [ 'transform 0.18s ease', 'translate 0.18s ease', 'opacity 0.18s ease' ] } };
const run = ( reads, { cal = null, writes = [] } = {} ) => transitionListOutcomes( { nodes, flat, refOf: ( x ) => x.ref, reads, writes, mdb, db: null, calFor: () => cal, base } );
const readRows = ( reads ) => Object.entries( reads.declared ).flatMap( ( [ w, by ] ) => Object.entries( by[ '0:' ] ).filter( ( [ p ] ) => /^transition-(property|behavior)$/.test( p ) ).map( ( [ property, value ] ) => ( { node: 'r0', block: 'sgs/button', slot: '', property, width: Number( w ), value } ) ) );
const report = ( out, writes = [] ) => ( { writes, settled: out.settled } );

test( 'MUST FAIL: a list the calibrated default paint shows in order is settled equal at the read widths', () => {
	const reads = declared( { 'transition-property': 'opacity, box-shadow', 'transition-behavior': 'normal, normal' } );
	const out = run( reads, { cal: paint( 'opacity, box-shadow', 'normal, normal' ) } );
	assert.deepEqual( out.unmapped, [] );
	assert.deepEqual( out.settled.map( ( s ) => [ s.property, s.reason, s.widths ] ), [ [ 'transition-property', 'equal', [ 375, 768, 1440 ] ], [ 'transition-behavior', 'equal', [ 375, 768, 1440 ] ] ] );
	assert.equal( conservation( { reads: readRows( reads ), report: report( out ), unmapped: out.unmapped } ).failures.length, 0 );
	assert.equal( conservation( { reads: readRows( reads ), report: { writes: [], settled: [] }, unmapped: [] } ).failures.length, 6 );
} );

test( 'negative control: a property the draft transitions that live does not, another order, or another behaviour stays raised', () => {
	const reads = declared( { 'transition-property': 'opacity, box-shadow', 'transition-behavior': 'allow-discrete' }, [ 768 ] );
	const missing = run( reads, { cal: paint( 'opacity', 'normal' ) } );
	assert.equal( missing.settled.length, 0 );
	assert.match( missing.unmapped.find( ( u ) => 'transition-property' === u.property ).reason, /^no-setting: .*the draft also transitions box-shadow$/ );
	assert.match( missing.unmapped.find( ( u ) => 'transition-behavior' === u.property ).reason, /^no-setting: .*the draft times opacity allow-discrete, box-shadow allow-discrete$/ );
	assert.equal( missing.unmapped[ 0 ].value, '{"768":"opacity, box-shadow"}' );
	const order = run( declared( { 'transition-property': 'opacity, box-shadow' }, [ 768 ] ), { cal: paint( 'box-shadow, opacity' ) } );
	assert.match( order.unmapped[ 0 ].reason, /the same properties in another order$/ );
	// The raised rows still conserve their reads (an unwritten outcome), so nothing is dropped.
	assert.equal( conservation( { reads: readRows( reads ), report: report( missing ), unmapped: missing.unmapped } ).failures.length, 0 );
} );

test( 'MUST FAIL: no calibrated reading is an uncalibrated row, never an equal one', () => {
	const out = run( declared( { 'transition-property': 'box-shadow' }, [ 375 ] ), { cal: { elements: {} } } );
	assert.equal( out.settled.length, 0 );
	assert.match( out.unmapped[ 0 ].reason, /^calibration has no reading of transition-property for the block root of sgs\/button/ );
} );

test( 'MUST FAIL: a timing-only sgsMotion hover state transitions its paint and the part\'s base transitions: an equal set settles as motion', () => {
	const writes = [ motionWrite( { duration: 200, easing: 'token:easing.ease', paintDuration: 200 } ) ];
	const exact = run( declared( { 'transition-property': [ 'transform', 'translate', 'opacity', ...HOVER_PAINT ].join( ', ' ), 'transition-behavior': 'normal' } ), { writes } );
	assert.deepEqual( exact.unmapped, [] );
	assert.deepEqual( exact.settled.map( ( s ) => [ s.property, s.reason ] ), [ [ 'transition-property', 'motion' ], [ 'transition-behavior', 'motion' ] ] );
	// The draft's list (transform, box-shadow, background, color) against live: both differences are named.
	const draft = run( declared( { 'transition-property': 'transform, box-shadow, background, color', 'transition-behavior': 'normal, normal, normal, normal' } ), { writes } );
	assert.match( draft.unmapped[ 0 ].reason, /live also transitions border-color, translate, opacity; the draft also transitions background$/ );
	assert.deepEqual( draft.settled.map( ( s ) => [ s.property, s.reason ] ), [ [ 'transition-behavior', 'motion' ] ] );
} );

test( 'a moving hover state names the paint the draft does not transition, and never settles a list it cannot read back', () => {
	const writes = [ motionWrite( { scale: 1.1, duration: 350 } ) ];
	const lacks = run( declared( { 'transition-property': 'transform, box-shadow' }, [ 768 ] ), { writes } );
	assert.match( lacks.unmapped[ 0 ].reason, /and the entries its movement, effects or entrance add .*live also transitions color, background-color, border-color$/ );
	const covered = run( declared( { 'transition-property': `transform, ${ HOVER_PAINT.join( ', ' ) }` }, [ 768 ] ), { writes } );
	assert.equal( covered.settled.length, 0 );
	assert.match( covered.unmapped[ 0 ].reason, /Fill cannot tell whether the movement, an effect or the entrance adds a property/ );
} );

test( 'MUST FAIL: a node\'s sgsMotion write answers the widths its root was read at, and the strict check credits it', () => {
	const reads = declared( {}, [ 375, 768 ] );
	const doc = { v: 1, elements: { root: { hover: { state: { values: { duration: 200 } } } } } };
	assert.deepEqual( motionWidths( nodes[ 0 ], doc, reads ), [ 375, 768 ] );
	// A part's layer alone gives the root write no widths.
	assert.deepEqual( motionWidths( nodes[ 0 ], { v: 1, elements: { burger: { hover: { state: { values: { duration: 200 } } } } } }, reads ), [] );
	const read = [ { node: 'r0', block: 'sgs/button', slot: '', property: 'transition-duration', width: 768, value: '0.2s' } ];
	const write = { ...motionWrite( { duration: 200 } ), widths: motionWidths( nodes[ 0 ], doc, reads ) };
	assert.equal( conservation( { reads: read, report: { writes: [ write ] }, unmapped: [] } ).failures.length, 0 );
	assert.equal( conservation( { reads: read, report: { writes: [ { ...write, widths: [] } ] }, unmapped: [] } ).failures.length, 1 );
} );

const withRoot = ( root ) => [ { ...motionWrite( {} ), after: { v: 1, elements: { root } } } ];
const fullList = [ 'transform', 'translate', 'opacity', ...HOVER_PAINT ].join( ', ' );

test( 'MUST FAIL: a hover state with an effect, follow pointer or an entrance adds entries Fill does not rebuild, so its list never settles', () => {
	const timing = { duration: 200, paintDuration: 200 };
	const reads = declared( { 'transition-property': fullList }, [ 768 ] );
	assert.deepEqual( run( reads, { writes: withRoot( { hover: { state: { values: timing } } } ) } ).settled.map( ( s ) => s.reason ), [ 'motion' ], 'negative control: a timing-only state settles' );
	for ( const root of [ { hover: { state: { values: timing }, effects: [ { id: 'sheen-1', effect: 'sheen', trigger: 'hover', values: {} } ] } }, { hover: { state: { values: { ...timing, followPointer: true } } } }, { hover: { state: { values: timing } }, entrance: { base: { trigger: 'open' } } } ] ) {
		const out = run( reads, { writes: withRoot( root ) } );
		assert.equal( out.settled.length, 0, JSON.stringify( root ) );
		assert.match( out.unmapped[ 0 ].reason, /Fill cannot tell whether the movement, an effect or the entrance adds a property/ );
	}
} );

test( 'MUST FAIL: a transition-behavior calibration did not read is unknown, never normal', () => {
	const reads = declared( { 'transition-property': 'opacity', 'transition-behavior': 'normal' }, [ 768 ] );
	const out = run( reads, { cal: paint( 'opacity' ) } );
	assert.deepEqual( out.settled.map( ( s ) => s.property ), [ 'transition-property' ] );
	assert.match( out.unmapped.find( ( u ) => 'transition-behavior' === u.property ).reason, /^calibration has no reading of transition-behavior for the block root of sgs\/button/ );
	assert.deepEqual( run( reads, { cal: paint( 'opacity', 'normal' ) } ).unmapped, [], 'negative control: a read normal settles' );
} );

test( 'MUST FAIL: a CSS-wide list is no read, a behaviour list repeats by place, and an absent property list is all', () => {
	assert.deepEqual( run( declared( { 'transition-property': 'initial', 'transition-behavior': 'inherit' }, [ 768 ] ), { cal: paint( 'opacity', 'normal' ) } ), { settled: [], unmapped: [] } );
	const byPlace = declared( { 'transition-property': 'opacity, box-shadow, color', 'transition-behavior': 'normal, allow-discrete' }, [ 768 ] );
	assert.deepEqual( run( byPlace, { cal: paint( 'opacity, box-shadow, color', 'normal, allow-discrete, normal' ) } ).unmapped, [] );
	assert.equal( run( byPlace, { cal: paint( 'opacity, box-shadow, color', 'normal, normal, normal' ) } ).unmapped.length, 1 );
	// No transition-property: the draft transitions all, live's first entry is all.
	const all = declared( { 'transition-behavior': 'allow-discrete' }, [ 768 ] );
	assert.deepEqual( run( all, { cal: paint( 'all, opacity', 'allow-discrete, normal' ) } ).settled.map( ( s ) => [ s.property, s.reason ] ), [ [ 'transition-behavior', 'equal' ] ] );
	assert.equal( run( all, { cal: paint( 'opacity, all', 'allow-discrete, normal' ) } ).unmapped.length, 1 );
} );

test( 'MUST FAIL: a width that settles and one that differs are two rows, the raised one at rest; the draft\'s all is not the motion list', () => {
	const cal = { elements: { '': { 375: { 'transition-property': 'opacity', 'transition-behavior': 'normal' }, 768: { 'transition-property': 'color', 'transition-behavior': 'normal' } } } };
	const out = run( declared( { 'transition-property': 'opacity' }, [ 375, 768 ] ), { cal } );
	assert.deepEqual( out.settled.map( ( s ) => s.widths ), [ [ 375 ] ] );
	assert.deepEqual( out.unmapped.map( ( u ) => [ u.value, u.state ] ), [ [ '{"768":"opacity"}', null ] ] );
	assert.ok( Object.hasOwn( out.unmapped[ 0 ], 'state' ) );
	const writes = [ motionWrite( { duration: 200, paintDuration: 200 } ) ];
	const all = run( declared( { 'transition-property': 'all' }, [ 768 ] ), { writes } );
	assert.match( all.unmapped[ 0 ].reason, /: the draft also transitions all$/ );
} );

test( 'MUST FAIL: a root missing at a width, or a root layer with no values, gives the write no width there', () => {
	const reads = declared( {}, [ 375, 768 ] );
	reads.widths[ 768 ][ '0:' ] = { missing: true };
	const doc = ( values ) => ( { v: 1, elements: { root: { hover: { state: { values } } } } } );
	assert.deepEqual( motionWidths( nodes[ 0 ], doc( { duration: 200 } ), reads ), [ 375 ] );
	assert.deepEqual( motionWidths( nodes[ 0 ], doc( {} ), reads ), [] );
} );
