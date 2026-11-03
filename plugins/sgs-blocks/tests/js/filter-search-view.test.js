/**
 * @jest-environment jsdom
 *
 * Negative control for the shared filter-text extraction: filter-search's view drives the same fixtures to the same
 * visible chips and status text it showed when the matching was inline.
 */
const QUERIES = [ '', 'ap', '  AP  ', 'zzz', 'berry', 'Ban', ' ' ];

function chipsDom() {
	const item = ( t ) => `<div class="wc-block-product-filter-chips__item"><span class="wc-block-product-filter-chips__text">${ t }</span></div>`;
	document.body.innerHTML = `<div class="wp-block-woocommerce-product-filter-attribute">
		<div data-sgs-filter-search data-sgs-filter-search-mode="chips">
			<input class="sgs-filter-search__input" type="search">
			<p class="sgs-filter-search__status" data-total="5"></p>
			<p class="sgs-filter-search__empty" hidden>None</p>
		</div>
		${ [ 'Apple', 'Banana', 'Blueberry', 'Grape', ' Pineapple ' ].map( item ).join( '' ) }
	</div>`;
}

function termsDom() {
	const item = ( t ) => `<li class="sgs-filter-search__term-item" data-term-label="${ t.toLowerCase() }">${ t }</li>`;
	document.body.innerHTML = `<div data-sgs-filter-search data-sgs-filter-search-mode="terms">
		<input class="sgs-filter-search__input" type="search">
		<p class="sgs-filter-search__status" data-total="3"></p>
		<p class="sgs-filter-search__empty" hidden>None</p>
		<ul>${ [ 'Cakes', 'Cookies', 'Caramel' ].map( item ).join( '' ) }</ul>
	</div>`;
}

function snapshot( build, itemSelector ) {
	jest.resetModules();
	build();
	require( '../../src/blocks/filter-search/view.js' );
	const input = document.querySelector( '.sgs-filter-search__input' );
	return QUERIES.map( ( q ) => {
		input.value = q;
		input.dispatchEvent( new Event( 'input' ) );
		return {
			q,
			hidden: [ ...document.querySelectorAll( itemSelector ) ].map( ( el ) => el.hasAttribute( 'data-sgs-fs-hidden' ) ),
			status: document.querySelector( '.sgs-filter-search__status' ).textContent,
			empty: document.querySelector( '.sgs-filter-search__empty' ).hidden,
		};
	} );
}

test( 'chips mode: visible chips, status and empty message per query', () => {
	expect( snapshot( chipsDom, '.wc-block-product-filter-chips__item' ) ).toMatchSnapshot();
} );

test( 'terms mode: visible terms, status and empty message per query', () => {
	expect( snapshot( termsDom, '.sgs-filter-search__term-item' ) ).toMatchSnapshot();
} );
