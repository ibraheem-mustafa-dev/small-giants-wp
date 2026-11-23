/**
 * View module for WooCommerce's product filter chips (`@sgs/product-filter-chips`).
 *
 * WooCommerce keeps a filter's chosen items in the `woocommerce/product-filters` store and writes them to the URL
 * through its router, so a chip click updates the product list in place. Two chip behaviours WooCommerce lacks are
 * driven through that same store (includes/product-filter-look.php prints the directives that call these actions):
 *
 * - `toggleSingle`: the chip's click when "one at a time" is on. Choosing a chip first clears the other chosen chips of
 *   its group (the filter `type`, e.g. `taxonomy/product_cat`), then toggles it as WooCommerce does; choosing the
 *   chosen chip again clears it.
 * - `clearAll`: the All chip's click. Clears the group's chosen chips and navigates in place, like any chip. A click
 *   with a modifier key or a non-primary button is left to the browser, which opens the chip's own link.
 *
 * @package SGS\Blocks
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

const WC_FILTERS = 'woocommerce/product-filters';
const WC_CHIPS = 'woocommerce/product-filter-chips';

store( 'sgs/product-filter-chips', {
	actions: {
		toggleSingle() {
			const { item } = getContext( WC_CHIPS );
			if ( ! item ) {
				return;
			}
			const wc = store( WC_FILTERS );
			const chosen = wc.state.activeFilters.some(
				( f ) => f.type === item.type && f.value === item.value
			);
			if ( ! chosen ) {
				wc.actions.removeActiveFiltersBy(
					( f ) => f.type === item.type
				);
			}
			wc.actions.toggle( item );
		},
		clearAll( event ) {
			if (
				event.defaultPrevented ||
				event.button ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}
			const type = getElement().ref?.dataset?.sgsAllType;
			if ( ! type ) {
				return;
			}
			event.preventDefault();
			const wc = store( WC_FILTERS );
			wc.actions.removeActiveFiltersBy( ( f ) => f.type === type );
			wc.actions.navigate();
		},
	},
} );
