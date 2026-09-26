/**
 * SGS Wishlist Panel — the price-drop line (FR-30-15).
 *
 * Bean's sign-off (2026-09-26): shown only when the CURRENT price is lower
 * than the price the shopper saved it at, in the SAME currency; never
 * worded "was £X" and never a percentage — it is the shopper's own history,
 * not a trader reference price (CMA209; the FR-30-8 reference-price badge
 * is a separate, operator-entered thing).
 *
 * Pure — no DOM access at import time — so this is directly testable in
 * Node (`scripts/tests/test-wishlist-panel.mjs`).
 *
 * @package
 */

/**
 * Build the price-drop line for one saved item, or '' when it does not
 * apply.
 *
 * @param {string}                template    `priceDropText`, e.g.
 *                                              "Price drop: now {now} ({saved} when you saved it)".
 * @param {{savedPrice:number|null,currency:string}} saved   The saved-price record.
 * @param {{price:number|string,currency_code:string}} current The current Store API `prices` object.
 * @param {Function}              formatMoney Money formatter, `(minorAmount, totals) => string`
 *                                             (`./api.js::formatMoney`).
 * @return {string} The line with `{now}`/`{saved}` replaced, or ''.
 */
export function priceDropLine( template, saved, current, formatMoney ) {
	if ( ! saved || null === saved.savedPrice || undefined === saved.savedPrice ) {
		return '';
	}
	if ( ! current ) {
		return '';
	}

	const savedCurrency = String( saved.currency || '' );
	const currentCurrency = String( current.currency_code || '' );
	if ( '' === savedCurrency || '' === currentCurrency || savedCurrency !== currentCurrency ) {
		return ''; // Different (or unknown) currency — never compare across currencies.
	}

	const savedPrice = Number( saved.savedPrice );
	const currentPrice = Number( current.price );
	if ( ! Number.isFinite( savedPrice ) || ! Number.isFinite( currentPrice ) ) {
		return '';
	}
	if ( ! ( currentPrice < savedPrice ) ) {
		return ''; // Equal or higher than the saved price — no drop to report.
	}

	const nowText = formatMoney( currentPrice, current );
	const savedText = formatMoney( savedPrice, current );
	return String( template || '' ).replace( '{now}', nowText ).replace( '{saved}', savedText );
}
