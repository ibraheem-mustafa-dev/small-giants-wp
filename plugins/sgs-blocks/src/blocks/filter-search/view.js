/**
 * SGS Filter Search — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Progressively wires a type-to-find input to narrow the WooCommerce attribute
 * filter chip list that lives in the same product-filter-attribute group.
 *
 * DOM assumptions (verified against WC block output):
 *   - Root:        [data-sgs-filter-search]
 *   - Group:       .wp-block-woocommerce-product-filter-attribute (nearest ancestor)
 *   - Chip items:  .wc-block-product-filter-chips__item (inside the group)
 *   - Chip label:  .wc-block-product-filter-chips__text (inside each item)
 *
 * Filtering is 100% client-side visibility toggling via the `hidden` attribute —
 * the core WC filtering mechanism is untouched.
 *
 * No jQuery. No external dependencies.
 *
 * @package SGS\Blocks
 */

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

	const input  = root.querySelector( '.sgs-filter-search__input' );
	const status = root.querySelector( '.sgs-filter-search__status' );
	const empty  = root.querySelector( '.sgs-filter-search__empty' );

	if ( ! input || ! status || ! empty ) {
		return;
	}

	// Walk up to the containing product-filter-attribute group.
	const group = root.closest( '.wp-block-woocommerce-product-filter-attribute' );
	if ( ! group ) {
		return;
	}

	const chips = Array.from(
		group.querySelectorAll( '.wc-block-product-filter-chips__item' )
	);

	if ( 0 === chips.length ) {
		return;
	}

	// i18n strings emitted by render.php as data-attributes — English fallbacks
	// guard against any edge case where the markup is cached without data attrs.
	const shownTemplate = status.dataset.shownTemplate || '%1$d of %2$d options shown';
	const noneText      = status.dataset.noneText      || 'No matching options';
	const total         = parseInt( status.dataset.total, 10 ) || chips.length;

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
	 * Filter chips to those whose label includes the query string.
	 * Empty query shows all chips.
	 */
	function filterChips() {
		const query = input.value.trim().toLowerCase();

		let shown = 0;

		chips.forEach( ( chip ) => {
			const matches = '' === query || chipLabel( chip ).includes( query );
			chip.hidden = ! matches;
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

	input.addEventListener( 'input', filterChips );
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
