// The conservation check can fail (register row R7, FR-48-8): each mechanism that turns a read into an outcome is checked
// against the case where it would claim an answer it did not give. A row a later pass takes out of UNMAPPED is settled
// only when the pass names it in its `answered` list, at the widths it answered; a row naming several icons is written
// on each icon; a write answers only the widths its tiers reproduce; a read the same run calls both equal and unwritten
// (or written by a later pass) fails; a settled row with no widths answers no width.
import test from 'node:test';
import assert from 'node:assert/strict';
import { conservation } from '../lib/census-conservation.mjs';
import { passSettled } from '../lib/fill-report.mjs';
import { dimensionWrites } from '../lib/fill-dimensions.mjs';
import { answeredWidths } from '../lib/fill-resolve-element.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs, refOf } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { frozenDb } from './fixtures/frozen-db/frozen-db.mjs';

const read = ( node, width, extra = {} ) => ( { draft: 'x', node, block: 'sgs/icon', slot: '', property: 'flex-shrink', width, value: '0', ...extra } );
const ROW = { node: 'n1', block: 'sgs/icon', slot: '', property: 'flex-shrink', value: '0', reason: 'no-setting: x', state: null };

test( 'MUST FAIL: a row a pass takes out of UNMAPPED without writing or settling it is not settled, so its read is dropped', () => {
	const rows = passSettled( [ ROW ], [], 'dimension', [] );
	assert.deepEqual( rows, [] );
	const v = conservation( { reads: [ read( 'n1', 768 ) ], report: { settled: rows }, unmapped: [] } );
	assert.equal( v.failures.length, 1, 'the read the pass never answered is a drop' );
} );

test( 'MUST FAIL: a pass\'s settled row answers only the widths the pass answered, and names the pass\'s file', () => {
	const rows = passSettled( [ ROW ], [], 'dimension', [ { ...ROW, widths: [ 768 ] } ] );
	assert.deepEqual( rows.map( ( r ) => [ r.node, r.reason, r.widths ] ), [ [ 'n1', 'dimension', [ 768 ] ] ] );
	assert.match( rows[ 0 ].detail, /lib\/fill-dimensions\.mjs/ );
	const v = conservation( { reads: [ read( 'n1', 375 ), read( 'n1', 768 ) ], report: { settled: rows }, unmapped: [] } );
	assert.deepEqual( v.failures.map( ( f ) => f.width ), [ 375 ] );
	// A row the pass keeps is not settled, and an answered row outside `before` is still the pass's answer.
	assert.deepEqual( passSettled( [ ROW ], [ ROW ], 'dimension', [] ), [] );
} );

test( 'MUST FAIL: a settled row that records no widths answers no width', () => {
	const v = conservation( { reads: [ read( 'n1', 768 ) ], report: { settled: [ { node: 'n1', slot: '', property: 'flex-shrink', value: '0', reason: 'dimension' } ] }, unmapped: [] } );
	assert.equal( v.failures.length, 1 );
} );

test( 'MUST FAIL: a read the same run calls equal and also leaves unwritten, or writes in a later pass, fails', () => {
	const equal = { node: 'n1', slot: '.sgs-icon__shape', readSlot: '', property: 'flex-shrink', value: '0', widths: [ 768 ], reason: 'equal' };
	const un = conservation( { reads: [ read( 'n1', 768 ) ], report: { settled: [ equal ] }, unmapped: [ { ...ROW } ] } );
	assert.equal( un.failures.length, 1, 'equal and unwritten contradict' );
	assert.match( un.failures[ 0 ].why ?? '', /equal/ );
	const pass = { node: 'n1', slot: '', prop: 'flex-shrink', attr: 'sgsChildSizing', widths: [ 768 ], how: 'dimension' };
	assert.equal( conservation( { reads: [ read( 'n1', 768 ) ], report: { settled: [ equal ], writes: [ pass ] }, unmapped: [] } ).failures.length, 1, 'equal and a pass write contradict' );
	// Positive: equal alone, or a write alone, conserves the read.
	assert.deepEqual( conservation( { reads: [ read( 'n1', 768 ) ], report: { settled: [ equal ] }, unmapped: [] } ).failures, [] );
	assert.deepEqual( conservation( { reads: [ read( 'n1', 768 ) ], report: { writes: [ pass ] }, unmapped: [] } ).failures, [] );
} );

