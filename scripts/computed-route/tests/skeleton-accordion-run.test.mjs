// An accordion made from a run of items whose parent holds other content has no wrapper element of its own (lib/skeleton-write-units.mjs::buildAccordion),
// and it was built from the multiple-open and open-item settings alone: no category lines, no toggle icon and no draft element,
// so Fill read nothing for it and the page showed plain rows with chevrons where the draft has topic lines, a plus in a ring and an
// open row that is painted (Help's question list, 2026-11-19). It now carries the settings an accordion with a wrapper carries
// and reads its look at the box the items sit in (its parent) and at the items' parts, unless that parent paints or pads itself
// (a container's own look, never read twice). Pure functions only: no command is spawned and no site is contacted.
// Mutation list: tests/skeleton-accordion-run.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, row, find } from './fixtures/skeleton-widgets/build.mjs';

const LOGIC = `class Component {
	state = { faq: 0 };
	renderVals() {
		const S = this.state;
		return { faqs: [ [ 'Ordering', 'When will it arrive?', 'In three days.' ], [ 'Allergens', 'What is in them?', 'Oats and milk.' ], [ 'Gifts', 'Can I send one?', 'Yes, with a note.' ] ].map( ( [ c, q, a ], i ) => ( { cat: c, q, a, open: S.faq === i, toggle: () => this.setState( { faq: S.faq === i ? -1 : i } ) } ) ) };
	}
}`;
const ring = N( 'span', { attrs: { 'aria-hidden': 'true' }, box: [ 36, 36 ], words: '+', style: ( c ) => `width:36px;height:36px;transform:rotate(${ 0 === c ? 45 : 0 }deg)` } );
const unit = N( 'div', { loop: { list: 'faqs', as: 'f', copies: 3 } }, [
	N( 'button', { click: 'f.toggle' }, [
		N( 'span', { style: 'font-size:12px', words: ( c ) => [ 'Ordering', 'Allergens', 'Gifts' ][ c ], text: 'f.cat' } ),
		N( 'span', { style: 'font-size:19px', words: ( c ) => [ 'When will it arrive?', 'What is in them?', 'Can I send one?' ][ c ], text: 'f.q' } ),
		ring,
	] ),
	N( 'p', { ifOn: '{{ f.open }}', shownIn: [ 0 ], words: ( c ) => [ 'In three days.', 'Oats and milk.', 'Yes, with a note.' ][ c ], text: 'f.a' } ),
] );
// The list's parent also holds a count line (so the items are a run, not a wrapper's whole content).
const page = ( recordStyle = [] ) => N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column;gap:12px', recordStyle }, [ N( 'div', { words: '3 answers' } ), unit ] ) ] );
const accordion = ( r ) => find( r.skeleton, ( x ) => 'sgs/accordion' === x.name )[ 0 ];
const ONE = '.c:nth-of-type(1)';
const TWO = '.c:nth-of-type(2)';
const cal = { headerFontWeight: { slot: `${ TWO } > .h` }, itemBackgroundOpen: { slot: ONE, slots: [ ONE ] }, itemShadow: { slot: ONE, slots: [ ONE, TWO ] }, headerPadding: { slot: `${ ONE } > .h`, slots: [ `${ ONE } > .h`, `${ TWO } > .h` ] } };
const calSettings = ( slug ) => ( 'sgs/accordion' === slug ? cal : {} );

test( 'MUST FAIL: an accordion with no wrapper element carries the category-line and toggle-icon settings its units give', () => {
	const acc = accordion( run( page(), LOGIC ) );
	assert.equal( acc.attributes.categoryEyebrowAlways, true, 'the units print a category line' );
	assert.equal( acc.attributes.openIcon, 'plus', 'the typed plus is the toggle icon' );
	assert.equal( acc.attributes.closeIcon, 'x', 'a plus turned 45 degrees is a cross' );
} );

test( 'MUST FAIL: an accordion with no wrapper element reads the box the items sit in and the items\' parts', () => {
	const r = run( page(), LOGIC, { calSettings } );
	const acc = accordion( r );
	assert.equal( acc.draftRef.tpl, 'Root/2#0', 'the parent is the accordion\'s draft element' );
	assert.deepEqual( acc.draftSlots[ ONE ], { tpl: 'Root/4#0' }, 'the closed unit\'s row is read at the calibrated path' );
	assert.deepEqual( acc.draftSlots[ `${ TWO } > .h` ], { tpl: 'Root/5#1' }, 'the header of the closed unit is read too' );
	const parent = find( r.skeleton, ( x ) => x.draftRef?.tpl === 'Root/2#0' && x.name !== 'sgs/accordion' )[ 0 ];
	assert.deepEqual( parent.innerBlocks.map( ( x ) => x.name ), [ 'sgs/text', 'sgs/accordion' ], 'the parent keeps its block and the count line' );
	assert.match( row( r, 'Root/4#0' ).unitNote, /read at their parent Root\/2#0/ );
} );

test( 'negative control: a parent that paints itself is the container\'s own look, so the accordion keeps its settings and reads no box', () => {
	const r = run( page( [ [ 'background-color', '#ffffff' ], [ 'border-top-width', '2px' ], [ 'border-top-style', 'solid' ] ] ), LOGIC, { calSettings } );
	const acc = accordion( r );
	assert.equal( acc.draftRef, undefined, 'no draft element: the parent\'s paint is read once, by the container' );
	assert.equal( acc.draftSlots, undefined );
	assert.equal( acc.attributes.categoryEyebrowAlways, true, 'the settings stay' );
	assert.match( row( r, 'Root/4#0' ).unitNote, /paints or pads itself/ );
} );

test( 'negative control: a padded parent is not read either', () => {
	const acc = accordion( run( page( [ [ 'padding-top', '24px' ], [ 'padding-left', '24px' ] ] ), LOGIC, { calSettings } ) );
	assert.equal( acc.draftRef, undefined );
	assert.equal( acc.attributes.openIcon, 'plus' );
} );

test( 'negative control: an accordion with a wrapper of its own is unchanged: the wrapper is its draft element', () => {
	const only = N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column' }, [ unit ] ) ] );
	const acc = accordion( run( only, LOGIC, { calSettings } ) );
	assert.equal( acc.draftRef.tpl, 'Root/2#0' );
	assert.equal( acc.attributes.categoryEyebrowAlways, true );
} );
