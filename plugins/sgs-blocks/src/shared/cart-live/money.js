/**
 * Money formatting for Store API cart totals, shared by the cart drawer and the free-delivery bar.
 *
 * @package
 */

/**
 * Whether whole amounts drop their decimals: the page-wide `sgs-trim-zeros`
 * body class (includes/price-trim-zeros.php), as wc_trim_zeros() does
 * server-side. Read on every call, so a page without a cart block formats the same way.
 *
 * @return {boolean} True when "£115.00" should read "£115".
 */
function shouldTrimZeros() {
	return (
		'undefined' !== typeof document &&
		!! document.body &&
		document.body.classList.contains( 'sgs-trim-zeros' )
	);
}

/**
 * Format a Store API minor-unit money string using the cart's own totals
 * currency metadata (prefix/suffix/minor-unit), so the amount always
 * matches the shop's configured currency display. A whole amount drops its
 * decimals when the site trims zeros; £59.50 keeps them.
 *
 * @param {string|number} minorAmount The amount in minor currency units (e.g. pence).
 * @param {Object}        totals      The Store API `totals` object carrying currency_*.
 * @return {string} A formatted money string, e.g. "£12.50".
 */
export function formatMoney( minorAmount, totals ) {
	const minorUnit = Number( totals?.currency_minor_unit ?? 2 );
	const amount = Number( minorAmount ) / 10 ** minorUnit;
	const prefix = totals?.currency_prefix ?? totals?.currency_symbol ?? '';
	const suffix = totals?.currency_suffix ?? '';
	const minor = Math.round( Number( minorAmount ) );
	const places =
		shouldTrimZeros() && 0 === minor % 10 ** minorUnit ? 0 : minorUnit;
	return `${ prefix }${ amount.toFixed( places ) }${ suffix }`;
}