test( 'MUST FAIL: a write answers only the read widths its tier values reproduce', () => {
	const draft = { 375: '10px', 768: '15px', 1440: '20px' };
	const res = { included: { 375: '10px', 1440: '20px' }, writes: [ { attr: 'gap', value: { mobile: '10px', desktop: '20px' } } ], how: 'tiers' };
	assert.deepEqual( answeredWidths( 'row-gap', draft, res ), [ 375, 1440 ], 'tablet inherits the desktop 20px, not the draft 15px' );
	assert.deepEqual( answeredWidths( 'row-gap', { ...draft, 768: '20px' }, res ), [ 375, 768, 1440 ] );
	// A Tablet sibling holds the tablet tier (the phone shows it too); a width no written tier reaches keeps the resolver's
	// verdict that it shows the value.
	assert.deepEqual( answeredWidths( 'font-size', draft, { included: { 768: '15px' }, writes: [ { attr: 'fontSizeTablet', value: '15px' } ], how: 'tiers' } ), [ 768, 1440 ] );
	assert.deepEqual( answeredWidths( 'font-size', { ...draft, 375: '15px' }, { included: { 768: '15px' }, writes: [ { attr: 'fontSizeTablet', value: '15px' } ], how: 'tiers' } ), [ 375, 768, 1440 ] );
	assert.deepEqual( answeredWidths( 'font-size', draft, { included: { 1440: '20px' }, writes: [ { attr: 'fontSize', value: '20px' } ], how: 'single' } ), [ 1440 ] );
} );

// Two logos in a flex row, both kept from shrinking by the draft, raised as one UNMAPPED row naming both.
test( 'MUST FAIL: a row naming several nodes is written on each node it names, not only on row.node', () => {
	const db = openDb( frozenDb() );
	const block = 'sgs/responsive-logo';
	const BASE = { display: 'block', 'flex-shrink': '1' };
	const cal = { block, elements: { '': Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, BASE ] ) ) }, settings: {}, discovered: {} };
	const skeleton = [ { name: 'sgs/container', draftRef: '.p', attributes: {}, innerBlocks: [ { name: block, draftRef: '.a', attributes: {} }, { name: block, draftRef: '.b', attributes: {} } ] } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const flat = [ tree[ 0 ], ...tree[ 0 ].innerBlocks ];
	const snap = ( styles ) => ( { styles, pseudo: {}, rect: { x: 0, y: 0, w: 40, h: 40 }, inFlow: true, words: '', href: null, flexItem: { w: 40, h: 40, depth: 1 } } );
	const reads = { widths: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '0:': snap( { display: 'flex' } ), '1:': snap( { 'flex-shrink': '0' } ), '2:': snap( { 'flex-shrink': '0' } ) } ] ) ), declared: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { '1:': { width: '40px' }, '2:': { width: '40px' } } ] ) ), sweep: {} };
	const [ a, b ] = [ refOf( flat[ 1 ] ), refOf( flat[ 2 ] ) ];
	const row = { node: b, nodes: [ a, b ], block, slot: '', property: 'flex-shrink', value: '0', reason: 'no-setting: planted', state: null };
	const out = dimensionWrites( { nodes: skeletonNodes( skeleton ), flat, refOf, reads, db, unmapped: [ row ], calFor: () => cal } );
	assert.deepEqual( flat[ 1 ].attributes.sgsChildSizing, { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' }, `${ a } is held too` );
	assert.deepEqual( flat[ 2 ].attributes.sgsChildSizing, { desktop: 'fixed', tablet: 'fixed', mobile: 'fixed' } );
	assert.deepEqual( out.unmapped, [] );
	assert.deepEqual( [ ...new Set( out.answered.map( ( r ) => r.node ) ) ].sort(), [ a, b ].sort() );
	assert.ok( out.answered.every( ( r ) => r.widths?.length ), 'each answer records its widths' );
	const rows = passSettled( [ row ], out.unmapped, 'dimension', out.answered );
	const v = conservation( { reads: [ a, b ].flatMap( ( n ) => [ 375, 768, 1440 ].map( ( w ) => read( n, w, { block } ) ) ), report: { settled: rows, writes: out.writes }, unmapped: out.unmapped } );
	assert.deepEqual( v.failures, [] );
} );
