// An accordion unit is a disclosure (Spec 48 FR-48-6, lib/skeleton-widgets.mjs::widgetModel): its control toggles the very state
// key its panel's condition reads, and its words outside the panel are all its control's. A row of product cards, each with an
// "Add to bag" button adding to a keyed basket and an "In basket" note shown under a condition reading that basket, stays cards
// (MUST FAIL). Pure functions only: no command is spawned and no site is contacted. Mutation list: tests/skeleton-accordion-toggle.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { N, run, row, find } from './fixtures/skeleton-widgets/build.mjs';

const any = ( r ) => r.proposal.rows.some( ( x ) => 'accordion' === x.rule || 'accordionItem' === x.rule );
const SHOP_LOGIC = ( add = '{ bag: { ...S.bag, [ id ]: ( S.bag[ id ] || 0 ) + 1 } }' ) => `class Component {
	state = { bag: {} };
	renderVals() {
		const S = this.state;
		return {
			products: [ [ 'p1', 'Oat bar', '3.00' ], [ 'p2', 'Date bite', '2.50' ], [ 'p3', 'Seed loaf', '4.20' ] ].map( ( [ id, name, price ] ) => ( { id, name, price, inBag: !! S.bag[ id ], add: () => this.setState( ${ add } ) } ) ),
		};
	}
}`;
const NAMES = [ 'Oat bar', 'Date bite', 'Seed loaf' ];
const PRICES = [ '3.00', '2.50', '4.20' ];
// A home-page row of product cards: name, price, an add button and the note the basket shows (the first card is in the basket).
const card = ( o = {} ) => N( 'div', { loop: { list: 'products', as: 'p', copies: 3 } }, [
	...( o.bare ? [] : [ N( 'h3', { words: ( c ) => NAMES[ c ], text: 'p.name' } ), N( 'span', { words: ( c ) => PRICES[ c ], text: 'p.price' } ) ] ),
	N( 'button', { click: 'p.add', words: o.label ?? 'Add to bag' } ),
	N( 'p', { ifOn: '{{ p.inBag }}', shownIn: [ 0 ], words: o.note ?? 'In basket' } ),
] );
const cards = ( o = {} ) => N( 'section', {}, [ N( 'div', { style: 'display:grid;grid-template-columns:repeat(3,1fr)' }, [ card( o ) ] ) ] );

test( 'MUST FAIL: a row of product cards whose "Add to bag" adds to a keyed basket stays cards, never an accordion titled "Add to bag"', () => {
	const r = run( cards(), SHOP_LOGIC() );
	assert.equal( any( r ), false, 'no unit is an accordion item' );
	assert.equal( find( r.skeleton, ( x ) => 'sgs/accordion' === x.name ).length, 0 );
	assert.ok( ! find( r.skeleton, ( x ) => 'Add to bag' === x.attributes?.title ).length, 'no item is titled with the button\'s words' );
	assert.equal( row( r, 'Root/4#0' ).block, 'sgs/heading', 'each card keeps its name as a heading' );
} );

test( 'MUST FAIL: a control that only sets the key (an add, even on a card with no other words) opens no disclosure', () => {
	assert.equal( any( run( cards( { bare: true } ), SHOP_LOGIC() ) ), false, 'an add that only grows the basket count' );
	assert.equal( any( run( cards( { bare: true } ), SHOP_LOGIC( '{ bag: { ...S.bag, [ id ]: true } }' ) ) ), false, 'an add that sets the item true and never clears it' );
} );

test( 'MUST FAIL: a card whose button toggles its own note (a save heart) is still a card when it holds words beside the button', () => {
	const toggle = '{ bag: { ...S.bag, [ id ]: ! S.bag[ id ] } }';
	assert.equal( any( run( cards( { label: 'Save', note: 'Saved' } ), SHOP_LOGIC( toggle ) ) ), false, 'the name and price outside the button make it a card' );
	assert.equal( any( run( cards( { bare: true, label: 'Save', note: 'Saved' } ), SHOP_LOGIC( toggle ) ) ), true, 'negative control: a bare toggle with its panel is a disclosure unit' );
} );

test( 'negative control: a question row whose handler sets and clears the key in two writes is an accordion', () => {
	const FAQ = `class Component {
	state = { faq: 0 };
	renderVals() {
		const S = this.state;
		return { faqs: [ 'a', 'b', 'c' ].map( ( q, i ) => ( { q, a: 'Answer ' + q, open: S.faq === i, toggle: () => ( S.faq === i ? this.setState( { faq: null } ) : this.setState( { faq: i } ) ) } ) ) };
	}
}`;
	const unit = N( 'div', { loop: { list: 'faqs', as: 'f', copies: 3 } }, [ N( 'button', { click: 'f.toggle', words: ( c ) => [ 'a', 'b', 'c' ][ c ], text: 'f.q' } ), N( 'p', { ifOn: '{{ f.open }}', shownIn: [ 0 ], words: 'Answer a', text: 'f.a' } ) ] );
	const r = run( N( 'section', {}, [ N( 'div', { style: 'display:flex;flex-direction:column' }, [ unit ] ) ] ), FAQ );
	assert.equal( row( r, 'Root/2#0' ).block, 'sgs/accordion' );
} );
