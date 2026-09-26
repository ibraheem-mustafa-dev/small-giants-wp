/**
 * Unit tests for the wishlist-panel row template (`../render-rows.js`). Run with:
 *   npx wp-scripts test-unit-js tests/js/wishlist-panel
 * (from `plugins/sgs-blocks`, via PowerShell if Git Bash's node shim fails).
 */
import { wishlistRowHtml, escapeHtml } from '../../../src/blocks/wishlist-panel/render-rows';

const baseProduct = {
	id: 42,
	name: 'Mug',
	permalink: 'https://example.test/product/mug/',
	is_in_stock: true,
	images: [],
};

describe( 'wishlistRowHtml — variable-product "Choose options" routing', () => {
	it( 'renders Move to basket for a simple (no-options) in-stock product', () => {
		const html = wishlistRowHtml(
			{ ...baseProduct, has_options: false },
			{ showPrice: false, showStock: false }
		);
		expect( html ).toContain( 'sgs-wishlist-panel__move-to-basket' );
		expect( html ).not.toContain( 'sgs-wishlist-panel__choose-options' );
	} );

	it( 'renders a "Choose options" link to add_to_cart.url for a variable product, never Move to basket', () => {
		// Negative control for the reported defect: the OLD behaviour rendered
		// a Move-to-basket button for every in-stock product regardless of
		// `has_options`, which the Store API then rejected with 400 "Missing
		// attributes for variable product" on click. This assertion goes RED
		// against that old template.
		const html = wishlistRowHtml(
			{
				...baseProduct,
				has_options: true,
				type: 'variable',
				add_to_cart: {
					text: 'Select options',
					url: 'https://example.test/product/mug/',
				},
			},
			{ showPrice: false, showStock: false }
		);
		expect( html ).not.toContain( 'sgs-wishlist-panel__move-to-basket' );
		expect( html ).toContain( 'sgs-wishlist-panel__choose-options' );
		expect( html ).toContain( 'href="https://example.test/product/mug/"' );
		expect( html ).toContain( 'Select options' );
	} );

	it( 'falls back to the literal "Choose options" text when add_to_cart.text is missing', () => {
		const html = wishlistRowHtml(
			{ ...baseProduct, has_options: true, add_to_cart: { url: 'https://example.test/product/mug/' } },
			{ showPrice: false, showStock: false }
		);
		expect( html ).toContain( 'Choose options' );
	} );

	it( 'keeps Notify me for an out-of-stock product even when it has options', () => {
		const html = wishlistRowHtml(
			{ ...baseProduct, is_in_stock: false, has_options: true },
			{ showPrice: false, showStock: false }
		);
		expect( html ).toContain( 'sgs-wishlist-panel__notify-toggle' );
		expect( html ).not.toContain( 'sgs-wishlist-panel__choose-options' );
		expect( html ).not.toContain( 'sgs-wishlist-panel__move-to-basket' );
	} );
} );

describe( 'wishlistRowHtml — thumbnail link is not a duplicate accessible-name target', () => {
	it( 'gives the thumbnail link tabindex="-1" and aria-hidden="true"', () => {
		// Negative control: before the fix, the thumbnail <a> carried neither
		// attribute, so it was a real Tab stop with no accessible name
		// (alt="") — axe's link-name rule flags it, and it duplicates the
		// adjacent product-name link's destination. This assertion goes RED
		// against the old markup.
		const html = wishlistRowHtml( baseProduct, { showPrice: false, showStock: false } );
		const linkMatch = html.match( /<a class="sgs-wishlist-panel__row-link"[^>]*>/ );
		expect( linkMatch ).not.toBeNull();
		expect( linkMatch[ 0 ] ).toContain( 'tabindex="-1"' );
		expect( linkMatch[ 0 ] ).toContain( 'aria-hidden="true"' );
	} );

	it( 'still points the thumbnail link at the product permalink', () => {
		const html = wishlistRowHtml( baseProduct, { showPrice: false, showStock: false } );
		expect( html ).toContain(
			'<a class="sgs-wishlist-panel__row-link" href="https://example.test/product/mug/"'
		);
	} );
} );

describe( 'escapeHtml', () => {
	it( 'escapes the five HTML-significant characters', () => {
		expect( escapeHtml( `<a href="x">'&'</a>` ) ).toBe(
			'&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;'
		);
	} );
} );
