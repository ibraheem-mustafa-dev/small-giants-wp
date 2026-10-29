// Register D4 (Bean 2026-10-28: reduced motion is a visitor setting, bookkeeping only): a reduced-motion rule speaks for the whole
// page, so the census holds one page-level row per rule on a surface, classed held, not one row per element the rule reaches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surfaceRows, groupRows } from '../lib/census-mechanism.mjs';
import { classCounts } from '../lib/census-gap-class.mjs';

const lookup = ( slug ) => ( slug ? { slug, parent_block: null } : null );
const RM = 'a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12)';
const rm = ( node, value, reason = RM ) => ( { property: 'motion', value, node, reason, block: 'sgs/container', slot: '', state: null } );
const other = ( node ) => ( { property: 'color', value: '"red"', node, reason: 'no-setting: sgs/container has no setting for color', block: 'sgs/container', slot: '' } );
const census = ( unmapped, surface = 's' ) => surfaceRows( { client: 'c', surface, report: null, lookup, run: { unmapped, held: [], writes: [], confirm: [], tree: [] } } ).rows;

test( 'MUST FAIL: a reduced-motion rule on many elements is one page-level held row, with the elements it reaches counted', () => {
	const rows = census( [ rm( 'n1', 'RM-01' ), rm( 'n2', 'RM-01' ), rm( 'n3', 'RM-01' ), rm( 'n4', 'RM-02' ) ] );
	assert.equal( rows.length, 2 );
	assert.deepEqual( rows.map( ( r ) => [ r.draft, r.elements, r.fillClass, r.reason, r.surfaceLevel, r.block, r.side ] ), [
		[ 'RM-01', 3, 'held', 'reduced-motion', true, '(surface)', 'fill-unwritten' ],
		[ 'RM-02', 1, 'held', 'reduced-motion', true, '(surface)', 'fill-unwritten' ],
	] );
	assert.equal( rows[ 0 ].element, '(page) RM-01' );
	assert.equal( groupRows( rows ).unclassified.length, 0, 'the page-level row has a signature' );
} );

test( 'MUST FAIL: a record skipped for having no motion part, with the reduced-motion rule, joins the same page-level row', () => {
	const both = 'no declared part of sgs/button is this element (.sgs-button__icon > svg); the record is also skipped: a reduced-motion rule: the motion model removes motion under prefers-reduced-motion itself (Spec 38A §12)';
	const rows = census( [ rm( 'n1', 'RM-01' ), rm( 'n2', 'RM-01', both ) ] );
	assert.deepEqual( rows.map( ( r ) => [ r.draft, r.elements ] ), [ [ 'RM-01', 2 ] ] );
} );

test( 'negative control: the same rule on two surfaces is one row each, and every other Fill row stays one per element', () => {
	assert.equal( census( [ rm( 'n1', 'RM-01' ) ], 'a' ).length + census( [ rm( 'n1', 'RM-01' ) ], 'b' ).length, 2 );
	const rows = census( [ other( 'n1' ), other( 'n2' ), rm( 'n1', 'RM-01' ), rm( 'n2', 'RM-01' ) ] );
	assert.deepEqual( rows.map( ( r ) => [ r.kind, r.reason ] ), [ [ 'fill', 'no-setting' ], [ 'fill', 'no-setting' ], [ 'fill', 'reduced-motion' ] ] );
	assert.equal( rows.filter( ( r ) => 'reduced-motion' === r.reason ).length, 1 );
} );

test( 'the page-level row is counted once in the class counts as held', () => {
	const rows = census( [ rm( 'n1', 'RM-01' ), rm( 'n2', 'RM-01' ), rm( 'n3', 'RM-01' ) ] ).map( ( r ) => ( { ...r, gapClass: r.fillClass } ) );
	assert.deepEqual( classCounts( rows ).counts, { held: 1 } );
} );
