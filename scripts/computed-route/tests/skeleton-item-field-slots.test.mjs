// A timeline's year ring is the element that prints the entry's date: the settings the framework database places on the date
// and its ring are read at that draft element of the loop's first copy (data/skeleton-decisions.json `rules.itemFieldSlots`,
// lib/skeleton-item-field-slots.mjs), found by the field it prints. Before this the timeline had no draftSlots, so a year the
// draft draws in a gold ring was never read and the clone showed plain years (2026-11-19).
// Pure functions and a temporary folder only: no command, no site. Mutation list: tests/skeleton-item-field-slots.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { facts, N, run, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = `class Component { renderVals() { return { ms: [ { year: '1962', title: 'A shop' }, { year: '1972', title: 'Formed' }, { year: '1975', title: 'Packing' }, { year: 'Now', title: 'Customers' } ] }; } }`;
const DATE = '.sgs-timeline__list > .sgs-timeline__entry:nth-of-type(1) > .sgs-timeline__date';
const RING = [ 'dateRingSize', 'dateRingBorderWidth', 'dateRingBorderColour', 'dateRingBackgroundColour', 'dateRingBorderRadius', 'dateRingShadow', 'dateRingPadding', 'dateColour', 'dateFontSize', 'dateFontWeight' ];
const CAL = Object.fromEntries( [ ...RING, 'titleFontSize' ].map( ( s ) => [ s, { slot: 'titleFontSize' === s ? '.sgs-timeline__list > .sgs-timeline__entry:nth-of-type(1) > .sgs-timeline__content > .sgs-timeline__title' : DATE } ] ) );
const page = ( field = 'm.year' ) => N( 'section', {}, [ N( 'div', { style: 'display:grid' }, [ N( 'div', { loop: { list: 'ms', as: 'm', copies: 4 }, row: true, box: [ 150, 100 ] }, [
	N( 'span', { words: ( c ) => [ '1962', '1972', '1975', 'Now' ][ c ], text: field } ), N( 'span', { words: ( c ) => [ 'A shop', 'Formed', 'Packing', 'Customers' ][ c ], text: 'm.title' } ),
] ) ] ) ] );
const decided = { surfaces: { fixture: { 'Root/2#0': { block: 'sgs/timeline' } } } };
const timeline = ( root, o = {} ) => find( run( root, LOGIC, { clientDecisions: decided, calSettings: () => CAL, ...o } ).skeleton, ( x ) => 'sgs/timeline' === x.name )[ 0 ];

test( 'MUST FAIL: the element printing the entry\'s year is read at the date part\'s calibrated slot, and no other entry part is', () => {
	const n = timeline( page() );
	assert.deepEqual( Object.keys( n.draftSlots ), [ DATE ], 'the date and ring settings share one calibrated slot; the title is not a listed part' );
	assert.deepEqual( n.draftSlots[ DATE ], { tpl: 'Root/4#0' }, 'the slot is the year span (template 4), not the unit or the title' );
} );

test( 'negative control: a field that is no date, no rule, and no calibrated slot give no slot; a note says why', () => {
	const other = timeline( page( 'm.label' ) );
	assert.equal( other.draftSlots, undefined, 'a label is a title, not a date' );
	assert.equal( timeline( page(), { off: [ 'itemFieldSlots' ] } ).draftSlots, undefined, 'MUST FAIL without the rule' );
	assert.equal( timeline( page(), { calSettings: () => ( {} ) } ).draftSlots, undefined, 'a block with no calibrated date slot reads nothing' );
	const r = run( page(), LOGIC, { clientDecisions: decided, calSettings: () => ( {} ) } );
	assert.ok( r.proposal.rows.find( ( x ) => 'sgs/timeline' === x.block ).slotNotes.some( ( t ) => /no element slot for the date part/.test( t ) ) );
	const blank = run( page( 'm.label' ), LOGIC, { clientDecisions: decided, calSettings: () => CAL } );
	assert.ok( blank.proposal.rows.find( ( x ) => 'sgs/timeline' === x.block ).slotNotes.some( ( t ) => /no element of the draft's first entry prints the date field/.test( t ) ) );
} );

test( 'MUST FAIL: the rule names an item key and css_elements the block has', () => {
	const bad = ( blocks ) => {
		const f = facts( REPO );
		f.decisions.rules.itemFieldSlots = { blocks };
		return decisionsProblems( f ).filter( ( p ) => /itemFieldSlots/.test( p ) );
	};
	assert.deepEqual( bad( [ { block: 'sgs/timeline', parts: [ { key: 'date', elements: [ 'date', 'dateRing' ] } ] } ] ), [] );
	assert.equal( bad( [ { block: 'sgs/timeline', parts: [ { key: 'date', elements: [ 'noSuchPart' ] } ] } ] ).length, 1 );
	assert.equal( bad( [ { block: 'sgs/timeline', parts: [ { key: 'date', elements: [] } ] } ] ).length, 1 );
	assert.equal( bad( [ { block: 'sgs/noSuchBlock', parts: [ { key: 'date', elements: [ 'date' ] } ] } ] ).length >= 1, true );
} );
