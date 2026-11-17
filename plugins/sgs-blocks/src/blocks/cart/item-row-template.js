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
 * The quantity control: the native number box, or the stepper (a minus button, the number and a plus button in one pill).
 *
 * The stepper keeps a real number input between its buttons, so a screen reader announces the value and the keyboard can
 * type one; the buttons name the product and are disabled at the line's own limits from the Store API
 * (`quantity_limits`: the minimum, the maximum that stock and the cart's rules allow, and the step the line moves by).
 * A line the Store API marks not editable disables all three. The stepper's disabled buttons carry `data-at-limit` so
 * the panel's busy toggle never re-enables them.
 *
 * @param {Object} args          The line and its already-escaped ids.
 * @param {Object} args.item     The Store API cart item.
 * @param {string} args.key      The escaped cart item key.
 * @param {number} args.qty      The line's quantity.
 * @param {string} args.qtyInputId The number input's id.
 * @param {string} args.qtyStyle 'input' or 'stepper'.
 * @return {string} The control's HTML.
 */
function qtyControlHtml( { item, key, qty, qtyInputId, qtyStyle } ) {
	const label = `<label class="sgs-cart__item-qty-label${ 'stepper' === qtyStyle ? ' sgs-cart__item-qty-label--hidden' : '' }" for="${ qtyInputId }">${ escapeHtml( 'Qty' ) }</label>`;
	const ariaLabel = escapeHtml( 'Quantity for ' + item.name );
	if ( 'stepper' !== qtyStyle ) {
		return (
			label +
			`<input type="number" min="0" step="1" id="${ qtyInputId }" ` +
			`class="sgs-cart__item-qty-input" value="${ qty }" data-key="${ key }" ` +
			`aria-label="${ ariaLabel }" />`
		);
	}
	const limits = item.quantity_limits || {};
	const min = Math.max( 1, Number( limits.minimum ) || 1 );
	const max = Number( limits.maximum ) > 0 ? Number( limits.maximum ) : 0;
	const step = Math.max( 1, Number( limits.multiple_of ) || 1 );
	const editable = false !== limits.editable;
	const atMin = ! editable || qty - step < min;
	const atMax = ! editable || ( max > 0 && qty + step > max );
	const button = ( dir, glyph, name, off ) =>
		`<button type="button" class="sgs-cart__item-qty-step sgs-cart__item-qty-step--${ dir }" data-key="${ key }" data-step="${ 'minus' === dir ? -step : step }" ` +
		`aria-label="${ escapeHtml( name + ' ' + item.name ) }"${ off ? ' disabled data-at-limit' : '' }>` +
		`<span aria-hidden="true">${ glyph }</span></button>`;
	return (
		label +
		'<div class="sgs-cart__item-stepper">' +
		button( 'minus', '&minus;', 'Decrease quantity of', atMin ) +
		`<input type="number" min="${ min }" ${ max ? `max="${ max }" ` : '' }step="${ step }" id="${ qtyInputId }" ` +
		`class="sgs-cart__item-qty-input" value="${ qty }" data-key="${ key }" ` +
		`aria-label="${ ariaLabel }"${ editable ? '' : ' readonly' } />` +
		button( 'plus', '+', 'Increase quantity of', atMax ) +
		'</div>'
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
 * @param {string}  [opts.qtyStyle]     'input' (a number box) or 'stepper' (minus, number, plus in one pill).
 * @param {string}  [opts.removePlace]  'under' (the text Remove link in the actions row) or 'end' (at the right of the quantity's own line).
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
		qtyStyle = 'input',
		removePlace = 'under',
		showSave = true,
		showAddOptions = false,
		addOptionsLabel = '',
	} = opts;
	const name = escapeHtml( item.name );
	// The brand comes from the plugin's own Store API extension data
	// (includes/cart-item-extensions.php), empty when the product has none.
	const brand = escapeHtml( plainText( item.extensions?.sgs?.brand ?? '' ) );
	// The brand's logo, from the same extension; `url` is empty when the brand
	// has no logo, which is the name-only fallback below. The logo stands in
	// for the brand name, so its `alt` IS the brand name - never the
	// attachment's own alt text, which is frequently empty. With no brand name
	// to label it, no logo is drawn at all, so the accessible name can never
	// come out empty.
	const brandLogo = item.extensions?.sgs?.brandLogo ?? {};
	const brandLogoUrl = brand ? escapeHtml( String( brandLogo.url ?? '' ) ) : '';
	const brandLogoSize =
		Number( brandLogo.width ) > 0 && Number( brandLogo.height ) > 0
			? ` width="${ Number( brandLogo.width ) }" height="${ Number(
					brandLogo.height
			  ) }"`
			: '';
	const brandHtml = brandLogoUrl
		? `<span class="sgs-cart__item-brand sgs-cart__item-brand--logo"><img class="sgs-cart__item-brand-logo" src="${ brandLogoUrl }" alt="${ brand }"${ brandLogoSize } loading="lazy" decoding="async" /></span>`
		: `<span class="sgs-cart__item-brand">${ brand }</span>`;
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

	// `sgs-media-el` is the shared media-element
	// atom marker (includes/class-sgs-media-element.php /
	// assets/css/media-base.css) — this thumbnail is added to the
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
			? brandHtml
			: `<span class="sgs-cart__item-name">${ name }</span>` ) +
		priceHtml +
		'</div>' +
		( brand ? `<span class="sgs-cart__item-name">${ name }</span>` : '' );

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
			  // The label is typed rich text: panel-render.js fills this placeholder with DOM nodes (authored-text-dom).
			  '<span data-sgs-rich-remove></span>' +
			  '</button>'
			: '';

	// A text Remove link can sit at the right of the quantity's line instead of under it; with no quantity line it stays under.
	const removeAtEnd = 'end' === removePlace && 'text' === removeStyle && showQty;
	const qtyHtml = showQty
		? '<div class="sgs-cart__item-row">' +
		  qtyControlHtml( { item, key, qty, qtyInputId, qtyStyle } ) +
		  ( removeAtEnd ? removeTextHtml : '' ) +
		  '</div>'
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
		addOptionsHtml || saveForLaterHtml || ( removeTextHtml && ! removeAtEnd )
			? `<div class="sgs-cart__item-actions">${ addOptionsHtml }${ saveForLaterHtml }${ removeAtEnd ? '' : removeTextHtml }</div>`
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
