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

	const actionHtml = inStock
		? `<button type="button" class="sgs-wishlist-panel__move-to-basket" data-product-id="${ id }">${ escapeHtml(
				'Move to basket'
		  ) }</button>`
		: `<button type="button" class="sgs-wishlist-panel__notify-toggle" data-product-id="${ id }" aria-expanded="false">${ escapeHtml(
				'Notify me'
		  ) }</button><div class="sgs-wishlist-panel__notify-form" data-product-id="${ id }" hidden></div>`;

	const removeHtml = `<button type="button" class="sgs-wishlist-panel__remove" data-product-id="${ id }" aria-label="${ escapeHtml(
		'Remove ' + plainText( product.name ) + ' from your wishlist'
	) }">${ escapeHtml( 'Remove' ) }</button>`;

	return (
		`<div class="sgs-wishlist-panel__row" data-product-id="${ id }">` +
		`<a class="sgs-wishlist-panel__row-link" href="${ permalink }">` +
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
