/**
 * SGS Filter Search — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Progressively wires a type-to-find input that narrows a visible list of
 * options. Two DOM shapes, chosen by render.php's
 * `data-sgs-filter-search-mode` attribute:
 *
 *   'chips' (attribute-chips mode, legacy/default): narrows a SIBLING
 *   WooCommerce attribute filter's chip list —
 *     - Group:       .wp-block-woocommerce-product-filter-attribute (nearest ancestor)
 *     - Chip items:  .wc-block-product-filter-chips__item (inside the group)
 *     - Chip label:  .wc-block-product-filter-chips__text (inside each item)
 *
 *   'terms' (taxonomy-terms mode): narrows this block's OWN rendered term
 *   list — each term is a plain `<a>` link (built server-side, so applying a
 *   filter needs zero JS); this script only hides/shows rows by typed text.
 *     - Item:  .sgs-filter-search__term-item (data-term-label = lowercase name)
 *
 * Filtering is 100% client-side visibility toggling via the `hidden`
 * attribute — no network requests, no mutation of the underlying filter
 * mechanism (WC's Interactivity API store for chips; plain navigation for
 * term links).
 *
 * No jQuery. No external dependencies.
 *
 * @package SGS\Blocks
 */

/**
 * Get the chip items to filter for 'chips' mode.
 *
 * @param {HTMLElement} root The [data-sgs-filter-search] wrapper.
 * @return {HTMLElement[]} Chip item elements, or an empty array if the
 *                         ancestor group isn't found.
 */
function getChipItems( root ) {
	const group = root.closest( '.wp-block-woocommerce-product-filter-attribute' );
	if ( ! group ) {
		return [];
	}
	return Array.from( group.querySelectorAll( '.wc-block-product-filter-chips__item' ) );
}

/**
 * Get the matchable text for a chip element.
 *
 * Prefers the dedicated label element; falls back to the chip's own
 * textContent (defensive — handles future WC markup changes).
 *
 * @param {HTMLElement} chip
 * @return {string} Lowercased, trimmed label text.
 */
function chipLabel( chip ) {
	const labelEl = chip.querySelector( '.wc-block-product-filter-chips__text' );
	return ( labelEl ? labelEl.textContent : chip.textContent ).trim().toLowerCase();
}

/**
 * Get the term-list items to filter for 'terms' mode.
 *
 * @param {HTMLElement} root The [data-sgs-filter-search] wrapper.
 * @return {HTMLElement[]} Term item elements.
 */
function getTermItems( root ) {
	return Array.from( root.querySelectorAll( '.sgs-filter-search__term-item' ) );
}

/**
 * Get the matchable text for a term-list item — render.php already lowercased
 * it into data-term-label, so no per-keystroke work is needed here.
 *
 * @param {HTMLElement} item
 * @return {string} Lowercased term name.
 */
function termLabel( item ) {
	return item.dataset.termLabel || item.textContent.trim().toLowerCase();
}

/**
 * Wire one filter-search instance.
 *
 * @param {HTMLElement} root The [data-sgs-filter-search] wrapper.
 */
function initInstance( root ) {
	// Double-bind guard — safe if init() is called more than once.
	if ( root.dataset.sgsFilterSearchReady === '1' ) {
		return;
	}
	root.dataset.sgsFilterSearchReady = '1';

	const isTermsMode = 'terms' === root.dataset.sgsFilterSearchMode;
	const items       = isTermsMode ? getTermItems( root ) : getChipItems( root );
	const getLabel    = isTermsMode ? termLabel : chipLabel;

	if ( 0 === items.length ) {
		return;
	}

	const input  = root.querySelector( '.sgs-filter-search__input' );
	const status = root.querySelector( '.sgs-filter-search__status' );
	const empty  = root.querySelector( '.sgs-filter-search__empty' );

	// No search input rendered (below the visibility threshold) — the list
	// still shows in full; there's nothing for this script to wire.
	if ( ! input || ! status || ! empty ) {
		return;
	}

	// i18n strings emitted by render.php as data-attributes — English fallbacks
	// guard against any edge case where the markup is cached without data attrs.
	const shownTemplate = status.dataset.shownTemplate || '%1$d of %2$d options shown';
	const noneText      = status.dataset.noneText      || 'No matching options';
	const total         = parseInt( status.dataset.total, 10 ) || items.length;

	/**
	 * Filter items to those whose label includes the query string.
	 * Empty query shows all items.
	 */
	function filterItems() {
		const query = input.value.trim().toLowerCase();

		let shown = 0;

		items.forEach( ( item ) => {
			const matches = '' === query || getLabel( item ).includes( query );
			item.hidden = ! matches;
			if ( matches ) {
				shown++;
			}
		} );

		if ( '' === query ) {
			// Query cleared — reset status and hide empty message.
			status.textContent = '';
			empty.hidden = true;
			return;
		}

		if ( 0 === shown ) {
			// No matches — show the visible empty message; status reads the noneText.
			empty.hidden = false;
			status.textContent = noneText;
		} else {
			// Partial match — hide empty message; announce count to screen readers.
			empty.hidden = true;
			status.textContent = shownTemplate
				.replace( '%1$d', String( shown ) )
				.replace( '%2$d', String( total ) );
		}
	}

	input.addEventListener( 'input', filterItems );
}

/**
 * Initialise all instances on the page.
 */
function init() {
	const roots = document.querySelectorAll( '[data-sgs-filter-search]' );
	roots.forEach( initInstance );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
