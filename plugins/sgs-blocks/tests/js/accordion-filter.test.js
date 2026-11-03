/**
 * @jest-environment jsdom
 *
 * Accordion filter module: matching over heading plus answer, chips, the count template, the one settled announcement,
 * restoring each item's open state, focus, and Escape.
 */
const ITEMS = [
	[ 'Delivery', 'When will my order arrive?', 'Posted tracked in 3 days.', true ],
	[ 'Delivery', 'Do you deliver across the UK?', 'Yes, anywhere.', false ],
	[ 'Gifting', 'Can I send a gift?', 'Yes, add a note at checkout.', true ],
	[ 'Subscriptions', 'Can I pause?', 'Any time, online.', false ],
];

function build( { multiple = false } = {} ) {
	document.body.innerHTML = `<div class="sgs-accordion" data-filter="true" data-allow-multiple="${ multiple }">
		<div class="sgs-accordion__filter" data-sgs-accordion-filter hidden>
			<div role="search"><label for="s">Search</label><input class="sgs-accordion__search-input" type="search" id="s"></div>
			<div role="group" aria-label="Filter by topic">
				<button type="button" class="sgs-accordion__chip" aria-pressed="true" data-category="">All</button>
				<button type="button" class="sgs-accordion__chip" aria-pressed="false" data-category="Delivery">Delivery</button>
				<button type="button" class="sgs-accordion__chip" aria-pressed="false" data-category="Gifting">Gifting</button>
				<button type="button" class="sgs-accordion__chip" aria-pressed="false" data-category="Subscriptions">Subscriptions</button>
			</div>
			<p class="sgs-accordion__count" data-template="{count} answers" data-singular="{count} answer"><span class="sgs-accordion__count-text" aria-hidden="true">4 answers</span><span role="status" aria-live="polite" data-sgs-accordion-live></span></p>
		</div>
		${ ITEMS.map(
			( [ cat, q, a, open ] ) =>
				`<details class="sgs-accordion-item" data-category="${ cat }"${ open ? ' open' : '' }><summary><span class="sgs-accordion-item__title">${ q }</span></summary><div class="sgs-accordion-item__content"><p>${ a }</p></div></details>`
		).join( '' ) }
		<div class="sgs-accordion__empty" data-sgs-accordion-empty hidden>Nothing matches that yet.</div>
	</div>`;
	jest.resetModules();
	require( '../../src/blocks/accordion/filter.js' );
	return {
		input: document.querySelector( '.sgs-accordion__search-input' ),
		chips: [ ...document.querySelectorAll( '.sgs-accordion__chip' ) ],
		items: [ ...document.querySelectorAll( '.sgs-accordion-item' ) ],
		live: document.querySelector( '[data-sgs-accordion-live]' ),
		painted: document.querySelector( '.sgs-accordion__count-text' ),
		empty: document.querySelector( '[data-sgs-accordion-empty]' ),
		bar: document.querySelector( '[data-sgs-accordion-filter]' ),
	};
}

const type = ( input, value ) => {
	input.value = value;
	input.dispatchEvent( new Event( 'input', { bubbles: true } ) );
};
const visible = ( items ) => items.map( ( item ) => ! item.hidden );
const openState = ( items ) => items.map( ( item ) => item.open );

beforeEach( () => jest.useFakeTimers() );
afterEach( () => jest.useRealTimers() );

test( 'the bar is revealed and nothing is announced on first paint', () => {
	const { bar, live, painted } = build();
	expect( bar.hidden ).toBe( false );
	expect( live.textContent ).toBe( '' );
	expect( painted.textContent ).toBe( '4 answers' );
} );

test( 'search matches the heading and the answer, case and edge-space insensitive', () => {
	const { input, items } = build();
	type( input, '  TRACKED ' );
	expect( visible( items ) ).toEqual( [ true, false, false, false ] );
	type( input, 'gift' );
	expect( visible( items ) ).toEqual( [ false, false, true, false ] );
	type( input, 'checkout' );
	expect( visible( items ) ).toEqual( [ false, false, true, false ] );
} );

