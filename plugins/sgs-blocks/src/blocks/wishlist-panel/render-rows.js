/**
 * SGS Wishlist Panel — row HTML template.
 *
 * Builds one saved-item row for every layout (grid/list/strip) and both the
 * visitor's own list and the read-only shared-list view (`shared-view.js`).
 *
 * @package
 */
import { formatMoney } from './api';
import { priceDropLine } from './price-drop';
import { formatSavedDate } from './labels';

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
 * @param {Object} product Store API product.
 * @return {boolean} Whether it is currently in stock.
 */
function isInStock( product ) {
	return 'instock' === product.is_in_stock || true === product.is_in_stock;
}

/**
 * The primary action for a product row (Move to basket / Choose options /
 * Notify me for the visitor's own list; Move to basket / Choose options /
 * Add to my list, never Notify me, on a read-only shared row).
 *
 * @param {Object}  product Store API product.
 * @param {Object}  labels  `labels.js::readPanelData()` output.
 * @param {boolean} shared  Whether this is a read-only shared-list row.
 * @return {string} Action markup.
 */
function actionHtml( product, labels, shared ) {
	const id = Number( product.id ) || 0;
	const permalink = escapeHtml( product.permalink || '#' );
	const hasOptions = !! product.has_options;
	const chooseOptionsUrl = escapeHtml( product.add_to_cart?.url || permalink );
	const chooseOptionsText = escapeHtml( product.add_to_cart?.text || 'Choose options' );

	if ( ! isInStock( product ) && ! shared ) {
		return (
			`<button type="button" class="sgs-wishlist-panel__notify-toggle" data-product-id="${ id }" aria-expanded="false">${ escapeHtml(
				labels.notifyLabel
			) }</button><div class="sgs-wishlist-panel__notify-form" data-product-id="${ id }" hidden></div>`
		);
	}

	// Variable products refuse a Store API add-to-cart call with no
	// variation chosen ("Missing attributes for variable product", 400) —
	// `has_options` is the Store API's own signal a selection is needed
	// first; send those shoppers to the product page instead of a one-click
	// add that is guaranteed to fail.
	const primary = hasOptions
		? `<a class="sgs-wishlist-panel__choose-options wp-element-button" href="${ chooseOptionsUrl }" data-product-id="${ id }">${ chooseOptionsText }</a>`
		: `<button type="button" class="sgs-wishlist-panel__move-to-basket wp-element-button" data-product-id="${ id }">${ escapeHtml(
				labels.moveLabel
		  ) }</button>`;

	if ( ! shared ) {
		return primary;
	}

	return (
		primary +
		`<button type="button" class="sgs-wishlist-panel__add-to-mine" data-product-id="${ id }">${ escapeHtml(
			labels.addToMineLabel
		) }</button>`
	);
}

/**
 * Build one saved-item row's markup.
 *
 * @param {Object}  product       A Store API product.
 * @param {Object}  options
 * @param {boolean} options.showPrice     Whether to render the price.
 * @param {boolean} options.showStock     Whether to render the stock line.
 * @param {boolean} options.showDateSaved Whether to render "Saved {date}" (grid/list only).
 * @param {boolean} options.showPriceDrop Whether to render the price-drop line (grid/list only).
 * @param {boolean} options.shared        Read-only shared-list row (no dates, no drop, no Remove).
 * @param {Object}  options.labels        `labels.js::readPanelData()` output.
 * @param {Object}  [options.savedPrice]  This item's `getSavedPrices()` record.
 * @return {string} The row's HTML.
 */
export function wishlistRowHtml( product, options ) {
	const { showPrice, showStock, showDateSaved, showPriceDrop, shared, labels, savedPrice } = options;
	const id = Number( product.id ) || 0;
	const name = escapeHtml( plainText( product.name ) );
	const permalink = escapeHtml( product.permalink || '#' );
	const thumb = product.images?.[ 0 ]?.thumbnail || product.images?.[ 0 ]?.src || '';

	const priceHtml =
		showPrice && product.prices
			? `<span class="sgs-wishlist-panel__row-price">${ escapeHtml(
					formatMoney( product.prices.price, product.prices )
			  ) }</span>`
			: '';

	const dropText =
		! shared && showPriceDrop && savedPrice
			? priceDropLine( labels.priceDropText, savedPrice, product.prices, formatMoney )
			: '';
	const priceDropHtml = dropText
		? `<span class="sgs-wishlist-panel__row-price-drop">${ escapeHtml( dropText ) }</span>`
		: '';

	const dateText =
		! shared && showDateSaved && savedPrice?.addedTs
			? String( labels.dateSavedText || '' ).replace(
					'{date}',
					formatSavedDate( savedPrice.addedTs )
			  )
			: '';
	const dateHtml = dateText
		? `<span class="sgs-wishlist-panel__row-date">${ escapeHtml( dateText ) }</span>`
		: '';

	const thumbHtml = thumb
		? `<img class="sgs-wishlist-panel__row-thumb sgs-media-el" src="${ escapeHtml(
				thumb
		  ) }" alt="" width="64" height="64" loading="lazy" decoding="async" />`
		: '<span class="sgs-wishlist-panel__row-thumb sgs-wishlist-panel__row-thumb--placeholder" aria-hidden="true"></span>';

	const stockHtml =
		showStock && ! isInStock( product )
			? `<span class="sgs-wishlist-panel__row-stock">${ escapeHtml( labels.outOfStockLabel ) }</span>`
			: '';

	const removeHtml = shared
		? ''
		: `<button type="button" class="sgs-wishlist-panel__remove" data-product-id="${ id }" aria-label="${ escapeHtml(
				labels.removeLabel + ' ' + plainText( product.name )
		  ) }">${ escapeHtml( labels.removeLabel ) }</button>`;

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
		priceDropHtml +
		stockHtml +
		dateHtml +
		'</div>' +
		'<div class="sgs-wishlist-panel__row-actions">' +
		actionHtml( product, labels, !! shared ) +
		removeHtml +
		'</div>' +
		'</div>'
	);
}
