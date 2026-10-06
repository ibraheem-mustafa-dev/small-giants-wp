/**
 * SGS Cart — mini-cart item-row HTML template (FR-36-19).
 *
 * Split out of `panel-render.js` to keep each file under the project's
 * 250-line JS budget.
 *
 * @package
 */

import { formatMoney } from './store-api';

/**
 * Escape a string for safe insertion into HTML — including inside a
 * double- or single-quoted ATTRIBUTE value.
 *
 * SECURITY: this deliberately does NOT use the `div.textContent → innerHTML`
 * round-trip. That idiom looks equivalent but is not: the HTML serialiser
 * escapes only `&`, `<`, `>` and U+00A0 in a TEXT node, because quotes carry
 * no special meaning there. Every value below is interpolated into a quoted
 * attribute, where a surviving `"` closes the attribute early and lets the
 * rest of the string become new attributes — e.g. a product name of
 * `Shirt" onerror=alert(1) x="` injects an event handler onto the thumbnail,
 * and event handlers DO fire from `innerHTML` (unlike `<script>`).
 *
 * The threat model is the one this block already assumed: WooCommerce
 * sanitises product titles, but a third-party title/image filter, or a cart
 * item key echoed back by an extension, is untrusted input reaching an
 * `innerHTML` sink.
 *
 * `&` is replaced FIRST so the entities introduced afterwards are not
 * themselves double-escaped.
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
 * Plain text from a Store API string that may carry markup or entities.
 *
 * @param {string} str Raw value.
 * @return {string} Its text content.
 */
function plainText( str ) {
	return new DOMParser().parseFromString( String( str ?? '' ), 'text/html' ).body.textContent.trim();
}

/**
 * The line's details, one row per line.
 *
 * `item.variation` is deliberately NOT read. The server builds one summary
 * per line (includes/cart-line-summary/) that already states the size and
 * colour, so spreading the variation list in here would repeat every one of
 * them. The summary arrives as item-data rows with an EMPTY label.
 *
 * A row with no label prints its value bare; every row that HAS a label keeps
 * its `Label: value` shape — the colon is dropped per row, never globally, so
 * a flow answer on a product with no add-ons still reads "Your prescription:
 * …".
 *
 * @param {Object} item A Store API cart item.
 * @return {string} A list's HTML, or '' when there is nothing to show.
 */
function detailsHtml( item ) {
	const rows = [ ...( item.item_data || [] ) ]
		.map( ( row ) => {
			const label = plainText( row.attribute ?? row.name ?? row.key );
			const value = plainText( row.display ?? row.value );
			if ( ! value ) {
				return '';
			}
			return label ? `${ label }: ${ value }` : value;
		} )
		.filter( Boolean );
	if ( ! rows.length ) {
		return '';
	}
	return (
		'<ul class="sgs-cart__item-details">' +
		rows.map( ( row ) => `<li>${ escapeHtml( row ) }</li>` ).join( '' ) +
		'</ul>'
	);
}

/**
 * Build one item row's markup: thumbnail, a top line (brand, else the name,
 * with the line price on the right), the name, the line's details
 * (variation and item data), the optional quantity input, and the actions
 * (Save for later, and Remove when it is set to show as a text link).
 *
 * @param {Object}  item                The Store API cart item.
 * @param {Object}  totals              The cart's `totals` object (currency metadata).
 * @param {Object}  [opts]              The panel's item settings (render.php data-* attributes).
 * @param {string}  [opts.removeStyle]  'icon' (an × in its own column) or 'text' (a link under the details).
 * @param {string}  [opts.removeLabel]  The text link's label.
 * @param {boolean} [opts.showQty]      Show the quantity input.
 * @param {boolean} [opts.showSave]     Show Save for later.
 * @param {boolean} [opts.showAddOptions] Show the per-line "add options" link.
 * @param {string}  [opts.addOptionsLabel] That link's label; '' hides it.
 * @return {string} The row's HTML.
 */