test( 'the count and the live region speak once the query settles: singular, plural and zero', () => {
	const { input, live, painted } = build();
	type( input, 'y' );
	type( input, 'ye' );
	type( input, 'yes' );
	expect( live.textContent ).toBe( '' );
	jest.advanceTimersByTime( 300 );
	expect( live.textContent ).toBe( '2 answers' );
	expect( painted.textContent ).toBe( '2 answers' );
	type( input, 'pause' );
	jest.advanceTimersByTime( 300 );
	expect( live.textContent ).toBe( '1 answer' );
	type( input, 'zzzz' );
	jest.advanceTimersByTime( 300 );
	expect( live.textContent ).toBe( '0 answers' );
} );

test( 'no match shows the empty message; a match hides it', () => {
	const { input, empty } = build();
	type( input, 'zzzz' );
	expect( empty.hidden ).toBe( false );
	type( input, '' );
	expect( empty.hidden ).toBe( true );
} );

test( 'a chip filters, and the chip and the search intersect', () => {
	const { input, chips, items } = build();
	chips[ 1 ].click();
	expect( visible( items ) ).toEqual( [ true, true, false, false ] );
	expect( chips.map( ( c ) => c.getAttribute( 'aria-pressed' ) ) ).toEqual( [ 'false', 'true', 'false', 'false' ] );
	type( input, 'uk' );
	expect( visible( items ) ).toEqual( [ false, true, false, false ] );
} );

test( 'pressing the pressed chip again returns to All', () => {
	const { chips, items } = build();
	chips[ 2 ].click();
	chips[ 2 ].click();
	expect( visible( items ) ).toEqual( [ true, true, true, true ] );
	expect( chips[ 0 ].getAttribute( 'aria-pressed' ) ).toBe( 'true' );
} );

test( 'filtered-out items are closed and clearing restores every prior open state (multiple)', () => {
	const { input, items } = build( { multiple: true } );
	expect( openState( items ) ).toEqual( [ true, false, true, false ] );
	type( input, 'pause' );
	expect( openState( items ) ).toEqual( [ false, false, false, false ] );
	type( input, '' );
	expect( openState( items ) ).toEqual( [ true, false, true, false ] );
} );

test( 'an exclusive accordion restores at most one open item', () => {
	const { input, items } = build( { multiple: false } );
	type( input, 'pause' );
	type( input, '' );
	expect( openState( items ).filter( Boolean ) ).toHaveLength( 1 );
	expect( items[ 0 ].open ).toBe( true );
} );

test( 'a chip press then All restores the open state too', () => {
	const { chips, items } = build( { multiple: true } );
	chips[ 3 ].click();
	expect( openState( items ) ).toEqual( [ false, false, false, false ] );
	chips[ 0 ].click();
	expect( openState( items ) ).toEqual( [ true, false, true, false ] );
} );

test( 'focus inside an item the filter hides moves to the search box; a chip press keeps its focus', () => {
	const { input, items, chips } = build( { multiple: true } );
	items[ 0 ].querySelector( 'summary' ).tabIndex = 0;
	items[ 0 ].querySelector( 'summary' ).focus();
	type( input, 'pause' );
	expect( document.activeElement ).toBe( input );
	type( input, '' );
	chips[ 3 ].focus();
	chips[ 3 ].click();
	expect( document.activeElement ).toBe( chips[ 3 ] );
} );

test( 'Escape in the search box clears it and shows every item', () => {
	const { input, items } = build();
	type( input, 'pause' );
	input.dispatchEvent( new KeyboardEvent( 'keydown', { key: 'Escape', bubbles: true } ) );
	expect( input.value ).toBe( '' );
	expect( visible( items ) ).toEqual( [ true, true, true, true ] );
} );
