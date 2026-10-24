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
	const missing = run( reads, { cal: paint( 'opacity' ) } );
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
	assert.match( lacks.unmapped[ 0 ].reason, /and the properties its movement sets .*live also transitions color, background-color, border-color$/ );
	const covered = run( declared( { 'transition-property': `transform, ${ HOVER_PAINT.join( ', ' ) }` }, [ 768 ] ), { writes } );
	assert.equal( covered.settled.length, 0 );
	assert.match( covered.unmapped[ 0 ].reason, /Fill cannot tell whether the movement adds a property/ );
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
