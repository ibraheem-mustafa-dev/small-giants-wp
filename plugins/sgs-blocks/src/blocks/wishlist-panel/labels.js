/**
 * SGS Wishlist Panel — read the block's own copy off the root element.
 *
 * Every visible string is a block attribute; `render.php` writes them onto
 * the root as data-* attributes (`render-labels.php`) so `view.js` never
 * hard-codes a label. This is the one place that reads `panel.dataset` into
 * a plain object every other module works from.
 *
 * @package
 */

/**
 * @param {HTMLElement} panel The `[data-sgs-wishlist-panel]` root.
 * @return {Object} Every label/text/flag/url the panel needs, camelCased.
 */
export function readPanelData( panel ) {
	const d = panel.dataset;
	return {
		layout: d.layout || 'grid',
		maxItems: Number( d.maxItems ) || 0,
		showWhenEmpty: '1' === d.showWhenEmpty,
		showPrice: '1' === d.showPrice,
		showStock: '1' === d.showStock,
		showCount: '1' === d.showCount,
		showSort: '1' === d.showSort,
		showDateSaved: '1' === d.showDateSaved,
		showPriceDrop: '1' === d.showPriceDrop,
		showGuestPrompt: '1' === d.showGuestPrompt,
		emptyText: d.emptyText || 'Your wishlist is empty.',
		emptyLinkLabel: d.emptyLinkLabel || 'Continue shopping',
		shopUrl: d.shopUrl || '/',
		viewAllUrl: d.viewAllUrl || '/',
		signInUrl: d.signInUrl || '/',
		privacyUrl: d.privacyUrl || '',
		savedItemsUrl: d.savedItemsUrl || '',
		viewAllLabel: d.viewAllLabel || 'View all saved items',
		sortLabel: d.sortLabel || 'Sort',
		sortRecentLabel: d.sortRecentLabel || 'Recently saved',
		sortPriceAscLabel: d.sortPriceAscLabel || 'Price, low to high',
		sortPriceDescLabel: d.sortPriceDescLabel || 'Price, high to low',
		sortStockLabel: d.sortStockLabel || 'In stock first',
		dateSavedText: d.dateSavedText || 'Saved {date}',
		priceDropText: d.priceDropText || 'Price drop: now {now} ({saved} when you saved it)',
		moveLabel: d.moveLabel || 'Move to basket',
		removeLabel: d.removeLabel || 'Remove',
		notifyLabel: d.notifyLabel || 'Notify me',
		outOfStockLabel: d.outOfStockLabel || 'Out of stock',
		notifyEmailLabel: d.notifyEmailLabel || 'Your email',
		notifyConsentText: d.notifyConsentText || 'Email me when this item is back in stock.',
		notifySuccessText: d.notifySuccessText || "We'll email you when this is back in stock.",
		errorText: d.errorText || 'Something went wrong. Please try again.',
		guestPromptText:
			d.guestPromptText ||
			'Sign in to keep your saved items on every device and get price alerts.',
		signInLabel: d.signInLabel || 'Sign in',
		alertsPriceLabel: d.alertsPriceLabel || 'Email me when a saved item drops in price',
		alertsStockLabel: d.alertsStockLabel || 'Email me when a saved item is back in stock',
		shareLabel: d.shareLabel || 'Share my list',
		shareCopyLabel: d.shareCopyLabel || 'Copy link',
		shareCopiedText: d.shareCopiedText || 'Link copied',
		shareNewLinkLabel: d.shareNewLinkLabel || 'Make a new link',
		sharedHeading: d.sharedHeading || 'A saved list',
		addToMineLabel: d.addToMineLabel || 'Save to my list',
		sharedGoneText: d.sharedGoneText || 'This saved list is no longer shared.',
		privacyLinkLabel: d.privacyLinkLabel || 'Privacy policy',
	};
}

/**
 * A date, formatted for `dateSavedText`'s `{date}` token — the visitor's
 * own locale, day + short month (e.g. "12 Sept").
 *
 * @param {number} addedTs Unix timestamp (seconds).
 * @return {string} The formatted date, or '' when `addedTs` is falsy.
 */
export function formatSavedDate( addedTs ) {
	if ( ! addedTs ) {
		return '';
	}
	try {
		return new Intl.DateTimeFormat( undefined, { day: 'numeric', month: 'short' } ).format(
			new Date( Number( addedTs ) * 1000 )
		);
	} catch ( e ) {
		return '';
	}
}
