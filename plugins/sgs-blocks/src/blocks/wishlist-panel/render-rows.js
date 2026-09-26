/**
 * SGS Wishlist Panel — row HTML template.
 *
 * @package
 */
import { formatMoney } from './api';

/**
 * Escape a string for safe insertion into HTML, including inside a quoted
 * ATTRIBUTE value (see `src/blocks/cart/item-row-template.js::escapeHtml`'s
 * docblock for why a `textContent → innerHTML` round-trip is NOT equivalent
 * to this — the same threat model applies here: Store API product data is
 * third-party-filterable).
 *
 * @param {string} str The raw string.
 * @return {string} String safe for both text and quoted-attribute contexts.
 */
export function escapeHtml( str ) {
	return String( str ?? '' )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' )
		.replace( /"/g, '&quot;' )
		.replace( /'/g, '&#39;' );
}

/**
 * Plain text from a Store API string that may carry markup/entities.
 *
 * @param {string} html Raw HTML string.
 * @return {string} Text content only.
 */
function plainText( html ) {
	return new DOMParser().parseFromString( String( html ?? '' ), 'text/html' ).body.textContent.trim();
}

/**
 * Build one saved-item row's markup.
 *
 * @param {Object}  product     A Store API product.
 * @param {Object}  options
 * @param {boolean} options.showPrice Whether to render the price.
 * @param {boolean} options.showStock Whether to render the stock line.
 * @return {string} The row's HTML.
 */
export function wishlistRowHtml( product, { showPrice, showStock } ) {
	const id = Number( product.id ) || 0;
	const name = escapeHtml( plainText( product.name ) );
	const permalink = escapeHtml( product.permalink || '#' );
	const thumb = product.images?.[ 0 ]?.thumbnail || product.images?.[ 0 ]?.src || '';
	const inStock = 'instock' === product.is_in_stock || true === product.is_in_stock;
	const priceHtml =
		showPrice && product.prices
			? `<span class="sgs-wishlist-panel__row-price">${ escapeHtml(
					formatMoney( product.prices.price, product.prices )
			  ) }</span>`
			: '';

	const thumbHtml = thumb
		? `<img class="sgs-wishlist-panel__row-thumb sgs-media-el" src="${ escapeHtml(
				thumb
		  ) }" alt="" width="64" height="64" loading="lazy" decoding="async" />`
		: '<span class="sgs-wishlist-panel__row-thumb sgs-wishlist-panel__row-thumb--placeholder" aria-hidden="true"></span>';

	const stockHtml =
		showStock && ! inStock
			? `<span class="sgs-wishlist-panel__row-stock">${ escapeHtml( 'Out of stock' ) }</span>`
			: '';

	// Variable products (all three canary test products) refuse the Store
	// API's add-to-cart call with "Missing attributes for variable product"
	// (400) when no variation is chosen — `has_options` is the Store API's
	// own signal that a product needs a selection first (colour/size/etc.).
	// Send those shoppers to the product page (`add_to_cart.url`, its own
	// permalink) to choose options instead of attempting a basket add that
	// is guaranteed to fail; only an option-free (simple) product gets the
	// one-click Move to basket button.
	const hasOptions = !! product.has_options;
	const chooseOptionsUrl = escapeHtml( product.add_to_cart?.url || permalink );
	const chooseOptionsText = escapeHtml( product.add_to_cart?.text || 'Choose options' );

	const actionHtml = ! inStock
		? `<button type="button" class="sgs-wishlist-panel__notify-toggle" data-product-id="${ id }" aria-expanded="false">${ escapeHtml(
				'Notify me'
		  ) }</button><div class="sgs-wishlist-panel__notify-form" data-product-id="${ id }" hidden></div>`
		: hasOptions
		? `<a class="sgs-wishlist-panel__choose-options wp-element-button" href="${ chooseOptionsUrl }" data-product-id="${ id }">${ chooseOptionsText }</a>`
		: `<button type="button" class="sgs-wishlist-panel__move-to-basket wp-element-button" data-product-id="${ id }">${ escapeHtml(
				'Move to basket'
		  ) }</button>`;

	const removeHtml = `<button type="button" class="sgs-wishlist-panel__remove" data-product-id="${ id }" aria-label="${ escapeHtml(
		'Remove ' + plainText( product.name ) + ' from your wishlist'
	) }">${ escapeHtml( 'Remove' ) }</button>`;

	return (
		`<div class="sgs-wishlist-panel__row" data-product-id="${ id }">` +
		// tabindex="-1" + aria-hidden="true": the thumbnail's alt="" image
		// gives this link no accessible name (axe link-name) and it goes to
		// the same permalink as the name link right beside it — one
		// keyboard stop and one link per product, not two.
		`<a class="sgs-wishlist-panel__row-link" href="${ permalink }" tabindex="-1" aria-hidden="true">` +
		thumbHtml +
		'</a>' +
		'<div class="sgs-wishlist-panel__row-info">' +
		`<a class="sgs-wishlist-panel__row-name" href="${ permalink }">${ name }</a>` +
		priceHtml +
		stockHtml +
		'</div>' +
		'<div class="sgs-wishlist-panel__row-actions">' +
		actionHtml +
		removeHtml +
		'</div>' +
		'</div>'
	);
}
