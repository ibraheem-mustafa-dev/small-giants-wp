/**
 * SGS Cart — mini-cart item-row HTML template (FR-36-19 Phase 2).
 *
 * Split out of `panel-render.js` to keep each file under the project's
 * 250-line JS budget.
 *
 * @package
 */

import { formatMoney } from './store-api';

/**
 * Escape a string for safe HTML text-node insertion (defence-in-depth —
 * WooCommerce already sanitises item names, but the panel is built via
 * `innerHTML` so this guards against a rogue 3rd-party product-title filter).
 *
 * @param {string} str The raw string.
 * @return {string} HTML-escaped string.
 */
export function escapeHtml( str ) {
	const div = document.createElement( 'div' );
	div.textContent = String( str ?? '' );
	return div.innerHTML;
}

/**
 * Build one item row's markup: thumbnail, name, inline qty-edit input,
 * line price, and a remove button.
 *
 * @param {Object} item   A Store API cart item.
 * @param {Object} totals The cart's `totals` object (currency metadata).
 * @return {string} The row's HTML.
 */
export function itemRowHtml( item, totals ) {
	const name = escapeHtml( item.name );
	const thumb = item.images?.[ 0 ]?.thumbnail || '';
	const linePrice = formatMoney( item.totals?.line_total ?? 0, totals );
	const key = escapeHtml( item.key );
	const qty = Number( item.quantity ) || 0;
	const qtyInputId = `sgs-cart-qty-${ key }`;

	const thumbHtml = thumb
		? `<img class="sgs-cart__item-thumb" src="${ escapeHtml(
				thumb
		  ) }" alt="" width="48" height="48" loading="lazy" />`
		: '<span class="sgs-cart__item-thumb sgs-cart__item-thumb--placeholder" aria-hidden="true"></span>';

	const qtyLabelHtml =
		`<label class="sgs-cart__item-qty-label" for="${ qtyInputId }">` +
		escapeHtml( 'Qty' ) +
		'</label>';

	const qtyInputHtml =
		`<input type="number" min="0" step="1" id="${ qtyInputId }" ` +
		`class="sgs-cart__item-qty-input" value="${ qty }" data-key="${ key }" ` +
		`aria-label="${ escapeHtml( 'Quantity for ' + item.name ) }" />`;

	const removeButtonHtml =
		`<button type="button" class="sgs-cart__item-remove" data-key="${ key }" ` +
		`aria-label="${ escapeHtml(
			'Remove ' + item.name + ' from cart'
		) }">` +
		'<span aria-hidden="true">&times;</span>' +
		'</button>';

	return (
		`<div class="sgs-cart__item" data-key="${ key }">` +
		thumbHtml +
		'<div class="sgs-cart__item-info">' +
		`<span class="sgs-cart__item-name">${ name }</span>` +
		'<div class="sgs-cart__item-row">' +
		qtyLabelHtml +
		qtyInputHtml +
		`<span class="sgs-cart__item-price">${ escapeHtml(
			linePrice
		) }</span>` +
		'</div>' +
		'</div>' +
		removeButtonHtml +
		'</div>'
	);
}