export function itemRowHtml( item, totals, opts = {} ) {
	const {
		removeStyle = 'icon',
		removeLabel = 'Remove',
		showQty = true,
		showSave = true,
		showAddOptions = false,
		addOptionsLabel = '',
	} = opts;
	const name = escapeHtml( item.name );
	// The brand comes from the plugin's own Store API extension data
	// (includes/cart-item-extensions.php), empty when the product has none.
	const brand = escapeHtml( plainText( item.extensions?.sgs?.brand ?? '' ) );
	const thumb = item.images?.[ 0 ]?.thumbnail || '';
	const linePrice = formatMoney( item.totals?.line_total ?? 0, totals );
	const key = escapeHtml( item.key );
	const qty = Number( item.quantity ) || 0;
	const qtyInputId = `sgs-cart-qty-${ key }`;
	// Wave 3C U-12 §E "Save for later": the wishlist only accepts a parent
	// PRODUCT id (a variation's own id is post type product_variation, which
	// includes/wishlist/class-wishlist-store.php::Wishlist_Store::product_is_valid() rejects) — mirrors
	// src/blocks/wishlist-panel/match-row.js::wishlistProductIdForCartItem().
	const wishlistProductId = Number( item.parent_id ) > 0
		? Number( item.parent_id )
		: Number( item.id ) || 0;

	// `sgs-media-el` (rule 37-media-no-handroll fix) is the shared media-element
	// atom marker (includes/class-sgs-media-element.php /
	// assets/css/media-atoms/object-fit.css) — this thumbnail is added to the
	// DOM here, client-side, but the `--sgs-media-object-fit` custom property
	// it reads is set server-side on the block's uid class (render.php), which
	// the panel element itself carries, so the marker class is all this
	// template needs to add for the atom's CSS rule to apply.
	const thumbHtml = thumb
		? `<img class="sgs-cart__item-thumb sgs-media-el" src="${ escapeHtml(
				thumb
		  ) }" alt="" width="96" height="96" loading="lazy" />`
		: '<span class="sgs-cart__item-thumb sgs-cart__item-thumb--placeholder" aria-hidden="true"></span>';

	const priceHtml = `<span class="sgs-cart__item-price">${ escapeHtml(
		linePrice
	) }</span>`;
	const topHtml =
		'<div class="sgs-cart__item-top">' +
		( brand
			? `<span class="sgs-cart__item-brand">${ brand }</span>`
			: `<span class="sgs-cart__item-name">${ name }</span>` ) +
		priceHtml +
		'</div>' +
		( brand ? `<span class="sgs-cart__item-name">${ name }</span>` : '' );

	const qtyHtml = showQty
		? '<div class="sgs-cart__item-row">' +
		  `<label class="sgs-cart__item-qty-label" for="${ qtyInputId }">` +
		  escapeHtml( 'Qty' ) +
		  '</label>' +
		  `<input type="number" min="0" step="1" id="${ qtyInputId }" ` +
		  `class="sgs-cart__item-qty-input" value="${ qty }" data-key="${ key }" ` +
		  `aria-label="${ escapeHtml( 'Quantity for ' + item.name ) }" />` +
		  '</div>'
		: '';

	const removeLabelText = `Remove ${ item.name } from cart`;
	const removeIconHtml =
		'text' === removeStyle
			? ''
			: `<button type="button" class="sgs-cart__item-remove" data-key="${ key }" ` +
			  `aria-label="${ escapeHtml( removeLabelText ) }">` +
			  '<span aria-hidden="true">&times;</span>' +
			  '</button>';
	const removeTextHtml =
		'text' === removeStyle
			? `<button type="button" class="sgs-cart__item-remove sgs-cart__item-remove--text sgs-cart__item-action" data-key="${ key }" ` +
			  `aria-label="${ escapeHtml( removeLabelText ) }">` +
			  escapeHtml( removeLabel || 'Remove' ) +
			  '</button>'
			: '';

	// Wave 3C U-12 §E: the SAME "Save for later" action as the wishlist
	// panel's cart-page enhancer (src/blocks/wishlist-panel/save-for-later.js),
	// but as the flyout's own markup — a valid product id is required (skips
	// silently on a malformed cart item rather than saving id 0).
	const saveForLaterHtml =
		showSave && wishlistProductId > 0
			? `<button type="button" class="sgs-cart__item-save-for-later sgs-cart__item-action" data-key="${ key }" data-product-id="${ wishlistProductId }">` +
			  escapeHtml( 'Save for later' ) +
			  '</button>'
			: '';
	// A per-line invitation to finish configuring this item, shown only while
	// there is something left to add. `hasLenses` comes from the plugin's own
	// Store API extension (includes/cart-item-extensions.php) and is true once
	// the line carries priced add-ons, so the link disappears for that frame
	// the moment the shopper has chosen them — and stays for every other line
	// in the same bag. The destination is the item's own product page, the one
	// place the options pop-up can open. A link, not a button: it navigates.
	const alreadyConfigured = true === item.extensions?.sgs?.hasLenses;
	const addOptionsHref = String( item.permalink ?? '' );
	const addOptionsHtml =
		showAddOptions && addOptionsLabel && ! alreadyConfigured && addOptionsHref
			? `<a class="sgs-cart__item-add-options sgs-cart__item-action" href="${ escapeHtml(
					addOptionsHref
			  ) }">${ escapeHtml( addOptionsLabel ) }</a>`
			: '';

	const actionsHtml =
		addOptionsHtml || saveForLaterHtml || removeTextHtml
			? `<div class="sgs-cart__item-actions">${ addOptionsHtml }${ saveForLaterHtml }${ removeTextHtml }</div>`
			: '';

	return (
		`<div class="sgs-cart__item${
			'text' === removeStyle ? ' sgs-cart__item--remove-text' : ''
		}" data-key="${ key }">` +
		thumbHtml +
		'<div class="sgs-cart__item-info">' +
		topHtml +
		detailsHtml( item ) +
		qtyHtml +
		actionsHtml +
		'</div>' +
		removeIconHtml +
		'</div>'
	);
}
